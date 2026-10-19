# Accordion

> One section that opens and closes in place under its header. The whole header row is the button.

One expand and collapse section: a header that names the content, and a panel that opens below it. The whole header row is the button, and an indicator beside the title shows whether the section is open. Stack several for a set of sections a user scans and opens on demand, such as FAQs, settings groups or product details, or use one on its own for an optional block of detail. Not one-at-a-time peer panels (tabs), not a multi-level hierarchy (a tree), and not navigation.

- **ID:** `accordion`
- **Category:** navigation
- **Status:** draft
- **Also known as:** disclosure, collapse, expander, details, expansion-panel, collapsible

## Usage

Use an Accordion to compress a set of independent sections into scannable headers, such as FAQs, settings groups, filter panels or product details, or on its own for one optional block of detail, such as a promo code field. Let several be open at once unless space is very tight.

### Do

- Make the whole header row the button, so the hit target is the full width
- Write titles that say what the section holds
- Let a long title wrap
- Let every section be closed

### Don't

- Hide content most users need. Show it instead.
- Force one section to stay open. If one view must always show, use tabs.
- Put an accordion inside an accordion. For more than one level, use a tree.
- Truncate a title with an ellipsis

### Content guidelines

Titles are short, parallel noun phrases or questions, in sentence case, with no trailing colon.

### Copy patterns

- **Labels:** Concise, parallel noun phrases, or questions in an FAQ. The title says what the panel holds. Sentence case, no trailing colon.

## Choosing it

- **Purpose:** Show a section of content on demand, under a header the user opens and closes in place.
- **Use when:** A set of independent sections a user scans and opens on demand (FAQs, settings, product details), or one optional block of detail on its own.
- **Avoid when:** The user needs the content most of the time (show it), the sections are one-at-a-time peer views (tabs), the content nests more than one level (a tree, not built yet), or the header navigates somewhere (a link).
- **Often used with:** `tabs`, `divider`, `icon`, `button`, `text-field`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `title` | node | — | yes | The header text: a short noun phrase, or a question in an FAQ, that tells the user what the panel holds. It wraps rather than truncating. |
| `children` | node | — | yes | The panel content. Hidden from the page, the tab order and assistive technology while the section is closed. |
| `value` | string | — | no | The key a group of accordions uses to track which sections are open. A stable key is safer than a position when sections are added or reordered. |
| `defaultExpanded` | boolean | `false` | no | Opens the section on first render when nothing controls it. |
| `headingLevel` | enum: 2 \| 3 \| 4 \| 5 \| 6 | `3` | no | The level of the heading that wraps the header button. Set it one below the heading the accordion sits under, so the page outline stays intact. |
| `indicator` | enum: 'chevron' \| 'plus-minus' | `chevron` | no | The open and closed glyph: a chevron that points down when closed and up when open, or a plus that becomes a minus. |
| `iconPosition` | enum: 'leading' \| 'trailing' | `leading` | no | Which side of the title the indicator sits on, following text direction. leading keeps it beside the title when the page is zoomed; in right-to-left text, leading is the right edge. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The header's type, padding and indicator size. Every size keeps the header at least 44px tall. |

## States

`rest`, `focus-visible`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `expansion` | `collapsed`, `expanded` | at runtime |
| `iconPosition` | `leading`, `trailing` | once, when authored |
| `size` | `medium`, `small`, `large` | once, when authored |

## Accessibility

- **Role:** A native \<button> with aria-expanded and aria-controls, inside an \<hN>; the panel is role="region" with aria-labelledby pointing at the button. Native \<details> and \<summary> are the alternative where their styling and animation support are enough.
- **WCAG:**
  - 4.1.2 Name, Role, Value (a button that exposes aria-expanded)
  - 1.3.1 Info and Relationships (each header is a heading at the level the page outline needs)
  - 2.1.1 Keyboard (Enter and Space open and close; Tab reaches every header)
  - 2.4.3 Focus Order (each header is its own tab stop; when open, the next Tab moves into the panel)
  - 2.4.7 Focus Visible / 2.4.13 Focus Appearance (the shared focus ring around the header)
  - 1.4.1 Use of Color (open and closed differ by glyph, not by color)
  - 1.4.10 Reflow, as intent (a leading indicator stays beside the title when the page is zoomed)
  - 2.5.5 Target Size (Enhanced), as intent (the whole header is the target, at least 44px tall on comfortable and spacious density)
- **Keyboard:** Tab moves from header to header, and into an open panel's content. Enter or Space opens and closes the focused header. There is no roving tab index. Up and Down between headers, and Home and End, are optional extras and must not trap focus.
- **Focus:** A focus ring around the header row on :focus-visible. Opening a section does not move focus.
- **ARIA:** Hide the indicator glyph from assistive technology (aria-hidden="true"); the button's aria-expanded carries the state. Do not put role="tab" or a tablist on an accordion.

## Motion

- **Enter:** The panel eases open to its content height (motion.transition.enter), and the indicator turns to its open glyph.
- **Exit:** The panel eases closed (motion.transition.exit), and the indicator turns back.
- **Reduced motion:** Under prefers-reduced-motion the panel opens and closes at the reduced duration, since the change is the information and the height movement is not.

## Composition

- **Composes with:** `_accordion-indicator`, `focus-ring`, `divider`
- **Alternative to:** `tabs`
- **Planned:** `tree`
- **Replaces:**
  - a show/hide div with no aria-expanded or heading
  - a tablist used for vertical sections that open together

---

Generated from the `accordion` component definition.
