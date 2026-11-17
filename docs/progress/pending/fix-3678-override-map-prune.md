## (2026-11-17) — A brand color rename leaves no empty per-mode override map (#3678)

**Status:** Studio only. ENGINE unchanged (no change note: no engine code moved). CONTRACT unchanged.

### What changed

- **The column row for overrides** (`apps/studio/src/state/name-refs.ts`, `overrides.<mode>.(inverse.)interactive.<column>.*`)
  drops a stale override on the new column name before the carry (#3545). When that key was a mode's only one, the
  rename left `overrides.<mode> = {}`. That map is now pruned, as `setRoleOverride` prunes, and so is an `overrides`
  the prune empties. Only a map the drop emptied is pruned: an empty map the brand already held is left as it was.
  This is the same rule #3613 gave the anchor row, applied to its neighbor.
- **Impact:** no change in resolution. The engine reads `{}` as an absent map. The fix keeps the stored brand in the
  shape every other write leaves it in.

### Verification

`apps/studio/test-interactive-input.ts` §11 gains three `#3678 prune` assertions with literal expected shapes: Dark
emptied while promo keeps a primary override (an inverse stale key is dropped there too), the only mode emptied, and a
pre-existing empty map left alone. On `main` the first two fail (`{"dark":{}}`). A `wip:` mutation that disables the
prune fails the same two by name.
