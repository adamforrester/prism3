## (2026-10-15) — Per-instance overrides on a nested instance: a text and a swap (#2645)

**Status:** engine schema + projection, both executors, the component read-back, the plugin shim, List. ENGINE minor
(change note). `EXECUTOR_REVISION` 25 → 26 (Dialog, #2652, took 23, Password field, #2648, took 24 and the prototype
reactions fix, #2703, took 25 before this merged; git merged the two identical `25` lines without a conflict,
which is the #2551 shape `lint-executor-revision.ts` checks against main's current number). CONTRACT unchanged: no token path moves.

### What changed

- **`PartDef.overrides`** on a `nest` or `absolute` part that is `nest-fixed` or `nest-exposed`:
  `{ texts?: { <nested texts key>: string }, swaps?: { <nested swaps key>: <icon glyph> } }`. The validator refuses it
  on any other kind or relation, and refuses an empty map or value. The projection (`nestOverridesOf`) resolves each
  key against the nested def in the registry, to the Figma property name the nested set declares (`figmaName`, else
  the key), and each glyph to `icon/<glyph>`; an unknown key or an undrawn glyph throws. Plans carry
  `nestOverrides: [{ property, type: 'TEXT' | 'INSTANCE_SWAP', value }]`, only where declared, so every other plan
  is byte-identical.
- **One writer, two executors.** `applyNestOverrides` finds the ONE key on the instance's `componentProperties` whose
  name before `#` and type match, resolves a swap's component name to its node id, writes `setProperties` per
  override and reads each back. None or two keys, an unresolvable component, a refusal and a discard are named misses.
  The plugin calls it; the paste payload ships its source, spliced in only when a plan carries overrides (the shell
  budget), so every other payload is byte-identical. Written during the build, unlike `isExposedInstance`:
  `setProperties` needs no containing component.
- **Update path.** The in-place branch writes the same call on the instance it keeps. An existing file whose nested
  instance has no override yet: the plan stamp moves, the dry run lists `nestOverrides` as a change on that part (no
  replacement), and Update writes it in place, every member and nested instance keeping its key and id. An override
  the designer typed by hand reads as a hand edit (the as-built record already hashes an instance's
  `componentProperties`) and is kept, as every hand edit is. A value the instance already holds is not written again.
- **Dependencies.** `build-deps.ts` counts a swap override's component as a target, so the icon set is built first.
- **Read-back.** `anatomy-readback.ts` gains `nestOverrides`, read off the instance's own `componentProperties`; a swap
  is named through a new `componentById` port (the host's catalog: `hostPorts` searches components on first use; the
  round-trip asks the host's `getNodeByIdAsync`).
- **The shim models the override API.** An instance's `componentProperties` are its main's definitions (a live
  member's set, or `componentProps` for a catalog name) at the value it was given or the default; `setProperties`
  refuses a key that is not a definition's full `#id` key, a VARIANT or SLOT key, a value of the wrong type, and a swap
  value that is no component id. Component ids are now one per component, stable across searches (they were the
  search's own counter, so two components could share one, which a swap value cannot survive). Set ids moved to `74:`.
  The engine's payload stub got the same model for the paste and parity arms.
- **List** (the one def on main with a decided value): items 2 to 8 override List.Item's `value` text ("number") to
  "2." to "8.". The two "neither executor writes" notes are gone, and List's Figma numbering note says the built items
  read "1." to "8.".

### Verification

- `test-roundtrip`: a plan with overrides is built with its nested sets first (`liveRoot` + `prebuildDependencies`), so
  each instance has the properties its set really declared; List (63 TEXT overrides) and a test-only List whose first
  item swaps its icon to `check` (9 INSTANCE_SWAP overrides) read back with 0 divergences.
- `test-update-apply` `overrides/…`: a List built from plans with the overrides stripped, one item hand-typed "2)";
  the dry run lists the change on items 2 to 8 and replaces nothing, Update writes "1." to "8." in place keeping every
  id and the hand edit, and the next dry run reads the other 8 members current.
- `test.ts` `#2645 …`: validator refusals, the projected plan (literals), projection refusals, the payload shipped
  only when needed, the payload's writes and its swap id, and plugin/payload miss parity.

### Dialog (#2652) and Password field (#2648), both merged before this PR

- **Not applied here** (filed as #2671): this PR's merge of `main` keeps both mechanisms side by side and moves no
  Dialog or Password field output.
- **Dialog:** `close` → `overrides: { swaps: { icon: 'close' } }` (IconButton.Neutral's `swap icon`); `cancelInline`
  and `cancelStacked` → `overrides: { texts: { label: 'Cancel' } }`; `confirmInline` and `confirmStacked` →
  `overrides: { texts: { label: 'Save' } }` (Q303.13's placeholder copy).
- **Password field:** #2648 landed its own text-only `nestTexts` (schema field, plan field, a branch in each
  executor, a `nestTexts` read-back predicate, a `compTexts` payload-stub model). The toggle's
  `nestTexts: { label: 'Show' }` becomes `overrides: { texts: { label: 'Show' } }`, and `nestTexts` with its rule,
  branches, predicate and stub model goes, leaving one mechanism. That is #2671's work.

### Traps

- **A named inner function breaks the shipped source.** The bundler wraps it in `__name(...)`, which does not exist in
  the paste payload; the first payload run threw `__name is not defined`. `applyNestOverrides` reads inline instead.
- **A catalog name answers before the live set.** With `liveRoot`, a `comps` entry named like a def resolves as a bare
  component first, with no properties. The round-trip's override rows therefore pass only the FPO swap target as a
  catalog name.

**Review round.** The test-only swap row first swapped to `check`, which is already List.Item's `swapDefault`. The writer skips a value the instance already holds, so the plugin executor's swap write never ran and the read-back passed on the default — an expected value equal to the subject's starting state (docs/34). It now swaps to `close`, and a premise line fails if the row's glyph ever equals the default again. The "two same-named keys is a miss" guard had no test; `test.ts` now drives the shared writer with a hand-built instance holding two TEXT properties named `number`.

**Combined re-gate with #2703 (cloud lane).** One mutation outside the author's table removed the writer's
per-override read-back, so a write the host accepts and does not keep went unreported. It passed every gate,
because no host in any test discards an override. `test.ts` now drives `applyNestOverrides` over a hand-built
instance whose `setProperties` keeps nothing, and the same mutation fails `#2645 discarded write` by name.
