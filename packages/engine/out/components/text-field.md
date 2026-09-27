# TextField

> Single-line text field: label, input, and helper or validation message.

A single-line control for free-form, non-enumerable text — names, emails, SKUs, short queries. A composed host: label + input + helper/validation message, with the accessibility wiring (id generation, aria-describedby chain, aria-invalid) handled internally. Not multi-line (Textarea), not a known set (Select, or a combobox), not numeric-formatted (a number field), not suggestion-backed (a combobox). The combobox and number field are not built yet.

- **ID:** `text-field`
- **Category:** form
- **Status:** draft
- **Also known as:** text-input, input, textbox, formfield

## Usage

Use for free-form, non-enumerable single-line input — names, titles, SKUs, identifiers, short queries. Always render a visible label; show the format in helper text before failure; keep validation timing with the form library. The field nests FieldLabel above and FieldMessage below; the host wires the ids and aria-describedby chain.

### Do

- Always render a visible, associated label (FieldLabel) — visually-hidden only for search
- Distinguish readOnly (copyable, submitted, full-contrast) from disabled (silent, exempt)
- Emit a real \<input name> so it works uncontrolled, in a native form, with Server Actions
- Separate a decorative prefix (aria-hidden) from an interactive suffix action (a labeled button)

### Don't

- Use the placeholder as the label, or put load-bearing text in it
- Use type="number" for numeric input — use a number field, not built yet (email/url/tel stay as type here)
- Bake a validation engine or timing into the field — render the error you are handed
- Signal error with the border color alone — the message carries the text + icon

### Content guidelines

Label = noun phrase, sentence case, no trailing colon. Placeholder = example only. Helper carries the format up front. Error says what + how to fix, never "Invalid input".

### Copy patterns

- **Labels:** Noun phrase, sentence case, ≤3 words, no trailing colon; never the placeholder (see field-label).
- **Errors:** What is wrong AND how to fix it (SC 3.3.3); icon + text, not color-only (see field-message).
- **Empty states:** The empty state is the label plus an optional placeholder — there is no separate empty UI.

## Choosing it

- **Purpose:** Capture a single line of free-form, non-enumerable text with an associated label and helper/validation message.
- **Use when:** Names, emails, titles, SKUs, identifiers, short queries — any single-line text the system cannot offer as a fixed set.
- **Avoid when:** The value comes from a known set (Select, Radio.Group, or a combobox), spans multiple lines (Textarea), is numeric-formatted (a number field), is boolean (Checkbox.Row or Switch.Row), is a date (a date picker), or needs suggestions (a combobox — the moment a suggestion list attaches you are in combobox territory with a different ARIA contract).
- **Often used with:** `field-label`, `field-message`, `icon`, `button`
- **Keywords:** text field, text input, input, form field, textbox, email field, search field
- **Generation priority:** 2

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The visible, persistent label (rendered as FieldLabel). Required — a visually-hidden label is the only label-less case, and it still exists in the DOM. Never the placeholder. |
| `value` | string | — | no | Controlled value; pair with onChange. A controlled value with no onChange is read-only by accident. |
| `defaultValue` | string | — | no | Uncontrolled initial value — preferred for form-library ergonomics. |
| `onChange` | function | — | no | Change handler (also onBlur / onFocus). |
| `type` | enum: 'text' \| 'email' \| 'url' \| 'tel' \| 'search' \| 'password' | `text` | no | Attribute-only variants (mobile keyboard + autofill). Not number: numeric input needs a number field (not built yet). search / password are better served by their thin specializations. |
| `placeholder` | string | — | no | An example only ("name@example.com"); vanishes on input; nothing load-bearing lives here. |
| `helpText` | string \| node | — | no | Persistent guidance (rendered as FieldMessage, default status); wired via aria-describedby. Show the format BEFORE failure. |
| `validation` | enum: 'default' \| 'error' \| 'warning' \| 'success' | `default` | no | The validation state. Each non-default status swaps the input border to its own boundary (border-only — `error` → danger, `warning` → warning, `success` → success) AND sets the nested message to the matching status; `default` is neutral. `error` also sets aria-invalid. The values align with FieldMessage's status axis, so this drives the nested message directly. |
| `validationMessage` | string \| node | — | no | The validation text shown at error / warning / success, added to aria-describedby. For error, say what is wrong AND how to fix it (SC 3.3.3), never "Invalid". |
| `showMessage` | boolean | `true` | no | Whether the composed FieldMessage is shown. ON — the default — renders the helper / validation message below the input; turning it off hides the message entirely (a field with no helper or validation text). Never hides a message the field needs. |
| `required` | boolean | `false` | no | Sets required / aria-required, and turns on the FieldLabel's required marker. |
| `disabled` | boolean | `false` | no | Native disabled — removed from tab order, not submitted, silent to AT, contrast-exempt. Reserve for fields irrelevant in the current state. |
| `readOnly` | boolean | `false` | no | Distinct from disabled: focusable, selectable and copyable, submitted with the form, and passes contrast. Use for a value the user may read/copy but not edit (a generated key). The component's live edge. |
| `autoComplete` | string (WHATWG token) | — | no | Satisfies SC 1.3.5 Identify Input Purpose — an accessibility obligation, not a convenience. |
| `inputMode` | enum: 'text' \| 'numeric' \| 'decimal' \| 'tel' \| 'email' \| 'url' \| 'search' | — | no | Selects the mobile virtual keyboard. |
| `prefix` | slot (adornment) | — | no | Leading adornment — a decorative/purpose glyph (currency, search), aria-hidden. Signals the field's PURPOSE; validation never mutates it. |
| `suffix` | slot (adornment \| action) | — | no | Trailing adornment. May be decorative (aria-hidden) OR a real labeled action (clear / reveal) — a focusable button, not decoration. The decorative-vs-interactive split is load-bearing. |
| `leadingIcon` | slot | — | no | An optional leading glyph before the value (a purpose or category mark), aria-hidden. Hidden by default; the file nominates the swap target. The Figma-projected form of the `prefix` adornment (its presence boolean + content swap). |
| `trailingIcon` | slot | — | no | An optional trailing affix at the field's trailing edge (the glyph of a clear / reveal action, or a decorative mark), aria-hidden as a glyph. Hidden by default; the file nominates the swap target. The Figma-projected glyph of the `suffix` / `clearable` action, whose interactive behavior Figma cannot carry. |
| `clearable` | boolean | `false` | no | Adds a labeled Clear button that announces the cleared state and RETURNS FOCUS to the input (the recurring trap is stranding focus). |
| `isPending` | boolean | `false` | no | Async validation/value — a spinner replaces an adornment without reflow; sets aria-busy; does not block typing unless intended. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Three tiers (height + padding). A single bordered (outline) style; filled/underline are theming, not API. |
| `id` | string | — | no | Wiring + form submission; auto-generated with useId if omitted, tying label→input and the aria-describedby chain. |
| `name` | string | — | no | A real \<input name> so the field works uncontrolled, in a native \<form>, with useFormStatus / Server Actions, and the Constraint Validation API. |

## States

`rest`, `hover`, `filled`, `focus-visible`, `disabled`, `read-only`, `pending`, `empty`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `style` | `outline` | once, when authored |
| `status` | `default`, `error`, `warning`, `success` | at runtime |

## Accessibility

- **Role:** textbox (native \<input>)
- **WCAG:**
  - 1.3.5 Identify Input Purpose (autocomplete — the most field-specific SC)
  - 1.3.1 Info and Relationships (label + describedby association)
  - 3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion
  - 1.4.3 Contrast (value + placeholder) / 1.4.11 Non-text Contrast (field boundary ≥3:1) / 2.4.13 Focus Appearance
  - 4.1.2 Name/Role/Value / 2.5.8 Target Size
  - 3.3.7 Redundant Entry / 3.3.8 Accessible Authentication (login/checkout fields, WCAG 2.2)
- **Keyboard:** Native text editing. Tab focuses the input; interactive affixes (clear / reveal) are SEPARATE tab stops with their own accessible names. Escape clears when clearable.
- **Focus:** :focus-visible ring, boundary ≥3:1 (1.4.11 / 2.4.13) — the field is a primary focus target. forwardRef must reach the \<input>, not the wrapper, so consumers can focus on load / focus the first invalid field on submit.
- **ARIA:** The host generates ids (useId) and stitches aria-describedby across helper + error, and sets aria-invalid on error — the consumer never hand-manages ids (the highest-frequency real a11y failure). placeholder is NOT the accessible name. While pending, aria-busy; the field stays focusable. Do not fire validation mid-IME-composition. Set dir="auto" on the input so content direction can differ from UI direction.

## Composition

- **Composes with:** `field-label`, `field-message`, `focus-ring`, `icon`, `button`, `spinner`
- **Alternative to:** `textarea`, `select`, `checkbox-row`, `switch-row`
- **Planned:** `form`, `tooltip`, `combobox`, `number-field`, `search-field`, `date-picker`, `password-field`
- **Replaces:**
  - bare input without label wiring
  - placeholder-as-label
  - type=number for formatted numeric

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- size — the small / medium / large ladder is a code-API PROP + geometry tokens (`size.{small,medium,large}.*`), NOT a variants axis and NOT a projected Figma variant. Figma renders the single `md` rung (the bare geometry keys — the field control is one interactive target, and a projected size axis would triple the set for geometry a designer reads off one member); a code consumer picks the density via the `size` prop. It is kept off `variants` deliberately: `size` is `figmaAnatomyPlan`'s positional argument, so a declared size axis must project a rung (#795), which is why select — the template for this def — also expresses its single size as bare `md` geometry rather than a `size` variant. Same not-projected posture as the `style` axis, reached a different way.
- style — the outline / filled / underline treatment is theming, not an API axis: `style` carries the single value `outline` and filled/underline are a brand skin over the same anatomy, so there is nothing for a Figma variant to enumerate. Admitted here rather than projected.
- pending — a real STATE (a spinner replaces an adornment while async validation/value resolves, and the field sets aria-busy), deliberately NOT a Figma variant. Its delta is a runtime spinner swap with no distinct static skin a designer picks from a matrix — the pending member would differ from `rest` only by a node Figma cannot animate — so it stays in `states` (the code tier carries it) and is admitted OUT of the projected `stateAxis`.
- empty — a real STATE in code (the field holds no value, so it shows the placeholder), NOT a Figma variant: in Figma the empty field IS the rest, hover and focus-visible members, which show the `placeholder` layer in `text.secondary`, and `filled` is the member showing the `value` layer in `text.primary`. In code emptiness is a content condition that co-occurs with every interaction, so `empty` stays in `states` (`label.empty` and `error.border.empty` keep the "required field left blank" coordinate) and is held out of the projected `stateAxis` with `pending`, leaving status(4) × state(6) = 24 members over rest / hover / filled / focus-visible / disabled / read-only. In code the placeholder and the value are one \<input>: its `placeholder` attribute and its value, never two elements.
- the FOCUS CARET — Figma draws a static bar before the placeholder on the focus-visible member. Code draws the browser's native caret, blinking, at the insertion point, with `caret-color` set from `color.text.primary` (the `caret` binding), so it keeps the value ink over the placeholder's muted one.
- the TRAILING AFFIX is an INTERACTIVE control in code — a clear or reveal button that is its own Tab stop with its own accessible name (see the `suffix` / `clearable` props and the a11y block) and RETURNS focus to the input when it acts. Figma has no accessibility tree and no node-to-node reference, so `trailingVisual` projects ONLY the glyph: a member cannot express that the affix is focusable, labeled, or that activating it clears the field. The presence boolean + swap carry which glyph shows and whether it shows; the interaction is the host's.
- the label / describedby WIRING — the host generates ids (useId), ties the FieldLabel to the input, stitches the FieldMessage into aria-describedby, and sets aria-invalid on error. Figma has no accessibility tree and no node-to-node reference, so the nested label and message sit near the input and are associated by proximity alone (the same ceiling `field-label` and `field-message` each hit).
- the nested LABEL's disabled dimming — the field fixes the FieldLabel to `state=rest` because field-label's state vocabulary (rest / disabled) is not the field's, so it cannot be followed by value. In code a disabled field dims its label; in Figma the nested label reads at its rest configuration regardless. A projection limit, not a design choice.
- the KEYBOARD MODEL — native text editing, Escape-to-clear when clearable, and IME composition guards (do not validate mid-composition). All of it is runtime interaction the closed static member cannot carry.

---

Generated from the `text-field` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
