# Menu.Group

> A labeled run of items inside a menu: a section, or a set of radio choices.

- **ID:** `menu-group`
- **Category:** overlay
- **Status:** draft
- **Also known as:** menu-section, menu-radio-group

## Overview

A run of Menu.Item rows inside a Menu, with an optional heading above them. Use it to split a long menu into sections, or to hold a set of radio items where one is on. A Divider between groups separates them further.

- **Purpose:** Group related items in a menu under a heading, or hold a set of radio items.
- **Use when:** To name a section of a long menu, or to hold a set of radio items, placed in a Menu's items. A short menu needs none.
- **Avoid when:** The menu is short and its items need no sections (place the items in the Menu directly).

## Anatomy

Shown on the default member: type `section`.

1. **Container** — The group: an optional heading over its items.
2. **Heading cell** (optional) — Holds the heading, inset to line up with the items' labels.
3. **Heading** — The group heading, small and in secondary text. It is not an item and takes no focus.
4. **Items** — The items: a native slot holding Menu.Item instances, three by default.
5. **Item1** — The first item.
6. **Item2** — The second item.
7. **Item3** — The third item.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `type` | `section` | once, when authored | — |

## Usage guidelines

Use Menu.Group to split a long menu into named sections, and always for a set of radio items, so one of them is on. Put a Divider between groups when they have no headings.

**In RTL.** The layout mirrors: the start edge is on the right.

### Do

- Name a group with a short heading
- Hold radio items in their own group

### Don't

- Put a single item in a group
- Use a heading as an item. It does nothing when chosen.

## Accessibility

- **Keyboard:** The heading takes no focus. The arrow keys move through the items of every group in order.
- **Focus:** Never focused itself; its items are.
- **Screen readers:** `role="group"`, named by its heading.

  aria-labelledby pointing at the heading, or aria-label when there is none.

### WCAG

- 1.3.1 Info and Relationships (the heading names the group it sits over)
- 1.4.3 Contrast (the heading in secondary text clears 4.5:1 on the panel)

## Content guidelines

Headings are one or two words, in sentence case.

- **Labels:** A heading names what the items have in common in one or two words ("Sort by", "View"). Sentence case.

## Related components

- **Built from:** `menu-item`
- **Often used with:** `menu`, `divider`
- **Replaces:**
  - a bold item used as a section title in a menu

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `heading` | string | — | no | A short heading above the items. It names the group for a screen reader too. A radio set may go without one. |
| `items` | slot of `menu-item`, 1 or more | — | yes | The items in the group. |
| `value` | string | — | no | For a radio set: the value of the item that is on. |
| `onValueChange` | function | — | no | For a radio set: called with the new value when a person picks another item. |

## Specs

Generated from the plan that builds the design-file component: 1 member. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/headingCell` | frame | every member |
| `container/headingCell/heading` | text | every member |
| `container/items` | slot | every member |
| `container/items/item1` | instance | every member |
| `container/items/item2` | instance | every member |
| `container/items/item3` | instance | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

**every member**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 240px (literal) |
| `container/headingCell` | `space.100` / `space.150` / `space.050` / `space.150` | — | — | — | — | — |

### Type

Keyed by nothing: one row covers every member.

| Members | Part | Text style |
| --- | --- | --- |
| every member | `container/headingCell/heading` | `type.label.sm.emphasis` |

### Color

Keyed by `type`.

**type=section**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/headingCell/heading` | — | — | `color.text.secondary` | — |

### Nesting and properties

- `container/items` is a slot, preferring `menu-item`
- `container/items/item1` nests `menu-item` at `type=action, intent=default, state=rest`
- `container/items/item2` nests `menu-item` at `type=action, intent=default, state=rest`
- `container/items/item3` nests `menu-item` at `type=action, intent=default, state=rest`

| Property | Type | Default |
| --- | --- | --- |
| `heading text` | text | `Group heading` |
| `heading` | boolean | `true` |
| `items` | slot | — |

---

Generated from the `menu-group` component definition.
