# Prism3 surface inventory

A facts-only inventory of every surface in this repo: what each one is, what it takes, what it writes, and what it refuses. It was read from the code at `main` `b020716` (2026-10-14, `ENGINE_VERSION` `0.236.0`), not from older docs. It proposes no structure and draws no diagram. Section 9 lists the data-flow edges a diagram would need, and section 10 lists where existing docs disagree with the code.

The machine-readable twin is `docs/inventory/surfaces.json`, with the same sections as keys.

**How to read it**

- Every fact cites `file:line`. A bare `:N` in a table cell refers to the file named in that row.
- **(inferred)** marks anything concluded rather than read directly.
- Brands are written as placeholders: `<brand>` for any brand, `<default>` for the engine's default theme, `<ref>` for the legacy regression brand, `<ex1>` and `<ex2>` for the two synthetic examples, `<std>` for the standard-dialect example. File names that contain a brand id are code identifiers and are left as they are.
- Line numbers drift. Treat this as a snapshot of `b020716` and re-read the cited line before you rely on it.

## 1. Engine entry points

### package.json scripts

| File | Scripts |
|---|---|
| `package.json` (root) | `verify` → `npx --yes tsx@4 verify.ts`. That is the only root script (`package.json` "scripts"). |
| `packages/engine/package.json` | **No `scripts`**, and no build step on purpose (`packages/engine/package.json` "//"). `exports` maps 37 subpaths to `.ts` sources plus 2 schema JSONs (`example-brands.json`, `nb-measured.json`). `"version": "0.5.0"`. |

### Scripts that are run

| Script | Purpose | Args / flags (parsed from source) | Reads | Writes |
|---|---|---|---|---|
| `verify.ts` (root) | Gate runner: runs every CI gate in a declared, checked order and prints a PASS/FAIL table (`verify.ts:1-6`) | `--list` (print the gates, run nothing, `:1446`); `--verbose` (`:1420`); bare args are gate ids, which run a subset and print a warning that this is a SUBSET (`:1421,1455-1460`); env `VERIFY_TIMEOUT_SCALE` (`:201`); reads `PLAYWRIGHT_BROWSERS_PATH`/`HOME` for the browser preflight (`:375-376`) | `git status` of `packages/engine/out` (`:361`), `git ls-files` (`:1087`) | Nothing in the repo. It spawns each gate with `shell:false`. `EXPECTED_ARTIFACTS = 182` (`:512`) is asserted against the `regen --check` count (`:607-612`) |
| `fold.ts` (root) | The fold: one version per batch of merges; writes `ENGINE_VERSION`, the changelog, and progress-log entries (`fold.ts:1-43`) | `--dry-run` (`:77`) | `packages/engine/changes/*.md` (`:62`), `docs/progress/pending/*.md` (`:63`), git first-parent history (`:151`), `docs/progress/archive/` (read only, `:69`) | `packages/engine/version.ts` (`:344`), `packages/engine/CHANGELOG.md` (`:345`), `docs/00-progress.md` (`:346`), the stamp files from `fold-stamps.ts` (`:347`). Deletes the folded notes and fragments (`:348`) and runs `packages/engine/regen.ts` (`:353`). It refuses on a dirty tree or a HEAD that is not on `origin/main` (`:114,125`) |
| `fold-stamps.ts` (root) | Library, not a CLI: `fillStamps()` + `STAMP_FILES` (3 files), split out so `test.ts` can drive it (`fold-stamps.ts:1-3,14-18`) | none | n/a | n/a (`fold.ts` writes) |
| `packages/engine/regen.ts` | Regenerates every committed generated artifact, plus the drift gate (`regen.ts:1-17`) | `--check` (`:186`). The check snapshots, regenerates, byte-compares, then restores (`:117-160`) | runs the 10 STEPS (`:33-46`) | All of `packages/engine/out/**`, `SCHEMA_ARTIFACTS` (3, `:72`), `MAINTAINER_ARTIFACTS` (1, `:81`), `ENGINE_ARTIFACTS` (3: `modes-report.md`, `nb-regression-report.md`, `icon-glyphs.ts`, `:53`) |
| `packages/engine/emit-dtcg.ts` | Emits the DTCG tree, `.ai.json`, base and overlays for `<ref>` + 3 native briefs. Validates aliases, contracts and BrandInput (`:140-153`) | none (isMain `:147`) | `packages/engine/examples/{<default>,<ex1>,<ex2>}.design.md` (`:149-151`), `packages/engine/schema/theme-schema.example.json` (`:206`) | `out/<brand>.tokens.json` (`:50`), `.ai.json` (`:52`), `.base.tokens.json` (`:58`), `.<mode>.overlay.tokens.json` (`:60`), `packages/engine/modes-report.md` (`:220`). Exit code 1 on a broken alias or contract (`:222`) |
| `packages/engine/cli.ts` | Authoring CLI: compiles any `design.md` (native or standard dialect, auto-detected) (`:1-27`) | `<design.md>` (positional, required); `--out`/`-o <dir>` (it refuses a next token that starts with `-`, `:78-85`); `--fidelity` (standard dialect only, `:86,135`); `--help`/`-h` (`:87`); unknown flag → exit 1 (`:91`) | the design file (`:101`) | via `emitTheme`, the same 3+N files as emit-dtcg into `--out` (default `packages/engine/out`, `:98`); with `--fidelity`, `<id>-fidelity-report.md` (`:126-128`) |
| `packages/engine/emit-figma.ts` | Writes the Figma variable/style payloads for 4 brands (`:262-293`) | none | `packages/engine/examples/*.design.md` (`:264-268`) | `out/figma/<brand>/*.json` (`:288-290`). `figmaArtifacts()` (`:173`) is exported and reused by MCP |
| `packages/engine/nb-regression.ts` | Regression: generated ramps vs the hand-built legacy reference (ΔE00, contracts) (`:1-12`) | none | `reference/<ref>/…/core-color.json` (`:23,65`), `reference/Prism2/…/space-size.json` (`:178`), `reference/<ref>/…/radius.json` (`:179`) | `packages/engine/nb-regression-report.md` (`:247-248`) |
| `packages/engine/visualize.ts` | Renders a self-contained HTML style guide from the emitted trees (`:1-19`) | none | `out/<brand>.tokens.json` (`:62`) | `out/tokens.html` (`:599`) |
| `packages/engine/emit-levers.ts` | Writes the lever manifest (`:1-9`) | none | `levers.ts` | `schema/lever-manifest.json` (`:16-17`) |
| `packages/engine/emit-preview.ts` | Writes the preview spec (`:1-8`) | none | `preview.ts` | `schema/preview-spec.json` (`:15-16`) |
| `packages/engine/emit-brandinput.ts` | Writes the pre-resolution BrandInputs that the browser hosts boot from (`:1-15`) | none (isMain `:40`) | `examples/{<default>,<ex1>,<ex2>}.design.md` (`:27,33`) | `schema/example-brands.json` (`:24,42`) |
| `packages/engine/emit-icons.ts` | Generates the glyph module from SVGs, with a two-way check of mapping vs disk (`:1-30`) | none | `packages/engine/icons/*.svg` (45 SVGs), `icon-set.ts` `ICON_SOURCES` (`:51,95`) | `packages/engine/icon-glyphs.ts` (`:52,174`) |
| `packages/engine/emit-component-docs.ts` | Component docs projection (`:1-8`) | none (isMain `:268`) | `components/*` def registry | `out/components/components.ai.json` (`:272`), `out/components/<id>.md` (`:273`), `schema/component-maintainer.json` (`:274`). It clears the dir first (rmSync, `:270`) |
| `packages/engine/token-contract.ts` | Token-NAME contract: builds the guaranteed-path intersection over the corpus and gates breaking changes (`:1-6`) | `--check` / `--accept` (one is required, else exit 2, `:286-291`); env `PRISM3_CONTRACT_BASELINE` (`:293`) | 10-member corpus: 4 example brands + 6 synthetic `minimal*` (`:226-235`); `examples/*.design.md` (`:152,224`); baseline `schema/token-contract.json` (`:132,264`) | `--accept` only: the baseline (`:414`). It is deliberately not in regen |
| `packages/engine/materialise-to-figma.ts` | Turns `out/figma/<brand>/` into paste-ready plugin JS passes (`:1-11`) | `<brand>` positional (default `<ref>`, `:931`); `--pass <name>` from `palette, color-create, dims-create, color-aliases, dims-aliases, font-vars, text-styles, styles, verify` (`:906-909,932-936`); `--chunk N` (1-based, `:938-942`). With no `--pass` it prints a byte-budget manifest (45 000 B, `:953`) | `out/figma/<brand>/*` (`:53,153`) | stdout only (`:943,950`) |
| `packages/engine/mcp.ts` | MCP server: dependency-free JSON-RPC 2.0 over stdio (`:1-41`) | none. Protocols `2026-07-28` + `2024-11-05` (`:35-37`) | `schema/theme-schema.json` (`:736`) | stdout responses. The `export_theme` tool writes `tokens.json`, `ai-metadata.json`, `figma/<file>` under a relative `outDir` (`:551-555`) and refuses absolute paths and `..` (`unsafeOutDir`, `:528-533`). Tools (6): `list_levers` `theme_brand` `score_consumption` `theme_from_brief` `export_theme` `validate_brand` (`:236-372`) |
| `packages/engine/test.ts` | Dependency-free suite (30 623 lines) (`:1-13`) | none | many, incl. `out/tokens.html` (`:3196`), `fixtures/figma/<ref>/` (`:11441`) | temp scratch dirs only (inferred from `mkdtempSync` import `:78`, `:29757`) |
| `packages/engine/mcp-test.ts` | MCP transport/conformance/journey suite over real stdio (`:1-21`) | none | spawns `npx tsx mcp.ts` (`:43`) | none |
| `packages/engine/typecheck-components.ts` | Typecheck gate for component defs: the files `tsc --listFiles` reports vs the declared set (`:1-45`) | none | `packages/engine/tsconfig.json`, `components/*` | none (inferred) |

### Named as entry points, but not CLIs (no `process.argv`, no isMain; pure modules)

| File | What it actually is |
|---|---|
| `packages/engine/eval.ts` | Pure scoring core (invented-token, primitive-leak, contract-compliance) used by MCP `score_consumption` (`eval.ts:1-25`) |
| `packages/engine/eval-run.ts` | Pure harness with an injected `ModelRunner`; "no I/O" (`eval-run.ts:1-13`) |
| `packages/engine/preview.ts` | Pure preview spec; its shell is `emit-preview.ts` (`preview.ts:1-20`) |
| `packages/engine/persist-input.ts` | Pure `{v,input}` serialize + version guard for the plugin's shared-data persistence (`:1-25`) |
| `packages/engine/read-back.ts` | Pure `ReadbackSnapshot` + `verifyReadback`, inverse of `write-plan.ts` (`:1-25`) |
| `packages/engine/rename-stamp-audit.ts` | Pure checking half of the fold's rename stamps, run by `lint-emission-version.ts` (`:1-13`) |

### Gates: `packages/engine/lint-*.ts` (42 files)

Only the flags found are listed. Every gate runs as `npx tsx packages/engine/<name>`.

| Gate | One-line purpose (from header) | Flags |
|---|---|---|
| lint-absolute-inset | an absolutely positioned part with `inset` leaves a visible gap from its parent, in every brand | |
| lint-advisory-expiry | a stated advisory window fails the build once it closes | env `PRISM3_TODAY` |
| lint-axis-values | every component axis value set is declared, and so is its relation to the others | |
| lint-component-docs | every def reaches its docs whole; the maintainer record reaches nothing that ships | `--all` |
| lint-component-renames | component axis/value renames are declared (`COMPONENT_RENAMES`) | `--accept` (writes `schema/component-axes.json`, `:146`) |
| lint-component-surface | a change to the projected component surface owes an ENGINE bump | `--accept` (writes `schema/component-surface.json`, `:523-578`); env `GITHUB_BASE_REF` |
| lint-consumer-build | the consumer set (base + overlays) carries no build metadata | |
| lint-context-nodes | context nodes are groups; `on-` takes a ground | |
| lint-cut-binding | a text style's cut is bound to a STRING variable, never baked | |
| lint-decisions-index | every recorded decision is indexed and every row resolves | `--accept` (writes `schema/decisions-index.json`, `:378`) |
| lint-description-claims | every number a shipped description states about its token is true | |
| lint-doc-gates | CLAUDE.md, CONTRIBUTING §3 and the PR template match `ci.yml` | |
| lint-emission-version | if the emission moved, an engine bump is owed and declared | env `GITHUB_BASE_REF` |
| lint-figma-descriptions | Figma descriptions are short, plain, and name only findable things | |
| lint-figma-destination | a leaf's claim about its Figma destination agrees with the emission | |
| lint-glyph-geometry | a vector part draws something on a square artboard | |
| lint-hit-target | interactive controls have hit targets ≥44px (or a named exception) | |
| lint-icon-count | the icon def's metadata states no stale glyph count | |
| lint-layout-claims | docs do not describe repo layout incorrectly | |
| lint-lever-sweep | no lever setting silently deletes a guaranteed path or a bound token | |
| lint-lineheight-bake | text-style line height is an unbound percent bake | |
| lint-materialization-renames | rename accounting is total at the renaming commit | env `GITHUB_BASE_REF` |
| lint-nesting | the component nesting graph is resolvable and acyclic | |
| lint-overlay-completeness | every mode-varying leaf reaches that mode's overlay, nothing else does | |
| lint-overlay-provenance | an overlay leaf's provenance describes its own value | |
| lint-paint | four checks over component colour bindings | `--accept` (writes `schema/paint-census.json`, `:969`) |
| lint-paint-placement | which node carries the colour | |
| lint-payload-manifest | every committed generated artifact is classified by hand | |
| lint-progress-order | the progress log is newest-first; fragment rules | env `GITHUB_BASE_REF`, `GITHUB_EVENT_NAME` |
| lint-ramp-steps | a studio ramp's step list is a subset of its ladder | |
| lint-ramp-values | every studio ramp rung resolves to a value | |
| lint-ratio-truth | the reported contrast ratio is recomputed and true | |
| lint-rung-names | a def's size enum vs the emitted token tier | |
| lint-schema-classification | every `schema/` file has a decided place in the prose gates | |
| lint-shape-index | a docs/34 shape number never changes meaning | `--accept` (writes `schema/shape-index.json`, `:376`) |
| lint-size-override-coherence | per-rung desktop/mobile type overrides never invert the ramp | |
| lint-skills | shipped SKILL.md factual claims are true | |
| lint-standalone-floor | build-target defs project members with an extent, or declare `notStandalone` | |
| lint-stranded-collections | no collection ships unwritten; nothing writes an unshipped collection | |
| lint-tool-neutral-prose | consumer prose names no tool | |
| lint-us-english | US English across shipped text | `--files` |
| lint-voice | voice-standard banned phrases across shipped text | `--files` |

## 2. MCP server

### Launch, transport, identity

| Fact | Value | Source |
|---|---|---|
| Entry | `packages/engine/mcp.ts` (runs only when it is `argv[1]`, the `isMain` check) | mcp.ts:732-733 |
| Command | `npx tsx packages/engine/mcp.ts` (header); README/CI use `npx --yes tsx@4 …/mcp.ts` | mcp.ts:41; packages/engine/README.md:84,90,93; .github/workflows/ci.yml:68 (mcp-test) |
| Args | none. The schema is read from `packages/engine/schema/theme-schema.json`, resolved relative to `mcp.ts` | mcp.ts:735 |
| Transport | stdio, newline-delimited JSON-RPC 2.0. Reads stdin chunks, splits on `\n`, trims, skips empty lines. Writes one JSON line per response to stdout. stderr carries a ready banner listing protocols and tools | mcp.ts:730-761 |
| Parse error | `{id:null, error:{code:-32700,'parse error'}}`. The process continues | mcp.ts:753-754 |
| Handler throw | `-32603 internal error: <msg>` | mcp.ts:756-757 |
| SDK | none. Hand-rolled (no `@modelcontextprotocol/sdk`) | mcp.ts:4-7 |
| serverInfo | `{ name: 'prism3-engine', version: ENGINE_VERSION }`, imported from `packages/engine/version.ts` | mcp.ts:53,57 |
| Protocol versions | `PROTOCOL_VERSIONS = ['2026-07-28','2024-11-05']` | mcp.ts:70 |
| `initialize` reply version | echoes the client's version if it is in the list and not `2026-07-28`, else `HANDSHAKE_PROTOCOL_VERSION = '2024-11-05'`. Live: a client asking for `2025-11-25` gets `2024-11-05` | mcp.ts:78, 699-703 |
| Per-request version | `params._meta['io.modelcontextprotocol/protocolVersion']`: an unsupported value returns `-32022` with `data.supported`, and an absent one is served | mcp.ts:82-87, 684-687 |
| Capabilities | `{ tools: { listChanged: false } }`, shared by `initialize` and `server/discover` | mcp.ts:100, 692, 702 |
| Result envelope | every result: `resultType:'complete'` + `_meta['io.modelcontextprotocol/serverInfo']` | mcp.ts:676-677 |
| Methods | `server/discover`, `initialize`, `notifications/initialized` / `initialized` (no reply), `ping`, `tools/list` (`ttlMs: 3_600_000`, `cacheScope:'public'`), `tools/call` | mcp.ts:689-723 |
| Errors | unknown method `-32601`. `tools/call` without a name `-32602`. Unknown tool `-32602 Unknown tool: <name>`. Codes defined but unused: `-32020` headerMismatch, `-32021` missingRequiredClientCapability | mcp.ts:91-95, 718, 721, 725 |
| Resources / prompts | **none**. `resources/list` and `prompts/list` return `-32601` (live probe), and neither is in `CAPABILITIES` | mcp.ts:100, 724-725 |
| Filesystem port | `ExportIo {mkdir, writeFile}`, granted only in the stdio shell (`mkdirSync` recursive, `writeFileSync`). `callTool`/`handleRpc` are pure | mcp.ts:505-508, 739-742 |
| Tool result shape | `structured()` = `structuredContent` + a JSON text copy. `text(…, true)` = text only + `isError:true` | mcp.ts:412-419 |

### Tools (6, in `tools/list` order)

Descriptions are quoted verbatim. No brand name appears in any served string (grep of the live `tools/list`), so nothing was redacted.

#### `list_levers`: title "List brand controls" (mcp.ts:236-263, handler 581-607)
- **Description**: "List the complete BrandInput surface an agent can set: the lever catalog (grouped, labeled, typed, with enums, defaults and UI ranges — the same manifest the Figma plugin and web playground render from) PLUS the non-lever fields the manifest does not carry (identity, mode set, and the per-mode override layers). Call this first to learn what theme_brand accepts. Pass \`describe\` with field names to get those fields' full schema descriptions instead."
- **Input**: `{ describe?: string[] }`, `additionalProperties:false`. `describe` description: "BrandInput field names (e.g. [\"typography\", \"radiusHairline\"]). Returns each field's schema entry with every description in full, plus the $defs it references, instead of the catalog."
- **outputSchema**: object, `anyOf` [required `levers`,`nonLeverFields`,`required`] or [required `described`].
- **Returns**: `{levers: buildLeverManifest(), nonLeverFields: schema props minus manifest root keys (with enum/items.enum), required: schema.required}`. With `describe`, it returns `{described:{properties, $defs?}}` (full prose, $defs followed transitively; mcp.ts:208-221).
- **Errors (isError)**: `describe` is not a non-empty string array. Unknown field(s), with `fields: [all keys]` attached.
- **Annotations**: readOnly, idempotent, not openWorld.

#### `theme_brand`: title "Generate a design-token system" (mcp.ts:265-282, handler 660-663 → 467-496)
- **Description**: "Generate a full design-token system from a brand input, and verify it. Returns the contrast-contract results (every declared a11y pair, computed on the resolved colors across all modes), alias integrity, and the decisions log by default. The DTCG token tree and the .ai.json agent metadata are OPT-IN via \`include\` because they are large — for a four-mode brand they measure roughly 890,000 and 590,000 characters respectively (~370,000 tokens combined). Arguments: { brand, include }. Call list_levers to see the controls, or validate_brand to check an input first. Each field description in the \`brand\` schema below is a one-line summary; list_levers with \`describe\` returns the full text."
- **Input**: `{ brand (required), include? }`, `additionalProperties:false`.
  - `brand` = `compactSchema(theme-schema.json)`: every `description` cut to its first sentence (plus a leading OPTIONAL/OPT-IN tag), and every other keyword kept verbatim (mcp.ts:178-203, 272). Live: 42 properties, `required: ["id","primary","neutral"]`, `additionalProperties:false`, 9 `$defs`. Enums carried, for example `modes.items` ∈ {light, dark, hc-light, hc-dark, wireframe}, `density` ∈ {comfortable, compact, spacious}, `controlShape` ∈ {rounded, pill, boxed, hairline}, `personality.items` (9 traits). Full schema: B.json.
  - `include`: array of enum `['tokens','aiMetadata','notes']` (`THEME_SECTIONS`, mcp.ts:154). Description: "Sections to return, replacing the default [\"notes\"]. Add \"tokens\" and/or \"aiMetadata\" for the large payloads; pass [] for the verification result alone."
- **Also accepts** a bare BrandInput, detected by the absence of a `brand` key (mcp.ts:405-410).
- **Returns** (structured, **no outputSchema declared**): `{id, modes[], contracts{checks,pass,failures["mode.role ratio<min"]}, aliases{total,resolved,broken}, omitted[], notes?, tokens?, aiMetadata?, hint?}`. Default include is `['notes']` (mcp.ts:403).
- **Errors (isError)**: "BrandInput failed schema validation" `{errors}`, or "BrandInput refused by the engine" `{errors:[msg]}` when `brandTheme` or `buildTree` throws (mcp.ts:429-432).
- **Annotations**: readOnly, idempotent.

#### `score_consumption`: title "Score how an agent used the tokens" (mcp.ts:284-319, handler 626-640)
- **Description**: "Score generated output against a brand's token system — the check that closes the loop after theme_brand. Give it the token refs your output used and, optionally, the foreground/background pairs it put together. Returns: invented-token rate (refs naming tokens that do not exist), primitive-leak rate (refs reaching past the semantic layer into raw palette/dimension/font tiers), and contrast-contract compliance for every pair across every mode. Deterministic — no model judgment involved."
- **Input** (`additionalProperties:false`, required `brand`,`refs`):
  - `brand`: object. "The same BrandInput you passed to theme_brand — see that tool for the full input schema."
  - `refs`: string[]. "Token refs the output used. Brace syntax, root-qualified or root-relative all accepted."
  - `pairs?`: array of `{fg:string, bg:string, kind?: 'text'|'large-text'|'ui'}` (fg and bg required). `kind` description: "Sets the floor: text 4.5:1, large-text and ui 3:1. Defaults to text."
- **outputSchema**: `{consumption (required), contracts}`.
- **Returns**: `consumption = scoreConsumption(refs, tree, root)`. `contracts = scoreContractCompliance(pairs, theme)` only when `pairs` is a non-empty array (mcp.ts:635-638).
- **Errors (isError)**: brand schema errors. "score_consumption requires \`refs\`…". "score_consumption input failed validation" with errors indexed per entry (refs non-string, pair not an object, fg/bg not a string, kind outside the enum; mcp.ts:445-463). Engine refusal. A `pairs` value that is not an array is silently ignored (mcp.ts:448).

#### `theme_from_brief`: title "Generate from a markdown brief" (mcp.ts:321-334, handler 642-658)
- **Description**: "Generate a token system from a design.md brief — YAML frontmatter plus prose — instead of a hand-assembled BrandInput. The natural entry point when working from a written brand description rather than known numbers: it parses the brief, reports the BrandInput it derived, and returns the same verification payload as theme_brand (with the same opt-in \`include\`). Call theme_brand directly when you already hold exact values."
- **Input**: `{ brief: string (required), include?: THEME_SECTIONS[] }`, `additionalProperties:false`. `brief` description: "A design.md document. It must open with a --- YAML frontmatter fence on the first line." `include` description: "Sections to return, replacing the default [\"notes\"]; same meaning as theme_brand."
- **Parser**: `parseDesignMd` (packages/engine/design-md), the Prism3 dialect only. The paste path's `brandFromDesignMd` also accepts the standard dialect (apps/plugin/mcp-paste.ts:61-62,77). The MCP tool does not use it (mcp.ts:52,647).
- **Returns**: the theme_brand payload plus `derivedBrandInput`. No outputSchema.
- **Errors (isError)**: brief is not a string. "could not parse the design.md brief: …". Every theme_brand error.

#### `export_theme`: title "Write the token system to disk" (mcp.ts:336-370, handler 536-579)
- **Description**: "Generate a brand and WRITE its artifacts to a directory, returning a manifest of what was written — never the content. Use this instead of theme_brand include:[\"tokens\"] whenever you want the actual files: the DTCG tree alone is roughly 890,000 characters for a four-mode brand, which no tool result should carry. Writes tokens.json (DTCG), ai-metadata.json, and a figma/ directory of Figma collection files. Arguments: { brand, outDir, include }. \`outDir\` must be a RELATIVE path. Requires a host that granted filesystem access; returns an error if not."
- **Input** (`additionalProperties:false`, required `brand`,`outDir`): `brand` object ("The same BrandInput you would pass to theme_brand — see that tool for the full input schema."). `outDir` string ("Relative directory to write into (e.g. \"./tokens\"). Absolute paths and \"..\" segments are refused."). `include?` enum `['tokens','aiMetadata','figma']` (`EXPORT_SECTIONS`, mcp.ts:513), "Artifact families to write. Defaults to all three."
- **outputSchema**: `{outDir, total (req), totalBytes, written[{path,bytes}] (req), sections[]}`. The handler also returns `id` (mcp.ts:572).
- **Writes**: `<outDir>/tokens.json`, `<outDir>/ai-metadata.json` (`buildAiMetadata(..., {tokensFile:'tokens.json'})`), `<outDir>/figma/<a.path>` from `figmaArtifacts(theme).artifacts`. Paths resolve against the server process cwd (inferred from `writeFileSync` with a relative path, mcp.ts:741).
- **Errors (isError)**: no io port. `unsafeOutDir` (empty, absolute including a `C:` drive prefix, a `..` segment; mcp.ts:528-533). Schema errors. Unknown include section. Engine refusal. "write failed: …" with a partial `written`.
- **Annotations**: `readOnlyHint:false` (the only one), idempotent.

#### `validate_brand`: title "Validate a brand input" (mcp.ts:372-382, handler 609-624)
- **Description**: "Validate a BrandInput against the engine schema and the engine's own input refusals, WITHOUT generating tokens. Returns { valid, errors } — a fast pre-flight before theme_brand. Takes the same brand object as theme_brand's \`brand\` argument; see that tool for the full input schema."
- **Input**: `{ type:'object', description:'A BrandInput — the same shape as theme_brand\'s \`brand\` property.' }`. The arguments ARE the BrandInput (not wrapped), with no properties declared.
- **Returns**: `{valid, errors[]}`. Schema errors first. If there are none, it runs `buildTree(brandTheme(args))` and appends the thrown message (mcp.ts:619-622). An invalid brand is never `isError`.

### "Paste path": Figma plugin-API code for an agent to run through the Figma MCP

**Not a tool of this MCP server.** `mcp.ts` has no tool that returns Figma code (mcp.ts:234-383). README states "It doesn't write to Figma" (packages/engine/README.md:111). The paste path is two CLIs that write scripts to disk.

| Path | Entry | Target tool | What it emits | Source |
|---|---|---|---|---|
| Current | `npx tsx tools/figma-mcp/plan.ts --brand <md\|example id> [--apply] [--build all\|id,id] [--cleanup] [--ledger f] --out <dir>` | Figma MCP `use_figma` | numbered `NNN-*.js` + `manifest.json`. Each script is an esbuild IIFE bundling one `mcp-steps.ts` export + its packed plan slice. Ceiling `SCRIPT_CEILING = 45_000` chars (tool cap 50,000) | tools/figma-mcp/plan.ts:1-117; apps/plugin/mcp-paste.ts:67,120-136; tools/figma-mcp/README.md:14-16 |
| Report | `npx tsx tools/figma-mcp/report.ts --manifest … --results … [--json] [--ledger-out]` | — | `VERDICT: PASS/FAIL` + FAIL/WARN/INFO | tools/figma-mcp/report.ts:4-7; README.md:72-90 |
| Agent link | `npx tsx tools/figma-mcp/agent-link.ts link\|send <cmd>\|read <id>` | `use_figma` (mailbox in root shared plugin data, ns `prism3agent`) | short scripts that drive the OPEN plugin. Commands: the 10 in `AGENT_COMMANDS`: status, apply-theme, build-components, file-setup, style-guide, prune, readback, update-components, capture-baseline, adopt-members. The file's header comment lists only the first 7 (§10.3 #18) | tools/figma-mcp/agent-link.ts:1-16,21,59,62; apps/plugin/src/agent-protocol.ts:41; README.md:122-195 |
| Legacy (engine) | `npx tsx packages/engine/materialise-to-figma.ts <brand> [--pass palette\|color-create\|dims-create\|color-aliases\|dims-aliases\|font-vars\|text-styles\|styles\|verify] [--chunk N]` | `figma_execute` (named in header) | plugin-JS payloads for variables and styles, from `out/figma/<brand>/` | packages/engine/materialise-to-figma.ts:1-11,56-60,906-909 |

**Steps** (`STEP_EXPORTS`, mcp-paste.ts:120-123; runtime apps/plugin/src/mcp-steps.ts):

| Step export | Phase/kind | Covers | mcp-steps.ts |
|---|---|---|---|
| runPreflight | preflight | read-only conflict check (`preflightApply`) | 246 |
| runFloat | theme/float | dimension/space/radius/size/layout vars: create pass, then alias pass | 272; mcp-paste.ts:242-256 |
| runColor | theme/color | 3 passes: palette → `core`, color create (literal per mode), color aliases | 265; mcp-paste.ts:259-273 |
| runStyles | theme/styles | effect (shadow) + paint (gradient) styles | 279; mcp-paste.ts:281-284 |
| runGrid | theme/grid | one grid style per breakpoint | 285; mcp-paste.ts:286-289 |
| runFont | theme/font | font family/size/weight vars + fluid type sets (one script) | 291; mcp-paste.ts:294-296 |
| runText | theme/text | text styles bound to font vars | 298; mcp-paste.ts:299-302 |
| runPersist | theme/persist | brand input → shared plugin data (#131) | 304; mcp-paste.ts:306 |
| runReadbackVars | readback | paged at `READBACK_PAGE = 150` | 317; mcp-paste.ts:69,309-315 |
| runReadbackStyles | readback | text/effect/paint/grid styles | 355; mcp-paste.ts:316 |
| runComponentChunk | components/component-chunk | one chunk of a set-built def (`planSetChunks`) | 529; mcp-paste.ts:411-419 |
| runComponentEmit | components/component-emit | defs with `emitAsComponents` (one component per member, `planToPluginJs`) | 556; mcp-paste.ts:397-405 |
| runReadbackComponents | component-readback | one per component page | 593; mcp-paste.ts:425-428 |
| runCleanupTheme / runCleanupPage | cleanup | removes only Prism3-stamped or engine-described items | 414, 619; mcp-paste.ts:321-330,435-446 |

**Component coverage**: `buildableDefs` = every `componentDefs` entry that is not `figmaProperties.notStandalone` and whose `figmaAnatomySet` does not throw for the brand (mcp-paste.ts:338-342). `componentDefs` order (packages/engine/components/index.ts:86-…), as listed at runtime: icon (emitAsComponents), focus-ring, button, button-destructive, button-neutral, icon-button, icon-button-destructive, icon-button-neutral, field-label, field-message, text-field, textarea, checkbox-control, checkbox-row, checkbox-group, radio-control, radio-row, radio-group, switch-control, switch-row, select, veil, image-placeholder, spinner (emitAsComponents), badge, tag, tab, tabs, divider, _accordion-indicator, accordion, list-item, list (33 defs; none flagged notStandalone). Which defs are buildable depends on the brand (inferred: all 33 unless a projector throws). A runtime check on one example brand failed with `ERR_REQUIRE_ASYNC_MODULE` (esbuild import under tsx), so this was not measured. Dependencies are scheduled first via `missingDependencies` (mcp-paste.ts:348-368).

**Transport details**: columnar `pack`/`unpack` (`$k`/`$r`), mcp-steps.ts:56-87. The shared-plugin-data probe and the ledger fallback, mcp-steps.ts:99-178. Gate: `apps/plugin/test-mcp-paste.ts`, which runs in the plugin `test` script (apps/plugin/package.json:13).

### Tests

| Suite | Coverage | Source |
|---|---|---|
| `mcp-test.ts` (CI: ci.yml:68) | Spawns the real server (`npx tsx mcp.ts`). **Transport**: partial line, split write, two messages per write, malformed JSON, notification produces no reply, banner on stderr (93-132). **Conformance**: discover, resultType/_meta, ttl/cacheScope, deterministic order, name regex, title+annotations, **tools/list ≤ 55,000 chars**, version accept/reject `-32022`, `-32601`, unknown tool `-32602`, isError vs valid:false, initialize version echo for several client versions, structuredContent = text (135-218). Refusal arms #2146/#2159/#2198/#2162/#2227/#2209 across validate_brand, theme_brand, theme_from_brief, export_theme, score_consumption (222-379). **Journey**: list_levers → theme_from_brief → theme_brand → include tokens → score_consumption → bad brief (381-442). Floor `MIN_ASSERTIONS = 40` (455). export_theme is exercised only on refusal paths here | packages/engine/mcp-test.ts |
| `test.ts` | in-process `handleRpc`/`callTool` (33 references), including the fake `ExportIo` (inferred from mcp.ts:503-504) | packages/engine/test.ts |
| `mcp-served.ts` | not a test. Spawns the server, sends one `tools/list`, returns the tools or `{error}`, and `servedStrings` walks every key and value for the prose gates (`lint-us-english.ts`, `lint-voice.ts`) | packages/engine/mcp-served.ts:36-76 |

## 3. Figma plugin (`apps/plugin`)

### Manifest and builds

| Fact | Value | Source |
|---|---|---|
| name | `Prism3 Studio` | apps/plugin/manifest.json:2 |
| id | present (a fixed string id, not a file key) | apps/plugin/manifest.json:3 |
| api | `1.0.0` | apps/plugin/manifest.json:4 |
| editorType | `["figma"]` | apps/plugin/manifest.json:5 |
| main / ui | `dist/main.js` / `dist/ui.html` | apps/plugin/manifest.json:6-7 |
| documentAccess | `dynamic-page` | apps/plugin/manifest.json:8 |
| networkAccess.allowedDomains | `["none"]` | apps/plugin/manifest.json:10 |
| networkAccess.devAllowedDomains | `["ws://localhost:17331"]` | apps/plugin/manifest.json:12 |
| Menu commands (`menu`), `parameters`, `relaunchButtons`, `permissions`, `capabilities` | **none declared**. The plugin has one entry: `figma.showUI` at launch | apps/plugin/manifest.json:1-14; apps/plugin/src/main.ts:119 |
| Window | opens 1280x900, min 380x420, size kept in `clientStorage` `prism3:ui-size` | apps/plugin/src/main.ts:84,110,113,119,177-190 |

| Build | Command | Output | `PRISM3_DEV` | Manifest | Source |
|---|---|---|---|---|---|
| Dev | `npm run build` (`node build.mjs`) | `dist/` | `true` | the repo's `manifest.json`, with `devAllowedDomains` | apps/plugin/package.json:8; apps/plugin/build.mjs:26-28,211,243 |
| Release | `npm run build:release` (`node build.mjs --release`) | `release/` | `false`, plus `minifySyntax` so dead dev branches are dropped | `release/manifest.json` written from `manifest.json`: `main`/`ui` rewritten, `devAllowedDomains` deleted | apps/plugin/package.json:9; apps/plugin/build.mjs:211,215,244,334-341 |
| Watch | `npm run watch` | `dist/`; `--release --watch` throws | dev | — | apps/plugin/build.mjs:30,343-356 |

Dev-only code, dropped from release: the desktop bridge relay (UI) and the `run-code` agent command (main). The **file mailbox (transport A) ships in both builds.** `lint-release-bundle.ts` asserts four markers present in `dist/` and absent from `release/`: `localhost:17331`/`17331`, `createBridgeRelay` (ui.html), `run-code`, `(0, eval)` (main.js), and that `release/manifest.json` equals `manifest.json` less `devAllowedDomains` with `allowedDomains: ["none"]` (apps/plugin/lint-release-bundle.ts:53-86,127-140; apps/plugin/src/agent-link-ui.ts:135; apps/plugin/src/agent-dispatch.ts:224,272).

Build assertions (both builds): 0 `node:` builtins in main.js; exactly one `</script>` in ui.html; build id `<ISO seconds> tree-<8 hex sha256 of tree path>` stamped in both bundles; no absolute filesystem path in either bundle (apps/plugin/build.mjs:113-117,138-157,191-198,274-283,308-316). The UI is `src/ui/entry.ts`, which imports `apps/studio/src/entry.ts` whole and mounts the Agent tile (apps/plugin/build.mjs:229; apps/plugin/src/ui/entry.ts:10-36).

### Features

Every write runs through one table, `ACTIONS`, that both the panel and the agent link call (apps/plugin/src/main.ts:1211-1221,1278-1357). A run guard refuses a second run of the same write operation while one runs, panel or agent: message `"<Title> is already running. Try again when it finishes."` with titles Apply Theme, Build set, Set up file, Style guides, Prune stale (apps/plugin/src/run-guard.ts:21-23,39; apps/plugin/src/main.ts:1191-1199). The update, baseline and adopt commands hold the **build** operation (apps/plugin/src/run-guard.ts:27-33; apps/plugin/src/main.ts:1218-1220).

| # | Feature | Trigger | Writes into the file | Refuses / guards (quoted) | Source |
|---|---|---|---|---|---|
| F1 | Apply Theme | Top-bar "Apply Theme" button (studio `applyAction` → `runApply` → `postTheme`) → `apply-theme {input: BrandInput}`; agent `apply-theme` | Variable collections and variables (color `core` + `color`, FLOAT collections, font-variable collections), modes; effect, paint (gradient), grid and text styles; shared plugin data `prism3/modes:owned` and `prism3/modes:planned` on collections; `prism3/owned` mark on each style; `prism3/brandInput` on `figma.root` after the writes. Renames migrate in place. Never deletes: orphans and stranded collections are reported only | Pre-flight: `"Nothing was written. N conflict(s) with existing content: …"`, headline `"✗ N conflicts"`; per conflict `already in this file, not created by Prism3` or `is <TYPE> in "<col>"; Prism3 writes <TYPE>`. Grid-style name clashes skip that size instead of refusing. Throw: `"write failed: …"`, headline `"✗ write failed"`. Busy guard. Panel disables it after a failed restore: `"Off until a brand loads…"` | apps/studio/src/main.ts:1702-1705,1769-1770; apps/plugin/src/apply-theme.ts:57-116; apps/plugin/src/preflight.ts:144-224; apps/plugin/src/write-figma.ts:208,279,289,296; apps/plugin/src/provenance.ts:30-57; apps/plugin/src/write-styles.ts:147,165; apps/plugin/src/write-grid-styles.ts:112; apps/plugin/src/write-text-styles.ts:205; apps/plugin/src/persist-figma.ts:30-35; apps/plugin/src/main.ts:197-347; apps/plugin/src/apply-summary.ts:42,47-48 |
| F2 | Boot read-back and restore | `ui-ready`, posted when the UI's listener attaches | Nothing. Reads the variables and verifies the contract (`seed-info`); reads `prism3/brandInput` → `restore-input` / `restore-input-empty` / `restore-input-error`; sends the font list, link state, theme and Activity height prefs | Untrusted blob → `restore-input-error` | apps/studio/src/write-adapter.ts:393-400; apps/plugin/src/main.ts:1106-1168,1280-1288 |
| F3 | Build components (one def per call) | Components page Build button (`runBuild(id)` → `postComponents`) → `build-components {def?}`; agent `build-components`. No `def` means Button | Creates the `↳ <family>` page on demand and switches to it; prebuilds nested dependencies; builds or extends the COMPONENT_SET or COMPONENTs; prototype reactions; one `_Section-header` page header; canvas furniture; shared plugin data on the set `prism3/build` (build report) and on members `prism3/memberStamp`, `prism3/memberAsBuilt`, `prism3/memberUpdating` | `"no component def with id '<id>' — this build knows …"` (`✗ unknown def`); a def's own `notStandalone` text (`✗ not buildable on its own`); `"nothing built — set '<set>' on this page varies by different axes and was left as it is"`; busy guard. The panel posts only ids its catalog marks buildable | apps/studio/src/main.ts:1725-1731; apps/plugin/src/main.ts:568-860; apps/plugin/src/write-components.ts:999,1045,2670-2683,2760; apps/plugin/src/member-baseline.ts:56-61,336; apps/plugin/src/file-setup.ts:88-94 |
| F4 | Update components: dry run, then confirm | **Agent only**: `update-components {def?, confirm:false}` returns `previewHash`; `{confirm:true, previewHash, choices?}` applies. No `UiToMain` message exists; the panel only shows `component-update-result` | Dry run: nothing. Apply: a named version (`saveVersionHistoryAsync`) before the first write; members updated in place (ids kept); dropped members kept and marked deprecated, names in `prism3/retained`; `prism3/memberStamp` written last per member; page reorder; furniture redrawn | `"Nothing was updated: the file changed since the check. Run the check again, then confirm the new one."` (`✗ update refused`); `"the named version could not be saved (…), so nothing was written"`; an axis-removal collapse is refused per set; unstamped members skipped; `✗ check failed` / `✗ update failed` on throw; busy (holds the build guard) | apps/plugin/src/agent-protocol.ts:64-68; apps/plugin/src/messages.ts:265-272; apps/plugin/src/main.ts:909-944; apps/plugin/src/update-apply.ts:1-47,64,342,421,521-571,629-631 |
| F5 | Capture baseline | Agent only: `capture-baseline {def?}` | `prism3/memberAsBuilt` record, only on members that read back as the current plan | `✗ record failed`; unknown def; busy (build guard) | apps/plugin/src/main.ts:870-875,946-959 |
| F6 | Adopt members | Agent only: `adopt-members {def?}` | Plugin data only: records and stamps members Prism3 did not build | `✗ adopt failed`; unknown def; busy (build guard) | apps/plugin/src/main.ts:961-976; apps/plugin/src/agent-protocol.ts:71-73 |
| F7 | Set up file | "Set up file" button (`runFileSetup`; also the Style guides page's Set up) → `file-setup`; agent `file-setup` | Pages: Cover, native `---` dividers, section-header pages (Foundations, Components, Subcomponents, Sandbox), Foundations placeholders (Primitive tokens, Semantic tokens, Grids & layouts), `↳ File Components`. On File Components: `_Section-header`, `_Headings`, `_Label`, `_inverse-backdrop`, `_style-guide-swatches`, `_style-guide-text-cells`, `_style-guide-spacing-cells` (private plugin data `prism3-swatches`). Idempotent by name | `, ⚠ no File Components page — assets not built`; `"file setup failed: …"` (`✗ setup failed`); busy guard | apps/studio/src/main.ts:1713-1718,1762; apps/plugin/src/main.ts:992-1030; apps/plugin/src/file-taxonomy.ts:66-133; apps/plugin/src/file-components.ts:34-35; apps/plugin/src/furniture-templates.ts:44-45; apps/plugin/src/style-guide-cells.ts:26-28,125,162,258 |
| F8 | Style guides | Build style guides page: draw → `style-guide {options?}`; open → `style-guide-catalog-request` (read-only, never guarded); stop → `style-guide-cancel` (stops after the current table); agent `style-guide` | Table frames on `↳ Primitive tokens` / `↳ Semantic tokens` from the file's variables, text, effect and gradient styles; private plugin data `prism3-style-guide*` keys; reruns update in place; a superseded table the generator made and nobody touched is deleted | A missing page is a skip, never created: `"this file has no <page> page, and Set up file adds it"`; no cells: `"this file has no style-guide cell sets, and Set up file adds them"`; no saved brand: the contrast column reads "—"; `"style guide failed: …"`; busy guard | apps/studio/src/main.ts:1745-1765; apps/plugin/src/main.ts:1041-1101,1322-1325; apps/plugin/src/style-guide.ts:15-36,128-134,1327-1331,1407-1424,1888,1920,2266 |
| F9 | Prune stale (opt-in delete) | Top bar "Prune stale" → `prune {confirm:false}` preview → confirm dialog Delete → `prune {confirm:true}`; agent `prune {input, confirm}` | Deletes only: variables, collections, modes, text/effect/paint/grid styles the current plan no longer emits, plus canvas furniture whose set is gone. The delete recomputes from a fresh read | Preview is never guarded. Delete busy guard. Panel blocks it while a prune or apply runs and after a failed restore. Namespace guard: only names under the brand root. An agent's preview is forwarded as `pillOnly` so the panel never opens a dialog for it. `"prune failed: …"` | apps/studio/src/main.ts:1497-1501,1707-1710,1734; apps/plugin/src/main.ts:370-495,1246; apps/plugin/src/prune-figma.ts:20-30; apps/plugin/src/run-guard.ts:35-36,39 |
| F10 | Export | Top-bar Export menu, in the iframe only: no main-thread message | **Nothing in the file.** Browser downloads: `dtcg` (a base file plus one overlay per mode, settings `tokenNameCase`, `formatDotNotation`, `fileStructure`, `prettyPrint`, optional build metadata) or `design-md` (the brand brief). Only source available: `generated` (`file-variables` is declared but not offered) | — | apps/studio/src/main.ts:1256,1278-1297,1485-1495; apps/studio/src/export-settings.ts:60-66,87-108 |
| F11 | Canvas furniture | Part of F3, F4 and F9, for defs in the engine's `CANVAS_FURNITURE` | `_Label` and `_inverse-backdrop` instances on the set's parent, tagged with shared plugin data `prism3/furniture`; cleared and redrawn on every build or update | A furniture write failure is reported (`"No canvas labels for <def>: Figma refused the write (…)"`) and never fails the build | apps/plugin/src/canvas-furniture.ts:43-64,270; apps/plugin/src/main.ts:668,878-887 |
| F12 | Pre-flight | Inside F1, before any write. F4 has its own pre-flight | Nothing | Conflicts as in F1. An existing collection counts as Prism3's when it is stamped `modes:owned`, or (legacy) when root `brandInput` exists and no collection is stamped | apps/plugin/src/preflight.ts:144-216 |
| F13 | Provenance marks | Written by F1, F3 and F4 | `prism3/owned`=`1` on styles; `modes:owned` on collections; `memberStamp` and `memberAsBuilt` on members; `build` on sets | Best-effort: never fails an apply | apps/plugin/src/provenance.ts:1-57 |
| F14 | Agent link switch | Top-bar "Agent" tile → `agent-link {on}`. Off at every launch, not persisted, switched off on plugin `close` | When on: root shared plugin data in namespace `prism3agent` (see §4) | An agent cannot turn it on: only the panel posts to the main thread | apps/plugin/src/agent-link-ui.ts:100-127; apps/plugin/src/messages.ts:98-100; apps/plugin/src/main.ts:1276,1326-1328 |
| F15 | Panel preferences | resize grip, Theme menu, Activity drawer | `figma.clientStorage` only (per person): `prism3:ui-size`, `prism3:theme`, `prism3:activity-height` | Size clamped to the minimum | apps/plugin/src/main.ts:84-117,1290-1297,1347-1353 |

### Agent commands (protocol v1)

Envelope `{v, id, cmd, args, issuedAt}`; `id` must match `^[A-Za-z0-9._-]{1,64}$`. One command at a time across both transports. Nothing in an envelope is evaluated, except `run-code` in a dev build (apps/plugin/src/agent-protocol.ts:37,106,186,199-288; apps/plugin/src/agent-dispatch.ts:211-218).

| Command | Args | Writes | Refuses (bad-args text) | Dev only | Source |
|---|---|---|---|---|---|
| `status` | none | nothing; returns engine version, build, file name, page, brand state, color variable count, link state, command list | — | no | apps/plugin/src/main.ts:1247-1263 |
| `apply-theme` | `{input}` | = F1 | `"apply-theme needs args.input: a BrandInput object, as the UI's Apply sends it"` | no | apps/plugin/src/agent-protocol.ts:217-219 |
| `build-components` | `{def?}` | = F3 | `"build-components takes args.def: a component def id, or no def for Button"` | no | apps/plugin/src/agent-protocol.ts:224-228 |
| `file-setup` | none | = F7 | — | no | apps/plugin/src/agent-protocol.ts:284-286 |
| `style-guide` | `StyleGuideOptions` (collections, types, valueFormat, header, display, aliases, description, tables, rem, dimensionDisplay, fontDisplay, paragraphSpacing, textDecoration, titleCell, tokenNames); `pixels` accepted and ignored | = F8 | per-field, e.g. `"style-guide takes args.valueFormat: hex, rgba, hsl or hsb"`; an empty `tables` list is refused | no | apps/plugin/src/agent-protocol.ts:229-256 |
| `prune` | `{input, confirm}` | = F9 | `"prune needs args.input: a BrandInput object"`; `"prune needs args.confirm: false to preview, true to delete"` | no | apps/plugin/src/agent-protocol.ts:220-223 |
| `readback` | none | nothing; = F2 seed plus a read-only census of every component page | — | no | apps/plugin/src/agent-dispatch.ts:85-120,168-171 |
| `update-components` | `{def?, confirm?:false}` or `{def?, confirm:true, previewHash, choices?}` | = F4 | `"update-components with confirm: true needs args.previewHash: the previewHash its check returned"`; choices shape | no | apps/plugin/src/agent-protocol.ts:68,78-103,257-272 |
| `capture-baseline` | `{def?}` | = F5 | `"capture-baseline takes args.def: …"` | no | apps/plugin/src/agent-protocol.ts:273-277 |
| `adopt-members` | `{def?}` | = F6 | `"adopt-members takes args.def: …"` | no | apps/plugin/src/agent-protocol.ts:278-282 |
| `run-code` | `{code, timeoutMs?}` (default 30 s, max 600 s) | anything: indirect `eval` of an async function body in the main thread | `"run-code needs args.code: …"`; `"run-code takes args.timeoutMs: milliseconds from 1 to 600000"`; a timeout reports but does not stop the code | **yes**: `unknown-command` in a release build | apps/plugin/src/dev-commands.ts:26-78; apps/plugin/src/agent-dispatch.ts:224-231,272-274 |

Envelope-level error codes: `bad-envelope`, `bad-version` (`v` ≠ 1), `unknown-command` (`"unknown command '<cmd>' — this plugin answers …"`), `bad-args`, `stale` (`"this command was already in the inbox when the agent link was switched on, so it was not run — send it again"`), `handler-threw`, `link-off` (`"the agent link is off in this plugin session"`), `busy` (apps/plugin/src/agent-protocol.ts:111-127; apps/plugin/src/agent-link.ts:158; apps/plugin/src/main.ts:1336).

### How the agent link connects

| Transport | Where it runs | Mechanism | Source |
|---|---|---|---|
| A, file mailbox (both builds) | main thread | Polls `figma.root` shared plugin data, namespace `prism3agent`, every 1000 ms while on. Keys: `inbox` (agent writes), `claimed`, `result:<id>`, `result:<id>:<n>` (chunked above 90,000 bytes), `results` (keeps 20), `link` (plugin writes). Claims before running. Answers entries already in the inbox at switch-on as `stale` | apps/plugin/src/agent-protocol.ts:312-325; apps/plugin/src/agent-link.ts:1-36,146-203 |
| B, desktop bridge (dev build only) | UI iframe, because the main thread has no network | WebSocket client to `ws://localhost:17331`, retried every 2000 ms while on, closed when off. Server → plugin `{type:'command', command}`; plugin → server `hello`, `state`, `result`, `progress`, `log`. Forwards only the results of commands it delivered. The server (`tools/figma-bridge/server.ts`) binds 127.0.0.1 (and ::1) and is an MCP server on stdio | apps/plugin/src/agent-bridge-relay.ts:44-119; apps/plugin/src/agent-link-ui.ts:135-142; tools/figma-bridge/server.ts:15-29,233-283 |

### postMessage protocol (`apps/plugin/src/messages.ts`)

UI → main (`UiToMain`, wrapped in `{pluginMessage}`): `ui-ready` :33 · `apply-theme {input}` :36 · `build-components {def?}` :63 · `file-setup` :74 · `style-guide {options?}` :78 · `style-guide-catalog-request` :82 · `style-guide-cancel` :86 · `prune {input, confirm}` :97 · `agent-link {on}` :100 · `agent-command {command}` :104 · `agent-bridge {connected}` :106 · `resize-ui {width,height,commit}` :112 · `set-theme-pref {pref}` :116 · `set-activity-height {px}` :119.

Main → UI (`MainToUi`): `apply-result` :239 · `component-result` :256 · `component-update-result` :270 · `file-setup-result` :278 · `style-guide-result` :281 · `style-guide-catalog` :288 · `style-guide-tables` :293 · `style-guide-table` :296 · `prune-result` :303 · `refused` :313 · `component-progress` :334 · `style-guide-progress` :340 · `seed-info` :356 · `restore-input` :361 · `restore-input-empty` :375 · `restore-input-error` :384 · `font-list` :399 · `agent-link-state` :404 · `theme-pref` :408 · `activity-height` :411 · `agent-result` :413 · `agent-progress` :415 · `agent-log` :417 · `agent-started` :422 · `agent-finished` :423.

The main thread handles every `UiToMain` variant exhaustively (apps/plugin/src/main.ts:1278-1357).

## 4. Web studio (`apps/studio`)

### Studio — routing model

| Fact | Source |
|---|---|
| No URL routing. The only `location`/`URLSearchParams` read is the `?p3-test-hooks` flag. | `apps/studio/src/entry.ts:191` (grep of `apps/studio/src/` for `location.`/`pushState`/`hashchange`) |
| The current page is store state: `page` holds a `NewPageKey` or `MenuPageKey`. | `apps/studio/src/shell/pages.ts:358-361` |
| Pages are data: `DOMAINS` (7 tabs; Color has 3 sub-pages), so there are 9 places. | `apps/studio/src/shell/pages.ts:123-341`, `PLACES` `:400` |
| Each place has exactly one "home" view, from `VIEWS` (9). | `apps/studio/src/shell/pages.ts:94-97`, `homeOf` `:416` |
| Inspect views (`contrast`, `tokens`, `log`) open over any preview and are never a home. | `apps/studio/src/shell/pages.ts:99` |
| Menu pages (no tab): `styleGuides` (plugin only, Figma menu "Build style guides…"). | `apps/studio/src/shell/pages.ts:345`; `apps/studio/src/main.ts:1785` |
| Each page's levers and preview modules are wired in `NEW_PAGES`. | `apps/studio/src/shell/frame.ts:87-110` |

### Studio — pages (tabs), panels, levers

Each page shows two panes: a levers pane (`apps/studio/src/domains/*.ts`) and a preview pane (`apps/studio/src/preview/*.ts`) (`apps/studio/src/shell/frame.ts:16-19`). Section titles are the levers-pane panels. Rows give `ctl` (control) and the manifest `keys`, or schema-only inputs.

| # | id (tab › sub) | Label | Home view | Levers panels (sections) → keys | Preview sections (functions called) | Levers / preview module | Flags |
|---|---|---|---|---|---|---|---|
| 1 | `brand` | Brand | `guide` (Style guide) | Identity → schema `id`,`root`; Personality → schema `personality`; Modes → schema `modes`,`customModes` (`pages.ts:127-129`) | Lent legacy Style guide (`renderPreviewStyleGuide` from `main.ts`) (`preview/brand.ts:1-8`) | `domains/brand.ts` / `preview/brand.ts` | editable in every mode (`frame.ts:101`) |
| 2 | `color › palettes` | Palettes | `palettes` | Primary → `primary`; Brand colors → `brandColors`; Neutrals → `neutral.hue`,`neutral.chroma`,`neutral.anchor`; Status colors (advanced) → `status.success/warning/danger/info` (`pages.ts:139-147`) | none from `sections/` (own module) | `domains/color-palettes.ts` / `preview/palettes.ts` | `pinsLight`: always shows Light, mode control disabled (`frame.ts:102`) |
| 3 | `color › fills` | Surfaces & fills | `surfaces` | Background fills → `surfaces`; Scrim (read-only); Foreground → schema `overrides`; Foreground fills → `overrides`; Text color → `overrides`; Border → `overrides`; Icon → `iconContrast` + `overrides`; Fields → `overrides`; Gradients → `gradients` (`pages.ts:167-185`) | background, scrim, foreground, textColor, border, icon, focusRing, fields, palSection (`preview/surfaces.ts`) | `domains/color-fills.ts` / `preview/surfaces.ts` | `derivedReadOnly` (`frame.ts:103`) |
| 4 | `color › interactive` | Interactive | `interactive` | Interactive → `actionPalette`,`outlineInteraction`,`strictInteractiveContrast`,`interactivePalettes`,`neutralEmphasis` (+ schema `modeAnchors`,`overrides`); Disabled → `disabledStrategy`,`disabledMin`; Links → `linkPalette`,`linkStateRungs` + schema `overrides` (`pages.ts:196-226`) | interactive, disabled, links (`preview/interactive.ts:60`) | `domains/color-interactive.ts` / `preview/interactive.ts` | `derivedReadOnly` |
| 5 | `type` | Type | `type` | Typeface library → schema `typography.typefaceLibrary`; Font family for each text type → `typography.families`; Scale → `typography.typeScale` + schema `typography.sizes`,`sizeOverrides`; Scale limits (adv) → `typography.responsive`,`displayCeiling`,`titleFloor`,`captionFloor`,`sizeFloor`; Weights and styles (adv) → `typography.weightRoles`,`weights`,`links`,`italics`,`italicDefault` + schema `faces`; Line height and letter spacing (adv) → schema `lineHeights`,`letterSpacings`,`leadingShift`,`trackingShift` (`pages.ts:241-272`) | faces, typeScale, weightsByFace, lineSpacing, buildingBlocks, typeSample (`preview/type.ts`) | `domains/type.ts` / `preview/type.ts` | `derivedReadOnly` |
| 6 | `shape` | Shape (home title "Size & shape") | `shape` | Density → `density`; Radius → `radiusScale`,`controlShape`; Base radius (adv) → `baseMd` (`pages.ts:284-286`) | controlHeights, radius, spacing, shapeBuildingBlocks (`preview/shape.ts`) | `domains/shape.ts` / `preview/shape.ts` | `derivedReadOnly` |
| 7 | `depth` | Depth & motion | `depth` | Elevation → `shadow.softness`; Motion → `motionPersonality.tempo` + schema `motionPersonality.easingRoles`; Shadow tint (adv) → `shadow.tint` (`pages.ts:299-301`) | shadowRamp, shadowTint, durationRamp, motionCurves, motionTransitions, springs, palSection (`preview/depth.ts`) | `domains/depth.ts` / `preview/depth.ts` | `derivedReadOnly` |
| 8 | `layout` | Layout | `layout` | Breakpoints → `layout.breakpoints`; Grid → `layout.columns` + schema `column/gutter/marginOverrides`; Containers → `layout.containerMax`,`layout.containerNarrow` (`pages.ts:311-314`) | breakpoints, grid, containers (`preview/layout.ts:55-57`) | `domains/layout.ts` / `preview/layout.ts` | `derivedReadOnly` |
| 9 | `components` | Components | `comps` | Button → densityLink, `buttonIcons`,`buttonContentSize`,`buttonLabelWeight`,`buttonTextHover`,`buttonMinWidthMultiplier`; Component sets → `sets` (read-only list on web; Build button in plugin) (`pages.ts:320-337`) | buttonLayout, componentSets, palSection (`preview/components.ts`) | `domains/components.ts` / `preview/components.ts` | `derivedReadOnly` |
| — | `styleGuides` (menu page) | Build style guides | — | full-width page, plugin only | — | `shell/style-guides.ts` | `frame.ts:616-621` |

Derived-mode read-only note text: `DERIVED_READONLY_NOTE` (`apps/studio/src/shell/frame.ts:114`). Retired lever `radiusHairline` has no home row (`pages.ts:278-281`; `levers.ts:131-133` `deprecated`). Coverage of "every manifest lever has exactly one home row" is asserted by `apps/studio/test-pages.ts:7-13`.

### Lever groups (engine manifest) — `packages/engine/levers.ts`

The studio does **not** render by these groups: `leverGroups` has no reader in `apps/studio/src` (grep); the studio groups by `DOMAINS` pages and reads per-lever metadata via `leverOf` (`apps/studio/src/ui/lever-kit.ts:16,23`). `apps/studio/src/levers/` holds only `controls.ts` (22 lines: `paletteRefOptions`, `leverHook`) (`apps/studio/src/levers/controls.ts:13-22`). Lever controls are drawn by `apps/studio/src/ui/lever-kit.ts` (`leverBlock` `:41`, `slider` `:403`, `choice` `:426`, `chipChoice` `:584` …) and per-domain modules.

| Group (label) | Levers by key (`levers.ts` line) |
|---|---|
| `color` (Color) | `primary`:73, `neutral.hue`:75, `neutral.chroma`:77, `neutral.anchor`:79, `brandColors`:81, `actionPalette`:83, `linkPalette`:85, `status.success`:87, `status.warning`:89, `status.danger`:91, `status.info`:93, `surfaces`:95, `strictInteractiveContrast`:97, `linkStateRungs`:99, `interactivePalettes`:202 |
| `form` (Form factor) | `radiusScale`:103, `density`:105, `controlShape`:108, `buttonIcons`:113, `buttonContentSize`:116, `buttonLabelWeight`:120, `buttonTextHover`:124, `buttonMinWidthMultiplier`:127, `baseMd`:129, `radiusHairline`:131 (deprecated :133) |
| `type` (Typography) | `typography.typeScale`:136, `.families`:139, `.weightRoles`:141, `.displayCeiling`:143, `.titleFloor`:147, `.captionFloor`:150, `.sizeFloor`:153, `.responsive`:156, `.weights`:158, `.links`:160, `.italics`:162, `.italicDefault`:164 |
| `motion` (Motion) | `motionPersonality.tempo`:168 |
| `elevation` (Elevation) | `shadow.softness`:172, `shadow.tint`:174 |
| `layout` (Layout) | `layout.breakpoints`:178, `layout.columns`:180, `layout.containerMax`:182, `layout.containerNarrow`:184 |
| `advanced` (Advanced) | `iconContrast`:188, `disabledStrategy`:191, `disabledMin`:194, `outlineInteraction`:196, `neutralEmphasis`:199, `gradients`:204 |

Group order/labels: `levers.ts:219-227`. `id`/`root` are host-supplied identity, not levers: `levers.ts:234`. Count: 50 levers (15+10+12+1+2+4+6).

### Shell structure (`apps/studio/src/shell/`)

| File | What it is | Source |
|---|---|---|
| `frame.ts` (924) | Top bar, tab row + Color sub-row, two panes, menu page, narrow mode; mounts `NEW_PAGES` | `frame.ts:1-21,87-110` |
| `pages.ts` (420) | IA as data (`DOMAINS`, `VIEWS`, `INSPECT`, `MENU_PAGES`) + shared section copy | `pages.ts:94-99,123,345` |
| `bar.ts` (508) | Brand switcher + menu (examples, "+ New brand", "↑ Import design.md…"), Export tile + dialog, plugin Apply Theme, prune review | `bar.ts:1-20,157-166,288` |
| `preview.ts` (329) | Preview header: mode radio group, Inspect menu (Contrast/Tokens/Decisions log), verdict; build stamp at foot of Inspect menu | `preview.ts:1-16,243-251` |
| `activity.ts` (696) | Activity drawer: one row per operation (Apply Theme, Build set, Set up file, Style guides, Prune stale, Read-back) | `activity.ts:5-9` |
| `figma.ts` (109) | Figma menu (plugin only): Prune stale, Set up file, Build set…, Build style guides… | `figma.ts:1-13`; `apps/studio/src/main.ts:1778-1786` |
| `theme.ts` (87) | Chrome theme: web Light/Dark/System in `localStorage`; plugin Match Figma/Light/Dark via `figma.clientStorage` | `theme.ts:5-12,25-29` |
| `start.ts` (275) | Start window: 3 cards — "Start from your color" (+ Start blank), "Explore an example", "Import a design.md" | `start.ts:155,190,206` |
| `style-guides.ts` (614) | Build style guides page (plugin only) | `style-guides.ts:1-5` |
| `notices.ts` (49) | Error strip under the top bar | `notices.ts:1-9` |
| `dom.ts` (218) | `h()` helper enforcing `p3-` class scope | `dom.ts:12-28` |

Other studio dirs: `apps/studio/src/domains/` (9 levers modules), `apps/studio/src/preview/` (9 page previews + 37 files in `preview/sections/`), `apps/studio/src/state/` (17 pure state modules incl. `store.ts`), `apps/studio/src/ui/` (`lever-kit.ts`, `step-picker.ts`, `value-picker.ts`, `fonts.ts`). Legacy DOM helper `el()` and the Inspect tables `contractTableEl`/`tokenTableEl` remain in `apps/studio/src/main.ts:239,447,499`, lent to Inspect at `apps/studio/src/main.ts:1098`.

Example brands: 3, read from `packages/engine/schema/example-brands.json` (`apps/studio/src/state/store.ts:33,53`), ids set by `EXAMPLE_IDS` (`packages/engine/emit-brandinput.ts:27`); boot default `BOOT_BRAND = 'prism3'` (`apps/studio/src/state/store.ts:56`).

### Exports (web)

Export is a top-bar tile opening a modal dialog: artifact segmented control → settings → right-column file list + live preview → "Cancel" / download button (`apps/studio/src/shell/bar.ts:157-166,380-445`). Model in `apps/studio/src/export-settings.ts`; wiring in `apps/studio/src/main.ts:1255-1297,1402-1450`.

| Artifact (label) | id | Format / MIME | File names | Button | Source |
|---|---|---|---|---|---|
| Design tokens | `dtcg` | DTCG JSON, `application/json` | default: `<slug>.base.tokens.json` + `<slug>.<mode>.overlay.tokens.json` per mode; with Files=per-group: `<slug>.<layer>.<group>.tokens.json`. Never the single-file `<slug>.tokens.json`. Several files = several browser downloads, not zipped. | "↓ Download tokens" | `export-settings.ts:101-110,392-418,527-533,577-589`; `main.ts:1283-1297,1447` |
| Brand brief | `design-md` | Markdown (`toDesignMd`), `text/markdown` | `<slug>.design.md` | "↓ Download brief" | `export-settings.ts:111-115`; `main.ts:1278,1447` |
| (refused-brand rescue) | — | Markdown | `<id or saved-brand>.design.md` | notice on boot when stored brand is refused | `apps/studio/src/entry.ts:137-166` |

DTCG settings (all `sources: ['generated']`), `export-settings.ts:169-231`:

| key | label | options (default first) |
|---|---|---|
| `tokenNameCase` | Token names | `kebab` (color.on-fill), `snake` |
| `formatDotNotation` | Grouping | `nested`, `dotted` |
| `fileStructure` | Files | `single` ("One per mode"), `per-group` |
| `prettyPrint` | Formatting | `pretty` (Indented), `compact` |
| `buildMetadata` (not a shape setting) | Include build metadata | `off`, `on` — `export-settings.ts:556-569`; not persisted (`main.ts:1179-1180`) |

Brief has no settings ("Nothing to set — the brief is written one way.", `main.ts:1444`; rationale `export-settings.ts:226-245`). Import slots: `design-md` available; `figma-file` unavailable (needs #677) (`export-settings.ts:644-653`). Export sources: `generated` only available (`export-settings.ts:71,81`).

Host commit seam: web `postTheme` is a no-op; plugin posts `apply-theme` etc. (`apps/studio/src/write-adapter.ts:75-148,408-424`).

### Persistence (`apps/studio/src/persist-local.ts`)

| Key | What | Read/write |
|---|---|---|
| `prism3:brandInput` | working `BrandInput` (serialized) | `persist-local.ts:40-79`; written on every successful rebuild via `setPersist` (web only) `entry.ts:82`, `store.ts:140-154`; read at boot `entry.ts:61`, validated by `resolvePreview(brandTheme(...))` `entry.ts:66` |
| `prism3:chromeTheme` | `light`/`dark`/`system` | `persist-local.ts:90-110`; `theme.ts:7` |
| `prism3:activity-height` | Activity drawer height px | `persist-local.ts:119-137` |

Plugin host: no `localStorage` path (`entry.ts:41-44`); brand persists in Figma shared-data via the main thread (`entry.ts:79-81`). Export settings are not persisted (`main.ts:1179`).

### Serving, build, hosting, scripts

| Item | Fact | Source |
|---|---|---|
| `dev` | `node build.mjs --dev` → esbuild serve on `127.0.0.1:5173`, servedir `apps/studio` | `apps/studio/package.json`; `apps/studio/build.mjs:37-40` |
| `build` | → `apps/studio/dist/main.js` + map; defines `PRISM3_HOST='web'`, `PRISM3_BUILD='local'`, `PRISM3_TEST_HOOKS=true` | `build.mjs:27-40` |
| `build:site` | → `apps/studio/public/` = exactly `index.html`, `dist/main.js`, `dist/main.js.map` (manifest enforced); `PRISM3_BUILD` = 7-char `VERCEL_GIT_COMMIT_SHA` or `local`; `PRISM3_TEST_HOOKS=false` | `apps/studio/build-site.mjs:27,33-48,57-70` |
| Entry | `src/entry.ts` → `out: 'main'`; `index.html` loads `/dist/main.js` into `#app` | `build.mjs:28`; `apps/studio/index.html` |
| Chrome CSS | virtual module `p3:chrome-css` from `chrome/esbuild-plugin.mjs` | `build.mjs:1-12`; `entry.ts:36` |
| Vercel | `buildCommand: npm run build:site --workspace @prism3/studio`, `outputDirectory: apps/studio/public`, `ignoreCommand: bash apps/studio/vercel-ignore.sh`, deploys disabled for `lane/* fold/* docs/* archive/* claude/* design/* fix/* feat/* net/* conv-*`, header `Cache-Control: public, max-age=0, must-revalidate` on all paths | `vercel.json` (root) |
| Ignore step | 26 engine files excluded; diff base `VERCEL_GIT_PREVIOUS_SHA`; exit 0 skips, 1 builds | `apps/studio/vercel-ignore.sh:53-80,93-102` |
| Other scripts | `typecheck` (tsc), `test` (29 tsx tests chained), `test:smoke`, `test:chrome`, `test:export-parity`, `lint:contrast`, `lint:live-css`, `check:ignore` | `apps/studio/package.json` |
| devDependencies | `esbuild ^0.24.0`, `playwright ^1.62.1`, `typescript ^5.6.3` | `apps/studio/package.json` |
| Plugin reuse | the plugin iframe imports the studio entry whole | `apps/plugin/src/ui/entry.ts:2-11` |

## 5. TokenPress (`apps/tokenpress`)

| Fact | Source |
|---|---|
| Figma plugin: exports Variables, Text Styles, Effect Styles → DTCG JSON, as a ZIP (one file per collection/mode + `typography.json` + `shadows.json`) | `apps/tokenpress/README.md:3,107-115`; `agents.md:37` |
| Flow: Scan & Validate, then Export (download ZIP) | `README.md:84-87` |
| Options: units px/rem, dimension/letter-spacing/duration format object/string, token name case `preserve`/`kebab`/`lower`, letter-spacing units, line height, color space, namespace, `$extensions.figma`, Style Dictionary preset, collection include/exclude | `README.md:89-105` |
| Package `@prism3/tokenpress` 3.0.0; scripts `build` (esbuild `build.mjs`), `dev`, `test` (`tsx test.ts`), `test:sd`, lint/format; runtime dep `jszip` | `apps/tokenpress/package.json` |
| Manifest: `main: dist/code.js`, `ui: src/ui.html`, `networkAccess.allowedDomains: ["none"]` | `apps/tokenpress/manifest.json` |
| Relation to engine: opposite direction (Figma → DTCG); own emitter; no `@prism3/engine` import | root `CLAUDE.md` table; `README.md` (root):24 |

### tools/exporter-comparison

| Fact | Source |
|---|---|
| Reads `packages/engine/out/figma/<brand>/*.json`, adapts to Figma object shapes, installs a stub global `figma`, runs TokenPress's real `TokenExporter.exportToZip()` in memory, reads the ZIP back, diffs vs prism3's `<brand>.base` + `<brand>.<mode>.overlay` | `tools/exporter-comparison/README.md:19-30`; `run-tokenpress.ts:1-28,116`; `compare.ts:107-123` |
| Imports TokenPress **source** (`apps/tokenpress/src/plugin/exporter.ts`) under tsx, not `dist/` | `run-tokenpress.ts:36,116` |
| `compare.ts` always exits 0 (default 2 brands, `compare.ts:65`); `gate.ts` asserts types (3 arms at 0), unpaired per direction, namespace, float32 leak at 0, declared axes; `MIN_BRANDS = 3` | `gate.ts:1-60,218,330-338` |
| Figma emission brand dirs present: 4 | `ls packages/engine/out/figma` |

## 6. Emitted artifacts

Counts as committed: `out/` top level holds 32 files, `out/components/` 34, and `out/figma/<brand>/` 28 for one brand and 27 for each of the other three. That gives 175 under `out/`, plus 3 schema, 1 maintainer and 3 engine-root files, for **182**. This matches `verify.ts:512` and `ci.yml:426`.

| Family | Files | Writer (file:line) | Consumers (file:line) |
|---|---|---|---|
| Canonical DTCG tree | `out/<brand>.tokens.json` ×5. Each brand has its own root key, e.g. `<default>` → `pds3` | `emit-dtcg.ts:50` (4 brands), `cli.ts` → `emitTheme` (`<std>`, `regen.ts:37`) | `visualize.ts:62`; studio chrome build `apps/studio/chrome/tokens.mjs:41`; `apps/studio/test-export-parity.mjs:100` (brand discovery); `token-contract.ts` builds live, not from file; payload kind `canonical-tree` (`schema/payload-manifest.json`) |
| Conforming base | `out/<brand>.base.tokens.json` ×5, no `$extensions` (`emit-dtcg.ts:53-58`) | `emit-dtcg.ts:58` via `buildOverlaySet` (`emit-dtcg-overlay.ts:291`) | Style Dictionary: `packages/tokens/sd.platforms.mjs:44-45`, `sd.consumer.mjs:46`, `check-consumability.mjs:261`; `apps/studio/test-export-parity.mjs:28`; `tools/exporter-comparison/compare.ts`; gates `lint-consumer-build`, `lint-description-claims`, `lint-figma-destination`. Studio export rebuilds the same set live with `buildOverlaySet` (`apps/studio/src/export-settings.ts:48,578`) |
| Overlays | `out/<brand>.{dark,hc-dark,hc-light}.overlay.tokens.json` ×15. Theme axis only (`emit-dtcg-overlay.ts:38`) | `emit-dtcg.ts:60` | Same SD files (`sd.platforms.mjs:45`, `sd.consumer.mjs:47`, `check-consumability.mjs:270`); the studio chrome dark overlay (`apps/studio/chrome/tokens.mjs:42`, `chrome/esbuild-plugin.mjs:304`); `apps/plugin/test-start-screen.mjs`; gates `lint-overlay-completeness`, `lint-overlay-provenance` |
| Agent metadata | `out/<brand>.ai.json` ×5 | `emit-dtcg.ts:52` (`buildAiMetadata`, `ai-metadata.ts`) | Skills `skills/prism3-consume/SKILL.md:12,36`, `skills/prism3-theme/SKILL.md:163`; MCP serves the same content live (`mcp.ts:552`, as `ai-metadata.json`); `apps/studio/chrome/glyphs.mjs:40`; prose gates |
| Fidelity report | `out/<std>-fidelity-report.md` ×1 | `cli.ts:126-128` (`--fidelity`, `fidelity.ts`) | No code reader besides regen and the payload manifest (`ours`). Grep finds only `cli.ts` |
| Preview page | `out/tokens.html` | `visualize.ts:599` | `test.ts:3196` (asserts no type specimen for a non-type leaf); not shipped (`ours`) |
| Figma payloads | `out/figma/<brand>/*.json` for 4 brands. Of the three native example briefs, `<ex2>` has no Figma tree: the emission covers `<ref>`, `<default>`, `<ex1>` and `<std>` (`emit-figma.ts:280-285`). Files: `color.{light,dark,hc-light,hc-dark}`, `core.{palette,dimension,font}`, `layout.<bp>` (5 or 6), `motion`, `radius`, `space`, `size`, `icon`, `control`, `border-width`, `focus`, `opacity`, `type-sets.{desktop,mobile}`, `{text,shadow,gradient,grid}-styles` | `emit-figma.ts:290`, content from `figmaArtifacts()` (`:173-258`) | `materialise-to-figma.ts:53,153`; `tools/exporter-comparison/gate.ts:210` + `adapt-figma-emission.ts`; `apps/plugin/test-readback-parity.ts:106`; `tools/conformance-scan/state.ts:23`; `apps/tokenpress/tests/unit/opacity-percent-to-fraction.test.ts`; many lints. The plugin does NOT read these files at runtime: it builds live via `@prism3/engine/emit-figma-color` and related modules (import counts in `apps/plugin/src`). MCP `export_theme` emits the same set from `figmaArtifacts` (`mcp.ts:553-555`) |
| Component docs | `out/components/components.ai.json` + 33 `<id>.md` | `emit-component-docs.ts:272-273` | `skills/prism3-build-component/SKILL.md:111`; `apps/studio/test-chrome.mjs:7948`; gate `lint-component-docs`; prose gates |
| Maintainer record | `schema/component-maintainer.json` | `emit-component-docs.ts:274` | `lint-component-docs`, `lint-schema-classification`; drift-checked via `MAINTAINER_ARTIFACTS` (`regen.ts:81`) |
| Lever manifest | `schema/lever-manifest.json` | `emit-levers.ts:17` | Surfaces import `levers.ts` directly, not the JSON (`apps/studio/src/ui/lever-kit.ts:16`, `state/shape-input.ts:24`); the JSON is read by `apps/studio/test-lever-tips.ts`, `test-smoke.mjs`, `test-chrome.mjs`, `test.ts` |
| Preview spec | `schema/preview-spec.json` | `emit-preview.ts:16` | `test.ts`, `apps/studio/test-smoke.mjs`, `test-chrome.mjs` (surfaces import `preview.ts`, inferred from `visualize.ts:13-14`) |
| Example brands | `schema/example-brands.json` (3 ids: `<default>`, `<ex1>`, `<ex2>`) | `emit-brandinput.ts:42` | Studio boot `apps/studio/src/state/store.ts:33`. The plugin UI bundles `studio/src/entry` whole (`apps/plugin/src/ui/entry.ts:11`), so it boots from the same file. Also `tools/figma-mcp/plan.ts:30`, plugin tests |
| Glyph module | `packages/engine/icon-glyphs.ts` | `emit-icons.ts:174` | `components/icon.ts:63`, `anatomy-figma.ts:40` (and through them both bundles); `apps/plugin/mcp-paste.ts`; payload kind `icon-glyphs` |
| Modes report | `packages/engine/modes-report.md` | `emit-dtcg.ts:220` | regen only (`ours`) |
| Regression report | `packages/engine/nb-regression-report.md` | `nb-regression.ts:248` | regen only (`ours`) |
| `design.md` (output) | **Not a committed artifact.** `toDesignMd()` (`design-md.ts:284`) is the inverse serializer. The only emit path is the studio download (`apps/studio/src/main.ts:1278`, `entry.ts:153`). `examples/*.design.md` are inputs (6 files) | n/a | n/a |
| Per-brand payload skills (#668) | **No emitter exists.** No engine `.ts` outside lints and tests references SKILL output. `lint-payload-manifest.ts:8` says "When #668's emitter lands"; `docs/07-e2e-journey.md:28` says "#668, not built" | none | none |
| Icons source | `packages/engine/icons/*.svg` (45) + `LICENSE`, `NOTICE.md` | authored input | `emit-icons.ts:95` |

### `packages/engine/schema/*` (16 files): who writes each

| File | Class | Writer |
|---|---|---|
| lever-manifest, preview-spec, example-brands | emitted, regen (`regen.ts:72`) | the emitters above |
| component-maintainer | emitted, regen, maintainer-only (`regen.ts:81`) | `emit-component-docs.ts:274` |
| token-contract | baseline, `--accept` only | `token-contract.ts:414` |
| component-surface | baseline, `--accept` | `lint-component-surface.ts:523-578` |
| paint-census | baseline, `--accept` | `lint-paint.ts:969` |
| decisions-index | baseline, `--accept` | `lint-decisions-index.ts:378` |
| shape-index | baseline, `--accept` | `lint-shape-index.ts:376` |
| component-axes | baseline, `--accept` | `lint-component-renames.ts:146` |
| payload-manifest | hand-authored, deliberately not regen (`lint-payload-manifest.ts:20-33`) | none |
| theme-schema, theme-schema.example | hand-authored BrandInput contract | none (read by `mcp.ts:736`, `emit-dtcg.ts:206`, `cli.ts`) |
| ai-metadata.schema, component-docs.schema | hand-authored JSON Schemas (inferred: no writer found) | none |
| nb-measured | hand-authored measured legacy input (`$comment`) | none (read by `nb-fixture.ts`, `theme.ts`) |

## 7. Components

**Registry:** `componentDefs` in `packages/engine/components/index.ts:76-191`. It holds 33 defs from 29 def files; `button.ts` and `icon-button.ts` each export 3 defs through a factory. `typecheck-components.ts:227-238` checks that every tracked def file is registered and that every registered def comes from a tracked file.
**Status values:** the schema allows `'draft' | 'stable' | 'deprecated'` (`packages/engine/component-schema.ts:1406`, checked at `:1750`). **All 33 defs are `draft`**, and the schema comment calls that the convention (`component-schema.ts:1400-1405`). `codeOnly` is not a status flag. It is maintainer-only prose under `anatomy.codeOnly`; it goes to `schema/component-maintainer.json` and is kept out of the payload and the plugin bundle (`emit-component-docs.ts:8,18-23`).
**The `_` prefix:** an id may start with `_` to mark a "building block" (`component-schema.ts:1742`). Only `_accordion-indicator` does.
**Figma plugin build:** `buildComponents` resolves the def with `componentDefs.find` (`apps/plugin/src/main.ts:578`). It first builds any missing dependencies through `build-deps.ts:67,104`, reading `nestTarget`/`swapTarget` from the projected plans. The picker reads `catalogOf` (`apps/studio/src/state/component-catalog.ts:79-95`), which marks a def buildable when it is not `notStandalone` and its projection does not throw. The plugin computes this live (`apps/plugin/src/ui/component-catalog.ts:19`). The generated web copy (`apps/studio/src/state/component-catalog-data.ts`) shows **33 of 33 buildable**. No def currently declares `notStandalone`; `focus-ring` dropped it in #1280 (`components/focus-ring.ts:319`).
**MCP paste build:** `apps/plugin/mcp-paste.ts:338-342` `buildableDefs` uses the same rule as the picker, over the same `componentDefs` (`mcp-paste.ts:56`). Its scripts run the plugin's own executors, bundled from `apps/plugin/src/mcp-steps.ts:526-590` (`runComponentChunk`, `runComponentEmit`, `runReadbackComponents`). The CLI is `tools/figma-mcp/plan.ts:10` (`--build`). So **all 33 are covered** (inferred: same filter, same data). The engine's MCP **server** (`packages/engine/mcp.ts:236-372`) exposes `list_levers`, `theme_brand`, `score_consumption`, `theme_from_brief`, `export_theme` and `validate_brand`. It has **no component tool**.
**Not engine defs:** `_Section-header` and `_Headings` are template assets built only by the plugin (`apps/plugin/src/file-components.ts:1-9,34-35`).
**Kind column:** derived from the plan-derived `nests` in the generated catalog (inferred classification). primitive = nests nothing; composite = nests other defs; building-block = `_` id. The `unit` column shows `components` for `emitAsComponents` defs.

| id | name | kind | category | unit | members | nests (plan-derived) | plugin | MCP paste | status | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `icon` | Icon | primitive | foundations | components | 45 | — | yes | yes | draft | packages/engine/components/icon.ts:66 |
| `focus-ring` | FocusRing | primitive | foundations | variants | 2 | — | yes | yes | draft | packages/engine/components/focus-ring.ts:104 |
| `button` | Button | composite | form | variants | 576 | icon, spinner, focus-ring | yes | yes | draft | packages/engine/components/button.ts:794 |
| `button-destructive` | Button.Destructive | composite | form | variants | 576 | icon, spinner, focus-ring | yes | yes | draft | packages/engine/components/button.ts:808 |
| `button-neutral` | Button.Neutral | composite | form | variants | 576 | icon, spinner, focus-ring | yes | yes | draft | packages/engine/components/button.ts:826 |
| `icon-button` | IconButton | composite | form | variants | 216 | icon, spinner, focus-ring | yes | yes | draft | packages/engine/components/icon-button.ts:606 |
| `icon-button-destructive` | IconButton.Destructive | composite | form | variants | 216 | icon, spinner, focus-ring | yes | yes | draft | packages/engine/components/icon-button.ts:621 |
| `icon-button-neutral` | IconButton.Neutral | composite | form | variants | 216 | icon, spinner, focus-ring | yes | yes | draft | packages/engine/components/icon-button.ts:640 |
| `field-label` | FieldLabel | primitive | form | variants | 24 | — | yes | yes | draft | packages/engine/components/field-label.ts:49 |
| `field-message` | FieldMessage | composite | feedback | variants | 4 | icon | yes | yes | draft | packages/engine/components/field-message.ts:62 |
| `text-field` | TextField | composite | form | variants | 84 | field-label, icon, field-message, focus-ring | yes | yes | draft | packages/engine/components/text-field.ts:53 |
| `textarea` | Textarea | composite | form | variants | 84 | field-label, icon, field-message, focus-ring | yes | yes | draft | packages/engine/components/textarea.ts:95 |
| `checkbox-control` | Checkbox.Control | composite | form | variants | 54 | focus-ring, icon | yes | yes | draft | packages/engine/components/checkbox-control.ts:83 |
| `checkbox-row` | Checkbox.Row | composite | form | variants | 3 | checkbox-control | yes | yes | draft | packages/engine/components/checkbox-row.ts:105 |
| `checkbox-group` | Checkbox.Group | composite | form | variants | 3 | field-label, checkbox-row | yes | yes | draft | packages/engine/components/checkbox-group.ts:67 |
| `radio-control` | Radio.Control | composite | form | variants | 30 | focus-ring | yes | yes | draft | packages/engine/components/radio-control.ts:114 |
| `radio-row` | Radio.Row | composite | form | variants | 3 | radio-control | yes | yes | draft | packages/engine/components/radio-row.ts:97 |
| `radio-group` | Radio.Group | composite | form | variants | 3 | field-label, radio-row | yes | yes | draft | packages/engine/components/radio-group.ts:78 |
| `switch-control` | Switch.Control | composite | form | variants | 24 | icon, focus-ring | yes | yes | draft | packages/engine/components/switch-control.ts:133 |
| `switch-row` | Switch.Row | composite | form | variants | 2 | switch-control | yes | yes | draft | packages/engine/components/switch-row.ts:75 |
| `select` | Select | composite | form | variants | 84 | field-label, icon, field-message, focus-ring | yes | yes | draft | packages/engine/components/select.ts:128 |
| `veil` | Veil | primitive | foundations | variants | 30 | — | yes | yes | draft | packages/engine/components/veil.ts:93 |
| `image-placeholder` | ImagePlaceholder | composite | foundations | variants | 7 | icon | yes | yes | draft | packages/engine/components/image-placeholder.ts:65 |
| `spinner` | Spinner | primitive | foundations | components | 4 | — | yes | yes | draft | packages/engine/components/spinner.ts:51 |
| `badge` | Badge | primitive | foundations | variants | 20 | — | yes | yes | draft | packages/engine/components/badge.ts:91 |
| `tag` | Tag | composite | foundations | variants | 45 | icon, focus-ring | yes | yes | draft | packages/engine/components/tag.ts:102 |
| `tab` | Tab | composite | navigation | variants | 30 | icon, badge, focus-ring | yes | yes | draft | packages/engine/components/tab.ts:32 |
| `tabs` | Tabs | composite | navigation | variants | 6 | tab | yes | yes | draft | packages/engine/components/tabs.ts:23 |
| `divider` | Divider | primitive | foundations | variants | 5 | — | yes | yes | draft | packages/engine/components/divider.ts:76 |
| `_accordion-indicator` | Accordion.Indicator | building-block | navigation | variants | 12 | icon | yes | yes | draft | packages/engine/components/accordion-indicator.ts:26 |
| `accordion` | Accordion | composite | navigation | variants | 24 | _accordion-indicator, divider, focus-ring | yes | yes | draft | packages/engine/components/accordion.ts:43 |
| `list-item` | List.Item | composite | data | variants | 9 | icon | yes | yes | draft | packages/engine/components/list-item.ts:27 |
| `list` | List | composite | data | variants | 9 | list-item | yes | yes | draft | packages/engine/components/list.ts:30 |

### Planned components (from docs; GitHub issues not consulted)

| name | issue | source |
|---|---|---|
| banner, tooltip | — | docs/40-component-catalogue-mvp.md:54 (tranche 2) |
| card | — | docs/40-component-catalogue-mvp.md:55 (tranche 3) |
| link, dialog, menu | — | docs/40-component-catalogue-mvp.md:56 (tranche 4) |
| `text` / `heading` typography substrate | — | docs/40-component-catalogue-mvp.md:102 |
| `image` aspect-ratio frame | — | docs/40-component-catalogue-mvp.md:113 (`image-placeholder`, #1316, probably fills this role, inferred) |
| Accordion title-row subcomponent | #2456 | docs/progress/pending/components-2594-accordion-header-row.md:9 |
| labeled divider | (own issue, number not given) | docs/progress/pending/claude-2455-divider-v2.md:9 |

Of the 18 tranche components in docs/40 (`:53-56`), 12 are built in code under these ids: checkbox→`checkbox-*`, radio→`radio-*`, switch→`switch-*`, textarea, select, badge, tag, spinner, divider, accordion, list, tabs. Six are not built: banner, tooltip, card, link, dialog, menu. docs/42-current-decisions.md names no planned component (grep found no hits).

## 8. Shipped skills (`skills/`)

Each skill directory holds only `SKILL.md` (`ls skills/*/`).

| skill | frontmatter description (quoted, first clause) | audience | engine facts it cites | gate |
|---|---|---|---|---|
| `prism3-theme` | "Author a Prism3 brand — turn a brand brief into a `design.md` the engine compiles into a full, contrast-verified token system." (`skills/prism3-theme/SKILL.md:3-8`) | agent working with Prism3 | `packages/engine/cli.ts` (exists), the MCP tools `theme_brand`, `list_levers` and `validate_brand` (all in `mcp.ts`). Declares `documents: brandInput` with an `omits:` list (`:13-18`), which opts it into the coverage check. | lint-skills.ts checks 1-5, including coverage |
| `prism3-consume` | "Build accessible, on-brand UI from a Prism3-generated token system." (`skills/prism3-consume/SKILL.md:3-14`) | agent working with Prism3 | MCP `theme_brand` (3 mentions) and `list_levers`; token role paths | lint-skills.ts checks 1-3 and 5 |
| `prism3-rebind` | "Rebind an existing Figma design file onto Prism3: replace a legacy library's variables, styles and components with the file's local Prism3 ones…" (`skills/prism3-rebind/SKILL.md:3-12`) | agent in a brand's Figma file, through a plugin or desktop bridge | `packages/engine/levers.ts`; the never-detach rule | lint-skills.ts checks 1-3 and 5 |
| `prism3-build-component` | "Author a NEW Prism3 component definition — one `ComponentDef` the engine projects into every surface (Figma shell, Web Components / React, Storybook, docs, `.ai.json`, Code Connect)." (`skills/prism3-build-component/SKILL.md:3-12`) | agent working on the engine | `component-schema.ts`, `components/index.ts`, `regen.ts`, `test.ts`, `file-taxonomy.ts` `TAXONOMY` (exists, `apps/plugin/src/file-taxonomy.ts:69`), `out/components/**` (`:111,432,481`), and "every def is `draft`" (`:136`, which matches the schema) | lint-skills.ts checks 1-3 and 5 |

**What `lint-skills.ts` checks** (`packages/engine/lint-skills.ts:21-25`):
1-3. Every referenced name resolves: token paths, snake_case MCP tool and `.ai.json` names (`TOOL_NAMES` from `toolDefs`, `:85`), and every `*.ts` path (`:322-324`).
4. Opt-in BrandInput coverage (`:344`).
5. ALL-CAPS identifier placement.

It scans every `skills/*/SKILL.md` (`:546`). The gate states its own limit: it cannot see prose that is stale while every name in it still resolves (`:30-34`). Skills are also scanned by `lint-us-english.ts:301-304,381` and `lint-voice.ts:402-403,513`.

**Per-brand payload skills (#668) are NOT emitted by any code.** No emitter turned up in `packages/engine` or `apps` (grep for payload-skill and emit-skill names, and `#668` in `*.ts`, finds only a comment at `lint-payload-manifest.ts:8`: "When #668's emitter lands"). `schema/payload-manifest.json:59` calls `out/components/*.md` "the seed for the per-brand payload skills (#668)". `docs/07-e2e-journey.md:28` says: "the per-brand payload instructions an ejected repo carries are #668, not built".

## 9. Data flow (edges for a diagram)

Each edge reads `from → to : what travels`, with its source. Edges are grouped by the surface whose code was read; some appear twice from both ends.

### 9.1 Engine and artifacts

- `packages/engine/examples/*.design.md → emit-dtcg.ts : BrandInput for 3 native brands (emit-dtcg.ts:149-151)`
- `nb-fixture.ts / schema/nb-measured.json → emit-dtcg.ts : the <ref> theme via nbTheme() (emit-dtcg.ts:152)`
- `emit-dtcg.ts → out/<brand>.{tokens,ai,base,<mode>.overlay}.json : trees + metadata (emit-dtcg.ts:50-60)`
- `packages/engine/examples/<std>.design.md → cli.ts → out/ : standard-dialect brand + fidelity report (regen.ts:37, cli.ts:126)`
- `out/<brand>.tokens.json → visualize.ts → out/tokens.html (visualize.ts:62,599)`
- `examples + nbTheme → emit-figma.ts → out/figma/<brand>/ (emit-figma.ts:262-290)`
- `out/figma/<brand>/ → materialise-to-figma.ts → stdout plugin JS (materialise-to-figma.ts:53,943)`
- `out/figma/<brand>/ → tools/exporter-comparison/gate.ts : TokenPress exporter agreement (gate.ts:210)`
- `out/figma/<brand>/ → apps/plugin/test-readback-parity.ts : expected DTCG (test-readback-parity.ts:106)`
- `out/<brand>.base + overlay → packages/tokens (Style Dictionary) : consumability (sd.platforms.mjs:44-45, check-consumability.mjs:261-270)`
- `out/<default>.tokens.json + dark overlay → apps/studio/chrome/tokens.mjs → studio/plugin chrome CSS at build (tokens.mjs:41-42, esbuild-plugin.mjs:304)`
- `levers.ts → emit-levers.ts → schema/lever-manifest.json (emit-levers.ts:17)`; `levers.ts → studio (lever-kit.ts:16) and MCP list_levers (mcp.ts:236)`
- `preview.ts → emit-preview.ts → schema/preview-spec.json (emit-preview.ts:16)`
- `examples → emit-brandinput.ts → schema/example-brands.json → apps/studio/src/state/store.ts:33 → plugin UI (apps/plugin/src/ui/entry.ts:11)`
- `icons/*.svg + icon-set.ts → emit-icons.ts → icon-glyphs.ts → components/icon.ts:63, anatomy-figma.ts:40 → plugin bundle`
- `components/* defs → emit-component-docs.ts → out/components/** + schema/component-maintainer.json (:272-274)`
- `schema/theme-schema.json → mcp.ts (tool input schema, :736) / emit-dtcg validateBrandInput`
- `MCP export_theme → client outDir : tokens.json, ai-metadata.json, figma/* (mcp.ts:551-555)`
- `reference/** → nb-regression.ts → nb-regression-report.md (nb-regression.ts:23,178-179,248)`
- `packages/engine/changes/*.md + docs/progress/pending/*.md → fold.ts → version.ts, packages/engine/CHANGELOG.md, docs/00-progress.md, stamp files, then regen (fold.ts:344-353)`
- `corpus (4 brands + 6 synthetic) → token-contract.ts --check ↔ schema/token-contract.json (token-contract.ts:226-235,294)`
- `regen.ts --check → verify.ts / ci.yml : "182 committed artifacts" (verify.ts:512, ci.yml:423-427)`
- `studio BrandInput → toDesignMd → user download <slug>.design.md (apps/studio/src/main.ts:1278)`

### 9.2 MCP server and the paste path

| from → to | what travels | cite |
|---|---|---|
| `schema/theme-schema.json` → mcp.ts | brand schema (read once at start) | mcp.ts:735 |
| theme-schema.json → `tools/list` theme_brand.inputSchema.brand | `compactSchema` (first-sentence descriptions) | mcp.ts:272 |
| theme-schema.json → emit-dtcg `validateBrandInput` | its own separate read of the same schema | emit-dtcg.ts:132-134 |
| levers.ts `buildLeverManifest` → list_levers.levers | lever manifest | mcp.ts:598 |
| schema ∖ manifest keys → list_levers.nonLeverFields | non-lever fields + enums | mcp.ts:118-134, 601 |
| version.ts `ENGINE_VERSION` → serverInfo.version | version string | mcp.ts:53,57 |
| tool args → theme.ts `brandTheme` → emit-dtcg `buildTree` | BrandInput → Theme → {tree, modes, stats} | mcp.ts:429-432 |
| modes[].roles → contracts | ratio vs min per role | mcp.ts:474-477 |
| theme+tree → ai-metadata.ts `buildAiMetadata` | `.ai.json` | mcp.ts:489, 552 |
| theme → emit-figma `figmaArtifacts` → disk `<outDir>/figma/` | Figma collection files | mcp.ts:555 |
| brief → design-md `parseDesignMd` → themePayload | BrandInput (`derivedBrandInput`) | mcp.ts:647-656 |
| refs/pairs → eval.ts `scoreConsumption`/`scoreContractCompliance` | scores | mcp.ts:635-638 |
| mcp-served.ts → mcp.ts (subprocess) | one `tools/list` → served strings → lint-us-english / lint-voice | mcp-served.ts:38-57 |
| plan.ts → mcp-paste.ts → (apply-theme `themePlans`, anatomy-figma, componentDefs) → `NNN-*.js` | packed plan slices + esbuild bundle of mcp-steps.ts | plan.ts:63-66; mcp-paste.ts:43-62,130 |
| agent → Figma `use_figma` → result JSON → `results/NNN.json` → report.ts | StepReport | README.md:50-52; report.ts:40-47 |
| report.ts `--ledger-out` → plan.ts `--ledger` → scripts | shared-plugin-data ledger | plan.ts:59-60; mcp-steps.ts:90-101 |

### 9.3 Figma plugin

- studio knobs → main thread : `BrandInput` in `apply-theme` / `prune` (apps/studio/src/write-adapter.ts:366,391)
- main thread → engine : `BrandInput` → `brandTheme` → write plans (apps/plugin/src/apply-theme.ts:36-50)
- main thread → `figma.variables` and styles : plans via the executors (apps/plugin/src/apply-theme.ts:85-108)
- main thread → `figma.root` shared data `prism3/brandInput` : the applied `BrandInput` (apps/plugin/src/apply-theme.ts:111; apps/plugin/src/persist-figma.ts:35)
- `figma.root` `prism3/brandInput` → UI : `restore-input` on boot (apps/plugin/src/main.ts:1149-1157)
- `figma.root` `prism3/brandInput` → build, update, style guide : brand levers and the contrast contract (apps/plugin/src/main.ts:616,891,1043)
- `figma.root` `prism3/brandInput` → pre-flight : legacy ownership presumption (apps/plugin/src/preflight.ts:154-156)
- `figma.variables` → UI : `seed-info` contract verdict (apps/plugin/src/main.ts:1106-1130)
- `figma.listAvailableFontsAsync` → UI : `font-list` (apps/plugin/src/main.ts:1170-1183)
- engine `componentDefs` → main thread → canvas : the projected `AnatomyPlan[]` (apps/plugin/src/main.ts:628-632)
- executor → UI : `component-progress` per chunk (apps/plugin/src/main.ts:690-697)
- agent (`use_figma`) → `figma.root` `prism3agent/inbox` : command envelopes (apps/plugin/src/agent-protocol.ts:305)
- main thread → `prism3agent/result:<id>`, `link` : results and link state (apps/plugin/src/agent-link.ts:62-73,116-122)
- bridge server → iframe (WebSocket) → main thread : `agent-command` (apps/plugin/src/agent-bridge-relay.ts:72-80)
- main thread → iframe → bridge server : `agent-result`, `agent-progress`, `agent-log`, `agent-link-state` (apps/plugin/src/agent-bridge-relay.ts:104-117; apps/plugin/src/main.ts:1230-1233)
- dispatcher → panel : every terminal verdict forwarded (prune preview as `pillOnly`) (apps/plugin/src/agent-dispatch.ts:259-260; apps/plugin/src/main.ts:1246)
- UI → `clientStorage` (via main) : window size, theme pref, Activity height (apps/plugin/src/main.ts:1290-1297,1352)
- build.mjs → both bundles : `PRISM3_BUILD` identity, `PRISM3_DEV`, `PRISM3_HOST='figma'` (UI) (apps/plugin/build.mjs:211,243)

### 9.4 Web studio and TokenPress

| from → to | what travels | source |
|---|---|---|
| `packages/engine/schema/example-brands.json` → studio store | 3 example `BrandInput`s | `apps/studio/src/state/store.ts:33,53` |
| `localStorage[prism3:brandInput]` → boot | stored `BrandInput` (validated by resolve) | `apps/studio/src/entry.ts:58-70` |
| store `brandState` → engine `brandTheme` → `resolvePreview` | `BrandInput` → `Theme` → `ResolvedPreview` (`rp`) | `apps/studio/src/state/store.ts:169-181` |
| store rebuild → `localStorage[prism3:brandInput]` | last-good `BrandInput` (web only) | `apps/studio/src/state/store.ts:140-154`; `apps/studio/src/entry.ts:82` |
| `theme` → `buildTree(theme).tree` → `exportDtcg` → `buildOverlaySet` | canonical DTCG tree → base + overlays → shaped files → Blob downloads | `apps/studio/src/main.ts:1291-1297`; `apps/studio/src/export-settings.ts:577-586` |
| `briefInput()` → `toDesignMd` → download | `BrandInput` → `<slug>.design.md` | `apps/studio/src/main.ts:1275-1278` |
| pasted/uploaded design.md → `validateDesignMd` → `stageLoad` | text → `BrandInput` (engine acceptance is the validation) | `apps/studio/src/state/start-input.ts:162-184`; `apps/studio/src/main.ts:1318` |
| `packages/engine/components` → `gen-component-catalog.ts` → `apps/studio/src/state/component-catalog-data.ts` | component catalog as data (web) | `apps/studio/gen-component-catalog.ts:1-24` |
| studio UI → plugin main thread (plugin host only) | `UiToMain` messages (`apply-theme`, components, file-setup, style-guide, prune, resize) | `apps/studio/src/write-adapter.ts:75-155` |
| plugin main thread → studio UI | `MainToUi`, validated into `HostMessage` | `apps/studio/src/write-adapter.ts:24-71,349` |
| `packages/engine/out/prism3.tokens.json` + dark overlay → `chrome/esbuild-plugin.mjs` | default theme → `--p3-*` chrome CSS variables | `apps/studio/README.md:210-213` (doc; plugin not read) (inferred) |
| `packages/engine/out/figma/<brand>/` → exporter-comparison → TokenPress `TokenExporter` | Figma emission → adapted Figma objects → ZIP → diff vs base/overlay | `tools/exporter-comparison/README.md:21-30` |

### 9.5 Components and skills

| from → to | what travels | where |
|---|---|---|
| `components/*.ts` → `componentDefs` | 33 ComponentDef objects | components/index.ts:76-191 |
| `componentDefs` → `out/components/<id>.md` + `components.ai.json` | shipped def fields (no codeOnly or notes) | emit-component-docs.ts:272-273, run by regen.ts:45 |
| `componentDefs` → `schema/component-maintainer.json` | `codeOnly` + `notes.*` (not payload) | emit-component-docs.ts:274 |
| `componentDefs` → `figmaAnatomySet` → plugin executor | anatomy plans → Figma component sets | apps/plugin/src/main.ts:65,578,716; write-components.ts:57 |
| `componentDefs` → plugin picker catalog | id, name, category, summary, buildable, members, nests | apps/plugin/src/ui/component-catalog.ts:15-19 |
| `componentDefs` → web catalog data (generated) | the same catalog, as data | apps/studio/gen-component-catalog.ts → apps/studio/src/state/component-catalog-data.ts:1-11 |
| def `summary` → Figma component-set description | one-line summary | main.ts:924; write-components.ts:147 |
| `componentDefs` → MCP paste scripts (`use_figma`) | build order + plan chunks + bundled plugin executors | apps/plugin/mcp-paste.ts:56,338-366; src/mcp-steps.ts:526-590; tools/figma-mcp/plan.ts:27 |
| `componentDefs` → `schema/component-surface.json` (gate) | per-def member count and surface | lint-component-surface.ts:46,201,327 |
| `out/components/*.md` → per-brand payload skills | planned seed only, not built | schema/payload-manifest.json:59 |
| `mcp.ts` `toolDefs` → `lint-skills.ts` | MCP tool names for skill reference checks | lint-skills.ts:42,85 |
| `skills/**/SKILL.md` → lint-us-english / lint-voice | shipped prose | lint-us-english.ts:304; lint-voice.ts:403 |

## 10. Where existing docs contradict the code

Listed, not fixed. Each row quotes the doc and the code fact it disagrees with. Numbering restarts per source.

### 10.1 Engine README, root README, docs/07 (engine and artifacts)

#### `packages/engine/README.md`

| # | Doc says (file:line) | Code says (file:line) |
|---|---|---|
| 1 | "regenerate EVERY committed artifact (out/** + 3 emitted schema/ files + 2 engine-root reports)" (`README.md:29`) | 3 engine-root artifacts incl. `icon-glyphs.ts` (`regen.ts:53`), plus a 4th schema file `component-maintainer.json` (`regen.ts:81`) |
| 2 | emit-dtcg emits three named brands (`:32`); "the <ex1> + <ex2> themes are compiled" (`:123`) | 4 themes, incl. `<default>` (`emit-dtcg.ts:149-152`) |
| 3 | emit-figma: "the Figma import artifact (color axis…)" (`:44`) | emits every axis: colour, core, dims, layout, motion, type-sets, text/shadow/gradient/grid styles (`emit-figma.ts:173-258`) |
| 4 | regen "runs all eight" (`:48`), "all eight steps" (`:137`) | 10 STEPS (`regen.ts:33-46`). The code's own comment "The eight emitters" (`regen.ts:30`) is also stale |
| 5 | "Covers **88** artifacts" / "all 88 are gated" (`:137-138`) | 182 (`verify.ts:512`, `ci.yml:426`) |
| 6 | Generated outputs list: `out/{<four brand ids>}.tokens.json` / `.ai.json` (`:138`) | 5 brands incl. `<default>`; also base and overlay files ×20, `out/components/**`, `icon-glyphs.ts`, `component-maintainer.json` are absent from the list (`emit-dtcg.ts:50-60`, `emit-component-docs.ts:272-274`) |
| 7 | "`schema/token-contract.json` pins the 485 paths" (`:62`) | the baseline holds 588 `guaranteed` paths (computed from `schema/token-contract.json` key `guaranteed`) |
| 8 | levers.ts: "38 levers, 20 `advanced`" (`:128`) | 50 levers, 25 advanced (computed from `schema/lever-manifest.json`) |
| 9 | test.ts "(1920 checks)" (`:135`) | not run here; `typecheck-components.ts:19` already cites "test.ts 2040/0" (inferred stale) |
| 10 | examples: three named briefs (`:136`) | 6 briefs incl. `<default>` (the boot default, `emit-brandinput.ts:28`) and the `<ref>` redesign (`lint-lever-sweep.ts:110`) |
| 11 | "`out/<ref>.tokens.json` … primitives `<ref-root>.palette.<name>.<step>`" (`:244`); `<ex1>` "the product dialect (`prism.*` …)" and alias `{prism.palette.accent.500}` (`:247-252`) | primitives live under `<root>.core.palette.*`; `<ex1>`'s root is not `prism` and the alias is `{<root>.core.palette.accent.500}` (checked in `out/<ex1>.tokens.json`) |

#### `README.md` (root)

No contradiction found. The two rows checked are in §10.6.

#### `docs/07-e2e-journey.md`

| # | Doc says | Code says |
|---|---|---|
| 14 | "Only two things touch `node:fs`: the emit layer … and two legacy-regression fixture loaders" (`docs/07:85-86`) | 16 non-lint, non-test engine files import `node:fs` (cli, emit-*, materialise-to-figma, mcp, nb-fixture, nb-regression, regen, token-contract, typecheck-components, visualize), 52 counting lints and tests (`grep "from 'node:fs'"`) |
| 15 | "`emit-dtcg.ts` … compiles the two example briefs" (`docs/07:157-158`) | three briefs (`emit-dtcg.ts:149-151`) |
| 16 | cli.ts reuses "emit-dtcg + ai-metadata + optional `visualize`" (`docs/07:204`) | cli.ts never calls visualize; it imports only theme, design-md, standard-design-md, fidelity, emit-dtcg (`cli.ts:29-35`) |
| 17 | `tsx cli.ts <design.md> [--out]` (`docs/07:156`) | also `--fidelity`, `-o`, `--help` (`cli.ts:78-87`) (omission) |

#### Other drift found while reading (outside the three docs)

- `CLAUDE.md` (skills row): "Per-brand *payload* skills … are emitted by the engine (#668)". No emitter exists (`lint-payload-manifest.ts:8`; `docs/07:28` "not built").
- `packages/engine/package.json` "//": "Version tracks ENGINE_VERSION in version.ts", but `"version": "0.5.0"` vs `ENGINE_VERSION = '0.236.0'` (`version.ts:4899`).
- `cli.ts --help` says `--out` holds "<id>.tokens.json + <id>.ai.json" (`cli.ts:88`), and the run log prints only those two (`cli.ts:57-58`). `emitTheme` also writes the base file and 3 overlays (`emit-dtcg.ts:58-60`).
- `emit-figma.ts:48-50` header: "LAYOUT — one `layout` collection with FIVE breakpoint modes (sm…2xl)". One committed brand emits a sixth, `layout.xs.json` (`out/figma/<brand>/` listing).
- `token-contract.ts:33-34` header: "every one of the 485 survives". The baseline now holds 588 guaranteed paths.

### 10.2 MCP server

| # | Doc says (file:line) | Code says (file:line) |
|---|---|---|
| 1 | skills/prism3-consume/SKILL.md:178: "Call `list_levers` to learn the knobs and `theme_brand` to get the tree + `.ai.json` for the brand" | theme_brand returns neither by default. Both are opt-in via `include` (default `['notes']`): mcp.ts:267, 403, 488-489 |
| 2 | skills/prism3-theme/SKILL.md:163-164: "`theme_brand` compiles a `BrandInput` and returns the tree + `.ai.json` + the contract results" | Same as #1. The tree and `.ai.json` are opt-in (mcp.ts:274, 486-489) |
| 3 | skills/prism3-theme/SKILL.md:164-165: "`validate_brand` checks an input against the schema without emitting" | It also runs `brandTheme`+`buildTree` and reports engine refusals that the schema accepts (mcp.ts:609-622). Incomplete rather than false |
| 4 | packages/engine/README.md:99: "`validate_brand` \| Checks a brand input against the schema without generating anything." | Same as #3. It builds the full tree internally (`buildTree(brandTheme(args))`, mcp.ts:620) and reports engine refusals beyond the schema |
| 5 | docs/18-plugin-and-host-architecture.md:148: Control UI row, Figma MCP column: "tool schema derived from the manifest" | theme_brand's input schema comes from `theme-schema.json` via `compactSchema` (mcp.ts:272). The manifest is returned as data by list_levers (mcp.ts:598). mcp.ts:107-117 states the manifest is NOT the API contract |
| 6 | docs/07-e2e-journey.md:56 (diagram): "MCP server exposes tokens + components + Code Connect" | No component or Code Connect tool exists. The 6 tools are list_levers, theme_brand, score_consumption, theme_from_brief, export_theme, validate_brand (mcp.ts:234-383). Possibly a target-state diagram (inferred) |
| 7 | packages/engine/README.md:111: "It doesn't write to Figma. That goes through the Figma plugin's agent link (`apps/plugin/README.md`)." | True of mcp.ts. But a second Figma write route exists with the plugin closed: `tools/figma-mcp/plan.ts` scripts for `use_figma` (tools/figma-mcp/README.md:1-27). "That goes through the agent link" omits it |
| 8 | Internal: theme_brand description: "roughly 890,000 and 590,000 characters" (mcp.ts:267) | The same result's `hint` says "tokens ~850KB, aiMetadata ~500KB" (mcp.ts:493). The comment at mcp.ts:395-397 records the re-measurement to ~890k/~590k |
| 9 | Internal comment, mcp.ts:231-232: "roughly 23,000 tokens to discover three tools" | 6 tools now (mcp.ts:234-383). Historical comment |

Checked with no MCP contradiction found: README.md (root; line 64 only mentions the suite), docs/43-agent-instruction-surface.md (no MCP tool claims), skills/prism3-rebind/SKILL.md and skills/prism3-build-component/SKILL.md (no MCP mentions), docs/07:29 and :282 ("6 tools, CI-gated by `mcp-test.ts`", which is correct), packages/engine/README.md:76-77, 84-109 (protocols, launch, ready line, export_theme cwd and refusals: consistent).

### 10.3 Figma plugin

| # | Doc claim (file:line) | Code fact (file:line) |
|---|---|---|
| 1 | "`src/bridge-main.ts` / `src/bridge-ui.ts` are thin typed wrappers" (apps/plugin/README.md:25) | No `bridge-ui.ts` exists; the UI posts via `parent.postMessage` in `apps/studio/src/write-adapter.ts` and `apps/plugin/src/ui/entry.ts:25` (`ls apps/plugin/src`) |
| 2 | ✅ placeholder UI round-trip "`ui-ready` → `main-ready`; button `ping` → `main-pong`" (apps/plugin/README.md:36-37) | No `main-ready`, `ping` or `main-pong` in either union (apps/plugin/src/messages.ts:30-119,229-423) |
| 3 | ✅ "`read-theme` / `read-result`; a 'Read current file' button" (apps/plugin/README.md:62) | No such messages; the read-back runs on `ui-ready` and answers `seed-info` (apps/plugin/src/main.ts:1280-1282; apps/plugin/src/messages.ts:356) |
| 4 | ✅ "The theme is the bundled `<brand>` fixture … A UI button fires `apply-theme`" (apps/plugin/README.md:47-49) | `apply-theme` carries the live `BrandInput` from the knobs (apps/plugin/src/messages.ts:33-36; apps/plugin/src/apply-theme.ts:57-58) |
| 5 | Taxonomy diagram lists Components pages Buttons … Veil only, and "all 23 map" (apps/plugin/README.md:198-204,232) | The taxonomy also has Badge, Tag, Tabs, Divider, Accordion, List, and maps 33 def ids (apps/plugin/src/file-taxonomy.ts:86-111,120-126) |
| 6 | File Components "holds _Section-header, _Headings, _Label, _inverse-backdrop" (apps/plugin/README.md:210) | File setup also builds `_style-guide-swatches`, `_style-guide-text-cells` and `_style-guide-spacing-cells` there (apps/plugin/src/main.ts:1017; apps/plugin/src/style-guide-cells.ts:26-28) |
| 7 | "Not yet wired: a UI trigger for `file-setup` (the shared-UI button) is a follow-up" (apps/plugin/README.md:282-283) | The panel's Set up file posts it (apps/studio/src/main.ts:1713-1718,1762; apps/studio/src/write-adapter.ts:377-378) |
| 8 | "the **Agent: Off** chip in the top bar opens a small popover with the switch" (apps/plugin/README.md:308-309) | "the chip and the popover are gone"; an "Agent" toggle tile; the status lives in the Activity drawer (apps/plugin/src/agent-link-ui.ts:4-12,100-127) |
| 9 | "the seven commands (`status`, … `readback`)" (apps/plugin/README.md:314-315) | Ten: plus `update-components`, `capture-baseline`, `adopt-members`; and `run-code` in a dev build (apps/plugin/src/agent-protocol.ts:41,45) |
| 10 | `build.mjs` "stamps `<ISO seconds> <absolute source tree>`"; console reads "Built from /private/tmp/…"; "stamped as the resolved realpath" (apps/plugin/README.md:404,409-411,424-426) | The stamp is `<ISO seconds> tree-<8 hex>`, a SHA-256 of the path, and the build fails if any absolute path reaches a bundle (apps/plugin/build.mjs:113-117,138-157) |
| 11 | Main thread: `setTimeout`/`setInterval` ❌ (docs/18-plugin-and-host-architecture.md:22) | The main thread schedules with `setTimeout` (agent-link poll, `breathe`) (apps/plugin/src/main.ts:903,1270-1271) |
| 12 | The main thread "receives the resolved tree over postMessage" (docs/18-plugin-and-host-architecture.md:36-37); the UI "computes a resolved token model, calls apply(model)" (docs/22-plugin-plan.md:20,27) | The UI sends `BrandInput`; the main thread rebuilds every plan itself (apps/plugin/src/messages.ts:33-36; apps/plugin/src/apply-theme.ts:36-58; apps/plugin/src/main.ts:372-378) |
| 13 | "The in-place Update does not see reactions … Reactions are not in the as-built fingerprint" (docs/18-plugin-and-host-architecture.md:97-99) | The as-built record includes reactions (apps/plugin/src/member-baseline.ts:38), and the same doc says so at docs/18-plugin-and-host-architecture.md:105-107 |
| 14 | Component tier: "**Not wired to a trigger yet**" (docs/22-plugin-plan.md:69) | `build-components` is a UI message and the Components page's Build posts it (apps/plugin/src/messages.ts:63; apps/studio/src/main.ts:1725-1731) |
| 15 | Persist the `BrandInput` "on every apply" (docs/22-plugin-plan.md:65) | Only when the pre-flight passes: a refused apply writes nothing, the blob included (apps/plugin/src/preflight.ts:208-216; apps/plugin/src/apply-theme.ts:71-111) |
| 16 | "duplicate Prism2 file → theming plugin applies engine output to live components"; "plugin themes it in place" (docs/07-e2e-journey.md:46,67) | The plugin builds its own component sets from engine defs, and the pre-flight refuses same-named collections and styles it did not create (apps/plugin/src/main.ts:568-606; apps/plugin/src/preflight.ts:169-171,197-198). Applying to a duplicated non-Prism3 file is refused on conflict (inferred: depends on that file's names) |
| 17 | "Style-guide generator (Figma) … exists; **separate** project"; "The three Figma plugins are confirmed **separate** codebases" (docs/07-e2e-journey.md:327,330) | The plugin has its own style-guide action (apps/plugin/src/messages.ts:78; apps/plugin/src/main.ts:1054-1085) |
| 18 | `tools/figma-mcp/agent-link.ts:13-14`, the header comment: "Commands: status · apply-theme {input} · build-components {def?} · file-setup · style-guide {…} · prune {input, confirm} · readback" (7) | The CLI imports `AGENT_COMMANDS` (`tools/figma-mcp/agent-link.ts:21`), 10 commands (`apps/plugin/src/agent-protocol.ts:41`), and sends any of them (`tools/figma-mcp/agent-link.ts:59,62`). The comment omits `update-components`, `capture-baseline` and `adopt-members` |

No contradiction found in root README.md (its plugin line, README.md:23, matches the code).

### 10.4 Web studio and TokenPress

| # | Doc (file:line) says | Code fact (file:line) |
|---|---|---|
| 1 | `apps/studio/README.md:15-36`: "Shell — a four-stage build order" (Brand primitives / Semantic colours / Typography / Form factor) | 7 tabs, 9 places: Brand, Color (Palettes, Surfaces & fills, Interactive), Type, Shape, Depth & motion, Layout, Components (`apps/studio/src/shell/pages.ts:123-341`) |
| 2 | `apps/studio/README.md:29-32,129-130`: preview renders "on every lever stage (2–4)"; mode selector "lives with the preview" | each page has its own preview module and one home view (`apps/studio/src/shell/frame.ts:100-110`; `pages.ts:94-97`); mode control is in the preview header on every page (`apps/studio/src/shell/preview.ts:5-8`) |
| 3 | `apps/studio/README.md:7,12-13`: knobs come "from the lever manifest"; a lever added in the core "appears here … without touching either UI" | studio groups levers by hand-placed `DOMAINS` rows; a manifest lever without a home row fails `test-pages.ts` (`apps/studio/test-pages.ts:7-13`); `leverGroups` is unused in studio (grep) |
| 4 | `apps/studio/README.md:41`: "`npm install` … or from web/" | no `web/` dir; studio is `apps/studio` (`ls`) |
| 5 | `apps/studio/README.md:48`: "Imports reach the engine by relative path (`../../packages/engine/…`)"; `:207` "`src/main.ts` imports `../../packages/engine/*`" | imports are by name `@prism3/engine/...` (`apps/studio/src/main.ts:22-27`; `apps/studio/src/state/store.ts:29-33`) |
| 6 | `apps/studio/README.md:131-132`: "Next: promote the engine to a named `@prism3/engine` workspace package" | already done (`packages/engine/package.json:8` `exports`; `apps/studio/src/main.ts:22`) |
| 7 | `apps/studio/README.md:79-80`: "the `'legacy'` kind remains in the type, but no page uses it" | `status` type is `'new'` only (`apps/studio/src/shell/pages.ts:118`) |
| 8 | `apps/studio/README.md:87-88`: Brand and Palettes "stay editable in every mode" | Palettes `pinsLight`: always shows Light and the mode control is disabled while it is up (`apps/studio/src/shell/frame.ts:97-102`) |
| 9 | `apps/studio/README.md:115-123`: brand selector menu holds New brand ("minimal known-good starter"), Name + Namespace fields, Modes toggles | menu holds examples, "+ New brand" (reopens the start window), "↑ Import design.md…" (`apps/studio/src/shell/bar.ts:288`; `apps/studio/src/main.ts:1467`); Name/Namespace/Modes are the Brand tab (`pages.ts:127-129`; `apps/studio/src/domains/brand.ts:4-6`) |
| 10 | `apps/studio/README.md:124`: Export is "from the menu" | Export is its own top-bar tile + modal dialog (`apps/studio/src/shell/bar.ts:157-166,380-445`) |
| 11 | `apps/studio/README.md:111`: neutral "Derive⇄Pin" toggle | Neutrals has three sources: Follow primary, Custom tint, Pinned (`apps/studio/src/domains/color-palettes.ts:5-6`) |
| 12 | `apps/studio/README.md:144`: "The rail's foot carries `engine <version> · <commit>`" | no rail; the build stamp is at the foot of the Inspect menu (`apps/studio/src/shell/preview.ts:243-251`) |
| 13 | `apps/studio/README.md:181`: uncertainty includes "a shallow clone with no `HEAD^`" | diff base is `VERCEL_GIT_PREVIOUS_SHA`, explicitly "Not `HEAD^`" (`apps/studio/vercel-ignore.sh:86-94`) |
| 14 | `apps/studio/README.md:188-191`: "Only 13 of the engine's 44 `.ts` files … names the other 31 as exclusions" | script comment says 26 of 52 (`vercel-ignore.sh:20`); `EXCLUDED` lists 26 (`vercel-ignore.sh:53-80`); `packages/engine/*.ts` count is 107 (`ls`) |
| 15 | `README.md:55` (root): studio README has "what each stage of the shell does" | no stages; tabs/pages (`apps/studio/src/shell/pages.ts:123`) |
| 16 | `docs/23-…:46-75` (§2) target IA: Palettes · Surfaces/fills · Interactive · Typography · Elevation · Size & radius · Layout · Motion · Preview · Output | built IA: Brand · Color(3) · Type · Shape · Depth & motion · Layout · Components; no Preview tab (`pages.ts:123-341`) |
| 17 | `docs/23-…:65-69,232-235` (§2, §7): Preview is a rail leaf with sub-views UI preview / Contrast contracts / Style guide / Token list | no rail or Preview tab; Contrast, Tokens, Decisions log are Inspect views over any page; Style guide is Brand's home view (`pages.ts:95-99,125`) |
| 18 | `docs/23-…:221-226` (§7): header tier 2 is a persistent mode-selector strip with "⚙ Edit modes" | mode control is a radio group in the preview header (`apps/studio/src/shell/preview.ts:5-8`); modes are edited on Brand tab (`pages.ts:129`) |
| 19 | `docs/23-…:222-223` (§7): quick Export "(design.md / tokens.json)" | tokens export is base + per-mode overlays; single-file `tokens.json` is never written (`apps/studio/src/export-settings.ts:527-533`; `apps/studio/src/main.ts:1288-1290`) |
| 20 | `docs/23-…:271-276` (§8): extracted spine = `knob`/`knobBody`/`optionEl`, `renderScreen`, `NAV` + `pageOfLever` | none of these exist in `apps/studio/src/` (grep); IA data is `DOMAINS` (`pages.ts:123`), controls are `apps/studio/src/ui/lever-kit.ts` |
| 21 | `docs/23-…:311-313,335-342` (§9): Components is a plugin-only rail leaf; `railNav()`/`isFirstView()`, a `Pages` menu | Components is a tab on both hosts — read-only list on web, Build button in plugin (`pages.ts:320-325`); no `railNav`/`isFirstView` (grep); Pages menu removed in H12 (`apps/studio/src/shell/bar.ts:19-20`) |
| 22 | `docs/23-…:194-197` (§6): Output / Style guides "still deferred" | Build style guides page exists, plugin only, from the Figma menu (`apps/studio/src/shell/style-guides.ts:1-5`; `apps/studio/src/main.ts:1785`) |
| 23 | `docs/23-…:187-188` (§5 step 5): dashboard light/dark "deferred" | chrome theme menu shipped: Light/Dark/System on web (`apps/studio/src/shell/theme.ts:5-7,25-29`) |
| 24 | `docs/07-e2e-journey.md:115-119`: three input entry points (plugin knobs, design.md file, MCP) | web studio is also an entry point: start window color/example/import cards (`apps/studio/src/shell/start.ts:155-206`) (omission, not direct contradiction) |
| 25 | `docs/07-e2e-journey.md:327`: Style-guide generator is a "separate project" | studio UI drives a style-guide write in the plugin host (`apps/studio/src/shell/style-guides.ts:1-5`; `apps/studio/src/write-adapter.ts` `postStyleGuide`) |

#### Stale comments inside the code (code vs code)

| Where | Says | Fact |
|---|---|---|
| `apps/studio/src/write-adapter.ts:7,410` | web commit = "download design.md / tokens.json" | single `tokens.json` never downloaded (`apps/studio/src/export-settings.ts:527-533`) |
| `apps/studio/src/write-adapter.ts:110-111` | "the web host writes CSS custom properties" | CSS-var adapter removed in #2487 PR 6 (`apps/studio/src/write-adapter.ts:13-14`) |
| `apps/studio/src/shell/start.ts:2` | "today's four start cards" | three cards: `c1`, `c2`, `c4` (`start.ts:155,190,206`) |
| `apps/tokenpress/agents.md:54,187,195` | `vite.config.ts` must match | no `vite.config.ts`; build is esbuild `build.mjs`, which "REPLACES vite.config.ts" (`apps/tokenpress/build.mjs:8`) |
| `apps/tokenpress/agents.md:25-27` | never edit `src/working-code.js`, `src/simple-code.js` | neither file exists (`ls`) |

### 10.5 Components and skills

| # | doc claim | code fact |
|---|---|---|
| 1 | docs/40-component-catalogue-mvp.md:3-4 "Twenty-five named components, of which seven exist"; `:18` "Seven defs." | 33 defs in `componentDefs` (components/index.ts:76-191) |
| 2 | docs/40:53 tranche ids `checkbox` · `radio` · `switch` | ids are `checkbox-row`/`-control`/`-group`, `radio-row`/`-control`/`-group`, `switch-row`/`-control` (renamed #1347/#1468, index.ts:116-153) |
| 3 | docs/40:27-29 calls `focus-ring`, `field-label` and `field-message` "substrate" | the schema has no substrate kind; their categories are foundations, form and feedback (catalog data). The only marker in the schema is the `_` building-block prefix (component-schema.ts:1742) |
| 4 | docs/18-plugin-and-host-architecture.md:128-129 says route 2: the "MCP writes variables and creates nodes directly … Same document API, different driver" | the paste path runs the **plugin's own executors**, bundled into `use_figma` scripts (apps/plugin/mcp-paste.ts:1-10; src/mcp-steps.ts:1-13). The engine MCP server has no component tool (mcp.ts:236-372) |
| 5 | docs/18:135-138 says the workflow is to "build once in Figma (LLM + Figma MCP) → extract to §15 data → data is the source of truth → plugin rebuilds" | the TS defs are the authored source, projected by `figmaAnatomySet` (main.ts:65; index.ts header). I found no Figma → def extraction leg (inferred, not exhaustively searched) |
| 6 | skills/prism3-build-component/SKILL.md:5-6,24-26 says a def projects into "Web Components / React, Storybook … Code Connect"; docs/18:117-118 says the "full component = Figma + code + docs + .ai.json, all generated" | no emitter for WC, React, Storybook or Code Connect exists. Grep finds "storybook" only in component-schema.ts comments, and no code-connect file. docs/07:291-292 itself says these are "still to come". lint-skills cannot catch this (lint-skills.ts:30-34) |
| 7 | CLAUDE.md (`skills/` row): per-brand payload skills "are emitted by the engine (#668)" | no emitter (see §8); docs/07:28 says "#668, not built"; lint-payload-manifest.ts:8 says "When #668's emitter lands" |
| 8 | components/index.ts:173-175 comment: `tag` "nests `icon-button-neutral` (its remove button)" | tag.ts:455 says "The × is a glyph of the tag's own, not a nest"; the plan-derived nests are `icon, focus-ring` (catalog data) |
| 9 | packages/engine/README.md (engine guide) | it does not mention `components/`, `component-schema.ts`, `anatomy-figma.ts`, `emit-component-docs.ts` or `lint-skills.ts` (grep finds none of them). This is an omission, not a false claim |

### 10.6 Checked, no conflict

These were checked against the code and do not contradict it. They are not counted in §10.

| Source | Doc says | Code says |
|---|---|---|
| Root `README.md` | The Run block lists 4 engine commands and points to the engine README for "the full command list" (`README.md:35-41`) | No contradiction in the commands. Omission: the root `verify` script (`package.json` scripts) is not mentioned |
| Root `README.md` | `npm install` from root (`README.md:50`) | Not a code contradiction; `CLAUDE.md` asks for `npm ci` in worktrees (policy, noted only) |
| MCP, internal comment | `mcp.ts:15-31` (header tool list) | Matches the 6 tools |
| Components and skills | `README.md:26` (four skills, gated by lint-skills.ts); docs/07:27-28,289-292 | Consistent with the code |
