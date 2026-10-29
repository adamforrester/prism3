## (2026-10-29) — Update file: an executor change makes due only the sets it redraws (#3101, follow-up to Q811.1 / Q820 A)

**Status:** plugin main thread, the update's dry run, a new gate and a new tool. ENGINE patch (change note). CONTRACT
unchanged. The executor is unchanged, so `EXECUTOR_REVISION` stays at 43: the new files are not reached from
`write-components.ts`, and `lint-executor-revision.ts` agrees. No user-visible string changes; fewer sets read due.
Proposal, measurement and the weighed approaches: the comment on #3101.

### What changed

- **A record of which sets each revision redraws** (`apps/plugin/src/executor-reach.json`, read by `executor-reach.ts`):
  per `EXECUTOR_REVISION` above a floor, the def ids whose drawing that revision changes, or `"all"`. `reaches(def,
  from, to)` answers whether any revision in `(from, to]` names the set. A revision with no entry, a range crossing the
  floor, or a revision that moved back reaches every set, which is Q820 A's reading. An entry keeps the ids it was
  measured under; a later def rename is followed through `COMPONENT_RENAMES` (`currentDefId`), so Tab's entries at 25
  and 27 still reach a Tab item set.
- **The ledger** (`as-built-ledger.ts`): a revision move makes a set due for the executor only when it reaches the set.
  Otherwise the set reads as if the revision had not moved: current, due for its definition, or (the engine moved too)
  read by its print, so `needsPrint` prints it. `quietOf` and `restampQuiet` (`main.ts`) re-record such a set under
  today's revision after the next write, never at load.
- **The dry run** (`update-plan.ts`): a member stamped under another revision is "to update" only when a revision since
  reaches its set, so the checklist, the badge and the full check agree. Reaction differences, drawn damage and plan
  moves are read as before.
- **`test-reactions.ts`'s `converge` premise** stamped Tag's members at `EXECUTOR_REVISION - 1` to stand for a
  plugin from before reactions. Revision 43 does not redraw Tag, so the members with no reaction difference now read
  current and keep their records; the premise now stamps 14, the revision reactions (#2466, 15) followed.
- **The record is backfilled from a measurement** of the last 20 revisions (24 → 43), floor 23. A file drawn at 40 and
  read at 43 now has 3 sets due for the executor (brand-mark, wallet-button, sign-in-button), not every set.

### The measurement (`apps/plugin/reach-draw.ts`, `tools/executor-reach/history.ts`)

Two executors draw every projected def into the component shim over the same plans: the parent commit's
`apps/plugin/src` (exported with `git archive`) and the commit's own. Eight arms per def, each old against new from one
start: a fresh build; an in-place update of a file the old executor drew, every stamp at revision 0; an update across a
lever change, both ways; and an update over a drawing an earlier update left, both ways (the convergence-fix shape,
#2976). Two brands: none, and every structural lever away from its default (`LEVERS`). The drawing is every enumerable
field of every node under the set, its reactions and plugin data, in key order; only the stamp's revision and build
timestamps are normalized. A def that throws the same way on both sides, or draws nothing, is `error`, never `same`.

`history.ts --last 20 --jobs 4` (about an hour): 8 of 20 revisions redrew no set, 6 redrew one, one each 2, 3 and 4,
and three 15 to 16 (the reactions at 25 and 27, the Field style lever at 30). Median 1 set, mean 3.1, of 41 to 60.
Revisions 40 to 43 agree with an earlier fresh-build-only run, set for set. Two arms were load-bearing, each checked per
arm for one set: 38 (the update clears a min/max the plan dropped) changes no fresh Tag and shows only when an update
crosses a lever change; 30 changes Text field only where the lever brand is drawn.

### The gate (`apps/plugin/lint-executor-reach.ts`)

`lint-executor-revision.ts` keeps its role (the executor's code moved only with a raised revision); this one starts
where it ends. SUBJECT: the entries above the base's revision, as committed. ORACLE: `reach-draw.ts`, the base's
executor against the tree's, over the tree's plans, for every def no new entry names, in up to four workers. A def that
drew differently in any arm, or could not be drawn, must be named. The gate never writes the record (docs/34 shape 6),
and entries at or below the base's revision, and the floor, may not change. A base executor that does not load against
the tree's engine requires `"all"`. Base: merge base, or the first parent on main (`comparison-base.ts`). Cost: a read of
two files on most PRs; about 5 minutes on 4 cores when the revision rose (59 sets, measured with the base at 42).

What it shares with its subject is the host model (shape 17): a write the shim does not record reads the same on both
sides. Stated in `executor-reach.ts` with the author's answer (declare the set, or `"all"`). Not added to
`lint-push-base.ts`'s replay: on main's push run the first parent already gives it a real base, and its history arm
compares the record, not a squash's diff.

### Mutations, each on a committed tree, each failing by name

| Mutation | Fails |
|---|---|
| G1: an executor change that redraws Badge (a set field), revision 44, entry `[]` | `lint-executor-reach`: "badge: drawn differently by revision 44 than by 43 (fresh/default; fresh/levers) … Add "badge" to entry 44"; control with `["badge"]`: clean |
| G2: an in-place update change on Divider only (`update-apply.ts`) | `lint-executor-reach`: "divider: … (update/default; update/levers; update/default>levers; repair/default>levers; …)", no fresh arm |
| H1: entry 42 narrowed | "entry 42: … at the base, … here. An entry at or below the base's revision (43) does not change" |
| H2: floor moved | "floor: 39 at the base, 38 here" and "entry 39: missing" |
| H3: entry 41 dropped | "entry 41: missing" |
| H4: a misspelt def | "entry 43: sign-in-buton is not a def Prism3 builds as a set" |
| H5: an entry above the revision | "entry 44: above EXECUTOR_REVISION (43)" |
| M1: `dueOf` back to `was.rev !== is.rev` | `test-as-built-ledger.ts`: `reach/ledger`, `reach/range`, `reach/quiet`, `reach/engine` |
| M2: `update-plan.ts` without `reaches` | `test-update-apply.ts`: `reach/dry run 42` (45 to update, not current) |
| M3: `restampQuiet`'s stale filter without the revision | `test-build-completed.ts`: `reach/restamp` (rev stays 42) |
| M4: `quietOf` without the revision | `test-as-built-ledger.ts`: `reach/quiet` |
| M5: `needsPrint` back to `was.rev === is.rev` | `test-as-built-ledger.ts`: `reach/needs-print` |
| M6: `reaches` ignoring the lists | `test-as-built-ledger.ts`: `reach/record` and five more |

The history arms (H1 to H5) ran with `GITHUB_BASE_REF` pointed at a local ref holding a committed record, since main has
none yet. Two first attempts at G1 were mutations that changed nothing (a component name spelt `Badge`, then a set
opacity a later write resets), and the gate rightly passed both; each mutation since was confirmed to move the drawing
before the gate ran (docs/34 shape 19).

### Gaps

- **The shim's limit is the record's limit.** A write the shim does not model, or an executor branch only a lever
  combination outside the two brands reaches, reads as unreached. The author's answer is to name the set or `"all"`.
- **A member's stamp keeps its revision** when the update leaves it current, so the dry run reads ranges from older
  revisions over time. The record is append-only, so the answer does not drift.
- **The backfill is a measurement, not a gate result**: those revisions merged before the gate existed. `history.ts`
  reproduces it; revisions below 24 were not measured, hence the floor.
- **A reason line naming what changed** (Q3101.1 B on #3101) is not built: new copy, the owner's call.
- **CI time**: about 5 minutes on an executor PR, on the job that runs the revision gate.
