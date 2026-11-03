---
engine: minor
---
Password field's label row is one label line tall again, 18 / 21 / 24 by size (#3347, Q380 A). In real Figma it measured
26 on every member: the host floors a hugging row at a stretched child's own content height, and the nested small
Button's was its 6px block padding around its 14px "Show" line. The toggle instance's top and bottom padding are now
bound to `space.0` as an instance override (new `PartDef.nestPaddingBlock`, token key `toggle.pad-block`). Button's own
set is unchanged, and "Show" stays centered on the row. Password field binds one more token (`space.0`), and its spec
and docs page list the toggle's padding. The component shim models the measured floor (`stretchFloorsHug`), and
`test:roundtrip` asserts the row's height on all 84 members. No property, variant or token name moves.
