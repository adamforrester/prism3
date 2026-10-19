# Link

> Text that goes to another page, a place on the page or a file. Underlined in running text.

Text that goes to another page, a place on the page, a file or another site. A link is always a real anchor with an href; an action in place is a button, however light it looks. The standalone style sits on its own line, below a form, in a footer or beside a control, and shows its underline at hover, pressed and keyboard focus. The inline style is underlined at every state, for a link that sits in body copy, so it is never told apart by color alone. Both come in two weights: emphasis, the starting value, and default, which is lighter. A link inside a paragraph is a text range with that text's own link style rather than this component.

- **ID:** `link`
- **Category:** navigation
- **Status:** draft
- **Also known as:** text-link, anchor, hyperlink

## Usage

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

### Content guidelines

Descriptive text that stands alone, sentence case. Front-load the words that name the destination. File links state format and size.

### Copy patterns

- **Labels:** Names the destination and makes sense on its own: "Shipping and returns", "Annual report (PDF, 2 MB)". Link the noun phrase, not the whole sentence. Never a bare "click here" or "learn more", and never a raw URL.

## Choosing it

- **Purpose:** Text that navigates to a URL, a fragment or a file, rendered as a real \<a href>.
- **Use when:** The interaction changes the address or the place on the page: a page, an in-page anchor, a document, another site. Standalone for a link on its own line (below a form, in a footer, beside a control); inline for a link that sits in body copy.
- **Avoid when:** The interaction acts in place without changing the address: submit, open a dialog, toggle, show a password (use Button, or Button.Neutral for a light look). A navigation that needs a button's weight, such as "Continue to checkout", is a Button given an href, which renders an \<a>. Switching panels in place is Tabs.
- **Often used with:** `icon`, `button`, `text-field`, `breadcrumbs`

## Props

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

## States

`rest`, `hover`, `pressed`, `focus-visible`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `style` | `standalone`, `inline` | once, when authored |
| `weight` | `emphasis`, `default` | once, when authored |
| `size` | `medium`, `small`, `large` | once, when authored |
| `surface` | `default`, `inverse` | once, when authored |

## Accessibility

- **Role:** link (a real \<a href>, with the label text inside the anchor)
- **WCAG:**
  - 1.4.1 Use of Color (an inline link is underlined at every state, never told apart by color alone)
  - 2.4.4 Link Purpose (the link text names the destination)
  - 4.1.2 Name, Role, Value (the link role from a real anchor)
  - 1.4.3 Contrast (targets 4.5:1 for the link text against the page)
  - 1.4.11 Non-text Contrast (targets 3:1 for an icon against the page)
  - 2.4.7 Focus Visible and 2.4.13 Focus Appearance (the shared focus ring)
  - 2.5.8 Target Size (targets 24px through a code-side hit area; an inline link in a sentence is exempt)
  - 3.2.5 Change on Request (a link that opens a new tab says so)
  - 2.4.1 Bypass Blocks (the skip link)
- **Keyboard:** Tab moves to the link; Enter follows it. Space does not activate a link: it scrolls the page.
- **Focus:** The shared focus ring at :focus-visible, so a mouse click leaves no ring behind.
- **ARIA:** Usually none: the anchor and its text carry the role and the name. aria-current="page" marks the current page in a navigation. A link that opens a new tab adds visually hidden "(opens in new tab)" text; the icons are aria-hidden. Where space forces generic text such as "Read more", an aria-label names the destination. The hidden text and any aria-label are translated; in right-to-left text the trailing icon moves to the leading edge and directional icons mirror.

## Motion

- **Enter:** None. At hover and focus the color changes over about 150ms, and a standalone link shows its underline.
- **Exit:** None.
- **Reduced motion:** The color and underline change at once, with no transition.

## Composition

- **Composes with:** `focus-ring`
- **Alternative to:** `button`
- **Planned:** `menu`
- **Replaces:**
  - a click handler on a div or span styled as a link
  - an \<a> with no href, href="#" or javascript:void(0)
  - a[role=button] used for navigation

---

Generated from the `link` component definition.
