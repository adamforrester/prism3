/**
 * `test:export-parity` — the web studio's token export and the plugin's token export of the same brand are the
 * same bytes, and those bytes are the engine's committed emission for that brand (#2351, gap 1).
 *
 *   npm run -w @prism3/studio build && npm run -w @prism3/plugin build
 *   npm run -w @prism3/studio test:export-parity
 *
 * ── what it drives ────────────────────────────────────────────────────────────────────────────────
 *
 * BOTH BUILT BUNDLES, through the person's own path: the studio's `dist/main.js` (host=web) and the plugin's
 * `dist/ui.html` (host=figma), each opened in Chromium, each given a brand from its start screen, then Export ›
 * Download with every export setting at its default. The file the browser downloads is what is compared. No
 * export function is imported here: a gate that called `projectDtcg` itself would test a function, not the two
 * products, and a host-only branch (a `PRISM3_HOST` define, a figma-only seed) could differ and stay green.
 *
 * The plugin's iframe is the studio's UI imported whole (`apps/plugin/src/ui/entry.ts`), so the two exports share
 * their source. This gate is what makes that a checked fact rather than a reading of the import graph: the two
 * bundles are built by two build scripts with two different `PRISM3_HOST` defines, and each is held here to the
 * bytes it actually writes.
 *
 * ── the rule, stated ──────────────────────────────────────────────────────────────────────────────
 *
 *   1. PARITY: for each brand, the web download and the plugin download have the same file name and are
 *      BYTE-IDENTICAL. No normalization, no tolerance.
 *   2. ACCURACY: each of them is byte-identical to `packages/engine/out/<id>.tokens.json`.
 *
 * ── independence (docs/34) ────────────────────────────────────────────────────────────────────────
 *
 * Rule 1 compares two subjects with each other; on its own it would pass if both bundles were wrong in the same
 * way. Rule 2 is what stops that: the expected file is the committed emission, written by the engine's Node CLI
 * path (`emit-dtcg.ts` for the engine-native briefs, `cli.ts` for the standard-dialect one, both run by `regen.ts`
 * and held by `regen --check`). That path runs no studio code, no bundler and no browser, so a defect in the UI's
 * export (a dropped token, a value written from stale state, a host branch) cannot reach the expected side.
 *
 * ── which brands, and why each is in or out ─────────────────────────────────────────────────────────
 *
 * THE BRANDS ARE THE COMMITTED EMISSION, discovered by listing `out/*.tokens.json`, not a list typed here. Each
 * discovered brand must be in `SOURCES` (how a person reaches it in the UI) or in `EXCLUDED` (with the reason), and
 * each entry in either must still be discovered, so a brand added to the emission fails until it is placed, and a
 * stale entry fails too. Today:
 *   · the start screen's example chips — the brands `schema/example-brands.json` offers;
 *   · `wendys`, pasted on the start screen as `examples/wendys.design.md`: the standard-dialect front door;
 *   · `nb` is EXCLUDED: it is the regression fixture, built from `nbTheme()` and the measured reference rather than
 *     from a BrandInput, so there is no brief either UI can load. `nb-regression.ts` holds it.
 * The example chips the start screen offers are read from the page, and each must have a committed emission.
 *
 * ── what this does NOT cover ───────────────────────────────────────────────────────────────────────
 *
 *   · non-default export settings (key case, file split, and the rest of `export-settings.ts`): their shaping is
 *     `test-export-settings.ts`'s, over the same function both hosts call;
 *   · the design.md export, and the overlay and base projections the engine also emits;
 *   · TokenPress, which exports a FIGMA FILE rather than a brand, and is gap 2's subject
 *     (`apps/plugin/test-readback-parity.ts`).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { hookGuard } from './test-hooks.mjs';
import { assertBundleFresh, STUDIO_SOURCE_ROOTS, PLUGIN_UI_SOURCE_ROOTS } from './test-bundle-freshness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(REPO, 'packages/engine/out');
const EXAMPLES = join(REPO, 'packages/engine/examples');
const hooks = hookGuard(import.meta.url);

let failed = 0;
const ok = (cond, label) => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/** How a person reaches each committed brand in the UI: an example chip on the start screen, or a design.md pasted
 *  into the start screen's import box. Typed here, and checked against the discovered emission in both directions. */
const SOURCES = {
  prism3: { chip: 'prism3' },
  aurora: { chip: 'aurora' },
  harbor: { chip: 'harbor' },
  wendys: { paste: 'wendys.design.md' },
};
/** Committed brands no UI can load, with why. */
const EXCLUDED = {
  nb: 'the regression fixture: built from nbTheme() and the measured reference, not from a BrandInput, so neither UI has a brief to load; nb-regression.ts holds it',
};
/** A floor on the gated set, so a discovery that returns nothing cannot pass. */
const MIN_BRANDS = 4;

// ── the brands: discovered, then placed ─────────────────────────────────────────────────────────────
const discovered = readdirSync(OUT).filter((f) => /^[a-z0-9-]+\.tokens\.json$/.test(f)).map((f) => f.replace('.tokens.json', '')).sort();
console.log(`Export parity (#2351 gap 1) — web vs plugin vs the committed emission\n${'='.repeat(78)}`);
ok(discovered.length >= MIN_BRANDS + Object.keys(EXCLUDED).length, `brands: out/ holds ${discovered.length} committed token files (${discovered.join(', ')})`);
for (const id of discovered) ok(id in SOURCES || id in EXCLUDED, `brands: ${id} is placed (a UI source, or excluded with a reason)`);
for (const id of [...Object.keys(SOURCES), ...Object.keys(EXCLUDED)]) ok(discovered.includes(id), `brands: ${id} still has a committed emission (out/${id}.tokens.json)`);
for (const [id, why] of Object.entries(EXCLUDED)) console.log(`  · ${id}: excluded — ${why}`);
const GATED = discovered.filter((id) => id in SOURCES);
ok(GATED.length >= MIN_BRANDS, `brands: ${GATED.length} gated, at least ${MIN_BRANDS}`);

// ── both bundles, fresh ─────────────────────────────────────────────────────────────────────────────
let pluginHtml;
try { pluginHtml = readFileSync(join(REPO, 'apps/plugin/dist/ui.html'), 'utf8'); } catch {
  console.error('✗ apps/plugin/dist/ui.html is missing: run `npm run -w @prism3/plugin build` first.');
  process.exit(1);
}
assertBundleFresh({ repo: REPO, bundle: 'apps/plugin/dist/ui.html', roots: PLUGIN_UI_SOURCE_ROOTS, label: 'ui.html freshness',
  effect: 'the plugin side would export from the old UI', build: 'npm run -w @prism3/plugin build' });
assertBundleFresh({ repo: REPO, bundle: 'apps/studio/dist/main.js', roots: STUDIO_SOURCE_ROOTS, label: 'main.js freshness',
  effect: 'the web side would export from the old UI', build: 'npm run -w @prism3/studio build' });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.map': 'application/json' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/plugin') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(pluginHtml.replace(/<html([^>]*)>/, '<html$1 class="figma-light">'));
    return;
  }
  try {
    const p = join(HERE, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

/** Open one host on its start screen, in its own storage context (the studio keeps its working brand in
 *  `localStorage`, so a shared context would carry one brand into the next). Returns the chips it offers too. */
const openStart = async (host) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await hooks.watch(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
  if (host === 'web') {
    await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  } else {
    await page.goto(`${ORIGIN}/plugin`, { waitUntil: 'load' });
    // The plugin's main thread answers `ui-ready` with what the file holds; an empty file shows the start screen.
    await page.evaluate(() => window.postMessage({ pluginMessage: { type: 'restore-input-empty' } }, '*'));
  }
  await hooks.need(page, '[data-p3="start-example"]');
  const chips = await page.locator('[data-p3="start-example"]').allTextContents();
  return { ctx, page, errors, chips: chips.map((s) => s.trim()) };
};

/** Load `id` from the start screen the way a person does, then Export › Download at the default settings. */
const exportFrom = async (host, id) => {
  const { ctx, page, errors } = await openStart(host);
  try {
    const src = SOURCES[id];
    if (src.chip) {
      await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: src.chip }));
    } else {
      await hooks.need(page, '[data-p3="start-paste"]');
      await page.fill('[data-p3="start-paste"]', readFileSync(join(EXAMPLES, src.paste), 'utf8'));
      await hooks.click(page.locator('[data-p3="start-import"]'));
    }
    await hooks.need(page, '[data-p3="frame"]');
    await hooks.click(page.locator('[data-p3="export-open"]'));
    await hooks.need(page, '[data-p3="export-dialog"]');
    const pending = page.waitForEvent('download');
    await hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'));
    const dl = await pending;
    return { name: dl.suggestedFilename(), body: await readFile(await dl.path(), 'utf8'), errors };
  } finally { await ctx.close(); }
};

/** The first differing line, so a failure points somewhere. */
const firstDiff = (a, b) => {
  const x = a.split('\n'), y = b.split('\n');
  for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return `line ${i + 1}: ${JSON.stringify(x[i]?.slice(0, 120))} vs ${JSON.stringify(y[i]?.slice(0, 120))}`;
  return 'no line differs (a trailing byte?)';
};

// ── the start screens offer what the emission holds ─────────────────────────────────────────────────
for (const host of ['web', 'figma']) {
  const { ctx, chips } = await openStart(host);
  await ctx.close();
  const chipIds = Object.entries(SOURCES).filter(([, s]) => s.chip).map(([id]) => id);
  ok(chips.length > 0 && chips.every((c) => chipIds.some((id) => c.includes(SOURCES[id].chip))),
    `${host}: every example the start screen offers is gated (${chips.join(', ')})`);
  ok(chipIds.every((id) => chips.some((c) => c.includes(SOURCES[id].chip))), `${host}: every gated example is offered (${chipIds.join(', ')})`);
}

// ── per brand: web == plugin == the committed emission ──────────────────────────────────────────────
for (const id of GATED) {
  const expected = readFileSync(join(OUT, `${id}.tokens.json`), 'utf8');
  let web, figma;
  try { web = await exportFrom('web', id); } catch (e) { ok(false, `${id}: the web export ran — ${e.message.split('\n')[0]}`); continue; }
  try { figma = await exportFrom('figma', id); } catch (e) { ok(false, `${id}: the plugin export ran — ${e.message.split('\n')[0]}`); continue; }
  ok(web.errors.length === 0, `${id}: web raised no page error${web.errors.length ? ` — ${web.errors[0]}` : ''}`);
  ok(figma.errors.length === 0, `${id}: plugin raised no page error${figma.errors.length ? ` — ${figma.errors[0]}` : ''}`);
  ok(web.name === `${id}.tokens.json` && figma.name === web.name, `${id}: both download ${id}.tokens.json (web ${web.name}, plugin ${figma.name})`);
  ok(web.body === figma.body, `${id}: PARITY — web and plugin exports are byte-identical (${web.body.length} / ${figma.body.length} bytes)${web.body === figma.body ? '' : ` — ${firstDiff(web.body, figma.body)}`}`);
  ok(web.body === expected, `${id}: ACCURACY — the web export is out/${id}.tokens.json byte for byte (${web.body.length} / ${expected.length} bytes)${web.body === expected ? '' : ` — ${firstDiff(web.body, expected)}`}`);
  ok(figma.body === expected, `${id}: ACCURACY — the plugin export is out/${id}.tokens.json byte for byte (${figma.body.length} / ${expected.length} bytes)${figma.body === expected ? '' : ` — ${firstDiff(figma.body, expected)}`}`);
}

await browser.close();
server.close();
hooks.report(ok);
console.log(failed ? `\n✗ export parity: ${failed} assertion(s) failed` : '\nexport parity: all assertions pass');
process.exit(failed ? 1 : 0);
