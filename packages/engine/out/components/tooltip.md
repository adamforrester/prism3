# Tooltip

> A short text label for the control under the pointer or focus. It never takes focus.

- **ID:** `tooltip`
- **Category:** overlay
- **Status:** draft
- **Also known as:** hint, infotip, info-tip

## Overview

A short line of plain text that names or describes a control. It shows when the pointer rests on the control or keyboard focus reaches it, and hides when both leave or the user presses Escape. It never takes focus and holds nothing interactive, and touch has no hover, so the information it shows must also be available another way. On an icon-only control it is the control's name; anywhere else it adds a description. Not a popover (anything interactive, or content opened by a press), not a toast (a status after an action), and not a field message (help or an error under a field).

- **Purpose:** Name or describe a control with a few words shown on hover and keyboard focus.
- **Use when:** An icon-only control needs a visible name, or a control needs one short fact that its label does not carry, and the same information is also reachable without hover.
- **Avoid when:** The content has a link, a button or anything to act on, or opens on a press (a popover); it reports the result of an action (a toast); it is help or an error for a field (a field message); or it is the only place the information lives.

## Anatomy

Shown on the default member: placement `top`.

1. **Container** — Holds the bubble and its arrow, the arrow on the side facing the control. It paints nothing.
2. **Bubble** — The inverse surface behind the text, with rounded corners and no shadow.
3. **Label** — The text. It wraps at the maximum width and never truncates.
4. **Top glyph** (optional) — The arrow under the bubble, pointing down at the control, in the bubble's color. Shown by default.
5. **Bottom glyph** (optional) — The arrow over the bubble, pointing up at the control, in the bubble's color. Shown by default.
6. **Start glyph** (optional) — The arrow at the bubble's end side, pointing at the control, in the bubble's color. Shown by default.
7. **End glyph** (optional) — The arrow at the bubble's start side, pointing at the control, in the bubble's color. Shown by default.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `placement` | `top`, `bottom`, `start`, `end` | once, when authored | The side of the control the tooltip prefers. It moves to the opposite side when there is no room. start and end follow the reading direction: start is the left in left-to-right text and the right in right-to-left text. |

## Usage guidelines

Use a Tooltip to name an icon-only control or to add a short description to a control, shown on hover and keyboard focus. Touch has no hover, so the tooltip never holds the only copy of what it says. Anything interactive, or content that opens on a press, is a Popover; a status after an action is a Toast; help under a field is a field message.

**In RTL.** The start and end glyphs flip to point the other way.

### Do

- Use label mode when an icon-only control has a tooltip
- Keep it to a few words of plain text
- Keep the words the same as the control's accessible name
- Use `aria-disabled="true"` on an unavailable control that has a tooltip

### Don't

- Put a link, a button or anything focusable in a tooltip. Use a popover.
- Put information only in a tooltip. Touch has no hover.
- Attach a tooltip to a natively disabled control. Keyboard focus cannot reach it.
- Use the title attribute instead
- Repeat a visible text label in a tooltip

## Accessibility

- **Keyboard:** Tab to the control shows the tooltip at once. Escape hides it and leaves focus on the control. Moving focus away hides it. The tooltip itself is never in the focus order.
- **Focus:** Focus stays on the control. The tooltip never takes focus and holds nothing focusable.
- **Screen readers:** `role="tooltip"`. It never takes focus. By default the control it belongs to points at it with `aria-describedby`; on an icon-only control the control points at it with `aria-labelledby` instead, and the tooltip is its name.

  role="tooltip" on the tooltip. aria-describedby on the control by default, or aria-labelledby on an icon-only control, which then carries no aria-label. The tooltip stays in the page while hidden, so the reference always resolves. On an unavailable control use aria-disabled="true", never the native disabled attribute. The text is translatable; start and end swap sides in right-to-left text.

### WCAG

- 1.4.13 Content on Hover or Focus (Escape dismisses it without moving focus, the pointer can move onto it, and it stays while it is hovered or focused)
- 1.4.3 Contrast (Minimum) (the text clears 4.5:1 on the inverse surface)
- 1.4.4 Resize Text (targets it: the text wraps at the maximum width rather than truncating)
- 2.1.1 Keyboard (keyboard focus shows it, the same as hover)
- 2.5.3 Label in Name (in label mode the tooltip is the control's name, so the visible words and the name match)
- 4.1.2 Name, Role, Value (in label mode the control takes its name from the tooltip)

### Motion

- **Enter:** A fade (motion.duration.fast, motion.easing-role.enter). Moving from one tooltip to the next soon after, it appears with no animation.
- **Exit:** A fade (motion.duration.instant, motion.easing-role.exit).
- **Reduced motion:** Under prefers-reduced-motion, the same fade, at motion.duration-reduced.fast both ways.

## Content guidelines

Short and plain: the name of the action or one fact about it. No punctuation at the end, no formatting, nothing to click.

- **Labels:** A few words in sentence case, with no period: "Add to favorites", "Copy link". On an icon-only control, name the action as a verb, never the icon's shape ("Close", not "X").

## Related components

- **Instead, consider:** `field-message`, `popover`
- **Often used with:** `icon-button`, `flush-icon-button`, `button`
- **Replaces:**
  - the `title` attribute
  - a hover-only label with no keyboard route
  - a tooltip on a natively disabled control

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The text, a few words in plain text with no links or buttons. It wraps at the maximum width and never truncates. |
| `placement` | enum: 'top' \| 'bottom' \| 'start' \| 'end' | `top` | no | The side of the control the tooltip prefers. It moves to the opposite side when there is no room. start and end follow the reading direction: start is the left in left-to-right text and the right in right-to-left text. |
| `align` | enum: 'start' \| 'center' \| 'end' | `center` | no | Where the tooltip lines up along its side of the control. The arrow stays pointed at the control's center. |
| `arrow` | boolean | `true` | no | Shows the arrow that points at the control. On by default. |
| `kind` | enum: 'description' \| 'label' | `description` | no | description adds a description to a control that already has a name. label makes the tooltip the control's name, for an icon-only control, so the name is announced once. |
| `delay` | number | — | no | How long the pointer rests on the control before the tooltip shows, in milliseconds. Keyboard focus shows it at once. |
| `closeDelay` | number | — | no | How long the tooltip stays after the pointer leaves, in milliseconds, so the pointer can move onto it. |
| `open` | boolean | — | no | Whether the tooltip shows, when the app controls it. Leave it unset and the tooltip shows and hides by itself. |
| `defaultOpen` | boolean | `false` | no | Whether the tooltip shows at first, when the app does not control it. |
| `onOpenChange` | function | — | no | Called with true when the tooltip shows and false when it hides, for any reason. |
| `disabled` | boolean | `false` | no | Stops the tooltip showing. The control itself is unaffected. |
| `children` | node | — | yes | The control the tooltip belongs to: one element that can take keyboard focus. |

## Specs

Generated from the plan that builds the design-file component: 4 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/bubble` | frame | every member |
| `container/bubble/label` | text | every member |
| `container/topGlyph` | glyph | placement=top |
| `container/bottomGlyph` | glyph | placement=bottom |
| `container/startGlyph` | glyph | placement=start |
| `container/endGlyph` | glyph | placement=end |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

**every member**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container/bubble` | `space.050` / `space.100` / `space.050` / `space.100` | — | — | — | — | radius `radius.md` |

### Type

Keyed by nothing: one row covers every member.

| Members | Part | Text style |
| --- | --- | --- |
| every member | `container/bubble/label` | `type.body.sm.default` |

### Color

Keyed by `placement`.

**placement=top**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/bubble` | `color.inverse.background.primary` | — | — | — |
| `container/bubble/label` | — | — | `color.inverse.text.primary` | — |
| `container/topGlyph` | — | — | — | `color.inverse.background.primary` |

**placement=bottom**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/bottomGlyph` | — | — | — | `color.inverse.background.primary` |
| `container/bubble` | `color.inverse.background.primary` | — | — | — |
| `container/bubble/label` | — | — | `color.inverse.text.primary` | — |

**placement=start**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/bubble` | `color.inverse.background.primary` | — | — | — |
| `container/bubble/label` | — | — | `color.inverse.text.primary` | — |
| `container/startGlyph` | — | — | — | `color.inverse.background.primary` |

**placement=end**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/endGlyph` | — | — | — | `color.inverse.background.primary` |
| `container/bubble` | `color.inverse.background.primary` | — | — | — |
| `container/bubble/label` | — | — | `color.inverse.text.primary` | — |

### Nesting and properties

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Tooltip text` |
| `arrow` | boolean | `true` |

---

Generated from the `tooltip` component definition.
