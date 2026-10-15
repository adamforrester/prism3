## (2026-10-14) — Browser suites: the debugger is on from page open, so a freeze before the first bounded input is located (#2585)

**STATUS: branch `claude/2585-debugger-at-open`.** Test only (`apps/studio/test-bounded.mjs`, `test-smoke.mjs`, `test-chrome.mjs`). No product code, no artifact moves, no ENGINE bump.

**Why.** `makeBounded` turned the debugger on at a page's first bounded input. `Debugger.enable` needs the page's main thread, so a page that froze in an earlier step reported "no debugger session could be opened on the page, so where it stopped is unknown" (#2573 measured it). #2585 asked to measure the cost of turning it on at page open before adopting it.

**The change:**
- **`test-bounded.mjs`:**
  - exports `watchStalls(page)`, which turns the debugger on now and returns whether it is on;
  - `makeBounded` takes an optional `inputMs` (default `INPUT_MS`) so a self-check can use a short bound;
  - `makeBounded` takes `requireWatched` (#2631 review). `watchStalls` marks a page watched only when its debugger turned on, and a reporter with `requireWatched` refuses bounded input on any other page, failing one check by name: "the page was never given watchStalls, or its debugger did not turn on". Both suites' reporters set it. Without it, test:chrome's `watchStalls` call had no check at all (removing it failed nothing on a clean run), and a new page in either suite that skipped the call would go unnoticed until a real stall read "unknown". It costs nothing at run time, and a failed attach is now reported instead of discarded.
- **test-smoke:** `openBrand` calls `watchStalls` once the app is loaded. Every page that takes bounded input in smoke (S4c, S4d, S4e, S5a, S5b) comes from `openBrand`.
- **test:chrome:** only S6.3's Type-edits case takes bounded input (`lh-swap`), and it calls `watchStalls` after `open()`. The suite's other pages don't, so they pay nothing.
- **A self-check, new, in smoke** (after the corpus is read). It takes a page from `openBrand` and freezes it with a named loop, `frozenBeforeInput`. Then it sends one bounded key press with a 2 s bound, through its own reporter (`closeDead` and the dead-page set aren't touched). It expects exactly one report, naming `frozenBeforeInput`. This is the first check of what the stall report says. Until now that report was read only off mutations.

**Cost, measured** on the same base (`77f3ecfc`), same container, back to back:
- smoke without the change: 398 s and 383 s;
- with it, self-check included: 420 s and 416 s.

That's about +27 s, roughly 7% of smoke or about 0.5% of a full verify (4,808 s here). test:chrome turns it on for one page.

**Mutation, from a commit:** `watchStalls` left out of `openBrand` → `✗ #2585 a page frozen before its first bounded input: the stall report names the function it was stuck in, frozenBeforeInput — reported ["probe: the input did not return within 2000ms; no debugger session could be opened on the page, so where it stopped is unknown"]`, the only failure of 12,007. That's #2573's limit, reproduced by the check itself.

**A stall seen while measuring, filed as #2629.** One of the three runs with the change failed `S4d prism3: the Text color row inverse.text.brand in light: Escape closes the picker` with "the debugger could not pause it within 5s: it was not running JavaScript". It's a cloud stall, and the debugger was already on at that input with or without this change (that page had taken bounded inputs before it), so it's not this change's gap. The two re-runs passed. The report can't yet say why a renderer that isn't running JavaScript produces no frames. #2629 tracks that.
