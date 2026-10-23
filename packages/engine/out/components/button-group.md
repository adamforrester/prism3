# Button.Group

> One to three buttons laid out together: in a row at the end, stacked, or sharing the width.

- **ID:** `button-group`
- **Category:** form
- **Status:** draft
- **Also known as:** button-set, action-group, actions

## Overview

A set of one to three buttons for the actions that close a task: Cancel and Save at the foot of a dialog, the buttons under a form. Inline puts them in a row at the end edge with the main action last; stacked puts them in a column of full-width buttons with the main action on top; fill puts them in a row whose buttons share the width. The buttons are Button, Button.Destructive and Button.Neutral, each its own action and spaced apart. Not a segmented control, whose buttons join edge to edge as one choice, and not a toolbar.

- **Purpose:** Lay out the one to three buttons that close a task, as a row at the end edge, a full-width stack or a row that shares the width.
- **Use when:** The actions at the foot of a dialog, card or form: a main action with a Cancel beside it, or up to three related actions.
- **Avoid when:** One choice among joined options (segmented-control), a toolbar of tools, navigation (links), or a single action on its own (a Button by itself).

## Anatomy

Shown on the default member: layout `inline`.

1. **Container** — The group: a column holding the items slot. It fills the width it is given.
2. **Items** — The buttons: a native slot holding one to three Buttons, two by default. A row at the end edge inline, a column stacked, a row whose buttons share the width at fill.
3. **Cancel** — Cancel, inline: an an outline Button; a host may prefer another.
4. **Save** — Save, inline: a filled Button, the main action, last.
5. **Save stacked** — Save, stacked: a filled Button, full width, on top.
6. **Cancel stacked** — Cancel, stacked: full width, under Save; an an outline Button; a host may prefer another.
7. **Cancel fill** — Cancel, fill: sharing the width; an an outline Button; a host may prefer another.
8. **Save fill** — Save, fill: a filled Button sharing the width, last.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `layout` | `inline`, `stacked`, `fill` | once, when authored | inline is a row at the end edge; stacked is a column of full-width buttons, the main action on top; fill is a row whose buttons share the width. A row too wide for its space wraps; nothing switches layout by itself. |

## Usage guidelines

Use a Button.Group for the actions that close a task: the foot of a dialog, the actions of a card, the buttons under a form. Inline for a row at the end edge on a wide surface; stacked for full-width buttons on a phone or a bottom sheet; fill for a row whose buttons share the width. Put the main action last inline and at fill, and first when stacked.

### Do

- Keep to one main action, the filled Button
- Put the main action last in a row and on top when stacked
- Use Button.Destructive for an action that deletes or removes, with Cancel beside it
- Keep the group to three buttons or fewer

### Don't

- Join the buttons edge to edge. Use a segmented control for one choice among options.
- Reverse the order with styling only. Pass the buttons in the order they read.
- Put links or icon buttons in the group
- Use a group for a toolbar of tools

## Accessibility

- **Keyboard:** Tab moves through the buttons in order. Enter and Space act on the focused one.
- **Focus:** Each button takes focus in turn and shows the shared focus ring.
- **Screen readers:** None of its own. Each button is a native \<button> with its own name; add role="group" with an aria-label only when the buttons need a shared name.

  Nothing on the group by default. Name each button by what it does; translated labels make a row longer, and a row that no longer fits wraps.

### WCAG

- 1.3.2 Meaningful Sequence (the reading and focus order match the visual order in every layout)
- 2.4.3 Focus Order (focus moves through the buttons in the order they are given)
- 2.5.8 Target Size (Minimum) (each medium button meets the target size at the default density)

### Motion

- **Enter:** None of its own.
- **Exit:** None of its own.
- **Reduced motion:** Nothing moves.

## Content guidelines

Button labels are short verbs or verb phrases in sentence case, each naming its own action.

- **Labels:** Name each button by what it does, in sentence case: "Save address", "Delete", "Cancel". The main action echoes the task; never "OK" or "Yes".

## Related components

- **Built from:** `button`
- **Instead, consider:** `segmented-control`
- **Often used with:** `dialog`, `button-destructive`, `button-neutral`
- **Replaces:**
  - a footer of fixed nested buttons copied into each component
  - a button-set component with a variant per count and layout

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `items` | slot of `button` or `button-destructive` or `button-neutral`, 1 to 3 | — | yes | The buttons, each a Button, Button.Destructive or Button.Neutral, in order. Two by default, three at most. Inline and fill, the main action last; stacked, the main action first. |
| `layout` | enum: 'inline' \| 'stacked' \| 'fill' | `inline` | no | inline is a row at the end edge; stacked is a column of full-width buttons, the main action on top; fill is a row whose buttons share the width. A row too wide for its space wraps; nothing switches layout by itself. |

## Specs

Generated from the plan that builds the design-file component: 3 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/items` | slot | every member |
| `container/items/cancel` | instance | layout=inline |
| `container/items/save` | instance | layout=inline |
| `container/items/saveStacked` | instance | layout=stacked |
| `container/items/cancelStacked` | instance | layout=stacked |
| `container/items/cancelFill` | instance | layout=fill |
| `container/items/saveFill` | instance | layout=fill |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `layout`.

**layout=inline**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 400px (literal) |
| `container/items` | — | `space.150` | — | — | — | — |

**layout=stacked**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 400px (literal) |
| `container/items` | — | `space.100` | — | — | — | — |

**layout=fill**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 400px (literal) |
| `container/items` | — | `space.150` | — | — | — | — |

### Color

Keyed by `layout`.

### Nesting and properties

- `container/items` is a slot, preferring `button`
- `container/items/cancel` nests `button` at `appearance=outline, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false`
- `container/items/save` nests `button` at `appearance=filled, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false`
- `container/items/saveStacked` nests `button` at `appearance=filled, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false`
- `container/items/cancelStacked` nests `button` at `appearance=outline, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false`
- `container/items/cancelFill` nests `button` at `appearance=outline, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false`
- `container/items/saveFill` nests `button` at `appearance=filled, size=medium, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false`

| Property | Type | Default |
| --- | --- | --- |
| `items` | slot | — |

---

Generated from the `button-group` component definition.
