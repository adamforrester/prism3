# Checkbox.Group

> Labeled stack of Checkbox rows. Owns the value array, required and validation. Size applies to the items you haven't edited. After editing an item, select the items and set their size.

- **ID:** `checkbox-group`
- **Category:** form
- **Status:** draft
- **Also known as:** checkbox-set, checkboxes, checkbox-list, multiselect, checkbox-fieldset, choice-list

## Overview

A labeled set for selecting any number — zero to many — from a bounded list of options. A required section label (FieldLabel) above a vertical stack of Checkbox.Row options. Owns the contract a single row cannot: the value array, group-level required, and all validation, announced once for the group. Use for a small bounded multi-select; past roughly 7-10 options a filtering multi-select combobox (not built yet) scans better. Not exactly-one selection (Radio.Group), not a single independent opt-in (a lone Checkbox.Row), not an immediate-effect setting list (a list of Switch.Row).

- **Purpose:** Select any number — zero to many — from a bounded set via a labeled stack of Checkbox.Row options, with the group owning the value array, group-level required and all validation.
- **Use when:** A small bounded multi-select committed on save (notification preferences, feature opt-ins, a filter set), where seeing all the options aids the choice and the group needs one label, one required rule and one validation message.
- **Avoid when:** Exactly one option may be chosen (Radio.Group — any-number versus exactly-one), a single independent opt-in with no siblings (a lone Checkbox.Row — a consent line, "remember me"), the change takes effect the instant it is toggled (a list of Switch.Row — staged versus immediate), or the set runs past roughly 7-10 options (a filtering multi-select combobox or listbox, not built yet).

## Anatomy

Shown on the default member: size `medium`, status `default`.

1. **Label** — The group heading and accessible name, composed rather than re-declared. Starts primary and bold; its label text, required marker, emphasis and weight surface on the group. Its size follows the group; a fix to FieldLabel reaches here without a copy. Fills the group's width; a long heading wraps at FieldLabel's max width.
2. **Items** — The items: a native slot holding the Checkbox.Row instances, three by default. A designer adds, removes and reorders rows in place.
3. **Row1** — The first Checkbox.Row — always present. Nests the labeled row (which nests the control), following the group's size. Fills the group's width. Its checked state is derived from the group's value array, not wired here.
4. **Row2** — The second default item: a Checkbox.Row, the same nest configuration as the first, including the group-width fill.
5. **Row3** — The third default item: a Checkbox.Row, the same nest configuration as the first, including the group-width fill.
6. **Message** — The group's validation message under the options, a nested FieldMessage present only when the group is at error. Its status follows the group's, so it shows the error glyph and ink. Fills the group's width, so a long message wraps.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | Scales the group — the label's type and every row (control square, label ramp, gap) together, passed into the nested FieldLabel and rows by follow, so the group scales with the rest of the form. |
| `status` | `default`, `error` | at runtime | — |

## Usage guidelines

Use to select any number — zero to many — from a bounded set, where the change is committed on save rather than applied instantly. Give the group a label that names the decision; let it own the value array, required and validation, and derive each row's checked state from the value array rather than wiring it on the row. Compose the rows as items. Past roughly 7-10 options, a filtering multi-select combobox (not built yet) scans better; for exactly-one selection use Radio.Group, and for a single independent opt-in a lone Checkbox.Row.

### Do

- Give the group a label that names the decision, so its rows can read the short abstracted-up remainder
- Let the group own the value array, required and validation — a row inside a group never manages its own
- Derive each row's checked state from the group's value array; never wire checked on a row in a group
- Keep required and error at the group level, announced once (aria-required / aria-invalid on the group)
- Prefer role="group" + aria-labelledby over fieldset/legend for the layout freedom

### Don't

- Pre-check a consent option — a dark pattern, and for marketing consent often unlawful
- Wire checked, onChange or required on an individual row inside a group — all three belong to the group
- Model an exclusive one-of-many choice as a checkbox group — that is Radio.Group
- Reach for a checkbox group past roughly 7-10 options — a filtering multi-select combobox (not built yet) scans better
- Override Enter to toggle — Enter submits the form, and that expectation is universal

## Accessibility

- **Keyboard:** Each checkbox row is its own Tab stop and Space toggles it — the same model as a standalone Checkbox.Row, and the key difference from Radio.Group (one Tab stop, arrows within). The group adds no roving tabindex and no arrow navigation; it is a labeled container, not a single composite widget. Never override Enter (it submits the enclosing form).
- **Focus:** Focus lands on each row's control in turn; the group container is not itself focusable. On a validation error, move focus to the first invalid group (its label / first row) and announce the group-level message.
- **Screen readers:** group (role="group" on the container, or a native \<fieldset>) with aria-labelledby pointing at the FieldLabel; each row is a native \<input type="checkbox">

  Prefer role="group" on a div plus aria-labelledby over \<fieldset>/\<legend>: both are valid, but fieldset has flexbox/grid quirks that make it hard to style, and role="group" keeps the layout freedom while preserving the shared-label announcement. The group owns required and error — aria-required and aria-invalid associate to the group and announce once, and the group's message joins its aria-describedby; an individual row never owns its own required or error. The group passes its status to every row, so the rows show the error without each claiming it. Do not double-label: the rows carry their short labels, the group carries the decision.

### WCAG

- 1.3.1 Info and Relationships (the group structure — role="group" + the shared label — is the meaning)
- 3.3.2 Labels or Instructions (the group label, announced once for the set)
- 3.3.1 Error Identification / 3.3.3 Error Suggestion — at the group level, announced once: at status=error every row draws the danger border and the message under the options says what is wrong and how to fix it. The border is never the only signal.
- 4.1.2 Name Role Value (the group name via aria-labelledby; each row carries its own checked / mixed)
- 2.4.13 Focus Appearance / 1.4.11 Non-text Contrast (the control boundary and focus indicator, on each row)
- 2.5.8 Target Size (each row is its own target — the group does not change that)
- 3.3.7 Redundant Entry (repeated consents across a form)

### Motion

- **Enter:** None (present on mount). Each row's nested control draws its own check, about 100-150ms.
- **Exit:** None. Rows do not animate in or out of the stack.
- **Reduced motion:** No layout motion at any setting. Under prefers-reduced-motion, each nested control flips instantly.

## Content guidelines

The group label names the decision; the rows carry the short options. Group errors read "Select at least one option" rather than "Invalid".

- **Labels:** The group label names the decision or asks the question ("Notification preferences", "Which contact methods?"), abstracting the shared word up so its rows read the short remainder ("Email", "SMS", "Push"). Sentence case, no trailing colon — FieldLabel's rules.
- **Errors:** Group-level and specific — "Select at least one option", stating what is wrong and how to fix it (SC 3.3.3), never "Invalid". The group sets status=error on every row (the danger border on each box) and shows the message once, under the options.

## Related components

- **Built from:** `checkbox-row`, `field-label`, `field-message`
- **Instead, consider:** `radio-group`, `switch-row`
- **Often used with:** `checkbox-control`
- **Replaces:**
  - a bare set of \<input type="checkbox"> with no shared label or group wiring
  - per-row required / error scattered across the options instead of owned by the group

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The group heading, rendered as the nested FieldLabel and the group's accessible name (role="group" + aria-labelledby). Names the decision the set answers ("Notification preferences"), letting its rows read the abstracted-up short labels ("Email", "SMS", "Push"). |
| `items` | slot of `checkbox-row`, 1 or more | — | yes | The options, each a Checkbox.Row, in order. Three by default; a designer adds, removes and reorders them in place. |
| `value` | string[] | — | no | The controlled array of checked option values. The group owns it; each row's checked appearance is derived (checked = value.includes(row.value)), never wired on the row. Pair with onChange; use defaultValue for the uncontrolled form. |
| `defaultValue` | string[] | — | no | Uncontrolled initial selection. Never pre-check a consent option — a dark pattern, and for marketing consent often unlawful. |
| `onChange` | (value: string[], event) => void | — | no | Fires with the new value array when any row toggles. The group dispatches it; a row never owns its own onChange inside a group. |
| `required` | boolean | `false` | no | Whether at least one option must be chosen. Off by default. Drives the nested FieldLabel's required marker and aria-required on the group. Group-level: an individual row never owns its own required. A form that marks the optional minority instead sets this false. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the group — the label's type and every row (control square, label ramp, gap) together, passed into the nested FieldLabel and rows by follow, so the group scales with the rest of the form. |
| `name` | string | — | no | A shared control name so the set submits as one field and works uncontrolled in a native form. |
| `validation` | enum: 'default' \| 'error' | `default` | no | The group's validation status. error passes to every row, which draws the danger border on each box, shows validationMessage under the options, and sets aria-invalid on the group. default is neutral. Set it here, never on one row. |
| `validationMessage` | string \| node | — | no | The error text shown under the options at error, added to the group's aria-describedby. Say what is wrong and how to fix it (SC 3.3.3): "Select at least one option", never "Invalid". |
| `disabled` | boolean | `false` | no | Disables the whole set — every row and the label dim, driven by the group's context (the field's native disabled is the source of truth). The group has no disabled treatment of its own. |

## Specs

Generated from the plan that builds the design-file component: 6 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/label` | instance | every member |
| `container/items` | slot | every member |
| `container/items/row1` | instance | every member |
| `container/items/row2` | instance | every member |
| `container/items/row3` | instance | every member |
| `container/message` | instance | status=error |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.0` | — | — | 120px (literal) | build width 320px (literal) |
| `container/items` | — | `space.0` | — | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.0` | — | — | 120px (literal) | build width 320px (literal) |
| `container/items` | — | `space.0` | — | — | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.0` | — | — | 120px (literal) | build width 320px (literal) |
| `container/items` | — | `space.0` | — | — | — | — |

### Color

Keyed by `status`.

### Nesting and properties

- `container/label` nests `field-label` at `size=medium, emphasis=primary, weight=bold, state=rest`; follows `size`; exposes `emphasis`, `weight`
- `container/items` is a slot, preferring `checkbox-row`
- `container/items/row1` nests `checkbox-row` at `size=medium, status=default`; follows `size`, `status`
- `container/items/row2` nests `checkbox-row` at `size=medium, status=default`; follows `size`, `status`
- `container/items/row3` nests `checkbox-row` at `size=medium, status=default`; follows `size`, `status`
- `container/message` nests `field-message` at `status=error`; follows `status`

| Property | Type | Default |
| --- | --- | --- |
| `items` | slot | — |

---

Generated from the `checkbox-group` component definition.
