## (2026-11-20) — Executor revision 68: set descriptions follow the summary, duplicate names aren't picked, searches skip hidden instance children (#2865, #3828, #4160)

One `EXECUTOR_REVISION` bump (67 → 68, reach `"all"`; 67 went to #4295, Skeleton, before this merged) carries three executor changes, as the owner asked on #4160 (decision C): designers see one round of every set reading as due.

### #2865 — the description record (owner decision A)
- **Executor.** `writeDescription` (`write-components.ts`) writes a set's (or an emitted component's) description and records it in shared plugin data `prism3`/`description`. `descriptionIsOurs` reads a description as Prism3's when it is empty, has no record, or still equals its record. An existing set Prism3 built (some member stamped, the check's own test) now takes the summary on those terms, where before it took it only while empty. A set with no stamped member keeps a non-empty description, record or not: decision A is scoped to a Prism3-built set (review should-fix 1). The build marks that description as the designer's (`DESCRIPTION_THEIRS`), so a later build, after it has stamped a member it added, still keeps it. An empty description is filled on any existing set, as #1623 did (delta review should-fixes 1 and 2).
- **Check.** `descriptionDue` (`update-plan.ts`) plans a description row for the set, or for each stamped component of a single-component def. The row is in the set's `previewHash`. A set whose only change is its description is no longer up to date. The check names the change, and names a designer's line it keeps.
- **Apply.** A description-only set enters the run (`descOnly`), and every applied set writes its due descriptions (`describe`). The publish description counts a described set as changed.
- **Narrowed, flagged on the issue:** an EMPTY description is not a row of its own. Nothing in it is stale, and the build's pass fills it whenever it writes the set, as before. Planned as a row, it would have listed every pre-#1623 set and every test world.
- **Arms added in review:** `#2865 hand-made set kept` (the build leaves an unstamped set's description), `description/single` (the apply keeps a designer's line on one icon while it writes another's), `#4160 flag restored` (`searchComponents` puts the flag back, after a build and after a search that throws). In delta review: `#2865 hand-made set kept twice`, `#1623 empty filled on a hand-made set`, `description/publish` (a description-only set is named in the publish description). In the second delta review: `#2865 built set not marked theirs` (a build with no description into a Prism3-built set leaves no designer mark).
- **Wording:** approved by the owner as written (2026-11-20), the guide sentence ("a set Prism3 built") included.

### #3828 — the other two readers of a duplicated name
- **Nest override.** `applyNestOverrides` takes an optional `ambiguous` resolver. Both executors pass the #1796 rule (`oneComp`/`one`, the `AMBIGUOUS` words), so a swap value two plain components hold is named, and the nested instance keeps its default.
- **Icon re-run.** The emit loop refuses a coordinate whose `<id>/<value>` two plain components hold, with a `member … -> AMBIGUOUS` miss. It never reads the last one as the existing member, and never adds a third.

### #4160 option B
- The executor's whole-file searches run through `searchComponents`. `component-search.ts` is #4261's file byte for byte, so whichever lands first, the other merges clean.
- The slot pass's two searches are hoisted and made once per build, lazily.

### Why reach is "all"
`lint-executor-reach` measured most sets as drawn differently, through the new `description` record on every write. Two reach tests read a record with their quiet set left out of every entry since 42 (`"all"` expanded), since the committed record now reaches everything.
