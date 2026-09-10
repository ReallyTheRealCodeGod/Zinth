(()=>{
'use strict';
const Z=window.Z,E=Z.engine,$=id=>document.getElementById(id),ZUI=window.ZUI=window.ZUI||{};
// these live in the second UI script; delegate through the shared ZUI namespace
const renderKeys=()=>ZUI.renderKeys(),renderPads=()=>ZUI.renderPads(),renderMixer=()=>ZUI.renderMixer(),renderFavs=()=>ZUI.renderFavs(),renderSound=()=>ZUI.renderSound(),renderGrid=()=>ZUI.renderGrid(),syncLabels=()=>ZUI.syncLabels();
const COLORS={lead:'#f5a524',arp:'#4fd1c5',chords:'#a78bfa',bass:'#f26d85',drums:'#d9c9a3'};
const MOODS={
  chill:   {label:'Chill',       scales:['dorian','pentMajor','mixolydian'],bpm:[80,96],  energy:45,swing:28,sevenths:true, gate:0.7,kit:'Lo-fi',
            sound:{lead:{wave:'triangle',cutoff:58,reso:15,attack:8,release:45,spread:15,delay:40,reverb:40},arp:{wave:'sine',cutoff:60,level:45,delay:50,reverb:35},chords:{wave:'super',cutoff:38,attack:50,release:65,reverb:55,level:50},bass:{wave:'saw',cutoff:32,level:80},drums:{level:60,reverb:25,pump:25}}},
  dreamy:  {label:'Dreamy',      scales:['lydian','major','pentMajor'],bpm:[84,100],energy:35,swing:8, sevenths:true, gate:0.9,kit:'Lo-fi',
            sound:{lead:{wave:'sine',cutoff:55,reso:10,attack:22,release:70,spread:30,delay:55,reverb:60},arp:{wave:'triangle',cutoff:50,level:45,delay:55,reverb:45},chords:{wave:'super',cutoff:35,attack:70,release:80,reverb:70,level:55},bass:{wave:'sine',cutoff:40,level:75},drums:{level:45,reverb:35,pump:20}}},
  driving: {label:'Driving',     scales:['minor','dorian','pentMinor'],bpm:[124,138],energy:80,swing:0, sevenths:false,gate:0.55,kit:'909',
            sound:{lead:{wave:'saw',cutoff:70,reso:35,attack:1,release:25,spread:25,delay:30,reverb:20},arp:{wave:'square',cutoff:62,level:60,delay:35,reverb:20},chords:{wave:'saw',cutoff:45,attack:20,release:40,level:40,reverb:40},bass:{wave:'square',cutoff:45,level:85},drums:{level:85,reverb:15,pump:60}}},
  dark:    {label:'Dark',        scales:['phrygian','harmMinor','hirajoshi','insen'],bpm:[92,112],energy:60,swing:6,sevenths:false,gate:0.6,kit:'Trap',
            sound:{lead:{wave:'saw',cutoff:48,reso:45,attack:2,release:40,spread:35,delay:45,reverb:45},arp:{wave:'saw',cutoff:42,level:50,delay:50,reverb:35},chords:{wave:'super',cutoff:30,attack:60,release:70,level:50,reverb:65},bass:{wave:'saw',cutoff:30,level:85},drums:{level:75,reverb:30,pump:45}}},
  retro:   {label:'Retro',       scales:['major','mixolydian','pentMajor'],bpm:[110,124],energy:65,swing:0,sevenths:false,gate:0.5,kit:'808',
            sound:{lead:{wave:'square',cutoff:80,reso:5,attack:0,release:15,spread:0,delay:25,reverb:12},arp:{wave:'square',cutoff:85,level:55,spread:0,delay:30,reverb:10},chords:{wave:'triangle',cutoff:70,attack:5,release:30,level:45,spread:0,reverb:20},bass:{wave:'triangle',cutoff:60,level:85,spread:0},drums:{level:70,reverb:8,pump:15}}},
  uplift:  {label:'Uplifting',   scales:['major','lydian'],bpm:[126,134],energy:75,swing:0,sevenths:false,gate:0.6,kit:'909',
            sound:{lead:{wave:'super',cutoff:68,reso:20,attack:4,release:40,spread:45,delay:40,reverb:40},arp:{wave:'saw',cutoff:60,level:55,delay:45,reverb:30},chords:{wave:'super',cutoff:50,attack:30,release:60,level:55,spread:55,reverb:55},bass:{wave:'saw',cutoff:40,level:85},drums:{level:80,reverb:20,pump:65}}},
  odd:     {label:'Otherworldly',scales:['wholeTone','lydian','insen'],bpm:[70,100],energy:40,swing:10,sevenths:true,gate:0.85,kit:'Lo-fi',
            sound:{lead:{wave:'sine',cutoff:60,reso:30,attack:15,release:80,spread:40,delay:60,reverb:70},arp:{wave:'triangle',cutoff:55,level:50,delay:60,reverb:50},chords:{wave:'super',cutoff:32,attack:80,release:90,level:50,reverb:80},bass:{wave:'sine',cutoff:35,level:70},drums:{level:35,reverb:50,pump:20}}},
};
const WAVES=[['sine','M2 7q3-7 6 0t6 0 6 0'],['triangle','M2 12l3-10 3 10 3-10 3 10 3-10 3 10'],['saw','M2 12l6-10v10l6-10v10l6-10v10'],['square','M2 12v-10h6v10h6v-10h6v10'],['super','M2 12l4-10v10l4-10v10l4-10v10l4-10v10l4-10v10']];
const PATCHES={
  Init:{wave:'saw',cutoff:60,reso:20,attack:5,release:30,spread:20},Pluck:{wave:'saw',cutoff:55,reso:35,attack:0,release:22,spread:10},
  Pad:{wave:'super',cutoff:38,reso:8,attack:65,release:80,spread:45},Supersaw:{wave:'super',cutoff:72,reso:15,attack:6,release:45,spread:60},
  Sub:{wave:'sine',cutoff:35,reso:5,attack:2,release:30,spread:0},Bell:{wave:'sine',cutoff:85,reso:60,attack:0,release:70,spread:35},
  Chip:{wave:'square',cutoff:90,reso:0,attack:0,release:12,spread:0},Reese:{wave:'saw',cutoff:30,reso:25,attack:8,release:35,spread:80},
  Keys:{wave:'triangle',cutoff:65,reso:10,attack:1,release:40,spread:8},Strings:{wave:'saw',cutoff:48,reso:5,attack:55,release:75,spread:30},
  Brass:{wave:'saw',cutoff:58,reso:40,attack:12,release:28,spread:15},Hollow:{wave:'square',cutoff:42,reso:30,attack:25,release:60,spread:25},
};
// Section types: the arranger's building blocks. part 'v' uses the A chords, 'c' the B chords.
const SEC_TYPES={
  'Intro':     {part:'v',energy:-15,bars:8,layers:{lead:0,arp:1,chords:1,bass:0,drums:'lite'}},
  'Verse':     {part:'v',energy:-5, bars:8,layers:{lead:1,arp:1,chords:1,bass:1,drums:1}},
  'Pre-chorus':{part:'v',energy:5,  bars:4,layers:{lead:0,arp:1,chords:1,bass:1,drums:1}},
  'Chorus':    {part:'c',energy:12, bars:8,layers:{lead:1,arp:1,chords:1,bass:1,drums:1},hook:true},
  'Bridge':    {part:'c',energy:-8, bars:8,layers:{lead:1,arp:0,chords:1,bass:1,drums:'lite'}},
  'Break':     {part:'c',energy:-10,bars:4,layers:{lead:1,arp:0,chords:1,bass:0,drums:0},hook:true},
  'Drop':      {part:'c',energy:20, bars:8,layers:{lead:1,arp:1,chords:1,bass:1,drums:1},hook:true,double:true},
  'Outro':     {part:'v',energy:-20,bars:8,layers:{lead:0,arp:1,chords:1,bass:0,drums:'lite'}},
};
const DEFAULT_FORM=['Intro','Verse','Chorus','Verse','Chorus','Break','Drop','Outro'];
const FX=[['lp','Z','Low sweep'],['hp','X','High sweep'],['gate8','C','Gate ⅛'],['gate16','V','Gate ⅟₁₆'],['crush','B','Crush'],['throw','N','Delay throw'],['wash','M','Wash']];
const FXKEYS={z:'lp',x:'hp',c:'gate8',v:'gate16',b:'crush',n:'throw',m:'wash'};

const state={
  seeds:{chords:'',lead:'',arp:'',bass:'',drums:''},locks:{chords:false,lead:false,arp:false,bass:false,drums:false},
  mood:'chill',root:2,scale:'dorian',bpm:92,energy:45,swing:28,evolve:true,sevenths:true,gate:0.7,
  prog:{v:null,c:null},drumEdits:{v:null,c:null},leadEdits:{v:null,c:null},kit:'808',transitions:true,sections:[],sel:0,loop:0,layer:'lead',
};
const rec={armed:false};
let song=[],viewSection=0,rollCache=null,statusTimer=null,exporting=false,secId=1,leadHit=null,drag=null,dragPreview=null;
function newSection(type){const t=SEC_TYPES[type]||SEC_TYPES.Verse;return {id:secId++,type,part:t.part,bars:t.bars,energy:t.energy,transpose:0,layers:Object.assign({},t.layers),hook:!!t.hook,double:!!t.double}}
function defaultSections(){return DEFAULT_FORM.map(newSection)}

/* ---------- populate controls ---------- */
Z.NOTE_NAMES.forEach((n,i)=>{const o=document.createElement('option');o.value=i;o.textContent=n;$('root').appendChild(o)});
for(const k in Z.SCALES){const o=document.createElement('option');o.value=k;o.textContent=Z.SCALES[k].name;$('scale').appendChild(o)}
for(const k in MOODS){const b=document.createElement('button');b.className='chip';b.textContent=MOODS[k].label;b.dataset.mood=k;b.addEventListener('click',()=>{state.mood=k;newTrack(true)});$('moods').appendChild(b)}
for(const k in SEC_TYPES){const o=document.createElement('option');o.value=k;o.textContent=k;$('secType').appendChild(o)}
for(const k in PATCHES){const o=document.createElement('option');o.value=k;o.textContent=k;$('patch').appendChild(o)}
{const o=document.createElement('option');o.value='';o.textContent='custom';$('patch').appendChild(o)}
for(const k in Z.KITS){const o=document.createElement('option');o.value=k;o.textContent=k;$('kit').appendChild(o)}
Z.LAYERS.forEach(L=>{
  const t=document.createElement('button');t.className='tab';t.setAttribute('role','tab');t.textContent=L;t.style.setProperty('--c',COLORS[L]);t.addEventListener('click',()=>{state.layer=L;renderSound()});$('tabs').appendChild(t);
  const ln=document.createElement('div');ln.className='lane';const b=document.createElement('button');b.textContent=L;b.style.setProperty('--c',COLORS[L]);b.title='Mute / unmute '+L;
  b.addEventListener('click',()=>{E.setParam(L,'mute',!E.params[L].mute);renderMixer();persist()});ln.appendChild(b);$('lanes').appendChild(ln);
  const lb=document.createElement('button');lb.dataset.l=L;lb.textContent=L;lb.style.setProperty('--c',COLORS[L]);$('secLayers').appendChild(lb);
});
WAVES.forEach(([w,d])=>{const b=document.createElement('button');b.className='wave';b.dataset.wave=w;b.title=w;b.innerHTML='<svg viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="'+d+'"/></svg>';
  b.addEventListener('click',()=>{E.setParam(state.layer,'wave',w);renderSound();persist()});$('waves').appendChild(b)});
function fill(inp){inp.style.setProperty('--pct',((inp.value-inp.min)/(inp.max-inp.min)*100)+'%')}
document.querySelectorAll('input[type=range]').forEach(r=>{fill(r);r.addEventListener('input',()=>fill(r))});
function setStatus(t){$('status').textContent=t;$('status').title=t;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{$('status').textContent=''},7000)}

/* ---------- project model ---------- */
function snapshot(){const s=JSON.parse(JSON.stringify(state));delete s.loop;s.sections=s.sections.map(x=>{const y=Object.assign({},x);delete y.id;return y});return {app:'zinth',v:2,state:s,params:JSON.parse(JSON.stringify(E.params)),master:+$('master').value}}
function restore(p){
  if(!p||p.app!=='zinth'||!p.state)throw new Error('Not a Zinth project');
  const s=p.state;
  Object.assign(state,{seeds:s.seeds,locks:s.locks||state.locks,mood:MOODS[s.mood]?s.mood:'chill',root:s.root,scale:Z.SCALES[s.scale]?s.scale:'dorian',bpm:s.bpm,energy:s.energy,swing:s.swing,evolve:s.evolve!==false,sevenths:!!s.sevenths,gate:s.gate||0.7,
    prog:s.prog||{v:null,c:null},drumEdits:s.drumEdits||{v:null,c:null},leadEdits:s.leadEdits||{v:null,c:null},kit:Z.KITS[s.kit]?s.kit:'808',transitions:s.transitions!==false,sections:(s.sections&&s.sections.length?s.sections:defaultSections()),sel:s.sel||0,layer:s.layer||'lead'});
  state.sections.forEach(sec=>{sec.id=secId++;if(!SEC_TYPES[sec.type])sec.type='Verse'});
  if(p.params)for(const L of Z.LAYERS)for(const k in p.params[L]||{})E.setParam(L,k,p.params[L][k]);
  E.kit=state.kit;E.transitions=state.transitions;if(p.master!==undefined){$('master').value=p.master;E.setMaster(p.master)}
  state.loop=0;viewSection=Math.min(state.sel,state.sections.length-1);syncControls();regenerate();
}
// autosave + undo history: every settled change becomes an undo step
let persistTimer=null;const undo={stack:[],redo:[],last:null,quiet:false};
function persist(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>{
  const s=JSON.stringify(snapshot());
  if(s!==undo.last){if(undo.last&&!undo.quiet){undo.stack.push(undo.last);if(undo.stack.length>50)undo.stack.shift();undo.redo.length=0}undo.last=s}
  undo.quiet=false;try{localStorage.setItem('zinth.project',s)}catch(e){}},300)}
function undoStep(){if(!undo.stack.length){setStatus('Nothing to undo');return}const prev=undo.stack.pop();undo.redo.push(undo.last);undo.quiet=true;undo.last=prev;restore(JSON.parse(prev));setStatus('Undone ('+undo.stack.length+' more)')}
function redoStep(){if(!undo.redo.length){setStatus('Nothing to redo');return}const nxt=undo.redo.pop();undo.stack.push(undo.last);undo.quiet=true;undo.last=nxt;restore(JSON.parse(nxt));setStatus('Redone')}

/* ---------- track codes (quick idea recall) ---------- */
const clampN=(v,a,b,dflt)=>{v=+v;return isNaN(v)?dflt:Math.max(a,Math.min(b,Math.round(v)))};
function code(){
  const S=state.seeds,same=Z.LAYERS.every(L=>S[L]===S.chords);
  return [same?S.chords:Z.LAYERS.map(L=>S[L]).join('~'),state.mood,state.root,state.scale,state.bpm,state.energy,state.swing,state.prog.v?state.prog.v.join('-'):'x',state.prog.c?state.prog.c.join('-'):'x'].join('.');
}
function parseCode(str){
  const p=String(str||'').trim().split('.');const raw=(p[0]||'').toUpperCase().split('~').map(s=>s.replace(/[^A-Z0-9]/g,'').slice(0,10)).filter(Boolean);
  if(!raw.length)return null;const seeds={};Z.LAYERS.forEach((L,i)=>seeds[L]=raw.length===5?raw[i]:raw[0]);
  if(p.length<8)return {seeds};
  const prog=x=>/^\d+(-\d+)*$/.test(x||'')?x.split('-').map(Number).slice(0,8):null;
  return {seeds,mood:MOODS[p[1]]?p[1]:state.mood,root:clampN(p[2],0,11,null),scale:Z.SCALES[p[3]]?p[3]:null,bpm:clampN(p[4],60,180,state.bpm),energy:clampN(p[5],0,100,state.energy),swing:clampN(p[6],0,60,state.swing),progV:prog(p[7]),progC:prog(p[8])};
}

/* ---------- generation ---------- */
function cfg(){return {root:state.root,scale:state.scale,energy:state.energy,evolve:state.evolve,sevenths:state.sevenths,gate:state.gate}}
function applyMood(seed){
  const m=MOODS[state.mood],r=new Z.Rng(seed+':mood:'+state.mood);
  state.root=r.int(12);state.scale=r.pick(m.scales);state.bpm=Math.round(r.range(m.bpm[0],m.bpm[1]));
  state.energy=m.energy;state.swing=m.swing;state.sevenths=m.sevenths;state.gate=m.gate;state.kit=m.kit;E.kit=m.kit;
  for(const L in m.sound)for(const k in m.sound[L])E.setParam(L,k,m.sound[L][k]);
}
function syncControls(){
  $('root').value=state.root;$('scale').value=state.scale;$('bpm').value=state.bpm;$('energy').value=state.energy;$('swing').value=state.swing;
  document.querySelectorAll('input[type=range]').forEach(fill);syncLabels();E.setBpm(state.bpm);E.swing=state.swing/100;
  document.querySelectorAll('#moods .chip').forEach(b=>b.classList.toggle('on',b.dataset.mood===state.mood));
  $('evolve').classList.toggle('on',state.evolve);$('evolve').setAttribute('aria-checked',state.evolve);
  $('transTgl').classList.toggle('on',state.transitions);$('transTgl').setAttribute('aria-checked',state.transitions);
}
function newTrack(fromMood){
  const unlocked=Z.LAYERS.filter(L=>!state.locks[L]);
  if(!unlocked.length){setStatus('Every layer is locked. Unlock one in the mixer to reroll it.');return}
  unlocked.forEach(L=>state.seeds[L]=Z.randomSeed());
  if(!state.locks.chords){state.prog={v:null,c:null};applyMood(state.seeds.chords)}
  if(!state.locks.drums)state.drumEdits={v:null,c:null};
  if(!state.locks.lead)state.leadEdits={v:null,c:null};
  if(!state.sections.length)state.sections=defaultSections();
  state.loop=0;syncControls();regenerate();
  setStatus(unlocked.length===5?'New track':'Rerolled '+unlocked.join(', '));
}
function dice(L){state.seeds[L]=Z.randomSeed();if(L==='chords')state.prog={v:null,c:null};if(L==='drums')state.drumEdits={v:null,c:null};if(L==='lead')state.leadEdits={v:null,c:null};state.locks[L]=false;regenerate();setStatus('New '+L)}
function loadCode(){
  const c=parseCode($('seed').value);if(!c){setStatus('Paste a track code first');return}
  state.seeds=c.seeds;state.loop=0;state.prog={v:null,c:null};state.drumEdits={v:null,c:null};
  if(c.mood!==undefined){state.mood=c.mood;applyMood(c.seeds.chords);if(c.root!==null)state.root=c.root;if(c.scale)state.scale=c.scale;state.bpm=c.bpm;state.energy=c.energy;state.swing=c.swing;state.prog={v:c.progV,c:c.progC}}
  else applyMood(c.seeds.chords);
  syncControls();regenerate();setStatus('Loaded '+c.seeds.chords);
}
function sectionCfg(sec){
  // while recording is armed, parts without a recording fall silent so you record over a clean backing
  const leadEvents=state.leadEdits[sec.part]||(rec.armed?[]:null);
  return Object.assign(cfg(),{root:(state.root+(sec.transpose||0)+120)%12,transpose:sec.transpose||0,energy:state.energy+sec.energy,leadEnergy:state.energy+(sec.part==='c'?10:0),hook:!!sec.hook,prog:state.prog[sec.part],drumPattern:state.drumEdits[sec.part],leadEvents});
}
function buildSong(){return state.sections.map(sec=>Object.assign({},sec,{track:Z.generateTrack(sectionCfg(sec),state.seeds,sec.part,sec.part==='v'?state.loop:0)}))}
// light rebuild for live edits (recording): keeps the keyboard and pads untouched
function rebuild(){song=buildSong();E.song=song;buildRoll();persist()}
function regenerate(){
  if(!state.sections.length)state.sections=defaultSections();
  song=buildSong();E.song=song;E.kit=state.kit;E.transitions=state.transitions;
  if(viewSection>=song.length)viewSection=song.length-1;if(state.sel>=song.length)state.sel=song.length-1;
  $('seed').value=code();renderKey();renderProg();renderArr();renderInsp();buildRoll();renderKeys();renderPads();renderMixer();renderFavs();renderSound();persist();
}
E.onLoop=loop=>{state.loop=loop;if(state.evolve){song=buildSong();E.song=song}};
E.onSection=si=>{viewSection=si;renderArr();renderProg();buildRoll();if(state.layer==='drums')renderGrid()};

/* ---------- centre rendering ---------- */
function renderKey(){
  const sc=Z.SCALES[state.scale];
  $('keyName').innerHTML=Z.NOTE_NAMES[state.root]+' <em>'+sc.name+'</em>';
  $('scaleNotes').innerHTML=sc.steps.map((s,i)=>'<span class="note'+(i===0?' root':'')+'">'+Z.NOTE_NAMES[(state.root+s)%12]+'</span>').join('');
  $('kbHint').textContent='Everything below is locked to '+Z.NOTE_NAMES[state.root]+' '+sc.name+': the chord pads and the letter-key notes all fit the track. Mute the Chords lane to play your own progression over it.';
}
function renderProg(){
  const sec=song[viewSection];if(!sec)return;
  $('progLabel').textContent='Chords · '+(sec.part==='v'?'A verse':'B chorus')+(sec.transpose?' · '+Z.NOTE_NAMES[(state.root+sec.transpose+120)%12]+' ('+(sec.transpose>0?'+':'')+sec.transpose+')':'');
  $('progTag').hidden=!state.prog[sec.part];
  $('prog').innerHTML=sec.track.chords.map((c,i)=>'<div class="chord" data-i="'+i+'"><span class="rn">'+c.roman+'</span><span class="cn">'+c.name+'</span><span class="bars">bars '+(c.bar0+1)+'–'+(c.bar0+c.bars)+'</span></div>').join('');
}
function renderArr(){
  const cur=E.playing?E.section:-1;
  $('arr').innerHTML=song.map((s,i)=>'<button class="sec'+(i===state.sel?' sel':'')+(i===cur?' now':'')+'" data-i="'+i+'" title="Click to select, double-click to play from here"><span class="sn">'+s.type+'</span><span class="sb">'+s.bars+'</span><span class="dots">'+Z.LAYERS.map(L=>'<i style="--c:'+COLORS[L]+'" class="'+(s.layers[L]==='lite'?'lite':s.layers[L]?'on':'')+'"></i>').join('')+'</span>'+(s.transpose?'<span class="tp">'+(s.transpose>0?'+':'')+s.transpose+'</span>':'')+'</button>').join('');
  const bars=song.reduce((a,s)=>a+s.bars,0),secs=bars*4*60/state.bpm;
  $('songLen').textContent=bars+' bars · '+Math.floor(secs/60)+':'+String(Math.round(secs%60)).padStart(2,'0');
}
function selectSection(i,jump){
  state.sel=i;viewSection=i;
  if(E.playing&&(jump||E.loopSection))E.jump(i);
  renderArr();renderInsp();renderProg();buildRoll();if(state.layer==='drums')renderGrid();if(ZUI.renderRecInfo)ZUI.renderRecInfo();persist();
}
$('arr').addEventListener('click',e=>{const b=e.target.closest('.sec');if(b)selectSection(+b.dataset.i,false)});
$('arr').addEventListener('dblclick',e=>{const b=e.target.closest('.sec');if(b)selectSection(+b.dataset.i,true)});
function renderInsp(){
  const sec=state.sections[state.sel];if(!sec)return;
  $('secType').value=sec.type;$('secTrans').value=String(sec.transpose||0);
  $('secPart').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===sec.part));
  $('secBars').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.v===sec.bars));
  $('secLayers').querySelectorAll('button').forEach(b=>{const v=sec.layers[b.dataset.l];b.className=v==='lite'?'lite':v?'on':'';b.textContent=b.dataset.l+(v==='lite'?' ·lite':'')});
  $('secLeft').disabled=state.sel===0;$('secRight').disabled=state.sel>=state.sections.length-1;$('secDel').disabled=state.sections.length<=1;
}
function editSec(fn){const sec=state.sections[state.sel];if(!sec)return;fn(sec);regenerate()}
$('secType').addEventListener('change',e=>editSec(sec=>{const t=SEC_TYPES[e.target.value];sec.type=e.target.value;sec.part=t.part;sec.bars=t.bars;sec.energy=t.energy;sec.layers=Object.assign({},t.layers);sec.hook=!!t.hook;sec.double=!!t.double}));
$('secPart').addEventListener('click',e=>{const b=e.target.closest('button');if(b)editSec(sec=>{sec.part=b.dataset.v;sec.hook=sec.part==='c'})});
$('secBars').addEventListener('click',e=>{const b=e.target.closest('button');if(b)editSec(sec=>sec.bars=+b.dataset.v)});
$('secTrans').addEventListener('change',e=>editSec(sec=>sec.transpose=+e.target.value));
$('secLayers').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;editSec(sec=>{const L=b.dataset.l,v=sec.layers[L];sec.layers[L]=L==='drums'?(v===1||v===true?'lite':v==='lite'?0:1):(v?0:1)})});
$('secLeft').addEventListener('click',()=>{const i=state.sel;if(i>0){[state.sections[i-1],state.sections[i]]=[state.sections[i],state.sections[i-1]];state.sel=i-1;viewSection=i-1;regenerate()}});
$('secRight').addEventListener('click',()=>{const i=state.sel;if(i<state.sections.length-1){[state.sections[i+1],state.sections[i]]=[state.sections[i],state.sections[i+1]];state.sel=i+1;viewSection=i+1;regenerate()}});
$('secDup').addEventListener('click',()=>{const s=state.sections[state.sel];const c=JSON.parse(JSON.stringify(s));c.id=secId++;state.sections.splice(state.sel+1,0,c);state.sel++;viewSection=state.sel;regenerate()});
$('secDel').addEventListener('click',()=>{if(state.sections.length<=1)return;state.sections.splice(state.sel,1);state.sel=Math.min(state.sel,state.sections.length-1);viewSection=state.sel;if(E.playing&&E.section>=state.sections.length)E.jump(0);regenerate()});
$('addSec').addEventListener('click',()=>{const s=newSection('Verse');state.sections.splice(state.sel+1,0,s);state.sel++;viewSection=state.sel;regenerate();setStatus('Section added. Pick its type in the inspector.')});

const canvas=$('rollCanvas'),ctx2=canvas.getContext('2d');
let rollBars=8;
// the lead lane is one row per scale pitch, in the register the lead generator writes in
function leadPitches(sec){
  const root=(state.root+(sec.transpose||0)+120)%12,lo=64+(root>=6?-6:0);
  return Z.scalePitches({root,scale:state.scale},lo,lo+22);
}
function buildRoll(){
  const sec=song[viewSection];leadHit=null;if(!sec)return;const track=sec.track,lay=sec.layers;rollBars=Math.min(8,sec.bars);
  const W=$('roll').clientWidth||1000,H=340,dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.height=H+'px';
  rollCache=document.createElement('canvas');rollCache.width=W*dpr;rollCache.height=H*dpr;
  const c=rollCache.getContext('2d');c.scale(dpr,dpr);
  const gx=74,gw=W-gx,laneH=H/5,steps=rollBars*16,sw=gw/steps;
  c.fillStyle='#0e1017';c.fillRect(0,0,W,H);
  track.chords.forEach((ch,i)=>{c.fillStyle=i%2?'rgba(167,139,250,.05)':'rgba(167,139,250,.02)';c.fillRect(gx+ch.bar0*16*sw,0,ch.bars*16*sw,H)});
  for(let s=0;s<=steps;s+=4){c.strokeStyle=s%16===0?'rgba(236,230,216,.18)':'rgba(236,230,216,.05)';c.lineWidth=1;c.beginPath();c.moveTo(gx+s*sw+.5,0);c.lineTo(gx+s*sw+.5,H);c.stroke()}
  for(let i=1;i<5;i++){c.strokeStyle='rgba(236,230,216,.12)';c.beginPath();c.moveTo(0,i*laneH+.5);c.lineTo(W,i*laneH+.5);c.stroke()}
  c.fillStyle='rgba(236,230,216,.35)';c.font='500 10px IBM Plex Mono, monospace';
  for(let b=0;b<rollBars;b++)c.fillText(String(b+1),gx+b*16*sw+4,11);
  const rest=(y)=>{c.fillStyle='rgba(236,230,216,.22)';c.font='500 10px IBM Plex Mono, monospace';c.fillText('— rests in this section —',gx+8,y)};
  const lane=(i,evs,getMidi)=>{
    const L=Z.LAYERS[i],y0=i*laneH+14,h=laneH-22;
    if(!lay[L]){rest(y0+h/2+4);return}
    evs=evs.filter(e=>e.step<steps);const ms=evs.map(getMidi).flat();if(!ms.length)return;
    let lo=Math.min(...ms),hi=Math.max(...ms);if(hi-lo<5){lo-=2;hi+=3}
    const nh=Math.max(3,Math.min(9,h/(hi-lo+1)));
    evs.forEach(e=>{const notes=[].concat(getMidi(e));notes.forEach(m=>{const y=y0+h-((m-lo)/(hi-lo))*(h-nh);c.globalAlpha=0.45+e.vel*0.55;c.fillStyle=COLORS[L];c.fillRect(gx+e.step*sw+0.5,y,Math.max(2,Math.min(e.dur,steps-e.step)*sw-1.2),nh)})});c.globalAlpha=1;
  };
  const leadY=14,leadH=laneH-22,pitches=leadPitches(sec),rowH=leadH/pitches.length,rects=[];
  if(!lay.lead)rest(leadY+leadH/2+4);
  else{
    track.lead.filter(e=>e.step<steps).forEach(e=>{
      let idx=0,bd=1e9;pitches.forEach((p,i)=>{const d=Math.abs(p.midi-e.midi);if(d<bd){bd=d;idx=i}});
      const x=gx+e.step*sw+0.5,y=leadY+leadH-(idx+1)*rowH,w=Math.max(2,Math.min(e.dur,steps-e.step)*sw-1.2),h=Math.max(2,rowH-1.4);
      c.globalAlpha=0.5+e.vel*0.5;c.fillStyle=COLORS.lead;c.fillRect(x,y,w,h);
      rects.push({step:e.step,midi:e.midi,x,y,w,h});
    });
    c.globalAlpha=1;
  }
  leadHit={gx,sw,steps,y0:leadY,h:leadH,pitches,rowH,rects};
  lane(1,track.arp,e=>e.midi);lane(2,track.chordEvs,e=>e.notes);lane(3,track.bass,e=>e.midi);
  const rows={kick:3,snare:2,clap:1,ohat:0,hat:0},y0=4*laneH+12,rh=(laneH-20)/4;
  if(!lay.drums)rest(y0+rh*2+4);
  else track.drums.forEach(d=>{
    if(d.step>=steps)return;if(lay.drums==='lite'&&(d.kind==='snare'||d.kind==='clap'||(d.kind==='kick'&&d.step%16!==0)))return;
    const y=y0+rows[d.kind]*rh+rh/2;c.globalAlpha=0.4+d.vel*0.6;c.fillStyle=COLORS.drums;
    if(d.kind==='kick')c.fillRect(gx+d.step*sw+0.5,y-4,Math.max(3,sw-1),8);else{c.beginPath();c.arc(gx+d.step*sw+sw/2,y,d.kind==='ohat'?3.4:d.kind==='snare'?3:d.kind==='clap'?2.6:2,0,7);c.fill()}});
  c.globalAlpha=1;drawFrame(-1);
}
function drawFrame(step){
  if(!rollCache)return;const dpr=Math.min(2,window.devicePixelRatio||1);
  ctx2.setTransform(1,0,0,1,0,0);ctx2.drawImage(rollCache,0,0);
  if(step>=0){const W=canvas.width/dpr,gx=74,sw=(W-gx)/(rollBars*16),s=step%(rollBars*16);ctx2.scale(dpr,dpr);
    ctx2.fillStyle='rgba(245,165,36,.10)';ctx2.fillRect(gx+s*sw,0,sw,canvas.height/dpr);
    ctx2.fillStyle='#f5a524';ctx2.fillRect(gx+s*sw,0,1.5,canvas.height/dpr)}
  if(dragPreview){ctx2.setTransform(dpr,0,0,dpr,0,0);
    ctx2.fillStyle='rgba(245,165,36,.55)';ctx2.fillRect(dragPreview.x,dragPreview.y,dragPreview.w,dragPreview.h);
    ctx2.strokeStyle='#ece6d8';ctx2.lineWidth=1;ctx2.strokeRect(dragPreview.x+.5,dragPreview.y+.5,dragPreview.w-1,dragPreview.h-1)}
}

/* ---------- lead note editing in the roll ---------- */
// edits live in state.leadEdits[part], the same format a recorded melody uses, so both share one path
function leadEditList(sec){
  const list=state.leadEdits[sec.part];
  return list?list.map(e=>Object.assign({},e)):sec.track.lead.map(e=>({step:e.step,dur:e.dur,midi:e.midi-(sec.transpose||0),vel:e.vel}));
}
function commitLead(sec,list,msg){
  const fresh=!state.leadEdits[sec.part];
  list.sort((a,b)=>a.step-b.step);state.leadEdits[sec.part]=list;rebuild();if(ZUI.renderRecInfo)ZUI.renderRecInfo();
  setStatus(msg+(fresh?' · this melody is yours now; Clear melody brings the generated one back':''));
}
function rollXY(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
function inLeadLane(p){return !!leadHit&&p.x>=leadHit.gx&&p.y>=leadHit.y0&&p.y<=leadHit.y0+leadHit.h}
function leadNoteAt(p){return leadHit?(leadHit.rects.find(r=>p.x>=r.x-2&&p.x<=r.x+r.w+2&&p.y>=r.y-2&&p.y<=r.y+r.h+2)||null):null}
const onEdge=(r,x)=>r.w>=10&&x>=r.x+r.w-6;
function roomAfter(list,skip,step){
  let room=leadHit.steps-step;
  list.forEach((n,i)=>{if(i!==skip&&n.step>step)room=Math.min(room,n.step-step)});
  return Math.max(1,room);
}
canvas.addEventListener('pointerdown',e=>{
  if(e.button)return;
  const sec=song[viewSection],p=rollXY(e);if(!sec||!inLeadLane(p))return;
  if(!sec.layers.lead){setStatus('This section does not play the lead. Switch it on under Plays in the inspector.');return}
  const tr=sec.transpose||0,hit=leadNoteAt(p);
  if(hit){
    const list=leadEditList(sec),idx=list.findIndex(n=>n.step===hit.step&&n.midi===hit.midi-tr);
    if(idx<0)return;
    if(onEdge(hit,p.x)){
      e.preventDefault();try{canvas.setPointerCapture(e.pointerId)}catch(err){}
      drag={sec,list,idx,tr,startX:p.x,step:hit.step,dur:list[idx].dur,newDur:list[idx].dur};
      return;
    }
    list.splice(idx,1);commitLead(sec,list,'Note removed');return;
  }
  const row=Math.max(0,Math.min(leadHit.pitches.length-1,leadHit.pitches.length-1-Math.floor((p.y-leadHit.y0)/leadHit.rowH)));
  const step=Math.max(0,Math.min(leadHit.steps-1,Math.floor((p.x-leadHit.gx)/leadHit.sw)));
  const dur=Math.max(1,Math.min(2,leadHit.steps-step)),midi=leadHit.pitches[row].midi;
  // the lead is one line: a note already sounding is trimmed, notes inside the new one give way
  const list=leadEditList(sec).map(n=>n.step<step&&n.step+n.dur>step?Object.assign({},n,{dur:step-n.step}):n).filter(n=>n.step<step||n.step>=step+dur);
  list.push({step,dur,midi:midi-tr,vel:0.85});
  commitLead(sec,list,Z.NOTE_NAMES[midi%12]+' added at bar '+(Math.floor(step/16)+1)+'.'+(Math.floor((step%16)/4)+1));
});
canvas.addEventListener('pointermove',e=>{
  const p=rollXY(e);
  if(drag){
    if(!leadHit)return;
    const room=roomAfter(drag.list,drag.idx,drag.step);
    const dur=Math.max(1,Math.min(room,drag.dur+Math.round((p.x-drag.startX)/leadHit.sw)));
    drag.newDur=dur;
    const midi=drag.list[drag.idx].midi+drag.tr;let idx=0,bd=1e9;
    leadHit.pitches.forEach((q,i)=>{const d=Math.abs(q.midi-midi);if(d<bd){bd=d;idx=i}});
    dragPreview={x:leadHit.gx+drag.step*leadHit.sw+0.5,y:leadHit.y0+leadHit.h-(idx+1)*leadHit.rowH,w:Math.max(2,dur*leadHit.sw-1.2),h:Math.max(2,leadHit.rowH-1.4)};
    return;
  }
  const sec=song[viewSection];
  if(!inLeadLane(p)||!sec||!sec.layers.lead){canvas.style.cursor='';return}
  const hit=leadNoteAt(p);canvas.style.cursor=hit?(onEdge(hit,p.x)?'ew-resize':'pointer'):'crosshair';
});
function endDrag(){
  if(!drag)return;const d=drag;drag=null;dragPreview=null;
  d.list[d.idx].dur=d.newDur;commitLead(d.sec,d.list,'Note is '+d.newDur+' step'+(d.newDur===1?'':'s')+' long');
}
canvas.addEventListener('pointerup',endDrag);
canvas.addEventListener('pointercancel',()=>{drag=null;dragPreview=null});
canvas.addEventListener('pointerleave',()=>{if(!drag)canvas.style.cursor=''});
// live accessors (Object.assign would copy the getter's value once, so define them as properties)
Object.defineProperties(ZUI,{song:{get:()=>song},viewSection:{get:()=>viewSection,set:v=>{viewSection=v}}});
Object.assign(ZUI,{state,rec,COLORS,MOODS,PATCHES,FX,FXKEYS,SEC_TYPES,fill,setStatus,snapshot,restore,persist,undoStep,redoStep,code,newTrack,dice,loadCode,regenerate,rebuild,cfg,renderArr,renderProg,renderInsp,buildRoll,drawFrame,selectSection,syncControls,defaultSections});
})();
