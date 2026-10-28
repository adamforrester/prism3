# SignInButton

> Sign in with Apple, Google or Facebook, drawn to each provider's rules.

- **ID:** `sign-in-button`
- **Category:** form
- **Status:** draft
- **Also known as:** social-sign-in-button, social-login-button, continue-with-button

## Overview

A button that signs the user in with their Apple, Google or Facebook account. Each provider sets its own colors, its own mark and its own wording, so those never change with the theme: the button shows the provider's fill, edge and label color for the style picked, and the words "Continue with" and the provider's name. Google also sets its own typeface. The theme sets the height, the corner, the spacing and the focus ring, so every sign-in button in a stack is the same height. Pick the style for the ground the button sits on.

- **Purpose:** Let a user sign in or sign up with their Apple, Google or Facebook account.
- **Use when:** On a sign-in or sign-up screen, one button for each account provider the product supports, stacked at one size.
- **Avoid when:** For signing in with an email and password, use Button. For paying with a wallet such as Apple Pay, use WalletButton. For a social link in a footer, use Link with a brand mark. For a provider outside Apple, Google and Facebook, use Button with the provider's name in the label.

## Anatomy

Shown on the default member: provider `apple`, style `black`, size `medium`.

1. **Container** — The provider's button: its fill, and a 1px edge where the provider draws one. Hover and pressed lay a light wash over the fill, which never changes.
2. **Mark** — The provider's own glyph, in its own colors, at the leading edge. Only its height is set.
3. **Label** — The provider's wording, in the provider's label color. Google's label is set in Google's own typeface; Apple's and Facebook's in the theme's label style.
4. **Focus ring** — The shared focus ring, outside the provider's button while it has keyboard focus.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `provider` | `apple`, `google`, `facebook` | once, when authored | Which account the button signs in with. The button calls that provider's own sign-in, which needs the provider's script on the page. |
| `style` | `black`, `light`, `dark`, `neutral`, `blue` | once, when authored | The provider's color style, from its own list: Apple black; Google light, dark, neutral; Facebook blue. Unset, the first in the provider's list. A style another provider uses is refused. |
| `size` | `medium`, `small`, `large` | once, when authored | The height: 36, 44 or 56px. Give every sign-in button in a group the same size. |

### States

`rest`, `hover`, `pressed`, `focus-visible`

## Usage guidelines

Offer the sign-in providers the product supports as a stack of buttons, each the same size, above or below the email sign-in. Pick each provider's style for the ground: dark buttons on light grounds, light ones on dark grounds. Use one wording for every button in the stack.

### Do

- Give every sign-in button in a stack the same size and width
- Pick dark styles on light grounds and light styles on dark grounds
- Use the same wording for every provider in a stack

### Don't

- Recolor a sign-in button, or set its label in another typeface where the provider fixes one
- Write your own wording, or show the provider's glyph without its words
- Make one provider's button smaller or quieter than the others beside it

## Accessibility

- **Keyboard:** Tab reaches the button; Enter or Space starts the provider's sign-in.
- **Focus:** The shared focus ring, outside the provider's fill, at keyboard focus.
- **Screen readers:** button

  A native button named by its visible wording, such as "Continue with Google", translated by the app; the provider's name stays as the provider writes it. Add no label of your own. The glyph is decorative and hidden from assistive tech, because the wording already names the provider.

### WCAG

- 1.4.3 Contrast (Minimum) (each style's label color on its fill is the provider's; the Facebook styles measure 4.23:1, under the 4.5:1 floor, and the provider's blue may not be changed)
- 1.4.11 Non-text Contrast (the provider picks each style for its ground: dark buttons on light grounds, light ones on dark grounds)
- 2.4.7 Focus Visible (the focus ring outside the provider's fill)
- 2.5.3 Label in Name (the visible wording is the accessible name)
- 2.5.8 Target Size (every size is at least 36px high and 140px wide, above the 24px floor)
- 4.1.2 Name, Role, Value (a native button)

### Motion

- **Enter:** None of its own.
- **Exit:** None.
- **Reduced motion:** The hover and pressed wash changes without a transition, so there is nothing to reduce.

## Content guidelines

Pick one wording from the provider's list and use it on every button in the stack. Translate the words around the provider's name; never translate the name.

- **Labels:** The provider's own wording only, from its list: Continue with, Sign in with or Sign up with Apple or Google; Continue with or Login with Facebook. Never your own text, and never the provider's name alone.

## Related components

- **Built from:** `brand-mark`, `focus-ring`
- **Often used with:** `button`, `text-field`, `password-field`, `divider`
- **Replaces:**
  - a hand-drawn social sign-in button
  - a provider logo pasted into a Button

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `provider` | enum: 'apple' \| 'google' \| 'facebook' | — | yes | Which account the button signs in with. The button calls that provider's own sign-in, which needs the provider's script on the page. |
| `style` | enum: 'black' \| 'light' \| 'dark' \| 'neutral' \| 'blue' | — | no | The provider's color style, from its own list: Apple black; Google light, dark, neutral; Facebook blue. Unset, the first in the provider's list. A style another provider uses is refused. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The height: 36, 44 or 56px. Give every sign-in button in a group the same size. |
| `wording` | string | `continue` | no | The provider's wording, from its own list, translated by the app: Apple continue, sign-in, sign-up; Google continue, sign-in, sign-up; Facebook continue, login. The provider's name is never translated. A wording the provider does not offer is refused. |
| `fullWidth` | boolean | `false` | no | Fill the column instead of hugging the label. The button never drops under 140px wide. |
| `onClick` | (event: MouseEvent) => void | — | no | Called before the provider's sign-in starts, for analytics or a loading state. The sign-in itself is the provider's. |

## Specs

Generated from the plan that builds the design-file component: 60 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/mark` | instance | every member |
| `container/label` | text | every member |
| `container/focusRing` | instance | state=focus-visible |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `provider`.

**size=medium, provider=apple**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.150` | `space.100` | `size.md.height` | — | 140px (literal) | — |
| `container/mark` | — | — | `icon.size.sm` | — | — | — |

**size=small, provider=apple**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.200` / `space.075` / `space.150` | `space.100` | `size.sm.height` | — | 140px (literal) | — |
| `container/mark` | — | — | `icon.size.xs` | — | — | — |

**size=large, provider=apple**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.300` / `space.100` / `space.200` | `space.150` | `size.lg.height` | — | 140px (literal) | — |
| `container/mark` | — | — | `icon.size.md` | — | — | — |

**size=medium, provider=google**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.150` / `space.100` / `space.150` | `space.100` | `size.md.height` | — | 140px (literal) | — |
| `container/mark` | — | — | `icon.size.sm` | — | — | — |

**size=small, provider=google**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.150` / `space.075` / `space.150` | `space.100` | `size.sm.height` | — | 140px (literal) | — |
| `container/mark` | — | — | `icon.size.xs` | — | — | — |

**size=large, provider=google**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.150` / `space.100` / `space.150` | `space.100` | `size.lg.height` | — | 140px (literal) | — |
| `container/mark` | — | — | `icon.size.md` | — | — | — |

**size=medium, provider=facebook**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.150` | `space.100` | `size.md.height` | — | 140px (literal) | — |
| `container/mark` | — | — | `icon.size.sm` | — | — | — |

**size=small, provider=facebook**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.200` / `space.075` / `space.150` | `space.100` | `size.sm.height` | — | 140px (literal) | — |
| `container/mark` | — | — | `icon.size.xs` | — | — | — |

**size=large, provider=facebook**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.300` / `space.100` / `space.200` | `space.150` | `size.lg.height` | — | 140px (literal) | — |
| `container/mark` | — | — | `icon.size.md` | — | — | — |

### Type

Keyed by `size`, `provider`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium, provider=apple | `container/label` | `type.label.md.emphasis` |
| size=small, provider=apple | `container/label` | `type.label.sm.emphasis` |
| size=large, provider=apple | `container/label` | `type.label.lg.emphasis` |
| size=medium, provider=facebook | `container/label` | `type.label.md.emphasis` |
| size=small, provider=facebook | `container/label` | `type.label.sm.emphasis` |
| size=large, provider=facebook | `container/label` | `type.label.lg.emphasis` |

### Color

Keyed by `provider`, `style`, `state`.

### Nesting and properties

- `container/mark` nests `brand-mark` at `name=provider/apple`; `provider=apple, style=black` takes `name=provider/apple`, `provider=google, style=light` takes `name=provider/google`, `provider=google, style=dark` takes `name=provider/google`, `provider=google, style=neutral` takes `name=provider/google`, `provider=facebook, style=blue` takes `name=provider/facebook`
- `container/focusRing` nests `focus-ring` at `surface=default`

---

Generated from the `sign-in-button` component definition.
