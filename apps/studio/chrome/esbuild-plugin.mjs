/**
 * `chromeCss()`: the esbuild plugin behind the virtual import `p3:chrome-css` (UI redesign S1.1,
 * `docs/superpowers/ui-redesign/implementation-plan.md` §3.1 and §3.2).
 *
 * At bundle time it resolves the default theme's light and dark trees (`tokens.mjs`), writes the
 * `--p3-*` blocks for the variables SHELL_VARS names (`spec.mjs`), embeds the two chrome faces as
 * `data:` URIs under chrome-only names, and appends `apps/studio/src/chrome.css`. The module's default
 * export is that text, and `src/entry.ts` hands it to `installStyles` with `styles.css`.
 *
 * IT FAILS THE BUILD, naming each failure, on the five checks from `build-v6.mjs` that concern the CSS
 * it produces, plus the inputs they need, plus one rule of the product's own, [hover]:
 *
 *   [raw]       `chrome.css` carries a raw hex, color function, length, duration or shadow (v6 check 4);
 *               a named color, `currentColor`, a `var()` fallback, or a `url()` or `image-set()`
 *               source that is not a `data:` URI (`scanRawStrict`); or reads a variable that is not
 *               `--p3-*`.
 *   [hover]     a `:hover` selector in `chrome.css` lacks the Q28 limit HOVER_LIMIT on the element it hovers, and is
 *               not one HOVER_EXEMPT names word for word, with a reason (#2247); a HOVER_EXEMPT entry no selector is;
 *               a `:hover` the parser read in no rule's selector; or a HOVER_CANARIES case the scan no longer reads.
 *   [variables] `chrome.css` reads a `--p3-*` the map does not define, or the map defines one
 *               `chrome.css` never reads (v6 check 6). The map grows with the rules, never ahead. A
 *               runtime variable (RUNTIME_VARS, a literal list) is defined by the shell instead; it must be
 *               read too, and the map may not define it as well (#2176).
 *   [brand]     a chrome color resolves through the brand palette or a brand, link or focus role, in
 *               either theme (v6 check 7), except `--p3-focus-ring` on `color.border.focus`, the one
 *               exception BRAND_ALLOW names (#2144); BRAND_ALLOW itself not exactly that one entry
 *               (BRAND_ALLOW_IS, #2156); and BRAND_CANARIES, which hold that entry to that one name and
 *               that one path.
 *   [offline]   the output would make a network request: a remote `url()`, an `@import`, or an
 *               `@font-face` that is not a `data:` URI (v6 check 10).
 *   [pairs]     a PAIRS entry (`spec.mjs`) whose two variables are both mapped measures under its
 *               literal floor in either theme (v6 check 8); a mapped color variable takes part in
 *               no such pair and is not listed in DECORATIVE or INACTIVE; a PAIRS, DECORATIVE or INACTIVE
 *               entry names a variable no row defines (#1927); or an INACTIVE variable reads a token that is
 *               not a `color.disabled.*` role (INACTIVE_ROLE, typed here) in either theme (F1 A).
 *   [fonts]     a chrome face's woff2 file is missing.
 *   [license]   a chrome face's OFL file is missing, has no copyright line, or no longer carries the
 *               face's LICENSE_COPYRIGHT literal; or the output lacks, for a face in CHROME_FONTS, a
 *               comment line carrying that literal and the OFL URL (#1927).
 *   [glyphs]    the chrome can be handed a code point the embedded UI face does not carry: in an engine
 *               decision note, a host verdict or the shell's own copy (`glyphs.mjs`, #1924).
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
  ROOT, FONTS_DIR, CHROME_FONTS, C, P, loadModes, resolve, fontFaceCss, fontVarsCss, themeBlock, brandLeaks, BRAND_ALLOW,
  scanRawStrict, ratio, fmtRatio,
} from './tokens.mjs';
import { glyphGaps, glyphWatchFiles } from './glyphs.mjs';
import { VARS_FOR, PRODUCT_FOR, ALIAS, SHELL_VARS, PAIRS as MOCKUP_PAIRS, PRODUCT_PAIRS, DECORATIVE, INACTIVE } from './spec.mjs';

const PAIRS = [...MOCKUP_PAIRS, ...PRODUCT_PAIRS];

/** RUNTIME VARIABLES (#2176): the `--p3-*` names `chrome.css` may read that no token defines, because the shell sets
 *  them on an element while it runs, from what the person did, never from a design value. Typed here, one by one, each
 *  with where it is set. They are custom properties, so `test:chrome`'s inline-value check lets them through, as it
 *  does every custom property; the [variables] check still fails one `chrome.css` never reads, and one the map
 *  defines too.
 *   - `activity-h`: the open Activity drawer's height, as the person dragged it (`src/shell/activity.ts`, set on the
 *     frame while the drawer is open at the wide tier). */
export const RUNTIME_VARS = ['activity-h'];

/** The only roles an INACTIVE variable may read (F1 A): the engine's cross-cutting disabled family. Typed here, not
 *  read from `spec.mjs`, so the list that grants the exemption cannot also set what qualifies for it. */
export const INACTIVE_ROLE = /^color\.disabled\.[a-z-]+$/;

// Each chrome face's license file, beside the woff2 in `fonts/`. The copyright line the bundle's
// notice carries is read from this file, never typed here, so the notice cannot drift from the
// license that came with the font. The URL is the OFL 1.1's own home. The owner decided on
// 2026-10-01 that the bundle carries a notice (copyright line and license URL), not the full text.
export const FONT_LICENSES = { Inter: 'OFL-Inter.txt', 'JetBrains Mono': 'OFL-JetBrains-Mono.txt' };
export const OFL_URL = 'https://openfontlicense.org';
const COPYRIGHT_RE = /Copyright \d{4}[^()\n]*\([^)\n]*\)/;
// THE CHECKER'S OWN EXPECTATION (#1927): each face's copyright line, typed here. The notice WRITER reads its
// line out of the OFL file with COPYRIGHT_RE; the [license] CHECKER must not, or the two share one
// definition and a loosened pattern weakens both at once (a notice reading only "Inter: Copyright." would
// pass). The OFL file is held to these literals too, so a swapped font fails here and asks for an update.
export const LICENSE_COPYRIGHT = {
  Inter: 'Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)',
  'JetBrains Mono': 'Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)',
};

/**
 * THE STRICT SCAN'S OWN CANARIES (#1927), run on every build before `chrome.css` is scanned. `chrome.css`
 * alone cannot show the scan still bites: on `main` it carries no nested declaration and no `hwb()`, so a
 * scan that lost either reach would pass it unchanged. Each canary is a literal: `flag` is the text a
 * finding must contain, or null for CSS the scan must pass. A canary that stops flagging, or a must-pass
 * one that starts failing, fails [raw] by name.
 */
export const RAW_CANARIES = [
  ['a named color in a nested rule', '.a { gap: var(--p3-x); & .b { color: red } }', 'named color "red"'],
  ['a named color beside a nested rule', '.a { color: red; & .b { gap: var(--p3-x) } }', 'named color "red"'],
  ['an hwb() color', '.a { color: hwb(0 0% 0%) }', 'raw color function "hwb("'],
  ['identifier-valued properties that spell a color, nested', '.a { grid-area: tan; animation-name: gold; & .b { grid-area: tan; animation: gold var(--p3-d) } }', null],
];

/**
 * THE BRAND EXCEPTION'S OWN CANARIES (#2144), run on every build before the map is scanned. The real map has
 * exactly one variable on a brand path, the allowed one, so it cannot show the exception is still narrow: an
 * allowlist widened to a pattern, or to every variable reading `border.focus`, would pass it unchanged. Each
 * canary is a literal row, [what, row, must fail]. A row that should fail and passes, or the allowed row
 * failing, fails [brand] by name.
 */
/**
 * WHAT BRAND_ALLOW HOLDS, typed here (#2156). The canaries test how `brandLeaks` reads the allowlist, not what the
 * allowlist holds: a second entry (`['edge-bar', 'color.border.focus']`, with `edge-bar` pointed there) passes
 * every canary, since none of them names it. So the build compares BRAND_ALLOW with this literal, and any widening
 * fails [brand] by name until this literal changes with it, in the same diff, where review sees it.
 */
export const BRAND_ALLOW_IS = [['focus-ring', 'color.border.focus']];
export const BRAND_CANARIES = [
  ['the focus ring on Prism3\'s focus color (the one exception)', ['focus-ring', 'color.border.focus', C], false],
  ['a sibling name on the focus color', ['focus-ring-hover', 'color.border.focus', C], true],
  ['a non-focus variable on the focus color', ['ctl-edge', 'color.border.focus', C], true],
  ['the focus ring pointed at the primary palette', ['focus-ring', 'core.palette.primary.600', C], true],
];

/**
 * THE Q28 HOVER LIMIT (owner decision Q28 a, 2026-10-05; #2247): a control that is `:disabled` or `aria-disabled="true"`
 * changes nothing under the pointer, so every `:hover` in `chrome.css` sits in a compound that also carries this
 * selector, on the same element. Typed here, never read from `chrome.css`, so a rule cannot lower the bar it is held
 * to. `test:chrome`'s Q28 a arm measures the kinds it hovers at run time; this check reads every rule, those kinds
 * included, and fails the build on any one that lacks the limit.
 */
export const HOVER_LIMIT = ':where(:not(:disabled, [aria-disabled="true"]))';
/**
 * THE SELECTORS THAT MAY USE `:hover` WITHOUT THE LIMIT, each typed in full, with its reason. An entry exempts that
 * exact selector text and nothing else, so an exempted rule that changes is no longer exempt. An entry that matches no
 * selector in `chrome.css` fails too, so the list cannot outlive its rules.
 */
export const HOVER_EXEMPT = [
  ['.p3-tile:is(:hover, :focus-visible):not([aria-expanded="true"]) > .p3-tile-tip',
    'a reveal, not a control state: the tooltip repeats the tile\'s name, on hover and on keyboard focus alike, and paints the tip, never the tile'],
  ['.p3-colorfield:where(:not(:has(:disabled, [aria-disabled="true"]))):hover',
    'a wrapper, not the control: what switches off is the input inside it, so it carries the limit in its :has() form; test:chrome\'s "color field" kind (form inner) measures it'],
];
/**
 * THE HOVER SCAN'S OWN CANARIES, run on every build before `chrome.css` is scanned. `chrome.css` alone cannot show the
 * parser still reaches every place a selector can sit: today it has no nested rule and no hover inside `@media`, so a
 * parser that lost either would pass it unchanged. Each canary is a literal: `flag` is the selector a finding must
 * name, or null for CSS the scan must pass. A canary that stops flagging, or a must-pass one that starts failing,
 * fails [hover] by name.
 */
export const HOVER_CANARIES = [
  ['a limited hover', `.a${HOVER_LIMIT}:hover { gap: 0 }`, null],
  ['a limited hover inside :is()', `.a${HOVER_LIMIT}:is(:hover, :focus) { gap: 0 }`, null],
  ['a bare hover', '.a:hover { gap: 0 }', '.a:hover'],
  ['a hover limited for :disabled only', '.a:hover:not(:disabled) { gap: 0 }', '.a:hover:not(:disabled)'],
  ['a hover inside :is()', '.a:is(:hover, :focus-visible) > .b { gap: 0 }', '.a:is(:hover, :focus-visible) > .b'],
  ['a limit on the ancestor, not the hovered element', `.a${HOVER_LIMIT} .b:hover { gap: 0 }`, `.a${HOVER_LIMIT} .b:hover`],
  ['the second selector of a list', `.a${HOVER_LIMIT}:hover, .b:hover { gap: 0 }`, '.b:hover'],
  ['a hover in a nested rule', '.a { gap: 0; & .b:hover { gap: 0 } }', '& .b:hover'],
  ['a hover inside @media', '@media (min-width: 1px) { .a:hover { gap: 0 } }', '.a:hover'],
  ['a selector across lines', '.a,\n.b:hover\n{ gap: 0 }', '.b:hover'],
  // :has() names another element (#2290): its hovered element carries the limit itself, and the subject's does not count.
  ['a limited hover inside :has()', `.a:has(.b${HOVER_LIMIT}:hover) { gap: 0 }`, null],
  ['a limited hover inside :has(), after a combinator', `.a:has(> .b${HOVER_LIMIT}:hover) { gap: 0 }`, null],
  ['a limit on the :has() subject only', `.a${HOVER_LIMIT}:has(.b:hover) { gap: 0 }`, `.a${HOVER_LIMIT}:has(.b:hover)`],
  ['a :has() inside :is(), its hover unlimited', `.a${HOVER_LIMIT}:is(.c, :has(> .b:hover)) { gap: 0 }`, `.a${HOVER_LIMIT}:is(.c, :has(> .b:hover))`],
];

/** Splits `s` at each top-level match of `at` (a regex anchored with ^), outside (), [] and strings. */
const splitTop = (s, at) => {
  const out = [];
  let depth = 0, quote = null, from = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === '\'') quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (depth === 0) {
      const m = at.exec(s.slice(i));
      if (m && m[0].length) { out.push(s.slice(from, i)); from = i + m[0].length; i = from - 1; }
    }
  }
  out.push(s.slice(from));
  return out.map((x) => x.trim()).filter(Boolean);
};
/** A compound selector's simple selectors: each starts at a top-level `.`, `#`, `[` or `:` (a `::` stays whole). */
const simples = (compound) => {
  const out = [];
  let depth = 0, quote = null, from = 0;
  for (let i = 0; i < compound.length; i++) {
    const ch = compound[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === '\'') { quote = ch; continue; }
    if (depth === 0 && /[.#[:]/.test(ch) && i > from && !(ch === ':' && compound[i - 1] === ':')) { out.push(compound.slice(from, i)); from = i; }
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
  }
  out.push(compound.slice(from));
  return out.map((x) => x.replace(/\s+/g, ' ')).filter(Boolean);
};
const HOVER_RE = /:hover(?![\w-])/;
/** Every `:has(…)` argument in `compound`, at any depth (inside `:is()` or `:not()` too), and the compound with each
 *  argument taken out (`:has()` left empty), so what remains is the compound's own element. */
const hasArgs = (compound) => {
  const args = [];
  let own = '', i = 0;
  for (;;) {
    const k = compound.indexOf(':has(', i);
    if (k < 0) { own += compound.slice(i); break; }
    let depth = 0, j = k + 4, quote = null;
    for (; j < compound.length; j++) {
      const ch = compound[j];
      if (quote) { if (ch === '\\') j++; else if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === '\'') quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')' && --depth === 0) break;
    }
    args.push(compound.slice(k + 5, j));
    own += `${compound.slice(i, k)}:has()`;
    i = j + 1;
  }
  return { args, own };
};
/** The compounds of a selector, or of a `:has()` argument's relative selector, that hover without the limit. A `:hover`
 *  inside `:is()`, `:where()` or `:not()` is the compound's own element, so the compound carries the limit; one inside
 *  `:has()` is another element, so that argument is read as a selector of its own (#2290). */
const bareHovers = (sel) => {
  const out = [];
  for (const c of splitTop(sel.replace(/^\s*[>+~]\s*/, ''), /^\s*[>+~]\s*|^\s+/)) {
    const { args, own } = hasArgs(c);
    if (HOVER_RE.test(own) && !simples(own).includes(HOVER_LIMIT)) out.push(c);
    for (const a of args) for (const r of splitTop(a, /^,/)) out.push(...bareHovers(r));
  }
  return out;
};
/**
 * Every [hover] finding in `css`, each naming its selector and line. The selectors are parsed: a rule's prelude is
 * split into its selector list at top-level commas, each selector into compounds at its combinators, and each compound
 * into simple selectors; a compound that hovers must hold HOVER_LIMIT as one of its own simple selectors. A `:hover`
 * inside `:has()` is the hovered element's, not the subject's, so the limit goes on it (`bareHovers`, #2290). Then, by position, every `:hover` in the code must sit inside a prelude the parser read, so a selector
 * the walk missed fails rather than going unchecked. `exempt` is a list of [selector, reason]; one that matches no
 * selector is a finding too.
 */
export function hoverFindings(css, where, exempt = []) {
  const findings = [];
  const code = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  // The walk runs on a copy with every string's inside blanked, so a brace or a `;` in a string is inert. Offsets match.
  const mask = code.replace(/(["'])((?:(?!\1)[^\\\n]|\\.)*)\1/g, (_, q, body) => `${q}${'_'.repeat(body.length)}${q}`);
  const lineAt = (i) => code.slice(0, i).split('\n').length;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const preludes = [];
  let from = 0;
  for (let i = 0; i < mask.length; i++) {
    const ch = mask[i];
    if (ch === '{') {
      const text = code.slice(from, i);
      if (!text.trim().startsWith('@')) preludes.push({ start: from, end: i, text });
      from = i + 1;
    } else if (ch === '}' || ch === ';') from = i + 1;
  }
  const seen = new Set();
  for (const p of preludes) {
    for (const sel of splitTop(p.text, /^,/)) {
      if (!/:hover(?![\w-])/.test(sel)) continue;
      const s = norm(sel);
      if (exempt.some(([x]) => x === s)) { seen.add(s); continue; }
      const bare = bareHovers(sel);
      const on = bare.length === 1 && norm(bare[0]) === s ? '' : ` (on ${bare.map((c) => `"${norm(c)}"`).join(', ')})`;
      if (bare.length) findings.push({ selector: s, msg: `${where}:${lineAt(p.start + p.text.indexOf(sel))}: "${s}" hovers without the Q28 limit ${HOVER_LIMIT} on the element it hovers${on}; add it there, or name the selector in HOVER_EXEMPT (esbuild-plugin.mjs) with a reason` });
    }
  }
  for (const m of code.matchAll(/:hover(?![\w-])/g)) {
    if (!preludes.some((p) => m.index >= p.start && m.index < p.end)) findings.push({ selector: null, msg: `${where}:${lineAt(m.index)}: a :hover the selector parser did not read as part of any rule's selector` });
  }
  for (const [x, why] of exempt) {
    if (!why || !why.trim()) findings.push({ selector: x, msg: `HOVER_EXEMPT (esbuild-plugin.mjs) names "${x}" with no reason` });
    if (!seen.has(x)) findings.push({ selector: x, msg: `HOVER_EXEMPT (esbuild-plugin.mjs) names "${x}", which no selector in ${where} is, word for word; drop the entry, or retype it with the rule` });
  }
  return findings;
}

export const CHROME_CSS_MODULE = 'p3:chrome-css';
export const CHROME_CSS_FILE = join(ROOT, 'apps', 'studio', 'src', 'chrome.css');
const NAMESPACE = 'p3-chrome';
const rel = (p) => relative(ROOT, p).split('\\').join('/');

/** The product's rows for one theme: each SHELL_VARS name, with the mockup's token path for that theme,
 *  or the product's own row (PRODUCT_VARS) for a name the mockup never mapped. */
export function shellRows(mode, names = SHELL_VARS) {
  const rows = [...VARS_FOR(mode), ...PRODUCT_FOR(mode)];
  return names.map((n) => rows.find((r) => r[0] === n) ?? n);
}

/** Every input the CSS is built from, so `dev` rebuilds when any of them changes. */
const watchFiles = () => [
  CHROME_CSS_FILE,
  join(ROOT, 'packages', 'engine', 'out', 'prism3.tokens.json'),
  join(ROOT, 'packages', 'engine', 'out', 'prism3.dark.overlay.tokens.json'),
  ...CHROME_FONTS.map(([, , file]) => join(FONTS_DIR, file)),
  ...Object.values(FONT_LICENSES).map((file) => join(FONTS_DIR, file)),
  ...glyphWatchFiles(),
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
  for (const r of rows.light) if (typeof r === 'string') fail('map', `SHELL_VARS names --p3-${r}, which no row in TILE_VARS (tokens.mjs), V6_VARS or PRODUCT_VARS (spec.mjs) maps`);

  // [fonts] each face's file must exist before anything reads it.
  for (const [, family, file] of CHROME_FONTS) {
    const p = join(FONTS_DIR, file);
    if (!existsSync(p)) fail('fonts', `chrome font missing: ${rel(p)} (${family})`);
  }

  // [glyphs] every code point the chrome can be handed is in the embedded UI face (oracle: its cmap).
  if (!errors.length) for (const msg of glyphGaps()) fail('glyphs', msg);

  // [license] each face's OFL file must exist and carry a copyright line; the notice is built from it.
  const notices = [];
  for (const [, family] of CHROME_FONTS) {
    const file = FONT_LICENSES[family];
    if (!file) { fail('license', `no license file declared for ${family} (FONT_LICENSES in esbuild-plugin.mjs)`); continue; }
    const p = join(FONTS_DIR, file);
    if (!existsSync(p)) { fail('license', `font license missing: ${rel(p)} (${family})`); continue; }
    const text = readFileSync(p, 'utf8');
    if (LICENSE_COPYRIGHT[family] && !text.includes(LICENSE_COPYRIGHT[family])) fail('license', `${rel(p)} no longer carries "${LICENSE_COPYRIGHT[family]}" (${family}); if the font changed, update LICENSE_COPYRIGHT in esbuild-plugin.mjs`);
    const line = text.match(COPYRIGHT_RE)?.[0];
    if (!line) { fail('license', `no copyright line in ${rel(p)} (${family})`); continue; }
    notices.push([family, line]);
  }

  let src = null;
  try { src = readFileSync(chromeCssFile, 'utf8'); } catch { fail('raw', `cannot read ${rel(chromeCssFile)}`); }
  if (errors.length) return { css: null, errors };

  let modes;
  try { modes = loadModes(); } catch (e) {
    fail('map', `cannot load the default theme from packages/engine/out: ${e.message}`);
    return { css: null, errors };
  }

  // [brand] the exception's canaries first (BRAND_CANARIES), then no chrome color through the brand palette or
  // a brand, link or focus role, in either theme, but for the one exception.
  const allowed = JSON.stringify([...BRAND_ALLOW]);
  if (allowed !== JSON.stringify(BRAND_ALLOW_IS)) fail('brand', `self-check: BRAND_ALLOW (tokens.mjs) is ${allowed}, not the one exception ${JSON.stringify(BRAND_ALLOW_IS)} (#2144); widening it changes BRAND_ALLOW_IS (esbuild-plugin.mjs) too`);
  for (const [label, row, mustFail] of BRAND_CANARIES) {
    const got = brandLeaks(modes, [row]);
    if (mustFail && !got.length) fail('brand', `self-check: brandLeaks no longer refuses ${label} (--p3-${row[0]} on ${row[1]}); BRAND_ALLOW (tokens.mjs) allows one variable, focus-ring, by name, on color.border.focus only`);
    if (!mustFail && got.length) fail('brand', `self-check: brandLeaks now refuses ${label}: ${got.join('; ')}`);
  }
  for (const mode of ['light', 'dark']) {
    for (const msg of brandLeaks({ [mode]: modes[mode] }, rows[mode])) fail('brand', msg);
  }

  // [raw] the scan itself first: its canaries (RAW_CANARIES).
  for (const [label, css, flag] of RAW_CANARIES) {
    const got = [];
    scanRawStrict(css, 'canary', got);
    if (flag && !got.some((g) => g.includes(flag))) fail('raw', `self-check: the strict scan no longer flags ${label} (want "${flag}", got ${JSON.stringify(got)})`);
    if (!flag && got.length) fail('raw', `self-check: the strict scan now refuses ${label}: ${got.join('; ')}`);
  }
  // [raw] the hand-written rules carry no raw value and read only chrome variables.
  const where = rel(chromeCssFile);
  const raw = [];
  scanRawStrict(src, where, raw);
  for (const msg of raw) fail('raw', msg);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of code.matchAll(/var\(\s*--([a-z0-9-]+)/gi)) {
    if (!m[1].startsWith('p3-')) fail('raw', `${where}: reads --${m[1]}, which is not a chrome variable (only var(--p3-*) is allowed)`);
  }

  // [hover] the scan itself first: its canaries (HOVER_CANARIES). Then every :hover rule carries the Q28 limit, but the
  // selectors HOVER_EXEMPT names.
  for (const [label, css, flag] of HOVER_CANARIES) {
    const got = hoverFindings(css, 'canary');
    if (flag && !got.some((g) => g.selector === flag)) fail('hover', `self-check: the hover scan no longer flags ${label} (want "${flag}", got ${JSON.stringify(got.map((g) => g.msg))})`);
    if (!flag && got.length) fail('hover', `self-check: the hover scan now refuses ${label}: ${got.map((g) => g.msg).join('; ')}`);
  }
  for (const { msg } of hoverFindings(src, where, HOVER_EXEMPT)) fail('hover', msg);

  // [variables] used against defined, both ways. A runtime variable (RUNTIME_VARS) counts as defined: the shell sets
  // it, so the map must not define it too, and like every other it must be read.
  for (const n of RUNTIME_VARS) if (names.includes(n)) fail('variables', `--p3-${n} is a runtime variable (RUNTIME_VARS, esbuild-plugin.mjs) and a mapped one (SHELL_VARS); it is one or the other`);
  const defined = new Set([...names, ...CHROME_FONTS.map(([n]) => n), ...RUNTIME_VARS]);
  const used = new Set([...code.matchAll(/var\(\s*--p3-([a-z0-9-]+)/g)].map((m) => m[1]));
  for (const u of used) if (!defined.has(u)) fail('variables', `${where}: undefined variable --p3-${u}`);
  for (const d of defined) if (!used.has(d)) fail('variables', `mapped but unused variable --p3-${d} (${where} never reads it)`);

  // [pairs] every declared pair whose two variables the product maps, in both themes, at its floor.
  // The floors are literals in PAIRS; the colors are the engine's emitted tokens, resolved per theme.
  const mapped = new Set(names);
  const colorOf = (mode, name) => {
    const row = rows[mode].find((r) => Array.isArray(r) && r[0] === name);
    return row && row[2] === C ? resolve(modes[mode], P(row[1])).value : null;
  };
  const paired = new Set();
  // A NAME THAT NAMES NOTHING FAILS (#1927). "Not mapped yet" (a row exists, SHELL_VARS does not list it) is
  // skipped below, legitimately; a name with no row at all is a typo, and skipping it too let a misspelt
  // `bg-pgae` drop the body-text pair while the build stayed green. The rows are every row the shell reads.
  const rowNames = new Set(['light', 'dark'].flatMap((m) => [...VARS_FOR(m), ...PRODUCT_FOR(m)].map((r) => r[0])));
  for (const [fg, bg, , what] of PAIRS) {
    for (const n of [fg, bg]) if (!rowNames.has(n)) fail('pairs', `PAIRS names --p3-${n}, which no row in TILE_VARS (tokens.mjs), V6_VARS or PRODUCT_VARS (spec.mjs) defines (${fg} on ${bg}, ${what})`);
  }
  for (const n of DECORATIVE) if (!rowNames.has(n)) fail('pairs', `DECORATIVE names --p3-${n}, which no row in TILE_VARS (tokens.mjs), V6_VARS or PRODUCT_VARS (spec.mjs) defines`);
  for (const n of INACTIVE) if (!rowNames.has(n)) fail('pairs', `INACTIVE names --p3-${n}, which no row in TILE_VARS (tokens.mjs), V6_VARS or PRODUCT_VARS (spec.mjs) defines`);
  // An INACTIVE variable is exempt from contrast because it paints only a disabled control (WCAG 2.2 SC 1.4.3 and
  // 1.4.11, owner decision F1 A). It must read a disabled role, in both themes, or the exemption would hide a live color.
  for (const mode of ['light', 'dark']) {
    for (const r of rows[mode]) {
      if (!Array.isArray(r) || !INACTIVE.includes(r[0])) continue;
      if (r[2] !== C || !INACTIVE_ROLE.test(r[1])) fail('pairs', `--p3-${r[0]} is listed in INACTIVE but reads ${r[1]} in ${mode}, which is not a color.disabled.* role`);
    }
  }
  for (const [fg, bg, floor, what] of PAIRS) {
    if (!mapped.has(fg) || !mapped.has(bg)) continue;
    paired.add(fg); paired.add(bg);
    for (const mode of ['light', 'dark']) {
      const r = ratio(colorOf(mode, fg), colorOf(mode, bg));
      if (typeof r !== 'number') fail('pairs', `${fg} on ${bg} in ${mode}: refused, ${r.refused} (${what})`);
      else if (!(r >= floor)) fail('pairs', `${fg} on ${bg} in ${mode}: ${fmtRatio(r)} < ${floor}:1 (${what})`);
    }
  }
  // Represented, not counted: every mapped color variable takes part in an evaluated pair, or is
  // listed in DECORATIVE (spec.mjs) as carrying no contrast duty.
  for (const r of rows.light) {
    if (!Array.isArray(r) || r[2] !== C || paired.has(r[0]) || DECORATIVE.includes(r[0]) || INACTIVE.includes(r[0])) continue;
    fail('pairs', `--p3-${r[0]} is a mapped color in no declared pair whose other side is mapped; declare one in PAIRS or list it in DECORATIVE or INACTIVE (spec.mjs)`);
  }

  if (errors.length) return { css: null, errors };

  const css = `/* Prism3 chrome variables, generated at build time from the default theme by
   apps/studio/chrome/esbuild-plugin.mjs. Edit apps/studio/chrome/spec.mjs or chrome.css, not this. */
:root {
${fontVarsCss(ALIAS)}
}
/* Embedded fonts.
${notices.map(([family, line]) => `   ${family}: ${line}. Licensed under the SIL Open Font License, Version 1.1: ${OFL_URL}`).join('\n')} */
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

  // [license] the output carries, on one comment line, each embedded face's copyright line and the OFL URL.
  // Checked against CHROME_FONTS, every face the CSS embeds, and the literal LICENSE_COPYRIGHT (#1927). It
  // used to loop over `notices`, the list the writer fills, so a face the writer skipped was a face the
  // checker never asked about: deleting `notices.push` shipped a bundle with no OFL notice and exit 0.
  const commentLines = (css.match(/\/\*[\s\S]*?\*\//g) ?? []).join('\n').split('\n');
  for (const [, family] of CHROME_FONTS) {
    const want = LICENSE_COPYRIGHT[family];
    if (!want) { fail('license', `no expected copyright line declared for ${family} (LICENSE_COPYRIGHT in esbuild-plugin.mjs)`); continue; }
    if (!commentLines.some((l) => l.includes(`${family}: ${want}`) && l.includes(OFL_URL))) {
      fail('license', `the bundled CSS carries no license notice for ${family} (want "${family}: ${want}" and ${OFL_URL} on one comment line)`);
    }
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
