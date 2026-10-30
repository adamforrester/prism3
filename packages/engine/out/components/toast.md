# Toast

> A short status message over the page after an action. Announced politely; it never takes focus.

- **ID:** `toast`
- **Category:** feedback
- **Status:** draft
- **Also known as:** snackbar, notification, flag, flash-message

## Overview

A short status message that appears over the page after something the user did, such as "Added to bag" or "Address saved", and goes away by itself. It confirms the user's own action, and the page already shows the change, so missing it costs nothing. It is announced politely and never takes focus. It can carry one action, which also exists elsewhere on the page, and a close button. One toast shows at a time: a new one replaces the one showing. Not a banner (a message the user must see, such as an error, stays in the page until it is resolved), not a dialog (a decision before going on), and not a field message (about one field).

- **Purpose:** Confirm the user's own action with a short status over the page that is safe to miss.
- **Use when:** After an action whose result the page already shows ("Added to bag", "Address saved"), when a brief, polite confirmation helps and missing it costs nothing.
- **Avoid when:** The message is an error, a warning or anything the user must see (a banner); it asks for a decision (a dialog); it is about one field (a field message); or its action has no other route on the page.

## Anatomy

Shown on the default member: intent `neutral`.

1. **Container** — The toast: the inverse surface, its shadow and its corners. It is never shorter than a medium control, and holds the message on the start side and the action and close button on the end side.
2. **Content** — The glyph and the message. It takes the width the action and close button do not.
3. **Check circle glyph** — The success glyph, a circled check, hidden from assistive technology: the message carries the meaning. A neutral toast has no glyph.
4. **Message** — The message. It wraps onto a second line rather than truncating.
5. **Controls** — The action and the close button, at the end edge.
6. **Action** (optional) — The action: a Button, text, small, on the inverse surface, reading "Action" until a designer names it. Off by default.
7. **Close** (optional) — The close button: a FlushIconButton.Neutral, flush, small, showing the close glyph and named "Dismiss". On by default.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `intent` | `neutral`, `success` | once, when authored | neutral for a plain confirmation, with no glyph. success adds a circled check beside the message. A message the user must not miss, such as an error, is a banner, not a toast. |

## Usage guidelines

Use a Toast to confirm something the user did, when the page already shows the change: "Added to bag", "Address saved", "Code copied". If missing the message would cost the user something, use a banner. A decision before going on is a dialog; a message about one field is a field message.

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

## Accessibility

- **Keyboard:** F6 moves focus into the notifications region, to the newest toast's first control. Tab moves between the action and the close button. Escape or Shift+F6 returns focus to where it was. Enter and Space act on the focused button.
- **Focus:** Showing a toast never moves focus. Focus enters only by F6, and Escape returns it.
- **Screen readers:** The toast sits in one shared role="status" live region (polite, aria-atomic="true"), inside a landmark labeled "Notifications". The toast itself takes no role and never takes focus.

  The live region is role="status" with aria-atomic="true", present and empty from app start. The success glyph is aria-hidden. The close button's accessible name is "Dismiss" and the region's label is "Notifications"; both are translatable. Nothing mirrors in motion.

### WCAG

- 4.1.3 Status Messages (the message is announced through a live region without moving focus)
- 2.2.1 Timing Adjustable (a toast with no action shows for at least 5 seconds, pausing on hover, focus and a hidden window; a toast with an action does not time out)
- 1.4.1 Use of Color (success has a glyph shape and its text, not color alone)
- 1.4.3 Contrast (Minimum) (the message clears 4.5:1 on the inverse surface)
- 1.4.11 Non-text Contrast (the success glyph and the focus ring clear 3:1 on the inverse surface)
- 2.1.1 Keyboard (F6 reaches the action and the close button; the action also exists elsewhere on the page)
- 2.4.3 Focus Order (focus enters the region only when the user moves it there, and Escape returns it)
- 2.4.11 Focus Not Obscured (Minimum) (the page keeps a focused control clear of the toast)
- 2.5.8 Target Size (Minimum) (the close button is a 36px box, above 24px; targets 2.5.5 at 44×44 in code)

### Motion

- **Enter:** An 8px slide up and a fade (motion.transition.enter: motion.duration.normal, motion.easing-role.enter).
- **Exit:** A fade (motion.transition.exit: motion.duration.fast, motion.easing-role.exit). A replacement plays the exit, then the enter.
- **Reduced motion:** Under prefers-reduced-motion, the fade only, with no slide, at motion.duration-reduced.normal.

## Content guidelines

Short and factual: the outcome, not a conversation. The glyph carries the tone, so the text stays plain. Name the action by what it does.

- **Labels:** State the outcome in a few words, in sentence case, with no period: "Added to bag", "Address saved". The action is one verb or a short verb phrase: "Undo", "View bag".

## Related components

- **Built from:** `button`, `flush-icon-button-neutral`
- **Instead, consider:** `dialog`, `field-message`, `banner`
- **Often used with:** `field-message`, `dialog`
- **Replaces:**
  - an alert() after a save
  - a status message that moves focus
  - a timed message with no pause

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `message` | string | — | yes | The status, a few words stating the outcome ("Added to bag"). It wraps onto a second line rather than truncating. |
| `intent` | enum: 'neutral' \| 'success' | `neutral` | no | neutral for a plain confirmation, with no glyph. success adds a circled check beside the message. A message the user must not miss, such as an error, is a banner, not a toast. |
| `action` | { label: string; onAction: function } | — | no | At most one action, a text button named by one verb ("Undo", "View bag"). The same action must also exist elsewhere on the page. A toast with an action does not close by itself. |
| `duration` | number | `6000` | no | How long a toast with no action shows, in milliseconds. Never less than 5000; a shorter value is raised to 5000. Raise it for a longer or translated message. Ignored when there is an action. |
| `dismissible` | boolean | `true` | no | Shows the close button, named "Dismiss". On by default: it is the one exit a user can count on. |
| `onDismiss` | function | — | no | Called when the toast closes for any reason: the close button, the timer, the next toast replacing it, or the action. |

## Specs

Generated from the plan that builds the design-file component: 2 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/content` | frame | every member |
| `container/content/message` | text | every member |
| `container/controls` | frame | every member |
| `container/controls/action` | instance | every member |
| `container/controls/close` | instance | every member |
| `container/content/checkCircleGlyph` | instance | intent=success |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

**every member**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.100` / `space.100` / `space.200` | `space.100` | — | — | — | min height `size.md.height`; build width 360px (literal) |
| `container/content` | — | `space.150` | — | — | — | — |
| `container/controls` | — | `space.050` | — | — | — | — |
| `container/content/checkCircleGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

### Type

Keyed by nothing: one row covers every member.

| Members | Part | Text style |
| --- | --- | --- |
| every member | `container/content/message` | `type.body.sm.default` |

### Color

Keyed by `intent`.

**intent=neutral**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.background.primary` | — | — | — |
| `container/content/message` | — | — | `color.inverse.text.primary` | — |

**intent=success**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.background.primary` | — | — | — |
| `container/content/checkCircleGlyph` | — | — | — | `color.inverse.icon.success` |
| `container/content/message` | — | — | `color.inverse.text.primary` | — |

### Nesting and properties

- `container/controls/action` nests `button` at `appearance=text, size=small, surface=inverse, inset=default, state=rest, leading icon=false, trailing icon=false`
- `container/controls/close` nests `flush-icon-button-neutral` at `shape=flush, size=small, surface=inverse, state=rest`
- `container/content/checkCircleGlyph` nests `icon/check-circle`

| Property | Type | Default |
| --- | --- | --- |
| `message` | text | `Status message` |
| `action` | boolean | `false` |
| `close` | boolean | `true` |

---

Generated from the `toast` component definition.
