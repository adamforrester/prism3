# Radio.Group

> Labeled stack of Radio rows. Owns the shared name, one value and validation. Size applies to the items you haven't edited. After editing an item, select the items and set their size.

- **ID:** `radio-group`
- **Category:** form
- **Status:** draft
- **Also known as:** radio-set, radios, radio-list, single-select, radio-fieldset, radio-button-group, choice-list

## Overview

A labeled set for choosing exactly one from a small set of mutually exclusive, all-visible options. A required section label (FieldLabel) above a vertical stack of Radio.Row options. Owns the contract a single radio cannot — and without which the radios are not radios at all: the shared name that enforces exclusivity, the single scalar value, the single tab stop with roving focus, and all validation, announced once for the group. Use for 2 to about 7 options where seeing them all aids the decision; past that, a Select or a filtering combobox (not built yet) scans better. Not any-number selection (Checkbox.Group), not a single independent opt-in (a lone Checkbox.Row), not an immediate-effect setting list (a list of Switch.Row), not the same choice collapsed (Select) or in a compact skin (SegmentedControl).

- **Purpose:** Choose exactly one from a bounded set via a labeled stack of Radio.Row options, with the group owning the shared name, the single scalar value, group-level required and all validation.
- **Use when:** A small bounded single-select committed on save (shipping method, plan tier, a contact preference), where seeing all 2 to about 7 options aids the choice and the group needs one label, one required rule and one validation message.
- **Avoid when:** Any number of options may be chosen (Checkbox.Group — exactly-one versus any-number), a single independent opt-in with no siblings (a lone Checkbox.Row), the change takes effect the instant it is toggled (Switch.Row, or SegmentedControl), or the set runs past about 7 options or vertical space is tight (a Select, or a filtering combobox, not built yet).

## Anatomy

Shown on the default member: size `medium`, status `default`.

1. **Label** — The group heading and accessible name, composed rather than re-declared. Starts secondary and bold; its label text, required marker, emphasis and weight surface on the group. Its size follows the group; a fix to FieldLabel reaches here without a copy. Fills the group's width; a long heading wraps at FieldLabel's max width. It is MANDATORY: an unlabeled radio group announces "radio button, 1 of 3" with no idea what the choice is.
2. **Items** — The items: a native slot holding the Radio.Row instances, three by default. A designer adds, removes and reorders rows in place.
3. **Row1**
4. **Row2** — The second default item: a Radio.Row, the same nest configuration as the first, including the group-width fill.
5. **Row3** — The third default item: a Radio.Row, the same nest configuration as the first, including the group-width fill.
6. **Message** — The group's validation message under the options, a nested FieldMessage present only when the group is at error. Its status follows the group's, so it shows the error glyph and ink. Fills the group's width, so a long message wraps.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | Scales the group — the label's type and every row (control circle, label ramp, gap) together, passed into the nested FieldLabel and rows by follow, so the group scales with the rest of the form. |
| `status` | `default`, `error` | at runtime | — |

## Usage guidelines

Use to choose exactly one of 2 to about 7 mutually exclusive, all-visible options where seeing them all aids the decision — a shipping method, a plan tier. Give the group a label that names the decision; let it own the shared name, the single scalar value, required and validation, and derive each row's checked state from the value rather than wiring it on the row. Compose the rows as items. Prefer vertical orientation, which scans better and lets long labels wrap safely. Past about 7 options a Select or a filtering combobox (not built yet) scans better; for any-number selection use Checkbox.Group, and for an immediate-effect setting Switch.Row.

### Do

- Give the group a label that names the decision, so its rows can read the short abstracted-up remainder
- Let the group own the shared name, the single scalar value, required and validation — an option never manages its own
- Derive each row's checked state from the group's scalar value; never wire checked on a row in a group
- Give an optional group an explicit "None" option — a radio cannot be deselected, so a stray click is otherwise permanent
- Keep required and error at the group level, announced once (aria-required / aria-invalid on the group)
- Prefer role="radiogroup" + aria-labelledby over fieldset/legend for the layout freedom

### Don't

- Set checked, onChange or name on an individual option — all three belong to the group, and an option setting its own name breaks exclusivity outright
- Make each option its own tab stop — the group is one stop with arrow navigation, and getting this wrong is the most common radio accessibility failure
- Model an any-number choice as a radio group — that is Checkbox.Group
- Reach for a radio group past about 7 options or in tight vertical space — that is a Select
- Override Enter to select — Enter submits the form, and that expectation is universal

## Accessibility

- **Keyboard:** The keyboard model is the opposite of Checkbox.Group's. The group is a single tab stop: Tab moves into the group and the next Tab moves out, while arrow keys move between options, wrapping at the ends, with Home/End jumping to first/last. Space selects the focused option, and selection follows focus by default (arrowing moves focus and selects — native \<input type="radio"> behavior and the APG default). Implement with roving tabindex — one radio at tabindex="0" (the checked one, or the first if none), siblings at -1, arrow handling moving focus and calling .focus() — not aria-activedescendant. Making each option its own tab stop is the most common radio accessibility failure. Never override Enter (it submits the enclosing form).
- **Focus:** Focus lands on one option at a time (roving), not on every option in turn. On focus restore into the group (a validation error, a legend click), focus the checked radio rather than blindly the first; if none is checked, the first non-disabled option. The group container is not itself focusable. Keep the :focus-visible ring instant (a fade lags rapid arrow navigation) and circular (the control is full-round).
- **Screen readers:** radiogroup (role="radiogroup" on the container, or a native \<fieldset>) with aria-labelledby pointing at the FieldLabel; each row is a native \<input type="radio"> sharing the group's name

  Prefer role="radiogroup" on a div plus aria-labelledby over \<fieldset>/\<legend>: both are valid, but fieldset has flexbox/grid quirks that make it hard to style, and role="radiogroup" keeps the layout freedom while preserving the shared-label announcement. The group label is mandatory for meaning: without it assistive tech announces an orphaned "radio button, 1 of 3". The group owns required and error — aria-required and aria-invalid associate to the group and announce once, and the group's message joins its aria-describedby; an individual option never owns its own required or error. The group passes its status to every option, so the options show the error without each claiming it. Native inputs sharing a name give the grouping, the exclusivity and the roving-tabindex keyboard model for free. Do not double-label: the rows carry their short labels, the group carries the decision.

### WCAG

- 1.3.1 Info and Relationships (the group structure — role="radiogroup" + the shared label — is the meaning)
- 3.3.2 Labels or Instructions (the group label, announced once for the set)
- 3.3.1 Error Identification / 3.3.3 Error Suggestion — at the group level, announced once: at status=error every option draws the danger ring and the message under the options says what is wrong and how to fix it. The ring is never the only signal.
- 4.1.2 Name Role Value (the group name via aria-labelledby; each option carries its own checked)
- 2.4.13 Focus Appearance / 1.4.11 Non-text Contrast (the control boundary and focus indicator, on each option)
- 2.5.8 Target Size (each row is its own target — the group does not change that)

### Motion

- **Enter:** None (present on mount). On select, the chosen option's dot scales in, about 100-150ms.
- **Exit:** Selecting an option animates the previously selected option's dot out — exclusivity made visible, and the only exit a radio has. Rows do not animate in or out of the stack.
- **Reduced motion:** No layout motion. Under prefers-reduced-motion, both dots snap through opacity and color only; the focus ring appears instantly at every setting.

## Content guidelines

The group label names the decision; the rows carry the short options. Group errors read "Select a shipping method" rather than "Invalid".

- **Labels:** The group label names the decision or asks the question ("Shipping method", "How should we contact you?"), abstracting the shared word up so its rows read the short remainder ("Standard", "Express", "Overnight"). Sentence case, no trailing colon — FieldLabel's rules. May be visually hidden when an enclosing labeled section already frames it, but must stay programmatically present.
- **Errors:** Group-level and specific — "Select a shipping method", stating what is wrong and how to fix it (SC 3.3.3), never "Invalid". The group sets status=error on every option (the danger ring on each) and shows the message once, under the options.
- **Empty states:** The group starts empty by default, so no option carries a pre-selected state — this forces a deliberate choice. Pre-select only where a genuinely safe recommended default exists. A radio cannot be deselected, so once chosen the group cannot return to empty: an optional group must carry an explicit "None" or "N/A" option, or a stray click permanently pollutes the data. If a "None" option would corrupt the data model, the choice belongs in a clearable Select instead.

## Related components

- **Built from:** `radio-row`, `field-label`, `field-message`
- **Instead, consider:** `checkbox-group`, `select`, `switch-row`, `segmented-control`
- **Often used with:** `radio-control`
- **Replaces:**
  - a bare set of \<input type="radio"> with no shared label or group wiring
  - a set of checkboxes misused for a mutually exclusive choice
  - per-option required / error scattered across the options instead of owned by the group

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The group heading, rendered as the nested FieldLabel and the group's accessible name (role="radiogroup" + aria-labelledby). Names the decision the set answers ("Shipping method", "How should we contact you?"), letting its rows read the abstracted-up short labels ("Standard", "Express", "Overnight"). Mandatory for meaning: without it assistive tech announces an orphaned "radio button, 1 of 3" with no indication of what is being chosen. |
| `items` | slot of `radio-row`, 1 or more | — | yes | The options, each a Radio.Row, in order. Three by default; a designer adds, removes and reorders them in place. |
| `value` | string | — | no | The controlled scalar selected option value — exactly one, where Checkbox.Group owns an array. The group owns it; each row's checked appearance is derived (checked = (value === row.value)), never wired on the row. Pair with onChange; use defaultValue for the uncontrolled form. |
| `defaultValue` | string | — | no | Uncontrolled initial selection — a single option value. Start empty (unset) to force a deliberate choice; pre-select only where a genuinely safe recommended default exists, and never pre-select a consent-shaped option. |
| `onChange` | (value: string, event) => void | — | no | Fires with the new scalar value when a different row is selected. The group dispatches it; a row never owns its own onChange inside a group. Keep it cheap — selection follows focus by default, so a screen-reader user arrowing through fires it at every step. |
| `required` | boolean | `false` | no | Whether an option must be chosen. Off by default. Drives the nested FieldLabel's required marker and aria-required on the group. Group-level: an individual row never owns its own required. An optional group must instead carry an explicit "None" option, because a radio cannot be deselected — a stray click is otherwise permanent. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the group — the label's type and every row (control circle, label ramp, gap) together, passed into the nested FieldLabel and rows by follow, so the group scales with the rest of the form. |
| `name` | string | — | yes | The shared control name — load-bearing here, not a submission convenience: it is what enforces browser-level exclusivity across the set, so every group sets one. An individual option never sets its own, which would break exclusivity outright. |
| `validation` | enum: 'default' \| 'error' | `default` | no | The group's validation status. error passes to every option, which draws the danger ring on each, shows validationMessage under the options, and sets aria-invalid on the group. default is neutral. A radio is never invalid on its own, so this is the only place to set it. |
| `validationMessage` | string \| node | — | no | The error text shown under the options at error, added to the group's aria-describedby. Say what is wrong and how to fix it (SC 3.3.3): "Select a shipping method", never "Invalid". |
| `disabled` | boolean | `false` | no | Disables the whole set — every row and the label dim, driven by the group's context (the native disabled is the source of truth). The group has no disabled treatment of its own. |

---

Generated from the `radio-group` component definition.
