## (2026-11-01) — test:chrome holds a busy control's spinner beside its label (#2908)

**Status:** test only, in `apps/studio/test-chrome.mjs` section 10. No product code changes, no emitted artifact
moves, no ENGINE bump, `CONTRACT_VERSION` unchanged, `EXECUTOR_REVISION` unchanged.

### What was found

- **The owner saw it in Figma on 2026-10-21:** while Apply Theme ran, the busy indicator sat over the start of
  "Applying…". Apply Theme has since moved into Update file (#2909, #2995). Its button and Documentation's Draw specs
  draw the same `pendingLabel` (`shell/dom.ts`): a "…" cell (`.p3-spin`, 16px, which turns into the arc after about
  300 ms), a `--p3-space-050` gap, then the words.
- **It does not reproduce in Chromium.** Rendered as built, at HEAD (Update file and Draw specs) and at the
  2026-10-21 build the owner tested (`2d58f4e1`, the bar's Apply Theme), at 1280 and 380, in both themes, with the
  main thread blocked for 1.5 s mid-run to imitate the plugin's iframe while a write runs: the cell, its "…" and the
  words never share a pixel. The cell's CSS has not changed since then. So the overlap the owner saw comes from
  something the test hosts don't draw, and this lane makes no product change it can't show is needed. Renders are on
  the issue.
- **Which busy signal to keep** (the cell's "…"/arc, the label's own "…", or both) is owner design. The issue says to
  flag it rather than pick, so it is asked on #2908 and nothing here changes it.

### What changed

- **`BUSY_OVERLAP`**, a probe in `test-chrome.mjs`. While a control is busy, it takes the "…" cell's box, the box of
  the "…" text inside it (so dots spilling out of their cell count), and the words' text box (a Range over the label's
  text nodes), and returns their shared area. Expected: the literal `BUSY_OVERLAP_MAX = 0`. Nothing is read from the
  stylesheet. A control that isn't busy, or has no cell or no words, returns `null`, which fails by name.
- **Two arms in section 10, on the figma host**, at every width the section sweeps (1280, 640, 380) and both themes:
  Update file while its run is out ("Updating…"), and Draw specs while it draws ("Drawing specs…"). That's 12
  assertions. The web host draws no busy control: its only writes are the plugin's.

### Mutation

After a `wip:` commit: `.p3-spin`'s `position: relative` changed to `position: absolute` in `chrome.css`, so the cell
leaves the label's flow and draws over its first letters. Result: `#2908 figma light 1280: the busy spinner sits beside
"Updating…", not over it (shared area 405px², at most 0; …)` and its Draw specs twin, all 12 arms, with no other
failure.
