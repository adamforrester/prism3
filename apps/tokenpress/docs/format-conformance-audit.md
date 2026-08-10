# Output Format Conformance Audit

**Status:** Initial pass — 2026-05-21
**Plugin version audited:** v1.9.6
**Author:** Claude (paired with Adam Forrester)
**Scope:** DTCG primary output + secondary formats (CSS, raw-figma, dot-notation), benchmarked against the DTCG W3C draft and Style Dictionary v4 with `usesDtcg: true`.

---

## 1. Why this audit exists

Token Press exposes a preset chip with three states: **DTCG (default)**, **Style Dictionary**, and **Custom**. The chip implies a contract — pick a preset and the output will conform to that ecosystem's expectations. This audit answers four questions:

1. **Where does each preset diverge from spec?** Document every option-by-option difference.
2. **What inconsistencies exist within a single preset?** Find places where similar values take different shapes.
3. **What does "Custom" actually mean?** When does flipping a single option push you off both presets — and is that semantically correct?
4. **What's the chip claiming?** "Matches spec" or "matches our default opinion of spec"? They're not the same.

The goal is to either (a) tighten the implementation, (b) update the chip copy / preset definitions to match reality, or (c) accept divergence as a documented opinion. Each finding gets a recommendation in one of those three categories.

---

## 2. The preset definitions today

From `src/ui.html:1577-1605` and `src/code.ts:17-32`:

| Option | DTCG default | SD preset | Notes |
|---|---|---|---|
| `units` | `'px'` | `'px'` | Both presets emit px. |
| `remMultiplier` | `16` | `16` | Only used when `units === 'rem'`. |
| `colorFormat` | `'dtcg'` (object) | `'css'` (rgb/rgba string) | DTCG color object vs CSS string. |
| `colorSpace` | `'srgb'` | n/a (ignored when `colorFormat: 'css'`) | The chip detector ignores this field deliberately. |
| `lineHeightOutput` | `'ratio'` | `'ratio'` | Both default to unitless. |
| `letterSpacingUnits` | `'px'` | `'px'` | Both presets agree. |
| `dimensionFormat` | `'object'` | `'string'` | The defining axis of the SD preset. |
| `letterSpacingFormat` | `'object'` | `'string'` | Mirrors `dimensionFormat`. |
| `includeFigmaExtensions` | `true` | `true` | Both keep `$extensions.figma`. |

**Observation 1.** The presets only differ on **three** axes: `dimensionFormat`, `letterSpacingFormat`, and `colorFormat`. Everything else is shared.

**Observation 2.** The Custom chip activates the moment any one of these six fields drifts from a preset:
`dimensionFormat`, `letterSpacingFormat`, `letterSpacingUnits`, `lineHeightOutput`, `units`, `colorFormat`.
Several of those drifts produce output that is **still spec-compliant**. See finding F2.

---

## 3. DTCG spec compliance — variable hot path

Reference: `docs/DTCG_SPECIFICATION.md`, https://tr.designtokens.org/format/

### 3.1 Color (`$type: "color"`)

| Implementation | Spec status | Notes |
|---|---|---|
| `colorFormat: 'dtcg'`, `colorSpace: 'srgb'` → `{ colorSpace: 'srgb', components: [r,g,b], alpha }` | ✅ Conformant | Components 0–1 floats, 4-decimal precision. |
| `colorFormat: 'dtcg'`, `colorSpace: 'hsl'` → `{ colorSpace: 'hsl', components: [h,s,l], alpha }` | ⚠️ Non-standard component scale | DTCG keeps colorSpace open, but HSL implementations vary. We emit H: 0–360, S: 0–100, L: 0–100. The spec doesn't pin HSL ranges. SD doesn't natively understand the HSL object form. **Finding F3.** |
| `colorFormat: 'css'` → `"rgb(r, g, b)"` / `"rgba(r, g, b, a)"` strings | ⚠️ Plugin opinion (deviation from spec) | The DTCG spec defines `color` as `{ colorSpace, components, alpha? }`. CSS-string colors are how earlier SD versions consumed colors, but they are **not** what `usesDtcg: true` SD v4 expects. **Finding F1.** Documented in `DTCG_SPECIFICATION.md` as "Token Press Implementation Preference." |

### 3.2 Dimension (`$type: "dimension"`)

| Implementation | Spec status | Notes |
|---|---|---|
| `dimensionFormat: 'object'`, unit `'px'` | ✅ Conformant | DTCG dimension allows px/rem/em/%. |
| `dimensionFormat: 'object'`, unit `'rem'` | ✅ Conformant | DTCG explicitly accepts rem. The audit task description hypothesized "switching to rem makes it Custom" — this is **true** because the `units` field flips, but the **shape** remains spec-compliant. **Finding F2.** |
| `dimensionFormat: 'object'`, unit `'%'` (line-height percentage, containermax full) | ✅ Conformant since v1.9.6 (#33) | `'%'` is a valid `DTCGDimension['unit']` per our type definition and the spec text. |
| `dimensionFormat: 'string'` (e.g., `"16px"`) | ❌ Not DTCG-spec | This is SD-friendly only. The dimension spec requires the object shape. The Custom chip already triggers on this — but a user reading "Style Dictionary" preset might assume that shape is also DTCG-valid. It isn't. |

### 3.3 Line height — variable hot path

`exporter.ts:617-643` (variable hot path) and `dimension-converter.ts:82-106` (DimensionConverter.convertLineHeight).

| `lineHeightOutput` | Variable hot path emits | Spec status |
|---|---|---|
| `'ratio'` | unitless number, e.g. `1.5` | ✅ Conformant — DTCG specifies typography.lineHeight as a number multiplier. |
| `'percentage'` | `dimensionFormat: 'object'` → `{ value: 155.6, unit: '%' }`<br/>`'string'` → `"155.6%"` | ✅ Conformant since v1.9.6 (#33). The `$type` for these is `'dimension'` (see `mapVariableTypeToDTCG`), so emitting a DTCGDimension object is correct. |
| `'dimension'` | px or rem, in `{ value, unit }` or string per `dimensionFormat` | ✅ Conformant. |

### 3.4 Typography composite (`$type: "typography"`) — **not** the variable hot path

These are emitted from `TypographyConverter` for Figma text styles, not variables. Critical: the typography composite does **not** route every dimension through `formatDimension(...)`.

| Property | Composite emits | Spec status |
|---|---|---|
| `fontFamily` | string (resolved) or `DTCGAlias` | ✅ Conformant. (DTCG accepts either string or array; we emit a single string from `textStyle.fontName.family`. **Finding F6.**) |
| `fontSize` | DTCGDimension or string per `dimensionFormat` | ✅ Conformant. |
| `fontWeight` | numeric weight | ✅ Conformant. |
| `letterSpacing` (px/rem path) | DTCGDimension or string per `letterSpacingFormat` | ✅ Conformant. |
| `letterSpacing` (percent path) | always `"<value>%"` string regardless of `letterSpacingFormat` | ⚠️ **Inconsistent.** `'%'` is a valid DTCGDimension unit. The plugin treats it as "more readable as a CSS-style string." **Finding F4.** (`typography-converter.ts:217-220`) |
| `lineHeight` PERCENT input + `lineHeightOutput: 'percentage'` | always `"<value>%"` string | ⚠️ **Inconsistent with #33 fix in variable hot path.** `typography-converter.ts:296` |
| `lineHeight` PIXELS input + `lineHeightOutput: 'percentage'` | always `"<percentValue>%"` string | ⚠️ Same. `typography-converter.ts:313-314` |
| `lineHeight` AUTO + `lineHeightOutput: 'percentage'` | always `"120%"` string | ⚠️ Same. `typography-converter.ts:328-329` |
| `lineHeight` ratio / dimension paths | number or DTCGDimension | ✅ Conformant. |
| `textDecoration` | `'none' \| 'underline' \| 'line-through'` | ✅ Conformant. (Spec also allows `'overline'`; we map STRIKETHROUGH→line-through, but Figma offers no overline source — non-issue.) |
| `fontStyle` (italic/oblique extension) | string | ⚠️ Not in DTCG typography spec; we add it as a non-standard sibling on `$value`. **Finding F7.** |

### 3.5 Shadow (`$type: "shadow"`)

`shadow-converter.ts` always emits dimensions as objects (not routed through `dimensionFormat`).

| Property | Emits | Spec status |
|---|---|---|
| `color` | CSS rgb/rgba **string** (not DTCG color object) | ⚠️ **Plugin opinion / shape mismatch.** The DTCG spec defines shadow.color as `DTCGColor \| DTCGAlias` (object form). We always emit a string. SD's shadow transformer accepts strings, so this is SD-friendly but DTCG-non-conformant. **Finding F5.** |
| `offsetX`, `offsetY`, `blur`, `spread` | always `{ value, unit }` regardless of `dimensionFormat` | ⚠️ **Hot-path inconsistency.** Variable dimensions honor `dimensionFormat: 'string'`; shadow layers ignore it. SD preset users get DTCG-shape dimensions inside shadow.color-string-shadows. **Finding F8.** |
| `inset` | boolean | ✅ Conformant. |

### 3.6 Other token types (`number`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `transition`)

| Type | Emits | Spec status |
|---|---|---|
| `number` (opacity, ratio line-height, grid columns) | unitless number, 3-decimal precision for opacity | ✅ Conformant. |
| `fontFamily` (variable hot path) | string from Figma name | ✅ Conformant. (Could optionally be array per spec — see F6.) |
| `fontWeight` | number 100–900 | ✅ Conformant. Spec also allows keyword strings; we always normalize to numeric. |
| `duration` (motion duration) | `{ value, unit: 'ms' }` | ✅ Conformant — even though the file `DTCG_SPECIFICATION.md` warns it's draft. **Finding F9.** Also note: `DTCG_SPECIFICATION.md:398-401` says we use `$type: number` for durations, but the actual code emits `$type: duration`. The doc is stale. |
| `cubicBezier` | `[p1x, p1y, p2x, p2y]` array | ✅ Conformant. (Draft type, but stable shape.) |
| `transition` | composite `{ duration, delay, timingFunction }` | ✅ Conformant per draft. (Draft type.) |

### 3.7 Token references / aliases

`{path.to.token}` curly-brace strings on `$value`. ✅ Conformant per DTCG section "Token References." We do **not** emit DTCG's newer `{ "$alias": "{path}" }` shape — only the curly-brace string form. This is the more widely-supported convention; SD v4 understands it natively.

### 3.8 Naming conventions

`sanitizeTokenName` lowercases and kebab-cases each path segment; uses `/` to separate. Path-to-DTCG conversion: `/` → nested groups. ✅ Conformant. Token names cannot start with `$`, can't contain `{`, `}`, `.` — our sanitizer guarantees this.

### 3.9 File-level metadata

- `$extensions.generator: { name: 'Token Press', version: '1.0.0' }` — version literal is **stale** (plugin is on v1.9.6, file says 1.0.0). **Finding F10.** (`exporter.ts:1051-1057`)
- `$extensions.figma.collection`, `$extensions.figma.mode` — DTCG vendor-namespaced. ✅ Conformant.
- Per-token `$extensions.figma.{variableId, collection, scopes, codeSyntax}` — ✅ Conformant.

---

## 4. Style Dictionary v4 (`usesDtcg: true`) compatibility

Style Dictionary v4 with `usesDtcg: true` consumes the DTCG `$type`/`$value` shape natively but has subtle expectations. From SD v4 docs and `tests/sd/`:

| Token type | What SD v4 (`usesDtcg: true`) expects | What we emit (DTCG default) | What we emit (SD preset) |
|---|---|---|---|
| color | DTCG color object **or** CSS string | DTCG object ✅ | rgb/rgba string ✅ |
| dimension | string `"16px"` (legacy) **or** DTCG object | DTCG object ✅ | string ✅ |
| typography composite | DTCG composite | DTCG composite ✅ | DTCG composite ✅ — *but* `letterSpacing` percent is always string, line-height percent is always string |
| shadow | array or single layer; color as string | array/single ✅; color as string ✅ | same |
| number | unitless number | ✅ | ✅ |
| fontWeight | numeric | ✅ | ✅ |
| duration | DTCG object `{ value, unit: 'ms' }` | ✅ | ✅ |
| cubicBezier | `[n,n,n,n]` array | ✅ | ✅ |

**The SD preset is well-targeted.** SD's `'css'` transform group prefers stringy dimensions and CSS color strings, which is exactly what the SD preset emits. `usesDtcg: true` SD v4 happily consumes either shape — the SD preset is technically over-flattening for v4 but matches what the existing `tests/sd/` smoke fixture expects.

### 4.1 Documented SD-specific quirks

The known-issues file already covers per-mode merge collisions, which is an SD-side limitation, not a plugin bug.

### 4.2 Untested SD claims

- `tests/sd/` has fixtures for the SD preset path but I haven't verified that the **DTCG default** (object dimensions) round-trips through SD v4 cleanly. SD v4 should accept it under `usesDtcg: true`, but if anyone wires SD without that flag, object dimensions will silently break. **Finding F11** (low priority — out of plugin scope).

---

## 5. Custom-mode semantics

The chip flips to **Custom** when the six tracked fields don't match either preset. Two common drifts and what they actually mean:

### 5.1 `units: 'rem'` while everything else matches DTCG

- Result: Custom chip activates.
- Output shape: `{ value: 1, unit: 'rem' }` for variables.
- DTCG status: ✅ **fully spec-conformant.**
- SD v4 status: ✅ accepted under `usesDtcg: true`.

The chip implies a problem where there isn't one. The user is still emitting valid DTCG tokens; they've just chosen rem over px. **Finding F2 — chip copy or preset definition needs revision.** Options:
- **(a)** Make `units` not part of the preset fingerprint — DTCG default expands to "any DTCG-valid unit choice."
- **(b)** Rename Custom → "Custom (still DTCG-valid)" or split into "Custom DTCG" / "Off-spec." Conceptually heavier but more honest.
- **(c)** Leave it. Custom == "doesn't exactly match the preset shape" is a defensible read; the chip is a fingerprint, not a validity claim. But then the chip name could mislead.

### 5.2 `lineHeightOutput: 'percentage'` while everything else matches DTCG

- Result: Custom chip activates.
- Output shape (post-#33): `{ value: 155, unit: '%' }` — DTCG-conformant.
- Same situation as 5.1.

### 5.3 `colorSpace: 'hsl'` while everything else matches DTCG

- Result: Custom chip does **not** activate (colorSpace is intentionally excluded from the fingerprint per `ui.html:1606-1608`).
- Output shape: `{ colorSpace: 'hsl', components: [h, s, l] }` with H:0–360, S/L:0–100.
- DTCG status: ⚠️ marginal — the spec accepts arbitrary colorSpace, but HSL's component-range conventions aren't standardized.
- SD v4 status: ❌ no built-in HSL transformer for the DTCG object form.

So we have the inverse problem here: a setting that produces **less** standard output than the chip suggests. **Finding F3.**

---

## 6. Secondary formats (CSS, raw-figma, dot-notation)

These are not DTCG outputs and don't claim to be. They flow off the DTCG output and are documented intent:

| Format | What it emits | Notes |
|---|---|---|
| **CSS custom properties** (`tokens.css`) | `:root { --token-name: value; }` | Typography composites are expanded into per-property `--font-family-*`, `--font-size-*`, etc. References resolve to `var(--other-token)`. Shadow layers concat into a single CSS shadow string. ✅ Sensible. |
| **raw-figma** (`*.json`) | `{ $collection, $mode, variables: [{ id, name, resolvedType, scopes, value, alias, codeSyntax, ... }] }` | Pure dump. Useful for debugging or building custom downstream. **Finding F12** — dot-notation doc explicitly says it ignores `excludedCollections`; raw-figma should be checked too. |
| **dot-notation** (`*.txt`) | `path.to.token: "value"`, aliases shown as `path: "{alias}" -> resolved` | Plain text for inspection. ✅ Sensible. |

### 6.1 Secondary format gaps

- **CSS exporter doesn't honor `dimensionFormat` opinion.** It always reads `value.value + value.unit` from the DTCG object. If the user is on the SD preset (string dimensions), `value` will be the string `"16px"` and the CSS exporter falls through to `String(value)` — which still emits `"16px"` in CSS, so it works by accident. **Finding F13** — robustness concern, not a bug today.
- **Typography composite expansion in CSS** maps `textTransform` and `textDecoration` per the propertyMap, but the DTCG composite type doesn't include `textTransform` (we add `textCase` only into `$extensions`, not the composite). Dead code path. **Finding F14.**

---

## 7. Documentation drift

- `docs/DTCG_SPECIFICATION.md:398-401` says motion duration tokens use `$type: number` with `200` (no unit). The actual code emits `$type: duration` with `{ value: 200, unit: 'ms' }` (the spec-correct form). Doc is wrong/stale. **Finding F15.**
- `docs/DTCG_SPECIFICATION.md:227-238` lists `duration`, `cubicBezier`, `transition` as "Experimental — not recommended for production." Plugin emits all three. Doc is internally contradictory. **Finding F16.**
- File-extensions generator literal `version: '1.0.0'` is hard-coded. **Finding F10.**

---

## 8. Findings table (ranked)

Severity scale:
- 🔴 **High** — produces incorrect output or breaks downstream consumers.
- 🟡 **Medium** — produces internally inconsistent output (one shape in path A, different shape in path B).
- 🟢 **Low** — documentation drift, missing optional features, naming/semantic concerns.

| # | Severity | Title | Recommended fix |
|---|---|---|---|
| F1 | 🟡 | DTCG color emitted as CSS string in `colorFormat: 'css'` | **Update chip copy** to be honest: "SD-friendly (CSS strings)" rather than implying spec parity. The string form is not DTCG-spec — it's a deliberate SD-prefer opinion. Don't change behavior; clarify the contract. |
| F2 | 🟡 | Switching `units` to rem activates Custom chip even though output is still DTCG-conformant | **Two options:** (a) drop `units` from preset fingerprint so DTCG/SD presets cover both px and rem; (b) keep current behavior but rename "Custom" to "Custom shape" so users understand it's a fingerprint, not a validity claim. Recommend **(a)** + a tooltip on the units chip explaining "DTCG accepts both." |
| F3 | 🟡 | HSL color space activates without flipping Custom; output is non-standard for SD | **Add `colorSpace` to fingerprint** when `colorFormat === 'dtcg'` — emit Custom on HSL. Optionally hide HSL behind a "non-standard" label. |
| F4 | 🟡 | Typography `letterSpacing` percent is always a string regardless of `letterSpacingFormat` | **Route through `formatLetterSpacing`** so percent honors the flag like every other dimension. Mirror the v1.9.6 percentage line-height fix. ('%' is valid `DTCGDimension['unit']`.) Trivial change in `typography-converter.ts:217-220`. |
| F5 | 🟡 | Shadow `color` is always CSS string, never DTCG color object | **Add an option** (or fold into `colorFormat`) to emit shadow.color as `DTCGColor` for `colorFormat: 'dtcg'`. Currently both presets emit strings. Defensible default for SD; spec violation for DTCG-strict consumers. |
| F6 | 🟢 | `fontFamily` is always single string, never the spec-allowed array | **Low priority.** Only matters if users want fallback chains baked into tokens. Could read from a Figma plugin extension or accept a UI option. Probably skip. |
| F7 | 🟢 | Typography composite emits `fontStyle` (non-standard sibling) | **Move to `$extensions.figma.fontStyle`** or accept it as a vendor extension to the composite (DTCG has no fontStyle in typography spec, but tools generally pass unknown keys through). Likely safest: keep it but document it as an extension. |
| F8 | 🟡 | Shadow dimensions ignore `dimensionFormat: 'string'` preference | **Route through a shared format helper.** Either (a) honor `dimensionFormat` for shadow offsets/blur/spread, or (b) document that shadow dimensions are always emitted as DTCG objects (consistent shape downstream). I lean (b) since SD v4 accepts both — but the discrepancy should be explicit. |
| F9 | 🟢 | `DTCG_SPECIFICATION.md` warns duration/transition are draft, but plugin emits them | **Update doc** to reflect that we emit these and consider them stable enough for our use case. |
| F10 | 🟢 | `$extensions.generator.version: '1.0.0'` hard-coded; should track package.json | **Inject at build time.** Vite plugin or `define:` config can stamp the version. Tiny. |
| F11 | 🟢 | DTCG default (object dimensions) untested through SD v4 without `usesDtcg: true` | **Add a fixture** if someone reports breakage. Out of scope — it's an SD config issue, not a plugin bug. |
| F12 | 🟢 | raw-figma should respect `excludedCollections` like DTCG path | **Verify and align.** Quick check on `multi-format-exporter.ts` to confirm exclusion is plumbed through to all secondary formats. |
| F13 | 🟢 | CSS exporter `transformDimension` falls through `String(value)` when value is a SD-preset string; works by accident | **Add explicit branch** for string values to remove the implicit assumption. Defensive cleanup, not a bug today. |
| F14 | 🟢 | CSS typography expansion maps `textTransform` but composite doesn't include it | **Drop `textTransform` from propertyMap** in `css-exporter.ts:239-248` — it's never populated. Dead code. |
| F15 | 🔴 | `DTCG_SPECIFICATION.md:398-401` says motion duration uses `$type: 'number'` with no unit; reality emits `$type: 'duration'` `{ value, unit: 'ms' }` | **Fix doc.** Either the doc or the code is wrong; the code matches the spec's draft duration type, so the doc is stale. Fix the doc. |
| F16 | 🟢 | Same doc lists duration/transition/cubicBezier as "experimental — do not use," then we use them | **Reconcile doc.** Either gate behind a flag or rewrite the warning to "draft, but stable enough for export — review when DTCG finalizes." |

---

## 9. Recommendations summary

### Quick wins (under 30 min each, no behavior change required)
- **F4** — fix typography percent letterSpacing to honor `letterSpacingFormat`. Trivial, consistent with v1.9.6.
- **F10** — pipe `package.json` version into `$extensions.generator.version`.
- **F14** — delete dead `textTransform` line in CSS exporter.
- **F15** — fix `DTCG_SPECIFICATION.md` motion duration section to match reality.

### Medium-effort (1–3 hr, design call required)
- **F1** — chip copy / contract revision.
- **F2** — preset fingerprint adjustment (drop `units` or rename Custom).
- **F3** — colorSpace HSL handling.
- **F8** — decide whether to add `dimensionFormat` to shadow path or document the inconsistency.
- **F16** — reconcile DTCG_SPECIFICATION.md draft-type warnings.

### Larger / discussion needed
- **F5** — shadow color shape: bigger contract decision.
- **F7** — `fontStyle` as composite vs extension.
- **F11**, **F12**, **F13** — verification work, no code change unless gaps are found.

### Skip / low value
- **F6** — fontFamily array form, only useful for fallback chains baked into tokens.
- **F9** — already covered by F16.

---

## 10. Open questions for product / design

1. **Is the SD preset's contract "exact match for SD's CSS transform group" or "DTCG with SD-friendly shape choices"?** That answer changes whether F1 (color string), F4 (letterSpacing string), and F8 (shadow dimensions) are bugs or features.
2. **Does Custom mean "off-spec" or "off-preset"?** F2 and F3 hinge on this.
3. **Should the plugin gate experimental DTCG types behind a flag?** F16. If we expose a "draft types: include / exclude" toggle, the warning in `DTCG_SPECIFICATION.md` becomes correct again.

---

## 11. Type-detection observations (carried over from #29)

These are not strict format-conformance issues but surfaced during the test cleanup that motivated this audit:

- **`TYPE_DETECTION_PATTERNS.GRID = ['grid', 'column', 'gutter', 'margin']`.** Open question: should bare `container/...` tokens (without `containermax/`) detect as grid? Probably yes if teams use `container/min`, `container/max` as semantic dimensions. Today `container/width` falls through to a regular dimension classification, which is fine but means it doesn't get the always-px override grid tokens get.
- **`isGridColumnsVariable` matches plural `'columns'` but not singular `'column'`.** A token named `column/count` would currently be treated as a regular dimension (and get px units from `convertDimension`, which is wrong for a count). Worth a defensive widening of the pattern.

Both are minor and could be addressed independently as separate enhancements.

---

## 12. Methodology notes

- Read every converter (`color`, `dimension`, `typography`, `shadow`), the variable hot-path branches in `exporter.ts`, the secondary-format exporters, and the type-detection module.
- Cross-referenced each emitted shape against the local `docs/DTCG_SPECIFICATION.md` and the upstream W3C DTCG draft. Where the local doc disagreed with the code (F15, F16), trusted the code.
- SD v4 expectations sourced from SD's `usesDtcg: true` documentation and inferred from `tests/sd/` fixtures.
- No live exports were generated for this pass — pure source/spec compare per the agreed methodology.

---

*This audit is a snapshot. Re-run when DTCG ratifies, when SD v5 ships, or when the preset contract is renegotiated.*
