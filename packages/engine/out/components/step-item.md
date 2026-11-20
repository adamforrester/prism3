# StepItem

> One step of a step indicator: a numbered disc, the step name and a line to the next step.

- **ID:** `step-item`
- **Category:** navigation
- **Status:** draft
- **Also known as:** step, stepper-step

## Overview

One step in a Steps indicator. Its disc shows the step number, filled for the current step and outlined for a step not started yet. A complete step shows a check in a filled disc, and its name can be a link back to that step. A step with an error shows an error glyph in the danger color and keeps its name. A line runs to the next step. Items live inside Steps and are never placed on their own.

- **Purpose:** Show one step of a Steps indicator: its number or a check, its name, and the line to the next step.
- **Use when:** Only as a child of Steps. Generate Steps, which places each step and sets the orientation and size for all of them.
- **Avoid when:** You need the whole sequence (use Steps, which holds the items), the progress of a task over time (use Progress) or a path up a site hierarchy (use Breadcrumbs).

## Anatomy

Shown on the default member: status `upcoming`, orientation `horizontal`, size `medium`.

1. **Container** — The step: a row that hugs its disc, its name and, across a horizontal row, the line to the next step. No padding and no fill.
2. **Rail** — The disc and, down a vertical list, the line below it to the next step.
3. **Marker** — The disc: filled with the brand color for the current and complete steps, outlined for a step not started yet, and bare behind the error glyph.
4. **Number** — The step number, centered in the disc.
5. **Check glyph** — A check in place of the number once the step is complete.
6. **Error glyph** — An exclamation in a circle, in the danger color, in place of the disc.
7. **Label** — The step name: primary text for the current step and a step with an error, secondary text for a step not started yet. Never a link.
8. **Link** — A complete step's name: a Link, inline and default weight, underlined at every state, back to that step. Its state is set on the step.
9. **Connector cell** (optional) — A cell one disc tall, so the line to the next step sits on the middle of the disc.
10. **Connector h** — The line to the next step, across, neutral at every status.
11. **Connector v** (optional) — The line to the next step, down from the disc, neutral at every status.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `status` | `upcoming`, `current`, `complete`, `error` | once, when authored | Where the step stands. upcoming: not started and not reachable yet. current: the step the person is on. complete: done, and a link back when href is set. error: needs attention before the flow can finish. |
| `orientation` | `horizontal`, `vertical` | once, when authored | horizontal: the line runs to the right of the name. vertical: the line runs down from the disc, with the name beside the disc. Set by the Steps it sits in. |
| `size` | `medium`, `small` | once, when authored | The disc and the body type size: a 24px disc beside 16px text, or a 20px disc beside 14px text. Set by the Steps it sits in. |

## Usage guidelines

Steps make up a Steps indicator and are set inside it: complete steps first, then the current step, then the steps not started yet. Change a step's status in the indicator; never place a step on its own. Turn the line off on the last step.

**In RTL.** The layout mirrors: the start edge is on the right. The marker and check and error glyphs do not mirror.

### Do

- Mark exactly one step as current
- Link a complete step only when going back to it keeps the person's work
- Keep the name visible on a step with an error

### Don't

- Place a step outside Steps
- Link a current step or a step not started yet
- Show status with color alone

## Accessibility

- **Keyboard:** Tab reaches a linked complete step; Enter follows the link. No other step takes focus.
- **Focus:** The nested link's own focus ring. A step that is not a link is not focusable.
- **Screen readers:** listitem, holding the step name as text or, for a complete step, a link

  aria-current="step" on the current step only. Each step ends with a visually hidden status word, translated: "Completed", "Current step", "Not started" or "Error". The number and the glyphs are aria-hidden. In right-to-left text the row mirrors.

### WCAG

- 1.3.1 Info and Relationships (each step is a list item in an ordered list)
- 1.4.1 Use of Color (each status also shows a glyph or the number, and a hidden status word)
- 1.4.3 Contrast (targets 4.5:1 for the step name and the number against their ground)
- 1.4.11 Non-text Contrast (targets 3:1 for the disc against the page)
- 2.4.4 Link Purpose (the link text is the step name)
- 2.4.7 Focus Visible (the nested link's own focus ring)
- 4.1.2 Name, Role, Value

### Motion

- **Enter:** None. A step changes status at once.
- **Exit:** None.
- **Reduced motion:** No motion to reduce.

## Content guidelines

Short noun phrases, sentence case, the same words the step's page heading uses.

- **Labels:** Each step is a short noun phrase in sentence case, such as Shipping or Payment. No numbers in the name, which the disc shows, and no trailing punctuation.

## Related components

- **Built from:** `link`
- **Often used with:** `steps`
- **Replaces:**
  - a step number typed into the label
  - a step not reached yet rendered as a link

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `status` | enum: 'upcoming' \| 'current' \| 'complete' \| 'error' | `upcoming` | no | Where the step stands. upcoming: not started and not reachable yet. current: the step the person is on. complete: done, and a link back when href is set. error: needs attention before the flow can finish. |
| `label` | string | — | yes | The step name, short and in sentence case, such as Payment. |
| `href` | string | — | no | The address of a complete step, which makes its name a link back to it. Ignored on every other status, so a step not reached yet never reads as reachable. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | The disc and the body type size: a 24px disc beside 16px text, or a 20px disc beside 14px text. Set by the Steps it sits in. |
| `orientation` | enum: 'horizontal' \| 'vertical' | `horizontal` | no | horizontal: the line runs to the right of the name. vertical: the line runs down from the disc, with the name beside the disc. Set by the Steps it sits in. |
| `connector` | boolean | `true` | no | Whether the line to the next step shows. Steps turns it off on the last step. |

## Specs

Generated from the plan that builds the design-file component: 16 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/rail` | frame | every member |
| `container/rail/marker` | frame | every member |
| `container/rail/marker/number` | text | status=upcoming or current |
| `container/label` | text | status=upcoming or current or error |
| `container/connectorCell` | frame | orientation=horizontal |
| `container/connectorCell/connectorH` | frame | orientation=horizontal |
| `container/rail/connectorV` | frame | orientation=vertical |
| `container/rail/marker/checkGlyph` | instance | status=complete |
| `container/link` | instance | status=complete |
| `container/rail/marker/errorGlyph` | instance | status=error |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | — |
| `container/rail` | — | `space.050` | — | — | — | — |
| `container/rail/marker` | — | — | `icon.size.md` | `icon.size.md` | — | radius `radius.round`; stroke `border-width.hairline` |
| `container/connectorCell` | — | — | `icon.size.md` | — | — | — |
| `container/connectorCell/connectorH` | — | — | `border-width.hairline` | `space.600` | — | — |
| `container/rail/connectorV` | — | — | `space.600` | `border-width.hairline` | — | — |
| `container/rail/marker/checkGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/rail/marker/errorGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.075` | — | — | — | — |
| `container/rail` | — | `space.050` | — | — | — | — |
| `container/rail/marker` | — | — | `icon.size.sm` | `icon.size.sm` | — | radius `radius.round`; stroke `border-width.hairline` |
| `container/connectorCell` | — | — | `icon.size.sm` | — | — | — |
| `container/connectorCell/connectorH` | — | — | `border-width.hairline` | `space.400` | — | — |
| `container/rail/connectorV` | — | — | `space.400` | `border-width.hairline` | — | — |
| `container/rail/marker/checkGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/rail/marker/errorGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/rail/marker/number` | `type.label.sm.emphasis` |
| size=medium | `container/label` | `type.body.md.default` |
| size=small | `container/rail/marker/number` | `type.label.sm.emphasis` |
| size=small | `container/label` | `type.body.sm.default` |

### Color

Keyed by `status`, `orientation`.

**status=upcoming, orientation=horizontal**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rail/marker` | — | `color.border.tertiary` | — | — |
| `container/rail/marker/number` | — | — | `color.text.secondary` | — |
| `container/label` | — | — | `color.text.secondary` | — |
| `container/connectorCell/connectorH` | `color.icon.secondary` | — | — | — |

**status=upcoming, orientation=vertical**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rail/marker` | — | `color.border.tertiary` | — | — |
| `container/rail/marker/number` | — | — | `color.text.secondary` | — |
| `container/rail/connectorV` | `color.icon.secondary` | — | — | — |
| `container/label` | — | — | `color.text.secondary` | — |

**status=current, orientation=horizontal**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rail/marker` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/rail/marker/number` | — | — | `color.interactive.primary.on-fill` | — |
| `container/label` | — | — | `color.text.primary` | — |
| `container/connectorCell/connectorH` | `color.icon.secondary` | — | — | — |

**status=current, orientation=vertical**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rail/marker` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/rail/marker/number` | — | — | `color.interactive.primary.on-fill` | — |
| `container/rail/connectorV` | `color.icon.secondary` | — | — | — |
| `container/label` | — | — | `color.text.primary` | — |

**status=complete, orientation=horizontal**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rail/marker` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/rail/marker/checkGlyph` | — | — | — | `color.interactive.primary.on-fill` |
| `container/connectorCell/connectorH` | `color.icon.secondary` | — | — | — |

**status=complete, orientation=vertical**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rail/marker` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/rail/marker/checkGlyph` | — | — | — | `color.interactive.primary.on-fill` |
| `container/rail/connectorV` | `color.icon.secondary` | — | — | — |

**status=error, orientation=horizontal**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rail/marker/errorGlyph` | — | — | — | `color.icon.danger` |
| `container/label` | — | — | `color.text.primary` | — |
| `container/connectorCell/connectorH` | `color.icon.secondary` | — | — | — |

**status=error, orientation=vertical**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rail/marker/errorGlyph` | — | — | — | `color.icon.danger` |
| `container/rail/connectorV` | `color.icon.secondary` | — | — | — |
| `container/label` | — | — | `color.text.primary` | — |

### Nesting and properties

- `container/rail/marker/checkGlyph` nests `icon/check`
- `container/link` nests `link` at `style=inline, weight=default, size=medium, surface=default, selection=unselected, state=rest`; follows `size`; exposes `state`
- `container/rail/marker/errorGlyph` nests `icon/error-circle`

| Property | Type | Default |
| --- | --- | --- |
| `number` | text | `1` |
| `label` | text | `Step name` |
| `connector` | boolean | `true` |

---

Generated from the `step-item` component definition.
