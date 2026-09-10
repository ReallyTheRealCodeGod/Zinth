# Zinth

A scale-locked song studio in a single HTML file. Every layer, every chord pad and every key you can press is locked to one key and scale, so nothing ever sounds off. Press Play and you hear a whole song. Roll until you smile, lock what you love, play along, record your own hook, then export it as WAV or MIDI and finish it anywhere.

No build tools or dependencies. Open `index.html` in a browser.

## What it does

- **Generates whole songs.** Intro, verses, choruses, break, drop, outro. Verses use one progression, choruses another, and the chorus hook comes back note for note.
- **Never sounds off.** Chords are built from the scale with voice leading. Melodies lean on chord tones on strong beats. Passing tones never land on a downbeat. `tests/check.html` proves it over hundreds of generated tracks.
- **Arranger.** Add, reorder, duplicate and delete sections. Each has a type, length, key shift and its own layer switches. Loop one section while you work on it.
- **Lock and reroll.** New track rerolls only unlocked layers. Each layer has its own dice.
- **Chord box.** Number keys play the diatonic chords of the key in close voicings. Sketch a progression and send it to the verse or the chorus.
- **Record your melody.** Press Rec, play the letter keys over the looping section, and your notes replace the generated melody, snapped to the grid. A metronome click is one button away.
- **Drums.** 808, 909, Lo-fi and Trap kits, a step grid per part, fills, sidechain pump.
- **Sound.** Patches per layer, waveform, filter, envelope, detune, delay and reverb sends, a mixer with mute and solo, momentary punch-in effects.
- **Transitions.** Risers into louder sections and a crash on their first beat.
- **Leaves Zinth.** Export the whole song as WAV or as a MIDI file with one track per layer and drums on channel 10. Save and open projects as JSON. Everything autosaves in the browser, with undo and redo.

## Shortcuts

| Key | Action |
| --- | --- |
| Space | Play / stop |
| L | Loop the selected section |
| 1–7 | Chords |
| A–J, Q–U | Notes, two octaves |
| Z–M | Punch-in effects (hold) |
| Esc | Release held chords |
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

The theory check runs in the browser. Open `tests/check.html` and read the verdict at the top.
