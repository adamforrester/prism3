/**
 * THE STORYBOOK BUILD CHECK (#3408 S5, thin): the built Storybook holds every story it should, and each one renders
 * the component it names, in Chromium. Fails by name.
 *
 *   npm run -w @prism3/storybook build          (first: writes storybook-static/)
 *   npx tsx apps/storybook/check-build.ts
 *
 * 1. THE INDEX. `storybook-static/index.json` lists exactly the stories `EXPECTED` names below: for each component,
 *    each delivery form, each case. `EXPECTED` is written here by hand, never read from the stories, so a story
 *    dropped from one form, or added to only one, fails here by its id (`docs/34`).
 * 2. EACH STORY RENDERS. The static build is served locally and each story's iframe is opened: no page error, and a
 *    `.p3-button` in the story root. In the element form it sits inside `<p3-button>`; in the HTML form it doesn't.
 * 3. THE STORY SHOWS ITS STATE. Hover and pressed paint a different fill than rest; focus-visible draws an outline and
 *    rest doesn't; pending, disabled and inactive carry their attributes; each size has its own height; inverse
 *    paints a different fill than rest. So a pseudo-state the addon failed to force, or a story that renders the
 *    rest button under another name, fails.
 * 4. BOTH FORMS AGREE. The element and HTML stories of one case compute the same fill, ink, border, outline, height
 *    and padding.
 *
 * Text-field and password-field join `EXPECTED` when their stories land (after S3).
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC = resolve(HERE, 'storybook-static');
if (!existsSync(resolve(STATIC, 'index.json'))) { console.error('FAIL setup: apps/storybook/storybook-static/index.json is missing. Run: npm run -w @prism3/storybook build'); process.exit(1); }

/** Every story the build must hold: `components-<component>-<form>--<case>`. */
const EXPECTED: Record<string, { forms: string[]; cases: string[] }> = {
  button: {
    forms: ['element', 'html'],
    cases: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'inactive', 'pending', 'filled', 'outline', 'text',
      'text-flush', 'small', 'medium', 'large', 'inverse', 'inverse-outline', 'with-visuals', 'full-width'],
  },
};
const id = (component: string, form: string, c: string) => `components-${component}-${form}--${c}`;
/** The class the pseudo-states addon puts on the story root for a forced state; the check waits for it. */
const FORCED: Record<string, string> = { hover: 'pseudo-hover-all', pressed: 'pseudo-active-all', 'focus-visible': 'pseudo-focus-visible-all' };

const failures: string[] = [];
let passed = 0;
const ok = (cond: boolean, what: string) => { if (cond) passed++; else failures.push(what); };

// 1. the index
const entries = JSON.parse(readFileSync(resolve(STATIC, 'index.json'), 'utf8')).entries as Record<string, { type: string }>;
const built = new Set(Object.keys(entries).filter((k) => entries[k].type === 'story'));
const want = new Set(Object.entries(EXPECTED).flatMap(([comp, e]) => e.forms.flatMap((f) => e.cases.map((c) => id(comp, f, c)))));
for (const w of want) ok(built.has(w), `index: story ${w} is missing from the build`);
for (const b of built) ok(want.has(b), `index: story ${b} is in the build but not in check-build.ts's EXPECTED`);

// 2–4. render each story
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([/\\])+/, '');
  const file = resolve(STATIC, path || 'index.html');
  if (!file.startsWith(STATIC + sep) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const port = (server.address() as { port: number }).port;

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const PROPS = ['background-color', 'color', 'border-top-color', 'outline-style', 'min-block-size', 'padding-inline-start'];
type Read = { error?: string; inElement?: boolean; attrs?: Record<string, string | null>; style?: Record<string, string> };
const read = async (storyId: string, forced?: string): Promise<Read> => {
  const page = await browser.newPage({ viewport: { width: 800, height: 400 } });
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));
  try {
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${storyId}&viewMode=story`);
    await page.waitForSelector('#storybook-root .p3-button', { timeout: 15000 });
    if (forced) {
      try { await page.waitForSelector(`#storybook-root.${forced}`, { timeout: 10000 }); }
      catch { return { error: `the story root never got ${forced}, so the addon did not force the state` }; }
    }
    // Let the element finish its update, the pseudo-state addon apply its classes, and the spinner's fade end.
    await page.evaluate(`(async () => {
      await Promise.all([...document.querySelectorAll('p3-button')].map((e) => e.updateComplete));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await Promise.all(document.getAnimations().filter((a) => a.effect.getTiming().iterations !== Infinity).map((a) => a.finished));
    })()`);
    const r = await page.evaluate(`(() => {
      const b = document.querySelector('#storybook-root .p3-button');
      const cs = getComputedStyle(b);
      return {
        inElement: !!b.closest('p3-button'),
        attrs: Object.fromEntries(['aria-busy', 'aria-disabled', 'disabled'].map((a) => [a, b.getAttribute(a)])),
        style: Object.fromEntries(${JSON.stringify(PROPS)}.map((p) => [p, cs.getPropertyValue(p)])),
      };
    })()`);
    return errors.length ? { error: `page error: ${errors.join(' / ')}` } : r;
  } catch (e) {
    return { error: `did not render a .p3-button: ${(e as Error).message.split('\n')[0]}` };
  } finally { await page.close(); }
};

try {
  for (const [comp, e] of Object.entries(EXPECTED)) {
    for (const form of e.forms) {
      const got: Record<string, Read> = {};
      for (const c of e.cases) {
        const sid = id(comp, form, c);
        if (!built.has(sid)) continue;
        const r = (got[c] = await read(sid, FORCED[c]));
        if (r.error) { failures.push(`${sid}: ${r.error}`); continue; }
        ok(r.inElement === (form === 'element'), `${sid}: the .p3-button is ${r.inElement ? '' : 'not '}inside <p3-button>`);
      }
      const s = (c: string) => got[c]?.style;
      const a = (c: string) => got[c]?.attrs;
      const at = (c: string) => id(comp, form, c);
      if (s('rest')) {
        ok(s('rest')!['background-color'] !== 'rgba(0, 0, 0, 0)', `${at('rest')}: the fill is transparent, so the button CSS did not load`);
        if (s('hover')) ok(s('hover')!['background-color'] !== s('rest')!['background-color'], `${at('hover')}: the fill equals rest's, so hover was not forced`);
        if (s('pressed')) ok(s('pressed')!['background-color'] !== s('rest')!['background-color'], `${at('pressed')}: the fill equals rest's, so pressed was not forced`);
        if (s('focus-visible')) ok(s('focus-visible')!['outline-style'] !== 'none' && s('rest')!['outline-style'] === 'none', `${at('focus-visible')}: outline ${s('focus-visible')!['outline-style']} (rest ${s('rest')!['outline-style']}), so focus-visible was not forced`);
        if (s('inverse')) ok(s('inverse')!['background-color'] !== s('rest')!['background-color'], `${at('inverse')}: the fill equals rest's`);
      }
      if (a('pending')) ok(a('pending')!['aria-busy'] === 'true' && a('pending')!['aria-disabled'] === 'true', `${at('pending')}: aria-busy ${a('pending')!['aria-busy']}, aria-disabled ${a('pending')!['aria-disabled']}`);
      if (a('disabled')) ok(a('disabled')!.disabled !== null, `${at('disabled')}: not natively disabled`);
      if (a('inactive')) ok(a('inactive')!['aria-disabled'] === 'true' && a('inactive')!['aria-busy'] === null, `${at('inactive')}: aria-disabled ${a('inactive')!['aria-disabled']}`);
      const heights = ['small', 'medium', 'large'].map((c) => s(c)?.['min-block-size']);
      if (heights.every(Boolean)) ok(new Set(heights).size === 3, `${comp} ${form}: small, medium and large share a height (${heights.join(', ')})`);
      (EXPECTED[comp] as any)[`_${form}`] = got;
    }
    // 4. both forms agree, case by case
    const [f1, f2] = e.forms;
    const g1 = (EXPECTED[comp] as any)[`_${f1}`], g2 = (EXPECTED[comp] as any)[`_${f2}`];
    for (const c of e.cases) {
      const x = g1?.[c]?.style, y = g2?.[c]?.style;
      if (!x || !y) continue;
      const diffs = PROPS.filter((p) => x[p] !== y[p]).map((p) => `${p} ${x[p]} vs ${y[p]}`);
      ok(diffs.length === 0, `${comp} ${c}: the ${f1} and ${f2} stories differ: ${diffs.join('; ')}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`FAIL storybook: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`OK storybook: ${built.size} stories, exactly the expected set; each renders its component and state, and both delivery forms agree (${passed} checks)`);
