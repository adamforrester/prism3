# FieldLabel

> Visible label that names a field, with an optional required marker.

- **ID:** `field-label`
- **Category:** form
- **Status:** draft
- **Also known as:** label, form-label

## Overview

The visible, persistent label above a form field — the field's accessible name — with a required marker (a boolean, off by default) and a size that pairs with the control. A shared field part: the same component above every field control. Static top-aligned by default (the practice default; floating labels are out of favor).

- **Purpose:** Name a form field visibly and programmatically.
- **Use when:** Above every field control — the accessible name for the input.
- **Avoid when:** As a section heading or standalone text (use a heading) — this is bound to one control via htmlFor. Never omit it in favor of a placeholder.

## Anatomy

Shown on the default member: size `small`, emphasis `secondary`, weight `regular`.

1. **Label**
2. **Indicator** (optional)

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `small`, `medium`, `large` | once, when authored | Three steps. Scales the type (type.body.xs, sm and md: 12, 14 and 16px), not padding alone, one body step below the input of the same field size. Every field host passes its own size through, so a small field nests the small label. small, the default, is the 12px label. |
| `emphasis` | `secondary`, `primary` | once, when authored | The label's ink. secondary, the default, is the de-emphasized label every field host nests; primary is the full-strength ink for a label that has to lead. Semantic roles, never shades (color.text.primary and color.text.secondary), so a brand that changes its text palette carries the label with it. |
| `weight` | `regular`, `bold` | once, when authored | How heavy the label reads. These are intents, not role names: regular resolves the brand's default body weight, bold the heaviest body weight the brand ships — Bold (700) on a brand that ships it, Medium (500) where that is its heaviest body cut. Use it for a label that has to carry a section, not for emphasis inside a form — a form where every label is bold has no emphasis in it. |

### States

`rest`, `disabled`

## Usage guidelines

Place above every field as its accessible name. Wire htmlFor to the field id. Set required per field (on shows the marker, off hides it), consistently across a form. Reuse the same component above every field control so the label-is-always-present contract holds family-wide. In code the marker flows inline after the name, and the name wraps at the field's width.

### Do

- Always render a label, even for search (visually-hidden, still in the DOM)
- Keep it a short noun phrase in sentence case, no trailing colon
- Set required consistently across a form, and back the marker with aria-required — never the marker alone

### Don't

- Use the placeholder as the label (it vanishes on input — fails SC 3.3.2)
- Write an instruction as the label ("Enter your email here") — that is helper text
- Rely on the required marker as the only required signal

## Accessibility

- **Screen readers:** none (native \<label> element)

  Prefer a native \<label for=id>; use aria-label / aria-labelledby only when a visible label genuinely cannot be shown (a search field with a hidden label — and it still exists in the DOM). The required marker is visual; the field carries required / aria-required so the state is not marker-only.

### WCAG

- 1.3.1 Info and Relationships (native \<label for> ties the name to the control)
- 3.3.2 Labels or Instructions (every field has a visible, programmatic label)
- 1.4.3 Contrast (both emphasis inks, text.primary and text.secondary, are gated at 4.5:1; the disabled ink is contrast-exempt and held at 3:1)

### Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** None of its own — a static top-aligned label does not move. The floating-label slide (KB text-field brief §8) is the one label motion in the field, and it is a host treatment this part does not model. The disabled dim is a color change on the host's state transition.

## Content guidelines

Write the label as a noun or noun phrase in sentence case, three words or fewer, with no trailing colon ("Email address"). Instructions and formats belong in helper text, not the label. Mark required fields the same way across a form.

- **Labels:** Noun or noun phrase, sentence case, concise, ≤3 words, no trailing colon. Not an instruction — that belongs in helper text.

## Related components

- **Often used with:** `text-field`, `password-field`, `search-field`, `card-number-field`, `textarea`, `select`, `checkbox-group`, `radio-group`, `segmented-control`, `counter`, `code-input`, `slider`, `field-message`
- **Replaces:**
  - an aria-label standing in for a visible label

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The label text — a noun phrase, sentence case, ≤3 words, no trailing colon ("Email address", not "Enter your email address here"). |
| `htmlFor` | string | — | yes | The id of the field it names — a native \<label for>. Set by the host when composed inside a field component (useId). |
| `required` | boolean | `false` | no | Whether the field is required. On shows the marker beside the label; off, the default, hides it, and the host's own required prop defaults off too. Never the sole signal: the field also carries required / aria-required, so the state is not marker-only. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `small` | no | Three steps. Scales the type (type.body.xs, sm and md: 12, 14 and 16px), not padding alone, one body step below the input of the same field size. Every field host passes its own size through, so a small field nests the small label. small, the default, is the 12px label. |
| `emphasis` | enum: 'secondary' \| 'primary' | `secondary` | no | The label's ink. secondary, the default, is the de-emphasized label every field host nests; primary is the full-strength ink for a label that has to lead. Semantic roles, never shades (color.text.primary and color.text.secondary), so a brand that changes its text palette carries the label with it. |
| `weight` | enum: 'regular' \| 'bold' | `regular` | no | How heavy the label reads. These are intents, not role names: regular resolves the brand's default body weight, bold the heaviest body weight the brand ships — Bold (700) on a brand that ships it, Medium (500) where that is its heaviest body cut. Use it for a label that has to carry a section, not for emphasis inside a form — a form where every label is bold has no emphasis in it. |

## Specs

Generated from the plan that builds the design-file component: 24 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/label` | text | every member |
| `container/indicator` | text | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.050` | — | — | — | build width 320px (literal) |
| `container/label` | — | — | — | — | — | max width 316px (literal) |

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.050` | — | — | — | build width 320px (literal) |
| `container/label` | — | — | — | — | — | max width 316px (literal) |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.050` | — | — | — | build width 320px (literal) |
| `container/label` | — | — | — | — | — | max width 316px (literal) |

### Type

Keyed by `size`, `weight`.

| Members | Part | Text style |
| --- | --- | --- |
| size=small, weight=regular | `container/label` | `type.body.xs.default` |
| size=small, weight=regular | `container/indicator` | `type.body.xs.default` |
| size=medium, weight=regular | `container/label` | `type.body.sm.default` |
| size=medium, weight=regular | `container/indicator` | `type.body.sm.default` |
| size=large, weight=regular | `container/label` | `type.body.md.default` |
| size=large, weight=regular | `container/indicator` | `type.body.md.default` |
| size=small, weight=bold | `container/label` | `type.body.xs.strong` |
| size=small, weight=bold | `container/indicator` | `type.body.xs.strong` |
| size=medium, weight=bold | `container/label` | `type.body.sm.strong` |
| size=medium, weight=bold | `container/indicator` | `type.body.sm.strong` |
| size=large, weight=bold | `container/label` | `type.body.md.strong` |
| size=large, weight=bold | `container/indicator` | `type.body.md.strong` |

### Color

Keyed by `emphasis`, `weight`, `state`.

**emphasis=secondary, weight=regular, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.secondary` | — |
| `container/indicator` | — | — | `color.text.secondary` | — |

**emphasis=secondary, weight=regular, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/indicator` | — | — | `color.disabled.text` | — |

**emphasis=secondary, weight=bold, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.secondary` | — |
| `container/indicator` | — | — | `color.text.secondary` | — |

**emphasis=secondary, weight=bold, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/indicator` | — | — | `color.disabled.text` | — |

**emphasis=primary, weight=regular, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.primary` | — |
| `container/indicator` | — | — | `color.text.primary` | — |

**emphasis=primary, weight=regular, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/indicator` | — | — | `color.disabled.text` | — |

**emphasis=primary, weight=bold, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.primary` | — |
| `container/indicator` | — | — | `color.text.primary` | — |

**emphasis=primary, weight=bold, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/indicator` | — | — | `color.disabled.text` | — |

### Nesting and properties

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Label` |
| `required marker` | text | `*` |
| `required` | boolean | `false` |

---

Generated from the `field-label` component definition.
