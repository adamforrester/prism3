# Select

> Closed control for picking one value from a known set. The menu is the platform's.

A control for choosing ONE value from a known, bounded set — the closed, native-first field: label, a bordered control showing the current value or a placeholder with a trailing chevron, and a helper/validation message below. Composes the shared FieldLabel and FieldMessage. The open menu is the platform's (native or a separate listbox), not modeled here. Single-choice only: a choice of several values is a Checkbox.Group, or a multi-select, not built yet. Not free-form text (TextField), not a small always-visible set (Radio.Group, or a segmented control, not built yet), not a set the user filters by typing (a combobox, not built yet).

- **ID:** `select`
- **Category:** form
- **Status:** draft
- **Also known as:** dropdown, picker, select-menu, listbox, select-panel, exposed-dropdown-menu

## Usage

Use to choose ONE value from a known, bounded set where the options are not worth showing all at once. Always render a visible label (the nested FieldLabel); show the constraint in helper text before failure; drive the nested FieldMessage's status from the validation state. The open menu is the platform's — prefer a native \<select> where its OS menu is acceptable. The select band is roughly 5–15 familiar options: at 4–5 or fewer an always-visible Radio.Group reads better, and past about 15 a filtering combobox (not built yet) scans better. One value only; for several, use a Checkbox.Group.

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

Label = noun phrase, sentence case, no trailing colon. Placeholder = the plain null state ("Country"), not an instruction, and omittable when the label suffices. Error says what + how to fix, never "Invalid".

### Copy patterns

- **Labels:** Noun phrase, sentence case, ≤3 words, no trailing colon; never the placeholder (see field-label).
- **Errors:** What is wrong AND how to fix it (SC 3.3.3); icon + text, not color-only (carried by the nested field-message).

## Choosing it

- **Purpose:** Choose one value from a known, bounded set, with an associated label and helper/validation message, modeling the closed control.
- **Use when:** One-of-a-known-set choices too numerous or space-costly to show all at once — a country, a status, a category.
- **Avoid when:** The value is free-form text (TextField), the user types to filter a suggestion list (a combobox, not built yet — a different ARIA contract), more than one value may be chosen (Checkbox.Group, or a multi-select, not built yet — this select is single-choice), the set is 4–5 options or fewer and worth showing at once (Radio.Group, or a segmented control, not built yet), the set runs past about 15 options (a combobox), or the choice is a binary that takes effect instantly (Switch.Row).
- **Often used with:** `field-label`, `field-message`, `focus-ring`, `icon`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The visible, persistent label, rendered as the nested FieldLabel. Required — a select always carries a programmatic name. Never the placeholder. |
| `value` | string | — | no | The displayed text — the selected option's label, or the placeholder when nothing is chosen. Controlled: pair with onChange. When it holds the placeholder the ink is the muted placeholder role; a chosen value shows the full-contrast value ink — the same empty-vs-value polarity text-field uses. This is an internal, content-driven distinction, not a variant a designer picks. |
| `placeholder` | string | — | no | The null state shown before a choice is made — plainly the thing to choose ("Country"), not an instruction ("Select a country from the list"), and omittable when the label suffices. Muted, and never load-bearing — it is not the label, not a real option, and it vanishes once a value is chosen. |
| `options` | array | — | no | The bounded set of choices. The select band is roughly 5–15 familiar options: at 4–5 or fewer an always-visible Radio.Group reads better, and past about 15 a filtering combobox (not built yet) scans better. |
| `onChange` | function | — | no | Fires with the newly chosen value (also onBlur / onFocus). A controlled value with no onChange is read-only by accident. |
| `helpText` | string \| node | — | no | Persistent guidance, rendered as the nested FieldMessage in its default status; wired via aria-describedby. Show the constraint before failure. |
| `validation` | enum: 'default' \| 'error' \| 'warning' \| 'success' | `default` | no | The validation state. Each non-default status swaps the control border to its own boundary (border-only — `error` → danger, `warning` → warning, `success` → success) AND sets the nested message to the matching status; `default` is neutral. The values align with FieldMessage's status axis, so this drives the nested message directly. |
| `validationMessage` | string \| node | — | no | The validation text shown at error / warning / success. For error, say what is wrong AND how to fix it (SC 3.3.3), never "Invalid". |
| `showMessage` | boolean | `true` | no | Whether the composed FieldMessage is shown. ON — the default — renders the helper / validation message below the control; turning it off hides the message entirely (a select with no helper or validation text). Never hides a message the field needs: an error still sets aria-invalid and the message carries the reason, so hide it only when there is genuinely nothing to say. |
| `leadingIcon` | slot | — | no | An optional leading glyph before the value (a category or status mark), aria-hidden. Hidden by default; the file nominates the swap target. Signals the field's purpose; validation never mutates it. |
| `required` | boolean | `false` | no | Sets required / aria-required, and turns on the FieldLabel's required marker. |
| `disabled` | boolean | `false` | no | Native disabled — removed from tab order, not submitted, contrast-exempt. Reserve for a choice irrelevant in the current state. |
| `readOnly` | boolean | `false` | no | Distinct from disabled: focusable, submitted with the form, and at full contrast, with the value shown and not changeable. Native \<select> has no readonly attribute, only disabled, so a read-only select is the custom control with aria-readonly, or a hidden input mirroring the value beside a non-interactive display. |
| `isPending` | boolean | `false` | no | Async options are loading — a spinner replaces the chevron and the control sets aria-busy. Not an empty state: the option list is still arriving. The same name Button and TextField use. |
| `id` | string | — | no | Wiring + form submission; auto-generated with useId if omitted, tying the label to the control and stitching the aria-describedby chain to the message. |
| `name` | string | — | no | A real control name so the field works uncontrolled, in a native form, and with Server Actions. |

## States

`rest`, `hover`, `filled`, `focus-visible`, `disabled`, `read-only`, `pending`, `empty`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `status` | `default`, `error`, `warning`, `success` | at runtime |

## Accessibility

- **Role:** Trigger: a native \<select>, or a custom button or role="combobox" (ARIA 1.2) with aria-haspopup="listbox", aria-expanded and aria-controls. Popup: role="listbox" with role="option" children carrying aria-selected — the platform's or a listbox component's, not modeled here.
- **WCAG:**
  - 1.3.5 Identify Input Purpose (autocomplete on a select collecting user information, such as a country)
  - 1.3.1 Info and Relationships (label + describedby association)
  - 3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion
  - 1.4.3 Contrast (value + placeholder) / 1.4.11 Non-text Contrast (control boundary ≥3:1) / 2.4.13 Focus Appearance
  - 4.1.2 Name/Role/Value (role, and the expanded state of the popup) / 2.5.8 Target Size
- **Keyboard:** The closed control is one Tab stop; Space / Enter / Down open it. Inside the open list (not modeled here) arrows move, typeahead jumps, Enter commits, Escape closes and returns focus to the control. SC 1.4.13 (the list stays open while hovered and Escape dismisses it) and SC 2.1.1 (every option, including scrolled ones, is reachable without a pointer) apply to that open list, which the platform or a listbox component owns, so this closed control does not claim them.
- **Focus:** :focus-visible ring on the control, boundary ≥3:1 (1.4.11 / 2.4.13). The control is the focus target; forwardRef reaches it so a form can focus the first invalid field on submit.
- **ARIA:** The host generates ids, ties the label to the control and the message into aria-describedby, and sets aria-invalid on error. The placeholder is NOT the accessible name. A custom control mirrors the native listbox contract (aria-expanded, aria-activedescendant); prefer the native \<select> where its OS menu is acceptable, because it is correct for free.

## Motion

- **Enter:** The open list (the platform's or a listbox component's): ~100–150ms opacity fade with a small vertical translate (translateY(-4px) → 0), anchored to the control. The chevron rotates on open under the same rule.
- **Exit:** The open list closes faster than it opens — ~75ms, a fade without translate — so dismissal reads as instant.
- **Reduced motion:** Under prefers-reduced-motion, drop the translate and scale and keep an accelerated opacity fade (~50ms); the chevron rotation follows the same rule. The closed control's border and state changes are short token-driven transitions, text-field's ~100–150ms, and resolve to an instant color change under reduced motion.

## Composition

- **Composes with:** `field-label`, `field-message`, `focus-ring`, `icon`
- **Alternative to:** `text-field`, `radio-group`, `checkbox-group`
- **Planned:** `form`, `menu`, `combobox`, `segmented-control`
- **Replaces:**
  - a bare \<select> with no label wiring
  - placeholder-as-label

---

Generated from the `select` component definition.
