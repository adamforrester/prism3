# Veil

> Wash over media so text stays legible, solid or fading from one edge. Verify contrast.

A designer-selectable wash placed over a photograph or video so text set on top of it stays legible. Full-bleed, and chosen per image: pick a DARK wash under light text or a LIGHT wash under dark text (the `value` axis), then the intensity for how much the image needs muting, then the direction — a solid wash over the whole image, or one strongest at the edge the text sits on and fading to clear at the opposite edge. The intensity is a magnitude — a stronger wash mutes the image more — not a contrast guarantee, because the result depends on the specific photo; verify contrast against your own image. Not the modal backdrop, which is a separate mode-varying fill (scrim.default) that dialogs reference directly.

- **ID:** `veil`
- **Category:** foundations
- **Status:** draft
- **Also known as:** wash, photo-wash, image-overlay, image-scrim, media-wash, photo-overlay

## Usage

Place a veil between a photograph (or video) and the text set over it, so the text stays legible. Pick the polarity from the image and the text on it — a DARK wash under light text, a LIGHT wash under dark text — then the intensity for how much the image needs muting: subtle keeps the photo most present, strong mutes it most. Then the direction: full for text anywhere on the image, or a from-top, from-bottom, from-left or from-right fade when the text sits along one edge — the wash is at full intensity on that edge, fading to clear at the opposite edge. The veil is full-bleed, sized to its media container, with the text and any controls as siblings on top rather than children of the wash. Treat the intensity as a starting point and VERIFY the text's contrast against your own image — the wash cannot guarantee a ratio over an unknown photo. For the mode-varying backdrop behind a modal, use scrim.default instead; the veil is for media.

### Do

- Pick the polarity from the image — a dark wash under light text, a light wash under dark text
- Use a directional wash from the edge the text sits on — from-bottom for a caption along the bottom
- Verify the text's contrast against the actual photo; the intensity is a magnitude, not a guaranteed ratio
- Size the veil to its media container and keep the text and controls as siblings on top of it
- Mark the veil aria-hidden — it is a presentational background layer

### Don't

- Read the intensity as a contrast promise — a stronger wash mutes the image more, but whether text clears its floor depends on the photo
- Reach for a veil as the modal backdrop — that is scrim.default, a separate mode-varying fill dialogs reference directly
- Put the text inside the veil node — the text is a sibling on top, so assistive tech reads it directly and the wash stays decorative
- Set text in the clear half of a directional wash — the intensity holds only at the named edge, so text away from it sits on the unmuted photo

### Content guidelines

The veil holds no copy. Where its variants surface in a UI, name the polarity and magnitude ("Dark, strong") rather than a contrast floor.

### Copy patterns

- **Labels:** A veil carries no text of its own — it is a wash behind other content. Where its variants are named in a UI, name the polarity and the magnitude plainly: "Dark, medium" rather than a WCAG floor, because the rung is a magnitude and not a contrast promise.

## Choosing it

- **Purpose:** Place a designer-selected wash over a photograph or video so text set on top of it stays legible, choosing the wash's polarity and magnitude per image.
- **Use when:** Text or controls sit over a photograph or video and need to stay readable against a varied image. Pick a dark wash under light text or a light wash under dark text, then the intensity for how much the image needs muting, then the direction — full for text anywhere, or a fade from the edge the text sits on — and verify contrast against the real photo where the text sits.
- **Avoid when:** The overlay is the backdrop behind a modal or dialog (that is scrim.default, a mode-varying fill referenced directly, not this component), the surface behind the text is a solid color rather than an image (bind a semantic background or text role directly and the contrast is known), or the text sits in the clear half of a directional wash (move it to the named edge or use full).
- **Often used with:** `icon`, `button`, `image-placeholder`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `value` | enum: 'dark' \| 'light' | `dark` | no | The wash's polarity — a DARK wash to lift light text off the image, a LIGHT wash to lift dark text. The designer picks it per image from what the photo needs; there is no automatic choice, because which polarity a given photograph wants is a judgment about that image. |
| `intensity` | enum: 'subtle' \| 'medium' \| 'strong' | `medium` | no | How much the wash mutes the image, weakest to strongest. A magnitude, not a contrast promise — a stronger wash darkens (or lightens) the photo more, and whether the text on top clears its floor depends on the image, so verify contrast against your own photo. subtle keeps the image most present; strong mutes it most. |
| `direction` | enum: 'full' \| 'from-top' \| 'from-bottom' \| 'from-left' \| 'from-right' | `full` | no | Where the wash sits. full is a solid wash over the whole image. from-top, from-bottom, from-left and from-right put the full intensity at that edge and fade linearly to clear at the opposite edge — for text that sits along one edge. The intensity applies at the named edge only, so verify contrast where the text actually sits. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `value` | `dark`, `light` | once, when authored |
| `intensity` | `subtle`, `medium`, `strong` | once, when authored |
| `direction` | `full`, `from-top`, `from-bottom`, `from-left`, `from-right` | once, when authored |

## Accessibility

- **Role:** none — a presentational overlay. The veil conveys no information of its own; it is a wash behind text, so it is aria-hidden and the text on top carries the accessible content.
- **WCAG:**
  - 1.4.3 Contrast (Minimum) — the veil exists to help text on an image clear 4.5:1 (or 3:1 for large text), but it cannot GUARANTEE it: the result depends on the photo, so the contrast is verified against the real image, not assumed from the wash
  - 1.4.11 Non-text Contrast — where content on the veil is itself a UI boundary, the same per-image verification applies
  - 1.4.1 Use of Color — the wash lifts text off the image; it is not itself a carrier of meaning
- **Focus:** None — the veil is not focusable and takes no place in the tab order. It is a decorative layer behind content; the interactive elements sit on top of it and own their own focus.
- **ARIA:** Mark the veil aria-hidden — it is presentational and announcing it would add nothing to the text it sits behind. Never place text INSIDE the veil node as its only home; the veil is a background layer, and the text is a sibling on top so assistive tech reads the text directly. The veil is a legibility aid, not a substitute for verified contrast: check the text against the actual image, because the wash cannot promise a ratio over an unknown photo.

## Composition

- **Planned:** `scrim`
- **Replaces:**
  - a hand-tuned semi-transparent rectangle over an image with an ad-hoc opacity

---

Generated from the `veil` component definition.
