## (2026-10-10) — Update apply: a set with nothing to write reads as its dry run read it (#2495, owner Q205 A)

Take a set whose members are all current but one that Prism3 didn't build, sitting on a planned coordinate (one Adopt could claim). The dry run reads it as "no changes", never up to date (Q191 2B): `button: no changes (576 members). 1 not built by Prism3, left as they are. Adopt can claim it.`, headline `✓ No changes found`. The confirmed apply returned at its nothing-to-write check, and its verdict fell through to `✓ already up to date` / `button: already up to date.` The two surfaces disagreed, and the apply dropped the "not built by Prism3" count.

- **The fix (owner Q205 A, no new strings).** For a set the apply entered with nothing to write, the outcome carries the dry run's own set line (`previewLine`) and whether the dry run called the set up to date (`setUpToDate`, the dry run's `upToDate`, now exported). The verdict then uses that line and the `✓ No changes found` headline whenever the dry run didn't call the set up to date.
- **A set that is truly up to date still reads `✓ already up to date`** / `<set>: already up to date.` on the apply.
- **Tests (`test-canvas-furniture.ts`, on #2471's `unbuilt/…` Button):**
  - `unbuilt/apply as previewed`: the apply's headline and set line equal the dry run's.
  - `unbuilt/up to date`: with the member Prism3's again, the dry run reads `up to date` and the apply `already up to date`.
  - `unbuilt/verdict` now reads the dry run's words too.
- **Mutation, the old fall-through restored (line and headline):** `✗ unbuilt/apply as previewed: the apply's headline and set line are the dry run's (✓ already up to date | button: already up to date. — the dry run: ✓ No changes found | button: no changes (576 members). 1 not built by Prism3, left as they are. Adopt can claim it.)`
