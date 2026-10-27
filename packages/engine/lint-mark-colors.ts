/**
 * Prism3 engine — A BRAND MARK IS NEVER RETINTED (#2343 proposal §1.4).
 *
 *   npx tsx packages/engine/lint-mark-colors.ts
 *
 * A provider's guidelines forbid recoloring its mark, so a mark's colors are the file's, and they stay the
 * file's all the way to the Figma component and to every component that carries it. Four comparisons:
 *
 *   (a) SOURCE vs RECORD — the fills and gradient stops re-parsed from each `marks/**.svg`, as a set, against the
 *       `colors` its record in `marks/provenance.json` states. A file edited to another color without a new
 *       record fails, and so does a record that drifted from its file.
 *   (b) SOURCE vs MODULE — the same fills, in drawing order and spelled exactly as supplied, against the
 *       document `emit-marks.ts` wrote into `brand-mark-glyphs.ts`. An emitter that normalized, dropped or
 *       reordered a color fails here.
 *   (c) SOURCE vs PLAN — the `brand-mark` def's projected Figma plans: every member's document carries the
 *       source's fills in order, and no node of a mark binds a variable, names a paint, a gradient or
 *       `descendantFills`. A variable bound on a mark is a retint that follows the theme.
 *   (d) HOSTS — every node in every other def's plan that instances or swaps in a `brand-mark/*` component
 *       pushes no `descendantFills` into it. No host carries a mark yet; the arm is proven live below and holds
 *       the moment one does (#2343 PR 2's `fixedPaint` is the mechanism, this is the outcome).
 *   (e) THE PAYMENT TILE (owner decisions Q720 A, Q780 A) — a payment tile is full-bleed, and the component draws the
 *       tile's corners and edge. On every `payment/*` member, the frame that holds the artwork binds all four corner
 *       radii to a `radius/*` variable and its stroke weight to a `border-width/*` variable, strokes in a
 *       `color/border/*` variable, and clips the artwork to the corners; on every other member, none of it. The
 *       plan has no size coordinate: a host binds the mark's height on its instance (20, 24 or 32), and a bound
 *       radius and weight hold their value at every one of them, where a baked edge would scale with the
 *       artwork. That the FILE bakes no edge is `lint-glyph-geometry.ts`'s mark arm (TILE BAKED).
 *       The edge is the frame's, never the artwork's, so (c) admits exactly these properties on exactly that node.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────────
 *
 * The source reader here is its own: a regex over `fill="…"` and `stop-color="…"` in the raw file, which never
 * calls `emit-marks.ts`. The module and the plan are the subjects; the files and the records are typed by
 * people. Comparing the plan to the module alone would only prove the projector copies what it was handed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components';
import { figmaAnatomySet, type FigmaNodePlan } from './anatomy-figma';
import { BRAND_MARK_DOCUMENTS } from './brand-mark-glyphs';
import { BRAND_MARK_SOURCES } from './brand-mark-set';

const here = dirname(fileURLToPath(import.meta.url));
const marksDir = resolve(here, 'marks');
/** The def and the component prefix, as literals: the second author of what the projector names them. */
const MARK_DEF = 'brand-mark';
const MARK_PREFIX = 'brand-mark/';

/** The colors a document paints, in document order: each path's hex `fill` (not a `url(#…)` reference, and
 *  not the wrapper's `fill="none"`) and each gradient `stop-color`. Pure. */
export const colorsOf = (svg: string): string[] => {
  const out: string[] = [];
  for (const m of svg.matchAll(/<(path|stop)\b([^>]*)>/g)) {
    const attr = m[1] === 'path' ? 'fill' : 'stop-color';
    const v = new RegExp(`\\s${attr}="([^"]*)"`).exec(m[2])?.[1];
    if (v && v.startsWith('#')) out.push(v);
  }
  return out;
};
/** The same list, ordered as the document ORDERS IT FOR PAINTING: stops live in `<defs>` before the paths, in
 *  both the source and the module, so document order is the comparison. */
const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
const asSet = (a: readonly string[]): string => [...new Set(a.map((c) => c.toUpperCase()))].sort().join(',');

/** A plan node's paint, if it has any: what a mark may never carry. Pure. */
export const paintOn = (n: FigmaNodePlan): string[] => {
  const out: string[] = [];
  if (n.descendantFills) out.push(`descendantFills ${n.descendantFills}`);
  if (n.paints?.fills) out.push(`fills ${n.paints.fills}`);
  if (n.paints?.strokes) out.push(`strokes ${n.paints.strokes}`);
  if (n.gradientFill) out.push('a gradient fill');
  for (const [k, v] of Object.entries(n.bound ?? {})) out.push(`a variable bound to ${k} (${String(v)})`);
  return out;
};
const walk = (n: FigmaNodePlan, f: (n: FigmaNodePlan) => void): void => { f(n); for (const c of n.children ?? []) walk(c, f); };
/** Does this node bring a brand mark in, as an instance or a swap? Pure. */
export const carriesMark = (n: FigmaNodePlan): boolean =>
  [n.nestTarget, n.swapTarget].some((t) => typeof t === 'string' && t.startsWith(MARK_PREFIX));

/** Which members are tiles: the name's kind, typed here rather than read from `BRAND_MARK_KINDS`, which the def's
 *  own gate reads. Pure. */
export const isTileMark = (name: string): boolean => name.startsWith('payment/');
/** The frame properties the tile edge binds, and the variable family each must come from (Q720 A). */
const TILE_EDGE: Record<string, string> = {
  topLeftRadius: 'radius/', topRightRadius: 'radius/', bottomLeftRadius: 'radius/', bottomRightRadius: 'radius/',
  strokeWeight: 'border-width/',
};
const TILE_STROKE = 'color/border/';
/** What is wrong with a node's tile edge, given whether it should carry one. Empty when right. Pure. */
export const tileEdgeErrors = (n: FigmaNodePlan, tile: boolean): string[] => {
  const out: string[] = [];
  const bound = (n.bound ?? {}) as Record<string, unknown>;
  if (!tile) {
    if (n.clipsContent) out.push('clips its artwork, and only a payment tile has corners to clip to');
    return out;
  }
  for (const [prop, family] of Object.entries(TILE_EDGE)) {
    const v = bound[prop];
    if (typeof v !== 'string' || !v.startsWith(family)) out.push(`${prop} is ${v === undefined ? 'unbound' : `bound to '${String(v)}'`}, and a tile's ${prop.endsWith('Radius') ? 'corner' : 'edge weight'} is a ${family}* variable`);
  }
  if (!n.paints?.strokes?.startsWith(TILE_STROKE)) out.push(`its stroke is ${n.paints?.strokes ? `'${n.paints.strokes}'` : 'unpainted'}, and a tile's edge is a ${TILE_STROKE}* variable`);
  if (!n.clipsContent) out.push('does not clip the artwork, so a full-bleed ground would show square corners outside the rounded edge');
  return out;
};

// ---- SELF-CHECK -----------------------------------------------------------------------------------
const self: string[] = [];
{
  const doc = '<svg fill="none"><defs><linearGradient id="g"><stop offset="0" stop-color="#111111"/></linearGradient></defs><path d="M0 0Z" fill="#AbCdEf"/><path d="M0 0Z" fill="url(#g)"/></svg>';
  if (!sameList(colorsOf(doc), ['#111111', '#AbCdEf'])) self.push(`colorsOf reads ${JSON.stringify(colorsOf(doc))} from a known document (expected the stop, then the hex fill, verbatim)`);
  if (paintOn({ name: 'x', type: 'GLYPH', descendantFills: 'color/icon/primary' } as FigmaNodePlan).length !== 1) self.push('paintOn misses a descendantFills');
  if (paintOn({ name: 'x', type: 'GLYPH', bound: { fills: 'color/text/primary' } } as unknown as FigmaNodePlan).length !== 1) self.push('paintOn misses a bound fill');
  if (paintOn({ name: 'x', type: 'GLYPH' } as FigmaNodePlan).length) self.push('paintOn reports paint on a bare node');
  if (!carriesMark({ name: 'mark', type: 'NESTED_INSTANCE', nestTarget: 'brand-mark/provider/google' } as FigmaNodePlan)) self.push('carriesMark misses a nested mark');
  const edge = { topLeftRadius: 'radius/sm', topRightRadius: 'radius/sm', bottomLeftRadius: 'radius/sm', bottomRightRadius: 'radius/sm', strokeWeight: 'border-width/hairline' };
  const tile = { name: 'glyph', type: 'GLYPH', clipsContent: true, bound: edge, paints: { strokes: 'color/border/primary' } } as unknown as FigmaNodePlan;
  if (tileEdgeErrors(tile, true).length) self.push(`tileEdgeErrors rejects a complete tile edge: ${tileEdgeErrors(tile, true).join('; ')}`);
  if (tileEdgeErrors({ ...tile, bound: { ...edge, topLeftRadius: undefined } } as unknown as FigmaNodePlan, true).length !== 1) self.push('tileEdgeErrors misses an unbound corner');
  if (tileEdgeErrors({ ...tile, paints: {} } as unknown as FigmaNodePlan, true).length !== 1) self.push('tileEdgeErrors misses an unpainted edge');
  if (tileEdgeErrors({ name: 'glyph', type: 'GLYPH' } as FigmaNodePlan, false).length) self.push('tileEdgeErrors reports an edge on a bare non-tile');
  if (!isTileMark('payment/visa') || isTileMark('social/x-mono') || isTileMark('logo/visa')) self.push('isTileMark misreads a kind');
  if (carriesMark({ name: 'icon', type: 'NESTED_INSTANCE', nestTarget: 'icon/check' } as FigmaNodePlan)) self.push('carriesMark reads an icon as a mark');
}
if (self.length) {
  console.error("\n❌ lint-mark-colors' own detection is broken — it cannot see what it claims to:\n");
  for (const s of self) console.error(`    ${s}`);
  process.exit(1);
}

// ---- THE REAL RUN ---------------------------------------------------------------------------------
const failures: string[] = [];
const records = (JSON.parse(readFileSync(join(marksDir, 'provenance.json'), 'utf8')) as { marks: Record<string, { colors?: string[] }> }).marks;
const sourceColors = new Map<string, string[]>();
for (const [name, source] of Object.entries(BRAND_MARK_SOURCES)) {
  let svg = '';
  try { svg = readFileSync(join(marksDir, `${source}.svg`), 'utf8'); } catch { failures.push(`${name}: marks/${source}.svg is unreadable`); continue; }
  const colors = colorsOf(svg);
  sourceColors.set(name, colors);
  if (colors.length === 0) failures.push(`${name}: marks/${source}.svg paints no hex color — a mark with no color of its own`);
  // (a) source vs record
  const rec = records[`${source}.svg`]?.colors ?? [];
  if (asSet(colors) !== asSet(rec)) failures.push(`${name}: marks/${source}.svg paints {${asSet(colors)}} and its provenance record states {${asSet(rec)}} — a retinted file, or a record that no longer describes it`);
  // (b) source vs module
  const doc = BRAND_MARK_DOCUMENTS[name as keyof typeof BRAND_MARK_DOCUMENTS];
  if (!doc) { failures.push(`${name}: has no document in brand-mark-glyphs.ts (run npx tsx packages/engine/emit-marks.ts)`); continue; }
  if (!sameList(colorsOf(doc), colors)) failures.push(`${name}: brand-mark-glyphs.ts paints ${JSON.stringify(colorsOf(doc))} and the source paints ${JSON.stringify(colors)} — the emitter changed a color`);
}

// (c) the mark def's own plans
const markDef = componentDefs.find((d) => d.id === MARK_DEF);
let markPlans = 0;
let tileMembers = 0;
if (!markDef) failures.push(`no '${MARK_DEF}' def is registered — the marks reach no component`);
else {
  for (const plan of figmaAnatomySet(markDef)) {
    markPlans++;
    const name = String(plan.coord.name);
    let docs = 0;
    const tile = isTileMark(name);
    // (e) the tile edge, on the frame that holds the artwork: the plan's GLYPH node, which a host instances.
    for (const t of tileEdgeErrors(plan.root, tile)) failures.push(`${MARK_PREFIX}${name}: TILE EDGE — the mark's frame '${plan.root.name}' ${t}`);
    if (tile) tileMembers++;
    walk(plan.root, (n) => {
      // The edge is the one paint a payment tile's frame carries, and (e) has judged it: (c) admits exactly those keys there.
      const edgeKeys = tile && n === plan.root ? new Set([...Object.keys(TILE_EDGE).map((k) => `a variable bound to ${k} (`), 'strokes ']) : new Set<string>();
      for (const p of paintOn(n)) if (![...edgeKeys].some((k) => p.startsWith(k))) failures.push(`${MARK_PREFIX}${name}: node '${n.name}' carries ${p} — a mark's colors are its own, and a variable on one follows the theme`);
      if (n.glyphSvg) {
        docs++;
        const want = sourceColors.get(name);
        if (want && !sameList(colorsOf(n.glyphSvg), want)) failures.push(`${MARK_PREFIX}${name}: the plan's document paints ${JSON.stringify(colorsOf(n.glyphSvg))} and the source paints ${JSON.stringify(want)}`);
      }
    });
    if (docs !== 1) failures.push(`${MARK_PREFIX}${name}: the plan carries ${docs} documents, and a mark is one`);
  }
}

// (d) hosts
let hosted = 0;
for (const def of componentDefs) {
  if (def.id === MARK_DEF || !def.figmaProperties) continue;
  for (const plan of figmaAnatomySet(def)) walk(plan.root, (n) => {
    if (!carriesMark(n)) return;
    hosted++;
    if (n.descendantFills) failures.push(`${def.id}: part '${n.name}' carries a brand mark and pushes descendantFills ${n.descendantFills} into it — the host's ink would retint the mark`);
  });
}

console.log(`Mark colors — ${sourceColors.size} source file(s), ${markPlans} '${MARK_DEF}' plan(s), ${tileMembers} payment tile(s), ${hosted} host node(s) carrying a mark.`);
if (markPlans === 0 && markDef) failures.push(`'${MARK_DEF}' projected no plan — the plan arm checked nothing`);
if (markDef && Object.keys(BRAND_MARK_SOURCES).some(isTileMark) && tileMembers === 0) failures.push(`the set lists payment tiles and no '${MARK_DEF}' plan was read as a tile — the tile-edge arm checked nothing`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} mark color problem(s):\n`);
  for (const f of failures) console.error(`    ${f}`);
  console.error('\n  A mark keeps the colors in its file. Change a color only by replacing the file with the provider\'s');
  console.error('  own artwork and its record with the new colors, then run npx tsx packages/engine/emit-marks.ts.');
  process.exit(1);
}
console.log('  ✓ clean — every mark paints its own colors, from file to record to module to plan, and no host retints one;');
console.log('    every payment tile\'s corners and edge are bound on its frame, and no other mark has an edge.');
