## (2026-11-20) — The arm 1 parity gate: token parity and geometry for all three components, in both delivery forms (#3408 S6)

**What changed.** KPI 2 (Q32 A) for arm 1 of the code POC, on `poc/arm-1`, with no engine change.

- **Token parity, element form.** `@prism3/web-components`' `check-token-parity.ts` runs `@prism3/css`'s sentinel token
  probes against `<p3-button>`, `<p3-text-field>` and `<p3-password-field>` as rendered: 1,666 bindings. What the
  element form can't write is named on every run.
- **Geometry.** `@prism3/storybook`'s `check-geometry.ts` measures every story's root and anatomy parts from the
  browser's layout, keyed by the def's part paths. It holds the two forms equal to 0.01px, and writes the code's record.
- **Figma.** `figma-geometry.js` is a read-only script for the Mac's Desktop Bridge. `compare-figma-geometry.ts`
  compares by arithmetic, cancelling only the text's width. Its self-test is in `check:build`. The real comparison
  waits on the Mac job and on an owner decision on which Figma file is the reference.
- **Blocked:** the scored comparison against arm 2 needs read access to the contributor's repo. The journal lists what
  arm 2's side needs.
