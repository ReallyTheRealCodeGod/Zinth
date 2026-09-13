(()=>{
'use strict';
/* The device: one screen at a time, four knobs whose meaning changes with the screen, the keys underneath.
   It drives the same state and engine as Studio, through the same controls, so nothing exists twice. */
const Z=window.Z,E=Z.engine,U=window.ZUI,$=id=>document.getElementById(id);
const {state,COLORS,MOODS,PATCHES}=U;
const MOOD_KEYS=Object.keys(MOODS),PATCH_KEYS=Object.keys(PATCHES),SCALE_KEYS=Object.keys(Z.SCALES),KIT_KEYS=Object.keys(Z.KITS);
const SYNTHS=['lead','arp','chords','bass'];
let mode='song',synthLayer='lead',knobs=[],raf=0,phase=0;
const fire=(id,ev)=>$(id).dispatchEvent(new Event(ev,{bubbles:true}));
const setRange=(id,v)=>{$(id).value=v;fire(id,'input')};

/* elements borrowed from Studio go back where they came from when the screen changes */
const homes=new Map();
function borrow(el,into){if(!el)return;if(!homes.has(el))homes.set(el,{parent:el.parentNode,next:el.nextSibling});into.appendChild(el)}
function giveBack(){for(const [el,h] of homes){if(h.parent)h.parent.insertBefore(el,h.next&&h.next.parentNode===h.parent?h.next:null)}homes.clear()}

/* ---------- knobs ---------- */
const COLS=['#4f8dff','#3ecf8e','#ece6d8','#f5a524'];
function knobHTML(i,k){
  return '<div class="knob" data-i="'+i+'" style="--k:'+COLS[i]+'" tabindex="0" role="slider" aria-label="'+k.label+'">'+
    '<svg viewBox="0 0 84 84" aria-hidden="true"><circle class="kt" cx="42" cy="42" r="32"/><circle class="ka" cx="42" cy="42" r="32"/><line class="kp" x1="42" y1="42" x2="42" y2="14"/></svg>'+
    '<span class="kl">'+k.label+'</span><span class="kv"></span></div>';
}
const range=k=>k.options?[0,k.options.length-1]:[k.min,k.max];
function knobDraw(i){
  const k=knobs[i],el=$('opKnobs').children[i];if(!k||!el)return;
  const [lo,hi]=range(k),v=k.get(),f=hi>lo?(v-lo)/(hi-lo):0,C=2*Math.PI*32,sweep=0.75*C;
  const arc=el.querySelector('.ka');arc.style.strokeDasharray=(f*sweep)+' '+C;arc.style.strokeDashoffset=String(-C*0.125);
  const tr=el.querySelector('.kt');tr.style.strokeDasharray=sweep+' '+C;tr.style.strokeDashoffset=String(-C*0.125);
  el.querySelector('.kp').setAttribute('transform','rotate('+(-135+f*270)+' 42 42)');
  el.querySelector('.kv').textContent=k.options?k.options[Math.round(v)]:(k.fmt?k.fmt(v):String(v));
  el.setAttribute('aria-valuetext',el.querySelector('.kv').textContent);
}
function knobSet(i,v){const k=knobs[i],[lo,hi]=range(k);v=Math.max(lo,Math.min(hi,v));if(k.options||k.step)v=Math.round(v/(k.step||1))*(k.step||1);if(v===k.get())return;k.set(v);knobDraw(i)}
function drawKnobs(){knobs.forEach((k,i)=>knobDraw(i))}
{ // drag up and down, spin the wheel, or use the arrow keys
  let drag=null;const K=$('opKnobs');
  K.addEventListener('pointerdown',e=>{const el=e.target.closest('.knob');if(!el)return;e.preventDefault();el.setPointerCapture(e.pointerId);const i=+el.dataset.i;drag={i,y:e.clientY,v:knobs[i].get()};el.classList.add('turning')});
  K.addEventListener('pointermove',e=>{if(!drag)return;const k=knobs[drag.i],[lo,hi]=range(k);const px=k.options?Math.max(40,k.options.length*14):160;knobSet(drag.i,drag.v+(drag.y-e.clientY)/px*(hi-lo))});
  const end=e=>{if(!drag)return;const el=K.children[drag.i];if(el)el.classList.remove('turning');drag=null;U.persist()};
  K.addEventListener('pointerup',end);K.addEventListener('pointercancel',end);
  K.addEventListener('wheel',e=>{const el=e.target.closest('.knob');if(!el)return;e.preventDefault();const i=+el.dataset.i,k=knobs[i],[lo,hi]=range(k);const st=k.options?1:(k.step||1)*Math.max(1,Math.round((hi-lo)/50));knobSet(i,k.get()+(e.deltaY<0?st:-st));U.persist()},{passive:false});
  K.addEventListener('keydown',e=>{const el=e.target.closest('.knob');if(!el)return;const i=+el.dataset.i,k=knobs[i],st=k.options?1:(k.step||1);
    if(e.key==='ArrowUp'||e.key==='ArrowRight'){knobSet(i,k.get()+st);e.preventDefault()}else if(e.key==='ArrowDown'||e.key==='ArrowLeft'){knobSet(i,k.get()-st);e.preventDefault()}});
}

/* ---------- helpers that reach into the app ---------- */
function applyPatch(L,name){const P=PATCHES[name];if(!P)return;for(const k in P)E.setParam(L,k,P[k]);U.renderMixer();U.renderSound();U.persist()}
function patchIndex(L){const p=E.params[L];const i=PATCH_KEYS.findIndex(k=>['wave','cutoff','reso','attack','decay','sustain','release','spread','fenv','drive','slope','fmRatio','fmIndex'].every(x=>PATCHES[k][x]===p[x]));return i}
function setLayerParam(L,key,v){E.setParam(L,key,v);if(state.layer===L)U.renderSound();U.persist()}
const scaleName=()=>Z.SCALES[state.scale].name;
function stepScale(d){const i=(SCALE_KEYS.indexOf(state.scale)+d+SCALE_KEYS.length)%SCALE_KEYS.length;$('scale').value=SCALE_KEYS[i];fire('scale','change');refresh()}
function recTargetFor(L){return L==='chords'?'lead':L}

/* ---------- screens ---------- */
const SCREENS={
  song:{
    knobs:()=>[
      {label:'Mood',options:MOOD_KEYS.map(k=>MOODS[k].label),get:()=>MOOD_KEYS.indexOf(state.mood),set:i=>{state.mood=MOOD_KEYS[i];U.newTrack(true)}},
      {label:'Key',options:Z.NOTE_NAMES,get:()=>state.root,set:i=>{$('root').value=i;fire('root','change')}},
      {label:'Tempo',min:60,max:180,step:1,fmt:v=>v+' bpm',get:()=>state.bpm,set:v=>setRange('bpm',v)},
      {label:'Energy',min:0,max:100,step:1,fmt:v=>v<34?'calm':v<67?'moving':'driving',get:()=>state.energy,set:v=>setRange('energy',v)},
    ],
    html:()=>'<div class="scr scr-song"><div class="scr-info"><div class="scr-key" id="opKey"></div><div class="scr-scale"><button class="opb" data-a="scale-" title="Previous scale">◂</button><span id="opScale"></span><button class="opb" data-a="scale+" title="Next scale">▸</button></div><div class="scr-line" id="opLine"></div><div class="notes" id="opNotes"></div><div class="scr-btns"><button class="opb big" data-a="dice" title="New track: rerolls every layer that is not locked">🎲 New track</button><button class="opb rec" data-a="rec" id="opRec" title="Record the keys into the selected section">● Rec</button><button class="opb" data-a="loop" id="opLoop" title="Loop the selected section (L)">Loop</button></div></div><div class="scr-main" id="opSongMain"></div></div>',
    mount:()=>{borrow($('arr'),$('opSongMain'));borrow($('roll'),$('opSongMain'));U.buildRoll()},
    refresh:()=>{
      $('opKey').innerHTML=Z.NOTE_NAMES[state.root]+' <em>'+scaleName()+'</em>';$('opScale').textContent=scaleName();
      const bars=(U.song||[]).reduce((a,s)=>a+s.bars,0);
      $('opLine').textContent=MOODS[state.mood].label+' · '+state.bpm+' bpm · '+bars+' bars';
      $('opNotes').innerHTML=Z.SCALES[state.scale].steps.map((s,i)=>'<span class="note'+(i===0?' root':'')+'">'+Z.NOTE_NAMES[(state.root+s)%12]+'</span>').join('');
      $('opRec').classList.toggle('on',U.rec.armed);$('opLoop').classList.toggle('on',E.loopSection);
    },
  },
  synth:{
    knobs:()=>[
      {label:'Sound',options:PATCH_KEYS.concat(['custom']),get:()=>{const i=patchIndex(synthLayer);return i<0?PATCH_KEYS.length:i},set:i=>{if(i<PATCH_KEYS.length)applyPatch(synthLayer,PATCH_KEYS[i])}},
      {label:'Cutoff',min:0,max:100,step:1,fmt:v=>Math.round(Z.cutoffHz(v))+' Hz',get:()=>E.params[synthLayer].cutoff,set:v=>setLayerParam(synthLayer,'cutoff',v)},
      {label:'Envelope',min:0,max:100,step:1,fmt:v=>v<25?'pluck':v<55?'keys':v<80?'swell':'pad',get:()=>Math.round((E.params[synthLayer].attack+E.params[synthLayer].release)/2),
        set:v=>{const p=E.params[synthLayer];const a=Math.round(v*0.7),r=Math.round(10+v*0.9),s=Math.round(20+v*0.75);E.setParam(synthLayer,'attack',a);E.setParam(synthLayer,'release',Math.min(100,r));E.setParam(synthLayer,'sustain',Math.min(100,s));if(state.layer===synthLayer)U.renderSound();U.persist();void p}},
      {label:'Space',min:0,max:100,step:1,fmt:v=>v?v+' %':'dry',get:()=>E.params[synthLayer].reverb,set:v=>{E.setParam(synthLayer,'reverb',v);E.setParam(synthLayer,'delay',Math.round(v*0.6));if(state.layer===synthLayer)U.renderSound();U.persist()}},
    ],
    html:()=>'<div class="scr scr-synth"><div class="scr-tabs" id="opLayers">'+SYNTHS.map(L=>'<button data-l="'+L+'" style="--c:'+COLORS[L]+'"'+(L===synthLayer?' class="on"':'')+'>'+L+'</button>').join('')+'</div><canvas class="scr-wave" id="opWave" width="900" height="220"></canvas><div class="scr-foot"><span class="scr-patch" id="opPatch"></span><span class="scr-btns"><button class="opb" data-a="lock" id="opLock" title="Lock: New track keeps this layer">🔒 Lock</button><button class="opb" data-a="ldice" title="Reroll only this layer">🎲 Roll</button><button class="opb" data-a="mute" id="opMute" title="Mute this layer">Mute</button></span></div></div>',
    mount:()=>{waveLoop()},
    refresh:()=>{
      const p=E.params[synthLayer],i=patchIndex(synthLayer);
      $('opPatch').innerHTML='<b style="color:'+COLORS[synthLayer]+'">'+synthLayer+'</b> · '+(i>=0?PATCH_KEYS[i]:'custom '+p.wave);
      $('opLock').classList.toggle('on',!!state.locks[synthLayer]);$('opMute').classList.toggle('on',!!p.mute);
      $('opLayers').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.l===synthLayer));
    },
  },
  drum:{
    knobs:()=>[
      {label:'Kit',options:KIT_KEYS,get:()=>KIT_KEYS.indexOf(state.kit),set:i=>{$('kit').value=KIT_KEYS[i];fire('kit','change');U.renderMixer()}},
      {label:'Swing',min:0,max:60,step:1,fmt:v=>v?v+' %':'straight',get:()=>state.swing,set:v=>setRange('swing',v)},
      {label:'Pump',min:0,max:100,step:1,fmt:v=>v?v+' %':'off',get:()=>E.params.drums.pump,set:v=>{E.setParam('drums','pump',v);U.persist()}},
      {label:'Level',min:0,max:100,step:1,fmt:v=>v+' %',get:()=>E.params.drums.level,set:v=>{E.setParam('drums','level',v);U.renderMixer();U.persist()}},
    ],
    html:()=>'<div class="scr scr-drum"><div class="scr-foot top"><span class="scr-patch" id="opKit"></span><span class="scr-btns"><button class="opb" data-a="fill" id="opFill" title="Snare roll into the next section">Fill</button><button class="opb" data-a="dlock" id="opDLock" title="Lock: New track keeps the drums">🔒 Lock</button><button class="opb" data-a="ddice" title="Reroll only the drums">🎲 Roll</button><button class="opb" data-a="dreset" title="Back to the generated pattern">↺</button></span></div><div class="scr-grid" id="opGrid"></div><div class="scr-line">Click a cell: off → hit → ghost. The grid is the pattern of the selected section.</div></div>',
    mount:()=>{state.layer='drums';U.renderSound();borrow($('grid'),$('opGrid'))},
    refresh:()=>{const sec=(U.song||[])[U.viewSection];$('opKit').innerHTML='<b style="color:'+COLORS.drums+'">'+state.kit+'</b> · '+(sec?(sec.part==='v'?'A verse':'B chorus'):'')+(sec&&state.drumEdits[sec.part]?' · edited':'');
      $('opDLock').classList.toggle('on',!!state.locks.drums);const P=sec&&sec.track.drumPattern;$('opFill').classList.toggle('on',!!(P&&P.fill))},
  },
  mix:{
    knobs:()=>[
      {label:'Volume',min:0,max:100,step:1,fmt:v=>v+' %',get:()=>+$('master').value,set:v=>setRange('master',v)},
      {label:'Warmth',min:0,max:100,step:1,fmt:v=>v?v+' %':'clean',get:()=>Math.round(state.warmth),set:v=>setRange('warmth',v)},
      {label:'Humanize',min:0,max:100,step:1,fmt:v=>v?v<34?'a little':v<67?'played':'loose':'machine',get:()=>+$('human').value,set:v=>setRange('human',v)},
      {label:'Tone',min:-100,max:100,step:1,fmt:v=>v<-10?'darker':v>10?'brighter':'flat',get:()=>Math.round((+$('eq-high').value-(+$('eq-low').value))/2),set:v=>{setRange('eq-high',v);setRange('eq-low',-v)}},
    ],
    html:()=>'<div class="scr scr-mix" id="opMix"></div>',
    mount:()=>{renderFaders()},
    refresh:()=>{renderFaders()},
  },
};
function renderFaders(){
  const box=$('opMix');if(!box)return;
  box.innerHTML=Z.LAYERS.map(L=>{const p=E.params[L],on=E.audible(L);return '<div class="fader'+(on?'':' off')+'" data-l="'+L+'" style="--c:'+COLORS[L]+'"><div class="ftrack" title="Drag to set the level"><div class="ffill" style="height:'+p.level+'%"></div></div><b>'+L+'</b><span class="fv">'+p.level+'</span><div class="fbt"><button data-a="mute" class="'+(p.mute?'on':'')+'" title="Mute">M</button><button data-a="lock" class="'+(state.locks[L]?'on':'')+'" title="Lock: New track keeps this layer">'+(state.locks[L]?'🔒':'🔓')+'</button><button data-a="dice" title="Reroll only this layer">🎲</button></div></div>'}).join('');
}
{ // faders: drag anywhere on the track
  let fd=null;
  $('opScreen').addEventListener('pointerdown',e=>{const t=e.target.closest('.ftrack');if(!t)return;e.preventDefault();t.setPointerCapture(e.pointerId);fd={t,L:t.closest('.fader').dataset.l};setFader(fd,e)});
  $('opScreen').addEventListener('pointermove',e=>{if(fd)setFader(fd,e)});
  const done=()=>{if(!fd)return;fd=null;U.renderMixer();U.persist()};
  $('opScreen').addEventListener('pointerup',done);$('opScreen').addEventListener('pointercancel',done);
  function setFader(f,e){const r=f.t.getBoundingClientRect(),v=Math.round(Math.max(0,Math.min(100,(r.bottom-e.clientY)/r.height*100)));E.setParam(f.L,'level',v);f.t.querySelector('.ffill').style.height=v+'%';f.t.closest('.fader').querySelector('.fv').textContent=v;if(state.layer===f.L)U.renderSound()}
}

/* the synth screen's wave picture: the layer's wave, softened by its cutoff, drifting slowly */
function waveLoop(){
  cancelAnimationFrame(raf);
  const tick=()=>{const c=$('opWave');if(!c||mode!=='synth'||state.view!=='op')return;draw(c);raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
  function draw(c){
    const g=c.getContext('2d'),W=c.width,H=c.height,p=E.params[synthLayer],cut=p.cutoff/100,cycles=p.wave==='fm'?4:3;
    g.clearRect(0,0,W,H);phase+=0.012;
    const f=x=>{const t=x*cycles+phase,w=p.wave;let v;
      if(w==='sine')v=Math.sin(t*2*Math.PI);
      else if(w==='triangle')v=1-4*Math.abs(((t%1)+1)%1-0.5);
      else if(w==='square')v=((t%1)+1)%1<0.5?1:-1;
      else if(w==='fm'){const r=p.fmRatio||2,idx=(p.fmIndex||40)/100;v=Math.sin(t*2*Math.PI+idx*3*Math.sin(t*2*Math.PI*r))}
      else{v=2*(((t%1)+1)%1)-1;if(w==='super')v=(v+2*((((t*1.01)%1)+1)%1)-1+2*((((t*0.99)%1)+1)%1)-1)/3}
      return v};
    // low cutoff rounds the shape off: a simple running average stands in for the filter
    const n=360,pts=[],win=Math.max(1,Math.round((1-cut)*18));
    for(let i=0;i<n+win;i++)pts.push(f(i/n));
    g.lineWidth=3;g.strokeStyle=COLORS[synthLayer];g.lineJoin='round';g.beginPath();
    for(let i=0;i<n;i++){let s=0;for(let j=0;j<win;j++)s+=pts[i+j];const y=H/2-(s/win)*(H*0.36)*(0.6+0.4*(p.level/100));const x=i/(n-1)*W;if(i)g.lineTo(x,y);else g.moveTo(x,y)}
    g.stroke();
    g.strokeStyle='rgba(236,230,216,.12)';g.lineWidth=1;g.beginPath();g.moveTo(0,H/2);g.lineTo(W,H/2);g.stroke();
  }
}

/* ---------- rendering the device ---------- */
function render(){
  giveBack();
  const S=SCREENS[mode];
  $('opModes').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
  $('opScreen').innerHTML=S.html();
  knobs=S.knobs();$('opKnobs').innerHTML=knobs.map((k,i)=>knobHTML(i,k)).join('');
  if(S.mount)S.mount();
  refresh();
}
function refresh(){if(state.view!=='op')return;const S=SCREENS[mode];if(S.refresh)S.refresh();drawKnobs()}
$('opModes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;render()});
$('opScreen').addEventListener('click',e=>{
  const lb=e.target.closest('#opLayers button');if(lb){synthLayer=lb.dataset.l;state.layer=synthLayer;U.renderSound();knobs=SCREENS.synth.knobs();refresh();return}
  const fb=e.target.closest('.fader button');if(fb){const L=fb.closest('.fader').dataset.l,a=fb.dataset.a;
    if(a==='mute')E.setParam(L,'mute',!E.params[L].mute);else if(a==='lock')state.locks[L]=!state.locks[L];else if(a==='dice'){U.dice(L);return}
    U.renderMixer();U.persist();refresh();return}
  const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
  if(a==='dice')U.newTrack();else if(a==='rec'){const t=recTargetFor(synthLayer);if(state.recTarget!==t){const tb=$('recTarget').querySelector('[data-v="'+t+'"]');if(tb)tb.click()}$('recBtn').click()}
  else if(a==='loop')$('loopSec').click();else if(a==='scale-')stepScale(-1);else if(a==='scale+')stepScale(1);
  else if(a==='lock'){state.locks[synthLayer]=!state.locks[synthLayer];U.renderMixer();U.persist()}else if(a==='ldice')U.dice(synthLayer);
  else if(a==='mute'){E.setParam(synthLayer,'mute',!E.params[synthLayer].mute);U.renderMixer();U.persist()}
  else if(a==='fill')$('fillTgl').click();else if(a==='dlock'){state.locks.drums=!state.locks.drums;U.renderMixer();U.persist()}else if(a==='ddice')U.dice('drums');else if(a==='dreset')$('gridReset').click();
  refresh();
});
// the device follows the app: anything that changes the song or a sound shows up within a moment
let lastSig='';
setInterval(()=>{if(state.view!=='op')return;const sig=[state.root,state.scale,state.mood,state.bpm,state.energy,state.kit,state.swing,U.viewSection,U.rec.armed,E.loopSection,JSON.stringify(E.params),JSON.stringify(state.locks),$('master').value,state.warmth,$('human').value].join('|');if(sig!==lastSig){lastSig=sig;refresh()}},250);

function enter(){render()}
function leave(){cancelAnimationFrame(raf);giveBack();$('opScreen').innerHTML='';$('opKnobs').innerHTML=''}
Object.assign(U,{opEnter:enter,opLeave:leave,opRefresh:refresh});
if(state.view!=='studio')enter(); // this script loads last, after the app has already chosen its view
})();
