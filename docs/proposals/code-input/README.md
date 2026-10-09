# Code input: proposal renders (#2428)

These are plan renders, not Figma. Each projected plan of the DRAFT def `code-input.draft.ts` is drawn as HTML by
`render.ts`, with variables resolved from the prism3 brand's committed Figma export, then screenshotted.

They approximate:
- the type is a system font;
- the focus ring is drawn as an outline;
- the status glyph in the nested message is not drawn;
- the sample digits and the label and message copy come from the renderer, not the def (the def has no per-cell
  TEXT property yet).

The draft is not registered in `packages/engine/components/index.ts` and joins no gate. A def lands in a PR only
after the owner approves the shape.

    npx tsx docs/proposals/code-input/render.ts <out-dir>
