# BrandMark

> A provider's own mark, in its own colors: sign-in, payment and social. Never retinted.

- **ID:** `brand-mark`
- **Category:** foundations
- **Status:** draft
- **Also known as:** logo-mark, provider-logo, payment-mark, social-mark

## Overview

A provider's mark, drawn as the provider supplies it: the glyph a sign-in button carries, a payment provider's tile or logo, a social network's mark in a footer link. The colors are the provider's and never change with the theme. A one-color form is its own mark, drawn by the provider, and exists only where the provider publishes one. Square marks are 24 by 24, payment tiles 32 by 20, and logos 24 high at their own width. A payment tile's corners and its edge come from the theme, the same at every size.

- **Purpose:** Show a provider's mark, in the provider's colors and proportion, decorative or named.
- **Use when:** Wherever a provider's service is named: in a sign-in or wallet button, a payment field or a social link, and on its own, named by label, in a row of accepted payments.
- **Avoid when:** For a generic concept glyph, use Icon: a mark identifies one provider and is never retinted. Never as a button on its own: a sign-in or social action is a button or link whose label names the provider, with the mark inside it, decorative. Never for a provider whose artwork is not in the set.

## Anatomy

Shown on the default member: name `logo/affirm`.

1. **Glyph** — The mark itself, on its kind's artboard, in the provider's colors. It takes no ink from the component around it. On a payment tile the frame rounds the corners and draws a 1px edge from the theme, over artwork drawn full-bleed.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `name` | `logo/affirm`, `logo/amazon-pay`, `logo/amex`, `logo/apple-pay`, `logo/diners-club`, `logo/discover`, `logo/google-pay`, `logo/klarna`, `logo/mastercard`, `logo/paypal`, `logo/paypal-wordmark`, `logo/shop-pay`, `logo/venmo`, `logo/visa`, `payment/affirm`, `payment/amazon-pay`, `payment/amex`, `payment/apple-pay`, `payment/diners-club`, `payment/discover`, `payment/generic`, `payment/google-pay`, `payment/klarna`, `payment/maestro`, `payment/mastercard`, `payment/paypal`, `payment/shop-pay`, `payment/venmo`, `payment/visa`, `provider/apple`, `provider/facebook`, `provider/google`, `social/apple`, `social/apple-mono`, `social/discord`, `social/discord-mono`, `social/dribbble`, `social/dribbble-mono`, `social/facebook`, `social/facebook-mono`, `social/figma`, `social/figma-mono`, `social/github`, `social/github-mono`, `social/google`, `social/google-mono`, `social/instagram`, `social/instagram-mono`, `social/linkedin`, `social/linkedin-mono`, `social/medium`, `social/medium-mono`, `social/messenger`, `social/messenger-mono`, `social/pinterest`, `social/pinterest-mono`, `social/reddit`, `social/reddit-mono`, `social/snapchat`, `social/snapchat-mono`, `social/spotify`, `social/spotify-mono`, `social/tiktok`, `social/tiktok-mono`, `social/tumblr`, `social/tumblr-mono`, `social/twitch`, `social/twitch-mono`, `social/whatsapp`, `social/whatsapp-mono`, `social/x`, `social/x-mono`, `social/youtube`, `social/youtube-mono` | at runtime | Which mark, as kind and provider: payment/visa, logo/apple-pay, provider/google, social/instagram-mono. The list is generated from the mark set, so an unknown name fails at compile time, and a provider added to the set reaches the list the day it lands. |

## Usage guidelines

Use a mark only to identify that provider's own service: the provider glyph on a sign-in button, the network mark in a card field, a social link in a footer. Pick the style for the ground it sits on (black on light grounds, white on dark), and never recolor, stretch or redraw it. A brand swaps the artwork by name, without changing the components that carry it.

### Do

- Use the full-color mark wherever the provider allows it
- Use a one-color mark only where the provider publishes one, in the provider's black or white
- Keep the mark's proportion: set the height, and let the width follow
- Hide a mark from assistive tech when the text beside it names the provider

### Don't

- Recolor a mark to match the brand palette or the theme
- Make a one-color mark by filling the full-color one with a single color
- Use a mark as the only way to say which provider, card or network is meant
- Use a mark for any purpose other than identifying that provider's service

## Accessibility

- **Focus:** None of its own. A mark takes no focus; the button or link around it does, with its own focus ring.
- **Screen readers:** img when it carries information on its own (with aria-label); none when decorative (aria-hidden="true")

  Decorative inside a control or link whose text names the provider ("Continue with Google", or a link labeled "Instagram"): leave label empty, which sets aria-hidden="true". Informative on its own, as in a row of accepted cards: set label to the provider's name ("Visa"), which sets role="img" and aria-label. Never name both the mark and the control around it. The provider's name is a proper noun and is not translated.

### WCAG

- 1.1.1 Non-text Content (a mark that informs gets a text alternative; a decorative one is hidden)
- 1.4.1 Use of Color (the brand a mark shows is also stated in text, as in a field's detected card type)

### Motion

- **Enter:** none
- **Exit:** none
- **Reduced motion:** Static. A mark has no motion of its own.

## Content guidelines

Name an informative mark with the provider's own name, spelled the way the provider spells it. A decorative mark takes no name.

- **Labels:** When it informs: the provider's own name, as the provider writes it ("Visa", "Apple Pay"). When decorative: no name.

## Related components

- **Instead, consider:** `icon`
- **Often used with:** `icon`, `link`, `button`, `card-number-field`, `wallet-button`
- **Replaces:**
  - provider logos pasted into a design as images
  - a provider logo recolored to match the palette

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | enum: BrandMarkName (`logo/affirm`, `logo/amazon-pay`, `logo/amex`, `logo/apple-pay`, `logo/diners-club`, `logo/discover`, `logo/google-pay`, `logo/klarna`, `logo/mastercard`, `logo/paypal`, `logo/paypal-wordmark`, `logo/shop-pay`, `logo/venmo`, `logo/visa`, `payment/affirm`, `payment/amazon-pay`, `payment/amex`, `payment/apple-pay`, `payment/diners-club`, `payment/discover`, `payment/generic`, `payment/google-pay`, `payment/klarna`, `payment/maestro`, `payment/mastercard`, `payment/paypal`, `payment/shop-pay`, `payment/venmo`, `payment/visa`, `provider/apple`, `provider/facebook`, `provider/google`, `social/apple`, `social/apple-mono`, `social/discord`, `social/discord-mono`, `social/dribbble`, `social/dribbble-mono`, `social/facebook`, `social/facebook-mono`, `social/figma`, `social/figma-mono`, `social/github`, `social/github-mono`, `social/google`, `social/google-mono`, `social/instagram`, `social/instagram-mono`, `social/linkedin`, `social/linkedin-mono`, `social/medium`, `social/medium-mono`, `social/messenger`, `social/messenger-mono`, `social/pinterest`, `social/pinterest-mono`, `social/reddit`, `social/reddit-mono`, `social/snapchat`, `social/snapchat-mono`, `social/spotify`, `social/spotify-mono`, `social/tiktok`, `social/tiktok-mono`, `social/tumblr`, `social/tumblr-mono`, `social/twitch`, `social/twitch-mono`, `social/whatsapp`, `social/whatsapp-mono`, `social/x`, `social/x-mono`, `social/youtube`, `social/youtube-mono`) | — | yes | Which mark, as kind and provider: payment/visa, logo/apple-pay, provider/google, social/instagram-mono. The list is generated from the mark set, so an unknown name fails at compile time, and a provider added to the set reaches the list the day it lands. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The height: 20, 24 or 32px, from the icon size tokens. The width follows from the mark's own proportion, so a payment tile stays 8 by 5 and a logo keeps its width. |
| `label` | string | — | no | The accessible name, when the mark carries information the page states nowhere else, as in a row of accepted cards: the mark then has role="img" and aria-label. Without a label it is decorative and hidden from assistive tech, which is right inside a button or link whose own text or label names the provider. |

## Specs

Generated from the plan that builds the design-file component: 74 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `glyph` | glyph | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

### Color

Keyed by `name`.

**name=payment/affirm**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/amazon-pay**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/amex**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/apple-pay**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/diners-club**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/discover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/generic**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/google-pay**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/klarna**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/maestro**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/mastercard**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/paypal**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/shop-pay**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/venmo**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

**name=payment/visa**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `glyph` | — | `color.border.primary` | — | — |

---

Generated from the `brand-mark` component definition.
