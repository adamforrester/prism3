/**
 * Mode-sensitivity audit — which sections actually respond to the mode bar.
 *
 * Run:  npm run -w @prism3/web build && npm run -w @prism3/web audit:modes
 *       (serves `web/` on :8899 itself; needs Playwright + a Chromium at PLAYWRIGHT_BROWSERS_PATH)
 *
 * WHY THIS IS A SCRIPT AND NOT A TABLE IN A DOC. The answer moves every time a page changes, and it
 * has been re-derived by hand three times (#268 twice, #432 once) at meaningful cost. A committed
 * probe makes the next answer a command instead of an afternoon.
 *
 * WHY IT MEASURES INSTEAD OF READING THE SOURCE. Both static approaches are on record as WRONG, in
 * opposite directions (#268):
 *   - counting `currentMode` per function UNDER-counts — the read hides behind delegation
 *     (`renderPerModeRadius` → `renderPerModeSelect`), so the caller looks mode-blind;
 *   - resolving the call graph on a real TS AST OVER-counts — every control calls `build()` to
 *     re-render, so the graph leaks back through the chrome and every page reaches every page.
 * Switching the mode and diffing the DOM answers it in one pass. Do not re-derive this statically.
 *
 * THE SIGNATURE IS THE SUBTLE PART, and it took three tries (#432) — each earlier version returned a
 * clean-looking table that was wrong:
 *   1. control VALUES only            → said Interactive edits nothing. Values match while the
 *                                       control SET changes (global slider → "Auto" select).
 *   2. values + option labels         → said Elevation edits nothing. Its per-mode affordance is an
 *                                       IDENTICAL range slider: same type, same value, same options.
 *                                       Only the knob LABEL changes to "Auto (1)", and only what it
 *                                       writes changes (`modeLevers[mode].shadow`).
 *   3. values + options + knob label  → agrees with #268's independent audit on every shared page.
 * If a future affordance carries its per-mode-ness somewhere else again, this signature will
 * under-count in the same silent way. Widen it; don't trust a quiet pass.
 *
 * VERDICTS
 *   EDITS    — the control set/labels differ between modes. The bar is an EDITING SCOPE here.
 *   displays — only previews/readouts re-resolve. The bar is CONTEXT: useful, but not scoping an edit.
 *   inert    — nothing changes at all. The bar is claiming an axis the section does not have.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

// Playwright is deliberately NOT a repo dependency. Whether this repo takes on a browser-test
// dependency is #333's decision, and one audit script should not pre-empt it — so the import is
// dynamic and the failure explains itself rather than reading as a broken script.
// NOTE: NODE_PATH does not work here — Node ignores it for ESM bare specifiers, so "install it
// globally" is not a usable escape hatch. PLAYWRIGHT_MODULE takes an explicit path for that case.
let chromium;
try {
  // `?? .default` because a CommonJS copy (the usual shape when PLAYWRIGHT_MODULE points at a global
  // install) lands its exports under `default` rather than as named bindings.
  const mod = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  chromium = mod.chromium ?? mod.default?.chromium;
  if (!chromium) throw new Error('no chromium export');
} catch {
  console.error('\nmode-audit needs Playwright, which this repo does NOT depend on (see #333).\n'
    + '  as a dev dependency   npm i -D playwright        (a repo-level choice — see #333 first)\n'
    + '  or point at a copy    PLAYWRIGHT_MODULE=$(npm root -g)/playwright/index.js \\\n'
    + '                          npm run -w @prism3/web audit:modes\n');
  process.exit(2);
}

const ROOT = new URL('.', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.map': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(8899, '127.0.0.1', r));

// Positional arg is the brand; flags are filtered out so `audit:modes -- --check-badges` does not
// read the flag as a brand name and hang waiting for a button that will never exist.
const BRAND = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'harbor';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page.goto('http://127.0.0.1:8899/index.html', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: BRAND }).click();
await page.waitForTimeout(1000);

const snap = () => page.evaluate(() => {
  const ws = document.querySelector('.ws') ?? document.body;
  const secs = [...ws.querySelectorAll('.psec')];
  const nodes = secs.length ? secs : [...ws.children];
  const sig = (s) => [...s.querySelectorAll('input,select')].map((e) => {
    const label = e.closest('.knob')?.textContent?.trim().slice(0, 60) ?? '';
    const ctrl = e.tagName === 'SELECT'
      ? `SEL[${[...e.options].map((o) => o.text).join('/')}]=${e.value}`
      : `IN:${e.type}=${e.value}`;
    return `${label}>>${ctrl}`;
  }).join(' | ');
  return nodes.map((s, i) => {
    const badge = s.querySelector('.msb');
    return {
      name: (s.querySelector('.psec-t')?.textContent ?? s.querySelector('h2,h3')?.textContent ?? `section ${i + 1}`).trim(),
      ctrl: sig(s),
      html: s.innerHTML,
      // #439 — what the section CLAIMS about itself, so --check-badges can compare claim to measurement.
      badge: badge ? (badge.classList.contains('on') ? 'per-mode' : 'shared') : null,
    };
  });
});

const stages = (await page.locator('.stage').allTextContents()).map((s) => s.split('\n')[0].trim());
const tally = { EDITS: 0, displays: 0, inert: 0 };
const claims = [];
const noBar = [];
console.log(`\nMode-sensitivity audit — brand '${BRAND}', Light vs Dark, 1440px\n${'='.repeat(64)}`);
for (const stage of stages) {
  await page.locator('.stage').filter({ hasText: stage }).first().click();
  await page.waitForTimeout(500);
  if ((await page.locator('.modectx').count()) === 0) { noBar.push(stage); continue; }
  await page.locator('button').filter({ hasText: /^Light/ }).first().click();
  await page.waitForTimeout(500);
  const light = await snap();
  await page.locator('button').filter({ hasText: /^Dark/ }).first().click();
  await page.waitForTimeout(650);
  const dark = await snap();
  const edits = light.filter((s, i) => dark[i] && s.ctrl !== dark[i].ctrl).length;
  console.log(`\n${stage}  —  ${edits}/${light.length} sections edit per mode`);
  for (const [i, s] of light.entries()) {
    const d = dark[i];
    if (!d) { console.log(`   ??????    ${s.name}  (section count differs between modes)`); continue; }
    const v = s.ctrl !== d.ctrl ? 'EDITS   ' : s.html !== d.html ? 'displays' : 'inert   ';
    tally[v.trim() === 'EDITS' ? 'EDITS' : v.trim()]++;
    // Two UI states from three verdicts: only EDITS is per-mode; displays and inert both mean
    // "the bar does not reach this", which is the distinction a user can act on.
    claims.push({ page: stage.slice(0, 22), name: s.name, verdict: v.trim(),
                  expected: v.trim() === 'EDITS' ? 'per-mode' : 'shared', badge: s.badge });
    console.log(`   ${v}  ${s.name}${s.badge ? '' : '   (no badge)'}`);
  }
}
console.log(`\nNo mode bar: ${noBar.join(' · ')}`);
console.log(`Totals across bar pages: ${JSON.stringify(tally)}\n`);

// --check-badges: the map in main.ts (SECTION_MODE_SCOPE) is hand-maintained from THIS measurement,
// so it can drift the moment a section changes behaviour or gets renamed. Comparing the badge the
// page renders against the verdict measured in the same pass closes that: a renamed section loses
// its map entry and shows up as `missing`, and a section that stops (or starts) editing per mode
// shows up as a mismatch. Exits non-zero so it can gate.
if (process.argv.includes('--check-badges')) {
  const bad = claims.filter((c) => c.badge !== c.expected);
  console.log(`--check-badges — ${claims.length} badged/expected sections compared`);
  for (const c of bad) {
    console.log(`   ${c.page} / ${c.name}`);
    console.log(`      measured ${c.verdict} -> expected badge '${c.expected}', page renders ${c.badge === null ? 'NO BADGE (missing map entry?)' : `'${c.badge}'`}`);
  }
  if (bad.length) { console.log(`\n${bad.length} mismatch(es).\n`); process.exit(1); }
  console.log('   ✓ every badge matches what the page actually does\n');
}
await browser.close();
server.close();
