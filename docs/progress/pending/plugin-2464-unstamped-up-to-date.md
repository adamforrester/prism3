## (2026-10-10) — Update dry run: a set whose only other members are not built by Prism3 reads up to date, unless Adopt could claim them (#2464)

**Status:** plugin only (`apps/plugin/src/update-plan.ts` and its test). No engine change, no emitted artifact moves,
no ENGINE bump, CONTRACT unchanged, `EXECUTOR_REVISION` unchanged (the executor is untouched). The headline wording is
unchanged. Owner decisions Q191, recorded on #2476:
- **1A:** the set-line sentence "N not built by Prism3, left as they are." is approved.
- **2B:** a set with members Adopt could claim reads "no changes", never up to date. Its Adopt sentence is DRAFT
  (below).

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

- **Adoptable members (Q191 2B).** A member not built by Prism3 on a PLANNED coordinate is one Adopt could claim
  (`adoptable`, #2283). `upToDate` now also requires `!p.adoptable.length`, so such a set reads
  `tag: no changes (45 members). 2 not built by Prism3, left as they are. Adopt can claim them.`
  - The headline for a file whose only non-current members are adoptable is the existing "✓ No changes found", not
    "✓ All sets up to date".
  - The Adopt sentence is new wording, DRAFT, because the dry run had no Adopt wording to reuse. Adopt's own verdict
    speaks only after the fact ("N adopted"). It reads "Adopt can claim it" for one member, "them" when every member
    not built by Prism3 is adoptable, and "Adopt can claim K of them" otherwise.
  - Off-plan unstamped members (the NB icon case) still read up to date.

### Tests and the mutation

`test-update-components.ts`, a new `converged/` section, on TAG as built (45 current) plus two members not built by
Prism3 off the plan:
- **`converged/headline`:** that set beside an untouched one reads "✓ All sets up to date". This is the
  existing headline, typed as a literal.
- **`converged/set line`:** the set's line is exactly the sentence above.
- **`converged/adoptable`:** two of TAG's own members with no stamp or record hold their planned coordinates, so
  both are adoptable. The headline must be "✓ No changes found", and the set line must be exactly the Adopt line
  above.
- **`converged/real change`:** with the content gap moved on every member, the same set reads
  "Would change 1 of 1", and its line still counts the 2.

| Arm | Fails by name |
|---|---|
| `!p.adoptable.length` dropped from `upToDate` | `✗ converged/adoptable: … (✓ No changes found; tag: up to date (45 members). 2 not built by Prism3, left as they are.)`, the only failure of 124 |
| the adoptable case dropped from the headline | `✗ converged/adoptable: … (✓ All sets up to date; tag: no changes (45 members). … Adopt can claim them.)`, the only failure of 124 |
| `unstamped` left out of `noChanges` again | `✗ converged/headline: … (got "Would change 1 of 2")` and `✗ converged/set line: … (got "tag: 47 members. 2 not built by Prism3.")`, the only 2 failures of 122 (before the adoptable arms) |
