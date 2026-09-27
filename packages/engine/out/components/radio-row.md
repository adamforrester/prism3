# Radio.Row

> One labeled option inside a Radio.Group. The whole row is the hit target.

A control for choosing exactly one from a small set of mutually exclusive, all-visible options — 2 to about 7, where seeing them all aids the decision. This def is the labeled OPTION: it nests a Radio.Control (the outlined circle and its inner selection dot) and carries the option label, with the whole row as the hit target. The group is a separate component and is MANDATORY, because a lone radio is meaningless: it owns the shared name that enforces exclusivity, the single selected value, the single tab stop, and all validation. Selection is derived from the group, never held here. Not any-number selection (Checkbox.Row), not an immediate on/off (Switch.Row), not the same choice collapsed (Select) or in a compact skin (a segmented control, not built yet).

- **ID:** `radio-row`
- **Category:** form
- **Status:** draft
- **Also known as:** radio, radio-button, option
- **Builds on:** `checkbox-row`

## Usage

Use a group of these for exactly one of 2 to about 7 mutually exclusive, all-visible options where seeing them all aids the decision — a shipping method, a plan tier. Always inside a Radio.Group, never alone: the group owns the shared name, the value and the validation. Prefer vertical orientation, which scans better and lets long labels wrap safely; reserve horizontal for a few short options and space them so no label associates with the wrong control. Compose FieldMessage at the GROUP rather than per option.

### Do

- Ship options inside a group — the group owns the shared name, the single value, validation and the tab stop
- Give the group a label; without one, assistive tech announces "radio button, 1 of 3" with no idea what the choice is
- Give an optional group an explicit "None" option — a radio cannot be deselected, so a stray click is otherwise permanent
- Keep onChange cheap, since selection follows focus and a screen-reader user arrowing through fires it at every step
- On focus restore, focus the checked option rather than the first
- Start empty to force a deliberate choice; pre-select only a genuinely safe default

### Don't

- Set checked, onChange or name on an option — all three belong to the group, and an option setting its own name breaks exclusivity outright
- Make each option its own tab stop — the group is one stop with arrow navigation, and getting this wrong is the most common radio accessibility failure
- Add toggle-off behavior — no-deselect is native and deliberate
- Model an exclusive choice as several checkboxes, or a true/false toggle as two radios
- Reach for radio past about 7 options or in tight vertical space — that is Select
- Use radio for a choice that takes effect instantly — that is Switch.Row, or a segmented control (not built yet)

### Content guidelines

Option labels are parallel and brief; the detail that distinguishes them goes in the description. The group label names the decision. Errors are group-level and say what to do.

### Copy patterns

- **Labels:** Parallel, mutually exclusive, scannable — the same grammatical shape across the set, brief, sentence case, no terminal punctuation, and no overlap that would let two options both apply. Long labels wrap rather than ellipsis-truncate, with the control centered within the first line-box so it stays on the first line rather than floating mid-paragraph. The GROUP label names the decision or asks the question ("Shipping method", "How should we contact you?") and may be visually hidden when an enclosing labeled section already frames it, but must stay programmatically present.
- **Errors:** Group-level and specific — "Select a preferred contact method", never "Invalid input" (SC 3.3.3). Never per-option.
- **Empty states:** A group starts EMPTY by default, so no option carries a pre-selected state — the practice forces a deliberate choice and pre-selects only where a genuinely safe recommended default exists. A radio cannot be deselected, so once chosen the group cannot return to empty: an optional group must therefore carry an explicit "None" or "N/A" option, or a stray click permanently pollutes the data with no way back. If a "None" option would corrupt the data model, the choice belongs in a clearable Select instead.

## Choosing it

- **Purpose:** Present one option within a mutually exclusive set via a labeled row that nests the circle-and-dot control, deriving its selected state from the group that owns the value.
- **Use when:** Exactly one of 2 to about 7 all-visible options where seeing them together aids the decision, and the choice is committed on submit rather than applied instantly. Always as a child of a Radio.Group.
- **Avoid when:** Any number of options may be selected (Checkbox.Row — never model an exclusive choice as several checkboxes), the change applies immediately (Switch.Row — and never two radios for a true/false toggle), the set runs past about 7 or vertical space is tight (Select, the collapsed alternative), the choice is a dense frequent view-switch (a segmented control, not built yet, which carries a different accessibility model), or it is really an action (Button). Also do not reach for this def when what is wanted is the group: use Radio.Group (`radio-group`), which owns the name, the value and the validation.
- **Often used with:** `radio-control`, `radio-group`, `field-label`, `field-message`, `focus-ring`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `value` | string | — | yes | Required, where Checkbox.Row's is optional. This is the option's identity within its group, not a string that happens to be submitted. Selection is derived from it: `checked = (group.value === props.value)`. The option never holds a boolean of its own. |
| `label` | node | — | no | Rich content, inline-end of the control, and part of the hit target — the Checkbox.Row label model, inherited. Option labels are parallel, mutually exclusive and brief: the same grammatical shape across the set, with no overlap that would make two options both apply. Long labels WRAP rather than truncate, with the control centered within the first line-box so it stays on the first line. Per-option detail or price belongs in `description`, not in the label. |
| `description` | node | — | no | Per-option helper beneath the label, describedby-wired. This is where the detail that makes an option distinguishable goes — the price, the delivery estimate, the caveat. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the row — the control-to-label gap, the row's minimum height, the label's type — and is passed through to the nested Radio.Control by `follow`, scaling the circle's diameter and the inner dot's. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `read-only`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** radio (native \<input type="radio"> sharing a name), with aria-checked; the group carries role="radiogroup"
- **WCAG:**
  - 1.3.1 Info and Relationships (the group structure is the meaning)
  - 4.1.2 Name Role Value (role and checked)
  - 3.3.2 Labels or Instructions (the option label)
  - 3.3.1 Error Identification / 3.3.3 Error Suggestion — the group's, announced once and never per option. The group error display is not designed yet, so neither is met today.
  - 1.4.11 Non-text Contrast / 2.4.13 Focus Appearance (control boundary and focus indicator)
  - 2.5.8 Target Size — the intent: the whole row is the target, as in Checkbox.Row. The default (medium) row is held to a 44px minimum height on comfortable and spacious density; small and compact rows are not measured.
- **Keyboard:** The keyboard model is the opposite of Checkbox.Row's. The group is a single tab stop: Tab moves into the group and the next Tab moves out, while arrow keys move between options, wrapping at the ends, with Home/End jumping to first/last. Space selects the focused option. Implement with ROVING TABINDEX — one radio at tabindex="0" (the checked one, or the first if none), siblings at -1, with arrow handling moving focus, the 0, and calling .focus() — rather than aria-activedescendant, which is more verbose and prone to synchronization bugs. Making each radio its own tab stop is the most common radio accessibility failure. Native inputs sharing a name give the grouping, the exclusivity and this keyboard model for free.
- **Focus:** :focus-visible ring on the CONTROL, offset, at least 3:1, keyboard traversal only — and CIRCULAR, because the control is full-round and the ring is derived concentrically from it. The ring must appear INSTANTLY — fading it lags rapid arrow navigation. Selection FOLLOWS FOCUS by default: arrowing moves focus and selects, which is native \<input type="radio"> behavior and the APG default, and the catalog keeps native semantics rather than reimplementing them. The known cost is that a screen-reader user exploring the options fires onChange at every step; the answer is to keep radio onChange CHEAP — a radio selection must never trigger navigation or expensive work — and to decouple selection from focus only as a deliberate, documented exception. On focus restore into the group (a validation error, a legend click), focus the CHECKED radio rather than blindly the first; if none is checked, the first non-disabled option.
- **ARIA:** Prefer the styled native input — appearance: none plus a pseudo-element or SVG keeps role, checked state, exclusivity and the roving-tabindex keyboard model for free. For the container, role="radiogroup" plus aria-labelledby is the default over fieldset/legend, for the same CSS-layout reason as Checkbox.Row. THE GROUP LABEL IS MANDATORY FOR MEANING: without it assistive tech announces an orphaned "radio button, 1 of 3" with no indication of what is being chosen. Group error and required associate to the group and announce once; an option never owns its own error. On mobile (Jetpack Compose) put the click target on the ROW rather than the dot — selectableGroup() on the parent, selectable(role = Role.RadioButton) on the row, and onClick = null on the RadioButton itself — or the control double-fires and assistive tech announces twice.

## Motion

- **Enter:** None of the row's own (present on mount). On select, the nested Radio.Control scales its dot in, about 100-150ms; the focus ring appears instantly.
- **Exit:** None of the row's own. When a sibling option is selected, this option's dot animates out — exclusivity made visible.
- **Reduced motion:** No layout motion. Under prefers-reduced-motion, the nested dot snaps through opacity and color only.

## Composition

- **Composes with:** `radio-control`
- **Alternative to:** `checkbox-row`, `switch-row`, `select`
- **Superseded by:** `select`
- **Planned:** `form`, `card`, `segmented-control`, `toggle-button`
- **Replaces:**
  - a set of checkboxes misused for a mutually exclusive choice
  - a bare \<input type="radio"> set with no group label
  - two radios standing in for a true/false toggle

---

Generated from the `radio-row` component definition.
