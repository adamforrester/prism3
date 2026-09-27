# Button

> Triggers an action in place, in the brand color. For navigation, use a link.

In-flow trigger for an action that happens now, in the current context — submit, save, confirm, open a dialog, fire async work — in the brand (primary) color, the expected look of a button. Not navigation (use link / link-button, even when it looks like a button), not a persistent binary (Switch.Row), not one-of-many selection (segmented-control / toggle-button). For a destructive or a weightless action, use the Button.Destructive / Button.Neutral sibling components.

- **ID:** `button`
- **Category:** form
- **Status:** draft
- **Also known as:** btn, cta

## Usage

Use for an immediate action in the current context — submit/save/reset a form, trigger a UI state change (open modal, toggle drawer), or fire async work. Color is the component (Button / Button.Destructive / Button.Neutral — pick by semantics); rank actions within a view by appearance (filled > outline > text), with exactly one filled button per view or region.

### Do

- Lead with a verb, name the object ("Publish post", not "Submit")
- Keep exactly one filled button per view; demote the rest to outline / text, so a view of three actions is three buttons at three appearances rather than three fills competing
- Set surface=inverse for a button on a dark or brand-filled band, so its fill, ink, border and disabled treatment bind the inverse counterparts instead of losing contrast against the flipped ground
- Place the icons the way the brand's `buttonIcons` setting says; `attached` (Attached to label, the default) keeps them beside the label with the group centered
- Under `buttonIcons: edges` (Locked to edges), position each icon absolutely at the visual padding from its edge, pad that side by the padding + the icon + the gap, and center the label in the space left — a button with only a trailing icon has its label slightly left of center, and a long label still widens the button
- Give every size a minimum width of its height × the brand's `buttonMinWidthMultiplier` (2.25 by default), rounded up to a multiple of 8px — 88, 104 and 128px at heights of 36, 44 and 56px — in both icon placements, so a short label never makes a stubby button
- On a brand whose `buttonContentSize` is `smaller` (One step smaller), give a medium button the small size's label style and icon size (`type.label.sm.emphasis`, `icon.size.xs`) at the medium height and padding; small and large buttons keep their own
- Use isInactive (focusable) for a control blocked by satisfiable state; reserve disabled for the irrelevant

### Don't

- Use a button for navigation to a URL — use a link / link-button
- Stack multiple filled buttons competing for attention — differentiate rank by appearance, not by adding fills
- Use native disabled on a relevant-but-blocked control (dead end for keyboard/SR users)
- Remove the label to make room for a spinner — the button narrows mid-submit and screen readers lose the name; the spinner takes the leading visual's place, or overlays a label held at zero opacity

### Content guidelines

Verb-first, specific, sentence case, no terminal punctuation, ≤3 words to bound i18n expansion.

### Copy patterns

- **Labels:** Verb-first, action-specific, sentence case, ≤3 words. "Save changes" / "Delete file" — never "OK", "Submit", or "Click here".
- **Errors:** Button has no error state — surface failures in an adjacent inline-message / alert (errors belong to the form/field).
- **Dialogs:** Match the destructive verb to the consequence ("Delete", not "Confirm"). Cancel = abort+revert; Close/Dismiss = dismiss info; never "OK" on an error.

## Choosing it

- **Purpose:** Trigger an action in place.
- **Use when:** The user needs to DO something on this surface — submit, confirm, open, apply, or start async work.
- **Avoid when:** The target is a different location/URL → use a link (or link-button if it must look like a button). A persistent on/off state → use Switch.Row. One-of-many selection → use Radio.Group (or a segmented control, not built yet). A toggle with pressed state → use a toggle button (not built yet). Icon-only with no visible text → use IconButton (the accessible name is required there at the type level). The action deletes or removes something → use Button.Destructive. The action carries no brand emphasis (a toolbar control, a dense row) → use Button.Neutral.
- **Often used with:** `icon`, `spinner`, `focus-ring`
- **Keywords:** button, submit, cta, confirm, action, primary action, save
- **Generation priority:** 1

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `label` | node (label) | — | yes | Visible label; verb-first, sentence case, ≤3 words. Always required here — an icon-only control is the separate icon-button, which requires an accessible name instead. |
| `onClick` | function | — | no | Action handler. Suppressed while isPending or isInactive. |
| `appearance` | enum: 'filled' \| 'outline' \| 'text' | `filled` | no | Visual treatment over the color, decoupled from intent so the matrix scales by addition. filled = interactive fill + on-fill ink; outline = border + text ink; text = ink only. (Reconciled from solid/outline/plain.) |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Control size — drives height, padding, and label type. |
| `surface` | enum: 'default' \| 'inverse' | `default` | no | The ground the button sits on. `default` for a normal page; `inverse` for a dark or brand-filled band, where the button binds its `color.inverse.*` counterparts so fill, ink, border, overlay and the disabled treatment keep contrast against the flipped surface. A host that cannot know its ground picks `default`, and the designer sets `inverse` on the instance — the same answer the nested focus ring gives. |
| `fullWidth` | boolean | `false` | no | Stretch to container. Aliases: block / isFullWidth. |
| `type` | enum: 'button' \| 'submit' \| 'reset' | `button` | no | Opinionated default 'button' to neutralize the platform's submit-on-enter-in-form trap; require 'submit' explicitly. |
| `isPending` | boolean | `false` | no | Delays the spinner, preserves width, keeps focus (aria-disabled, not native disabled), suppresses re-fire, announces busy. Preferred over `loading`. |
| `isInactive` | boolean | `false` | no | Focusable disabled — visually muted, retains tab order, surfaces the blockage reason on focus. Use for a control blocked by satisfiable app state (e.g. submit on an incomplete form). |
| `disabled` | boolean | `false` | no | Native disabled. Reserved for controls fundamentally irrelevant to the current view; removes from tab order + a11y tree. Prefer isInactive for anything relevant-but-blocked. |
| `leadingVisual` | slot | — | no | Icon / avatar / counter / spinner before the label. |
| `trailingVisual` | slot | — | no | Icon / caret / indicator after the label. |
| `href` | string | — | no | Discouraged — prefer link-button. If set, the button renders an \<a>, which drops type and disabled semantics. |
| `aria-label` | string | — | no | Extends the visible label with context it does not carry ("Delete invoice 1042" on a "Delete" button). Start it with the visible text, so a voice-control user who speaks the label still activates the control (WCAG 2.5.3 Label in Name). |

## States

`rest`, `hover`, `focus-visible`, `pressed`, `pending`, `inactive`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `appearance` | `filled`, `outline`, `text` | at runtime |
| `size` | `small`, `medium`, `large` | once, when authored |
| `width` | `auto`, `full` | once, when authored |
| `surface` | `default`, `inverse` | once, when authored |

## Accessibility

- **Role:** button (native \<button>; never div[role=button] — it inherits Space/Enter activation, focus, and HC affordances for free)
- **WCAG:**
  - 1.4.11 Non-text Contrast (the focus ring and boundary at 3:1)
  - 2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed, kept through pending and inactive)
  - 2.4.13 Focus Appearance (AAA — the ring is offset from the edge, so a sliver of background separates it from the fill)
  - 2.5.3 Label in Name (an aria-label starts with the visible label text)
  - 2.5.8 Target Size (Minimum) (24×24 — small is 36px tall, 28px at compact density)
  - 2.5.5 Target Size (Enhanced) (44×44, as intent — medium clears 44px at comfortable and spacious density and misses it at compact (36px); small clears it only at spacious (44px); reaching 44 elsewhere is a code-side hit-area expansion)
  - 4.1.2 Name/Role/Value (native \<button>: the label is the name, the role is button, and state rides aria-disabled, aria-busy and aria-pressed)
- **Keyboard:** Native \<button>: Enter activates on keydown, Space on keyup. (This asymmetry vs a link — which activates on Enter only, Space scrolls — is exactly why a navigating "button" must be a real link.)
- **Focus:** A :focus-visible ring (color.border.focus) with an outline-offset so a sliver of background separates ring from border — it does not blend into the button's own fill (WCAG 1.4.11, target 3:1). Never suppressed. Focus is retained through pending and inactive (aria-disabled, not native disabled).
- **ARIA:** State attributes are distinct, not interchangeable: aria-pressed only for a toggle-button; aria-expanded (+ aria-haspopup) for a menu/disclosure trigger; aria-checked only for the switch role. Do not conflate them. Busy: while isPending, set aria-busy and announce via a polite live region ("Saving…") since a spinner is invisible to assistive tech; keep the control focusable so the busy state is discoverable. isInactive/isPending use aria-disabled (not native disabled) so focus and the explanatory name/description stay reachable. Localization (brief §9): the label wraps rather than truncating and has no fixed English width, the row mirrors under RTL through logical properties, and only directional glyphs flip.

## Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** State transitions (background, border, shadow) are meant to run ~100–150ms through the brand's motion tokens; this component binds none yet, so the timing is code-side. A subtle press (scale 0.98) gives tactile feedback. Under prefers-reduced-motion, resolve scale/translate to none but keep the instantaneous color change so the state stays perceivable; the pending spinner is functional and its busy state is carried by aria-busy regardless.

## Composition

- **Composes with:** `icon`, `focus-ring`, `spinner`
- **Alternative to:** `icon-button`, `switch-row`
- **Planned:** `tooltip`, `button-group`, `menu`, `popover`, `link`, `link-button`, `toggle-button`, `split-button`, `chip`
- **Replaces:**
  - input[type=button\|submit]
  - div[role=button]

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- touch-target-expansion — the optical box and the hit box are deliberately decoupled (::before / absolute overlay), reconciling the WCAG 2.5.8 24×24 floor with Apple HIG 44×44 without inflating a compact button. Figma has no concept of a hit area larger than the frame.
- focus-ring-offset — the ring GEOMETRY now projects (an absolute sibling nesting the shared `focus-ring`), but its position is FROZEN at paste: Figma's x/y accept no variable binding, so the payload resolves `focus.ring.offset` AND `focus.ring.width` to numbers, sums them, and writes the result (#801 — the ring's stroke is drawn INSIDE its own bounds, so the gap the brand asked for has to be widened by the stroke that eats it). Two names freeze exactly as one did. Every bound paint re-themes when a brand changes; an already-pasted ring does not move. AND A REBUILD DOES NOT MOVE IT EITHER, which is the half worth writing down: the executor finds the set by name on the current page and skips each member by name, reporting `✓ already built` without writing any geometry — so to pick up a corrected ring position you must DELETE the existing component set, or build onto a fresh page. This is not specific to the ring; it is true of any geometry, paint or constraint change to an already-pasted set, and it is tracked as #827 because name-based idempotence cannot tell "already built correctly" from "built by an older engine". The `:focus-visible` CONDITION remains unprojectable — Figma carries the ring as a variant coordinate a designer selects, not as a state a pointer triggers.
- focus-ring STROKE, WIDTH and RADIUS — owned by the nested `focus-ring` component, not by this def. `focus-ring`, `ring-width` and `ring-offset` are bound in `tokens`, and since #801 BOTH numbers reach a Figma node as this def's own absolute geometry: the host positions the part at -(offset + width), because the ring draws its stroke inside its own bounds and would otherwise consume the whole gap. Since #1266 the width reaches the RING's node too, as its bound `strokeWeight` — so the compensation and the stroke it compensates for are finally the same number, which for three releases they were not. So this def verifies that a ring is nominated and where it sits, including the compensation that makes "where" visible, and nothing more. Sharing the ring is still the right call — the ring is one shared thing (`focus.ring.*` and `color.border.focus` are top-level families) and authoring it N ways in N hosts would be worse. But the UNGATED PART IS NOT A CONSEQUENCE OF SHARING IT, which is what this entry once claimed: it is projector and schema gaps, neither of them a trade anybody made. ALL THREE are now CLOSED, and what took the third one's place is smaller than the third one was. PAINT (closed #758 → #784): `paintOf` once keyed every lookup as `{intent}.{appearance}.{slot}`, so a def whose axes are surface/tone resolved nothing; #758 replaced that with each def's own `paintKeys` and #784 corrected the ring's keys to the slot vocabulary the projector dispatches. STRUCTURE (closed #795): this entry said `figmaAnatomySet` refuses any variant axis outside intent/appearance/size and `planComponentName` always writes a `size=` coordinate the ring has no axis for, so a ring member could never match the coordinate this def nests by — #795 deleted the axis list and made `size=` conditional on the def declaring `size`, and `focus-ring` now projects two members named exactly `surface=default` / `surface=inverse`, which is what this def's `nesting: { variant: { surface: 'default' }, follow: ['surface'] }` asks for (re-verified against `nestVariantMatch`). STROKE WIDTH (closed #1266): `PartDef` gained `strokeWidth`, `focus-ring`'s `ring` part binds it, and every projected member carries a bound `strokeWeight`. Before it, both executors fell through to `if (!node.strokeWeight) … = 1` and the ring pasted at 1px in every brand — half its declared thickness, and 3px of visible gap where 2 was designed, because the compensation above had already assumed 2. What is LEFT is one keyword: `PartDef` has no field for a stroke's style, and cannot usefully have one, because Figma expresses `solid`/`dashed` as a `dashPattern` of pixel runs rather than as a keyword — so `focus.ring.style` resolves against every brand and has nowhere to bind. A schema decision under #740. Read the remaining gap as "the ring pastes without its dash style", not as "the ring pastes without its stroke".
- min-width derivation — a literal per size at build (#1667): height × multiplier, rounded up to 8px, from baseline-density heights. Frozen, not live; a per-mode density keeps the baseline floor.
- Locked to edges (#1667) — in code, padding plus absolutely positioned icons: the button keeps `inline-size: auto` above its `min-inline-size` floor, each icon side pads by `calc(padding-x-visual + icon + gap)`, and the icons sit `position: absolute` at `padding-x-visual` from their edge, vertically centered, so the label centers in the space beside them. Figma holds the same shape with the reserve and the inset as literal px per size (its padding binds one variable, not a sum), so a brand change reaches them only on a rebuild, as with the floor.
- width (auto \| full) — declared as a variant axis but deliberately NOT projected into Figma (#487 §4). A designer resizes an auto-layout frame; a variant axis for it doubles the whole set to buy nothing a drag does not already do.
- Label overflow (brief §9) — the label wraps to a second line rather than truncating, since an ellipsis hides the action. The button takes no fixed English width: `min-inline-size` plus padding, so a German or Finnish label widens it. Figma holds one line of placeholder text, so neither rule projects.
- RTL mirroring (brief §9) — logical properties (`padding-inline`, `margin-inline`, flex `gap`) mirror the whole row, so the leading and trailing visuals swap sides on their own. Only directional glyphs (back and forward chevrons) flip, set per icon (`autoMirror`), never a blanket `scaleX(-1)` on the slot; search, settings and media-transport glyphs stay as drawn.
- Press behavior (brief §11) — built on a headless press primitive (React Aria `usePress`, Atlassian `Pressable`) that normalizes mouse, touch, keyboard and pointer, with the visual tokens owned here. No `overrides` surface into internal nodes: strict token mapping and headless composition instead.
- Form integration (brief §11) — inside a `<form action>`, `useFormStatus` sets `isPending` while the action is in flight. The component forwards `ref` and spreads rest props onto the underlying element, which tooltip and popover anchoring depend on.
- inactive — a real state (isInactive), deliberately NOT a Figma variant. Its whole delta from `disabled` is behavioral: it retains tab order, keeps the control in the a11y tree, carries aria-disabled rather than the native attribute, and surfaces the blockage reason on focus. None of that is paint, so a variant has nothing to encode. At the TOKEN tier its intended visual is `disabled`'s by an explicit decision (docs/03 item 3, resolved 2026-06-24: `disabledStrategy: 'accessible'` IS the KB's contrast-preserving `inactive`; docs/06 defines `text.disabled` as "disabled / inactive ink"). The EMITTER does not implement that yet — `anatomy-figma.ts` special-cases `state === 'disabled'` only, so `inactive` falls through to the `rest` paints, which is worse than a duplicate: the column would have read as a normal enabled button. Either way it is unprojectable, and the two facts fail it independently.

---

Generated from the `button` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
