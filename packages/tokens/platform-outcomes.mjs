/**
 * WHAT HAPPENED TO EACH TOKEN ON EACH PLATFORM (#2424) — the analysis `check-platforms.mjs` (the gate)
 * and `tools/sd-version-matrix/` (the tool) both read, the same split `tools/exporter-comparison/`
 * keeps between `compare.ts` and `gate.ts`.
 *
 * Two readers, two artifacts (docs/34). The SOURCE side walks the DTCG JSON and resolves aliases
 * itself; the OUTPUT side parses the files Style Dictionary wrote, one parser per format. Nothing here
 * asks Style Dictionary what it did, and nothing reuses its name transforms: a token is matched to its
 * output by a normalized name (lowercase, letters and digits only), so `nbds.core.dimension.0`,
 * `--nbds-core-dimension-0`, `NbdsCoreDimension0` and `nbds_core_dimension_0` all meet at
 * `nbdscoredimension0` without this file knowing which casing a platform uses.
 *
 * Each token lands in exactly one outcome per platform:
 *   emitted     — the value reached the file as written in the DTCG
 *   transformed — the value reached the file in that platform's own form, and the form is usable
 *   broken      — the token reached the file, and the value would not compile, would not parse, or
 *                 states the wrong number
 *   lost        — the token is not in the file at all
 *
 * `broken` is judged by rules a reader can check against the file by eye, each named where it is
 * applied. They are deliberately literal: an unquoted word in Swift or Kotlin does not compile,
 * `<integer>1.05</integer>` is refused by Android's resource compiler, and `[object Object]` is
 * Style Dictionary serializing a composite it has no transform for.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const OUTCOMES = ['emitted', 'transformed', 'broken', 'lost'];

/** The DTCG types the issue asks about, in the order the report prints them. */
export const TYPES = ['color', 'dimension', 'duration', 'cubicBezier', 'transition', 'typography', 'shadow',
  'gradient', 'strokeStyle', 'number', 'fontFamily', 'fontWeight'];

export const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// ---- SOURCE: walk the DTCG, merge overlays in order, resolve aliases ----------------------------

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(out[k]) && !('$value' in v) ? merge(out[k], v) : v;
  return out;
};

/** Every leaf in the merged sources: path, `$type` and the alias-resolved value. */
export const readSourceTokens = (files) => {
  const tree = files.map((f) => JSON.parse(readFileSync(f, 'utf8'))).reduce(merge);
  const leaves = new Map();
  const walk = (node, path) => {
    if (!isObj(node)) return;
    if ('$value' in node) { leaves.set(path, { path, type: node.$type, raw: node.$value }); return; }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, path ? `${path}.${k}` : k);
  };
  walk(tree, '');
  const resolveValue = (v, seen = new Set()) => {
    if (typeof v === 'string') {
      const whole = v.match(/^\{([^}]+)\}$/);
      if (whole) {
        if (seen.has(whole[1]) || !leaves.has(whole[1])) return undefined;
        return resolveValue(leaves.get(whole[1]).raw, new Set([...seen, whole[1]]));
      }
      return v;
    }
    if (Array.isArray(v)) return v.map((x) => resolveValue(x, seen));
    if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveValue(x, seen)]));
    return v;
  };
  for (const leaf of leaves.values()) {
    leaf.value = resolveValue(leaf.raw);
    leaf.alias = typeof leaf.raw === 'string' && /^\{[^}]+\}$/.test(leaf.raw);
  }
  return [...leaves.values()];
};

// ---- OUTPUT: one parser per format, each returning normalized name -> value ---------------------

const stripBlockComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const byLine = (text, re) => {
  const m = new Map();
  for (const x of text.matchAll(re)) m.set(norm(x[1]), x[2].trim());
  return m;
};

const PARSERS = {
  // `--name: value;` — comments are removed first, they carry the token's description.
  css: (dir) => byLine(stripBlockComments(readFileSync(resolve(dir, 'css/tokens.css'), 'utf8')), /^\s*--([\w-]+)\s*:\s*([^;]*);/gm),
  scss: (dir) => byLine(readFileSync(resolve(dir, 'scss/_tokens.scss'), 'utf8'), /^\s*\$([\w-]+)\s*:\s*([^;]*);/gm),
  // The ES module is IMPORTED, not pattern-matched: what a consumer's bundler would see is the value.
  js: async (dir) => {
    const mod = await import(`${pathToFileURL(resolve(dir, 'js/tokens.js')).href}?t=${Date.now()}`);
    return new Map(Object.entries(mod).map(([k, v]) => [norm(k), v]));
  },
  ios: (dir) => byLine(readFileSync(resolve(dir, 'ios/Tokens.swift'), 'utf8'), /^\s*public static let (\w+) = (.*?)(?:\s*\/\*.*\*\/)?\s*$/gm),
  android: (dir) => {
    const m = new Map();
    const text = readFileSync(resolve(dir, 'android/tokens.xml'), 'utf8');
    for (const x of text.matchAll(/<(\w+) name="([\w.]+)">([\s\S]*?)<\/\1>/g)) m.set(norm(x[2]), { tag: x[1], text: x[3].trim() });
    return m;
  },
  compose: (dir) => byLine(stripBlockComments(readFileSync(resolve(dir, 'compose/Tokens.kt'), 'utf8')), /^\s*val (\w+) = (.*?)\s*$/gm),
};

/** The `.d.ts` is read for the one thing it promises: a declaration for every export of the module. */
export const readDeclarations = (dir) => {
  const f = resolve(dir, 'js/tokens.d.ts');
  if (!existsSync(f)) return new Set();
  return new Set([...readFileSync(f, 'utf8').matchAll(/^export const (\w+)\s*:/gm)].map((x) => norm(x[1])));
};

export const PLATFORMS = Object.keys(PARSERS);

export const readPlatform = async (platform, dir) => PARSERS[platform](dir);

// ---- JUDGING ONE VALUE --------------------------------------------------------------------------

const GARBAGE = /\[object Object\]|\bundefined\b|\bNaN\b/;
const num = (s) => Number.parseFloat(String(s));
const pxOf = (v) => {
  // The absolute size a DTCG dimension states, in px, or null when it has none (em, %).
  const m = String(v).match(/^(-?[\d.]+)(px|rem)$/);
  return m ? num(m[1]) * (m[2] === 'rem' ? 16 : 1) : null;
};
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * An absolute size on a native platform (pt, dp, sp) has to equal the DTCG's px, at one px to one
 * point. A relative DTCG dimension (em, %) has no absolute equivalent, so turning it into one is a
 * wrong number whatever the factor. Returns null when the size is right.
 */
const nativeSizeWrong = (type, source, out) => {
  if (type !== 'dimension') return null;
  const px = pxOf(source);
  if (px === null) return `${source} has no absolute size, written as ${out}`;
  return Math.abs(num(out) - px) > 0.005 ? `${source} written as ${out}` : null;
};

/** `{ outcome, why }` for one token on one platform. `out` is what the parser read, or undefined. */
export const judge = (platform, token, out) => {
  if (out === undefined) return { outcome: 'lost' };
  const { type, value } = token;
  if (platform === 'js') {
    if (GARBAGE.test(JSON.stringify(out) ?? 'undefined')) return { outcome: 'broken', why: 'serialized as garbage' };
    return { outcome: sameJson(out, value) ? 'emitted' : 'transformed' };
  }
  if (platform === 'android') {
    const { tag, text } = out;
    if (GARBAGE.test(text)) return { outcome: 'broken', why: `<${tag}>${text}` };
    // aapt2 accepts only these shapes for these resource types.
    if (tag === 'integer' && !/^-?\d+$/.test(text)) return { outcome: 'broken', why: `<integer>${text}</integer> is not an integer` };
    if (tag === 'color' && !/^#[0-9a-f]{8}$/i.test(text)) return { outcome: 'broken', why: `<color>${text}` };
    // A color or a size that lands in a `<string>` cannot be referenced as `@color/…` or `@dimen/…`.
    if (type === 'color' && tag !== 'color') return { outcome: 'broken', why: `a color written as <${tag}>${text}` };
    if (type === 'dimension' && tag !== 'dimen') return { outcome: 'broken', why: `a dimension written as <${tag}>${text}` };
    if (tag === 'dimen') {
      if (!/^-?[\d.]+(dp|sp|px)$/.test(text)) return { outcome: 'broken', why: `<dimen>${text}` };
      const wrong = nativeSizeWrong(type, value, num(text));
      if (wrong) return { outcome: 'broken', why: wrong };
    }
    return { outcome: text === String(value) ? 'emitted' : 'transformed' };
  }
  const s = String(out);
  if (GARBAGE.test(s)) return { outcome: 'broken', why: s.slice(0, 40) };
  if (platform === 'css' || platform === 'scss') {
    if (token.alias && /^(var\(--|\$)[\w-]+\)?$/.test(s)) return { outcome: 'emitted' };
    return { outcome: s === String(value) ? 'emitted' : 'transformed' };
  }
  // Swift and Kotlin: the right-hand side of a declaration has to be a literal the compiler accepts.
  const valid = platform === 'ios'
    ? /^(-?[\d.]+|"[^"]*"|CGFloat\(-?[\d.]+\)|UIColor\(red: [\d.]+, green: [\d.]+, blue: [\d.]+, alpha: [\d.]+\)|UIFont.*)$/.test(s)
    : /^(-?[\d.]+|"[^"]*"|-?[\d.]+\.(dp|sp|em)|Color\(0x[0-9a-f]{8}\))$/i.test(s);
  if (!valid) return { outcome: 'broken', why: `\`${s.slice(0, 40)}\` does not compile` };
  const size = s.match(/^CGFloat\((-?[\d.]+)\)$|^(-?[\d.]+)\.(?:dp|sp)$/);
  if (size) {
    const wrong = nativeSizeWrong(type, value, size[1] ?? size[2]);
    if (wrong) return { outcome: 'broken', why: wrong };
  }
  return { outcome: s === String(value) || s === `"${value}"` ? 'emitted' : 'transformed' };
};

/**
 * Judge every source token on every platform for one build directory. Returns, per platform, the
 * per-type outcome counts, one example `why` per broken type, and how many source tokens it found
 * at all (the "does this version read our DTCG" number).
 */
export const outcomesFor = async (sourceFiles, dir, platforms = PLATFORMS) => {
  const tokens = readSourceTokens(sourceFiles);
  const result = {};
  for (const platform of platforms) {
    let out;
    try { out = await readPlatform(platform, dir); } catch { out = new Map(); }
    const byType = {};
    let found = 0;
    for (const t of tokens) {
      const v = out.get(norm(t.path));
      if (v !== undefined) found++;
      const { outcome, why } = judge(platform, t, v);
      const row = (byType[t.type] ??= { emitted: 0, transformed: 0, broken: 0, lost: 0, examples: [] });
      row[outcome]++;
      if ((outcome === 'broken' || outcome === 'lost') && row.examples.length < 2) row.examples.push(`${t.path}${why ? `: ${why}` : ''}`);
    }
    result[platform] = { byType, found, total: tokens.length, emittedNames: out.size };
  }
  return result;
};

/** One word per platform × type: the worst outcome any token of that type had. */
export const worst = (row) => (!row ? '—' : row.broken ? 'broken' : row.lost ? 'lost' : row.transformed ? 'transformed' : 'emitted');
