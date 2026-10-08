## (2026-10-08) — Plugin update dry run: a fill the plan no longer has is named as a difference (#2335)

**Status:** plugin only (`apps/plugin/src/update-plan.ts` and its test). No engine change, no emitted artifact moves,
no ENGINE bump, CONTRACT unchanged, `EXECUTOR_REVISION` unchanged (the executor is untouched). The new line uses
#2306's format, so it adds no new sentence shape. Its value words (`none`, a hex color, `at 50%`, `, hidden`, "a
variable this file does not have") are drafts for the owner.

### The gap

The dry run's field differences come from `diffAnatomy`, the read-back the build trusts. Its `paints` check reads only
the paints a plan declares (`if (!wantVar) continue`), and a node with no fill has no `paints` key in its plan at all.
So a fill the file has and the plan doesn't goes unseen. That is exactly #2324's "Text & icon only": a Button built
under "Fill" keeps its hover and pressed wash on 48 text members. The dry run read them as `update` (they were
stamped by another plan) but listed no difference, so the owner had nothing to see before approving.

### What changed

`droppedFills`, a walk beside `extraChildren` in `update-plan.ts`, finds every node where the plan declares no fill
and no gradient but the file has a fill. It skips the same nodes the executor's `claimDefaults` leaves alone: TEXT
(an unpainted label is reported, never cleared), instances (their fills are their main's), and a glyph's imported
contents. Each hit becomes a `fill` change, plan `none`, file side the paint as a designer would find it: the bound
variable's name in this file, else its hex, plus an opacity under 100% and `hidden`. On NB's Button that reads:

`button · the member · fill: the plan says none, the file has …/color/interactive/primary/overlay/hover (12 members).`

It's one line per variable: hover and pressed on each ground, 12 members each. The same walk runs in
`differencesOf`, so the one-time capture also refuses a member with a hand-added fill where its plan has none, and
names the fill. The change was kept out of `diffAnatomy` on purpose. That file is shared with the build's
round-trip, the apply's verify and the baseline. Lane A was fixing #2364 in the apply at the same time, and this PR
was scoped to dry-run reporting only.

### Tests and the mutation

`test-update-components.ts`, a new `dropped/` section:
- **`dropped/dry run`:** builds NB's Button under "Fill" and plans it under "Text & icon only". The four lines
  must be exactly the four the test writes itself, from the built members' own bound variables.
- **Two premises,** both hand-counted: the 48 members (2 states × 3 sizes × 4 icon combinations × 2 grounds) plan a
  fill under "Fill" and none under the default, and the built members carry the primary overlay wash.
- **`dropped/capture`:** a Tag member is stamped by the current plan and given a hand-added 50% red fill on
  `content`. It must be left out, with the fill named.

| Arm | Fails by name |
|---|---|
| `droppedFills` a no-op | `✗ dropped/dry run: … ([])` and `✗ dropped/capture: … ([]; ["tag: 45 members recorded."])`, the only 2 failures of 102 |

### Found on the way, filed

**#2369: the apply doesn't remove the fill either.** A scratch run of `applyUpdate` over the same Button lists all 48
members as updated, and all 48 still have the wash afterwards. In place, the member root is already a COMPONENT, and
`claimDefaults` returns early on one (correct on a fresh build, where the root is neutralized while still a frame).
The apply's `diffAnatomy` verify can't see it either, for #2335's reason. That's executor work, so it needs
`EXECUTOR_REVISION` raised and stays out of this PR. Until it lands, the new line is true about the file but the
update will not act on it. Lane A was told.

### A trap for whoever re-verifies this

A capture test can't use the "Fill" build: the capture records only members stamped by the current plan, and those
members are stamped by the "Fill" plan. They are skipped before any difference is read. Its arm plants a hand edit
on a member of the current plan instead.
