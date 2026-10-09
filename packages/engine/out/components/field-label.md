# FieldLabel

> Visible label that names a field, with an optional required marker.

The visible, persistent label above a form field — the field's accessible name — with a required marker (a boolean, off by default) and a size that pairs with the control. A shared field part: the same component above every field control. Static top-aligned by default (the practice default; floating labels are out of favor).

- **ID:** `field-label`
- **Category:** form
- **Status:** draft
- **Also known as:** label, form-label

## Usage

Place above every field as its accessible name. Wire htmlFor to the field id. Set the `required` boolean per field (on shows the marker, off hides it), consistently across a form. Reuse the same component above every field control so the label-is-always-present contract holds family-wide. In code the marker flows inline after the name, and the name wraps at the field's width. In Figma the name wraps at a fixed max width — the default field width, 320, less the 4px gap before the marker — so the marker sits right after a one-line name. Three limits follow: a field stretched wider in Figma still wraps its name at that width; on a name long enough to wrap, the marker sits beside the wrapped name, not after its last word; and that required name runs past the field by the marker's width.

### Do

- Always render a label, even for search (visually-hidden, still in the DOM)
- Keep it a short noun phrase in sentence case, no trailing colon
- Set `required` consistently across a form, and back the marker with aria-required — never the marker alone

### Don't

- Use the placeholder as the label (it vanishes on input — fails SC 3.3.2)
- Write an instruction as the label ("Enter your email here") — that is helper text
- Rely on the required marker as the only required signal

### Copy patterns

- **Labels:** Noun or noun phrase, sentence case, concise, ≤3 words, no trailing colon. Not an instruction — that belongs in helper text.

## Choosing it

- **Purpose:** Name a form field visibly and programmatically.
- **Use when:** Above every field control — the accessible name for the input.
- **Avoid when:** As a section heading or standalone text (use a heading) — this is bound to one control via htmlFor. Never omit it in favor of a placeholder.
- **Often used with:** `text-field`, `textarea`, `select`, `checkbox-group`, `radio-group`, `field-message`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The label text — a noun phrase, sentence case, ≤3 words, no trailing colon ("Email address", not "Enter your email address here"). |
| `htmlFor` | string | — | yes | The id of the field it names — a native \<label for>. Set by the host when composed inside a field component (useId). |
| `required` | boolean | `false` | no | Whether the field is required. ON shows the marker beside the label; OFF, the default, hides it — the host's own `required` prop defaults off too. Never the sole signal: the field also carries required / aria-required, so the state is not marker-only. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `small` | no | Three steps. Scales the TYPE (`type.body.{xs,sm,md}` = 12/14/16px), not padding alone, one body step below the input of the same field size. Every field host passes its own size through, so a small field nests the small label. `small`, the default, is the 12px label. |
| `emphasis` | enum: 'secondary' \| 'primary' | `secondary` | no | The label's ink. `secondary`, the default, is the de-emphasized label every field host nests; `primary` is the full-strength ink for a label that has to lead. Semantic ROLES, never shades — `color.text.{primary,secondary}` — so a brand changing its text palette carries this without the def moving. |
| `weight` | enum: 'regular' \| 'bold' | `regular` | no | How heavy the label reads. These are intents, not role names: `regular` resolves the brand's default body weight, `bold` the heaviest body weight the brand ships — Bold (700) on a brand that ships it, Medium (500) where that is its heaviest body cut. Use it for a label that has to carry a section, not for emphasis inside a form — a form where every label is bold has no emphasis in it. |

## States

`rest`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium`, `large` | once, when authored |
| `emphasis` | `secondary`, `primary` | once, when authored |
| `weight` | `regular`, `bold` | once, when authored |

## Accessibility

- **Role:** none (native \<label> element)
- **WCAG:**
  - 1.3.1 Info and Relationships (native \<label for> ties the name to the control)
  - 3.3.2 Labels or Instructions (every field has a visible, programmatic label)
  - 1.4.3 Contrast (both emphasis inks, text.primary and text.secondary, are gated at 4.5:1; the disabled ink is contrast-exempt and held at 3:1)
- **ARIA:** Prefer a native \<label for=id>; use aria-label / aria-labelledby only when a visible label genuinely cannot be shown (a search field with a hidden label — and it still exists in the DOM). The required marker is visual; the field carries required / aria-required so the state is not marker-only.

## Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** None of its own — a static top-aligned label does not move. The floating-label slide (KB text-field brief §8) is the one label motion in the field, and it is a host treatment this part does not model. The disabled dim is a color change on the host's state transition.

## Composition

- **Planned:** `number-field`
- **Replaces:**
  - an aria-label standing in for a visible label

---

Generated from the `field-label` component definition.
