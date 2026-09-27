# Select

> Closed control for picking one value from a known set. The menu is the platform's.

A control for choosing ONE value from a known, bounded set — the closed, native-first field: label, a bordered control showing the current value or a placeholder with a trailing chevron, and a helper/validation message below. Composes the shared FieldLabel and FieldMessage. The open menu is the platform's (native or a separate listbox), not modeled here. Not free-form text (TextField), not any-number-from-a-set (Checkbox group), not a small always-visible set (Radio / SegmentedControl), not suggestion-backed typing (Combobox).

- **ID:** `select`
- **Category:** form
- **Status:** draft
- **Also known as:** dropdown, combobox, picker, select-menu, listbox

## Usage

Use to choose ONE value from a known, bounded set where the options are not worth showing all at once. Always render a visible label (the nested FieldLabel); show the constraint in helper text before failure; drive the nested FieldMessage's status from the validation state. The open menu is the platform's — prefer a native \<select> where its OS menu is acceptable. Past roughly 7-10 options a filtering combobox (not built yet) scans better; below a handful an always-visible Radio.Group may read better.

### Do

- Render a visible, associated label (FieldLabel) above the control
- Show a muted placeholder as a prompt, never as the label or a real option
- Drive validation through the status axis so the border and the nested message agree
- Prefer the native control where its OS menu is acceptable — the listbox contract is correct for free

### Don't

- Use the placeholder as the label, or put a real, selectable option in it
- Model the open menu as a state of this control — it is a separate listbox / popover surface
- Signal a status with the border color alone — the nested message carries the text + icon
- Reach for a select when the user types to filter (a combobox, not built yet) or the set is two mutually-exclusive options (Radio.Group)

### Content guidelines

Label = noun phrase, sentence case, no trailing colon. Placeholder = a prompt ("Select an option"). Error says what + how to fix, never "Invalid".

### Copy patterns

- **Labels:** Noun phrase, sentence case, ≤3 words, no trailing colon; never the placeholder (see field-label).
- **Errors:** What is wrong AND how to fix it (SC 3.3.3); icon + text, not color-only (carried by the nested field-message).

## Choosing it

- **Purpose:** Choose one value from a known, bounded set, with an associated label and helper/validation message, modeling the closed control.
- **Use when:** One-of-a-known-set choices too numerous or space-costly to show all at once — a country, a status, a category.
- **Avoid when:** The value is free-form text (TextField), the user types to filter a suggestion list (a combobox, not built yet — a different ARIA contract), any number may be chosen (Checkbox.Group), the set is small and worth showing at once (Radio.Group, or a segmented control, not built yet), or the choice is a binary that takes effect instantly (Switch.Row).
- **Often used with:** `field-label`, `field-message`, `focus-ring`, `icon`
- **Keywords:** select, dropdown, picker, combobox, menu, choose, option list
- **Generation priority:** 2

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The visible, persistent label, rendered as the nested FieldLabel. Required — a select always carries a programmatic name. Never the placeholder. |
| `value` | string | — | no | The displayed text — the selected option's label, or the placeholder when nothing is chosen. Controlled: pair with onChange. When it holds the placeholder the ink is the muted placeholder role; a chosen value shows the full-contrast value ink — the same empty-vs-value polarity text-field uses. This is an internal, content-driven distinction, not a variant a designer picks. |
| `placeholder` | string | — | no | The prompt shown before a choice is made ("Select an option"). Muted, and never load-bearing — it is not the label and it vanishes once a value is chosen. |
| `options` | array | — | no | The bounded set of choices. Past roughly 7-10 options a filtering combobox (not built yet) scans better; below a handful an always-visible Radio.Group may read better. |
| `onChange` | function | — | no | Fires with the newly chosen value (also onBlur / onFocus). A controlled value with no onChange is read-only by accident. |
| `helpText` | string \| node | — | no | Persistent guidance, rendered as the nested FieldMessage in its default status; wired via aria-describedby. Show the constraint before failure. |
| `validation` | enum: 'default' \| 'error' \| 'warning' \| 'success' | `default` | no | The validation state. Each non-default status swaps the control border to its own boundary (border-only — `error` → danger, `warning` → warning, `success` → success) AND sets the nested message to the matching status; `default` is neutral. The values align with FieldMessage's status axis, so this drives the nested message directly. |
| `validationMessage` | string \| node | — | no | The validation text shown at error / warning / success. For error, say what is wrong AND how to fix it (SC 3.3.3), never "Invalid". |
| `showMessage` | boolean | `true` | no | Whether the composed FieldMessage is shown. ON — the default — renders the helper / validation message below the control; turning it off hides the message entirely (a select with no helper or validation text). Never hides a message the field needs: an error still sets aria-invalid and the message carries the reason, so hide it only when there is genuinely nothing to say. |
| `leadingIcon` | slot | — | no | An optional leading glyph before the value (a category or status mark), aria-hidden. Hidden by default; the file nominates the swap target. Signals the field's purpose; validation never mutates it. |
| `required` | boolean | `false` | no | Sets required / aria-required, and turns on the FieldLabel's required marker. |
| `disabled` | boolean | `false` | no | Native disabled — removed from tab order, not submitted, contrast-exempt. Reserve for a choice irrelevant in the current state. |
| `id` | string | — | no | Wiring + form submission; auto-generated with useId if omitted, tying the label to the control and stitching the aria-describedby chain to the message. |
| `name` | string | — | no | A real control name so the field works uncontrolled, in a native form, and with Server Actions. |

## States

`rest`, `hover`, `filled`, `focus-visible`, `disabled`, `empty`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `status` | `default`, `error`, `warning`, `success` | at runtime |

## Accessibility

- **Role:** combobox / listbox (native \<select>, or a custom control with aria-expanded + aria-haspopup="listbox")
- **WCAG:**
  - 1.3.1 Info and Relationships (label + describedby association)
  - 3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion
  - 1.4.3 Contrast (value + placeholder) / 1.4.11 Non-text Contrast (control boundary ≥3:1) / 2.4.13 Focus Appearance
  - 4.1.2 Name/Role/Value (role, and the expanded state of the popup) / 2.5.8 Target Size
- **Keyboard:** The closed control is one Tab stop; Space / Enter / Down open it. Inside the open list (not modeled here) arrows move, typeahead jumps, Enter commits, Escape closes and returns focus to the control.
- **Focus:** :focus-visible ring on the control, boundary ≥3:1 (1.4.11 / 2.4.13). The control is the focus target; forwardRef reaches it so a form can focus the first invalid field on submit.
- **ARIA:** The host generates ids, ties the label to the control and the message into aria-describedby, and sets aria-invalid on error. The placeholder is NOT the accessible name. A custom control mirrors the native listbox contract (aria-expanded, aria-activedescendant); prefer the native \<select> where its OS menu is acceptable, because it is correct for free.

## Composition

- **Composes with:** `field-label`, `field-message`, `focus-ring`, `icon`
- **Alternative to:** `text-field`, `radio-row`, `checkbox-group`
- **Planned:** `form`, `menu`, `combobox`, `segmented-control`
- **Replaces:**
  - a bare \<select> with no label wiring
  - placeholder-as-label

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- the OPEN MENU / listbox — the whole option list is the platform's (a native `<select>`'s popup is OS-drawn; a custom one is a separate listbox/popover surface). This def models the CLOSED control only, so there is no `expanded` state and no option-list anatomy. A designer building the open menu reaches for a menu/listbox component, not a variant of this one.
- the label / describedby WIRING — the host generates ids (useId), ties the FieldLabel to the control, stitches the FieldMessage into aria-describedby, and sets aria-invalid on error. Figma has no accessibility tree and no node-to-node reference, so the nested label and message sit near the control and are associated by proximity alone (the same ceiling `field-label` and `field-message` each hit). aria-expanded / aria-haspopup describe the popup this def does not model.
- empty — a real STATE in code (nothing is chosen, so the control shows the placeholder), NOT a Figma variant (#1344): in Figma the empty control IS the rest, hover and focus-visible members, showing the `placeholder` layer in `text.secondary`, and `filled` is the member showing the `value` layer in `text.primary`. In code emptiness is a content condition that co-occurs with every interaction, so `empty` stays in `states` (`label.empty` and `error.border.empty` keep the "required field left unchosen" coordinate) and is held out of the projected `stateAxis`, leaving status(4) × state(5) = 20 members. In code the prompt and the chosen label are one control's content, never two elements.
- the nested LABEL's disabled dimming — select fixes the FieldLabel to `state=rest` because field-label's state vocabulary (rest / disabled) is not select's (rest / hover / focus-visible / disabled / empty), so it cannot be followed by value. In code a disabled select dims its label; in Figma the nested label reads at its rest configuration regardless. A projection limit, not a design choice.
- the KEYBOARD MODEL — typeahead to a matching option, arrow keys to move within the open list, Enter/Space to open and commit, Escape to close. All of it belongs to the interaction the closed control opens INTO, which is not modeled here.

---

Generated from the `select` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
