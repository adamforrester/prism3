---
engine: minor
---
Every icon-set glyph inside a component is an instance of its icon component (#2380, owner
decision Q137 A). A vector part whose glyph is in the icon set, in any def but icon itself, projects as a
NESTED_INSTANCE of icon/<glyph> instead of an inline SVG import: field-message's three status glyphs,
checkbox-control's check and dash, switch-control's two thumb glyphs, tag's check and dismiss glyphs, select's
chevron, textarea's resize grip and image-placeholder's marker. Each keeps its size binding (or glyphPx) and
takes its ink as descendantFills; no swap property is added. The spinner's composed glyph and the icon def's
own glyph stay inline. Checkbox's 0.8 inset (#1346) moves from a padded artboard to a new plan field,
glyphInset: the part is a frame bound to the control box holding one instance named glyph, placed at 0.8 of
the frame with SCALE constraints, so the rendered ink is where it was. The padded-artboard path is removed.
Both executors build the inset and size a glyphPx instance; the read-back checks glyphInset against the
parent box. CONTRACT unchanged.
