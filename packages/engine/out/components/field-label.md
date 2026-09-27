# FieldLabel

> Visible label that names a field, with an optional required marker.

The visible, persistent label above a form field — the field's accessible name — with a required marker (a boolean, default on) and a size that pairs with the control. A shared field part: the same component above every field control. Static top-aligned by default (the practice default; floating labels are out of favor).

- **ID:** `field-label`
- **Category:** form
- **Status:** draft
- **Also known as:** label, form-label

## Usage

Place above every field as its accessible name. Wire htmlFor to the field id. Set the `required` boolean per field (on shows the marker, off hides it), consistently across a form. Reuse the same component above every field control so the label-is-always-present contract holds family-wide.

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
- **Often used with:** `text-field`, `select`, `checkbox-row`, `checkbox-group`, `field-message`
- **Keywords:** label, field label, form label, required indicator
- **Generation priority:** 3

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The label text — a noun phrase, sentence case, ≤3 words, no trailing colon ("Email address", not "Enter your email address here"). |
| `htmlFor` | string | — | yes | The id of the field it names — a native \<label for>. Set by the host when composed inside a field component (useId). |
| `required` | boolean | `true` | no | Whether the field is required. ON — the default — shows the marker beside the label; turning it off hides it. Never the sole signal: the field also carries required / aria-required, so the state is not marker-only. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Pairs with the field size — three steps, matching `text-field` and `textarea`. Scales the TYPE (`type.body.{sm,md,lg}` = 14/16/18px), not padding alone. |
| `emphasis` | enum: 'primary' \| 'secondary' | `primary` | no | The label's ink. `secondary` is the de-emphasized label a dense form or a read-only field wants. Semantic ROLES, never shades — `color.text.{primary,secondary}` — so a brand changing its text palette carries this without the def moving. |
| `weight` | enum: 'regular' \| 'bold' | `regular` | no | How heavy the label reads. These are intents, not role names: `regular` resolves the brand's default body weight, `bold` the heaviest body weight the brand ships — Inter's Bold (700) on a brand that ships it, a brand's Medium/500 where that is its heaviest body cut. Use it for a label that has to carry a section, not for emphasis inside a form — a form where every label is bold has no emphasis in it. |

## States

`rest`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium`, `large` | once, when authored |
| `emphasis` | `primary`, `secondary` | once, when authored |
| `weight` | `regular`, `bold` | once, when authored |

## Accessibility

- **Role:** none (native \<label> element)
- **WCAG:**
  - 1.3.1 Info and Relationships (native \<label for> ties the name to the control)
  - 3.3.2 Labels or Instructions (every field has a visible, programmatic label)
  - 1.4.3 Contrast (both emphasis inks, text.primary and text.secondary, are gated at 4.5:1; the disabled ink is contrast-exempt and held at 3:1)
- **ARIA:** Prefer a native \<label for=id>; use aria-label / aria-labelledby only when a visible label genuinely cannot be shown (a search field with a hidden label — and it still exists in the DOM). The required marker is visual; the field carries required / aria-required so the state is not marker-only.

## Composition

- **Composes with:** `text-field`, `select`, `checkbox-group`, `radio-group`, `field-message`
- **Planned:** `number-field`
- **Replaces:**
  - an aria-label standing in for a visible label

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- the DISABLED dim (#1339) — the label dims when its FIELD is disabled, and the field's native disabled is the source of truth. This is ONE mechanism, the `disabled` STATE: it projects as a Figma variant carrying the dimmed ink (`disabled.label` / `disabled.indicator` → `color.disabled.text`, kept above the 3:1 contrast floor), and in code it is driven by the disabled field's context (the CSS cascade / a data-attribute), NOT by a `disabled` prop on the label — the old prop that duplicated the state axis was removed. So a designer sees the dimmed variant in Figma, and a code consumer gets the dim from the field it names, with no second knob to keep in sync. When field-label is NESTED (select, checkbox, text-field), the host fixes it to `state=rest` and the code drives the dim, exactly as those defs' own `codeOnly` entries record.
- htmlFor / label association — the entire reason this component exists (§6) and it has no Figma expression at all. A native `<label for=id>` is what makes the name programmatic; Figma has no accessibility tree and no node-to-node reference a materializer could write, so the projection is two text nodes that LOOK like a label and carry none of the relationship. A designer reviewing the Figma member cannot see whether the field is actually named, which is the one property this def is for.
- the visually-hidden case — §6's only label-less shape is a label that exists in the DOM and is clipped from view (a search field). That is a CSS technique with two hard requirements Figma cannot hold: the node must stay in the accessibility tree, so `display: none` and `visibility: hidden` are both wrong, and it must still be present. A Figma variant with the text node deleted expresses the opposite of what the technique does — an absent label rather than a hidden-but-announced one — so it is deliberately not projected as a coordinate.
- sentence-case and ≤3-word content rules — `content.labelPattern` states them and no projection enforces them. Figma carries a placeholder string, and a placeholder is a suggestion: a designer typing "Please enter your email address here:" produces a member that is structurally perfect and violates three of the four rules at once. The enforcement surface is review and lint in the code tier, which is worth admitting rather than implying the def governs copy.

---

Generated from the `field-label` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
