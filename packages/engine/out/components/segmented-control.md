# SegmentedControl

> A row of two to five options in one track, where exactly one is selected and all stay visible. Size applies to the items you haven't edited. After editing an item, select the items and set their size.

- **ID:** `segmented-control`
- **Category:** form
- **Status:** draft
- **Also known as:** segmented-button, segmented-buttons, toggle-button-group, content-switcher, connected-button-group

## Overview

A compact row of two to five short options in one neutral track, where exactly one is always selected and every option stays visible. Selecting an option changes a value in place: a parameter of the current view, such as list or grid, or a form value. The options share the track equally. A visible label, or an accessible name, says what is being chosen.

- **Purpose:** Choose exactly one of two to five short, always-visible options that change a value in place.
- **Use when:** A short single choice the user changes often or that changes the current view at once, such as list or grid, a time range or a delivery method.
- **Avoid when:** The options switch panels of content (use tabs), there are more than five or the labels are long (use a select or a radio group), options need descriptions (use a radio group), it is one on/off setting (use a switch), or selecting goes to another page (a navigation of links).

## Anatomy

Shown on the default member: size `medium`.

1. **Container** — The control: a label above the track. It fills its column.
2. **Label** (optional) — The visible label, naming what is being chosen. Shown by default. Starts secondary and bold; its label text, required marker, emphasis and weight surface on the control (Q348 A).
3. **Track** — The track: a neutral fill behind every option, with no outline. Each option fills an equal share of it, and the selected one shows a pill on it.
4. **Items** — The options: a native slot holding Segment instances, three by default, the first selected. Each option fills an equal share of the track.
5. **Segment1** — The first option, selected.
6. **Segment2** — The second option.
7. **Segment3** — The third option.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | Passed to every option. Medium is a button's height, 44px on comfortable and spacious density. |

## Usage guidelines

Use a segmented control for a choice between two to five short options that changes a value in place: a parameter of the current view, such as list or grid, or a form value. Every option stays visible, and one is always selected. Don't use it to switch between panels of content (use tabs), for more than five options or long labels (use a select or a radio group), or for one setting that turns on and off (use a switch).

### Do

- Name what is being chosen, with a visible label or an accessible name
- Use two to five options with short, one-line labels
- Select a sensible option from the start
- Use the form behavior when the value is submitted with a form

### Don't

- Leave the control unnamed
- Use it for more than five options or long labels
- Let a click on the selected option clear the selection
- Use it to switch between panels of content; that is tabs

## Accessibility

- **Keyboard:** view behavior: Tab moves to each option and Enter or Space selects it. form behavior: Tab enters at the selected option, arrow keys move to the next or previous option and select it, wrapping at the ends, and Tab leaves.
- **Focus:** A focus ring around the focused option's indicator on :focus-visible.
- **Screen readers:** view behavior: role="group" of buttons, the selected one with aria-current="true". form behavior: a radio group (a fieldset with a legend, or role="radiogroup"), native radios inside. Never role="tablist".

  The label names the group (aria-labelledby, or a legend in the form behavior); without it a screen reader announces options with no subject. Some screen readers do not announce aria-current on a button, so test the view behavior. Every name is translatable, and the row mirrors right to left.

### WCAG

- 1.3.1 Info and Relationships (the group and its label are exposed together)
- 4.1.2 Name, Role, Value
- 1.4.1 Use of Color (the selected option has a bold label as well as a pill)
- 1.4.3 Contrast (every label clears 4.5:1 on the pill and on the track at rest, hover and press)
- 1.4.11 Non-text Contrast (icons clear 3:1 on the pill and the track, and the focus ring 3:1 against the track; the pill and the track against the page have no floor, because the labels identify the options)
- 2.4.7 Focus Visible
- 2.4.13 Focus Appearance (the shared focus ring, as intent)
- 2.5.8 Target Size (every option is a full-height cell)
- 2.5.5 Target Size (targets 44 by 44 at medium on comfortable and spacious density)

### Motion

- **Enter:** None. On selection the pill moves to the new option, about 150–200ms, or cross-fades.
- **Exit:** None.
- **Reduced motion:** The indicator moves at once; only the color change remains.

## Content guidelines

One or two words per option, nouns, sentence case: "List", not "Show list".

- **Labels:** Short nouns or noun phrases, one line each, in sentence case: "List", "Grid". The same kind of content in every option. The control label names what is being chosen ("View", "Time range").

## Related components

- **Built from:** `field-label`, `segmented-control-segment`
- **Instead, consider:** `tabs`, `radio-group`, `select`, `switch-row`
- **Often used with:** `icon`
- **Replaces:**
  - a radio group restyled as a compact switcher for a view that changes at once
  - a row of buttons with a hand-rolled active state and no group semantics

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | What is being chosen, such as "View". Shown above the track, or given as an accessible name only when the page already shows it. |
| `items` | slot of `segmented-control-segment`, 1 to 5 | — | yes | The options, each a SegmentedControl.Segment, in order. Three by default with the first selected, five at most. |
| `value` | string | — | no | The selected option's value. Controlled; pair it with onChange. |
| `defaultValue` | string | — | no | The option selected first, when the control manages its own state. A segmented control always has one option selected. |
| `onChange` | function | — | no | Called with the new value when the selection changes. Never called with an empty value. |
| `behavior` | enum: 'view' \| 'form' | `view` | no | view: a group of buttons that changes the current view at once, the selected one marked as current. form: a radio group whose value is submitted with a form. One look, two behaviors; never wire one as the other. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Passed to every option. Medium is a button's height, 44px on comfortable and spacious density. |
| `width` | enum: 'auto' \| 'full' | `auto` | no | auto: every option as wide as the widest. full: the control fills its column and the options share it equally. |
| `name` | string | — | no | The form field name, in the form behavior. |
| `disabled` | boolean | `false` | no | Disables every option and takes the control out of the Tab order. |

## Specs

Generated from the plan that builds the design-file component: 3 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/label` | instance | every member |
| `container/track` | frame | every member |
| `container/track/items` | slot | every member |
| `container/track/items/segment1` | instance | every member |
| `container/track/items/segment2` | instance | every member |
| `container/track/items/segment3` | instance | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/track` | `space.0` | `space.0` | — | — | — | — |
| `container/track/items` | — | `space.0` | — | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/track` | `space.0` | `space.0` | — | — | — | — |
| `container/track/items` | — | `space.0` | — | — | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/track` | `space.0` | `space.0` | — | — | — | — |
| `container/track/items` | — | `space.0` | — | — | — | — |

### Color

Keyed by nothing: one row covers every member.

**every member**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/track` | `color.background.secondary` | — | — | — |

### Nesting and properties

- `container/label` nests `field-label` at `size=medium, emphasis=secondary, weight=bold, state=rest`; follows `size`; exposes `emphasis`, `weight`
- `container/track/items` is a slot, preferring `segmented-control-segment`
- `container/track/items/segment1` nests `segmented-control-segment` at `selection=selected, size=medium, state=rest`; follows `size`
- `container/track/items/segment2` nests `segmented-control-segment` at `selection=unselected, size=medium, state=rest`; follows `size`
- `container/track/items/segment3` nests `segmented-control-segment` at `selection=unselected, size=medium, state=rest`; follows `size`

| Property | Type | Default |
| --- | --- | --- |
| `label` | boolean | `true` |
| `items` | slot | — |

---

Generated from the `segmented-control` component definition.
