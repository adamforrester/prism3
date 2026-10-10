/**
 * Plugin panel — EVERY TERMINATING CONDITION OF A COMPONENT BUILD REACHES A VISIBLE VERDICT (#870).
 *
 *   npm run -w @prism3/plugin build && npm run -w @prism3/plugin test:verdict
 *
 * ── what shipped, and why nothing here could see it ──────────────────────────────────────────────
 *
 * A component build completed — nodes in the file, correct, misses computed — and the panel stayed on
 * `⋯ Building…`, disabled, until the plugin was restarted. The verdict line is the ONLY surface that
 * reports a build's misses (`field-label`'s four DISCARDED refs, #866, were visible solely because that
 * summary rendered), so a build that ends in a permanent "Building…" silently converts a reporting build
 * into a silent one. That is the whole reason this is not a cosmetic ticket.
 *
 * The state machine was never wrong. `apps/plugin/src/main.ts` posts exactly one `component-result` on
 * every path it can leave by, and the UI's handler moves `componentState` off `'pending'` for all of
 * them. What was wrong was WHICH SURFACES GOT REPAINTED: the handler called `renderBar()` and
 * `syncApplyDetail()`, both CHROME, and the build's own control is page content on the Components rail
 * page. So the bar showed the verdict and the button beside the picker did not. Measured, not inferred:
 * navigating away and back recovered the button every time, which is exactly why the field report's only
 * known recovery was a restart — nobody tries the rail item while a build looks stuck.
 *
 * ── UI redesign S8.2: where the build lives now ───────────────────────────────────────────────────
 *
 * The build moved from the legacy Components rail page to the Components TAB's preview (owner decision G2 A): the set
 * is chosen in the set list and built with the Build button in the bar at the foot of the preview (C4 A), whose label
 * names the set ("Build Button") and which is busy, not disabled, while a build runs (#1956 decision 4). The page has
 * no verdict pill or fraction of its own any more: the verdict and the live fraction are the Activity drawer's build
 * row, and the page's per-set line says how this session's build of that set went (G9 and C1: "Built just now", "Built
 * with problems" for a build that ran to the end with issues, "Build failed" for one that stopped, "Not built in this
 * session"), told apart by the posted verdict's `ok` and `completed`. Every arm below reads those two places. The verdict LITERALS are unchanged: they are the copy under test.
 * Set up file's one control is the Figma menu's item now (G8 A), and its arm drives that.
 *
 * ── why this suite is a BROWSER suite, and why it lives here rather than in apps/studio ──────────
 *
 * `apps/studio/src/main.ts` touches `document` at import time, so it has no unit granularity at all
 * (see `apps/studio/test-smoke.mjs` for the full argument). And the Components page is `figmaOnly`: it is
 * absent from the web rail, so the studio's own smoke suite — which drives `apps/studio/dist/main.js`
 * with `PRISM3_HOST='web'` — cannot reach this control at any effort. The page exists only in the panel
 * bundle. So the subject is `apps/plugin/dist/ui.html`, and the suite belongs to the plugin.
 *
 * Loaded TOP-LEVEL, where `parent === window`. The UI's own outgoing `parent.postMessage` lands on its
 * own listener, and this harness injects the main thread's replies with `window.postMessage` — so the
 * bridge is exercised through `write-adapter.ts`'s real `figmaCommit`, including its validation and its
 * headline fallbacks, rather than by poking module state. What is NOT exercised is the main thread; see
 * THE PART THIS CANNOT SEE below, which is the honest limit of this file.
 *
 * ── independence: what is compared against what (docs/34) ───────────────────────────────────────
 *
 * EXPECTED is authored HERE, per condition, as the label and enabled-state a designer would read —
 * `'⊞ Build set'`, enabled, with a verdict pill present. ACTUAL is read out of the rendered DOM of the
 * built bundle. Neither side calls `syncComponentRow`, reads `componentState`, or evaluates any of the
 * subject's own expressions: the assertion is what is on screen, in the words on screen. A gate that
 * asked the UI whether it considered itself done would agree with itself in exactly the shipped case —
 * the state machine was already correct, so `componentState !== 'pending'` was TRUE the whole time the
 * button said "Building…". That check would have passed on the defect. This is `docs/34` shape 16 (an
 * independent gate measuring the wrong quantity), and the remedy shape 16 prescribes is the one taken
 * here: state the quantity a human would check, in the units they would check it in.
 *
 * THE CONDITION LIST IS AUTHORED, AND ITS LENGTH IS ASSERTED. #870 requires every terminating condition
 * to be covered — "clean, with misses, errored, and already-built … since the observed case is one of at
 * least four" — so a suite that silently dropped one would report a pass over a narrowed promise. The
 * conditions below are derived by reading every `postToUi({type:'component-result'…})` site in
 * `apps/plugin/src/main.ts` (four sites: the unknown-def early return, #869's not-standalone refusal, the
 * happy path, the catch) and every distinct SHAPE the happy path can produce (`ok` true/false by the
 * `misses === skipped` rule, plus the idempotent re-run where every member is skipped). Counted here so
 * adding one means editing that number on purpose.
 *
 * **AND IT HAS WORKED TWICE, WHICH IS WHY THE NUMBER IS WORTH THE FRICTION.** The list shipped at five and
 * is at seven. #869 added a real early return to `buildComponents` — a def whose projection cannot render
 * standalone is refused rather than half-built. #913 split the catch arm in two: a throw that left nodes in
 * the designer's file now posts a different verdict from one that left it untouched, because the marked
 * leftovers are the fact a designer has to be told. Both times the asserted count is what forced this file
 * open rather than letting the new terminal path ship uncovered. That is the failure this suite exists for,
 * arriving from a *different* PR each time: a terminal message with no verdict on screen leaves the panel
 * stuck on "Building…", so a fix that adds a terminal path silently reintroduces #870 wherever nothing
 * looks. Note what the count does NOT catch — a new terminal path whose message is shaped like an existing
 * one needs a row here for its WORDS, and only a human reading `buildComponents` will notice that.
 *
 * ── the second defect this suite exists to hold, which the ticket did not name ───────────────────
 *
 * Reproducing #870 surfaced a distinct bug in the same seam: `componentState === 'pending'` renders a
 * live pill TWICE — once into the chrome bar, once into the page's row — and both are on screen while a
 * designer watches a build from the page. The progress handler wrote to ONE cached node
 * (`componentPendingEl`), which `renderApplyStatus` reassigned on every call, so the last pill rendered
 * won and the other kept the pre-#684 placeholder for the entire build. Measured before the fix: with
 * the page open, the page's row counted through all 54 boundaries while the bar sat frozen at "Building
 * the Button set…"; navigated away, the bar counted correctly. That asymmetry is why it read as a bar
 * bug. Both pills are asserted to advance together below.
 *
 * ── THE PART THIS CANNOT SEE ────────────────────────────────────────────────────────────────────
 *
 * No Figma and no main thread. This suite proves the panel renders a verdict for every terminal MESSAGE;
 * it cannot prove the main thread sends one. #870 named two candidates and this closes the second. The
 * first — "the completion message never posts" — was ruled out by reading all three post sites, not by
 * measurement here, and one latency hazard found while doing so is filed separately rather than fixed:
 * `buildComponents` awaits `measureSettle()` BEFORE posting the result, and that probe returns only when
 * the main thread goes quiet for 3 consecutive ticks or 400 samples elapse. Measured standalone: 3 ticks
 * / 4ms on an idle thread, but 400 ticks / 8.4s with 20ms of work per tick. On a host still reconciling
 * thousands of nodes the verdict is withheld for the whole probe, which is a real "Building…" delay with
 * a different cause and a different fix, and is NOT what this suite asserts.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { hookGuard } from '../studio/test-hooks.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const UI = join(ROOT, 'dist/ui.html');
// Every element below is LOCATED by its `data-p3` hook (F1), never by a class name or a page title, so a
// restyle cannot move what this suite reads. The verdict LITERALS stay: they are the copy under test.
// The guard fails any hook this file names that never rendered, by name (`../studio/test-hooks.mjs`).
const hooks = hookGuard(import.meta.url);

/** A small file for the Build style guides page, typed here: one table of each kind, so its tree and every option
 *  group draw. */
const SG_CATALOG = {
  setUp: true,
  collections: [
    { id: 'C:core', name: 'core', modes: ['Default'], items: [{ name: 'pds3/core/palette/primary/100', table: 0, value: '#E0E0FF' }, { name: 'pds3/core/dimension/4', table: 1, value: '4px' }, { name: 'pds3/core/font/size/16', table: 2, value: '16' }] },
    { id: 'text-styles', name: 'Text styles', modes: [], textStyles: true, items: [{ name: 'body/md', table: 3, value: '' }] },
  ],
  tables: [
    { key: 'color|C:core|pds3/core/palette/primary', title: 'Primary', kind: 'color', page: 'Primitive tokens', rows: 1 },
    { key: 'dimension|C:core|pds3/core/dimension', title: 'Dimension', kind: 'dimension', page: 'Primitive tokens', rows: 1 },
    { key: 'fontSize|C:core|pds3/core/font/size', title: 'Font size', kind: 'font', page: 'Primitive tokens', rows: 1 },
    { key: 'typography|text-styles|body', title: 'Text styles', kind: 'text', page: 'Semantic tokens', rows: 1 },
  ],
  notes: [],
};
/** The plugin's one page outside the tabs, Build style guides (S11.2), opened from the Figma menu as a designer opens it,
 *  with `SG_CATALOG` posted, waiting on its Collection select: a real condition, not a sleep. It replaced the old Style
 *  guide page the Pages menu opened (`gotoRail`, which went with both in H12, #2289). */
const openStyleGuides = async (page) => {
  await hooks.click(page.locator('[data-p3="figma-open"]'));
  await hooks.click(page.locator('[data-p3="figma-option-style-guide"]'));
  await hooks.need(page, '[data-p3="style-guides"]');
  await page.evaluate((c) => window.postMessage({ pluginMessage: { type: 'style-guide-catalog', catalog: c } }, '*'), SG_CATALOG);
  await hooks.need(page, '[data-p3="sg-collection"]');
};

// ---- the assertion harness -------------------------------------------------------------------
// Same `ok(...)` shape as the studio suites, so a failure line means the same thing in all of them.
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

if (!existsSync(UI)) {
  console.error(`✗ ${UI} is missing — run \`npm run -w @prism3/plugin build\` first.`);
  console.error('  This suite drives the BUILT panel, so an absent bundle is a setup error rather than a pass.');
  process.exit(1);
}

// ---- the static server -----------------------------------------------------------------------
// Ephemeral port (`listen(0)`), the call `test-smoke.mjs` records: a fixed number collides as
// EADDRINUSE, which reads exactly like a test failure and gets debugged as one.
const server = createServer(async (_req, res) => {
  try {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(await readFile(UI));
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();

/** Post a main-thread → UI message in the wire shape `bridge-main.ts` puts on the bus. */
const post = (page, msg) => page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), msg);

/** The Build button's labels and each set's result line, as approved (S8.2; owner decisions G2, G9 and C1, copy approved
 *  2026-10-05). Typed here, never read from the source: they are the words a designer reads. */
const BUILD_LABEL = 'Build Button';
const BUSY_LABEL = 'Building…';
const LAST = { ok: 'Built just now', bad: 'Built with problems', failed: 'Build failed', none: 'Not built in this session' };

/** Everything a designer can read about a build, from the rendered DOM only.
 *
 *  Both places are read, separately and by their own selectors, because the whole of #870 was one of them being right
 *  while the other was stale. Since UI redesign S8.2 they are the Components tab (its Build button, the chosen set, and
 *  each set's result line in this session) and the build's row in the Activity drawer, which carries the verdict and
 *  the live fraction; the page draws no fraction and no verdict pill of its own. */
const readSurfaces = (page, set = 'button') => page.evaluate((id) => {
  const btn = document.querySelector('[data-p3="components-build"]');
  const busy = btn ? btn.getAttribute('aria-busy') === 'true' : null;
  const label = btn ? (busy ? btn.querySelector('[data-p3="label-busy"]') : btn.querySelector('[data-p3="label-idle"]'))?.textContent.replace(/^…\s*/, '').trim() ?? null : null;
  const row = document.querySelector('[data-p3="activity-op"][data-op="components"]');
  const pill = row?.querySelector('[data-p3="op-verdict"]');
  const detail = row?.querySelector('[data-p3="op-summary"]') ?? null;
  const drawer = document.querySelector('[data-p3="activity-drawer"]');
  const preview = document.querySelector('[data-p3="components-style-guide"]');
  return {
    button: label,
    busy,
    picker: document.querySelector('[data-p3="components-def-option"]:checked')?.value ?? null,
    setLine: preview?.querySelector(`[data-p3="component-set"][data-set="${id}"] [data-p3="component-set-last"]`)?.textContent ?? null,
    setLines: preview ? preview.querySelectorAll(`[data-p3="component-set"][data-set="${id}"] [data-p3="component-set-last"]`).length : 0,
    pageFraction: /\d+ of \d+/.test(preview?.textContent ?? ''),
    barVerdict: row && row.dataset.state !== 'running' && pill && !pill.hidden ? [pill.textContent] : [],
    barPending: row ? [...row.querySelectorAll('[data-p3="op-progress"]')].map((n) => n.textContent) : [],
    // Shown, read the way the browser decides it: the row's body and the drawer's are hidden with `hidden`.
    detail: detail && detail.checkVisibility() ? detail.textContent : null,
    drawerOpen: drawer?.dataset.open === 'true',
  };
}, set);

/** A panel on the Components tab, one fresh context per scenario.
 *
 *  A shared context would carry the previous scenario's `componentState` — and its localStorage brand —
 *  into the next, so a verdict left over from scenario 1 could satisfy scenario 2's assertion. Every build message the
 *  panel posts is caught on this window (the UI's `parent.postMessage` lands here), so a scenario can say which set
 *  was asked for. */
const openPanel = async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await hooks.watch(page);
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  // A real condition, not a sleep: the frame is rendered once the app has booted onto a brand.
  await hooks.need(page, '[data-p3="frame"]');   // the app view (Color › Palettes draws the two panes from S2)
  await page.evaluate(() => {
    window.__builds = [];
    window.addEventListener('message', (e) => { const m = e.data && e.data.pluginMessage; if (m && m.type === 'build-components') window.__builds.push(m.def ?? null); });
  });
  await gotoComponents(page);
  return { page, errors };
};
/** The Components tab, by its tab hook: its levers, and the Build button its preview draws (S8.2). */
const gotoComponents = async (page) => {
  await hooks.click(page.locator('[data-p3="tab-components"]'));
  await hooks.need(page, '[data-p3="components-levers"]');
  await hooks.need(page, '[data-p3="components-build"]');
};
const builds = (page) => page.evaluate(() => window.__builds);
const idleAgain = (page) => page.waitForFunction(() => document.querySelector('[data-p3="components-build"]')?.getAttribute('aria-busy') !== 'true', null, { timeout: 5000 }).catch(() => {});

/**
 * Choose a set (when one is named), click Build, and let the first chunk boundary report, so the run is mid-flight in
 * the same way a real one is when the terminal message lands. Returns false if the control could not be clicked.
 *
 * A STUCK CONTROL IS AN ASSERTION HERE, NOT AN EXCEPTION, and that is worth the extra lines. This
 * suite's whole subject is a button that stays busy, so the defect it exists to catch is EXACTLY
 * what makes `locator.click()` throw — and an uncaught throw takes the process down mid-run: measured
 * under the mutation that reverts half the fix, the table printed 27 correct named failures and then
 * died on a `TimeoutError` stack, losing the remaining cases and the summary count. A gate that
 * crashes on the bug it is for reports less than one that fails on it. So the click is bounded, and a
 * refusal becomes a named failure that the run survives.
 */
const startBuild = async (page, def, label = 'build') => {
  if (def) await hooks.click(page.locator(`[data-p3="components-def-option"][value="${def}"]`));
  const clicked = await hooks.click(page.locator('[data-p3="components-build"]').first(), { timeout: 4000 })
    .then(() => true, () => false);
  if (!clicked) {
    const state = await readSurfaces(page, def ?? 'button');
    ok(false, `${label}: the Build control could not be clicked — it reads "${state.button}", busy ${state.busy}`);
    return false;
  }
  await page.waitForFunction(() => document.querySelector('[data-p3="components-build"]')?.getAttribute('aria-busy') === 'true', null, { timeout: 4000 }).catch(() => {});
  await post(page, { type: 'component-progress', phase: 'build', done: 24, total: 648, chunkMs: 40 });
  await page.waitForFunction(() => /24 of 648/.test(document.body.textContent ?? ''), null, { timeout: 4000 }).catch(() => {});
  return true;
};

// ── THE TERMINATING CONDITIONS ────────────────────────────────────────────────────────────────
//
// Every way `buildComponents` can leave, in the message shapes it actually posts. `ok` follows the
// executor's own rule — `r.set !== null && r.misses.length === r.skipped` — which is why the idempotent
// re-run is `ok: true` despite reporting a miss per skipped member, and why that case has to be here:
// a miss-count test would call the correct idempotent build a failure.
const CONDITIONS = [
  {
    name: 'clean build',
    why: 'the case the field report observed',
    msg: { type: 'component-result', ok: true, completed: true, headline: '✓ built 648', summary: "set 'Button': 648 variants (+648 built, 0 already present), 0 refs missing" },
    line: LAST.ok,
    verdictOpens: false,
  },
  {
    name: 'build with misses',
    why: "#866's four DISCARDED refs — the reason this surface matters at all",
    msg: { type: 'component-result', ok: false, completed: true, headline: '⚠ 648, 4 missed', summary: "set 'Button': 648 variants, ⚠ 4 misses (focus/ring/offset; icon/size; …)" },
    line: LAST.bad,
    verdictOpens: true,
  },
  {
    // ONE OF TWO THROW CONDITIONS SINCE #913, and this is the one that wrote NOTHING: the throw lands
    // before the first `create*` call, so the file is untouched and the verdict has no count to carry.
    // Its partner is 'errored build, partial write' below — same catch arm, different message, because
    // whether anything reached the file is the fact a designer needs and the two are not one case.
    // (The `why` said "and #869's live example" until #913; #869 has had its own entry since, so the
    // sentence was pointing at a case this row no longer stands for.)
    name: 'errored build',
    why: 'the catch arm, with the file untouched — planSetLayout throws before anything is created',
    msg: { type: 'component-result', ok: false, completed: false, headline: '✗ apply failed', summary: 'component build failed: planSetLayout: no coherent set' },
    line: LAST.failed,
    verdictOpens: true,
  },
  {
    name: 'already-built (idempotent re-run)',
    why: 'every member skipped by name, so misses === skipped and the build is a SUCCESS',
    msg: { type: 'component-result', ok: true, completed: true, headline: '✓ 0 new, 648 present', summary: "set 'Button': 648 variants (+0 built, 648 already present)" },
    line: LAST.ok,
    verdictOpens: false,
  },
  {
    name: 'unknown def',
    why: 'the early return — the UI and the plugin disagree about the catalogue',
    msg: { type: 'component-result', ok: false, completed: false, headline: '✗ unknown def', summary: "no component def with id 'nope' — this build knows button, icon-button" },
    line: LAST.failed,
    verdictOpens: true,
  },
  {
    // #869 ADDED A TERMINATING CONDITION, which is why it belongs in this list rather than only in
    // `lint-standalone-floor.ts`. That gate proves the DECLARATION is right; this proves the refusal
    // reaches a designer's eyes. The two are not substitutes: the refusal posts from a new early return
    // in `buildComponents`, and #870's whole finding was that a terminal message with no verdict on
    // screen leaves the panel stuck on "Building…" — so a fix that adds a terminal path without adding a
    // case here would reintroduce #870 on a path nothing covers.
    //
    // `ok: false` with the def's own `notStandalone` string as the summary, verbatim. Quoted here in the
    // shape the plugin posts, NOT imported from the def: this file asserts what the panel renders, and
    // reading the def would make it agree with the source of the string it is checking.
    name: 'not buildable standalone',
    why: "#869's refusal — a def whose projection cannot render alone, refused rather than half-built",
    msg: {
      type: 'component-result', ok: false, completed: false, headline: '✗ not buildable on its own',
      summary: 'focus-ring: a ring is sized by the control it surrounds, so it projects members that bind no width or height of their own — built alone it is a 100×100 default frame with the focus color at 1px. Build it as part of a host instead: Button nests it and supplies the geometry.',
    },
    line: LAST.failed,
    verdictOpens: true,
  },
  {
    // #913 ADDED A TERMINATING CONDITION — the same catch arm as 'errored build', with a DIFFERENT message,
    // and that is why it is a seventh row rather than a variant of the third. A throw that left nodes in
    // the file and a throw that left it untouched are two different things to tell a designer, and the
    // panel has to render both: the marking gathers the leftovers under a labelled frame, and this verdict
    // is the only thing that says so. Nobody looks for a frame they were not told about.
    //
    // Authored verbatim, in the shape `main.ts` posts, NOT built by calling `partialWriteHeadline` — this
    // file asserts what the panel renders, and generating the expected string from the module that
    // generates the real one would make it agree with itself (docs/34 shape 1). The strings below were
    // copied from a measured run of the executor against a host whose typeface is missing.
    name: 'errored build, partial write',
    why: "#913's marked leftovers — the catch arm with nodes already in the file, which needs its own words",
    msg: {
      type: 'component-result', ok: false, completed: false, headline: '✗ failed, 2 parked',
      summary: "component build failed: in setTextStyleIdAsync: unloaded font \"Clash Display Semi Bold\" — 2 nodes had already reached the file; they are parked in the frame '⚠ Prism3 partial build — button (2 nodes; undo to remove)' on this page. One undo removes the whole build.",
    },
    line: LAST.failed,
    verdictOpens: true,
  },
];

// #870 requires the list to be STATED rather than the observed case fixed. Asserted so that dropping one
// is an edit to this number instead of a quiet narrowing of what a green run means.
//
// SEVEN SINCE #913, six since #869, five before that. The number moving each time is the assertion working
// as designed, and it has now done its job TWICE from two different PRs: #869 added a real early return to
// `buildComponents`, and #913 split the catch arm into "wrote nothing" and "left nodes in the file". Both
// times the count is what forced this file open rather than letting the new terminal path ship uncovered.
ok(CONDITIONS.length === 7, `the condition list covers all 7 terminating conditions (found ${CONDITIONS.length})`);

console.log(`\nComponent-build verdict suite (#870) — ${CONDITIONS.length} terminating conditions\n`);

// ── the control a designer meets before any build ─────────────────────────────────────────────
//
// The zeroth terminating condition is "nothing has terminated yet", and it needs its own assertion: a control that
// mounted blank, or busy, or naming no set, would sail past every check below, which read the button only after a
// build. Since S8.2 the button names the chosen set (Button, by default), and each set says it was not built in this
// session (G9). The proving build after it shows this probe CAN see a busy label and a result, so the fresh reading is
// a measurement.
{
  const { page, errors } = await openPanel();
  const fresh = await readSurfaces(page);
  ok(fresh.button === BUILD_LABEL && fresh.busy === false, `a freshly opened panel offers "${BUILD_LABEL}", not busy — read "${fresh.button}", busy ${fresh.busy}`);
  ok(fresh.picker === 'button', `a freshly opened panel has Button chosen — read ${fresh.picker}`);
  ok(fresh.setLine === LAST.none, `before any build, Button reads "${LAST.none}" — read ${JSON.stringify(fresh.setLine)}`);
  ok(errors.length === 0, `opening the panel logs no console errors (${errors.slice(0, 2).join(' · ')})`);
  await startBuild(page, undefined, 'the fresh panel\'s proving build');
  const during = await readSurfaces(page);
  await post(page, { type: 'component-result', ok: true, completed: true, headline: '✓ built 648', summary: "set 'Button': 648 variants" });
  await idleAgain(page);
  const after = await readSurfaces(page);
  ok(during.button === BUSY_LABEL && during.busy && after.setLine === LAST.ok,
    `the proving build: the probe sees the busy label, then the result — read "${during.button}" (busy ${during.busy}), then ${JSON.stringify(after.setLine)}`);
  ok(JSON.stringify(await builds(page)) === '["button"]', `the build posts the chosen set — posted ${JSON.stringify(await builds(page))}`);
  await page.close();
}

for (const c of CONDITIONS) {
  const { page, errors } = await openPanel();
  await startBuild(page, undefined, c.name);

  const during = await readSurfaces(page);
  ok(during.button === BUSY_LABEL, `${c.name}: the button reads "${BUSY_LABEL}" while in flight — read "${during.button}"`);
  ok(during.busy === true, `${c.name}: the button is busy while in flight (aria-busy), so a second click posts no concurrent build`);
  ok(during.barPending.some((t) => /24 of 648/.test(t ?? '')), `${c.name}: the Activity row shows the live fraction (was frozen at the placeholder)`);
  // RETIRED, HELD (S8.2): the page's own pending pill, the second surface #870's second defect froze, went with the
  // legacy row. The drawer row above is the one live fraction; the page shows none, rather than a stale one.
  hooks.absent(ok, { seen: during.barPending.some((t) => /24 of 648/.test(t ?? '')), state: 'the live fraction in the Activity row' },
    !during.pageFraction, `${c.name}: the Components page shows no fraction of its own beside the drawer's`);

  await post(page, c.msg);
  // Wait on the real condition — the button leaving the busy state — with a bounded timeout, so a
  // regression fails here as a timeout naming this condition rather than as a bare assertion diff.
  await idleAgain(page);
  const after = await readSurfaces(page);

  // THE ASSERTION #870 IS ABOUT. Stated as the label and the state a designer reads.
  ok(after.button === BUILD_LABEL, `${c.name}: the button returns to "${BUILD_LABEL}" — read "${after.button}"`);
  ok(after.busy === false, `${c.name}: the button is no longer busy, so another build can be started`);
  ok(after.picker === 'button', `${c.name}: the chosen set holds — read ${after.picker}`);

  // The verdict is VISIBLE: the drawer carries the host's own headline, and the set says how its build went (G9).
  // C1 A: three results, told apart by the build's own verdict (ok, and whether the build ran to the end), never by a
  // hand-set state. Each condition's line is typed beside its message above.
  ok(after.setLine === c.line, `${c.name}: the set's line on the page reads "${c.line}" — read ${JSON.stringify(after.setLine)}`);
  ok(after.barVerdict.some((t) => (t ?? '').includes(c.msg.headline)), `${c.name}: the Activity row carries the verdict "${c.msg.headline}"`);

  // No pending text survives the verdict. ABSENCE, judged against what the same probe saw during this build (#1831).
  const barLanded = after.barVerdict.some((t) => (t ?? '').includes(c.msg.headline));
  hooks.absent(ok, { seen: during.barPending.some((t) => /24 of 648/.test(t ?? '')) && barLanded, state: "the Activity row's progress during the build, then its verdict" },
    after.barPending.length === 0, `${c.name}: no stale fraction is left in the Activity row beside the verdict`);

  // A build a designer must act on keeps the drawer open on its row, its summary showing (#483's rule). A
  // clean one does not pin it: concept v6 collapses the whole drawer COLLAPSE_MS (4 s) after a success
  // (UI redesign S11). Asserted because the misses live in the detail, and this suite exists because of them.
  if (c.verdictOpens) {
    ok(after.detail !== null && after.detail.length > 0, `${c.name}: the detail row is open, so the misses are readable without a click`);
    ok((after.detail ?? '').includes(c.msg.summary.slice(0, 24)), `${c.name}: the open detail carries the host's own summary`);
  } else {
    // v6 holds the collapse while the pointer is over the drawer, and the click that started the build
    // can leave it there once the drawer opens under it: move it off, as a designer reading the page would.
    await page.mouse.move(1, 1);
    const closed = await page.waitForFunction(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'false', null, { timeout: 7000 }).then(() => true, () => false);
    hooks.absent(ok, { seen: after.drawerOpen && barLanded, state: 'the drawer open on the verdict when it landed' },
      closed, `${c.name}: a clean verdict does not pin the drawer open — it collapses by itself after 4 s`);
  }

  ok(errors.length === 0, `${c.name}: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── #913: the marked leftovers reach the designer in BOTH SIZE REGIMES ────────────────────────
//
// Measured, on the real executor: a brand whose typeface is not installed leaves TWO nodes in the file, and
// a refused `combineAsVariants` leaves 648. The first is the ordinary client failure and the second is the
// spectacular one, and the reporting must not be tuned for the spectacular one — two loose components are
// easy to miss and then re-create on the next run, which is the outcome this whole feature exists to
// prevent. So both are driven here rather than one being padded into `CONDITIONS`: what is asserted is that
// the two verdicts differ ONLY in their number.
//
// WHERE THE NUMBER IS (S8.2): the Activity row's verdict and its open detail. The page's per-set line says only how the
// build went ("Build failed" here, since the build stopped: G9, C1); the count it used to carry was the legacy row's pill, retired with the row.
//
// WHAT IS *NOT* ASSERTED HERE, AND WHY: whether the count is clipped out of the pill. #483's finding was a verdict
// clipped by `text-overflow: ellipsis` at 220px, but the pill grows with its text now (measured: `overflow: visible`,
// `max-width: none`, `white-space: nowrap`), so `scrollWidth <= clientWidth` is true for every headline and the check
// cannot fail. The ≤24-char budget is asserted where it can still move, in `test-apply-summary.ts`.
for (const [n, label] of [[2, 'the small regime — the ordinary client failure'], [648, 'the large regime']]) {
  const { page, errors } = await openPanel();
  await startBuild(page, undefined, label);
  const headline = `✗ failed, ${n} parked`;
  await post(page, {
    type: 'component-result', ok: false, completed: false, headline,
    summary: `component build failed: in combineAsVariants: The nodes must all have the same parent — ${n} nodes had already reached the file; they are parked in the frame '⚠ Prism3 partial build — button (${n} nodes; undo to remove)' on this page. One undo removes the whole build.`,
  });
  await idleAgain(page);
  const after = await readSurfaces(page);
  ok(after.barVerdict.some((t) => (t ?? '').includes(String(n))),
    `${label}: the Activity row states how many nodes were left, and it survives navigating away — read ${JSON.stringify(after.barVerdict)}`);
  ok(after.setLine === LAST.failed, `${label}: the set's line on the page says the build failed (it stopped before the set, C1) — read ${JSON.stringify(after.setLine)}`);
  ok(after.detail !== null && (after.detail ?? '').includes('parked in the frame'), `${label}: the open detail says where the leftovers are`);
  ok((after.detail ?? '').includes('⚠ Prism3 partial build'), `${label}: ...and names the frame, which is the only pointer the panel can give`);
  ok((after.detail ?? '').includes('One undo'), `${label}: ...and names the way out, which is one undo because the run is one undo entry`);
  ok((after.detail ?? '').includes('combineAsVariants'), `${label}: ...with the host's own error still leading, since the cause is what the designer needs`);
  ok(errors.length === 0, `${label}: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── the picker's selection survives its own verdict ───────────────────────────────────────────
//
// Not a nicety — it is why the legacy fix was a SYNC rather than a re-render (#870): a full render rebuilt the picker,
// whose default was Button, so reporting a verdict would silently reset the selection and the designer's next click
// would build the wrong set. Since S8.2 the chosen set lives in the Components preview's own state and the verdict
// touches only the button and the result lines in place; held here: the set chosen is the set posted, the result lands
// on THAT set's line, and the choice holds through the verdict.
{
  const { page } = await openPanel();
  const options = await page.locator('[data-p3="components-def-option"]').evaluateAll((ns) => ns.map((n) => n.value));
  const other = options.find((v) => v === 'tag') ?? options.find((v) => v !== 'button');
  ok(other !== undefined && options.length >= 20, `the set list offers sets other than Button, so this check can mean something (${options.length} offered)`);
  if (other) {
    await startBuild(page, other, `the non-default set '${other}'`);
    const posted = await builds(page);
    ok(JSON.stringify(posted) === JSON.stringify([other]), `the picker's selection is the set posted: '${other}' — posted ${JSON.stringify(posted)}`);
    await post(page, { type: 'component-result', ok: true, completed: true, headline: '✓ built', summary: `set '${other}'` });
    await idleAgain(page);
    const after = await readSurfaces(page, other);
    const button = await readSurfaces(page, 'button');
    ok(after.picker === other, `the picker still holds '${other}' after its verdict — read '${after.picker}' (a full re-render would reset it to 'button')`);
    ok(after.setLine === LAST.ok && button.setLine === LAST.none, `the verdict lands on '${other}', not on Button — ${other} ${JSON.stringify(after.setLine)}, button ${JSON.stringify(button.setLine)}`);
    ok(after.busy === false && /^Build /.test(after.button ?? '') && after.button !== BUILD_LABEL, `the non-default set's build also reaches a verdict, and the button still names it — read "${after.button}"`);
  }
  await page.close();
}

// ── a verdict that arrives while the designer is on another page ───────────────────────────────
//
// #483's division of labour, asserted rather than assumed: the build's STATUS lives in the chrome (the Activity
// drawer) so it survives navigation, while the control is page content. The Components page is released when the
// designer leaves it, so returning must show a control that is not busy and the set's result, not the "Building…"
// it left.
{
  const { page } = await openPanel();
  await startBuild(page, undefined, 'a verdict arriving off-page');
  // Color › Palettes, by its tab: it left the Pages menu in UI redesign S2 and draws the two panes.
  await hooks.click(page.locator('[data-p3="tab-color"]'));
  await hooks.click(page.locator('[data-p3="color-sub-palettes"]'));
  await hooks.need(page, '[data-p3="palettes-levers"]');
  await page.waitForFunction(() => !document.querySelector('[data-p3="components-build"]'));
  await post(page, { type: 'component-progress', phase: 'wire', done: 600, total: 648, chunkMs: 40 });
  await page.waitForFunction(() => /600 of 648/.test(document.body.textContent ?? ''), null, { timeout: 4000 }).catch(() => {});
  const away = await readSurfaces(page);
  ok(away.barPending.some((t) => /Wiring references… 600 of 648/.test(t ?? '')), `away from the page, the Activity row still reports progress — read ${JSON.stringify(away.barPending)}`);

  // #1679: the reference back-off's wait names itself (owner's wording), with no fraction, instead of the
  // pill freezing on the last wire reading for the whole pause. Through the real bridge validator, so a
  // `retry` phase the adapter drops fails here by name rather than leaving "600 of 648" on screen.
  await post(page, { type: 'component-progress', phase: 'retry', done: 2, total: 6, chunkMs: 0 });
  await page.waitForFunction(() => /Retrying property links…/.test(document.body.textContent ?? ''), null, { timeout: 4000 }).catch(() => {});
  const retrying = await readSurfaces(page);
  ok(retrying.barPending.some((t) => (t ?? '') === 'Retrying property links…'),
    `#1679 while the reference back-off waits, the pill reads exactly "Retrying property links…" — read ${JSON.stringify(retrying.barPending)}`);

  await post(page, { type: 'component-result', ok: true, completed: true, headline: '✓ built 648', summary: "set 'Button': 648 variants" });
  await page.waitForFunction(() => (document.querySelector('[data-p3="activity-op"][data-op="components"] [data-p3="op-verdict"]')?.textContent ?? '').includes('✓ built 648'), null, { timeout: 5000 }).catch(() => {});
  const landed = await readSurfaces(page);
  ok(landed.barVerdict.some((t) => (t ?? '').includes('✓ built 648')), 'a verdict arriving off-page lands in the Activity drawer, which is what survives navigation');

  await gotoComponents(page);
  const back = await readSurfaces(page);
  ok(back.button === BUILD_LABEL && back.busy === false, `returning to the page shows a control that is not busy, not the "Building…" it was left on — read "${back.button}", busy ${back.busy}`);
  ok(back.setLine === LAST.ok, `returning to the page shows the set's result it missed — read ${JSON.stringify(back.setLine)}`);
  await page.close();
}

// ── two builds back to back ───────────────────────────────────────────────────────────────────
//
// The loop `docs/40` §7 step 6 ("build it and look at it") actually needs: not one build that resolves,
// but a second one startable from the resolved state. A fix that cleared the label without freeing
// the control would pass every assertion above and still leave the authoring loop blocked.
{
  const { page } = await openPanel();
  await startBuild(page, undefined, 'the first of two builds');
  await post(page, { type: 'component-result', ok: false, completed: true, headline: '⚠ 648, 4 missed', summary: 'first run' });
  await idleAgain(page);
  const first = await readSurfaces(page);
  await startBuild(page, undefined, 'the second of two builds');
  const second = await readSurfaces(page);
  ok(second.button === BUSY_LABEL && second.busy, 'a second build can be started from the resolved state');
  ok(second.barPending.some((t) => /24 of 648/.test(t ?? '')), "the second build's progress reports too, rather than the first verdict staying put");
  await post(page, { type: 'component-result', ok: true, completed: true, headline: '✓ 0 new, 648 present', summary: 'second run — idempotent' });
  await idleAgain(page);
  const done = await readSurfaces(page);
  ok(first.setLine === LAST.bad && done.setLine === LAST.ok, `the second build's result replaces the first on the set's line — first ${JSON.stringify(first.setLine)}, then ${JSON.stringify(done.setLine)}`);
  ok(done.setLines === 1, `exactly one result line for the set, not one per build — found ${done.setLines}`);
  ok(done.barVerdict.some((t) => (t ?? '').includes('✓ 0 new, 648 present')), "the drawer's verdict is the second build's");
  ok(JSON.stringify(await builds(page)) === '["button","button"]', `each build posts once — posted ${JSON.stringify(await builds(page))}`);
  await page.close();
}

// ── #1663: an agent's prune preview is a pill, never the confirm dialog ─────────────────────────
//
// #1660 lets an agent ask the main thread for a prune preview. The main thread marks that preview
// `pillOnly` (`apps/plugin/src/main.ts`, the agent link's `forward`), and `test-agent-link.ts` proves the
// flag is SET. Nothing proved the panel HONORS it: `write-adapter.ts` has to carry the flag across the
// bridge, and the `prune-result` handler in `apps/studio/src/main.ts` has to take the pill branch. With
// either gone, an agent's preview opens the confirm dialog on the owner's screen — and that dialog's
// Delete prunes against the PANEL's knobs (`lastGoodInput`), not the input the agent previewed, so the
// count the owner confirms is not the count that gets deleted.
//
// Both arms post the SAME preview through the real bridge, differing only in `pillOnly`. The control arm
// is not decoration: it proves this probe can see a prune dialog at all, so "no dialog" in the agent arm
// is a measurement rather than a selector that matches nothing. EXPECTED is authored here in the words
// on screen — the dialog found by its accessible name, the pill by its text — and nothing reads
// `prunePreview`/`pruneVerdict` (docs/34 shape 16, same reasoning as the header above).
{
  const PRUNE_SUMMARY = 'Would remove 4 items: 2 layout modes, 2 grid styles.';
  const preview = { type: 'prune-result', ok: true, applied: false, count: 4, summary: PRUNE_SUMMARY };
  const readPrune = (page) => page.evaluate(() => ({
    dialog: !!document.querySelector('[data-p3="prune-dialog"]'),
    deleteCta: [...document.querySelectorAll('[data-p3="dialog-confirm"]')].map((n) => n.textContent),
    pills: [...document.querySelectorAll('[data-p3="activity-op"][data-op="prune"] [data-p3="op-verdict"]')].map((n) => n.textContent),
    // The row's details carry the host's sentence under the short verdict (owner decision #3 on #1956).
    // Read whether or not the row is expanded: a clean result's row is collapsed (#483).
    summaries: [...document.querySelectorAll('[data-p3="activity-op"][data-op="prune"] [data-p3="op-summary"]')].map((n) => n.textContent),
  }));
  // #1830 — the dialog used to be FOUND by its role and accessible name, which asserted both for free.
  // F1 moved the lookup to its hook, so they are asserted here instead, by what the accessibility tree
  // computes: the one dialog named "Prune stale items" must be the hooked prune dialog.
  const namedDialog = (page) => page.getByRole('dialog', { name: 'Prune stale items', exact: true })
    .evaluateAll((ns) => ns.map((n) => n.getAttribute('data-p3')));
  const settle = (page) => page
    .waitForFunction(() => !!document.querySelector('[data-p3="prune-dialog"]')
      || [...document.querySelectorAll('[data-p3="activity-op"][data-op="prune"] [data-p3="op-summary"]')].some((n) => (n.textContent ?? '').includes('Would remove')), null, { timeout: 5000 })
    .catch(() => {});

  // CONTROL: the panel's own preview (no `pillOnly`) opens the dialog. Its readings are kept, because they
  // are the proof the arm below needs: an absence of the dialog means something only once this probe has
  // been shown one (#1831).
  let control = { dialog: false, deleteCta: [] };
  {
    const { page, errors } = await openPanel();
    await post(page, preview);
    await settle(page);
    const s = await readPrune(page);
    ok(s.dialog, '#1663 control: a panel prune preview (no pillOnly) opens the "Prune stale items" dialog, so this probe can see one');
    ok(s.deleteCta.includes('Delete 4 items'), `#1663 control: the dialog's CTA reads "Delete 4 items" — read ${JSON.stringify(s.deleteCta)}`);
    const named = await namedDialog(page);
    ok(named.length === 1 && named[0] === 'prune-dialog',
      `#1830 the prune dialog is a role="dialog" whose accessible name is "Prune stale items" — dialogs by that name: ${JSON.stringify(named)}`);
    control = s;
    // #2124 review (findings 1 and 2): the dialog is modal. Focus is inside it as it opens, Tab and Shift+Tab stay
    // inside, and Cancel returns focus to its opener, the Figma menu button.
    const at = () => page.evaluate(() => ({ hook: document.activeElement?.getAttribute('data-p3') ?? document.activeElement?.tagName ?? null,
      inside: !!document.activeElement?.closest('[data-p3="prune-dialog"]') }));
    const f0 = await at();
    ok(f0.inside, `#2124 prune: focus moves into the dialog as it opens (on ${f0.hook})`);
    const walk = [];
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); walk.push(await at()); }
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Shift+Tab'); walk.push(await at()); }
    ok(walk.every((x) => x.inside), `#2124 prune: Tab and Shift+Tab stay inside the dialog (${walk.map((x) => `${x.hook}${x.inside ? '' : ' OUTSIDE'}`).join(', ')})`);
    await hooks.click(page.locator('[data-p3="prune-dialog"] [data-p3="dialog-cancel"]'), { timeout: 4000 });
    const f1 = await at();
    ok(f1.hook === 'figma-open', `#2124 prune: Cancel returns focus to the Figma menu, its opener (on ${f1.hook})`);
    ok(errors.length === 0, `#1663 control: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }

  // THE ARM: the same preview marked `pillOnly`, as the agent link forwards it.
  {
    const { page, errors } = await openPanel();
    await post(page, { ...preview, pillOnly: true });
    await settle(page);
    const s = await readPrune(page);
    const landed = s.summaries.includes(`Agent preview: ${PRUNE_SUMMARY}`);
    hooks.absent(ok, { seen: control.dialog && landed, state: 'the dialog in the control arm, and the agent preview landing in this one' },
      !s.dialog, '#1663 an agent prune preview (pillOnly) opens NO confirm dialog on the owner\'s screen');
    hooks.absent(ok, { seen: control.deleteCta.includes('Delete 4 items') && landed, state: 'the Delete CTA in the control arm, and the agent preview landing in this one' },
      s.deleteCta.length === 0, `#1663 an agent prune preview offers no Delete CTA — found ${JSON.stringify(s.deleteCta)}`);
    ok(s.pills.includes('4 stale') && s.summaries.includes(`Agent preview: ${PRUNE_SUMMARY}`),
      `#1663 an agent prune preview reads "4 stale" in the Activity drawer, "Agent preview: ${PRUNE_SUMMARY}" in its details — read ${JSON.stringify(s.pills)}, ${JSON.stringify(s.summaries)}`);
    ok(errors.length === 0, `#1663 agent preview: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
}

// ── #259, #1785, Q19, #1778 on the old Style guide page: RETIRED in H12 (#2289, owner PG1 A and Q107 A) ─────
//
// The old page went with the Pages menu. What this arm held moves or goes, as the owner decided (Q107 A):
//   · the options crossing the bridge, and the run's verdict, pending text and Draw's busy state: the Build style
//     guides page's own, held by `test-style-guides-page.mjs` (its `style-guide` posts and its run line);
//   · an agent's run shown on the page (#1785, Q19): Activity shows it, accepted (Q107 A, item 3; #2313 tracks a
//     suspected stale table list on the new page);
//   · the Tables field's comma lists and key matching (#1778): accepted lost (Q107 A, item 2), the new page's "Draw by
//     table title" box takes one title a line.

// ── #1845: File setup reaches its verdict (RE-HOSTED in S8.2: the Figma menu is its one control) ──────────────
//
// The same #870 shape on a third control. Before UI redesign P2 a host verdict became a `Repaint` tag and a switch in
// `apps/studio/src/main.ts` turned the tag into a call; changing `case 'fileSetupRow': syncFileSetupRow()` to a bare
// `break` put #870 back for this button and passed every gate, because no browser suite sent `file-setup-result`
// (#1845). Since S8.2 (owner decision G8 A) Set up file has no page row: its one control is the Figma menu's item, whose
// busy state reads the host session (`figmaActions`), and its result is the Activity drawer's row. This arm drives the
// item and posts the verdict through the real bridge, and reads both back. EXPECTED is authored in the words on screen;
// nothing reads `fileSetupState` (docs/34 shape 16). It also holds G8 on the page: the Components tab draws no Set up
// file control, read by its words (the page's own hooks are what the proof below names).
{
  const { page, errors } = await openPanel();
  const onPage = await page.evaluate(() => {
    const scope = [document.querySelector('[data-p3="components-levers"]'), document.querySelector('[data-p3="components-style-guide"]')];
    return { measured: scope.every(Boolean), words: scope.some((n) => /set up file/i.test(n?.textContent ?? '')) };
  });
  hooks.absent(ok, { seen: onPage.measured, state: 'the Components levers and preview' }, !onPage.words, 'G8: the Components page draws no Set up file control or words; the Figma menu is its one control');
  await page.evaluate(() => {
    window.__setup = 0;
    window.addEventListener('message', (e) => { const m = e.data && e.data.pluginMessage; if (m && m.type === 'file-setup') window.__setup++; });
  });
  const readFs = () => page.evaluate(() => {
    const it = document.querySelector('[data-p3="figma-option-file-setup"]');
    const busy = it ? it.getAttribute('aria-busy') === 'true' : null;
    const row = document.querySelector('[data-p3="activity-op"][data-op="filesetup"]');
    return {
      item: it ? (busy ? it.querySelector('[data-p3="label-busy"]') : it.querySelector('[data-p3="label-idle"]'))?.textContent.replace(/^…\s*/, '').trim() ?? null : null,
      busy,
      state: row?.dataset.state ?? null,
      verdict: row && row.dataset.state !== 'running' ? [...row.querySelectorAll('[data-p3="op-verdict"]')].map((n) => n.textContent) : [],
      pending: row ? [...row.querySelectorAll('[data-p3="op-progress"]')].map((n) => n.textContent) : [],
      posted: window.__setup,
    };
  });
  const openMenu = async () => { await hooks.click(page.locator('[data-p3="figma-open"]')); await hooks.need(page, '[data-p3="figma-menu"]'); };
  await openMenu();
  const before = await readFs();
  ok(before.item === 'Set up file' && before.busy === false, `#1845 the Figma menu offers "Set up file", not busy — read "${before.item}", busy ${before.busy}`);
  const clicked = await hooks.click(page.locator('[data-p3="figma-option-file-setup"]'), { timeout: 4000 }).then(() => true, () => false);
  ok(clicked, '#1845 the Set up file item can be clicked');
  await page.waitForFunction(() => window.__setup > 0, null, { timeout: 3000 }).catch(() => {});
  await openMenu();
  const pending = await readFs();
  ok(pending.item === 'Setting up…' && pending.busy === true && pending.posted === 1 && pending.state === 'running',
    `#1845 a file setup in flight reads "Setting up…" in the menu, busy, with its row running — read "${pending.item}", busy ${pending.busy}, posted ${pending.posted}, row ${pending.state}`);
  await post(page, { type: 'file-setup-result', ok: true, headline: '✓ file set up', summary: '6 pages added, 2 template assets built' });
  await page.waitForFunction(() => document.querySelector('[data-p3="figma-option-file-setup"]')?.getAttribute('aria-busy') !== 'true', null, { timeout: 5000 }).catch(() => {});
  const done = await readFs();
  ok(done.item === 'Set up file' && done.busy === false, `a file-setup verdict frees the Set up file item — read "${done.item}", busy ${done.busy}`);
  ok(done.verdict.length === 1 && done.verdict[0].includes('✓ file set up'), `#1845 exactly one verdict on the Set up file row, in the headline's words — read ${JSON.stringify(done.verdict)}`);
  hooks.absent(ok, { seen: pending.state === 'running', state: 'the Set up file row running' },
    done.pending.length === 0, `#1845 no pending text is left on the Set up file row beside the verdict — found ${JSON.stringify(done.pending)}`);
  ok(errors.length === 0, `#1845 file setup: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── S11 (#1788): an agent's run shows in the Activity drawer, and the panel's controls do not move ──
//
// The plugin brackets every agent command that has an operation with `agent-started` and
// `agent-finished` (`agent-dispatch.ts`, asserted in `test-agent-link.ts`). Between the two the panel's
// Activity drawer shows the run on its operation's row, tagged Agent. While any run of an operation is in
// progress, panel or agent, that operation's controls are busy (owner decision #4 on #1956, fixing #1957):
// aria-disabled and aria-busy, never natively disabled, announced once through the drawer's polite status
// line, and a click on them posts nothing, so a second write cannot start under the first. EXPECTED is each
// row state written here as a literal; ACTUAL is the built panel's DOM, and the UI → plugin messages caught
// on this window, after each host message.
//
// The no-post check has a positive control at the end of the arm: the same click, once nothing is running
// Apply, does post `apply-theme`. Without it a listener that caught nothing would read as "posts nothing".
//
// MUTATIONS, each run against the built bundle and each failing here by name:
//   · `reduce` ignoring `agent-started` → `S11 an agent's Apply Theme run opens the Activity drawer …`.
//   · `settleAgent` dropped → `S11 the agent's verdict lands on the row, still tagged Agent — state running`.
//   · the drawer's auto-open on a start removed → `S11 an agent's Apply Theme run opens … drawer open false`.
//   · the row's revert on a run with no verdict removed → `S11 a run that finishes with no verdict reverts …`.
//   · `opReading` tagging no run as the agent's → `S11 the running row is tagged Agent …` and the build arm.
//   · the reveal branch removed, or the pill's click without `hostChanged()` → `S11 clicking it opens the drawer …`.
//   · the success collapse never scheduled → `clean build: a clean verdict does not pin the drawer open …`.
//   · `applyBusy` ignoring the agent's run → `S11 during an agent's Apply the panel's Apply Theme is busy …`.
//   · `runApply`'s busy guard removed → `S11 clicking the busy Apply Theme posts nothing …`.
//   · the status line's start announcement removed → `S11 the start is announced once …`.
//   · a clean result after a run leaving its row expanded → `S11 a clean result collapses its row …`; one that
//     lands with no run (a later read-back) → `S11 a clean read-back reads "Clean" and collapses the row …`.
//   · `HISTORY_MAX` set to 6 → `S11 the history keeps exactly five earlier results …`.
//   · the hover hold, or the focus hold, removed from the collapse → `S11 the collapse waits while the pointer …` / `… while focus …`.
//   · the reveal expanding the first row, not the asked one → `S11 clicking it opens the drawer with the Style guide row expanded …`.
//   · Read-back's verdict back to the host's sentence → `S11 a failing read-back reads "2 mismatches" …`.
//   · the page pill's caret dropped → `S11 the page row's verdict keeps its caret …`.
{
  const { page, errors } = await openPanel();
  await page.evaluate(() => {
    window.__sent = [];
    window.addEventListener('message', (e) => { const m = e.data && e.data.pluginMessage; if (m && m.type === 'apply-theme') window.__sent.push(m.type); });
  });
  const sentApply = () => page.evaluate(() => window.__sent.length);
  const readOp = (k) => page.evaluate((key) => {
    const row = document.querySelector(`[data-p3="activity-op"][data-op="${key}"]`);
    const drawer = document.querySelector('[data-p3="activity-drawer"]');
    const agent = row?.querySelector('.p3-op-agent');
    const apply = document.querySelector('[data-p3="apply-to-figma"]');
    return {
      state: row?.dataset.state ?? null,
      verdict: row?.querySelector('[data-p3="op-verdict"]')?.textContent ?? null,
      agent: !!agent && !agent.hidden,
      phase: [...(row?.querySelectorAll('[data-p3="op-progress"]') ?? [])].map((n) => n.textContent),
      expanded: row?.querySelector('[data-p3="op-head"]')?.getAttribute('aria-expanded') ?? null,
      history: row?.querySelector('[data-p3="op-history"] summary')?.textContent ?? null,
      drawerOpen: drawer?.dataset.open === 'true',
      applyDisabled: apply ? apply.disabled : null,
      applyBusy: apply ? apply.getAttribute('aria-busy') === 'true' && apply.getAttribute('aria-disabled') === 'true' : null,
      status: document.querySelector('[data-p3="activity-status"]')?.textContent ?? null,
      statusRole: document.querySelector('[data-p3="activity-status"]')?.getAttribute('role') ?? null,
    };
  }, k);
  const settle = (k, want) => page.waitForFunction(([key, w]) => document.querySelector(`[data-p3="activity-op"][data-op="${key}"]`)?.dataset.state === w, [k, want], { timeout: 5000 }).catch(() => {});

  await post(page, { type: 'agent-started', id: 'a1', cmd: 'apply-theme' });
  await settle('apply', 'running');
  const running = await readOp('apply');
  ok(running.state === 'running' && running.drawerOpen,
    `S11 an agent's Apply Theme run opens the Activity drawer on the Apply Theme row — state ${running.state}, drawer open ${running.drawerOpen}`);
  ok(running.agent && running.verdict === 'Running' && running.phase.some((t) => (t ?? '').includes('Writing to Figma…')),
    `S11 the running row is tagged Agent, reads "Running", phase "Writing to Figma…" — agent ${running.agent}, verdict ${JSON.stringify(running.verdict)}, phase ${JSON.stringify(running.phase)}`);
  ok(running.applyBusy === true && running.applyDisabled === false,
    `S11 during an agent's Apply the panel's Apply Theme is busy (aria-busy + aria-disabled), not natively disabled — busy ${running.applyBusy}, disabled ${running.applyDisabled}`);
  ok(running.statusRole === 'status' && running.status === 'Apply Theme, Writing to Figma…',
    `S11 the start is announced once through the drawer's polite status line — role ${running.statusRole}, read ${JSON.stringify(running.status)}`);
  // `force`: Playwright's actionability check reads aria-disabled as disabled and would never click, which
  // would pass this check with the guard gone. A designer's click is not so polite.
  const clickedBusy = await hooks.click(page.locator('[data-p3="apply-to-figma"]'), { timeout: 4000, force: true }).then(() => true, () => false);
  ok(clickedBusy, 'S11 the busy Apply Theme takes a click (it is aria-disabled, not natively disabled)');
  await page.waitForTimeout(200);
  const firedBusy = await sentApply();
  ok(firedBusy === 0, `S11 clicking the busy Apply Theme posts nothing to the plugin — apply-theme messages ${firedBusy}`);

  await post(page, { type: 'apply-result', ok: true, headline: '✓ 42 roles written', summary: '42 roles written' });
  await settle('apply', 'ok');
  const landed = await readOp('apply');
  ok(landed.state === 'ok' && (landed.verdict ?? '').includes('✓ 42 roles written') && landed.agent,
    `S11 the agent's verdict lands on the row, still tagged Agent — state ${landed.state}, verdict ${JSON.stringify(landed.verdict)}, agent ${landed.agent}`);
  ok(running.expanded === 'true' && landed.expanded === 'false',
    `S11 a clean result collapses its row (#483, owner decision #1 on #1956), which a run had opened — running ${running.expanded}, landed ${landed.expanded}`);

  await post(page, { type: 'agent-finished', id: 'a1', cmd: 'apply-theme' });
  await page.waitForTimeout(100);
  const finished = await readOp('apply');
  ok(finished.state === 'ok' && (finished.verdict ?? '').includes('✓ 42 roles written'),
    `S11 agent-finished keeps the verdict on the row — state ${finished.state}, verdict ${JSON.stringify(finished.verdict)}`);

  await post(page, { type: 'agent-started', id: 'a2', cmd: 'apply-theme' });
  await settle('apply', 'running');
  const second = await readOp('apply');
  ok(second.history === 'Earlier results (1)', `S11 a second run retires the first result to history — read ${JSON.stringify(second.history)}`);

  // A run that ends with no verdict (the command threw) leaves nothing running: the row goes back to the
  // result it had, rather than spinning forever.
  await post(page, { type: 'agent-finished', id: 'a2', cmd: 'apply-theme' });
  await settle('apply', 'ok');
  const reverted = await readOp('apply');
  ok(reverted.state === 'ok' && (reverted.verdict ?? '').includes('✓ 42 roles written') && reverted.history === null,
    `S11 a run that finishes with no verdict reverts the row to its last result — state ${reverted.state}, verdict ${JSON.stringify(reverted.verdict)}, history ${JSON.stringify(reverted.history)}`);

  // Seven more runs, each with its own verdict: the row holds the newest, and the history exactly the five
  // before it (concept v6). Seven, not six, so a cap of six would show six rather than coincide.
  for (let i = 1; i <= 7; i++) {
    await post(page, { type: 'agent-started', id: `h${i}`, cmd: 'apply-theme' });
    await settle('apply', 'running');
    await post(page, { type: 'apply-result', ok: true, headline: `✓ ${i} roles written`, summary: `${i} roles written` });
    await page.waitForFunction((w) => (document.querySelector('[data-p3="activity-op"][data-op="apply"] [data-p3="op-verdict"]')?.textContent ?? '') === w, `✓ ${i} roles written`, { timeout: 5000 }).catch(() => {});
    await post(page, { type: 'agent-finished', id: `h${i}`, cmd: 'apply-theme' });
  }
  const kept = await page.evaluate(() => {
    const row = document.querySelector('[data-p3="activity-op"][data-op="apply"]');
    return { summary: row?.querySelector('[data-p3="op-history"] summary')?.textContent ?? null, items: [...(row?.querySelectorAll('[data-p3="op-history-entry"]') ?? [])].map((n) => n.textContent ?? '') };
  });
  const wantItems = [6, 5, 4, 3, 2].map((i) => `✓ ${i} roles written`);
  ok(kept.summary === 'Earlier results (5)' && kept.items.length === 5 && kept.items.every((t, j) => t.includes(wantItems[j])),
    `S11 the history keeps exactly five earlier results, newest first — read ${JSON.stringify(kept.summary)}, ${JSON.stringify(kept.items.map((t) => t.replace(/^\d\d:\d\d · /, '')))}`);

  await post(page, { type: 'agent-started', id: 'b1', cmd: 'build-components' });
  await post(page, { type: 'agent-progress', id: 'b1', progress: { phase: 'build', done: 24, total: 648 } });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-p3="activity-op"][data-op="components"] [data-p3="op-progress"]')].some((n) => /24 of 648/.test(n.textContent ?? '')), null, { timeout: 5000 }).catch(() => {});
  const build = await readOp('components');
  ok(build.state === 'running' && build.agent && build.phase.some((t) => /Building members… 24 of 648/.test(t ?? '')),
    `S11 an agent's build shows its live progress on the Build set row — state ${build.state}, agent ${build.agent}, phase ${JSON.stringify(build.phase)}`);
  // Positive control for the no-post check: nothing runs Apply now, so the same click does post.
  await hooks.click(page.locator('[data-p3="apply-to-figma"]'), { timeout: 4000 }).catch(() => {});
  await page.waitForFunction(() => window.__sent.length > 0, null, { timeout: 3000 }).catch(() => {});
  const firedIdle = await sentApply();
  ok(firedIdle === 1, `S11 control: with no Apply running, the same click posts one apply-theme — messages ${firedIdle}`);
  ok(errors.length === 0, `S11 agent run: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── Q194 (#2487): a run's finish is announced on the same polite status line ─────────────────────────
//
// The owner's call (Q194, amending decision #4 on #1956, which announced only the start): a screen-reader user needs
// to know a run is over, so the file is safe to use again or the plugin can be closed. A success is a short "finished";
// a failure is announced with its reason, the first line of the host's detail. EXPECTED is each line written here as a
// literal (DRAFT wording, held for the owner on the PR); ACTUAL is the status line's text and role in the built panel,
// read after each verdict. The start is read between the runs, so a line left standing from the last finish would show.
//
// MUTATIONS, each failing here by name:
//   · the finish not pushed (`said.push(finishLine(k, n))` removed) → `Q194 a clean Apply Theme run is announced …` and
//     `Q194 a failed Apply Theme run is announced with its reason …`.
//   · the line emptied once nothing runs, as before Q194 (`if (!stillRunning) live.textContent = ''` unconditional)
//     → the same two arms.
//   · `finishLine` dropping the reason → `Q194 a failed Apply Theme run is announced with its reason …`.
{
  const { page, errors } = await openPanel();
  const status = () => page.evaluate(() => {
    const s = document.querySelector('[data-p3="activity-status"]');
    return { text: s?.textContent ?? null, role: s?.getAttribute('role') ?? null, live: s?.getAttribute('aria-live') ?? null };
  });
  const state = (w) => page.waitForFunction((x) => document.querySelector('[data-p3="activity-op"][data-op="apply"]')?.dataset.state === x, w, { timeout: 5000 }).catch(() => {});
  const run = async (id, result, landed) => {
    await post(page, { type: 'agent-started', id, cmd: 'apply-theme' });
    await state('running');
    const started = await status();
    await post(page, { type: 'apply-result', ...result });
    await state(landed);
    const done = await status();
    await post(page, { type: 'agent-finished', id, cmd: 'apply-theme' });
    await page.waitForTimeout(100);
    return { started, done, after: await status() };
  };

  const clean = await run('f1', { ok: true, headline: '✓ 42 roles written', summary: '42 roles written' }, 'ok');
  ok(clean.started.text === 'Apply Theme, Writing to Figma…' && clean.done.text === 'Apply Theme finished.' && clean.done.role === 'status' && clean.done.live !== 'assertive',
    `Q194 a clean Apply Theme run is announced as finished, politely, on the status line that announced its start — start ${JSON.stringify(clean.started.text)}, finish ${JSON.stringify(clean.done.text)}, role ${clean.done.role}, aria-live ${clean.done.live}`);
  ok(clean.after.text === 'Apply Theme finished.',
    `Q194 the finish stands after the run closes, until the next start — read ${JSON.stringify(clean.after.text)}`);

  const REASON = 'The variable collection is read-only in this file';
  const failed = await run('f2', { ok: false, headline: '✗ Apply failed', summary: `${REASON}.`, lines: [`${REASON}.`] }, 'bad');
  ok(failed.started.text === 'Apply Theme, Writing to Figma…' && failed.done.text === `Apply Theme failed: ${REASON}.` && failed.done.role === 'status',
    `Q194 a failed Apply Theme run is announced with its reason — start ${JSON.stringify(failed.started.text)}, finish ${JSON.stringify(failed.done.text)}, role ${failed.done.role}`);

  const warned = await run('f3', { ok: false, headline: '⚠ 40 of 42 roles written', summary: '2 roles were skipped', lines: ['2 roles were skipped'] }, 'bad');
  ok(warned.done.text === 'Apply Theme finished with a warning: 2 roles were skipped.',
    `Q194 a run that finishes with a warning is announced with its reason, as finished — read ${JSON.stringify(warned.done.text)}`);
  ok(errors.length === 0, `Q194: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── #2088: the first phase line names the set being built, or none ───────────────────────────────────
//
// Before the first chunk boundary reports, the Activity row's phase line said "Building the Button set…" whatever
// set was building. The owner's call (2026-10-05): a build the panel started names its set by the catalog's display
// name; one an agent started names none, and reads exactly "Building the set…". Both arms read the line BEFORE any
// `component-progress` is posted, which is the only window the line exists in. The expected strings are literals,
// the copy under test, never read from the catalog the code reads.
//
// The panel arm builds TWO sets on one page, Button then Tag, and reads each one's line exactly: one set alone
// lets a line hard-coded to that set's name pass (the original "always Button" was that shape), and the second
// build is what catches a line reading the PREVIOUS set rather than the current one.
//
// MUTATIONS, each failing here by name:
//   · `firstPhase` returning the literal "Building the Tag set…" for any named build → `#2088 a panel build of Button …`.
//   · `firstPhase` returning the literal "Building the Button set…" for any named build → `#2088 a panel build of Tag …`.
//   · `firstPhase` naming the previous set (`[...host.setBuilds.keys()].at(-1)`) → both panel lines.
{
  const { page, errors } = await openPanel();
  const phaseOf = () => page.evaluate(() => [...document.querySelectorAll('[data-p3="activity-op"][data-op="components"] [data-p3="op-progress"] b')].map((n) => n.textContent));
  const running = () => page.waitForFunction(() => document.querySelector('[data-p3="activity-op"][data-op="components"]')?.dataset.state === 'running', null, { timeout: 5000 }).catch(() => {});

  for (const [id, name, sent] of [['button', 'Button', '["button"]'], ['tag', 'Tag', '["button","tag"]']]) {
    await hooks.click(page.locator(`[data-p3="components-def-option"][value="${id}"]`));
    await hooks.click(page.locator('[data-p3="components-build"]').first(), { timeout: 4000 }).catch(() => {});
    await running();
    await page.waitForFunction((n) => window.__builds.length >= n, sent === '["button"]' ? 1 : 2, { timeout: 3000 }).catch(() => {});
    const own = await phaseOf();
    const posted = JSON.stringify(await builds(page));
    ok(posted === sent && own.length === 1 && own[0] === `Building the ${name} set…`,
      `#2088 a panel build of ${name} reads exactly "Building the ${name} set…" before its first boundary — posted ${posted}, read ${JSON.stringify(own)}`);
    await post(page, { type: 'component-result', ok: true, completed: true, headline: '✓ built', summary: `set '${id}'` });
    await idleAgain(page);
  }

  await post(page, { type: 'agent-started', id: 'p1', cmd: 'build-components' });
  await running();
  const agent = await phaseOf();
  ok(agent.length === 1 && agent[0] === 'Building the set…',
    `#2088 an agent's build reads exactly "Building the set…" before its first boundary — read ${JSON.stringify(agent)}`);
  await post(page, { type: 'agent-finished', id: 'p1', cmd: 'build-components' });
  ok(errors.length === 0, `#2088: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── #1957: a declined second write ─────────────────────────────────────────────────────────────────
//
// The plugin's main thread refuses a second write of an operation while one is running, and tells the panel
// with `refused` (asserted in `test-agent-link.ts`). The owner's call (2026-10-02): the row keeps showing the
// running write; the refusal goes straight into Earlier results with the verdict "Refused" and the busy
// message as its details; it is not counted as needing attention and does not open the drawer; the live line
// says "‹Operation› already running; the second request was declined." EXPECTED is that copy, written here.
//
// MUTATIONS, each failing here by name:
//   · the drawer's refusal branch removed → `#1957 a declined second Apply goes into Earlier results …` and the live-line arm.
// Not here: a refusal counted as needing attention. The drawer's counts read the host session's slots, not
// its own records, so that mutation lives in the reducer and `test-host-session.ts`'s `refused:` arms catch it.
// Writing the refusal as the row's result is masked here (the running row shows the run, and the run's own
// verdict replaces it), so it is not claimed as a mutation of this arm.
//   · the refusal opening the drawer → `#1957 a declined request does not open the drawer …`.
{
  const { page, errors } = await openPanel();
  const BUSY = 'Apply Theme is already running. Try again when it finishes.';
  await post(page, { type: 'agent-started', id: 'r1', cmd: 'apply-theme' });
  await page.waitForFunction(() => document.querySelector('[data-p3="activity-op"][data-op="apply"]')?.dataset.state === 'running', null, { timeout: 5000 }).catch(() => {});
  // The start opened the drawer; close it by hand, so a refusal that opened it would show.
  await hooks.click(page.locator('[data-p3="activity-toggle"]'), { timeout: 4000 }).catch(() => {});
  await page.waitForFunction(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'false', null, { timeout: 3000 }).catch(() => {});
  await post(page, { type: 'refused', code: 'busy', cmd: 'apply-theme', agent: false, message: BUSY });
  await page.waitForTimeout(200);
  const read = await page.evaluate(() => {
    const row = document.querySelector('[data-p3="activity-op"][data-op="apply"]');
    const drawer = document.querySelector('[data-p3="activity-drawer"]');
    return {
      state: row?.dataset.state ?? null,
      verdict: row?.querySelector('[data-p3="op-verdict"]')?.textContent ?? null,
      history: row?.querySelector('[data-p3="op-history"] summary')?.textContent ?? null,
      items: [...(row?.querySelectorAll('[data-p3="op-history-entry"]') ?? [])].map((n) => (n.textContent ?? '').replace(/^\d\d:\d\d · /, '')),
      count: document.querySelector('[data-p3="activity-toggle"] .p3-drawer-count')?.textContent ?? '',
      open: drawer?.dataset.open ?? null,
      status: document.querySelector('[data-p3="activity-status"]')?.textContent ?? null,
    };
  });
  ok(read.state === 'running' && read.verdict === 'Running',
    `#1957 a declined second Apply leaves the row on the running write — the row keeps showing the running write: state ${read.state}, verdict ${JSON.stringify(read.verdict)}`);
  ok(read.history === 'Earlier results (1)' && read.items.length === 1 && read.items[0].includes('Refused') && read.items[0].includes(BUSY),
    `#1957 a declined second Apply goes into Earlier results as "Refused", with the busy message — ${JSON.stringify(read.history)}, ${JSON.stringify(read.items)}`);
  ok(!/attention/.test(read.count), `#1957 a declined request is not counted as needing attention — count ${JSON.stringify(read.count)}`);
  ok(read.open === 'false', `#1957 a declined request does not open the drawer — open ${read.open}`);
  ok(read.status === 'Apply Theme already running; the second request was declined.',
    `#1957 the live line says the second request was declined — read ${JSON.stringify(read.status)}`);
  // The running write still lands as its own result, and the refusal stays in the history.
  await post(page, { type: 'apply-result', ok: true, headline: '✓ 42 roles written', summary: '42 roles written' });
  await post(page, { type: 'agent-finished', id: 'r1', cmd: 'apply-theme' });
  await page.waitForFunction(() => document.querySelector('[data-p3="activity-op"][data-op="apply"]')?.dataset.state === 'ok', null, { timeout: 5000 }).catch(() => {});
  const after = await page.evaluate(() => {
    const row = document.querySelector('[data-p3="activity-op"][data-op="apply"]');
    return { verdict: row?.querySelector('[data-p3="op-verdict"]')?.textContent ?? null, items: [...(row?.querySelectorAll('[data-p3="op-history-entry"]') ?? [])].map((n) => n.textContent ?? '') };
  });
  ok((after.verdict ?? '').includes('✓ 42 roles written') && after.items.length === 1 && after.items[0].includes('Refused'),
    `#1957 the running write's verdict lands on the row after a refusal — verdict ${JSON.stringify(after.verdict)}, history ${JSON.stringify(after.items)}`);
  ok(errors.length === 0, `#1957 refusal: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── S11: a page row's verdict opens the Activity drawer on that operation's row: MOVED in H12 (#2289) ──────────
//
// The old Style guide page's row verdict was the last page row with one, and went with the page. Build style guides'
// own verdict pill opens Activity on its Style guide row, expanded, with its summary: `test-style-guides-page.mjs`.

// ── S11: the 4 s collapse waits while the pointer, or focus, is inside the drawer (concept v6) ──────────
//
// The drawer opens by itself on a run; the clean verdict schedules the collapse COLLAPSE_MS (4 s) later.
// Held, it looks again every COLLAPSE_RECHECK_MS (1.5 s). EXPECTED: still open well past 4 s while held,
// closed within a recheck of letting go. Each hold is read in its own panel, so one cannot stand in for
// the other.
for (const how of ['pointer', 'focus']) {
  const { page, errors } = await openPanel();
  await page.mouse.move(1, 1);
  await post(page, { type: 'agent-started', id: 'c1', cmd: 'apply-theme' });
  await page.waitForFunction(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'true', null, { timeout: 5000 }).catch(() => {});
  // The pointer goes in once the verdict has drawn: opening the drawer moves its bar, so a pointer placed
  // on the bar before the row appears is no longer inside it.
  if (how === 'focus') await page.locator('[data-p3="activity-toggle"]').focus();
  await post(page, { type: 'apply-result', ok: true, headline: '✓ 42 roles written', summary: '42 roles written' });
  await post(page, { type: 'agent-finished', id: 'c1', cmd: 'apply-theme' });
  if (how === 'pointer') await page.locator('[data-p3="activity-op"][data-op="apply"]').hover();
  await page.waitForTimeout(6000);
  const held = await page.evaluate(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open);
  ok(held === 'true', `S11 the collapse waits while ${how === 'pointer' ? 'the pointer is' : 'focus is'} inside the drawer — open at 6 s: ${held}`);
  if (how === 'pointer') await page.mouse.move(1, 1);
  else await page.evaluate(() => document.activeElement?.blur());
  await page.waitForFunction(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'false', null, { timeout: 3000 }).catch(() => {});
  const let_go = await page.evaluate(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open);
  ok(let_go === 'false', `S11 control: once the ${how} leaves, the drawer collapses within a recheck — open ${let_go}`);
  ok(errors.length === 0, `S11 ${how} hold: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── S11: Read-back's row shows a short verdict, the host's sentence in its details (owner decision #3) ──
{
  const SENTENCE = 'Existing theme: 268 color vars, modes light — FAILED: declaredModes, plannedModes';
  const { page, errors } = await openPanel();
  await post(page, { type: 'seed-info', ok: false, present: true, summary: SENTENCE, failed: 2 });
  await page.waitForFunction(() => !!document.querySelector('[data-p3="activity-op"][data-op="readback"]'), null, { timeout: 5000 }).catch(() => {});
  const rb = await page.evaluate(() => {
    const row = document.querySelector('[data-p3="activity-op"][data-op="readback"]');
    const sum = row?.querySelector('[data-p3="op-summary"]');
    return { state: row?.dataset.state, verdict: row?.querySelector('[data-p3="op-verdict"]')?.textContent ?? null, summary: sum && sum.checkVisibility() ? sum.textContent : null };
  });
  ok(rb.state === 'bad' && rb.verdict === '2 mismatches' && (rb.summary ?? '').includes(SENTENCE),
    `S11 a failing read-back reads "2 mismatches", its sentence showing in the row's details — state ${rb.state}, verdict ${JSON.stringify(rb.verdict)}, summary ${JSON.stringify(rb.summary)}`);
  // A clean read-back that lands later, with no run the drawer saw, collapses the row the bad one opened.
  const readRb = () => page.evaluate(() => {
    const row = document.querySelector('[data-p3="activity-op"][data-op="readback"]');
    return { state: row?.dataset.state, verdict: row?.querySelector('[data-p3="op-verdict"]')?.textContent ?? null, expanded: row?.querySelector('[data-p3="op-head"]')?.getAttribute('aria-expanded') };
  });
  const opened = await readRb();
  await post(page, { type: 'seed-info', ok: true, present: true, summary: 'Existing theme: 268 color vars, modes light', failed: 0 });
  await page.waitForFunction(() => document.querySelector('[data-p3="activity-op"][data-op="readback"]')?.dataset.state === 'ok', null, { timeout: 5000 }).catch(() => {});
  const clean = await readRb();
  ok(opened.expanded === 'true' && clean.state === 'ok' && clean.verdict === 'Clean' && clean.expanded === 'false',
    `S11 a clean read-back reads "Clean" and collapses the row the failing one opened — before ${JSON.stringify(opened)}, after ${JSON.stringify(clean)}`);
  ok(errors.length === 0, `S11 read-back: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── #1990: every approved short verdict, by literal, from a driven host message ─────────────────────
//
// The owner's copy for Read-back and Prune stale (approved on #1956): "Clean", "N mismatch(es)", "Failed",
// "No theme", "Not restored"; "N stale", "Removed N", "Clean", "Failed". A read-back whose checks pass
// reads "Clean" even when the saved brand was not restored, the refusal in its details; "Not restored" is
// only for a refusal with nothing checked. EXPECTED is each literal written here.
//
// MUTATIONS, each failing here by name:
//   · the contract-passing read-back with a restore refusal back to "Not restored" → `#1990 a read-back whose checks pass reads "Clean" …`.
//   · any one short word changed in `SHORT`, or `Removed ${n}` → its own `#1990 …` arm.
{
  const readOp = (page, k) => page.evaluate((key) => {
    const row = document.querySelector(`[data-p3="activity-op"][data-op="${key}"]`);
    const sum = row?.querySelector('[data-p3="op-summary"]');
    return { verdict: row?.querySelector('[data-p3="op-verdict"]')?.textContent ?? null, summary: sum?.textContent ?? null };
  }, k);
  const until = (page, k, want) => page.waitForFunction(([key, w]) => document.querySelector(`[data-p3="activity-op"][data-op="${key}"] [data-p3="op-verdict"]`)?.textContent === w, [k, want], { timeout: 5000 }).catch(() => {});
  const REFUSAL = 'saved brand data is from an older shape';

  // A restore refusal with no read-back yet: nothing was checked.
  {
    const { page, errors } = await openPanel();
    await post(page, { type: 'restore-input-error', message: REFUSAL });
    await until(page, 'readback', 'Not restored');
    const nr = await readOp(page, 'readback');
    ok(nr.verdict === 'Not restored' && (nr.summary ?? '').includes(REFUSAL),
      `#1990 a restore refusal with nothing checked reads "Not restored", the reason in details — verdict ${JSON.stringify(nr.verdict)}, summary ${JSON.stringify(nr.summary)}`);
    // The read-back then lands and its checks pass.
    await post(page, { type: 'seed-info', ok: true, present: true, summary: 'Existing theme: 268 color vars, modes light', failed: 0 });
    await until(page, 'readback', 'Clean');
    const cl = await readOp(page, 'readback');
    ok(cl.verdict === 'Clean' && (cl.summary ?? '').includes('Saved brand not restored') && (cl.summary ?? '').includes(REFUSAL),
      `#1990 a read-back whose checks pass reads "Clean" when the saved brand was not restored, which its details say — verdict ${JSON.stringify(cl.verdict)}, summary ${JSON.stringify(cl.summary)}`);
    ok(errors.length === 0, `#1990 not restored: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
  {
    const { page, errors } = await openPanel();
    await post(page, { type: 'seed-info', ok: true, present: false, summary: '', failed: 0 });
    await until(page, 'readback', 'No theme');
    ok((await readOp(page, 'readback')).verdict === 'No theme', `#1990 a file with no Prism3 theme reads "No theme" — ${JSON.stringify((await readOp(page, 'readback')).verdict)}`);
    await post(page, { type: 'seed-info', ok: false, present: false, summary: 'read-back failed: host threw', failed: 0 });
    await until(page, 'readback', 'Failed');
    ok((await readOp(page, 'readback')).verdict === 'Failed', `#1990 a read-back that threw reads "Failed" — ${JSON.stringify((await readOp(page, 'readback')).verdict)}`);
    await post(page, { type: 'seed-info', ok: true, present: true, summary: 'Existing theme: 268 color vars', failed: 0 });
    await until(page, 'readback', 'Clean');
    await post(page, { type: 'seed-info', ok: false, present: true, summary: 'Existing theme — FAILED (no count from this host)', failed: 0 });
    await until(page, 'readback', 'Failed');
    ok((await readOp(page, 'readback')).verdict === 'Failed', `#1990 a failing contract with no count reads "Failed" (the fallback) — ${JSON.stringify((await readOp(page, 'readback')).verdict)}`);
    await post(page, { type: 'seed-info', ok: false, present: true, summary: 'Existing theme — FAILED: declaredModes', failed: 1 });
    await until(page, 'readback', '1 mismatch');
    ok((await readOp(page, 'readback')).verdict === '1 mismatch', `#1990 one failed check reads "1 mismatch" — ${JSON.stringify((await readOp(page, 'readback')).verdict)}`);

    await post(page, { type: 'prune-result', ok: true, applied: true, count: 3, summary: 'Removed 3 stale variables' });
    await until(page, 'prune', 'Removed 3');
    ok((await readOp(page, 'prune')).verdict === 'Removed 3', `#1990 a prune delete reads "Removed 3" — ${JSON.stringify((await readOp(page, 'prune')).verdict)}`);
    await post(page, { type: 'prune-result', ok: false, applied: true, count: 0, summary: 'prune failed: host threw' });
    await until(page, 'prune', 'Failed');
    ok((await readOp(page, 'prune')).verdict === 'Failed', `#1990 a failed prune reads "Failed" — ${JSON.stringify((await readOp(page, 'prune')).verdict)}`);
    await post(page, { type: 'prune-result', ok: true, applied: false, count: 0, summary: 'Nothing stale' });
    await until(page, 'prune', 'Clean');
    ok((await readOp(page, 'prune')).verdict === 'Clean', `#1990 a prune preview that finds nothing reads "Clean" — ${JSON.stringify((await readOp(page, 'prune')).verdict)}`);
    ok(errors.length === 0, `#1990 short verdicts: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
}

// ── #2008, #2009: a failed restore on its own does not make a read-back row bad ──────────────────────
//
// The owner's calls (option a on #2008, and #2009): a read-back that reads "Clean" (#1990) or "No theme"
// after the saved brand could not be restored draws as a normal row. It is not counted as needing
// attention and does not open the drawer; the plugin's error bar already says the saved brand did not
// load. Only "Not restored", "Failed" and mismatches are bad rows. Each verdict is driven in both orders
// the two host messages can land in. Controls prove the probe can see a bad row: a failing check, and a
// read-back that threw, after the same refusal still count and open the drawer, and so does the refusal
// on its own ("Not restored"). EXPECTED is each value written here.
//
// MUTATIONS: the row's state back to `ok && !err` → `#2008 … is a normal row …`, `#2008 … is not
// counted …` and `#2008 … does not open the drawer …`, for "Clean" and "No theme" in both orders; back to
// #2008's first cut, `ok && (!err || o.state === 'present')` → the same three for "No theme" only; the
// state pinned to `'ok'` → `#2008 control: …` (and S11's own failing read-back arms); the early return
// for a refusal with nothing checked set to `state: 'ok'` → `#2008 control: a failed restore on its own …`.
{
  const REFUSAL = 'saved brand data is from an older shape';
  const CLEAN = { type: 'seed-info', ok: true, present: true, summary: 'Existing theme: 268 color vars, modes light', failed: 0 };
  const NO_THEME = { type: 'seed-info', ok: true, present: false, summary: '', failed: 0 };
  const read = (page) => page.evaluate(() => {
    const row = document.querySelector('[data-p3="activity-op"][data-op="readback"]');
    return {
      state: row?.dataset.state ?? null,
      verdict: row?.querySelector('[data-p3="op-verdict"]')?.textContent ?? null,
      count: document.querySelector('[data-p3="activity-toggle"] .p3-drawer-count')?.textContent ?? '',
      open: document.querySelector('[data-p3="activity-drawer"]')?.dataset.open ?? null,
    };
  });
  const until = (page, w) => page.waitForFunction((want) => document.querySelector('[data-p3="activity-op"][data-op="readback"] [data-p3="op-verdict"]')?.textContent === want, w, { timeout: 5000 }).catch(() => {});
  const closeDrawer = async (page) => {
    if (await page.evaluate(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open) === 'true') {
      await hooks.click(page.locator('[data-p3="activity-toggle"]'), { timeout: 4000 }).catch(() => {});
    }
    await page.waitForFunction(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'false', null, { timeout: 3000 }).catch(() => {});
  };
  for (const [want, msg] of [['Clean', CLEAN], ['No theme', NO_THEME]]) {
    const check = (r, how) => {
      ok(r.verdict === want && r.state === 'ok',
        `#2008 a "${want}" read-back after a failed restore is a normal row (${how}) — verdict ${JSON.stringify(r.verdict)}, state ${r.state}`);
      ok(!/attention/.test(r.count), `#2008 a "${want}" read-back after a failed restore is not counted as needing attention (${how}) — count ${JSON.stringify(r.count)}`);
      ok(r.open === 'false', `#2008 a "${want}" read-back after a failed restore does not open the drawer (${how}) — open ${r.open}`);
    };
    // The refusal first, then the read-back. The refusal alone is "Not restored", a bad row, and opens the drawer.
    {
      const { page, errors } = await openPanel();
      await post(page, { type: 'restore-input-error', message: REFUSAL });
      await until(page, 'Not restored');
      await closeDrawer(page);
      await post(page, msg);
      await until(page, want);
      await page.waitForTimeout(200);
      check(await read(page), 'refusal first');
      ok(errors.length === 0, `#2008 "${want}", refusal first: no console errors (${errors.slice(0, 2).join(' · ')})`);
      await page.close();
    }
    // The read-back first, then the refusal.
    {
      const { page, errors } = await openPanel();
      await post(page, msg);
      await until(page, want);
      await closeDrawer(page);
      await post(page, { type: 'restore-input-error', message: REFUSAL });
      await page.waitForFunction(() => (document.querySelector('[data-p3="activity-op"][data-op="readback"] [data-p3="op-summary"]')?.textContent ?? '').includes('Saved brand not restored'), null, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(200);
      check(await read(page), 'read-back first');
      ok(errors.length === 0, `#2008 "${want}", read-back first: no console errors (${errors.slice(0, 2).join(' · ')})`);
      await page.close();
    }
  }
  // Controls: a failing check, and a read-back that threw, after the same refusal are still bad rows,
  // counted, and open the drawer.
  for (const [want, msg, what] of [['1 mismatch', { ...CLEAN, ok: false, failed: 1 }, 'a failing check'], ['Failed', { type: 'seed-info', ok: false, present: false, summary: 'read-back failed: host threw', failed: 0 }, 'a read-back that threw']]) {
    const { page, errors } = await openPanel();
    await post(page, { type: 'restore-input-error', message: REFUSAL });
    await until(page, 'Not restored');
    await closeDrawer(page);
    await post(page, msg);
    await until(page, want);
    await page.waitForTimeout(200);
    const r = await read(page);
    ok(r.verdict === want && r.state === 'bad' && /1 needs attention/.test(r.count) && r.open === 'true',
      `#2008 control: ${what} after a failed restore is still a bad row, counted, and opens the drawer — verdict ${JSON.stringify(r.verdict)}, state ${r.state}, count ${JSON.stringify(r.count)}, open ${r.open}`);
    ok(errors.length === 0, `#2008 control, ${what}: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
  // Control: a refusal on its own, with no read-back after it, is "Not restored": a bad row, counted, and
  // it opens the drawer.
  {
    const { page, errors } = await openPanel();
    await closeDrawer(page);
    await post(page, { type: 'restore-input-error', message: REFUSAL });
    await until(page, 'Not restored');
    await page.waitForTimeout(200);
    const r = await read(page);
    ok(r.verdict === 'Not restored' && r.state === 'bad' && /1 needs attention/.test(r.count) && r.open === 'true',
      `#2008 control: a failed restore on its own is "Not restored", a bad row, counted, and opens the drawer — verdict ${JSON.stringify(r.verdict)}, state ${r.state}, count ${JSON.stringify(r.count)}, open ${r.open}`);
    ok(errors.length === 0, `#2008 control, a failed restore on its own: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
}

// ── #1990: the busy spinner waits before it draws ───────────────────────────────────────────────────
//
// The spinner is CSS only (`chrome.css` `.p3-spin`): the "…" holds for three of the fast duration, then the
// arc fades in, so a quick write never flashes a spinner. Both halves are pinned: the computed delay (and
// that it sits inside the engine spinner's 200 to 500 ms anti-flash wait), and what is drawn before and
// after it, read off the busy Apply during an agent's run (no host message arrives in between, so
// `renderBar` does not re-mint the control and restart the delay).
//
// MUTATIONS: the delay removed from `.p3-spin::before` → `#1990 the spinner's arc waits …`; the arc drawn
// before its fade (base `opacity: 1`) → `#1990 the arc is not drawn at once …`; the arc never shown →
// `#1990 … and is drawn after the delay`. Removing the delay fails the delay arm alone: the fade then starts
// from 0 when the control turns busy, so the at-start read is still 0.
//
// WHEN EACH IS READ (#2332). The spinner is made with the control's label at mount and held invisible until
// the control turns busy, and an invisible element still runs its animations; so before #2332's fix the wait
// and the fade were spent at mount, and every apply that came later drew the arc at once. The arm puts the
// panel in that state, not at a time: it waits until the mounted spinner runs no fade (with the defect, its
// mount-time fade is waited out; with the fix there is none). Then the at-start state is read inside the page,
// by a MutationObserver, in the microtask after the control's `aria-busy` turns true, before any frame. The
// drawn state is waited for, bounded. MUTATION: the fix removed (the `animation: none` hold in `chrome.css`)
// → `#1990 the arc is not drawn at once — opacity at start 1`.
{
  const { page, errors } = await openPanel();
  const ctl = '[data-p3="apply-to-figma"]';
  const sel = `${ctl} .p3-spin`;
  await page.waitForFunction((q) => {
    const n = document.querySelector(q);
    return !!n && !n.getAnimations({ subtree: true }).some((x) => x.animationName === 'p3-spin-show' && x.playState !== 'finished');
  }, sel, { timeout: 5000 }).catch(() => {});
  await page.evaluate(([c, q]) => {
    const ms = (t) => t.split(',').map((x) => x.trim()).map((x) => x.endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000);
    const read = (n) => { const b = getComputedStyle(n, '::before'); return { delays: ms(b.animationDelay), names: b.animationName, opacity: Number(b.opacity) }; };
    const mo = new MutationObserver(() => {
      const n = document.querySelector(q);
      if (n && document.querySelector(c)?.getAttribute('aria-busy') === 'true') { window.__p3SpinAtStart = read(n); mo.disconnect(); }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy'] });
  }, [ctl, sel]);
  await post(page, { type: 'agent-started', id: 'sp1', cmd: 'apply-theme' });
  await page.waitForFunction(() => !!window.__p3SpinAtStart, null, { timeout: 5000 }).catch(() => {});
  const early = await page.evaluate(() => window.__p3SpinAtStart ?? null);
  const drawn = (q) => { const n = document.querySelector(q); return !!n && Number(getComputedStyle(n, '::before').opacity) === 1; };
  await page.waitForFunction(drawn, sel, { timeout: 5000 }).catch(() => {});
  const late = await page.evaluate((q) => { const n = document.querySelector(q); return n ? { opacity: Number(getComputedStyle(n, '::before').opacity) } : null; }, sel);
  const delay = early?.delays[0] ?? 0;
  ok(!!early && /p3-spin-show/.test(early.names) && delay >= 200 && delay <= 500,
    `#1990 the spinner's arc waits before it fades in, inside the 200 to 500 ms anti-flash window — delay ${delay} ms, animations ${early?.names}`);
  ok(!!early && early.opacity === 0, `#1990 the arc is not drawn at once — opacity at start ${early?.opacity}`);
  ok(!!late && late.opacity === 1, `#1990 … and is drawn after the delay — opacity after waiting up to 5 s ${late?.opacity}`);
  ok(errors.length === 0, `#1990 spinner: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── #1890: a bad verdict opens its row in the Activity drawer, and the drawer stays in view ─────────
//
// HISTORY. This arm began as an ordering check: a verdict invalidated `host` (the bar) and then
// `host:detail` (the detail row, which then re-measured `--chrome-h`), so the bar had to be written before
// the detail row or the chrome would be measured stale. A MutationObserver recorded the DOM write order.
// Under S1.4 the bar and the detail row moved into the Activity drawer at the bottom edge, and the
// `--chrome-h` ordering had nothing left to observe; the bar-before-detail ordering stayed.
//
// UNDER S11 (plan §3.9) THERE IS ONE SURFACE. The bar's pills and the separate detail row are gone: each
// operation has its own row in the drawer, and its verdict pill and its summary are painted by one
// subscriber in one pass (`apps/studio/src/shell/activity.ts`). There is no second region for a write
// order to be measured between, so the ordering checks are retired rather than kept against a structure
// that no longer exists. What the arm still owes a designer is checked in their place: a bad verdict
// opens its own row, the row carries the host's own summary, it sits in the drawer, the drawer is open and
// pinned to the bottom edge, it stays in view with the page scrolled to its top and to its bottom, and
// `--chrome-h` still equals the sticky head's rendered height after the verdict.
//
// EXPECTED is the op row named here as a literal per verdict kind; ACTUAL is the built panel's DOM.
// All four verdict kinds are driven, because `topicsFor` lists each one separately.
{
  const VERDICTS = [
    { op: 'apply', msg: { type: 'apply-result', ok: false, headline: '⚠ 3 roles missed', summary: '3 roles could not be written: text.link.visited; …' } },
    { op: 'components', msg: { type: 'component-result', ok: false, completed: true, headline: '⚠ 648, 4 missed', summary: "set 'Button': 648 variants, ⚠ 4 misses (focus/ring/offset; icon/size; …)" } },
    { op: 'filesetup', msg: { type: 'file-setup-result', ok: false, headline: '✗ file setup failed', summary: 'file setup failed: a page named Components already exists' } },
    { op: 'styleguide', msg: { type: 'style-guide-result', ok: false, headline: '✗ style guide failed', summary: 'style guide failed: no variables in this file' } },
  ];
  ok(VERDICTS.length === 4, `#1890 the drawer arm drives all 4 verdict kinds (found ${VERDICTS.length})`);
  for (const { op, msg: v } of VERDICTS) {
    const { page, errors } = await openPanel();
    // On the plugin's one full page, Build style guides, whose head is the frame's sticky box (in the two panes it is
    // `display: contents`), at a short height. Until H12 (#2289) this arm sat on the old Style guide page, the last
    // layout that scrolled the document under the head; none does now (the panes and this page scroll on their own), so
    // the drawer's pin is read as geometry, its bottom edge on the window's, and the scrolled reads went with that page.
    await page.setViewportSize({ width: 1280, height: 480 });
    await openStyleGuides(page);
    // v6 lists an operation only once it has run, so before the verdict the drawer holds no such row: the
    // read below is of the row this verdict made.
    const before = await page.evaluate((k) => ({ drawer: !!document.querySelector('[data-p3="activity-drawer"]'), row: !!document.querySelector(`[data-p3="activity-op"][data-op="${k}"]`) }), op);
    ok(before.drawer && !before.row, `#1890 ${v.type}: the drawer is mounted and has no ${op} row before the verdict — drawer ${before.drawer}, row ${before.row}`);
    await post(page, v);
    await page.waitForFunction((k) => {
      const d = document.querySelector(`[data-p3="activity-op"][data-op="${k}"] [data-p3="op-summary"]`);
      return !!d && d.checkVisibility() && (d.textContent ?? '').length > 0;
    }, op, { timeout: 5000 }).catch(() => {});
    const seen = await page.evaluate((k) => {
      const row = document.querySelector(`[data-p3="activity-op"][data-op="${k}"]`);
      const detail = row?.querySelector('[data-p3="op-summary"]') ?? null;
      // The chrome is the frame's sticky head, located by its own hook. Whether this IS the region the
      // browser pins is read off its computed style, so a stale locator fails as "not the sticky region".
      const chrome = document.querySelector('[data-p3="frame-head"]');
      const cs = chrome ? getComputedStyle(chrome) : null;
      const style = document.documentElement.getAttribute('style');
      const drawer = document.querySelector('[data-p3="activity-drawer"]');
      const inView = () => { const r = detail?.getBoundingClientRect(); return !!r && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight; };
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, maxScroll);
      const atBottom = inView();
      window.scrollTo(0, 0);
      const atTop = inView();
      return {
        summary: detail?.textContent ?? null,
        finalChromeH: /--chrome-h:\s*([^;]+)/.exec(style ?? '')?.[1]?.trim() ?? null,
        chromeHeight: chrome ? chrome.offsetHeight : null,
        chromeSticky: !!cs && cs.position === 'sticky' && cs.display !== 'contents',
        drawerHolds: !!(drawer && detail && drawer.contains(detail)),
        drawerPinned: !!drawer && drawer.dataset.open === 'true' && Math.abs(drawer.getBoundingClientRect().bottom - window.innerHeight) <= 1,
        documentScrolls: maxScroll > 0, atTop, atBottom,
        detailOpen: !!detail && detail.checkVisibility(),
      };
    }, op);
    ok(seen.detailOpen, `#1890 ${v.type}: a bad verdict opens the ${op} row's summary`);
    ok((seen.summary ?? '').includes(v.summary.slice(0, 24)), `#1890 ${v.type}: the open row carries the host's own summary — read ${JSON.stringify(seen.summary)}`);
    ok(seen.drawerHolds && seen.drawerPinned,
      `#1890 ${v.type}: the summary opens in the Activity drawer, and the drawer is open and pinned to the bottom edge — in drawer ${seen.drawerHolds}, pinned and open ${seen.drawerPinned}`);
    ok(!seen.documentScrolls && seen.atTop,
      `#1890 ${v.type}: the open summary is in view, on a page that does not scroll the document (H12) — document scrolls ${seen.documentScrolls}, in view ${seen.atTop}`);
    ok(seen.chromeSticky && seen.finalChromeH === `${seen.chromeHeight}px`,
      `#1890 ${v.type}: --chrome-h equals the sticky chrome's rendered height after the verdict — --chrome-h ${seen.finalChromeH}, chrome ${seen.chromeHeight}px, sticky ${seen.chromeSticky}`);
    ok(errors.length === 0, `#1890 ${v.type}: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
}

// ── P2: a font list reaches the Type page ─────────────────────────────────────────────────────────
//
// `font-list` invalidates the `fonts` topic. Since UI redesign S6.2 its subscribers are the Type page's levers and
// preview (no legacy surface reads the host's fonts any more). No other suite sends it, so without this arm that
// subscription could go the way #1845's case did. What a designer reads is the typeface library's source line:
// "On this device" until the host answers, "In this Figma" once it has, since the verdicts under it are then
// Figma's own (docs/34 shape 16); and Add face becomes a type-ahead over the families the host listed (#113).
{
  const { page, errors } = await openPanel();
  await hooks.click(page.locator('[data-p3="tab-type"]'));
  await hooks.need(page, '[data-p3="type-levers"] [data-p3="typeface-source"]', { timeout: 5000 });
  const source = () => page.evaluate(() => document.querySelector('[data-p3="typeface-source"]')?.textContent ?? null);
  const before = await source();
  ok(before === 'On this device', `the typeface library reads "On this device" before the host sends its fonts — read ${JSON.stringify(before)}`);
  await post(page, { type: 'font-list', families: ['Inter', 'Roboto', 'Playfair Display'], styles: [18, 36, 12] });
  await page.waitForFunction(() => document.querySelector('[data-p3="typeface-source"]')?.textContent === 'In this Figma', null, { timeout: 5000 }).catch(() => {});
  const after = await source();
  ok(after === 'In this Figma', `a font list from the host repaints the Type page — the library reads "In this Figma", read ${JSON.stringify(after)}`);
  const combo = await page.evaluate(() => {
    const f = document.querySelector('[data-p3="face-add-input"]');
    f?.focus();
    return { role: f?.getAttribute('role') ?? null, options: [...document.querySelectorAll('[data-p3="face-font-option"]')].map((o) => o.textContent) };
  });
  ok(combo.role === 'combobox' && JSON.stringify(combo.options) === JSON.stringify(['Inter', 'Roboto', 'Playfair Display']),
    `with the host's font list, Add face is a type-ahead over its families (#113) — role ${combo.role}, options ${JSON.stringify(combo.options)}`);
  ok(errors.length === 0, `font list: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── #1989: a restored brand the engine refuses in resolution turns Apply Theme and Prune stale off ──────
//
// The host's restore check only asks `brandTheme` to accept the blob, so a brand with a ground override
// (refused in resolution since #956) still loads: the rebuild fails and `lastGoodInput` stays on the boot
// demo, which is what both writes post. Before #1989 Apply stayed live and wrote the demo over the file's
// brand. EXPECTED is written here: the refused role, the words on screen, and the two brand ids. ACTUAL is
// the built panel's DOM and the UI → plugin messages caught on this window.
//
// The positive control at the end restores a brand that resolves and clicks Apply again: it must post once,
// and post THAT brand. Without it, a listener that caught nothing would read as "posts nothing".
//
// MUTATIONS, each run against the built bundle and each failing here by name:
//   · the restore dispatch never setting `restoreRefusal` → `#1989 after a refused restore, Apply Theme and
//     Prune stale post nothing …` (and the disabled and bar arms).
//   · the disabled state dropped (the bar's Apply and the menu's Prune) → `#1989 after a refused restore, Apply Theme
//     (the bar's) and Prune stale (the Figma menu's) are disabled …`.
//   · the `apply` item put back into the Figma menu (#2178) → `#2178 the Figma menu lists no Apply Theme …` and
//     `#2178 the Figma menu's items read Prune stale, Set up file, …`.
//   · the confirm dialog's Delete left enabled → `#1989 a host prune preview … its Delete is disabled` and
//     `#1989 … post nothing to the plugin, the confirm dialog's Delete included`.
//   There is no guard in `runApply`/`runPrune` to mutate: their only callers are the disabled controls, so a
//   guard there could never fire (measured: removing one left this arm green), and it was not kept.
//   · the bar's restore copy reverted to "That change didn't apply" → `#1989 the error bar says the file's brand …`.
{
  const base = { root: 'rf', modes: ['light'], primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true } };
  const REFUSED = { ...base, id: 'refused-brand', overrides: { light: { 'background.secondary': { palette: 'neutral', step: '200' } } } };
  const GOOD = { ...base, id: 'good-brand' };
  const { page, errors } = await openPanel();
  await page.evaluate(() => {
    window.__writes = [];
    window.addEventListener('message', (e) => {
      const m = e.data && e.data.pluginMessage;
      if (m && (m.type === 'apply-theme' || m.type === 'prune')) window.__writes.push({ type: m.type, id: m.input?.id ?? null });
    });
  });
  const writes = () => page.evaluate(() => window.__writes.slice());
  const read = () => page.evaluate(() => {
    const bar = document.querySelector('[data-p3="error-bar"]');
    return {
      brand: document.querySelector('[data-p3="brand-switcher"]')?.textContent ?? null,
      bar: bar && !bar.hidden ? bar.textContent : null,
      applyDisabled: document.querySelector('[data-p3="apply-to-figma"]')?.disabled ?? null,
      menuPrune: document.querySelector('[data-p3="figma-option-prune"]')?.disabled ?? null,
      // #2178: every item the open Figma menu lists, by hook and label.
      menuItems: [...document.querySelectorAll('[data-p3="figma-menu"] [role="menuitem"]')].map((n) => [n.getAttribute('data-p3'), (n.querySelector('[data-p3="label-idle"]') ?? n).textContent.replace(/^…\s*/, '').trim()]),
    };
  });

  await post(page, { type: 'restore-input', input: REFUSED });
  await page.waitForFunction(() => /didn't resolve/.test(document.querySelector('[data-p3="error-bar"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
  await hooks.click(page.locator('[data-p3="figma-open"]'), { timeout: 4000 }).catch(() => {});
  const off = await read();
  ok((off.brand ?? '').includes('refused-brand'),
    `#1989 the refused brand is the one loaded (the restore was not dropped) — brand switcher reads ${JSON.stringify(off.brand)}`);
  ok((off.bar ?? '').includes("This file's saved brand didn't resolve") && (off.bar ?? '').includes("'background.secondary'")
    && (off.bar ?? '').includes('Apply Theme and Prune stale are off'),
    `#1989 the error bar says the file's brand did not resolve, names the refused role, and says why the writes are off — read ${JSON.stringify((off.bar ?? '').slice(0, 160))}`);
  ok(off.applyDisabled === true && off.menuPrune === true,
    `#1989 after a refused restore, Apply Theme (the bar's) and Prune stale (the Figma menu's) are disabled — bar ${off.applyDisabled}, menu prune ${off.menuPrune}`);
  // #2178 (owner decision, 2026-10-05): the Figma menu does not list Apply Theme; the bar's filled button is its one
  // control. EXPECTED is the four labels, literal; the proof the probe can see the menu is Prune stale among them.
  hooks.absent(ok, { seen: off.menuItems.some(([hk]) => hk === 'figma-option-prune'), state: 'the Figma menu open with Prune stale listed' },
    !off.menuItems.some(([hk, l]) => /apply/i.test(`${hk} ${l}`)),
    `#2178 the Figma menu lists no Apply Theme — items ${JSON.stringify(off.menuItems)}`);
  ok(JSON.stringify(off.menuItems.map(([, l]) => l)) === JSON.stringify(['Prune stale', 'Set up file', 'Build set…', 'Build style guides…']),
    `#2178 the Figma menu's items read Prune stale, Set up file, Build set…, Build style guides… — read ${JSON.stringify(off.menuItems.map(([, l]) => l))}`);

  // Every way a designer reaches the two writes, forced past the disabled state, so the guard behind it is measured too.
  await hooks.click(page.locator('[data-p3="figma-option-prune"]'), { force: true, timeout: 4000 }).catch(() => {});
  await hooks.click(page.locator('[data-p3="apply-to-figma"]'), { force: true, timeout: 4000 }).catch(() => {});
  // The prune dialog is the one route the disabled state does not cover: a preview from the host opens it
  // whatever the Prune button's state. So one is sent, and its Delete is clicked.
  await post(page, { type: 'prune-result', ok: true, applied: false, count: 3, summary: 'Would remove 3 items: 3 variables.' });
  await page.waitForFunction(() => !!document.querySelector('[data-p3="prune-dialog"]'), null, { timeout: 5000 }).catch(() => {});
  const dlg = await page.evaluate(() => ({
    open: !!document.querySelector('[data-p3="prune-dialog"]'),
    deleteDisabled: document.querySelector('[data-p3="dialog-confirm"]')?.disabled ?? null,
  }));
  ok(dlg.open && dlg.deleteDisabled === true,
    `#1989 a host prune preview still opens the confirm dialog after a refused restore, and its Delete is disabled — open ${dlg.open}, delete disabled ${dlg.deleteDisabled}`);
  await hooks.click(page.locator('[data-p3="dialog-confirm"]'), { force: true, timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
  const none = await writes();
  ok(none.length === 0, `#1989 after a refused restore, Apply Theme and Prune stale post nothing to the plugin, the confirm dialog's Delete included — posted ${JSON.stringify(none)}`);
  // Closed by its own Cancel, so the control below clicks Apply rather than an open modal.
  await hooks.click(page.locator('[data-p3="prune-dialog"] button', { hasText: 'Cancel' }), { timeout: 4000 });

  // CONTROL: a brand that resolves turns both back on, and Apply posts that brand, once.
  await post(page, { type: 'restore-input', input: GOOD });
  await page.waitForFunction(() => document.querySelector('[data-p3="apply-to-figma"]')?.disabled === false, null, { timeout: 5000 }).catch(() => {});
  const on = await read();
  ok(on.bar === null && on.applyDisabled === false,
    `#1989 control: a restore that resolves clears the bar and turns Apply Theme back on — bar ${JSON.stringify(on.bar)}, disabled ${on.applyDisabled}`);
  await hooks.click(page.locator('[data-p3="apply-to-figma"]'), { timeout: 4000 }).catch(() => {});
  await page.waitForFunction(() => window.__writes.length > 0, null, { timeout: 3000 }).catch(() => {});
  const posted = await writes();
  ok(posted.length === 1 && posted[0].type === 'apply-theme' && posted[0].id === 'good-brand',
    `#1989 control: Apply Theme then posts once, and posts the restored brand rather than the demo — posted ${JSON.stringify(posted)}`);
  ok(errors.length === 0, `#1989 refused restore: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── #1994: every failed restore keeps the writes off, and Export rescues the file's brand ───────────────
//
// #1989 turned Apply Theme, Prune stale and the prune dialog's Delete off for a restore the engine refuses
// in resolution. Two other failures left the boot demo loaded with the writes live: a blob `brandTheme`
// rejects (dropped silently) and one the host cannot read (`restore-input-error`, #480). In both, the DEMO is
// what is loaded and its edits rebuild cleanly, so a demo edit must not turn the writes back on; only a brand
// LOADING does. Export design.md in a failed state writes the file's brand that failed, or is off with the
// reason when nothing readable arrived.
//
// EXPECTED is written here: brand ids, the words on screen, the mode the rejected blob names. ACTUAL is the
// built panel's DOM, the UI → plugin messages, and the downloaded file. Each scenario has its own panel.
//
// MUTATIONS, each run against the built bundle and each failing here by name:
//   · the `rejected` dispatch removed → `#1994 rejected: … Apply Theme, Prune stale and Delete are off …`
//     and the bar and no-post arms.
//   · the `unreadable` dispatch removed → `#1994 unreadable: …` the same three.
//   · `rejected`/`unreadable` cleared by a rebuild instead of a load → `#1994 rejected: a demo edit does not
//     turn the writes back on …`.
//   · Export back to `lastGoodInput` → `#1994 rejected: Export design.md writes the file's brand that failed …`.
//   · Export left enabled with nothing readable → `#1994 unreadable: Export design.md is off …`.
//   · the "nothing chosen yet" guard removed → `#1994 guard: an unreadable restore after a brand was chosen …`.
//   · Design tokens left enabled after a failed restore (#2007) → `#2007 <kind>: Export's Design tokens is off …`,
//     one per failure.
//   · a load not clearing `rejected` → `#2007 rejected: choosing an example … turns the writes back on …`.
//   · `rejected`/`unreadable` cleared on any `origin` change again (so "New brand" clears them) → `#2007 New brand: …`.
//   · the late-restore guard applied to `unreadable` only → `#2007 guard: a rejected restore after a brand was chosen …`.
//   · `rejected`'s bar back to "until a brand resolves", or the tooltip back to the old wording → `#2007 rejected: the
//     bar says the writes are off "until a brand loads" …`.
{
  const base = { root: 'rf', modes: ['light'], primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.006, auto: true } };
  const capture = (page) => page.evaluate(() => {
    window.__writes = [];
    window.addEventListener('message', (e) => {
      const m = e.data && e.data.pluginMessage;
      if (m && (m.type === 'apply-theme' || m.type === 'prune')) window.__writes.push({ type: m.type, id: m.input?.id ?? null });
    });
  });
  const writes = (page) => page.evaluate(() => window.__writes.slice());
  const read = async (page) => {
    await hooks.click(page.locator('[data-p3="figma-open"]'), { timeout: 4000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const bar = document.querySelector('[data-p3="error-bar"]');
      return {
        bar: bar && !bar.hidden ? bar.textContent : null,
        apply: document.querySelector('[data-p3="apply-to-figma"]')?.disabled ?? null,
        menuPrune: document.querySelector('[data-p3="figma-option-prune"]')?.disabled ?? null,
      };
    });
    await page.keyboard.press('Escape');
    return r;
  };
  const allOff = (r) => r.apply === true && r.menuPrune === true;
  const allOn = (r) => r.apply === false && r.menuPrune === false;
  /** Every way to the two writes, forced, plus a host prune preview's Delete; returns what was posted. */
  const tryWrites = async (page) => {
    await post(page, { type: 'prune-result', ok: true, applied: false, count: 2, summary: 'Would remove 2 items: 2 variables.' });
    await page.waitForFunction(() => !!document.querySelector('[data-p3="prune-dialog"]'), null, { timeout: 5000 }).catch(() => {});
    const deleteOff = await page.evaluate(() => document.querySelector('[data-p3="dialog-confirm"]')?.disabled ?? null);
    await hooks.click(page.locator('[data-p3="dialog-confirm"]'), { force: true, timeout: 4000 }).catch(() => {});
    await hooks.click(page.locator('[data-p3="prune-dialog"] button', { hasText: 'Cancel' }), { timeout: 4000 });
    await hooks.click(page.locator('[data-p3="figma-open"]'), { timeout: 4000 }).catch(() => {});
    await hooks.click(page.locator('[data-p3="figma-option-prune"]'), { force: true, timeout: 4000 }).catch(() => {});
    await page.keyboard.press('Escape');
    await hooks.click(page.locator('[data-p3="apply-to-figma"]'), { force: true, timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
    return { deleteOff, posted: await writes(page) };
  };
  /** Open Export on Brand brief: the Download button's state, the note, and (if enabled) the file. */
  const exportBrief = async (page) => {
    await hooks.click(page.locator('[data-p3="export-open"]'), { timeout: 4000 }).catch(() => {});
    // Anchored: the dialog's import slot reads "↑ Brand brief…" too, and a loose match is refused as ambiguous.
    await hooks.click(page.locator('[data-p3="export-dialog"] button', { hasText: /^Brand brief$/ }), { timeout: 4000 }).catch(() => {});
    const st = await page.evaluate(() => ({
      off: document.querySelector('[data-p3="export-dialog"] [data-p3="dialog-confirm"]')?.disabled ?? null,
      note: document.querySelector('[data-p3="export-restore-note"]')?.textContent ?? null,
    }));
    let file = null;
    if (st.off === false) {
      const [dl] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'), { timeout: 4000 }).catch(() => {}),
      ]);
      file = dl ? { name: dl.suggestedFilename(), text: await readFile(await dl.path(), 'utf8').catch(() => '') } : null;
    } else {
      // Closed by its Cancel. (Escape used to come first, so this click found no dialog, and a `.catch` hid that: the
      // #2124 review's finding 3b.)
      await hooks.click(page.locator('[data-p3="export-dialog"] button', { hasText: 'Cancel' }), { timeout: 4000 });
    }
    return { ...st, file };
  };
  /** Open Export on Design tokens and FORCE its Download: its state, the note, and whether a file arrived.
   *  Forced, so a disabled button that still downloaded would be caught rather than skipped. */
  const exportTokensTry = async (page) => {
    await hooks.click(page.locator('[data-p3="export-open"]'), { timeout: 4000 }).catch(() => {});
    await hooks.click(page.locator('[data-p3="export-dialog"] button', { hasText: /^Design tokens$/ }), { timeout: 4000 }).catch(() => {});
    const st = await page.evaluate(() => ({
      off: document.querySelector('[data-p3="export-dialog"] [data-p3="dialog-confirm"]')?.disabled ?? null,
      note: document.querySelector('[data-p3="export-restore-note"]')?.textContent ?? null,
    }));
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 2500 }).catch(() => null),
      hooks.click(page.locator('[data-p3="export-dialog"] [data-p3="dialog-confirm"]'), { force: true, timeout: 4000 }).catch(() => {}),
    ]);
    if (await page.locator('[data-p3="export-dialog"]').count()) await hooks.click(page.locator('[data-p3="export-dialog"] button', { hasText: /^Cancel$/ }), { timeout: 4000 });
    return { ...st, file: dl ? dl.suggestedFilename() : null };
  };
  const tokensOff = (t) => t.off === true && t.file === null && (t.note ?? '').includes("these tokens would be the demo brand's");
  /** Choose an example from the brand menu, answering the overwrite confirm when edits are at risk. */
  const chooseExample = async (page) => {
    await hooks.click(page.locator('[data-p3="brand-switcher"]'), { timeout: 4000 }).catch(() => {});
    const name = await page.locator('[data-p3="brand-menu-example"]').first().textContent().catch(() => null);
    await hooks.click(page.locator('[data-p3="brand-menu-example"]').first(), { timeout: 4000 }).catch(() => {});
    // After a demo edit there are edits to lose, so the choice asks first (#1033); answering it is the load.
    if (await page.locator('[data-p3="overwrite-replace"]').count()) await hooks.click(page.locator('[data-p3="overwrite-replace"]'), { timeout: 4000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector('[data-p3="apply-to-figma"]')?.disabled === false, null, { timeout: 5000 }).catch(() => {});
    return (name ?? '').trim();
  };

  // 1. A brand refused in resolution (#1989's case), turned back on by an EXAMPLE CHOICE, menu Prune included.
  {
    const { page, errors } = await openPanel();
    await capture(page);
    await post(page, { type: 'restore-input', input: { ...base, id: 'refused-brand', overrides: { light: { 'background.secondary': { palette: 'neutral', step: '200' } } } } });
    await page.waitForFunction(() => /didn't resolve/.test(document.querySelector('[data-p3="error-bar"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    const off = await read(page);
    ok(allOff(off), `#1994 unresolved: Apply Theme and menu Prune are off after the refused restore — ${JSON.stringify(off)}`);
    const ex = await exportBrief(page);
    ok(ex.off === false && !!ex.file && ex.file.name === 'refused-brand.design.md' && ex.file.text.includes('background.secondary'),
      `#1994 unresolved: Export design.md writes the file's brand that failed, not the demo — file ${JSON.stringify(ex.file?.name ?? null)}, keeps the override ${!!ex.file?.text.includes('background.secondary')}`);
    const tk = await exportTokensTry(page);
    ok(tokensOff(tk), `#2007 unresolved: Export's Design tokens is off, with the reason, and a forced click downloads nothing — ${JSON.stringify(tk)}`);
    const example = await chooseExample(page);
    const on = await read(page);
    ok(on.bar === null && allOn(on),
      `#1994 unresolved: choosing an example from the brand menu turns Apply Theme and menu Prune back on, and clears the bar — ${JSON.stringify(on)}`);
    await hooks.click(page.locator('[data-p3="apply-to-figma"]'), { timeout: 4000 }).catch(() => {});
    await page.waitForFunction(() => window.__writes.length > 0, null, { timeout: 3000 }).catch(() => {});
    const posted = await writes(page);
    ok(posted.length === 1 && posted[0].type === 'apply-theme' && posted[0].id === example,
      `#1994 unresolved: after the example choice, Apply posts that example once — chose ${JSON.stringify(example)}, posted ${JSON.stringify(posted)}`);
    ok(errors.length === 0, `#1994 unresolved: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }

  // 2. A blob `brandTheme` rejects: dropped silently before.
  {
    const { page, errors } = await openPanel();
    await capture(page);
    await post(page, { type: 'restore-input', input: { ...base, id: 'rejected-brand', modes: ['light', 'bogus'] } });
    await page.waitForFunction(() => /didn't resolve/.test(document.querySelector('[data-p3="error-bar"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    const off = await read(page);
    ok((off.bar ?? '').includes("This file's saved brand didn't resolve") && (off.bar ?? '').includes("'bogus'"),
      `#1994 rejected: the error bar says the file's brand did not resolve and names the refused mode — read ${JSON.stringify((off.bar ?? '').slice(0, 140))}`);
    // Owner copy by kind: only a LOAD ends this one, so the bar says "loads", and the tooltip is the one wording.
    const hint = await page.evaluate(() => document.querySelector('[data-p3="apply-to-figma"]')?.title ?? null);
    ok((off.bar ?? '').includes('are off until a brand loads.') && hint === "Off until a brand loads. This file's saved brand didn't open, and writing now would put the demo brand over it.",
      `#2007 rejected: the bar says the writes are off "until a brand loads", and the tooltip is the one approved wording — bar ${JSON.stringify((off.bar ?? '').slice(-110))}, tooltip ${JSON.stringify(hint)}`);
    ok(allOff(off), `#1994 rejected: Apply Theme, Prune stale and Delete are off — ${JSON.stringify(off)}`);
    const t = await tryWrites(page);
    ok(t.deleteOff === true && t.posted.length === 0,
      `#1994 rejected: nothing reaches the plugin, the prune dialog's Delete included — Delete off ${t.deleteOff}, posted ${JSON.stringify(t.posted)}`);
    // A demo EDIT rebuilds cleanly, and must not turn the writes back on: only a brand loading does.
    // The tempo chips moved from the legacy Motion page to the Depth & motion tab in UI redesign S9.2.
    await hooks.click(page.locator('[data-p3="tab-depth"]'), { timeout: 4000 }).catch(() => {});
    const tempo = page.locator('[data-p3="lever-motion-personality-tempo"] [role="radio"][aria-checked="false"]').first();
    const edited = await tempo.count() > 0;
    if (edited) await hooks.click(tempo, { force: true, timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    const after = await read(page);
    ok(edited && allOff(after),
      `#1994 rejected: a demo edit does not turn the writes back on — edited ${edited}, ${JSON.stringify(after)}`);
    const ex = await exportBrief(page);
    ok(ex.off === false && !!ex.file && ex.file.name === 'rejected-brand.design.md' && ex.file.text.includes('bogus')
      && (ex.note ?? '').includes("This is the file's saved brand"),
      `#1994 rejected: Export design.md writes the file's brand that failed, and says so — file ${JSON.stringify(ex.file?.name ?? null)}, names bogus ${!!ex.file?.text.includes('bogus')}, note ${JSON.stringify(ex.note)}`);
    const tk = await exportTokensTry(page);
    ok(tokensOff(tk), `#2007 rejected: Export's Design tokens is off, with the reason, and a forced click downloads nothing — ${JSON.stringify(tk)}`);
    // A LOAD is what turns them back on (review of #2007: untested for this kind until now).
    const example = await chooseExample(page);
    const on = await read(page);
    ok(on.bar === null && allOn(on), `#2007 rejected: choosing an example (${JSON.stringify(example)}) turns the writes back on and clears the bar — ${JSON.stringify(on)}`);
    await page.evaluate(() => { window.__writes = []; });
    await hooks.click(page.locator('[data-p3="apply-to-figma"]'), { timeout: 4000 }).catch(() => {});
    await page.waitForFunction(() => window.__writes.length > 0, null, { timeout: 3000 }).catch(() => {});
    const posted = await writes(page);
    ok(posted.length === 1 && posted[0].type === 'apply-theme' && posted[0].id === example,
      `#2007 rejected: after the example choice, Apply posts that example once — chose ${JSON.stringify(example)}, posted ${JSON.stringify(posted)}`);
    ok(errors.length === 0, `#1994 rejected: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }

  // 3. A blob the host cannot read (#480).
  {
    const { page, errors } = await openPanel();
    await capture(page);
    await post(page, { type: 'restore-input-error', message: 'saved with a newer Prism3 (v9); this plugin reads up to v3.' });
    await page.waitForFunction(() => /couldn't be read/.test(document.querySelector('[data-p3="error-bar"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    const off = await read(page);
    ok((off.bar ?? '').includes("This file's saved brand couldn't be read") && (off.bar ?? '').includes('newer Prism3 (v9)'),
      `#1994 unreadable: the error bar says the file's brand couldn't be read, with the host's reason — read ${JSON.stringify((off.bar ?? '').slice(0, 140))}`);
    ok(allOff(off), `#1994 unreadable: Apply Theme, Prune stale and Delete are off — ${JSON.stringify(off)}`);
    const t = await tryWrites(page);
    ok(t.deleteOff === true && t.posted.length === 0,
      `#1994 unreadable: nothing reaches the plugin, the prune dialog's Delete included — Delete off ${t.deleteOff}, posted ${JSON.stringify(t.posted)}`);
    const ex = await exportBrief(page);
    ok(ex.off === true && (ex.note ?? '').includes('Nothing to export'),
      `#1994 unreadable: Export design.md is off, with the reason — Download disabled ${ex.off}, note ${JSON.stringify(ex.note)}`);
    const tk = await exportTokensTry(page);
    ok(tokensOff(tk), `#2007 unreadable: Export's Design tokens is off, with the reason, and a forced click downloads nothing — ${JSON.stringify(tk)}`);
    const example = await chooseExample(page);
    const on = await read(page);
    ok(on.bar === null && allOn(on), `#1994 unreadable: choosing an example (${JSON.stringify(example)}) turns the writes back on — ${JSON.stringify(on)}`);
    ok(errors.length === 0, `#1994 unreadable: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }

  // 5. "New brand" is not a load (review of #2007). It puts the start screen up and loads nothing, so the
  //    failure must survive it: the start screen keeps the error bar saying why. Export is not on the start
  //    screen, and every way off it loads a brand, which is what then ends the failure (checked last).
  {
    const { page, errors } = await openPanel();
    await capture(page);
    await post(page, { type: 'restore-input', input: { ...base, id: 'rejected-brand', modes: ['light', 'bogus'] } });
    await page.waitForFunction(() => /didn't resolve/.test(document.querySelector('[data-p3="error-bar"]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    await hooks.click(page.locator('[data-p3="brand-switcher"]'), { timeout: 4000 }).catch(() => {});
    await hooks.click(page.locator('[data-p3="brand-menu-new"]'), { timeout: 4000 }).catch(() => {});
    await hooks.need(page, '[data-p3="start-screen"]', { timeout: 5000 }).catch(() => {});
    const onStart = await page.evaluate(() => {
      const b = document.querySelector('[data-p3="error-bar"]');
      return { start: !!document.querySelector('[data-p3="start-screen"]'), bar: b && b.checkVisibility() ? b.textContent : null };
    });
    ok(onStart.start && (onStart.bar ?? '').includes("This file's saved brand didn't resolve"),
      `#2007 New brand: the start screen still says the file's brand did not resolve — "New brand" loads nothing, so the failure stands — start screen ${onStart.start}, bar ${JSON.stringify((onStart.bar ?? '').slice(0, 80))}`);
    await hooks.click(page.locator('[data-p3="start-example"]').first(), { timeout: 4000 }).catch(() => {});
    await page.waitForFunction(() => document.querySelector('[data-p3="apply-to-figma"]')?.disabled === false, null, { timeout: 5000 }).catch(() => {});
    const on = await read(page);
    ok(on.bar === null && allOn(on), `#2007 New brand: leaving the start screen with an example is a load, and turns the writes back on — ${JSON.stringify(on)}`);
    ok(errors.length === 0, `#2007 New brand: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }

  // 4. The guard: once a designer has chosen a brand, a late unreadable restore is not a reason to turn
  //    the writes off. They post the chosen brand, not the demo.
  {
    const { page, errors } = await openPanel();
    const example = await chooseExample(page);
    await post(page, { type: 'restore-input-error', message: 'saved with a newer Prism3 (v9); this plugin reads up to v3.' });
    await page.waitForTimeout(500);
    const st = await read(page);
    ok(!!example && allOn(st) && !/couldn't be read/.test(st.bar ?? ''),
      `#1994 guard: an unreadable restore after a brand was chosen leaves the writes on — chose ${JSON.stringify(example)}, ${JSON.stringify(st)}`);
    await post(page, { type: 'restore-input', input: { ...base, id: 'late-rejected', modes: ['light', 'bogus'] } });
    await page.waitForTimeout(500);
    const st2 = await read(page);
    ok(allOn(st2) && !/didn't resolve/.test(st2.bar ?? ''),
      `#2007 guard: a rejected restore after a brand was chosen leaves the writes on too — ${JSON.stringify(st2)}`);
    // CONTROL for the no-download arms above: with nothing failed, the same forced click does download.
    const tk = await exportTokensTry(page);
    ok(tk.off === false && !!tk.file && tk.note === null,
      `#2007 control: with no failed restore, Design tokens is on and the same click downloads a file — ${JSON.stringify(tk)}`);
    ok(errors.length === 0, `#1994 guard: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
}

// ── #2177: a run's details read one line per item, console-style ────────────────────────────────────
//
// The owner's backlog (2026-10-05): a run's details in the Activity drawer read as one long wrapping string. They now read
// one line per item: the items the host's summary already joins (an axis or a note of Apply, the set and each note of a
// build, a table or a note of the style guide), each in the chrome's mono font, a long one wrapping inside the drawer, and
// read in order as a list. The plugin sends the items beside the summary (`lines`, `fromClauses` in `apply-summary.ts`);
// the drawer never re-parses the prose.
//
// INDEPENDENCE (docs/34). EXPECTED is the item list authored here per run kind, in the real builders' shapes and words;
// the posted `summary` is those items joined by the kind's own separators, computed here too. ACTUAL is the built panel's
// DOM (the row's line elements, in order, and each one's computed font) and the browser's accessibility tree (CDP
// `getPartialAXTree`). The mono font's expected value is the chrome's own token, `--p3-font-mono`, read off the document,
// never the line's class. Neither side reads `activity.ts`. That the agent link's verdict is unchanged is the main
// thread's to prove, so it is `test-agent-link.ts`'s `#2177` arms, through the real `main.ts`.
//
// Run at 1280 and at 380 (the full-pane sheet), where the long line has to wrap. Mutations, each against the built
// bundle, each failing by name:
//   · the lines joined back into one → `#2177 <kind> <w>: N items show as N lines, in order, in the host's words`
//   · the last line dropped → the same arm (N-1 lines)
//   · one line not mono → `#2177 <kind> <w>: every line is set in the chrome's mono font`
//   · (#2459) the tier wait removed, on a bundle whose tier lands 400 ms after its ResizeObserver callback → `#2177
//     <kind> 380: every line stays inside the drawer, …; tier wide, body 220.4px wide …` (the CI flake's message)
//   · (#2459) the tier forced to `wide` in the bundle → `#2177 <kind> 380: the frame reaches the narrow tier before the
//     drawer is measured — read wide`
{
  const BUILT = 'Built from tree-a1b2c3d4 at 2026-10-06T09:00:00Z.';
  /** Per run kind: the posted verdict's items, and the separator each item after the first is joined by. */
  const KINDS = [
    { op: 'apply', type: 'apply-result', extra: {}, headline: '⚠ 4 misses', items: [
      ['', 'palette 118 (+0)'], [', ', 'color 412 (+3)'], [', ', 'dims/layout 4 collections (+0)'],
      [', ', 'styles 6 effects (+0) / 2 gradients (+0, 4 stops bound) / 3 grid styles (+0)'],
      [', ', 'type 9 fonts loaded / 40 font vars (+0) / 22 text styles (+0)'], [', ', '1630 bindings'], [', ', '4 misses'],
      [', ', '⚠ 2 orphaned variables not in the plan (color: 2) — likely renames; nothing was deleted'], ['. ', BUILT],
    ] },
    { op: 'components', type: 'component-result', extra: { completed: true }, headline: '⚠ 648, 4 missed', items: [
      ['', "set 'Button': 648 variants (+0 built, 648 already present), grid 24×27, 2210×1890px, axes size/variant/state/icon, properties label/leading-icon/trailing-icon, 1296 refs across 648 members"],
      [', ', '⚠ 4 misses (focus/ring/offset; icon/size; label/weight; …)'], ['. ', 'Also built: icon (2 misses)'],
      ['. ', 'Header added to ↳ Buttons'], ['. ', BUILT],
    ] },
    { op: 'styleguide', type: 'style-guide-result', extra: {}, headline: '⚠ 4 drawn, 1 failed', items: [
      ['', 'Primary: Figma refused the write'], ['. ', '3 tables created (Palette, Color roles, Spacing)'],
      ['. ', '1 table updated in place — Radius: 2 changed'],
      ['. ', '4 tables skipped — this file has no ↳ Semantic tokens page, and Set up file adds it'], ['. ', BUILT],
    ] },
  ];
  ok(KINDS.length === 3, `#2177 the arm drives every run kind the issue names: Apply, a component build, the style guide (found ${KINDS.length})`);
  for (const w of [1280, 380]) for (const k of KINDS) {
    const items = k.items.map(([, t]) => t);
    const summary = k.items.map(([sep, t], i) => (i === 0 ? t : sep + t)).join('');
    const { page, errors } = await openPanel();
    await page.setViewportSize({ width: w, height: w === 380 ? 640 : 900 });
    await post(page, { type: k.type, ok: false, headline: k.headline, summary, ...k.extra, lines: items });
    const sel = `[data-p3="activity-op"][data-op="${k.op}"] [data-p3="op-summary"]`;
    // #2459: measure only once the layout under test is the one drawn. The tier (`data-w`) is set by the frame's
    // ResizeObserver, a rendering step after the resize, so the posted row being visible says nothing about whether
    // the frame has left the wide grid; at 380 the bad verdict also opens the drawer, which the narrow tier draws as the
    // full-pane sheet. Each wait is one condition, so the tier is waited on here and nowhere else, and a wait that does
    // not arrive fails by name instead of letting the wrong layout be measured.
    const tier = w === 380 ? 'narrow' : 'wide';   // typed here: 380 is under the narrow tier's 560 ceiling, 1280 over it
    const tierSet = await page.waitForFunction((t) => document.querySelector('[data-p3="frame"]')?.dataset.w === t, tier, { timeout: 5000 }).then(() => true, () => false);
    ok(tierSet, `#2177 ${k.op} ${w}: the frame reaches the ${tier} tier before the drawer is measured — read ${await page.evaluate(() => document.querySelector('[data-p3="frame"]')?.dataset.w)}`);
    if (w === 380) {
      const sheet = await page.waitForFunction(() => !!document.querySelector('[data-p3="frame"] > [data-p3="activity-drawer"][data-open="true"]'), null, { timeout: 5000 }).then(() => true, () => false);
      ok(sheet, `#2177 ${k.op} ${w}: the bad verdict opens the drawer, the full-pane sheet at this tier — drawer open ${await page.evaluate(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open)}`);
    }
    const shown = await page.waitForFunction((s) => document.querySelector(s)?.checkVisibility() === true, sel, { timeout: 5000 }).then(() => true, () => false);
    ok(shown, `#2177 ${k.op} ${w}: the run's details are shown in the drawer`);
    const seen = await page.evaluate((s) => {
      const list = document.querySelector(s);
      const lines = list ? [...list.children] : [];
      const body = document.querySelector('[data-p3="activity-body"]');
      const b = body?.getBoundingClientRect();
      const mono = getComputedStyle(document.documentElement).getPropertyValue('--p3-font-mono').trim();
      const r1 = (n) => Math.round(n * 10) / 10;
      return {
        // What the containment check reads, carried into its label so a failure names its own layout (#2459).
        tier: document.querySelector('[data-p3="frame"]')?.dataset.w ?? null,
        bodyWidth: b ? r1(b.width) : null,
        bodyRight: b ? r1(b.right) : null,
        scrollWidth: body?.scrollWidth ?? null,
        clientWidth: body?.clientWidth ?? null,
        widestRight: lines.length ? r1(Math.max(...lines.map((n) => n.getBoundingClientRect().right))) : null,
        texts: lines.map((n) => n.textContent),
        fonts: lines.map((n) => getComputedStyle(n).fontFamily),
        mono,
        // Each line inside the drawer's body, which scrolls no wider than it is.
        inside: !!b && lines.length > 0 && lines.every((n) => { const r = n.getBoundingClientRect(); return r.left >= b.left - 0.5 && r.right <= b.right + 0.5; }),
        noSideScroll: !!body && body.scrollWidth <= body.clientWidth,
        wraps: lines.some((n) => n.getBoundingClientRect().height > 1.5 * parseFloat(getComputedStyle(n).lineHeight || '0')),
      };
    }, sel);
    ok(JSON.stringify(seen.texts) === JSON.stringify(items),
      `#2177 ${k.op} ${w}: ${items.length} items show as ${items.length} lines, in order, in the host's words — read ${seen.texts.length} lines ${JSON.stringify(seen.texts.map((t) => (t ?? '').slice(0, 40)))}`);
    ok(seen.mono !== '' && seen.fonts.length > 0 && seen.fonts.every((f) => f === seen.mono),
      `#2177 ${k.op} ${w}: every line is set in the chrome's mono font (${seen.mono}) — read ${JSON.stringify([...new Set(seen.fonts)])}`);
    ok(seen.inside && seen.noSideScroll,
      `#2177 ${k.op} ${w}: every line stays inside the drawer, which does not scroll sideways — inside ${seen.inside}, no side scroll ${seen.noSideScroll}; `
      + `tier ${seen.tier}, body ${seen.bodyWidth}px wide (right edge ${seen.bodyRight}), scrollWidth ${seen.scrollWidth} of clientWidth ${seen.clientWidth}, `
      + `widest line's right edge ${seen.widestRight}`);
    // The longest line (the set's, at 380 Apply's styles line too) is longer than the drawer is wide there.
    if (w === 380) ok(seen.wraps, `#2177 ${k.op} ${w}: a line longer than the drawer wraps within it — wrapped ${seen.wraps}`);
    // The browser's own reading: a list whose items are the lines, in order.
    const cdp = await page.context().newCDPSession(page);
    let ax = null;
    try {
      await cdp.send('Accessibility.enable');
      const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const role = nodes.find((n) => !n.ignored)?.role?.value ?? null;
      const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: `${sel} > *` });
      const read = [];
      for (const id of nodeIds) {
        const t = (await cdp.send('Accessibility.getPartialAXTree', { nodeId: id, fetchRelatives: true })).nodes;
        const me = t.find((n) => n.backendDOMNodeId !== undefined && !n.ignored && n.role?.value === 'listitem');
        const words = t.filter((n) => n.parentId === me?.nodeId && n.role?.value === 'StaticText').map((n) => n.name?.value ?? '').join('');
        read.push({ role: me?.role?.value ?? null, words });
      }
      ax = { role, read };
    } finally { await cdp.detach(); }
    ok(ax.role === 'list' && ax.read.length === items.length && ax.read.every((r, i) => r.role === 'listitem' && r.words === items[i]),
      `#2177 ${k.op} ${w}: a screen reader reads the lines in order, as a list of ${items.length} items — read ${ax.role}, ${JSON.stringify(ax.read.map((r) => `${r.role}: ${r.words.slice(0, 30)}`))}`);
    ok(errors.length === 0, `#2177 ${k.op} ${w}: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
  // A summary sent without items (Prune, Read-back, Set up file, or an older host) is its own one line, in the same words.
  {
    const { page, errors } = await openPanel();
    const summary = 'file setup failed: a page named Components already exists';
    await post(page, { type: 'file-setup-result', ok: false, headline: '✗ setup failed', summary });
    const sel = '[data-p3="activity-op"][data-op="filesetup"] [data-p3="op-summary"]';
    await page.waitForFunction((s) => document.querySelector(s)?.checkVisibility() === true, sel, { timeout: 5000 }).catch(() => {});
    const texts = await page.evaluate((s) => [...(document.querySelector(s)?.children ?? [])].map((n) => n.textContent), sel);
    ok(JSON.stringify(texts) === JSON.stringify([summary]), `#2177 a summary sent without items shows as its one line, in its own words — read ${JSON.stringify(texts)}`);
    ok(errors.length === 0, `#2177 no items: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
}

// ── #2281: "Earlier results" read one line per item too ─────────────────────────────────────────────
//
// Owner decision Q90 A (2026-10-07): the Activity drawer's history uses the format #2177 (AL1 A) gave a run's current
// details. Each earlier result is its time and verdict, then its items, one per line, in the chrome's mono font, an
// unbulleted list, no separator at a line's end. A nested list stays on its item's line (AL1 A's exceptions: a conflict
// refusal, "Also built: …", the style guide's per-table update). No history line sits in a live region.
//
// INDEPENDENCE (docs/34). EXPECTED is the item lists authored here, per run kind, with the summary joined from them here.
// ACTUAL is the built panel's DOM, each line's computed font against the chrome's own `--p3-font-mono` token, and the
// browser's accessibility tree (CDP `getPartialAXTree`). Neither side reads `activity.ts`. The agent link is untouched:
// this is the drawer's rendering only, and `test-agent-link.ts`'s `#2177` arms hold the agent's verdict byte for byte.
//
// Mutations, each against the built bundle, each failing by name:
//   · the history joined back into one line → `#2281 <kind> <w>: the earlier results show their items as lines, newest first`
//   · a history line inside the live region → `#2281 <kind> <w>: no earlier result sits in a live region`
//   · the last history line dropped → the first arm
{
  const BUILT_A = 'Built from tree-a1b2c3d4 at 2026-10-07T09:00:00Z.';
  const BUILT_B = 'Built from tree-e5f6a7b8 at 2026-10-07T09:20:00Z.';
  /** Per run kind: two earlier results, oldest first, each its verdict and its items with the separator joining each. */
  const KINDS = [
    { op: 'apply', type: 'apply-result', extra: {}, runs: [
      { headline: '⚠ 4 misses', items: [['', 'palette 118 (+0)'], [', ', 'color 412 (+3)'], [', ', 'type 9 fonts loaded / 40 font vars (+0) / 22 text styles (+0)'],
        [', ', '1630 bindings'], [', ', '4 misses'], ['. ', BUILT_A]] },
      { headline: '⚠ 1 refused', items: [['', 'palette 118 (+0)'], [', ', 'color 412 (+0)'], [', ', '1 write refused (color/text/primary)'], ['. ', BUILT_B]] },
    ] },
    { op: 'components', type: 'component-result', extra: { completed: true }, runs: [
      { headline: '⚠ 648, 4 missed', items: [
        ['', "set 'Button': 648 variants (+0 built, 648 already present), grid 24×27, axes size/variant/state/icon"],
        [', ', '⚠ 4 misses (focus/ring/offset; icon/size; label/weight; …)'], ['. ', 'Also built: icon, badge'], ['. ', BUILT_A]] },
      { headline: '✗ Nothing written', items: [
        ['', 'Nothing was written. 3 conflicts with existing content: Button/size=sm; Button/size=md; Button/size=lg'], ['. ', BUILT_B]] },
    ] },
    { op: 'styleguide', type: 'style-guide-result', extra: {}, runs: [
      { headline: '⚠ 4 drawn, 1 failed', items: [['', 'Primary: Figma refused the write'], ['. ', '3 tables created (Palette, Color roles, Spacing)'], ['. ', BUILT_A]] },
      { headline: '⚠ 2 updated', items: [['', '2 tables updated in place — Radius: 2 changed; Spacing: 1 changed'],
        ['. ', '4 tables skipped — this file has no ↳ Semantic tokens page, and Set up file adds it'], ['. ', BUILT_B]] },
    ] },
  ];
  const LIVE = '[aria-live], [role="status"], [role="log"], [role="alert"]';
  ok(KINDS.length === 3, `#2281 the arm drives every run kind #2177 does: Apply, a component build, the style guide (found ${KINDS.length})`);
  for (const w of [1280, 380]) for (const k of KINDS) {
    const { page, errors } = await openPanel();
    await page.setViewportSize({ width: w, height: w === 380 ? 640 : 900 });
    // Two runs, then a third: the first two are the earlier results, newest first.
    const runs = [...k.runs, { headline: '⚠ latest', items: [['', 'the latest run']] }];
    for (const r of runs) {
      const items = r.items.map(([, t]) => t);
      const summary = r.items.map(([sep, t], i) => (i === 0 ? t : sep + t)).join('');
      await post(page, { type: k.type, ok: false, headline: r.headline, summary, ...k.extra, lines: items });
      await page.waitForFunction(([op, h]) => document.querySelector(`[data-p3="activity-op"][data-op="${op}"] [data-p3="op-verdict"]`)?.textContent?.includes(h), [k.op, r.headline], { timeout: 5000 }).catch(() => {});
    }
    const row = `[data-p3="activity-op"][data-op="${k.op}"]`;
    await hooks.click(page.locator(`${row} [data-p3="op-history"] > summary`));
    await page.waitForFunction((s) => document.querySelector(s)?.checkVisibility() === true, `${row} [data-p3="op-history-line"]`, { timeout: 5000 }).catch(() => {});
    const want = [k.runs[1], k.runs[0]];
    const seen = await page.evaluate(([r, live]) => {
      const entries = [...document.querySelectorAll(`${r} [data-p3="op-history-entry"]`)];
      const mono = getComputedStyle(document.documentElement).getPropertyValue('--p3-font-mono').trim();
      const lines = [...document.querySelectorAll(`${r} [data-p3="op-history-line"]`)];
      const status = document.querySelector('[data-p3="activity-status"]');
      return {
        heads: entries.map((e) => e.querySelector('[data-p3="op-history-head"]')?.textContent ?? null),
        texts: entries.map((e) => [...e.querySelectorAll('[data-p3="op-history-line"]')].map((n) => n.textContent)),
        mono,
        fonts: lines.map((n) => getComputedStyle(n).fontFamily),
        bullets: [...document.querySelectorAll(`${r} [data-p3="op-history-lines"]`)].map((n) => getComputedStyle(n).listStyleType),
        live: [...document.querySelectorAll(`${r} [data-p3="op-history"], ${r} [data-p3="op-history"] *`)].filter((n) => n.closest(live)).length
          + (status ? status.querySelectorAll('[data-p3="op-history"], [data-p3="op-history-entry"], [data-p3="op-history-head"], [data-p3="op-history-lines"], [data-p3="op-history-line"]').length : 0),
      };
    }, [row, LIVE]);
    ok(JSON.stringify(seen.texts) === JSON.stringify(want.map((r) => r.items.map(([, t]) => t))),
      `#2281 ${k.op} ${w}: the earlier results show their items as lines, newest first (${want.map((r) => r.items.length).join(' and ')} lines) — read ${JSON.stringify(seen.texts.map((l) => l.map((t) => (t ?? '').slice(0, 30))))}`);
    ok(seen.heads.length === 2 && seen.heads.every((t, i) => new RegExp(`^\\d\\d:\\d\\d · ${want[i].headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).test(t ?? '')),
      `#2281 ${k.op} ${w}: each earlier result leads with its time and verdict, nothing after it — read ${JSON.stringify(seen.heads)}`);
    ok(seen.mono !== '' && seen.fonts.length > 0 && seen.fonts.every((f) => f === seen.mono) && seen.bullets.length === 2 && seen.bullets.every((b) => b === 'none'),
      `#2281 ${k.op} ${w}: every earlier line is in the chrome's mono font (${seen.mono}), in an unbulleted list — read ${JSON.stringify([...new Set(seen.fonts)])}, ${JSON.stringify(seen.bullets)}`);
    ok(seen.live === 0, `#2281 ${k.op} ${w}: no earlier result sits in a live region — ${seen.live} history nodes inside one`);
    // The browser's own reading: per earlier result, a list whose items are its lines, in order.
    const cdp = await page.context().newCDPSession(page);
    const read = [];
    try {
      await cdp.send('Accessibility.enable');
      const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
      const { nodeIds: lists } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: `${row} [data-p3="op-history-lines"]` });
      for (const listId of lists) {
        const role = (await cdp.send('Accessibility.getPartialAXTree', { nodeId: listId, fetchRelatives: false })).nodes.find((n) => !n.ignored)?.role?.value ?? null;
        const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: listId, selector: ':scope > *' });
        const items = [];
        for (const id of nodeIds) {
          const t = (await cdp.send('Accessibility.getPartialAXTree', { nodeId: id, fetchRelatives: true })).nodes;
          const me = t.find((n) => n.backendDOMNodeId !== undefined && !n.ignored && n.role?.value === 'listitem');
          items.push({ role: me?.role?.value ?? null, words: t.filter((n) => n.parentId === me?.nodeId && n.role?.value === 'StaticText').map((n) => n.name?.value ?? '').join('') });
        }
        read.push({ role, items });
      }
    } finally { await cdp.detach(); }
    ok(read.length === 2 && read.every((l, i) => l.role === 'list' && l.items.length === want[i].items.length && l.items.every((x, j) => x.role === 'listitem' && x.words === want[i].items[j][1])),
      `#2281 ${k.op} ${w}: a screen reader reads each earlier result's lines in order, as a list — read ${JSON.stringify(read.map((l) => `${l.role}: ${l.items.map((x) => `${x.role} ${x.words.slice(0, 20)}`).join(' | ')}`))}`);
    ok(errors.length === 0, `#2281 ${k.op} ${w}: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
  // An earlier result sent without items (Set up file, or an older host) is its summary as one line.
  {
    const { page, errors } = await openPanel();
    const summary = 'file setup failed: a page named Components already exists';
    await post(page, { type: 'file-setup-result', ok: false, headline: '✗ setup failed', summary });
    await page.waitForFunction(() => !!document.querySelector('[data-p3="activity-op"][data-op="filesetup"] [data-p3="op-summary"]'), null, { timeout: 5000 }).catch(() => {});
    await post(page, { type: 'file-setup-result', ok: false, headline: '✗ setup failed again', summary: 'again' });
    await page.waitForFunction(() => !!document.querySelector('[data-p3="activity-op"][data-op="filesetup"] [data-p3="op-history-line"]'), null, { timeout: 5000 }).catch(() => {});
    const texts = await page.evaluate(() => [...document.querySelectorAll('[data-p3="activity-op"][data-op="filesetup"] [data-p3="op-history-line"]')].map((n) => n.textContent));
    ok(JSON.stringify(texts) === JSON.stringify([summary]), `#2281 an earlier result sent without items shows as its one line, in its own words — read ${JSON.stringify(texts)}`);
    ok(errors.length === 0, `#2281 no items: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
}

await browser.close();
server.close();

hooks.report(ok);

console.log(`\n${failed === 0 ? '✅' : '❌'} ${executed - failed} of ${executed} assertions pass`);
if (failed) {
  console.error(`\n${failed} failing:`);
  for (const f of failures) console.error(`  · ${f}`);
}
process.exit(failed === 0 ? 0 : 1);
