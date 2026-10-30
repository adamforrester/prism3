# Checkbox.Row

> Labeled checkbox for a staged on/off choice. The whole row is the hit target.

- **ID:** `checkbox-row`
- **Category:** form
- **Status:** draft
- **Also known as:** checkbox, check, tickbox, checkbox-field
- **Builds on:** `text-field`

## Overview

A control for an independent binary choice that is staged into a form and submitted — on/off, included/excluded, agreed/not — optionally one of many in a set. The labeled row: control and rich-content label, with the whole row as the hit target. Carries the indeterminate (mixed) visual state for select-all hierarchy, which no sibling control has. Not an immediate-effect toggle (Switch.Row), not a mutually-exclusive one-of-many (Radio.Group), not an action with a pressed state (a toggle button, not built yet).

- **Purpose:** Capture an independent binary choice that is staged into a form and submitted, with an associated label that doubles as the hit target and an optional indeterminate state for select-all hierarchy.
- **Use when:** A single opt-in (consent, "remember me", "include X"), or any-number-from-a-set selection where the change applies on save rather than instantly. The indeterminate state when a parent row summarizes a partially-selected set of children.
- **Avoid when:** The change takes effect the instant it is toggled (Switch.Row — the boundary is staged versus immediate, and only Checkbox.Row has indeterminate), the options are mutually exclusive (Radio.Group — any-number versus exactly-one; a two-option exclusive choice is Radio.Group, never two checkboxes), the control is really an action with a pressed state in a dense toolbar (a toggle button with aria-pressed, not built yet), or the set runs past roughly 7-10 options (a filtering multi-select combobox or listbox, not built yet).

## Anatomy

Shown on the default member: size `medium`, status `default`.

1. **Content** — The control and the label, side by side and top-aligned. The row centers this box in its minimum height, and the control stays beside the label's first line.
2. **Control**
3. **Text stack** — The label and the description under it, starting at the label's edge. Its top inset keeps the label's first line centered on the control.
4. **Label**
5. **Description** (optional) — The optional description under the label, in the muted text color, one type step smaller and starting at the label's edge. Hidden by default.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | Scales the control square, the label's type ramp, the box↔label gap and the row's minimum height. The square reads control.size.\<rung>.height on both axes — square by construction rather than by two tokens agreeing — and not icon.size.*, which is 16/20/24 in every brand the engine ships and so would hold a control rigid that should move with brand density. |
| `status` | `default`, `error` | at runtime | — |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `read-only`

## Usage guidelines

Use a single Checkbox.Row for one independent opt-in (a consent line, "Remember me"), and a Checkbox.Group to select any number — zero to many — from a bounded set. Use the indeterminate state for a select-all broadcasting partial selection over a table or tree. Compose FieldMessage below exactly as TextField does; the host wires the ids and the aria-describedby chain. Past roughly 7-10 options, scanning and vertical space suffer and a filtering multi-select combobox (not built yet) is the better control.

### Do

- Make the whole row the hit target with padding on the wrapper — the visual box stays tight while the interactive footprint aims for 24x24 and beyond
- Set aria-checked="mixed" explicitly for indeterminate — the dash glyph alone conveys nothing to assistive tech
- Let the group own required, validation and the value array; a row inside a group never manages its own error
- Accept rich content in the label, so a consent line can carry the link it needs
- Phrase the label positively, and state exactly what is being agreed to on a consent checkbox

### Don't

- Pre-check a consent checkbox — a dark pattern, and for marketing consent often unlawful
- Offer indeterminate as a third state a user can click to — it is hierarchy only, set programmatically
- Pass indeterminate as a JSX prop and expect it to work — there is no such HTML attribute; set the DOM property through a ref
- Override Enter to toggle — Enter submits the form, and that expectation is universal
- Center-align the whole control+label row — on a wrapping label it floats the control to the middle of the paragraph; center the control within a single line-box instead, so it holds the first line
- Reach for a checkbox where the change takes effect instantly — that is Switch.Row, and the difference is staged versus immediate

## Accessibility

- **Keyboard:** Each checkbox is its own Tab stop and Space toggles — the key cross-control difference from Radio.Group, which is one Tab stop for the group with arrows moving within it. Never override Enter: Enter submits the enclosing form, and hijacking it breaks universal web behavior.
- **Focus:** :focus-visible ring on the control, offset, at least 3:1 — keyboard traversal only, not mouse or touch. The visual box stays tight while the interactive footprint is generous: the hit target is expanded by padding on the row wrapper (the icon-button parallel), so clicking the label or the surrounding space toggles. The target aims for at least 24x24, scaling to 44 (Apple) / 48 (Material) on touch. The label sits inline-end of the control, not above it.
- **Screen readers:** checkbox (native \<input type="checkbox">), with aria-checked true / false / mixed

  Prefer the styled native input — appearance: none plus a pseudo-element or SVG keeps role, checked state and Space-to-toggle for free; a role="checkbox" div is a last resort and must reproduce aria-checked (true/false/mixed) exactly. Relying on the visual dash glyph alone to convey indeterminate is an accessibility failure. For a set, role="group" plus aria-labelledby is the default over fieldset/legend — both are valid, but fieldset has flexbox and grid quirks that make it hard to style predictably, and role=group on a div keeps the layout freedom while preserving the shared-label announcement. Group error and required associate to the group and announce once; a row inside a group never owns its own required or error — the group sets its status. A standalone row (a consent line) is the one that sets its own: status=error with aria-invalid on the input and the host's message in its aria-describedby. When the control is nested in a host row, the host provides the accessible name through aria-labelledby — never double-label.

### WCAG

- 2.5.8 Target Size — the intent: the whole row is the target, because the 12–24px box fails in isolation. The row's minimum height is the control-height ladder, so every row is at least 24px tall, and the default (medium) row is 44px on comfortable density.
- 4.1.2 Name Role Value (role, checked and mixed — aria-checked="mixed" must be set explicitly)
- 1.3.1 Info and Relationships (group structure)
- 3.3.2 Labels or Instructions (the visible row label)
- 3.3.1 Error Identification / 3.3.3 Error Suggestion — in a set, the group sets status=error on every row and shows its message under them, announced once. A standalone row draws the danger border at status=error but nests no message part, so the text that names the error is its host's.
- 1.4.11 Non-text Contrast / 2.4.13 Focus Appearance (control boundary and focus indicator)
- 3.3.7 Redundant Entry (repeated consents)

### Motion

- **Enter:** None of the row's own (present on mount). On check, the nested Checkbox.Control draws its glyph and crossfades its fill, about 100-150ms.
- **Exit:** None of the row's own. On uncheck, the nested control runs the same glyph transition back.
- **Reduced motion:** No layout motion. Under prefers-reduced-motion, the nested glyph flips instantly; a crossfade under 150ms may remain.

## Content guidelines

The label states what becomes true when checked. Group errors read "Select at least one option" rather than "Invalid". Consent labels name the thing agreed to in full.

- **Labels:** A positive statement of what becomes true when checked — "Subscribe to newsletter", never "Do not send me emails", which a user has to mentally invert in order to uncheck. Sentence case, no terminal period for a terse single-sentence label; apply punctuation only for multi-sentence or legal labels. Abstract shared words up into the group label, so "Notification preferences" lets its rows read "Email", "SMS", "Push".
- **Errors:** Group-level for a set — "Select at least one option" — stating what is wrong and how to fix it (SC 3.3.3). Inside a group the group sets status=error on every row and carries the message. A standalone row sets its own status=error ("Accept the terms to continue"), and its host shows the message.

## Related components

- **Built from:** `checkbox-control`
- **Instead, consider:** `switch-row`, `radio-row`
- **Often used with:** `checkbox-group`, `field-label`, `field-message`, `focus-ring`, `button`
- **Replaces:**
  - a bare \<input type="checkbox"> with no label wiring
  - a role="checkbox" div where a styled native input would do

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `checked` | boolean | — | no | The controlled binary. Pair with onChange; use defaultChecked for the uncontrolled form. Named for the DOM attribute rather than the framework idiom — checked, not isChecked/isSelected. Inside a Checkbox.Group this is derived from the group's value array and a consumer should not also wire it here. |
| `defaultChecked` | boolean | `false` | no | Uncontrolled initial value. Never true for a consent checkbox — pre-checked consent is a dark pattern and, for marketing consent, often unlawful. |
| `indeterminate` | boolean | `false` | no | The mixed visual state — dash glyph, aria-checked="mixed". Presentational: the underlying value is still true/false, and this is for parent/child select-all hierarchy only, never a third state a user can click to. There is no indeterminate HTML attribute — it is a DOM property (node.indeterminate = true), which is the single most common checkbox bug; in React apply it through a synchronous ref callback rather than a JSX prop. |
| `label` | node | — | no | Rich content: a node, not a string. The substrate's label is a string above the field; this one sits inline-end, doubles as the hit target, and must be able to hold a link, because the single most common real checkbox label is a consent line with one in it ("I agree to the Terms of Service"). A standalone control with no label is checkbox-control, which then requires an external aria-label/aria-labelledby. |
| `description` | node | — | no | Optional helper beneath the label, describedby-wired — the detail that qualifies the choice without lengthening the label. |
| `onChange` | (checked: boolean, event) => void | — | no | Restated rather than inherited: the substrate's change yields a string, this one yields the resulting boolean alongside the event. |
| `value` | string | — | no | The string submitted when checked (the platform default is "on"), and the element this row contributes to a Checkbox.Group's array. An unchecked box submits nothing at all rather than a false value — the missing-key trap. |
| `disabled` | boolean | `false` | no | Native disabled: removed from the tab order, not submitted, contrast-exempt. Disables the whole row: the nested control takes its disabled skin and the label dims. Reserve for an option that does not apply in the current state. |
| `readOnly` | boolean | `false` | no | Restated only for the caveat: \<input type="checkbox"> has no working readonly — only disabled — so a genuinely read-only checkbox needs aria-readonly plus a prevented toggle, or is better rendered as static text. Decide which explicitly; the default of doing neither is a control that looks interactive and silently is not. |
| `validation` | enum: 'default' \| 'error' | `default` | no | The validation status of a standalone checkbox — a consent line that must be checked. error draws the danger border on the box and sets aria-invalid; pair it with an error message the host shows. Inside a Checkbox.Group the group sets this on every row; never set it on one row of a group. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the control square, the label's type ramp, the box↔label gap and the row's minimum height. The square reads control.size.\<rung>.height on both axes — square by construction rather than by two tokens agreeing — and not icon.size.*, which is 16/20/24 in every brand the engine ships and so would hold a control rigid that should move with brand density. |

## Specs

Generated from the plan that builds the design-file component: 6 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `row` | frame | every member |
| `row/content` | frame | every member |
| `row/content/controlCell` | frame | every member |
| `row/content/controlCell/control` | instance | every member |
| `row/content/textStack` | frame | every member |
| `row/content/textStack/label` | text | every member |
| `row/content/textStack/description` | text | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `row` | `space.100` / `space.0` / `space.100` / `space.0` | — | — | — | 120px (literal) | min height `size.md.height`; build width 320px (literal) |
| `row/content` | — | `space.100` | — | — | — | — |
| `row/content/controlCell` | — | — | — | — | — | min height `type.body.sm.line-box` |
| `row/content/controlCell/control` | — | — | `control.size.md.height` | `control.size.md.height` | — | — |
| `row/content/textStack` | `control.size.md.label-inset` / — / — / — | `space.050` | — | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `row` | `space.075` / `space.0` / `space.075` / `space.0` | — | — | — | 120px (literal) | min height `size.sm.height`; build width 320px (literal) |
| `row/content` | — | `space.100` | — | — | — | — |
| `row/content/controlCell` | — | — | — | — | — | min height `type.body.xs.line-box` |
| `row/content/controlCell/control` | — | — | `control.size.sm.height` | `control.size.sm.height` | — | — |
| `row/content/textStack` | `control.size.sm.label-inset` / — / — / — | `space.050` | — | — | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `row` | `space.150` / `space.0` / `space.150` / `space.0` | — | — | — | 120px (literal) | min height `size.lg.height`; build width 320px (literal) |
| `row/content` | — | `space.150` | — | — | — | — |
| `row/content/controlCell` | — | — | — | — | — | min height `type.body.md.line-box` |
| `row/content/controlCell/control` | — | — | `control.size.lg.height` | `control.size.lg.height` | — | — |
| `row/content/textStack` | `control.size.lg.label-inset` / — / — / — | `space.050` | — | — | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `row/content/textStack/label` | `type.body.sm.default` |
| size=medium | `row/content/textStack/description` | `type.body.xs.default` |
| size=small | `row/content/textStack/label` | `type.body.xs.default` |
| size=small | `row/content/textStack/description` | `type.body.xs.default` |
| size=large | `row/content/textStack/label` | `type.body.md.default` |
| size=large | `row/content/textStack/description` | `type.body.sm.default` |

### Color

Keyed by `status`.

**status=default**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/content/textStack/label` | — | — | `color.text.primary` | — |
| `row/content/textStack/description` | — | — | `color.text.secondary` | — |

**status=error**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/content/textStack/label` | — | — | `color.text.primary` | — |
| `row/content/textStack/description` | — | — | `color.text.secondary` | — |

### Nesting and properties

- `row/content/controlCell/control` nests `checkbox-control` at `selection=unchecked, state=rest, status=default`; follows `size`, `status`; exposes `selection`, `state`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Checkbox label` |
| `description text` | text | `Supporting text` |
| `description` | boolean | `false` |

---

Generated from the `checkbox-row` component definition.
