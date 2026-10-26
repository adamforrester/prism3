# BrandMark

> A provider's own mark, in its own colors: sign-in, wallet, card and social. Never retinted.

- **ID:** `brand-mark`
- **Category:** foundations
- **Status:** draft
- **Also known as:** logo-mark, provider-logo, payment-mark, social-mark

## Overview

A provider's mark, drawn as the provider supplies it: the glyph a sign-in or wallet button carries, a card network's mark in a payment field, a social network's mark in a footer link. The colors are the provider's and never change with the theme. A one-color form is its own mark, drawn by the provider, and exists only where the provider publishes one. Square marks are 24 by 24, card marks 32 by 20, and wallet lockups 24 high at the provider's width.

- **Purpose:** Show a provider's mark, in the provider's colors and proportion, decorative or named.
- **Use when:** Wherever a provider's service is named: in a sign-in or wallet button, a card field or a social link, and on its own, named by label, in a row of accepted cards.
- **Avoid when:** For a generic concept glyph, use Icon: a mark identifies one provider and is never retinted. Never as a button on its own: a sign-in or social action is a button or link whose label names the provider, with the mark inside it, decorative. Never for a provider whose artwork is not in the set.

## Anatomy

Shown on the default member: name `card/amex`.

1. **Glyph** — The mark itself, on its kind's artboard, in the provider's colors. It takes no ink from the component around it.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `name` | `card/amex`, `card/generic`, `card/mastercard`, `card/visa`, `provider/apple`, `provider/apple-white`, `provider/facebook`, `provider/google`, `social/facebook`, `social/facebook-mono`, `social/instagram`, `social/instagram-mono`, `social/x-mono`, `wallet/apple-pay-black`, `wallet/apple-pay-white`, `wallet/google-pay-black`, `wallet/google-pay-white`, `wallet/paypal`, `wallet/shop-pay` | at runtime | Which mark, as kind and provider: card/visa, provider/google, social/instagram-mono. The list is generated from the mark set, so an unknown name fails at compile time, and a provider added to the set reaches the list the day it lands. |

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
- **Often used with:** `icon`, `link`, `button`
- **Replaces:**
  - provider logos pasted into a design as images
  - a provider logo recolored to match the palette

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | enum: BrandMarkName (`card/amex`, `card/generic`, `card/mastercard`, `card/visa`, `provider/apple`, `provider/apple-white`, `provider/facebook`, `provider/google`, `social/facebook`, `social/facebook-mono`, `social/instagram`, `social/instagram-mono`, `social/x-mono`, `wallet/apple-pay-black`, `wallet/apple-pay-white`, `wallet/google-pay-black`, `wallet/google-pay-white`, `wallet/paypal`, `wallet/shop-pay`) | — | yes | Which mark, as kind and provider: card/visa, provider/google, social/instagram-mono. The list is generated from the mark set, so an unknown name fails at compile time, and a provider added to the set reaches the list the day it lands. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The height: 20, 24 or 32px, from the icon size tokens. The width follows from the mark's own proportion, so a card mark stays 8 by 5 and a wallet lockup keeps its width. |
| `label` | string | — | no | The accessible name, when the mark carries information the page states nowhere else, as in a row of accepted cards: the mark then has role="img" and aria-label. Without a label it is decorative and hidden from assistive tech, which is right inside a button or link whose own text or label names the provider. |

## Specs

Generated from the plan that builds the design-file component: 19 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `glyph` | glyph | every member |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by nothing: one row covers every member.

### Color

Keyed by `name`.

---

Generated from the `brand-mark` component definition.
