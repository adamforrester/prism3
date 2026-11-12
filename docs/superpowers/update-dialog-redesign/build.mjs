#!/usr/bin/env node
// Builds the Update file redesign mocks (#3712): direction-a.html, direction-b.html, direction-c.html, each one
// self-contained (the chrome's CSS, its embedded fonts and its icons inlined; no network).
//
//   node docs/superpowers/update-dialog-redesign/build.mjs
//
// THE CHROME IS THE PRODUCT'S. The CSS comes from `buildChromeCss()` in apps/studio/chrome/esbuild-plugin.mjs, the
// function the Studio and plugin builds call: the generated `--p3-*` variables for light and dark, the embedded faces and
// all of src/chrome.css, every check of that build run. The icons are the vendored Tabler paths the chrome draws
// (apps/studio/src/shell/icons/tabler.ts), under the glyph names `dom.ts` gives them.
//
// It FAILS (exit 1), naming what failed, when:
//   1. the chrome build reports an error;
//   2. a direction's CSS carries a raw color, length, duration or shadow (`scanRaw`, the mockups' scan in
//      apps/studio/chrome/tokens.mjs), so each direction is drawn with the chrome's tokens alone;
//   3. a direction's CSS reads a `--p3-*` variable the chrome does not define;
//   4. a glyph the mocks draw has no Tabler path.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const { buildChromeCss } = await import(join(ROOT, 'apps/studio/chrome/esbuild-plugin.mjs'));
const { scanRaw } = await import(join(ROOT, 'apps/studio/chrome/tokens.mjs'));

const errors = [];
const chrome = buildChromeCss();
if (!chrome.css) { console.error(chrome.errors.join('\n')); process.exit(1); }
const defined = new Set([...chrome.css.matchAll(/(--p3-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));

// The glyph names `dom.ts` uses, mapped to Tabler's, read from the vendored file rather than retyped.
const tabler = readFileSync(join(ROOT, 'apps/studio/src/shell/icons/tabler.ts'), 'utf8');
const GLYPHS = { check: 'check', x: 'x', chev: 'chevron-down', chevr: 'chevron-right', warn: 'alert-triangle', info: 'info-circle', lock: 'lock', error: 'alert-circle' };
const icons = {};
for (const [g, t] of Object.entries(GLYPHS)) {
  const m = tabler.match(new RegExp(`'${t}': \\[([^\\]]*)\\]`));
  if (!m) { errors.push(`[icons] no Tabler path for ${t} (glyph ${g})`); continue; }
  icons[g] = [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
}

const src = (f) => readFileSync(join(HERE, 'src', f), 'utf8');
const template = src('template.html');
const shared = template.match(/<style id="shared-css">([\s\S]*?)<\/style>/)[1];
const DIRECTIONS = [
  { key: 'a', name: 'Cards on gray' },
  { key: 'b', name: 'Decisions first' },
  { key: 'c', name: 'Folded step cards' },
];
for (const d of DIRECTIONS) {
  const css = src(`${d.key}.css`);
  for (const [what, text] of [[`${d.key}.css`, css], ['shared-css', shared]]) {
    const before = errors.length;
    scanRaw(text, what, errors);
    for (const m of text.matchAll(/var\((--p3-[a-z0-9-]+)\)/g)) if (!defined.has(m[1])) errors.push(`[vars] ${what} reads ${m[1]}, which the chrome does not define`);
    if (errors.length > before && what === 'shared-css') break;
  }
  const html = template
    .replace('{{CHROME_CSS}}', () => chrome.css)
    .replace('{{DIRECTION_CSS}}', () => css)
    .replace('{{ICONS}}', () => JSON.stringify(icons))
    .replace('{{CORE_JS}}', () => src('core.js'))
    .replace('{{DIRECTION_JS}}', () => src(`${d.key}.js`))
    .replaceAll('{{KEY}}', d.key.toUpperCase())
    .replaceAll('{{NAME}}', d.name);
  if (!errors.length) writeFileSync(join(HERE, `direction-${d.key}.html`), html);
}
if (errors.length) { console.error([...new Set(errors)].join('\n')); process.exit(1); }
console.log(`wrote ${DIRECTIONS.map((d) => `direction-${d.key}.html`).join(', ')}`);
