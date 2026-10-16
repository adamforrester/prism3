---
engine: minor
---
Field style lever (#2695, owner decisions Q332 A and Q333, option A on all sixteen calls). A new Form lever,
`fieldStyle`: "Field style", Outline / Underline, default Outline, right after Control shape. Under Underline every
field component (Text field, Password field, Select, Textarea) draws one line under the value: a 1px bottom line
(`border-width.hairline`) in the field's own border roles, 2px (`border-width.thick`) at focus-visible plus the shared
focus ring at `focus.ring.offset` (2px), no inline padding (`space.0`), square corners (`radius.none`) under every
Control shape, no hover wash, no disabled plate (the ink takes `disabled.text` / `disabled.icon`), and Textarea's grip
inset by 2px above the line. Applied to a def before projection by `applyFieldStyle`, like Control shape: every field
keeps its 84 members, and every Outline plan is byte-identical. Engine: `PartDef.strokeEdges` binds the four stroke
sides apart (`strokeTopWeight` … `strokeLeftWeight`), and a `strokeEdges` key may name `{state}`. Both executors' 1px
weight fallback now stands down for a per-side weight too (EXECUTOR_REVISION 29). The fields' codeOnly `style` entry
names both values as brand-set; `variants.style` stays `outline` alone, so no per-instance coordinate is added. No token is added or renamed, so CONTRACT is unchanged.
The plugin executor assigns a translucent bound paint twice, so an in-place Update that moves a fill from an opaque
variable to a wash (Field style Underline → Outline at hover) keeps the wash translucent in one Update (#2774).
