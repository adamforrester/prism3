# Steps

> A person's place in a fixed sequence of steps. Size and orientation apply to the items you haven't edited. After editing an item, select the items and set their size and orientation.

- **ID:** `steps`
- **Category:** navigation
- **Status:** draft
- **Also known as:** stepper, step-indicator, progress-steps

## Overview

Shows where a person is in a fixed sequence of steps, such as a checkout. Each step has a numbered disc and a name, joined to the next by a line. Complete steps show a check and can link back; the current step is filled; steps not started yet are outlined and never links, so they do not read as reachable. A step can also show an error. The row runs across or down, and on a narrow screen collapses to one line naming the current step.

- **Purpose:** Show a person's place in a fixed, ordered sequence of steps: which are complete, which is current and which are still to come.
- **Use when:** A flow of a few steps taken in order, such as a checkout, a sign-up or a setup wizard, where people need to see where they are and how much is left.
- **Avoid when:** The progress is of one task over time (use Progress), the path is up a site hierarchy (use Breadcrumbs), the sections can be visited in any order (use Tabs), or the flow is one page.

## Anatomy

Shown on the default member: orientation `horizontal`, size `medium`.

1. **Container** — The navigation: a box that hugs its steps, with no padding and no fill.
2. **Items** — The steps: a native slot holding StepItem instances in a row or a column, one complete, one current and one not started by default.
3. **Step1** — A complete step, with a check and a link back.
4. **Step2** — The current step, its disc filled.
5. **Step3** — A step not started yet, its disc outlined.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `orientation` | `horizontal`, `vertical` | once, when authored | horizontal: the steps in a row, sharing its width. vertical: the steps in a column, each line running down to the next. Passed to every step. |
| `size` | `medium`, `small` | once, when authored | The disc and the body type size, 24px beside 16px text or 20px beside 14px text, passed to every step. |

## Usage guidelines

Use Steps for a fixed sequence a person moves through in order, such as a checkout or a sign-up, to show where they are and how much is left. Keep it to a few steps. For the progress of one task over time, use Progress. For a path up a site hierarchy, use Breadcrumbs. To switch between peers in any order, use Tabs.

**In RTL.** The layout mirrors: the start edge is on the right.

### Do

- Mark exactly one step as current
- Keep step names short, so the row fits
- Link complete steps only when going back keeps the person's work
- Turn the line off on the last step

### Don't

- Link steps the person has not reached
- Use Steps for steps a person can take in any order
- Show status with color alone

## Accessibility

- **Keyboard:** Tab moves through the linked complete steps in order; Enter follows a link. No other step takes focus, and there is no arrow-key navigation.
- **Focus:** Each linked complete step shows its link's focus ring.
- **Screen readers:** navigation landmark, named by its label, holding an ordered list of steps

  A \<nav> with aria-label set to the label prop, translated. aria-current="step" on the current step only. Each step ends with a visually hidden status word: "Completed", "Current step", "Not started" or "Error". The narrow one-line form reads "Step 2 of 3: Payment", translated. In right-to-left text the row mirrors.

### WCAG

- 1.3.1 Info and Relationships (an ordered list inside a named navigation landmark)
- 2.4.8 Location (shows where the person is in the sequence)
- 1.4.1 Use of Color (each status shows a glyph or a number and a hidden status word, not color alone)
- 1.4.10 Reflow (targets one line naming the current step when the row does not fit)
- 2.4.7 Focus Visible
- 4.1.2 Name, Role, Value

### Motion

- **Enter:** None. A step changes status at once.
- **Exit:** None.
- **Reduced motion:** No motion to reduce.

## Content guidelines

Step names are short noun phrases in sentence case, matching each step's page heading.

- **Labels:** Each step is a short noun phrase in sentence case, such as Shipping, Payment, Review. The landmark label names the flow, such as Checkout steps.

## Related components

- **Built from:** `step-item`
- **Instead, consider:** `progress`, `breadcrumbs`
- **Often used with:** `link`
- **Replaces:**
  - a breadcrumb trail used for checkout steps
  - step names separated by typed ">" characters
  - steps not reached yet rendered as links

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `items` | slot of `step-item`, 2 or more | — | yes | The steps, in order, each with a name and a status. Exactly one is current. At least two. |
| `orientation` | enum: 'horizontal' \| 'vertical' | `horizontal` | no | horizontal: the steps in a row, sharing its width. vertical: the steps in a column, each line running down to the next. Passed to every step. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | The disc and the body type size, 24px beside 16px text or 20px beside 14px text, passed to every step. |
| `label` | string | — | yes | The accessible name of the navigation landmark, translated, such as Checkout steps. Assistive technology adds "navigation" itself. |
| `responsive` | boolean | `true` | no | When the row does not fit, show one line naming the current step and the count in place of the row. Turn it off where the full row always fits. |

## Specs

Generated from the plan that builds the design-file component: 4 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/items` | slot | every member |
| `container/items/step1` | instance | every member |
| `container/items/step2` | instance | every member |
| `container/items/step3` | instance | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/items` | — | `space.100` | — | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/items` | — | `space.075` | — | — | — | — |

### Color

Keyed by `orientation`.

### Nesting and properties

- `container/items` is a slot, preferring `step-item`
- `container/items/step1` nests `step-item` at `status=complete, orientation=horizontal, size=medium`; follows `orientation`, `size`
- `container/items/step2` nests `step-item` at `status=current, orientation=horizontal, size=medium`; follows `orientation`, `size`
- `container/items/step3` nests `step-item` at `status=upcoming, orientation=horizontal, size=medium`; follows `orientation`, `size`

| Property | Type | Default |
| --- | --- | --- |
| `items` | slot | — |

---

Generated from the `steps` component definition.
