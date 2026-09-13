(()=>{
'use strict';
/* Web MIDI. In: a keyboard plays and records through the same path as the letter keys, locked to the scale,
   and any CC can be learned onto one of the four knobs. Out: clock at 24 pulses per quarter with start and
   stop, and every note the song plays, one channel per layer and drums on 10, so hardware can follow along. */
const Z=window.Z,U=window.ZUI,E=Z.engine,$=id=>document.getElementById(id);
const M={access:null,inputs:[],outputs:[],inp:null,out:null,inId:'',outId:'',clock:true,notesOut:true,learn:-1,map:{},on:false,held:{}};
const CH={lead:0,arp:1,chords:2,bass:3},GM={kick:36,snare:38,clap:39,hat:42,ohat:46,perc:56},KNOBS=['blue','green','white','orange'];
function load(){try{const s=JSON.parse(localStorage.getItem('zinth.midi')||'{}');Object.assign(M,{inId:s.inId||'',outId:s.outId||'',clock:s.clock!==false,notesOut:s.notesOut!==false,map:s.map||{}})}catch(e){}}
function save(){try{localStorage.setItem('zinth.midi',JSON.stringify({inId:M.inId,outId:M.outId,clock:M.clock,notesOut:M.notesOut,map:M.map}))}catch(e){}}
async function enable(){
  if(!navigator.requestMIDIAccess){U.setStatus('This browser has no Web MIDI. Chrome, Edge and Opera do, over https or on localhost.');return false}
  try{M.access=await navigator.requestMIDIAccess({sysex:false})}catch(e){U.setStatus('MIDI access was refused: '+(e&&e.message||e));return false}
  M.on=true;M.access.onstatechange=()=>refreshPorts();refreshPorts();
  U.setStatus(M.inputs.length||M.outputs.length?'MIDI on: '+M.inputs.length+' input'+(M.inputs.length===1?'':'s')+', '+M.outputs.length+' output'+(M.outputs.length===1?'':'s')+'. Play your keyboard: every note lands in key.':'MIDI on, but no devices are connected yet');
  return true;
}
function refreshPorts(){
  M.inputs=[...M.access.inputs.values()];M.outputs=[...M.access.outputs.values()];
  M.inputs.forEach(i=>{i.onmidimessage=null});
  M.inp=M.inputs.find(i=>i.id===M.inId)||M.inputs[0]||null;if(M.inp){M.inId=M.inp.id;M.inp.onmidimessage=onMsg}
  M.out=M.outputs.find(o=>o.id===M.outId)||null;if(M.out)M.outId=M.out.id;
  render();save();
}
// an incoming note is locked to the key like the keys are: the nearest note of the scale plays and records
function quantize(n){const p=Z.scalePitches(U.cfg(),Math.max(0,n-6),Math.min(127,n+6)).filter(x=>!x.passing);if(!p.length)return n;return p.reduce((a,b)=>Math.abs(b.midi-n)<Math.abs(a.midi-n)?b:a).midi}
function onMsg(e){
  const d=e.data,type=d[0]&0xf0,d1=d[1],d2=d[2];
  if(type===0x90&&d2>0){if(M.held[d1]!==undefined)return;const q=quantize(d1);M.held[d1]=q;U.liveNoteOn(q,d2/127)}
  else if(type===0x80||(type===0x90&&d2===0)){const q=M.held[d1];if(q===undefined)return;delete M.held[d1];U.liveNoteOff(q)}
  else if(type===0xb0){
    if(M.learn>=0){M.map[d1]=M.learn;U.setStatus('The '+KNOBS[M.learn]+' knob follows CC '+d1+' now');M.learn=-1;save();render();return}
    const k=M.map[d1];if(k!==undefined&&U.opKnobFrac)U.opKnobFrac(k,d2/127);
  }
}
// out: audio time to the MIDI clock's time base
function perfTime(t){const ot=E.ctx&&E.ctx.getOutputTimestamp?E.ctx.getOutputTimestamp():null;if(!ot||ot.performanceTime===undefined)return performance.now()+Math.max(0,(t-E.ctx.currentTime)*1000);return ot.performanceTime+(t-ot.contextTime)*1000}
const send=(bytes,t)=>{if(!M.out)return;try{M.out.send(bytes,t===undefined?undefined:Math.max(performance.now(),perfTime(t)))}catch(e){}};
E.onTransport=on=>{if(!M.out)return;if(M.clock)send(on?[0xFA]:[0xFC]);if(!on)for(let c=0;c<16;c++)send([0xB0|c,123,0])};
E.onStep=(step,t,d)=>{if(!M.out||!M.clock)return;for(let k=0;k<6;k++)send([0xF8],t+k*d/6)};
E.onNote=(L,midi,vel,t,dur)=>{if(!M.out||!M.notesOut||CH[L]===undefined)return;const ch=CH[L],v=Math.max(1,Math.min(127,Math.round(vel*127)));send([0x90|ch,midi,v],t);send([0x80|ch,midi,0],t+Math.max(0.03,dur))};
E.onDrum=(kind,vel,t)=>{if(!M.out||!M.notesOut)return;const n=GM[kind];if(!n)return;send([0x99,n,Math.max(1,Math.min(127,Math.round(vel*127)))],t);send([0x89,n,0],t+0.1)};
function render(){
  const box=$('midiBox');if(!box)return;
  $('midiState').textContent=M.on?(M.inp?M.inp.name:'no input')+(M.out?' → '+M.out.name:''):'off';
  $('midiOn').hidden=M.on;$('midiPorts').hidden=!M.on;
  if(!M.on)return;
  const opt=(list,cur,none)=>'<option value="">'+none+'</option>'+list.map(p=>'<option value="'+p.id+'"'+(p.id===cur?' selected':'')+'>'+p.name+'</option>').join('');
  $('midiIn').innerHTML=opt(M.inputs,M.inId,'no input');$('midiOut').innerHTML=opt(M.outputs,M.outId,'no output');
  $('midiClock').classList.toggle('on',M.clock);$('midiNotes').classList.toggle('on',M.notesOut);
  $('midiLearn').innerHTML=KNOBS.map((n,i)=>{const cc=Object.keys(M.map).find(c=>M.map[c]===i);return '<button class="opt'+(M.learn===i?' on':'')+'" data-learn="'+i+'" title="Click, then move a control on your controller">'+n+(cc!==undefined?' · CC '+cc:'')+'</button>'}).join('');
}
$('midiOn').addEventListener('click',enable);
$('midiIn').addEventListener('change',e=>{M.inId=e.target.value;refreshPorts()});
$('midiOut').addEventListener('change',e=>{M.outId=e.target.value;refreshPorts()});
$('midiClock').addEventListener('click',()=>{M.clock=!M.clock;save();render()});
$('midiNotes').addEventListener('click',()=>{M.notesOut=!M.notesOut;save();render()});
$('midiLearn').addEventListener('click',e=>{const b=e.target.closest('[data-learn]');if(!b)return;M.learn=M.learn===+b.dataset.learn?-1:+b.dataset.learn;render();if(M.learn>=0)U.setStatus('Move a knob or fader on your controller to map it to the '+KNOBS[M.learn]+' knob')});
load();render();
Object.assign(U,{midi:M,midiEnable:enable});
})();
