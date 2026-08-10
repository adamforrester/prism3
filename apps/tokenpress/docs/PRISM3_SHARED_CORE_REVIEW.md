# Prism3 shared-export-core — evaluation from the Token Press side

Review of the "12 — Token Press → monorepo: shared-export-core evaluation" doc, executed against actual source in both repos:
- Token Press: `/Users/aforrester/.../PRISM/Prism 2.0/Token Forge` (this repo), v2.3.1
- Prism3: `/Users/aforrester/.../PRISM/Prism3/Prism3`

The doc explicitly asks (§7): "assume the handoff brief is accurate. **Confirm or refute each.**" Below is the go/no-go the doc requested, with verdicts against real source.

---

## TL;DR

**Recommendation: revise Option B before pursuing it.** The doc is right that the format contract is defined twice and that vigilance-based sync is fragile — but its "share the *shaping*, not the *sourcing*" framing understates the problem. The two DTCG outputs today don't just differ in code; they differ in **shape**. Reconciling them is a design decision the doc doesn't yet make.

Specifically:

1. **The separability premise (§7.1) is confirmed.** Token Press's converters are pure of `figma.*` runtime calls. Zero `figma.*` API calls in `converters/*`, `type-detection.ts`, `cache-manager.ts`, `validator.ts`, or the shaping half of `exporter.ts` — only `scanner.ts` touches Figma at runtime. That's the make-or-break question the doc flagged, and it's a clean yes.
2. **The composite parity premise (§7.6) does not hold.** Prism3 emits dimensions and durations as **string form** (`"16px"`, `"200ms"`) via `tree.ts`. Token Press v2.3.1 emits them as **object form** (`{value: 16, unit: "px"}`) by default. Prism3 encodes multi-mode as `$extensions.prism3.modes.dark` **inside a single tree**; Token Press writes **separate per-mode directory files**. Prism3 uses brace-syntax property-level aliases inside typography composites and knows they're DTCG-non-compliant (tree.ts:213). These aren't "small divergences to reconcile in a shared shaper" — they're design choices the two systems made independently.
3. **The prize the doc wants ("agree by construction") requires deciding which shape wins**, not just extracting a shared module. If both callers route through one shaper but pass different options, the shaper *permits* two different DTCG shapes and drift stays possible — just now with a shared implementation that supports both.

The right move is: **pick the canonical shape first**, then extract. Extracting first and hoping the shape question resolves itself in code review is where drift comes back.

---

## §7 checklist — verdicts

### §7.1 Separability — ✅ CONFIRMED, cleaner than the doc assumed

The doc says "verify they don't reach into the Figma API mid-conversion." Actual state:

- `src/plugin/converters/*.ts` — **zero** `figma.*` runtime calls across all five converters.
- `src/plugin/type-detection.ts` — zero.
- `src/plugin/cache-manager.ts` — zero.
- `src/plugin/validator.ts` — zero.
- `src/plugin/exporter.ts` — **one** occurrence at line 553, and it's `token.$extensions.figma.codeSyntax = variable.codeSyntax` — a JSON key literal, not an API call.
- `src/plugin/scanner.ts` — 4 calls (`getLocalVariableCollectionsAsync` × 4). This is the only file that talks to Figma at runtime.

However: the converters *type* against Figma's ambient globals (`Variable`, `VariableAlias`, `VariableScope`, `VariableValue`, `RGB`, `TextStyle`, `EffectStyle`). These are TypeScript declaration-only types — not runtime imports — but a shared package needs to either:
- Redefine the shape it needs (plain interfaces mirroring Figma's), or
- Move the ambient type dependency into a `types-only` package, or
- Accept a `unknown` boundary at the shared-core seam and let each caller cast.

None of those are hard, but the doc's "just extract" framing misses this. **Effort estimate for the type boundary: ~1 day of interface work + updates to Token Press imports.**

### §7.2 Purity / ES2018 — ✅ CONFIRMED

`formatDimensionValue`, `formatDurationValue`, the composite converters — all pure. No `node:*`, no network, no `figma.*` runtime calls. Vite is configured for ES2018 target with minification off (Figma's plugin parser is picky). CHANGELOG entry v2.3.0 and code style throughout confirm ES2018 discipline (no `?.`, no `??`, `Object.assign()` instead of spread).

Prism3 side: `emit-dtcg.ts` uses `node:fs`, `node:url`, `node:path` in its I/O shell — but the actual shape work is in `tree.ts`, which is pure. **The shared-core boundary would fall between them: `tree.ts`-like generation stays engine-side, `formatDimensionValue`-like leaf formatting moves to the shared core.**

### §7.3 Preset surface — ✅ CONFIRMED with a nuance

`applySDCompatPreset`, `applyDTCGDefaults`, `presetFingerprint`, `detectActivePreset`, `isSpecConformant` — all in `src/ui.html` (embedded inline JS, ES2018). They operate on **DOM element values**, not on the option object directly. So the *logic* is cleanly separable but the *implementation* is DOM-coupled.

Extraction path: lift the preset fingerprints and `isSpecConformant`/`detectActivePreset` to pure functions that take/return `ExportOptions`. The UI keeps its DOM read/write; the shared core keeps the fingerprint tables and detection logic. **~half a day.**

### §7.4 Layout logic — ⚠️ CONFIRMED PURE, BUT SHAPES DIVERGE FUNDAMENTALLY

Token Press's per-mode-directory decision lives in `src/plugin/exporter.ts:141`:
```
const hasMultiMode = collections.some(c => c.modes.length > 1);
```
Followed by `hasMultiMode ? 'shared/foo.json' + '<mode>/foo.json' : 'foo.json'`. Pure logic on plain collection data — trivially liftable.

**But Prism3 doesn't use this layout at all.** Prism3 emits a **single tree per theme** where per-mode values live inside each token as `$extensions.prism3.modes.dark = { $value: "{...}", contrast, against, min }` (tree.ts:307-318). One file, mode overrides encoded inline.

This is a genuine philosophical fork:
- **Token Press's shape:** multi-file, `$value` is the mode's canonical value in that mode's file. SD-native (SD builds each mode file independently).
- **Prism3's shape:** single-file, `$value` is the light-mode canonical, other modes are extensions. Compact, but SD has to be taught to read the extensions.

The doc says "the shared partitioner must handle *both* appearance and viewport mode axes" (§6). That's true, but insufficient — it also has to reconcile *inline vs. multi-file per-mode representation*. **The doc doesn't name a winner. It has to before Option B can move.**

### §7.5 Type inference boundary — ✅ CONFIRMED, exactly as the doc predicted

`mapVariableTypeToDTCG` and `type-detection.ts` are Figma→DTCG concerns only. Their entire job is to guess `$type` from `resolvedType: 'FLOAT'` + Figma scopes + name heuristics + (v2.3.1) alias-walked source scopes. The engine has no equivalent problem — every token it emits is generated with a known `$type` from the start.

**These stay Token-Press-side.** The shared core doesn't need them.

### §7.6 Composite parity — ❌ REFUTED

The critical finding. Real divergences between the two current outputs:

| Aspect | Token Press v2.3.1 | Prism3 tree.ts |
|---|---|---|
| Dimension `$value` | `{ value: 16, unit: "px" }` (default) or `"16px"` (SD preset) | `"16px"` always |
| Duration `$value` | `{ value: 200, unit: "ms" }` (default) or `"200ms"` (SD preset) | `"200ms"` always |
| Shadow layer offsets | `{ value: 0, unit: "px" }` per property | `"0px"` per property |
| Multi-mode representation | Separate files per mode (`light/foo.json`, `dark/foo.json`) | Single file, `$extensions.prism3.modes.dark = {…}` |
| Property-level aliases in composites | Brace syntax (DTCG spec is `$ref`) | Brace syntax + explicit acknowledgment they're non-compliant (tree.ts:213-217) |
| `spring` custom type | Not emitted | Emitted with note that DTCG has no spring type yet |
| `strokeStyle` type | Not emitted | Emitted for focus rings |
| `$extensions` shape | `figma: { variableId, collection, scopes, codeSyntax? }` | `prism3: { generated, source, oklch?, figma?, modes?, … }` — much richer, engine-provenance-carrying |

The doc lists (§7.6) "List any divergence (that's the drift the shared core must reconcile)." Above is that list. Some of these are trivially unifiable (dimension shape — Token Press already has both, just make it configurable in the shared core). Some are architectural forks (multi-mode representation, `spring`/`strokeStyle` inclusion). Some are actively knowingly-off-spec (brace-syntax property aliases).

Extracting a shared core doesn't fix these — it just gives both callers one place to argue about them.

### §7.7 Build/release — ⚠️ REAL BUT MANAGEABLE

Token Press ships to the Figma community. Manifest at `manifest.json` points to `dist/code.js` (single Vite bundle, ~255 kB / 60 kB gzip). Options + collection-exclude state persist via `figma.clientStorage`. Latest release v2.3.1 (tag `v2.3.1`, GitHub release). No CI publishing yet — community releases are manual uploads through Figma's dashboard.

**What must move with Token Press if Option C ever happens:** the plugin shell (Vite config, `manifest.json`, `src/ui.html`, `src/code.ts`, `dist/`), the release workflow, the CHANGELOG, the community listing description.

**What stays independent under Option B:** all of the above stays in the private plugin repo; only the shaping half publishes as `@prism3/tokens-export`. Token Press imports it. The engine imports it. Each side keeps its own build.

The ES2018 tax the doc calls out (§6) is real but small — Token Press is already written to that constraint, and the engine importing an ES2018 module is fine (subset semantics).

### §7.8 Licensing / ownership — OUTSIDE THIS AGENT'S SCOPE

Token Press's repo is private (`VMLYR/token-forge` on GitHub). Relocation, vendoring, or dual-hosting is an owner decision. Nothing here I can rule on.

---

## What the doc got right

- **The prize is real.** Two definitions of "how a token becomes DTCG" is genuinely fragile, and the drift the doc names (any change to leaf shape / preset / layout has to be mirrored by hand) is a *live* risk. This isn't hypothetical — v2.3.0's duration format work only aligned Token Press with the shape Prism3 has always emitted; the reverse direction (Prism3 gaining Token Press's SD preset) hasn't happened.
- **The middle-layer split.** "Share the shaping, not the sourcing" is the right instinct. Neither side wants the other's I/O half; both need agreement on the middle.
- **Type inference stays Token-Press-side.** Correctly identified as a Figma→DTCG concern with no engine parallel.
- **Option B over C.** The plugin shell has no shared value with the engine. If sharing happens, it should be at the format layer, not the plugin level.

## What the doc missed or understated

1. **The output shapes actively disagree today.** The doc treats this as "list any divergence" (§7.6 checklist item) rather than the load-bearing question. Reconciliation is a design decision, not a code-review artifact.
2. **A shared core doesn't force agreement — it enables it.** If both callers can still pass options that produce different outputs, drift moves from "two codebases" to "one codebase with two configurations." Better, but not "agree by construction."
3. **The multi-mode representation fork is the hardest one.** Prism3's inline `$extensions.prism3.modes.dark` shape is a deliberate design choice tied to how the engine's contrast contracts + per-token provenance work. Token Press's directory-per-mode shape is a deliberate choice tied to SD's file-globber crash on merged trees. Neither can trivially adopt the other; picking one means the loser gets a translation layer.
4. **`$extensions` are not shared, and that's fine, but the shared core has to know that.** Token Press writes `$extensions.figma.*`; Prism3 writes `$extensions.prism3.*`. The shared core has to pass through whatever `$extensions` each caller supplies without opinions about the namespace.
5. **Property-level aliases in composites** — Prism3 already knows its brace-syntax is DTCG-non-compliant (tree.ts:213-217 comment) and plans to flatten-at-build. Token Press does the same brace-syntax. This is a place both are wrong the same way; the shared core is a good place to fix it once, but that's an *added* motivation for Option B, not something the doc named.

---

## Concrete plan if Option B moves forward

Before writing any code:

1. **Decide the canonical shape.** Object-form or string-form for dimensions/durations? Multi-file per-mode or single-file with mode-extensions? Property-level aliases: brace or `$ref`? These are decisions, not implementation details. **This is the gate on Pillar 4.**
2. **If dimensions/durations stay dual-shape:** the shared core has `dimensionFormat` and `durationFormat` options, both sides configure them consciously. Fine.
3. **If multi-mode representation has to unify:** pick a winner and write a migration for the loser. Token Press's user base will feel it either way; the engine has no user base yet, which biases toward Token Press's shape winning by default.
4. **Property-level aliases:** move to `$ref` in the shared core, flatten-at-build for downstream tools that can't consume it. Both sides benefit.

Then extract, in this order:

1. **`@prism3/tokens-format` package** (or similar): pure ES2018, no ambient Figma types. Owns leaf formatters (`formatDimension`, `formatDuration`, `formatColor`, letter-spacing, line-height, cubic-bezier) and preset fingerprints. **~3 days.**
2. **Composite builders** (`buildTypography`, `buildShadow`, `buildTransition`) accepting fact objects (already-resolved values or explicit alias-refs) and emitting DTCG composites. **~3 days.**
3. **Multi-mode partitioner + file layout** (whichever shape won in step 1). **~2 days.**
4. **Migrate Token Press's `exporter.ts` shaping half to import from the shared core.** Golden-test the ZIP output byte-for-byte before/after. **~3 days.**
5. **Migrate the engine's `emit-dtcg`/`tree.ts` serialization to import from the shared core.** Golden-test the tokens.json output. **~3 days.**

Rough total: **2 weeks of focused work** assuming the shape decisions in step 0 are made cleanly. Add another week if the multi-mode representation has to migrate.

---

## Recommendation

**Yellow light on Option B.** The separability premise is confirmed and cleaner than the doc feared. The purity premise is confirmed. But the composite parity premise is refuted — the two systems don't emit compatible DTCG today, and no amount of code extraction changes that until someone decides which shape wins.

**Before touching code:** convene the shape decisions in §7.6 and pick winners. That's a ~half-day conversation, not a spike. Once those are settled, Option B becomes tractable and the ~2-week estimate above is realistic.

**Don't** author Pillar 4's `collections.ts` + formatters as engine-internal in the meantime — that's the doc's core insight and it's right. Author them **at the shape boundary you just picked**, in the extracted package location (even if the package is still living inside the engine repo pre-monorepo). That way when Option B lands, the code is already in the right module boundary.

If the shape decisions can't be made — if the two systems genuinely need to keep divergent DTCG shapes — then **Option A (status quo) is more honest than Option B**, because a shared core that permits both shapes doesn't actually kill drift, it just moves it into a config option.
