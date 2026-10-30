/**
 * Prism3 engine — A PROVIDER LOGO IS NEVER RETINTED (#2343 proposal §1.4).
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
 *       document `emit-marks.ts` wrote into `provider-logo-glyphs.ts`. An emitter that normalized, dropped or
 *       reordered a color fails here.
 *   (c) SOURCE vs PLAN — the `provider-logo` def's projected Figma plans: every member's document carries the
 *       source's fills in order, and no node of a mark binds a variable, names a paint, a gradient or
 *       `descendantFills`. A variable bound on a mark is a retint that follows the theme.
 *   (d) HOSTS — every node in every other def's plan that instances or swaps in a `provider-logo/*` component
 *       pushes no `descendantFills` into it, names no fill or stroke paint, binds no paint variable, and states
 *       `fixedPaint` (#2343 PR 2's mechanism; this is the outcome). At every member: a disabled host keeps the
 *       mark's colors too. The Card number field and WalletButton are the hosts (#2343 PR 4), and `MARK_HOSTS` lists
 *       every host by hand, both ways, so the arm cannot pass by reading no host (docs/34 shape 9). The one
 *       relaxation is (g)'s.
 *   (g) THE PROVIDER TINT (owner decision Q846 A) — a host node may carry `literalTint` in place of `fixedPaint`
 *       only where the host is in `TINT_HOSTS` (SignInButton alone) AND the mark it carries is a `provider-logo/provider/*`
 *       glyph, and the tint is an opaque `#rrggbb`. Any other def that tints a mark, or SignInButton tinting a
 *       non-provider mark, fails by name (`HOST TINT`). Every other mark keeps "never retinted". Each tint host must
 *       tint at least one member, so the arm cannot pass by reading none. WHICH members tint, and to what, is
 *       `test.ts`'s `Q846 A dark-fill styles draw white` arm, typed from the decision.
 *   (h) THE BUTTON GROUND (#3174, owner decision Q3174.3 A) — a `button/` mark is a wallet button's logo for one style,
 *       and its record carries the paint the provider's SDK draws under it: `ground`, and `edge` where there is one. A
 *       host that nests a `provider-logo/button/*` mark must be in `GROUND_HOSTS` (WalletButton alone), and the button
 *       it draws, the member's root frame, paints exactly that record's ground as its one literal fill and the edge's
 *       color as its literal stroke, or no stroke where the record has no edge. Read from `provenance.json` here, never
 *       from `PROVIDER_LOGO_BUTTON_PAINT`, which the def reads (docs/34 shape 1). A ground host's member that carries
 *       any other mark (the `any` stand-in) paints nothing at all (`BUTTON GROUND`). Each ground host must paint at
 *       least one ground, so the arm cannot pass by reading none.
 *   (e) THE PAYMENT TILE (owner decisions Q720 A, Q780 A) — a payment tile is full-bleed, and the component draws the
 *       tile's corners and edge. On every `payment/*` member, the frame that holds the artwork binds all four corner
 *       radii to a `radius/*` variable and its stroke weight to a `border-width/*` variable, strokes in a
 *       `color/border/*` variable, and clips the artwork to the corners; on every other member, none of it. The
 *       plan has no size coordinate: a host binds the mark's height on its instance (20, 24 or 32), and a bound
 *       radius and weight hold their value at every one of them, where a baked edge would scale with the
 *       artwork. That the FILE bakes no edge is `lint-glyph-geometry.ts`'s mark arm (TILE BAKED).
 *       The edge is the frame's, never the artwork's, so (c) admits exactly these properties on exactly that node.
 *       THE EDGE ONLY WHERE THE FILL NEEDS IT (owner direction on #3134): the stroke and its weight are drawn only on a
 *       tile whose own fill (the first hex fill its file paints) is under 3:1 against a white page; every other tile
 *       keeps its corners and its crop and carries neither. Judged here from the raw file with this gate's own
 *       luminance arithmetic, never the def's helper (docs/34 shape 1).
 *   (f) DERIVED (owner decision Q831 A) — a mark whose record names `derivedFrom` (`provider/facebook-blue`: a
 *       social mark scaled to the provider inset; Q846 A dropped `provider/apple-black`) paints exactly its source
 *       file's colors, in drawing order, read from that file. For it, (a)'s record is not the only witness (#3066): a
 *       retint of the derived file and its record together still fails here, because the social file is the oracle.
 *       Its geometry is `lint-glyph-geometry.ts`'s DERIVED arm.
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
import { PROVIDER_LOGO_DOCUMENTS } from './provider-logo-glyphs';
import { PROVIDER_LOGO_SOURCES } from './provider-logo-set';

const here = dirname(fileURLToPath(import.meta.url));
const marksDir = resolve(here, 'marks');
/** The def and the component prefix, as literals: the second author of what the projector names them. */
const MARK_DEF = 'provider-logo';
const MARK_PREFIX = 'provider-logo/';
/** Every def that carries a provider logo in a slot or a nest, typed here: (d) reads each one, and a def that carries a
 *  mark without being listed fails. */
const MARK_HOSTS = ['card-number-field', 'wallet-button', 'sign-in-button'];
/** (g) The hosts that may tint a mark, and the marks they may tint (Q846 A), typed here. */
const TINT_HOSTS = ['sign-in-button'];
const TINTABLE_PREFIX = 'provider-logo/provider/';
/** (h) The hosts that paint a button logo's ground from its record (Q3174.3 A), and the marks that carry one, typed here. */
const GROUND_HOSTS = ['wallet-button'];
const BUTTON_PREFIX = 'provider-logo/button/';

type ButtonRecord = { ground?: string; edge?: { width?: number; color?: string } };
/** What is wrong with a ground host's member, given the mark it carries and the record of that mark (undefined for a
 *  mark that is not a button logo). Empty when right. Pure. */
export const groundErrors = (root: FigmaNodePlan, target: string, rec: ButtonRecord | undefined): string[] => {
  const fills = root.literalPaints?.fills ?? [], stroke = root.literalPaints?.strokes;
  const lc = (c: string | undefined): string | undefined => c?.toLowerCase();
  if (!target.startsWith(BUTTON_PREFIX)) {
    return fills.length || stroke || root.paints?.fills || root.paints?.strokes
      ? [`carries ${target}, which has no button under it, and paints ${JSON.stringify({ literal: root.literalPaints, paints: root.paints })}: the stand-in draws no fill and no edge`]
      : [];
  }
  if (!rec?.ground) return [`carries ${target}, and its record states no ground`];
  const out: string[] = [];
  if (fills.length !== 1 || lc(fills[0]) !== lc(rec.ground)) out.push(`paints the fill ${JSON.stringify(fills)} under ${target}, and its record's ground is ${rec.ground}`);
  if (lc(stroke) !== lc(rec.edge?.color)) out.push(`paints the edge ${stroke ?? 'none'} under ${target}, and its record's edge is ${rec.edge?.color ?? 'none'}`);
  if (root.paints?.fills || root.paints?.strokes) out.push(`binds a theme paint ${JSON.stringify(root.paints)} under ${target}: the provider's ground follows no theme`);
  return out;
};

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
/** Does this node bring a provider logo in, as an instance or a swap? Pure. */
export const carriesMark = (n: FigmaNodePlan): boolean =>
  [n.nestTarget, n.swapTarget].some((t) => typeof t === 'string' && t.startsWith(MARK_PREFIX));

/** Which members are tiles: the name's kind, typed here rather than read from `PROVIDER_LOGO_KINDS`, which the def's
 *  own gate reads. Pure. */
export const isTileMark = (name: string): boolean => name.startsWith('payment/');
/** The frame properties the tile edge binds, and the variable family each must come from (Q720 A). */
const TILE_EDGE: Record<string, string> = {
  topLeftRadius: 'radius/', topRightRadius: 'radius/', bottomLeftRadius: 'radius/', bottomRightRadius: 'radius/',
  strokeWeight: 'border-width/',
};
const TILE_STROKE = 'color/border/';
/** A hex color's WCAG relative luminance, written here rather than imported from the engine's color math. Pure. */
const lum = (hex: string): number => {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
/** Whether a tile's file needs the edge (#3134): its first hex fill under 3:1 against white, or no fill to read. Pure. */
export const needsEdge = (svg: string): boolean => {
  const fill = /<path\b[^>]*\sfill="(#[0-9A-Fa-f]{6})"/.exec(svg)?.[1];
  return !fill || 1.05 / (lum(fill) + 0.05) < 3;
};
/** What is wrong with a node's tile edge, given whether it is a tile and whether its edge is drawn. Empty when right. Pure. */
export const tileEdgeErrors = (n: FigmaNodePlan, tile: boolean, edged = tile): string[] => {
  const out: string[] = [];
  const bound = (n.bound ?? {}) as Record<string, unknown>;
  if (!tile) {
    if (n.clipsContent) out.push('clips its artwork, and only a payment tile has corners to clip to');
    return out;
  }
  for (const [prop, family] of Object.entries(TILE_EDGE)) {
    const v = bound[prop];
    if (!edged && prop === 'strokeWeight') {
      if (v !== undefined) out.push(`binds strokeWeight to '${String(v)}', and a tile whose fill stands apart from a white page (3:1) draws no edge`);
      continue;
    }
    if (typeof v !== 'string' || !v.startsWith(family)) out.push(`${prop} is ${v === undefined ? 'unbound' : `bound to '${String(v)}'`}, and a tile's ${prop.endsWith('Radius') ? 'corner' : 'edge weight'} is a ${family}* variable`);
  }
  if (!edged) { if (n.paints?.strokes) out.push(`its stroke is '${n.paints.strokes}', and a tile whose fill stands apart from a white page (3:1) draws no edge`); }
  else if (!n.paints?.strokes?.startsWith(TILE_STROKE)) out.push(`its stroke is ${n.paints?.strokes ? `'${n.paints.strokes}'` : 'unpainted'}, and a tile's edge is a ${TILE_STROKE}* variable`);
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
  if (!carriesMark({ name: 'mark', type: 'NESTED_INSTANCE', nestTarget: 'provider-logo/provider/google' } as FigmaNodePlan)) self.push('carriesMark misses a nested mark');
  const edge = { topLeftRadius: 'radius/sm', topRightRadius: 'radius/sm', bottomLeftRadius: 'radius/sm', bottomRightRadius: 'radius/sm', strokeWeight: 'border-width/hairline' };
  const tile = { name: 'glyph', type: 'GLYPH', clipsContent: true, bound: edge, paints: { strokes: 'color/border/primary' } } as unknown as FigmaNodePlan;
  if (tileEdgeErrors(tile, true).length) self.push(`tileEdgeErrors rejects a complete tile edge: ${tileEdgeErrors(tile, true).join('; ')}`);
  if (tileEdgeErrors({ ...tile, bound: { ...edge, topLeftRadius: undefined } } as unknown as FigmaNodePlan, true).length !== 1) self.push('tileEdgeErrors misses an unbound corner');
  if (tileEdgeErrors({ ...tile, paints: {} } as unknown as FigmaNodePlan, true).length !== 1) self.push('tileEdgeErrors misses an unpainted edge');
  if (tileEdgeErrors({ name: 'glyph', type: 'GLYPH' } as FigmaNodePlan, false).length) self.push('tileEdgeErrors reports an edge on a bare non-tile');
  const { strokeWeight: _w, ...corners } = edge;
  const bare = { ...tile, bound: corners, paints: {} } as unknown as FigmaNodePlan;
  if (tileEdgeErrors(bare, true, false).length) self.push(`tileEdgeErrors rejects an edgeless tile with its corners and crop: ${tileEdgeErrors(bare, true, false).join('; ')}`);
  if (tileEdgeErrors(tile, true, false).length !== 2) self.push('tileEdgeErrors misses an edge drawn on a tile that needs none');
  if (!needsEdge('<svg><path d="M0 0H32V20H0Z" fill="#FFFFFF"/></svg>') || !needsEdge('<svg><path d="M0 0Z" fill="#FEB4C7"/></svg>')) self.push('needsEdge drops the edge on a white or pale tile');
  if (needsEdge('<svg><path d="M0 0H32V20H0Z" fill="#008CFF"/></svg>') || needsEdge('<svg><path d="M0 0Z" fill="#000000"/></svg>')) self.push('needsEdge keeps the edge on a tile whose fill is 3:1 or more against white');
  if (!isTileMark('payment/visa') || isTileMark('social/x-mono') || isTileMark('logo/visa')) self.push('isTileMark misreads a kind');
  if (carriesMark({ name: 'icon', type: 'NESTED_INSTANCE', nestTarget: 'icon/check' } as FigmaNodePlan)) self.push('carriesMark reads an icon as a mark');
  const btn = (fills?: string[], strokes?: string): FigmaNodePlan => ({ name: 'container', type: 'FRAME', ...(fills || strokes ? { literalPaints: { ...(fills ? { fills } : {}), ...(strokes ? { strokes } : {}) } } : {}) }) as unknown as FigmaNodePlan;
  const rec = { ground: '#ffffff', edge: { width: 1, color: '#555555' } };
  if (groundErrors(btn(['#ffffff'], '#555555'), `${BUTTON_PREFIX}x-white`, rec).length) self.push('groundErrors rejects a button painted as its record says');
  if (groundErrors(btn(['#000000'], '#555555'), `${BUTTON_PREFIX}x-white`, rec).length !== 1) self.push('groundErrors misses a wrong ground');
  if (groundErrors(btn(['#ffffff']), `${BUTTON_PREFIX}x-white`, rec).length !== 1) self.push('groundErrors misses a dropped edge');
  if (groundErrors(btn(['#ffffff'], '#555555'), `${BUTTON_PREFIX}x-white`, { ground: '#ffffff' }).length !== 1) self.push('groundErrors misses an edge the record does not state');
  if (groundErrors(btn(), 'provider-logo/logo/x', undefined).length) self.push('groundErrors reports paint on a bare stand-in');
  if (groundErrors(btn(['#000000']), 'provider-logo/logo/x', undefined).length !== 1) self.push('groundErrors misses a stand-in that paints');
}
if (self.length) {
  console.error("\n❌ lint-mark-colors' own detection is broken — it cannot see what it claims to:\n");
  for (const s of self) console.error(`    ${s}`);
  process.exit(1);
}

// ---- THE REAL RUN ---------------------------------------------------------------------------------
const failures: string[] = [];
const records = (JSON.parse(readFileSync(join(marksDir, 'provenance.json'), 'utf8')) as { marks: Record<string, { colors?: string[] } & ButtonRecord> }).marks;
const sourceColors = new Map<string, string[]>();
const sourceSvgs = new Map<string, string>();
for (const [name, source] of Object.entries(PROVIDER_LOGO_SOURCES)) {
  let svg = '';
  try { svg = readFileSync(join(marksDir, `${source}.svg`), 'utf8'); } catch { failures.push(`${name}: marks/${source}.svg is unreadable`); continue; }
  const colors = colorsOf(svg);
  sourceColors.set(name, colors);
  sourceSvgs.set(name, svg);
  if (colors.length === 0) failures.push(`${name}: marks/${source}.svg paints no hex color — a mark with no color of its own`);
  // (a) source vs record
  const rec = records[`${source}.svg`]?.colors ?? [];
  if (asSet(colors) !== asSet(rec)) failures.push(`${name}: marks/${source}.svg paints {${asSet(colors)}} and its provenance record states {${asSet(rec)}} — a retinted file, or a record that no longer describes it`);
  // (b) source vs module
  const doc = PROVIDER_LOGO_DOCUMENTS[name as keyof typeof PROVIDER_LOGO_DOCUMENTS];
  if (!doc) { failures.push(`${name}: has no document in provider-logo-glyphs.ts (run npx tsx packages/engine/emit-marks.ts)`); continue; }
  if (!sameList(colorsOf(doc), colors)) failures.push(`${name}: provider-logo-glyphs.ts paints ${JSON.stringify(colorsOf(doc))} and the source paints ${JSON.stringify(colors)} — the emitter changed a color`);
}

// (f) derived marks: the source file, not the record, is the oracle (#3066)
let derived = 0;
for (const [file, rec] of Object.entries(records as Record<string, { derivedFrom?: unknown }>)) {
  if (rec.derivedFrom === undefined) continue;
  derived++;
  let own = '', src = '';
  try { own = readFileSync(join(marksDir, file), 'utf8'); src = readFileSync(join(marksDir, String(rec.derivedFrom)), 'utf8'); }
  catch { failures.push(`${file}: DERIVED — it or its source marks/${String(rec.derivedFrom)} is unreadable`); continue; }
  if (!sameList(colorsOf(own), colorsOf(src)))
    failures.push(`${file}: DERIVED — paints ${JSON.stringify(colorsOf(own))} and its source marks/${String(rec.derivedFrom)} paints ${JSON.stringify(colorsOf(src))}: a derived mark is resized, never retinted (Q831 A)`);
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
    // (e) the tile edge, on the frame that holds the artwork: the plan's GLYPH node, which a host instances. Whether the
    // edge is drawn is judged from the raw file (`sourceSvgs`), never from the def.
    const edged = tile && needsEdge(sourceSvgs.get(name) ?? '');
    for (const t of tileEdgeErrors(plan.root, tile, edged)) failures.push(`${MARK_PREFIX}${name}: TILE EDGE — the mark's frame '${plan.root.name}' ${t}`);
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

// (d) hosts, and (g) the provider tint
let hosted = 0, tinted = 0, grounded = 0;
const hostTints = new Map<string, number>();
const hostGrounds = new Map<string, number>();
for (const def of componentDefs) {
  if (def.id === MARK_DEF || !def.figmaProperties) continue;
  let carried = 0;
  for (const plan of figmaAnatomySet(def)) walk(plan.root, (n) => {
    if (!carriesMark(n)) return;
    hosted++;
    carried++;
    const at = `${def.id} ${JSON.stringify({ size: plan.size, ...plan.coord })}`;
    // (h) the button ground: a button logo's host paints its record's ground and edge on the member's frame.
    const markTarget = String(n.nestTarget ?? n.swapTarget);
    if (markTarget.startsWith(BUTTON_PREFIX) && !GROUND_HOSTS.includes(def.id)) failures.push(`${at}: BUTTON GROUND — part '${n.name}' carries ${markTarget}, and only ${GROUND_HOSTS.join(', ')} may carry a button logo (Q3174.3 A)`);
    if (GROUND_HOSTS.includes(def.id)) {
      const source = PROVIDER_LOGO_SOURCES[markTarget.slice(MARK_PREFIX.length)];
      for (const e of groundErrors(plan.root, markTarget, source ? records[`${source}.svg`] : undefined)) failures.push(`${at}: BUTTON GROUND — the member's frame ${e}`);
      if (markTarget.startsWith(BUTTON_PREFIX)) { grounded++; hostGrounds.set(def.id, (hostGrounds.get(def.id) ?? 0) + 1); }
    }
    if (n.descendantFills) failures.push(`${at}: HOST RETINT — part '${n.name}' carries a provider logo and pushes descendantFills ${n.descendantFills} into it — the host's ink would retint the mark`);
    if (n.paints?.fills || n.paints?.strokes) failures.push(`${at}: HOST RETINT — part '${n.name}' carries a provider logo and names paint ${JSON.stringify(n.paints)} on it`);
    for (const [k, v] of Object.entries(n.bound ?? {})) if (/fill|stroke/i.test(k)) failures.push(`${at}: HOST RETINT — part '${n.name}' carries a provider logo and binds ${k} to ${String(v)}`);
    const target = String(n.nestTarget ?? n.swapTarget);
    if (n.literalTint !== undefined) {
      tinted++;
      if (!TINT_HOSTS.includes(def.id)) failures.push(`${at}: HOST TINT — part '${n.name}' paints ${target} ${n.literalTint}, and only ${TINT_HOSTS.join(', ')} may tint a mark (Q846 A)`);
      else {
        hostTints.set(def.id, (hostTints.get(def.id) ?? 0) + 1);
        if (!target.startsWith(TINTABLE_PREFIX)) failures.push(`${at}: HOST TINT — part '${n.name}' paints ${target} ${n.literalTint}, which is not a ${TINTABLE_PREFIX}* glyph; only a provider glyph takes a tint (Q846 A)`);
      }
      if (!/^#[0-9a-f]{6}$/.test(n.literalTint)) failures.push(`${at}: HOST TINT — part '${n.name}' paints ${target} '${n.literalTint}', which is not an opaque #rrggbb`);
      if (n.fixedPaint !== undefined) failures.push(`${at}: HOST TINT — part '${n.name}' states fixedPaint beside a tint; the plan says one or the other`);
    } else if (n.fixedPaint !== true) failures.push(`${at}: HOST RETINT — part '${n.name}' carries a provider logo and does not state fixedPaint, so nothing holds the host's ink off it`);
  });
  if (carried && !MARK_HOSTS.includes(def.id)) failures.push(`${def.id}: carries a provider logo and is not in MARK_HOSTS — list it, so the host arm is known to read it`);
  if (!carried && MARK_HOSTS.includes(def.id)) failures.push(`${def.id}: is in MARK_HOSTS and no member carries a provider logo — the host arm read nothing for it`);
}
for (const id of MARK_HOSTS) if (!componentDefs.some((d) => d.id === id)) failures.push(`${id}: is in MARK_HOSTS and no such component is registered`);
for (const id of TINT_HOSTS) if (!hostTints.get(id)) failures.push(`${id}: is in TINT_HOSTS and tints no provider glyph at any member — the tint arm read nothing for it`);
for (const id of GROUND_HOSTS) if (!hostGrounds.get(id)) failures.push(`${id}: is in GROUND_HOSTS and paints no button logo's ground at any member — the ground arm read nothing for it`);

console.log(`Mark colors — ${sourceColors.size} source file(s) (${derived} derived, read against their source), ${markPlans} '${MARK_DEF}' plan(s), ${tileMembers} payment tile(s), ${hosted} host node(s) carrying a mark, ${tinted} of them tinted, ${grounded} on a button logo's ground.`);
if (markPlans === 0 && markDef) failures.push(`'${MARK_DEF}' projected no plan — the plan arm checked nothing`);
if (markDef && Object.keys(PROVIDER_LOGO_SOURCES).some(isTileMark) && tileMembers === 0) failures.push(`the set lists payment tiles and no '${MARK_DEF}' plan was read as a tile — the tile-edge arm checked nothing`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} mark color problem(s):\n`);
  for (const f of failures) console.error(`    ${f}`);
  console.error('\n  A mark keeps the colors in its file. Change a color only by replacing the file with the provider\'s');
  console.error('  own artwork and its record with the new colors, then run npx tsx packages/engine/emit-marks.ts.');
  process.exit(1);
}
console.log('  ✓ clean — every mark paints its own colors, from file to record to module to plan, and no host retints one');
console.log('    but SignInButton\'s provider glyphs (Q846 A);');
console.log('    every payment tile\'s corners and edge are bound on its frame, and no other mark has an edge;');
console.log('    every button logo sits on its record\'s ground and edge (#3174).');
