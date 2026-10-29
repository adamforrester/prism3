---
engine: patch
---
The chrome's glyphs move to Tabler Icons (#3083, Q813 A; the owner picked Tabler), on the plugin and the web studio alike:
every glyph is a Tabler outline icon vendored as path data from @tabler/icons 3.49.0 (`apps/studio/src/shell/icons/`,
with its MIT license), drawn on the 24 grid at a 1.5 stroke, so the rail's 24px icons draw a 1.5px line where they drew
2.25px. The workspace takes no dependency, and the built chrome carries the license. Chrome only: no token, emitted tree
or component surface moves, so CONTRACT is unchanged.
