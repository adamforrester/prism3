// Prism3 chrome tokens: the shared resolver for every chrome build (the studio and plugin bundles,
// through `esbuild-plugin.mjs`; and the mockups: style tiles, concept v5 and v6).
//
// Extracted from `style-tiles/build-tiles.mjs` so the tile and v5 read the same tokens the same way
// and neither forks the other. Moved here from `docs/superpowers/ui-redesign/` in S1.1 of the UI
// redesign, unchanged apart from this header and `FONTS_DIR`, so the product and the mockups read
// one module. Every build imports from here; nothing here writes a file.
//
// It reads the canonical default theme (`packages/engine/out/prism3.tokens.json`, root `pds3`) and its
// dark overlay, merges them per mode the way the engine emits them (the overlay is a sparse tree of
// leaves that replace the base leaf at the same path; aliases resolve against the merged tree, so an
// overlay alias still lands on the base's core palette), and turns a variable map into `--p3-*`
// custom properties for each theme.
//
// Also here, because every build enforces them: the raw-value scan (no hex, color function, length,
// duration or shadow in chrome CSS), the brand-leak check (no chrome color through the brand palette
// or a brand, link or focus role), WCAG contrast, and the embedded chrome fonts.
//
// Zero dependencies, no network.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..', '..');
export const FONTS_DIR = join(HERE, 'fonts');
export const NS = 'pds3';

// ── merge + resolve ────────────────────────────────────────────────────────────────────────────
export const isLeaf = (n) => n && typeof n === 'object' && '$value' in n;
export function* leaves(node, path = []) {
  if (isLeaf(node)) { yield [path, node]; return; }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) yield* leaves(v, [...path, k]);
}
/** The default theme's light and dark trees, merged the way the engine emits them. */
export function loadModes() {
  const out = join(ROOT, 'packages', 'engine', 'out');
  const base = JSON.parse(readFileSync(join(out, 'prism3.tokens.json'), 'utf8'));
  const darkOverlay = JSON.parse(readFileSync(join(out, 'prism3.dark.overlay.tokens.json'), 'utf8'));
  const merged = (overlay) => {
    const tree = structuredClone(base);
    if (!overlay) return tree;
    for (const [path, leaf] of leaves(overlay)) {
      let n = tree;
      for (const k of path.slice(0, -1)) n = n[k] ??= {};
      n[path[path.length - 1]] = leaf;
    }
    return tree;
  };
  return { light: merged(null), dark: merged(darkOverlay) };
}
export function leafAt(tree, dotted) {
  let n = tree;
  for (const k of dotted.split('.')) { n = n?.[k]; if (n === undefined) throw new Error(`no token at ${dotted}`); }
  if (!isLeaf(n)) throw new Error(`${dotted} is a group, not a token`);
  return n;
}
/** Follows alias chains; returns { value, leaf, chain } where chain lists every path visited. */
export function resolve(tree, dotted, chain = []) {
  const leaf = leafAt(tree, dotted);
  chain.push(dotted);
  const v = leaf.$value;
  if (typeof v === 'string' && /^\{[^}]+\}$/.test(v)) return resolve(tree, v.slice(1, -1), chain);
  return { value: v, leaf, chain };
}
export const P = (p) => `${NS}.${p}`;

// ── the tile's variable map: one role mapping, resolved per mode ───────────────────────────────
// [variable, token path (below `pds3.`), kind]. The same path serves both themes; only the mode's
// merged tree differs. Nothing here is a per-theme hand pick. v5 uses this map and adds to it.
export const C = 'color', D = 'dim', N = 'num', T = 'time', E = 'ease';
export const TILE_VARS = [
  // surfaces: the page (top bar, levers, preview, drawer) and the inset tint (segment tracks, tips,
  // the per-mode body, the drawer's cards, badges). `fill-2` is the progress and spinner track.
  // `bg-2` is only the harness page around the frame.
  ['bg-page', 'color.background.primary', C],
  ['bg-2', 'color.background.secondary', C],
  ['fill-1', 'color.foreground.primary', C],
  ['fill-2', 'color.foreground.secondary', C],
  // text and icons
  ['text', 'color.text.primary', C],
  ['text-2', 'color.text.secondary', C],
  ['icon', 'color.icon.primary', C],
  ['icon-2', 'color.icon.secondary', C],
  // lines: 1 is the hairline (decorative only: region and section splits), 2 clears 3:1 (slider rail)
  ['line-1', 'color.border.primary', C],
  ['line-2', 'color.border.secondary', C],
  // fields, the selected edge and focus, hover washes
  ['field-edge', 'color.field.border.rest', C],
  ['field-edge-hover', 'color.field.border.hover', C],
  ['ctl-edge', 'color.interactive.neutral.border.rest', C],
  ['overlay-hover', 'color.interactive.neutral.overlay.hover', C],
  ['overlay-pressed', 'color.interactive.neutral.overlay.pressed', C],
  // inverse: the one primary action and the switch's on track
  ['inv-bg', 'color.inverse.background.primary', C],
  ['inv-bg-2', 'color.inverse.background.secondary', C],
  ['inv-text', 'color.inverse.text.primary', C],
  // status, for verdicts only
  ['ok-icon', 'color.icon.success', C],
  ['warn-icon', 'color.icon.warning', C],
  ['bad-text', 'color.text.danger', C],
  ['bad-icon', 'color.icon.danger', C],
  // space
  ['space-025', 'space.025', D], ['space-050', 'space.050', D], ['space-075', 'space.075', D],
  ['space-100', 'space.100', D], ['space-150', 'space.150', D], ['space-200', 'space.200', D],
  ['space-250', 'space.250', D], ['space-300', 'space.300', D], ['space-400', 'space.400', D],
  ['space-500', 'space.500', D],
  // radius: `radius.lg` (6px) for every control, field, card and panel; `md` for a segment inside
  // its track (6 minus the track's 4px inset would be 2px, which reads square); pill for the
  // verdict, badges, dots, the switch and the slider thumb. No radius above 6px until #1852.
  ['radius-md', 'radius.md', D], ['radius-lg', 'radius.lg', D], ['radius-pill', 'radius.capsule', D],
  // borders and focus
  ['bw-hairline', 'border-width.hairline', D], ['bw-thick', 'border-width.thick', D],
  ['focus-width', 'focus.ring.width', D], ['focus-offset', 'focus.ring.offset', D],
  ['focus-offset-field', 'focus.ring.offset-field', D],
  // control geometry: fields and chips 40, top-bar controls 36, small buttons 28, the drawer bar 44,
  // the top bar and the tab row 56
  ['ctl-h', 'core.dimension.40', D], ['ctl-h-sm', 'size.sm.height', D], ['ctl-h-xs', 'size.xs.height', D],
  ['bar-h', 'size.lg.height', D], ['ctl-h-md', 'size.md.height', D],
  ['track-h', 'control.size.sm.track', D],
  ['track-w', 'control.size.sm.width', D], ['thumb', 'control.size.sm.thumb', D],
  ['thumb-inset', 'control.size.sm.inset', D], ['dot', 'control.size.sm.dot', D],
  ['icon-xs', 'icon.size.xs', D],
  ['hit-min', 'core.dimension.24', D], ['swatch-h', 'core.dimension.40', D],
  // type: sizes, weights, leading and tracking. The families are chrome constants (CHROME_FONTS).
  ['fs-12', 'core.font.size.12', D], ['fs-14', 'core.font.size.14', D],
  ['fs-16', 'core.font.size.16', D],
  ['fw-default', 'core.font.weight-role.default', N], ['fw-emphasis', 'core.font.weight-role.emphasis', N],
  ['fw-strong', 'core.font.weight-role.strong', N],
  ['lh-compact', 'core.font.line-height-role.compact', N],
  ['lh-cozy', 'core.font.line-height-role.cozy', N], ['lh-normal', 'core.font.line-height-role.normal', N],
  ['ls-snug', 'core.font.letter-spacing-role.snug', D],
  // motion
  ['dur-fast', 'motion.duration.fast', T], ['dur-spin', 'motion.duration.spin', T],
  ['dur-fast-reduced', 'motion.duration-reduced.fast', T],
  ['dur-spin-reduced', 'motion.duration-reduced.spin', T],
  ['ease', 'motion.easing-role.default', E],
];

// ── value formatting ───────────────────────────────────────────────────────────────────────────
export const cssOf = (tree, [name, path, kind]) => {
  const { value, chain } = resolve(tree, P(path));
  switch (kind) {
    case C: case D: case N: case T: return { css: String(value), chain };
    case E: return { css: `cubic-bezier(${value.join(', ')})`, chain };
    default: throw new Error(`unknown kind ${kind} for ${name}`);
  }
};
/** `  --p3-name: value;` lines for one mode. */
export const themeBlock = (tree, vars) => vars.map((v) => `  --p3-${v[0]}: ${cssOf(tree, v).css};`).join('\n');

// ── no brand in the chrome ─────────────────────────────────────────────────────────────────────
export const BRAND_RE = /(core\.palette\.(primary|accent))|\.brand\b|\.brand-|\.link\.|border\.focus/;
/** One message per chrome color variable that resolves through a brand token, in any mode. */
export function brandLeaks(modes, vars) {
  const errors = [];
  for (const mode of Object.keys(modes)) {
    for (const v of vars) {
      if (v[2] !== C) continue;
      const { chain } = resolve(modes[mode], P(v[1]));
      const bad = chain.find((p) => BRAND_RE.test(p));
      if (bad) errors.push(`chrome var --p3-${v[0]} (${mode}) resolves through brand token ${bad}`);
    }
  }
  return errors;
}

// ── chrome fonts ───────────────────────────────────────────────────────────────────────────────
// Chrome fonts: NOT from tokens, on purpose. The chrome's face is the product's own, and must not
// move when the default theme's `core.font.family.body` lever does (that lever is brand content).
// Both faces are embedded from `fonts/` beside this file (the fontsource latin variable subsets, SIL OFL
// 1.1, licenses alongside) as woff2 data URIs, so the page makes no network request and renders the
// same on a machine with neither installed.
export const CHROME_FONTS = [
  // [variable, family, woff2 file, fallback stack]
  ['font-ui', 'Inter', 'inter-latin-wght-normal.woff2', 'system-ui, sans-serif'],
  ['font-mono', 'JetBrains Mono', 'jetbrains-mono-latin-wght-normal.woff2', 'ui-monospace, monospace'],
];
/**
 * `@font-face` rules for the chrome faces. `alias` maps a family to the name the page registers it
 * under. v5 registers them under chrome-only names, so a brand that names "Inter" is still checked
 * against the device and not satisfied by the chrome's embedded copy.
 */
export function fontFaceCss(alias = {}) {
  return CHROME_FONTS.map(([, family, file]) => {
    const b64 = readFileSync(join(FONTS_DIR, file)).toString('base64');
    return `@font-face {\n  font-family: "${alias[family] || family}"; font-style: normal; font-weight: 100 900; font-display: block;\n`
      + `  src: url(data:font/woff2;base64,${b64}) format("woff2");\n}`;
  }).join('\n');
}
export const fontVarsCss = (alias = {}) => CHROME_FONTS.map(([n, family, , stack]) => `  --p3-${n}: "${alias[family] || family}", ${stack};`).join('\n');

// ── raw-value scan ─────────────────────────────────────────────────────────────────────────────
export const RAW = [
  [/#[0-9a-f]{3,8}\b/gi, 'raw hex color'],
  [/\b(rgba?|hsla?|oklch|oklab|lab|lch|color)\(/gi, 'raw color function'],
  [/(?<![\w-])-?\d*\.?\d+(px|rem|em|pt|vh|vw|ch)\b/gi, 'raw length'],
  [/(?<![\w-])\d*\.?\d+(ms|s)\b/gi, 'raw duration'],
  // T5: no shadows anywhere. Elevation is carried by the background/foreground roles and hairlines.
  [/\b(box-shadow|text-shadow)\s*:|drop-shadow\(/gi, 'shadow (T5: no shadows)'],
];
/** Pushes one message per raw value in `text` (comments stripped) onto `errors`. */
export function scanRaw(text, where, errors) {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [re, what] of RAW) for (const m of stripped.matchAll(re)) errors.push(`${where}: ${what} "${m[0]}"`);
}

// ── contrast (WCAG 2.x relative luminance) ─────────────────────────────────────────────────────
// A pair is measured as drawn: the foreground composited over an OPAQUE background. Anything that
// is not a 6- or 8-digit hex, or a translucent background (there is nothing defined beneath it to
// composite over), is refused rather than scored — a NaN compares false against every floor, so an
// unparsed value would otherwise pass silently. `ratio` returns a number, or { refused: why }.
// (The tile review's fix, carried here so the tiles and v5 share one implementation.)
export const hexRgba = (h) => {
  const x = typeof h === 'string' && /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(h) ? h.slice(1) : null;
  if (!x) return null;
  const n = (i) => parseInt(x.slice(i, i + 2), 16) / 255;
  return [n(0), n(2), n(4), x.length === 8 ? n(6) : 1];
};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const ratio = (a, b) => {
  const fg = hexRgba(a), bg = hexRgba(b);
  if (!fg || !bg) return { refused: `not a 6- or 8-digit hex (${!fg ? a : b})` };
  if (bg[3] < 1) return { refused: `translucent background (${b})` };
  const drawn = fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
  const [x, y] = [lum(drawn), lum(bg)].sort((p, q) => q - p);
  const r = (x + 0.05) / (y + 0.05);
  return Number.isFinite(r) ? r : { refused: `ratio is not a number (${a} on ${b})` };
};
/** Floored, never rounded up, so a printed pass is never a rounding artifact. */
export const fmtRatio = (r) => `${(Math.floor(r * 100) / 100).toFixed(2)}:1`;
