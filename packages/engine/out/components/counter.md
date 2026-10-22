# Counter

> A whole-number quantity between a minus and a plus button, such as an item count in a bag.

- **ID:** `counter`
- **Category:** form
- **Status:** draft
- **Also known as:** quantity-stepper, quantity-selector, quantity-picker, qty-stepper

## Overview

A small whole-number quantity shown between a minus and a plus button, such as the item count on a product card or a bag line. The buttons change the value by one; the value itself is shown, not typed. Min and max are settable, with min 0 by default, and at a limit the matching button is unavailable. Outline draws the field's edge around the row, with the glyphs inside it. Ghost draws no box, and each button is a light circle. For typed numeric entry in a form, use a number input.

- **Purpose:** Set a small whole-number quantity with a minus and a plus button around the displayed value.
- **Use when:** An item count on a product card or a bag line, a number of guests or tickets: a small count, usually changed by one, with a known minimum and often a maximum.
- **Avoid when:** The number is typed, large, precise or decimal, such as a price or a measurement (use a number input). The count is shown on another element rather than set by the user, such as unread messages (use Badge). The options are a short fixed list to compare (use Select or SegmentedControl).

## Anatomy

Shown on the default member: appearance `outline`, size `medium`.

1. **Container** — The stack: an optional label above the row and an optional message below it. It hugs the row.
2. **Label** (optional) — What is counted, such as "Quantity". Its label text, required marker, emphasis and weight surface on the Counter. Hidden by default: the label is always the value's accessible name, and shown only where nothing around the counter says what it counts.
3. **Control** — The row: the minus button, the value and the plus button. Outline draws the field's fill and edge with the glyphs 12px inside it (16px at large); ghost draws nothing, and the round buttons are its ends.
4. **Decrement** — The minus button, at the leading edge. Flush glyph on outline, a light circle on ghost. Its state is the designer's to set: unavailable at the minimum.
5. **Entry** — The value, centered between the buttons and at least 32px wide, so the buttons hold still as the count reaches two digits.
6. **Value** — The number, in the field's body type.
7. **Increment** — The plus button, at the trailing edge. Flush glyph on outline, a light circle on ghost. Its state is the designer's to set: unavailable at the maximum.
8. **Focus ring** — The shared focus ring, around the whole row while the value has keyboard focus: on the edge for outline, 2px outside the round buttons for ghost.
9. **Message** (optional) — An optional line below the row, such as the reason for a limit. Off by default.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `appearance` | `outline`, `ghost` | once, when authored | outline draws the field edge around the row, with the minus and plus glyphs inside it. ghost draws no box, and the minus and plus are light circles at each end. |
| `size` | `medium`, `small`, `large` | once, when authored | The row height (36, 44 or 56px), the value type (14, 16 or 18px) and the glyph (20, 20 or 24px). Each button keeps a hit area of at least 44×44px in code at every size. |

### States

`rest`, `focus-visible`, `disabled`

## Usage guidelines

Use for a small whole-number quantity that usually changes by one, such as the item count on a product card or in a bag. Set min and max where they apply, and say why a limit applies in the message. Use ghost where the counter stands on its own beside product text; use outline where it should read as a field. For a number the user types, such as a price or a measurement, use a number input.

### Do

- Set max when stock or a per-order limit exists, and state the limit in the message
- Name the buttons for the item in a list of line items ("Increase quantity, Trail runner")
- Show a button at its limit as unavailable rather than hiding it, so the row does not move
- Leave each button its 44×44px hit area in code, at least 44px apart center to center

### Don't

- Use it for a large or precise number, such as a price or a measurement; use a number input
- Use it for a count shown on another element, such as unread messages; use a badge
- Put the minus and plus buttons in the Tab order; the arrow keys already step the value
- Hide the minus and plus buttons with aria-hidden; they stay in the accessibility tree for pointer and touch users of assistive technology
- Change the value on a mouse wheel or scroll

## Accessibility

- **Keyboard:** The counter is one Tab stop: focus lands on the value. Up and Down Arrow change it by one step, Page Up and Page Down by ten steps, Home and End go to min and max. The minus and plus buttons are for pointer and touch and are outside the Tab order (tabindex="-1").
- **Focus:** One focus ring around the whole row while the value has keyboard focus: on the edge for outline, 2px outside the buttons for ghost. The buttons never take focus from the keyboard, so they draw no ring of their own.
- **Screen readers:** spinbutton (the value), with two buttons outside the Tab order

  The value has role="spinbutton", aria-valuenow, aria-valuemin, aria-valuemax when a max is set, aria-valuetext where the number is shown formatted ("3 items"), and the label as its name, shown or not. Each button has aria-controls pointing at the value and its own name, a verb with the object ("Increase quantity"); in a list of line items, the name includes the item. At a limit the button takes aria-disabled="true" and stays in the accessibility tree. The buttons are not aria-hidden: they keep their names for pointer and touch users of assistive technology, as the ARIA Authoring Practices spin button example does. Every name is translatable, and the row mirrors right to left.

### WCAG

- 4.1.2 Name, Role, Value (the value is a spinbutton named by the label, with its current, minimum and maximum values)
- 2.1.1 Keyboard (the arrow, Page Up, Page Down, Home and End keys change the value; the buttons are not needed)
- 4.1.3 Status Messages (a button press announces the new value through the shared polite live region)
- 1.4.11 Non-text Contrast (the outline edge is the field edge; the glyphs target 3:1 against the page)
- 2.4.7 Focus Visible (the shared focus ring around the row)
- 2.5.8 Target Size (Minimum) (24×24, as intent, through each button's code-side hit area)
- 2.5.5 Target Size (Enhanced) (targets 44×44 for each button at every size, through its code-side hit area)

### Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** The value changes in place with no animation, so nothing changes under prefers-reduced-motion.

## Content guidelines

The label is a noun ("Quantity"). Button names are a verb with the object. A limit message states the limit and why ("Limit 5 per order").

- **Labels:** The label is a noun ("Quantity"). The button names are a verb with the object ("Decrease quantity", "Increase quantity"). A limit message states the limit and its reason ("Limit 5 per order").

## Related components

- **Built from:** `field-label`, `flush-icon-button-neutral`, `focus-ring`, `field-message`
- **Instead, consider:** `select`, `segmented-control`, `text-field`
- **Often used with:** `button`
- **Replaces:**
  - an \<input type="number"> for an item count
  - a select of 1 to 10 for a bag quantity
  - two IconButtons around a \<span> with no spinbutton semantics

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | What is counted, such as "Quantity". The accessible name of the value, always present in code; shown above the counter only with showLabel. |
| `showLabel` | boolean | `false` | no | Shows the label above the counter. Off by default: a counter on a product card or a bag line is usually explained by what sits around it, and the label stays its accessible name either way. |
| `value` | number | — | no | Controlled value; pair it with onChange. |
| `defaultValue` | number | — | no | The starting value when the counter manages its own state. Defaults to min. |
| `onChange` | function | — | no | Called with the new number after each step. Never called with a value outside min and max. |
| `min` | number | `0` | no | The lowest value. At min, the minus button is unavailable. |
| `max` | number | — | no | The highest value, such as the stock or a per-order limit. At max, the plus button is unavailable. No max means no upper limit. |
| `step` | number | `1` | no | How much one press or one arrow key changes the value. |
| `appearance` | enum: 'outline' \| 'ghost' | `outline` | no | outline draws the field edge around the row, with the minus and plus glyphs inside it. ghost draws no box, and the minus and plus are light circles at each end. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The row height (36, 44 or 56px), the value type (14, 16 or 18px) and the glyph (20, 20 or 24px). Each button keeps a hit area of at least 44×44px in code at every size. |
| `message` | string | — | no | Text below the counter, such as the reason for a limit ("Limit 5 per order"). Added to the value's description. |
| `showMessage` | boolean | `false` | no | Shows the message below the counter. Off by default. |
| `decrementLabel` | string | — | no | The minus button's accessible name. Defaults to "Decrease" followed by the label, such as "Decrease quantity". In a list of line items, include the item: "Decrease quantity, Trail runner". |
| `incrementLabel` | string | — | no | The plus button's accessible name. Defaults to "Increase" followed by the label. In a list of line items, include the item. |
| `name` | string | — | no | The form field name: a hidden input carries the value when the counter sits in a form. |
| `disabled` | boolean | `false` | no | Disables the whole counter: the value leaves the Tab order and both buttons are unavailable. |

## Specs

Generated from the plan that builds the design-file component: 18 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/label` | instance | every member |
| `container/control` | frame | every member |
| `container/control/decrement` | instance | every member |
| `container/control/entry` | frame | every member |
| `container/control/entry/value` | text | every member |
| `container/control/increment` | instance | every member |
| `container/message` | instance | every member |
| `container/control/focusRing` | instance | state=focus-visible |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `appearance`.

**size=medium, appearance=outline**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | — |
| `container/control` | `space.0` / `space.150` / `space.0` / `space.150` | — | `size.md.height` | — | — | — |
| `container/control/entry` | `space.0` / `space.050` / `space.0` / `space.050` | — | — | — | 32px (literal) | — |

**size=small, appearance=outline**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | — |
| `container/control` | `space.0` / `space.150` / `space.0` / `space.150` | — | `size.sm.height` | — | — | — |
| `container/control/entry` | `space.0` / `space.050` / `space.0` / `space.050` | — | — | — | 32px (literal) | — |

**size=large, appearance=outline**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | — |
| `container/control` | `space.0` / `space.200` / `space.0` / `space.200` | — | `size.lg.height` | — | — | — |
| `container/control/entry` | `space.0` / `space.100` / `space.0` / `space.100` | — | — | — | 32px (literal) | — |

**size=medium, appearance=ghost**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | — |
| `container/control` | `space.0` | — | `size.md.height` | — | — | — |
| `container/control/entry` | `space.0` / `space.050` / `space.0` / `space.050` | — | — | — | 32px (literal) | — |

**size=small, appearance=ghost**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | — |
| `container/control` | `space.0` | — | `size.sm.height` | — | — | — |
| `container/control/entry` | `space.0` / `space.050` / `space.0` / `space.050` | — | — | — | 32px (literal) | — |

**size=large, appearance=ghost**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | — |
| `container/control` | `space.0` | — | `size.lg.height` | — | — | — |
| `container/control/entry` | `space.0` / `space.100` / `space.0` / `space.100` | — | — | — | 32px (literal) | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/control/entry/value` | `type.body.md.default` |
| size=small | `container/control/entry/value` | `type.body.sm.default` |
| size=large | `container/control/entry/value` | `type.body.lg.default` |

### Color

Keyed by `appearance`, `state`.

**appearance=outline, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/entry/value` | — | — | `color.text.primary` | — |

**appearance=outline, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/entry/value` | — | — | `color.text.primary` | — |

**appearance=outline, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | — | `color.disabled.border` | — | — |
| `container/control/entry/value` | — | — | `color.disabled.text` | — |

**appearance=ghost, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control/entry/value` | — | — | `color.text.primary` | — |

**appearance=ghost, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control/entry/value` | — | — | `color.text.primary` | — |

**appearance=ghost, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control/entry/value` | — | — | `color.disabled.text` | — |

### Nesting and properties

- `container/label` nests `field-label` at `size=medium, emphasis=secondary, weight=regular, state=rest`; `state=disabled` takes `state=disabled`; follows `size`; exposes `emphasis`, `weight`
- `container/control/decrement` nests `flush-icon-button-neutral` at `shape=flush, size=medium, surface=default, state=rest`; `appearance=outline` takes `shape=flush`, `appearance=ghost` takes `shape=round`, `state=disabled` takes `state=disabled`; follows `size`; exposes `state`
- `container/control/increment` nests `flush-icon-button-neutral` at `shape=flush, size=medium, surface=default, state=rest`; `appearance=outline` takes `shape=flush`, `appearance=ghost` takes `shape=round`, `state=disabled` takes `state=disabled`; follows `size`; exposes `state`
- `container/message` nests `field-message` at `status=default`
- `container/control/focusRing` nests `focus-ring` at `surface=default`

| Property | Type | Default |
| --- | --- | --- |
| `value` | text | `1` |
| `label` | boolean | `false` |
| `message` | boolean | `false` |

---

Generated from the `counter` component definition.
