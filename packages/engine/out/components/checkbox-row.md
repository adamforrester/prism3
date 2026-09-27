# Checkbox.Row

> Labeled checkbox for a staged on/off choice. The whole row is the hit target.

A control for an independent binary choice that is staged into a form and submitted — on/off, included/excluded, agreed/not — optionally one of many in a set. The labeled ROW: control and rich-content label, with the whole row as the hit target. Carries the indeterminate (mixed) visual state for select-all hierarchy, which no sibling control has. Not an immediate-effect toggle (Switch.Row), not a mutually-exclusive one-of-many (Radio.Group), not an action with a pressed state (a toggle button, not built yet).

- **ID:** `checkbox-row`
- **Category:** form
- **Status:** draft
- **Also known as:** checkbox, check, tickbox, checkbox-field
- **Builds on:** `text-field`

## Usage

Use a single Checkbox.Row for one independent opt-in (a consent line, "Remember me"), and a Checkbox.Group to select any number — zero to many — from a bounded set. Use the indeterminate state for a select-all broadcasting partial selection over a table or tree. Compose FieldMessage below exactly as TextField does; the host wires the ids and the aria-describedby chain. Past roughly 7-10 options, scanning and vertical space suffer and a filtering multi-select combobox (not built yet) is the better control.

### Do

- Make the whole row the hit target with padding on the wrapper — the visual box stays tight while the interactive footprint aims for 24x24 and beyond
- Set aria-checked="mixed" explicitly for indeterminate — the dash glyph alone conveys nothing to assistive tech
- Let the GROUP own required, validation and the value array; a row inside a group never manages its own error
- Accept rich content in the label, so a consent line can carry the link it needs
- Phrase the label positively, and state exactly what is being agreed to on a consent checkbox

### Don't

- Pre-check a consent checkbox — a dark pattern, and for marketing consent often unlawful
- Offer indeterminate as a third state a user can click to — it is hierarchy only, set programmatically
- Pass `indeterminate` as a JSX prop and expect it to work — there is no such HTML attribute; set the DOM property through a ref
- Override Enter to toggle — Enter submits the form, and that expectation is universal
- Center-align the whole control+label row — on a wrapping label it floats the control to the middle of the paragraph; center the control within a single line-box instead, so it holds the first line
- Reach for a checkbox where the change takes effect instantly — that is Switch.Row, and the difference is staged versus immediate

### Content guidelines

The label states what becomes true when checked. Group errors read "Select at least one option" rather than "Invalid". Consent labels name the thing agreed to in full.

### Copy patterns

- **Labels:** A POSITIVE statement of what becomes true when checked — "Subscribe to newsletter", never "Do not send me emails", which a user has to mentally invert in order to uncheck. Sentence case, no terminal period for a terse single-sentence label; apply punctuation only for multi-sentence or legal labels. Abstract shared words up into the group label, so "Notification preferences" lets its rows read "Email", "SMS", "Push".
- **Errors:** Group-level for a set — "Select at least one option" — stating what is wrong and how to fix it (SC 3.3.3). An isolated row recolors its own boundary; inside a group the rows stay neutral and the group carries the message.

## Choosing it

- **Purpose:** Capture an independent binary choice that is staged into a form and submitted, with an associated label that doubles as the hit target and an optional indeterminate state for select-all hierarchy.
- **Use when:** A single opt-in (consent, "remember me", "include X"), or any-number-from-a-set selection where the change applies on save rather than instantly. The indeterminate state when a parent row summarizes a partially-selected set of children.
- **Avoid when:** The change takes effect the instant it is toggled (Switch.Row — the boundary is staged versus immediate, and only Checkbox.Row has indeterminate), the options are mutually exclusive (Radio.Group — any-number versus exactly-one; a two-option exclusive choice is Radio.Group, never two checkboxes), the control is really an action with a pressed state in a dense toolbar (a toggle button with aria-pressed, not built yet), or the set runs past roughly 7-10 options (a filtering multi-select combobox or listbox, not built yet).
- **Often used with:** `checkbox-control`, `checkbox-group`, `field-label`, `field-message`, `focus-ring`, `button`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `checked` | boolean | — | no | The controlled binary. Pair with `onChange`; use `defaultChecked` for the uncontrolled form. Named for the DOM attribute rather than the framework idiom — `checked`, not `isChecked`/`isSelected`. Inside a Checkbox.Group this is derived from the group's value array and a consumer should not also wire it here. |
| `defaultChecked` | boolean | `false` | no | Uncontrolled initial value. Never `true` for a consent checkbox — pre-checked consent is a dark pattern and, for marketing consent, often unlawful. |
| `indeterminate` | boolean | `false` | no | The mixed visual state — dash glyph, `aria-checked="mixed"`. PRESENTATIONAL: the underlying value is still true/false, and this is for parent/child select-all hierarchy only, never a third state a user can click to. There is no `indeterminate` HTML attribute — it is a DOM PROPERTY (`node.indeterminate = true`), which is the single most common checkbox bug; in React apply it through a synchronous ref callback rather than a JSX prop. |
| `label` | node | — | no | Rich content: a node, not a string. The substrate's label is a string above the field; this one sits inline-end, doubles as the hit target, and must be able to hold a link, because the single most common real checkbox label is a consent line with one in it ("I agree to the Terms of Service"). A standalone control with no label is `checkbox-control`, which then requires an external `aria-label`/`aria-labelledby`. |
| `description` | node | — | no | Optional helper beneath the label, describedby-wired — the detail that qualifies the choice without lengthening the label. |
| `onChange` | (checked: boolean, event) => void | — | no | Restated rather than inherited: the substrate's change yields a string, this one yields the resulting BOOLEAN alongside the event. |
| `value` | string | — | no | The string submitted when checked (the platform default is `"on"`), and the element this row contributes to a Checkbox.Group's array. An unchecked box submits nothing at all rather than a false value — the missing-key trap. |
| `readOnly` | boolean | `false` | no | Restated only for the caveat: `<input type="checkbox">` has NO working `readonly` — only `disabled` — so a genuinely read-only checkbox needs `aria-readonly` plus a prevented toggle, or is better rendered as static text. Decide which explicitly; the default of doing neither is a control that looks interactive and silently is not. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the control square, the label's type ramp, the box↔label gap and the row's minimum height. The square reads `control.size.<rung>.height` on BOTH axes — square by construction rather than by two tokens agreeing — and not `icon.size.*`, which is 16/20/24 in every brand the engine ships and so would hold a control rigid that should move with brand density. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `read-only`, `error`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** checkbox (native \<input type="checkbox">), with aria-checked true / false / mixed
- **WCAG:**
  - 2.5.8 Target Size — the intent: the whole ROW is the target, because the 12–24px box fails in isolation. The default (medium) row is held to a 44px minimum height on comfortable and spacious density; small and compact rows are not measured.
  - 4.1.2 Name Role Value (role, checked AND mixed — `aria-checked="mixed"` must be set explicitly)
  - 1.3.1 Info and Relationships (group structure)
  - 3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion (group-level)
  - 1.4.11 Non-text Contrast / 2.4.13 Focus Appearance (control boundary and focus indicator)
  - 3.3.7 Redundant Entry (repeated consents)
- **Keyboard:** Each checkbox is its OWN Tab stop and Space toggles — the key cross-control difference from Radio.Group, which is one Tab stop for the group with arrows moving within it. NEVER override Enter: Enter submits the enclosing form, and hijacking it breaks universal web behavior.
- **Focus:** :focus-visible ring on the CONTROL, offset, at least 3:1 — keyboard traversal only, not mouse or touch. The visual box stays tight while the interactive footprint is generous: the hit target is expanded by padding on the row WRAPPER (the icon-button parallel), so clicking the label or the surrounding space toggles. The target aims for at least 24x24, scaling to 44 (Apple) / 48 (Material) on touch. The label sits inline-end of the control, not above it.
- **ARIA:** Prefer the styled native input — `appearance: none` plus a pseudo-element or SVG keeps role, checked state and Space-to-toggle for free; a `role="checkbox"` div is a last resort and must reproduce aria-checked (true/false/mixed) exactly. Relying on the visual dash glyph alone to convey indeterminate is an accessibility failure. For a set, `role="group"` plus `aria-labelledby` is the default over `fieldset`/`legend` — both are valid, but fieldset has flexbox and grid quirks that make it hard to style predictably, and role=group on a div keeps the layout freedom while preserving the shared-label announcement. Group error and required associate to the GROUP and announce once; an individual row never owns its own required or error. When the control is nested in a host row, the host provides the accessible name through aria-labelledby — never double-label.

## Motion

- **Enter:** None of the row's own (present on mount). On check, the nested Checkbox.Control draws its glyph and crossfades its fill, about 100-150ms.
- **Exit:** None of the row's own. On uncheck, the nested control runs the same glyph transition back.
- **Reduced motion:** No layout motion. Under prefers-reduced-motion, the nested glyph flips instantly; a crossfade under 150ms may remain.

## Composition

- **Composes with:** `checkbox-control`
- **Alternative to:** `switch-row`, `radio-row`
- **Planned:** `form`, `toggle-button`, `combobox`, `listbox`, `chip`
- **Replaces:**
  - a bare \<input type="checkbox"> with no label wiring
  - a role="checkbox" div where a styled native input would do

---

Generated from the `checkbox-row` component definition.
