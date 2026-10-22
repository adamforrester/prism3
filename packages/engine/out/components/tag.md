# Tag

> An interactive token a user toggles or removes. A static label is a badge.

- **ID:** `tag`
- **Category:** foundations
- **Status:** draft
- **Also known as:** chip, filter-tag, filter-chip, input-tag, input-chip, removable-tag, dismissible-tag, selectable-tag, choice-chip, interaction-tag, checkable-tag, facet

## Overview

A compact, interactive token of one of two types. A select tag toggles on and off, such as a filter; while selected it takes a tint, a 2px outline and, by default, a check mark after the label. The label keeps its weight, so its own width does not change; the check mark, when shown, adds its width and one gap. A dismissible tag carries a remove control, a × in a square slot at its trailing end, named "Remove" followed by the tag's label, such as an applied filter or a recipient in a field. Tags usually sit in a group that owns the selection model, arrow-key movement between tags and where focus goes after a removal. At rest a tag always shows an outline.

- **Purpose:** Render a small interactive token the user toggles or removes in place.
- **Use when:** Inline filters toggled on and off (select), applied filters the user can remove, or recipients or keywords entered into a field (dismissible), usually in a group.
- **Avoid when:** Nobody can act on it (use a badge), it runs an action (use a button), or it is a structured choice in a form submission (use a checkbox group or radio group).

## Anatomy

Shown on the default member: type `select`, selection `unselected`, size `medium`.

1. **Container** — The tag body, a pill of fixed height that hugs its content and is never narrower than 1.5 times its height, rounded to the nearest 8px; when that minimum applies, the content is centered. Unselected, it is a 1px outline with no fill; selected, it takes a tint and a 2px outline, drawn inside the pill so the box does not grow.
2. **Content** — The row inside the pill: the optional leading icon, then the label and its check mark. It is inset by the tag's padding on both sides, except before the × slot of a dismissible tag, where the label runs straight to the slot. On a dismissible tag its gap is 4px less than the icon-to-label distance, since the label row adds a 4px inset of its own.
3. **Label check** — The label and, on a selected select tag, the check mark after it, with a gap tighter than the one between the leading icon and the label. On a dismissible tag it is inset 4px at its leading edge, at every density, so the label sits 4px further in from the icon or the tag's edge.
4. **Leading visual** (optional) — An optional icon or avatar before the label. Decorative: the label carries the name.
5. **Label**
6. **Check glyph** (optional) — The selected indicator, a check mark after the label. It exists only on a selected select tag and is on by default; the check icon switch hides it, leaving the tint and the 2px outline.
7. **Dismiss** — The remove slot of a dismissible tag: a square as tall as the tag, at its trailing end, holding the × glyph.
8. **Dismiss glyph** — The × of a dismissible tag, a plain glyph centered in the remove slot, in the tag's icon ink.
9. **Focus ring** — The shared focus ring, around the whole tag while it has keyboard focus.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `type` | `select`, `dismissible` | once, when authored | Which interaction the tag carries. select = toggles on and off, and shows its selected state. dismissible = carries a remove control and has no selected state. This is the component's own prop, not the HTML type attribute, and it is never passed to the element. |
| `selection` | `unselected`, `selected` | at runtime | — |
| `size` | `medium`, `small`, `large` | once, when authored | Tag height, padding and label type. The height is Button's: medium clears 44px on comfortable and spacious density, and is 36px at compact. A tag is never narrower than 1.5 times its height, rounded to the nearest 8px (64px for a medium tag on comfortable density). |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `read-only`

## Usage guidelines

Use a tag for something a user acts on in place. Use a select tag for a lightweight filter or choice the user toggles; use a dismissible tag for an applied filter they can remove, or a recipient or keyword entered into a field. Put tags in a group with at least 8px between them, and let the group own selection, arrow-key movement and focus after removal. If nobody acts on it, it is a badge; if it runs an action, it is a button.

### Do

- Name the remove control "Remove" followed by the label
- Move focus to the next tag after a removal, else the previous one, else the group
- Keep the check mark on a selected tag unless the tint and outline already read clearly in context
- Keep at least 8px between tags in a group
- Let a long label wrap, so the full text stays visible

### Don't

- Use a tag for a status nobody can act on. That is a badge.
- Use a tag to run an action. That is a button.
- Use tags for a long list of choices in a form. That is a checkbox group or radio group.
- Put a dismissible tag list in a listbox. A listbox option cannot contain the remove control.
- Truncate a label with an ellipsis. A title attribute does not make the full text reachable by keyboard, touch or screen reader.
- Disable every tag in a group. Hide the group instead.

## Accessibility

- **Keyboard:** Select: Space or Enter toggles. In a single-choice group, arrows move and select, as radios do. Dismissible: Enter or Space on the remove control removes the tag; in a group, one tab stop enters the group, Left and Right arrows move between tags, and Delete or Backspace removes the focused tag.
- **Focus:** A focus ring around the whole tag on :focus-visible. In a group of dismissible tags, focus moves to the next tag after a removal, else the previous one, else the group or its input, and never to \<body>.
- **Screen readers:** By type. Select: a \<button> with aria-pressed, or a role="checkbox" or listbox option when a group owns the selection (a radiogroup for single choice). Dismissible: the remove control is a real button named "Remove" followed by the label; in a group of dismissible tags it sits in a role="grid" row.

  Name the remove control "Remove" followed by the label ("Remove Marketing"), or aria-label="Remove" plus aria-labelledby pointing at the label. Never a bare "Remove" or "×". A select tag exposes its state with aria-pressed, aria-checked or aria-selected, matching the role its group gives it. The check mark and a leading icon are aria-hidden. Every name is translatable, and the row mirrors under right-to-left layout.

### WCAG

- 1.4.1 Use of Color (a selected tag adds a 2px outline and, by default, a check mark to its tint, never color alone)
- 1.4.3 Contrast (the label ink clears 4.5:1 on the tag at rest in every mode, on the page unselected and on the tint selected)
- 1.4.11 Non-text Contrast (the unselected outline and the selected 2px outline clear 3:1 against the page; the check mark clears 3:1 on the tint and the × clears 3:1 on its ground)
- 1.4.4 Resize Text / 1.4.10 Reflow (a long label wraps rather than truncating, so the full text stays visible at 200% zoom)
- 2.1.1 Keyboard (every tag can be toggled or removed from the keyboard)
- 2.4.3 Focus Order (after a removal, focus moves to the next tag, the previous one or the group, never to the top of the page)
- 2.4.7 Focus Visible (a focus ring around the tag on keyboard focus)
- 2.5.8 Target Size (Minimum) (24×24 — a small tag and its × slot are 36px on comfortable density and 28px at compact)
- 2.5.5 Target Size (Enhanced) (44×44, as intent — a medium tag and its × slot clear 44px on comfortable and spacious density and miss it at compact (36px); a small tag reaches 44 only at spacious density, and elsewhere through a code-side hit area)
- 1.1.1 Non-text Content / 4.1.2 Name, Role, Value (the remove control is named "Remove" followed by the label, and a select tag exposes its state)

### Motion

- **Enter:** A tag added to a group scales from 90% to 100% as it fades in. On selection, the tint and the outline crossfade and the check mark scales in.
- **Exit:** A removed tag fades out first, then its width and margin collapse, so the tags after it slide into the space.
- **Reduced motion:** Under prefers-reduced-motion, scale, slide and collapse are instant and only the opacity change remains, since the state change is the information.

## Content guidelines

Keep the label to one word where possible. Use the words the data or the user supplies, such as a category, a name or a filter value, not system status words like "Failed" or "Processing"; those belong on a badge. A long label wraps onto a second line rather than being cut off.

- **Labels:** One word where possible; two or three short words only for a specific entity, such as a name, an email address or a category. Sentence case, or the casing the user typed, the same across the set. The remove control is "Remove" followed by the label.

## Related components

- **Built from:** `focus-ring`
- **Instead, consider:** `badge`, `button`, `checkbox-group`, `radio-group`
- **Often used with:** `badge`, `icon`, `checkbox-group`, `radio-group`
- **Replaces:**
  - a removable token list built as a listbox
  - a clickable div styled as a pill
  - a bare × glyph with no accessible name

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The tag text. One word where possible, two or three for a specific entity such as a name or an email address. A long label wraps; it is never cut off. |
| `type` | enum: 'select' \| 'dismissible' | `select` | no | Which interaction the tag carries. select = toggles on and off, and shows its selected state. dismissible = carries a remove control and has no selected state. This is the component's own prop, not the HTML type attribute, and it is never passed to the element. |
| `selected` | boolean | `false` | no | Whether a select tag is on. A selected tag takes a tint and a 2px outline, and shows a check mark unless showCheck is off, so the state never rests on color alone. Ignored on a dismissible tag. |
| `showCheck` | boolean | `true` | no | Whether a selected select tag shows its check mark after the label. On by default. With it off, the tint and the 2px outline carry the selected state. |
| `onClick` | function | — | no | The toggle a select tag fires. Suppressed while disabled or read-only. |
| `onRemove` | function | — | no | Called when a dismissible tag's remove control is pressed, or when Delete or Backspace is pressed on the focused tag. |
| `leadingIcon` | slot | — | no | An icon or avatar before the label, for recognition at a glance. Decorative: the label carries the name. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Tag height, padding and label type. The height is Button's: medium clears 44px on comfortable and spacious density, and is 36px at compact. A tag is never narrower than 1.5 times its height, rounded to the nearest 8px (64px for a medium tag on comfortable density). |
| `disabled` | boolean | `false` | no | Removes the tag from interaction and dims it. Don't disable every tag in a group; hide the group instead. |
| `readOnly` | boolean | `false` | no | Keeps full visual weight but accepts no interaction, such as a filter the user cannot change. Distinct from disabled, which dims. |

## Specs

Generated from the plan that builds the design-file component: 45 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/content` | frame | every member |
| `container/content/leadingVisual` | swap | every member |
| `container/content/labelCheck` | frame | every member |
| `container/content/labelCheck/label` | text | every member |
| `container/focusRing` | instance | state=focus-visible |
| `container/content/labelCheck/checkGlyph` | instance | selection=selected |
| `container/dismiss` | frame | type=dismissible |
| `container/dismiss/dismissGlyph` | instance | type=dismissible |

Code-only states, with no design-file member: `read-only`.

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `type`.

**size=medium, type=select**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 64px (derived: height × 1.5) | — |
| `container/content` | `space.0` / `space.150` / `space.0` / `space.150` | `space.100` | — | — | — | — |
| `container/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/content/labelCheck` | `space.0` | `space.075` | — | — | — | — |
| `container/content/labelCheck/checkGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=small, type=select**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | 56px (derived: height × 1.5) | — |
| `container/content` | `space.0` / `space.100` / `space.0` / `space.100` | `space.075` | — | — | — | — |
| `container/content/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/content/labelCheck` | `space.0` | `space.050` | — | — | — | — |
| `container/content/labelCheck/checkGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large, type=select**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | — | 88px (derived: height × 1.5) | — |
| `container/content` | `space.0` / `space.200` / `space.0` / `space.200` | `space.150` | — | — | — | — |
| `container/content/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/content/labelCheck` | `space.0` | `space.100` | — | — | — | — |
| `container/content/labelCheck/checkGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=medium, type=dismissible**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 64px (derived: height × 1.5) | — |
| `container/content` | `space.0` / `space.0` / `space.0` / `space.150` | `space.050` | — | — | — | — |
| `container/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/content/labelCheck` | `space.0` / `space.0` / `space.0` / `space.050` | `space.075` | — | — | — | — |
| `container/dismiss` | — | — | `size.md.height` | `size.md.height` | — | — |
| `container/dismiss/dismissGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=small, type=dismissible**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | 56px (derived: height × 1.5) | — |
| `container/content` | `space.0` / `space.0` / `space.0` / `space.100` | `space.025` | — | — | — | — |
| `container/content/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/content/labelCheck` | `space.0` / `space.0` / `space.0` / `space.050` | `space.050` | — | — | — | — |
| `container/dismiss` | — | — | `size.sm.height` | `size.sm.height` | — | — |
| `container/dismiss/dismissGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large, type=dismissible**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | — | 88px (derived: height × 1.5) | — |
| `container/content` | `space.0` / `space.0` / `space.0` / `space.200` | `space.050` | — | — | — | — |
| `container/content/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/content/labelCheck` | `space.0` / `space.0` / `space.0` / `space.050` | `space.100` | — | — | — | — |
| `container/dismiss` | — | — | `size.lg.height` | `size.lg.height` | — | — |
| `container/dismiss/dismissGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/content/labelCheck/label` | `type.label.md.emphasis` |
| size=small | `container/content/labelCheck/label` | `type.label.sm.emphasis` |
| size=large | `container/content/labelCheck/label` | `type.label.lg.emphasis` |

### Color

Keyed by `type`, `selection`, `state`.

**type=select, selection=unselected, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.rest` | — |

**type=select, selection=unselected, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | `color.interactive.neutral.border.hover` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.hover` | — |

**type=select, selection=unselected, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.pressed` | `color.interactive.neutral.border.pressed` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.pressed` | — |

**type=select, selection=unselected, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.rest` | — |

**type=select, selection=unselected, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/content/labelCheck/label` | — | — | `color.disabled.text` | — |

**type=select, selection=selected, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.border.rest` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/content/labelCheck/checkGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=select, selection=selected, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.border.hover` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/content/labelCheck/checkGlyph` | — | — | — | `color.interactive.neutral.icon.hover` |

**type=select, selection=selected, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.border.pressed` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/content/labelCheck/checkGlyph` | — | — | — | `color.interactive.neutral.icon.pressed` |

**type=select, selection=selected, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.primary.subtle-fill.selected` | `color.interactive.primary.border.rest` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/content/labelCheck/checkGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=select, selection=selected, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/content/labelCheck/label` | — | — | `color.disabled.text` | — |
| `container/content/labelCheck/checkGlyph` | — | — | — | `color.disabled.icon` |

**type=dismissible, selection=unselected, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/dismiss/dismissGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=dismissible, selection=unselected, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | `color.interactive.neutral.border.hover` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/dismiss/dismissGlyph` | — | — | — | `color.interactive.neutral.icon.hover` |

**type=dismissible, selection=unselected, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.pressed` | `color.interactive.neutral.border.pressed` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/dismiss/dismissGlyph` | — | — | — | `color.interactive.neutral.icon.pressed` |

**type=dismissible, selection=unselected, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/content/labelCheck/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/dismiss/dismissGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=dismissible, selection=unselected, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/content/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/content/labelCheck/label` | — | — | `color.disabled.text` | — |
| `container/dismiss/dismissGlyph` | — | — | — | `color.disabled.icon` |

### Nesting and properties

- `container/content/leadingVisual` is a swap slot, property `↳ swap leading icon`, shown by `leading icon`
- `container/focusRing` nests `focus-ring` at `surface=default`
- `container/content/labelCheck/checkGlyph` nests `icon/check`
- `container/dismiss/dismissGlyph` nests `icon/close`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Tag` |
| `leading icon` | boolean | `false` |
| `↳ swap leading icon` | instance swap | — |
| `check icon` | boolean | `true` |

---

Generated from the `tag` component definition.
