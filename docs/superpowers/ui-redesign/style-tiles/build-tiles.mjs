// Prism3 chrome style tiles: build script.
//
//   node docs/superpowers/ui-redesign/style-tiles/build-tiles.mjs
//
// Reads the canonical default theme (`packages/engine/out/prism3.tokens.json`, root `pds3`) and its
// dark overlay, merges them per mode the way the engine emits them (the overlay is a sparse tree of
// leaves that replace the base leaf at the same path; aliases resolve against the merged tree, so an
// overlay alias still lands on the base's core palette), and emits `--p3-*` custom properties for
// `[data-theme=light]` and `[data-theme=dark]` (plus `[data-theme=system]` under each color scheme).
//
// It then inlines those properties into `tiles.src.html` and writes the self-contained
// `style-tiles.html`. It FAILS (exit 1) when:
//   1. the tile CSS (`<style id="tile-css">`) or any inline `style=""` in the source carries a raw
//      color, length or duration: hex, rgb()/hsl()/oklch(), px/rem/em/pt, ms/s. Every value the tile
//      CSS uses must come through a `--p3-*` variable from the generated block. It also fails on any
//      box-shadow, text-shadow or drop-shadow (the owner's T5: no shadows);
//   2. the tile CSS or markup references a `--p3-*` variable the generated block does not define;
//   3. a chrome color variable resolves through the brand palette (`core.palette.primary`/`accent`)
//      or a brand, link or focus role. Only `--p3-sample-*` (preview content) may;
//   4. a declared chrome pair (PAIRS below) measures under its floor in either theme.
//
// Zero dependencies, no network. The declared-pair table is printed; the rendered audit (every text
// node, every interactive edge, every focus ring, every hit target, measured in Chromium) is
// `audit-tiles.mjs`.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const OUT = join(ROOT, 'packages', 'engine', 'out');
const base = JSON.parse(readFileSync(join(OUT, 'prism3.tokens.json'), 'utf8'));
const darkOverlay = JSON.parse(readFileSync(join(OUT, 'prism3.dark.overlay.tokens.json'), 'utf8'));
const NS = 'pds3';

// ── merge + resolve ────────────────────────────────────────────────────────────────────────────
const isLeaf = (n) => n && typeof n === 'object' && '$value' in n;
function* leaves(node, path = []) {
  if (isLeaf(node)) { yield [path, node]; return; }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) yield* leaves(v, [...path, k]);
}
function merged(overlay) {
  const tree = structuredClone(base);
  if (!overlay) return tree;
  for (const [path, leaf] of leaves(overlay)) {
    let n = tree;
    for (const k of path.slice(0, -1)) n = n[k] ??= {};
    n[path[path.length - 1]] = leaf;
  }
  return tree;
}
const MODES = { light: merged(null), dark: merged(darkOverlay) };

function leafAt(tree, dotted) {
  let n = tree;
  for (const k of dotted.split('.')) { n = n?.[k]; if (n === undefined) throw new Error(`no token at ${dotted}`); }
  if (!isLeaf(n)) throw new Error(`${dotted} is a group, not a token`);
  return n;
}
// Follows alias chains; returns { value, chain } where chain lists every path visited.
function resolve(tree, dotted, chain = []) {
  const leaf = leafAt(tree, dotted);
  chain.push(dotted);
  const v = leaf.$value;
  if (typeof v === 'string' && /^\{[^}]+\}$/.test(v)) return resolve(tree, v.slice(1, -1), chain);
  return { value: v, leaf, chain };
}
const P = (p) => `${NS}.${p}`;

// ── the variable map: one role mapping, resolved per mode ──────────────────────────────────────
// [variable, token path (below `pds3.`), kind]. The same path serves both themes; only the mode's
// merged tree differs. Nothing here is a per-theme hand pick.
const C = 'color', D = 'dim', N = 'num', T = 'time', E = 'ease';
const VARS = [
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

// Preview CONTENT, not chrome: the brand palette the user is theming. Mode-independent primitives.
const RAMP = 'core.palette.primary';
const rampSteps = Object.keys(MODES.light[NS].core.palette.primary).sort((a, b) => Number(a) - Number(b));

// Harness geometry: NOT from tokens. The token set has no side-panel or frame width (README gaps).
const HARNESS = [
  ['h-frame-wide', '1280px'], ['h-frame-narrow', '380px'],
  ['h-frame-tall', '1080px'], ['h-frame-narrow-tall', '720px'], ['h-panel', '440px'],
];

// Chrome fonts: NOT from tokens, on purpose. The chrome's face is the product's own, and must not
// move when the default theme's `core.font.family.body` lever does (that lever is brand content).
// Both faces are embedded from `fonts/` (the fontsource latin variable subsets, SIL OFL 1.1, licenses
// alongside) as woff2 data URIs, so the page makes no network request and renders the same on a
// machine with neither installed. That is the usual case: without them the chrome falls back to
// DejaVu Sans, which is what made the first pass look dated.
const CHROME_FONTS = [
  // [variable, family, woff2 file, fallback stack]
  ['font-ui', 'Inter', 'inter-latin-wght-normal.woff2', 'system-ui, sans-serif'],
  ['font-mono', 'JetBrains Mono', 'jetbrains-mono-latin-wght-normal.woff2', 'ui-monospace, monospace'],
];
const fontFaces = CHROME_FONTS.map(([, family, file]) => {
  const b64 = readFileSync(join(HERE, 'fonts', file)).toString('base64');
  return `@font-face {\n  font-family: "${family}"; font-style: normal; font-weight: 100 900; font-display: block;\n`
    + `  src: url(data:font/woff2;base64,${b64}) format("woff2");\n}`;
}).join('\n');
const fontVars = CHROME_FONTS.map(([n, family, , stack]) => `  --p3-${n}: "${family}", ${stack};`).join('\n');

// ── value formatting ───────────────────────────────────────────────────────────────────────────
const cssOf = (tree, [name, path, kind]) => {
  const { value, chain } = resolve(tree, P(path));
  switch (kind) {
    case C: case D: case N: case T: return { css: String(value), chain };
    case E: return { css: `cubic-bezier(${value.join(', ')})`, chain };
    default: throw new Error(`unknown kind ${kind} for ${name}`);
  }
};

// ── gate 3: no brand in the chrome ─────────────────────────────────────────────────────────────
const BRAND_RE = /(core\.palette\.(primary|accent))|\.brand\b|\.brand-|\.link\.|border\.focus/;
const errors = [];
for (const mode of Object.keys(MODES)) {
  for (const v of VARS) {
    if (v[2] !== C) continue;
    const { chain } = resolve(MODES[mode], P(v[1]));
    const bad = chain.find((p) => BRAND_RE.test(p));
    if (bad) errors.push(`chrome var --p3-${v[0]} (${mode}) resolves through brand token ${bad}`);
  }
}

// ── emit the generated block ───────────────────────────────────────────────────────────────────
const block = (mode) => VARS.map((v) => `  --p3-${v[0]}: ${cssOf(MODES[mode], v).css};`).join('\n');
const light = block('light'), dark = block('dark');
const rampVars = rampSteps.map((s) => `  --p3-sample-primary-${s}: ${resolve(MODES.light, P(`${RAMP}.${s}`)).value};`).join('\n');
const sampleRoles = [
  ['sample-text-brand', 'color.text.brand'], ['sample-bg-page', 'color.background.primary'],
  ['sample-text-2', 'color.text.secondary'], ['sample-bg-2', 'color.background.secondary'],
];
const sampleVars = sampleRoles.map(([n, p]) => `  --p3-${n}: ${resolve(MODES.light, P(p)).value};`).join('\n');
const harnessVars = HARNESS.map(([n, v]) => `  --p3-${n}: ${v};`).join('\n');

const generated = `/* GENERATED by build-tiles.mjs from packages/engine/out/prism3.tokens.json + prism3.dark.overlay.tokens.json.
   Do not edit; rerun the build. */
:root {
  /* Preview content (the brand being themed), never chrome. Light-mode values. */
${rampVars}
${sampleVars}
  /* Harness geometry. Not from tokens: the token set has no frame or side-panel width. */
${harnessVars}
  /* Chrome fonts. Not from tokens: a chrome constant, embedded below (see CHROME_FONTS). */
${fontVars}
}
${fontFaces}
:root, [data-theme="light"] {
  color-scheme: light;
${light}
}
[data-theme="dark"] {
  color-scheme: dark;
${dark}
}
@media (prefers-color-scheme: dark) {
  [data-theme="system"] {
    color-scheme: dark;
${dark.replace(/^/gm, '  ')}
  }
}`;

// ── read the source; gates 1 and 2 ─────────────────────────────────────────────────────────────
const SRC = join(HERE, 'tiles.src.html');
const src = readFileSync(SRC, 'utf8');
const tileCssMatch = src.match(/<style id="tile-css">([\s\S]*?)<\/style>/);
if (!tileCssMatch) throw new Error('tiles.src.html has no <style id="tile-css"> block');
const tileCss = tileCssMatch[1];
const RAW = [
  [/#[0-9a-f]{3,8}\b/gi, 'raw hex color'],
  [/\b(rgba?|hsla?|oklch|oklab|lab|lch|color)\(/gi, 'raw color function'],
  [/(?<![\w-])-?\d*\.?\d+(px|rem|em|pt|vh|vw|ch)\b/gi, 'raw length'],
  [/(?<![\w-])\d*\.?\d+(ms|s)\b/gi, 'raw duration'],
  // T5: no shadows anywhere. Elevation is carried by the background/foreground roles and hairlines.
  [/\b(box-shadow|text-shadow)\s*:|drop-shadow\(/gi, 'shadow (T5: no shadows)'],
];
const scan = (text, where) => {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [re, what] of RAW) for (const m of stripped.matchAll(re)) errors.push(`${where}: ${what} "${m[0]}"`);
};
scan(tileCss, 'tile CSS');
for (const m of src.matchAll(/\sstyle="([^"]*)"/g)) scan(m[1], 'inline style');
const defined = new Set([...VARS.map((v) => v[0]), ...HARNESS.map((h) => h[0]), ...CHROME_FONTS.map((f) => f[0]),
  ...rampSteps.map((s) => `sample-primary-${s}`), ...sampleRoles.map((r) => r[0])]);
for (const m of src.matchAll(/var\(--p3-([a-z0-9-]+)/g)) if (!defined.has(m[1])) errors.push(`undefined variable --p3-${m[1]}`);
// The map is the README's "tokens used" table, so every entry must be used.
for (const [n] of [...VARS, ...CHROME_FONTS, ...HARNESS]) if (!src.includes(`var(--p3-${n})`)) errors.push(`mapped but unused variable --p3-${n}`);

// ── contrast ───────────────────────────────────────────────────────────────────────────────────
const hexRgba = (h) => { const x = h.replace('#', ''); const n = (i) => parseInt(x.slice(i, i + 2), 16) / 255; return [n(0), n(2), n(4), x.length === 8 ? n(6) : 1]; };
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(hexRgba(a)), lum(hexRgba(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hexOf = (mode, v) => resolve(MODES[mode], P(VARS.find((x) => x[0] === v)[1])).value;

// Declared chrome pairs: [fg var, bg var, floor, what]. The rendered audit covers every element;
// this list is the design intent, checked before anything renders.
const PAIRS = [
  // text: the page (top bar, levers, preview, drawer) and the inset tint
  ['text', 'bg-page', 4.5, 'body text on page'],
  ['text', 'fill-1', 4.5, 'text on inset (tips, per mode, drawer cards)'],
  ['text-2', 'bg-page', 4.5, 'secondary text on page'],
  ['text-2', 'fill-1', 4.5, 'secondary text on inset (unselected segment, badge)'],
  ['inv-text', 'inv-bg', 4.5, 'primary action'], ['inv-text', 'inv-bg-2', 4.5, 'primary action hover'],
  ['bad-text', 'bg-page', 4.5, 'danger text on page'], ['bad-text', 'fill-1', 4.5, 'danger text on inset'],
  // control boundaries and indicators (WCAG 1.4.11)
  ['field-edge', 'bg-page', 3, 'field, chip, button edge on page'],
  ['field-edge', 'fill-1', 3, 'selected segment edge on track; button edge on inset'],
  ['field-edge-hover', 'bg-page', 3, 'edge on hover; slider thumb edge'],
  ['ctl-edge', 'bg-page', 3, 'selected chip edge; focus ring on page'],
  ['ctl-edge', 'fill-1', 3, 'focus ring on inset'],
  ['text', 'bg-page', 3, 'selected tab underline'],
  ['line-2', 'bg-page', 3, 'slider rail'], ['icon', 'bg-page', 3, 'slider fill'],
  ['inv-bg', 'bg-page', 3, 'switch on track'],
  ['icon-2', 'bg-page', 3, 'info glyph, chevrons, switch off knob'], ['icon-2', 'fill-1', 3, 'glyph on inset'],
  ['ok-icon', 'bg-page', 3, 'verdict dot'], ['ok-icon', 'fill-1', 3, 'badge check on inset'],
  ['bad-icon', 'bg-page', 3, 'failure dot'], ['bad-icon', 'fill-1', 3, 'error glyph on inset'],
  ['warn-icon', 'bg-page', 3, 'warning glyph'],
  ['text', 'fill-2', 3, 'progress fill on track'], ['icon', 'fill-2', 3, 'spinner arc on its track'],
];
const rows = PAIRS.map(([fg, bg, floor, what]) => {
  const r = { what, fg, bg, floor };
  for (const m of ['light', 'dark']) {
    r[m] = ratio(hexOf(m, fg), hexOf(m, bg));
    if (r[m] < floor) errors.push(`pair ${fg} on ${bg} (${what}) is ${r[m].toFixed(2)}:1 in ${m}, floor ${floor}:1`);
  }
  return r;
});

// Preview content numbers the tile prints (the role table). Computed, never typed.
const roleRatio = (fg, bg) => ratio(resolve(MODES.light, P(fg)).value, resolve(MODES.light, P(bg)).value);
const fmt = (r) => `${(Math.floor(r * 100) / 100).toFixed(2)}:1`;
const anchorStep = rampSteps.find((s) => MODES.light[NS].core.palette.primary[s].$extensions?.prism3?.anchor);
const rampHtml = rampSteps.map((s) => {
  const a = s === anchorStep;
  const hex = resolve(MODES.light, P(`${RAMP}.${s}`)).value;
  return `<li class="cell${a ? ' anchor' : ''}"><span class="sw" style="background:var(--p3-sample-primary-${s})" title="${s} ${hex}"></span>`
    + `<span class="step">${a ? '<span class="mark" aria-hidden="true"></span>' : ''}${s}${a ? '<span class="sr"> (anchor)</span>' : ''}</span></li>`;
}).join('');
const roleRows = [
  ['text.brand', 'background.primary', 'sample-text-brand', 'sample-bg-page', 4.5],
  ['text.secondary', 'background.secondary', 'sample-text-2', 'sample-bg-2', 4.5],
].map(([fg, bg, fv, bv, floor]) => {
  const r = roleRatio(`color.${fg}`, `color.${bg}`);
  return `<tr><th scope="row"><code>${fg}</code></th><td><code>${bg}</code></td>`
    + `<td><span class="aa" style="color:var(--p3-${fv});background:var(--p3-${bv})" data-content>Aa</span></td>`
    + `<td><span class="badge">${r >= floor ? '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>' : ''}`
    + `<span class="tabnum">${fmt(r)}</span><span class="sr">,</span> <span class="floor">${r >= floor ? 'clears' : 'below'} ${floor}:1</span></span></td></tr>`;
}).join('');

if (errors.length) {
  console.error(`build-tiles: ${errors.length} error(s)`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}

const html = src
  .replace('/*@GENERATED-TOKENS@*/', generated)
  .replace('<!--@RAMP@-->', rampHtml)
  .replaceAll('<!--@ANCHOR@-->', anchorStep)
  .replace('<!--@ROLE-ROWS@-->', roleRows);
writeFileSync(join(HERE, 'style-tiles.html'), html);

console.log(`build-tiles: ${VARS.length} token variables × 2 themes, ${rampSteps.length} ramp steps, anchor ${anchorStep}.`);
console.log(`tile CSS: 0 raw hex/px/ms values outside the generated block (${tileCss.split('\n').length} lines scanned).`);
console.log('chrome colors: 0 resolve through primary/accent palettes or brand/link/focus roles.');
console.log('\n| Pair | Floor | Light | Dark |\n|---|---|---|---|');
for (const r of rows) console.log(`| ${r.what} (\`${r.fg}\` on \`${r.bg}\`) | ${r.floor}:1 | ${fmt(r.light)} | ${fmt(r.dark)} |`);
console.log(`\nwrote ${join('docs/superpowers/ui-redesign/style-tiles', 'style-tiles.html')}`);

// `--tokens` prints the variable map with each mode's resolved value (the README's token table).
if (process.argv.includes('--tokens')) {
  console.log('\n| Variable | Token (below `pds3.`) | Light | Dark |\n|---|---|---|---|');
  for (const v of VARS) {
    const l = cssOf(MODES.light, v).css, d = cssOf(MODES.dark, v).css;
    const cell = (x) => (x.length > 28 ? x.slice(0, 26) + '…' : x);
    console.log(`| \`--p3-${v[0]}\` | \`${v[1]}\` | \`${cell(l)}\` | ${l === d ? 'same' : `\`${cell(d)}\``} |`);
  }
}
