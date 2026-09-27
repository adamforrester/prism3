# FocusRing

> Keyboard-focus ring nested by focusable components. Build first; don't place alone.

The shared keyboard-focus indicator: a stroke drawn OUTSIDE its host's bounds, separated from them by an offset (2px for controls, so an unbroken sliver of background sits between the control's own border and the ring; 0 for fields, whose own border supplies the separation). Authored once and nested by every focusable component rather than re-drawn per host — the ring belongs to no single component, which is why its tokens are top-level families.

- **ID:** `focus-ring`
- **Category:** foundations
- **Status:** draft
- **Also known as:** focus-indicator, focus-outline

## Usage

Build this component first, then leave it to hosts: every focusable component nests it by name. Don't place it in a layout. In code it is an `outline` with `outline-offset`, so it survives forced-colors mode.

### Do

- Nest the shared ring rather than re-authoring a focus treatment per component
- Pick `surface: inverse` on a dark or brand-filled surface, where the default ring loses its 3:1 separation
- Pick `offset: field` for inputs, whose own border already supplies the separation
- Keep the ring outside the host's bounds and the host un-clipped, so the ring is never cut off (2.4.11)

### Don't

- Draw the ring on the host's own border — an outline appearance then has to give up its border for it, and the two contend for one stroke at different palette steps
- Remove the indicator without replacing it (the most common 2.4.7 failure)
- Render it for `:focus` rather than `:focus-visible` — a ring after every mouse click trains users to ignore it
- Implement it as a box-shadow: shadows are dropped in forced-colors mode and the indicator vanishes for the users who need it most
- Make it focusable or give it an ARIA role — it is presentational

## Choosing it

- **Purpose:** Render the shared keyboard-focus indicator for a focusable control.
- **Use when:** Nested by any component that can receive keyboard focus, as an absolute sibling — the host declares it and picks the surface and offset.
- **Avoid when:** As a standalone element, as a decorative outline, or as a hover/selected treatment. It is not a border and not an emphasis ring: rendering it outside `:focus-visible` destroys the one signal keyboard users navigate by. Never re-author a per-component focus treatment instead of nesting this — that is how a system ends up with N rings and N contrast bugs. "Standalone" here means placed in a layout: the component IS built on its own, because a host can only nest one that already exists.
- **Often used with:** `button`, `icon-button`, `text-field`, `select`, `checkbox-row`
- **Keywords:** focus ring, focus indicator, focus outline, focus visible, keyboard focus
- **Generation priority:** 2

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `surface` | enum: 'default' \| 'inverse' | `default` | no | The ground the ring is drawn against. `default` for a normal surface; `inverse` for a dark or brand-filled one, where the default ring would sit on a similar hue and lose its 3:1 separation. A host that cannot know its ground picks `default`; a host that carries its own `surface` axis passes it through (see Button), so the ring on a dark band is the inverse ring. |
| `offset` | enum: 'control' \| 'field' | `control` | no | How far outside the host the ring sits. `control` is the standard ≈2px gap; `field` is 0, because an input's own border already supplies the separation and a gap there reads as a double border. Two values because the token tier already emits exactly two (`focus.ring.offset` and `focus.ring.offset-field`). |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `surface` | `default`, `inverse` | once, when authored |
| `offset` | `control`, `field` | once, when authored |

## Accessibility

- **Role:** none — a presentational sibling. The ring has no role of its own; it renders the focus state of the control it surrounds.
- **WCAG:**
  - 2.4.7 Focus Visible (a visible indicator on every keyboard-focusable control)
  - 1.4.11 Non-text Contrast (the ring is gated at 3:1 against the page per mode, 4.5:1 in high contrast; against the control edge it depends on the host — the offset is what makes that achievable)
  - 2.4.11 Focus Not Obscured (the ring must not be clipped by an ancestor — hence `clipsContent: false`, and why an offset ring needs its host not to clip)
  - 2.4.13 Focus Appearance (AAA — the indicator's area and contrast floor; the offset and width tokens are what a brand tunes to meet it)
- **Focus:** This component IS the focus appearance. It is drawn for `:focus-visible` rather than `:focus`, so a pointer click does not raise it while keyboard navigation does — the distinction browsers make and the one a design system must not flatten. Never suppress it without replacing it: removing the indicator is the single most common 2.4.7 failure.
- **ARIA:** None, and that is a contract rather than an absence. The ring is presentational — the focus state is already conveyed by the platform focus itself, so an `aria-*` attribute here would announce something assistive tech already knows. It must never be given a role that makes it a stop in the tab order: a focusable focus ring is a node the user can land on with nothing to do.

## Composition

- **Composes with:** `button`, `icon-button`, `text-field`, `select`, `checkbox-row`
- **Planned:** `link`
- **Replaces:**
  - a per-component focus border
  - a box-shadow focus glow

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- offset — the context parameter (`control` ≈2px / `field` 0), and the one axis this def deliberately does NOT project (#795, decided on #801's measurement). Not a projector limit: the enumeration would carry it happily now that it reads `variantAxes`. The reason is that the offset is consumed by the HOST's `inset` binding and Figma's `x`/`y` accept no variable, so #801 measured the payload resolving it to a NUMBER at paste and writing that — an axis over it would ship two members differing only by a value the platform cannot hold, and a designer switching `offset=field` on an instance would see nothing move. So it stays a paste-time parameter the host supplies: `text-field`'s field-specific offset comes from the PARENT at paste, not from a coordinate on this set. An already-pasted ring does not re-position when a brand changes `focus.ring.offset`, unlike every bound paint, which re-themes.
- stroke style — `focus.ring.style` resolves against every emitted brand and there is no Figma property to bind it to. In CSS the ring is an `outline` and its style is a keyword (`solid`, `dashed`); Figma has no keyword, only `dashPattern`, an array of pixel runs — so projecting a `dashed` ring means inventing a rhythm the token does not carry, and projecting `solid` means writing nothing, which is what happens already. This entry is the REMAINDER of one that used to read "stroke weight and stroke color", and the narrowing is the record worth keeping: a stroke is three things and this def could express none of them, because `PartDef`'s vocabulary was gap / height / radius / size / type / inset / padding. COLOR left in #933 (`paintSlots` names the edge and the projector binds the paint) and WIDTH in #1266 (`PartDef.strokeWidth`, bound on the `ring` part above). What is left under #740 is one keyword, not the ring's visual substance — and Button's own ceiling entry described the whole thing as a deliberate trade, which it never was.
- the stroke, restated as the materialization ceiling — the def PROJECTS as of #795 (`figmaProperties` below declares `surface`, and the set builds two members with their ink bound), and what it projects is not yet a ring. Before #795 this entry said the def was deliberately not materializable because a `variantAxes: ['color']` block would validate and then throw; that is now false, and the honest replacement is narrower: nesting resolves by NAME against the live file (`compByName.get(n.nestTarget)`), so once the projected set is pasted, Button's `nests: 'focus-ring'` binds to OUR members rather than to a hand-built component — which closes the docs/14 §1 inversion for the NODE. #1266 closed it for the STROKE as well — each member carries `bound.strokeWeight -> focus/ring/width`, so "the members are strokeless" is no longer the right reading and was the reading two other files quoted. #1280 closed the last of it: the members carried no EXTENT, which made the def unbuildable and therefore unpublishable, and therefore un-nestable by the very hosts the nesting resolved for — a deadlock, admitted here for two releases as `figmaProperties.notStandalone`. A nominal square side closes it. What remains under this entry is one keyword and no geometry at all.
- :focus-visible condition — the ring appears on exactly one host state, and that state is a POINTER-vs-KEYBOARD distinction the browser makes at runtime. Figma has no state machine, so a projected ring is a variant coordinate a designer selects, never a state an interaction triggers. This is why Button's `focusRing` part declares `when: 'focus-visible'` — the condition has to be stated in the def, because nothing downstream can infer it.
- high-contrast / forced-colors — a focus indicator must survive a forced-colors mode that replaces every authored color, which in CSS means `outline` rather than a border or box-shadow (an outline is preserved where a shadow is dropped). Figma has no forced-colors concept and no outline primitive distinct from a stroke, so the one property that keeps the ring visible for the users who most depend on it cannot be expressed in the Figma leg at all.
- the 3:1 adjacent-contrast contract — 1.4.11 requires the ring to clear 3:1 against BOTH the surface behind it and the control edge beside it, which is a relationship between three colors resolved per host and per mode. The `surface` axis is the design's answer to it (`inverse` exists because the default ring fails against a brand-filled surface), but the contract itself is a computation over a host this def cannot see, so no single ring component can carry it.

---

Generated from the `focus-ring` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
