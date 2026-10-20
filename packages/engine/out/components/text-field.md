# TextField

> Single-line text field: label, input, and helper or validation message.

A single-line control for free-form, non-enumerable text — names, emails, SKUs, short queries. A composed host: label + input + helper/validation message, with the accessibility wiring (id generation, aria-describedby chain, aria-invalid) handled internally. Not multi-line (Textarea), not a known set (Select, or a combobox), not numeric-formatted (a number field), not suggestion-backed (a combobox). The combobox and number field are not built yet.

- **ID:** `text-field`
- **Category:** form
- **Status:** draft
- **Also known as:** text-input, input, textbox, formfield

## Usage

Use for free-form, non-enumerable single-line input — names, titles, SKUs, identifiers, short queries. Always render a visible label; show the format in helper text before failure; keep validation timing with the form library. The field nests FieldLabel above and FieldMessage below; the host wires the ids and aria-describedby chain. Pick the size with the form: medium is the default, large for a roomy form, small for a dense one on fine pointers only — on a touch screen the small input renders at 16px, because a smaller input makes iOS zoom the page on focus.

### Do

- Always render a visible, associated label (FieldLabel) — visually-hidden only for search
- Distinguish readOnly (copyable, submitted, full-contrast) from disabled (silent, exempt)
- Emit a real \<input name> so it works uncontrolled, in a native form, with Server Actions
- Separate a decorative glyph (aria-hidden) from an interactive trailing action (a labeled button)
- Follow the error-timing contract: validate on blur, re-validate on input after the first error, move focus to the first invalid field on submit, and show an error summary on a long form (the form library runs it; the field renders it)

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
- **Often used with:** `field-label`, `field-message`, `icon`, `button`, `spinner`

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
| `prefix` | string | — | no | A leading TEXT affix inside the field, before the value — a currency symbol or a unit ("$", "€"). Not part of the value and aria-hidden, so the label or helper text carries what it means. Follows the locale's placement (a symbol before or after the number). A glyph is `leadingIcon`, not this. |
| `suffix` | string | — | no | A trailing TEXT affix inside the field, after the value — a unit or a domain ("kg", ".com"). Not part of the value and aria-hidden, so the label or helper text carries what it means. A glyph or a clear / reveal action is `trailingIcon` / `clearable`, not this. |
| `leadingIcon` | slot | — | no | An optional leading glyph before the value (a purpose or category mark, such as search), aria-hidden and never the accessible name. Hidden by default; the file nominates the swap target. Signals the field's purpose; validation never mutates it. |
| `trailingIcon` | slot | — | no | An optional trailing glyph at the field's trailing edge — a decorative mark (aria-hidden), or the glyph of a clear / reveal action, which in code is a focusable button with its own accessible name. The decorative-vs-interactive split is load-bearing. Hidden by default; the file nominates the swap target. |
| `clearable` | boolean | `false` | no | Adds a labeled Clear button that announces the cleared state and RETURNS FOCUS to the input (the recurring trap is stranding focus). |
| `isPending` | boolean | `false` | no | Async validation/value — a spinner replaces an adornment without reflow; sets aria-busy; does not block typing unless intended. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Three tiers that scale the input type with the field (small 14px, medium 16px, large 18px, `type.body.{sm,md,lg}`), the nested label one step below it (12 / 14 / 16), and the padding. Every size keeps the 44px target: small is smaller type and padding, not a smaller target; large is taller. `small` is for fine pointers only: on a coarse pointer (`@media (pointer: coarse)`) the code sets the small input to 16px, because iOS Safari zooms the page when it focuses an input under 16px. The field's edge, outline or underline, is the brand's Field style setting, not a prop. |
| `id` | string | — | no | Wiring + form submission; auto-generated with useId if omitted, tying label→input and the aria-describedby chain. |
| `name` | string | — | no | A real \<input name> so the field works uncontrolled, in a native \<form>, with useFormStatus / Server Actions, and the Constraint Validation API. |

## States

`rest`, `hover`, `pending`, `filled`, `focus-visible`, `focus-visible-filled`, `disabled`, `read-only`, `empty`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored |
| `style` | `outline` | once, when authored |
| `status` | `default`, `error`, `warning`, `success` | at runtime |

## Accessibility

- **Role:** textbox (native \<input>)
- **WCAG:**
  - 1.3.5 Identify Input Purpose (autocomplete — the most field-specific SC)
  - 1.3.1 Info and Relationships (label + describedby association)
  - 3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion
  - 1.4.3 Contrast (value + placeholder) / 1.4.11 Non-text Contrast (field boundary ≥3:1 — the rest, hover and read-only borders are gated on `background.secondary`, the darkest permissible ground) / 2.4.13 Focus Appearance
  - 4.1.2 Name/Role/Value / 2.5.8 Target Size
  - 3.3.7 Redundant Entry / 3.3.8 Accessible Authentication (WCAG 2.2) — page-level criteria: the form and its flow meet them on login and checkout; the field supports them through autocomplete and by allowing paste
- **Keyboard:** Native text editing. Tab focuses the input; interactive affixes (clear / reveal) are SEPARATE tab stops with their own accessible names. Escape clears when clearable.
- **Focus:** :focus-visible ring, boundary ≥3:1 (1.4.11 / 2.4.13) — the field is a primary focus target. forwardRef must reach the \<input>, not the wrapper, so consumers can focus on load / focus the first invalid field on submit.
- **ARIA:** The host generates ids (useId) and stitches aria-describedby across helper + error, and sets aria-invalid on error — the consumer never hand-manages ids (the highest-frequency real a11y failure). placeholder is NOT the accessible name. Error timing: validate on blur, re-validate on input after the first error, announce politely, and on submit move focus to the first invalid field (with an error summary on a long form). While pending, aria-busy; the field stays focusable. Do not fire validation mid-IME-composition. Set dir="auto" on the input so content direction can differ from UI direction.

## Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** State transitions — the border color on focus or status, the helper-to-validation message swap — are short, token-driven and eased out, ~100–150ms. A validation message must not jolt the layout: reserve its space or grow the height gently. Under prefers-reduced-motion these resolve to an instant color or position change so the state stays perceivable. The pending spinner is functional; aria-busy carries its state regardless.

## Composition

- **Composes with:** `field-label`, `field-message`, `focus-ring`
- **Alternative to:** `textarea`, `select`, `checkbox-row`, `switch-row`, `password-field`
- **Planned:** `form`, `tooltip`, `combobox`, `number-field`, `search-field`, `date-picker`
- **Replaces:**
  - bare input without label wiring
  - placeholder-as-label
  - type=number for formatted numeric

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
| `container/control/trailingVisual` | swap | every member |
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
| `container/control/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/content/entry/caret` | — | — | `control.size.md.line-box` | `border-width.hairline` | — | — |
| `container/control/content/entry/caretEnd` | — | — | `control.size.md.line-box` | `border-width.hairline` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/control` | `space.075` / `space.200` / `space.075` / `space.200` | `space.100` | `size.md.min-height` | — | 120px (literal) | — |
| `container/control/content` | — | `space.100` | — | — | — | — |
| `container/control/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/content/entry/caret` | — | — | `control.size.sm.line-box` | `border-width.hairline` | — | — |
| `container/control/content/entry/caretEnd` | — | — | `control.size.sm.line-box` | `border-width.hairline` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/control` | `space.100` / `space.300` / `space.100` / `space.300` | `space.100` | `size.lg.height` | — | 120px (literal) | — |
| `container/control/content` | — | `space.100` | — | — | — | — |
| `container/control/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
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
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.interactive.neutral.overlay.hover` | `color.field.border.hover` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.focus` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.focus` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |
| `container/control/trailingVisual` | — | — | — | `color.disabled.on-fill` |

**status=default, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.interactive.neutral.overlay.hover` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |
| `container/control/trailingVisual` | — | — | — | `color.disabled.on-fill` |

**status=error, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.interactive.neutral.overlay.hover` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |
| `container/control/trailingVisual` | — | — | — | `color.disabled.on-fill` |

**status=warning, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.interactive.neutral.overlay.hover` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |
| `container/control/trailingVisual` | — | — | — | `color.disabled.on-fill` |

**status=success, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

### Nesting and properties

- `container/label` nests `field-label` at `size=medium, emphasis=secondary, weight=regular, state=rest`; follows `size`; exposes `emphasis`, `weight`
- `container/control/content/leadingVisual` is a swap slot, property `↳ swap leading icon`, shown by `leading icon`
- `container/control/trailingVisual` is a swap slot, property `↳ swap trailing icon`, shown by `trailing icon`
- `container/message` nests `field-message` at `status=default`; follows `status`
- `container/control/focusRing` nests `focus-ring` at `surface=default`

| Property | Type | Default |
| --- | --- | --- |
| `placeholder` | text | `Placeholder` |
| `value` | text | `Entered text` |
| `leading icon` | boolean | `false` |
| `↳ swap leading icon` | instance swap | — |
| `trailing icon` | boolean | `false` |
| `↳ swap trailing icon` | instance swap | — |
| `message` | boolean | `true` |

---

Generated from the `text-field` component definition.
