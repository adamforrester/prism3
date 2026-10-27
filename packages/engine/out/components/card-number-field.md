# CardNumberField

> Card number field: a text field with the card network's tile at its trailing edge.

- **ID:** `card-number-field`
- **Category:** form
- **Status:** draft
- **Also known as:** card-number-input, credit-card-number, card-number

## Overview

A single-line field for a payment card's number. TextField's anatomy and contract, with the card network's tile at the trailing edge of the box: a generic card until the number shows the network, then that network's tile, in its own colors. The network is also stated in text, so the tile is decorative. Ask for the expiration date and the security code in their own text fields beside it, never in this box.

- **Purpose:** Capture a payment card's number, showing the detected card network's tile and stating the network in text.
- **Use when:** The card number in a checkout or a saved-card form, beside text fields for the expiration date and the security code.
- **Avoid when:** The value is not a card number (TextField), the card is already saved (show its last four digits as text), or the payment is a wallet or express checkout (a wallet button, not built yet). Never for the expiration date or the security code (TextField with autocomplete cc-exp or cc-csc).

## Anatomy

Shown on the default member: size `medium`, style `outline`, status `default`.

1. **Label** — The accessible name, composed rather than re-declared. Its size follows the field's, one step below the input; its label text, required marker, emphasis and weight surface on the text-field. A fix to FieldLabel still reaches this without a copy. Starts secondary and regular. Fills the field's width; a long name wraps at FieldLabel's max width.
2. **Leading visual** (optional) — An optional purpose glyph before the value, aria-hidden. Absent by default; the caller nominates the icon.
3. **Caret**
4. **Caret end** — The insertion point on the focused field that holds a value, immediately after the value, in the value ink. Code draws the native caret where the user is typing.
5. **Placeholder** — The placeholder, in the placeholder ink (the disabled ink when disabled). Shown on the empty field: rest, hover, focus and disabled. One line; a long one clips at the value row's edge.
6. **Value**
7. **Card mark** (optional) — The card network's tile at the trailing edge, in its own colors: the generic tile until the network is known, then that network's. As tall as an icon, with the tile's own proportion. Decorative; the network is stated in text.
8. **Focus ring**
9. **Message** (optional)

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | TextField's three tiers: the input type and the nested label scale with it. The tile is 20px tall at small and medium and 24px at large, its width from the tile's proportion. Every size keeps the input's 44px target. |
| `style` | `outline` | once, when authored | — |
| `status` | `default`, `error`, `warning`, `success` | at runtime | — |

### States

`rest`, `hover`, `pending`, `filled`, `focus-visible`, `focus-visible-filled`, `disabled`, `read-only`, `empty`

## Usage guidelines

Use for a payment card's number in a checkout or a saved-card form. The field nests FieldLabel above, the input box with the card network's tile at its trailing edge, and FieldMessage below. Set brand from the card-type detection, or from the payment provider's brand event, and brandName to the network's name, so the network is stated in text as well as shown. Ask for the expiration date and the security code in their own text fields, with autocomplete cc-exp and cc-csc. When the payment provider hosts the input, pass its mount point with renderInput and let the field draw everything around it.

### Do

- Let the leading digits set the network, and swap the tile in place
- State the detected network in text with brandName, not by the tile alone
- Group the digits as the user types, and keep the value digits only
- Use the payment provider's hosted input in production, with renderInput
- Warn, rather than block, when the number fails the checksum

### Don't

- Recolor, dim or redraw the tile, at any state
- Add a card-type select: the digits tell the network
- Put the expiration date or the security code in this box
- Use type="number" or turn off autocomplete
- Move focus to the next field when the number is complete

## Accessibility

- **Keyboard:** Native text editing. Tab reaches the input; the tile is not a stop. Focus never moves on its own when the number is complete.
- **Focus:** The input takes TextField's focus ring. With a hosted input, the ring follows the provider's focus event, and clicking the label focuses the provider's input.
- **Screen readers:** textbox (a native \<input inputmode="numeric">, or the payment provider's hosted input inside its frame)

  The host wires the label, aria-describedby and aria-invalid as TextField does. The tile is aria-hidden. The detected network's name is a visually hidden description on the input, added to aria-describedby and never a live region, so typing is not interrupted by speech. Reformatting is not announced. With a hosted input, the label text is also passed to the provider's own label option, because a label outside the frame cannot name the input inside it.

### WCAG

- 1.3.5 Identify Input Purpose (autocomplete cc-number, never off)
- 1.3.1 Info and Relationships (label, describedby and the hidden network name)
- 1.4.1 Use of Color (the network is stated in text, never by the tile alone)
- 3.2.2 On Input (no auto-advance when the number is complete)
- 3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion
- 1.4.11 Non-text Contrast (TextField's field boundary)
- 2.4.13 Focus Appearance (intent)

### Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** The tile swaps in place with no animation when the network is detected, so it reads the same under prefers-reduced-motion. The field's own state transitions are TextField's.

## Content guidelines

Label = "Card number", sentence case, no trailing colon. Placeholder = a format example only. Helper = "The card type shows when you start typing." Error says what is wrong and how to fix it.

- **Labels:** Noun phrase, sentence case, no trailing colon: "Card number". Its neighbors spell out their names too: "Expiration date" and "Security code", never an acronym.
- **Errors:** What is wrong and how to fix it: "Enter the card number." · "Check the card number. It doesn't match a valid card." · "This card type isn't accepted. Use Visa, Mastercard or American Express." (the accepted list, from the app).
- **Empty states:** The label plus an optional format example as the placeholder, "1234 1234 1234 1234", and the generic tile.

## Related components

- **Built from:** `field-label`, `field-message`, `focus-ring`
- **Instead, consider:** `text-field`
- **Often used with:** `text-field`, `brand-mark`, `button`
- **Replaces:**
  - a card number in a plain text input with no card type
  - a manual card-type select
  - number, expiration and security code packed into one box
  - type="number" on a card number

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The visible, persistent label (rendered as FieldLabel), usually "Card number". Required. Never the placeholder. |
| `value` | string | — | no | Controlled value: the digits only, without the spaces the field shows between groups. Pair with onChange. |
| `defaultValue` | string | — | no | Uncontrolled initial value, digits only. |
| `onChange` | function | — | no | Change handler (also onBlur / onFocus). Receives the digits without the group spaces. |
| `placeholder` | string | — | no | A format example only, such as "1234 1234 1234 1234". It vanishes on input and never replaces the label. |
| `helpText` | string \| node | — | no | Persistent guidance (rendered as FieldMessage, default status), wired via aria-describedby, such as "The card type shows when you start typing." |
| `validation` | enum: 'default' \| 'error' \| 'warning' \| 'success' | `default` | no | The validation state, as on TextField: each non-default status swaps the input border and sets the nested message to the matching status; error also sets aria-invalid. A number that fails the checksum is a warning, not an error, because some valid cards fail it. The tile never takes the status color. |
| `validationMessage` | string \| node | — | no | The validation text shown at error / warning / success, added to aria-describedby. Say what is wrong and how to fix it, such as "Enter the card number." |
| `showMessage` | boolean | `false` | no | Whether the composed FieldMessage is shown. Off by default; turn it on to render the helper or validation message. Never hides a message the field needs. |
| `required` | boolean | `false` | no | Sets required / aria-required, and turns on the FieldLabel's required marker. |
| `disabled` | boolean | `false` | no | Native disabled. A disabled field also disables a hosted input. The tile keeps its own colors. |
| `readOnly` | boolean | `false` | no | Focusable, copyable and submitted, and passes contrast, as on TextField. For a saved card, show the last four digits in a read-only display instead of this field. |
| `brand` | enum: 'amex' \| 'generic' \| 'mastercard' \| 'visa' | `generic` | no | The card network the field shows, from the payment tiles in the mark set: generic until the leading digits tell the network, then that network's tile. Set it from the card-type detection, or from the payment provider's brand event when the provider hosts the input. A network added to the mark set becomes a value here; no other kind of mark can be named. |
| `brandName` | string | — | no | The detected network's name in the app's own words, such as "Visa". It goes in a visually hidden description on the input, linked by aria-describedby, so the network is never conveyed by the tile alone. Leave it empty while brand is generic. |
| `showCardMark` | boolean | `true` | no | Whether the tile shows. On by default; the field shows the generic tile before it knows the network. |
| `renderInput` | function | — | no | Returns the payment provider's mount point, the element its hosted input mounts into. With it, the field draws the label, box, tile, focus ring and message around the provider's input and never renders the card number input itself. Without it, the field renders a native input, which puts the page outside the lightest card-data compliance scope. |
| `isPending` | boolean | `false` | no | Async validation in progress; sets aria-busy; does not block typing. |
| `leadingIcon` | slot | — | no | An optional leading glyph before the value, aria-hidden and never the accessible name. Hidden by default; the file nominates the swap target. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | TextField's three tiers: the input type and the nested label scale with it. The tile is 20px tall at small and medium and 24px at large, its width from the tile's proportion. Every size keeps the input's 44px target. |
| `id` | string | — | no | Wiring + form submission; auto-generated with useId if omitted, tying label to input and the aria-describedby chain. |
| `name` | string | — | no | A real \<input name> in the native mode, so the field works in a native \<form>. A hosted input has no name on the page. |

## Specs

Generated from the plan that builds the design-file component: 84 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/label` | instance | every member |
| `container/control` | frame | every member |
| `container/control/content` | frame | every member |
| `container/control/content/leadingVisual` | swap | every member |
| `container/control/content/entry` | frame | every member |
| `container/control/content/entry/placeholder` | text | state=rest or hover or focus-visible or disabled |
| `container/control/cardMark` | swap | every member |
| `container/message` | instance | every member |
| `container/control/content/entry/value` | text | state=filled or focus-visible-filled or read-only |
| `container/control/content/entry/caret` | frame | state=focus-visible |
| `container/control/focusRing` | instance | state=focus-visible or focus-visible-filled |
| `container/control/content/entry/caretEnd` | frame | state=focus-visible-filled |

Code-only states, with no design-file member: `pending`, `empty`.

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/control` | `space.100` / `space.200` / `space.100` / `space.200` | `space.100` | `size.md.min-height` | — | 120px (literal) | — |
| `container/control/content` | — | `space.100` | — | — | — | — |
| `container/control/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/cardMark` | — | — | `icon.size.sm` | — | — | — |
| `container/control/content/entry/caret` | — | — | `control.size.md.line-box` | `border-width.hairline` | — | — |
| `container/control/content/entry/caretEnd` | — | — | `control.size.md.line-box` | `border-width.hairline` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/control` | `space.075` / `space.200` / `space.075` / `space.200` | `space.100` | `size.md.min-height` | — | 120px (literal) | — |
| `container/control/content` | — | `space.100` | — | — | — | — |
| `container/control/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/cardMark` | — | — | `icon.size.sm` | — | — | — |
| `container/control/content/entry/caret` | — | — | `control.size.sm.line-box` | `border-width.hairline` | — | — |
| `container/control/content/entry/caretEnd` | — | — | `control.size.sm.line-box` | `border-width.hairline` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/control` | `space.100` / `space.300` / `space.100` / `space.300` | `space.100` | `size.lg.height` | — | 120px (literal) | — |
| `container/control/content` | — | `space.100` | — | — | — | — |
| `container/control/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/cardMark` | — | — | `icon.size.md` | — | — | — |
| `container/control/content/entry/caret` | — | — | `control.size.lg.line-box` | `border-width.hairline` | — | — |
| `container/control/content/entry/caretEnd` | — | — | `control.size.lg.line-box` | `border-width.hairline` | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/control/content/entry/placeholder` | `type.body.md.default` |
| size=medium | `container/control/content/entry/value` | `type.body.md.default` |
| size=small | `container/control/content/entry/placeholder` | `type.body.sm.default` |
| size=small | `container/control/content/entry/value` | `type.body.sm.default` |
| size=large | `container/control/content/entry/placeholder` | `type.body.lg.default` |
| size=large | `container/control/content/entry/value` | `type.body.lg.default` |

### Color

Keyed by `status`, `state`.

**status=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.hover` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=default, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |

**status=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.focus` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=default, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.focus` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |

**status=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |

**status=default, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |

**status=error, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=error, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=error, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |

**status=error, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=error, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |

**status=error, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |

**status=error, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |

**status=warning, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=warning, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=warning, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |

**status=warning, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=warning, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |

**status=warning, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |

**status=warning, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |

**status=success, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=success, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=success, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |

**status=success, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |

**status=success, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |

**status=success, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |

**status=success, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |

### Nesting and properties

- `container/label` nests `field-label` at `size=medium, emphasis=secondary, weight=regular, state=rest`; `state=disabled` takes `state=disabled`; follows `size`; exposes `emphasis`, `weight`
- `container/control/content/leadingVisual` is a swap slot, property `↳ swap leading icon`, shown by `leading icon`
- `container/control/cardMark` is a swap slot, property `↳ swap card mark`, shown by `card mark`, default `card/generic`
- `container/message` nests `field-message` at `status=default`; follows `status`
- `container/control/focusRing` nests `focus-ring` at `surface=default`

| Property | Type | Default |
| --- | --- | --- |
| `placeholder` | text | `Placeholder` |
| `value` | text | `1234 5678 9012 3456` |
| `leading icon` | boolean | `false` |
| `↳ swap leading icon` | instance swap | — |
| `card mark` | boolean | `true` |
| `↳ swap card mark` | instance swap | — |
| `message` | boolean | `false` |

---

Generated from the `card-number-field` component definition.
