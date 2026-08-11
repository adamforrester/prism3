# Prism3 §9a shape decisions — pressure-test against Token Press code

Follow-up to `PRISM3_SHARED_CORE_REVIEW.md`. The other agent adopted "pick the shape first, then extract" and drafted five shape decisions. This is the pressure-test the doc asked for — real answers against the Token Press v2.3.1 source, not the handoff brief.

Where the doc and code disagreed, the code won.

---

## Q1 — Dimension / duration: object canonical, string via preset. **Fully expressible. ✅**

**Confirmed.** A shared core that takes `{value, unit}` facts and formats-per-preset can reproduce every current Token Press output, and every path that emits a dimension or duration already routes through a `dimensionFormat` / `durationFormat`-aware helper. There is no shape Token Press can emit today that a fact-plus-preset model can't express.

Emission sites, all verified:

| Site | File / line | Routes through option? |
|---|---|---|
| Variable hot path (FLOAT → dimension) | `src/plugin/exporter.ts:722–748` → `formatDimensionValue` at :787 | ✅ `dimensionFormat` |
| Variable hot path (FLOAT → duration) | `src/plugin/exporter.ts:713–718` → `formatDurationValue` at :802 | ✅ `durationFormat` |
| Line-height percentage | `src/plugin/exporter.ts:686–688` → `formatDimensionValue` | ✅ `dimensionFormat` |
| Shadow dimensions (offsetX/Y, blur, spread) | `src/plugin/converters/shadow-converter.ts:92–105` `createDimension` | ✅ takes `dimensionFormat` as param |
| Typography fontSize | `src/plugin/converters/typography-converter.ts:87–117` `resolveTypographyValue` → `formatDimension` at :122 | ✅ `context.dimensionFormat` |
| Typography letterSpacing | `src/plugin/converters/typography-converter.ts:202–230` `resolveLetterSpacing` → `formatLetterSpacing` at :137 | ✅ `context.letterSpacingFormat` (separate option; `%` honors it too — line 220) |
| Line-height dimension/rem branches in typography | `src/plugin/converters/typography-converter.ts:299–322` | ✅ `formatDimension` (dimensionFormat) |
| DimensionConverter (strategy pattern) | `src/plugin/converters/dimension-converter.ts:157–170` `formatDimension` | ✅ `context.dimensionFormat` |

**One subtlety worth flagging:** `letterSpacingFormat` is a *separate option* from `dimensionFormat`. A user can produce `dimensionFormat: 'object'` + `letterSpacingFormat: 'string'` (the SD preset does object → string in lockstep, but the fields are independent). The shared core's format API needs to accept per-family format options, not a single `format: 'object' | 'string'` — otherwise the SD-preset mid-migration state (where a user has flipped one but not the other) becomes inexpressible.

**Nothing bypasses the options.** The multi-format-exporter (CSS/dot-notation/raw-figma) runs *downstream* of the DTCG tree — it reads whatever `dimensionFormat` already produced (`src/plugin/format-exporters/css-exporter.ts:38–54` handles all three cases: DTCG alias, SD-string, DTCG-object).

---

## Q2 — Multi-mode: per-mode files as export, inline modes as IR. **Feasible, with one real gotcha. ⚠️**

**The layout logic itself is tiny and pure.** `src/plugin/exporter.ts:141`:
```ts
const hasMultiMode = collections.some(c => c.modes.length > 1);
```
Then `getVariableFileName` at `:1166–1187`:
```ts
if (!hasMultiMode)                return `${baseName}.json`;         // flat
if (collection.modes.length === 1) return `shared/${baseName}.json`;  // shared/
return `${modeName}/${baseName}.json`;                                // per-mode
```
And typography/shadow paths at `:391` and `:462`:
```ts
hasMultiMode ? 'shared/typography.json' : 'typography.json'
hasMultiMode ? 'shared/shadows.json'    : 'shadows.json'
```
That's the whole thing. Pure, boolean-driven, trivially liftable to the core partitioner.

**But there are three implicit assumptions that would have to move with it:**

1. **File naming is kebab-case-sanitized from the collection's Figma name.** `sanitizeFileName` at `exporter.ts:1189–1194` — `lowercase → non-alphanum→hyphen → strip leading/trailing hyphens`. Prism3 would need to feed the core either pre-sanitized names or the raw name plus a sanitizer directive. Whichever it is, this rule has to be canonical or the two sides drift on filenames.

2. **The `shared/` bucket vs `<mode>/` bucket decision is per-collection, not per-file.** A collection with `modes.length === 1` goes to `shared/`; a collection with `modes.length > 1` goes to `<mode>/`. Typography and shadows are always `shared/` when *any* multi-mode collection exists. Prism3's inline-mode tree needs an unfolding step that partitions the same way — the core has to accept `{ collectionName, isMultiMode, modes: [{modeName, tokens}, ...] }` as its input schema.

3. **No default-mode assumption in the export path.** I checked: `defaultModeId` (`exporter.ts:496`) is *written* into `$extensions.figma.collection` as pass-through metadata but never *read* to make a shaping decision. Every mode is emitted equally. **This is important** — Prism3's inline shape treats `light` as canonical `$value` with other modes as `$extensions.prism3.modes.dark`. When unfolding to Token Press's shape, `light` is not privileged; it becomes just another per-mode file. The core partitioner should be default-mode-free.

**One thing the plan gets wrong to watch for:** the doc frames "TP feeds it natively (multi-file), Prism3 feeds it by unfolding its inline tree." That's not quite the split. Token Press's *input* to the core is already un-folded — it hands the core one `{collection, mode, tokens}` at a time and the core assembles the ZIP structure. Prism3's input to the core needs to do the same unfolding *before* handing off. So the unfolder is Prism3-side infrastructure, not shared-core infrastructure. **The core is a partitioner + writer, not a mode-flattener.** Fine either way, but worth being precise about which side owns the unfold.

**This is the one I'd double-check most carefully.** The rule is simple, but three sites emit `hasMultiMode`-conditional paths (variables, typography, shadows). If the shared core exposes them under different function signatures, Token Press's callers have to be updated in lockstep or one path silently emits the flat shape while another emits the shared/ shape. Golden-testing the whole ZIP layout before/after is non-negotiable.

---

## Q3 — Property-level aliases: `$ref` with flatten fallback. **Safe, mostly. ✅**

**Downstream of Token Press: no known consumer relies on the brace form** — SD 4.x/5.x with `usesDtcg: true` reads DTCG's own alias syntax at the *token* level (`$value: "{path.to.token}"`), not at property level. Nothing in `examples/style-dictionary/` needs brace property-level aliases. The Figma re-import path (if it exists — Token Press is export-only today) wouldn't consume DTCG JSON directly; a re-import would target Figma's variable API, not the exported tokens.

**Where brace-syntax property-level aliases actually appear in Token Press today** — inside typography composites:
- `src/plugin/converters/typography-converter.ts:98, 167, 187, 212, 269` — `createAlias` at `:450` returns `\`{${tokenPath}}\``.

These are property-level references from a `typography` composite's `fontFamily` / `fontSize` / `fontWeight` / `letterSpacing` / `lineHeight` sub-properties into their source variables. The current output shape is:
```json
"fontSize": "{typography.size.body}"
```
DTCG 2025.10's spec-correct form is:
```json
"fontSize": { "$ref": "#/typography/size/body" }
```

**Flatten-at-build is a safe fallback in practice** — downstream tools that don't understand `$ref` see the resolved value inlined instead of a reference. The loss is theoretical (a rebrand no longer updates via reference; you'd need a rebuild), but every current consumer works either way. SD's own `usesDtcg: true` mode doesn't error on brace-property-aliases; it just treats them as strings.

**One risk to flag:** if the flatten happens in the shared core, both sides get flatten. If the shared core emits `$ref` and each caller flattens downstream, callers can diverge on how they flatten (which is exactly the drift the plan is trying to prevent). **Put the flatten in the shared core, gated by an option `propertyAliases: 'flatten' | '$ref' | 'brace-legacy'` — default `'flatten'` for compatibility, `'$ref'` for spec-current, `'brace-legacy'` only as an escape hatch during migration.**

---

## Q4 — `$extensions`: pass-through, core never rewrites. **Safe. ✅**

**Nothing in Token Press's export pipeline reads its own `$extensions` to make a shaping decision.** All eight `$extensions` sites in `exporter.ts` (`:73, 83, 92, 103, 351, 444, 545, 553`) are **write-only** — they build the extensions block on the way out. Same for the two file-level sites in `applyNamespaceIfNeeded` (`:82, 91`). The validator, type-detection, and cache-manager never touch `$extensions`.

There's one arguable exception at `exporter.ts:553`:
```ts
if (variable.codeSyntax) {
  token.$extensions.figma.codeSyntax = variable.codeSyntax;
}
```
This is a *conditional write*, not a shaping decision — the code reads Figma's `variable.codeSyntax`, not the token's own `$extensions`. Doesn't affect the pass-through claim.

**Shape survives cleanly.** Leaf `$extensions.figma { variableId, collection, scopes, codeSyntax? }` and file-level `$extensions.generator + $extensions.figma` are both opaque-provenance to the core. Prism3's `$extensions.prism3.*` gets the same treatment. The core must **not** assume a specific namespace exists — it accepts whatever each caller provides and writes it back verbatim.

**One small design note:** the file-level `$extensions.generator` block is currently constructed by Token Press (`getFileExtensions` — I didn't read this method but it's referenced at `exporter.ts:491`). If the shared core is going to be the thing writing the ZIP files, then either the core owns `generator` (and both Token Press and Prism3 pass in `{name, version}` metadata) or the callers each write their own `generator` before handing off. Cleaner to make the core own it — a shared "who generated this" block is more useful than each caller reinventing it.

---

## Q5 — Engine-only types (`spring`, `strokeStyle`): pass-through. **No gate anywhere. ✅**

**Confirmed: nothing in Token Press's runtime path type-gates.** The production validator (`src/plugin/validator.ts`) checks alias resolution, cycles, and type mismatches (source-vs-alias `resolvedType` equality) — it does not have a `$type` allowlist. `type-detection.ts` decides what `$type` to *emit*, but it's called during export construction, not on incoming tokens. `mapVariableTypeToDTCG` at `exporter.ts:548` maps Figma resolvedType → DTCG type, again outbound-only.

There **is** a `DTCGValidator` at `src/utils/dtcg-validator.ts` that has a whitelist including `strokeStyle` / `gradient` / `border` (but not `spring`). **However, it is not invoked in the production export pipeline** — grep for `DTCGValidator` returns only its own definition and test-file imports (`tests/unit/dtcg-validator.test.ts`). It's a dev-time utility, not a runtime gate.

**So:** a `spring`-typed token flowing through the shared core would emit cleanly on the Token Press side. If the plugin ever grows a re-import path or an in-plugin DTCG lint, the union type in `src/types/dtcg.ts:4–16` (`DTCGTokenType`) would need to be extended — it currently lists 12 types, not 14 — but that's a **type-declaration change only**, not a runtime rejection. Zero blocker.

The one thing worth adding to the plan: Token Press's `DTCGTokenType` union should be replaced with an import from `@prism3/tokens-export` (or wherever the canonical type list lives) so both sides can't drift on which types exist.

---

## §9b — Riskiest step and 2-week estimate check

**Riskiest on the Token Press side: step 4 (migrate `exporter.ts` shaping half to import from the shared core).**

Reasons the estimate could slip:

1. **Two converter families with subtly different signatures.** The variable path uses `formatDimensionValue(value, unit)` on `TokenExporter` (returns object or string via `this.options.dimensionFormat`). The DimensionConverter has its own `formatDimension(value, unit, context)` at `converters/dimension-converter.ts:157` reading `context.dimensionFormat`. TypographyConverter has *its own* `formatDimension` at `converters/typography-converter.ts:122` and a separate `formatLetterSpacing` at `:137`. ShadowConverter has a fourth version at `shadow-converter.ts:92`.

   These are **four near-duplicate implementations of the same formatter**, each threading its inputs slightly differently. Consolidating them into one shared-core function is the right move but has cross-cutting surface. Every call site has to switch, and the type of the returned union (`string | DTCGDimension`) has to stay stable for downstream code that discriminates on it (I confirmed the CSS exporter does — `format-exporters/css-exporter.ts:38–54`).

2. **The transition-composite compiler at `exporter.ts:967–1050`.** This is exporter-side post-processing that walks the DTCG tree, finds duration + delay + timingFunction sibling tokens, and folds them into a `transition` composite. It reads *already-formatted* `$value`s (which may be object-shaped or string-shaped depending on `durationFormat`) and constructs a composite. If the shared core takes over composite construction, this whole 80-line block moves — and it has to keep working for Token Press's use case (compile from siblings) while also supporting Prism3's use case (transitionLeaf at `tree.ts:96–99` — already-composite, no compilation needed). The transition composite is the one composite where the two sides have genuinely different construction paths.

3. **Golden-testing the ZIP byte-for-byte before/after.** Token Press has 159 unit tests but no full-ZIP golden. Building one against a representative fixture file (v2.3.1's test-examples/tokens is the natural candidate) is 1 day on its own but critical — the migration can't ship without it.

**2-week estimate assessment: tight but plausible for the format package + composite builders + partitioner. The Token Press migration (step 4) is where I'd budget an extra ~2–3 days over the doc's estimate**, mostly to consolidate the four formatter duplicates and to write the ZIP golden.

**One coupling the doc's estimate doesn't account for:** the multi-format exporters (`format-exporters/css-exporter.ts`, `dot-notation-exporter.ts`, `raw-figma-exporter.ts`) read the DTCG tree Token Press emits. If the migration changes the tree shape at all (which it shouldn't, but I'd verify), all three alt-format exporters need to be re-verified. They're not touched by the shared-core move directly, but they're downstream — a golden test of each alt-format is a half-day per format that isn't in the plan.

Realistic total for Token Press side of the migration: **step 4 = 4–5 days** rather than 3.

---

## Summary

| Question | Verdict |
|---|---|
| Q1 — dimension/duration object + preset | ✅ Fully expressible. Note: `letterSpacingFormat` is a separate option; the core needs per-family format options. |
| Q2 — per-mode files as export, inline as IR | ⚠️ Feasible; three implicit assumptions (kebab-case sanitizer, per-collection bucket rule, no default-mode privileging) must be canonical. The unfolder is Prism3-side, not shared. |
| Q3 — `$ref` with flatten fallback | ✅ Safe. Put flatten in the core with an option so callers can't diverge on flatten behavior. |
| Q4 — `$extensions` pass-through | ✅ Safe. Consider making the core own the file-level `generator` block. |
| Q5 — engine-only types | ✅ Zero runtime gate. Extend the type union at build time only. |

The shape decisions in §9a are sound. The main additions to the plan I'd flag:

1. **Per-family format options** (Q1) — don't collapse to a single `format` flag.
2. **Canonical file-naming sanitizer** (Q2) — one place, both sides use it.
3. **Owner of the unfold step** (Q2) — Prism3-side, not core.
4. **`propertyAliases` option** (Q3) — `flatten | $ref | brace-legacy`.
5. **Core owns `generator` block** (Q4) — one place, both sides use it.
6. **Extra 2–3 days on step 4** (§9b) — four formatter duplicates + ZIP golden + alt-format re-verification.
