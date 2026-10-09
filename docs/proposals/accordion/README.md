# Accordion: plan renders for the design proposal (#2417)

These are **plan renders, not Figma.** Each image draws the engine's projected plan for the DRAFT
`accordion-item` and `accordion` defs on branch `claude/accordion-proposal`. The plans are drawn as HTML,
with variables resolved from the committed Figma export of each brand (`packages/engine/out/figma/<brand>/`),
the method used for #2388. They approximate: a system font, and the focus ring drawn as an outline.

| File | What it shows |
|---|---|
| `item-states-prism3-light.png`, `-dark`, `item-states-aurora-light.png` | Accordion.Item, medium, chevron: every state, closed and open |
| `item-sizes-indicators-prism3-light.png` | small, medium and large, with the chevron and plus/minus indicators |
| `item-wrap-prism3-light.png` | a long title wrapping, with the indicator held on the first line |
| `group-prism3-light.png`, `-dark`, `group-aurora-light.png` | the Accordion group: the default member, an item opened in place, plus/minus with five items, and small |

Nothing here is approved. Every name, value and default is a draft held for the owner on #2417.
