## (2026-10-14) — Studio smoke: the last picker clicks and Escapes in S4c and S4e are bounded (#2589)

**STATUS: branch `claude/2589-smoke-bounded-pickers`.** Test only (`apps/studio/test-smoke.mjs`). No product code, no artifact moves, no ENGINE bump.

**Why.** #2557 bounded the picker inputs that had hung, and #2573 moved `bounded()` into `test-bounded.mjs`. The same shape was still unbounded at the sites #2589 lists, so a stall there still waited 30 s per click (forever for a key press), then threw past every arm with no report.

**The change.** Every picker input in these places now goes through `bounded()` with `{ timeout: INPUT_MS }`, and every wait for a picker to draw goes through `drawn()`:
- **S4c, the Fields-row loop** (each of the eight rows, in Dark and in Light): the open, the step click and the Escape, with the `continue s4cArm` pattern its export loop already used.
- **S4e** (the issue calls these "S4d's" pickers; they sit in the S4e arm on `main`):
  - `groundOf`, which reads text.secondary's picker hint: open, `drawn()` in place of `hooks.need`, Escape. It now takes a label, so a stall says which read it was (before the pick, after it, or at a ladder-end Page).
  - The Secondary pick and the ladder-end Page picks share a new local `pickStep(at, k, step)`: open, step, wait for the write, Escape.
  - Return to Auto: open, `drawn()` on the Auto button, the press (when it's enabled), Escape. `isEnabled()` was Playwright's 30 s wait; it's now a one-shot read once the button is known to be drawn.
  - `pickerPalettes`: open, `drawn()` on the palette select, Escape. It returns `null` on a failed input, and the inverse-tier check reads `pals?.` so a null fails that check rather than throwing.
- After each helper, a retired page (`deadPages`) skips the brand through `continue s4eArm`. A thrown input on a page that still renders frames is already over, so the arm carries on, and the check that reads the result says what it got.

**Not changed:** the arm-opening tab clicks (`tab-color`, `color-sub-fills`) and `hooks.need(fills-levers)` in every arm. They aren't picker inputs, #2589 doesn't list them, and nothing has stalled on them.

**Measured.** Unmutated, on rebuilt bundles: `✅ ALL PASS — 12006 assertions executed`, `Bounded inputs (#2547, #2550): 498 went through, the slowest in 375ms of 15000ms`.

**Mutation, from a commit, one stalled input of each kind, all in one run** (a capture listener that loops forever, as #2557's `reviewerFreezeA`):
- **A click** (S4c, first brand, a loop on a Fields-row `fill-pick` click): `✗ S4c prism3: previewing dark, the Fields row field.fill: its picker opens: the input did not return within 15000ms; it was running JavaScript: freezeFieldRow (page):1: the page rendered no frame …, so it is treated as dead`.
- **`groundOf`** (S4e, first brand, a loop on text.secondary's `fill-pick` click): `✗ S4e prism3: before the pick: text.secondary's picker opens: … it was running JavaScript: freezeGroundOf (page):1: …`.
- **An Escape** (S4e, second brand, a `keydown` loop on Escape, installed before the Secondary pick): `✗ S4e aurora: the Secondary pick: Escape closes the secondary picker: … it was running JavaScript: freezeEscape (page):1: …`.
- The suite reached its report with those three as its only failures: `❌ 3 FAILED of 11963 assertions`. On `main`, the same freezes sit on an unbounded `hooks.click` (a 30 s uncaught throw) or `keyboard.press` (no bound at all).

**#2550.** Its step click (S4c surfaces) was bounded by #2557. #2589 bounds the rest of the S4c/S4e shape. Owner Q252 took the three local hangs as display-sleep. The fourth, a cloud one, was test:chrome S6.3's `lh-swap`, which #2573 bounded. So nothing in #2550 is left unbounded, and it's closed against this PR.
