/**
 * STYLE-GUIDE test (#259, phase 1: color) — the cell sets and the color tables.
 *
 *   npx tsx apps/plugin/test-style-guide.ts
 *
 * Drives `style-guide-cells.ts` and `style-guide.ts` against an in-memory NODE SHIM of a Figma file whose
 * variables are the REAL prism3 emission (`packages/engine/out/figma/prism3/core.palette.json` + the four
 * `color.<mode>.json`), plus a small foreign collection with unpadded steps stored out of order. Checked:
 *   1. file setup builds the three cell sets onto `↳ File Components`, and a second run builds none;
 *   2. sets a file already has — on another page, in another case — are ADOPTED: never moved, never rebuilt,
 *      only the missing one is built;
 *   3. the PLAN — a table per group, primitive collections on `↳ Primitive tokens` and semantic ones on
 *      `↳ Semantic tokens`, one specimen + value (+ contrast) column per mode, and the measured contrast of
 *      prism3 `text.primary` on `background.primary` as literal ratios per mode;
 *   4. primitive steps in NUMERIC order;
 *   5. the EXECUTOR — every mode column's swatch pins its mode and is bound to its variable, each specimen
 *      is drawn on its contracted ground (inverse text on the inverse ground, not white), the contrast cell's
 *      words, the header instance;
 *   6. a RERUN updates in place — no second table — and reports tokens added, removed and changed, and an
 *      emptied group as stale;
 *   7. a missing page, missing cell sets and a missing header set are skips, reported, never thrown.
 *
 * INDEPENDENCE (docs/34): expected values are literals written here. The ratios (19.42, 18.13, 21) and the
 * failing 3.27 (neutral/400 on white, computed by hand from the WCAG formula) are the engine's own contract figures floored to two places, transcribed from a probe of
 * `resolveAllModes` / `contrast` — never read off `style-guide.ts`. Page names, set names, group titles and
 * variant names are typed here, not imported. The shim's case-insensitive set search is its own.
 *
 * BY-NAME MUTATIONS (each proven red, then restored — docs/00-progress.md 2026-09-28):
 *   - drop `inst.setExplicitVariableModeForCollection` on the swatch → "5: every text/primary swatch pins its
 *     column's mode" fails;
 *   - skip the swatch binding → "5: every text/primary swatch is bound to text/primary" fails;
 *   - draw every specimen on white (`groundVariable` forced undefined) → "5: inverse/text/primary is drawn
 *     on inverse/background/primary" fails;
 *   - sort primitive rows lexically → "4: foreign ramp in numeric order" fails;
 *   - never find an existing table on rerun → "6: rerun: still 11 tables on the semantic page" fails;
 *   - build every cell set regardless of `findCellSets` → "2: the adopted swatch set is not duplicated" fails.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ensureStyleGuideCells } from './src/style-guide-cells';
import type { CellsApi } from './src/style-guide-cells';
import { planStyleGuide, runStyleGuide, styleGuideSummary, contrastText } from './src/style-guide';
import type { StyleGuideApi, SgCatalog, SgTable, TableOutcome } from './src/style-guide';
import { parseDesignMd } from '@prism3/engine/design-md';
import { brandTheme } from '@prism3/engine/theme';
import { resolveAllModes } from '@prism3/engine/modes';

let failures = 0;
const ok = (cond: boolean, label: string): void => {
  if (!cond) { failures++; console.error(`  ✗ ${label}`); }
  else console.log(`  ✓ ${label}`);
};

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../../packages/engine/out/figma/prism3');
const readJson = (f: string) => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as {
  $collection: string; $mode: string;
  variables: { name: string; resolvedType: string; description: string; value: { r: number; g: number; b: number; a: number }; alias: { name: string } | null }[];
};

// ── The shim ─────────────────────────────────────────────────────────────────────────────────────────
let nextId = 1;
class N {
  id = `node:${nextId++}`;
  name = '';
  children: N[] = [];
  parent: N | null = null;
  width = 0;
  height = 0;
  x = 0;
  y = 0;
  fills: unknown = [];
  strokes: unknown = [];
  characters?: string;
  fontName?: { family: string; style: string };
  visible = true;
  mainComponent: N | null = null;
  componentProperties?: Record<string, { type: string; value: unknown }>;
  explicitVariableModes: Record<string, string> = {};
  pluginData: Record<string, string> = {};
  gridRow?: number;
  gridCol?: number;
  gridColumnSizes: { type: string }[] = [];
  gridRowSizes: { type: string }[] = [];
  private _cols = 0;
  private _rows = 0;
  [k: string]: unknown;
  constructor(public type: string) {}
  get gridColumnCount(): number { return this._cols; }
  set gridColumnCount(n: number) { this._cols = n; this.gridColumnSizes = Array.from({ length: n }, () => ({ type: 'FLEX' })); }
  get gridRowCount(): number { return this._rows; }
  set gridRowCount(n: number) { this._rows = n; this.gridRowSizes = Array.from({ length: n }, () => ({ type: 'FLEX' })); }
  appendChild(c: N): void {
    if (c.parent) c.parent.children = c.parent.children.filter((x) => x !== c);
    c.parent = this;
    this.children.push(c);
  }
  appendChildAt(c: N, r: number, col: number): void {
    if (this.layoutMode !== 'GRID') throw new Error('appendChildAt on a non-grid');
    if (r >= this._rows || col >= this._cols) throw new Error(`grid cell ${r},${col} out of bounds`);
    if (this.children.some((k) => k.gridRow === r && k.gridCol === col)) throw new Error(`grid cell ${r},${col} occupied`);
    this.appendChild(c);
    c.gridRow = r; c.gridCol = col;
  }
  remove(): void { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); this.parent = null; }
  resize(w: number, h: number): void { this.width = w; this.height = h; }
  findAll(pred: (n: N) => boolean): N[] {
    const out: N[] = [];
    const walk = (n: N) => { for (const c of n.children) { if (pred(c)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  findOne(pred: (n: N) => boolean): N | null { return this.findAll(pred)[0] ?? null; }
  findAllWithCriteria(c: { types: string[] }): N[] { return this.findAll((n) => c.types.includes(n.type)); }
  setPluginData(k: string, v: string): void { this.pluginData[k] = v; }
  getPluginData(k: string): string { return this.pluginData[k] ?? ''; }
  setExplicitVariableModeForCollection(collection: unknown, modeId: string): void {
    // Under dynamic-page the collection OBJECT is required — an id string throws in the host.
    if (!collection || typeof collection !== 'object' || typeof (collection as { id?: unknown }).id !== 'string') throw new Error('collection object required');
    this.explicitVariableModes[(collection as { id: string }).id] = modeId;
  }
  setProperties(p: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(p)) if (this.componentProperties?.[k]) this.componentProperties[k].value = v;
  }
  createInstance(): N {
    const clone = (n: N): N => {
      const c = new N(n === this ? 'INSTANCE' : n.type);
      for (const k of ['name', 'width', 'height', 'x', 'y', 'fills', 'strokes', 'characters', 'fontName', 'visible', 'layoutMode']) (c as Record<string, unknown>)[k] = (n as Record<string, unknown>)[k];
      for (const k of n.children) c.appendChild(clone(k));
      return c;
    };
    const inst = clone(this);
    inst.mainComponent = this;
    if (this.parent?.componentProperties) inst.componentProperties = JSON.parse(JSON.stringify(this.parent.componentProperties));
    return inst;
  }
  get height_(): number { return this.height; }
}

const page = (name: string): N => { const p = new N('PAGE'); p.name = name; return p; };

/** A text-cell or swatch set the way the owner's file has one — its own case, its own page. */
const ownerSet = (name: string, variants: string[], withSpecimen: boolean): N => {
  const set = new N('COMPONENT_SET');
  set.name = name;
  for (const v of variants) {
    const m = new N('COMPONENT');
    m.name = v;
    // The owner's node names, not ours: a text swatch holds a TEXT node named "Aa", a fill swatch a "Rectangle 12".
    if (withSpecimen && /text/i.test(v)) { const t = new N('TEXT'); t.name = 'Aa'; t.characters = 'Aa'; t.fills = [{ type: 'SOLID' }]; m.appendChild(t); }
    else if (withSpecimen) { const s = new N('FRAME'); s.name = 'Rectangle 12'; s.fills = [{ type: 'SOLID' }]; m.appendChild(s); }
    else { const t = new N('TEXT'); t.name = 'Label'; t.characters = 'Abc 123'; t.fontName = { family: 'Inter', style: 'Regular' }; m.appendChild(t); }
    set.appendChild(m);
  }
  return set;
};

/** The `_Section-header` set the page header reads: a Size=Medium member with Title/Description text. */
const headerSet = (name = '_Section-header'): N => {
  const set = new N('COMPONENT_SET');
  set.name = name;
  set.componentProperties = { 'Description#1:0': { type: 'BOOLEAN', value: true } };
  for (const size of ['XL', 'Medium']) {
    const m = new N('COMPONENT');
    m.name = `Size=${size}`;
    const box = new N('FRAME'); box.name = 'Text';
    for (const [tn, tx] of [['Title', 'Section header'], ['Description', 'Descriptive Text']]) {
      const t = new N('TEXT'); t.name = tn; t.characters = tx; t.fontName = { family: 'Inter', style: tn === 'Title' ? 'Bold' : 'Regular' }; box.appendChild(t);
    }
    m.appendChild(box);
    set.appendChild(m);
  }
  return set;
};

interface Shim { api: StyleGuideApi & CellsApi; pages: N[]; vars: ShimVar[]; cols: ShimCol[]; fontFails: Set<string> }
interface ShimCol { id: string; name: string; modes: { modeId: string; name: string }[]; defaultModeId: string }
interface ShimVar { id: string; name: string; variableCollectionId: string; resolvedType: string; description: string; valuesByMode: Record<string, unknown> }

const makeShim = (pages: N[], cols: ShimCol[], vars: ShimVar[]): Shim => {
  const fontFails = new Set<string>();
  const root = {
    get children() { return pages; },
    findAllWithCriteria: (c: { types: string[] }) => pages.flatMap((p) => p.findAllWithCriteria(c)),
  };
  const api = {
    root,
    loadAllPagesAsync: async () => {},
    loadFontAsync: async (f: { family: string; style: string }) => { if (fontFails.has(`${f.family} ${f.style}`)) throw new Error('no font'); },
    createFrame: () => new N('FRAME'),
    createComponent: () => new N('COMPONENT'),
    createText: () => new N('TEXT'),
    combineAsVariants: (nodes: N[], parent: N) => {
      const set = new N('COMPONENT_SET');
      for (const n of nodes) set.appendChild(n);
      parent.appendChild(set);
      set.width = 400; set.height = 400;
      (set as unknown as { addComponentProperty: () => string }).addComponentProperty = () => 'Description#9:0';
      return set;
    },
    variables: {
      getLocalVariableCollectionsAsync: async () => cols,
      getLocalVariablesAsync: async (t?: string) => vars.filter((v) => !t || v.resolvedType === t),
      setBoundVariableForPaint: (paint: object, field: string, v: { id: string }) => ({ ...paint, boundVariables: { [field]: { type: 'VARIABLE_ALIAS', id: v.id } } }),
    },
  };
  return { api: api as unknown as StyleGuideApi & CellsApi, pages, vars, cols, fontFails };
};

/** The prism3 variables, as a theme write leaves them: `core` (Default) and `color` (four modes). */
const prism3Variables = (): { cols: ShimCol[]; vars: ShimVar[] } => {
  const core = readJson('core.palette.json');
  const modes = ['light', 'dark', 'hc-light', 'hc-dark'];
  const byMode = modes.map((m) => readJson(`color.${m}.json`));
  const cols: ShimCol[] = [
    { id: 'VariableCollectionId:core', name: 'core', modes: [{ modeId: 'core:0', name: 'Default' }], defaultModeId: 'core:0' },
    { id: 'VariableCollectionId:color', name: 'color', modes: modes.map((m, i) => ({ modeId: `color:${i}`, name: m })), defaultModeId: 'color:0' },
    // A foreign primitive collection: unpadded steps, stored out of numeric order.
    { id: 'VariableCollectionId:legacy', name: 'legacy', modes: [{ modeId: 'legacy:0', name: 'Value' }], defaultModeId: 'legacy:0' },
  ];
  const vars: ShimVar[] = [];
  const idOf = new Map<string, string>();
  core.variables.forEach((v, i) => { const id = `VariableID:core:${i}`; idOf.set(v.name, id); vars.push({ id, name: v.name, variableCollectionId: cols[0].id, resolvedType: v.resolvedType, description: v.description, valuesByMode: { 'core:0': v.value } }); });
  byMode[0].variables.forEach((v, i) => {
    const id = `VariableID:color:${i}`;
    idOf.set(v.name, id);
    const valuesByMode: Record<string, unknown> = {};
    byMode.forEach((file, m) => {
      const mv = file.variables.find((x) => x.name === v.name)!;
      valuesByMode[`color:${m}`] = mv.alias ? { type: 'VARIABLE_ALIAS', id: idOf.get(mv.alias.name) } : mv.value;
    });
    vars.push({ id, name: v.name, variableCollectionId: cols[1].id, resolvedType: v.resolvedType, description: v.description, valuesByMode });
  });
  ['100', '5', '900', '50'].forEach((s, i) => vars.push({ id: `VariableID:legacy:${i}`, name: `legacy/ramp/${s}`, variableCollectionId: cols[2].id, resolvedType: 'COLOR', description: '', valuesByMode: { 'legacy:0': { r: 0.5, g: 0.5, b: 0.5, a: 1 } } }));
  return { cols, vars };
};

const input = parseDesignMd(readFileSync(join(here, '../../packages/engine/examples/prism3.design.md'), 'utf8')).input;
const contract = resolveAllModes(brandTheme(input));

const PRIM = '↳ Primitive tokens';
const SEM = '↳ Semantic tokens';
const FC = '↳ File Components';

const fullFile = async (): Promise<Shim & { fc: N; prim: N; sem: N }> => {
  const fc = page(FC), prim = page(PRIM), sem = page(SEM);
  fc.appendChild(headerSet());
  const { cols, vars } = prism3Variables();
  const s = makeShim([page('Cover'), prim, sem, fc], cols, vars);
  await ensureStyleGuideCells(s.api, fc);
  return { ...s, fc, prim, sem };
};

const setsNamed = (pages: N[], name: string): N[] => pages.flatMap((p) => p.findAllWithCriteria({ types: ['COMPONENT_SET'] })).filter((n) => n.name.toLowerCase() === name.toLowerCase());
const tablesOn = (p: N): N[] => p.findAll((n) => n.type === 'FRAME' && !!n.pluginData['prism3-style-guide']);
const tableFrame = (p: N, title: string): N | undefined => tablesOn(p).find((n) => n.name === `Style guide — ${title}`);
const gridOf = (wrap: N): N => wrap.children.find((c) => c.name === 'Table')!;
const cellAt = (grid: N, r: number, c: number): N | undefined => grid.children.find((k) => k.gridRow === r && k.gridCol === c);
const textIn = (n: N | undefined): string => (n?.findAll((k) => k.type === 'TEXT') ?? []).map((t) => t.characters).join(' | ');
const rowOf = (grid: N, token: string): number => grid.children.find((k) => k.gridCol === 0 && textIn(k) === token)?.gridRow ?? -1;
const boundId = (paints: unknown): string | undefined => (paints as { boundVariables?: { color?: { id: string } } }[] | undefined)?.[0]?.boundVariables?.color?.id;

const main = async (): Promise<void> => {
  console.log('1. cell sets on a fresh file');
  {
    const fc = page(FC);
    fc.appendChild(headerSet());
    const s = makeShim([page('Cover'), fc], [], []);
    const r = await ensureStyleGuideCells(s.api, fc);
    ok(JSON.stringify(r.built) === JSON.stringify(['_style-guide-swatches', '_style-guide-text-cells', '_style-guide-spacing-cells']), '1: builds the three sets');
    const sw = setsNamed(s.pages, '_style-guide-swatches')[0];
    ok(sw?.parent === fc, '1: the swatch set sits on ↳ File Components');
    ok(JSON.stringify(sw?.children.map((c) => c.name)) === JSON.stringify(['type=default', 'type=text', 'type=icon', 'type=border', 'type=transparency', 'type=radius']), '1: six swatch types');
    ok(sw?.children.every((c) => !!c.findOne((k) => k.name === 'Specimen')), '1: every swatch has a Specimen node');
    const tc = setsNamed(s.pages, '_style-guide-text-cells')[0];
    ok(tc?.children.length === 12, '1: twelve text cells');
    ok(tc?.children.some((c) => c.name === 'color=white, textAlign=left, type=value alias, padding=default'), '1: a value-alias cell');
    ok(tc?.children.every((c) => c.findAll((k) => k.type === 'TEXT' && k.name !== 'Icon').every((k) => k.characters === 'Abc 123')), '1: sample text is "Abc 123"');
    ok(JSON.stringify(setsNamed(s.pages, '_style-guide-spacing-cells')[0]?.children.map((c) => c.name)) === JSON.stringify(['display=filled', 'display=line']), '1: spacing cells filled | line');
    const again = await ensureStyleGuideCells(s.api, fc);
    ok(again.built.length === 0 && again.adopted.length === 3, '1: a second run builds nothing and adopts three');
    ok(setsNamed(s.pages, '_style-guide-swatches').length === 1, '1: still one swatch set');
  }

  console.log('2. existing sets are adopted, wherever and however named');
  {
    const fc = page(FC), sgc = page('Style Guide Components');
    const owned = ownerSet('_Style-Guide-Swatches', ['type=Default', 'type=Text'], true);
    const ownedText = ownerSet('_style-guide-text-cells', ['color=dark, textAlign=left, type=header, padding=default', 'color=white, textAlign=left, type=default, padding=default'], false);
    sgc.appendChild(owned); sgc.appendChild(ownedText);
    const s = makeShim([fc, sgc], [], []);
    const r = await ensureStyleGuideCells(s.api, fc);
    ok(JSON.stringify(r.built) === JSON.stringify(['_style-guide-spacing-cells']), '2: builds only the missing spacing set');
    ok(r.adopted.some((a) => a.name === '_Style-Guide-Swatches' && a.page === 'Style Guide Components'), '2: reports the adopted swatch set and its page');
    ok(setsNamed(s.pages, '_style-guide-swatches').length === 1, '2: the adopted swatch set is not duplicated');
    ok(owned.parent === sgc && owned.children.length === 2, '2: the adopted set is not moved or rebuilt');

    // A table drawn from the ADOPTED sets: bound through the owner's own node name, variant matched in any case.
    const { cols, vars } = prism3Variables();
    const sem = page(SEM);
    const s2 = makeShim([fc, sgc, sem], cols, vars);
    const run = await runStyleGuide(s2.api, contract, { collections: ['color'] });
    const text = tableFrame(sem, 'Text');
    ok(!!text, '2: tables draw from adopted sets');
    const g = text ? gridOf(text) : undefined;
    const r1 = g ? rowOf(g, 'text/primary') : -1;
    const sw = g ? cellAt(g, r1, 1)?.children[0] : undefined;
    ok(sw?.mainComponent?.name === 'type=Text', '2: the adopted type=Text swatch is used for a text role');
    ok(boundId(sw?.findOne((k) => k.name === 'Aa')?.fills) === vars.find((v) => v.name === 'pds3/color/text/primary')!.id, '2: the owner-named node is bound');
    ok(run.misses.includes('_style-guide-text-cells has no type=value alias, color=white variant'), '2: a variant the adopted set lacks is reported by name');
  }

  console.log('3. the plan');
  const { cols, vars } = prism3Variables();
  const catalog: SgCatalog = { collections: cols, variables: vars };
  const plan = planStyleGuide(catalog, contract);
  const byTitle = (kind: string, title: string): SgTable | undefined => plan.tables.find((t) => t.kind === kind && t.title === title);
  {
    const sem = plan.tables.filter((t) => t.kind === 'semantic');
    ok(JSON.stringify(sem.map((t) => t.title)) === JSON.stringify(['Background', 'Foreground', 'Text', 'Icon', 'Interactive', 'Disabled', 'Border', 'Scrim', 'Veil', 'Field', 'Inverse']), '3: color groups by family, in file order');
    ok(sem.every((t) => t.page === SEM), '3: semantic tables go on ↳ Semantic tokens');
    const prim = plan.tables.filter((t) => t.kind === 'primitive');
    ok(JSON.stringify(prim.map((t) => t.title)) === JSON.stringify(['Core — base', 'Primary', 'Neutral', 'Accent', 'Success', 'Warning', 'Info', 'Danger', 'Black alpha', 'White alpha', 'Legacy']), '3: primitive tables per palette');
    ok(prim.every((t) => t.page === PRIM), '3: primitive tables go on ↳ Primitive tokens');
    ok(sem.reduce((n, t) => n + t.rows.length, 0) === 265 && prim.filter((t) => t.title !== 'Legacy').reduce((n, t) => n + t.rows.length, 0) === 163, '3: every color variable is a row (265 + 163)');
    const text = byTitle('semantic', 'Text')!;
    ok(JSON.stringify(text.columns) === JSON.stringify(['Token', 'light', 'Value', 'Contrast', 'dark', 'Value', 'Contrast', 'hc-light', 'Value', 'Contrast', 'hc-dark', 'Value', 'Contrast', 'Description']), '3: a specimen, value and contrast column per mode');
    ok(JSON.stringify(byTitle('primitive', 'Neutral')!.columns) === JSON.stringify(['Token', 'Default', 'Value', 'Description']), '3: a primitive table has no contrast column');
    const tp = text.rows.find((r) => r.token === 'text/primary')!;
    ok(JSON.stringify(tp.cells.map((c) => contrastText(c.contrast).split('\n')[0])) === JSON.stringify(['19.42:1 — clears the 7:1 floor', '18.13:1 — clears the 7:1 floor', '21.00:1 — clears the 15:1 floor', '21.00:1 — clears the 15:1 floor']), '3: text.primary on background.primary: 19.42, 18.13, 21, 21');
    ok(tp.cells.every((c) => c.contrast?.ground === 'background/primary'), '3: text.primary measures against background/primary');
    ok(tp.cells[0].value === '#0D0D0E' && tp.cells[0].alias === 'pds3/core/palette/neutral/950', '3: text.primary light is #0D0D0E, an alias of neutral/950');
    ok(tp.display === 'text', '3: a text role draws the text swatch');
    const bg = byTitle('semantic', 'Background')!.rows.find((r) => r.token === 'background/primary')!;
    ok(bg.cells.every((c) => c.contrast === null), '3: background.primary has no contracted ground — its contrast reads "—"');
    ok(contrastText(null) === '—', '3: no contract reads "—"');
    const scrim = byTitle('semantic', 'Scrim')!.rows[0];
    ok(scrim.cells[0].value === '#000000 · 40%' && scrim.display === 'transparency', '3: a translucent role prints its alpha and draws the checkerboard');
    const iconOnBrand = byTitle('semantic', 'Icon')!.rows.find((r) => r.token === 'icon/on-brand')!;
    ok(contrastText(iconOnBrand.cells[0].contrast) === '7.82:1 — clears the 4.5:1 floor\non foreground/brand', '3: icon.on-brand measures against foreground/brand');
    const noBrand = planStyleGuide(catalog, null);
    ok(noBrand.tables.every((t) => t.rows.every((r) => r.cells.every((c) => c.contrast === null))) && noBrand.notes.some((n) => n.startsWith('No saved brand')), '3: no saved brand — every contrast "—", said once');
    ok(planStyleGuide(catalog, contract, { types: ['dimension'] }).tables.length === 0 && planStyleGuide(catalog, contract, { types: ['dimension'] }).notes.includes('dimension: not in this phase — color only'), '3: a later-phase type is named, not drawn');
    ok(planStyleGuide(catalog, contract, { valueFormat: 'rgba' }).tables.find((t) => t.title === 'Scrim')!.rows[0].cells[0].value === 'rgba(0, 0, 0, 0.4)', '3: rgba format');
  }

  console.log('4. numeric order');
  {
    ok(JSON.stringify(byTitle('primitive', 'Legacy')!.rows.map((r) => r.token)) === JSON.stringify(['5', '50', '100', '900']), '4: foreign ramp in numeric order');
    ok(JSON.stringify(byTitle('primitive', 'Black alpha')!.rows.map((r) => r.token.split('/').pop())) === JSON.stringify(['5', '10', '20', '30', '40', '50', '60', '70', '80', '90']), '4: black-alpha 5 before 10');
  }

  console.log('5. the executor');
  const f = await fullFile();
  const idOf = (name: string): string => f.vars.find((v) => v.name === name)!.id;
  const first = await runStyleGuide(f.api, contract);
  {
    ok(tablesOn(f.sem).length === 11 && tablesOn(f.prim).length === 11, '5: 11 semantic and 11 primitive tables');
    ok(first.tables.every((t) => t.status === 'created'), '5: every table created on a first run');
    const text = tableFrame(f.sem, 'Text')!;
    const header = text.children[0];
    ok(header?.mainComponent?.name === 'Size=Medium' && header.findOne((k) => k.name === 'Title')?.characters === 'Text', '5: the table opens with a Size=Medium header titled "Text"');
    ok(header?.componentProperties?.['Description#1:0']?.value === true, '5: the header shows its description');
    const g = gridOf(text);
    ok(g.layoutMode === 'GRID' && g.gridColumnCount === 14 && g.gridRowCount === 24, '5: a 14 × 24 grid (23 text roles + the header row)');
    ok(g.gridColumnSizes.every((s) => s.type === 'HUG'), '5: grid columns hug their cells');
    ok(textIn(cellAt(g, 0, 1)) === 'light' && textIn(cellAt(g, 0, 13)) === 'Description', '5: header row names the columns');
    ok(cellAt(g, 0, 0)?.mainComponent?.name === 'color=dark, textAlign=left, type=header, padding=default', '5: a dark header by default');
    const r = rowOf(g, 'text/primary');
    ok(r === 1, '5: text/primary is the first row');
    const specimens = [1, 4, 7, 10].map((c) => cellAt(g, r, c)!);
    const colorId = 'VariableCollectionId:color';
    ok(specimens.every((s, i) => s.children[0]?.explicitVariableModes[colorId] === `color:${i}`), "5: every text/primary swatch pins its column's mode");
    ok(specimens.every((s, i) => s.explicitVariableModes[colorId] === `color:${i}`), "5: every text/primary ground pins its column's mode");
    ok(specimens.every((s) => boundId(s.children[0]?.findOne((k) => k.name === 'Specimen')?.fills) === idOf('pds3/color/text/primary')), '5: every text/primary swatch is bound to text/primary');
    ok(specimens.every((s) => s.children[0]?.mainComponent?.name === 'type=text'), '5: text/primary uses the text swatch');
    ok(specimens.every((s) => boundId(s.fills) === idOf('pds3/color/background/primary')), '5: text/primary is drawn on background/primary');
    ok(textIn(cellAt(g, r, 2)) === '#0D0D0E | ↗ | pds3/core/palette/neutral/950', '5: the value cell carries the value and the alias chip');
    ok(textIn(cellAt(g, r, 3)) === '19.42:1 — clears the 7:1 floor\non background/primary', '5: the contrast cell reads the ratio, the floor and the ground');
    ok(textIn(cellAt(g, r, 13)) === f.vars.find((v) => v.name === 'pds3/color/text/primary')!.description, '5: the description cell');

    const inv = tableFrame(f.sem, 'Inverse')!;
    const ig = gridOf(inv);
    const ir = rowOf(ig, 'inverse/text/primary');
    ok(ir > 0 && [1, 4, 7, 10].every((c) => boundId(cellAt(ig, ir, c)?.fills) === idOf('pds3/color/inverse/background/primary')), '5: inverse/text/primary is drawn on inverse/background/primary');
    const icon = gridOf(tableFrame(f.sem, 'Icon')!);
    ok(boundId(cellAt(icon, rowOf(icon, 'icon/on-brand'), 1)?.fills) === idOf('pds3/color/foreground/brand'), '5: icon/on-brand is drawn on foreground/brand');
    const neutral = gridOf(tableFrame(f.prim, 'Neutral')!);
    const nr = rowOf(neutral, 'neutral/050');
    ok(boundId(cellAt(neutral, nr, 1)?.children[0]?.findOne((k) => k.name === 'Specimen')?.fills) === idOf('pds3/core/palette/neutral/050'), '5: a primitive swatch is bound to its step');
    ok(cellAt(neutral, nr, 1)?.children[0]?.explicitVariableModes['VariableCollectionId:core'] === 'core:0', '5: a primitive swatch pins its one mode');
    const border = gridOf(tableFrame(f.sem, 'Border')!);
    const bs = cellAt(border, 1, 1)?.children[0];
    ok(bs?.mainComponent?.name === 'type=border' && boundId(bs?.findOne((k) => k.name === 'Specimen')?.strokes) === idOf(f.vars.filter((v) => v.name.startsWith('pds3/color/border/'))[0].name), '5: a border role binds the stroke');
    const sum = styleGuideSummary(first);
    ok(sum.ok && sum.headline === '✓ style guide: 22 tables' && sum.headline.length <= 24, '5: headline "✓ style guide: 22 tables"');
  }

  console.log('6. rerun');
  {
    const text = tableFrame(f.sem, 'Text')!;
    const wrapId = text.id;
    const tpri = f.vars.find((v) => v.name === 'pds3/color/text/primary')!;
    tpri.valuesByMode['color:0'] = { type: 'VARIABLE_ALIAS', id: idOf('pds3/core/palette/neutral/400') };
    const gone = f.vars.findIndex((v) => v.name === 'pds3/color/text/tertiary');
    f.vars.splice(gone, 1);
    f.vars.push({ id: 'VariableID:color:new', name: 'pds3/color/text/quaternary', variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: 'New', valuesByMode: { 'color:0': { r: 0, g: 0, b: 0, a: 1 }, 'color:1': { r: 1, g: 1, b: 1, a: 1 }, 'color:2': { r: 0, g: 0, b: 0, a: 1 }, 'color:3': { r: 1, g: 1, b: 1, a: 1 } } });
    for (let i = f.vars.length - 1; i >= 0; i--) if (f.vars[i].name.startsWith('pds3/color/scrim/')) f.vars.splice(i, 1);
    const again = await runStyleGuide(f.api, contract);
    ok(tablesOn(f.sem).length === 11, '6: rerun: still 11 tables on the semantic page');
    ok(tableFrame(f.sem, 'Text')?.id === wrapId, '6: the Text table is updated in place');
    ok(tableFrame(f.sem, 'Text')!.children.filter((c) => c.name === 'Table').length === 1 && tableFrame(f.sem, 'Text')!.children.filter((c) => c.mainComponent).length === 1, '6: one grid and one header after the rerun');
    const t = again.tables.find((x) => x.title === 'Text') as Extract<TableOutcome, { status: 'updated' }>;
    ok(t?.status === 'updated', '6: reported as updated');
    ok(JSON.stringify(t?.diff) === JSON.stringify({ added: ['pds3/color/text/quaternary'], removed: ['pds3/color/text/tertiary'], changed: ['pds3/color/text/primary'] }), '6: reports text/quaternary added, text/tertiary removed, text/primary changed');
    const g = gridOf(tableFrame(f.sem, 'Text')!);
    ok(textIn(cellAt(g, rowOf(g, 'text/primary'), 3)) === '3.27:1 — below the 7:1 floor\non background/primary', '6: the refreshed contrast names the ratio and the floor it misses');
    ok(again.stale.includes('Style guide — Scrim'), '6: the emptied Scrim table is reported stale, and left in place');
    ok(!!tableFrame(f.sem, 'Scrim'), '6: the stale table is not deleted');
    const s = styleGuideSummary(again);
    ok(s.summary.includes('Text: 1 added, 1 removed, 1 changed'), '6: the summary names the changes');
  }

  console.log('7. skips');
  {
    const fc = page(FC);
    fc.appendChild(headerSet());
    const prim = page(PRIM);
    const { cols: c2, vars: v2 } = prism3Variables();
    const s = makeShim([prim, fc], c2, v2);
    await ensureStyleGuideCells(s.api, fc);
    const r = await runStyleGuide(s.api, contract);
    ok(r.tables.filter((t) => t.status === 'skipped' && t.reason === 'no-page').length === 11, '7: no Semantic tokens page — 11 tables skipped');
    ok(!s.pages.some((p) => p.name === SEM), '7: the missing page is not created');
    ok(r.tables.filter((t) => t.status === 'created').length === 11, '7: the primitive tables are still drawn');
    ok(styleGuideSummary(r).summary.includes('11 tables skipped — this file has no ↳ Semantic tokens page'), '7: the skip is named in the summary');
    const partial = styleGuideSummary(r);
    ok(!partial.ok && partial.headline === '⚠ 11 drawn, 11 skipped', `7: a partial run is not a pass — headline "${partial.headline}"`);

    const bare = makeShim([page(PRIM), page(SEM)], c2, v2);
    const r2 = await runStyleGuide(bare.api, contract);
    ok(r2.tables.length === 22 && r2.tables.every((t) => t.status === 'skipped' && t.reason === 'no-cells'), '7: no cell sets — every table skipped');
    const s2 = styleGuideSummary(r2);
    ok(!s2.ok && s2.headline === '✗ style guide skipped' && s2.summary.includes('Set up file adds them'), '7: the verdict says Set up file adds the cells');

    const nohdr = page(FC);
    const s3 = makeShim([page(PRIM), page(SEM), nohdr], c2, v2);
    await ensureStyleGuideCells(s3.api, nohdr);
    const r3 = await runStyleGuide(s3.api, contract, { collections: ['core'] });
    ok(r3.tables.every((t) => t.status === 'created') && r3.misses.some((m) => m.startsWith('no _Section-header set')), '7: no header set — tables drawn, the missing header named');

    s3.fontFails.add('Inter Regular');
    const s4 = makeShim([page(PRIM), page(SEM), nohdr], c2, v2);
    s4.fontFails.add('Inter Regular');
    const r4 = await runStyleGuide(s4.api, contract, { collections: ['core'] });
    ok(r4.misses.includes('Inter Regular unavailable'), '7: an unloadable font is named, not thrown');
  }

  if (failures) { console.error(`\n${failures} style-guide check(s) failed`); process.exit(1); }
  console.log('\nstyle guide: all checks pass');
};

void main();
