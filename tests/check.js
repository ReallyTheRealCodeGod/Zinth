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

// analog drift: every synth voice wanders a few cents in pitch and a little in filter cutoff, so no two
// notes are identical. The scale lock says how far it may go: a drifted note must still round to exactly
// the note that was asked for, in every key, at every setting of the knob — including one set past its own
// range. And the filter multiplier must stay a positive number, or a drifted note would be lost entirely.
{
  const rs=[0,0.001,0.17,0.5,0.83,1],amounts=[0,1,12,28,50,75,100];
  // an amount past either end of the knob is clamped to it; anything that is not a number at all means no drift
  const bad=[-40,140,NaN,undefined,null,'x'],none=[-40,NaN,undefined,null,'x'];
  assert(Z.DRIFT.cents>0&&Z.DRIFT.cents<50,'drift of '+Z.DRIFT.cents+' cents could reach the next semitone');
  assert(Z.DRIFT.cutoff>0&&Z.DRIFT.cutoff<1,'a filter drift of '+Z.DRIFT.cutoff+' could close a voice completely');
  assert(Z.DRIFT.seconds>0,'drift must wander over a real span of time');
  for(const r of rs){
    assert(Z.driftCents(0,r)===0,'drift at 0 must leave a note perfectly still (r='+r+')');
    assert(Z.driftCutoff(0,r)===1,'drift at 0 must leave the filter cutoff alone (r='+r+')');
    for(const a of amounts.concat(bad)){
      const c=Z.driftCents(a,r),k=Z.driftCutoff(a,r),tag=' [drift '+a+' · r='+r+']';
      assert(Math.abs(c)<=Z.DRIFT.cents+1e-12,'drift of '+c+' cents is past the '+Z.DRIFT.cents+' the knob allows'+tag);
      assert(Math.abs(c)<50,'drift of '+c+' cents would change the note itself'+tag);
      assert(k>0,'a filter drift multiplier of '+k+' would silence the voice'+tag);
      assert(Math.abs(k-1)<=Z.DRIFT.cutoff+1e-12,'filter drift '+k+' is past the range the knob allows'+tag);
    }
    // an amount that is not a number, or one below the knob, is read as no drift at all
    for(const a of none)assert(Z.driftCents(a,r)===0&&Z.driftCutoff(a,r)===1,'a drift amount of '+a+' should mean no drift');
    // and one past the top of the knob is read as the top of the knob, never as something wilder
    assert(Z.driftCents(140,r)===Z.driftCents(100,r)&&Z.driftCutoff(140,r)===Z.driftCutoff(100,r),'a drift amount past 100 should clamp to 100 (r='+r+')');
  }
  // the knob's ends and its centre: fully flat, fully sharp, and dead in tune
  assert(Z.driftCents(100,0)===-Z.DRIFT.cents&&Z.driftCents(100,1)===Z.DRIFT.cents,'the drift knob does not reach its own limits');
  assert(Z.driftCents(100,0.5)===0&&Z.driftCutoff(100,0.5)===1,'the middle of the drift range must be dead in tune');
  assert(Z.driftCents(50,1)===Z.DRIFT.cents/2,'the drift amount does not scale evenly');
  // an r outside [0,1] is clamped, so a stray random value can never push a note out of key
  assert(Z.driftCents(100,9)===Z.DRIFT.cents&&Z.driftCents(100,-9)===-Z.DRIFT.cents,'drift must clamp a random value outside 0–1');
  // the scale lock itself: a drifted note still rounds to the note that was played, in every key and scale
  for(const scale in Z.SCALES){
    for(let root=0;root<12;root++){
      const tag=' [drift · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+']';
      for(const p of Z.scalePitches({root,scale},Z.BASS_LO,96)){
        for(const r of rs){
          const heard=p.midi+Z.driftCents(100,r)/100;
          assert(Math.round(heard)===p.midi,'a drifted note sounds as '+heard+', not the '+p.midi+' that was played'+tag);
          assert(((Math.round(heard)%12)+12)%12===((p.midi%12)+12)%12,'a drifted note lost its pitch class'+tag);
        }
      }
    }
  }
}

// chorus: a delay line that moves bends the pitch of whatever runs through it, so the stereo chorus every
// synth layer can send into is held to the same rule as analog drift — it may widen a note, never change it.
// Its delay lines must also stay inside the buffer they were given and never ask for a negative delay time.
{
  const V=Z.CHORUS.voices;
  assert(Array.isArray(V)&&V.length>=2,'a stereo chorus needs at least two voices');
  assert(Z.CHORUS.mix>0&&Z.CHORUS.mix<=1,'the chorus return of '+Z.CHORUS.mix+' is not a usable mix level');
  assert(Z.CHORUS.maxCents>0&&Z.CHORUS.maxCents<50,'a chorus allowed '+Z.CHORUS.maxCents+' cents could change the note');
  V.forEach((v,i)=>{
    const tag=' [chorus voice '+(i+1)+']';
    assert(v.delay-v.depth>0,'a chorus voice would ask for a negative delay time'+tag);
    assert(v.delay+v.depth<Z.CHORUS.maxDelay,'a chorus voice would run past its own delay buffer'+tag);
    assert(v.delay>=0.005&&v.delay<=0.04,'a delay of '+v.delay+' s is an echo or a comb, not a chorus'+tag);
    assert(v.rate>0.05&&v.rate<2,'a chorus rate of '+v.rate+' Hz is not the slow drift a chorus wants'+tag);
    assert(v.depth>0,'a chorus voice that does not move is just a delay'+tag);
    assert(v.pan>=-1&&v.pan<=1,'a chorus voice is panned outside the stereo field'+tag);
    const cents=Z.chorusCents(v);
    assert(cents>0,'a chorus voice must move the pitch a little, or it adds nothing'+tag);
    assert(cents<=Z.CHORUS.maxCents,'a chorus voice bends a note by '+cents+' cents, past the '+Z.CHORUS.maxCents+' allowed'+tag);
    assert(cents<50,'a chorus voice bends a note by '+cents+' cents, far enough to change the note'+tag);
    // the scale lock: a chorused note still rounds to the note that was played, in every key and scale
    for(const dir of [-1,1])for(const m of [Z.BASS_LO,60,72,96])
      assert(Math.round(m+dir*cents/100)===m,'a chorused note sounds as '+(m+dir*cents/100)+', not the '+m+' that was played'+tag);
  });
  assert(V.some(v=>v.pan<0)&&V.some(v=>v.pan>0),'a stereo chorus must reach both sides of the field');
  assert(new Set(V.map(v=>v.rate)).size===V.length,'chorus voices sharing one rate would move as one');
}

// glide: the bass slides from the note before into the note it is playing. A slide bends pitch, so the
// scale lock says how: it must always arrive exactly on the note it was heading for, it must never take so
// long that the note is more slide than note, and it must never overshoot either end of the interval — so
// a bass can sing between two notes of the key without ever landing between them.
{
  const amounts=[1,18,50,100],none=[0,-40,NaN,undefined,null,'x'],durs=[0.05,0.12,0.4,1.5,4];
  assert(Z.GLIDE.maxSec>0&&Z.GLIDE.maxSec<0.5,'a glide of '+Z.GLIDE.maxSec+' s is a slur, not a slide');
  assert(Z.GLIDE.maxFrac>0&&Z.GLIDE.maxFrac<=0.5,'a glide taking '+Z.GLIDE.maxFrac+' of a note would leave it more slide than note');
  assert(Z.GLIDE.gap>0,'notes must be allowed some distance apart and still slide into one another');
  for(const a of none)for(const d of durs)assert(Z.glideSec(a,d)===0,'a glide amount of '+a+' should mean no slide at all');
  for(const a of amounts){
    assert(Z.glideSec(a)>0,'a glide amount of '+a+' should slide a held note played from the keys');
    for(const d of durs){
      const g=Z.glideSec(a,d),tag=' [glide '+a+' · '+d+' s]';
      assert(g>0,'a glide amount of '+a+' should slide'+tag);
      assert(g<=Z.GLIDE.maxSec+1e-12,'a slide of '+g+' s is longer than the '+Z.GLIDE.maxSec+' the knob allows'+tag);
      assert(g<=d*Z.GLIDE.maxFrac+1e-12,'a slide of '+g+' s takes too much of a '+d+' s note'+tag);
      assert(d-g>=d*(1-Z.GLIDE.maxFrac)-1e-12,'a '+d+' s note spends too little of itself on pitch'+tag);
    }
  }
  assert(Z.glideSec(140,1)===Z.glideSec(100,1),'a glide amount past 100 should clamp to 100');
  assert(Z.glideSec(50,1)<Z.glideSec(100,1),'the glide knob does not open up evenly');
  // the slide itself: it starts on the note before, ends exactly on the note played, and stays between them
  for(const scale in Z.SCALES){
    for(const root of [0,1,2,3,4,5,6,7,8,9,10,11]){
      const tag=' [glide · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+']';
      const ps=Z.scalePitches({root,scale},Z.BASS_LO,Z.BASS_HI).map(p=>p.midi);
      for(let i=1;i<ps.length;i++)for(const [from,to] of [[ps[i-1],ps[i]],[ps[i],ps[i-1]],[ps[0],ps[i]]]){
        assert(Z.glideMidi(from,to,0)===from,'a slide does not start on the note before'+tag);
        assert(Z.glideMidi(from,to,1)===to,'a slide ends on '+Z.glideMidi(from,to,1)+', not the '+to+' that was played'+tag);
        assert(Z.glideMidi(from,to,9)===to&&Z.glideMidi(from,to,-9)===from,'a slide must clamp a position outside its own span'+tag);
        const lo=Math.min(from,to),hi=Math.max(from,to);
        for(const f of [0.1,0.25,0.5,0.75,0.9]){
          const m=Z.glideMidi(from,to,f);
          assert(m>=lo-1e-12&&m<=hi+1e-12,'a slide reaches '+m+', outside the '+from+'→'+to+' it is crossing'+tag);
        }
      }
    }
  }
}

// vibrato: the lead leans into a note it is holding. It is measured in cents, it waits before it starts so
// a short note stays straight, and — with analog drift and the chorus bending the same note at the same
// time — everything together must still come to less than a semitone, or a held note could change pitch.
{
  const depths=[1,25,30,50,100],none=[0,-40,NaN,undefined,null,'x'];
  assert(Z.VIB.cents>0&&Z.VIB.cents<50,'a vibrato of '+Z.VIB.cents+' cents could reach the next semitone');
  assert(Z.VIB.rateLo>0&&Z.VIB.rateLo<Z.VIB.rateHi&&Z.VIB.rateHi<12,'the vibrato rate range is not a vibrato');
  assert(Z.VIB.onset>0&&Z.VIB.onset<1,'vibrato must wait a moment, but not a whole phrase');
  assert(Z.VIB.fade>0,'vibrato must fade in rather than switch on');
  for(const d of none){assert(Z.vibCents(d)===0,'a vibrato depth of '+d+' should hold a note dead straight');
    assert(Z.vibrates(d,4)===false,'a vibrato depth of '+d+' should never move a note')}
  for(const d of depths){
    const c=Z.vibCents(d),tag=' [vibrato '+d+']';
    assert(c>0&&c<=Z.VIB.cents+1e-12,'a vibrato of '+c+' cents is past the '+Z.VIB.cents+' the knob allows'+tag);
    assert(c<50,'a vibrato of '+c+' cents would change the note itself'+tag);
    // only a note longer than the onset ever gets any: a fast line is straight
    assert(Z.vibrates(d,Z.VIB.onset/2)===false,'a note shorter than the onset must stay straight'+tag);
    assert(Z.vibrates(d,Z.VIB.onset*4)===true,'a held note should come alive'+tag);
    assert(Z.vibrates(d,undefined)===true,'a note held from the keys should come alive'+tag);
  }
  assert(Z.vibCents(140)===Z.vibCents(100),'a vibrato depth past 100 should clamp to 100');
  assert(Z.vibCents(50)===Z.VIB.cents/2,'the vibrato depth does not scale evenly');
  for(const r of [0,25,50,75,100]){
    const hz=Z.vibRateHz(r);
    assert(hz>=Z.VIB.rateLo-1e-12&&hz<=Z.VIB.rateHi+1e-12,'a vibrato rate of '+hz+' Hz is outside the knob');
  }
  assert(Z.vibRateHz(0)===Z.VIB.rateLo&&Z.vibRateHz(100)===Z.VIB.rateHi,'the vibrato rate knob does not reach its own limits');
  assert(Z.vibRateHz(140)===Z.vibRateHz(100)&&Z.vibRateHz(-40)===Z.vibRateHz(0),'the vibrato rate knob does not clamp');
  // everything that can bend one sounding note, all the way up at once, is still less than a semitone
  const widest=Math.max.apply(null,Z.CHORUS.voices.map(Z.chorusCents));
  const total=Z.DRIFT.cents+widest+Z.vibCents(100);
  assert(total<50,'drift, chorus and vibrato together bend a note by '+total+' cents, far enough to change it');
  // the scale lock: a note at the top of its swing still rounds to the note that was played, in every key
  for(const scale in Z.SCALES){
    for(const root of [0,1,2,3,4,5,6,7,8,9,10,11]){
      const tag=' [vibrato · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+']';
      for(const p of Z.scalePitches({root,scale},48,84))for(const dir of [-1,1]){
        const heard=p.midi+dir*total/100;
        assert(Math.round(heard)===p.midi,'a note in full vibrato sounds as '+heard+', not the '+p.midi+' that was played'+tag);
        assert(((Math.round(heard)%12)+12)%12===((p.midi%12)+12)%12,'a note in full vibrato lost its pitch class'+tag);
      }
    }
  }
}

// which layer gets which: the bass is the one that slides between notes and the lead the one that sings a
// held note, and the engine's own defaults must say so — a control with no parameter behind it does nothing,
// and a parameter with no control could never be reached.
{
  assert(Z.DEFAULTS.bass.glide!==undefined,'the bass has no glide amount to slide with');
  assert(Z.DEFAULTS.lead.vibrato!==undefined&&Z.DEFAULTS.lead.vibRate!==undefined,'the lead has no vibrato to sing with');
  for(const L of Z.LAYERS){
    if(L!=='bass')assert(Z.DEFAULTS[L].glide===undefined,'the '+L+' has a glide amount but nothing that slides');
    if(L!=='lead')assert(Z.DEFAULTS[L].vibrato===undefined&&Z.DEFAULTS[L].vibRate===undefined,'the '+L+' has a vibrato but nothing that sings');
  }
  assert(Z.glideSec(Z.DEFAULTS.bass.glide,1)>0,'a fresh track should already have a little glide on the bass');
  assert(Z.vibrates(Z.DEFAULTS.lead.vibrato,2),'a fresh track should already sing a little on a held lead note');
  assert(Z.vibCents(Z.DEFAULTS.lead.vibrato)<Z.VIB.cents,'the default vibrato should be gentle, not the widest there is');
}

// the arp's figure: the mode it walks the chord in, how many octaves it reaches over and how much of each
// step a note holds. All three are free to shape the line and none of them may take it out of the key —
// whatever they are set to, every note the arp plays is a tone of the chord sounding under it, inside the
// arp's own lane, one note at a time (or a whole chord at once in block mode), and never long enough to run
// into the note after it.
{
  const S={chords:'ARP001',lead:'ARP001',arp:'ARP001',bass:'ARP001',drums:'ARP001'};
  const modes=Z.ARP.modes;
  ['up','down','updown','random','chord','pattern'].forEach(m=>assert(modes.indexOf(m)>=0,'the arp cannot play '+m));
  assert(modes.length===6,'the arp has '+modes.length+' modes, expected 6');
  assert(Z.ARP_MODES[0]==='auto'&&Z.ARP_MODES.length===modes.length+1,'auto must be offered beside the modes, and only once');
  assert(modes.indexOf('auto')<0,'auto is not a mode of its own: it means the roll picks one');
  assert(Z.ARP.minDur>0&&Z.ARP.minDur<1,'an arp note floor of '+Z.ARP.minDur+' steps is not a note you could hear');
  assert(Z.ARP.minGate>0&&Z.ARP.minGate<Z.ARP.maxGate&&Z.ARP.maxGate===100,'the arp gate knob does not run from something to a full step');
  assert(Z.ARP.maxBlock>=3&&Z.ARP.maxBlock<=8,'a block stab of up to '+Z.ARP.maxBlock+' notes is either not a chord or a wall of sound');
  assert(Z.ARP.octaves.join()==='1,2,3','the arp octave range is not 1 to 3');
  // the settings themselves: anything unreadable falls back to the default, anything past an end clamps to it
  const dflt=Z.normArp(null);
  assert(dflt.mode===Z.ARP.dflt.mode&&dflt.octaves===Z.ARP.dflt.octaves&&dflt.gate===Z.ARP.dflt.gate,'the arp defaults are not the ones ARP.dflt names');
  assert(Z.normArp(undefined).mode==='auto','a project saved before the arp had a mode must open on auto, the way it always played');
  [{},{mode:'sideways'},{mode:5},{mode:null},'x',7,[]].forEach(a=>assert(Z.normArp(a).mode===Z.ARP.dflt.mode,'an arp mode of '+JSON.stringify(a)+' should fall back to the default'));
  Z.ARP_MODES.forEach(m=>assert(Z.normArp({mode:m}).mode===m,'the arp cannot be set to '+m));
  assert(Z.normArp({octaves:9}).octaves===3&&Z.normArp({octaves:0}).octaves===1,'an octave range past either end should clamp to it');
  assert(Z.normArp({octaves:'x'}).octaves===Z.ARP.dflt.octaves,'an unreadable octave range should fall back to the default');
  assert(Z.normArp({gate:400}).gate===Z.ARP.maxGate&&Z.normArp({gate:-4}).gate===Z.ARP.minGate,'a gate past either end should clamp to it');
  assert(Z.normArp({gate:'x'}).gate===Z.ARP.dflt.gate,'an unreadable gate should fall back to the default');
  // the gate: a note holds part of the step it starts on, never more of it and never nothing at all
  for(const rate of [1,2,4])for(const g of [0,Z.ARP.minGate,40,70,100,140,NaN,undefined,null,'x']){
    const d=Z.arpDur(rate,g),tag=' [arp gate '+g+' · rate '+rate+']';
    assert(d>=Z.ARP.minDur-1e-12,'an arp note of '+d+' steps is too short to hear'+tag);
    assert(d<=rate+1e-12,'an arp note of '+d+' steps runs into the note after it'+tag);
  }
  assert(Z.arpDur(2,100)===2&&Z.arpDur(2,50)===1,'the arp gate does not scale evenly');
  assert(Z.arpDur(2,100)>Z.arpDur(2,40),'more gate must mean a longer note');
  assert(Z.arpDur(1,Z.ARP.minGate)>=Z.ARP.minDur,'the shortest gate at the fastest rate must still be a note');
  // which note comes next: whatever the mode, an index inside the chord tones it was handed
  const rng=new Z.Rng('ARPIDX');
  for(const mode of Z.ARP_MODES)for(const n of [1,2,3,4,6,9,12])for(let k=0;k<40;k++){
    const i=Z.arpIndex(mode,k,n,rng,Z.ARP_FIGURES[k%Z.ARP_FIGURES.length]);
    assert(i>=0&&i<n&&i===Math.round(i),'the '+mode+' arp reached index '+i+' of '+n+' chord tones');
  }
  Z.ARP_FIGURES.forEach((f,i)=>{
    assert(Array.isArray(f)&&f.length>=2,'arp figure '+(i+1)+' is not a figure');
    f.forEach(v=>assert(v>=0&&v===Math.round(v),'arp figure '+(i+1)+' steps to '+v+', which is not a chord tone'));
  });
  // and the shapes are the shapes their names promise
  for(const n of [2,3,4,5]){
    const up=[],dn=[],ud=[];
    for(let k=0;k<n;k++){up.push(Z.arpIndex('up',k,n,rng));dn.push(Z.arpIndex('down',k,n,rng))}
    for(let k=0;k<2*n-2;k++)ud.push(Z.arpIndex('updown',k,n,rng));
    const tag=' ['+n+' chord tones]';
    assert(up.join()===up.slice().sort((a,b)=>a-b).join()&&up[0]===0&&up[n-1]===n-1,'an up arp does not run up the chord'+tag);
    assert(dn[0]===n-1&&dn[n-1]===0,'a down arp does not run down the chord'+tag);
    assert(Z.arpIndex('up',n,n,rng)===0&&Z.arpIndex('down',n,n,rng)===n-1,'an arp does not start its run again'+tag);
    assert(ud[n-1]===n-1&&Z.arpIndex('updown',2*n-2,n,rng)===0,'an up-down arp does not turn around at the top and come back'+tag);
  }
  // the notes the arp has to choose from: tones of the chord, in its lane, one rising run, wider with range
  for(const scale in Z.SCALES){
    const cs=Z.chordScaleOf(scale);
    for(const root of [0,5,11]){
      const r=Z.arpRange(root),chPcs=pcsOf(root,cs.steps),tag=' [arp notes · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+']';
      const chords=Z.generateTrack({root,scale,energy:60,evolve:true,sevenths:true,gate:0.7},S,'v',0).chords;
      chords.forEach(ch=>{
        let last=0;
        for(const oct of [1,2,3]){
          const ns=Z.arpNotes(ch,root,oct);
          assert(ns.length>=3,'the arp was handed '+ns.length+' notes of '+ch.name+', not a chord'+tag);
          ns.forEach((m,i)=>{
            assert(ch.pcs.has(((m%12)+12)%12),Z.NOTE_NAMES[m%12]+' is not a tone of '+ch.name+tag);
            assert(chPcs.has(((m%12)+12)%12),'an arp note left the chord scale'+tag);
            assert(m>=r[0]&&m<=r[1],'an arp note '+m+' is outside its lane '+r.join('–')+tag);
            if(i)assert(m>ns[i-1],'the notes the arp walks are not one rising run'+tag);
          });
          assert(ns.length>=last,'a wider octave range gave the arp fewer notes'+tag);
          last=ns.length;
        }
        assert(Z.arpNotes(ch,root,3).length>Z.arpNotes(ch,root,1).length,'three octaves is no wider than one'+tag);
        assert(Z.arpNotes(ch,root,9).length===Z.arpNotes(ch,root,3).length,'an octave range past 3 should clamp to 3'+tag);
        assert(Z.arpNotes(ch,root,'x').length===Z.arpNotes(ch,root,Z.ARP.dflt.octaves).length,'an unreadable octave range should fall back to the default'+tag);
      });
    }
  }
  // and the line the generator writes with them, in every scale, for every mode, range and gate
  let si=0;
  for(const scale in Z.SCALES){
    const root=(si++*5)%12,cs=Z.chordScaleOf(scale),chPcs=pcsOf(root,cs.steps),r=Z.arpRange(root);
    for(const mode of Z.ARP_MODES)for(const oct of [1,3])for(const gate of [Z.ARP.minGate,100]){
      const cfg={root,scale,energy:70,evolve:true,sevenths:true,gate:0.7,arp:{mode,octaves:oct,gate}};
      const t=Z.generateTrack(cfg,S,'v',0);tracks++;
      const tag=' [arp '+mode+' · '+oct+' oct · gate '+gate+' · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+']';
      assert(t.arp.length>0,'the arp played nothing at all'+tag);
      const byStep={};
      t.arp.forEach(e=>{
        assert(e.step>=0&&e.step<Z.TOTAL,'an arp note left the loop'+tag);
        assert(e.dur>=Z.ARP.minDur-1e-12,'an arp note of '+e.dur+' steps is too short to hear'+tag);
        assert(e.vel>0&&e.vel<=1,'an arp note came out at velocity '+e.vel+tag);
        assert(chPcs.has(((e.midi%12)+12)%12),'an arp note '+Z.NOTE_NAMES[e.midi%12]+' left the chord scale'+tag);
        assert(Z.chordAt(t.chords,e.step).pcs.has(((e.midi%12)+12)%12),'an arp note is not a tone of the chord playing under it'+tag);
        assert(e.midi>=r[0]&&e.midi<=r[1],'an arp note '+e.midi+' is outside its lane '+r.join('–')+tag);
        assert(t.byStep.arp[e.step].includes(e),'an arp note is missing from the playback index'+tag);
        (byStep[e.step]=byStep[e.step]||[]).push(e);
      });
      const steps=Object.keys(byStep).map(Number).sort((a,b)=>a-b);
      steps.forEach(s=>{
        const n=byStep[s].length;
        if(mode==='chord')assert(n>=3&&n<=Z.ARP.maxBlock,'a block stab of '+n+' note'+(n===1?'':'s')+' is not a chord, or is too many at once'+tag);
        else assert(n===1,'the arp played '+n+' notes at once in '+mode+' mode'+tag);
        assert(new Set(byStep[s].map(e=>e.midi)).size===n,'the arp played one note twice at the same step'+tag);
      });
      // a note never runs into the one after it, however wide the gate is opened
      for(let i=1;i<steps.length;i++)byStep[steps[i-1]].forEach(e=>
        assert(e.step+e.dur<=steps[i]+1e-9,'an arp note runs '+(e.step+e.dur-steps[i])+' steps into the note after it'+tag));
      // the same settings write the same line twice, so an export sounds like what you heard
      assert(JSON.stringify(Z.generateTrack(cfg,S,'v',0).arp)===JSON.stringify(t.arp),'the arp is not deterministic'+tag);
    }
    // a wider range really does reach higher, and a shorter gate really does play shorter notes
    const wide=Z.generateTrack({root,scale,energy:70,evolve:true,sevenths:true,gate:0.7,arp:{mode:'up',octaves:3,gate:100}},S,'v',0).arp;
    const tight=Z.generateTrack({root,scale,energy:70,evolve:true,sevenths:true,gate:0.7,arp:{mode:'up',octaves:1,gate:100}},S,'v',0).arp;
    const short=Z.generateTrack({root,scale,energy:70,evolve:true,sevenths:true,gate:0.7,arp:{mode:'up',octaves:3,gate:Z.ARP.minGate}},S,'v',0).arp;
    const top=a=>Math.max.apply(null,a.map(e=>e.midi)),tag=' [arp range · '+Z.NOTE_NAMES[root]+' '+Z.SCALES[scale].name+']';
    assert(top(wide)>top(tight),'three octaves of arp reach no higher than one'+tag);
    assert(short.every((e,i)=>e.dur<wide[i].dur+1e-12)&&short[0].dur<wide[0].dur,'a shorter gate did not shorten the notes'+tag);
  }
}

// warmth: the master soft clip and its high shelf. It may colour a mix and lift its quiet half, but it must
// never push the signal past full scale, never invert it, never boost the top end, and at 0 it must be a
// true bypass — one knob you can leave anywhere without the mix falling apart.
{
  const amounts=[0,1,12,22,50,75,100],bad=[-40,140,NaN,undefined,null,'x'],none=[-40,NaN,undefined,null,'x'];
  assert(Z.WARMTH.drive>0,'warmth with no drive would do nothing at all');
  assert(Z.WARMTH.shelfDb<0,'the warmth shelf must roll the top end off, not boost it');
  assert(Z.WARMTH.shelfHz>1000&&Z.WARMTH.shelfHz<12000,'a shelf at '+Z.WARMTH.shelfHz+' Hz is not the top end');
  assert(Z.WARMTH.trim>0&&Z.WARMTH.trim<1,'the warmth trim must take a little level, not all of it');
  assert(Z.WARMTH.dflt>=0&&Z.WARMTH.dflt<=100,'the default warmth is not on the knob');
  assert(Z.warmthCurve(0)===null,'warmth at 0 must leave the mix untouched');
  assert(Z.warmthShelf(0)===0&&Z.warmthTrim(0)===1,'warmth at 0 must leave the tone and the level alone');
  for(const a of none)assert(Z.warmthCurve(a)===null&&Z.warmthShelf(a)===0&&Z.warmthTrim(a)===1,'a warmth of '+a+' should mean no warmth at all');
  assert(Z.warmthAmt(140)===1&&Z.warmthAmt(-3)===0,'warmth past either end of the knob should clamp to it');
  for(const a of amounts.concat(bad)){
    const tag=' [warmth '+a+']',sh=Z.warmthShelf(a),tr=Z.warmthTrim(a);
    assert(sh<=0&&sh>=Z.WARMTH.shelfDb-1e-12,'a warmth shelf of '+sh+' dB is outside 0 to '+Z.WARMTH.shelfDb+tag);
    assert(tr>0&&tr<=1,'a warmth trim of '+tr+' is outside (0, 1]'+tag);
    assert(Math.abs(Z.warmthShape(0,a))<1e-12,'warmth must leave silence silent'+tag);
    assert(Math.abs(Z.warmthShape(1,a)-1)<1e-12&&Math.abs(Z.warmthShape(-1,a)+1)<1e-12,'warmth must map full scale to full scale, so it can never clip harder than the mix already does'+tag);
    let last=-2;
    for(let i=0;i<=64;i++){
      const x=i/64*2-1,y=Z.warmthShape(x,a);
      assert(y>=-1-1e-12&&y<=1+1e-12,'warmth pushed '+x+' to '+y+', past full scale'+tag);
      assert(y>=last-1e-12,'the warmth curve turns back on itself at '+x+', which would fold the waveform'+tag);
      last=y;
      assert(Math.abs(y+Z.warmthShape(-x,a))<1e-12,'the warmth curve is not odd-symmetric, so it would shift the waveform off centre'+tag);
      if(x>0)assert(y>=x-1e-12,'warmth at '+x+' came back quieter as '+y+', so it is not lifting the quiet half'+tag);
    }
    // an input past full scale is held there, the way the waveshaper itself holds the ends of its curve
    assert(Z.warmthShape(4,a)===Z.warmthShape(1,a)&&Z.warmthShape(-4,a)===Z.warmthShape(-1,a),'warmth must hold its ends outside ±1'+tag);
  }
  // the curve handed to the waveshaper is the same function, sampled: ends at ±1, rising all the way
  const c=Z.warmthCurve(100);
  assert(c&&c.length===Z.WARMTH.points,'the warmth curve is not the size it says it is');
  assert(Math.abs(c[0]+1)<1e-6&&Math.abs(c[c.length-1]-1)<1e-6,'the warmth curve does not span full scale');
  for(let i=1;i<c.length;i++)assert(c[i]>=c[i-1]-1e-12,'the warmth curve is not monotonic at sample '+i);
  assert(Z.warmthShape(0.25,100)>Z.warmthShape(0.25,25),'more warmth must mean more drive');
  assert(Z.warmthShelf(100)<Z.warmthShelf(25),'more warmth must roll more of the top end off');
}

// drum kits and the perc row. Every kit must be able to play every row of the grid — a kit missing a recipe
// would drop hits on the floor — and its perc voice must be one the engine synthesises and the MIDI export
// has a GM note for. A generated perc figure stays off the backbeat the snare and clap own, never plays
// louder than they do, and never turns up on a quiet track at all.
{
  assert(Z.DRUM_KINDS.includes('perc'),'the drum grid has no perc row');
  assert(Z.DRUM_KINDS.length===6,'the drum grid has '+Z.DRUM_KINDS.length+' rows, expected 6');
  const KITS=Z.KITS||{};
  assert(Object.keys(KITS).length>=6,'only '+Object.keys(KITS).length+' drum kits, expected at least 6');
  ['808','909','Lo-fi','Trap','House','Breaks'].forEach(k=>assert(KITS[k],'the '+k+' kit is missing'));
  for(const name in KITS){
    const K=KITS[name],tag=' [kit '+name+']';
    ['kick','snare','hat','clap','perc'].forEach(v=>assert(K[v]&&typeof K[v]==='object','kit cannot play its '+v+tag));
    assert(K.kick.decay>0&&K.kick.decay<2,'a kick decay of '+K.kick.decay+' s is not a kick'+tag);
    assert(K.snare.decay>0&&K.snare.decay<1,'a snare decay of '+K.snare.decay+' s is not a snare'+tag);
    assert(K.hat.decay>0&&K.hat.open>=K.hat.decay,'an open hat must ring at least as long as a closed one'+tag);
    assert(K.hat.level>0&&K.hat.level<=1,'a hat level of '+K.hat.level+' is outside (0, 1]'+tag);
    const p=K.perc;
    assert(Z.PERC_VOICES.includes(p.voice),'perc voice "'+p.voice+'" is not one the engine can play'+tag);
    assert(p.decay>0&&p.decay<1,'a perc decay of '+p.decay+' s is not a percussion hit'+tag);
    assert(p.level>0&&p.level<=1,'a perc level of '+p.level+' is outside (0, 1]'+tag);
    if(p.voice==='cowbell')assert(p.f1>0&&p.f2>p.f1,'a cowbell needs two rising partials'+tag);
    else if(p.voice==='rim')assert(p.f>0&&p.bp>0,'a rim needs a tone and a band to snap in'+tag);
    else assert(p.hp>0,'a shaker needs a high pass to sit above the kit'+tag);
    const gm=Z.PERC_GM[p.voice];
    assert(gm>=35&&gm<=81,'perc voice '+p.voice+' has no General MIDI drum note (got '+gm+')'+tag);
  }
  Z.PERC_VOICES.forEach(v=>{const gm=Z.PERC_GM[v];assert(gm>=35&&gm<=81,'perc voice '+v+' maps to '+gm+', outside the GM drum map')});
  assert(Z.PERC.maxVel>0&&Z.PERC.maxVel<0.9,'perc at '+Z.PERC.maxVel+' would play in front of the backbeat');
  assert(Z.PERC.from>0&&Z.PERC.from<1,'perc must come in somewhere along the energy range');
  // the generated row, over every energy and a spread of seeds
  let withPerc=0,loud=0;
  for(const energy of [0,10,30,44,50,70,85,100]){
    for(const seed of seeds){
      const P=Z.generateDrumPattern({energy},new Z.Rng(seed+':perc:'+energy));
      const tag=' [perc · energy '+energy+' · '+seed+']';
      assert(Array.isArray(P.perc)&&P.perc.length===16,'the perc row is not sixteen steps'+tag);
      const hits=P.perc.filter(v=>v>0).length;
      if(hits)withPerc++;
      if(energy<Z.PERC.from*100)assert(hits===0,'a track at energy '+energy+' should be too quiet for perc, got '+hits+' hits'+tag);
      P.perc.forEach((v,o)=>{
        if(!v)return;
        assert(v>0&&v<=Z.PERC.maxVel,'a perc hit at '+v+' is louder than the '+Z.PERC.maxVel+' allowed'+tag);
        assert(!P.snare[o],'perc lands on the snare at step '+o+tag);
        assert(!P.clap[o],'perc lands on the clap at step '+o+tag);
        if(P.snare[o]||P.clap[o])loud++;
      });
      // it is part of the pattern the grid edits and the engine plays, and it repeats every bar
      const t=Z.generateTrack({root:0,scale:'minor',energy,evolve:true,sevenths:false,gate:0.7,drumPattern:P},
        {chords:seed,lead:seed,arp:seed,bass:seed,drums:seed},'v',0);
      const percEvs=t.drums.filter(d=>d.kind==='perc');
      assert(percEvs.length===hits*Z.BARS-(P.fill?P.perc.slice(12).filter(v=>v>0).length:0),
        'the perc row reached playback as '+percEvs.length+' hits, not the '+hits+' a bar it holds'+tag);
      percEvs.forEach(d=>assert(d.step>=0&&d.step<Z.TOTAL&&d.vel<=Z.PERC.maxVel,'a perc hit left the loop or got louder on the way to playback'+tag));
    }
  }
  assert(withPerc>0,'no energy at all produced a perc figure');
  assert(loud===0,'perc crowded the backbeat');
  // a project saved before there was a perc row still opens: the row is filled in, everything else is kept
  const old={kick:[1,0,0,0,0,0,0,0,0.85,0,0,0,0,0,0,0],snare:new Array(16).fill(0),clap:new Array(16).fill(0),
    hat:new Array(16).fill(0.5),ohat:new Array(16).fill(0),fill:true};
  old.snare[4]=0.9;old.snare[12]=0.9;
  const N=Z.normDrumPattern(old);
  assert(N.perc.length===16&&N.perc.every(v=>v===0),'an old pattern did not get an empty perc row');
  Z.DRUM_KINDS.forEach(k=>{if(k!=='perc')assert(N[k].join()===old[k].join(),'normalising a pattern changed its '+k+' row')});
  assert(N.fill===true,'normalising a pattern lost its fill');
  const tOld=Z.generateTrack({root:0,scale:'minor',energy:70,evolve:true,sevenths:false,gate:0.7,drumPattern:old},
    {chords:'OLD001',lead:'OLD001',arp:'OLD001',bass:'OLD001',drums:'OLD001'},'v',0);
  assert(tOld.drums.some(d=>d.kind==='kick'&&d.step===0),'an old pattern lost its kick');
  assert(!tOld.drums.some(d=>d.kind==='perc'),'an old pattern gained perc hits it never had');
  assert(tOld.drumPattern.perc.length===16,'an old pattern reached the grid without a perc row');
  // a ragged row is repaired rather than trusted: sixteen steps, every value inside 0 to 1
  const ragged=Z.normDrumPattern({kick:[1,2,-1,'x',null],perc:new Array(40).fill(0.5),fill:false});
  Z.DRUM_KINDS.forEach(k=>{
    assert(ragged[k].length===16,'a ragged '+k+' row was not repaired to sixteen steps');
    ragged[k].forEach(v=>assert(typeof v==='number'&&v>=0&&v<=1,'a repaired '+k+' step of '+v+' is outside 0 to 1'));
  });
  assert(ragged.fill===false,'normalising a pattern turned its fill back on');
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
  '<ul style="color:#a3a8bf;margin-top:20px;line-height:1.8"><li>Every chord tone, arp note and bass note is diatonic to the chord scale.</li><li>Every melody note is in the melody scale; blues passing tones never land on a downbeat.</li><li>At least 60 % of melody downbeats are chord tones of the chord sounding at that moment.</li><li>Arps only use tones of the chord that is playing.</li><li>Generation is deterministic, so a chorus hook returns note for note.</li><li>Sketched progressions and edited drum patterns are honoured exactly.</li><li>Chords edited on the cards keep their degree, bar length, seventh and inversion, still fill 8 bars, and survive a track code.</li><li>Edited and recorded lead notes come back verbatim, follow the section key shift and stay in scale.</li><li>Notes drawn into the arp and bass lanes do the same, and the bass stays inside MIDI 36–59.</li><li>A letter key recorded into the arp or the bass keeps its pitch class, lands in that layer\'s own register and stays diatonic to the chord scale.</li><li>Every chord-box pad in every key is entirely in scale.</li><li>A section filter sweep starts and ends on an audible frequency, stays inside its own section and always hands the next one a wide-open mix.</li><li>A section fade moves between silence and full level in one direction, stays inside its own section, never reaches a gain of 0, and leaves every unfaded section at full level.</li><li>Analog drift wanders a voice by cents and never a semitone: a drifted note still rounds to the note that was played, in every key and scale, and its filter never closes.</li><li>The stereo chorus reaches both sides of the field, keeps its delay lines inside their buffer, and bends a note by a few cents at most, so a chorused note is still the note that was played.</li><li>Whatever mode, octave range and gate the arp is set to, every note it plays is a tone of the chord sounding under it, inside its own lane, one note to a step — or a whole chord at once in block mode — and never long enough to run into the note after it.</li><li>A bass glide always lands exactly on the note it was heading for, never overshoots the interval it is crossing and never takes more than part of the note.</li><li>Lead vibrato leaves a short note straight, and drift, chorus and a full vibrato together still bend a note by less than a semitone, in every key and scale.</li><li>Every drum kit can play every row of the grid, and its perc voice is one the engine synthesises and the MIDI export has a GM note for.</li><li>A generated perc figure stays off the snare and clap, never plays louder than the backbeat, and never appears on a quiet track; a pattern saved before there was a perc row still opens.</li><li>Master warmth lifts the quiet half of a mix and rounds its peaks without ever passing full scale, folding the waveform or boosting the top end, and warmth at 0 is a true bypass.</li></ul>';
document.body.appendChild(h);
}
if(document.body)report();else document.addEventListener('DOMContentLoaded',report);
})();
