# Tabs

> A row of tabs that switches between panels of related content in place.

A row of tabs above a baseline. Each tab names one panel of related content; selecting a tab shows its panel in place and hides the rest, without changing the page or the address. One tab is always selected. Arrow keys move between tabs, and Tab moves on into the panel.

- **ID:** `tabs`
- **Category:** navigation
- **Status:** draft
- **Also known as:** tab-list, tab-group, tab-bar, tab-panel

## Usage

Use tabs to switch between peer sections of related content in one place, one at a time, such as a product's description, specifications and reviews. Don't use tabs to go to another page (use links in a navigation), to change a setting or filter the current view (use a segmented control, not built yet, or a select), or for content people need to compare side by side.

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
- **Avoid when:** The selection changes the page or the address (a navigation of links), filters or re-sorts the current view (a segmented control, not built yet, or Select), is a required sequence (a stepper, not built yet), or has many independent sections (an accordion, not built yet).
- **Often used with:** `tab`, `badge`, `icon`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `value` | string | — | no | The key of the selected tab. Controlled; pair it with onChange. |
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
| `size` | `small`, `medium`, `large` | once, when authored |
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
- **Alternative to:** `select`
- **Planned:** `segmented-control`, `accordion`, `link`
- **Replaces:**
  - show and hide divs with no tab semantics
  - role="tab" on links that change the route

---

Generated from the `tabs` component definition.
