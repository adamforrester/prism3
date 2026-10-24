# Slider.Thumb

> The thumb a Slider moves: an ink disc that sits on the track. Used only inside a Slider.

- **ID:** `_slider-thumb`
- **Category:** form
- **Status:** draft
- **Also known as:** slider-handle, slider-knob

## Overview

The handle a Slider moves along its track: a disc in neutral ink that sits on the track with no gap. A light halo grows around it at hover and wider while pressed, and it shows the focus ring while it has keyboard focus. It comes in the Slider's three sizes. It lives inside a Slider, which places one thumb for a single value and two for a range, and is never placed on its own.

- **Purpose:** The handle a Slider moves, inside a Slider only.
- **Use when:** Only as a child of a Slider. Generate a Slider, which places one thumb for a single value and two for a range, and sets their size and state.
- **Avoid when:** Anywhere outside a Slider. A switch handle is Switch.Control; a value chosen by dragging is a Slider.

## Anatomy

Shown on the default member: size `medium`.

1. **Frame** — The thumb, exactly the disc's size, so the track never moves with state. The halo overflows it.
2. **Press halo** — The outer 4px of the halo, painted only while pressed. Centered on the frame and larger than it, so it overflows on every side.
3. **Hover halo** — The inner 4px of the halo: a stroke inside its own edge, at hover and pressed.
4. **Disc** — The disc in neutral ink. It steps darker or lighter at hover and press.
5. **Focus ring** — The shared focus ring, 2px at a 2px offset around the disc while it has keyboard focus. On the thumb, never the track.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | The disc's diameter: 18, 24 or 30px at the default density, from control.size.*.thumb. Set by the Slider. |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Usage guidelines

Part of a Slider. The Slider places one thumb for a single value and two for a range, and sets each thumb's name, value, size and state.

### Do

- Extend its hit area in code to at least 44×44px at every size, with a transparent ::before inset outward
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

- 1.4.11 Non-text Contrast (the disc targets 3:1 against the page and against the track at rest, hover and press)
- 2.4.7 Focus Visible / 2.4.13 Focus Appearance (the shared focus ring, as intent)
- 2.5.8 Target Size (targets a 44×44px hit area in code at every size, beyond the visible disc)

### Motion

- **Enter:** None.
- **Exit:** None.
- **Reduced motion:** While dragging the thumb follows the pointer with no transition. After a track click or a key step it slides on the fast duration, and the halo grows on the same duration; under reduced motion both change at once.

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
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The disc's diameter: 18, 24 or 30px at the default density, from control.size.*.thumb. Set by the Slider. |
| `disabled` | boolean | `false` | no | The disabled look. Set by the Slider when the whole control is disabled. |

## Specs

Generated from the plan that builds the design-file component: 15 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `frame` | frame | every member |
| `frame/pressHalo` | frame | every member |
| `frame/pressHalo/hoverHalo` | frame | every member |
| `frame/pressHalo/hoverHalo/disc` | frame | every member |
| `frame/focusRing` | instance | state=focus-visible |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `control.size.md.thumb` | `control.size.md.thumb` | — | — |
| `frame/pressHalo` | `space.050` | — | — | — | — | — |
| `frame/pressHalo/hoverHalo` | `space.050` | — | — | — | — | — |
| `frame/pressHalo/hoverHalo/disc` | — | — | `control.size.md.thumb` | `control.size.md.thumb` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `control.size.sm.thumb` | `control.size.sm.thumb` | — | — |
| `frame/pressHalo` | `space.050` | — | — | — | — | — |
| `frame/pressHalo/hoverHalo` | `space.050` | — | — | — | — | — |
| `frame/pressHalo/hoverHalo/disc` | — | — | `control.size.sm.thumb` | `control.size.sm.thumb` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `control.size.lg.thumb` | `control.size.lg.thumb` | — | — |
| `frame/pressHalo` | `space.050` | — | — | — | — | — |
| `frame/pressHalo/hoverHalo` | `space.050` | — | — | — | — | — |
| `frame/pressHalo/hoverHalo/disc` | — | — | `control.size.lg.thumb` | `control.size.lg.thumb` | — | — |

### Color

Keyed by `state`.

**state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/pressHalo/hoverHalo/disc` | `color.interactive.neutral.border.rest` | — | — | — |

**state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/pressHalo/hoverHalo` | — | `color.border.primary` | — | — |
| `frame/pressHalo/hoverHalo/disc` | `color.interactive.neutral.border.hover` | — | — | — |

**state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/pressHalo` | `color.border.primary` | — | — | — |
| `frame/pressHalo/hoverHalo` | — | `color.border.primary` | — | — |
| `frame/pressHalo/hoverHalo/disc` | `color.interactive.neutral.border.pressed` | — | — | — |

**state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/pressHalo/hoverHalo/disc` | `color.interactive.neutral.border.rest` | — | — | — |

**state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/pressHalo/hoverHalo/disc` | `color.disabled.icon` | — | — | — |

### Nesting and properties

- `frame/focusRing` nests `focus-ring` at `surface=default`

---

Generated from the `_slider-thumb` component definition.
