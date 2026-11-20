# ToggleButton

> A button that stays pressed, for a mode that persists, such as Pin or Show archived.

- **ID:** `toggle-button`
- **Category:** form
- **Status:** draft
- **Also known as:** pressable-button, selectable-button, toggle-btn
- **Builds on:** `button-neutral`

## Overview

A Button that stays pressed: an action or mode that persists between presses, such as Pin, Mute or a view filter that stays on. While selected it takes a tint and a 2px outline drawn inside the button, so the button keeps its size, and the label keeps its weight. Pressing it changes the selected state; the label never changes. Not a Button (fires once), not a Switch.Row (a system setting), not a Checkbox.Row (a form value submitted later), and not a SegmentedControl (one of a set). For an icon-only toggle, use ToggleIconButton.

- **Purpose:** Turn an action or mode on and off in place, with a visible label, as a button that stays pressed.
- **Use when:** A command or mode that persists between presses, such as Pin, Mute, Favorite or a view filter, on a toolbar or beside the content it affects.
- **Avoid when:** A one-time action → use Button.Neutral. A system setting → use Switch.Row. A form value submitted later → use Checkbox.Row. Exactly one of a set → use SegmentedControl. A filter value in a set of chips → use Tag. Icon-only with no visible text → use ToggleIconButton.

## Anatomy

Shown on the default member: selection `unselected`, appearance `outline`, size `medium`.

1. **Container** — The button body. Unselected, it is Button.Neutral at the same appearance; selected, it takes a tint and a 2px outline, drawn inside the box so the button does not grow.
2. **Leading visual** (optional) — An icon before the label.
3. **Label** — The label, at the same weight whether or not the toggle is selected, so the button keeps its width.
4. **Focus ring** — The shared focus ring, shown on keyboard focus; it sits outside the button and moves nothing in its layout.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `selection` | `unselected`, `selected` | at runtime | — |
| `appearance` | `outline`, `text` | at runtime | outline = a neutral border, for a toggle on its own; text = no border at rest, for a quiet toolbar. There is no filled appearance, so selected stays the strongest look. |
| `size` | `medium`, `small`, `large` | once, when authored | Control size, as on Button: drives height, padding and label type. |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `inactive`

## Usage guidelines

Use for an action or mode that stays on until pressed again, usually in a command surface: Pin, Mute, Favorite, a view filter that stays on. For a system setting use Switch.Row; for a form value submitted later use Checkbox.Row; for one choice out of a set use SegmentedControl.

**In RTL.** The layout mirrors: the start edge is on the right. An icon in the leading visual flips only if it points a direction, such as an arrow.

### Do

- Keep the label the same in both states and let `aria-pressed` carry the state
- Use appearance=outline for a toggle on its own, and appearance=text for a row of toggles in a quiet toolbar
- Group a row of independent toggles in a container with `role="group"` and an accessible label, each toggle its own tab stop
- Keep the selected look separate from the press: the tint and the 2px outline persist, and the press is Button's brief overlay step

### Don't

- Use it for a system setting such as notifications on or off — use Switch.Row
- Use a row of toggles where exactly one can be on — use SegmentedControl
- Flip the label between two words to show the state ("Mute" / "Unmute")
- Put `role="switch"` or `aria-checked` on a toggle button

## Accessibility

- **Keyboard:** Native `<button>`: Space and Enter both toggle. Each toggle is its own tab stop. (A Switch takes Space only.)
- **Focus:** Button's `:focus-visible` ring (`color.border.focus`), offset from the edge, never suppressed, and kept through inactive (`aria-disabled`, not native disabled).
- **Screen readers:** button (native `<button>` with `aria-pressed`; never `role="switch"` and never a checkbox)

  Set aria-pressed="true" or "false" on the button, never aria-checked, aria-selected or role="switch". Keep the accessible name the same in both states. A row of independent toggles goes in a container with role="group" and an accessible label. Localization: the label wraps rather than truncating, and under RTL the row mirrors through logical properties; only directional glyphs flip.

### WCAG

- 4.1.2 Name/Role/Value (the role is button, the label is the name, and aria-pressed carries the state)
- 1.4.1 Use of Color (selected is a tint and a 2px outline, not color alone)
- 1.4.3 Contrast (Minimum) (the neutral label on the tint, as on Tag)
- 1.4.11 Non-text Contrast (the 2px outline and the focus ring at 3:1)
- 2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed)
- 2.4.13 Focus Appearance (AAA, intent — the ring is offset from the edge)
- 2.5.3 Label in Name (an aria-label starts with the visible label text)
- 2.5.8 Target Size (Minimum) (24×24 — small is 36px tall, 28px at compact density)

### Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** The selected change (tint and outline) and the other state changes run on motion.duration.fast with motion.easing-role.default. The press is Button's subtle scale (0.98) on the same duration and curve, and it stays separate from the selected look. Under prefers-reduced-motion, resolve the scale to none and keep the color change, on motion.duration-reduced.fast, so the state stays perceivable.

## Content guidelines

A short verb or noun naming the action or mode, sentence case, constant across both states.

- **Labels:** A short verb or noun naming the action or mode ("Pin", "Mute", "Show archived"), sentence case, the same in both states — never "Pin" / "Unpin".

## Related components

- **Built from:** `focus-ring`
- **Instead, consider:** `button`, `button-neutral`, `switch-row`, `checkbox-row`, `segmented-control`, `tag`, `toggle-icon-button`
- **Often used with:** `icon`
- **Replaces:**
  - a Button hand-wired with an "active" class and no `aria-pressed`
  - `role="switch"` on a toolbar mode

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | node (label) | — | yes | Visible label naming the action or mode, such as "Pin" or "Show archived". It stays the same in both states: the selected state is carried by the pressed state, not by new words. |
| `selected` | boolean | `false` | no | Whether the toggle is on, in a controlled toggle. Rendered as aria-pressed. While selected it takes a tint and a 2px outline, so the state never rests on color alone. |
| `defaultSelected` | boolean | `false` | no | Whether an uncontrolled toggle starts on. |
| `onSelectedChange` | function | — | no | Called with the new value when the toggle is pressed. A controlled toggle without it never changes. |
| `appearance` | enum: 'outline' \| 'text' | `outline` | no | outline = a neutral border, for a toggle on its own; text = no border at rest, for a quiet toolbar. There is no filled appearance, so selected stays the strongest look. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Control size, as on Button: drives height, padding and label type. |
| `leadingVisual` | slot | — | no | An icon before the label. |
| `isInactive` | boolean | `false` | no | Focusable disabled, as on Button: visually muted, keeps its place in the tab order, and surfaces the reason on focus. |
| `disabled` | boolean | `false` | no | Native disabled, as on Button: reserved for a toggle that has no meaning in the current view. Removes it from the tab order. |
| `aria-label` | string | — | no | Extends the visible label with context it does not carry, as on Button. Start it with the visible text (WCAG 2.5.3 Label in Name), and keep it the same in both states. |

## Specs

Generated from the plan that builds the design-file component: 120 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/label` | text | every member |
| `container/leadingVisual` | swap | leading=true |
| `container/focusRing` | instance | state=focus-visible |

Code-only states, with no design-file member: `inactive`.

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `leading`, `selection`.

**size=medium, leading=false, selection=unselected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.200` | `space.100` | `size.md.height` | — | 104px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.hairline` |

**size=medium, leading=true, selection=unselected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.150` | `space.100` | `size.md.height` | — | 104px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.hairline` |
| `container/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=small, leading=false, selection=unselected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.200` / `space.075` / `space.200` | `space.100` | `size.sm.height` | — | 88px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.hairline` |

**size=small, leading=true, selection=unselected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.200` / `space.075` / `space.150` | `space.100` | `size.sm.height` | — | 88px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.hairline` |
| `container/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large, leading=false, selection=unselected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.300` / `space.100` / `space.300` | `space.150` | `size.lg.height` | — | 128px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.hairline` |

**size=large, leading=true, selection=unselected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.300` / `space.100` / `space.200` | `space.150` | `size.lg.height` | — | 128px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.hairline` |
| `container/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=medium, leading=false, selection=selected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.200` | `space.100` | `size.md.height` | — | 104px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.thick` |

**size=medium, leading=true, selection=selected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.150` | `space.100` | `size.md.height` | — | 104px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.thick` |
| `container/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=small, leading=false, selection=selected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.200` / `space.075` / `space.200` | `space.100` | `size.sm.height` | — | 88px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.thick` |

**size=small, leading=true, selection=selected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.200` / `space.075` / `space.150` | `space.100` | `size.sm.height` | — | 88px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.thick` |
| `container/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large, leading=false, selection=selected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.300` / `space.100` / `space.300` | `space.150` | `size.lg.height` | — | 128px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.thick` |

**size=large, leading=true, selection=selected**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.300` / `space.100` / `space.200` | `space.150` | `size.lg.height` | — | 128px (derived: height × multiplier, rounded up to 8px) | radius `radius.md`; stroke `border-width.thick` |
| `container/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/label` | `type.label.md.emphasis` |
| size=small | `container/label` | `type.label.sm.emphasis` |
| size=large | `container/label` | `type.label.lg.emphasis` |

### Color

Keyed by `selection`, `appearance`, `state`.

**selection=unselected, appearance=outline, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=unselected, appearance=outline, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | `color.interactive.neutral.border.hover` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |

**selection=unselected, appearance=outline, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.pressed` | `color.interactive.neutral.border.pressed` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |

**selection=unselected, appearance=outline, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=unselected, appearance=outline, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.disabled.icon` |

**selection=unselected, appearance=text, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=unselected, appearance=text, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |

**selection=unselected, appearance=text, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |

**selection=unselected, appearance=text, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=unselected, appearance=text, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.disabled.icon` |

**selection=selected, appearance=outline, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.rest` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=selected, appearance=outline, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.hover` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |

**selection=selected, appearance=outline, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.pressed` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |

**selection=selected, appearance=outline, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.rest` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=selected, appearance=outline, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.disabled.icon` |

**selection=selected, appearance=text, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.rest` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=selected, appearance=text, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.hover` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |

**selection=selected, appearance=text, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.pressed` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |

**selection=selected, appearance=text, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.indicator.rest` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**selection=selected, appearance=text, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.disabled.icon` |

### Nesting and properties

- `container/leadingVisual` is a swap slot, property `↳ swap leading icon`
- `container/focusRing` nests `focus-ring` at `surface=default`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Toggle` |
| `↳ swap leading icon` | instance swap | — |

---

Generated from the `toggle-button` component definition.
