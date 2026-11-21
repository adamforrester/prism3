## (2026-11-20) — Three declarations their gates never checked are checked (#1052, #1740, #4305)

One root cause in three gates: a list or an ordering was declared, and the gate that owns it read one
direction or none, so an entry could be wrong and still pass.

- **`verify.ts`: `lint-materialization-renames` runs after `drift`, declared (#1052).** Its comment said
  `after` makes a gate derive, so the ordering was left to array position. `check-ignore` already uses
  `after` for ordering alone, so the premise was wrong. Swapping the two passed `orderViolations`. It now
  declares `after: ['drift']` with a `why`. A self-check swaps the two in the shipped `GATES` and requires
  `` `lint-materialization-renames` must run after `drift` ``. The header now counts four load-bearing
  orderings, not three. Measured: without the `after` (main), the runner exits 1 at start, naming #1052.
- **`lint-paint.ts`: an exception on a key the provenance rule never evaluates is stale (#1740).** The stale
  direction named a key that did not exist, or one that now satisfied the rule. It missed a key the rule
  never reaches (not a color, not led by an axis value, or on an exempt axis), so such an entry sat there
  silently. The rule now records each exception it actually used, and an unused one fails with
  `exempted key is outside the provenance rule`. A self-check plants an exception on such a key, found in
  the defs at run time, and requires that failure. Measured: the issue's mutation (`'tag|focus-ring'` in
  `PROVENANCE_EXCEPTIONS`) is green on main and fails on this branch, naming the key.
- **`lint-decisions-index.ts`: `docs/42`'s table is held to the baseline (#4305).** Arm C parses the table
  from its own cells and matches rows to baseline rows in both directions, as multisets, keyed on doc,
  date and issues. The § must agree wherever the heading carries a numeric prefix; the table may name a
  parent § the heading has none for. The decision column is a reader's summary and is not compared. A
  synthetic self-check covers a deleted row, an extra row and a renamed header. Measured: deleting one
  table row is green on main and fails here with `DOCS/42 ROW MISSING`.

**Drift the new arm found.** The table cited #2818 for the 2026-10-19 "Inverse colors" decision. Its
heading in `docs/45` cites no issue: the decision is the owner's Q423 A, made after #2818's first run.
The row now says `—` and names both in its summary. Keying on § first also flagged 11 rows where the table
names a parent § for a heading with no numeric prefix. Those are routing aids, not drift, so § is compared
only where the heading has one.
