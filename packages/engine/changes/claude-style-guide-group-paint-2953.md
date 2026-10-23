---
engine: patch
---
Style guide paints every group frame it draws (#2953, the owner's reference file): a fill bound to the file's
color/foreground/primary, a 1px inside stroke bound to color/border/secondary (each found by role name below the root,
as the usage panel finds its own) and a corner radius of 2. Every run paints a Prism3 group that still has no fill and
no stroke, so groups drawn before this are painted too. A group with any fill or stroke a designer set is never
repainted, an adopted hand-made group is never painted, and a standalone guide (Effect styles) stays unstyled. A file
missing either role leaves groups bare and the run names the missing role. Plugin behavior only: no committed artifact,
token or projected component surface moves, so CONTRACT is unchanged.
