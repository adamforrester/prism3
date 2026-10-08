## (2026-10-07) — Update dry run: a member duplicated in Figma, or with a malformed stamp, is not Prism3's (#2300)

Settles #2300 before #2265 PR 2 applies anything. Found in review of #2299: any non-empty stamp counted as Prism3's.

- **Figma's Duplicate copies a member's shared plugin data**, stamp and record included. So a designer's copy, renamed off the plan, read as a Prism3 drop, and an update would have marked it deprecated. That's the harm #2283 prevents for hand-made members, reached another way.
- **The as-built record now names the node it was written on** (`BASELINE_V` 1 → 2). A copy's record names its original. One step in the dry run, `ownedView`, reads a member as not built by Prism3 when its record names another member of the set, or when its stamp does not have Prism3's shape (engine, a 16-hex plan stamp or `adopted`, an optional revision). The capture and Adopt read through the same step. A copy is then a designer's member like any other: skipped, listed, and adoptable.

### Diagnosis worth keeping

- **"Names another member", never "the id differs".** The host has been measured reassigning member ids after set-level operations (#1473, #1516). A genuine member whose id moved names a node that is no longer in the set, and it must stay Prism3's. `copy/reassigned` holds this, and fails if any differing id reads as a copy.

### Traps for whoever re-verifies

- **v1 records read as no record.** The NB master's records, captured after #2278, go back to "no as-built record" until `capture-baseline` runs again. It has to run there after #2295 anyway, so one run covers both.
- **A copy of a member with no record can't be told from its original.** There is no record to name a node. Capture closes that for every planned member. A dropped member is never captured, so a copy of one still reads as Prism3's.
- **#2265 PR 2 writes records in its own merge path** (kept hand edits keep their old hash). It must carry the node id too, or every member it updates would lose its id.
