# List

> Short UI items after a bullet, number or icon. For running text, use a native text list. Size applies to the items you haven't edited. After editing an item, select the items and set their size.

- **ID:** `list`
- **Category:** data
- **Status:** draft
- **Also known as:** unordered-list, ordered-list, bullet-list

## Overview

A vertical run of short items, each after a bullet, a number or an icon, with the marker, its size and color, the indent and the space between items all bound to tokens. Unordered when the order carries no meaning, ordered when it does (steps, a ranking), and icon for a set of points such as requirements or features. Every item's text starts at one edge and wraps under itself. Use it for lists a designer lays out: password rules, feature lists, icon checklists, steps. For lists inside running text that a writer edits as normal copy, such as an article body, terms or long help text, use a native text list instead.

- **Purpose:** A short run of text items, each after a bullet, a number or an icon, laid out with bound spacing and markers.
- **Use when:** A short set of points a designer lays out in UI: password rules, feature lists, icon checklists, steps. Ordered when the order means something.
- **Avoid when:** Running text, such as an article body, terms or long help text. The test: if a writer could edit it as normal copy, use the native list; if a designer controls its spacing, markers or icons, use the component. Also avoid it for a choice the user makes (Select, or a listbox), a command menu, navigation links, or values compared across columns (a table).

## Anatomy

Shown on the default member: type `unordered`, size `medium`.

1. **Container** — The list: a column holding the items slot. It fills its column.
2. **Items** — The items: a native slot holding List.Item instances, three by default, with the item gap between them.
3. **Item1** — The first item.
4. **Item2** — The second item.
5. **Item3** — The third item.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `type` | `unordered`, `ordered`, `icon` | once, when authored | unordered (a \<ul> with bullets) when the order carries no meaning; ordered (an \<ol>, numbered) when it does; icon (a \<ul> with an icon before each item) for points such as requirements or features. Passed to every item. |
| `size` | `medium`, `small`, `large` | once, when authored | The text size, body small, medium or large, with the marker, the marker column and the space between items sized to it. Passed to every item. |

## Usage guidelines

Use a List for a short set of points that a designer lays out: password rules, feature lists, icon checklists, steps. Ordered when the order carries meaning, unordered when it does not, icon for points such as requirements. Native text lists versus this component: if a writer could edit it as normal copy, use the native list; if a designer controls its spacing, markers or icons, use the component. So a list inside an article body, terms or long help text is a native text list.

### Do

- Use ordered only when the order carries meaning
- Keep items short and parallel
- Put each item's state in its text when an icon shows it
- Use a native text list inside running text a writer edits

### Don't

- Type numbers or bullet characters into the item text
- Use a List for choices the user picks from; that is a listbox
- Use a List for commands or navigation links
- Use a List for values compared across columns; that is a table

## Accessibility

- **Focus:** None. A list is not focusable; a link inside an item takes focus on its own.
- **Screen readers:** list (a native \<ul> or \<ol> with role="list" set explicitly), its items listitem

  role="list" on the \<ul> or \<ol>, always, because the markers are drawn by the component (see the element note). Markers are not text: a bullet or number drawn by CSS is not read twice, and an icon marker is aria-hidden="true". When icons stand for states (met, not met), each item says its state in text or in visually hidden text.

### WCAG

- 1.3.1 Info and Relationships (the list and its items are marked up as a list, so the count and each position are announced)
- 1.4.1 Use of Color (an icon marker never carries meaning alone)
- 1.4.12 Text Spacing (items wrap and grow; nothing has a fixed height)

### Motion

- **Enter:** None.
- **Exit:** None.
- **Reduced motion:** Nothing moves.

## Content guidelines

One phrase or sentence per item, sentence case, every item the same grammatical shape.

- **Labels:** Items short and parallel, sentence case. Phrases take no closing period; full sentences take one each. Three to seven items read at a glance; past that, group them or use a table.

## Related components

- **Built from:** `list-item`
- **Often used with:** `icon`, `text-field`
- **Replaces:**
  - a \<ul> with list-style: none and no role="list"
  - a column of text boxes with typed bullet characters

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `type` | enum: 'unordered' \| 'ordered' \| 'icon' | `unordered` | no | unordered (a \<ul> with bullets) when the order carries no meaning; ordered (an \<ol>, numbered) when it does; icon (a \<ul> with an icon before each item) for points such as requirements or features. Passed to every item. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The text size, body small, medium or large, with the marker, the marker column and the space between items sized to it. Passed to every item. |
| `start` | number | `1` | no | Ordered only: the number the first item shows. |
| `reversed` | boolean | `false` | no | Ordered only: count down instead of up. |
| `items` | slot of `list-item`, 1 or more | — | yes | The items, each a List.Item, in order. Three by default; a designer adds, removes and reorders them in place. |

## Specs

Generated from the plan that builds the design-file component: 9 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/items` | slot | every member |
| `container/items/item1` | instance | every member |
| `container/items/item2` | instance | every member |
| `container/items/item3` | instance | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.150` | — | — | 120px (literal) | build width 320px (literal) |
| `container/items` | — | `space.150` | — | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | 120px (literal) | build width 320px (literal) |
| `container/items` | — | `space.100` | — | — | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.200` | — | — | 120px (literal) | build width 320px (literal) |
| `container/items` | — | `space.200` | — | — | — | — |

### Color

Keyed by `type`.

### Nesting and properties

- `container/items` is a slot, preferring `list-item`
- `container/items/item1` nests `list-item` at `type=unordered, size=medium`; follows `type`, `size`
- `container/items/item2` nests `list-item` at `type=unordered, size=medium`; follows `type`, `size`
- `container/items/item3` nests `list-item` at `type=unordered, size=medium`; follows `type`, `size`

| Property | Type | Default |
| --- | --- | --- |
| `items` | slot | — |

---

Generated from the `list` component definition.
