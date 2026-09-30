#!/usr/bin/env node
// Builds concept-v5.html from concept-v5.src.html, the default theme's tokens and the real engine.
//
//   node docs/superpowers/ui-redesign/build-v5.mjs            # writes concept-v5.html
//   node docs/superpowers/ui-redesign/build-v5.mjs --tokens   # also prints the token table
//
// It FAILS (exit 1), naming what failed, when:
//   1. COVERAGE (oracle: packages/engine/schema/lever-manifest.json, never the mockup's own list). A
//      manifest lever has no home, or more than one, or a home names a key the manifest lacks, or a
//      lever's advanced tier disagrees with the manifest flag (Layout excepted, Q4). Carried from v4.
//   2. HOME VIEWS (F1). A lever section declares no home view, declares more than one, or names a view
//      that is not in the view select (an Inspect view is not a home). The preview follows the section,
//      so a section with no home would leave the preview on whatever it showed before.
//   3. CHROME CSS (F3, T1-T6). `<style id="chrome-css">`, or any inline `style=""` in the source (after
//      runtime `${…}` values are taken out), carries a raw hex, color function, length or duration, or
//      any shadow; or an SVG in the source paints with a raw hex. Every chrome value comes through a
//      --p3-* variable generated below from the default theme's tokens.
//   4. PREVIEW CSS. A selector in `<style id="preview-css">` does not start with [data-content]. That
//      block draws the brand being themed and is exempt from 3 (as the tiles' --p3-sample-* was); the
//      scope rule keeps the exemption from reaching the chrome.
//   5. VARIABLES. The source uses a --p3-* variable the generated block does not define, or the map
//      defines one the source never uses.
//   6. BRAND. A chrome color resolves through the brand palette or a brand, link or focus role.
//   7. PAIRS. A declared chrome pair (PAIRS below) measures under its floor in either theme.
//   8. OFFLINE. The output would make a network request. The only @font-face allowed is a data: URI.
//
// The resolver, the tile's variable map, the fonts and the scans come from ./chrome-tokens.mjs, shared
// with style-tiles/build-tiles.mjs. The rendered audit (text, edges, focus, targets, fonts, shadows,
// F1 and F2 behavior, measured in Chromium) is audit-v5.mjs.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  loadModes, resolve, P, C, D, TILE_VARS, CHROME_FONTS, fontFaceCss, fontVarsCss, cssOf, themeBlock,
  brandLeaks, scanRaw, ratio, fmtRatio,
} from './chrome-tokens.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const engine = join(repo, 'packages', 'engine');
const errors = [];
const fail = (msg) => { console.error(`build-v5: FAIL: ${msg}`); process.exit(1); };
const src = readFileSync(join(here, 'concept-v5.src.html'), 'utf8');

// ---- 1. coverage (from v4) ---------------------------------------------------------------
const manifest = JSON.parse(readFileSync(join(engine, 'schema', 'lever-manifest.json'), 'utf8'));
const manifestKeys = manifest.levers.map((l) => l.key);
const m = src.match(/<script type="application\/json" id="p3-homes">([\s\S]*?)<\/script>/);
if (!m) fail('no HOMES block (<script type="application/json" id="p3-homes">) in concept-v5.src.html');
const homes = JSON.parse(m[1]);
const seen = new Map();
const perDomain = {};
const schemaOnly = [];
for (const d of homes.domains) {
  perDomain[d.label] = { levers: 0, advanced: 0 };
  for (const s of d.sections) for (const row of s.rows) {
    for (const k of row.keys ?? []) {
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(`${d.label} › ${s.title}`);
      if (manifestKeys.includes(k)) { perDomain[d.label].levers++; if (s.advanced) perDomain[d.label].advanced++; }
    }
    for (const k of row.schemaOnly ?? []) schemaOnly.push(`${k} (${d.label} › ${s.title})`);
  }
}
const missing = manifestKeys.filter((k) => !seen.has(k));
const dup = [...seen].filter(([, where]) => where.length > 1);
const unknown = [...seen.keys()].filter((k) => !manifestKeys.includes(k));
const tierWrong = [];
for (const d of homes.domains) for (const s of d.sections) for (const row of s.rows) for (const k of row.keys ?? []) {
  const lev = manifest.levers.find((l) => l.key === k);
  if (!lev) continue;
  const wantAdv = d.id === 'layout' ? false : !!lev.advanced;
  if (!!s.advanced !== wantAdv) tierWrong.push(`${k}: manifest advanced=${!!lev.advanced}, placed ${s.advanced ? 'advanced' : 'everyday'} in ${d.label} › ${s.title}`);
}
console.log('Coverage (oracle: packages/engine/schema/lever-manifest.json)');
console.log(`  manifest levers: ${manifestKeys.length} (${manifest.levers.filter((l) => l.advanced).length} flagged advanced)`);
for (const [dl, c] of Object.entries(perDomain)) console.log(`  ${dl.padEnd(16)} ${String(c.levers).padStart(2)} levers  (${c.advanced} behind "Show advanced")`);
console.log(`  total placed: ${[...seen.keys()].filter((k) => manifestKeys.includes(k)).length}  missing: ${missing.length}  duplicated: ${dup.length}  unknown: ${unknown.length}  tier mismatches: ${tierWrong.length}`);
console.log(`  schema-only inputs also placed (not manifest levers): ${schemaOnly.map((x) => x.split(' ')[0]).join(', ')}`);
if (missing.length) errors.push(`manifest keys with no home: ${missing.join(', ')}`);
if (dup.length) errors.push(`manifest keys with more than one home: ${dup.map(([k, w]) => `${k} → ${w.join(' + ')}`).join('; ')}`);
if (unknown.length) errors.push(`homes naming keys the manifest does not have: ${unknown.join(', ')}`);
if (tierWrong.length) errors.push(`advanced tier disagrees with the manifest flag:\n    ${tierWrong.join('\n    ')}`);

// ---- 2. home views (F1) ------------------------------------------------------------------
if (!Array.isArray(homes.views) || !homes.views.length) errors.push('HOMES has no `views` list: the sections have nothing to call home');
if (!Array.isArray(homes.inspect)) errors.push('HOMES has no `inspect` list');
const viewIds = new Set((homes.views || []).map(([id]) => id));
const inspectIds = new Set((homes.inspect || []).map(([id]) => id));
const homeCount = new Map([...viewIds].map((v) => [v, []]));
// The raw text too: JSON.parse keeps the last of two "home" keys silently, so "exactly one" is checked
// in the source as well as in the parsed data.
const rawSections = [...m[1].matchAll(/\{"title":"([^"]+)"[^{}]*?"rows":/g)];
for (const [whole, title] of rawSections) {
  const n = (whole.match(/"home"\s*:/g) || []).length;
  if (n > 1) errors.push(`section with more than one home view: ${title}`);
}
for (const d of homes.domains) for (const s of d.sections) {
  const where = `${d.label} › ${s.title}${s.advanced ? ' (advanced)' : ''}`;
  if (s.home === undefined || s.home === null || s.home === '') { errors.push(`section with no home view: ${where}`); continue; }
  if (typeof s.home !== 'string') { errors.push(`section with more than one home view: ${where} → ${JSON.stringify(s.home)}`); continue; }
  if (inspectIds.has(s.home)) { errors.push(`section whose home is an Inspect view: ${where} → ${s.home} (Inspect views are opened, never followed)`); continue; }
  if (!viewIds.has(s.home)) { errors.push(`section whose home is not in the view select: ${where} → ${s.home}`); continue; }
  homeCount.get(s.home).push(where);
}
const sectionTotal = homes.domains.reduce((a, d) => a + d.sections.length, 0);
console.log(`\nHome views (F1): ${sectionTotal} sections, each with one home`);
for (const [v, where] of homeCount) console.log(`  ${v.padEnd(9)} ${String(where.length).padStart(2)}  ${where.join('; ') || '(home to no section; reachable from the view select only)'}`);

// ---- 3-7. chrome tokens --------------------------------------------------------------------
const MODES = loadModes();
// v5 uses the tile's map as it is. Nothing is added: every chrome value below is a tile role.
const VARS = [...TILE_VARS];
// Chrome layout constants: NOT from tokens. The token set has no panel, menu or dialog widths (T3 (7):
// "the chrome's own layout"), and a viewport cap needs vw/vh.
const LAYOUT = [
  ['l-dialog', '640px'], ['l-dialog-vw', '94vw'], ['l-dialog-vh', '90vh'], ['l-dbody-vh', '62vh'],
  ['l-menu', '240px'], ['l-brand', '260px'], ['l-viewsel', '200px'], ['l-num', '104px'], ['l-hex', '88px'], ['l-cell', '152px'],
  ['l-cell-mx', '184px'], ['l-step', '72px'], ['l-picker', '480px'], ['l-pm-label', '96px'], ['l-matrix-h', '520px'],
  ['l-strip-bar', '72px'], ['l-drawer', '440px'], ['l-pick', '240px'], ['l-opt', '200px'], ['l-shape', '96px'],
  ['l-curve', '96px'], ['l-bp', '72px'], ['l-gsw', '56px'], ['l-gbar', '160px'],
];
// Harness geometry: NOT from tokens (the frames the owner reviews at).
const HARNESS = [['h-frame-wide', '1280px'], ['h-frame-tall', '900px'], ['h-frame-narrow', '380px'], ['h-frame-short', '420px']];
// The chrome faces are registered under chrome-only names, so a brand that names "Inter" is still
// checked against this device and never satisfied by the chrome's embedded copy.
const ALIAS = { Inter: 'P3 Chrome UI', 'JetBrains Mono': 'P3 Chrome Mono' };

errors.push(...brandLeaks(MODES, VARS));

const chromeCss = src.match(/<style id="chrome-css">([\s\S]*?)<\/style>/)?.[1];
if (chromeCss === undefined) fail('no <style id="chrome-css"> block in concept-v5.src.html');
scanRaw(chromeCss, 'chrome CSS', errors);
// Inline styles in the markup and in the script's templates. Runtime values (`${…}`) are the engine's
// output (the brand's geometry and colors), so they are taken out before the scan.
const stripRuntime = (t) => { let out = '', depth = 0; for (let i = 0; i < t.length; i++) { if (t[i] === '$' && t[i + 1] === '{') { depth++; i++; continue; } if (depth && t[i] === '{') depth++; else if (depth && t[i] === '}') { depth--; continue; } if (!depth) out += t[i]; } return out; };
for (const im of src.matchAll(/\sstyle="([^"]*)"/g)) scanRaw(stripRuntime(im[1]), 'inline style', errors);
for (const im of src.matchAll(/\s(fill|stroke)="(#[0-9a-f]{3,8})"/gi)) errors.push(`SVG paint: raw hex ${im[1]}="${im[2]}"`);

const previewCss = src.match(/<style id="preview-css">([\s\S]*?)<\/style>/)?.[1];
if (previewCss === undefined) fail('no <style id="preview-css"> block in concept-v5.src.html');
for (const rule of previewCss.replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
  const sel = rule.split('{')[0].trim(); if (!sel) continue;
  for (const one of sel.split(',').map((x) => x.trim())) if (!one.startsWith('[data-content]')) errors.push(`preview CSS selector can reach the chrome: ${one}`);
}
if (/--p3-/.test(previewCss.replace(/\/\*[\s\S]*?\*\//g, ''))) errors.push('preview CSS reads a --p3-* chrome variable: preview content draws in the brand only');

const defined = new Set([...VARS.map((v) => v[0]), ...LAYOUT.map((l) => l[0]), ...HARNESS.map((h) => h[0]), ...CHROME_FONTS.map((f) => f[0])]);
for (const vm of src.matchAll(/var\(--p3-([a-z0-9-]+)/g)) if (!defined.has(vm[1])) errors.push(`undefined variable --p3-${vm[1]}`);
for (const [n] of [...VARS, ...CHROME_FONTS, ...LAYOUT, ...HARNESS]) if (!src.includes(`var(--p3-${n})`)) errors.push(`mapped but unused variable --p3-${n}`);

// Declared chrome pairs: [fg var, bg var, floor, what]. The design intent, checked before anything
// renders; audit-v5.mjs measures every rendered element independently.
const PAIRS = [
  ['text', 'bg-page', 4.5, 'body text on the page'],
  ['text', 'fill-1', 4.5, 'text on an inset (tips, per mode, error cards, the previewed matrix column)'],
  ['text-2', 'bg-page', 4.5, 'secondary text on the page'],
  ['text-2', 'fill-1', 4.5, 'secondary text on an inset (tags, derived hatch, unselected segment)'],
  ['inv-text', 'inv-bg', 4.5, 'Apply Theme'], ['inv-text', 'inv-bg-2', 4.5, 'Apply Theme, hover'],
  ['bad-text', 'bg-page', 4.5, 'danger text on the page'], ['bad-text', 'fill-1', 4.5, 'danger text on an inset (error cause)'],
  ['field-edge', 'bg-page', 3, 'field, chip, button and select edge on the page'],
  ['field-edge', 'fill-1', 3, 'selected segment edge on its track; a control inside an inset'],
  ['field-edge-hover', 'bg-page', 3, 'edge on hover; slider thumb edge'],
  ['ctl-edge', 'bg-page', 3, 'selected chip edge; focus ring on the page'],
  ['ctl-edge', 'fill-1', 3, 'focus ring and selected edge on an inset'],
  ['text', 'bg-page', 3, 'selected tab underline'],
  ['line-2', 'bg-page', 3, 'slider rail; menu and dialog edge'], ['icon', 'bg-page', 3, 'slider fill'],
  ['inv-bg', 'bg-page', 3, 'switch on track'],
  ['icon-2', 'bg-page', 3, 'info glyph, chevrons, switch off knob'], ['icon-2', 'fill-1', 3, 'glyph on an inset'],
  ['ok-icon', 'bg-page', 3, 'verdict dot'], ['ok-icon', 'fill-1', 3, 'check in a status pill'],
  ['bad-icon', 'bg-page', 3, 'failure dot, refused-field outline'], ['bad-icon', 'fill-1', 3, 'error glyph in a pill or card'],
  ['warn-icon', 'bg-page', 3, 'warning glyph'], ['warn-icon', 'fill-1', 3, 'warning glyph in a pill'],
  ['text', 'fill-2', 3, 'progress fill on its track'], ['icon', 'fill-2', 3, 'spinner arc on its track'],
];
const hexOf = (mode, v) => resolve(MODES[mode], P(VARS.find((x) => x[0] === v)[1])).value;
const rows = PAIRS.map(([fg, bg, floor, what]) => {
  const r = { what, fg, bg, floor };
  for (const mode of ['light', 'dark']) {
    r[mode] = ratio(hexOf(mode, fg), hexOf(mode, bg));
    if (typeof r[mode] !== 'number') { errors.push(`pair ${fg} on ${bg} (${what}) in ${mode}: refused, ${r[mode].refused}`); r[mode] = NaN; continue; }
    if (!(r[mode] >= floor)) errors.push(`pair ${fg} on ${bg} (${what}) is ${r[mode].toFixed(2)}:1 in ${mode}, floor ${floor}:1`);
  }
  return r;
});

if (errors.length) {
  console.error(`\nbuild-v5: ${errors.length} error(s)`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}

const block = (mode) => themeBlock(MODES[mode], VARS);
const generated = `/* GENERATED by build-v5.mjs from packages/engine/out/prism3.tokens.json + prism3.dark.overlay.tokens.json,
   through chrome-tokens.mjs. Do not edit; rerun the build. */
:root {
  /* Chrome layout constants. Not from tokens: the token set has no panel, menu or dialog widths. */
${LAYOUT.map(([n, v]) => `  --p3-${n}: ${v};`).join('\n')}
  /* Harness geometry. Not from tokens. */
${HARNESS.map(([n, v]) => `  --p3-${n}: ${v};`).join('\n')}
  /* Chrome fonts. Not from tokens: a chrome constant, embedded below under chrome-only names. */
${fontVarsCss(ALIAS)}
}
${fontFaceCss(ALIAS)}
:root, [data-theme="light"] {
  color-scheme: light;
${block('light')}
}
[data-theme="dark"] {
  color-scheme: dark;
${block('dark')}
}
@media (prefers-color-scheme: dark) {
  [data-theme="system"] {
    color-scheme: dark;
${block('dark').replace(/^/gm, '  ')}
  }
}`;

// ---- bundle the engine (the v4 entry, unchanged: v5 needs nothing more from the engine) -----
const out = join(mkdtempSync(join(tmpdir(), 'p3v5-')), 'p3.js');
try {
  execFileSync('npx', ['-y', 'esbuild@0.24.0', join(here, 'concept-v4.entry.ts'),
    '--bundle', '--format=iife', '--platform=browser', '--target=es2020', '--minify', '--legal-comments=none',
    `--alias:@prism3/engine=${relative(here, engine) || '.'}`, `--outfile=${out}`, '--log-level=warning'],
    { cwd: here, stdio: ['ignore', 'inherit', 'inherit'] });
} catch { fail('esbuild bundle failed'); }
let bundle = readFileSync(out, 'utf8');
if (/<\/script/i.test(bundle)) bundle = bundle.replace(/<\/script/gi, '<\\/script');

const ver = readFileSync(join(engine, 'version.ts'), 'utf8');
const ENGINE_VERSION = ver.match(/export const ENGINE_VERSION = '([^']+)'/)?.[1];
const CONTRACT_VERSION = ver.match(/export const CONTRACT_VERSION = '([^']+)'/)?.[1];
if (!ENGINE_VERSION || !CONTRACT_VERSION) fail('could not read ENGINE_VERSION / CONTRACT_VERSION from version.ts');
const facts = { engineVersion: ENGINE_VERSION, contractVersion: CONTRACT_VERSION, builtAt: new Date().toISOString().slice(0, 10) };
if (!src.includes('<!--P3-ENGINE-->')) fail('no <!--P3-ENGINE--> placeholder in the source');
if (!src.includes('/*@GENERATED-TOKENS@*/')) fail('no /*@GENERATED-TOKENS@*/ placeholder in the source');
const html = src
  .replace('/*@GENERATED-TOKENS@*/', () => generated)
  .replace('<!--P3-ENGINE-->', () => `<script>/* @prism3/engine ${ENGINE_VERSION}, bundled by build-v5.mjs */\n${bundle}</script>\n<script>window.P3_BUILD=${JSON.stringify(facts)}</script>`);

// Offline: nothing in the page may make a request. The chrome faces are data: URIs.
const offending = [
  [/<link\b/i, '<link> element'],
  [/<(?:script|img|iframe|source|video|audio)\b[^>]*\ssrc\s*=\s*["']?(?:https?:)?\/\//i, 'remote src'],
  [/url\(\s*["']?(?:https?:)?\/\//i, 'remote url()'],
  [/@import\b/i, '@import'],
  [/\bfetch\s*\(\s*["'`]https?:/i, 'fetch() to a host'],
].filter(([re]) => re.test(html)).map(([, what]) => what);
for (const ff of html.matchAll(/@font-face\s*\{([^}]*)\}/g)) if (!/src:\s*url\(data:font\/woff2;base64,/.test(ff[1])) offending.push('@font-face that is not a data: URI');
if (offending.length) fail(`output would make a network request: ${offending.join(', ')}`);

writeFileSync(join(here, 'concept-v5.html'), html);
console.log(`\nChrome: ${VARS.length} token variables × 2 themes, ${LAYOUT.length} layout constants, ${CHROME_FONTS.length} embedded faces.`);
console.log(`chrome CSS: 0 raw hex/length/duration/shadow (${chromeCss.split('\n').length} lines); inline styles: 0 raw values outside runtime \${…}.`);
console.log('chrome colors: 0 resolve through primary/accent palettes or brand/link/focus roles.');
console.log(`preview CSS: every selector starts with [data-content] (${previewCss.split('\n').length} lines).`);
console.log('\n| Pair | Floor | Light | Dark |\n|---|---|---|---|');
for (const r of rows) console.log(`| ${r.what} (\`${r.fg}\` on \`${r.bg}\`) | ${r.floor}:1 | ${fmtRatio(r.light)} | ${fmtRatio(r.dark)} |`);
console.log(`\nWrote concept-v5.html (${(html.length / 1024).toFixed(0)} KB; engine ${ENGINE_VERSION}, contract ${CONTRACT_VERSION}; offline check passed)`);
if (process.argv.includes('--tokens')) {
  console.log('\n| Variable | Token (below `pds3.`) | Light | Dark |\n|---|---|---|---|');
  for (const v of VARS) { const l = cssOf(MODES.light, v).css, d = cssOf(MODES.dark, v).css; console.log(`| \`--p3-${v[0]}\` | \`${v[1]}\` | \`${l}\` | ${l === d ? 'same' : `\`${d}\``} |`); }
}
