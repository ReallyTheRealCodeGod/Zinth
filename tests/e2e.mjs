// Browser tests for the built app: node tests/e2e.mjs
// Needs Playwright with Chromium (the cloud runner has it; locally: npm i -g playwright && npx playwright install chromium).
// Opens index.html from disk (a file:// page is a secure context in Chromium, so AudioWorklet is available),
// drives the device and Studio, renders an export offline and checks its loudness and peak.
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const here=path.dirname(fileURLToPath(import.meta.url));
const app='file://'+path.join(here,'..','index.html').replace(/\\/g,'/');
const check='file://'+path.join(here,'check.html').replace(/\\/g,'/');
const fails=[];const ok=(cond,msg)=>{if(!cond)fails.push(msg);console.log((cond?'  ok  ':'  FAIL ')+msg)};

const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1400,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

// 1. theory self-test
await page.goto(check);await page.waitForFunction(()=>window.ZINTH_CHECK,null,{timeout:20000});
const th=await page.evaluate(()=>window.ZINTH_CHECK);
ok(th.fails===0,'theory check: '+th.tracks+' tracks, '+th.fails+' failures');

// 2. the app loads, the device renders
await page.goto(app);await page.waitForFunction(()=>window.ZUI&&window.ZUI.song&&window.ZUI.song.length>0,null,{timeout:20000});
await page.evaluate(()=>{const c=document.getElementById('sheetClose');if(c)c.click()});
ok(await page.evaluate(()=>document.querySelector('.app').dataset.view==='op'),'opens on the device');
ok(await page.evaluate(()=>document.querySelectorAll('#opKnobs .knob').length===4),'four knobs on the Song screen');
for(const m of ['synth','drum','mix','song']){
  await page.click('#opModes [data-m="'+m+'"]');
  ok(await page.evaluate(()=>document.querySelectorAll('#opKnobs .knob').length===4),m+' screen has four knobs');
}

// 3. a knob drag changes the tempo and the readout follows
const before=await page.evaluate(()=>window.ZUI.state.bpm);
const knob=await page.$('#opKnobs .knob:nth-child(3)');const box=await knob.boundingBox();
await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2-40,{steps:8});await page.mouse.up();
const after=await page.evaluate(()=>[window.ZUI.state.bpm,document.getElementById('bpmOut').textContent]);
ok(after[0]!==before&&String(after[0])===after[1],'tempo knob: '+before+' → '+after[0]+' bpm, readout '+after[1]);

// 4. playback runs and the worklets attach
await page.click('#play');await page.waitForTimeout(1500);
const live=await page.evaluate(async()=>{const E=window.Z.engine;const w=await E.wl;return {playing:E.playing,worklets:w,lim:!!E.limNode,rv:!!E.reverbNode,pos:document.getElementById('posOut').textContent}});
ok(live.playing&&live.pos!=='1.1','playback advances ('+live.pos+')');
ok(live.worklets&&live.lim&&live.rv,'lookahead limiter and FDN reverb attached');
await page.click('#play');

// 5. recording through the live-note path lands in the lane
const recorded=await page.evaluate(async()=>{const U=window.ZUI,E=window.Z.engine,st=U.state;U.setRec(true);await new Promise(r=>setTimeout(r,400));U.liveNoteOn(64);await new Promise(r=>setTimeout(r,120));U.liveNoteOff(64);U.setRec(false);E.stop();document.getElementById('play').click();const part=U.song[st.sel].part;return (st.leadEdits[part]||[]).length});
ok(recorded>=1,'a live note recorded into the lead ('+recorded+' note)');

// 6. an export masters to the target loudness under the ceiling
const ex=await page.evaluate(async()=>{const Z=window.Z,U=window.ZUI,E=Z.engine,st=U.state;const sr=44100,S=U.song,d=60/st.bpm/4,si=1,steps=S[si].bars*16;
  const off=new OfflineAudioContext(2,Math.ceil(sr*(steps*d+1)),sr),R=new Z.Engine();R.params=JSON.parse(JSON.stringify(E.params));R.bpm=st.bpm;R.song=S;R.kit=st.kit;R.init(off);await R.wl;
  let g=0.05;for(let s=0;s<steps;s++){R.scheduleStep(si,s,g);g+=d}const buf=await off.startRendering();
  const before=Z.loudness(buf),gain=Z.normGain(before.lufs,Z.LOUD.target),lim=await Z.limitBuffer(buf,gain,Z.LOUD.ceiling),after=Z.loudness(lim);return {before:before.lufs,after:after.lufs,peak:after.peakDb}});
ok(Math.abs(ex.after-(-14))<0.6,'mastered export at '+ex.after.toFixed(2)+' LUFS (from '+ex.before.toFixed(2)+')');
ok(ex.peak<=-0.8,'mastered peak '+ex.peak.toFixed(2)+' dBFS under the ceiling');

// 7. Studio opens with everything, and the MIDI file is well formed
await page.click('#viewSeg [data-v="studio"]');
ok(await page.evaluate(()=>getComputedStyle(document.querySelector('.snd')).display!=='none'),'Studio shows the Sound panel');
const mid=await page.evaluate(()=>{const m=window.ZUI.midiFile();return {head:String.fromCharCode(m[0],m[1],m[2],m[3]),tracks:(m[10]<<8)|m[11],bytes:m.length}});
ok(mid.head==='MThd'&&mid.tracks===6,'MIDI file: '+mid.tracks+' tracks, '+mid.bytes+' bytes');
await page.click('#viewSeg [data-v="op"]');

// 8. Play mode carries the punch-in strip and the chord tray, and the knob modifiers work
ok(await page.evaluate(()=>document.getElementById('fx').parentNode.id==='opFx'),'the punch-in strip sits on the device');
ok(await page.evaluate(()=>document.querySelectorAll('#opFx .fxb').length===7),'seven punch-in pads under the knobs');
const shown=id=>page.evaluate(i=>{let e=document.getElementById(i);while(e&&e!==document.body){if(getComputedStyle(e).display==='none')return false;e=e.parentElement}return !!e},id);
for(const id of ['tray','useV','useC','cb7','cbHold','cbBass'])ok(await shown(id),'the chord box control '+id+' is reachable in Play');
// the strip must survive a screen change, since render() hands every other borrowed element back
for(const m of ['synth','drum','mix','song']){await page.click('#opModes [data-m="'+m+'"]')}
ok(await page.evaluate(()=>document.getElementById('fx').parentNode.id==='opFx'),'the strip survives all four screen changes');
{
  const knob=await page.$('#opKnobs .knob:nth-child(3)'),b=await knob.boundingBox();
  const cx=b.x+b.width/2,cy=b.y+b.height/2;
  const setBpm=v=>page.evaluate(n=>{const el=document.getElementById('bpm');el.value=n;el.dispatchEvent(new Event('input',{bubbles:true}))},v);
  const bpm=()=>page.evaluate(()=>window.ZUI.state.bpm);
  const turn=async(dy,mod)=>{if(mod)await page.keyboard.down(mod);
    await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx,cy-dy,{steps:8});
    const held=await bpm();await page.mouse.up();if(mod)await page.keyboard.up(mod);
    return [held,await bpm()]};
  await setBpm(110);const [,plain]=await turn(40,null);
  await setBpm(110);const [,fine]=await turn(40,'Shift');
  await setBpm(110);const [held,released]=await turn(40,'Alt');
  ok(plain>110&&fine>110&&(plain-110)>(fine-110)*2,'Shift is a finer turn: +'+(plain-110)+' bpm plain, +'+(fine-110)+' with Shift');
  ok(held>110&&released===110,'Alt springs the knob back: '+held+' bpm held, '+released+' released');
}
{
  // Mood rerolls the track, so it must refuse the spring rather than hand back a different song
  const knob=await page.$('#opKnobs .knob:nth-child(1)'),b=await knob.boundingBox();
  const cx=b.x+b.width/2,cy=b.y+b.height/2;
  const seed=()=>page.evaluate(()=>window.ZUI.state.seeds.lead);
  const before=await seed();
  await page.keyboard.down('Alt');await page.mouse.move(cx,cy);await page.mouse.down();
  await page.mouse.move(cx,cy-40,{steps:6});await page.mouse.up();await page.keyboard.up('Alt');
  const moodTip=await page.evaluate(()=>document.querySelector('#opKnobs .knob').title);
  ok(await seed()!==before,'an Alt-drag on Mood still rerolls rather than pretending to spring back');
  ok(!/Hold Alt/.test(moodTip),'the Mood tooltip does not promise a spring-back');
  ok(/spring back to/.test(await page.evaluate(()=>document.getElementById('status').textContent)),'and the status line says why');
}
{
  await page.click('#opModes [data-m="drum"]');
  const dflt=await page.evaluate(()=>window.ZUI.MOODS[window.ZUI.state.mood].swing);
  await page.evaluate(()=>{const el=document.getElementById('swing');el.value=55;el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.dblclick('#opKnobs .knob:nth-child(2)');
  ok(await page.evaluate(()=>window.ZUI.state.swing)===dflt,'double-click puts Swing back to the mood default ('+dflt+' %)');
  await page.click('#opModes [data-m="song"]');
}
await page.click('#viewSeg [data-v="studio"]');
ok(await page.evaluate(()=>{const f=document.getElementById('fx');return !!(f.nextElementSibling&&f.nextElementSibling.classList.contains('hint'))}),'the strip goes back to its own place in Studio');
await page.click('#viewSeg [data-v="op"]');

// 9. no errors anywhere
ok(errors.length===0,'no page errors'+(errors.length?': '+errors.slice(0,3).join(' | '):''));
await browser.close();
console.log(fails.length?fails.length+' FAILURES':'all e2e checks pass');
process.exit(fails.length?1:0);
