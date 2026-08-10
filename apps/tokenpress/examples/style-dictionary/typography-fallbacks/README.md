# Token Press → Style Dictionary: font-family fallback stacks

A worked Style Dictionary 4.x/5.x example that turns Token Press `fontFamily`
tokens into full CSS font-family **stacks** at build time.

## The problem this solves

Token Press emits `fontFamily` as a **single brand family**:

```json
"body": { "$type": "fontFamily", "$value": "Inter" }
```

That's deliberate — the family is a brand-identity token, and Figma only carries
one family per text style. But a browser needs a fallback stack so text still
renders while the web font loads (or if it fails):

```css
font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

Fallbacks are a **CSS-rendering concern, not brand identity**, so the right place
to add them is a Style Dictionary transform — not the token. This example shows
exactly that.

## How it works

`build.js` registers one custom value transform, `fontFamily/css/fallback`, that:

1. matches every `fontFamily` token (Style Dictionary resolves aliases to their
   leaf family *before* value transforms run, so aliased families work too —
   without needing `transitive`),
2. looks the single family up in a small **consumer-owned** map
   (`FALLBACK_STACKS` in `build.js`), and
3. appends the fallbacks, quoting any non-identifier family for valid CSS.

It's vendor-neutral: it keys only on `$type: "fontFamily"` and a family→stack
map you maintain. No `$extensions` namespace, no coupling to any specific token
source — it works on any DTCG `fontFamily` token.

## Run it

```bash
npm install
npm run build      # writes build/variables.css
```

Expected output (`build/variables.css`):

```css
:root {
  --font-family-body: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-family-display: "Playfair Display", Georgia, Cambria, "Times New Roman", serif;
  --font-family-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

## Adapt to your project

- **Fallbacks:** edit `FALLBACK_STACKS` in `build.js`, keyed by the exact family
  string Token Press emits (e.g. `"Inter"`). Families with no entry pass through
  unchanged (still safe — you just get the bare family).
- **Your tokens:** point the `source` glob at your Token Press `fontFamily`
  file (or drop it in `tokens/`). Note the `transforms` list in `build.js` is a
  fontFamily-only subset — if you feed it a full export with other token types
  (colors, composites), either add those transforms back or, better, build off
  the stock `css` group: `[...StyleDictionary.hooks.transformGroups.css,
  'fontFamily/css/fallback']` and drop the built-in `fontFamily/css`. See the
  Scope note below on typography composites.
- **Multi-mode:** if your export is per-mode (`tokens/shared/`, `tokens/light/`,
  …), combine this transform with the per-mode build pattern from the sibling
  [`../sd-v4-or-v5/`](../sd-v4-or-v5/) starter — register this transform in each
  mode's config.

## Scope

This example covers standalone `fontFamily` tokens. Emitting full **typography
composite** tokens (`$type: "typography"`) as CSS shorthand or grouped custom
properties is a larger topic — the
[`style-dictionary-utils`](https://www.npmjs.com/package/style-dictionary-utils)
package ships ready-made composite formats and transforms for that.
