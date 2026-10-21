# Checkbox.Control

> Checkbox box with check/dash glyph and focus ring. Nested by Checkbox.Row; no label.

- **ID:** `checkbox-control`
- **Category:** form
- **Status:** draft
- **Also known as:** checkbox-box, check-control, checkbox-atom

## Overview

The atomic checkbox control — the painted square with its check or dash glyph and its focus ring, and nothing else. Nested by the labeled Checkbox.Row rather than placed on its own: it carries no label, no description and no hit-target padding, so a standalone use needs an external aria-label. Carries the three-value selection axis (unchecked / checked / indeterminate) whose mark is a real part gated on the coordinate, the per-rung clamped corner, and the 2px control border.

- **Purpose:** Render the atomic checkbox control — the painted square with its check or dash glyph and focus ring — for a host row to nest.
- **Use when:** Inside Checkbox.Row, the common case. On its own only when a host with a separate label names it and the collection owns the selection, such as a table select-all, a selectable card or a selectable list row, with its own ARIA wiring.
- **Avoid when:** You want the labeled case (that is Checkbox.Row), a mutually-exclusive one-of-many (Radio.Control), or an immediate-effect toggle (Switch.Control). Never place a bare control square as the clickable element — the hit target is the labeled row.

## Anatomy

Shown on the default member: size `medium`, selection `unchecked`, status `default`.

1. **Control**
2. **Mark**
3. **Dash**
4. **Focus ring**

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | Scales the control square (both axes from one key, square by construction), its corner and its glyph. The host row passes its own size through by follow, so the nested control tracks the row. |
| `selection` | `unchecked`, `checked`, `indeterminate` | at runtime | — |
| `status` | `default`, `error` | at runtime | — |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Usage guidelines

Do not place this on its own as a form control. It is the box Checkbox.Row nests, so a fix to its corner, its border weight or its fill grammar reaches the row and the group without being copied. Build it before the row that nests it (the nest resolves by name against the live file). It is also the unit a host nests when the label is decoupled — a select-all in a table's first column, a card-select where the card is the accessible name, a list or menu row. Nested that way, the host names the control through aria-labelledby, the host owns the hit target (the whole row toggles, unless the row has its own primary action — then the control is a secondary affordance with its own name, such as "Select \<item>"), and the enclosing collection is the group: it owns the selected ids and select-all, so no Checkbox.Group goes inside a list. Resolve every nested case to one model — the whole row is one control, or the control is a named secondary affordance — never a control inside a row that is itself a button or link with no clear click target.

### Do

- Nest this from Checkbox.Row rather than redrawing the box per host
- Let the host row expose selection and state and follow its size, so the nested control tracks the row
- Supply an external aria-label only when using the control genuinely alone, with no labeled row to name it
- Nest it in a table cell, card or list row when the label is decoupled — the host row supplies the name and the collection owns the selection

### Don't

- Place a bare control square as the clickable element — it fails SC 2.5.8 in isolation; the labeled row is the hit target
- Double-label a nested control — the host row already provides the accessible name
- Reach for this atom when you want the labeled case — that is Checkbox.Row
- Nest a Checkbox.Group inside a selectable list — the collection is the group
- Put the control inside a row that is itself a button or link with no clear model of which one a click hits

## Accessibility

- **Keyboard:** None of its own — the atom is not a tab stop. Focus, Space-to-toggle and the tab order belong to the host input; the ring here renders the host's :focus-visible state.
- **Focus:** The nested focus ring surrounds the square on :focus-visible, offset so an unbroken sliver of background separates the ring from the control's own border (WCAG 1.4.11). Keyboard traversal only, never mouse or touch.
- **Screen readers:** The visual control only — the accessible checkbox role, name and aria-checked (true/false/mixed) belong to the host input the Row wires. A standalone use must supply role and name itself.

  When nested in a host row, the host provides the accessible name through aria-labelledby — never double-label. Relying on the visual dash glyph alone to convey indeterminate is a failure; aria-checked="mixed" carries it, and the host sets it. The danger border at status=error is never the only signal: the host sets aria-invalid (on the row for a standalone choice, on the group for a set) and its message names the error.

### WCAG

- 1.4.11 Non-text Contrast (the control boundary — border on the empty box, self-bounding fill on the filled one)
- 2.4.13 Focus Appearance (the nested focus ring, offset, at least 3:1 against the adjacent surface and the control edge)
- 4.1.2 Name Role Value (carried by the host; this atom is presentational when nested)

### Motion

- **Enter:** On check, the check glyph draws in as a pen stroke (SVG stroke-dashoffset) while the fill crossfades in, about 100-150ms, eased. Indeterminate to checked morphs the dash into the check.
- **Exit:** On uncheck, the same glyph transition runs back and the fill crossfades out.
- **Reduced motion:** Under prefers-reduced-motion, the draw and any spatial animation are bypassed and the box flips instantly; a crossfade under 150ms may remain, since opacity does not trigger vestibular symptoms. No layout motion.

## Content guidelines

The atom has no copy of its own; all label, description and error text belongs to the row and the group that compose it.

- **Labels:** None — the atom carries no label. The consent line and its rules live on Checkbox.Row (checkbox-row).
- **Errors:** None of its own — the error boundary is the status=error danger border, set by the host row or group; the message is the host's (Checkbox.Group shows it under its options).

## Related components

- **Built from:** `focus-ring`
- **Instead, consider:** `radio-control`, `switch-control`
- **Often used with:** `checkbox-row`, `checkbox-group`
- **Replaces:**
  - the painted control inlined in a checkbox row

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `checked` | boolean | — | no | The filled/checked appearance. Driven by the host row from the group's value array — a bare Checkbox.Control is styled by the coordinate, not wired to state here. |
| `indeterminate` | boolean | `false` | no | The mixed appearance — the dash glyph. Presentational, for parent/child select-all hierarchy, never a third value a user clicks to; the host carries aria-checked="mixed". |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the control square (both axes from one key, square by construction), its corner and its glyph. The host row passes its own size through by follow, so the nested control tracks the row. |
| `disabled` | boolean | `false` | no | The disabled skin — a contrast-exempt fill/border/glyph treatment. Set on the host, followed here. |
| `validation` | enum: 'default' \| 'error' | `default` | no | The validation status. error draws the danger border on the box at every interaction state; default is neutral. Set by the host row, or by the group around it, and followed here. |
| `aria-label` | string | — | no | Required only for a genuinely standalone control with no host row to name it — the Row provides the accessible name through the label, so a nested control must not double-label. |

## Specs

Generated from the plan that builds the design-file component: 90 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `control` | frame | every member |
| `control/focusRing` | instance | state=focus-visible |
| `control/mark` | frame | selection=checked |
| `control/mark/glyph` | instance | selection=checked |
| `control/dash` | frame | selection=indeterminate |
| `control/dash/glyph` | instance | selection=indeterminate |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `control` | — | — | `control.size.md.height` | `control.size.md.height` | — | — |
| `control/mark` | — | — | `control.size.md.height` | `control.size.md.height` | — | — |
| `control/dash` | — | — | `control.size.md.height` | `control.size.md.height` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `control` | — | — | `control.size.sm.height` | `control.size.sm.height` | — | — |
| `control/mark` | — | — | `control.size.sm.height` | `control.size.sm.height` | — | — |
| `control/dash` | — | — | `control.size.sm.height` | `control.size.sm.height` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `control` | — | — | `control.size.lg.height` | `control.size.lg.height` | — | — |
| `control/mark` | — | — | `control.size.lg.height` | `control.size.lg.height` | — | — |
| `control/dash` | — | — | `control.size.lg.height` | `control.size.lg.height` | — | — |

### Color

Keyed by `selection`, `status`, `state`.

**selection=unchecked, status=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.field.border.rest` | — | — |

**selection=unchecked, status=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.field.border.hover` | — | — |

**selection=unchecked, status=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.field.border.rest` | — | — |

**selection=unchecked, status=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.field.border.rest` | — | — |

**selection=unchecked, status=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.disabled.border` | — | — |

**selection=unchecked, status=error, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.border.danger` | — | — |

**selection=unchecked, status=error, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.border.danger` | — | — |

**selection=unchecked, status=error, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.border.danger` | — | — |

**selection=unchecked, status=error, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.border.danger` | — | — |

**selection=unchecked, status=error, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | — | `color.disabled.border` | — | — |

**selection=checked, status=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.selected` | — | — | — |
| `control/mark/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=checked, status=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.hover` | — | — | — |
| `control/mark/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=checked, status=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.pressed` | — | — | — |
| `control/mark/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=checked, status=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.selected` | — | — | — |
| `control/mark/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=checked, status=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.disabled.fill` | — | — | — |
| `control/mark/glyph` | — | — | — | `color.disabled.on-fill` |

**selection=checked, status=error, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.selected` | `color.border.danger` | — | — |
| `control/mark/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=checked, status=error, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.hover` | `color.border.danger` | — | — |
| `control/mark/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=checked, status=error, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.pressed` | `color.border.danger` | — | — |
| `control/mark/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=checked, status=error, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.selected` | `color.border.danger` | — | — |
| `control/mark/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=checked, status=error, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.disabled.fill` | — | — | — |
| `control/mark/glyph` | — | — | — | `color.disabled.on-fill` |

**selection=indeterminate, status=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.selected` | — | — | — |
| `control/dash/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=indeterminate, status=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.hover` | — | — | — |
| `control/dash/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=indeterminate, status=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.pressed` | — | — | — |
| `control/dash/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=indeterminate, status=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.selected` | — | — | — |
| `control/dash/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=indeterminate, status=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.disabled.fill` | — | — | — |
| `control/dash/glyph` | — | — | — | `color.disabled.on-fill` |

**selection=indeterminate, status=error, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.selected` | `color.border.danger` | — | — |
| `control/dash/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=indeterminate, status=error, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.hover` | `color.border.danger` | — | — |
| `control/dash/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=indeterminate, status=error, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.pressed` | `color.border.danger` | — | — |
| `control/dash/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=indeterminate, status=error, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.interactive.primary.fill.selected` | `color.border.danger` | — | — |
| `control/dash/glyph` | — | — | — | `color.interactive.primary.on-fill` |

**selection=indeterminate, status=error, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `control` | `color.disabled.fill` | — | — | — |
| `control/dash/glyph` | — | — | — | `color.disabled.on-fill` |

### Nesting and properties

- `control/focusRing` nests `focus-ring` at `surface=default`
- `control/mark/glyph` nests `icon/check`
- `control/dash/glyph` nests `icon/minus`

---

Generated from the `checkbox-control` component definition.
