/**
 * Plugin panel — THE BUILD STYLE GUIDES PAGE (UI redesign S11.2), through the BUILT `dist/ui.html`.
 *
 *   npm run -w @prism3/plugin build && npm run -w @prism3/plugin test:verdict
 *
 * Run by `test:verdict` after `test-build-verdict.mjs`, with that suite's harness: the panel loaded top-level, the main
 * thread's replies injected with `window.postMessage`, and every message the panel posts caught on the same window. So
 * the page is driven through `write-adapter.ts`'s real validation and the host session's real reducer, and what is
 * asserted is the rendered DOM. No Figma and no main thread: `test-style-guide-page.ts` drives that side.
 *
 * ONE ARM PER OWNER DECISION (2026-10-05), each named by it:
 *   · H10/H11: the Figma menu's "Build style guides…" opens the page, headed "Build style guides"; H12: the legacy Style
 *     guide page stays in the Pages menu.
 *   · P8: before Set up file, a warning with a Set up file button, and Draw off; the setup's verdict asks for the catalog
 *     again.
 *   · P2: the tree is the one selection: a kind box clears its tables and the tree follows; a tree box makes the kind
 *     box mixed; the title box selects exactly the tables it names, and a click in the tree clears it.
 *   · P3: whole tables: a variable inside a table has no box of its own.
 *   · P4: Mode is "Every mode", fixed.
 *   · P5: a later-phase group is grayed out, tagged "Later phase", and its box cannot be checked.
 *   · H4–H9: the options, their values and defaults, and each group shown only for its kind in the selection.
 *   · P1 (variant 1): the run on the page, table by table; Activity records it, and does not open by itself while the
 *     page is open (control: away from the page, a failed style guide opens it).
 *   · P6: a failed table is listed first with its reason; Draw it again draws that table alone, by key.
 *   · P7: Cancel asks the main thread to stop; a stopped run says where, and the rest read "Not drawn".
 *   · P9 (layout): at 380, one column, the run first, Draw pinned at the bottom.
 *   · P11: the Activity row is titled "Style guides".
 *   · Close returns to the page the Figma menu was opened from.
 *
 * INDEPENDENCE (docs/34): every expected value is typed here, in the words a designer reads; the catalog is a literal,
 * and nothing imports the page's model or reads its state. Mutations that fail here by name are in the S11.2 page PR's
 * progress entry.
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
  const draw = q('[data-p3="sg-draw"]');
  const drawer = q('[data-p3="activity-drawer"]');
  const sgRow = q('[data-p3="activity-op"][data-op="styleguide"]');
  return {
    heading: text('[data-p3="sg-heading"]'),
    warning: !!q('[data-p3="sg-setup-warning"]'),
    warningText: text('[data-p3="sg-setup-warning"]'),
    draw: draw ? { label: draw.textContent, disabled: draw.disabled, describedBy: draw.getAttribute('aria-describedby') } : null,
    summary: text('[data-p3="sg-summary"]'),
    kinds: { color: box(q('[data-p3="sg-kind-color"]')), dimension: box(q('[data-p3="sg-kind-dimension"]')), font: box(q('[data-p3="sg-kind-font"]')), text: box(q('[data-p3="sg-kind-text"]')) },
    mode: (() => { const s = q('[data-p3="sg-mode"]'); return s ? { disabled: s.disabled, options: [...s.options].map((o) => o.textContent) } : null; })(),
    collections: [...(q('[data-p3="sg-collection"]')?.options ?? [])].map((o) => o.textContent),
    groups: [...document.querySelectorAll('[data-p3="sg-group"]')].map((r) => ({
      id: r.dataset.id, name: r.querySelector('.p3-sg-name')?.textContent, box: box(r.querySelector('[data-p3="sg-box"]')),
      disabled: r.querySelector('[data-p3="sg-box"]')?.getAttribute('aria-disabled') === 'true', later: r.querySelector('[data-p3="sg-later"]')?.textContent ?? null,
      meta: r.querySelector('.p3-sg-meta')?.textContent ?? null,
    })),
    leaves: [...document.querySelectorAll('[data-p3="sg-leaf"]')].map((r) => ({ id: r.dataset.id, boxed: !!r.querySelector('[data-p3="sg-box"]') })),
    titles: q('[data-p3="sg-titles-input"]')?.value ?? null,
    titlesError: text('[data-p3="sg-titles-error"]'),
    groupsShown: Object.entries({ all: '[data-p3="sg-group-all"]', color: '[data-p3="sg-group-color"]', dimension: '[data-p3="sg-group-dimension"]', font: '[data-p3="sg-group-font"]', text: '[data-p3="sg-group-text"]' }).filter(([, sel]) => q(sel)).map(([g]) => g),
    rem: q('[data-p3="sg-opt-rem"]') ? q('[data-p3="sg-opt-rem"]').getAttribute('aria-checked') === 'true' : null,
    nameCell: q('[data-p3="sg-opt-name-cell"]') ? q('[data-p3="sg-opt-name-cell"]').getAttribute('aria-checked') === 'true' : null,
    switchRoles: [...document.querySelectorAll('[data-p3="sg-opt-rem"], [data-p3="sg-opt-name-cell"], [data-p3="sg-opt-aliases"]')].map((n) => n.getAttribute('role')),
    focus: document.activeElement?.getAttribute('data-p3') ?? document.activeElement?.tagName.toLowerCase() ?? null,
    live: (() => { const l = q('[data-p3="sg-live"]'); return l ? { text: l.textContent, children: l.childElementCount, live: l.getAttribute('aria-live'), nested: document.querySelectorAll('[data-p3="style-guides"] [aria-live], [data-p3="style-guides"] [role="status"]').length } : null; })(),
    valueFormat: (() => { const s = q('[data-p3="sg-opt-value-format"]'); return s ? { value: s.value, options: [...s.options].map((o) => o.textContent) } : null; })(),
    colorSample: (() => { const s = q('[data-p3="sg-opt-color-sample"]'); return s ? { value: s.value, options: [...s.options].map((o) => o.textContent) } : null; })(),
    fontSample: (() => { const s = q('[data-p3="sg-opt-font-sample"]'); return s ? { value: s.value, options: [...s.options].map((o) => o.textContent) } : null; })(),
    runLine: text('[data-p3="sg-run-line"]'),
    tables: [...document.querySelectorAll('[data-p3="sg-table"]')].map((li) => `${li.querySelector('b')?.textContent}:${li.querySelector('[data-p3="sg-table-status"]')?.textContent}${li.querySelector('[data-p3="sg-table-reason"]') ? `(${li.querySelector('[data-p3="sg-table-reason"]').textContent})` : ''}`),
    stopped: text('[data-p3="sg-stopped"]'),
    verdict: text('[data-p3="sg-verdict"]'),
    cancel: !!q('[data-p3="sg-cancel"]'),
    drawerOpen: drawer?.dataset.open === 'true',
    dot: q('[data-p3="activity-open"] .p3-status-dot')?.dataset.state ?? null,
    sgRowTitle: sgRow?.querySelector('[data-p3="op-head"] b')?.textContent ?? null,
    actbar: !!q('[data-p3="sg-actbar"] [data-p3="sg-draw"]'),
    runBeforeCols: (() => { const run = q('[data-p3="sg-run"]'); const what = q('[data-p3="sg-what"]'); return !!run && !!what && !!(run.compareDocumentPosition(what) & Node.DOCUMENT_POSITION_FOLLOWING); })(),
    layout: q('[data-p3="frame"]')?.dataset.layout ?? null,
    sent: window.__sent,
  };
});
const sentOf = (st, type) => st.sent.filter((m) => m.type === type);

/** A panel on the page, Figma menu → Build style guides…, at the given width. */
const openPage = async (width = 1280, height = 820) => {
  const page = await browser.newPage({ viewport: { width, height } });
  await hooks.watch(page);
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await hooks.need(page, '[data-p3="frame"]');
  await page.evaluate(() => {
    window.__sent = [];
    window.addEventListener('message', (e) => { const m = e.data && e.data.pluginMessage; if (m && /^(style-guide|file-setup)/.test(m.type)) window.__sent.push(m); });
  });
  // From Brand, so Close has a page to return to (at 380 the tab row is a select, and the opening page serves).
  if (width > 560) await hooks.click(page.locator('[data-p3="tab-brand"]'));
  await hooks.click(page.locator('[data-p3="figma-open"]'));
  await hooks.need(page, '[data-p3="figma-menu"]');
  const item = await page.locator('[data-p3="figma-option-style-guide"] [data-p3="label-idle"]').textContent();
  await hooks.click(page.locator('[data-p3="figma-option-style-guide"]'));
  await hooks.need(page, '[data-p3="style-guides"]');
  return { page, errors, item };
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
/** The page has drawn the catalog's tree. */
const treeDrawn = (page) => until(page, 'the catalog drawn as a tree', () => document.querySelectorAll('[data-p3="sg-group"]').length > 0);
/** Table `i` of the run list shows `status`. */
const tableIs = (page, i, status) => until(page, `table ${i} reads ${status}`, ([k, st]) => !!document.querySelector(`[data-p3="sg-table"][data-index="${k}"][data-status="${st}"]`), [i, status]);
const groupBox = (id) => `[data-p3="sg-group"][data-id="${id}"] [data-p3="sg-box"]`;

// ── H10/H11/H12, P8 ──────────────────────────────────────────────────────────────────────────────
console.log('\nopening the page, and Set up file (H10–H12, P8)');
{
  const { page, errors, item } = await openPage();
  // The page's open request crosses `postMessage`, a task after it mounts (CI on e3c624b2 read it as 0): wait for it.
  // "Once" stays held by the later arm's exact 2.
  await posted(page, 'style-guide-catalog-request', 1);
  let st = await read(page);
  ok(item?.trim() === 'Build style guides…' && st.heading === 'Build style guides' && st.layout === 'page',
    `H11: the Figma menu's "Build style guides…" opens the page, headed "Build style guides" (item "${item}", heading "${st.heading}", layout ${st.layout})`);
  ok(sentOf(st, 'style-guide-catalog-request').length === 1, `the page asks the main thread for the file's catalog once, on open (${sentOf(st, 'style-guide-catalog-request').length})`);
  await post(page, { type: 'style-guide-catalog', catalog: { ...CAT, setUp: false } });
  await until(page, 'the Set up file warning drawn', () => !!document.querySelector('[data-p3="sg-setup-warning"]'));
  st = await read(page);
  ok(st.warning && /Needs the pages and cells Set up file adds\./.test(st.warningText ?? '') && st.draw?.disabled === true && st.draw.describedBy === 'p3-sg-setup-note',
    `P8: Set up file not run: a warning with its button, and Draw off, described by the warning (${JSON.stringify({ w: st.warningText, draw: st.draw })})`);
  await hooks.click(page.locator('[data-p3="sg-setup"]'));
  await posted(page, 'file-setup', 1);
  st = await read(page);
  ok(sentOf(st, 'file-setup').length === 1, `P8: the warning's Set up file runs Set up file (${sentOf(st, 'file-setup').length} posted)`);
  await post(page, { type: 'file-setup-result', ok: true, headline: '✓ file set up', summary: 'pages created' });
  await posted(page, 'style-guide-catalog-request', 2);
  st = await read(page);
  ok(sentOf(st, 'style-guide-catalog-request').length === 2, `P8: Set up file's verdict makes the page ask for the catalog again (${sentOf(st, 'style-guide-catalog-request').length})`);
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await until(page, 'the set-up catalog adopted: no warning', () => !document.querySelector('[data-p3="sg-setup-warning"]'));
  st = await read(page);
  ok(!st.warning && st.draw?.disabled === false && st.draw.label === 'Draw 7 tables' && st.summary === '7 tables · 10 variables, 1 text style',
    `P8, P12: once set up, Draw is on, "Draw 7 tables", "7 tables · 10 variables, 1 text style" (${JSON.stringify({ draw: st.draw, summary: st.summary })})`);
  // H12: the legacy page stays in the Pages menu until the cleanup.
  await hooks.click(page.locator('[data-p3="pages-menu"]'));
  ok(await page.locator('[data-p3="rail-page-style-guide"]').count() === 1, 'H12: the legacy Style guide page is still in the Pages menu');
  await page.keyboard.press('Escape');
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

// ── P2, P3, P4, P5, H4–H9 ────────────────────────────────────────────────────────────────────────
console.log('\nselection and options (P2–P5, H4–H9)');
{
  const { page, errors } = await openPage();
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await treeDrawn(page);
  let st = await read(page);
  ok(st.mode?.disabled === true && JSON.stringify(st.mode.options) === JSON.stringify(['Every mode']), `P4: Mode is "Every mode", fixed (${JSON.stringify(st.mode)})`);
  ok(JSON.stringify(st.collections) === JSON.stringify(['Every collection', 'core', 'color', 'border-width', 'Text styles']), `the Collection list: every collection, then each, the text styles as "Text styles" (${st.collections})`);
  const bw = st.groups.find((g) => g.name === 'border-width');
  ok(bw?.later === 'Later phase' && bw.disabled && bw.box === 'false', `P5: a later-phase group is tagged "Later phase", and its box is off and cannot be checked (${JSON.stringify(bw)})`);
  // `force`: Playwright will not click an `aria-disabled` control on its own; a person still can.
  await hooks.click(page.locator(groupBox('C:border-width:border-width/pds3/border-width')), { force: true });
  st = await read(page);
  ok(st.groups.find((g) => g.name === 'border-width')?.box === 'false' && st.draw.label === 'Draw 7 tables', 'P5: clicking it checks nothing');
  ok(JSON.stringify(st.kinds) === JSON.stringify({ color: 'true', dimension: 'true', font: 'true', text: 'true' }), `P2: every kind box starts checked (${JSON.stringify(st.kinds)})`);
  // H4–H9: values and defaults; every group shown while every kind is selected.
  ok(JSON.stringify(st.groupsShown) === JSON.stringify(['all', 'color', 'dimension', 'font', 'text']), `options: a group per kind in the selection (${st.groupsShown})`);
  ok(st.valueFormat?.value === 'hex' && JSON.stringify(st.valueFormat.options) === JSON.stringify(['Hex', 'RGB-A', 'HSL', 'HSB']), `H4: all four value formats, Hex by default (${JSON.stringify(st.valueFormat)})`);
  ok(st.colorSample?.value === 'auto' && JSON.stringify(st.colorSample.options) === JSON.stringify(['From each token’s role', 'Generic', 'Text', 'Border', 'Icon', 'Transparency']),
    `H5: "From each token’s role" and five overrides (${JSON.stringify(st.colorSample)})`);
  ok(st.rem === false, `H6: REM is a switch, off by default (${st.rem})`);
  ok(st.fontSample?.value === 'auto' && JSON.stringify(st.fontSample.options) === JSON.stringify(['From each variable’s kind', 'Generic', 'Family', 'Size', 'Weight', 'Letter spacing', 'Line height']),
    `H7: the font sample list (${JSON.stringify(st.fontSample)})`);
  ok(st.nameCell === false, `H9: the Name cell is off by default (${st.nameCell})`);
  ok(JSON.stringify(st.switchRoles) === JSON.stringify(['switch', 'switch', 'switch']), `SG5 A: each option switch is a switch to assistive technology, role="switch" (${JSON.stringify(st.switchRoles)})`);
  // Draw with everything selected sends the defaults and no tables filter.
  await hooks.click(page.locator('[data-p3="sg-draw"]'));
  await posted(page, 'style-guide', 1);
  st = await read(page);
  const first = sentOf(st, 'style-guide')[0]?.options;
  ok(first && !('tables' in first) && first.rem === false && first.titleCell === false && first.valueFormat === 'hex' && first.display === 'auto' && first.fontDisplay === 'auto',
    `Draw, everything selected: the defaults, and no tables filter, so the run judges superseded tables (${JSON.stringify(first)})`);
  await post(page, { type: 'style-guide-result', ok: true, headline: '✓ style guide: 7 tables', summary: '7 tables created' });
  await until(page, 'the run ended: Draw on again', () => document.querySelector('[data-p3="sg-draw"]')?.disabled === false);

  // P2: the color kind box clears every color table; the tree follows.
  await hooks.click(page.locator('[data-p3="sg-kind-color"]'));
  st = await read(page);
  ok(st.kinds.color === 'false' && st.groups.find((g) => g.name === 'color')?.box === 'false' && st.groups.find((g) => g.name === 'core')?.box === 'mixed' && st.draw.label === 'Draw 3 tables',
    `P2: the color kind box clears every color table: the color collection unchecks, core goes mixed, Draw counts 3 (${JSON.stringify({ kinds: st.kinds, draw: st.draw.label })})`);
  ok(JSON.stringify(st.groupsShown) === JSON.stringify(['all', 'dimension', 'font', 'text']) && st.rem === false,
    `options: with no color selected, no Color group; REM shows for the lengths (${st.groupsShown})`);
  // A tree box makes its kind box mixed.
  await hooks.click(page.locator(groupBox('C:color:color/pds3/color')));
  // core is mixed: a click checks all of it, a second clears it.
  await hooks.click(page.locator(groupBox('C:core:core/pds3/core')));
  await hooks.click(page.locator(groupBox('C:core:core/pds3/core')));
  st = await read(page);
  ok(st.kinds.color === 'mixed' && st.kinds.dimension === 'false' && st.draw.label === 'Draw 3 tables',
    `P2: checking the color collection in the tree and clearing core leaves the color kind mixed (${JSON.stringify(st.kinds)}, ${st.draw.label})`);
  // Title box: exactly the tables it names; an unknown name is said.
  await hooks.click(page.locator('[data-p3="sg-titles"] summary'));
  await page.locator('[data-p3="sg-titles-input"]').fill('Text\nNope');
  await until(page, 'the title box read', () => (document.querySelector('[data-p3="sg-titles-error"]')?.textContent ?? '') !== '');
  st = await read(page);
  ok(st.draw.label === 'Draw 1 table' && st.summary === '1 table · 2 variables' && st.titlesError === 'No table is titled “Nope”.' && st.kinds.color === 'mixed',
    `P2, H8: the title box selects exactly the tables it names, and names the one that matches none (${JSON.stringify({ draw: st.draw.label, summary: st.summary, err: st.titlesError })})`);
  ok(JSON.stringify(st.groupsShown) === JSON.stringify(['all', 'color']) && st.rem === null, `H1, H6: a color-only selection shows the Color options and no REM (${st.groupsShown}, rem ${st.rem})`);
  await hooks.click(page.locator(groupBox('C:core:core/pds3/core')));
  st = await read(page);
  ok(st.titles === '', `P2: a click in the tree clears the title box (${JSON.stringify(st.titles)})`);
  // P3: inside a table, a variable has no box of its own; a variable that is its own table's only row in a group of
  // several tables does.
  await hooks.click(page.locator('[data-p3="sg-group"][data-id="C:core:core/pds3/core"] [data-p3="sg-fold"]'));
  await hooks.click(page.locator('[data-p3="sg-group"][data-id="C:color:color/pds3/color"] [data-p3="sg-fold"]'));
  await hooks.click(page.locator('[data-p3="sg-group"][data-id="C:color:color/pds3/color/text"] [data-p3="sg-fold"]'));
  st = await read(page);
  const inText = st.leaves.filter((l) => l.id.startsWith('C:color:color/pds3/color/text/'));
  ok(inText.length === 2 && inText.every((l) => !l.boxed), `P3: whole tables: Text's variables show, with no box of their own (${JSON.stringify(inText)})`);
  const palette = st.leaves.filter((l) => /palette\/(white|black)$/.test(l.id));
  ok(palette.length === 2 && palette.every((l) => l.boxed), `P3: white and black sit in a group spanning two tables, so each carries its table's box (${JSON.stringify(palette)})`);
  // Draw of a part selection sends its tables by key.
  await hooks.click(page.locator('[data-p3="sg-draw"]'));
  await posted(page, 'style-guide', 2);
  st = await read(page);
  const part = sentOf(st, 'style-guide')[1]?.options;
  ok(part && JSON.stringify(part.tables) === JSON.stringify([ALL_KEYS[0], ALL_KEYS[1], ALL_KEYS[2], ALL_KEYS[3], ALL_KEYS[5]]),
    `Draw, part selected: the tables go by key (${JSON.stringify(part?.tables)})`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── P1, P6, P7, P11 ──────────────────────────────────────────────────────────────────────────────
console.log('\nthe run (P1, P6, P7, P11)');
const LIST = CAT.tables.slice(0, 4).map((t) => ({ key: t.key, title: t.title, page: t.page }));
{
  const { page, errors } = await openPage();
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await treeDrawn(page);
  // By keyboard (review of #2171): Draw goes off as the run starts, so focus must move, to Cancel, not fall to <body>.
  await page.locator('[data-p3="sg-draw"]').focus();
  await page.keyboard.press('Enter');
  await posted(page, 'style-guide', 1);
  await until(page, 'Cancel drawn', () => !!document.querySelector('[data-p3="sg-cancel"]'));
  let st0 = await read(page);
  ok(st0.focus === 'sg-cancel', `focus: a keyboard Draw moves focus to Cancel as the run starts (focus on ${st0.focus})`);
  // THE ONE LIVE REGION: the same node for the whole run, holding the run line and nothing else.
  await page.evaluate(() => { window.__live = document.querySelector('[data-p3="sg-live"]'); });
  await post(page, { type: 'style-guide-tables', tables: LIST });
  await post(page, { type: 'style-guide-progress', done: 0, total: 4, tableMs: 0 });
  await post(page, { type: 'style-guide-table', index: 0, status: 'drawing' });
  await post(page, { type: 'style-guide-table', index: 0, status: 'done' });
  await post(page, { type: 'style-guide-progress', done: 1, total: 4, tableMs: 9 });
  await post(page, { type: 'style-guide-table', index: 1, status: 'drawing' });
  await tableIs(page, 1, 'drawing');
  await until(page, 'the second progress reading handled', () => /2 of 4/.test(document.querySelector('[data-p3="sg-run-line"]')?.textContent ?? ''));
  let st = await read(page);
  ok(st.runLine === 'Drawing table 2 of 4…' && JSON.stringify(st.tables) === JSON.stringify(['Core — base:Done', 'Primary:Drawing', 'Dimension:Waiting', 'Text:Waiting']) && st.cancel,
    `P1: the run on the page, table by table: "Drawing table 2 of 4…", Done, Drawing, Waiting, and Cancel (${JSON.stringify({ line: st.runLine, tables: st.tables })})`);
  ok(st.drawerOpen === false && st.dot === 'run' && st.sgRowTitle === 'Style guides',
    `P1, P11: Activity records the run in its "Style guides" row and does not open by itself while the page shows it (open ${st.drawerOpen}, dot ${st.dot}, row "${st.sgRowTitle}")`);
  ok(st.draw.disabled === true, 'Draw is off while the run draws');
  const same = await page.evaluate(() => window.__live === document.querySelector('[data-p3="sg-live"]') && window.__live.isConnected);
  ok(same && st.live?.live === 'polite' && st.live.text === 'Drawing table 2 of 4…' && st.live.children === 0 && st.live.nested === 0,
    `progress: one polite live region, the same node through the run's events, holding the run line alone, and no live or status region inside the page (${JSON.stringify({ same, live: st.live })})`);
  await hooks.click(page.locator('[data-p3="sg-cancel"]'));
  await posted(page, 'style-guide-cancel', 1);
  st = await read(page);
  ok(sentOf(st, 'style-guide-cancel').length === 1, `P7: Cancel asks the main thread to stop after the current table (${sentOf(st, 'style-guide-cancel').length})`);
  await post(page, { type: 'style-guide-table', index: 1, status: 'failed', reason: 'Primary refused' });
  await post(page, { type: 'style-guide-result', ok: false, headline: '⚠ 1 drawn, 1 failed', summary: 'Primary: Primary refused. Stopped after table 2 of 4. The tables already drawn stay', stopped: { done: 2, total: 4 } });
  await until(page, 'the stopped run drawn', () => !!document.querySelector('[data-p3="sg-stopped"]'));
  st = await read(page);
  ok(st.stopped === 'Stopped after table 2 of 4. The tables already drawn stay' && JSON.stringify(st.tables) === JSON.stringify(['Primary:Not drawn(Primary refused)', 'Core — base:Done', 'Dimension:Not drawn', 'Text:Not drawn']),
    `P7, P6: stopped: where it stopped, the failed table first with its reason, the rest "Not drawn" (${JSON.stringify({ stopped: st.stopped, tables: st.tables })})`);
  ok(st.focus === 'sg-draw' || st.focus === 'sg-run-line', `focus: when the run ends, focus moves from Cancel to Draw or the run line, never <body> (focus on ${st.focus})`);
  ok(st.live?.text === '', `progress: the live region is emptied when the run ends (${JSON.stringify(st.live?.text)})`);
  ok(st.drawerOpen === false && st.dot === 'bad' && st.verdict === '⚠ 1 drawn, 1 failed',
    `P1 (call 11): a failure the page shows marks Activity, and the drawer stays closed (open ${st.drawerOpen}, dot ${st.dot}, verdict "${st.verdict}")`);
  // P6: Draw it again draws that table alone, by its key.
  await hooks.click(page.locator('[data-p3="sg-again"]'));
  await posted(page, 'style-guide', 2);
  await until(page, 'the redraw under way: Cancel drawn', () => !!document.querySelector('[data-p3="sg-cancel"]'));
  st = await read(page);
  ok(st.focus === 'sg-cancel', `focus: Draw it again moves focus to Cancel as its run starts, not to <body> (focus on ${st.focus})`);
  const again = sentOf(st, 'style-guide').pop()?.options;
  ok(JSON.stringify(again?.tables) === JSON.stringify([ALL_KEYS[1]]) && st.titles === 'Primary' && st.draw.label === 'Draw 1 table',
    `P6: Draw it again draws Primary alone, by key, and the title box names it (${JSON.stringify(again?.tables)}, "${st.titles}")`);
  await post(page, { type: 'style-guide-tables', tables: [LIST[1]] });
  await post(page, { type: 'style-guide-table', index: 0, status: 'drawing' });
  await post(page, { type: 'style-guide-table', index: 0, status: 'done' });
  await post(page, { type: 'style-guide-result', ok: true, headline: '✓ style guide: 1 table', summary: '1 table updated in place — no token changes' });
  await until(page, "the redraw's verdict drawn", () => document.querySelector('[data-p3="sg-verdict"]')?.textContent === '✓ style guide: 1 table');
  st = await read(page);
  ok(JSON.stringify(st.tables) === JSON.stringify(['Primary:Done']) && st.verdict === '✓ style guide: 1 table', `P6: the redraw's run lists Primary alone, done (${JSON.stringify(st.tables)})`);
  // The verdict pill opens Activity on the result, by hand.
  await hooks.click(page.locator('[data-p3="sg-verdict"]'));
  await until(page, 'Activity opened from the verdict pill', () => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'true');
  st = await read(page);
  ok(st.drawerOpen === true, `the page's verdict pill opens Activity (open ${st.drawerOpen})`);
  await hooks.click(page.locator('[data-p3="activity-toggle"]'));
  // Close returns to where the menu was opened from (Brand).
  await hooks.click(page.locator('[data-p3="sg-close"]'));
  await until(page, 'the page closed', () => document.querySelector('[data-p3="frame"]')?.dataset.layout !== 'page');
  const back = await page.evaluate(() => ({ tab: document.querySelector('[data-p3="tab-brand"]')?.getAttribute('aria-selected'), layout: document.querySelector('[data-p3="frame"]')?.dataset.layout, page: !!document.querySelector('[data-p3="style-guides"]') }));
  ok(back.tab === 'true' && back.layout === 'panes' && !back.page, `Close returns to the page the menu was opened from (${JSON.stringify(back)})`);
  // CONTROL for the quiet drawer: away from the page, a failed style guide opens Activity, as F2 says.
  await post(page, { type: 'agent-started', id: 'a1', cmd: 'style-guide' });
  await post(page, { type: 'style-guide-result', ok: false, headline: '⚠ 3 drawn, 1 failed', summary: 'Text: x' });
  await post(page, { type: 'agent-finished', id: 'a1', cmd: 'style-guide' });
  await until(page, "the agent's failed verdict recorded in Activity", () => document.querySelector('[data-p3="activity-op"][data-op="styleguide"] [data-p3="op-verdict"]')?.textContent === '⚠ 3 drawn, 1 failed');
  await until(page, 'Activity opened by itself', () => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'true');
  st = await read(page);
  ok(st.drawerOpen === true, `control: away from the page, a failed style guide opens Activity by itself (open ${st.drawerOpen})`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── 380 (P9) ─────────────────────────────────────────────────────────────────────────────────────
console.log('\nat 380 (P9)');
{
  const { page, errors } = await openPage(380, 620);
  await post(page, { type: 'style-guide-catalog', catalog: CAT });
  await treeDrawn(page);
  await hooks.click(page.locator('[data-p3="sg-draw"]'));
  await posted(page, 'style-guide', 1);
  await post(page, { type: 'style-guide-tables', tables: LIST });
  await post(page, { type: 'style-guide-table', index: 0, status: 'drawing' });
  await tableIs(page, 0, 'drawing');
  await until(page, "Activity's strip shown", () => document.querySelector('[data-p3="activity-drawer"]')?.dataset.ever === 'true');
  const st = await read(page);
  // Q47 A (owner, 2026-10-06; as Components', #2180): the bar stands at least space.300 above the Activity drawer's strip,
  // at the top and at the end of the page's scroll. THE ORACLE is space.300 resolved from the committed emission.
  const GAP = parseFloat(String(resolveToken(loadModes().light, P('space.300')).value));
  const pinned = await page.evaluate(() => {
    const bar = document.querySelector('[data-p3="sg-actbar"]');
    const pg = document.querySelector('[data-p3="menu-page"]');
    const strip = document.querySelector('[data-p3="activity-drawer"]');
    if (!bar || !pg || !strip) return null;
    pg.scrollTop = 0;
    const top = strip.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
    pg.scrollTop = pg.scrollHeight;
    const end = strip.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
    return { top: Math.round(top), end: Math.round(end), sticky: getComputedStyle(bar).position, stripShown: strip.dataset.ever === 'true' };
  });
  ok(GAP > 0 && st.actbar && st.runBeforeCols && pinned?.sticky === 'sticky' && pinned.stripShown && pinned.top >= GAP && pinned.end >= GAP,
    `P9, Q47 A: at 380 the run comes first, and Draw sits in a pinned bar at least space.300 (${GAP}px) above the Activity drawer's strip, scrolled or not (${JSON.stringify({ actbar: st.actbar, runFirst: st.runBeforeCols, pinned })})`);
  const strip = await page.locator('[data-p3="activity-strip-progress"]').count();
  await post(page, { type: 'style-guide-progress', done: 1, total: 4, tableMs: 1 });
  await until(page, "the strip's progress drawn", () => !!document.querySelector('[data-p3="activity-strip-progress"]'));
  ok(await page.locator('[data-p3="activity-strip-progress"]').count() === 1, `at 380 Activity's strip carries the run's progress (before the first reading ${strip})`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

await browser.close();
server.close();
hooks.report(ok);
console.log(`\n${failed === 0 ? '✅' : '❌'} ${executed - failed} of ${executed} Build style guides assertions pass`);
if (failed) { console.error(`\n${failed} failing:`); for (const f of failures) console.error(`  · ${f}`); }
process.exit(failed === 0 ? 0 : 1);
