/**
 * Plugin START MOMENT (#1197) — the plugin surfaces the same start screen the web does, and a file
 * that already holds a brand still hydrates.
 *
 *   npm run -w @prism3/plugin build && npm run -w @prism3/plugin test:start
 *
 * ── why this is a browser suite ─────────────────────────────────────────────────────────────────
 *
 * `apps/studio/src/main.ts` touches `document` at import time, so it has no unit granularity at all —
 * the argument is written out in `apps/studio/test-smoke.mjs` and in `test-build-verdict.mjs` beside
 * this file. The subject here is additionally PLUGIN-ONLY in its trigger: the web decides "nothing is
 * stored" synchronously in `bootBrand`, while the plugin learns it from a host message that arrives
 * after boot. So the thing under test is a message-ordering behaviour of the built panel bundle, and
 * the subject is `apps/plugin/dist/ui.html`.
 *
 * Loaded TOP-LEVEL, where `parent === window`, so the UI's own outgoing `parent.postMessage` lands on
 * its own listener and this harness injects the main thread's replies with `window.postMessage` — the
 * bridge is exercised through `write-adapter.ts`'s real `figmaCommit`, including the validation that
 * translates a wire `type` into the UI's `kind`. What is NOT exercised is the plugin main thread; the
 * `restore-input-empty` POST side is covered by `apps/plugin/src/main.ts` typing plus the assertion in
 * §6 below that the three outcomes are total.
 *
 * ── independence: what is compared against what (docs/34) ───────────────────────────────────────
 *
 * EXPECTED is authored HERE, per scenario, as what a designer would SEE — "a start screen with four
 * paths", "an editor showing the brand the file stored". ACTUAL is read out of the rendered DOM of the
 * built bundle. Neither side reads `provenance`, calls `firstRun()`, or evaluates any of the subject's
 * own expressions. That matters more here than usual, because the subject IS a predicate over
 * provenance: a check that asked the app whether it considered itself on the start screen would agree
 * with itself in every case, including a broken one where the origin is cleared and nothing repaints.
 *
 * ── THE ASSERTION THAT MATTERS MOST IS THE NEGATIVE ONE ─────────────────────────────────────────
 *
 * §2 is the regression guard for the #1184 restore flow that had just tested green when this landed: a
 * file WITH a persisted brand must hydrate, and must NOT show a start screen. Every other scenario here
 * makes the start screen appear more often, so this is the one that fails if the trigger is too eager,
 * and it is written to fail loudly rather than by omission — it asserts the editor is present, not
 * merely that `.startview` is absent, because "nothing rendered at all" would satisfy the weaker form.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = resolve(HERE, 'dist/ui.html');
const REPO = resolve(HERE, '../..');

let failed = 0;
const ok = (cond, label) => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

let html;
try {
  html = readFileSync(UI, 'utf8');
} catch {
  console.error('✗ apps/plugin/dist/ui.html is missing — run `npm run -w @prism3/plugin build` first.');
  process.exit(1);
}

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

/** Post a main-thread → UI message in the wire shape `bridge-main.ts` puts on the bus. */
const post = (page, msg) => page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), msg);

/**
 * A booted panel. One fresh context per scenario: a shared one would carry the previous scenario's
 * provenance into the next, and provenance is exactly what decides the screen under test.
 *
 * Waits on `#app` being ATTACHED rather than on the rail being visible. The rail is hidden at the
 * plugin's narrow tier, so a visibility wait would hang at the sizes §5 measures — and would hang
 * *after* the app had booted correctly, reporting a layout fact as a boot failure.
 */
const openPanel = async (viewport = { width: 1280, height: 900 }) => {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  await page.waitForSelector('#app', { state: 'attached' });
  return { page, errors };
};

/** Everything about the start moment a designer can read, from the rendered DOM only. */
const readStart = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const startview = q('.startview');
  return {
    start: !!startview,
    heading: startview ? (q('.start-h')?.textContent ?? null) : null,
    fromColor: !!q('.start-go'),
    startBlank: !!(q('.start-row2 .start-alt') && [...document.querySelectorAll('.start-alt')].some((b) => b.textContent === 'Start blank')),
    chips: [...document.querySelectorAll('.start-chip')].map((c) => c.textContent.trim()),
    upload: !!q('.start-file'),
    // The editor's own surfaces — asserted positively so "nothing rendered" cannot pass as "hydrated".
    editorRail: document.querySelectorAll('.rail button.stage').length,
    brandSel: q('.brandsel')?.textContent ?? null,
  };
});

const waitStart = (page, want) =>
  page.waitForFunction((w) => !!document.querySelector('.startview') === w, want, { timeout: 4000 })
    .then(() => true, () => false);

const NB_BRAND = { id: 'restored-brand', root: 'rb', modes: ['light'], primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true } };

console.log('Plugin start moment (#1197)\n');

// ── §1 — a fresh file surfaces the start screen ────────────────────────────────────────────────
console.log('1. a file with NO stored brand surfaces the start screen');
{
  const { page, errors } = await openPanel();
  await post(page, { type: 'restore-input-empty' });
  ok(await waitStart(page, true), 'restore-input-empty puts the panel on the start screen');
  const s = await readStart(page);
  ok(s.heading === 'Start a new brand.', `the heading is the web's: "${s.heading}"`);
  ok(s.fromColor, 'path 1 — start from your color');
  ok(s.startBlank, 'path 2 — start blank');
  ok(s.chips.length >= 2, `path 3 — example chips (${s.chips.join(', ')})`);
  ok(s.upload, 'path 4 — design.md upload, the affordance the plugin had no route to');
  ok(errors.length === 0, `no console errors (${errors.slice(0, 1).join('') || 'none'})`);
  await page.close();
}

// ── §2 — THE REGRESSION GUARD: a file WITH a brand still hydrates ──────────────────────────────
console.log('\n2. a file WITH a persisted brand hydrates, and shows NO start screen (#1184 flow)');
{
  const { page, errors } = await openPanel();
  await post(page, { type: 'restore-input', input: NB_BRAND });
  ok(await waitStart(page, false), 'restore-input does NOT put the panel on the start screen');
  const s = await readStart(page);
  // POSITIVE, not merely "no start screen": a blank page satisfies the negative form.
  ok(s.editorRail > 0, `the editor rendered — ${s.editorRail} rail destinations`);
  ok((s.brandSel ?? '').includes('restored-brand'), `the restored brand is the working brand ("${s.brandSel}")`);
  ok(errors.length === 0, `no console errors (${errors.slice(0, 1).join('') || 'none'})`);
  await page.close();
}

// ── §3 — "variables present, no blob" (#677/#1184 state 2) ─────────────────────────────────────
console.log('\n3. variables in the file but no stored brand: start screen, and the seed verdict survives');
{
  const { page, errors } = await openPanel();
  // Deliberately seed-info FIRST, then the empty restore — the two host reads are independent and
  // either may arrive first, and the start decision must not depend on which did.
  await post(page, { type: 'seed-info', ok: true, present: true, summary: 'Existing Prism3 theme found in this file.' });
  await post(page, { type: 'restore-input-empty' });
  ok(await waitStart(page, true), 'a file with applied variables but no brand blob is still a start moment');
  ok(errors.length === 0, `no console errors (${errors.slice(0, 1).join('') || 'none'})`);
  await page.close();
}
{
  const { page } = await openPanel();
  // And the other order, since the messages race.
  await post(page, { type: 'restore-input-empty' });
  await post(page, { type: 'seed-info', ok: true, present: true, summary: 'Existing Prism3 theme found in this file.' });
  ok(await waitStart(page, true), 'the reverse arrival order reaches the same screen — the decision is order-independent');
  await page.close();
}

{
  // THE GUARD ON THE TRIGGER, which is the other half of §2. The UI is live between `ui-ready` and the
  // host's answer, so a designer can pick an example in that window. The empty-restore must not then
  // yank them onto a start screen and discard the choice they just made — "no brand in the file" stops
  // being the relevant fact the moment the session has one.
  const { page } = await openPanel();
  await post(page, { type: 'restore-input-empty' });
  await waitStart(page, true);
  await page.locator('.start-chip').first().click();
  await waitStart(page, false);
  await post(page, { type: 'restore-input-empty' });
  // Give the handler a turn to do the wrong thing before asserting it did not.
  await page.waitForTimeout(150);
  const s = await readStart(page);
  ok(!s.start, 'a late empty-restore does NOT discard a brand the designer already chose');
  ok(s.editorRail > 0, 'and the editor is still standing');
  await page.close();
}

// ── §4 — "+ New brand" returns to the start moment ─────────────────────────────────────────────
console.log('\n4. "+ New brand" surfaces the start screen (it used to load a neutral default in place)');
{
  const { page, errors } = await openPanel();
  await post(page, { type: 'restore-input', input: NB_BRAND });
  await waitStart(page, false);
  await page.click('.brandsel');
  await page.waitForSelector('.bm-item');
  const nb = page.locator('.bm-item', { hasText: '+ New brand' }).first();
  ok(await nb.count() > 0, 'the brand menu offers "+ New brand"');
  await nb.click();
  ok(await waitStart(page, true), 'clicking it returns to the start moment');
  const s = await readStart(page);
  ok(s.upload && s.chips.length >= 2, 'with the upload and the examples the direct load could not offer');
  ok(errors.length === 0, `no console errors (${errors.slice(0, 1).join('') || 'none'})`);
  await page.close();
}

// ── §5 — the paths actually leave the start screen ─────────────────────────────────────────────
console.log('\n5. each path lands in the editor');
{
  const { page } = await openPanel();
  await post(page, { type: 'restore-input-empty' });
  await waitStart(page, true);
  await page.locator('.start-chip').first().click();
  ok(await waitStart(page, false), 'an example chip enters the editor');
  ok((await readStart(page)).editorRail > 0, 'and the editor rendered');
  await page.close();
}
{
  const { page } = await openPanel();
  await post(page, { type: 'restore-input-empty' });
  await waitStart(page, true);
  await page.locator('.start-alt', { hasText: 'Start blank' }).first().click();
  ok(await waitStart(page, false), '"Start blank" enters the editor');
  await page.close();
}
{
  const { page } = await openPanel();
  await post(page, { type: 'restore-input-empty' });
  await waitStart(page, true);
  // The owner's specific want: a real design.md, uploaded through the plugin's own file input.
  const md = resolve(REPO, 'packages/engine/examples/harbor.design.md');
  await page.setInputFiles('.start-file', md);
  ok(await waitStart(page, false), 'a design.md upload enters the editor — reachable in the plugin for the first time');
  const s = await readStart(page);
  ok((s.brandSel ?? '').toLowerCase().includes('harbor'), `and the uploaded brand is the working brand ("${s.brandSel}")`);
  await page.close();
}

// ── §6 — the screen holds at plugin dimensions ─────────────────────────────────────────────────
// The web start screen was laid out for a browser viewport; the plugin iframe is smaller and its floor
// is 380×420 (`MIN_SIZE` in apps/plugin/src/main.ts). Asserted rather than eyeballed, at the floor and
// at the default, because "it looked fine" is not a measurement and a clipped upload card is exactly
// the kind of thing that ships.
console.log('\n6. the start screen holds at plugin dimensions');
for (const vp of [{ width: 1280, height: 900 }, { width: 500, height: 560 }, { width: 380, height: 420 }]) {
  const { page } = await openPanel(vp);
  await post(page, { type: 'restore-input-empty' });
  await waitStart(page, true);
  const m = await page.evaluate(() => {
    const c = document.querySelector('.start-col').getBoundingClientRect();
    const doc = document.documentElement;
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= doc.clientWidth; };
    return {
      hOverflow: doc.scrollWidth - doc.clientWidth,
      clippedTop: c.top < 0,
      reachable: doc.scrollHeight >= Math.round(c.bottom),
      controlsInView: [...document.querySelectorAll('.start-go, .start-alt, .start-chip, .start-upload')].every(inView),
      cards: document.querySelectorAll('.start-card').length,
    };
  });
  const at = `${vp.width}×${vp.height}`;
  ok(m.hOverflow === 0, `${at}: no horizontal overflow (${m.hOverflow}px)`);
  ok(!m.clippedTop, `${at}: the column is not clipped by the centering`);
  ok(m.reachable, `${at}: the whole column is scrollable into view`);
  ok(m.controlsInView, `${at}: every control sits inside the viewport width`);
  ok(m.cards === 4, `${at}: all four paths render (${m.cards})`);
  await page.close();
}

// ── §7 — the three restore outcomes are total ──────────────────────────────────────────────────
// `restore-input-empty` only means "no brand" if it is sent exactly when the other two are not. That is
// a property of the HOST, which this browser harness cannot execute — so it is asserted against the
// host source, and stated as the source scan it is rather than dressed up as behaviour.
console.log('\n7. the host reports absence rather than staying silent');
{
  const hostSrc = readFileSync(resolve(REPO, 'apps/plugin/src/main.ts'), 'utf8');
  const body = hostSrc.slice(hostSrc.indexOf('const restoreToUi'), hostSrc.indexOf('const restoreToUi') + 900);
  ok(/restore-input-empty/.test(body), 'restoreToUi posts restore-input-empty on absence');
  ok(/else postToUi/.test(body), 'and it is the ELSE of the found-a-brand branch, so the two are exclusive');
  ok(/restore-input-error/.test(body), 'with the refusal arm still present — three outcomes, total over the read');
}

await browser.close();
server.close();

console.log(failed ? `\n❌ ${failed} FAILED` : '\n✅ ALL PASS');
process.exit(failed ? 1 : 0);
