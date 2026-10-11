# Tab

> One trigger in a tab list. Selected, it shows an underline and switches the panel below.

One trigger in a tab list. Selecting a tab shows its panel in place and hides the others; the page and the address do not change. A selected tab carries a 2px underline and the primary text color, so the state never rests on color alone. A selected tab's label is set in the emphasis weight, and every tab keeps the width of its bold label, so selecting a tab never moves the tabs beside it. At hover, an unselected tab shows a neutral bar where the selected underline would be. A tab can carry a leading icon and a count.

- **ID:** `tab`
- **Category:** navigation
- **Status:** draft
- **Also known as:** tab-trigger, tab-item

## Usage

Use inside Tabs only. A tab names one panel of related content; selecting it shows that panel in place.

### Do

- Keep labels short, parallel nouns
- Let the tab list set selected from its value

### Don't

- Use a tab to go to another page; that is a link in a navigation
- Set selected on a tab inside a list by hand

### Content guidelines

One or two words, a noun, sentence case.

### Copy patterns

- **Labels:** A short noun, one or two words, parallel with the other tabs ("Overview", "Reviews", "Shipping"). Not a verb phrase.

## Choosing it

- **Purpose:** One trigger inside Tabs that shows its panel in place when selected.
- **Use when:** Only as a child of Tabs.
- **Avoid when:** Changing the page or the address (a navigation of links), or switching a value within the current view (a segmented control, not built yet).
- **Often used with:** `tabs`, `icon`, `badge`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The tab text: a short noun, one or two words. One line; a tab list that runs out of room scrolls rather than wrapping. |
| `value` | string | — | yes | The key that ties this tab to its panel. The tab list selects by key, never by position. |
| `selected` | boolean | `false` | no | Whether this tab is the selected one. Set by the tab list from its value; do not set it on a tab inside a list. |
| `leadingIcon` | slot | — | no | An icon before the label. Decorative when a label is present. |
| `count` | number | — | no | A count after the label, drawn as a count badge and read as part of the tab name, such as "Reviews, 12". |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Tab height, padding and label type. Medium clears 44px on comfortable and spacious density. |
| `disabled` | boolean | `false` | no | Dims the tab and skips it during arrow-key movement. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `selection` | `unselected`, `selected` | at runtime |
| `size` | `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** tab (a \<button role="tab">) inside a role="tablist"; aria-selected on every tab and aria-controls naming its panel
- **WCAG:**
  - 4.1.2 Name, Role, Value (the tab role and its selected state)
  - 1.4.1 Use of Color (selected is the underline as well as the ink)
  - 1.4.11 Non-text Contrast (targets 3:1 for the underline against the page)
  - 2.4.13 Focus Appearance (the shared focus ring)
  - 2.5.8 Target Size (targets 44px at medium on comfortable and spacious density)
- **Keyboard:** Owned by the tab list: arrow keys move between tabs, Home and End go to the first and last, and Tab moves on into the panel.
- **Focus:** The focus ring marks the focused tab, which can differ from the selected tab when activation is manual.
- **ARIA:** aria-selected="true" or "false" on every tab, and aria-controls pointing at its panel. An icon-only tab needs an aria-label and a tooltip. A count is part of the accessible name.

## Motion

- **Enter:** None. On selection the underline slides from the previous tab to this one, about 150–200ms.
- **Exit:** None.
- **Reduced motion:** The underline snaps to the selected tab; the panel swaps with no transition.

## Composition

- **Composes with:** `badge`, `focus-ring`
- **Planned:** `segmented-control`
- **Replaces:**
  - a styled button that shows and hides a div with no tab semantics

---

Generated from the `tab` component definition.
