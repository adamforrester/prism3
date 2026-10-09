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
 *
 * ── AND §8, A SECOND SUBJECT IN THE SAME HARNESS (#1041) ────────────────────────────────────────
 *
 * The rendered legibility of this bundle — the only artifact whose shell once opted into `dark`, and the
 * only one with the plugin-only Components page. It lives here because this file already boots the panel
 * at the plugin's own sizes; its reasoning is at the section.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { hookGuard } from '../studio/test-hooks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// Every element below is LOCATED by its `data-p3` hook (F1), never by a class name or a page title. The
// guard fails any hook this file names that never rendered, by name (`../studio/test-hooks.mjs`).
const hooks = hookGuard(import.meta.url);
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

/** Figma's theme injection, stubbed (§8). With `themeColors: true` Figma marks the iframe's `<html>` with
 *  `figma-light` / `figma-dark` and defines `--figma-color-*` on it before the page's own scripts run. Done
 *  here in the SERVED document, as Figma does it, rather than from an init script — which runs before
 *  `<html>` exists. `?figma=<theme>` selects one; no query serves the bundle byte-for-byte, as every other
 *  section of this file expects. */
const FIGMA_THEMES = {
  light: { cls: 'figma-light', vars: { '--figma-color-bg': '#ffffff', '--figma-color-text': '#000000e5' } },
  dark: { cls: 'figma-dark', vars: { '--figma-color-bg': '#2c2c2c', '--figma-color-text': '#ffffff' } },
};
const themed = (theme) => {
  const t = FIGMA_THEMES[theme];
  const style = `<style id="figma-style">:root{${Object.entries(t.vars).map(([k, v]) => `${k}:${v}`).join(';')}}</style>`;
  const out = html.replace(/<html([^>]*)>/, `<html$1 class="${t.cls}">`).replace(/<head>/, `<head>${style}`);
  if (out === html) throw new Error('the Figma theme stub did not apply — dist/ui.html has no <html>/<head> to inject into');
  return out;
};
const server = createServer((req, res) => {
  const theme = new URL(req.url, 'http://x').searchParams.get('figma');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(theme && FIGMA_THEMES[theme] ? themed(theme) : html);
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
  await hooks.watch(page);
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
  const startview = q('[data-p3="start-screen"]');
  return {
    start: !!startview,
    heading: startview ? (q('[data-p3="start-heading"]')?.textContent ?? null) : null,
    fromColor: !!q('[data-p3="start-go"]'),
    startBlank: q('[data-p3="start-blank"]')?.textContent === 'Start blank',
    chips: [...document.querySelectorAll('[data-p3="start-example"]')].map((c) => c.textContent.trim()),
    upload: !!q('[data-p3="start-file"]'),
    // The editor's own surfaces — asserted positively so "nothing rendered" cannot pass as "hydrated".
    editorTabs: document.querySelectorAll('[data-p3="tab-row"] [role="tab"]').length,
    brandSel: q('[data-p3="brand-switcher"]')?.textContent ?? null,
  };
});

const waitStart = (page, want) =>
  page.waitForFunction((w) => !!document.querySelector('[data-p3="start-screen"]') === w, want, { timeout: 4000 })
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
  ok(s.heading === 'Start a brand in this file', `the heading is the plugin's (owner decision G17): "${s.heading}"`);
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
  ok(s.editorTabs > 0, `the editor rendered — ${s.editorTabs} tabs`);
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
  // Kept, not discarded: the start screen seen here by the same probe is what makes "no start screen"
  // below a measurement rather than a lookup that finds nothing (#1831).
  const sawStart = await waitStart(page, true);
  await hooks.click(page.locator('[data-p3="start-example"]').first());
  await waitStart(page, false);
  await post(page, { type: 'restore-input-empty' });
  // Give the handler a turn to do the wrong thing before asserting it did not.
  await page.waitForTimeout(150);
  const s = await readStart(page);
  hooks.absent(ok, { seen: sawStart, state: 'the start screen, earlier in this same panel' },
    !s.start, 'a late empty-restore does NOT discard a brand the designer already chose');
  ok(s.editorTabs > 0, 'and the editor is still standing');
  await page.close();
}

// ── §4 — "+ New brand" returns to the start moment ─────────────────────────────────────────────
console.log('\n4. "+ New brand" surfaces the start screen (it used to load a neutral default in place)');
{
  const { page, errors } = await openPanel();
  await post(page, { type: 'restore-input', input: NB_BRAND });
  await waitStart(page, false);
  await hooks.click(page.locator('[data-p3="brand-switcher"]').first());
  await hooks.need(page, '[data-p3="brand-menu"]');
  const nb = page.locator('[data-p3="brand-menu-new"]');
  ok(await nb.count() > 0 && (await nb.textContent()) === '+ New brand', 'the brand menu offers "+ New brand"');
  await hooks.click(nb);
  ok(await waitStart(page, true), 'clicking it returns to the start moment');
  const s = await readStart(page);
  ok(s.upload && s.chips.length >= 2, 'with the upload and the examples the direct load could not offer');
  ok(errors.length === 0, `no console errors (${errors.slice(0, 1).join('') || 'none'})`);
  await page.close();
}

// ── §4b — "+ New brand" before the host answers (UI redesign S12, the #1197 / #1200 trap) ──────────────
// Reopening the start changes no origin, so the identity guard still reads "nothing chosen" until the designer picks a
// path. Both orders the host can answer in are held: an empty file turns the reopened start into the first run (no
// Close, nothing to go back to), and a file with a brand loads it and closes the start.
console.log('\n4b. "+ New brand" before the host answers, then either answer');
{
  const { page, errors } = await openPanel();
  await hooks.click(page.locator('[data-p3="brand-switcher"]').first());
  await hooks.click(page.locator('[data-p3="brand-menu-new"]'));
  ok(await waitStart(page, true), 'the start reopens before the host has answered');
  ok(await page.locator('[data-p3="start-close"]').count() === 1, 'and, reopened, it offers Close');
  await post(page, { type: 'restore-input-empty' });
  await page.waitForFunction(() => !document.querySelector('[data-p3="start-close"]'), null, { timeout: 4000 }).catch(() => {});
  const s = await readStart(page);
  ok(s.start && await page.locator('[data-p3="start-close"]').count() === 0, 'an empty file then makes it the first run: the start stays, with no Close');
  ok(errors.length === 0, `no console errors (${errors.slice(0, 1).join('') || 'none'})`);
  await page.close();
}
{
  const { page } = await openPanel();
  await hooks.click(page.locator('[data-p3="brand-switcher"]').first());
  await hooks.click(page.locator('[data-p3="brand-menu-new"]'));
  await waitStart(page, true);
  await post(page, { type: 'restore-input', input: NB_BRAND });
  ok(await waitStart(page, false), 'a file with a brand then loads it, and the start closes');
  ok(((await readStart(page)).brandSel ?? '').includes('restored-brand'), 'the file\'s brand is the working brand');
  await page.close();
}

// ── §5 — the paths actually leave the start screen ─────────────────────────────────────────────
console.log('\n5. each path lands in the editor');
{
  const { page } = await openPanel();
  await post(page, { type: 'restore-input-empty' });
  await waitStart(page, true);
  await hooks.click(page.locator('[data-p3="start-example"]').first());
  ok(await waitStart(page, false), 'an example chip enters the editor');
  ok((await readStart(page)).editorTabs > 0, 'and the editor rendered');
  await page.close();
}
{
  const { page } = await openPanel();
  await post(page, { type: 'restore-input-empty' });
  await waitStart(page, true);
  await hooks.click(page.locator('[data-p3="start-blank"]'));
  ok(await waitStart(page, false), '"Start blank" enters the editor');
  await page.close();
}
{
  const { page } = await openPanel();
  await post(page, { type: 'restore-input-empty' });
  await waitStart(page, true);
  // The owner's specific want: a real design.md, uploaded through the plugin's own file input.
  const md = resolve(REPO, 'packages/engine/examples/harbor.design.md');
  await page.setInputFiles('[data-p3="start-file"]', md);
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
    const c = document.querySelector('[data-p3="start-column"]').getBoundingClientRect();
    const doc = document.documentElement;
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= doc.clientWidth; };
    return {
      hOverflow: doc.scrollWidth - doc.clientWidth,
      clippedTop: c.top < 0,
      reachable: doc.scrollHeight >= Math.round(c.bottom),
      controlsInView: [...document.querySelectorAll('[data-p3="start-go"], [data-p3="start-blank"], [data-p3="start-example"], [data-p3="start-upload"]')].every(inView),
      cards: document.querySelectorAll('[data-p3="start-path"]').length,
    };
  });
  const at = `${vp.width}×${vp.height}`;
  ok(m.hOverflow === 0, `${at}: no horizontal overflow (${m.hOverflow}px)`);
  ok(!m.clippedTop, `${at}: the column is not clipped by the centering`);
  ok(m.reachable, `${at}: the whole column is scrollable into view`);
  ok(m.controlsInView, `${at}: every control sits inside the viewport width`);
  // Three cards since the owner's answer N1 A: "Start blank" is the color card's secondary action, so four paths in three.
  ok(m.cards === 3, `${at}: all four paths render in three cards (${m.cards})`);
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

// ── §8 — the built panel is LEGIBLE, in both schemes and both Figma themes (#1041) ─────────────
//
// WHY HERE. `apps/studio/test-smoke.mjs` measures what the web bundle renders, and it cannot see this
// artifact: the web shell declares no `color-scheme`, so the UA resolves light whatever the host
// prefers, and #1031's defect — the UA supplying near-white field ink over a light field, 1.11:1 in
// Figma's dark theme — needs a shell that opts into dark. THIS shell is the one that did. It is also
// the only bundle with the Components page (`figmaOnly`), which no studio sweep can reach. This file
// already boots `dist/ui.html` at the plugin's own sizes, so the missing thing was the measurement,
// not a harness (#1041's review comment).
//
// TWO ARMS, and the split is the one #1046 settled by mutation for the studio shell:
//   · DIRECT — the shell's RESOLVED `color-scheme` must not name `dark`. This is the arm that fails the
//     moment `color-scheme: light dark` comes back to `src/ui/index.html`. A ratio walk alone would NOT:
//     every control now carries an author `color`, so re-opting into dark moves no ratio (measured at
//     15.97:1 in both schemes on #1041), and the regression would sit green until some later control
//     omitted its `color`.
//   · RATIO — every rendered text node and form control against the bar the studio sweep holds the same
//     node to: chrome at WCAG 1.4.3 (4.5:1, 3:1 large), a field's caret at 1.4.11's 3:1, specimens at
//     the 2.0:1 "invisible" floor they keep in the studio until #779's specimen-contract decision. That is
//     the compound tripwire for a new control that omits `color`, and the one place the plugin-only
//     page is measured at all.
//
// THE FIGMA THEME IS STUBBED, BOTH WAYS. Figma injects `--figma-color-*` custom properties into the
// iframe (`themeColors: true` in `src/main.ts`) and marks `<html>` with `figma-light` / `figma-dark`.
// They are not UA-resolved, so #1031's fix did not touch them, and the shell's `body` reads two of them.
// A harness that never sets them measures a panel no designer sees; this one sets Figma's own light and
// dark values for the two the shell reads, crossed with the emulated OS scheme, because the two are set
// independently on a real machine.
//
// THE PROBE IS A SECOND COPY of `LEGIBILITY_PROBE` in `apps/studio/test-smoke.mjs`, deliberately: that
// file runs its sweep on import, so it cannot export the function, and moving the probe into a shared
// module would restructure the studio's gate in a lane about the plugin's. The two must agree on what
// "drawn" means — in particular, NEITHER carries the old `op < 0.02` carve-out (#1069): a node at
// near-zero opacity is measured, composites to ~1:1, and fails.
console.log('\n8. the built panel is legible in both schemes and both Figma themes (#1041)');
{
  const LEGIBILITY = () => {
    /** Every computed color this probe could not read, by node and property (review of #1777). A node whose
     *  ink or ground could not be parsed used to be dropped by `if (!col) continue` — uncounted, the same
     *  silence as #1069's carve-out by another route — so it is RECORDED here and the suite fails on it by name.
     *
     *  Chrome serializes hex, named and `rgb()` colors as `rgb[a](…)`, but a `color-mix()` in sRGB as
     *  `color(srgb …)`, and `oklch()` / `lab()` / mixes in other spaces in their own notation. Anything not
     *  already sRGB is converted BY THE BROWSER — relative color syntax, `color(from <c> srgb r g b / alpha)`,
     *  on a scratch node — so this reads what Chrome paints rather than re-implementing color spaces. Channels
     *  outside the sRGB gamut are clipped, which is what the display does with them. */
    const unparsed = [];
    let scratch = null;
    const toSrgb = (s) => {
      if (!scratch) { scratch = document.createElement('i'); scratch.style.display = 'none'; document.body.append(scratch); }
      scratch.style.color = '';
      scratch.style.color = `color(from ${s} srgb r g b / alpha)`;
      return scratch.style.color ? getComputedStyle(scratch).color : '';
    };
    const parseSrgb = (s) => {
      let m = /^rgba?\(([^)]+)\)$/.exec(s);
      if (m) { const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
      m = /^color\(srgb\s+([^)]+)\)$/.exec(s);
      if (m) {
        const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
        const ch = (v) => Math.min(255, Math.max(0, v * 255));
        return { r: ch(p[0]), g: ch(p[1]), b: ch(p[2]), a: p.length > 3 ? Math.min(1, Math.max(0, p[3])) : 1 };
      }
      return null;
    };
    const parse = (s, el, prop) => {
      const v = (s ?? '').trim();
      const c = parseSrgb(v) ?? (v ? parseSrgb(toSrgb(v)) : null);
      if (!c || [c.r, c.g, c.b, c.a].some((n) => !Number.isFinite(n))) {
        if (el) unparsed.push({ cls: name(el), prop, value: v.slice(0, 60) });
        return null;
      }
      return c;
    };
    const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const lum = (c) => {
      const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const groundOf = (el) => {
      let acc = null;
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        const c = parse(cs.backgroundColor, n, 'background-color');
        if (c && c.a > 0) {
          const layer = { ...c, a: c.a * Number(cs.opacity) };
          acc = acc ? over(acc, layer) : layer;
          if (acc.a >= 0.999) return { ...acc, a: 1 };
        }
      }
      const white = { r: 255, g: 255, b: 255, a: 1 };
      return acc ? over(acc, white) : white;
    };
    const drawn = (el, cs) => {
      if (cs.visibility === 'hidden' || cs.display === 'none') return null;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      let op = 1;
      for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
      return op;
    };
    const round = (n) => Math.round(n * 100) / 100;
    const name = (el) => `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className : '').trim().replace(/\s+/g, '.') || '-'}`;
    const classify = (el, cs) => ({ px: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), specimen: el.closest('[data-specimen]') !== null });
    /** The control a node sits in when that control is really disabled (X4 A), `:disabled` or `aria-disabled="true"`,
     *  never by class or hook: its element, classes, colors and four edges, whether it carries the disabled property or
     *  `aria-disabled`, whether focus takes, and, for one that does take focus, whether activating it (`click()`)
     *  changes it or anything the page stores. A running write's control (`aria-busy`) is never activated here. */
    const offSeen = new Map();
    const offControl = (el) => {
      const c = el.closest('button, [role="button"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitemradio"], a[href]');
      if (!c || !(c.matches(':disabled') || c.getAttribute('aria-disabled') === 'true')) return null;
      if (offSeen.has(c)) return offSeen.get(c);
      const cs = getComputedStyle(c);
      const prev = document.activeElement;
      c.focus();
      const focusable = document.activeElement === c;
      if (focusable) { c.blur(); prev?.focus?.(); }
      let clickChanged = null;
      if (focusable && c.getAttribute('aria-busy') !== 'true') {
        // What an activation could move, as `test:chrome`'s check reads it: the control, what the page stores, the place
        // shown, whether the start window is up, and which windows and menus are open.
        const snap = () => JSON.stringify([c.outerHTML, Object.entries(localStorage), document.querySelector('[data-p3="frame"]')?.dataset.place ?? null,
          !!document.querySelector('[data-p3="start-screen"]'), [...document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"]')]
            .filter((d) => d.getClientRects().length).map((d) => d.getAttribute('data-p3') ?? d.getAttribute('role'))]);
        const before = snap();
        HTMLElement.prototype.click.call(c);
        clickChanged = snap() !== before;
      }
      const o = {
        tag: c.tagName.toLowerCase(), cls: typeof c.className === 'string' ? c.className : '', hook: c.getAttribute('data-p3'), checked: c.getAttribute('aria-checked'),
        prop: c.disabled === true, aria: c.getAttribute('aria-disabled') === 'true', focusable, clickChanged,
        fill: cs.backgroundColor, ink: cs.color, edges: ['Top', 'Right', 'Bottom', 'Left'].map((x) => [cs[`border${x}Color`], cs[`border${x}Style`], parseFloat(cs[`border${x}Width`])]),
      };
      offSeen.set(c, o);
      return o;
    };
    const text = [];
    for (const el of document.querySelectorAll('*')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el);
      const op = drawn(el, cs);
      if (op === null) continue;
      const col = parse(cs.color, el, 'color');
      if (!col) continue;   // recorded in `unparsed`, which fails by name
      const ground = groundOf(el);
      text.push({
        offCtl: offControl(el), ink: cs.color, canary: el.closest('[data-ccanary]') !== null,
        ratio: round(ratio(over({ ...col, a: col.a * op }, ground), ground)), op: round(op), cls: name(el),
        text: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').slice(0, 40),
        inlineInk: (() => { for (let n = el; n; n = n.parentElement) if (n.style?.color) return true; return false; })(),
        shared: el.closest('#app') !== null,
        hook: el.getAttribute('data-p3'),
        ...classify(el, cs),
      });
    }
    const CHROMELESS = new Set(['checkbox', 'radio', 'range', 'color', 'file', 'image', 'hidden', 'submit', 'reset', 'button']);
    const fields = [];
    for (const el of document.querySelectorAll('input, textarea, select')) {
      if (el.tagName === 'INPUT' && CHROMELESS.has(el.type)) continue;
      const cs = getComputedStyle(el);
      const op = drawn(el, cs);
      if (op === null) continue;
      const col = parse(cs.color, el, 'color');
      if (!col) continue;   // recorded in `unparsed`, which fails by name
      const ground = groundOf(el);
      const caret = el.tagName === 'SELECT' ? null : parse(cs.caretColor, el, 'caret-color');
      // A transparent caret on an editable field is an invisible caret (1:1), not "no caret".
      const editable = el.tagName !== 'SELECT' && !el.readOnly && !el.disabled;
      // OFF (F1 A): really disabled, `:disabled` or `aria-disabled="true"`, never by class or hook; with its colors and
      // whether focus takes, so Node can hold an exempted field to the exemption's conditions.
      const off = el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true';
      let focusable = null;
      if (off) {
        const prev = document.activeElement;
        el.focus();
        focusable = document.activeElement === el;
        if (focusable) { el.blur(); prev?.focus?.(); }
      }
      fields.push({
        off, focusable, canary: el.hasAttribute('data-ccanary'), disabledProp: el.disabled === true, ariaDisabled: el.getAttribute('aria-disabled') === 'true',
        fill: cs.backgroundColor, ink: cs.color,
        edges: ['Top', 'Right', 'Bottom', 'Left'].map((x) => [cs[`border${x}Color`], cs[`border${x}Style`]]),
        ratio: round(ratio(over({ ...col, a: col.a * op }, ground), ground)),
        caretRatio: !editable || !caret ? null : round(ratio(over({ ...caret, a: caret.a * op }, ground), ground)),
        op: round(op), cls: name(el), text: `[${el.tagName === 'INPUT' ? el.type : el.tagName.toLowerCase()}] "${String(el.value ?? '').slice(0, 20)}"`,
        hook: el.getAttribute('data-p3'),
        // #1031's first half, per field: the scheme the UA resolves for this control, and how light the
        // ground it is drawn on is. A dark scheme over a light ground is the mechanism exactly.
        scheme: cs.colorScheme, groundLum: round(lum(ground)),
        ...classify(el, cs),
      });
    }
    scratch?.remove();
    return { text, fields, unparsed, scheme: getComputedStyle(document.documentElement).colorScheme };
  };

  // The bars, AUTHORED here as WCAG states them — not imported from the studio suite, so a change to one
  // side's number is a disagreement, not a silent shared move.
  const TEXT_MIN = 4.5, LARGE_TEXT_MIN = 3, CARET_MIN = 3, SPECIMEN_FLOOR = 2.0;
  const isLarge = (r) => r.px >= 24 || (r.px >= 18.66 && r.weight >= 700);
  const barOf = (r) => (r.specimen ? SPECIMEN_FLOOR : isLarge(r) ? LARGE_TEXT_MIN : TEXT_MIN);
  const caretBarOf = (f) => (f.specimen ? SPECIMEN_FLOOR : CARET_MIN);
  /**
   * THE CONTRAST EXEMPTION FOR INACTIVE FIELDS (owner decision F1 A, 2026-10-05). WCAG 2.2 exempts a component that
   * is not available for user interaction from SC 1.4.3 and 1.4.11, and the owner decided that a disabled text field
   * in the chrome draws Prism3's own disabled text field skin exactly, under the text bar on purpose (about 3.05:1).
   * The full exemption lives in `apps/studio/test-chrome.mjs` (`checkExempt`); this is the same rule on this walk. A
   * chrome field is exempt only when it is REALLY DISABLED (`:disabled` or `aria-disabled="true"`, never a class or
   * hook) and under its bar; each exempted one is asserted, by name, to carry the disabled property or `aria-disabled`,
   * to take no focus, and to draw `color.disabled.fill`, a solid `color.disabled.border` edge and `color.disabled.on-fill`
   * ink for the chrome theme, read here from the committed default theme emission, never from the CSS.
   */
  const PRISM3_DISABLED = (() => {
    const out = resolve(REPO, 'packages/engine/out');
    const base = JSON.parse(readFileSync(resolve(out, 'prism3.tokens.json'), 'utf8'));
    const root = Object.keys(base).find((k) => !k.startsWith('$'));
    const leafAt = (tree, path) => path.split('.').reduce((n, k) => n?.[k], tree);
    const dark = structuredClone(base);
    const put = (src, dst) => { for (const [k, v] of Object.entries(src)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) dst[k] = v; else put(v, dst[k] ??= {}); } };
    put(JSON.parse(readFileSync(resolve(out, 'prism3.dark.overlay.tokens.json'), 'utf8')), dark);
    const hex = (tree, path, seen = 0) => {
      const v = leafAt(tree, path)?.$value;
      if (typeof v !== 'string' || seen > 20) return null;
      const m = /^\{(.+)\}$/.exec(v);
      return m ? hex(tree, m[1], seen + 1) : v.toLowerCase();
    };
    // X4 A: the two roles the button definitions bind and the text field does not, `disabled.text` and `disabled.icon`.
    const skin = (tree) => ({ fill: hex(tree, `${root}.color.disabled.fill`), edge: hex(tree, `${root}.color.disabled.border`), ink: hex(tree, `${root}.color.disabled.on-fill`),
      text: hex(tree, `${root}.color.disabled.text`), icon: hex(tree, `${root}.color.disabled.icon`) });
    return { light: skin(base), dark: skin(dark) };
  })();
  /**
   * THE CONTRAST EXEMPTION FOR INACTIVE BUTTONS (owner decision X4 A, 2026-10-05, #2155), this walk's own copy. A
   * disabled chrome button draws Prism3's own disabled button for its appearance, typed here from the engine's
   * definitions (`button.ts`, `icon-button.ts`): filled on the disabled fill with the on-fill ink and no edge; outline
   * (the page-colored button: the start's Import while the paste box is empty) with no fill, a solid `disabled.icon`
   * edge and the label on `disabled.text`; text (a ghost button, the mode check) the same with no edge. A chrome text
   * node is exempt only when the control it sits in is REALLY DISABLED (`:disabled` or `aria-disabled="true"`, never a
   * class, hook, color or cursor) and the node is under its bar; each exempted node is asserted, by name, to sit in a
   * control that carries the disabled property or `aria-disabled`, takes no focus or changes nothing when activated,
   * and draws its appearance's roles, the node's own ink included, read from the emission, never from the CSS.
   */
  const DISABLED_APPEARANCE = (o) => {
    if (['input', 'select', 'textarea'].includes(o.tag)) return 'field';
    const c = new Set(o.cls.split(/\s+/));
    // The preview's mode control, held on Palettes (#2321): a segment takes the skin of what it draws at rest. The one
    // selected draws an edge, so outline; the others draw none, so text (as X4 A maps the outline and ghost buttons).
    if (c.has('p3-mode')) return o.checked === 'true' ? 'outline' : 'text';
    if (['p3-btn-primary', 'p3-next', 'p3-btn-danger'].some((k) => c.has(k))) return 'filled';
    if (['p3-btn-ghost', 'p3-check'].some((k) => c.has(k))) return 'text';
    return 'outline';
  };
  const DISABLED_SKIN = (appearance, scheme) => {
    const d = PRISM3_DISABLED[scheme];
    if (!d) return null;
    return {
      field: { fill: d.fill, edge: d.edge, ink: d.ink },
      filled: { fill: d.fill, edge: 'none', ink: d.ink },
      outline: { fill: 'none', edge: d.icon, ink: d.text },
      text: { fill: 'none', edge: 'none', ink: d.text },
    }[appearance];
  };
  const paintOf = (x) => {
    const m = /^rgba?\(([^)]+)\)$/.exec((x ?? '').trim());
    if (!m) return String(x);
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (p.length > 3 && p[3] === 0) return 'none';
    if (p.length > 3 && p[3] !== 1) return String(x);
    return `#${p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  };
  const drawnSkin = (o) => {
    const sides = o.edges.filter(([c, st, wd]) => st !== 'none' && wd > 0 && paintOf(c) !== 'none');
    const colors = [...new Set(sides.map(([c]) => paintOf(c)))];
    const styles = [...new Set(sides.map(([, st]) => st))];
    const edge = !sides.length ? 'none' : sides.length === 4 && colors.length === 1 && styles.join() === 'solid' ? colors[0] : `${sides.length} side(s) ${colors.join('/')} ${styles.join('/')}`;
    return { fill: paintOf(o.fill), edge, ink: paintOf(o.ink) };
  };
  /** Every button exemption granted this run: [where, hook or class]. Floored on the start moment, and printed. */
  const BUTTON_EXEMPTIONS = [];
  const isExemptText = (r) => !!r.offCtl && !r.specimen && r.ratio < barOf(r);
  /** The canary (F1 A, X4 A, #2174): beside the real disabled control `sel`, a copy that is NOT disabled and carries,
   *  inline, EVERY computed style of the real control and of each element inside it (its class and hook too). */
  const PLANT_CANARY = (sel) => {
    // What a copy may differ in and still be a lookalike: the size its place in the row gives it (and the origins that
    // follow from that size), a shorthand that serializes differently from the same longhands, and a non-standard one.
    const CANARY_LAYOUT = new Set(['width', 'height', 'inline-size', 'block-size', 'transform-origin', 'perspective-origin', 'text-decoration', 'app-region']);
    const src = document.querySelector(sel);
    if (!src) return { planted: false };
    const c = src.cloneNode(true);
    const from = [src, ...src.querySelectorAll('*')], to = [c, ...c.querySelectorAll('*')];
    from.forEach((n, i) => { const cs = getComputedStyle(n); for (const p of cs) to[i].style.setProperty(p, cs.getPropertyValue(p)); });
    c.disabled = false;
    for (const a of ['disabled', 'aria-disabled', 'id']) c.removeAttribute(a);
    c.setAttribute('data-ccanary', '');
    src.after(c);
    const a = getComputedStyle(src), b = getComputedStyle(c);
    return { planted: true, live: !c.matches(':disabled') && c.getAttribute('aria-disabled') !== 'true',
      differ: [...a].filter((p) => !CANARY_LAYOUT.has(p) && a.getPropertyValue(p) !== b.getPropertyValue(p)).slice(0, 6) };
  };
  const hexOfRgb = (x) => {
    const m = /^rgba?\(([^)]+)\)$/.exec((x ?? '').trim());
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (p.length > 3 && p[3] !== 1) return null;
    return `#${p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  };
  /** Every field exemption granted this run: [where, hook]. Floored on the Layout tab after the sweep, and printed. */
  const FIELD_EXEMPTIONS = [];
  const fieldFails = (f) => f.ratio < barOf(f) || (f.caretRatio !== null && f.caretRatio < caretBarOf(f));
  const isExemptField = (f) => f.off && !f.specimen && fieldFails(f);
  // Non-empty floors. A state that measured almost nothing fails naming itself rather than passing as
  // "every one of 0 nodes clears 4.5:1" — #779's first defect, which this file would otherwise repeat.
  const STATE_TEXT_FLOOR = 10;
  const SWEEP_TEXT_FLOOR = 2000;
  const SWEEP_FIELD_FLOOR = 20;

  // The panel's sizes, READ from the host source rather than restated, so a change to either is a
  // change to what this measures.
  const hostSrc = readFileSync(resolve(REPO, 'apps/plugin/src/main.ts'), 'utf8');
  const sizeOf = (nm) => {
    const m = new RegExp(`const ${nm} = \\{ width: (\\d+), height: (\\d+) \\}`).exec(hostSrc);
    return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
  };
  const DEFAULT = sizeOf('DEFAULT_SIZE'), MIN = sizeOf('MIN_SIZE');
  ok(DEFAULT !== null && MIN !== null, `read the panel's sizes from src/main.ts — default ${DEFAULT?.width}×${DEFAULT?.height}, min ${MIN?.width}×${MIN?.height}`);

  const openThemed = async (viewport, scheme, theme) => {
    const context = await browser.newContext({ viewport, colorScheme: scheme });
    const page = await context.newPage();
    await hooks.watch(page);
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${ORIGIN}/?figma=${theme}`, { waitUntil: 'load' });
    await page.waitForSelector('#app', { state: 'attached' });
    // The stub LANDED — read back from the rendered document, not assumed from the request (docs/34
    // shape 19: a mutation of the environment that did not apply looks exactly like a clean run).
    const got = await page.evaluate(() => ({
      cls: document.documentElement.className,
      bg: getComputedStyle(document.documentElement).getPropertyValue('--figma-color-bg').trim(),
    }));
    ok(got.cls.includes(FIGMA_THEMES[theme].cls) && got.bg === FIGMA_THEMES[theme].vars['--figma-color-bg'],
      `${scheme} scheme / Figma ${theme}: the panel carries Figma's ${theme} theme (class "${got.cls}", --figma-color-bg ${got.bg || 'unset'})`);
    return { context, page, errors };
  };
  // Finite running animations finish first — what stays on screen, not a frame of a transition (#1069) —
  // CAPPED, and a tripped cap fails naming what was still moving (review of #1777: a 1000s transition hung
  // the uncapped wait with no message, and CI sets no timeout).
  const SETTLE_CAP_MS = 5000;
  const settle = async (page, where) => {
    const stuck = await page.evaluate((cap) => {
      const live = document.getAnimations()
        .filter((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming?.().endTime));
      const label = (a) => {
        const t = a.effect?.target;
        return `${a.animationName ?? a.transitionProperty ?? 'animation'} on ${t ? `${t.tagName.toLowerCase()}.${String(t.className ?? '').trim().replace(/\s+/g, '.') || '-'}` : '?'}`;
      };
      const done = Promise.all(live.map((a) => a.finished.catch(() => null))).then(() => []);
      const capped = new Promise((r) => setTimeout(() => r(live.filter((a) => a.playState === 'running').map(label)), cap));
      return Promise.race([done, capped]);
    }, SETTLE_CAP_MS);
    ok(stuck.length === 0, `${where}: every finite animation settles within ${SETTLE_CAP_MS}ms before measuring${
      stuck.length ? ` — still running: ${stuck.slice(0, 3).join(' | ')}` : ''}`);
  };

  let unparsedTotal = 0;
  let textTotal = 0, fieldTotal = 0, worst = { ratio: Infinity, where: '' };
  const pagesSeen = new Set();
  /** A small file for the Build style guides page, typed here: one table of each kind, so every option group draws. */
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
  const tabsSeen = new Set();
  /** The moved tabs the sweep measures (S8.2), each by its tab's hook and its levers' hook. Literal. */
  const TAB_SWEEP = [
    ['[data-p3="tab-color"]', '[data-p3="palettes-levers"]', 'Color'], ['[data-p3="tab-type"]', '[data-p3="type-levers"]', 'Type'],
    ['[data-p3="tab-shape"]', '[data-p3="shape-levers"]', 'Shape'], ['[data-p3="tab-depth"]', '[data-p3="depth-levers"]', 'Depth & motion'],
    ['[data-p3="tab-layout"]', '[data-p3="layout-levers"]', 'Layout'], ['[data-p3="tab-components"]', '[data-p3="components-levers"]', 'Components'],
  ];
  const measure = async (page, where) => {
    await settle(page, where);
    const m = await page.evaluate(LEGIBILITY);
    // Every color READ — an unparsed one fails naming the node, never a silent skip (review of #1777).
    const uniq = [...new Map(m.unparsed.map((u) => [`${u.cls}|${u.prop}|${u.value}`, u])).values()];
    unparsedTotal += uniq.length;
    ok(uniq.length === 0, `${where}: every computed color the probe met was parsed${
      uniq.length ? ` — ${uniq.length} not: ${uniq.slice(0, 3).map((u) => `${u.cls} ${u.prop} "${u.value}"`).join(' | ')}` : ''}`);
    textTotal += m.text.length; fieldTotal += m.fields.length;
    for (const r of m.text.filter((x) => !x.specimen && !isExemptText(x))) if (r.ratio < worst.ratio) worst = { ratio: r.ratio, where: `${where} — ${r.cls} "${r.text}"` };
    // #1031's FIRST HALF. Until UI redesign S1.2 this read the document, which had to resolve light. The
    // chrome now follows Figma's theme for real, so in Figma's dark theme the document resolves dark, and
    // the line held is the one #1031 was about: no control resolves a dark scheme over a light ground, and
    // the legacy frame, whose surfaces are still painted from light tokens, resolves light.
    const mismatched = m.fields.filter((f) => /\bdark\b/.test(f.scheme) && f.groundLum > 0.5);
    ok(mismatched.length === 0,
      `${where}: no form control resolves a dark color-scheme over a light ground — that hands the UA the field ink, caret and option lists (#1031)${mismatched.length ? ` — ${mismatched.slice(0, 3).map((f) => `${f.hook ?? f.cls} "${f.scheme}" on a ground at luminance ${f.groundLum}`).join(' | ')}` : ''}`);
    ok(m.text.length >= STATE_TEXT_FLOOR, `${where}: measured ${m.text.length} text nodes (floor ${STATE_TEXT_FLOOR})`);
    // X4 A: a label in a really disabled button, under its bar, is exempt as an inactive component, and held here instead.
    const exemptText = m.text.filter(isExemptText);
    for (const r of exemptText) {
      const c = r.offCtl;
      BUTTON_EXEMPTIONS.push([where, c.hook ?? c.cls]);
      ok((c.prop || c.aria) && (c.focusable === false || (c.aria && c.clickChanged === false)),
        `${where}: the exempted "${r.text}" sits in a disabled control, ${c.hook ?? c.cls}, that takes no focus or changes nothing when activated (disabled ${c.prop}, aria-disabled ${c.aria}, took focus ${c.focusable}, activation changed ${c.clickChanged})`);
      const appearance = DISABLED_APPEARANCE(c);
      const want = DISABLED_SKIN(appearance, m.scheme);
      const got = { ...drawnSkin(c), label: paintOf(r.ink) };
      ok(!!want && got.fill === want.fill && got.edge === want.edge && got.ink === want.ink && got.label === want.ink,
        `${where}: the exempted "${r.text}" in ${c.hook ?? c.cls} draws Prism3's disabled ${appearance} roles for the ${m.scheme} chrome (want fill ${want?.fill}, edge ${want?.edge}, ink ${want?.ink}; drew ${JSON.stringify(got)})`);
    }
    const textUnder = m.text.filter((r) => r.ratio < barOf(r) && !exemptText.includes(r));
    ok(textUnder.length === 0, `${where}: every one of ${m.text.length} text nodes meets its bar (chrome ${TEXT_MIN}:1, ${LARGE_TEXT_MIN}:1 large; specimens ${SPECIMEN_FLOOR}:1)${
      textUnder.length ? ` — ${textUnder.slice(0, 3).map((u) => `${u.cls} "${u.text}" at ${u.ratio}:1 (${u.px}px/${u.weight}, op ${u.op}, needs ${barOf(u)}:1)`).join(' | ')}` : ''}`);
    const under = m.fields.filter(fieldFails);
    const exempt = under.filter(isExemptField);
    const want = PRISM3_DISABLED[m.scheme];
    for (const f of exempt) {
      FIELD_EXEMPTIONS.push([where, f.hook ?? f.cls]);
      ok((f.disabledProp || f.ariaDisabled) && f.focusable === false,
        `${where}: the exempted field ${f.cls} ${f.text} is disabled and takes no focus (disabled ${f.disabledProp}, aria-disabled ${f.ariaDisabled}, took focus ${f.focusable})`);
      const got = { fill: hexOfRgb(f.fill), edge: [...new Set(f.edges.map(([c]) => hexOfRgb(c)))].join(' '), style: [...new Set(f.edges.map(([, st]) => st))].join(' '), ink: hexOfRgb(f.ink) };
      ok(!!want && got.fill === want.fill && got.edge === want.edge && got.style === 'solid' && got.ink === want.ink,
        `${where}: the exempted field ${f.cls} ${f.text} draws Prism3's disabled roles for the ${m.scheme} chrome: fill color.disabled.fill ${want?.fill}, a solid edge color.disabled.border ${want?.edge}, ink color.disabled.on-fill ${want?.ink} (drew ${JSON.stringify(got)})`);
    }
    const fieldUnder = under.filter((f) => !exempt.includes(f));
    ok(fieldUnder.length === 0, `${where}: every one of ${m.fields.length} form control(s) inks its value at its text bar and its caret at ${CARET_MIN}:1${
      fieldUnder.length ? ` — ${fieldUnder.slice(0, 3).map((u) => `${u.cls} ${u.text} at ${u.ratio}:1 (needs ${barOf(u)}:1), caret ${u.caretRatio ?? 'n/a'}:1 (needs ${caretBarOf(u)}:1)`).join(' | ')}` : ''}`);
    // The marker audit, as in the studio sweep: inside the SHARED UI (`#app`), inline ink is what
    // specimens paint with and chrome does not, so an unmarked inline-inked node there is a specimen held
    // to AA or chrome someone mis-classified. Scoped to `#app` because the plugin's own entry mounts one
    // piece of chrome beside it — the Agent link chip (`src/agent-link-ui.ts`), inked inline by design and
    // held to the chrome bar like any other chrome node.
    const unmarked = m.text.filter((r) => r.shared && r.inlineInk && !r.specimen);
    ok(unmarked.length === 0, `${where}: every inline-inked text node is marked data-specimen${unmarked.length ? ` — ${unmarked.slice(0, 3).map((u) => `${u.cls} "${u.text}"`).join(' | ')}` : ''}`);
    return m;
  };
  // The brand menu's control BY IDENTITY — the surface #1031's 1.11:1 lived on, in this bundle. A pass that
  // never opens it is a clean report over a corpus that excludes the defect (docs/34 shape 9), which is the
  // first of the two reasons the studio suite missed #1031. UI redesign S3 moved the Name and Namespace fields
  // to Brand › Identity, so the menu keeps the import textarea, and Brand's two fields are measured on Brand.
  const BRANDMENU_CONTROLS = ['[data-p3="import-text"]'].map(hooks.role);
  const measureBrandMenu = async (page, where) => {
    await hooks.click(page.locator('[data-p3="brand-switcher"]'));
    await hooks.need(page, '[data-p3="brand-menu"] [data-p3="brand-menu-import"]');
    await hooks.click(page.locator('[data-p3="brand-menu"] [data-p3="brand-menu-import"]'));
    await hooks.need(page, '[data-p3="brand-menu"] [data-p3="import-text"]');
    // Typed into, so the field measures glyphs that are on screen rather than an empty field.
    await page.fill('[data-p3="brand-menu"] [data-p3="import-text"]', 'plugin-brand');
    const m = await measure(page, where);
    const seen = new Set(m.fields.map((f) => f.hook));
    for (const want of BRANDMENU_CONTROLS) ok(seen.has(want), `${where}: the "${want}" control is mounted and was measured`);
  };
  // Brand (S3): Identity's two fields BY IDENTITY, typed into, with the Style guide in the preview beside them.
  const BRAND_CONTROLS = ['[data-p3="brand-name"]', '[data-p3="brand-namespace"]'].map(hooks.role);
  const measureBrand = async (page, where) => {
    await hooks.click(page.locator('[data-p3="tab-brand"]'));
    await hooks.need(page, '[data-p3="brand-levers"] [data-p3="brand-name"]');
    await hooks.need(page, '[data-p3="brand-style-guide"] [data-p3="specimen"]');
    await page.fill('[data-p3="brand-name"]', 'plugin-brand');
    const m = await measure(page, where);
    const seen = new Set(m.fields.map((f) => f.hook));
    for (const want of BRAND_CONTROLS) ok(seen.has(want), `${where}: the "${want}" control is mounted and was measured`);
  };

  if (DEFAULT && MIN) {
    for (const scheme of ['light', 'dark']) {
      for (const theme of ['light', 'dark']) {
        const tag = `${scheme} scheme / Figma ${theme}`;
        // DEFAULT size: the start moment, then every rail destination THIS host offers — read from the
        // rendered rail, so the plugin-only Components page is in the set without being named here.
        const { context, page, errors } = await openThemed(DEFAULT, scheme, theme);
        await post(page, { type: 'restore-input-empty' });
        await waitStart(page, true);
        await measure(page, `${tag} / start screen`);
        {
          // X4 A's canary: beside Import, disabled while the paste box is empty, a copy that is NOT disabled but carries
          // every computed style of it and of its label (its class and hook too). The label must be measured and fail
          // its bar unexempted, so an exemption keyed on anything but `:disabled` / `aria-disabled` fails here (#2174).
          const p = await page.evaluate(PLANT_CANARY, '[data-p3="start-import"]:disabled');
          const cp = p.planted ? await page.evaluate(LEGIBILITY) : null;
          await page.evaluate(() => { for (const n of document.querySelectorAll('[data-ccanary]')) n.remove(); });
          const rows = cp?.text.filter((r) => r.canary) ?? [];
          const v = { ...p, measured: rows.length, under: rows.filter((r) => r.ratio < barOf(r)).length, exempted: rows.filter(isExemptText).length, ratio: rows.length ? Math.min(...rows.map((r) => r.ratio)) : null };
          ok(p.planted && p.live && p.differ.length === 0 && v.measured > 0 && v.under > 0 && v.exempted === 0,
            `${tag} / start screen: the button exemption canary, a button with every computed style of the disabled Import (its class and hook too) that is not disabled, is not exempted and fails its bar — ${JSON.stringify(v)}`);
        }
        await hooks.click(page.locator('[data-p3="start-example"]').first());
        await waitStart(page, false);
        await hooks.need(page, '[data-p3="frame"]');   // the app view (Color › Palettes draws the two panes from S2)
        // The plugin's one page outside the tabs, Build style guides (S11.2), opened from the Figma menu as a designer
        // opens it and given a small file, so its tree and every option group draw. It replaced the old Style guide page
        // the Pages menu opened, which went in H12 (#2289, owner PG1 A).
        await hooks.click(page.locator('[data-p3="figma-open"]'));
        await hooks.click(page.locator('[data-p3="figma-option-style-guide"]'));
        await hooks.need(page, '[data-p3="style-guides"]');
        await page.evaluate((c) => window.postMessage({ pluginMessage: { type: 'style-guide-catalog', catalog: c } }, '*'), SG_CATALOG);
        await hooks.need(page, '[data-p3="sg-collection"]');
        await page.evaluate(() => document.fonts.ready);
        pagesSeen.add('style-guides');
        await measure(page, `${tag} / Build style guides`);
        await hooks.click(page.locator('[data-p3="sg-close"]'));
        // The tabs, each by its tab hook and its levers' hook (UI redesign S8.2): Components moved off the Pages menu to
        // its own tab, so the plugin-only build controls are measured there, and every other moved tab with it, since
        // the menu now holds the Style guide alone.
        for (const [tab, levers, label] of TAB_SWEEP) {
          await hooks.click(page.locator(tab));
          await hooks.need(page, levers);
          await page.evaluate(() => document.fonts.ready);
          tabsSeen.add(hooks.role(tab));
          await measure(page, `${tag} / ${label}`);
          if (label === 'Layout') {
            // F1 A's canary: beside the disabled field, a copy that is NOT disabled but keeps its class, hook and,
            // inline, its colors. It must be measured and fail its bar unexempted, so an exemption widened to a class
            // or a hook fails here by name.
            const p = await page.evaluate(PLANT_CANARY, '[data-p3="bp-row"] input:disabled');
            const cp = p.planted ? await page.evaluate(LEGIBILITY) : null;
            await page.evaluate(() => { for (const n of document.querySelectorAll('[data-ccanary]')) n.remove(); });
            const cf = cp?.fields.find((f) => f.canary);
            ok(p.planted && p.live && p.differ.length === 0 && !!cf && fieldFails(cf) && !isExemptField(cf),
              `${tag} / Layout: the exemption canary, a field with every computed style of the disabled field (its class and hook too) that is not disabled, is not exempted and fails its bar — ${JSON.stringify({ ...p, measured: !!cf, ratio: cf?.ratio ?? null, exempted: cf ? isExemptField(cf) : null })}`);
          }
        }
        await measureBrand(page, `${tag} / Brand`);
        await measureBrandMenu(page, `${tag} / brand menu`);
        ok(errors.length === 0, `${tag}: no console errors across the sweep (${errors.slice(0, 1).join('') || 'none'})`);
        await context.close();
        // MIN size: what renders at the floor is not a subset of the default (#1041) — the rail folds
        // away and the start column reflows — so the two surfaces a designer lands on are measured there.
        const small = await openThemed(MIN, scheme, theme);
        await post(small.page, { type: 'restore-input-empty' });
        await waitStart(small.page, true);
        await measure(small.page, `${tag} / start screen @ ${MIN.width}×${MIN.height}`);
        await hooks.click(small.page.locator('[data-p3="start-example"]').first());
        await waitStart(small.page, false);
        await measure(small.page, `${tag} / editor @ ${MIN.width}×${MIN.height}`);
        await small.context.close();
      }
    }
  }
  // REPRESENTED, not counted: the build controls only this bundle has must be among those measured. Since S8.2 they are
  // the Components TAB's (its Build button and set choices); the plugin's one page outside the tabs, Build style guides,
  // must be measured too (the old Style guide page, the Pages menu's, until H12).
  ok(tabsSeen.has(hooks.role('[data-p3="tab-components"]')), `the Components tab, with the plugin-only build controls, was measured (saw ${[...tabsSeen].join(', ') || 'no tabs'})`);
  ok(pagesSeen.has('style-guides'), `the plugin's one page outside the tabs, Build style guides, was measured (saw ${[...pagesSeen].join(', ') || 'no pages'})`);
  ok(textTotal >= SWEEP_TEXT_FLOOR, `measured ${textTotal} text nodes across the panel sweep (floor ${SWEEP_TEXT_FLOOR})`);
  ok(fieldTotal >= SWEEP_FIELD_FLOOR, `measured ${fieldTotal} form controls across the panel sweep (floor ${SWEEP_FIELD_FLOOR})`);
  // F1 A, counted: Layout's first breakpoint field is disabled by design (D13), so every Layout tab measured must exempt it.
  const layoutTags = [];
  for (const scheme of ['light', 'dark']) for (const theme of ['light', 'dark']) layoutTags.push(`${scheme} scheme / Figma ${theme} / Layout`);
  const missed = layoutTags.filter((t) => !FIELD_EXEMPTIONS.some(([w, hk]) => w === t && hk === 'bp-input'));
  ok(missed.length === 0, `every Layout tab measured exempted its disabled first breakpoint field from the field bar (F1 A) — exempted ${FIELD_EXEMPTIONS.length}${missed.length ? `; none in ${missed.join(', ')}` : ''}`);
  console.log(`  Contrast exemption (inactive fields, WCAG 2.2 SC 1.4.3; F1 A): ${FIELD_EXEMPTIONS.length} field(s) exempted in ${new Set(FIELD_EXEMPTIONS.map(([w]) => w)).size} state(s).`);
  // X4 A, counted: the start moment draws Import disabled (the paste box is empty), so every start moment measured must
  // exempt its label.
  const startTags = [];
  for (const scheme of ['light', 'dark']) for (const theme of ['light', 'dark']) startTags.push(`${scheme} scheme / Figma ${theme} / start screen`);
  const noImport = startTags.filter((t) => !BUTTON_EXEMPTIONS.some(([w, hk]) => w === t && hk === 'start-import'));
  ok(noImport.length === 0, `every start moment measured exempted the disabled Import button's label (X4 A) — exempted ${BUTTON_EXEMPTIONS.length}${noImport.length ? `; none in ${noImport.join(', ')}` : ''}`);
  console.log(`  Contrast exemption (inactive buttons, WCAG 2.2 SC 1.4.3; X4 A): ${BUTTON_EXEMPTIONS.length} label(s) exempted in ${new Set(BUTTON_EXEMPTIONS.map(([w]) => w)).size} state(s): ${[...new Set(BUTTON_EXEMPTIONS.map(([w, h]) => `${w} (${h})`))].join(', ')}.`);
  console.log(`  ${pagesSeen.size} menu page(s) and ${tabsSeen.size} tabs × 2 schemes × 2 Figma themes, plus the start moment at both sizes: ${textTotal} text nodes, ${fieldTotal} form controls.`);
  console.log(`  Lowest chrome text: ${worst.ratio}:1 — ${worst.where}`);
  console.log(`  Unparsed colors: ${unparsedTotal} (every one fails by name).`);
}

await browser.close();
server.close();

hooks.report(ok);

console.log(failed ? `\n❌ ${failed} FAILED` : '\n✅ ALL PASS');
process.exit(failed ? 1 : 0);
