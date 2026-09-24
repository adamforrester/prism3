/**
 * DESCRIPTION-CLAIMS GATE (#1623) — every number a shipped description states about its own token is
 * true of that token, in the mode the description is read in.
 *
 *   npx tsx packages/engine/lint-description-claims.ts
 *
 * THE DEFECTS THIS CATCHES. The #1623 audit recomputed every contrast and percentage claim in the
 * emitted prose and found two classes no gate could see, because no gate read description text:
 *
 *   1. A claim stamped without a check. `tree.ts` wrote "mid-tone AA pivot (≥4.5:1 on white & black)"
 *      on every step 500 by step number alone; nb `green.500` measures 4.29:1 on black and wendys
 *      `secondary.500` 4.17:1.
 *   2. A claim true in one mode, shipped in all of them. The engine worded each role per mode and kept
 *      only light's, so the dark and high-contrast overlays read "Scrim — 40% black backdrop" beside
 *      a 60% or 70% scrim, and "~1.4:1" beside a 4.59:1 border. The Figma variable, which carries one
 *      description for all its modes, showed the same light-mode sentence in every mode.
 *
 * `lint-ratio-truth.ts` holds the `$extensions` numbers to the colors; this holds the PROSE to them.
 * The prose is a second report of the same facts, and `docs/34`'s rule applies to it the same way:
 * a second report nobody checks drifts, and nothing tells you.
 *
 * ── INDEPENDENCE (docs/34) — READ BEFORE CHANGING ANY COMPARISON BELOW ──────────────────────────
 *
 *   CLAIM    — parsed out of the description string, by this file's own grammar.
 *   ACTUAL   — recomputed here from the emitted VALUE: WCAG contrast from the resolved sRGB of the
 *              token and its partner (own luminance code, not `color.ts`), alpha from the resolved
 *              color, a percentage from a number's value, a proportion from two dimensions' px.
 *
 * Never read `$extensions.prism3.contrast` / `min` / a mode's `contrast` — those are the engine's
 * own report of the ratio, and comparing the prose against them would agree whenever both came from
 * the same wrong number (`docs/34` shape 1). `against` IS read, and only as a NAME: it says which
 * token the ratio is measured against when the prose does not name one. The prose's own named ground
 * wins when it names one ("4.5:1 on background.secondary"), so the claim is checked against what it
 * says, not against what the engine measured.
 *
 * ── WHAT IS READ ────────────────────────────────────────────────────────────────────────────────
 *
 *   DTCG   — every brand's canonical `<brand>.tokens.json` per mode (a mode reads its own
 *            `modes.<mode>.description` / `$value` / `against`, falling back to the leaf's), AND the
 *            conforming projection a consumer actually merges: `<brand>.base.tokens.json` with each
 *            `<brand>.<mode>.overlay.tokens.json` laid over it.
 *   FIGMA  — every committed `out/figma/<brand>/*.json` variable row, in the mode of its file. A Figma
 *            description serves every mode, so a claim may carry a per-mode parenthetical —
 *            `4.5:1 (7:1 in high-contrast modes)` — and each mode is held to its own number.
 *
 * ── THE GRAMMAR ─────────────────────────────────────────────────────────────────────────────────
 *
 *   `N:1`   a contrast FLOOR: measured ≥ N. On a dimension it is a PROPORTION to the sibling
 *           `track` (the only dimension that states one today).
 *   `~N:1`  an APPROXIMATE contrast: within 15% of N.
 *   `N%`    an alpha on a color, a value on a number: equal to N / 100.
 *   Partner — "on white", "on black", "on white & black", or "on <token.path>" right after the
 *           claim; otherwise the leaf's `against`.
 *
 * A claim this file cannot verify FAILS, naming itself. An unverifiable number in shipped prose is a
 * claim to verify or remove, and a gate that skipped it would be calibrated to pass exactly the claim
 * nobody checked — the #1623 class.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');

type RGBA = { r: number; g: number; b: number; a: number };   // 0..1
type Leaf = { $type: string; $value: unknown; $description?: string; $extensions?: any };

// ── color math, this file's own ──────────────────────────────────────────────────────────────────
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (c: RGBA) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
const ratio = (x: RGBA, y: RGBA) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
const WHITE: RGBA = { r: 1, g: 1, b: 1, a: 1 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 1 };

const parseColor = (v: unknown): RGBA | undefined => {
  if (v && typeof v === 'object' && 'r' in (v as object)) { const o = v as RGBA; return { r: o.r, g: o.g, b: o.b, a: o.a ?? 1 }; }
  if (typeof v !== 'string') return undefined;
  let m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v);
  if (m) {
    const n = (i: number) => parseInt(m![1].slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (m) return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a: m[4] === undefined ? 1 : +m[4] };
  return undefined;
};

// ── the claim grammar ────────────────────────────────────────────────────────────────────────────
type Claim = { text: string; kind: 'floor' | 'approx' | 'pct'; n: number; partner?: string; perMode: Map<string, Omit<Claim, 'perMode' | 'partner'>> };
const TOKEN = /(~|≥)?(\d+(?:\.\d+)?)(:1|%)/g;
const one = (pre: string | undefined, num: string, unit: string, text: string) =>
  ({ text, kind: unit === '%' ? 'pct' as const : pre === '~' ? 'approx' as const : 'floor' as const, n: +num });

/** Expand the Figma per-mode parenthetical's mode names back to modes. */
const modesNamed = (s: string): string[] =>
  s.split(/ and /).flatMap((w) => (w === 'high-contrast modes' ? ['hc-light', 'hc-dark'] : [w.trim()]));

export const parseClaims = (d: string): Claim[] => {
  const out: Claim[] = [];
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(d))) {
    // A token INSIDE a per-mode parenthetical belongs to the claim before it, not a claim of its own.
    if (out.length && out[out.length - 1].perMode.size && m.index < (out[out.length - 1] as any).end) continue;
    const c: Claim & { end: number } = { ...one(m[1], m[2], m[3], m[0]), perMode: new Map(), end: TOKEN.lastIndex };
    const rest = d.slice(TOKEN.lastIndex);
    const par = /^ \(([^()]*)\)/.exec(rest);
    const parts = par?.[1].split('; ').map((p) => /^(~|≥)?(\d+(?:\.\d+)?)(:1|%) in (.+)$/.exec(p));
    let after = rest;
    if (par && parts!.every(Boolean)) {
      for (const p of parts!) for (const mode of modesNamed(p![4])) c.perMode.set(mode, one(p![1], p![2], p![3], p![0]));
      c.end = TOKEN.lastIndex + par[0].length;
      after = rest.slice(par[0].length);
    }
    const on = /^ on (white & black|white|black|[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+)/.exec(after);
    if (on) c.partner = on[1];
    out.push(c);
  }
  return out;
};

// ── one row to check, whatever its source ────────────────────────────────────────────────────────
type Row = {
  where: string; mode: string; type: string; description: string;
  value: () => RGBA | number | undefined;          // the token's own resolved value in this mode
  resolve: (named: string) => RGBA | undefined;    // a token the prose or `against` names, in this mode
  against?: string;
  track?: () => number | undefined;                // a dimension's sibling `track`, for a proportion
};

const failures: string[] = [];
let checked = 0;
const fail = (r: Row, c: Claim, why: string) => failures.push(`${r.where} [${r.mode}] "${c.text}" — ${why}\n      ${r.description}`);

const checkRow = (r: Row): void => {
  for (const c0 of parseClaims(r.description)) {
    const c = { ...c0, ...(c0.perMode.get(r.mode) ?? {}) };
    checked++;
    const v = r.value();
    if (c.kind === 'pct') {
      const got = typeof v === 'number' ? v : v?.a;
      if (got === undefined) { fail(r, c, `a percentage on a ${r.type} this gate cannot read a value from`); continue; }
      if (Math.abs(got * 100 - c.n) > 0.5) fail(r, c, `the value is ${+(got * 100).toFixed(2)}%`);
      continue;
    }
    if (r.type === 'dimension' || r.type === 'FLOAT') {
      const tr = r.track?.();
      if (typeof v !== 'number' || tr === undefined) { fail(r, c, 'a ratio on a dimension with no sibling `track` to measure it against'); continue; }
      if (Math.abs(v / tr - c.n) > 0.01) fail(r, c, `measures ${(v / tr).toFixed(2)}:1 to its track`);
      continue;
    }
    if (typeof v !== 'object' || !v) { fail(r, c, `a contrast ratio on a ${r.type} with no color value`); continue; }
    if (v.a < 1) { fail(r, c, 'a contrast ratio on a translucent color — the ratio depends on the ground it composites over, which the claim does not name'); continue; }
    const named = c.partner ?? r.against;
    const partners = named === 'white & black' ? ['white', 'black'] : named ? [named] : [];
    if (!partners.length || named === 'self') { fail(r, c, 'a contrast ratio with no partner — the prose names none and the token records none'); continue; }
    for (const p of partners) {
      const pc = p === 'white' ? WHITE : p === 'black' ? BLACK : r.resolve(p);
      if (!pc) { fail(r, c, `names '${p}', which does not resolve in this mode`); continue; }
      if (pc.a < 1) { fail(r, c, `measured against the translucent '${p}'`); continue; }
      const got = ratio(v, pc);
      if (c.kind === 'floor' && got < c.n - 0.005) fail(r, c, `measures ${got.toFixed(2)}:1 against ${p}`);
      if (c.kind === 'approx' && Math.abs(got - c.n) > 0.15 * c.n) fail(r, c, `measures ${got.toFixed(2)}:1 against ${p}, not ~${c.n}:1`);
    }
  }
};

// ── DTCG ─────────────────────────────────────────────────────────────────────────────────────────
const leavesOf = (n: any, path: string[] = [], out = new Map<string, Leaf>()): Map<string, Leaf> => {
  if (n && typeof n === 'object') {
    if ('$value' in n) out.set(path.join('.'), n);
    else for (const [k, v] of Object.entries(n)) if (!k.startsWith('$')) leavesOf(v, [...path, k], out);
  }
  return out;
};
const read = (f: string) => JSON.parse(readFileSync(join(OUT, f), 'utf8'));

/** A mode's view: path → { value, description, against }. Resolves aliases through the same view. */
type View = Map<string, { type: string; value: unknown; description: string; against?: string }>;
const checkView = (label: string, mode: string, view: View): void => {
  const root = [...view.keys()][0].split('.')[0];
  const deref = (path: string, seen = 0): unknown => {
    const e = view.get(path);
    if (!e || seen > 20) return undefined;
    const ref = typeof e.value === 'string' ? /^\{(.+)\}$/.exec(e.value) : null;
    return ref ? deref(ref[1], seen + 1) : e.value;
  };
  const px = (path: string): number | undefined => {
    const v = deref(path);
    return typeof v === 'number' ? v : typeof v === 'string' && /^-?[\d.]+px$/.test(v) ? parseFloat(v) : undefined;
  };
  const tokenPath = (named: string): string | undefined =>
    [named, `${root}.color.${named}`, `${root}.core.palette.${named}`].find((p) => view.has(p));
  for (const [path, e] of view) {
    if (!e.description) continue;
    const parent = path.split('.').slice(0, -1).join('.');
    checkRow({
      where: `${label} ${path}`, mode, type: e.type, description: e.description, against: e.against,
      value: () => {
        const v = deref(path);
        return e.type === 'color' ? parseColor(v) : e.type === 'number' && typeof v === 'number' ? v : e.type === 'dimension' ? px(path) : undefined;
      },
      resolve: (named) => { const p = tokenPath(named); return p ? parseColor(deref(p)) : undefined; },
      track: () => (view.has(`${parent}.track`) ? px(`${parent}.track`) : undefined),
    });
  }
};

const brands = readdirSync(OUT).filter((f) => /^[a-z]+\.tokens\.json$/.test(f)).map((f) => f.split('.')[0]);
const represented: string[] = [];
for (const brand of brands) {
  const canon = leavesOf(read(`${brand}.tokens.json`));
  const overlayModes = readdirSync(OUT).filter((f) => f.startsWith(`${brand}.`) && f.endsWith('.overlay.tokens.json')).map((f) => f.slice(brand.length + 1, -'.overlay.tokens.json'.length));
  for (const mode of ['light', ...overlayModes]) {
    // The canonical tree, as this mode reads it.
    const view: View = new Map();
    for (const [p, l] of canon) {
      const m = mode === 'light' ? undefined : l.$extensions?.prism3?.modes?.[mode];
      view.set(p, { type: l.$type, value: m?.$value ?? l.$value, description: m?.description ?? l.$description ?? '', against: m?.against ?? l.$extensions?.prism3?.against });
    }
    checkView(`${brand}.tokens.json`, mode, view);
    // The conforming projection, as a consumer merges it.
    const merged: View = new Map();
    const lay = (tree: Map<string, Leaf>) => { for (const [p, l] of tree) merged.set(p, { type: l.$type, value: l.$value, description: l.$description ?? '', against: l.$extensions?.prism3?.against }); };
    lay(leavesOf(read(`${brand}.base.tokens.json`)));
    if (mode !== 'light') lay(leavesOf(read(`${brand}.${mode}.overlay.tokens.json`)));
    checkView(mode === 'light' ? `${brand}.base.tokens.json` : `${brand}.base+${mode}.overlay`, mode, merged);
    represented.push(`${brand}/${mode}`);
  }
}

// ── FIGMA ────────────────────────────────────────────────────────────────────────────────────────
const figmaRoot = join(OUT, 'figma');
const figmaBrands = existsSync(figmaRoot) ? readdirSync(figmaRoot).filter((b) => existsSync(join(figmaRoot, b, 'color.light.json'))) : [];
for (const brand of figmaBrands) {
  const files = readdirSync(join(figmaRoot, brand)).filter((f) => f.endsWith('.json'))
    .map((f) => ({ f, j: JSON.parse(readFileSync(join(figmaRoot, brand, f), 'utf8')) }))
    .filter(({ j }) => Array.isArray(j.variables));
  const canon = leavesOf(read(`${brand}.tokens.json`));
  // Every variable a mode can see: its own mode's file for a moded collection, plus every single-mode one.
  const colorModes = files.filter(({ j }) => j.$collection === 'color').map(({ j }) => j.$mode as string);
  for (const mode of colorModes) {
    const rows = new Map<string, any>();
    for (const { j } of files) if (j.$collection !== 'color' || j.$mode === mode) for (const v of j.variables) if (!rows.has(v.name)) rows.set(v.name, v);
    const root = [...rows.keys()][0].split('/')[0];
    const byName = (n: string) => rows.get(n.replace(/\./g, '/')) ?? rows.get(`${root}/color/${n.replace(/\./g, '/')}`) ?? rows.get(`${root}/core/palette/${n.replace(/\./g, '/')}`);
    for (const [name, v] of rows) {
      if (!v.description) continue;
      const dotted = name.replace(/\//g, '.');
      const leaf = canon.get(dotted);
      const against = mode === 'light' ? leaf?.$extensions?.prism3?.against : leaf?.$extensions?.prism3?.modes?.[mode]?.against ?? leaf?.$extensions?.prism3?.against;
      const parent = name.split('/').slice(0, -1).join('/');
      checkRow({
        where: `figma/${brand} ${name}`, mode, type: v.resolvedType, description: v.description, against,
        // Figma's opacity variables hold PERCENT (an OPACITY-scoped 10 is 10%), where DTCG holds the
        // 0–1 multiplier; the claim is the same, so the unit is normalized here rather than in the grammar.
        value: () => (v.resolvedType === 'COLOR' ? parseColor(v.value)
          : typeof v.value === 'number' ? (v.scopes?.includes('OPACITY') ? v.value / 100 : v.value) : undefined),
        resolve: (n) => { const r = byName(n); return r?.resolvedType === 'COLOR' ? parseColor(r.value) : undefined; },
        track: () => { const t = rows.get(`${parent}/track`); return typeof t?.value === 'number' ? t.value : undefined; },
      });
    }
    represented.push(`figma/${brand}/${mode}`);
  }
}

// ── representation: every promised surface was actually read ─────────────────────────────────────
const expectDtcg = brands.length >= 4 && brands.every((b) => ['light', 'dark', 'hc-light', 'hc-dark'].every((m) => represented.includes(`${b}/${m}`)));
const expectFigma = figmaBrands.length >= 3 && figmaBrands.every((b) => represented.includes(`figma/${b}/hc-dark`));
if (!expectDtcg) failures.push(`representation: expected 4+ DTCG brands × light/dark/hc-light/hc-dark, read ${represented.filter((r) => !r.startsWith('figma')).join(', ')}`);
if (!expectFigma) failures.push(`representation: expected 3+ Figma brands through hc-dark, read ${represented.filter((r) => r.startsWith('figma')).join(', ')}`);
if (checked < 1000) failures.push(`representation: only ${checked} claims were checked — the parser is not finding the prose`);

if (failures.length) {
  console.error(`✗ lint-description-claims: ${failures.length} description claim(s) do not hold (${checked} checked):`);
  for (const f of failures.slice(0, 40)) console.error(`  ✗ ${f}`);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`✓ lint-description-claims: all ${checked} ratio / percentage claims hold in the mode they are read in — ${brands.length} DTCG brands (canonical + base/overlay) and ${figmaBrands.length} Figma brands, ${represented.length} brand×mode views`);
