---
engine: minor
---
A brand can set its link underline (#2942, owner decisions Q1–Q6, Q800 and Q801, all A). `typography.underline`
takes `{ thickness, offset }`, each a share of the font size or `auto`. Both default to `auto`. A set value is held to
a whole percent and clamped, not refused: thickness 1–20%, offset 0–50%. A set field emits
`core.font.underline.thickness` or `.offset` (`$type: number`, `$extensions.prism3.figma` a `style-part` with its
PERCENT). Every `-link` text style carries it as `textDecorationThickness` / `textDecorationOffset` PERCENT in
`text-styles.json`, and both Figma write paths (the plugin's Apply Theme and the paste path) write it into every
underlined style, or AUTO when the brand leaves it unset, so a style reused by name never keeps another brand's value.
Plain styles are not touched. The reference brand sets 5% / 25%, in its legacy fixture and its redesign seed brief.
Every other brand's emission is byte-identical. The two paths are brand-dependent, so CONTRACT is unchanged.
