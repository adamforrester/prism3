## (2026-11-17) — The agent paste path sees `core` variables outside the palette slice (#3857)

**What.** The paste payload (`materialise-to-figma.ts`) narrowed `core` the way the plugin's `upsertCollection` did
before #1109, so the two write paths disagreed on the same file (#1024):
- **The `migrate` pass's index** filtered on `coreGroupOf(v.name) === owns`. An un-rooted pre-#1097 `palette/x` is in
  no group as spelled, so the paste never renamed it; the next pass created `<root>/core/palette/x` beside it. It now
  filters on `sliceGroupOf`, the plugin's rule: the group of the name the materialization rules carry it to.
- **The `verify` pass's orphan report** covered only the palette slice and `color`. It now carries a third entry,
  `core/other`: the `core` variables in no slice a plan writes (palette, dimension, font), the set the plugin's
  `unownedCore` reports. Its palette entry reads membership through `sliceGroupOf` too.

**One definition.** `sliceGroupOf` moves from `write-figma.ts` into `rename-map.ts` and joins `plannerSources`, so the
paste payload ships the same function the plugin calls. The group reader is a parameter, because a shipped function
may call only what it ships. `verify` now carries the rename runtime (~29KB, under the 42KB chunk budget) and takes
the dimension and font slices' planned names as a third argument.

**Label.** `core/other` is the plugin's label, still DRAFT under #1109's owner decision. The paste follows whatever
that decision picks; nothing here chooses it.

**Measured.** `apps/plugin/test-rename-parity.ts` seeds an un-rooted `palette/black` and two `core` variables in no
slice (`nbds/core/legacy/accent`, `nbds/core/other/x`) into both files. On main five arms fail: the paste leaves
`palette/black` unmoved, the two paths' names differ, and the paste's verify has no `core/other` entry. Mutations, each
failing by name: the `migrate` filter back to `coreGroupOf` (the move and palette-orphan arms); the `core/other` entry
dropped (`#3857 both paths report …`); `sliceGroupOf` ignoring the rules (the move arms on both paths).
