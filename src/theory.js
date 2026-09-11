(()=>{
'use strict';
/* ================= seeded random ================= */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function randomSeed(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
class Rng{
  constructor(seed){this.f=mulberry32(hashStr(String(seed)))}
  next(){return this.f()} int(n){return Math.floor(this.f()*n)} pick(a){return a[this.int(a.length)]}
  chance(p){return this.f()<p} range(a,b){return a+this.f()*(b-a)}
  weighted(items,weights){let s=0;for(const w of weights)s+=w;let r=this.f()*s;for(let i=0;i<items.length;i++){r-=weights[i];if(r<=0)return items[i]}return items[items.length-1]}
}

/* ================= theory ================= */
const NOTE_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const ROMAN=['I','II','III','IV','V','VI','VII'];
/* Every scale carries the steps it is made of, the pool of progressions the generator rolls from, a
   `group` so the scale menu stays readable, and a `hint`: one line of plain language about what the
   scale sounds like, shown as its tooltip. A pool is curated, never generated: no degree in a pool may
   build a diminished triad, because a diminished chord under a rolled melody is the one thing in this
   app that can sound like a mistake. The check proves that of every pool, so a new scale cannot smuggle
   one in. Scales without their own pool name a `chord` scale whose harmony they borrow. */
const SCALES={
  major:     {name:'Major',            group:'Modes', hint:'Bright and familiar — the sound of most pop songs',
              steps:[0,2,4,5,7,9,11], progs:[[0,4,5,3],[0,5,3,4],[5,3,0,4],[0,3,4,3],[0,3,5,4],[1,4,0,0],[0,2,5,3],[3,4,5,0]]},
  minor:     {name:'Natural minor',    group:'Modes', hint:'Sad and strong — the everyday minor key',
              steps:[0,2,3,5,7,8,10], progs:[[0,5,2,6],[0,6,5,6],[0,3,5,4],[0,5,3,4],[5,6,0,0],[0,2,6,5],[3,0,5,6],[0,5,0,6]]},
  dorian:    {name:'Dorian',           group:'Modes', hint:'Minor with a lift in it — funk, house, folk',
              steps:[0,2,3,5,7,9,10], progs:[[0,3,0,3],[0,3,6,3],[0,1,3,0],[0,6,3,0],[0,3,1,0],[0,1,0,3]]},
  phrygian:  {name:'Phrygian',         group:'Modes', hint:'Dark and Spanish — a flat second right at the bottom',
              steps:[0,1,3,5,7,8,10], progs:[[0,1,0,1],[0,1,5,1],[0,6,5,1],[0,2,1,0]]},
  lydian:    {name:'Lydian',           group:'Modes', hint:'Floating and filmic — major with a raised fourth',
              steps:[0,2,4,6,7,9,11], progs:[[0,1,0,1],[0,1,4,1],[0,4,1,0],[0,1,2,1]]},
  mixolydian:{name:'Mixolydian',       group:'Modes', hint:'Major with a flat seventh — rock and blues',
              steps:[0,2,4,5,7,9,10], progs:[[0,6,3,0],[0,6,0,6],[0,3,6,0],[4,6,0,0],[0,4,6,3]]},
  harmMinor: {name:'Harmonic minor',   group:'Modes', hint:'Minor with a leading note — dramatic, classical',
              steps:[0,2,3,5,7,8,11], progs:[[0,3,4,0],[0,5,4,0],[0,4,0,4],[3,0,4,0],[0,5,3,4]]},
  lydDom:    {name:'Lydian dominant',  group:'Exotic', hint:'Sunlit and slippery — raised fourth over a flat seventh',
              steps:[0,2,4,6,7,9,10], progs:[[0,1,0,1],[0,1,5,1],[0,5,1,0],[0,1,4,1],[5,1,0,0],[0,4,1,0]]},
  dorb2:     {name:'Dorian ♭2',        group:'Exotic', hint:'Smoky minor — a flat second with a bright sixth above it',
              steps:[0,1,3,5,7,9,10], progs:[[0,2,0,3],[0,3,2,0],[0,2,3,2],[0,6,3,0],[0,3,0,2],[2,3,0,0]]},
  hungMinor: {name:'Hungarian minor',  group:'Exotic', hint:'Two big leaps — gypsy minor, all drama',
              steps:[0,2,3,6,7,8,11], progs:[[0,4,0,4],[0,5,4,0],[0,4,5,4],[0,6,4,0],[5,4,0,0],[0,5,0,4]]},
  phrygDom:  {name:'Phrygian dominant',group:'Exotic', hint:'Major chord, Phrygian second — flamenco and desert',
              steps:[0,1,4,5,7,8,10], progs:[[0,1,0,1],[0,6,1,0],[0,3,1,0],[0,1,6,0],[0,3,0,1],[3,1,0,0]]},
  neapMinor: {name:'Neapolitan minor', group:'Exotic', hint:'Minor under a flat second — solemn and cinematic',
              steps:[0,1,3,5,7,8,11], progs:[[0,5,1,0],[0,1,0,5],[0,3,5,0],[0,5,3,1],[0,1,3,0],[3,1,0,0]]},
  wholeTone: {name:'Whole tone',       group:'Exotic', hint:'No home and no gravity — every step the same size',
              steps:[0,2,4,6,8,10],   progs:[[0,1,2,1],[0,2,4,2],[0,1,0,2]]},
  pentMajor: {name:'Major pentatonic', group:'Five-note', hint:'Five notes that never clash — open and singable',
              steps:[0,2,4,7,9],      chord:'major'},
  pentMinor: {name:'Minor pentatonic', group:'Five-note', hint:'The riff scale — minor, five notes, no bad ones',
              steps:[0,3,5,7,10],     chord:'minor'},
  blues:     {name:'Blues',            group:'Five-note', hint:'Minor pentatonic with the blue note passing through',
              steps:[0,3,5,6,7,10],   chord:'minor', passing:[6]},
  hirajoshi: {name:'Hirajoshi',        group:'Five-note', hint:'Japanese and spare — wide gaps, lots of air',
              steps:[0,2,3,7,8],      chord:'minor'},
  insen:     {name:'In-sen',           group:'Five-note', hint:'Japanese and shadowy — a flat second, no third',
              steps:[0,1,5,7,10],     chord:'phrygian'},
};
const SCALE_GROUPS=['Modes','Exotic','Five-note'];
const chordScaleOf=k=>SCALES[SCALES[k].chord||k];
function buildChord(steps,degree,size,rootMidi){
  const n=steps.length,out=[];
  for(let i=0;i<size;i++){
    let d=degree+2*i;
    if(i===3&&(d-degree)%n===0)d=degree+5; // six-note scales wrap the seventh onto the root: use the sixth instead
    out.push(rootMidi+12*Math.floor(d/n)+steps[d%n]);
  }
  return out;
}
function chordInfo(notes){
  const pcs=notes.map(m=>((m-notes[0])%12+12)%12);
  const third=pcs[1],fifth=pcs[2],sev=pcs[3];
  let q='',suffix='';
  if(third===4&&fifth===7){q='maj'}else if(third===3&&fifth===7){q='min';suffix='m'}
  else if(third===3&&fifth===6){q='dim';suffix='dim'}else if(third===4&&fifth===8){q='aug';suffix='+'}
  else{q='sus';suffix='sus'}
  // stacking scale thirds on a scale with a big leap in it (Hungarian minor, Neapolitan minor) lands a
  // sixth where the seventh would be: it is a real chord, so call it one rather than a wrong seventh.
  const sixth=sev===9;
  if(sev!==undefined){
    if(sixth)suffix=(q==='min'?'m':q==='maj'?'':suffix)+'6';
    else if(q==='maj'&&sev===11)suffix='maj7'; else if(q==='maj'&&sev===10)suffix='7'; else if(q==='min'&&sev===10)suffix='m7';
    else if(q==='min'&&sev===11)suffix='mM7';   // a minor chord under a leading note: harmonic minor's home chord
    else suffix+='7';
  }
  return {quality:q,sixth:!!(sev!==undefined&&sixth),name:NOTE_NAMES[((notes[0]%12)+12)%12]+suffix};
}
function romanFor(degree,quality,size,sixth){
  let r=ROMAN[degree]||String(degree+1);
  if(quality==='min'||quality==='dim')r=r.toLowerCase();
  if(quality==='dim')r+='°'; if(quality==='aug')r+='+'; if(size>3)r+=sixth?'⁶':'⁷';
  return r;
}

/* ================= generation ================= */
const STEPS=16,BARS=8,TOTAL=STEPS*BARS;
const DRUM_KINDS=['kick','snare','clap','hat','ohat','perc'];
/* The perc row: a rim, a shaker or a cowbell — the kit chooses which — that lifts a busy pattern without
   crowding it. The generator only reaches for it once the track has the energy to carry one, keeps it off
   the backbeat the snare and the clap own, and never lets it play louder than they do, so perc always
   sits behind the kit rather than in front of it. Which voice a kit plays reaches a DAW as its GM note. */
const PERC_VOICES=['rim','shaker','cowbell'];
const PERC_GM={rim:37,shaker:70,cowbell:56};   // GM percussion: side stick, maracas, cowbell
const PERC={from:0.45,maxVel:0.65};
// the sixteenth figures perc plays: offbeats and pickups, never the 1 the kick owns
const PERC_FIGURES=[[2,6,10,14],[3,7,11,15],[6,14],[2,10],[7,15],[1,5,9,13],[6,10,14]];

/* A progression entry is either a plain degree — what a chord-box sketch produces — or an object
   {d, bars, seventh, inv}: the degree, how many bars it lasts, whether it takes the seventh (else the
   track's own 7ths setting decides) and a fixed inversion (else voice leading picks one). Both forms
   live side by side in state.prog[part], so old projects and sketches keep working. */
function progEntry(x,n){
  const o=(x&&typeof x==='object')?x:{d:x};
  const d=Math.round(+o.d);if(!(d>=0&&d<n))return null;
  const e={d},b=Math.round(+o.bars),i=Math.round(+o.inv);
  if(b>=1&&b<=BARS)e.bars=b;
  if(o.seventh!==undefined&&o.seventh!==null)e.seventh=!!o.seventh;
  if(i>=0&&i<=3)e.inv=i;
  return e;
}
function normProg(prog,n){
  if(!Array.isArray(prog))return null;
  const out=prog.map(x=>progEntry(x,n)).filter(Boolean).slice(0,BARS);
  return out.length?out:null;
}
// Give every chord its span: a chord that sets its own length keeps it, the rest share what is left, and
// the last chord stretches or is clipped so the progression always covers exactly the 8 bars of the loop.
function layoutProg(list){
  const fixed=list.reduce((a,e)=>a+(e.bars||0),0),autos=list.filter(e=>!e.bars).length;
  const room=Math.max(0,BARS-fixed),base=autos?Math.floor(room/autos):0,extra=autos?room-base*autos:0;
  const out=[];let bar=0,ai=0;
  for(const e of list){
    if(bar>=BARS)break;
    const want=e.bars||(base+(ai++<extra?1:0));
    const bars=Math.min(want,BARS-bar);
    if(bars<1)continue;
    out.push({e,bar0:bar,bars});bar+=bars;
  }
  if(!out.length){out.push({e:list[0],bar0:0,bars:BARS});bar=BARS}
  if(bar<BARS)out[out.length-1].bars+=BARS-bar;
  return out;
}
// a track code carries a progression as "0x4-3x2i1": degree, "x" bars, "7" or "3" for a forced
// seventh or triad, "i" for a fixed inversion. A plain "0-3-4-0" is still a valid progression.
function progCode(list){
  if(!Array.isArray(list)||!list.length)return '';
  return list.map(x=>{
    const e=(x&&typeof x==='object')?x:{d:x};let s=String(Math.max(0,Math.round(+e.d)||0));
    if(e.bars)s+='x'+e.bars;
    if(e.seventh===true)s+='7';else if(e.seventh===false)s+='3';
    if(e.inv!==undefined&&e.inv!==null)s+='i'+e.inv;
    return s;
  }).join('-');
}
function parseProgCode(str){
  const tok=/^(\d+)(?:x(\d))?(7|3)?(?:i(\d))?$/;
  if(!/^\d+(x\d)?(7|3)?(i\d)?(-\d+(x\d)?(7|3)?(i\d)?)*$/.test(str||''))return null;
  return String(str).split('-').slice(0,BARS).map(t=>{
    const m=tok.exec(t),e={d:+m[1]};
    if(m[2])e.bars=+m[2];
    if(m[3])e.seventh=m[3]==='7';
    if(m[4]!==undefined)e.inv=+m[4];
    return e;
  });
}
function generateChords(cfg,rng){
  const cs=chordScaleOf(cfg.scale);
  const list=normProg(cfg.prog,cs.steps.length)||rng.pick(cs.progs).map(d=>({d}));
  const rootMidi=(cfg.root>=6?48:60)+cfg.root;
  let prev=null;
  return layoutProg(list).map(({e,bar0,bars})=>{
    const size=(e.seventh===undefined?cfg.sevenths:e.seventh)?4:3;
    const base=buildChord(cs.steps,e.d,size,rootMidi);
    const info=chordInfo(base);
    const rootPc=base[0]%12,fifthPc=base[2]%12;
    let notes=base;
    // voice leading: least movement from the previous voicing, near the home register. A chord that names
    // its own inversion only chooses the octave, so the note you asked for stays in the bass.
    const invs=e.inv===undefined?base.map((_,k)=>k):[Math.min(e.inv,size-1)];
    if(prev||e.inv!==undefined){
      let best=null,bd=1e9;
      for(const inv of invs)for(const oct of [-12,0]){
        const v=base.map((m,k)=>(k<inv?m+12:m)+oct).sort((a,b)=>a-b);
        if(new Set(v).size!==v.length)continue;
        const mean=v.reduce((a,b)=>a+b,0)/v.length;
        let d=0;if(prev)v.forEach((m,k)=>{d+=Math.abs(m-prev[Math.min(k,prev.length-1)])});
        d+=Math.max(0,Math.abs(mean-(rootMidi+6))-6)*2;
        if(d<bd){bd=d;best=v}
      }
      if(best)notes=best;
    }
    prev=notes;
    const inv=Math.max(0,base.map(m=>((m%12)+12)%12).indexOf(((notes[0]%12)+12)%12));
    return {degree:e.d,notes,rootPc,fifthPc,seventh:size>3,inv,
      name:info.name+(inv?'/'+NOTE_NAMES[((notes[0]%12)+12)%12]:''),
      roman:romanFor(e.d,info.quality,size,info.sixth),bar0,bars,pcs:new Set(notes.map(m=>m%12))};
  });
}
const chordAt=(chords,step)=>{const bar=Math.floor(step/STEPS);for(const c of chords)if(bar<c.bar0+c.bars)return c;return chords[chords.length-1]};

function scalePitches(cfg,lo,hi){
  const sc=SCALES[cfg.scale],out=[];
  for(let m=lo;m<=hi;m++){const rel=((m-cfg.root)%12+12)%12;const k=sc.steps.indexOf(rel);if(k>=0)out.push({midi:m,passing:!!(sc.passing&&sc.passing.includes(rel))})}
  return out;
}
function rhythmMotif(rng,density,gate){
  const on=[];let last=-99;
  for(let s=0;s<STEPS*2;s++){
    const pos=s%16;
    let p=pos%4===0?0.55+density*0.4 : pos%2===0?0.15+density*0.45 : density*0.35;
    if(s-last<2)p*=0.15;
    if(rng.chance(p)){on.push(s);last=s}
  }
  if(on.length===0)on.push(0);
  if(on[0]!==0&&rng.chance(0.7))on.unshift(0);
  return on.map((s,i)=>{const next=on[i+1]!==undefined?on[i+1]:STEPS*2;const room=next-s;return {s,d:Math.max(1,Math.min(room,Math.round(room*gate)||1))}});
}
function makeContour(rng,len,leap){
  const c=[];for(let i=0;i<len;i++){const r=rng.next();c.push(r<0.30?0:r<0.62?1:r<0.86?-1:rng.chance(leap)?rng.pick([2,3,-2,-3,4,-4]):rng.pick([2,-2]))}return c;
}
function realise(rng,motif,contour,chords,pitches,startStep,resolve){
  const evs=[];const isCT=(p,ch)=>ch.pcs.has(p.midi%12);
  let ch=chordAt(chords,startStep);
  const ctIdx=pitches.map((p,i)=>i).filter(i=>isCT(pitches[i],ch)&&!pitches[i].passing);
  const mid=pitches.length/2;
  let idx=ctIdx.length?ctIdx.reduce((a,b)=>Math.abs(b-mid)<Math.abs(a-mid)?b:a):Math.floor(mid);
  motif.forEach((n,i)=>{
    const step=startStep+n.s;ch=chordAt(chords,step);
    if(i>0){idx+=contour[i%contour.length];
      if(idx<0)idx=1+rng.int(2); if(idx>=pitches.length)idx=pitches.length-2-rng.int(2);
      idx=Math.max(0,Math.min(pitches.length-1,idx));
    }
    const strong=(n.s%4===0);
    if(strong||pitches[idx].passing){
      let best=idx,bd=99;
      for(let k=Math.max(0,idx-2);k<=Math.min(pitches.length-1,idx+2);k++){
        if(isCT(pitches[k],ch)&&!pitches[k].passing){const d=Math.abs(k-idx);if(d<bd){bd=d;best=k}}
      }
      if(strong?(bd<99&&rng.chance(0.8)):true)idx=best;
      if(pitches[idx].passing)idx=Math.max(0,idx-1);
    }
    evs.push({step,dur:n.d,midi:pitches[idx].midi,vel:strong?0.9:0.7+rng.next()*0.15});
  });
  if(resolve&&evs.length){
    const last=evs[evs.length-1];const ch2=chordAt(chords,last.step);
    const targets=pitches.filter(p=>(p.midi%12)===ch2.rootPc||(p.midi%12)===ch2.fifthPc);
    if(targets.length){last.midi=targets.reduce((a,b)=>Math.abs(b.midi-last.midi)<Math.abs(a.midi-last.midi)?b:a).midi;}
    last.dur=Math.max(last.dur,4);last.vel=0.95;
  }
  return evs;
}
function generateLead(cfg,chords,rngA,rngB){
  const energy=cfg.energy/100;
  const lo=64+(cfg.root>=6?-6:0),pitches=scalePitches(cfg,lo,lo+22);
  const density=0.25+energy*0.55,gate=cfg.gate;
  const A=rhythmMotif(rngA,density,gate),cA=makeContour(rngA,cfg.hook?3+rngA.int(3):A.length,0.35+energy*0.3);
  const B=rhythmMotif(rngB,density*(0.8+rngB.next()*0.5),gate),cB=makeContour(rngB,B.length,0.5);
  return [
    ...realise(rngA,A,cA,chords,pitches,0,false),
    ...realise(rngA,A,cA,chords,pitches,32,rngA.chance(0.5)),
    ...realise(rngB,B,cB,chords,pitches,64,false),
    ...realise(rngA,A,cA,chords,pitches,96,true),
  ];
}
// the bass always sounds in its own register; an edited note is folded by octaves, so its pitch class stays
const BASS_LO=36,BASS_HI=59;
function bassRegister(m){while(m<BASS_LO)m+=12;while(m>BASS_HI)m-=12;return m}
// the arp sings above the chords: this is the window its generator writes in and its roll lane draws.
// It is three octaves and a fifth wide, so the widest octave range still fits inside it.
const arpRange=root=>{const lo=(root>=6?48:60)+root;return [lo+7,lo+43]};
// The rows of an editable lane in the roll: one per pitch of the key, in the register that layer's generator
// writes in. The roll draws these, a click picks one of them, and a demo song's notes are chosen from them,
// so a note that can be written into a lane at all is a note of the key by construction.
function lanePitches(L,root,scale){
  if(L==='lead'){const lo=64+(root>=6?-6:0);return scalePitches({root,scale},lo,lo+22)}
  const chord=SCALES[scale].chord||scale; // arp and bass follow the chord scale, as their generators do
  if(L==='bass')return scalePitches({root,scale:chord},BASS_LO,BASS_HI);
  const r=arpRange(root);return scalePitches({root,scale:chord},r[0],r[1]);
}

/* The arp, and the three things that decide what it plays. A mode says the order it walks the chord in, an
   octave range how far up it reaches, and a gate how much of each step a note holds — from a staccato tick
   to a legato run. None of the three can take the arp out of the key: whatever they say, every note it
   plays is a tone of the chord sounding at that step, folded into the arp's own lane. The mode only ever
   chooses which of those tones comes next. 'auto' is not a mode of its own — it means the roll picks one,
   so the arp's dice deals a new figure, and it is what a project saved before any of this opens with. */
const ARP={modes:['up','down','updown','random','chord','pattern'],octaves:[1,2,3],
  minGate:15,maxGate:100,minDur:0.25,maxBlock:6,dflt:{mode:'auto',octaves:2,gate:70}};
const ARP_MODES=['auto'].concat(ARP.modes);
// what 'auto' rolls: a straight run twice as often as anything else, and never block chords by accident
const AUTO_MODES=['up','up','down','updown','random','pattern'];
// the little repeating shapes 'pattern' mode plays, as indices into the chord tones it has to hand
const ARP_FIGURES=[[0,1,2,1],[0,2,1,2],[0,1,0,2],[0,2,3,1],[0,0,1,2],[2,0,1,0],[0,1,2,3]];
const arpOctaves=v=>{const n=Math.round(+v);return isNaN(n)?ARP.dflt.octaves:Math.max(1,Math.min(3,n))};
const arpGate=v=>{const g=Math.round(+v);return isNaN(g)?ARP.dflt.gate:Math.max(ARP.minGate,Math.min(ARP.maxGate,g))};
// the arp's settings, from anywhere: a project, a mood or nothing at all. Anything unreadable is the default.
function normArp(a){
  const o=(a&&typeof a==='object')?a:{};
  return {mode:ARP_MODES.indexOf(o.mode)>=0?o.mode:ARP.dflt.mode,octaves:arpOctaves(o.octaves),gate:arpGate(o.gate)};
}
// how long an arp note holds, in steps: the gate's share of the step it starts on. Never longer than that
// step, so one note never runs into the next, and never shorter than ARP.minDur, so a tick is still a note.
function arpDur(rate,gate){return Math.max(ARP.minDur,Math.min(rate,rate*arpGate(gate)/100))}
// the notes the arp has to choose from: every tone of the chord playing now, folded into the octave at the
// bottom of its lane and then stacked as far up as the octave range asks, never past the top of the lane
function arpNotes(chord,root,octaves){
  const r=arpRange(root),oct=arpOctaves(octaves),base=[];
  for(const m of chord.notes){let x=m;while(x<r[0])x+=12;while(x>=r[0]+12)x-=12;if(base.indexOf(x)<0)base.push(x)}
  base.sort((a,b)=>a-b);
  const out=[];
  for(let k=0;k<oct;k++)for(const m of base){const x=m+12*k;if(x<=r[1])out.push(x)}
  return out.length?out:base;
}
// which of those notes comes next: always an index inside the set, so the arp cannot reach a note that is
// not a chord tone however the mode is set
function arpIndex(mode,k,n,rng,fig){
  if(!(n>=1))return 0;
  const j=Math.max(0,Math.round(k));
  if(mode==='down')return n-1-(j%n);
  if(mode==='updown'){const c=Math.max(1,2*n-2),i=j%c;return i<n?i:c-i}
  if(mode==='random')return rng.int(n);
  if(mode==='pattern'){const f=(fig&&fig.length?fig:ARP_FIGURES[0]);return f[j%f.length]%n}
  return j%n; // up
}
function generateArp(cfg,chords,rng){
  const energy=cfg.energy/100,A=normArp(cfg.arp);
  const mode=A.mode==='auto'?rng.pick(AUTO_MODES):A.mode,block=mode==='chord';
  // block chords come at half the speed of a run, and a stab never holds more than ARP.maxBlock notes
  // however wide the octave range is set, so it stays a stab rather than a wall of sound
  const rate=(energy>0.62?1:2)*(block?2:1);
  const dur=arpDur(rate,A.gate),fig=rng.pick(ARP_FIGURES),rest=energy<0.35?rng.pick([0,4]):0;
  const out=[];let k=0;
  for(let s=0;s<TOTAL;s+=rate){
    const notes=arpNotes(chordAt(chords,s),cfg.root,A.octaves);
    if(rest&&(k%rest)===rest-1){k++;continue}
    const vel=(s%4===0?0.8:0.55)+rng.next()*0.1;
    if(block)notes.slice(0,ARP.maxBlock).forEach(m=>out.push({step:s,dur,midi:m,vel}));
    else out.push({step:s,dur,midi:notes[arpIndex(mode,k,notes.length,rng,fig)],vel});
    k++;
  }
  return out;
}
// where a letter key lands when you record it into a layer: the lead as played, the arp an octave up,
// the bass folded into its own register. The pitch class never changes, so the key stays locked.
function recordPitch(L,midi,root){
  if(L==='bass')return bassRegister(midi);
  if(L!=='arp')return midi;
  const r=arpRange(root);let m=midi+12;
  while(m>r[1])m-=12;while(m<r[0])m+=12;return m;
}
function generateBass(cfg,chords,rng){
  const energy=cfg.energy/100;
  const pattern=rng.weighted(['roots','pulse','octave','synco','walk'],[1.2-energy,0.4+energy,0.3+energy,0.5+energy*0.6,0.6]);
  const out=[];
  for(let bar=0;bar<BARS;bar++){
    const s0=bar*STEPS,ch=chordAt(chords,s0);
    const root=36+ch.rootPc,fifth=36+ch.fifthPc;
    const add=(o,d,m,v)=>out.push({step:s0+o,dur:d,midi:m,vel:v});
    if(pattern==='roots'){add(0,8,root,0.9);add(8,6,root,0.75);if(rng.chance(0.4))add(14,2,fifth,0.6)}
    else if(pattern==='pulse'){for(let o=0;o<16;o+=2)add(o,1,root,o%4===0?0.9:0.65)}
    else if(pattern==='octave'){for(let o=0;o<16;o+=2)add(o,1,o%4===0?root:root+12,o%4===0?0.9:0.6)}
    else if(pattern==='synco'){add(0,3,root,0.95);add(3,3,root,0.7);add(6,2,root,0.75);add(10,2,fifth,0.7);add(12,2,root,0.8);if(rng.chance(0.5))add(14,2,root+12,0.6)}
    else {add(0,4,root,0.9);add(4,4,root,0.7);add(8,4,fifth,0.8);add(12,4,bar%2?root:fifth,0.7)}
  }
  return out;
}
// a pattern from an older project has no perc row, and a hand-made one may be ragged: give every kind its
// sixteen steps, in range, and keep every hit that is already there. Playback, the grid and the exports all
// read a normalised pattern, so an old song opens with an empty perc row rather than falling over.
function normDrumPattern(P){
  const out={fill:!(P&&P.fill===false)};
  for(const k of DRUM_KINDS){
    const row=new Array(16).fill(0),src=P&&Array.isArray(P[k])?P[k]:null;
    if(src)for(let i=0;i<16;i++){const v=+src[i];if(v>0)row[i]=Math.min(1,v)}
    out[k]=row;
  }
  return out;
}
// the perc row itself: nothing at all on a quiet track, a figure that steers clear of the snare and the
// clap on a busy one, and always under PERC.maxVel so it stays behind the backbeat
function percRow(P,energy,rng){
  const row=new Array(16).fill(0);
  if(energy<PERC.from)return row;
  const reach=(energy-PERC.from)/(1-PERC.from);
  if(!rng.chance(0.3+reach*0.6))return row;
  const fig=rng.pick(PERC_FIGURES);
  fig.forEach(o=>{if(P.snare[o]||P.clap[o])return;row[o]=Math.min(PERC.maxVel,(o%4===2?0.6:0.45)+rng.next()*0.05)});
  return row;
}
// one bar of drums as velocity rows; this is what the step grid edits
function generateDrumPattern(cfg,rng){
  const energy=cfg.energy/100,P={};DRUM_KINDS.forEach(k=>P[k]=new Array(16).fill(0));P.fill=true;
  const kick=rng.weighted([[0,4,8,12],[0,7,10],[0,10],[0,6,10,12],[0,3,8,11]],[energy*1.5,0.8,1-energy,0.5+energy*0.4,0.6]);
  kick.forEach(o=>P.kick[o]=o===0?1:0.85);
  if(energy>0.5&&rng.chance(0.5))P.kick[rng.pick([6,11,15])]=0.55;
  const snare=kick.length<=2&&rng.chance(0.6)?[8]:[4,12];
  snare.forEach(o=>P.snare[o]=0.9);
  if(rng.chance(energy>0.5?0.55:0.25))snare.forEach(o=>P.clap[o]=0.7);
  const hatRate=energy>0.7?1:energy>0.3?2:4,openAt=rng.chance(0.5)?14:-1;
  for(let o=0;o<16;o+=hatRate)P.hat[o]=o%4===0?0.7:o%2===0?0.5:0.35;
  if(openAt>=0){P.hat[openAt]=0;P.ohat[openAt]=0.7}
  P.perc=percRow(P,energy,rng);
  return P;
}
function expandDrums(P,bars){
  const out=[];
  for(let bar=0;bar<bars;bar++){
    const s0=bar*STEPS,fill=P.fill&&bar===bars-1;
    for(const k of DRUM_KINDS)for(let o=0;o<16;o++){const v=P[k][o];if(!v)continue;if(fill&&o>=12&&(k==='hat'||k==='ohat'||k==='perc'))continue;out.push({step:s0+o,kind:k,vel:v})}
    if(fill)[12,13,14,15].forEach((o,i)=>out.push({step:s0+o,kind:'snare',vel:0.5+i*0.15}));
  }
  return out;
}
/* A section can sweep the whole mix through a master low-pass. The plan is a list of {t,hz,ramp}
   points in seconds from the section's first step: 'up' opens from SWEEP.lo over the whole section,
   'down' holds the mix open and closes it over the last bar. Playback and the WAV export apply the
   same plan, so an export sounds like what you heard. */
const SWEEP={lo:300,open:18000},SWEEP_MODES=['none','up','down'];
function sweepPlan(mode,steps,stepSec){
  if((mode!=='up'&&mode!=='down')||!(steps>0)||!(stepSec>0))return null;
  const len=steps*stepSec,fall=Math.min(STEPS*stepSec,len);
  if(mode==='up')return [{t:0,hz:SWEEP.lo,ramp:false},{t:len,hz:SWEEP.open,ramp:true}];
  const pts=[{t:0,hz:SWEEP.open,ramp:false}];
  if(len>fall)pts.push({t:len-fall,hz:SWEEP.open,ramp:false});
  pts.push({t:len,hz:SWEEP.lo,ramp:true});
  return pts;
}
/* A section can also fade. 'in' rises from silence to full over its first two bars, 'out' plays full and
   falls to silence over its last two bars; a section shorter than that fades over its whole length. The
   plan is a list of {t,g,ramp} points in seconds from the section's first step, applied by a master gain
   after the limiter. Playback, the WAV export and the MIDI volume automation all read the same plan. */
// A gain ramp is exponential, so it moves at a steady number of decibels a second — and a single ramp all
// the way from silence would spend half a fade below hearing. The knee splits it: the quiet end is crossed
// quickly and most of the fade happens in the range you can actually hear, the way a hand on a fader moves.
const FADE={lo:0.0008,full:1,knee:0.08,kneeAt:0.35,bars:2},FADE_MODES=['none','in','out'];
function fadePlan(mode,steps,stepSec){
  if((mode!=='in'&&mode!=='out')||!(steps>0)||!(stepSec>0))return null;
  const len=steps*stepSec,span=Math.min(FADE.bars*STEPS*stepSec,len),knee=span*FADE.kneeAt;
  if(mode==='in')return [{t:0,g:FADE.lo,ramp:false},{t:knee,g:FADE.knee,ramp:true},{t:span,g:FADE.full,ramp:true}];
  const pts=[{t:0,g:FADE.full,ramp:false}];
  if(len>span)pts.push({t:len-span,g:FADE.full,ramp:false});
  pts.push({t:len-knee,g:FADE.knee,ramp:true},{t:len,g:FADE.lo,ramp:true});
  return pts;
}
/* Section types: the arranger's building blocks, and the eight-section form a fresh track opens with.
   Part 'v' uses the A chords, 'c' the B chords. A type can also ask for a sweep or a fade by ear — an intro
   opens up, an outro closes down and fades away — which is what a section of that type starts with. This is
   plain data, so the arranger, a demo song and the check all read the same table. */
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
const DEFAULT_FORM=['Intro','Verse','Chorus','Verse','Chorus','Break','Drop','Outro'];
// one section of a type, with everything the arranger and the exports read; the caller adds its id
function sectionOf(type){
  const t=SEC_TYPES[type]||SEC_TYPES.Verse;
  return {type:SEC_TYPES[type]?type:'Verse',part:t.part,bars:t.bars,energy:t.energy,transpose:0,
    layers:Object.assign({},t.layers),hook:!!t.hook,double:!!t.double,sweep:t.sweep||'none',fade:t.fade||'none'};
}

/* Analog drift. A real analog synth never plays the same note twice: its oscillators wander a few cents
   and its filter opens a shade differently every time. Each synth voice gets both, from a "Drift" amount
   of 0 to 100 per layer. The pitch offset is measured in cents and capped well under a semitone, so a
   drifted note is still, unmistakably, the note you asked for — the scale lock holds however far the knob
   goes. r is a random number in [0,1]: 0 is the flattest a voice may sit, 1 the sharpest, 0.5 dead centre. */
const DRIFT={cents:14,cutoff:0.18,seconds:2.4};
const driftAmt=a=>Math.max(0,Math.min(100,+a||0))/100;
const driftR=r=>Math.max(0,Math.min(1,+r||0))*2-1;
// how many cents a voice strays: ±DRIFT.cents at the top of the knob, nothing at all at the bottom
function driftCents(amount,r){return driftR(r)*DRIFT.cents*driftAmt(amount)}
// what a voice's filter cutoff is multiplied by: always a positive number near 1, so a note is never lost
function driftCutoff(amount,r){return 1+driftR(r)*DRIFT.cutoff*driftAmt(amount)}
/* Chorus. A shared stereo chorus bus: three short delay lines, each one slowly modulated by its own LFO
   and panned across the field, that every synth layer can send into. A delay line that moves bends the
   pitch of whatever runs through it, so a chorus is only ever allowed to move a note by a few cents —
   the same rule analog drift lives by, and for the same reason: the scale lock holds at any setting. */
const CHORUS={mix:0.9,maxDelay:0.06,maxCents:25,voices:[
  {delay:0.0115,rate:0.24,depth:0.0026,pan:-0.75},
  {delay:0.0178,rate:0.31,depth:0.0021,pan:0.75},
  {delay:0.0242,rate:0.17,depth:0.0028,pan:0},
]};
// the furthest a chorus voice ever pushes a note, in cents: the delay time moves at depth·2π·rate at its
// steepest, and a delay line that is stretching or shrinking that fast bends the pitch by exactly that much
function chorusCents(v){return 1200*Math.log2(1+Math.abs(v.depth*2*Math.PI*v.rate))}

/* Warmth. One knob on the master that drives a soft-clip waveshaper and rolls the top end off a little
   with a high shelf, the way pushing a mix through tape or a valve does: the quiet half of the signal
   comes up, the peaks round over instead of cornering, and the air comes down a shade so it never turns
   brittle. At 0 the curve is thrown away entirely and the shelf is flat, so warmth off is a true bypass. */
const WARMTH={drive:2.6,shelfHz:3200,shelfDb:-5,trim:0.15,points:1024,dflt:22};
const warmthAmt=v=>Math.max(0,Math.min(100,+v||0))/100;
const warmthDrive=v=>warmthAmt(v)*WARMTH.drive;
// the soft clip itself, normalised so that ±1 in is ±1 out: it can lift a signal but never push it past
// full scale, and it is odd-symmetric, so it colours a waveform without ever moving its centre
function warmthShape(x,v){
  x=Math.max(-1,Math.min(1,+x||0));const d=warmthDrive(v);
  return d>0?Math.tanh(d*x)/Math.tanh(d):x;
}
function warmthCurve(v){
  if(!(warmthDrive(v)>0))return null; // null is a WaveShaper's own bypass: the signal passes untouched
  const n=WARMTH.points,c=new Float32Array(n);
  for(let i=0;i<n;i++)c[i]=warmthShape(i/(n-1)*2-1,v);
  return c;
}
const warmthShelf=v=>warmthAmt(v)*WARMTH.shelfDb;      // dB on the high shelf: never boosts, only rolls off
const warmthTrim=v=>1-warmthAmt(v)*WARMTH.trim;        // a little off the level, since the soft clip adds some

/* Master EQ. Three bands across the whole mix — a low shelf under it, a peak through the middle, a shelf
   over the top — each a knob from −100 (a full cut) through 0 (flat) to +100 (a full boost). A tone control
   is only worth having if it cannot wreck the mix, so the EQ keeps its own headroom: a modest move is
   exactly what you asked for, and past EQ.headDb of boost anywhere it takes the difference straight back off
   the level. However hard the three bands are pushed, the mix can never come out more than those few
   decibels louder than flat — which the limiter already has in hand — and reaching for a band past that
   point shapes the mix instead of just turning it up. Flat across all three is a true bypass: a biquad at
   0 dB has the same numerator and denominator, so it passes a signal through untouched. */
const EQ={bands:['low','mid','high'],
  TYPE:{low:'lowshelf',mid:'peaking',high:'highshelf'},
  HZ:{low:160,mid:1000,high:4200},Q:{mid:0.9},
  LABEL:{low:'Low',mid:'Mid',high:'High'},
  SAYS:{low:'the weight underneath — the kick and the bass',mid:'the body, where the chords and the lead sing',high:'the air on top — hats, and the shine on the lead'},
  maxDb:9,headDb:3,slack:0.01,sr:48000,probes:192,refine:64};
const eqAmt=v=>{v=Math.round(+v);return isNaN(v)?0:Math.max(-100,Math.min(100,v))};
const eqDb=v=>eqAmt(v)/100*EQ.maxDb;
function normEq(e){const o={};for(const b of EQ.bands)o[b]=eqAmt(e&&e[b]);return o}
const eqFlat=e=>EQ.bands.every(b=>eqDb(e&&e[b])===0);
// One band as its biquad coefficients — the same ones the Web Audio filter of that type uses (RBJ cookbook,
// shelves at S=1) — so what the check measures here is what the master bus actually does to the mix.
function eqCoefs(band,db,sr){
  const w=2*Math.PI*EQ.HZ[band]/(sr||EQ.sr),cw=Math.cos(w),sw=Math.sin(w),A=Math.pow(10,db/40);
  if(EQ.TYPE[band]==='peaking'){const al=sw/(2*EQ.Q[band]);
    return {b0:1+al*A,b1:-2*cw,b2:1-al*A,a0:1+al/A,a1:-2*cw,a2:1-al/A}}
  const al=sw/2*Math.SQRT2,ap=A+1,am=A-1,ta=2*Math.sqrt(A)*al;
  if(EQ.TYPE[band]==='lowshelf')
    return {b0:A*(ap-am*cw+ta),b1:2*A*(am-ap*cw),b2:A*(ap-am*cw-ta),a0:ap+am*cw+ta,a1:-2*(am+ap*cw),a2:ap+am*cw-ta};
  return {b0:A*(ap+am*cw+ta),b1:-2*A*(am+ap*cw),b2:A*(ap+am*cw-ta),a0:ap-am*cw+ta,a1:2*(am-ap*cw),a2:ap-am*cw-ta};
}
// the magnitude of one band at a frequency, in dB: |H(e^jw)| of its biquad
function biquadDb(c,w){
  const c1=Math.cos(w),s1=Math.sin(w),c2=Math.cos(2*w),s2=Math.sin(2*w);
  const nr=c.b0+c.b1*c1+c.b2*c2,ni=-(c.b1*s1+c.b2*s2),dr=c.a0+c.a1*c1+c.a2*c2,di=-(c.a1*s1+c.a2*s2);
  return 20*Math.log10(Math.max(1e-9,Math.sqrt(nr*nr+ni*ni))/Math.max(1e-9,Math.sqrt(dr*dr+di*di)));
}
// the bands that are actually doing something, as coefficients worked out once and then swept across the
// spectrum: a band sitting at 0 dB is left out entirely, which is what makes a flat EQ an exact bypass
function eqCurve(e,sr){const out=[];for(const b of EQ.bands){const db=eqDb(e&&e[b]);if(db)out.push(eqCoefs(b,db,sr))}return out}
const curveDb=(cs,hz,sr)=>{const w=2*Math.PI*hz/(sr||EQ.sr);let db=0;for(const c of cs)db+=biquadDb(c,w);return db};
function eqBandDb(band,v,hz,sr){const db=eqDb(v);return db?biquadDb(eqCoefs(band,db,sr),2*Math.PI*hz/(sr||EQ.sr)):0}
const eqBandsDb=(e,hz,sr)=>curveDb(eqCurve(e,sr),hz,sr);
// the most the three bands together add at any one frequency: a sweep of everything you can hear, then a
// closer look either side of the loudest point, so the answer is the real peak and not a grid's nearest
// guess — the trim below is built on it, and a peak read low would let the mix through louder than promised
const eqHzAt=x=>20*Math.pow(1000,x);
const EQ_PROBES=(()=>{const a=[];for(let i=0;i<=EQ.probes;i++)a.push(eqHzAt(i/EQ.probes));return a})();
// the sweep is the same answer for the same three knobs, and the UI asks for it on every drag of a slider,
// so the last one is kept: a pure function, memoised, nothing more
let eqMemo={key:null,sr:0,db:0};
function eqPeakDb(e,sr){
  const rate=sr||EQ.sr,key=EQ.bands.map(b=>eqAmt(e&&e[b])).join(',');
  if(eqMemo.key===key&&eqMemo.sr===rate)return eqMemo.db;
  const cs=eqCurve(e,rate);
  let peak=0,best=0;
  if(cs.length){
    for(let i=0;i<EQ_PROBES.length;i++){const db=curveDb(cs,EQ_PROBES[i],rate);if(db>peak){peak=db;best=i/EQ.probes}}
    if(peak>0){
      const lo=Math.max(0,best-1/EQ.probes),hi=Math.min(1,best+1/EQ.probes),m=EQ.refine;
      for(let i=0;i<=m;i++)peak=Math.max(peak,curveDb(cs,eqHzAt(lo+(hi-lo)*i/m),rate));
    }else peak=0;
  }
  eqMemo={key,sr:rate,db:peak};return peak;
}
// the level taken back off the master after the bands: whatever the boost is past the headroom the EQ keeps,
// plus a hair for the sweep's own margin of error, so the promise holds at every frequency and not just the
// ones that were looked at. Below that there is no trim at all — a modest move is exactly what was asked for.
const eqTrimDb=(e,sr)=>-Math.max(0,eqPeakDb(e,sr)+EQ.slack-EQ.headDb);
const eqTrim=(e,sr)=>Math.pow(10,eqTrimDb(e,sr)/20);
const eqNetDb=(e,hz,sr)=>eqBandsDb(e,hz,sr)+eqTrimDb(e,sr);

/* Glide. The bass can slide from the note before into the note it is playing — portamento, the sound of a
   finger sliding up a string or a mono synth being played legato. A slide bends pitch, so the scale lock
   sets its terms: it always arrives exactly on the note it was heading for, it is never longer than
   GLIDE.maxSec, and it never takes more than GLIDE.maxFrac of the note, so every note spends most of its
   life dead on pitch. Only notes close together slide — more than GLIDE.gap apart and the bass simply
   plays the new note, the way a player lifts their hand between phrases. */
const GLIDE={maxSec:0.22,maxFrac:0.45,gap:1.2};
const glideAmt=v=>Math.max(0,Math.min(100,+v||0))/100;
// how long the slide into a note lasts, in seconds: nothing at all at the bottom of the knob
function glideSec(amount,durSec){
  const a=glideAmt(amount);if(!(a>0))return 0;
  const d=(durSec===undefined||!(durSec>0))?1:durSec;
  return Math.min(GLIDE.maxSec*a,d*GLIDE.maxFrac);
}
// where a slide has got to, a fraction of the way through: an exponential ramp in frequency is a straight
// line in semitones, so a glide crosses the interval evenly and can never overshoot either end of it
function glideMidi(from,to,frac){const f=Math.max(0,Math.min(1,+frac||0));return from+(to-from)*f}

/* Vibrato. The lead can be given a vibrato that waits a moment and then fades in, the way a singer or a
   string player leans into a note they are holding: a short note stays perfectly straight, a long one comes
   alive. Depth is in cents and rate in hertz, and the depth is capped so that everything that can bend a
   sounding note — drift, the chorus and a full vibrato together — still comes to less than a semitone. */
const VIB={cents:26,rateLo:2.2,rateHi:7.2,onset:0.28,fade:0.35};
const vibAmt=v=>Math.max(0,Math.min(100,+v||0))/100;
const vibCents=d=>vibAmt(d)*VIB.cents;                       // the swing either way, at full depth
const vibRateHz=r=>VIB.rateLo+vibAmt(r)*(VIB.rateHi-VIB.rateLo);
// a note shorter than the onset never gets any vibrato at all, so a fast line stays straight
const vibrates=(depth,durSec)=>vibCents(depth)>0&&(durSec===undefined||durSec>VIB.onset);

// the gain a plan holds t seconds into its section, read exactly as the audio parameter reads it: a value
// holds until the next point, and an exponential curve runs into a ramped one. The MIDI export samples this.
function fadeGain(plan,t){
  if(!plan||!plan.length)return FADE.full;
  if(t<=plan[0].t)return plan[0].g;
  for(let i=1;i<plan.length;i++){
    const a=plan[i-1],b=plan[i];
    if(t>=b.t)continue;
    if(!b.ramp)return a.g;
    return a.g*Math.pow(b.g/a.g,(t-a.t)/(b.t-a.t||1));
  }
  return plan[plan.length-1].g;
}
/* Tap tempo. You tap the pulse you have in your head and Zinth takes the tempo from you. Only the gaps that
   could be a pulse count — a tap after a long pause starts a fresh set rather than averaging across the
   pause — and only the last few of them, so speeding up or slowing down is followed rather than averaged
   away. A pulse tapped at half or double the speed of the slider's range is folded back into it, so tapping
   slow half-notes or fast eighths still lands on a tempo the app can play. The answer is always a whole
   number of beats per minute inside the slider, which is the only thing that reaches the song. */
const TAP={min:60,max:180,keep:5,gap:2.5,minGap:0.1};
const bpmIn=b=>Math.max(TAP.min,Math.min(TAP.max,Math.round(b)));
function tapBpm(times){
  if(!Array.isArray(times)||times.length<2)return 0;
  const gaps=[];
  for(let i=1;i<times.length;i++){const g=+times[i]-+times[i-1];if(g>=TAP.minGap&&g<=TAP.gap)gaps.push(g)}
  if(!gaps.length)return 0;
  const use=gaps.slice(-TAP.keep),avg=use.reduce((a,b)=>a+b,0)/use.length;
  if(!(avg>0))return 0;
  let bpm=60/avg;
  // a pulse tapped half or double time is folded back into the range rather than refused
  for(let i=0;i<8&&bpm<TAP.min;i++)bpm*=2;
  for(let i=0;i<8&&bpm>TAP.max;i++)bpm/=2;
  return bpmIn(bpm);
}
const nudgeBpm=(bpm,by)=>bpmIn((+bpm||TAP.min)+(+by||0));
/* Count-in. Arming Rec from a standing start gives you one bar of clicks before the song comes in, so you
   can hear the tempo and come in on the one. It is one bar at the current tempo exactly — the clicks land on
   the beats and the last of them is a beat before the song starts, so nothing of the count-in overlaps the
   first step of the song. It is a way into a take, not part of the song: no note comes from it, and neither
   the WAV nor the MIDI export has any of it in them. */
const COUNTIN={beats:4,steps:STEPS};
function countInPlan(stepSec){
  const d=+stepSec;
  if(!(d>0))return null;
  const beats=[];
  for(let b=0;b<COUNTIN.beats;b++)beats.push({beat:b,step:b*4,t:b*4*d});
  return {beats,dur:COUNTIN.steps*d};
}

/* ================= shareable links =================
   A whole song in a URL. The hash carries the very same project snapshot Save writes, as JSON in base64url:
   no compression, no library, nothing to install, and nothing between the link and the song but the address
   bar. Two things keep a link short enough to paste anywhere. A project is canonicalised first — notes, drum
   rows, sections and sounds all normalised the way the app itself reads them, and written in their shortest
   honest form: a note is [step, length, pitch, velocity], a drum row is only the hits that are in it, a
   section that is exactly its type is just that type's name. Then everything still sitting at its default is
   left out altogether and put back on the way in, so a fresh track is a few hundred characters and a whole
   demo song with its own chords, drums and hook is a couple of thousand.
   Because both ends of the journey run through linkNorm, a link round-trips exactly: what comes back out of
   one is the same project, note for note, which is what the theory check proves over every demo song. */
const LINK={v:2,hash:'#z=',maxBytes:8192,lanes:['lead','arp','bass'],
  fields:['part','bars','energy','transpose','hook','double','sweep','fade'],
  dflt:{mood:'chill',root:0,scale:'dorian',bpm:112,energy:55,swing:12,gate:0.7,warmth:WARMTH.dflt,
    kit:'808',sel:0,layer:'lead',recTarget:'lead',master:80}};
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// UTF-8 and base64url by hand: a link must survive an address bar, an email and a chat window, and it must
// mean the same thing in a browser and in the headless check, so neither end depends on anything but JSON.
function utf8Bytes(s){
  const out=[];
  for(let i=0;i<s.length;i++){
    let c=s.charCodeAt(i);
    if(c>=0xd800&&c<=0xdbff&&i+1<s.length){const d=s.charCodeAt(i+1);if(d>=0xdc00&&d<=0xdfff){c=0x10000+((c-0xd800)<<10)+(d-0xdc00);i++}}
    if(c<0x80)out.push(c);
    else if(c<0x800)out.push(0xc0|(c>>6),0x80|(c&63));
    else if(c<0x10000)out.push(0xe0|(c>>12),0x80|((c>>6)&63),0x80|(c&63));
    else out.push(0xf0|(c>>18),0x80|((c>>12)&63),0x80|((c>>6)&63),0x80|(c&63));
  }
  return out;
}
function bytesUtf8(b){
  let s='';
  for(let i=0;i<b.length;){
    const c=b[i++];let u;
    if(c<0x80)u=c; else if(c<0xe0)u=((c&31)<<6)|(b[i++]&63);
    else if(c<0xf0)u=((c&15)<<12)|((b[i++]&63)<<6)|(b[i++]&63);
    else u=((c&7)<<18)|((b[i++]&63)<<12)|((b[i++]&63)<<6)|(b[i++]&63);
    if(u>0xffff){u-=0x10000;s+=String.fromCharCode(0xd800+(u>>10),0xdc00+(u&1023))}else s+=String.fromCharCode(u);
  }
  return s;
}
function b64url(bytes){
  let s='';
  for(let i=0;i<bytes.length;i+=3){
    const a=bytes[i],b=bytes[i+1],c=bytes[i+2],n=(a<<16)|((b||0)<<8)|(c||0);
    s+=B64[(n>>18)&63]+B64[(n>>12)&63]+(b===undefined?'':B64[(n>>6)&63])+(c===undefined?'':B64[n&63]);
  }
  return s;
}
function unb64url(str){
  const out=[];let n=0,bits=0;
  for(let i=0;i<str.length;i++){
    const v=B64.indexOf(str.charAt(i));if(v<0)return null;
    n=(n<<6)|v;bits+=6;
    if(bits>=8){bits-=8;out.push((n>>bits)&255)}
  }
  return out.length?out:null;
}
const linkInt=(v,a,b,d)=>{const n=Math.round(+v);return isFinite(n)?Math.max(a,Math.min(b,n)):d};
const linkNum=(v,a,b,d)=>{const n=+v;return isFinite(n)?Math.max(a,Math.min(b,n)):d};
// velocities are written to a ten-thousandth: far finer than anything you could hear, and it keeps a drum
// row from spending twenty characters on the tail of a floating-point number
const r4=v=>Math.round(v*1e4)/1e4;
const linkLayers=()=>(window.Z&&window.Z.LAYERS)||['lead','arp','chords','bass','drums'];
// a note as the app stores it, from either form: an object from a project or a [step,dur,midi,vel] tuple
function normNotes(list){
  if(!Array.isArray(list))return null;
  const out=[];
  for(const x of list){
    const e=Array.isArray(x)?{step:x[0],dur:x[1],midi:x[2],vel:x[3]}:(x||{});
    const step=Math.round(+e.step),dur=Math.round(+e.dur),midi=Math.round(+e.midi);
    if(!(step>=0&&step<TOTAL)||!(dur>=1)||!(midi>=0&&midi<=127))continue;
    out.push({step,dur,midi,vel:r4(+e.vel>0?Math.min(1,+e.vel):0.85)});
  }
  out.sort((a,b)=>a.step-b.step||a.midi-b.midi);
  return out;
}
// a section as the arranger holds it: its type's own settings, with whatever the project changed on top
function normSection(sec){
  const type=typeof sec==='string'?sec:(sec&&sec.type),s=sectionOf(type),o=(sec&&typeof sec==='object')?sec:{};
  if(o.part==='v'||o.part==='c')s.part=o.part;
  s.bars=linkInt(o.bars,1,64,s.bars);
  s.energy=linkInt(o.energy,-100,100,s.energy);
  s.transpose=linkInt(o.transpose,-12,12,s.transpose);
  if(o.hook!==undefined)s.hook=!!o.hook;
  if(o.double!==undefined)s.double=!!o.double;
  if(SWEEP_MODES.indexOf(o.sweep)>=0)s.sweep=o.sweep;
  if(FADE_MODES.indexOf(o.fade)>=0)s.fade=o.fade;
  for(const L in s.layers){const v=o.layers&&o.layers[L];if(v!==undefined)s.layers[L]=v==='lite'?'lite':(v?1:0)}
  return s;
}
// the one shape everything here agrees on: a project with every field filled in and every value in range,
// so a project and the link made from it can be compared note for note
function linkNorm(p){
  const s=(p&&p.state)||{},L=linkLayers(),D=LINK.dflt,txt=(v,d)=>typeof v==='string'&&v?v:d;
  const seeds={},locks={};
  for(const k of L){seeds[k]=String((s.seeds&&s.seeds[k])||'');locks[k]=!!(s.locks&&s.locks[k])}
  const scale=SCALES[s.scale]?s.scale:D.scale,n=chordScaleOf(scale).steps.length;
  const pair=(o,f)=>({v:f(o&&o.v)||null,c:f(o&&o.c)||null});
  const sections=(Array.isArray(s.sections)&&s.sections.length?s.sections:DEFAULT_FORM).map(normSection);
  const st={seeds,locks,mood:txt(s.mood,D.mood),root:linkInt(s.root,0,11,D.root),scale,
    bpm:linkInt(s.bpm,60,180,D.bpm),energy:linkInt(s.energy,0,100,D.energy),swing:linkInt(s.swing,0,60,D.swing),
    evolve:s.evolve!==false,sevenths:!!s.sevenths,gate:(+s.gate>0&&+s.gate<=1)?+s.gate:D.gate,
    warmth:linkNum(s.warmth,0,100,D.warmth),eq:normEq(s.eq),arp:normArp(s.arp),
    prog:pair(s.prog,x=>normProg(x,n)),
    drumEdits:pair(s.drumEdits,x=>{if(!x)return null;const P=normDrumPattern(x);for(const k of DRUM_KINDS)P[k]=P[k].map(r4);return P}),
    kit:txt(s.kit,D.kit),transitions:s.transitions!==false,countIn:s.countIn!==false,sections,
    sel:linkInt(s.sel,0,sections.length-1,D.sel),
    layer:(L.indexOf(s.layer)>=0||s.layer==='master')?s.layer:D.layer,
    recTarget:LINK.lanes.indexOf(s.recTarget)>=0?s.recTarget:D.recTarget};
  for(const lane of LINK.lanes)st[lane+'Edits']=pair(s[lane+'Edits'],normNotes);
  const DEF=(window.Z&&window.Z.DEFAULTS)||{},params={};
  for(const k of L){
    const d=DEF[k]||{},src=(p&&p.params&&p.params[k])||{},o={};
    for(const f in d){const v=src[f],t=typeof d[f];
      o[f]=t==='boolean'?(v===undefined?d[f]:!!v):t==='number'?linkNum(v,-1e6,1e6,d[f]):txt(v,d[f])}
    params[k]=o;
  }
  return {app:'zinth',v:2,state:st,params,master:linkNum(p&&p.master,0,100,D.master)};
}
/* Everything below turns that canonical project into the shortest honest JSON and back again. A value that
   is absent from a link is a value that was still at its default, so leaving it out costs nothing. */
const slimNotes=list=>list.map(e=>[e.step,e.dur,e.midi,e.vel]);
const slimProg=list=>list.map(e=>(e.bars===undefined&&e.seventh===undefined&&e.inv===undefined)?e.d:e);
function slimDrum(P){
  const o={};if(P.fill===false)o.f=0;
  for(const k of DRUM_KINDS){const hits=[];P[k].forEach((v,i)=>{if(v>0)hits.push([i,v])});if(hits.length)o[k]=hits}
  return o;
}
function fatDrum(d){
  const P={fill:!(d&&d.f===0)};
  for(const k of DRUM_KINDS){const row=new Array(16).fill(0);
    ((d&&Array.isArray(d[k]))?d[k]:[]).forEach(h=>{const i=Math.round(h&&h[0]),v=+(h&&h[1]);if(i>=0&&i<16&&v>0)row[i]=Math.min(1,v)});
    P[k]=row}
  return P;
}
function slimSection(sec){
  const base=sectionOf(sec.type),diff={},eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  for(const k of LINK.fields)if(!eq(sec[k],base[k]))diff[k]=sec[k];
  const lay={};for(const L in base.layers)if(sec.layers[L]!==base.layers[L])lay[L]=sec.layers[L];
  if(Object.keys(lay).length)diff.layers=lay;
  return Object.keys(diff).length?[sec.type,diff]:sec.type;
}
const fatSection=x=>Array.isArray(x)?Object.assign({type:x[0]},x[1]||{}):x;
function linkSlim(p){
  const c=linkNorm(p),s=c.state,D=LINK.dflt,L=linkLayers(),st={},out={z:LINK.v};
  const seeds=L.map(k=>s.seeds[k]);
  st.seeds=seeds.every(x=>x===seeds[0])?seeds[0]:seeds;
  const locked=L.filter(k=>s.locks[k]);if(locked.length)st.locks=locked;
  for(const k of ['mood','root','scale','bpm','energy','swing','gate','warmth','kit','sel','layer','recTarget'])
    if(s[k]!==D[k])st[k]=s[k];
  if(!s.evolve)st.evolve=false;
  if(s.sevenths)st.sevenths=true;
  if(!s.transitions)st.transitions=false;
  if(!s.countIn)st.countIn=false;
  if(!eqFlat(s.eq))st.eq=s.eq;
  const A=normArp(null);if(s.arp.mode!==A.mode||s.arp.octaves!==A.octaves||s.arp.gate!==A.gate)st.arp=s.arp;
  const pair=(o,f)=>{const r={};if(o.v)r.v=f(o.v);if(o.c)r.c=f(o.c);return Object.keys(r).length?r:null};
  const put=(k,v)=>{if(v)st[k]=v};
  put('prog',pair(s.prog,slimProg));
  put('drumEdits',pair(s.drumEdits,slimDrum));
  for(const lane of LINK.lanes)put(lane+'Edits',pair(s[lane+'Edits'],slimNotes));
  const form=s.sections.map(slimSection);
  if(JSON.stringify(form)!==JSON.stringify(DEFAULT_FORM))st.sections=form;
  out.s=st;
  const DEF=(window.Z&&window.Z.DEFAULTS)||{},pm={};
  for(const k of L){const d=DEF[k]||{},o={};for(const f in d)if(c.params[k][f]!==d[f])o[f]=c.params[k][f];
    if(Object.keys(o).length)pm[k]=o}
  if(Object.keys(pm).length)out.p=pm;
  if(c.master!==D.master)out.m=c.master;
  return out;
}
function linkFat(o){
  const s=(o&&o.s)||{},L=linkLayers(),seeds={},locks={};
  L.forEach((k,i)=>seeds[k]=Array.isArray(s.seeds)?s.seeds[i]:s.seeds);
  (Array.isArray(s.locks)?s.locks:[]).forEach(k=>{locks[k]=true});
  const pair=(x,f)=>({v:(x&&x.v)?f(x.v):null,c:(x&&x.c)?f(x.c):null});
  const st=Object.assign({},s,{seeds,locks,prog:pair(s.prog,x=>x),drumEdits:pair(s.drumEdits,fatDrum),
    sections:Array.isArray(s.sections)?s.sections.map(fatSection):null});
  for(const lane of LINK.lanes)st[lane+'Edits']=pair(s[lane+'Edits'],x=>x);
  return linkNorm({app:'zinth',v:2,state:st,params:o&&o.p,master:o&&o.m});
}
const linkEncode=p=>b64url(utf8Bytes(JSON.stringify(linkSlim(p))));
// what a link says, from a bare code, a hash or a whole URL — and nothing at all from anything else
function linkPayload(str){
  let s=String(str==null?'':str).trim();
  const i=s.indexOf(LINK.hash);
  if(i>=0)s=s.slice(i+LINK.hash.length);
  else if(s.slice(0,3)==='#z=')s=s.slice(3);
  else if(s.slice(0,2)==='z=')s=s.slice(2);
  return /^[A-Za-z0-9_-]{8,}$/.test(s)?s:null;
}
function linkDecode(str){
  const code=linkPayload(str);if(!code)return null;
  const bytes=unb64url(code);if(!bytes)return null;
  let o=null;try{o=JSON.parse(bytesUtf8(bytes))}catch(e){return null}
  if(!o||typeof o!=='object'||!(o.z>=1)||!o.s)return null;
  try{return linkFat(o)}catch(e){return null}
}
const linkHash=p=>LINK.hash+linkEncode(p);

function generateTrack(cfg,seeds,part,loop){
  const clamp=v=>Math.max(0,Math.min(100,v));
  cfg=Object.assign({},cfg,{energy:clamp(cfg.energy)});
  const leadCfg=Object.assign({},cfg,{energy:clamp(cfg.leadEnergy!==undefined?cfg.leadEnergy:cfg.energy)});
  const chords=generateChords(cfg,new Rng(seeds.chords+':c:'+part));
  const rngA=new Rng(seeds.lead+':'+part),rngB=new Rng(seeds.lead+':'+part+':b'+(cfg.evolve?loop:0));
  // notes drawn in the roll or recorded from the keys replace a generated layer (shifted with the section's key)
  const shift=cfg.transpose||0;
  const edited=(list,fold)=>list.map(e=>{const m=e.midi+shift;return {step:e.step,dur:e.dur,midi:fold?fold(m):m,vel:e.vel||0.85}}).filter(e=>e.step>=0&&e.step<TOTAL);
  const lead=cfg.leadEvents?edited(cfg.leadEvents):generateLead(leadCfg,chords,rngA,rngB);
  const arp=cfg.arpEvents?edited(cfg.arpEvents):generateArp(cfg,chords,new Rng(seeds.arp+':'+part));
  const bass=cfg.bassEvents?edited(cfg.bassEvents,bassRegister):generateBass(cfg,chords,new Rng(seeds.bass+':'+part));
  const drumPattern=normDrumPattern(cfg.drumPattern||generateDrumPattern(cfg,new Rng(seeds.drums+':'+part)));
  const drums=expandDrums(drumPattern,BARS);
  const chordEvs=chords.map(c=>({step:c.bar0*STEPS,dur:c.bars*STEPS,notes:c.notes,vel:0.8}));
  const byStep={lead:[],arp:[],chords:[],bass:[],drums:[]};
  for(let s=0;s<TOTAL;s++){for(const k in byStep)byStep[k][s]=[]}
  lead.forEach(e=>byStep.lead[e.step].push(e));arp.forEach(e=>byStep.arp[e.step].push(e));
  chordEvs.forEach(e=>byStep.chords[e.step].push(e));bass.forEach(e=>byStep.bass[e.step].push(e));
  drums.forEach(e=>byStep.drums[e.step].push(e));
  return {chords,lead,arp,chordEvs,bass,drums,drumPattern,byStep};
}
window.Z=Object.assign(window.Z||{},{Rng,randomSeed,NOTE_NAMES,SCALES,SCALE_GROUPS,STEPS,BARS,TOTAL,DRUM_KINDS,PERC,PERC_VOICES,PERC_GM,normDrumPattern,BASS_LO,BASS_HI,generateTrack,generateDrumPattern,scalePitches,lanePitches,chordAt,buildChord,chordInfo,romanFor,chordScaleOf,bassRegister,arpRange,recordPitch,normProg,
  SEC_TYPES,DEFAULT_FORM,sectionOf,
  ARP,ARP_MODES,ARP_FIGURES,normArp,arpOctaves,arpGate,arpDur,arpNotes,arpIndex,progCode,parseProgCode,SWEEP,SWEEP_MODES,sweepPlan,FADE,FADE_MODES,fadePlan,fadeGain,DRIFT,driftCents,driftCutoff,
  CHORUS,chorusCents,WARMTH,warmthAmt,warmthDrive,warmthShape,warmthCurve,warmthShelf,warmthTrim,
  EQ,eqAmt,eqDb,normEq,eqFlat,eqCoefs,eqCurve,eqBandDb,eqBandsDb,eqPeakDb,eqTrimDb,eqTrim,eqNetDb,
  GLIDE,glideSec,glideMidi,VIB,vibCents,vibRateHz,vibrates,TAP,tapBpm,nudgeBpm,COUNTIN,countInPlan,
  LINK,normNotes,normSection,linkNorm,linkSlim,linkFat,linkEncode,linkDecode,linkPayload,linkHash});
})();
