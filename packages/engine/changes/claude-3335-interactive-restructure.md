---
engine: minor
---
Two new brand inputs for outline and text hover (#3335, the owner's Q3335.3 A and Q3335.5 A). `outlineWash: { hover, pressed }`
sets the wash's opacity brand-wide, as steps of the opacity scale (5, 10, 20, 30 or 40), pressed above hover, selected
following pressed. It replaces the neutral wash's fixed 10/20 (`overlay-neutral`, and `opaque-fill`'s tags, segmented
controls and pagination) and the tinted wash's fixed 20/30 start (`solid-tint`, still stepped per set for the label's
floor and for visibility). `outlineHoverFill.<mode>.sets.<set>` picks one button set's opaque hover and pressed fill;
the mode-wide pick stays every other set's default, and a set the brand does not have is refused by name. Both are
optional and default to what the engine did before, so every brand that sets neither is byte-identical. The lever
manifest gains `outlineWash.hover` and `outlineWash.pressed` (enums, swept by the lever sweep), and the theme schema
both inputs. No token name moves, so CONTRACT is unchanged.
