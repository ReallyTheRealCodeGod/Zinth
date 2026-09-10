// Theory self-test: proves that everything Zinth generates stays inside the chosen key and scale.
// Open tests/check.html in a browser (built by build.sh); it runs on load and prints a report.
(()=>{
'use strict';
const Z=window.Z;
const results=[];let fails=0,tracks=0;
const assert=(ok,msg)=>{if(!ok){fails++;results.push(msg)}};
const pcsOf=(root,steps)=>new Set(steps.map(s=>(root+s)%12));
const seeds=['ALPHA1','BRAVO2','CHARL3','DELTA4','ECHO55','FOX666'];
const t0=performance.now();

for(const scale in Z.SCALES){
  const sc=Z.SCALES[scale],cs=Z.chordScaleOf(scale);
  for(const root of [0,3,7,10]){
    const melPcs=pcsOf(root,sc.steps),chPcs=pcsOf(root,cs.steps);
    for(const seed of seeds){
      for(const part of ['v','c']){
        const energy=20+(seed.charCodeAt(1)*13)%70;
        const cfg={root,scale,energy,leadEnergy:energy+(part==='c'?10:0),evolve:true,sevenths:seed<'D',gate:0.7,hook:part==='c'};
        const S={chords:seed,lead:seed+'l',arp:seed+'a',bass:seed+'b',drums:seed+'d'};
        const t=Z.generateTrack(cfg,S,part,0);tracks++;
        const tag=' ['+Z.NOTE_NAMES[root]+' '+sc.name+' · '+seed+' · '+part+']';
        // harmony: every chord tone is diatonic to the chord scale
        t.chords.forEach(c=>c.notes.forEach(m=>assert(chPcs.has(((m%12)+12)%12),'chord tone '+Z.NOTE_NAMES[m%12]+' of '+c.name+' outside scale'+tag)));
        assert(t.chords.reduce((a,c)=>a+c.bars,0)===Z.BARS,'chords do not cover 8 bars'+tag);
        t.chords.forEach(c=>assert(c.notes.length>=3&&c.notes.every((m,i)=>i===0||m>c.notes[i-1]),'chord voicing not ascending: '+c.notes.join('/')+tag));
        // melody: every note is in the melody scale; passing tones never sit on a downbeat
        t.lead.forEach(e=>{
          assert(melPcs.has(((e.midi%12)+12)%12),'lead note '+Z.NOTE_NAMES[e.midi%12]+' outside scale'+tag);
          const rel=((e.midi-root)%12+12)%12;
          if(sc.passing&&sc.passing.includes(rel))assert(e.step%4!==0,'passing tone on a downbeat at step '+e.step+tag);
          assert(e.step>=0&&e.step<Z.TOTAL&&e.dur>=1,'lead event out of range'+tag);
        });
        // strong beats lean on chord tones (at least 60 % of downbeats)
        const strong=t.lead.filter(e=>e.step%4===0);
        if(strong.length>=5){const ct=strong.filter(e=>Z.chordAt(t.chords,e.step).pcs.has(((e.midi%12)+12)%12)).length;assert(ct/strong.length>=0.6,'only '+ct+'/'+strong.length+' downbeats on chord tones'+tag)}
        // arp and bass: diatonic to the chord scale, bass in its register
        t.arp.forEach(e=>assert(chPcs.has(((e.midi%12)+12)%12),'arp note outside scale'+tag));
        t.bass.forEach(e=>{assert(chPcs.has(((e.midi%12)+12)%12),'bass note outside scale'+tag);assert(e.midi>=36&&e.midi<=59,'bass note '+e.midi+' out of register'+tag)});
        // arp only uses tones of the chord sounding at that step
        t.arp.forEach(e=>assert(Z.chordAt(t.chords,e.step).pcs.has(((e.midi%12)+12)%12),'arp note not in the current chord'+tag));
        // drums: five rows of sixteen, events within the loop
        Z.DRUM_KINDS.forEach(k=>assert(Array.isArray(t.drumPattern[k])&&t.drumPattern[k].length===16,'drum row '+k+' malformed'+tag));
        t.drums.forEach(d=>assert(d.step>=0&&d.step<Z.TOTAL,'drum hit out of range'+tag));
        // determinism: the same seeds give the same track, so a chorus hook returns identical
        const t2=Z.generateTrack(cfg,S,part,0);
        assert(JSON.stringify(t2.lead)===JSON.stringify(t.lead)&&JSON.stringify(t2.chords.map(c=>c.notes))===JSON.stringify(t.chords.map(c=>c.notes)),'generation is not deterministic'+tag);
        // a sketched progression is honoured exactly, in order, over 8 bars
        const custom=[0,3,4,0].filter(d=>d<cs.steps.length);
        const t3=Z.generateTrack(Object.assign({},cfg,{prog:custom}),S,part,0);
        assert(t3.chords.map(c=>c.degree).join()===custom.join(),'custom progression not honoured'+tag);
        // an edited drum pattern is used verbatim
        const P=Z.generateDrumPattern(cfg,new Z.Rng('x'));P.clap[2]=1;
        const t4=Z.generateTrack(Object.assign({},cfg,{drumPattern:P}),S,part,0);
        assert(t4.drums.some(d=>d.kind==='clap'&&d.step===2),'edited drum pattern ignored'+tag);
      }
    }
  }
}
// edited and recorded lead notes (the roll's lead lane and Rec share this path): notes are stored
// without the section's key shift, come back verbatim, follow the shift, and stay in the scale
for(const scale in Z.SCALES){
  for(const root of [0,5,11]){
    for(const transpose of [-2,0,3]){
      const secRoot=((root+transpose)%12+12)%12,melPcs=pcsOf(secRoot,Z.SCALES[scale].steps);
      const pitches=Z.scalePitches({root,scale},60,84);
      const edits=[{step:0,dur:4,midi:pitches[0].midi,vel:0.85},{step:9,dur:2,midi:pitches[2].midi,vel:0.7},
        {step:Z.TOTAL-1,dur:8,midi:pitches[1].midi,vel:0.6},{step:Z.TOTAL+4,dur:2,midi:pitches[0].midi,vel:0.85}];
      const cfg={root:secRoot,scale,energy:60,evolve:true,sevenths:false,gate:0.7,transpose,leadEvents:edits};
      const t=Z.generateTrack(cfg,{chords:'EDIT01',lead:'EDIT01',arp:'EDIT01',bass:'EDIT01',drums:'EDIT01'},'v',0);
      const tag=' [edited lead · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+' · '+transpose+' st]';
      assert(t.lead.length===3,'edited lead kept '+t.lead.length+' notes, expected the 3 inside the loop'+tag);
      t.lead.forEach((e,i)=>{
        assert(e.step===edits[i].step&&e.dur===edits[i].dur&&e.vel===edits[i].vel,'edited lead note changed'+tag);
        assert(e.midi===edits[i].midi+transpose,'edited lead note did not follow the section key shift'+tag);
        assert(melPcs.has(((e.midi%12)+12)%12),'edited lead note '+Z.NOTE_NAMES[e.midi%12]+' outside scale'+tag);
        assert(t.byStep.lead[e.step].includes(e),'edited lead note missing from the playback index'+tag);
      });
    }
  }
}
// notes drawn into the arp and bass lanes of the roll: stored without the section's key shift, they come
// back verbatim, follow the shift, stay in the chord scale, and the bass stays inside its own register
for(const scale in Z.SCALES){
  const cs=Z.chordScaleOf(scale),csKey=Z.SCALES[scale].chord||scale;
  for(const root of [0,5,11]){
    for(const transpose of [-2,0,3]){
      const secRoot=((root+transpose)%12+12)%12,chPcs=pcsOf(secRoot,cs.steps);
      const seeds2={chords:'EDIT02',lead:'EDIT02',arp:'EDIT02',bass:'EDIT02',drums:'EDIT02'};
      const base={root:secRoot,scale,energy:60,evolve:true,sevenths:false,gate:0.7,transpose};
      const tag=' [drawn arp and bass · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+' · '+transpose+' st]';
      // arp: the roll offers the chord scale two octaves above the chord register
      const ap=Z.scalePitches({root,scale:csKey},72,96);
      const arpEdits=[{step:0,dur:2,midi:ap[0].midi,vel:0.8},{step:17,dur:1,midi:ap[2].midi,vel:0.6},
        {step:Z.TOTAL-2,dur:4,midi:ap[1].midi,vel:0.5},{step:Z.TOTAL+3,dur:2,midi:ap[0].midi,vel:0.8}];
      const ta=Z.generateTrack(Object.assign({},base,{arpEvents:arpEdits}),seeds2,'v',0);
      assert(ta.arp.length===3,'drawn arp kept '+ta.arp.length+' notes, expected the 3 inside the loop'+tag);
      ta.arp.forEach((e,i)=>{
        assert(e.step===arpEdits[i].step&&e.dur===arpEdits[i].dur&&e.vel===arpEdits[i].vel,'drawn arp note changed'+tag);
        assert(e.midi===arpEdits[i].midi+transpose,'drawn arp note did not follow the section key shift'+tag);
        assert(chPcs.has(((e.midi%12)+12)%12),'drawn arp note '+Z.NOTE_NAMES[e.midi%12]+' outside the chord scale'+tag);
        assert(ta.byStep.arp[e.step].includes(e),'drawn arp note missing from the playback index'+tag);
      });
      assert(JSON.stringify(ta.lead)===JSON.stringify(Z.generateTrack(base,seeds2,'v',0).lead),'drawing the arp changed the lead'+tag);
      // bass: the roll offers the chord scale inside the bass register, and the key shift folds back into it
      const bp=Z.scalePitches({root,scale:csKey},Z.BASS_LO,Z.BASS_HI);
      const bassEdits=[{step:0,dur:8,midi:bp[0].midi,vel:0.9},{step:12,dur:4,midi:bp[bp.length-1].midi,vel:0.7},
        {step:Z.TOTAL-5,dur:6,midi:bp[1].midi,vel:0.8},{step:Z.TOTAL+9,dur:2,midi:bp[0].midi,vel:0.9}];
      const tb=Z.generateTrack(Object.assign({},base,{bassEvents:bassEdits}),seeds2,'v',0);
      assert(tb.bass.length===3,'drawn bass kept '+tb.bass.length+' notes, expected the 3 inside the loop'+tag);
      tb.bass.forEach((e,i)=>{
        assert(e.step===bassEdits[i].step&&e.dur===bassEdits[i].dur&&e.vel===bassEdits[i].vel,'drawn bass note changed'+tag);
        assert(((e.midi-(bassEdits[i].midi+transpose))%12+12)%12===0,'drawn bass note lost its pitch class'+tag);
        assert(e.midi>=Z.BASS_LO&&e.midi<=Z.BASS_HI,'drawn bass note '+e.midi+' out of register'+tag);
        assert(chPcs.has(((e.midi%12)+12)%12),'drawn bass note '+Z.NOTE_NAMES[e.midi%12]+' outside the chord scale'+tag);
        assert(tb.byStep.bass[e.step].includes(e),'drawn bass note missing from the playback index'+tag);
      });
    }
  }
}
// chord box voicings: every diatonic chord of every scale, in every key, is entirely in scale
for(const scale in Z.SCALES){const cs=Z.chordScaleOf(scale);for(let root=0;root<12;root++){const chPcs=pcsOf(root,cs.steps);
  cs.steps.forEach((_,d)=>[3,4].forEach(size=>Z.buildChord(cs.steps,d,size,60+root).forEach(m=>assert(chPcs.has(((m%12)+12)%12),'pad chord degree '+(d+1)+' outside '+Z.NOTE_NAMES[root]+' '+cs.name))))}}

const ms=Math.round(performance.now()-t0);
window.ZINTH_CHECK={fails,tracks,ms,results};
function report(){
document.body.style.cssText='margin:0;padding:32px;background:#13151d;color:#ece6d8;font:14px/1.5 "IBM Plex Sans",system-ui,sans-serif';
const h=document.createElement('div');
h.innerHTML='<h1 style="font:700 26px \'Chakra Petch\',sans-serif;letter-spacing:.12em;margin:0 0 6px">ZIN<span style="color:#f5a524">TH</span> theory check</h1>'+
  '<p style="color:#a3a8bf;margin:0 0 18px">'+tracks+' generated tracks across '+Object.keys(Z.SCALES).length+' scales, 4 keys, '+seeds.length+' seeds and both song parts, plus every chord-box voicing in all 12 keys. '+ms+' ms.</p>'+
  '<div style="display:inline-block;padding:10px 16px;border-radius:6px;font:600 15px \'Chakra Petch\',sans-serif;letter-spacing:.1em;background:'+(fails?'rgba(242,109,133,.15);color:#f26d85;border:1px solid #f26d85':'rgba(79,209,197,.15);color:#4fd1c5;border:1px solid #4fd1c5')+'">'+(fails?fails+' FAILURES':'ALL CHECKS PASS')+'</div>'+
  (fails?'<ul style="font:13px \'IBM Plex Mono\',monospace;color:#f26d85;line-height:1.7">'+results.slice(0,200).map(r=>'<li>'+r+'</li>').join('')+'</ul>':'')+
  '<ul style="color:#a3a8bf;margin-top:20px;line-height:1.8"><li>Every chord tone, arp note and bass note is diatonic to the chord scale.</li><li>Every melody note is in the melody scale; blues passing tones never land on a downbeat.</li><li>At least 60 % of melody downbeats are chord tones of the chord sounding at that moment.</li><li>Arps only use tones of the chord that is playing.</li><li>Generation is deterministic, so a chorus hook returns note for note.</li><li>Sketched progressions and edited drum patterns are honoured exactly.</li><li>Edited and recorded lead notes come back verbatim, follow the section key shift and stay in scale.</li><li>Notes drawn into the arp and bass lanes do the same, and the bass stays inside MIDI 36–59.</li><li>Every chord-box pad in every key is entirely in scale.</li></ul>';
document.body.appendChild(h);
}
if(document.body)report();else document.addEventListener('DOMContentLoaded',report);
})();
