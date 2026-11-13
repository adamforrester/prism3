## (2026-11-13) — Plugin start suite: the start window is measured at an end state, never mid-exit (#3717)

In `apps/plugin/test-start-screen.mjs` only. The engine, the studio and the plugin are unchanged. #3719 and #3739 were
closed into #3717.

- **The failure (#3717).** `test:start` failed some of the time on `main`, always in the
  `… / Documentation › Style guides` measure. It failed two legibility arms on the start window's own text:
  `h2.p3-dialog-title "Start a brand in this file" at 1:1 (… op 0 …)` and `input.p3-hex-input … at 1:1`.
- **The cause, measured.** The window was attached, still `data-leaving`, at opacity 0, and nothing was running on
  the page. It was not mid-fade, which #3739 had guessed. Its exit had ended, but `leave` (`shell/dom.ts`) removes the
  node only once the exit's `finished` promises resolve, on a later frame. `waitStart(page, false)` reads a leaving
  window as closed from its first frame. §8's `settle` waits only for animations that are still running. So in the
  gap between the exit's end and the removal, nothing held the measure back. A loaded machine opens that gap: under 4
  parallel runs plus 4 busy loops, 1 run of 4 failed with the issue's exact lines. An instrumented copy logged
  `{"leaving":"true","op":"0","anims":[]}` right after `settle`.
- **The fix (`settleStart`).** It waits for the window's end state, not for a timer. Open means attached, not leaving,
  with its scrim at opacity 1 and nothing on it running. Closed means detached, which is `leave`'s own end. The sweep
  calls it before each start-screen measure, before Style guides (through `openStyleGuides`, now the one path to that
  page), and before the editor at the minimum size. The legibility checks are unchanged, and no node is skipped for
  its opacity.
- **The guard (`startLook`).** Every `measure` reads the start window off the page after `settle`. If the window is
  drawn but leaving, or not at opacity 1, the guard fails by name and says what it saw. A missing wait then names its
  cause, not just a fading window's text at 1:1.
- **The forced case.** It follows the sweep, in light scheme with Figma's light theme. From the click on, every
  `finished` promise reaches the page 2 s late, the way it does when the frame after the end comes late. This holds the
  gap open on every run. The case first checks that the gap is there: leaving, opacity 0, nothing running. It then
  measures Style guides through the sweep's own path.

### How it was shown

- **Mutation, in the suite** (after a `wip:` commit). With `openStyleGuides`'s `settleStart` removed, the run failed 2
  runs of 2, each with 3 failures by name: `#3717 light scheme / Figma light / forced late exit / Documentation › Style
  guides: the start window is measured at an end state, absent or open at opacity 1 — it was still drawn, leaving, at
  opacity 0`, and the issue's two legibility arms on the same page.
- **Fixed.** `test:start` passed 6 runs of 6 one after another. It also passed 4 runs of 4 under the load that had
  failed 1 run of 4 before the fix.
- **Gates.** Plugin `build` and `build:release`, `test:start`, `test:verdict` (67 of 67), and `lint-sandbox-reject`
  all passed.
- **Trap for re-verification.** Slowing the exit alone does not reproduce this. `settle` waits for a transition that
  is still running, so a long exit passes either way. The gap is after the end, so the forced case delays the end's
  notification, not the transition.
