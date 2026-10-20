# Progress

> Shows how far a task has got, or that it is still running. Linear or circular.

Shows that system work is under way and, when the system can measure it, how far along it is: an upload, an export, a batch save. A linear bar shows a known amount (determinate) or a sweeping segment while the amount is unknown (indeterminate). A ring shows a known amount in a small space, with its value beside it. At the end the bar turns to the success or danger color and a message with a glyph names the outcome. The label and the value sit outside the track, so neither loses contrast as the fill moves behind it.

- **ID:** `progress`
- **Category:** feedback
- **Status:** draft
- **Also known as:** progress-bar, progress-indicator, linear-progress, circular-progress

## Usage

Use Progress for system work that takes more than a few seconds: a determinate bar when the work can be measured (bytes, items, a known length), an indeterminate bar when it cannot. Use a ring when the space is small, such as a row in a list. For a short wait inside a control, use a Spinner; for a first load of content, a placeholder in the layout's shape. Use the bar for work the user waits on; for long background work, show a status line, or let the user hide the bar.

### Do

- Name the work in the label with an active verb
- Show a concrete amount when there is one ("45 MB of 100 MB")
- Start indeterminate and switch to determinate once the amount is known
- End with a message: past tense when done, the problem and the next step when it fails
- Put a retry action beside the bar, not inside it

### Don't

- Fake a value. A bar that creeps toward the end and stops there breaks the contract; use an indeterminate bar
- Put the label or the value inside the track
- Use an indeterminate ring. That is a Spinner
- Use Progress for a static measurement such as storage used. That is a meter
- Use Progress for a user's place in a multi-step form. That is a stepper
- Show the outcome by color alone

### Content guidelines

Label: what is happening, with an active verb ("Uploading photo.jpg"), one label for the whole task. Value: a concrete amount where there is one ("45 MB of 100 MB", "Step 3 of 5"), otherwise a percentage. End: past tense when done ("Upload complete"); when it fails, what failed and the next step ("Upload failed. The connection dropped. Try again.").

### Copy patterns

- **Labels:** Name the work with an active verb, in sentence case: "Uploading photo.jpg", "Saving your changes". Keep one label for the whole task rather than cycling through technical steps ("Resolving…", "Connecting…"), which flickers on screen and floods a screen reader.
- **Errors:** Name what failed and the next step: "Upload failed. The connection dropped. Try again." Not a bare "Error".

## Choosing it

- **Purpose:** Show that system work is under way and, when it can be measured, how far along it is.
- **Use when:** An upload, export or batch job that takes more than a few seconds: determinate when the amount is known, indeterminate when it is not. A ring when the space is small.
- **Avoid when:** The wait is short and inside a control (use a spinner), the content is loading for the first time (a placeholder in the layout's shape), the value is a static measurement such as storage used (a meter), it marks a user's place in a multi-step flow (a stepper), or the work cannot be measured and you want a ring (use a spinner).
- **Often used with:** `button`, `spinner`, `field-message`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `type` | enum: 'determinate' \| 'indeterminate' | `determinate` | no | determinate = the work can be measured, so the bar shows how far it has got. indeterminate = it cannot, so a segment sweeps along the track and there is no value. Choose indeterminate rather than faking a value. |
| `value` | number | — | no | How far the work has got, between min and max, for a determinate bar. Omitted, the bar rests at min. Out-of-range values are clamped, with a warning in development. Never fake a value: a bar that creeps toward the end and stops there breaks the contract. If the work cannot be measured, set type to indeterminate. |
| `min` | number | `0` | no | The start of the range. |
| `max` | number | `100` | no | The end of the range: 100 for a percentage, or the total, such as a byte count. |
| `label` | string | — | yes | What is in progress, with an active verb ("Uploading photo.jpg"). It is the accessible name. A linear bar shows it above the track; a ring is named by it without showing it. |
| `valueText` | string \| (value: number) => string | — | no | The visible value, and the same string as aria-valuetext. A percentage by default, through Intl.NumberFormat, so "45%" localizes. Prefer a concrete amount when there is one ("45 MB of 100 MB"). |
| `shape` | enum: 'linear' \| 'circular' | `linear` | no | linear = a bar that fills its container. circular = a ring for a small space, determinate only. A ring that cannot show a value is a Spinner. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | The ring's size: medium is 40px with a 4px band, small is 24px with a 2px band. A linear bar has one thickness, 4px, and ignores this. |
| `status` | enum: 'active' \| 'complete' \| 'error' | `active` | no | active = the work is running. complete = it finished: the fill turns to the success color and the message names the result. error = it failed: the fill stops where it failed, turns to the danger color, and the message names the problem and the next step. |
| `message` | string | — | no | The outcome, shown below the bar at complete and error with a glyph: past tense when done ("Upload complete"), the problem and the next step when it fails ("Upload failed. The connection dropped. Try again."). |
| `showValue` | boolean | `true` | no | Whether the value text shows. On by default. A ring keeps it on: it has no end to mark, so the value is how the amount reads. |
| `announce` | enum: 'milestones' \| 'end' \| 'none' | `milestones` | no | What a screen reader hears. milestones = once as the value passes 25, 50 and 75%, and again at the end. end = the end only. none = the host announces the work itself. An error is announced when it happens, except under none. |
| `delay` | number | `400` | no | Milliseconds to wait before showing the bar. If the work finishes first, nothing shows, so a fast task does not flash a bar. |
| `minDisplay` | number | `500` | no | Milliseconds the bar stays once shown, so it does not vanish after one frame. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `shape` | `linear`, `circular` | once, when authored |
| `type` | `determinate`, `indeterminate` | at runtime |
| `status` | `active`, `complete`, `error` | at runtime |
| `size` | `medium`, `small` | once, when authored |

## Accessibility

- **Role:** `progressbar`, named by the label. A polite live region beside it carries the milestone and end announcements.
- **WCAG:**
  - 4.1.2 Name, Role, Value (role progressbar named by its label; with a value, aria-valuenow, aria-valuemin, aria-valuemax and aria-valuetext)
  - 4.1.3 Status Messages (the milestones, the end and an error reach a screen reader through a polite live region)
  - 1.4.1 Use of Color (the length of the fill and the value text carry the amount; complete and error carry a glyph and a message)
  - 1.4.3 Contrast (the label, the value and the message clear 4.5:1 against the page, measured in every mode of the example brands)
  - 1.4.11 Non-text Contrast (the fill clears 3:1 against the track, and the stop dot against the page, measured in every mode of the example brands)
  - 2.2.2 Pause, Stop, Hide (targeted: an indeterminate bar is for work the user waits on; for long background work, show a status line or let the user hide the bar)
- **Keyboard:** None. Progress takes no focus and has no action.
- **Focus:** Never focusable. Focus stays where it was when the work started.
- **ARIA:** Determinate: role="progressbar", aria-labelledby pointing at the label (aria-label on a ring, whose label does not show), aria-valuenow, aria-valuemin and aria-valuemax, and aria-valuetext whenever the visible value is not a bare percentage ("45 MB of 100 MB"). Indeterminate: role="progressbar" with no value attributes, and aria-busy="true" on the region being updated. A screen reader does not reliably speak a changing aria-valuenow, and speaking every step floods it, so a polite live region, present and empty from the start, speaks the value as it passes 25, 50 and 75%, and the message at the end. An error is spoken when it happens. The message glyph is aria-hidden. Every string, the "%" sign included, is translatable.

## Motion

- **Enter:** Appears after a short delay (400ms), so a fast task shows nothing. The fill moves to each new value over `motion.duration.moderate` on `motion.easing-role.default`. An indeterminate bar sweeps its segment across the track once every `motion.duration.sweep` (1600ms), on `motion.easing.calm`. At complete and error the color crossfades over `motion.duration.fast`.
- **Exit:** Stays at least 500ms once shown, then leaves with its host.
- **Reduced motion:** The fill snaps to each value (`motion.duration-reduced.moderate`, 0ms). The indeterminate sweep keeps moving, more slowly: one pass every `motion.duration-reduced.sweep` (2600ms). It is never removed, because a still bar reads as stuck.

## Composition

- **Composes with:** `field-message`
- **Alternative to:** `spinner`
- **Planned:** `skeleton`, `meter`, `stepper`
- **Replaces:**
  - a bar that creeps to 99% while the real amount is unknown
  - a label printed inside the moving fill

---

Generated from the `progress` component definition.
