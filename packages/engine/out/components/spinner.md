# Spinner

> Indeterminate loading indicator on the icon ladder. Announces "Loading" unless its host hides it.

A rotating arc over a faint full ring, showing that work is in progress with no known end. Sized on the icon ladder (16 / 20 / 24 / 32) and inked from the surrounding text or icon color, so it drops into any icon slot — a button's leading visual, a field's trailing slot. On its own it is a polite status named "Loading", or a more specific `label`; inside a host that announces its own busy state, the host hides it with `aria-hidden`. It has no value, so it never stands in for a determinate progress bar.

- **ID:** `spinner`
- **Category:** foundations
- **Status:** draft
- **Also known as:** loading-indicator, activity-indicator, loader, busy-indicator, loading, inline-loading, spin

## Usage

Use a spinner for a short wait with no known end — about 200ms to 5s — inside the thing that is waiting: a button that is saving, a field checking its value, a region reloading. Size it to the icon slot it sits in, and let it take the ink around it. The host decides when it shows (after a short delay, so a fast operation does not flash). On its own the spinner announces a polite "Loading" status, or a more specific `label`; inside a host that announces its own busy state, such as a Button's `isPending`, the host sets `aria-hidden="true"` on it.

### Do

- Put the spinner in the host's own icon slot at that slot's icon size, so nothing around it moves
- Let the host delay showing it, so a fast operation does not flash a spinner
- Give a standalone spinner a specific `label` ("Loading results") when the work is known
- Set `aria-hidden="true"` on a spinner inside a host that announces its own busy state (`aria-busy`, a Button's `isPending`)
- Keep the turn under reduced motion, slowed to the reduced duration

### Don't

- Use a spinner for work with a known length — show determinate progress
- Draw a static loading glyph from the icon set instead — it drops the rotation, the reduced-motion turn and the announcement
- Leave a spinner exposed inside a host that already announces its busy state — the state is announced twice; set `aria-hidden="true"` on it
- Keep the generic "Loading" when the work is known — name it ("Loading results")
- Show many spinners at once — a dashboard that starts one per widget on load reads as noise; use one placeholder for the layout and keep the spinner for a single user-triggered wait (Primer)
- Put `role="progressbar"` or `aria-valuenow` on a spinner — it has no value, and a value is determinate progress
- Stop the turn under reduced motion — slow it

### Content guidelines

Label: specific and in sentence case — "Loading results", "Updating profile" — not a generic "Loading…"; "Loading" is the fallback when nothing more specific is known. One status for the whole wait, and for a region or a longer wait the host announces completion ("Results loaded"). Inside a button, the button keeps its accessible name while pending.

### Copy patterns

- **Labels:** Name the work, in sentence case: "Loading results", "Saving changes" — not a generic "Loading…". "Loading" is the fallback only when nothing more specific is known. One status for the whole wait, not a chain of steps ("Fetching…", "Parsing…") that floods the live region; for a region or a longer wait, the host announces completion ("Results loaded").

## Choosing it

- **Purpose:** Show that work is in progress with no known end, inside the control or region that is waiting.
- **Use when:** A short indeterminate wait of about 200ms to 5s (Material 3's bands) inside a host: a pending Button, a field validating its value, a region reloading. Size it to the host's icon slot.
- **Avoid when:** The wait is under 200ms (show nothing — a spinner shown that briefly only flashes), runs past about 5s or has a known length (determinate progress, not built yet — including a circular progress with a value), the page is loading its layout (a skeleton, not built yet), or you want a static icon — the spinner is behavior, not a glyph.
- **Often used with:** `button`, `icon-button`, `text-field`, `select`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `size` | enum: 'x-small' \| 'small' \| 'medium' \| 'large' | `medium` | no | The icon ladder: 16 / 20 / 24 / 32. The band scales with it (2px at 24). Inside a host slot, take the slot's own icon size. |
| `label` | string | `Loading` | no | The accessible name of the spinner's `role="status"` wrapper, visually hidden and announced politely. "Loading" by default; name the work when it is known ("Loading results"). A host that already announces its own busy state (a Button or IconButton `isPending`, which set `aria-busy` and carry their own live region) puts `aria-hidden="true"` on the spinner instead, so the state is announced once. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `x-small`, `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** `status` with `aria-live="polite"`, named by `label` — "Loading" by default. Hidden (`aria-hidden="true"`) inside a host that announces its own busy state.
- **WCAG:**
  - 1.1.1 Non-text Content (the drawing is `aria-hidden`; the status text is the name)
  - 1.4.11 Non-text Contrast (the arc takes its host's icon ink, meant to clear 3:1; the track is decorative and exempt)
  - 4.1.3 Status Messages (the polite "Loading" status when it stands alone; the host's own announcement when the host hides it)
- **Focus:** None. The spinner takes no focus. A pending host control keeps its own: it takes `aria-disabled="true"`, not native `disabled`, which takes the control out of the focus order and sends focus to the page body (USWDS), and it suppresses the repeat click in script — see Button's `isPending`.
- **ARIA:** Standalone, the default: a `role="status"` wrapper with `aria-live="polite"`, named by `label` ("Loading" unless a more specific label is given), around an `aria-hidden` drawing. Inside a host that already announces its busy state — a Button or IconButton `isPending`, which set `aria-busy` and carry their own polite live region — the host sets `aria-hidden="true"` on the spinner, so the state is announced once rather than twice. Never `aria-valuenow` and never `role="progressbar"`: a spinner has no value, and an indeterminate progressbar can make some screen readers keep announcing the missing value.

## Motion

- **Enter:** A quick fade in on mount: opacity over `motion.duration.fast` (100ms at the standard tempo) on the `motion.easing-role.enter` curve. The host decides when to mount it.
- **Exit:** none
- **Reduced motion:** The turn runs `motion.duration.spin` (800ms) per turn, linear and infinite. Under prefers-reduced-motion it runs `motion.duration-reduced.spin` (2600ms) per turn instead — slower, never stopped. The enter fade stays, on `motion.duration-reduced.fast` — a change of opacity is not vestibular motion.

## Composition

- **Planned:** `progress`, `skeleton`, `toast`
- **Replaces:**
  - an animated loading GIF
  - a static loading glyph in the icon set

---

Generated from the `spinner` component definition.
