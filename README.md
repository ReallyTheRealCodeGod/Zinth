# Zinth

A scale-locked song studio in a single HTML file. Every layer, every chord pad and every key you can press is locked to one key and scale, so nothing ever sounds off. Press Play and you hear a whole song. Roll until you smile, lock what you love, play along, record your own hook, then export it as WAV, as stems or as MIDI and finish it anywhere.

No build tools or dependencies. Open `index.html` in a browser.

## Two views

Zinth opens in **Jam**: Play, mood, key and scale, tempo, energy, one big dice, the song strip, the roll, a tile per layer with its sound, level, mute, lock and its own dice, the punch-in pads, Rec, the chord pads and the keys. That is everything making music needs. **Studio**, in the top bar, opens the rest: the chord cards and editor, the arrangement inspector and length presets, swing, humanize, transitions and warmth, saved songs, and the full Sound panel with every knob of every voice, the drum grid and the master EQ. The **Song** menu holds keep, copy link, save and open, and the WAV, MIDI and stems exports.

## What it does

- **Six songs to start from.** The help sheet leads with six finished tracks — *Late Bus Home* (chill), *Night Drive* (driving), *Lantern Street* (dark), *Coin Rush* (retro), *Sunrise Flight* (uplifting), *Glass Observatory* (otherworldly). Press one, or <kbd>1</kbd>–<kbd>6</kbd> while the sheet is open, and it plays. Each is a whole project — key, scale, tempo, form, its own chords, a drum pattern written step by step, a hook in the lead lane, a sound for every layer — so from the moment it opens it is yours to reroll, redraw and export. Ctrl+Z brings your own track back.
- **Generates whole songs.** Intro, verses, choruses, break, drop, outro. Verses use one progression, choruses another, and the chorus hook comes back note for note.
- **Never sounds off.** Chords are built from the scale with voice leading. Melodies lean on chord tones on strong beats. Passing tones never land on a downbeat. `tests/check.html` proves it over hundreds of generated tracks.
- **Eighteen scales.** The Scale menu is grouped so it stays readable: the **modes** (major, minor, Dorian, Phrygian, Lydian, Mixolydian, harmonic minor), five-note scales that cannot clash (both pentatonics, blues, Hirajoshi, In-sen), and an **exotic** shelf — **Lydian dominant**, **Dorian ♭2**, **Hungarian minor**, **Phrygian dominant**, **Neapolitan minor** and whole tone. Every scale carries a line about what it sounds like as its tooltip, and its own hand-picked pool of progressions: no pool in Zinth holds a diminished chord, and the self-test proves it for every scale in every key.
- **Arranger.** Add, reorder, duplicate and delete sections. Each has a type, length, key shift and its own layer switches. Loop one section while you work on it.
- **Song-length presets.** Beside the arrangement, **Length**: **Short**, **Radio** and **Extended** — about 1:30, about 3:00, about 5:00. One press rebuilds the arrangement into a whole song of about that long *at the tempo you are on*: a short song opens on four bars and reaches the chorus quickly, a long one earns a pre-chorus, a break, a drop and a bridge. Every form is a real song — it opens, it has a verse and a chorus, it ends — and nothing but the sections changes: your chords, every note you drew or recorded, the drum grid and the sound of every layer come through untouched, with the old arrangement one <kbd>Ctrl</kbd>+<kbd>Z</kbd> away. The preset that matches the current arrangement lights up.
- **Sweep a section.** Sweep in the inspector runs the whole mix through a master filter: ↗ up starts dark and opens over the section, ↘ down closes it over the last bar. Intros, pre-choruses and breaks open up, outros close down. It plays in the WAV export too.
- **Fade a section.** Fade beside it lifts the whole mix out of silence over a section's first two bars (◢ in) or lets it fall away over its last two (◣ out). Outros fade out, so a track ends the way songs end. The WAV export fades with you and the MIDI carries it as volume.
- **Lock and reroll.** New track rerolls only unlocked layers. Each layer has its own dice.
- **Chord box.** Number keys play the diatonic chords of the key in close voicings. Sketch a progression and send it to the verse or the chorus.
- **Edit the chords.** Click a chord card to change its degree, give that one chord its seventh, choose which note sits in the bass, or set how many bars it lasts — I for four bars, then IV and V for two. Split a card to add a chord, and ↺ Generated brings the rolled progression back. The progression always fills the eight-bar loop.
- **Record your melody, your arp or your bass line.** Press Rec, choose the layer to record into, and play the letter keys over the looping section. Your notes replace that generated layer, snapped to the grid. The keys sound the layer you are playing into and land where it sings: the arp an octave up, the bass in its own register, always in key. A metronome click is one button away.
- **Draw notes in the roll.** The lead, arp and bass lanes are yours: click an empty spot to add a note, click a note to remove it, drag its right edge for length. Notes snap to the grid and to the key, the bass stays in its own register, edits work while the section loops, and ↺ beside a lane name (or Clear melody for the lead) brings the generated notes back.
- **Drums.** Six kits — 808, 909, Lo-fi, Trap, House (punchy, open, bright hats) and Breaks (dusty, with a room-y snare) — a step grid per part and fills. Hats on the 808, 909, Trap and House kits are the classic metallic recipe, six square waves through a bandpass; snares have a two-tone body under the rattle; the 808 and Trap kicks are driven into a soft clip for weight, the 909 and House kicks get a short knock on top. The sidechain pump that ducks the mix under every kick sits on the master tab.
- **A perc row.** The grid's last row is percussion, and the kit decides what it plays: a cowbell, a rim or a shaker. Busy sections come with a figure already, off the backbeat and behind it in level. It follows the kit into the WAV export and reaches your DAW as the matching GM percussion note.
- **Sound.** Every synth layer is a full voice: sine, triangle, saw, square, a seven-voice stereo supersaw or two-operator FM; a 12 or 24 dB low-pass with its own envelope, key tracking and velocity; a real ADSR; drive into a soft clip; unison that splits left and right through separate filters so wide patches are genuinely wide. Sixteen designed patches from Juno Pad and Analog Brass to Glass Bell, E-Piano, Acid and Reese Bass, a random-patch dice, delay, reverb and chorus sends, a mixer with mute and solo, momentary punch-in effects. Pads and leads are high-passed on the way to the mix so they never pile mud under the bass, and the reverb is a designed room with early reflections and a tail whose highs die first.
- **A master strip.** The Sound panel's last tab is the whole mix: a three-band EQ — a low shelf at 160 Hz, a mid peak at 1 kHz, a high shelf at 4.2 kHz — each from a full cut through flat to a full boost, with Flat to reset all three. The sidechain pump and the master fader live there too. The EQ keeps its own headroom, so however hard you push the bands it takes the difference back off the level and the mix can never clip; the WAV export is shaped exactly as you hear it.
- **Humanize.** One amount in the Track panel for how much like a player and how little like a machine the whole track plays: every note gets its own small nudge off the grid and its own change of velocity, so a pattern sounds played rather than typed in. The **kick never moves** and never changes level, so the pulse stays put and everything else leans around it. A nudge is always well under half a step — the rhythm you wrote is the rhythm you hear — and the readout says what it comes to in milliseconds at the current tempo. Every nudge comes from the track's own seed rather than a die thrown during playback, so a song plays the same way twice and the WAV and MIDI exports are exactly the performance you heard. Right down is machine-tight; each mood comes set the way it plays, from Retro dead on the grid to Chill leaning right back off it.
- **Analog drift.** Every synth layer wanders a few cents in pitch and opens its filter a shade differently on every note, so repeated notes never sound identical and pads breathe. Subtle by default, per layer, and never enough to change a note.
- **Glide and vibrato.** The bass has a **Glide** amount: it slides into each note from the one before, the way a finger slides along a string, whenever the two are close enough together to be one phrase. The lead has **Vibrato** and a rate: a held note waits a moment and then comes alive, while short notes stay dead straight. Both are in the WAV export, and the MIDI asks your instrument for the same portamento and vibrato. A slide always lands exactly on the note it was heading for, and the vibrato swing is measured in cents, so neither can take a note out of the key.
- **Shape the arp.** The arp tab of the Sound panel decides what the arp plays, not just how it sounds: **Arp pattern** is the order it walks the chord in — up, down, up-down, random, block **chord** stabs, or a repeating **pattern** figure — with **Auto** to let every roll of the arp deal one. **Arp octaves** sets how far up it reaches, one to three, and **Arp gate** how much of its step each note holds, from a staccato tick to a legato run into the next note. Every mood deals a figure that suits it. Whatever you pick, every note is a tone of the chord playing under it, so the arp can never leave the key.
- **Chorus and warmth.** A **Chorus** amount per layer sends it into a stereo chorus — three short delay lines drifting under their own slow LFOs — so pads spread out and leads sound like more than one player. **Warmth** beside the volume drives the whole mix into a soft clip with the top end rolled off a shade, the way tape or a valve does. Both are in the WAV export, and the MIDI carries the chorus as CC93.
- **Transitions.** Risers into louder sections and a crash on their first beat.
- **Tap the tempo, count yourself in.** Under the tempo slider are **−**, **Tap** and **+**: tap the pulse you have in your head and the track takes it from the second tap on, or nudge the tempo a beat at a time. A pulse tapped at half or double speed is folded back into the slider's range, so whatever you tap lands somewhere the song can play. <kbd>Shift</kbd>+<kbd>T</kbd> taps, <kbd>−</kbd> and <kbd>+</kbd> nudge. And pressing **Rec** from stopped gives you a **Count-in** first — one bar of clicks at the tempo, counted down in the transport, so you can come in on the one. None of it reaches the song or the exports; switch it off beside Click.
- **Send it in a link.** **Copy link** puts the whole song into a URL — key, scale, tempo, arrangement, your chords, every note you drew or recorded, the drum grid, the sound of every layer, the EQ and the master. The song travels inside the link as JSON in base64url, so nothing is uploaded and nothing can go stale; it goes to the clipboard and the address bar at once. Opening a link restores the song, and the track you already had stays one <kbd>Ctrl</kbd>+<kbd>Z</kbd> away. Only what you changed is written, so a fresh track is a couple of hundred characters and a whole demo song about 2.5 KB.
- **Stems.** **Stems** in the top bar exports one WAV per layer, offered one after another. Each is the whole song rendered again with only that layer up, so it carries its own filter, its delay, reverb and chorus, the pump it takes from the kick and every sweep and fade of the arrangement — and nothing of the other four. They all start together and run the same length, so dropping the lot into a DAW at zero puts the song back together with a fader on every layer. Only what you can hear gets a file: a muted layer, a layer soloed out and an empty lane are left out, and the files are numbered in mixer order. The master Warmth and the bus compressor are deliberately not baked in — that glue belongs over the sum, on your master — while the EQ, the sweeps and the fades already are.
- **Leaves Zinth.** Export the whole song as WAV, as stems, or as a MIDI file with one track per layer and drums on channel 10. Save and open projects as JSON. Everything autosaves in the browser, with undo and redo.

## Shortcuts

| Key | Action |
| --- | --- |
| Space | Play / stop |
| L | Loop the selected section |
| I | Record into: lead → arp → bass |
| Shift+T | Tap tempo |
| − / + | Tempo one bpm slower / faster |
| 1–6 | Load a demo song (while the help sheet is open) |
| 1–7 | Chords |
| A–J, Q–U | Notes, two octaves |
| Z–M | Punch-in effects (hold) |
| ← → | Step between chord cards while the chord editor is open |
| Esc | Close the chord editor · release held chords |
| Ctrl+Z / Ctrl+Y | Undo / redo |
| ? | Help sheet |

## Development

Sources live in `src/`. The app is assembled into `index.html`, and the theory self-test into `tests/check.html`, by the build script:

```bash
./build.sh
```

On Windows without Git Bash:

```powershell
./build.ps1
```

| File | Role |
| --- | --- |
| `src/theory.js` | Scales, chords, section types, voice leading, generators for melody, arp, bass and drums |
| `src/demos.js` | The six demo songs and the builder that turns one into a project snapshot |
| `src/engine.js` | Web Audio synth voices, drum kits, buses, effects, scheduler, the stem plan |
| `src/ui-core.js` | State, project model, undo, arranger, piano roll |
| `src/ui-panels.js` | Sound panel, mixer, chord box, keys, recording, export |
| `tests/check.js` | Theory self-test; open `tests/check.html` after building |

The theory check runs in the browser. Open `tests/check.html` and read the verdict at the top. It also runs headlessly:

```bash
node tests/check-node.mjs
```

`ROADMAP.md` is the prioritised work queue, and `CHANGELOG.md` records what landed. A scheduled cloud agent works down the roadmap one item per run.
