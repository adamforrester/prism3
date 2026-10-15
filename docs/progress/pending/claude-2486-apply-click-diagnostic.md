## (2026-10-14) — test:chrome #2192: an Apply click that doesn't land says what Apply was doing (#2486)

**STATUS: branch `claude/2486-apply-click-diagnostic`.** Test only (`apps/studio/test-chrome.mjs`). No product code, no artifact moves, no ENGINE bump. #2486 stays open: the cause isn't found.

**What the flake now says.** #2481 made a caught failure keep Playwright's actionability line. The first failure after it (CI on #2612, `921319c5`) read:

`✗ #2192 figma dark 1280: the case stopped at a step that threw — locator.click: Timeout 10000ms exceeded. · waiting for locator('[data-p3="apply-to-figma"]') · waiting for element to be visible, enabled and stable`

So the click that stalled was **Apply**, in the figma host's `saved()`, not a chip. Playwright never got past its actionability wait. #2482's earlier instance was also figma dark 1280.

**Read from the code, not reproduced:**
- Apply is "not enabled" to Playwright while it's busy: `setBusy` sets `aria-disabled="true"`, which Playwright counts as disabled.
- It's busy while `host.applyState === 'pending'` or an agent runs 'apply'.
- `runApply` sets `pending` and posts in one synchronous step, so `saved()`'s `apply-result` reply can't arrive before it. That ordering race is ruled out.
- That leaves three candidates the label can't tell apart: Apply stays busy (the reply lost or ignored), Apply is hidden, or Apply keeps moving. The bar's `fitBar` (#2214) re-fits tiles when the bar's content changes width, and a verdict pill changing text could start that. Apply is the bar's last control, so it would move with every re-fit.

**The change: the diagnostic.** When `saved()`'s Apply click throws, the case's failure line now ends `· Apply as it stood (#2486): {…}`. That's read off the page over 12 frames and bounded at 5 s:
- `disabled`, `aria-disabled` and `aria-busy`;
- its label, and whether it's drawn;
- every distinct box Apply took;
- every distinct `data-bar-fit` step the bar took.

The next failure then says which of the three it is. No retry, no raised timeout.

**Not reproduced.** A scratch probe drove the dark-themed plugin UI at 1280 on Type through a chip click, Apply, the `apply-result` reply, then 30 frames watching Apply's box, its `aria-busy` and the bar's `data-bar-fit`. It found nothing in 120 cycles at rest and 240 cycles under load (four CPU burners plus three probes in parallel). Apply never moved, never re-fit, and never stayed busy. So per the issue, it stays open for the next CI failure, which will now carry the answer.

**Mutation, from a commit:** `saved()` leaves out its `apply-result` reply once (its second call), so Apply stays busy, the realistic "reply lost" case. On rebuilt bundles, every figma case fails by name, with the state that says why: `✗ #2192 figma dark 1280: the case stopped at a step that threw — locator.click: Timeout 10000ms exceeded. · waiting for locator('[data-p3="apply-to-figma"]') · element is not enabled · Apply as it stood (#2486): {"disabled":false,"ariaDisabled":"true","busy":"true","label":"Apply Theme… Applying…","drawn":true,"boxes":["1120.0,9.5 128.0×36.0"],"barFit":["none"]}`. The same holds for figma light 1280 and both at 380: 4 failures, nothing outside #2192.
