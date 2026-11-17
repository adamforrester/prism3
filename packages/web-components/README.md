# @prism3/web-components

Prism3 components as custom elements, written in Lit 3 (owner decision Q95 B). Part of the code POC's arm 1
(#3408). This is S4: the **button** only, as `<p3-button>` (prefix `p3-`, Q97 A).

- **Light DOM.** The element renders `@prism3/css`'s markup into itself: a native `<button class="p3-button">`, or an
  `<a href>`, with the same part spans and state attributes. There is no shadow root and no element style.
  `@prism3/css/button.css` is the single source of truth for how it looks.
- **Generated, never edited.** `generate.ts` writes `p3-button.js` from the def's props in the engine's emission
  (`component-defs.json`, Q96 A). `custom-elements.json` is what `@custom-elements-manifest/analyzer` writes from
  that file. Change the def and run `npm run -w @prism3/web-components generate`.
- **Plain ES modules.** `p3-button.js` imports `lit` by name, so a page needs a bundler or an import map. There is
  no build step.

```html
<link rel="stylesheet" href="@prism3/tokens/prism3.css">
<link rel="stylesheet" href="@prism3/css/button.css">
<script type="module">import '@prism3/web-components';</script>

<p3-button data-prop-appearance="outline" data-prop-size="large">
  <svg slot="leadingVisual" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">…</svg>
  Save changes
</p3-button>
```

## Props

Each prop of the def is a property with the def's name and a `data-prop-<name>` attribute (lowercased, as HTML
stores attribute names), reflected both ways. That's the same mark `@prism3/css` styles and the agent-adherence
scorer reads. An absent attribute is the def's default. `check-parity.ts` fails if the element has a prop the def
doesn't, or lacks one it has.

| Prop | Property | Attribute | Reaches the inner element as |
|---|---|---|---|
| `label` | `label` | `data-prop-label` | The label span's text. Without it, the element's own text when it connects. |
| `onClick` | `onClick` | — | Called on a click the element doesn't suppress. A `click` listener on the element works too. |
| `appearance` | `appearance` | `data-prop-appearance` | `data-prop-appearance` |
| `size` | `size` | `data-prop-size` | `data-prop-size` |
| `surface` | `surface` | `data-prop-surface` | `data-prop-surface` |
| `inset` | `inset` | `data-prop-inset` | `data-prop-inset` |
| `fullWidth` | `fullWidth` | `data-prop-fullwidth` | `data-prop-fullwidth="true"` |
| `type` | `type` | `data-prop-type` | The native `type`. The default is `button`. |
| `isPending` | `isPending` | `data-prop-ispending` | `aria-busy="true"`, `aria-disabled="true"` and the spinner span. |
| `isInactive` | `isInactive` | `data-prop-isinactive` | `aria-disabled="true"` |
| `disabled` | `disabled` | `data-prop-disabled` | The native `disabled`. |
| `leadingVisual` | `leadingVisual` | — | The leading-visual span. In markup, a child with `slot="leadingVisual"`. |
| `trailingVisual` | `trailingVisual` | — | The trailing-visual span. In markup, a child with `slot="trailingVisual"`. |
| `href` | `href` | `data-prop-href` | An `<a href>` in place of the `<button>`. `type` and `disabled` don't apply. |
| `aria-label` | `ariaLabel` | `data-prop-aria-label` | The native `aria-label`. Start it with the visible label. |

A boolean attribute is true when it's present and not `"false"`, and reflects as `"true"`.

There's no `<slot>` in the light DOM, so the element moves `slot="leadingVisual"` and `slot="trailingVisual"`
children into their spans when it first connects, and reads the label from its own text if `label` isn't set.
Children added after that are not read; set the property instead.

## Behavior

- **Pending and inactive** keep focus and the accessible name, and suppress the action: a click, Enter or Space
  runs no listener and no `onClick`, submits no form and follows no link. The spinner is hidden from assistive
  technology; `aria-busy` carries the state.
- **Disabled** is the native attribute: no click, and no Tab stop.

Not built yet: the polite live region that announces the busy state, the spinner's anti-flash delay, and showing
an inactive button's reason on focus. See the S4 entry in `docs/poc/arm-1-journal.md`.

## Checks

| Script | What it asserts |
|---|---|
| `npm run -w @prism3/web-components check:generated` | `p3-button.js` is what `generate.ts` writes from the emission, and `custom-elements.json` is what the analyzer writes from it. |
| `npm run -w @prism3/web-components check:parity` | The element, read from `custom-elements.json` and live in Chromium, has exactly the def's props, values and defaults, and each prop value renders the contract's markup. Six mutants must fail by name. |
| `npm run -w @prism3/web-components test:browser` | With the real token CSS, the element and plain HTML from the `@prism3/css` contract compute equal styles on light and dark. Click, keyboard, form, link, slot and focus behavior. Three mutants must fail by name. |

The browser test needs the token CSS built first: its script runs `npm run -w @prism3/tokens build`.
