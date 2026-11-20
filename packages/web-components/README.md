# @prism3/web-components

Prism3 components as custom elements, written in Lit 3 (owner decision Q95 B). Part of the code POC's arm 1
(#3408). S4 built the **button**, `<p3-button>` (prefix `p3-`, Q97 A); the **text field** and the **password field**
follow as `<p3-text-field>` and `<p3-password-field>`.

- **Light DOM.** The element renders `@prism3/css`'s markup into itself: a native `<button class="p3-button">`, or an
  `<a href>`, with the same part spans and state attributes. There is no shadow root and no element style.
  `@prism3/css/button.css` is the single source of truth for how it looks.
- **Generated, never edited.** `generate.ts` writes `p3-button.js` from the def's props in the engine's emission
  (`component-defs.json`, Q96 A). `custom-elements.json` is what `@custom-elements-manifest/analyzer` writes from
  that file. Change the def and run `npm run -w @prism3/web-components generate`.
- **Plain ES modules.** `p3-button.js` imports `lit` by name, so a page needs a bundler or an import map. There is
  no build step.
- **One entry per element** (owner decision Q-POC3 B). `import '@prism3/web-components'` registers nothing and
  exports nothing. Each element registers from its own entry, so a page defines only what it imports:

  | Entry | Registers |
  |---|---|
  | `@prism3/web-components` | nothing |
  | `@prism3/web-components/button` | `<p3-button>` |
  | `@prism3/web-components/text-field` | `<p3-text-field>` |
  | `@prism3/web-components/password-field` | `<p3-password-field>` |

  `custom-elements.json` is an entry too, for tools.

```html
<link rel="stylesheet" href="@prism3/tokens/prism3.css">
<link rel="stylesheet" href="@prism3/css/button.css">
<script type="module">import '@prism3/web-components/button';</script>

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

## The fields: `<p3-text-field>` and `<p3-password-field>`

Generated the same way, by `generate-fields.ts` through `generate.ts`, from each def's props. Each renders
`@prism3/css`'s fields markup in its light DOM: a native `<label for>` and `<input>` in one tree with the message, so
the label names the input and `aria-describedby` reaches the message with no scripting. They need `field-label.css`,
`field-message.css` and the field's own stylesheet; the password field also needs `button.css`.

```html
<script type="module">
  import '@prism3/web-components/text-field';
  import '@prism3/web-components/password-field';
</script>
<p3-text-field data-prop-label="Email address" data-prop-type="email" data-prop-autocomplete="email"
               data-prop-showmessage="true" data-prop-helptext="We send the receipt to this address."></p3-text-field>
<p3-password-field data-prop-label="Password" data-prop-autocomplete="current-password"></p3-password-field>
```

| Prop | Property | Attribute | Reaches the markup as |
|---|---|---|---|
| `label` | `label` | `data-prop-label` | The text of the nested `<label class="p3-field-label" for>`. |
| `value` | `value` | — | The input's live value. **A property only**: it's never reflected, so a typed password is never written into the DOM. Typing updates it. |
| `defaultValue` | `defaultValue` | `data-prop-defaultvalue` | The input's `value` attribute. |
| `onChange` | `onChange` | — | Called with each `input` event. Native `input` and `change` bubble from the inner input too. |
| `type` (text field) | `type` | `data-prop-type` | The input's `type`. |
| `placeholder` | `placeholder` | `data-prop-placeholder` | The input's `placeholder`. |
| `helpText` | `helpText` | `data-prop-helptext` | The message's text at the default status. |
| `validation` | `validation` | `data-prop-validation` | `data-prop-validation` on the field; at `error`, `aria-invalid="true"` on the input. |
| `validationMessage` | `validationMessage` | `data-prop-validationmessage` | The message's text at a validation status (the help text when unset). At a status with neither this nor `helpText`, the message is written empty and the element logs a console warning (OWNER DECISION 1 B, #3968). |
| `showMessage` | `showMessage` | `data-prop-showmessage` | Writes the message and names its id in the input's `aria-describedby`. At `error`, `warning` or `success` the message is written whatever this says (Q-POC2 A, #1712 A). |
| `required`, `disabled`, `readOnly` | same | `data-prop-required`, `-disabled`, `-readonly` | The input's `required`, `disabled`, `readonly`. Disabled also disables the Show/Hide button; read-only leaves it live. |
| `autoComplete` | `autoComplete` | `data-prop-autocomplete` | The input's `autocomplete`. |
| `inputMode` (text field) | `inputMode` | `data-prop-inputmode` | The input's `inputmode`. |
| `prefix`, `suffix`, `clearable` (text field) | same | `data-prop-prefix`, … | **Not rendered**: the def's anatomy has no part for them (#1699 for the affixes). |
| `leadingIcon`, `trailingIcon` | same | — | The visual spans. In markup, a child with `slot="leadingIcon"` / `slot="trailingIcon"`. |
| `isPending` | `isPending` | `data-prop-ispending` | `aria-busy="true"` on the input; the spinner takes the trailing cell. |
| `size` | `size` | `data-prop-size` | `data-prop-size` on the field. |
| `id` | `id` | `data-prop-id` | The input's `id`, named by the label's `for` (and the button's `aria-controls`). Generated when unset. The host's own `id` attribute stays the host's. |
| `name` | `name` | `data-prop-name` | The input's `name`. |

- **The Show/Hide button** (Q301.4 A, Q301.5 A, Q301.7 A). It is rendered in Lit, as `@prism3/css`'s nested Button,
  with the variant the emission's `nesting` names. Its visible text is "Show" or "Hide", followed by a visually hidden
  " password", and it has no `aria-pressed`. Pressing it switches the input between masked and plain, keeps the
  caret and focus, and announces "Your password is shown" or "Your password is hidden" once in a polite live region
  (the page's `[data-p3-announcer]` if it has one). It returns to masked when the form submits. The wording is the
  def's DRAFT. `data-p3-show`, `-hide`, `-shown` and `-hidden` on the element override it, as they do for
  `@prism3/css`'s script.
- **Before the script runs.** `@prism3/css`'s markup written inside the element is a working field on its own. The
  button stays hidden, or `@prism3/css/password-field.js` runs it. On upgrade the element adopts that markup's props,
  a value typed into it and focus, and then renders its own. Inside an upgraded element, `password-field.js` stands
  aside, so a page that loads both toggles once.
- **Tab order** is the anatomy's: the Show/Hide button, then the input. This is the same as `@prism3/css` (journal S3,
  owner decision 2).

## Checks

| Script | What it asserts |
|---|---|
| `npm run -w @prism3/web-components check:generated` | `p3-button.js`, `p3-text-field.js` and `p3-password-field.js` are what `generate.ts` writes from the emission, and `custom-elements.json` is what the analyzer writes from them. |
| `npm run -w @prism3/web-components check:parity` | The element, read from `custom-elements.json` and live in Chromium, has exactly the def's props, values and defaults, and each prop value renders the contract's markup. Six mutants must fail by name. `check-parity-fields.ts` does the same for the fields, and checks that the label names the input, `aria-describedby` reaches the message and the button controls the input. Eight mutants must fail by name. `check-token-parity.ts` (#3408 S6) runs `@prism3/css`'s token parity probes against the three elements as rendered: the same sentinel tokens and EXPECTED. What the element form can't write is named on every run. Four mutants must fail by name. |
| `npm run -w @prism3/web-components test:browser` | With the real token CSS, the element and plain HTML from the `@prism3/css` contract compute equal styles on light and dark. Click, keyboard, form, link, slot and focus behavior. Three mutants must fail by name. `check-browser-fields.ts` does the same for the fields across every size, status and state. It finds each input by its label, drives the Show/Hide button by mouse and keyboard, and checks submit, the upgrade over pre-written markup, `value` and `onChange`. Five mutants must fail by name. `check-entries.ts` holds the entries: the root registers no element and each entry registers exactly its own, bundled alone through the exports map and resolved as a consumer resolves it. Four mutants must fail by name. |

The browser test needs the token CSS built first: its script runs `npm run -w @prism3/tokens build`.
