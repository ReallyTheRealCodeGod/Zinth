(()=>{
'use strict';
const Z=window.Z,E=Z.engine,$=id=>document.getElementById(id),ZUI=window.ZUI=window.ZUI||{};
// these live in the second UI script; delegate through the shared ZUI namespace
const renderKeys=()=>ZUI.renderKeys(),renderPads=()=>ZUI.renderPads(),renderMixer=()=>ZUI.renderMixer(),renderFavs=()=>ZUI.renderFavs(),renderSound=()=>ZUI.renderSound(),renderGrid=()=>ZUI.renderGrid(),syncLabels=()=>ZUI.syncLabels();
const COLORS={lead:'#f5a524',arp:'#4fd1c5',chords:'#a78bfa',bass:'#f26d85',drums:'#d9c9a3'};
// the note lanes you can draw in: their edits live in state[EDITS[L]][part], the format a recording uses
const EDITS={lead:'leadEdits',arp:'arpEdits',bass:'bassEdits'},LANE_ROW={lead:0,arp:1,bass:3},NEW_DUR={lead:2,arp:2,bass:4};
const MOODS={
  chill:   {label:'Chill',       scales:['dorian','pentMajor','mixolydian'],bpm:[80,96],  energy:45,swing:28,sevenths:true, gate:0.7,kit:'Breaks',arp:{modes:['updown','up','pattern'],octaves:2,gate:75},
            sound:{lead:{vibrato:40,vibRate:40,wave:'triangle',cutoff:58,reso:15,attack:8,release:45,spread:15,delay:40,reverb:40},arp:{wave:'sine',cutoff:60,level:45,delay:50,reverb:35},chords:{wave:'super',cutoff:38,attack:50,release:65,reverb:55,level:50},bass:{glide:25,wave:'saw',cutoff:32,level:80},drums:{level:60,reverb:25,pump:25}}},
  dreamy:  {label:'Dreamy',      scales:['lydian','major','pentMajor','lydDom'],bpm:[84,100],energy:35,swing:8, sevenths:true, gate:0.9,kit:'Lo-fi',arp:{modes:['up','updown','chord'],octaves:3,gate:90},
            sound:{lead:{vibrato:55,vibRate:32,wave:'sine',cutoff:55,reso:10,attack:22,release:70,spread:30,delay:55,reverb:60},arp:{wave:'triangle',cutoff:50,level:45,delay:55,reverb:45},chords:{wave:'super',cutoff:35,attack:70,release:80,reverb:70,level:55},bass:{glide:35,wave:'sine',cutoff:40,level:75},drums:{level:45,reverb:35,pump:20}}},
  driving: {label:'Driving',     scales:['minor','dorian','pentMinor'],bpm:[124,138],energy:80,swing:0, sevenths:false,gate:0.55,kit:'909',arp:{modes:['up','pattern','down'],octaves:2,gate:45},
            sound:{lead:{vibrato:18,vibRate:60,wave:'saw',cutoff:70,reso:35,attack:1,release:25,spread:25,delay:30,reverb:20},arp:{wave:'square',cutoff:62,level:60,delay:35,reverb:20},chords:{wave:'saw',cutoff:45,attack:20,release:40,level:40,reverb:40},bass:{glide:8,wave:'square',cutoff:45,level:85},drums:{level:85,reverb:15,pump:60}}},
  dark:    {label:'Dark',        scales:['phrygian','harmMinor','hirajoshi','insen','phrygDom','hungMinor'],bpm:[92,112],energy:60,swing:6,sevenths:false,gate:0.6,kit:'Trap',arp:{modes:['down','random','pattern'],octaves:2,gate:55},
            sound:{lead:{vibrato:35,vibRate:45,wave:'saw',cutoff:48,reso:45,attack:2,release:40,spread:35,delay:45,reverb:45},arp:{wave:'saw',cutoff:42,level:50,delay:50,reverb:35},chords:{wave:'super',cutoff:30,attack:60,release:70,level:50,reverb:65},bass:{glide:30,wave:'saw',cutoff:30,level:85},drums:{level:75,reverb:30,pump:45}}},
  retro:   {label:'Retro',       scales:['major','mixolydian','pentMajor'],bpm:[110,124],energy:65,swing:0,sevenths:false,gate:0.5,kit:'808',arp:{modes:['pattern','up'],octaves:1,gate:40},
            sound:{lead:{vibrato:0,vibRate:60,wave:'square',cutoff:80,reso:5,attack:0,release:15,spread:0,delay:25,reverb:12},arp:{wave:'square',cutoff:85,level:55,spread:0,delay:30,reverb:10},chords:{wave:'triangle',cutoff:70,attack:5,release:30,level:45,spread:0,reverb:20},bass:{glide:0,wave:'triangle',cutoff:60,level:85,spread:0},drums:{level:70,reverb:8,pump:15}}},
  uplift:  {label:'Uplifting',   scales:['major','lydian'],bpm:[126,134],energy:75,swing:0,sevenths:false,gate:0.6,kit:'House',arp:{modes:['updown','up','chord'],octaves:3,gate:60},
            sound:{lead:{vibrato:25,vibRate:55,wave:'super',cutoff:68,reso:20,attack:4,release:40,spread:45,delay:40,reverb:40},arp:{wave:'saw',cutoff:60,level:55,delay:45,reverb:30},chords:{wave:'super',cutoff:50,attack:30,release:60,level:55,spread:55,reverb:55},bass:{glide:10,wave:'saw',cutoff:40,level:85},drums:{level:80,reverb:20,pump:65}}},
  odd:     {label:'Otherworldly',scales:['wholeTone','lydian','insen','dorb2','neapMinor'],bpm:[70,100],energy:40,swing:10,sevenths:true,gate:0.85,kit:'Lo-fi',arp:{modes:['random','chord','updown'],octaves:3,gate:80},
            sound:{lead:{vibrato:60,vibRate:25,wave:'sine',cutoff:60,reso:30,attack:15,release:80,spread:40,delay:60,reverb:70},arp:{wave:'triangle',cutoff:55,level:50,delay:60,reverb:50},chords:{wave:'super',cutoff:32,attack:80,release:90,level:50,reverb:80},bass:{glide:40,wave:'sine',cutoff:35,level:70},drums:{level:35,reverb:50,pump:20}}},
};
// how the arp walks the chord it is playing, in the order the Sound panel offers them, and what each one
// does in a sentence — the select shows the name, the status line says the rest
const ARP_MODE_NAMES=[['auto','Auto · let the roll pick'],['up','Up'],['down','Down'],['updown','Up-down'],
  ['random','Random'],['chord','Chord · block stabs'],['pattern','Pattern · a repeating figure']];
const ARP_SAYS={auto:'every roll of the arp deals it a new figure',up:'runs up the chord and starts again at the bottom',
  down:'runs down the chord and starts again at the top',updown:'runs up the chord and turns around at the top',
  random:'picks a tone of the chord each step, never the same figure twice',
  chord:'plays the whole chord at once, as block stabs at half the speed of a run',
  pattern:'repeats one little figure over the chord, the way an old arpeggiator does'};
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
// A section can also sweep the whole mix through a master filter: 'up' opens it over the section,
// 'down' closes it over the last bar. And it can fade: 'in' rises from silence over its first two bars,
// 'out' falls to silence over its last two. The types that want either by ear get it from the start.
const SEC_TYPES={
  'Intro':     {part:'v',energy:-15,bars:8,layers:{lead:0,arp:1,chords:1,bass:0,drums:'lite'},sweep:'up'},
  'Verse':     {part:'v',energy:-5, bars:8,layers:{lead:1,arp:1,chords:1,bass:1,drums:1}},
  'Pre-chorus':{part:'v',energy:5,  bars:4,layers:{lead:0,arp:1,chords:1,bass:1,drums:1},sweep:'up'},
  'Chorus':    {part:'c',energy:12, bars:8,layers:{lead:1,arp:1,chords:1,bass:1,drums:1},hook:true},
  'Bridge':    {part:'c',energy:-8, bars:8,layers:{lead:1,arp:0,chords:1,bass:1,drums:'lite'}},
  'Break':     {part:'c',energy:-10,bars:4,layers:{lead:1,arp:0,chords:1,bass:0,drums:0},hook:true,sweep:'up'},
  'Drop':      {part:'c',energy:20, bars:8,layers:{lead:1,arp:1,chords:1,bass:1,drums:1},hook:true,double:true},
  'Outro':     {part:'v',energy:-20,bars:8,layers:{lead:0,arp:1,chords:1,bass:0,drums:'lite'},sweep:'down',fade:'out'},
};
const SWEEP_MARK={up:'↗',down:'↘'};
const SWEEP_SAYS={none:'plays open, no sweep',up:'starts dark and opens up over the whole section',down:'plays open and closes down over its last bar'};
const sweepOf=sec=>Z.SWEEP_MODES.indexOf(sec&&sec.sweep)>0?sec.sweep:'none';
const FADE_MARK={in:'◢',out:'◣'};
const FADE_SAYS={none:'plays at full level, no fade',in:'rises from silence over its first two bars',out:'falls away to silence over its last two bars'};
const fadeOf=sec=>Z.FADE_MODES.indexOf(sec&&sec.fade)>0?sec.fade:'none';
const DEFAULT_FORM=['Intro','Verse','Chorus','Verse','Chorus','Break','Drop','Outro'];
const FX=[['lp','Z','Low sweep'],['hp','X','High sweep'],['gate8','C','Gate ⅛'],['gate16','V','Gate ⅟₁₆'],['crush','B','Crush'],['throw','N','Delay throw'],['wash','M','Wash']];
const FXKEYS={z:'lp',x:'hp',c:'gate8',v:'gate16',b:'crush',n:'throw',m:'wash'};

const state={
  seeds:{chords:'',lead:'',arp:'',bass:'',drums:''},locks:{chords:false,lead:false,arp:false,bass:false,drums:false},
  mood:'chill',root:2,scale:'dorian',bpm:92,energy:45,swing:28,evolve:true,sevenths:true,gate:0.7,warmth:Z.WARMTH.dflt,arp:Z.normArp(null),
  prog:{v:null,c:null},drumEdits:{v:null,c:null},leadEdits:{v:null,c:null},arpEdits:{v:null,c:null},bassEdits:{v:null,c:null},kit:'808',transitions:true,sections:[],sel:0,loop:0,layer:'lead',recTarget:'lead',
};
const rec={armed:false};
let song=[],viewSection=0,rollCache=null,statusTimer=null,exporting=false,secId=1,hits={},drag=null,dragPreview=null;
function newSection(type){const t=SEC_TYPES[type]||SEC_TYPES.Verse;return {id:secId++,type,part:t.part,bars:t.bars,energy:t.energy,transpose:0,layers:Object.assign({},t.layers),hook:!!t.hook,double:!!t.double,sweep:t.sweep||'none',fade:t.fade||'none'}}
function defaultSections(){return DEFAULT_FORM.map(newSection)}

/* ---------- populate controls ---------- */
Z.NOTE_NAMES.forEach((n,i)=>{const o=document.createElement('option');o.value=i;o.textContent=n;$('root').appendChild(o)});
// The scale menu is grouped — the modes you know, the exotic ones, the five-note ones — so a longer list
// stays a menu you can read. Every scale carries a one-line hint, and it becomes that option's tooltip.
{
  const bySel={};
  for(const k in Z.SCALES){const g=Z.SCALES[k].group||'Modes';(bySel[g]=bySel[g]||[]).push(k)}
  const groups=Z.SCALE_GROUPS.filter(g=>bySel[g]).concat(Object.keys(bySel).filter(g=>!Z.SCALE_GROUPS.includes(g)));
  for(const g of groups){
    const og=document.createElement('optgroup');og.label=g;
    for(const k of bySel[g]){const o=document.createElement('option');o.value=k;o.textContent=Z.SCALES[k].name;if(Z.SCALES[k].hint)o.title=Z.SCALES[k].hint;og.appendChild(o)}
    $('scale').appendChild(og);
  }
}
for(const k in MOODS){const b=document.createElement('button');b.className='chip';b.textContent=MOODS[k].label;b.dataset.mood=k;b.addEventListener('click',()=>{state.mood=k;newTrack(true)});$('moods').appendChild(b)}
for(const k in SEC_TYPES){const o=document.createElement('option');o.value=k;o.textContent=k;$('secType').appendChild(o)}
for(const k in PATCHES){const o=document.createElement('option');o.value=k;o.textContent=k;$('patch').appendChild(o)}
ARP_MODE_NAMES.forEach(([v,label])=>{const o=document.createElement('option');o.value=v;o.textContent=label;$('arpMode').appendChild(o)});
{const o=document.createElement('option');o.value='';o.textContent='custom';$('patch').appendChild(o)}
for(const k in Z.KITS){const o=document.createElement('option');o.value=k;o.textContent=k;$('kit').appendChild(o)}
Z.LAYERS.forEach(L=>{
  const t=document.createElement('button');t.className='tab';t.setAttribute('role','tab');t.textContent=L;t.style.setProperty('--c',COLORS[L]);t.addEventListener('click',()=>{state.layer=L;renderSound()});$('tabs').appendChild(t);
  const ln=document.createElement('div');ln.className='lane';const b=document.createElement('button');b.dataset.l=L;b.textContent=L;b.style.setProperty('--c',COLORS[L]);b.title='Mute / unmute '+L;
  b.addEventListener('click',()=>{E.setParam(L,'mute',!E.params[L].mute);renderMixer();persist()});ln.appendChild(b);
  if(EDITS[L]){const rv=document.createElement('button');rv.className='rev';rv.id='rev-'+L;rv.textContent='↺';rv.hidden=true;rv.style.setProperty('--c',COLORS[L]);
    rv.title='These '+L+' notes are yours. Bring the generated '+L+' back for this part.';rv.setAttribute('aria-label','Revert the '+L+' to the generated one');
    rv.addEventListener('click',()=>clearEdits(L));ln.appendChild(rv)}
  $('lanes').appendChild(ln);
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
    warmth:s.warmth===undefined?Z.WARMTH.dflt:Z.warmthAmt(s.warmth)*100,arp:Z.normArp(s.arp),
    prog:s.prog||{v:null,c:null},drumEdits:s.drumEdits||{v:null,c:null},leadEdits:s.leadEdits||{v:null,c:null},arpEdits:s.arpEdits||{v:null,c:null},bassEdits:s.bassEdits||{v:null,c:null},kit:Z.KITS[s.kit]?s.kit:'808',transitions:s.transitions!==false,sections:(s.sections&&s.sections.length?s.sections:defaultSections()),sel:s.sel||0,layer:s.layer||'lead',recTarget:EDITS[s.recTarget]?s.recTarget:'lead'});
  state.sections.forEach(sec=>{sec.id=secId++;if(!SEC_TYPES[sec.type])sec.type='Verse';sec.sweep=sweepOf(sec);sec.fade=fadeOf(sec)});
  // a project saved before a sound setting existed simply does not carry it: fill from the defaults, so an
  // old song opens sounding like a fresh one rather than inheriting whatever this session happened to have
  if(p.params)for(const L of Z.LAYERS){const src=Object.assign({},Z.DEFAULTS[L],p.params[L]||{});for(const k in src)E.setParam(L,k,src[k])}
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
  return [same?S.chords:Z.LAYERS.map(L=>S[L]).join('~'),state.mood,state.root,state.scale,state.bpm,state.energy,state.swing,Z.progCode(state.prog.v)||'x',Z.progCode(state.prog.c)||'x'].join('.');
}
function parseCode(str){
  const p=String(str||'').trim().split('.');const raw=(p[0]||'').toUpperCase().split('~').map(s=>s.replace(/[^A-Z0-9]/g,'').slice(0,10)).filter(Boolean);
  if(!raw.length)return null;const seeds={};Z.LAYERS.forEach((L,i)=>seeds[L]=raw.length===5?raw[i]:raw[0]);
  if(p.length<8)return {seeds};
  const prog=x=>Z.parseProgCode(x);
  return {seeds,mood:MOODS[p[1]]?p[1]:state.mood,root:clampN(p[2],0,11,null),scale:Z.SCALES[p[3]]?p[3]:null,bpm:clampN(p[4],60,180,state.bpm),energy:clampN(p[5],0,100,state.energy),swing:clampN(p[6],0,60,state.swing),progV:prog(p[7]),progC:prog(p[8])};
}

/* ---------- generation ---------- */
function cfg(){return {root:state.root,scale:state.scale,energy:state.energy,evolve:state.evolve,sevenths:state.sevenths,gate:state.gate,arp:state.arp}}
function applyMood(seed){
  const m=MOODS[state.mood],r=new Z.Rng(seed+':mood:'+state.mood);
  state.root=r.int(12);state.scale=r.pick(m.scales);state.bpm=Math.round(r.range(m.bpm[0],m.bpm[1]));
  state.energy=m.energy;state.swing=m.swing;state.sevenths=m.sevenths;state.gate=m.gate;state.kit=m.kit;E.kit=m.kit;
  // a mood deals the arp a figure that suits it — the same roll that picks the key and the tempo picks
  // this one — unless the arp is locked, in which case what you kept stays exactly as it is
  if(m.arp&&!state.locks.arp)state.arp=Z.normArp({mode:r.pick(m.arp.modes),octaves:m.arp.octaves,gate:m.arp.gate});
  for(const L in m.sound)for(const k in m.sound[L])E.setParam(L,k,m.sound[L][k]);
}
function syncControls(){
  $('root').value=state.root;$('scale').value=state.scale;$('bpm').value=state.bpm;$('energy').value=state.energy;$('swing').value=state.swing;
  $('warmth').value=state.warmth;E.setWarmth(state.warmth);
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
  for(const L in EDITS)if(!state.locks[L])state[EDITS[L]]={v:null,c:null};
  if(!state.sections.length)state.sections=defaultSections();
  state.loop=0;syncControls();regenerate();
  setStatus(unlocked.length===5?'New track':'Rerolled '+unlocked.join(', '));
}
function dice(L){state.seeds[L]=Z.randomSeed();if(L==='chords')state.prog={v:null,c:null};if(L==='drums')state.drumEdits={v:null,c:null};if(EDITS[L])state[EDITS[L]]={v:null,c:null};state.locks[L]=false;regenerate();setStatus('New '+L)}
function loadCode(){
  const c=parseCode($('seed').value);if(!c){setStatus('Paste a track code first');return}
  state.seeds=c.seeds;state.loop=0;state.prog={v:null,c:null};state.drumEdits={v:null,c:null};
  if(c.mood!==undefined){state.mood=c.mood;applyMood(c.seeds.chords);if(c.root!==null)state.root=c.root;if(c.scale)state.scale=c.scale;state.bpm=c.bpm;state.energy=c.energy;state.swing=c.swing;state.prog={v:c.progV,c:c.progC}}
  else applyMood(c.seeds.chords);
  syncControls();regenerate();setStatus('Loaded '+c.seeds.chords);
}
function sectionCfg(sec){
  // while recording is armed, the layer you record into falls silent until it holds notes of yours,
  // so you always play over a clean backing — lead, arp or bass alike
  const evs=L=>state[EDITS[L]][sec.part]||(rec.armed&&state.recTarget===L?[]:null);
  return Object.assign(cfg(),{root:(state.root+(sec.transpose||0)+120)%12,transpose:sec.transpose||0,energy:state.energy+sec.energy,leadEnergy:state.energy+(sec.part==='c'?10:0),hook:!!sec.hook,prog:state.prog[sec.part],drumPattern:state.drumEdits[sec.part],leadEvents:evs('lead'),arpEvents:evs('arp'),bassEvents:evs('bass')});
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
  $('keyName').title=sc.hint||sc.name;
  $('scale').title='The scale everything is locked to'+(sc.hint?' · '+sc.name+': '+sc.hint:'');
  $('scaleNotes').innerHTML=sc.steps.map((s,i)=>'<span class="note'+(i===0?' root':'')+'">'+Z.NOTE_NAMES[(state.root+s)%12]+'</span>').join('');
  $('kbHint').textContent='Everything below is locked to '+Z.NOTE_NAMES[state.root]+' '+sc.name+': the chord pads and the letter-key notes all fit the track. Mute the Chords lane to play your own progression over it.';
}
function renderProg(){
  const sec=song[viewSection];if(!sec)return;
  $('progLabel').textContent='Chords · '+(sec.part==='v'?'A verse':'B chorus')+(sec.transpose?' · '+Z.NOTE_NAMES[(state.root+sec.transpose+120)%12]+' ('+(sec.transpose>0?'+':'')+sec.transpose+')':'');
  $('progTag').hidden=!state.prog[sec.part];
  $('prog').innerHTML=sec.track.chords.map((c,i)=>'<button class="chord'+(i===chordEd?' edit':'')+'" data-i="'+i+'" aria-label="Chord '+(i+1)+', '+c.name+', bars '+(c.bar0+1)+' to '+(c.bar0+c.bars)+'" title="Click to change this chord: its degree, its seventh, its voicing and how many bars it lasts"><span class="rn">'+c.roman+'</span><span class="cn">'+c.name+'</span><span class="bars">bars '+(c.bar0+1)+'–'+(c.bar0+c.bars)+'</span></button>').join('');
  renderChordEdit();
}
/* ---------- chord editing on the chord cards ---------- */
// The cards are the progression. Click one to change its degree, its seventh, its voicing or how many bars
// it lasts. The first edit freezes the generated chords into state.prog[part] as objects; the plain degree
// arrays a chord-box sketch produces keep working and are upgraded in place the moment you touch a card.
let chordEd=-1;
const INV_NAMES=['root','1st','2nd','3rd'];
const partName=p=>p==='v'?'A verse':'B chorus';
const chordsOf=()=>{const sec=song[viewSection];return sec?sec.track.chords:[]};
function progList(sec){
  const p=state.prog[sec.part];
  if(p&&p.length)return p.map(x=>(x&&typeof x==='object')?Object.assign({},x):{d:x});
  return sec.track.chords.map(c=>({d:c.degree,bars:c.bars}));
}
function editProg(fn,msg){
  const sec=song[viewSection];if(!sec||chordEd<0)return;
  const list=progList(sec);if(!list[chordEd]||fn(list)===false)return;
  state.prog[sec.part]=list.slice(0,Z.BARS);regenerate();
  // store exactly what you hear: a chord pushed past bar 8 is gone, a clipped one keeps the bars it got
  const now=song[viewSection];
  if(now)state.prog[now.part]=now.track.chords.map((c,i)=>{const e=Object.assign({},list[i]||{});e.d=c.degree;e.bars=c.bars;return e});
  chordEd=Math.min(chordEd,chordsOf().length-1);renderProg();persist();
  if(msg)setStatus(msg);
}
// re-rendering replaces the cards and the degree buttons, so hand the keyboard back what it was on
function refocus(el){if(el)try{el.focus({preventScroll:true})}catch(e){}}
function focusChordCard(){refocus($('prog').querySelector('.chord.edit'))}
function openChordEdit(i){
  chordEd=chordEd===i?-1:i;renderProg();focusChordCard();
  const c=chordsOf()[chordEd];
  if(c)setStatus('Chord '+(chordEd+1)+' · '+c.name+': change its degree, its seventh, its voicing or how long it lasts. ← → step between chords, Esc closes.');
}
function closeChordEdit(){if(chordEd<0)return false;chordEd=-1;renderProg();return true}
function nudgeChordEdit(d){const n=chordsOf().length;if(chordEd<0||!n)return false;chordEd=(chordEd+d+n)%n;renderProg();focusChordCard();return true}
function renderChordEdit(){
  const box=$('chordEdit'),list=chordsOf(),sec=song[viewSection];
  if(!sec||chordEd<0||chordEd>=list.length){box.hidden=true;return}
  box.hidden=false;
  const c=list[chordEd],cs=Z.chordScaleOf(state.scale),entry=progList(sec)[chordEd]||{};
  $('ceLabel').textContent=partName(sec.part)+' · chord '+(chordEd+1)+' of '+list.length+' · '+c.name+' · bars '+(c.bar0+1)+'–'+(c.bar0+c.bars);
  const had=document.activeElement,keep=had&&had.parentElement===$('ceDeg')?had.dataset.v:null;
  $('ceDeg').innerHTML=cs.steps.map((_,d)=>{
    const rn=Z.romanFor(d,Z.chordInfo(Z.buildChord(cs.steps,d,3,60)).quality,3),on=d===c.degree;
    return '<button data-v="'+d+'"'+(on?' class="on"':'')+' aria-pressed="'+on+'" title="Degree '+(d+1)+' of the key">'+rn+'</button>';
  }).join('');
  if(keep!=null)refocus($('ceDeg').querySelector('[data-v="'+keep+'"]'));
  $('ceBars').querySelectorAll('button').forEach(b=>{const on=+b.dataset.v===c.bars;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  $('ceInv').querySelectorAll('button').forEach(b=>{
    b.hidden=b.dataset.v==='3'&&c.notes.length<4;
    const on=b.dataset.v==='a'?entry.inv===undefined:(entry.inv!==undefined&&+b.dataset.v===c.inv);
    b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);
  });
  $('ce7').classList.toggle('on',!!c.seventh);$('ce7').setAttribute('aria-pressed',!!c.seventh);
  $('ceDel').disabled=list.length<2;$('ceReset').disabled=!state.prog[sec.part];
}
$('prog').addEventListener('click',e=>{const b=e.target.closest('.chord');if(b)openChordEdit(+b.dataset.i)});
$('ceDeg').addEventListener('click',e=>{const b=e.target.closest('button');if(b)editProg(l=>{l[chordEd].d=+b.dataset.v},'Chord '+(chordEd+1)+' is now '+b.textContent)});
$('ceBars').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const n=+b.dataset.v;
  editProg(l=>{l[chordEd].bars=n},'Chord '+(chordEd+1)+' lasts '+n+' bar'+(n===1?'':'s')+' · the progression always fills 8 bars, so what no longer fits steps aside')});
$('ceInv').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const v=b.dataset.v;
  editProg(l=>{if(v==='a')delete l[chordEd].inv;else l[chordEd].inv=+v},
    v==='a'?'Chord '+(chordEd+1)+' follows the voice leading again':'Chord '+(chordEd+1)+' sits in '+INV_NAMES[+v]+' position')});
$('ce7').addEventListener('click',()=>{const c=chordsOf()[chordEd];if(!c)return;const on=!c.seventh;
  editProg(l=>{l[chordEd].seventh=on},'Chord '+(chordEd+1)+(on?' takes its seventh':' is a plain triad'))});
$('ceSplit').addEventListener('click',()=>{
  editProg(l=>{const bars=l[chordEd].bars||2,half=Math.max(1,Math.floor(bars/2));
    l[chordEd].bars=Math.max(1,bars-half);l.splice(chordEd+1,0,Object.assign({},l[chordEd],{bars:half}))},
    'Chord split in two · pick a degree for the new half');
});
$('ceDel').addEventListener('click',()=>{if(chordsOf().length<2)return;editProg(l=>{l.splice(chordEd,1)},'Chord removed · the last chord stretches to fill the 8 bars')});
$('ceReset').addEventListener('click',()=>{
  const sec=song[viewSection];if(!sec||!state.prog[sec.part])return;
  state.prog[sec.part]=null;regenerate();chordEd=Math.min(chordEd,chordsOf().length-1);renderProg();
  setStatus('Generated chords are back for the '+partName(sec.part)+' sections');
});
$('ceClose').addEventListener('click',closeChordEdit);
function renderArr(){
  const cur=E.playing?E.section:-1;
  $('arr').innerHTML=song.map((s,i)=>{
    const sw=sweepOf(s),fd=fadeOf(s);
    const tip='Click to select, double-click to play from here'+(SWEEP_MARK[sw]?' · filter sweep: the mix '+SWEEP_SAYS[sw]:'')+(FADE_MARK[fd]?' · fade: the mix '+FADE_SAYS[fd]:'');
    return '<button class="sec'+(i===state.sel?' sel':'')+(i===cur?' now':'')+'" data-i="'+i+'" title="'+tip+'"><span class="sn">'+s.type+'</span><span class="sb">'+s.bars+'</span><span class="dots">'+
      Z.LAYERS.map(L=>'<i style="--c:'+COLORS[L]+'" class="'+(s.layers[L]==='lite'?'lite':s.layers[L]?'on':'')+'"></i>').join('')+
      (SWEEP_MARK[sw]?'<b class="sw">'+SWEEP_MARK[sw]+'</b>':'')+(FADE_MARK[fd]?'<b class="fd">'+FADE_MARK[fd]+'</b>':'')+'</span>'+
      (s.transpose?'<span class="tp">'+(s.transpose>0?'+':'')+s.transpose+'</span>':'')+'</button>';
  }).join('');
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
  $('secSweep').querySelectorAll('button').forEach(b=>{const on=b.dataset.v===sweepOf(sec);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  $('secFade').querySelectorAll('button').forEach(b=>{const on=b.dataset.v===fadeOf(sec);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  $('secLayers').querySelectorAll('button').forEach(b=>{const v=sec.layers[b.dataset.l];b.className=v==='lite'?'lite':v?'on':'';b.textContent=b.dataset.l+(v==='lite'?' ·lite':'')});
  $('secLeft').disabled=state.sel===0;$('secRight').disabled=state.sel>=state.sections.length-1;$('secDel').disabled=state.sections.length<=1;
}
function editSec(fn){const sec=state.sections[state.sel];if(!sec)return;fn(sec);regenerate()}
$('secType').addEventListener('change',e=>editSec(sec=>{const t=SEC_TYPES[e.target.value];sec.type=e.target.value;sec.part=t.part;sec.bars=t.bars;sec.energy=t.energy;sec.layers=Object.assign({},t.layers);sec.hook=!!t.hook;sec.double=!!t.double;sec.sweep=t.sweep||'none';sec.fade=t.fade||'none'}));
$('secPart').addEventListener('click',e=>{const b=e.target.closest('button');if(b)editSec(sec=>{sec.part=b.dataset.v;sec.hook=sec.part==='c'})});
$('secBars').addEventListener('click',e=>{const b=e.target.closest('button');if(b)editSec(sec=>sec.bars=+b.dataset.v)});
$('secSweep').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  const sec=state.sections[state.sel];if(!sec)return;editSec(s=>s.sweep=b.dataset.v);
  setStatus(sec.type+' '+SWEEP_SAYS[sweepOf(sec)]+(sweepOf(sec)==='none'?'':' · you hear it in playback and in the WAV export'))});
$('secFade').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  const sec=state.sections[state.sel];if(!sec)return;editSec(s=>s.fade=b.dataset.v);
  setStatus(sec.type+' '+FADE_SAYS[fadeOf(sec)]+(fadeOf(sec)==='none'?'':' · you hear it in playback, in the WAV export and as volume in the MIDI'))});
$('secTrans').addEventListener('change',e=>editSec(sec=>sec.transpose=+e.target.value));
$('secLayers').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;editSec(sec=>{const L=b.dataset.l,v=sec.layers[L];sec.layers[L]=L==='drums'?(v===1||v===true?'lite':v==='lite'?0:1):(v?0:1)})});
$('secLeft').addEventListener('click',()=>{const i=state.sel;if(i>0){[state.sections[i-1],state.sections[i]]=[state.sections[i],state.sections[i-1]];state.sel=i-1;viewSection=i-1;regenerate()}});
$('secRight').addEventListener('click',()=>{const i=state.sel;if(i<state.sections.length-1){[state.sections[i+1],state.sections[i]]=[state.sections[i],state.sections[i+1]];state.sel=i+1;viewSection=i+1;regenerate()}});
$('secDup').addEventListener('click',()=>{const s=state.sections[state.sel];const c=JSON.parse(JSON.stringify(s));c.id=secId++;state.sections.splice(state.sel+1,0,c);state.sel++;viewSection=state.sel;regenerate()});
$('secDel').addEventListener('click',()=>{if(state.sections.length<=1)return;state.sections.splice(state.sel,1);state.sel=Math.min(state.sel,state.sections.length-1);viewSection=state.sel;if(E.playing&&E.section>=state.sections.length)E.jump(0);regenerate()});
$('addSec').addEventListener('click',()=>{const s=newSection('Verse');state.sections.splice(state.sel+1,0,s);state.sel++;viewSection=state.sel;regenerate();setStatus('Section added. Pick its type in the inspector.')});

const canvas=$('rollCanvas'),ctx2=canvas.getContext('2d');
let rollBars=8;
// an editable lane is one row per pitch of the key, in the register that layer's generator writes in
function lanePitches(L,sec){
  const root=(state.root+(sec.transpose||0)+120)%12;
  if(L==='lead'){const lo=64+(root>=6?-6:0);return Z.scalePitches({root,scale:state.scale},lo,lo+22)}
  const scale=Z.SCALES[state.scale].chord||state.scale; // arp and bass follow the chord scale, as their generators do
  if(L==='bass')return Z.scalePitches({root,scale},Z.BASS_LO,Z.BASS_HI);
  const r=Z.arpRange(root);return Z.scalePitches({root,scale},r[0],r[1]);
}
// what a stored note sounds like in this section: the key shift, and the bass folded into its register
const soundOf=(L,midi,tr)=>{const m=midi+tr;return L==='bass'?Z.bassRegister(m):m};
function syncLanes(){
  const sec=song[viewSection];
  for(const L in EDITS){const b=$('rev-'+L);if(b)b.hidden=!(sec&&state[EDITS[L]][sec.part])}
}
function buildRoll(){
  const sec=song[viewSection];hits={};if(!sec)return;const track=sec.track,lay=sec.layers;rollBars=Math.min(8,sec.bars);
  const W=$('roll').clientWidth||1000,H=420,dpr=Math.min(2,window.devicePixelRatio||1);
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
  // the editable lanes: every note sits on its own pitch row, so a click means a pitch
  const noteRows=(L,evs)=>{
    const y0=LANE_ROW[L]*laneH+14,h=laneH-22,pitches=lanePitches(L,sec),rowH=h/pitches.length,rects=[];
    hits[L]={gx,sw,steps,y0,h,pitches,rowH,rects};
    if(!lay[L]){rest(y0+h/2+4);return}
    evs.filter(e=>e.step<steps).forEach(e=>{
      let idx=0,bd=1e9;pitches.forEach((p,i)=>{const d=Math.abs(p.midi-e.midi);if(d<bd){bd=d;idx=i}});
      const x=gx+e.step*sw+0.5,y=y0+h-(idx+1)*rowH,w=Math.max(2,Math.min(e.dur,steps-e.step)*sw-1.2),nh=Math.max(2,rowH-1.4);
      c.globalAlpha=0.5+e.vel*0.5;c.fillStyle=COLORS[L];c.fillRect(x,y,w,nh);
      rects.push({step:e.step,midi:e.midi,x,y,w,h:nh});
    });
    c.globalAlpha=1;
  };
  noteRows('lead',track.lead);noteRows('arp',track.arp);noteRows('bass',track.bass);
  lane(2,track.chordEvs,e=>e.notes);
  const rows={kick:4,snare:3,clap:2,perc:1,ohat:0,hat:0},y0=4*laneH+12,rh=(laneH-20)/5;
  if(!lay.drums)rest(y0+rh*2+4);
  else track.drums.forEach(d=>{
    if(d.step>=steps)return;if(lay.drums==='lite'&&(d.kind==='snare'||d.kind==='clap'||(d.kind==='kick'&&d.step%16!==0)))return;
    const y=y0+rows[d.kind]*rh+rh/2;c.globalAlpha=0.4+d.vel*0.6;c.fillStyle=COLORS.drums;
    if(d.kind==='kick')c.fillRect(gx+d.step*sw+0.5,y-4,Math.max(3,sw-1),8);
    else if(d.kind==='perc'){c.save();c.translate(gx+d.step*sw+sw/2,y);c.rotate(Math.PI/4);c.fillRect(-2,-2,4,4);c.restore()} // a diamond, so perc reads apart from the hats
    else{c.beginPath();c.arc(gx+d.step*sw+sw/2,y,d.kind==='ohat'?3.4:d.kind==='snare'?3:d.kind==='clap'?2.6:2,0,7);c.fill()}});
  c.globalAlpha=1;syncLanes();drawFrame(-1);
}
function drawFrame(step){
  if(!rollCache)return;const dpr=Math.min(2,window.devicePixelRatio||1);
  ctx2.setTransform(1,0,0,1,0,0);ctx2.drawImage(rollCache,0,0);
  if(step>=0){const W=canvas.width/dpr,gx=74,sw=(W-gx)/(rollBars*16),s=step%(rollBars*16);ctx2.scale(dpr,dpr);
    ctx2.fillStyle='rgba(245,165,36,.10)';ctx2.fillRect(gx+s*sw,0,sw,canvas.height/dpr);
    ctx2.fillStyle='#f5a524';ctx2.fillRect(gx+s*sw,0,1.5,canvas.height/dpr)}
  if(dragPreview){ctx2.setTransform(dpr,0,0,dpr,0,0);
    ctx2.globalAlpha=.55;ctx2.fillStyle=dragPreview.color;ctx2.fillRect(dragPreview.x,dragPreview.y,dragPreview.w,dragPreview.h);ctx2.globalAlpha=1;
    ctx2.strokeStyle='#ece6d8';ctx2.lineWidth=1;ctx2.strokeRect(dragPreview.x+.5,dragPreview.y+.5,dragPreview.w-1,dragPreview.h-1)}
}

/* ---------- note editing in the roll: lead, arp and bass ---------- */
// edits live in state[EDITS[L]][part], the same format a recorded melody uses, so drawing and recording share one path
const LANE_NAME={lead:'melody',arp:'arp',bass:'bass line'};
function editList(L,sec){
  const list=state[EDITS[L]][sec.part],tr=sec.transpose||0;
  return list?list.map(e=>Object.assign({},e)):sec.track[L].map(e=>({step:e.step,dur:e.dur,midi:e.midi-tr,vel:e.vel}));
}
function commitEdits(L,sec,list,msg){
  const fresh=!state[EDITS[L]][sec.part];
  list.sort((a,b)=>a.step-b.step);state[EDITS[L]][sec.part]=list;rebuild();if(ZUI.renderRecInfo)ZUI.renderRecInfo();
  setStatus(msg+(fresh?' · this '+LANE_NAME[L]+' is yours now; ↺ beside the lane name brings the generated one back':''));
}
function clearEdits(L){
  const sec=song[viewSection];if(!sec||!state[EDITS[L]][sec.part])return;
  state[EDITS[L]][sec.part]=null;rebuild();if(ZUI.renderRecInfo)ZUI.renderRecInfo();
  setStatus('Generated '+LANE_NAME[L]+' is back for the '+(sec.part==='v'?'A verse':'B chorus')+' sections');
}
function rollXY(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
function laneAt(p){for(const L in EDITS){const H=hits[L];if(H&&p.x>=H.gx&&p.y>=H.y0&&p.y<=H.y0+H.h)return L}return null}
function noteAt(H,p){return H.rects.find(r=>p.x>=r.x-2&&p.x<=r.x+r.w+2&&p.y>=r.y-2&&p.y<=r.y+r.h+2)||null}
const onEdge=(r,x)=>r.w>=10&&x>=r.x+r.w-6;
function roomAfter(H,list,skip,step){
  let room=H.steps-step;
  list.forEach((n,i)=>{if(i!==skip&&n.step>step)room=Math.min(room,n.step-step)});
  return Math.max(1,room);
}
canvas.addEventListener('pointerdown',e=>{
  if(e.button)return;
  const sec=song[viewSection],p=rollXY(e);if(!sec)return;
  const L=laneAt(p);if(!L)return;const H=hits[L];
  if(!sec.layers[L]){setStatus('This section does not play the '+L+'. Switch it on under Plays in the inspector.');return}
  const tr=sec.transpose||0,hit=noteAt(H,p);
  if(hit){
    const list=editList(L,sec),idx=list.findIndex(n=>n.step===hit.step&&soundOf(L,n.midi,tr)===hit.midi);
    if(idx<0)return;
    if(onEdge(hit,p.x)){
      e.preventDefault();try{canvas.setPointerCapture(e.pointerId)}catch(err){}
      // a generated arp note can be a fraction of a step long, from its gate: dragging it makes it whole steps
      const was=Math.max(1,Math.round(list[idx].dur));
      drag={L,sec,list,idx,tr,startX:p.x,step:hit.step,dur:was,newDur:was};
      return;
    }
    list.splice(idx,1);commitEdits(L,sec,list,'Note removed from the '+L);return;
  }
  const row=Math.max(0,Math.min(H.pitches.length-1,H.pitches.length-1-Math.floor((p.y-H.y0)/H.rowH)));
  const step=Math.max(0,Math.min(H.steps-1,Math.floor((p.x-H.gx)/H.sw)));
  const dur=Math.max(1,Math.min(NEW_DUR[L],H.steps-step)),midi=H.pitches[row].midi;
  // each of these lanes is one line: a note already sounding is trimmed, notes inside the new one give way
  const list=editList(L,sec).map(n=>n.step<step&&n.step+n.dur>step?Object.assign({},n,{dur:step-n.step}):n).filter(n=>n.step<step||n.step>=step+dur);
  list.push({step,dur,midi:midi-tr,vel:0.85});
  commitEdits(L,sec,list,Z.NOTE_NAMES[midi%12]+' added to the '+L+' at bar '+(Math.floor(step/16)+1)+'.'+(Math.floor((step%16)/4)+1));
});
canvas.addEventListener('pointermove',e=>{
  const p=rollXY(e);
  if(drag){
    const H=hits[drag.L];if(!H)return;
    const room=roomAfter(H,drag.list,drag.idx,drag.step);
    const dur=Math.max(1,Math.min(room,drag.dur+Math.round((p.x-drag.startX)/H.sw)));
    drag.newDur=dur;
    const midi=soundOf(drag.L,drag.list[drag.idx].midi,drag.tr);let idx=0,bd=1e9;
    H.pitches.forEach((q,i)=>{const d=Math.abs(q.midi-midi);if(d<bd){bd=d;idx=i}});
    dragPreview={x:H.gx+drag.step*H.sw+0.5,y:H.y0+H.h-(idx+1)*H.rowH,w:Math.max(2,dur*H.sw-1.2),h:Math.max(2,H.rowH-1.4),color:COLORS[drag.L]};
    return;
  }
  const sec=song[viewSection],L=sec?laneAt(p):null;
  if(!L||!sec.layers[L]){canvas.style.cursor='';return}
  const hit=noteAt(hits[L],p);canvas.style.cursor=hit?(onEdge(hit,p.x)?'ew-resize':'pointer'):'crosshair';
});
function endDrag(){
  if(!drag)return;const d=drag;drag=null;dragPreview=null;
  d.list[d.idx].dur=d.newDur;commitEdits(d.L,d.sec,d.list,'Note is '+d.newDur+' step'+(d.newDur===1?'':'s')+' long');
}
canvas.addEventListener('pointerup',endDrag);
canvas.addEventListener('pointercancel',()=>{drag=null;dragPreview=null});
canvas.addEventListener('pointerleave',()=>{if(!drag)canvas.style.cursor=''});
// live accessors (Object.assign would copy the getter's value once, so define them as properties)
Object.defineProperties(ZUI,{song:{get:()=>song},viewSection:{get:()=>viewSection,set:v=>{viewSection=v}}});
Object.assign(ZUI,{state,rec,COLORS,EDITS,LANE_NAME,MOODS,PATCHES,FX,FXKEYS,SEC_TYPES,ARP_MODE_NAMES,ARP_SAYS,fill,setStatus,snapshot,restore,persist,undoStep,redoStep,code,newTrack,dice,loadCode,regenerate,rebuild,cfg,renderArr,renderProg,renderInsp,buildRoll,drawFrame,selectSection,syncControls,defaultSections,clearEdits,closeChordEdit,nudgeChordEdit});
})();
