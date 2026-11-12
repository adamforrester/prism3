## (2026-11-11) — Pending change notes corrected to US English, one time (Q181 A)

The 0.238.0 fold (#3570) was the first to ship change notes verbatim in the served release pages, and the
prose gates found en-GB text in notes that no gate had read when they merged (#3574). The owner chose
Q181 A: move the prose check upstream to `packages/engine/changes/*.md` (its own PR), and correct the
pending notes once, as an approved exception to "never edit another PR's note".

### What changed

- Five pending notes edited, each to the smallest fix: `colour` → `color` in
  `claude-color-family-order-2900` (×1) and `claude-color-variable-order` (×2); `centring` → `centering` in
  `claude-toast-message-14-3165` (a real hit the #3570 triage had not listed); the bare file name
  `materialise-to-figma.ts` → its full path in `claude-1024-paste-rename-migration`, which the gate's file-name
  mask already exempts; and `claude-3186-centring`, a note about the lint that quoted its en-GB test words,
  reworded to name the en-US spellings instead. Adding those words to `NOT_EN_GB` would have hidden the real
  `centring` above, so the note was edited rather than the allow-set widened.
  Q181 A named only the two `colour` notes. The owner extended the exception to all five notes the upstream
  prose gate flags (Q190 A, 2026-11-12), so the #3570 fold re-cut is clean and no allow-set entry is needed.
  The three extra entries in `APPROVED_NOTE_CORRECTIONS` name both decisions.
- `lint-emission-version.ts` ONE WRITER fails any edit to a pending note by design. It now carries
  `APPROVED_NOTE_CORRECTIONS`, which pins each correction by its blob at the base and at HEAD. Only that exact
  edit passes, and each entry is spent once `main` carries the corrected blob.

### Verification

Mutations, each failing by name: a wrong `to` blob gives `ONE WRITER — this diff edits 1 pending change
note(s)` naming `claude-color-family-order-2900.md` "(listed in APPROVED_NOTE_CORRECTIONS, but not this exact
edit)"; editing an unlisted note (`claude-list-spacing-3155.md`) gives the same arm naming that file.
