## (2026-09-30) — UI redesign: the implementation plan for concept v6

**STATUS: PR open from `ui/impl-plan`.** Docs only: `docs/superpowers/ui-redesign/implementation-plan.md`. No product code and no engine change, so no ENGINE bump.

**What it is.** The owner accepted concept v6 (#1879) as the MVP spec. This plan turns it into PRs:
- **P1–P4:** small fixes on today's UI:
  - P1: test hardening, #1829, #1830 and #1831;
  - P2: the repaint end state, #1845 and #1846;
  - P3: #1840;
  - P4: the comment sweep, #1837.
- **S1:** the shell, in four PRs.
- **S2–S10:** the domain slices. The order is Palettes, Brand, Surfaces & fills, Interactive, Type, Shape, Components, Depth & motion, Layout.
- **S11:** the Figma panel.
- **S12:** start screens.
- **S13:** cleanup.

**Decisions it makes:**
- **The repaint end state is store subscribers.** The store already fires a topic from every setter, but nothing subscribes: `subscribe(` appears 0 times in `main.ts`. Repaint tags would need one switch that imports every painter, and subscribers also end the #870 class of orphaned-painter bugs.
- **The chrome token resolver moves into `apps/studio/chrome/`,** and an esbuild plugin generates the chrome variables at bundle time.

**Measured, not estimated:**
- the embedded fonts add 118,216 bytes per bundle (+11.8% studio, +9.4% plugin UI);
- `test:smoke` is 3,371 assertions;
- 146 repaint call sites choose among four functions.

**Owner questions:** D1–D9 in the plan.

**Engine asks:**
- #1852: radius above 6px;
- a neutral 025 panel role;
- the voice of the engine's own notes, which is still engine-voiced after #1858: `theme.ts:2603` has "CONFIRM", and there are 73 `notes.push` sites.
