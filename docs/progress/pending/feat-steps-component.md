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
paints the box `indicator` slot, a fill. Every line is `color.icon.secondary`, the Breadcrumbs chevron's gray, at every
status, a complete step's line too (owner decision 2026-11-20, option 3, picked from a render beside Progress, Tabs and
Breadcrumbs). It is one status-free `indicator` key. `color.icon.secondary` stays long-term and no dedicated line role is
planned (owner decision 2026-11-20, follow-up B), though an icon role is not the ideal type for a line.

**Fallout.** Progress, Breadcrumbs, Tabs and PageNav said "a stepper, not built yet" and now name Steps. Progress
drops `stepper` from `planned`. Breadcrumbs and Progress list Steps under `alternativeTo`, which the symmetry arm
requires.

**Held by.** The `#3055 steps/*` block in `test.ts`: members, marker, name, connector, slot, identity and contrast.
Contrast is measured over all 20 committed brand × mode cells. Each arm was mutated and failed by name. On the surface
gates, rebinding the neutral line and lengthening it failed `surface/step-item` and `census/step-item.set` / `.grid`.
Dropping a default step failed `surface/steps`.

**Held for the owner** (PR body): the neutral line's color, a complete step without `href` (Figma always draws the
Link), the Figma page section, the DRAFT copy ("Step name", the four hidden words, "Step 2 of 3: Payment"), the
DRAFT spacing, the default last step's trailing line (nested overrides take no booleans), StepItem's aliases, the
`responsive` prop, and the Q438 sentence's reach to orientation (all decided 2026-11-20, below).

**Owner decisions, 2026-11-20.** All A except the line color, which waited on a comparison render (decided later the same day: option 3, follow-up B): 16 members, the
`↳ Steps` page, the DRAFT copy and spacing, the trailing line accepted, both aliases and `responsive` kept, and the
wireframe rule waived for this PR. The summary's Q438 sentence now names orientation as well as size, in wording the
owner approved as built ("Size and orientation apply to the items you haven't edited …"; owner decision 2026-11-20,
DRAFT copy → A, posted 2026-11-21 01:48Z). `lint-component-docs` ARM F holds it: a host
whose slot turns with an axis its items also carry (`directionWhen`, found from the anatomy, not listed) must end its
summary with that sentence, in the def, the JSON and the page.

**After review:** the default Steps numbers its second and third items "2" and "3" in Figma (`nestTexts`, #2317);
StepItem's own default is "1", so an inserted Steps read 1, 1 before. `#3055 steps/slot` asserts the numbers.

**After the merge with Popover:** the template reached 66 sets, and the Update check's host calls grew with it to
905,404, past `test-open-large-file.ts`'s `CHECK_CAP` of 900,000. Neither PR alone crossed it. The cap is now
950,000, with the measurement in its comment. The regressions it exists for stay far above it: `fileBlockers`
reading every name per set again measured 1.8M and failed `check/calls` by name. The merge also takes
`EXECUTOR_REVISION` to 67, because `CANVAS_FURNITURE` is executor-run code since #4325.
