## (2026-10-10) — Update dry run: a set whose only other members are not built by Prism3 reads up to date (#2464)

**Status:** plugin only (`apps/plugin/src/update-plan.ts` and its test). No engine change, no emitted artifact moves,
no ENGINE bump, CONTRACT unchanged, `EXECUTOR_REVISION` unchanged (the executor is untouched). The headline wording is
unchanged. One set-line sentence is new, DRAFT for the owner (below).

### The diagnosis

`noChanges` asked whether every member was `current` or `revisionUnknown`. A member not built by Prism3
(`unstamped`) is neither, so a set holding one could never read as having no changes, even though the update never
touches it and lists no change for it (the owner's rule, #2325). On the NB master duplicate, after a full apply,
every Prism3 member of all 24 sets read current. The headline still read "Would change 1 of 24": the `icon` set and
its 27 hand-added icons. So a converged file could not pass the dry run → apply → dry run check literally.

### What changed

- **`noChanges` counts `unstamped` beside `current` and `revisionUnknown`.** Nothing else moves: a set with an
  add, a property change, or any member to update, re-apply, edited by hand or with no record still counts.
  `upToDate` builds on `noChanges`, so such a set reads up to date and the headline reaches "✓ All sets up to date"
  when every set does.
- **The set line keeps the count.** An up-to-date (or no-changes) set with members not built by Prism3 reads
  `tag: up to date (47 members). 2 not built by Prism3, left as they are.` The second sentence is new wording for
  the owner. It's the issue's own phrase. Before, an up-to-date line had no room for the count, and a changing
  set's line already said `N not built by Prism3`.

### Tests and the mutation

`test-update-components.ts`, a new `converged/` section, on TAG as built (45 current) plus two members not built by
Prism3 off the plan:
- **`converged/headline`:** that set beside an untouched one reads "✓ All sets up to date". This is the
  existing headline, typed as a literal.
- **`converged/set line`:** the set's line is exactly the sentence above.
- **`converged/real change`:** with the content gap moved on every member, the same set reads
  "Would change 1 of 1", and its line still counts the 2.

| Arm | Fails by name |
|---|---|
| `unstamped` left out of `noChanges` again | `✗ converged/headline: … (got "Would change 1 of 2")` and `✗ converged/set line: … (got "tag: 47 members. 2 not built by Prism3.")`, the only 2 failures of 122 |
