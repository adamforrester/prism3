# Toast

> A short status message over the page after an action. Announced politely; it never takes focus.

A short status message that appears over the page after something the user did, such as "Added to bag" or "Address saved", and goes away by itself. It confirms the user's own action, and the page already shows the change, so missing it costs nothing. It is announced politely and never takes focus. It can carry one action, which also exists elsewhere on the page, and a close button. One toast shows at a time: a new one replaces the one showing. Not a banner (a message the user must see, such as an error, stays in the page until it is resolved), not a dialog (a decision before going on), and not a field message (about one field).

- **ID:** `toast`
- **Category:** feedback
- **Status:** draft
- **Also known as:** snackbar, notification, flag, flash-message

## Usage

Use a Toast to confirm something the user just did, when the page already shows the change: "Added to bag", "Address saved", "Code copied". If missing the message would cost the user something, use a banner. A decision before going on is a dialog; a message about one field is a field message.

### Do

- Confirm the user's own action in a few words
- Use success when the action completed, and neutral otherwise
- Keep the close button
- Make the action also available elsewhere on the page
- Raise the duration for a long or translated message

### Don't

- Show an error or a warning in a toast. Use a banner.
- Put the only route to an action in a toast
- Add more than one action
- Move focus to a toast
- Set a duration under 5 seconds

### Content guidelines

Short and factual: the outcome, not a conversation. The glyph carries the tone, so the text stays plain. Name the action by what it does.

### Copy patterns

- **Labels:** State the outcome in a few words, in sentence case, with no period: "Added to bag", "Address saved". The action is one verb or a short verb phrase: "Undo", "View bag".

## Choosing it

- **Purpose:** Confirm the user's own action with a short status over the page that is safe to miss.
- **Use when:** After an action whose result the page already shows ("Added to bag", "Address saved"), when a brief, polite confirmation helps and missing it costs nothing.
- **Avoid when:** The message is an error, a warning or anything the user must see (a banner); it asks for a decision (a dialog); it is about one field (a field message); or its action has no other route on the page.
- **Often used with:** `button`, `icon-button-neutral`, `field-message`, `dialog`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `message` | string | — | yes | The status, a few words stating the outcome ("Added to bag"). It wraps onto a second line rather than truncating. |
| `intent` | enum: 'neutral' \| 'success' | `neutral` | no | neutral for a plain confirmation, with no glyph. success adds a circled check beside the message. A message the user must not miss, such as an error, is a banner, not a toast. |
| `action` | { label: string; onAction: function } | — | no | At most one action, a text button named by one verb ("Undo", "View bag"). The same action must also exist elsewhere on the page. A toast with an action does not close by itself. |
| `duration` | number | `6000` | no | How long a toast with no action shows, in milliseconds. Never less than 5000; a shorter value is raised to 5000. Raise it for a longer or translated message. Ignored when there is an action. |
| `dismissible` | boolean | `true` | no | Shows the close button, named "Dismiss". On by default: it is the one exit a user can count on. |
| `onDismiss` | function | — | no | Called when the toast closes for any reason: the close button, the timer, the next toast replacing it, or the action. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `intent` | `neutral`, `success` | once, when authored |

## Accessibility

- **Role:** The toast sits in one shared role="status" live region (polite, aria-atomic="true"), inside a landmark labeled "Notifications". The toast itself takes no role and never takes focus.
- **WCAG:**
  - 4.1.3 Status Messages (the message is announced through a live region without moving focus)
  - 2.2.1 Timing Adjustable (a toast with no action shows for at least 5 seconds, pausing on hover, focus and a hidden window; a toast with an action does not time out)
  - 1.4.1 Use of Color (success has a glyph shape and its text, not color alone)
  - 1.4.3 Contrast (Minimum) (the message clears 4.5:1 on the inverse surface)
  - 1.4.11 Non-text Contrast (the success glyph and the focus ring clear 3:1 on the inverse surface)
  - 2.1.1 Keyboard (F6 reaches the action and the close button; the action also exists elsewhere on the page)
  - 2.4.3 Focus Order (focus enters the region only when the user moves it there, and Escape returns it)
  - 2.4.11 Focus Not Obscured (Minimum) (the page keeps a focused control clear of the toast)
  - 2.5.8 Target Size (Minimum) (the close button is a 36px box, above 24px; targets 2.5.5 at 44×44 in code)
- **Keyboard:** F6 moves focus into the notifications region, to the newest toast's first control. Tab moves between the action and the close button. Escape or Shift+F6 returns focus to where it was. Enter and Space act on the focused button.
- **Focus:** Showing a toast never moves focus. Focus enters only by F6, and Escape returns it.
- **ARIA:** The live region is role="status" with aria-atomic="true", present and empty from app start. The success glyph is aria-hidden. The close button's accessible name is "Dismiss" and the region's label is "Notifications"; both are translatable. Nothing mirrors in motion.

## Motion

- **Enter:** An 8px slide up and a fade (motion.transition.enter: motion.duration.normal, motion.easing-role.enter).
- **Exit:** A fade (motion.transition.exit: motion.duration.fast, motion.easing-role.exit). A replacement plays the exit, then the enter.
- **Reduced motion:** Under prefers-reduced-motion, the fade only, with no slide, at motion.duration-reduced.normal.

## Composition

- **Composes with:** `button`, `icon-button-neutral`
- **Alternative to:** `dialog`, `field-message`
- **Planned:** `banner`
- **Replaces:**
  - an alert() after a save
  - a status message that moves focus
  - a timed message with no pause

---

Generated from the `toast` component definition.
