/**
 * Prism3 — THE FIGMA CONVENTIONS FILE (#2647, owner Q306.2 A). Writes `docs/public/reference/figma-conventions.json`,
 * the machine-readable account of how a Prism3 Figma file is laid out and named, so a spec tool, the rebind skill,
 * TokenPress or an agent can read one correctly without reading the engine.
 *
 *   npx tsx packages/engine/emit-figma-conventions.ts            # write the conventions file
 *   npx tsx packages/engine/emit-figma-conventions.ts --check    # fail (exit 1) if it no longer matches the code
 *
 * READ FROM THE CODE, NEVER FROM PROSE. Each section comes from the module that decides it:
 *
 *   · pages — `TAXONOMY` and `NEST_PREFIX` in `apps/plugin/src/file-taxonomy.ts`, the data `file-setup.ts` and the
 *     page-aware build both read.
 *   · components — the projector itself: `figmaAnatomySet` and `planSetProperties` in `anatomy-figma.ts` over every
 *     def in `componentDefs`, so a set's name, its variant properties and its other properties are the ones the
 *     plugin writes. Code-only axes and states are the def's `variants` and `states` that `figmaProperties` does
 *     not project (`component-schema.ts` refuses any that `anatomy.codeOnly` does not admit).
 *   · icons — `ICON_DEF_ID`, `iconComponentName` and `ICON_INSET_CHILD`, and the glyphs the icon def's plans build.
 *   · native slots — every `SLOT` property `planSetProperties` declares, with its settings and preferred defs.
 *   · variables — `figmaArtifacts` over the canonical default theme (`examples/prism3.design.md`), the function
 *     `emit-figma.ts` writes `out/figma/**` with, so each collection and mode is one the plugin creates. The name
 *     shape comes from `CORE_TIER`, and the default root is the one `brandTheme` gives the same input with its root
 *     removed.
 *   · canvas furniture — `CANVAS_FURNITURE`, the template names in `furniture-templates.ts` and
 *     `file-components.ts`, and the shared plugin data tag in `canvas-furniture.ts`; the usage panel's tag
 *     (`doc-panel.ts`) and its `_Doc-block` template's properties (`doc-block.ts`).
 *
 * The one authored part is each section's `rule`: a sentence saying what the data means. It states what the cited
 * code enforces and nothing beyond it.
 *
 * A `regen.ts` STEP AND ITS OWN GATE. Every component PR moves this file, so regen writes it: the documented path
 * (regen, then commit) keeps it current without a second command. It sits in its own regen list,
 * `REFERENCE_ARTIFACTS`, as the analysis reports do in theirs: it is documentation served by the studio, it carries
 * no engine version, and the lists `lint-emission-version.ts` reads would otherwise demand an engine bump for a
 * reworded rule. `regen.ts --check` says the file drifted; `--check` here says which convention moved.
 *
 * INDEPENDENCE (docs/34). The expected value is the committed file; the actual is the code read now. The generator
 * never reads the committed file to decide what to write, so a page renamed in `TAXONOMY`, a def added, a collection
 * renamed in the emitter or a template renamed fails `--check` by name until the file is regenerated and the change
 * reviewed in the diff. `--check` also fails by name when a promised section comes out empty, so a source that stops
 * yielding data cannot pass as a smaller file.
 *
 * STATED LIMITS. A def's code-only PROPS are not listed: the schema has no field that links a prop to the Figma
 * property that carries it, and `anatomy.codeOnly` admits them in prose. The file lists the code-only axes and
 * states, which the schema does link, and points at each def's component doc for the rest. Mode names are the
 * default theme's: a brand that opts out of a mode (dark, high contrast) emits fewer.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components/index';
import { figmaAnatomySet, planSetProperties, planComponentName, ICON_DEF_ID, iconComponentName, ICON_INSET_CHILD, CANVAS_FURNITURE } from './anatomy-figma';
import { figmaArtifacts } from './emit-figma';
import { brandTheme, CORE_TIER } from './theme';
import { parseDesignMd } from './design-md';
import { TAXONOMY, NEST_PREFIX, leafPageName, leafForDef } from '../../apps/plugin/src/file-taxonomy';
import { LABEL_SET, BACKDROP_COMPONENT, SCRIM_COMPONENT, BRACKET_PROPERTY, LABEL_PLACEMENTS, LABEL_SURFACES, BACKDROP_VARIABLE, SCRIM_VARIABLE } from '../../apps/plugin/src/furniture-templates';
import { SECTION_HEADER_SET, HEADINGS_SET } from '../../apps/plugin/src/file-components';
import { FURNITURE_NS, FURNITURE_KEY } from '../../apps/plugin/src/canvas-furniture';
import { ABOUT_NS, ABOUT_KEY, ABOUT_NAME } from '../../apps/plugin/src/about-frame';
import { DOC_BLOCK_SET, DOC_BLOCK_TYPES, DOC_BLOCK_SIZES, TOP_PADDING, BOTTOM_PADDING, CAPTION, SPECIMEN } from '../../apps/plugin/src/doc-block';
import { DOC_PANEL_NS, DOC_PANEL_KEY } from '../../apps/plugin/src/doc-panel';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
export const CONVENTIONS = 'docs/public/reference/figma-conventions.json';

const TAXONOMY_SRC = 'apps/plugin/src/file-taxonomy.ts';
const ANATOMY_SRC = 'packages/engine/anatomy-figma.ts';
const SCHEMA_SRC = 'packages/engine/component-schema.ts';
const TEMPLATES_SRC = 'apps/plugin/src/furniture-templates.ts';
const FILE_COMPONENTS_SRC = 'apps/plugin/src/file-components.ts';
const FURNITURE_SRC = 'apps/plugin/src/canvas-furniture.ts';
const ABOUT_SRC = 'apps/plugin/src/about-frame.ts';
const DOC_BLOCK_SRC = 'apps/plugin/src/doc-block.ts';
const DOC_PANEL_SRC = 'apps/plugin/src/doc-panel.ts';
/** The theme the studio and plugin open with (#1296); `emit-figma.ts` writes it to `out/figma/prism3/`. */
const DEFAULT_THEME_SRC = 'packages/engine/examples/prism3.design.md';

/** `file#anchor`, once `anchorText` appears in the file: a source the file cannot point at is a defect. */
const src = (p: string, anchorText: string): string => {
  if (!readFileSync(join(repo, p), 'utf8').includes(anchorText)) throw new Error(`emit-figma-conventions: ${p} no longer contains ${JSON.stringify(anchorText)}`);
  return `${p}#${anchorText}`;
};

/* ── pages ───────────────────────────────────────────────────────────────────────────────────────────── */

const pages = () => ({
  rule: `The cover page comes first. Each section is a native page divider, then an empty header page named for the section, then its component pages. A component page's name starts with "${NEST_PREFIX}"; the cover and the section headers have no prefix.`,
  source: src(TAXONOMY_SRC, 'export const TAXONOMY'),
  cover: TAXONOMY.cover,
  prefix: NEST_PREFIX,
  sections: TAXONOMY.sections.map((s) => ({
    header: s.header,
    order: s.alphabetical ? 'alphabetical' : 'as listed',
    pages: s.leaves.map((l) => ({
      name: leafPageName(l),
      ...(l.defs.length ? { components: [...l.defs] } : {}),
      ...(l.fileComponents ? { holds: 'the file\'s own template components' } : {}),
    })),
  })),
});

/* ── components ──────────────────────────────────────────────────────────────────────────────────────── */

/** Figma's variant name syntax, `key=value, key=value`, read back into ordered axes and their values. */
const variantProperties = (names: string[]): Array<{ name: string; values: string[] }> => {
  const axes = new Map<string, string[]>();
  for (const n of names) for (const pair of n.split(', ')) {
    const i = pair.indexOf('=');
    if (i < 0) continue;
    const k = pair.slice(0, i);
    const v = pair.slice(i + 1);
    const vals = axes.get(k) ?? [];
    if (!vals.includes(v)) vals.push(v);
    axes.set(k, vals);
  }
  return [...axes].map(([name, values]) => ({ name, values }));
};

const plansOf = new Map(componentDefs.map((d) => [d.id, figmaAnatomySet(d)]));

const component = (d: (typeof componentDefs)[number]) => {
  const plans = plansOf.get(d.id)!;
  const placed = leafForDef(d.id);
  const props = planSetProperties(plans);
  const fp = d.figmaProperties;
  const projectedAxes = new Set(fp?.variantAxes ?? []);
  const projectedStates = new Set(fp?.stateAxis?.values ?? []);
  const codeOnlyAxes = Object.keys(d.variants ?? {}).filter((a) => !projectedAxes.has(a));
  const codeOnlyStates = (d.states ?? []).filter((s) => !projectedStates.has(s));
  return {
    id: d.id,
    name: d.name,
    figmaName: d.emitAsComponents ? `${d.id}/<value>` : d.id,
    kind: d.emitAsComponents ? 'components' : 'component set',
    ...(d.id.startsWith('_') ? { private: true } : {}),
    page: placed ? leafPageName(placed.leaf) : null,
    section: placed ? placed.section.header : null,
    members: plans.length,
    variantProperties: variantProperties(plans.map(planComponentName)),
    properties: props.filter((p) => p.type !== 'SLOT').map((p) => ({ name: p.name, type: p.type, ...(p.type === 'INSTANCE_SWAP' ? { swapTarget: p.swapTarget } : {}) })),
    ...(codeOnlyAxes.length || codeOnlyStates.length ? { codeOnly: { ...(codeOnlyAxes.length ? { axes: codeOnlyAxes } : {}), ...(codeOnlyStates.length ? { states: codeOnlyStates } : {}) } } : {}),
    doc: `https://github.com/adamforrester/prism3/blob/main/packages/engine/out/components/${d.id}.md`,
  };
};

const components = () => ({
  rule: 'A component set is named for its def id, and each member for its variant values in Figma\'s `key=value, key=value` form. A def that builds single components names each `<id>/<value>`.',
  source: src(ANATOMY_SRC, 'export const planComponentName'),
  privatePrefix: {
    prefix: '_',
    rule: 'A def id that starts with "_" is a building block: it is only ever nested inside another component, and Figma leaves it out of a published library because of the prefix.',
    source: src(SCHEMA_SRC, "optionally led by '_' for a building block"),
  },
  placement: {
    rule: 'A component builds onto the one page its family maps to in the taxonomy. A building block made for one component sits on that component\'s page. The Subcomponents section holds the parts placed there to be nested or swapped in elsewhere. Section membership is set in the taxonomy, not derived from what nests what.',
    source: src(TAXONOMY_SRC, 'export const leafForDef'),
  },
  codeOnly: {
    rule: 'An axis or state listed under a component\'s `codeOnly` exists in code and has no Figma variant; the component doc says why. Code-only props are named in the same doc, not here.',
    source: src(SCHEMA_SRC, 'codeOnly: string[]'),
  },
  list: componentDefs.map(component),
});

/* ── icons ───────────────────────────────────────────────────────────────────────────────────────────── */

const icons = () => {
  const plans = plansOf.get(ICON_DEF_ID) ?? [];
  const glyphs = plans.map((p) => String(p.coord.name ?? '')).filter(Boolean);
  const placed = leafForDef(ICON_DEF_ID);
  return {
    rule: `Each glyph is its own component named "${iconComponentName('<glyph>')}". A glyph inside another component is an instance of one of them; where a part wraps it in a frame, the instance's layer is named "${ICON_INSET_CHILD}".`,
    source: src(ANATOMY_SRC, 'export const iconComponentName'),
    namespace: iconComponentName(''),
    insetLayer: ICON_INSET_CHILD,
    page: placed ? leafPageName(placed.leaf) : null,
    glyphs,
  };
};

/* ── native slots ────────────────────────────────────────────────────────────────────────────────────── */

const nativeSlots = () => ({
  rule: 'A native slot is a region a designer fills in place on an instance. The set has one SLOT property named for the part. Its default content is a placeholder, and text inside it is literal: Figma accepts no component property on a slot sublayer. Settings left out take Figma\'s defaults: no child limit, any content, default content shown.',
  source: src(SCHEMA_SRC, 'contentSlot?: true'),
  slots: componentDefs.flatMap((d) => planSetProperties(plansOf.get(d.id)!).flatMap((p) => p.type === 'SLOT'
    ? [{ component: d.id, property: p.name, ...(p.slotSettings ? { settings: p.slotSettings } : {}), ...(p.preferred?.length ? { preferred: p.preferred } : {}) }]
    : [])),
});

/* ── variables ───────────────────────────────────────────────────────────────────────────────────────── */

const variables = () => {
  const input = parseDesignMd(readFileSync(join(repo, DEFAULT_THEME_SRC), 'utf8')).input;
  const theme = brandTheme(input);
  // The root an input that declares none gets, asked of `brandTheme` itself rather than read off its source text.
  const fallbackRoot = brandTheme({ ...input, root: undefined }).root;
  const byName = new Map<string, { kind: string; modes: string[] }>();
  for (const a of figmaArtifacts(theme).artifacts) {
    const c = JSON.parse(a.content) as { $collection?: string; $mode?: string; variables?: unknown; styles?: unknown };
    if (!c.$collection) continue;
    const kind = Array.isArray(c.variables) ? 'variables' : 'styles';
    const e = byName.get(c.$collection) ?? { kind, modes: [] };
    if (c.$mode && !e.modes.includes(c.$mode)) e.modes.push(c.$mode);
    byName.set(c.$collection, e);
  }
  const collections = [...byName].filter(([, e]) => e.kind === 'variables').map(([name, e]) => ({ name, modes: e.modes }));
  const styles = [...byName].filter(([, e]) => e.kind === 'styles').map(([name]) => name);
  return {
    rule: `Every variable is named "<root>/<path>", the token's path below the brand root with "/" for ".". Primitives carry the "${CORE_TIER}" tier after the root: "<root>/${CORE_TIER}/<group>/…". Style names carry neither the root nor the tier. The root is the brand's own; an input that declares none gets "${fallbackRoot}".`,
    source: src('packages/engine/emit-figma.ts', 'EVERY VARIABLE NAME NOW CARRIES THE BRAND ROOT'),
    rootDefault: { root: fallbackRoot, source: src('packages/engine/theme.ts', 'const root = input.root ??') },
    primitiveTier: CORE_TIER,
    modesFrom: { theme: 'the default theme', source: DEFAULT_THEME_SRC },
    collections,
    styleFiles: styles,
  };
};

/* ── canvas furniture ────────────────────────────────────────────────────────────────────────────────── */

const furniture = () => ({
  rule: `Canvas furniture is drawn around a component set on its page and is never part of the set: label instances for its rows and columns, and backdrops behind its inverse or modal members. Each instance carries shared plugin data under namespace "${FURNITURE_NS}", key "${FURNITURE_KEY}", so a reader can skip it.`,
  source: src(FURNITURE_SRC, 'export const FURNITURE_KEY'),
  tag: { namespace: FURNITURE_NS, key: FURNITURE_KEY },
  components: [...CANVAS_FURNITURE],
  templates: [
    { name: LABEL_SET, variantProperties: [{ name: 'Text', values: [...LABEL_PLACEMENTS] }, { name: 'surface', values: [...LABEL_SURFACES] }], properties: [{ name: BRACKET_PROPERTY, type: 'BOOLEAN' }], source: src(TEMPLATES_SRC, 'export const LABEL_SET') },
    { name: BACKDROP_COMPONENT, binds: `<root>/${BACKDROP_VARIABLE}`, source: src(TEMPLATES_SRC, 'export const BACKDROP_COMPONENT') },
    { name: SCRIM_COMPONENT, binds: `<root>/${SCRIM_VARIABLE}`, source: src(TEMPLATES_SRC, 'export const SCRIM_COMPONENT') },
  ],
  aboutFrame: {
    rule: `The Cover page carries one "${ABOUT_NAME}" frame beside the file's thumbnail: the engine and token contract versions, the date of the last Update, and what changed in the latest release. Every Update that writes redraws it. It carries shared plugin data under namespace "${ABOUT_NS}", key "${ABOUT_KEY}", so a reader can skip it; a copy a designer edited is renamed "${ABOUT_NAME} (edited)" and loses the tag.`,
    name: ABOUT_NAME,
    tag: { namespace: ABOUT_NS, key: ABOUT_KEY },
    source: src(ABOUT_SRC, 'export const ABOUT_KEY'),
  },
  usagePanel: {
    rule: `A usage panel is a frame drawn beside each component set, right of it, from the component's usage docs, and is never part of the set. It carries shared plugin data under namespace "${DOC_PANEL_NS}", key "${DOC_PANEL_KEY}": state "live" for the panel the plugin redraws, "kept" for one a designer edited, which the plugin keeps aside and never removes.`,
    source: src(DOC_PANEL_SRC, 'export const DOC_PANEL_KEY'),
    tag: { namespace: DOC_PANEL_NS, key: DOC_PANEL_KEY },
    template: {
      name: DOC_BLOCK_SET,
      variantProperties: [{ name: 'Type', values: [...DOC_BLOCK_TYPES] }, { name: 'Size', values: [...DOC_BLOCK_SIZES] }],
      properties: [{ name: TOP_PADDING, type: 'BOOLEAN' }, { name: BOTTOM_PADDING, type: 'BOOLEAN' }, { name: CAPTION, type: 'BOOLEAN' }, { name: SPECIMEN, type: 'INSTANCE_SWAP' }],
      source: src(DOC_BLOCK_SRC, 'export const DOC_BLOCK_SET'),
    },
  },
  fileTemplates: {
    rule: 'Page headers are instances of these sets. They live on the Sandbox section\'s file components page with the furniture templates, and their names start with "_" so a library leaves them out.',
    names: [SECTION_HEADER_SET, HEADINGS_SET],
    source: src(FILE_COMPONENTS_SRC, 'export const SECTION_HEADER_SET'),
  },
});

/* ── the file ────────────────────────────────────────────────────────────────────────────────────────── */

export const buildConventions = () => {
  return {
    about: 'How a Prism3 Figma file is laid out and named: pages, components, icons, native slots, variables and canvas furniture. Generated from the code; do not edit by hand.',
    generatedBy: 'npx tsx packages/engine/emit-figma-conventions.ts',
    checkedBy: 'npx tsx packages/engine/emit-figma-conventions.ts --check',
    pages: pages(),
    components: components(),
    icons: icons(),
    nativeSlots: nativeSlots(),
    variables: variables(),
    canvasFurniture: furniture(),
  };
};

export const serialize = (c: unknown): string => JSON.stringify(c, null, 2) + '\n';

/** The sections the file promises, each with the list that must not come out empty (docs/34: represented, not counted). */
const PROMISED: Record<string, (c: any) => unknown[]> = {
  'pages.sections': (c) => c?.pages?.sections ?? [],
  'components.list': (c) => c?.components?.list ?? [],
  'icons.glyphs': (c) => c?.icons?.glyphs ?? [],
  'nativeSlots.slots': (c) => c?.nativeSlots?.slots ?? [],
  'variables.collections': (c) => c?.variables?.collections ?? [],
  'canvasFurniture.templates': (c) => c?.canvasFurniture?.templates ?? [],
};
export const emptySections = (c: unknown): string[] =>
  Object.entries(PROMISED).filter(([, get]) => !get(c).length).map(([k]) => `${k} is empty — its source yields nothing`);

/** The names a reader can lose, one per convention entry. A diff on these is reported by name. */
const names = (c: any): Map<string, string> => {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(c ?? {})) if (v && typeof v === 'object' && 'rule' in (v as object)) m.set(`${k} rule`, JSON.stringify((v as any).rule));
  m.set('pages prefix', JSON.stringify(c?.pages?.prefix));
  m.set('pages cover', JSON.stringify(c?.pages?.cover));
  for (const s of c?.pages?.sections ?? []) {
    m.set(`section ${s.header}`, JSON.stringify({ order: s.order }));
    for (const p of s.pages ?? []) m.set(`page ${p.name}`, JSON.stringify({ section: s.header, ...p }));
  }
  for (const x of c?.components?.list ?? []) m.set(`component ${x.id}`, JSON.stringify(x));
  for (const g of c?.icons?.glyphs ?? []) m.set(`icon ${c.icons.namespace}${g}`, '1');
  m.set('icons namespace', JSON.stringify([c?.icons?.namespace, c?.icons?.insetLayer, c?.icons?.page]));
  for (const s of c?.nativeSlots?.slots ?? []) m.set(`slot ${s.component}.${s.property}`, JSON.stringify(s));
  m.set('variables root default', JSON.stringify(c?.variables?.rootDefault?.root));
  m.set('variables primitive tier', JSON.stringify(c?.variables?.primitiveTier));
  for (const x of c?.variables?.collections ?? []) m.set(`collection ${x.name}`, JSON.stringify(x.modes));
  for (const x of c?.variables?.styleFiles ?? []) m.set(`style file ${x}`, '1');
  m.set('furniture tag', JSON.stringify(c?.canvasFurniture?.tag));
  for (const x of c?.canvasFurniture?.components ?? []) m.set(`furniture on ${x}`, '1');
  for (const t of c?.canvasFurniture?.templates ?? []) m.set(`furniture template ${t.name}`, JSON.stringify(t));
  m.set('usage panel', JSON.stringify(c?.canvasFurniture?.usagePanel));
  for (const t of c?.canvasFurniture?.fileTemplates?.names ?? []) m.set(`file template ${t}`, '1');
  return m;
};

export const diffByName = (committed: unknown, fresh: unknown): string[] => {
  const a = names(committed);
  const b = names(fresh);
  const out: string[] = [];
  for (const [k, v] of b) if (!a.has(k)) out.push(`in the code, missing from the file: ${k}`); else if (a.get(k) !== v) out.push(`changed in the code: ${k}`);
  for (const k of a.keys()) if (!b.has(k)) out.push(`in the file, gone from the code: ${k}`);
  return out;
};

const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const target = join(repo, CONVENTIONS);
  let fresh: string;
  try { fresh = serialize(buildConventions()); } catch (e) { console.error(`❌ ${(e as Error).message}`); process.exit(1); }
  const empty = emptySections(JSON.parse(fresh));
  if (empty.length) {
    console.error(`❌ ${CONVENTIONS}: a promised section came out empty:`);
    for (const e of empty) console.error(`    ${e}`);
    process.exit(1);
  }
  if (process.argv.includes('--check')) {
    const committed = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (committed === fresh) {
      const c = JSON.parse(fresh);
      const pageCount = c.pages.sections.reduce((n: number, s: { pages: unknown[] }) => n + s.pages.length, 0);
      console.log(`✓ ${CONVENTIONS} matches the code — ${pageCount} pages over ${c.pages.sections.length} sections, ${c.components.list.length} components, ${c.icons.glyphs.length} glyphs, ${c.nativeSlots.slots.length} native slots, ${c.variables.collections.length} variable collections, ${c.canvasFurniture.templates.length} furniture templates`);
      process.exit(0);
    }
    let byName: string[] = [];
    try { byName = diffByName(committed ? JSON.parse(committed) : {}, JSON.parse(fresh)); } catch { byName = ['the committed file is not valid JSON']; }
    console.error(`❌ ${CONVENTIONS} does not match the code:`);
    for (const d of byName.length ? byName : ['the bytes differ outside any named entry (top-level fields or ordering)']) console.error(`    ${d}`);
    console.error(`\n  Regenerate with \`npx tsx packages/engine/emit-figma-conventions.ts\`, then review the diff.`);
    process.exit(1);
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, fresh);
  console.log(`wrote ${CONVENTIONS}`);
}
