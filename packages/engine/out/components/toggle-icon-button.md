# ToggleIconButton

> An icon-only button that stays pressed, such as Bold or Mute. Needs an accessible name.

- **ID:** `toggle-icon-button`
- **Category:** form
- **Status:** draft
- **Also known as:** toggle-icon-btn
- **Builds on:** `icon-button-neutral`

## Overview

An IconButton that stays pressed: an icon-only action or mode that persists between presses, such as Bold, Italic or Mute in a toolbar. While selected it takes a tint and a 2px outline drawn inside the square, so the button keeps its size. Because there is no visible label, an accessible name is required, and it stays the same in both states. For a toggle with a visible label, use ToggleButton.

- **Purpose:** Turn an action or mode on and off in place with an icon alone, as a button that stays pressed.
- **Use when:** An icon-only command or mode that persists between presses, such as Bold, Italic or Mute, usually in a toolbar.
- **Avoid when:** A visible label would fit and aid recognition → use ToggleButton. A one-time icon action → use IconButton.Neutral. A system setting → use Switch.Row. Exactly one of a set → use SegmentedControl. Never when you cannot supply an accessible name.

## Anatomy

Shown on the default member: selection `unselected`, appearance `outline`, size `medium`.

1. **Container** — The square body. Unselected, it is IconButton.Neutral at the same appearance; selected, it takes a tint and a 2px outline, drawn inside the square so it does not grow.
2. **Icon** — The one icon and the whole content, hidden from screen readers because the button carries the name.
3. **Focus ring** — The shared focus ring, shown on keyboard focus; it sits outside the button and moves nothing in its layout.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `selection` | `unselected`, `selected` | at runtime | — |
| `appearance` | `outline`, `ghost` | at runtime | outline = a neutral border, for a toggle on its own; ghost = no border at rest, for a row of toggles in a toolbar. There is no filled appearance, so selected stays the strongest look. |
| `size` | `medium`, `small`, `large` | once, when authored | Square control, as on IconButton: the height drives both dimensions. |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `inactive`

## Usage guidelines

Use for an icon-only action or mode that stays on until pressed again, usually in a toolbar: Bold, Italic, Underline, Mute, Pin. Always give it an accessible name; a tooltip can show it on hover and focus. With room for a label, use ToggleButton.

**In RTL.** The icon flips only if it points a direction, such as an arrow.

### Do

- Always give it an accessible name, and keep it the same in both states
- Use appearance=ghost for a row of toggles in a toolbar, and appearance=outline for one on its own
- Group a row of independent toggles in a container with `role="group"` and an accessible label, each toggle its own tab stop
- Use a recognizable icon; pair a novel one with a visible label instead (ToggleButton)

### Don't

- Ship it without an accessible name
- Swap the icon to show the state; the tint and the 2px outline show it
- Use a row of toggles where exactly one can be on — use SegmentedControl
- Put `role="switch"` or `aria-checked` on a toggle button

## Accessibility

- **Keyboard:** Native `<button>`: Space and Enter both toggle. Each toggle is its own tab stop. (A Switch takes Space only.)
- **Focus:** IconButton's `:focus-visible` ring, offset from the edge, never suppressed, and kept through inactive.
- **Screen readers:** button (native `<button>` with `aria-pressed`; never `role="switch"` and never a checkbox)

  aria-label is the accessible name (required), the same in both states. Set aria-pressed="true" or "false", never aria-checked, aria-selected or role="switch". A tooltip may show the name on hover and focus. A row of independent toggles goes in a container with role="group" and an accessible label. Under RTL, only a directional glyph flips.

### WCAG

- 4.1.2 Name/Role/Value (the required accessible name, and aria-pressed carries the state)
- 1.4.1 Use of Color (selected is a tint and a 2px outline, not color alone)
- 1.4.11 Non-text Contrast (the glyph, the 2px outline and the focus ring at 3:1)
- 2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed)
- 2.4.13 Focus Appearance (AAA, intent — the ring is offset from the edge)
- 2.5.3 Label in Name (a visible tooltip and the aria-label carry the same words)
- 1.4.13 Content on Hover or Focus (only where a tooltip is attached)
- 2.5.8 Target Size (Minimum) (24×24 — the small square is 36px, 28px at compact density)

### Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** The selected change (tint and outline) and the other state changes run on motion.duration.fast with motion.easing-role.default. The press is Button's subtle scale (0.98) on the same duration and curve, and it stays separate from the selected look. Under prefers-reduced-motion, resolve the scale to none and keep the color change, on motion.duration-reduced.fast, so the state stays perceivable.

## Content guidelines

The accessible name is a short verb or noun naming the action or mode, constant across both states. A tooltip, where one is attached, shows the same words.

- **Labels:** The accessible name is a short verb or noun naming the action or mode ("Bold", "Mute", "Pin"), the same in both states — never the glyph's shape.

## Related components

- **Built from:** `focus-ring`
- **Instead, consider:** `toggle-button`
- **Often used with:** `icon`, `icon-button`
- **Replaces:**
  - an IconButton hand-wired with an "active" class and no `aria-pressed`
  - a glyph that swaps to show the state

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `icon` | slot | — | yes | The single icon. Rendered aria-hidden: the button carries the name. |
| `aria-label` | string | — | yes | Required accessible name, a verb or noun naming the action or mode ("Bold", "Mute"). It stays the same in both states: the selected state is carried by the pressed state. |
| `selected` | boolean | `false` | no | Whether the toggle is on, in a controlled toggle. Rendered as aria-pressed. While selected it takes a tint and a 2px outline, so the state never rests on color alone. |
| `defaultSelected` | boolean | `false` | no | Whether an uncontrolled toggle starts on. |
| `onSelectedChange` | function | — | no | Called with the new value when the toggle is pressed. A controlled toggle without it never changes. |
| `appearance` | enum: 'outline' \| 'ghost' | `outline` | no | outline = a neutral border, for a toggle on its own; ghost = no border at rest, for a row of toggles in a toolbar. There is no filled appearance, so selected stays the strongest look. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Square control, as on IconButton: the height drives both dimensions. |
| `isInactive` | boolean | `false` | no | Focusable disabled, as on Button: visually muted, keeps its place in the tab order, and surfaces the reason on focus. |
| `disabled` | boolean | `false` | no | Native disabled, as on Button: reserved for a toggle that has no meaning in the current view. Removes it from the tab order. |

## Specs

Generated from the plan that builds the design-file component: 60 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/icon` | swap | every member |
| `container/focusRing` | instance | state=focus-visible |

Code-only states, with no design-file member: `inactive`.

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `selection`.

**size=medium, selection=unselected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | `size.md.height` | — | radius `radius.md`; stroke `border-width.hairline` |
| `container/icon` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=small, selection=unselected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | `size.sm.height` | — | radius `radius.md`; stroke `border-width.hairline` |
| `container/icon` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=large, selection=unselected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | `size.lg.height` | — | radius `radius.md`; stroke `border-width.hairline` |
| `container/icon` | — | — | `icon.size.lg` | `icon.size.lg` | — | — |

**size=medium, selection=selected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | `size.md.height` | — | radius `radius.md`; stroke `border-width.thick` |
| `container/icon` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=small, selection=selected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | `size.sm.height` | — | radius `radius.md`; stroke `border-width.thick` |
| `container/icon` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=large, selection=selected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | `size.lg.height` | — | radius `radius.md`; stroke `border-width.thick` |
| `container/icon` | — | — | `icon.size.lg` | `icon.size.lg` | — | — |

### Color

Keyed by `selection`, `appearance`, `state`.

**selection=unselected, appearance=outline, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=unselected, appearance=outline, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | `color.interactive.neutral.border.hover` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.hover` |

**selection=unselected, appearance=outline, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.pressed` | `color.interactive.neutral.border.pressed` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.pressed` |

**selection=unselected, appearance=outline, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=unselected, appearance=outline, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/icon` | — | — | — | `color.disabled.icon` |

**selection=unselected, appearance=ghost, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=unselected, appearance=ghost, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.hover` |

**selection=unselected, appearance=ghost, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.pressed` | — | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.pressed` |

**selection=unselected, appearance=ghost, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=unselected, appearance=ghost, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/icon` | — | — | — | `color.disabled.icon` |

**selection=selected, appearance=outline, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.rest` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=selected, appearance=outline, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.hover` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.hover` |

**selection=selected, appearance=outline, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.pressed` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.pressed` |

**selection=selected, appearance=outline, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.rest` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=selected, appearance=outline, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/icon` | — | — | — | `color.disabled.icon` |

**selection=selected, appearance=ghost, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.rest` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=selected, appearance=ghost, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.hover` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.hover` |

**selection=selected, appearance=ghost, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.pressed` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.pressed` |

**selection=selected, appearance=ghost, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.rest` | — | — |
| `container/icon` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=selected, appearance=ghost, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/icon` | — | — | — | `color.disabled.icon` |

### Nesting and properties

- `container/icon` is a swap slot, property `swap icon`
- `container/focusRing` nests `focus-ring` at `surface=default`

| Property | Type | Default |
| --- | --- | --- |
| `swap icon` | instance swap | — |

---

Generated from the `toggle-icon-button` component definition.
