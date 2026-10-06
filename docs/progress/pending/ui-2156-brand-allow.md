## (2026-10-05) — Chrome brand rule: BRAND_ALLOW can't gain an entry unnoticed (#2156)

**STATUS: branch `ui/2156-brand-allow`.** Build gate only: no engine change, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}}, `CONTRACT_VERSION` unchanged. No visible text changes. **Fixes #2156.**

**The gap.** #2151's `BRAND_CANARIES` (`apps/studio/chrome/esbuild-plugin.mjs`) test how `brandLeaks` reads `BRAND_ALLOW`, not what `BRAND_ALLOW` holds. A second entry such as `['edge-bar', 'color.border.focus']` passes every canary, since none of them names it, and the build exits 0. Measured: the old plugin with that entry added builds clean.

**What changed.** `esbuild-plugin.mjs` gains `BRAND_ALLOW_IS = [['focus-ring', 'color.border.focus']]`, a literal typed there and never derived from `tokens.mjs`. Before the canaries run, `[brand]` compares `[...BRAND_ALLOW]` with it and fails by name on any difference. Widening the exception now has to change that literal in the same diff, where review sees it. The build header no longer claims the canaries alone hold the exception narrow.

**Mutations.** Each was run after a `wip:` commit, and each failed the build by name:
- a second entry, `['edge-bar', 'color.border.focus']`, gives `[brand] self-check: BRAND_ALLOW (tokens.mjs) is [["focus-ring","color.border.focus"],["edge-bar","color.border.focus"]], not the one exception …`. It is the only error;
- the one entry repointed, `color.border.focus.strong`, gives the same self-check, plus the existing canary and leak errors.

**Trap.** The literal sits in the gate, `esbuild-plugin.mjs`, not next to the subject in `tokens.mjs`. A literal next to the allowlist would be edited with it as one thought; a second file is what makes a widening a visible two-file change.
