# Link

> Text that goes to another page, a place on the page or a file. Underlined in running text.

- **ID:** `link`
- **Category:** navigation
- **Status:** draft
- **Also known as:** text-link, anchor, hyperlink

## Overview

Text that goes to another page, a place on the page, a file or another site. A link is always a real anchor with an href; an action in place is a button, however light it looks. The standalone style sits on its own line, below a form, in a footer or beside a control, and shows its underline at hover, pressed and keyboard focus. The inline style is underlined at every state, for a link that sits in body copy, so it is never told apart by color alone. Both come in two weights: emphasis, the starting value, and default, which is lighter. A link inside a paragraph is a text range with that text's own link style rather than this component.

- **Purpose:** Text that navigates to a URL, a fragment or a file, rendered as a real \<a href>.
- **Use when:** The interaction changes the address or the place on the page: a page, an in-page anchor, a document, another site. Standalone for a link on its own line (below a form, in a footer, beside a control); inline for a link that sits in body copy.
- **Avoid when:** The interaction acts in place without changing the address: submit, open a dialog, toggle, show a password (use Button, or Button.Neutral for a light look). A navigation that needs a button's weight, such as "Continue to checkout", is a Button given an href, which renders an \<a>. Switching panels in place is Tabs.

## Anatomy

Shown on the default member: style `standalone`, weight `emphasis`, size `medium`, surface `default`.

1. **Container** — The link: a row that hugs its label and any icon, with no padding and no fill.
2. **Label** — The link text in the link color. Standalone: plain at rest, underlined at hover, pressed and focus. Inline: underlined at every state.
3. **Trailing visual** (optional) — An optional icon after the label, in the link color, such as an arrow or the external icon for a link that opens a new tab. Standalone links only; an inline link carries none.
4. **Focus ring** — The shared focus ring, around the whole link while it has keyboard focus. It follows the surface, so an inverse link keeps a ring that reads on the dark band.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `style` | `standalone`, `inline` | once, when authored | Standalone shows its underline at hover, pressed and focus; inline is underlined at every state, for a link in body copy. |
| `weight` | `emphasis`, `default` | once, when authored | Emphasis is the starting value; choose Default for a lighter weight link. |
| `size` | `medium`, `small`, `large` | once, when authored | The body type size: 14, 16 or 18px. The box is one text line tall; the icon (16px at small and medium, 20px at large) sits inside it. |
| `surface` | `default`, `inverse` | once, when authored | The ground the link sits on: the page, or a dark or brand-filled band, which takes the inverse link colors. |

### States

`rest`, `hover`, `pressed`, `focus-visible`

## Usage guidelines

Use a link to go somewhere: another page, a place on the page, a file or another site. Use standalone on its own line and inline in body copy. For an action in place, such as submit, open a dialog or toggle, use a button. A link inside small print is a text range with that text's own link style.

### Do

- Write link text that names the destination
- State the format and size of a file link
- Keep opening in a new tab for narrow cases, and say so
- Use the inline style for a link in body copy, so it is underlined at rest

### Don't

- Use a link for an action that does not change the address; that is a button
- Make a disabled link; render plain text instead
- Add an icon to an inline link
- Tell a link in running text apart by color alone

## Accessibility

- **Keyboard:** Tab moves to the link; Enter follows it. Space does not activate a link: it scrolls the page.
- **Focus:** The shared focus ring at :focus-visible, so a mouse click leaves no ring behind.
- **Screen readers:** link (a real \<a href>, with the label text inside the anchor)

  Usually none: the anchor and its text carry the role and the name. aria-current="page" marks the current page in a navigation. A link that opens a new tab adds visually hidden "(opens in new tab)" text; the icons are aria-hidden. Where space forces generic text such as "Read more", an aria-label names the destination. The hidden text and any aria-label are translated; in right-to-left text the trailing icon moves to the leading edge and directional icons mirror.

### WCAG

- 1.4.1 Use of Color (an inline link is underlined at every state, never told apart by color alone)
- 2.4.4 Link Purpose (the link text names the destination)
- 4.1.2 Name, Role, Value (the link role from a real anchor)
- 1.4.3 Contrast (targets 4.5:1 for the link text against the page)
- 1.4.11 Non-text Contrast (targets 3:1 for an icon against the page)
- 2.4.7 Focus Visible and 2.4.13 Focus Appearance (the shared focus ring)
- 2.5.8 Target Size (targets 24px through a code-side hit area; an inline link in a sentence is exempt)
- 3.2.5 Change on Request (a link that opens a new tab says so)
- 2.4.1 Bypass Blocks (the skip link)

### Motion

- **Enter:** None. At hover and focus the color changes over about 150ms, and a standalone link shows its underline.
- **Exit:** None.
- **Reduced motion:** The color and underline change at once, with no transition.

## Content guidelines

Descriptive text that stands alone, sentence case. Front-load the words that name the destination. File links state format and size.

- **Labels:** Names the destination and makes sense on its own: "Shipping and returns", "Annual report (PDF, 2 MB)". Link the noun phrase, not the whole sentence. Never a bare "click here" or "learn more", and never a raw URL.

## Related components

- **Built from:** `focus-ring`
- **Instead, consider:** `button`
- **Often used with:** `icon`, `button`, `text-field`
- **Replaces:**
  - a click handler on a div or span styled as a link
  - an \<a> with no href, href="#" or javascript:void(0)
  - a[role=button] used for navigation

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | string | — | yes | The link text. It names the destination and makes sense read on its own, without the sentence around it. |
| `href` | string | — | yes | The destination: a URL, a fragment such as "#main", or a file. With no href, render plain text rather than a link. |
| `style` | enum: 'standalone' \| 'inline' | `standalone` | no | Standalone shows its underline at hover, pressed and focus; inline is underlined at every state, for a link in body copy. |
| `weight` | enum: 'emphasis' \| 'default' | `emphasis` | no | Emphasis is the starting value; choose Default for a lighter weight link. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The body type size: 14, 16 or 18px. The box is one text line tall; the icon (16px at small and medium, 20px at large) sits inside it. |
| `surface` | enum: 'default' \| 'inverse' | `default` | no | The ground the link sits on: the page, or a dark or brand-filled band, which takes the inverse link colors. |
| `isExternal` | boolean | `false` | no | Opens in a new tab: adds the trailing external icon, visually hidden "(opens in new tab)" text and rel="noopener noreferrer". Keep it for narrow cases. |
| `asChild` | boolean | `false` | no | Merges the link's styling and accessibility onto a router's link child, so one anchor renders and the component depends on no router. |
| `trailingIcon` | slot | — | no | An icon after the label, such as an arrow or the external icon. Not for inline links. |

## Specs

Generated from the plan that builds the design-file component: 96 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/label` | text | every member |
| `container/trailingVisual` | swap | style=standalone |
| `container/focusRing` | instance | state=focus-visible |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`.

**size=medium**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.050` | — | — | — | — |
| `container/trailingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=small**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.050` | — | — | — | — |
| `container/trailingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | `space.100` | — | — | — | — |
| `container/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

### Type

Keyed by `size`, `style`, `weight`, `state`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium, style=standalone, weight=emphasis, state=rest | `container/label` | `type.body.md.strong` |
| size=medium, style=standalone, weight=emphasis, state=hover | `container/label` | `type.body.md.strong-link` |
| size=medium, style=standalone, weight=emphasis, state=pressed | `container/label` | `type.body.md.strong-link` |
| size=medium, style=standalone, weight=emphasis, state=focus-visible | `container/label` | `type.body.md.strong-link` |
| size=small, style=standalone, weight=emphasis, state=rest | `container/label` | `type.body.sm.strong` |
| size=small, style=standalone, weight=emphasis, state=hover | `container/label` | `type.body.sm.strong-link` |
| size=small, style=standalone, weight=emphasis, state=pressed | `container/label` | `type.body.sm.strong-link` |
| size=small, style=standalone, weight=emphasis, state=focus-visible | `container/label` | `type.body.sm.strong-link` |
| size=large, style=standalone, weight=emphasis, state=rest | `container/label` | `type.body.lg.strong` |
| size=large, style=standalone, weight=emphasis, state=hover | `container/label` | `type.body.lg.strong-link` |
| size=large, style=standalone, weight=emphasis, state=pressed | `container/label` | `type.body.lg.strong-link` |
| size=large, style=standalone, weight=emphasis, state=focus-visible | `container/label` | `type.body.lg.strong-link` |
| size=medium, style=standalone, weight=default, state=rest | `container/label` | `type.body.md.default` |
| size=medium, style=standalone, weight=default, state=hover | `container/label` | `type.body.md.default-link` |
| size=medium, style=standalone, weight=default, state=pressed | `container/label` | `type.body.md.default-link` |
| size=medium, style=standalone, weight=default, state=focus-visible | `container/label` | `type.body.md.default-link` |
| size=small, style=standalone, weight=default, state=rest | `container/label` | `type.body.sm.default` |
| size=small, style=standalone, weight=default, state=hover | `container/label` | `type.body.sm.default-link` |
| size=small, style=standalone, weight=default, state=pressed | `container/label` | `type.body.sm.default-link` |
| size=small, style=standalone, weight=default, state=focus-visible | `container/label` | `type.body.sm.default-link` |
| size=large, style=standalone, weight=default, state=rest | `container/label` | `type.body.lg.default` |
| size=large, style=standalone, weight=default, state=hover | `container/label` | `type.body.lg.default-link` |
| size=large, style=standalone, weight=default, state=pressed | `container/label` | `type.body.lg.default-link` |
| size=large, style=standalone, weight=default, state=focus-visible | `container/label` | `type.body.lg.default-link` |
| size=medium, style=inline, weight=emphasis, state=rest | `container/label` | `type.body.md.strong-link` |
| size=medium, style=inline, weight=emphasis, state=hover | `container/label` | `type.body.md.strong-link` |
| size=medium, style=inline, weight=emphasis, state=pressed | `container/label` | `type.body.md.strong-link` |
| size=medium, style=inline, weight=emphasis, state=focus-visible | `container/label` | `type.body.md.strong-link` |
| size=small, style=inline, weight=emphasis, state=rest | `container/label` | `type.body.sm.strong-link` |
| size=small, style=inline, weight=emphasis, state=hover | `container/label` | `type.body.sm.strong-link` |
| size=small, style=inline, weight=emphasis, state=pressed | `container/label` | `type.body.sm.strong-link` |
| size=small, style=inline, weight=emphasis, state=focus-visible | `container/label` | `type.body.sm.strong-link` |
| size=large, style=inline, weight=emphasis, state=rest | `container/label` | `type.body.lg.strong-link` |
| size=large, style=inline, weight=emphasis, state=hover | `container/label` | `type.body.lg.strong-link` |
| size=large, style=inline, weight=emphasis, state=pressed | `container/label` | `type.body.lg.strong-link` |
| size=large, style=inline, weight=emphasis, state=focus-visible | `container/label` | `type.body.lg.strong-link` |
| size=medium, style=inline, weight=default, state=rest | `container/label` | `type.body.md.default-link` |
| size=medium, style=inline, weight=default, state=hover | `container/label` | `type.body.md.default-link` |
| size=medium, style=inline, weight=default, state=pressed | `container/label` | `type.body.md.default-link` |
| size=medium, style=inline, weight=default, state=focus-visible | `container/label` | `type.body.md.default-link` |
| size=small, style=inline, weight=default, state=rest | `container/label` | `type.body.sm.default-link` |
| size=small, style=inline, weight=default, state=hover | `container/label` | `type.body.sm.default-link` |
| size=small, style=inline, weight=default, state=pressed | `container/label` | `type.body.sm.default-link` |
| size=small, style=inline, weight=default, state=focus-visible | `container/label` | `type.body.sm.default-link` |
| size=large, style=inline, weight=default, state=rest | `container/label` | `type.body.lg.default-link` |
| size=large, style=inline, weight=default, state=hover | `container/label` | `type.body.lg.default-link` |
| size=large, style=inline, weight=default, state=pressed | `container/label` | `type.body.lg.default-link` |
| size=large, style=inline, weight=default, state=focus-visible | `container/label` | `type.body.lg.default-link` |

### Color

Keyed by `style`, `weight`, `surface`, `state`.

**style=standalone, weight=emphasis, surface=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.default` | — |
| `container/trailingVisual` | — | — | — | `color.icon.link.default` |

**style=standalone, weight=emphasis, surface=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.hover` | — |
| `container/trailingVisual` | — | — | — | `color.icon.link.hover` |

**style=standalone, weight=emphasis, surface=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.pressed` | — |
| `container/trailingVisual` | — | — | — | `color.icon.link.pressed` |

**style=standalone, weight=emphasis, surface=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.focused` | — |
| `container/trailingVisual` | — | — | — | `color.icon.link.focused` |

**style=standalone, weight=emphasis, surface=inverse, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.default` | — |
| `container/trailingVisual` | — | — | — | `color.inverse.icon.link.default` |

**style=standalone, weight=emphasis, surface=inverse, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.hover` | — |
| `container/trailingVisual` | — | — | — | `color.inverse.icon.link.hover` |

**style=standalone, weight=emphasis, surface=inverse, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.pressed` | — |
| `container/trailingVisual` | — | — | — | `color.inverse.icon.link.pressed` |

**style=standalone, weight=emphasis, surface=inverse, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.focused` | — |
| `container/trailingVisual` | — | — | — | `color.inverse.icon.link.focused` |

**style=standalone, weight=default, surface=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.default` | — |
| `container/trailingVisual` | — | — | — | `color.icon.link.default` |

**style=standalone, weight=default, surface=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.hover` | — |
| `container/trailingVisual` | — | — | — | `color.icon.link.hover` |

**style=standalone, weight=default, surface=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.pressed` | — |
| `container/trailingVisual` | — | — | — | `color.icon.link.pressed` |

**style=standalone, weight=default, surface=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.focused` | — |
| `container/trailingVisual` | — | — | — | `color.icon.link.focused` |

**style=standalone, weight=default, surface=inverse, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.default` | — |
| `container/trailingVisual` | — | — | — | `color.inverse.icon.link.default` |

**style=standalone, weight=default, surface=inverse, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.hover` | — |
| `container/trailingVisual` | — | — | — | `color.inverse.icon.link.hover` |

**style=standalone, weight=default, surface=inverse, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.pressed` | — |
| `container/trailingVisual` | — | — | — | `color.inverse.icon.link.pressed` |

**style=standalone, weight=default, surface=inverse, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.focused` | — |
| `container/trailingVisual` | — | — | — | `color.inverse.icon.link.focused` |

**style=inline, weight=emphasis, surface=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.default` | — |

**style=inline, weight=emphasis, surface=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.hover` | — |

**style=inline, weight=emphasis, surface=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.pressed` | — |

**style=inline, weight=emphasis, surface=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.focused` | — |

**style=inline, weight=emphasis, surface=inverse, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.default` | — |

**style=inline, weight=emphasis, surface=inverse, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.hover` | — |

**style=inline, weight=emphasis, surface=inverse, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.pressed` | — |

**style=inline, weight=emphasis, surface=inverse, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.focused` | — |

**style=inline, weight=default, surface=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.default` | — |

**style=inline, weight=default, surface=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.hover` | — |

**style=inline, weight=default, surface=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.pressed` | — |

**style=inline, weight=default, surface=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.text.link.focused` | — |

**style=inline, weight=default, surface=inverse, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.default` | — |

**style=inline, weight=default, surface=inverse, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.hover` | — |

**style=inline, weight=default, surface=inverse, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.pressed` | — |

**style=inline, weight=default, surface=inverse, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.text.link.focused` | — |

### Nesting and properties

- `container/trailingVisual` is a swap slot, property `↳ swap trailing icon`, shown by `trailing icon`
- `container/focusRing` nests `focus-ring` at `surface=default`; follows `surface`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Link text` |
| `trailing icon` | boolean | `false` |
| `↳ swap trailing icon` | instance swap | — |

---

Generated from the `link` component definition.
