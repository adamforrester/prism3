# SearchField

> Search field: a text field with a search glyph and a clear button, for a query.

- **ID:** `search-field`
- **Category:** form
- **Status:** draft
- **Also known as:** search-input, search-box, search

## Overview

A single-line field for a query the user types to find something — a site search, a filter over a list. TextField's anatomy and contract with a leading search glyph, a clear button while it holds a value, and an edge the brand can set apart from its other fields. Not for suggestions as the user types (a combobox, not built yet), and not for any other single-line text (TextField).

- **Purpose:** Capture a search query, with a search glyph and a clear button.
- **Use when:** Site search, a search within a section, a filter over a list: a single-line query the user types to find something.
- **Avoid when:** Suggestions appear as the user types (a combobox, not built yet), the text is not a query (TextField), or the value comes from a known set (Select).

## Anatomy

Shown on the default member: size `medium`, style `outline`, status `default`.

1. **Label** (optional) — The accessible name, composed rather than re-declared. Its size follows the field's, one step below the input; its label text, required marker, emphasis and weight surface on the text-field. A fix to FieldLabel still reaches this without a copy. Starts secondary and regular. Fills the field's width; a long name wraps at FieldLabel's max width.
2. **Leading visual** (optional) — An optional purpose glyph before the value, aria-hidden. Absent by default; the caller nominates the icon.
3. **Caret**
4. **Caret end** — The insertion point on the focused field that holds a value, immediately after the value, in the value ink. Code draws the native caret where the user is typing.
5. **Placeholder** — The placeholder, in the placeholder ink (the disabled ink when disabled). Shown on the empty field: rest, hover, focus and disabled. One line; a long one clips at the value row's edge.
6. **Value**
7. **Trailing visual** (optional) — An optional trailing affix at the trailing edge (a clear / reveal glyph), aria-hidden as a glyph. Absent by default; the caller nominates the icon. Its interactive behavior is code-only.
8. **Focus ring**
9. **Message** (optional)

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored | TextField's three tiers: the input type, the nested label and the padding scale with it. Every size keeps the 44px target. small is for fine pointers only: on a coarse pointer the code sets the small input to 16px, because iOS Safari zooms the page when it focuses an input under 16px. The edge, outline or underline, is the brand's Search field style setting, not a prop. |
| `style` | `outline` | once, when authored | — |
| `status` | `default`, `error`, `warning`, `success` | at runtime | — |

### States

`rest`, `hover`, `pending`, `filled`, `focus-visible`, `focus-visible-filled`, `disabled`, `read-only`, `empty`

## Usage guidelines

Use for a query that finds or filters: a site search, a search within a section, a filter over a long list. The field nests FieldLabel above the box and FieldMessage below it; the box starts with the search glyph and ends with a clear button while it holds a value. Wrap a site or section search in a search landmark. Keep the label visible in a form; hide it only where the field's purpose is plain from where it sits, and it still names the field. In a site header, as an example and not a separate component: on a wide screen a small field sits inline in the header with its label hidden; on a narrow screen an Icon button named "Search" opens a search row under the header with a Cancel button, focus moves into the field, and Cancel closes the row and returns focus to the Search button.

### Do

- Wrap a site or section search in a search landmark
- Keep a label on every search field, visually hidden where the context makes it plain
- Return focus to the input after the clear button empties it
- Hide the browser's own cancel glyph, so the field shows one clear button

### Don't

- Use the placeholder as the label
- Show the clear button on an empty field
- Add a suggestions list to this field; use a combobox for that
- Set the search field's edge per instance; the brand sets it once

## Accessibility

- **Keyboard:** Tab reaches the input, then the clear button while the field holds a value. Enter submits the host's form. Escape empties the field. Enter or Space on the clear button empties the field and returns focus to the input.
- **Focus:** The input takes TextField's focus ring. The clear button takes its own focus ring, and pressing it moves focus back to the input.
- **Screen readers:** searchbox (native \<input type="search">), plus a native \<button type="button"> to clear it

  The host wires the label, aria-describedby and aria-invalid as TextField does. A hidden label stays in the DOM, visually hidden, never display: none. The clear button carries aria-label="Clear search" and aria-controls naming the input; the cleared state is announced once through the app's shared polite live region: "Search cleared". While results load, aria-busy.

### WCAG

- 1.3.1 Info and Relationships (a label, kept in the DOM when visually hidden, and the search landmark)
- 2.4.6 Headings and Labels (the label names what is searched)
- 3.3.2 Labels or Instructions
- 4.1.2 Name, Role, Value (the clear button is named "Clear search")
- 4.1.3 Status Messages ("Search cleared" through a polite live region)
- 1.4.11 Non-text Contrast (TextField's field boundary, outline or underline)
- 2.5.8 Target Size
- 2.4.13 Focus Appearance (intent)

### Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** The clear button appears and disappears with the value, as an instant change with no animation, so it reads the same under prefers-reduced-motion. The field's own state transitions are TextField's.

## Content guidelines

Label = noun phrase, sentence case, no trailing colon, naming what is searched. Placeholder = an example query. Clear button = "Clear search". After clearing, announce "Search cleared".

- **Labels:** Noun phrase, sentence case, no trailing colon: "Search", "Search products", "Filter orders".
- **Errors:** What is wrong and how to fix it, such as "Enter at least 2 characters"; never "Invalid search".
- **Empty states:** The label plus an optional placeholder with an example query; the search glyph stays.

## Related components

- **Built from:** `field-label`, `field-message`, `focus-ring`
- **Instead, consider:** `text-field`
- **Often used with:** `icon`, `icon-button`, `spinner`
- **Replaces:**
  - search field with no label
  - two clear buttons in a search field
  - clear button on an empty search field

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string \| node | — | yes | The persistent label (rendered as FieldLabel), usually "Search" or what is searched ("Search products"). Required, even when hidden. Never the placeholder. |
| `hideLabel` | boolean | `false` | no | Hides the label visually and keeps it in the accessibility tree, so the field keeps its name. For a search whose purpose is plain from where it sits, such as a site header. Never display: none. |
| `value` | string | — | no | Controlled value; pair with onChange. |
| `defaultValue` | string | — | no | Uncontrolled initial value. |
| `onChange` | function | — | no | Change handler (also onBlur / onFocus). Also fires with an empty value when the clear button clears the field. |
| `placeholder` | string | — | no | An example query only; vanishes on input. Never the label. |
| `helpText` | string \| node | — | no | Persistent guidance (rendered as FieldMessage, default status), wired via aria-describedby. Off by default in most searches. |
| `validation` | enum: 'default' \| 'error' \| 'warning' \| 'success' | `default` | no | The validation state, as on TextField: each non-default status swaps the input border and sets the nested message to the matching status; error also sets aria-invalid. A search rarely needs one; a query that is too short is one case. |
| `validationMessage` | string \| node | — | no | The validation text shown at error / warning / success, added to aria-describedby. Say what is wrong and how to fix it (SC 3.3.3). |
| `showMessage` | boolean | `true` | no | Whether the composed FieldMessage is shown. On by default; turning it off hides the message entirely. Never hides a message the field needs. |
| `required` | boolean | `false` | no | Sets required / aria-required, and turns on the FieldLabel's required marker. |
| `disabled` | boolean | `false` | no | Native disabled. The clear button is not shown while the field is disabled. |
| `readOnly` | boolean | `false` | no | Focusable, copyable and submitted, and passes contrast. The clear button is not shown, because the value cannot change. |
| `autoComplete` | string (WHATWG token) | — | no | Usually off for a site search, so the browser does not offer earlier queries over the page. Pass a token where a saved value helps. |
| `leadingIcon` | slot | — | no | The search glyph before the value, aria-hidden and never the accessible name. Shown by default; turn it off or swap it where the field's purpose needs a different mark. |
| `trailingIcon` | slot | — | no | The clear button's glyph, close-filled by default. In code the clear button is a focusable button named "Clear search", shown only while the field holds a value. |
| `onClear` | function | — | no | Called after the clear button empties the field, with focus back on the input. |
| `isPending` | boolean | `false` | no | Results are loading; sets aria-busy and does not block typing. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | TextField's three tiers: the input type, the nested label and the padding scale with it. Every size keeps the 44px target. small is for fine pointers only: on a coarse pointer the code sets the small input to 16px, because iOS Safari zooms the page when it focuses an input under 16px. The edge, outline or underline, is the brand's Search field style setting, not a prop. |
| `id` | string | — | no | Wiring + form submission; auto-generated with useId if omitted. The clear button's aria-controls names it. |
| `name` | string | — | no | A real \<input name>, so the query submits with the host's form ("q" is common). |

## Specs

Generated from the plan that builds the design-file component: 84 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/label` | instance | every member |
| `container/control` | frame | every member |
| `container/control/content` | frame | every member |
| `container/control/content/leadingVisual` | swap | every member |
| `container/control/content/entry` | frame | every member |
| `container/control/content/entry/placeholder` | text | state=rest or hover or focus-visible or disabled |
| `container/control/trailingVisual` | swap | every member |
| `container/message` | instance | every member |
| `container/control/content/entry/value` | text | state=filled or focus-visible-filled or read-only |
| `container/control/content/entry/caret` | frame | state=focus-visible |
| `container/control/focusRing` | instance | state=focus-visible or focus-visible-filled |
| `container/control/content/entry/caretEnd` | frame | state=focus-visible-filled |

Code-only states, with no design-file member: `pending`, `empty`.

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/control` | `space.100` / `space.200` / `space.100` / `space.200` | `space.100` | `size.md.min-height` | — | 120px (literal) | — |
| `container/control/content` | — | `space.100` | — | — | — | — |
| `container/control/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/content/entry/caret` | — | — | `control.size.md.line-box` | `border-width.hairline` | — | — |
| `container/control/content/entry/caretEnd` | — | — | `control.size.md.line-box` | `border-width.hairline` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/control` | `space.075` / `space.200` / `space.075` / `space.200` | `space.100` | `size.md.min-height` | — | 120px (literal) | — |
| `container/control/content` | — | `space.100` | — | — | — | — |
| `container/control/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/content/entry/caret` | — | — | `control.size.sm.line-box` | `border-width.hairline` | — | — |
| `container/control/content/entry/caretEnd` | — | — | `control.size.sm.line-box` | `border-width.hairline` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | build width 320px (literal) |
| `container/control` | `space.100` / `space.300` / `space.100` / `space.300` | `space.100` | `size.lg.height` | — | 120px (literal) | — |
| `container/control/content` | — | `space.100` | — | — | — | — |
| `container/control/content/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/control/content/entry/caret` | — | — | `control.size.lg.line-box` | `border-width.hairline` | — | — |
| `container/control/content/entry/caretEnd` | — | — | `control.size.lg.line-box` | `border-width.hairline` | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/control/content/entry/placeholder` | `type.body.md.default` |
| size=medium | `container/control/content/entry/value` | `type.body.md.default` |
| size=small | `container/control/content/entry/placeholder` | `type.body.sm.default` |
| size=small | `container/control/content/entry/value` | `type.body.sm.default` |
| size=large | `container/control/content/entry/placeholder` | `type.body.lg.default` |
| size=large | `container/control/content/entry/value` | `type.body.lg.default` |

### Color

Keyed by `status`, `state`.

**status=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.interactive.neutral.overlay.hover` | `color.field.border.hover` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.focus` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.focus` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |
| `container/control/trailingVisual` | — | — | — | `color.disabled.on-fill` |

**status=default, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.field.border.rest` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.interactive.neutral.overlay.hover` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=error, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |
| `container/control/trailingVisual` | — | — | — | `color.disabled.on-fill` |

**status=error, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.danger` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.interactive.neutral.overlay.hover` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=warning, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |
| `container/control/trailingVisual` | — | — | — | `color.disabled.on-fill` |

**status=warning, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.warning` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.interactive.neutral.overlay.hover` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/caret` | `color.text.primary` | — | — | — |
| `container/control/content/entry/placeholder` | — | — | `color.text.secondary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=focus-visible-filled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/content/entry/caretEnd` | `color.text.primary` | — | — | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

**status=success, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.disabled.fill` | `color.disabled.border` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/control/content/entry/placeholder` | — | — | `color.disabled.on-fill` | — |
| `container/control/trailingVisual` | — | — | — | `color.disabled.on-fill` |

**status=success, state=read-only**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/control` | `color.field.fill` | `color.border.success` | — | — |
| `container/control/content/leadingVisual` | — | — | — | `color.icon.primary` |
| `container/control/content/entry/value` | — | — | `color.text.primary` | — |
| `container/control/trailingVisual` | — | — | — | `color.icon.primary` |

### Nesting and properties

- `container/label` nests `field-label` at `size=medium, emphasis=secondary, weight=regular, state=rest`; `state=disabled` takes `state=disabled`; follows `size`; exposes `emphasis`, `weight`
- `container/control/content/leadingVisual` is a swap slot, property `↳ swap leading icon`, shown by `leading icon`, default `search`
- `container/control/trailingVisual` is a swap slot, property `↳ swap trailing icon`, shown by `trailing icon`, default `close-filled`
- `container/message` nests `field-message` at `status=default`; follows `status`
- `container/control/focusRing` nests `focus-ring` at `surface=default`

| Property | Type | Default |
| --- | --- | --- |
| `placeholder` | text | `Placeholder` |
| `value` | text | `Entered text` |
| `label` | boolean | `true` |
| `leading icon` | boolean | `true` |
| `↳ swap leading icon` | instance swap | — |
| `trailing icon` | boolean | `false` |
| `↳ swap trailing icon` | instance swap | — |
| `message` | boolean | `true` |

---

Generated from the `search-field` component definition.
