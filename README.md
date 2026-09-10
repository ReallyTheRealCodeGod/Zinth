# Zinth

A scale-locked song studio in a single HTML file. Every layer, every chord pad and every key you can press is locked to one key and scale, so nothing ever sounds off. Press Play and you hear a whole song. Roll until you smile, lock what you love, play along, record your own hook, then export it as WAV or MIDI and finish it anywhere.

No build tools or dependencies. Open `index.html` in a browser.

## What it does

- **Generates whole songs.** Intro, verses, choruses, break, drop, outro. Verses use one progression, choruses another, and the chorus hook comes back note for note.
- **Never sounds off.** Chords are built from the scale with voice leading. Melodies lean on chord tones on strong beats. Passing tones never land on a downbeat. `tests/check.html` proves it over hundreds of generated tracks.
- **Arranger.** Add, reorder, duplicate and delete sections. Each has a type, length, key shift and its own layer switches. Loop one section while you work on it.
- **Sweep a section.** Sweep in the inspector runs the whole mix through a master filter: ↗ up starts dark and opens over the section, ↘ down closes it over the last bar. Intros, pre-choruses and breaks open up, outros close down. It plays in the WAV export too.
- **Fade a section.** Fade beside it lifts the whole mix out of silence over a section's first two bars (◢ in) or lets it fall away over its last two (◣ out). Outros fade out, so a track ends the way songs end. The WAV export fades with you and the MIDI carries it as volume.
- **Lock and reroll.** New track rerolls only unlocked layers. Each layer has its own dice.
- **Chord box.** Number keys play the diatonic chords of the key in close voicings. Sketch a progression and send it to the verse or the chorus.
- **Edit the chords.** Click a chord card to change its degree, give that one chord its seventh, choose which note sits in the bass, or set how many bars it lasts — I for four bars, then IV and V for two. Split a card to add a chord, and ↺ Generated brings the rolled progression back. The progression always fills the eight-bar loop.
- **Record your melody, your arp or your bass line.** Press Rec, choose the layer to record into, and play the letter keys over the looping section. Your notes replace that generated layer, snapped to the grid. The keys sound the layer you are playing into and land where it sings: the arp an octave up, the bass in its own register, always in key. A metronome click is one button away.
- **Draw notes in the roll.** The lead, arp and bass lanes are yours: click an empty spot to add a note, click a note to remove it, drag its right edge for length. Notes snap to the grid and to the key, the bass stays in its own register, edits work while the section loops, and ↺ beside a lane name (or Clear melody for the lead) brings the generated notes back.
- **Drums.** 808, 909, Lo-fi and Trap kits, a step grid per part, fills, sidechain pump.
- **Sound.** Patches per layer, waveform, filter, envelope, detune, delay and reverb sends, a mixer with mute and solo, momentary punch-in effects.
- **Analog drift.** Every synth layer wanders a few cents in pitch and opens its filter a shade differently on every note, so repeated notes never sound identical and pads breathe. Subtle by default, per layer, and never enough to change a note.
- **Transitions.** Risers into louder sections and a crash on their first beat.
- **Leaves Zinth.** Export the whole song as WAV or as a MIDI file with one track per layer and drums on channel 10. Save and open projects as JSON. Everything autosaves in the browser, with undo and redo.

## Shortcuts

| Key | Action |
| --- | --- |
| Space | Play / stop |
| L | Loop the selected section |
| I | Record into: lead → arp → bass |
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
| `src/theory.js` | Scales, chords, voice leading, generators for melody, arp, bass and drums |
| `src/engine.js` | Web Audio synth voices, drum kits, buses, effects, scheduler |
| `src/ui-core.js` | State, project model, undo, arranger, piano roll |
| `src/ui-panels.js` | Sound panel, mixer, chord box, keys, recording, export |
| `tests/check.js` | Theory self-test; open `tests/check.html` after building |

The theory check runs in the browser. Open `tests/check.html` and read the verdict at the top. It also runs headlessly:

```bash
node tests/check-node.mjs
```

`ROADMAP.md` is the prioritised work queue, and `CHANGELOG.md` records what landed. A scheduled cloud agent works down the roadmap one item per run.
