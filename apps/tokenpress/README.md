# Token Press

A Figma plugin that exports Variables, Text Styles, and Effect Styles to DTCG/W3C-compliant JSON that is Style Dictionary-ready, packaged as a zip with one file per collection/mode, plus typography.json and shadows.json.

## Features

- **DTCG Compliance**: Exports tokens using W3C Design Tokens Community Group format ($type, $value, $description, $extensions)
- **Multi-mode Support**: Separate files per collection/mode for multi-theme workflows
- **Composite Tokens**: Typography and shadow tokens with proper sub-property mapping
- **Text Decoration Support**: Automatically includes textDecoration property for typography tokens
- **Alias Resolution**: Preserves variable references as DTCG aliases with validation
- **Style Dictionary Ready**: Output tested with Style Dictionary build pipeline
- **Comprehensive Validation**: Error detection for broken aliases, cycles, type mismatches
- **No Network Calls**: Operates entirely client-side

## Quick Start

### Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the plugin**:
   ```bash
   npm run build
   ```

3. **Import into Figma**:
   - Open Figma Desktop
   - Go to Plugins → Development → Import plugin from manifest
   - Select the `manifest.json` file

### Testing with Style Dictionary

```bash
cd tests/sd
npm install
npm run build
```

This validates that exported tokens work with Style Dictionary out of the box.

## Architecture

Token Press uses a modular, extensible architecture with the Strategy pattern for token conversion. See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for comprehensive documentation.

```
src/
├── code.ts                    # Main plugin entry point
├── ui.html                    # Plugin UI
├── constants.ts               # Configuration constants
├── types/
│   ├── dtcg.ts               # DTCG type definitions
│   ├── plugin.ts             # Plugin-specific types
│   ├── converter-types.ts    # Converter interfaces
│   └── errors.ts             # Error handling types
├── plugin/
│   ├── scanner.ts            # Token enumeration
│   ├── validator.ts          # Validation logic
│   ├── exporter.ts           # DTCG transformation & ZIP packaging
│   ├── cache-manager.ts      # O(1) variable lookups
│   ├── type-detection.ts     # Token type detection
│   └── converters/
│       ├── base-converter.ts        # Abstract converter base
│       ├── color-converter.ts       # RGB to DTCG color
│       ├── dimension-converter.ts   # px/rem dimensions
│       ├── typography-converter.ts  # Text style composites
│       └── shadow-converter.ts      # Shadow composites
└── utils/
    ├── batch-optimizer.ts    # Adaptive batch processing
    ├── cache-builder.ts      # Generic caching utilities
    └── object-pool.ts        # Object pooling for performance
```

**Key Improvements (v1.6):**
- Strategy pattern for token converters
- O(1) caching for variable lookups (52x speedup)
- Adaptive batch processing for large exports
- Comprehensive JSDoc and type safety
- ES2018 strict compliance

## Usage

1. **Scan & Validate**: Click to enumerate variables, text styles, and effect styles with validation
2. **Export**: Configure options and download ZIP containing DTCG files

### Export Options

- **Units**: px (default) or rem
- **Dimension Format** *(new in 1.7.0)*: `object` (DTCG-spec, default) or `string` (Style Dictionary-friendly)
- **Letter Spacing Format** *(new in 1.7.0)*: `object` (DTCG-spec, default) or `string`
- **Motion Duration Format** *(new in 2.3.0)*: `object` (DTCG-spec, default) or `string` (`"50ms"` for SD 4.x's `time/seconds` transform)
- **Token Name Case** *(new in 3.0.0)*: `preserve` (default) keeps your Figma casing — `onSuccessContainer` exports as `onSuccessContainer`. `kebab` splits camelCase humps into `on-success-container`. `lower` reproduces the pre-3.0 behaviour, which flattened humps to `onsuccesscontainer`. All three are DTCG-conformant: the spec allows mixed case and defines names as case-sensitive. See [Token name casing](#token-name-casing).
- **Letter Spacing Units**: px or percent
- **Line Height**: Ratio (DTCG default) or dimension
- **Color Space**: sRGB (default) or HSL
- **Namespace**: Optional prefix for token names. Applied as a root wrapper key
  in each file; alias references include it automatically so they stay
  resolvable. If your Figma variables are already named with the prefix
  (`nbds/palette/blue`), the wrapper is skipped and names pass through as-is.
- **Extensions**: Include Figma metadata in `$extensions.figma`
- **Apply Style Dictionary preset / Reset to DTCG defaults** *(new in 1.7.0)*: One-click buttons that stamp Style Dictionary-friendly string formats into the dropdowns above (or restore DTCG-spec object form). Either field is still user-overridable after a preset is applied.
- **Collection include/exclude** *(new in 1.9.0)*: Toggle individual collections in the rail. Excluded collections drop out of the export and the rail stats / footer summary recompute live. State persists across reloads by collection name.

## Output Structure

```
tokens.zip
├── primitives.json           # Single-mode collection
├── brand-theme-light.json    # Multi-mode collection (light)
├── brand-theme-dark.json     # Multi-mode collection (dark)
├── typography.json           # All text styles as typography composites
└── shadows.json             # All effect styles as shadow composites
```

All files include consistent file-level metadata:
```json
{
  "$extensions": {
    "generator": {
      "name": "Token Press",
      "version": "1.0.0"
    }
  }
}
```

Individual tokens may include `$extensions.figma` metadata when "Include Figma Extensions" is enabled.

## Validation

### Errors (Block Export)
- Broken alias targets
- Alias type mismatches
- Circular references
- Invalid JSON schema

### Warnings (Allow Export)
- AUTO line-height (defaults to 1.2)
- Ambiguous font weights (mapped to table)
- Missing shadow spread (defaults to 0)
- Empty collections/modes

## DTCG Mapping

### Variables → DTCG Tokens
- **COLOR** → `color` (RGBA string by default; HSL via Color Space option)
- **FLOAT** → `dimension` (DTCG object form `{ value, unit }` by default; string form `"16px"` via SD preset) or `number` (unitless — grid columns, opacity)
- **STRING** → `fontFamily` or `string`
- **BOOLEAN** → `number` (0/1)

### Default DTCG-Spec Output (1.7.0+)

Dimensions are emitted as DTCG-spec objects out of the box:

```json
{ "$type": "dimension", "$value": { "value": 16, "unit": "px" } }
```

This is the W3C-recommended shape and works directly with any spec-compliant
DTCG consumer.

### Token name casing

Figma variable names often use camelCase (`onSuccessContainer`). Through
v2.3.1, Token Press lowercased names before replacing separators, which
flattened camelCase humps irrecoverably — `onSuccessContainer` became
`onsuccesscontainer`, losing the word boundaries. **v3.0.0 preserves case by
default.**

| Mode | `color/onSuccessContainer` exports as | Notes |
|------|----------------------------------------|-------|
| `preserve` *(default)* | `color/onSuccessContainer` | Your Figma casing, verbatim |
| `kebab` | `color/on-success-container` | Splits humps; also handles acronyms (`parseHTMLValue` → `parse-html-value`) |
| `lower` | `color/onsuccesscontainer` | Pre-3.0 behaviour, for back-compat |

All three modes are DTCG-conformant. The spec requires only that a name be a
valid JSON string, that it not begin with `$`, and that it contain no `{`, `}`,
or `.` — it explicitly permits mixed case and states that "token names are
case-sensitive." Lowercasing was never a spec requirement.

Aliases follow the same mode, so references stay resolvable: under `preserve` a
reference to the token above emits as `{color.onSuccessContainer}`.

Filenames are always lowercase regardless of this setting — case-insensitive
filesystems would collide on case-only differences.

**Style Dictionary needs no custom transforms for any mode.** SD's stock
`name/cti/kebab` transform (part of the built-in `css` transform group) splits
camelCase humps itself, so `preserve` actually yields *better* CSS variables
than the old behaviour:

| Figma name | Pre-3.0 → CSS | v3.0 `preserve` → CSS |
|---|---|---|
| `color/onSuccessContainer` | `--color-onsuccesscontainer` | `--color-on-success-container` |
| `color/onSurfaceVariant` | `--color-onsurfacevariant` | `--color-on-surface-variant` |

⚠️ **Upgrading from 2.x:** if you consume the exported names downstream, this
changes them. Generated CSS/SCSS variables and JS keys will differ. Either
update consumers, or set **Token Name Case** to `lower` to keep the old output.

One caveat worth knowing: if two tokens in the same group differ *only* by case
(`onSuccess` and `OnSuccess`), SD's kebab transform collapses them to the same
CSS variable and the later one wins. The DTCG spec flags this too, noting tools
"MAY display a warning when token names differ only by case." Note the pre-3.0
behaviour was worse here — both names flattened to one key and silently
overwrote each other in the JSON itself. A validator warning is tracked in
[#45](https://github.com/VMLYR/token-forge/issues/45).

### Style Dictionary Compatibility

#### Which Style Dictionary version?

Token Press emits standards-conformant DTCG by default. What "Style
Dictionary-ready" means depends on which SD major version you're on:

| SD version | Native DTCG support | What you need to do |
|-----------|---------------------|----------------------|
| **5.x** (latest) | ✅ Yes — set `usesDtcg: true` in your config | Drop in our DTCG-default output as-is |
| **4.x** | ✅ Yes — set `usesDtcg: true` in your config | Drop in our DTCG-default output as-is |
| **3.x** | ❌ No native DTCG awareness | Either click **Apply Style Dictionary preset** in the export panel (gives you legacy SD-shape values), or wire up a DTCG parser in your SD config |

If you're on SD 3.x and pipe DTCG-default output into a stock
`style-dictionary build`, SD will only emit primitive numeric tokens and
warn `Output name … was generated by …` (many-to-one). It's not seeing
`$value`/`$type` as DTCG keys — it treats them as path segments. Use the
preset, or move to SD 4+ which understands DTCG natively.

For drop-in starting points, see [`examples/style-dictionary/`](./examples/style-dictionary/).

#### Style Dictionary preset (legacy SD shape)

If you consume Token Press output via Style Dictionary's built-in CSS / SCSS
transforms, the simplest path is to click **Apply Style Dictionary preset**
in the export options panel before running an export. That stamps:

| Field | Preset value |
|-------|--------------|
| Dimension Format | `string` |
| Letter Spacing Format | `string` |
| Letter Spacing Units | `px` |
| Line Height | `ratio` |
| Units | `px` |

Output then matches the legacy ≤1.6 shape (`"16px"`, `"1.5rem"`):

- **Colors**: RGBA string format (`"rgba(214, 227, 249, 1)"`) — works with built-in transforms, supports transparency
- **Dimensions**: String format (`"16px"`, `"1.5rem"`)
- **Grid Columns**: Unitless numbers (`2`, `4`, `12`) with `$type: "number"`
- **Grid Properties**: Dimensions with units (`"16px"`) for gutter, margin, column width
- **Font Sizes**: String format (`"16px"`) for direct Style Dictionary consumption

The symmetric **Reset to DTCG defaults** button restores spec-compliant
object-form output. Either dropdown can also be overridden manually per
export — presets stamp values, they don't lock them.

#### Multi-mode output layout (2.2.0+)

When the Figma file contains any multi-mode collection, Token Press
splits the export into per-mode directories so Style Dictionary can
build each mode independently without merge collisions:

```
tokens/
├── shared/                  # single-mode collections + composites
│   ├── primitives.json
│   ├── typography.json
│   └── shadows.json
├── light/                   # multi-mode collections, light variant
│   └── brand-theme.json
└── dark/                    # multi-mode collections, dark variant
    └── brand-theme.json
```

Run SD once per mode, sourcing `tokens/shared/**` plus the mode you
want:

```jsonc
// sd.dark.json
{
  "source": ["tokens/shared/**/*.json", "tokens/dark/**/*.json"],
  "usesDtcg": true,
  "platforms": { /* ... */ }
}
```

Single-mode-only exports stay flat (`tokens/*.json`) — no directory
layer when there's nothing to share with. See
[`examples/style-dictionary/`](./examples/style-dictionary/) for working
configs and [`docs/known-issues/SD-PER-MODE-MERGE.md`](./docs/known-issues/SD-PER-MODE-MERGE.md)
for the historical context behind this layout.

⚠️ **Multiple mode axes:** directories are emitted one per mode, flat, with
no grouping by collection. If your file varies tokens along two independent
axes — theme × breakpoint, say — then `light/` and `desktop/` are siblings
but *not* alternatives, and each build must source **one directory from each
axis**:

```jsonc
"source": [
  "tokens/shared/**/*.json",
  "tokens/light/**/*.json",      // theme axis
  "tokens/desktop/**/*.json"     // breakpoint axis
]
```

Sourcing only one axis fails with `Reference Errors: Some token references
could not be found`, naming the referenced token rather than the missing
directory. To recover which directory belongs to which axis, read
`$extensions.figma.collection.name` from each mode file — same collection
name means same axis. Full recipe and a working config in
[`examples/style-dictionary/README.md`](./examples/style-dictionary/README.md#multi-axis-modes-two-or-more-independent-axes).
Tracked as [#72](https://github.com/VMLYR/token-forge/issues/72), where
carrying axis identity in the export itself is the real fix.

### Text Styles → Typography Composites
```json
{
  "$type": "typography",
  "$value": {
    "fontFamily": "Inter",
    "fontSize": { "value": 16, "unit": "px" },
    "fontWeight": 400,
    "letterSpacing": { "value": 0, "unit": "px" },
    "lineHeight": 1.5,
    "textDecoration": "underline"
  },
  "$extensions": {
    "figma": {
      "styleId": "S:abc123",
      "textDecoration": "UNDERLINE"
    }
  }
}
```

### Effect Styles → Shadow Composites
```json
{
  "$type": "shadow",
  "$value": [{
    "color": "rgba(0, 0, 0, 0.1)",
    "offsetX": { "value": 0, "unit": "px" },
    "offsetY": { "value": 2, "unit": "px" },
    "blur": { "value": 4, "unit": "px" },
    "spread": { "value": 0, "unit": "px" }
  }],
  "$extensions": {
    "figma": {
      "styleId": "S:abc123",
      "effectTypes": ["DROP_SHADOW"]
    }
  }
}
```

## Technical Constraints

### JavaScript Environment
- **ES2018 Compatibility Required**: Figma's plugin environment has strict JavaScript limitations
- **No Optional Chaining**: `?.` operators cause syntax errors
- **No Modern Spread Syntax**: Must use `Object.assign()` instead of spread operators
- **Explicit Null Checks**: Replace optional chaining with explicit `&&` checks

### Architecture
- Uses async Plugin APIs (`getLocalVariableCollectionsAsync`, etc.)
- No external network calls
- Strict DTCG typing and validation
- Error tolerance per PRD specifications

### Build Configuration
- TypeScript target: ES2018 (both tsconfig.json and vite.config.ts)
- Manifest must point to `dist/code.js` not legacy files
- UI JavaScript embedded directly in HTML for reliability

## Development Commands

- `npm run build` - Build plugin
- `npm run dev` - Build with watch mode
- `npm run test` - Run validation tests
- `npm run test:sd` - Test Style Dictionary integration

## Troubleshooting

### Plugin Code Changes Not Taking Effect
**Issue**: Changes to TypeScript files don't appear in plugin behavior
**Solution**: Ensure `manifest.json` points to `"main": "dist/code.js"` not legacy files

### JavaScript Syntax Errors in Plugin
**Issue**: "Unexpected token" errors when loading plugin
**Solution**: Check for ES2019+ syntax and replace with ES2018 equivalents:
- `obj?.prop` → `obj && obj.prop`
- `{ ...obj1, ...obj2 }` → `Object.assign({}, obj1, obj2)`

### Plugin UI Not Loading
**Issue**: Blank or broken plugin interface
**Solution**: Ensure JavaScript is embedded directly in HTML file, not referenced externally

### Variables Not Resolving to Aliases
**Issue**: Expected variable references appear as raw values
**Investigation**: Check if properties are actually bound to variables in Figma - raw values may be correct

## Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Comprehensive system architecture, design patterns, and performance optimizations
- **[ROADMAP.md](./docs/ROADMAP.md)** - Planned future enhancements with effort estimates
- **[OPTIMIZATION_PROGRESS.md](./docs/OPTIMIZATION_PROGRESS.md)** - Complete optimization history and metrics
- **[agents.md](./agents.md)** - Legacy development notes and context