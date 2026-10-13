## (2026-10-12) — Canvas labels: the value goes into the `_Label`'s text layer whatever the file calls it (#2558)

**Status:** plugin only (`apps/plugin/src/canvas-furniture.ts` and its test). No engine bump, CONTRACT unchanged,
`EXECUTOR_REVISION` unchanged (`lint-executor-revision` names write-components, write-styles and provenance as the
executor; this file is not among them).

**What broke.** On a live build, every canvas label kept its "Label" placeholder. That file's `_Label` names its
text layer `Text`, and the lookup asked for a TEXT layer named exactly `text`. The verdict did say so, through
`fontMisses`, but the build still shipped every label unwritten.

**The rule now** (`labelTextLayer`): the layer named `text` exactly, then `text` in any case, then the instance's
only TEXT layer. Two or more TEXT layers with none named `text` is a miss, never a guess. The sentence is
`_Label has 2 text layers and none named "text"`, and with none at all it is `_Label has no text layer`. The search
walks the instance's descendants itself instead of relying on `findOne`, so the fallback can count them.

**The same fragility, also fixed:** the `_Label` member was picked by its exact Figma name
(`Text=Top, surface=default`). It now falls back to the same properties in any case and any order (`labelMember`),
so a file's own `_Label` spelled `Surface=Default` or listing `surface` first still matches. A Bottom or inverse
member never stands in for Top or Left.

**Looked at and left alone:** the template pick (`pick`) already falls back to any case through `isTemplateSet`;
file setup's `has` check uses the same rule; `gridMembers` parses the set's own members, which the build named;
`bindBackdrop` matches a variable name, not a layer.

**Not decided here:** the issue's other option, renaming the file's `_Label` layer, is not needed after this. The
plugin-built `_Label` still names its layer `text`.

Mutations, from a `wip:` commit and restored with `git reset --hard`:
- exact-name lookup back → `label text/Text`, `label text/TEXT`, `label text/another name`;
- the lone-layer fallback guessing among several → `label text/ambiguous`;
- the case-insensitive step dropped → `label text/prefers the named layer`;
- the variant matched by exact name only → `label text/variant spelling`;
- a miss dropped silently → `label text/no layer`, `label text/ambiguous`.
