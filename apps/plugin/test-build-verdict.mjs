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

/** A legacy page, reached through the Pages menu (UI redesign S1.2): the old rail moved into the top bar
 *  with its `rail-page-<key>` hooks. Opens the menu, clicks the destination, and waits for the legacy frame
 *  to say it shows that page (`data-legacy-page`, the hook's suffix) — a real condition, not a sleep. */
const gotoRail = async (page, selector) => {
  if (await page.locator('[data-p3="pages-menu-list"]').count() === 0) await hooks.click(page.locator('[data-p3="pages-menu"]'));
  await hooks.click(page.locator(selector));
  await page.waitForFunction((s) => document.querySelector('[data-p3="legacy-frame"]')?.dataset.legacyPage === s,
    hooks.role(selector).slice('rail-page-'.length));
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

/** Everything a designer can read about a build, from the rendered DOM only.
 *
 *  Both hosts are read, separately and by their own selectors, because the whole defect was one of them
 *  being right while the other was stale — a probe that took "the first pill on the page" would have
 *  reported the bar's correct verdict and never looked at the button. */
const readSurfaces = (page) => page.evaluate(() => {
  const text = (sel) => [...document.querySelectorAll(sel)].map((n) => n.textContent);
  const btn = document.querySelector('[data-p3="components-build"]');
  const sel = document.querySelector('[data-p3="components-def-picker"]');
  // UI redesign S11: the build's chrome status is its row in the Activity drawer. Its verdict pill reads
  // "Running" while the build runs, so a verdict is read only once the row has settled.
  const row = document.querySelector('[data-p3="activity-op"][data-op="components"]');
  const pill = row?.querySelector('[data-p3="op-verdict"]');
  const detail = row?.querySelector('[data-p3="op-summary"]') ?? null;
  const drawer = document.querySelector('[data-p3="activity-drawer"]');
  return {
    button: btn ? btn.textContent : null,
    buttonDisabled: btn ? btn.disabled : null,
    pickerDisabled: sel ? sel.disabled : null,
    picker: sel ? sel.value : null,
    pageVerdict: text('[data-p3="components-row"] [data-p3="status-verdict"]'),
    pagePending: text('[data-p3="components-row"] [data-p3="status-pill"]'),
    barVerdict: row && row.dataset.state !== 'running' && pill && !pill.hidden ? [pill.textContent] : [],
    barPending: row ? [...row.querySelectorAll('[data-p3="op-progress"]')].map((n) => n.textContent) : [],
    // Shown, read the way the browser decides it: the row's body and the drawer's are hidden with `hidden`.
    detail: detail && detail.checkVisibility() ? detail.textContent : null,
    drawerOpen: drawer?.dataset.open === 'true',
  };
});

/** A panel on the Components page, one fresh context per scenario.
 *
 *  A shared context would carry the previous scenario's `componentState` — and its localStorage brand —
 *  into the next, so a verdict left over from scenario 1 could satisfy scenario 2's assertion. */
const openPanel = async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await hooks.watch(page);
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  // A real condition, not a sleep: the frame is rendered once the app has booted onto a brand.
  await hooks.need(page, '[data-p3="frame"]');   // the app view (Color › Palettes draws the two panes from S2)
  await gotoRail(page, '[data-p3="rail-page-components"]');
  await hooks.need(page, '[data-p3="components-build"]');
  return { page, errors };
};

/**
 * Click Build and let the first chunk boundary report, so the run is mid-flight in the same way a real
 * one is when the terminal message lands. Returns false if the control could not be clicked.
 *
 * A STUCK CONTROL IS AN ASSERTION HERE, NOT AN EXCEPTION, and that is worth the extra lines. This
 * suite's whole subject is a button that stays disabled, so the defect it exists to catch is EXACTLY
 * what makes `locator.click()` throw — and an uncaught throw takes the process down mid-run: measured
 * under the mutation that reverts half the fix, the table printed 27 correct named failures and then
 * died on a `TimeoutError` stack, losing the remaining cases and the summary count. A gate that
 * crashes on the bug it is for reports less than one that fails on it. So the click is bounded, and a
 * refusal becomes a named failure that the run survives.
 */
const startBuild = async (page, def, label = 'build') => {
  if (def) await page.selectOption('[data-p3="components-def-picker"]', def);
  const clicked = await hooks.click(page.locator('[data-p3="components-build"]').first(), { timeout: 4000 })
    .then(() => true, () => false);
  if (!clicked) {
    const state = await readSurfaces(page);
    ok(false, `${label}: the Build control could not be clicked — it reads "${state.button}", disabled ${state.buttonDisabled}`);
    return false;
  }
  await page.waitForFunction(() => document.querySelector('[data-p3="components-build"]')?.disabled === true, null, { timeout: 4000 }).catch(() => {});
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
    msg: { type: 'component-result', ok: true, headline: '✓ built 648', summary: "set 'Button': 648 variants (+648 built, 0 already present), 0 refs missing" },
    verdictOpens: false,
  },
  {
    name: 'build with misses',
    why: "#866's four DISCARDED refs — the reason this surface matters at all",
    msg: { type: 'component-result', ok: false, headline: '⚠ 648, 4 missed', summary: "set 'Button': 648 variants, ⚠ 4 misses (focus/ring/offset; icon/size; …)" },
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
    msg: { type: 'component-result', ok: false, headline: '✗ apply failed', summary: 'component build failed: planSetLayout: no coherent set' },
    verdictOpens: true,
  },
  {
    name: 'already-built (idempotent re-run)',
    why: 'every member skipped by name, so misses === skipped and the build is a SUCCESS',
    msg: { type: 'component-result', ok: true, headline: '✓ 0 new, 648 present', summary: "set 'Button': 648 variants (+0 built, 648 already present)" },
    verdictOpens: false,
  },
  {
    name: 'unknown def',
    why: 'the early return — the UI and the plugin disagree about the catalogue',
    msg: { type: 'component-result', ok: false, headline: '✗ unknown def', summary: "no component def with id 'nope' — this build knows button, icon-button" },
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
      type: 'component-result', ok: false, headline: '✗ not buildable on its own',
      summary: 'focus-ring: a ring is sized by the control it surrounds, so it projects members that bind no width or height of their own — built alone it is a 100×100 default frame with the focus color at 1px. Build it as part of a host instead: Button nests it and supplies the geometry.',
    },
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
      type: 'component-result', ok: false, headline: '✗ failed, 2 parked',
      summary: "component build failed: in setTextStyleIdAsync: unloaded font \"Clash Display Semi Bold\" — 2 nodes had already reached the file; they are parked in the frame '⚠ Prism3 partial build — button (2 nodes; undo to remove)' on this page. One undo removes the whole build.",
    },
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
// The zeroth terminating condition is "nothing has terminated yet", and it needs its own assertion
// because the fix routes the FIRST render through the same `syncComponentRow` as every verdict. That
// sync judges itself by `row.isConnected` — right for a verdict (writing into a detached row reports a
// delivery nobody can see) and wrong at mount, when the row is built but not yet inserted. One guard
// cannot serve both, which is what the `staged` carve-out is for, and getting that wrong shipped a
// BLANK, enabled button in an intermediate version of this very fix. Every check below opens a panel
// and would sail past that: they read the button only after a build, by which time the row is attached
// and the sync writes a correct label over the empty one. So the empty initial button is asserted here,
// directly, in the words on screen — not inferred from the away-and-back case that also happens to
// catch it. A defect the author introduced while fixing the reported one is still a defect.
//
// The two "nothing yet" checks are ABSENCE checks, so they are only measurements once this same panel has
// shown that the probe CAN see a fraction and a verdict in the page's row (#1831). The guard counts hook
// names once per run, so a `status-pill` dropped at the row's render site would leave these reading an
// empty list and passing. The panel is therefore driven through one build after the fresh reading, and the
// fresh reading is judged against what the same probe saw then.
{
  const { page, errors } = await openPanel();
  const fresh = await readSurfaces(page);
  ok(fresh.button === '⊞ Build set', `a freshly opened panel offers "⊞ Build set" — read "${fresh.button}"`);
  ok(fresh.buttonDisabled === false, 'a freshly opened panel offers a clickable Build control');
  ok(fresh.pickerDisabled === false, 'a freshly opened panel offers an enabled def picker');
  ok(errors.length === 0, `opening the panel logs no console errors (${errors.slice(0, 2).join(' · ')})`);
  await startBuild(page, undefined, 'the fresh panel\'s proving build');
  const during = await readSurfaces(page);
  await post(page, { type: 'component-result', ok: true, headline: '✓ built 648', summary: "set 'Button': 648 variants" });
  await page.waitForFunction(() => document.querySelector('[data-p3="components-build"]')?.textContent === '⊞ Build set', null, { timeout: 5000 }).catch(() => {});
  const after = await readSurfaces(page);
  hooks.absent(ok, { seen: after.pageVerdict.some((t) => (t ?? '').includes('✓ built 648')), state: "a verdict in the page's row, after a build on this panel" },
    fresh.pageVerdict.length === 0, `no verdict is shown before a build has run — found ${JSON.stringify(fresh.pageVerdict)}`);
  hooks.absent(ok, { seen: during.pagePending.some((t) => /24 of 648/.test(t ?? '')), state: "a live fraction in the page's row, during a build on this panel" },
    fresh.pagePending.length === 0, `no progress fraction is shown before a build has run — found ${JSON.stringify(fresh.pagePending)}`);
  await page.close();
}

for (const c of CONDITIONS) {
  const { page, errors } = await openPanel();
  await startBuild(page, undefined, c.name);

  const during = await readSurfaces(page);
  ok(during.button === '… Building…', `${c.name}: the button reads "… Building…" while in flight`);
  ok(during.buttonDisabled === true, `${c.name}: the button is disabled while in flight — a second click would post a concurrent build`);

  // BOTH live pills advance, which is the second defect (see the header). Asserted per condition rather
  // than once, because the pending pills are re-minted by whichever render ran last.
  ok(
    during.pagePending.some((t) => /24 of 648/.test(t ?? '')),
    `${c.name}: the PAGE's pending pill shows the live fraction (was frozen at the placeholder)`,
  );
  ok(
    during.barPending.some((t) => /24 of 648/.test(t ?? '')),
    `${c.name}: the Activity row shows the live fraction (was frozen at the placeholder)`,
  );

  await post(page, c.msg);
  // Wait on the real condition — the label leaving the pending state — with a bounded timeout, so a
  // regression fails here as a timeout naming this condition rather than as a bare assertion diff.
  await page
    .waitForFunction(() => document.querySelector('[data-p3="components-build"]')?.textContent === '⊞ Build set', null, { timeout: 5000 })
    .catch(() => {});
  const after = await readSurfaces(page);

  // THE ASSERTION #870 IS ABOUT. Stated as the label and enabled-state a designer reads.
  ok(after.button === '⊞ Build set', `${c.name}: the button returns to "⊞ Build set" — read "${after.button}"`);
  ok(after.buttonDisabled === false, `${c.name}: the button is clickable again, so another build can be started`);
  ok(after.pickerDisabled === false, `${c.name}: the def picker is enabled again`);

  // The verdict is VISIBLE on both surfaces, carrying the host's own headline.
  ok(
    after.pageVerdict.some((t) => (t ?? '').includes(c.msg.headline)),
    `${c.name}: the page's row carries the verdict "${c.msg.headline}" — read ${JSON.stringify(after.pageVerdict)}`,
  );
  ok(
    after.barVerdict.some((t) => (t ?? '').includes(c.msg.headline)),
    `${c.name}: the Activity row carries the verdict "${c.msg.headline}"`,
  );

  // No pending text survives the verdict, on either surface. This is the other half of "reaches a
  // visible verdict": a fraction left beside a verdict reads as a build still running.
  // ABSENCE checks, so each is judged against what the same probe saw during this build (#1831): the
  // pending pill on that surface was read, and the verdict it should now stand beside has landed.
  const pageLanded = after.pageVerdict.some((t) => (t ?? '').includes(c.msg.headline));
  const barLanded = after.barVerdict.some((t) => (t ?? '').includes(c.msg.headline));
  hooks.absent(ok, { seen: during.pagePending.some((t) => /24 of 648/.test(t ?? '')) && pageLanded, state: "the page's pending pill during the build, then its verdict" },
    after.pagePending.length === 0, `${c.name}: no stale fraction is left on the page beside the verdict — found ${JSON.stringify(after.pagePending)}`);
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
// WHAT IS *NOT* ASSERTED HERE, AND WHY — because the obvious extra check turned out to be one that runs
// and cannot fire. #483's finding was a verdict computed correctly and then discarded by
// `text-overflow: ellipsis` at 220px, so "is the count clipped out of the pill" looks like the right
// question to ask of the rendered DOM. It is not answerable any more: measured on the built bundle, the
// pill computes to `overflow: visible`, `max-width: none`, `white-space: nowrap` — it GROWS with its text
// instead of clipping — and the panel opens at 1280×900 (`DEFAULT_SIZE` in `main.ts`), where a
// deliberately over-budget 78-character headline still renders at 455px inside an 833px row. So
// `scrollWidth <= clientWidth` is true for every possible headline: added as an arm here, it stayed green
// under a headline three times the budget, which is a check that cannot fail reporting itself as a pass.
// The ≤24-char budget is asserted where it can still move — against the function, over a range of counts,
// in `test-apply-summary.ts`. Left as a note rather than deleted silently: the next person to reach for
// this measurement should know it was taken.
for (const [n, label] of [[2, 'the small regime — the ordinary client failure'], [648, 'the large regime']]) {
  const { page, errors } = await openPanel();
  await startBuild(page, undefined, label);
  const headline = `✗ failed, ${n} parked`;
  await post(page, {
    type: 'component-result', ok: false, headline,
    summary: `component build failed: in combineAsVariants: The nodes must all have the same parent — ${n} nodes had already reached the file; they are parked in the frame '⚠ Prism3 partial build — button (${n} nodes; undo to remove)' on this page. One undo removes the whole build.`,
  });
  await page.waitForFunction(() => document.querySelector('[data-p3="components-build"]')?.textContent === '⊞ Build set', null, { timeout: 5000 }).catch(() => {});
  const after = await readSurfaces(page);

  // THE COUNT, on both surfaces. Asserted as the NUMBER rather than as the whole headline, because the
  // number is the part a verdict tuned for the dramatic case would drop.
  ok(after.pageVerdict.some((t) => (t ?? '').includes(String(n))),
    `${label}: the page's pill states how many nodes were left — read ${JSON.stringify(after.pageVerdict)}`);
  ok(after.barVerdict.some((t) => (t ?? '').includes(String(n))),
    `${label}: the Activity row states it too, so it survives navigating away — read ${JSON.stringify(after.barVerdict)}`);

  // The WHERE is in the detail, and the detail is open without a click: a designer who has to expand a row
  // to learn that 648 components are sitting on their canvas will not learn it.
  ok(after.detail !== null && (after.detail ?? '').includes('parked in the frame'),
    `${label}: the open detail says where the leftovers are`);
  ok((after.detail ?? '').includes('⚠ Prism3 partial build'),
    `${label}: ...and names the frame, which is the only pointer the panel can give`);
  ok((after.detail ?? '').includes('One undo'),
    `${label}: ...and names the way out, which is one undo because the run is one undo entry`);
  ok((after.detail ?? '').includes('combineAsVariants'),
    `${label}: ...with the host's own error still leading, since the cause is what the designer needs`);
  ok(errors.length === 0, `${label}: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── the picker's selection survives its own verdict ───────────────────────────────────────────
//
// Not a nicety — it is why the fix is a SYNC rather than a `renderWorkspace()` call. A full page render
// rebuilds the picker, whose `<option>` carries `selected` for Button, so reporting a verdict would
// silently reset the selection and the designer's next click would build the wrong set. Measured: a
// re-render does exactly that, which is what ruled out the one-line repair.
{
  const { page } = await openPanel();
  const options = await page.locator('[data-p3="components-def-picker"] option').evaluateAll((ns) => ns.map((n) => n.value));
  const other = options.find((v) => v !== 'button');
  ok(other !== undefined, `the picker offers a def other than Button, so this check can mean something (${JSON.stringify(options)})`);
  if (other) {
    await startBuild(page, other, `the non-default def '${other}'`);
    await post(page, { type: 'component-result', ok: true, headline: '✓ built', summary: `set '${other}'` });
    await page
      .waitForFunction(() => document.querySelector('[data-p3="components-build"]')?.textContent === '⊞ Build set', null, { timeout: 5000 })
      .catch(() => {});
    const after = await readSurfaces(page);
    ok(after.picker === other, `the picker still holds '${other}' after its verdict — read '${after.picker}' (a full re-render would reset it to 'button')`);
    ok(after.button === '⊞ Build set', `the non-default def's build also reaches a verdict`);
  }
  await page.close();
}

// ── a verdict that arrives while the designer is on another page ───────────────────────────────
//
// #483's division of labour, asserted rather than assumed: the build's STATUS lives in the chrome so it
// survives navigation, while the control is page content. The page's row is detached here, and writing a
// verdict into a detached row would report a delivery nobody can see — so the chrome must carry it, and
// returning to the page must show a correct control rather than the "Building…" it left.
{
  const { page } = await openPanel();
  await startBuild(page, undefined, 'a verdict arriving off-page');
  // Color › Palettes, by its tab: it left the Pages menu in UI redesign S2 and draws the two panes.
  await hooks.click(page.locator('[data-p3="tab-color"]'));
  await hooks.click(page.locator('[data-p3="color-sub-palettes"]'));
  await hooks.need(page, '[data-p3="palettes-levers"]');
  await page.waitForFunction(() => !document.querySelector('[data-p3="components-row"]'));
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

  await post(page, { type: 'component-result', ok: true, headline: '✓ built 648', summary: "set 'Button': 648 variants" });
  await page.waitForFunction(() => (document.querySelector('[data-p3="activity-op"][data-op="components"] [data-p3="op-verdict"]')?.textContent ?? '').includes('✓ built 648'), null, { timeout: 5000 }).catch(() => {});
  const landed = await readSurfaces(page);
  ok(landed.barVerdict.some((t) => (t ?? '').includes('✓ built 648')), 'a verdict arriving off-page lands in the Activity drawer, which is what survives navigation');

  await gotoRail(page, '[data-p3="rail-page-components"]');
  await hooks.need(page, '[data-p3="components-build"]');
  const back = await readSurfaces(page);
  ok(back.button === '⊞ Build set', `returning to the page shows a clickable control, not the "Building…" it was left on — read "${back.button}"`);
  ok(back.pageVerdict.some((t) => (t ?? '').includes('✓ built 648')), 'returning to the page shows the verdict it missed');
  await page.close();
}

// ── two builds back to back ───────────────────────────────────────────────────────────────────
//
// The loop `docs/40` §7 step 6 ("build it and look at it") actually needs: not one build that resolves,
// but a second one startable from the resolved state. A fix that cleared the label without re-enabling
// the control would pass every assertion above and still leave the authoring loop blocked.
{
  const { page } = await openPanel();
  await startBuild(page, undefined, 'the first of two builds');
  await post(page, { type: 'component-result', ok: true, headline: '✓ built 648', summary: 'first run' });
  await page.waitForFunction(() => document.querySelector('[data-p3="components-build"]')?.textContent === '⊞ Build set', null, { timeout: 5000 }).catch(() => {});
  await startBuild(page, undefined, 'the second of two builds');
  const second = await readSurfaces(page);
  ok(second.button === '… Building…', 'a second build can be started from the resolved state');
  ok(second.pagePending.some((t) => /24 of 648/.test(t ?? '')), "the second build's progress reports too, rather than the first verdict staying put");
  await post(page, { type: 'component-result', ok: true, headline: '✓ 0 new, 648 present', summary: 'second run — idempotent' });
  await page.waitForFunction(() => document.querySelector('[data-p3="components-build"]')?.textContent === '⊞ Build set', null, { timeout: 5000 }).catch(() => {});
  const done = await readSurfaces(page);
  ok(done.pageVerdict.some((t) => (t ?? '').includes('✓ 0 new, 648 present')), "the second build's verdict replaces the first, rather than appending beside it");
  ok(done.pageVerdict.length === 1, `exactly one verdict pill on the page, not one per build — found ${done.pageVerdict.length}`);
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

// ── #259: the style-guide step reaches its verdict, and its options cross the bridge ──────────────
//
// The same #870 shape on a new control: `style-guide-result` has to repaint the PAGE's row, not only the
// chrome, or the button sits on "Drawing…" after a run that finished. And the Customize options are only
// worth having if they reach the main thread, so the outgoing message is captured off the bus — the UI's
// `parent.postMessage` lands on this window — and its options compared with the values picked here.
// EXPECTED is authored in the words on screen; nothing reads `styleGuideState` (docs/34 shape 16).
{
  const { page, errors } = await openPanel();
  await page.evaluate(() => {
    window.__sent = [];
    window.addEventListener('message', (e) => { const m = e.data && e.data.pluginMessage; if (m && m.type === 'style-guide') window.__sent.push(m); });
  });
  await gotoRail(page, '[data-p3="rail-page-style-guide"]');
  await hooks.need(page, '[data-p3="style-guide-draw"]', { timeout: 5000 });
  const readSg = () => page.evaluate(() => {
    const btn = document.querySelector('[data-p3="style-guide-draw"]');
    const det = document.querySelector('[data-p3="style-guide-customize"]');
    return {
      button: btn ? btn.textContent : null,
      disabled: btn ? btn.disabled : null,
      verdict: [...document.querySelectorAll('[data-p3="style-guide-row"] [data-p3="status-verdict"]')].map((n) => n.textContent),
      customize: det ? { open: det.open, text: det.textContent } : null,
      sent: window.__sent,
    };
  });
  const before = await readSg();
  ok(before.button === '▦ Draw style guide' && before.disabled === false, `#259 the Style guide page offers "▦ Draw style guide", enabled — read "${before.button}", disabled ${before.disabled}`);
  ok(before.customize !== null && before.customize.open === false, '#259 the per-type options fold away under a closed "Customize"');
  ok(/Color value/.test(before.customize?.text ?? '') && /Display style/.test(before.customize?.text ?? '') && /From each token’s role/.test(before.customize?.text ?? ''),
    '#259 Customize carries Color value and Display style, the display defaulting to the token\'s role');

  await hooks.click(page.locator('[data-p3="style-guide-customize"] summary'));
  await page.locator('[data-p3="style-guide-value-format"] select').selectOption('hsl');
  await page.locator('[data-p3="style-guide-display"] select').selectOption('border');
  const clicked = await hooks.click(page.locator('[data-p3="style-guide-draw"]'), { timeout: 4000 }).then(() => true, () => false);
  ok(clicked, '#259 the Draw style guide control can be clicked');
  // postMessage delivers asynchronously; a real condition rather than a sleep.
  await page.waitForFunction(() => window.__sent.length > 0, null, { timeout: 3000 }).catch(() => {});
  const pending = await readSg();
  ok(pending.button === '… Drawing…' && pending.disabled === true, `#259 a run in flight reads "… Drawing…", disabled — read "${pending.button}", disabled ${pending.disabled}`);
  ok(pending.sent.length === 1 && pending.sent[0].options?.valueFormat === 'hsl' && pending.sent[0].options?.display === 'border',
    `#259 the click posts one style-guide message carrying the picked options — sent ${JSON.stringify(pending.sent)}`);

  await post(page, { type: 'style-guide-result', ok: true, headline: '✓ style guide: 22 tables', summary: '22 tables: 11 on ↳ Primitive tokens, 11 on ↳ Semantic tokens' });
  await page.waitForFunction(() => document.querySelector('[data-p3="style-guide-draw"]')?.textContent === '▦ Draw style guide', null, { timeout: 5000 }).catch(() => {});
  const done = await readSg();
  ok(done.button === '▦ Draw style guide' && done.disabled === false, `#259 the verdict re-enables the control on the page — read "${done.button}", disabled ${done.disabled}`);
  ok(done.verdict.length === 1 && done.verdict[0].includes('✓ style guide: 22 tables'), `#259 exactly one verdict pill on the page's row, in the headline's words — read ${JSON.stringify(done.verdict)}`);
  ok(errors.length === 0, `#259 no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── #1845: File setup reaches its verdict on the page's row ──────────────────────────────────────
//
// The same #870 shape on the third page-row control. Before UI redesign P2 a host verdict became a
// `Repaint` tag and a switch in `apps/studio/src/main.ts` turned the tag into a call; `test-host-session.ts`
// asserted the tag list and nothing checked the switch. Changing `case 'fileSetupRow': syncFileSetupRow()`
// to a bare `break` put #870 back for this button and passed every gate, because no browser suite sent
// `file-setup-result` (#1845). Since P2 the mapping is a store subscription (`subscribe('host:filesetup', …)`),
// and this arm is what fails when it goes: the verdict is posted through the real bridge and the row is
// read back. EXPECTED is authored in the words on screen; nothing reads `fileSetupState` (docs/34 shape 16).
{
  const { page, errors } = await openPanel();
  const readFs = () => page.evaluate(() => {
    const btn = document.querySelector('[data-p3="file-setup-button"]');
    return {
      button: btn ? btn.textContent : null,
      disabled: btn ? btn.disabled : null,
      verdict: [...document.querySelectorAll('[data-p3="file-setup-row"] [data-p3="status-verdict"]')].map((n) => n.textContent),
      pending: [...document.querySelectorAll('[data-p3="file-setup-row"] [data-p3="status-pill"]')].map((n) => n.textContent),
    };
  });
  const before = await readFs();
  ok(before.button === '⊞ Set up file' && before.disabled === false, `#1845 the Components page offers "⊞ Set up file", enabled — read "${before.button}", disabled ${before.disabled}`);
  const clicked = await hooks.click(page.locator('[data-p3="file-setup-button"]'), { timeout: 4000 }).then(() => true, () => false);
  ok(clicked, '#1845 the Set up file control can be clicked');
  const pending = await readFs();
  ok(pending.button === '… Setting up…' && pending.disabled === true, `#1845 a file setup in flight reads "… Setting up…", disabled — read "${pending.button}", disabled ${pending.disabled}`);

  await post(page, { type: 'file-setup-result', ok: true, headline: '✓ file set up', summary: '6 pages added, 2 template assets built' });
  await page.waitForFunction(() => document.querySelector('[data-p3="file-setup-button"]')?.textContent === '⊞ Set up file', null, { timeout: 5000 }).catch(() => {});
  const done = await readFs();
  ok(done.button === '⊞ Set up file' && done.disabled === false, `a file-setup verdict re-enables the Set up file button — read "${done.button}", disabled ${done.disabled}`);
  ok(done.verdict.length === 1 && done.verdict[0].includes('✓ file set up'), `#1845 exactly one verdict pill on the file-setup row, in the headline's words — read ${JSON.stringify(done.verdict)}`);
  ok(done.pending.length === 0, `#1845 no pending pill is left on the file-setup row beside the verdict — found ${JSON.stringify(done.pending)}`);
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
//   · the reveal expanding the first row, not the asked one → `S11 clicking it opens the drawer with the Set up file row expanded …`.
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
    return { summary: row?.querySelector('[data-p3="op-history"] summary')?.textContent ?? null, items: [...(row?.querySelectorAll('[data-p3="op-history"] li') ?? [])].map((n) => n.textContent ?? '') };
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
      items: [...(row?.querySelectorAll('[data-p3="op-history"] li') ?? [])].map((n) => (n.textContent ?? '').replace(/^\d\d:\d\d · /, '')),
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
    return { verdict: row?.querySelector('[data-p3="op-verdict"]')?.textContent ?? null, items: [...(row?.querySelectorAll('[data-p3="op-history"] li') ?? [])].map((n) => n.textContent ?? '') };
  });
  ok((after.verdict ?? '').includes('✓ 42 roles written') && after.items.length === 1 && after.items[0].includes('Refused'),
    `#1957 the running write's verdict lands on the row after a refusal — verdict ${JSON.stringify(after.verdict)}, history ${JSON.stringify(after.items)}`);
  ok(errors.length === 0, `#1957 refusal: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

// ── S11: a page row's verdict opens the Activity drawer on that operation's row ─────────────────────
//
// Two rows, the asked-for one second and neither expanded (both clean, so both collapsed, #483): a reveal
// that expanded the first row, or every row, cannot pass by coinciding with the target.
{
  const { page, errors } = await openPanel();
  await post(page, { type: 'apply-result', ok: true, headline: '✓ 42 roles written', summary: '42 roles written' });
  await post(page, { type: 'file-setup-result', ok: true, headline: '✓ file set up', summary: '6 pages added' });
  await page.waitForFunction(() => document.querySelectorAll('[data-p3="activity-op"]').length === 2, null, { timeout: 5000 }).catch(() => {});
  const before = await page.evaluate(() => ({
    order: [...document.querySelectorAll('[data-p3="activity-op"]')].map((n) => n.dataset.op),
    expanded: [...document.querySelectorAll('[data-p3="activity-op"] [data-p3="op-head"]')].map((n) => n.getAttribute('aria-expanded')),
    open: document.querySelector('[data-p3="activity-drawer"]')?.dataset.open,
  }));
  ok(JSON.stringify(before.order) === '["apply","filesetup"]' && before.expanded.every((e) => e === 'false') && before.open === 'false',
    `S11 reveal premise: two clean rows, Set up file second, neither expanded, the drawer closed — ${JSON.stringify(before)}`);
  const pill = page.locator('[data-p3="file-setup-row"] [data-p3="status-verdict"]');
  const caret = await pill.evaluate((n) => { const c = n.querySelector('.caret'); return c ? { text: c.textContent, hidden: c.getAttribute('aria-hidden'), name: n.getAttribute('aria-label') } : null; }).catch(() => null);
  ok(caret?.text === '▾' && caret.hidden === 'true' && (caret.name ?? '').startsWith('✓ file set up'),
    `S11 the page row's verdict keeps its caret (owner decision #5 on #1956), hidden from its name — read ${JSON.stringify(caret)}`);
  const clicked = await hooks.click(pill, { timeout: 4000 }).then(() => true, () => false);
  ok(clicked, 'S11 the file-setup verdict on the page row can be clicked');
  await page.waitForFunction(() => document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'true', null, { timeout: 5000 }).catch(() => {});
  const shown = await page.evaluate(() => {
    const head = (k) => document.querySelector(`[data-p3="activity-op"][data-op="${k}"] [data-p3="op-head"]`)?.getAttribute('aria-expanded');
    const sum = document.querySelector('[data-p3="activity-op"][data-op="filesetup"] [data-p3="op-summary"]');
    return { open: document.querySelector('[data-p3="activity-drawer"]')?.dataset.open === 'true', expanded: head('filesetup'), other: head('apply'), summary: sum && sum.checkVisibility() ? sum.textContent : null };
  });
  ok(shown.open && shown.expanded === 'true' && shown.other === 'false' && (shown.summary ?? '').includes('6 pages added'),
    `S11 clicking it opens the drawer with the Set up file row expanded, and only that row — open ${shown.open}, expanded ${shown.expanded}, Apply Theme ${shown.other}, summary ${JSON.stringify(shown.summary)}`);
  ok(errors.length === 0, `S11 reveal: no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

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
    { op: 'components', msg: { type: 'component-result', ok: false, headline: '⚠ 648, 4 missed', summary: "set 'Button': 648 variants, ⚠ 4 misses (focus/ring/offset; icon/size; …)" } },
    { op: 'filesetup', msg: { type: 'file-setup-result', ok: false, headline: '✗ file setup failed', summary: 'file setup failed: a page named Components already exists' } },
    { op: 'styleguide', msg: { type: 'style-guide-result', ok: false, headline: '✗ style guide failed', summary: 'style guide failed: no variables in this file' } },
  ];
  ok(VERDICTS.length === 4, `#1890 the drawer arm drives all 4 verdict kinds (found ${VERDICTS.length})`);
  for (const { op, msg: v } of VERDICTS) {
    const { page, errors } = await openPanel();
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
      const ds = drawer ? getComputedStyle(drawer) : null;
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
        drawerPinned: !!ds && ds.position === 'sticky' && ds.bottom === '0px' && drawer.dataset.open === 'true',
        scrolls: maxScroll > 0, atTop, atBottom,
        detailOpen: !!detail && detail.checkVisibility(),
      };
    }, op);
    ok(seen.detailOpen, `#1890 ${v.type}: a bad verdict opens the ${op} row's summary`);
    ok((seen.summary ?? '').includes(v.summary.slice(0, 24)), `#1890 ${v.type}: the open row carries the host's own summary — read ${JSON.stringify(seen.summary)}`);
    ok(seen.drawerHolds && seen.drawerPinned,
      `#1890 ${v.type}: the summary opens in the Activity drawer, and the drawer is open and pinned to the bottom edge — in drawer ${seen.drawerHolds}, pinned and open ${seen.drawerPinned}`);
    ok(seen.scrolls && seen.atTop && seen.atBottom,
      `#1890 ${v.type}: the open summary stays in view with the page scrolled to its top and to its bottom — page scrolls ${seen.scrolls}, in view at top ${seen.atTop}, at bottom ${seen.atBottom}`);
    ok(seen.chromeSticky && seen.finalChromeH === `${seen.chromeHeight}px`,
      `#1890 ${v.type}: --chrome-h equals the sticky chrome's rendered height after the verdict — --chrome-h ${seen.finalChromeH}, chrome ${seen.chromeHeight}px, sticky ${seen.chromeSticky}`);
    ok(errors.length === 0, `#1890 ${v.type}: no console errors (${errors.slice(0, 2).join(' · ')})`);
    await page.close();
  }
}

// ── P2: a font list reaches the Typography page ───────────────────────────────────────────────────
//
// `font-list` invalidates the `fonts` topic, and the one subscriber re-renders the workspace. No other
// suite sends it, so without this arm that subscription could go the way #1845's case did. What a
// designer reads is the typeface library's source column: "On this device" until the host answers,
// "In this Figma" once it has, since the verdicts under it are then Figma's own (docs/34 shape 16).
{
  const { page, errors } = await openPanel();
  await gotoRail(page, '[data-p3="rail-page-typography"]');
  await hooks.need(page, '[data-p3="typeface-source"]', { timeout: 5000 });
  const source = () => page.evaluate(() => document.querySelector('[data-p3="typeface-source"]')?.textContent ?? null);
  const before = await source();
  ok(before === 'On this device', `the typeface library reads "On this device" before the host sends its fonts — read ${JSON.stringify(before)}`);
  await post(page, { type: 'font-list', families: ['Inter', 'Roboto', 'Playfair Display'], styles: [18, 36, 12] });
  await page.waitForFunction(() => document.querySelector('[data-p3="typeface-source"]')?.textContent === 'In this Figma', null, { timeout: 5000 }).catch(() => {});
  const after = await source();
  ok(after === 'In this Figma', `a font list from the host repaints the Typography page — the library reads "In this Figma", read ${JSON.stringify(after)}`);
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
//   · the disabled state dropped (bar button and both menu items) → `#1989 after a refused restore, Apply Theme
//     (bar and Figma menu) and Prune stale are disabled …`.
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
      menuApply: document.querySelector('[data-p3="figma-option-apply"]')?.disabled ?? null,
      menuPrune: document.querySelector('[data-p3="figma-option-prune"]')?.disabled ?? null,
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
  ok(off.applyDisabled === true && off.menuApply === true && off.menuPrune === true,
    `#1989 after a refused restore, Apply Theme (bar and Figma menu) and Prune stale are disabled — bar ${off.applyDisabled}, menu apply ${off.menuApply}, menu prune ${off.menuPrune}`);

  // Every way a designer reaches the two writes, forced past the disabled state, so the guard behind it is measured too.
  await hooks.click(page.locator('[data-p3="figma-option-prune"]'), { force: true, timeout: 4000 }).catch(() => {});
  await hooks.click(page.locator('[data-p3="figma-option-apply"]'), { force: true, timeout: 4000 }).catch(() => {});
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
  await hooks.click(page.locator('[data-p3="prune-dialog"] button', { hasText: 'Cancel' }), { timeout: 4000 }).catch(() => {});

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

await browser.close();
server.close();

hooks.report(ok);

console.log(`\n${failed === 0 ? '✅' : '❌'} ${executed - failed} of ${executed} assertions pass`);
if (failed) {
  console.error(`\n${failed} failing:`);
  for (const f of failures) console.error(`  · ${f}`);
}
process.exit(failed === 0 ? 0 : 1);
