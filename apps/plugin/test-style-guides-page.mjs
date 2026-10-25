/**
 * Plugin panel — DOCUMENTATION › STYLE GUIDES (#2909 IA v2 phase 1), through the BUILT `dist/ui.html`.
 *
 *   npm run -w @prism3/plugin build && npm run -w @prism3/plugin test:verdict
 *
 * Run by `test:verdict` after `test-build-verdict.mjs`, with that suite's harness: the panel loaded top-level, the main
 * thread's replies injected with `window.postMessage`, and every message the panel posts caught on the same window. So
 * the page is driven through `write-adapter.ts`'s real validation and the host session's real reducer, and what is
 * asserted is the rendered DOM and the wire. No Figma and no main thread: `test-style-guide-page.ts` drives that side.
 *
 * WHAT MOVED (#2909, owner decisions Q667 A, Q668 A, Q2909.21 A, Q2909.23 A). The Build style guides page the Figma menu
 * opened (S11.2) is now the rail's Documentation area, tab Style guides, in a SETTINGS-ONLY mode: no Draw, no run list,
 * no Cancel, no Close, no cleanup offer. Its choices are kept in the file (`doc-settings-save` / `doc-settings`), and
 * Update file draws the tables with them. The retired-table offer (Q412 A) is Update file's Clean up tab.
 *
 * ONE ARM PER DECISION, each named by it:
 *   · Q667 A, Q2909.21 A: the rail opens Documentation, its four tabs, Style guides first; the page asks for the catalog.
 *   · P8 (re-hosted): before Set up file, a warning with no button: the first Update file sets the file up.
 *   · SG4: a catalog the host could not read says the approved words.
 *   · P2–P5, H4–H9: the tree, kinds, title box, Mode and the options, and every change kept in the file by key.
 *   · Q2909.23 A: a saved record is restored on open; Update file draws the saved selection and options, by literal.
 *   · Q668 A, Q412 A: Clean up lists the retired tables and removes them only on its confirm.
 *   · Q667 A, #2977: the Usage panels and Cover switches save the whole record with that switch flipped.
 *   · #2995: two switches flipped before the host answers the first both stick.
 *   · Q2909.21 A: at 380 the tabs are a select.
 * RETIRED with the run UI (#2909, Q2909.23 A): P1, P6, P7, P9, P11 (the page's run, Draw it again, Cancel, the pinned
 * Draw bar), Close, #2211's disabled Draw skin, #2313 (an agent's run beside the page's list) and #2508 (a quiet run's
 * finish heard once). The page shows no run any more; Activity's own suites hold the run's announcements.
 *
 * INDEPENDENCE (docs/34): every expected value is typed here, in the words a designer reads and the payload the wire
 * carries; the catalog is a literal, and nothing imports the page's model or reads its state.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { hookGuard } from '../studio/test-hooks.mjs';
import { P, loadModes, resolve as resolveToken } from '../studio/chrome/tokens.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const UI = join(ROOT, 'dist/ui.html');
const hooks = hookGuard(import.meta.url);

let failed = 0;
let executed = 0;
const failures = [];
const ok = (cond, label) => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  failures.push(label);
  console.error(`  ✗ ${label}`);
};

if (!existsSync(UI)) {
  console.error(`✗ ${UI} is missing — run \`npm run -w @prism3/plugin build\` first.`);
  process.exit(1);
}
const server = createServer(async (_req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(await readFile(UI)); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const post = (page, msg) => page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), msg);

// ── the file, typed here ──────────────────────────────────────────────────────────────────────────
const CAT = {
  setUp: true,
  collections: [
    { id: 'C:core', name: 'core', modes: ['Default'], items: [
      { name: 'pds3/core/palette/white', table: 0, value: '#FFFFFF' },
      { name: 'pds3/core/palette/black', table: 0, value: '#000000' },
      { name: 'pds3/core/palette/primary/100', table: 1, value: '#E0E0FF' },
      { name: 'pds3/core/palette/primary/200', table: 1, value: '#C0C0FF' },
      { name: 'pds3/core/dimension/4', table: 2, value: '4px' },
      { name: 'pds3/core/dimension/8', table: 2, value: '8px' },
      { name: 'pds3/core/font/size/16', table: 5, value: '16px' },
      { name: 'pds3/core/font/style/display', table: -1, value: 'Bold' },
    ] },
    { id: 'C:color', name: 'color', modes: ['light', 'dark'], items: [
      { name: 'pds3/color/text/primary', table: 3, value: '#111111' },
      { name: 'pds3/color/text/secondary', table: 3, value: '#555555' },
      { name: 'pds3/color/interactive/primary/fill/rest', table: 4, value: '#1E1EFF' },
    ] },
    { id: 'C:border-width', name: 'border-width', modes: ['Default'], items: [{ name: 'pds3/border-width/hairline', table: -1, value: '1px' }] },
    { id: 'text-styles', name: 'Text styles', modes: [], textStyles: true, items: [{ name: 'body/md', table: 6, value: '' }] },
  ],
  tables: [
    { key: 'color|C:core|pds3/core/palette', title: 'Core — base', kind: 'color', page: 'Primitive tokens', rows: 2 },
    { key: 'color|C:core|pds3/core/palette/primary', title: 'Primary', kind: 'color', page: 'Primitive tokens', rows: 2 },
    { key: 'dimension|C:core|pds3/core/dimension', title: 'Dimension', kind: 'dimension', page: 'Primitive tokens', rows: 2 },
    { key: 'color|C:color|pds3/color/text', title: 'Text', kind: 'color', page: 'Semantic tokens', rows: 2 },
    { key: 'color|C:color|pds3/color/interactive', title: 'Interactive', kind: 'color', page: 'Semantic tokens', rows: 1 },
    { key: 'fontSize|C:core|pds3/core/font/size', title: 'Font size', kind: 'font', page: 'Primitive tokens', rows: 1 },
    { key: 'typography|text-styles|body', title: 'Text styles', kind: 'text', page: 'Semantic tokens', rows: 1 },
  ],
  notes: ['Not drawn until a later phase: 1 font style, 1 border width variable'],
};
const ALL_KEYS = CAT.tables.map((t) => t.key);


// ── reading the page ──────────────────────────────────────────────────────────────────────────────
const read = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const text = (s) => q(s)?.textContent ?? null;
  const box = (n) => n?.getAttribute('aria-checked') ?? null;
  return {
    heading: text('[data-p3="docs-heading"]'),
    docTabs: [...document.querySelectorAll('[data-p3="docs-tabs"] [role="tab"]')].map((t) => `${t.textContent}${t.getAttribute('aria-selected') === 'true' ? '*' : ''}`),
    warning: !!q('[data-p3="sg-setup-warning"]'),
    warningText: text('[data-p3="sg-setup-warning"]'),
    warningButton: !!q('[data-p3="sg-setup-warning"] button'),
    summary: text('[data-p3="sg-summary"]'),
    pageButtons: [...(q('[data-p3="style-guides"]')?.querySelectorAll('.p3-btn-primary') ?? [])].length,
    kinds: { color: box(q('[data-p3="sg-kind-color"]')), dimension: box(q('[data-p3="sg-kind-dimension"]')), font: box(q('[data-p3="sg-kind-font"]')), text: box(q('[data-p3="sg-kind-text"]')) },
    mode: (() => { const s = q('[data-p3="sg-mode"]'); return s ? { disabled: s.disabled, options: [...s.options].map((o) => o.textContent) } : null; })(),
    collections: [...(q('[data-p3="sg-collection"]')?.options ?? [])].map((o) => o.textContent),
    groups: [...document.querySelectorAll('[data-p3="sg-group"]')].map((r) => ({
      id: r.dataset.id, name: r.querySelector('.p3-sg-name')?.textContent, box: box(r.querySelector('[data-p3="sg-box"]')),
      disabled: r.querySelector('[data-p3="sg-box"]')?.getAttribute('aria-disabled') === 'true', later: r.querySelector('[data-p3="sg-later"]')?.textContent ?? null,
    })),
    leaves: [...document.querySelectorAll('[data-p3="sg-leaf"]')].map((r) => ({ id: r.dataset.id, boxed: !!r.querySelector('[data-p3="sg-box"]') })),
    titles: q('[data-p3="sg-titles-input"]')?.value ?? null,
    titlesError: text('[data-p3="sg-titles-error"]'),
    groupsShown: Object.entries({ all: '[data-p3="sg-group-all"]', color: '[data-p3="sg-group-color"]', dimension: '[data-p3="sg-group-dimension"]', font: '[data-p3="sg-group-font"]', text: '[data-p3="sg-group-text"]' }).filter(([, sel]) => q(sel)).map(([g]) => g),
    rem: q('[data-p3="sg-opt-rem"]') ? q('[data-p3="sg-opt-rem"]').getAttribute('aria-checked') === 'true' : null,
    tokenNames: [...document.querySelectorAll('[data-p3="sg-opt-token-names"] [role="radio"]')].map((b) => `${b.textContent}${b.getAttribute('aria-checked') === 'true' ? '*' : ''}`),
    nameCell: q('[data-p3="sg-opt-name-cell"]') ? q('[data-p3="sg-opt-name-cell"]').getAttribute('aria-checked') === 'true' : null,
    switchRoles: [...document.querySelectorAll('[data-p3="sg-opt-rem"], [data-p3="sg-opt-name-cell"], [data-p3="sg-opt-aliases"]')].map((n) => n.getAttribute('role')),
    valueFormat: (() => { const s = q('[data-p3="sg-opt-value-format"]'); return s ? { value: s.value, options: [...s.options].map((o) => o.textContent) } : null; })(),
    colorSample: (() => { const s = q('[data-p3="sg-opt-color-sample"]'); return s ? { value: s.value, options: [...s.options].map((o) => o.textContent) } : null; })(),
    fontSample: (() => { const s = q('[data-p3="sg-opt-font-sample"]'); return s ? { value: s.value, options: [...s.options].map((o) => o.textContent) } : null; })(),
    layout: q('[data-p3="frame"]')?.dataset.layout ?? null,
    sent: window.__sent,
  };
});
const sentOf = (st, type) => st.sent.filter((m) => m.type === type);
/** The last Documentation record the panel saved, or null. */
const lastSave = (st) => sentOf(st, 'doc-settings-save').at(-1)?.settings ?? null;
/** Plain JSON with sorted keys, so a payload compares by content, not by its keys' order. */
const canon = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));

/** The file's Documentation record as the host answers it on open (`doc-settings`). Both switches on, nothing saved. */
const RECORD = { panels: true, cover: true, styleGuide: null };

/** A panel on Documentation › Style guides, from the rail, at the given width. The host's record is posted first, as the
 *  main thread posts it on `ui-ready`, so the page can restore from it and save from then on. */
const openPage = async (width = 1280, height = 820, record = RECORD) => {
  const page = await browser.newPage({ viewport: { width, height } });
  await hooks.watch(page);
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await hooks.need(page, '[data-p3="frame"]');
  await page.evaluate(() => {
    window.__sent = [];
    window.addEventListener('message', (e) => { const m = e.data && e.data.pluginMessage; if (m && /^(style-guide|file-setup|doc-settings-save|file-sets|apply-theme|build-components)/.test(m.type)) window.__sent.push(m); });
  });
  await post(page, { type: 'doc-settings', settings: record });
  await hooks.click(page.locator('[data-p3="rail-documentation"]'));
  await hooks.need(page, '[data-p3="documentation"]');
  await hooks.need(page, '[data-p3="style-guides"]');
  return { page, errors };
};
/**
 * WAIT ON THE CONDITION, NEVER ON THE CLOCK (#2171's CI round). The page hears the main thread through `postMessage`,
 * which is asynchronous, and what it posts reaches this window the same way, so every assertion below first waits for
 * the state it reads to have arrived: the message handled, the DOM drawn, the post caught. A wait that runs out is a
 * named ✗ saying what it waited for and what the page showed, and the run goes on; it never throws. The fixed 120 ms
 * sleeps this replaces could read the page before a loaded runner had delivered the message.
 */
const WAIT_MS = 8000;
const until = async (page, label, fn, arg) => {
  try { await page.waitForFunction(fn, arg, { timeout: WAIT_MS }); return true; } catch {
    const saw = await read(page).then((st) => JSON.stringify({ draw: st.draw, warning: st.warning, runLine: st.runLine, tables: st.tables, focus: st.focus, drawerOpen: st.drawerOpen, layout: st.layout, sent: st.sent.map((m) => m.type) }).slice(0, 600), () => 'the page could not be read');
    ok(false, `wait: ${label} — not within ${WAIT_MS} ms; the page showed ${saw}`);
    return false;
  }
};
/** At least `n` messages of `type` posted by the panel (caught on this window). */
const posted = (page, type, n) => until(page, `${n} "${type}" posted`, ([t, k]) => window.__sent.filter((m) => m.type === t).length >= k, [type, n]);
/** #2211 (X4 A, F1 A): what a disabled control on the page draws, beside the Prism3 disabled roles it should draw,
 *  each resolved by the browser through a probe that holds only `var(--p3-…)`, so neither side reads the page's rule. */
const skinOf = (page, hook) => page.evaluate((k) => {
  const el = document.querySelector(`[data-p3="${k}"]`);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const probe = document.createElement('span');
  el.parentElement.append(probe);
  const role = (v) => { probe.style.color = `var(--p3-${v})`; return getComputedStyle(probe).color; };
  const roles = { fill: role('disabled-fill'), edge: role('disabled-edge'), ink: role('disabled-ink') };
  probe.remove();
  const sides = ['top', 'right', 'bottom', 'left'];
  return { roles, bg: cs.backgroundColor, ink: cs.color, edges: sides.map((x) => cs.getPropertyValue(`border-${x}-color`)),
    dashed: sides.filter((x) => cs.getPropertyValue(`border-${x}-style`) === 'dashed') };
}, hook);
/** The page has drawn the catalog's tree. */
const treeDrawn = (page) => until(page, 'the catalog drawn as a tree', () => document.querySelectorAll('[data-p3="sg-group"]').length > 0);
const groupBox = (id) => `[data-p3="sg-group"][data-id="${id}"] [data-p3="sg-box"]`;
/** H4–H9's defaults, as the page saves them: typed here. */
const DEFAULT_OPT = { header: 'dark', aliases: true, description: true, nameCell: false, rem: false, valueFormat: 'hex', colorSample: 'auto',
  dimensionDisplay: 'filled', fontSample: 'auto', paragraphSpacing: false, textDecoration: false, tokenNames: 'full' };

// ── Q667 A, Q2909.21 A, P8 ───────────────────────────────────────────────────────────────────────
console.log('\nopening Documentation, and a file not set up (Q667 A, Q2909.21 A, P8)');
{
  const { page, errors } = await openPage();
  await posted(page, 'style-guide-catalog-request', 1);
  let st = await read(page);
  ok(st.heading === 'Documentation' && st.layout === 'page' && JSON.stringify(st.docTabs) === JSON.stringify(['Style guides*', 'Usage panels', 'Cover', 'Specs']),
    `Q667 A, Q2909.21 A: the rail opens Documentation, full width, tabs Style guides · Usage panels · Cover · Specs, Style guides first (${JSON.stringify({ heading: st.heading, layout: st.layout, tabs: st.docTabs })})`);
  ok(sentOf(st, 'style-guide-catalog-request').length === 1, `the page asks the main thread for the file's catalog once, on open (${sentOf(st, 'style-guide-catalog-request').length})`);
  await post(page, { type: 'style-guide-catalog', catalog: { ...CAT, setUp: false } });
  await until(page, 'the not-set-up warning drawn', () => !!document.querySelector('[data-p3="sg-setup-warning"]'));
  st = await read(page);
  ok(st.warning && st.warningText === 'This file isn’t set up yet. The first Update file sets it up, then draws these tables.' && !st.warningButton,
    `P8 (#2909): not set up: the warning says the first Update file sets the file up, and carries no button of its own (${JSON.stringify({ w: st.warningText, button: st.warningButton })})`);
  ok(st.pageButtons === 0, `Q2909.23 A: the page draws no filled action (no Draw): settings only (${st.pageButtons})`);
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await until(page, 'the set-up catalog adopted: no warning', () => !document.querySelector('[data-p3="sg-setup-warning"]'));
  st = await read(page);
  ok(!st.warning && st.summary === '7 tables · 10 variables, 1 text style', `P12: once set up, the summary reads "7 tables · 10 variables, 1 text style" (${JSON.stringify(st.summary)})`);
  ok(sentOf(st, 'doc-settings-save').length === 0, `Q2909.23 A: opening and reading the file saves nothing (${sentOf(st, 'doc-settings-save').length} saves)`);
  const bar = await page.evaluate(() => ({ figma: [...document.querySelectorAll('[data-p3="top-bar"] button')].filter((b) => b.textContent.trim() === 'Figma').length, update: !!document.querySelector('[data-p3="top-bar"] [data-p3="update-file"]') }));
  ok(bar.figma === 0 && bar.update, `Q668 A: the top bar has no Figma menu, and Update file (${JSON.stringify(bar)})`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── SG4: a catalog the host could not read ───────────────────────────────────────────────────────
console.log('\na file the host could not read (SG4)');
{
  const { page, errors } = await openPage();
  await post(page, { type: 'style-guide-catalog', catalog: { setUp: false, collections: [], tables: [], notes: [] }, error: 'in getLocalVariablesAsync: the document is closed' });
  await until(page, 'the read error drawn', () => !!document.querySelector('[data-p3="sg-read-error"]'));
  const said = await page.evaluate(() => document.querySelector('[data-p3="sg-read-error"]')?.textContent ?? null);
  ok(said === "Couldn't read this file's variables. Close the page and open it again.",
    `SG4: a catalog the host could not read says exactly the approved words, never the host's message (${JSON.stringify(said)})`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── P2, P3, P4, P5, H4–H9, and every change kept in the file (Q2909.23 A) ──────────────────────────
console.log('\nselection and options, saved in the file (P2–P5, H4–H9, Q2909.23 A)');
{
  const { page, errors } = await openPage();
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await treeDrawn(page);
  let st = await read(page);
  ok(st.mode?.disabled === true && JSON.stringify(st.mode.options) === JSON.stringify(['Every mode']), `P4: Mode is "Every mode", fixed (${JSON.stringify(st.mode)})`);
  const modeSkin = await skinOf(page, 'sg-mode');
  ok(modeSkin && modeSkin.dashed.length === 0 && modeSkin.bg === modeSkin.roles.fill && modeSkin.ink === modeSkin.roles.ink && modeSkin.edges.every((c) => c === modeSkin.roles.edge),
    `#2155 F1 A: the fixed Mode select draws the disabled field, no dashed edge (${JSON.stringify(modeSkin)})`);
  ok(JSON.stringify(st.collections) === JSON.stringify(['Every collection', 'core', 'color', 'border-width', 'Text styles']), `the Collection list: every collection, then each, the text styles as "Text styles" (${st.collections})`);
  const bw = st.groups.find((g) => g.name === 'border-width');
  ok(bw?.later === 'Later phase' && bw.disabled && bw.box === 'false', `P5: a later-phase group is tagged "Later phase", and its box is off and cannot be checked (${JSON.stringify(bw)})`);
  await hooks.click(page.locator(groupBox('C:border-width:border-width/pds3/border-width')), { force: true });
  st = await read(page);
  ok(st.groups.find((g) => g.name === 'border-width')?.box === 'false' && st.summary?.startsWith('7 tables') && sentOf(st, 'doc-settings-save').length === 0, 'P5: clicking it checks nothing, and saves nothing');
  ok(JSON.stringify(st.kinds) === JSON.stringify({ color: 'true', dimension: 'true', font: 'true', text: 'true' }), `P2: every kind box starts checked (${JSON.stringify(st.kinds)})`);
  ok(JSON.stringify(st.groupsShown) === JSON.stringify(['all', 'color', 'dimension', 'font', 'text']), `options: a group per kind in the selection (${st.groupsShown})`);
  ok(st.valueFormat?.value === 'hex' && JSON.stringify(st.valueFormat.options) === JSON.stringify(['Hex', 'RGB-A', 'HSL', 'HSB']), `H4: all four value formats, Hex by default (${JSON.stringify(st.valueFormat)})`);
  ok(st.colorSample?.value === 'auto' && JSON.stringify(st.colorSample.options) === JSON.stringify(['From each token’s role', 'Generic', 'Text', 'Border', 'Icon', 'Transparency']),
    `H5: "From each token’s role" and five overrides (${JSON.stringify(st.colorSample)})`);
  ok(st.rem === false, `H6: REM is a switch, off by default (${st.rem})`);
  ok(st.fontSample?.value === 'auto' && JSON.stringify(st.fontSample.options) === JSON.stringify(['From each variable’s kind', 'Generic', 'Family', 'Size', 'Weight', 'Letter spacing', 'Line height']),
    `H7: the font sample list (${JSON.stringify(st.fontSample)})`);
  ok(st.nameCell === false, `H9: the Name cell is off by default (${st.nameCell})`);
  ok(JSON.stringify(st.tokenNames) === JSON.stringify(['Full path*', 'Short']), `#2372: Token names offers Full path and Short, Full path by default (${JSON.stringify(st.tokenNames)})`);
  ok(JSON.stringify(st.switchRoles) === JSON.stringify(['switch', 'switch', 'switch']), `SG5 A: each option switch is a switch to assistive technology, role="switch" (${JSON.stringify(st.switchRoles)})`);

  // P2: the color kind box clears every color table; the tree follows; the file keeps the rest by key.
  await hooks.click(page.locator('[data-p3="sg-kind-color"]'));
  await posted(page, 'doc-settings-save', 1);
  st = await read(page);
  ok(st.kinds.color === 'false' && st.groups.find((g) => g.name === 'color')?.box === 'false' && st.groups.find((g) => g.name === 'core')?.box === 'mixed' && st.summary?.startsWith('3 tables'),
    `P2: the color kind box clears every color table: the color collection unchecks, core goes mixed, the summary counts 3 (${JSON.stringify({ kinds: st.kinds, summary: st.summary })})`);
  ok(canon(lastSave(st)) === canon({ panels: true, cover: true, styleGuide: { tables: [ALL_KEYS[2], ALL_KEYS[5], ALL_KEYS[6]], view: null, titles: '', opt: DEFAULT_OPT } }),
    `Q2909.23 A: the change is kept in the file, the whole record: both switches as the file had them, the tables by key, the defaults (${JSON.stringify(lastSave(st))})`);
  ok(JSON.stringify(st.groupsShown) === JSON.stringify(['all', 'dimension', 'font', 'text']) && st.rem === false,
    `options: with no color selected, no Color group; REM shows for the lengths (${st.groupsShown})`);
  await hooks.click(page.locator(groupBox('C:color:color/pds3/color')));
  await hooks.click(page.locator(groupBox('C:core:core/pds3/core')));
  await hooks.click(page.locator(groupBox('C:core:core/pds3/core')));
  st = await read(page);
  ok(st.kinds.color === 'mixed' && st.kinds.dimension === 'false' && st.summary?.startsWith('3 tables'),
    `P2: checking the color collection in the tree and clearing core leaves the color kind mixed (${JSON.stringify(st.kinds)}, ${st.summary})`);
  await hooks.click(page.locator('[data-p3="sg-titles"] summary'));
  await page.locator('[data-p3="sg-titles-input"]').fill('Text\nNope');
  await until(page, 'the title box read', () => (document.querySelector('[data-p3="sg-titles-error"]')?.textContent ?? '') !== '');
  st = await read(page);
  ok(st.summary === '1 table · 2 variables' && st.titlesError === 'No table is titled “Nope”.' && st.kinds.color === 'mixed',
    `P2, H8: the title box selects exactly the tables it names, and names the one that matches none (${JSON.stringify({ summary: st.summary, err: st.titlesError })})`);
  ok(lastSave(st)?.styleGuide?.titles === 'Text\nNope' && JSON.stringify(lastSave(st)?.styleGuide?.tables) === JSON.stringify([ALL_KEYS[3]]),
    `Q2909.23 A: the title box and the one table it names are kept in the file (${JSON.stringify(lastSave(st)?.styleGuide)})`);
  ok(JSON.stringify(st.groupsShown) === JSON.stringify(['all', 'color']) && st.rem === null, `H1, H6: a color-only selection shows the Color options and no REM (${st.groupsShown}, rem ${st.rem})`);
  await hooks.click(page.locator(groupBox('C:core:core/pds3/core')));
  st = await read(page);
  ok(st.titles === '', `P2: a click in the tree clears the title box (${JSON.stringify(st.titles)})`);
  await hooks.click(page.locator('[data-p3="sg-group"][data-id="C:core:core/pds3/core"] [data-p3="sg-fold"]'));
  await hooks.click(page.locator('[data-p3="sg-group"][data-id="C:color:color/pds3/color"] [data-p3="sg-fold"]'));
  await hooks.click(page.locator('[data-p3="sg-group"][data-id="C:color:color/pds3/color/text"] [data-p3="sg-fold"]'));
  st = await read(page);
  const inText = st.leaves.filter((l) => l.id.startsWith('C:color:color/pds3/color/text/'));
  ok(inText.length === 2 && inText.every((l) => !l.boxed), `P3: whole tables: Text's variables show, with no box of their own (${JSON.stringify(inText)})`);
  const palette = st.leaves.filter((l) => /palette\/(white|black)$/.test(l.id));
  ok(palette.length === 2 && palette.every((l) => l.boxed), `P3: white and black sit in a group spanning two tables, so each carries its table's box (${JSON.stringify(palette)})`);
  const before = sentOf(st, 'doc-settings-save').length;
  await hooks.click(page.locator('[data-p3="sg-opt-token-names-short"]'));
  await posted(page, 'doc-settings-save', before + 1);
  st = await read(page);
  ok(JSON.stringify(lastSave(st)?.styleGuide?.tables) === JSON.stringify([ALL_KEYS[0], ALL_KEYS[1], ALL_KEYS[2], ALL_KEYS[3], ALL_KEYS[5]]) && lastSave(st)?.styleGuide?.opt?.tokenNames === 'short',
    `#2372, Q2909.23 A: a part selection is kept by key, and Token names set to Short with it (${JSON.stringify(lastSave(st)?.styleGuide)})`);
  ok(sentOf(st, 'style-guide').length === 0, `Q2909.23 A: no change on the page draws anything (${sentOf(st, 'style-guide').length} style-guide posted)`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── Q2909.23 A: a saved record is restored, and Update file draws with it ─────────────────────────
// The record is typed here: Primary and Text by key, Token names Short, REM on. Update file's style guides post is
// asserted whole, by literal: the options a run takes, not the page's own spelling of them.
console.log('\na saved record restored, and Update file draws with it (Q2909.23 A)');
const SAVED = { tables: [ALL_KEYS[1], ALL_KEYS[3]], view: null, titles: '', opt: { ...DEFAULT_OPT, tokenNames: 'short', rem: true } };
/** Open Update file on a set-up file holding every set, and run its Style guides item alone. */
const runGuides = async (page) => {
  await hooks.click(page.locator('[data-p3="update-file"]'));
  await posted(page, 'file-sets-request', 1);
  await post(page, { type: 'file-sets', present: [], setUp: true });
  await until(page, 'the checklist drawn', () => !!document.querySelector('[data-p3="update-check-guides"]'));
  const ticks = await page.evaluate(() => ({ theme: document.querySelector('[data-p3="update-check-theme"]')?.getAttribute('aria-checked'), guides: document.querySelector('[data-p3="update-check-guides"]')?.getAttribute('aria-checked') }));
  await hooks.click(page.locator('[data-p3="update-check-theme"]'));
  await hooks.click(page.locator('[data-p3="update-check-guides"]'));
  await hooks.click(page.locator('[data-p3="update-go"]'));
  await posted(page, 'style-guide-catalog-request', 2);
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await posted(page, 'style-guide', 1);
  return ticks;
};
{
  const { page, errors } = await openPage(1280, 820, { panels: true, cover: false, styleGuide: SAVED });
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await treeDrawn(page);
  let st = await read(page);
  ok(st.summary?.startsWith('2 tables') && st.kinds.color === 'mixed' && st.kinds.dimension === 'false' && JSON.stringify(st.tokenNames) === JSON.stringify(['Full path', 'Short*']),
    `Q2909.23 A: on open the page restores the file's record: Primary and Text, color mixed, Token names Short (${JSON.stringify({ summary: st.summary, kinds: st.kinds, tokenNames: st.tokenNames })})`);
  ok(sentOf(st, 'doc-settings-save').length === 0, `Q2909.23 A: restoring saves nothing (${sentOf(st, 'doc-settings-save').length})`);
  const ticks = await runGuides(page);
  ok(ticks.theme === 'true' && ticks.guides === 'false', `Q2909.2 A, Q2909.5 A: on a set-up file the checklist opens with the theme ticked and the style guides not (${JSON.stringify(ticks)})`);
  st = await read(page);
  const drawn = sentOf(st, 'style-guide')[0]?.options;
  const WANT = { header: 'dark', aliases: true, description: true, titleCell: false, rem: true, valueFormat: 'hex', display: 'auto', dimensionDisplay: 'filled',
    fontDisplay: 'auto', paragraphSpacing: false, textDecoration: false, tokenNames: 'short', tables: [ALL_KEYS[1], ALL_KEYS[3]] };
  ok(canon(drawn) === canon(WANT), `Q2909.23 A: Update file draws the saved selection by key, with the saved options (${JSON.stringify(drawn)})`);
  ok(sentOf(st, 'apply-theme').length === 0 && sentOf(st, 'build-components').length === 0, `an unticked item is not run: no theme, no sets (${sentOf(st, 'apply-theme').length}, ${sentOf(st, 'build-components').length})`);
  await post(page, { type: 'style-guide-result', ok: true, headline: '✓ style guide: 2 tables', summary: '2 tables updated in place' });
  await until(page, "Update file idle after the run's verdict", () => document.querySelector('[data-p3="update-file"]')?.getAttribute('aria-busy') !== 'true');
  const busy = await page.evaluate(() => document.querySelector('[data-p3="update-file"]')?.getAttribute('aria-busy'));
  ok(busy !== 'true', `the run ends with the style guide's verdict: Update file is idle again (aria-busy ${busy})`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}
{
  // CONTROL: nothing saved draws every table with the defaults, and no tables filter, so the run judges superseded tables.
  const { page, errors } = await openPage();
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await treeDrawn(page);
  await runGuides(page);
  const st = await read(page);
  const drawn = sentOf(st, 'style-guide')[0]?.options;
  const WANT = { header: 'dark', aliases: true, description: true, titleCell: false, rem: false, valueFormat: 'hex', display: 'auto', dimensionDisplay: 'filled',
    fontDisplay: 'auto', paragraphSpacing: false, textDecoration: false, tokenNames: 'full' };
  ok(canon(drawn) === canon(WANT), `Q2909.23 A, control: with nothing saved, Update file draws every table with the defaults and no tables filter (${JSON.stringify(drawn)})`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── Q668 A, Q412 A: the retired tables are offered in Clean up ───────────────────────────────────
console.log('\nthe retired tables, in Update file › Clean up (Q668 A, Q412 A)');
{
  const { page, errors } = await openPage();
  await post(page, { type: 'style-guide-result', ok: true, headline: '✓ style guide: 7 tables', summary: '7 tables updated in place',
    retired: [{ id: '12:34', name: 'Style guide — Inverse' }, { id: '12:99', name: 'Style guide — Legacy' }] });
  await hooks.click(page.locator('[data-p3="update-file"]'));
  await hooks.click(page.locator('[data-p3="update-tab-clean"]'));
  await until(page, 'the retired tables listed', () => !!document.querySelector('[data-p3="clean-tables"]'));
  const offer = await page.evaluate(() => ({ text: document.querySelector('[data-p3="clean-tables"]')?.textContent ?? '', names: [...document.querySelectorAll('[data-p3="clean-tables"] li')].map((li) => li.textContent),
    label: document.querySelector('[data-p3="clean-tables-confirm"]')?.textContent ?? null }));
  let st = await read(page);
  ok(offer.text.includes('2 style-guide tables the generator no longer draws.') && JSON.stringify(offer.names) === JSON.stringify(['Style guide — Inverse', 'Style guide — Legacy']) && sentOf(st, 'style-guide-cleanup').length === 0,
    `Q668 A, Q412 A: Clean up lists each retired table by name, and removes nothing (${JSON.stringify(offer)})`);
  await hooks.click(page.locator('[data-p3="clean-tables-confirm"]'));
  await posted(page, 'style-guide-cleanup', 1);
  st = await read(page);
  ok(offer.label === 'Remove 2 tables' && JSON.stringify(sentOf(st, 'style-guide-cleanup')[0]?.ids) === JSON.stringify(['12:34', '12:99']),
    `Q412 A: "${offer.label}" asks the main thread to remove exactly the listed tables, by id (${JSON.stringify(sentOf(st, 'style-guide-cleanup')[0])})`);
  await post(page, { type: 'style-guide-cleanup-result', ok: true, removed: ['12:34', '12:99'], summary: '2 tables removed: Style guide — Inverse, Style guide — Legacy' });
  await until(page, 'the retired tables gone from Clean up', () => !document.querySelector('[data-p3="clean-tables"]'));
  ok(await page.locator('[data-p3="clean-tables"]').count() === 0, 'Q412 A: once removed, Clean up no longer offers them');
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── Q667 A, #2977: the Usage panels and Cover switches ────────────────────────────────────────────
console.log('\nthe Usage panels and Cover switches (Q667 A, #2977)');
{
  const record = { panels: true, cover: true, styleGuide: SAVED };
  const { page, errors } = await openPage(1280, 820, record);
  await hooks.click(page.locator('[data-p3="docs-tab-panels"]'));
  await hooks.need(page, '[data-p3="docs-panels-switch"]');
  const on = await page.evaluate(() => ({ sw: document.querySelector('[data-p3="docs-panels-switch"]')?.getAttribute('aria-checked'), off: document.querySelector('[data-p3="docs-panels-off"]')?.hidden }));
  ok(on.sw === 'true' && on.off === true, `Q667 A: Usage panels reads the file's switch, on, and no off line (${JSON.stringify(on)})`);
  await hooks.click(page.locator('[data-p3="docs-panels-switch"]'));
  await posted(page, 'doc-settings-save', 1);
  let st = await read(page);
  ok(canon(lastSave(st)) === canon({ panels: false, cover: true, styleGuide: SAVED }), `Q667 A: the switch saves the whole record, panels off, the rest as the file had it (${JSON.stringify(lastSave(st))})`);
  await post(page, { type: 'doc-settings', settings: { panels: false, cover: true, styleGuide: SAVED } });
  await until(page, 'the panels switch off', () => document.querySelector('[data-p3="docs-panels-switch"]')?.getAttribute('aria-checked') === 'false');
  const offLine = await page.evaluate(() => { const n = document.querySelector('[data-p3="docs-panels-off"]'); return n && !n.hidden ? n.textContent : null; });
  ok(offLine === 'Off: Update file draws no new panels. Panels already in the file stay.', `Q667 A: off, the line says what Update file does (${JSON.stringify(offLine)})`);
  await hooks.click(page.locator('[data-p3="docs-tab-cover"]'));
  await hooks.need(page, '[data-p3="docs-cover-switch"]');
  await hooks.click(page.locator('[data-p3="docs-cover-switch"]'));
  await posted(page, 'doc-settings-save', 2);
  st = await read(page);
  ok(canon(lastSave(st)) === canon({ panels: false, cover: false, styleGuide: SAVED }), `#2977: the cover switch saves the whole record, cover off, panels as the file now has them (${JSON.stringify(lastSave(st))})`);
  await hooks.click(page.locator('[data-p3="docs-tab-specs"]'));
  const specs = await page.evaluate(() => document.querySelector('[data-p3="docs-specs"]')?.textContent ?? null);
  ok(specs === 'Spec sheetsMeasured specs for each component, drawn into the file. Coming later.', `#2830: Specs is a placeholder (${JSON.stringify(specs)})`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── #2995 (nit 6): two switches flipped before the host answers the first ────────────────────────
// Each save is built from the page's own unanswered save, not the host's last echo. EXPECTED is typed here: both off,
// in the second save and on screen through both answers. MUTATION: `saveWith` built from `lend.read()` again
// (`documentation.ts`) → `#2995: the second save keeps the first switch's change`.
console.log('\ntwo switches before the host answers (#2995)');
{
  const record = { panels: true, cover: true, styleGuide: SAVED };
  const { page, errors } = await openPage(1280, 820, record);
  await hooks.click(page.locator('[data-p3="docs-tab-panels"]'));
  await hooks.need(page, '[data-p3="docs-panels-switch"]');
  await hooks.click(page.locator('[data-p3="docs-panels-switch"]'));
  await posted(page, 'doc-settings-save', 1);
  await hooks.click(page.locator('[data-p3="docs-tab-cover"]'));
  await hooks.need(page, '[data-p3="docs-cover-switch"]');
  await hooks.click(page.locator('[data-p3="docs-cover-switch"]'));
  await posted(page, 'doc-settings-save', 2);
  const st = await read(page);
  ok(canon(lastSave(st)) === canon({ panels: false, cover: false, styleGuide: SAVED }),
    `#2995: the second save keeps the first switch's change, panels and cover both off (${JSON.stringify(lastSave(st))})`);
  // The first answer lands: the cover switch the designer just turned off stays off.
  await post(page, { type: 'doc-settings', settings: { panels: false, cover: true, styleGuide: SAVED } });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const mid = await page.evaluate(() => document.querySelector('[data-p3="docs-cover-switch"]')?.getAttribute('aria-checked'));
  ok(mid === 'false', `#2995: the first save's answer does not turn the cover back on (cover switch ${mid})`);
  await post(page, { type: 'doc-settings', settings: { panels: false, cover: false, styleGuide: SAVED } });
  await hooks.click(page.locator('[data-p3="docs-tab-panels"]'));
  await hooks.need(page, '[data-p3="docs-panels-switch"]');
  const end = await page.evaluate(() => document.querySelector('[data-p3="docs-panels-switch"]')?.getAttribute('aria-checked'));
  ok(end === 'false', `#2995: once both are answered, both switches stick off (panels switch ${end})`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── 380 (Q2909.21 A) ─────────────────────────────────────────────────────────────────────────────
console.log('\nat 380 (Q2909.21 A)');
{
  const { page, errors } = await openPage(380, 620);
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await treeDrawn(page);
  const narrow = await page.evaluate(() => {
    const shown = (s) => { const n = document.querySelector(s); return !!n && n.getClientRects().length > 0; };
    return { tabs: shown('[data-p3="docs-tabs"]'), select: shown('[data-p3="docs-select"]') };
  });
  ok(!narrow.tabs && narrow.select, `Q2909.21 A: at 380 Documentation's tabs are a select (${JSON.stringify(narrow)})`);
  await page.selectOption('[data-p3="docs-select"]', 'cover');
  await hooks.need(page, '[data-p3="docs-cover"]');
  ok(await page.locator('[data-p3="docs-cover"]').count() === 1, 'Q2909.21 A: choosing Cover in the select shows the Cover tab');
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

await browser.close();
server.close();
hooks.report(ok);
console.log(`\n${failed === 0 ? '✅' : '❌'} ${executed - failed} of ${executed} Documentation › Style guides assertions pass`);
if (failed) { console.error(`\n${failed} failing:`); for (const f of failures) console.error(`  · ${f}`); }
process.exit(failed === 0 ? 0 : 1);
