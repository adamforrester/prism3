## (2026-10-26) — Published libraries: a removed layer listed as breaking, and a checklist line per set (#2831, #2864)

**Status:** plugin dry run (`update-plan.ts`), Update file's checklist line (`checkedSetOf`, `messages.ts`, one line of `main.ts`'s
`checkSets`, the studio adapter and shell), tests. ENGINE minor (change note). CONTRACT unchanged. `EXECUTOR_REVISION` unchanged:
the executor is not touched.

### What changed

- **What #2839 already covered.** `breakingOf` listed drops, layer replacements, property removals and retypes, and a
  rename to a `_` or `.` name, on published sets only (`getPublishStatusAsync`), in the check's section, the headline
  and the confirm. Q394 A's slot-item rule is already enforced by `lint-naming.ts`. This PR adds the case it missed
  and the checklist surface.
- **#2864, a removed layer.** A layer the plan no longer has is a `children` change (`removed — not in the plan`),
  never a `type` replacement, so `breakingOf` did not count it. It now adds a `layer` entry per removed path, with how
  many members lose it. Layers the plan adds under the same parent are named as the likely new name, and the line says
  a declared `part` rename keeps the layer in place. That is the safest available action: the ledger is how a
  rename stays in place (#2759, Q350). A layer moved into an inserted frame is a move (`MOVES`), not a removal, so it
  is not listed. The shim arm is the real case from #2864's reproduction, Tag's `check` → `checkGlyph`: with no ledger
  entry, 15 members are listed. With the shipped entry, nothing is listed. On an unpublished set, nothing is listed.
- **Counted per member the update acts on, not read off `changes`.** The first version summed the `children` removal
  changes, and the shim showed a false positive: a layer a designer added by hand also reads as "removed — not in the
  plan". The update skips that member whole, under every hand-edit choice (§5), so nothing is removed. So the dry run
  now keeps its own uncapped per-path count, `SetPreview.removedLayers`, and leaves out members with a structural hand
  edit. The count is absent when there are none, so a set with no removals keeps its preview hash. The replace arm
  has the same overcount, and it reads a capped list. That is filed as #3025, not fixed here.
- **A private rename, end to end in the shim.** The earlier private arm put a `setRename` on a preview by hand. A
  new arm runs it through a ledger `def` rename to `_tag`, so the set is found under its old name, and the rename is
  listed on a published set but not on an unpublished one.
- **The checklist line.** `CheckedSet.breaks`, one line per published set from `breakingSummary`: each case counted,
  with what breaks and what the update does (a drop is kept and marked deprecated, so consumer instances still
  resolve). The checklist draws it under the set's row. The wording is DRAFT, waiting on the owner's wording pass.
  The mapping moved from `main.ts` into `checkedSetOf`, so `checkSets` changes by one line and the field can be tested,
  which keeps clear of the #3023 lane.
- **Q2831.1, posted on #2831:** whether Update should refuse, untick by default, or ask for an extra confirmation
  when a change breaks consumers in a published file. A (rec), built here: flag only. Nothing reaches a consumer file
  until the library is published in Figma, and Update saves a named version before it writes.

### Verification

Each detector was mutated after a `wip:` commit and failed by name in `test-update-apply.ts`. The new arms: the
`layer` arm, the same-parent lookup, the structural-skip guard, the summary's layer clause, and `checkedSetOf`'s line.
#2839's arms, re-run against the new arms: the publish guard, private, drop, replace, and property removal. The adapter
dropping the field fails `test-write-adapter.ts` by name. The shell drawing the line is asserted in `test:chrome`, which
passes; it was not mutation-run, because that takes a full chrome rebuild and run. `npm run verify` in full.
