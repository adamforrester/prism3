# 12 — Token Press → monorepo: shared-export-core evaluation

> **Status: proposal / hypothesis — not a decision.** Written from the Token Press v2.3.1
> *agent handoff brief*, NOT its source (Token Press lives in a private org repo outside
> this session's scope). Everything here about Token Press internals is a claim to
> **verify against the real repo** — see §7, the checklist for the repo-reviewing agent.
> The question: should the export *format core* move into this monorepo so the engine's
> `emit-dtcg` and Token Press's exporter share **one** definition of "how a token becomes
> DTCG" — killing format drift by construction? Feeds `11 §4` (the export contract) and
> `09` (one core, many surfaces).

---

## 1. Why this, why now

The export format is the ecosystem's interoperability contract (`11 §4`). Today "how a
token becomes DTCG JSON" is defined **twice**:

- **`Prism3/engine/emit-dtcg.ts`** — generate → DTCG (the engine knows its token facts
  because it produced them).
- **Token Press `exporter.ts`** — Figma variables → DTCG (it reads facts from a live
  Figma file).

Those two outputs *must* agree — a dev's package and a designer's Figma export are
supposed to be the same artifact. Today they agree only because a human (me) matches a
spec. That's drift waiting to happen: any change to leaf shape, preset, or layout has to
be mirrored by hand in two codebases with different owners and release cadences.

**One shared pure module both consume ⇒ they agree by construction.** That is the prize.

## 2. The precise split — share the *shaping*, not the *sourcing*

The instinct "move Token Press in" is right in spirit but too coarse. Three layers, only
the middle one is shared:

| Layer | Engine side | Token Press side | Shared? |
|---|---|---|---|
| **Source the facts** | `brandTheme` + ramps *generate* tokens | `scanner.ts` *reads* live Figma variables (Figma API) | ❌ each owns its own |
| **Shape → DTCG** | value formatting, presets, composites, collection partition, file layout | same | ✅ **THE SHARED CORE** |
| **Deliver** | write files / web ZIP | plugin UI + `clientStorage` + ZIP + community release | ❌ each owns its own |

So the shared core (`@prism3/tokens-export`, pure, ES2018) is the **DTCG shaper**: given
already-resolved token facts, produce spec-compliant DTCG — and it owns exactly the things
that must not drift:

- **Value formatters + presets** — `dimensionFormat` object↔string, `durationFormat`,
  `colorFormat` dtcg↔css, `lineHeightOutput`, letter-spacing units; the **DTCG-spec /
  Style-Dictionary / Off-spec** preset fingerprints (`11 §4`).
- **Composite shaping** — typography / shadow / transition composites (same field shapes
  both sides must emit).
- **Collection partition + output layout** — the `collections.ts` partition (§`11 §4`
  mapping) + `shared/` + per-mode-directory rule + file-level `$extensions`
  (`generator`, `figma { collection, mode }`).

Explicitly **NOT shared:**
- Token Press's `scanner.ts` (Figma-API-coupled) and `mapVariableTypeToDTCG` **type
  inference** (FLOAT + scope/name heuristics + alias-walking) — the engine needs **no**
  inference; it *knows* every token's `$type` because it generated it. Type inference is a
  Figma→DTCG concern only.
- The engine's generation (`theme`/`ramp`/`modes` …) — Token Press never generates.

This narrower framing is what makes the move tractable: we're extracting the ~"format &
layout" half, not entangling generation with Figma scanning.

## 3. Options

- **A — Do nothing (status quo).** Keep two definitions; match by spec + review. *Cost:*
  permanent hand-sync risk; the `collections.ts` I build stays engine-internal and Token
  Press stays a separate spec-match target. *Cheapest now, most drift later.*
- **B — Extract a shared pure `@prism3/tokens-export` core; both import it.** ✅
  **recommended.** The engine's `emit-dtcg` routes its final serialization (formatters +
  partition + file layout) through the shared core; Token Press's `exporter.ts` does the
  same for its scanned facts. One preset table, one partition, one layout — forever.
- **C — Move the whole Token Press plugin into the monorepo.** Superset of B: also brings
  the plugin shell (UI, scanner, Vite build, release). *Reasonable if we also want
  centralized oversight of the plugin itself* — but the shell has no shared value with the
  engine, so it's optional and can follow B.

**Recommendation: B now, C optional-later.** B captures 100% of the anti-drift value; C is
about org convenience (one repo to watch) and can be a follow-on once B proves the seam.

## 4. Impact on the export contract (Pillar 4) — why decide this first

The export contract's shape *depends on this decision*:

- If **B**, `collections.ts` + the formatters I was about to build should be authored **as
  the shared core** (`@prism3/tokens-export`) from the start — not as engine-private code I
  later have to re-extract.
- If **A**, I build them engine-internal and Token Press stays a spec-match.

So this eval gates Pillar 4's *first line of code*. Building Pillar 4 before deciding =
building the wrong module boundary. (Meanwhile Wireframe/1b is independent and proceeds.)

## 5. Build & packaging mechanics (for B)

- **Where:** a pure package — `packages/tokens-export/` or `Prism3/export/`. Must be
  **ES2018** (Figma sandbox: no `?.`, `??`, object spread, top-level await) so Token Press
  can run it; the engine (higher target) importing an ES2018 module is fine (subset).
- **No `node:` and no `figma.*`** inside it — it takes plain fact objects, returns JSON
  structures. (Same portable-core discipline as `theme`/`tree`, docs/07 §3.)
- **Engine wiring:** `emit-dtcg` keeps `buildTree` (the nested tree is the engine's IR) but
  hands leaf values + the tree to the shared partitioner/formatters for the multi-file,
  preset-aware output. The single-tree golden stays as a regression artifact.
- **Token Press wiring:** `exporter.ts` keeps `scanner.ts` + `mapVariableTypeToDTCG`, then
  feeds resolved facts into the shared shaper instead of its inline formatting.
- **Second build system:** the monorepo gains Vite (plugin) alongside engine-tsx +
  web-esbuild. The *shared core itself* stays buildless/tsx-importable; only the plugin
  shell needs Vite. Manageable but real.

## 6. Risks / costs to weigh

- **Refactor surface in a shipping plugin.** Token Press is v2.3.1 in the Figma community;
  re-pointing its exporter at a shared core is real work with a real user base. Sequence it
  so the plugin's output is byte-identical across the refactor (golden its own ZIP first).
- **ES2018 tax on the shared core** — the engine would import a module written in an older
  dialect. Cosmetic, but a constraint to honor.
- **Ownership / release** — keeping the community plugin publishable from the monorepo;
  org/licensing constraints on relocating the private repo (owner's call, outside my scope).
- **Two-mode-axis correctness** — the shared partitioner must handle *both* appearance
  (light/dark/hc → `color`) and viewport (desktop/mobile → fluid `font`) mode axes, since
  both drive per-mode directories (confirmed against NB's real Token Press output, `11 §4`).

## 7. Checklist for the repo-reviewing agent (validate against real Token Press source)

This doc assumes the handoff brief is accurate. **Confirm or refute each — these determine
whether B is feasible and how much effort it is:**

1. **Separability.** In `src/plugin/converters/*` and `exporter.ts`, do the converters
   operate on **plain fact objects** or directly on `figma.*` variable objects? (The brief
   says "Strategy pattern per token family + shared helpers" — verify they don't reach into
   the Figma API mid-conversion.) *This is the make-or-break question.*
2. **Purity / ES2018.** Are the formatters (`formatDimensionValue`, `formatDurationValue`,
   composite builders) free of `figma.*`, `node:*`, and network? Already ES2018?
3. **Preset surface.** Does the `ExportOptions` + preset logic (`applySDCompatPreset`,
   `presetFingerprint`, `detectActivePreset` in `ui.html`; `DEFAULT_OPTIONS` in `code.ts`)
   cleanly separate the *option values* from the *plugin UI*? The engine needs the option
   table + fingerprints, not the UI.
4. **Layout logic.** Where does the `shared/` + per-mode-directory decision live, and is it
   pure? (`docs/known-issues/SD-PER-MODE-MERGE.md` + the exporter.) Can it be lifted as-is?
5. **Type inference boundary.** Confirm `mapVariableTypeToDTCG` + `type-detection.ts` are
   *only* needed for the Figma→DTCG direction (they infer `$type` from FLOAT+scopes) and
   have **no** role the engine would need — so they stay Token-Press-side.
6. **Composite parity.** Do Token Press's typography/shadow/transition composite shapes
   match what `Prism3/engine/tree.ts` emits today? List any divergence (that's the drift the
   shared core must reconcile).
7. **Build/release.** Vite config, ES2018 target, `manifest.json`, clientStorage,
   community-release process — what has to move vs. stay for the plugin to keep shipping?
8. **Licensing/ownership** — any constraint on relocating the private repo into
   `adamforrester/*` or vendoring the shared half.

**Deliverable from that review:** a go/no-go on B, an effort estimate, and the exact module
boundary (which files/functions become `@prism3/tokens-export`).

## 8. Recommendation

Pursue **B** — extract a shared pure `@prism3/tokens-export` core. It is the only option
that makes the two DTCG definitions agree *by construction* rather than by vigilance, and
it's the natural extension of the monorepo's "one core, many surfaces" thesis (`09`). Gate
the export-contract build (Pillar 4) on this decision so the format code is authored in the
right place once. Do the repo-review (§7) next to convert this hypothesis into a plan.

---

## 9. Repo-review verdict (2026-07-03) — Option B is **yellow**; decide the shape first

A Token-Press-side agent ran §7 against **both** real repos. Verdicts:

- **§7.1 Separability — ✅ confirmed, cleaner than assumed.** Zero `figma.*` runtime calls in
  `converters/*`, `type-detection.ts`, `cache-manager.ts`, `validator.ts`, or the shaping half
  of `exporter.ts`; only `scanner.ts` touches Figma. *Caveat:* converters **type** against
  Figma ambient globals (declaration-only) — the shared package needs a small plain-interface
  boundary (~1 day).
- **§7.2 Purity/ES2018 — ✅.** The seam falls between `tree.ts` (generation, engine-side) and
  `formatDimensionValue`-style leaf formatting (→ shared core).
- **§7.3 Presets — ✅ with nuance.** Preset logic is DOM-coupled in `ui.html`; lift the
  fingerprints + `detectActivePreset`/`isSpecConformant` to pure fns (~½ day).
- **§7.4 Layout — pure, but shapes diverge (see §7.6).**
- **§7.5 Type inference — ✅ stays Token-Press-side** (Figma→DTCG only).
- **§7.6 Composite parity — ❌ REFUTED.** The load-bearing finding: the two outputs disagree
  *today* — dimensions/durations object (TP default) vs string (Prism3 always); multi-mode as
  per-mode files (TP) vs inline `$extensions.prism3.modes` (Prism3); brace aliases both sides
  (both off-spec); Prism3 emits `spring`/`strokeStyle` TP doesn't; `$extensions` `prism3.*` vs
  `figma.*`.
- **§7.7 Build/release — real, manageable.** Under B the plugin shell stays in its repo; only
  the shaping half publishes as `@prism3/tokens-export`.
- **§7.8 Licensing — owner call** (`VMLYR/token-forge`, private).

**The reviewer's central correction, adopted:** a shared core doesn't *force* agreement — it
*enables* it. **Pick the canonical shape before extracting**, else drift just moves from "two
codebases" to "one codebase with two configs."

### 9a. Shape decisions (proposed — owner to confirm; this is the gate on Pillar 4)

Most divergences dissolve once the shared core takes **normalized facts + options**, not
either side's native output. The core's input contract is a normalized
`collection × mode × token-facts`; each caller adapts *into* it.

| Decision | Proposed canonical | Rationale |
|---|---|---|
| Dimension / duration | **object** (`{value,unit}`, DTCG-spec); **string via SD preset** | Not a fork — it's the `dimensionFormat`/`durationFormat` option TP already has; the engine just hardcodes string today. Feed raw `{16,'px'}`; core formats per preset. |
| Multi-mode representation | **multi-file per-mode is the EXPORT; inline `modes` stays the engine's IR** | The engine's single tree feeds resolve-preview/ai-metadata/golden — keep it. The export core *unfolds* it to per-mode files (clean projection; every mode value is already present). TP is multi-file natively. Engine doesn't migrate; multi-file wins as the *artifact*. |
| Property-level aliases | **`$ref`** (spec), flatten-at-build fallback | Both sides emit brace today (both off-spec, both acknowledge it). Fix once in the core. |
| `$extensions` namespace | **pass-through, no opinion** | `prism3.*` and `figma.*` are provenance each caller owns; the core never rewrites them. |
| Engine-only types (`spring`, `strokeStyle`) | **core supports/passes through** | Engine is the richer producer; TP simply won't emit them (no Figma source). |

### 9b. Revised plan / effort (from the review)

Gate = the §9a decisions (a ~½-day call, not a spike). Then extract, ES2018-pure, no ambient
Figma types: (1) `@prism3/tokens-format` — leaf formatters + preset fingerprints (~3d);
(2) composite builders taking fact objects (~3d); (3) the multi-mode partitioner + file layout
in the chosen shape (~2d); (4) migrate TP's `exporter.ts` shaping → core, golden its ZIP
byte-for-byte (~3d); (5) migrate the engine's `emit-dtcg` serialization → core, golden
`tokens.json` (~3d). **≈ 2 weeks**, +1 if multi-mode ever has to migrate (it doesn't, per 9a).

**Standing guidance for Pillar 4 (both docs agree):** do **not** author `collections.ts` +
formatters engine-internal. Author them at the chosen shape boundary, in the extracted package
location — even if the package still lives inside this repo pre-move — so they're already in
the right module when B lands.

### 9c. Shape decisions confirmed against Token Press v2.3.1 source (2026-07-03)

A second Token-Press-side pass pressure-tested each §9a decision against the real code (not the
handoff brief; where doc and code disagreed, code won). **All five hold** — with six concrete
refinements to fold into the plan. Verdicts:

- **Q1 dimension/duration — ✅ fully expressible.** Every emission site already routes through a
  `dimensionFormat`/`durationFormat`-aware helper (variable hot path `exporter.ts:722–748`,
  line-height `:686`, shadow dims `shadow-converter.ts:92`, typography `typography-converter.ts:122`,
  `dimension-converter.ts:157`). No shape TP emits today is inexpressible as facts+preset. The
  alt-format exporters (CSS/dot/raw-figma) run *downstream* of the DTCG tree, so they inherit
  whatever the format produced.
- **Q2 multi-mode — ⚠️ feasible, one gotcha.** The layout logic is tiny and pure
  (`exporter.ts:141` `hasMultiMode`; `getVariableFileName` `:1166–1187`). But three implicit
  assumptions must travel with it (see refinements 2–3).
- **Q3 `$ref`/flatten — ✅ safe.** No known downstream consumer needs brace property-aliases
  (SD `usesDtcg:true` reads token-level aliases, not property-level). Brace form appears only
  inside typography composites (`typography-converter.ts:98,167,187,212,269`). Flatten is a safe
  fallback; the risk is *where* it happens (refinement 4).
- **Q4 `$extensions` pass-through — ✅ safe.** All eight `$extensions` sites in `exporter.ts` are
  **write-only**; nothing reads its own extensions to shape output. Validator/type-detection/cache
  never touch them.
- **Q5 engine-only types — ✅ zero runtime gate.** The production validator checks alias
  resolution/cycles/type-mismatch, not a `$type` allowlist. The `DTCGValidator` whitelist exists
  but is **not** invoked in the export pipeline (dev-time only). A `spring` token emits cleanly.

**Six refinements to carry into Pillar 4 (all adopted):**

1. **Per-family format options, not one flag.** `letterSpacingFormat` is independent of
   `dimensionFormat` (`typography-converter.ts:137,220`). The core's format API takes per-family
   options — otherwise the SD-preset mid-migration state (one family flipped, not the other)
   becomes inexpressible.
2. **Canonical file-naming sanitizer, one place.** `sanitizeFileName` (`exporter.ts:1189–1194`,
   lowercase→non-alphanum-to-hyphen→strip) must be shared, or the two sides drift on filenames.
3. **The unfold step is Prism3-side, not shared-core.** Correction to §9a's framing: TP hands the
   core one `{collection, mode, tokens}` at a time already-unfolded; Prism3 must unfold its inline
   tree *before* handoff. **The core is a partitioner + writer, not a mode-flattener.** And the
   partitioner must be **default-mode-free** — TP privileges no mode (`defaultModeId` is
   pass-through metadata, never read for shaping), so when Prism3 unfolds, `light` becomes just
   another per-mode file, not a privileged `$value`.
4. **`propertyAliases: 'flatten' | '$ref' | 'brace-legacy'` option in the core** (default
   `'flatten'`). Put the flatten *in the core*, not downstream per-caller — else callers diverge
   on flatten behavior, which is the exact drift B exists to prevent.
5. **Core owns the file-level `$extensions.generator` block.** Both callers pass `{name, version}`;
   the core writes the "who generated this" block once. (Leaf-level `figma.*`/`prism3.*` stay
   pass-through, refinement unchanged.) Also: TP's `DTCGTokenType` union (`types/dtcg.ts:4–16`, 12
   types) should *import* the canonical type list from the shared package so the two can't drift.
6. **+2–3 days on step 4 (TP migration), not in §9b's estimate.** Four near-duplicate formatter
   implementations must consolidate (variable path, `dimension-converter`, `typography-converter`,
   `shadow-converter`), keeping the `string | DTCGDimension` return union stable for the CSS
   exporter's discriminant (`css-exporter.ts:38–54`). The transition-composite compiler
   (`exporter.ts:967–1050`) folds sibling duration/delay/timing into a composite from
   *already-formatted* values — it must keep working for TP (compile-from-siblings) while Prism3
   feeds already-composite transitions (`tree.ts:96–99`); this is the one composite with genuinely
   different construction paths. Plus a full-ZIP golden (TP has none today, ~1d) and a half-day
   re-verify per alt-format exporter. **Realistic step 4 = 4–5 days.**

**Net:** §9a is sound; Pillar 4's export core is a **facts-in, partitioned-files-out** module with
per-family format options, a shared sanitizer + `generator` block, a `propertyAliases` option, and
a Prism3-side unfolder feeding it. Revised total ≈ **2 weeks + 2–3 days** on the TP migration.


---

## 10. Second repo-review (2026-08-06) — the separability estimate was wrong, and C is now the live option

A Token-Press-side agent re-ran the §7 checklist against current TP source, and a Prism3-side spike
ran Style Dictionary 5.5.0 against `out/nb.tokens.json`. Between them they **confirm** §7.6, **correct**
§7.1, and surface one finding neither review had.

### 10a. The correction that matters — §7.1's "✅ cleaner than assumed" was measuring the wrong thing

§7.1 concluded separability was confirmed because there are **zero `figma.*` runtime calls** in the
shaping layer, and costed the boundary at **~1 day**. That observation is still true. The conclusion
drawn from it is not.

The shaping layer has no runtime calls and is **saturated with Figma TYPES**. Measured references:
`typography-converter.ts` 52, `exporter.ts` 53, `validator.ts` 25, `base-converter.ts` 9. More
structurally:

- **There is no intermediate representation.** The pipeline is
  `Figma Variable[] → TokenExporter.buildDTCGFile → JSON tree → zip`, with formatting inline during
  traversal.
- `TokenExporter` **constructs its own scanner** rather than receiving one, and `exportToZip` calls
  `scanner.scanAll()` as step one. You cannot hand it tokens.
- `ConversionContext` embeds `Map<string, Variable>`; composite conversion cannot be invoked without
  Figma `Variable` objects.
- Type resolution is driven by `VariableScope` plus name regexes — a layer Prism3 can never exercise,
  since the engine knows its types at generation time.

Revised estimate: **not ~1 day, and not a wrapper — a substantial rewrite of the export path**, because
the neutral model has to be invented first and every converter re-typed against it.

> **"No runtime calls" is not "decoupled."** The first review measured the dependency it could grep for
> and inferred the one it could not. Type coupling is invisible to that search and is the coupling that
> actually blocks extraction.

Worth generalizing: this is the same shape as several findings in `32` — a check that looks conclusive
because it measured the thing that was easy to measure. TP's own `docs/AGENT_HANDOFF.md` records the
"pure of `figma.*`" claim, which is literally true and misleading on exactly the point being decided.

### 10b. Three orthogonal mode axes — which rules out adopting TP's model wholesale

Prism3 emits **three independent mode axes**, not one:

| axis | modes |
|---|---|
| theme | light, dark, hc-light, hc-dark |
| breakpoint | sm, md, lg, xl, 2xl |
| viewport | desktop, mobile |

TP encodes mode as **directory path** (`tokens/<mode>/<collection>.json`), with mode absent from the
token structure entirely and `hasMultiMode` computed, not configurable. A flat directory namespace
cannot express three independent axes — verified downstream: sourcing `shared/ + light/` from a TP
export of a Prism3 file leaves **10 unresolved references**, because the breakpoint and viewport modes
are missing. TP's own example SD configs source exactly two globs and would break on our output.

So §7.6's "shapes diverge" is sharper than recorded: they do not merely differ, **neither is a
configuration of the other**, and TP's is structurally unable to carry our system.

### 10c. …and our model is invisible to the ecosystem

The other half, from the SD spike. Prism3 stores per-mode values under `$extensions.prism3.modes`.
Style Dictionary 5.5.0 with `usesDtcg: true` emitted **551 leaves → 551 CSS variables, 1:1** — one value
per token, silently, with 133 of them wrong for dark mode. No warning.

The generalization is the important part: **`$extensions` is defined by DTCG as ignorable.** This is not
an SD omission that an adapter patches; every conforming consumer is blind to it, permanently. A
Prism3-specific adapter would be load-bearing forever.

**Filed as #609** with the unified-export target (§11) as its motivating use case.

**Neither representation is right:**

| | conforming consumers | multi-axis |
|---|---|---|
| Prism3 (`$extensions`) | ❌ invisible | ✅ carries all three |
| Token Press (per-mode dirs) | ✅ valid standalone DTCG | ❌ flattens to one namespace |

DTCG has no mode mechanism; both tools invented one; both inventions fail differently. **This is now the
gating decision** — for this doc, for `19`'s code library, and for any export contract. Suggested
direction (needs its own issue): emit **both** — the canonical tree as source of truth, plus flattened
per-mode trees that are valid standalone DTCG.

### 10d. Two of the three consumption problems are not ours to fix

The spike found three problems with SD output. Only one is a token-side concern:

- **Alias flattening** (0 `var()` refs) — an SD config flag (`outputReferences`). TP hits it identically;
  the flag is missing from every TP example config too. Not a formatter problem.
- **Lossy typography** (font shorthand drops letter-spacing, text-case, decoration, fluid minimum) — an
  SD *transform* choice. TP's JSON is correct and complete; the CSS shorthand is lossy by design.
- **Mode blindness** — the real one, and §10b/§10c say why it is not solved by sharing code.

This materially weakens Option B as previously argued: **the extraction would pay an IR rewrite to solve
mode handling alone**, and mode handling is precisely where TP's model does not work for us.

### 10e. Where this leaves A / B / C

**Option C (move the whole plugin in) is now the live proposal**, on an argument §3 could not see: it
costed C as "org convenience," and the coordination tax has since proven concrete rather than
notional. Reaching TP required a prompt handoff to another agent in another repo; the findings came back
excellent and now live in a chat transcript rather than in code either side can gate on. That recurs
every time, and ownership is not the issue — the org already owns both.

**But §9's central correction applies to C unchanged, and is the gate:**

> Pick the canonical shape before extracting, else drift just moves from "two codebases" to "one
> codebase with two configs."

Absorbing TP without settling §10c produces **one repo containing two incompatible mode models**, which
is worse than two repos containing them — because it looks like one system and is not. So C should be
sequenced as **decide → absorb → reconcile**, never absorb-then-decide.

What C buys that B does not, and this is real: one issue tracker with working sub-issues and
dependencies (the same argument `19 §7.1` already made for the code library), one CI, one agent context,
and the ability to fix TP directly rather than negotiate. What it costs: absorbing a mature plugin's
backlog and Figma API surface while `536`, the component tier and the code library are all still open.

#### 10e-i. C′ — the exporter lands in the PRISM PLUGIN, and §10a's objection does not apply to it

**Owner reframing (2026-08-06), and it is a materially better version of C.** §3 dismissed the plugin
shell as having "no shared value with the engine." That is now demonstrably wrong — **the shell is
exactly where the value is.** The destination for TP's exporter is not `Prism3/engine/`; it is
`plugin/`, alongside the write path that already exists.

**This dissolves §10a's blocking objection rather than answering it.** The "substantial rewrite"
estimate was costed against a destination — the engine — that never sees Figma, so every `Variable`,
`VariableScope` and name heuristic has to be abstracted into an IR before anything can move. In a
**Figma plugin**, those types are native. TP's exporter is Figma-shaped because it is a Figma exporter,
and so is `plugin/`. **The coupling that blocks one destination is irrelevant to the other.**

**And the plugin is most of the way there already.** `plugin/src/read-figma.ts` produces a
`ReadbackSnapshot` carrying collections + modes, palette, semantic colour with `valuesByMode`, the FLOAT
axes per collection with `valuesByMode`, and style names — **it already reads per-mode values out of a
live file.** The shared `web/src` UI it embeds already surfaces export (`design.md`, `tokens.json`
downloads). So the plugin has a Figma **read leg** and an **export UI**; the only missing piece is
`snapshot → DTCG`, which is precisely what TP's exporter is.

Three consequences:

1. **The round-trip verification becomes near-free.** `584` establishes that a DTCG-vs-DTCG diff cannot
   attribute a fault across emit → write → export, and that a Figma-file checkpoint is a hard
   prerequisite. If write, read and export all live in one plugin, that checkpoint stops being a
   cross-tool diff and becomes an in-process comparison.
2. **The mode decision gets a natural home.** The plugin holds *both* representations — the engine's
   theme on one side, real Figma modes on the other. Whichever canonical shape §10c settles on, this is
   the one context equipped to emit it.
3. **Token Press lives on unchanged** as a standalone community plugin. Reusing the exporter is not the
   same as retiring the plugin, and nobody using TP without Prism3 is forced to migrate.

**The honest caveat, which is real work and not a blocker:** `ReadbackSnapshot` is a **verification**
shape, not an **export** shape. It carries what answers *"did this materialize correctly"* — names,
scopes, per-mode values. A full DTCG export also needs descriptions, `codeSyntax`, variable IDs, and the
CONTENTS of text and effect styles (the snapshot holds style *names* only). The read leg needs widening.
That is additive and bounded — considerably smaller than inventing an IR.

**What does not change:** §10c is still the gate. Co-locating the exporter with the plugin does not
reconcile `$extensions.prism3.modes` against per-mode directories; it only puts the code that would
implement either one in the right place. Revised sequence:

> **decide the mode shape → widen the read leg → port the exporter into `plugin/`**, with Token Press
> continuing standalone throughout.

### 10f. Low-risk moves available today, independent of A/B/C

Both reviews agree these are liftable now:

1. **`DTCGValidator`** (716 lines, TP `utils/dtcg-validator.ts`) — **highest value.** Producer-agnostic
   by construction (validates emitted JSON, not Figma input), imported only by tests in TP, and
   **neither tool validates its emitted output today**. Prism3 gains an output-conformance gate
   immediately with no coupling to resolve.
2. **`token-name-utils.ts`** (222 lines, zero Figma references) — buys identical names and alias strings
   across both tools, so their outputs compose in one SD build. Real interop without an IR.
3. `font-weight-utils.ts`, `roundToPrecision`, `CUBIC_BEZIER_MAP`, and the `types/dtcg.ts` definitions.

On (3): TP's typography emits `1.0499999523162842` because `TypographyConverter.formatDimension` never
calls `roundToPrecision`, unlike its own variable path. That is the **same float32 class** recorded in
`00` (`104.99999523162842`) — the same bug found independently in two codebases, which is the strongest
argument in this document for a shared rounding utility.

### 10g. The export-options question, largely dissolved

TP's option surface is 16 flags (`src/types/plugin.ts:74-114`), and its SD-compat preset only changes
**value shape** — and only because **Style Dictionary 3.x** could not parse DTCG. SD 4.x/5.x parse it
natively with `usesDtcg: true`, which the spike confirmed.

So if we target SD 4/5, most of that surface is unnecessary. The genuinely relevant remainder is small:
units (px/rem), color format, line-height output, and name casing. `emitDTCGKeys` is declared and never
read; `formatCss`/`formatRawFigma`/`formatDotNotation` add extra non-DTCG files rather than varying the
DTCG. **Parity is a much smaller question than it has appeared.**

### 10h. Also uncovered, worth filing against Token Press regardless

- Typography `lineHeight` float noise (see §10f).
- `outputReferences` absent from every example SD config.
- `emitDTCGKeys` is a dead option.
- Gradients are not handled at all (`DTCGTokenType` has no gradient member) — Prism3 emits them.
- `compileTransitionComposites` detects transitions by **name-sniffing** emitted keys
  (`duration`/`delay`/`timing`/`easing`), which is fragile and would not belong in a shared core.


---

## 11. The target — one package, two sources (owner vision, 2026-08-06)

Recorded here rather than in an issue because it is the *destination* everything in §10 is
navigating toward, and it is what makes the mode decision (§10c, filed as **#609**) load-bearing
rather than academic.

### 11a. The shape

- **In the web**, a user configures a theme and downloads a **token package** shaped by settings they
  choose — a DTCG preset, a Style Dictionary preset, or custom (the same axis Token Press exposes).
- **In the Figma plugin**, the same user opens the same UI and can instead export **from the Figma
  file**, the way Token Press does today.
- **Same options. Same package format.**

The settings surface is authored **once**, because `plugin/dist/ui.html` inlines the shared `web/src`
UI. That is a structural advantage over Token Press, whose own review flagged the opposite: its options
live in three places that must stay manually in sync — the `ExportOptions` interface,
`DEFAULT_OPTIONS`, and hand-written HTML matched by `getElementById` string literals.

**Prism3 already has the better pattern for this**: the lever manifest. Options declared once, both
surfaces rendered from the declaration, and an option that cannot be added to the type without
appearing in the UI. Export settings should follow that shape rather than being hand-wired per host.

### 11b. "Same package" means same FORMAT, not same SOURCE

The two paths draw on genuinely different things, and conflating them is the real UX risk:

| | source | properties |
|---|---|---|
| web | the configured theme (engine, in memory) | deterministic, contrast-verified, always current |
| Figma | the live file | may carry designer edits; may be stale relative to the UI |

Both are legitimate. In the web only the first exists; in the plugin both do. So the surface should
present **two clearly labelled sources sharing one format and one option set** — *"Export this theme"*
vs *"Export this Figma file"* — rather than one button whose meaning depends on host.

That framing removes the failure mode by construction: a user cannot ask for one and silently receive
the other.

### 11c. Drift indicator, not a blocking error

The owner's UX concern — the UI and the Figma file disagreeing — is real, but a hard error is the wrong
mechanism, for two reasons:

1. **The plugin already rehydrates from the file.** `persistInput` / `restoreInput` (#131) restores the
   UI to *that file's* brand on open, so the two match by construction at the start of a session. A
   mismatch arises only after a knob moves without re-materializing — a normal intermediate state.
2. **Blocking punishes a legitimate workflow.** "Tweak, compare against the file, decide" is exactly
   what the studio is for.

Better: report the divergence and its SIZE, and offer the three real choices —
*"This file was materialized from a different theme; N variables differ. [Export the file] [Export your
theme] [Re-materialize]."*

**And the mechanism already has an owner.** That N is the **value-equivalence check** `#584` identifies
as a hard prerequisite for any round-trip diff, and which `read-back.ts` does *not* currently provide:
its eight checks (`modesDistinct`, `aliasesResolve`, `slotScopes`, …) assert the file is **structurally
sane**, never that it is **this brand**. One mechanism serves the UX guard and the correctness gate,
which is a good sign the design is right.

### 11d. The checks this enables, in order of value

1. **Conformance** — `DTCGValidator` (§10f) over emitted output. Neither tool validates its own exports
   today; lifting it covers both sources at once.
2. **Contract** — the guaranteed token-name baseline still resolves inside the exported package.
3. **Cross-source consistency** — export the same brand both ways and diff. The real "clean and
   consistent" check.

**(3) is blocked on #609**, and that dependency is the whole argument for deciding it first: if the web
emits `$extensions.prism3.modes` and the Figma path emits per-mode directories, the two packages can
never match however well the settings align — because the disagreement is not in the settings, it is in
the shape.
