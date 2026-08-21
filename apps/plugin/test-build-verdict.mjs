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
 * five below are derived by reading every `postToUi({type:'component-result'…})` site in
 * `apps/plugin/src/main.ts` (three sites: the unknown-def early return, the happy path, the catch) and
 * every distinct SHAPE the happy path can produce (`ok` true/false by the `misses === skipped` rule,
 * plus the idempotent re-run where every member is skipped). Counted here so adding a sixth means
 * editing this number on purpose.
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

const ROOT = dirname(fileURLToPath(import.meta.url));
const UI = join(ROOT, 'dist/ui.html');

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
  const btn = document.querySelector('.cw-row button.barbtn');
  const sel = document.querySelector('.cw-row select');
  const detail = document.getElementById('apply-detail');
  return {
    button: btn ? btn.textContent : null,
    buttonDisabled: btn ? btn.disabled : null,
    pickerDisabled: sel ? sel.disabled : null,
    picker: sel ? sel.value : null,
    pageVerdict: text('.cw-row .applystat'),
    pagePending: text('.cw-row .bar-seed'),
    barVerdict: text('.bar .applystat'),
    barPending: text('.bar .bar-seed'),
    detail: detail && detail.style.display !== 'none' ? detail.textContent : null,
  };
});

/** A panel on the Components page, one fresh context per scenario.
 *
 *  A shared context would carry the previous scenario's `componentState` — and its localStorage brand —
 *  into the next, so a verdict left over from scenario 1 could satisfy scenario 2's assertion. */
const openPanel = async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
  // A real condition, not a sleep: the rail is rendered once the app has booted onto a brand.
  await page.waitForSelector('.rail button.stage');
  await page.locator('button.stage', { hasText: 'Internal — build the Button set' }).first().click();
  await page.waitForSelector('.cw-row button.barbtn');
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
  if (def) await page.selectOption('.cw-row select', def);
  const clicked = await page.locator('.cw-row button.barbtn').first()
    .click({ timeout: 4000 }).then(() => true, () => false);
  if (!clicked) {
    const state = await readSurfaces(page);
    ok(false, `${label}: the Build control could not be clicked — it reads "${state.button}", disabled ${state.buttonDisabled}`);
    return false;
  }
  await page.waitForFunction(() => document.querySelector('.cw-row button.barbtn')?.disabled === true, null, { timeout: 4000 }).catch(() => {});
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
    msg: { type: 'component-result', ok: false, headline: '⚠ 648, 4 missed', summary: "set 'Button': 648 variants, ⚠️ 4 misses (focus/ring/offset; icon/size; …)" },
    verdictOpens: true,
  },
  {
    name: 'errored build',
    why: "the catch arm — planSetLayout throws before anything reaches the file (and #869's live example)",
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
];

// #870 requires the list to be STATED rather than the observed case fixed. Asserted so that dropping one
// is an edit to this number instead of a quiet narrowing of what a green run means.
ok(CONDITIONS.length === 5, `the condition list covers all 5 terminating conditions (found ${CONDITIONS.length})`);

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
{
  const { page, errors } = await openPanel();
  const fresh = await readSurfaces(page);
  ok(fresh.button === '⊞ Build set', `a freshly opened panel offers "⊞ Build set" — read "${fresh.button}"`);
  ok(fresh.buttonDisabled === false, 'a freshly opened panel offers a clickable Build control');
  ok(fresh.pickerDisabled === false, 'a freshly opened panel offers an enabled def picker');
  ok(fresh.pageVerdict.length === 0, `no verdict is shown before a build has run — found ${JSON.stringify(fresh.pageVerdict)}`);
  ok(fresh.pagePending.length === 0, `no progress fraction is shown before a build has run — found ${JSON.stringify(fresh.pagePending)}`);
  ok(errors.length === 0, `opening the panel logs no console errors (${errors.slice(0, 2).join(' · ')})`);
  await page.close();
}

for (const c of CONDITIONS) {
  const { page, errors } = await openPanel();
  await startBuild(page, undefined, c.name);

  const during = await readSurfaces(page);
  ok(during.button === '⋯ Building…', `${c.name}: the button reads "⋯ Building…" while in flight`);
  ok(during.buttonDisabled === true, `${c.name}: the button is disabled while in flight — a second click would post a concurrent build`);

  // BOTH live pills advance, which is the second defect (see the header). Asserted per condition rather
  // than once, because the pending pills are re-minted by whichever render ran last.
  ok(
    during.pagePending.some((t) => /24 of 648/.test(t ?? '')),
    `${c.name}: the PAGE's pending pill shows the live fraction (was frozen at the placeholder)`,
  );
  ok(
    during.barPending.some((t) => /24 of 648/.test(t ?? '')),
    `${c.name}: the BAR's pending pill shows the live fraction (was frozen at the placeholder)`,
  );

  await post(page, c.msg);
  // Wait on the real condition — the label leaving the pending state — with a bounded timeout, so a
  // regression fails here as a timeout naming this condition rather than as a bare assertion diff.
  await page
    .waitForFunction(() => document.querySelector('.cw-row button.barbtn')?.textContent === '⊞ Build set', null, { timeout: 5000 })
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
    `${c.name}: the chrome bar carries the verdict "${c.msg.headline}"`,
  );

  // No pending text survives the verdict, on either surface. This is the other half of "reaches a
  // visible verdict": a fraction left beside a verdict reads as a build still running.
  ok(after.pagePending.length === 0, `${c.name}: no stale fraction is left on the page beside the verdict — found ${JSON.stringify(after.pagePending)}`);
  ok(after.barPending.length === 0, `${c.name}: no stale fraction is left in the bar beside the verdict`);

  // A build a designer must act on auto-expands its detail; a clean one stays collapsed (#483's rule).
  // Asserted because the misses live in the detail, and this suite exists because of the misses.
  if (c.verdictOpens) {
    ok(after.detail !== null && after.detail.length > 0, `${c.name}: the detail row is open, so the misses are readable without a click`);
    ok((after.detail ?? '').includes(c.msg.summary.slice(0, 24)), `${c.name}: the open detail carries the host's own summary`);
  } else {
    ok(after.detail === null, `${c.name}: a clean verdict leaves the detail collapsed — found ${JSON.stringify(after.detail)}`);
  }

  ok(errors.length === 0, `${c.name}: no console errors (${errors.slice(0, 2).join(' · ')})`);
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
  const options = await page.locator('.cw-row select option').evaluateAll((ns) => ns.map((n) => n.value));
  const other = options.find((v) => v !== 'button');
  ok(other !== undefined, `the picker offers a def other than Button, so this check can mean something (${JSON.stringify(options)})`);
  if (other) {
    await startBuild(page, other, `the non-default def '${other}'`);
    await post(page, { type: 'component-result', ok: true, headline: '✓ built', summary: `set '${other}'` });
    await page
      .waitForFunction(() => document.querySelector('.cw-row button.barbtn')?.textContent === '⊞ Build set', null, { timeout: 5000 })
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
  await page.locator('button.stage', { hasText: 'Brand hues & neutrals' }).first().click();
  await page.waitForFunction(() => !document.querySelector('.cw-row'));
  await post(page, { type: 'component-progress', phase: 'wire', done: 600, total: 648, chunkMs: 40 });
  await page.waitForFunction(() => /600 of 648/.test(document.body.textContent ?? ''), null, { timeout: 4000 }).catch(() => {});
  const away = await readSurfaces(page);
  ok(away.barPending.some((t) => /Wiring references… 600 of 648/.test(t ?? '')), `away from the page, the bar still reports progress — read ${JSON.stringify(away.barPending)}`);

  await post(page, { type: 'component-result', ok: true, headline: '✓ built 648', summary: "set 'Button': 648 variants" });
  await page.waitForFunction(() => [...document.querySelectorAll('.bar .applystat')].some((n) => (n.textContent ?? '').includes('✓ built 648')), null, { timeout: 5000 }).catch(() => {});
  const landed = await readSurfaces(page);
  ok(landed.barVerdict.some((t) => (t ?? '').includes('✓ built 648')), 'a verdict arriving off-page lands in the chrome, which is what survives navigation');

  await page.locator('button.stage', { hasText: 'Internal — build the Button set' }).first().click();
  await page.waitForSelector('.cw-row button.barbtn');
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
  await page.waitForFunction(() => document.querySelector('.cw-row button.barbtn')?.textContent === '⊞ Build set', null, { timeout: 5000 }).catch(() => {});
  await startBuild(page, undefined, 'the second of two builds');
  const second = await readSurfaces(page);
  ok(second.button === '⋯ Building…', 'a second build can be started from the resolved state');
  ok(second.pagePending.some((t) => /24 of 648/.test(t ?? '')), "the second build's progress reports too, rather than the first verdict staying put");
  await post(page, { type: 'component-result', ok: true, headline: '✓ 0 new, 648 present', summary: 'second run — idempotent' });
  await page.waitForFunction(() => document.querySelector('.cw-row button.barbtn')?.textContent === '⊞ Build set', null, { timeout: 5000 }).catch(() => {});
  const done = await readSurfaces(page);
  ok(done.pageVerdict.some((t) => (t ?? '').includes('✓ 0 new, 648 present')), "the second build's verdict replaces the first, rather than appending beside it");
  ok(done.pageVerdict.length === 1, `exactly one verdict pill on the page, not one per build — found ${done.pageVerdict.length}`);
  await page.close();
}

await browser.close();
server.close();

console.log(`\n${failed === 0 ? '✅' : '❌'} ${executed - failed} of ${executed} assertions pass`);
if (failed) {
  console.error(`\n${failed} failing:`);
  for (const f of failures) console.error(`  · ${f}`);
}
process.exit(failed === 0 ? 0 : 1);
