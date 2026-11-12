## (2026-11-12) — Chrome suite: `chooseAnyMode` waits for the mode control's fit before it looks (#3668)

In `apps/studio/test-chrome.mjs`, plus one attribute in `apps/studio/src/shell/preview.ts`. The engine is unchanged.
What the studio and the plugin show is unchanged.

- **The race (#3668).** The preview header's mode control decides between radios and the select in `fit`. A resize of
  the header schedules `fit` for the frame after the ResizeObserver's delivery. Going from Components to Brand with
  Wireframe on at web 1280 shows the header again: Components leaves `data-fit="radios"` and Brand settles on
  `select` one frame later. `chooseAnyMode` looked at once. When the look landed in that frame it saw the radio, and
  the click then waited 30 s for a radio the fit had hidden. That is the CI failure on #3664's run (section 26, S8.2
  derived modes).
- **The settled signal (`preview.ts`).** Nothing said a fit was owed: `settleModes` inferred it from two frames giving
  the same answer. The fit runs after the delivery, in a later frame, so a check that starts before the first frame
  reads the old answer twice and calls it settled. The ResizeObserver callback now sets `data-fit-pending` on the
  control's wrapper, and `fit` clears it. Nothing reads it but the suite, and it changes no style.
- **The wait (`test-chrome.mjs`).** `settleModes` first waits until a frame has drawn since the call, so any resize it
  carried is delivered, and then for `data-fit-pending` to clear. Its two-frame check runs after that, as before.
  `chooseAnyMode` now calls `settleModes` before it looks, as `pickMode` already did.

### How it was shown

- The race does not happen in a natural local run: across 12 cases the fit had always run before the look. It was
  forced two ways in a standalone probe that walks section 26's loop (Components, then Brand, then each derived mode).
- **Slow frames.** Every animation frame was delayed 600 ms and the look and the click were 900 ms apart, which is a slow
  CI frame and a slow round trip. The old helper threw in 6 of 6 cases, each the issue's failure: the radio was drawn
  at the look, the fit then hid it, and the click waited for it. The fixed helper chose by the select in 6 of 6.
- **Frame order, natural speed.** Brand was opened and the settle started in the same task, before any frame had drawn.
  The old two-frame check read the stale `radios` in 10 of 10 cases. With the pending flag it read the settled
  `select` in 10 of 10. So the flag is needed: `settleModes` alone could miss the race.
- Trap for re-verification: delaying every frame changes their order, and under that forcing the old `settleModes`
  alone also passes. Only the same-task probe shows its gap.
- The whole chrome suite, run in seven local chunks under 10 minutes each, passed 46,050 of 46,050 assertions, and
  `test:chrome-shards` held every section run exactly once. Section 26, the issue's site, ran in the chunk with 6,375 of
  6,375.
