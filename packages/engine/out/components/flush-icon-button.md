# FlushIconButton

> Icon-only action with no padding or fill, set inside another component. Needs an accessible name.

An icon-only button with no padding, no fill and no border: the glyph is the whole visible control, so it lines up with the content edge around it. It is made to sit inside another component, such as the minus and plus of a counter or the close on a card. Hover and press change the glyph color only. The visible box is the glyph, 20 or 24px, so in code the hit area extends past it to at least 44×44px. Because there is no visible text, an accessible name is required.

- **ID:** `flush-icon-button`
- **Category:** form
- **Status:** draft
- **Also known as:** flush-icon-btn, bare-icon-button
- **Builds on:** `icon-button-neutral`

## Usage

Use inside another component where the icon is itself the control and must line up with the content edge: the minus and plus of a counter, or the close on a card. For an icon action with its own padded box and hover wash, use IconButton.Neutral.

### Do

- Always give it an accessible name (a verb)
- Extend its hit area in code to at least 44×44px at every size, with a transparent `::before` inset outward and centered on the glyph, so the target clears 44px while the box stays glyph-sized
- Leave 44px between two flush icon buttons, so their hit areas do not overlap

### Don't

- Nest it inside a control whose whole row is already a button, such as an accordion header or a tab
- Add a fill or a wash on hover or press; only the glyph color changes
- Use it on its own in a toolbar, where IconButton.Neutral gives the action a visible box

### Content guidelines

The accessible name is a verb naming the action ("Close", "Increase quantity"), never the glyph's shape.

### Copy patterns

- **Labels:** The accessible name is a verb naming the action ("Close", "Increase quantity"), never the glyph's shape ("X", "plus").

## Choosing it

- **Purpose:** Trigger an action with a bare glyph that sits flush with the content edge, inside another component.
- **Use when:** The minus and plus of a counter, a card's close, or any icon action inside a component where the glyph must line up with the content edge.
- **Avoid when:** The action stands on its own in a toolbar or a header (use IconButton.Neutral, which has a visible box and a hover wash). It would sit inside an element that is already a button, such as an accordion header or a tab. You cannot supply an accessible name.
- **Often used with:** `icon`, `focus-ring`, `icon-button-neutral`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `icon` | slot | — | yes | The single icon. Rendered aria-hidden: the button owns the name. |
| `aria-label` | string | — | yes | Required accessible name, a verb naming the action ("Close", "Increase quantity"). Required at the type level, since there is no visible text. |
| `onClick` | function | — | no | Action handler. Not called while disabled. |
| `type` | enum: 'button' \| 'submit' \| 'reset' | `button` | no | Defaults to 'button', as Button does. The platform default is 'submit', so a flush icon button inside a form would submit it. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The glyph size: 20px at small and medium, 24px at large. The box is the glyph, with no padding; the hit area in code is at least 44×44px at every size. |
| `disabled` | boolean | `false` | no | Native disabled. Inside a component that sets it at a limit (a counter at its minimum), prefer aria-disabled so the button keeps its place in the accessibility tree. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium`, `large` | once, when authored |

## Accessibility

- **Role:** button (native \<button>)
- **WCAG:**
  - 4.1.2 Name/Role/Value (the required accessible name)
  - 1.4.11 Non-text Contrast (the glyph and the focus ring at 3:1 against the page)
  - 2.4.7 Focus Visible (a :focus-visible ring, offset from the glyph square)
  - 2.5.8 Target Size (Minimum) (24×24, as intent — through the code-side hit area, since the glyph box alone is 20 or 24px)
  - 2.5.5 Target Size (Enhanced) (44×44, as intent — through the code-side hit area at every size; the glyph box alone is 20 or 24px)
- **Keyboard:** Native \<button>: Enter on keydown, Space on keyup. A host may take it out of the tab order (tabindex="-1") where its own keys do the same job, as a counter's arrow keys do.
- **Focus:** An offset :focus-visible ring around the glyph square.
- **ARIA:** aria-label is the accessible name (required), a verb naming the action. Inside a host that disables it at a limit, set aria-disabled="true" so it stays in the accessibility tree. Never nest it inside another interactive element, such as an accordion header or a tab: a button inside a button is invalid HTML and breaks assistive technology. Under RTL, only a directional glyph flips.

## Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** The glyph color change is meant to run about 100–150ms through the brand's motion tokens; none is bound yet, so the timing is code-side. Under prefers-reduced-motion the color change stays, instantly.

## Composition

- **Composes with:** `focus-ring`
- **Alternative to:** `icon-button-neutral`
- **Planned:** `counter`, `number-input`, `card`
- **Replaces:**
  - an \<svg> with a click handler and no button
  - an IconButton with its padding overridden to zero

---

Generated from the `flush-icon-button` component definition.
