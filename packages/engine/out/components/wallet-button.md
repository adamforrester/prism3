# WalletButton

> Express checkout with Apple Pay, Google Pay, PayPal or Shop Pay, drawn by the provider.

- **ID:** `wallet-button`
- **Category:** form
- **Status:** draft
- **Also known as:** express-checkout-button, payment-button, pay-button

## Overview

A payment button for a wallet: Apple Pay, Google Pay, PayPal or Shop Pay. The provider draws the button itself, so its logo, colors, wording and font are the provider's and never change with the theme. The component sets the height, the width, the corner radius where the provider allows one, and the focus ring. Each provider has a smallest and a largest height, so Shop Pay starts at the medium size and PayPal stops at medium. The design file shows each provider's own button in each of its styles, and a stand-in with the provider's logo and no fill when the style is left open; the button the customer sees comes from the provider.

- **Purpose:** Offer an express checkout with a wallet, drawn by the wallet provider.
- **Use when:** On a cart, checkout or product page, for each wallet the store accepts: Apple Pay, Google Pay, PayPal or Shop Pay.
- **Avoid when:** For a store's own checkout or pay action, use Button. To show which cards and wallets are accepted, use Provider logo tiles in a row. For signing in with a provider, use a sign-in button, not a wallet button.

## Anatomy

Shown on the default member: provider `apple-pay`, style `any`, size `medium`.

1. **Container** — The provider's button at its size and corner: the style's own fill, and a 1px edge where the provider draws one. With the style left open it has no fill and no edge, and the provider draws the button inside it.
2. **Mark** — The provider's logo, in its own colors and proportion, centered: for a style, exactly as the provider draws it on that style's button, at the provider's height for the button. Only its height is set.
3. **Focus ring** — The shared focus ring, around the provider's button while it has keyboard focus.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `provider` | `apple-pay`, `google-pay`, `paypal`, `shop-pay` | once, when authored | Which wallet. Each needs its provider's script on the page, which draws the button. |
| `style` | `any`, `black`, `white`, `white-outline`, `gold`, `blue`, `silver`, `purple` | once, when authored | The provider's color style, from its own list, passed to the provider: Apple Pay black, white, white-outline; Google Pay black, white; PayPal gold, blue, silver, white, black; Shop Pay purple. Pick it for the ground the button sits on: dark buttons on light grounds, light ones on dark grounds. any passes no style, so the provider draws its default. A style another provider uses is refused. |
| `size` | `medium`, `small`, `large` | once, when authored | The height: 36, 44 or 56px. Shop Pay has no small size and PayPal no large one, because each provider sets a smallest and a largest height. |

### States

`rest`, `focus-visible`

## Usage guidelines

Offer the wallets the checkout accepts as a row or stack of buttons, each the same height, above or beside the card form. Pick each provider's style for the ground, and let the provider draw the button.

### Do

- Give every wallet button in a group the same size
- Pick dark styles on light grounds and light styles on dark grounds
- Keep clear space around each button

### Don't

- Draw a wallet button yourself or restyle the provider's one
- Write your own wording on a wallet button
- Make one wallet button smaller than the others beside it

## Accessibility

- **Keyboard:** Tab reaches the button; Enter or Space starts the provider's payment sheet. The provider's element handles the keys.
- **Focus:** The focus ring around the provider's button at keyboard focus.
- **Screen readers:** button, drawn and named by the provider's element

  The provider's element supplies the role and the accessible name, translated by the provider. Add no label of your own, which would announce the provider twice.

### WCAG

- 1.4.11 Non-text Contrast (the provider's style is picked for the ground: dark buttons on light grounds, light ones on dark grounds)
- 2.4.7 Focus Visible (the focus ring around the provider's button)
- 2.5.8 Target Size (every size is at least 36px high, above the 24px floor)
- 4.1.2 Name, Role, Value (from the provider's element)

### Motion

- **Enter:** None of its own. The provider's element appears once its script has drawn it, in the space the component holds.
- **Exit:** None.
- **Reduced motion:** No motion of its own to reduce.

## Content guidelines

The provider's wording, in the provider's language handling. Nothing to write.

- **Labels:** The provider's own wording only, chosen from its list (plain, buy, checkout, pay and the rest). Never your own text.

## Related components

- **Built from:** `provider-logo`, `focus-ring`
- **Often used with:** `button`, `button-group`, `sign-in-button`
- **Replaces:**
  - a hand-drawn wallet button
  - a wallet logo pasted into a Button

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `provider` | enum: 'apple-pay' \| 'google-pay' \| 'paypal' \| 'shop-pay' | — | yes | Which wallet. Each needs its provider's script on the page, which draws the button. |
| `style` | enum: 'any' \| 'black' \| 'white' \| 'white-outline' \| 'gold' \| 'blue' \| 'silver' \| 'purple' | `any` | no | The provider's color style, from its own list, passed to the provider: Apple Pay black, white, white-outline; Google Pay black, white; PayPal gold, blue, silver, white, black; Shop Pay purple. Pick it for the ground the button sits on: dark buttons on light grounds, light ones on dark grounds. any passes no style, so the provider draws its default. A style another provider uses is refused. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The height: 36, 44 or 56px. Shop Pay has no small size and PayPal no large one, because each provider sets a smallest and a largest height. |
| `type` | string | `plain` | no | The provider's wording, from its own list, passed to the provider: plain shows the logo alone; buy, checkout, donate, order, pay and subscribe add the provider's words, translated by the provider. A value the provider does not offer falls back to plain. |

## Specs

Generated from the plan that builds the design-file component: 74 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/mark` | instance | every member |
| `container/focusRing` | instance | state=focus-visible |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `style`.

**size=medium, style=any**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `icon.size.md` | — | — | — |

**size=small, style=any**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `icon.size.sm` | — | — | — |

**size=large, style=any**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `icon.size.lg` | — | — | — |

**size=medium, style=black**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.md.height` | — | — | — |

**size=small, style=black**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.sm.height` | — | — | — |

**size=large, style=black**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.lg.height` | — | — | — |

**size=medium, style=white**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.md.height` | — | — | — |

**size=small, style=white**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.sm.height` | — | — | — |

**size=large, style=white**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.lg.height` | — | — | — |

**size=medium, style=white-outline**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.md.height` | — | — | — |

**size=small, style=white-outline**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.sm.height` | — | — | — |

**size=large, style=white-outline**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.lg.height` | — | — | — |

**size=medium, style=gold**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.md.height` | — | — | — |

**size=small, style=gold**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.sm.height` | — | — | — |

**size=medium, style=blue**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.md.height` | — | — | — |

**size=small, style=blue**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.sm.height` | — | — | — |

**size=medium, style=silver**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.md.height` | — | — | — |

**size=small, style=silver**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.sm.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.sm.height` | — | — | — |

**size=medium, style=purple**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.md.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.md.height` | — | — | — |

**size=large, style=purple**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `size.lg.height` | — | 120px (literal) | — |
| `container/mark` | — | — | `size.lg.height` | — | — | — |

### Color

Keyed by `provider`, `style`, `state`.

### Nesting and properties

- `container/mark` nests `provider-logo` at `name=logo/apple-pay`; `provider=apple-pay, style=any` takes `name=logo/apple-pay`, `provider=apple-pay, style=black` takes `name=button/apple-pay-black`, `provider=apple-pay, style=white` takes `name=button/apple-pay-white`, `provider=apple-pay, style=white-outline` takes `name=button/apple-pay-white-outline`, `provider=google-pay, style=any` takes `name=logo/google-pay`, `provider=google-pay, style=black` takes `name=button/google-pay-black`, `provider=google-pay, style=white` takes `name=button/google-pay-white`, `provider=paypal, style=any` takes `name=logo/paypal-wordmark`, `provider=paypal, style=gold` takes `name=button/paypal-gold`, `provider=paypal, style=blue` takes `name=button/paypal-blue`, `provider=paypal, style=silver` takes `name=button/paypal-silver`, `provider=paypal, style=white` takes `name=button/paypal-white`, `provider=paypal, style=black` takes `name=button/paypal-black`, `provider=shop-pay, style=any` takes `name=logo/shop-pay`, `provider=shop-pay, style=purple` takes `name=button/shop-pay-purple`
- `container/focusRing` nests `focus-ring` at `surface=default`

---

Generated from the `wallet-button` component definition.
