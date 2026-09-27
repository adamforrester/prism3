# Checkbox.Control

> Checkbox box with check/dash glyph and focus ring. Nested by Checkbox.Row; no label.

The atomic checkbox control — the painted square with its check or dash glyph and its focus ring, and nothing else. Nested by the labeled Checkbox.Row rather than placed on its own: it carries no label, no description and no hit-target padding, so a standalone use needs an external aria-label. Carries the three-value selection axis (unchecked / checked / indeterminate) whose mark is a real part gated on the coordinate, the per-rung clamped corner, and the 2px control border.

- **ID:** `checkbox-control`
- **Category:** form
- **Status:** draft
- **Also known as:** checkbox-box, check-control, checkbox-atom

## Usage

Do not place this on its own. It is the box Checkbox.Row nests, so a fix to its corner, its border weight or its fill grammar reaches the row and the group without being copied. Build it before the row that nests it (the nest resolves by name against the live file). A standalone use is only for a control with an external label and its own aria wiring — the uncommon case with no labeled row.

### Do

- Nest this from Checkbox.Row rather than redrawing the box per host
- Let the host row expose `selection` and `state` and `follow` its size, so the nested control tracks the row
- Supply an external aria-label only when using the control genuinely alone, with no labeled row to name it

### Don't

- Place a bare control square as the clickable element — it fails SC 2.5.8 in isolation; the labeled row is the hit target
- Double-label a nested control — the host row already provides the accessible name
- Reach for this atom when you want the labeled case — that is Checkbox.Row

### Content guidelines

The atom has no copy of its own; all label, description and error text belongs to the row and the group that compose it.

### Copy patterns

- **Labels:** None — the atom carries no label. The consent line and its rules live on Checkbox.Row (`checkbox-row`).
- **Errors:** None of its own — an error boundary is a color treatment the host coordinate selects; the message is Checkbox.Group's (`checkbox-group`).

## Choosing it

- **Purpose:** Render the atomic checkbox control — the painted square with its check or dash glyph and focus ring — for a host row to nest.
- **Use when:** Nested by the labeled Checkbox.Row (the common case), or standalone only for a control with an external label and its own aria wiring.
- **Avoid when:** You want the labeled case (that is Checkbox.Row), a mutually-exclusive one-of-many (Radio.Control), or an immediate-effect toggle (Switch.Control). Never place a bare control square as the clickable element — the hit target is the labeled row.
- **Often used with:** `checkbox-row`, `focus-ring`, `checkbox-group`
- **Keywords:** checkbox control, checkbox box, check box atom, checkbox square
- **Generation priority:** 3

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `checked` | boolean | — | no | The filled/checked appearance. Driven by the host row from the group's value array — a bare Checkbox.Control is styled by the coordinate, not wired to state here. |
| `indeterminate` | boolean | `false` | no | The mixed appearance — the dash glyph. PRESENTATIONAL, for parent/child select-all hierarchy, never a third value a user clicks to; the host carries `aria-checked="mixed"`. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the control square (both axes from one key, square by construction), its corner and its glyph. The host row passes its own size through by `follow`, so the nested control tracks the row. |
| `disabled` | boolean | `false` | no | The disabled skin — a contrast-exempt fill/border/glyph treatment. Set on the host, followed here. |
| `aria-label` | string | — | no | Required only for a genuinely standalone control with no host row to name it — the Row provides the accessible name through the label, so a nested control must NOT double-label. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `error`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium`, `large` | once, when authored |
| `selection` | `unchecked`, `checked`, `indeterminate` | at runtime |

## Accessibility

- **Role:** The visual control only — the accessible checkbox role, name and aria-checked (true/false/mixed) belong to the host input the Row wires. A standalone use must supply role and name itself.
- **WCAG:**
  - 1.4.11 Non-text Contrast (the control boundary — border on the empty box, self-bounding fill on the filled one)
  - 2.4.13 Focus Appearance (the nested focus ring, offset, at least 3:1 against the adjacent surface and the control edge)
  - 4.1.2 Name Role Value (carried by the host; this atom is presentational when nested)
- **Keyboard:** None of its own — the atom is not a tab stop. Focus, Space-to-toggle and the tab order belong to the host input; the ring here renders the host's `:focus-visible` state.
- **Focus:** The nested focus ring surrounds the square on `:focus-visible`, offset so an unbroken sliver of background separates the ring from the control's own border (WCAG 1.4.11). Keyboard traversal only, never mouse or touch.
- **ARIA:** When nested in a host row, the host provides the accessible name through `aria-labelledby` — never double-label. Relying on the visual dash glyph alone to convey indeterminate is a failure; `aria-checked="mixed"` carries it, and the host sets it.

## Composition

- **Composes with:** `focus-ring`
- **Alternative to:** `radio-control`, `switch-control`
- **Replaces:**
  - the painted control inlined in a checkbox row

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- read-only — deliberately not a state of this atom. It is the field/row-level concern the brief calls "the awkward one" (static text over a styled locked control), so there is no box treatment to project and the state is absent rather than admitted-and-unbound. The Row and the Group decide it.
- The check-glyph draw animation (brief §8: a stroke-dasharray draw at roughly 100-150ms, morphing dash to check, bypassed under prefers-reduced-motion). Neither the def schema nor a Figma variant carries motion, so the two glyph parts are static outlines at every coordinate.
- The whole-row hit target. A bare control square is a 12-24px box that fails SC 2.5.8 in isolation; the accessible target is the labeled ROW, which is `checkbox-row` and not this atom. This def is nested, never placed alone, precisely so the target is supplied one level up.

---

Generated from the `checkbox-control` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
