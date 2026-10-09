# Accordion.Item

> One section that opens and closes in place. The whole header row is the button.

One expand/collapse section: a header that names the content, and a panel that opens below it. The whole header row is the button, and the indicator shows whether the section is open. Use it alone for one optional block of detail, or stack several in an Accordion. Not one-at-a-time peer panels (tabs, not built yet), not a multi-level hierarchy (a tree, not built yet), and not navigation.

- **ID:** `accordion-item`
- **Category:** navigation
- **Status:** draft
- **Also known as:** disclosure, collapse, expander, details, expansion-panel, collapsible

## Usage

Use an Accordion.Item on its own for one optional block of detail, such as a promo code field or shipping details. Stack several in an Accordion for a set of sections a user scans and opens on demand.

### Do

- Make the whole header row the button, so the hit target is the full width
- Write titles that say what the section holds
- Let a long title wrap

### Don't

- Hide content most users need. Show it instead.
- Put an accordion inside an accordion. For more than one level, use a tree.
- Truncate a title with an ellipsis

### Content guidelines

Titles are short, parallel noun phrases or questions, in sentence case, with no trailing colon.

### Copy patterns

- **Labels:** Concise, parallel noun phrases, or questions in an FAQ. The title says what the panel holds. Sentence case, no trailing colon.

## Choosing it

- **Purpose:** Show one section of content on demand, under a header the user opens and closes in place.
- **Use when:** One optional block of detail on its own, or one section inside an Accordion.
- **Avoid when:** The user needs the content most of the time (show it), the sections are one-at-a-time peer views (tabs, not built yet), the content nests more than one level (a tree, not built yet), or the header navigates somewhere (a link).
- **Often used with:** `accordion`, `icon`, `button`, `text-field`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `title` | node | — | yes | The header text: a short noun phrase or a question that tells the user what the panel holds. It wraps rather than truncating. |
| `children` | node | — | yes | The panel content. Hidden from the page, the tab order and assistive technology while the item is closed. |
| `value` | string | — | no | The key the Accordion uses to track which items are open. Defaults to the item's position, but a stable key is safer when items are added or reordered. |
| `defaultExpanded` | boolean | `false` | no | Opens the item on first render when nothing controls it. Inside an Accordion, the group's defaultValue does this instead. |
| `disabled` | boolean | `false` | no | Locks the item in its current state and removes the header from the tab order. Prefer hiding a section to disabling it. |
| `headingLevel` | enum: 2 \| 3 \| 4 \| 5 \| 6 | `3` | no | The level of the heading that wraps the header button. Set it one below the heading the accordion sits under, so the page outline stays intact. Inside an Accordion, the group sets it for every item. |
| `indicator` | enum: 'chevron' \| 'plus-minus' | `chevron` | no | The open/closed glyph at the end of the header: a chevron that points down when closed and up when open, or a plus that becomes a minus. Inside an Accordion, the group sets it for every item. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The header's type, padding and indicator size. Every size keeps the header at least 44px tall. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `expansion` | `collapsed`, `expanded` | at runtime |
| `indicator` | `chevron`, `plus-minus` | once, when authored |
| `size` | `medium`, `small`, `large` | once, when authored |

## Accessibility

- **Role:** A native \<button> with aria-expanded and aria-controls, inside an \<hN>; the panel is role="region" with aria-labelledby pointing at the button. Native \<details>/\<summary> is the alternative where its styling and animation support are enough.
- **WCAG:**
  - 4.1.2 Name, Role, Value (a button that exposes aria-expanded)
  - 1.3.1 Info and Relationships (each header is a heading at the level the page outline needs)
  - 2.1.1 Keyboard (Enter and Space open and close; Tab reaches every header)
  - 2.4.3 Focus Order (each header is its own tab stop; when open, the next Tab moves into the panel)
  - 2.4.7 Focus Visible / 2.4.13 Focus Appearance (the shared focus ring around the header)
  - 1.4.1 Use of Color (open and closed differ by glyph, not by color)
  - 1.4.11 Non-text Contrast (the indicator glyph clears 3:1 against the page)
  - 2.5.5 Target Size (Enhanced), as intent (the whole header is the target, at least 44px tall on comfortable and spacious density)
- **Keyboard:** Tab moves from header to header, and into an open panel's content. Enter or Space opens and closes the focused header. There is no roving tab index. Up and Down between headers, and Home and End, are optional extras and must not trap focus.
- **Focus:** A focus ring around the header row on :focus-visible. Opening a section does not move focus.
- **ARIA:** Hide the indicator glyph from assistive technology (aria-hidden="true"); the button's aria-expanded carries the state. Do not put role="tab" or a tablist on an accordion.

## Motion

- **Enter:** The panel eases open to its content height (motion.transition.enter) and the chevron turns to point up.
- **Exit:** The panel eases closed (motion.transition.exit) and the chevron turns back.
- **Reduced motion:** Under prefers-reduced-motion the panel opens and closes at the reduced duration (snapping, in practice), since the change is the information and the height movement is not.

## Composition

- **Composes with:** `focus-ring`
- **Planned:** `tabs`, `tree`, `divider`, `link`
- **Replaces:**
  - a show/hide div with no aria-expanded or heading
  - a tablist used for vertical sections that open together

---

Generated from the `accordion-item` component definition.
