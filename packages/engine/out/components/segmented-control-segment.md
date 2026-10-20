# SegmentedControl.Segment

> One option of a segmented control. Selected, it shows a flat pill and a bold label.

- **ID:** `segmented-control-segment`
- **Category:** form
- **Status:** draft
- **Also known as:** segment, segmented-control-option

## Overview

One option in a segmented control: a cell as tall as a button, holding the option label and an optional leading icon. A selected option shows a flat pill in the page surface color inside the cell, and its label is set in the emphasis weight. Every option keeps the width of its bold label, so selecting one never moves the others. At hover, an unselected option shows a light neutral wash on the track. SegmentedControl places the options and owns the selection.

- **Purpose:** One option inside a segmented control.
- **Use when:** Only as a child of SegmentedControl.
- **Avoid when:** Anywhere outside a segmented control: a single toggle is a switch or a select tag, and a lone action is a button.

## Anatomy

Shown on the default member: selection `unselected`, size `medium`.

1. **Container** — The option cell, as tall as a button and the whole of the pointer target. It paints nothing: the indicator inside it carries the selection. Inside a segmented control it takes an equal share of the track.
2. **Indicator** — The indicator, inset 4px inside the cell and as wide as the cell allows. Selected, it is a flat pill in the page surface color, with no border or shadow, and it does not change at hover or press; unselected, it is clear at rest and takes a light neutral wash over the track at hover and press.
3. **Content** — The optional leading icon and the label, centered in the indicator.
4. **Leading visual** (optional) — An optional icon before the label. Every option in one control shows an icon, or none does.
5. **Label box** — Holds the label at the width of its selected weight: as wide as the wider of the bold reserve and the label, with the label centered.
6. **Reserve** — A zero-height frame that clips the bold copy of the label: it takes the bold width and shows nothing.
7. **Label reserve** — The label again, in the selected weight, never seen: it holds every option at its bold width.
8. **Label** — The option name, one line: regular when unselected, in the emphasis weight when selected.
9. **Focus ring** — The shared focus ring, around the indicator while the option has keyboard focus.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `selection` | `unselected`, `selected` | at runtime | — |
| `size` | `medium`, `small`, `large` | once, when authored | Option height, padding and label type. Passed down by the control. |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Usage guidelines

Use inside SegmentedControl only. An option names one value; selecting it changes the current view or the form value in place.

### Do

- Give every option in a control the same kind of content: all labels, or all labels with icons
- Let the control set selected from its value

### Don't

- Place an option outside a segmented control
- Set selected on an option inside a control by hand

## Accessibility

- **Keyboard:** Set by the control: in the view behavior each option is a Tab stop and Enter or Space selects it; in the form behavior arrow keys move between options and select.
- **Focus:** A focus ring around the indicator on :focus-visible. It can sit on a different option from the selected one.
- **Screen readers:** a \<button> with aria-current in the view behavior, or a native radio with its label in the form behavior; the control sets which

  A leading icon is aria-hidden when a label is shown. An icon-only option needs an aria-label and a tooltip.

### WCAG

- 1.4.1 Use of Color (the bold label marks the selected option, never the pill alone)
- 1.4.3 Contrast (the label clears 4.5:1 on the pill and on the track at rest, hover and press)
- 1.4.11 Non-text Contrast (the icon clears 3:1 on the pill and the track; the pill against the track has no floor, because it is not the only cue)
- 2.4.13 Focus Appearance (the shared focus ring)
- 2.5.8 Target Size (targets 44px at medium on comfortable and spacious density)

### Motion

- **Enter:** None. On selection the pill moves to this option, or cross-fades, over a short duration.
- **Exit:** None.
- **Reduced motion:** The indicator moves at once; only the color change remains.

## Content guidelines

One or two words, a noun, sentence case.

- **Labels:** A short noun or noun phrase, one line, parallel with the other options ("List", "Grid"). Not a verb phrase.

## Related components

- **Built from:** `focus-ring`
- **Often used with:** `segmented-control`, `icon`
- **Replaces:**
  - a styled button with a hand-rolled active state

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The option name: a short noun or noun phrase, one line. |
| `value` | string | — | yes | The value the control reports when this option is selected. |
| `selected` | boolean | `false` | no | Whether this option is the selected one. Set by the control from its value; do not set it on an option inside a control. |
| `leadingIcon` | slot | — | no | An icon before the label. Decorative when a label is shown. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Option height, padding and label type. Passed down by the control. |
| `disabled` | boolean | `false` | no | Dims this one option and takes it out of interaction, while the rest of the control stays usable. |

## Specs

Generated from the plan that builds the design-file component: 30 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/indicator` | frame | every member |
| `container/indicator/content` | frame | every member |
| `container/indicator/content/leadingVisual` | swap | every member |
| `container/indicator/content/labelBox` | frame | every member |
| `container/indicator/content/labelBox/reserve` | frame | every member |
| `container/indicator/content/labelBox/reserve/labelReserve` | text | every member |
| `container/indicator/content/labelBox/label` | text | every member |
| `container/indicator/focusRing` | instance | state=focus-visible |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.050` | — | `size.md.height` | — | — | build width 120px (literal) |
| `container/indicator/content` | `space.0` / `space.200` / `space.0` / `space.200` | `space.100` | — | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/indicator/content/labelBox/reserve` | — | — | `space.0` | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.050` | — | `size.sm.height` | — | — | build width 120px (literal) |
| `container/indicator/content` | `space.0` / `space.150` / `space.0` / `space.150` | `space.075` | — | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/indicator/content/labelBox/reserve` | — | — | `space.0` | — | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.050` | — | `size.lg.height` | — | — | build width 120px (literal) |
| `container/indicator/content` | `space.0` / `space.250` / `space.0` / `space.250` | `space.100` | — | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/indicator/content/labelBox/reserve` | — | — | `space.0` | — | — | — |

### Type

Keyed by `size`, `selection`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium, selection=unselected | `container/indicator/content/labelBox/reserve/labelReserve` | `type.label.md.emphasis` |
| size=medium, selection=unselected | `container/indicator/content/labelBox/label` | `type.label.md.default` |
| size=small, selection=unselected | `container/indicator/content/labelBox/reserve/labelReserve` | `type.label.sm.emphasis` |
| size=small, selection=unselected | `container/indicator/content/labelBox/label` | `type.label.sm.default` |
| size=large, selection=unselected | `container/indicator/content/labelBox/reserve/labelReserve` | `type.label.lg.emphasis` |
| size=large, selection=unselected | `container/indicator/content/labelBox/label` | `type.label.lg.default` |
| size=medium, selection=selected | `container/indicator/content/labelBox/reserve/labelReserve` | `type.label.md.emphasis` |
| size=medium, selection=selected | `container/indicator/content/labelBox/label` | `type.label.md.emphasis` |
| size=small, selection=selected | `container/indicator/content/labelBox/reserve/labelReserve` | `type.label.sm.emphasis` |
| size=small, selection=selected | `container/indicator/content/labelBox/label` | `type.label.sm.emphasis` |
| size=large, selection=selected | `container/indicator/content/labelBox/reserve/labelReserve` | `type.label.lg.emphasis` |
| size=large, selection=selected | `container/indicator/content/labelBox/label` | `type.label.lg.emphasis` |

### Color

Keyed by `selection`, `state`.

**selection=unselected, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**selection=unselected, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.interactive.neutral.text.hover` | — |

**selection=unselected, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator` | `color.interactive.neutral.overlay.pressed` | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.interactive.neutral.text.pressed` | — |

**selection=unselected, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**selection=unselected, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator/content/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.disabled.text` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.disabled.text` | — |

**selection=selected, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator` | `color.background.primary` | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**selection=selected, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator` | `color.background.primary` | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**selection=selected, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator` | `color.background.primary` | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**selection=selected, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator` | `color.background.primary` | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**selection=selected, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/indicator` | `color.background.primary` | — | — | — |
| `container/indicator/content/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/indicator/content/labelBox/reserve/labelReserve` | — | — | `color.disabled.text` | — |
| `container/indicator/content/labelBox/label` | — | — | `color.disabled.text` | — |

### Nesting and properties

- `container/indicator/content/leadingVisual` is a swap slot, property `↳ swap leading icon`, shown by `leading icon`
- `container/indicator/focusRing` nests `focus-ring` at `surface=default`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Option` |
| `leading icon` | boolean | `false` |
| `↳ swap leading icon` | instance swap | — |

---

Generated from the `segmented-control-segment` component definition.
