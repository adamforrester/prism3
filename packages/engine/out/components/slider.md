# Slider

> Choose a value, or a range, by moving a thumb along a track. Works with arrow keys too.

- **ID:** `slider`
- **Category:** form
- **Status:** draft
- **Also known as:** range-slider, range-input, range

## Overview

A slider picks an approximate value, or a range between two values, by moving a thumb along a track: a price filter, a text size, a volume. It suits a value where the position within the range matters more than the exact number. One thumb sets a single value; two thumbs set a minimum and a maximum. The current value shows as text above the track. For an exact number, turn on the paired inputs, or use a text field.

- **Purpose:** Choose an approximate value, or a minimum and maximum, by moving a thumb along a track.
- **Use when:** An approximate value where the position within the range matters more than the exact number, such as a volume, a text size or a price filter window.
- **Avoid when:** The user knows the exact number (use a text field, or turn on the paired inputs), there are a few named options (use a segmented control or a radio group), it is on or off (use a switch), or the range is too wide for the track to reach each value.

## Anatomy

Shown on the default member: size `medium`, type `single`.

1. **Container** — The slider: the field (label, value, track and milestones), then the optional inputs and message. It fills its column.
2. **Field** — The header, the track and the milestones, with no gap between them (Q550 c).
3. **Header** — The label at the start and the value text at the end.
4. **Label** (optional) — The visible label, naming the dimension being set; it fills the room the value leaves.
5. **Value single** (optional) — The current value, formatted as the thumb announces it.
6. **Value range** (optional) — The current range, the minimum and the maximum, formatted as the thumbs announce them.
7. **Control** — The hit area around the track, as tall as the hit target. A click anywhere on it moves the nearer thumb there.
8. **Track** — The track: one thickness (2, 4 or 6px by size), the full range, across the control. The selected bar runs along it and the thumbs sit on it.
9. **Space start** — The track before the minimum thumb of a range, outside the selected range. Paints nothing: the track shows through.
10. **Thumb min** — The minimum thumb of a range. It stays at rest while the maximum thumb shows the state.
11. **Bar** — The selected part of the track, in ink at the track's own thickness: from the start to the thumb, or between the two thumbs of a range. Square-ended, so it meets the disc with no gap.
12. **Thumb** — The thumb of a single value, or the maximum thumb of a range. It shows the state.
13. **Space end** — The track after the thumb, outside the selected value or range. Paints nothing: the track shows through.
14. **Milestones** (optional) — Labeled milestones under the track (Q550 d): the minimum, a value between, and the maximum, spaced evenly. Off by default. No tick marks.
15. **Min label** — The minimum value, under the start of the track.
16. **Milestone**
17. **Max label** — The maximum value, under the end of the track.
18. **Inputs** (optional) — Paired number inputs for exact entry: one for a single value, two for a range. Off by default.
19. **Input single** — The number input of a single value.
20. **Input min** — The minimum input of a range.
21. **Input max** — The maximum input of a range.
22. **Message** (optional) — Help or error text under the slider. Off by default.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | The thumb and the track: an 18px thumb on a 2px track, 24 on 4, or 30 on 6. The label, the value text and the 44px hit area stay the same at every size. |
| `type` | `single`, `range` | once, when authored | Read from value: a number is single, a pair is range. Not set on its own; listed so the two looks have a name. |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Usage guidelines

Use a slider for an approximate value, or a range, where seeing the position within the bounds helps more than the exact number: a price filter, a text size, a volume. Use two thumbs for a minimum and a maximum. For an exact number the user already knows, use a text field, or turn on the paired inputs. Don't use a slider for a few named options (use a segmented control or a radio group) or for on and off (use a switch).

### Do

- Name the dimension with a visible label
- Format the value with its unit or currency, and use the same text for aria-valuetext
- Turn on the paired inputs when an exact value matters
- Bind costly work, such as a network filter, to onChangeEnd

### Don't

- Use a slider for a precise value over a wide range; a 300px track cannot reach every value
- Leave the thumbs of a range unnamed
- Show the value only in a bubble during a drag; it is gone when the drag ends
- Animate the thumb while it is dragged

## Accessibility

- **Keyboard:** Right and Up raise one step; Left and Down lower one step; Page Up and Page Down move ten steps; Home and End go to the minimum and maximum, or for a range thumb to the other thumb. Tab moves from the minimum thumb to the maximum thumb. In right-to-left text, Right lowers and Left raises.
- **Focus:** A focus ring around the focused thumb on :focus-visible, never around the track.
- **Screen readers:** slider, once per thumb, from a visually hidden native \<input type="range">; a range is two sliders in a group named by the label

  Each thumb carries aria-valuenow, aria-valuemin, aria-valuemax and, for a formatted value, aria-valuetext from the same formatter as the visible text. A range names its thumbs "Minimum {label}" and "Maximum {label}", which are translatable. Help and error text join aria-describedby; an error sets aria-invalid on each thumb. The layout mirrors right to left.

### WCAG

- 4.1.2 Name, Role, Value (each thumb named, with aria-valuetext for a formatted value)
- 2.1.1 Keyboard (arrow, Page and Home and End keys on every thumb)
- 1.4.11 Non-text Contrast (the track, the selected part and the thumb target 3:1 against the page, and the selected part 3:1 against the track)
- 1.4.1 Use of Color (the selected part is bounded by the thumbs, and the value text states it, so it is not told apart by color alone)
- 2.4.7 Focus Visible / 2.4.13 Focus Appearance (the focus ring on the thumb, as intent)
- 2.5.7 Dragging Movements (a click on the rail, the keys or the paired inputs move a thumb without dragging)
- 2.5.8 Target Size (targets a 44×44px hit area on each thumb in code)
- 3.3.2 Labels or Instructions (a visible label names the dimension)

### Motion

- **Enter:** None.
- **Exit:** None.
- **Reduced motion:** While dragging, the thumb and the fill follow the pointer with no transition. After a click on the rail or a key step the thumb slides on the fast duration with the default easing; under reduced motion it moves at once.

## Content guidelines

The label names the dimension. The value text shows the value with its unit; a range shows both ends, "$40 – $120".

- **Labels:** Name the dimension, in sentence case: "Price", "Volume", "Text size". The value text carries the unit, currency or percent, formatted for the locale ("$40 – $120", "120%").
- **Errors:** Say what is wrong and how to fix it, in the field message: "Enter a maximum of 200 or less."

## Related components

- **Built from:** `field-label`, `_slider-thumb`, `text-field`, `field-message`
- **Instead, consider:** `text-field`, `segmented-control`, `radio-group`, `switch-row`
- **Replaces:**
  - a native \<input type="range"> styled per browser engine
  - a drag-only custom slider with no keyboard support
  - two separate sliders for a minimum and a maximum

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | Names the dimension being set, such as "Price" or "Volume". Shown above the track, and the accessible name of a single thumb. |
| `value` | number \| [number, number] | — | no | The value. A number sets one thumb; a pair of numbers, such as [40, 120], sets a range with two thumbs. Controlled; pair it with onChange. |
| `defaultValue` | number \| [number, number] | — | no | The starting value when the slider manages its own state. A pair starts a range. |
| `onChange` | function | — | no | Called on every change while dragging or stepping, for a live preview. |
| `onChangeEnd` | function | — | no | Called once when the pointer is released or a key step ends. Bind costly work here, such as a network filter, so a drag does not call it for every pixel. |
| `min` | number | `0` | no | The lowest value. |
| `max` | number | `100` | no | The highest value. |
| `step` | number | `1` | no | The amount one arrow key or one snap moves. Every value is rounded to the nearest exact multiple of the step before onChange. |
| `largeStep` | number | — | no | The amount Page Up and Page Down move. Ten steps when not set. |
| `minStepsBetweenThumbs` | number | `0` | no | For a range, how many steps the two thumbs must stay apart. A thumb stops there and never crosses the other. |
| `formatOptions` | Intl.NumberFormatOptions | — | no | How the value reads: a currency, a percent, a unit. Drives the visible value text and each thumb's aria-valuetext from one formatter, so what is seen and what is heard match. |
| `thumbLabels` | [string, string] | — | no | For a range, the two thumb names. "Minimum {label}" and "Maximum {label}" when not set. |
| `type` | enum: 'single' \| 'range' | `single` | no | Read from value: a number is single, a pair is range. Not set on its own; listed so the two looks have a name. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The thumb and the track: an 18px thumb on a 2px track, 24 on 4, or 30 on 6. The label, the value text and the 44px hit area stay the same at every size. |
| `showValue` | boolean | `true` | no | Shows the value text above the track. Turn it off only when the paired inputs show the value instead. |
| `showMilestones` | boolean | `false` | no | Shows labeled milestones under the track: the minimum and the maximum at its ends, and any values in milestones between them, each under its own position. |
| `milestones` | Array\<number \| { value: number; label: string }> | — | no | The values labeled under the track when showMilestones is on, such as [500, 1000]. A plain number is formatted like the value text; an object gives its own label. The minimum and the maximum are always labeled. |
| `showInputs` | boolean | `false` | no | Shows paired number inputs under the track: one for a single value, "Minimum" and "Maximum" for a range. Typing moves the thumb; dragging updates the input. With inputs on, turn the value text off. |
| `helpText` | string | — | no | Guidance under the slider, in a field message. |
| `validation` | enum: 'default' \| 'error' | `default` | no | error marks the slider invalid: the field message shows the error status and each thumb carries aria-invalid. A slider's own value is always in range, so an error comes from a paired input or from validation elsewhere in the form. |
| `validationMessage` | string | — | no | The error text, shown in the field message and added to aria-describedby. Say what is wrong and how to fix it. |
| `disabled` | boolean | `false` | no | Takes the slider out of interaction and out of the form payload, and dims it. |
| `readOnly` | boolean | `false` | no | The thumbs stay focusable and the value is still submitted, but it cannot change. Looks like rest. |
| `name` | string | — | no | The form field name. A range submits two values. |

## Specs

Generated from the plan that builds the design-file component: 30 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/field` | frame | every member |
| `container/field/header` | frame | every member |
| `container/field/header/label` | instance | every member |
| `container/field/header/valueSingle` | text | type=single |
| `container/field/control` | frame | every member |
| `container/field/control/track` | frame | every member |
| `container/field/control/track/bar` | frame | every member |
| `container/field/control/track/thumb` | instance | every member |
| `container/field/control/track/spaceEnd` | frame | every member |
| `container/field/milestones` | frame | every member |
| `container/field/milestones/minLabel` | text | every member |
| `container/field/milestones/milestone` | text | every member |
| `container/field/milestones/maxLabel` | text | every member |
| `container/inputs` | frame | every member |
| `container/inputs/inputSingle` | instance | type=single |
| `container/message` | instance | every member |
| `container/field/header/valueRange` | text | type=range |
| `container/field/control/track/spaceStart` | frame | type=range |
| `container/field/control/track/thumbMin` | instance | type=range |
| `container/inputs/inputMin` | instance | type=range |
| `container/inputs/inputMax` | instance | type=range |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/field` | — | `space.0` | — | — | — | — |
| `container/field/control` | — | — | `size.md.min-height` | — | — | — |
| `container/field/control/track` | — | — | `border-width.heavy` | — | — | — |
| `container/field/control/track/bar` | — | — | `border-width.heavy` | — | — | — |
| `container/field/control/track/spaceEnd` | — | — | `border-width.heavy` | — | — | — |
| `container/inputs` | — | `space.150` | — | — | — | — |
| `container/field/control/track/spaceStart` | — | — | `border-width.heavy` | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/field` | — | `space.0` | — | — | — | — |
| `container/field/control` | — | — | `size.md.min-height` | — | — | — |
| `container/field/control/track` | — | — | `border-width.thick` | — | — | — |
| `container/field/control/track/bar` | — | — | `border-width.thick` | — | — | — |
| `container/field/control/track/spaceEnd` | — | — | `border-width.thick` | — | — | — |
| `container/inputs` | — | `space.150` | — | — | — | — |
| `container/field/control/track/spaceStart` | — | — | `border-width.thick` | — | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/field` | — | `space.0` | — | — | — | — |
| `container/field/control` | — | — | `size.md.min-height` | — | — | — |
| `container/field/control/track` | — | — | `border-width.x-heavy` | — | — | — |
| `container/field/control/track/bar` | — | — | `border-width.x-heavy` | — | — | — |
| `container/field/control/track/spaceEnd` | — | — | `border-width.x-heavy` | — | — | — |
| `container/inputs` | — | `space.150` | — | — | — | — |
| `container/field/control/track/spaceStart` | — | — | `border-width.x-heavy` | — | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/field/header/valueSingle` | `type.body.sm.default` |
| size=medium | `container/field/milestones/minLabel` | `type.body.xs.default` |
| size=medium | `container/field/milestones/milestone` | `type.body.xs.default` |
| size=medium | `container/field/milestones/maxLabel` | `type.body.xs.default` |
| size=medium | `container/field/header/valueRange` | `type.body.sm.default` |
| size=small | `container/field/header/valueSingle` | `type.body.sm.default` |
| size=small | `container/field/milestones/minLabel` | `type.body.xs.default` |
| size=small | `container/field/milestones/milestone` | `type.body.xs.default` |
| size=small | `container/field/milestones/maxLabel` | `type.body.xs.default` |
| size=small | `container/field/header/valueRange` | `type.body.sm.default` |
| size=large | `container/field/header/valueSingle` | `type.body.sm.default` |
| size=large | `container/field/milestones/minLabel` | `type.body.xs.default` |
| size=large | `container/field/milestones/milestone` | `type.body.xs.default` |
| size=large | `container/field/milestones/maxLabel` | `type.body.xs.default` |
| size=large | `container/field/header/valueRange` | `type.body.sm.default` |

### Color

Keyed by `type`, `state`.

**type=single, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueSingle` | — | — | `color.text.primary` | — |
| `container/field/control/track` | `color.field.border.rest` | — | — | — |
| `container/field/control/track/bar` | `color.interactive.neutral.border.rest` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.text.secondary` | — |
| `container/field/milestones/milestone` | — | — | `color.text.secondary` | — |
| `container/field/milestones/maxLabel` | — | — | `color.text.secondary` | — |

**type=single, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueSingle` | — | — | `color.text.primary` | — |
| `container/field/control/track` | `color.field.border.rest` | — | — | — |
| `container/field/control/track/bar` | `color.interactive.neutral.border.rest` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.text.secondary` | — |
| `container/field/milestones/milestone` | — | — | `color.text.secondary` | — |
| `container/field/milestones/maxLabel` | — | — | `color.text.secondary` | — |

**type=single, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueSingle` | — | — | `color.text.primary` | — |
| `container/field/control/track` | `color.field.border.rest` | — | — | — |
| `container/field/control/track/bar` | `color.interactive.neutral.border.rest` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.text.secondary` | — |
| `container/field/milestones/milestone` | — | — | `color.text.secondary` | — |
| `container/field/milestones/maxLabel` | — | — | `color.text.secondary` | — |

**type=single, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueSingle` | — | — | `color.text.primary` | — |
| `container/field/control/track` | `color.field.border.rest` | — | — | — |
| `container/field/control/track/bar` | `color.interactive.neutral.border.rest` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.text.secondary` | — |
| `container/field/milestones/milestone` | — | — | `color.text.secondary` | — |
| `container/field/milestones/maxLabel` | — | — | `color.text.secondary` | — |

**type=single, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueSingle` | — | — | `color.disabled.text` | — |
| `container/field/control/track` | `color.disabled.fill` | — | — | — |
| `container/field/control/track/bar` | `color.disabled.icon` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.disabled.text` | — |
| `container/field/milestones/milestone` | — | — | `color.disabled.text` | — |
| `container/field/milestones/maxLabel` | — | — | `color.disabled.text` | — |

**type=range, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueRange` | — | — | `color.text.primary` | — |
| `container/field/control/track` | `color.field.border.rest` | — | — | — |
| `container/field/control/track/bar` | `color.interactive.neutral.border.rest` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.text.secondary` | — |
| `container/field/milestones/milestone` | — | — | `color.text.secondary` | — |
| `container/field/milestones/maxLabel` | — | — | `color.text.secondary` | — |

**type=range, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueRange` | — | — | `color.text.primary` | — |
| `container/field/control/track` | `color.field.border.rest` | — | — | — |
| `container/field/control/track/bar` | `color.interactive.neutral.border.rest` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.text.secondary` | — |
| `container/field/milestones/milestone` | — | — | `color.text.secondary` | — |
| `container/field/milestones/maxLabel` | — | — | `color.text.secondary` | — |

**type=range, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueRange` | — | — | `color.text.primary` | — |
| `container/field/control/track` | `color.field.border.rest` | — | — | — |
| `container/field/control/track/bar` | `color.interactive.neutral.border.rest` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.text.secondary` | — |
| `container/field/milestones/milestone` | — | — | `color.text.secondary` | — |
| `container/field/milestones/maxLabel` | — | — | `color.text.secondary` | — |

**type=range, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueRange` | — | — | `color.text.primary` | — |
| `container/field/control/track` | `color.field.border.rest` | — | — | — |
| `container/field/control/track/bar` | `color.interactive.neutral.border.rest` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.text.secondary` | — |
| `container/field/milestones/milestone` | — | — | `color.text.secondary` | — |
| `container/field/milestones/maxLabel` | — | — | `color.text.secondary` | — |

**type=range, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/field/header/valueRange` | — | — | `color.disabled.text` | — |
| `container/field/control/track` | `color.disabled.fill` | — | — | — |
| `container/field/control/track/bar` | `color.disabled.icon` | — | — | — |
| `container/field/milestones/minLabel` | — | — | `color.disabled.text` | — |
| `container/field/milestones/milestone` | — | — | `color.disabled.text` | — |
| `container/field/milestones/maxLabel` | — | — | `color.disabled.text` | — |

### Nesting and properties

- `container/field/header/label` nests `field-label` at `size=medium, emphasis=primary, weight=bold, state=rest`; `state=disabled` takes `state=disabled`
- `container/field/control/track/thumb` nests `_slider-thumb` at `size=medium, state=rest`; `state=hover` takes `state=hover`, `state=pressed` takes `state=pressed`, `state=focus-visible` takes `state=focus-visible`, `state=disabled` takes `state=disabled`; follows `size`
- `container/inputs/inputSingle` nests `text-field` at `size=medium, status=default, state=filled`; `state=disabled` takes `state=disabled`
- `container/message` nests `field-message` at `status=default`
- `container/field/control/track/thumbMin` nests `_slider-thumb` at `size=medium, state=rest`; `state=disabled` takes `state=disabled`; follows `size`
- `container/inputs/inputMin` nests `text-field` at `size=medium, status=default, state=filled`; `state=disabled` takes `state=disabled`
- `container/inputs/inputMax` nests `text-field` at `size=medium, status=default, state=filled`; `state=disabled` takes `state=disabled`

| Property | Type | Default |
| --- | --- | --- |
| `value text` | text | `50` |
| `min label` | text | `0` |
| `milestone` | text | `50` |
| `max label` | text | `100` |
| `range text` | text | `30 – 70` |
| `label` | boolean | `true` |
| `value` | boolean | `true` |
| `milestones` | boolean | `false` |
| `inputs` | boolean | `false` |
| `helper` | boolean | `false` |

---

Generated from the `slider` component definition.
