## (2026-11-11) — Build queue: a set an earlier build in the run already made is not built again (#3359)

Found in the review of #3351. With usage panels on and no `_Doc-block` in the file, the first of Badge, Tag, List item and Divider that a run builds also builds the others the file lacks (#3308). The queue still posted each of the others. Each answered "✓ already built", but its detail held one ALREADY PRESENT miss per member (50, 7 and 9 in the reviewer's run). `depsFirst` can't prevent this, because none of the four nests another.

### The change

- **The plugin sends what it built first as data.** `component-result` gains an optional `alsoBuilt`: the ids its "Also built" line names (`main.ts`, `messages.ts`). The panel's adapter carries it through and drops a malformed list whole (`write-adapter.ts`).
- **The run skips them.** `record` (`state/build-queue.ts`) records each queued set that an earlier result in the run lists under `alsoBuilt` as built by that set (`builtBy`), with the `ok` result the repeat post used to record. The run then moves past it. This also holds after a stop: those sets were built, so the run doesn't list them as not built. `runAfterResult` (`main.ts`) marks their rows as built.
- No wording changes. The run's lines are the ones a repeat post produced. The executor is unchanged, so `EXECUTOR_REVISION` doesn't move.

**Not fixed: the issue's related nit.** With a queue of Tag, Icon and Link, Icon is posted first, and its own answer lists Icon under "Also built". Badge, built first for `_Doc-block`, nests Icon, so the block-first loop in `main.ts` builds Icon as a dependency before Icon's own build. Fixing that means reordering that loop, so it is left on #3359.

**The set built first keeps today's `ok` even when its own build had misses.** Whether a dependency's misses make the run a warning is #3386's open question.

### The gate

- `test-component-groups.ts` `queue/also built` checks the reviewer's queue. Tag's result names Badge, Divider and List item, and the run posts Link next and ends clean with 5 built. Also checked: a stop during Tag's build leaves only Link unbuilt, and a set built first that the run reaches later is skipped then.
- `test-chrome.mjs` section 10, `#3359`, posts the result to the built panel. The run posts Tag, then Link, never Badge.
- `test-update-doc-block.ts` `panels/on: sets/badge: also built as data` checks that the real `main.ts` sends the ids.
- `test-write-adapter.ts` checks that the field is carried, and that a malformed list is dropped.

Each fails by name under its mutation. `record` ignoring `alsoBuilt` fails `queue/also built`. `runAfterResult` not passing `m.alsoBuilt` fails the chrome arm. `main.ts` not sending it fails `also built as data`.
