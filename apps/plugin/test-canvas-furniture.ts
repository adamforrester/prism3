/**
 * THE CANVAS FURNITURE (#2406 Q171, #2188 Q172/Q173) — labels, the inverse backdrop and the inverse grouping, checked
 * against the in-memory shim.
 *
 *   labels/…      the planner on a hand-laid grid: every column and row label's text and box, as literals worked out
 *                 by hand from the grid below. Mutation: a row label spanning the wrong row → `labels/rows`.
 *   draw/…        the executor on the same grid: each instance's position after its text sets its width, nested
 *                 columns stepping left, the backdrop behind the set, every instance tagged, a redraw replacing
 *                 rather than adding, another def's furniture and a hand-placed `inverse-bg` left alone.
 *   group/…       Button built by the real executor: its 288 inverse members sit in one band no default member enters
 *                 (Q173 A). Mutation: `surface` not outermost in `planSetLayout` → `group/contiguous`.
 *                 An earlier-layout Button (Q173: "an in-place update reports it as moves"): the dry run reports 360
 *                 moves and nothing else, the furniture is not drawn on it, the update's apply moves them with every
 *                 id kept, the next dry run reads up to date, and one backdrop and one Inverse bracket are drawn.
 *                 Mutation: the moves not reported → `group/existing dry run`.
 *   panel/…       the grouping moves positions only: the set's children stay in plan order, so every variant
 *                 property's values read in the def's order (#2386).
 *   backdrop/…    on that Button, one backdrop covering exactly the inverse members' box plus `BACKDROP_PAD`, and no
 *                 default member. Mutation: the backdrop not drawn → `backdrop/covers`.
 *   pilot/…       Button, Tag and Text field: the label texts and counts, literal, and each column label over its
 *                 column as the shim's nodes place it.
 *   update/…      Tag with its labels drawn: the dry run reads all 45 members current with no hand edit and nothing
 *                 unstamped, and the as-built record covers 45 members. Mutations: the labels drawn into a member,
 *                 which the dry run then reads as 19 hand edits, or into the set → `update/ignores furniture`.
 *   prune/…       furniture whose set is gone is removed; a live set's furniture and an untagged node stay.
 *   templates/…   `_Label` and `_inverse-backdrop` as file setup builds them, against the spec in #2406's Q171
 *                 comment, transcribed by hand here; each built on its own on a page that already has the other
 *                 file components.
 *
 * INDEPENDENCE (docs/34): every expected number and string is written out here, never read off `canvas-furniture.ts`
 * or `furniture-templates.ts`. The positions on real sets are measured off the shim's nodes by this file.
 *
 * Run: `npx tsx apps/plugin/test-canvas-furniture.ts`
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, planComponentName, planSetLayout } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan, STAMP_KEY } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { makeShim, type Node } from './component-shim';
import { captureBaselines, previewUpdate, previewLine, previewVerdict, type UpdateHost } from './src/update-plan';
import { applyUpdate, applyVerdict, previewHashOf } from './src/update-apply';
import { BASELINE_KEY } from './src/member-baseline';
import { NS } from './src/persist-figma';
import { planFurniture, drawFurniture, furnitureLayout, sentenceCase, pruneFurniture, clearFurniture, hasFurniture, type GridMember, type FurnitureApi, type XNode } from './src/canvas-furniture';
import { ensureFurnitureTemplates } from './src/furniture-templates';
import type { TemplatesApi } from './src/furniture-templates';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string) => console.log(`\n${s}`);

/* ── a page and a fake `_Label` / `_inverse-backdrop` the executor can instance ─────────────────────────── */

type FNode = XNode & Record<string, unknown>;
let seq = 0;
/** A page that keeps parent links, as the host's does. */
const makePage = (name = '↳ Test') => {
  const page = {
    id: `PAGE:${name}`,
    name,
    type: 'PAGE',
    children: [] as FNode[],
    appendChild(c: FNode) { detach(c); c.parent = page; page.children.push(c); },
    insertChild(i: number, c: FNode) { detach(c); c.parent = page; page.children.splice(i, 0, c); },
    findOne: (pred: (n: unknown) => boolean) => page.children.find(pred) ?? null,
  };
  return page;
};
const detach = (c: FNode): void => {
  const p = c.parent as { children?: FNode[] } | undefined;
  if (p?.children) { const i = p.children.indexOf(c); if (i >= 0) p.children.splice(i, 1); }
};
/** A label instance that measures like the owner's: Top is 37 high (12px text, 8 gap, 14 bracket) and as wide as its
 *  text; Left is 7px a character plus 8 + 14 wide and 16 high until its height is fixed. */
const labelInstance = (placement: 'Top' | 'Left'): FNode => {
  const data = new Map<string, string>();
  const text: FNode = { type: 'TEXT', name: 'text', characters: 'Label', fontName: { family: 'Inter', style: 'Medium' } } as FNode;
  let w: number | null = null;
  let h: number | null = null;
  const n: FNode = {
    id: `I:${++seq}`, type: 'INSTANCE', name: '_Label', x: 0, y: 0,
    get width() { return w ?? (placement === 'Top' ? 7 * String(text.characters).length : 7 * String(text.characters).length + 22); },
    get height() { return h ?? (placement === 'Top' ? 37 : 16); },
    children: [text],
    findOne: (p: (x: XNode) => boolean) => (p(text) ? text : null),
    resize(nw: number, nh: number) {
      if (n.layoutSizingHorizontal === 'FIXED') w = nw;
      if (n.layoutSizingVertical === 'FIXED') h = nh;
    },
    remove() { detach(n); (n as Record<string, unknown>).removed = true; },
    getSharedPluginData: (ns: string, k: string) => data.get(`${ns}/${k}`) ?? '',
    setSharedPluginData: (ns: string, k: string, v: string) => { data.set(`${ns}/${k}`, v); },
  } as unknown as FNode;
  return n;
};
const backdropInstance = (): FNode => {
  const data = new Map<string, string>();
  let w = 320, h = 160;
  const n = {
    id: `B:${++seq}`, type: 'INSTANCE', name: '_inverse-backdrop', x: 0, y: 0,
    get width() { return w; }, get height() { return h; },
    resize(nw: number, nh: number) { w = nw; h = nh; },
    remove() { detach(n as FNode); (n as Record<string, unknown>).removed = true; },
    getSharedPluginData: (ns: string, k: string) => data.get(`${ns}/${k}`) ?? '',
    setSharedPluginData: (ns: string, k: string, v: string) => { data.set(`${ns}/${k}`, v); },
  } as unknown as FNode;
  return n;
};
const fakeTemplates = (o: { labels?: boolean; backdrop?: boolean } = {}) => {
  const labelSet = {
    type: 'COMPONENT_SET', name: '_Label',
    children: [
      { type: 'COMPONENT', name: 'Text=Top, surface=default', createInstance: () => labelInstance('Top') },
      { type: 'COMPONENT', name: 'Text=Left, surface=default', createInstance: () => labelInstance('Left') },
    ],
  };
  const backdrop = { type: 'COMPONENT', name: '_inverse-backdrop', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, boundVariables: { color: { id: 'V:bound' } } }], createInstance: backdropInstance };
  const api: FurnitureApi = {
    root: { findAllWithCriteria: () => [...(o.labels === false ? [] : [labelSet]), ...(o.backdrop === false ? [] : [backdrop])] },
    loadFontAsync: async () => {},
  };
  return api;
};
const furnitureOn = (page: { children: FNode[] }): FNode[] => page.children.filter((c) => (c.getSharedPluginData as ((a: string, b: string) => string) | undefined)?.('prism3', 'furniture'));
const tagOf = (n: FNode) => JSON.parse(String((n.getSharedPluginData as (a: string, b: string) => string)('prism3', 'furniture'))) as { def: string; set: string; kind: string };
const textOf = (n: FNode): string => String((n.children as FNode[])?.[0]?.characters ?? '');

/* ── labels: the planner on a hand-laid grid ────────────────────────────────────────────────────────────── */
// 8 rows × 2 columns, laid out as the executor lays a grid: PAD 24, GAP 24, every member 100×40, so row r's top is
// 24 + 64r and column c's left is 24 + 124c. The set sits at (1000, 500). Rows, top to bottom:
//   0 default filled  true   1 default filled  false   2 default outline true   3 default outline false
//   4 inverse filled  true   5 inverse filled  false   6 inverse outline true   7 inverse outline false
// `size` is `medium` everywhere, so it never brackets; `leading icon` is on/off, so it is never labeled.
const ROWS: Record<string, string>[] = [];
for (const surface of ['default', 'inverse']) for (const appearance of ['filled', 'outline']) for (const lead of ['true', 'false'])
  ROWS.push({ surface, appearance, size: 'medium', 'leading icon': lead });
const GRID: GridMember[] = ROWS.flatMap((v, row) => ['rest', 'focus-visible'].map((state, col) => ({
  row, col, values: { ...v, state }, x: 24 + 124 * col, y: 24 + 64 * row, width: 100, height: 40,
})));
const LAYOUT = { rowKeys: ['surface', 'appearance', 'size', 'leading icon'], colKey: 'state', colVals: ['rest', 'focus-visible'] };

section('labels — the planner, on a hand-laid 8 × 2 grid at (1000, 500)');
{
  ok(sentenceCase('focus-visible') === 'Focus visible' && sentenceCase('read-only') === 'Read only' && sentenceCase('focus-visible-filled') === 'Focus visible filled' && sentenceCase('inverse') === 'Inverse',
    `labels/wording: variant values in sentence case ("${sentenceCase('focus-visible')}", "${sentenceCase('read-only')}")`);
  const p = planFurniture({ x: 1000, y: 500 }, GRID, LAYOUT);
  ok(JSON.stringify(p.columns) === JSON.stringify([
    { text: 'Rest', x: 1024, width: 100, bottom: 484 },
    { text: 'Focus visible', x: 1148, width: 100, bottom: 484 },
  ]), `labels/columns: one per state, over its column, bottoms 16 above the set (${JSON.stringify(p.columns)})`);
  ok(JSON.stringify(p.rowAxes) === JSON.stringify(['surface', 'appearance', 'size']), `labels/axes: surface, appearance and size are the labeled row axes; leading icon is on/off and is not (${JSON.stringify(p.rowAxes)})`);
  ok(JSON.stringify(p.rows) === JSON.stringify([
    { text: 'Inverse', axis: 'surface', level: 2, y: 780, height: 232 },
    { text: 'Filled', axis: 'appearance', level: 1, y: 524, height: 104 },
    { text: 'Outline', axis: 'appearance', level: 1, y: 652, height: 104 },
    { text: 'Filled', axis: 'appearance', level: 1, y: 780, height: 104 },
    { text: 'Outline', axis: 'appearance', level: 1, y: 908, height: 104 },
  ]), `labels/rows: one Inverse bracket over rows 4–7 (780, 232 high), Filled and Outline over each pair of rows (104 high), no size bracket where size does not vary (${JSON.stringify(p.rows)})`);
  ok(JSON.stringify(p.backdrops) === JSON.stringify([{ x: 1012, y: 768, width: 248, height: 256 }]),
    `labels/backdrop: one backdrop over the inverse rows' members, 12 past them on every side (${JSON.stringify(p.backdrops)})`);
  // Rows read in canvas order, not index order: the same grid with rows 0 and 7 swapped on the canvas.
  const swapped = GRID.map((m) => (m.row === 0 ? { ...m, y: 24 + 64 * 7 } : m.row === 7 ? { ...m, y: 24 } : m));
  const q = planFurniture({ x: 1000, y: 500 }, swapped, LAYOUT);
  ok(q.backdrops.length === 2, `labels/canvas order: an inverse row moved to the top splits the inverse band, so two backdrops, never one over a default row (${q.backdrops.length})`);
}

/* ── draw: the executor on the same grid ────────────────────────────────────────────────────────────────── */
section('draw — the executor places, tags, redraws and clears');
{
  // A set node holding the hand-laid grid's members, named as coordinates, and the layout naming each one's cell.
  const nameOf = (v: Record<string, string>) => Object.entries(v).map(([k, x]) => `${k}=${x}`).join(', ');
  const handLayout = { ...LAYOUT, cells: GRID.map((m) => ({ name: nameOf(m.values), row: m.row, col: m.col })) };
  const page = makePage();
  const handBg = { id: 'H:1', type: 'RECTANGLE', name: 'inverse-bg', x: 0, y: 0, width: 10, height: 10 } as unknown as FNode;
  page.appendChild(handBg);
  const other = labelInstance('Top');
  page.appendChild(other);
  (other.setSharedPluginData as (a: string, b: string, c: string) => void)('prism3', 'furniture', JSON.stringify({ v: 1, def: 'other-def', set: 'S:x', kind: 'label' }));
  const set = {
    id: 'S:grid', type: 'COMPONENT_SET', name: 'grid', x: 1000, y: 500, width: 272, height: 536,
    children: GRID.map((m) => ({ name: nameOf(m.values), x: m.x, y: m.y, width: m.width, height: m.height })),
  } as unknown as FNode;
  page.appendChild(set);
  const api = fakeTemplates();
  const o = await drawFurniture(api, set, handLayout, 'grid');
  const furn = furnitureOn(page).filter((n) => tagOf(n).def === 'grid');
  const labels = furn.filter((n) => tagOf(n).kind === 'label');
  const at = (text: string, i = 0) => labels.filter((n) => textOf(n) === text)[i];
  ok(o.columns === 2 && o.rows === 5 && o.backdrops === 1 && furn.length === 8, `draw/counts: 2 column labels, 5 row labels, 1 backdrop (${o.columns}, ${o.rows}, ${o.backdrops}; ${furn.length} tagged)`);
  const rest = at('Rest');
  ok(rest?.x === 1024 && rest?.y === 447 && rest?.width === 100, `draw/column: "Rest" at 1024,447, 100 wide (its bottom 16 above the set) (${rest?.x},${rest?.y},${rest?.width})`);
  const filled = at('Filled');
  const outline = at('Outline');
  ok(filled?.x === 920 && filled?.y === 524 && filled?.height === 104 && outline?.x === 913,
    `draw/rows: "Filled" right-aligned 16 left of the set at 920,524, 104 high; "Outline" (wider) at 913 (${filled?.x},${filled?.y},${filled?.height}; ${outline?.x})`);
  const inv = at('Inverse');
  ok(inv?.x === 834 && inv?.y === 780 && inv?.height === 232, `draw/nesting: "Inverse" in the next column out, 8 left of the widest label inside it, at 834,780, 232 high (${inv?.x},${inv?.y},${inv?.height})`);
  const bd = furn.find((n) => tagOf(n).kind === 'backdrop');
  ok(bd?.x === 1012 && bd?.y === 768 && bd?.width === 248 && bd?.height === 256 && page.children.indexOf(bd!) < page.children.indexOf(set),
    `draw/backdrop: 1012,768, 248×256, BEHIND the set (${bd?.x},${bd?.y},${bd?.width}×${bd?.height}; index ${page.children.indexOf(bd!)} vs set ${page.children.indexOf(set)})`);
  ok(furn.every((n) => tagOf(n).set === 'S:grid') && !(set.children as FNode[]).some((c) => c.type === 'INSTANCE'),
    `draw/tagged: every instance names its def and set, and none is inside the set`);
  const again = await drawFurniture(api, set, handLayout, 'grid');
  ok(again.cleared === 8 && furnitureOn(page).filter((n) => tagOf(n).def === 'grid').length === 8, `draw/redraw: a redraw clears the 8 it drew and draws 8 again (${again.cleared}, ${furnitureOn(page).filter((n) => tagOf(n).def === 'grid').length})`);
  ok(page.children.includes(other) && page.children.includes(handBg), `draw/others: another def's label and a hand-placed inverse-bg are untouched`);
  ok(clearFurniture(page, 'grid') === 8 && page.children.includes(other) && furnitureOn(page).length === 1, `draw/clear: clearing the def removes its 8 and nothing else`);
  const none = await drawFurniture(fakeTemplates({ labels: false, backdrop: false }), set, handLayout, 'grid');
  ok(none.columns + none.rows + none.backdrops === 0 && none.skipped.length === 2 && /no _Label component, and Set up file adds it/.test(none.skipped[0]) && /no _inverse-backdrop component/.test(none.skipped[1]),
    `draw/no template: a file without the templates draws nothing and says so (${JSON.stringify(none.skipped)})`);
}

/* ── the pilot defs, built by the real executor ─────────────────────────────────────────────────────────── */
const plansOf = (id: string): AnatomyPlan[] => figmaAnatomySet(componentDefs.find((d) => d.id === id)!, { swapTarget: SWAP_TARGET });
const planComps = (n: { swapTarget?: string; nestTarget?: string; children?: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []), ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
];
const buildOnPage = async (id: string) => {
  const plans = plansOf(id);
  const page = makePage(`↳ ${id}`);
  const api = makeShim({
    vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
    page: page as unknown as { children: Node[] },
    liveRoot: true,
    identities: true,
  }) as Record<string, unknown>;
  const built = await applyComponentPlan(plans, api as never, { targetPage: page as never });
  const set = page.children.find((c) => c.type === 'COMPONENT_SET') as FNode;
  return { plans, page, api, set, built };
};
/** The Button members an old-layout set holds out of the grouped grid's rows, worked out by hand from the two row
 *  orders, never read off `gridMoves`. The earlier order is filled default (12 rows), filled inverse (12), outline
 *  default (12), outline inverse (12), text default (24), text inverse (24). Grouped, filled default (rows 0–11) and
 *  text inverse (rows 72–95) keep their rows, and rows 12–71 move: 60 rows × 6 states. */
const MOVES = 360;
const boxOf = (set: FNode, m: FNode) => ({ x: Number(set.x) + Number(m.x), y: Number(set.y) + Number(m.y), w: Number(m.width), h: Number(m.height) });
const valuesOf = (name: string): Record<string, string> => Object.fromEntries(name.split(', ').map((kv) => [kv.slice(0, kv.indexOf('=')), kv.slice(kv.indexOf('=') + 1)]));

section('group / panel / backdrop — Button, built by the real executor');
{
  ok(hasFurniture('button') && hasFurniture('tag') && hasFurniture('text-field') && !hasFurniture('icon-button') && !hasFurniture('button-destructive'),
    'pilot/switch: Button, Tag and Text field are on; Icon button and Button destructive are not');
  const { plans, page, set, api: bApi } = await buildOnPage('button');
  const members = set.children as FNode[];
  const inv = members.filter((m) => valuesOf(String(m.name)).surface === 'inverse');
  const def = members.filter((m) => valuesOf(String(m.name)).surface === 'default');
  const invTop = Math.min(...inv.map((m) => Number(m.y)));
  const invBottom = Math.max(...inv.map((m) => Number(m.y) + Number(m.height)));
  ok(inv.length === 288 && def.length === 288 && def.every((m) => Number(m.y) + Number(m.height) <= invTop || Number(m.y) >= invBottom),
    `group/contiguous: Button's 288 inverse members form one band no default member enters (${inv.length} inverse, ${def.filter((m) => !(Number(m.y) + Number(m.height) <= invTop || Number(m.y) >= invBottom)).length} default inside it)`);
  ok(def.every((m) => Number(m.y) < invTop), `group/outermost: the default block comes first, the inverse block below it`);
  ok(JSON.stringify(members.map((m) => m.name)) === JSON.stringify(plans.map(planComponentName)),
    'panel/order: the set holds its members in plan order — the grouping moved positions, not children');
  const defs = (set as unknown as { componentPropertyDefinitions: Record<string, { variantOptions?: string[] }> }).componentPropertyDefinitions;
  ok(JSON.stringify(defs.surface?.variantOptions) === JSON.stringify(['default', 'inverse'])
    && JSON.stringify(defs.appearance?.variantOptions) === JSON.stringify(['filled', 'outline', 'text'])
    && JSON.stringify(defs.size?.variantOptions) === JSON.stringify(['small', 'medium', 'large'])
    && JSON.stringify(defs.state?.variantOptions) === JSON.stringify(['rest', 'hover', 'focus-visible', 'pressed', 'pending', 'disabled']),
    `panel/values: the properties panel reads surface, appearance, size and state in the def's order (#2386) (${JSON.stringify([defs.surface?.variantOptions, defs.appearance?.variantOptions, defs.size?.variantOptions])})`);

  const o = await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), 'button');
  const furn = furnitureOn(page);
  const bds = furn.filter((n) => tagOf(n).kind === 'backdrop');
  const invLeft = Math.min(...inv.map((m) => boxOf(set, m).x));
  const invRight = Math.max(...inv.map((m) => boxOf(set, m).x + boxOf(set, m).w));
  const want = { x: invLeft - 12, y: Number(set.y) + invTop - 12, w: invRight - invLeft + 24, h: invBottom - invTop + 24 };
  const b = bds[0];
  ok(bds.length === 1 && b.x === want.x && b.y === want.y && b.width === want.w && b.height === want.h,
    `backdrop/covers: one backdrop, exactly the inverse members' box plus 12 (${bds.length}: ${b?.x},${b?.y} ${b?.width}×${b?.height} vs ${want.x},${want.y} ${want.w}×${want.h})`);
  const overlaps = def.filter((m) => { const r = boxOf(set, m); return b && r.y < Number(b.y) + Number(b.height) && r.y + r.h > Number(b.y); });
  ok(!!b && overlaps.length === 0 && page.children.indexOf(b) < page.children.indexOf(set), `backdrop/clear of default: no default member under it, and it sits behind the set (${overlaps.length})`);

  const rows = furn.filter((n) => tagOf(n).kind === 'label' && Number(n.x) < Number(set.x));
  const cols = furn.filter((n) => tagOf(n).kind === 'label' && Number(n.y) < Number(set.y));
  ok(JSON.stringify(cols.map(textOf)) === JSON.stringify(['Rest', 'Hover', 'Focus visible', 'Pressed', 'Pending', 'Disabled']),
    `pilot/button columns: Rest, Hover, Focus visible, Pressed, Pending, Disabled (${JSON.stringify(cols.map(textOf))})`);
  const count = (t: string) => rows.filter((n) => textOf(n) === t).length;
  ok(rows.length === 35 && count('Inverse') === 1 && count('Filled') === 2 && count('Outline') === 2 && count('Text') === 2 && count('Default') === 2 && count('Flush') === 2 && count('Small') === 8 && count('Medium') === 8 && count('Large') === 8,
    `pilot/button rows: 35 — Inverse once; Filled, Outline, Text once per surface; Default and Flush inside each Text block only; Small, Medium, Large in each of 8 groups (${rows.length}: ${JSON.stringify(Object.fromEntries([...new Set(rows.map(textOf))].map((t) => [t, count(t)])))})`);
  const invLabel = rows.find((n) => textOf(n) === 'Inverse');
  ok(invLabel?.y === Number(set.y) + invTop && invLabel?.height === invBottom - invTop && Number(invLabel.x) + Number(invLabel.width) < Number(b?.x),
    `labels/inverse: the Inverse bracket spans the inverse band exactly, outside the backdrop (${invLabel?.y} vs ${Number(set.y) + invTop}, ${invLabel?.height} vs ${invBottom - invTop})`);
  ok(o.skipped.length === 0, `pilot/button: nothing skipped (${JSON.stringify(o.skipped)})`);
  // BELOW THE PAGE HEADER: a header already on the page sits with its bottom 80 above the set (`page-header.ts`), so
  // every column label must start below that line. 80 is written here, not imported.
  const topmost = Math.min(...cols.map((n) => Number(n.y)));
  ok(topmost > Number(set.y) - 80 && topmost === Number(set.y) - 16 - 37, `labels/below header: the column labels start ${Number(set.y) - topmost}px above the set, inside the header's 80px gap (${topmost})`);

  // AN EXISTING SET LAID OUT BY AN EARLIER PLUGIN: rows in the old order, appearance outermost. The test lays it
  // out from a plan list the pilot does not cover (`planSetLayout` keyed off a renamed component), then checks the
  // dry run reads nothing to change and a Build over the set moves members only.
  const grouped = new Map(members.map((m) => [String(m.name), Number(m.y)] as const));
  const ids = new Map(members.map((m) => [String(m.name), String(m.id)] as const));
  const oldLayout = planSetLayout(plans.map((p) => ({ ...p, component: 'button-before-2188' })), 'test');
  const rowY = new Map<number, number>();
  const newLayout = planSetLayout(plans, 'test');
  for (const c of newLayout.cells) rowY.set(c.row, grouped.get(c.name)!);
  for (const c of oldLayout.cells) (members.find((m) => m.name === c.name) as Record<string, unknown>).y = rowY.get(c.row);
  const host = {
    ...bApi,
    root: { ...(bApi.root as object), findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : (bApi.root as { findAllWithCriteria: (c: unknown) => unknown[] }).findAllWithCriteria(c)) },
  } as unknown as UpdateHost;
  const interleaved = (set.children as FNode[]).filter((m) => valuesOf(String(m.name)).surface === 'default' && Number(m.y) > Math.min(...(set.children as FNode[]).filter((x) => valuesOf(String(x.name)).surface === 'inverse').map((x) => Number(x.y)))).length;
  ok(interleaved > 0, `premise: the earlier layout interleaves inverse and default rows (${interleaved} default members below the first inverse one)`);
  const pre = (await previewUpdate(host, [{ def: 'button', plans }])).sets[0];
  const c0 = pre.counts;
  ok(c0.move === MOVES && c0.current === 576 && c0.update + c0.add + c0.drop + c0.rename + c0.handEdited + c0.noBaseline + c0.unstamped + c0.revisionUnknown === 0 && pre.moves.length === 0 && pre.positions?.length === MOVES,
    `group/existing dry run: an old-layout Button reports ${MOVES} moves and nothing else — no rename, add, drop or hand edit (${JSON.stringify(c0)})`);
  ok(previewLine(pre) === `button: 576 members. ${MOVES} to move.` && previewVerdict({ sets: [pre], missing: [], refused: [] }).headline === 'Would change 1 of 1',
    `group/existing dry run line: the moves are named (${previewLine(pre)})`);
  // FURNITURE ONLY OVER ONE INVERSE BLOCK: on the ungrouped set nothing is drawn, so no backdrop or bracket per band.
  const un = await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), 'button');
  ok(furnitureOn(page).length === 0 && un.backdrops + un.rows + un.columns === 0 && un.skipped.length === 1 && /inverse rows are not in one block yet/.test(un.skipped[0]),
    `furniture/ungrouped: an ungrouped set gets no labels and no backdrop, and says why (${furnitureOn(page).length}, ${JSON.stringify(un.skipped)})`);

  // THE UPDATE'S APPLY moves them: the grid re-laid in place, every id kept, nothing rewritten.
  const res = await applyUpdate(host as never, bApi as never, [{ def: 'button', plans }], previewHashOf((await previewUpdate(host, [{ def: 'button', plans }]))));
  const o1 = res.outcomes[0];
  const regrouped = (set.children as FNode[]).filter((m) => Number(m.y) !== grouped.get(String(m.name))).length;
  const keptIds = (set.children as FNode[]).every((m) => ids.get(String(m.name)) === String(m.id)) && page.children.filter((c) => c.type === 'COMPONENT_SET').length === 1;
  ok(!res.refusedAll && res.outcomes.length === 1 && o1.moved === MOVES && o1.updated.length + o1.added + o1.renamed + o1.deprecated.length === 0 && o1.identity.length === 0 && o1.content.length === 0 && regrouped === 0 && keptIds,
    `update/apply regroups: ${MOVES} moved, nothing updated, renamed or replaced, every member in the grouped layout, every id kept (${JSON.stringify({ refused: res.refusedAll, moved: o1?.moved, updated: o1?.updated.length, identity: o1?.identity, content: o1?.content, regrouped, keptIds })})`);
  const v1 = applyVerdict(res);
  ok(v1.ok && v1.headline === `✓ moved ${MOVES}` && v1.lines[0] === `button: ${MOVES} moved.`, `update/apply verdict: ${v1.headline} / ${v1.lines[0]}`);
  const next = (await previewUpdate(host, [{ def: 'button', plans }])).sets[0];
  ok(next.counts.move === undefined && next.positions === undefined && previewLine(next) === 'button: up to date (576 members).',
    `update/next dry run: reads current after the apply (${previewLine(next)})`);

  // A MEMBER PRISM3 DIDN'T BUILD, ON A PLANNED COORDINATE AND OFF THE GRID (#2471 review): Prism3 never touches a
  // member it didn't build (#2325, #2464), so the regroup never moves one, adoptable or not. The dry run lists no
  // move for it, the apply leaves it exactly where it is, and no verdict line counts it as moved and as left.
  // Mutation: `gridMoves` reporting unstamped members → `unbuilt/no move`, `unbuilt/left in place`, `unbuilt/verdict`.
  // This is the case where that member is the only thing off the grid; with stamped members moving too, the
  // executor's re-lay moves it as well (#2494).
  {
    const own = (set.children as FNode[])[10] as FNode & { setSharedPluginData(ns: string, k: string, v: string): void; getSharedPluginData(ns: string, k: string): string };
    const stampWas = own.getSharedPluginData(NS, STAMP_KEY);
    const yWas = Number(own.y);
    own.setSharedPluginData(NS, STAMP_KEY, '');
    own.y = yWas + 500;
    const at = JSON.stringify([own.x, own.y]);
    const p2 = (await previewUpdate(host, [{ def: 'button', plans }])).sets[0];
    ok(p2.counts.unstamped === 1 && p2.adoptable.includes(String(own.name)) && p2.counts.move === undefined && !p2.positions?.includes(String(own.name)),
      `unbuilt/no move: the dry run lists no move for a member Prism3 didn't build, adoptable on a planned coordinate (${JSON.stringify({ move: p2.counts.move, positions: p2.positions, unstamped: p2.counts.unstamped, adoptable: p2.adoptable.length })}; ${previewLine(p2)})`);
    const r2 = await applyUpdate(host as never, bApi as never, [{ def: 'button', plans }], previewHashOf(await previewUpdate(host, [{ def: 'button', plans }])));
    const v2 = applyVerdict(r2);
    ok(JSON.stringify([own.x, own.y]) === at && own.getSharedPluginData(NS, STAMP_KEY) === '',
      `unbuilt/left in place: the apply leaves its x and y exactly as they were, and its stamp empty (${at} → ${JSON.stringify([own.x, own.y])})`);
    ok(!r2.outcomes[0]?.moved && !v2.lines.some((l) => /moved/.test(l) && /left as they are/.test(l)),
      `unbuilt/verdict: no line counts the member as moved and as left (${v2.headline}; ${v2.lines[0]})`);
    own.setSharedPluginData(NS, STAMP_KEY, stampWas);
    own.y = yWas;
  }
  // ITS HEIGHT STILL COUNTS (#2471 review, UI lane): a member Prism3 didn't build is never moved, but the executor's
  // layout sizes its row by every member in it, so a taller one pushes every row below it down, and the dry run's row
  // tops must count it too. Only the dry run is read here: an apply over these moves re-lays the grid, which moves the
  // unbuilt member too (the executor's flaw, #2494). Mutation: `gridMoves`' row heights skipping unstamped members →
  // `unbuilt/row height` (0 to move).
  {
    const own = (set.children as FNode[])[10] as FNode & { setSharedPluginData(ns: string, k: string, v: string): void; getSharedPluginData(ns: string, k: string): string };
    const [stampWas, hWas] = [own.getSharedPluginData(NS, STAMP_KEY), Number(own.height)];
    // The shim's height is worked out from the node's bindings and content, so the test overrides the accessor itself.
    const hDesc = Object.getOwnPropertyDescriptor(own, 'height')!;
    own.setSharedPluginData(NS, STAMP_KEY, '');
    Object.defineProperty(own, 'height', { configurable: true, enumerable: hDesc.enumerable, get: () => hWas + 40 });
    const grew = Number(own.height);
    const p3 = (await previewUpdate(host, [{ def: 'button', plans }])).sets[0];
    ok(grew === hWas + 40 && previewLine(p3) === 'button: 576 members. 558 to move, 1 not built by Prism3.' && !p3.positions?.includes(String(own.name)),
      `unbuilt/row height: a member Prism3 didn't build, taller than its row, moves every row below it, and is not itself a move (${hWas} → ${grew}px; ${previewLine(p3)})`);
    own.setSharedPluginData(NS, STAMP_KEY, stampWas);
    Object.defineProperty(own, 'height', hDesc);
  }
  // A STAMP THAT ISN'T PRISM3'S (#2471 review, UI lane): a member whose stamp is malformed is read as not built by
  // Prism3 (`ownedView`), so it is never a move either, however far off the grid it sits. Mutation: `gridMoves` handed
  // the members as read rather than as `ownedView` reads them → `unbuilt/stamp not ours`, `unbuilt/stamp not ours left`.
  {
    const own = (set.children as FNode[])[12] as FNode & { setSharedPluginData(ns: string, k: string, v: string): void; getSharedPluginData(ns: string, k: string): string };
    const [stampWas, yWas] = [own.getSharedPluginData(NS, STAMP_KEY), Number(own.y)];
    own.setSharedPluginData(NS, STAMP_KEY, 'not a prism3 stamp');
    own.y = yWas + 500;
    const at = JSON.stringify([own.x, own.y]);
    const p4 = (await previewUpdate(host, [{ def: 'button', plans }])).sets[0];
    ok(p4.counts.move === undefined && !p4.positions?.includes(String(own.name)) && p4.counts.unstamped === 1,
      `unbuilt/stamp not ours: a member with a malformed stamp, off the grid, is not listed as a move (${JSON.stringify({ move: p4.counts.move, unstamped: p4.counts.unstamped })}; ${previewLine(p4)})`);
    await applyUpdate(host as never, bApi as never, [{ def: 'button', plans }], previewHashOf(await previewUpdate(host, [{ def: 'button', plans }])));
    ok(JSON.stringify([own.x, own.y]) === at && own.getSharedPluginData(NS, STAMP_KEY) === 'not a prism3 stamp',
      `unbuilt/stamp not ours left: the apply leaves it exactly where it is, its stamp as it was (${at} → ${JSON.stringify([own.x, own.y])})`);
    own.setSharedPluginData(NS, STAMP_KEY, stampWas);
    own.y = yWas;
  }
  const drawn = await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), 'button');
  const after1 = furnitureOn(page);
  ok(drawn.backdrops === 1 && after1.filter((n) => tagOf(n).kind === 'backdrop').length === 1 && after1.filter((n) => tagOf(n).kind === 'label' && textOf(n) === 'Inverse').length === 1,
    `update/furniture once: one backdrop and one Inverse bracket after the regroup (${after1.filter((n) => tagOf(n).kind === 'backdrop').length} backdrops, ${after1.filter((n) => textOf(n) === 'Inverse').length} Inverse)`);

  // A BUILD over an old-layout set regroups it the same way.
  for (const c of oldLayout.cells) (members.find((m) => m.name === c.name) as Record<string, unknown>).y = rowY.get(c.row);
  await applyComponentPlan(plans, bApi as never, { targetPage: page as never });
  const after = page.children.find((c) => c.type === 'COMPONENT_SET') as FNode;
  const back = (after.children as FNode[]).filter((m) => Number(m.y) !== grouped.get(String(m.name))).length;
  const sameIds = (after.children as FNode[]).every((m) => ids.get(String(m.name)) === String(m.id)) && after === set;
  ok(back === 0 && sameIds && (after.children as FNode[]).length === 576, `group/existing build: a Build over it moves every member into the grouped layout and keeps every member's id (${back} misplaced, ids kept: ${sameIds})`);
}

section('pilot — Tag and Text field: label texts and column positions');
for (const [id, wantCols, wantRows] of [
  ['tag', ['Rest', 'Hover', 'Pressed', 'Focus visible', 'Disabled'],
    ['Select', 'Dismissible', 'Unselected', 'Selected', 'Small', 'Medium', 'Large', 'Small', 'Medium', 'Large', 'Small', 'Medium', 'Large']],
  ['text-field', ['Rest', 'Hover', 'Filled', 'Focus visible', 'Focus visible filled', 'Disabled', 'Read only'],
    ['Default', 'Error', 'Warning', 'Success', ...Array.from({ length: 4 }, () => ['Medium', 'Small', 'Large']).flat()]],
] as const) {
  const { plans, page, set } = await buildOnPage(id);
  const o = await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), id);
  const furn = furnitureOn(page);
  const cols = furn.filter((n) => Number(n.y) < Number(set.y));
  const rows = furn.filter((n) => Number(n.x) < Number(set.x));
  ok(JSON.stringify(cols.map(textOf)) === JSON.stringify(wantCols), `pilot/${id} columns: ${JSON.stringify(cols.map(textOf))}`);
  // Rows grouped by column, outermost first, top to bottom — the order the executor draws them, innermost first, is
  // reversed here so the literal reads outer to inner.
  const byLevel = [...new Set(rows.map((n) => Number(n.x) + Number(n.width)))].sort((a, b) => a - b);
  const ordered = byLevel.flatMap((right) => rows.filter((n) => Number(n.x) + Number(n.width) === right).sort((a, b) => Number(a.y) - Number(b.y)).map(textOf));
  ok(JSON.stringify(ordered) === JSON.stringify(wantRows), `pilot/${id} rows: ${JSON.stringify(ordered)}`);
  // Each column label over its own column, measured off the shim's members.
  const members = set.children as FNode[];
  const colKey = 'state';
  const placed = cols.every((c, i) => {
    const ms = members.filter((m) => valuesOf(String(m.name))[colKey] === ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'filled', 'focus-visible-filled', 'read-only'].find((v) => sentenceCase(v) === textOf(c)));
    const left = Math.min(...ms.map((m) => boxOf(set, m).x));
    const right = Math.max(...ms.map((m) => boxOf(set, m).x + boxOf(set, m).w));
    return ms.length > 0 && c.x === left && c.width === right - left && Number(c.y) + Number(c.height) === Number(set.y) - 16 && i >= 0;
  });
  ok(placed, `pilot/${id} column boxes: every column label spans its column's members and ends 16 above the set`);
  // Each innermost row label spans its row's members exactly.
  const inner = rows.filter((n) => Number(n.x) + Number(n.width) === Number(set.x) - 16);
  const spans = inner.every((n) => members.some((m) => boxOf(set, m).y === n.y) && members.some((m) => boxOf(set, m).y + boxOf(set, m).h === Number(n.y) + Number(n.height)));
  ok(inner.length === (id === 'tag' ? 9 : 12) && spans, `labels/rows ${id}: each innermost bracket starts on a member's top and ends on a member's bottom (${inner.length})`);
  ok(o.backdrops === 0 && !o.skipped.length, `pilot/${id}: no inverse rows, so no backdrop, and nothing skipped (${o.backdrops})`);
}

/* ── update: furniture is invisible to the dry run and the as-built record ──────────────────────────────── */
section('update — the dry run and the as-built record ignore the labels');
{
  const { plans, page, api, set } = await buildOnPage('tag');
  const host = {
    ...api,
    root: { ...(api.root as object), findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : (api.root as { findAllWithCriteria: (c: unknown) => unknown[] }).findAllWithCriteria(c)) },
  } as unknown as UpdateHost;
  const targets = [{ def: 'tag', plans }];
  const o = await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), 'tag');
  ok(o.columns === 5 && o.rows === 13, `premise: Tag's labels are drawn (${o.columns} + ${o.rows})`);
  const cap = await captureBaselines(host, targets);
  const capRead = (cap.sets[0]?.recorded ?? 0) + (cap.sets[0]?.skipped.length ?? 0);
  const furnRecorded = furnitureOn(page).filter((n) => (n.getSharedPluginData as (a: string, b: string) => string)(NS, BASELINE_KEY)).length;
  ok(capRead === 45 && (cap.sets[0]?.skipped ?? []).every((x) => x.reason === 'already has a baseline') && furnRecorded === 0,
    `update/record: the as-built record reads Tag's 45 members (each recorded at build) and no label carries one (${capRead} read, ${furnRecorded} labels recorded)`);
  const pre = (await previewUpdate(host, targets)).sets[0];
  const inside = (set.children as FNode[]).filter((c) => c.type !== 'COMPONENT').length;
  const inMembers = (set.children as FNode[]).flatMap((m) => (m.children as FNode[] ?? [])).filter((c) => (c.getSharedPluginData as ((a: string, b: string) => string) | undefined)?.('prism3', 'furniture')).length;
  ok(pre.counts.members === 45 && pre.counts.current === 45 && pre.counts.unstamped === 0 && pre.handEdits.length === 0 && inside === 0 && inMembers === 0,
    `update/ignores furniture: the dry run reads 45 members, all current, none unstamped, no hand edit, and no label sits in the set or a member (${JSON.stringify(pre.counts)}, ${pre.handEdits.length} hand edits, ${inside} in the set, ${inMembers} in members)`);
}

/* ── prune: stale furniture goes, live furniture stays ──────────────────────────────────────────────────── */
section('prune — furniture whose set is gone');
{
  const page = makePage();
  const make = (def: string, set: string) => {
    const n = labelInstance('Top');
    page.appendChild(n);
    (n.setSharedPluginData as (a: string, b: string, c: string) => void)('prism3', 'furniture', JSON.stringify({ v: 1, def, set, kind: 'label' }));
    return n;
  };
  const live = make('button', 'S:live');
  const gone = make('button', 'S:gone');
  const unpiloted = make('icon-button', 'S:live2');
  const untagged = labelInstance('Top');
  page.appendChild(untagged);
  const n = pruneFurniture(page.children, (id) => id === 'S:live' || id === 'S:live2');
  ok(n === 2 && page.children.includes(live) && !page.children.includes(gone) && !page.children.includes(unpiloted) && page.children.includes(untagged),
    `prune/stale: the label of a deleted set and one for a def the pilot no longer covers go; a live set's label and an untagged node stay (${n})`);
}

/* ── templates: `_Label` and `_inverse-backdrop` as file setup builds them ──────────────────────────────── */
section('templates — the two file components, against the Q171 spec');
{
  type Rec = Record<string, unknown> & { children: Rec[]; kind: string };
  const made = (kind: string): Rec => {
    const n = { kind, type: kind, children: [] as Rec[] } as Rec;
    n.resize = (w: number, h: number) => { n.width = w; n.height = h; };
    n.appendChild = (c: Rec) => { n.children.push(c); };
    return n;
  };
  const page = { children: [] as Rec[], appendChild(c: Rec) { page.children.push(c); }, findOne: (p: (n: unknown) => boolean) => page.children.find(p) ?? null };
  page.appendChild({ ...made('COMPONENT_SET'), name: '_section-header', x: 0, width: 2600 } as Rec);
  const bindings: { field: string; id: string }[] = [];
  const api = {
    createComponent: () => made('COMPONENT'),
    createText: () => made('TEXT'),
    createFrame: () => made('FRAME'),
    loadFontAsync: async () => {},
    combineAsVariants: (nodes: Rec[]) => {
      const set = made('COMPONENT_SET');
      set.children = [...nodes];
      set.props = [] as unknown[];
      set.addComponentProperty = (name: string, type: string, def: unknown) => { (set.props as unknown[]).push({ name, type, def }); return `${name}#1`; };
      page.children.push(set);
      return set;
    },
    variables: {
      getLocalVariablesAsync: async () => [{ id: 'V:9', name: 'zz/color/inverse/background/primary' }, { id: 'V:8', name: 'zz/color/background/primary' }],
      setBoundVariableForPaint: (p: object, field: string, v: { id: string }) => { bindings.push({ field, id: v.id }); return { ...p, boundVariables: { [field]: { type: 'VARIABLE_ALIAS', id: v.id } } }; },
    },
  } as unknown as TemplatesApi;
  const r = await ensureFurnitureTemplates(api, page);
  ok(JSON.stringify(r.built) === JSON.stringify(['_Label', '_inverse-backdrop']) && r.present.length === 0,
    `templates/built: a page holding only _section-header gets both (${JSON.stringify(r)})`);
  const set = page.children.find((n) => n.name === '_Label')!;
  ok(JSON.stringify(set.children.map((c) => c.name)) === JSON.stringify([
    'Text=Top, surface=default', 'Text=Top, surface=inverse', 'Text=Left, surface=default', 'Text=Left, surface=inverse',
    'Text=Right, surface=default', 'Text=Right, surface=inverse', 'Text=Bottom, surface=default', 'Text=Bottom, surface=inverse',
  ]), `templates/variants: Text = Top | Left | Right | Bottom × surface = default | inverse, Top first (${JSON.stringify(set.children.map((c) => c.name))})`);
  ok(JSON.stringify(set.props) === JSON.stringify([{ name: 'Show bracket', type: 'BOOLEAN', def: true }]) && set.children.every((m) => JSON.stringify((m.children.find((c) => c.name === 'bracket') as Rec).componentPropertyReferences) === JSON.stringify({ visible: 'Show bracket#1' })),
    'templates/bracket boolean: "Show bracket", default on, drives every bracket\'s visibility');
  const hex = (n: Rec, key: 'fills' | 'strokes') => { const c = (n[key] as { color: { r: number; g: number; b: number } }[])[0].color; return '#' + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  const top = set.children[0], topInv = set.children[1], left = set.children[2], right = set.children[4], bottom = set.children[6];
  const part = (m: Rec, name: string) => m.children.find((c) => c.name === name) as Rec;
  ok(top.layoutMode === 'VERTICAL' && top.counterAxisAlignItems === 'CENTER' && top.itemSpacing === 8 && top.clipsContent === true && top.primaryAxisSizingMode === 'AUTO' && top.counterAxisSizingMode === 'AUTO',
    'templates/root: VERTICAL, center-aligned, hug, gap 8, clips');
  const tt = part(top, 'text');
  ok(JSON.stringify(tt.fontName) === JSON.stringify({ family: 'Inter', style: 'Medium' }) && tt.fontSize === 12 && tt.characters === 'Label' && hex(tt, 'fills') === '#9747FF',
    'templates/text: Inter Medium 12, "Label", #9747FF');
  const tb = part(top, 'bracket');
  ok(tb.height === 14 && tb.layoutAlign === 'STRETCH' && tb.topLeftRadius === 5 && tb.topRightRadius === 5 && tb.bottomLeftRadius === 0
    && tb.strokeTopWeight === 1 && tb.strokeLeftWeight === 1 && tb.strokeRightWeight === 1 && tb.strokeBottomWeight === 0 && tb.clipsContent === true && hex(tb, 'strokes') === '#9747FF',
    'templates/top bracket: fill width, 14 high, top corners 5, 1px stroke top/start/end, clips');
  ok(top.children.map((c) => c.name).join() === 'text,bracket' && bottom.children.map((c) => c.name).join() === 'bracket,text' && right.children.map((c) => c.name).join() === 'bracket,text',
    'templates/order: text then bracket on Top and Left; bracket then text on Right and Bottom');
  const lb = part(left, 'bracket');
  ok(left.layoutMode === 'HORIZONTAL' && lb.width === 14 && lb.layoutAlign === 'STRETCH' && lb.topLeftRadius === 5 && lb.bottomLeftRadius === 5 && lb.topRightRadius === 0
    && lb.strokeTopWeight === 1 && lb.strokeBottomWeight === 1 && lb.strokeLeftWeight === 1 && lb.strokeRightWeight === 0,
    'templates/left bracket: HORIZONTAL root; 14 wide, fills the height, corners topStart/bottomStart 5, stroke top/bottom/start');
  ok(right.layoutMode === 'HORIZONTAL' && right.primaryAxisAlignItems === 'MAX' && part(right, 'bracket').rotation === 180 && part(bottom, 'text').characters === 'Enabled' && bottom.primaryAxisAlignItems === 'MAX',
    'templates/right and bottom: end-aligned, Right\'s bracket rotated 180°, Bottom\'s sample text "Enabled"');
  ok(hex(part(topInv, 'text'), 'fills') === '#E0C7FF' && hex(part(topInv, 'bracket'), 'strokes') === '#E0C7FF', 'templates/inverse: text and stroke #E0C7FF');
  const bd = page.children.find((n) => n.name === '_inverse-backdrop')!;
  const fill = (bd.fills as { boundVariables?: { color?: { id: string } } }[])[0];
  ok(bd.type === 'COMPONENT' && fill.boundVariables?.color?.id === 'V:9' && r.backdropBinding === 'bound' && bd.cornerRadius === 8,
    `templates/backdrop: a component, its fill bound to color/inverse/background/primary, radius 8 (${JSON.stringify(fill.boundVariables)}, ${r.backdropBinding})`);
  ok(Number(set.x) === 2760 && Number(bd.x) > Number(set.x), `templates/placed: right of what the page held, 160 clear (${set.x}, ${bd.x})`);
  const again = await ensureFurnitureTemplates(api, page);
  ok(again.built.length === 0 && JSON.stringify(again.present) === JSON.stringify(['_Label', '_inverse-backdrop']), `templates/idempotent: a second run builds nothing (${JSON.stringify(again)})`);
}

console.log(failed ? `\n❌ ${failed} failed` : '\n✅ canvas furniture: all checks passed');
if (failed) process.exit(1);
