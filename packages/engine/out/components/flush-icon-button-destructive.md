# FlushIconButton.Destructive

> Icon-only destructive action in a component: a bare glyph or light circle. Needs an accessible name.

An icon-only button in the destructive color, made to sit inside another component where the action deletes or removes something, such as the remove on a list row. It has two shapes. Flush has no padding, no fill and no border: the glyph is the whole visible control, so it lines up with the content edge around it, and hover and press change the glyph color only. Round draws a circle around the glyph with a light edge, and hover and press add a soft fill; its diameter matches the height of a counter at the same size. The flush box is the glyph, 20 or 24px, so in code the hit area extends past it to at least 44×44px. Because there is no visible text, an accessible name is required.

- **ID:** `flush-icon-button-destructive`
- **Category:** form
- **Status:** draft
- **Also known as:** flush-icon-btn, bare-icon-button
- **Builds on:** `icon-button-destructive`

## Usage

Use inside another component where the icon is itself the control: the minus and plus of a counter, or the close on a card. Use flush where the glyph must line up with the content edge, such as inside a counter that draws its own box. Use round where the buttons stand on their own beside a value, such as a counter with no box. For an icon action with its own padded box in a toolbar, use the IconButton of the same color.

### Do

- Always give it an accessible name (a verb)
- Extend its hit area in code to at least 44×44px at every size, with a transparent `::before` inset outward and centered on the glyph, so the target clears 44px while the box stays glyph-sized
- Space two flush icon buttons at least 44px apart, center to center, so their tap areas don't overlap
- Confirm a destructive action that cannot be undone, and give the confirmation a neutral way out ("Cancel" or "Keep"), since a lone glyph offers none

### Don't

- Nest it inside a control whose whole row is already a button, such as an accordion header or a tab
- Add a fill or a wash to the flush shape on hover or press; only the glyph color changes. Use the round shape for a fill
- Use it on its own in a toolbar, where the IconButton of the same color gives the action a visible box

### Content guidelines

The accessible name is a verb naming the action ("Close", "Increase quantity"), never the glyph's shape.

### Copy patterns

- **Labels:** The accessible name is a verb naming the action ("Close", "Increase quantity"), never the glyph's shape ("X", "plus").

## Choosing it

- **Purpose:** Trigger an action inside another component, with a bare glyph that sits flush with the content edge or a glyph in a light circle.
- **Use when:** The minus and plus of a counter, a card's close, or any icon action inside a component. shape=flush where the glyph must line up with the content edge; shape=round where the buttons stand on their own beside a value.
- **Avoid when:** The action is not destructive (use FlushIconButton, or FlushIconButton.Neutral for one with no brand emphasis). It stands on its own in a toolbar or a header (use IconButton.Destructive, which has a visible box). It would sit inside an element that is already a button, such as an accordion header or a tab. You cannot supply an accessible name.
- **Often used with:** `icon`, `focus-ring`, `counter`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `icon` | slot | — | yes | The single icon. Rendered aria-hidden: the button owns the name. |
| `aria-label` | string | — | yes | Required accessible name, a verb naming the action ("Close", "Increase quantity"). Required at the type level, since there is no visible text. |
| `onClick` | function | — | no | Action handler. Not called while disabled. |
| `type` | enum: 'button' \| 'submit' \| 'reset' | `button` | no | Defaults to 'button', as Button does. The platform default is 'submit', so a flush icon button inside a form would submit it. |
| `shape` | enum: 'flush' \| 'round' | `flush` | no | flush is the bare glyph, with no padding, fill or border, for a glyph that lines up with the content edge. round is a circle around the glyph with a light edge and a soft fill on hover and press, for a counter whose buttons stand on their own. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The glyph size: 20px at small and medium, 24px at large. A flush box is the glyph, with no padding. A round circle is 36, 44 or 56px across. The hit area in code is at least 44×44px at every size. |
| `surface` | enum: 'default' \| 'inverse' | `default` | no | The ground the button sits on, following IconButton. `default` for a normal page; `inverse` for a dark or brand-filled card or band, where the glyph binds its `color.inverse.*` counterpart so it keeps contrast against the flipped surface. Flush has no fill, so the glyph ink is all the axis changes. A host that cannot know its ground picks `default`, and the designer sets `inverse` on the instance, the same answer the nested focus ring gives. |
| `disabled` | boolean | `false` | no | Native disabled. Inside a component that sets it at a limit (a counter at its minimum), prefer aria-disabled so the button keeps its place in the accessibility tree. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `shape` | `flush`, `round` | once, when authored |
| `size` | `medium`, `small`, `large` | once, when authored |
| `surface` | `default`, `inverse` | once, when authored |

## Accessibility

- **Role:** button (native \<button>)
- **WCAG:**
  - 4.1.2 Name/Role/Value (the required accessible name)
  - 1.4.11 Non-text Contrast (the glyph and the focus ring at 3:1 against the page; the round edge is decorative and is not held to it, since the glyph identifies the control)
  - 2.4.7 Focus Visible (a :focus-visible ring, offset from the glyph square)
  - 2.5.8 Target Size (Minimum) (24×24, as intent — through the code-side hit area, since the flush glyph box alone is 20 or 24px)
  - 2.5.5 Target Size (Enhanced) (44×44, as intent — through the code-side hit area at every size; the flush glyph box alone is 20 or 24px, and the small round circle 36px)
- **Keyboard:** Native \<button>: Enter on keydown, Space on keyup. A host may take it out of the tab order (tabindex="-1") where its own keys do the same job, as a counter's arrow keys do.
- **Focus:** An offset :focus-visible ring around the glyph square, or around the circle on the round shape.
- **ARIA:** aria-label is the accessible name (required), a verb naming the action. Inside a host that disables it at a limit, set aria-disabled="true" so it stays in the accessibility tree. Never nest it inside another interactive element, such as an accordion header or a tab: a button inside a button is invalid HTML and breaks assistive technology. Under RTL, only a directional glyph flips.

## Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** The glyph color change, and the round shape's fill, are meant to run about 100–150ms through the brand's motion tokens; none is bound yet, so the timing is code-side. Under prefers-reduced-motion the change stays, instantly.

## Composition

- **Composes with:** `focus-ring`
- **Alternative to:** `icon-button-destructive`
- **Planned:** `number-input`, `card`
- **Replaces:**
  - an \<svg> with a click handler and no button
  - an IconButton with its padding overridden to zero

---

Generated from the `flush-icon-button-destructive` component definition.
