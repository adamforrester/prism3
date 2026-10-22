---
engine: minor
---
Layers follow the naming table (#2759, owner decision Q350). Glyph layers are `<shape>Glyph`:
- Checkbox.Control's `mark` and `dash` become `checkGlyph` and `dashGlyph`.
- Field message's three status glyphs become `errorGlyph`, `warningGlyph` and `successGlyph`.
- Textarea's `grip`, Select's `chevron`, Image placeholder's `marker`, Spinner's `ring` and Tag's `check` take the
  suffix.
- The accordion indicator's four glyphs take the suffix too.

The other layer renames:
- A Row's control cell is `controlCell` (Checkbox and Radio's `controlBox`, Switch's `trackBox`).
- The main text of FieldLabel, Field message, Badge and List item is `label`.
- Two roots are renamed for their role: Divider's `divider` and FieldLabel's `label` become `container`. A root is
  the member itself, not a layer.

`COMPONENT_RENAMES` gains a `part` kind. An in-place update renames each layer before it writes anything else, so the
layer keeps its id and every override made on it in a placed instance. Before this change, a renamed part was
removed and rebuilt.
