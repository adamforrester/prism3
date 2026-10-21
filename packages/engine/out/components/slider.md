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

Shown on the default member: type `single`.

1. **Container** — The slider: a header with the label and the value, the track, and the optional end labels, inputs and message. It fills its column.
2. **Header** — The label at the start and the value text at the end.
3. **Label** (optional) — The visible label, naming the dimension being set; it fills the room the value leaves.
4. **Value single** (optional) — The current value, formatted as the thumb announces it.
5. **Value range** (optional) — The current range, the minimum and the maximum, formatted as the thumbs announce them.
6. **Control** — The hit area around the track, as tall as the hit target. A click anywhere on it moves the nearer thumb there.
7. **Track** — The rail: 2px, the full range, across the control. The selected bar and the thumbs sit on it and stand out above and below it.
8. **Space start** — The rail before the minimum thumb of a range, outside the selected range. Paints nothing: the rail shows through.
9. **Thumb min** — The minimum thumb of a range. It stays at rest while the maximum thumb shows the state.
10. **Bar** — The selected part of the track: 4px, from the start to the thumb, or between the two thumbs of a range.
11. **Thumb** — The thumb of a single value, or the maximum thumb of a range. It shows the state.
12. **Space end** — The rail after the thumb, outside the selected value or range. Paints nothing: the rail shows through.
13. **Ends** (optional) — The minimum and maximum under the ends of the track. Off by default.
14. **Min label** — The minimum value.
15. **Max label** — The maximum value.
16. **Inputs** (optional) — Paired number inputs for exact entry: one for a single value, two for a range. Off by default.
17. **Input single** — The number input of a single value.
18. **Input min** — The minimum input of a range.
19. **Input max** — The maximum input of a range.
20. **Message** (optional) — Help or error text under the slider. Off by default.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
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
- 1.4.11 Non-text Contrast (the rail, the fill and the thumb target 3:1 against the page)
- 1.4.1 Use of Color (the fill is thicker than the rail and bounded by the thumbs, not told apart by color alone)
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
| `showValue` | boolean | `true` | no | Shows the value text above the track. Turn it off only when the paired inputs show the value instead. |
| `showEndLabels` | boolean | `false` | no | Shows the minimum and maximum under the ends of the track. |
| `showInputs` | boolean | `false` | no | Shows paired number inputs under the track: one for a single value, "Minimum" and "Maximum" for a range. Typing moves the thumb; dragging updates the input. With inputs on, turn the value text off. |
| `helpText` | string | — | no | Guidance under the slider, in a field message. |
| `validation` | enum: 'default' \| 'error' | `default` | no | error marks the slider invalid: the field message shows the error status and each thumb carries aria-invalid. A slider's own value is always in range, so an error comes from a paired input or from validation elsewhere in the form. |
| `validationMessage` | string | — | no | The error text, shown in the field message and added to aria-describedby. Say what is wrong and how to fix it. |
| `disabled` | boolean | `false` | no | Takes the slider out of interaction and out of the form payload, and dims it. |
| `readOnly` | boolean | `false` | no | The thumbs stay focusable and the value is still submitted, but it cannot change. Looks like rest. |
| `name` | string | — | no | The form field name. A range submits two values. |

## Specs

Generated from the plan that builds the design-file component: 10 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/header` | frame | every member |
| `container/header/label` | instance | every member |
| `container/header/valueSingle` | text | type=single |
| `container/control` | frame | every member |
| `container/control/track` | frame | every member |
| `container/control/track/bar` | frame | every member |
| `container/control/track/thumb` | instance | every member |
| `container/control/track/spaceEnd` | frame | every member |
| `container/ends` | frame | every member |
| `container/ends/minLabel` | text | every member |
| `container/ends/maxLabel` | text | every member |
| `container/inputs` | frame | every member |
| `container/inputs/inputSingle` | instance | type=single |
| `container/message` | instance | every member |
| `container/header/valueRange` | text | type=range |
| `container/control/track/spaceStart` | frame | type=range |
| `container/control/track/thumbMin` | instance | type=range |
| `container/inputs/inputMin` | instance | type=range |
| `container/inputs/inputMax` | instance | type=range |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

**every member**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/control` | — | — | `size.md.min-height` | — | — | — |
| `container/control/track` | — | — | `border-width.thick` | — | — | — |
| `container/control/track/bar` | — | — | `border-width.heavy` | — | — | — |
| `container/control/track/spaceEnd` | — | — | `border-width.thick` | — | — | — |
| `container/inputs` | — | `space.150` | — | — | — | — |
| `container/control/track/spaceStart` | — | — | `border-width.thick` | — | — | — |

### Type

Keyed by nothing: one row covers every member.

| Members | Part | Text style |
| --- | --- | --- |
| every member | `container/header/valueSingle` | `type.body.sm.default` |
| every member | `container/ends/minLabel` | `type.body.xs.default` |
| every member | `container/ends/maxLabel` | `type.body.xs.default` |
| every member | `container/header/valueRange` | `type.body.sm.default` |

### Color

Keyed by `type`, `state`.

**type=single, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueSingle` | — | — | `color.text.primary` | — |
| `container/control/track` | `color.field.border.rest` | — | — | — |
| `container/control/track/bar` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/ends/minLabel` | — | — | `color.text.secondary` | — |
| `container/ends/maxLabel` | — | — | `color.text.secondary` | — |

**type=single, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueSingle` | — | — | `color.text.primary` | — |
| `container/control/track` | `color.field.border.rest` | — | — | — |
| `container/control/track/bar` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/ends/minLabel` | — | — | `color.text.secondary` | — |
| `container/ends/maxLabel` | — | — | `color.text.secondary` | — |

**type=single, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueSingle` | — | — | `color.text.primary` | — |
| `container/control/track` | `color.field.border.rest` | — | — | — |
| `container/control/track/bar` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/ends/minLabel` | — | — | `color.text.secondary` | — |
| `container/ends/maxLabel` | — | — | `color.text.secondary` | — |

**type=single, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueSingle` | — | — | `color.text.primary` | — |
| `container/control/track` | `color.field.border.rest` | — | — | — |
| `container/control/track/bar` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/ends/minLabel` | — | — | `color.text.secondary` | — |
| `container/ends/maxLabel` | — | — | `color.text.secondary` | — |

**type=single, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueSingle` | — | — | `color.disabled.text` | — |
| `container/control/track` | `color.disabled.fill` | — | — | — |
| `container/control/track/bar` | `color.disabled.fill` | — | — | — |
| `container/ends/minLabel` | — | — | `color.disabled.text` | — |
| `container/ends/maxLabel` | — | — | `color.disabled.text` | — |

**type=range, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueRange` | — | — | `color.text.primary` | — |
| `container/control/track` | `color.field.border.rest` | — | — | — |
| `container/control/track/bar` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/ends/minLabel` | — | — | `color.text.secondary` | — |
| `container/ends/maxLabel` | — | — | `color.text.secondary` | — |

**type=range, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueRange` | — | — | `color.text.primary` | — |
| `container/control/track` | `color.field.border.rest` | — | — | — |
| `container/control/track/bar` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/ends/minLabel` | — | — | `color.text.secondary` | — |
| `container/ends/maxLabel` | — | — | `color.text.secondary` | — |

**type=range, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueRange` | — | — | `color.text.primary` | — |
| `container/control/track` | `color.field.border.rest` | — | — | — |
| `container/control/track/bar` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/ends/minLabel` | — | — | `color.text.secondary` | — |
| `container/ends/maxLabel` | — | — | `color.text.secondary` | — |

**type=range, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueRange` | — | — | `color.text.primary` | — |
| `container/control/track` | `color.field.border.rest` | — | — | — |
| `container/control/track/bar` | `color.interactive.primary.fill.rest` | — | — | — |
| `container/ends/minLabel` | — | — | `color.text.secondary` | — |
| `container/ends/maxLabel` | — | — | `color.text.secondary` | — |

**type=range, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/header/valueRange` | — | — | `color.disabled.text` | — |
| `container/control/track` | `color.disabled.fill` | — | — | — |
| `container/control/track/bar` | `color.disabled.fill` | — | — | — |
| `container/ends/minLabel` | — | — | `color.disabled.text` | — |
| `container/ends/maxLabel` | — | — | `color.disabled.text` | — |

### Nesting and properties

- `container/header/label` nests `field-label` at `size=medium, emphasis=secondary, weight=bold, state=rest`; `state=disabled` takes `state=disabled`
- `container/control/track/thumb` nests `_slider-thumb` at `state=rest`; `state=hover` takes `state=hover`, `state=pressed` takes `state=pressed`, `state=focus-visible` takes `state=focus-visible`, `state=disabled` takes `state=disabled`
- `container/inputs/inputSingle` nests `text-field` at `size=medium, status=default, state=filled`; `state=disabled` takes `state=disabled`
- `container/message` nests `field-message` at `status=default`
- `container/control/track/thumbMin` nests `_slider-thumb` at `state=rest`; `state=disabled` takes `state=disabled`
- `container/inputs/inputMin` nests `text-field` at `size=medium, status=default, state=filled`; `state=disabled` takes `state=disabled`
- `container/inputs/inputMax` nests `text-field` at `size=medium, status=default, state=filled`; `state=disabled` takes `state=disabled`

| Property | Type | Default |
| --- | --- | --- |
| `value text` | text | `50` |
| `min label` | text | `0` |
| `max label` | text | `100` |
| `range text` | text | `30 – 70` |
| `label` | boolean | `true` |
| `value` | boolean | `true` |
| `end labels` | boolean | `false` |
| `inputs` | boolean | `false` |
| `helper` | boolean | `false` |

---

Generated from the `slider` component definition.
