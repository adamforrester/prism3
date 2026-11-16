## (2026-11-16) — Style and wash bindings resolve inside the collections the apply writes (#1904)

**What.** Three binding lookups indexed every local variable in the file by name, the last one listed winning:
`applyTextStylePlan`'s font bindings, `applyStylesPlan`'s gradient stops and glass blur radius, and `applyWritePlan`'s
wash opacity. A same-named variable in a collection no plan writes (foreign, or stranded by an earlier version, #1152)
could take the binding: a stale target silently when its type matched, a host refusal partway through the pass when it
did not. The pre-flight never looked there. Now one index, `binding-targets.ts`, draws the targets only from the
collections the pre-flight checks (`bindingCollectionsOf(preflightPlanOf(exec, names))`, resolved first-by-name the way
`upsertCollection` resolves them), so a binding lands where the pre-flight looked. A target outside them is the
executors' ordinary named miss. `runApplyTheme` computes the list after the rename pre-pass and hands it to all three;
the paste path carries it in the color alias, styles and text steps' data.

**Kept optional, on purpose.** `bindIn` absent keeps the file-wide index, which only the executors' own unit tests use.
Making it required would have touched about fifty test call sites for no production caller; instead both production
callers are held to it by test, so dropping it from either fails by name.

**Measured.** `test-write-preflight.ts` (`#1904 …`, through `runApplyTheme`) and `test-mcp-paste.ts` (`binding scope
(#1904)`): a Prism3 file, a stamped stranded collection holding a same-named, same-typed copy of every variable, then a
re-apply. On main, 240 of 240 font bindings, 4 of 4 stops, 1 of 1 blur and 4 of 4 wash opacities land in the stranded
copy (paste: 489, 4, 3, 23); with the fix, none. Mutations, each failing by name: `bindingTargets` ignoring `bindIn` →
all four plugin arms; `runApplyTheme` dropping it from `applyStylesPlan` → stops and blur only; the paste's text step
dropping it → the paste's font arm only.

**Trap.** The bundle every paste script carries grew, which put the slicing arm's one-item `color create` script over
its artificial 30,000 ceiling; the arm now cuts at 31,000 and still splits the float aliases into five scripts.
`EXECUTOR_REVISION` 60 → 61, because `write-styles.ts` sits in the component executor's import walk; the reach entry is
empty and `lint-executor-reach` measured no set redrawn.
