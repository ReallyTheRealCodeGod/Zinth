(()=>{
'use strict';
/* DSP that Web Audio's built-in nodes cannot do: a lookahead limiter, an algorithmic reverb and a ladder
   filter, each an AudioWorklet processor shipped as source text and loaded from a blob URL so the app stays
   one file. Plus a BS.1770 loudness meter for the exports. Everything degrades: without worklets the engine
   keeps its compressor, its convolver and its biquads. */
const Z=window.Z;

const WORKLETS=`
// ---- limiter: a few milliseconds of lookahead, instant-in gain over the window, exponential release ----
class ZinthLimiter extends AudioWorkletProcessor{
  static get parameterDescriptors(){return [{name:'ceiling',defaultValue:0.891,minValue:0.05,maxValue:1,automationRate:'k-rate'},{name:'release',defaultValue:0.08,minValue:0.005,maxValue:2,automationRate:'k-rate'}]}
  constructor(){super();this.la=Math.max(64,Math.round(sampleRate*0.003));this.ring=[new Float32Array(this.la),new Float32Array(this.la)];this.tg=new Float32Array(this.la).fill(1);this.w=0;this.g=1;this.att=1-Math.exp(-5/this.la)}
  process(inputs,outputs,p){
    const inp=inputs[0],out=outputs[0];if(!out||!out.length)return true;
    const n=out[0].length,ch=Math.min(inp&&inp.length||0,out.length,2),ceil=p.ceiling[0],rel=Math.exp(-1/(sampleRate*p.release[0])),la=this.la,tg=this.tg;
    for(let i=0;i<n;i++){
      let pk=0;for(let c=0;c<ch;c++){const v=Math.abs(inp[c][i]);if(v>pk)pk=v}
      const w=this.w;tg[w]=pk>ceil?ceil/pk:1;
      let m=1;for(let j=0;j<la;j++){const v=tg[j];if(v<m)m=v}
      if(m<this.g)this.g+=(m-this.g)*this.att;else this.g=m+(this.g-m)*rel;
      for(let c=0;c<out.length;c++){const o=this.ring[c<2?c:1][w];if(c<ch)this.ring[c][w]=inp[c][i];out[c][i]=o*this.g}
      if(ch===1)this.ring[1][w]=this.ring[0][w];
      this.w=(w+1)%la;
    }
    return true;
  }
}
registerProcessor('zinth-limiter',ZinthLimiter);
// ---- reverb: an eight-line feedback delay network with a householder mix, damping in the loop, pre-delay ----
class ZinthReverb extends AudioWorkletProcessor{
  static get parameterDescriptors(){return [{name:'size',defaultValue:0.6,minValue:0,maxValue:1,automationRate:'k-rate'},{name:'damp',defaultValue:0.4,minValue:0,maxValue:1,automationRate:'k-rate'},{name:'predelay',defaultValue:0.015,minValue:0,maxValue:0.12,automationRate:'k-rate'}]}
  constructor(){super();
    const k=sampleRate/44100;this.N=8;this.base=[1123,1499,1783,2069,2371,2647,2917,3253].map(x=>Math.round(x*k));
    this.max=this.base.map(b=>Math.round(b*1.05)+4);this.lines=this.max.map(L=>new Float32Array(L));this.pos=new Int32Array(this.N);
    this.lp=new Float32Array(this.N);this.rd=new Float32Array(this.N);this.pre=new Float32Array(Math.round(sampleRate*0.125)+1);this.pp=0;
  }
  process(inputs,outputs,p){
    const inp=inputs[0],out=outputs[0];if(!out||!out.length)return true;
    const n=out[0].length,size=p.size[0],damp=Math.min(0.95,p.damp[0]*0.9),pd=Math.max(1,Math.min(this.pre.length-1,Math.round(p.predelay[0]*sampleRate)));
    const N=this.N,fb=0.68+0.29*size,dmp=1-damp,L=out[0],R=out.length>1?out[1]:null,inL=inp&&inp[0],inR=inp&&inp.length>1?inp[1]:inL;
    const lens=this.lens||(this.lens=new Int32Array(N));for(let j=0;j<N;j++)lens[j]=Math.max(32,Math.round(this.base[j]*(0.5+0.5*size)));
    for(let i=0;i<n;i++){
      const x=((inL?inL[i]:0)+(inR?inR[i]:0))*0.5;
      const pre=this.pre,pl=pre.length,pin=this.pp;const xin=pre[(pin-pd+pl)%pl];pre[pin]=x;this.pp=(pin+1)%pl;
      let s=0;
      for(let j=0;j<N;j++){const line=this.lines[j],ml=this.max[j];const r=line[(this.pos[j]-lens[j]+ml)%ml];this.lp[j]+=(r-this.lp[j])*dmp;this.rd[j]=this.lp[j];s+=this.lp[j]}
      const hh=s*(2/N);let l=0,rr=0;
      for(let j=0;j<N;j++){const v=xin+fb*(this.rd[j]-hh);const line=this.lines[j];line[this.pos[j]]=v;this.pos[j]=(this.pos[j]+1)%this.max[j];if(j&1)rr+=this.rd[j];else l+=this.rd[j]}
      L[i]=l*0.32;if(R)R[i]=rr*0.32;
    }
    return true;
  }
}
registerProcessor('zinth-reverb',ZinthReverb);
// ---- ladder: the four-pole lowpass with feedback, per voice; ends itself once its voice has stopped ----
class ZinthLadder extends AudioWorkletProcessor{
  static get parameterDescriptors(){return [{name:'cutoff',defaultValue:1000,minValue:20,maxValue:20000,automationRate:'a-rate'},{name:'reso',defaultValue:0.2,minValue:0,maxValue:1,automationRate:'k-rate'}]}
  constructor(){super();this.s=[new Float64Array(8),new Float64Array(8)];this.idle=0}
  process(inputs,outputs,p){
    const inp=inputs[0],out=outputs[0];
    if(!inp||!inp.length){this.idle++;return this.idle<4}
    this.idle=0;const n=out[0].length,ch=Math.min(inp.length,out.length,2),cut=p.cutoff,res=p.reso[0]*3.9,mk=1+p.reso[0]*0.6;
    for(let c=0;c<ch;c++){const st=this.s[c],x=inp[c],y=out[c];
      for(let i=0;i<n;i++){
        const hz=cut.length>1?cut[i]:cut[0],f=Math.min(0.99,2*hz/sampleRate),f2=f*f,fb=res*(1-0.15*f2);
        let v=x[i]-st[7]*fb;v*=0.35013*f2*f2;
        st[4]=v+0.3*st[0]+(1-f)*st[4];st[0]=v;
        st[5]=st[4]+0.3*st[1]+(1-f)*st[5];st[1]=st[4];
        st[6]=st[5]+0.3*st[2]+(1-f)*st[6];st[2]=st[5];
        st[7]=st[6]+0.3*st[3]+(1-f)*st[7];st[3]=st[6];
        y[i]=st[7]*mk;
      }
    }
    for(let c=ch;c<out.length;c++)out[c].fill(0);
    return true;
  }
}
registerProcessor('zinth-ladder',ZinthLadder);
`;
let url=null;const ready=new WeakMap();
// load the processors into a context once; resolves true when they are usable, false when the browser cannot
function installWorklets(ctx){
  if(!ctx||!ctx.audioWorklet)return Promise.resolve(false);
  if(ready.has(ctx))return ready.get(ctx);
  if(!url)url=URL.createObjectURL(new Blob([WORKLETS],{type:'application/javascript'}));
  const p=ctx.audioWorklet.addModule(url).then(()=>true).catch(()=>false);
  ready.set(ctx,p);return p;
}

/* ---- loudness (ITU-R BS.1770-4): K-weighting, 400 ms blocks, absolute and relative gating ---- */
function biquad(b0,b1,b2,a1,a2){let x1=0,x2=0,y1=0,y2=0;return x=>{const y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;return y}}
function kWeight(sr){
  const shelf=(()=>{const f0=1681.974,G=3.99984,Q=0.7071752;const A=Math.pow(10,G/40),w0=2*Math.PI*f0/sr,al=Math.sin(w0)/(2*Q),cs=Math.cos(w0),sA=2*Math.sqrt(A)*al;
    const b0=A*((A+1)+(A-1)*cs+sA),b1=-2*A*((A-1)+(A+1)*cs),b2=A*((A+1)+(A-1)*cs-sA),a0=(A+1)-(A-1)*cs+sA,a1=2*((A-1)-(A+1)*cs),a2=(A+1)-(A-1)*cs-sA;return biquad(b0/a0,b1/a0,b2/a0,a1/a0,a2/a0)})();
  const hp=(()=>{const f0=38.13547,Q=0.5003270;const w0=2*Math.PI*f0/sr,al=Math.sin(w0)/(2*Q),cs=Math.cos(w0);const b0=(1+cs)/2,b1=-(1+cs),b2=(1+cs)/2,a0=1+al,a1=-2*cs,a2=1-al;return biquad(b0/a0,b1/a0,b2/a0,a1/a0,a2/a0)})();
  return x=>hp(shelf(x));
}
function loudness(buf){
  const sr=buf.sampleRate,ch=buf.numberOfChannels,n=buf.length,block=Math.round(sr*0.4),hop=Math.round(sr*0.1);
  const chans=[],filt=[];for(let c=0;c<ch;c++){chans.push(buf.getChannelData(c));filt.push(kWeight(sr))}
  const pre=new Float64Array(n+1);let peak=0;
  for(let i=0;i<n;i++){let s=0;for(let c=0;c<ch;c++){const v=chans[c][i],a=v<0?-v:v;if(a>peak)peak=a;const w=filt[c](v);s+=w*w}pre[i+1]=pre[i]+s}
  const blocks=[];for(let st=0;st+block<=n;st+=hop){const ms=(pre[st+block]-pre[st])/block;if(ms>0)blocks.push(ms)}
  const lk=ms=>-0.691+10*Math.log10(ms);
  const abs=blocks.filter(ms=>lk(ms)>-70);
  if(!abs.length)return {lufs:-Infinity,peak,peakDb:peak>0?20*Math.log10(peak):-Infinity};
  const relGate=lk(abs.reduce((a,b)=>a+b,0)/abs.length)-10;
  const kept=abs.filter(ms=>lk(ms)>relGate);
  const lufs=lk((kept.length?kept:abs).reduce((a,b)=>a+b,0)/(kept.length||abs.length));
  return {lufs,peak,peakDb:peak>0?20*Math.log10(peak):-Infinity};
}
// the gain that brings a measurement to the target, capped so silence is never blown up
function normGain(lufs,target){if(!isFinite(lufs))return 1;return Math.min(Math.pow(10,20/20),Math.pow(10,(target-lufs)/20))}
// apply a gain and catch the peaks: the buffer through the lookahead limiter, offline
async function limitBuffer(buf,gain,ceilingDb){
  const off=new OfflineAudioContext(buf.numberOfChannels,buf.length,buf.sampleRate);
  const ok=await installWorklets(off);
  const src=off.createBufferSource();src.buffer=buf;const g=off.createGain();g.gain.value=gain;src.connect(g);
  if(ok){const lim=new AudioWorkletNode(off,'zinth-limiter',{outputChannelCount:[buf.numberOfChannels]});lim.parameters.get('ceiling').value=Math.pow(10,(ceilingDb||-1)/20);g.connect(lim);lim.connect(off.destination)}
  else{const c=off.createDynamicsCompressor();c.threshold.value=(ceilingDb||-1)-1;c.knee.value=0;c.ratio.value=20;c.attack.value=0.001;c.release.value=0.05;g.connect(c);c.connect(off.destination)}
  src.start(0);return off.startRendering();
}
const REVERB={dflt:{size:60,damp:40,pre:15}};
const LOUD={target:-14,ceiling:-1};
Object.assign(Z,{installWorklets,loudness,normGain,limitBuffer,REVERB,LOUD});
})();
