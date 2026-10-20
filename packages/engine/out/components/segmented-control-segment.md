# SegmentedControl.Segment

> One option of a segmented control. Selected, it shows a flat pill and an emphasis-weight label.

- **ID:** `segmented-control-segment`
- **Category:** form
- **Status:** draft
- **Also known as:** segment, segmented-control-option

## Overview

One option in a segmented control: a cell as tall as a button, holding the option label and an optional leading icon. A selected option shows a flat pill in the page surface color inside the cell, and its label is set in the emphasis weight. Every option keeps the width of its bold label, so selecting one never moves the others. At hover, an unselected option shows a light neutral wash on the track. SegmentedControl places the options and owns the selection.

- **Purpose:** One option inside a segmented control.
- **Use when:** Only as a child of a SegmentedControl. Generate the SegmentedControl, which places its options and sets which one is selected.
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
- Keep labels to short nouns ("Daily", "Weekly")
- Let the control set selected from its value

### Don't

- Place an option outside a segmented control
- Set selected on an option inside a control by hand
- Wrap a label onto a second line; it breaks the shared track and makes the options uneven

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

---

Generated from the `segmented-control-segment` component definition.
