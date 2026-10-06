## (2026-10-05) — Foreground's on-fill badges: the ✓/✗ is checked, not only the ratio (#2121)

**STATUS: branch `ui/2121-on-fill-mark`.** Tests only: no engine change, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}}, `CONTRACT_VERSION` unchanged. No visible text changes. **Fixes #2121.**

**The gap.** The #1971 Q13(a) arms in `test-smoke.mjs` and `test-chrome.mjs` read each Subtle and Inverse card's badge ratio and compare it with the ratio of the colors drawn. Neither read the ✓/✗ next to it, so a badge showing ✓ on a failing pair passed both.

**What changed.** Both arms now also read `.sg-ratio-mk`. The expected mark comes from the drawn ratio and a minimum typed in the test (`ON_FILL_MIN`), never from the badge's or the resolver's own `min`.

**The minimum is per role, not what the issue said.** #2121 gave the minimum as "4.5, or 7 in HC". That is right for the status texts (`text.brand|danger|success|warning|info`). It is wrong for the Inverse card's `inverse.text.primary`, which the engine holds to 7:1 in Light and Dark and 15:1 in the high-contrast modes. Measured with `resolveAllModes` over every example brand. A literal of 4.5/7 would have expected ✓ wherever the inverse label sits between 7 and 15 in HC, which the badge correctly marks ✗.

**Mutation.** The mark in `onFillRatioBadge` (`preview/sections/kit.ts`) was flipped after a `wip:` commit. It fails both arms by name, smoke and chrome.
