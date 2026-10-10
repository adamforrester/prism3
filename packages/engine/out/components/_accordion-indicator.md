# Accordion.Indicator

> The open and closed glyph inside an Accordion header. Pick chevron or plus and minus.

The glyph that shows whether an Accordion section is open: a chevron that points down when closed and up when open, or a plus that becomes a minus. The style is picked once on the nested indicator, and the Accordion sets the rest, so switching a section open or closed keeps the style. It is a building block of the Accordion, not a component to place on its own.

- **ID:** `_accordion-indicator`
- **Category:** navigation
- **Status:** draft

## Usage

Leave it inside the Accordion. Pick chevron or plus and minus on the nested indicator of an Accordion instance; the Accordion sets whether it shows the open or the closed glyph, and its size.

### Do

- Pick the style once per set of stacked accordions, so every section in the set matches

### Don't

- Place it on its own as an icon. Use the Icon component for a standalone glyph.

## Choosing it

- **Purpose:** Show whether an Accordion section is open, as a chevron or a plus and minus glyph.
- **Use when:** Only inside an Accordion header, which nests it and sets its open state and size.
- **Avoid when:** Anywhere outside an Accordion: a standalone glyph is an Icon, and a control that opens a menu is a Select or a button.
- **Often used with:** `accordion`, `icon`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `style` | enum: 'chevron' \| 'plus-minus' | `chevron` | no | The glyph pair: a chevron that points down when closed and up when open, or a plus when closed and a minus when open. |
| `expansion` | enum: 'collapsed' \| 'expanded' | `collapsed` | no | Whether the section is open. Set by the Accordion it sits in. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The glyph size. Set by the Accordion it sits in. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `style` | `chevron`, `plus-minus` | once, when authored |
| `expansion` | `collapsed`, `expanded` | at runtime |
| `size` | `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** none — presentational. The Accordion header's button carries the open state; the glyph repeats it visually.
- **WCAG:**
  - 1.4.1 Use of Color (open and closed differ by glyph shape, never by color)
  - 1.4.11 Non-text Contrast (the glyph ink clears 3:1 against the page)
- **ARIA:** Hide the glyph from assistive technology (aria-hidden="true"). The button's aria-expanded is the state a screen reader announces.

## Motion

- **Enter:** Opening the section swaps the closed glyph for the open one (motion.transition.enter); a chevron may turn rather than swap.
- **Exit:** Closing the section swaps it back (motion.transition.exit).
- **Reduced motion:** Under prefers-reduced-motion the turn takes the reduced duration (motion.duration-reduced.*), so the glyph changes without visible travel.

## Composition

- **Replaces:**
  - a chevron rotated by hand per section

---

Generated from the `_accordion-indicator` component definition.
