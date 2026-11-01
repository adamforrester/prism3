# Badge

> A static status label, count or dot. Nothing to click, and color is never the only signal.

- **ID:** `badge`
- **Category:** foundations
- **Status:** draft
- **Also known as:** status-badge, counter-badge, notification-badge, notification-dot, presence-badge, label, counter, state-label

## Overview

A small, static marker of one of three types. A status label is short text in the flow of content, such as a lifecycle state, a keyword or a file size, and it announces its own text. A count is a number over a host, such as unread messages on an icon button, capped at a maximum. A dot is a contentless mark over a host for presence or unread state. A count or dot is hidden from assistive technology, and its meaning goes in the host's accessible name. A badge has no hover, focus or pressed state. Anything a user can click, toggle or remove is a tag.

- **Purpose:** Mark a status, count or presence with a small static badge that nobody clicks.
- **Use when:** A short inline state or attribute (status), an actionable number over an icon button or tab (count), or presence or unread state over an avatar or nav item (dot). Inline style: a status inside running text, a list or table row, or a card's details, where a filled label would break up the line.
- **Avoid when:** The user can click, toggle or remove it (use a tag), the message is feedback about an action (use a toast or banner), or the color would be the only signal.

## Anatomy

Shown on the default member: type `status`, style `contained`, size `medium`, emphasis `subtle`, tone `neutral`.

1. **Surface** — The badge body, sized by what it holds: a small-radius label around a status text, a circle around one digit that grows into a pill, or the round dot itself. A subtle status label is the tone's tint with a 1px edge in the tone's border color, drawn inside the edge so it adds no size. A bold badge is the solid tone fill with no edge. Neither paints an interactive color. In the inline style it paints nothing and has no padding: a dot and the label on one text line, as tall as the line.
2. **Dot cell** — A cell one line of the label tall, at the start of an inline status. It centers the dot on the first line, so the dot stays there when the label wraps.
3. **Status dot** — The 8px status dot, in the tone's icon color. It repeats what the label says and is hidden from assistive technology.
4. **Label** — The status text in the tone's text role. It carries the meaning, so the tone is never the only signal. In the inline style it is body text in the primary text color, and the dot carries the tone.
5. **Count** — The number, in the ink paired with the bold tone fill. Capped as the maximum followed by a plus sign, as in "99+".
6. **Dot** — The dot's fixed square, about 8px. It paints nothing itself: the badge around it has no padding for this type, so the pill's round fill is the dot.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `type` | `status`, `count`, `dot` | once, when authored | Which kind of badge. status = a short label in flow that announces its own text. count = a number over a host, hidden from assistive technology. dot = a contentless mark over a host, also hidden. For a count or dot, the host carries the meaning in its accessible name. |
| `style` | `contained`, `inline` | once, when authored | How a status label is drawn. contained = a filled label with padding, in the chosen emphasis. inline = a dot and plain text on the text line, as tall as the line, for running text, list rows and cards. A count and a dot are always contained. |
| `size` | `medium`, `small` | once, when authored | The status label's size. medium = 12px text, about 30px tall. small = 11px text, about 19px tall, for dense layouts such as a label on a product card. A count and a dot come in medium only. |
| `emphasis` | `subtle`, `bold`, `surface` | at runtime | How a status label reads. subtle = the tone's tint with a 1px edge in the tone's border color, for a state that sits beside other content. bold = the solid tone fill, for a state that needs to stand out. surface = the page color with the tone's text and no edge, for a label on a photo or any busy ground, where it brings its own background. A count and a dot are always bold. |
| `tone` | `neutral`, `info`, `success`, `warning`, `danger` | at runtime | Which semantic role the badge paints from. The text carries the meaning, so a tone never stands in for it. |

## Usage guidelines

Use a status label to show a state or attribute inline, such as a lifecycle state beside a title or a keyword on a card. Use a count over a host for an accumulation the user can act on, such as unread messages. Use a dot when the exact number is unknown or does not matter, such as presence on an avatar. A status label is subtle by default; use bold when the state has to stand out from the content around it, such as a failure in a list of passing builds. Use surface for a label on a photo or any busy ground, such as "Selling fast" on a product image. Use small where space is tight, such as on a product card. Keep it static. If it needs to be clicked, toggled or removed, it is a tag. Use the inline style when the status sits in running text, a list or table row, or the details of a store or product card, where a container would break up the line. It is as tall as the text beside it (24px at medium, 21px at small), so the row keeps its height. Use a contained style when the label has to read as an object of its own: on a card header, a media tile or beside a page title. On a photo or busy ground use the contained surface emphasis, since the inline style has no ground of its own.

### Do

- Put the meaning of a count or dot in the host's accessible name
- Cap a count, as in "99+", and hide it at zero unless zero matters
- Keep a status label to one or two words, in the same casing everywhere
- Pair every tone with text that says the same thing
- Use the inline style for status in a sentence, a list row, a table cell or a store card
- Write the whole state in the label ("Out of stock at this location"). It wraps, and the dot stays on the first line
- Keep one style per list, so rows scan as a column

### Don't

- Make a badge clickable, selectable or removable. That is a tag.
- Use a badge for feedback about an action. That is a toast or a banner.
- Rely on the tone or a dot alone to carry meaning
- Put more than one count or dot on one host
- Put an inline status on a photo or a busy ground. Use the surface emphasis there
- Use an inline status without a label. A dot on its own over a host is the dot type, and its meaning goes in the host's name
- Mix inline and contained styles for the same state in one view

## Accessibility

- **Keyboard:** None. A badge takes no focus and has no action. A count on an icon button is reached through the button.
- **Focus:** Never focusable, and no focus ring. The host carries focus.
- **Screen readers:** none. A status label is plain text and announces itself; a count or dot is aria-hidden and its meaning is in the host's accessible name.

  Status label: not aria-hidden, and no role of its own. It reads as text in place, so it must not be given role="status". Inline style: the dot is aria-hidden="true", with no role and no accessible name, and the label reads as plain text in place, with no role="status". Count and dot: aria-hidden="true", and the host composes the meaning into its accessible name, as in "Inbox, 3 unread messages" or "Maya, online". A dot needs that text in the host name. Never describe it by color, as in "red dot". A count that changes while the page is open is announced through one shared polite live region.

### WCAG

- 1.4.1 Use of Color (the text carries the meaning; a tone, or a dot, is never the only signal)
- 1.4.3 Contrast (the label ink clears 4.5:1 on its own fill, measured in every mode of the example brands; an inline label clears 4.5:1 against the page and card surfaces)
- 1.4.11 Non-text Contrast (applies to the dot, which has no text, so the colored circle is the information: its bold fill clears 3:1 against the page, measured in every mode of the example brands. For a status label or count the text carries the meaning, and the separation from the page is design intent rather than a 1.4.11 requirement: the subtle label's 1px edge and every bold fill clear 3:1 against the page in the same measurement. The same holds for the inline style's dot: its label says the same thing, so 1.4.11 does not require 3:1, and the dot clears 3:1 against the page and card surfaces as design intent)
- 4.1.2 Name, Role, Value (a count or dot joins its host's accessible name, so the host says what it means)
- 4.1.3 Status Messages (a count that changes after render reaches assistive technology through a polite live region)

### Motion

- **Enter:** A count or dot scales in from zero, from the corner it is anchored to. When a count changes, only the number animates, not the pill. A status label appears with no motion. A dot pulses only for a critical alert.
- **Exit:** A count or dot scales out to its anchor corner.
- **Reduced motion:** Under prefers-reduced-motion every change is instant: no scale, no pulse.

## Content guidelines

Name the state, not the color: "Failed", not "Red". Use the same word for the same state everywhere, and keep it short enough to read at a glance. For a count, show the number up to the cap and the cap followed by a plus sign above it ("99+"). For a count or dot, write the host's accessible name so it says what the badge shows ("Notifications, 5 new"), since the badge itself is not read. Name the state in the words a reader would use: "In stock", "Low stock", "Out of stock at this location". The label carries the meaning and the dot repeats it, so the label can run longer than a contained label's one or two words.

- **Labels:** Status label: one or two words, in the same casing everywhere ("In review", "Failed", "PDF 262 KB"). Count: a number, capped ("99+"). Dot: no text on screen. The host names what it means ("3 unread messages", "Online").

## Related components

- **Instead, consider:** `tag`, `banner`
- **Often used with:** `icon-button`, `button`, `tab-item`
- **Replaces:**
  - a hand-drawn colored pill
  - a red circle with a number drawn over an icon

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `type` | enum: 'status' \| 'count' \| 'dot' | `status` | no | Which kind of badge. status = a short label in flow that announces its own text. count = a number over a host, hidden from assistive technology. dot = a contentless mark over a host, also hidden. For a count or dot, the host carries the meaning in its accessible name. |
| `style` | enum: 'contained' \| 'inline' | `contained` | no | How a status label is drawn. contained = a filled label with padding, in the chosen emphasis. inline = a dot and plain text on the text line, as tall as the line, for running text, list rows and cards. A count and a dot are always contained. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | The status label's size. medium = 12px text, about 30px tall. small = 11px text, about 19px tall, for dense layouts such as a label on a product card. A count and a dot come in medium only. |
| `emphasis` | enum: 'subtle' \| 'bold' \| 'surface' | `subtle` | no | How a status label reads. subtle = the tone's tint with a 1px edge in the tone's border color, for a state that sits beside other content. bold = the solid tone fill, for a state that needs to stand out. surface = the page color with the tone's text and no edge, for a label on a photo or any busy ground, where it brings its own background. A count and a dot are always bold. |
| `tone` | enum: 'neutral' \| 'info' \| 'success' \| 'warning' \| 'danger' | `neutral` | no | Which semantic role the badge paints from. The text carries the meaning, so a tone never stands in for it. |
| `label` | string | — | no | The status text, for type status. One or two words, in consistent casing across the product. |
| `value` | number | — | no | The count, for type count. Above max it shows as max followed by a plus sign, formatted for the locale. |
| `max` | number | `99` | no | The largest count shown in full, for type count. A larger value shows as "99+". |
| `showZero` | boolean | `false` | no | Whether a count of zero still shows, for type count. Hidden by default, since zero is usually nothing to act on. |
| `overlap` | enum: 'rectangular' \| 'circular' | `rectangular` | no | The host shape a count or dot sits over. circular pulls the badge in toward the curve so it stays on the host's edge, such as an avatar. |

## Specs

Generated from the plan that builds the design-file component: 50 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `surface` | frame | every member |
| `surface/label` | text | type=status |
| `surface/dotCell` | frame | style=inline |
| `surface/dotCell/statusDot` | frame | style=inline |
| `surface/count` | text | type=count |
| `surface/dot` | frame | type=dot |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `style`, `type`.

**size=medium, style=contained, type=status**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `surface` | `space.100` / `space.150` / `space.100` / `space.150` | `space.0` | — | — | — | — |

**size=small, style=contained, type=status**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `surface` | `space.025` / `space.100` / `space.025` / `space.100` | `space.0` | — | — | — | — |

**size=medium, style=inline, type=status**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `surface` | `space.0` | `space.100` | — | — | — | — |
| `surface/dotCell` | — | — | `type.body.md.line-box` | — | — | — |
| `surface/dotCell/statusDot` | — | — | `space.100` | `space.100` | — | — |

**size=small, style=inline, type=status**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `surface` | `space.0` | `space.075` | — | — | — | — |
| `surface/dotCell` | — | — | `type.body.sm.line-box` | — | — | — |
| `surface/dotCell/statusDot` | — | — | `space.100` | `space.100` | — | — |

**size=medium, style=contained, type=count**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `surface` | `space.025` / `space.075` / `space.025` / `space.075` | `space.0` | — | — | — | — |

**size=medium, style=contained, type=dot**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `surface` | `space.0` | `space.0` | — | — | — | — |
| `surface/dot` | — | — | `control.size.sm.dot` | `control.size.sm.dot` | — | — |

### Type

Keyed by `size`, `style`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium, style=contained | `surface/label` | `type.label.sm.emphasis` |
| size=medium, style=contained | `surface/count` | `type.label.sm.emphasis` |
| size=small, style=contained | `surface/label` | `type.caption.md.strong` |
| size=medium, style=inline | `surface/label` | `type.body.md.default` |
| size=small, style=inline | `surface/label` | `type.body.sm.default` |

### Color

Keyed by `type`, `style`, `emphasis`, `tone`.

**type=status, style=contained, emphasis=subtle, tone=neutral**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.secondary` | `color.border.tertiary` | — | — |
| `surface/label` | — | — | `color.text.primary` | — |

**type=status, style=contained, emphasis=subtle, tone=info**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.info-subtle` | `color.border.info` | — | — |
| `surface/label` | — | — | `color.text.info` | — |

**type=status, style=contained, emphasis=subtle, tone=success**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.success-subtle` | `color.border.success` | — | — |
| `surface/label` | — | — | `color.text.success` | — |

**type=status, style=contained, emphasis=subtle, tone=warning**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.warning-subtle` | `color.border.warning` | — | — |
| `surface/label` | — | — | `color.text.warning` | — |

**type=status, style=contained, emphasis=subtle, tone=danger**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.danger-subtle` | `color.border.danger` | — | — |
| `surface/label` | — | — | `color.text.danger` | — |

**type=status, style=contained, emphasis=bold, tone=neutral**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.inverse.foreground.tertiary` | — | — | — |
| `surface/label` | — | — | `color.inverse.text.primary` | — |

**type=status, style=contained, emphasis=bold, tone=info**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.info` | — | — | — |
| `surface/label` | — | — | `color.text.on-info` | — |

**type=status, style=contained, emphasis=bold, tone=success**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.success` | — | — | — |
| `surface/label` | — | — | `color.text.on-success` | — |

**type=status, style=contained, emphasis=bold, tone=warning**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.warning` | — | — | — |
| `surface/label` | — | — | `color.text.on-warning` | — |

**type=status, style=contained, emphasis=bold, tone=danger**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.danger` | — | — | — |
| `surface/label` | — | — | `color.text.on-danger` | — |

**type=status, style=contained, emphasis=surface, tone=neutral**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.background.primary` | — | — | — |
| `surface/label` | — | — | `color.text.primary` | — |

**type=status, style=contained, emphasis=surface, tone=info**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.background.primary` | — | — | — |
| `surface/label` | — | — | `color.text.info` | — |

**type=status, style=contained, emphasis=surface, tone=success**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.background.primary` | — | — | — |
| `surface/label` | — | — | `color.text.success` | — |

**type=status, style=contained, emphasis=surface, tone=warning**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.background.primary` | — | — | — |
| `surface/label` | — | — | `color.text.warning` | — |

**type=status, style=contained, emphasis=surface, tone=danger**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.background.primary` | — | — | — |
| `surface/label` | — | — | `color.text.danger` | — |

**type=status, style=inline, emphasis=subtle, tone=neutral**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface/dotCell/statusDot` | `color.icon.secondary` | — | — | — |
| `surface/label` | — | — | `color.text.primary` | — |

**type=status, style=inline, emphasis=subtle, tone=info**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface/dotCell/statusDot` | `color.icon.info` | — | — | — |
| `surface/label` | — | — | `color.text.primary` | — |

**type=status, style=inline, emphasis=subtle, tone=success**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface/dotCell/statusDot` | `color.icon.success` | — | — | — |
| `surface/label` | — | — | `color.text.primary` | — |

**type=status, style=inline, emphasis=subtle, tone=warning**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface/dotCell/statusDot` | `color.icon.warning` | — | — | — |
| `surface/label` | — | — | `color.text.primary` | — |

**type=status, style=inline, emphasis=subtle, tone=danger**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface/dotCell/statusDot` | `color.icon.danger` | — | — | — |
| `surface/label` | — | — | `color.text.primary` | — |

**type=count, style=contained, emphasis=bold, tone=neutral**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.inverse.foreground.tertiary` | — | — | — |
| `surface/count` | — | — | `color.inverse.text.primary` | — |

**type=count, style=contained, emphasis=bold, tone=info**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.info` | — | — | — |
| `surface/count` | — | — | `color.text.on-info` | — |

**type=count, style=contained, emphasis=bold, tone=success**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.success` | — | — | — |
| `surface/count` | — | — | `color.text.on-success` | — |

**type=count, style=contained, emphasis=bold, tone=warning**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.warning` | — | — | — |
| `surface/count` | — | — | `color.text.on-warning` | — |

**type=count, style=contained, emphasis=bold, tone=danger**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.danger` | — | — | — |
| `surface/count` | — | — | `color.text.on-danger` | — |

**type=dot, style=contained, emphasis=bold, tone=neutral**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.inverse.foreground.tertiary` | — | — | — |

**type=dot, style=contained, emphasis=bold, tone=info**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.info` | — | — | — |

**type=dot, style=contained, emphasis=bold, tone=success**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.success` | — | — | — |

**type=dot, style=contained, emphasis=bold, tone=warning**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.warning` | — | — | — |

**type=dot, style=contained, emphasis=bold, tone=danger**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `surface` | `color.foreground.danger` | — | — | — |

### Nesting and properties

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Status` |
| `value` | text | `3` |

---

Generated from the `badge` component definition.
