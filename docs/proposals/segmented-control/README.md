# Segmented control: proposal plan renders (#2418)

**These are plan renders, not Figma.** Each projected plan of the draft defs in
`packages/engine/components/segmented-control.ts` is drawn as HTML by `render.ts`, with variables resolved
from a brand's committed Figma export (`packages/engine/out/figma/<brand>/`), then screenshotted by
`shot.mjs`. They approximate: a system font stands in for the brand font, leading-icon slots are circles,
the focus ring is a CSS outline, and the disabled track edge is drawn by hand (the plan has none).

- `plan-render-prism3.png`: the prism3 brand, light, dark, HC light and HC dark.
- `plan-render-aurora.png`: the aurora brand, the same four modes, to show the def is brand-neutral.

The draft defs are **not registered** in `components/index.ts` and join no gate list. They pass
`validateComponentDef` and project with `figmaAnatomySet`: 30 segment members and 3 control members.
Nothing here is for merge; the proposal and its owner calls are on #2418.

To reproduce, from the repo root:

    npx tsx docs/proposals/segmented-control/render.ts <out-dir> prism3 aurora
    node docs/proposals/segmented-control/shot.mjs <out-dir> prism3 aurora
