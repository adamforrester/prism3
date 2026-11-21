---
engine: minor
---
Avatar joins the component catalog (#4110, owner decisions OD-A1 to OD-A8, all A): the picture of a person or an
organization, with a fallback chain from a photo to the initials of the name to a generic glyph. Five sizes, 20, 24,
32, 40 and 64px, two shapes (a circle for a person, a square for a team, an organization or an app), and a 30-member
Figma set over `size`, `shape` and `type`. An optional presence dot nests Badge at `type=dot` in a ring of page color,
pinned to the bottom corner outside the clipping mask. `icon.size.2xl` (64px) joins the icon ladder for the x-large
size, `CONTRACT_VERSION` 15.2.0 → 15.3.0. The icon set gains two glyphs, `person` and `organization`.
A box part can now take the corner pin (`corner`) a glyph already could. Badge, Icon, Tag and ImagePlaceholder name
Avatar in their relations.
