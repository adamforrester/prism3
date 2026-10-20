# Icon

> Glyph from the icon set at 16/20/24/32px. Decorative unless labeled; never interactive.

- **ID:** `icon`
- **Category:** foundations
- **Status:** draft
- **Also known as:** glyph, symbol, svg-icon

## Overview

A small vector glyph standing in for a concept, drawn on a square base-4/base-8 artboard at a fixed set of sizes. Decorative by default and hidden from assistive tech; a `label` is the sole gateway that makes it meaningful and named. Never the interactive element — an icon-only control is a Button that wraps one.

- **Purpose:** Render a set glyph at a grid size, routed correctly into or out of the accessibility tree.
- **Use when:** Beside a label to reinforce meaning, or standalone with a `label` when the glyph itself carries the meaning.
- **Avoid when:** As an interactive element. An icon-only action is a Button (or IconButton) with an accessible name and a hit target of at least 24×24 (44×44 on touch), containing an unnamed glyph — reaching for Icon there puts the affordance on a node with no focus management, no keyboard listeners and no touch target. Also avoid it as an illustration (larger, narrative, its own component), a logo, or a thumbnail; and avoid naming a glyph that sits beside its own text.

## Anatomy

Shown on the default member: name `arrow-down`, tone `inherit`.

1. **Glyph**

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `name` | `arrow-down`, `arrow-down-left`, `arrow-down-right`, `arrow-left`, `arrow-right`, `arrow-up`, `arrow-up-left`, `arrow-up-right`, `check`, `check-circle`, `check-circle-filled`, `chevron-down`, `chevron-left`, `chevron-right`, `chevron-up`, `close`, `close-filled`, `error-circle`, `error-circle-filled`, `external-link-filled`, `eye`, `eye-filled`, `eye-off`, `eye-off-filled`, `FPO-default-icon`, `home`, `image`, `info-circle`, `info-circle-filled`, `link`, `menu`, `minus`, `minus-filled`, `more-horizontal-filled`, `more-vertical-filled`, `pause-circle`, `play-circle`, `plus`, `plus-circle`, `plus-circle-filled`, `plus-filled`, `resize-grip`, `search`, `warning-triangle`, `warning-triangle-filled` | at runtime | Which glyph, typed to the set's literal vocabulary rather than a free string — an unknown name must fail at compile time, because a missing glyph otherwise fails silently as an invisible gap in production. The vocabulary is `IconName`, generated from the icon set and imported rather than restated, so a glyph cannot enter the set and be forgotten in the API. Compile-time refusal is available to any consumer importing that type; a code projection that widens it back to `string` gives the guarantee up, and that projection is the thing to watch rather than this def. Per-glyph components (`<IconSearch/>`) are the equivalent surface for a tree-shaken delivery. |
| `tone` | `inherit`, `primary`, `secondary`, `tertiary`, `brand`, `success`, `warning`, `danger`, `info` | at runtime | Ink. Defaults to `inherit` (`currentColor`), so the glyph tracks its host control's hover/disabled/error cascade with no JS reconciliation. A semantic value pins it instead, insulating an error glyph from an inherited color that would make it invisible. Rejects raw hex by construction — an enum has no cell for one — so contrast is enforced centrally rather than per call site. |

## Usage guidelines

Use to reinforce meaning, speed scanning, or anchor an action alongside text. Few icons are universally understood, so a glyph beside a visible label is a wayfinding anchor for returning users rather than a replacement for the words. Pick a size from the enum, leave `tone` at `inherit` unless the glyph must resist its host's cascade, and decide the one question that matters: is this glyph meaningful (give it a `label`) or decorative (do not)? For an icon-only action, reach for Button or IconButton and leave this glyph unnamed inside it.

### Do

- Leave `label` off when the icon sits beside its own text — decorative is the default and the most common correct answer
- Give a meaningful standalone icon a `label`, which supplies both `role="img"` and the name
- Pick a size from the enum so the glyph lands on the pixel grid
- Let `tone` inherit unless an inherited color would make the glyph illegible

### Don't

- Make the icon the interactive element — an icon-only control is a Button, and the name and the hit target (at least 24×24; 44×44 on touch) live on the wrapper
- Name both the wrapper and the glyph (it double-announces, and causes ghost focus rings)
- Scale a glyph to an arbitrary size — off-grid scaling blurs strokes between hardware pixels
- Pass a raw hex color — that moves contrast enforcement out to the call site
- Invent a one-off glyph outside the set; the set is the discipline and an ad-hoc glyph is debt

## Accessibility

- **Focus:** None of its own. An icon takes no focus; the control wrapping it does, and the focus ring is that control's (see `focus-ring`).
- **Screen readers:** img when meaningful (with aria-label); none when decorative (aria-hidden="true")

  A three-way matrix, and almost every icon bug is picking the wrong cell. DECORATIVE (text beside it, or ornament): omit `label` → `aria-hidden="true"`; this is the default. MEANINGFUL STANDALONE: `label` → `role="img"` + `aria-label`, and `role="img"` is MANDATORY — without it many screen readers ignore an `aria-label` on a raw `<svg>` and leave the user on an unannounced stop. INSIDE AN ICON-ONLY CONTROL: the wrapper carries the name and the glyph stays `aria-hidden`; reversing it causes ghost focus rings and unpredictable AT behavior. Never name both.

### WCAG

- 1.1.1 Non-text Content (meaningful → text alternative; decorative → hidden from AT)
- 1.4.1 Use of Color (an icon must never be the sole carrier of meaning color conveys)
- 1.4.11 Non-text Contrast (a meaningful icon clears 3:1; a decorative one is exempt)
- 2.5.8 Target Size (the WRAPPING control's concern, never the glyph's)

### Motion

- **Enter:** none
- **Exit:** none
- **Reduced motion:** Static — an icon has no motion of its own. A glyph moves only as part of its host's state transition (a chevron rotating on expand, an outlined glyph cross-fading to filled), and the host owns that motion and its reduced-motion behavior.

## Content guidelines

- **Labels:** When meaningful: a concise noun or verb naming the concept or the action it fires — "Search", "Delete" — matching what the glyph depicts, not the asset's internal name. When decorative: no name at all.
- **Metaphors:** Rely on globally established metaphors rather than local idioms; keep them minimal and additive, because a complex metaphor is illegible at 16px; avoid depicting physical hardware, which dates the moment the device does. The floppy-disk save glyph endures precisely because its meaning outlived the object.

## Related components

- **Often used with:** `button`, `icon-button`, `text-field`, `field-message`, `select`, `tag`, `link`
- **Replaces:**
  - legacy icon fonts
  - ad-hoc inline SVGs outside the set

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | enum: IconName (`arrow-down`, `arrow-down-left`, `arrow-down-right`, `arrow-left`, `arrow-right`, `arrow-up`, `arrow-up-left`, `arrow-up-right`, `check`, `check-circle`, `check-circle-filled`, `chevron-down`, `chevron-left`, `chevron-right`, `chevron-up`, `close`, `close-filled`, `error-circle`, `error-circle-filled`, `external-link-filled`, `eye`, `eye-filled`, `eye-off`, `eye-off-filled`, `FPO-default-icon`, `home`, `image`, `info-circle`, `info-circle-filled`, `link`, `menu`, `minus`, `minus-filled`, `more-horizontal-filled`, `more-vertical-filled`, `pause-circle`, `play-circle`, `plus`, `plus-circle`, `plus-circle-filled`, `plus-filled`, `resize-grip`, `search`, `warning-triangle`, `warning-triangle-filled`) | — | yes | Which glyph, typed to the set's literal vocabulary rather than a free string — an unknown name must fail at compile time, because a missing glyph otherwise fails silently as an invisible gap in production. The vocabulary is `IconName`, generated from the icon set and imported rather than restated, so a glyph cannot enter the set and be forgotten in the API. Compile-time refusal is available to any consumer importing that type; a code projection that widens it back to `string` gives the guarantee up, and that projection is the thing to watch rather than this def. Per-glyph components (`<IconSearch/>`) are the equivalent surface for a tree-shaken delivery. |
| `size` | enum: 'x-small' \| 'small' \| 'medium' \| 'large' | `medium` | no | Enumerated, snapping to the fixed pixel grid — 16 / 20 / 24 / 32. NOT arbitrary integers: off-grid scaling blurs strokes between hardware pixels and is the first thing an icon system must forbid. The t-shirt words are the vocabulary every other def uses; the rungs they bind are the engine's (`icon.size.*`). |
| `tone` | enum: 'inherit' \| a semantic ink token (`inherit`, `primary`, `secondary`, `tertiary`, `brand`, `success`, `warning`, `danger`, `info`) | `inherit` | no | Ink. Defaults to `inherit` (`currentColor`), so the glyph tracks its host control's hover/disabled/error cascade with no JS reconciliation. A semantic value pins it instead, insulating an error glyph from an inherited color that would make it invisible. Rejects raw hex by construction — an enum has no cell for one — so contrast is enforced centrally rather than per call site. |
| `label` | string | — | no | The only route to an accessible name. Present makes the glyph meaningful: `role="img"` + `aria-label`. Absent makes it decorative: `aria-hidden="true"`, which is the DEFAULT and the most common correct answer — a named icon beside its own text double-announces ("Email, Email"). Inside an icon-only control the WRAPPER carries the name and this stays absent; never name both. |

## Specs

Generated from the plan that builds the design-file component: 45 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `glyph` | glyph | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

### Color

Keyed by `name`.

**name=arrow-down**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=arrow-down-left**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=arrow-down-right**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=arrow-left**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=arrow-right**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=arrow-up**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=arrow-up-left**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=arrow-up-right**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=check**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=check-circle**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=check-circle-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=chevron-down**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=chevron-left**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=chevron-right**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=chevron-up**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=close**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=close-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=error-circle**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=error-circle-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=external-link-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=eye**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=eye-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=eye-off**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=eye-off-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=FPO-default-icon**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=home**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=image**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=info-circle**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=info-circle-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=link**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=menu**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=minus**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=minus-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=more-horizontal-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=more-vertical-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=pause-circle**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=play-circle**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=plus**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=plus-circle**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=plus-circle-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=plus-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=resize-grip**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=search**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=warning-triangle**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

**name=warning-triangle-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | — | — | `color.icon.primary` |

---

Generated from the `icon` component definition.
