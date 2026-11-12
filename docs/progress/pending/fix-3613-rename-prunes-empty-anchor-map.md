## (2026-11-12) — A brand color rename leaves no empty per-mode anchor map (#3613)

**Status:** Studio only. ENGINE unchanged (no change note: no engine code moved). CONTRACT unchanged.

### What changed

- **`cascadeRename`** (`apps/studio/src/state/palette-input.ts`) drops a stale anchor on the new name before the
  carry (#3545). When that key was a mode's only one and the old name had no anchor there, the rename left
  `modeAnchors.<mode> = {}`. That map is now pruned, as `setAnchor` prunes, and so is a `modeAnchors` the prune
  empties. Only a map the drop emptied is pruned: an empty map the brand already held is left as it was.
- **Impact:** no change in resolution. `resolveAllModes` reads `{}` as an absent map. The fix keeps the stored brand
  the same shape every other write leaves it in.

### Not in this entry

The override drop in the same function can leave `overrides.<mode> = {}` the same way (measured with a throwaway
probe). Filed as #3678 rather than fixed here, since #3613 scopes the anchor map.

### Verification

`apps/studio/test-interactive-input.ts` §11 gains three `#3613 prune` assertions with literal expected shapes: a
partly emptied set of modes, the only mode emptied, and a pre-existing empty map left alone. A `wip:` mutation
reverting the prune failed the first two by name.
