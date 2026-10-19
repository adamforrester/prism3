/**
 * THE CANVAS FURNITURE (#2406 Q171, #2188 Q172/Q173) — labels, the inverse backdrop and the inverse grouping, checked
 * against the in-memory shim.
 *
 *   labels/…      the planner on a hand-laid grid: every column and row label's text and box, as literals worked out
 *                 by hand from the grid below. Mutation: a row label spanning the wrong row → `labels/rows`.
 *   draw/…        the executor on the same grid: each instance's position after its text sets its width, nested
 *                 columns stepping left, the backdrop behind the set, every instance tagged, a redraw replacing
 *                 rather than adding, another def's furniture and a hand-placed `inverse-bg` left alone.
 *   label text/…  the text layer a value goes into (#2558): `text`, `Text`, `TEXT` and a lone layer of another name
 *                 each take the value; with two, the one named text; with two and none so named, or with none, a
 *                 miss by name and the placeholder kept. The `_Label` member by its properties, any case and order.
 *                 Mutations: the exact-name lookup back → `label text/Text`, `label text/another name`; the lone
 *                 fallback guessing among several → `label text/ambiguous`; the variant matched by exact name only →
 *                 `label text/variant spelling`; a miss dropped silently → `label text/no layer`.
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
 *   pilot/…       Button, Tag and Text field (the pilot's three): the label texts and counts, literal, and each column label over its
 *                 column as the shim's nodes place it.
 *   rollout/…     every def that builds a set (#2502, Q212 A): the switch covers each one, held to `componentDefs`; on
 *                 an earlier layout its dry run reports the moves worked out by hand here (360 for the three buttons,
 *                 180 for the three icon buttons, none for the rest), the apply moves them, and the next dry run reads
 *                 up to date; its furniture is drawn with nothing skipped, a backdrop only for the six with `surface`
 *                 rows, and no label inside its own set.
 *   clearance/…   every page that holds more than one set, built in page order with each set's furniture drawn after
 *                 it lands: no label enters another set or its labels, and each later set's labels keep 40px from the
 *                 set to their left. Mutation: `SET_GAP` back to 160 → `clearance/Buttons`, `clearance/Icon button`.
 *   templates/missing…  a file without `_Label` or `_inverse-backdrop` (#2598): one line for the run, naming each
 *                 missing template and Set up file, and the update's summary carries it. Mutations: the line dropped →
 *                 `templates/missing build`; one line per set → the same; the summary left out → `templates/update summary`.
 *   placement/…   sets deleted and rebuilt on Buttons and Icon button with the header and the third set kept (#2598): each
 *                 lands under the header in the first free slot from its left edge. Mutations: the old rule → every
 *                 `placement/<page> …` arm; a gap or the set's width dropped → `placement/slot …`; the width dropped at
 *                 `applyComponentPlan`'s call → `placement/narrow gap`, a kept set moved into the rebuilt one's slot.
 *                 These arms read the helper's output; `test-build-completed.ts` `templates/… verdict` reads the line
 *                 in the verdicts `main.ts` posts.
 *   update/…      Tag with its labels drawn: the dry run reads all 45 members current with no hand edit and nothing
 *                 unstamped, and the as-built record covers 45 members. Mutations: the labels drawn into a member,
 *                 which the dry run then reads as 19 hand edits, or into the set → `update/ignores furniture`.
 *   moved/…       a set moved to another page, then into a frame (#2485): the next draw leaves none of its furniture
 *                 where it was and redraws all of it beside the set; another set's furniture, of the same def or
 *                 another, and an untagged node stay. Mutations: the moved set's clear dropped → `moved/to another
 *                 page`, `moved/into a frame`; matching by def instead of set id → `moved/others stay`; no clear when
 *                 drawing into a frame → `moved/into a frame` (its fixture is a frame with its own closures, #2485 review).
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
import { applyComponentPlan, placeNewSet, STAMP_KEY } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { makeShim, type Node } from './component-shim';
import { captureBaselines, previewUpdate, previewLine, previewVerdict, type UpdateHost } from './src/update-plan';
import { applyUpdate, applyVerdict, previewHashOf } from './src/update-apply';
import { BASELINE_KEY } from './src/member-baseline';
import { NS } from './src/persist-figma';
import { planFurniture, drawFurniture, furnishUpdate, furnitureDue, furnitureLayout, furnitureItems, withFurnitureItems, sentenceCase, pruneFurniture, clearFurniture, hasFurniture, SCRIM_BACKDROPS, type GridMember, type FurnitureApi, type XNode } from './src/canvas-furniture';
import { ensureFurnitureTemplates } from './src/furniture-templates';
import { allLeaves } from './src/file-taxonomy';
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
const labelInstance = (placement: 'Top' | 'Left', textNames: readonly string[] = ['text']): FNode => {
  const data = new Map<string, string>();
  const texts: FNode[] = textNames.map((name) => ({ type: 'TEXT', name, characters: 'Label', fontName: { family: 'Inter', style: 'Medium' } }) as FNode);
  const text: FNode = texts[0] ?? ({ characters: 'Label' } as FNode);
  let w: number | null = null;
  let h: number | null = null;
  // The `Show bracket` boolean as Figma keys it on an instance, with its `#id` suffix (#2568).
  const props: Record<string, { type: string; value: boolean }> = { 'Show bracket#1:0': { type: 'BOOLEAN', value: true } };
  const n: FNode = {
    id: `I:${++seq}`, type: 'INSTANCE', name: '_Label', x: 0, y: 0,
    get componentProperties() { return props; },
    setProperties(p: Record<string, boolean>) { for (const [k, v] of Object.entries(p)) { if (!props[k]) throw new Error(`no property ${k}`); props[k].value = v; } },
    get width() { return w ?? (placement === 'Top' ? 7 * String(text.characters).length : 7 * String(text.characters).length + 22); },
    get height() { return h ?? (placement === 'Top' ? 37 : 16); },
    // The text layers, then the bracket: a frame with no text in it.
    children: [...texts, { type: 'FRAME', name: 'bracket', children: [] } as unknown as FNode],
    findOne: (p: (x: XNode) => boolean) => texts.find(p) ?? null,
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
const fakeTemplates = (o: { labels?: boolean; backdrop?: boolean; scrim?: boolean; textNames?: readonly string[]; variants?: readonly [string, string] } = {}) => {
  const [topName, leftName] = o.variants ?? ['Text=Top, surface=default', 'Text=Left, surface=default'];
  const labelSet = {
    type: 'COMPONENT_SET', name: '_Label',
    children: [
      { type: 'COMPONENT', name: topName, createInstance: () => labelInstance('Top', o.textNames) },
      { type: 'COMPONENT', name: leftName, createInstance: () => labelInstance('Left', o.textNames) },
    ],
  };
  const backdrop = { type: 'COMPONENT', name: '_inverse-backdrop', fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, boundVariables: { color: { id: 'V:bound' } } }], createInstance: backdropInstance };
  // The scrim template (#2609), already bound, as a file set up after a theme holds it.
  const scrim = { type: 'COMPONENT', name: '_scrim-backdrop', fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.4, boundVariables: { color: { id: 'V:scrim' } } }], createInstance: backdropInstance };
  const api: FurnitureApi = {
    root: { findAllWithCriteria: () => [...(o.labels === false ? [] : [labelSet]), ...(o.backdrop === false ? [] : [backdrop]), ...(o.scrim === false ? [] : [scrim])] },
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
  ok(none.columns + none.rows + none.backdrops === 0 && JSON.stringify(none.missing) === JSON.stringify(['_Label', '_inverse-backdrop']) && none.skipped.length === 0,
    `draw/no template: a file without the templates draws nothing and names both as missing (${JSON.stringify(none.missing)}; ${JSON.stringify(none.skipped)})`);

  // #2598 — THE RUN'S ONE LINE. Two sets built in a file with neither template: one line naming both, never one per
  // set, and the action to take. The wording is written out here, never read off the module.
  const none2 = await drawFurniture(fakeTemplates({ labels: false, backdrop: false }), set, handLayout, 'grid');
  const both = 'No canvas labels or inverse backdrops drawn: this file has no _Label or _inverse-backdrop component. Run Set up file, then build again';
  const buildItems = furnitureItems([none, none2], 'build');
  ok(buildItems.length === 1 && buildItems[0] === both,
    `templates/missing build: one line for the run, naming both templates and Set up file (${JSON.stringify(buildItems)})`);
  const updateItems = furnitureItems([none], 'update');
  ok(updateItems.length === 1 && updateItems[0] === both.replace('then build again', 'then update again'),
    `templates/missing update: the update's line asks for an update again (${JSON.stringify(updateItems)})`);
  // Only `_Label` missing: the backdrop is drawn, and the line names the labels alone.
  const noLabel = await drawFurniture(fakeTemplates({ labels: false }), set, handLayout, 'grid');
  const labelOnly = furnitureItems([noLabel], 'build');
  ok(noLabel.backdrops === 1 && labelOnly.length === 1 && labelOnly[0] === 'No canvas labels drawn: this file has no _Label component. Run Set up file, then build again',
    `templates/missing label: the backdrop drawn, one line naming _Label alone (${noLabel.backdrops}; ${JSON.stringify(labelOnly)})`);
  ok(furnitureItems([o, again], 'build').length === 0, `templates/present: a file with both templates gets no line`);
  // The update's verdict: the line reaches its SUMMARY, the text an agent reads, as well as its lines.
  const verdict = { ok: true, headline: '✓ updated 3 in place', summary: 'grid: 3 updated in place.', lines: ['grid: 3 updated in place.'] };
  const withLine = withFurnitureItems(verdict, updateItems);
  ok(withLine.summary === `grid: 3 updated in place.\n${updateItems[0]}.` && withLine.lines[1] === `${updateItems[0]}.` && withLine.ok && withLine.headline === verdict.headline,
    `templates/update summary: the update's summary and lines both carry the line (${JSON.stringify(withLine.summary)})`);
  clearFurniture(page, 'grid');
}

section('label text — the text layer a value goes into, whatever the file\'s _Label calls it (#2558)');
{
  // The hand-laid grid again; every label's text is read off its own text layers here, never through the module.
  const nameOf = (v: Record<string, string>) => Object.entries(v).map(([k, x]) => `${k}=${x}`).join(', ');
  const handLayout = { ...LAYOUT, cells: GRID.map((m) => ({ name: nameOf(m.values), row: m.row, col: m.col })) };
  const WANT = ['Rest', 'Focus visible', 'Filled', 'Outline', 'Filled', 'Outline', 'Inverse'].sort();
  const run = async (o: Parameters<typeof fakeTemplates>[0]) => {
    const page = makePage();
    const set = { id: 'S:grid', type: 'COMPONENT_SET', name: 'grid', x: 1000, y: 500, width: 272, height: 536,
      children: GRID.map((m) => ({ name: nameOf(m.values), x: m.x, y: m.y, width: m.width, height: m.height })) } as unknown as FNode;
    page.appendChild(set);
    const out = await drawFurniture(fakeTemplates(o), set, handLayout, 'grid');
    const labels = furnitureOn(page).filter((n) => tagOf(n).kind === 'label');
    const texts = labels.map((n) => (n.children as FNode[]).filter((c) => c.type === 'TEXT').map((c) => String(c.characters)));
    return { out, labels, texts };
  };
  const written = (r: Awaited<ReturnType<typeof run>>) => JSON.stringify(r.texts.map((t) => t.find((x) => x !== 'Label') ?? 'Label').sort());
  for (const [name, layers] of [['lowercase', ['text']], ['Text', ['Text']], ['TEXT', ['TEXT']], ['another name', ['Caption']]] as const) {
    const r = await run({ textNames: layers });
    ok(r.labels.length === 7 && written(r) === JSON.stringify(WANT) && r.out.fontMisses.length === 0,
      `label text/${name}: a _Label whose text layer is ${JSON.stringify(layers[0])} shows each axis value, no placeholder left and no miss (${written(r)}; ${JSON.stringify(r.out.fontMisses)})`);
  }
  // Two text layers, one of them "Text": that one takes the value, the other is left as it was.
  const two = await run({ textNames: ['Note', 'Text'] });
  ok(two.texts.every((t) => t[0] === 'Label' && t[1] !== 'Label') && two.out.fontMisses.length === 0,
    `label text/prefers the named layer: with "Note" and "Text", "Text" takes the value (${JSON.stringify(two.texts[0])})`);
  // Two text layers and none named text: a miss by name, never a guess.
  const amb = await run({ textNames: ['Note', 'Caption'] });
  ok(amb.texts.every((t) => t.every((x) => x === 'Label')) && amb.out.fontMisses.length === 7 && amb.out.fontMisses.every((m) => m === '_Label has 2 text layers and none named "text"'),
    `label text/ambiguous: two text layers and neither named "text" is reported, nothing written (${JSON.stringify([...new Set(amb.out.fontMisses)])})`);
  const none = await run({ textNames: [] });
  ok(none.labels.length === 7 && none.out.fontMisses.length === 7 && none.out.fontMisses.every((m) => m === '_Label has no text layer'),
    `label text/no layer: a _Label with no text layer reports "_Label has no text layer" for each label (${JSON.stringify([...new Set(none.out.fontMisses)])})`);
  // The variant, found by its properties in any case and order.
  const spelled = await run({ textNames: ['Text'], variants: ['surface=Default, Text=Top', 'Surface=default, text=Left'] });
  ok(spelled.out.columns === 2 && spelled.out.rows === 5 && spelled.out.skipped.length === 0 && written(spelled) === JSON.stringify(WANT),
    `label text/variant spelling: "surface=Default, Text=Top" and "Surface=default, text=Left" still select Top and Left (${spelled.out.columns}, ${spelled.out.rows}; ${JSON.stringify(spelled.out.skipped)})`);
  const wrong = await run({ variants: ['Text=Bottom, surface=default', 'Text=Left, surface=inverse'] });
  ok(wrong.out.columns + wrong.out.rows === 0 && wrong.out.skipped.length === 2,
    `label text/variant mismatch: Bottom and inverse members never stand in for Top and Left (${JSON.stringify(wrong.out.skipped)})`);
}

/* ── the pilot defs, built by the real executor ─────────────────────────────────────────────────────────── */
const plansOf = (id: string): AnatomyPlan[] => figmaAnatomySet(componentDefs.find((d) => d.id === id)!, { swapTarget: SWAP_TARGET });
// A swap override's component (#2645) is in the file too: the build pre-builds it, so Dialog's `icon/close` (#2609) is listed.
const planComps = (n: { swapTarget?: string; nestTarget?: string; nestOverrides?: readonly { type: string; value: string }[]; children?: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value), ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
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
    // #2752 (owner decision Q1 B): medium leads, so the inserted Button is medium; Q213 had small first.
    && JSON.stringify(defs.size?.variantOptions) === JSON.stringify(['medium', 'small', 'large'])
    // #2501 (owner decision Q213): Pressed, with Pending after it, before Focus visible.
    && JSON.stringify(defs.state?.variantOptions) === JSON.stringify(['rest', 'hover', 'pressed', 'pending', 'focus-visible', 'disabled']),
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
  // #2501 (owner decision Q213): Pressed, with Pending after it, before Focus visible.
  ok(JSON.stringify(cols.map(textOf)) === JSON.stringify(['Rest', 'Hover', 'Pressed', 'Pending', 'Focus visible', 'Disabled']),
    `pilot/button columns: Rest, Hover, Pressed, Pending, Focus visible, Disabled (${JSON.stringify(cols.map(textOf))})`);
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
    // THE APPLY SAYS WHAT THE DRY RUN SAID (#2495, owner Q205 A): it entered the set with nothing to write, and the dry
    // run calls it "no changes", not up to date, since Adopt could claim a member. So its headline and set line are
    // the dry run's, never "already up to date". Mutation: the old fall-through restored → `unbuilt/apply as previewed`.
    const dry = previewVerdict({ sets: [p2], missing: [], refused: [] });
    ok(v2.headline === dry.headline && v2.lines[0] === previewLine(p2) && v2.headline === '✓ No changes found',
      `unbuilt/apply as previewed: the apply's headline and set line are the dry run's (${v2.headline} | ${v2.lines[0]} — the dry run: ${dry.headline} | ${previewLine(p2)})`);
    own.setSharedPluginData(NS, STAMP_KEY, stampWas);
    own.y = yWas;
    // And a set that IS up to date still reads so, on the dry run and on the apply.
    const p5 = (await previewUpdate(host, [{ def: 'button', plans }]));
    const r5 = applyVerdict(await applyUpdate(host as never, bApi as never, [{ def: 'button', plans }], previewHashOf(p5)));
    ok(previewLine(p5.sets[0]) === 'button: up to date (576 members).' && r5.headline === '✓ already up to date' && r5.lines[0] === 'button: already up to date.',
      `unbuilt/up to date: with the member Prism3's again, the dry run reads up to date and the apply "already up to date" (${previewLine(p5.sets[0])} | ${r5.headline} | ${r5.lines[0]})`);
  }
  // ITS HEIGHT STILL COUNTS (#2471 review, UI lane): a member Prism3 didn't build is never moved, but the executor's
  // layout sizes its row by every member in it, so a taller one pushes every row below it down, and the dry run's row
  // tops must count it too. 558 is every member below its row: Button's grid is 96 rows of 6 states, member 10 sits in
  // row 2, so 93 rows × 6 = 558. It is also off the grid, so the apply's re-lay would move it without the executor's
  // guard (#2494): the apply moves the 558 and leaves it exactly where it is. Mutations: `gridMoves`' row heights
  // skipping unstamped members → `unbuilt/row height` (0 to move); the LAY OUT pass's unstamped guard removed →
  // `unbuilt/relay left` (✓ moved 559).
  {
    const own = (set.children as FNode[])[10] as FNode & { setSharedPluginData(ns: string, k: string, v: string): void; getSharedPluginData(ns: string, k: string): string };
    const [stampWas, hWas] = [own.getSharedPluginData(NS, STAMP_KEY), Number(own.height)];
    // The shim's height is worked out from the node's bindings and content, so the test overrides the accessor itself.
    const hDesc = Object.getOwnPropertyDescriptor(own, 'height')!;
    const yWas = Number(own.y);
    own.setSharedPluginData(NS, STAMP_KEY, '');
    Object.defineProperty(own, 'height', { configurable: true, enumerable: hDesc.enumerable, get: () => hWas + 40 });
    own.y = yWas + 500;
    const grew = Number(own.height);
    const at = JSON.stringify([own.x, own.y]);
    const p3 = (await previewUpdate(host, [{ def: 'button', plans }])).sets[0];
    ok(grew === hWas + 40 && previewLine(p3) === 'button: 576 members. 558 to move, 1 not built by Prism3.' && !p3.positions?.includes(String(own.name)),
      `unbuilt/row height: a member Prism3 didn't build, taller than its row, moves every row below it, and is not itself a move (${hWas} → ${grew}px; ${previewLine(p3)})`);
    const r3 = await applyUpdate(host as never, bApi as never, [{ def: 'button', plans }], previewHashOf(await previewUpdate(host, [{ def: 'button', plans }])));
    const v3 = applyVerdict(r3);
    ok(v3.headline === '✓ moved 558' && v3.lines[0] === 'button: 558 moved, 1 left as they are.' && JSON.stringify([own.x, own.y]) === at,
      `unbuilt/relay left: the apply moves the 558 and leaves the member Prism3 didn't build exactly where it is (${v3.headline}; ${v3.lines[0]}; ${at} → ${JSON.stringify([own.x, own.y])})`);
    own.setSharedPluginData(NS, STAMP_KEY, stampWas);
    Object.defineProperty(own, 'height', hDesc);
    own.y = yWas;
    // Put the grid back for the arms below: with its height restored, the 558 move back up.
    await applyUpdate(host as never, bApi as never, [{ def: 'button', plans }], previewHashOf(await previewUpdate(host, [{ def: 'button', plans }])));
  }
  // ITS WIDTH STILL COUNTS (#2521 review, UI lane; the twin of `unbuilt/row height`): a member Prism3 didn't build, wider
  // than its column, pushes every column to its right across, and the dry run's column lefts must count it too. Read
  // off a member in the REST column, which leads Button's six state columns before #2509's reorder (owner decision
  // Q213) and after it, so 480 holds on both: 5 columns to its right × 96 rows. Mutation: `gridMoves`' column widths
  // skipping unstamped members (`if (m.stamp) colW[…] = …`) → `unbuilt/column width` (0 to move).
  {
    const own = (set.children as FNode[]).find((m) => /(^|, )state=rest(,|$)/.test(String(m.name))) as FNode & { setSharedPluginData(ns: string, k: string, v: string): void; getSharedPluginData(ns: string, k: string): string };
    const [stampWas, wWas] = [own.getSharedPluginData(NS, STAMP_KEY), Number(own.width)];
    const wDesc = Object.getOwnPropertyDescriptor(own, 'width')!;
    own.setSharedPluginData(NS, STAMP_KEY, '');
    Object.defineProperty(own, 'width', { configurable: true, enumerable: wDesc.enumerable, get: () => wWas + 400 });
    const grew = Number(own.width);
    const p4 = (await previewUpdate(host, [{ def: 'button', plans }])).sets[0];
    ok(grew === wWas + 400 && previewLine(p4) === 'button: 576 members. 480 to move, 1 not built by Prism3.' && !p4.positions?.includes(String(own.name)),
      `unbuilt/column width: a member Prism3 didn't build, wider than its column, moves every column to its right, and is not itself a move (${wWas} → ${grew}px; ${previewLine(p4)})`);
    own.setSharedPluginData(NS, STAMP_KEY, stampWas);
    Object.defineProperty(own, 'width', wDesc);
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
    // #2752 (owner decision Q1 B): each size ladder reads medium, small, large, the field family's order.
    ['Select', 'Dismissible', 'Unselected', 'Selected', 'Medium', 'Small', 'Large', 'Medium', 'Small', 'Large', 'Medium', 'Small', 'Large']],
  ['text-field', ['Rest', 'Hover', 'Filled', 'Focus visible', 'Focus visible filled', 'Disabled', 'Read only'],
    ['Default', 'Error', 'Warning', 'Success', ...Array.from({ length: 4 }, () => ['Medium', 'Small', 'Large']).flat()]],
  // #2317: the Password field is TextField's grid, from the shared field factory.
  ['password-field', ['Rest', 'Hover', 'Filled', 'Focus visible', 'Focus visible filled', 'Disabled', 'Read only'],
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
  // The shim sizes members from their bindings, not their values, so most rows here are thinner than the label's 16px
  // and take the thin-row rule (#2568): the label keeps its height, centered on one row's members.
  const spans = inner.every((n) => (members.some((m) => boxOf(set, m).y === n.y) && members.some((m) => boxOf(set, m).y + boxOf(set, m).h === Number(n.y) + Number(n.height)))
    || members.some((m) => boxOf(set, m).h < 16 && boxOf(set, m).y + boxOf(set, m).h / 2 === Number(n.y) + Number(n.height) / 2));
  ok(inner.length === (id === 'tag' ? 9 : 12) && spans, `labels/rows ${id}: each innermost bracket starts on a member's top and ends on a member's bottom, or is centered on a row thinner than itself (${inner.length})`);
  ok(o.backdrops === 0 && !o.skipped.length, `pilot/${id}: no inverse rows, so no backdrop, and nothing skipped (${o.backdrops})`);
}

/* ── a row thinner than its label (#2568, owner decision Q258 A) ─────────────────────────────────────────── */
section('thin row — Divider: a 1px row draws its label centered, with no bracket');
{
  const { plans, page, set } = await buildOnPage('divider');
  // The shim sizes a member from its bindings, not their values, so the live sizes are written here: the horizontal
  // rule is `border-width.hairline` (1px) tall, the vertical one its nominal length. Literals, as measured live.
  const members = set.children as FNode[];
  for (const m of members) {
    const h = valuesOf(String(m.name)).orientation === 'horizontal' ? 1 : 48;
    Object.defineProperty(m, 'height', { configurable: true, enumerable: true, get: () => h });
  }
  await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), 'divider');
  const rows = furnitureOn(page).filter((n) => Number(n.x) < Number(set.x));
  const bracketOn = (n: FNode): boolean => (n.componentProperties as Record<string, { value: boolean }>)['Show bracket#1:0'].value;
  // The oracle is the members' boxes, never the plan: a row is thin where its members are shorter than the label's
  // own 16px (the shim's hug height, `labelInstance`).
  const rowOf = (n: FNode) => members.filter((m) => boxOf(set, m).y < Number(n.y) + Number(n.height) && boxOf(set, m).y + boxOf(set, m).h > Number(n.y));
  const thin = rows.filter((n) => rowOf(n).every((m) => Number(m.height) < 16));
  const tall = rows.filter((n) => !thin.includes(n));
  ok(thin.length === 1 && textOf(thin[0]) === 'Horizontal' && thin.every((n) => !bracketOn(n)),
    `thin row/no bracket: every label on a row thinner than itself has its bracket off (${thin.length} thin: ${thin.map((n) => `${textOf(n)} ${bracketOn(n) ? 'on' : 'off'}`).join(', ')})`);
  ok(thin.every((n) => Number(n.height) === 16),
    `thin row/not clipped: each keeps its own 16px height, never the row's (${thin.map((n) => n.height).join(', ')})`);
  const centered = thin.every((n) => { const ms = rowOf(n); const top = Math.min(...ms.map((m) => boxOf(set, m).y)); const bottom = Math.max(...ms.map((m) => boxOf(set, m).y + boxOf(set, m).h)); return Number(n.y) + Number(n.height) / 2 === (top + bottom) / 2; });
  ok(centered, `thin row/centered: each label's middle sits on its row's middle (${thin.map((n) => `${n.y}+${n.height}`).join(', ')})`);
  ok(tall.length > 0 && tall.every((n) => bracketOn(n) && rowOf(n).some((m) => boxOf(set, m).y === Number(n.y))),
    `thin row/others unchanged: a row as tall as its label keeps its bracket and spans its row (${tall.length}: ${tall.map(textOf).join(', ')})`);
}

/* ── the scrim behind each Dialog example (#2609, owner decisions Q303.2 A and Q303.3 A) ───────────────────── */
section('scrim — Dialog: the backdrop is furniture behind each center and bottom member, never in the set');
{
  // THE REACH, literal: 12px all round a centered panel, 12px above a bottom sheet and flush on its other three sides,
  // and no entry for full screen, which has no visible backdrop (Q303.8). Typed here, never read off the engine.
  ok(JSON.stringify(SCRIM_BACKDROPS) === JSON.stringify({ dialog: { axis: 'placement', reach: { center: [12, 12, 12, 12], bottom: [12, 0, 0, 0] } } }),
    `scrim/reach: center 12 all round, bottom 12 above only, full none, and Dialog the only def (${JSON.stringify(SCRIM_BACKDROPS)})`);
  // THE PLANNER on a hand-laid three-member grid at (1000, 500): a 560×200 center panel at (24, 24), a 360×180 bottom
  // sheet at (24, 248) and a 360×640 full panel at (408, 248). Expected rectangles worked out by hand.
  const DIALOG_GRID: GridMember[] = [
    { row: 0, col: 0, values: { placement: 'center', footer: 'inline', size: 'medium' }, x: 24, y: 24, width: 560, height: 200 },
    { row: 1, col: 0, values: { placement: 'bottom', footer: 'inline', size: 'medium' }, x: 24, y: 248, width: 360, height: 180 },
    { row: 1, col: 1, values: { placement: 'full', footer: 'stacked', size: 'medium' }, x: 408, y: 248, width: 360, height: 640 },
  ];
  const dl = { rowKeys: ['placement', 'size'], colKey: 'footer', colVals: ['inline', 'stacked', 'none'] };
  const sp = planFurniture({ x: 1000, y: 500 }, DIALOG_GRID, dl, 'dialog');
  ok(JSON.stringify(sp.scrims) === JSON.stringify([{ x: 1012, y: 512, width: 584, height: 224 }, { x: 1024, y: 736, width: 360, height: 192 }]),
    `scrim/planner: one scrim round the center panel, one above the bottom sheet flush with its sides and bottom, none for full (${JSON.stringify(sp.scrims)})`);
  ok(planFurniture({ x: 1000, y: 500 }, DIALOG_GRID, dl).scrims.length === 0 && planFurniture({ x: 1000, y: 500 }, GRID, LAYOUT, 'button').scrims.length === 0,
    'scrim/only dialog: the same grid with no def, and Button\'s grid, plan no scrim');

  // THE EXECUTOR: the real Dialog set, built by the executor, its furniture drawn from fake templates.
  const { plans, page, set } = await buildOnPage('dialog');
  const members = set.children as FNode[];
  const o = await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), 'dialog');
  const scrims = furnitureOn(page).filter((n) => tagOf(n).kind === 'backdrop');
  const spanned = members.filter((m) => valuesOf(String(m.name)).placement !== 'full').every((m) => {
    const b = boxOf(set, m);
    const p = valuesOf(String(m.name)).placement;
    const want = p === 'center' ? { x: b.x - 12, y: b.y - 12, w: b.w + 24, h: b.h + 24 } : { x: b.x, y: b.y - 12, w: b.w, h: b.h + 12 };
    return scrims.some((n) => Number(n.x) === want.x && Number(n.y) === want.y && Number(n.width) === want.w && Number(n.height) === want.h);
  });
  ok(o.scrims === 12 && scrims.length === 12 && spanned,
    `scrim/drawn: 12 scrims, one fitted to each of the 9 center and 3 bottom members, none for the 3 full ones (${o.scrims}, ${scrims.length})`);
  ok(scrims.every((n) => page.children.indexOf(n) < page.children.indexOf(set)) && !members.some((m) => /scrim/.test(String(m.name))),
    'scrim/behind and outside: every scrim is under the set on the page, and no member of the set is a scrim');
  const fullBoxes = members.filter((m) => valuesOf(String(m.name)).placement === 'full').map((m) => boxOf(set, m));
  ok(fullBoxes.length === 3 && !scrims.some((n) => fullBoxes.some((b) => Number(n.x) < b.x + b.w && Number(n.x) + Number(n.width) > b.x && Number(n.y) < b.y + b.h && Number(n.y) + Number(n.height) > b.y)),
    'scrim/full: no scrim reaches a full-screen member');
  // A FILE WITHOUT THE TEMPLATE: nothing drawn, the template named once in the run's line.
  const { plans: p2, set: s2 } = await buildOnPage('dialog');
  const miss = await drawFurniture(fakeTemplates({ scrim: false }), s2, furnitureLayout(p2), 'dialog');
  ok(miss.scrims === 0 && JSON.stringify(miss.missing) === JSON.stringify(['_scrim-backdrop'])
    && furnitureItems([miss], 'build')[0] === 'No scrim backdrops drawn: this file has no _scrim-backdrop component. Run Set up file, then build again',
    `scrim/missing: no template, no scrim, and the run says so once (${JSON.stringify(miss.missing)}, "${furnitureItems([miss], 'build')[0]}")`);
}

/* ── rollout: furniture on every def that builds a set (#2502, owner decision Q212 A) ──────────────────────── */
section('rollout — every def that builds a set: drawn, converged, and clear of its neighbors');
{
  // THE SWITCH COVERS EVERY SET. The oracle is the def registry, never the engine's list: every def with Figma
  // properties builds a set, except the two that build single components (`emitAsComponents`), which have no grid.
  const withSet = componentDefs.filter((d) => d.figmaProperties && !d.figmaProperties.emitAsComponents).map((d) => d.id);
  const single = componentDefs.filter((d) => d.figmaProperties?.emitAsComponents).map((d) => d.id);
  ok(withSet.length === 41 && withSet.every(hasFurniture) && JSON.stringify(single) === JSON.stringify(['icon', 'spinner']) && !single.some(hasFurniture),
    `rollout/switch: all 41 defs that build a set have furniture; Icon and Spinner, single components, do not (off: ${JSON.stringify(withSet.filter((id) => !hasFurniture(id)))})`);

  // THE MEMBERS AN EARLIER LAYOUT HOLDS OFF THEIR GROUPED ROW, per def, worked out by hand. Only a def with a `surface`
  // ROW axis regroups. Button and its two siblings: 360, as `MOVES` above. The three icon buttons: 36 rows of 6
  // states; the earlier row order is appearance (3) × shape (2) × surface (2) × size (3), the grouped one surface ×
  // appearance × shape × size, so a row keeps its place only where 12a + 6s + 3u = 18u + 6a + 3s, that is 2a + s =
  // 5u: (filled, square?, default) — a = 0, s = 0, u = 0 — and a = 2, s = 1, u = 1. Six rows stay, 30 rows × 6 = 180
  // move. Link (#2580): 24 rows of 4 states; the earlier row order is style (2) × weight (2) × surface (2) × size (3),
  // the grouped one surface × style × weight × size, so a row stays only where 12s + 6w + 3u = 12u + 6s + 3w, that is
  // 2s + w = 3u: (standalone, emphasis, default) and (inline, default, inverse). Six rows stay, 18 rows × 4 = 72 move.
  // Every other def: none, its layout is the one it had.
  const MOVES_BY_DEF: Record<string, number> = {
    button: 360, 'button-destructive': 360, 'button-neutral': 360,
    'icon-button': 180, 'icon-button-destructive': 180, 'icon-button-neutral': 180,
    link: 72,
  };
  // THE DEFS WITH A BACKDROP: the seven above, the only ones whose rows split by `surface`. Focus ring has `surface`
  // too, but as its grid axis (two columns), so it gets two column labels and no backdrop (held for the owner, #2502).
  const BACKDROP = new Set(Object.keys(MOVES_BY_DEF));
  for (const id of withSet) {
    const { plans, page, api, set } = await buildOnPage(id);
    const members = set.children as FNode[];
    const host = {
      ...api,
      root: { ...(api.root as object), findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : (api.root as { findAllWithCriteria: (c: unknown) => unknown[] }).findAllWithCriteria(c)) },
    } as unknown as UpdateHost;
    const targets = [{ def: id, plans }];
    // An earlier layout, as the Button arm above lays one: each member on the row the old order gave it.
    const built = new Map(members.map((m) => [String(m.name), { x: Number(m.x), y: Number(m.y) }] as const));
    const rowY = new Map(planSetLayout(plans, 'test').cells.map((c) => [c.row, built.get(c.name)!.y] as const));
    for (const c of planSetLayout(plans.map((p) => ({ ...p, component: `${id}-before-2502` })), 'test').cells)
      (members.find((m) => m.name === c.name) as Record<string, unknown>).y = rowY.get(c.row);
    const want = MOVES_BY_DEF[id] ?? 0;
    const pre = (await previewUpdate(host, targets)).sets[0];
    const others = pre ? pre.counts.update + pre.counts.add + pre.counts.drop + pre.counts.rename + pre.counts.handEdited + pre.counts.noBaseline + pre.counts.unstamped + pre.counts.revisionUnknown : -1;
    ok(!!pre && (pre.counts.move ?? 0) === want && others === 0,
      `rollout/${id} dry run: ${want} to move on an earlier layout, and nothing else (${pre ? previewLine(pre) : 'no set read'})`);
    if (want) {
      const res = await applyUpdate(host as never, api as never, targets, previewHashOf(await previewUpdate(host, targets)));
      ok(res.outcomes[0]?.moved === want, `rollout/${id} apply: ${want} moved (${applyVerdict(res).lines[0]})`);
    }
    const next = (await previewUpdate(host, targets)).sets[0];
    ok(!!next && previewLine(next) === `${id}: up to date (${members.length} members).` && members.every((m) => Number(m.x) === built.get(String(m.name))!.x && Number(m.y) === built.get(String(m.name))!.y),
      `rollout/${id} converges: the next dry run reads up to date, every member back where a fresh build puts it (${next ? previewLine(next) : 'no set read'})`);

    const o = await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), id);
    const furn = furnitureOn(page);
    // THE DRY RUN'S CHECK READS THE DRAW AS DRAWN (#2803): right after a draw, nothing is due, on every def. A check
    // that matched a part the draw places differently would list it on every run, and "No changes found" would never come.
    const due = furnitureDue(fakeTemplates(), set, furnitureLayout(plans), id);
    ok(due.labels + due.backdrops === 0 && due.clear === 0, `rollout/${id} due: nothing due right after the draw (${JSON.stringify(due)})`);
    const surfaces = new Set(members.map((m) => valuesOf(String(m.name)).surface).filter(Boolean));
    // THE SCRIMS (#2609): Dialog alone, one behind each of its 9 center and 3 bottom members; every other def none.
    ok(o.scrims === (id === 'dialog' ? 12 : 0), `rollout/${id} scrims: ${id === 'dialog' ? '12, behind the center and bottom members' : 'none'} (${o.scrims})`);
    ok(o.columns + o.rows > 0 && o.skipped.length === 0 && furn.length === o.columns + o.rows + o.backdrops + o.scrims,
      `rollout/${id} drawn: ${o.columns} column and ${o.rows} row labels, nothing skipped (${JSON.stringify(o.skipped)})`);
    ok(BACKDROP.has(id) ? o.backdrops === 1 && surfaces.has('inverse') : o.backdrops === 0,
      `rollout/${id} backdrop: ${BACKDROP.has(id) ? 'one, behind the inverse block' : surfaces.size ? 'none: surface is its grid axis' : 'none: no surface axis'} (${o.backdrops})`);
    // INSIDE THE SET'S BOX, NOTHING: every label sits outside it.
    const sb = { x: Number(set.x), y: Number(set.y), w: Number(set.width), h: Number(set.height) };
    const inside = furn.filter((n) => tagOf(n).kind === 'label' && Number(n.x) < sb.x + sb.w && Number(n.x) + Number(n.width) > sb.x && Number(n.y) < sb.y + sb.h && Number(n.y) + Number(n.height) > sb.y);
    ok(inside.length === 0, `rollout/${id} outside: no label overlaps its own set (${inside.map(textOf).join(', ')})`);
  }

  // SIDE BY SIDE (#2471 item 10): the pages that hold more than one set, built in page order by the real executor so
  // each later set is placed by `placeNewSet`, with its furniture drawn after it lands, as a build does. No label or
  // backdrop may enter another set's box or another set's labels, and each set's row labels keep at least 40px
  // (2.5 × the 16px `LABEL_GAP`, written here) from the set to their left, so they read as their own set's.
  // The pages, by hand; held to the taxonomy so a new shared page is not skipped.
  const SHARED: Record<string, string[]> = {
    // #2661: Button.Group joins the Button family's page.
    Buttons: ['button', 'button-destructive', 'button-neutral', 'button-group'],
    'Icon button': ['icon-button', 'icon-button-destructive', 'icon-button-neutral'],
    Checkbox: ['checkbox-control', 'checkbox-row', 'checkbox-group'],
    Radio: ['radio-control', 'radio-row', 'radio-group'],
    Switch: ['switch-control', 'switch-row'],
    Tabs: ['tab-item', 'tabs'],
    'Segmented control': ['segmented-control-segment', 'segmented-control'],
    Accordion: ['_accordion-indicator', 'accordion'],
    List: ['list-item', 'list'],
    // #2457 Q295.2 B: the flush icon button's three families share one page, as IconButton's do.
    'Flush Icon Button': ['flush-icon-button', 'flush-icon-button-destructive', 'flush-icon-button-neutral'],
  };
  const fromTaxonomy = Object.fromEntries(allLeaves().filter(({ leaf }) => leaf.defs.length > 1).map(({ leaf }) => [leaf.page, [...leaf.defs]]));
  ok(JSON.stringify(fromTaxonomy) === JSON.stringify(SHARED), `clearance/pages: the ten pages that hold more than one set (${JSON.stringify(Object.keys(fromTaxonomy))})`);
  const box = (n: FNode) => ({ x: Number(n.x), y: Number(n.y), w: Number(n.width), h: Number(n.height) });
  const meets = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (const [name, ids] of Object.entries(SHARED)) {
    const page = makePage(`↳ ${name}`);
    for (const id of ids) {
      const plans = plansOf(id);
      const api = makeShim({
        vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
        styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
        effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
        comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
        page: page as unknown as { children: Node[] },
        liveRoot: true,
        identities: true,
        keyPrefix: id,
      }) as Record<string, unknown>;
      await applyComponentPlan(plans, api as never, { targetPage: page as never });
      // By name: each def's shim numbers its own node ids, so two sets on this page can share one.
      const set = page.children.find((c) => c.type === 'COMPONENT_SET' && c.name === id) as FNode;
      await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), id);
    }
    const sets = page.children.filter((c) => c.type === 'COMPONENT_SET').sort((a, b) => Number(a.x) - Number(b.x));
    const furn = furnitureOn(page);
    const hits: string[] = [];
    for (const f of furn) {
      for (const s of sets) if (s.name !== tagOf(f).def && meets(box(f), box(s))) hits.push(`"${textOf(f) || 'backdrop'}" of ${tagOf(f).def} on ${String(s.name)}`);
      for (const g of furn) if (tagOf(g).def !== tagOf(f).def && meets(box(f), box(g))) hits.push(`"${textOf(f) || 'backdrop'}" of ${tagOf(f).def} on "${textOf(g) || 'backdrop'}" of ${tagOf(g).def}`);
    }
    const clear = sets.slice(1).map((s, i) => {
      const own = furn.filter((f) => tagOf(f).def === s.name);
      return Math.min(...own.map((f) => Number(f.x))) - (Number(sets[i].x) + Number(sets[i].width));
    });
    ok(sets.length === ids.length && hits.length === 0 && clear.every((c) => c >= 40),
      `clearance/${name}: ${sets.length} sets, no label on a neighboring set or its labels, and each later set's labels ${clear.join(', ')}px clear of the set to their left (${hits.slice(0, 3).join('; ')})`);
  }
}

/* ── placement: a rebuilt set goes back under the page's header (#2598) ─────────────────────────────────── */
section('placement — sets deleted and rebuilt on a page that keeps its header and a sibling set (#2598)');
{
  // LIVE (#2598): on Buttons the owner deleted `button` and `button-destructive`, kept `button-neutral`, and rebuilt
  // the two. The rebuilt `button` landed right of `button-neutral`, past the header's right edge. Replayed here on
  // both families' pages: the three sets built in page order with their labels, a header placed over the content as
  // `page-header.ts` places one (the content's left edge, its bottom 80 above the content's top, the content's
  // width), the first two sets deleted with their labels left behind (deleting a set does not delete them), then
  // each rebuilt as `main.ts` builds: its own old labels cleared, the set built, its labels drawn.
  // THE SLOT, on literal boxes: a header at 0,-300 (3000 × 220) and a set the designer left at 1000,0 (500 × 200). A
  // slot is free when the new set, with 400 on each side for its own labels and its neighbor's, meets nothing. A 500-wide
  // set fits left of it (0 + 500 + 400 = 900, short of 1000); a 700-wide one does not (1100), and goes 400 past it, to
  // 1500 + 400 = 1900. A 500-wide one with a node at -300..-100 in its row starts 400 past that node, at 300, where
  // 300 + 500 + 400 = 1200 passes 1000, so it goes to 1900 too.
  const hdr = { type: 'INSTANCE', x: 0, y: -300, width: 3000, height: 220, header: true };
  const kept = { type: 'COMPONENT_SET', x: 1000, y: 0, width: 500, height: 200 };
  const at = (p: { x: number; y: number } | null) => (p ? `${p.x},${p.y}` : 'null');
  ok(at(placeNewSet([hdr, kept], 200, 500)) === '0,0', `placement/slot fits: a 500-wide set takes the gap left of the kept set, at 0,0 (got ${at(placeNewSet([hdr, kept], 200, 500))})`);
  ok(at(placeNewSet([hdr, kept], 200, 700)) === '1900,0', `placement/slot too narrow: a 700-wide set leaves 400 for the kept set's labels, so it goes past it, at 1900,0 (got ${at(placeNewSet([hdr, kept], 200, 700))})`);
  const stray = { type: 'FRAME', x: -300, y: 50, width: 200, height: 50 };
  ok(at(placeNewSet([hdr, kept, stray], 200, 500)) === '1900,0', `placement/slot left gap: a node at -300..-100 pushes the slot to 300, where 500 wide no longer fits before the kept set, so 1900,0 (got ${at(placeNewSet([hdr, kept, stray], 200, 500))})`);

  const buildOne = async (page: ReturnType<typeof makePage>, id: string): Promise<FNode> => {
    const plans = plansOf(id);
    clearFurniture(page, id);
    const api = makeShim({
      vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
      styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
      effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
      comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
      page: page as unknown as { children: Node[] },
      liveRoot: true,
      identities: true,
      keyPrefix: id,
    }) as Record<string, unknown>;
    await applyComponentPlan(plans, api as never, { targetPage: page as never });
    const set = page.children.find((c) => c.type === 'COMPONENT_SET' && c.name === id) as FNode;
    await drawFurniture(fakeTemplates(), set, furnitureLayout(plans), id);
    return set;
  };
  const box = (n: FNode) => ({ x: Number(n.x), y: Number(n.y), w: Number(n.width), h: Number(n.height) });
  const meets = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (const [name, ids] of [['Buttons', ['button', 'button-destructive', 'button-neutral']], ['Icon button', ['icon-button', 'icon-button-destructive', 'icon-button-neutral']]] as const) {
    const page = makePage(`↳ ${name}`);
    const first: Record<string, ReturnType<typeof box>> = {};
    for (const id of ids) first[id] = box(await buildOne(page, id));
    const content = page.children.map(box);
    const left = Math.min(...content.map((b) => b.x));
    const top = Math.min(...content.map((b) => b.y));
    const right = Math.max(...content.map((b) => b.x + b.w));
    const header = { id: `HDR:${name}`, type: 'INSTANCE', name: '_Section-header', x: left, y: top - 80 - 220, width: right - left, height: 220 } as unknown as FNode;
    page.appendChild(header);
    for (const id of ids.slice(0, 2)) detach(page.children.find((c) => c.type === 'COMPONENT_SET' && c.name === id)!);
    const hb = box(header);
    const a = box(await buildOne(page, ids[0]));
    ok(a.x === hb.x && a.y === first[ids[2]].y && a.x + a.w <= hb.x + hb.w,
      `placement/${name} first: the rebuilt ${ids[0]} lands under the header on its left edge, top-aligned with ${ids[2]}, at ${hb.x},${first[ids[2]].y} (got ${a.x},${a.y}; the header spans ${hb.x}..${hb.x + hb.w})`);
    const b = box(await buildOne(page, ids[1]));
    ok(b.x === a.x + a.w + 400 && b.y === a.y && b.x + b.w <= hb.x + hb.w,
      `placement/${name} second: the rebuilt ${ids[1]} lands 400 right of ${ids[0]}, top-aligned, still under the header, at ${a.x + a.w + 400},${a.y} (got ${b.x},${b.y})`);
    // NOTHING MEETS ANYTHING ELSE'S: no set on another set or on another set's labels, the header on nothing.
    const sets = page.children.filter((c) => c.type === 'COMPONENT_SET');
    const furn = furnitureOn(page);
    const hits: string[] = [];
    for (const s1 of sets) {
      if (meets(box(s1), hb)) hits.push(`${String(s1.name)} on the header`);
      for (const s2 of sets) if (s2 !== s1 && meets(box(s1), box(s2))) hits.push(`${String(s1.name)} on ${String(s2.name)}`);
      for (const f of furn) if (tagOf(f).def !== s1.name && meets(box(s1), box(f))) hits.push(`${String(s1.name)} on a label of ${tagOf(f).def}`);
    }
    const order = sets.slice().sort((p, q) => Number(p.x) - Number(q.x)).map((c) => String(c.name));
    ok(hits.length === 0 && JSON.stringify(order) === JSON.stringify(ids),
      `placement/${name} clear: the sets read ${order.join(', ')} left to right, and none meets the header, another set or another set's labels (${hits.slice(0, 3).join('; ') || 'none'})`);
  }
  // THE WIDTH AT THE CALL SITE (#2598 review): the replay above always leaves a label column of slack, so a rebuilt set
  // placed as if it had no width lands in the same spot. Here the kept set is moved left, with its labels, until its
  // leftmost node sits half the rebuilt set's width short of `width + 400` past the header's left edge: a slot
  // that holds a zero-width set and not the real one. The rebuilt set must go past the kept set, as the slot rule
  // says, not under its labels. Mutation: `applyComponentPlan` passing width 0 → `placement/narrow gap`.
  {
    const page = makePage('↳ Narrow gap');
    const w = box(await buildOne(page, 'button')).w;
    await buildOne(page, 'button-neutral');
    const content = page.children.map(box);
    const left = Math.min(...content.map((b) => b.x));
    const top = Math.min(...content.map((b) => b.y));
    const right = Math.max(...content.map((b) => b.x + b.w));
    const header = { id: 'HDR:narrow', type: 'INSTANCE', name: '_Section-header', x: left, y: top - 80 - 220, width: right - left, height: 220 } as unknown as FNode;
    page.appendChild(header);
    detach(page.children.find((c) => c.type === 'COMPONENT_SET' && c.name === 'button')!);
    const keptSet = page.children.find((c) => c.type === 'COMPONENT_SET' && c.name === 'button-neutral')!;
    const keptNodes = [keptSet, ...furnitureOn(page).filter((f) => tagOf(f).def === 'button-neutral')];
    const dx = left + 400 + Math.round(w / 2) - Math.min(...keptNodes.map((n) => Number(n.x)));
    for (const n of keptNodes) n.x = Number(n.x) + dx;
    const keptLeft = Math.min(...keptNodes.map((n) => Number(n.x)));
    const keptRight = Math.max(...keptNodes.map((n) => Number(n.x) + Number(n.width)));
    const ok1 = keptLeft >= left + 400 && keptLeft < left + w + 800;
    const a = box(await buildOne(page, 'button'));
    const hitsKept = keptNodes.filter((n) => meets(a, box(n))).length;
    ok(ok1 && a.x >= keptRight + 400 && hitsKept === 0,
      `placement/narrow gap: the kept set's nodes start at ${keptLeft}, ${keptLeft - left} past the header's left edge, short of the rebuilt set's ${w} + 800, so it lands past them, at ${keptRight + 400} or right (got ${a.x}; ${hitsKept} kept node(s) met)`);
  }
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

/* ── update: furniture the page lacks is a change (#2803, owner decision Q379 A) ──────────────────────────── */
// LIVE (#2803): an Update ran on a file with no `_inverse-backdrop`, said "Run Set up file, then update again", and once
// Set up file added the template the next dry run read "No changes found", so the backdrops behind Button's inverse rows
// were never drawn. Here: Button built and its furniture drawn while the template was absent, then the template added.
// The dry run lists the backdrop, the apply draws it and touches no member, and the next dry run reads current. The
// expected lines are literals. Mutation: the furniture check dropped from `previewUpdate` → `due/dry run lists`,
// `due/apply draws`, `due/stale`.
section('due — furniture the page lacks is listed by the dry run, drawn by the apply, and then reads current (#2803)');
{
  const { plans, page, api, set } = await buildOnPage('button');
  let withBackdrop = false;
  const templates = (): readonly unknown[] => fakeTemplates({ backdrop: withBackdrop }).root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
  const root = {
    ...(api.root as object),
    findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET')
      : [...(api.root as { findAllWithCriteria: (c: unknown) => unknown[] }).findAllWithCriteria(c), ...(c.types.some((t) => t === 'COMPONENT' || t === 'COMPONENT_SET') ? templates() : [])]),
  };
  const host = { ...api, root } as unknown as UpdateHost;
  const fApi: FurnitureApi = { root: root as FurnitureApi['root'], loadFontAsync: async () => {} };
  const targets = [{ def: 'button', plans }];
  // Built while the template was absent: the labels drawn, the backdrop named missing.
  const [first] = await furnishUpdate(fApi, { outcomes: [{ def: 'button' }] }, targets);
  ok(first.rows === 35 && first.columns === 6 && first.backdrops === 0 && JSON.stringify(first.missing) === JSON.stringify(['_inverse-backdrop']),
    `premise: Button's labels are drawn and its backdrop is not, for want of the template (${first.columns} + ${first.rows}, ${first.backdrops}; missing ${JSON.stringify(first.missing)})`);
  // A template the file still lacks is not a change: the apply could not draw it.
  const absent = await previewUpdate(host, targets);
  ok(!absent.sets[0].furniture && previewLine(absent.sets[0]) === 'button: up to date (576 members).',
    `due/template absent: a backdrop with no template to draw it from is not listed (${previewLine(absent.sets[0])})`);
  withBackdrop = true;
  const members = (): string => JSON.stringify((set.children as FNode[]).map((m) => [m.id, m.x, m.y, (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)]));
  const membersWas = members();
  const pre = await previewUpdate(host, targets);
  const v = previewVerdict(pre);
  ok(JSON.stringify(pre.sets[0].furniture) === JSON.stringify({ labels: 0, backdrops: 1, clear: 0 }) && previewLine(pre.sets[0]) === 'button: 576 members. 1 backdrop to draw.' && v.headline === 'Would change 1 of 1',
    `due/dry run lists: with the template added, the dry run lists the one backdrop to draw and nothing else (${JSON.stringify(pre.sets[0].furniture)}; ${previewLine(pre.sets[0])}; ${v.headline})`);
  const versions = (api as { _versions?: string[] })._versions;
  const res = await applyUpdate(host as never, api as never, targets, previewHashOf(pre));
  const drawn = await furnishUpdate(fApi, res, targets);
  const av = applyVerdict(res);
  const bds = furnitureOn(page).filter((n) => tagOf(n).kind === 'backdrop');
  ok(!res.refusedAll && drawn[0]?.backdrops === 1 && bds.length === 1 && members() === membersWas
    && av.headline === '✓ canvas furniture drawn for 1 set' && av.lines[0] === 'button: 1 backdrop drawn.' && (versions ?? []).at(-1) === 'Before Prism3 updated button',
    `due/apply draws: the apply saves a version and draws the backdrop, and every member keeps its id, place and stamp (${res.refusedAll ?? 'applied'}; ${bds.length} backdrop(s); ${av.headline} / ${av.lines[0]}; ${JSON.stringify((versions ?? []).at(-1))})`);
  const next = await previewUpdate(host, targets);
  ok(!next.sets[0].furniture && previewVerdict(next).headline === '✓ All sets up to date',
    `due/current: the next dry run reads the furniture current, and the set up to date (${previewLine(next.sets[0])}; ${previewVerdict(next).headline})`);
  // STALE: the designer moves the set; its furniture stays behind, so every part is listed again, and one apply converges.
  set.x = Number(set.x) + 500;
  const moved = await previewUpdate(host, targets);
  ok(JSON.stringify(moved.sets[0].furniture) === JSON.stringify({ labels: 41, backdrops: 1, clear: 42 }) && previewLine(moved.sets[0]) === 'button: 576 members. 41 canvas labels to draw, 1 backdrop to draw.',
    `due/stale: furniture left where the set was is listed to draw again (${JSON.stringify(moved.sets[0].furniture)}; ${previewLine(moved.sets[0])})`);
  const res2 = await applyUpdate(host as never, api as never, targets, previewHashOf(moved));
  await furnishUpdate(fApi, res2, targets);
  const again = await previewUpdate(host, targets);
  ok(!again.sets[0].furniture && furnitureOn(page).length === 42 && applyVerdict(res2).lines[0] === 'button: 41 canvas labels drawn, 1 backdrop drawn.',
    `due/stale converges: the apply redraws it beside the set, and the next dry run reads current (${furnitureOn(page).length} instances; ${applyVerdict(res2).lines[0]}; ${previewLine(again.sets[0])})`);
  // A REFUSED CONFIRM DRAWS NOTHING: the version was not saved, so nothing may be written.
  for (const f of furnitureOn(page).filter((n) => tagOf(n).kind === 'backdrop')) (f.remove as () => void)();
  const pre3 = await previewUpdate(host, targets);
  set.x = Number(set.x) + 1;
  const res3 = await applyUpdate(host as never, api as never, targets, previewHashOf(pre3));
  const none = await furnishUpdate(fApi, res3, targets);
  ok(!!res3.refusedAll && none.length === 0 && furnitureOn(page).filter((n) => tagOf(n).kind === 'backdrop').length === 0,
    `due/refused: a confirm refused because the set moved since the check draws nothing (${res3.refusedAll ?? 'applied'}; ${none.length} drawn)`);
}

/* ── prune: stale furniture goes, live furniture stays ──────────────────────────────────────────────────── */
section('moved — a set moved to another page or into a frame takes its furniture with it on the next draw (#2485)');
{
  // Button built and furnished on `↳ A`, then moved by a designer: first to `↳ B`, then into a frame on `↳ B`. Each
  // redraw is the build's and the Update's (`furnishSet` → `drawFurniture`). The host's search for tagged instances
  // is file-wide and deep, as Figma's is: it reads both pages and the frame. Beside the set on `↳ A` sit three nodes
  // that must stay: another Button set's label (same def, another set id), Tag's label, and an untagged label.
  // Mutations: the moved set's clear dropped from `drawFurniture` → `moved/to another page`, `moved/into a frame`;
  // the clear matching by def instead of set id → `moved/others stay`.
  const { plans, page: a, set } = await buildOnPage('button');
  const b = makePage('↳ B');
  // Its own closures, not a spread of a page's: a spread copies `appendChild`, which parents the child to the page it
  // was made for, so the set would land on a third page and the frame case would go untested (#2485 review).
  const frame = makePage('frame') as ReturnType<typeof makePage> & { type: string };
  frame.type = 'FRAME';
  const tagged = (p: { children: FNode[] }) => p.children.filter((c) => (c.getSharedPluginData as ((x: string, y: string) => string) | undefined)?.('prism3', 'furniture'));
  const api = fakeTemplates();
  const templates = api.root.findAllWithCriteria;
  api.root.findAllWithCriteria = (c) => (c.sharedPluginData ? [...tagged(a), ...tagged(b), ...tagged(frame)] : templates(c));
  const first = await drawFurniture(api, set, furnitureLayout(plans), 'button');
  const n = first.columns + first.rows + first.backdrops;
  const stray = (def: string, setId: string) => {
    const x = labelInstance('Top');
    a.appendChild(x);
    if (setId) (x.setSharedPluginData as (p: string, q: string, r: string) => void)('prism3', 'furniture', JSON.stringify({ v: 1, def, set: setId, kind: 'label' }));
    return x;
  };
  const others = [stray('button', 'S:another-button'), stray('tag', 'S:tag'), stray('', '')];
  const ofSet = (p: { children: FNode[] }) => tagged(p).filter((f) => tagOf(f).set === String(set.id));
  ok(n > 0 && first.backdrops === 1 && ofSet(a).length === n, `moved/drawn: Button furnished on ↳ A, ${n} instances with its one backdrop (${ofSet(a).length})`);

  b.appendChild(set);
  const toB = await drawFurniture(api, set, furnitureLayout(plans), 'button');
  ok(ofSet(a).length === 0 && ofSet(b).length === n && toB.cleared === n,
    `moved/to another page: nothing of the set left on ↳ A, its ${n} instances on ↳ B, ${n} cleared (↳ A ${ofSet(a).length}, ↳ B ${ofSet(b).length}, cleared ${toB.cleared})`);
  ok(others.every((o) => a.children.includes(o) && !o.removed),
    `moved/others stay: another Button set's label, Tag's label and an untagged label stay on ↳ A (${others.filter((o) => a.children.includes(o)).length} of 3)`);

  frame.appendChild(set);
  b.appendChild(frame as unknown as FNode);
  const toFrame = await drawFurniture(api, set, furnitureLayout(plans), 'button');
  ok(set.parent === (frame as unknown) && ofSet(b).length === 0 && ofSet(frame).length === n && toFrame.cleared === n,
    `moved/into a frame: the set sits in the frame, nothing of it left on ↳ B, its ${n} instances in the frame beside it, ${n} cleared (in the frame: ${set.parent === (frame as unknown)}; ↳ B ${ofSet(b).length}, frame ${ofSet(frame).length}, cleared ${toFrame.cleared})`);
}

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
  const unpiloted = make('icon', 'S:live2');
  const untagged = labelInstance('Top');
  page.appendChild(untagged);
  const n = pruneFurniture(page.children, (id) => id === 'S:live' || id === 'S:live2');
  ok(n === 2 && page.children.includes(live) && !page.children.includes(gone) && !page.children.includes(unpiloted) && page.children.includes(untagged),
    `prune/stale: the label of a deleted set and one for a def with no furniture (Icon, single components) go; a live set's label and an untagged node stay (${n})`);
}

/* ── templates: `_Label` and `_inverse-backdrop` as file setup builds them ──────────────────────────────── */
section('templates — the three file components, against the Q171 spec and #2609');
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
      getLocalVariablesAsync: async () => [{ id: 'V:9', name: 'zz/color/inverse/background/primary' }, { id: 'V:8', name: 'zz/color/background/primary' }, { id: 'V:7', name: 'zz/color/scrim/default' }],
      setBoundVariableForPaint: (p: object, field: string, v: { id: string }) => { bindings.push({ field, id: v.id }); return { ...p, boundVariables: { [field]: { type: 'VARIABLE_ALIAS', id: v.id } } }; },
    },
  } as unknown as TemplatesApi;
  const r = await ensureFurnitureTemplates(api, page);
  ok(JSON.stringify(r.built) === JSON.stringify(['_Label', '_inverse-backdrop', '_scrim-backdrop']) && r.present.length === 0,
    `templates/built: a page holding only _section-header gets all three (${JSON.stringify(r)})`);
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
  // THE SCRIM TEMPLATE (#2609): a square component whose fill binds color/scrim/default, black at 40% until then.
  const sc = page.children.find((n) => n.name === '_scrim-backdrop')!;
  const sfill = (sc.fills as { opacity?: number; color: { r: number; g: number; b: number }; boundVariables?: { color?: { id: string } } }[])[0];
  ok(sc.type === 'COMPONENT' && sfill.boundVariables?.color?.id === 'V:7' && r.scrimBinding === 'bound' && sc.cornerRadius === 0
    && sfill.opacity === 0.4 && sfill.color.r === 0 && sfill.color.g === 0 && sfill.color.b === 0,
    `templates/scrim: a component, its fill bound to color/scrim/default over black at 40%, square (${JSON.stringify(sfill)}, ${r.scrimBinding})`);
  const again = await ensureFurnitureTemplates(api, page);
  ok(again.built.length === 0 && JSON.stringify(again.present) === JSON.stringify(['_Label', '_inverse-backdrop', '_scrim-backdrop']), `templates/idempotent: a second run builds nothing (${JSON.stringify(again)})`);
}

console.log(failed ? `\n❌ ${failed} failed` : '\n✅ canvas furniture: all checks passed');
if (failed) process.exit(1);
