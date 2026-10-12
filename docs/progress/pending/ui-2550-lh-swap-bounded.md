## (2026-10-12) — Browser suites: the bounded input is shared, and test:chrome's S6.3 `lh-swap` step uses it (#2550)

**STATUS: branch `ui/2550-lh-swap-bounded`, stacked on `ui/2547-2550-smoke-hangs` (#2557).** Test only. No product code, no artifact moves, no ENGINE bump. #2550 stays open for the cloud cause.

**Why.** Owner Q252: the UI lane is a cloud session, so test:chrome S6.3's `lh-swap` `selectOption` timeout (#2555's first verify) can't be the laptop sleeping, unlike the three local hangs. It needs the same bound and the same report, so that its next occurrence names what the page was stuck on.

**The change:**
- **`apps/studio/test-bounded.mjs`**, new: #2557's `bounded()`, its debugger-pause report and `rendersFrame`, moved out of `test-smoke.mjs` into one module both suites import. It's a factory, `makeBounded({ ok, isDead, onDead })`.
  - test-smoke passes its `closeDead`, so it behaves exactly as in #2557.
  - test:chrome's `onDead` reports the named stall and throws an error marked `reported`. That ends the case, and the case's own catch doesn't count it twice.
- **test:chrome S6.3 Type edits:** both `lh-swap` `selectOption` calls (to `relaxed` and back) go through it, at `INPUT_MS`. If the first stalls, the rest of the swap is skipped, not timed out again.

**Mutations, each from a commit, on rebuilt bundles:**
- **A freeze the input triggers** (a `change` listener that loops, the realistic case: the page stuck processing the input): `✗ S6.3 Type edits: previewing Dark, the normal line height swaps to relaxed: the input threw after 15003ms: locator.selectOption: Timeout 15000ms exceeded.; it was running JavaScript: frozenOnPurpose (page):1 < selectOptions (page):7368 < …`. No "case stopped" line, and the suite finished at 39,156 of 39,159.
  - The other two failures are the hook guard: `size-floor-warn` and `type-viewport-refused` render later in that case, which a dead page ends.

**A limit, measured, not fixed:** a page that freezes *before* its first bounded input, a freeze started by an earlier step, reports "no debugger session could be opened on the page, so where it stopped is unknown". The debugger is enabled at a page's first bounded input, and `Debugger.enable` needs the page's main thread. Measured with a loop started just before the `lh-swap` step. Enabling it at page open would close the gap, at the cost of a debugger session on every page in both suites.
