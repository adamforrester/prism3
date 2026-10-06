## (2026-10-06) — Brand › Modes: the always-on Light row draws Prism3's disabled check box (DB1 A; #2208)

**Status:** `apps/studio/src/chrome.css` and `test:chrome`. No engine change, no emitted artifact moves, no ENGINE bump, and `CONTRACT_VERSION` is unchanged. No new copy. Visible: Brand › Modes' Light row changes from a dashed box with the mark in the text color to Prism3's disabled check box, the same box a locked mode check draws since #2211.

### The owner's decision

- **DB1 A (#2208, option b).** The fixed **Light** row draws Prism3's disabled check box, the same as a locked mode check, so "can't change" has one look in the chrome.

### The change

- **Removed.** `.p3-check-fixed .p3-check-box { border-style: dashed; }`, the last dashed "can't change" edge #2211 left in `chrome.css`, and the row's own mark color (`--p3-text`).
- **Reused, not added.** #2211's two locked-check-box rules now also select `.p3-check-fixed`, through `:is(…)`. The box takes `--p3-disabled-fill`, `--p3-disabled-edge` (`color.disabled.border`) and the mark `--p3-disabled-ink` (`color.disabled.on-fill`). No role differs, so no variable is new. The row keeps `display: block` on its mark, since a fixed row is always on and has no `aria-checked` to show it.
- **Unchanged on purpose.** The row is still a `div`, not a control. It has no role and no tabindex, its box is `aria-hidden`, and its text still reads "Light" and "Always generated: it’s the base mode." Its name and note keep their ink. The decision covers the box only, and the note is already held at 4.5:1 by #1770's check in `test:chrome` §1.

### Test, in `test:chrome` (X4 A derived)

- **The sweep widens.** After the eight places, each of the four runs (web and figma, light and dark chrome) goes to Brand and reads the Light row with the same `DISABLED_READ`. Its dashed edges join the sweep's list, and the line now names the row: `no disabled chrome control, and not the fixed Light row (mode-on-light, read …), draws a dashed edge`. A row not found fails the line too. The count goes from 438 to 439.
- **The box against the emission.** A new line holds the box's fill, its four edges (one solid color) and its mark to `PRISM3_DISABLED`, resolved in Node from the committed emission, never from the studio's CSS: `disabled.fill`, a solid `disabled.border`, the mark on `disabled.on-fill`. It runs in both chrome themes on both hosts.
- **Still a fixed fact.** A third line holds the row to a `div` with no role or tabindex, its box `aria-hidden`, and its text the literal above.
- With a screenshot directory, each run saves `2208-{web,plugin}-{light,dark}-modes.png`.

### Mutation (`wip:` commit first)

- **The dashed rule back:** 8 failures, two per run on both hosts and both chrome themes. The first is `X4 A derived: web light: no disabled chrome control, and not the fixed Light row (mode-on-light, read true), draws a dashed edge (439 read) — brand mode-on-light: p3-check-box top dashed, p3-check-box right dashed, p3-check-box bottom dashed, p3-check-box left dashed`. Its pair is `X4 A derived: web light: DB1 A: the fixed Light row's box draws Prism3's disabled check box: … drew {"fill":"#c0c1c2","edge":"4 side(s) #c0c1c2 dashed","ink":"#67696b"}`.
