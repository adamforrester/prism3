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
  (`fileSets`). An entry with no print (one from before this change) reads `due` for the engine with nothing named once
  the engine has moved past it, so the next update records it with its print (below).
- **An entry from before this change heals in one update** (review finding 1). Built: keep it `due` for the engine,
  the pre-Q811 behavior, with no `moved` list and its own line, DRAFT: "Engine update: recorded before Prism3 noted what
  it drew". A due set is ticked, the apply acts on it whether or not a member changes, and records it with its print.
  The review's first proposal, recording from the apply the unrecorded sets its scoped check read up to date, was not
  built: those sets are outside the apply's `defs`, so its hash guard (the file moved since the check) does not cover
  them and it would record from a check it did not re-verify; and when the check finds nothing to change, as after a
  patch that moves no plan, there is no apply at all, so nothing would record them. Reading them "Not checked yet" was
  also untrue: they were recorded.
- **The reason line** is worded in the panel (`engineWhy`, `state/update-file.ts`), DRAFT: "Engine update: focus ring
  size", "Engine update: label text and color, adds leading icon", three items at most, then how many more. A revision
  move reads "Engine update: Prism3 draws components differently"; a setting stays "Due · its settings changed".
- **The quiet re-record waits for a write.** Chosen over writing at load: the read at load (and each checklist opening)
  is a read, and a read that wrote the file's root plugin data would make opening the plugin an edit of the document, be
  refused on a file the person can only view, and, for the panel's read, record against a brand not yet applied (Q699
  A). So a set current by its print shows as current at once, and `restampQuiet` (`main.ts`) records it under today's
  engine after the next Apply Theme, build or update apply (not after the update's check, which is a read). It records
  against the stored brand only the sets whose plans print as recorded, so it is right after any write. It also gives an
  entry from before this change, under today's engine, its print (`q811/migrate`). Until then each load prints the stale sets again.

### Q811.1 — does an executor revision still make every set due? Decided: yes (A)

**Decided A (owner, 2026-10-27, Q820 A); C filed as #3101.** An `EXECUTOR_REVISION` change keeps every recorded set
due, as built. The follow-up, #3101, records which sets each executor change reaches, so only those come up.

```text
Q811.1. An EXECUTOR_REVISION move: due, or read by the plan?
   A (owner) Every recorded set is due ("Engine update: Prism3 draws components differently"). A plan print cannot
             see the executor: the revision moves exactly when the code that turns a plan into layers moves
             (executor-revision.ts: 7 of 22 pipeline commits changed the executor alone and moved no plan byte), and
             the update's own dry run reads every member stamped under another revision as one to update
             (update-plan.ts, revField !== rev). Calling such a set current would hide a drawing change and disagree
             with the full check and the agent's update-components.
   B         Read a revision move by the plan print, as an engine move. Fewer due sets; misses executor-only
             drawing fixes until the set's plan next moves.
   C (#3101) A revision names the sets it reaches (a declared list beside EXECUTOR_REVISION, lint-enforced), and
             only those are due. Precise, but a new declaration for every executor change: its own PR.
```

The evidence for C: `EXECUTOR_REVISION` rose 36 times between 2026-10-07 and 2026-10-26, about twice a day, so under A
almost every release between two of the owner's rebuilds still marks every set due, now with a reason that says why.
Q811 A's saving lands on releases that move only `ENGINE_VERSION`.

### Integration with #3096 (the live badge) and #3111 (open loads no page)

Both landed on main first, in the agreed order, and #3096's entry recorded what this PR owes them.

- **`fileDue` prints** (#3096's recount): `needsPrint`, the prints a set at a time, then `dueOf(…, print)`, against
  the panel's brand, as `fileSets` does. Without it, `print` defaults to `() => null` and an engine-moved printed set
  reads `unrecorded`: the badge would not count a set the checklist lists as Due. Git merges `main.ts` clean there and
  the plugin typechecks either way, so the arm below is the only thing that holds it.
- **`ledgerSets` prints too** (#3111's answer at open), against the stored brand, as the full read after it does.
  Chosen over leaving it print-less: a print projects plans in memory and loads no page, so open stays page-load-free
  (`test-open-large-file.ts`: 12 of the stand-in's entries are recorded with a print under an older engine, so
  `open/ready` reaches the print path, and `open/printed` holds that they read current from it); without one, every printed set under a moved engine reads
  `unrecorded` ("not checked yet") at open and the first answer disagrees with the full read on what is due. On a large
  file the full read waits on every page (about 20 s on the 60-page reference master), so the ledger's answer is the
  only correct one the panel has for that long. The cost is time to that first answer, measured below.
- **Prints are memoized across reads** (`printMemo`, `main.ts`), by the materialized def's JSON, the same identity the
  ledger's `def` hash uses: a set's plans are a function of that def, and the engine's code is fixed for the session.
  So the ledger's answer, the full read and each recount project a stale set once per distinct brand, not once each.
  Bounded at 256 prints. `printYielding` hands the thread back only after a projection: a yield per memoized set made
  each recount wait on 56 timers (about 105 ms median before, 29 ms after).

Measured in Node, not asserted: 56 buildable sets present, every entry printed under an older engine, the example brand
stored, the panel one lever apart (`density: compact`), 70 pages at no load cost:

| Read | Before (no print) | With prints |
|---|---|---|
| Ledger answer at open (0 pages loaded) | about 10 ms | 1.0 s: 56 sets projected, about 16 ms each, yielding between |
| Full read's due step after it | | 6 ms: every print memoized |
| First recount, the panel one lever apart | 11.8 ms median (#3096) | 0.93 s: the 56 sets the lever moves project again |
| Each recount after that, same brand (50 runs) | | median 28.8 ms, p90 38.7 ms, max 45 ms |
| Recount with the panel on the stored brand, after open | | 20.7 ms |
| First recount with no read before it (cold memo) | | 1.1 s; then 31 ms median |

So the first recount after an engine move projects every stale set the panel's brand moves, once; the memo then holds
(`q810/memo`). The badge's 250 ms debounce is unchanged.

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
| Review finding 1: `dueOf` reads a print-less entry under a moved engine `unrecorded` | `test-as-built-ledger.ts`: "old entry: an entry with no print, once the engine has moved past it, reads due for the engine …"; `test-build-completed.ts`: "q811/unprinted: a print-less entry under an older engine reads due for the engine" |
| Review M5: the deciding hash drops `paints` | `test-as-built-ledger.ts`: "q811/facet color: a plan that moved only in container's paints makes the set due for the engine, naming color" |
| Review M6: `fileSets` prints against the stored brand (`printNow()`) | `test-build-completed.ts`: "q811/panel brand: under an engine move, a lever changed in the panel and not yet applied makes the set due …" |
| `dueWhy` words a missing list as an empty one | `test-update-file.ts`: "#3090 finding 1 why: an engine update over a set recorded with no print says so …" |
| The adapter invents an empty `moved` list | `test-write-adapter.ts`: "file-sets with an engine due reading and no moved list keeps the set due with none" |
| `restampQuiet`'s stale filter loses `!ledger[id].print` (review's nit) | `test-build-completed.ts`: "q811/migrate: the next write gives a print-less entry under today's engine its print" |
| `fileDue` calls `dueOf` without `printNow(input)` (#3096 into #3090) | `test-build-completed.ts`: "q810/engine: under an older engine, a printed set whose plans the panel's brand changes is due for the engine, and the badge counts it …" and "q810/engine control: … is current, and the badge does not count it" (both read `unrecorded`) |
| `ledgerSets` calls `dueOf` without the print | `test-build-completed.ts`: "q810/engine at open: the ledger's answer at open prints the engine-moved set as the full read does …" (`unrecorded` vs due) |
| `ledgerSets` calls `dueOf` without the print, on the large-file stand-in | `test-open-large-file.ts`: "open/printed: the 12 sets recorded with a print under an older engine, plans unchanged, are printed at open and read current" (`unrecorded`) |
| `printYielding` calls `figma.loadAllPagesAsync()` after each projection | `test-open-large-file.ts`: "open/ready: the panel's first answer lands with no page loaded" (60 of 60) |
| The test's wait for a panel-driven write's tail removed (#3131 releases the guard at the verdict) | `test-build-completed.ts`: "q811/panel brand: …" (5 of 20 loaded runs, `{"state":"due","reason":"definition"}`) and "fixture: the panel's build reached the action table, and the test waited out its tail" (20 of 20) |
| `printNow` projects on every call (`printMemo` unused) | `test-build-completed.ts`: "q810/memo: a second recount against the same brand projects no plan again" (1 projected by the second) |

`paints` belongs in the deciding hash: a paint binding the engine moves is a drawing change. The hash is the whole
projection; the per-facet arms (`q811/facet <facet>`, one per facet plus the variants' own fields) hold that each
family of fields decides on its own. `q811/unprinted` drives finding 1 end to end through `main.ts`: due on the read,
not recorded by a write or the check, recorded with its print by the update's apply, current on the next read.

`test-write-adapter.ts` holds the wire reading of `moved`; `test:chrome`'s Update file arm shows the engine reason on
the checklist row.

### Gaps

- Nothing was run in Figma. Projecting every stale set at load is untimed there; in Node all 57 buildable defs project
  in about 0.85 s, and the ledger's answer at open waits on them (above).
- A set whose definition moved for a lever and for the engine in one release reads as an engine update: the ledger
  holds no brand to tell the two apart.
- The reason names parts by their plan names ("container", "focus ring"), and facets coarsely; it cannot say "now 2px",
  as the ledger keeps hashes, not values. Wording is DRAFT (Q2909.10 A).
