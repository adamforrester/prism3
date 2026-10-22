# Slider.Thumb

> The thumb a Slider moves: a filled disc with a page-colored ring. Used only inside a Slider.

- **ID:** `_slider-thumb`
- **Category:** form
- **Status:** draft
- **Also known as:** slider-handle, slider-knob

## Overview

The handle a Slider moves along its track: a filled disc in the primary fill with a 2px ring in the page color, which keeps it apart from the fill beside it. It darkens at hover and press, and shows the focus ring while it has keyboard focus. It lives inside a Slider, which places one thumb for a single value and two for a range, and is never placed on its own.

- **Purpose:** The handle a Slider moves, inside a Slider only.
- **Use when:** Only as part of a Slider.
- **Avoid when:** Anywhere outside a Slider. A switch handle is Switch.Control; a value chosen by dragging is a Slider.

## Anatomy

1. **Thumb** — The thumb: a disc in the page color, the 2px ring that keeps the thumb apart from the fill bar beside it, around the inner disc.
2. **Disc** — The inner disc in the primary fill. It darkens at hover and press.
3. **Focus ring** — The shared focus ring, around the thumb while it has keyboard focus. On the thumb, never the track.

## Styles

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Usage guidelines

Part of a Slider. The Slider places one thumb for a single value and two for a range, and sets each thumb's name, value and state.

### Do

- Extend its hit area in code to at least 44×44px at every size, with a transparent `::before` inset outward
- Let the Slider name each thumb, so a range announces "Minimum" and "Maximum", not "slider, slider"

### Don't

- Place a thumb outside a Slider
- Put the focus ring on the track instead of the thumb

## Accessibility

- **Keyboard:** Set by the Slider: arrow keys move one step, Page Up and Page Down one large step, Home and End to the ends of the thumb's range.
- **Focus:** A focus ring around the thumb on :focus-visible, never around the track.
- **Screen readers:** slider, from a visually hidden native \<input type="range">; the Slider wires its name, value and range

  aria-valuenow, aria-valuemin and aria-valuemax from the native input; aria-valuetext whenever the value is not a bare number. Set by the Slider.

### WCAG

- 1.4.11 Non-text Contrast (the disc targets 3:1 against the page at rest, hover and press)
- 2.4.7 Focus Visible / 2.4.13 Focus Appearance (the shared focus ring, as intent)
- 2.5.8 Target Size (targets a 44×44px hit area in code, beyond the visible disc)

### Motion

- **Enter:** None.
- **Exit:** None.
- **Reduced motion:** While dragging the thumb follows the pointer with no transition. After a track click or a key step it slides on the fast duration; under reduced motion it moves at once.

## Content guidelines

No copy of its own.

- **Labels:** None of its own. The Slider names each thumb: its label for a single value, "Minimum {label}" and "Maximum {label}" for a range.

## Related components

- **Built from:** `focus-ring`
- **Often used with:** `slider`
- **Replaces:**
  - the browser's own range thumb, restyled per engine

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `aria-label` | string | — | no | The thumb's accessible name. Set by the Slider: the label for a single value, "Minimum {label}" and "Maximum {label}" for a range. |
| `disabled` | boolean | `false` | no | The disabled look. Set by the Slider when the whole control is disabled. |

## Specs

Generated from the plan that builds the design-file component: 5 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `thumb` | frame | every member |
| `thumb/disc` | frame | every member |
| `thumb/focusRing` | instance | state=focus-visible |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

**every member**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `thumb` | `space.025` | — | `control.size.md.thumb` | `control.size.md.thumb` | — | — |

### Color

Keyed by `state`.

**state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `thumb` | `color.background.primary` | — | — | — |
| `thumb/disc` | `color.interactive.primary.fill.rest` | — | — | — |

**state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `thumb` | `color.background.primary` | — | — | — |
| `thumb/disc` | `color.interactive.primary.fill.hover` | — | — | — |

**state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `thumb` | `color.background.primary` | — | — | — |
| `thumb/disc` | `color.interactive.primary.fill.pressed` | — | — | — |

**state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `thumb` | `color.background.primary` | — | — | — |
| `thumb/disc` | `color.interactive.primary.fill.rest` | — | — | — |

**state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `thumb` | `color.background.primary` | — | — | — |
| `thumb/disc` | `color.disabled.fill` | — | — | — |

### Nesting and properties

- `thumb/focusRing` nests `focus-ring` at `surface=default`

---

Generated from the `_slider-thumb` component definition.
