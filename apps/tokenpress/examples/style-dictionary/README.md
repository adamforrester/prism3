# Style Dictionary starter configs for Token Press exports

Drop-in Style Dictionary configurations that consume the per-mode export
layout produced by Token Press 2.2.0+:

```
tokens/
├── shared/        # single-mode collections + typography/shadows composites
├── <mode-a>/      # multi-mode collections, mode-a variant
├── <mode-b>/
└── ...
```

The configs here build each mode independently (one SD invocation per mode)
so the merge never has to choose between two different `$value`s for the
same DTCG path.

## Pick your starter

| You're on | Use this directory | Notes |
|----------|-------------------|-------|
| Style Dictionary **5.x** (latest) | [`sd-v4-or-v5/`](./sd-v4-or-v5/) | Native DTCG. Cleanest path. |
| Style Dictionary **4.x** | [`sd-v4-or-v5/`](./sd-v4-or-v5/) | Same configs work — `usesDtcg: true` shipped in 4.x. |
| Style Dictionary **3.x** | [`sd-v3-with-parser/`](./sd-v3-with-parser/) | Includes a small DTCG → SD-v3 parser shim. Or just use Token Press's **Apply Style Dictionary preset** to skip DTCG entirely. |

Want CSS `font-family` fallback stacks from Token Press's single-family
`fontFamily` tokens? See [`typography-fallbacks/`](./typography-fallbacks/) —
a worked SD 4.x/5.x custom-transform example.

## Files in each starter

Each folder is self-contained:

- `package.json` — pins the SD version and exposes `npm run build:<mode>`
- `sd.<mode>.json` — one config per mode you want to build
- `README.md` — how to wire it into your project

## Adapting to your modes

The example configs assume modes named `light`, `dark`, and `wireframe`
(matching the Figma file the bug was reported against). To adapt to your
own modes:

1. Look at the directory names Token Press produced under `tokens/` —
   those are your mode names.
2. Copy `sd.dark.json` → `sd.<your-mode>.json`.
3. Replace the `tokens/dark/**` glob with `tokens/<your-mode>/**`.
4. Update the `buildPath` so each mode writes to its own output dir.

**Stop here if you have more than one kind of mode.** Step 1 assumes every
directory under `tokens/` is an alternative to every other one — one theme
*or* another. If your Figma file varies tokens along two independent axes
(theme × breakpoint, say), one directory per build is not enough and the
config you get from these steps will fail. See
[Multi-axis modes](#multi-axis-modes-two-or-more-independent-axes) below.

## Multi-axis modes (two or more independent axes)

Token Press emits one directory per **mode**, flattened — it does not group
them by which collection they came from. When all your multi-mode
collections vary along the same axis, that's fine: the directories really
are alternatives, and you pick one.

With two axes it stops being true. A file with a `color` collection
(light/dark) and a `font-fluid` collection (mobile/desktop) exports:

```
tokens/
├── shared/          font.json, dimension.json, typography.json, shadows.json
├── light/           color.json         ← theme axis
├── dark/            color.json
├── mobile/          font-fluid.json    ← breakpoint axis
└── desktop/         font-fluid.json
```

`light` and `desktop` sit side by side as peers, but they are not
alternatives — a single build needs **one from each axis**. Following
"Adapting to your modes" literally gives you this, which fails:

```jsonc
// ✗ missing the breakpoint axis entirely
"source": ["tokens/shared/**/*.json", "tokens/light/**/*.json"]
```

```
Error:
Reference Errors:
Some token references (10) could not be found.

tries to reference {nbds.font-fluid.display.sm.strong}, which is not defined.
```

The error names the *referenced* token, not the missing directory, so it
reads like a broken export. It isn't — `shared/typography.json` aliases
into `font-fluid`, and no `font-fluid` file was sourced.

### The fix: one config per combination, sourcing every axis

```jsonc
// sd.light-desktop.json
{
  "source": [
    "tokens/shared/**/*.json",
    "tokens/light/**/*.json",      // theme axis
    "tokens/desktop/**/*.json"     // breakpoint axis
  ],
  "usesDtcg": true,
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "build/light-desktop/",
      "files": [
        {
          "destination": "variables.css",
          "format": "css/variables",
          "options": { "outputReferences": true }
        }
      ]
    }
  }
}
```

You need one config per combination you actually ship — 2 themes × 2
breakpoints is 4 configs, not 4 builds of 2 directories. A working set is
included as
[`sd-v4-or-v5/sd.light-desktop.json`](./sd-v4-or-v5/sd.light-desktop.json)
with a `build:multi-axis` script.

Combinations multiply, so generate them rather than hand-maintaining
them once you pass about four. `style-dictionary.config.js` can export an
array, or loop `new StyleDictionary(cfg).buildAllPlatforms()` over the
cross product.

### Working out which directory belongs to which axis

The directory names alone won't tell you — that's the gap. Read the
file-level metadata instead. Each mode file carries its source collection:

```jsonc
// tokens/desktop/font-fluid.json
"$extensions": {
  "figma": {
    "collection": { "name": "font-fluid", "id": "VariableCollectionId:6:41" },
    "mode": "desktop"
  }
}
```

**Directories sharing a `collection.name` are the same axis**, and are
mutually exclusive. Across `collection.name`, they compose:

| Directory | `collection.name` | Axis |
|---|---|---|
| `light/`, `dark/` | `color` | theme — pick one |
| `mobile/`, `desktop/` | `font-fluid` | breakpoint — pick one |
| `shared/` | *(various, mode `Default`)* | always sourced |

```bash
# group the mode directories by axis; same axis = same collection name
for f in tokens/*/*.json; do
  node -e "const d=require('./$f'); const x=((d['\$extensions']||{}).figma)||{};
    console.log((x.collection && x.collection.name) || '(no metadata)', '\t', '$f')"
done | sort
```

On the two-axis export above that prints:

```
dimension    tokens/shared/dimension.json
font         tokens/shared/font.json
font-fluid   tokens/desktop/font-fluid.json     ← same axis
font-fluid   tokens/mobile/font-fluid.json      ← same axis
```

`typography.json` and `shadows.json` print `(no metadata)` — they come from
text/effect styles rather than a variable collection, so they carry no
`collection` at all. They live in `shared/` and are always sourced, so this
doesn't affect axis grouping.

⚠️ This only works with **Include `$extensions.figma` metadata** enabled
(the default). Turn it off and axis identity is not recoverable from the
export at all — you'd have to know your own Figma structure. If you export
without extensions and have multiple axes, keep a note of the grouping
outside the token files.

`shared/` holds every single-mode collection plus `typography.json` and
`shadows.json`, and is always sourced regardless of axis.

## Aliases and `outputReferences`

Token Press emits DTCG aliases (`"$value": "{palette.blue-500}"`) wherever a
Figma variable aliases another variable. Style Dictionary **flattens those to
literal values by default** — `outputReferences` defaults to `false`. The
SD 4/5 starter turns it on so aliases survive into the output as `var()`
references:

```css
/* default — the alias is resolved and baked in */
--palette-blue-500: #2563eb;
--color-bg-brand: #2563eb;

/* with outputReferences: true — the reference is preserved */
--palette-blue-500: #2563eb;
--color-bg-brand: var(--palette-blue-500);
```

The second form is what you almost always want from a token pipeline: the
alias graph you built in Figma stays intact in CSS, so re-theming by
overriding a primitive works, and the generated CSS documents its own
intent.

### Where to put it

Three positions work. One that looks like it should doesn't:

```jsonc
{
  "source": ["tokens/shared/**/*.json", "tokens/dark/**/*.json"],
  "usesDtcg": true,
  "outputReferences": true,                         // ✓ SD 4/5 only — whole config is the options bag
  "platforms": {
    "css": {
      "transformGroup": "css",
      "outputReferences": true,                     // ✗ silently ignored — bare platform key
      "options": { "outputReferences": true },      // ✓ every file in this platform
      "files": [
        {
          "destination": "variables.css",
          "format": "css/variables",
          "options": { "outputReferences": true }    // ✓ this file only
        }
      ]
    }
  }
}
```

| Position | SD 3 | SD 4 / 5 |
|---|---|---|
| Top level of the config | ✗ | ✓ |
| `platforms.<p>.options` | ✓ | ✓ |
| `files[].options` | ✓ | ✓ |
| Bare key on the platform object | ✗ | ✗ |

The top-level form works in SD 4/5 because SD copies the entire config into
the options bag it hands to each formatter; platform `options` are then
deep-merged over that, and `files[].options` over that again. The bare
platform key is the one real trap — it reads naturally next to
`transformGroup` and `buildPath`, sits one level away from a position that
*does* work, and fails with no error and no warning, just flattened output.

The starters here use `files[].options`, which works on every version.

This all applies to SD 4 and 5. **SD 3 is a different story** — enabling
`outputReferences` there crashes on aliased composite tokens (typography,
transition). See the [SD 3 starter's
README](./sd-v3-with-parser/README.md#why-these-configs-dont-set-outputreferences).

## Why one config per mode (and not one config that does everything)

Style Dictionary's file globber deep-merges everything in `source`. If two
files define the same DTCG path with different `$value`s — exactly what
multi-mode collections produce — SD picks last-write-wins on the merge,
which silently corrupts the output for everyone but the last mode (and on
heavily-aliased trees, can cycle into a `RangeError: Maximum call stack
size exceeded`). Running SD once per mode keeps each build's source set
collision-free by construction.

This is the same pattern Adobe Spectrum, Salesforce Lightning, and GitHub
Primer use to ship multi-theme tokens.
