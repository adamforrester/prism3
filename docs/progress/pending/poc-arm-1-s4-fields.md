## (2026-11-17) — `@prism3/web-components` adds `<p3-text-field>` and `<p3-password-field>` (#3408 S4)

**What changed.** On the code POC's integration branch `poc/arm-1`, the two fields join `<p3-button>` as light-DOM Lit 3
elements over `@prism3/css`. They are generated from their defs' props in `component-defs.json`. Engine output doesn't
move, so there is no change note.

- **One tree, native associations.** The label's `for` names the input. `aria-describedby` names the message, and
  `aria-invalid` is set at error. The Show/Hide button is rendered in Lit, per Q301.4 A, Q301.5 A and Q301.7 A.
- **Markup works before JS runs.** `@prism3/css`'s markup inside the element is a plain field. On upgrade the element
  adopts its props, a typed value and focus. `password-field.js` stands aside inside an upgraded element.
- **Two new checks, chained into the package's existing scripts.** The parity check has 8 mutants and the browser check
  has 1,304 checks and 5 mutants, each mutant failing by name.
- **Found:** Chromium resets a blurred input's caret one task after its type changes. The element handles it;
  `@prism3/css`'s script is filed as #3921. Five owner decisions are recorded in `docs/poc/arm-1-journal.md`.
