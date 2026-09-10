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
// recording from the keys into a layer: a pressed letter key lands where that layer sings — the lead as
// played, the arp an octave up inside its lane, the bass inside MIDI 36–59 — always keeping its pitch class,
// and the result is diatonic to the chord scale, so an arp or bass take is as locked as a drawn note.
for(const scale in Z.SCALES){
  const cs=Z.chordScaleOf(scale);
  for(let root=0;root<12;root++){
    const base=(root>=6?48:60)+root,ar=Z.arpRange(root),chPcs=pcsOf(root,cs.steps);
    const keys=Z.scalePitches({root,scale},base,base+40).filter(p=>!p.passing).slice(0,14);
    const tag=' [record into · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+']';
    assert(keys.length>0,'no letter keys in this key'+tag);
    keys.forEach(p=>{
      const pc=p.midi%12;
      assert(Z.recordPitch('lead',p.midi,root)===p.midi,'the lead records at a pitch other than the one you press'+tag);
      const a=Z.recordPitch('arp',p.midi,root);
      assert(a%12===pc,'recorded arp note lost its pitch class'+tag);
      assert(a>=ar[0]&&a<=ar[1],'recorded arp note '+a+' outside the arp lane '+ar.join('–')+tag);
      assert(chPcs.has(a%12),'recorded arp note '+Z.NOTE_NAMES[a%12]+' outside the chord scale'+tag);
      const b=Z.recordPitch('bass',p.midi,root);
      assert(b%12===pc,'recorded bass note lost its pitch class'+tag);
      assert(b>=Z.BASS_LO&&b<=Z.BASS_HI,'recorded bass note '+b+' out of register'+tag);
      assert(chPcs.has(b%12),'recorded bass note '+Z.NOTE_NAMES[b%12]+' outside the chord scale'+tag);
    });
    // a take goes through the same path as a drawn lane, so it comes back verbatim and stays in register
    const S={chords:'REC001',lead:'REC001',arp:'REC001',bass:'REC001',drums:'REC001'};
    const cfgR={root,scale,energy:55,evolve:true,sevenths:false,gate:0.7};
    const take=L=>keys.slice(0,6).map((p,i)=>({step:i*4,dur:3,midi:Z.recordPitch(L,p.midi,root),vel:0.85}));
    const ta=Z.generateTrack(Object.assign({},cfgR,{arpEvents:take('arp')}),S,'v',0);
    ta.arp.forEach((e,i)=>{assert(e.midi===take('arp')[i].midi,'a recorded arp note changed on the way to playback'+tag);
      assert(chPcs.has(((e.midi%12)+12)%12),'a recorded arp note left the chord scale'+tag)});
    const tb=Z.generateTrack(Object.assign({},cfgR,{bassEvents:take('bass')}),S,'v',0);
    tb.bass.forEach(e=>{assert(e.midi>=Z.BASS_LO&&e.midi<=Z.BASS_HI,'a recorded bass note left its register'+tag);
      assert(chPcs.has(((e.midi%12)+12)%12),'a recorded bass note left the chord scale'+tag)});
  }
}

// chords edited on the chord cards: a progression of objects keeps every degree, its per-chord bar length,
// its per-chord seventh and its inversion, always fills the 8 bars of the loop, and stays in the chord
// scale. Plain degree arrays — what a chord-box sketch produces — keep working beside them.
for(const scale in Z.SCALES){
  const cs=Z.chordScaleOf(scale),n=cs.steps.length;
  for(const root of [0,4,9]){
    const chPcs=pcsOf(root,cs.steps),tag=' [chord cards · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+']';
    const S={chords:'PROG01',lead:'PROG01',arp:'PROG01',bass:'PROG01',drums:'PROG01'};
    const base={root,scale,energy:55,evolve:true,sevenths:false,gate:0.7};
    const inScale=(t,why)=>{
      assert(t.chords.reduce((a,c)=>a+c.bars,0)===Z.BARS,why+' does not cover 8 bars'+tag);
      t.chords.forEach(c=>{
        assert(c.notes.length>=3&&c.notes.every((m,i)=>i===0||m>c.notes[i-1]),why+' voicing not ascending: '+c.notes.join('/')+tag);
        c.notes.forEach(m=>assert(chPcs.has(((m%12)+12)%12),why+' tone '+Z.NOTE_NAMES[m%12]+' outside the chord scale'+tag));
      });
    };
    // per-chord bar lengths: I for 4 bars, then IV and V for 2 — the fourth chord no longer fits and steps aside
    const wanted=[{d:0,bars:4},{d:3,bars:2},{d:4,bars:2,seventh:true},{d:1,bars:2}];
    const t=Z.generateTrack(Object.assign({},base,{prog:wanted}),S,'v',0);
    inScale(t,'an edited progression');
    assert(t.chords.length===3,'per-chord bars: kept '+t.chords.length+' chords, expected the 3 that fit 8 bars'+tag);
    assert(t.chords.map(c=>c.bars).join()==='4,2,2','per-chord bar lengths ignored: '+t.chords.map(c=>c.bars).join()+tag);
    assert(t.chords.map(c=>c.degree).join()==='0,3,4','edited chord degrees not honoured'+tag);
    assert(t.chords[2].notes.length===4,'a chord asked for its seventh and did not get it'+tag);
    assert(t.chords[0].notes.length===3,'a chord took a seventh it was not given'+tag);
    // the arp and the bass follow the edited chords, so the whole track moves with them
    t.arp.forEach(e=>assert(Z.chordAt(t.chords,e.step).pcs.has(((e.midi%12)+12)%12),'arp note not in the edited chord'+tag));
    t.bass.forEach(e=>assert(chPcs.has(((e.midi%12)+12)%12),'bass note left the scale over edited chords'+tag));
    // a fixed inversion puts the chord tone you picked at the bottom, in every key and scale
    for(let inv=0;inv<3;inv++){
      const ti=Z.generateTrack(Object.assign({},base,{prog:[{d:0,bars:4,inv},{d:3,bars:4,inv}]}),S,'v',0);
      inScale(ti,'an inverted progression');
      ti.chords.forEach((c,i)=>{
        const want=Z.buildChord(cs.steps,i?3:0,3,60+root)[inv]%12;
        assert(((c.notes[0]%12)+12)%12===want,'inversion '+inv+' did not put the right chord tone in the bass'+tag);
        assert(c.inv===inv,'chord reports inversion '+c.inv+', expected '+inv+tag);
      });
    }
    // a plain degree array still lays out evenly, and one chord fills the whole loop
    const sketch=[0,3,4,0];
    const tp=Z.generateTrack(Object.assign({},base,{prog:sketch}),S,'v',0);
    inScale(tp,'a sketched progression');
    assert(tp.chords.map(c=>c.degree).join()===sketch.join(),'a sketched progression was not honoured'+tag);
    assert(tp.chords.every(c=>c.bars===2),'a sketched progression did not share the bars evenly'+tag);
    const t1=Z.generateTrack(Object.assign({},base,{prog:[{d:n-1,bars:1}]}),S,'v',0);
    inScale(t1,'a single chord');
    assert(t1.chords.length===1&&t1.chords[0].degree===n-1,'a single edited chord did not fill the loop'+tag);
    // a progression survives the round trip through a track code, modifiers and all
    const codeStr=Z.progCode(wanted),back=Z.parseProgCode(codeStr);
    assert(JSON.stringify(back)===JSON.stringify(wanted),'a progression did not survive its track code: '+codeStr+tag);
    assert(JSON.stringify(Z.parseProgCode(Z.progCode(sketch)))===JSON.stringify(sketch.map(d=>({d}))),'a sketched progression did not survive its track code'+tag);
  }
}

// per-section filter sweeps: the plan playback and the WAV export both follow. A sweep must start and
// end on a real, audible frequency, never run past the section it belongs to, and always hand the next
// section a wide-open mix — so a sweep can shape a song but can never silence one.
for(const bars of [1,2,4,8,16]){
  for(const bpm of [60,92,138,180]){
    const stepSec=60/bpm/4,steps=bars*Z.STEPS,len=steps*stepSec;
    const tag=' [sweep · '+bars+' bars · '+bpm+' bpm]';
    ['none',undefined,null,'','sideways'].forEach(m=>assert(Z.sweepPlan(m,steps,stepSec)===null,'sweep mode '+m+' should mean no sweep at all'+tag));
    ['up','down'].forEach(mode=>{
      const plan=Z.sweepPlan(mode,steps,stepSec),what=' ('+mode+')'+tag;
      assert(Array.isArray(plan)&&plan.length>=2,'sweep plan missing'+what);
      if(!Array.isArray(plan))return;
      let prev=-1;
      plan.forEach(p=>{
        assert(p.t>=0&&p.t<=len+1e-9,'sweep point at '+p.t+' s outside the section'+what);
        assert(p.t>=prev-1e-9,'sweep points out of order'+what);prev=p.t;
        assert(p.hz>=Z.SWEEP.lo&&p.hz<=Z.SWEEP.open,'sweep frequency '+p.hz+' Hz outside '+Z.SWEEP.lo+'–'+Z.SWEEP.open+what);
        assert(p.hz>0,'a sweep frequency of 0 Hz would silence the mix'+what); // exponential ramps need a positive target
      });
      assert(plan[0].t===0&&plan[0].ramp===false,'a sweep must set its starting value on the first step'+what);
      assert(Math.abs(plan[plan.length-1].t-len)<1e-9,'a sweep must land exactly at the end of its section'+what);
      if(mode==='up'){
        assert(plan[0].hz===Z.SWEEP.lo,'an up sweep must start dark'+what);
        assert(plan[plan.length-1].hz===Z.SWEEP.open,'an up sweep must end wide open'+what);
      }else{
        assert(plan[0].hz===Z.SWEEP.open,'a down sweep must start wide open'+what);
        assert(plan[plan.length-1].hz===Z.SWEEP.lo,'a down sweep must end closed'+what);
        // it closes over the last bar and not a step before, so the section plays open until then
        const fall=Math.min(Z.STEPS*stepSec,len),hold=plan[plan.length-2];
        assert(Math.abs(hold.t-(len-fall))<1e-9,'a down sweep starts closing at '+hold.t+' s, expected '+(len-fall)+what);
        assert(hold.hz===Z.SWEEP.open,'a down sweep must still be open when it starts closing'+what);
      }
    });
  }
}

// per-section fades: the plan playback, the WAV export and the MIDI volume automation all follow. A fade
// must move between silence and full level and nothing else, stay inside its own section, never reach a
// gain of 0 (an exponential ramp cannot land there), and always leave a section that does not fade — and
// every section after a fade-in — at full level, so a fade can shape a song but can never mute one.
for(const bars of [1,2,4,8,16]){
  for(const bpm of [60,92,138,180]){
    const stepSec=60/bpm/4,steps=bars*Z.STEPS,len=steps*stepSec;
    const span=Math.min(Z.FADE.bars*Z.STEPS*stepSec,len),tag=' [fade · '+bars+' bars · '+bpm+' bpm]';
    ['none',undefined,null,'','sideways','up'].forEach(m=>assert(Z.fadePlan(m,steps,stepSec)===null,'fade mode '+m+' should mean no fade at all'+tag));
    assert(Z.fadeGain(null,0)===Z.FADE.full&&Z.fadeGain(null,len)===Z.FADE.full,'a section that does not fade must play at full level'+tag);
    ['in','out'].forEach(mode=>{
      const plan=Z.fadePlan(mode,steps,stepSec),what=' ('+mode+')'+tag;
      assert(Array.isArray(plan)&&plan.length>=2,'fade plan missing'+what);
      if(!Array.isArray(plan))return;
      let prev=-1;
      plan.forEach(p=>{
        assert(p.t>=0&&p.t<=len+1e-9,'fade point at '+p.t+' s outside the section'+what);
        assert(p.t>=prev-1e-9,'fade points out of order'+what);prev=p.t;
        assert(p.g>=Z.FADE.lo&&p.g<=Z.FADE.full,'fade gain '+p.g+' outside '+Z.FADE.lo+'–'+Z.FADE.full+what);
        assert(p.g>0,'a fade gain of 0 would break the exponential ramp'+what);
      });
      assert(plan[0].t===0&&plan[0].ramp===false,'a fade must set its starting value on the first step'+what);
      // the curve the engine hears and the MIDI export samples: it starts and ends where the plan says
      assert(Math.abs(Z.fadeGain(plan,0)-plan[0].g)<1e-12,'the fade curve does not start where the plan does'+what);
      assert(Math.abs(Z.fadeGain(plan,len)-plan[plan.length-1].g)<1e-12,'the fade curve does not end where the plan does'+what);
      assert(Z.fadeGain(plan,-1)===plan[0].g,'the fade curve must hold its first value before the section'+what);
      let last=-1;
      for(let i=0;i<=40;i++){
        const g=Z.fadeGain(plan,len*i/40);
        assert(g>0&&g<=Z.FADE.full+1e-12,'fade gain '+g+' outside (0, 1]'+what);
        const rising=mode==='in'?g>=last-1e-12:g<=(last<0?Z.FADE.full:last)+1e-12;
        assert(rising,'a fade '+mode+' is not moving in one direction at '+(i/40)+' of the section'+what);
        last=g;
      }
      // a fade you can hear: halfway through its two bars it sits in the audible range, not already gone
      const mid=Z.fadeGain(plan,mode==='in'?span/2:len-span/2);
      assert(mid>0.03&&mid<Z.FADE.full,'halfway through, a fade '+mode+' is at '+mid+', not in the range you can hear'+what);
      if(mode==='in'){
        assert(plan[0].g===Z.FADE.lo,'a fade in must start from silence'+what);
        assert(plan[plan.length-1].g===Z.FADE.full,'a fade in must reach full level'+what);
        assert(Math.abs(plan[plan.length-1].t-span)<1e-9,'a fade in must be up at '+span+' s, the end of its second bar'+what);
        assert(Z.fadeGain(plan,span)===Z.FADE.full,'a fade in must be at full level once it is up'+what);
        assert(Z.fadeGain(plan,len)===Z.FADE.full,'a fade in must hand the next section a full mix'+what);
      }else{
        assert(plan[0].g===Z.FADE.full,'a fade out must start at full level'+what);
        assert(plan[plan.length-1].g===Z.FADE.lo,'a fade out must end in silence'+what);
        assert(Math.abs(plan[plan.length-1].t-len)<1e-9,'a fade out must land exactly at the end of its section'+what);
        // it falls over the last two bars and not a step before, so the section plays full until then
        assert(Z.fadeGain(plan,Math.max(0,len-span-1e-6))===Z.FADE.full,'a fade out must still be at full level when it starts falling'+what);
      }
    });
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
  '<ul style="color:#a3a8bf;margin-top:20px;line-height:1.8"><li>Every chord tone, arp note and bass note is diatonic to the chord scale.</li><li>Every melody note is in the melody scale; blues passing tones never land on a downbeat.</li><li>At least 60 % of melody downbeats are chord tones of the chord sounding at that moment.</li><li>Arps only use tones of the chord that is playing.</li><li>Generation is deterministic, so a chorus hook returns note for note.</li><li>Sketched progressions and edited drum patterns are honoured exactly.</li><li>Chords edited on the cards keep their degree, bar length, seventh and inversion, still fill 8 bars, and survive a track code.</li><li>Edited and recorded lead notes come back verbatim, follow the section key shift and stay in scale.</li><li>Notes drawn into the arp and bass lanes do the same, and the bass stays inside MIDI 36–59.</li><li>A letter key recorded into the arp or the bass keeps its pitch class, lands in that layer\'s own register and stays diatonic to the chord scale.</li><li>Every chord-box pad in every key is entirely in scale.</li><li>A section filter sweep starts and ends on an audible frequency, stays inside its own section and always hands the next one a wide-open mix.</li><li>A section fade moves between silence and full level in one direction, stays inside its own section, never reaches a gain of 0, and leaves every unfaded section at full level.</li></ul>';
document.body.appendChild(h);
}
if(document.body)report();else document.addEventListener('DOMContentLoaded',report);
})();
