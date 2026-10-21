# CodeInput.Cell

> One cell of a code input: a box holding one character of the code. Used only inside a code input.

- **ID:** `code-input-cell`
- **Category:** form
- **Status:** draft
- **Also known as:** code-cell, otp-cell

## Overview

One cell of a code input: a box that shows one character of the code. It is drawn, not typed into: the code input holds one real input, and each cell shows the character at its place. The active cell, where the next character goes, carries the focus ring and the caret. A cell in error takes the danger border. Used only inside a code input, which sets every cell from its input.

- **Purpose:** Show one character of a one-time code inside a code input.
- **Use when:** Only as a child of CodeInput.
- **Avoid when:** Anywhere outside a code input: a single character field is a text field, and a code is always one code input.

## Anatomy

Shown on the default member: size `medium`.

1. **Container** — The cell: one box per character, as wide and tall as its size sets. Set to fill, it shares the row with the other cells and stops at 32px wide.
2. **Content** — Centers the character, or the caret on the active empty cell.
3. **Caret** — The insertion point on the active empty cell, in the character ink, as tall as the character.
4. **Digit** — The character, centered on its figure: its box is trimmed to the cap height and the baseline. Tabular figures in code, so every digit is one width.
5. **Focus ring** — The shared focus ring on the active cell, where the next character goes.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large`, `xlarge` | once, when authored | The cell size and its character size. Set by the code input. |

### States

`rest`, `hover`, `filled`, `focus-visible`, `focus-visible-filled`, `disabled`, `error`

## Usage guidelines

Use inside CodeInput only, one cell per character of the code. In a design, add or remove cells in the code input's cell slot and set each cell's state to match the field: error cells when the field is in error, disabled cells when it is disabled. In code, the code input sets every cell.

### Do

- Set every cell to error when the code input is in error
- Set every cell to disabled when the code input is disabled

### Don't

- Place a cell outside a code input
- Build a code input from separate inputs, one per cell

## Accessibility

- **Keyboard:** None of its own: the code input's input takes every key.
- **Focus:** Never focused itself. While the code input's input has focus, the active cell shows the focus ring.
- **Screen readers:** none: an aria-hidden drawing; the code input's one input carries the role, the name and the value

  aria-hidden="true". A screen reader meets the code input's one input and its whole value, never a cell.

### WCAG

- 1.4.11 Non-text Contrast (targets 3:1 for the cell border against the page)
- 2.4.7 Focus Visible (the ring on the active cell)
- 2.4.13 Focus Appearance (the shared focus ring, as intent)

### Motion

- **Enter:** None.
- **Exit:** None.
- **Reduced motion:** The caret does not blink; the ring and borders change at once, with no transition.

## Content guidelines

One character per cell.

## Related components

- **Built from:** `focus-ring`
- **Often used with:** `code-input`
- **Replaces:**
  - one input per character of a one-time code

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `digit` | string | — | no | The character this cell shows: one digit, or one letter in a code that allows letters. Empty until the user reaches it. |
| `size` | enum: 'small' \| 'medium' \| 'large' \| 'xlarge' | `medium` | no | The cell size and its character size. Set by the code input. |
| `isActive` | boolean | `false` | no | Whether this is the cell the next character goes into while the input has focus. Set by the code input. |
| `isInvalid` | boolean | `false` | no | Whether the code input is in error. Set by the code input. |
| `disabled` | boolean | `false` | no | Whether the code input is disabled. Set by the code input. |

## Specs

Generated from the plan that builds the design-file component: 28 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/content` | frame | every member |
| `container/content/digit` | text | state=filled or focus-visible-filled or error |
| `container/content/caret` | frame | state=focus-visible |
| `container/focusRing` | instance | state=focus-visible or focus-visible-filled |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | 32px (literal) | build width 48px (literal); build height 56px (literal) |
| `container/content` | `space.0` | — | — | — | — | — |
| `container/content/caret` | — | — | `icon.size.sm` | `border-width.hairline` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | 32px (literal) | build width 44px (literal); build height 44px (literal) |
| `container/content` | `space.0` | — | — | — | — | — |
| `container/content/caret` | — | — | `icon.size.xs` | `border-width.hairline` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | 32px (literal) | build width 56px (literal); build height 64px (literal) |
| `container/content` | `space.0` | — | — | — | — | — |
| `container/content/caret` | — | — | `icon.size.md` | `border-width.hairline` | — | — |

**size=xlarge**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | 32px (literal) | build width 68px (literal); build height 72px (literal) |
| `container/content` | `space.0` | — | — | — | — | — |
| `container/content/caret` | — | — | `icon.size.xl` | `border-width.hairline` | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/content/digit` | `type.title.sm.strong` |
| size=small | `container/content/digit` | `type.body.md.default` |
| size=large | `container/content/digit` | `type.title.md.strong` |
| size=xlarge | `container/content/digit` | `type.title.2xl.strong` |

### Color

Keyed by `state`.

**state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.field.fill` | `color.field.border.rest` | — | — |

**state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | `color.field.border.hover` | — | — |

**state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/content/digit` | — | — | `color.text.primary` | — |

**state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.field.fill` | `color.border.focus` | — | — |
| `container/content/caret` | `color.text.primary` | — | — | — |

**state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.field.fill` | `color.border.focus` | — | — |
| `container/content/digit` | — | — | `color.text.primary` | — |

**state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.disabled.fill` | `color.disabled.border` | — | — |

**state=error**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.field.fill` | `color.border.danger` | — | — |
| `container/content/digit` | — | — | `color.text.primary` | — |

### Nesting and properties

- `container/focusRing` nests `focus-ring` at `surface=default`

| Property | Type | Default |
| --- | --- | --- |
| `digit` | text | `7` |

---

Generated from the `code-input-cell` component definition.
