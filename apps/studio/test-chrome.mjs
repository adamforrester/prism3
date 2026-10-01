/**
 * `test:chrome` — the new shell's chrome, measured as rendered (UI redesign S1.2,
 * `docs/superpowers/ui-redesign/implementation-plan.md` §6.1 and §6.2).
 *
 *   npm run -w @prism3/studio build && npm run -w @prism3/plugin build
 *   npm run -w @prism3/studio test:chrome [screenshot-dir]
 *
 * It drives BOTH built bundles: the studio's `dist/main.js` and the plugin's `dist/ui.html` (loaded
 * top-level, with Figma's theme stubbed the way `apps/plugin/test-start-screen.mjs` stubs it). So it runs
 * after both builds. A separate suite from `test:smoke` because the axes differ: smoke sweeps page × mode ×
 * brand over the legacy pages; this sweeps host × theme × width over the chrome around them.
 *
 * ── what it holds, each as a literal floor ─────────────────────────────────────────────────────
 *
 *   · TEXT at 4.5:1 (3:1 at a large size), every chrome text node, composited over the ground it is drawn on.
 *   · EDGES AND INDICATORS at 3:1: each control's drawn edge against what is outside it (B1), a selected
 *     tab's underline, and every glyph against its ground.
 *   · FOCUS RINGS: every chrome control reached by Tab draws a ring at least 2px wide, at 3:1 against what
 *     is outside the control.
 *   · TARGETS: every chrome control is at least 24 × 24.
 *   · FONTS DRAWN: CDP `CSS.getPlatformFontsForNode` on every chrome text element — the embedded Inter
 *     (`isCustomFont`), never a device face. Not `document.fonts.check()`, which answers true for a face
 *     that is absent (the v5 finding).
 *   · NO SHADOWS (T5): every chrome element and its `::before` / `::after`.
 *   · NO RUNTIME INLINE VALUES in the chrome: an element outside `[data-content]` with a `style` attribute
 *     fails unless it sets only custom properties (§9.1: the build's raw-value scan reads source text, and
 *     a `${…}` value escapes it).
 *   · NO HORIZONTAL SCROLL at 640 (1280 at 200% zoom, §9.1), at 380 and at 1280.
 *   · CONTROLS REPRESENTED, NOT COUNTED: each column (host × width) names the controls it must render, by
 *     hook, literally; every chrome control must be classified (an unknown one fails); and each column
 *     has literal floors for what was measured.
 *   · THE LAYER ORDER (IA-2): the preview, the levers ground and the top bar are three distinct steps, in
 *     one direction, in both themes.
 *   · ONE HEADER LINE (the owner's QA note Q2): the tab row's divider and the preview title row's divider
 *     at one y, within 0.5px, at 1280, light and dark, with the Color sub-nav and without.
 *   · THE LEGACY FRAME: every place in `LEGACY_PAGES` renders the legacy frame, showing the legacy page
 *     plan §4 maps it to; and a legacy field in a dark theme keeps light UA ink (#1031's mechanism).
 *   · BEHAVIOR: the tab row navigates by click and by arrow key; the theme toggle applies and persists;
 *     the plugin follows Figma's theme live; search (Q3) types in order, keeps its caret, filters, and
 *     closes back to its icon.
 *
 * ── independence (docs/34) ─────────────────────────────────────────────────────────────────────
 *
 * Every color here is read from the RENDER (computed, composited styles), never from `chrome/spec.mjs`'s
 * declared PAIRS, which `lint:contrast` reads; the two are partners, neither derived from the other. The
 * floors, the expected controls, the legacy map, the font name and the layer step are literals written in
 * this file. The legacy map is plan §4's table, typed here, not imported from `src/shell/pages.ts`. The
 * radius lever the search test looks for is read from the committed `schema/lever-manifest.json`, not from
 * the page.
 *
 * WHAT IS SKIPPED, BY A LITERAL LIST AND NEVER BY A MARKER THE PAGE SETS (§4). `LEGACY_PAGES` names the
 * places not moved yet; for those, the legacy page inside the legacy frame is outside the chrome (smoke
 * measures it). The list can only shrink: a listed place that renders the new layout fails by name. Brand
 * content (`[data-content]`) is skipped for color and inline values. `INLINE_EXEMPT` names the one known
 * inline-styled chrome node (the plugin's bottom-left agent chip, which S1.4 removes, D6), and fails as
 * stale the day it stops rendering.
 *
 * ONE FORCED STATE. No page renders the two panes in S1.2 (every place is legacy until S2), so the Q2
 * check sets the frame's `data-layout="panes"` itself, measures the real stylesheet's two header rows,
 * and puts the attribute back. S2 replaces the force with Color › Palettes.
 *
 * NOT COVERED: right-to-left layout (the product ships no RTL locale; new CSS uses logical-friendly
 * flex and grid, §9.1), and text-only zoom.
 *
 * MUTATIONS THIS FAILS BY NAME (each run after a commit, with the diff checked non-empty):
 *   · `.p3-btn` given the page edge (`var(--p3-edge)`) → `edge button "Export" 2.70:1 < 3` (light).
 *   · the tab row painted `bg-page` → `IA-2 layers (light): levers-bg on bg-page 1.00:1 < 1.04`.
 *   · a `box-shadow` set from script on the top bar → `shadow: div.p3-bar …`.
 *   · `style.color` set on the brand switcher's name → `runtime inline value outside [data-content]`.
 *   · the preview header row given its own height → `Q2: … the two dividers are … apart`.
 *   · the search field rebuilt per keystroke → `search: the field reads "radius" after typing it`.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { hookGuard } from './test-hooks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const SHOTS = process.argv[2] ? resolve(process.argv[2]) : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const hooks = hookGuard(import.meta.url);

let failed = 0;
let executed = 0;
const ok = (cond, label) => {
  executed++;
  if (cond) return;
  failed++;
  console.error(`  ✗ ${label}`);
};

// ── the literal floors ───────────────────────────────────────────────────────────────────────────
const TEXT_MIN = 4.5;
const LARGE_TEXT_MIN = 3;
const NONTEXT_MIN = 3;        // edges, indicators, glyphs, focus rings (WCAG 1.4.11)
const FOCUS_WIDTH_MIN = 2;
const TARGET_MIN = 24;
const UI_FONT = 'Inter';      // the embedded face's own family name, as the platform reports it
const LAYER_STEP = 1.04;
const ALIGN_TOLERANCE = 0.5;
const WIDTHS = [{ w: 1280, h: 900 }, { w: 640, h: 900 }, { w: 380, h: 420 }];

/** The places not moved yet. A domain slice that moves a place removes it here, in the same change. */
const LEGACY_PAGES = ['brand', 'color-palettes', 'color-fills', 'color-interactive', 'type', 'shape', 'depth', 'layout', 'components'];

/** Plan §4's table: the legacy page(s) each place shows, by the Pages menu hook's suffix, per host. */
const EXPECT_LEGACY = {
  web: { brand: ['preview'], 'color-palettes': ['palettes'], 'color-fills': ['surfaces'], 'color-interactive': ['interactive'],
    type: ['typography'], shape: ['size-radius'], depth: ['elevation', 'motion'], layout: ['layout'], components: ['size-radius'] },
  figma: { brand: ['preview'], 'color-palettes': ['palettes'], 'color-fills': ['surfaces'], 'color-interactive': ['interactive'],
    type: ['typography'], shape: ['size-radius'], depth: ['elevation', 'motion'], layout: ['layout'], components: ['components'] },
};
/** How each place is reached in the tab row: its tab's hook, then its sub-page's when it has one. */
const PLACE_CLICKS = {
  brand: ['[data-p3="tab-brand"]'],
  'color-palettes': ['[data-p3="tab-color"]', '[data-p3="color-sub-palettes"]'],
  'color-fills': ['[data-p3="tab-color"]', '[data-p3="color-sub-fills"]'],
  'color-interactive': ['[data-p3="tab-color"]', '[data-p3="color-sub-interactive"]'],
  type: ['[data-p3="tab-type"]'],
  shape: ['[data-p3="tab-shape"]'],
  depth: ['[data-p3="tab-depth"]'],
  layout: ['[data-p3="tab-layout"]'],
  components: ['[data-p3="tab-components"]'],
};
/** D8: the Depth & motion switch is labeled with the two legacy page names. */
const DEPTH_SWITCH_LABELS = ['Elevation', 'Motion'];

/** Each column's controls, by hook, on the opening page (Color › Palettes). Wide is 1280 and 640; narrow is
 *  380. Away from Color the sub-pages are not drawn; on Depth & motion the local switch is (`expectFor`). */
const TABS = ['[data-p3="tab-brand"]', '[data-p3="tab-color"]', '[data-p3="tab-type"]', '[data-p3="tab-shape"]', '[data-p3="tab-depth"]', '[data-p3="tab-layout"]', '[data-p3="tab-components"]'];
const COLOR_SUBS = ['[data-p3="color-sub-palettes"]', '[data-p3="color-sub-fills"]', '[data-p3="color-sub-interactive"]'];
const BAR = ['[data-p3="brand-switcher"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="search-open"]'];
const EXPECT_CONTROLS = {
  'web wide': [...BAR, '[data-p3="theme-toggle"]', ...TABS, ...COLOR_SUBS],
  'web narrow': [...BAR, '[data-p3="theme-toggle"]', '[data-p3="tab-select"]', ...COLOR_SUBS],
  'figma wide': [...BAR, '[data-p3="apply-to-figma"]', '[data-p3="prune-open"]', ...TABS, ...COLOR_SUBS],
  'figma narrow': [...BAR, '[data-p3="apply-to-figma"]', '[data-p3="prune-open"]', '[data-p3="tab-select"]', ...COLOR_SUBS],
};
const DEPTH_SWITCH = ['[data-p3="legacy-switch-elevation"]', '[data-p3="legacy-switch-motion"]'];
const expectFor = (column, place) => [
  ...EXPECT_CONTROLS[column].filter((h) => place.startsWith('color-') || !COLOR_SUBS.includes(h)),
  ...(place === 'depth' ? DEPTH_SWITCH : []),
];
/** Per column, the least each measurement must have seen on the opening page, so an empty read fails
 *  naming itself. Set below the measured values (printed per state), above what a chrome that rendered
 *  nothing would give. `PLACE_FLOOR` is the same for every other place, where the sub-pages are gone. */
const FLOORS = {
  'web wide': { text: 12, edges: 15, glyphs: 4, controls: 15, fonts: 12, focus: 7 },
  'web narrow': { text: 4, edges: 18, glyphs: 6, controls: 9, fonts: 4, focus: 7 },
  'figma wide': { text: 14, edges: 22, glyphs: 3, controls: 16, fonts: 14, focus: 8 },
  'figma narrow': { text: 6, edges: 25, glyphs: 5, controls: 10, fonts: 6, focus: 8 },
};
/** The controls Tab must reach on the opening page, by hook: each tablist is one stop (a roving tabindex). */
const FOCUS_STOPS = {
  'web wide': ['[data-p3="brand-switcher"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="theme-toggle"]', '[data-p3="tab-color"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'web narrow': ['[data-p3="brand-switcher"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="theme-toggle"]', '[data-p3="tab-select"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'figma wide': ['[data-p3="brand-switcher"]', '[data-p3="prune-open"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="apply-to-figma"]', '[data-p3="tab-color"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
  'figma narrow': ['[data-p3="brand-switcher"]', '[data-p3="prune-open"]', '[data-p3="export-open"]', '[data-p3="pages-menu"]', '[data-p3="apply-to-figma"]', '[data-p3="tab-select"]', '[data-p3="search-open"]', '[data-p3="color-sub-palettes"]'],
};
const PLACE_FLOOR = { text: 9, edges: 10, glyphs: 3, controls: 12, fonts: 9 };
/** Every chrome control is one of these, by class. A control that is none fails as unclassified. */
const CONTROL_KINDS = [['p3-brand', 'brand switcher'], ['p3-pill-btn', 'status pill'], ['p3-btn', 'button'], ['p3-tab', 'tab'],
  ['p3-seg-tab', 'segment'], ['p3-select', 'select'], ['p3-menu-item', 'menu item'], ['p3-search-input', 'search field']];
/** Inline-styled chrome a later slice removes. Each must still render, or the exemption is stale. */
const INLINE_EXEMPT = [{ sel: '#p3-agent-link', host: 'figma', why: 'the bottom-left agent chip (agent-link-ui.ts), removed by S1.4 (D6)' }];

// ── servers: the studio, and the plugin with Figma's theme stubbed ──────────────────────────────────
const STUDIO = HERE;
let pluginHtml;
try { pluginHtml = readFileSync(join(REPO, 'apps/plugin/dist/ui.html'), 'utf8'); } catch {
  console.error('✗ apps/plugin/dist/ui.html is missing: run `npm run -w @prism3/plugin build` first.');
  process.exit(1);
}
const FIGMA = {
  light: { cls: 'figma-light', vars: { '--figma-color-bg': '#ffffff', '--figma-color-text': '#000000e5' } },
  dark: { cls: 'figma-dark', vars: { '--figma-color-bg': '#2c2c2c', '--figma-color-text': '#ffffff' } },
};
const themedPlugin = (t) => {
  const f = FIGMA[t];
  const style = `<style>:root{${Object.entries(f.vars).map(([k, v]) => `${k}:${v}`).join(';')}}</style>`;
  const out = pluginHtml.replace(/<html([^>]*)>/, `<html$1 class="${f.cls}">`).replace(/<head>/, `<head>${style}`);
  if (out === pluginHtml) throw new Error('the Figma theme stub did not apply to dist/ui.html');
  return out;
};
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.map': 'application/json' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/plugin') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(themedPlugin(url.searchParams.get('figma') === 'dark' ? 'dark' : 'light'));
    return;
  }
  try {
    const p = join(STUDIO, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

/** A booted app on the opening page. Studio: from the start screen's prism3 chip, the OS scheme emulated.
 *  Plugin: Figma's theme stubbed, then the start screen the host asks for, then the first example. */
const open = async ({ host, theme, w, h, store }) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
  const page = await ctx.newPage();
  await hooks.watch(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  if (store) await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, store);
  if (host === 'web') {
    await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
    await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'prism3' }));
  } else {
    await page.goto(`${ORIGIN}/plugin?figma=${theme}`, { waitUntil: 'load' });
    await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
    await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: 'prism3' }));
  }
  await hooks.need(page, '[data-p3="legacy-frame"]');
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, errors };
};

/** Reach a place through the tab row (the select, when narrow), and wait for the frame to show it. */
const goPlace = async (page, place) => {
  const narrow = await page.evaluate(() => document.querySelector('[data-p3="frame"]')?.dataset.w === 'narrow');
  const [tabSel, subSel] = PLACE_CLICKS[place];
  if (narrow) await page.locator('[data-p3="tab-select"]').selectOption(hooks.role(tabSel).slice('tab-'.length));
  else await hooks.click(page.locator(tabSel));
  if (subSel) await hooks.click(page.locator(subSel));
  await page.waitForFunction((p) => document.querySelector('[data-p3="frame"]')?.dataset.place === p, place);
  await page.evaluate(() => document.fonts.ready);
};

// ── the in-page probe ────────────────────────────────────────────────────────────────────────────
/** Everything measurable about the chrome in its current state. `opt.exempt` is INLINE_EXEMPT's selectors. */
const PROBE = (opt) => {
  const frame = document.querySelector('[data-p3="frame"]');
  const unparsed = [];
  const parse = (s, where) => {
    const m = /^rgba?\(([^)]+)\)$/.exec((s ?? '').trim());
    if (!m) { unparsed.push(`${where} "${s}"`); return null; }
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = (c) => {
    const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const fl = (n) => Math.floor(n * 100) / 100;
  /** The opaque ground an element is drawn on: its own background and its ancestors', composited. */
  const groundOf = (el) => {
    let acc = null;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor, `${n.tagName} background`);
      if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return { ...acc, a: 1 }; }
    }
    const canvas = parse(getComputedStyle(document.body).backgroundColor, 'body background') ?? { r: 255, g: 255, b: 255, a: 1 };
    return acc ? over(acc, { ...canvas, a: 1 }) : { ...canvas, a: 1 };
  };
  const label = (el) => {
    const hk = el.getAttribute('data-p3');
    const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return `${el.tagName.toLowerCase()}${hk ? `[${hk}]` : `.${(el.getAttribute('class') ?? '').split(' ')[0]}`} "${name}"`;
  };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const legacyPage = document.querySelector('[data-p3="legacy-page"]');
  const place = frame?.dataset.place ?? '';
  const skipLegacy = opt.legacyPages.includes(place);
  const exempt = opt.exempt.map((s) => document.querySelector(s)).filter(Boolean);
  /** Inside the chrome: in the frame, outside brand content, outside the legacy page of a listed place,
   *  outside the notices' legacy cards and the legacy popovers (pinned light, `styles.css`). */
  const inChrome = (el) => frame?.contains(el)
    && !el.closest('[data-content]')
    && !(skipLegacy && legacyPage?.contains(el))
    && !el.closest('[data-p3="notices"] > *')
    && !el.closest('.barmenu-wrap > [data-theme="light"]');

  const all = [...(frame?.querySelectorAll('*') ?? [])].filter(inChrome);
  const drawn = all.filter(shown);

  // text
  const text = [];
  for (const el of drawn) {
    if (el.closest('svg')) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    const ink = parse(cs.color, `${label(el)} color`);
    if (!ink) continue;
    const g = groundOf(el);
    const px = parseFloat(cs.fontSize), weight = Number(cs.fontWeight);
    const large = px >= 24 || (px >= 18.66 && weight >= 700);
    text.push({ el: label(el), r: fl(ratio(over(ink, g), g)), large });
    el.setAttribute('data-cprobe', 'text');
  }
  // fields: the value a field draws, on its own fill
  const fields = [];
  for (const el of drawn.filter((n) => n.matches('input:not([type="checkbox"]), select'))) {
    const cs = getComputedStyle(el);
    const ink = parse(cs.color, `${label(el)} color`);
    const g = groundOf(el);
    if (ink) fields.push({ el: label(el), r: fl(ratio(over(ink, g), g)), scheme: cs.colorScheme });
  }
  // controls, their kinds, targets, edges
  const CONTROL = 'button, select, input:not([type="hidden"]), [role="tab"], [role="menuitemradio"], a[href]';
  const controls = [];
  const unclassified = [];
  const edges = [];
  for (const el of drawn.filter((n) => n.matches(CONTROL))) {
    const cls = el.getAttribute('class') ?? '';
    const kind = opt.kinds.find(([c]) => cls.split(/\s+/).includes(c));
    if (!kind) { unclassified.push(label(el)); continue; }
    const r = el.getBoundingClientRect();
    controls.push({ el: label(el), kind: kind[1], hook: el.getAttribute('data-p3'), w: r.width, h: r.height });
    const cs = getComputedStyle(el);
    const outside = groundOf(el.parentElement);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (parseFloat(cs[`border${side}Width`]) < 1 || cs[`border${side}Style`] === 'none') continue;
      const c = parse(cs[`border${side}Color`], `${label(el)} border`);
      if (!c || c.a === 0) continue;
      // A tab's underline is drawn on the tab row; every other edge against what is outside the control.
      edges.push({ el: label(el), side, r: fl(ratio(over(c, outside), outside)) });
    }
  }
  // glyphs
  const glyphs = [];
  for (const svg of drawn.filter((n) => n.matches('svg.p3-ico'))) {
    const c = parse(getComputedStyle(svg).color, `${label(svg.parentElement)} glyph`);
    const g = groundOf(svg.parentElement);
    if (c) glyphs.push({ el: `glyph in ${label(svg.parentElement)}`, r: fl(ratio(over(c, g), g)) });
  }
  // shadows, on every chrome element and its pseudo-elements, drawn or not
  const shadows = [];
  for (const el of all) {
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (cs.boxShadow !== 'none' || cs.textShadow !== 'none' || /drop-shadow/.test(cs.filter)) {
        shadows.push(`${label(el)}${pseudo ?? ''}: ${cs.boxShadow !== 'none' ? cs.boxShadow : cs.textShadow !== 'none' ? cs.textShadow : cs.filter}`);
      }
    }
  }
  // runtime inline values, over the whole document outside brand content and the skipped legacy page
  const inline = [];
  for (const el of document.querySelectorAll('[style]')) {
    if (el.closest('[data-content]') || (skipLegacy && legacyPage?.contains(el)) || exempt.some((x) => x.contains(el))) continue;
    if (el.closest('[data-p3="start-screen"]')) continue;
    const props = [...el.style].filter((p) => !p.startsWith('--'));
    if (props.length) inline.push(`${label(el)} sets ${props.slice(0, 4).join(', ')}`);
  }
  // layers (IA-2): the preview pane's, the levers ground's and the top bar's grounds, as computed
  const bg = (sel) => { const n = document.querySelector(sel); return n ? parse(getComputedStyle(n).backgroundColor, `${sel} background`) : null; };
  const layers = { page: bg('[data-p3="preview-pane"] [data-p3="preview-head"]'), body: bg('[data-p3="preview-body"]'), levers: bg('[data-p3="tab-row"]'),
    leversPane: bg('[data-p3="levers-pane"]'), bar: bg('[data-p3="top-bar"]') };
  const L = (c) => (c ? lum(c) : NaN);
  return {
    place, layout: frame?.dataset.layout, w: frame?.dataset.w, theme: document.documentElement.dataset.theme,
    legacyShown: !!legacyPage && shown(legacyPage), panesShown: [...document.querySelectorAll('[data-p3="levers-pane"], [data-p3="preview-body"]')].some(shown),
    legacyPage: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage,
    text, fields, controls, unclassified, edges, glyphs, shadows, inline, unparsed,
    exemptFound: opt.exempt.map((s) => !!document.querySelector(s)),
    layers: {
      leversOnPage: layers.levers && layers.page ? fl(ratio(layers.levers, layers.page)) : null,
      barOnLevers: layers.bar && layers.levers ? fl(ratio(layers.bar, layers.levers)) : null,
      oneDirection: (L(layers.levers) - L(layers.page)) * (L(layers.bar) - L(layers.levers)) > 0,
      paneMatchesRow: JSON.stringify(layers.leversPane) === JSON.stringify(layers.levers),
      bodyMatchesHead: JSON.stringify(layers.body) === JSON.stringify(layers.page),
    },
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
  };
};

/** The fonts every probed text element drew, by CDP — leaf text elements only (a container reports its
 *  descendants' faces, the S1.1 trap). */
const fontsDrawn = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-cprobe="text"]' });
  const out = [];
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId });
    out.push({ el: outerHTML.slice(0, 60), fonts: fonts.map((f) => `${f.familyName}${f.isCustomFont ? '' : ' (device)'}`) });
  }
  await cdp.detach();
  await page.evaluate(() => { for (const n of document.querySelectorAll('[data-cprobe]')) n.removeAttribute('data-cprobe'); });
  return out;
};

/** Tab through the chrome from the top of the page, reading the ring each control draws. */
const focusRings = async (page) => {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.keyboard.press('Tab');
  const seen = [];
  for (let i = 0; i < 30; i++) {
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { done: false, skip: true };
      if (el.closest('[data-p3="legacy-page"]')) return { done: true };
      const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec(s.trim()); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
      const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const groundOf = (n0) => { let acc = null; for (let n = n0; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return { ...acc, a: 1 }; } } return acc ? over(acc, { r: 255, g: 255, b: 255, a: 1 }) : { r: 255, g: 255, b: 255, a: 1 }; };
      const cs = getComputedStyle(el);
      let width = cs.outlineStyle !== 'none' ? parseFloat(cs.outlineWidth) : 0;
      let color = width ? cs.outlineColor : null;
      if (!width) {   // a tab draws its ring on ::before, inside the row's scroll box
        const b = getComputedStyle(el, '::before');
        if (b.content !== 'none' && b.display !== 'none' && b.visibility !== 'hidden' && parseFloat(b.opacity) > 0 && b.borderTopStyle !== 'none') { width = parseFloat(b.borderTopWidth); color = b.borderTopColor; }
      }
      const c = color ? parse(color) : null;
      const g = groundOf(el.parentElement);
      return { hook: el.getAttribute('data-p3') ?? `${el.tagName.toLowerCase()}.${el.className}`, inFrame: !!el.closest('[data-p3="frame"]'),
        width, r: c ? Math.floor(ratio(over(c, g), g) * 100) / 100 : 0 };
    });
    if (r.done) break;
    if (!r.skip && r.inFrame) seen.push(r);
    await page.keyboard.press('Tab');
  }
  return seen;
};

const columnOf = (host, w) => `${host} ${w <= 560 ? 'narrow' : 'wide'}`;
const measure = async (page, where, host, w) => {
  const m = await page.evaluate(PROBE, { legacyPages: LEGACY_PAGES, kinds: CONTROL_KINDS, exempt: INLINE_EXEMPT.filter((x) => x.host === host).map((x) => x.sel) });
  const fonts = await fontsDrawn(page);
  return { ...m, fonts };
};

const check = (m, where, column, floor = FLOORS[column]) => {
  ok(m.unparsed.length === 0, `${where}: every computed color the probe met was parsed${m.unparsed.length ? ` — ${m.unparsed.slice(0, 3).join(' | ')}` : ''}`);
  // the legacy list
  ok(LEGACY_PAGES.includes(m.place), `${where}: place "${m.place}" is in LEGACY_PAGES (no page has moved in S1.2)`);
  if (LEGACY_PAGES.includes(m.place)) {
    ok(m.layout === 'legacy' && m.legacyShown && !m.panesShown, `page ${m.place} is listed as legacy and renders the legacy frame (${where}: layout "${m.layout}", legacy page ${m.legacyShown ? 'shown' : 'hidden'}, panes ${m.panesShown ? 'shown' : 'hidden'})`);
  }
  // text
  ok(m.text.length >= floor.text, `${where}: measured ${m.text.length} chrome text nodes (floor ${floor.text})`);
  const dim = m.text.filter((t) => t.r < (t.large ? LARGE_TEXT_MIN : TEXT_MIN));
  ok(dim.length === 0, `${where}: every chrome text node clears ${TEXT_MIN}:1 (${LARGE_TEXT_MIN}:1 large)${dim.length ? ` — ${dim.slice(0, 4).map((t) => `text ${t.el} ${t.r}:1`).join(' | ')}` : ''}`);
  const fdim = m.fields.filter((f) => f.r < TEXT_MIN);
  ok(fdim.length === 0, `${where}: every chrome field inks its value at ${TEXT_MIN}:1${fdim.length ? ` — ${fdim.map((f) => `${f.el} ${f.r}:1`).join(' | ')}` : ''}`);
  // controls
  ok(m.unclassified.length === 0, `${where}: every chrome control is classified${m.unclassified.length ? ` — unclassified control ${m.unclassified.slice(0, 4).join(', ')}` : ''}`);
  ok(m.controls.length >= floor.controls, `${where}: measured ${m.controls.length} chrome controls (floor ${floor.controls})`);
  const have = new Set(m.controls.map((c) => c.hook));
  for (const want of expectFor(column, m.place)) ok(have.has(hooks.role(want)), `${where}: the chrome renders ${want} and it was measured`);
  const small = m.controls.filter((c) => c.w < TARGET_MIN - 0.01 || c.h < TARGET_MIN - 0.01);
  ok(small.length === 0, `${where}: every chrome control is at least ${TARGET_MIN} × ${TARGET_MIN}${small.length ? ` — ${small.slice(0, 4).map((c) => `${c.el} ${c.w.toFixed(1)} × ${c.h.toFixed(1)}`).join(' | ')}` : ''}`);
  // edges and indicators
  ok(m.edges.length >= floor.edges, `${where}: measured ${m.edges.length} control edges and indicators (floor ${floor.edges})`);
  // One line per control (its weakest side), so the message names every control that fails.
  const weak = [...new Map(m.edges.filter((e) => e.r < NONTEXT_MIN).sort((a, b) => b.r - a.r).map((e) => [e.el, e])).values()];
  ok(weak.length === 0, `${where}: every control edge and indicator clears ${NONTEXT_MIN}:1${weak.length ? ` — ${weak.slice(0, 6).map((e) => `edge ${e.el} ${e.r}:1 < ${NONTEXT_MIN}`).join(' | ')}` : ''}`);
  ok(m.glyphs.length >= floor.glyphs, `${where}: measured ${m.glyphs.length} glyphs (floor ${floor.glyphs})`);
  const faint = m.glyphs.filter((g) => g.r < NONTEXT_MIN);
  ok(faint.length === 0, `${where}: every glyph clears ${NONTEXT_MIN}:1${faint.length ? ` — ${faint.slice(0, 4).map((g) => `${g.el} ${g.r}:1`).join(' | ')}` : ''}`);
  // fonts
  ok(m.fonts.length >= floor.fonts, `${where}: read the drawn fonts of ${m.fonts.length} chrome text elements (floor ${floor.fonts})`);
  const offFace = m.fonts.filter((f) => !f.fonts.length || f.fonts.some((x) => x !== UI_FONT));
  ok(offFace.length === 0, `${where}: every chrome text element draws in the embedded ${UI_FONT}${offFace.length ? ` — ${offFace.slice(0, 3).map((f) => `${f.el} drew ${f.fonts.join(', ') || 'nothing'}`).join(' | ')}` : ''}`);
  // shadows, inline values, overflow
  ok(m.shadows.length === 0, `${where}: no chrome element draws a shadow (T5)${m.shadows.length ? ` — shadow: ${m.shadows.slice(0, 3).join(' | ')}` : ''}`);
  ok(m.inline.length === 0, `${where}: no runtime inline value outside [data-content]${m.inline.length ? ` — ${m.inline.slice(0, 4).join(' | ')}` : ''}`);
  ok(m.overflowX <= 1, `${where}: no horizontal page scroll (${m.overflowX}px past the viewport)`);
  // layers
  const L = m.layers;
  ok(L.leversOnPage !== null && L.leversOnPage >= LAYER_STEP && L.barOnLevers >= LAYER_STEP && L.oneDirection,
    `${where}: IA-2 layers: levers-bg on bg-page ${L.leversOnPage}:1, bar-bg on levers-bg ${L.barOnLevers}:1, each at least ${LAYER_STEP}:1 and in one direction${L.oneDirection ? '' : ' (they turn back)'}`);
  ok(L.paneMatchesRow && L.bodyMatchesHead, `${where}: the levers pane takes the tab row's ground and the preview body the preview head's`);
};

const report = (m, where) => {
  const lo = (xs) => (xs.length ? Math.min(...xs.map((x) => x.r)) : NaN);
  console.log(`  ${where}: ${m.text.length} text (lowest ${lo(m.text)}:1), ${m.controls.length} controls, ${m.edges.length} edges (lowest ${lo(m.edges)}:1), ${m.glyphs.length} glyphs (lowest ${lo(m.glyphs)}:1), ${m.fonts.length} fonts read`);
};

// =============================================================================================
// 1. Every column: host × theme × width, on the opening page, then focus rings
// =============================================================================================
console.log(`\nChrome — host × theme × width\n${'='.repeat(78)}`);
const lows = { text: Infinity, edge: Infinity, focus: Infinity, target: Infinity };
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    for (const { w, h } of WIDTHS) {
      const where = `${host} ${theme} ${w}`;
      const column = columnOf(host, w);
      const { ctx, page, errors } = await open({ host, theme, w, h });
      const m = await measure(page, where, host, w);
      ok(m.theme === (host === 'web' ? 'system' : theme), `${where}: <html data-theme> is "${m.theme}"`);
      check(m, where, column);
      report(m, where);
      for (const t of m.text) lows.text = Math.min(lows.text, t.r);
      for (const e of m.edges) lows.edge = Math.min(lows.edge, e.r);
      for (const c of m.controls) lows.target = Math.min(lows.target, c.w, c.h);
      for (const [i, x] of INLINE_EXEMPT.entries()) if (x.host === host) ok(m.exemptFound[i], `${where}: INLINE_EXEMPT ${x.sel} still renders (${x.why}) — remove the exemption when it does not`);
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `s12-${host === 'web' ? 'studio' : 'plugin'}-${theme}-${w}.png`) });
      // Focus rings: every chrome control Tab reaches.
      const rings = await focusRings(page);
      console.log(`    focus: ${rings.length} controls reached by Tab (lowest ring ${rings.length ? Math.min(...rings.map((r) => r.r)) : NaN}:1)`);
      const reached = new Set(rings.map((r) => r.hook));
      for (const want of FOCUS_STOPS[column]) ok(reached.has(hooks.role(want)), `${where}: Tab reaches ${want} and its ring was measured`);
      ok(rings.length >= FLOORS[column].focus, `${where}: Tab reached ${rings.length} chrome controls (floor ${FLOORS[column].focus})`);
      const badRing = rings.filter((r) => r.width < FOCUS_WIDTH_MIN || r.r < NONTEXT_MIN);
      ok(badRing.length === 0, `${where}: every focused chrome control draws a ring at least ${FOCUS_WIDTH_MIN}px wide at ${NONTEXT_MIN}:1${badRing.length ? ` — ${badRing.slice(0, 4).map((r) => `focus ${r.hook} ${r.width}px ${r.r}:1`).join(' | ')}` : ''}`);
      for (const r of rings) lows.focus = Math.min(lows.focus, r.r);
      ok(errors.length === 0, `${where}: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
      await ctx.close();
    }
  }
}

// =============================================================================================
// 2. Every place: the legacy map, the layout, and the chrome on each (1280, light and dark)
// =============================================================================================
console.log(`\nPlaces — the tab row and the legacy frame\n${'='.repeat(78)}`);
for (const host of ['web', 'figma']) {
  for (const theme of ['light', 'dark']) {
    const { ctx, page, errors } = await open({ host, theme, w: 1280, h: 900 });
    for (const place of Object.keys(PLACE_CLICKS)) {
      await goPlace(page, place);
      const where = `${host} ${theme} 1280 / ${place}`;
      const want = EXPECT_LEGACY[host][place];
      const shows = await page.evaluate(() => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage);
      ok(shows === want[0], `${where}: the tab row lands on legacy page "${want[0]}" (plan §4) — shows "${shows}"`);
      if (want.length > 1) {
        // D8: the local switch, its labels, and the second page through it.
        const labels = (await page.locator('[data-p3="legacy-switch"] [role="tab"]').allTextContents()).map((s) => s.trim());
        ok(JSON.stringify(labels) === JSON.stringify(DEPTH_SWITCH_LABELS), `${where}: the local switch reads ${JSON.stringify(DEPTH_SWITCH_LABELS)} — read ${JSON.stringify(labels)}`);
        await hooks.click(page.locator('[data-p3="legacy-switch-motion"]'));
        await page.waitForFunction((p) => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage === p, want[1]);
        ok(true, `${where}: the switch's second item shows "${want[1]}"`);
        const sel = await page.evaluate(() => [...document.querySelectorAll('[role="tab"][aria-selected="true"]')].map((t) => t.textContent.trim()));
        ok(sel.includes('Depth & motion') && sel.includes('Motion'), `${where}: the tab and the switch both stay selected (${sel.join(', ')})`);
      }
      const m = await measure(page, where, host, 1280);
      check(m, where, columnOf(host, 1280), PLACE_FLOOR);
    }
    ok(errors.length === 0, `${host} ${theme} places: 0 console errors${errors.length ? ` — ${errors.slice(0, 2).join(' | ')}` : ''}`);
    await ctx.close();
  }
}

// =============================================================================================
// 3. Q2: one header line across the split (1280, light and dark, with and without the sub-nav)
// =============================================================================================
console.log(`\nQ2 — the tab row and the preview title row share one divider\n${'='.repeat(78)}`);
for (const theme of ['light', 'dark']) {
  const { ctx, page } = await open({ host: 'web', theme, w: 1280, h: 900 });
  for (const place of ['color-palettes', 'brand']) {
    await goPlace(page, place);
    const where = `${theme} 1280 / ${place}`;
    // FORCED (see the header): no page renders the two panes until S2.
    const g = await page.evaluate(() => {
      const frame = document.querySelector('[data-p3="frame"]');
      const was = frame.dataset.layout;
      frame.dataset.layout = 'panes';
      const line = (sel) => { const n = document.querySelector(sel); if (!n) return null; const r = n.getBoundingClientRect(); return { bottom: r.bottom, h: r.height, border: getComputedStyle(n).borderBottomWidth, shown: r.width > 0 && r.height > 0 }; };
      const out = { nav: line('[data-p3="tab-row"]'), head: line('[data-p3="preview-head"]'), sub: line('[data-p3="sub-nav"]') };
      frame.dataset.layout = was;
      return out;
    });
    ok(g.nav?.shown && g.head?.shown, `Q2 ${where}: both header rows render in the two-pane layout`);
    ok(g.nav?.border === '1px' && g.head?.border === '1px', `Q2 ${where}: both rows draw a bottom divider (${g.nav?.border}, ${g.head?.border})`);
    const gap = g.nav && g.head ? Math.abs(g.nav.bottom - g.head.bottom) : Infinity;
    ok(gap <= ALIGN_TOLERANCE, `Q2 ${where}: the tab row's divider and the preview title row's divider are ${gap.toFixed(2)}px apart (tolerance ${ALIGN_TOLERANCE}px)`);
    if (place === 'color-palettes') ok(g.sub?.shown && g.sub.bottom > g.nav.bottom, `Q1 ${where}: the Color sub-nav sits under the tab row's divider`);
  }
  await ctx.close();
}

// =============================================================================================
// 4. #1031 in a dark theme: a legacy field keeps light UA ink
// =============================================================================================
console.log(`\n#1031 — legacy fields in a dark theme\n${'='.repeat(78)}`);
for (const host of ['web', 'figma']) {
  const { ctx, page } = await open({ host, theme: 'dark', w: 1280, h: 900 });
  const f = await page.evaluate(() => {
    const parse = (s) => { const m = /^rgba?\(([^)]+)\)$/.exec(s.trim()); const p = m ? m[1].split(/[,\s/]+/).filter(Boolean).map(Number) : [0, 0, 0, 0]; return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = (c) => { const f2 = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f2(c.r) + 0.7152 * f2(c.g) + 0.0722 * f2(c.b); };
    const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const ground = (n0) => { let acc = null; for (let n = n0; n && n.nodeType === 1; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; } } return acc ? over(acc, parse(getComputedStyle(document.body).backgroundColor)) : parse(getComputedStyle(document.body).backgroundColor); };
    const fields = [...document.querySelectorAll('[data-p3="legacy-page"] input[type="text"], [data-p3="legacy-page"] input:not([type]), [data-p3="legacy-page"] select')]
      .filter((n) => n.getBoundingClientRect().width > 0);
    return { doc: getComputedStyle(document.documentElement).colorScheme, fields: fields.map((n) => {
      const cs = getComputedStyle(n); const g = ground(n); const x = lum(over(parse(cs.color), g)), y = lum(g);
      return { name: n.getAttribute('data-p3') ?? n.className, value: n.value, scheme: cs.colorScheme, r: Math.floor(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100 };
    }) };
  });
  const where = `${host} dark / Color › Palettes`;
  ok(/\bdark\b/.test(f.doc), `${where}: the document resolves a dark color-scheme ("${f.doc}") — the premise this check is about`);
  ok(f.fields.length >= 1, `${where}: measured ${f.fields.length} legacy field(s) (floor 1)`);
  const bad = f.fields.filter((x) => /\bdark\b/.test(x.scheme) || x.r < TEXT_MIN);
  ok(bad.length === 0, `${where}: every legacy field resolves a light color-scheme and inks its value at ${TEXT_MIN}:1${bad.length ? ` — ${bad.map((x) => `${x.name} "${x.value}" ${x.scheme} ${x.r}:1`).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
// 5. Behavior: tabs by key, the theme toggle, Figma's theme live, the theme menu's own chrome
// =============================================================================================
console.log(`\nBehavior\n${'='.repeat(78)}`);
{
  const { ctx, page } = await open({ host: 'web', theme: 'light', w: 1280, h: 900 });
  await goPlace(page, 'type');
  await page.locator('[data-p3="tab-type"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'shape');
  const k = await page.evaluate(() => ({ focus: document.activeElement?.getAttribute('data-p3'), sel: document.querySelector('[data-p3="tab-shape"]')?.getAttribute('aria-selected'), shows: document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage }));
  ok(k.focus === 'tab-shape' && k.sel === 'true' && k.shows === 'size-radius', `ArrowRight on Type selects Shape, keeps focus on it, and shows its legacy page (${JSON.stringify(k)})`);

  // The theme menu, open: its own chrome, measured (light and, after choosing it, dark).
  await hooks.click(page.locator('[data-p3="theme-toggle"]'));
  await hooks.need(page, '[data-p3="theme-menu"]');
  const menu = await measure(page, 'web light 1280 / theme menu open', 'web', 1280);
  const items = new Set(menu.controls.map((c) => c.hook));
  for (const want of ['[data-p3="theme-option-light"]', '[data-p3="theme-option-dark"]', '[data-p3="theme-option-system"]']) ok(items.has(hooks.role(want)), `theme menu: ${want} is rendered and measured`);
  check(menu, 'web light 1280 / theme menu open', 'web wide', PLACE_FLOOR);
  await hooks.click(page.locator('[data-p3="theme-option-dark"]'));
  const t = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem('prism3:chromeTheme'), bar: getComputedStyle(document.querySelector('[data-p3="top-bar"]')).backgroundColor }));
  ok(t.theme === 'dark' && t.stored === 'dark', `choosing Dark sets <html data-theme="dark"> and keeps it (${JSON.stringify(t)})`);
  await page.reload({ waitUntil: 'networkidle' });
  await hooks.need(page, '[data-p3="legacy-frame"]');
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  ok(after === 'dark', `the theme choice survives a reload (data-theme "${after}")`);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 's12-studio-dark-1280-chosen.png') });
  await ctx.close();
}
{
  const { ctx, page } = await open({ host: 'figma', theme: 'light', w: 1280, h: 900 });
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.evaluate(() => document.documentElement.classList.replace('figma-light', 'figma-dark'));
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  const bar = await page.evaluate(() => getComputedStyle(document.querySelector('[data-p3="top-bar"]')).backgroundColor);
  ok(before === 'light', `the plugin starts on Figma's light theme (data-theme "${before}")`);
  ok(bar !== 'rgb(233, 233, 233)', `the plugin follows Figma to dark live: the top bar repaints (${bar})`);
  const toggles = await page.locator('[data-p3="theme-toggle"]').count();
  hooks.absent(ok, { seen: await page.locator('[data-p3="top-bar"]').count() === 1, state: 'the plugin\'s top bar' }, toggles === 0, 'the plugin offers no theme toggle (it follows Figma)');
  await ctx.close();
}

// =============================================================================================
// 6. Search (the owner's QA note Q3): typed in order, caret kept, filtered, closed back to its icon
// =============================================================================================
console.log(`\nSearch (Q3)\n${'='.repeat(78)}`);
const manifest = JSON.parse(readFileSync(join(REPO, 'packages/engine/schema/lever-manifest.json'), 'utf8'));
const labelOf = (key) => manifest.levers.find((l) => l.key === key)?.label;
const RADIUS = labelOf('radiusScale');
const DENSITY = labelOf('density');
ok(!!RADIUS && !!DENSITY, `the manifest names the radius lever ("${RADIUS}") and the density lever ("${DENSITY}")`);
for (const { w, h } of [{ w: 1280, h: 900 }, { w: 380, h: 420 }]) {
  const { ctx, page } = await open({ host: 'web', theme: 'light', w, h });
  await goPlace(page, 'shape');
  const where = `search ${w}`;
  const opener = await page.evaluate(() => { const b = document.querySelector('[data-p3="search-open"]'); const r = b.getBoundingClientRect(); return { name: b.getAttribute('aria-label'), w: r.width, h: r.height }; });
  ok(opener.name === 'Search settings' && opener.w >= TARGET_MIN && opener.h >= TARGET_MIN, `${where}: the magnifier is named "Search settings" and is at least ${TARGET_MIN}px (${JSON.stringify(opener)})`);
  await hooks.click(page.locator('[data-p3="search-open"]'));
  await hooks.need(page, '[data-p3="search-input"]');
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-p3'));
  ok(focused === 'search-input', `${where}: opening search focuses its field (focus on ${focused})`);
  const field = await page.evaluate(() => { const n = document.querySelector('[data-p3="search-input"]'); n.dataset.cid = 'same'; return true; });
  await page.keyboard.type('radius', { delay: 20 });
  const r = await page.evaluate((labels) => {
    const input = document.querySelector('[data-p3="search-input"]');
    const knobs = [...document.querySelectorAll('[data-p3="legacy-page"] .knob')];
    const vis = (k) => k.getBoundingClientRect().height > 0;
    const named = (l) => knobs.find((k) => k.querySelector('.knob-label, .chips-legend')?.textContent.trim() === l);
    return { value: input.value, same: input.dataset.cid === 'same', status: document.querySelector('[data-p3="search-status"]')?.textContent,
      visible: knobs.filter(vis).length, radius: !!named(labels[0]) && vis(named(labels[0])), density: named(labels[1]) ? vis(named(labels[1])) : null };
  }, [RADIUS, DENSITY]);
  ok(field && r.value === 'radius', `search: the field reads "radius" after typing it (${where}: read "${r.value}")`);
  ok(r.same, `${where}: the field is the same element after typing (never rebuilt)`);
  ok(r.radius, `${where}: the results contain the radius lever ("${RADIUS}")`);
  ok(r.density === false, `${where}: a setting that does not match ("${DENSITY}") is hidden (${r.density === null ? 'not on the page' : 'visible'})`);
  ok(r.status === `${r.visible} settings match`, `${where}: the status line counts what is shown ("${r.status}", ${r.visible} shown)`);
  // The caret holds: Home, then a keystroke, lands at the start.
  await page.keyboard.press('Home');
  await page.keyboard.type('x');
  const caret = await page.evaluate(() => document.querySelector('[data-p3="search-input"]').value);
  ok(caret === 'xradius', `${where}: the caret holds where it is put (Home, then "x", reads "${caret}")`);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `s12-studio-light-${w}-search.png`) });
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => ({ focus: document.activeElement?.getAttribute('data-p3'), open: document.querySelector('[data-p3="search"]')?.dataset.open, hidden: document.querySelectorAll('[data-search-hidden]').length }));
  ok(closed.focus === 'search-open' && closed.open === 'false' && closed.hidden === 0, `${where}: Escape closes search, clears the filter, and returns focus to the magnifier (${JSON.stringify(closed)})`);
  await ctx.close();
}

hooks.report(ok);
console.log(`\nLowest chrome text ${lows.text}:1, lowest edge or indicator ${lows.edge}:1, lowest focus ring ${lows.focus}:1, smallest target ${lows.target.toFixed(1)}px.`);
console.log(`${executed - failed}/${executed} chrome assertions passed.`);
await browser.close();
server.close();
if (failed) process.exit(1);
