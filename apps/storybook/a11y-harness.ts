/**
 * What the three S5 accessibility checks share (#3408 S5): a static server over `storybook-static/`, the story list,
 * and `open`, which loads one story and waits until it has settled. `check-axe.ts`, `check-aria.ts` and
 * `check-keyboard.ts` import it; `check-build.ts` keeps its own copy of the server, as it did before them.
 *
 * Every check here runs AFTER `npm run -w @prism3/storybook build`, and leans on `check-build.ts` for completeness:
 * that check holds the built index to its hand-written `EXPECTED`, so the story list read from `index.json` here is
 * the checked one.
 */
import { createRequire } from 'node:module';
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC = resolve(HERE, 'storybook-static');
export const require = createRequire(import.meta.url);

export type Story = { id: string; component: string; form: 'element' | 'html'; case: string };
export const COMPONENTS = ['button', 'text-field', 'password-field'] as const;

/** Every story in the build, parsed from its id: `components-<component>-<form>--<case>`. */
export const stories = (plant: Plant = {}): Story[] => {
  if (!existsSync(resolve(STATIC, 'index.json'))) {
    console.error('FAIL setup: apps/storybook/storybook-static/index.json is missing. Run: npm run -w @prism3/storybook build');
    process.exit(1);
  }
  const entries = JSON.parse(readFileSync(resolve(STATIC, 'index.json'), 'utf8')).entries as Record<string, { type: string }>;
  const out: Story[] = [];
  for (const id of Object.keys(entries).filter((k) => entries[k].type === 'story' && !plant.drop?.includes(k))) {
    const m = /^components-(button|text-field|password-field)-(element|html)--(.+)$/.exec(id);
    if (!m) { console.error(`FAIL setup: story ${id} is not components-<component>-<form>--<case>`); process.exit(1); }
    out.push({ id, component: m[1], form: m[2] as Story['form'], case: m[3] });
  }
  for (const c of COMPONENTS) for (const f of ['element', 'html']) {
    if (!out.some((s) => s.component === c && s.form === f)) { console.error(`FAIL setup: no ${c} ${f} story in the build`); process.exit(1); }
  }
  return out;
};

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

/** Serves `storybook-static/` on a free local port. */
export const serve = async (): Promise<{ server: Server; origin: string }> => {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([/\\])+/, '');
    const file = resolve(STATIC, path || 'index.html');
    if (!file.startsWith(STATIC + sep) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return { server, origin: `http://127.0.0.1:${(server.address() as { port: number }).port}` };
};

/** The class the pseudo-states addon puts on the story root for a forced state (as in `check-build.ts`). */
const FORCED: Record<string, string> = { hover: 'pseudo-hover-all', pressed: 'pseudo-active-all', 'focus-visible': 'pseudo-focus-visible-all' };

/**
 * What a self-test mutant plants: `init` runs before the page's own scripts, `after` once the story has settled,
 * and `css` is added after that. `drop` removes story ids from the suite's enumeration, as a filter slipped into
 * `stories()` would: the represented check must then name each one.
 */
export type Plant = { init?: string; after?: string; css?: string; drop?: string[] };

/**
 * Opens one story in `theme` and waits until it has settled: the component is in the root, every element has
 * finished its update, a forced pseudo-state's class is on the root, the password field's Show/Hide button is
 * revealed, a story that presses Show reads "Hide", and finite animations have ended. Throws, with the reason, if it
 * never settles.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const open = async (page: any, origin: string, s: Story, theme: 'light' | 'dark', plant: Plant = {}): Promise<void> => {
  const errors: string[] = [];
  page.removeAllListeners('pageerror');
  page.on('pageerror', (e: Error) => errors.push(e.message));
  await page.goto(`${origin}/iframe.html?id=${s.id}&viewMode=story&globals=theme:${theme}`);
  await page.waitForSelector('#storybook-root [data-component]', { timeout: 15000 });
  if (FORCED[s.case]) await page.waitForSelector(`#storybook-root.${FORCED[s.case]}`, { timeout: 10000 });
  if (s.component === 'password-field') {
    await page.waitForFunction(() => [...document.querySelectorAll('.p3-password-field__toggle')].every((b) => !(b as HTMLElement).hidden), null, { timeout: 10000 });
    if (s.case.startsWith('shown')) {
      await page.waitForFunction(() => document.querySelector('.p3-password-field__toggle-text')?.textContent === 'Hide', null, { timeout: 10000 });
    }
  }
  await page.evaluate(`(async () => {
    await Promise.all([...document.querySelectorAll('p3-button, p3-text-field, p3-password-field')].map((e) => e.updateComplete));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await Promise.all(document.getAnimations().filter((a) => a.effect.getTiming().iterations !== Infinity).map((a) => a.finished));
  })()`);
  const theme_ = await page.evaluate(() => (document.querySelector('[data-story-frame]') as HTMLElement | null)?.dataset.theme);
  if (theme_ !== theme) throw new Error(`the story frame's data-theme is ${theme_}, not ${theme}`);
  if (plant.after) await page.evaluate(plant.after);
  if (plant.css) await page.addStyleTag({ content: plant.css });
  if (errors.length) throw new Error(`page error: ${errors.join(' / ')}`);
};

/** A fresh browser context with a mutant's `init` planted. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const context = async (browser: any, plant: Plant = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 400 } });
  ctx.setDefaultTimeout(10000);
  // Every shadow root the page attaches, with its host: a closed root can't be seen from outside, so it is recorded as
  // it is made, before any page script runs (the "no closed shadow roots" rule, item 8). Storybook's preview wraps
  // this patch and forces each root open, so the recorded mode is not the one asked for; check-aria fails on any.
  await ctx.addInitScript(() => {
    const w = window as unknown as { p3Shadows: { host: Element; mode: string }[] };
    w.p3Shadows = [];
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init: ShadowRootInit) { w.p3Shadows.push({ host: this, mode: init.mode }); return attach.call(this, init); };
  });
  if (plant.init) await ctx.addInitScript(plant.init);
  return ctx;
};

/**
 * The represented-story mutants every check carries (review of #3971): one story dropped from the enumeration must be
 * named as not checked, and its case named as checked in one form only. The id and the wording are literals here.
 */
export const DROPPED = (label: string) => {
  const plant: Plant = { drop: ['components-text-field-html--error'] };
  const only = (s: Story) => s.component === 'text-field' && s.case === 'error';
  return [
    { name: 'a story dropped from the suite', plant, only, mustName: new RegExp(`^components-text-field-html--error: not checked by ${label}`) },
    { name: 'a case left in one form only', plant, only, mustName: new RegExp(`^text-field--error: only the element form was checked by ${label}`) },
  ];
};

export type Result = { failures: string[]; passed: number; notes: string[]; ok: (cond: boolean, what: string) => void };
export const result = (): Result => {
  const r: Result = { failures: [], passed: 0, notes: [], ok: (cond, what) => { if (cond) r.passed++; else r.failures.push(what); } };
  return r;
};

/** Runs the real check, then each mutant, which must fail by name. Exits 1 on any miss. */
export const main = async (
  label: string, summary: string,
  run: (browser: unknown, origin: string, plant?: Plant, only?: (s: Story) => boolean) => Promise<Result>,
  mutants: { name: string; plant: Plant; only: (s: Story) => boolean; mustName: RegExp }[],
): Promise<void> => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const { server, origin } = await serve();
  let bad = 0;
  try {
    const real = await run(browser, origin);
    for (const n of real.notes) console.log(`NOTE ${label}: ${n}`);
    if (real.failures.length) {
      bad++;
      console.error(`FAIL ${label}: ${real.failures.length} check(s) failed, ${real.passed} passed`);
      for (const x of real.failures) console.error(`  - ${x}`);
    } else console.log(`OK ${label}: ${real.passed} checks. ${summary}`);
    for (const m of mutants) {
      const r = await run(browser, origin, m.plant, m.only);
      if (r.failures.some((x) => m.mustName.test(x))) console.log(`OK self-test: mutant "${m.name}" fails by name`);
      else { bad++; console.error(`FAIL self-test: mutant "${m.name}" was not caught by name (${r.failures[0] ?? 'no failures'})`); }
    }
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(bad ? 1 : 0);
};
