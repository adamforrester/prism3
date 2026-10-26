## (2026-10-26) — Chrome suite: the 4-mode preview-header check waits for the mode control to fit

`web light 380 / brand, 4 modes: every mode is choosable in the preview header, none clipped` failed on `main` at
`d61c9e23` and on #3037 twice, each time with `hc-dark` clipped and the select not shown. It passed on the commits
either side, and no change in between touched the preview header.

- **The cause.** `modeControl` decides between radios and the select one animation frame after its header resizes
  (a `ResizeObserver` callback schedules `fit` with `requestAnimationFrame`, #2383). At 380 and 560 the case first
  reveals the preview pane, which is that resize, and then measured at once. When the measurement ran before the
  frame, the radios had not yet given way to the select, so the last one read as clipped.
- **The fix.** The 4-mode check now waits two frames (`settle`) after the pane toggle, as the 5- and 6-mode checks
  in the same case already did. Test-only. No UI change and no engine change, so no change note is owed.
- **Not proven by mutation.** The race can't be forced on demand, so the evidence is the diagnosis above and green
  `chrome` runs.
