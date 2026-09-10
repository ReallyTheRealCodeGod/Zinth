# Zinth roadmap

The key words are **fun and intuitive**. Zinth should feel like a great music machine: you press things and good music happens, you never have to read a manual, and nothing ever sounds off. A song made in Zinth can leave Zinth.

This file is the work queue for the background agent. Items are in priority order. One item per run: implement it completely, build, run the checks, commit, push, then tick it here with the date and a one-line note. If an item is too big for one run, split it into sub-items right here, finish the first, and leave the rest unchecked. If everything is ticked, append five new items in the same spirit and do the first.

## Ground rules

- Single-file app. Sources live in `src/`, `./build.sh` assembles `index.html` and `tests/check.html`. No frameworks, no bundlers, no npm dependencies. External resources only from Google Fonts.
- Never break the scale lock. Anything that produces notes must be covered by `tests/check.js`, and `node tests/check-node.mjs` must report zero failures before every commit. If the Node runner itself is broken, fix the runner first.
- Keep the design language: tokens and type in `src/styles.css`, Chakra Petch for display, IBM Plex for body and data, the same panel and control styles. New controls should look like they were always there.
- Everything the user can do must have a visible control with a tooltip, and where it matters a keyboard shortcut listed in the help sheet and the README.
- Every setting belongs in the project snapshot (`snapshot()` / `restore()` in `src/ui-core.js`) so it autosaves, undoes, and round-trips through Save and Open.
- Exports must reflect what you hear: anything added to playback must also run in the offline render in `exportWav` and, where notes are involved, in `midiFile`.
- Verify before pushing: `./build.sh`, `node --check src/*.js`, `node tests/check-node.mjs`. Push only green work. If a push is rejected, `git pull --rebase origin main` and push again.
- Record every finished item in `CHANGELOG.md` and keep `README.md` and the help sheet in `src/markup.html` in sync with the features.

## Editing

- [x] **Piano-roll note editing for the lead.** In the roll, click empty space in the lead lane to add a note snapped to the grid and to the nearest scale pitch, click a note to delete it, drag a note's right edge to change its length. Edits are stored as the existing recorded-melody format (`state.leadEdits[part]`) so recording and editing share one path. Works while looping. Undoable. (2026-09-10: lead lane is now one row per scale pitch; click adds, click removes, right-edge drag resizes with a live preview; the first edit freezes the generated melody into `leadEdits`, and the theory check covers that path.)
- [x] **Note editing for bass and arp lanes.** Same interactions as the lead lane. Add `bassEdits` and `arpEdits` per part to the state, honoured by `generateTrack` the way `leadEvents` is. Bass stays in its register (MIDI 36 to 59). (2026-09-10: the arp and bass lanes are now pitch rows like the lead lane, click adds, click removes, right-edge drag resizes; `arpEvents` and `bassEvents` mirror `leadEvents` in `generateTrack`, drawn bass notes fold back into MIDI 36–59, a ↺ badge beside a lane name brings the generated notes back, and the roll grew to 420 px so the rows are easier to hit.)
- [x] **Record bass and arp from the keys.** A "Record into" choice next to Rec: lead, bass or arp. Bass records an octave or two down. The generated layer steps aside while recording, as the lead does now. (2026-09-10: a Record into segment beside Rec, `I` cycles it; the keys sound the layer you record into, the arp an octave up inside its lane and the bass folded into MIDI 36–59, takes land in `arpEdits`/`bassEdits` beside drawn notes, the target layer falls silent while armed, and the theory check proves a recorded key keeps its pitch class and stays in that layer's register and in the chord scale.)
- [x] **Chord editing on the chord cards.** Click a chord card to change its degree, toggle a seventh, or pick an inversion. Per-chord bar length (1, 2 or 4 bars) so a part can be I for 4 bars then IV for 2 and V for 2. Stored in `state.prog[part]` as objects, staying compatible with the plain degree arrays that chord-box sketches produce. (2026-09-10: the cards are buttons that open a chord editor row — degree, bars, voicing, 7th, Split, Remove, ↺ Generated; entries are `{d,bars,seventh,inv}`, the progression always fills 8 bars, an inverted chord shows as a slash chord, ← → step between cards, and track codes carry the lot as `0x4-3x2-4x27i1`.)
- [x] **Per-section filter sweeps.** A "Sweep" choice per section in the inspector: none, up, down. Up opens a master low-pass from 300 Hz to open over the section's length, down closes it over the last bar. Rendered in the WAV export. (2026-09-10: a Sweep segment in the inspector, a master low-pass between the mix and the punch-in chain, scheduled per section by `Z.sweepPlan` in playback and in the offline render; intros, pre-choruses and breaks open up and outros close down by default, a swept section shows ↗ or ↘ in the arrangement, and the theory check proves a plan never leaves its section, never reaches 0 Hz and always hands the next section an open mix.)
- [x] **Section fades.** Intro fade-in and outro fade-out as inspector options, applied in playback and export. (2026-09-10: a Fade segment beside Sweep — ◢ in rises from silence over a section's first two bars, ◣ out falls to silence over its last two; a master gain after the limiter carries it, `Z.fadePlan` shapes it with a knee so the fade sweeps the audible range, outros fade out by default, the WAV render and MIDI CC7 volume follow the same plan, and the theory check proves a fade moves one way, stays in its section and never mutes the section after it.)

## Sound

- [ ] **Analog drift.** Each synth voice gets a slow random pitch drift of a few cents and a slightly randomised filter cutoff, so repeated notes never sound identical. Subtle by default, with a "Drift" amount in the Sound panel.
- [ ] **Chorus and warmth.** A stereo chorus send per synth layer, and a "Warmth" knob on the master that drives a soft-clip waveshaper with a gentle high-shelf roll-off. Both in the export.
- [ ] **Two more kits and a perc row.** "House" (punchy, open, bright hats) and "Breaks" (dusty, swung, room-y snare) kits, plus a "perc" row in the drum grid (rim, shaker, cowbell chosen by kit). Generated patterns use perc tastefully at higher energy.
- [ ] **Bass glide and lead vibrato.** A "Glide" amount for the bass (portamento between consecutive notes) and a "Vibrato" depth and rate for the lead, delayed vibrato that fades in on held notes.
- [ ] **Arp modes and range.** Arp choices in the Sound panel: up, down, up-down, random, chord (block chords), pattern. Octave range 1 to 3 and a gate length control. The generator picks sensible defaults per mood.
- [ ] **More scales.** Lydian dominant, Dorian ♭2, Hungarian minor, Phrygian dominant, Neapolitan minor, each with a curated progression pool that avoids diminished triads in the pool. The theory check runs over all of them automatically.
- [ ] **Master EQ.** A "Master" tab in the Sound panel with a three-band EQ (low shelf, mid peak, high shelf) and the existing pump, applied in export.

## Workflow

- [ ] **Demo songs.** Six curated songs (a chill one, a driving one, a dark one, a retro one, an uplifting one, an otherworldly one) as one-click examples in the help sheet, each a full project snapshot with edited drums and a recorded hook, so a new user hears the best of Zinth in ten seconds.
- [ ] **Shareable links.** Copy link puts the whole project into the URL hash (JSON, deflate-free, base64url). Opening such a link restores it. Keep links under 8 KB for typical projects by omitting defaults.
- [ ] **Tap tempo and count-in.** A tap-tempo button next to the tempo slider, plus/minus nudge buttons, and a one-bar count-in with the click when Rec starts from stopped.
- [ ] **Humanize.** A Humanize amount in the Track panel that controls both the timing looseness and velocity variation of everything except the kick, from machine-tight to loose. Deterministic per seed so exports match playback.
- [ ] **Song-length presets.** Short (about 1:30), Radio (about 3:00) and Extended (about 5:00) buttons that rebuild the arrangement to a fitting form while keeping the current chords, melodies and sounds.

## Sharing

- [ ] **Stems export.** Export one WAV per layer, rendered offline with the same buses and effects, so the song can be mixed in a DAW. Files are offered one after another through the same save path as the WAV export.
- [ ] **Chord chart export.** A text file with the arrangement, key, tempo, and the chords of every section as roman numerals and names, bar by bar, formatted so a musician could play along.
- [ ] **OGG export.** A compressed audio export using MediaRecorder on a MediaStreamDestination, with a progress readout, for when a WAV is too big to share.

## Polish

- [ ] **Touch layout.** On phones and tablets the panels stack, pads and keys grow, the mixer and grid remain usable, and pads and keys support multi-touch so a chord and a note can be held together.
- [ ] **Accessibility pass.** Every control has a role and a name, the chord pads, keys, grid cells and section blocks are keyboard operable with visible focus, and reduced-motion is respected everywhere including the scope and the record button.
- [ ] **Performance.** Slider drags no longer rebuild every section on every tick: debounce, and cache section tracks whose inputs did not change. Measure with `performance.now()` and note the numbers in the changelog.
- [ ] **Visual delight.** Drum grid cells and chord pads flash on their hits during playback, section blocks show a small energy bar, and each mixer channel has its own level meter.
- [ ] **Keep the docs honest.** Read the README and help sheet against the actual features and fix anything stale. Do this whenever another item changes what the app can do.
