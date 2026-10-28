---
engine: minor
---
Brand glass roles (#3073, owner Q806, Q807 A): a new brand-input lever, `glassRoles`, adds glass fills beside the
shipped `color.glass.surface`, named `color.glass.<name>`. Each names one color source, a semantic role's palette color
read per mode (`role: foreground.primary`, the card ground) or one palette color (`palette: neutral.050`, `white`,
`black`), and an alpha from 1 to 99. The engine emits it as a palette alpha step, `<palette>-<step>-alpha.<n>` minted
through the white/black ramps' `alphaLeaf` (only the steps a mode reads), or the existing `white-alpha` / `black-alpha`
step on white or black, so the Figma variable carries the alpha and a bound fill stays translucent. Names are refused
when they are `surface` or not kebab-case; a role source must resolve to an opaque palette step in every mode; an
override aimed at a brand glass role is refused, and a role source follows an override of its role. The reference
brand (its legacy fixture and its redesign seed) adds `card` = the card ground at 70%. Brand-added roles and their
alpha steps are brand-dependent: `color.glass.surface` is unchanged in every brand, and CONTRACT is unchanged.
