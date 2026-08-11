# Token Press → Style Dictionary 3.x (with DTCG parser)

Style Dictionary 3 doesn't understand DTCG natively. Without a parser,
SD 3 will treat `$value`/`$type`/`$description` as literal path segments
and you'll see CSS variables like `--color-primary-default-value`
(from the `$value` key being baked in) and a "many-to-one" warning
about token name collisions.

This example wires up a small DTCG → SD-v3 parser shim that converts
DTCG token shapes into the legacy SD shape SD 3 expects, then runs SD
once per mode against the per-mode directory layout.

## Two simpler alternatives — pick one of these first

If you don't already have an SD 3 build pipeline you're committed to,
either of these is less work than the parser:

1. **Apply Style Dictionary preset in Token Press** before exporting.
   That stamps string-shape values (`"16px"`, RGBA strings) directly into
   the export, which SD 3 already understands. You skip DTCG `$value` /
   `$type` keys entirely and don't need a parser.
2. **Upgrade to SD 4 or 5** and use the
   [`sd-v4-or-v5/`](../sd-v4-or-v5/) starter instead. SD 4 added
   `usesDtcg: true` for native DTCG support; SD 5 is the current major.

## Use this folder if

- You're locked to SD 3 by other constraints (build pipeline, custom
  transforms, etc.)
- You need DTCG `$value` / `$type` keys preserved through the build (e.g.
  multiple downstream consumers, some of which want the DTCG metadata)

## Setup

1. Copy this folder next to your `tokens/` directory:

   ```
   my-project/
   ├── tokens/                 # Token Press export, unzipped
   ├── package.json            # ← from this folder
   ├── parsers/dtcg-parser.js  # ← from this folder
   ├── sd.light.json
   └── sd.dark.json
   ```

2. Install:

   ```bash
   npm install
   ```

3. Build all modes:

   ```bash
   npm run build:all
   ```

## What the parser does

`parsers/dtcg-parser.js` walks each loaded token tree and rewrites every
node that has a `$value` key into the SD 3 shape SD expects:

```jsonc
// DTCG (from Token Press)              // SD 3 (after parser)
{                                       {
  "$type": "color",                       "value": "#ff0000",
  "$value": "#ff0000",                    "type": "color",
  "$description": "..."                   "comment": "..."
}                                       }
```

It's deliberately minimal — covers `$value`, `$type`, `$description`,
and drops `$extensions` (SD 3 has no equivalent). For richer DTCG
parsers, see the [`style-dictionary-utils`](https://www.npmjs.com/package/style-dictionary-utils)
package on npm.

## Why these configs don't set `outputReferences`

The v4/v5 starter sets [`outputReferences`](../README.md#aliases-and-outputreferences)
so aliases survive as `var()` references instead of being flattened to
literals. **These SD 3 configs deliberately don't**, because SD 3 crashes
on Token Press's composite tokens when it's enabled:

```
TypeError: value.replace is not a function
  at .../lib/common/formatHelpers/createPropertyFormatter.js:202
```

SD 3's reference-substitution path assumes that when a token's original
value is an object, the resolved value is a string it can run a regex
replace against. For a DTCG composite whose sub-values are aliases, the
resolved value is still an object, so the replace throws and the whole
build dies. It fires whether dimensions are in object or string form, so
the **Apply Style Dictionary preset** doesn't avoid it either.

In practice that means **typography** — Token Press binds text-style
sub-values to variables, so nearly every typography token carries
aliases. **Motion `transition`** composites hit it too. **Shadows don't**:
Token Press always emits effect styles with literal values, never aliases,
so `shadow` tokens are safe. On our reference export the crash comes from
103 typography tokens and 5 transitions.

Scalar aliases (colors, dimensions, font weights) work fine under SD 3 —
the parser shim passes alias strings through verbatim.

### Workaround: split the output by type

If you want `var()` on the scalars and can live without it on composites,
give the composites their own file with `outputReferences` off:

```jsonc
"files": [
  {
    "destination": "variables.css",
    "format": "css/variables",
    "filter": (token) => token.type !== "typography" && token.type !== "transition",
    "options": { "outputReferences": true }
  },
  {
    "destination": "composites.css",
    "format": "css/variables",
    "filter": (token) => token.type === "typography" || token.type === "transition"
  }
]
```

`filter` needs a function, so this has to live in a JS config
(`sd.light.js` with `module.exports`), not the JSON configs shipped here.
On our reference export that yields 529 `var()` references with no
dangling ones — every alias target lands in the same file as its
referrer, because Token Press only ever aliases scalars to scalars.

If you want `var()` output on a real export, that's a reason to take the
[SD 4/5 upgrade](../sd-v4-or-v5/) this README already recommends above —
SD 4 rewrote reference handling and emits composites correctly:
`--typography-body: var(--font-weight-regular) var(--font-size-md) sans-serif`.

## Adapt to your modes

Same as the v4/v5 starter: copy `sd.dark.json` per mode, update the
glob and buildPath. Add a matching `build:<mode>` script.
