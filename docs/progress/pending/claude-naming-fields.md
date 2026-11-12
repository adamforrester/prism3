## (2026-11-11) — Field names line up: Code input `x-large`, Slider `message`, Counter `helpText` (#3554 Q-CC2, Q-CC6, Q-CC9)

**STATUS: built, owner decisions 2026-11-11 (every Q-CC at A).** Engine `minor`, ENGINE_VERSION {{ENGINE_VERSION}}.

- **Q-CC2 A.** Code input's and Code input cell's fourth size is `x-large`, not `xlarge`: every other
  off-ladder rung is hyphenated (`x-small`). The binding keys (`size.x-large.*`), the axis register row,
  the size-order ladder in `test.ts` and the plugin's write test move with it.
- **Q-CC6 A.** Slider's Figma boolean `helper` is `message`, and it now has a code prop, `showMessage`,
  as TextField, Select, Textarea, Counter and Code input do. It was Figma-only.
- **Q-CC9 A.** Counter's `message` prop is `helpText`. "Align the types": Counter's and Slider's `label`
  and help text are `string | node`, the fields' type.

### Migration

`COMPONENT_RENAMES` carries two value entries (`code-input` and `code-input-cell`, `size` `xlarge` →
`x-large`) and one property rename (`slider`, `helper` → `message`), so an update renames the members
and the property in place: each member keeps its id and every placed instance keeps its size and
whether its message shows. The code prop renames (`message` → `helpText`) need no entry: the release
notes read them off `components.ai.json` as breaking.
