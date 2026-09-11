(()=>{
'use strict';
const Z=window.Z;
/* ================= demo songs =================
   Six finished songs, one press away in the help sheet, so the first ten seconds of Zinth are the best ten
   seconds of Zinth rather than a random roll. Each one is a whole project — key, scale, tempo, mood, form,
   its own chords, a drum pattern written step by step, a hook in the lead lane and a sound for every layer —
   and it loads through the very same snapshot/restore path a saved project does, so a demo is not a special
   mode: it is your project the moment it opens, editable everywhere, autosaved, and one undo away from what
   you had before.

   Nothing here can leave the key, and that is by construction rather than by care. A drum row is sixteen
   characters. A hook note is a step, a length and a *scale degree* — 0 is the tonic at the bottom of that
   lane, 7 the tonic an octave up, −1 the step below — which `degPitch` turns into one of the pitch rows the
   roll itself draws, the same rows a click in the roll can land on. A progression is a list of degrees of the
   chord scale. So a demo can only ask for notes the app would have let you draw, and the theory check proves
   it for all six: every chord, every hook note and every generated layer under them stays inside the scale. */

// a drum row is 16 characters: X a hard hit, x a normal one, o a soft one, anything else a rest
const VEL={X:1,x:0.85,o:0.55};
function demoDrums(rows){
  const P={fill:!(rows&&rows.fill===false)};
  for(const k of Z.DRUM_KINDS){
    const s=String((rows&&rows[k])||''),row=new Array(16).fill(0);
    for(let i=0;i<16;i++)if(VEL[s[i]])row[i]=VEL[s[i]];
    P[k]=row;
  }
  return Z.normDrumPattern(P);
}
/* a scale degree in a lane, as a MIDI note: degree 0 is the lowest tonic the lane holds, so 4 is the fifth
   above it and 7 the octave. The answer is always one of the lane's own pitch rows — a note you could have
   drawn with the mouse — so a demo note is diatonic however far the degree reaches. */
function degPitch(L,root,scale,deg){
  const rows=Z.lanePitches(L,root,scale);if(!rows.length)return 60;
  const steps=(L==='lead'?Z.SCALES[scale]:Z.chordScaleOf(scale)).steps,n=steps.length;
  const d=Math.round(+deg)||0,tonic=rows.find(p=>((p.midi-root)%12+12)%12===0)||rows[0];
  let m=tonic.midi+12*Math.floor(d/n)+steps[((d%n)+n)%n];
  while(m>rows[rows.length-1].midi)m-=12;                 // never outside the lane the roll draws
  while(m<rows[0].midi)m+=12;
  return rows.reduce((a,p)=>Math.abs(p.midi-m)<Math.abs(a-m)?p.midi:a,rows[0].midi);
}
/* a hook: a phrase of [step, length, degree] notes, repeated every `every` steps `times` over, with an
   optional `last` phrase for the final repeat so the line comes to rest instead of stopping. Velocities
   follow the bar — the downbeat hardest — unless a note names its own. */
function demoNotes(L,root,scale,spec){
  if(!spec||!Array.isArray(spec.notes))return null;
  const every=spec.every>0?spec.every:Z.TOTAL,times=Math.max(1,Math.round(spec.times||Math.floor(Z.TOTAL/every)));
  const out=[];
  for(let i=0;i<times;i++){
    const phrase=(i===times-1&&Array.isArray(spec.last))?spec.last:spec.notes;
    for(const n of phrase){
      const step=Math.round(n[0])+i*every;
      if(!(step>=0&&step<Z.TOTAL))continue;
      out.push({step,dur:Math.max(1,Math.min(Z.TOTAL-step,Math.round(n[1])||1)),midi:degPitch(L,root,scale,n[2]),
        vel:n[3]!==undefined?n[3]:(step%16===0?0.95:step%4===0?0.88:0.76)});
    }
  }
  return out.sort((a,b)=>a.step-b.step);
}

/* The six. One of each flavour Zinth does well: chill, driving, dark, retro, uplifting, otherworldly. Every
   progression is drawn from the scale's own curated pool, so no demo can put a diminished chord under a
   hook, and every hook keeps to the notes of the key that sit well over all of its chords. */
const DEMOS=[
  {id:'chill',name:'Late Bus Home',blurb:'Dorian keys and a dusty break, for a window seat at night',
   mood:'chill',seed:'LATEBS',root:2,scale:'dorian',bpm:88,energy:44,swing:26,sevenths:true,gate:0.72,
   kit:'Breaks',warmth:32,eq:{low:10,mid:-8,high:6},arp:{mode:'updown',octaves:2,gate:82},
   form:['Intro','Verse','Chorus','Verse','Bridge','Chorus','Outro'],
   prog:{v:[{d:0,bars:2},{d:3,bars:2},{d:6,bars:2},{d:3,bars:2}],
         c:[{d:6,bars:2},{d:3,bars:2},{d:6,bars:2},{d:0,bars:2}]},
   drums:{v:{kick:'X-----o---x-----',snare:'----x-------x---',hat:'--o---o---o-----',ohat:'--------------o-',perc:'------o-------o-'},
          c:{kick:'X-----o-x---o---',snare:'----x-------x---',clap:'----o-------o---',hat:'--o-o-o-o-o-o---',ohat:'--------------o-',perc:'--o---o-------o-'}},
   hook:{c:{lead:{every:32,times:4,
     notes:[[0,6,4],[6,2,3],[8,4,7],[12,2,6],[14,2,4],[16,6,3],[22,2,2],[24,8,0]],
     last:[[0,6,4],[6,2,3],[8,6,7],[16,14,0]]}}},
   sound:{lead:{wave:'triangle',cutoff:58,reso:14,attack:9,release:48,spread:16,drift:30,vibrato:44,vibRate:36,chorus:30,delay:42,reverb:44,level:72},
          arp:{wave:'sine',cutoff:60,reso:12,attack:2,release:26,spread:14,drift:22,chorus:26,delay:50,reverb:38,level:44},
          chords:{wave:'super',cutoff:36,reso:8,attack:52,release:68,spread:45,drift:34,chorus:42,delay:12,reverb:58,level:50},
          bass:{wave:'saw',cutoff:32,reso:18,attack:3,release:28,drift:12,glide:28,reverb:6,level:78},
          drums:{level:62,delay:12,reverb:26,pump:24}}},

  {id:'drive',name:'Night Drive',blurb:'A minor, four on the floor and a hook that will not let go',
   mood:'driving',seed:'NIGHT7',root:9,scale:'minor',bpm:128,energy:82,swing:0,sevenths:false,gate:0.55,
   kit:'909',warmth:24,eq:{low:8,mid:0,high:10},arp:{mode:'up',octaves:2,gate:42},
   form:['Intro','Verse','Pre-chorus','Chorus','Verse','Pre-chorus','Chorus','Drop','Outro'],
   prog:{v:[{d:0,bars:2},{d:5,bars:2},{d:2,bars:2},{d:6,bars:2}],
         c:[{d:5,bars:2},{d:6,bars:2},{d:4,bars:2},{d:0,bars:2}]},
   drums:{v:{kick:'X---x---x---x---',snare:'----x-------x---',hat:'x-o-x-o-x-o-x---',ohat:'--------------o-',perc:'----o-------o---'},
          c:{kick:'X---x---x---x-o-',snare:'----x-------x---',clap:'----x-------x---',hat:'x-o-x---x-o-x---',ohat:'------o-------o-',perc:'--o---o---o---o-'}},
   hook:{c:{lead:{every:32,times:4,
     notes:[[0,2,4],[2,2,7],[4,2,6],[6,2,4],[8,4,2],[12,4,4],[16,2,4],[18,2,7],[20,2,9],[22,2,7],[24,8,6]],
     last:[[0,2,4],[2,2,7],[4,2,6],[6,2,4],[8,4,2],[12,4,4],[16,16,7]]}}},
   sound:{lead:{wave:'saw',cutoff:72,reso:34,attack:1,release:26,spread:26,drift:18,vibrato:16,vibRate:58,chorus:24,delay:30,reverb:22,level:74},
          arp:{wave:'square',cutoff:64,reso:28,attack:0,release:16,spread:12,drift:16,chorus:18,delay:34,reverb:18,level:58},
          chords:{wave:'saw',cutoff:46,reso:12,attack:18,release:40,spread:34,drift:24,chorus:30,delay:14,reverb:38,level:42},
          bass:{wave:'square',cutoff:44,reso:22,attack:1,release:22,drift:10,glide:8,reverb:4,level:86},
          drums:{level:86,delay:8,reverb:14,pump:60}}},

  {id:'dark',name:'Lantern Street',blurb:'Phrygian dominant over a slow trap kit — a flat second and a lot of shadow',
   mood:'dark',seed:'LNTRN4',root:4,scale:'phrygDom',bpm:96,energy:62,swing:6,sevenths:false,gate:0.6,
   kit:'Trap',warmth:30,eq:{low:14,mid:-4,high:-6},arp:{mode:'down',octaves:2,gate:52},
   form:['Intro','Verse','Chorus','Verse','Chorus','Break','Drop','Outro'],
   prog:{v:[{d:0,bars:2},{d:1,bars:2},{d:0,bars:2},{d:6,bars:2}],
         c:[{d:0,bars:2},{d:1,bars:2},{d:3,bars:2},{d:0,bars:2}]},
   drums:{v:{kick:'X-----x---x-----',snare:'--------x-------',hat:'xoxoxoxoxoxoxoxo',ohat:'--------------o-',perc:'----o-------o---'},
          c:{kick:'X-----x---x---x-',snare:'--------x-------',clap:'--------x-------',hat:'xoxoxoxoxoxoxo--',ohat:'------------o-o-',perc:'--o---o---o---o-'}},
   hook:{c:{lead:{every:32,times:4,
     notes:[[0,4,0],[4,2,1],[6,2,0],[8,6,4],[16,4,3],[20,2,4],[22,2,3],[24,8,0]],
     last:[[0,4,0],[4,2,1],[6,2,0],[8,8,4],[16,4,3],[20,12,0]]}}},
   sound:{lead:{wave:'saw',cutoff:50,reso:46,attack:2,release:42,spread:34,drift:26,vibrato:34,vibRate:44,chorus:28,delay:46,reverb:46,level:72},
          arp:{wave:'saw',cutoff:44,reso:34,attack:1,release:22,spread:18,drift:22,chorus:22,delay:48,reverb:34,level:48},
          chords:{wave:'super',cutoff:30,reso:10,attack:58,release:70,spread:44,drift:34,chorus:36,delay:16,reverb:64,level:50},
          bass:{wave:'saw',cutoff:30,reso:24,attack:2,release:30,drift:12,glide:32,reverb:6,level:86},
          drums:{level:78,delay:14,reverb:30,pump:46}}},

  {id:'retro',name:'Coin Rush',blurb:'Square waves, an 808 cowbell and no apologies',
   mood:'retro',seed:'COIN88',root:0,scale:'major',bpm:118,energy:66,swing:0,sevenths:false,gate:0.5,
   kit:'808',warmth:0,eq:{low:-4,mid:8,high:12},arp:{mode:'pattern',octaves:1,gate:38},
   form:['Intro','Verse','Chorus','Verse','Chorus','Break','Drop','Outro'],
   prog:{v:[{d:0,bars:2},{d:4,bars:2},{d:5,bars:2},{d:3,bars:2}],
         c:[{d:5,bars:2},{d:3,bars:2},{d:4,bars:2},{d:0,bars:2}]},
   drums:{v:{kick:'X-----x-x-------',snare:'----x-------x---',hat:'--o---o---o---o-',ohat:'--------------o-',perc:'------------o---'},
          c:{kick:'X-----x-x---x---',snare:'----x-------x---',clap:'----x-------x---',hat:'o-o-o-o-o-o-o---',ohat:'--------------o-',perc:'--o-----o-----o-'}},
   hook:{c:{lead:{every:32,times:4,
     notes:[[0,2,7],[2,2,4],[4,2,2],[6,2,4],[8,2,7],[10,2,9],[12,4,7],[16,2,5],[18,2,4],[20,2,2],[22,2,1],[24,8,4]],
     last:[[0,2,7],[2,2,4],[4,2,2],[6,2,4],[8,4,7],[12,4,9],[16,16,7]]}}},
   sound:{lead:{wave:'square',cutoff:84,reso:4,attack:0,release:14,spread:0,drift:0,vibrato:0,vibRate:60,chorus:0,delay:24,reverb:10,level:72},
          arp:{wave:'square',cutoff:88,reso:0,attack:0,release:10,spread:0,drift:0,chorus:0,delay:28,reverb:8,level:56},
          chords:{wave:'triangle',cutoff:72,reso:6,attack:4,release:28,spread:0,drift:0,chorus:0,delay:10,reverb:18,level:46},
          bass:{wave:'triangle',cutoff:60,reso:8,attack:0,release:20,spread:0,drift:0,glide:0,reverb:4,level:86},
          drums:{level:74,delay:6,reverb:8,pump:16}}},

  {id:'uplift',name:'Sunrise Flight',blurb:'A house kit, a wide supersaw and a chorus that lifts off',
   mood:'uplift',seed:'SUNRS5',root:7,scale:'major',bpm:128,energy:78,swing:0,sevenths:false,gate:0.6,
   kit:'House',warmth:26,eq:{low:6,mid:-2,high:12},arp:{mode:'updown',octaves:3,gate:62},
   form:['Intro','Verse','Pre-chorus','Chorus','Verse','Pre-chorus','Chorus','Drop','Outro'],
   prog:{v:[{d:3,bars:2},{d:0,bars:2},{d:4,bars:2},{d:5,bars:2}],
         c:[{d:5,bars:2},{d:4,bars:2},{d:3,bars:2},{d:0,bars:2}]},
   drums:{v:{kick:'X---x---x---x---',clap:'----x-------x---',hat:'x---x---x---x---',ohat:'--o---o---o---o-'},
          c:{kick:'X---x---x---x-o-',snare:'--------------o-',clap:'----x-------x---',hat:'x---x---x---x---',ohat:'--o---o---o---o-',perc:'--o-------o-----'}},
   hook:{c:{lead:{every:32,times:4,
     notes:[[0,6,4],[6,2,5],[8,8,7],[16,4,5],[20,2,4],[22,2,2],[24,8,4]],
     last:[[0,6,4],[6,2,5],[8,8,7],[16,16,9]]}}},
   sound:{lead:{wave:'super',cutoff:70,reso:18,attack:4,release:42,spread:46,drift:24,vibrato:24,vibRate:54,chorus:40,delay:40,reverb:42,level:74},
          arp:{wave:'saw',cutoff:62,reso:20,attack:1,release:18,spread:22,drift:20,chorus:30,delay:44,reverb:30,level:56},
          chords:{wave:'super',cutoff:52,reso:8,attack:28,release:60,spread:56,drift:30,chorus:46,delay:12,reverb:56,level:54},
          bass:{wave:'saw',cutoff:42,reso:18,attack:1,release:24,drift:10,glide:10,reverb:4,level:86},
          drums:{level:82,delay:10,reverb:20,pump:64}}},

  {id:'odd',name:'Glass Observatory',blurb:'In-sen, held sevenths and a lot of air between the notes',
   mood:'odd',seed:'GLASS3',root:1,scale:'insen',bpm:76,energy:38,swing:10,sevenths:true,gate:0.88,
   kit:'Lo-fi',warmth:34,eq:{low:-6,mid:-8,high:4},arp:{mode:'random',octaves:3,gate:84},
   form:['Intro','Verse','Chorus','Bridge','Chorus','Break','Outro'],
   prog:{v:[{d:0,bars:4},{d:1,bars:4}],
         c:[{d:5,bars:2},{d:1,bars:2},{d:0,bars:4}]},
   drums:{v:{kick:'X-----o-x-------',snare:'----o-------o---',hat:'--o-------o-----',perc:'------------o---'},
          c:{kick:'X-----o-x---o---',snare:'----o-------o---',clap:'----o-------o---',hat:'--o---o---o---o-',ohat:'--------------o-',perc:'--o-------o-----'}},
   hook:{c:{lead:{every:32,times:4,
     notes:[[0,8,2],[8,4,4],[12,4,2],[16,12,0],[28,4,1]],
     last:[[0,8,2],[8,8,4],[16,16,0]]}}},
   sound:{lead:{wave:'sine',cutoff:60,reso:28,attack:16,release:80,spread:40,drift:40,vibrato:58,vibRate:26,chorus:44,delay:60,reverb:70,level:70},
          arp:{wave:'triangle',cutoff:54,reso:18,attack:3,release:40,spread:26,drift:30,chorus:40,delay:60,reverb:52,level:46},
          chords:{wave:'super',cutoff:32,reso:8,attack:78,release:90,spread:50,drift:40,chorus:50,delay:20,reverb:78,level:50},
          bass:{wave:'sine',cutoff:34,reso:10,attack:4,release:34,drift:14,glide:40,reverb:10,level:72},
          drums:{level:38,delay:18,reverb:48,pump:20}}},
];
const demoAt=id=>DEMOS.find(d=>d.id===id)||null;
// the keys of a section a demo may set for itself; everything else comes from the section's type
const SEC_KEYS=['part','bars','energy','transpose','hook','double','sweep','fade'];
function demoSections(d){
  return (d.form||Z.DEFAULT_FORM).map(f=>{
    const type=Array.isArray(f)?f[0]:f,over=Array.isArray(f)?f[1]:null,s=Z.sectionOf(type);
    if(over){for(const k of SEC_KEYS)if(over[k]!==undefined)s[k]=over[k];
      if(over.layers)s.layers=Object.assign({},s.layers,over.layers)}
    return s;
  });
}
/* A demo as a project snapshot — exactly the shape Save writes and Open reads, so restore() does the rest:
   the sounds a demo does not mention come from the engine defaults, and everything it does mention
   autosaves, undoes and rides along in a saved project the moment it is open. */
function demoProject(id){
  const d=demoAt(id);if(!d)throw new Error('No demo song called '+id);
  const n=Z.chordScaleOf(d.scale).steps.length,part=p=>(d.hook&&d.hook[p])||{};
  const notes=(p,L)=>demoNotes(L,d.root,d.scale,part(p)[L]);
  const pattern=p=>d.drums&&d.drums[p]?demoDrums(d.drums[p]):null;
  const seeds={};for(const L of ['chords','lead','arp','bass','drums'])seeds[L]=d.seed;
  return {app:'zinth',v:2,master:d.master===undefined?80:d.master,
    params:JSON.parse(JSON.stringify(d.sound||{})),
    state:{seeds,locks:{chords:false,lead:false,arp:false,bass:false,drums:false},
      mood:d.mood,root:d.root,scale:d.scale,bpm:d.bpm,energy:d.energy,swing:d.swing,
      evolve:d.evolve!==false,sevenths:!!d.sevenths,gate:d.gate,warmth:d.warmth,eq:Z.normEq(d.eq),arp:Z.normArp(d.arp),
      prog:{v:Z.normProg(d.prog&&d.prog.v,n),c:Z.normProg(d.prog&&d.prog.c,n)},
      drumEdits:{v:pattern('v'),c:pattern('c')},
      leadEdits:{v:notes('v','lead'),c:notes('c','lead')},
      arpEdits:{v:notes('v','arp'),c:notes('c','arp')},
      bassEdits:{v:notes('v','bass'),c:notes('c','bass')},
      kit:d.kit,transitions:d.transitions!==false,sections:demoSections(d),sel:0,layer:'lead',recTarget:'lead'}};
}
window.Z=Object.assign(window.Z||{},{DEMOS,demoAt,demoDrums,demoNotes,demoSections,demoProject,degPitch});
})();
