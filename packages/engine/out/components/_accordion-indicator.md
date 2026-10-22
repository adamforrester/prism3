# Accordion.Indicator

> The open or closed glyph inside an Accordion header: a chevron or a plus and minus.

- **ID:** `_accordion-indicator`
- **Category:** navigation
- **Status:** draft
- **Also known as:** accordion-chevron, disclosure-indicator

## Overview

The glyph an Accordion header shows to say whether its section is open: a chevron that points down when closed and up when open, or a plus that becomes a minus. It lives inside the Accordion and is never placed on its own. Choose chevron or plus-minus on the Accordion; the open or closed glyph follows the Accordion's state. The glyph is decorative: the header button's expanded state carries the meaning.

- **Purpose:** Show whether an Accordion section is open, with a chevron or a plus and minus inside its header.
- **Use when:** Only as a child of an Accordion. Generate an Accordion, which places the indicator in each header.
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

## Specs

Generated from the plan that builds the design-file component: 12 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `frame` | frame | every member |
| `frame/chevronDownGlyph` | instance | 3 of 12 members |
| `frame/chevronUpGlyph` | instance | 3 of 12 members |
| `frame/plusGlyph` | instance | 3 of 12 members |
| `frame/minusGlyph` | instance | 3 of 12 members |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `frame/chevronDownGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `frame/chevronUpGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `frame/plusGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `frame/minusGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/chevronDownGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/chevronUpGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/plusGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/minusGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `frame/chevronDownGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `frame/chevronUpGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `frame/plusGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `frame/minusGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |

### Color

Keyed by `indicator`, `expansion`.

**indicator=chevron, expansion=collapsed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/chevronDownGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**indicator=chevron, expansion=expanded**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/chevronUpGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**indicator=plus-minus, expansion=collapsed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/plusGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**indicator=plus-minus, expansion=expanded**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/minusGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

### Nesting and properties

- `frame/chevronDownGlyph` nests `icon/chevron-down`
- `frame/chevronUpGlyph` nests `icon/chevron-up`
- `frame/plusGlyph` nests `icon/plus`
- `frame/minusGlyph` nests `icon/minus`

---

Generated from the `_accordion-indicator` component definition.
