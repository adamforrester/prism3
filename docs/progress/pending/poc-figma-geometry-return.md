## (2026-11-20) — The Figma geometry script returns its record through the Desktop Bridge (#3408 S6)

**What changed.** On `poc/arm-1`, with no engine change. `figma_execute` returns only an explicit `return`, so the
first live run of `apps/storybook/figma-geometry.js` got `undefined`. The script now returns its IIFE.
`compare-figma-geometry.ts --self-test`, already in `check:build`, fails by name if the `return` is removed.
`figma-geometry.md` records this as settled and keeps the other items open until a live run settles them.
