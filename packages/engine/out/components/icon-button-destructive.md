# IconButton.Destructive

> Icon-only destructive action. Needs an accessible name.

An icon-only trigger for a destructive action — delete, remove, discard — in the destructive color, so the consequence reads before the click. Same anatomy as IconButton; the color is the whole difference, and the accessible name is still mandatory (a bare trash glyph is not a name). For a quiet destructive icon action, use appearance=ghost on this component.

- **ID:** `icon-button-destructive`
- **Category:** form
- **Status:** draft
- **Also known as:** icon-btn
- **Builds on:** `button-destructive`

## Usage

Use for a self-evident action where space is tight and a text label would be redundant or not fit — toolbar actions, a close affordance, row-level edit/delete. Color is the component (IconButton / IconButton.Destructive / IconButton.Neutral — pick by semantics); rank actions within a view by appearance (filled > outline > ghost). Always provide the accessible name; pair with a tooltip (not built yet) for the visible name on hover/focus.

### Do

- Always give it an accessible name (a verb)
- Use recognizable, conventional icons (close = ×, more = ⋯); pair novel icons with a visible label instead
- Expand the hit area to meet target-size minimums even when the icon is visually small
- Confirm a destructive icon action that cannot be undone — the confirmation carries a neutral escape ("Cancel" / "Keep"), since a lone trash glyph offers none

### Don't

- Ship it without an accessible name ("button, unlabeled")
- Use it for an unfamiliar action a user cannot infer from the glyph — use a labeled Button
- Tooltip a natively-disabled icon button (the tooltip can't be reached) — use isInactive

### Content guidelines

The accessible name is a verb naming the action ("Close", "More actions"), never the glyph's shape ("X", "three dots"). A tooltip, where one is attached, shows the same words as the accessible name.

### Copy patterns

- **Labels:** The accessible name is a verb naming the action ("Close", "Edit", "More actions") — never the icon's shape ("X", "three dots"). If a tooltip is shown, its text should match the accessible name.

## Choosing it

- **Purpose:** Trigger an action with an icon alone, no visible label.
- **Use when:** A self-evident, conventional action in a space-constrained context (toolbar, table row, card header, close affordance).
- **Avoid when:** The action is not obvious from the icon (use a labeled Button) — or a visible label would fit and aid recognition. Never when you cannot supply an accessible name. The action is not destructive → use IconButton, or IconButton.Neutral for one with no brand emphasis.
- **Often used with:** `icon`, `spinner`, `focus-ring`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `icon` | slot | — | yes | The single icon. Rendered aria-hidden — the IconButton owns the name. |
| `aria-label` | string | — | yes | Required accessible name (there is no visible text). A verb naming the action ("Close", "More actions"). Enforced at the type level — a missing name is a compile error, not a runtime warning; that requirement is the reason IconButton is a separate component. |
| `onClick` | function | — | no | Action handler. Suppressed while isPending or isInactive. |
| `type` | enum: 'button' \| 'submit' \| 'reset' | `button` | no | Defaults to 'button', as Button does — the platform default is 'submit', so an icon button inside a form (a clear-field ×, a row delete) would submit it. Set 'submit' explicitly. |
| `appearance` | enum: 'filled' \| 'outline' \| 'ghost' | `ghost` | no | Default ghost — icon-only actions usually sit in toolbars, not as filled CTAs. The tertiary appearance is `ghost` (a borderless, fill-less icon action) because an icon-only control has no text; Button keeps `text`. Emphasis is the appearance axis; the color is the component (IconButton / IconButton.Destructive / IconButton.Neutral). |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Square control; height drives both dimensions. |
| `shape` | enum: 'square' \| 'circular' | `square` | no | The corner silhouette, and geometry only. `square` is the button's normal rounded rectangle (`radius.md`); `circular` is full-round (`radius.round`), the tap target read as a disc. No color, state, or token difference between the two — only the corner radius — which is why it is a clean 2-value axis and not a component split (each intent, by contrast, carries a different `interactive.<family>` binding). Both stay square in dimension (height drives width); shape rounds the corners, it does not change the box. |
| `surface` | enum: 'default' \| 'inverse' | `default` | no | The ground the icon-button sits on, following Button 1:1. `default` for a normal page; `inverse` for a dark or brand-filled band, where the control binds its `color.inverse.*` counterparts so fill, ink, border, overlay and the disabled treatment keep contrast against the flipped surface. An inverse icon-button inherits the shared white-inverse model with the icon as the ink: white fill + a per-family icon-ink derived to clear AA on white. A host that cannot know its ground picks `default`, and the designer sets `inverse` on the instance — the same answer the nested focus ring gives. |
| `isPending` | boolean | `false` | no | Swaps the icon for a spinner after a short delay, keeps focus (aria-disabled, not native disabled), suppresses re-fire, and announces busy through a polite live region. The square keeps its size. |
| `isInactive` | boolean | `false` | no | Focusable disabled for relevant-but-blocked actions — retains tab order and surfaces the blockage reason on focus. |
| `disabled` | boolean | `false` | no | Native disabled, reserved for controls irrelevant to the view; removes it from the tab order and the a11y tree. |

## States

`rest`, `hover`, `focus-visible`, `pressed`, `pending`, `inactive`, `disabled`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `appearance` | `filled`, `outline`, `ghost` | at runtime |
| `size` | `small`, `medium`, `large` | once, when authored |
| `shape` | `square`, `circular` | once, when authored |
| `surface` | `default`, `inverse` | once, when authored |

## Accessibility

- **Role:** button (native \<button>)
- **WCAG:**
  - 4.1.2 Name/Role/Value (the mandatory accessible name)
  - 2.5.3 Label in Name (a visible tooltip and the aria-label carry the same words)
  - 1.4.11 Non-text Contrast (focus ring at 3:1, and the icon glyph itself at 3:1 against its background)
  - 2.4.7 Focus Visible (a :focus-visible ring on every member, never suppressed, kept through pending and inactive)
  - 2.4.13 Focus Appearance (AAA — the ring is offset from the edge, so a sliver of background separates it from the fill)
  - 1.4.13 Content on Hover or Focus (only where a tooltip is attached: dismissible, hoverable and persistent)
  - 2.5.8 Target Size (Minimum) (24×24 — the small square is 36px, 28px at compact density)
  - 2.5.5 Target Size (Enhanced) (44×44, as intent — medium clears 44px at comfortable and spacious density and misses it at compact (36px); small clears it only at spacious (44px); icon-only controls are the likeliest to miss it, so reaching 44 elsewhere is a code-side hit-area expansion)
- **Keyboard:** Native \<button> — Enter on keydown, Space on keyup. Identical to Button.
- **Focus:** Same offset :focus-visible ring as Button; retained through pending/inactive.
- **ARIA:** aria-label is the accessible name (required). If it triggers a menu, add aria-haspopup + aria-expanded; aria-pressed only if it is a toggle. While isPending, set aria-busy, keep it focusable, and announce the busy state through a polite live region ("Saving…"), and set aria-hidden="true" on the embedded spinner, which otherwise announces its own "Loading" status (a double announcement). Do not put a tooltip on a natively-disabled icon button (unreachable) — use isInactive so the reason stays reachable. Under RTL, only a directional glyph flips (a back chevron).

## Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** State transitions (background, border) are meant to run ~100–150ms through the brand's motion tokens; this component binds none yet, so the timing is code-side. Under prefers-reduced-motion, resolve scale/translate to none but keep the instantaneous color change so the state stays perceivable; the pending spinner is functional and its busy state is carried by aria-busy regardless.

## Composition

- **Composes with:** `focus-ring`, `spinner`
- **Alternative to:** `button-destructive`
- **Planned:** `tooltip`, `button-group`, `menu`, `popover`, `link`
- **Replaces:**
  - div[role=button] wrapping an icon
  - a \<button> holding only an \<svg> and no accessible name

---

Generated from the `icon-button-destructive` component definition.
