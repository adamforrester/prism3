## (2026-10-21) — Link: a current state for navigation, a 2px bar (#2872)

**Status:** Link def, a new box placement (`PartDef.foot`) in the schema, the projector and both executors, tests,
baselines. ENGINE minor (change note). CONTRACT unchanged: no token is added or renamed. `EXECUTOR_REVISION` 34 → 35.

### What changed

- **Owner decisions Q507 (2026-10-21), on the Q480 A wireframe:** a navigation row marks the page the user is on.
  - **1 C:** a 2px bar (`border-width.thick`) at the foot of the line box, in `color.icon.link.*` stepped by state.
  - **2 A:** the runtime `selection` axis on standalone links only; inline links stay out through
    `excludeCoordinates`. Link goes from 96 to 144 members.
  - **3 A:** the values are Tab's and Tag's, `unselected | selected`; the code prop is `current`, rendering
    `aria-current="page"`. `lint-axis-values.ts` adds Link to that register entry, and `test.ts`'s `#2752` BRIDGE maps
    `current` to the axis.
  - **4:** hover on a current link changes the color only. The label's type key now names `{selection}`, and a current
    link stays on the plain body style at every state, so no 1px underline joins the bar. It stays a real link in code.
- **`unselected` first, on purpose:** the plugin's Update gives existing members an added axis at the first plan's
  value (`update-plan.ts` §2), so a published Link's 96 members become `selection=unselected` in place. Selected
  first, the 48 inline members would land on an excluded coordinate and be dropped.
- **The bar is a filled box, not a stroke.** The first build drew it as the container's bottom stroke (`strokeEdges`,
  #2695's mechanism). `lint-paint.ts` arm 5 refused it: a stroke never binds an ink role (Q346), and the link icon role
  is scoped to fills only, so Figma's stroke picker would not offer it. Tab's border role is not the link color in
  every brand and mode, so swapping the role would have changed Q507.1's look. So the bar is Tab's construction, a
  filled frame, present on current members only (`presentWhen`), so the 96 existing members gain no layer.
- **`PartDef.foot`, a fourth out-of-flow placement** beside the ring's inset, the overlay's center and the corner pin:
  a box lifted out of the flow and pinned across its parent's bottom edge at its own bound height, constrained
  `STRETCH`/`MAX`, so it moves no box. Projected as `FigmaNodePlan.footPin`; both executors lift it before the focus
  ring's pass and size it after (placed before, a focus-visible member's bar ran 8px past the link); the paste executor
  splices it only for a payload that carries one (#1798). `resize` writes both dimensions, so the bound height is
  bound again after it. Read back as ABSOLUTE with `STRETCH`/`MAX`.
- **Measured:** the bar clears 3:1 on its ground in all 16 brand × mode cells at every state and on both surfaces,
  lowest 4.26:1 (aurora light, inverse surface). The hover step on a current link (hover ink against rest ink, text
  and icon, both surfaces) is 1.33:1 to 1.50:1, under 3:1, which Q507.4 accepts: the bar is the cue.
- Accepted through their gates: `component-axes.json`, `component-surface.json`, `paint-census.json`; the studio's
  component catalog regenerated; `test-reactions.ts` counts Link at [144, 72, 108].

### Gates

- `#2872 link shape`, `#2872 link bar`, `#2872 link hover on current`, `#2872 link bar contrast` and the reported
  `#2872 link hover step on current` (`test.ts`), with `#2580 link/…` and `#2715 link …` moved to 144.
- `link bar foot` and `link bar footprint` (`test-write-components.ts`): the bar through the real executor.
- `published/link current additive` and `published/link current in place` (`test-update-apply.ts`): a published 96-member
  Link updated to 144 adds the 48 current members, drops and replaces nothing, lists nothing in `breakingOf`, and keeps
  every existing member's node id and key.
