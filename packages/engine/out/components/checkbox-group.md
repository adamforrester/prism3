# Checkbox.Group

> Labeled stack of Checkbox rows. Owns the value array, required and validation.

A labeled set for selecting any number — zero to many — from a bounded list of options. A required section label (FieldLabel) above a vertical stack of Checkbox.Row options. Owns the contract a single row cannot: the value array, group-level required, and all validation, announced once for the group. Use for a small bounded multi-select; past roughly 7-10 options a filtering multi-select combobox (not built yet) scans better. Not exactly-one selection (Radio.Group), not a single independent opt-in (a lone Checkbox.Row), not an immediate-effect setting list (a list of Switch.Row).

- **ID:** `checkbox-group`
- **Category:** form
- **Status:** draft
- **Also known as:** checkbox-set, checkboxes, checkbox-list, multiselect, checkbox-fieldset

## Usage

Use to select any number — zero to many — from a bounded set, where the change is committed on save rather than applied instantly. Give the group a label that names the decision; let it own the value array, required and validation, and derive each row's checked state from the value array rather than wiring it on the row. Compose the rows as `children`. Past roughly 7-10 options, a filtering multi-select combobox (not built yet) scans better; for exactly-one selection use Radio.Group, and for a single independent opt-in a lone Checkbox.Row.

### Do

- Give the group a label that names the decision, so its rows can read the short abstracted-up remainder
- Let the GROUP own the value array, required and validation — a row inside a group never manages its own
- Derive each row's checked state from the group's value array; never wire checked on a row in a group
- Keep required and error at the group level, announced once (aria-required / aria-invalid on the group)
- Prefer role="group" + aria-labelledby over fieldset/legend for the layout freedom

### Don't

- Pre-check a consent option — a dark pattern, and for marketing consent often unlawful
- Wire checked, onChange or required on an individual row inside a group — all three belong to the group
- Model an exclusive one-of-many choice as a checkbox group — that is Radio.Group
- Reach for a checkbox group past roughly 7-10 options — a filtering multi-select combobox (not built yet) scans better
- Override Enter to toggle — Enter submits the form, and that expectation is universal

### Content guidelines

The group label names the decision; the rows carry the short options. Group errors read "Select at least one option" rather than "Invalid".

### Copy patterns

- **Labels:** The group label NAMES THE DECISION or asks the question ("Notification preferences", "Which contact methods?"), abstracting the shared word up so its rows read the short remainder ("Email", "SMS", "Push"). Sentence case, no trailing colon — FieldLabel's rules.
- **Errors:** GROUP-LEVEL and specific — "Select at least one option", stating what is wrong and how to fix it (SC 3.3.3), never "Invalid". The rows stay neutral; the group carries the message. The error visual is not designed yet.

## Choosing it

- **Purpose:** Select any number — zero to many — from a bounded set via a labeled stack of Checkbox.Row options, with the group owning the value array, group-level required and all validation.
- **Use when:** A small bounded multi-select committed on save (notification preferences, feature opt-ins, a filter set), where seeing all the options aids the choice and the group needs one label, one required rule and one validation message.
- **Avoid when:** Exactly one option may be chosen (Radio.Group — any-number versus exactly-one), a single independent opt-in with no siblings (a lone Checkbox.Row — a consent line, "remember me"), the change takes effect the instant it is toggled (a list of Switch.Row — staged versus immediate), or the set runs past roughly 7-10 options (a filtering multi-select combobox or listbox, not built yet).
- **Often used with:** `checkbox-row`, `checkbox-control`, `field-label`, `field-message`
- **Keywords:** checkbox group, checkbox set, checkboxes, multiselect, select all, choose any, notification preferences, opt in list
- **Generation priority:** 2

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The group heading, rendered as the nested FieldLabel and the group's accessible name (role="group" + aria-labelledby). Names the decision the set answers ("Notification preferences"), letting its rows read the abstracted-up short labels ("Email", "SMS", "Push"). |
| `value` | string[] | — | no | The controlled array of checked option values. The GROUP owns it; each row's checked appearance is DERIVED (`checked = value.includes(row.value)`), never wired on the row. Pair with `onChange`; use `defaultValue` for the uncontrolled form. |
| `defaultValue` | string[] | — | no | Uncontrolled initial selection. Never pre-check a consent option — a dark pattern, and for marketing consent often unlawful. |
| `onChange` | (value: string[], event) => void | — | no | Fires with the NEW value array when any row toggles. The group dispatches it; a row never owns its own onChange inside a group. |
| `required` | boolean | `true` | no | Whether at least one option must be chosen. On by default. Drives the nested FieldLabel's required marker and aria-required on the group. Group-level: an individual row never owns its own required. A form that marks the optional minority instead sets this false. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the group — the label's type and every row (control square, label ramp, gap) together, passed into the nested FieldLabel and rows by `follow`, so the group scales with the rest of the form. |
| `name` | string | — | no | A shared control name so the set submits as one field and works uncontrolled in a native form. |
| `disabled` | boolean | `false` | no | Disables the whole set — every row and the label dim, driven by the group's context (the field's native disabled is the source of truth). Not projected as a Figma state; the group has no disabled treatment of its own. |

## States

`rest`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** group (role="group" on the container, or a native \<fieldset>) with aria-labelledby pointing at the FieldLabel; each row is a native \<input type="checkbox">
- **WCAG:**
  - 1.3.1 Info and Relationships (the group structure — role="group" + the shared label — is the meaning)
  - 3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion (GROUP-level, announced once)
  - 4.1.2 Name Role Value (the group name via aria-labelledby; each row carries its own checked / mixed)
  - 2.5.8 Target Size (each row is its own target — the group does not change that)
  - 3.3.7 Redundant Entry (repeated consents across a form)
- **Keyboard:** Each checkbox row is its OWN Tab stop and Space toggles it — the same model as a standalone Checkbox.Row, and the key difference from Radio.Group (one Tab stop, arrows within). The group adds no roving tabindex and no arrow navigation; it is a labeled container, not a single composite widget. NEVER override Enter (it submits the enclosing form).
- **Focus:** Focus lands on each row's control in turn; the group container is not itself focusable. On a validation error, move focus to the first invalid group (its label / first row) and announce the group-level message.
- **ARIA:** Prefer role="group" on a div plus aria-labelledby over \<fieldset>/\<legend>: both are valid, but fieldset has flexbox/grid quirks that make it hard to style, and role="group" keeps the layout freedom while preserving the shared-label announcement. The GROUP owns required and error — aria-required and aria-invalid associate to the group and announce once; an individual row never owns its own required or error. Do not double-label: the rows carry their short labels, the group carries the decision.

## Composition

- **Composes with:** `checkbox-row`, `field-label`, `field-message`
- **Alternative to:** `radio-group`, `select`, `switch-row`
- **Planned:** `form`, `combobox`
- **Replaces:**
  - a bare set of \<input type="checkbox"> with no shared label or group wiring
  - per-row required / error scattered across the options instead of owned by the group

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- value / onChange — the GROUP owns the checked-value ARRAY and the change callback (`value: string[]`), and each row's checked appearance is DERIVED from it (`checked = value.includes(row.value)`), never wired on a row inside the group. Figma has no data model, so the projected rows show a fixed default selection; the array and its wiring are the code projection's. This is the contract the brief (§2) puts on the group and a single `checkbox-row` structurally cannot express.
- the id / describedby WIRING and role="group" — the host generates ids, ties the FieldLabel to the group via aria-labelledby, and stitches any group message into aria-describedby. Figma has no accessibility tree and no node-to-node reference, so the nested label sits above the rows and is associated by proximity alone (the ceiling field-label already hits).

---

Generated from the `checkbox-group` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
