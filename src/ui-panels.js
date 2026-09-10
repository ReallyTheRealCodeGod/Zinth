(()=>{
'use strict';
const Z=window.Z,E=Z.engine,$=id=>document.getElementById(id),U=window.ZUI;
const {state,COLORS,MOODS,PATCHES,FX,FXKEYS}=U;
const song=()=>U.song;

/* ---------- animation ---------- */
let lastKey=-1,lastCol=-1;
function raf(){
  const p=E.currentPos(),key=p?p.section*100000+p.step:-1;
  if(key!==lastKey){lastKey=key;const s=p?p.step:-1;U.drawFrame(s);
    const bar=s<0?0:Math.floor(s/16),beat=s<0?0:Math.floor((s%16)/4);
    $('posOut').textContent=(bar+1)+'.'+(beat+1);
    const sec=p?song()[p.section]:null;$('posLabel').textContent=sec?sec.type:'bar . beat';
    $('leds').querySelectorAll('.led').forEach((l,i)=>l.classList.toggle('on',s>=0&&i===beat));
    const vs=song()[U.viewSection];
    const ci=(s<0||!sec||sec!==vs)?-1:vs.track.chords.findIndex(c=>{const b=bar%8;return b>=c.bar0&&b<c.bar0+c.bars});
    $('prog').querySelectorAll('.chord').forEach((el,i)=>el.classList.toggle('now',i===ci));
    const ch=sec&&!sec.transpose&&sec.layers.chords?Z.chordAt(sec.track.chords,s%128):null;
    $('pads').querySelectorAll('.pad').forEach((el,i)=>el.classList.toggle('now',!!ch&&i===ch.degree));
    if(p)$('arr').querySelectorAll('.sec').forEach((el,i)=>el.classList.toggle('now',i===p.section));
    const col=s<0?-1:s%16;if(col!==lastCol){lastCol=col;$('grid').querySelectorAll('.cell').forEach(c=>c.classList.toggle('now',+c.dataset.s===col))}
  }
  $('meter').style.width=Math.min(100,E.rms()*260)+'%';
  drawScope();
  requestAnimationFrame(raf);
}
const scope=$('scope'),sctx=scope.getContext('2d');
function drawScope(){
  const w=scope.width,h=scope.height;sctx.clearRect(0,0,w,h);if(!E.ctx)return;
  const a=new Uint8Array(E.analyser.fftSize);E.analyser.getByteTimeDomainData(a);
  sctx.strokeStyle=E.playing?'#4fd1c5':'#5a6180';sctx.lineWidth=2;sctx.beginPath();
  for(let i=0;i<a.length;i++){const x=i/(a.length-1)*w,y=h/2+((a[i]-128)/128)*(h/2-4);if(i)sctx.lineTo(x,y);else sctx.moveTo(x,y)}
  sctx.stroke();
}

/* ---------- recording the lead, the arp or the bass from the keys ---------- */
const rec=U.rec,LANE_NAME=U.LANE_NAME,REC_ORDER=['lead','arp','bass'];
const partLabel=p=>p==='v'?'A verse':'B chorus';
function partOfSel(){const s=song()[state.sel];return s?s.part:'v'}
// where the keys record into this layer, in words, so the status line can always say it
const recWhere=L=>L==='bass'?'the letter keys drop into the bass register':L==='arp'?'the letter keys play an octave up, where the arp sings':'the letter keys play as you hear them';
$('recTarget').querySelectorAll('button').forEach(b=>b.style.setProperty('--c',COLORS[b.dataset.v]));
function renderRecInfo(){
  const part=partOfSel(),L=state.recTarget,list=state[U.EDITS[L]][part];
  const others=REC_ORDER.filter(x=>x!==L&&state[U.EDITS[x]][part]);
  $('recInfo').textContent=partLabel(part)+' · into the '+L+': '+(list?list.length+' note'+(list.length===1?'':'s')+' of your own':'generated '+LANE_NAME[L])+(others.length?' · your own '+others.join(' and '):'');
  $('recTarget').querySelectorAll('button').forEach(b=>{const on=b.dataset.v===L;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  $('clearMel').textContent='Clear '+(L==='lead'?'melody':L);
  $('clearMel').title='Remove your own '+LANE_NAME[L]+' for this part, recorded or drawn in the roll, and bring the generated one back';
  $('clearMel').disabled=!list;$('clickBtn').classList.toggle('on',E.metronome);$('clickBtn').setAttribute('aria-pressed',E.metronome);
}
function setRecTarget(L){
  if(!U.EDITS[L]||state.recTarget===L)return;
  state.recTarget=L;renderKeys();
  if(rec.armed)U.rebuild();else U.persist();
  U.setStatus('Recording into the '+L+': '+recWhere(L));
}
function setRec(on){
  rec.armed=on;$('recBtn').classList.toggle('on',on);$('recBtn').setAttribute('aria-pressed',on);
  if(on&&!E.playing){E.loopSection=true;$('loopSec').classList.add('on');$('loopSec').setAttribute('aria-pressed',true);state.loop=0;U.viewSection=state.sel;E.start(state.sel);setPlaying(true)}
  U.rebuild();renderKeys();
  const L=state.recTarget,sec=song()[state.sel];
  let msg='Recording into the '+L+': play the letter keys over the '+partLabel(partOfSel())+' sections, each note snaps to the grid';
  if(sec&&!sec.layers[L])msg+=' · this section does not play the '+L+', switch it on under Plays';
  else if(!E.audible(L))msg+=' · the '+L+' is muted in the mixer';
  if(sec&&(sec.sweep==='up'||sec.sweep==='down'))msg+=' · this section sweeps the mix, so the backing '+(sec.sweep==='up'?'starts dark and opens up':'closes down over its last bar');
  if(sec&&(sec.fade==='in'||sec.fade==='out'))msg+=' · this section fades '+(sec.fade==='in'?'in over its first two bars':'out over its last two bars')+', so what you play fades with it';
  U.setStatus(on?msg:'Recording off');
}
function recordNote(start,midi,t1){
  const sec=song()[start.section];if(!sec)return;
  const L=state.recTarget,part=sec.part,step=start.step%Z.TOTAL,stored=midi-(sec.transpose||0);
  const dur=Math.max(1,Math.round((t1-start.time)/E.stepSec()));
  const list=(state[U.EDITS[L]][part]||[]).filter(e=>!(e.step===step&&e.midi===stored));
  list.push({step,dur,midi:stored,vel:0.85});list.sort((a,b)=>a.step-b.step);
  state[U.EDITS[L]][part]=list;U.rebuild();renderRecInfo();
}
$('recBtn').addEventListener('click',()=>setRec(!rec.armed));
$('recTarget').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setRecTarget(b.dataset.v)});
function cycleRecTarget(){setRecTarget(REC_ORDER[(REC_ORDER.indexOf(state.recTarget)+1)%REC_ORDER.length])}
$('clickBtn').addEventListener('click',()=>{E.metronome=!E.metronome;renderRecInfo()});
$('clearMel').addEventListener('click',()=>{const L=state.recTarget,part=partOfSel();state[U.EDITS[L]][part]=null;U.rebuild();renderRecInfo();U.setStatus('Generated '+LANE_NAME[L]+' is back for the '+partLabel(part)+' sections')});

/* ---------- sound panel ---------- */
const PARAMS=['cutoff','reso','attack','release','spread','drift','delay','reverb','pump','level'];
// drift reads as the cents a note may stray either way: the knob's own units are meaningless, the wander is not
const driftFmt=v=>v>0?'± '+(Math.round(Z.driftCents(v,1)*10)/10)+' ct':'off';
const fmt={cutoff:v=>Math.round(Z.cutoffHz(v))+' Hz',reso:v=>v+' %',attack:v=>Math.round(Z.attackSec(v)*1000)+' ms',release:v=>Math.round(Z.releaseSec(v)*1000)+' ms',spread:v=>Math.round(v*0.32)+' ct',drift:driftFmt,delay:v=>v+' %',reverb:v=>v+' %',pump:v=>v+' %',level:v=>v+' %'};
const PKEYS=['wave','cutoff','reso','attack','release','spread'];
function patchName(p){for(const k in PATCHES)if(PKEYS.every(x=>PATCHES[k][x]===p[x]))return k;return ''}
function renderSound(){
  const L=state.layer,p=E.params[L],synth=L!=='drums';
  document.querySelector('.snd').style.setProperty('--c',COLORS[L]);
  $('tabs').querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.textContent===L));
  document.querySelectorAll('[data-synth]').forEach(el=>el.hidden=!synth);
  document.querySelectorAll('[data-drums]').forEach(el=>el.hidden=synth);
  $('waves').querySelectorAll('.wave').forEach(b=>b.classList.toggle('on',b.dataset.wave===p.wave));
  PARAMS.forEach(k=>{if(p[k]===undefined)return;const i=$('p-'+k);i.value=p[k];U.fill(i);$('o-'+k).textContent=fmt[k](p[k])});
  if(synth)$('patch').value=patchName(p);else{$('kit').value=state.kit;renderGrid()}
}
PARAMS.forEach(k=>$('p-'+k).addEventListener('input',e=>{const v=+e.target.value;E.setParam(state.layer,k,v);$('o-'+k).textContent=fmt[k](v);if(k==='level')renderMixer();if(PKEYS.includes(k))$('patch').value=patchName(E.params[state.layer]);U.persist()}));
$('p-drift').addEventListener('change',e=>{const v=+e.target.value;
  U.setStatus(v?state.layer+' drifts by '+driftFmt(v)+': every note wanders a little in pitch and filter, so no two are the same. You hear it in the WAV export too.'
    :state.layer+' drift off: every note is machine-identical');});
$('patch').addEventListener('change',e=>{const P=PATCHES[e.target.value];if(!P)return;for(const k in P)E.setParam(state.layer,k,P[k]);renderSound();U.persist();U.setStatus(state.layer+' → '+e.target.value)});
$('patchDice').addEventListener('click',()=>{
  const r=(a,b)=>Math.round(a+Math.random()*(b-a)),L=state.layer;
  const P={wave:['sine','triangle','saw','square','super'][r(0,4)],cutoff:r(25,90),reso:r(0,60),attack:L==='bass'||L==='arp'?r(0,10):r(0,60),release:r(10,90),spread:L==='bass'?r(0,20):r(0,70),drift:L==='bass'?r(0,20):r(0,55)};
  for(const k in P)E.setParam(L,k,P[k]);renderSound();U.persist();U.setStatus('Random patch on '+L);
});
$('kit').addEventListener('change',e=>{state.kit=e.target.value;E.kit=state.kit;U.persist();U.setStatus('Kit: '+state.kit)});

/* drum step grid (edits the pattern of the viewed section's part) */
function renderGrid(){
  const sec=song()[U.viewSection];if(!sec)return;const P=sec.track.drumPattern,edited=!!state.drumEdits[sec.part];
  $('gridLabel').textContent=(sec.part==='v'?'A verse':'B chorus')+(edited?' · edited':'');
  $('fillTgl').classList.toggle('on',!!P.fill);$('fillTgl').setAttribute('aria-pressed',!!P.fill);$('gridReset').disabled=!edited;
  $('grid').innerHTML=Z.DRUM_KINDS.map(k=>'<div class="grow"><span class="gn">'+k+'</span>'+P[k].map((v,s)=>'<button class="cell'+(v>=0.8?' on':v>0?' soft':'')+'" data-k="'+k+'" data-s="'+s+'" title="'+k+' · step '+(s+1)+'"></button>').join('')+'</div>').join('');
}
function editPattern(fn){const sec=song()[U.viewSection];if(!sec)return;const P=JSON.parse(JSON.stringify(sec.track.drumPattern));fn(P);state.drumEdits[sec.part]=P;U.regenerate()}
$('grid').addEventListener('click',e=>{const c=e.target.closest('.cell');if(!c)return;editPattern(P=>{const k=c.dataset.k,s=+c.dataset.s,v=P[k][s];P[k][s]=v===0?1:v>=0.8?0.55:0})});
$('fillTgl').addEventListener('click',()=>editPattern(P=>{P.fill=!P.fill}));
$('gridReset').addEventListener('click',()=>{const sec=song()[U.viewSection];if(sec){state.drumEdits[sec.part]=null;U.regenerate();U.setStatus('Drums back to the generated pattern')}});

/* ---------- mixer ---------- */
function renderMixer(){
  $('mixer').innerHTML=Z.LAYERS.map(L=>{const p=E.params[L];return '<div class="ch'+(E.audible(L)?'':' dim')+'" style="--c:'+COLORS[L]+'"><div class="nm"><b>'+L+'</b><output>'+p.level+'</output></div><input type="range" min="0" max="100" value="'+p.level+'" data-l="'+L+'" aria-label="'+L+' level"><div class="bt"><button class="m'+(p.mute?' on':'')+'" data-l="'+L+'" data-a="mute" title="Mute">M</button><button class="s'+(p.solo?' on':'')+'" data-l="'+L+'" data-a="solo" title="Solo">S</button><button class="l'+(state.locks[L]?' on':'')+'" data-l="'+L+'" data-a="lock" title="Lock: New track keeps this layer">'+(state.locks[L]?'🔒':'🔓')+'</button><button data-l="'+L+'" data-a="dice" title="Reroll only this layer">🎲</button></div></div>'}).join('');
  $('mixer').querySelectorAll('input').forEach(r=>{U.fill(r);r.addEventListener('input',e=>{const L=e.target.dataset.l,v=+e.target.value;E.setParam(L,'level',v);U.fill(e.target);e.target.parentElement.querySelector('output').textContent=v;
    if(state.layer===L){$('p-level').value=v;U.fill($('p-level'));$('o-level').textContent=v+' %'}U.persist()})});
  $('lanes').querySelectorAll('button[data-l]').forEach(b=>b.classList.toggle('muted',!E.audible(b.dataset.l)));
}
$('mixer').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const L=b.dataset.l,a=b.dataset.a;
  if(a==='mute')E.setParam(L,'mute',!E.params[L].mute);
  else if(a==='solo')E.setParam(L,'solo',!E.params[L].solo);
  else if(a==='lock'){state.locks[L]=!state.locks[L];U.setStatus(state.locks[L]?L+' locked: New track keeps it':L+' unlocked')}
  else if(a==='dice'){U.dice(L);return}
  renderMixer();U.persist()});

/* ---------- punch-in effects ---------- */
$('fx').innerHTML='<span class="lbl">Punch-in</span>'+FX.map(([id,key,name])=>'<button class="fxb" data-fx="'+id+'" title="Hold to apply"><b>'+name+'</b><span>'+key+'</span></button>').join('');
const fxHeld={};
function fxDown(id){if(fxHeld[id])return;fxHeld[id]=true;E.init();if(E.ctx.resume)E.ctx.resume();E.fxOn(id);const b=$('fx').querySelector('[data-fx="'+id+'"]');if(b)b.classList.add('down')}
function fxUp(id){if(!fxHeld[id])return;fxHeld[id]=false;E.fxOff(id);const b=$('fx').querySelector('[data-fx="'+id+'"]');if(b)b.classList.remove('down')}
$('fx').addEventListener('pointerdown',e=>{const b=e.target.closest('.fxb');if(!b)return;e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(err){}fxDown(b.dataset.fx)});
$('fx').addEventListener('pointerup',e=>{const b=e.target.closest('.fxb');if(b)fxUp(b.dataset.fx)});
$('fx').addEventListener('pointercancel',e=>{const b=e.target.closest('.fxb');if(b)fxUp(b.dataset.fx)});
window.addEventListener('blur',()=>Object.keys(fxHeld).forEach(fxUp));

/* ---------- saved songs ---------- */
function loadFavs(){try{return JSON.parse(localStorage.getItem('zinth.songs')||'[]')}catch(e){return []}}
function saveFavs(f){try{localStorage.setItem('zinth.songs',JSON.stringify(f))}catch(e){}}
function renderFavs(){
  const f=loadFavs(),cur=U.code(),on=f.some(x=>x.key===cur);
  $('saveFav').classList.toggle('on',on);$('saveFav').setAttribute('aria-pressed',on);
  $('saved').innerHTML=f.length?f.map((x,i)=>'<div class="fav" data-i="'+i+'" role="button" tabindex="0"><b>'+x.key.split('.')[0].split('~')[0]+'</b><span>'+x.label+'</span><button class="x" data-x="'+i+'" aria-label="Remove saved song" title="Remove">×</button></div>').join('')
    :'<div class="empty">Press ♥ in the top bar to keep a song, arrangement and sounds included. Saved songs stay in this browser.</div>';
}
$('saveFav').addEventListener('click',()=>{
  const f=loadFavs(),cur=U.code(),i=f.findIndex(x=>x.key===cur);
  if(i>=0){f.splice(i,1);U.setStatus('Removed from saved songs')}
  else{f.unshift({key:cur,label:Z.NOTE_NAMES[state.root]+' '+Z.SCALES[state.scale].name+' · '+MOODS[state.mood].label+' · '+state.bpm+' bpm · '+state.sections.length+' sections',project:U.snapshot()});U.setStatus('Song saved')}
  saveFavs(f.slice(0,20));renderFavs();
});
$('saved').addEventListener('click',e=>{
  const x=e.target.closest('.x');if(x){const f=loadFavs();f.splice(+x.dataset.x,1);saveFavs(f);renderFavs();return}
  const fav=e.target.closest('.fav');if(fav){const f=loadFavs()[+fav.dataset.i];if(f){try{U.restore(f.project);U.setStatus('Loaded '+f.label)}catch(err){U.setStatus('Could not load: '+err.message)}}}
});
$('saved').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const fav=e.target.closest('.fav');if(fav){e.preventDefault();fav.click()}}});

/* ---------- files: WAV export, project save / open ---------- */
function encodeWav(buf){
  const n=buf.length,ch=buf.numberOfChannels,sr=buf.sampleRate,bytes=44+n*ch*2,ab=new ArrayBuffer(bytes),v=new DataView(ab);
  const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  str(0,'RIFF');v.setUint32(4,bytes-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*ch*2,true);
  const chans=[];for(let c=0;c<ch;c++)chans.push(buf.getChannelData(c));
  let o=44;for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const s=Math.max(-1,Math.min(1,chans[c][i]));v.setInt16(o,s<0?s*32768:s*32767,true);o+=2}
  return ab;
}
async function saveFile(name,blob,doneMsg){
  let dl=null;
  if(window.claude&&typeof window.claude.use==='function'){try{dl=await window.claude.use('downloads')}catch(e){dl=null}}
  if(dl){
    try{await dl.save({filename:name,data:blob});return doneMsg}
    catch(err){const code=err&&err.code;
      if(code==='declined')return 'Cancelled';
      if(code==='rejected_extension'||code==='extension_not_enabled')return 'This viewer cannot save '+name.split('.').pop().toUpperCase()+' files. Open the local index.html to export.';
      return 'Save failed: '+(err&&err.message||code||'unavailable')}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);return doneMsg;
}
let exporting=false;
async function exportWav(){
  if(exporting)return;exporting=true;const btn=$('exportWav');btn.disabled=true;U.setStatus('Rendering…');
  try{
    const S=song(),d=60/state.bpm/4,steps=S.reduce((a,x)=>a+x.bars*16,0),dur=steps*d+3,sr=44100;
    const off=new OfflineAudioContext(2,Math.ceil(sr*dur),sr);
    const R=new Z.Engine();R.params=JSON.parse(JSON.stringify(E.params));R.bpm=state.bpm;R.swing=state.swing/100;R.masterLevel=E.masterLevel;R.song=S;R.kit=state.kit;R.transitions=state.transitions;R.init(off);
    let grid=0.05;S.forEach((sec,si)=>{for(let st=0;st<sec.bars*16;st++){const t=grid+(st%2?R.swing*d:0);R.scheduleStep(si,st,t);R.transitionAt(si,st,t);R.sweepAt(si,st,t);R.fadeAt(si,st,t);grid+=d}});
    const buf=await off.startRendering();
    const name='zinth-'+state.seeds.chords+'.wav';
    U.setStatus(await saveFile(name,new Blob([encodeWav(buf)],{type:'audio/wav'}),'Saved '+name+' ('+Math.round(dur-3)+' s)'));
  }catch(err){U.setStatus('Export failed: '+(err&&err.message||err))}
  btn.disabled=false;exporting=false;
}
$('exportWav').addEventListener('click',exportWav);
// Standard MIDI file, format 1: a tempo track plus one track per layer, drums on channel 10 with GM notes.
// A section that fades carries its fade here too, as CC7 volume automation down the same plan playback uses.
function midiFile(){
  const PPQ=96,T16=PPQ/4,S=song(),stepSec=60/state.bpm/4;
  const anyFade=S.some(sec=>Z.FADE_MODES.indexOf(sec.fade)>0);
  // GM reads CC7 as 40·log10(value/127) dB, so the square root of the gain is the value that matches the mix
  const ccOf=g=>Math.max(0,Math.min(127,Math.round(127*Math.sqrt(g))));
  const vlq=n=>{const b=[n&0x7f];while((n>>=7)>0)b.unshift((n&0x7f)|0x80);return b};
  const str=s=>Array.from(s,c=>c.charCodeAt(0)),u32=n=>[(n>>>24)&255,(n>>16)&255,(n>>8)&255,n&255],u16=n=>[(n>>8)&255,n&255];
  const tracks=[];const mpq=Math.round(60000000/state.bpm);
  tracks.push([0,0xff,0x51,3,(mpq>>16)&255,(mpq>>8)&255,mpq&255, 0,0xff,0x58,4,4,2,24,8, 0,0xff,0x2f,0]);
  const CH={lead:0,arp:1,chords:2,bass:3,drums:9},PROG={lead:80,arp:81,chords:89,bass:38},GM={kick:36,snare:38,clap:39,hat:42,ohat:46};
  for(const L of Z.LAYERS){
    const evs=[];let offset=0;
    S.forEach(sec=>{const steps=sec.bars*16,lay=sec.layers[L];
      if(anyFade){const plan=Z.fadePlan(sec.fade,steps,stepSec);
        if(plan)for(let st=0;st<steps;st+=4)evs.push({tick:offset+st*T16,cc:7,val:ccOf(Z.fadeGain(plan,st*stepSec))});
        else evs.push({tick:offset,cc:7,val:127})}
      if(lay)for(let st=0;st<steps;st++){const list=sec.track.byStep[L][st%128];if(!list)continue;
        for(const e of list){const tick=offset+st*T16;
          if(L==='drums'){if(lay==='lite'&&(e.kind==='snare'||e.kind==='clap'||(e.kind==='kick'&&st%16!==0)))continue;
            evs.push({tick,on:true,note:GM[e.kind],vel:Math.round(e.vel*(lay==='lite'?0.6:1)*127)});evs.push({tick:tick+T16/2,on:false,note:GM[e.kind],vel:0})}
          else{const notes=L==='chords'?e.notes:[e.midi],len=Math.max(1,Math.min(e.dur,steps-st))*T16-2;
            notes.forEach(n=>{evs.push({tick,on:true,note:n,vel:Math.round(e.vel*127)});evs.push({tick:tick+len,on:false,note:n,vel:0})});
            if(L==='lead'&&sec.double)evs.push({tick,on:true,note:e.midi+12,vel:Math.round(e.vel*60)},{tick:tick+len,on:false,note:e.midi+12,vel:0})}
        }}
      offset+=steps*T16});
    const rank=e=>e.cc!==undefined?0:e.on?2:1; // at one tick: volume first, then note-offs, then note-ons
    evs.sort((a,b)=>a.tick-b.tick||rank(a)-rank(b));
    const ch=CH[L],name='Zinth '+L,bytes=[0,0xff,0x03,name.length,...str(name)];let last=0;
    if(PROG[L]!==undefined)bytes.push(0,0xc0|ch,PROG[L]);
    for(const e of evs){bytes.push(...vlq(e.tick-last));last=e.tick;
      if(e.cc!==undefined)bytes.push(0xb0|ch,e.cc,e.val);
      else bytes.push((e.on?0x90:0x80)|ch,Math.max(0,Math.min(127,e.note)),Math.max(0,Math.min(127,e.vel)))}
    bytes.push(0,0xff,0x2f,0);tracks.push(bytes);
  }
  let size=14;for(const t of tracks)size+=8+t.length;
  const out=new Uint8Array(size);let o=0;const put=arr=>{for(let i=0;i<arr.length;i++)out[o++]=arr[i]};
  put(str('MThd'));put(u32(6));put(u16(1));put(u16(tracks.length));put(u16(PPQ));
  for(const t of tracks){put(str('MTrk'));put(u32(t.length));put(t)}
  return out;
}
$('exportMid').addEventListener('click',async()=>{try{const name='zinth-'+state.seeds.chords+'.mid';U.setStatus(await saveFile(name,new Blob([midiFile()],{type:'audio/midi'}),'Saved '+name+' (5 tracks, drums on channel 10)'))}catch(err){U.setStatus('MIDI export failed: '+(err&&err.message||err))}});
$('saveProj').addEventListener('click',async()=>{const name='zinth-'+state.seeds.chords+'.json';U.setStatus(await saveFile(name,new Blob([JSON.stringify(U.snapshot(),null,1)],{type:'application/json'}),'Saved '+name))});
$('openProj').addEventListener('click',()=>$('projFile').click());
$('projFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{U.restore(JSON.parse(r.result));U.setStatus('Opened '+f.name)}catch(err){U.setStatus('Could not open: '+err.message)}};r.readAsText(f);e.target.value=''});

/* ---------- transport & track controls ---------- */
function setPlaying(on){$('play').classList.toggle('on',on);$('play').setAttribute('aria-pressed',on);$('playLabel').textContent=on?'Stop':'Play';
  if(!on){$('leds').querySelectorAll('.led').forEach(l=>l.classList.remove('on'));U.drawFrame(-1);Object.keys(fxHeld).forEach(fxUp);$('pads').querySelectorAll('.pad.now').forEach(el=>el.classList.remove('now'))}U.renderArr()}
$('play').addEventListener('click',()=>{if(E.playing)E.stop();else{state.loop=0;U.viewSection=state.sel;E.start(state.sel)}setPlaying(E.playing)});
$('loopSec').addEventListener('click',()=>{E.loopSection=!E.loopSection;$('loopSec').classList.toggle('on',E.loopSection);$('loopSec').setAttribute('aria-pressed',E.loopSection);if(E.loopSection&&E.playing&&E.section!==state.sel)E.jump(state.sel);U.setStatus(E.loopSection?'Looping the selected section':'Playing the whole song')});
$('generate').addEventListener('click',()=>U.newTrack());
$('seedGo').addEventListener('click',U.loadCode);
$('seed').addEventListener('keydown',e=>{if(e.key==='Enter')U.loadCode()});
$('seed').addEventListener('focus',e=>e.target.select());
$('root').addEventListener('change',e=>{state.root=+e.target.value;U.regenerate()});
$('scale').addEventListener('change',e=>{state.scale=e.target.value;U.regenerate()});
$('energy').addEventListener('input',e=>{state.energy=+e.target.value;syncLabels();U.regenerate()});
$('bpm').addEventListener('input',e=>{state.bpm=+e.target.value;E.setBpm(state.bpm);syncLabels();$('seed').value=U.code();U.renderArr();renderFavs();U.persist()});
$('swing').addEventListener('input',e=>{state.swing=+e.target.value;E.swing=state.swing/100;syncLabels();$('seed').value=U.code();renderFavs();U.persist()});
$('master').addEventListener('input',e=>{E.setMaster(+e.target.value);U.persist()});
$('evolve').addEventListener('click',()=>{state.evolve=!state.evolve;$('evolve').classList.toggle('on',state.evolve);$('evolve').setAttribute('aria-checked',state.evolve);U.persist()});
$('transTgl').addEventListener('click',()=>{state.transitions=!state.transitions;E.transitions=state.transitions;U.syncControls();U.persist();U.setStatus(state.transitions?'Risers and crashes on':'Transitions off')});
function syncLabels(){$('bpmVal').textContent=state.bpm+' bpm';$('bpmOut').textContent=state.bpm;$('energyVal').textContent=state.energy;$('swingVal').textContent=state.swing+' %'}
/* help sheet */
function showSheet(on){$('sheet').hidden=!on;if(on)$('sheetClose').focus()}
$('helpBtn').addEventListener('click',()=>showSheet(true));$('sheetClose').addEventListener('click',()=>showSheet(false));
$('sheet').addEventListener('click',e=>{if(e.target===$('sheet'))showSheet(false)});
const typing=e=>!!(e.target&&e.target.matches&&e.target.matches('input,select,textarea'));
document.addEventListener('keydown',e=>{
  if(typing(e))return;
  const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  if(e.key==='Escape'){if(!$('sheet').hidden)showSheet(false);else if(!U.closeChordEdit())chordOff();return}
  if(e.key==='?'){showSheet($('sheet').hidden);return}
  if(!$('sheet').hidden)return;
  if(mod&&k==='z'){e.preventDefault();if(e.shiftKey)U.redoStep();else U.undoStep();return}
  if(mod&&k==='y'){e.preventDefault();U.redoStep();return}
  if(mod)return;
  // while a chord card is open for editing, ← and → step to the chord before or after it
  if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&U.nudgeChordEdit(e.key==='ArrowLeft'?-1:1)){e.preventDefault();return}
  if(e.code==='Space'){e.preventDefault();$('play').click();return}
  if(e.repeat)return;
  if(k==='l'){$('loopSec').click();return}
  if(k==='i'){cycleRecTarget();return}
  if(FXKEYS[k]){fxDown(FXKEYS[k]);return}
  const ci='123456789'.indexOf(e.key);if(ci>=0&&ci<padDefs.length){chordOn(ci);return}
  const ni=KEYMAP.indexOf(e.key.toUpperCase());if(ni>=0)keyOn(ni);
});
document.addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();if(FXKEYS[k])fxUp(FXKEYS[k]);
  const ci='123456789'.indexOf(e.key);if(ci>=0&&!cb.hold&&cb.active&&cb.active.i===ci)chordOff();
  const ni=KEYMAP.indexOf(e.key.toUpperCase());if(ni>=0)keyOff(ni);
});

/* ---------- chord box ---------- */
const cb={sevenths:false,hold:true,bass:true,active:null,tray:[]};
let padDefs=[];
function padChords(){
  const cs=Z.chordScaleOf(state.scale),size=cb.sevenths?4:3,rootMidi=(state.root>=6?48:60)+state.root;
  return cs.steps.map((_,d)=>{
    const base=Z.buildChord(cs.steps,d,size,rootMidi),info=Z.chordInfo(base);
    const notes=base.map(m=>{let x=m;while(x>=rootMidi+12)x-=12;while(x<rootMidi)x+=12;return x}).sort((a,b)=>a-b);
    return {deg:d,notes,bass:36+base[0]%12,name:info.name,quality:info.quality,roman:Z.romanFor(d,info.quality,size)};
  });
}
function renderPads(){
  padDefs=padChords();cb.tray=cb.tray.filter(d=>d<padDefs.length);
  $('pads').style.gridTemplateColumns='repeat('+padDefs.length+',1fr)';
  $('pads').innerHTML=padDefs.map((c,i)=>{const tense=c.quality==='dim'||(c.quality==='aug'&&state.scale!=='wholeTone');
    return '<button class="pad'+(i===0?' tonic':'')+(tense?' tense':'')+(cb.active&&cb.active.i===i?' down':'')+'" data-i="'+i+'" aria-label="'+c.name+'" title="'+c.name+(tense?' — tense; it wants to resolve to I':'')+'"><span class="k">'+(i+1)+'</span><span class="rn">'+c.roman+'</span><span class="cn">'+c.name+'</span></button>'}).join('');
  $('cb7').classList.toggle('on',cb.sevenths);$('cb7').setAttribute('aria-pressed',cb.sevenths);
  $('cbHold').classList.toggle('on',cb.hold);$('cbHold').setAttribute('aria-pressed',cb.hold);
  $('cbBass').classList.toggle('on',cb.bass);$('cbBass').setAttribute('aria-pressed',cb.bass);
  renderTray();
}
function renderTray(){const t=cb.tray;
  $('tray').innerHTML=t.length?t.map(d=>'<span class="tc">'+(padDefs[d]?padDefs[d].roman:'?')+'</span>').join(''):'<span class="empty">Play chords to sketch a progression</span>';
  $('useV').disabled=!t.length;$('useC').disabled=!t.length;$('clearTray').disabled=!t.length;}
function chordOff(){if(!cb.active)return;const t=E.ctx.currentTime;cb.active.rel.forEach(r=>r(t));const el=$('pads').children[cb.active.i];if(el)el.classList.remove('down');cb.active=null}
function chordOn(i){
  const c=padDefs[i];if(!c)return;
  if(cb.active&&cb.active.i===i&&cb.hold){chordOff();return}
  chordOff();E.init();if(E.ctx.resume)E.ctx.resume();
  const t=E.ctx.currentTime,rel=[];
  c.notes.forEach((m,k)=>rel.push(E.playNote('chords',m,0.85,t+k*0.014,undefined,(k/(c.notes.length-1||1)-0.5)*0.5,'live')));
  if(cb.bass&&E.audible('bass'))rel.push(E.playNote('bass',c.bass,0.7,t,undefined,0));
  cb.active={i,rel};const el=$('pads').children[i];if(el)el.classList.add('down');
  if(cb.tray[cb.tray.length-1]!==c.deg){cb.tray.push(c.deg);if(cb.tray.length>8)cb.tray.shift();renderTray()}
}
$('pads').addEventListener('pointerdown',e=>{const p=e.target.closest('.pad');if(!p)return;e.preventDefault();try{p.setPointerCapture(e.pointerId)}catch(err){}chordOn(+p.dataset.i)});
$('pads').addEventListener('pointerup',()=>{if(!cb.hold)chordOff()});
$('pads').addEventListener('pointercancel',()=>{if(!cb.hold)chordOff()});
$('cb7').addEventListener('click',()=>{cb.sevenths=!cb.sevenths;chordOff();renderPads()});
$('cbHold').addEventListener('click',()=>{cb.hold=!cb.hold;if(!cb.hold)chordOff();renderPads()});
$('cbBass').addEventListener('click',()=>{cb.bass=!cb.bass;renderPads()});
$('clearTray').addEventListener('click',()=>{cb.tray=[];renderTray()});
function useProg(part){if(!cb.tray.length)return;state.prog[part]=cb.tray.slice();U.regenerate();U.setStatus((part==='v'?'A verse':'B chorus')+' chords: '+cb.tray.map(d=>padDefs[d].roman).join(' – '))}
$('useV').addEventListener('click',()=>useProg('v'));$('useC').addEventListener('click',()=>useProg('c'));

/* ---------- note keys ---------- */
const KEYMAP='ASDFGHJQWERTYU';let kbPitches=[];const held={};
// while Rec is armed the keys sound the layer you record into, in that layer's own register, so what you
// play is what you get: the arp an octave up, the bass folded down. The pitch class never changes.
const recLayer=()=>rec.armed?state.recTarget:'lead';
const playPitch=i=>kbPitches[i]?Z.recordPitch(recLayer(),kbPitches[i].midi,state.root):0;
function renderKeys(){
  const base=(state.root>=6?48:60)+state.root;
  kbPitches=Z.scalePitches(U.cfg(),base,base+40).filter(p=>!p.passing).slice(0,14);
  $('keys').innerHTML=kbPitches.map((p,i)=>{const m=playPitch(i),n=Z.NOTE_NAMES[m%12],oct=Math.floor(m/12)-1;
    return '<button class="key'+(m%12===state.root?' root':'')+'" data-i="'+i+'" aria-label="'+n+oct+'"><span class="n">'+n+'<sub style="font-size:9px">'+oct+'</sub></span><span class="k">'+KEYMAP[i]+'</span></button>'}).join('');
  $('keys').style.setProperty('--c',COLORS[recLayer()]);$('keys').classList.toggle('armed',rec.armed);
  renderRecInfo();
}
function keyOn(i){
  if(held[i]||!kbPitches[i])return;const midi=playPitch(i),rel=E.noteOn(midi,recLayer()),h={rel,start:null,midi};
  if(rec.armed&&E.playing)h.start=E.nearestStep(E.ctx.currentTime); // quantise to the closest sixteenth
  held[i]=h;const el=$('keys').children[i];if(el)el.classList.add('down');
}
function keyOff(i){
  const h=held[i];if(!h)return;const t=E.ctx.currentTime;h.rel(t);delete held[i];
  if(h.start)recordNote(h.start,h.midi,t);
  const el=$('keys').children[i];if(el)el.classList.remove('down');
}
$('keys').addEventListener('pointerdown',e=>{const k=e.target.closest('.key');if(!k)return;e.preventDefault();try{k.setPointerCapture(e.pointerId)}catch(err){}keyOn(+k.dataset.i)});
$('keys').addEventListener('pointerup',e=>{const k=e.target.closest('.key');if(k)keyOff(+k.dataset.i)});
$('keys').addEventListener('pointercancel',e=>{const k=e.target.closest('.key');if(k)keyOff(+k.dataset.i)});
window.addEventListener('blur',()=>{Object.keys(held).forEach(i=>keyOff(i));if(!cb.hold)chordOff()});

/* ---------- boot ---------- */
Object.assign(U,{renderKeys,renderPads,renderMixer,renderFavs,renderSound,renderGrid,syncLabels,renderRecInfo,midiFile,setRec});
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(song().length)U.buildRoll()},120)});
let saved=null,seen=false;try{saved=JSON.parse(localStorage.getItem('zinth.project'));seen=!!localStorage.getItem('zinth.seen')}catch(e){}
if(saved){try{U.restore(saved);U.setStatus('Restored your last session')}catch(e){U.newTrack()}}else U.newTrack();
if(!seen){showSheet(true);try{localStorage.setItem('zinth.seen','1')}catch(e){}}
requestAnimationFrame(raf);
})();
