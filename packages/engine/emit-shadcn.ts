/**
 * Prism3 — THE SHADCN/UI THEME PROJECTOR (#2997). Projects each brand's emitted tokens onto shadcn/ui's theme
 * variables, as a plain CSS file and as a shadcn registry item (`registry:theme`).
 *
 *   npx tsx packages/engine/emit-shadcn.ts                 # write out/shadcn/<brand>.css and .registry-item.json
 *   npx tsx packages/engine/emit-shadcn.ts --out <dir>     # write <dir>/shadcn/** instead (what a gate renders)
 *
 * A PROJECTION, NOT A SECOND SOURCE. It reads the emitted handoff — `<brand>.base.tokens.json` plus
 * `<brand>.dark.overlay.tokens.json` in `out/` — never the engine's in-memory theme, and every value comes from the
 * role `projections/shadcn.ts` names for it. That file holds no values, so nothing here can drift from the tokens a
 * brand ships.
 *
 * Literal values, not `var(--pds3-…)` aliases: shadcn switches modes with `.dark`, `@prism3/tokens` with
 * `[data-theme="dark"]`, so an alias would not flip.
 *
 * COLOR FORMAT (Q2997.14 A). `oklch()`, converted from the emitted hex or rgb() with `color.ts`, as shadcn's stock themes are.
 * The precision is the smallest that keeps every corpus value on its own 8-bit hex; gate 2 (`lint-shadcn-roundtrip`,
 * #2997 PR 2) proves that through Chromium's own parser, which shares no code with this file. A value with alpha
 * keeps it in the `oklch(L C H / NN%)` form shadcn uses for its dark `border`.
 *
 * A REGEN STEP (Q2997.5 B, #2997 PR 4): `out/shadcn/**` is committed and drift-checked like every artifact. The gates
 * still render a fresh copy with `--out`, so they never read a stale one.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hexToRgb, rgbToOklch } from './color.ts';
import { ENGINE_VERSION } from './version.ts';
import {
  SHADCN_COLOR_VARS, SHADCN_DIMENSION_VARS, SHADCN_FONT_FALLBACK, SHADCN_MAP_VERSION, SHADCN_THEME_VARS,
} from './projections/shadcn.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = resolve(here, 'out');

/** shadcn's two modes, and the emitted overlay that supplies each (light is the base itself). */
export const SHADCN_MODES = { light: null, dark: 'dark' } as const;
export type ShadcnMode = keyof typeof SHADCN_MODES;

type Tree = Record<string, unknown>;
type Token = { $type?: string; $value?: unknown };

/** The brands the handoff carries: every `<brand>.base.tokens.json` in `dir`, sorted by code point. The web-only base
 * `<brand>.web.base.tokens.json` (#4155) shares the suffix but is not a brand, so it is skipped. */
export const handoffBrands = (dir = OUT_DIR): string[] =>
  readdirSync(dir).filter((f) => f.endsWith('.base.tokens.json') && !f.endsWith('.web.base.tokens.json')).map((f) => f.slice(0, -'.base.tokens.json'.length))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

export type Handoff = { brand: string; root: string; base: Tree; overlays: Partial<Record<string, Tree>> };

export const readHandoff = (brand: string, dir = OUT_DIR): Handoff => {
  const read = (f: string): Tree => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Tree;
  const baseFile = read(`${brand}.base.tokens.json`);
  const roots = Object.keys(baseFile);
  if (roots.length !== 1) throw new Error(`${brand}.base.tokens.json: expected one root, found ${roots.length}`);
  const root = roots[0]!;
  const overlays: Partial<Record<string, Tree>> = {};
  for (const m of Object.values(SHADCN_MODES)) {
    if (!m) continue;
    const f = `${brand}.${m}.overlay.tokens.json`;
    if (!existsSync(join(dir, f))) throw new Error(`${brand}: no ${f} in the handoff`);
    overlays[m] = (read(f)[root] ?? {}) as Tree;
  }
  return { brand, root, base: baseFile[root] as Tree, overlays };
};

const at = (tree: Tree | undefined, path: string): Token | undefined => {
  let node: unknown = tree;
  for (const k of path.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Tree)[k];
  }
  return node && typeof node === 'object' && '$value' in (node as Tree) ? (node as Token) : undefined;
};

/** A role's resolved `$value` in one mode: the overlay's token first, then the base's, following brace aliases the same
 *  way at every hop. Throws naming the role when it does not resolve. */
export const resolveRole = (h: Handoff, role: string, mode: ShadcnMode): { type: string; value: unknown } => {
  const overlay = SHADCN_MODES[mode] ? h.overlays[SHADCN_MODES[mode]!] : undefined;
  let path = role;
  for (let hop = 0; hop < 16; hop++) {
    const tok = at(overlay, path) ?? at(h.base, path);
    if (!tok) throw new Error(`${h.brand} ${mode}: ${path} is not in the handoff${path === role ? '' : ` (aliased from ${role})`}`);
    const v = tok.$value;
    const alias = typeof v === 'string' ? /^\{([^}]+)\}$/.exec(v) : null;
    if (!alias) return { type: tok.$type ?? '', value: v };
    if (!alias[1]!.startsWith(`${h.root}.`)) throw new Error(`${h.brand} ${mode}: ${path} aliases outside ${h.root}: ${v}`);
    path = alias[1]!.slice(h.root.length + 1);
  }
  throw new Error(`${h.brand} ${mode}: ${role} — alias chain deeper than 16`);
};

const trim = (v: number, places: number): string => {
  const s = v.toFixed(places).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
};

/** An emitted color — `#rrggbb`, `#rrggbbaa`, or `rgb()`/`rgba()` for a brand whose `colorFormat` is rgb — as its
 *  8-bit channels and an alpha in [0, 1]. Throws on anything else, so a new emitted format fails here by name. */
export const parseEmittedColor = (value: string): { r: number; g: number; b: number; alpha: number } => {
  const v = value.trim();
  const hx = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(v);
  if (hx) return { ...hexToRgb(hx[1]!), alpha: hx[2] ? parseInt(hx[2], 16) / 255 : 1 };
  const fn = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([0-9.]+)\s*)?\)$/.exec(v);
  if (fn) return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), alpha: fn[4] === undefined ? 1 : Number(fn[4]) };
  throw new Error(`not an emitted color: ${value}`);
};

/** An emitted color as CSS `oklch()`. L as a fraction, four places; C four places; H two places, and 0 for a color
 *  with no hue (CSS Color 4's convention, which shadcn's grays use). Alpha below 1 is written as a percentage. */
export const toOklchCss = (value: string): string => {
  const { r, g, b, alpha } = parseEmittedColor(value);
  const { l, c, h: hue } = rgbToOklch({ r, g, b });
  const cs = trim(c, 4);
  const hs = hue === null || cs === '0' ? '0' : trim(hue, 2);
  const body = `${trim(l, 4)} ${cs} ${hs}`;
  return alpha >= 1 ? `oklch(${body})` : `oklch(${body} / ${trim(alpha * 100, 2)}%)`;
};

const colorValue = (h: Handoff, role: string, mode: ShadcnMode): string => {
  const { type, value } = resolveRole(h, role, mode);
  if (type !== 'color' || typeof value !== 'string') throw new Error(`${h.brand} ${mode}: ${role} is not a color string (${type})`);
  return toOklchCss(value);
};

export const dimensionValue = (h: Handoff, role: string): string => {
  const { type, value } = resolveRole(h, role, 'light');
  if (type !== 'dimension' || typeof value !== 'string') throw new Error(`${h.brand}: ${role} is not a dimension (${type})`);
  return value;
};

export const fontValue = (h: Handoff, key: string, role: string): string => {
  const { type, value } = resolveRole(h, role, 'light');
  const families = (Array.isArray(value) ? value : [value]).map(String);
  if (type !== 'fontFamily' || !families.length) throw new Error(`${h.brand}: ${role} is not a font family (${type})`);
  const quote = (f: string): string => (/^[A-Za-z-]+$/.test(f) ? f : `"${f.replace(/"/g, '\\"')}"`);
  const fallback = SHADCN_FONT_FALLBACK[key];
  return [...families.map(quote), ...(fallback ? [fallback] : [])].join(', ');
};

/** One mode's shadcn variables, in map order: every color row, and `radius` in light only, as shadcn writes it. */
export const shadcnModeVars = (h: Handoff, mode: ShadcnMode): Array<[string, string]> => [
  ...Object.entries(SHADCN_COLOR_VARS).map(([k, role]): [string, string] => [k, colorValue(h, role, mode)]),
  ...(mode === 'light' ? Object.entries(SHADCN_DIMENSION_VARS).map(([k, role]): [string, string] => [k, dimensionValue(h, role)]) : []),
];

export const shadcnThemeVars = (h: Handoff): Array<[string, string]> =>
  Object.entries(SHADCN_THEME_VARS).map(([k, role]): [string, string] =>
    [k, k.startsWith('font-') ? fontValue(h, k, role) : dimensionValue(h, role)]);

const stamp = (brand: string): string =>
  `${brand} — a shadcn/ui theme generated by the Prism3 engine ${ENGINE_VERSION}, shadcn map ${SHADCN_MAP_VERSION}.`;

/** The plain CSS file: `:root` and `.dark`, the way shadcn's own `globals.css` carries a theme. */
export const shadcnCss = (h: Handoff): string => {
  const block = (sel: string, vars: Array<[string, string]>): string =>
    `${sel} {\n${vars.map(([k, v]) => `  --${k}: ${v};`).join('\n')}\n}\n`;
  return [
    `/* ${stamp(h.brand)} Do not edit: regenerate. */\n`,
    block(':root', shadcnModeVars(h, 'light')),
    block('.dark', shadcnModeVars(h, 'dark')),
  ].join('\n');
};

/** Q2997.17 B: stock shadcn's scaffold fades the focus ring to 50% (`outline-ring/50`), below 3:1 on the page. The
 *  registry item restores the full-strength ring the theme's own `ring` was measured at. */
export const SHADCN_BASE_CSS = { '@layer base': { '*': { '@apply outline-ring': {} } } } as const;

/** The `registry:theme` item `npx shadcn add <url>` installs. */
export const shadcnRegistryItem = (h: Handoff): Record<string, unknown> => ({
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: h.brand,
  type: 'registry:theme',
  title: h.brand,
  // DRAFT copy (#2997): the owner settles the wording.
  description: `Generated by the Prism3 engine ${ENGINE_VERSION}, shadcn map ${SHADCN_MAP_VERSION}.`,
  cssVars: {
    theme: Object.fromEntries(shadcnThemeVars(h)),
    light: Object.fromEntries(shadcnModeVars(h, 'light')),
    dark: Object.fromEntries(shadcnModeVars(h, 'dark')),
  },
  css: SHADCN_BASE_CSS,
});

/** Writes `<out>/shadcn/<brand>.css` and `<brand>.registry-item.json` for every brand in `handoffDir`. */
export const emitShadcn = (out = OUT_DIR, handoffDir = OUT_DIR): string[] => {
  const dir = join(out, 'shadcn');
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  for (const brand of handoffBrands(handoffDir)) {
    const h = readHandoff(brand, handoffDir);
    const css = join(dir, `${brand}.css`), item = join(dir, `${brand}.registry-item.json`);
    writeFileSync(css, shadcnCss(h));
    writeFileSync(item, `${JSON.stringify(shadcnRegistryItem(h), null, 2)}\n`);
    written.push(css, item);
  }
  return written;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  const out = i > 0 ? resolve(process.argv[i + 1] ?? '') : OUT_DIR;
  const written = emitShadcn(out);
  console.log(`✓ shadcn: ${written.length} files written to ${join(out, 'shadcn')}`);
}
