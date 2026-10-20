# Accordion.Indicator

> The open or closed glyph inside an Accordion header: a chevron or a plus and minus.

The glyph an Accordion header shows to say whether its section is open: a chevron that points down when closed and up when open, or a plus that becomes a minus. It lives inside the Accordion and is never placed on its own. Choose chevron or plus-minus on the Accordion; the open or closed glyph follows the Accordion's state. The glyph is decorative: the header button's expanded state carries the meaning.

- **ID:** `_accordion-indicator`
- **Category:** navigation
- **Status:** draft
- **Also known as:** accordion-chevron, disclosure-indicator

## Usage

Part of an Accordion. Choose chevron or plus-minus on the Accordion; the glyph follows the Accordion's open or closed state.

### Do

- Choose the pair once, on the Accordion, and keep one pair across a page

### Don't

- Place the indicator on its own; use an Accordion
- Rely on the glyph alone to say a section is open; the header button's expanded state carries it

### Content guidelines

The indicator holds no copy.

### Copy patterns

- **Labels:** The glyph carries no text.

## Choosing it

- **Purpose:** Show whether an Accordion section is open, with a chevron or a plus and minus inside its header.
- **Use when:** Never directly: it is part of an Accordion. Generate an Accordion instead.
- **Avoid when:** Always on its own. Use an Accordion; for a plain icon, use an Icon.
- **Often used with:** `accordion`, `icon`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `indicator` | enum: 'chevron' \| 'plus-minus' | `chevron` | no | Which pair of glyphs shows: a chevron (down closed, up open) or a plus and minus (plus closed, minus open). |
| `expansion` | enum: 'collapsed' \| 'expanded' | `collapsed` | no | Whether the section the glyph belongs to is open. Set by the Accordion it sits in. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The glyph size. Set by the Accordion it sits in. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `indicator` | `chevron`, `plus-minus` | once, when authored |
| `expansion` | `collapsed`, `expanded` | at runtime |
| `size` | `medium`, `small`, `large` | once, when authored |

## Accessibility

- **Role:** none: the glyph is decorative and hidden from assistive technology (aria-hidden="true"); the Accordion header button carries the role and the expanded state
- **WCAG:**
  - 1.4.1 Use of Color — open and closed differ by glyph, never by color alone
  - 1.4.11 Non-text Contrast — the glyph clears 3:1 against the page in the header's icon ink
- **Focus:** None. The Accordion header around the glyph takes focus.
- **ARIA:** Hide the glyph from assistive technology with aria-hidden="true". The header button's aria-expanded says whether the section is open.

## Composition

- **Replaces:**
  - a separate down and up chevron icon toggled by hand in each accordion header

## Specs

Generated from the plan that builds the design-file component: 12 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `frame` | frame | every member |
| `frame/chevronDown` | instance | 3 of 12 members |
| `frame/chevronUp` | instance | 3 of 12 members |
| `frame/plus` | instance | 3 of 12 members |
| `frame/minus` | instance | 3 of 12 members |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `frame/chevronDown` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `frame/chevronUp` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `frame/plus` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `frame/minus` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/chevronDown` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/chevronUp` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/plus` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `frame/minus` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `frame` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `frame/chevronDown` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `frame/chevronUp` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `frame/plus` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `frame/minus` | — | — | `icon.size.md` | `icon.size.md` | — | — |

### Color

Keyed by `indicator`, `expansion`.

**indicator=chevron, expansion=collapsed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/chevronDown` | — | — | — | `color.interactive.neutral.icon.rest` |

**indicator=chevron, expansion=expanded**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/chevronUp` | — | — | — | `color.interactive.neutral.icon.rest` |

**indicator=plus-minus, expansion=collapsed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/plus` | — | — | — | `color.interactive.neutral.icon.rest` |

**indicator=plus-minus, expansion=expanded**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `frame/minus` | — | — | — | `color.interactive.neutral.icon.rest` |

### Nesting and properties

- `frame/chevronDown` nests `icon/chevron-down`
- `frame/chevronUp` nests `icon/chevron-up`
- `frame/plus` nests `icon/plus`
- `frame/minus` nests `icon/minus`

---

Generated from the `_accordion-indicator` component definition.
