## (2026-11-11) — Text, effect and gradient styles carry a rename record, and a renamed style is renamed in place (#1040)

**Status:** engine `patch` (`packages/engine/changes/claude-1040-style-rename-record.md`; no committed artifact
moved). CONTRACT unchanged. `EXECUTOR_REVISION` unchanged: the component executor's files are untouched (the pass
lives in a new file the two callers import, not in `write-styles.ts`).

### What changed

- **The decision, recorded.** `docs/44` §10.1, `Decided (2026-11-11, #1040)` (owner, Q173 A), with §6.4 pointing at
  it and the row in `docs/42` and `schema/decisions-index.json`. It also answers #1040's first question: a record
  IS needed, because layers and library consumers hold a style by id and the writers match by name.
- **The record.** `STYLE_RENAMES` and `STYLE_DELETIONS` in `materialization-renames.ts`, the variable register's
  shapes minus the root (a style name carries no brand namespace). Both ship empty.
- **Check 1.** `lint-materialization-renames.ts` reads the three style files at the merge base and in the tree and
  runs the same whole-set accounting with the style register, in its own report section and with its own floor.
- **Check 2 and the planner.** `test.ts` checks staleness, the reader's floor (represented, not counted), the
  accounting on literal style fixtures, and `planStyleRenames` on one case per status plus a chain and a self-map.
- **Apply.** `apps/plugin/src/rename-styles.ts`, run before the writer by both Apply Theme and the paste steps.
  Only Prism3's own styles are renamed: the mark, else the engine's description signature.

### Verification

- `apps/plugin/test-style-renames.ts` (new, in the plugin `test` script): fixture rules pushed into the live
  register, both real call sites, the new name must carry the old id. Mutations, each committed first and each
  failing here by name: the effect/paint pass dropped from Apply Theme (3 arms), the text pass dropped from it
  (4), each pass dropped from the paste steps (3 and 2), the ownership guard made `true` (1).
- Check 1's mutation: `shadow/xs` renamed to `elevation/xs` in aurora's `shadow-styles.json` fails with
  "UNACCOUNTED STYLE REMOVALS … aurora · shadow-styles :: shadow/xs"; with a matching rule in `STYLE_RENAMES`
  the same diff passes.

### Traps left for the next PR

- **The first real style rule** must also add `STYLE_RENAMES` to `rename-stamp-audit.ts`'s tables. Not done here:
  the audit reads the merge base too, and a base without the table is a CANNOT RUN for every PR.
- **No summary line prints the renames yet.** The outcomes are data (Apply Theme's result, the paste step's
  `renamed`); wording a line is UI copy, held on #1040.
- **Grid styles** keep their writer-local rename (#2467). A future grid rename should join this register.
