/**
 * Studio headless smoke suite (#767, deciding #333).
 *
 *   npm run -w @prism3/studio build && npm run -w @prism3/studio test:smoke
 *
 * WHY THIS EXISTS, AND WHY IT COULD NOT BE A UNIT TEST. `src/main.ts` touches `document` at import
 * time, so it cannot be loaded into a Node harness at all. That is not a stylistic gap: it means the
 * ~9,000 lines of interaction logic in that file have NO available unit granularity, which is exactly
 * why both existing suites (`test-provenance.ts` #722, `test-export-settings.ts` #723) cover modules
 * EXTRACTED from it rather than the file itself. Until that seam moves (#768), a browser is the only
 * harness that can see this code run.
 *
 * And the defects the file actually produces are rendering and interaction defects, not shape bugs:
 * a label that disagrees with what selecting it does (#330), a specimen frozen at the wrong value
 * (#422), a select that jumps the page while scrolled (#485), text invisible against its own ground
 * (#555). A jsdom test verifies shapes. #333 asked which shape to build; #767 answered "smoke".
 *
 * WHAT IT REPLACES. Every behavioral verification this repo has done on the studio — including all
 * ten fixes merged 2026-08-07 — was a throwaway Playwright script, deleted after the PR. Real
 * verification, never captured. This is the same driving, committed.
 *
 * COMPOSES WITH, DOES NOT REPLACE. `npm run -w @prism3/studio test` still runs #722/#723's ~150
 * assertions unchanged; this is a separate `test:smoke` script and a separate CI step, so a browser
 * flake can never take the pure suites down with it.
 *
 * ── determinism ────────────────────────────────────────────────────────────────────────────────
 *
 * Every wait in this file is a wait on a REAL CONDITION — a selector, `document.fonts.ready`, or a
 * `waitForFunction` on the state the click was supposed to produce. There is not one arbitrary sleep,
 * deliberately: a flaky browser suite that blocks every PR is the fastest way to erode trust in gates
 * generally, and this repo's gate discipline is worth more than this suite is. `mode-audit.mjs` uses
 * `waitForTimeout` throughout; it is an ad-hoc audit a human reads, and the tradeoff is different for
 * something CI runs on every push.
 *
 * PORT. This serves on an EPHEMERAL port (`listen(0)`) rather than a second fixed one. `mode-audit.mjs`
 * holds 8899; two harnesses on one port collide as `EADDRINUSE`, which reads exactly like a test
 * failure and would be debugged as one. Picking another fixed number only moves the collision.
 *
 * FRESH CONTEXT PER BRAND. The studio persists its working brand to `localStorage`, so a shared
 * context would carry brand 1's state — and any override this suite writes — into brand 2. A new
 * context per brand also puts the app back on its first-run start screen, which is how a brand gets
 * chosen without going through the overwrite-confirm path.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = dirname(fileURLToPath(import.meta.url));

// ---- the assertion harness -------------------------------------------------------------------
// Same `ok(...)` shape as `test-provenance.ts` / `test-export-settings.ts`, so the three suites read
// alike and a failure line means the same thing in all of them.
let failed = 0;
let executed = 0;
const failures = [];
const ok = (cond, label) => {
  executed++;
  if (cond) return;
  failed++;
  failures.push(label);
  console.error(`  ✗ ${label}`);
};

// ---- the static server -----------------------------------------------------------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.map': 'application/json' };
// Read BEFORE writing the header — the trap `mode-audit.mjs` records at #565: a missing file threw
// with the 200 already sent, so the catch's `writeHead(404)` raised ERR_HTTP_HEADERS_SENT outside the
// try, unhandled, and killed the harness. A harness that exits instead of reporting looks like a
// clean run.
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

// ---- the rendered-contrast probe -------------------------------------------------------------
/**
 * Every text node's ink against the ground it is ACTUALLY drawn on — the opacity chain applied and
 * every translucent layer composited down to the first opaque ancestor.
 *
 * This is the class of defect `lint:contrast` structurally cannot see. That gate holds the chrome's
 * TOKEN VALUES to 4.5:1 and is right to; #555 then found `.mo-playnote` rendering at 3.12:1 because
 * a legal `--faint` was faded through `opacity: .75`, and four families of fixed-ground specimen
 * inked with a mode-resolved color (1.00–1.61:1 — invisible). The token was legal in every case. The
 * pairing was not, and only a render can tell you that.
 *
 * Runs in the page rather than over a screenshot: a pixel diff would answer "did this change", and
 * the question here is "can this be read".
 */
const CONTRAST_PROBE = () => {
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** Walk up compositing every translucent background until an opaque one is reached; the canvas
   *  under everything is white, which is what the page paints when nothing else claims a pixel. */
  const groundOf = (el) => {
    let acc = null;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        const layer = { ...c, a: c.a * Number(cs.opacity) };
        acc = acc ? over(acc, layer) : layer;
        if (acc.a >= 0.999) return { ...acc, a: 1 };
      }
    }
    const white = { r: 255, g: 255, b: 255, a: 1 };
    return acc ? over(acc, white) : white;
  };
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    // OWN text only. Measuring an ancestor's `textContent` would attribute a child's ink to the
    // parent's color and report pairings that are drawn nowhere.
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    let op = 1;
    for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
    // Effectively invisible by intent (a collapsed panel mid-transition) — not a legibility finding.
    if (op < 0.02) continue;
    const col = parse(cs.color);
    if (!col) continue;
    const ground = groundOf(el);
    out.push({
      ratio: Math.round(ratio(over({ ...col, a: col.a * op }, ground), ground) * 100) / 100,
      cls: `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className : '').trim().replace(/\s+/g, '.') || '-'}`,
      text: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').slice(0, 44),
    });
  }
  return out;
};

/**
 * THE FLOOR IS "INVISIBLE", NOT "AA" — and the two numbers that set it are recorded here so the next
 * person can see how much budget there is rather than re-deriving it.
 *
 * Measured on this branch across the whole sweep below (15,638 text nodes, 72 page × mode × brand
 * states): the lowest rendered ratio in the studio today is **3.04:1**, and everything in the 3.0–3.2
 * band is a specimen meeting its OWN engine contract — the disabled set at `disabledMin` (3), the
 * `-subtle` semantics at `secondaryMin`. Those are the brand's contracted values being previewed
 * correctly, and asserting AA over them would fail the suite on the engine working.
 *
 * The defects this floor exists for sat at **1.00–1.61:1** (#555's four families). So 2.0 sits in the
 * gap with ~1.5× margin above the real defects and ~1.5× below the legitimate floor. Every run prints
 * the observed minimum, so erosion toward 2.0 is visible before it is a failure — the thing #355's
 * hand-fix could not leave behind and #516 added for the token values.
 */
const CONTRAST_FLOOR = 2.0;

// ---- browser plumbing ------------------------------------------------------------------------
const browser = await chromium.launch();

/** Console errors, uncaught exceptions, and failed requests, collected per page and drained per
 *  state — so a failure names the page × mode it happened on rather than a run-wide total. */
const watchErrors = (page) => {
  const seen = [];
  page.on('console', (m) => { if (m.type() === 'error') seen.push(`console.error: ${m.text()}`); });
  page.on('pageerror', (e) => seen.push(`uncaught: ${e.message}`));
  page.on('requestfailed', (r) => seen.push(`request failed: ${r.url()} (${r.failure()?.errorText})`));
  return () => seen.splice(0, seen.length);
};

/** Click a rail destination and WAIT FOR THE PAGE TO BE THE ACTIVE ONE — not for a duration. If the
 *  nav ever stops marking the destination active, this hangs and then fails loudly, which is the
 *  correct outcome; a sleep would measure the previous page and call it a pass. */
const gotoPage = async (page, label) => {
  await page.locator('.stage').filter({ has: page.locator('.stage-t b', { hasText: label }) }).first().click();
  await page.waitForFunction((l) => document.querySelector('.stage.active .stage-t b')?.textContent === l, label);
  await page.evaluate(() => document.fonts.ready);
};

/** Same contract for the mode bar: the wait is "the bar says this mode is selected". */
const selectMode = async (page, label) => {
  await page.locator('.mctx-b').filter({ hasText: label }).first().click();
  await page.waitForFunction((m) => document.querySelector('.mctx-b.on .mctx-name')?.textContent === m, label);
  await page.evaluate(() => document.fonts.ready);
};

/** Open the app on `brand`, from the first-run start screen, in its own storage context. */
const openBrand = async (brand) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const drain = watchErrors(page);
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('.start-chip').filter({ hasText: brand }).click();
  await page.waitForSelector('.stage.active');
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, drain };
};

// The corpus the studio actually offers — read from the page, never restated here. A restated list
// would keep passing the day a brand is added to `schema/example-brands.json` and never loaded.
const BRANDS = await (async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
  const names = await page.locator('.start-chip').allTextContents();
  await ctx.close();
  return names.map((n) => n.trim());
})();
ok(BRANDS.length >= 2, `the start screen offers at least the two corpus brands (found ${BRANDS.length}: ${BRANDS.join(', ')})`);

// =============================================================================================
// 1. The sweep — every page, in every mode, on every corpus brand
// =============================================================================================
console.log(`\nSweep — every page × mode × brand\n${'='.repeat(78)}`);

let worstRatio = Infinity;
let worstWhere = '';
let nodesMeasured = 0;
let statesVisited = 0;

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);
  const boot = drain();
  ok(boot.length === 0, `${brand}: boots clean — 0 console errors${boot.length ? ` (${boot[0]})` : ''}`);

  // The rail's own labels, read from the `b` that carries them — the `small` beside it is the
  // subtitle, and taking the button's whole textContent would glue the two together.
  const pages = (await page.locator('.stage .stage-t b').allTextContents()).map((s) => s.trim());
  ok(pages.length >= 8, `${brand}: the rail offers ${pages.length} destinations`);

  // MODE IS THE OUTER AXIS, and that is load-bearing rather than a loop-order preference.
  //
  // Three of the nine pages render no mode bar at all (#268: the bar appears only where a
  // mode-varying control exists), but `currentMode` is module state that survives navigation — so
  // those pages still render THROUGH the selected mode, and a page-outer loop would only ever visit
  // them in whatever mode the previous page happened to leave behind. Measured: Typography and Layout
  // reached from a derived mode drop their editors entirely for the read-only note, which a
  // page-outer sweep sees as an unexplained blank page (it did, on the first run of this file).
  //
  // So: pick the mode on a page that HAS the bar, then walk every page carrying it. That is also the
  // sequence a user performs, and it is what makes "every page in every mode" true rather than
  // "every page that offers a mode bar".
  const barPage = await (async () => {
    for (const label of pages) {
      await gotoPage(page, label);
      if (await page.locator('.mctx-b').count() > 0) return label;
    }
    return null;
  })();
  ok(barPage !== null, `${brand}: at least one page carries the mode bar (found ${barPage})`);
  await gotoPage(page, barPage);
  const modes = (await page.locator('.mctx-b .mctx-name').allTextContents()).map((m) => m.trim());
  ok(modes.length >= 2, `${brand}: the mode bar offers ${modes.length} modes (${modes.join(', ')})`);

  for (const mode of modes) {
    await gotoPage(page, barPage);
    await selectMode(page, mode);
    for (const label of pages) {
      await gotoPage(page, label);
      const hasBar = await page.locator('.mctx-b').count() > 0;
      const where = `${brand} / ${label} / ${mode}`;
      statesVisited++;

      // --- zero console errors -----------------------------------------------------------------
      const errs = drain();
      ok(errs.length === 0, `${where}: 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);

      // --- key DOM assertions ------------------------------------------------------------------
      const dom = await page.evaluate(() => {
        const err = document.querySelector('.errbar-global');
        return {
          heroTitle: document.querySelector('.hero h1')?.textContent?.trim() ?? '',
          controls: document.querySelectorAll('.ws input, .ws select, .ws button').length,
          errorBarShown: !!err && getComputedStyle(err).display !== 'none',
          errorBarText: err?.textContent?.trim() ?? '',
          // A derived mode (HC light / HC dark / Wireframe) is auto-generated and never hand-tuned, so
          // its editors are replaced by a read-only explanation. That is a legitimate way to have no
          // controls — and the ONLY one.
          readOnlyNote: document.querySelectorAll('.genview').length,
          modeOn: [...document.querySelectorAll('.mctx-b.on .mctx-name')].map((n) => n.textContent),
          // A page wider than the viewport is a layout regression the eye catches instantly and no
          // static check ever will. +1 for sub-pixel rounding; anything real overshoots by much more.
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      ok(dom.heroTitle.length > 0, `${where}: renders a hero title ("${dom.heroTitle}")`);
      // "Not blank" stated as the disjunction the app actually promises: either something to edit, or
      // a note saying why there is nothing. Asserting `controls > 0` alone fails on the read-only
      // derived modes — which is the app being right — and asserting nothing at all would pass on a
      // page that rendered its hero and then threw.
      ok(dom.controls > 0 || dom.readOnlyNote > 0,
        `${where}: renders ${dom.controls} control(s), or a read-only note when the mode is derived`);
      ok(!dom.errorBarShown, `${where}: the global error bar is hidden${dom.errorBarShown ? ` — "${dom.errorBarText}"` : ''}`);
      ok(dom.overflowX <= 1, `${where}: no horizontal overflow (${dom.overflowX}px past the viewport)`);
      if (hasBar) {
        // The bar must AGREE with the mode this state was set to. A mode switch that silently no-ops,
        // or a page that resets the mode on entry, leaves the wrong one marked — and then every
        // assertion in this state is measuring a mode nobody asked for.
        ok(dom.modeOn.length === 1 && dom.modeOn[0] === mode,
          `${where}: the mode bar still marks exactly this mode (marks ${JSON.stringify(dom.modeOn)})`);
      }

      // --- rendered contrast -------------------------------------------------------------------
      const rows = await page.evaluate(CONTRAST_PROBE);
      nodesMeasured += rows.length;
      const under = rows.filter((r) => r.ratio < CONTRAST_FLOOR);
      for (const r of rows) if (r.ratio < worstRatio) { worstRatio = r.ratio; worstWhere = `${where} — ${r.cls} "${r.text}"`; }
      ok(under.length === 0, `${where}: every one of ${rows.length} text nodes clears ${CONTRAST_FLOOR}:1${
        under.length ? ` — ${under.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1`).join(' | ')}` : ''}`);
    }
  }
  console.log(`  ${brand}: ${pages.length} pages × ${modes.length} modes swept (${pages.join(', ')})`);
  await ctx.close();
}

console.log(`\n  ${statesVisited} page × mode states, ${nodesMeasured} text nodes measured.`);
console.log(`  Lowest rendered contrast anywhere: ${worstRatio}:1 (floor ${CONTRAST_FLOOR}:1)`);
console.log(`    ${worstWhere}`);

// =============================================================================================
// 2. The controls — driven, not merely rendered
// =============================================================================================
// A page that loads clean proves the renderer runs. It proves nothing about what the controls DO,
// which is where #330 and #485 both lived. These three drives are the core interactions #767 names:
// the mode switch (exercised throughout the sweep above), an override picker, and an export.
console.log(`\nControls\n${'='.repeat(78)}`);

for (const brand of BRANDS) {
  const { ctx, page, drain } = await openBrand(brand);

  // --- 2a. the override picker: does its "Auto" label tell the truth? (#330) --------------------
  //
  // #330's repro, exactly: pick a step, re-read the Auto option, pick Auto again. The defect was that
  // `autoStep` came from the LIVE resolved role — which already reflects the override — so the Auto
  // label mirrored your own manual pick back at you and then reverted to a different value when
  // clicked. A control whose label lies about its own behavior.
  //
  // The row is found by its TOKEN PILL, not by index: `color.interactive.primary.text.rest` is the
  // role, and an index would silently start testing a different row the day one is inserted above it.
  await gotoPage(page, 'Interactive');
  const ROLE = 'color.interactive.primary.text.rest';
  const row = page.locator('.arow').filter({ hasText: ROLE }).first();
  ok(await row.count() > 0, `${brand}: the ${ROLE} row is present`);

  const readRow = () => row.evaluate((el) => {
    const sel = el.querySelector('.sf-ctlblock select');
    return {
      auto: sel?.options[0]?.text ?? null,
      value: sel?.value ?? null,
      steps: [...(sel?.options ?? [])].slice(1).map((o) => o.value),
      swatch: getComputedStyle(el.querySelector('.asw')).backgroundColor,
    };
  });

  const before = await readRow();
  ok(/^Auto · /.test(before.auto ?? ''), `${brand}: the picker's first option is the Auto option ("${before.auto}")`);
  ok(before.value === '', `${brand}: the row starts on Auto (no override)`);

  // The step to pick has to be one that MOVES the resolved color — an override that happens to land
  // on the baseline would leave every reading below identical and pass this whole section on a defect.
  // Found by driving, not by parsing the Auto label for its step name: that parse would silently pick
  // the wrong step the day the label's punctuation changes, and this section would go quietly weak.
  let pick = null;
  let during = null;
  for (const step of before.steps) {
    await row.locator('.sf-ctlblock select').selectOption(step);
    await page.waitForFunction(
      ([r, p]) => [...document.querySelectorAll('.arow')].find((el) => el.textContent.includes(r))
        ?.querySelector('.sf-ctlblock select')?.value === p, [ROLE, step]);
    during = await readRow();
    if (during.swatch !== before.swatch) { pick = step; break; }
  }
  ok(pick !== null, `${brand}: some step in the picker moves the resolved color (picked '${pick}')`);
  ok(during?.value === pick, `${brand}: picking '${pick}' sets the override`);
  // THE #330 ASSERTION. The Auto option names the engine's baseline; an override must not move it.
  ok(during?.auto === before.auto,
    `${brand}: the Auto label still names the true baseline with an override active `
    + `— was "${before.auto}", now "${during.auto}" (#330)`);

  // And the other half of #330, which is the half that made it a lie rather than a cosmetic slip:
  // selecting Auto must produce the value its own label promised.
  await row.locator('.sf-ctlblock select').selectOption('');
  await page.waitForFunction(
    (r) => [...document.querySelectorAll('.arow')].find((el) => el.textContent.includes(r))
      ?.querySelector('.sf-ctlblock select')?.value === '', ROLE);
  const after = await readRow();
  ok(after.swatch === before.swatch,
    `${brand}: selecting Auto returns the color the Auto label named (was ${before.swatch}, now ${after.swatch}) (#330)`);
  ok(after.auto === before.auto, `${brand}: the Auto label is unchanged after the round trip (#330)`);

  // --- 2b. a select must not jump the page while scrolled (#485) --------------------------------
  //
  // `applyFull()` → `renderWorkspace()` does `workspace.innerHTML = ''`, which resets scroll as a side
  // effect; #485 fixed it once for every current AND future caller by saving/restoring around the
  // teardown. Driven on Surfaces, which is where it was reported.
  await gotoPage(page, 'Surfaces & fills');
  const surfSel = page.locator('.psec').filter({ hasText: 'Backgrounds' }).locator('select').first();
  const opts = await surfSel.evaluate((s) => [...s.options].map((o) => o.value));
  const cur = await surfSel.inputValue();
  const target = opts.find((o) => o !== cur);
  const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  ok(height > 400, `${brand}: the Surfaces page is scrollable (${height}px of travel) — the jump is observable`);
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForFunction(() => window.scrollY === 400);
  await surfSel.selectOption(target);
  // Wait on the EDIT having landed IN THE REBUILT SECTION — `applyFull()` replaces the whole
  // workspace, so this condition is only true once the new DOM exists. Not a timer, and not a read of
  // the pre-rebuild element, which would already hold the new value and prove nothing.
  await page.waitForFunction((t) => [...document.querySelectorAll('.psec')]
    .find((s) => s.textContent.includes('Backgrounds'))?.querySelector('select')?.value === t, target);
  const scrollY = await page.evaluate(() => window.scrollY);
  ok(Math.abs(scrollY - 400) <= 2, `${brand}: changing a surface select holds the scroll position (400 → ${scrollY}) (#485)`);

  // --- 2c. the export actually writes a file ----------------------------------------------------
  // The dialog rendering is #723's suite; what only a browser can check is that clicking Download
  // produces a real file whose bytes parse.
  await page.locator('button[aria-label="Export"]').click();
  await page.waitForSelector('.exdlg');
  const pending = page.waitForEvent('download');
  await page.locator('.exdlg-go').click();
  const dl = await pending;
  ok(dl.suggestedFilename().endsWith('.tokens.json'), `${brand}: the export downloads ${dl.suggestedFilename()}`);
  const body = await readFile(await dl.path(), 'utf8');
  let parsed = null;
  try { parsed = JSON.parse(body); } catch { /* reported by the assertion below */ }
  ok(parsed !== null && typeof parsed === 'object', `${brand}: the exported token file is valid JSON (${body.length} bytes)`);
  ok(parsed !== null && Object.keys(parsed).length > 0, `${brand}: the exported token tree is not empty`);

  const errs = drain();
  ok(errs.length === 0, `${brand}: driving the controls raised 0 console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

// =============================================================================================
await browser.close();
server.close();

if (failed) {
  console.error(`\n❌ ${failed} FAILED of ${executed} assertions:`);
  for (const f of failures) console.error(`   ✗ ${f}`);
} else {
  console.log(`\n✅ ALL PASS — ${executed} assertions executed`);
}
process.exit(failed === 0 ? 0 : 1);
