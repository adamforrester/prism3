## (2026-11-18) — Prune and Apply Theme's notes spare what a collision Rename wrote (#3869, #3860)

**What changed.** When Apply Theme meets a collision and the person answers **Rename** (#1909), Prism3 writes its own variable or style as `<name> (Prism3)`. Prune's planned names come from the plans alone, so Clean up offered that renamed item as stale, and a confirm deleted it. For a variable that was data loss: the renamed variable is what the plan's aliases point at, and #3869's reproduction left 44 color variables aliasing a deleted one. Styles had the same gap (#3860), and since #3856 Apply's orphan-style note and Prune's offer disagreed in exactly that case.

Owner decision A (2026-11-18, one answer for both issues): a variable or style whose name, with every ` (Prism3)` suffix stripped, is a planned name is the plan's own and is never offered. One helper in `prune-figma.ts` holds the rule (`isRenamedPlanned`, `unlessRenamedPlanned`), and three readers use it:

- Prune's variables arm in `computePrunePlan`.
- `orphanStyles`, which is Prune's style arm and Apply's orphan-style note.
- Apply Theme's orphan-variable note in `main.ts`, so a re-apply after the hand-made original is gone doesn't count the renamed variable as an orphan either.

`ownedCollectionNames` (#3558) now strips the suffix through the same helper. Its own rule is unchanged: a collection is still matched only with the `modes:owned` stamp. Prune and Apply also build the planned variable names through one function now (`plannedVariableNamesOf` in `main.ts`), so the two read the same list.

### Verification

- `test-prune-main.ts` commits #3869's reproduction through the real `main.ts` on `file-shim.ts`: a retyped `core/palette/white`, a Rename, then a Prune preview and confirm. On main's source it fails as `main/prune spares renamed variable` (the confirm removes the variable). It also fails `main/prune spares renamed style` (preview count 1) and `main/apply note spares renamed variable`.
- `test-prune.ts` adds unit arms on `orphanStyles` (#3860's reproduction, plus a name renamed twice) and on `computePrunePlan`'s variables arm. A `… (Prism3)` name the plan does not hold is still offered.
- Mutations, each failing by name: the helper dropped from `orphanStyles` fails `main/prune spares renamed style` and `#3860 orphanStyles spares a renamed style`. Dropped from the variables arm, it fails `main/prune spares renamed variable` and `#3869 computePrunePlan spares a renamed variable`. Dropped from Apply's `allOrphans`, it fails `main/apply note spares renamed variable` alone.

**Guide.** "Update a file safely" now says that Clean up never lists a variable or style written under Rename. The `main.ts` citations that moved were restamped.
