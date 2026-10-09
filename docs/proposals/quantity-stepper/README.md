# Quantity stepper — proposal renders (#2427)

DRAFT, for the owner's review on #2427. Not for merge.

These are **plan renders, not Figma.** `render.ts` takes the anatomy plans the engine projects for the draft def
(`packages/engine/components/quantity-stepper.ts`, unregistered), resolves each bound variable against the neutral
`prism3` brand in light mode, draws each plan as HTML flexbox, and screenshots it.

- `sheet-outline.png` — appearance=outline, size × value × state (27 members)
- `sheet-ghost.png` — appearance=ghost, size × value × state (27 members)
- `sheet-context.png` — the ghost and outline steppers against a content edge, and the limit message

Regenerate: `npx tsx docs/proposals/quantity-stepper/render.ts` (set `CHROMIUM_PATH` if Playwright cannot find a browser).
