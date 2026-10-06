## (2026-10-06) — the two load-sensitive suite clicks settle first, fail by name, and the suite still reports (#2080, #2167)

**STATUS: branch `test/2080-2167-settle-clicks`.** Test only: no product change, no engine change, no emitted artifact moves. ENGINE bump class: **none owed**. `CONTRACT_VERSION` unchanged. **Fixes #2080 and #2167.**

### The cause, measured (not "flake")

A scratch Playwright preload (not committed) sampled both click targets on every animation frame: node identity, bounding box, `data-sig`, and the scroller's `scrollTop`. It also counted main-thread long tasks. A click that failed, or every click in later passes, logged what its target did during the wait. **It was proven first on planted nodes:** a node replaced every frame read `nodes=431`, and one moved every frame read `moves=479`.

- **Under load.** Two extra `test:chrome` loops ran in spare worktrees, at load averages 7 to 14, across eight suite runs. **Neither stall reproduced.** All clicks on the Dark mode option: never replaced, slowest 127ms. All 8 clicks on `icons-pair`: slowest 68ms.
- **What a click's time tracks.** Every slow click lined up with one main-thread long task of nearly its length (127ms with a 105ms task, 109 with 86, …). With the renderer's CPU throttled 4× (`Emulation.setCPUThrottlingRate`), the median rose 36 → 108ms and the max to 380ms against a 343ms task.
- **#2080's candidate:** that the mode control replaces its buttons on every verdict update and costs keyboard focus. **Refuted.** `modeControl` (`shell/preview.ts`) rebuilds its buttons only when the brand's set of modes changes. A verdict update replaces a button's children, never the button. Across 300 measured clicks, 0 replacements. The only box change seen during a wait was the click's own result: checked, 71 → 72px wide.
- **#2167's candidate:** the eased scroll. Not seen moving the target during any wait, but it is a real way a target can keep moving. And Surfaces & fills re-renders its whole levers pane on every brand update, so `icons-pair` is a new node after each edit, and it sits far below the fold (y ≈ 3650), so every click scrolls it into view first. #2167's log stalled at "scrolling into view if needed" with no further line: a call into a renderer that wasn't running.

**Conclusion:** a 30-second stall in either click is a renderer that could not run for about 30 seconds (machine starvation, or the host suspending mid-run, which this machine has been seen to do). It isn't a target that wouldn't hold still. No wait makes a starved renderer faster. What the suite can do is wait for a real settle, and **fail the arm by name** when there isn't one.

### The fix

- **`test-smoke.mjs`:** `previewMode` goes through a local `settledClick`. It waits until the page renders frames with the target's box and its scroller's `scrollTop` unchanged across consecutive frames, which also covers an eased scroll still stepping. It then clicks. Both are bounded at 15s each. `previewMode`'s `aria-checked` wait is bounded too: unbounded, a click that landed but didn't take was the same bare throw. A stall records a named failure and returns `false`.
- **`test-chrome.mjs`:** a targeted wait at the `askPair` site only, the same settle and bounded click, kept local because four UI-lane PRs are open against this file. A stalled `askPair` also **ends its arm** through a labelled block (`askPairArm`). Measured: with only the click bounded, the arm's next step, `unpair()`, waited for a button only a completed pairing draws and threw. So the suite still died before `report()`.
- **The shared `hooks.click` is unchanged.** The remaining unbounded clicks and waits across both suites are filed as #2229.
- **A guard for the property #2080 worried about** (new, the last section of `test-smoke.mjs`): Arrow Right on the mode radios selects and focuses the next option, and that option keeps focus as the same node, after a repaint that provably reached it (its `data-sig` moved). It passes today. It guards the behavior.

### Mutations, each failing by name, every suite reaching its report

- **The settle broken** (never satisfied), smoke: 114 `✗ previewMode <mode>: … did not settle before its click — it was still moving after 1801 frames …`, then `❌ 138 FAILED of 6756 assertions`, with no stack trace.
- **The settle broken**, chrome: `✗ #2167 askPair: Pair icons did not settle before its click — …`, then `17794/17795 chrome assertions passed`, with no stack trace. The first attempt, before `askPairArm`, crashed in `unpair()`; that's what added the arm guard.
- **The click stalled** (bound forced to 1ms), smoke: 114 `✗ previewMode <mode>: the click on … did not land — …`, then `❌ 138 FAILED of 6756 assertions`.
- **The product guard:** `paint` made to rebuild the radios on every call (`shell/preview.ts`). Exactly `✗ #2080 keyboard focus survives the mode control's repaint … {"focusedIsIt":false,"sameNodeAsBefore":false,…}`, then `❌ 1 FAILED of 6699 assertions`.

### Trap for whoever re-runs this

An output filter on a mutation run can hide the evidence. Here, a `grep` on the harness's output kept the summary and dropped the `✗` lines, the same slip that misreported a mutation in #2104's entry. Write each suite's full output to a log, and read the log.

### After review (BLOCK on `5229238b`: two exits missing)

**Defect 1: smoke's callers ignored `previewMode`'s `false`.** A failed switch carried on in the wrong mode, and its next ordinary click (on a disabled `fill-pick`) crashed with a bare `TimeoutError`. Every one of the eight callers now handles it. The three per-brand arms are labelled (`s4cArm`, `s4eArm`, `s4dArm`):
- the five loop callers skip that mode;
- the `derived` check guards its one assertion;
- the two arm-level `previewMode(page, 'light')` calls skip the arm, since everything after them assumes Light.

**Defect 2: a frozen renderer became an indefinite hang, where `main` had a 30-second crash.** "Rendered no frame" was reported, then the next untimed `page.evaluate` waited forever (the reviewer saw 25+ minutes). Such a page is now **dead**: the failure is named, its context is closed (that close is bounded too), it joins `deadPages`, and its arm skips to the next brand. `askPair` does the same at its site.

**A refinement the mutation run turned up.** With the renderer frozen just after the settle passed, the click timed out and was reported as "did not land". The page was then only found dead one call later. A failed click is now followed by a bounded liveness check (a frame within 3s), so a frozen renderer is named dead at the first failure.

**Mutations for the two exits.** The outputs are in the PR. The ones to compare are D2 on both suites (an endless main-thread block planted before the click), D1 on smoke (Dark refused at every switch), and M2 on smoke against the fixed callers (the alive, click-didn't-land path). Each reaches its report with named failures and no hang.
