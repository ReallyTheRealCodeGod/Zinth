(()=>{
'use strict';
const Z=window.Z;
const LAYERS=['lead','arp','chords','bass','drums'];
const DEFAULTS={
  // vibrato and vibRate belong to the lead and glide to the bass: the layers that sing a line and the one
  // that walks between notes. A parameter a layer does not have simply has no control in the Sound panel.
  lead:  {wave:'saw',   cutoff:62,reso:25,attack:3, release:35,spread:25,drift:28,vibrato:30,vibRate:45,chorus:22,delay:35,reverb:30,level:75,mute:false,solo:false},
  arp:   {wave:'square',cutoff:55,reso:30,attack:1, release:20,spread:10,drift:24,chorus:18,delay:45,reverb:25,level:55,mute:false,solo:false},
  chords:{wave:'super', cutoff:40,reso:10,attack:45,release:60,spread:40,drift:32,chorus:38,delay:10,reverb:55,level:50,mute:false,solo:false},
  bass:  {wave:'saw',   cutoff:35,reso:20,attack:2, release:25,spread:0, drift:12,glide:18,chorus:0, delay:0, reverb:5, level:80,mute:false,solo:false},
  drums: {level:75,delay:10,reverb:20,pump:35,mute:false,solo:false},
};
// drum machines: each kit is a different set of synthesis recipes. Every kit also names the voice its perc
// row plays — a rim, a shaker or a cowbell — so the same row sounds like it belongs to whichever kit is on.
const KITS={
  '808':   {kick:{f0:150,f1:42,decay:0.55,click:0.05},snare:{tone:190,noise:0.5,bp:1700,decay:0.2},hat:{hp:8000,decay:0.045,open:0.3,level:0.22},clap:{bp:1300,decay:0.18},
            perc:{voice:'cowbell',f1:540,f2:800,decay:0.3,level:0.32}},
  '909':   {kick:{f0:190,f1:50,decay:0.32,click:0.14},snare:{tone:230,noise:0.65,bp:2400,decay:0.17},hat:{hp:9500,decay:0.035,open:0.25,level:0.2},clap:{bp:1600,decay:0.15},
            perc:{voice:'rim',f:1800,bp:2600,decay:0.05,level:0.42}},
  'Lo-fi': {kick:{f0:120,f1:40,decay:0.4,click:0.02,lp:2200},snare:{tone:170,noise:0.35,bp:1100,decay:0.16},hat:{hp:6000,decay:0.05,open:0.2,level:0.15},clap:{bp:900,decay:0.2},
            perc:{voice:'shaker',hp:5200,decay:0.085,level:0.2}},
  'Trap':  {kick:{f0:140,f1:38,decay:0.9,click:0.06},snare:{tone:210,noise:0.6,bp:2100,decay:0.22},hat:{hp:10500,decay:0.028,open:0.22,level:0.22},clap:{bp:1400,decay:0.2},
            perc:{voice:'rim',f:2100,bp:3000,decay:0.04,level:0.38}},
  // House: a short punchy kick, a crisp snare and hats that stay open and bright
  'House': {kick:{f0:180,f1:52,decay:0.3,click:0.1},snare:{tone:225,noise:0.55,bp:2300,decay:0.15},hat:{hp:10000,decay:0.042,open:0.36,level:0.26},clap:{bp:1500,decay:0.16},
            perc:{voice:'shaker',hp:7200,decay:0.06,level:0.26}},
  // Breaks: a dusty low kick under a lowpass, softer hats, and a snare with a room tail behind it
  'Breaks':{kick:{f0:128,f1:44,decay:0.36,click:0.03,lp:3200},snare:{tone:180,noise:0.72,bp:1500,decay:0.28,tail:0.42},hat:{hp:6800,decay:0.055,open:0.3,level:0.18},clap:{bp:1050,decay:0.24},
            perc:{voice:'rim',f:1500,bp:2000,decay:0.07,level:0.34}},
};
const cutoffHz=v=>80*Math.pow(150,v/100);
const qOf=v=>0.5+Math.pow(v/100,1.6)*13;
const attackSec=v=>0.002+Math.pow(v/100,2)*1.2;
const releaseSec=v=>0.03+Math.pow(v/100,1.8)*2.5;
const sendGain=v=>Math.pow(v/100,1.4)*0.9;
const levelGain=v=>Math.pow(v/100,1.5);
const midiHz=m=>440*Math.pow(2,(m-69)/12);
function crushCurve(bits){const n=1024,c=new Float32Array(n),q=Math.pow(2,bits);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.round(x*q)/q}return c}
function identityCurve(){const c=new Float32Array(3);c[0]=-1;c[1]=0;c[2]=1;return c}

class Engine{
  constructor(){
    this.ctx=null;this.params=JSON.parse(JSON.stringify(DEFAULTS));this.kit='808';
    this.bpm=112;this.swing=0.12;this.playing=false;this.masterLevel=0.8;this.warmth=Z.WARMTH.dflt;this.eq=Z.normEq(null);
    this.song=[];this.section=0;this.step=0;this.loop=0;this.queue=[];this.onLoop=null;this.onSection=null;
    this.loopSection=false;this.fx={};this.metronome=false;this.transitions=true;
    // humanize: how loose the groove is, and the seed the nudges come from. Because they come from a seed
    // rather than a die thrown at playback time, the offline render below sounds exactly like the playback.
    this.humanize=Z.HUMAN.dflt;this.humanSeed='';
    // the moment the count-in ends and the song comes in; 0 whenever nothing is counting in
    this.countInEnd=0;
    // the note a glideing layer played last, so the next one can slide out of it
    this.glideFrom={};
  }
  init(ctxIn){
    if(this.ctx)return;
    const ctx=this.ctx=ctxIn||new (window.AudioContext||window.webkitAudioContext)();
    this.master=ctx.createGain();this.master.gain.value=this.masterLevel;
    // the master EQ: three bands first in the master chain, so warmth, the sweep and the limiter all see a
    // mix that is already shaped — a console strip running into tape. The trim after them keeps the EQ inside
    // its headroom, so however hard the bands are pushed the mix never comes out loud enough to clip.
    this.eqBands={};
    let eqTail=this.master;
    for(const b of Z.EQ.bands){
      const f=ctx.createBiquadFilter();f.type=Z.EQ.TYPE[b];f.frequency.value=Z.EQ.HZ[b];
      if(Z.EQ.Q[b])f.Q.value=Z.EQ.Q[b];
      f.gain.value=0;eqTail.connect(f);eqTail=f;this.eqBands[b]=f;
    }
    this.eqTrim=ctx.createGain();eqTail.connect(this.eqTrim);
    // warmth: the whole mix through a soft clip and a gentle high shelf, before anything else touches it,
    // so a section sweep, a punch-in and the limiter all work on an already warmed signal
    this.warmShape=ctx.createWaveShaper();this.warmShape.oversample='2x';
    this.warmTone=ctx.createBiquadFilter();this.warmTone.type='highshelf';this.warmTone.frequency.value=Z.WARMTH.shelfHz;
    this.warmTrim=ctx.createGain();
    // the per-section sweep: a master low-pass that a section can open or close over its own length
    this.sweep=ctx.createBiquadFilter();this.sweep.type='lowpass';this.sweep.Q.value=1.1;this.sweep.frequency.value=Z.SWEEP.open;
    // punch-in chain: highpass -> lowpass -> crusher -> gate
    this.fxHP=ctx.createBiquadFilter();this.fxHP.type='highpass';this.fxHP.frequency.value=10;
    this.fxLP=ctx.createBiquadFilter();this.fxLP.type='lowpass';this.fxLP.frequency.value=20000;
    this.fxCrush=ctx.createWaveShaper();this.fxCrush.curve=identityCurve();
    this.fxGate=ctx.createGain();
    this.comp=ctx.createDynamicsCompressor();this.comp.threshold.value=-14;this.comp.knee.value=18;this.comp.ratio.value=4;this.comp.attack.value=0.004;this.comp.release.value=0.22;
    this.limiter=ctx.createDynamicsCompressor();this.limiter.threshold.value=-2;this.limiter.knee.value=0;this.limiter.ratio.value=20;this.limiter.attack.value=0.001;this.limiter.release.value=0.08;
    // the per-section fade: the very last gain in the chain, so a fade carries everything and nothing
    // downstream fights it. The scope and the meter read after it, so you see a fade as well as hear it.
    this.fade=ctx.createGain();this.fade.gain.value=Z.FADE.full;
    this.analyser=ctx.createAnalyser();this.analyser.fftSize=512;
    this.eqTrim.connect(this.warmShape);this.warmShape.connect(this.warmTone);this.warmTone.connect(this.warmTrim);
    this.warmTrim.connect(this.sweep);this.setWarmth(this.warmth,true);this.setEq(this.eq,true);
    this.sweep.connect(this.fxHP);this.fxHP.connect(this.fxLP);this.fxLP.connect(this.fxCrush);this.fxCrush.connect(this.fxGate);this.fxGate.connect(this.comp);
    this.comp.connect(this.limiter);this.limiter.connect(this.fade);this.fade.connect(ctx.destination);this.fade.connect(this.analyser);
    this.duck=ctx.createGain();this.duck.connect(this.master);
    // delay bus
    this.delayIn=ctx.createGain();this.delay=ctx.createDelay(2);this.delayFilt=ctx.createBiquadFilter();this.delayFilt.type='lowpass';this.delayFilt.frequency.value=3000;
    this.delayFb=ctx.createGain();this.delayFb.gain.value=0.42;this.delayOut=ctx.createGain();this.delayOut.gain.value=0.7;
    this.delayIn.connect(this.delay);this.delay.connect(this.delayFilt);this.delayFilt.connect(this.delayFb);this.delayFb.connect(this.delay);this.delayFilt.connect(this.delayOut);this.delayOut.connect(this.master);
    this.throw=ctx.createGain();this.throw.gain.value=0;this.duck.connect(this.throw);this.throw.connect(this.delayIn);
    this.setBpm(this.bpm);
    // reverb bus
    this.reverbIn=ctx.createGain();this.reverb=ctx.createConvolver();this.reverb.buffer=this.makeIR(2.8,2.6);
    this.reverbOut=ctx.createGain();this.reverbOut.gain.value=0.9;
    this.reverbIn.connect(this.reverb);this.reverb.connect(this.reverbOut);this.reverbOut.connect(this.master);
    this.wash=ctx.createGain();this.wash.gain.value=0;this.duck.connect(this.wash);this.wash.connect(this.reverbIn);
    // chorus bus: a few short delay lines, each drifting under its own slow LFO and sitting in its own
    // place in the stereo field. A synth layer sends into it and comes back wide, thick and moving.
    this.chorusIn=ctx.createGain();this.chorusOut=ctx.createGain();this.chorusOut.gain.value=Z.CHORUS.mix;
    this.chorusLfos=[];
    for(const v of Z.CHORUS.voices){
      const dl=ctx.createDelay(Z.CHORUS.maxDelay);dl.delayTime.value=v.delay;
      const lfo=ctx.createOscillator();lfo.type='sine';lfo.frequency.value=v.rate;
      const dep=ctx.createGain();dep.gain.value=v.depth;lfo.connect(dep);dep.connect(dl.delayTime);
      lfo.start(0);this.chorusLfos.push(lfo);
      this.chorusIn.connect(dl);
      if(ctx.createStereoPanner){const pn=ctx.createStereoPanner();pn.pan.value=v.pan;dl.connect(pn);pn.connect(this.chorusOut)}
      else dl.connect(this.chorusOut);
    }
    this.chorusOut.connect(this.master);
    // layer buses
    this.bus={};
    for(const L of LAYERS){
      const p=this.params[L],g=ctx.createGain(),ds=ctx.createGain(),rs=ctx.createGain();
      ds.gain.value=sendGain(p.delay);rs.gain.value=sendGain(p.reverb);
      g.connect(L==='drums'?this.master:this.duck);g.connect(ds);ds.connect(this.delayIn);g.connect(rs);rs.connect(this.reverbIn);
      this.bus[L]={g,ds,rs};
      if(p.chorus!==undefined){const cs=ctx.createGain();cs.gain.value=sendGain(p.chorus);g.connect(cs);cs.connect(this.chorusIn);this.bus[L].cs=cs}
    }
    {const p=this.params.chords,g=ctx.createGain();g.gain.value=levelGain(p.level);const ds=ctx.createGain();ds.gain.value=sendGain(p.delay);const rs=ctx.createGain();rs.gain.value=sendGain(p.reverb);
     const cs=ctx.createGain();cs.gain.value=sendGain(p.chorus);g.connect(cs);cs.connect(this.chorusIn);
     g.connect(this.duck);g.connect(ds);ds.connect(this.delayIn);g.connect(rs);rs.connect(this.reverbIn);this.bus.live={g,ds,rs,cs}}
    this.updateGains(true);
    this.noise=this.makeNoise(2);
  }
  makeIR(seconds,decay){
    const ctx=this.ctx,sr=ctx.sampleRate,n=Math.floor(sr*seconds),buf=ctx.createBuffer(2,n,sr);
    for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<n;i++){d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay)*(i<sr*0.01?i/(sr*0.01):1)}}
    return buf;
  }
  makeNoise(seconds){
    const ctx=this.ctx,n=Math.floor(ctx.sampleRate*seconds),buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return buf;
  }
  setBpm(b){this.bpm=b;if(this.ctx)this.delay.delayTime.setTargetAtTime(0.75*60/b,this.ctx.currentTime,0.05)}
  setMaster(v){this.masterLevel=Math.pow(v/100,1.6);if(this.ctx)this.master.gain.setTargetAtTime(this.masterLevel,this.ctx.currentTime,0.02)}
  // warmth: one knob, a soft-clip curve and a high shelf. At 0 the curve is dropped and the shelf is flat,
  // so the mix passes through untouched; the trim takes back the level the clip adds as it is driven.
  setWarmth(v,now){
    this.warmth=Z.warmthAmt(v)*100;
    if(!this.ctx||!this.warmShape)return;
    const t=this.ctx.currentTime,sh=Z.warmthShelf(this.warmth),tr=Z.warmthTrim(this.warmth);
    this.warmShape.curve=Z.warmthCurve(this.warmth);
    if(now){this.warmTone.gain.value=sh;this.warmTrim.gain.value=tr}
    else{this.warmTone.gain.setTargetAtTime(sh,t,0.03);this.warmTrim.gain.setTargetAtTime(tr,t,0.03)}
  }
  // the master EQ: the three band gains and the trim that follows them. Flat is a true bypass — every band
  // sits at 0 dB, which a biquad passes through untouched, and the trim is exactly unity.
  setEq(eq,now){
    this.eq=Z.normEq(eq);
    if(!this.ctx||!this.eqBands)return;
    const t=this.ctx.currentTime;
    for(const b of Z.EQ.bands){const g=Z.eqDb(this.eq[b]),p=this.eqBands[b].gain;
      if(now)p.value=g;else p.setTargetAtTime(g,t,0.03)}
    const tr=Z.eqTrim(this.eq);
    if(now)this.eqTrim.gain.value=tr;else this.eqTrim.gain.setTargetAtTime(tr,t,0.03);
  }
  anySolo(){return LAYERS.some(L=>this.params[L].solo)}
  audible(L){const p=this.params[L];return !p.mute&&(!this.anySolo()||p.solo)}
  updateGains(now){
    if(!this.ctx)return;const t=this.ctx.currentTime;
    for(const L of LAYERS){const g=this.audible(L)?levelGain(this.params[L].level):0;if(now)this.bus[L].g.gain.value=g;else this.bus[L].g.gain.setTargetAtTime(g,t,0.03)}
  }
  setParam(L,key,val){
    const p=this.params[L];p[key]=val;if(!this.ctx)return;
    const b=this.bus[L],t=this.ctx.currentTime;
    if(key==='level'||key==='mute'||key==='solo')this.updateGains(false);
    else if(key==='delay')b.ds.gain.setTargetAtTime(sendGain(val),t,0.03);
    else if(key==='reverb')b.rs.gain.setTargetAtTime(sendGain(val),t,0.03);
    else if(key==='chorus'&&b.cs)b.cs.gain.setTargetAtTime(sendGain(val),t,0.03);
    if(L==='chords'&&this.bus.live){const lb=this.bus.live;
      if(key==='level')lb.g.gain.setTargetAtTime(levelGain(val),t,0.03);
      else if(key==='delay')lb.ds.gain.setTargetAtTime(sendGain(val),t,0.03);
      else if(key==='reverb')lb.rs.gain.setTargetAtTime(sendGain(val),t,0.03);
      else if(key==='chorus')lb.cs.gain.setTargetAtTime(sendGain(val),t,0.03)}
  }
  stepSec(){return 60/this.bpm/4}

  /* ---- punch-in effects (momentary) ---- */
  fxOn(name){
    if(!this.ctx||this.fx[name])return;this.fx[name]=true;const t=this.ctx.currentTime;
    if(name==='lp'){this.fxLP.frequency.cancelScheduledValues(t);this.fxLP.frequency.setValueAtTime(Math.max(300,this.fxLP.frequency.value),t);this.fxLP.frequency.exponentialRampToValueAtTime(260,t+0.5);this.fxLP.Q.value=4}
    else if(name==='hp'){this.fxHP.frequency.cancelScheduledValues(t);this.fxHP.frequency.setValueAtTime(Math.max(10,this.fxHP.frequency.value),t);this.fxHP.frequency.exponentialRampToValueAtTime(1100,t+0.45);this.fxHP.Q.value=3}
    else if(name==='crush'){this.fxCrush.curve=crushCurve(3.5)}
    else if(name==='throw'){this.throw.gain.setTargetAtTime(0.8,t,0.02);this.delayFb.gain.setTargetAtTime(0.78,t,0.02)}
    else if(name==='wash'){this.wash.gain.setTargetAtTime(1.0,t,0.05)}
  }
  fxOff(name){
    if(!this.ctx||!this.fx[name])return;this.fx[name]=false;const t=this.ctx.currentTime;
    if(name==='lp'){this.fxLP.frequency.cancelScheduledValues(t);this.fxLP.frequency.setValueAtTime(this.fxLP.frequency.value,t);this.fxLP.frequency.exponentialRampToValueAtTime(20000,t+0.35);this.fxLP.Q.setTargetAtTime(1,t+0.3,0.1)}
    else if(name==='hp'){this.fxHP.frequency.cancelScheduledValues(t);this.fxHP.frequency.setValueAtTime(this.fxHP.frequency.value,t);this.fxHP.frequency.exponentialRampToValueAtTime(10,t+0.3);this.fxHP.Q.setTargetAtTime(1,t+0.3,0.1)}
    else if(name==='crush'){this.fxCrush.curve=identityCurve()}
    else if(name==='throw'){this.throw.gain.setTargetAtTime(0,t,0.02);this.delayFb.gain.setTargetAtTime(0.42,t+0.4,0.3)}
    else if(name==='wash'){this.wash.gain.setTargetAtTime(0,t,0.1)}
    else if(name==='gate8'||name==='gate16'){this.fxGate.gain.cancelScheduledValues(t);this.fxGate.gain.setValueAtTime(1,t)}
  }
  gateStep(step,time){
    const g=this.fxGate.gain,d=this.stepSec();
    if(this.fx.gate16){g.setValueAtTime(1,time);g.setValueAtTime(0,time+d*0.5)}
    else if(this.fx.gate8){g.setValueAtTime(step%2===0?1:0,time)}
  }

  // analog drift: every oscillator of a voice takes its own small detune and then wanders slowly away from
  // it, so a note held on and a note played twice never sit still. The offset is cents — always far under a
  // semitone — so the note itself never changes, whatever the Drift knob says.
  driftOsc(o,det,dr,time,durSec){
    o.detune.value=det+Z.driftCents(dr,Math.random());
    if(!(dr>0))return;
    const span=Math.min(8,Math.max(Z.DRIFT.seconds,durSec===undefined?4:durSec));
    const legs=Math.max(1,Math.round(span/Z.DRIFT.seconds));
    o.detune.setValueAtTime(o.detune.value,time);
    for(let i=1;i<=legs;i++)o.detune.linearRampToValueAtTime(det+Z.driftCents(dr,Math.random()),time+span*i/legs);
  }

  // glide: a layer that slides between notes starts the next note on the pitch of the one before and ramps
  // up to its own. Only notes close together slide — a longer gap is a new phrase, and it starts on pitch.
  // The ramp always lands exactly on the note asked for, so a slide never leaves the key.
  glideFrom_(L,midi,time,durSec){
    const p=this.params[L],prev=this.glideFrom[L];
    if(p.glide===undefined)return 0;
    const sec=Z.glideSec(p.glide,durSec);
    this.glideFrom[L]={midi,time};
    if(!(sec>0)||!prev||prev.midi===midi)return 0;
    const gap=time-prev.time;
    return (gap>=0&&gap<=Z.GLIDE.gap)?{sec,freq:midiHz(prev.midi)}:0;
  }
  // vibrato: one slow LFO into the detune of every oscillator of the voice, held at nothing for a moment
  // and then faded in, so a short note is straight and a held one comes alive. Cents, never a semitone.
  vibrato_(L,oscs,time,durSec){
    const p=this.params[L];
    if(!Z.vibrates(p.vibrato,durSec))return null;
    const ctx=this.ctx,lfo=ctx.createOscillator(),dep=ctx.createGain();
    lfo.type='sine';lfo.frequency.value=Z.vibRateHz(p.vibRate);
    dep.gain.setValueAtTime(0,time);dep.gain.setValueAtTime(0,time+Z.VIB.onset);
    dep.gain.linearRampToValueAtTime(Z.vibCents(p.vibrato),time+Z.VIB.onset+Z.VIB.fade);
    lfo.connect(dep);oscs.forEach(o=>dep.connect(o.detune));
    lfo.start(time);return lfo;
  }

  /* ---- synth voice ---- */
  playNote(L,midi,vel,time,durSec,pan,busName){
    const ctx=this.ctx,p=this.params[L],freq=midiHz(midi),dr=p.drift||0;
    const slide=this.glideFrom_(L,midi,time,durSec);
    const out=ctx.createGain();out.gain.setValueAtTime(0,time);
    const filt=ctx.createBiquadFilter();filt.type='lowpass';filt.Q.value=qOf(p.reso);
    // the filter opens a shade differently on every note, the way a warm analog one does
    const cut=cutoffHz(p.cutoff)*Z.driftCutoff(dr,Math.random()),atk=attackSec(p.attack),rel=releaseSec(p.release);
    const pluck=L==='bass'||L==='arp'||(L==='lead'&&p.attack<15);
    if(pluck){filt.frequency.setValueAtTime(Math.min(16000,cut*3.2),time);filt.frequency.exponentialRampToValueAtTime(cut,time+0.05+atk+0.12)}
    else{filt.frequency.setValueAtTime(cut*0.6,time);filt.frequency.exponentialRampToValueAtTime(cut,time+atk+0.1)}
    const oscs=[],spread=p.spread*0.32,wave=p.wave==='saw'?'sawtooth':p.wave;
    // a sliding voice starts on the note before and ramps to its own; every other voice starts on pitch
    const tune=(o,hz,ratio)=>{
      if(!slide){o.frequency.value=hz;return}
      o.frequency.setValueAtTime(slide.freq*ratio,time);o.frequency.exponentialRampToValueAtTime(hz,time+slide.sec);
    };
    const mk=(type,det)=>{const o=ctx.createOscillator();o.type=type;tune(o,freq,1);this.driftOsc(o,det,dr,time,durSec);o.connect(filt);o.start(time);oscs.push(o)};
    if(p.wave==='super'){mk('sawtooth',-spread-5);mk('sawtooth',0);mk('sawtooth',spread+5);mk('sawtooth',-spread*0.4);mk('sawtooth',spread*0.4)}
    else if(spread>0){mk(wave,-spread/2);mk(wave,spread/2)}
    else mk(wave,0);
    if(L==='bass'){const sub=ctx.createOscillator();sub.type='sine';tune(sub,freq/2,0.5);this.driftOsc(sub,0,dr,time,durSec);const sg=ctx.createGain();sg.gain.value=0.7;sub.connect(sg);sg.connect(filt);sub.start(time);oscs.push(sub)}
    const vib=this.vibrato_(L,oscs,time,durSec);
    const peak=(vel*0.32)/Math.sqrt(oscs.length)*(L==='chords'?0.75:1);
    out.gain.linearRampToValueAtTime(peak,time+atk);
    if(durSec===undefined||durSec>0.25)out.gain.setTargetAtTime(peak*0.72,time+atk,0.18);
    filt.connect(out);
    const dest=(this.bus[busName]||this.bus[L]).g;
    if(pan&&ctx.createStereoPanner){const pn=ctx.createStereoPanner();pn.pan.value=Math.max(-1,Math.min(1,pan));out.connect(pn);pn.connect(dest)}
    else out.connect(dest);
    let released=false;
    const release=(t)=>{
      if(released)return;released=true;
      out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(Math.max(out.gain.value,0.0001),t);
      out.gain.setTargetAtTime(0,t,rel/4);oscs.forEach(o=>o.stop(t+rel+0.1));if(vib)vib.stop(t+rel+0.1);
    };
    if(durSec!==undefined)release(time+durSec);
    return release;
  }

  /* ---- drums ---- */
  playDrum(kind,vel,time){
    const ctx=this.ctx,bus=this.bus.drums.g,K=KITS[this.kit]||KITS['808'];
    if(kind==='kick'){
      const k=K.kick,pump=(this.params.drums.pump||0)/100;
      if(pump>0){const d=this.duck.gain;d.cancelScheduledValues(time);d.setValueAtTime(1,time);d.linearRampToValueAtTime(1-pump*0.8,time+0.012);d.setTargetAtTime(1,time+0.03,0.07+pump*0.08)}
      const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
      o.frequency.setValueAtTime(k.f0,time);o.frequency.exponentialRampToValueAtTime(k.f1,time+0.09);
      g.gain.setValueAtTime(vel*0.95,time);g.gain.exponentialRampToValueAtTime(0.001,time+k.decay);
      let dest=bus;if(k.lp){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=k.lp;f.connect(bus);dest=f}
      o.connect(g);g.connect(dest);o.start(time);o.stop(time+k.decay+0.05);
      if(k.click>0){const c=ctx.createOscillator(),cg=ctx.createGain();c.type='square';c.frequency.value=1400;cg.gain.setValueAtTime(vel*k.click,time);cg.gain.exponentialRampToValueAtTime(0.001,time+0.012);c.connect(cg);cg.connect(bus);c.start(time);c.stop(time+0.02)}
    }else if(kind==='snare'){
      const k=K.snare,n=ctx.createBufferSource();n.buffer=this.noise;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=k.bp;f.Q.value=0.7;
      const g=ctx.createGain();g.gain.setValueAtTime(vel*k.noise,time);g.gain.exponentialRampToValueAtTime(0.001,time+k.decay);
      n.connect(f);f.connect(g);g.connect(bus);n.start(time);n.stop(time+k.decay+0.03);
      const o=ctx.createOscillator(),og=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(k.tone,time);o.frequency.exponentialRampToValueAtTime(k.tone*0.65,time+0.08);
      og.gain.setValueAtTime(vel*0.35,time);og.gain.exponentialRampToValueAtTime(0.001,time+0.11);o.connect(og);og.connect(bus);o.start(time);o.stop(time+0.12);
      // a room tail: a soft, dark second burst behind the snare, so a dusty kit sounds like it was in a room.
      // It hangs off the drum bus like everything else, so muting the drums silences it too.
      if(k.tail>0){
        const rn=ctx.createBufferSource();rn.buffer=this.noise;const rf=ctx.createBiquadFilter();rf.type='lowpass';rf.frequency.value=2400;
        const rg=ctx.createGain();rg.gain.setValueAtTime(vel*0.16,time+0.01);rg.gain.exponentialRampToValueAtTime(0.001,time+k.tail);
        rn.connect(rf);rf.connect(rg);rg.connect(bus);rn.start(time+0.01);rn.stop(time+k.tail+0.03);
      }
    }else if(kind==='perc'){
      const k=K.perc||KITS['808'].perc;
      if(k.voice==='cowbell'){
        // two detuned squares through a narrow bandpass: the cowbell every drum machine has
        const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=(k.f1+k.f2)/2;f.Q.value=2.4;
        const g=ctx.createGain();g.gain.setValueAtTime(vel*k.level,time);g.gain.exponentialRampToValueAtTime(0.001,time+k.decay);
        f.connect(g);g.connect(bus);
        [k.f1,k.f2].forEach(hz=>{const o=ctx.createOscillator();o.type='square';o.frequency.value=hz;o.connect(f);o.start(time);o.stop(time+k.decay+0.02)});
      }else if(k.voice==='rim'){
        // a wooden click: a tight band-passed noise snap with a short tonal ping on top of it
        const n=ctx.createBufferSource();n.buffer=this.noise;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=k.bp;f.Q.value=6;
        const g=ctx.createGain();g.gain.setValueAtTime(vel*k.level,time);g.gain.exponentialRampToValueAtTime(0.001,time+k.decay);
        n.connect(f);f.connect(g);g.connect(bus);n.start(time);n.stop(time+k.decay+0.02);
        const o=ctx.createOscillator(),og=ctx.createGain();o.type='triangle';o.frequency.value=k.f;
        og.gain.setValueAtTime(vel*k.level*0.7,time);og.gain.exponentialRampToValueAtTime(0.001,time+0.03);
        o.connect(og);og.connect(bus);o.start(time);o.stop(time+0.04);
      }else{
        // a shaker: bright noise with a hint of an attack, so it sounds shaken rather than clicked
        const n=ctx.createBufferSource();n.buffer=this.noise;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=k.hp;
        const g=ctx.createGain();g.gain.setValueAtTime(0.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(0.0002,vel*k.level),time+0.012);
        g.gain.exponentialRampToValueAtTime(0.001,time+k.decay);
        n.connect(f);f.connect(g);g.connect(bus);n.start(time);n.stop(time+k.decay+0.02);
      }
    }else if(kind==='clap'){
      const k=K.clap;[0,0.011,0.022,0.033].forEach((off,i)=>{
        const n=ctx.createBufferSource();n.buffer=this.noise;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=k.bp;f.Q.value=1.1;
        const g=ctx.createGain(),last=i===3,t0=time+off;g.gain.setValueAtTime(vel*0.4,t0);g.gain.exponentialRampToValueAtTime(0.001,t0+(last?k.decay:0.012));
        n.connect(f);f.connect(g);g.connect(bus);n.start(t0);n.stop(t0+(last?k.decay:0.015)+0.01)});
    }else{
      const k=K.hat,open=kind==='ohat',n=ctx.createBufferSource();n.buffer=this.noise;
      const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=k.hp;
      const g=ctx.createGain();g.gain.setValueAtTime(vel*(open?k.level*1.2:k.level),time);g.gain.exponentialRampToValueAtTime(0.001,time+(open?k.open:k.decay));
      n.connect(f);f.connect(g);g.connect(bus);n.start(time);n.stop(time+(open?k.open:k.decay)+0.02);
    }
  }

  /* ---- metronome, risers and crashes ---- */
  click(step,time){
    const ctx=this.ctx,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=step%16===0?1760:1175;
    g.gain.setValueAtTime(step%16===0?0.3:0.18,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.05);
    o.connect(g);g.connect(this.master);o.start(time);o.stop(time+0.06);
  }
  riser(time,dur){
    const ctx=this.ctx,n=ctx.createBufferSource();n.buffer=this.noise;n.loop=true;
    const f=ctx.createBiquadFilter();f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(250,time);f.frequency.exponentialRampToValueAtTime(5000,time+dur);
    const g=ctx.createGain();g.gain.setValueAtTime(0.0001,time);g.gain.exponentialRampToValueAtTime(0.2,time+dur);g.gain.setValueAtTime(0.0001,time+dur+0.005);
    n.connect(f);f.connect(g);g.connect(this.master);g.connect(this.reverbIn);n.start(time);n.stop(time+dur+0.05);
  }
  crash(time){
    const ctx=this.ctx,n=ctx.createBufferSource();n.buffer=this.noise;n.loop=true;
    const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=4500;
    const g=ctx.createGain();g.gain.setValueAtTime(0.28,time);g.gain.exponentialRampToValueAtTime(0.001,time+1.4);
    n.connect(f);f.connect(g);g.connect(this.master);g.connect(this.reverbIn);n.start(time);n.stop(time+1.5);
  }
  // called for every step: a riser over the last bar before a louder section, a crash on the downbeat of one
  transitionAt(si,step,time){
    if(!this.transitions||this.loopSection||this.song.length<2)return;
    const sec=this.song[si];if(!sec)return;const total=(sec.bars||8)*Z.STEPS,n=this.song.length;
    if(step===total-16){const nx=this.song[(si+1)%n];if(nx&&nx.energy>sec.energy)this.riser(time,16*this.stepSec())}
    if(step===0){const pv=this.song[(si-1+n)%n];if(pv&&sec.layers.drums===1&&sec.energy>=pv.energy&&this.audible('drums'))this.crash(time)}
  }
  // a section's filter sweep: scheduled once, on its first step, over the section's own length.
  // Looping a section replays it, and the offline render runs the same call, so an export matches.
  sweepAt(si,step,time){
    if(!this.ctx||!this.sweep||step!==0)return;
    const sec=this.song[si];if(!sec)return;
    const f=this.sweep.frequency,plan=Z.sweepPlan(sec.sweep,(sec.bars||8)*Z.STEPS,this.stepSec());
    f.cancelScheduledValues(time);
    if(!plan){f.setValueAtTime(Z.SWEEP.open,time);return}
    for(const p of plan){if(p.ramp)f.exponentialRampToValueAtTime(p.hz,time+p.t);else f.setValueAtTime(p.hz,time+p.t)}
  }
  resetSweep(){if(!this.ctx||!this.sweep)return;const t=this.ctx.currentTime,f=this.sweep.frequency;
    f.cancelScheduledValues(t);f.setValueAtTime(Z.SWEEP.open,t)}
  // a section's fade, scheduled on its first step over the section's own length, like the sweep.
  // A section that does not fade eases the master back to full, so the section after a fade-out
  // comes back in cleanly and nothing is ever left silent.
  fadeAt(si,step,time){
    if(!this.ctx||!this.fade||step!==0)return;
    const sec=this.song[si];if(!sec)return;
    const g=this.fade.gain,plan=Z.fadePlan(sec.fade,(sec.bars||8)*Z.STEPS,this.stepSec());
    g.cancelScheduledValues(time);
    if(!plan){g.setTargetAtTime(Z.FADE.full,time,0.01);return}
    for(const p of plan){
      const t=time+p.t;
      if(p.ramp)g.exponentialRampToValueAtTime(p.g,t);
      // coming back up to full is eased over a few milliseconds, so the section after a fade-out never
      // slams in with a click; a section that starts quiet takes its value at once and is silent anyway
      else if(p.t===0&&p.g>=Z.FADE.full)g.setTargetAtTime(p.g,t,0.008);
      else g.setValueAtTime(p.g,t);
    }
  }
  resetFade(){if(!this.ctx||!this.fade)return;const t=this.ctx.currentTime,g=this.fade.gain;
    g.cancelScheduledValues(t);g.setValueAtTime(Z.FADE.full,t)}
  nearestStep(t){let best=null,bd=1e9;for(const q of this.queue){const d=Math.abs(q.time-t);if(d<bd){bd=d;best=q}}return best}

  /* ---- transport & scheduler ---- */
  // start(section,countIn): with a count-in, one bar of clicks is scheduled first and the song's own grid
  // starts a bar later, so the count lands on the beats and the first step of the song follows the last
  // click by exactly one beat. Nothing of the count reaches the song — it is clicks and silence.
  start(section,countIn){
    this.init();if(this.ctx.resume)this.ctx.resume();
    this.playing=true;this.step=0;this.section=section||0;this.loop=0;this.queue=[];this.glideFrom={};
    this.grid=this.ctx.currentTime+0.08;this.countInEnd=0;
    const plan=countIn?Z.countInPlan(this.stepSec()):null;
    if(plan){for(const b of plan.beats)this.click(b.step,this.grid+b.t);this.grid+=plan.dur;this.countInEnd=this.grid}
    clearInterval(this.timer);this.timer=setInterval(()=>this.tick(),25);this.tick();
  }
  // how many beats of the count-in are still to come: 4 down to 1 while it counts, 0 the rest of the time
  countdown(){
    if(!this.ctx||!this.playing||!this.countInEnd)return 0;
    const left=this.countInEnd-this.ctx.currentTime;
    if(left<=0)return 0;
    return Math.max(1,Math.min(Z.COUNTIN.beats,Math.ceil(left/(this.stepSec()*4))));
  }
  stop(){clearInterval(this.timer);this.timer=null;this.playing=false;this.queue=[];this.glideFrom={};this.countInEnd=0;if(this.ctx){for(const n of ['lp','hp','crush','throw','wash','gate8','gate16'])this.fxOff(n);this.resetSweep();this.resetFade()}}
  jump(section){this.section=section;this.step=0}
  tick(){
    const ctx=this.ctx;if(!this.song.length)return;
    while(this.grid<ctx.currentTime+0.16){
      const d=this.stepSec(),sec=this.song[this.section]||this.song[0];
      const t=this.grid+(this.step%2===1?this.swing*d:0);
      this.scheduleStep(this.section,this.step,t);
      this.transitionAt(this.section,this.step,t);
      this.sweepAt(this.section,this.step,t);
      this.fadeAt(this.section,this.step,t);
      if(this.metronome&&this.step%4===0)this.click(this.step,t);
      if(this.fx.gate8||this.fx.gate16)this.gateStep(this.step,t);
      this.queue.push({section:this.section,step:this.step,time:t});
      this.grid+=d;this.step++;
      if(this.step>=(sec.bars||8)*Z.STEPS){
        this.step=0;
        if(!this.loopSection){this.section++;if(this.section>=this.song.length){this.section=0;this.loop++;if(this.onLoop)this.onLoop(this.loop)}}
        if(this.onSection)this.onSection(this.section);
      }
    }
    if(this.queue.length>64)this.queue.splice(0,this.queue.length-64);
  }
  scheduleStep(si,step,time){
    const sec=this.song[si];if(!sec)return;const tr=sec.track,d=this.stepSec(),lay=sec.layers;
    const s=step%Z.TOTAL;
    for(const L of LAYERS){
      if(!this.audible(L)||!lay[L])continue;
      const evs=tr.byStep[L][s];if(!evs||!evs.length)continue;
      for(let i=0;i<evs.length;i++){
        const e=evs[i];
        // humanize: this event's own nudge off the grid and its own velocity, the same pair every time
        const h=Z.humanize(this.humanize,this.humanSeed,L,si,step,i,d,e.vel,e.kind);
        const vel=h.vel,t=Math.max(0,time+h.shift);
        if(L==='drums'){
          if(lay[L]==='lite'&&(e.kind==='snare'||e.kind==='clap'||(e.kind==='kick'&&s%16!==0)))continue;
          this.playDrum(e.kind,lay[L]==='lite'?vel*0.6:vel,t);
        }else if(L==='chords'){
          const n=e.notes.length;e.notes.forEach((m,k)=>this.playNote(L,m,vel,t,e.dur*d-0.02,(k/(n-1||1)-0.5)*0.5));
        }else if(L==='arp'){
          this.playNote(L,e.midi,vel,t,Math.max(0.05,e.dur*d*0.95),e.midi%2?0.3:-0.3);
        }else{
          const dur=Math.max(0.05,e.dur*d*0.95);
          this.playNote(L,e.midi,vel,t,dur,L==='lead'?0.08:0);
          if(L==='lead'&&sec.double)this.playNote(L,e.midi+12,vel*0.42,t,dur,-0.22);
        }
      }
    }
  }
  currentPos(){
    if(!this.ctx||!this.playing)return null;const now=this.ctx.currentTime;let p=null;
    for(const q of this.queue){if(q.time<=now)p=q;else break}return p;
  }
  // a live note from the letter keys: it sounds through the layer you play into, so recording sounds like playback
  noteOn(midi,L){const layer=this.params[L]?L:'lead';this.init();if(this.ctx.resume)this.ctx.resume();
    return this.playNote(layer,midi,0.9,this.ctx.currentTime,undefined,layer==='lead'?0.08:0)}
  rms(){
    if(!this.ctx)return 0;const a=new Uint8Array(this.analyser.fftSize);this.analyser.getByteTimeDomainData(a);
    let s=0;for(let i=0;i<a.length;i++){const v=(a[i]-128)/128;s+=v*v}return Math.sqrt(s/a.length);
  }
}
Z.LAYERS=LAYERS;Z.DEFAULTS=DEFAULTS;Z.KITS=KITS;Z.Engine=Engine;Z.engine=new Engine();Z.cutoffHz=cutoffHz;Z.attackSec=attackSec;Z.releaseSec=releaseSec;
})();
