# List.Item

> One list item: a bullet, number or icon at a fixed indent, then text that wraps under itself.

One item in a List: a marker in a fixed-width column, then short text that wraps under itself rather than under the marker. The marker is a bullet, a number or an icon, and it sits on the first line of the text however many lines the item runs to. The marker column has one width for each type, so the text of every item in a list starts at one edge. Used inside a List; the List sets the type and size of every item it holds.

- **ID:** `list-item`
- **Category:** data
- **Status:** draft
- **Also known as:** list-row, bullet-item

## Usage

Use inside a List only. Each item is one short phrase or sentence after its marker. For several sentences, write a paragraph instead.

### Do

- Keep items short and parallel
- Let the List set every item's type and size

### Don't

- Mix types within one list
- Put the meaning of an item in its icon alone

### Content guidelines

One phrase or sentence per item, sentence case, parallel with the items around it.

### Copy patterns

- **Labels:** Short and parallel: every item the same grammatical shape, sentence case. A phrase needs no closing period; full sentences take one each. Lead with the word that differs from the item before.

## Choosing it

- **Purpose:** One item inside a List: a marker in a fixed column, then text that wraps under itself.
- **Use when:** Only as a child of List.
- **Avoid when:** Content a writer edits as normal copy (use a native text list in the text itself), a choice the user makes (a listbox), a command (a menu), or a navigation link (a navigation, not built yet).
- **Often used with:** `list`, `icon`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `children` | node | — | yes | The item text: a short phrase or sentence. It wraps under itself. Inline content such as a link is allowed; a block such as a second list is a nested list, indented by this item's marker column, so it starts at this item's text edge. |
| `type` | enum: 'unordered' \| 'ordered' \| 'icon' | `unordered` | no | Which marker the item shows. Set by the List from its own type; do not set it on an item inside a List. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The text size (body small, medium or large) and the marker sized to it. Set by the List. |
| `value` | number | — | no | In an ordered list, the number this item shows; the items after it count on from it. Leave it unset to let the list count. |
| `icon` | slot | — | no | The marker glyph when type is icon. A check by default. Decorative: the item text carries the meaning. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `type` | `unordered`, `ordered`, `icon` | once, when authored |
| `size` | `medium`, `small`, `large` | once, when authored |

## Accessibility

- **Role:** listitem (a native \<li>), inside the List's list
- **WCAG:**
  - 1.3.1 Info and Relationships (each item is a list item, so its position and the count are announced)
  - 1.4.1 Use of Color (an icon marker never carries meaning alone; the text does)
  - 1.4.12 Text Spacing (the item wraps and grows; nothing has a fixed height)
- **Focus:** None. An item is not focusable; a link inside it takes focus on its own.
- **ARIA:** None on the item: a native \<li> is a list item. An icon marker is aria-hidden="true". When an icon stands for a state (met, not met), the state is also in the item text or in visually hidden text, never in the icon alone.

## Motion

- **Enter:** None.
- **Exit:** None.
- **Reduced motion:** Nothing moves.

## Composition

- **Planned:** `data-list`, `checklist`
- **Replaces:**
  - a paragraph with a typed bullet character and spaces before it
  - an icon and a text box laid side by side by hand

## Specs

Generated from the plan that builds the design-file component: 9 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `row` | frame | every member |
| `row/markerBox` | frame | every member |
| `row/markerBox/bullet` | frame | type=unordered |
| `row/text` | text | every member |
| `row/markerBox/number` | text | type=ordered |
| `row/markerBox/icon` | swap | type=icon |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `row` | — | `space.0` | — | — | 120px (literal) | build width 320px (literal) |
| `row/markerBox` | — | — | `control.size.md.line-box` | `space.400` | — | — |
| `row/markerBox/bullet` | — | — | `control.size.md.dot` | `control.size.md.dot` | — | — |
| `row/markerBox/icon` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `row` | — | `space.0` | — | — | 120px (literal) | build width 320px (literal) |
| `row/markerBox` | — | — | `control.size.sm.line-box` | `space.300` | — | — |
| `row/markerBox/bullet` | — | — | `control.size.sm.dot` | `control.size.sm.dot` | — | — |
| `row/markerBox/icon` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `row` | — | `space.0` | — | — | 120px (literal) | build width 320px (literal) |
| `row/markerBox` | — | — | `control.size.lg.line-box` | `space.500` | — | — |
| `row/markerBox/bullet` | — | — | `control.size.lg.dot` | `control.size.lg.dot` | — | — |
| `row/markerBox/icon` | — | — | `icon.size.lg` | `icon.size.lg` | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `row/text` | `type.body.md.default` |
| size=medium | `row/markerBox/number` | `type.body.md.default` |
| size=small | `row/text` | `type.body.sm.default` |
| size=small | `row/markerBox/number` | `type.body.sm.default` |
| size=large | `row/text` | `type.body.lg.default` |
| size=large | `row/markerBox/number` | `type.body.lg.default` |

### Color

Keyed by `type`.

**type=unordered**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/markerBox/bullet` | `color.icon.primary` | — | — | — |
| `row/text` | — | — | `color.text.primary` | — |

**type=ordered**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/markerBox/number` | — | — | `color.text.primary` | — |
| `row/text` | — | — | `color.text.primary` | — |

**type=icon**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/markerBox/icon` | — | — | — | `color.icon.primary` |
| `row/text` | — | — | `color.text.primary` | — |

### Nesting and properties

- `row/markerBox/icon` is a swap slot, property `swap icon`, default `check`

| Property | Type | Default |
| --- | --- | --- |
| `text` | text | `List item` |
| `number` | text | `1.` |
| `swap icon` | instance swap | — |

---

Generated from the `list-item` component definition.
