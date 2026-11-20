# Tag.Group

> A wrapping row of Tags. The group owns which tags are pressed, arrow keys and removal. Size applies to the items you haven't edited. After editing an item, select the items and set their size.

- **ID:** `tag-group`
- **Category:** foundations
- **Status:** draft
- **Also known as:** chip-group, chip-set, tag-list, filter-chips, filter-bar, token-list

## Overview

A labeled set of tags in a row that wraps onto more lines, with the same space between tags across and down. Any number of select tags can be pressed at once, each a toggle button. A dismissible tag in the group is removed with its × or with Delete. The group owns the pressed values, one Tab stop with arrow keys between tags, and where focus goes after a removal. Not a form choice submitted with other fields (Checkbox.Group), not exactly one choice (SegmentedControl or Radio.Group), and not a single tag on its own (Tag).

- **Purpose:** Lay out a set of Tags in a wrapping row, with the group owning which select tags are pressed, the one Tab stop with arrow keys, and removal with focus kept in the group.
- **Use when:** A set of filters the user toggles in place, any number at once (above a list or search results), or a set of applied filters, recipients or keywords the user removes.
- **Avoid when:** One tag on its own (Tag), a structured choice submitted with a form (Checkbox.Group), exactly one choice (SegmentedControl or Radio.Group), or a row of actions (Button.Group).

## Anatomy

Shown on the default member: size `medium`.

1. **Container** — The group: a column holding the items slot. It fills the width it is given.
2. **Items** — The items: a native slot holding the Tag instances, three by default, in a row that wraps onto more lines. A designer adds, removes and reorders tags in place.
3. **Tag1** — The first default item: a select Tag, unselected, at the group's size.
4. **Tag2** — The second default item: a select Tag, unselected, at the group's size.
5. **Tag3** — The third default item: a select Tag, unselected, at the group's size.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | Scales every tag in the group, passed to each one. The space between tags is the same at every size. |

## Usage guidelines

Use a tag group for a set of tags the user toggles or removes in place: filters above a list, applied filters, or recipients in a field. Any number of select tags can be pressed. Give the group a name, let it own the pressed values, and let the row wrap. For a structured choice submitted with a form, use Checkbox.Group; for exactly one choice, SegmentedControl or Radio.Group.

### Do

- Name the group for the decision its tags answer
- Let the group own the pressed values, and derive each tag's pressed state from them
- Move focus to the next tag after a removal, else the previous one, else the group
- Let the row wrap, so every tag stays visible

### Don't

- Wire a pressed state or a toggle handler on a tag inside the group. Both belong to the group.
- Put dismissible tags in a listbox. A listbox option cannot contain the remove control.
- Use a tag group for exactly one choice. That is a segmented control or a radio group.
- Disable every tag in a group. Hide the group instead.

## Accessibility

- **Keyboard:** One Tab stop enters the group. Left and Right arrows move focus between tags without toggling them, and Up and Down move across wrapped lines. Space or Enter toggles a select tag; Delete or Backspace removes the focused dismissible tag.
- **Focus:** The focus ring is on the focused tag; the group itself draws none. After a removal, focus moves to the next tag, else the previous one, else the group or the input that owns it, and never to `<body>`.
- **Screen readers:** A group of select tags is `role="toolbar"`, named by `aria-label` or `aria-labelledby`, holding the tags in order. Each select tag is a `<button>` with `aria-pressed`, and any number may be pressed. A group of dismissible tags whose × slot alone is the target is `role="grid"`: each tag a row, its label one gridcell and its remove control a second.

  Name the group for the decision its tags answer ("Filter by color"). Each select tag exposes its state with `aria-pressed`, set from the group's value. Each remove control is named "Remove" followed by the tag's label. Every name is translatable, and the row and the arrow keys mirror under right-to-left layout.

### WCAG

- 1.3.1 Info and Relationships (the group's name ties its tags to the decision they answer)
- 1.4.10 Reflow (the row wraps rather than scrolling sideways, so every tag stays visible in a narrow column)
- 2.1.1 Keyboard (every tag can be reached, toggled or removed from the keyboard)
- 2.4.3 Focus Order (after a removal, focus moves to the next tag, the previous one or the group, never to the top of the page)
- 4.1.2 Name, Role, Value (each select tag exposes its pressed state; each remove control is named)

### Motion

- **Enter:** None for the group. A tag added to it takes Tag's own entrance.
- **Exit:** A removed tag takes Tag's exit; the tags after it then slide into its place, and a tag that changes line moves there on the same duration.
- **Reduced motion:** Under prefers-reduced-motion the tags after a removal take their new places at once; only the fade remains.

## Content guidelines

The group name says what the tags filter or hold; the tags carry the short values, in the words the data or the user supplies.

- **Labels:** Name the group for the decision its tags answer ("Filter by color"). Each tag keeps its own short label, one word where possible, in the same casing across the set.

## Related components

- **Built from:** `tag`
- **Instead, consider:** `checkbox-group`
- **Often used with:** `search-field`, `list`, `popover`
- **Replaces:**
  - a removable token list built as a listbox
  - a row of tags each its own Tab stop, with no group name
  - tags that scroll sideways out of view instead of wrapping

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The group's accessible name, naming the decision its tags answer ("Filter by color"). It is not drawn; a visible heading above the group belongs to the page. |
| `items` | slot of `tag`, 1 or more | — | yes | The tags, each a Tag, in order. Three by default; a designer adds, removes and reorders them in place. |
| `value` | string[] | — | no | The controlled array of pressed tag values. The group owns it, and each select tag's pressed state is derived from it, never wired on the tag. Pair with onChange; use defaultValue for the uncontrolled form. |
| `defaultValue` | string[] | — | no | The uncontrolled initial set of pressed tag values. |
| `onChange` | (value: string[], event) => void | — | no | Fires with the new array of pressed values when a select tag toggles. The group dispatches it; a tag inside the group never owns its own toggle. |
| `onRemove` | (value: string, event) => void | — | no | Fires with the tag's value when a dismissible tag is removed, by its × or by Delete or Backspace on the focused tag. The group then moves focus to the next tag, else the previous one, else the group. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales every tag in the group, passed to each one. The space between tags is the same at every size. |

## Specs

Generated from the plan that builds the design-file component: 3 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/items` | slot | every member |
| `container/items/tag1` | instance | every member |
| `container/items/tag2` | instance | every member |
| `container/items/tag3` | instance | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | 120px (literal) | build width 320px (literal) |
| `container/items` | — | `space.100` | — | — | — | row gap `space.100` |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | 120px (literal) | build width 320px (literal) |
| `container/items` | — | `space.100` | — | — | — | row gap `space.100` |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | 120px (literal) | build width 320px (literal) |
| `container/items` | — | `space.100` | — | — | — | row gap `space.100` |

### Color

Keyed by nothing: one row covers every member.

### Nesting and properties

- `container/items` is a slot, preferring `tag`
- `container/items/tag1` nests `tag` at `type=select, selection=unselected, size=medium, state=rest`; follows `size`
- `container/items/tag2` nests `tag` at `type=select, selection=unselected, size=medium, state=rest`; follows `size`
- `container/items/tag3` nests `tag` at `type=select, selection=unselected, size=medium, state=rest`; follows `size`

| Property | Type | Default |
| --- | --- | --- |
| `items` | slot | — |

---

Generated from the `tag-group` component definition.
