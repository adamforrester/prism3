# Tag

> An interactive token a user toggles or removes. A static label is a badge.

A compact, interactive token of one of two types. A select tag toggles on and off, such as a filter; while selected it takes a tint, a 2px outline and, by default, a check mark after the label, and the label keeps its weight so nothing reflows. A dismissible tag carries a remove control, a × in a square slot at its trailing end, named "Remove" followed by the tag's label, such as an applied filter or a recipient in a field. Tags usually sit in a group that owns the selection model, arrow-key movement between tags and where focus goes after a removal. At rest a tag always shows an outline.

- **ID:** `tag`
- **Category:** foundations
- **Status:** draft
- **Also known as:** chip, filter-tag, filter-chip, input-tag, input-chip, removable-tag, dismissible-tag, selectable-tag, choice-chip, interaction-tag, checkable-tag, facet

## Usage

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

### Content guidelines

Keep the label to one word where possible. Use the words the data or the user supplies, such as a category, a name or a filter value, not system status words like "Failed" or "Processing"; those belong on a badge. A long label wraps onto a second line rather than being cut off.

### Copy patterns

- **Labels:** One word where possible; two or three short words only for a specific entity, such as a name, an email address or a category. Sentence case, or the casing the user typed, the same across the set. The remove control is "Remove" followed by the label.

## Choosing it

- **Purpose:** Render a small interactive token the user toggles or removes in place.
- **Use when:** Inline filters toggled on and off (select), applied filters the user can remove, or recipients or keywords entered into a field (dismissible), usually in a group.
- **Avoid when:** Nobody can act on it (use a badge), it runs an action (use a button), or it is a structured choice in a form submission (use a checkbox group or radio group).
- **Often used with:** `badge`, `icon`, `checkbox-group`, `radio-group`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The tag text. One word where possible, two or three for a specific entity such as a name or an email address. A long label wraps; it is never cut off. |
| `type` | enum: 'select' \| 'dismissible' | `select` | no | Which interaction the tag carries. select = toggles on and off, and shows its selected state. dismissible = carries a remove control and has no selected state. This is the component's own prop, not the HTML type attribute, and it is never passed to the element. |
| `selected` | boolean | `false` | no | Whether a select tag is on. A selected tag takes a tint and a 2px outline, and shows a check mark unless showCheck is off, so the state never rests on color alone. Ignored on a dismissible tag. |
| `showCheck` | boolean | `true` | no | Whether a selected select tag shows its check mark after the label. On by default. With it off, the tint and the 2px outline carry the selected state. |
| `onClick` | function | — | no | The toggle a select tag fires. Suppressed while disabled or read-only. |
| `onRemove` | function | — | no | Called when a dismissible tag's remove control is pressed, or when Delete or Backspace is pressed on the focused tag. |
| `leadingIcon` | slot | — | no | An icon or avatar before the label, for recognition at a glance. Decorative: the label carries the name. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Tag height, padding and label type, on the same rungs as Button. Medium clears 44px on comfortable and spacious density, and is 36px at compact. A tag is never narrower than it is tall. |
| `disabled` | boolean | `false` | no | Removes the tag from interaction and dims it. Don't disable every tag in a group; hide the group instead. |
| `readOnly` | boolean | `false` | no | Keeps full visual weight but accepts no interaction, such as a filter the user cannot change. Distinct from disabled, which dims. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `read-only`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `type` | `select`, `dismissible` | once, when authored |
| `selection` | `unselected`, `selected` | at runtime |
| `size` | `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** By type. Select: a \<button> with aria-pressed, or a role="checkbox" or listbox option when a group owns the selection (a radiogroup for single choice). Dismissible: the remove control is a real button named "Remove" followed by the label; in a group of dismissible tags it sits in a role="grid" row.
- **WCAG:**
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
- **Keyboard:** Select: Space or Enter toggles. In a single-choice group, arrows move and select, as radios do. Dismissible: Enter or Space on the remove control removes the tag; in a group, one tab stop enters the group, Left and Right arrows move between tags, and Delete or Backspace removes the focused tag.
- **Focus:** A focus ring around the whole tag on :focus-visible. In a group of dismissible tags, focus moves to the next tag after a removal, else the previous one, else the group or its input, and never to \<body>.
- **ARIA:** Name the remove control "Remove" followed by the label ("Remove Marketing"), or aria-label="Remove" plus aria-labelledby pointing at the label. Never a bare "Remove" or "×". A select tag exposes its state with aria-pressed, aria-checked or aria-selected, matching the role its group gives it. The check mark and a leading icon are aria-hidden. Every name is translatable, and the row mirrors under right-to-left layout.

## Motion

- **Enter:** A tag added to a group scales from 90% to 100% as it fades in. On selection, the tint and the outline crossfade and the check mark scales in.
- **Exit:** A removed tag fades out first, then its width and margin collapse, so the tags after it slide into the space.
- **Reduced motion:** Under prefers-reduced-motion, scale, slide and collapse are instant and only the opacity change remains, since the state change is the information.

## Composition

- **Composes with:** `focus-ring`
- **Alternative to:** `badge`, `button`, `checkbox-group`, `radio-group`
- **Planned:** `tag-group`, `combobox`, `toggle-button`, `avatar`, `popover`
- **Replaces:**
  - a removable token list built as a listbox
  - a clickable div styled as a pill
  - a bare × glyph with no accessible name

---

Generated from the `tag` component definition.
