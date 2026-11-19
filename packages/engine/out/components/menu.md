# Menu

> A list of actions on a raised panel, opened from a button. It closes once an action is chosen.

- **ID:** `menu`
- **Category:** overlay
- **Status:** draft
- **Also known as:** dropdown-menu, action-menu, action-list, overflow-menu, kebab-menu, popup-menu, context-menu, menubar

## Overview

A list of actions that opens from a button: the menu behind a "More" button, a dropdown of commands, or the menu a secondary click opens. It sits on a raised panel beside its trigger and closes when a person chooses an action, presses Escape or clicks outside. Items can be grouped under headings, split by dividers, turned on and off with a check, or open a submenu. Not a select (a menu does things, it does not choose a form value), not navigation (use links), and not a popover (a popover holds content, a menu holds actions).

- **Purpose:** Offer a list of actions from a button, without taking room on the page.
- **Use when:** A button opens a set of actions or options: an overflow "More" menu, a dropdown of commands, a context menu, or a list of view options with checks.
- **Avoid when:** The choice is a form value (a select), the items go to other pages (links), the content is not a list of actions (a popover), or there are only one or two actions (show them as buttons).

## Anatomy

Shown on the default member: placement `bottom`.

1. **Panel** — The panel: the raised surface, its edge, its shadow and its corners, with the items inset 4px inside it.
2. **Items** — The items: a native slot holding Menu.Item, Menu.Group and Divider instances, three items by default.
3. **Item1** — The first item.
4. **Item2** — The second item.
5. **Item3** — The third item.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `placement` | `bottom` | once, when authored | The side of the trigger it opens on. start and end follow the writing direction. When there is no room it moves to the opposite side. |

## Usage guidelines

Use a Menu for a set of actions that do not fit on the page: the actions on a row, a "More" button, or the commands for a selection. Group related items, put a destructive action last after a divider, and keep it short. To choose a form value use a select; to move between pages use links.

### Do

- Open it from a button that says what it holds
- Group related items, with a heading or a divider
- Put a destructive action last, after a divider
- Keep it to one level of submenu

### Don't

- Use a menu for site navigation. Use links.
- Use a menu to pick a form value. Use a select.
- Hide the main action of a page in a menu
- Nest a submenu inside a submenu

## Accessibility

- **Keyboard:** Enter, Space or Arrow Down on the trigger opens the menu. Arrow Up and Down move, Home and End jump, Enter acts, Space toggles, typing a letter jumps to an item, Escape closes and returns focus to the trigger, and Tab closes the menu and moves on.
- **Focus:** Moves to the first item on open (the last, from Arrow Up) and returns to the trigger when the menu closes by Escape or an action.
- **Screen readers:** `role="menu"`, labeled by its trigger, holding items with `role="menuitem"`, `role="menuitemcheckbox"` or `role="menuitemradio"`.

  On the trigger: aria-haspopup="menu", aria-expanded, and aria-controls pointing at the menu. The menu: aria-labelledby pointing at the trigger.

### WCAG

- 1.4.11 Non-text Contrast (the panel's edge and the focused item's focus ring)
- 1.4.13 Content on Hover or Focus (a submenu opened on hover stays while the pointer moves to it, and Escape closes it)
- 2.1.1 Keyboard (every item is reachable with the arrow keys)
- 2.1.2 No Keyboard Trap (Escape and Tab leave the menu)
- 2.4.3 Focus Order (focus moves into the menu on open and returns to the trigger on close)
- 2.4.7 Focus Visible (the focused item shows the highlight and the shared focus ring)
- 4.1.2 Name, Role, Value (the trigger states its popup and whether it is expanded)

### Motion

- **Enter:** Fades in and scales up from a little under full size, from the trigger's side (motion.duration.fast, motion.easing-role.enter). A submenu fades only.
- **Exit:** Fades out (motion.duration.instant, motion.easing-role.exit), quicker than it opened.
- **Reduced motion:** Under prefers-reduced-motion it fades only, with no scale, on motion.duration-reduced.fast to open and to close. A fade is not movement, and it keeps the cue that the menu opened or closed.

## Content guidelines

Items start with a verb, in sentence case, with no ending punctuation. Headings are one or two words.

- **Labels:** The trigger names what the menu holds ("Sort", "More actions"); an icon-only trigger needs an accessible name. Items start with a verb.

## Related components

- **Built from:** `menu-item`
- **Instead, consider:** `select`, `popover`
- **Often used with:** `button`, `button-neutral`, `icon-button`, `icon-button-neutral`, `divider`
- **Replaces:**
  - a select used to run commands
  - a hand-built dropdown with no menu role or keyboard support

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `items` | slot of `menu-item` or `menu-group` or `divider`, 1 or more | — | yes | The menu's items, groups and dividers, in order. |
| `open` | boolean | `false` | no | Whether the menu is showing. Leave it unset and use defaultOpen for a menu that manages its own state. |
| `defaultOpen` | boolean | `false` | no | Whether the menu starts open, when open is not set. |
| `onOpenChange` | function | — | no | Called with true when the trigger opens the menu, and with false when an action, Escape, a click outside or Tab closes it. |
| `placement` | enum: 'top' \| 'bottom' \| 'start' \| 'end' | `bottom` | no | The side of the trigger it opens on. start and end follow the writing direction. When there is no room it moves to the opposite side. |
| `align` | enum: 'start' \| 'center' \| 'end' | `start` | no | Where it lines up along that side: with the start edge of the trigger, its center, or its end edge. |
| `loop` | boolean | `true` | no | Whether the arrow keys wrap from the last item to the first and back. |

## Specs

Generated from the plan that builds the design-file component: 1 member. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `panel` | frame | every member |
| `panel/items` | slot | every member |
| `panel/items/item1` | instance | every member |
| `panel/items/item2` | instance | every member |
| `panel/items/item3` | instance | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

**every member**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `panel` | `space.050` | — | — | — | 180px (literal) | build width 240px (literal); radius `radius.lg`; stroke `border-width.hairline` |

### Color

Keyed by `placement`.

**placement=bottom**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `panel` | `color.foreground.raised` | `color.border.secondary` | — | — |

### Nesting and properties

- `panel/items` is a slot, preferring `menu-item`
- `panel/items/item1` nests `menu-item` at `type=action, intent=default, state=rest`
- `panel/items/item2` nests `menu-item` at `type=action, intent=default, state=rest`
- `panel/items/item3` nests `menu-item` at `type=action, intent=default, state=rest`

| Property | Type | Default |
| --- | --- | --- |
| `items` | slot | — |

---

Generated from the `menu` component definition.
