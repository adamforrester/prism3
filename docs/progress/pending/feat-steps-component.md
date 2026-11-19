## (2026-11-19) — Steps and StepItem: a place in a fixed sequence, built from the approved proposal

**The ask.** #3055: a checkout rebuild needed a three-step indicator, with the current step first or in the middle and
later steps not reachable. Breadcrumbs could not model it: it drops the separator after the current item and draws
every earlier item as a link. The owner took all nine proposal items as recommended (2026-11-19). The KB has no Steps
brief, only a Progress brief, so the build follows the proposal (decision 9).

**The shape.** Breadcrumbs' two-def shape. `steps` is a `container` holding a native `items` slot of `step-item`,
three by default (complete, current, upcoming), at least two, StepItem only. The slot's direction follows
`orientation` through `directionWhen`, so a designer's steps survive a switch. `step-item` is
`status [upcoming, current, complete, error]` × `orientation` × `size [medium, small]`, 16 members. Steps is
`orientation` × `size`, 4 members. Neither has a state axis: a complete step's name is a nested Link with `state`
exposed, as BreadcrumbItem's ancestor is. The disc is one icon rung square (24 / 20px) at `radius.round`. It is filled
with the number at current, outlined in `border.tertiary` with the number at upcoming, filled with a check at
complete, and bare behind the `error-circle` glyph in `icon.danger` at error. The line runs across in an end cell one
disc tall, or down under the disc in a `rail`. The `connector` boolean toggles both lines, which never build in one
member.

**The trap: the line cannot be a border role.** The proposal named the border role for the neutral line. Every
`color.border.*` is scoped to strokes only, and #933 lets no second box claim the disc's `border` slot. So the line
paints the box `indicator` slot, a fill. The neutral line is `color.icon.secondary`, and the line after a complete step
is the primary fill. Owner decision held on the PR.

**Fallout.** Progress, Breadcrumbs, Tabs and PageNav said "a stepper, not built yet" and now name Steps. Progress
drops `stepper` from `planned`. Breadcrumbs and Progress list Steps under `alternativeTo`, which the symmetry arm
requires.

**Held by.** The `#3055 steps/*` block in `test.ts`: members, marker, name, connector, slot, identity and contrast.
Contrast is measured over all 20 committed brand × mode cells. Each arm was mutated and failed by name. On the surface
gates, rebinding the neutral line and lengthening it failed `surface/step-item` and `census/step-item.set` / `.grid`.
Dropping a default step failed `surface/steps`.

**Held for the owner** (PR body): the neutral line's color, a complete step without `href` (Figma always draws the
Link), the Figma page section, the DRAFT copy ("Step name", the four hidden words, "Step 2 of 3: Payment"), and the
DRAFT spacing.
