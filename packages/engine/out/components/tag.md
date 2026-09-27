# Tag

> An interactive token a user clicks, toggles or removes. A static label is a badge.

A compact, interactive token in one of three interactions. A clickable tag runs an action in place, such as a suggested reply. A selectable tag toggles on and off, such as a filter, and shows a check mark while selected. A removable tag carries its own remove button, named "Remove" followed by the tag's label, such as an applied filter or a recipient in a field. Tags usually sit in a group that owns the selection model, arrow-key movement between tags and where focus goes after a removal. At rest a tag always shows an outline or an interactive fill, so it never reads as a static badge.

- **ID:** `tag`
- **Category:** foundations
- **Status:** draft
- **Also known as:** chip, filter-tag, filter-chip, input-tag, input-chip, removable-tag, selectable-tag, choice-chip, action-chip, interaction-tag, checkable-tag, facet

## Usage

Use a tag for something a user acts on in place: an applied filter they can remove, a lightweight filter they toggle, a recipient or keyword entered into a field, or a suggested action inline with content. Set interaction to match: clickable, selectable or removable. Put tags in a group with at least 8px between them, and let the group own selection, arrow-key movement and focus after removal. If nobody acts on it, it is a badge.

### Do

- Name the remove button "Remove" followed by the label
- Move focus to the next tag after a removal, else the previous one, else the group
- Show a check mark on a selected tag, so selection is not color alone
- Keep at least 8px between tags in a group
- Truncate a long label with an ellipsis and show the full text on hover and focus

### Don't

- Use a tag for a status nobody can act on. That is a badge.
- Use a tag for a page's main action. That is a button.
- Use tags for a long list of choices in a form. That is a checkbox group or radio group.
- Put a removable tag list in a listbox. A listbox option cannot contain the remove button.
- Disable every tag in a group. Hide the group instead.

### Content guidelines

Keep the label to one word where possible. Use the words the data or the user supplies, such as a category, a name or a filter value, not system status words like "Failed" or "Processing"; those belong on a badge. Truncate past the maximum width and always show the full text on hover and focus.

### Copy patterns

- **Labels:** One word where possible; two or three short words only for a specific entity, such as a name, an email address or a category. Sentence case, or the casing the user typed, the same across the set. The remove button is "Remove" followed by the label.

## Choosing it

- **Purpose:** Render a small interactive token the user clicks, toggles or removes in place.
- **Use when:** Applied filters the user can remove, inline filters toggled on and off, recipients or keywords entered into a field, or contextual actions inline with content, usually in a group.
- **Avoid when:** Nobody can act on it (use a badge), it is the page's main action (use a button), or it is a structured choice in a form submission (use a checkbox group or radio group).
- **Often used with:** `badge`, `icon`, `checkbox-group`, `radio-group`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The tag text. One word where possible, two or three for a specific entity such as a name or an email address. |
| `interaction` | enum: 'clickable' \| 'selectable' \| 'removable' | `clickable` | no | What the user can do to the tag. clickable = runs an action, as a button. selectable = toggles on and off, and shows a check mark while selected. removable = carries a remove button with its own accessible name. Pick it deliberately: each interaction takes a different role and keyboard model. |
| `selected` | boolean | `false` | no | Whether a selectable tag is on. A selected tag is filled and shows a check mark, so the state never rests on color alone. |
| `onClick` | function | — | no | The action a clickable tag runs, or the toggle a selectable tag fires. Suppressed while disabled or read-only. |
| `onRemove` | function | — | no | Called when a removable tag's remove button is pressed, or when Delete or Backspace is pressed on the focused tag. Its click does not also fire onClick. |
| `leadingIcon` | slot | — | no | An icon or avatar before the label, for recognition at a glance. Decorative: the label carries the name. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Tag height, padding and label type, on the same rungs as Button. Medium clears 44px on comfortable and spacious density, and is 36px at compact. |
| `disabled` | boolean | `false` | no | Removes the tag from interaction and dims it. To disable every tag in a group, hide the group instead. |
| `readOnly` | boolean | `false` | no | Keeps full visual weight but accepts no interaction, such as a filter the user cannot change. Distinct from disabled, which dims. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `read-only`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `selection` | `unselected`, `selected` | at runtime |
| `size` | `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** By interaction. Clickable: a native \<button>. Selectable: a \<button> with aria-pressed, or a role="checkbox" or listbox option when a group owns the selection (a radiogroup for single choice). Removable: a row in a role="grid" group, with the label in one gridcell and the remove button in another.
- **WCAG:**
  - 1.4.1 Use of Color (a selected tag shows a check mark and a fill change, never color alone)
  - 1.4.3 Contrast (the label ink clears 4.5:1 on the tag at rest in every mode, selected and unselected)
  - 1.4.11 Non-text Contrast (the unselected outline clears 3:1 against the page)
  - 2.1.1 Keyboard (every tag can be activated, toggled or removed from the keyboard)
  - 2.4.3 Focus Order (after a removal, focus moves to the next tag, the previous one or the group, never to the top of the page)
  - 2.4.7 Focus Visible (a focus ring around the tag on keyboard focus)
  - 2.5.8 Target Size (Minimum) (24×24 — the remove button is a 36px square and a small tag is 36px tall, both 28px at compact density)
  - 2.5.5 Target Size (Enhanced) (44×44, as intent — a medium tag clears 44px on comfortable and spacious density and misses it at compact (36px); a small tag and the remove button reach 44 only at spacious density, and elsewhere through a code-side hit area)
  - 1.1.1 Non-text Content / 4.1.2 Name, Role, Value (the remove button is named "Remove" followed by the label, and a selectable tag exposes its state)
- **Keyboard:** Clickable: Enter or Space activates. Selectable: Space or Enter toggles. In a removable group: one tab stop enters the group, Left and Right arrows move between tags, and Delete or Backspace removes the focused tag. In a single-choice group, arrows move and select, as radios do.
- **Focus:** A focus ring around the whole tag on :focus-visible. In a removable group, focus moves to the next tag after a removal, else the previous one, else the group or its input, and never to \<body>.
- **ARIA:** Name the remove button "Remove" followed by the label ("Remove Marketing"), or aria-label="Remove" plus aria-labelledby pointing at the label. Never a bare "Remove" or "×". A selectable tag exposes its state with aria-pressed, aria-checked or aria-selected, matching the role its group gives it. A leading icon is aria-hidden. Every name is translatable, and the row mirrors under right-to-left layout.

## Motion

- **Enter:** A tag added to a group scales from 90% to 100% as it fades in. On selection, the fill crossfades and the check mark scales in.
- **Exit:** A removed tag fades out first, then its width and margin collapse, so the tags after it slide into the space.
- **Reduced motion:** Under prefers-reduced-motion, scale, slide and collapse are instant and only the opacity change remains, since the state change is the information.

## Composition

- **Composes with:** `icon-button-neutral`, `focus-ring`
- **Alternative to:** `badge`, `button`, `checkbox-group`, `radio-group`
- **Planned:** `tag-group`, `combobox`, `toggle-button`, `avatar`, `popover`
- **Replaces:**
  - a removable token list built as a listbox
  - a clickable div styled as a pill
  - a bare × glyph with no accessible name

---

Generated from the `tag` component definition.
