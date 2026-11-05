/**
 * Prism3 engine — THE COMPONENT-DEFS EXPORT (#3425, owner decision Q45 A). A generated, versioned JSON export of every
 * component definition, brand-neutral or for one brand, plus its projection onto the Specs format
 * (`@directededges/specs-schema`, `docs/13` §3: conformant-or-mappable).
 *
 *   exportComponentDefs(defs)            → `out/components/component-defs.json` (brand-neutral, token names only)
 *   exportComponentDefs(defs, { brand }) → the same for one brand: its component settings resolved, and each
 *                                          geometry token's px in the brand's default mode beside the name
 *   toSpecsComponents(doc)               → `out/components/component-defs.specs.json` — a Specs components set
 *
 * TYPESCRIPT STAYS THE ONE SOURCE. The defs under `components/` are the only hand-edited form; both files here are
 * written by `emit-component-docs.ts` and byte-checked by `regen --check`. Nothing reads them back into the engine.
 *
 * ── WHY A SIBLING, AND NOT `specs.json` VERSIONED ─────────────────────────────────────────────────────────────────
 *
 * `specs.json` is the spec-SHEET model (#2830): redlines, colors per state, anatomy and nesting, from the plan that
 * builds the design-file component. Its readers are the plugin's spec panel and the Specs section of each Markdown
 * page, and its contract is the sheet. The def-level fields (props, states, accessibility, `avoidWhen`, relationships)
 * already ship as `components.ai.json`, whose contract is the docs. Folding one into the other would move a contract
 * two readers depend on. So the export COMPOSES the two existing projections and re-projects nothing: each entry is
 * `projectDef(def)` (the `components.ai.json` entry, field for field) beside `componentSpec(def)` (the `specs.json`
 * entry, or the brand's materialization of it). One file a consumer can take whole, two contracts left where they are.
 *
 * ── VERSIONING ────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 *  · `format` (`prism3-component-defs/<major>.<minor>`) is the SHAPE of this file. It moves with the schema's `$id`
 *    (`schema/component-defs.schema.json`): minor for a field added, major for one removed or renamed.
 *  · `engineVersion` answers "what code produced this?" — any change to a def moves it, like every emitted artifact.
 *  · `contractVersion` answers "do the token names here still resolve?" — every token ref in the file is a name from
 *    the token contract this version guarantees. A consumer holding a cached export compares this first.
 *  · `digest` per component (FNV-1a over the entry's JSON) says WHICH components changed between two exports without a
 *    diff — the per-component signal the consumer change log (#3411) reads.
 *
 * Brand-free and dependency-free: the module imports the engine only, so the Studio bundles it (Export component specs).
 */
import type { ComponentDef } from './component-schema';
import {
  applyBannerStyle, applyButtonLayout, applyControlShape, applyDialogTitleSize, applyFieldStyle, applyMinWidthRatio, applyOutlineInteraction,
  applySpacingDensity, applyTagStyle, applyWeightIntent, DEFAULT_BUTTON_LAYOUT, DEFAULT_WEIGHT_AVAILABILITY, fieldStyleFor,
} from './anatomy-figma';
import type { ButtonLayout, WeightAvailability } from './anatomy-figma';
import { componentSpec, specMaterialize } from './component-specs';
import type { ComponentSpec, SpecValue, SpecWhere } from './component-specs';
import { projectDef } from './project-def';
import { componentSizes, RADIO_DOT_DEFAULT, sizeRefPx, SPACE_BASE } from './scale';
import type { Density, RadioDotShare, SizeStep } from './scale';
import { brandTheme, weightAvailability } from './theme';
import type { BrandInput, Theme } from './theme';
import { at, buildTree, pxOf } from './tree';
import { CONTRACT_VERSION, ENGINE_VERSION } from './version';

export const COMPONENT_DEFS_FORMAT = 'prism3-component-defs/1.1';
/** The Specs schema version the projection is written against, and checked against (`packages/tokens/check-specs.mjs`). */
export const SPECS_SCHEMA_VERSION = '0.39.0';

// ---- brand settings ---------------------------------------------------------------------------

/** The component settings a brand resolves a def against — every lever `materializeForBrand` reads, resolved. */
export type ComponentSettings = {
  controlShape: NonNullable<BrandInput['controlShape']>;
  fieldStyle: NonNullable<BrandInput['fieldStyle']>;
  searchFieldStyle: NonNullable<BrandInput['searchFieldStyle']>;
  tagStyle: NonNullable<BrandInput['tagStyle']>;
  dialogTitleSize: NonNullable<BrandInput['dialogTitleSize']>;
  bannerStyle: NonNullable<BrandInput['bannerStyle']>;
  density: Density;
  outlineInteraction: Theme['outlineInteraction'];
  weightAvailability: WeightAvailability;
  button: ButtonLayout;
  /** The two component settings that move token VALUES, not a def's bindings (Radio's dot share, Dialog's raised
   *  surface): the spec's token names do not change with them, and a brand export's px and the brand's tokens carry them. */
  radioDot: RadioDotShare;
  raisedSurface: NonNullable<BrandInput['raisedSurface']>;
};

type Levers = { settings: ComponentSettings; sizes: SizeStep[] };

/**
 * The brand's levers, RESTATED from the plugin's `apps/plugin/src/brand-def.ts` (`brandLevers`, `brandButtonLayout`,
 * `materializerFor`): the engine must not import a surface, the same reason `specMaterialize` restates the null-brand
 * chain. `apps/plugin/test-roundtrip.ts` holds the two to each other on every def, for every example brand and one
 * brand with every lever off its default, so a lever added to one and not the other fails there by def.
 */
const leversOf = (input: BrandInput | null): Levers => {
  let theme: Theme | null = null;
  if (input) try { theme = brandTheme(input); } catch { theme = null; }
  return {
    sizes: theme ? theme.dims.sizes : componentSizes('comfortable', SPACE_BASE),
    settings: {
      controlShape: input?.controlShape ?? 'rounded',
      fieldStyle: input?.fieldStyle ?? 'outline',
      searchFieldStyle: input?.searchFieldStyle ?? 'follow',
      tagStyle: input?.tagStyle ?? 'pill',
      dialogTitleSize: input?.dialogTitleSize ?? 'large',
      bannerStyle: input?.bannerStyle ?? 'tinted',
      density: theme ? theme.dims.density : 'comfortable',
      outlineInteraction: theme ? theme.outlineInteraction : 'overlay-neutral',
      weightAvailability: theme ? weightAvailability(theme.typography) : DEFAULT_WEIGHT_AVAILABILITY,
      button: {
        icons: input?.buttonIcons ?? DEFAULT_BUTTON_LAYOUT.icons,
        content: input?.buttonContentSize ?? DEFAULT_BUTTON_LAYOUT.content,
        minWidthMultiplier: input?.buttonMinWidthMultiplier ?? DEFAULT_BUTTON_LAYOUT.minWidthMultiplier,
        labelWeight: input?.buttonLabelWeight ?? DEFAULT_BUTTON_LAYOUT.labelWeight,
        textHover: input?.buttonTextHover ?? DEFAULT_BUTTON_LAYOUT.textHover,
      },
      radioDot: input?.radioDot ?? RADIO_DOT_DEFAULT,
      raisedSurface: input?.raisedSurface ?? 'card',
    },
  };
};

/** `def` resolved against a brand's settings, in `materializerFor`'s order. `null` is the brand-neutral build. */
export const brandMaterializer = (input: BrandInput | null): ((def: ComponentDef) => ComponentDef) => {
  const { settings: s, sizes } = leversOf(input);
  const px = sizeRefPx(sizes);
  return (def) => applyMinWidthRatio(applyButtonLayout(
    applySpacingDensity(applyOutlineInteraction(applyWeightIntent(applyBannerStyle(applyDialogTitleSize(applyTagStyle(applyFieldStyle(applyControlShape(def, s.controlShape), fieldStyleFor(def.id, input)), s.tagStyle), s.dialogTitleSize), s.bannerStyle), s.weightAvailability), s.outlineInteraction), s.density),
    s.button, px), px);
};

// ---- the export -------------------------------------------------------------------------------

export type ComponentDefEntry = {
  digest: string;
  def: ReturnType<typeof projectDef>;
  /** The spec model; absent for a def the design file does not build (no `figmaProperties`). */
  spec?: ComponentSpec;
};

export type ComponentDefsExport = {
  format: typeof COMPONENT_DEFS_FORMAT;
  generated: true;
  engineVersion: string;
  contractVersion: string;
  note: string;
  /** `null` in the brand-neutral export. */
  brand: null | { id: string; name: string; root: string; mode: string; settings: ComponentSettings };
  components: Record<string, ComponentDefEntry>;
};

/** FNV-1a, 32-bit, as 8 hex digits. A change signal, not a security property: dependency-free and the same in a browser. */
export const fnv1a = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
};

const NOTE_NEUTRAL =
  'Every component definition, exported from the TypeScript source: `def` is the definition\'s shipped fields (the ' +
  'code API, states, variants, accessibility, the decision surface and relationships), and `spec` is the model of ' +
  'the design-file component built from it (parts, spacing and size tokens per size, color tokens per state, ' +
  'nesting). Token names only, so one file serves every brand. Generated, never edited: change the definition.';
const NOTE_BRAND =
  'Every component definition, exported for one brand: `brand.settings` are the component settings the brand ' +
  'resolves, and each `spec` is built with them, so its token names are the ones this brand binds. A spacing or ' +
  'size token carries its px in the brand\'s default mode. Generated, never edited: change the definition or the brand.';

export const exportComponentDefs = (defs: readonly ComponentDef[], opts: { brand?: BrandInput } = {}): ComponentDefsExport => {
  const input = opts.brand ?? null;
  let brand: ComponentDefsExport['brand'] = null;
  let materialize: (def: ComponentDef) => ComponentDef = specMaterialize;
  let px: ((ref: string) => number | undefined) | undefined;
  if (input) {
    const theme = brandTheme(input);   // throws on an input the engine refuses: the caller reports it
    const { tree } = buildTree(theme);
    brand = { id: theme.id, name: String(input.name ?? theme.id), root: theme.root, mode: theme.modes[0], settings: leversOf(input).settings };
    materialize = brandMaterializer(input);
    px = (ref) => { const n = at(tree, `${theme.root}.${ref}`); return n && n.$value !== undefined ? pxOf(tree, n) : undefined; };
  }
  const components: Record<string, ComponentDefEntry> = {};
  for (const d of defs) {
    const def = projectDef(d);
    const spec = d.figmaProperties ? componentSpec(d, { def: materialize(d), px }) : undefined;
    const body = { def, ...(spec ? { spec } : {}) };
    components[d.id] = { digest: fnv1a(JSON.stringify(body)), ...body };
  }
  return {
    format: COMPONENT_DEFS_FORMAT,
    generated: true,
    engineVersion: ENGINE_VERSION,
    contractVersion: CONTRACT_VERSION,
    note: input ? NOTE_BRAND : NOTE_NEUTRAL,
    brand,
    components,
  };
};

// ---- the Specs projection ---------------------------------------------------------------------
//
// THE MAPPING, field by field (the table in `docs/progress/pending/claude-3425-defs-export.md` is this, as prose).
// Specs closes `Component`, `Element` and `AnatomyElement` (`additionalProperties: false`), and opens `$extensions`
// on two things only: a prop and a token reference. So a Prism3 field with no Specs home is either carried under
// `$extensions["com.prism3"]` on the prop or token it belongs to, or OMITTED here and kept in the Prism3 export.
//
//   Prism3                              → Specs
//   def.name                            → title
//   spec.anatomy[].part (path)          → anatomy key (the leaf name; the whole path where two leaves share a name)
//   spec.anatomy[].kind                 → anatomy.type: frame→container, text→text, glyph→glyph, slot→slot,
//                                         instance/swap→instance (nested component → instanceOf)
//   def.props[]                         → props: boolean→BooleanProp, values→EnumProp, number→NumberProp,
//                                         slot/node/anyOf→SlotProp (anyOf, minItems→minChildren, maxItems→maxChildren),
//                                         else StringProp. description, required, deprecated, type prose →
//                                         $extensions["com.prism3"]
//   spec.axes (not already a prop)      → props: EnumProp per axis, its kind under com.prism3; `state` is a prop too,
//                                         with the code-only states under com.prism3.codeOnlyStates
//   the default member                  → default: configuration (each axis at its first value) + elements + layout
//   spec.redlines/type/colors rows      → variants: one Variant per row coordinate (`where` → configuration) that is
//                                         not the default's, its parts' styles under elements
//   padding*/gap/height/width/min*/max* → styles.padding (Sides) / itemSpacing / height / width / minHeight /
//                                         minWidth / maxWidth; a token → TokenReference {$token, $type: dimension},
//                                         a literal or derived px → a number
//   textStyle                           → styles.typography TokenReference {$type: typography}
//   fill / stroke / ink / icon          → backgroundColor / strokes / textColor / fillColor, TokenReference {$type: color}
//                                         (`icon` sits on its part's element, usually an `instance`: Specs
//                                         describes fillColor as glyph-only, in prose, not as a constraint)
//   per-brand px                        → TokenReference.$extensions["com.prism3"].px
//
//   OMITTED (kept in the Prism3 export): accessibility, content, docs, ai (incl. avoidWhen), motion, composition
//   (relationships), aliases/category/status/summary/description, axis kinds beyond the prop extension, nesting rules
//   (follows/exposes/when/where), Figma component properties, rowGap, buildWidth/buildHeight, computed values,
//   gradients, the provider `literal` record, brand settings. Specs `metadata` is omitted: it requires a Figma
//   `source` node, and this projection comes from the definition, not a file.

type Json = Record<string, unknown>;
const KIND_TYPE: Record<string, string> = { frame: 'container', text: 'text', glyph: 'glyph', slot: 'slot', instance: 'instance', swap: 'instance' };
const leaf = (p: string) => p.slice(p.lastIndexOf('/') + 1);

const tokenRef = (token: string, type: string, root: string | null, px?: number): Json => ({
  $token: root ? `${root}.${token}` : token,
  $type: type,
  ...(px === undefined ? {} : { $extensions: { 'com.prism3': { px } } }),
});
const dimension = (v: SpecValue, root: string | null): unknown =>
  'token' in v ? tokenRef(v.token, 'dimension', root, v.px) : 'px' in v ? v.px : undefined;

const SIDE: Record<string, string> = { paddingTop: 'top', paddingRight: 'end', paddingBottom: 'bottom', paddingLeft: 'start' };
const SCALAR: Record<string, string> = { gap: 'itemSpacing', height: 'height', minHeight: 'minHeight', width: 'width', minWidth: 'minWidth', maxWidth: 'maxWidth' };

const geometryStyles = (values: Partial<Record<string, SpecValue>>, root: string | null): Json => {
  const out: Json = {};
  const padding: Json = {};
  for (const [k, v] of Object.entries(values)) {
    if (!v) continue;
    const val = dimension(v, root);
    if (val === undefined) continue;                     // a computed value has no number and no token: omitted
    if (SIDE[k]) padding[SIDE[k]] = val;
    else if (SCALAR[k]) out[SCALAR[k]] = val;
  }
  if (Object.keys(padding).length) out.padding = padding;
  return out;
};

const specsProp = (p: ReturnType<typeof projectDef>['props'][number]): Json => {
  const ext = { 'com.prism3': { type: p.type, required: p.required, description: p.description, ...(p.deprecated ? { deprecated: true } : {}) } };
  const t = p.type.trim().toLowerCase();
  if (p.anyOf || t === 'slot' || t === 'node' || t.startsWith('slot')) {
    return { type: 'slot', ...(p.anyOf ? { anyOf: [...p.anyOf] } : {}), ...(p.minItems === undefined ? {} : { minChildren: p.minItems }), ...(p.maxItems === undefined ? {} : { maxChildren: p.maxItems }), $extensions: ext };
  }
  if (t === 'boolean') return { type: 'boolean', default: p.default === true || p.default === 'true', $extensions: ext };
  if (p.values) return { type: 'string', enum: [...p.values], ...(p.default !== undefined && p.values.includes(String(p.default)) ? { default: String(p.default) } : {}), $extensions: ext };
  if (t === 'number') return { type: 'number', ...(typeof p.default === 'number' ? { default: p.default } : {}), $extensions: ext };
  // A free string prop. Specs' `AnyProp` is a `oneOf`, and `{type: string}` alone, or with a string `default`, matches
  // both its string and its enum shape, so the projection writes what only the string shape admits: `default: null`
  // when there is no default, and `examples` (the default) beside a string default, which Specs keeps but deprecates.
  return p.default === undefined
    ? { type: 'string', default: null, $extensions: ext }
    : { type: 'string', default: String(p.default), examples: [String(p.default)], $extensions: ext };
};

/** One component as a Specs `Component`. `root` prefixes token paths for a brand export (`null`: root-relative). */
export const toSpecsComponent = (entry: ComponentDefEntry, root: string | null): Json => {
  const { def, spec } = entry;
  const props: Json = {};
  for (const p of def.props) props[p.name] = specsProp(p);
  if (!spec) return { title: def.name, anatomy: {}, ...(Object.keys(props).length ? { props } : {}), default: {} };

  for (const a of spec.axes) {
    if (props[a.name]) continue;
    props[a.name] = { type: 'string', enum: [...a.values], default: a.values[0], $extensions: { 'com.prism3': { axis: a.kind, figmaName: a.figmaName, ...(a.kind === 'state' && spec.codeOnlyStates.length ? { codeOnlyStates: [...spec.codeOnlyStates] } : {}) } } };
  }

  // Element keys: the leaf part name, or the whole path where two parts share a leaf.
  const leaves = new Map<string, number>();
  for (const a of spec.anatomy) leaves.set(leaf(a.part), (leaves.get(leaf(a.part)) ?? 0) + 1);
  const key = (path: string) => (leaves.get(leaf(path)) === 1 ? leaf(path) : path);
  const nestOf = new Map(spec.nesting.filter((n) => n.kind === 'instance').map((n) => [n.part, (n as { component: string }).component]));
  const anatomy: Json = {};
  for (const a of spec.anatomy) anatomy[key(a.part)] = { type: KIND_TYPE[a.kind], ...(nestOf.has(a.part) ? { instanceOf: nestOf.get(a.part) } : {}) };

  // Layout: the part tree, from the paths.
  const childrenOf = new Map<string, string[]>();
  for (const a of spec.anatomy) {
    const parent = a.part.includes('/') ? a.part.slice(0, a.part.lastIndexOf('/')) : '';
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), a.part]);
  }
  const layoutOf = (path: string): unknown => {
    const kids = childrenOf.get(path) ?? [];
    return kids.length ? { [key(path)]: kids.map(layoutOf) } : key(path);
  };
  const layout = (childrenOf.get('') ?? []).map(layoutOf);

  // Every row, by its coordinate: styles merged per part across the three blocks.
  const defaultCoord: SpecWhere = Object.fromEntries(spec.axes.map((a) => [a.name, a.values[0]]));
  const isDefault = (w: SpecWhere) => Object.entries(w).every(([k, v]) => defaultCoord[k] === v);
  const rows = new Map<string, { where: SpecWhere; elements: Map<string, Json> }>();
  const axisRank = (name: string) => { const i = spec.axes.findIndex((a) => a.name === name); return i < 0 ? spec.axes.length : i; };
  const into = (where: SpecWhere, part: string, styles: Json) => {
    if (!Object.keys(styles).length) return;
    // One variant per coordinate, whatever key order the row wrote it in: redline and color rows can name the same
    // coordinate as `{tone, width}` and `{width, tone}`, and keying on the raw object made two variants of it.
    const coord: SpecWhere = Object.fromEntries(Object.entries(where).sort(([a], [b]) => axisRank(a) - axisRank(b) || a.localeCompare(b)));
    const id = isDefault(coord) ? '' : JSON.stringify(coord);
    if (!rows.has(id)) rows.set(id, { where: coord, elements: new Map() });
    const els = rows.get(id)!.elements;
    els.set(key(part), { ...(els.get(key(part)) ?? {}), ...styles });
  };
  for (const r of spec.redlines) for (const p of r.parts) into(r.where, p.part, geometryStyles(p.values, root));
  for (const r of spec.type) for (const p of r.parts) into(r.where, p.part, { typography: tokenRef(p.textStyle, 'typography', root) });
  for (const r of spec.colors) for (const p of r.parts) {
    const s: Json = {};
    if (p.fill) s.backgroundColor = tokenRef(p.fill, 'color', root);
    if (p.stroke) s.strokes = tokenRef(p.stroke, 'color', root);
    if (p.ink) s.textColor = tokenRef(p.ink, 'color', root);
    if (p.icon) s.fillColor = tokenRef(p.icon, 'color', root);
    into(r.where, p.part, s);
  }
  const elements = (m: Map<string, Json> | undefined): Json => Object.fromEntries([...(m ?? new Map())].map(([k, styles]) => [k, { styles }]));
  const dflt = rows.get('');
  const variants = [...rows.entries()].filter(([id]) => id !== '').map(([, r]) => ({ configuration: { ...r.where }, elements: elements(r.elements) }));
  return {
    title: def.name,
    anatomy,
    props,
    default: { configuration: { ...defaultCoord }, layout, elements: elements(dflt?.elements) },
    ...(variants.length ? { variants } : {}),
  };
};

/** The whole export as a Specs components set (`components.schema.json`): `{ components: { <id>: Component } }`. */
export const toSpecsComponents = (doc: ComponentDefsExport): { components: Record<string, Json> } => ({
  components: Object.fromEntries(Object.entries(doc.components).map(([id, e]) => [id, toSpecsComponent(e, doc.brand ? doc.brand.root : null)])),
});

/** The file names an export is written under: `component-defs.json` brand-neutral, `<brand>.component-defs.json` for a brand. */
export const componentDefsFileNames = (brandId: string | null): { defs: string; specs: string } => {
  const stem = brandId ? `${brandId}.component-defs` : 'component-defs';
  return { defs: `${stem}.json`, specs: `${stem}.specs.json` };
};
