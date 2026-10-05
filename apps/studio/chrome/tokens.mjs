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
// duration or shadow in chrome CSS; the product adds named colors, `currentColor`, `var()` fallbacks
// and non-`data:` URLs in `scanRawStrict`), the brand-leak check (no chrome color through the brand palette
// or a brand, link or focus role, but for the focus ring's one named exception, #2144), WCAG contrast, and the embedded chrome fonts.
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
/** Follows alias chains; returns { value, leaf, chain } where chain lists every path visited. A path may name one
 *  member of a composite token after a `#` (`motion.transition.default#duration`): the member's value is resolved
 *  the same way, so two variables read from one composite cannot drift apart. */
export function resolve(tree, dotted, chain = []) {
  const hash = dotted.indexOf('#');
  if (hash >= 0) {
    const base = dotted.slice(0, hash), member = dotted.slice(hash + 1);
    const leaf = leafAt(tree, base);
    chain.push(dotted);
    const v = leaf.$value?.[member];
    if (v === undefined) throw new Error(`${base} has no member ${member}`);
    if (typeof v === 'string' && /^\{[^}]+\}$/.test(v)) return resolve(tree, v.slice(1, -1), chain);
    return { value: v, leaf, chain };
  }
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
/**
 * THE ONE EXCEPTION (#2144, owner decision FR1 A, 2026-10-05): the chrome's focus ring reads Prism3's
 * `color.border.focus`, which resolves through `core.palette.primary`. Keeping brand color out of the chrome is
 * a preference for a minimal frame, not a ban, and focus rings are the accepted exception.
 *
 * Keyed by the variable's NAME, matched exactly, and bound to the one token path it may read. A pattern here
 * (`/focus/`, a prefix, any name that reads `border.focus`) would let a second chrome variable through the
 * brand palette unnoticed, so the build runs BRAND_CANARIES (`esbuild-plugin.mjs`) against this function
 * before it scans the map: a sibling name on the same path, the named variable on another brand path, and a
 * non-focus variable on `border.focus` must each still fail.
 */
export const BRAND_ALLOW = new Map([['focus-ring', 'color.border.focus']]);
/** One message per chrome color variable that resolves through a brand token, in any mode. */
export function brandLeaks(modes, vars) {
  const errors = [];
  for (const mode of Object.keys(modes)) {
    for (const v of vars) {
      if (v[2] !== C) continue;
      if (BRAND_ALLOW.has(v[0]) && BRAND_ALLOW.get(v[0]) === v[1]) continue;
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
// Both faces are embedded from `fonts/` beside this file (SIL OFL 1.1, licenses alongside) as woff2
// data URIs, so the page makes no network request and renders the same on a machine with neither
// installed. JetBrains Mono is the fontsource latin variable subset as fetched (`@fontsource-variable/
// jetbrains-mono` 5.3.0). Inter was re-subset for #1924, because the fontsource latin subset has no →,
// ✓, ✗ or ⚠, and the chrome draws all four. The `[glyphs]` build check (`glyphs.mjs`) names any code
// point the chrome can be handed that the Inter file lacks.
//
// RE-SUBSETTING INTER. Use a scratch virtualenv: fonttools is a one-off tool, not a repo dependency.
//   source   google/fonts `ofl/inter/Inter[opsz,wght].ttf`, "Version 4.001;git-66647c0bb", the build
//            that `@fontsource-variable/inter` 5.3.0 subsets, sha256
//            29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031
//   tools    Python 3.11, fonttools 4.66.1 and brotli 1.2.0, and nothing else. With uharfbuzz
//            installed, fonttools packs GPOS differently: the output is valid but not byte-identical.
//   codes    the previous file's cmap, plus each code point the check names. #1924 added U+2192, U+2197,
//            U+21B3, U+2248, U+2264, U+26A0, U+2713 and U+2717. The subsetter also keeps U+2265, which
//            its layout closure retains. #1993 added U+25CB and U+25CF, the Type preview's availability marks.
//   run      export SOURCE_DATE_EPOCH=1790812800
//            fonttools varLib.instancer 'Inter[opsz,wght].ttf' opsz=14 -o inter-wght.ttf
//            pyftsubset inter-wght.ttf --unicodes-file=codes.txt --name-IDs=0,1,2,3,4,5,6,14 \
//              --layout-features=calt,ccmp,dnom,frac,locl,numr,pnum,tnum,kern,mark,mkmk \
//              --flavor=woff2 --output-file=inter-latin-wght-normal.woff2
//   result   47,996 B, sha256 65adc23c5728f9e50476b9ce2beeeb824d2f7e733906464cde8aac160418c46c, 241 code points.
//            (#1924's file, 47,924 B and sha256 1e27343f…8322, reproduces byte for byte from its 239 codes.)
// Pinning opsz at 14, its default, and keeping those features and name IDs matches the fontsource file it
// replaced. Shaped with HarfBuzz, every code point of the old file draws the same outlines at the same
// positions, at seven weights and four feature sets.
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
  [/\b(rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)\(/gi, 'raw color function'],
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

// ── the product's stricter scan ────────────────────────────────────────────────────────────────
// The product's `chrome.css` is held to more than RAW (PR #1905 review, finding 4). The mockups keep
// RAW alone, so their builds do not move. On top of RAW, a declaration value may not carry:
//   - a CSS named color (CSS Color 4's list, below, as a literal). `transparent` is left off on
//     purpose: it is no color, and it is allowed, with `inherit`, `initial`, `unset` and `none`;
//   - `currentColor`, which inherits whatever color the brand's content set. Nothing needs it yet;
//     the first rule that does should say why here;
//   - a `var(--x, fallback)`: a fallback would draw when the map is missing a name, which is the
//     failure [variables] exists to catch, and it is usually a raw value besides;
//   - a `url()` that is not a `data:` URI, anywhere, including inside `image-set()`, and a bare
//     string inside `image-set()` that is not one (`image-set("https://…" 1x)` needs no `url(`).
// Values only: selectors, property names and quoted strings are not read for color names, so
// `.p3-tan` or `white-space` is not a color.
//
// EVERY NESTING LEVEL (#1927). The CSS ships unlowered, so `.a { color: red; & .b { … } }` is a real rule,
// and its `color: red` sits in a block that is not innermost. Reading only innermost `{ … }` blocks missed
// it. The scan now walks the braces: a block's declarations are what sits between `;` and `}` at that level,
// and a rule's prelude (its selector, or `@media (…)`) is the text before a `{`, so it is never read as one.
//
// PROPERTY-AWARE, so that reading more does not refuse more. A few properties take a CUSTOM IDENTIFIER,
// never a color, and an identifier may spell one (`grid-area: tan`, `animation-name: gold`). Their values
// are not read for color names. The list is short on purpose; every other property is read, so an
// unfamiliar one fails closed.
export const IDENT_VALUED_PROPS = new Set([
  'grid-area', 'grid-row', 'grid-row-start', 'grid-row-end', 'grid-column', 'grid-column-start', 'grid-column-end',
  'grid-template-areas', 'animation-name', 'animation', 'view-transition-name', 'container-name', 'container',
  'counter-reset', 'counter-increment', 'counter-set', 'list-style-type', 'font-family', 'anchor-name',
  'position-anchor', 'scroll-timeline-name', 'view-timeline-name', 'timeline-scope', 'transition-property', 'will-change',
]);
/** Every `property: value` declaration in `code` (comments and strings already out), at every nesting level. */
export function declarations(code) {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const ch of code) {
    if (ch === '{') { buf = ''; depth++; }                               // `buf` was a prelude: a selector or an at-rule
    else if (ch === '}') { if (depth > 0 && buf.includes(':')) out.push(buf); buf = ''; depth = Math.max(0, depth - 1); }
    else if (ch === ';') { if (depth > 0 && buf.includes(':')) out.push(buf); buf = ''; }
    else buf += ch;
  }
  return out.map((d) => { const i = d.indexOf(':'); return [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1)]; });
}
export const CSS_NAMED_COLORS = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black', 'blanchedalmond',
  'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral',
  'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray',
  'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid',
  'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey',
  'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue',
  'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod',
  'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki',
  'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue', 'lightyellow',
  'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid',
  'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
  'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy',
  'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen',
  'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue',
  'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown',
  'seagreen', 'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow',
  'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
  'whitesmoke', 'yellow', 'yellowgreen',
]);
/** Pushes one message per RAW hit, and per hit of the stricter product rules above, onto `errors`. */
export function scanRawStrict(text, where, errors) {
  scanRaw(text, where, errors);
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of code.matchAll(/var\(\s*--[a-z0-9-]+\s*,[^)]*\)?/gi)) errors.push(`${where}: var() fallback "${m[0]}"`);
  for (const m of code.matchAll(/url\(\s*(["']?)(?!data:)[^)]*\)?/gi)) errors.push(`${where}: url() that is not a data: URI "${m[0]}"`);
  for (const set of code.matchAll(/(?:-webkit-)?image-set\(([^;{}]*)/gi)) {
    for (const s of set[1].matchAll(/(["'])(?!data:)[^"']*\1/g)) errors.push(`${where}: image-set() source that is not a data: URI ${s[0]}`);
  }
  // Declaration values, at every nesting level (strings blanked first, so a `;` or `{` inside one is inert).
  for (const [prop, value] of declarations(code.replace(/(["'])(?:(?!\1)[^\\\n]|\\.)*\1/g, '""'))) {
    for (const id of value.matchAll(/(?<![\w-])[a-z][a-z0-9-]*/gi)) {
      const k = id[0].toLowerCase();
      if (k === 'currentcolor') errors.push(`${where}: currentColor "${id[0]}" (${prop})`);
      else if (CSS_NAMED_COLORS.has(k) && !IDENT_VALUED_PROPS.has(prop)) errors.push(`${where}: named color "${id[0]}" (${prop})`);
    }
  }
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
