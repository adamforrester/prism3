## (2026-10-27) — Update file: an engine update makes a set due only when its drawing would change (#3082 part 1, Q811 A)

**Status:** plugin main thread and shared studio shell. ENGINE patch (change note). CONTRACT unchanged. The executor is
unchanged, so `EXECUTOR_REVISION` stays.

### What changed

- **The ledger records the drawing, not only the version.** Each as-built entry (`apps/plugin/src/as-built-ledger.ts`)
  now carries a print of the plans the set was drawn from (`printOf`): one 64-bit hash of the projection, which decides,
  and per part a 4-hex chunk per facet (size, color, text, effects, layout, contents) plus one for the plans' own
  fields, which only word the reason. Build records it from the plans it hands the executor (`project`); the in-place
  update from each target's plans. The record format stays `v: 1`: a print is an optional field, so an older plugin
  reads the record as before.
- **What is due (`dueOf`).** Same engine and revision: as before (current, or due for its definition). Engine moved,
  revision not: the set's plans are projected now, against the same brand the read uses, and printed; the same print is
  `current`, another is `due` for the engine with what moved (`movedOf`: each part and facet, parts added and dropped,
  the variants). Only those sets are projected (`needsPrint`), a set at a time with the thread handed back between them
  (`fileSets`). An entry with no print reads "Not checked yet" once the engine has moved past it.
- **The reason line** is worded in the panel (`engineWhy`, `state/update-file.ts`), DRAFT: "Engine update: focus ring
  size", "Engine update: label text and color, adds leading icon", three items at most, then how many more. A revision
  move reads "Engine update: Prism3 draws components differently"; a setting stays "Due · its settings changed".
- **The quiet re-record waits for a write.** Chosen over writing at load: the read at load (and each checklist opening)
  is a read, and a read that wrote the file's root plugin data would make opening the plugin an edit of the document, be
  refused on a file the person can only view, and, for the panel's read, record against a brand not yet applied (Q699
  A). So a set current by its print shows as current at once, and `restampQuiet` (`main.ts`) records it under today's
  engine after the next Apply Theme, build or update apply (not after the update's check, which is a read). It records
  against the stored brand only the sets whose plans print as recorded, so it is right after any write. It also gives an
  entry from before this change, under today's engine, its print. Until then each load prints the stale sets again.

### Q811.1 — does an executor revision still make every set due? Built: yes (A)

```text
Q811.1. An EXECUTOR_REVISION move: due, or read by the plan?
   A (built) Every recorded set is due ("Engine update: Prism3 draws components differently"). A plan print cannot
             see the executor: the revision moves exactly when the code that turns a plan into layers moves
             (executor-revision.ts: 7 of 22 pipeline commits changed the executor alone and moved no plan byte), and
             the update's own dry run reads every member stamped under another revision as one to update
             (update-plan.ts, revField !== rev). Calling such a set current would hide a drawing change and disagree
             with the full check and the agent's update-components.
   B         Read a revision move by the plan print, as an engine move. Fewer due sets; misses executor-only
             drawing fixes until the set's plan next moves.
   C (rec)   A revision names the sets it reaches (a declared list beside EXECUTOR_REVISION, lint-enforced), and
             only those are due. Precise, but a new declaration for every executor change: its own PR.
```

The evidence for C: `EXECUTOR_REVISION` rose 36 times between 2026-10-07 and 2026-10-26, about twice a day, so under A
almost every release between two of the owner's rebuilds still marks every set due, now with a reason that says why.
Q811 A's saving lands on releases that move only `ENGINE_VERSION`.

### Gates and mutations

Each mutation was made on a committed tree and failed by name:

| Mutation | Fails |
|---|---|
| `dueOf` calls any engine move due (the pre-Q811 rule) | `test-as-built-ledger.ts`: "q811/same-plan: an engine version bump with an identical plan leaves the set current", "q811/quiet" |
| `dueOf` calls an engine move current whatever the print | `test-as-built-ledger.ts`: "q811/changed-plan: a changed plan makes the set due for the engine, naming what moved", "q811/parts" |
| `dueOf` reads a revision move by the print, as an engine move | `test-as-built-ledger.ts`: "q811/executor: an executor revision bump with an identical plan still makes the set due (Q811.1)" |
| `fileSets` calls `restampQuiet` (a write at load) | `test-build-completed.ts`: "q811/load: the read records nothing; the quiet re-record waits for a write" |
| `restampQuiet` a no-op | `test-build-completed.ts`: "q811/restamp: the next write records the quiet set under today's engine" |
| The update records no print, and `restampQuiet` a no-op | `test-build-completed.ts`: "ledger/print" (either alone is covered by the other) |
| `engineWhy` drops the facets | `test-update-file.ts`: "Q811 A why: an engine update names the part and what moved in it" |

`test-write-adapter.ts` holds the wire reading of `moved`; `test:chrome`'s Update file arm shows the engine reason on
the checklist row.

### Gaps

- Nothing was run in Figma. Projecting every stale set at load is untimed there; in Node all 57 buildable defs project
  in about 0.85 s.
- A set whose definition moved for a lever and for the engine in one release reads as an engine update: the ledger
  holds no brand to tell the two apart.
- The reason names parts by their plan names ("container", "focus ring"), and facets coarsely; it cannot say "now 2px",
  as the ledger keeps hashes, not values. Wording is DRAFT (Q2909.10 A).
