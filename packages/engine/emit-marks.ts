/**
 * emit-marks.ts — generates `brand-mark-glyphs.ts` from the SVGs in `marks/` through `brand-mark-set.ts`
 * (#2316, #2343 proposal §1.1).
 *
 *   npx tsx packages/engine/emit-marks.ts
 *
 * The brand-mark twin of `emit-icons.ts`, and a generated module for the same hard reason: the plugin
 * bundles the engine into a sandbox with no filesystem, so the artwork has to arrive as code.
 *
 * ── THE TWO-DIRECTION CHECK, TWICE ──────────────────────────────────────────────────────────────────
 *
 * `BRAND_MARK_SOURCES` (authored) against the folder listing (read from disk), both ways: a name pointing at
 * no file fails, and a file no name maps fails. Then `marks/provenance.json` is a BUILD INPUT, not a report:
 * a file with no record is refused here, so a mark cannot reach a component without one (proposal §1.1, "no
 * record, no build"). `lint-mark-provenance.ts` checks the records' contents, independently.
 *
 * ── LOOSER THAN `emit-icons.ts`, ON PURPOSE, AND WHERE IT STOPS ─────────────────────────────────────
 *
 * Accepted: several `<path>`s in drawing order, literal hex fills, `linearGradient` / `radialGradient` in
 * `<defs>`, `fill-rule` / `clip-rule`, a path's `opacity` / `fill-opacity`, and a `<g>` that carries nothing
 * but an `id` (it is flattened; its paths keep their order).
 *
 * Refused: a stroke (a Figma stroke's weight does not scale with the artboard), `<text>`, `<image>`, masks,
 * filters, `clipPath`, `<style>` and `style=`, any `transform`, `currentColor` (a mark takes no host ink),
 * any other element (`<rect>`, `<circle>`, `<use>`: outlines only, so the geometry gate can read every
 * shape), and an artboard that is not its kind's.
 *
 * ── NEVER RETINTED ──────────────────────────────────────────────────────────────────────────────────
 *
 * Every `fill` and `stop-color` is copied VERBATIM into the document this writes. The emitter re-serializes
 * the elements it accepted rather than passing the file through, so nothing it did not check reaches Figma,
 * but it never rewrites a color value, not even its case. `lint-mark-colors.ts` re-parses the source files
 * with its own reader and compares them to this module's documents and to the Figma plan.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_MARK_ARTBOARDS, BRAND_MARK_KINDS, BRAND_MARK_SOURCES } from './brand-mark-set';

const here = dirname(fileURLToPath(import.meta.url));
const marksDir = resolve(here, 'marks');
const outFile = resolve(here, 'brand-mark-glyphs.ts');

const fail = (lines: string[]): never => {
  console.error('\n✗ emit-marks\n');
  for (const l of lines) console.error(`  ${l}`);
  console.error('');
  process.exit(1);
};

// ── BOTH DIRECTIONS ─────────────────────────────────────────────────────────────────────────────────
const listSvgs = (dir: string, rel = ''): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return listSvgs(p, `${rel}${f}/`);
    return f.endsWith('.svg') ? [`${rel}${f.slice(0, -4)}`] : [];
  });
const onDisk = new Set(listSvgs(marksDir));
const mapped = new Set(Object.values(BRAND_MARK_SOURCES));

const errors: string[] = [];
for (const [name, source] of Object.entries(BRAND_MARK_SOURCES)) {
  if (!onDisk.has(source)) errors.push(`'${name}' maps to '${source}.svg', which is not in marks/ — a stale mapping entry`);
  const kind = name.split('/')[0];
  if (!/^[a-z]+\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) errors.push(`'${name}' is not <kind>/<provider>[-<style>] in lowercase kebab-case`);
  else if (!BRAND_MARK_KINDS[kind]) errors.push(`'${name}' names kind '${kind}', which is not one of ${Object.keys(BRAND_MARK_KINDS).join(', ')} (BRAND_MARK_KINDS)`);
  else if (source.split('/')[0] !== kind) errors.push(`'${name}' is a ${kind} mark and maps to '${source}.svg', outside marks/${kind}/ — the folder is the kind, and the kind decides the artboard`);
}
for (const source of [...onDisk].sort()) {
  if (!mapped.has(source)) errors.push(`'${source}.svg' is in marks/ and no entry in brand-mark-set.ts maps it — an unreachable mark`);
}
const seen = new Map<string, string>();
for (const [name, source] of Object.entries(BRAND_MARK_SOURCES)) {
  const prior = seen.get(source);
  if (prior) errors.push(`'${name}' and '${prior}' both map to '${source}.svg' — two names for one file is an alias, and needs to be a decision`);
  seen.set(source, name);
}

// Provenance as a build input: a file with no record does not build.
type Record_ = { width?: number };
let provenance: Record<string, Record_> = {};
try { provenance = (JSON.parse(readFileSync(join(marksDir, 'provenance.json'), 'utf8')) as { marks: Record<string, Record_> }).marks ?? {}; }
catch (err) { errors.push(`marks/provenance.json does not parse (${(err as Error).message}) — no record, no build`); }
for (const source of [...onDisk].sort()) {
  if (!provenance[`${source}.svg`]) errors.push(`'${source}.svg' has no record in marks/provenance.json — no record, no build (proposal §1.1)`);
}
if (errors.length) fail(errors);

// ── PARSE ───────────────────────────────────────────────────────────────────────────────────────────
type Attrs = Record<string, string>;
type El = { tag: string; close: boolean; selfClose: boolean; attrs: Attrs };

const attrsOf = (s: string, where: string, errs: string[]): Attrs => {
  const out: Attrs = {};
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  let rest = s;
  for (const m of s.matchAll(re)) {
    if (m[1] in out) errs.push(`${where}: attribute '${m[1]}' given twice`);
    out[m[1]] = m[2];
    rest = rest.replace(m[0], '');
  }
  if (rest.trim().replace(/\/$/, '').trim()) errs.push(`${where}: unparsed markup '${rest.trim()}' (attributes must be name="value")`);
  return out;
};

const HEX = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const NUM = /^-?\d*\.?\d+$/;
const ALLOWED: Record<string, readonly string[]> = {
  svg: ['width', 'height', 'viewBox', 'fill', 'xmlns', 'xmlns:xlink', 'version'],
  defs: [],
  g: ['id'],
  path: ['d', 'fill', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'id'],
  linearGradient: ['id', 'x1', 'y1', 'x2', 'y2', 'gradientUnits'],
  radialGradient: ['id', 'cx', 'cy', 'r', 'fx', 'fy', 'gradientUnits'],
  stop: ['offset', 'stop-color', 'stop-opacity'],
};
// The refusals that have a reason worth printing; any other element or attribute is refused as unknown.
const WHY_REFUSED: Record<string, string> = {
  text: 'text must be converted to outlines', image: 'an embedded image is not vector artwork', mask: 'masks do not survive the import',
  filter: 'filters do not survive the import', clipPath: 'clip paths do not survive the import, so ink outside them would show',
  style: 'CSS hides fills from every check', use: 'a reference hides geometry from the geometry gate',
  rect: 'outlines only: convert the shape to a path', circle: 'outlines only: convert the shape to a path',
  ellipse: 'outlines only: convert the shape to a path', polygon: 'outlines only: convert the shape to a path',
  line: 'a line is a stroke', polyline: 'a polyline is a stroke',
  stroke: 'a Figma stroke weight does not scale with the artboard; convert strokes to fills',
  transform: 'flatten transforms in the source', gradientTransform: 'flatten the gradient transform in the source',
};

type Mark = { name: string; source: string; width: number; height: number; doc: string; fills: string[] };
const marks: Mark[] = [];
const shapeErrors: string[] = [];

for (const [name, source] of Object.entries(BRAND_MARK_SOURCES).sort(([a], [b]) => a.localeCompare(b))) {
  const where = `${source}.svg`;
  const errs: string[] = [];
  const raw = readFileSync(join(marksDir, `${source}.svg`), 'utf8')
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  if (/currentColor/i.test(raw)) errs.push(`${where}: uses currentColor — a mark takes no ink from its host, so its colors are literal`);

  const els: El[] = [];
  for (const m of raw.matchAll(/<(\/?)([A-Za-z][A-Za-z0-9]*)([^>]*?)(\/?)>/g)) {
    els.push({ tag: m[2], close: m[1] === '/', selfClose: m[4] === '/', attrs: m[1] ? {} : attrsOf(m[3], `${where} <${m[2]}>`, errs) });
  }
  // Text between elements (beyond whitespace) is content the checks cannot see.
  const between = raw.replace(/<[^>]*>/g, '').trim();
  if (between) errs.push(`${where}: carries character content ('${between.slice(0, 30)}') — text must be converted to outlines`);

  for (const e of els) {
    if (e.close) continue;
    if (!ALLOWED[e.tag]) { errs.push(`${where}: <${e.tag}> refused — ${WHY_REFUSED[e.tag] ?? 'not an element a mark may carry'}`); continue; }
    for (const a of Object.keys(e.attrs)) {
      if (!ALLOWED[e.tag].includes(a)) {
        const key = a.startsWith('stroke') ? 'stroke' : a;
        const why = WHY_REFUSED[key] ?? (a === 'class' ? WHY_REFUSED.style : a === 'clip-path' ? WHY_REFUSED.clipPath : 'not an attribute a mark may carry');
        errs.push(`${where}: <${e.tag} ${a}> refused — ${why}`);
      }
    }
  }

  const root = els[0];
  if (!root || root.tag !== 'svg' || root.close) { shapeErrors.push(`${where}: does not open with <svg>`); continue; }
  if (root.attrs.fill !== undefined && root.attrs.fill !== 'none') errs.push(`${where}: <svg fill="${root.attrs.fill}"> — the wrapper's fill must be none or absent, so every color lives on a path`);
  const vb = (root.attrs.viewBox ?? '').trim().split(/\s+/).map(Number);
  const w = Number(root.attrs.width), h = Number(root.attrs.height);
  if (vb.length !== 4 || vb.some((v) => !Number.isFinite(v)) || vb[0] !== 0 || vb[1] !== 0) errs.push(`${where}: viewBox '${root.attrs.viewBox ?? ''}' is not '0 0 <width> <height>'`);
  else if (vb[2] !== w || vb[3] !== h) errs.push(`${where}: width/height ${root.attrs.width}×${root.attrs.height} disagree with the viewBox ${vb[2]}×${vb[3]} — the importer sizes the frame from width and height, so they must be the artboard`);
  const kind = name.split('/')[0];
  const board = BRAND_MARK_ARTBOARDS[BRAND_MARK_KINDS[kind]];
  if (board.height !== h) errs.push(`${where}: ${kind} marks are ${board.height} high, and this one is ${h}`);
  if (typeof board.width === 'number' && board.width !== w) errs.push(`${where}: ${kind} marks are ${board.width} wide, and this one is ${w}`);
  if (board.width === 'per-mark') {
    const declared = provenance[`${source}.svg`]?.width;
    if (declared !== w) errs.push(`${where}: is ${w} wide and its provenance record declares width ${declared ?? 'nothing'} — a wallet lockup's width is the provider's, stated once in provenance.json`);
  }

  // Gradients: id → serialized element, and every fill reference must name one.
  const gradients = new Map<string, string>();
  const paths: string[] = [];
  const refs: string[] = [];
  const fills: string[] = [];
  let open: { tag: string; attrs: Attrs; stops: string[] } | null = null;
  let inDefs = false;
  for (const e of els.slice(1)) {
    if (e.tag === 'defs') { inDefs = !e.close && !e.selfClose; continue; }
    if (e.tag === 'g' || e.tag === 'svg') continue;
    if (e.tag === 'linearGradient' || e.tag === 'radialGradient') {
      if (e.close) {
        if (open) { gradients.set(open.attrs.id, `<${open.tag}${Object.entries(open.attrs).map(([k, v]) => ` ${k}="${v}"`).join('')}>${open.stops.join('')}</${open.tag}>`); open = null; }
        continue;
      }
      if (!inDefs) errs.push(`${where}: <${e.tag}> outside <defs>`);
      if (!e.attrs.id) errs.push(`${where}: <${e.tag}> carries no id, so no fill can name it`);
      for (const k of ['x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'fx', 'fy']) if (e.attrs[k] !== undefined && !NUM.test(e.attrs[k])) errs.push(`${where}: <${e.tag} ${k}="${e.attrs[k]}"> is not a number`);
      if (e.attrs.gradientUnits !== undefined && !['userSpaceOnUse', 'objectBoundingBox'].includes(e.attrs.gradientUnits)) errs.push(`${where}: gradientUnits '${e.attrs.gradientUnits}'`);
      open = { tag: e.tag, attrs: e.attrs, stops: [] };
      if (e.selfClose) { errs.push(`${where}: <${e.tag} id="${e.attrs.id}"> has no stops`); open = null; }
      continue;
    }
    if (e.tag === 'stop') {
      if (!open) { errs.push(`${where}: <stop> outside a gradient`); continue; }
      const c = e.attrs['stop-color'];
      if (!c || !HEX.test(c)) errs.push(`${where}: <stop stop-color="${c ?? ''}"> is not a hex color — the provider's colors are copied as supplied, in hex`);
      else fills.push(c);
      if (e.attrs['stop-opacity'] !== undefined && !NUM.test(e.attrs['stop-opacity'])) errs.push(`${where}: stop-opacity '${e.attrs['stop-opacity']}'`);
      open.stops.push(`<stop${Object.entries(e.attrs).map(([k, v]) => ` ${k}="${v}"`).join('')}/>`);
      continue;
    }
    if (e.tag === 'path' && !e.close) {
      const a = e.attrs;
      if (!a.d) { errs.push(`${where}: <path> carries no d`); continue; }
      const f = a.fill;
      const ref = f ? /^url\(#([^)]+)\)$/.exec(f)?.[1] : undefined;
      if (!f) errs.push(`${where}: a <path> carries no fill — the SVG default is black, which is a color nobody chose`);
      else if (!HEX.test(f) && !ref) errs.push(`${where}: <path fill="${f}"> is neither a hex color nor a gradient reference`);
      else if (HEX.test(f)) fills.push(f);
      if (ref) refs.push(ref);
      for (const k of ['fill-rule', 'clip-rule']) if (a[k] !== undefined && a[k] !== 'evenodd' && a[k] !== 'nonzero') errs.push(`${where}: ${k}="${a[k]}"`);
      for (const k of ['opacity', 'fill-opacity']) if (a[k] !== undefined && !NUM.test(a[k])) errs.push(`${where}: ${k}="${a[k]}"`);
      // Re-serialized in a fixed attribute order, `id` dropped (the layer name is Figma's, not the file's).
      paths.push(`<path${['fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'd', 'fill'].filter((k) => a[k] !== undefined).map((k) => ` ${k}="${a[k]}"`).join('')}/>`);
    }
  }
  for (const ref of refs) if (!gradients.has(ref)) errs.push(`${where}: a fill names url(#${ref}), and no gradient in <defs> has that id`);
  if (paths.length === 0) errs.push(`${where}: carries no <path> — a mark that draws nothing`);
  if (errs.length) { shapeErrors.push(...errs); continue; }

  const doc = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">` +
    (gradients.size ? `<defs>${[...gradients.values()].join('')}</defs>` : '') + paths.join('') + '</svg>';
  marks.push({ name, source, width: w, height: h, doc, fills });
}
if (shapeErrors.length) fail(shapeErrors);

// ── EMIT ────────────────────────────────────────────────────────────────────────────────────────────
const out = `// GENERATED by \`npx tsx packages/engine/emit-marks.ts\` — do not edit.
//
// Source of truth is the pair \`marks/**/*.svg\` (the artwork) and \`brand-mark-set.ts\` (the names), with
// \`marks/provenance.json\` as a build input: a file with no record does not reach this module.
//
// Each document is the source re-serialized from the elements \`emit-marks.ts\` accepted, with every fill and
// gradient stop copied verbatim. A mark is never retinted and takes no ink from its host.
//
// Provenance, license and the trademark line: \`marks/NOTICE.md\` and \`marks/provenance.json\`.

/** The literal mark vocabulary. \`brand-mark.name\` is typed against this, so an unknown name fails at
 *  compile time. */
export type BrandMarkName = ${marks.map((m) => `'${m.name}'`).join(' | ')};

/** Mark name → its SVG document: the artboard as \`width\`/\`height\`/\`viewBox\`, gradients in \`<defs>\`,
 *  then one \`<path>\` per shape in drawing order. */
export const BRAND_MARK_DOCUMENTS: Record<BrandMarkName, string> = {
${marks.map((m) => `  '${m.name}': ${JSON.stringify(m.doc)},`).join('\n')}
};

/** Mark name → its artboard, \`[width, height]\`. */
export const BRAND_MARK_BOXES: Record<BrandMarkName, readonly [number, number]> = {
${marks.map((m) => `  '${m.name}': [${m.width}, ${m.height}],`).join('\n')}
};

/** Every mark name, sorted — the one thing a projection should iterate. */
export const BRAND_MARK_NAMES: readonly BrandMarkName[] = Object.keys(BRAND_MARK_DOCUMENTS) as BrandMarkName[];
`;

writeFileSync(outFile, out);
console.log(`  ✓ brand-mark-glyphs.ts — ${marks.length} marks from ${onDisk.size} source files`);
