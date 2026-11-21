/**
 * Prism3 engine — THE BRAND ICON MAP (#3076, owner decision 2026-11-18: A, both; the proposal's Q1–Q8 at their
 * recommendations). Pure: no `node:*`, no I/O, so the plugin bundles it beside the rest of the materialization.
 *
 * Prism3's icons are placeholders (`icon-set.ts`: "a placeholder core, intended to be swapped for a client's branded
 * set"). A brand states which of its own icons stands in for each Prism3 icon, and carries that icon's art:
 *
 *   icons:
 *     map: { plus: add, plus-filled: add, minus: subtract, minus-filled: subtract, check: checkmark, close-filled: close }
 *     glyphs: { add: { path: "M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" }, … }
 *
 * `map` — a Prism3 icon name to the name of the icon that replaces it, everywhere a generated component uses it (Q3 A:
 * global, no per-component exceptions). `glyphs` — the brand's art, one SVG path on Prism3's 24×24 artboard (Q1 A: the
 * art travels in the brand input, so it is checked offline and code can draw the same glyph). A glyph whose name is a
 * Prism3 name replaces that icon's art for this brand (Q5 A), so the file holds one X, not two.
 *
 * WHERE IT APPLIES. `applyIconMap` rewrites a def before projection, beside `applyTagStyle` and the other brand
 * levers, so the projector stays a pure function of its def (`anatomy-figma.ts`). It rewrites the three places a def
 * names an icon (a `vector` part's `glyph`, a slot's `swapDefault`, a nested part's `overrides.swaps`), and on the
 * `icon` def it removes each mapped name from the `name` axis and adds each brand glyph, so a mapped Prism3 icon is no
 * longer built into this brand's file. The brand's art rides on the def as `brandGlyphs`, which only this rewrite
 * writes and the projector reads before the core set.
 *
 * A brand with no `icons` block is the identity: every def comes back as the same object, so its plans are
 * byte-identical to before.
 *
 * Every rule below fails BY NAME (`iconMapErrors`), and `brandTheme` refuses a brand that breaks one, the choke point
 * every entry path passes through.
 */
import { ICON_NAMES } from './icon-glyphs';
import { COMPONENT_GLYPHS } from './component-glyphs';
import type { ComponentDef, PartDef } from './component-schema';

/** One brand glyph: a single SVG path on Prism3's `0 0 24 24` artboard, filled. `fillRule` only when it cuts counters. */
export type BrandGlyph = { path: string; fillRule?: 'evenodd' };
/** The brand-input `icons` block (`theme-schema.json`). */
export type BrandIcons = { map?: Record<string, string>; glyphs?: Record<string, BrandGlyph> };

/** An icon name, as Prism3's own are written: lowercase words joined by hyphens. */
export const ICON_NAME_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Prism3's icon artboard, `0 0 24 24`: a brand glyph's ink must fall inside it (Q1 A, the proposal's Design B). */
export const GLYPH_ARTBOARD = 24;

/** Hears one segment of a path in absolute coordinates: a move, a line, a cubic (a quadratic arrives as its exact cubic),
 *  an arc (only flagged, its numbers are not kept), or a close. */
type PathSink = (cmd: 'M' | 'L' | 'C' | 'A' | 'Z', pts: number[]) => void;

/** Numbers each SVG path command takes per repeat (either case). */
const PATH_ARITY: Readonly<Record<string, number>> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/**
 * The ink box of one SVG path's data, in its own units, or the reason it is not path data. The whole SVG path grammar,
 * relative commands, smooth curves and arcs included, because a brand's art arrives from its own icon package. Curves
 * and arcs are SAMPLED, never bounded by their control points: a cubic's handles may leave the artboard while its curve
 * stays inside, and an arc bulges past both its endpoints. Anything it cannot read is a reason, never a skip, so art
 * that would only fail in the host fails here, offline.
 *
 * `emit`, when given, hears each segment in absolute coordinates as it is read (`absoluteGlyphPath` uses it), so the one
 * grammar here serves both readers.
 */
export const glyphInkBox = (d: string, emit?: PathSink): { minX: number; minY: number; maxX: number; maxY: number } | string => {
  const num = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
  const sep = /[\s,]*/y;
  let i = 0;
  const skip = (): void => { sep.lastIndex = i; sep.exec(d); i = sep.lastIndex; };
  const readNum = (): number | undefined => { skip(); num.lastIndex = i; const m = num.exec(d); if (!m) return undefined; i = num.lastIndex; return Number(m[0]); };
  const readFlag = (): number | undefined => { skip(); const c = d[i]; if (c !== '0' && c !== '1') return undefined; i++; return Number(c); };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const see = (x: number, y: number): void => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
  const cubic = (p: readonly (readonly [number, number])[]): void => {
    for (let k = 0; k <= 32; k++) {
      const t = k / 32, u = 1 - t, w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      see(p.reduce((s, q, j) => s + (w[j] ?? 0) * q[0], 0), p.reduce((s, q, j) => s + (w[j] ?? 0) * q[1], 0));
    }
  };
  // SVG's elliptical arc, endpoint to center form (SVG 1.1 F.6.5, radii scaled up when too small, F.6.6), then sampled.
  const arc = (x1: number, y1: number, rx: number, ry: number, deg: number, large: number, sweep: number, x2: number, y2: number): void => {
    rx = Math.abs(rx); ry = Math.abs(ry);
    if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) { see(x2, y2); return; }
    const phi = (deg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
    const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
    if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
    const num2 = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
    const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num2 / (rx * rx * yp * yp + ry * ry * xp * xp)));
    const cxp = (coef * rx * yp) / ry, cyp = (-coef * ry * xp) / rx;
    const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
    const ang = (ux: number, uy: number, vx: number, vy: number): number => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
    let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI;
    if (sweep && dt < 0) dt += 2 * Math.PI;
    for (let k = 0; k <= 64; k++) {
      const t = t1 + (dt * k) / 64, ex = rx * Math.cos(t), ey = ry * Math.sin(t);
      see(cos * ex - sin * ey + cx, sin * ex + cos * ey + cy);
    }
  };
  let x = 0, y = 0, sx = 0, sy = 0, cx2 = 0, cy2 = 0, qx = 0, qy = 0, prev = '', cmd = '';
  skip();
  if (!/^[Mm]$/.test(d[i] ?? '')) return 'it does not start with a move (M)';
  while (true) {
    skip();
    if (i >= d.length) break;
    const c = d[i] ?? '';
    if (/[A-Za-z]/.test(c)) {
      if (!(c.toLowerCase() in PATH_ARITY)) return `'${c}' at character ${i} is not an SVG path command`;
      cmd = c; i++;
      if (cmd.toLowerCase() === 'z') { x = sx; y = sy; prev = 'z'; emit?.('Z', []); continue; }
    } else if (!cmd || cmd.toLowerCase() === 'z') return `'${c}' at character ${i} follows no command that takes numbers`;
    const lc = cmd.toLowerCase(), rel = cmd !== cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    const arity = PATH_ARITY[lc] ?? 0;
    const read: number[] = [];
    for (let k = 0; k < arity; k++) {
      const v = lc === 'a' && (k === 3 || k === 4) ? readFlag() : readNum();
      if (v === undefined) return `'${cmd}' at character ${i} needs ${arity} numbers and has ${k}`;
      read.push(v);
    }
    // Every index below is under the command's arity, read in full above; `?? 0` only satisfies the index check.
    const n = (k: number): number => read[k] ?? 0;
    const reflect = (px: number, py: number, kinds: string): [number, number] => (prev !== '' && kinds.includes(prev) ? [2 * x - px, 2 * y - py] : [x, y]);
    if (lc === 'm') { x = ox + n(0); y = oy + n(1); sx = x; sy = y; see(x, y); cmd = rel ? 'l' : 'L'; emit?.('M', [x, y]); }
    else if (lc === 'l') { x = ox + n(0); y = oy + n(1); see(x, y); emit?.('L', [x, y]); }
    else if (lc === 'h') { x = ox + n(0); see(x, y); emit?.('L', [x, y]); }
    else if (lc === 'v') { y = (rel ? y : 0) + n(0); see(x, y); emit?.('L', [x, y]); }
    else if (lc === 'c' || lc === 's') {
      const [ax, ay] = lc === 'c' ? [ox + n(0), oy + n(1)] : reflect(cx2, cy2, 'cs');
      const r = lc === 'c' ? 2 : 0;
      const bx = ox + n(r), by = oy + n(r + 1), ex = ox + n(r + 2), ey = oy + n(r + 3);
      cubic([[x, y], [ax, ay], [bx, by], [ex, ey]]); emit?.('C', [ax, ay, bx, by, ex, ey]); cx2 = bx; cy2 = by; x = ex; y = ey;
    } else if (lc === 'q' || lc === 't') {
      const [ax, ay] = lc === 'q' ? [ox + n(0), oy + n(1)] : reflect(qx, qy, 'qt');
      const ex = ox + n(lc === 'q' ? 2 : 0), ey = oy + n(lc === 'q' ? 3 : 1);
      const c1: [number, number] = [x + (2 / 3) * (ax - x), y + (2 / 3) * (ay - y)], c2: [number, number] = [ex + (2 / 3) * (ax - ex), ey + (2 / 3) * (ay - ey)];
      cubic([[x, y], c1, c2, [ex, ey]]); emit?.('C', [...c1, ...c2, ex, ey]);
      qx = ax; qy = ay; x = ex; y = ey;
    } else if (lc === 'a') { const ex = ox + n(5), ey = oy + n(6); arc(x, y, n(0), n(1), n(2), n(3), n(4), ex, ey); emit?.('A', []); x = ex; y = ey; }
    prev = lc;
  }
  return { minX, minY, maxX, maxY };
};

/** Why `d` is not usable brand art on Prism3's artboard, or `undefined` when it is (the reasons `iconMapErrors` gives). */
const glyphArtError = (d: unknown): string | undefined => {
  if (typeof d !== 'string') return 'not one SVG path\'s data (a string of commands and numbers, starting with M)';
  const box = glyphInkBox(d);
  if (typeof box === 'string') return `not one SVG path's data: ${box}`;
  const r = (v: number): number => Math.round(v * 1e4) / 1e4;
  const [x0, y0, x1, y1] = [r(box.minX), r(box.minY), r(box.maxX), r(box.maxY)];
  if (!(x1 > x0) || !(y1 > y0)) return `draws nothing: its outline measures ${r(x1 - x0)}×${r(y1 - y0)}`;
  if (x0 < 0 || y0 < 0 || x1 > GLYPH_ARTBOARD || y1 > GLYPH_ARTBOARD)
    return `its outline runs ${x0}..${x1} across and ${y0}..${y1} down, outside the 0 0 ${GLYPH_ARTBOARD} ${GLYPH_ARTBOARD} artboard; scale the art to ${GLYPH_ARTBOARD}×${GLYPH_ARTBOARD} first`;
  return undefined;
};

const CORE: ReadonlySet<string> = new Set(ICON_NAMES);

/** Every rule an `icons` block breaks, each naming the entry. Empty for a valid block or none. */
export const iconMapErrors = (icons: BrandIcons | undefined): string[] => {
  if (!icons) return [];
  const out: string[] = [];
  const map = icons.map ?? {};
  const glyphs = icons.glyphs ?? {};
  for (const [name, g] of Object.entries(glyphs)) {
    if (!ICON_NAME_SHAPE.test(name)) out.push(`icons.glyphs.${name}: '${name}' is not an icon name (lowercase words joined by hyphens)`);
    if (COMPONENT_GLYPHS[name]) out.push(`icons.glyphs.${name}: '${name}' is a glyph a component draws itself, not an icon`);
    if (name in map) out.push(`icons.glyphs.${name}: '${name}' is mapped to '${map[name]}', so this art would never be drawn`);
    const artError = glyphArtError(g?.path);
    if (artError) out.push(`icons.glyphs.${name}.path: ${artError}`);
    if (g?.fillRule !== undefined && g.fillRule !== 'evenodd') out.push(`icons.glyphs.${name}.fillRule: '${String(g.fillRule)}' — only 'evenodd' is written; leave it out for the default`);
  }
  for (const [from, to] of Object.entries(map)) {
    if (!CORE.has(from)) out.push(`icons.map.${from}: '${from}' is not a Prism3 icon, so nothing uses it to map`);
    if (typeof to !== 'string' || (!ICON_NAME_SHAPE.test(to) && !CORE.has(to))) { out.push(`icons.map.${from}: '${String(to)}' is not an icon name (lowercase words joined by hyphens)`); continue; }
    if (to === from) out.push(`icons.map.${from}: maps to itself`);
    else if (to in map) out.push(`icons.map.${from}: maps to '${to}', which is itself mapped to '${map[to]}' — map '${from}' to '${map[to]}' directly`);
    else if (!CORE.has(to) && !(to in glyphs)) out.push(`icons.map.${from}: maps to '${to}', which is neither a Prism3 icon nor in icons.glyphs, so it has no art`);
  }
  return out;
};

/** The icon `name` stands for in this brand: its map target, or itself. */
export const mappedIcon = (icons: BrandIcons | undefined, name: string): string => icons?.map?.[name] ?? name;

/** The icon set this brand's file holds: Prism3's names less the mapped ones, then each brand glyph not already there. */
export const brandIconNames = (icons: BrandIcons | undefined): string[] => {
  const map = icons?.map ?? {};
  const kept = ICON_NAMES.filter((n) => !(n in map));
  return [...kept, ...Object.keys(icons?.glyphs ?? {}).filter((n) => !CORE.has(n))];
};

const hasIcons = (icons: BrandIcons | undefined): icons is BrandIcons =>
  !!icons && (Object.keys(icons.map ?? {}).length > 0 || Object.keys(icons.glyphs ?? {}).length > 0);

/**
 * `def` with the brand's icon map applied (see the header). The IDENTITY, the same object, for a brand with no map and
 * no glyphs. A template glyph (`'{name}'`, the `icon` def's own) is left for the projector to fill per member; the
 * `icon` def's `name` axis is what the map reaches there.
 */
export const applyIconMap = (def: ComponentDef, icons: BrandIcons | undefined): ComponentDef => {
  if (!hasIcons(icons)) return def;
  const m = (n: string): string => mappedIcon(icons, n);
  const glyphs = icons.glyphs ?? {};
  const a = def.anatomy;
  // Every icon name the def holds after the rewrite, and whether any part moved.
  const named: string[] = [];
  let moved = false;
  let parts: Record<string, PartDef> | undefined;
  if (a) {
    parts = {};
    for (const [name, p] of Object.entries(a.parts)) {
      // A part names an icon in one of three fields; each is rewritten through the map, everything else kept.
      const glyph = p.kind === 'vector' && p.glyph !== undefined && !p.glyph.includes('{') ? { glyph: m(p.glyph) } : {};
      const swapDefault = p.kind === 'slot' && p.swapDefault !== undefined && !p.fixedPaint ? { swapDefault: m(p.swapDefault) } : {};
      const swaps = p.overrides?.swaps ? Object.fromEntries(Object.entries(p.overrides.swaps).map(([k, v]) => [k, m(v)])) : undefined;
      const overrides = swaps && p.overrides ? { overrides: { ...p.overrides, swaps } } : {};
      named.push(...Object.values(glyph), ...Object.values(swapDefault), ...Object.values(swaps ?? {}));
      if ((p.kind === 'vector' && 'glyph' in glyph && glyph.glyph !== p.glyph) || (p.kind === 'slot' && 'swapDefault' in swapDefault && swapDefault.swapDefault !== p.swapDefault)
        || (swaps && Object.entries(swaps).some(([k, v]) => p.overrides?.swaps?.[k] !== v))) moved = true;
      parts[name] = { ...p, ...glyph, ...swapDefault, ...overrides } as PartDef;
    }
  }
  const isIconSet = def.id === 'icon' && !!def.variants?.name;
  // The art rides only where the projector draws or names a brand glyph: the icon set, and a def that names one.
  const needsArt = Object.keys(glyphs).length > 0 && (isIconSet || named.some((n) => n in glyphs));
  if (!moved && !needsArt && !isIconSet) return def;
  const out: ComponentDef = { ...def, ...(a && parts && moved ? { anatomy: { ...a, parts } } : {}) };
  if (needsArt) out.brandGlyphs = { ...glyphs };
  if (isIconSet && def.variants?.name) {
    const names = brandIconNames(icons);
    out.variants = { ...def.variants, name: names };
    out.props = def.props.map((p) => (p.name === 'name' && p.values ? { ...p, values: names } : p));
  }
  return out;
};
