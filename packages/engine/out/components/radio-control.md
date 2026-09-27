# Radio.Control

> Outlined radio ring; dot and brand ring on select. Nested by Radio.Row; no label.

The atomic radio control — the painted circle with its inner selection dot and its focus ring, and nothing else. Nested by the labeled Radio.Row rather than placed on its own: it carries no label, no description and no hit-target padding, so a standalone use needs an external aria-label. A constant-weight outlined ring (no fill) at both selections that recolors on select — a neutral edge when unchecked, the interactive brand edge when checked — with an inner filled circle, half the ring's diameter, also appearing on select, never a filled disc. Carries the two-value selection axis (unchecked / checked) whose dot is a real part gated on the coordinate, and the 2px control border.

- **ID:** `radio-control`
- **Category:** form
- **Status:** draft
- **Also known as:** radio-circle, radio-disc, radio-atom

## Usage

Do not place this on its own. It is the circle Radio.Row nests, so a fix to its border weight or its dot geometry reaches the row without being copied. Build it before the row that nests it (the nest resolves by name against the live file). A standalone use is only for a control with an external label and its own aria wiring.

### Do

- Nest this from Radio.Row rather than redrawing the circle per host
- Let the host row pass `selection` and `state` through, and `follow` its size, so the nested control tracks the row
- Let the inner circle and the ring recolor carry the selection; the ring border stays constant in WEIGHT across states, going brand-colored (not thicker) on select
- Supply an external aria-label only when using the control genuinely alone

### Don't

- Place a bare circle as the clickable element — it fails SC 2.5.8 in isolation; the labeled row is the hit target
- Double-label a nested control — the host row already provides the accessible name
- Fill the disc on select — the ring stays outlined and an inner circle shows the selection
- Thicken the border to signal selection — the border WEIGHT is constant across states; selection recolors the ring to brand and adds the inner dot

### Content guidelines

The atom has no copy of its own; all label, description and error text belongs to the row and the group that compose it.

### Copy patterns

- **Labels:** None — the atom carries no label. The option label and its rules live on Radio.Row (`radio-row`); the decision it belongs to lives on Radio.Group (`radio-group`).
- **Errors:** None of its own — an error boundary is a color treatment the host coordinate selects, and radio error is GROUP-level only, never per-option; the message is the group's.

## Choosing it

- **Purpose:** Render the atomic radio control — the outlined circle, its inner selection dot and its focus ring — for a host row to nest.
- **Use when:** Nested by the labeled Radio.Row (the common case), or standalone only for a control with an external label and its own aria wiring.
- **Avoid when:** You want the labeled case (that is Radio.Row), a staged binary opt-in (Checkbox.Row / Checkbox.Control), or an immediate-effect toggle (Switch.Row / Switch.Control). Never place a bare circle as the clickable element — the hit target is the labeled row.
- **Often used with:** `radio-row`, `focus-ring`, `radio-group`
- **Keywords:** radio control, radio circle, radio disc, radio dot, option control
- **Generation priority:** 3

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `checked` | boolean | — | no | The selected appearance — the inner dot present. Driven by the host row from the group's scalar value — a bare Radio.Control is styled by the coordinate, not wired to state here, and never holds a boolean of its own (selection is `group.value === option.value`). |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the control circle (both axes from one key, round by construction) and the inner dot. Both read `control.size.*`, which moves a rung with brand density; `icon.size.*` would resolve and measure the wrong thing (the glyph artboard ladder). The host row passes its own size through by `follow`, so the nested control tracks the row. |
| `disabled` | boolean | `false` | no | The disabled skin — a contrast-exempt border/dot treatment. Set on the host, followed here. |
| `aria-label` | string | — | no | Required only for a genuinely standalone control with no host row to name it — the Row provides the accessible name, so a nested control must NOT double-label. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `error`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium`, `large` | once, when authored |
| `selection` | `unchecked`, `checked` | at runtime |

## Accessibility

- **Role:** The visual control only — the accessible radio role, name and aria-checked belong to the host input the Row wires, and the exclusivity and roving-tabindex keyboard model to Radio.Group. A standalone use must supply role and name itself.
- **WCAG:**
  - 1.4.11 Non-text Contrast (the ring border, and the inner dot against the page)
  - 2.4.13 Focus Appearance (the nested focus ring, offset, at least 3:1 — circular for this round host)
  - 4.1.2 Name Role Value (carried by the host; this atom is presentational when nested)
- **Keyboard:** None of its own — the atom is not a tab stop. Focus, Space-to-select and the group's roving tabindex / arrow navigation belong to the host input and Radio.Group; the ring here renders the host's `:focus-visible` state.
- **Focus:** The nested focus ring surrounds the circle on `:focus-visible`, offset so an unbroken sliver of background separates the ring from the control's own border (WCAG 1.4.11). Circular, because the host is full-round. Keyboard traversal only.
- **ARIA:** When nested in a host row, the host provides the accessible name through `aria-labelledby` — never double-label. The role is `radio`; a lone radio announces "radio button, 1 of N" with no indication of what is being chosen, which is why the group label is mandatory and lives on Radio.Group, not here.

## Composition

- **Composes with:** `focus-ring`
- **Alternative to:** `checkbox-control`, `switch-control`
- **Replaces:**
  - the painted circle and dot inlined in a radio row
  - a filled-disc radio that signals selection by the ring filling in

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- read-only — deliberately not a state of this atom. A radio has no working native readonly, so there is no treatment to project; the field/row/group decides it. The Row admits it in its own `codeOnly`.
- The select micro-motion (a spring/scale-up of the dot at roughly 100-150ms, and — uniquely — a SIBLING's dot animating OUT, the only exit animation a radio has, since it can never be deselected on its own). Neither the def schema nor a Figma variant carries motion, so the dot is static at every coordinate.
- The whole-row hit target. A bare control circle is a 12-24px disc that fails SC 2.5.8 in isolation; the accessible target is the labeled ROW, which is `radio` and not this atom. This def is nested, never placed alone, precisely so the target is supplied one level up.

---

Generated from the `radio-control` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
