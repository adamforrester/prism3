# CodeInput.Cell

> One cell of a code input: a box holding one character of the code. Used only inside a code input.

One cell of a code input: a box that shows one character of the code. It is drawn, not typed into: the code input holds one real input, and each cell shows the character at its place. The active cell, where the next character goes, carries the focus ring and the caret. A cell in error takes the danger border. Used only inside a code input, which sets every cell from its input.

- **ID:** `code-input-cell`
- **Category:** form
- **Status:** draft
- **Also known as:** code-cell, otp-cell

## Usage

Use inside CodeInput only, one cell per character of the code. In a design, add or remove cells in the code input's cell slot and set each cell's state to match the field: error cells when the field is in error, disabled cells when it is disabled. In code, the code input sets every cell.

### Do

- Set every cell to error when the code input is in error
- Set every cell to disabled when the code input is disabled

### Don't

- Place a cell outside a code input
- Build a code input from separate inputs, one per cell

### Content guidelines

One character per cell.

## Choosing it

- **Purpose:** Show one character of a one-time code inside a code input.
- **Use when:** Only as a child of CodeInput.
- **Avoid when:** Anywhere outside a code input: a single character field is a text field, and a code is always one code input.
- **Often used with:** `code-input`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `digit` | string | — | no | The character this cell shows: one digit, or one letter in a code that allows letters. Empty until the user reaches it. |
| `size` | enum: 'small' \| 'medium' \| 'large' \| 'xlarge' | `medium` | no | The cell size and its character size. Set by the code input. |
| `isActive` | boolean | `false` | no | Whether this is the cell the next character goes into while the input has focus. Set by the code input. |
| `isInvalid` | boolean | `false` | no | Whether the code input is in error. Set by the code input. |
| `disabled` | boolean | `false` | no | Whether the code input is disabled. Set by the code input. |

## States

`rest`, `hover`, `filled`, `focus-visible`, `focus-visible-filled`, `disabled`, `error`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `medium`, `small`, `large`, `xlarge` | once, when authored |

## Accessibility

- **Role:** none: an aria-hidden drawing; the code input's one input carries the role, the name and the value
- **WCAG:**
  - 1.4.11 Non-text Contrast (targets 3:1 for the cell border against the page)
  - 2.4.7 Focus Visible (the ring on the active cell)
  - 2.4.13 Focus Appearance (the shared focus ring, as intent)
- **Keyboard:** None of its own: the code input's input takes every key.
- **Focus:** Never focused itself. While the code input's input has focus, the active cell shows the focus ring.
- **ARIA:** aria-hidden="true". A screen reader meets the code input's one input and its whole value, never a cell.

## Motion

- **Enter:** None.
- **Exit:** None.
- **Reduced motion:** The caret does not blink; the ring and borders change at once, with no transition.

## Composition

- **Composes with:** `focus-ring`
- **Replaces:**
  - one input per character of a one-time code

---

Generated from the `code-input-cell` component definition.
