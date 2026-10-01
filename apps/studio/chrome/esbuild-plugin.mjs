/**
 * `chromeCss()`: the esbuild plugin behind the virtual import `p3:chrome-css` (UI redesign S1.1,
 * `docs/superpowers/ui-redesign/implementation-plan.md` §3.1 and §3.2).
 *
 * At bundle time it resolves the default theme's light and dark trees (`tokens.mjs`), writes the
 * `--p3-*` blocks for the variables SHELL_VARS names (`spec.mjs`), embeds the two chrome faces as
 * `data:` URIs under chrome-only names, and appends `apps/studio/src/chrome.css`. The module's default
 * export is that text, and `src/entry.ts` hands it to `installStyles` with `styles.css`.
 *
 * IT FAILS THE BUILD, naming each failure, on the four checks from `build-v6.mjs` that concern the CSS
 * it produces, plus the inputs they need:
 *
 *   [raw]       `chrome.css` carries a raw hex, color function, length, duration or shadow (v6 check 4);
 *               or reads a variable that is not `--p3-*`.
 *   [variables] `chrome.css` reads a `--p3-*` the map does not define, or the map defines one
 *               `chrome.css` never reads (v6 check 6). The map grows with the rules, never ahead.
 *   [brand]     a chrome color resolves through the brand palette or a brand, link or focus role, in
 *               either theme (v6 check 7).
 *   [offline]   the output would make a network request: a remote `url()`, an `@import`, or an
 *               `@font-face` that is not a `data:` URI (v6 check 10).
 *   [fonts]     a chrome face's woff2 file is missing.
 *   [map]       SHELL_VARS names a variable no mockup row maps.
 *
 * WHY THE CHECKS ARE INDEPENDENT OF WHAT THEY CHECK (docs/34). The subject is the hand-written
 * `chrome.css` and the generated text. The oracles are the scan patterns in `tokens.mjs` (RAW, BRAND_RE),
 * the alias chain the engine's own tree resolves to, and the literal map in `spec.mjs`; none is
 * derived from `chrome.css`. The unused check reads the map and asks the stylesheet, and the undefined
 * check reads the stylesheet and asks the map, so neither side can widen the other.
 *
 * A BUNDLER THAT DROPS THIS PLUGIN FAILS LOUDLY: nothing else resolves `p3:chrome-css`, so esbuild stops
 * with `Could not resolve "p3:chrome-css"`. No fallback is provided on purpose.
 *
 * Node only; it never reaches a bundle. Only the CSS it returns ships.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  ROOT, FONTS_DIR, CHROME_FONTS, loadModes, fontFaceCss, fontVarsCss, themeBlock, brandLeaks, scanRaw,
} from './tokens.mjs';
import { VARS_FOR, ALIAS, SHELL_VARS } from './spec.mjs';

export const CHROME_CSS_MODULE = 'p3:chrome-css';
export const CHROME_CSS_FILE = join(ROOT, 'apps', 'studio', 'src', 'chrome.css');
const NAMESPACE = 'p3-chrome';
const rel = (p) => relative(ROOT, p).split('\\').join('/');

/** The product's rows for one theme: each SHELL_VARS name, with the mockup's token path for that theme. */
export function shellRows(mode, names = SHELL_VARS) {
  const rows = VARS_FOR(mode);
  return names.map((n) => rows.find((r) => r[0] === n) ?? n);
}

/** Every input the CSS is built from, so `dev` rebuilds when any of them changes. */
const watchFiles = () => [
  CHROME_CSS_FILE,
  join(ROOT, 'packages', 'engine', 'out', 'prism3.tokens.json'),
  join(ROOT, 'packages', 'engine', 'out', 'prism3.dark.overlay.tokens.json'),
  ...CHROME_FONTS.map(([, , file]) => join(FONTS_DIR, file)),
];

/**
 * Builds the chrome CSS and runs every check. Returns `{ css, errors }`; `css` is null when anything
 * failed. Exported so a Node test can call it without esbuild. `names` defaults to SHELL_VARS.
 */
export function buildChromeCss({ names = SHELL_VARS, chromeCssFile = CHROME_CSS_FILE } = {}) {
  const errors = [];
  const fail = (check, msg) => errors.push(`[${check}] ${msg}`);

  // [map] every name must have a row, in both themes.
  const rows = { light: shellRows('light', names), dark: shellRows('dark', names) };
  for (const r of rows.light) if (typeof r === 'string') fail('map', `SHELL_VARS names --p3-${r}, which no row in TILE_VARS (tokens.mjs) or V6_VARS (spec.mjs) maps`);

  // [fonts] each face's file must exist before anything reads it.
  for (const [, family, file] of CHROME_FONTS) {
    const p = join(FONTS_DIR, file);
    if (!existsSync(p)) fail('fonts', `chrome font missing: ${rel(p)} (${family})`);
  }

  let src = null;
  try { src = readFileSync(chromeCssFile, 'utf8'); } catch { fail('raw', `cannot read ${rel(chromeCssFile)}`); }
  if (errors.length) return { css: null, errors };

  let modes;
  try { modes = loadModes(); } catch (e) {
    fail('map', `cannot load the default theme from packages/engine/out: ${e.message}`);
    return { css: null, errors };
  }

  // [brand] no chrome color through the brand palette or a brand, link or focus role, in either theme.
  for (const mode of ['light', 'dark']) {
    for (const msg of brandLeaks({ [mode]: modes[mode] }, rows[mode])) fail('brand', msg);
  }

  // [raw] the hand-written rules carry no raw value and read only chrome variables.
  const where = rel(chromeCssFile);
  const raw = [];
  scanRaw(src, where, raw);
  for (const msg of raw) fail('raw', msg);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of code.matchAll(/var\(\s*--([a-z0-9-]+)/gi)) {
    if (!m[1].startsWith('p3-')) fail('raw', `${where}: reads --${m[1]}, which is not a chrome variable (only var(--p3-*) is allowed)`);
  }

  // [variables] used against defined, both ways.
  const defined = new Set([...names, ...CHROME_FONTS.map(([n]) => n)]);
  const used = new Set([...code.matchAll(/var\(\s*--p3-([a-z0-9-]+)/g)].map((m) => m[1]));
  for (const u of used) if (!defined.has(u)) fail('variables', `${where}: undefined variable --p3-${u}`);
  for (const d of defined) if (!used.has(d)) fail('variables', `mapped but unused variable --p3-${d} (${where} never reads it)`);

  if (errors.length) return { css: null, errors };

  const css = `/* Prism3 chrome variables, generated at build time from the default theme by
   apps/studio/chrome/esbuild-plugin.mjs. Edit apps/studio/chrome/spec.mjs or chrome.css, not this. */
:root {
${fontVarsCss(ALIAS)}
}
/* Inter: Copyright 2016 The Inter Project Authors. JetBrains Mono: Copyright 2020 The JetBrains Mono
   Project Authors. Both are licensed under the SIL Open Font License, Version 1.1. */
${fontFaceCss(ALIAS)}
:root, [data-theme="light"] {
  color-scheme: light;
${themeBlock(modes.light, rows.light)}
}
[data-theme="dark"] {
  color-scheme: dark;
${themeBlock(modes.dark, rows.dark)}
}
@media (prefers-color-scheme: dark) {
  [data-theme="system"] {
    color-scheme: dark;
${themeBlock(modes.dark, rows.dark).replace(/^/gm, '  ')}
  }
}
${src}`;

  // [offline] nothing in the output may make a request. The chrome faces are data: URIs.
  const out = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/url\(\s*["']?(?!data:)/i.test(out)) fail('offline', 'a url() that is not a data: URI');
  if (/@import\b/i.test(out)) fail('offline', 'an @import');
  for (const ff of out.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    if (!/src:\s*url\(data:font\/woff2;base64,/.test(ff[1])) fail('offline', '@font-face that is not a data: URI');
  }
  return errors.length ? { css: null, errors } : { css, errors };
}

/** The esbuild plugin. Add it to every entry that bundles `apps/studio/src`. */
export const chromeCss = () => ({
  name: 'p3-chrome-css',
  setup(build) {
    build.onResolve({ filter: /^p3:chrome-css$/ }, () => ({ path: 'chrome-css', namespace: NAMESPACE }));
    build.onLoad({ filter: /.*/, namespace: NAMESPACE }, () => {
      const { css, errors } = buildChromeCss();
      if (errors.length) return { errors: errors.map((text) => ({ text: `${CHROME_CSS_MODULE} ${text}` })), watchFiles: watchFiles() };
      return { contents: css, loader: 'text', watchFiles: watchFiles() };
    });
  },
});
