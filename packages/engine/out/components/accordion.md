# Accordion

> A stack of sections that open in place. Any number can be open, and all can be closed.

A vertical stack of Accordion.Items for long, scannable content a user opens on demand: FAQs, settings groups, filter panels, product details. Any number of sections can be open at once by default, and every section can be closed. Not one-at-a-time peer views (tabs, not built yet), not a multi-level hierarchy (a tree, not built yet), and not navigation.

- **ID:** `accordion`
- **Category:** navigation
- **Status:** draft
- **Also known as:** accordion-group, disclosure-group, expansion-panels, collapse-group, faq

## Usage

Use an Accordion to compress a set of independent sections into scannable headers: FAQs, settings groups, filter panels, product details. Leave several open at once unless space is very tight.

### Do

- Allow several sections open at once by default
- Let every section be closed
- Keep titles short and parallel so the set scans

### Don't

- Force one section to stay open. If one view must always show, use tabs.
- Nest an accordion inside another
- Use an accordion for content most users need

## Choosing it

- **Purpose:** Stack independent sections under headers a user opens and closes in place.
- **Use when:** An FAQ, a settings or filter panel, product details, or any set of sections a user scans and opens on demand.
- **Avoid when:** One optional block (a single Accordion.Item), one-at-a-time peer views (tabs, not built yet), multi-level content (a tree, not built yet), or content most users need (show it).
- **Often used with:** `accordion-item`, `button`, `checkbox-group`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `children` | node | — | yes | The Accordion.Items, in order. |
| `type` | enum: 'multiple' \| 'single' | `multiple` | no | Whether several sections can be open at once (multiple) or opening one closes the others (single). Keep multiple unless space is very tight or the sections are steps in order: single stops a user comparing two sections. |
| `value` | string[] | — | no | The open items, by their value. Pair with onValueChange; use defaultValue for the uncontrolled form. In single mode it holds at most one key. |
| `defaultValue` | string[] | — | no | The items open on first render. Empty by default. |
| `onValueChange` | (value: string[]) => void | — | no | Called with the open keys whenever an item opens or closes. |
| `headingLevel` | enum: 2 \| 3 \| 4 \| 5 \| 6 | `3` | no | The heading level of every item's header. Set it one below the heading the accordion sits under. |
| `indicator` | enum: 'chevron' \| 'plus-minus' | `chevron` | no | The open/closed glyph for every item. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The size of every item. |

## States

`rest`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `indicator` | `chevron`, `plus-minus` | once, when authored |
| `size` | `medium`, `small`, `large` | once, when authored |

## Accessibility

- **Role:** A group of Accordion.Items, each a heading-wrapped button controlling a region. Not a tablist.
- **WCAG:**
  - 1.3.1 Info and Relationships (every header is a heading at one level, and the optional list gives the set size)
  - 2.1.1 Keyboard / 2.4.3 Focus Order (each header is its own tab stop, in document order)
- **Keyboard:** Tab moves through the headers in order and into any open panel. Enter or Space opens and closes. Optional: Up and Down move between headers, Home and End jump to the first and last.
- **Focus:** Each item rings its own header. Opening or closing an item never moves focus.
- **ARIA:** Set the heading level once on the group so every item matches the page outline.

## Motion

- **Enter:** None of its own; each item animates its panel.
- **Exit:** None of its own.
- **Reduced motion:** None of its own; each item snaps under reduced motion.

## Composition

- **Composes with:** `accordion-item`
- **Planned:** `tabs`, `tree`, `divider`
- **Replaces:**
  - a tablist used for vertical sections
  - stacked show/hide divs with no heading or aria-expanded

---

Generated from the `accordion` component definition.
