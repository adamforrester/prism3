## (2026-11-03) — Update check: a variable's value edited in the Variables panel drops the kept views (#3364)

Found in #3348 (#3313). The check reuses the member reads the hand-edit pass made at open ("kept views"), and drops them on any change Figma reports to a component, set or style. Figma reports no document change when a variable's **value** is edited in the Variables panel, yet every member bound to that variable re-resolves: a size, a padding, an opacity. So the next check could lay its plans against a read that held the old value, and call a set current when it isn't, or the other way round.

### The fix

- **The file's variables, printed** (`member-views.ts`, `variablesPrint`): each local variable's id, type and values by mode, and each collection's id, modes and default mode.
- **The pass prints them before it reads** (`handEditsPass`, `noteVariables`).
- **Each check prints them again as it starts** (`previewUpdate`, through `KeptViews.under`; `checkSets` passes it). A print that differs from the one the views were read under drops every view. So does a print the host refuses.
- **A view is kept only under a print.** A read with nothing to compare against is never reused.
- I chose to drop every view rather than only those that read the edited variable. A member can reach a variable through an alias, a nested instance or a style, and tracing that is the same problem #3348 avoided for components. The cost is one read of every variable per check, against a full re-read of every set only after a value actually moved.

`EXECUTOR_REVISION` stays at 48: `lint-executor-revision` reports the executor's code unchanged. The cites in three public guides move by the lines `main.ts` and `test-update-apply.ts` gained.

### Not covered

A **library** variable's value is not a local variable, so it is not in the print. Whether accepting a library update is heard as a document change on the members it moves has not been measured on the host. Filed as #3376.

### Gates

- `test-update-apply.ts`, `values/…`, on the strict shim: two checks with a value edited between them. A float variable the member binds is rewritten (`setValueForMode`, no change heard), and the member re-resolves.
  - `values/unchanged`: the first check keeps the view and gives a fresh read's answer.
  - The premise: laid against the kept read with no print taken, the check reads 0 moves where a fresh read reads 44.
  - `values/edited`: the second check drops the view and gives the fresh read's answer, whole.
  - `values/unreadable`: a refused print drops every view.
  - `values/no print`: a read with no print to compare against is never kept.
- `test-open-large-file.ts`, `check/values`: the same through `main.ts`'s own check on the template stand-in, which gains one variable for the arm. Every set's read is kept, a value is edited, and an unedited set's member re-resolves its opacity with no `documentchange`. The second check equals a fresh read.
- The existing `views/…` arms now print the variables before they keep a view.
- `test-open-large-file.ts` clears the kept views and the print before the template's open, so `check/views` and `check/calls` measure the reads kept under the pass's own print, not one an earlier arm's check left in the module.

Mutations, each failing by name:
- `noteVariables` not dropping on a moved print → `values/edited` and `check/values`;
- `previewUpdate` not printing as the check starts → `values/edited` and `check/values`;
- `checkSets` passing a no-op `under` → `check/values`;
- a refused print kept → `values/unreadable`;
- `keepView` not asking for a print → `values/no print`;
- the pass's own `noteVariables(await variablesPrint(figma))` removed → `check/views` (0 kept) and `check/calls` (2,002,325 host calls).
