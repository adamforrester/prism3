# Spinner

> Indeterminate loading indicator on the icon ladder, inked by its host. Decorative inside a host.

A rotating arc over a faint full ring, showing that work is in progress with no known end. Sized on the icon ladder (16 / 20 / 24 / 32) and inked from the surrounding text or icon color, so it drops into any icon slot — a button's leading visual, a field's trailing slot. Decorative inside a host that announces the busy state; it has no value, so it never stands in for a determinate progress bar.

- **ID:** `spinner`
- **Category:** feedback
- **Status:** draft
- **Also known as:** loading indicator, activity indicator, loader, busy indicator

## Usage

Use a spinner for a short wait with no known end, inside the thing that is waiting — a button that is saving, a field checking its value, a region reloading. Size it to the icon slot it sits in, and let it take the ink around it. The host decides when it shows (after a short delay, so a fast operation does not flash) and announces the busy state; the spinner only turns.

### Do

- Put the spinner in the host's own icon slot at that slot's icon size, so nothing around it moves
- Let the host delay showing it, so a fast operation does not flash a spinner
- Let the host announce the busy state (`aria-busy`, a button's `isPending`) and keep the spinner hidden from assistive tech
- Keep the turn under reduced motion, slowed to the reduced duration

### Don't

- Use a spinner for work with a known length — show determinate progress
- Draw a static loading glyph from the icon set instead — it drops the rotation, the reduced-motion turn and the host's announcement
- Label a spinner that sits inside a host that already announces
- Stop the turn under reduced motion — slow it

## Choosing it

- **Purpose:** Show that work is in progress with no known end, inside the control or region that is waiting.
- **Use when:** A short indeterminate wait inside a host: a pending Button, a field validating its value, a region reloading. Size it to the host's icon slot.
- **Avoid when:** The work has a known length (use determinate progress, not built yet), the page is loading its layout (a skeleton, not built yet), or you want a static icon — the spinner is behavior, not a glyph.
- **Often used with:** `button`, `icon-button`, `text-field`, `select`
- **Keywords:** spinner, loading, loader, busy, pending, activity indicator, loading indicator
- **Generation priority:** 3

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `size` | enum: 'x-small' \| 'small' \| 'medium' \| 'large' | `medium` | no | The icon ladder: 16 / 20 / 24 / 32. The band scales with it (2px at 24). Inside a host slot, take the slot's own icon size. |
| `label` | string | — | no | Only for a spinner that stands alone with no labeled host: renders `role="status"` with this text as its accessible name. Absent, the default, the spinner is `aria-hidden` and the host announces the busy state (a button's `isPending`, a region's `aria-busy`). |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `x-small`, `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** none when decorative (`aria-hidden="true"`, the default); `status` when it stands alone with a `label`
- **WCAG:**
  - 1.1.1 Non-text Content (decorative inside a host that names the busy state)
  - 1.4.11 Non-text Contrast (the arc takes its host's icon ink, which already clears 3:1; the track is decorative and exempt)
  - 4.1.3 Status Messages (the host announces the busy state, not the spinner)
- **Focus:** None. The spinner takes no focus; a pending control keeps its own focus while the spinner turns inside it.
- **ARIA:** Decorative by default: `aria-hidden="true"`, and the host carries the state — `aria-busy="true"` on the region that is loading, or a pending button's polite live-region message. Never both: a labeled spinner inside a host that already announces double-announces. A standalone spinner with no host takes a `label` and `role="status"`.

## Motion

- **Enter:** none (present on mount; the host delays mounting it)
- **Exit:** none
- **Reduced motion:** The turn runs `motion.duration.spin` (800ms) per turn, linear and infinite. Under prefers-reduced-motion it runs `motion.duration-reduced.spin` (2600ms) per turn instead — slower, never stopped.

## Composition

- **Composes with:** `button`
- **Planned:** `progress`, `skeleton`
- **Replaces:**
  - an animated loading GIF
  - a static loading glyph in the icon set

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- rotation — the whole behavior. In code the spinner turns continuously: `animation: spin var(--motion-duration-spin) linear infinite` (800ms per turn), a `@keyframes spin { to { transform: rotate(1turn) } }` on the SVG. Figma holds one rest position per size; a prototype rotation loop for presentations is optional and not built here.
- reduced motion — under `@media (prefers-reduced-motion: reduce)` the turn SLOWS to `var(--motion-duration-reduced-spin)` (2600ms per turn), still linear and infinite. Not a pulse and not a static ring: the turn is what tells a sighted user work is continuing, so reduced motion keeps it and takes the speed out of it.
- the stroke in code — one `<svg viewBox="0 0 24 24">` with two circles at r=10: the track at `stroke-opacity: 0.2` and the arc with `stroke-dasharray` 33% of the circumference (20.73 of 62.83), both `stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"`, the arc rotated -90deg so it starts at twelve o'clock. The viewBox scales the 2-unit stroke with the rendered size, the same proportion the Figma outlines hold.
- anti-flash delay — the HOST's, not the spinner's. A spinner that appears for a fast operation flashes; the host waits before showing it (the button's `isPending` "delays the spinner") and, once shown, keeps it long enough to be read. The spinner renders the moment it is mounted.
- announcement — decorative by default (`aria-hidden="true"`). The host owns the busy state and its announcement (`aria-busy` on the region, a button's `isPending` with a polite live-region message), because a spinner is invisible to assistive tech. Only a standalone spinner with a `label` renders `role="status"`.

---

Generated from the `spinner` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
