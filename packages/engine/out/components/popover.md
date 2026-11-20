# Popover

> A panel beside the control that opened it, for detail or a short task. The page stays usable.

- **ID:** `popover`
- **Category:** overlay
- **Status:** draft
- **Also known as:** popup, overlay, anchored-overlay, floating-panel, flyout

## Overview

A non-modal panel anchored to the button that opened it. It holds content the user reaches for on purpose and that belongs next to that control: a few details, a short form, a set of links, or an explanation behind an info button. It opens on a press, sits below its trigger by default, and moves to stay on screen. The page stays usable while it is open, and a press outside, Escape or moving focus away closes it. A header can hold a title and the close button, the body holds the content, and an optional footer holds actions. Not a dialog (it does not block the page), not a tooltip (it opens on a press and can hold controls), and not a menu (a menu is a list of actions).

- **Purpose:** Show extra detail or a short task beside the control that opened it, without blocking the page.
- **Use when:** The user presses a button to see a few details, an explanation, a set of links or a short form that belongs next to that button, and the page should stay usable while it is open.
- **Avoid when:** The user must decide or finish before going on (a dialog), the content is a hint shown on hover (a tooltip), the content is a list of actions (a menu), or the content can sit in the page (an accordion).

## Anatomy

Shown on the default member: placement `bottom`.

1. **Panel** — The panel: the raised surface, its edge, its shadow and its corners. It pads all four sides.
2. **Header** — The header: the title, then the close button at the end edge.
3. **Title box** — Holds the title, filling the header beside the close button.
4. **Title** (optional) — The title: the popover's accessible name when it is shown. It wraps rather than truncating.
5. **Close** (optional) — The close button: a FlushIconButton.Neutral, flush, small, labeled "Close", always showing the close icon. Shown by default.
6. **Body** — The body: a slot that holds whatever the popover needs, and the only part that scrolls.
7. **Placeholder** — Placeholder content. Replace it with the text or components the popover holds.
8. **Footer** (optional) — The footer: a Button group, inline, at the end edge. Off by default.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `placement` | `bottom` | once, when authored | The side of the trigger it opens on. start and end follow the writing direction. When there is no room on that side it moves to the opposite one. |

## Usage guidelines

Use a Popover for content the user asks for that belongs next to the control that opened it: a few details, a short form such as a filter or a date, a set of links, or the explanation behind an info button. It opens on a press and leaves the page usable. For a decision the user must make before going on, use a Dialog; for a hint on hover, a tooltip; for a list of actions, a Menu.

**In RTL.** The layout mirrors: the start edge is on the right.

### Do

- Open it from a button, on a press
- Keep it short: a few lines, a few controls
- Give it a title, or a label when it has none
- Leave focus on the trigger when it only shows information
- Return focus to the trigger when Escape closes it

### Don't

- Open a popover on hover. Use a tooltip for a hint.
- Put a long form or a task the user must finish in it. Use a Dialog.
- Use it as a list of actions. Use a Menu.
- Open a popover from a popover

## Accessibility

- **Keyboard:** Enter or Space on the trigger opens it. Tab and Shift+Tab move through the controls inside and out of it, and leaving closes it. Escape closes it and returns focus to the trigger.
- **Focus:** Moves into the popover on open only when it holds controls: to the chosen control or the first one. A popover that only shows information leaves focus on its trigger. Escape returns focus to the trigger.
- **Screen readers:** `role="dialog"` with no `aria-modal`, so the page stays usable. The trigger carries `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.

  aria-labelledby pointing at the title, or aria-label when there is no title. On the trigger: aria-haspopup="dialog", aria-expanded, and aria-controls pointing at the popover. The close button's accessible name is "Close".

### WCAG

- 1.3.1 Info and Relationships (the title names the popover through aria-labelledby)
- 1.4.10 Reflow (the popover is never wider than the viewport less its margins)
- 1.4.13 Content on Hover or Focus (it opens on a press, stays until dismissed, and Escape closes it)
- 2.1.1 Keyboard (the trigger, every control inside and the close button work from the keyboard)
- 2.1.2 No Keyboard Trap (Tab moves through and out, and Escape closes it)
- 2.4.3 Focus Order (focus moves in only for interactive content, and returns to the trigger on Escape)
- 2.4.7 Focus Visible (every control inside shows the shared focus ring)
- 2.4.11 Focus Not Obscured (only the body scrolls, so a focused control stays in view)
- 4.1.2 Name, Role, Value (the trigger states its popup and whether it is expanded)

### Motion

- **Enter:** Fades in and scales up from a little under full size, from the trigger's side (motion.duration.fast, motion.easing-role.enter). The origin follows the side it opens on.
- **Exit:** Fades out (motion.duration.instant, motion.easing-role.exit), quicker than it opened.
- **Reduced motion:** Under prefers-reduced-motion it fades only, with no scale, on motion.duration-reduced.fast to open and to close. A fade is not movement, and it keeps the cue that a layer opened or closed.

## Content guidelines

Titles are short and in sentence case. Body text says what the user needs and no more. Buttons are named by what they do.

- **Labels:** A title, when there is one, names what the popover holds in a few words ("Shipping details"), in sentence case. The trigger says what it opens.

## Related components

- **Built from:** `flush-icon-button-neutral`, `button-group`
- **Instead, consider:** `dialog`
- **Often used with:** `button`, `button-neutral`, `icon-button`, `icon-button-neutral`, `link`, `text-field`, `select`, `checkbox-group`
- **Replaces:**
  - an absolutely positioned div with a hand-written click-outside handler
  - a dialog used for a few lines of detail

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `open` | boolean | `false` | no | Whether the popover is showing. Leave it unset and use defaultOpen for a popover that manages its own state. |
| `defaultOpen` | boolean | `false` | no | Whether the popover starts open, when open is not set. |
| `onOpenChange` | function | — | no | Called with true when the trigger opens the popover, and with false on every way it closes: the close button, Escape, a press outside, or focus moving out of it. |
| `placement` | enum: 'top' \| 'bottom' \| 'start' \| 'end' | `bottom` | no | The side of the trigger it opens on. start and end follow the writing direction. When there is no room on that side it moves to the opposite one. |
| `align` | enum: 'start' \| 'center' \| 'end' | `start` | no | Where it lines up along that side: with the start edge of the trigger, its center, or its end edge. It shifts along the side to stay on screen. |
| `title` | string | — | no | A short heading that names the popover. When set it is the accessible name; without one, give the popover a label. |
| `showClose` | boolean | `true` | no | Whether the header shows the close button. Escape and a press outside close it either way. |
| `children` | node | — | yes | The body content: text, links or a few controls. The body scrolls when the screen is too short for it. |
| `footer` | slot of `button` or `button-neutral` or `button-destructive`, 1 to 2 | — | no | Actions at the bottom of the panel, one or two buttons laid out by a Button group. Leave it off for a popover that only shows information. |
| `initialFocus` | node | — | no | The control that takes focus when the popover opens, for a popover that holds controls. Unset, the first control does. A popover with no controls leaves focus on its trigger. |
| `arrow` | boolean | `false` | no | Whether a small arrow points at the trigger. Off by default; turn it on where the link to the trigger is unclear. |

## Specs

Generated from the plan that builds the design-file component: 1 member. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `panel` | frame | every member |
| `panel/header` | frame | every member |
| `panel/header/titleBox` | frame | every member |
| `panel/header/titleBox/title` | text | every member |
| `panel/header/close` | instance | every member |
| `panel/body` | slot | every member |
| `panel/body/placeholder` | text | every member |
| `panel/footer` | instance | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

**every member**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `panel` | `space.200` | `space.150` | — | — | 240px (literal) | build width 320px (literal); radius `radius.lg`; stroke `border-width.hairline` |
| `panel/header` | — | `space.150` | — | — | — | — |

### Type

Keyed by nothing: one row covers every member.

| Members | Part | Text style |
| --- | --- | --- |
| every member | `panel/header/titleBox/title` | `type.label.md.emphasis` |
| every member | `panel/body/placeholder` | `type.body.sm.default` |

### Color

Keyed by `placement`.

**placement=bottom**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `panel` | `color.foreground.raised` | `color.border.secondary` | — | — |
| `panel/header/titleBox/title` | — | — | `color.text.primary` | — |
| `panel/body/placeholder` | — | — | `color.text.primary` | — |

### Nesting and properties

- `panel/header/close` nests `flush-icon-button-neutral` at `shape=flush, size=small, surface=default, state=rest`
- `panel/body` is a slot
- `panel/footer` nests `button-group` at `layout=inline`

| Property | Type | Default |
| --- | --- | --- |
| `title text` | text | `Popover title` |
| `title` | boolean | `true` |
| `close` | boolean | `true` |
| `footer` | boolean | `false` |
| `body` | slot | — |

---

Generated from the `popover` component definition.
