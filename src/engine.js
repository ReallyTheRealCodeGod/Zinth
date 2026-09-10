(()=>{
'use strict';
const Z=window.Z;
const LAYERS=['lead','arp','chords','bass','drums'];
const DEFAULTS={
  lead:  {wave:'saw',   cutoff:62,reso:25,attack:3, release:35,spread:25,delay:35,reverb:30,level:75,mute:false,solo:false},
  arp:   {wave:'square',cutoff:55,reso:30,attack:1, release:20,spread:10,delay:45,reverb:25,level:55,mute:false,solo:false},
  chords:{wave:'super', cutoff:40,reso:10,attack:45,release:60,spread:40,delay:10,reverb:55,level:50,mute:false,solo:false},
  bass:  {wave:'saw',   cutoff:35,reso:20,attack:2, release:25,spread:0, delay:0, reverb:5, level:80,mute:false,solo:false},
  drums: {level:75,delay:10,reverb:20,pump:35,mute:false,solo:false},
};
// drum machines: each kit is a different set of synthesis recipes
const KITS={
  '808':  {kick:{f0:150,f1:42,decay:0.55,click:0.05},snare:{tone:190,noise:0.5,bp:1700,decay:0.2},hat:{hp:8000,decay:0.045,open:0.3,level:0.22},clap:{bp:1300,decay:0.18}},
  '909':  {kick:{f0:190,f1:50,decay:0.32,click:0.14},snare:{tone:230,noise:0.65,bp:2400,decay:0.17},hat:{hp:9500,decay:0.035,open:0.25,level:0.2},clap:{bp:1600,decay:0.15}},
  'Lo-fi':{kick:{f0:120,f1:40,decay:0.4,click:0.02,lp:2200},snare:{tone:170,noise:0.35,bp:1100,decay:0.16},hat:{hp:6000,decay:0.05,open:0.2,level:0.15},clap:{bp:900,decay:0.2}},
  'Trap': {kick:{f0:140,f1:38,decay:0.9,click:0.06},snare:{tone:210,noise:0.6,bp:2100,decay:0.22},hat:{hp:10500,decay:0.028,open:0.22,level:0.22},clap:{bp:1400,decay:0.2}},
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
    this.bpm=112;this.swing=0.12;this.playing=false;this.masterLevel=0.8;
    this.song=[];this.section=0;this.step=0;this.loop=0;this.queue=[];this.onLoop=null;this.onSection=null;
    this.loopSection=false;this.fx={};this.metronome=false;this.transitions=true;
  }
  init(ctxIn){
    if(this.ctx)return;
    const ctx=this.ctx=ctxIn||new (window.AudioContext||window.webkitAudioContext)();
    this.master=ctx.createGain();this.master.gain.value=this.masterLevel;
    // punch-in chain: highpass -> lowpass -> crusher -> gate
    this.fxHP=ctx.createBiquadFilter();this.fxHP.type='highpass';this.fxHP.frequency.value=10;
    this.fxLP=ctx.createBiquadFilter();this.fxLP.type='lowpass';this.fxLP.frequency.value=20000;
    this.fxCrush=ctx.createWaveShaper();this.fxCrush.curve=identityCurve();
    this.fxGate=ctx.createGain();
    this.comp=ctx.createDynamicsCompressor();this.comp.threshold.value=-14;this.comp.knee.value=18;this.comp.ratio.value=4;this.comp.attack.value=0.004;this.comp.release.value=0.22;
    this.limiter=ctx.createDynamicsCompressor();this.limiter.threshold.value=-2;this.limiter.knee.value=0;this.limiter.ratio.value=20;this.limiter.attack.value=0.001;this.limiter.release.value=0.08;
    this.analyser=ctx.createAnalyser();this.analyser.fftSize=512;
    this.master.connect(this.fxHP);this.fxHP.connect(this.fxLP);this.fxLP.connect(this.fxCrush);this.fxCrush.connect(this.fxGate);this.fxGate.connect(this.comp);
    this.comp.connect(this.limiter);this.limiter.connect(ctx.destination);this.limiter.connect(this.analyser);
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
    // layer buses
    this.bus={};
    for(const L of LAYERS){
      const p=this.params[L],g=ctx.createGain(),ds=ctx.createGain(),rs=ctx.createGain();
      ds.gain.value=sendGain(p.delay);rs.gain.value=sendGain(p.reverb);
      g.connect(L==='drums'?this.master:this.duck);g.connect(ds);ds.connect(this.delayIn);g.connect(rs);rs.connect(this.reverbIn);
      this.bus[L]={g,ds,rs};
    }
    {const p=this.params.chords,g=ctx.createGain();g.gain.value=levelGain(p.level);const ds=ctx.createGain();ds.gain.value=sendGain(p.delay);const rs=ctx.createGain();rs.gain.value=sendGain(p.reverb);
     g.connect(this.duck);g.connect(ds);ds.connect(this.delayIn);g.connect(rs);rs.connect(this.reverbIn);this.bus.live={g,ds,rs}}
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
    if(L==='chords'&&this.bus.live){const lb=this.bus.live;
      if(key==='level')lb.g.gain.setTargetAtTime(levelGain(val),t,0.03);
      else if(key==='delay')lb.ds.gain.setTargetAtTime(sendGain(val),t,0.03);
      else if(key==='reverb')lb.rs.gain.setTargetAtTime(sendGain(val),t,0.03)}
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

  /* ---- synth voice ---- */
  playNote(L,midi,vel,time,durSec,pan,busName){
    const ctx=this.ctx,p=this.params[L],freq=midiHz(midi);
    const out=ctx.createGain();out.gain.setValueAtTime(0,time);
    const filt=ctx.createBiquadFilter();filt.type='lowpass';filt.Q.value=qOf(p.reso);
    const cut=cutoffHz(p.cutoff),atk=attackSec(p.attack),rel=releaseSec(p.release);
    const pluck=L==='bass'||L==='arp'||(L==='lead'&&p.attack<15);
    if(pluck){filt.frequency.setValueAtTime(Math.min(16000,cut*3.2),time);filt.frequency.exponentialRampToValueAtTime(cut,time+0.05+atk+0.12)}
    else{filt.frequency.setValueAtTime(cut*0.6,time);filt.frequency.exponentialRampToValueAtTime(cut,time+atk+0.1)}
    const oscs=[],spread=p.spread*0.32,wave=p.wave==='saw'?'sawtooth':p.wave;
    const mk=(type,det)=>{const o=ctx.createOscillator();o.type=type;o.frequency.value=freq;o.detune.value=det;o.connect(filt);o.start(time);oscs.push(o)};
    if(p.wave==='super'){mk('sawtooth',-spread-5);mk('sawtooth',0);mk('sawtooth',spread+5);mk('sawtooth',-spread*0.4);mk('sawtooth',spread*0.4)}
    else if(spread>0){mk(wave,-spread/2);mk(wave,spread/2)}
    else mk(wave,0);
    if(L==='bass'){const sub=ctx.createOscillator();sub.type='sine';sub.frequency.value=freq/2;const sg=ctx.createGain();sg.gain.value=0.7;sub.connect(sg);sg.connect(filt);sub.start(time);oscs.push(sub)}
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
      out.gain.setTargetAtTime(0,t,rel/4);oscs.forEach(o=>o.stop(t+rel+0.1));
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
  nearestStep(t){let best=null,bd=1e9;for(const q of this.queue){const d=Math.abs(q.time-t);if(d<bd){bd=d;best=q}}return best}

  /* ---- transport & scheduler ---- */
  start(section){
    this.init();if(this.ctx.resume)this.ctx.resume();
    this.playing=true;this.step=0;this.section=section||0;this.loop=0;this.queue=[];
    this.grid=this.ctx.currentTime+0.08;
    clearInterval(this.timer);this.timer=setInterval(()=>this.tick(),25);this.tick();
  }
  stop(){clearInterval(this.timer);this.timer=null;this.playing=false;this.queue=[];if(this.ctx){for(const n of ['lp','hp','crush','throw','wash','gate8','gate16'])this.fxOff(n)}}
  jump(section){this.section=section;this.step=0}
  tick(){
    const ctx=this.ctx;if(!this.song.length)return;
    while(this.grid<ctx.currentTime+0.16){
      const d=this.stepSec(),sec=this.song[this.section]||this.song[0];
      const t=this.grid+(this.step%2===1?this.swing*d:0);
      this.scheduleStep(this.section,this.step,t);
      this.transitionAt(this.section,this.step,t);
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
      for(const e of evs){
        const vel=e.vel*(0.93+Math.random()*0.1);
        if(L==='drums'){
          if(lay[L]==='lite'&&(e.kind==='snare'||e.kind==='clap'||(e.kind==='kick'&&s%16!==0)))continue;
          this.playDrum(e.kind,lay[L]==='lite'?vel*0.6:vel,time);
        }else if(L==='chords'){
          const n=e.notes.length;e.notes.forEach((m,k)=>this.playNote(L,m,vel,time,e.dur*d-0.02,(k/(n-1||1)-0.5)*0.5));
        }else if(L==='arp'){
          this.playNote(L,e.midi,vel,time,Math.max(0.05,e.dur*d*0.95),e.midi%2?0.3:-0.3);
        }else{
          const dur=Math.max(0.05,e.dur*d*0.95);
          this.playNote(L,e.midi,vel,time,dur,L==='lead'?0.08:0);
          if(L==='lead'&&sec.double)this.playNote(L,e.midi+12,vel*0.42,time,dur,-0.22);
        }
      }
    }
  }
  currentPos(){
    if(!this.ctx||!this.playing)return null;const now=this.ctx.currentTime;let p=null;
    for(const q of this.queue){if(q.time<=now)p=q;else break}return p;
  }
  noteOn(midi){this.init();if(this.ctx.resume)this.ctx.resume();return this.playNote('lead',midi,0.9,this.ctx.currentTime,undefined,0.08)}
  rms(){
    if(!this.ctx)return 0;const a=new Uint8Array(this.analyser.fftSize);this.analyser.getByteTimeDomainData(a);
    let s=0;for(let i=0;i<a.length;i++){const v=(a[i]-128)/128;s+=v*v}return Math.sqrt(s/a.length);
  }
}
Z.LAYERS=LAYERS;Z.DEFAULTS=DEFAULTS;Z.KITS=KITS;Z.Engine=Engine;Z.engine=new Engine();Z.cutoffHz=cutoffHz;Z.attackSec=attackSec;Z.releaseSec=releaseSec;
})();
