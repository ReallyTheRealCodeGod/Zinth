# Changelog

Newest first. Each entry is one roadmap item, finished, built, and verified with the theory check.

## 2026-09-10

- Piano-roll note editing for the lead. The lead lane of the roll is now a row per scale pitch: click an empty spot to add a note, click a note to remove it, drag its right edge to change its length with a live preview. The lead stays one line, so a note already sounding is trimmed rather than buried. Edits land in `state.leadEdits[part]`, the same store a recorded melody uses, so they autosave, undo, redo, survive Save and Open, and reach the WAV and MIDI exports; the first edit freezes the generated melody and Clear melody brings it back. The theory check now proves that edited and recorded notes come back verbatim, follow the section's key shift and stay in scale.
- Recording melodies from the keys, undo and redo, transitions, MIDI export, first-run guide and shortcut sheet, oscilloscope, theory self-test, sources split into `src/`.
- Chord builder fix: whole-tone seventh chords no longer double the root (the six-note scale wraps the seventh onto the root; the sixth is used instead). Found by the theory check.
