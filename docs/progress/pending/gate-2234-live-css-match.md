## (2026-10-06) — lint:live-css matches rules inside a selector group, so an insert or a reorder is not a "lost" rule (#2234)

**STATUS: branch `gate/2234-live-css-match`.** Gate and its test only: no product, engine or baseline change. ENGINE bump class: **none owed**. `live-css.json` is untouched, so no `--accept` was run. `CONTRACT_VERSION` unchanged. **Fixes #2234.**

### What was wrong

`lint:live-css` (#2201) keyed each rule `<context> » <selector> #<ordinal>` and compared old to new **by key**. The ordinal names a rule but doesn't identify it, so two edits that removed nothing were reported as losses, and each forced a roughly 20-minute `--accept --allow`. Measured with `main`'s gate:
- **A same-selector rule inserted** above `.sg-g3{grid-template-columns:…}`: `✗ live rule lost grid-template-columns: .sg-g3 #1`.
- **The two live `.tpill` rules swapped:** both reported as having lost every property they declare.

### The fix

`compare()` groups rules by (context, selector), the part of the key the sweep decides liveness by. Inside each group it matches old to new by **the largest total property overlap**, then **the most rules matched** (so an old rule emptied to `.sg-g3{}` reads "lost grid-template-columns", not "removed"), then **the smallest ordinal distance** (so an untouched file maps one to one). The assignment is exact up to 8 rules a side (the largest group in `styles.css` is 2) and greedy above that.

`--accept`'s "what would this forget" now uses the same `compare()`, so it doesn't refuse an insert either. The in-memory self-check plants a removal of a whole **group**, since removing one ordinal would leave matching a same-selector sibling. A failure message names the new key when matching moved it.

**Why this can't hide a removal (in the header):** deleting a live property shrinks its group's multiset of property names, so no matching of that group is loss-free, and the loss is reported under the old key. What matching **can** absorb is a property moving between two same-selector rules in the same context. That removes nothing; any cascade change it causes is the gate's stated "effect, not the rule" limit. **The context stays in the group,** because matching across it is #2201's shape-15 case: the 760px `.sg-g3` rule also declares `grid-template-columns`.

### Tests: `apps/studio/test-live-css.mjs`, run by `lint:live-css` after the gate

Each case edits the real `styles.css` text in memory, parses it with the gate's Chromium `parse()`, and compares it with the committed baseline. EXPECTED is literal (keys and property names). Each target is found by its exact text, or the case fails by name. 17 assertions:
- **Unedited:** clean, with 0 unprotected.
- **Insert:** clean, and the inserted rule is the one counted unprotected.
- **Swap:** clean.
- **Deletion of `.sg-g3`'s `grid-template-columns`:** fails, named `.sg-g3 #1 lost grid-template-columns`.
- **The whole `.sg-g3` rule deleted:** fails, named `.sg-g3 #1`.
- **Deletion + insert, and deletion (of `color`) + swap:** both still fail by name. These are the cases a wrong matcher could use to hide a loss.
- **A dead rule (`.faint`) deleted:** not flagged.

**The first run caught my own regression:** an emptied rule read "removed", where the old gate said "lost". That's what added the most-rules-matched criterion.

### Mutations: plausible wrong versions of this fix, each failing the test by name

- **M1, keep matching by ordinal** (the old behavior): `insert` and `swap` fail with the false "lost …".
- **M2, skip a group whose rule count changed** (a lazy fix for the insert): `deletion` (`removed: []`), `deletion + insert`, and the unprotected count fail. It hid real losses.
- **M3, count a property kept if the selector declares it in ANY context** (shape 15): `deletion` and `deletion + insert` fail. The 760px rule hid #2201's own deletion.
- **M4, report a dead rule's removal:** `dead removal` fails (`removed: [".faint #1"]`).

**On disk, through the gate itself:** the insert passes (`1 rule key added … unprotected`), the swap passes, and the deletion fails as `✗ live rule lost grid-template-columns: .sg-g3 #1 — drawn in test:chrome, web light`.

### Not covered (unchanged limits, in the header)

The gate checks property names, not values, and protects only the rules the sweep sees drawn. Both are on record in #2224 and the issue.
