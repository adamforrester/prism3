// Prism3 concept v6: rendered audit, behavior checks and screenshots.
//
//   PLAYWRIGHT_MODULE=<repo>/node_modules/playwright/index.mjs \
//     node docs/superpowers/ui-redesign/audit-v6.mjs [screenshot dir]
//
// Renders the BUILT concept-v6.html in Chromium and measures what is on screen, independent of the
// build's declared pairs. v5's audit, extended to v6. Every state runs in light and dark, at 1280 and
// at 380: each Color sub-page with Roles off and on (Palettes, Surfaces & fills, Interactive), Brand,
// Depth & motion, Layout, the build failure (plugin), Inspect › Contrast, the plugin, and the plugin
// with the Agent popover open. At 380 the Roles, Depth and Layout states show the Preview pane.
// In each it measures, outside the brand's own preview content ([data-content]):
//   - every visible text node, field value and placeholder against its composited background: 4.5:1
//     (a hatched background is measured against its darkest stripe);
//   - every control's drawn edge against what is outside it (B1: on white, on the gray levers panel,
//     on the top bar, in an inset), every selected indicator, every glyph, status dot, progress fill,
//     spinner arc and link underline: 3:1;
//   - the focus ring of every stop in the Tab order: 3:1 and at least 2px;
//   - every control's hit target: 24 × 24;
//   - that no text node is heavier than 600, and no element or pseudo-element computes a shadow (T5);
//   - which face Chromium drew (CDP CSS.getPlatformFontsForNode): the embedded Inter and JetBrains Mono.
// Then, once, the v6 behavior. The oracles are literals below (the owner's decisions), not the page:
//   - V1, IA-1: each tab and sub-page shows its one home (EXPECT_HOME), and the title names it;
//     scrolling the levers panel, focusing any section and changing a lever never change the preview;
//     the preview header offers no view select.
//   - V12: nothing on the page offers "Keep this view".
//   - V2: on each Color sub-page, Roles switches the preview to the editable role × mode matrix of that
//     sub-page's families only (ROLE_FAMILIES), with the header row and role column pinned, derived
//     columns hatched and read-only, light cells editable with the swatch-grid step picker (V9); and
//     the view's own tab switches back.
//   - IA-2: the preview, the levers panel and the top bar are three distinct, ordered surfaces, and the
//     controls on the gray panel are white-filled.
//   - IA-3: the plugin's top bar has an Agent chip that opens a popover holding the switch; the chip
//     says Off, then On; the Activity drawer holds no switch; the agent scenario shows "Agent: On".
//   - F2 and F3 from v5: the drawer, the theme and reduced motion.
//   - Coverage over the rendered DOM (every page, advanced open): every manifest lever once.
//   - The page made no network request.
// Exits 1 if anything fails, naming it. With a directory argument it writes one screenshot per state.

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const URL = pathToFileURL(join(HERE, 'concept-v6.html')).href;
const SHOTS = process.argv[2];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const SRC = readFileSync(join(HERE, 'concept-v6.src.html'), 'utf8');
const HOMES = JSON.parse(SRC.match(/<script type="application\/json" id="p3-homes">([\s\S]*?)<\/script>/)[1]);
const MANIFEST = JSON.parse(readFileSync(join(HERE, '..', '..', '..', 'packages', 'engine', 'schema', 'lever-manifest.json'), 'utf8'));
const COLLAPSE_MS = Number(SRC.match(/const COLLAPSE_MS = (\d+);/)[1]);

// The owner's IA (IA-1, V1): each page and its one preview. A literal, so a HOMES edit that swaps or
// drops a home fails here by name, and a new page must be added here on purpose.
const EXPECT_HOME = {
  brand: ['guide', 'Style guide'],
  'color/palettes': ['palettes', 'Palettes'],
  'color/fills': ['surfaces', 'Surfaces & fills'],
  'color/interactive': ['interactive', 'Interactive'],
  type: ['type', 'Type'],
  shape: ['shape', 'Size & shape'],
  depth: ['depth', 'Depth & motion'],
  layout: ['layout', 'Layout'],
  components: ['comps', 'Components'],
};
// V2: the role families each Color sub-page's Roles matrix may show (a family header must start with
// one of `allow`), and the ones it must show (`need`). From the decision, not from HOMES.
const ROLE_FAMILIES = {
  palettes: { allow: ['text', 'icon'], need: ['text', 'icon'], deny: ['text.link', 'icon.link'] },
  fills: { allow: ['background', 'foreground', 'border', 'inverse', 'scrim', 'veil'], need: ['background', 'foreground', 'border', 'inverse.background'], deny: ['inverse.interactive', 'inverse.text.link'] },
  interactive: { allow: ['interactive', 'inverse.interactive', 'text.link', 'icon.link', 'inverse.text.link', 'inverse.icon.link', 'disabled', 'inverse.disabled', 'field', 'inverse.field'], need: ['interactive.primary', 'text.link'], deny: [] },
};

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
  ['Inter', '#sub-palettes'], ['Inter', '.card > header h3'],
  ['JetBrains Mono', '.colorfield input[type="text"]'], ['JetBrains Mono', '.sqk b'],
];

const fails = [];
const failed = (kind, what, detail = '') => fails.push(`${kind}: ${what}${detail ? ' ' + detail : ''}`);
const wait = (ms) => page.waitForTimeout(ms);
page.setDefaultTimeout(8000);
async function open(hash) {
  await page.goto(`${URL}#${hash}`); await page.reload();
  await page.evaluate(() => document.fonts.ready); await wait(350);
  if (pageErrors.length) { console.error(`audit-v6: page error on #${hash}: ${pageErrors[0]}`); process.exit(1); }
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
      if (el.matches('.btn.primary:not([disabled])')) return ['fill', el];
      if (el.matches(TEXTY)) return [edgeColor(el) && el.matches('[aria-pressed=true], [aria-selected=true], [aria-expanded=true]') ? 'indicator' : 'text', el];
      if (el.matches(GLYPHY)) return ['glyph', el];
      if (el.matches('.mxwrap')) return ['region', el];
      if (edgeColor(el)) return [el.matches('[aria-selected=true], [aria-pressed=true], [aria-expanded=true]') ? 'indicator' : 'edge', el];
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
      if (kind === 'fill') { rec(name(host), 'fill', ratio(bgOf(host), outside), 3); continue; }
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
    for (const el of frame.querySelectorAll('.dot, .sdot, .adot')) {
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
  for (let i = 0; i < 200; i++) {
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
      const pb = getComputedStyle(a, '::before');
      if (pb.content !== 'none' && parseFloat(pb.borderTopWidth) >= 1 && getComputedStyle(a).outlineStyle === 'none') return { id: a.dataset.k9, what, r: ratio(parse(pb.borderTopColor), bgOf(a)), w: parseFloat(pb.borderTopWidth) };
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
    if (i === 199) capped = true;
  }
  return { rings, capped };
}

// ── states ───────────────────────────────────────────────────────────────────────────────────
// [hash, what to do after load (or null), show the Preview pane at 380]
const STATES = {
  palettes: ['', null, false],
  'palettes-roles': ['domain=color&sub=palettes&roles=1', null, true],
  fills: ['domain=color&sub=fills', null, false],
  'fills-roles': ['domain=color&sub=fills&roles=1', null, true],
  interactive: ['domain=color&sub=interactive', null, false],
  'interactive-roles': ['domain=color&sub=interactive&roles=1', null, true],
  brand: ['domain=brand', null, false],
  depth: ['domain=depth', null, true],
  layout: ['domain=layout', null, true],
  fail: ['scenario=builderr', null, false],
  inspect: ['inspect=contrast', null, false],
  plugin: ['host=plugin', null, false],
  agentpop: ['host=plugin', 'agent', false],
};
const PLUGINISH = new Set(['fail', 'plugin', 'agentpop']);
const results = [];
const fontsSeen = new Set();
for (const theme of ['light', 'dark']) {
  for (const w of ['1280', '380']) {
    for (const [st, [h, act, pv380]] of Object.entries(STATES)) {
      const themeKey = PLUGINISH.has(st) ? `fig=${theme}` : `theme=${theme}`;
      const hash = [`frame=${w}`, themeKey, h].filter(Boolean).join('&');
      await open(hash);
      if (w === '380' && pv380) { await page.click('#pane-p'); await wait(250); }
      if (act === 'agent') { await page.click(w === '380' ? '#agent-btn-n' : '#agent-btn'); await wait(250); }
      // The screenshot comes first: the focus-ring pass below tabs through the page and moves it.
      if (SHOTS) await page.locator('#frame').screenshot({ path: join(SHOTS, `v6-${theme}-${w}-${st}.png`) });
      const m = await measure();
      const fontFails = [];
      if (w === '1280' && st === 'palettes') {
        for (const [want, sel] of FONT_PROBES) {
          const got = await usedFonts(sel);
          const ok = got && got.length && got.every((f) => f.familyName === want && f.isCustomFont);
          if (!ok) fontFails.push({ what: sel, kind: `font (want embedded ${want}, drew ${got ? got.map((f) => `${f.familyName}${f.isCustomFont ? '' : ' (system)'}`).join(' + ') : 'nothing'})`, r: 0, floor: 0 });
          else fontsSeen.add(`${want} on ${sel}`);
        }
      }
      const fr = act === 'agent' ? { rings: [], capped: false } : await focusRings();
      const ringFails = fr.rings.filter((r) => r.none || (!r.pseudo && (r.r < 3 || r.w < 2)));
      const all = [...m.fails, ...fontFails, ...ringFails.map((r) => ({ what: r.what, kind: r.none ? 'focus ring (none drawn)' : 'focus ring', r: r.r ?? 0, floor: 3 }))];
      // Each column must have measured something: a LITERAL floor per width, never derived from the page,
      // so a selector that stops matching cannot report an empty column's Infinity as a pass. The popover
      // state skips the ring pass (tabbing out would close it), so its ring floor is 0. Set below the
      // smallest v6 state when this was written: at 1280, Brand (50 text) and Depth & motion (27 Tab
      // stops, 32 targets); at 380, Depth & motion and Layout in the Preview pane (10 text, 8 stops).
      const FLOOR = { '1280': { text: 40, checks: 40, rings: 20, hits: 25 }, '380': { text: 8, checks: 12, rings: 6, hits: 6 } }[w];
      const counts = { text: m.text.length, checks: m.checks.length, rings: fr.rings.length, hits: m.hits.length };
      for (const [col, n] of Object.entries(counts)) { const floor = col === 'rings' && act === 'agent' ? 0 : FLOOR[col]; if (n < floor) all.push({ what: `${col} column`, kind: `measured only ${n} (floor ${floor})`, r: 0, floor: 0 }); }
      const min = (arr) => arr.reduce((a, b) => (b.r < a.r ? b : a), { r: Infinity });
      const edges = m.checks.filter((c) => c.kind === 'edge');
      results.push({ theme, w, st, text: m.text.length, textMin: min(m.text), checks: m.checks.length, checkMin: min(m.checks), edgeMin: min(edges), edgeMax: edges.reduce((a, b) => (b.r > a.r ? b : a), { r: -Infinity }), rings: fr.rings.length, capped: fr.capped, ringMin: min(fr.rings.filter((r) => !r.pseudo && !r.none)), hits: m.hits.length, hitMin: m.hits.reduce((a, b) => Math.min(a, b.w, b.h), Infinity), kinds: m.kinds, fails: all });
    }
  }
}

// ── V1, IA-1: each tab and sub-page shows its one home ──────────────────────────────────────────
const view = () => page.evaluate(() => document.getElementById('pvb').dataset.view);
const title = () => page.evaluate(() => (document.querySelector('#pvh .pvtabs [aria-selected="true"]') || document.getElementById('pv-title'))?.textContent.trim() || '');
const pagesOf = (d) => (d.subpages ? d.subpages.map((sp) => ({ key: `${d.id}/${sp.id}`, d, sp })) : [{ key: d.id, d, sp: null }]);
const PAGES = HOMES.domains.flatMap(pagesOf);
for (const k of Object.keys(EXPECT_HOME)) if (!PAGES.some((p) => p.key === k)) failed('V1 home', k, 'is in the decided IA but the page has no such tab or sub-page');
for (const p of PAGES) if (!EXPECT_HOME[p.key]) failed('V1 home', p.key, 'is a page the decided IA does not have (add it to EXPECT_HOME on purpose)');
async function goto(p) {
  await page.click(`#tab-${p.d.id}`); await wait(200);
  if (p.sp) { await page.click(`#sub-${p.sp.id}`); await wait(200); }
}
await open('frame=1280&theme=light');
{ const v = await view(); if (v !== EXPECT_HOME['color/palettes'][0]) failed('V1 open', 'the view on open', `is ${v}, want palettes (v5 Q2)`); }
let homeChecks = 0, scrollChecks = 0, focusChecks = 0;
for (const p of PAGES) {
  const want = EXPECT_HOME[p.key]; if (!want) continue;
  await goto(p);
  const v = await view(); const t = await title(); homeChecks++;
  if (v !== want[0]) failed('V1 home', p.key, `shows ${v}, want ${want[0]}`);
  if (t !== want[1]) failed('V1 title', p.key, `reads "${t}", want "${want[1]}"`);
  // Scroll the levers to the middle and the bottom: the preview stays.
  for (const at of [0.5, 1]) {
    await page.evaluate((f) => { const b = document.getElementById('lvbody'); b.scrollTop = (b.scrollHeight - b.clientHeight) * f; b.dispatchEvent(new Event('scroll')); }, at); await wait(600); scrollChecks++;
    const v2 = await view(); if (v2 !== want[0]) failed('V1 scroll', `${p.key} scrolled to ${at * 100}%`, `changed the preview to ${v2}`);
  }
  // Open the advanced sections too, then focus the first control of every section: the preview stays.
  if (await page.$(`#lvbody [data-act="adv"][aria-expanded="false"]`)) { await page.click('#lvbody [data-act="adv"]'); await wait(200); }
  const n = await page.evaluate(() => document.querySelectorAll('#lvbody .sec').length);
  for (let i = 0; i < n; i++) {
    const ok = await page.evaluate((i) => { const sec = document.querySelectorAll('#lvbody .sec')[i]; const f = sec && sec.querySelector('input:not([disabled]), select, button:not([disabled]), [tabindex="0"]'); if (!f) return false; f.focus(); return true; }, i);
    if (!ok) continue; await wait(350); focusChecks++;
    const v3 = await view(); if (v3 !== want[0]) failed('V1 focus', `${p.key} section ${i + 1}`, `changed the preview to ${v3}`);
  }
}
// A lever change redraws, never switches: Components › Button label weight.
await page.click('#tab-components'); await wait(300);
{ const before = await view(); await page.locator('#lv-buttonLabelWeight .chip:not(:has(:checked))').first().click(); await wait(600); const v = await view(); if (v !== before) failed('V1 lever', 'Button label weight change switched the view', `${before} → ${v}`); }
// The preview header offers no hand-picked view select.
{ const n = await page.evaluate(() => document.querySelectorAll('#pvh select:not(#pv-mode):not(#pv-cmpmode)').length); if (n) failed('V1 select', 'the preview header', `offers ${n} hand-picked view select(s)`); }
// Inspect: the verdict opens Contrast; a page change closes Inspect and shows that page's home.
await page.click('#verdict-btn'); await wait(300);
{ const v = await view(); const sel = await page.getAttribute('#insp-contrast', 'aria-selected'); if (v !== 'contrast' || sel !== 'true') failed('inspect', 'the verdict', `opened ${v}, want contrast in Inspect`); }
await page.click('#insp-close'); await wait(300);
{ const v = await view(); if (v !== 'comps') failed('inspect', 'closing Inspect', `shows ${v}, want comps`); }

// ── V12: nothing offers "Keep this view" ──────────────────────────────────────────────────────
for (const p of PAGES) {
  await goto(p);
  const hits = await page.evaluate(() => [...document.querySelectorAll('#frame *')].filter((el) => /keep this view/i.test(el.getAttribute('aria-label') || '') || ([...el.childNodes].some((n) => n.nodeType === 3 && /keep this view/i.test(n.textContent)))).map((el) => el.id || el.tagName.toLowerCase()));
  const pin = await page.$('#pv-pin');
  if (hits.length || pin) failed('V12 keep', p.key, `offers Keep this view (${[...hits, pin ? '#pv-pin' : ''].filter(Boolean).join(', ')})`);
}

// ── V2: the Roles toggle on each Color sub-page ───────────────────────────────────────────────
let rolesChecks = 0;
for (const p of PAGES.filter((x) => x.d.id === 'color')) {
  const spec = ROLE_FAMILIES[p.sp.id]; if (!spec) { failed('V2 roles', p.key, 'has no decided role families'); continue; }
  await goto(p);
  const home = EXPECT_HOME[p.key][0];
  if (!(await page.$('#pvt-roles'))) { failed('V2 roles', p.key, 'has no Roles toggle beside the preview title'); continue; }
  await page.click('#pvt-roles'); await wait(300); rolesChecks++;
  { const v = await view(); if (v !== 'roles') failed('V2 roles', `${p.key} Roles`, `shows ${v}, want the role × mode matrix`); }
  // Open every family, then read the matrix.
  for (let guard = 0; guard < 40; guard++) { const b = await page.$('#pvb .famh button[aria-expanded="false"]'); if (!b) break; await b.click(); await wait(80); }
  const mx = await page.evaluate(() => {
    const fams = [...document.querySelectorAll('#pvb .famh button')].map((b) => b.getAttribute('data-fam'));
    const head = document.querySelector('#pvb .mx thead th'); const rn = document.querySelector('#pvb .mx tbody .rn');
    const cols = [...document.querySelectorAll('#pvb .mx thead th')].map((th) => th.textContent.trim());
    const lightCell = document.querySelector('#pvb .mx td:nth-child(2) .cellb');
    const derTd = document.querySelector('#pvb .mx td.der .cellb');
    return {
      fams, cols,
      headSticky: head && getComputedStyle(head).position === 'sticky', roleSticky: rn && getComputedStyle(rn).position === 'sticky',
      lightEditable: !!lightCell && lightCell.tagName === 'BUTTON' && !lightCell.disabled, lightId: lightCell?.id || null,
      derived: derTd ? { disabled: derTd.disabled, hatched: /repeating-linear-gradient/.test(getComputedStyle(derTd.closest('td')).backgroundImage) } : null,
    };
  });
  if (!mx.fams.length) failed('V2 roles', p.key, 'drew no role families');
  const bad = mx.fams.filter((f) => !spec.allow.some((a) => f === a || f.startsWith(a + '.')) || spec.deny.some((d) => f === d || f.startsWith(d + '.')));
  if (bad.length) failed('V2 families', p.key, `shows families from another sub-page: ${bad.join(', ')}`);
  const lacking = spec.need.filter((n) => !mx.fams.some((f) => f === n || f.startsWith(n + '.')));
  if (lacking.length) failed('V2 families', p.key, `lacks ${lacking.join(', ')}`);
  if (!mx.headSticky || !mx.roleSticky) failed('V2 pinned', p.key, `header row sticky ${mx.headSticky}, role column sticky ${mx.roleSticky}`);
  if (!mx.lightEditable) failed('V2 editable', p.key, 'the light column is not editable');
  if (!mx.derived) failed('V2 derived', p.key, 'shows no derived column');
  else if (!mx.derived.disabled || !mx.derived.hatched) failed('V2 derived', p.key, `derived cells disabled ${mx.derived.disabled}, hatched ${mx.derived.hatched}`);
  if (mx.lightId) {
    await page.click(`#${mx.lightId}`); await wait(250);
    const steps = await page.evaluate(() => document.querySelectorAll('#pvb .picker .steps .stp').length);
    if (steps < 20) failed('V9 picker', p.key, `the light cell opened ${steps} step swatches, want the 20-step grid`);
    await page.keyboard.press('Escape'); await wait(150);
  }
  await page.click('#pvt-home'); await wait(300);
  { const v = await view(); if (v !== home) failed('V2 back', p.key, `the view's tab shows ${v}, want ${home}`); }
}
// A role that fails in Inspect › Contrast opens in its own sub-page's matrix (gotoRole).
await page.evaluate(() => gotoRole('text.link.default', 'light')); await wait(300);
{ const r = await page.evaluate(() => ({ v: document.getElementById('pvb').dataset.view, sub: document.querySelector('#subtabs [aria-selected="true"]')?.id, pick: !!document.querySelector('#pvb .picker') })); if (r.v !== 'roles' || r.sub !== 'sub-interactive' || !r.pick) failed('V2 goto', 'text.link.default', `opened ${r.v} on ${r.sub}, picker ${r.pick}; want Interactive › Roles with the picker`); }

// ── IA-2: three surfaces, in order; white controls on the gray panel ──────────────────────────
const layers = {};
for (const theme of ['light', 'dark']) {
  await open(`frame=1280&theme=${theme}`);
  const L = await page.evaluate(() => {
    const parse = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map((x) => Number(x) / 255);
    const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lum = (s) => { const c = parse(s); return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); };
    const bg = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor;
    const out = { preview: bg('#pvb .card') && bg('#pvp'), levers: bg('#lvp'), bar: bg('#top'), search: bg('#lv-search'), card: bg('#lvbody .sec') };
    out.l = { preview: lum(out.preview), levers: lum(out.levers), bar: lum(out.bar) };
    return out;
  });
  layers[theme] = L;
  const r = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const s1 = r(L.l.preview, L.l.levers), s2 = r(L.l.levers, L.l.bar);
  const dir = [Math.sign(L.l.levers - L.l.preview), Math.sign(L.l.bar - L.l.levers)];
  if (s1 < 1.04 || s2 < 1.04 || dir[0] !== dir[1] || dir[0] === 0) failed('IA-2 layers', theme, `preview ${L.preview}, levers ${L.levers}, top bar ${L.bar}: steps ${s1.toFixed(2)} and ${s2.toFixed(2)}, want two steps of 1.04:1 or more, one way`);
  if (L.search !== L.preview || L.card !== L.preview) failed('IA-2 fields', theme, `a field (${L.search}) or card (${L.card}) on the gray panel is not the preview's white (${L.preview})`);
}

// ── IA-3: the Agent chip ──────────────────────────────────────────────────────────────────────
await open('frame=1280&host=plugin&fig=light');
{
  const t0 = (await page.textContent('#agent-btn').catch(() => '')).trim();
  if (!/Agent: Off/.test(t0)) failed('IA-3 chip', 'the top bar', `reads "${t0 || 'no chip'}", want "Agent: Off"`);
  await page.click('#agent-btn'); await wait(200);
  const sw = await page.$('#agent-menu [role=switch]');
  if (!sw) failed('IA-3 popover', 'the Agent chip', 'opened no popover with the switch');
  else {
    await page.click('#agent-sw'); await wait(200);
    const t1 = (await page.textContent('#agent-btn')).trim();
    if (!/Agent: On/.test(t1)) failed('IA-3 chip', 'after the switch', `reads "${t1}", want "Agent: On"`);
    const stillOpen = await page.$('#agent-menu'); if (!stillOpen) failed('IA-3 popover', 'the switch', 'closed the popover it sits in');
  }
  await page.keyboard.press('Escape'); await wait(150);
  await page.click('#act-btn'); await wait(200);
  const inDrawer = await page.evaluate(() => document.querySelectorAll('#drawer [role=switch]').length);
  if (inDrawer) failed('IA-3 drawer', 'the Activity drawer', `still holds ${inDrawer} switch(es)`);
}
await open('frame=1280&host=plugin&fig=light&scenario=agent');
{ const t = (await page.textContent('#agent-btn')).trim(); if (!/Agent: On/.test(t)) failed('IA-3 scenario', 'Agent working', `the chip reads "${t}", want "Agent: On"`); }
await open('frame=380&host=plugin&fig=light');
{ const n = await page.$('#agent-btn-n'); if (!n || !(await n.isVisible())) failed('IA-3 380', 'the top row', 'has no Agent chip'); }

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
const bgNow = () => page.evaluate(() => getComputedStyle(document.getElementById('pvp')).backgroundColor);
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
for (const p of PAGES) {
  await goto(p);
  if (await page.$('#lvbody [data-act="adv"][aria-expanded="false"]')) { await page.click('#lvbody [data-act="adv"]'); await wait(120); }
  const keys = await page.evaluate(() => [...document.querySelectorAll('#lvbody .lever[data-keys]')].flatMap((el) => el.dataset.keys.split(' ')));
  for (const k of keys) (placed[k] ||= []).push(p.key);
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
    await extra(`frame=1280&host=plugin&fig=${theme}&scenario=agent`, `v6-${theme}-1280-agent.png`);
    await extra(`frame=380&theme=${theme}`, `v6-${theme}-380-palettes-preview.png`, "document.getElementById('pane-p').click()");
    await extra(`frame=380&theme=${theme}&domain=color&sub=fills`, `v6-${theme}-380-fills-preview.png`, "document.getElementById('pane-p').click()");
    await extra(`frame=1280&theme=${theme}&domain=color&sub=fills`, `v6-${theme}-1280-fills-picker.png`, "document.getElementById('fl-brand').click(); setTimeout(() => scrollWithin(document.getElementById('fl-brand'), 'start'), 50)");
    await extra(`frame=1280&theme=${theme}&domain=color&sub=fills`, `v6-${theme}-1280-gradients.png`, "scrollWithin(document.getElementById('lv-gradients'), 'start'); const c = [...document.querySelectorAll('#pvb .card')].pop(); scrollWithin(c, 'start')");
    await extra(`frame=1280&theme=${theme}&domain=color&sub=palettes&roles=1`, `v6-${theme}-1280-roles-picker.png`, "document.getElementById('rc-text-secondary-light')?.click()");
    await extra(`frame=1280&theme=${theme}&domain=color&sub=interactive`, `v6-${theme}-1280-interactive-links.png`, "const c = document.querySelectorAll('#pvb .card')[1]; scrollWithin(c, 'start')");
    await extra(`frame=1280&theme=${theme}&domain=depth`, `v6-${theme}-1280-depth-motion.png`, "scrollWithin(document.getElementById('dv-motion'), 'start')");
  }
}
await browser.close();

// ── report ────────────────────────────────────────────────────────────────────────────────────
const f = (r) => (Number.isFinite(r) ? `${(Math.floor(r * 100) / 100).toFixed(2)}:1` : '–');
console.log('| Theme | Width | State | Text (min, floor 4.5:1) | Edges, indicators, glyphs (min, floor 3:1) | Field edges (min–max) | Focus stops (min ring) | Targets (min px) | Fails |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of results) console.log(`| ${r.theme} | ${r.w} | ${r.st} | ${r.text} (${f(r.textMin.r)}) | ${r.checks} (${f(r.checkMin.r)}) | ${f(r.edgeMin.r)}–${f(r.edgeMax.r)} | ${r.rings}${r.capped ? '+' : ''} (${f(r.ringMin.r)}) | ${r.hits} (${Math.round(r.hitMin)}) | ${r.fails.length} |`);
const every = (k) => results.reduce((a, r) => (r[k].r < a.r ? { ...r[k], at: `${r.theme} ${r.w} ${r.st}` } : a), { r: Infinity });
const tMin = every('textMin'), cMin = every('checkMin'), rMin = every('ringMin'), eMin = every('edgeMin');
const eMax = results.reduce((a, r) => (r.edgeMax.r > a.r ? { ...r.edgeMax, at: `${r.theme} ${r.w} ${r.st}` } : a), { r: -Infinity });
console.log(`\nLowest text: ${f(tMin.r)} (${tMin.what}, ${tMin.at}).`);
console.log(`Lowest 3:1 check: ${f(cMin.r)} (${cMin.kind} ${cMin.what}, ${cMin.at}).`);
console.log(`Control edges (B1): lowest ${f(eMin.r)} (${eMin.what}, ${eMin.at}); highest ${f(eMax.r)} (${eMax.what}, ${eMax.at}).`);
console.log(`Lowest focus ring: ${f(rMin.r)} (${rMin.what}, ${rMin.at}).`);
const kindTotals = {}; for (const r of results) for (const [k, n] of Object.entries(r.kinds)) kindTotals[k] = (kindTotals[k] || 0) + n;
console.log(`Controls and indicators by kind, all states: ${Object.entries(kindTotals).map(([k, n]) => `${k} ${n}`).join(', ')}.`);
console.log(`Smallest target: ${Math.round(Math.min(...results.map((r) => r.hitMin)))}px.`);
console.log(`Fonts drawn (CDP, embedded): ${[...fontsSeen].join('; ') || 'none'}.`);
console.log(`V1: ${homeChecks} pages each on their one home, ${scrollChecks} scroll checks, ${focusChecks} section focus checks, a lever change and Inspect checked; the header offers no view select.`);
console.log(`V12: no page offers Keep this view. V2: ${rolesChecks} Roles toggles checked (families, pinned header and role column, hatched derived columns, editable light cells, the step picker, back to the home view).`);
console.log(`IA-2: light ${layers.light?.preview} / ${layers.light?.levers} / ${layers.light?.bar}; dark ${layers.dark?.preview} / ${layers.dark?.levers} / ${layers.dark?.bar} (preview / levers / top bar).`);
console.log('IA-3: the Agent chip reads Off, opens the switch, reads On; the drawer holds no switch; the agent scenario reads On; the chip is in the 380 top row.');
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
console.log(n ? `\naudit-v6: ${n} failure(s)` : '\naudit-v6: every state and behavior passes');
process.exit(n ? 1 : 0);
