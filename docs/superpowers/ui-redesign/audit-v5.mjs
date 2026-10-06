// Prism3 concept v5: rendered audit, behavior checks and screenshots.
//
//   PLAYWRIGHT_MODULE=<repo>/node_modules/playwright/index.mjs \
//     node docs/superpowers/ui-redesign/audit-v5.mjs [screenshot dir]
//
// Renders the BUILT concept-v5.html in Chromium and measures what is on screen, independent of the
// build's declared pairs. The tile audit (style-tiles/audit-tiles.mjs), extended to v5. Every state
// runs in light and dark, at 1280 and at 380:
//   default (studio, Brand), roles (Color › Roles), fail (plugin, Build with errors), inspect
//   (Inspect › Contrast, which the verdict opens) and plugin (plugin host, Figma theme).
// In each it measures, outside the brand's own preview content ([data-content]):
//   - every visible text node, field value and placeholder against its composited background: 4.5:1
//     (a hatched background is measured against its darkest stripe);
//   - every control's drawn edge against what is outside it, every selected indicator (chip edge,
//     segment, tab underline, pressed button, switch track), every glyph, status dot, progress fill,
//     spinner arc and link underline: 3:1;
//   - the focus ring of every stop in the Tab order: 3:1 and at least 2px (tab rings are drawn by a
//     ::before and read from it; a range thumb's ring is on a pseudo-element the page cannot read,
//     so its pair is the build's declared "focus ring on the page");
//   - every control's hit target (a visually hidden input is measured by the label it fills): 24 × 24;
//   - that no text node is heavier than 600, and no element or pseudo-element computes a shadow (T5);
//   - which face Chromium drew (CDP CSS.getPlatformFontsForNode): Inter for chrome text and JetBrains
//     Mono for values, both the embedded copies (isCustomFont), never a fallback.
// Then, once:
//   - F1: each domain tab brings its first section's home view; each section brings its home view when
//     it takes focus, and when it scrolls into view; a lever change does not switch the view; Keep this
//     view holds it; the verdict opens Inspect › Contrast and Inspect holds it. The oracle is the
//     HOMES data in the source, not the page's own attributes.
//   - F2: an operation opens the drawer, a success collapses it after a few seconds with the verdict on
//     the bar, a failure and a warning keep it open, an agent's operation opens it, the Activity button
//     shows and hides it at any time, and at 380 a run shows the strip and a failure opens the sheet.
//   - F3: the studio's System theme follows the color scheme, its Dark and Light choices hold, and the
//     plugin follows the Figma theme whatever the studio choice. Reduced motion slows the spinner.
//   - Coverage over the rendered DOM (every domain, advanced open): every manifest lever once.
//   - The page made no network request.
// Exits 1 if anything fails, naming it. With a directory argument it writes one screenshot per state.

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const URL = pathToFileURL(join(HERE, 'concept-v5.html')).href;
const SHOTS = process.argv[2];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const SRC = readFileSync(join(HERE, 'concept-v5.src.html'), 'utf8');
const HOMES = JSON.parse(SRC.match(/<script type="application\/json" id="p3-homes">([\s\S]*?)<\/script>/)[1]);
const MANIFEST = JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'packages', 'engine', 'schema', 'lever-manifest.json'), 'utf8'));
const COLLAPSE_MS = Number(SRC.match(/const COLLAPSE_MS = (\d+);/)[1]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
const requests = [];
page.on('request', (r) => { if (!/^(file|data|about|blob):/.test(r.url())) requests.push(r.url()); });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const cdp = await page.context().newCDPSession(page);
await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
async function usedFonts(selector) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) return null;
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  return fonts;
}
const FONT_PROBES = [
  ['Inter', '#tab-brand'], ['Inter', '.lever .lab label'], ['Inter', '#export-btn'], ['Inter', '.verdict'], ['Inter', '.sec-h h3'],
  ['JetBrains Mono', '.colorfield input[type="text"]'], ['JetBrains Mono', '.rampg .k b'],
];

const fails = [];
const failed = (kind, what, detail = '') => fails.push(`${kind}: ${what}${detail ? ' ' + detail : ''}`);
const wait = (ms) => page.waitForTimeout(ms);
page.setDefaultTimeout(8000);
async function open(hash) {
  await page.goto(`${URL}#${hash}`); await page.reload();
  await page.evaluate(() => document.fonts.ready); await wait(350);
  if (pageErrors.length) { console.error(`audit-v5: page error on #${hash}: ${pageErrors[0]}`); process.exit(1); }
}

// ── rendered measurements ────────────────────────────────────────────────────────────────────
async function measure() {
  return page.evaluate(() => {
    const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] === undefined ? 1 : p[3]]; };
    const allColors = (s) => [...String(s).matchAll(/rgba?\([^)]+\)/g)].map((x) => parse(x[0])).filter((c) => c && c[3] > 0);
    const over = (top, bot) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
    const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    // Every background a pixel behind `el` can have: the composited colors, plus each stripe of a hatch.
    const bgsOf = (el) => {
      const layers = []; const stripes = [];
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (/repeating-linear-gradient/.test(cs.backgroundImage)) stripes.push(...allColors(cs.backgroundImage));
        const c = parse(cs.backgroundColor);
        if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
      }
      let acc = [1, 1, 1, 1];
      for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
      return [acc, ...stripes.map((s) => over(s, acc))];
    };
    const bgOf = (el) => bgsOf(el)[0];
    const worst = (fg, bgs) => Math.min(...bgs.map((b) => ratio(over(fg, b), b)));
    const vis = (el) => el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true }) && el.getClientRects().length > 0;
    const inView = (el) => { const b = el.getBoundingClientRect(); const f = document.getElementById('frame').getBoundingClientRect(); return b.bottom > f.top && b.top < f.bottom && b.right > f.left && b.left < f.right; };
    const name = (el) => {
      const t = (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} "${t}"`;
    };
    const edgeColor = (el) => {
      const cs = getComputedStyle(el); let best = null;
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        const w = parseFloat(cs[`border${s}Width`]); const c = parse(cs[`border${s}Color`]);
        if (w > 0 && cs[`border${s}Style`] !== 'none' && c && c[3] > 0) best = best && best.w >= w ? best : { w, c };
      }
      return best;
    };
    const frame = document.getElementById('frame');
    const inContent = (el) => !!el.closest('[data-content]');
    const out = { text: [], checks: [], fails: [], hits: [], kinds: {} };
    const rec = (what, kind, r, floor) => { const x = { what, kind, r, floor }; if (kind === 'text') out.text.push(x); else { out.checks.push(x); out.kinds[kind] = (out.kinds[kind] || 0) + 1; } if (!(r >= floor)) out.fails.push(x); };

    // text
    for (const el of frame.querySelectorAll('*')) {
      if (!vis(el) || !inView(el) || inContent(el) || el.closest('.sr, option, script, style, svg')) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const isField = el.matches('input[type=text], input[type=number], input[type=search], select, textarea');
      if (!own && !isField) continue;
      const cs = getComputedStyle(el);
      if (isField && !el.value && el.placeholder) { const pc = parse(getComputedStyle(el, '::placeholder').color); if (pc) rec(name(el) + ' (placeholder)', 'text', worst(pc, bgsOf(el)), 4.5); }
      if (!own && isField && !el.value) continue;
      rec(name(el), 'text', worst(parse(cs.color), bgsOf(el)), 4.5);
      const wt = Number(cs.fontWeight); if (wt > 600) out.fails.push({ what: name(el), kind: 'weight above 600', r: wt, floor: 600 });
    }
    // shadows, anywhere outside the brand's preview content
    for (const el of frame.querySelectorAll('*')) {
      if (inContent(el)) continue;
      for (const pseudo of [null, '::before', '::after']) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.boxShadow !== 'none' || cs.textShadow !== 'none') out.fails.push({ what: name(el) + (pseudo || ''), kind: 'shadow (T5)', r: 0, floor: 0 });
      }
    }
    // Every control is REPRESENTED, not counted (docs/34): each visible focusable control outside the
    // harness is classified and measured by what identifies it. One the audit cannot classify fails as
    // an unmarked control, so a control whose edge disappears cannot drop out of the check unnoticed.
    //   edge      a drawn border, measured against what is outside it;
    //   indicator a selected state drawn as an edge (chip, segment, tab underline, pressed button);
    //   switch    the track: its edge when off, its fill when on;
    //   native    a native checkbox or radio: its accent color against the page;
    //   text      identified by its own words (ghost button, link, tab, menu item, disclosure): the text
    //             color at 3:1, on top of the 4.5:1 text check;
    //   glyph     identified by its icon alone (info, icon-only ghost, verdict dot): the glyph at 3:1;
    //   pseudo    drawn by a pseudo-element the page cannot read (range rail and thumb): the build's
    //             declared pairs cover it; the gutter's bar is read by the focus-ring check;
    //   content   part of the brand's own preview ([data-content]): exempt, as the tiles' samples were.
    const TEXTY = '.btn.ghost:not(.icon-only), .lnk, .tab, .mi, .oph, .dbar, .famh button, .pmh, .counts button, summary, .cellb, .seg > button, .strip, .pick label, .vsel select';
    const GLYPHY = '.info, .vbtn, .btn.icon-only.ghost';
    const classify = (el) => {
      if (inContent(el) || el.closest('[data-content]')) return ['content', el];
      if (el.matches('input[type=range]') || el.id === 'gutter') return ['pseudo', el];
      if (el.matches('[role=switch]')) return ['switch', el.closest('.switch')];
      if (el.matches('input[type=radio], input[type=checkbox]') && getComputedStyle(el).opacity === '0') {
        const host = el.closest('.chip, .seg > label, label');
        if (host && edgeColor(host)) return [el.checked ? 'indicator' : 'edge', host];
        if (host && host.matches('.seg > label')) return ['text', host];
        return ['unknown', host || el];
      }
      if (el.matches('input[type=radio], input[type=checkbox]')) return getComputedStyle(el).appearance === 'none' && edgeColor(el) ? [el.checked ? 'indicator' : 'edge', el] : ['native', el];
      if (el.matches('.colorfield input')) return ['edge', el.closest('.colorfield')];
      if (el.matches(TEXTY)) return [edgeColor(el) && el.matches('[aria-pressed=true], [aria-selected=true], [aria-expanded=true]') ? 'indicator' : 'text', el];
      if (el.matches(GLYPHY)) return ['glyph', el];
      if (el.matches('.mxwrap')) return ['region', el];
      if (edgeColor(el)) return [el.matches('[aria-selected=true], [aria-pressed=true]') ? 'indicator' : 'edge', el];
      return ['unknown', el];
    };
    const done = new Set();
    for (const el of frame.querySelectorAll('button, select, input, textarea, summary, a[href], [tabindex="0"]')) {
      if (!vis(el) && !(el.matches('input') && getComputedStyle(el).opacity === '0' && el.parentElement && vis(el.parentElement))) continue;
      if (!inView(el.parentElement) || el.closest('.sr') || el.classList.contains('sr') || el.type === 'hidden') continue;
      const [kind, host] = classify(el);
      if (done.has(host)) continue; done.add(host);
      const outside = bgOf(host.parentElement);
      if (kind === 'content' || kind === 'pseudo' || kind === 'region') { out.kinds[kind] = (out.kinds[kind] || 0) + 1; continue; }
      if (kind === 'unknown') { out.fails.push({ what: name(host), kind: 'unmarked control', r: 0, floor: 0 }); continue; }
      if (kind === 'edge' || kind === 'indicator') { const e = edgeColor(host); rec(name(host), kind, e ? ratio(over(e.c, outside), outside) : 0, 3); continue; }
      if (kind === 'switch') { const t = host.querySelector('.track'); const on = host.querySelector(':checked'); const e = edgeColor(t); rec(name(host), on ? 'switch on' : 'switch off', on ? ratio(bgOf(t), outside) : ratio(over(e.c, outside), outside), 3); continue; }
      if (kind === 'native') { const ac = parse(getComputedStyle(host).accentColor); rec(name(host.labels?.[0] || host), 'native', ac ? worst(ac, bgsOf(host)) : 0, 3); continue; }
      if (kind === 'text') { rec(name(host), 'text-identified', worst(parse(getComputedStyle(host).color), bgsOf(host)), 3); continue; }
      if (kind === 'glyph') { const g = host.querySelector('svg.ico, .dot'); const cs = g && getComputedStyle(g); const c = g ? parse(g.matches('svg') ? cs.color : cs.backgroundColor) : null; rec(name(host), 'glyph-identified', c ? worst(c, bgsOf(host)) : 0, 3); continue; }
      out.fails.push({ what: name(host), kind: `unknown kind ${kind}`, r: 0, floor: 0 });
    }
    for (const el of frame.querySelectorAll('.switch:has(:checked) .track')) if (vis(el) && inView(el)) rec(name(el.closest('.switch')), 'indicator (switch on)', ratio(bgOf(el), bgOf(el.closest('.switch').parentElement)), 3);
    for (const el of frame.querySelectorAll('.switch .knob')) if (vis(el) && inView(el)) rec(name(el.closest('.switch')), 'knob', ratio(parse(getComputedStyle(el).backgroundColor), bgOf(el.parentElement)), 3);
    // glyphs, dots, progress, spinner, underlines
    for (const svg of frame.querySelectorAll('svg.ico')) {
      if (!vis(svg) || !inView(svg) || inContent(svg)) continue;
      const host = svg.closest('button, a, label, span, p, div, li, h3, h4, b') || svg.parentElement;
      rec(name(host), 'glyph', worst(parse(getComputedStyle(svg).color), bgsOf(svg.parentElement)), 3);
    }
    for (const el of frame.querySelectorAll('.dot, .sdot')) {
      if (!vis(el) || !inView(el) || inContent(el)) continue;
      const cs = getComputedStyle(el); const fill = parse(cs.backgroundColor);
      const c = fill && fill[3] > 0 ? fill : parse(cs.borderTopColor);
      rec(name(el.parentElement), 'status dot', ratio(over(c, bgOf(el.parentElement)), bgOf(el.parentElement)), 3);
    }
    for (const el of frame.querySelectorAll('.prog i')) if (vis(el) && inView(el) && el.getBoundingClientRect().width > 0) rec(name(el.closest('[aria-label]') || el.parentElement), 'progress fill', ratio(parse(getComputedStyle(el).backgroundColor), bgOf(el.parentElement)), 3);
    for (const el of frame.querySelectorAll('.spin')) if (vis(el) && inView(el)) { const cs = getComputedStyle(el); rec(name(el.parentElement), 'spinner arc', ratio(parse(cs.borderTopColor), parse(cs.borderRightColor)), 3); }
    for (const el of frame.querySelectorAll('.lnk, .counts button')) if (vis(el) && inView(el) && !inContent(el)) { const cs = getComputedStyle(el); if (cs.textDecorationLine.includes('underline')) rec(name(el), 'underline', worst(parse(cs.textDecorationColor), bgsOf(el)), 3); }

    // hit targets
    for (const el of frame.querySelectorAll('button, input, select, textarea, summary, a[href], [tabindex]:not([tabindex="-1"])')) {
      if (!vis(el) || !inView(el) || el.closest('.sr') || el.classList.contains('sr') || inContent(el) && !el.matches('button, input')) continue;
      if (el.matches('.mxwrap, #lvbody')) continue; // scroll regions, not targets
      let host = el;
      if (el.matches('input[type=radio], input[type=checkbox]')) host = getComputedStyle(el).opacity === '0' || el.matches('[role=switch]') ? (el.closest('label, .switch') || el.parentElement) : (el.labels?.[0] || el);
      if (el.matches('[role=switch]')) host = el.closest('.switch') || el;
      const b = host.getBoundingClientRect(); const x = { what: name(host), w: b.width, h: b.height }; out.hits.push(x);
      if (Math.min(b.width, b.height) < 24 - 0.01) out.fails.push({ ...x, kind: 'hit target', r: Math.min(b.width, b.height), floor: 24 });
    }
    return out;
  });
}

async function focusRings() {
  const rings = []; let capped = false;
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.focus('#brand-btn').catch(() => {});
  await page.keyboard.press('Shift+Tab');
  const seen = new Set();
  for (let i = 0; i < 180; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null;
      if (!a.closest('#frame') && !a.closest('dialog')) return { skip: true };
      const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] ?? 1]; };
      const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c[3] >= 1) return c; } return [1, 1, 1, 1]; };
      const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      const ratio = (x, y) => { const p = L(x), q = L(y); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
      const label = (a.getAttribute('aria-label') || a.labels?.[0]?.textContent || a.textContent || a.value || '').trim().replace(/\s+/g, ' ').slice(0, 36);
      if (!a.dataset.k9) a.dataset.k9 = String(Math.random()).slice(2);
      const what = `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''} "${label}"`;
      if (a.type === 'range') return { id: a.dataset.k9, what, pseudo: true };
      // a ring drawn by the tab's ::before
      const pb = getComputedStyle(a, '::before');
      if (pb.content !== 'none' && parseFloat(pb.borderTopWidth) >= 1 && getComputedStyle(a).outlineStyle === 'none') return { id: a.dataset.k9, what, r: ratio(parse(pb.borderTopColor), bgOf(a)), w: parseFloat(pb.borderTopWidth) };
      // a bar drawn by ::after (the divider)
      const pa = getComputedStyle(a, '::after'); const pac = parse(pa.backgroundColor);
      if (pa.content !== 'none' && pac && pac[3] > 0 && getComputedStyle(a).outlineStyle === 'none') return { id: a.dataset.k9, what, r: ratio(pac, bgOf(a.parentElement)), w: parseFloat(pa.width) };
      let host = null;
      for (let n = a, d = 0; n && d < 3 && !n.matches('#frame, .app, .work'); n = n.parentElement, d++) {
        const cs = getComputedStyle(n);
        if (cs.opacity === '0') continue;
        if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) { host = n; break; }
        const t = n.querySelector?.(':scope > .track'); if (t) { const ts = getComputedStyle(t); if (ts.outlineStyle !== 'none' && parseFloat(ts.outlineWidth) > 0) { host = t; break; } }
      }
      if (!host) return { id: a.dataset.k9, what, none: true };
      const cs = getComputedStyle(host);
      return { id: a.dataset.k9, what, r: ratio(parse(cs.outlineColor), bgOf(host.parentElement)), w: parseFloat(cs.outlineWidth) };
    });
    if (!r) continue;
    if (r.skip) { if (seen.size) break; continue; }
    if (seen.has(r.id)) break; seen.add(r.id); rings.push(r);
    if (i === 179) capped = true;
  }
  return { rings, capped };
}

// ── states ───────────────────────────────────────────────────────────────────────────────────
const STATES = {
  default: '',
  roles: 'domain=color&scrollto=sec-color-3',
  fail: 'scenario=builderr',
  inspect: 'inspect=contrast',
  plugin: 'host=plugin',
};
const results = [];
const fontsSeen = new Set();
for (const theme of ['light', 'dark']) {
  for (const w of ['1280', '380']) {
    for (const [st, h] of Object.entries(STATES)) {
      const isPlugin = st === 'fail' || st === 'plugin';
      const themeKey = isPlugin ? `fig=${theme}` : `theme=${theme}`;
      const hash = [`frame=${w}`, themeKey, h].filter(Boolean).join('&').replace('scrollto=sec-color-3', '');
      await open(hash);
      if (st === 'roles') { await page.evaluate(() => { const el = document.getElementById('sec-color-3'); if (el) scrollWithin(el, 'start'); }); await wait(500); }
      // The screenshot comes first: the focus-ring pass below tabs through the page and moves it.
      if (SHOTS) await page.locator('#frame').screenshot({ path: join(SHOTS, `v5-${theme}-${w}-${st}.png`) });
      const m = await measure();
      const fontFails = [];
      if (w === '1280' && st === 'default') {
        for (const [want, sel] of FONT_PROBES) {
          const got = await usedFonts(sel);
          const ok = got && got.length && got.every((f) => f.familyName === want && f.isCustomFont);
          if (!ok) fontFails.push({ what: sel, kind: `font (want embedded ${want}, drew ${got ? got.map((f) => `${f.familyName}${f.isCustomFont ? '' : ' (system)'}`).join(' + ') : 'nothing'})`, r: 0, floor: 0 });
          else fontsSeen.add(`${want} on ${sel}`);
        }
      }
      const fr = await focusRings();
      const ringFails = fr.rings.filter((r) => r.none || (!r.pseudo && (r.r < 3 || r.w < 2)));
      const all = [...m.fails, ...fontFails, ...ringFails.map((r) => ({ what: r.what, kind: r.none ? 'focus ring (none drawn)' : 'focus ring', r: r.r ?? 0, floor: 3 }))];
      // Each column must have measured something: a LITERAL floor per width, never derived from the page,
      // so a selector that stops matching cannot report an empty column's Infinity as a pass.
      // The 380 floors are set by its smallest state, Inspect › Contrast in the Preview pane (12 Tab
      // stops and 10 targets in view when this was written).
      const FLOOR = { '1280': { text: 80, checks: 40, rings: 35, hits: 30 }, '380': { text: 12, checks: 12, rings: 10, hits: 8 } }[w];
      const counts = { text: m.text.length, checks: m.checks.length, rings: fr.rings.length, hits: m.hits.length };
      for (const [col, n] of Object.entries(counts)) if (n < FLOOR[col]) all.push({ what: `${col} column`, kind: `measured only ${n} (floor ${FLOOR[col]})`, r: 0, floor: 0 });
      const min = (arr) => arr.reduce((a, b) => (b.r < a.r ? b : a), { r: Infinity });
      results.push({ theme, w, st, text: m.text.length, textMin: min(m.text), checks: m.checks.length, checkMin: min(m.checks), rings: fr.rings.length, capped: fr.capped, ringMin: min(fr.rings.filter((r) => !r.pseudo && !r.none)), hits: m.hits.length, hitMin: m.hits.reduce((a, b) => Math.min(a, b.w, b.h), Infinity), kinds: m.kinds, fails: all });
    }
  }
}

// ── F1: the preview follows the section ────────────────────────────────────────────────────────
const view = () => page.evaluate(() => document.getElementById('pvb').dataset.view);
const firstHome = (d) => d.sections.find((s) => !s.advanced).home;
await open('frame=1280&theme=light');
for (const d of HOMES.domains) {
  await page.click(`#tab-${d.id}`); await wait(450);
  const v = await view(); if (v !== firstHome(d)) failed('F1 tab', `${d.label}`, `shows ${v}, want ${firstHome(d)}`);
}
let focusChecks = 0;
for (const d of HOMES.domains) {
  await page.click(`#tab-${d.id}`); await wait(300);
  if (d.sections.some((s) => s.advanced)) { await page.click(`#adv-${d.id}`); await wait(200); }
  for (const [i, s] of d.sections.entries()) {
    const ok = await page.evaluate((id) => { const sec = document.getElementById(id); const f = sec && sec.querySelector('input:not([disabled]), select, button:not([disabled]), [tabindex="0"]'); if (!f) return false; f.focus(); return true; }, `sec-${d.id}-${i}`);
    if (!ok) { failed('F1 focus', `${d.label} › ${s.title}`, 'has no focusable control'); continue; }
    await wait(420); focusChecks++;
    const v = await view(); if (v !== s.home) failed('F1 focus', `${d.label} › ${s.title}`, `shows ${v}, want ${s.home}`);
  }
}
// scroll: Color › Roles scrolled to the top of the levers brings Roles
await page.click('#tab-color'); await wait(300);
await page.evaluate(() => document.activeElement.blur());
await page.evaluate(() => { const b = document.getElementById('lvbody'); const s = document.getElementById('sec-color-3'); b.scrollTop += s.getBoundingClientRect().top - b.getBoundingClientRect().top; }); await wait(600);
{ const v = await view(); const want = HOMES.domains.find((d) => d.id === 'color').sections[3].home; if (v !== want) failed('F1 scroll', 'Color › Roles scrolled into view', `shows ${v}, want ${want}`); }
// a lever change redraws, never switches: Components › Button's label weight (v4 sent it to the Style guide)
await page.click('#tab-components'); await wait(450);
{ const before = await view(); const chip = page.locator('#lv-buttonLabelWeight .chip:not(:has(:checked))').first(); await chip.click(); await wait(600); const v = await view(); if (v !== before) failed('F1 lever', 'Button label weight change switched the view', `${before} → ${v}`); }
// Keep this view holds; releasing it follows the section again
await page.click('#tab-shape'); await wait(450);
await page.click('#pv-pin'); await wait(100);
await page.click('#tab-layout'); await wait(450);
{ const v = await view(); if (v !== 'shape') failed('F1 pin', 'Keep this view', `let the view move to ${v}`); }
await page.click('#pv-pin'); await wait(300);
{ const v = await view(); if (v !== 'layout') failed('F1 pin', 'releasing Keep this view', `shows ${v}, want layout`); }
// the verdict opens Inspect › Contrast, and Inspect holds while the reader moves between sections
await page.click('#verdict-btn'); await wait(300);
{ const v = await view(); const sel = await page.getAttribute('#insp-contrast', 'aria-selected'); if (v !== 'contrast' || sel !== 'true') failed('F1 inspect', 'the verdict', `opened ${v}, want contrast in Inspect`); }
await page.click('#tab-type'); await wait(450);
{ const v = await view(); if (v !== 'contrast') failed('F1 inspect', 'Inspect', `gave way to ${v} on a tab change`); }
await page.click('#insp-close'); await wait(300);
{ const v = await view(); if (v !== 'type') failed('F1 inspect', 'closing Inspect', `shows ${v}, want type`); }
// F1: the reader never picks a view by hand while editing, so the preview header offers no view select.
{ const n = await page.evaluate(() => document.querySelectorAll('#pvh select:not(#pv-mode):not(#pv-cmpmode)').length); if (n) failed('F1 select', 'the preview header', `offers ${n} hand-picked view select(s)`); }
// and the title names the view the section brought
await page.click('#tab-motion'.replace('motion', 'depth')); await wait(450);
{ const t = await page.textContent('#pv-title'); const want = HOMES.views.find(([id]) => id === HOMES.domains.find((d) => d.id === 'depth').sections[0].home)[1]; if (t.trim() !== want) failed('F1 title', 'the preview title', `reads "${t.trim()}", want "${want}"`); }

// ── F2: the Activity drawer ──────────────────────────────────────────────────────────────────
const drawerOpen = () => page.evaluate(() => document.getElementById('drawer').classList.contains('open'));
const opStatus = (k) => page.evaluate((kind) => { const b = document.getElementById(`op-${kind}-h`); return b ? b.textContent : null; }, k);
async function untilDone(kind, max = 30000) { const t0 = Date.now(); while (Date.now() - t0 < max) { const s = await opStatus(kind); if (s && !/Running|Queued/.test(s)) return Date.now(); await wait(150); } return 0; }
await open('frame=1280&host=plugin&fig=light');
{ const open0 = await drawerOpen(); await page.click('#act-btn'); await wait(150); const open1 = await drawerOpen(); await page.click('#act-btn'); await wait(150); const open2 = await drawerOpen();
  if (open0 || !open1 || open2) failed('F2 button', 'the Activity button', `did not show then hide the drawer (${open0} → ${open1} → ${open2})`); }
await page.click('#apply-btn'); await wait(120);
{ if (!(await drawerOpen())) failed('F2 open', 'Apply Theme', 'did not open the drawer when it started');
  const dot = await page.evaluate(() => document.querySelector('#act-btn .sdot')?.className || ''); if (!/run/.test(dot)) failed('F2 dot', 'Activity button', `shows "${dot || 'no dot'}" while running, want the running dot`); }
{ const done = await untilDone('apply'); if (!done) failed('F2 success', 'Apply Theme', 'never finished');
  await wait(600); if (!(await drawerOpen())) failed('F2 success', 'the drawer', 'collapsed before the reader could see the result');
  await wait(COLLAPSE_MS + 1200); if (await drawerOpen()) failed('F2 success', 'the drawer', `still open ${COLLAPSE_MS + 1800}ms after a success`);
  const bar = await page.textContent('#drawer-t'); if (!/Applied/.test(bar)) failed('F2 success', 'the drawer bar', `lost the verdict after collapsing: "${bar.trim()}"`); }
await page.click('[data-h="builderr"]'); await wait(COLLAPSE_MS + 1500);
if (!(await drawerOpen())) failed('F2 failure', 'Build with errors', 'did not keep the drawer open');
{ const dot = await page.evaluate(() => document.querySelector('#act-btn .sdot')?.className || ''); if (!/bad/.test(dot)) failed('F2 dot', 'Activity button', `shows "${dot || 'no dot'}" after a failure`); }
await page.click('[data-h="warn"]'); { const done = await untilDone('readback'); await wait(COLLAPSE_MS + 1200); if (!done || !(await drawerOpen())) failed('F2 warning', 'Read-back warning', 'did not keep the drawer open'); }
await page.click('[data-h="agent"]'); await wait(200);
{ const o = await drawerOpen(); const tag = await page.locator('#drawer .tag.agent').count(); if (!o || !tag) failed('F2 agent', 'Agent working', `drawer open ${o}, agent tag ${tag}`); }
await open('frame=380&host=plugin&fig=light');
await page.click('#more-btn'); await page.click('#mm-apply'); await wait(200);
{ const strip = await page.evaluate(() => !document.getElementById('strip').hidden); const sheet = await page.evaluate(() => document.getElementById('work').classList.contains('sheet')); if (!strip || sheet) failed('F2 380', 'Apply at 380', `strip ${strip}, sheet ${sheet}; want the strip and no sheet`); }
await page.click('[data-h="builderr"]'); await wait(400);
{ const sheet = await page.evaluate(() => document.getElementById('work').classList.contains('sheet') && getComputedStyle(document.getElementById('drawer')).position === 'absolute'); if (!sheet) failed('F2 380', 'Build with errors at 380', 'did not open the full-pane sheet'); }

// ── F3: theme ─────────────────────────────────────────────────────────────────────────────────
const bgNow = () => page.evaluate(() => getComputedStyle(document.getElementById('lvp')).backgroundColor);
await page.emulateMedia({ colorScheme: 'dark' }); await open('frame=1280&theme=system'); const sysDark = await bgNow();
await page.emulateMedia({ colorScheme: 'light' }); await open('frame=1280&theme=system'); const sysLight = await bgNow();
if (sysDark === sysLight) failed('F3 system', 'studio System theme', 'did not follow the color scheme');
await page.click('#theme-btn'); await page.click('#tm-theme-dark'); await wait(150); const pickedDark = await bgNow();
if (pickedDark !== sysDark) failed('F3 choice', 'studio Dark', `did not apply (${pickedDark})`);
await page.emulateMedia({ colorScheme: 'dark' }); await open('frame=1280&theme=light'); const heldLight = await bgNow();
if (heldLight !== sysLight) failed('F3 choice', 'studio Light', 'gave way to the dark color scheme');
await open('frame=1280&theme=light&host=plugin&fig=dark'); const figDark = await bgNow();
if (figDark !== sysDark) failed('F3 plugin', 'plugin', 'did not follow the Figma theme over the studio choice');
await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
await open('frame=1280&host=plugin&scenario=apply'); const spinNormal = await page.evaluate(() => getComputedStyle(document.querySelector('.spin')).animationDuration);
await page.emulateMedia({ reducedMotion: 'reduce' }); await open('frame=1280&host=plugin&scenario=apply'); const spinReduced = await page.evaluate(() => getComputedStyle(document.querySelector('.spin')).animationDuration);
if (spinNormal === spinReduced) failed('reduced motion', 'the spinner', `runs at ${spinNormal} either way`);
await page.emulateMedia({ reducedMotion: 'no-preference' });

// ── coverage over the rendered DOM (oracle: the manifest) ───────────────────────────────────────
await open('frame=fill&theme=light');
const placed = {};
for (const d of HOMES.domains) {
  await page.click(`#tab-${d.id}`); await wait(120);
  if (d.sections.some((s) => s.advanced)) { await page.click(`#adv-${d.id}`); await wait(120); }
  const keys = await page.evaluate(() => [...document.querySelectorAll('#lvbody .lever[data-keys]')].flatMap((el) => el.dataset.keys.split(' ')));
  for (const k of keys) (placed[k] ||= []).push(d.label);
}
const mKeys = MANIFEST.levers.map((l) => l.key);
const covMissing = mKeys.filter((k) => !placed[k]);
const covDup = mKeys.filter((k) => placed[k] && placed[k].length > 1);
if (covMissing.length) failed('coverage (rendered)', 'manifest levers not on screen', covMissing.join(', '));
if (covDup.length) failed('coverage (rendered)', 'manifest levers on screen more than once', covDup.map((k) => `${k} (${placed[k].join(' + ')})`).join(', '));

if (SHOTS) {
  const extra = async (hash, file, js) => { await open(hash); if (js) { await page.evaluate(js); await wait(500); } await page.locator('#frame').screenshot({ path: join(SHOTS, file) }); };
  await page.emulateMedia({ colorScheme: 'light' });
  for (const theme of ['light', 'dark']) {
    await extra(`frame=1280&host=plugin&fig=${theme}&scenario=agent`, `v5-${theme}-1280-agent.png`);
    await extra(`frame=380&theme=${theme}`, `v5-${theme}-380-preview.png`, "document.getElementById('pane-p').click()");
    await extra(`frame=1280&theme=${theme}&domain=shape`, `v5-${theme}-1280-permode.png`, "document.getElementById('pm-radiusScale').click()");
    await extra(`frame=1280&theme=${theme}&domain=color`, `v5-${theme}-1280-picker.png`, "scrollWithin(document.getElementById('sec-color-3'), 'start'); document.getElementById('rc-text-primary-dark')?.click() || (document.getElementById('fam-text').click(), document.getElementById('rc-text-primary-dark')?.click())");
  }
}
await browser.close();

// ── report ────────────────────────────────────────────────────────────────────────────────────
const f = (r) => (Number.isFinite(r) ? `${(Math.floor(r * 100) / 100).toFixed(2)}:1` : '–');
console.log('| Theme | Width | State | Text (min, floor 4.5:1) | Edges, indicators, glyphs (min, floor 3:1) | Focus stops (min ring) | Targets (min px) | Fails |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of results) console.log(`| ${r.theme} | ${r.w} | ${r.st} | ${r.text} (${f(r.textMin.r)}) | ${r.checks} (${f(r.checkMin.r)}) | ${r.rings}${r.capped ? '+' : ''} (${f(r.ringMin.r)}) | ${r.hits} (${Math.round(r.hitMin)}) | ${r.fails.length} |`);
const every = (k) => results.reduce((a, r) => (r[k].r < a.r ? { ...r[k], at: `${r.theme} ${r.w} ${r.st}` } : a), { r: Infinity });
const tMin = every('textMin'), cMin = every('checkMin'), rMin = every('ringMin');
console.log(`\nLowest text: ${f(tMin.r)} (${tMin.what}, ${tMin.at}).`);
console.log(`Lowest 3:1 check: ${f(cMin.r)} (${cMin.kind} ${cMin.what}, ${cMin.at}).`);
console.log(`Lowest focus ring: ${f(rMin.r)} (${rMin.what}, ${rMin.at}).`);
const kindTotals = {}; for (const r of results) for (const [k, n] of Object.entries(r.kinds)) kindTotals[k] = (kindTotals[k] || 0) + n;
console.log(`Controls and indicators by kind, all states: ${Object.entries(kindTotals).map(([k, n]) => `${k} ${n}`).join(', ')}.`);
console.log(`Smallest target: ${Math.round(Math.min(...results.map((r) => r.hitMin)))}px.`);
console.log(`Fonts drawn (CDP, embedded): ${[...fontsSeen].join('; ') || 'none'}.`);
console.log(`F1: ${HOMES.domains.length} tabs, ${focusChecks} section focus checks, scroll, lever change, Keep this view and Inspect checked.`);
console.log(`F2: open on start, collapse ${COLLAPSE_MS}ms after a success, stay open on failure and warning, agent, button, 380 strip and sheet checked.`);
console.log(`F3: System follows the scheme (${sysLight} light, ${sysDark} dark); Dark and Light hold; plugin follows Figma. Spinner ${spinNormal} normally, ${spinReduced} reduced.`);
console.log(`Coverage (rendered): ${mKeys.length - covMissing.length} of ${mKeys.length} manifest levers on screen, ${covDup.length} more than once.`);
console.log(`Network requests: ${requests.length}${requests.length ? ' — ' + requests.slice(0, 3).join(', ') : ''}. Page errors: ${pageErrors.length}${pageErrors.length ? ' — ' + pageErrors.slice(0, 2).join(' | ') : ''}.`);
if (requests.length) failed('network', 'the page made network requests');
if (pageErrors.length) failed('page error', pageErrors[0]);
const detail = (x) => (/^(font|shadow|focus ring \(none|unmarked|unknown|measured only)/.test(x.kind) ? '' : x.kind.startsWith('weight') ? ` ${x.r} > ${x.floor}` : ` ${(x.r || 0).toFixed(2)} < ${x.floor}`);
let n = fails.length;
for (const r of results) for (const x of r.fails) { console.log(`  ✗ ${r.theme} ${r.w} ${r.st}: ${x.kind} ${x.what}${detail(x)}`); n++; }
for (const x of fails) console.log(`  ✗ ${x}`);
console.log(n ? `\naudit-v5: ${n} failure(s)` : '\naudit-v5: every state and behavior passes');
process.exit(n ? 1 : 0);
