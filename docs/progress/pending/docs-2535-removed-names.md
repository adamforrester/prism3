## (2026-10-11) — Comments and docs no longer name code #2533 removed (#2535)

**Status:** comments and docs only. No ENGINE bump: nothing emitted or projected moves.

#2533 (#2487 PR 6) removed `makeWriteHost`, `describeControl` and `tokenPill`, and renamed `semanticInk` to `semanticInkOn`. Prose still named them as current: the plugin README and `prism3-host.d.ts` (`makeWriteHost`), `main.ts` (`describeControl`, `tokenPill` ×3), `modes.ts` and `test.ts` (`semanticInk`). Each now names the code that exists, or says the thing went in #2487 PR 6.

**Beyond the issue's list:** `preview/sections/kit.ts` (3 mentions of `main.ts`'s `tokenPill`), `styles.css` (2), and `docs/26`'s "reuse the component kit" list, which named five helpers of which only `selectEl` still exists. It now points at `selectEl`, the token pills (`tokenPillSpan`, `tokenPillBadged`) and the levers kit. Left as written, because they are history and say so: `docs/24` (a completed plan), the pending fragments, `test-removed-legacy.ts` (which lists removed names on purpose), `docs/26`'s `<wbr>` incident note, and the comments that already say the code "lived" here.
