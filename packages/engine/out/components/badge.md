# Badge

> A static status label, count or dot. Nothing to click, and color is never the only signal.

A small, static marker of one of three types. A status label is short text in the flow of content, such as a lifecycle state, a keyword or a file size, and it announces its own text. A count is a number over a host, such as unread messages on an icon button, capped at a maximum. A dot is a contentless mark over a host for presence or unread state. A count or dot is hidden from assistive technology, and its meaning goes in the host's accessible name. A badge has no hover, focus or pressed state. Anything a user can click, toggle or remove is a tag.

- **ID:** `badge`
- **Category:** foundations
- **Status:** draft
- **Also known as:** status-badge, counter-badge, notification-badge, notification-dot, presence-badge, label, counter, state-label

## Usage

Use a status label to show a state or attribute inline, such as a lifecycle state beside a title or a keyword on a card. Use a count over a host for an accumulation the user can act on, such as unread messages. Use a dot when the exact number is unknown or does not matter, such as presence on an avatar. A status label is subtle by default; use bold when the state has to stand out from the content around it, such as a failure in a list of passing builds. Keep it static. If it needs to be clicked, toggled or removed, it is a tag.

### Do

- Put the meaning of a count or dot in the host's accessible name
- Cap a count, as in "99+", and hide it at zero unless zero matters
- Keep a status label to one or two words, in the same casing everywhere
- Pair every tone with text that says the same thing

### Don't

- Make a badge clickable, selectable or removable. That is a tag.
- Use a badge for feedback about an action. That is a toast or a banner.
- Rely on the tone or a dot alone to carry meaning
- Put more than one count or dot on one host

### Content guidelines

Name the state, not the color: "Failed", not "Red". Use the same word for the same state everywhere, and keep it short enough to read at a glance. For a count, show the number up to the cap and the cap followed by a plus sign above it ("99+"). For a count or dot, write the host's accessible name so it says what the badge shows ("Notifications, 5 new"), since the badge itself is not read.

### Copy patterns

- **Labels:** Status label: one or two words, in the same casing everywhere ("In review", "Failed", "PDF 262 KB"). Count: a number, capped ("99+"). Dot: no text on screen. The host names what it means ("3 unread messages", "Online").

## Choosing it

- **Purpose:** Mark a status, count or presence with a small static badge that nobody clicks.
- **Use when:** A short inline state or attribute (status), an actionable number over an icon button or tab (count), or presence or unread state over an avatar or nav item (dot).
- **Avoid when:** The user can click, toggle or remove it (use a tag), the message is feedback about an action (use a toast or banner), or the color would be the only signal.
- **Often used with:** `icon-button`, `button`, `tab`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `type` | enum: 'status' \| 'count' \| 'dot' | `status` | no | Which kind of badge. status = a short label in flow that announces its own text. count = a number over a host, hidden from assistive technology. dot = a contentless mark over a host, also hidden. For a count or dot, the host carries the meaning in its accessible name. |
| `emphasis` | enum: 'subtle' \| 'bold' | `subtle` | no | How strongly a status label reads. subtle = the tone's tint with a 1px edge in the tone's border color, for a state that sits beside other content. bold = the solid tone fill, for a state that needs to stand out. A count and a dot are always bold. |
| `tone` | enum: 'neutral' \| 'info' \| 'success' \| 'warning' \| 'danger' | `neutral` | no | Which semantic role the badge paints from. The text carries the meaning, so a tone never stands in for it. |
| `label` | string | — | no | The status text, for type status. One or two words, in consistent casing across the product. |
| `value` | number | — | no | The count, for type count. Above max it shows as max followed by a plus sign, formatted for the locale. |
| `max` | number | `99` | no | The largest count shown in full, for type count. A larger value shows as "99+". |
| `showZero` | boolean | `false` | no | Whether a count of zero still shows, for type count. Hidden by default, since zero is usually nothing to act on. |
| `overlap` | enum: 'rectangular' \| 'circular' | `rectangular` | no | The host shape a count or dot sits over. circular pulls the badge in toward the curve so it stays on the host's edge, such as an avatar. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `type` | `status`, `count`, `dot` | once, when authored |
| `emphasis` | `subtle`, `bold` | at runtime |
| `tone` | `neutral`, `info`, `success`, `warning`, `danger` | at runtime |

## Accessibility

- **Role:** none. A status label is plain text and announces itself; a count or dot is aria-hidden and its meaning is in the host's accessible name.
- **WCAG:**
  - 1.4.1 Use of Color (the text carries the meaning; a tone, or a dot, is never the only signal)
  - 1.4.3 Contrast (the label ink clears 4.5:1 on its own fill, measured in every mode of the example brands)
  - 1.4.11 Non-text Contrast (applies to the dot, which has no text, so the colored circle is the information: its bold fill clears 3:1 against the page, measured in every mode of the example brands. For a status label or count the text carries the meaning, and the separation from the page is design intent rather than a 1.4.11 requirement: the subtle label's 1px edge and every bold fill clear 3:1 against the page in the same measurement)
  - 4.1.2 Name, Role, Value (a count or dot joins its host's accessible name, so the host says what it means)
  - 4.1.3 Status Messages (a count that changes after render reaches assistive technology through a polite live region)
- **Keyboard:** None. A badge takes no focus and has no action. A count on an icon button is reached through the button.
- **Focus:** Never focusable, and no focus ring. The host carries focus.
- **ARIA:** Status label: not aria-hidden, and no role of its own. It reads as text in place, so it must not be given role="status". Count and dot: aria-hidden="true", and the host composes the meaning into its accessible name, as in "Inbox, 3 unread messages" or "Maya, online". A dot needs that text in the host name. Never describe it by color, as in "red dot". A count that changes while the page is open is announced through one shared polite live region.

## Motion

- **Enter:** A count or dot scales in from zero, from the corner it is anchored to. When a count changes, only the number animates, not the pill. A status label appears with no motion. A dot pulses only for a critical alert.
- **Exit:** A count or dot scales out to its anchor corner.
- **Reduced motion:** Under prefers-reduced-motion every change is instant: no scale, no pulse.

## Composition

- **Alternative to:** `tag`
- **Planned:** `avatar`, `toast`, `banner`
- **Replaces:**
  - a hand-drawn colored pill
  - a red circle with a number drawn over an icon

---

Generated from the `badge` component definition.
