/**
 * THE STORYBOOK BUILD CHECK (#3408 S5, thin): the built Storybook holds every story it should, and each one renders
 * the component it names, in Chromium. Fails by name.
 *
 *   npm run -w @prism3/storybook build          (first: writes storybook-static/)
 *   npx tsx apps/storybook/check-build.ts
 *
 * 1. THE INDEX. `storybook-static/index.json` lists exactly the stories `EXPECTED` (`expected-stories.ts`) names: for
 *    each component, each delivery form, each case. `EXPECTED` is written by hand, never read from the stories, so a story
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
 * THE FIELDS (text-field, password-field) get the same four steps, with their own reads:
 * 2. Each story renders a `.p3-text-field` or `.p3-password-field`, inside the element for the element form.
 * 3. Each state shows: hover changes the box's border and focus-visible changes it again; error, warning and success
 *    each draw their own border and show their own glyph; disabled, read-only, pending and required carry their
 *    input attributes; pending shows the spinner; the three sizes have three input type sizes and rising heights
 *    over a 44px floor; the visuals are drawn. The
 *    password field's button is revealed in both forms, and `Shown`/`ShownError` end unmasked with "Hide".
 *    THE ERROR WIRING (owner decision #1712 A): every field's label names its input; a shown message is named by the
 *    input's `aria-describedby`, in the same field; `aria-invalid="true"` is on the input at error and nowhere else;
 *    and no field holds a live region (`aria-live`, or `role` status, alert or log). The page's one shared polite
 *    region for Show/Hide sits outside every field.
 * 4. Both forms agree on the box, input, label and message's computed styles.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPECTED } from './expected-stories.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC = resolve(HERE, 'storybook-static');
if (!existsSync(resolve(STATIC, 'index.json'))) { console.error('FAIL setup: apps/storybook/storybook-static/index.json is missing. Run: npm run -w @prism3/storybook build'); process.exit(1); }

/** Every story the build must hold: `components-<component>-<form>--<case>`. */
const FIELDS = new Set(['text-field', 'password-field']);
/** The validation status each field case is at, by hand: the error wiring is checked against it. */
const STATUS: Record<string, string> = { error: 'error', warning: 'warning', success: 'success', 'shown-error': 'error' };

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
for (const b of built) ok(want.has(b), `index: story ${b} is in the build but not in expected-stories.ts's EXPECTED`);

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

/** Reads one field story: its parts' computed styles, the input's state, and the accessibility wiring. */
const FIELD_PROPS = ['background-color', 'color', 'border-top-color', 'border-top-width', 'outline-style', 'box-shadow', 'block-size', 'padding-inline-start', 'font-size'];
type FieldRead = { error?: string; inElement?: boolean; parts?: Record<string, Record<string, string> | null>; facts?: Record<string, any> };
const readField = async (comp: string, storyId: string, forced: string | undefined, press: boolean): Promise<FieldRead> => {
  const page = await browser.newPage({ viewport: { width: 800, height: 400 } });
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));
  try {
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${storyId}&viewMode=story`);
    await page.waitForSelector(`#storybook-root .p3-${comp}`, { timeout: 15000 });
    if (forced) {
      try { await page.waitForSelector(`#storybook-root.${forced}`, { timeout: 10000 }); }
      catch { return { error: `the story root never got ${forced}, so the addon did not force the state` }; }
    }
    if (press) {
      try { await page.waitForFunction(`document.querySelector('#storybook-root .p3-${comp}__entry')?.type === 'text'`, null, { timeout: 10000 }); }
      catch { return { error: 'the story presses Show, but its input is still masked' }; }
    }
    await page.evaluate(`(async () => {
      await Promise.all([...document.querySelectorAll('p3-text-field, p3-password-field')].map((e) => e.updateComplete));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await Promise.all(document.getAnimations().filter((a) => a.effect.getTiming().iterations !== Infinity).map((a) => a.finished));
    })()`);
    const r = await page.evaluate(`(() => {
      const P = 'p3-${comp}';
      const f = document.querySelector('#storybook-root .' + P);
      const input = f.querySelector('.' + P + '__entry');
      const style = (el) => el ? Object.fromEntries(${JSON.stringify(FIELD_PROPS)}.map((p) => [p, getComputedStyle(el).getPropertyValue(p)])) : null;
      const shown = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
      const described = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean).map((i) => document.getElementById(i));
      const message = f.querySelector('.p3-field-message');
      const toggle = f.querySelector('.' + P + '__toggle');
      const live = [...f.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]')].concat(f.matches('[aria-live], [role]') ? [f] : []);
      return {
        inElement: !!f.closest('p3-${comp}'),
        parts: {
          control: style(f.querySelector('.' + P + '__control')),
          input: style(input),
          label: style(f.querySelector('.p3-field-label')),
          message: style(message),
        },
        facts: {
          labelsInput: input.labels.length === 1 && input.labels[0].closest('.' + P) === f,
          describedBy: input.getAttribute('aria-describedby'),
          describesMessage: !!message && described.length > 0 && described.every((el) => el && f.contains(el)) && described.includes(message),
          messageText: message ? message.textContent.trim() : null,
          invalid: input.getAttribute('aria-invalid'),
          invalidAnywhere: [...f.querySelectorAll('[aria-invalid]')].filter((el) => el !== input).length,
          live: live.map((el) => el.outerHTML.slice(0, 80)),
          disabled: input.disabled, readOnly: input.readOnly, required: input.required, busy: input.getAttribute('aria-busy'),
          type: input.type,
          spinner: shown(f.querySelector('.' + P + '__spinner')),
          indicator: shown(f.querySelector('.p3-field-label__indicator')),
          leading: shown(f.querySelector('.' + P + '__leading-visual')),
          trailing: shown(f.querySelector('.' + P + '__trailing-visual')),
          glyph: ['error', 'warning', 'success'].filter((g) => shown(f.querySelector('.p3-field-message__' + g + '-glyph'))),
          toggle: toggle ? { hidden: toggle.hidden, shown: shown(toggle), text: toggle.textContent.trim(), controls: toggle.getAttribute('aria-controls') === input.id } : null,
        },
      };
    })()`);
    return errors.length ? { error: `page error: ${errors.join(' / ')}` } : r;
  } catch (e) {
    return { error: `did not render a .p3-${comp}: ${(e as Error).message.split('\n')[0]}` };
  } finally { await page.close(); }
};

/** Steps 2–4 for a field. */
const checkField = async (comp: string, e: { forms: string[]; cases: string[] }) => {
  const byForm: Record<string, Record<string, FieldRead>> = {};
  for (const form of e.forms) {
    const got: Record<string, FieldRead> = (byForm[form] = {});
    for (const c of e.cases) {
      const sid = id(comp, form, c);
      if (!built.has(sid)) continue;
      // a `<state>-no-message` case is that state with the message off (#4432 decision 3 A)
      const state = c.replace(/-no-message$/, '');
      const noMessage = state !== c;
      const r = (got[c] = await readField(comp, sid, FORCED[state], c.startsWith('shown')));
      if (r.error) { failures.push(`${sid}: ${r.error}`); delete got[c]; continue; }
      ok(r.inElement === (form === 'element'), `${sid}: the .p3-${comp} is ${r.inElement ? '' : 'not '}inside <p3-${comp}>`);
      const x = r.facts!;
      const status = STATUS[state] ?? 'default';
      // The error wiring, owner decision #1712 A. With the message off at default, there is no message and nothing
      // describes the input; at a validation status the message is written anyway (Q-POC2 A).
      ok(x.labelsInput, `${sid}: the label does not name the input (label for / input.labels)`);
      if (noMessage && status === 'default') ok(x.messageText === null && x.describedBy === null, `${sid}: the message is off, but the field shows one (${JSON.stringify(x.messageText)}) or aria-describedby names one ("${x.describedBy}")`);
      else ok(x.describesMessage, `${sid}: aria-describedby "${x.describedBy}" does not name the field's message`);
      ok(x.invalid === (status === 'error' ? 'true' : null), `${sid}: aria-invalid is ${x.invalid} at ${status}, #1712 A wants ${status === 'error' ? '"true"' : 'none'}`);
      ok(x.invalidAnywhere === 0, `${sid}: aria-invalid sits on ${x.invalidAnywhere} element(s) other than the input`);
      ok(x.live.length === 0, `${sid}: the field holds a live region, which #1712 A rules out: ${x.live.join(' | ')}`);
      if (status !== 'default') ok(x.glyph.length === 1 && x.glyph[0] === status, `${sid}: the message shows glyph(s) [${x.glyph}], not ${status}'s`);
      else ok(x.glyph.length === 0, `${sid}: the message shows a status glyph [${x.glyph}] at default`);
      if (comp === 'password-field') {
        ok(!!x.toggle && !x.toggle.hidden && x.toggle.shown && x.toggle.controls, `${sid}: the Show/Hide button is not revealed and wired (${JSON.stringify(x.toggle)})`);
        const pressed = c.startsWith('shown');
        ok(x.type === (pressed ? 'text' : 'password') && !!x.toggle && x.toggle.text.startsWith(pressed ? 'Hide' : 'Show'), `${sid}: type ${x.type}, button "${x.toggle?.text}", expected ${pressed ? 'text and Hide' : 'password and Show'}`);
      }
    }
    const f = (c: string) => got[c]?.facts;
    const box = (c: string) => got[c]?.parts?.control;
    const at = (c: string) => id(comp, form, c);
    if (box('rest')) {
      ok(box('rest')!['border-top-width'] !== '0px', `${at('rest')}: the box draws no border, so the field CSS did not load`);
      if (box('hover')) ok(box('hover')!['border-top-color'] !== box('rest')!['border-top-color'], `${at('hover')}: the border equals rest's, so hover was not forced`);
      if (box('focus-visible')) ok(JSON.stringify(box('focus-visible')) !== JSON.stringify(box('rest')) && JSON.stringify(box('focus-visible')) !== JSON.stringify(box('hover')), `${at('focus-visible')}: the box equals rest's or hover's, so focus-visible was not forced`);
      const borders = ['rest', 'error', 'warning', 'success'].map((c) => box(c)?.['border-top-color']);
      if (borders.every(Boolean)) ok(new Set(borders).size === 4, `${comp} ${form}: rest, error, warning and success share a border color (${borders.join(', ')})`);
    }
    if (f('disabled')) ok(f('disabled')!.disabled, `${at('disabled')}: the input is not disabled`);
    if (f('disabled-no-message')) ok(f('disabled-no-message')!.disabled, `${at('disabled-no-message')}: the input is not disabled`);
    // each state with the message off draws the box its state draws with the message on: the state was forced
    for (const s of ['rest', 'hover', 'focus-visible', 'disabled', 'error']) if (box(s) && box(`${s}-no-message`)) {
      ok(JSON.stringify(box(`${s}-no-message`)) === JSON.stringify(box(s)), `${at(`${s}-no-message`)}: the box differs from ${s}'s, so the state is not the one its name says`);
    }
    if (f('read-only')) ok(f('read-only')!.readOnly && !f('read-only')!.disabled, `${at('read-only')}: the input is not read-only`);
    if (f('pending')) ok(f('pending')!.busy === 'true' && f('pending')!.spinner, `${at('pending')}: aria-busy ${f('pending')!.busy}, spinner shown ${f('pending')!.spinner}`);
    if (f('rest')) ok(!f('rest')!.spinner && !f('rest')!.indicator, `${at('rest')}: rest shows the spinner or the required marker`);
    if (f('required')) ok(f('required')!.required && f('required')!.indicator, `${at('required')}: required ${f('required')!.required}, marker shown ${f('required')!.indicator}`);
    if (f('with-icons')) ok(f('with-icons')!.leading && f('with-icons')!.trailing === (comp === 'text-field'), `${at('with-icons')}: leading ${f('with-icons')!.leading}, trailing ${f('with-icons')!.trailing}`);
    // Small keeps medium's 44px target (the def's size prop), so the sizes differ by type: three input font sizes.
    const type = ['small', 'medium', 'large'].map((c) => got[c]?.parts?.input?.['font-size']);
    if (type.every(Boolean)) ok(new Set(type).size === 3, `${comp} ${form}: small, medium and large share an input type size (${type.join(', ')})`);
    const heights = ['small', 'medium', 'large'].map((c) => parseFloat(box(c)?.['block-size'] ?? 'NaN'));
    if (heights.every((h) => !Number.isNaN(h))) ok(heights[0] >= 44 && heights[0] <= heights[1] && heights[1] < heights[2], `${comp} ${form}: heights ${heights.join(', ')} are not small ≤ medium < large with a 44px floor`);
  }
  const [f1, f2] = e.forms;
  for (const c of e.cases) {
    const x = byForm[f1]?.[c]?.parts, y = byForm[f2]?.[c]?.parts;
    if (!x || !y) continue;
    const diffs: string[] = [];
    for (const part of Object.keys(x)) for (const p of FIELD_PROPS) {
      if ((x[part]?.[p] ?? null) !== (y[part]?.[p] ?? null)) diffs.push(`${part} ${p} ${x[part]?.[p]} vs ${y[part]?.[p]}`);
    }
    ok(diffs.length === 0, `${comp} ${c}: the ${f1} and ${f2} stories differ: ${diffs.join('; ')}`);
  }
};

try {
  for (const [comp, e] of Object.entries(EXPECTED)) {
    if (FIELDS.has(comp)) { await checkField(comp, e); continue; }
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
console.log(`OK storybook: ${built.size} stories, exactly the expected set; each renders its component and state, the fields carry #1712 A's error wiring, and both delivery forms agree (${passed} checks)`);
