---
engine: minor
---
Feedback names line up (#3554, owner decisions 2026-11-11). Banner's close button is `close`, part and Figma property, as on Toast and Dialog; the code prop stays `dismissible`, and each component keeps its own accessible name (Q-CC26 A). A glyph picked by an axis is named by the axis value and a fixed glyph by its shape, so Toast's success glyph is `successGlyph`, as Banner's and FieldMessage's are (Q-CC27 A). `COMPONENT_RENAMES` renames the parts and the property in place, so placed instances keep them.
