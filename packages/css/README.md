# @prism3/css

The styles and markup patterns for Prism3 components in plain HTML: the delivery path for server-rendered
platforms such as AEM and Drupal (`docs/35` §9.1, owner decision Q87 A). Part of the code POC's arm 1 (#3408).
This is S2: the **button** only.

- `button.css` — the button's styles, in one cascade layer, `p3`. **Generated, never edited:** `generate.ts`
  writes it from the engine's emission (`packages/engine/out/components/specs.json` and `component-defs.json`),
  owner decision Q96 A. Change the def and regenerate.
- `demo.html` — every appearance, size and state on the light and dark themes and on an inverse band. Also generated.
- It needs the token CSS from `@prism3/tokens` (the `--pds3-…` custom properties, Q98 A). Themes come from that
  package's `[data-theme]` blocks: set `data-theme="dark"` on any ancestor.

```html
<link rel="stylesheet" href="@prism3/tokens/prism3.css">
<link rel="stylesheet" href="@prism3/css/button.css">
```

## Markup contract

A real `<button>` (or `<a href>`), in the light DOM. Classes use the `p3-` prefix (Q97 A). Each visual prop is a
`data-prop-<name>` attribute, the same mark the agent-adherence scorer reads (`data-component`, `data-prop-*`), so
the attribute that styles the button is the one that declares its API. An absent attribute means the prop's default.
States come from native and ARIA attributes, never classes. There is no behavior script in S2 (Q86 A); S4 adds it.

```html
<button type="button" class="p3-button" data-component="button"
        data-prop-appearance="outline" data-prop-size="medium">
  <span class="p3-button__leading-visual" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor">…</svg></span>
  <span class="p3-button__spinner" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none">…</svg></span>
  <span class="p3-button__label">Save changes</span>
  <span class="p3-button__trailing-visual" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor">…</svg></span>
</button>
```

Every prop of the def, and how it reaches markup. `check-parity.ts` fails if a prop of the def is missing here.

| Prop | Values | Markup |
|---|---|---|
| `label` | text | The text of `<span class="p3-button__label">`. |
| `onClick` | function | A click listener on the element. Suppressing it while pending or inactive is S4's script. |
| `appearance` | `filled` (default), `outline`, `text` | `data-prop-appearance="…"` |
| `size` | `small`, `medium` (default), `large` | `data-prop-size="…"` |
| `surface` | `default` (default), `inverse` | `data-prop-surface="…"` |
| `inset` | `default` (default), `flush` | `data-prop-inset="…"`. Text appearance only. |
| `fullWidth` | `true`, `false` (default) | `data-prop-fullwidth="true"` |
| `type` | `button` (default), `submit`, `reset` | The native `type` attribute. Always write it: the platform's own default is `submit`. |
| `isPending` | `true`, `false` | `aria-busy="true"` and `aria-disabled="true"`. Keeps focus. Include the `p3-button__spinner` span. |
| `isInactive` | `true`, `false` | `aria-disabled="true"`. Keeps focus; takes the disabled paint. |
| `disabled` | `true`, `false` | The native `disabled` attribute. |
| `leadingVisual` | slot | `<span class="p3-button__leading-visual" aria-hidden="true">` before the label. |
| `trailingVisual` | slot | `<span class="p3-button__trailing-visual" aria-hidden="true">` after the label. |
| `href` | URL | Write `<a class="p3-button" href="…">` instead of `<button>`; `type` and `disabled` don't apply. |
| `aria-label` | text | The native `aria-label`. Start it with the visible label (WCAG 2.5.3). |

States: hover is `:hover`, pressed is `:active`, focus is `:focus-visible` (the focus ring is an `outline`), pending
is `[aria-busy="true"]`, disabled is `:disabled`, and inactive is `[aria-disabled="true"]` without `aria-busy`.
Hover and pressed never apply to a disabled, inactive or pending button.

The pending spinner takes the first visual cell there is (leading, then trailing), so the width does not move. With
no visual, it centers over the label, which keeps its width at zero opacity.

## What the def asks of code, and where it is

The button def's `codeOnly` list, and its spinner and focus ring:

| Entry | In S2 CSS | Left for S4 or later |
|---|---|---|
| Hit target (`hit-target`) | A flush button's invisible `::before` extends its target to 44×44 at medium and large, 24×24 at small. | Extending the compact sizes' target to 44×44 elsewhere. |
| Focus ring (`focus-ring`, both entries) | An `outline` on `:focus-visible`: width, style, offset and color from tokens, the color following `surface`. It survives forced colors. | — |
| Minimum width (`live-geometry`) | `min-inline-size` per size, the derived px `specs.json` states. | A live `height × multiplier` floor. |
| Locked to edges (`live-geometry`) | — | The brand's `buttonIcons: edges` placement. This CSS is the default, `attached`. |
| Width (`not-projected`) | `fullWidth` via `data-prop-fullwidth`. | — |
| Label overflow (`localization`) | The label wraps; the height is a floor (`min-block-size`). | — |
| RTL (`right-to-left`) | Logical properties throughout. | Per-icon `autoMirror` for directional glyphs. |
| Press behavior, form integration (`runtime-behavior`) | — | S4: suppressing clicks while pending or inactive, the polite live region that announces busy, form status. |
| Inactive (`not-projected`) | Takes the disabled paint, stays focusable. | Surfacing the blockage reason on focus. |
| Spinner rotation, reduced motion, enter fade (`motion`) | Turns on `motion.duration.spin`, slowed to `motion.duration-reduced.spin` under reduced motion; fades in on `motion.duration.fast`. | The host's anti-flash delay and minimum show time (script). |

## Checks

| Script | What it asserts |
|---|---|
| `npm run -w @prism3/css check:generated` | `button.css` and `demo.html` are what the generator writes from the emission. |
| `npm run -w @prism3/css check:raw-values` | No hex, `rgb()`, non-zero `px` or primitive token in the CSS, outside the documented exceptions (the agent-adherence scorer's own R2). |
| `npm run -w @prism3/css check:parity` | Rendered in Chromium, every part × size × state binds the token `specs.json` names, and every prop and value in `components.ai.json` has a markup mapping. Mutants must fail by name. |
| `npm run -w @prism3/css test:browser` | `demo.html` on the light and dark themes: computed colors and sizes against the resolved token values, focus-visible on keyboard and not on mouse. |

The browser checks need the token CSS built first: `npm run -w @prism3/tokens build`.
