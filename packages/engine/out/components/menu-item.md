# Menu.Item

> One action in a menu: a label, an optional icon, check, description, shortcut or submenu arrow.

- **ID:** `menu-item`
- **Category:** overlay
- **Status:** draft
- **Also known as:** menuitem, menu-option, action-item

## Overview

One row of a Menu: an action, a checkbox or radio choice, or the way into a submenu. It holds a label, and can add a leading icon, a check column, a second line of description, a keyboard shortcut hint at the end, or an arrow that opens a submenu. The row highlights under the pointer and while it has keyboard focus. A destructive action takes the destructive ink. Menu places the items and owns the keyboard.

- **Purpose:** One action or option in a menu.
- **Use when:** Only as a child of Menu. Generate Menu, which places one item per action, inside a Menu.Group where the menu has sections.
- **Avoid when:** The row navigates to a page (a link), or picks a form value (a select).

## Anatomy

Shown on the default member: type `action`, intent `default`.

1. **Row** — The item: the whole row is the target. It highlights with a light neutral wash at hover, press and keyboard focus, inset from the panel with rounded corners.
2. **Lead cell** (optional) — The check column and the leading icon, centered on the label's first line. Off when an item has neither.
3. **Indicator cell** (optional) — The check column: an icon-wide cell that holds the check, so labels line up whether an item is checked or not.
4. **Check glyph** (optional) — The check, shown on a checkbox or radio item that is on.
5. **Leading visual** (optional) — An optional icon before the label.
6. **Text cell** — The label and, under it, the optional description. It fills the row.
7. **Label** — The action's name.
8. **Description** (optional) — An optional second line under the label, in secondary text.
9. **Trail cell** — The shortcut and the submenu arrow, at the end of the row, beside the label's first line.
10. **Shortcut** (optional) — The keyboard shortcut, as a hint, in secondary text.
11. **Chevron glyph** — The arrow that marks a submenu. It points the other way in right-to-left text.
12. **Focus ring** — The shared focus ring, around the item while it has keyboard focus, beside the highlight.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `type` | `action`, `submenu` | once, when authored | action runs something; checkbox turns an option on or off; radio picks one option of a group; submenu opens a further menu. |
| `intent` | `default`, `destructive` | once, when authored | destructive for an action that deletes or cannot be undone. Actions only. |

### States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Usage guidelines

Use Menu.Item inside a Menu or a Menu.Group: one per action or option. Mark a destructive action with the destructive intent, and put it last or in its own group.

**In RTL.** The layout mirrors: the start edge is on the right. The chevron glyph flips to point the other way.

### Do

- Start each action with a verb
- Turn on the check column for every item once any item in the menu is checkable
- Put a destructive action last, after a divider
- Keep a disabled item in place so people learn where it lives

### Don't

- Use a menu item to navigate a site. Use a link.
- Nest a submenu inside a submenu
- Hide a disabled item's reason. Say why in the description, or enable it and explain on use.

## Accessibility

- **Keyboard:** Set by the menu: Arrow Up and Down move between items, Enter acts, Space toggles a checkbox or radio item, Arrow Right opens a submenu (Arrow Left in right-to-left text).
- **Focus:** Roving focus: the focused item has `tabindex="0"`, the rest -1. A disabled item stays focusable. The focused item shows the highlight and the focus ring.
- **Screen readers:** `role="menuitem"`, `role="menuitemcheckbox"` or `role="menuitemradio"`, inside a `role="menu"`.

  aria-checked on a checkbox or radio item; aria-haspopup="menu" and aria-expanded on a submenu item; aria-disabled="true" on a disabled item; aria-keyshortcuts for a real shortcut. The check, chevron, icon and visible shortcut text are aria-hidden.

### WCAG

- 1.4.3 Contrast (the label and secondary text clear 4.5:1 on the panel and on the highlight)
- 1.4.11 Non-text Contrast (the check, icon and chevron clear 3:1; the keyboard-focused item adds the focus ring, because the highlight alone does not)
- 2.1.1 Keyboard (every item is reachable with the arrow keys and acts on Enter)
- 2.4.7 Focus Visible (the focused item shows the highlight and the shared focus ring)
- 2.5.8 Target Size (Minimum) (the whole row is the target, well above 24px)
- 4.1.2 Name, Role, Value (the role, the checked state and a submenu's expanded state are set)

### Motion

- **Enter:** The highlight lands at once, with no transition, as a person arrows through the menu.
- **Exit:** The highlight leaves at once.
- **Reduced motion:** Nothing changes under prefers-reduced-motion: the highlight and the check already appear at once.

## Content guidelines

Labels are short, start with a verb for an action, and use sentence case. A description is one short line.

- **Labels:** Start with a verb for an action ("Rename", "Move to folder"); name the option for a checkbox or radio item ("Show grid"). Sentence case, no ending punctuation. Add an ellipsis only when the action opens something that asks for more ("Rename…").

## Related components

- **Built from:** `focus-ring`
- **Often used with:** `menu`, `menu-group`, `icon`, `divider`
- **Replaces:**
  - a div in a dropdown with an onclick and no menuitem role

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | What the action does, in a few words: "Rename", "Move to folder". |
| `type` | enum: 'action' \| 'checkbox' \| 'radio' \| 'submenu' | `action` | no | action runs something; checkbox turns an option on or off; radio picks one option of a group; submenu opens a further menu. |
| `intent` | enum: 'default' \| 'destructive' | `default` | no | destructive for an action that deletes or cannot be undone. Actions only. |
| `checked` | boolean | `false` | no | Whether a checkbox or radio item is on. Checkbox and radio items only. |
| `disabled` | boolean | `false` | no | Dims the item and stops it acting. It stays in the keyboard order, so a person can still find it. |
| `leadingIcon` | slot | — | no | An icon before the label. Decorative: the label carries the meaning. |
| `description` | string | — | no | A short second line under the label that says more about the action. |
| `shortcut` | string | — | no | A keyboard shortcut shown at the end, as a hint. The app owns the binding itself. |
| `href` | string | — | no | For an action that goes to a page: the address it opens. |
| `textValue` | string | — | no | The text typing a letter matches, when the label is not plain text. Defaults to the label. |
| `onSelect` | function | — | no | Called when the item is chosen: a press, Enter, or Space on a checkbox or radio item. |
| `closeOnSelect` | boolean | — | no | Whether choosing the item closes the menu. True for an action; checkbox and radio items keep the menu open. |

## Specs

Generated from the plan that builds the design-file component: 15 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `row` | frame | every member |
| `row/leadCell` | frame | every member |
| `row/leadCell/indicatorCell` | frame | every member |
| `row/leadCell/indicatorCell/checkGlyph` | instance | every member |
| `row/leadCell/leadingVisual` | swap | every member |
| `row/textCell` | frame | every member |
| `row/textCell/label` | text | every member |
| `row/textCell/description` | text | every member |
| `row/trailCell` | frame | every member |
| `row/trailCell/shortcut` | text | every member |
| `row/focusRing` | instance | state=focus-visible |
| `row/trailCell/chevronGlyph` | instance | type=submenu |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

**every member**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `row` | `space.150` | `space.100` | — | — | — | min height `size.md.min-height`; build width 240px (literal); radius `radius.md` |
| `row/leadCell` | computed: max(0, one label line − icon.size.sm) ÷ 2 / — / — / — | `space.100` | — | — | — | — |
| `row/leadCell/indicatorCell` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `row/leadCell/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `row/textCell` | computed: max(0, icon.size.sm − one label line) ÷ 2 / — / — / — | — | — | — | — | — |
| `row/trailCell` | — | `space.100` | — | — | — | min height `icon.size.sm` |
| `row/trailCell/chevronGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

### Type

Keyed by nothing: one row covers every member.

| Members | Part | Text style |
| --- | --- | --- |
| every member | `row/textCell/label` | `type.label.md.default` |
| every member | `row/textCell/description` | `type.body.sm.default` |
| every member | `row/trailCell/shortcut` | `type.body.sm.default` |

### Color

Keyed by `type`, `intent`, `state`.

**type=action, intent=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `row/textCell/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |

**type=action, intent=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.neutral.icon.hover` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `row/textCell/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |

**type=action, intent=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row` | `color.interactive.neutral.overlay.pressed` | — | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `row/textCell/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |

**type=action, intent=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `row/textCell/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |

**type=action, intent=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.disabled.icon` |
| `row/leadCell/leadingVisual` | — | — | — | `color.disabled.icon` |
| `row/textCell/label` | — | — | `color.disabled.text` | — |
| `row/textCell/description` | — | — | `color.disabled.text` | — |
| `row/trailCell/shortcut` | — | — | `color.disabled.text` | — |

**type=action, intent=destructive, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.destructive.icon.rest` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.destructive.icon.rest` |
| `row/textCell/label` | — | — | `color.interactive.destructive.text.rest` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |

**type=action, intent=destructive, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.destructive.icon.hover` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.destructive.icon.hover` |
| `row/textCell/label` | — | — | `color.interactive.destructive.text.hover` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |

**type=action, intent=destructive, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row` | `color.interactive.neutral.overlay.pressed` | — | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.destructive.icon.pressed` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.destructive.icon.pressed` |
| `row/textCell/label` | — | — | `color.interactive.destructive.text.pressed` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |

**type=action, intent=destructive, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.destructive.icon.rest` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.destructive.icon.rest` |
| `row/textCell/label` | — | — | `color.interactive.destructive.text.rest` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |

**type=action, intent=destructive, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.disabled.icon` |
| `row/leadCell/leadingVisual` | — | — | — | `color.disabled.icon` |
| `row/textCell/label` | — | — | `color.disabled.text` | — |
| `row/textCell/description` | — | — | `color.disabled.text` | — |
| `row/trailCell/shortcut` | — | — | `color.disabled.text` | — |

**type=submenu, intent=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `row/textCell/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |
| `row/trailCell/chevronGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=submenu, intent=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.neutral.icon.hover` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `row/textCell/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |
| `row/trailCell/chevronGlyph` | — | — | — | `color.interactive.neutral.icon.hover` |

**type=submenu, intent=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row` | `color.interactive.neutral.overlay.pressed` | — | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `row/textCell/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |
| `row/trailCell/chevronGlyph` | — | — | — | `color.interactive.neutral.icon.pressed` |

**type=submenu, intent=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row` | `color.interactive.neutral.overlay.hover` | — | — | — |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |
| `row/leadCell/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `row/textCell/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `row/textCell/description` | — | — | `color.text.secondary` | — |
| `row/trailCell/shortcut` | — | — | `color.text.secondary` | — |
| `row/trailCell/chevronGlyph` | — | — | — | `color.interactive.neutral.icon.rest` |

**type=submenu, intent=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `row/leadCell/indicatorCell/checkGlyph` | — | — | — | `color.disabled.icon` |
| `row/leadCell/leadingVisual` | — | — | — | `color.disabled.icon` |
| `row/textCell/label` | — | — | `color.disabled.text` | — |
| `row/textCell/description` | — | — | `color.disabled.text` | — |
| `row/trailCell/shortcut` | — | — | `color.disabled.text` | — |
| `row/trailCell/chevronGlyph` | — | — | — | `color.disabled.icon` |

### Nesting and properties

- `row/leadCell/indicatorCell/checkGlyph` nests `icon/check`
- `row/leadCell/leadingVisual` is a swap slot, property `↳ swap leading icon`, shown by `leading icon`
- `row/focusRing` nests `focus-ring` at `surface=default`
- `row/trailCell/chevronGlyph` nests `icon/chevron-right`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Menu item` |
| `description text` | text | `Supporting text` |
| `shortcut text` | text | `⌘K` |
| `leading` | boolean | `false` |
| `indicator` | boolean | `false` |
| `checked` | boolean | `false` |
| `leading icon` | boolean | `true` |
| `↳ swap leading icon` | instance swap | — |
| `description` | boolean | `false` |
| `shortcut` | boolean | `false` |

---

Generated from the `menu-item` component definition.
