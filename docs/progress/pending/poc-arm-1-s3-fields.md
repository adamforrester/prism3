## (2026-11-17) — `@prism3/css` gains the text field and the password field, generated from the emission (#3408 S3)

**What changed.** On the code POC's integration branch `poc/arm-1`, phase S3. Engine output doesn't move, so there is
no change note.

- **Four generated stylesheets** (Q96 A): `field-label.css`, `field-message.css`, `text-field.css` and
  `password-field.css`, written by `packages/css/fields.ts` from `specs.json` and `component-defs.json`. Light DOM,
  one `<label for>` + `<input>` + message tree, `aria-describedby` and `aria-invalid`, the `p3` layer, `p3-` classes
  and `data-prop-*` (Q97 A, Q139 A). The nested label and message follow the field's size and status, as the
  emission's `nesting` says, so an author sets each once.
- **The focus edge** (#3399) is an inset `outline` in the border's own paint, so a status field keeps its status color
  while focused and nothing moves.
- **The Show/Hide button** is the nested `p3-button` (text, small, flush), with its hit area read from the button def's
  `size.<field size>.hit-target` (Q-HT1 A): 24px centered at small, 44px anchored above the box at medium and large.
  Its behavior is `password-field.js`, a small hand-written script (Q86 A). The button is `hidden` until the script
  runs.
- **#3839 is not on `main`,** so the radius, the border widths, the ring style, the spinner's motion and the hit floors
  are read from the TypeScript defs, as S2 did.
- **Gates:** `check:generated` covers the new files; `check:raw-values` scans them; `check:parity` adds
  `check-parity-fields.ts` (its own copy of the contract, sentinel tokens, seven mutants); `test:browser` adds
  `check-browser-fields.ts` (real tokens, the accessibility tree, the toggle with and without the script, geometry,
  six mutants).
- **Owner decisions flagged** in the journal: the toggle hidden before JS, the Tab order (the def's keyboard note and
  its anatomy disagree), the pending spinner's place, the 120px minimum width, and the message off by default.
