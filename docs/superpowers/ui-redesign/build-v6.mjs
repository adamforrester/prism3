#!/usr/bin/env node
// Builds concept-v6.html from concept-v6.src.html, the default theme's tokens and the real engine.
//
//   node docs/superpowers/ui-redesign/build-v6.mjs            # writes concept-v6.html
//   node docs/superpowers/ui-redesign/build-v6.mjs --tokens   # also prints the token table
//
// It FAILS (exit 1), naming what failed, when:
//   1. COVERAGE (oracle: packages/engine/schema/lever-manifest.json, never the mockup's own list). A
//      manifest lever has no home, or more than one, or a home names a key the manifest lacks, or a
//      lever's advanced tier disagrees with the manifest flag. The exceptions are pages where every
//      lever is shown (FIRST_CLASS below, a literal: Layout from Q4, and the Color sub-pages Surfaces
//      & fills and Interactive from V10). The page's own data cannot widen that list.
//   2. HOME VIEWS (V1, IA-1). The preview changes only on a tab or sub-page change, so homes belong to
//      tabs and sub-pages, never to sections. A tab without sub-pages, and every sub-page, declares
//      exactly one home view from `views`; a tab with sub-pages declares none of its own; a section
//      declares none. A home that is an Inspect view, a view that is no page's home, and a duplicate
//      key anywhere in the HOMES text (JSON.parse keeps the last of two keys silently) all fail.
//   3. ROLES (V2, v6 review #3). Every color role the default theme emits (oracle: packages/engine/out/
//      prism3.tokens.json, not the page) belongs to exactly one Color sub-page's Roles matrix, by the
//      longest `roles` prefix that matches it; no prefix is declared twice. Surfaces & fills and
//      Interactive carry a matrix; Palettes must not (literals ROLES_PAGES and NO_ROLES).
//   4. CHROME CSS (F3, T1-T6). `<style id="chrome-css">`, or any inline `style=""` in the source (after
//      runtime `${…}` values are taken out), carries a raw hex, color function, length or duration, or
//      any shadow; or an SVG in the source paints with a raw hex.
//   5. PREVIEW CSS. A selector in `<style id="preview-css">` does not start with [data-content].
//   6. VARIABLES. The source uses a --p3-* variable the generated block does not define, or the map
//      defines one the source never uses.
//   7. BRAND. A chrome color resolves through the brand palette or a brand, link or focus role.
//   8. PAIRS. A declared chrome pair (PAIRS below) measures under its floor in either theme. v6 declares
//      every edge-on-ground combination the chrome draws (B1), in both themes.
//   9. LAYERS (IA-2). The preview, the levers panel and the top bar are not three distinct, ordered
//      steps in either theme.
//  10. OFFLINE. The output would make a network request. The only @font-face allowed is a data: URI.
//
// The resolver, the tile's variable map, the fonts and the scans come from ./chrome-tokens.mjs, shared
// with style-tiles/build-tiles.mjs and build-v5.mjs; this file does not change it. The rendered audit
// is audit-v6.mjs.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  loadModes, resolve, leaves, P, C, D, TILE_VARS, CHROME_FONTS, fontFaceCss, fontVarsCss, cssOf, themeBlock,
  brandLeaks, scanRaw, ratio, fmtRatio,
} from './chrome-tokens.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const engine = join(repo, 'packages', 'engine');
const errors = [];
const fail = (msg) => { console.error(`build-v6: FAIL: ${msg}`); process.exit(1); };
const src = readFileSync(join(here, 'concept-v6.src.html'), 'utf8');

// ---- a strict JSON parse: a duplicate key is an error, not a silent overwrite ---------------------
// JSON.parse keeps the last of two keys, so `"home":"a","home":"b"` would read as one home. This is a
// second parser on purpose (docs/34: the check must not share the thing it checks).
function strictParse(text) {
  let i = 0; const dups = [];
  const ws = () => { while (/\s/.test(text[i])) i++; };
  const str = () => { let out = ''; i++; while (text[i] !== '"') { if (text[i] === '\\') { const n = text[i + 1] === 'u' ? 6 : 2; out += JSON.parse(`"${text.slice(i, i + n)}"`); i += n; } else out += text[i++]; } i++; return out; };
  const val = (path) => {
    ws();
    if (text[i] === '{') {
      i++; const o = {}; ws(); if (text[i] === '}') { i++; return o; }
      for (;;) { ws(); const k = str(); ws(); i++; const label = o.title || o.id || o.label; if (k in o) dups.push(`"${k}" in ${path}${label ? ` (${label})` : ''}`); o[k] = val(`${path}.${k}`); ws(); if (text[i] === ',') { i++; continue; } i++; return o; }
    }
    if (text[i] === '[') { i++; const a = []; ws(); if (text[i] === ']') { i++; return a; } for (;;) { a.push(val(`${path}[${a.length}]`)); ws(); if (text[i] === ',') { i++; continue; } i++; return a; } }
    if (text[i] === '"') return str();
    const mm = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i)); if (!mm) throw new Error(`HOMES: bad JSON at ${i}`);
    i += mm[0].length; return JSON.parse(mm[0]);
  };
  const v = val('HOMES'); return { v, dups };
}

// ---- 1. coverage ------------------------------------------------------------------------------
const manifest = JSON.parse(readFileSync(join(engine, 'schema', 'lever-manifest.json'), 'utf8'));
const manifestKeys = manifest.levers.map((l) => l.key);
const m = src.match(/<script type="application\/json" id="p3-homes">([\s\S]*?)<\/script>/);
if (!m) fail('no HOMES block (<script type="application/json" id="p3-homes">) in concept-v6.src.html');
const { v: homes, dups } = strictParse(m[1]);
for (const d of dups) errors.push(`HOMES declares a key twice: ${d}`);
// Pages where the manifest's `advanced` flag does not decide the tier: every lever is shown. A literal,
// owned by the decisions (Q4 for Layout, V10 for the two Color sub-pages), never read from the page.
const FIRST_CLASS = ['layout', 'color/fills', 'color/interactive'];
const pagesOf = (d) => (d.subpages ? d.subpages.map((sp) => ({ ...sp, key: `${d.id}/${sp.id}`, name: `${d.label} › ${sp.label}` })) : [{ ...d, key: d.id, name: d.label }]);
const PAGES = homes.domains.flatMap(pagesOf);
const seen = new Map();
const perPage = {};
const schemaOnly = [];
const tierWrong = [];
for (const p of PAGES) {
  perPage[p.name] = { levers: 0, advanced: 0 };
  for (const s of p.sections || []) for (const row of s.rows) {
    for (const k of row.keys ?? []) {
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(`${p.name} › ${s.title}`);
      const lev = manifest.levers.find((l) => l.key === k);
      if (!lev) continue;
      perPage[p.name].levers++; if (s.advanced) perPage[p.name].advanced++;
      const wantAdv = FIRST_CLASS.includes(p.key) ? false : !!lev.advanced;
      if (!!s.advanced !== wantAdv) tierWrong.push(`${k}: manifest advanced=${!!lev.advanced}, placed ${s.advanced ? 'advanced' : 'everyday'} in ${p.name} › ${s.title}${FIRST_CLASS.includes(p.key) ? ' (every lever on this page is shown)' : ''}`);
    }
    for (const k of row.schemaOnly ?? []) schemaOnly.push(`${k} (${p.name} › ${s.title})`);
  }
}
const missing = manifestKeys.filter((k) => !seen.has(k));
const dup = [...seen].filter(([, where]) => where.length > 1);
const unknown = [...seen.keys()].filter((k) => !manifestKeys.includes(k));
console.log('Coverage (oracle: packages/engine/schema/lever-manifest.json)');
console.log(`  manifest levers: ${manifestKeys.length} (${manifest.levers.filter((l) => l.advanced).length} flagged advanced)`);
for (const [pn, c] of Object.entries(perPage)) console.log(`  ${pn.padEnd(28)} ${String(c.levers).padStart(2)} levers  (${c.advanced} behind "Show advanced")`);
console.log(`  total placed: ${[...seen.keys()].filter((k) => manifestKeys.includes(k)).length}  missing: ${missing.length}  duplicated: ${dup.length}  unknown: ${unknown.length}  tier mismatches: ${tierWrong.length}`);
console.log(`  every lever shown on: ${FIRST_CLASS.join(', ')}`);
console.log(`  schema-only inputs also placed (not manifest levers): ${schemaOnly.map((x) => x.split(' ')[0]).join(', ')}`);
if (missing.length) errors.push(`manifest keys with no home: ${missing.join(', ')}`);
if (dup.length) errors.push(`manifest keys with more than one home: ${dup.map(([k, w]) => `${k} → ${w.join(' + ')}`).join('; ')}`);
if (unknown.length) errors.push(`homes naming keys the manifest does not have: ${unknown.join(', ')}`);
if (tierWrong.length) errors.push(`advanced tier disagrees with the manifest flag:\n    ${tierWrong.join('\n    ')}`);
for (const k of FIRST_CLASS) if (!PAGES.some((p) => p.key === k)) errors.push(`FIRST_CLASS names a page HOMES does not have: ${k}`);

// ---- 2. home views (V1, IA-1) ------------------------------------------------------------------
if (!Array.isArray(homes.views) || !homes.views.length) errors.push('HOMES has no `views` list: the pages have nothing to call home');
if (!Array.isArray(homes.inspect)) errors.push('HOMES has no `inspect` list');
const viewIds = new Set((homes.views || []).map(([id]) => id));
const inspectIds = new Set((homes.inspect || []).map(([id]) => id));
const homeCount = new Map([...viewIds].map((v) => [v, []]));
const isHome = (h) => h !== undefined && h !== null && h !== '';
for (const d of homes.domains) {
  if (d.subpages && isHome(d.home)) errors.push(`tab with sub-pages that also declares a home: ${d.label} → ${JSON.stringify(d.home)} (each sub-page brings its own; the tab would be a second home)`);
  if (d.subpages && d.sections) errors.push(`tab with sub-pages that also has sections of its own: ${d.label}`);
  if (d.subpages && !d.subpages.length) errors.push(`tab with an empty sub-page list: ${d.label}`);
}
for (const p of PAGES) {
  const kind = p.key.includes('/') ? 'sub-page' : 'tab';
  for (const s of p.sections || []) if ('home' in s) errors.push(`section declares a home view: ${p.name} › ${s.title} → ${JSON.stringify(s.home)} (V1: the preview does not change on scroll or focus, so a section cannot bring a view)`);
  if (!isHome(p.home)) { errors.push(`${kind} with no home view: ${p.name}`); continue; }
  if (typeof p.home !== 'string') { errors.push(`${kind} with more than one home view: ${p.name} → ${JSON.stringify(p.home)}`); continue; }
  if (inspectIds.has(p.home)) { errors.push(`${kind} whose home is an Inspect view: ${p.name} → ${p.home} (Inspect views are opened, never a home)`); continue; }
  if (!viewIds.has(p.home)) { errors.push(`${kind} whose home is not in \`views\`: ${p.name} → ${p.home}`); continue; }
  homeCount.get(p.home).push(p.name);
}
for (const [v, where] of homeCount) if (!where.length) errors.push(`view that is no page's home: ${v} (V1: nothing else can reach it)`);
console.log(`\nHome views (V1): ${PAGES.length} pages (${homes.domains.length} tabs), each with one home`);
for (const [v, where] of homeCount) console.log(`  ${v.padEnd(12)} ${where.join('; ') || '(none)'}`);

// ---- 3. roles (V2) -------------------------------------------------------------------------------
const tokensDoc = JSON.parse(readFileSync(join(engine, 'out', 'prism3.tokens.json'), 'utf8'));
const emittedRoles = [...leaves(tokensDoc.pds3.color)].map(([path]) => path.join('.'));
const colorTab = homes.domains.find((d) => d.id === 'color');
// Which Color sub-pages carry a Roles toggle: a literal from the v6 review (#3). Palettes are primitives,
// so Palettes has none; text and icon belong to Surfaces & fills.
const ROLES_PAGES = ['fills', 'interactive'], NO_ROLES = ['palettes'];
for (const id of [...ROLES_PAGES, ...NO_ROLES]) if (!(colorTab?.subpages || []).some((sp) => sp.id === id)) errors.push(`Color has no sub-page ${id}, which the v6 review names`);
const prefixOwner = new Map();
for (const sp of colorTab?.subpages || []) {
  const has = Array.isArray(sp.roles) && sp.roles.length > 0;
  if (NO_ROLES.includes(sp.id)) { if (has || 'roles' in sp) errors.push(`Color sub-page that must have no Roles toggle declares roles: ${sp.label} → ${JSON.stringify(sp.roles)} (v6 review: palettes are primitives)`); continue; }
  if (!has) { errors.push(`Color sub-page with no Roles families: ${sp.label}`); continue; }
  for (const pre of sp.roles) {
    if (prefixOwner.has(pre)) errors.push(`Roles prefix declared twice: ${pre} (${prefixOwner.get(pre)} and ${sp.label})`);
    else prefixOwner.set(pre, sp.label);
  }
}
const roleOwner = (role) => { let best = ''; for (const pre of prefixOwner.keys()) if ((role === pre || role.startsWith(pre + '.')) && pre.length > best.length) best = pre; return best ? prefixOwner.get(best) : null; };
const perSub = {};
const orphanRoles = [];
for (const r of emittedRoles) { const o = roleOwner(r); if (!o) orphanRoles.push(r); else perSub[o] = (perSub[o] || 0) + 1; }
if (orphanRoles.length) errors.push(`color roles in no Color sub-page's Roles matrix: ${orphanRoles.slice(0, 8).join(', ')}${orphanRoles.length > 8 ? ` …and ${orphanRoles.length - 8} more` : ''}`);
for (const pre of prefixOwner.keys()) if (!emittedRoles.some((r) => r === pre || r.startsWith(pre + '.'))) errors.push(`Roles prefix that matches no emitted role: ${pre} (${prefixOwner.get(pre)})`);
console.log(`\nRoles (V2, oracle: packages/engine/out/prism3.tokens.json): ${emittedRoles.length} color roles, ${orphanRoles.length} unplaced`);
for (const [s, n] of Object.entries(perSub)) console.log(`  ${s.padEnd(18)} ${String(n).padStart(3)} roles  (${[...prefixOwner].filter(([, o]) => o === s).map(([p]) => p).join(', ')})`);

// ---- 4-9. chrome tokens -----------------------------------------------------------------------------
const MODES = loadModes();
// The tile's map, plus v6's layering and edge roles. A v6 row may name a different token per theme,
// because IA-2 and B1 are orderings and thresholds, not one role: the same ladder position lands on a
// different step in the dark overlay. Each entry is [variable, light path, dark path, kind, what].
const V6_VARS = [
  // IA-2. Neutral 025 has no semantic role in light, so the light side reads the ramp step directly. It
  // is noted as a possible engine role, not filed. Dark has no step between 950 and 900, so the same
  // "a little off the page" position is background.secondary (neutral 900).
  ['levers-bg', 'core.palette.neutral.025', 'color.background.secondary', C, 'levers panel (IA-2)'],
  // The top bar: light background.secondary (neutral 050); dark background.tertiary (neutral 850),
  // one more step up the dark ladder, so the three surfaces keep their order in both themes. Secondary
  // text is 4.17:1 on neutral 850, so nothing on the bar is set in text-2: the bar carries primary text,
  // glyphs (3:1) and white-filled controls. The audit measures every text node on it.
  ['bar-bg', 'color.background.secondary', 'color.background.tertiary', C, 'top bar (IA-2)'],
  // B1. The control edge on the page and on the levers panel: neutral 400 (border.secondary) in light,
  // 3.28:1 on white and 3.06:1 on neutral 025. In dark the token that clears 3:1 closest on neutral
  // 950 and 900 is field.border.rest (neutral 550: 3.52 and 3.25; neutral 600 is 2.91 and 2.68).
  ['edge', 'color.border.secondary', 'color.field.border.rest', C, 'control edge on the page and levers (B1)'],
  // B1. On the top bar border.secondary fails in light (2.70:1 on neutral 050), so the bar keeps
  // field.border.rest (3.18:1). In dark, field.border.rest fails on neutral 850 (2.92:1) and
  // border.secondary (neutral 500) clears it closest (3.52:1).
  ['edge-bar', 'color.field.border.rest', 'color.border.secondary', C, 'control edge on the top bar (B1)'],
  // Type for the hierarchy the owner asked for (V8): a 20px view title, and tracked small capitals for
  // card titles. Same token in both themes.
  ['fs-20', 'core.font.size.20', 'core.font.size.20', D, 'view title'],
  ['ls-wide', 'core.font.letter-spacing-role.wide', 'core.font.letter-spacing-role.wide', D, 'card title tracking'],
];
const VARS_FOR = (mode) => [...TILE_VARS, ...V6_VARS.map(([n, l, d, k]) => [n, mode === 'light' ? l : d, k])];
const VARS = VARS_FOR('light'); // names and kinds; the paths differ per theme only for V6_VARS
// Chrome layout constants: NOT from tokens. The token set has no panel, menu or dialog widths (T3 (7):
// "the chrome's own layout"), and a viewport cap needs vw/vh.
const LAYOUT = [
  ['l-dialog', '640px'], ['l-dialog-vw', '94vw'], ['l-dialog-vh', '90vh'], ['l-dbody-vh', '62vh'],
  ['l-menu', '240px'], ['l-brand', '260px'], ['l-num', '104px'], ['l-measure', '75ch'], ['l-hex', '88px'], ['l-cell', '152px'], ['l-field-col', '200px'],
  ['l-cell-mx', '184px'], ['l-step', '72px'], ['l-picker', '480px'], ['l-pm-label', '96px'], ['l-matrix-h', '640px'],
  ['l-strip-bar', '72px'], ['l-drawer', '440px'], ['l-pick', '240px'], ['l-opt', '200px'], ['l-shape', '96px'],
  ['l-curve', '96px'], ['l-bp', '72px'], ['l-gsw', '56px'],
  // v6: the large squares (V7), the big live samples (V8), the gradient field (V8) and the agent popover.
  ['l-hero-sw', '56px'], ['l-sample', '240px'], ['l-sample-h', '56px'], ['l-grad-h', '160px'],
  ['l-row-sw', '40px'], ['l-agent-pop', '320px'], ['l-bp-band', '44px'],
];
// Harness geometry: NOT from tokens (the frames the owner reviews at).
const HARNESS = [['h-frame-wide', '1280px'], ['h-frame-tall', '900px'], ['h-frame-narrow', '380px'], ['h-frame-short', '420px']];
const ALIAS = { Inter: 'P3 Chrome UI', 'JetBrains Mono': 'P3 Chrome Mono' };

for (const mode of ['light', 'dark']) errors.push(...brandLeaks({ [mode]: MODES[mode] }, VARS_FOR(mode)));

const chromeCss = src.match(/<style id="chrome-css">([\s\S]*?)<\/style>/)?.[1];
if (chromeCss === undefined) fail('no <style id="chrome-css"> block in concept-v6.src.html');
scanRaw(chromeCss, 'chrome CSS', errors);
const stripRuntime = (t) => { let out = '', depth = 0; for (let i = 0; i < t.length; i++) { if (t[i] === '$' && t[i + 1] === '{') { depth++; i++; continue; } if (depth && t[i] === '{') depth++; else if (depth && t[i] === '}') { depth--; continue; } if (!depth) out += t[i]; } return out; };
for (const im of src.matchAll(/\sstyle="([^"]*)"/g)) scanRaw(stripRuntime(im[1]), 'inline style', errors);
for (const im of src.matchAll(/\s(fill|stroke)="(#[0-9a-f]{3,8})"/gi)) errors.push(`SVG paint: raw hex ${im[1]}="${im[2]}"`);

const previewCss = src.match(/<style id="preview-css">([\s\S]*?)<\/style>/)?.[1];
if (previewCss === undefined) fail('no <style id="preview-css"> block in concept-v6.src.html');
for (const rule of previewCss.replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
  const sel = rule.split('{')[0].trim(); if (!sel) continue;
  for (const one of sel.split(',').map((x) => x.trim())) if (!one.startsWith('[data-content]')) errors.push(`preview CSS selector can reach the chrome: ${one}`);
}
if (/--p3-/.test(previewCss.replace(/\/\*[\s\S]*?\*\//g, ''))) errors.push('preview CSS reads a --p3-* chrome variable: preview content draws in the brand only');

const defined = new Set([...VARS.map((v) => v[0]), ...LAYOUT.map((l) => l[0]), ...HARNESS.map((h) => h[0]), ...CHROME_FONTS.map((f) => f[0])]);
for (const vm of src.matchAll(/var\(--p3-([a-z0-9-]+)/g)) if (!defined.has(vm[1])) errors.push(`undefined variable --p3-${vm[1]}`);
for (const [n] of [...VARS, ...CHROME_FONTS, ...LAYOUT, ...HARNESS]) if (!src.includes(`var(--p3-${n})`)) errors.push(`mapped but unused variable --p3-${n}`);

// Declared chrome pairs: [fg var, bg var, floor, what]. The design intent, checked before anything
// renders; audit-v6.mjs measures every rendered element independently. B1: every edge-on-ground
// combination the chrome draws is here, in both themes. Grounds: bg-page (the preview, cards, fields,
// menus), levers-bg (the levers panel), bar-bg (the top bar), fill-1 (insets: tracks, pickers, tips).
const PAIRS = [
  ['text', 'bg-page', 4.5, 'body text on the page'],
  ['text', 'levers-bg', 4.5, 'text on the levers panel'],
  ['text', 'bar-bg', 4.5, 'text on the top bar'],
  ['text', 'fill-1', 4.5, 'text on an inset'],
  ['text-2', 'bg-page', 4.5, 'secondary text on the page'],
  ['text-2', 'levers-bg', 4.5, 'secondary text on the levers panel (intro, tabs)'],
  ['text-2', 'fill-1', 4.5, 'secondary text on an inset (tags, derived hatch, unselected segment)'],
  ['inv-text', 'inv-bg', 4.5, 'Apply Theme'], ['inv-text', 'inv-bg-2', 4.5, 'Apply Theme, hover'],
  ['bad-text', 'bg-page', 4.5, 'danger text on the page'], ['bad-text', 'fill-1', 4.5, 'danger text on an inset (error cause)'],
  // B1 edges
  ['edge', 'bg-page', 3, 'control edge on the page, a card or a menu'],
  ['edge', 'levers-bg', 3, 'control edge on the levers panel (search, tab-row controls)'],
  ['edge-bar', 'bar-bg', 3, 'control edge on the top bar (brand, verdict, Export, Figma, agent chip)'],
  ['field-edge', 'fill-1', 3, 'control edge in an inset (selected segment, picker step, per-mode body)'],
  ['field-edge', 'bg-page', 3, 'edge of a selected segment on a page-colored track (the 380 top row)'],
  ['field-edge-hover', 'bg-page', 3, 'edge on hover; slider thumb edge'],
  ['field-edge-hover', 'levers-bg', 3, 'edge on hover on the levers panel'],
  ['ctl-edge', 'bg-page', 3, 'selected chip edge; focus ring on the page'],
  ['ctl-edge', 'levers-bg', 3, 'focus ring on the levers panel'],
  ['ctl-edge', 'bar-bg', 3, 'focus ring and pressed edge on the top bar'],
  ['ctl-edge', 'fill-1', 3, 'focus ring and selected edge on an inset'],
  ['text', 'bg-page', 3, 'selected tab underline in the preview'],
  ['text', 'levers-bg', 3, 'selected tab underline on the levers panel'],
  ['line-2', 'bg-page', 3, 'slider rail; menu and dialog edge'], ['icon', 'bg-page', 3, 'slider fill'],
  ['inv-bg', 'bg-page', 3, 'switch on track'],
  ['icon-2', 'bg-page', 3, 'info glyph, chevrons, switch off knob'], ['icon-2', 'fill-1', 3, 'glyph on an inset'],
  ['icon-2', 'levers-bg', 3, 'glyph on the levers panel'], ['icon-2', 'bar-bg', 3, 'glyph on the top bar'],
  ['ok-icon', 'bar-bg', 3, 'verdict dot on the top bar'], ['ok-icon', 'bg-page', 3, 'check in a badge'], ['ok-icon', 'fill-1', 3, 'check in a status pill'],
  ['bad-icon', 'bar-bg', 3, 'failure dot on the top bar'], ['bad-icon', 'bg-page', 3, 'refused-field outline'], ['bad-icon', 'fill-1', 3, 'error glyph in a pill or card'],
  ['warn-icon', 'bg-page', 3, 'warning glyph'], ['warn-icon', 'fill-1', 3, 'warning glyph in a pill'],
  ['text', 'fill-2', 3, 'progress fill on its track'], ['icon', 'fill-2', 3, 'spinner arc on its track'],
];
const pathOf = (mode, v) => VARS_FOR(mode).find((x) => x[0] === v)?.[1];
const hexOf = (mode, v) => { const p = pathOf(mode, v); if (!p) throw new Error(`no variable --p3-${v}`); return resolve(MODES[mode], P(p)).value; };
const rows = PAIRS.map(([fg, bg, floor, what]) => {
  const r = { what, fg, bg, floor };
  for (const mode of ['light', 'dark']) {
    r[mode] = ratio(hexOf(mode, fg), hexOf(mode, bg));
    if (typeof r[mode] !== 'number') { errors.push(`pair ${fg} on ${bg} (${what}) in ${mode}: refused, ${r[mode].refused}`); r[mode] = NaN; continue; }
    if (!(r[mode] >= floor)) errors.push(`pair ${fg} on ${bg} (${what}) is ${r[mode].toFixed(2)}:1 in ${mode}, floor ${floor}:1`);
  }
  return r;
});

// IA-2 layers: the preview, the levers panel and the top bar must be three distinct steps, in one
// direction, in both themes. A literal floor per step: 1.04:1 separates neighboring neutral steps
// (the smallest pair here is 1.07:1) and rejects a panel pointed back at the page (1.00:1).
const LAYER_STEP = 1.04;
const LAYERS = [['bg-page', 'preview'], ['levers-bg', 'levers panel'], ['bar-bg', 'top bar']];
const layerRows = [];
for (const mode of ['light', 'dark']) {
  const lum = (v) => { const h = hexOf(mode, v).slice(1); const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const dir = [];
  for (let i = 1; i < LAYERS.length; i++) {
    const [a, an] = LAYERS[i - 1], [b, bn] = LAYERS[i];
    const r = ratio(hexOf(mode, a), hexOf(mode, b));
    const step = typeof r === 'number' ? r : NaN;
    dir.push(Math.sign(lum(b) - lum(a)));
    layerRows.push({ mode, what: `${bn} against ${an}`, a, b, r: step });
    if (!(step >= LAYER_STEP)) errors.push(`layer ${b} on ${a} (${bn} against ${an}) is ${Number.isFinite(step) ? step.toFixed(2) : 'refused'}:1 in ${mode}, want a distinct step (${LAYER_STEP}:1 or more)`);
  }
  if (new Set(dir).size !== 1 || dir[0] === 0) errors.push(`layers in ${mode} do not step one way (preview → levers → top bar): ${dir.join(', ')}`);
}

if (errors.length) {
  console.error(`\nbuild-v6: ${errors.length} error(s)`);
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}

const block = (mode) => themeBlock(MODES[mode], VARS_FOR(mode));
const generated = `/* GENERATED by build-v6.mjs from packages/engine/out/prism3.tokens.json + prism3.dark.overlay.tokens.json,
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

// ---- bundle the engine (the v4 entry, unchanged: v6 needs nothing more from the engine) -----
const out = join(mkdtempSync(join(tmpdir(), 'p3v6-')), 'p3.js');
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
  .replace('<!--P3-ENGINE-->', () => `<script>/* @prism3/engine ${ENGINE_VERSION}, bundled by build-v6.mjs */\n${bundle}</script>\n<script>window.P3_BUILD=${JSON.stringify(facts)}</script>`);

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

writeFileSync(join(here, 'concept-v6.html'), html);
console.log(`\nChrome: ${VARS.length} token variables × 2 themes (${V6_VARS.length} mapped per theme), ${LAYOUT.length} layout constants, ${CHROME_FONTS.length} embedded faces.`);
console.log(`chrome CSS: 0 raw hex/length/duration/shadow (${chromeCss.split('\n').length} lines); inline styles: 0 raw values outside runtime \${…}.`);
console.log('chrome colors: 0 resolve through primary/accent palettes or brand/link/focus roles.');
console.log(`preview CSS: every selector starts with [data-content] (${previewCss.split('\n').length} lines).`);
console.log('\n| Layer (IA-2) | Light | Dark |\n|---|---|---|');
for (const w of [...new Set(layerRows.map((r) => r.what))]) { const [l, d] = ['light', 'dark'].map((mo) => layerRows.find((r) => r.mode === mo && r.what === w)); console.log(`| ${w} (\`${l.b}\` on \`${l.a}\`) | ${fmtRatio(l.r)} | ${fmtRatio(d.r)} |`); }
console.log('\n| Pair | Floor | Light | Dark |\n|---|---|---|---|');
for (const r of rows) console.log(`| ${r.what} (\`${r.fg}\` on \`${r.bg}\`) | ${r.floor}:1 | ${fmtRatio(r.light)} | ${fmtRatio(r.dark)} |`);
console.log(`\nWrote concept-v6.html (${(html.length / 1024).toFixed(0)} KB; engine ${ENGINE_VERSION}, contract ${CONTRACT_VERSION}; offline check passed)`);
if (process.argv.includes('--tokens')) {
  console.log('\n| Variable | Light token (below `pds3.`) | Light | Dark token | Dark |\n|---|---|---|---|---|');
  const L = VARS_FOR('light'), Dk = VARS_FOR('dark');
  for (let i = 0; i < L.length; i++) { const l = cssOf(MODES.light, L[i]).css, d = cssOf(MODES.dark, Dk[i]).css; console.log(`| \`--p3-${L[i][0]}\` | \`${L[i][1]}\` | \`${l}\` | ${L[i][1] === Dk[i][1] ? 'same' : `\`${Dk[i][1]}\``} | ${l === d ? 'same' : `\`${d}\``} |`); }
}
