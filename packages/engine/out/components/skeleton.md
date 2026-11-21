# Skeleton

> Content-shaped placeholder for a first load. Reserves the box so nothing shifts on arrival.

- **ID:** `skeleton`
- **Category:** foundations
- **Status:** draft
- **Also known as:** placeholder, loading-placeholder, shimmer, skeleton-text, skeleton-avatar, skeleton-image

## Overview

A quiet placeholder shaped like the content it stands for: lines of text, a circle for an avatar, or a rectangle for media or a card. It holds the final content's box during the first load of a known layout, so nothing moves when the content arrives. Compose skeletons inside the real layout, one per macro part of an item. A skeleton is hidden from assistive technology; the region that is loading carries the busy state and the one status message. In code it pulses softly, and the pulse stops under reduced motion.

- **Purpose:** Hold the shape and box of content that is loading for the first time, so the layout does not shift when it arrives.
- **Use when:** The first load of a layout whose shape is known: a card, a list row, a profile header, a media frame. Compose text, circle and rect skeletons inside the real layout, sized to the content they stand for.
- **Avoid when:** The wait is short and inside a control (Spinner), the work has a known length (Progress), the result is empty (an empty state), the layout is not known in advance (a spinner in the region), or the content is already on screen and only refreshing.

## Anatomy

Shown on the default member: shape `text`, size `medium`.

1. **Container** — The box the skeleton holds open for the content. It paints nothing.
2. **First line** — The first line: one line of body text tall, so the lines keep the rhythm of the text they stand for.
3. **First bar** — The bar on the first line, the full width, centered in its line.
4. **Middle line** — The middle line, the same height as the first.
5. **Middle bar** — The bar on the middle line, about 80% of the width.
6. **Last line** — The last line, the same height as the others.
7. **Last bar** — The bar on the last line, about 40% of the width, so the lines end like a ragged paragraph.
8. **Block** — The shape for media, a card or an avatar: a rectangle with rounded corners, or a circle. It fills the skeleton and resizes with it; hold Shift while resizing a circle to keep it round.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `shape` | `text`, `circle`, `rect` | once, when authored | What the skeleton stands for: lines of text, a circle for an avatar, or a rectangle for media, a card or a block of content. |
| `size` | `medium`, `small` | once, when authored | Text only: the body text size the lines stand for, so each line takes the height of a line of that text. |

## Usage guidelines

Use a skeleton for the first load of a layout you already know: a card, a list row, a profile header. Build it inside the real layout and abstract each item to its main parts, one circle, two lines and one rectangle, rather than one shape per badge or icon. Give a rect the size of the content it stands for and a circle its diameter, so nothing shifts when the content arrives. Hide every skeleton from assistive technology, and let the region that is loading carry `aria-busy` and one status message. For a short wait inside a control, use a spinner; for work with a known length, use progress.

**In RTL.** The layout mirrors: the start edge is on the right. The block does not mirror.

### Do

- Match the skeleton to the content it replaces: the same box, radius and proportion
- Abstract a complex item to its main parts: one circle, two lines, one rectangle
- Set `aria-hidden="true"` on every skeleton and `aria-busy` on the region that is loading
- Announce the load once, from the region, with a label that names it ("Loading order history")
- Let the host wait a moment before showing the skeleton, so a fast load does not flash

### Don't

- Draw a skeleton that does not match the layout that arrives; a mismatched skeleton is worse than none
- Build one page-sized skeleton; compose small ones inside the real layout
- Use a skeleton for a short wait inside a control (use a spinner) or for work with a known length (use progress)
- Use a skeleton for an empty result; that is an empty state
- Let each skeleton announce itself; ten skeletons in one card should announce once
- Fade slowly from the skeleton to content that is already there

## Accessibility

- **Focus:** None. Nothing in a skeleton takes focus, and focus does not move to the loaded content unless the load was the user's own action.
- **Screen readers:** none: every shape is hidden with `aria-hidden="true"`. The region that is loading carries `aria-busy` and owns one polite status message.

  Set `aria-hidden="true"` on every skeleton; a screen reader never reads the shapes. On the region that is loading, set `aria-busy="true"` until its content arrives, then false. Keep one polite `role="status"` region present and empty before the skeletons show, and write a descriptive, translatable label into it ("Loading order history"), so a region of many skeletons announces once. The shapes do not mirror in right-to-left; the shimmer runs in the reading direction.

### WCAG

- 1.1.1 Non-text Content (the shapes are decorative and hidden)
- 4.1.2 Name, Role, Value (the loading region carries `aria-busy` until its content arrives)
- 4.1.3 Status Messages (one polite status message per loading region, with no focus move)
- 2.2.2 Pause, Stop, Hide (targets: the pulse runs only while the content loads)
- 2.3.3 Animation from Interactions (targets: the pulse and the shimmer stop under reduced motion)

### Motion

- **Enter:** Shown at once when the host mounts it, after the host's short delay. The content replaces it at once or with a short crossfade on `motion.duration.fast` and `motion.easing-role.enter`.
- **Exit:** Replaced by the content; no exit of its own.
- **Reduced motion:** The pulse runs one cycle every `motion.duration.sweep` while the content loads. Under prefers-reduced-motion the pulse and the shimmer stop and the shape stays still; the content crossfade, if any, runs on `motion.duration-reduced.fast`.

## Content guidelines

The shapes hold no copy. The status message names what is loading, in sentence case ("Loading order history"), and is written once for the region.

- **Labels:** A skeleton carries no text. The loading region's status message names what is loading, in sentence case: "Loading order history", not a bare "Loading".

## Related components

- **Instead, consider:** `spinner`, `progress`
- **Often used with:** `image-placeholder`, `list-item`
- **Replaces:**
  - a page-sized loading illustration
  - a gray box with no relation to the content that arrives

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `shape` | enum: 'text' \| 'circle' \| 'rect' | `text` | no | What the skeleton stands for: lines of text, a circle for an avatar, or a rectangle for media, a card or a block of content. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | Text only: the body text size the lines stand for, so each line takes the height of a line of that text. |
| `lines` | number | `3` | no | Text only: how many lines to draw. Every line runs the full width except the last two, which step down to about 80% and 40%, the shape of a ragged paragraph. |
| `width` | string | `100%` | no | A CSS length. Text and rect fill the width they are placed in by default; a circle takes its diameter from this. |
| `height` | string | — | no | A CSS length, required for a rect: set it to the height of the content it stands for, so the layout does not shift when that content arrives. |
| `animation` | enum: 'pulse' \| 'shimmer' \| 'none' | `pulse` | no | The pulse fades the shape between two opacities; the shimmer sweeps a highlight across it in the reading direction. Both stop under reduced motion, and the shape stays. |

## Specs

Generated from the plan that builds the design-file component: 4 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/firstLine` | frame | shape=text |
| `container/firstLine/firstBar` | frame | shape=text |
| `container/middleLine` | frame | shape=text |
| `container/middleLine/middleBar` | frame | shape=text |
| `container/lastLine` | frame | shape=text |
| `container/lastLine/lastBar` | frame | shape=text |
| `container/block` | frame | shape=circle or rect |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `shape`.

**size=medium, shape=text**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 320px (literal) |
| `container/firstLine` | `space.050` / `space.0` / `space.050` / `space.0` | — | `type.body.md.line-box` | — | — | — |
| `container/firstLine/firstBar` | — | — | — | — | — | radius `radius.sm` |
| `container/middleLine` | `space.050` / `space.0` / `space.050` / `space.0` | — | `type.body.md.line-box` | — | — | — |
| `container/middleLine/middleBar` | — | — | — | — | 256px (literal) | radius `radius.sm` |
| `container/lastLine` | `space.050` / `space.0` / `space.050` / `space.0` | — | `type.body.md.line-box` | — | — | — |
| `container/lastLine/lastBar` | — | — | — | — | 128px (literal) | radius `radius.sm` |

**size=small, shape=text**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 320px (literal) |
| `container/firstLine` | `space.050` / `space.0` / `space.050` / `space.0` | — | `type.body.sm.line-box` | — | — | — |
| `container/firstLine/firstBar` | — | — | — | — | — | radius `radius.sm` |
| `container/middleLine` | `space.050` / `space.0` / `space.050` / `space.0` | — | `type.body.sm.line-box` | — | — | — |
| `container/middleLine/middleBar` | — | — | — | — | 256px (literal) | radius `radius.sm` |
| `container/lastLine` | `space.050` / `space.0` / `space.050` / `space.0` | — | `type.body.sm.line-box` | — | — | — |
| `container/lastLine/lastBar` | — | — | — | — | 128px (literal) | radius `radius.sm` |

**size=medium, shape=circle**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 40px (literal); build height 40px (literal) |
| `container/block` | — | — | — | — | — | radius `radius.round` |

**size=medium, shape=rect**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | — | — | — | build width 320px (literal); build height 180px (literal) |
| `container/block` | — | — | — | — | — | radius `radius.md` |

### Color

Keyed by `shape`.

**shape=text**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/firstLine/firstBar` | `color.background.tertiary` | — | — | — |
| `container/middleLine/middleBar` | `color.background.tertiary` | — | — | — |
| `container/lastLine/lastBar` | `color.background.tertiary` | — | — | — |

**shape=circle**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/block` | `color.background.tertiary` | — | — | — |

**shape=rect**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/block` | `color.background.tertiary` | — | — | — |

---

Generated from the `skeleton` component definition.
