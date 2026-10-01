## (2026-10-01) — The verdict's count test catches a loosened floor (#1930)

**STATUS: PR open from `ui/verdict-near-floor`.** UI test only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged.

**What was wrong.** `apps/studio/test-verdict-count.ts` pinned the failing count exactly (S1.3's review round), but both of its failing fixtures sit far below their 4.5:1 floor. A verdict that compared leniently, `r.ratio < r.min - 0.5` or even `- 3`, still counted them, so all its assertions passed. The S1.3 fragment's R5 row called its mutation "loosened" when it tightened the floor (174 of 884 fail), so nothing tested the lenient direction.

**The fix.** A third fixture re-points `text.tertiary` at neutral.350 in Light. That lands at about 2.82:1 against a 3:1 floor, under it by less than 0.5. The test first checks that premise against the engine's own resolved record (`resolveAllModes`), never against the verdict module. It then requires the bar to read exactly "1 of 884 below floor, 1 mode". The S1.3 fragment's R5 row now says "tightened".

**Mutation, failing by name:** `r.ratio + 1e-9 < r.min - 0.5` in `apps/studio/src/state/verdict.ts` → `near-floor fixture: the bar reads "1 of 884 below floor, 1 mode" — read "All 884 pairs at or above floor"`.
