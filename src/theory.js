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
const SCALES={
  major:     {name:'Major',            steps:[0,2,4,5,7,9,11], progs:[[0,4,5,3],[0,5,3,4],[5,3,0,4],[0,3,4,3],[0,3,5,4],[1,4,0,0],[0,2,5,3],[3,4,5,0]]},
  minor:     {name:'Natural minor',    steps:[0,2,3,5,7,8,10], progs:[[0,5,2,6],[0,6,5,6],[0,3,5,4],[0,5,3,4],[5,6,0,0],[0,2,6,5],[3,0,5,6],[0,5,0,6]]},
  dorian:    {name:'Dorian',           steps:[0,2,3,5,7,9,10], progs:[[0,3,0,3],[0,3,6,3],[0,1,3,0],[0,6,3,0],[0,3,1,0],[0,1,0,3]]},
  phrygian:  {name:'Phrygian',         steps:[0,1,3,5,7,8,10], progs:[[0,1,0,1],[0,1,5,1],[0,6,5,1],[0,2,1,0]]},
  lydian:    {name:'Lydian',           steps:[0,2,4,6,7,9,11], progs:[[0,1,0,1],[0,1,4,1],[0,4,1,0],[0,1,2,1]]},
  mixolydian:{name:'Mixolydian',       steps:[0,2,4,5,7,9,10], progs:[[0,6,3,0],[0,6,0,6],[0,3,6,0],[4,6,0,0],[0,4,6,3]]},
  harmMinor: {name:'Harmonic minor',   steps:[0,2,3,5,7,8,11], progs:[[0,3,4,0],[0,5,4,0],[0,4,0,4],[3,0,4,0],[0,5,3,4]]},
  pentMajor: {name:'Major pentatonic', steps:[0,2,4,7,9],      chord:'major'},
  pentMinor: {name:'Minor pentatonic', steps:[0,3,5,7,10],     chord:'minor'},
  blues:     {name:'Blues',            steps:[0,3,5,6,7,10],   chord:'minor', passing:[6]},
  hirajoshi: {name:'Hirajoshi',        steps:[0,2,3,7,8],      chord:'minor'},
  insen:     {name:'In-sen',           steps:[0,1,5,7,10],     chord:'phrygian'},
  wholeTone: {name:'Whole tone',       steps:[0,2,4,6,8,10],   progs:[[0,1,2,1],[0,2,4,2],[0,1,0,2]]},
};
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
  if(sev!==undefined){ if(q==='maj'&&sev===11)suffix='maj7'; else if(q==='maj'&&sev===10)suffix='7'; else if(q==='min'&&sev===10)suffix='m7'; else suffix+='7'; }
  return {quality:q,name:NOTE_NAMES[((notes[0]%12)+12)%12]+suffix};
}
function romanFor(degree,quality,size){
  let r=ROMAN[degree]||String(degree+1);
  if(quality==='min'||quality==='dim')r=r.toLowerCase();
  if(quality==='dim')r+='°'; if(quality==='aug')r+='+'; if(size>3)r+='⁷';
  return r;
}

/* ================= generation ================= */
const STEPS=16,BARS=8,TOTAL=STEPS*BARS;
const DRUM_KINDS=['kick','snare','clap','hat','ohat'];

function generateChords(cfg,rng){
  const cs=chordScaleOf(cfg.scale);
  const degrees=(cfg.prog&&cfg.prog.length?cfg.prog.filter(d=>d>=0&&d<cs.steps.length).slice(0,BARS):[]);
  if(!degrees.length)degrees.push(...rng.pick(cs.progs));
  const size=cfg.sevenths?4:3;
  const rootMidi=(cfg.root>=6?48:60)+cfg.root;
  const n=degrees.length,baseBars=Math.floor(BARS/n),extra=BARS-baseBars*n;let bar=0;
  let prev=null;
  return degrees.map((deg,i)=>{
    const bars=baseBars+(i<extra?1:0),bar0=bar;bar+=bars;
    const base=buildChord(cs.steps,deg,size,rootMidi);
    const info=chordInfo(base);
    const rootPc=base[0]%12,fifthPc=base[2]%12;
    let notes=base;
    if(prev){ // voice leading: least movement from the previous voicing, near the home register
      let best=null,bd=1e9;
      for(let inv=0;inv<size;inv++)for(const oct of [-12,0]){
        const v=base.map((m,k)=>(k<inv?m+12:m)+oct).sort((a,b)=>a-b);
        if(new Set(v).size!==v.length)continue;
        const mean=v.reduce((a,b)=>a+b,0)/v.length;
        let d=0;v.forEach((m,k)=>{d+=Math.abs(m-prev[Math.min(k,prev.length-1)])});
        d+=Math.max(0,Math.abs(mean-(rootMidi+6))-6)*2;
        if(d<bd){bd=d;best=v}
      }
      notes=best;
    }
    prev=notes;
    return {degree:deg,notes,rootPc,fifthPc,name:info.name,roman:romanFor(deg,info.quality,size),bar0,bars,pcs:new Set(notes.map(m=>m%12))};
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
function generateArp(cfg,chords,rng){
  const energy=cfg.energy/100;
  const mode=rng.pick(['up','up','down','updown','random']);
  const rate=energy>0.62?1:2,wide=rng.chance(0.5),rest=energy<0.35?rng.pick([0,4]):0;
  const out=[];let k=0;
  for(let s=0;s<TOTAL;s+=rate){
    const ch=chordAt(chords,s);
    let notes=ch.notes.map(m=>m+12);if(wide)notes=notes.concat(ch.notes.map(m=>m+24));
    if(rest&&(k%rest)===rest-1){k++;continue}
    let i;const L=notes.length;
    if(mode==='up')i=k%L;else if(mode==='down')i=L-1-(k%L);
    else if(mode==='updown'){const c=2*L-2;const j=k%c;i=j<L?j:c-j}
    else i=rng.int(L);
    out.push({step:s,dur:Math.max(1,Math.round(rate*0.7)),midi:notes[i],vel:(s%4===0?0.8:0.55)+rng.next()*0.1});
    k++;
  }
  return out;
}
// the bass always sounds in its own register; an edited note is folded by octaves, so its pitch class stays
const BASS_LO=36,BASS_HI=59;
function bassRegister(m){while(m<BASS_LO)m+=12;while(m>BASS_HI)m-=12;return m}
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
  return P;
}
function expandDrums(P,bars){
  const out=[];
  for(let bar=0;bar<bars;bar++){
    const s0=bar*STEPS,fill=P.fill&&bar===bars-1;
    for(const k of DRUM_KINDS)for(let o=0;o<16;o++){const v=P[k][o];if(!v)continue;if(fill&&o>=12&&(k==='hat'||k==='ohat'))continue;out.push({step:s0+o,kind:k,vel:v})}
    if(fill)[12,13,14,15].forEach((o,i)=>out.push({step:s0+o,kind:'snare',vel:0.5+i*0.15}));
  }
  return out;
}
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
  const drumPattern=cfg.drumPattern||generateDrumPattern(cfg,new Rng(seeds.drums+':'+part));
  const drums=expandDrums(drumPattern,BARS);
  const chordEvs=chords.map(c=>({step:c.bar0*STEPS,dur:c.bars*STEPS,notes:c.notes,vel:0.8}));
  const byStep={lead:[],arp:[],chords:[],bass:[],drums:[]};
  for(let s=0;s<TOTAL;s++){for(const k in byStep)byStep[k][s]=[]}
  lead.forEach(e=>byStep.lead[e.step].push(e));arp.forEach(e=>byStep.arp[e.step].push(e));
  chordEvs.forEach(e=>byStep.chords[e.step].push(e));bass.forEach(e=>byStep.bass[e.step].push(e));
  drums.forEach(e=>byStep.drums[e.step].push(e));
  return {chords,lead,arp,chordEvs,bass,drums,drumPattern,byStep};
}
window.Z=Object.assign(window.Z||{},{Rng,randomSeed,NOTE_NAMES,SCALES,STEPS,BARS,TOTAL,DRUM_KINDS,BASS_LO,BASS_HI,generateTrack,generateDrumPattern,scalePitches,chordAt,buildChord,chordInfo,romanFor,chordScaleOf,bassRegister});
})();
