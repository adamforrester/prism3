## (2026-11-11) — Feedback names line up: Banner's `close`, Toast's `successGlyph`, the glyph canon (#3554 Q-CC26, Q-CC27)

**STATUS: built, owner decisions 2026-11-11 (every Q-CC at A).** Engine `minor`, ENGINE_VERSION {{ENGINE_VERSION}}.

- **Q-CC26 A.** Banner's close button is `close`, the part and the Figma boolean, as Toast's and Dialog's are.
  The code prop stays `dismissible`, as on Toast. Banner's own prose calls the control the close button,
  as Toast's does; "dismiss" stays the verb. **Accessible names, confirmed per component and recorded in
  Banner's evolution note:** Banner names the message it dismisses ("Dismiss error message") because
  several banners can share a page; Toast's is "Dismiss", one toast at a time; Dialog's is "Close". None
  changed.
- **Q-CC27 A.** The canon (`SKILL.md` §6) now reads: a glyph picked by an axis is named by the axis value,
  a fixed glyph by its shape. Toast's `checkCircleGlyph`, picked by `intent=success`, is `successGlyph`, as
  Banner's and FieldMessage's are. The canon row drops `dismissGlyph` from its examples: it names a job,
  not a shape. Tag's `dismissGlyph` itself is left as it is; renaming it would be a further call.

### Migration and gates

`COMPONENT_RENAMES` carries Banner's `part` and `property-rename` (`dismiss` → `close`) and Toast's `part`
(`checkCircleGlyph` → `successGlyph`), so an update renames them in place. Two gate literals named the old
parts and moved with them, each failing by name first: `lint-glyph-geometry` (`MUST_COVER` and
`FIXED_GLYPH`, "SCOPE NOT REPRESENTED: 'toast.checkCircleGlyph'") and `lint-hit-target` (Banner's
code-side target).
