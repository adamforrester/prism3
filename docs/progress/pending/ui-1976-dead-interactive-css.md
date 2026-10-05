## (2026-10-05) — Studio: the dead legacy Interactive CSS is removed (#1976)

**Status:** `apps/studio/src/styles.css` and one `STATES` entry in `apps/studio/src/main.ts`. No ENGINE
bump (no emitted artifact moves). CONTRACT unchanged. No visible change.

### What changed

S5.2 (#1974) retired the legacy Interactive page and left its stylesheet behind. This removes it: the
matrix caption (`.gcap`, `.gcap-t`, `.gcap-d`), the slot rows (`.arow`, `.arow-main`, `.arow-lead`, `.asw`,
`.amid`, `.alabel`, `.adesc`), the example column (`.aex`, `.aex-two`, `.aex-spec`, `.exbox`), the live
specimens (`.ibtn`, `.ilink`, `.pinnable`, `.inote`, `.inote-ic`), the states grid (`.astates*`,
`.astate*`), both of the block's `@media` rules, and their comments. `arow-lead` leaves `STATES`, since
no markup wears it.

`.psec-h` sat in the same block and stays. It is not Interactive-only (the palette section head), and
`attachModeBadges` in `main.ts` still queries it, so whether it is dead belongs to a sweep of that code,
not to this one.

### How "dead" was established, not assumed

- **Source and bundles.** A word-bounded search over `apps/`, `packages/`, `tools/` and `skills/`, tests
  included, finds none of the removed classes outside `styles.css`. The rebuilt bundles carry none of them, and the `--ibtn-*` / `--ilink-*` custom properties the
  rules read are set nowhere.
- **The rendered DOM.** A scratch Playwright preload (not committed) watched every page `test:chrome` and
  `test:smoke` opened, with a MutationObserver, for a node matching any removed selector. Zero hits. A
  positive control (`[data-p3]`) was seen on every page.

### Moot, not fixed

The removed `@media(min-width:901px)` rule's comment recorded a stale 325px calibration (#902, since closed).
The rule and the rows it sized are gone, so the calibration has nothing left to measure.
