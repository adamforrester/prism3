#!/usr/bin/env node
// Renders every direction's states to PNG with the pre-installed Playwright, at deviceScaleFactor 2.
//
//   node docs/superpowers/update-dialog-redesign/build.mjs && node docs/superpowers/update-dialog-redesign/shoot.mjs
//
// Each shot is the plugin-sized window alone (`.mk-window`), driven through the mock's URL parameters, so a shot is the
// same page a reviewer clicks through. It fails when a page logs an error, or when the dialog overflows its window
// sideways (a row wider than the dialog).
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const SHOTS = [
  ...['owner', 'chosen', 'clean', 'fresh', 'checking'].flatMap((c) => ['light', 'dark'].map((mode) => ({ c, mode, w: 'wide' }))),
  ...['owner', 'chosen'].map((c) => ({ c, mode: 'light', w: 'narrow' })),
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 2 });
const problems = [];
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
for (const d of ['a', 'b', 'c']) {
  for (const s of SHOTS) {
    await page.goto(`${pathToFileURL(join(HERE, `direction-${d}.html`)).href}?case=${s.c}&mode=${s.mode}&w=${s.w}&full=1`);
    await page.evaluate(() => document.fonts.ready);
    const over = await page.evaluate(() => {
      const dlg = document.querySelector('.mk-dlg');
      return [...dlg.querySelectorAll('*')].filter((n) => n.getBoundingClientRect().right > dlg.getBoundingClientRect().right + 1).map((n) => n.className || n.tagName).slice(0, 3);
    });
    if (over.length) problems.push(`${d} ${s.c} ${s.w}: wider than the dialog: ${over.join(', ')}`);
    const name = `${d}-${s.c}-${s.mode}${s.w === 'narrow' ? '-380' : ''}.png`;
    await page.locator('.mk-window').screenshot({ path: join(HERE, 'shots', name) });
  }
}
await browser.close();
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`wrote ${SHOTS.length * 3} shots`);
