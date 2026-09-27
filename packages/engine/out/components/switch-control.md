# Switch.Control

> Switch track, thumb, state glyph and focus ring. Nested by Switch.Row; no label.

The atomic switch control — the painted pill track, its traveling thumb, the X/checkmark state glyph in that thumb, and the focus ring, and nothing else. Nested by the labeled Switch.Row rather than placed on its own: it carries no label, no description and no hit-target padding, so a standalone use needs an external aria-label. Carries the two-value selection axis (off / on) whose thumb POSITION is the part that varies, the off-track border that is load-bearing for WCAG 1.4.11, and the 2px control border.

- **ID:** `switch-control`
- **Category:** form
- **Status:** draft
- **Also known as:** switch-track, toggle-control, switch-atom

## Usage

Do not place this on its own. It is the track-and-thumb Switch.Row nests, so a fix to its border weight or its fill grammar reaches the row without being copied. Build it before the row that nests it (the nest resolves by name against the live file). A standalone use is only for a control with an external label and its own aria wiring.

### Do

- Nest this from Switch.Row rather than redrawing the track per host
- Let the host row pass `selection`, `state` and `showStateLabel` through, and `follow` its size, so the nested control tracks the row
- Let thumb POSITION carry the state; treat the glyph as a legibility aid, not the color-independence answer
- Supply an external aria-label only when using the control genuinely alone

### Don't

- Place a bare track as the clickable element — it fails SC 2.5.8 in isolation; the labeled row is the hit target
- Double-label a nested control — the host row already provides the accessible name
- Put the focus ring on the thumb — it moves, so the indicator would travel with it
- Hardcode "On"/"Off" text beside the control — the glyph affordance and the role announcement carry it

### Content guidelines

The atom has no copy of its own; all label, description and error text belongs to the row that composes it.

### Copy patterns

- **Labels:** None — the atom carries no label. The setting name and its rules live on Switch.Row (`switch-row`).
- **Errors:** None of its own — an outcome-error boundary is a color treatment the host coordinate selects; the message is the Row's.

## Choosing it

- **Purpose:** Render the atomic switch control — the painted pill, its traveling thumb, the X/checkmark state glyph and the focus ring — for a host row to nest.
- **Use when:** Nested by the labeled Switch.Row (the common case), or standalone only for a control with an external label and its own aria wiring.
- **Avoid when:** You want the labeled case (that is Switch.Row), a staged binary submitted with a form (Checkbox.Row / Checkbox.Control), or a mutually-exclusive one-of-many (Radio.Control). Never place a bare track as the clickable element — the hit target is the labeled row.
- **Often used with:** `switch-row`, `focus-ring`
- **Keywords:** switch control, switch track, toggle control, switch thumb, toggle handle
- **Generation priority:** 3

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `checked` | boolean | — | no | The on/off appearance. Driven by the host row — a bare Switch.Control is styled by the coordinate, not wired to state here. The flip is immediate by the Row's contract; this atom only renders the two positions. |
| `showStateLabel` | boolean | `false` | no | The X/checkmark-in-the-thumb affordance — a check when on, an X when off, a cue beyond track color and thumb position. Off by default, since position already carries the state; add only where legibility genuinely demands it. The glyph is present in the Figma set at every member, and this prop gates it in the code projection. Not hardcoded "On"/"Off" text, which is rejected outright. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | Two rungs, not three: switches rarely warrant a large. Scales the track's height and length and the thumb's diameter. All read `control.size.*`, which moves a rung with brand density; `icon.size.*` would measure the wrong thing. The host row passes its own size through by `follow`. |
| `disabled` | boolean | `false` | no | The disabled skin — a contrast-exempt fill/border/thumb treatment. Set on the host, followed here. |
| `aria-label` | string | — | no | Required only for a genuinely standalone control with no host row to name it — the Row provides the accessible name, so a nested control must NOT double-label. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `error`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium` | once, when authored |
| `selection` | `off`, `on` | at runtime |

## Accessibility

- **Role:** The visual control only — the accessible switch role, name and aria-checked (announced "on"/"off", never "checked") belong to the host input the Row wires. A standalone use must supply role and name itself.
- **WCAG:**
  - 1.4.1 Use of Color (thumb POSITION distinguishes on from off; the glyph is a legibility aid, never the color-independence answer)
  - 1.4.11 Non-text Contrast (the off-track border, load-bearing) / 2.4.13 Focus Appearance (the nested ring, offset, ≥3:1)
  - 4.1.2 Name Role Value (carried by the host; this atom is presentational when nested)
- **Keyboard:** None of its own — the atom is not a tab stop. Focus, Space-to-toggle and the tab order belong to the host input; the ring here renders the host's `:focus-visible` state.
- **Focus:** The nested focus ring surrounds the TRACK on `:focus-visible`, never the thumb (the thumb moves, so a ring traveling with it reads as two indicators). Offset, keyboard traversal only.
- **ARIA:** When nested in a host row, the host provides the accessible name through `aria-labelledby` — never double-label. The role is `switch`, announced "on"/"off"; putting `aria-pressed` on it corrupts the announcement (that is a toggle button). The glyph is decorative (`aria-hidden`) — the role+state already carries on/off.

## Composition

- **Composes with:** `focus-ring`
- **Alternative to:** `checkbox-control`, `radio-control`
- **Replaces:**
  - the painted track and thumb inlined in a switch row

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- read-only — deliberately not a state of this atom. It is the field/row-level concern the brief calls "the awkward one" (a lock affordance, not an ink — and the one candidate token, `color.border.secondary`, resolves to the same step as the rest border in all four brands). The Row decides it.
- pending — a THUMB SWAP (a spinner replaces the thumb) and an `aria-busy` lock, not a skin. `button` spells exactly this as an `overlay` part (#848), so the mechanism exists and the part is unauthored here — a second concern in a PR whose subject is the split and the affordance.
- THE THUMB'S TRAVEL AS MOTION. `positionWhen` states WHERE the thumb is at each coordinate; the ~150–200ms ease-in-out slide between them (with the track-color crossfade, collapsing to 0ms under prefers-reduced-motion) is the animation the component is most recognized by and has no expression in this schema.
- THE GLYPH'S OWN MICRO-MOTION — the check/X draw and the cross-fade onto the thumb on an async toggle. Neither the def schema nor a Figma variant carries motion, so the glyphs are static outlines at every coordinate.
- THE WHOLE-ROW HIT TARGET. A bare track is a 16–36px pill that fails SC 2.5.8 in isolation; the accessible target is the labeled ROW, which is `switch` and not this atom. This def is nested, never placed alone, precisely so the target is supplied one level up.

---

Generated from the `switch-control` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
