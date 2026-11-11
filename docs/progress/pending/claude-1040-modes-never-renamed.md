## (2026-11-11) — Modes are never renamed in a built file, and the guide says what a designer does instead (#1040)

**Status:** docs only. ENGINE unchanged (no change note: no code moved). CONTRACT unchanged.

### What changed

- **The decision, recorded.** `docs/44` §9.1, `Decided (2026-11-11, #1040)`: Prism3 never renames a mode in a
  built file, custom modes included (owner, Q172 A). §6.3 and §8's "Mode renames" bullet now point at it, and
  `docs/42` and `schema/decisions-index.json` carry the row.
- **The reason, written down.** `reconcileModes` claims modes by name and renames only a fresh collection's
  single `Mode 1`, so a renamed mode is already added beside the old one. An in-place rename would have to pair
  an old mode with a new name by NAME (which cannot tell a rename from a drop plus an add, and a rule register
  could never see custom modes, which no committed emission carries) or by INDEX (which drifts, because Figma
  has no mode reorder and a shrink leaves stale modes in place). A missed rename is visible and Clean up names
  it; a wrong pairing renders as a design decision. The decision takes the visible failure.
- **The designer steps.** `docs/public/guides/update-a-file-safely.md` gains "When a mode is renamed": run
  Update file with Theme ticked, move each frame onto the new mode, then delete the old mode from Clean up.
  Three citations, two of them fingerprinted with `lint-guide-claims.ts --stamp` after reading the blocks.

### Not in this entry

Styles, the other half of #1040 (Q173 A), are a separate PR: they get a rename record, which is code.
