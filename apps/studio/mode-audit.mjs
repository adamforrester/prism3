/**
 * Mode-sensitivity audit — which sections actually respond to the mode bar.
 *
 * Run:  npm run -w @prism3/studio build && npm run -w @prism3/studio audit:modes
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
 * VERDICTS
 *   EDITS    — the control set/labels differ between modes. The bar is an EDITING SCOPE here.
 *   displays — only previews/readouts re-resolve. The bar is CONTEXT: useful, but not scoping an edit.
 *   inert    — nothing changes at all. The bar is claiming an axis the section does not have.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

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
                  // Two axes, because the badge now states two different things (#437): does this
                  // section vary per mode (measured here), and can anything in it be edited at all.
                  // A section that does not vary per mode but HAS a control edits one value every
                  // mode uses -- that is 'all-modes', not the same offer as an untouchable specimen.
                  expected: v.trim() === 'EDITS' ? 'per-mode' : s.hasControls ? 'all-modes' : 'none',
                  badge: s.badge, inset: s.inset, stage, skipped: s.skipped });
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
  for (const btn of await page.locator('.mctx-b.derived').all()) {
    const dlabel = (await btn.locator('.mctx-name').textContent())?.trim() ?? 'derived';
    await btn.click();
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
                    badge: match.badge, inset: match.inset, stage, skipped: match.skipped });
    }
  }
  // Leave every stage on a non-derived mode. `probeSection` below only re-clicks the `.stage` tab, not
  // a mode button, so if a derived-mode click above were the last thing done to the page, EVERY later
  // probe (including ones for unrelated, already-measured Light/Dark claims) would find its section
  // replaced by the generated-mode note and report a false `section-gone` — the derived-mode pass
  // breaking the very claims it was added to protect.
  if ((await page.locator('.mctx-b.derived').count()) > 0) {
    await page.locator('button').filter({ hasText: /^Light/ }).first().click();
    await page.waitForTimeout(500);
  }
}
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
  await page.locator('.stage').filter({ hasText: c.stage }).first().click();
  await page.waitForTimeout(500);
  return page.evaluate(({ secName, wantEditProof }) => {
    const KEY = 'prism3:brandInput';
    const COUNTED = 'input:not([disabled]):not([data-view-only]), select:not([disabled]):not([data-view-only]), textarea:not([disabled]):not([data-view-only])';
    const find = () => [...document.querySelectorAll('.psec')]
      .find((s) => (s.querySelector('.psec-t')?.textContent ?? '').trim() === secName);
    const tagOf = (e) => `${e.tagName.toLowerCase()}.${e.className || '-'}${e.type ? `[${e.type}]` : ''}`;
    // Nudge a control to a value it does not already hold, fire both events a handler might listen for,
    // and report whether changing anything was possible at all.
    const poke = (e) => {
      if (!e) return 'gone';
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

if (process.argv.includes('--check-badges')) {
  const bad = claims.filter((c) => c.badge !== c.expected);
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
  if (bad.length || flush.length || unproven.length) {
    console.log(`\n${bad.length + flush.length + unproven.length} mismatch(es).\n`);
    process.exit(1);
  }
  console.log(`   ✓ every badge matches what the page actually does, all ${claims.filter((c) => c.inset).length} sit inside their section padding,`
    + `\n     ${proved} editable section(s) provably move the brand, and ${quiet} skipped control(s) provably do not\n`);
}
await browser.close();
server.close();
