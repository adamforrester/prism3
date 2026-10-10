## (2026-10-10) — Update tests: a record write that fails after the update, record-less icons, and icons in a copy of their file (#2373, #2436)

Test-only. These are three update-path gaps the reviews of #2367 and #2363 found, each now held by an arm in `test-update-apply.ts`. No product code moved, so `EXECUTOR_REVISION` is unchanged.

- **`recordfail/…` (#2373 a).** One icon's host throws on its as-built record write, after the update has written the icon. The order in `finishUpdated` is record first, stamp last (§7), so the icon keeps the stamp it had and its in-progress marker. The next dry run reads it out of date, never current, and the outcome names it among the build's misses: `name=arrow-left.asBuilt -> NOT RECORDED (the host refused the write)`. The refusal is installed by the test, on the shim's node. `recordfail/set member` holds the same failure on a `tag` member, which `finishUpdated` reaches from the set path's own loop.
- **`unrecorded single/…` (#2373 b).** The icons with no as-built record. By default all 44 are updated, named as updated without a record, take the plan's ink, and read current after. Under `noBaseline: 'skip'`, the one record-less icon is left exactly as it is and named ("no as-built record"), and the other 43 are updated.
- **`duplicate single/…` (#2436).** The icons and the spinner, built in two shim files that differ only in `keyPrefix` and `styleIdPrefix`. Each component in the copy takes the original's stamp and record, with its own id. All of them read current, or, under a stamp with no executor revision, all read built by an earlier plugin. None reads as a hand edit. `singleWorld` takes the two prefixes for this.

### Found on the way: the verdict reads no misses (#2477)

`recordfail/named` first asserted that the verdict fails. It doesn't. `applyVerdict` builds its headline from `stopped`, `identity`, `content`, `refused` and the counts, and never reads `SetOutcome.misses`. So the run above reads **`✓ updated 44 in place`**, with arrow-left among the updated, while the next dry run calls it out of date. Saying it means new verdict wording, which is the owner's call, so it is filed as #2477. The arm asserts the node-level facts and the `misses` entry, and its comment names the gap.

### Why `format/duplicate`'s mutations can't reach the single components

v3 hashes an instance's main and a text or effect style by name. The icon and spinner defs build neither, and `premise: <def>: … nothing keyed` asserts it (0 instances, 0 styled text, in the copy). So the issue's mutation, an instance's main hashed by key, fails `format/duplicate` and leaves both `duplicate single/…` arms passing, by design. A def that gains a nested instance or a styled label fails the premise, and the arm then guards it as `format/duplicate` guards `tag`. The mutation these defs can feel is a node's own key hashed.

### Mutations (a `wip:` commit first, each restored with `git checkout -- apps/plugin/src`)

- **The stamp written before the record in `finishUpdated`:**
  - `✗ recordfail/unstamped: … (stamp now 0.236.0|bbb895d3d2fb3763|8, record kept)`;
  - `✗ recordfail/out of date: … ({"members":44,"current":44,"update":0,…})`;
  - `✗ recordfail/set member: … (stamp moved; {"members":45,"current":45,…})`.
- **`noRecordFor` defaulting to `skip`:** `✗ unrecorded single/updated: … (✗ 1 set not updated; 0 updated, 0 unrecorded)` and `unrecorded single/recorded`, plus the existing set arms (`unrecorded/updated`, `unrecorded/all`, `format/earlier …`).
- **`noRecordFor` ignoring the choice:** `✗ unrecorded single/skip: … (44, [], written; …)`, plus `skip/listed`, `skip/untouched` and `unrecorded/skip`.
- **A node's own `key` copied into the snapshot and hashed:** `✗ duplicate single/current: icon: … ({…"handEdited":44…})`, and `duplicate single/earlier`, both for the icon and the spinner, plus `format/duplicate`.
- **An instance's main hashed by key (the issue's):** fails `format/duplicate` only, as described above.

### Traps for whoever re-verifies

- A single component's coordinate in the build's misses is `name=<glyph>` (#2296), not the node's `icon/<glyph>` name. A filter on the node name finds nothing and reads as "not named".
- The in-progress marker holds the JSON list of the parts the update keeps, so an icon with none reads `[]`. "Kept" means it isn't the empty string the finish writes.
