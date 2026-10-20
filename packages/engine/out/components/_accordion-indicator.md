# Accordion.Indicator

> The open or closed glyph inside an Accordion header: a chevron or a plus and minus.

- **ID:** `_accordion-indicator`
- **Category:** navigation
- **Status:** draft
- **Also known as:** accordion-chevron, disclosure-indicator

## Overview

The glyph an Accordion header shows to say whether its section is open: a chevron that points down when closed and up when open, or a plus that becomes a minus. It lives inside the Accordion and is never placed on its own. Choose chevron or plus-minus on the Accordion; the open or closed glyph follows the Accordion's state. The glyph is decorative: the header button's expanded state carries the meaning.

- **Purpose:** Show whether an Accordion section is open, with a chevron or a plus and minus inside its header.
- **Use when:** Never directly: it is part of an Accordion. Generate an Accordion instead.
- **Avoid when:** Always on its own. Use an Accordion; for a plain icon, use an Icon.

## Anatomy

Shown on the default member: indicator `chevron`, expansion `collapsed`, size `medium`.

1. **Frame** — The glyph's box, one icon square at the Accordion's size. Exactly one glyph shows in it.
2. **Chevron down glyph** — Closed: a chevron pointing down.
3. **Chevron up glyph** — Open: a chevron pointing up.
4. **Plus glyph** — Closed, when the pair is plus and minus: a plus.
5. **Minus glyph** — Open, when the pair is plus and minus: a minus.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `indicator` | `chevron`, `plus-minus` | once, when authored | Which pair of glyphs shows: a chevron (down closed, up open) or a plus and minus (plus closed, minus open). |
| `expansion` | `collapsed`, `expanded` | at runtime | Whether the section the glyph belongs to is open. Set by the Accordion it sits in. |
| `size` | `medium`, `small`, `large` | once, when authored | The glyph size. Set by the Accordion it sits in. |

## Usage guidelines

Part of an Accordion. Choose chevron or plus-minus on the Accordion; the glyph follows the Accordion's open or closed state.

### Do

- Choose the pair once, on the Accordion, and keep one pair across a page

### Don't

- Place the indicator on its own; use an Accordion
- Rely on the glyph alone to say a section is open; the header button's expanded state carries it

## Accessibility

- **Focus:** None. The Accordion header around the glyph takes focus.
- **Screen readers:** none: the glyph is decorative and hidden from assistive technology (aria-hidden="true"); the Accordion header button carries the role and the expanded state

  Hide the glyph from assistive technology with aria-hidden="true". The header button's aria-expanded says whether the section is open.

### WCAG

- 1.4.1 Use of Color — open and closed differ by glyph, never by color alone
- 1.4.11 Non-text Contrast — the glyph clears 3:1 against the page in the header's icon ink

## Content guidelines

The indicator holds no copy.

- **Labels:** The glyph carries no text.

## Related components

- **Often used with:** `accordion`, `icon`
- **Replaces:**
  - a separate down and up chevron icon toggled by hand in each accordion header

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `indicator` | enum: 'chevron' \| 'plus-minus' | `chevron` | no | Which pair of glyphs shows: a chevron (down closed, up open) or a plus and minus (plus closed, minus open). |
| `expansion` | enum: 'collapsed' \| 'expanded' | `collapsed` | no | Whether the section the glyph belongs to is open. Set by the Accordion it sits in. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The glyph size. Set by the Accordion it sits in. |

---

Generated from the `_accordion-indicator` component definition.
