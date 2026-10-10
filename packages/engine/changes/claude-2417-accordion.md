---
engine: minor
---
Two new component definitions (#2417, owner decisions Q182 and Q183): `accordion`, one section that opens and
closes in place, and `_accordion-indicator`, its open and closed glyph, a private building block under
Subcomponents. Accordion projects 24 members: `expansion` [collapsed, expanded] × `indicator` (the glyph's
position) [start, end] × `size` [small, medium, large] × state [rest, focus-visible]. It nests the indicator
`nest-exposed`, exposing `style` [chevron, plus-minus] and following `expansion` and `size`, so a style picked on
the nested instance is meant to survive an expansion switch (a live Figma check). It also nests the focus ring
and the Divider, and its content is an instance-swap slot. Schema: `expansion` joins the closed axis names; a def
id may take one leading underscore (Figma's private-component prefix, also in `component-docs.schema.json`);
`PaddingDef.blockEnd` binds the end block side apart from the start; `weightIntent` gains a fixed form,
`{ intent, group }`, which resolves every `type.<group>.*` binding to one intent per brand. Regenerated into
`out/components/accordion.md`, `out/components/_accordion-indicator.md`, `components.ai.json` and
`component-maintainer.json`. No token moves, so CONTRACT is unchanged.
