# Button.Neutral

> Triggers an action with no brand emphasis — toolbars, dense rows.

- **ID:** `button-neutral`
- **Category:** form
- **Status:** draft
- **Also known as:** btn, cta

## Overview

In-flow trigger for an action that carries no brand weight — a toolbar control, a dense table row, a low-stakes secondary action — in the neutral color. Reach for it when the control genuinely has no brand emphasis to carry, not merely because it is secondary in rank (rank is the appearance axis: a secondary primary action is the Button at appearance=outline). Same anatomy as Button.

- **Purpose:** Trigger an action in place.
- **Use when:** The user needs to act on this surface — submit, confirm, open, apply, or start async work.
- **Avoid when:** The target is a different location/URL → use Link (or give the button an href, which renders an \<a>, if it must look like a button). A persistent on/off state → use Switch.Row. One-of-many selection → use Radio.Group (or SegmentedControl). A toggle with pressed state → use a toggle button (not built yet). Icon-only with no visible text → use IconButton (the accessible name is required there at the type level). The action is the view's main one or carries the brand → use Button. It deletes or removes something → use Button.Destructive.

## Anatomy

Shown on the default member: appearance `filled`, size `medium`, width `auto`, surface `default`, inset `default`.

1. **Leading visual** (optional) — Icon / avatar / counter / spinner before the label.
2. **Label** — Its own node so truncation, wrap and line-height are controllable independently of the row.
3. **Trailing visual** (optional)
4. **Spinner**
5. **Focus ring**

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `appearance` | `filled`, `outline`, `text` | at runtime | Visual treatment over the color, decoupled from intent so the matrix scales by addition. filled = interactive fill + on-fill ink; outline = border + text ink; text = ink only. (Reconciled from solid/outline/plain.) |
| `size` | `medium`, `small`, `large` | once, when authored | Control size — drives height, padding, and label type. |
| `width` | `auto`, `full` | once, when authored | — |
| `surface` | `default`, `inverse` | once, when authored | The ground the button sits on. default for a normal page; inverse for a dark or brand-filled band, where the button binds its color.inverse counterparts so fill, ink, border, overlay and the disabled treatment keep contrast against the flipped surface. A host that cannot know its ground picks default, and the designer sets inverse on the instance — the same answer the nested focus ring gives. |
| `inset` | `default`, `flush` | once, when authored | Text appearance only. flush removes the inline padding on both sides, so the label lines up with the content edge above and below it, whether the button starts, ends or centers a row. A flush button hovers by color only, and its hit target keeps its height. |

### States

`rest`, `hover`, `pressed`, `pending`, `focus-visible`, `disabled`, `inactive`

## Usage guidelines

Use for an immediate action in the current context — submit/save/reset a form, trigger a UI state change (open modal, toggle drawer), or fire async work. Color is the component (Button / Button.Destructive / Button.Neutral — pick by semantics); rank actions within a view by appearance (filled > outline > text), with exactly one filled button per view or region.

### Do

- Lead with a verb, name the object ("Publish post", not "Submit")
- Keep exactly one filled button per view; demote the rest to outline / text, so a view of three actions is three buttons at three appearances rather than three fills competing
- Set surface=inverse for a button on a dark or brand-filled band, so its fill, ink, border and disabled treatment bind the inverse counterparts instead of losing contrast against the flipped ground
- Place the icons the way the brand's `buttonIcons` setting says; `attached` (Attached to label, the default) keeps them beside the label with the group centered
- Under `buttonIcons: edges` (Locked to edges), position each icon absolutely at the visual padding from its edge, pad that side by the padding + the icon + the gap, and center the label in the space left — a button with only a trailing icon has its label slightly left of center, and a long label still widens the button
- Give every size a minimum width of its height × the brand's `buttonMinWidthMultiplier` (2.25 by default), rounded up to a multiple of 8px — 88, 104 and 128px at heights of 36, 44 and 56px — in both icon placements, so a short label never makes a stubby button
- On a brand whose `buttonContentSize` is `smaller` (Small), give a medium button the small size's label style and icon size (`type.label.sm.emphasis`, `icon.size.xs`) at the medium height and padding; small and large buttons keep their own
- On a brand whose `buttonLabelWeight` is `default` (Default), set every size's label in the `default` weight of its label style (`type.label.sm.default`, `type.label.md.default`, `type.label.lg.default`) instead of `emphasis`; with Small, a medium button takes `type.label.sm.default`
- Underline the label of a button at appearance=text, at rest and in every state, disabled included, with its underlined label style (`type.label.sm.emphasis-link`, `type.label.md.emphasis-link`, `type.label.lg.emphasis-link`); the underline is fixed, not a brand setting
- Never fill a button at appearance=text at rest; under the brand's `buttonTextHover` setting `text` (Text & icon only, the default), change only its label and icon colors on hover and pressed
- On a brand whose `buttonTextHover` is `fill` (Fill), also give a button at appearance=text the overlay wash on hover and pressed, as outline buttons take it
- Set inset=flush on a button at appearance=text that starts, ends or centers a row of content, so its label lines up with the content edge; give it `padding-inline: 0` and no `min-inline-size`, and, at medium and large sizes, extend its hit area to at least 44×44px with a transparent `::before` inset outward and centered on the label, so the target clears 44px while the box stays label-width; extend it the same way to at least 24×24px at small
- Never fill a flush button on hover or pressed, whatever the brand's `buttonTextHover` is: with no padding the fill would hug the label; only its label and icon colors change
- Use isInactive (focusable) for a control blocked by satisfiable state; reserve disabled for the irrelevant

### Don't

- Set inset=flush on a filled or outline button — their visible edge needs its padding; flush is for appearance=text
- Use a button with no href for navigation to a URL — use Link, or give the button an href so it renders an \<a>
- Stack multiple filled buttons competing for attention — differentiate rank by appearance, not by adding fills
- Use native disabled on a relevant-but-blocked control (a dead end for keyboard and screen reader users)
- Remove the label to make room for a spinner — the button narrows mid-submit and screen readers lose the name; the spinner takes the leading visual's place, or overlays a label held at zero opacity

## Accessibility

- **Keyboard:** Native \<button>: Enter activates on keydown, Space on keyup. (This asymmetry vs a link — which activates on Enter only, Space scrolls — is exactly why a navigating "button" must be a real link.)
- **Focus:** A :focus-visible ring (color.border.focus) with an outline-offset so a sliver of background separates ring from border — it does not blend into the button's own fill (WCAG 1.4.11, target 3:1). Never suppressed. Focus is retained through pending and inactive (aria-disabled, not native disabled).
- **Screen readers:** button (native \<button>; never div[role=button] — it inherits Space/Enter activation, focus, and high-contrast affordances for free)

  State attributes are distinct, not interchangeable: aria-pressed only for a toggle-button; aria-expanded (+ aria-haspopup) for a menu/disclosure trigger; aria-checked only for the switch role. Do not conflate them. Busy: while isPending, set aria-busy and announce via a polite live region ("Saving…"), and set aria-hidden="true" on the embedded spinner, which otherwise announces its own "Loading" status (a double announcement); keep the control focusable so the busy state is discoverable. isInactive/isPending use aria-disabled (not native disabled) so focus and the explanatory name/description stay reachable. Localization: the label wraps rather than truncating and has no fixed English width, the row mirrors under RTL through logical properties, and only directional glyphs flip.

### WCAG

- 1.4.11 Non-text Contrast (the focus ring and boundary at 3:1)
- 2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed, kept through pending and inactive)
- 2.4.13 Focus Appearance (AAA — the ring is offset from the edge, so a sliver of background separates it from the fill)
- 2.5.3 Label in Name (an aria-label starts with the visible label text)
- 2.5.8 Target Size (Minimum) (24×24 — small is 36px tall, 28px at compact density)
- 2.5.5 Target Size (Enhanced) (44×44, as intent — medium clears 44px at comfortable and spacious density and misses it at compact (36px); small clears it only at spacious (44px); reaching 44 elsewhere is a code-side hit-area expansion)
- 4.1.2 Name/Role/Value (native \<button>: the label is the name, the role is button, and state rides aria-disabled, aria-busy and aria-pressed)

### Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** State transitions (background, border, shadow) are meant to run ~100–150ms through the brand's motion tokens; this component binds none yet, so the timing is code-side. A subtle press (scale 0.98) gives tactile feedback. Under prefers-reduced-motion, resolve scale/translate to none but keep the instantaneous color change so the state stays perceivable; the pending spinner is functional and its busy state is carried by aria-busy regardless.

## Content guidelines

Verb-first, specific, sentence case, no terminal punctuation, ≤3 words to bound i18n expansion.

- **Labels:** Verb-first, action-specific, sentence case, ≤3 words. "Save changes" / "Delete file" — never "OK", "Submit", or "Click here".
- **Errors:** Button has no error state — surface failures in an adjacent inline-message / alert (errors belong to the form/field).
- **Dialogs:** Match the destructive verb to the consequence ("Delete", not "Confirm"). Cancel = abort+revert; Close/Dismiss = dismiss info; never "OK" on an error.

## Related components

- **Built from:** `focus-ring`, `spinner`
- **Instead, consider:** `icon-button-neutral`, `switch-row`
- **Often used with:** `icon`, `button-group`
- **Replaces:**
  - input[type=button\|submit]
  - div[role=button]

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | node (label) | — | yes | Visible label; verb-first, sentence case, ≤3 words. Always required here — an icon-only control is the separate icon-button, which requires an accessible name instead. |
| `onClick` | function | — | no | Action handler. Suppressed while isPending or isInactive. |
| `appearance` | enum: 'filled' \| 'outline' \| 'text' | `filled` | no | Visual treatment over the color, decoupled from intent so the matrix scales by addition. filled = interactive fill + on-fill ink; outline = border + text ink; text = ink only. (Reconciled from solid/outline/plain.) |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Control size — drives height, padding, and label type. |
| `surface` | enum: 'default' \| 'inverse' | `default` | no | The ground the button sits on. default for a normal page; inverse for a dark or brand-filled band, where the button binds its color.inverse counterparts so fill, ink, border, overlay and the disabled treatment keep contrast against the flipped surface. A host that cannot know its ground picks default, and the designer sets inverse on the instance — the same answer the nested focus ring gives. |
| `inset` | enum: 'default' \| 'flush' | `default` | no | Text appearance only. flush removes the inline padding on both sides, so the label lines up with the content edge above and below it, whether the button starts, ends or centers a row. A flush button hovers by color only, and its hit target keeps its height. |
| `fullWidth` | boolean | `false` | no | Stretch to container. Aliases: block / isFullWidth. |
| `type` | enum: 'button' \| 'submit' \| 'reset' | `button` | no | Opinionated default 'button' to neutralize the platform's submit-on-enter-in-form trap; require 'submit' explicitly. |
| `isPending` | boolean | `false` | no | Delays the spinner, preserves width, keeps focus (aria-disabled, not native disabled), suppresses re-fire, announces busy. Preferred over a loading prop. |
| `isInactive` | boolean | `false` | no | Focusable disabled — visually muted, retains tab order, surfaces the blockage reason on focus. Use for a control blocked by satisfiable app state (e.g. submit on an incomplete form). |
| `disabled` | boolean | `false` | no | Native disabled. Reserved for controls fundamentally irrelevant to the current view; removes from tab order + a11y tree. Prefer isInactive for anything relevant-but-blocked. |
| `leadingVisual` | slot | — | no | Icon / avatar / counter / spinner before the label. |
| `trailingVisual` | slot | — | no | Icon / caret / indicator after the label. |
| `href` | string | — | no | A destination, for a navigation that needs a button's weight, such as "Continue to checkout". With an href, the button renders an \<a href> in the same style, Enter follows it, and type and disabled no longer apply. Anything lighter is a Link. |
| `aria-label` | string | — | no | Extends the visible label with context it does not carry ("Delete invoice 1042" on a "Delete" button). Start it with the visible text, so a voice-control user who speaks the label still activates the control (WCAG 2.5.3 Label in Name). |

## Specs

Generated from the plan that builds the design-file component: 576 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/label` | text | every member |
| `container/leadingVisual` | swap | 240 of 576 members |
| `container/trailingVisual` | swap | 264 of 576 members |
| `container/spinner` | swap | state=pending |
| `container/focusRing` | instance | state=focus-visible |

Code-only states, with no design-file member: `inactive`.

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `leading`, `trailing`, `inset`.

**size=medium, leading=false, trailing=false, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.200` | `space.100` | `size.md.height` | — | 104px (derived: height × multiplier, rounded up to 8px) | — |
| `container/spinner` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=medium, leading=true, trailing=false, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.150` | `space.100` | `size.md.height` | — | 104px (derived: height × multiplier, rounded up to 8px) | — |
| `container/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/spinner` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=medium, leading=false, trailing=true, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.150` / `space.100` / `space.200` | `space.100` | `size.md.height` | — | 104px (derived: height × multiplier, rounded up to 8px) | — |
| `container/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/spinner` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=medium, leading=true, trailing=true, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.150` / `space.100` / `space.150` | `space.100` | `size.md.height` | — | 104px (derived: height × multiplier, rounded up to 8px) | — |
| `container/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/spinner` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=small, leading=false, trailing=false, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.200` / `space.075` / `space.200` | `space.100` | `size.sm.height` | — | 88px (derived: height × multiplier, rounded up to 8px) | — |
| `container/spinner` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=small, leading=true, trailing=false, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.200` / `space.075` / `space.150` | `space.100` | `size.sm.height` | — | 88px (derived: height × multiplier, rounded up to 8px) | — |
| `container/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/spinner` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=small, leading=false, trailing=true, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.150` / `space.075` / `space.200` | `space.100` | `size.sm.height` | — | 88px (derived: height × multiplier, rounded up to 8px) | — |
| `container/trailingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/spinner` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=small, leading=true, trailing=true, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.150` / `space.075` / `space.150` | `space.100` | `size.sm.height` | — | 88px (derived: height × multiplier, rounded up to 8px) | — |
| `container/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/trailingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/spinner` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large, leading=false, trailing=false, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.300` / `space.100` / `space.300` | `space.150` | `size.lg.height` | — | 128px (derived: height × multiplier, rounded up to 8px) | — |
| `container/spinner` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=large, leading=true, trailing=false, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.300` / `space.100` / `space.200` | `space.150` | `size.lg.height` | — | 128px (derived: height × multiplier, rounded up to 8px) | — |
| `container/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/spinner` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=large, leading=false, trailing=true, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.300` | `space.150` | `size.lg.height` | — | 128px (derived: height × multiplier, rounded up to 8px) | — |
| `container/trailingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/spinner` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=large, leading=true, trailing=true, inset=default**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.200` / `space.100` / `space.200` | `space.150` | `size.lg.height` | — | 128px (derived: height × multiplier, rounded up to 8px) | — |
| `container/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/trailingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/spinner` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=medium, leading=false, trailing=false, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.100` | `size.md.height` | — | — | — |
| `container/spinner` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=medium, leading=true, trailing=false, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.100` | `size.md.height` | — | — | — |
| `container/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/spinner` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=medium, leading=false, trailing=true, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.100` | `size.md.height` | — | — | — |
| `container/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/spinner` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=medium, leading=true, trailing=true, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.100` | `size.md.height` | — | — | — |
| `container/leadingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/trailingVisual` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/spinner` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=small, leading=false, trailing=false, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.0` / `space.075` / `space.0` | `space.100` | `size.sm.height` | — | — | — |
| `container/spinner` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=small, leading=true, trailing=false, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.0` / `space.075` / `space.0` | `space.100` | `size.sm.height` | — | — | — |
| `container/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/spinner` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=small, leading=false, trailing=true, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.0` / `space.075` / `space.0` | `space.100` | `size.sm.height` | — | — | — |
| `container/trailingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/spinner` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=small, leading=true, trailing=true, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.075` / `space.0` / `space.075` / `space.0` | `space.100` | `size.sm.height` | — | — | — |
| `container/leadingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/trailingVisual` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |
| `container/spinner` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large, leading=false, trailing=false, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.150` | `size.lg.height` | — | — | — |
| `container/spinner` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=large, leading=true, trailing=false, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.150` | `size.lg.height` | — | — | — |
| `container/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/spinner` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=large, leading=false, trailing=true, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.150` | `size.lg.height` | — | — | — |
| `container/trailingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/spinner` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=large, leading=true, trailing=true, inset=flush**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.150` | `size.lg.height` | — | — | — |
| `container/leadingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/trailingVisual` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/spinner` | — | — | `icon.size.md` | `icon.size.md` | — | — |

### Type

Keyed by `size`, `appearance`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium, appearance=filled | `container/label` | `type.label.md.emphasis` |
| size=small, appearance=filled | `container/label` | `type.label.sm.emphasis` |
| size=large, appearance=filled | `container/label` | `type.label.lg.emphasis` |
| size=medium, appearance=outline | `container/label` | `type.label.md.emphasis` |
| size=small, appearance=outline | `container/label` | `type.label.sm.emphasis` |
| size=large, appearance=outline | `container/label` | `type.label.lg.emphasis` |
| size=medium, appearance=text | `container/label` | `type.label.md.emphasis-link` |
| size=small, appearance=text | `container/label` | `type.label.sm.emphasis-link` |
| size=large, appearance=text | `container/label` | `type.label.lg.emphasis-link` |

### Color

Keyed by `appearance`, `surface`, `inset`, `state`.

**appearance=filled, surface=default, inset=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.fill.rest` | — | — | — |
| `container/label` | — | — | `color.interactive.neutral.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.on-fill` |

**appearance=filled, surface=default, inset=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.fill.hover` | — | — | — |
| `container/label` | — | — | `color.interactive.neutral.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.on-fill` |

**appearance=filled, surface=default, inset=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.fill.pressed` | — | — | — |
| `container/label` | — | — | `color.interactive.neutral.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.on-fill` |

**appearance=filled, surface=default, inset=default, state=pending**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.fill.rest` | — | — | — |
| `container/label` | — | — | `color.interactive.neutral.on-fill` | — |
| `container/spinner` | — | — | — | `color.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.on-fill` |

**appearance=filled, surface=default, inset=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.fill.rest` | — | — | — |
| `container/label` | — | — | `color.interactive.neutral.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.on-fill` |

**appearance=filled, surface=default, inset=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.disabled.fill` | — | — | — |
| `container/label` | — | — | `color.disabled.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.disabled.on-fill` |
| `container/trailingVisual` | — | — | — | `color.disabled.on-fill` |

**appearance=filled, surface=inverse, inset=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.interactive.neutral.fill.rest` | — | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.on-fill` |

**appearance=filled, surface=inverse, inset=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.interactive.neutral.fill.hover` | — | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.on-fill` |

**appearance=filled, surface=inverse, inset=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.interactive.neutral.fill.pressed` | — | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.on-fill` |

**appearance=filled, surface=inverse, inset=default, state=pending**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.interactive.neutral.fill.rest` | — | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.on-fill` | — |
| `container/spinner` | — | — | — | `color.inverse.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.on-fill` |

**appearance=filled, surface=inverse, inset=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.interactive.neutral.fill.rest` | — | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.on-fill` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.on-fill` |

**appearance=filled, surface=inverse, inset=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.disabled.fill` | — | — | — |
| `container/label` | — | — | `color.inverse.disabled.on-fill` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.disabled.on-fill` |
| `container/trailingVisual` | — | — | — | `color.inverse.disabled.on-fill` |

**appearance=outline, surface=default, inset=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**appearance=outline, surface=default, inset=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.hover` | `color.interactive.neutral.border.hover` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |

**appearance=outline, surface=default, inset=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.interactive.neutral.overlay.pressed` | `color.interactive.neutral.border.pressed` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |

**appearance=outline, surface=default, inset=default, state=pending**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/spinner` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**appearance=outline, surface=default, inset=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.interactive.neutral.border.rest` | — | — |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**appearance=outline, surface=default, inset=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.disabled.border` | — | — |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/trailingVisual` | — | — | — | `color.disabled.icon` |

**appearance=outline, surface=inverse, inset=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.inverse.interactive.neutral.border.rest` | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |

**appearance=outline, surface=inverse, inset=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.interactive.neutral.overlay.hover` | `color.inverse.interactive.neutral.border.hover` | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.hover` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.hover` |

**appearance=outline, surface=inverse, inset=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.inverse.interactive.neutral.overlay.pressed` | `color.inverse.interactive.neutral.border.pressed` | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.pressed` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.pressed` |

**appearance=outline, surface=inverse, inset=default, state=pending**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.inverse.interactive.neutral.border.rest` | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.rest` | — |
| `container/spinner` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |

**appearance=outline, surface=inverse, inset=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.inverse.interactive.neutral.border.rest` | — | — |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |

**appearance=outline, surface=inverse, inset=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | — | `color.inverse.disabled.border` | — | — |
| `container/label` | — | — | `color.inverse.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.disabled.icon` |
| `container/trailingVisual` | — | — | — | `color.inverse.disabled.icon` |

**appearance=text, surface=default, inset=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**appearance=text, surface=default, inset=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |

**appearance=text, surface=default, inset=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |

**appearance=text, surface=default, inset=default, state=pending**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/spinner` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**appearance=text, surface=default, inset=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**appearance=text, surface=default, inset=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/trailingVisual` | — | — | — | `color.disabled.icon` |

**appearance=text, surface=default, inset=flush, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**appearance=text, surface=default, inset=flush, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.hover` |

**appearance=text, surface=default, inset=flush, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.pressed` |

**appearance=text, surface=default, inset=flush, state=pending**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/spinner` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**appearance=text, surface=default, inset=flush, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.interactive.neutral.icon.rest` |

**appearance=text, surface=default, inset=flush, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.disabled.icon` |
| `container/trailingVisual` | — | — | — | `color.disabled.icon` |

**appearance=text, surface=inverse, inset=default, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |

**appearance=text, surface=inverse, inset=default, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.hover` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.hover` |

**appearance=text, surface=inverse, inset=default, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.pressed` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.pressed` |

**appearance=text, surface=inverse, inset=default, state=pending**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.rest` | — |
| `container/spinner` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |

**appearance=text, surface=inverse, inset=default, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |

**appearance=text, surface=inverse, inset=default, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.disabled.icon` |
| `container/trailingVisual` | — | — | — | `color.inverse.disabled.icon` |

**appearance=text, surface=inverse, inset=flush, state=rest**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |

**appearance=text, surface=inverse, inset=flush, state=hover**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.hover` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.hover` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.hover` |

**appearance=text, surface=inverse, inset=flush, state=pressed**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.pressed` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.pressed` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.pressed` |

**appearance=text, surface=inverse, inset=flush, state=pending**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.rest` | — |
| `container/spinner` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |

**appearance=text, surface=inverse, inset=flush, state=focus-visible**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.interactive.neutral.text.rest` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |
| `container/trailingVisual` | — | — | — | `color.inverse.interactive.neutral.icon.rest` |

**appearance=text, surface=inverse, inset=flush, state=disabled**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/label` | — | — | `color.inverse.disabled.text` | — |
| `container/leadingVisual` | — | — | — | `color.inverse.disabled.icon` |
| `container/trailingVisual` | — | — | — | `color.inverse.disabled.icon` |

### Nesting and properties

- `container/leadingVisual` is a swap slot, property `↳ swap leading icon`
- `container/trailingVisual` is a swap slot, property `↳ swap trailing icon`
- `container/spinner` holds `spinner/small`, `spinner/x-small`, `spinner/medium`, by member; it is not a swap
- `container/focusRing` nests `focus-ring` at `surface=default`; follows `surface`

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Button` |
| `↳ swap leading icon` | instance swap | — |
| `↳ swap trailing icon` | instance swap | — |

---

Generated from the `button-neutral` component definition.
