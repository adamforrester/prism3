---
engine: minor
---
Opaque outline hover fill (#3071, owner Q824 A): a fourth `outlineInteraction` value, `opaque-fill`, gives outline and
text controls an opaque hover and pressed fill, `interactive.<color>.hover-fill.{hover,pressed}` plus `inverse.` twins,
beside the neutral wash. A new lever, `outlineHoverFill`, picks the page step per editable mode
(`{ light: { hover: neutral.050 } }`); pressed defaults to the next step toward the ink. Unnamed modes, the generate-only
modes and every inverse band take the default rule: the neutral step nearest 1.15:1 against the ground, and the next
step for pressed. The control's label and icon (`interactive.<color>.{text,icon}.{hover,pressed}`) are measured on the
fill and clamped along their own ramp as links are (#1510), and each names the fill as its second contracted pair,
so hover and pressed are both gated. `applyOutlineInteraction` binds the fill on Button (outline, and text under
`buttonTextHover: fill`), Icon button (outline, ghost) and Flush icon button; Tag, Segmented control and Pagination
keep the wash. The reference brand (its legacy fixture and its redesign seed) sets hover `neutral.050`, pressed
`neutral.100`. The new roles are brand-dependent: CONTRACT is unchanged, and brands without the method are unchanged.
