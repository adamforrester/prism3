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
- Keep the ring outside the host's bounds and the host un-clipped, so the ring is never cut off (2.4.7)

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
- **Often used with:** `button`, `button-destructive`, `button-neutral`, `icon-button`, `icon-button-destructive`, `icon-button-neutral`, `text-field`, `textarea`, `select`, `checkbox-control`, `radio-control`, `switch-control`

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
  - 2.4.7 Focus Visible (a visible indicator on every keyboard-focusable control — so the ring sits outside its host and must not be clipped by an ancestor, hence `clipsContent: false`)
  - 1.4.11 Non-text Contrast (the ring is gated at 3:1 against the page per mode, 4.5:1 in high contrast; against the control edge it depends on the host — the offset is what makes that achievable)
  - 2.4.11 Focus Not Obscured (Minimum) — the page's concern, not the ring's: a focused control must not be entirely hidden by author content such as a sticky header or a banner. The ring cannot see the page it is on, so the layout meets this, not this component.
  - 2.4.13 Focus Appearance (AAA) — the intent, not gated: an indicator whose area and change of contrast are large enough to see. The offset and width tokens are the levers, and no gate measures a brand against this criterion.
- **Focus:** This component IS the focus appearance. It is drawn for `:focus-visible` rather than `:focus`, so a pointer click does not raise it while keyboard navigation does — the distinction browsers make and the one a design system must not flatten. Never suppress it without replacing it: removing the indicator is the single most common 2.4.7 failure.
- **ARIA:** None, and that is a contract rather than an absence. The ring is presentational — the focus state is already conveyed by the platform focus itself, so an `aria-*` attribute here would announce something assistive tech already knows. It must never be given a role that makes it a stop in the tab order: a focusable focus ring is a node the user can land on with nothing to do.

## Composition

- **Planned:** `link`
- **Replaces:**
  - a per-component focus border
  - a box-shadow focus glow

---

Generated from the `focus-ring` component definition.
