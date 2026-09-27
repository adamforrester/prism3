# ImagePlaceholder

> Empty media frame locked to 1:1, 4:3 or 16:9. Drop an image fill onto it.

An empty-state media frame that holds a photograph at a fixed aspect ratio. Pick a ratio (1:1, 4:3 or 16:9) and the frame keeps that proportion while its size flexes to its container; a designer drops an image fill onto it (a native Figma action, not a modeled slot). Before an image arrives it shows a neutral fill and a centered "no image" marker, and it clips its content so a mismatched photo cannot overflow the frame.

- **ID:** `image-placeholder`
- **Category:** media
- **Status:** draft
- **Also known as:** media-frame, image-frame, photo-placeholder, empty-image, image-slot

## Usage

Use an image placeholder wherever a layout reserves space for a photograph before one is chosen — a card's media slot, a hero, a gallery cell. Pick the ratio from the media it will hold (1:1 for avatars and square thumbnails, 4:3 for standard photography, 16:9 for video stills and wide banners); the frame keeps that proportion while it flexes to its container, so a row of cards stays aligned even as their widths change. Drop a photograph onto the frame as an image fill — a native Figma action. The frame clips its content, so a mismatched image stays inside the ratio rather than overflowing.

### Do

- Pick the ratio from the media the frame will hold, and let the lock keep it while the size flexes
- Drop the photograph on as an image fill — the frame is the container, not a swappable slot
- Give a real image an accessible name; keep the empty-state marker decorative and aria-hidden
- Let the frame clip — a photo cropped to the ratio reads better than one that overflows the layout

### Don't

- Hard-code a width AND a height to fake a ratio — the frame holds the ratio and derives the second dimension, so two fixed sizes fight the lock and break on resize
- Treat the "no image" marker as the image's description — it is a placeholder affordance, replaced when a photograph arrives
- Reach for an image placeholder as a decorative wash over a photo — that is the `veil` component (a follow-up may compose the two)
- Expect a play or scrim overlay yet — those are not built yet; this is the core empty-state frame

### Content guidelines

The frame holds no copy. Where its ratio surfaces in a UI, name the proportion ("16:9", "Square"), not a pixel size — the frame holds a ratio, not a fixed dimension.

### Copy patterns

- **Labels:** An image placeholder carries no text of its own. Where its ratio variants surface in a UI, name the proportion plainly — "16:9", "Square" — rather than a pixel dimension, because the frame holds a ratio and not a fixed size.

## Choosing it

- **Purpose:** Reserve space for a photograph at a fixed aspect ratio, holding the proportion while the frame flexes to its container, and show a neutral empty state until an image is dropped in.
- **Use when:** A layout needs a media slot at a known proportion before the image is chosen — a card's photo area, a hero, a gallery cell. Pick 1:1, 4:3 or 16:9 from the media it will hold; the frame keeps that ratio as it resizes and clips whatever image is dropped onto it.
- **Avoid when:** The surface is a decorative wash over an existing photo (that is the `veil` component), the image is already present and fixed (place it directly), or the space needs a play button or a legibility scrim over the media (not built yet — this is the core empty-state frame only).
- **Often used with:** `icon`, `veil`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `ratio` | enum: '1:1' \| '4:3' \| '16:9' | `4:3` | no | The width-to-height PROPORTION the frame holds while its actual size flexes — a square (1:1), the classic photo ratio (4:3), or widescreen (16:9). It is an aspect-ratio LOCK, not a pair of fixed dimensions: the frame derives its height from its width (or the reverse) so the shape survives being resized. Pick it from the media the frame will hold. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `ratio` | `1:1`, `4:3`, `16:9` | once, when authored |

## Accessibility

- **Role:** img once it holds an image, with an accessible name describing what the image is; the empty frame is presentational. The "no image" marker inside it is decorative and aria-hidden; it is a visual affordance, not the accessible content.
- **WCAG:**
  - 1.1.1 Non-text Content — an image placeholder that ships as a real image needs a text alternative describing it; the empty-state marker is decorative and is hidden from assistive tech
  - 1.4.11 Non-text Contrast — where the frame edge is a meaningful boundary, verify it against the surface behind it; the neutral fill is a background, not a UI boundary carrying meaning
  - 1.4.1 Use of Color — the marker signals "no image" by shape and position, not by color alone
- **Focus:** None of its own — the frame is not focusable as an empty placeholder. If it becomes an interactive media element (a button that opens a picker), that control carries its own focus; the placeholder frame does not invent one.
- **ARIA:** Give the frame an img role and a descriptive accessible name once it holds a real image. Mark the "no image" marker aria-hidden — it is a decorative affordance, and announcing it would add nothing. Do not rely on the marker as the accessible description of the eventual image.

## Composition

- **Composes with:** `icon`
- **Replaces:**
  - a hand-drawn rectangle with a fixed width and height standing in for an image, which breaks its ratio the moment it is resized

---

Generated from the `image-placeholder` component definition.
