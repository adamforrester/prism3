# @prism3/css

The styles and markup patterns for Prism3 components in plain HTML: the delivery path for server-rendered
platforms such as AEM and Drupal (`docs/35` §9.1, owner decision Q87 A). Part of the code POC's arm 1 (#3408).
S2 built the **button**; S3 adds the **text field** and the **password field**, with their nested label and message.

- `button.css` — the button's styles, in one cascade layer, `p3`. **Generated, never edited:** `generate.ts`
  writes it from the engine's emission (`specs.json` and `component-defs.json`), owner decision Q96 A. The engine
  doesn't commit those two, so `emission.ts` generates them into a temp folder on each run. Change the def and
  regenerate.
- **It reads emitted files, not the engine's code** (Q142 A). The corner, stroke, focus ring and motion come from
  `specs.json` (#3839). Two facts the emission doesn't carry yet, Button's hit-target floors and its pending spinner's
  replacement rule, are read in `residual.ts`, the one file that may import the engine's defs.
- `demo.html` — every appearance, size and state on the light and dark themes and on an inverse band. Also generated.
- It needs the token CSS from `@prism3/tokens` (the `--pds3-…` custom properties, Q98 A). Themes come from that
  package's `[data-theme]` blocks: set `data-theme="dark"` on any ancestor. A page that sets no `data-theme` follows
  the OS's light or dark setting (#4140), so a region that must stay light sets `data-theme="light"`.

- `field-label.css`, `field-message.css`, `text-field.css`, `password-field.css` (S3) — generated the same way, by
  `fields.ts` through `generate.ts`.
- `password-field.js` (S3) — the Show/Hide button's behavior, a small hand-written script (Q86 A). S4's element
  replaces it.

```html
<link rel="stylesheet" href="@prism3/tokens/prism3.css">
<link rel="stylesheet" href="@prism3/css/button.css">
<!-- the fields: the label and message first; the password field also needs button.css and the script -->
<link rel="stylesheet" href="@prism3/css/field-label.css">
<link rel="stylesheet" href="@prism3/css/field-message.css">
<link rel="stylesheet" href="@prism3/css/text-field.css">
<link rel="stylesheet" href="@prism3/css/password-field.css">
<script src="@prism3/css/password-field.js" defer></script>
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

The label takes its type from the `--pds3-type-label-…` token's `font` shorthand. The shorthand can't carry a text
decoration or tracking (#3507), so both are bound on their own: the underline from the style's `textDecoration`,
and `letter-spacing` from the token the style's `letterSpacing` names. That token is a number, a fraction of the
font size, so the CSS writes `calc(var(--pds3-core-font-letter-spacing-role-…) * 1em)`.

## The fields' markup contract (S3)

A real `<label for>` and `<input>` in the light DOM, in one tree with the message, so `for` and `aria-describedby`
reach the input without scripting. States come from the input's own state: `:disabled`, `[readonly]`,
`:focus-visible`, `[aria-busy="true"]`, and the box's `:hover`. The status is the field's `data-prop-validation`; at
`error` the input also carries `aria-invalid="true"`. The nested label and message **follow the field**, as the
emission's `nesting` says: the field's size sizes the label, the field's validation sets the message's status and
glyph, and a disabled input disables the label's ink. So each is set once, on the field.

**At `error`, `warning` or `success`, the message is always written and shown** (Q-POC2 A, owner decision #1712 A).
The field writes the `<p class="p3-field-message">` and names its id in the input's `aria-describedby`, whatever
`showMessage` says, so `aria-invalid` never stands without a description. Its text is `validationMessage`, or
`helpText` when that's unset. `showMessage` decides only at the default status. Don't hide the message with CSS or
`hidden` at a status.

```html
<div class="p3-text-field" data-component="text-field" data-prop-size="medium" data-prop-validation="error">
  <label class="p3-field-label" data-component="field-label" for="email">
    <span class="p3-field-label__label">Email address</span><span class="p3-field-label__indicator" aria-hidden="true">*</span>
  </label>
  <div class="p3-text-field__control">
    <div class="p3-text-field__content">
      <span class="p3-text-field__leading-visual" aria-hidden="true"><svg …></svg></span>
      <input class="p3-text-field__entry" id="email" type="email" autocomplete="email" required
             aria-describedby="email-message" aria-invalid="true">
    </div>
    <span class="p3-text-field__spinner" aria-hidden="true"><svg …></svg></span>
    <span class="p3-text-field__trailing-visual" aria-hidden="true"><svg …></svg></span>
  </div>
  <p class="p3-field-message" data-component="field-message" id="email-message">
    <span class="p3-field-message__glyph-cell" aria-hidden="true">
      <span class="p3-field-message__error-glyph"><svg …></svg></span>
      <span class="p3-field-message__warning-glyph"><svg …></svg></span>
      <span class="p3-field-message__success-glyph"><svg …></svg></span>
    </span>
    <span class="p3-field-message__caption-cell"><span class="p3-field-message__label">Enter an email address, such as name@example.com.</span></span>
  </p>
</div>
```

The password field is the same, with the label in a label row beside the Show/Hide button, and no trailing slot:

```html
<div class="p3-password-field" data-component="password-field" data-prop-size="medium">
  <div class="p3-password-field__label-row">
    <div class="p3-password-field__label-cell"><label class="p3-field-label" data-component="field-label" for="pw">…</label></div>
    <button type="button" class="p3-button p3-password-field__toggle" data-component="button" data-prop-appearance="text"
            data-prop-size="small" data-prop-inset="flush" aria-controls="pw" hidden>
      <span class="p3-button__label"><span class="p3-password-field__toggle-text">Show</span><span class="p3-password-field__toggle-suffix"> password</span></span>
    </button>
  </div>
  <div class="p3-password-field__control">
    <div class="p3-password-field__content">
      <input class="p3-password-field__entry" id="pw" type="password" autocomplete="current-password"
             spellcheck="false" autocapitalize="none">
    </div>
    <span class="p3-password-field__spinner" aria-hidden="true"><svg …></svg></span>
  </div>
</div>
```

- **The glyph cell holds all three status glyphs;** the CSS shows the one the status names, so a status that changes
  live needs one attribute changed. A host with one fixed status may include just that glyph.
- **The spinner span is always written.** It shows only while the input is `aria-busy="true"`, in the trailing cell.
- **The Show/Hide button is written `hidden`.** `password-field.js` reveals it, so before the script runs the field is
  a plain password input. Its name is the visible "Show" or "Hide" plus the visually hidden " password". The script
  switches `type`, keeps the caret and focus, announces "Your password is shown" or "Your password is hidden" in a
  polite live region, and returns the field to hidden when its form submits. Each string can be set per button with
  `data-p3-show`, `data-p3-hide`, `data-p3-shown` and `data-p3-hidden`. Inside an upgraded `<p3-password-field>`
  (`@prism3/web-components`), the element owns the button and the script stands aside.

`check-parity-fields.ts` fails if a prop of a def is missing from its table below.

### `text-field`

| Prop | Values | Markup |
|---|---|---|
| `label` | text | The text of the nested `<label class="p3-field-label" for>`. |
| `value` | text | The input's value. |
| `defaultValue` | text | The input's `value` attribute. |
| `onChange` | function | An `input` or `change` listener on the input. |
| `type` | `text` (default), `email`, `url`, `tel`, `search`, `password` | The input's `type`. |
| `placeholder` | text | The input's `placeholder`. An example only, never the label. |
| `helpText` | text | The message's text at the default status. |
| `validation` | `default` (default), `error`, `warning`, `success` | `data-prop-validation` on the field. At `error`, also `aria-invalid="true"` on the input. At any status but `default`, the message is always written and named (above). |
| `validationMessage` | text | The message's text at a validation status. |
| `showMessage` | `true`, `false` (default) | At the default status, `true`: write the `<p class="p3-field-message">` and name its id in the input's `aria-describedby`; `false`: write neither. At any other status the message is written either way (Q-POC2 A). |
| `required` | `true`, `false` (default) | The input's `required`. The label's marker follows it. |
| `disabled` | `true`, `false` (default) | The input's `disabled`. |
| `readOnly` | `true`, `false` (default) | The input's `readonly`. |
| `autoComplete` | WHATWG token | The input's `autocomplete`. |
| `inputMode` | `text`, `numeric`, `decimal`, `tel`, `email`, `url`, `search` | The input's `inputmode`. |
| `prefix` | text | Not in S3: the def's anatomy has no part for a text affix (#1699). |
| `suffix` | text | Not in S3, as `prefix`. |
| `leadingIcon` | slot | `<span class="p3-text-field__leading-visual" aria-hidden="true">` before the input. |
| `trailingIcon` | slot | `<span class="p3-text-field__trailing-visual" aria-hidden="true">` after the content cell. Decorative only in S3. |
| `clearable` | `true`, `false` (default) | Not in S3: a Clear button is behavior, S4. |
| `isPending` | `true`, `false` (default) | `aria-busy="true"` on the input. The spinner takes the trailing cell. |
| `size` | `small`, `medium` (default), `large` | `data-prop-size` on the field. |
| `id` | text | The input's `id`; the label's `for` names it. |
| `name` | text | The input's `name`. |

### `password-field`

| Prop | Values | Markup |
|---|---|---|
| `label` | text | The text of the nested `<label class="p3-field-label" for>`. |
| `value` | text | The input's value. |
| `defaultValue` | text | The input's `value` attribute. |
| `onChange` | function | An `input` or `change` listener on the input. |
| `placeholder` | text | The input's `placeholder`. |
| `helpText` | text | The message's text at the default status. |
| `validation` | `default` (default), `error`, `warning`, `success` | As on the text field, including the message at any status but `default`. The Show/Hide button never takes the status. |
| `validationMessage` | text | The message's text at a validation status. |
| `showMessage` | `true`, `false` (default) | As on the text field. |
| `required` | `true`, `false` (default) | The input's `required`. |
| `disabled` | `true`, `false` (default) | The input's `disabled`, and the button's `disabled`. |
| `readOnly` | `true`, `false` (default) | The input's `readonly`. The button stays live. |
| `autoComplete` | `current-password`, `new-password` | The input's `autocomplete`. Required, never `off`. |
| `leadingIcon` | slot | `<span class="p3-password-field__leading-visual" aria-hidden="true">` before the input. |
| `isPending` | `true`, `false` (default) | `aria-busy="true"` on the input. |
| `size` | `small`, `medium` (default), `large` | `data-prop-size` on the field. The button stays small. |
| `id` | text | The input's `id`; the label's `for` and the button's `aria-controls` name it. |
| `name` | text | The input's `name`. |

### `field-label`

| Prop | Values | Markup |
|---|---|---|
| `label` | text | The text of `<span class="p3-field-label__label">`. |
| `htmlFor` | id | The native `for`. |
| `required` | `true`, `false` (default) | `data-prop-required="true"` shows the marker. Inside a field, the input's `required` does. |
| `size` | `small` (default), `medium`, `large` | `data-prop-size`. Inside a field, the field's size sets it. |
| `emphasis` | `primary` (default), `secondary` | `data-prop-emphasis`. |
| `weight` | `regular` (default), `bold` | `data-prop-weight`. |

### `field-message`

| Prop | Values | Markup |
|---|---|---|
| `status` | `default` (default), `error`, `warning`, `success` | `data-prop-status`. Inside a field, the field's `validation` sets it. |
| `message` | text | The text of `<span class="p3-field-message__label">`. |
| `icon` | slot | The glyph cell's content. |
| `id` | id | The native `id`, named by the input's `aria-describedby`. |

States: hover is the box's `:hover`, focus is the input's `:focus-visible` (the box's 2px focus edge, an inset
`outline` in the border's own paint, #3399), disabled is `:disabled`, read-only is `[readonly]`, pending is
`[aria-busy="true"]`. Hover never applies to a disabled, read-only or focused field. The placeholder and the value are
one input, so `filled` needs no attribute: the value's ink is the input's `color`, the placeholder's is `::placeholder`.

## Owner decisions this follows (#3408)

- **Q139 A:** the part classes (`p3-button__label`, `__leading-visual`, `__trailing-visual`, `__spinner`) and the
  `data-prop-*` attributes are the styling hooks.
- **Q140 A:** the minimum widths are the engine's derived 88, 104 and 128px. They're the one raw-px exception,
  because 104 and 128 aren't on the spacing scale. `check-raw-values.ts` excuses only those numbers, read from
  `specs.json`.
- **Q141 / Q-HT1 A:** hit-target floors are spacing tokens: `space.300` (24px) at small, `space.550` (44px) at
  medium and large. The generator reads each from the def's `size.<size>.hit-target` binding, through `residual.ts`
  until the emission carries it. The browser check
  holds the rendered box to its own 24 / 44 / 44 px.
- **Q143 A:** the label's tracking comes from the tokens, as the underline does (above). The `letter-spacing` read
  of a `core.font.letter-spacing-role.*` token is the second documented exception in `check-raw-values.ts`,
  limited to the tokens the label styles name.

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

## The fields: decisions, and what the defs ask of code (S3)

Followed: Q96 A (generated), Q97 A (`p3-`), Q98 A (`--pds3-`), Q100 A (`password-field` is its own component),
Q86 A (a small script, no element yet), Q-HT1 A (hit areas on spacing tokens), Q139 A (part classes and
`data-prop-*`), Q140 A carried over to the fields' 120px minimum width (below).

Owner decisions taken as recommended and flagged in the journal (S3): the Show/Hide button written `hidden` until the
script runs; the message shown only when written (`showMessage` defaults off, as the def says, and at a validation
status it is always written, Q-POC2 A); the pending spinner in
the box's trailing cell; Tab reaching the Show/Hide button before the input, as the anatomy orders them; and the
fields' 120px minimum width as a documented raw px.

| Entry (the defs' `codeOnly`) | In S3 CSS and script | Left for S4 or later |
|---|---|---|
| The focus edge (#3399) | An inset `outline` at `border-width.focus-visible` in the border's own paint: the status color on a status field. Nothing moves. | — |
| `empty` (not projected) | The placeholder and the value are one input: `::placeholder` and `color`. | — |
| The focus caret (`platform-owned`) | The native caret, `caret-color` from the focused row. | — |
| `pending` (not projected) | `aria-busy="true"` on the input shows a spinner in the trailing cell, replacing the trailing glyph. | Announcing it. |
| The label and describedby wiring (`semantics`) | One tree: `<label for>`, `aria-describedby`, `aria-invalid`. The author writes the ids. | Generated ids (S4). |
| The Show/Hide button (`implementation`, Q301.4 A, Q301.5 A) | `password-field.js`: type switch, "Show"/"Hide" + hidden " password", focus and caret kept, a polite announcement, no `aria-pressed`. | The element (S4). |
| Back to hidden on submit (Q301.7 A) | `password-field.js`, on the form's `submit`. | — |
| One toggle only (`platform-owned`) | `::-ms-reveal` hidden. | — |
| The input's attributes (`semantics`) | In the contract and the demo: `autocomplete`, `spellcheck="false"`, `autocapitalize="none"`. | `passwordrules`. |
| The label row and the button's hit area (`hit-target`, Q380 A) | The button sets `min-block-size: 0` and the def's zero block padding. Its `::before` reads the button def's `size.<field size>.hit-target`: centered at small, anchored to the row's bottom at medium and large. | — |
| The trailing affix as a control (`semantics`) | — (decorative glyph only) | A Clear or reveal button (S4). |
| `prefix`, `suffix` | — | No part in the anatomy (#1699). |
| The small field on a coarse pointer (`responsive-layout`) | — | The 16px input under `pointer: coarse`: no token carries it. |
| Field style `underline` (`not-projected`) | — (the house brand is `outline`) | A brand that sets it needs its own generation. |
| Keyboard, IME guards (`keyboard-and-focus`) | Native. | Validation timing (S4). |

## Checks

| Script | What it asserts |
|---|---|
| `npm run -w @prism3/css check:generated` | `button.css` and `demo.html` are what the generator writes from the emission. No script here imports the engine except `residual.ts`, and that file exports only its two facts (Q142 A). |
| `npm run -w @prism3/css check:raw-values` | No hex, `rgb()`, non-zero `px` or primitive token in the CSS, outside the documented exceptions (the agent-adherence scorer's own R2). |
| `npm run -w @prism3/css check:parity` | Rendered in Chromium, every part × size × state binds the token `specs.json` names, and every prop and value in `components.ai.json` has a markup mapping. Mutants must fail by name. |
| `npm run -w @prism3/css test:browser` | `demo.html` on the light and dark themes: computed colors and sizes against the resolved token values, focus-visible on keyboard and not on mouse. |
| (S3) the same four | Extended to the fields: `generate.ts` writes the four field stylesheets; `check-raw-values.ts` scans them; `check-parity-fields.ts` and `check-browser-fields.ts` are the fields' parity and browser checks, run by `check:parity` and `test:browser`. |

The browser checks need the token CSS built first: `npm run -w @prism3/tokens build`.
