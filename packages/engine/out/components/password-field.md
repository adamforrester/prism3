# PasswordField

> Password field: a text field with a Show button on its label row that reveals the characters.

- **ID:** `password-field`
- **Category:** form
- **Status:** draft
- **Also known as:** password-input, password

## Overview

A single-line field for a secret the user types — a sign-in password, a new password, a PIN typed as text. TextField's anatomy and contract with one added action: a Show/Hide button at the end of the label row that switches the input between masked and plain text. Not for a one-time code in separate boxes (a code input, not built yet), and not for any other single-line text (TextField).

- **Purpose:** Capture a password or other typed secret, with a button that shows or hides the characters.
- **Use when:** Sign-in, sign-up, change-password and PIN fields: any single-line secret the user types.
- **Avoid when:** The text is not a secret (TextField), the code is entered in separate boxes (a code input, not built yet), or the value comes from a known set (Select).

## Anatomy

Shown on the default member: size `medium`, style `outline`, status `default`.

1. **Label row** — The label and the Show/Hide button on one row, the button at the end. The row is as tall as the label's line; the button stretches to it.
2. **Label cell** — The label's cell. It fills the row up to the button, so a long label wraps before it reaches the button.
3. **Label** — The accessible name, composed rather than re-declared. Its size follows the field's, one step below the input; its label text, required marker, emphasis and weight surface on the field. A fix to FieldLabel still reaches this without a copy. Starts secondary and regular. Fills the field's width; a long name wraps at FieldLabel's max width.
4. **Toggle** — The Show/Hide button: a small flush text Button in the emphasis weight, at the end of the label row, at every field size. It reads "Show" on every member; set it to "Hide" for the shown look. Disabled with the field, live when read-only, never colored by status. It stretches to the row, so the row is as tall as the label.
5. **Leading visual** (optional) — An optional purpose glyph before the value, aria-hidden. Absent by default; the caller nominates the icon.
6. **Caret**
7. **Caret end** — The insertion point on the focused field that holds a value, immediately after the value, in the value ink. Code draws the native caret where the user is typing.
8. **Placeholder** — The placeholder, in the placeholder ink (the disabled ink when disabled). Shown on the empty field: rest, hover, focus and disabled. One line; a long one clips at the value row's edge.
9. **Value**
10. **Focus ring**
11. **Message** (optional)

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | TextField's three tiers: the input type and the nested label scale with it. The Show/Hide button is small at every size, so the label row stays one label line tall. Every size keeps the input's 44px target; the button's hit area is 44×44 at medium and large and 24×24 at small, in code. |
| `style` | `outline` | once, when authored | — |
| `status` | `default`, `error`, `warning`, `success` | at runtime | — |

### States

`rest`, `hover`, `pending`, `filled`, `focus-visible`, `focus-visible-filled`, `disabled`, `read-only`, `empty`

## Usage guidelines

Use for a password, a PIN typed as text, or any other secret a user types. The field nests FieldLabel and a Show/Hide button on the label row, the input box below, and FieldMessage under it. Set autoComplete to current-password on a sign-in form and new-password where the user sets one. Put the rules for a new password in helper text or a list under the field.

### Do

- Set autoComplete to current-password or new-password on every password field
- Let the user paste, so a password manager can fill the field
- Return the field to hidden when its form submits
- State the rules for a new password before the user types

### Don't

- Use an eye icon inside the field instead of the Show/Hide button
- Add aria-pressed to the button as well as changing its name
- Use this for a one-time code in separate boxes
- Put the password rules in the placeholder

## Accessibility

- **Keyboard:** Tab reaches the input, then the Show/Hide button. Enter or Space on the button shows or hides the password, and focus stays on the button. Tab order follows the visual order in left-to-right and right-to-left layouts.
- **Focus:** The input takes TextField's focus ring. The button takes Button's own focus ring. Pressing the button never moves focus.
- **Screen readers:** textbox (native \<input type="password">, switched to type="text" while shown), plus a native \<button type="button">

  The host wires the label, aria-describedby and aria-invalid as TextField does. The button carries aria-controls naming the input and a name that changes ("Show password" / "Hide password"), not aria-pressed. Each change is announced once through the app's shared polite live region: "Your password is shown" / "Your password is hidden".

### WCAG

- 1.3.1 Info and Relationships (label, describedby, and the button's aria-controls)
- 1.3.5 Identify Input Purpose (autocomplete current-password or new-password, never off)
- 3.3.1 Error Identification / 3.3.2 Labels or Instructions
- 3.3.8 Accessible Authentication (paste is never blocked, so a password manager can fill the field)
- 4.1.2 Name, Role, Value (the button's name changes Show password / Hide password)
- 1.4.11 Non-text Contrast (TextField's field boundary)
- 2.5.8 Target Size (the button's hit area: 44×44, or 24×24 at small)
- 2.4.13 Focus Appearance (intent)

### Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** Showing or hiding the password is an instant swap of the input type and the button's text, with no animation, so it reads the same under prefers-reduced-motion. The field's own state transitions are TextField's.

## Content guidelines

Label = noun phrase, sentence case, no trailing colon. Button = "Show" / "Hide", with " password" in visually hidden text. Error says what is wrong and how to fix it.

- **Labels:** Noun phrase, sentence case, no trailing colon: "Password", "New password", "Current password".
- **Errors:** What is wrong and how to fix it, such as "Enter a password with at least 12 characters"; never "Invalid password".
- **Empty states:** The label plus an optional placeholder, as on TextField.

## Related components

- **Built from:** `field-label`, `field-message`, `focus-ring`, `button`
- **Instead, consider:** `text-field`
- **Often used with:** `list`
- **Replaces:**
  - eye icon inside a password field
  - password field with no way to show the characters
  - autocomplete="off" on a password

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The visible, persistent label (rendered as FieldLabel), usually "Password" or "New password". Required. Never the placeholder. |
| `value` | string | — | no | Controlled value; pair with onChange. |
| `defaultValue` | string | — | no | Uncontrolled initial value. |
| `onChange` | function | — | no | Change handler (also onBlur / onFocus). |
| `placeholder` | string | — | no | An example only; vanishes on input. The password rules belong in helper text or a list under the field, never here. |
| `helpText` | string \| node | — | no | Persistent guidance (rendered as FieldMessage, default status), wired via aria-describedby. State the rules for a new password here, before the user types. |
| `validation` | enum: 'default' \| 'error' \| 'warning' \| 'success' | `default` | no | The validation state, as on TextField: each non-default status swaps the input border and sets the nested message to the matching status; error also sets aria-invalid. The Show/Hide button never takes the status color. |
| `validationMessage` | string \| node | — | no | The validation text shown at error / warning / success, added to aria-describedby. Say what is wrong and how to fix it (SC 3.3.3). |
| `showMessage` | boolean | `true` | no | Whether the composed FieldMessage is shown. On by default; turning it off hides the message entirely. Never hides a message the field needs. |
| `required` | boolean | `false` | no | Sets required / aria-required, and turns on the FieldLabel's required marker. |
| `disabled` | boolean | `false` | no | Native disabled. Disables the Show/Hide button with the field. |
| `readOnly` | boolean | `false` | no | Focusable, copyable and submitted, and passes contrast. The Show/Hide button stays live, so a read-only value can still be shown. |
| `autoComplete` | enum: 'current-password' \| 'new-password' | — | yes | Required (SC 1.3.5): current-password on a sign-in form, new-password where the user sets one, so a password manager fills or offers to generate it. Never off. |
| `leadingIcon` | slot | — | no | An optional leading glyph before the value, aria-hidden and never the accessible name. Hidden by default; the file nominates the swap target. |
| `isPending` | boolean | `false` | no | Async validation in progress; sets aria-busy; does not block typing. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | TextField's three tiers: the input type and the nested label scale with it. The Show/Hide button is small at every size, so the label row stays one label line tall. Every size keeps the input's 44px target; the button's hit area is 44×44 at medium and large and 24×24 at small, in code. |
| `id` | string | — | no | Wiring + form submission; auto-generated with useId if omitted. The Show/Hide button's aria-controls names it. |
| `name` | string | — | no | A real \<input name>, so the field works in a native \<form> and a password manager recognizes it. |

---

Generated from the `password-field` component definition.
