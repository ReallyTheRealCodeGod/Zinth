# Zinth

A scale-locked song studio in a single HTML file. Every layer, every chord pad and every key you can press is locked to one key and scale, so nothing ever sounds off. Press Play and you hear a whole song. Roll until you smile, lock what you love, play along, record your own hook, then export it as WAV or MIDI and finish it anywhere.

No build tools or dependencies. Open `index.html` in a browser.

## What it does

- **Six songs to start from.** The help sheet leads with six finished tracks — *Late Bus Home* (chill), *Night Drive* (driving), *Lantern Street* (dark), *Coin Rush* (retro), *Sunrise Flight* (uplifting), *Glass Observatory* (otherworldly). Press one, or <kbd>1</kbd>–<kbd>6</kbd> while the sheet is open, and it plays. Each is a whole project — key, scale, tempo, form, its own chords, a drum pattern written step by step, a hook in the lead lane, a sound for every layer — so from the moment it opens it is yours to reroll, redraw and export. Ctrl+Z brings your own track back.
- **Generates whole songs.** Intro, verses, choruses, break, drop, outro. Verses use one progression, choruses another, and the chorus hook comes back note for note.
- **Never sounds off.** Chords are built from the scale with voice leading. Melodies lean on chord tones on strong beats. Passing tones never land on a downbeat. `tests/check.html` proves it over hundreds of generated tracks.
- **Eighteen scales.** The Scale menu is grouped so it stays readable: the **modes** (major, minor, Dorian, Phrygian, Lydian, Mixolydian, harmonic minor), five-note scales that cannot clash (both pentatonics, blues, Hirajoshi, In-sen), and an **exotic** shelf — **Lydian dominant**, **Dorian ♭2**, **Hungarian minor**, **Phrygian dominant**, **Neapolitan minor** and whole tone. Every scale carries a line about what it sounds like as its tooltip, and its own hand-picked pool of progressions: no pool in Zinth holds a diminished chord, and the self-test proves it for every scale in every key.
- **Arranger.** Add, reorder, duplicate and delete sections. Each has a type, length, key shift and its own layer switches. Loop one section while you work on it.
- **Sweep a section.** Sweep in the inspector runs the whole mix through a master filter: ↗ up starts dark and opens over the section, ↘ down closes it over the last bar. Intros, pre-choruses and breaks open up, outros close down. It plays in the WAV export too.
- **Fade a section.** Fade beside it lifts the whole mix out of silence over a section's first two bars (◢ in) or lets it fall away over its last two (◣ out). Outros fade out, so a track ends the way songs end. The WAV export fades with you and the MIDI carries it as volume.
- **Lock and reroll.** New track rerolls only unlocked layers. Each layer has its own dice.
- **Chord box.** Number keys play the diatonic chords of the key in close voicings. Sketch a progression and send it to the verse or the chorus.
- **Edit the chords.** Click a chord card to change its degree, give that one chord its seventh, choose which note sits in the bass, or set how many bars it lasts — I for four bars, then IV and V for two. Split a card to add a chord, and ↺ Generated brings the rolled progression back. The progression always fills the eight-bar loop.
- **Record your melody, your arp or your bass line.** Press Rec, choose the layer to record into, and play the letter keys over the looping section. Your notes replace that generated layer, snapped to the grid. The keys sound the layer you are playing into and land where it sings: the arp an octave up, the bass in its own register, always in key. A metronome click is one button away.
- **Draw notes in the roll.** The lead, arp and bass lanes are yours: click an empty spot to add a note, click a note to remove it, drag its right edge for length. Notes snap to the grid and to the key, the bass stays in its own register, edits work while the section loops, and ↺ beside a lane name (or Clear melody for the lead) brings the generated notes back.
- **Drums.** Six kits — 808, 909, Lo-fi, Trap, House (punchy, open, bright hats) and Breaks (dusty, with a room-y snare) — a step grid per part and fills. The sidechain pump that ducks the mix under every kick sits on the master tab.
- **A perc row.** The grid's last row is percussion, and the kit decides what it plays: a cowbell, a rim or a shaker. Busy sections come with a figure already, off the backbeat and behind it in level. It follows the kit into the WAV export and reaches your DAW as the matching GM percussion note.
- **Sound.** Patches per layer, waveform, filter, envelope, detune, delay and reverb sends, a mixer with mute and solo, momentary punch-in effects.
- **A master strip.** The Sound panel's last tab is the whole mix: a three-band EQ — a low shelf at 160 Hz, a mid peak at 1 kHz, a high shelf at 4.2 kHz — each from a full cut through flat to a full boost, with Flat to reset all three. The sidechain pump and the master fader live there too. The EQ keeps its own headroom, so however hard you push the bands it takes the difference back off the level and the mix can never clip; the WAV export is shaped exactly as you hear it.
- **Analog drift.** Every synth layer wanders a few cents in pitch and opens its filter a shade differently on every note, so repeated notes never sound identical and pads breathe. Subtle by default, per layer, and never enough to change a note.
- **Glide and vibrato.** The bass has a **Glide** amount: it slides into each note from the one before, the way a finger slides along a string, whenever the two are close enough together to be one phrase. The lead has **Vibrato** and a rate: a held note waits a moment and then comes alive, while short notes stay dead straight. Both are in the WAV export, and the MIDI asks your instrument for the same portamento and vibrato. A slide always lands exactly on the note it was heading for, and the vibrato swing is measured in cents, so neither can take a note out of the key.
- **Shape the arp.** The arp tab of the Sound panel decides what the arp plays, not just how it sounds: **Arp pattern** is the order it walks the chord in — up, down, up-down, random, block **chord** stabs, or a repeating **pattern** figure — with **Auto** to let every roll of the arp deal one. **Arp octaves** sets how far up it reaches, one to three, and **Arp gate** how much of its step each note holds, from a staccato tick to a legato run into the next note. Every mood deals a figure that suits it. Whatever you pick, every note is a tone of the chord playing under it, so the arp can never leave the key.
- **Chorus and warmth.** A **Chorus** amount per layer sends it into a stereo chorus — three short delay lines drifting under their own slow LFOs — so pads spread out and leads sound like more than one player. **Warmth** beside the volume drives the whole mix into a soft clip with the top end rolled off a shade, the way tape or a valve does. Both are in the WAV export, and the MIDI carries the chorus as CC93.
- **Transitions.** Risers into louder sections and a crash on their first beat.
- **Send it in a link.** **Copy link** puts the whole song into a URL — key, scale, tempo, arrangement, your chords, every note you drew or recorded, the drum grid, the sound of every layer, the EQ and the master. The song travels inside the link as JSON in base64url, so nothing is uploaded and nothing can go stale; it goes to the clipboard and the address bar at once. Opening a link restores the song, and the track you already had stays one <kbd>Ctrl</kbd>+<kbd>Z</kbd> away. Only what you changed is written, so a fresh track is a couple of hundred characters and a whole demo song about 2.5 KB.
- **Leaves Zinth.** Export the whole song as WAV or as a MIDI file with one track per layer and drums on channel 10. Save and open projects as JSON. Everything autosaves in the browser, with undo and redo.

## Shortcuts

| Key | Action |
| --- | --- |
| Space | Play / stop |
| L | Loop the selected section |
| I | Record into: lead → arp → bass |
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
| `src/engine.js` | Web Audio synth voices, drum kits, buses, effects, scheduler |
| `src/ui-core.js` | State, project model, undo, arranger, piano roll |
| `src/ui-panels.js` | Sound panel, mixer, chord box, keys, recording, export |
| `tests/check.js` | Theory self-test; open `tests/check.html` after building |

The theory check runs in the browser. Open `tests/check.html` and read the verdict at the top. It also runs headlessly:

```bash
node tests/check-node.mjs
```

`ROADMAP.md` is the prioritised work queue, and `CHANGELOG.md` records what landed. A scheduled cloud agent works down the roadmap one item per run.
