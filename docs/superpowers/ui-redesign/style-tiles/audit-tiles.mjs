// Prism3 chrome style tiles: rendered audit + screenshots.
//
//   PLAYWRIGHT_MODULE=<path to playwright/index.mjs> PLAYWRIGHT_BROWSERS_PATH=<browsers> \
//     node docs/superpowers/ui-redesign/style-tiles/audit-tiles.mjs [screenshot dir]
//
// Renders the BUILT `style-tiles.html` in Chromium for every theme × width and measures what is
// actually on screen, independent of the build script's declared pairs:
//   - every visible text node (and every field's value) against its composited background: 4.5:1;
//   - every element marked `data-a` in the source:
//       edge  — its visible border (or outline) against the background outside it: 3:1;
//       fill  — its own fill against the background outside it: 3:1;
//       glyph — its icon color against the background behind it: 3:1;
//       ind   — when it holds the checked input, the selected indicator (edge or fill, the larger)
//               against the background outside it: 3:1;
//       text  — declared as identified by its text alone (a ghost button, a link, a summary): no
//               boundary to measure, and its text is already in the 4.5:1 check above;
//       pseudo — its boundary is drawn on pseudo-elements the page cannot read (the range input):
//               covered by the build's declared pairs instead;
//   - REPRESENTED, not counted (docs/34): every visible focusable control outside the harness must
//     carry a marker (on itself, an ancestor within two levels, a child, or a sibling it sits beside),
//     so deleting markers fails by name instead of shrinking the list to nothing; and each column
//     must reach a literal minimum per width (MIN_CHECKS), so an empty column cannot report
//     "min Infinity" as a pass;
//   - the focus ring of every stop in the Tab order, against the background outside the ring: 3:1;
//   - the hit target of every focusable control (a visually hidden radio or switch is measured by
//     the label or wrapper it covers): 24 × 24;
//   - `System` follows the color scheme, and reduced motion slows the spinner to its token;
//   - the chrome renders in Inter and values in JetBrains Mono. Chromium's own record of the face it
//     drew each node with (CDP `CSS.getPlatformFontsForNode`), not `document.fonts.check()`, which
//     answers true when a family is simply absent (nothing to load) and so cannot catch the fallback;
//   - no weight above 600 on any text node, and no computed box-shadow or text-shadow anywhere (T5);
//   - the page makes no network request (both faces are embedded).
// Exits 1 if anything fails. With a directory argument it also writes one screenshot per state.

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const URL = pathToFileURL(join(HERE, 'style-tiles.html')).href;
const SHOTS = process.argv[2];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const PREFIX = 'a2'; // direction A, second pass: the screenshot file prefix
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1500 }, deviceScaleFactor: 1 });
const requests = [];
page.on('request', (r) => { if (!/^(file|data|about):/.test(r.url())) requests.push(r.url()); });
const cdp = await page.context().newCDPSession(page);
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
// The face Chromium actually used for a node's text: [{ familyName, glyphCount }].
async function usedFonts(selector) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) return null;
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  return fonts.map((f) => f.familyName);
}
const FONT_PROBES = [
  ['Inter', '.lab label[for="f-name"]'], ['Inter', '#s-id'], ['Inter', '.btn.primary'], ['Inter', '.tabs label'],
  ['JetBrains Mono', '.ramp .step'], ['JetBrains Mono', '.roles tbody th code'],
];

async function measure() {
  return page.evaluate(() => {
    const parse = (c) => {
      const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] === undefined ? 1 : p[3]];
    };
    const over = (top, bot) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
    const bgOf = (el) => {
      const layers = [];
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
      }
      let acc = [1, 1, 1, 1];
      for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
      return acc;
    };
    const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const vis = (el) => el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true }) && el.getClientRects().length > 0;
    const name = (el) => {
      const t = (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} "${t}"`;
    };
    const edgeColor = (el) => {
      const cs = getComputedStyle(el);
      let best = null;
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        const w = parseFloat(cs[`border${s}Width`]); const c = parse(cs[`border${s}Color`]);
        if (w > 0 && cs[`border${s}Style`] !== 'none' && c && c[3] > 0) best = best && best.w >= w ? best : { w, c };
      }
      if (!best && cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) best = { w: parseFloat(cs.outlineWidth), c: parse(cs.outlineColor) };
      return best;
    };
    const out = { text: [], checks: [], fails: [] };
    const scope = document.querySelectorAll('body *');
    for (const el of scope) {
      if (!vis(el) || el.closest('[data-content], .sr, option, script, style, svg')) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const isField = el.matches('input[type=text], select');
      if (!own && !isField) continue;
      const cs = getComputedStyle(el); const bg = bgOf(el); const fg = over(parse(cs.color), bg);
      const r = ratio(fg, bg); const rec = { what: name(el), r, floor: 4.5, kind: 'text' };
      out.text.push(rec); if (r < 4.5) out.fails.push(rec);
      const wt = Number(cs.fontWeight);
      if (wt > 600) out.fails.push({ what: name(el), kind: 'weight above 600', r: wt, floor: 600 });
    }
    for (const el of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after', '::-webkit-slider-thumb']) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.boxShadow !== 'none' || cs.textShadow !== 'none') out.fails.push({ what: name(el) + (pseudo || ''), kind: 'shadow (T5)', r: 0, floor: 0 });
      }
    }
    // Every focusable control is represented by a marker, or it fails by name.
    const KINDS = new Set(['edge', 'fill', 'glyph', 'ind', 'text', 'pseudo']);
    const marked = (el) => {
      for (let n = el, d = 0; n && d < 3; n = n.parentElement, d++) if (n.dataset?.a) return true;
      if (el.querySelector('[data-a]')) return true;
      return !!el.parentElement?.querySelector(':scope > [data-a]');
    };
    for (const el of document.querySelectorAll('button, input, select, summary, a[href], [tabindex]')) {
      if (!vis(el) || el.closest('.harness, [data-content]')) continue;
      if (el.matches('input[type=radio], input[type=checkbox]') && getComputedStyle(el).opacity === '0' && !vis(el.parentElement)) continue;
      if (!marked(el)) out.fails.push({ what: name(el) + ` <${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}>`, kind: 'unmarked control', r: 0, floor: 0 });
    }
    for (const el of document.querySelectorAll('[data-a]')) {
      if (!vis(el)) continue;
      const outside = bgOf(el.parentElement);
      for (const k of el.dataset.a.split(' ')) {
        if (!KINDS.has(k)) { out.fails.push({ what: name(el), kind: `unknown marker "${k}"`, r: 0, floor: 0 }); continue; }
        if (k === 'text' || k === 'pseudo') continue;
        let r = null;
        if (k === 'edge') { const e = edgeColor(el); if (!e) { out.fails.push({ what: name(el), kind: 'edge (none drawn)', r: 0, floor: 3 }); continue; } r = ratio(over(e.c, outside), outside); }
        if (k === 'fill') r = ratio(bgOf(el), outside);
        if (k === 'glyph') { const svg = el.querySelector('svg') || el; r = ratio(over(parse(getComputedStyle(svg).color), bgOf(el)), bgOf(el)); }
        if (k === 'ind') {
          if (!el.querySelector('input:checked')) continue;
          const e = edgeColor(el); const re = e ? ratio(over(e.c, outside), outside) : 0;
          r = Math.max(re, ratio(bgOf(el), outside));
        }
        const rec = { what: name(el), r, floor: 3, kind: k }; out.checks.push(rec); if (r < 3) out.fails.push(rec);
      }
    }
    // hit targets
    out.hits = [];
    for (const el of document.querySelectorAll('button, input, select, summary, a[href], [tabindex]')) {
      if (!vis(el) || el.closest('.harness')) continue;
      const host = el.matches('input[type=radio], input[type=checkbox]') && getComputedStyle(el).opacity === '0' ? el.parentElement : el;
      const b = host.getBoundingClientRect(); const rec = { what: name(host), w: b.width, h: b.height };
      out.hits.push(rec); if (Math.min(b.width, b.height) < 24 - 0.01) out.fails.push({ ...rec, kind: 'hit target', r: Math.min(b.width, b.height), floor: 24 });
    }
    return out;
  });
}

async function focusRings() {
  const rings = [];
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.click(2, 300); // a neutral spot, so Tab starts from the top of the document
  const seen = new Set();
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null;
      if (a.closest('.harness')) return { skip: true, id: a.outerHTML.slice(0, 60) };
      const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] ?? 1]; };
      const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c[3] >= 1) return c; } return [1, 1, 1, 1]; };
      const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      const ratio = (x, y) => { const p = L(x), q = L(y); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
      const label = (a.getAttribute('aria-label') || a.labels?.[0]?.textContent || a.textContent || a.value || '').trim().replace(/\s+/g, ' ').slice(0, 36);
      if (!a.dataset.k) a.dataset.k = String(Math.random()).slice(2);
      if (a.type === 'range') return { id: a.dataset.k, what: `range "${label}"`, pseudo: true };
      let host = null;
      for (let n = a, d = 0; n && d < 4; n = n.parentElement, d++) {
        const cs = getComputedStyle(n);
        if (cs.opacity === '0') continue;
        if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) { host = n; break; }
        const t = n.querySelector?.(':scope > .track'); if (t) { const ts = getComputedStyle(t); if (ts.outlineStyle !== 'none' && parseFloat(ts.outlineWidth) > 0) { host = t; break; } }
      }
      if (!a.dataset.k) a.dataset.k = String(Math.random()).slice(2);
      const key = a.dataset.k;
      if (!host) return { id: key, what: `${a.tagName.toLowerCase()} "${label}"`, none: true };
      const cs = getComputedStyle(host);
      const offset = parseFloat(cs.outlineOffset);
      const behind = offset > 0 ? bgOf(host.parentElement) : bgOf(host);
      return { id: key, what: `${a.tagName.toLowerCase()} "${label}"`, r: ratio(parse(cs.outlineColor), behind), w: parseFloat(cs.outlineWidth) };
    });
    if (!r) continue;
    if (r.skip) { if (seen.size) break; continue; }
    if (seen.has(r.id)) break; seen.add(r.id); rings.push(r);
  }
  return rings;
}

const results = [];
let failed = 0;
const fontsSeen = new Set();
{
  for (const theme of ['light', 'dark']) {
    for (const w of ['wide', 'narrow']) {
      await page.goto(`${URL}#theme=${theme}&w=${w}`);
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      const m = await measure();
      const rings = await focusRings();
      const ringFails = rings.filter((r) => r.none || (!r.pseudo && (r.r < 3 || r.w < 2)));
      const all = [...m.fails, ...ringFails.map((r) => ({ what: r.what, kind: 'focus ring', r: r.r ?? 0, floor: 3 }))];
      failed += all.length;
      const min = (arr) => arr.reduce((a, b) => (b.r < a.r ? b : a), { r: Infinity });
      if (w === 'wide') {
        for (const [want, sel] of FONT_PROBES) {
          const got = await usedFonts(sel);
          if (!got || !got.length || got.some((f) => f !== want)) all.push({ what: sel, kind: `font (want ${want}, drew ${got ? got.join(' + ') : 'nothing'})`, r: 0, floor: 0 });
          else fontsSeen.add(`${want} on ${sel}`);
        }
        failed += all.length - m.fails.length - ringFails.length;
      }
      // Literal floors, set below what the page draws today (1280: 101 text, 26 checks, 23 rings;
      // 380: 45, 20, 19). They are not derived from the page: a column that falls under its floor
      // has lost coverage, and fails by name rather than passing on a shorter list.
      const MIN_CHECKS = w === 'wide' ? { text: 80, checks: 20, rings: 18, hits: 20 } : { text: 35, checks: 15, rings: 15, hits: 15 };
      const got = { text: m.text.length, checks: m.checks.length, rings: rings.filter((r) => !r.pseudo).length, hits: m.hits.length };
      for (const k of Object.keys(MIN_CHECKS)) if (got[k] < MIN_CHECKS[k]) all.push({ what: `${k} column`, kind: `too few checks (${got[k]} < ${MIN_CHECKS[k]})`, r: 0, floor: 0 });
      failed += all.filter((x) => x.kind.startsWith('too few')).length;
      results.push({ theme, w, text: m.text.length, textMin: min(m.text), checks: m.checks.length, checkMin: min(m.checks),
        rings: rings.length, ringMin: min(rings.filter((r) => !r.pseudo && !r.none)), hits: m.hits.length,
        hitMin: m.hits.reduce((a, b) => Math.min(a, b.w, b.h), Infinity), fails: all });
      if (SHOTS) {
        await page.goto(`${URL}#theme=${theme}&w=${w}`); await page.reload(); await page.evaluate(() => document.fonts.ready);
        await page.locator('#frame').screenshot({ path: join(SHOTS, `${PREFIX}-${theme}-${w === 'wide' ? 1280 : 380}.png`) });
      }
    }
  }
}

// System follows the color scheme
await page.emulateMedia({ colorScheme: 'dark' });
await page.goto(`${URL}#theme=system&w=wide`); await page.reload();
const sysDark = await page.evaluate(() => getComputedStyle(document.querySelector('.levers')).backgroundColor);
await page.emulateMedia({ colorScheme: 'light' }); await page.reload();
const sysLight = await page.evaluate(() => getComputedStyle(document.querySelector('.levers')).backgroundColor);
// Reduced motion
const spin = async () => page.evaluate(() => getComputedStyle(document.querySelector('.spin')).animationDuration);
const spinNormal = await spin();
await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload();
const spinReduced = await spin();
if (SHOTS) {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' });
  const extra = async (hash, file) => { await page.goto(`${URL}#${hash}`); await page.reload(); await page.evaluate(() => document.fonts.ready); await page.locator('#frame').screenshot({ path: join(SHOTS, file) }); };
  for (const theme of ['light', 'dark']) {
    // the whole levers panel at 380, unclipped, and the preview pane with the activity sheet open
    await extra(`theme=${theme}&w=narrow&full=1`, `${PREFIX}-${theme}-380-full.png`);
    await extra(`theme=${theme}&w=narrow&pane=preview&drawer=open`, `${PREFIX}-${theme}-380-preview.png`);
  }
}
await browser.close();

const f = (r) => (Number.isFinite(r) ? `${(Math.floor(r * 100) / 100).toFixed(2)}:1` : '–');
console.log('| Theme | Width | Text nodes (min, floor 4.5:1) | Edges, fills, glyphs, indicators (min, floor 3:1) | Focus stops (min ring, floor 3:1) | Targets (min px, floor 24) | Fails |');
console.log('|---|---|---|---|---|---|---|');
for (const r of results) {
  console.log(`| ${r.theme} | ${r.w === 'wide' ? 1280 : 380} | ${r.text} (${f(r.textMin.r)}) | ${r.checks} (${f(r.checkMin.r)}) | ${r.rings} (${f(r.ringMin.r)}) | ${r.hits} (${Math.round(r.hitMin)}) | ${r.fails.length} |`);
}
console.log(`\nLowest text pair per state:`);
for (const r of results) console.log(`  ${r.theme} ${r.w}: ${r.textMin.what} ${f(r.textMin.r)}; lowest 3:1 check: ${r.checkMin.what} (${r.checkMin.kind}) ${f(r.checkMin.r)}`);
console.log(`\nSystem theme: levers panel ${sysLight} with a light scheme, ${sysDark} with a dark scheme.`);
console.log(`Reduced motion: spinner ${spinNormal} normally, ${spinReduced} reduced.`);
console.log(`Fonts drawn (CDP): ${[...fontsSeen].filter((f, i, a) => a.indexOf(f) === i).join('; ') || 'none'}.`);
console.log(`Network requests: ${requests.length}${requests.length ? ' — ' + requests.slice(0, 3).join(', ') : ''}.`);
if (requests.length) { console.log('  ✗ the page made network requests'); failed++; }
const detail = (x) => (/^(font|shadow|unmarked|unknown|too few)/.test(x.kind) ? '' : x.kind.startsWith('weight') ? ` ${x.r} > ${x.floor}` : ` ${x.r.toFixed(2)} < ${x.floor}`);
for (const r of results) for (const x of r.fails) console.log(`  ✗ ${r.theme} ${r.w}: ${x.kind} ${x.what}${detail(x)}`);
if (sysDark === sysLight) { console.log('  ✗ System theme did not follow the color scheme'); failed++; }
if (spinNormal === spinReduced) { console.log('  ✗ Reduced motion did not change the spinner'); failed++; }
console.log(failed ? `\naudit: ${failed} failure(s)` : '\naudit: every state passes');
process.exit(failed ? 1 : 0);
