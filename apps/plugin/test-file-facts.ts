/**
 * The file facts scan (#2075 part 1), run through the plugin adapter against the plugin's test shims.
 *
 *   npx tsx apps/plugin/test-file-facts.ts
 *
 * Three files, each built here with `FileShim` (variables and styles) and `NodeShim` (pages and layers, every write
 * logged): one with variables, modes and aliases; one with styles only; one with raw values only. Each scans through
 * `scanOpenFile`, the function the plugin calls, and the report is checked against counts and bindings written here.
 *
 * INDEPENDENCE (docs/34). Every expected number below is written by hand from the fixture, never read from the
 * scanner or derived from the fixture by code: the scanner computes the actual side, this file states the expected.
 * The schema check is independent the same way: `schema/file-facts.schema.json` is authored, not generated.
 *
 * READ-ONLY. `NodeShim` logs every property write and every call to a method that changes a node; the suite fails if
 * the scan leaves anything in that log, or changes the number of variables or styles.
 *
 * Mutations this fails by name (each applied to `packages/engine/file-facts.ts` in turn):
 *   · alias resolution dropped (`resolveValue` returns the stored value without following it) →
 *     `vars/button background light resolves through two aliases` and the other chain checks;
 *   · cross-collection default mode ignored (the mode id carried across collections) →
 *     `vars/button background dark crosses into primitives' default mode`;
 *   · style precedence reversed (a paint's variable read before the layer's style) →
 *     `vars/a fill style whose paint is bound to a variable is the style's`;
 *   · the icon rule dropped (`ICON_WORD` never matches) → `raw/a layer named as an icon is an icon`;
 *   · hidden layers walked → `vars/coverage`;
 *   · per-layer dedupe dropped (`seen` ignored) → `vars/spacing: one layer, four equal paddings, one use`;
 *   · a layer's counts committed before every read succeeds (`pending` flushed as it fills) →
 *     `partway/the fill read before the throw is not kept`;
 *   · an unreadable layer's children left unwalked → `partway/coverage: the layer unread, its two children read`;
 *   · `localDefs.components++` or `localDefs.componentSets++` written eagerly, outside `pending` →
 *     `partway definitions/an unread component and set count no local definition`;
 *   · `missingMain++` written eagerly → `partway definitions/an unread main-less instance counts no missing main`;
 *     never committed → `partway definitions/a readable main-less instance counts one missing main`;
 *   · `btn` or `cta` dropped from `BUTTON_WORD` → `button words/a frame named "btn" is button-like; …` (or "cta").
 *   · the usage-row sort dropped (comparator `0`, walk order kept) → `order/paints: most-used first, a tie by color`;
 *   · the components sort dropped → `order/components: most-used first, a tie by name`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileShim, NodeShim, type NodeSpec } from './file-shim';
import { scanOpenFile, type FactsHost } from './src/file-facts-figma';
import { validate } from '../../packages/engine/json-schema-lite';
import { FILE_FACTS_FORMAT, scanFileFacts, sourceFromSnapshot, type Binding, type FactsNode, type FileFactsReport } from '../../packages/engine/file-facts';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string, detail?: unknown): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail === undefined ? '' : `\n      got: ${JSON.stringify(detail)}`}`); }
};
const section = (s: string): void => console.log(`\n${s}`);
const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA = JSON.parse(readFileSync(resolve(here, '../../packages/engine/schema/file-facts.schema.json'), 'utf8'));

type Library = { collections?: any[]; variables?: any[]; styles?: any[] };
/** The host slice the adapter reads, over the two shims plus a hand-written library. */
const hostOf = (file: FileShim, nodes: NodeShim, lib: Library = {}): FactsHost => {
  const localStyles = (): any[] => [...file.styles.paint, ...file.styles.text, ...file.styles.effect, ...file.styles.grid];
  return {
    variables: {
      getLocalVariableCollectionsAsync: () => file.getLocalVariableCollectionsAsync(),
      getLocalVariablesAsync: () => file.getLocalVariablesAsync(),
      getVariableByIdAsync: async (id) => file.vars.find((v) => v.id === id) ?? lib.variables?.find((v) => v.id === id) ?? null,
      getVariableCollectionByIdAsync: async (id) => file.collections.find((c) => c.id === id) ?? lib.collections?.find((c) => c.id === id) ?? null,
    },
    getLocalPaintStylesAsync: () => file.getLocalPaintStylesAsync(),
    getLocalTextStylesAsync: () => file.getLocalTextStylesAsync(),
    getLocalEffectStylesAsync: () => file.getLocalEffectStylesAsync(),
    getLocalGridStylesAsync: () => file.getLocalGridStylesAsync(),
    getStyleByIdAsync: async (id) => localStyles().find((s) => s.id === id) ?? lib.styles?.find((s) => s.id === id) ?? null,
    root: { children: nodes.pages },
  };
};

const alias = (v: { id: string }) => ({ type: 'VARIABLE_ALIAS', id: v.id });
const solid = (r: number, g: number, b: number, extra: Record<string, unknown> = {}) => ({ type: 'SOLID', visible: true, opacity: 1, color: { r, g, b }, ...extra });
const BLUE = { r: 0, g: 0.4, b: 1 };          // #0066ff
const GRAY = { r: 0.1, g: 0.1, b: 0.1 };      // #1a1a1a
const WHITE = { r: 1, g: 1, b: 1 };           // #ffffff

const paintRow = (r: FileFactsReport, property: string, role: string, color: string | null, kind: Binding['kind'], name?: string) =>
  r.usage.paints.filter((p) => p.property === property && p.role === role && p.color === color && p.binding.kind === kind && (name === undefined || ('name' in p.binding && p.binding.name === name)));
const one = <T>(rows: T[]): T | undefined => (rows.length === 1 ? rows[0] : undefined);
const counts = (row: { layers: number; inInstances: number } | undefined) => (row ? [row.layers, row.inInstances] : null);
const typeRow = (rows: FileFactsReport['usage']['typography']['fontFamilies'], value: string | number, kind: Binding['kind']) =>
  one(rows.filter((x) => x.value === value && x.binding.kind === kind));

/** Scan, then check what every report owes: the schema, determinism, and no writes. */
const scan = async (label: string, file: FileShim, nodes: NodeShim, lib?: Library): Promise<FileFactsReport> => {
  const before = { vars: file.vars.length, colls: file.collections.length, styles: Object.values(file.styles).flat().length };
  const report = await scanOpenFile(hostOf(file, nodes, lib));
  const again = await scanOpenFile(hostOf(file, nodes, lib));
  const errors = validate(SCHEMA, report);
  ok(errors.length === 0, `${label}/the report matches schema/file-facts.schema.json`, errors.slice(0, 5));
  ok(report.format === FILE_FACTS_FORMAT && SCHEMA.$id === FILE_FACTS_FORMAT, `${label}/format equals the schema's $id`);
  ok(JSON.stringify(report) === JSON.stringify(again), `${label}/two scans of one file are byte-identical`);
  ok(nodes.writes.length === 0, `${label}/the scan wrote nothing to a layer`, nodes.writes);
  const after = { vars: file.vars.length, colls: file.collections.length, styles: Object.values(file.styles).flat().length };
  ok(eq(before, after), `${label}/the scan created and removed no variable, collection or style`, after);
  return report;
};

/* ── fixture 1: variables, modes and aliases ───────────────────────────────────────────────────────────────────────── */
section('vars — a file with variables, modes and aliases');
{
  const file = new FileShim();
  const prim = file.createVariableCollection('primitives');
  prim.renameMode(prim.modes[0].modeId, 'value');
  const pm = prim.modes[0].modeId;
  const blue = file.createVariable('blue/500', prim, 'COLOR'); blue.setValueForMode(pm, { ...BLUE, a: 1 }); blue.description = 'Brand blue';
  const gray = file.createVariable('gray/900', prim, 'COLOR'); gray.setValueForMode(pm, { ...GRAY, a: 1 });
  const space4 = file.createVariable('space/4', prim, 'FLOAT'); space4.setValueForMode(pm, 16); space4.scopes = ['WIDTH_HEIGHT', 'GAP'];
  const radiusMd = file.createVariable('radius/md', prim, 'FLOAT'); radiusMd.setValueForMode(pm, 8);
  const sem = file.createVariableCollection('semantic');
  sem.renameMode(sem.modes[0].modeId, 'light');
  const light = sem.modes[0].modeId;
  const dark = sem.addMode('dark');
  const actionBg = file.createVariable('action/background', sem, 'COLOR'); actionBg.setValueForMode(light, alias(blue)); actionBg.setValueForMode(dark, alias(gray));
  const textPrimary = file.createVariable('text/primary', sem, 'COLOR'); textPrimary.setValueForMode(light, alias(gray)); textPrimary.setValueForMode(dark, { ...WHITE, a: 1 });
  const buttonBg = file.createVariable('button/background', sem, 'COLOR'); buttonBg.setValueForMode(light, alias(actionBg)); buttonBg.setValueForMode(dark, alias(actionBg));
  const loopA = file.createVariable('loop/a', sem, 'FLOAT');
  const loopB = file.createVariable('loop/b', sem, 'FLOAT');
  loopA.setValueForMode(light, alias(loopB)); loopA.setValueForMode(dark, 1);
  loopB.setValueForMode(light, alias(loopA)); loopB.setValueForMode(dark, 2);
  const broken = file.createVariable('broken', sem, 'FLOAT'); broken.setValueForMode(light, { type: 'VARIABLE_ALIAS', id: 'VariableID:gone' }); broken.setValueForMode(dark, 3);

  // A paint style whose own paint is bound to a variable: a layer using it is the style's.
  const actionStyle = file.createPaintStyle(); actionStyle.name = 'Action'; actionStyle.paints = [solid(BLUE.r, BLUE.g, BLUE.b, { boundVariables: { color: alias(actionBg) } })];
  const lib: Library = {
    collections: [{ id: 'lib:coll', name: 'Brand library', key: 'key-coll', remote: true, modes: [{ modeId: 'lib:m', name: 'default' }], defaultModeId: 'lib:m' }],
    variables: [{ id: 'lib:accent', name: 'accent', key: 'key-accent', remote: true, variableCollectionId: 'lib:coll', resolvedType: 'COLOR', valuesByMode: { 'lib:m': { r: 1, g: 0.5, b: 0, a: 1 } }, scopes: ['ALL_FILLS'], description: '' }],
  };
  const pad = (v: { id: string }) => ({ paddingTop: alias(v), paddingRight: alias(v), paddingBottom: alias(v), paddingLeft: alias(v) });
  const corners = (v: { id: string }) => ({ topLeftRadius: alias(v), topRightRadius: alias(v), bottomRightRadius: alias(v), bottomLeftRadius: alias(v) });
  const pages: NodeSpec[] = [{ id: 'p:screens', type: 'PAGE', name: 'Screens', children: [{
    id: 'card', type: 'FRAME', name: 'Card', fills: [solid(1, 1, 1)],
    layoutMode: 'VERTICAL', itemSpacing: 16, paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16,
    cornerRadius: 8, topLeftRadius: 8, topRightRadius: 8, bottomRightRadius: 8, bottomLeftRadius: 8,
    boundVariables: { itemSpacing: alias(space4), ...pad(space4), ...corners(radiusMd) },
    children: [
      { id: 'button', type: 'FRAME', name: 'Primary Button', fills: [solid(BLUE.r, BLUE.g, BLUE.b, { boundVariables: { color: alias(buttonBg) } })],
        cornerRadius: 8, topLeftRadius: 8, topRightRadius: 8, bottomRightRadius: 8, bottomLeftRadius: 8,
        layoutMode: 'HORIZONTAL', itemSpacing: 8, paddingTop: 12, paddingRight: 24, paddingBottom: 12, paddingLeft: 24,
        children: [{ id: 'label', type: 'TEXT', name: 'Label', fills: [solid(1, 1, 1, { boundVariables: { color: alias(textPrimary) } })],
          fontName: { family: 'Inter', style: 'Bold' }, fontWeight: 700, fontSize: 16, lineHeight: { unit: 'PIXELS', value: 24 }, textStyleId: '' }] },
      { id: 'body', type: 'TEXT', name: 'Body', fills: [solid(GRAY.r, GRAY.g, GRAY.b)],
        fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, fontSize: 14, lineHeight: { unit: 'AUTO' }, textStyleId: '' },
      { id: 'star', type: 'VECTOR', name: 'Star', fills: [solid(1, 0.5, 0, { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'lib:accent' } } })] },
      { id: 'hidden', type: 'RECTANGLE', name: 'Hidden thing', visible: false, fills: [solid(1, 0, 0)],
        children: [{ id: 'hidden-child', type: 'TEXT', name: 'Never read', fills: [solid(1, 0, 0)] }] },
      { id: 'arrow', type: 'INSTANCE', name: 'Arrow', main: 'lib:arrow',
        children: [{ id: 'arrow-vector', type: 'VECTOR', name: 'Vector', fills: [solid(GRAY.r, GRAY.g, GRAY.b, { boundVariables: { color: alias(gray) } })] }] },
      { id: 'panel', type: 'FRAME', name: 'Panel', fillStyleId: actionStyle.id, fills: [solid(BLUE.r, BLUE.g, BLUE.b, { boundVariables: { color: alias(actionBg) } })] },
      { id: 'divider', type: 'RECTANGLE', name: 'Divider', fills: [], strokes: [solid(0.8, 0.8, 0.8)], cornerRadius: 0 },
    ],
  }] }];
  const nodes = new NodeShim(pages);
  // A library component: the main lives in another file, so it is on no page here.
  nodes.byId.set('lib:arrow', { id: 'lib:arrow', name: 'Direction=Right', key: 'key-arrow', remote: true, parent: { type: 'COMPONENT_SET', name: 'Icon', key: 'key-icon-set' } });
  const r = await scan('vars', file, nodes, lib);

  ok(eq(r.coverage, { pages: 1, layers: 9, hiddenLayers: 1, unreadableLayers: 0, textLayers: 2, instances: 1 }), 'vars/coverage', r.coverage);
  ok(eq(r.variables.collections.map((c) => [c.name, c.remote, c.modes.map((m) => m.name), c.defaultMode, c.variables]),
    [['Brand library', true, ['default'], 'default', 1], ['primitives', false, ['value'], 'value', 4], ['semantic', false, ['light', 'dark'], 'light', 6]]),
    'vars/three collections: two local, one library, with their modes', r.variables.collections);
  ok(r.variables.variables.length === 11, 'vars/eleven variables: ten local and the one library variable a layer binds', r.variables.variables.length);
  const v = (name: string) => r.variables.variables.find((x) => x.name === name)!;
  const mode = (name: string, m: string) => v(name).values.find((x) => x.mode === m)!;
  ok(eq(v('blue/500').values.map((x) => [x.mode, x.value, x.resolved]), [['value', '#0066ff', '#0066ff']]) && v('blue/500').description === 'Brand blue',
    'vars/a direct color value, as hex, with its description', v('blue/500'));
  ok(eq(v('space/4').scopes, ['GAP', 'WIDTH_HEIGHT']) && v('space/4').type === 'FLOAT', 'vars/scopes are reported, sorted', v('space/4').scopes);
  ok(eq(mode('action/background', 'light'), { mode: 'light', modeId: light, value: null, alias: { id: blue.id, name: 'blue/500' }, chain: ['blue/500'], resolved: '#0066ff', unresolved: null }),
    'vars/action background light: an alias into primitives, resolved', mode('action/background', 'light'));
  ok(eq(mode('text/primary', 'dark'), { mode: 'dark', modeId: dark, value: '#ffffff', alias: null, chain: [], resolved: '#ffffff', unresolved: null }),
    'vars/text primary dark: a direct value in one mode of an aliased variable', mode('text/primary', 'dark'));
  ok(eq([mode('button/background', 'light').chain, mode('button/background', 'light').resolved], [['action/background', 'blue/500'], '#0066ff']),
    'vars/button background light resolves through two aliases', mode('button/background', 'light'));
  ok(eq([mode('button/background', 'dark').chain, mode('button/background', 'dark').resolved], [['action/background', 'gray/900'], '#1a1a1a']),
    "vars/button background dark crosses into primitives' default mode", mode('button/background', 'dark'));
  ok(eq([mode('loop/a', 'light').chain, mode('loop/a', 'light').unresolved, mode('loop/a', 'light').resolved], [['loop/b', 'loop/a'], 'cycle', null]),
    'vars/an alias loop stops and says cycle', mode('loop/a', 'light'));
  ok(eq([mode('broken', 'light').alias, mode('broken', 'light').unresolved], [{ id: 'VariableID:gone', name: null }, 'missing-variable']),
    'vars/an alias to a variable the file cannot reach says missing-variable', mode('broken', 'light'));
  ok(eq(['button/background', 'text/primary', 'space/4', 'radius/md', 'gray/900', 'accent', 'action/background', 'blue/500'].map((n) => v(n).boundLayers), [1, 1, 1, 1, 1, 1, 1, 0]),
    'vars/bound layers per variable (a layer counts once, however many of its fields bind; a style\'s copied paint counts)', r.variables.variables.map((x) => [x.name, x.boundLayers]));

  ok(eq(counts(one(paintRow(r, 'fill', 'background', '#ffffff', 'raw'))), [1, 0]), 'vars/the card fill: background, raw');
  ok(eq(counts(one(paintRow(r, 'fill', 'button-like', '#0066ff', 'variable', 'button/background'))), [1, 0]), 'vars/the button fill: button-like, bound to button/background');
  ok(eq(counts(one(paintRow(r, 'fill', 'text', '#ffffff', 'variable', 'text/primary'))), [1, 0]), "vars/a label inside a button is text, not button-like");
  ok(eq(counts(one(paintRow(r, 'fill', 'text', '#1a1a1a', 'raw'))), [1, 0]), 'vars/the body text color: raw');
  const accent = one(paintRow(r, 'fill', 'icon', '#ff8000', 'variable', 'accent'));
  ok(eq(counts(accent), [1, 0]) && accent?.binding.kind === 'variable' && accent.binding.remote && accent.binding.collection === 'Brand library',
    'vars/a vector bound to a library variable: icon, variable, remote', accent);
  ok(eq(counts(one(paintRow(r, 'fill', 'icon', '#1a1a1a', 'variable', 'gray/900'))), [1, 1]), 'vars/a vector inside an instance counts in inInstances');
  ok(eq(counts(one(paintRow(r, 'stroke', 'border', '#cccccc', 'raw'))), [1, 0]), 'vars/a stroke is a border');
  const styled = one(paintRow(r, 'fill', 'background', '#0066ff', 'style', 'Action'));
  ok(eq(counts(styled), [1, 0]) && r.usage.paints.filter((p) => p.color === '#0066ff' && p.role === 'background').length === 1,
    "vars/a fill style whose paint is bound to a variable is the style's", r.usage.paints.filter((p) => p.color === '#0066ff'));
  ok(eq(r.styles.paint.map((x) => [x.name, x.layers, x.paints.map((pp: any) => pp.variable)]), [['Action', 1, [actionBg.id]]]), "vars/the style lists its paint's variable", r.styles.paint);
  ok(r.usage.paints.length === 8, 'vars/eight paint rows, the hidden layer not among them', r.usage.paints);
  ok(eq(r.bindingSummary.paints, { variable: 4, style: 1, raw: 3 }), 'vars/paint binding summary', r.bindingSummary.paints);

  ok(eq(r.usage.radii.map((x) => [x.value, x.binding.kind, x.layers]).sort(), [[8, 'raw', 1], [8, 'variable', 1]]), 'vars/radii: the bound card and the raw button; the square divider left out', r.usage.radii);
  ok(eq(counts(one(r.usage.spacing.filter((x) => x.property === 'padding' && x.value === 16 && x.binding.kind === 'variable'))), [1, 0]), 'vars/spacing: one layer, four equal paddings, one use');
  ok(eq(r.bindingSummary.spacing, { variable: 2, style: 0, raw: 3 }), 'vars/spacing binding summary: gap and padding bound on the card; gap and two paddings raw on the button', r.usage.spacing);
  ok(eq(r.bindingSummary.typography, { variable: 0, style: 0, raw: 10 }), 'vars/typography: every text value raw', r.bindingSummary.typography);

  ok(eq(r.components.used.map((c) => [c.set, c.name, c.remote, c.pages, c.layers]), [['Icon', 'Direction=Right', true, ['Screens'], 1]]), 'vars/the library component in use, and where', r.components.used);
  ok(eq(r.libraries.variableCollections.map((c) => [c.name, c.variables, c.boundLayers]), [['Brand library', 1, 1]]), 'vars/libraries: one library collection, one binding');
  ok(eq(r.libraries.components, { components: 1, instances: 1 }), 'vars/libraries: one library component, one instance');
}

/* ── fixture 2: styles only ────────────────────────────────────────────────────────────────────────────────────────── */
section('styles — a file with styles and no variables');
{
  const file = new FileShim();
  const primary = file.createPaintStyle(); primary.name = 'Brand/Primary'; primary.paints = [solid(BLUE.r, BLUE.g, BLUE.b)];
  const surface = file.createPaintStyle(); surface.name = 'Brand/Surface'; surface.paints = [solid(1, 1, 1, { opacity: 0.5 })];
  const body = file.createTextStyle(); body.name = 'Body/MD'; body.fontName = { family: 'Inter', style: 'Regular' }; body.fontSize = 16;
  body.lineHeight = { unit: 'PERCENT', value: 150 }; body.letterSpacing = { unit: 'PIXELS', value: 0 };
  const heading = file.createTextStyle(); heading.name = 'Heading/LG'; heading.fontName = { family: 'Inter', style: 'Bold' }; heading.fontSize = 32;
  heading.lineHeight = { unit: 'PIXELS', value: 40 };
  const shadow = file.createEffectStyle(); shadow.name = 'Shadow/SM';
  shadow.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: true }];
  const grid = file.createGridStyle(); grid.name = 'Grid/12';
  grid.layoutGrids = [{ pattern: 'COLUMNS', count: 12, gutterSize: 24, offset: 0, alignment: 'STRETCH' }];
  const lib: Library = { styles: [{ id: 'S:lib:ink', name: 'Ink/Default', type: 'PAINT', key: 'key-ink', remote: true, description: '', paints: [solid(0, 0, 0)] }] };

  const text = (id: string, name: string, fillStyleId: string, paint: object): NodeSpec => ({
    id, type: 'TEXT', name, textStyleId: body.id, fillStyleId, fills: [paint],
    fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, fontSize: 16, lineHeight: { unit: 'PERCENT', value: 150 },
  });
  const pages: NodeSpec[] = [
    { id: 'p:home', type: 'PAGE', name: 'Home', children: [{
      id: 'hero', type: 'FRAME', name: 'Hero', fillStyleId: surface.id, fills: [solid(1, 1, 1, { opacity: 0.5 })], effectStyleId: shadow.id, gridStyleId: grid.id,
      children: [
        text('title', 'Title', 'S:lib:ink', solid(0, 0, 0)),
        { id: 'cta', type: 'FRAME', name: 'CTA', fillStyleId: primary.id, fills: [solid(BLUE.r, BLUE.g, BLUE.b)] },
        text('caption', 'Caption', primary.id, solid(BLUE.r, BLUE.g, BLUE.b)),
      ],
    }] },
    { id: 'p:about', type: 'PAGE', name: 'About', children: [text('note', 'Note', 'S:lib:ink', solid(0, 0, 0))] },
  ];
  const nodes = new NodeShim(pages);
  const r = await scan('styles', file, nodes, lib);

  ok(r.variables.collections.length === 0 && r.variables.variables.length === 0, 'styles/no variables');
  const layers = (list: { name: string; layers: number }[]) => list.map((s) => [s.name, s.layers]);
  ok(eq(layers(r.styles.paint), [['Brand/Primary', 2], ['Brand/Surface', 1], ['Ink/Default', 2]]), 'styles/paint styles and the layers using each, the library style included', layers(r.styles.paint));
  ok(eq(layers(r.styles.text), [['Body/MD', 3], ['Heading/LG', 0]]), 'styles/text styles: an unused one is listed with 0 layers', layers(r.styles.text));
  ok(eq(layers(r.styles.effect), [['Shadow/SM', 1]]) && eq(layers(r.styles.grid), [['Grid/12', 1]]), 'styles/effect and grid styles counted');
  ok(eq(r.styles.paint.find((s) => s.name === 'Brand/Surface')?.paints.map((p: any) => p.color), ['#ffffff80']), "styles/a paint's opacity folds into the alpha");
  const b = r.styles.text.find((s) => s.name === 'Body/MD')!;
  ok(eq([b.fontFamily, b.fontStyle, b.fontSize, b.lineHeight, b.letterSpacing], ['Inter', 'Regular', 16, '150%', '0px']), 'styles/a text style\'s values', b);
  ok(eq(r.styles.effect[0].effects, [{ type: 'DROP_SHADOW', color: '#00000040', offsetX: 0, offsetY: 2, radius: 4, spread: 0, visible: true }]), "styles/an effect style's values", r.styles.effect[0].effects);
  ok(eq(r.styles.grid[0].grids, [{ pattern: 'COLUMNS', sectionSize: null, count: 12, gutterSize: 24, offset: 0, alignment: 'STRETCH' }]), "styles/a grid style's values", r.styles.grid[0].grids);

  ok(eq(counts(one(paintRow(r, 'fill', 'text', '#000000', 'style', 'Ink/Default'))), [2, 0]), 'styles/text colors through a library style, on two pages');
  ok(eq(counts(one(paintRow(r, 'fill', 'button-like', '#0066ff', 'style', 'Brand/Primary'))), [1, 0]), 'styles/a frame named CTA is button-like');
  ok(eq(counts(one(paintRow(r, 'fill', 'text', '#0066ff', 'style', 'Brand/Primary'))), [1, 0]), 'styles/one style, two roles, two rows');
  ok(eq(counts(one(paintRow(r, 'fill', 'background', '#ffffff80', 'style', 'Brand/Surface'))), [1, 0]), 'styles/the hero fill: background, through a style');
  ok(eq(r.bindingSummary.paints, { variable: 0, style: 5, raw: 0 }), 'styles/every paint through a style', r.bindingSummary.paints);
  ok(eq(r.bindingSummary.typography, { variable: 0, style: 15, raw: 0 }), 'styles/every type value through a text style', r.bindingSummary.typography);
  ok(eq(counts(typeRow(r.usage.typography.fontSizes, 16, 'style')), [3, 0]), 'styles/font size 16 through Body/MD on three layers');
  ok(eq(r.libraries.styles.map((s) => [s.kind, s.remote, s.boundLayers]), [['paint', 1, 2], ['text', 0, 0], ['effect', 0, 0], ['grid', 0, 0]]), 'styles/libraries: one library paint style on two layers', r.libraries.styles);
}

/* ── fixture 3: raw values only ────────────────────────────────────────────────────────────────────────────────────── */
section('raw — a file with no variables and no styles');
{
  const file = new FileShim();
  const MIXED = Symbol('mixed');
  const runs = [
    { fontName: { family: 'Inter', style: 'Bold' }, fontWeight: 700, fontSize: 14, lineHeight: { unit: 'AUTO' }, fills: [solid(1, 1, 1)], fillStyleId: '', textStyleId: '', boundVariables: {} },
    { fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, fontSize: 14, lineHeight: { unit: 'AUTO' }, fills: [solid(1, 1, 1)], fillStyleId: '', textStyleId: '', boundVariables: {} },
  ];
  const pages: NodeSpec[] = [
    { id: 'p:draft', type: 'PAGE', name: 'Draft', children: [{
      id: 'nav', type: 'FRAME', name: 'Nav', fills: [solid(1, 1, 1)], strokes: [solid(0.9, 0.9, 0.9)],
      layoutMode: 'HORIZONTAL', primaryAxisAlignItems: 'SPACE_BETWEEN', itemSpacing: 10, layoutWrap: 'WRAP', counterAxisSpacing: 12,
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      children: [
        { id: 'submit', type: 'INSTANCE', name: 'btn-submit', main: 'comp:default', fills: [solid(BLUE.r, BLUE.g, BLUE.b)],
          cornerRadius: MIXED, topLeftRadius: 4, topRightRadius: 4, bottomRightRadius: 0, bottomLeftRadius: 0,
          children: [{ id: 'submit-text', type: 'TEXT', name: 'Submit', fills: [solid(1, 1, 1)], fontName: MIXED, fontWeight: MIXED, fontSize: 14, lineHeight: { unit: 'AUTO' }, textStyleId: '',
            getStyledTextSegments: () => runs }] },
        { id: 'heading', type: 'TEXT', name: 'Heading', fills: [solid(GRAY.r, GRAY.g, GRAY.b)],
          fontName: { family: 'Georgia', style: 'Bold' }, fontWeight: 700, fontSize: 24, lineHeight: { unit: 'PIXELS', value: 32 }, textStyleId: '' },
        { id: 'search', type: 'ELLIPSE', name: 'icon-search', fills: [solid(GRAY.r, GRAY.g, GRAY.b)] },
      ],
    }] },
    { id: 'p:components', type: 'PAGE', name: 'Components', children: [{
      id: 'set', type: 'COMPONENT_SET', name: 'Button', fills: [],
      children: [{ id: 'comp:default', type: 'COMPONENT', name: 'State=Default', fills: [solid(BLUE.r, BLUE.g, BLUE.b)], cornerRadius: 4, key: 'key-default',
        children: [{ id: 'comp-label', type: 'TEXT', name: 'Label', fills: [solid(1, 1, 1)], fontName: { family: 'Inter', style: 'Regular' }, fontWeight: 400, fontSize: 14, lineHeight: { unit: 'AUTO' }, textStyleId: '' }] }],
    }] },
  ];
  const nodes = new NodeShim(pages);
  const r = await scan('raw', file, nodes);

  ok(eq(r.coverage, { pages: 2, layers: 8, hiddenLayers: 0, unreadableLayers: 0, textLayers: 3, instances: 1 }), 'raw/coverage', r.coverage);
  ok(r.variables.variables.length === 0 && Object.values(r.styles).every((l) => l.length === 0), 'raw/no variables and no styles');
  ok(eq(counts(one(paintRow(r, 'fill', 'button-like', '#0066ff', 'raw'))), [2, 0]), 'raw/an instance named btn and a variant in a set named Button are button-like');
  ok(eq(counts(one(paintRow(r, 'fill', 'text', '#ffffff', 'raw'))), [2, 1]), 'raw/white text on two layers, one inside the instance');
  ok(eq(counts(one(paintRow(r, 'fill', 'icon', '#1a1a1a', 'raw'))), [1, 0]), 'raw/a layer named as an icon is an icon');
  ok(eq(counts(one(paintRow(r, 'fill', 'text', '#1a1a1a', 'raw'))), [1, 0]), 'raw/the same gray on a text layer is text');
  ok(eq(counts(one(paintRow(r, 'stroke', 'border', '#e6e6e6', 'raw'))), [1, 0]) && eq(counts(one(paintRow(r, 'fill', 'background', '#ffffff', 'raw'))), [1, 0]), 'raw/the nav: a background and a border');
  ok(eq(r.bindingSummary, { paints: { variable: 0, style: 0, raw: 8 }, typography: { variable: 0, style: 0, raw: 17 }, radii: { variable: 0, style: 0, raw: 2 }, spacing: { variable: 0, style: 0, raw: 3 } }),
    'raw/every value raw, by category', r.bindingSummary);
  const ty = r.usage.typography;
  ok(eq(counts(typeRow(ty.fontFamilies, 'Inter', 'raw')), [2, 1]) && eq(counts(typeRow(ty.fontFamilies, 'Georgia', 'raw')), [1, 0]), 'raw/families: a mixed layer counts its family once');
  ok(eq(counts(typeRow(ty.fontWeights, 700, 'raw')), [2, 1]) && eq(counts(typeRow(ty.fontWeights, 400, 'raw')), [2, 1]), "raw/weights: a mixed layer's runs count once each");
  ok(eq(counts(typeRow(ty.fontSizes, 14, 'raw')), [2, 1]) && eq(counts(typeRow(ty.lineHeights, '32px', 'raw')), [1, 0]) && eq(counts(typeRow(ty.lineHeights, 'AUTO', 'raw')), [2, 1]), 'raw/sizes and line heights');
  ok(eq(r.usage.radii.map((x) => [x.value, x.layers]), [[4, 2]]), 'raw/radii: a mixed-corner instance and a uniform variant, square corners left out', r.usage.radii);
  ok(eq(r.usage.spacing.map((x) => [x.property, x.value, x.layers]).sort(), [['gap', 'auto', 1], ['padding', 0, 1], ['wrap-gap', 12, 1]]), 'raw/spacing: a space-between gap is auto', r.usage.spacing);
  ok(eq(r.components.used.map((c) => [c.set, c.name, c.remote, c.pages, c.layers]), [['Button', 'State=Default', false, ['Draft'], 1]]), 'raw/a local component in use');
  ok(eq(r.components.localDefinitions, { components: 1, componentSets: 1 }) && r.components.missingMain === 0, 'raw/local definitions');
  ok(eq(r.libraries, { variableCollections: [], styles: [['paint'], ['text'], ['effect'], ['grid']].map(([kind]) => ({ kind, remote: 0, boundLayers: 0 })), components: { components: 0, instances: 0 } }), 'raw/nothing from a library');
}

/* ── an unreadable layer is skipped and counted, not thrown ────────────────────────────────────────────────────────── */
section('unreadable — a layer whose properties throw');
{
  const nodes = new NodeShim([{ id: 'p', type: 'PAGE', name: 'P', children: [{ id: 'ok', type: 'FRAME', name: 'Fine', fills: [] }, { id: 'bad', type: 'FRAME', name: 'Bad', unreadable: true }] }]);
  const r = await scan('unreadable', new FileShim(), nodes);
  ok(r.coverage.layers === 1 && r.coverage.unreadableLayers === 1, 'unreadable/one layer read, one skipped and counted', r.coverage);
}

/* ── a layer that throws partway: no row from it, and its children still walked (review of #3685) ─────────────────── */
section('partway — a layer whose fills read and whose strokes throw');
{
  const RED = { r: 1, g: 0, b: 0 };             // #ff0000
  const snap = (bad: FactsNode) => sourceFromSnapshot({ collections: [], variables: [], styles: { paint: [], text: [], effect: [], grid: [] },
    pages: [{ id: 'p', name: 'P', children: [bad] }] });
  const bad = {
    id: 'bad', type: 'FRAME', name: 'Card', fills: [solid(RED.r, RED.g, RED.b)],
    get strokes(): unknown { throw new Error('strokes could not be read'); },
    children: [{ id: 'kid-a', type: 'FRAME', name: 'Inner', fills: [solid(BLUE.r, BLUE.g, BLUE.b)] }, { id: 'kid-b', type: 'FRAME', name: 'Empty', fills: [] }],
  } as FactsNode;
  const r = await scanFileFacts(snap(bad));
  const errors = validate(SCHEMA, r);
  ok(errors.length === 0, 'partway/the report matches schema/file-facts.schema.json', errors.slice(0, 5));
  ok(eq(r.coverage, { pages: 1, layers: 2, hiddenLayers: 0, unreadableLayers: 1, textLayers: 0, instances: 0 }), 'partway/coverage: the layer unread, its two children read', r.coverage);
  ok(paintRow(r, 'fill', 'background', '#ff0000', 'raw').length === 0, 'partway/the fill read before the throw is not kept', r.usage.paints);
  ok(eq(counts(one(paintRow(r, 'fill', 'background', '#0066ff', 'raw'))), [1, 0]), "partway/a child's fill is counted", r.usage.paints);
}

/* ── a layer that throws on its LAST read keeps none of its counters (re-review of #3685) ──────────────────────────── */
section('partway counters — an instance and a text layer whose child list throws, after every count was taken');
{
  // `children` is the last read in `walk`, after the style and variable counts, so a throw there reaches every
  // buffered counter: a counter written eagerly would show here as a 1.
  const coll = { id: 'c', name: 'Color', modes: [{ modeId: 'm', name: 'Default' }], defaultModeId: 'm' };
  const v = { id: 'v', name: 'brand/blue', variableCollectionId: 'c', resolvedType: 'COLOR', valuesByMode: { m: { r: 0, g: 0.4, b: 1, a: 1 } } };
  const paintStyle = { id: 'S:paint', name: 'Brand/Blue', paints: [solid(BLUE.r, BLUE.g, BLUE.b)] };
  const textStyle = { id: 'S:text', name: 'Body', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 14, lineHeight: { unit: 'AUTO' } };
  const throwsKids = <T extends object>(n: T) => Object.defineProperty(n, 'children', { get() { throw new Error('children could not be read'); }, enumerable: true }) as FactsNode;
  const inst = throwsKids({ id: 'inst', type: 'INSTANCE', name: 'Card', mainComponentId: 'main', fillStyleId: 'S:paint',
    fills: [solid(BLUE.r, BLUE.g, BLUE.b)], strokes: [solid(BLUE.r, BLUE.g, BLUE.b, { boundVariables: { color: alias(v) } })] });
  const text = throwsKids({ id: 'txt', type: 'TEXT', name: 'Label', textStyleId: 'S:text', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 14,
    fontWeight: 400, lineHeight: { unit: 'AUTO' }, fills: [solid(BLUE.r, BLUE.g, BLUE.b, { boundVariables: { color: alias(v) } })] });
  const r = await scanFileFacts(sourceFromSnapshot({ collections: [coll], variables: [v], styles: { paint: [paintStyle], text: [textStyle], effect: [], grid: [] },
    components: [{ id: 'main', name: 'Card' }], pages: [{ id: 'p', name: 'P', children: [inst, text] }] }));
  const errors = validate(SCHEMA, r);
  ok(errors.length === 0, 'partway counters/the report matches schema/file-facts.schema.json', errors.slice(0, 5));
  ok(eq(r.coverage, { pages: 1, layers: 0, hiddenLayers: 0, unreadableLayers: 2, textLayers: 0, instances: 0 }), 'partway counters/coverage: both unread, no instance and no text layer counted', r.coverage);
  ok(eq(r.styles.paint.map((x) => [x.name, x.layers]), [['Brand/Blue', 0]]), "partway counters/the instance's fill style counts no layer", r.styles.paint);
  ok(eq(r.styles.text.map((x) => [x.name, x.layers]), [['Body', 0]]), "partway counters/the text layer's text style counts no layer", r.styles.text);
  ok(eq(r.variables.variables.map((x) => [x.name, x.boundLayers]), [['brand/blue', 0]]), 'partway counters/the bound variable counts no layer', r.variables.variables);
  ok(r.usage.paints.length === 0 && r.components.used.length === 0, 'partway counters/no usage row and no component row', [r.usage.paints, r.components.used]);
}

/* ── the definition and missing-main counters, unread and read (re-review of #3685, second round) ───────────────────── */
section('partway definitions — a component, a set and a main-less instance whose child list throws; a readable main-less instance');
{
  // The three unread layers reach `children` after queuing their counter, so an eager counter would show here as a 1.
  // The readable main-less instance pins `missingMain` from the other side: a counter never committed would read 0.
  const throwsKids = <T extends object>(n: T) => Object.defineProperty(n, 'children', { get() { throw new Error('children could not be read'); }, enumerable: true }) as FactsNode;
  const comp = throwsKids({ id: 'comp', type: 'COMPONENT', name: 'Card' });
  const set = throwsKids({ id: 'set', type: 'COMPONENT_SET', name: 'Chip' });
  const lost = throwsKids({ id: 'lost', type: 'INSTANCE', name: 'Card', mainComponentId: 'gone' });
  const unread = await scanFileFacts(sourceFromSnapshot({ collections: [], variables: [], styles: { paint: [], text: [], effect: [], grid: [] },
    components: [], pages: [{ id: 'p', name: 'P', children: [comp, set, lost] }] }));
  ok(validate(SCHEMA, unread).length === 0, 'partway definitions/the report matches schema/file-facts.schema.json', validate(SCHEMA, unread).slice(0, 5));
  ok(unread.coverage.unreadableLayers === 3 && unread.coverage.instances === 0, 'partway definitions/coverage: all three unread, no instance counted', unread.coverage);
  ok(eq(unread.components.localDefinitions, { components: 0, componentSets: 0 }), 'partway definitions/an unread component and set count no local definition', unread.components.localDefinitions);
  ok(unread.components.missingMain === 0, 'partway definitions/an unread main-less instance counts no missing main', unread.components.missingMain);
  const read = await scanFileFacts(sourceFromSnapshot({ collections: [], variables: [], styles: { paint: [], text: [], effect: [], grid: [] },
    components: [], pages: [{ id: 'p', name: 'P', children: [{ id: 'lost', type: 'INSTANCE', name: 'Card', mainComponentId: 'gone', children: [] }] }] }));
  ok(read.components.missingMain === 1 && read.coverage.instances === 1, 'partway definitions/a readable main-less instance counts one missing main', [read.components.missingMain, read.coverage]);
}

/* ── most-used first: the order the schema promises, against walk order ─────────────────────────────────────────────── */
section('order — rows and components most-used first, ties by identity, whatever the walk order');
{
  // Walk order puts the less-used first: red (1), green (1), then blue (2); instances Zeta (1), Alpha (1), then Mid (2).
  // Most-used first puts blue and Mid on top; each tie is broken by identity (color, then component name), so green
  // comes before red and Alpha before Zeta. Both orders are the reverse of the walk, so neither falls out of it.
  const frame = (id: string, c: { r: number; g: number; b: number }): FactsNode => ({ id, type: 'FRAME', name: 'Panel', fills: [solid(c.r, c.g, c.b)] });
  const inst = (id: string, main: string): FactsNode => ({ id, type: 'INSTANCE', name: 'Item', mainComponentId: main, children: [] });
  const r = await scanFileFacts(sourceFromSnapshot({ collections: [], variables: [], styles: { paint: [], text: [], effect: [], grid: [] },
    components: [{ id: 'z', name: 'Zeta' }, { id: 'a', name: 'Alpha' }, { id: 'm', name: 'Mid' }],
    pages: [{ id: 'p', name: 'P', children: [
      frame('f1', { r: 1, g: 0, b: 0 }), frame('f2', { r: 0, g: 1, b: 0 }), frame('f3', BLUE), frame('f4', BLUE),
      inst('i1', 'z'), inst('i2', 'a'), inst('i3', 'm'), inst('i4', 'm'),
    ] }] }));
  ok(validate(SCHEMA, r).length === 0, 'order/the report matches schema/file-facts.schema.json', validate(SCHEMA, r).slice(0, 5));
  const fills = r.usage.paints.filter((p) => p.property === 'fill').map((p) => [p.color, p.layers]);
  ok(eq(fills, [['#0066ff', 2], ['#00ff00', 1], ['#ff0000', 1]]), 'order/paints: most-used first, a tie by color', fills);
  const placed = r.components.used.map((c) => [c.name, c.layers]);
  ok(eq(placed, [['Mid', 2], ['Alpha', 1], ['Zeta', 1]]), 'order/components: most-used first, a tie by name', placed);
}

/* ── the button words, each on its own (ROLE_RULE name-and-type/1) ──────────────────────────────────────────────────── */
section('button words — btn and cta, with no other cue');
{
  const frame = (id: string, name: string): FactsNode => ({ id, type: 'FRAME', name, fills: [solid(BLUE.r, BLUE.g, BLUE.b)] });
  for (const word of ['btn', 'cta', 'Btns', 'CTAs']) {
    const r = await scanFileFacts(sourceFromSnapshot({ collections: [], variables: [], styles: { paint: [], text: [], effect: [], grid: [] },
      pages: [{ id: 'p', name: 'P', children: [frame('a', `Hero/${word}`), frame('b', 'Hero/panel')] }] }));
    ok(eq(counts(one(paintRow(r, 'fill', 'button-like', '#0066ff', 'raw'))), [1, 0]) && eq(counts(one(paintRow(r, 'fill', 'background', '#0066ff', 'raw'))), [1, 0]),
      `button words/a frame named "${word}" is button-like; its neighbor is a background`, r.usage.paints);
  }
}

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) { console.error(`${failed} FAILED`); process.exit(1); }
if (executed < 60) { console.error(`only ${executed} checks ran; expected at least 60`); process.exit(1); }
