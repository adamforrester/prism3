## (2026-11-04) — The component-defs export: TypeScript stays the source, a generated JSON export maps to Specs (#3425)

**Status:** engine module + two committed artifacts + gates + CLI, MCP and Studio surfaces. ENGINE minor (change
note). CONTRACT unchanged: no token path moves. No executor change, so `EXECUTOR_REVISION` stays. `regen --check` grows
by two artifacts, so `EXPECTED_ARTIFACTS` in `verify.ts` and the count in `ci.yml` move to 227 together.

### The decision this builds (Q45 A)

The component definitions stay one TypeScript `ComponentDef` per file, the only hand-edited form. What is new is a
**published, generated JSON export** of them: brand-neutral (token names) and per brand (settings resolved), mappable
to `@directededges/specs-schema` (`docs/13` §3: conformant-or-mappable). It closes the "final on-disk format" question
`component-schema.ts`'s header left open.

### Why a sibling of `specs.json`, not `specs.json` versioned

`specs.json` is the spec-sheet model (#2830), read by the plugin's spec panel and each page's Specs section; the
def-level fields (props, states, accessibility, `avoidWhen`, relationships) already ship as `components.ai.json`, read by
the docs. Each has its own contract and its own readers. So the export **composes** the two and re-projects nothing:
each entry is `projectDef(def)` (the `components.ai.json` entry, field for field) beside `componentSpec(def)` (the
`specs.json` entry, or the brand's materialization of it). One file a consumer takes whole; neither existing contract
moves. The cost is bytes: the two committed files are 2.0 MB and 1.7 MB.

### What changed

- **`packages/engine/component-defs-export.ts`** (new, `@prism3/engine/component-defs-export`):
  `exportComponentDefs(defs, { brand? })` and `toSpecsComponents(doc)`. A brand export resolves the brand's component
  settings (`brandMaterializer`, restating the plugin's `materializerFor`, since the engine must not import a surface)
  and puts each geometry token's px, in the brand's default mode, beside its name. `brand.settings` lists every
  component setting the Studio offers, defaults filled in: the eight that move a def's bindings, plus Radio dot size
  and the raised surface, which move a token's value (they reach the spec as px, never as a different token name).
- **`packages/engine/project-def.ts`** (new): `projectDef` moved out of `emit-component-docs.ts` (re-exported there),
  so a surface can bundle it without the emitter's I/O.
- **Emission:** `out/components/component-defs.json` and `out/components/component-defs.specs.json`, both payload in
  `payload-manifest.json`. Per-brand exports are written on demand and never committed.
- **CLI:** `cli.ts <design.md> --component-specs` writes `<id>.component-defs.json` and `<id>.component-defs.specs.json`.
- **MCP:** `export_theme` takes `include: ["componentSpecs"]`, which is opt-in, so a call that names no sections
  writes what it always wrote.
- **Studio:** Export gets a third artifact, **Component specs**, with **↓ Download component specs**, for the brand on
  screen. The web bundle carries no component definitions (an existing rule: `test-shell-imports.ts`,
  `vercel-ignore-check.mjs`), so the plugin's iframe entry provides the exporter, the same way it provides the
  component catalog (`apps/plugin/src/ui/component-specs-export.ts` → `studio/src/state/component-specs-export.ts`).
  On the web the artifact shows as off, and says why (Q3425.2 below).

### Versioning: how a consumer tells what changed

- `format` (`prism3-component-defs/1.0`, equal to the schema's `$id`) is the **shape** of the file: minor for a field
  added, major for one removed or renamed.
- `engineVersion` answers "what code produced this?" and moves with any def change, like every emitted artifact.
- `contractVersion` answers "do these token names still resolve?" Every token name in the export belongs to that
  contract, so a consumer holding a cached export compares this one first.
- `digest` per component (FNV-1a over its entry) says **which** components changed between two exports without a
  diff. That is the per-component signal the consumer change log (#3411) can read.

### The Specs mapping, field by field

Specs closes `Component`, `Element` and `AnatomyElement` (`additionalProperties: false`) and opens `$extensions` on
two things only: a prop and a token reference. So a Prism3 field either rides `$extensions["com.prism3"]` on the prop
or token it belongs to, or is omitted from the projection and kept in the Prism3 export.

| Prism3 (`component-defs.json`) | Specs (`component-defs.specs.json`) |
|---|---|
| `def.name` | `title` |
| `spec.anatomy[].part` (path) | `anatomy` key: the leaf name, or the whole path where two leaves share a name |
| `spec.anatomy[].kind` | `anatomy.<key>.type`: frame → `container`, text → `text`, glyph → `glyph`, slot → `slot`, instance and swap → `instance` |
| `spec.nesting[]` instance `component` | `anatomy.<key>.instanceOf` |
| `def.props[]` boolean | `BooleanProp` (`default`, false when unset) |
| `def.props[]` with `values` | `EnumProp` (`enum`, `default` when it is one of the values) |
| `def.props[]` number | `NumberProp` |
| `def.props[]` slot / node / `anyOf` | `SlotProp` (`anyOf`; `minItems` → `minChildren`; `maxItems` → `maxChildren`) |
| `def.props[]` other | `StringProp` (`default: null`, or the default plus `examples`, which only the string shape admits) |
| prop `description`, `required`, `deprecated`, type prose | `props.<name>.$extensions["com.prism3"]` |
| `spec.axes[]` not already a prop (incl. `state`) | `EnumProp` of the axis values; `axis` kind and `figmaName` under `com.prism3` |
| `spec.codeOnlyStates` | `props.state.$extensions["com.prism3"].codeOnlyStates` |
| the default member (each axis at its first value) | `default`: `configuration`, `layout` (the part tree), `elements.<key>.styles` |
| `spec.redlines` / `type` / `colors` rows off the default | `variants[]`: one per row coordinate (`where` → `configuration`), its parts' styles under `elements` |
| `paddingTop/Right/Bottom/Left` | `styles.padding` (`Sides`: `top`, `end`, `bottom`, `start`) |
| `gap`, `height`, `minHeight`, `width`, `minWidth`, `maxWidth` | `itemSpacing`, `height`, `minHeight`, `width`, `minWidth`, `maxWidth` |
| a token value | `TokenReference` (`$token`, `$type: dimension`); a brand export prefixes the brand's root |
| a literal or derived px | a number |
| `textStyle` | `styles.typography`, `TokenReference` (`$type: typography`) |
| `fill` / `stroke` / `ink` / `icon` | `backgroundColor` / `strokes` / `textColor` / `fillColor`, `TokenReference` (`$type: color`) ; `icon` lands on the element for its part, which is an `instance` element (a nested icon) far more often than a `glyph` one: see the traps |
| per-brand px | `TokenReference.$extensions["com.prism3"].px` |

**What Prism3 carries that Specs has no place for, kept in the Prism3 export and omitted from the projection:**

| Prism3 | Why it has no Specs home |
|---|---|
| Brand settings (`brand.settings`) | `Component` and `metadata` are closed; `metadata` also requires a Figma `source` node |
| Token bindings per state across brands | The projection is one brand (or none) at a time; the Prism3 export per brand is the cross-brand form |
| Nesting rules (`follows`, `exposes`, `when`, `where`, swap and slot properties) | `Element` is closed; only `instanceOf` maps |
| Code-only states | Carried on the `state` prop's extension, the one open place |
| `accessibility`, `content`, `docs`, `ai` (incl. `avoidWhen`), `motion`, `composition` (relationships) | No Specs field; `Component` is closed |
| `aliases`, `category`, `status`, `summary`, `description`, `inherits` | No Specs field |
| Figma component properties (`spec.properties`) | Specs props here are the code API; a Figma-only property has no code prop to ride |
| `rowGap`, `buildWidth`, `buildHeight`, computed (per-file) values, gradients, the provider `literal` record | No matching style, or no single value to write |

### The gates

- **Bytes:** `regen --check` byte-checks both files. Mutation: `radio-control`'s `def.ai.avoidWhen` hand-edited, and
  `regen --check` fails naming `out/components/component-defs.json`.
- **Its own schema:** `lint-component-docs.ts` arm G validates the committed export against the authored
  `schema/component-defs.schema.json` (`json-schema-lite`, closed objects), holds each `def` and `spec` to the two
  committed projections and each `digest` to an FNV-1a it recomputes, and validates a live brand export for every
  example brand and one brand with every setting off its default. Tag, Text field, Dialog, Banner and Radio must each
  draw a different spec with and without the one setting that moves them, compared brand to brand so both sides carry
  px. The same hand edit fails as `DEFS DEF` + `DEFS DIGEST`; a field added and a color moved fail as `DEFS SCHEMA` +
  `DEFS SPEC` + `DEFS DIGEST`; the exporter ignoring `tagStyle` fails `DEFS SETTINGS` on `tag`; dropping px resolution
  fails it on `radio-control`. The first draft of that check compared a brand export with the neutral one, which
  differs on px alone and so could not fail; it was rewritten before review.
- **The Specs mapping, independent of our code:** `packages/tokens/check-specs.mjs` (run by
  `check:consumability`) imports nothing from the engine. It validates every component against the published
  `@directededges/specs-schema` 0.39.0 (pinned exact, integrity in the lockfile) with stock Ajv, and checks that the
  projection carries every component, code prop, axis, part and token of the export and nothing else. Mutations: a
  free-string prop without its disambiguator fails `[VALID]` (`oneOf`); a token renamed in the projection fails
  `[REPRESENTED]`. `[REPRESENTED]` compares token *sets*, so it cannot see where a token lands; `[PLACED]` (added in
  review) reads every export binding at the Specs key a literal register in the gate names (the mapping table, typed
  out, not read from the projector), on its part's element, in the default or in the variant configured at its row's
  coordinate: 5,622 bindings. Mutations: `fill` written to `textColor` and `ink` to `backgroundColor` fails
  `[PLACED] button container … fill … belongs at styles.backgroundColor … (it sits at styles.textColor)`; padding
  left and right swapped fails `[PLACED] button container … paddingRight … belongs at styles.padding.end`; the
  coordinate fix below reverted fails `[PLACED] banner: two variants are configured …`. `[PLACED]` found one defect
  on its first run: Banner's redline and color rows name the same coordinate in different key orders, and the
  projector keyed variants on the raw object, so nine Banner coordinates were each two variants, one with the
  geometry and one with the colors. Variants are now keyed on the coordinate in axis order (1,346 → 1,337 variants;
  only Banner moves).
- **The materializer restatement:** `apps/plugin/test-roundtrip.ts` holds `brandMaterializer` to the plugin's
  `materializerFor` on every def, for no brand, each example brand and one brand with every setting off its default.
  Mutation: the tag-style lever dropped from `brandMaterializer` fails `… for every setting off its default … differs on tag`.

### Traps for whoever re-verifies

- Specs' `AnyProp` is a `oneOf`, and its string and enum shapes overlap: `{type: "string"}`, with or without a string
  `default`, matches both. The projection writes `default: null` or adds `examples`, which only the string shape
  admits. Drop that and seven components fail.
- The Specs package exports its schemas, not its `package.json`; `check-specs.mjs` resolves a schema to find it.
- **`icon` → `fillColor` lands on `instance` elements.** The published schema describes `fillColor` as "Glyph fill
  color. Present on GLYPH element type only" (and `textColor` as TEXT only). That is description text, not a
  constraint, so the projection validates; but in the committed projection 981 of the 1,039 `fillColor` styles sit on
  `instance` elements (a nested icon, e.g. `button.leadingVisual`) and 58 on `glyph` ones. A Specs reader that keys on
  element type may drop them. Kept as is, on purpose: the icon color is a binding of the part that holds the nested
  icon, and Specs has no other color key for an instance; omitting it would lose the binding, and moving it under
  `$extensions` is not open on `Element` styles. Recorded here and in the mapping table rather than changed.
- A coordinate written in two key orders (`{tone, width}` and `{width, tone}`) is one coordinate: the projector keys
  variants on it in axis order. `[PLACED]` fails on two variants with the same configuration.
- `cli.ts --component-specs` without `--out` writes into `packages/engine/out/`, where the files are untracked and make
  `regen --check` count two more. Pass `--out`.

### Owner questions (option A is the recommendation)

**Q3425.1 — the Studio copy.** A: as drafted. The artifact is labeled **Component specs**, described as "Every
component's props, states, parts and the tokens each part binds, built with this brand's component settings. As Prism3
JSON and in the Specs format."; the button reads **↓ Download component specs**; the settings column reads "Nothing to
set — the specs follow this brand's component settings."; after a failed restore: "Off after a failed restore: these
specs would be the demo brand's, not this file's." B: other wording.

**Q3425.2 — the web Studio.** The web bundle carries no component definitions, by an existing rule, and the export is
built from them. A: on the web the artifact shows as off, with "In the Figma plugin: the specs are built from the
component definitions, which the web Studio leaves out." (as built). B: hide the artifact on the web. C: load the
definitions on demand on the web (a separate chunk, about 1.9 MB, 566 KB gzipped, measured when they were bundled
whole); filed as #3429 rather than built here.
