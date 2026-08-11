# Token Press — Agent Handoff

A self-contained technical brief so another agent can reason about this plugin without scanning the codebase. Kept as truthful and current as possible; if you're touching code, verify against source before making claims to a user.

**Current version:** v2.3.1 (2026-06-13). Runtime target: Figma desktop/browser plugin, ES2018.

---

## 1. What Token Press does

Token Press is a Figma plugin that exports a Figma file's design tokens to a ZIP archive of W3C DTCG-compliant JSON files. Consumers pipe the ZIP into Style Dictionary (or any other DTCG-aware tool) to produce CSS, SCSS, JS, iOS/Android tokens.

Three sources feed the export:

| Figma construct | DTCG output |
|---|---|
| **Variables** in Variable Collections | Individual tokens per collection × mode (`$type: color / dimension / number / fontFamily / fontWeight / duration / cubicBezier / string`) |
| **Text Styles** | `typography` composite tokens with sub-property mapping to any variables the text style is bound to |
| **Effect Styles** (drop / inner shadow) | `shadow` composite tokens (single-layer or multi-layer arrays). Blur-only effect styles are skipped with a warning — DTCG has no representation for `BACKGROUND_BLUR` / `LAYER_BLUR`. |

The output is **spec-compliant DTCG by default** (object-form dimensions, durations, letter spacings). A one-click **Style Dictionary preset** stamps legacy string-form values into the option dropdowns for SD 4.x/3.x consumers whose built-in transforms expect the string shape.

**No network calls.** Everything runs client-side.

---

## 2. UI flow (4 steps)

The UI is a stepper: **Scan → Validate → Configure → Export**. All state persists between sessions via Figma's `clientStorage`.

1. **Scan.** Enumerate collections, variables, text styles, effect styles via async Figma APIs (`getLocalVariableCollectionsAsync`, `getLocalVariablesAsync`, `getLocalTextStylesAsync`, `getLocalEffectStylesAsync`). Runs in parallel.
2. **Validate.** See §6.
3. **Configure.** All export options; see §3.
4. **Export.** Runs the pipeline in §5 and downloads a ZIP.

The left rail lists collections with per-collection toggles. Excluded collections drop out of the export and totals recompute live. Toggle state is stored **by collection name** (not id) so it survives Figma file reopens — Figma reissues collection ids on each load.

---

## 3. Export options (all fields in `ExportOptions`)

Defined in `src/types/plugin.ts`. Defaults are set in `DEFAULT_OPTIONS` in `src/code.ts`.

| Option | Type / values | Default | Notes |
|---|---|---|---|
| `units` | `'px'` \| `'rem'` | `'px'` | Base unit for spatial dimensions. |
| `remMultiplier` | `number` (usually 16) | `16` | Base font-size for px→rem conversion. |
| `colorFormat` | `'dtcg'` \| `'css'` | `'dtcg'` | `'dtcg'` = DTCGColor object `{ colorSpace, components, alpha }`; `'css'` = `"rgb(…)"` / `"rgba(…)"` string. |
| `colorSpace` | `'srgb'` \| `'hsl'` | `'srgb'` | Only meaningful for `colorFormat: 'dtcg'`. HSL is non-standard for DTCG; option is exposed for downstream tools that prefer it. |
| `lineHeightOutput` | `'ratio'` \| `'dimension'` \| `'percentage'` | `'ratio'` | Ratio (unitless number) is spec-preferred and scales with font-size. Dimension emits px/rem. Percentage emits `%`-unit dimension. |
| `letterSpacingUnits` | `'px'` \| `'percent'` | `'px'` | When `'percent'`, letter spacing is always a string regardless of `letterSpacingFormat`. |
| `dimensionFormat` | `'object'` \| `'string'` | `'object'` | Object = DTCG spec `{ value, unit }`. String = `"16px"` for SD 3.x/legacy. |
| `letterSpacingFormat` | `'object'` \| `'string'` | `'object'` | Same idea. `percent` letter spacings always emit as string. |
| `durationFormat` | `'object'` \| `'string'` | `'object'` | Object = DTCG 2024-12+ spec `{ value, unit: 'ms' }`. String = `"50ms"` for SD 4.x's built-in `time/seconds` transform (which doesn't understand the object form). New in v2.3.0. |
| `namespace` | `string` (optional) | — | Wraps every token path under a root key, e.g. `pds.color.primary`. |
| `includeFigmaExtensions` | `boolean` | `true` | Emits `$extensions.figma` with `variableId`, `collection`, `scopes`, optional `codeSyntax`. |
| `formatCss`, `formatRawFigma`, `formatDotNotation` | `boolean` | `false` | Additional output files bundled into the ZIP alongside DTCG (CSS custom properties, raw Figma variable dump, dot-notation JSON). Independent of the main DTCG export. |
| `excludedCollections` | `string[]` | `[]` | Collection **names** to omit from the export. |

### 3.1 Quick preset chips ("Configure" step)

Three-chip radio group at the top of Configure — **DTCG-spec / Style Dictionary / Off-spec**. Chips don't change behavior directly; they stamp fingerprint values into the option fields above. Non-preset field values are still user-overridable after applying.

**DTCG-spec** (default):
- `dimensionFormat: 'object'`, `letterSpacingFormat: 'object'`, `durationFormat: 'object'`
- `colorFormat: 'dtcg'`, `colorSpace: 'srgb'`
- Detects: any config where all four spec-gated fields match their spec-compliant values.

**Style Dictionary** (exact fingerprint match — the "SD recipe"):
- `dimensionFormat: 'string'`, `letterSpacingFormat: 'string'`, `durationFormat: 'string'`
- `letterSpacingUnits: 'px'`, `lineHeightOutput: 'ratio'`, `units: 'px'`, `colorFormat: 'css'`
- Produces legacy SD-shape values (`"16px"`, `"50ms"`, `"rgba(…)"`) that SD 4.x's built-in transforms consume without config.

**Off-spec** (status indicator, not clickable):
- Any configuration that matches neither above. Chip is disabled — it's a warning that the current settings are neither DTCG-conformant nor a clean SD recipe.

The JSON output chip in the export panel mirrors the active preset ("DTCG JSON" / "Style Dictionary JSON" / "Off-spec JSON") so the user sees which shape they're about to export.

---

## 4. Variable type resolution (the trickiest part of the plugin)

Figma's `VariableResolvedDataType` values are `COLOR`, `FLOAT`, `STRING`, `BOOLEAN`. Mapping these to DTCG `$type` needs judgment — a `FLOAT` could be a dimension, a duration, a font weight, a unitless number, etc. The mapping happens in `mapVariableTypeToDTCG()` in `src/plugin/exporter.ts`.

**Order of decision (FLOAT branch — most important):**

1. **Grid variables (name-based).** `isGridVariable(name)` matches `grid`, `column`, `gutter`, `margin`. `isGridColumnsVariable(name)` narrows to columns → `number` (unitless). Other grid variables → `dimension`.
2. **Motion duration (name-based).** `isMotionDurationVariable(name)` matches names containing (`motion`|`animation`|`transition`) AND `duration`. Excludes `easing`. → `duration`.
3. **Explicit scope checks.** `FONT_WEIGHT` → `fontWeight`. `LINE_HEIGHT` → `number` (ratio mode) or `dimension` (dimension/percentage mode). `OPACITY` → `number`. `FONT_SIZE` → `dimension`. `LETTER_SPACING` → `dimension`.
4. **Breakpoint (name-based).** `isBreakpointVariable(name)` matches `breakpoint`, `viewport`, `screen`, `media`, `responsive`, `xs/sm/md/lg/xl/mobile/tablet/desktop`, or a pure-numeric last name segment (e.g. `.../768`). → `dimension`.
5. **Negative dimension (name-based).** `neg-`, `negative-`, `neg_`, `neg\d+`. → `dimension`.
6. **Border dimension (name-based).** `border` + `radius`, `border` + `width`, or `radius` in a component-like context (`button`, `pill`, `container`, `xs/sm/md/lg/xl/2xl`, `none`). → `dimension`.
7. **Scope-based dimension fallback.** Any of `WIDTH_HEIGHT`, `GAP`, `CORNER_RADIUS`, `STROKE_FLOAT`, `EFFECT_FLOAT`, `FONT_SIZE` → `dimension`.
8. **Alias scope inheritance (v2.3.1).** If the variable is an alias with **no explicit scopes** ("All scopes" default in Figma), walk the alias chain to the deepest non-alias source and inherit the source's scopes for type resolution. Hop-limited to 10, cycle-protected. If the source is also unscoped, fall back to the alias's own (empty) scopes.
9. **Final fallback.** → `number`. Reached only when the FLOAT variable has no name-heuristic match, no dimension scope, and (if aliased) no source scopes either.

**Other resolvedTypes:**

- `COLOR` → `color` (shape depends on `colorFormat` + `colorSpace`).
- `STRING`: name matches `easing`/`ease`/`timing`/`curve`/`bezier` → `cubicBezier` (value maps via `CUBIC_BEZIER_MAP` in `src/constants.ts`); `FONT_FAMILY` scope → `fontFamily`; `FONT_WEIGHT` / `FONT_STYLE` scope → `fontWeight`; else → `string`.
- `BOOLEAN` → `number` (0/1). BOOLEAN is not exported by default; excluded from `ScanResult.variables`.

**Practical implication:** the user's variables *should* have appropriate scopes set in Figma. When they don't, Token Press does its best with name heuristics and alias-walking, but the correctness ceiling is set by Figma metadata. When answering support questions: "scope your variables to their intent" is still the right long-term advice, but the plugin now covers most unscoped cases via inheritance.

---

## 5. Export pipeline

`TokenExporter.exportToZip()` in `src/plugin/exporter.ts:115`. Progress phases at 10/25/35/45/80/90% (see `PROGRESS_CONFIG.PHASES`).

1. **Scan** (`TokenScanner.scanAll`) — parallel `Promise.all` over four async Figma APIs. Applies `excludedCollections` filter here.
2. **Layout decision.** If any collection has multiple modes → per-mode directory layout (`tokens/shared/<file>` + `tokens/<mode>/<file>`). Otherwise flat (`tokens/<file>`). See §7.
3. **Variable export.** For each collection × mode, build one `DTCGFile`. Each variable becomes a `DTCGToken` with `$type`, `$value`, optional `$description`, optional `$extensions.figma`. Transition composites (matching `duration` + `delay` + `timing` siblings under one namespace) are compiled into a single `transition` token replacing the individual sub-tokens.
4. **Typography export.** Iterate text styles via `BatchOptimizer` (adaptive batch sizing, 10-100 styles/batch, targeting 16ms/batch for 60fps). Each text style → `typography` composite; bound variables become `{namespace.path.to.variable}` alias refs.
5. **Shadow export.** Iterate effect styles. Drop / inner shadows → `shadow` composite (or array for multi-layer). Blur-only effect styles are skipped and their names collected for a warning ("Skipped N blur-only effect style(s): …") — this generalizes the DTCG "empty composite" case.
6. **ZIP generation.** JSZip with DEFLATE level 6. `MAX_ZIP_SIZE_BYTES = 50MB`, `MAX_JSON_SIZE_BYTES = 5MB` — warnings only, not blockers.

Yields control to the UI every 10 collections (`PERFORMANCE_LIMITS.YIELD_INTERVAL`) to prevent blocking.

---

## 6. Validation

`TokenValidator.validateAll()` in `src/plugin/validator.ts`. Runs during Scan step, results surface in the Validate step.

**Errors (block export):**
- Broken alias target (references a variable that doesn't exist).
- Alias cycles (A → B → A).
- Alias type mismatch (e.g. a FLOAT alias references a COLOR variable).

**Warnings (allow export):**
- AUTO line-height on a text style (defaults to 1.2).
- Implausible line-height ratio (percent line-height with ratio < 0.8 or > 3).
- Missing shadow spread (defaults to 0).
- Empty collections or modes.
- Blur-only effect styles skipped (surfaced in the export footer after the fact, not during validation).

`ValidationIssue` shape: `{ type: 'error' | 'warning', message, source, details? }`.

---

## 7. Output layout

### Single-mode files only (flat)
```
tokens.zip
├── primitives.json
├── typography.json
├── shadows.json
└── <collection>.json
```

### Any multi-mode collection present (directory-per-mode, v2.2.0+)
```
tokens.zip
├── shared/
│   ├── primitives.json
│   ├── typography.json
│   └── shadows.json
├── light/
│   └── brand-theme.json
└── dark/
    └── brand-theme.json
```

**Why:** SD's default file-globber deep-merges everything under `source`. Two files with the same DTCG path but different `$value`s (which is exactly what multi-mode collections produce with per-mode sibling files) trigger last-write-wins, and heavily-aliased trees can cycle SD into `RangeError: Maximum call stack size exceeded`. Directory-per-mode keeps each mode's source set collision-free.

**File-level `$extensions`** always includes `generator: { name: "Token Press", version }` and (for variable files) `figma: { collection: {…}, mode }`.

**SD starter configs** live in `examples/style-dictionary/`:
- `sd-v4-or-v5/` — one config per mode with `usesDtcg: true` and `transformGroup: "css"`. SD 4.x/5.x understand DTCG natively.
- `sd-v3-with-parser/` — includes a minimal DTCG → SD-3 parser shim.

---

## 8. Composite tokens

### 8.1 Typography
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
  "$extensions": { "figma": { "styleId": "S:…", "textDecoration": "UNDERLINE" } }
}
```

- Any of the sub-properties may be an alias reference `"{path.to.variable}"` if the text style is bound to a variable in Figma.
- Font weight resolves via `FONT_WEIGHT_MAP` when the text style uses a named weight (e.g. `Semibold` → 600).
- `textDecoration` is omitted when the style uses default (`NONE`).

### 8.2 Shadow
```json
{
  "$type": "shadow",
  "$value": [{
    "color": "rgba(0, 0, 0, 0.1)",
    "offsetX": { "value": 0, "unit": "px" },
    "offsetY": { "value": 2, "unit": "px" },
    "blur":    { "value": 4, "unit": "px" },
    "spread":  { "value": 0, "unit": "px" }
  }],
  "$extensions": { "figma": { "styleId": "S:…", "effectTypes": ["DROP_SHADOW"] } }
}
```

- Single-layer shadows can also emit as a bare object (not an array); multi-layer always arrays.
- `inset: true` present on `INNER_SHADOW`.
- Blur-only effect styles are **not** emitted; DTCG has no `filter`/`blur` type. Their names are collected and surfaced in the export footer.

### 8.3 Transition (compiled composite)
When a namespace contains sibling tokens named `duration`, `delay`, and `timing`/`timingFunction`/`easing` (any subset ≥ 1), Token Press compiles them into a single `transition` composite and removes the individual sub-tokens:
```json
{
  "$type": "transition",
  "$value": {
    "duration": { "value": 200, "unit": "ms" },
    "delay":    { "value": 0,   "unit": "ms" },
    "timingFunction": [0.42, 0, 0.58, 1]
  }
}
```
Fallbacks are shape-matched to `durationFormat` so the composite doesn't mix object + string shapes when a sub-token is missing.

---

## 9. Key files

- `src/code.ts` — Figma plugin entry point, message handler, `DEFAULT_OPTIONS`.
- `src/ui.html` — full UI (stepper + rail + Configure form + preset chips). All JS embedded inline for Figma plugin loader reliability.
- `src/types/plugin.ts` — `ExportOptions`, `ScanResult`, `ValidationIssue`, `AliasEdge`.
- `src/types/dtcg.ts` — DTCG shape types + `FONT_WEIGHT_MAP`.
- `src/types/converter-types.ts` — `ConversionContext` passed to converters.
- `src/plugin/exporter.ts` — the meat. `TokenExporter` class, ZIP build, DTCG file build, variable → token conversion, transition composite compilation, `mapVariableTypeToDTCG`, `resolveAliasSourceScopes`, `formatDimensionValue`, `formatDurationValue`.
- `src/plugin/scanner.ts` — thin wrapper around Figma's async APIs.
- `src/plugin/validator.ts` — the six validation rules.
- `src/plugin/type-detection.ts` — name-based heuristics for grid / breakpoint / motion / negative / border tokens.
- `src/plugin/cache-manager.ts` — O(1) caches for font-weight and line-height variable lookups (used during typography composite build).
- `src/plugin/converters/` — Strategy pattern per token family (color, dimension, typography, shadow, base). Shared helpers.
- `src/constants.ts` — perf limits, precision rounding, `TYPE_DETECTION_PATTERNS`, `CUBIC_BEZIER_MAP`.

---

## 10. Runtime constraints

**Figma's plugin sandbox is ES2018.** Do not use `?.`, `??`, spread syntax on objects, or top-level await. Use `obj && obj.prop`, `Object.assign()`, and explicit `if` checks. Vite is configured with `target: 'es2018'`; minification is off (Figma's JS parser is picky).

**Async APIs only.** `getLocalVariableCollectionsAsync` etc. — Figma's sync variable APIs are deprecated/removed on plugin API v1.

**Bundle target.** `manifest.json` → `main: dist/code.js` (single bundle produced by `vite build`). UI at `src/ui.html`. Latest build ~255 kB / 60 kB gzip.

**Storage.** Options and excluded-collection state persist via `figma.clientStorage.setAsync` under the key `token-press-options`. Preferences survive across sessions and file reopens.

**Performance guardrails.**
- Max 1000 text styles processed per export (`PERFORMANCE_LIMITS.MAX_TEXT_STYLES`).
- Adaptive batch sizing for text styles (10–100/batch, target 16ms/batch).
- Yield to the UI every 10 collections.
- ZIP compression level 6 (DEFLATE) — balances speed and size.
- Warnings (not errors) at 50MB ZIP / 5MB per JSON file.

---

## 11. Version state

Latest release: **v2.3.1** (2026-06-13). Tag `v2.3.1`, commit `6376ff0`.

Recent history since the last Figma community release (v2.1.0):
- **v2.2.0** — directory-per-mode export layout (fixes SD merge crash on multi-mode files).
- **v2.2.1** — round IEEE-754 noise out of dimension exports (`0.03999999910593033px` → `0.04px`).
- **v2.2.2** — skip blur-only effect styles instead of emitting empty shadow tokens.
- **v2.3.0** — `durationFormat` option + SD preset now covers motion durations (fixes `[object Object]` in CSS under SD 4.x's `time/seconds` transform).
- **v2.3.1** — alias-walk type resolution: unscoped aliases now inherit scopes from source. Also adds FONT_SIZE to the scope-based dimension fallback.

CHANGELOG at `docs/CHANGELOG.md`. Full architecture doc at `docs/ARCHITECTURE.md` (833 lines, more detail than needed for most agent tasks).

---

## 12. Known limitations & edge cases

- **Glass / blur effects don't tokenize.** DTCG has no `filter` / `blur` type. Blur-only effect styles are skipped by design. Mixed shadow+blur styles emit the shadow layer and drop the blur layer.
- **`LINE_HEIGHT` ratio mode legitimately emits `number`.** If a user reports a line-height alias typing as `number` instead of `dimension`, check `lineHeightOutput` — default is `ratio` (spec-correct as `number`).
- **`FONT_STYLE` scope is treated as `FONT_WEIGHT`** for STRING variables. Figma uses `FONT_STYLE` to scope font weight variables; DTCG only has `fontWeight`.
- **Alias scope inheritance never overrides explicit alias scopes.** If a user scopes an alias to `OPACITY` but the source is `WIDTH_HEIGHT`, the alias will still classify as `number`. This is intentional — user intent on the alias is the strongest signal.
- **BOOLEAN variables aren't exported** in the default variable stream. They're excluded from `ScanResult.variables`.
- **Typography / shadow files ignore the collection-exclude rail.** Text styles and effect styles live outside variable collections in Figma, so the rail toggles don't gate them. Known follow-up (issue-worthy, not yet filed).

---

## 13. Where to look for what

| Question | File |
|---|---|
| "What options exist?" | `src/types/plugin.ts` |
| "What are the defaults?" | `src/code.ts` (`DEFAULT_OPTIONS`) |
| "How does type X get classified?" | `src/plugin/exporter.ts` (`mapVariableTypeToDTCG`) + `src/plugin/type-detection.ts` |
| "What does the SD preset do?" | `src/ui.html` (`applySDCompatPreset`, `presetFingerprint`, `detectActivePreset`) |
| "How is the ZIP built?" | `src/plugin/exporter.ts` (`exportToZip`) |
| "What errors block export?" | `src/plugin/validator.ts` |
| "How are transition composites compiled?" | `src/plugin/exporter.ts` (`compileTransitionComposites`) |
| "What's in a typography token?" | `src/plugin/converters/typography-converter.ts` |
| "Why is my export layout per-mode?" | `docs/known-issues/SD-PER-MODE-MERGE.md` |
| "What SD version do I need?" | README §Style Dictionary Compatibility + `examples/style-dictionary/` |
