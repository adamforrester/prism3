## (2026-10-05) — Smoke: the Interactive page's 380 check waits on the frame's width tier (#2095)

**STATUS: branch `ui/2095-interactive-380-wait`.** Tests only. No studio source change, no engine change, no emitted artifact moves, no ENGINE bump, and `CONTRACT_VERSION` is unchanged. Fixes #2095.

**The race.** The frame's width tier (`data-w`, narrow or wide) is set by a ResizeObserver in `shell/frame.ts`. Its callback runs at the next rendering step, which can come after Playwright's `setViewportSize` resolves. A check that measures right after the resize can see the wide two-pane layout squeezed to 380px. #2090 fixed this for the Button options check, which flaked about 1 run in 10. The Interactive page's 380 check in `test-smoke.mjs` had the same shape, and was latent: forced wide, it still measured 0 overflow, so it passed in either tier.

**The fix.** After the resize, the check waits on the tier as a real condition, not a duration. It reads the tier with the measurement, prints it in the assertion, and requires it to be `narrow`. So a run measured in the wide tier fails by name, rather than passing on a layout a designer never sees at 380.

**Every other resize, swept.**
- `test-smoke.mjs`: two `setViewportSize` calls. The Interactive one is fixed here. Button options (Components) already waits and requires `narrow` (#2090), so it is left as is.
- `test-chrome.mjs`: no `setViewportSize`. Each state opens a new context at its final viewport, and `frame.ts` sets `data-w` synchronously when it mounts. So the tier is right before any measurement, and `goPlace`'s read of the tier has nothing to race. Left as is.
- No other resize route (`resizeTo`, CDP device metrics) appears in either suite.

**Mutation, after a `wip:` commit, restored with `git checkout -- <file>`.** The wait was dropped, and `data-w="wide"` was set on the frame before measuring, which is the stale tier #2090's investigation forced. Result: `prism3 / Interactive at 380: every chip group fits its panel (0 overflow, frame tier wide)`, the only failure (the Interactive drive runs on the first corpus brand). The 0 overflow is the latent part: without the tier in the assertion, this run passed.

### Traps
- **The overflow count alone can't catch this race on Interactive.** The wide tier happens to fit there too, so only the tier assertion fails. That is why the tier is required rather than just printed.
