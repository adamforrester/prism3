## (2026-10-31) — Accordion: a `divider` boolean hides the rule under each item (#3198)

**Status:** Accordion def + tests. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No executor
change, so `EXECUTOR_REVISION` stays (`lint-executor-revision.ts` clean).

### What changed

- **Owner decision Q-ACC2 A (2026-10-31, #3198):** Accordion gets a Figma boolean `divider`, on by default, bound to the
  nested Divider's visibility in every one of the 48 members, and a code prop `divider` (boolean, default `true`).
  Found by a rebuild of the reference brand's FAQ list, which has no rules between items: before this, the only way to
  hide the rule was a layer override on each instance.
- The `divider` part is `optional: true`, which a boolean over a part requires (`figmaPropertyErrors`). Dialog's
  `dividers` is the precedent for a boolean over a nested Divider.
- **DRAFT prose, for the owner:** the prop's description and one docs "Do" line, both saying when to turn the rule off.
  Listed in `notes.contested`.
- Baselines accepted for Accordion only: `component-surface.json` (properties `+divider:BOOLEAN`, 48 → 48 members) and
  `component-axes.json` (an added prop, no removal).

### How an Update takes it

The as-built record is per node, and adding a property and a `visible` reference to an existing instance is an in-place
write, so a file built before this reads 48 members to update (18 clean, 30 with a hand edit on the header in the arm),
and the apply keeps the set, every member and every node id. The hand-edited headers keep their padding; the Divider
is its own node, so it takes the wiring on the edited members too.

### Verification

- `test.ts` `#3198 accordion divider wired` (one BOOLEAN on the set, all 48 Dividers built visible and bound to it) and
  `#3198 accordion divider default on` (the Figma property and the code prop both default to true).
- `test-update-apply.ts` `accordion divider/*`: a file rebuilt from today's def with the boolean taken out, 30 members
  hand-edited, updates in place: property declared default on, all 48 wired, no id moved, the 30 edits kept, current after.
- Each arm mutated to fail by name; the table is on the PR.

Out of scope (#3198): the FAQ row pitch and `size=large`, checked in the file once this lands.
