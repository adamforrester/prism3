## (2026-10-15) — Accordion: the large side padding 24 → 20 (#2726, owner decision Q338 A)

**Status:** one token key moved in `accordion.ts`: `size.large.pad-x` from `space.300` to `space.250`. The header's inline padding and the open panel's inline inset both bind that key, so both move; the accordion's side padding now steps 12 / 16 / 20px. ENGINE minor (change note). CONTRACT unchanged: no token added or removed. No executor code moved, so `EXECUTOR_REVISION` stays at main's number, and no artifact was added, so `EXPECTED_ARTIFACTS` is unchanged.

**Scope, as decided:** small and medium unchanged; Text field and Select keep 24 at large (Q338 A). Q339 A (no change): the panel keeps its own padding, aligned to the header edge.

**What was not moved, and why:** the panel's bottom inset, `size.large.panel-pad-end`, stays `space.300` (24). The decision names side padding only. Until now the bottom inset matched the side padding at every size (12/12, 16/16, 24/24); at large it no longer does (20 side, 24 bottom). That is listed for the owner on the PR rather than changed here.

**Density:** the key follows density like every accordion spacing key, so large is 16 at compact and 24 at spacious (one ladder step each way from 20). `test.ts`'s spacing-model table carries the new numbers.

**Gates:**
- `test.ts` `#2726 accordion side padding (Q338 A)`: the projected plan's header and open panel bind 12/16/20px at both sides per size, read through the comfortable space scale against typed literals, and Text field and Select still read 24 at large.
- `test.ts` spacing model: the accordion row at all three densities.
- `apps/plugin/test-update-apply.ts` `accordion pad-x/…`: an Accordion built with the old large `space/300` side padding is updated through the shim: the dry run reads 8 to update and 16 current, the apply rewrites them in place with every member's and child's key and id kept, the large sides bind `space/250`, and the next dry run reads all 24 current.
- Regenerated: `token-usage` reports and `component-maintainer.json` (the def's notes).
