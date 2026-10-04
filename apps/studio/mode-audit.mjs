/**
 * Mode-sensitivity audit — which sections actually respond to the mode bar.
 *
 * Run:  npm run -w @prism3/studio build && npm run -w @prism3/studio audit:modes
 *       (serves the studio itself on a free port; needs Playwright + a Chromium at PLAYWRIGHT_BROWSERS_PATH)
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
 * WHAT #771 DID TO THIS AUDIT'S INDEPENDENCE — stated plainly, because it is a real loss and the
 * previous owner of this hazard (#545, below) is the reason it is worth naming rather than inheriting.
 *
 * Badge COMPUTATION did not move: `attachModeBadges` is still one post-render pass over the rendered
 * tree, `modeScopeBadge`'s ordering is untouched, and `.msb` still lands in the same head. Nothing in
 * this file had to migrate. What changed is underneath: clicking a mode button no longer rebuilds the
 * page. `renderWorkspace` now keeps every region whose rendered SIGNATURE is unchanged and swaps only
 * the rest — so the DOM this audit diffs across modes is, on the unchanged half, literally the same
 * nodes it saw before the click.
 *
 * That makes the DOM-diff half of this audit downstream of the renderer's own keep decision, and the
 * coupling runs one way: main.ts's signature is a strict superset of `sig()` here (it serializes the
 * whole region plus every control's live value, where this records control set + labels + values). So
 * this audit cannot see a difference the renderer missed. If that signature ever goes blind to a real
 * per-mode difference, the section is kept, the DOM does not move, and THIS FILE REPORTS `inert` —
 * agreeing with the bug, exactly the #464 shape the derived-mode note below already records.
 *
 * The mitigation is the one already here, and it is why it stays load-bearing: `probeSection`'s
 * localStorage-blob check is NOT a DOM read. A control that edits a token moves `prism3:brandInput`
 * whether or not any node was replaced. That half is still independent; the DOM diff is not. Do not
 * "simplify" the blob probe away on the grounds that the DOM diff already says the same thing.
 *
 * LOCATED BY HOOKS, NOT BY CLASSES OR TITLES (#1829). F1 moved the three browser suites onto `data-p3`
 * hooks; this audit was left on `.stage`, `.psec`, `.psec-t`, `.mctx-b.derived` and a `/^Light/` text match,
 * so the first redesign slice to rename a class would have broken it with nothing noticing. Now every
 * element it finds or clicks is found by its hook, through the same guard as the suites
 * (`test-hooks.mjs`): a hook it names that never rendered fails by name, and every click goes through
 * `hooks.click`. A section is found as the parent of its `section-head`, because several sections already
 * carry a role of their own and a hook is one value. Three things still read classes on purpose: the
 * `derived` and `on` state tokens on a mode tab (state, not identity, as in the suites), and `.knob`, which
 * is not a lookup but part of the SIGNATURE — the text a control's label carries. That one is held by a
 * floor instead: if no control on any bar page reads a label, the signature has gone blind to case 2
 * below and the audit fails naming it, rather than under-counting in silence.
 *
 * IN CI WITH `--check-badges` (#1897 added the step for the INSTRUMENT, #1887 added the flag). Without the
 * flag the table is a report, and the run exits 1 only through `ok()` above (a hook never rendered, heads
 * and titles disagreeing, the label floor). With it, every badge must also match the measurement. #1887
 * found the flag red on `main` with five to six mismatches depending on brand, from two causes, diagnosed
 * one by one. The radio-group ones (Density & size, Tempo, aurora's Icon colors) were this file's probe,
 * which could not change a radio; `poke` is fixed. The three sections with no badge at all (Links, Control
 * shape, Buttons) are the studio's map, filed as #1912, and they stand below as `KNOWN_BADGE_GAPS`: named,
 * issue-numbered, and failing the run the moment they go stale. CI runs the default brand (harbor);
 * aurora and prism3 measured identically at the time of #1887. It is deleted with the mode strip it audits
 * (S13), and its CI step goes with it.
 *
 * NOTHING TO READ, RECORDED BY NAME (UI redesign S9.2, owner decision 2026-10-04, option B). After S7 and S9.2 the
 * only legacy page that draws a mode strip is Size & radius, left with the Button options, and its one section,
 * Buttons, carries no mode-scope badge: that is #1912's last row in `KNOWN_BADGE_GAPS`, kept unbadged until S8 or S13
 * retires the page and this audit. So no legacy section renders `mode-scope-badge`, and the badge read and the hook
 * guard on that hook have nothing to read. The run says so by name ("mode-scope badge read: NOTHING TO READ …") and
 * drops that one hook from the guard ONLY while every measured section renders no badge and every one of them is a
 * known gap. The moment any legacy section renders a badge, the read runs and checks it as before, and the hook is
 * guarded again; a section that should be badged and is not still fails `--check-badges` by name.
 *
 * VERDICTS
 *   EDITS    — the control set/labels differ between modes. The bar is an EDITING SCOPE here.
 *   displays — only previews/readouts re-resolve. The bar is CONTEXT: useful, but not scoping an edit.
 *   inert    — nothing changes at all. The bar is claiming an axis the section does not have.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { hookGuard } from './test-hooks.mjs';

// The same hook guard as the browser suites (#1829): hooks named in this file that never rendered fail by
// name at the end of the run, and a failure here makes the run exit non-zero even without `--check-badges`,
// because an audit whose instrument went blind is not a measurement.
const hooks = hookGuard(import.meta.url);
const failures = [];
const ok = (cond, label) => { if (!cond) { failures.push(label); console.log(`   ✗ ${label}`); } };

// Playwright IS a dependency now — an `apps/studio` devDependency, taken by #767 when it settled
// #333 so the smoke suite could gate in CI without depending on ambient global state on the runner.
// (This comment used to say the opposite and defer the choice; the choice was made.) So the bare
// `import('playwright')` below normally just resolves.
//
// The dynamic import and the PLAYWRIGHT_MODULE hatch stay, for the one case the devDependency does
// not cover: pointing this audit at a DIFFERENT copy than the workspace's — a globally installed one,
// or a version being compared. NOTE: NODE_PATH does not work for that; Node ignores it for ESM bare
// specifiers, so an explicit path is the only usable form.
let chromium;
try {
  // `?? .default` because a CommonJS copy (the usual shape when PLAYWRIGHT_MODULE points at a global
  // install) lands its exports under `default` rather than as named bindings.
  const mod = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  chromium = mod.chromium ?? mod.default?.chromium;
  if (!chromium) throw new Error('no chromium export');
} catch {
  console.error('\nmode-audit could not load Playwright. It is an apps/studio devDependency (#767), so\n'
    + '  the usual cause is deps or browsers not installed yet:\n'
    + '    npm ci  &&  npx playwright install chromium\n'
    + '  or point at another copy   PLAYWRIGHT_MODULE=$(npm root -g)/playwright/index.js \\\n'
    + '                               npm run -w @prism3/studio audit:modes\n');
  process.exit(2);
}

const ROOT = new URL('.', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.map': 'application/json' };
// Read BEFORE writing the header: a missing file threw with the 200 already sent, so the catch's
// `writeHead(404)` raised ERR_HTTP_HEADERS_SENT — outside the try, unhandled, killing the audit. A
// harness that exits instead of reporting looks like a clean run (#565).
const server = createServer(async (req, res) => {
  try {
    const p = join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
// An EPHEMERAL port (`listen(0)`), the pattern `test-smoke.mjs` and both plugin suites use (#1898). This
// held 8899 until it gated in `verify.ts` (#1897); lanes run `npm run verify` concurrently, and a second
// audit on a fixed port fails as `EADDRINUSE`, which reads like a failure of the change under test.
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

// Positional arg is the brand; flags are filtered out so `audit:modes -- --check-badges` does not
// read the flag as a brand name and hang waiting for a button that will never exist.
const BRAND = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'harbor';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await hooks.watch(page);
await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' });
await hooks.click(page.locator('[data-p3="start-example"]').filter({ hasText: BRAND }).first());
await hooks.need(page, '[data-p3="frame"]');   // the app view (Color › Palettes draws the two panes from S2)
await page.waitForTimeout(1000);

// NOTHING TO AUDIT SINCE UI REDESIGN S8.2, RECORDED BY NAME. This audit walks the legacy pages through the Pages menu
// and diffs each one's mode strip. S8.2 moved the web's last legacy page (Size & radius, the Button options) to the
// Components tab, whose levers edit the mode the preview shows (Q22), and the web's Pages menu went with it (owner
// decision G19 A): there is no legacy page, no mode strip and no mode-scope badge left on the web to measure. #1912's
// last KNOWN_BADGE_GAPS row (Buttons) left with the page. S8.3, which merges right after S8.2, deletes this audit and its
// CI step (#1897) in the five places the plan names. Until then the run says so and exits clean ONLY when the top bar
// rendered and offers no Pages menu (read by its accessible name, without a hook): a Pages menu that comes back runs the
// audit below as before, and a bar that never rendered fails. The hook guard is not reported on this path, because
// every hook below names a legacy surface this run, by its own check, never reaches.
{
  const top = await page.evaluate(() => ({ bar: !!document.querySelector('[data-p3="top-bar"]'),
    pages: [...document.querySelectorAll('button')].filter((b) => b.getAttribute('aria-label') === 'Pages').length }));
  if (!top.bar) {
    console.log('   ✗ the top bar never rendered, so whether a Pages menu is offered was not measured');
    await browser.close(); server.close(); process.exit(1);
  }
  if (top.pages === 0) {
    console.log(`\nMode-sensitivity audit — brand '${BRAND}': NOTHING TO AUDIT. The web offers no Pages menu and so no legacy page `
      + 'with a mode strip (UI redesign S8.2); this audit and its CI step are deleted in S8.3 (#1897), and #1912\'s Buttons row '
      + 'left with the page.');
    await browser.close(); server.close(); process.exit(0);
  }
}

/** A mode tab by its visible mode name, exactly — the text a designer clicks. */
const modeTab = (name) => page.locator('[data-p3="mode-tab"]')
  .filter({ has: page.locator('[data-p3="mode-tab-name"]', { hasText: new RegExp(`^${name}$`) }) }).first();
/** The Pages menu (UI redesign S1.2): the old rail, moved into the top bar with its hooks. */
const openPages = async () => {
  if (await page.locator('[data-p3="pages-menu-list"]').count() === 0) await hooks.click(page.locator('[data-p3="pages-menu"]'));
  await hooks.need(page, '[data-p3="pages-menu-list"]');
};
/** A rail destination by its hook, through the Pages menu, which is how every page is reached below. */
const goStage = async (key) => {
  await openPages();
  await hooks.click(page.locator(`[data-p3="${key}"]`));
  await page.waitForTimeout(500);
};

const snap = () => page.evaluate(() => {
  const ws = document.querySelector('[data-p3="workspace"]') ?? document.body;
  const secs = [...ws.querySelectorAll('[data-p3="section-head"]')].map((h) => h.parentElement);
  const nodes = secs.length ? secs : [...ws.children];
  const sig = (s) => [...s.querySelectorAll('input,select')].map((e) => {
    const label = e.closest('.knob')?.textContent?.trim().slice(0, 60) ?? '';
    const ctrl = e.tagName === 'SELECT'
      ? `SEL[${[...e.options].map((o) => o.text).join('/')}]=${e.value}`
      : `IN:${e.type}=${e.value}`;
    return `${label}>>${ctrl}`;
  }).join(' | ');
  return nodes.map((s, i) => {
    const badge = s.querySelector('[data-p3="mode-scope-badge"]');
    return {
      name: (s.querySelector('[data-p3="section-title"]')?.textContent ?? s.querySelector('h2,h3')?.textContent ?? `section ${i + 1}`).trim(),
      ctrl: sig(s),
      // The signature's label half, counted: a control whose `.knob` is gone reads an empty label, and
      // nothing else would say so (see the header). Totalled per run into a floor below.
      labelled: [...s.querySelectorAll('input,select')].filter((e) => (e.closest('.knob')?.textContent ?? '').trim() !== '').length,
      html: s.innerHTML,
      // #439 — what the section CLAIMS about itself, so --check-badges can compare claim to
      // measurement. THREE states since #437: the `.on` class no longer separates them, because
      // "Editing: All modes" is also `on` (it is editable, just not per-mode). Read the key text.
      badge: badge
        ? (/^Non-editable/i.test(badge.textContent ?? '') ? 'none'
          : /All modes/i.test(badge.textContent ?? '') ? 'all-modes' : 'per-mode')
        : null,
      // The axis the badge's third state turns on. Value editors only: buttons excluded (they play a
      // motion preview), and `[data-view-only]` excluded (#574 — a playback speed is not a token).
      //
      // THIS AGREES WITH main.ts BY CONSTRUCTION, so on its own it cannot catch the bug it exists to
      // catch. It reproduced #574 exactly: the audit reported 28/28 correct with the defect on screen,
      // because both sides asked the same question. `--check-badges` therefore also checks editability
      // against an independent signal — see `probeSection` — rather than only restating this selector.
      // Same lesson as #575's (10h): a gate built from its subject's own expression is blind.
      hasControls: s.querySelector('input:not([disabled]):not([data-view-only]), select:not([disabled]):not([data-view-only]), textarea:not([disabled]):not([data-view-only])') !== null,
      // Every control the badge SKIPS, so the check can prove each one really is view-only.
      skipped: [...s.querySelectorAll('[data-view-only]:not([disabled])')]
        .map((e, i) => ({ i, tag: `${e.tagName.toLowerCase()}.${e.className || '-'}` })),
      // #562 — is the badge INSIDE the section's own padding box? Four Interactive sections shipped with
      // it flush against the border because they built no `.psec-head`, so `attachModeBadges` fell back
      // to `position:absolute;top:0;right:0`. Every gate the badges had checked whether a badge exists
      // and what it says; none checked where it is, and the eye is what eventually caught it. Measured
      // against the resolved padding rather than a literal 20/24 so a padding change does not need this
      // number changed too.
      inset: badge ? (() => {
        const b = badge.getBoundingClientRect(), r = s.getBoundingClientRect(), cs = getComputedStyle(s);
        const pt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
        const pr = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
        // Rounded to whole px: sub-pixel layout noise is not a finding, a badge outside the padding is.
        return { top: Math.round(b.top - r.top - pt), right: Math.round(r.right - b.right - pr) };
      })() : null,
    };
  });
});

// Every rail destination, by hook key and by the label a designer reads, read off the open Pages menu.
await openPages();
const stages = await page.locator('[data-p3^="rail-page-"]').evaluateAll((ns) => ns.map((n) => ({
  key: n.getAttribute('data-p3'),
  label: n.querySelector('[data-p3="rail-item-label"]')?.textContent?.trim() ?? n.getAttribute('data-p3'),
})));
await hooks.click(page.locator('[data-p3="pages-menu"]'));
ok(stages.length > 0, `the rail offers ${stages.length} destination(s) to audit`);
// Color › Palettes left the Pages menu in UI redesign S2 (it draws the two panes now, reached by its tab, and
// has no mode strip to audit: the mode control is in its preview header). The first Color page still legacy
// is the one the menu must offer, and Palettes must be gone from it, with the menu's own rows as the proof.
// Surfaces & fills followed in S4a and Interactive in S5.2, so the menu offers no Color page at all; Type followed
// in S6.2, so the first legacy page it offers is Elevation. Shape followed in S7; Size & radius stays in the menu,
// holding only the Button options until S8 (owner decisions D4 B, D5 B).
ok(stages.some((x) => x.key === hooks.role('[data-p3="rail-page-size-radius"]')), 'the Pages menu offers Size & radius, the Button options\' page until S8');
hooks.absent(ok, { seen: stages.length > 0, state: 'the Pages menu\'s rows' }, stages.every((x) => x.key !== 'rail-page-palettes'), 'the Pages menu no longer offers Palettes, which moved to the two panes (S2)');
hooks.absent(ok, { seen: stages.length > 0, state: 'the Pages menu\'s rows' }, stages.every((x) => x.key !== 'rail-page-surfaces'), 'the Pages menu no longer offers Surfaces & fills, which moved to the two panes (S4a)');
hooks.absent(ok, { seen: stages.length > 0, state: 'the Pages menu\'s rows' }, stages.every((x) => x.key !== 'rail-page-interactive'), 'the Pages menu no longer offers Interactive, which moved to the two panes (S5.2)');
hooks.absent(ok, { seen: stages.length > 0, state: 'the Pages menu\'s rows' }, stages.every((x) => x.key !== 'rail-page-typography'), 'the Pages menu no longer offers Typography, which moved to the two panes (S6.2)');
hooks.absent(ok, { seen: stages.length > 0, state: 'the Pages menu\'s rows' }, stages.every((x) => x.key !== 'rail-page-layout'), 'the Pages menu no longer offers Layout, which moved to the two panes (S10)');
for (const [key, name] of [['rail-page-elevation', 'Elevation'], ['rail-page-motion', 'Motion']])
  hooks.absent(ok, { seen: stages.length > 0, state: 'the Pages menu\'s rows' }, stages.every((x) => x.key !== key), `the Pages menu no longer offers ${name}, which moved to Depth & motion in the two panes (S9.2)`);
const tally = { EDITS: 0, displays: 0, inert: 0 };
const claims = [];
const noBar = [];
let controlsSeen = 0, controlsLabelled = 0;
console.log(`\nMode-sensitivity audit — brand '${BRAND}', Light vs Dark, 1440px\n${'='.repeat(64)}`);
for (const { key, label: stage } of stages) {
  await goStage(key);
  if ((await page.locator('[data-p3="mode-tab"]').count()) === 0) { noBar.push(stage); continue; }
  await hooks.click(modeTab('Light'));
  await page.waitForTimeout(500);
  const light = await snap();
  // The per-name guard cannot see a hook dropped at ONE of its render sites (#1831), and a section whose
  // head lost its hook would simply vanish from this table. Every section mints its head and its title
  // together, so the two counts must agree; a disagreement names the page instead of shrinking it.
  const found = await page.evaluate(() => {
    const ws = document.querySelector('[data-p3="workspace"]') ?? document.body;
    return { heads: ws.querySelectorAll('[data-p3="section-head"]').length, titles: ws.querySelectorAll('[data-p3="section-title"]').length };
  });
  ok(found.heads === found.titles, `${stage}: every section title sits in a section the audit can find (${found.heads} section head(s), ${found.titles} title(s))`);
  await hooks.click(modeTab('Dark'));
  await page.waitForTimeout(650);
  const dark = await snap();
  for (const s of light) { controlsSeen += s.ctrl ? s.ctrl.split(' | ').length : 0; controlsLabelled += s.labelled; }
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
                  // Two axes, because the badge now states two different things (#437): does this
                  // section vary per mode (measured here), and can anything in it be edited at all.
                  // A section that does not vary per mode but HAS a control edits one value every
                  // mode uses -- that is 'all-modes', not the same offer as an untouchable specimen.
                  expected: v.trim() === 'EDITS' ? 'per-mode' : s.hasControls ? 'all-modes' : 'none',
                  badge: s.badge, inset: s.inset, stage: key, skipped: s.skipped });
    console.log(`   ${v}  ${s.name}${s.badge ? '' : '   (no badge)'}`);
  }

  // #545 — DERIVED modes (HC light / HC dark / Wireframe) are a THIRD context the Light-vs-Dark diff
  // above never visits, so a badge wrong only there was invisible to `--check-badges`: badge and
  // `expected` were both computed by the same `EDITS ? 'per-mode' : hasControls ? 'all-modes' : 'none'`
  // ordering main.ts's `modeScopeBadge` used before its fix, so a per-mode section whose controls
  // happened to render in a derived mode would agree with the audit on "Editing · All modes" and stay
  // green — the audit inheriting main.ts's own blind spot (the #464 lesson: a self-check built from
  // its subject's mental model cannot catch its subject's bug). Fixed the same way as main.ts: a
  // section that measured EDITS above (this run's stand-in for `scope === 'per-mode'`, since
  // SECTION_MODE_SCOPE is hand-maintained FROM this exact measurement) is forced to `expected: 'none'`
  // here, checked BEFORE `hasControls`, regardless of whether a control happens to render in this
  // derived mode. Still unreachable today — the page scaffolds hide per-mode sections' controls
  // entirely on a derived mode (`renderScreen` / `controlSplitPage`) — so every claim pushed here
  // currently expects 'none'; kept as a guard against that changing silently, the same as the branch
  // it mirrors in main.ts.
  for (const btn of await page.locator('[data-p3="mode-tab"].derived').all()) {
    const dlabel = (await btn.locator('[data-p3="mode-tab-name"]').textContent())?.trim() ?? 'derived';
    await hooks.click(btn);
    await page.waitForTimeout(500);
    const derived = await snap();
    for (const [i, s] of light.entries()) {
      const d = dark[i];
      const editsPerMode = d ? s.ctrl !== d.ctrl : false;
      // Matched by NAME, not index: a derived mode can render fewer sections than Light/Dark (the
      // generated-note scaffolds drop the editing ones entirely), so index alignment would silently
      // compare the wrong pair once counts diverge.
      const match = derived.find((x) => x.name === s.name);
      if (!match) continue;   // this section does not render at all in this derived mode — nothing to check
      claims.push({ page: `${stage.slice(0, 18)} · ${dlabel}`, name: s.name,
                    verdict: editsPerMode ? 'EDITS(derived)' : 'n/a',
                    expected: editsPerMode ? 'none' : (match.hasControls ? 'all-modes' : 'none'),
                    badge: match.badge, inset: match.inset, stage: key, skipped: match.skipped });
    }
  }
  // Leave every stage on a non-derived mode. `probeSection` below only re-clicks the rail tab, not
  // a mode button, so if a derived-mode click above were the last thing done to the page, EVERY later
  // probe (including ones for unrelated, already-measured Light/Dark claims) would find its section
  // replaced by the generated-mode note and report a false `section-gone` — the derived-mode pass
  // breaking the very claims it was added to protect.
  if ((await page.locator('[data-p3="mode-tab"].derived').count()) > 0) {
    await hooks.click(modeTab('Light'));
    await page.waitForTimeout(500);
  }
}
// The floor on the signature's label half (see the header): case 2 of #432 is invisible without labels.
ok(controlsLabelled > 0, `the signature read a control label for ${controlsLabelled} of ${controlsSeen} control(s) on the bar pages — `
  + 'none means `.knob` no longer wraps a control, and every label-only per-mode difference would read as inert');
console.log(`\nNo mode bar: ${noBar.join(' · ')}`);
console.log(`Totals across bar pages: ${JSON.stringify(tally)}\n`);

// --check-badges: the map in main.ts (SECTION_MODE_SCOPE) is hand-maintained from THIS measurement,
// so it can drift the moment a section changes behaviour or gets renamed. Comparing the badge the
// page renders against the verdict measured in the same pass closes that: a renamed section loses
// its map entry and shows up as `missing`, and a section that stops (or starts) editing per mode
// shows up as a mismatch. Exits non-zero so it can gate.
/**
 * Ask a section what its controls actually DO, without asking the markup again.
 *
 * The independent signal: a control that edits a token mutates `brandState`, and a successful rebuild
 * persists that to `localStorage` under `prism3:brandInput`. So poke a control and watch the blob. A
 * token control moves it; a view-state control cannot. Measured over all six bar pages before this was
 * written: of the 98 controls the badge counts, 95 move the blob, one is single-option, one re-renders
 * before it can be read, and the only genuinely quiet one is Motion's playback select.
 *
 * BOTH DIRECTIONS, and the second one is the one that matters. Checking only that skipped controls are
 * quiet is worthless as a gate on this bug: delete the marker and there is nothing left to check, so
 * the audit passes. Measured — that exact mutation passed 28/28 with the defect back on screen, which
 * is how #574 shipped in the first place. The direction with teeth is the converse: a section badged
 * EDITABLE must contain a control that provably moves the brand. Motion without its marker fails that,
 * because its only counted control is a playback speed.
 *
 * `editProof` stops at the first control that moves the blob — that is exactly the claim `hasControls`
 * makes (a `querySelector`: does at least one exist), so proving one is proving the claim, and it also
 * steps past single-option controls and ones that re-render themselves away.
 *
 * A poke that silently fails to fire would leave the blob unchanged and read as proof of
 * view-only-ness, so `outcome` is reported separately from `moved`: 'unproven' is never 'proven'.
 */
const probeSection = async (c) => {
  await goStage(c.stage);
  return page.evaluate(({ secName, wantEditProof }) => {
    const KEY = 'prism3:brandInput';
    const COUNTED = 'input:not([disabled]):not([data-view-only]), select:not([disabled]):not([data-view-only]), textarea:not([disabled]):not([data-view-only])';
    const find = () => [...document.querySelectorAll('[data-p3="section-head"]')].map((h) => h.parentElement)
      .find((s) => (s.querySelector('[data-p3="section-title"]')?.textContent ?? '').trim() === secName);
    const tagOf = (e) => `${e.tagName.toLowerCase()}.${e.className || '-'}${e.type ? `[${e.type}]` : ''}`;
    // Nudge a control to a value it does not already hold, fire both events a handler might listen for,
    // and report whether changing anything was possible at all.
    const poke = (e) => {
      if (!e) return 'gone';
      // A RADIO is changed by checking a DIFFERENT member of its group, and the event belongs to that
      // member (#1887). The fallthrough below rewrote `value` and fired `change` on the radio already
      // checked, which re-picks the option it already holds: the chip groups (#1675) read the option from
      // a closure, not from `value`, so the brand stayed put and Density & size, Tempo and Icon colors
      // all read as "no control here moves the brand". The worse half was the other direction: on a
      // lever whose default is not written into the brand, re-picking it wrote the default explicitly,
      // the blob moved, and Control shape "proved" editable without its value changing at all.
      if (e.type === 'radio') {
        // An unnamed radio is a group of one: there is nothing else to check, so it cannot be exercised.
        const other = e.name ? [...e.getRootNode().querySelectorAll(`input[type="radio"][name="${CSS.escape(e.name)}"]`)]
          .find((r) => r !== e && !r.checked && !r.disabled) : undefined;
        if (!other) return 'single-option';
        other.checked = true;
        other.dispatchEvent(new Event('input', { bubbles: true }));
        other.dispatchEvent(new Event('change', { bubbles: true }));
        return 'poked';
      }
      if (e.tagName === 'SELECT') {
        const other = [...e.options].find((o) => o.value !== e.value);
        if (!other) return 'single-option';
        e.value = other.value;
      } else if (e.type === 'checkbox') e.checked = !e.checked;
      else if (e.type === 'range' || e.type === 'number') {
        const step = Number(e.step) || 1;
        const up = Number(e.value || 0) + step;
        e.value = String(up > Number(e.max || Infinity) ? Number(e.value) - step : up);
      } else e.value = `${e.value}~`;
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
      return 'poked';
    };
    // Skipped controls first: a poke re-renders the section, and the marked control is the one that
    // will not, so reading it before anything else avoids chasing a stale handle.
    const sec0 = find();
    if (!sec0) return { name: secName, err: 'section-gone' };
    const skips = [];
    const marked = [...sec0.querySelectorAll('[data-view-only]:not([disabled])')];
    for (let i = 0; i < marked.length; i++) {
      const s = find();
      const e = s ? [...s.querySelectorAll('[data-view-only]:not([disabled])')][i] : null;
      const tag = e ? tagOf(e) : '?';
      const before = localStorage.getItem(KEY);
      const outcome = poke(e);
      skips.push({ tag, outcome, moved: before !== localStorage.getItem(KEY) });
    }
    // Then the editability claim: poke counted controls until one moves the brand.
    let editProof = null;
    if (wantEditProof) {
      const n = (find()?.querySelectorAll(COUNTED) ?? []).length;
      const tried = [];
      for (let i = 0; i < n; i++) {
        const s = find();
        const e = s ? [...s.querySelectorAll(COUNTED)][i] : null;
        const tag = e ? tagOf(e) : '?';
        const before = localStorage.getItem(KEY);
        const outcome = poke(e);
        const moved = before !== localStorage.getItem(KEY);
        tried.push(`${tag}:${outcome}${moved ? '/moved' : ''}`);
        if (moved) { editProof = { tag, tried }; break; }
      }
      if (!editProof) editProof = { tag: null, tried, counted: n };
    }
    return { name: secName, skips, editProof };
  }, { secName: c.name, wantEditProof: c.expected !== 'none' });
};

/**
 * KNOWN BADGE GAPS — mismatches this audit measures CORRECTLY, where the studio is wrong and the fix
 * belongs to another lane (#1887). Each row names the issue that owns the fix, and is a literal written
 * from the measurement and the source, never computed from either. That keeps the row independent of
 * both sides of the comparison (docs/34): it is a third, hand-stated record of exactly what is wrong.
 *
 * A row EXCUSES only an exact match: same page, same section, same expected badge, same rendered badge.
 * Anything else is a new mismatch and counts. In particular, a section whose MEASUREMENT moves (Links
 * stops measuring per-mode, say) fails here even though it still renders no badge.
 *
 * A row FAILS WHEN STALE. If its mismatch does not occur in this run, because the map entry landed, the
 * section was renamed, or the measurement changed, the run fails naming the row and its issue. So an
 * exception cannot outlive its bug, and the fixing PR has to delete the row in the same change.
 */
const KNOWN_BADGE_GAPS = [
  // #1912: SECTION_MODE_SCOPE has no entry for Buttons, so `attachModeBadges` skips it: the Button options are
  // global levers (`csLeverStack(…, false)`). (Interactive's Links row left with the page in UI redesign S5.2, and
  // Control shape's with Shape in S7: the two panes say which mode a row edits, and there is no mode strip to badge.)
  { page: 'Size & radius', name: 'Buttons', expected: 'all-modes', renders: null, issue: 1912 },
];
const knownGapFor = (c) => KNOWN_BADGE_GAPS.find((k) =>
  k.page === c.page && k.name === c.name && k.expected === c.expected && k.renders === c.badge);

if (process.argv.includes('--check-badges')) {
  const mismatched = claims.filter((c) => c.badge !== c.expected);
  const bad = mismatched.filter((c) => !knownGapFor(c));
  const known = mismatched.filter((c) => knownGapFor(c));
  const stale = KNOWN_BADGE_GAPS.filter((k) => !known.some((c) => knownGapFor(c) === k));
  // A badge that sits outside its section's padding box is a placement bug, checked in the same pass
  // (#562). `>= 0` on both axes: the badge may sit lower than the padding edge (a taller title pushes
  // the flex row's cross-axis) but must never be above or right of it.
  const flush = claims.filter((c) => c.inset && (c.inset.top < 0 || c.inset.right < 0));
  console.log(`--check-badges — ${claims.length} badged/expected sections compared`);
  for (const c of bad) {
    console.log(`   ${c.page} / ${c.name}`);
    console.log(`      measured ${c.verdict} -> expected badge '${c.expected}', page renders ${c.badge === null ? 'NO BADGE (missing map entry?)' : `'${c.badge}'`}`);
  }
  for (const c of flush)
    console.log(`   ${c.page} / ${c.name}\n      badge escapes the section padding box: top ${c.inset.top}px, right ${c.inset.right}px (both must be >= 0)`);
  for (const c of known)
    console.log(`   known, #${knownGapFor(c).issue}: ${c.page} / ${c.name} expects '${c.expected}', renders ${c.badge === null ? 'no badge' : `'${c.badge}'`} (not counted)`);
  for (const k of stale) {
    const now = claims.find((c) => c.page === k.page && c.name === k.name);
    console.log(`   STALE known gap #${k.issue}: ${k.page} / ${k.name} (expects '${k.expected}', renders ${k.renders === null ? 'no badge' : `'${k.renders}'`}) did not occur — `
      + (now ? `the audit now expects '${now.expected}' and the page renders ${now.badge === null ? 'no badge' : `'${now.badge}'`}`
             : 'no section by that name was measured on that page')
      + '. Delete the row from KNOWN_BADGE_GAPS, or correct it if the gap changed shape');
  }

  // Third axis (#574): what the badge CLAIMS about editability, checked against what the controls do to
  // the brand — not against the same `querySelector` main.ts used, which is how the badge and the audit
  // agreed on a wrong answer for two months. Every section badged editable must contain a control that
  // provably moves the persisted brand, and every control the badge skips must provably not.
  // This runs LAST because a poke edits the brand: the per-mode measurement above must be taken on an
  // untouched theme, and it already has been by the time we get here.
  const unproven = [];
  let proved = 0, quiet = 0;
  for (const c of claims.filter((c) => c.expected !== 'none' || c.skipped?.length)) {
    const p = await probeSection(c);
    if (p.err) { unproven.push(`${c.page} / ${c.name}: ${p.err}`); continue; }
    for (const r of p.skips ?? []) {
      if (r.outcome !== 'poked')
        unproven.push(`${c.page} / ${c.name}: ${r.tag} is marked view-only but could not be exercised (${r.outcome}) — unproven, not proven`);
      else if (r.moved)
        unproven.push(`${c.page} / ${c.name}: ${r.tag} is marked view-only but MOVED the persisted brand — it edits a token`);
      else quiet++;
    }
    if (p.editProof && !p.editProof.tag)
      unproven.push(`${c.page} / ${c.name}: badged '${c.badge}' but NO control here moves the brand `
        + `(${p.editProof.counted} counted: ${p.editProof.tried.join(', ') || 'none'}) — a view control is not a token control`);
    else if (p.editProof) proved++;
  }
  for (const u of unproven) console.log(`   ${u}`);
  if (bad.length || flush.length || unproven.length || stale.length) {
    console.log(`\n${bad.length + flush.length + unproven.length + stale.length} mismatch(es).\n`);
    process.exitCode = 1;
  } else {
    console.log(`   ✓ every badge matches what the page actually does, except ${known.length} known gap(s) named above, all ${claims.filter((c) => c.inset).length} sit inside their section padding,`
      + `\n     ${proved} editable section(s) provably move the brand, and ${quiet} skipped control(s) provably do not\n`);
  }
}
await browser.close();
server.close();

// Last, so a badge mismatch above still reaches it: the audit's own instrument (#1829).
// The record above (header, "NOTHING TO READ"): only while no measured section renders a badge and every one is a
// known gap. Anything else leaves the hook guarded and the read running.
const badged = claims.filter((c) => c.badge !== null);
const unexcused = claims.filter((c) => c.badge === null && !knownGapFor(c));
if (claims.length > 0 && badged.length === 0 && unexcused.length === 0) {
  const at = hooks.used.indexOf('mode-scope-badge');
  if (at >= 0) hooks.used.splice(at, 1);
  console.log(`\nmode-scope badge read: NOTHING TO READ — no legacy section renders a mode-scope badge (${claims.map((c) => `${c.page} / ${c.name}`).join(', ')}: `
    + `each a known gap, ${[...new Set(claims.map((c) => `#${knownGapFor(c).issue}`))].join(', ')}). The badge read and its hook guard resume the moment one renders (S9.2, owner option B).`);
} else console.log(`\nmode-scope badge read: ${badged.length} badged section(s) read and checked; the hook stays guarded.`);
hooks.report(ok);
if (failures.length) {
  console.log(`\nThe audit's instrument failed ${failures.length} check(s), so its table above is not a measurement.`);
  process.exitCode = 1;
}
