# CodeInput

> Field for a one-time code: one input, shown as a row of cells, one per character.

A field for a short one-time code sent by text message, email or an authenticator app: four to eight characters. It shows the code as a row of cells, so the user sees how long the code is and how far they have got. Underneath is one input holding one string, so pasting the code or filling it from the message fills every cell. A label names it and a message under it says how many characters to enter and where the code was sent. Not for a code of unknown length or one inside a longer form (TextField with one-time-code autocomplete), and not for a password or a PIN the user keeps (PasswordField).

- **ID:** `code-input`
- **Category:** form
- **Status:** draft
- **Also known as:** otp-input, one-time-code, verification-code, pin-input

## Usage

Use for a short, fixed-length code sent by text message, email or an authenticator app. Say in the helper text how many characters the code has and where it was sent. For a code of variable length, use TextField with one-time-code autocomplete.

### Do

- Accept a pasted or autofilled code in full, ignoring spaces and hyphens
- Say which error it is: too few digits, wrong code or expired code
- Keep the resend link and any expiry time next to the field

### Don't

- Build one input per cell: paste and autofill then fill one cell
- Block paste or turn off autocomplete
- Submit on the last digit without announcing the result

### Content guidelines

Label = noun phrase, sentence case. Helper = the length and where the code went. Error = which case it is and what to do.

### Copy patterns

- **Labels:** Noun phrase, sentence case: "Verification code". Never "OTP".
- **Errors:** Say which case it is: "Enter all 6 digits", "That code is wrong. Check the latest message and try again", "That code has expired. We sent a new one".
- **Empty states:** The helper text says how many characters and where the code was sent: "Enter the 6-digit code sent to your phone."

## Choosing it

- **Purpose:** Capture a short one-time code in one input, drawn as a row of cells.
- **Use when:** A step whose job is a fixed-length code of four to eight characters sent by text message, email or an authenticator app.
- **Avoid when:** The code length is unknown or the code sits inside a longer form (TextField with one-time-code autocomplete), the value is a password or a kept PIN (PasswordField), or it is a quantity (a number input, not built yet).
- **Often used with:** `code-input-cell`, `field-label`, `field-message`, `button`, `link`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The visible label (rendered as FieldLabel), such as "Verification code". Required. |
| `length` | number | `6` | no | How many characters the code has, 4 to 8. Draws that many cells and caps the value at that length. |
| `value` | string | — | no | Controlled value; pair with onChange. |
| `defaultValue` | string | — | no | Uncontrolled initial value. |
| `onChange` | function | — | no | Called with the value after spaces and hyphens are removed. |
| `onComplete` | function | — | no | Called once with the value when it reaches `length`, and again only if the value changes and reaches it again. The page decides whether to submit. |
| `inputMode` | enum: 'numeric' \| 'text' | `numeric` | no | numeric for a code of digits, text for a code with letters. |
| `autoComplete` | string | `one-time-code` | no | one-time-code by default, so the phone offers the code from the message. Never off. |
| `helpText` | string \| node | — | no | Persistent guidance (rendered as FieldMessage): how many characters and where the code was sent. |
| `validation` | enum: 'default' \| 'error' | `default` | no | error swaps every cell to the danger border, sets the message to the error status and sets aria-invalid. |
| `validationMessage` | string \| node | — | no | The error text: too few characters, a wrong code or an expired code, each said plainly. |
| `showMessage` | boolean | `true` | no | Whether the composed FieldMessage is shown. On by default. |
| `size` | enum: 'medium' \| 'small' \| 'large' \| 'xlarge' | `medium` | no | The cell size: small 44×44 with a 16px character, medium 48×56 with 20px, large 56×64 with 24px, xlarge 68×72 with 40px, meant for four-character codes. |
| `width` | enum: 'auto' \| 'full' | `auto` | no | auto: each cell at its size. full: the row spans its container and the cells share it, shrinking to 32px wide when they must. |
| `disabled` | boolean | `false` | no | Native disabled. |
| `isPending` | boolean | `false` | no | The code is being checked; sets aria-busy and keeps the input editable. |
| `name` | string | — | no | A real \<input name>, so the field works in a native \<form>. |
| `id` | string | — | no | Wiring; generated if omitted. |

## States

`rest`, `hover`, `pending`, `filled`, `focus-visible`, `focus-visible-filled`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `medium`, `small`, `large`, `xlarge` | once, when authored |
| `status` | `default`, `error` | at runtime |

## Accessibility

- **Role:** textbox (one native \<input>); the cells are aria-hidden
- **WCAG:**
  - 1.3.1 Info and Relationships (one labeled input, the helper and error in aria-describedby)
  - 1.3.5 Identify Input Purpose (autocomplete one-time-code)
  - 3.3.1 Error Identification / 3.3.3 Error Suggestion (the error says which case it is)
  - 3.3.8 Accessible Authentication (paste and the phone's code suggestion fill the whole code)
  - 3.2.2 On Input (no auto-submit)
  - 4.1.2 Name, Role, Value (one textbox, one name, one value)
  - 1.4.11 Non-text Contrast (targets 3:1 for the cell border)
  - 2.4.13 Focus Appearance (the ring on the active cell, as intent)
  - 2.5.8 Target Size (the row of cells is one target)
- **Keyboard:** One Tab stop. Typing fills the next cell; Backspace removes the last character; arrow keys, Home and End move the caret, and the active cell follows it. Paste fills every cell.
- **Focus:** Focus stays on the one input. The active cell, where the next character goes, shows the focus ring.
- **ARIA:** aria-describedby names the helper and any error, aria-invalid is set in error, and aria-busy while the code is checked. No aria-label on the input: it would hide the real value. Every name is translatable; the cell row stays left to right in every locale.

## Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** The active cell moves at once and the caret does not blink.

## Composition

- **Composes with:** `field-label`, `code-input-cell`, `field-message`
- **Alternative to:** `text-field`, `password-field`
- **Replaces:**
  - one input per character of a one-time code
  - a code field with paste blocked
  - auto-submit on the last digit

---

Generated from the `code-input` component definition.
