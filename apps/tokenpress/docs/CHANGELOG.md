# Changelog

All notable changes to Token Press will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [3.0.0] - 2026-08-10

### Added
- **`tokenNameCase` option + "Token Name Case" dropdown.** Controls the casing
  of emitted token names and alias references:
  - `preserve` (**new default**) — keeps the Figma name's casing verbatim
    (`onSuccessContainer` → `onSuccessContainer`).
  - `kebab` — true kebab-case, splitting camelCase/PascalCase humps and
    acronym boundaries (`onSuccessContainer` → `on-success-container`,
    `parseHTMLValue` → `parse-html-value`).
  - `lower` — the pre-3.0 behaviour, retained for back-compat.

  All three modes are DTCG-conformant: the spec requires only that a name be a
  valid JSON string, not begin with `$`, and contain no `{`, `}` or `.`, and it
  explicitly permits mixed case ("token names are case-sensitive").
  Style Dictionary needs no custom transforms for any mode — its stock
  `name/cti/kebab` transform splits camelCase humps itself, so `preserve`
  yields *better* CSS variables than the old behaviour
  (`--color-on-success-container` instead of `--color-onsuccesscontainer`).

  Reported by a community user. Casing is deliberately excluded from the
  DTCG/SD preset chips: every value is spec-conformant and SD-safe, so it is
  an orthogonal naming preference like `units`, not a spec-gated field.

### Changed
- **BREAKING: token names now preserve case by default.** Through v2.3.1 the
  sanitizer lowercased each path segment *before* replacing non-alphanumerics.
  Because camelCase contains no separator characters, this flattened humps
  irrecoverably — `onSuccessContainer` exported as `onsuccesscontainer`,
  destroying the word boundaries. Names now pass through with casing intact.

  **Migration:** if you consume the exported names downstream, generated
  CSS/SCSS variables and JS keys will change
  (`--color-onsuccesscontainer` → `--color-on-success-container`). Either
  update consumers, or set **Token Name Case** to `lower` to keep pre-3.0
  output byte-for-byte.

  Filenames are unaffected — they remain lowercase in every mode, since
  case-insensitive filesystems would collide on case-only differences.

### Removed
- **BREAKING: the `emitDTCGKeys` option is gone ([#71](https://github.com/VMLYR/token-forge/issues/71)).**
  It never did anything. The option was declared, defaulted to `true`, collected
  from the DOM and restored to it — but no converter, exporter or formatter ever
  read it. `$type` / `$value` were always emitted unconditionally.

  This was worse than an unused field, because the toggle was visible and
  default-on, sat under **Behavior** beside the working
  `includeFigmaExtensions` switch, and its hint read *"Disable only if your
  tooling expects a flatter shape."* A user with flat-shape tooling could switch
  it off, export, and get identical DTCG output with no error and no warning —
  and the setting persisted, so it stayed apparently-off.

  Removing it rather than implementing it: DTCG keys are not optional in a DTCG
  exporter, and a flat shape is a different format, which `formatDotNotation`
  and `formatCss` already cover.

  **Migration:** none needed. Nothing behavioural changes, because nothing
  behavioural ever depended on it. Persisted options that still carry the key
  are merged over `DEFAULT_OPTIONS` (`src/code.ts:398`) and the extra key is
  simply ignored — no read site remains.

### Fixed
- **Empty group keys from degenerate names.** A name like `color//primary`,
  `color/primary/`, or `color/!!!/primary` previously emitted an empty-string
  group key, producing an unaddressable token path. Empty segments are now
  dropped.
- **Reserved leading `$` stripped explicitly.** DTCG reserves the `$` prefix
  for spec properties, so a Figma variable named `$value` can no longer emit a
  name that collides with one.
- **CSS export no longer emits dangling `var()` references.** The CSS exporter
  built custom-property names on two separate code paths: declarations
  lowercased the token path without splitting camelCase humps, while `var()`
  references only swapped `.` for `-` and applied no case transform. Those two
  agreed only by accident while names were lowercased upstream, so preserving
  case would have declared `--color-onsuccesscontainer` while referencing
  `var(--color-onSuccessContainer)`. Both sides now go through one
  `toCSSVariableName` helper that splits humps the same way Style Dictionary's
  stock `name/cti/kebab` transform does. The configured `prefix` was likewise
  applied to declarations only, which would have broken every reference in a
  prefixed export; it now applies to both. `tests/unit/css-var-symmetry.test.ts`
  asserts the invariant directly — every `var(--x)` in the output has a matching
  `--x:` declaration.

- **Typography composites leaked IEEE-754 float noise ([#69](https://github.com/VMLYR/token-forge/issues/69)).**
  Six display styles in a real export carried
  `"lineHeight": 1.0499999523162842` — exactly `Math.fround(1.05)`. Figma stores
  a text style's line height as a 32-bit float, so an authored 16.8px over a
  16px base emitted the noise verbatim.

  v2.2.1 ([#44](https://github.com/VMLYR/token-forge/issues/44)) fixed this bug
  class on the dimension/variable side by rounding at the formatter boundary, but
  `TypographyConverter` never imported `roundToPrecision` at all — so every
  numeric it emitted was raw. `lineHeight` was simply the case whose divisor made
  the noise visible; the rem `fontSize`, rem `letterSpacing`, and both percentage
  paths had the same gap and would surface it on any float32 input.

  The practical symptom was cross-path inconsistency, not just an ugly number:
  the same design intent emitted `1.05` when bound to a `LINE_HEIGHT`-scoped
  variable and `1.0499999523162842` when read off a text style.

  Rounding now happens at every emission point in the converter, with precision
  matched to the path it mirrors — ratios at `DECIMAL_3` like
  `TokenExporter.convertVariableValue`, dimensions at the `DECIMAL_4` default
  like `DimensionConverter`, so sub-pixel letter-spacing intent (`0.04`)
  survives.

- **Namespaced exports emitted unresolvable aliases ([#61](https://github.com/VMLYR/token-forge/issues/61)).**
  When a **Namespace / prefix** was set, every alias reference in the export
  pointed one level above the token it targeted. The exporter applies the
  namespace as a root wrapper *after* conversion, but alias references were
  built from the bare Figma variable name during conversion, so a token living
  at `nbds.palette.neutral.950` was referenced as `{palette.neutral.950}`.

  Found while validating a real namespaced export (10 files, `nbds` namespace):
  **every alias reference in it resolved to nothing** — 384 token-level
  references, 492 counting those nested inside typography and transition
  composites. That fails DTCG validators and throws in Style Dictionary 4.x/5.x
  with `usesDtcg: true`. Alias references now include the namespace, and skip it
  when the Figma names already carry the prefix (those files keep their own root
  key and the wrapper is skipped). The same export now resolves 492/492.

  Pre-existing since the namespace option shipped — not a regression from the
  v3.0.0 casing work. There was no test covering namespace and aliases
  together; there now is, including checks that drive the real `TokenExporter`
  and walk the emitted tree to confirm every reference resolves.

  The wrapper decision is now made **once per file, before conversion**, from
  the set of root keys the variable names will produce, and both the wrapper and
  the alias builder read that one value. Deciding it independently on each side
  (per-file for the wrapper, per-path for the alias) meant they could disagree,
  which broke two cases that had worked before:

  - a namespace that coincides with a real top-level group (`namespace: color`
    over a file that already has a `color/` group)
  - a single file mixing prefixed and unprefixed variable names — the case
    previously documented as an unfixable [#48](https://github.com/VMLYR/token-forge/issues/48)
    side effect. It is fixable, and fixed: the wrapper's bail-out depends only
    on the variable names, so it is knowable before any token is converted.

- **Namespaced transitions silently lost their easing curve.** `resolveEasingValue`
  identified a `timingFunction` alias's target by reverse-parsing the alias
  string back into a Figma variable name. Once aliases carried a namespace, the
  reconstructed name no longer matched any variable, so every namespaced
  transition fell through to the linear `[0, 0, 1, 1]` default with no warning.
  The lookup now compares against an alias built by the same function that
  emitted it, so it cannot drift from the casing mode or the namespace again.

- **The namespace option is now sanitized.** It is simultaneously a root key and
  the leading segment of every alias, so a character that is structural in DTCG
  desynced the two. `a.b` and `nbds/core` both produced multi-segment alias paths
  against a single literal root key, which Style Dictionary reports as an
  unresolvable reference; `{x}` and `$brand` produced spec-illegal names. These
  now collapse to `a-b`, `nbds-core`, `x` and `brand`. Casing is left alone — the
  namespace is a literal you typed, not a Figma name — so `My Brand` becomes
  `My-Brand` rather than being lowercased.

- **Style Dictionary example configs flattened every alias
  ([#70](https://github.com/VMLYR/token-forge/issues/70)).** None of the shipped
  starters set `outputReferences`, which Style Dictionary defaults to `false`, so
  a build that followed the examples resolved each alias to a literal instead of
  emitting `var()` — the alias graph built in Figma did not survive into CSS, and
  re-theming by overriding a primitive wouldn't work. Building the tracked export
  in `test-examples/tokens/tokens/` with the SD 4/5 starter goes from **0 `var()`
  references to 637 lines** carrying one (951 occurrences, 230 distinct targets),
  across the same 1018 custom properties in both builds. `[object Object]`
  fragments also drop, from 25 lines / 30 occurrences to 13 / 13 — all 12
  eliminated lines are motion `duration` / `transition` tokens, whose object-form
  `$value`s now emit a reference instead of being stringified. Typography emits
  zero `[object Object]` either way. Figures are per mode and identical across
  light / dark / wireframe.

  Set on the three `sd-v4-or-v5/sd.<mode>.json` configs and on
  `typography-fallbacks/build.js`.

  Placement matters, and not in the obvious way. Three positions work: the
  **top level of the config** (SD 4/5 only — SD copies the whole config into the
  formatter's options bag), **`platforms.<p>.options`**, and
  **`files[].options`** (what the starters use, since it works on SD 3 too).
  The one shape that fails is a bare `outputReferences` key directly on the
  **platform object** — ignored with no error and no warning, and it's the shape
  most people reach for first since it reads naturally beside `transformGroup`
  and `buildPath`. Documented in the examples README as a position table, and
  noted in `build.js` where the trap is easy to reintroduce.

  **The SD 3 starter deliberately does not set it.** SD 3 crashes with
  `TypeError: value.replace is not a function` when `outputReferences` meets a
  composite whose sub-values are aliases: its reference-substitution path assumes
  an object-valued token resolves to a string. In practice that's `typography`
  (103 tokens on the tracked export) and motion `transition` (5). Shadows are
  unaffected — Token Press always emits effect styles with literal values, never
  aliases. It fires in either dimension shape, so the Style Dictionary preset
  doesn't avoid it; scalar aliases work fine. The SD 3 README documents this,
  points at the SD 4/5 upgrade it already recommends, and adds a `filter`-based
  split-file workaround that recovers 529 `var()` references on the scalars with
  no dangling references.

  Two harnesses keep the default deliberately. `tests/sd-per-mode/*.json` measure
  source-glob merge collisions, which happen during resolution — strictly before
  formatting — so `outputReferences` cannot affect them (verified identical either
  way; see that harness's README for the collision figures and what they count).
  It's also an SD 3 harness, so enabling it would hit the composite crash.
  `tests/sd/config.json` has no aliases that survive to a leaf, so enabling it
  emits 0 `var()` and only reorders output; its build artifacts are committed and
  the churn would be noise.

### Documentation
- **The shipped Style Dictionary configs could not consume a multi-axis export
  ([#72](https://github.com/VMLYR/token-forge/issues/72), partial).** The
  per-mode layout emits one directory per mode, flat, with no grouping by
  source collection. `examples/style-dictionary/README.md` then told users
  "the directory names under `tokens/` are your mode names — glob one of
  them," which is only true when every multi-mode collection varies along a
  single axis.

  With two orthogonal axes (theme × breakpoint) `light/` and `desktop/` are
  siblings but not alternatives, and a build needs one directory from *each*.
  Following the documented steps produced the shipped `sd.light.json`, which
  hard-fails on such an export:

  ```
  Error:
  Reference Errors:
  Some token references (10) could not be found.
  tries to reference {nbds.font-fluid.display.sm.strong}, which is not defined.
  ```

  The error names the referenced token, not the absent directory, so it reads
  as a broken export when it is a config gap — `shared/typography.json`
  aliases into `font-fluid` and no `font-fluid` file was sourced.

  Documented rather than changed in code: composing the axes works today, so
  this is a docs defect for anyone who already has a two-axis file. Added a
  **Multi-axis modes** section with the failure, the fix, and a recipe for
  recovering axis identity from `$extensions.figma.collection.name`
  (directories sharing a collection name are the same axis and mutually
  exclusive; across names they compose). Shipped a working
  `sd-v4-or-v5/sd.light-desktop.json` plus a `build:multi-axis` script, and
  added the warning to the main README's layout section and the v4/v5
  starter README.

  Verified against a real two-axis export: the new config exits 0 with 136
  custom properties, 41 `var()` references and zero dangling references; the
  seven reported collisions are all `$extensions` metadata. Noted that axis
  identity is unrecoverable if **Include `$extensions.figma` metadata** is
  turned off, since the grouping lives only in that block.

  Carrying axis identity in the export itself — a manifest, or nested
  directories — remains open under #72.

### Internal
- **Consolidated four near-duplicate name sanitizers into one source of
  truth**, `src/utils/token-name-utils.ts` — following the same pattern as the
  font-weight consolidation in #53. `TokenExporter`, `BaseConverter`
  (Color/Dimension), `TypographyConverter`, and `DotNotationExporter` now all
  delegate there, so casing behaviour cannot drift between the DTCG export and
  the dot-notation export. Filename sanitizers in `RawFigmaExporter` and
  `MultiFormatTokenExporter` were consolidated onto the shared
  `sanitizeFileName` as well.
- **`tests/unit/token-naming.test.ts` no longer re-implements the sanitizers
  locally.** It previously defined its own copies, so it passed regardless of
  what the production code did — it now exercises the shared utility (pinned to
  `lower`) so drift is actually caught.

## [2.3.1] - 2026-06-13

### Fixed
- **Alias type resolution for unscoped aliases.** Reported in the community
  as a follow-up to the v2.0.2 stroke fix: aliases of FLOAT primitives still
  typed as `number` for line-height, font-size, and unscoped values when
  the alias itself shipped with no scopes ("All scopes" default in Figma).
  Now, when an alias has empty scopes, the exporter walks the alias chain
  to its source and inherits the source's scopes for type resolution. The
  alias's own scopes still win when set — the user's intent on the alias
  is the strongest signal.
- **FONT_SIZE added to the dimension scope fallback.** Defensive: FONT_SIZE
  was already covered by an explicit check above the fallback, but
  including it in the fallback list documents the full set of spatial
  FLOAT scopes in one place and stays correct under future refactors.
  LINE_HEIGHT is intentionally still excluded from the fallback because
  ratio output mode legitimately produces `number`; the explicit check
  (which honors `lineHeightOutput`) is the only safe place for it.

### Notes
- Alias-walk is hop-limited (max 10) and cycle-protected. If resolution
  fails (cycle, missing source, source also unscoped), the exporter falls
  back to the alias's own scopes — same behavior as before this fix.
- For LINE_HEIGHT aliases that look like they're typing `number` instead
  of `dimension`: check the **Line Height Output** dropdown. The default
  is `ratio`, which is spec-correct as `number`. Pick `dimension` or
  `percentage` to emit `dimension`.

## [2.3.0] - 2026-06-13

### Added
- **Motion Duration Format option.** New `durationFormat: 'object' | 'string'`
  exposed as a "Motion Duration Format" dropdown next to Dimension Format and
  Letter Spacing Format. Default is `'object'` (DTCG-spec
  `{ value: 50, unit: 'ms' }`); `'string'` emits the legacy `"50ms"` form.
- **SD preset now covers durations.** Clicking the **Style Dictionary** quick
  preset chip stamps `durationFormat = 'string'` alongside the existing
  dimension / letter-spacing string forms, so the export drops cleanly into
  Style Dictionary 4.x's built-in `time/seconds` transform without a
  `[object Object]` rendering.

### Why
- DTCG 2024-12+ moved durations from string-form (`"50ms"`) to object-form
  (`{ value, unit }`). Token Press has emitted spec-current shape since 2.x;
  the missing piece was a one-click way back to the string form for the SD
  4.x consumers whose built-in transforms still expect it. The preset chip
  pattern from 1.7.0 already covered dimensions / letter spacing — duration
  closes the gap so "Style Dictionary" means "actually consumable by SD".

### Migration
- None. Default stays object form; existing exports are unchanged. Users on
  the SD preset who hadn't worked around motion durations will see clean
  `"50ms"` strings emit on the next export.

## [2.2.2] - 2026-06-05

### Fixed
- **Skip blur-only effect styles instead of emitting empty `$value: []`.**
  DTCG `shadow` only models drop / inner shadows — it has no
  representation for `BACKGROUND_BLUR` or `LAYER_BLUR`. Prior to this
  release, an effect style containing only blur effects (e.g. a
  glassmorphism / backdrop-blur style) still emitted a token with
  `$type: shadow` and `$value: []`, which downstream-crashed Style
  Dictionary's composite resolver.
- **Surface skipped names in the export footer + console.** When one or
  more blur-only styles are skipped, the export success status reads
  `Exported N file(s). Skipped K blur-only effect style(s): name1, name2`
  and a matching `console.warn` lists them, so authors can either
  re-author them as real shadows or remove them from the file. Export
  itself stays successful — this is a warning, not a gate.

### Notes
- Mixed shadow + blur styles still export. The shadow converter already
  filters to `DROP_SHADOW` / `INNER_SHADOW` layers, so a style with one
  shadow and one blur emits the shadow layer normally and is not flagged.
- This generalizes into the broader "empty composite" lint rule tracked
  in issue [#45](https://github.com/VMLYR/token-forge/issues/45)
  (DTCG-spec lint pass), which will also catch empty `typography`,
  `transition`, and `gradient` composites at scan time.

### Migration
- None. Output is strictly cleaner; no API or config changes.

## [2.2.1] - 2026-06-05

### Fixed
- **IEEE-754 noise in dimension exports.** Letter-spacing and other
  small-magnitude FLOAT/dimension variables emitted raw 32-bit float
  representations (e.g. `-0.019999999552965164px` for `-0.02`,
  `0.03999999910593033px` for `0.04`). Reported by an SD-consumer agent
  triaging a real-world export. The `LINE_HEIGHT` and `OPACITY` paths
  already rounded; the generic dimension path bypassed it, so any FLOAT
  scope without a special case (`LETTER_SPACING`, `WIDTH_HEIGHT`, `GAP`,
  `CORNER_RADIUS`, etc.) leaked the raw float through to the output.
- **Sanitization moved to the formatter boundary.** A new
  `roundToPrecision` helper rounds at `formatDimension` /
  `formatDimensionValue`, so every dimension emission — string or object
  form, px or rem — is clean regardless of which scope produced it.
  Default precision is 4 decimals (`PRECISION.DECIMAL_4`), tight enough
  to strip noise from `0.04`-magnitude values, loose enough to preserve
  sub-pixel intent. Duration and grid-column FLOAT returns are now
  rounded with the same helper for consistency.

### Migration
- None. Pure output cleanup; no API or config changes.

## [2.2.0] - 2026-06-03

### Directory-per-mode export layout

Resolves the long-standing
[`docs/known-issues/SD-PER-MODE-MERGE.md`](known-issues/SD-PER-MODE-MERGE.md)
issue (open since v1.6 / commit `9281cfe`) where Style Dictionary crashed
with `RangeError: Maximum call stack size exceeded` when merging Token
Press exports that contained per-mode files.

Multi-mode exports now emit a directory-per-mode tree instead of
mode-suffixed sibling files at the export root, so each mode's files
live on a unique path and can never collide during a downstream merge.

### Changed
- **Multi-mode exports use directory-per-mode layout.** Previously a
  collection with `dark` + `light` modes wrote `colors-dark.json` and
  `colors-light.json` next to each other, sharing the same DTCG paths
  (e.g. `nbds.color.text.primary.default`) with different `$value`s.
  SD's default file-glob merge collapsed those into one tree and could
  cycle into a stack overflow. The new layout writes `dark/colors.json`
  and `light/colors.json` so each mode is a distinct source root.
- **Cross-mode shared files moved to `shared/`.** Single-mode collections
  in a multi-mode export (typography, shadows, grid layouts that don't
  vary by mode) now live at `shared/<file>.json`. SD configs source
  `tokens/shared/**/*.json` plus `tokens/<mode>/**/*.json` per build.
- **Single-mode-only exports stay flat.** When no collection has
  multiple modes, output is identical to v2.1.x — no `shared/` wrapper,
  no per-mode directories. Nothing to share with means nothing to nest.

### Migration
- **SD users:** replace any `tokens/**/*.json` source glob with one
  config per mode that sources `tokens/shared/**/*.json` plus
  `tokens/<mode>/**/*.json`. Working examples for SD v4/v5 and SD v3
  ship in [`examples/style-dictionary/`](../examples/style-dictionary/).
  The pre-v2.2.0 mitigation patterns (skipping `*-mobile.json` files,
  per-mode source globs against the flat layout) are no longer needed
  and should be removed.
- **DTCG-only consumers** that read individual JSON files: update file
  paths from `colors-dark.json` to `dark/colors.json`. The token paths
  inside each file are unchanged.
- **Tools that walked the export root** to discover files: walk the
  directory tree instead, or filter by extension.

### Added
- README "Multi-mode output layout (2.2.0+)" subsection documenting
  the new directory shape with an SD config snippet.
- README "Which Style Dictionary version?" subsection with a version
  compatibility table — SD 5.x and 4.x parse DTCG natively via
  `usesDtcg: true`; SD 3.x needs either the SD preset or a parser shim.
- [`examples/style-dictionary/sd-v4-or-v5/`](../examples/style-dictionary/sd-v4-or-v5/) —
  working SD 4/5 starter (one config per mode, `usesDtcg: true`).
  Verified: 1024 lines clean CSS per mode, dark/light values differ.
- [`examples/style-dictionary/sd-v3-with-parser/`](../examples/style-dictionary/sd-v3-with-parser/) —
  working SD 3 starter with a minimal DTCG → SD-3 parser shim and a
  `build.js` driver (SD 3's CLI can't register parsers from a JSON
  config alone).

### Tests
- New `tests/unit/per-mode-directory-export.test.ts` (6 cases) covering
  single-mode-only flat output, multi-mode `<mode>/<file>.json`,
  single-mode-in-mixed-export `shared/<file>.json`, kebab-case
  sanitization of mode and collection names, and zero path collisions
  across modes.
- New `tests/sd-per-mode/` verification harness reproducing the
  pre-2.2.0 crash with a naive `tokens/**/*.json` glob (1712 token
  collisions) and confirming zero collisions with the new per-mode
  configs against the same export.

## [2.1.0] - 2026-06-01

### F5 — shadow.color honors `colorFormat`

Last open finding from the v1.9.7 conformance audit. Shadow `color`
previously always emitted as a CSS `rgb()` / `rgba()` string regardless
of the `colorFormat` setting — fine for the Style Dictionary preset,
off-spec for DTCG output where every other color field is a
`{ colorSpace, components, alpha }` object.

### Changed
- **Shadow `color` now follows `colorFormat`.** When
  `colorFormat='dtcg'` (the DTCG preset default), shadow layers emit a
  DTCG color object that matches the rest of the color surface. When
  `colorFormat='css'` (the SD preset), output is unchanged — still
  `rgb(...)` / `rgba(...)` strings. The CSS exporter already handled
  both shapes (introduced in v1.7), so multi-format output is unchanged
  for both presets.

### Migration
- **DTCG preset users:** shadow tokens now contain a color object
  instead of a CSS string. Spec-conformant DTCG consumers should accept
  this without changes; ad-hoc consumers that string-matched
  `rgb(...)` / `rgba(...)` will need to read the object form.
- **Style Dictionary preset users:** no change.
- **Custom preset users:** behavior depends on your `colorFormat`
  setting — flip `colorFormat` to `'css'` to retain the 2.0.x string
  output.

### Tests
- Added 5 cases to `tests/unit/shadow-converter.test.ts` covering both
  formats, opaque vs alpha colors, and dimension/color independence.

## [2.0.2] - 2026-05-30

### Fixed
- **Alias variables in `CORNER_RADIUS`, `STROKE_FLOAT`, and `EFFECT_FLOAT`
  scopes are now correctly typed as `dimension` instead of `number`.**
  Reported by a community user: a FLOAT variable named `0` aliased into
  two consumer scopes exported with two different DTCG types — the
  radius alias correctly typed as `dimension` (matched a name
  heuristic), the stroke alias incorrectly typed as `number`. Root
  cause: the FLOAT scope fall-through in `mapVariableTypeToDTCG` only
  treated `WIDTH_HEIGHT` and `GAP` as dimension-bearing scopes;
  `CORNER_RADIUS`, `STROKE_FLOAT`, and `EFFECT_FLOAT` all fell to
  `number`. `CORNER_RADIUS` happened to work in many cases via the
  `isBorderDimensionVariable` name heuristic, but the heuristic doesn't
  fire when source/alias names are short numerics like `0`. Fix
  includes the three additional scopes in the dimension fall-through.
  Workaround for users on 2.0.1 and earlier: rename the source variable
  from `0` to a string like `none` or `0px`.

### Tests
- Added `tests/unit/scope-dimension-detection.test.ts` regression suite
  (8 cases) covering all five dimension scopes, multi-scope precedence,
  the `OPACITY → number` rule, and the existing border-dimension name
  heuristic.

## [2.0.1] - 2026-05-22

### Correctness pass — F8, F7, F12+F13

Three audit findings landed as a follow-on to 2.0. No user-facing
defaults change; output for existing settings is byte-identical.

### Fixed
- **F8: Shadow dimensions now honor `dimensionFormat`.** Shadow
  composites previously emitted `{value, unit}` objects unconditionally,
  ignoring the `dimensionFormat: 'string'` option used by the Style
  Dictionary preset. With this fix, `offsetX/Y/blur/spread` emit CSS
  strings (`'4px'`, `'0.5rem'`) when the SD preset is active, matching
  the rest of the dimension surface. The CSS exporter handles all three
  shapes (DTCG alias, CSS string, dimension object).
- **F13: CSS `transformDimension` handles SD-preset strings explicitly.**
  Previously worked by accident via the `String(value)` fallback. Now
  branches explicitly on string vs object so the intent is visible to
  future readers.

### Documented
- **F7: Typography `fontStyle` documented as a Token Press extension.**
  `fontStyle: 'italic' | 'oblique'` is a sibling on the typography
  `$value` (omitted for normal/upright). DTCG typography composite
  doesn't currently spec italic/oblique; we keep the key on `$value`
  rather than `$extensions` so the composite stays self-contained for
  consumers. Added a subsection to `docs/DTCG_SPECIFICATION.md`
  explaining the rationale.

### Changed
- **JSON folder in multi-format archives renamed `dtcg/` → `tokens/`.**
  The folder always contained the canonical DTCG-shaped JSON, but the
  name fought with the chip when users selected the Style Dictionary
  preset (the JSON is still DTCG-spec, just shaped for SD consumption).
  `tokens/` reads as "the canonical source" and pairs naturally with
  sibling `css/`, `raw-figma/`, and `dot-notation/` folders. Single-
  format JSON exports (no additional formats selected) continue to land
  at the archive root and are unaffected.

### Verified
- **F12: `excludedCollections` is honored in every export path.**
  Confirmed for DTCG (the source of CSS/SCSS/etc. via `super.exportToZip`)
  and the raw Figma + dot-notation paths via
  `getRawFigmaData → scanner.scanAll`. No code change needed; this was a
  belt-and-suspenders audit follow-up.

### Tests
- New `tests/unit/shadow-converter.test.ts` (5 cases) covers F8:
  default object emission, `dimensionFormat='string'`, useRem in both
  formats, and INNER_SHADOW inset preservation.
- 116 tests passing (was 111).

## [2.0.0] - 2026-05-21

### Major release — Token Press 2.0

The first major version since the v1.6 community listing. Cumulatively
this release ships a full UI rebuild, collection include/exclude
controls, live alias-validation, format-shape presets, output-format
conformance fixes, and a chip group that honestly signals
DTCG-spec-conformance vs Style Dictionary recipe vs off-spec.

The plugin remains 100% client-side, exports the same DTCG-spec JSON
families it did in v1.x, and preserves alias references across
multi-mode collections — none of that has regressed. Existing users
will see new UI affordances and more honest validation; no token-shape
defaults have flipped under them.

### Highlights since v1.6
- **New UI (v1.8).** Landscape 1080×720 layout, settings cards, format
  chips, progress stepper, accessibility pass (focus rings, ARIA roles,
  ES2018 audit for the plugin runtime).
- **Per-collection include/exclude (v1.9.0).** Toggle which collections
  ship in the export without splitting your file.
- **Live alias-into-excluded warnings (v1.9.6).** When an excluded
  collection has incoming aliases from an included collection, the
  validation chip explains what will break — updates on every toggle,
  no rescan needed.
- **DTCG object form + Style Dictionary preset (v1.7).**
  `dimensionFormat` and `letterSpacingFormat` options toggle between
  spec-canonical object form (`{value, unit}`) and string form for SD
  v4 with `usesDtcg: true`. Defaults to the spec form.
- **Format-conformance audit + fixes (v2.0).** 16-finding audit doc
  (`docs/format-conformance-audit.md`). Quick-win fixes shipped:
  typography percent letter-spacing honors the format flag (F4),
  generator-version metadata is stamped from the real package version
  (F10), dead CSS exporter code removed (F14), spec reference doc
  reconciled with what the plugin emits (F15+F16).
- **Honest preset chips (v2.0).** "DTCG-spec" / "Style Dictionary" /
  "Off-spec" — the DTCG chip lights when output is spec-conformant,
  not when settings exactly match a recipe. Spec-allowed variations
  like `units: rem` no longer flip you off-spec; non-standard choices
  like `colorSpace: hsl` now correctly read as off-spec.
- **Vite 8 build (v1.9.4).** Closed 4 transitive dev-only
  vulnerabilities in the esbuild chain.
- **Cool-shift dark mode (v1.9.x).** UI tokens nudged away from native
  Figma chrome for a more legible dark theme.

### Changed in 2.0
- **Preset chip semantics (F1+F2+F3).** Detection is now
  spec-conformance-based, not fingerprint-based. Spec-gated options:
  - `dimensionFormat` — must be `object`
  - `letterSpacingFormat` — must be `object`
  - `colorFormat` — must be `dtcg` (F1 — `css` string is plugin opinion)
  - `colorSpace` — must be `srgb` (F3 — `hsl` is non-standard for DTCG)
  All other options accept any value as spec-conformant.
- **Chip labels.** "DTCG (default)" → "DTCG-spec"; "Custom setup" →
  "Off-spec" (with explanatory hover-title).
- **Locked JSON chip** dynamic label shows "Off-spec JSON" instead of
  "Custom JSON" when off-spec, matching the preset chip.
- **Header copy** describes DTCG-spec vs Style Dictionary as recipes
  for different consumers.
- **Topbar.** Removed the legacy "T" logo mark; the brand now reads as
  "Token Press v2.0.0 DTCG Exporter."

### Migration note
- Users who set `colorSpace: 'hsl'` in v1.9.x saw the DTCG chip stay
  lit (detection bug — `colorSpace` was excluded from the fingerprint).
  v2.0 correctly flags that as off-spec. No option values change; only
  the chip indicator does.
- No default option values have changed since v1.7. Token shapes for
  existing exports are byte-identical to v1.9.7 + v1.9.8 (and
  byte-equivalent at the value level to v1.7+).

## [1.9.7] - 2026-05-21

### Format-conformance audit + quick wins

Bundles the four "quick win" findings from the v1.9.7 format-conformance
audit (`docs/format-conformance-audit.md`). The audit is the primary
deliverable; the code changes here are spec-tightening fixes that landed
together because they were small and independent.

### Added
- **`docs/format-conformance-audit.md`.** 16 findings (F1–F16) ranked
  by severity, comparing Token Press output against the W3C DTCG draft
  spec and the Style Dictionary v4 (`usesDtcg: true`) consumer contract.
  Quick wins are addressed in this release; medium-effort and discussion
  items are tracked as follow-up tasks.

### Fixed
- **F4 — Typography percent letter-spacing now honors `letterSpacingFormat`.**
  Mirrors the v1.9.6 percentage-line-height fix (#33). Previously,
  `letterSpacingUnits: 'percent'` always emitted a string regardless of
  format preference. Now percent routes through `formatLetterSpacing`
  like every other dimension. `'%'` is a valid `DTCGDimension` unit per
  spec.
  - Default (`letterSpacingFormat: 'object'`): `{ value: 2.5, unit: '%' }`
  - SD preset (`letterSpacingFormat: 'string'`): `"2.5%"` (unchanged)
- **F10 — `$extensions.generator.version` now reflects the real plugin
  version.** Previously hard-coded to `'1.0.0'`. Vite's `define` config
  injects `__PLUGIN_VERSION__` from `package.json` at build time, so
  exported DTCG files now stamp the actual release.
- **F14 — Removed dead `textTransform` mapping in CSS exporter.** The
  typography expansion in `css-exporter.ts` listed `textTransform`, but
  `TypographyConverter` never emits it on `$value`, so the CSS variable
  was never produced. Map now mirrors what the converter actually emits.

### Docs
- **F15 + F16 — `docs/DTCG_SPECIFICATION.md` reconciled with reality.**
  - Motion duration section corrected: plugin emits `$type: "duration"`
    with `{ value, unit: "ms" }` (not `$type: "number"`). Style
    Dictionary v4 with `usesDtcg: true` consumes the object directly.
  - Draft-type warnings rewritten as a support table. `duration`,
    `cubicBezier`, and `transition` are emitted (not "intentionally not
    implemented" as the previous doc stated). `border`, `gradient`, and
    `strokeStyle` remain unsupported — no clean Figma variable mapping.

### Test suite
- **109/109 → 111/111 passing.** Two new tests cover F4 (percent
  letter-spacing under `letterSpacingFormat: 'object'` and `'string'`).

### Follow-ups (not in this release)
- F1+F2+F3 (#35): preset chip semantics — what does Custom mean?
- F8 (#36): shadow dimensions ignore `dimensionFormat` — consistency story
- F5 (#37): shadow.color always CSS string — add DTCG color object option
- F12+F13 (#38): verify `excludedCollections` + `dimensionFormat` in CSS/JS/TS
- F7 (#39): typography composite emits non-standard `fontStyle` sibling

## [1.9.6] - 2026-05-21

### Reactive alias-into-excluded warnings + percentage line-height consistency fix

Closes the loop on the v1.9.0 collection include/exclude feature: when a
user excludes a collection that has incoming aliases from a still-included
collection, the validation chip surfaces a warning explaining what will
break. The warning updates live on every toggle — no rescan needed.

Also folds in the test-suite + percentage-line-height fixes from #33.

### Added
- **Reactive alias-into-excluded warnings.** When a user excludes a
  collection X and another included collection Y has variables that
  alias into X, the validation accordion shows:
  > "12 aliases in Y resolve to 'X' (excluded). Their values won't
  > resolve in the export."
  - One aggregated warning per excluded target collection (not one per
    alias edge — keeps the accordion readable in large files).
  - Updates live on every collection toggle.
  - Lists all source collections that are affected.
  - Warning-severity, not error — export proceeds; user can review the
    output ZIP and decide.
- **`AliasEdge` type + `aliasEdges` on `ScanResult`.** The plugin now
  computes cross-collection alias edges at scan time and ships them to
  the UI. Same-collection aliases are skipped (you can't exclude only
  part of a collection). Multi-mode aliases that target the same
  variable collapse into a single edge.

### Fixed
- **Percentage line-height now honors `dimensionFormat`.** Previously,
  `lineHeightOutput: 'percentage'` always emitted a string (`"155%"`)
  even under the default `dimensionFormat: 'object'`. Every other
  dimension in the variable-export path emits `{value, unit}` by default.
  Percentage line-height was the lone exception. Fixed in both
  `src/plugin/exporter.ts` and `src/plugin/converters/dimension-converter.ts`.
  `'%'` is a valid `DTCGDimension` unit per spec.
  - Default (`dimensionFormat: 'object'`): `{ value: 155.6, unit: '%' }`
  - SD preset (`dimensionFormat: 'string'`): `"155.6%"` (unchanged)

### Test suite
- **103/109 → 109/109 passing.** Six tests in
  `tests/integration/dtcg-compliance-fixes.test.ts` had been failing
  silently since a refactor moved methods off `TokenExporter` onto
  `TokenTypeDetector` and `TypographyConverter`. Tests now call the
  methods on their current homes.

### Notes
- A broader format-conformance audit is logged separately to revisit
  the typography composite percentage paths and a few aspirational
  type-detection patterns surfaced during the test cleanup.

## [1.9.5] - 2026-05-21

### Mono font for technical labels + JSON-chip honesty fix

UI polish pass. Adds a mono font (Geist Mono with a `ui-monospace` fallback
ladder) on the labels that read as identifiers, fixes a layout jump in the
collections heading, and corrects a misleading copy line in the export-format
chips.

### Added
- **`--tp-font-mono` CSS variable** with a layered family stack:
  `'Geist Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo,
  'Cascadia Code', Consolas, monospace`. Geist Mono loads via
  `fonts.googleapis.com` with `display=swap`; if the fetch is slow or
  CSP-blocked the UI paints with the system mono fallback invisibly.

### Changed
- **Setting card labels** (e.g. "Color format", "Dimension format") →
  mono, 13 → 12px (mono optically reads ~1px larger than the sans body),
  letter-spacing -0.01em.
- **Collection card titles** → mono, 13 → 12px, letter-spacing -0.01em.
  Reads as "identifier" — fits how teams actually name collections
  (`color/`, `spacing/`, `typography/`) in Figma.
- **Stat-row variable counts** → mono, weight 600 → 400. Tabular-num
  alignment preserved.
- **Collections heading "X of Y" pill** → mono, weight 500 → 400.
- **Collections heading layout** — count pill now anchors directly to the
  right of the "Collections" label and the reset link uses
  `margin-left: auto` to flush itself to the row's right edge. Previously
  used `justify-content: space-between`, which made the count pill jump
  whenever the reset link appeared/disappeared.
- **"Include all" → "Select all"** in the collections reset link.
- **Locked JSON chip label** is now dynamic and tracks the active preset:
  - DTCG preset → "DTCG JSON (always on)"
  - SD preset → "Style Dictionary JSON (always on)"
  - Custom (user diverged from both) → "Custom JSON (always on)"
- **Export-formats intro copy**: "DTCG JSON is always exported. Add other
  formats alongside it." → "JSON is always exported — the shape matches
  your selected preset." (The previous line was inaccurate — the SD
  preset emits SD-shape JSON, not DTCG-shape JSON.)

### Implementation note
- The JSON chip label updates from `updatePresetChips()`, which already
  runs on every `saveOptions()` call. No new event wiring needed.

## [1.9.4] - 2026-05-21

### Vite 5 → Vite 8 toolchain upgrade

Build-infra-only release. No user-visible changes; no runtime / exporter
behavior changes. Closes the four esbuild-chain dependabot vulnerabilities
that were carried by Vite 5's transitive deps.

### Changed
- **`vite` 5.4.21 → 8.0.14** (rolldown-based bundler).
- **`vitest` 1.6.1 → 4.1.7**.
- **`vite.config.ts`** — removed `treeshake.tryCatchDeoptimization: false`
  (the option was removed in rolldown 1.x; the equivalent behavior is
  unconditionally on by default).

### Outcomes
- **Bundle 265.20 kB → 249.61 kB** (~5.9% smaller; rolldown's
  tree-shaking is more aggressive than Rollup's).
- **Build 351 ms → 43 ms** on this machine (~8× faster).
- **`npm audit`: 0 vulnerabilities** at root and in `tests/sd`. The four
  open esbuild-chain advisories from Vite 5 are gone.
- **ES2018 audit clean**: bundle has 0 optional chaining, 0 nullish
  coalescing, 0 spread operators (improvement from `main`, which
  shipped 16 spreads from bundled deps).
- **Tests**: same baseline as `main` (103 passing, 6 failing). The 6
  failures are pre-existing test debt against
  `isGridVariable` / `isContainerMaxFullVariable` — unrelated to the
  upgrade. Tracked separately for cleanup.

### Notes
- Test debt: tests/integration/dtcg-compliance-fixes.test.ts references
  exporter methods that don't exist on `TokenExporter`. Same failures on
  v1.9.3 main, no regression introduced.

## [1.9.3] - 2026-05-20

### Cool-shift dark theme

Pure-CSS dark-mode override that nudges the plugin's neutral surfaces a step
darker and slightly cooler than Figma's native chrome. The plugin reads as
its own surface inside the Figma window instead of disappearing into it.

### Added
- **`@media (prefers-color-scheme: dark)` palette override** on `:root`.
  Overrides only the neutral vars — `--figma-color-bg`,
  `--figma-color-bg-secondary`, `--figma-color-bg-tertiary`,
  `--figma-color-bg-hover`, `--figma-color-bg-disabled`,
  `--figma-color-border`, `--figma-color-border-strong`,
  `--figma-color-text`, `--figma-color-text-secondary`,
  `--figma-color-text-tertiary`, `--figma-color-text-disabled`.
- Status colors (brand, warning, danger, success) stay Figma-native so
  validation chips, primary CTAs, and error states still match Figma's
  vocabulary.

### Palette
- bg `#1D2025`, bg-secondary `#232830`, bg-hover/tertiary `#2C323B`
- border `#353A44`, border-strong `#404653`
- text `#E6E8EC`, text-secondary `#9BA2AD`, text-tertiary `#6C7280`,
  text-disabled `#4D525A`
- ≈1–1.5 ticks darker than Figma's `#2C2C2C` native dark with a +5° hue
  rotation toward blue. Contrast: text/bg ≈ 13:1, brand/bg ≈ 5.5:1
  (both AA+).

### Known limitation
- The override tracks the **OS** color scheme, not Figma's app-level
  theme. A user running Figma in dark mode on a light-mode OS will see
  Figma-native (gray) chrome instead of the cool-shift palette. In
  practice this combination is rare for design-system work, and the
  trade-off is a deliberate one — an earlier JS-based detector
  (MutationObserver on `<html>`) hung the Figma iframe in some files,
  so we chose pure CSS for stability.

## [1.9.2] - 2026-05-20

### Preset chip group

The Quick Presets row now behaves like a single-select chip group: exactly one
chip reads as selected at any time, and the visual state always reflects the
live option values rather than the most recent click.

### Changed
- **Preset row converted to a `role="radiogroup"`** with three chips —
  *DTCG (default)*, *Style Dictionary*, and a passive *Custom setup*
  indicator. Selecting one preset deselects the other; the radio-group
  semantics replace the previous always-on look.
- **Selected chip uses the brand vocabulary** (blue border + soft brand fill
  + brand text). Unselected chips drop to the resting border + secondary
  text, with a `figma-color-text-tertiary` hover for clear affordance.
- **Custom setup chip** is render-only — `aria-disabled`, `tabindex="-1"`,
  no hover. It only ever lights up when the user's option mix diverges from
  both presets, and clearing the divergence (e.g. clicking DTCG) drops it
  back to the unselected state automatically.
- **Re-clicking the active chip is a no-op** — clicking switches presets,
  not re-stamps. Manual field edits drive the chip state on their own via
  `updatePresetChips()` in `saveOptions()`.

### Removed
- The 1.5s "preset applied" toast. The selected-chip state is now the
  feedback; the toast became redundant once visual state tracked the preset.
  `showPresetFeedback()` and the `preset-feedback` span are gone.

### Implementation notes
- `detectActivePreset()` computes the active preset from a six-field
  fingerprint (`dimensionFormat`, `letterSpacingFormat`,
  `letterSpacingUnits`, `lineHeightOutput`, `units`, `colorFormat`).
  `colorSpace` is intentionally excluded — it's only meaningful when
  `colorFormat === "dtcg"`, and the SD preset doesn't touch it. Including
  it would force HSL-mode users into Custom even when their export shape
  matches DTCG.
- No exporter or scanner code changed; ZIP output is byte-identical to
  v1.9.1 for the same option set.

## [1.9.1] - 2026-05-20

### UI cleanup pass

Small polish on top of v1.9.0 — no functional changes, no API changes.

### Fixed
- **Stepper now opens on step 1 (Scan)** instead of step 3 (Configure).
  The default-active class was hardcoded on the wrong step. Step 1 stays
  active until Scan & Validate runs, then advances to step 2.

### Changed
- **Rescan demoted to ghost button.** While the user has not scanned yet,
  the action is the primary blue CTA. Once a scan completes, the button
  switches to the secondary/outline treatment so the footer's primary
  *Export Tokens* CTA is the only competing primary on screen.
- **Scan-stats table tightened.** Row padding 10px → 6px, font 13px →
  12px, outer padding 4px → 2px. Shorter table = more collections in
  view above the fold.
- **Removed the "Scan complete" status line** above the stats table.
  The stats appearing IS the completion signal; the line is shown again
  on errors. Reduces visual noise in the rail.
- **Collection card title weight 500 → 400** (regular) so the cards
  read lighter and meta + title share a consistent visual weight.

## [1.9.0] - 2026-05-21

### Collection include/exclude

The rail's collection cards are now interactive. Toggle a card off and it
drops out of the export, the rail stats and footer summary recompute live
(no rescan needed), and Export disables when nothing's selected.

### Added
- **Per-collection include/exclude toggle** — checkbox-styled cards in the
  rail. Excluded cards dim and the collection's variables stop counting
  toward Variables / Colors / Strings / Dimensions / Modes totals.
- **"X of Y selected" header** with an *Include all* link button that
  clears the exclusion set in one click. Both appear only when at least
  one collection is excluded.
- **Persistent exclusion state** — choices are stored via `clientStorage`
  by **collection name** (not Figma's per-load id) so they survive plugin
  reloads. On each scan, names that no longer exist in the file are
  silently dropped from the persisted set.
- **`excludedCollections: string[]`** on `ExportOptions`. Filtering is
  applied inside `TokenScanner.scanAll()` so both `TokenExporter` and
  `MultiFormatTokenExporter` get it for free.
- **`CollectionSummary` enriched** with `id`, `colorCount`, `stringCount`,
  `dimensionCount` so the rail can recompute live totals without a rescan.

### Changed
- Rail "Variables" total now reflects the *effective* (post-exclusion)
  count rather than the raw scan count. Same for the per-type rows and
  the footer summary's `X tokens ready` value.
- Footer status reads "Select at least one collection to export" when the
  user has excluded everything.
- Stepper stays in `validate-error` if the scan reported errors regardless
  of toggle state — exclusions don't paper over real validation failures.

### Known limitation (tracked, follow-up)
- Tokens that alias into an excluded collection currently export with
  unresolved aliases. A non-blocking validation warning for this case
  will land in v1.9.x.

## [1.8.0] - 2026-05-20

### UI Refresh — Landscape layout, scan rail, progress stepper, sticky export bar

This release is a top-to-bottom UI rework. The plugin window is now a fixed
1080×720 landscape with a persistent left scan rail, a setting-card right
panel, an in-topbar progress stepper, and a sticky export footer.

**Phases shipped together as v1.8.0:**

- **Phase 1 — Scaffold:** 1080×720 window, three-zone landscape grid
  (topbar / left rail / right panel).
- **Phase 2 — Right panel:** setting cards, format toggle chips, paired
  preset chips matching the format-chip vocabulary.
- **Phase 3 — Left rail:** scan stats (Variables / Colors / Strings /
  Dimensions / Modes — BOOLEAN excluded), expandable validation chip,
  per-collection cards (read-only; include/exclude lands in v1.9.0),
  version badge in the topbar.
- **Phase 3.5 — Stepper + footer:** auto-advancing Scan / Validate /
  Configure / Export stepper centered in the topbar, sticky bottom bar
  with live `X tokens ready · Y files` summary that updates as format
  chips toggle.
- **Phase 4 — A11y + ES2018:** focus rings on all interactive controls,
  `aria-current="step"` + dynamic `aria-label` on stepper, `role="status"`
  on the footer summary, proper `<label for>` association on all setting
  selects/inputs.

### Added
- Inline 24×24 SVG icons (with `fill="currentColor"` for theme support)
  for each scan-stat row.
- Validation chip — single expand/collapse component replacing the
  separate yellow warning block; severity icon adapts to the issue mix.
- Stepper component with five state transitions: initial / scanning /
  validate-error / configured / exporting / exported.
- Sticky footer with download-icon export button and live file count.

### Changed
- `dot-notation-exporter.ts` — sort step now uses `[].concat(arr)` instead
  of `[...arr]` to comply with the strict ES2018 plugin runtime target.
- All export status text now routes through the footer summary; the orphan
  `#export-status` element was removed.
- Quick-preset buttons restyled to share the format-chip vocabulary
  (blue border, soft brand background, brand-color text) but retain the
  smaller card radius so they read as chips, not pills.

### Accessibility
- `:focus-visible` outline on `.button`, `:focus-within` outline on
  format/preset chips, brand-color box-shadow on toggle switches when
  any control inside the row is focused.
- Stepper steps expose `aria-current="step"` for the active step and a
  per-step `aria-label` describing position + status (e.g. *"Validate —
  current step"*, *"Scan — completed"*).
- Footer summary marked `role="status" aria-live="polite"` so scan and
  export status changes are announced.
- Eight setting-card labels converted from `<span>` to `<label for>` so
  screen readers and click-target hit-areas pair with the matched select
  / input.

## [1.7.0] - 2026-05-19

### BREAKING — Default dimension output flipped to DTCG-spec object form

Token Press now emits the W3C-spec object form for dimension `$value`s by
default. Previous releases emitted strings (`"16px"`) as a Style Dictionary
compatibility shim, which violated the DTCG specification.

**Before (≤ 1.6.0):**
```json
{ "$type": "dimension", "$value": "16px" }
```

**After (1.7.0+, default):**
```json
{ "$type": "dimension", "$value": { "value": 16, "unit": "px" } }
```

Affected token shapes:
- All standalone `dimension` tokens (FLOAT variables with px/rem units)
- `fontSize`, `letterSpacing`, and `lineHeight` (when emitted as a dimension)
  inside `typography` composites
- `offsetX`, `offsetY`, `blur`, `spread` inside `shadow` composites
  (already shipped as objects — unchanged)

**Migration path: Apply the Style Dictionary preset.**
The plugin UI now ships a one-click *Apply Style Dictionary preset* button
that stamps the legacy string form into both new dropdowns. A symmetric
*Reset to DTCG defaults* button restores spec-compliant output. Either side
can be overridden manually per export.

If you consume Token Press output via Style Dictionary's built-in CSS / SCSS
transforms and want zero changes to your pipeline, click *Apply Style
Dictionary preset* once before exporting — settings persist between runs.

### Added
- **`dimensionFormat`** option (`'object' | 'string'`, default `'object'`)
  — controls dimension `$value` shape across variables, typography, and
  letter-spacing.
- **`letterSpacingFormat`** option (`'object' | 'string'`, default `'object'`)
  — controls letter-spacing shape independently. Percent letter-spacings
  always emit as strings (e.g. `"-1.5%"`); only px values are affected.
- **HSL color export** option — emits color tokens as `hsl()`/`hsla()` strings
  alongside the existing sRGB output.
- **UI: paired preset buttons** — *Apply Style Dictionary preset* /
  *Reset to DTCG defaults* with a shared 1.5s feedback span. Presets stamp
  values into the existing dropdowns rather than locking them, so any field
  is still user-overridable after a preset is applied.
- **UI: Dimension Format and Letter Spacing Format dropdowns** in the export
  options panel.

### Changed
- `DimensionConverter` and `TypographyConverter` route all dimension
  formatting through new internal `formatDimension()` helpers that respect
  `dimensionFormat` / `letterSpacingFormat` from the conversion context.
- `exporter.ts` adds `formatDimensionValue()` on `TokenExporter` and routes
  the variable-token hot path (`convertVariableValue` FLOAT switch) through
  it so format options actually take effect for variables (the converter
  classes alone do not run for raw variables).
- Per-mode CSS export now writes one `tokens-<mode>.css` file per mode
  instead of merging all modes into a single file.

### Known Issues
- **Style Dictionary + per-mode token files**: when SD's default file-glob
  source consumes both base and per-mode exports together, SD crashes
  inside `flattenProperties` due to path collisions. This is **pre-existing**
  (since v1.6.0, commit `9281cfe`) and is not introduced by 1.7.0 —
  documented in `docs/known-issues/SD-PER-MODE-MERGE.md` with three
  user-side workarounds.

### Documentation
- `README.md` — DTCG mapping section rewritten to show object-form examples;
  Export Options list adds Dimension Format and Letter Spacing Format; new
  Style Dictionary section explains the preset workflow.
- `docs/ARCHITECTURE.md` — notes dual-mode dimension behavior and the
  exporter hot path.
- `docs/known-issues/SD-PER-MODE-MERGE.md` — full writeup of the per-mode
  Style Dictionary merge collision and proposed fixes.

## [1.6.0] - 2024-11-07

### Changed - Major Architecture Improvements
- **Modular architecture** with Strategy pattern for token converters
  - Created dedicated converters: `ColorConverter`, `DimensionConverter`, `TypographyConverter`, `ShadowConverter`
  - Abstract `BaseConverter` provides common utilities
  - Each converter has single responsibility for one token type
  - Reduced `exporter.ts` from 1,571 to 1,095 lines (30% reduction)

- **Performance optimizations**
  - O(1) caching for font weight and line height lookups (52x speedup)
  - Adaptive batch processing (10-100 items based on performance metrics)
  - Generic cache builder and object pooling infrastructure
  - Build time improved 26% (~400ms → 294ms)

- **Code quality improvements**
  - Added ESLint with TypeScript support and pre-commit hooks
  - Reduced explicit `any` usage by 39%
  - Comprehensive JSDoc documentation on all public APIs
  - Automatic code formatting with Prettier
  - Strict ES2018 compliance enforcement

### Added
- **New utilities**
  - `constants.ts` - Centralized configuration
  - `type-detection.ts` - Token type detection module
  - `cache-manager.ts` - Variable lookup optimization
  - `batch-optimizer.ts` - Adaptive batch sizing
  - `cache-builder.ts` - Generic caching utilities
  - `object-pool.ts` - Object pooling for performance

- **Type system enhancements**
  - `converter-types.ts` - Converter interfaces
  - `errors.ts` - Error handling types
  - Better type safety with reduced `any` usage

- **Documentation**
  - `ARCHITECTURE.md` - Comprehensive system architecture (12,000+ words)
  - `OPTIMIZATION_PROGRESS.md` - Complete optimization history and metrics
  - `ROADMAP.md` - Future enhancements documented with effort estimates

### Fixed
- Font weight extraction visibility bug (`extractWeightName` now public)
- ES2018 compliance issues (removed spread operators, optional chaining)
- Build configuration for proper tree-shaking

### Technical Details
- Build target: ES2018 (strictly enforced)
- Bundle size: 227.28 kB (tree-shaking enabled, no minification)
- Gzipped size: 51.45 kB
- Code quality: 0 ESLint errors, 693 acceptable warnings
- All Figma plugin compliance requirements maintained

## [1.5.1] - 2025-10-24

### Fixed - Critical Correction
- **Motion duration tokens** corrected to use proper DTCG `duration` type with object format
  - Changed from `$type: "number"` (v1.5.0) to correct `$type: "duration"`
  - Value format changed from raw number to object: `{ "value": 50, "unit": "ms" }`
  - Aligns with official DTCG specification for time/duration values
  - Affected tokens: All motion duration primitives (50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000)
  - Example: `{ "$type": "duration", "$value": { "value": 200, "unit": "ms" } }`
  - Ensures proper semantic meaning and cross-platform transformation support
  - All motion reference tokens (instant, fast, normal, slow, etc.) continue to work correctly

### Documentation
- Updated DTCG specification to include proper `duration` type definition and usage
- Corrected motion token guidelines to reflect duration type instead of number type
- Updated VERSION_1.5_UPDATES.md with correction details

## [1.5.0] - 2025-10-24 (Superseded by 1.5.1)

### Fixed
- **Motion duration tokens** changed from incorrect format
  - Changed from `$type: "dimension"` with "px" units to `$type: "number"`
  - This was later corrected in v1.5.1 to use proper `$type: "duration"` with object format
  - Affected tokens: All motion duration primitives (50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000)

### Enhanced
- **Error display improvements** - Validation errors now grouped by collection with indented formatting for easier identification and resolution

### Documentation
- Added comprehensive DTCG specification documentation with Token Press implementation preferences
- Documented rgb/rgba string format preference for color tokens (DTCG-compliant, Style Dictionary friendly)
- Added motion token guidelines (duration as `number` type, easing as `string` type)
- Documented shadow token strategy with two export patterns (EffectStyles vs. decomposed variables)
- Created VERSION_1.5_UPDATES.md with detailed validation report

### Technical Details
- Added `isMotionDurationVariable()` detection logic in plugin exporter
- Motion duration detection happens before other type checks to ensure correct classification
- Easing tokens explicitly excluded from duration detection to maintain `string` type
- 100% DTCG compliance maintained across all token types

## [1.0.0] - Initial Release

### Added
- W3C DTCG standard-compliant JSON export format
- Multi-mode support for light/dark themes and brand variants
- Automatic composite token generation for typography and shadows
- Intelligent alias resolution that preserves variable references
- Built-in validation to catch broken aliases and type mismatches
- 100% client-side processing with no network calls
- Flexible export options for units, namespacing, and metadata
- Support for Variables, Text Styles, and Effect Styles
