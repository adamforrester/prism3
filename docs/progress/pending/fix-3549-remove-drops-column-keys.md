## (2026-11-12) — Removing a brand color drops its interactive column's anchor and override keys (#3549)

**Status:** Studio only. ENGINE unchanged (no change note: no engine code moved). CONTRACT unchanged.

### What changed

- **`cascadeRemove`** (`apps/studio/src/state/palette-input.ts`) now drops the keys that named the removed palette's
  unnamed interactive column: `modeAnchors[mode][<removed>]` and the `interactive.<removed>.…` /
  `inverse.interactive.<removed>.…` overrides, in every mode, custom modes included. Before, only the column went.
  The engine ignored the leftovers until a column took the name again (a rename onto it, or a new color of that
  name), and then a value the user had removed came back without a word.
- **Same guard as `cascadeRename` (#3545):** when another column carries the removed name as its explicit `name`,
  the keys name that column, so nothing is dropped. The test holds this with a palette named like a live column.
- **Pruning:** a mode map the drop empties is pruned, and so is an emptied `modeAnchors` / `overrides`, the way
  `setAnchor` and `setRoleOverride` prune. An empty map the brand already held is left alone: not this removal's.
- **`removalEffects`:** an override keyed by the removed column no longer appears in the "won't build" line, because
  the cascade now drops it. That line is a claim about what Confirm does, so it had to follow the cascade.

### Held for the owner

The issue asks that the lost keys be said in the confirm. That is copy, the owner's wording, so no line was added:
the confirm still reads "Its interactive color column is removed." The question is whether that line should also
name the anchor and overrides that go with the column, and in what words.

### Verification

`apps/studio/test-interactive-input.ts` §13 holds the issue's repro against the engine's own `resolveAllModes`: the
drop, the other columns' keys untouched, the issue's rename onto the removed name, a new color of the removed name
resolving to Auto in Dark, Light and a custom mode, the guard, and the confirm. A `wip:` mutation reverting the
`cascadeRemove` drop failed §13 by name.
