## (2026-11-07) — Apply Theme: Skip or Rename for each collision (#1909, Q112 A)

#1906 left one outcome for an apply that collides with content Prism3 did not make: a refusal, with every collision
named. The owner decided (Q112 A) that the person chooses, per collision, **Skip** or **Rename**, with "Apply to all";
refusal stays the default and nothing is remembered in v1. This builds it.

### How it works

- **Plugin.** The panel's refused `apply-result` now carries `collisions`, each with a key (`conflictKey`: kind,
  collection for a variable, name). `apply-theme` takes an optional `collisions` map back. `runApplyTheme` runs the
  pre-flight, applies the choices to the seven plans (`resolveCollisions`, `collision-choice.ts`, pure), then runs the
  pre-flight **again over the resolved plans** before any write. A collision with no choice leaves the plans as built,
  so the refusal is exactly #1906's. A renamed name someone else already holds is refused there, before any write.
- **Skip** drops the item, and every reference to a skipped variable lets go (alias targets, the wash's opacity,
  `aliasByMode`, gradient stops, the glass blur radius, a text style's three bound fields), so nothing binds to the
  foreign variable. A skipped `core` or `color` collection is `null` in the color executor's new `names` argument, so it
  is neither found nor created. **Rename** writes Prism3's item under `<name> (Prism3)` and the references follow.
- **Studio.** A modal list built to Update file's dialog and its Kept edits rows (`shell/collisions.ts`,
  `state/collisions.ts`): one select per row, "Apply to all" in the foot, Apply off until every row has a choice.
  Cancel, Escape and the scrim leave the refusal standing. Layout, copy and the rename suffix are DRAFT for the owner.
- An agent's apply is unchanged: its result carries no `collisions`, and `ACTIONS.applyTheme` posts no choices.

### Traps for whoever re-verifies

- **The second pre-flight is the safety, not `resolveCollisions`.** The `Q112 rename collides` arm fails by name if it
  is dropped. The resolver only reshapes plans.
- **Stranded report.** A collection written under a new name would read as "no plan writes it"; `main.ts` now counts
  the resolved names as planned.
- **Two gates moved with it.** `lint-stranded-collections` ARM 4 now also reads the color executor's default-name
  object, where its `'color'` literal lives now (mutated to `'colour'`, it names it). `test-mcp-paste`'s slicing arm
  cuts at 30,000 rather than 29,500: the one-item color script had about 100 characters to spare and grew past it, and
  30,000 still cuts the float aliases into six scripts. The public guides now say what the choice does.
- **Not covered, stated:** later runs (component builds, updates, prune) find items by their usual names, so after a
  Rename they find the item the person kept. Q112 A asks for this apply alone; the follow-up is the owner's.
