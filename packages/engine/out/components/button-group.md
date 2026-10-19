# Button.Group

> One to three buttons laid out together: in a row at the end, stacked, or sharing the width.

A set of one to three buttons for the actions that close a task: Cancel and Save at the foot of a dialog, the actions of a banner, the buttons under a form. Inline puts them in a row at the end edge with the main action last; stacked puts them in a column of full-width buttons with the main action on top; fill puts them in a row whose buttons share the width. The buttons are Button, Button.Destructive and Button.Neutral, each its own action and spaced apart. Not a segmented control, whose buttons join edge to edge as one choice, and not a toolbar.

- **ID:** `button-group`
- **Category:** form
- **Status:** draft
- **Also known as:** button-set, action-group, actions

## Usage

Use a Button.Group for the actions that close a task: the foot of a dialog, the actions of a banner or a card, the buttons under a form. Inline for a row at the end edge on a wide surface; stacked for full-width buttons on a phone or a bottom sheet; fill for a row whose buttons share the width. Put the main action last inline and at fill, and first when stacked.

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

### Content guidelines

Button labels are short verbs or verb phrases in sentence case, each naming its own action.

### Copy patterns

- **Labels:** Name each button by what it does, in sentence case: "Save address", "Delete", "Cancel". The main action echoes the task; never "OK" or "Yes".

## Choosing it

- **Purpose:** Lay out the one to three buttons that close a task, as a row at the end edge, a full-width stack or a row that shares the width.
- **Use when:** The actions at the foot of a dialog, banner, card or form: a main action with a Cancel beside it, or up to three related actions.
- **Avoid when:** One choice among joined options (segmented-control), a toolbar of tools, navigation (links), or a single action on its own (a Button by itself).
- **Often used with:** `dialog`, `banner`, `button`, `button-destructive`, `button-neutral`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `items` | slot of `button` or `button-destructive` or `button-neutral`, 1 to 3 | — | yes | The buttons, each a Button, Button.Destructive or Button.Neutral, in order. Two by default, three at most. Inline and fill, the main action last; stacked, the main action first. |
| `layout` | enum: 'inline' \| 'stacked' \| 'fill' | `inline` | no | inline is a row at the end edge; stacked is a column of full-width buttons, the main action on top; fill is a row whose buttons share the width. A row too wide for its space wraps; nothing switches layout by itself. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `layout` | `inline`, `stacked`, `fill` | once, when authored |

## Accessibility

- **Role:** None of its own. Each button is a native \<button> with its own name; add role="group" with an aria-label only when the buttons need a shared name.
- **WCAG:**
  - 1.3.2 Meaningful Sequence (the reading and focus order match the visual order in every layout)
  - 2.4.3 Focus Order (focus moves through the buttons in the order they are given)
  - 2.5.8 Target Size (Minimum) (each medium button meets the target size at the default density)
- **Keyboard:** Tab moves through the buttons in order. Enter and Space act on the focused one.
- **Focus:** Each button takes focus in turn and shows the shared focus ring.
- **ARIA:** Nothing on the group by default. Name each button by what it does; translated labels make a row longer, and a row that no longer fits wraps.

## Motion

- **Enter:** None of its own.
- **Exit:** None of its own.
- **Reduced motion:** Nothing moves.

## Composition

- **Composes with:** `button`
- **Alternative to:** `segmented-control`
- **Planned:** `card`, `toolbar`
- **Replaces:**
  - a footer of fixed nested buttons copied into each component
  - a button-set component with a variant per count and layout

---

Generated from the `button-group` component definition.
