## (2026-11-18) — `@prism3/css`'s Show/Hide script keeps the caret on an input that has had focus (#3921)

**What changed.** On the code POC's integration branch `poc/arm-1`, `packages/css/password-field.js` puts the
selection back again one task after switching the input's type. Chromium resets the caret of a blurred input that
has had focus in that task, so the common case (type, then press Show) lost it. `<p3-password-field>` already did
this (#3926). Engine output doesn't move, so there is no change note.

- **`check-browser-fields.ts`** now focuses the field before selecting, the case its old untouched input hid. It
  reads the caret after Show and after Hide; both read `0,0` before the fix.
- **A new self-test mutant**, "the caret put back only in the same task", fails by name.
