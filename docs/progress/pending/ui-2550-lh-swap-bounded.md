## (2026-10-12) — Browser suites: the bounded input is shared, and test:chrome's S6.3 `lh-swap` step uses it (#2550)

**STATUS: branch `ui/2550-lh-swap-bounded`, on `main` after #2557 merged.** Test only. No product code, no artifact moves, no ENGINE bump. #2550 stays open for the cloud cause.

**Why.** Owner Q252: the UI lane is a cloud session, so test:chrome S6.3's `lh-swap` `selectOption` timeout (#2555's first verify) can't be the laptop sleeping, unlike the three local hangs. It needs the same bound and the same report, so that its next occurrence names what the page was stuck on.

**The change:**
- **`apps/studio/test-bounded.mjs`**, new: #2557's `bounded()`, its debugger-pause report and `rendersFrame`, moved out of `test-smoke.mjs` into one module both suites import. It's a factory, `makeBounded({ ok, isDead, onDead })`.
  - **It carries #2557's busy-path rule, as merged.** This branch was cut from #2557's earlier head, whose busy path reported the stall and carried on with the input still in flight. #2557's review rewrote it before merge: an input that did not return on a page that still renders frames is still in flight and would land on whatever runs next, so that page is retired the same way a dead one is. Taking this branch's side of the merge would have undone that silently, so the merge moved the merged `bounded()` into the module rather than keeping the copy cut earlier. The busy path calls `onDead(page, label, why)` with `why` saying the input is still in flight. A thrown input on a busy page is over, and only that case carries on.
  - test-smoke passes its `closeDead`, so it behaves exactly as #2557 merged it.
  - test:chrome's `onDead` reports the named stall and throws an error marked `reported`, on the dead path and the busy one alike. That ends the case, the case's own catch doesn't count it twice, and its `finally` closes the context, which cancels an input still in flight.
- **test:chrome S6.3 Type edits:** both `lh-swap` `selectOption` calls (to `relaxed` and back) go through it, at `INPUT_MS`. If the first stalls, the rest of the swap is skipped, not timed out again.

**Mutations, each from a commit, on rebuilt bundles:**
- **A freeze the input triggers** (a `change` listener that loops, the realistic case: the page stuck processing the input): `✗ S6.3 Type edits: previewing Dark, the normal line height swaps to relaxed: the input threw after 15003ms: locator.selectOption: Timeout 15000ms exceeded.; it was running JavaScript: frozenOnPurpose (page):1 < selectOptions (page):7368 < …`. No "case stopped" line, and the suite finished at 39,156 of 39,159.
  - The other two failures are the hook guard: `size-floor-warn` and `type-viewport-refused` render later in that case, which a dead page ends.

**Re-run on the merged result** (all three mutations in one commit, smoke and test:chrome on rebuilt bundles, then `git reset --hard`):
- **#2557's mutation B** (`pointer-events:none` on `step-picker-step` for 20 s, first brand, before the S5a step loop) takes the new busy path: `✗ S5a prism3: the interactive.primary.text.rest picker: its action runs: the input did not return within 15000ms; the page still renders frames, so it was busy, not stuck, but the input is still in flight — its context is closed and the rest of this arm is skipped`.
- **#2557's mutation A** (`reviewerFreezeA`, a capture `click` listener that loops on a `step-picker-step` click, first brand, S4c): `✗ S4c prism3: previewing dark, the base picker takes its 100 step: the input did not return within 15000ms; it was running JavaScript: reviewerFreezeA (page):1: the page rendered no frame within 15000ms, so it is treated as dead — its context is closed and the rest of this arm is skipped`.
  - Smoke reached its report with those two as its only failures: `❌ 2 FAILED of 11844 assertions`.
- **This branch's `reviewerFreeze`** on `lh-swap` again fails by name, with the same two hook-guard lines, and the suite finishes at 39,356 of 39,359.

**A limit, measured, not fixed:** a page that freezes *before* its first bounded input, a freeze started by an earlier step, reports "no debugger session could be opened on the page, so where it stopped is unknown". The debugger is enabled at a page's first bounded input, and `Debugger.enable` needs the page's main thread. Measured with a loop started just before the `lh-swap` step. Enabling it at page open would close the gap, at the cost of a debugger session on every page in both suites. Decided as a technical call and tracked as #2585.
