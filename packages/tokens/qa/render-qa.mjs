/**
 * VISUAL QA: THE shadcn/ui AND TAILWIND v4 THEMES ON REAL COMPONENTS (#4382, from #2997).
 *
 *   npm run -w @prism3/tokens qa:render            # build every page, assert, write screenshots + report
 *   npm run -w @prism3/tokens qa:render -- --brand prism3 --surface shadcn
 *
 * A MEASUREMENT HARNESS, NOT A CI GATE (tools/CLAUDE.md's split): nothing in ci.yml runs it. It exits 1 when a measured
 * value differs from its oracle, and 0 otherwise. Contrast and fallback observations are reported, never failed: they
 * are for a person to read.
 *
 * WHAT IT BUILDS, per hosted brand (the house brand and the engine's two made-up example brands, #4373), in light and dark:
 *   shadcn    `shadcn-components.html`, stock new-york-v4 markup and classes, under the stock `globals.css` skeleton
 *             with the brand's `out/shadcn/<brand>.registry-item.json` merged in the way `shadcn add` merges it:
 *             `cssVars.theme` into `@theme inline` (overriding the skeleton's derived radii), `cssVars.light` into
 *             `:root`, `cssVars.dark` into `.dark`, and the item's `css` appended.
 *   tailwind  `tailwind-utilities.html`, plain utilities, under `@import "tailwindcss"` plus the brand's
 *             `out/tailwind/<brand>.theme.css`, as that file's header says to import it.
 * Each is compiled by the stock Tailwind CLI this package already pins (`@tailwindcss/cli`), with no plugin and no
 * config. Dark is `class="dark"` on <html>, the switch both files use. Output goes to `qa/out/` (git-ignored):
 * `out/<brand>/*.html` and `.css`, `out/screens/<surface>-<brand>-<mode>.png` at deviceScaleFactor 1, and
 * `out/report.md`.
 *
 * WHY THE ORACLE IS INDEPENDENT OF THE SUBJECT (docs/34). The subject is the generated CSS as a browser renders it. The
 * oracle is the DTCG handoff, `out/<brand>.base.tokens.json` plus `out/<brand>.dark.overlay.tokens.json`, read here
 * with this file's own overlay merge, alias walk and color parser. Nothing is read from `emit-shadcn.ts`,
 * `emit-tailwind.ts`, `projections/*` or the generated CSS. Which role each component property should wear is typed
 * below in `SHADCN_EXPECT` and `TAILWIND_EXPECT`, from the owner's decisions on #2997 (Q2997.1–16) and shadcn's own
 * class strings, never from the role map. So a remapped row, a wrong value in the projector or a theme key the stock
 * classes never reach each fails here by name.
 *
 * MUTATIONS THIS FAILS BY NAME: `--primary` in a registry item's `cssVars.light` changed → `shadcn <brand> light
 * button-default background-color`; `radius-xl` dropped from `cssVars.theme`, so the skeleton's derived
 * `calc(var(--radius) + 4px)` wins → `shadcn prism3 light card border-top-left-radius: renders 10px, want 8px`. (Dropping
 * `radius-md` passes for prism3, and rightly: its derived 6 − 2 = 4px is the handoff's `radius.md`.)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const engineOut = join(repo, 'packages/engine/out');
const OUT = join(here, 'out');
const require = createRequire(import.meta.url);

// The hosted brands (owner decision on #4373): the house brand and the engine's made-up example brands only.
const BRANDS = ['prism3', 'aurora', 'harbor'];
const MODES = ['light', 'dark'];
const SURFACES = ['shadcn', 'tailwind'];

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const brands = arg('brand') ? [arg('brand')] : BRANDS;
const surfaces = arg('surface') ? [arg('surface')] : SURFACES;

// ── THE ORACLE: the DTCG handoff, this file's own reader ────────────────────────────────────────────────────────────
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => {
  const o = { ...a };
  for (const [k, v] of Object.entries(b)) o[k] = isObj(v) && isObj(o[k]) && !('$value' in v) ? merge(o[k], v) : v;
  return o;
};
const handoff = {};
const tree = (brand, mode) => {
  const key = `${brand}:${mode}`;
  if (handoff[key]) return handoff[key];
  const base = JSON.parse(readFileSync(join(engineOut, `${brand}.base.tokens.json`), 'utf8'));
  const t = mode === 'dark' ? merge(base, JSON.parse(readFileSync(join(engineOut, `${brand}.dark.overlay.tokens.json`), 'utf8'))) : base;
  const roots = Object.keys(t).filter((k) => !k.startsWith('$'));
  if (roots.length !== 1) throw new Error(`${brand}: expected one root in the handoff, found ${roots.join(', ')}`);
  return (handoff[key] = { root: roots[0], t });
};
/** A role's resolved `$value` (aliases followed), below the brand root. */
const role = (brand, mode, path) => {
  const { root, t } = tree(brand, mode);
  const walk = (p, seen = []) => {
    if (seen.includes(p)) throw new Error(`${brand} ${mode}: alias cycle at ${p}`);
    const node = p.split('.').reduce((a, k) => (a ? a[k] : undefined), t);
    if (!node || !('$value' in node)) throw new Error(`${brand} ${mode}: ${p} does not resolve`);
    const v = node.$value;
    return typeof v === 'string' && /^\{[^}]+\}$/.test(v) ? walk(v.slice(1, -1), [...seen, p]) : v;
  };
  return walk(`${root}.${path}`);
};
/** A DTCG color string as 8-bit sRGB plus alpha. Only the formats the handoff emits; anything else throws by name. */
const parseColor = (s) => {
  let m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(s);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : m[5] ? +m[4] / 100 : +m[4] };
  throw new Error(`unparsed handoff color ${s}`);
};
const px = (v) => { const m = /^(-?[\d.]+)px$/.exec(String(v)); if (!m) throw new Error(`not a px dimension: ${v}`); return +m[1]; };
const hex = ({ r, g, b, a }) => `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}${a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : ''}`;

// ── WHAT EACH PROPERTY SHOULD WEAR (typed from #2997's decisions and shadcn's class strings, never the role map) ───
// [data-qa, CSS property, expectation]. An expectation is a role (both modes), or { light, dark } (null skips a mode:
// shadcn's own dark: classes put a translucent value there, measured by the contrast pass instead).
// Kinds: color roles are bare paths; { radius: role }; { px: n } for a stock literal; { font: role }.
const BG = 'background-color', FG = 'color', BORDER = 'border-top-color', RADIUS = 'border-top-left-radius';
const PRIMARY = 'color.interactive.primary.fill.rest', ON_PRIMARY = 'color.interactive.primary.on-fill';
const PAGE = 'color.background.primary', TEXT = 'color.text.primary', TEXT2 = 'color.text.secondary';
const EDGE = 'color.border.primary', FIELD = 'color.field.border.rest';
const SHADCN_EXPECT = [
  ['body', BG, PAGE], ['body', FG, TEXT], ['body', 'font-family', { font: 'core.font.family.body' }],
  ['button-default', BG, PRIMARY], ['button-default', FG, ON_PRIMARY], ['button-default', RADIUS, { radius: 'radius.md' }],
  ['button-destructive', BG, { light: 'color.interactive.destructive.fill.rest', dark: null }],
  ['button-outline', BG, { light: PAGE, dark: null }], ['button-outline', BORDER, { light: EDGE, dark: FIELD }], ['button-outline', FG, TEXT],
  ['button-secondary', BG, 'color.interactive.neutral.fill.rest'], ['button-secondary', FG, 'color.interactive.neutral.on-fill'],
  ['button-ghost', FG, TEXT], ['button-link', FG, PRIMARY],
  ['button-sm', RADIUS, { radius: 'radius.md' }], ['button-lg', RADIUS, { radius: 'radius.md' }],
  ['input', BORDER, FIELD], ['input', FG, TEXT], ['input', RADIUS, { radius: 'radius.md' }],
  ['input-invalid', BORDER, 'color.interactive.destructive.fill.rest'], ['label', FG, TEXT],
  ['card', BG, PAGE], ['card', BORDER, EDGE], ['card', FG, TEXT], ['card', RADIUS, { radius: 'radius.xl' }],
  ['card-description', FG, TEXT2],
  ['dialog', BG, PAGE], ['dialog', BORDER, EDGE], ['dialog', RADIUS, { radius: 'radius.lg' }],
  ['dialog-title', FG, TEXT], ['dialog-description', FG, TEXT2],
  ['select-trigger', BORDER, FIELD], ['select-trigger', RADIUS, { radius: 'radius.md' }], ['select-trigger', FG, TEXT2],
  ['select-content', BG, 'color.foreground.primary'], ['select-content', FG, TEXT], ['select-content', BORDER, EDGE],
  ['select-content', RADIUS, { radius: 'radius.md' }], ['select-item', RADIUS, { radius: 'radius.sm' }], ['select-label', FG, TEXT2],
  ['tabs-list', BG, 'color.background.secondary'], ['tabs-list', RADIUS, { radius: 'radius.lg' }],
  ['tabs-active', BG, { light: PAGE, dark: null }], ['tabs-active', FG, TEXT], ['tabs-active', RADIUS, { radius: 'radius.md' }],
  ['badge-default', BG, PRIMARY], ['badge-default', FG, ON_PRIMARY], ['badge-default', RADIUS, { px: 'full' }],
  ['badge-secondary', BG, 'color.interactive.neutral.fill.rest'], ['badge-outline', BORDER, EDGE], ['badge-outline', FG, TEXT],
  ['alert-default', BG, PAGE], ['alert-default', BORDER, EDGE], ['alert-default', RADIUS, { radius: 'radius.lg' }],
  ['alert-default-description', FG, TEXT2],
  ['alert-destructive', FG, 'color.interactive.destructive.fill.rest'],
  ['table-head', FG, TEXT], ['table-row', BORDER, { border: 'bottom', role: EDGE }], ['table-row-selected', BG, 'color.background.secondary'],
  ['table-caption', FG, TEXT2],
  ['checkbox-unchecked', BORDER, FIELD], ['checkbox-checked', BG, PRIMARY], ['checkbox-checked', BORDER, PRIMARY],
  ['checkbox-checked', FG, ON_PRIMARY], ['checkbox-checked', RADIUS, { px: 4 }],
  ['switch-checked', BG, PRIMARY], ['switch-unchecked', BG, { light: FIELD, dark: null }],
  ['switch-unchecked-thumb', BG, { light: PAGE, dark: TEXT }], ['switch-checked-thumb', BG, { light: PAGE, dark: ON_PRIMARY }],
];
const TAILWIND_EXPECT = [
  ['body', BG, PAGE], ['body', FG, TEXT],
  ['tw-bg-primary', BG, PRIMARY], ['tw-bg-primary', FG, ON_PRIMARY],
  ['tw-bg-secondary', BG, 'color.interactive.neutral.fill.rest'], ['tw-bg-muted', BG, 'color.background.secondary'],
  ['tw-bg-muted', FG, TEXT2], ['tw-bg-accent', BG, 'color.interactive.neutral.fill.hover'],
  ['tw-bg-destructive', BG, 'color.interactive.destructive.fill.rest'], ['tw-bg-destructive', FG, 'color.interactive.destructive.on-fill'],
  ['tw-bg-card', BG, PAGE], ['tw-bg-card', BORDER, EDGE], ['tw-bg-popover', BG, 'color.foreground.primary'],
  ['tw-border-input', BORDER, FIELD], ['tw-outline-ring', 'outline-color', 'color.border.focus'],
  ['tw-chart-1', BG, 'color.foreground.brand'], ['tw-chart-2', BG, 'color.foreground.info'], ['tw-chart-3', BG, 'color.foreground.success'],
  ['tw-chart-4', BG, 'color.foreground.warning'], ['tw-chart-5', BG, 'color.foreground.danger'],
  ...['sm', 'md', 'lg', 'xl', '2xl', '3xl'].map((k) => [`tw-rounded-${k}`, RADIUS, { radius: `radius.${k}` }]),
  ...['xs', 'sm', 'md', 'lg', 'xl', '2xl'].map((k) => [`tw-shadow-${k}`, 'box-shadow', { shadow: `shadow.${k}` }]),
  ['tw-font-sans', 'font-family', { font: 'core.font.family.body' }], ['tw-font-mono', 'font-family', { font: 'core.font.family.code' }],
  ['tw-p-4', 'padding-top', { spacing: 'space.050', times: 4 }],
];

// ── BUILD ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// The stock `globals.css` skeleton `shadcn init` writes for Tailwind v4 (new-york-v4): the dark variant, the derived
// radius scale and every color alias. The registry item's `cssVars.theme` then replaces the keys it names.
const SKELETON_THEME = {
  'radius-sm': 'calc(var(--radius) - 4px)', 'radius-md': 'calc(var(--radius) - 2px)', 'radius-lg': 'var(--radius)',
  'radius-xl': 'calc(var(--radius) + 4px)', 'radius-2xl': 'calc(var(--radius) + 8px)', 'radius-3xl': 'calc(var(--radius) + 12px)',
  'radius-4xl': 'calc(var(--radius) + 16px)',
  ...Object.fromEntries(['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary',
    'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground',
    'destructive', 'border', 'input', 'ring', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'sidebar',
    'sidebar-foreground', 'sidebar-primary', 'sidebar-primary-foreground', 'sidebar-accent', 'sidebar-accent-foreground',
    'sidebar-border', 'sidebar-ring'].map((k) => [`color-${k}`, `var(--${k})`])),
};
const block = (sel, vars) => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join('\n')}\n}\n`;
/** A registry item's `css` object as CSS text (nested rules, `@apply` keys with empty bodies). */
const cssText = (o, ind = '') => Object.entries(o).map(([k, v]) => (isObj(v) && Object.keys(v).length
  ? `${ind}${k} {\n${cssText(v, `${ind}  `)}${ind}}\n` : `${ind}${k};\n`)).join('');
const shadcnInput = (brand, fragment) => {
  const item = JSON.parse(readFileSync(join(engineOut, 'shadcn', `${brand}.registry-item.json`), 'utf8'));
  return [
    '@import "tailwindcss";',
    `@source "${fragment}";`,
    '@custom-variant dark (&:is(.dark *));\n',
    block('@theme inline', { ...SKELETON_THEME, ...item.cssVars.theme }),
    block(':root', item.cssVars.light), block('.dark', item.cssVars.dark),
    '@layer base {\n  * {\n    @apply border-border outline-ring/50;\n  }\n  body {\n    @apply bg-background text-foreground;\n  }\n}\n',
    `/* the registry item's css */\n${cssText(item.css ?? {})}`,
  ].join('\n');
};
const tailwindInput = (brand, fragment) => [
  '@import "tailwindcss";',
  `@import "${join(engineOut, 'tailwind', `${brand}.theme.css`)}";`,
  `@source "${fragment}";\n`,
  '/* the harness page, not the theme: a body that wears the page colors, so dark is visible */',
  '@layer base {\n  body {\n    @apply bg-background text-foreground;\n  }\n}\n',
].join('\n');
const page = (title, css, mode, body) => `<!doctype html>\n<html lang="en"${mode === 'dark' ? ' class="dark"' : ''}>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n<link rel="stylesheet" href="${css}">\n</head>\n<body>\n${body}</body>\n</html>\n`;

const cli = join(dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
const FRAGMENT = { shadcn: join(here, 'shadcn-components.html'), tailwind: join(here, 'tailwind-utilities.html') };
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'screens'), { recursive: true });
const pages = [];
for (const brand of brands) {
  const dir = join(OUT, brand);
  mkdirSync(dir, { recursive: true });
  for (const surface of surfaces) {
    const input = join(dir, `${surface}.input.css`);
    writeFileSync(input, surface === 'shadcn' ? shadcnInput(brand, FRAGMENT[surface]) : tailwindInput(brand, FRAGMENT[surface]));
    const run = spawnSync(process.execPath, [cli, '-i', input, '-o', join(dir, `${surface}.css`)], { cwd: here, encoding: 'utf8' });
    if (run.status !== 0) { console.error(`✗ tailwind CLI failed for ${brand} ${surface}:\n${run.stderr}`); process.exit(1); }
    const body = readFileSync(FRAGMENT[surface], 'utf8');
    for (const mode of MODES) {
      const file = join(dir, `${surface}-${mode}.html`);
      writeFileSync(file, page(`${brand} · ${surface} · ${mode}`, `${surface}.css`, mode, body));
      pages.push({ brand, surface, mode, file });
    }
  }
}

// ── MEASURE ────────────────────────────────────────────────────────────────────────────────────────────────────────
const { chromium } = require('playwright');
const browser = await chromium.launch();
const failures = [];
const notes = [];
let checks = 0;
const report = [];
const fonts = new Set();

/** Runs in the page and returns raw computed CSS only; every color is parsed in Node by `cssColor` below. */
const probe = (args) => {
  const el = (qa) => (qa === 'body' ? document.body : document.querySelector(`[data-qa="${qa}"]`));
  const out = { values: {}, text: [], fonts: {}, missing: [] };
  for (const [qa, prop] of args.reads) {
    const e = el(qa);
    if (!e) out.missing.push(qa);
    else out.values[`${qa}|${prop}`] = getComputedStyle(e).getPropertyValue(prop);
  }
  // Every element on the page that carries its own visible text (the harness's section headings aside): its text color,
  // size, weight and opacity, and the background chain behind it. Named by the nearest data-qa, else its data-slot.
  for (const e of document.querySelectorAll('main *')) {
    if (e.tagName === 'H2' && !e.dataset.slot) continue;
    if (e.closest('.sr-only') || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (e.closest('[disabled], [data-disabled]')) continue; // disabled controls are exempt (SC 1.4.3)
    const s = getComputedStyle(e);
    const chain = [];
    let opacity = 1;
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const ns = getComputedStyle(n); chain.push(ns.backgroundColor); opacity *= +ns.opacity; }
    const owner = e.closest('[data-qa]')?.dataset.qa ?? e.closest('[data-slot]')?.dataset.slot ?? e.tagName.toLowerCase();
    const text = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').slice(0, 24);
    out.text.push({ qa: `${owner} "${text}"`, color: s.color, size: parseFloat(s.fontSize), weight: +s.fontWeight, opacity, chain });
  }
  // Is each family a real face here, or a fallback? Width against two generics: equal to both means fallback.
  const ctx = document.createElement('canvas').getContext('2d');
  for (const fam of args.families) {
    const w = (f) => { ctx.font = `48px ${f}`; return ctx.measureText('mmmmmmmmmlli1WQ@#').width; };
    out.fonts[fam] = w(`"${fam}", monospace`) !== w('monospace') || w(`"${fam}", serif`) !== w('serif');
  }
  out.webfonts = document.fonts.size;
  return out;
};
const focusProbe = () => {
  const e = document.activeElement;
  const s = getComputedStyle(e);
  return { qa: e?.dataset?.qa ?? e?.tagName, boxShadow: s.boxShadow, outlineStyle: s.outlineStyle, outlineColor: s.outlineColor, outlineWidth: s.outlineWidth, page: getComputedStyle(document.body).backgroundColor };
};

// ── CSS COLOR, PARSED HERE (the computed forms Chromium serializes: rgb[a], oklch, oklab, color(srgb), transparent) ──
const srgbOut = (lin) => { const c = Math.min(1, Math.max(0, lin)); return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055); };
const fromOklab = (L, a, b) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return { r: srgbOut(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), g: srgbOut(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), b: srgbOut(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) };
};
const num = (t, pct = 1) => (t.endsWith('%') ? (parseFloat(t) / 100) * pct : parseFloat(t));
const cssColor = (css) => {
  const s = css.trim();
  if (s === 'transparent' || s === '') return { r: 0, g: 0, b: 0, a: 0 };
  const m = /^(rgba?|oklch|oklab|color)\((.*)\)$/.exec(s);
  if (!m) throw new Error(`unparsed computed color ${css}`);
  const [body, alpha] = m[2].split('/').map((x) => x.trim());
  const t = body.replace(/,/g, ' ').trim().split(/\s+/);
  let a = alpha !== undefined ? num(alpha) : 1;
  if (m[1].startsWith('rgb')) { if (t.length === 4) a = num(t.pop()); return { r: num(t[0], 255), g: num(t[1], 255), b: num(t[2], 255), a }; }
  if (m[1] === 'oklch') { const [L, C, H] = [num(t[0]), num(t[1], 0.4), t[2] === 'none' ? 0 : parseFloat(t[2])]; return { ...fromOklab(L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)), a }; }
  if (m[1] === 'oklab') return { ...fromOklab(num(t[0]), num(t[1], 0.4), num(t[2], 0.4)), a };
  if (t[0] === 'srgb') return { r: num(t[1], 1) * 255, g: num(t[2], 1) * 255, b: num(t[3], 1) * 255, a };
  throw new Error(`unparsed computed color ${css}`);
};
/** A box-shadow list as layers: color, the four lengths, inset. */
const shadowLayers = (v) => {
  if (!v || v === 'none') return [];
  const layers = []; let depth = 0, cur = '';
  for (const ch of v) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { layers.push(cur.trim()); cur = ''; } else cur += ch; }
  layers.push(cur.trim());
  return layers.map((l) => {
    const color = /(?:rgba?|oklch|oklab|color)\([^)]*\)|#[0-9a-f]+|transparent/i.exec(l)?.[0] ?? 'transparent';
    const lengths = l.replace(color, '').trim().split(/\s+/).filter((x) => /px$/.test(x)).map(parseFloat);
    return { color: cssColor(color), lengths, inset: /\binset\b/.test(l) };
  });
};
const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (x, y) => { const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p); return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };

const same = (got, want, tol = 1) => ['r', 'g', 'b'].every((c) => Math.abs(got[c] - want[c]) <= tol) && Math.abs(got.a - want.a) <= 0.01;
const familyOf = (v) => String(Array.isArray(v) ? v[0] : v).replace(/^["']|["']$/g, '');

for (const { brand, surface, mode, file } of pages) {
  const expect = surface === 'shadcn' ? SHADCN_EXPECT : TAILWIND_EXPECT;
  const reads = expect.map(([qa, prop, e]) => [qa, isObj(e) && e.border ? `border-${e.border}-color` : prop]);
  const families = [...new Set(expect.filter(([, , e]) => isObj(e) && e.font).map(([, , e]) => familyOf(role(brand, mode, e.font))))];
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto(pathToFileURL(file).href);
  await pg.evaluate(() => document.fonts.ready);
  const got = await pg.evaluate(probe, { reads, families });
  const label = `${surface} ${brand} ${mode}`;
  for (const qa of got.missing) failures.push(`${label} ${qa}: element not on the page`);

  for (const [qa, prop0, e] of expect) {
    const prop = isObj(e) && e.border ? `border-${e.border}-color` : prop0;
    const want0 = isObj(e) && 'light' in e ? e[mode] : isObj(e) && e.border ? e.role : e;
    if (want0 === null) continue;
    const raw = got.values[`${qa}|${prop}`];
    if (raw === undefined) continue;
    const v = { css: raw, ...(/color$/.test(prop) ? cssColor(raw) : {}), layers: prop === 'box-shadow' ? shadowLayers(raw) : undefined };
    checks++;
    const name = `${label} ${qa} ${prop0}`;
    if (typeof want0 === 'string') {
      const want = parseColor(role(brand, mode, want0));
      if (!same(v, want)) failures.push(`${name}: renders ${hex(v)} (${v.css}), the handoff's ${want0} is ${hex(want)}`);
    } else if (want0.radius || want0.px !== undefined) {
      const want = want0.radius ? px(role(brand, mode, want0.radius)) : want0.px;
      const ok = want === 'full' ? parseFloat(v.css) >= 9999 : Math.abs(parseFloat(v.css) - want) < 0.01;
      if (!ok) failures.push(`${name}: renders ${v.css}, want ${want === 'full' ? 'a pill (≥ 9999px)' : `${want}px`}${want0.radius ? ` (${want0.radius})` : ''}`);
    } else if (want0.font) {
      const fam = familyOf(role(brand, mode, want0.font));
      const first = v.css.split(',')[0].trim().replace(/^["']|["']$/g, '');
      if (first !== fam) failures.push(`${name}: renders "${v.css}", the handoff's ${want0.font} is ${fam}`);
      if (!got.fonts[fam]) notes.push(`${label}: ${fam} is not available to the page, so ${qa} renders in the fallback face`);
      fonts.add(`- ${brand}: ${fam} — ${got.webfonts ? `${got.webfonts} @font-face on the page` : 'no @font-face ships with the theme'}; ${got.fonts[fam] ? 'installed on this machine, so it renders here' : 'not installed here, so the fallback renders'}`);
    } else if (want0.spacing) {
      const want = px(role(brand, mode, want0.spacing)) * want0.times;
      if (Math.abs(parseFloat(v.css) - want) > 0.01) failures.push(`${name}: renders ${v.css}, want ${want}px (${want0.times} × ${want0.spacing})`);
    } else if (want0.shadow) {
      const raw = role(brand, mode, want0.shadow);
      const wantLayers = (Array.isArray(raw) ? raw : [raw]).map((l) => ({
        color: parseColor(/^\{/.test(l.color) ? role(brand, mode, l.color.slice(tree(brand, mode).root.length + 2, -1)) : l.color),
        lengths: [l.offsetX, l.offsetY, l.blur, l.spread].map(px),
      }));
      const gotLayers = (v.layers ?? []).filter((l) => l.color.a > 0);
      const ok = gotLayers.length === wantLayers.length && wantLayers.every((w, i) => same(gotLayers[i].color, w.color, 2)
        && w.lengths.every((n, j) => Math.abs((gotLayers[i].lengths[j] ?? 0) - n) < 0.01));
      if (!ok) failures.push(`${name}: renders ${JSON.stringify(gotLayers.map((l) => [hex(l.color), ...l.lengths]))}, the handoff's ${want0.shadow} is ${JSON.stringify(wantLayers.map((l) => [hex(l.color), ...l.lengths]))}`);
    }
  }
  // Text as rendered: the text color composited over the backgrounds actually behind it (white canvas under all).
  for (const t of got.text) {
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (const c of t.chain.map(cssColor).reverse()) if (c.a > 0) bg = over(c, bg);
    const ink = cssColor(t.color); const fg = over({ ...ink, a: ink.a * t.opacity }, bg);
    const r = ratio(fg, bg), floor = t.size >= 24 || (t.weight >= 700 && t.size >= 18.66) ? 3 : 4.5;
    if (r < floor) notes.push(`${label}: ${t.qa} text is ${r}:1 (${hex(fg)} on ${hex(bg)}), under ${floor}:1`);
  }

  // Keyboard focus on the first control (shadcn: the default Button), as a person tabbing in sees it.
  if (surface === 'shadcn') {
    await pg.keyboard.press('Tab');
    await pg.waitForTimeout(400); // the stock button's `transition-all` animates the ring in; read the settled state
    const f = await pg.evaluate(focusProbe);
    const ring = f.boxShadow && f.boxShadow !== 'none' ? f.boxShadow : null;
    checks++;
    if (f.qa !== 'button-default') failures.push(`${label} focus: Tab lands on ${f.qa}, not button-default`);
    else if (!ring && f.outlineStyle === 'none') failures.push(`${label} focus: button-default shows no focus ring (box-shadow none, outline none)`);
    else {
      // The ring: the box-shadow layer with no offset or blur and a spread, composited over the page, against the page.
      // SC 1.4.11 asks 3:1 of a focus indicator.
      const page = cssColor(f.page);
      const layer = shadowLayers(f.boxShadow).find((l) => l.color.a > 0 && !l.inset
        && l.lengths[0] === 0 && l.lengths[1] === 0 && (l.lengths[2] ?? 0) === 0 && (l.lengths[3] ?? 0) > 0);
      if (layer) {
        const c = layer.color;
        const shown = { r: c.r * c.a + page.r * (1 - c.a), g: c.g * c.a + page.g * (1 - c.a), b: c.b * c.a + page.b * (1 - c.a) };
        const r = ratio(shown, page);
        const focusRole = parseColor(role(brand, mode, 'color.border.focus'));
        if (r < 3) notes.push(`${label}: the focus ring on button-default is ${r}:1 against the page (${hex(c)} at ${Math.round(c.a * 100)}%, ${layer.lengths[3]}px), under 3:1`);
        report.push(`- ${label}: ring ${hex(c)} at ${Math.round(c.a * 100)}% alpha, ${layer.lengths[3]}px, ${r}:1 on the page (the handoff's color.border.focus is ${hex(focusRole)} at full strength)`);
      } else report.push(`- ${label}: no ring layer; outline ${f.outlineStyle} ${f.outlineWidth} ${f.outlineColor}`);
    }
    await pg.screenshot({ path: join(OUT, 'screens', `${surface}-${brand}-${mode}-focus.png`), clip: { x: 0, y: 0, width: 1200, height: 160 } });
    await pg.evaluate(() => document.activeElement?.blur());
    await pg.waitForTimeout(400); // let the ring transition out before the full-page shot
  }
  await pg.screenshot({ path: join(OUT, 'screens', `${surface}-${brand}-${mode}.png`), fullPage: true });
  await ctx.close();
}
await browser.close();

const md = [
  '# shadcn/ui and Tailwind theme render QA (#4382)', '',
  `Pages: ${pages.length} (${brands.join(', ')} × ${surfaces.join(', ')} × light, dark). Property checks: ${checks}.`, '',
  `## Mismatches against the DTCG handoff (${failures.length})`, '', ...(failures.length ? failures.map((f) => `- ${f}`) : ['- none']), '',
  `## Observations (${notes.length})`, '', ...(notes.length ? notes.map((n) => `- ${n}`) : ['- none']), '',
  '## Focus rings', '', ...report, '',
  '## Fonts', '', ...fonts, '',
];
writeFileSync(join(OUT, 'report.md'), md.join('\n'));
console.log(md.join('\n'));
console.log(`screenshots → ${join(OUT, 'screens')}`);
process.exit(failures.length ? 1 : 0);
