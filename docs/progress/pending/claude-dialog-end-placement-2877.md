## (2026-10-21) — Dialog: an end placement, the side sheet (#2877)

**Status:** Dialog def, plugin canvas furniture, tests, baselines. ENGINE minor (change note). CONTRACT unchanged:
no token path moves. No executor change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q483 A (2026-10-20), amending Q303.1:** a side placement for a sign-in or filter panel that slides
  in from the edge, as a value of Dialog's `placement` and not a new component. The wireframe on #2877 set the shape;
  the owner answered its six questions (Q488–Q493, all A):
  - **Q488 A:** the value is `end`, the writing direction's end edge (right in left-to-right, left in right-to-left),
    so a `start` can join it later with no rename.
  - **Q489 A:** one width, 480px, and no size: `excludeCoordinates` drops end's small and large, so 15 + 3 = 18
    members, the three end members after the full ones.
  - **Q490 A:** every corner square (`placement.end.radius-top` / `-bottom` → `radius.none`).
  - **Q491 A:** reduced motion stays instant at every placement. The contract said "a fade only, at
    `motion.duration-reduced.moderate`", but that token is 0ms in every example brand (`theme.ts` zeroes every reduced
    duration above 200ms), so the `motion` codeOnly line and `motion.reduceMotion` now say the panel opens and closes
    at once, with no fade. The motion token is unchanged.
  - **Q492 A:** the existing footers; the equal-width footer is #2880.
  - **Q493 A:** aliases `side-sheet` and `drawer`.
- **Reused, nothing new:** `builtSize` (`widths.end: 480`, `heights.end: 800`, the body growing, as `full` does),
  `radiusEdges`, the per-placement `SCRIM_BACKDROPS` reach (`end: [0, 0, 0, 12]`, the start side only), the motion
  roles and the Button group footer. The end panel pads `space.300`, as a centered panel does.
- The `placement` axis argument in `component-schema.ts` and its `sole` set in `lint-axis-values.ts` carry the fourth
  value. `component-axes.json` and `component-surface.json` accepted through their gates.
  The paint census (`lint-paint.ts --accept`: 3 members, 12 paint assignments added) and the studio's committed
  component catalog (`gen-component-catalog.ts --write`) moved with them; the studio's four-set cost check counts
  Dialog at 18.

### Gates

- `#2877 dialog end: modal` (`test.ts`) reads the def's own contract text against typed clauses: aria-modal, focus
  held and page inert, and the scrim at every placement but full, the end panel included, with no line excepting a
  placement. `#2877 dialog reduced motion` holds Q491 A.
- `scrim/reach`, `scrim/drawn` and `rollout/dialog scrims` (`test-canvas-furniture.ts`): 15 scrims, not 12.
- `published/dialog end additive` (`test-update-apply.ts`): a published 15-member Dialog updated to 18 adds the three
  end members and lists nothing as breaking library consumers.

### Held for the owner's visual QA

The end member's Figma build size (480 × 800), the `100vw − 48px` cap in code and the 768px width below which the docs
recommend full or bottom. The summary line was shortened to fit the 100-character register.
