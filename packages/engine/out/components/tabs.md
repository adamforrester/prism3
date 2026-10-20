# Tabs

> A row of tabs that switches between panels of related content in place.

A row of tabs above a baseline. Each tab names one panel of related content; selecting a tab shows its panel in place and hides the rest, without changing the page or the address. One tab is always selected. Arrow keys move between tabs, and Tab moves on into the panel.

- **ID:** `tabs`
- **Category:** navigation
- **Status:** draft
- **Also known as:** tab-list, tab-group, tab-bar, tab-panel

## Usage

Use tabs to switch between peer sections of related content in one place, one at a time, such as a product's description, specifications and reviews. Don't use tabs to go to another page (use links in a navigation), to change a setting or filter the current view (use a segmented control or a select), or for content people need to compare side by side.

### Do

- Keep labels short, parallel nouns
- Keep one tab selected at all times
- Use manual activation when a panel takes time to load
- Give the list a name when nothing on the page already gives it one

### Don't

- Use tabs to change the page or the address
- Use tabs to filter or re-sort the current view
- Nest tabs more than two levels deep
- Wrap tabs onto a second line; let the list scroll

### Content guidelines

One or two words per tab, nouns, sentence case.

### Copy patterns

- **Labels:** Short, parallel nouns, one or two words each. Past six or seven tabs, rethink the grouping.

## Choosing it

- **Purpose:** Switch between peer panels of related content in place, one at a time.
- **Use when:** Two to about six peer sections of one subject, viewed one at a time, where switching is quick and the address need not change.
- **Avoid when:** The selection changes the page or the address (a navigation of links), filters or re-sorts the current view (SegmentedControl, or Select), is a required sequence (a stepper, not built yet), or has many independent sections (Accordion).
- **Often used with:** `tab`, `badge`, `icon`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `value` | string | — | no | The key of the selected tab. Controlled; pair it with onChange. |
| `items` | slot of `tab`, 1 to 6 | — | yes | The tabs, each a Tab, in order, one per panel. Three by default with the first selected, six at most. |
| `defaultValue` | string | — | no | The key of the tab selected first, when the list manages its own state. |
| `onChange` | function | — | no | Called with the new key when the selected tab changes. |
| `activation` | enum: 'automatic' \| 'manual' | `automatic` | no | automatic: moving focus with the arrow keys selects the tab. manual: arrows move focus only, and Enter or Space selects. Use manual when showing a panel is slow. |
| `label` | string | — | no | The accessible name of the tab list, when nothing on the page already names it. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Passed to every tab. |
| `alignment` | enum: 'start' \| 'center' | `start` | no | start: the tabs sit at the start of the bar. center: the tabs sit centered in the bar, which spans its container; the baseline spans the full width either way. |

## States

`rest`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored |
| `alignment` | `start`, `center` | once, when authored |

## Accessibility

- **Role:** tablist containing tabs, each tab controlling one tabpanel
- **WCAG:**
  - 4.1.2 Name, Role, Value
  - 2.1.1 Keyboard (arrow keys, Home and End)
  - 2.4.3 Focus Order (one tab stop for the list, then the panel)
  - 1.4.11 Non-text Contrast (targets 3:1 for the selected underline)
  - 1.4.1 Use of Color
  - 2.4.13 Focus Appearance
- **Keyboard:** Tab moves into the list, landing on the selected tab, and the next Tab moves into the panel. Left and Right move between tabs (Up and Down when vertical), wrapping at the ends; Home and End go to the first and last. With automatic activation, moving focus selects; with manual activation, Enter or Space selects.
- **Focus:** Focus stays on the tab after it is selected, so arrowing continues. The panel takes focus as a whole (tabindex="0").
- **ARIA:** role="tablist" with an aria-label or aria-labelledby; aria-selected on every tab; aria-controls from each tab to its panel and aria-labelledby back. Never use tabs to change the page: a route change is a navigation of links with aria-current.

## Motion

- **Enter:** None. On a change, the underline slides to the new tab and the panel cross-fades, about 150–200ms.
- **Exit:** The outgoing panel fades out under the incoming one. Panels never slide sideways.
- **Reduced motion:** The underline snaps and the panel swaps with no transition.

## Composition

- **Composes with:** `tab`
- **Alternative to:** `select`, `accordion`, `segmented-control`
- **Replaces:**
  - show and hide divs with no tab semantics
  - role="tab" on links that change the route

## Specs

Generated from the plan that builds the design-file component: 6 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/items` | slot | every member |
| `container/items/tab1` | instance | every member |
| `container/items/tab2` | instance | every member |
| `container/items/tab3` | instance | every member |
| `container/baseline` | frame | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `alignment`.

**size=medium, alignment=start**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.0` | — | — | — | — |
| `container/items` | — | `space.0` | — | — | — | — |
| `container/baseline` | — | — | `border-width.hairline` | — | — | — |

**size=small, alignment=start**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.0` | — | — | — | — |
| `container/items` | — | `space.0` | — | — | — | — |
| `container/baseline` | — | — | `border-width.hairline` | — | — | — |

**size=large, alignment=start**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.0` | — | — | — | — |
| `container/items` | — | `space.0` | — | — | — | — |
| `container/baseline` | — | — | `border-width.hairline` | — | — | — |

**size=medium, alignment=center**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.0` | — | — | — | build width 480px (literal) |
| `container/items` | — | `space.0` | — | — | — | — |
| `container/baseline` | — | — | `border-width.hairline` | — | — | — |

**size=small, alignment=center**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.0` | — | — | — | build width 480px (literal) |
| `container/items` | — | `space.0` | — | — | — | — |
| `container/baseline` | — | — | `border-width.hairline` | — | — | — |

**size=large, alignment=center**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.0` | — | — | — | build width 480px (literal) |
| `container/items` | — | `space.0` | — | — | — | — |
| `container/baseline` | — | — | `border-width.hairline` | — | — | — |

### Color

Keyed by `alignment`.

**alignment=start**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/baseline` | `color.border.primary` | — | — | — |

**alignment=center**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/baseline` | `color.border.primary` | — | — | — |

### Nesting and properties

- `container/items` is a slot, preferring `tab`
- `container/items/tab1` nests `tab` at `selection=selected, size=medium, state=rest`; follows `size`
- `container/items/tab2` nests `tab` at `selection=unselected, size=medium, state=rest`; follows `size`
- `container/items/tab3` nests `tab` at `selection=unselected, size=medium, state=rest`; follows `size`

| Property | Type | Default |
| --- | --- | --- |
| `items` | slot | — |

---

Generated from the `tabs` component definition.
