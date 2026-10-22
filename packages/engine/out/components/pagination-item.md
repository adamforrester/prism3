# Pagination.Item

> A pagination cell: a page, the gap marker, previous or next. The current page is outlined.

- **ID:** `pagination-item`
- **Category:** navigation
- **Status:** draft
- **Also known as:** page-item, pagination-page

## Overview

One cell in a pagination row: a page number, the gap marker, three dots, that stands for two or more hidden pages, or the previous or next cell, a chevron that opens the page before or after. A cell is as tall as an icon button and at least as wide as it is tall, so a row of pages between previous and next lines up as equal squares; a page number past two digits, or the word "Previous" or "Next" beside a chevron, widens it. The current page is marked, not filled: its number in the emphasis weight, with a light gray border around the cell, or a 2px underline under the number in a gray that stands out from the page at 3:1. It keeps its width, so the row does not move. At hover and press, another page and an unlabeled previous or next show a light neutral wash; a labeled previous or next shows no fill and its word and chevron darken, as a text link does. At the first or last page, previous or next stays in place and does nothing, drawn in the disabled ink. The gap marker is decorative: it does not respond to the pointer, takes no focus and is hidden from assistive technology. Pagination places the cells and decides which page is current.

- **Purpose:** One page number, the ellipsis, or previous or next, inside a pagination row.
- **Use when:** Only as a child of Pagination. Generate Pagination, which places the pages, the gap marker, previous and next, and sets which page is current.
- **Avoid when:** Anywhere outside Pagination: a single action is a Button, and a choice between a few views is a segmented control or tabs.

## Anatomy

Shown on the default member: type `page`, selection `unselected`, style `border`, labeled `false`, size `medium`.

1. **Container** — The cell: as tall as an icon button and at least as wide as it is tall, and the whole pointer target. The current page has a light gray border in the border style; another page and an unlabeled previous or next take a light neutral wash at hover and press. A labeled previous or next has no fill.
2. **Previous glyph** — The previous cell's left chevron (Q414 A), at the gap icon's size, one rung under the icon button's glyph (Q428 A).
3. **Previous text** — The word "Previous" after the chevron, on a labeled cell only (Pagination's simple type).
4. **Label box** — Holds the number at the width of its emphasis weight, so the current page is as wide as any other, and the underline under it.
5. **Balance** — An empty 2px frame above the number, as tall as the underline below it and zero wide, so the underlined number sits on the same line as its neighbors.
6. **Reserve** — A zero-height frame that clips a copy of the number in the emphasis weight: it takes that width and shows nothing.
7. **Label reserve** — The number again, in the emphasis weight, never seen: it holds the cell at that width.
8. **Label** — The page number. Regular, and in the emphasis weight on the current page.
9. **Underline** — The 2px line under the current page's number, in the underline style: as wide as the number, not the cell, in a gray that stands out from the page at 3:1.
10. **Underline reserve** — A zero-height frame that clips a copy of the number, so the underline takes the number's width and shows only its own color.
11. **Underline label** — The number again, in the emphasis weight, never seen: it sets the underline's width.
12. **Gap glyph** — The gap marker: the more-horizontal icon, three dots, decorative and hidden from assistive technology (Q404 A). It is not a control.
13. **Next text** — The word "Next" before the chevron, on a labeled cell only (Pagination's simple type).
14. **Next glyph** — The next cell's right chevron (Q414 A).
15. **Focus ring** — The shared focus ring, around the cell while it has keyboard focus.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `type` | `page`, `ellipsis`, `previous`, `next` | once, when authored | page: a page number the user can open. ellipsis: the three-dot icon that stands for two or more pages not shown. previous and next: the cell with a left or right chevron that opens the page before or after the current one. |
| `selection` | `unselected`, `selected` | at runtime | — |
| `style` | `border`, `underline` | once, when authored | How the current page is marked: a border around the cell, or a 2px line under the number. Passed down by Pagination. |
| `labeled` | `false`, `true` | once, when authored | On previous and next only: true shows the word beside the chevron, as Pagination's simple type does. Passed down by Pagination. |
| `size` | `medium`, `small`, `large` | once, when authored | The cell height and label type, matching the icon buttons beside it. Passed down by Pagination. |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Usage guidelines

Use inside Pagination only. Pagination works out which pages to show, marks the current one, places the ellipses, and sets previous and next inactive at an end.

### Do

- Let Pagination set the current page and the ellipses
- Keep every page cell the same size as the previous and next cells beside it

### Don't

- Place a page cell outside a pagination row
- Make the ellipsis a control

## Accessibility

- **Keyboard:** Each page, previous and next is its own Tab stop; Enter opens it, and Space also does when it is a button. An inactive previous or next keeps its Tab stop and does nothing. Arrow keys do not move between pages. The ellipsis is skipped.
- **Focus:** A focus ring around the cell on :focus-visible, the current page included.
- **Screen readers:** a link (\<a href>) when the page has an address, or a button for a page changed in place, for a page, previous and next; the ellipsis is a decorative icon hidden from assistive technology

  aria-current="page" on the current page. A visually hidden "Page " before each number, so it reads "Page 4". aria-hidden="true" on the ellipsis icon and on the chevrons. Previous and next named "Previous page" and "Next page", and aria-disabled="true" at an end.

### WCAG

- 1.3.1 Info and Relationships (each cell is a list item; the current page carries aria-current="page")
- 1.4.1 Use of Color (the current page has a border or an underline and a heavier weight, and aria-current)
- 1.4.3 Contrast (Minimum) (every number on the page at 4.5:1)
- 1.4.11 Non-text Contrast (the underline at 3:1 against the page; the border style's lighter border is not the only cue, the number's emphasis weight marks the current page too; the decorative gap icon is exempt)
- 2.4.4 Link Purpose (In Context) (each page is named "Page N"; previous and next "Previous page" and "Next page")
- 2.5.3 Label in Name (a labeled cell's visible "Previous" or "Next" starts its accessible name)
- 2.4.7 Focus Visible (the shared focus ring)
- 2.5.8 Target Size (Minimum) (targets 44px at medium and large on comfortable and spacious density)

### Motion

- **Enter:** None. The hover wash and the current page's border change at once or over a short color fade.
- **Exit:** None.
- **Reduced motion:** The color change happens at once.

## Content guidelines

Numbers only on a page. The accessible name adds "Page". Previous and next read "Previous" and "Next", sentence case.

- **Labels:** The page number, in the locale's numerals. Nothing else is shown in a page cell; the ellipsis shows the three-dot icon and no text. A labeled previous or next shows "Previous" or "Next", never "Prev", "Back" or "Forward".

## Related components

- **Built from:** `focus-ring`
- **Often used with:** `pagination`
- **Replaces:**
  - a page number link with href="#" and a click handler
  - an ellipsis read aloud as "dot dot dot"

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The page number as shown, such as "4". Pagination sets it, through the locale's number format. |
| `page` | number | — | no | The page this cell opens. Absent on an ellipsis. |
| `href` | string | — | no | The address of the page. Present, the cell is a link; absent, it is a button that changes the page in place. |
| `selected` | boolean | `false` | no | Whether this is the current page. Set by Pagination; do not set it on a cell inside a pagination row. |
| `type` | enum: 'page' \| 'ellipsis' \| 'previous' \| 'next' | `page` | no | page: a page number the user can open. ellipsis: the three-dot icon that stands for two or more pages not shown. previous and next: the cell with a left or right chevron that opens the page before or after the current one. |
| `labeled` | boolean | `false` | no | On previous and next only: true shows the word beside the chevron, as Pagination's simple type does. Passed down by Pagination. |
| `previousLabel` | string | `Previous` | no | The word a labeled previous cell shows, "Previous" by default. Pass the translated word. |
| `nextLabel` | string | `Next` | no | The word a labeled next cell shows, "Next" by default. Pass the translated word. |
| `isInactive` | boolean | `false` | no | On previous and next only: true at the first or last page. The cell stays in place and in the Tab order with aria-disabled="true", and does nothing when activated. Set by Pagination. |
| `style` | enum: 'border' \| 'underline' | `border` | no | How the current page is marked: a border around the cell, or a 2px line under the number. Passed down by Pagination. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The cell height and label type, matching the icon buttons beside it. Passed down by Pagination. |

## Specs

Generated from the plan that builds the design-file component: 87 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/labelBox` | frame | type=page |
| `container/labelBox/reserve` | frame | type=page |
| `container/labelBox/reserve/labelReserve` | text | type=page |
| `container/labelBox/label` | text | type=page |
| `container/focusRing` | instance | state=focus-visible |
| `container/labelBox/balance` | frame | style=underline |
| `container/labelBox/underline` | frame | style=underline |
| `container/labelBox/underline/underlineReserve` | frame | style=underline |
| `container/labelBox/underline/underlineReserve/underlineLabel` | text | style=underline |
| `container/gapGlyph` | instance | type=ellipsis |
| `container/previousGlyph` | instance | type=previous |
| `container/previousText` | text | 15 of 87 members |
| `container/nextGlyph` | instance | type=next |
| `container/nextText` | text | 15 of 87 members |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.0` / `space.100` / `space.0` / `space.100` | `space.050` | `size.md.height` | — | `size.md.height` | — |
| `container/labelBox/reserve` | — | — | `space.0` | — | — | — |
| `container/labelBox/balance` | — | — | `border-width.thick` | `space.0` | — | — |
| `container/labelBox/underline` | — | — | `border-width.thick` | — | — | — |
| `container/labelBox/underline/underlineReserve` | — | — | `space.0` | — | — | — |
| `container/gapGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/previousGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/nextGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.0` / `space.100` / `space.0` / `space.100` | `space.050` | `size.sm.height` | — | `size.sm.height` | — |
| `container/labelBox/reserve` | — | — | `space.0` | — | — | — |
| `container/labelBox/balance` | — | — | `border-width.thick` | `space.0` | — | — |
| `container/labelBox/underline` | — | — | `border-width.thick` | — | — | — |
| `container/labelBox/underline/underlineReserve` | — | — | `space.0` | — | — | — |
| `container/gapGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/previousGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/nextGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.0` / `space.100` / `space.0` / `space.100` | `space.050` | `size.lg.height` | — | `size.lg.height` | — |
| `container/labelBox/reserve` | — | — | `space.0` | — | — | — |
| `container/labelBox/balance` | — | — | `border-width.thick` | `space.0` | — | — |
| `container/labelBox/underline` | — | — | `border-width.thick` | — | — | — |
| `container/labelBox/underline/underlineReserve` | — | — | `space.0` | — | — | — |
| `container/gapGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/previousGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/nextGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |

### Type

Keyed by `size`, `selection`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium, selection=unselected | `container/labelBox/reserve/labelReserve` | `type.label.md.emphasis` |
| size=medium, selection=unselected | `container/labelBox/label` | `type.label.md.default` |
| size=medium, selection=unselected | `container/previousText` | `type.label.md.default` |
| size=medium, selection=unselected | `container/nextText` | `type.label.md.default` |
| size=small, selection=unselected | `container/labelBox/reserve/labelReserve` | `type.label.sm.emphasis` |
| size=small, selection=unselected | `container/labelBox/label` | `type.label.sm.default` |
| size=small, selection=unselected | `container/previousText` | `type.label.sm.default` |
| size=small, selection=unselected | `container/nextText` | `type.label.sm.default` |
| size=large, selection=unselected | `container/labelBox/reserve/labelReserve` | `type.label.lg.emphasis` |
| size=large, selection=unselected | `container/labelBox/label` | `type.label.lg.default` |
| size=large, selection=unselected | `container/previousText` | `type.label.lg.default` |
| size=large, selection=unselected | `container/nextText` | `type.label.lg.default` |
| size=medium, selection=selected | `container/labelBox/reserve/labelReserve` | `type.label.md.emphasis` |
| size=medium, selection=selected | `container/labelBox/label` | `type.label.md.emphasis` |
| size=medium, selection=selected | `container/labelBox/underline/underlineReserve/underlineLabel` | `type.label.md.emphasis` |
| size=small, selection=selected | `container/labelBox/reserve/labelReserve` | `type.label.sm.emphasis` |
| size=small, selection=selected | `container/labelBox/label` | `type.label.sm.emphasis` |
| size=small, selection=selected | `container/labelBox/underline/underlineReserve/underlineLabel` | `type.label.sm.emphasis` |
| size=large, selection=selected | `container/labelBox/reserve/labelReserve` | `type.label.lg.emphasis` |
| size=large, selection=selected | `container/labelBox/label` | `type.label.lg.emphasis` |
| size=large, selection=selected | `container/labelBox/underline/underlineReserve/underlineLabel` | `type.label.lg.emphasis` |

### Color

Keyed by `type`, `selection`, `style`, `labeled`, `state`.

**type=page, selection=unselected, style=border, labeled=false, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**type=page, selection=unselected, style=border, labeled=false, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `container/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/labelBox/label` | — | — | `color.interactive.neutral.text.hover` | — |

**type=page, selection=unselected, style=border, labeled=false, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.pressed` | — | — | — |
| `container/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/labelBox/label` | — | — | `color.interactive.neutral.text.pressed` | — |

**type=page, selection=unselected, style=border, labeled=false, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**type=page, selection=selected, style=border, labeled=false, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.border.secondary` | — | — |
| `container/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**type=page, selection=selected, style=border, labeled=false, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.border.secondary` | — | — |
| `container/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**type=page, selection=selected, style=underline, labeled=false, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/labelBox/underline` | `color.border.tertiary` | — | — | — |
| `container/labelBox/underline/underlineReserve/underlineLabel` | — | — | `color.interactive.neutral.text.rest` | — |

**type=page, selection=selected, style=underline, labeled=false, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/labelBox/underline` | `color.border.tertiary` | — | — | — |
| `container/labelBox/underline/underlineReserve/underlineLabel` | — | — | `color.interactive.neutral.text.rest` | — |

**type=ellipsis, selection=unselected, style=border, labeled=false, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/gapGlyph` | — | — | — | `color.icon.primary` |

**type=previous, selection=unselected, style=border, labeled=false, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/previousGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=previous, selection=unselected, style=border, labeled=false, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `container/previousGlyph` | — | — | — | `color.interactive.neutral.icon.hover` |

**type=previous, selection=unselected, style=border, labeled=false, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.pressed` | — | — | — |
| `container/previousGlyph` | — | — | — | `color.interactive.neutral.icon.pressed` |

**type=previous, selection=unselected, style=border, labeled=false, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/previousGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=previous, selection=unselected, style=border, labeled=false, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/previousGlyph` | — | — | — | `color.disabled.icon` |

**type=previous, selection=unselected, style=border, labeled=true, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/previousGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/previousText` | — | — | `color.interactive.neutral.text.rest` | — |

**type=previous, selection=unselected, style=border, labeled=true, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/previousGlyph` | — | — | — | `color.interactive.neutral.icon.hover` |
| `container/previousText` | — | — | `color.interactive.neutral.text.hover` | — |

**type=previous, selection=unselected, style=border, labeled=true, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/previousGlyph` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `container/previousText` | — | — | `color.interactive.neutral.text.pressed` | — |

**type=previous, selection=unselected, style=border, labeled=true, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/previousGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/previousText` | — | — | `color.interactive.neutral.text.rest` | — |

**type=previous, selection=unselected, style=border, labeled=true, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/previousGlyph` | — | — | — | `color.disabled.icon` |
| `container/previousText` | — | — | `color.disabled.text` | — |

**type=next, selection=unselected, style=border, labeled=false, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/nextGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=next, selection=unselected, style=border, labeled=false, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `container/nextGlyph` | — | — | — | `color.interactive.neutral.icon.hover` |

**type=next, selection=unselected, style=border, labeled=false, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.pressed` | — | — | — |
| `container/nextGlyph` | — | — | — | `color.interactive.neutral.icon.pressed` |

**type=next, selection=unselected, style=border, labeled=false, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/nextGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=next, selection=unselected, style=border, labeled=false, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/nextGlyph` | — | — | — | `color.disabled.icon` |

**type=next, selection=unselected, style=border, labeled=true, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/nextText` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/nextGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=next, selection=unselected, style=border, labeled=true, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/nextText` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/nextGlyph` | — | — | — | `color.interactive.neutral.icon.hover` |

**type=next, selection=unselected, style=border, labeled=true, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/nextText` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/nextGlyph` | — | — | — | `color.interactive.neutral.icon.pressed` |

**type=next, selection=unselected, style=border, labeled=true, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/nextText` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/nextGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=next, selection=unselected, style=border, labeled=true, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/nextText` | — | — | `color.disabled.text` | — |
| `container/nextGlyph` | — | — | — | `color.disabled.icon` |

### Nesting and properties

- `container/focusRing` nests `focus-ring` at `surface=default`
- `container/gapGlyph` nests `icon/more-horizontal-filled`
- `container/previousGlyph` nests `icon/chevron-left`
- `container/nextGlyph` nests `icon/chevron-right`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `1` |
| `previous label` | text | `Previous` |
| `next label` | text | `Next` |

---

Generated from the `pagination-item` component definition.
