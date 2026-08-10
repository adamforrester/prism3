# Token Press → Style Dictionary 4.x / 5.x

Style Dictionary 4.0 added native DTCG support via `usesDtcg: true`.
This is the cleanest path — no parser shim, no string-shape preset,
no manual key remapping.

## Use

1. Copy this folder next to your `tokens/` directory exported from
   Token Press, so you have:

   ```
   my-project/
   ├── tokens/                 # Token Press export, unzipped
   │   ├── shared/
   │   ├── light/
   │   └── dark/
   ├── package.json            # ← from this folder
   ├── sd.light.json
   └── sd.dark.json
   ```

2. Install Style Dictionary:

   ```bash
   npm install
   ```

3. Build all modes:

   ```bash
   npm run build:all
   ```

   Output lands in `build/<mode>/variables.css`.

## Adapt to your modes

Copy `sd.dark.json` for each mode in your `tokens/` directory and
update:
- The `source` glob (`tokens/<your-mode>/**/*.json`)
- The `buildPath` (`build/<your-mode>/`)

Then add a matching `build:<mode>` script in `package.json`.

## More than one kind of mode

The three `sd.<mode>.json` configs assume every directory under `tokens/`
is an alternative to the others — one theme *or* another. If your Figma
file varies tokens along two independent axes (theme × breakpoint, say),
each build needs **one directory from each axis**, not one directory total:

```jsonc
// sd.light-desktop.json — included here, run with `npm run build:multi-axis`
"source": [
  "tokens/shared/**/*.json",
  "tokens/light/**/*.json",      // theme axis
  "tokens/desktop/**/*.json"     // breakpoint axis
]
```

Sourcing only one axis fails with `Reference Errors: Some token references
could not be found` — the error names the referenced token, not the missing
directory, so it looks like a broken export when it's a config gap.

Directory names don't say which axis they belong to. Read
`$extensions.figma.collection.name` from each mode file: same collection
name means same axis (mutually exclusive), different means they compose.
See [Multi-axis modes](../README.md#multi-axis-modes-two-or-more-independent-axes)
in the parent README for the grouping recipe and caveats.

## What `outputReferences: true` does

Keeps Token Press's aliases as `var()` references instead of flattening
them to literals. SD defaults it to `false`. Three positions work: the top
level of the config (SD 4/5 only), `platforms.<p>.options`, or
`files[].options` — as used here. The one shape that *doesn't* work is a
bare `outputReferences` key directly on the platform object, which is
silently ignored. See
[the parent README](../README.md#where-to-put-it).

## What `usesDtcg: true` does

Tells SD to treat `$value` / `$type` / `$description` / `$extensions`
as DTCG metadata rather than literal path segments. Without this, the
output CSS would have variables like `--color-primary-default-value`
(with `value` baked in from `$value`) instead of `--color-primary-default`.
