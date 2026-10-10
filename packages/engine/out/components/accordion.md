# Accordion

> One section that opens and closes in place. The whole header row is the button.

One section that opens and closes in place: a header that names the content, and a panel that opens below it. The whole header row is the button, and a glyph at its start or end shows whether the section is open. Stack several for a set of sections a user scans and opens on demand. Not one-at-a-time peer panels (tabs, not built yet), not a multi-level hierarchy (a tree, not built yet), and not navigation.

- **ID:** `accordion`
- **Category:** navigation
- **Status:** draft
- **Also known as:** disclosure, collapse, expander, details, expansion-panel, collapsible

## Usage

Use an Accordion to compress a set of independent sections into scannable headers: FAQs, settings groups, filter panels, product details. Use one on its own for a single optional block of detail, such as a promo code field or shipping details. Leave several open at once unless space is very tight.

### Do

- Allow several sections open at once by default
- Let every section be closed
- Make the whole header row the button
- Write titles that say what the section holds
- Let a long title wrap

### Don't

- Hide content most users need. Show it instead.
- Force one section to stay open. If one view must always show, use tabs.
- Put an accordion inside an accordion. For more than one level, use a tree.
- Truncate a title with an ellipsis

### Content guidelines

Titles are short, parallel noun phrases or questions, in sentence case, with no trailing colon.

### Copy patterns

- **Labels:** Short, parallel noun phrases, or questions in an FAQ. The title says what the panel holds. Sentence case, no trailing colon.

## Choosing it

- **Purpose:** Show a section of content on demand, under a header the user opens and closes in place.
- **Use when:** A set of independent sections a user scans and opens on demand (FAQs, settings groups, filters, product details), or one optional block of detail on its own.
- **Avoid when:** The user needs the content most of the time (show it), the sections are one-at-a-time peer views (tabs, not built yet), the content nests more than one level (a tree, not built yet), or the header navigates somewhere (a link).
- **Often used with:** `icon`, `button`, `text-field`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `title` | node | — | yes | The header text: a short noun phrase or a question that says what the panel holds. It wraps rather than truncating. |
| `children` | node | — | yes | The panel content. Hidden from the page, the tab order and assistive technology while the section is closed. |
| `value` | string | — | no | The key a stack of accordions uses to track which sections are open. A stable key is safer than a position when sections are added or reordered. |
| `defaultExpanded` | boolean | `false` | no | Opens the section on first render when nothing controls it. |
| `headingLevel` | enum: 2 \| 3 \| 4 \| 5 \| 6 | `3` | no | The level of the heading that wraps the header button. Set it one below the heading the accordion sits under, so the page outline stays intact. |
| `indicator` | enum: 'start' \| 'end' | `start` | no | Where the open and closed glyph sits in the header. At the start, it stays beside the title when the page is zoomed or magnified. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The header's type, padding and glyph size. Every size keeps the header at least 44px tall. |

## States

`rest`, `focus-visible`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `expansion` | `collapsed`, `expanded` | at runtime |
| `indicator` | `start`, `end` | once, when authored |
| `size` | `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** A native \<button> with aria-expanded and aria-controls, inside a heading; the panel is role="region" with aria-labelledby pointing at the button. Native \<details> and \<summary> are the alternative where their styling and animation support are enough.
- **WCAG:**
  - 4.1.2 Name, Role, Value (a button that exposes aria-expanded)
  - 1.3.1 Info and Relationships (each header is a heading at the level the page outline needs)
  - 2.1.1 Keyboard (Enter and Space open and close; Tab reaches every header)
  - 2.4.3 Focus Order (each header is its own tab stop; when open, the next Tab moves into the panel)
  - 2.4.7 Focus Visible and 2.4.13 Focus Appearance (the shared focus ring around the header)
  - 1.4.1 Use of Color (open and closed differ by glyph, not by color)
  - 1.4.10 Reflow (at the start, the glyph stays beside the title under zoom and magnification)
  - 2.5.5 Target Size (Enhanced), as intent (the whole header is the target, at least 44px tall on comfortable and spacious density)
- **Keyboard:** Tab moves from header to header, and into an open panel's content. Enter or Space opens and closes the focused header. There is no roving tab index. Up and Down between headers, and Home and End, are optional extras and must not trap focus.
- **Focus:** A focus ring around the header row on :focus-visible. Opening a section does not move focus.
- **ARIA:** Hide the glyph from assistive technology (aria-hidden="true"); the button's aria-expanded carries the state. Do not put role="tab" or a tablist on an accordion. The title is translatable text, and the glyph does not mirror in right-to-left layouts.

## Motion

- **Enter:** The panel eases open to its content height (motion.transition.enter) and the glyph changes to its open form.
- **Exit:** The panel eases closed (motion.transition.exit) and the glyph changes back.
- **Reduced motion:** Under prefers-reduced-motion the panel opens and closes at the reduced duration (motion.duration-reduced.*): shortened, not removed, since the change is the information and the movement is not.

## Composition

- **Composes with:** `_accordion-indicator`, `focus-ring`
- **Planned:** `tabs`, `tree`, `link`
- **Replaces:**
  - a show and hide block with no aria-expanded or heading
  - a tablist used for vertical sections that open together

---

Generated from the `accordion` component definition.
