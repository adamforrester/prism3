# Tab.Item

> One trigger in a tab list. Selected, it shows an underline and switches the panel below.

- **ID:** `tab-item`
- **Category:** navigation
- **Status:** draft
- **Also known as:** tab-trigger, tab-item

## Overview

One trigger in a tab list. Selecting a tab shows its panel in place and hides the others; the page and the address do not change. A selected tab carries a 2px underline and the primary text color, so the state never rests on color alone. A selected tab's label is set in the emphasis weight, and every tab keeps the width of its bold label, so selecting a tab never moves the tabs beside it. At hover, an unselected tab shows a neutral bar where the selected underline would be. A tab can carry a leading icon and a count.

- **Purpose:** One trigger inside Tabs that shows its panel in place when selected.
- **Use when:** Only as a child of Tabs. Generate Tabs, which places one tab per panel and sets which one is selected.
- **Avoid when:** Changing the page or the address (a navigation of links), or switching a value within the current view (SegmentedControl).

## Anatomy

Shown on the default member: selection `unselected`, size `medium`.

1. **Container** — The tab body: a fixed-height column holding the label row above the underline. It hugs its label and paints nothing itself: no wash at hover or pressed.
2. **Content** — The label row: the optional leading icon, the label and the optional count, centered in the space above the underline.
3. **Leading visual** (optional) — An optional icon before the label.
4. **Label box** — Holds the label at the width of its selected weight: as wide as the widest of the bold reserve and the label, with the label centered.
5. **Reserve** — A zero-height frame that clips the bold copy of the label: it takes the bold width and shows nothing.
6. **Label reserve** — The label again, in the selected weight, never seen: it holds every tab at its bold width (Q226 A).
7. **Label** — The tab text, one line: regular when unselected, in the emphasis weight when selected.
8. **Count** (optional) — An optional count after the label, the shared count badge.
9. **Indicator** — The 2px bar along the tab's bottom edge. It is always there, so the label sits in the same place in both states. A selected tab paints it in the primary border color; an unselected tab paints it in a neutral border color at hover and pressed only, a preview of where the selected bar would go.
10. **Focus ring** — The shared focus ring, around the whole tab while it has keyboard focus. It can sit on a different tab from the selected one.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `selection` | `unselected`, `selected` | at runtime | — |
| `size` | `medium`, `small`, `large` | once, when authored | Tab height, padding and label type. Medium clears 44px on comfortable and spacious density. |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Usage guidelines

Use inside Tabs only. A tab names one panel of related content; selecting it shows that panel in place.

### Do

- Keep labels short, parallel nouns
- Use nouns, not verbs ("Activity", not "View activity")
- Let the tab list set selected from its value

### Don't

- Use a tab to go to another page; that is a link in a navigation
- Set selected on a tab inside a list by hand
- Wrap a label onto a second line; shorten it, or reconsider how many tabs the list needs

## Accessibility

- **Keyboard:** Owned by the tab list: arrow keys move between tabs, Home and End go to the first and last, and Tab moves on into the panel.
- **Focus:** The focus ring marks the focused tab, which can differ from the selected tab when activation is manual.
- **Screen readers:** tab (a \<button role="tab">) inside a role="tablist"; aria-selected on every tab and aria-controls naming its panel

  aria-selected="true" or "false" on every tab, and aria-controls pointing at its panel. An icon-only tab needs an aria-label and a tooltip. A count is part of the accessible name.

### WCAG

- 4.1.2 Name, Role, Value (the tab role and its selected state)
- 1.4.1 Use of Color (selected is the underline as well as the ink)
- 1.4.11 Non-text Contrast (targets 3:1 for the underline against the page)
- 2.4.13 Focus Appearance (the shared focus ring)
- 2.5.8 Target Size (targets 44px at medium on comfortable and spacious density)

### Motion

- **Enter:** None. On selection the underline slides from the previous tab to this one, about 150–200ms.
- **Exit:** None.
- **Reduced motion:** The underline snaps to the selected tab; the panel swaps with no transition.

## Content guidelines

One or two words, a noun, sentence case.

- **Labels:** A short noun, one or two words, parallel with the other tabs ("Overview", "Reviews", "Shipping"). Not a verb phrase.

## Related components

- **Built from:** `badge`, `focus-ring`
- **Often used with:** `tabs`, `icon`
- **Replaces:**
  - a styled button that shows and hides a div with no tab semantics

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The tab text: a short noun, one or two words. One line; a tab list that runs out of room scrolls rather than wrapping. |
| `value` | string | — | yes | The key that ties this tab to its panel. The tab list selects by key, never by position. |
| `selected` | boolean | `false` | no | Whether this tab is the selected one. Set by the tab list from its value; do not set it on a tab inside a list. |
| `leadingIcon` | slot | — | no | An icon before the label. Decorative when a label is present. |
| `count` | number | — | no | A count after the label, drawn as a count badge and read as part of the tab name, such as "Reviews, 12". |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Tab height, padding and label type. Medium clears 44px on comfortable and spacious density. |
| `disabled` | boolean | `false` | no | Dims the tab and skips it during arrow-key movement. |

## Specs

Generated from the plan that builds the design-file component: 30 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/content` | frame | every member |
| `container/content/leadingVisual` | swap | every member |
| `container/content/labelBox` | frame | every member |
| `container/content/labelBox/reserve` | frame | every member |
| `container/content/labelBox/reserve/labelReserve` | text | every member |
| `container/content/labelBox/label` | text | every member |
| `container/content/count` | instance | every member |
| `container/indicator` | frame | every member |
| `container/focusRing` | instance | state=focus-visible |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | — | — |
| `container/content` | `space.0` / `space.200` / `space.0` / `space.200` | `space.100` | — | — | — | — |
| `container/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/content/labelBox/reserve` | — | — | `space.0` | — | — | — |
| `container/indicator` | — | — | `border-width.thick` | — | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | — | — |
| `container/content` | `space.0` / `space.150` / `space.0` / `space.150` | `space.075` | — | — | — | — |
| `container/content/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/content/labelBox/reserve` | — | — | `space.0` | — | — | — |
| `container/indicator` | — | — | `border-width.thick` | — | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | — | — | — |
| `container/content` | `space.0` / `space.250` / `space.0` / `space.250` | `space.100` | — | — | — | — |
| `container/content/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/content/labelBox/reserve` | — | — | `space.0` | — | — | — |
| `container/indicator` | — | — | `border-width.thick` | — | — | — |

### Type

Keyed by `size`, `selection`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium, selection=unselected | `container/content/labelBox/reserve/labelReserve` | `type.label.md.emphasis` |
| size=medium, selection=unselected | `container/content/labelBox/label` | `type.label.md.default` |
| size=small, selection=unselected | `container/content/labelBox/reserve/labelReserve` | `type.label.sm.emphasis` |
| size=small, selection=unselected | `container/content/labelBox/label` | `type.label.sm.default` |
| size=large, selection=unselected | `container/content/labelBox/reserve/labelReserve` | `type.label.lg.emphasis` |
| size=large, selection=unselected | `container/content/labelBox/label` | `type.label.lg.default` |
| size=medium, selection=selected | `container/content/labelBox/reserve/labelReserve` | `type.label.md.emphasis` |
| size=medium, selection=selected | `container/content/labelBox/label` | `type.label.md.emphasis` |
| size=small, selection=selected | `container/content/labelBox/reserve/labelReserve` | `type.label.sm.emphasis` |
| size=small, selection=selected | `container/content/labelBox/label` | `type.label.sm.emphasis` |
| size=large, selection=selected | `container/content/labelBox/reserve/labelReserve` | `type.label.lg.emphasis` |
| size=large, selection=selected | `container/content/labelBox/label` | `type.label.lg.emphasis` |

### Color

Keyed by `selection`, `state`.

**selection=unselected, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/content/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**selection=unselected, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/content/labelBox/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/indicator` | `color.border.secondary` | — | — | — |

**selection=unselected, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/content/labelBox/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/indicator` | `color.border.secondary` | — | — | — |

**selection=unselected, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/content/labelBox/label` | — | — | `color.interactive.neutral.text.rest` | — |

**selection=unselected, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.disabled.text` | — |
| `container/content/labelBox/label` | — | — | `color.disabled.text` | — |

**selection=selected, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.interactive.primary.icon.rest` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.primary.text.rest` | — |
| `container/content/labelBox/label` | — | — | `color.interactive.primary.text.rest` | — |
| `container/indicator` | `color.interactive.primary.border.rest` | — | — | — |

**selection=selected, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.interactive.primary.icon.hover` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.primary.text.hover` | — |
| `container/content/labelBox/label` | — | — | `color.interactive.primary.text.hover` | — |
| `container/indicator` | `color.interactive.primary.border.hover` | — | — | — |

**selection=selected, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.interactive.primary.icon.pressed` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.primary.text.pressed` | — |
| `container/content/labelBox/label` | — | — | `color.interactive.primary.text.pressed` | — |
| `container/indicator` | `color.interactive.primary.border.pressed` | — | — | — |

**selection=selected, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.interactive.primary.icon.rest` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.interactive.primary.text.rest` | — |
| `container/content/labelBox/label` | — | — | `color.interactive.primary.text.rest` | — |
| `container/indicator` | `color.interactive.primary.border.rest` | — | — | — |

**selection=selected, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/content/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/content/labelBox/reserve/labelReserve` | — | — | `color.disabled.text` | — |
| `container/content/labelBox/label` | — | — | `color.disabled.text` | — |
| `container/indicator` | `color.disabled.border` | — | — | — |

### Nesting and properties

- `container/content/leadingVisual` is a swap slot, property `↳ swap leading icon`, shown by `leading icon`
- `container/content/count` nests `badge` at `type=count, emphasis=bold, tone=neutral, surface=default`
- `container/focusRing` nests `focus-ring` at `surface=default`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Tab` |
| `leading icon` | boolean | `false` |
| `↳ swap leading icon` | instance swap | — |
| `count` | boolean | `false` |

---

Generated from the `tab-item` component definition.
