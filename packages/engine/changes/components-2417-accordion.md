---
engine: minor
---
Accordion (#2417, owner decisions Q182 and Q183): one expand and collapse section, 24 members (`expansion` ×
`position` × `size` × rest and focus-visible), its header the button, its panel a native Figma slot holding
placeholder text in page ink, a nested Divider under it, and the shared focus ring. Its open and closed glyph is a
building block, `_accordion-indicator` (12 members: `indicator` × `expansion` × `size`), nested in the header with
`indicator` exposed. Two new variant axes, `expansion` and `position`; a def id may lead with `_` for a building
block; `PaddingDef.blockEnd` pads a box's bottom apart from its top; and a new `body` paint slot for text that
belongs to the page rather than to the control around it. A wrapping text under a column now stretches across it (`layoutAlign: STRETCH`) rather than growing
down it, which left the panel's placeholder one line wide and overflowing; no shipped def had that shape before.
