/**
 * THE ELEMENT BROWSER CHECK (#3408 S4): `<p3-button>` in Chromium, with the real token CSS and `@prism3/css`'s
 * `button.css`, on the light and dark themes. Fails by name.
 *
 *   npm run -w @prism3/tokens build     (first: the page inlines the built token CSS)
 *   npx tsx packages/web-components/check-browser.ts
 *
 * 1. THE SAME BUTTON IN BOTH DELIVERY FORMS. For each sample, the element and plain HTML written from `@prism3/css`'s
 *    README contract (`plain()` below, this file's own copy) render side by side; every listed computed property of
 *    the button and each part must be equal. The CSS is the single source of truth, so an element that renders other
 *    markup, adds a style, or renders into a shadow root shows up as a difference here. A filled button's fill must
 *    also not be transparent, so a page where `button.css` never loaded can't pass by both sides being unstyled.
 * 2. BEHAVIOR, per the def. A rest click runs the host's listener and `onClick` once; Enter and Space activate. While
 *    pending or inactive a click, Enter or Space runs nothing, submits no form and follows no link, and the button
 *    keeps focus and its accessible name (the spinner is hidden from it). Disabled is native: no click, no Tab stop.
 *    The default `type` is `button`, so a click in a form submits nothing; `type="submit"` does.
 * 3. MARKUP IN THE PAGE. A label written as text and a `slot="leadingVisual"` child become the label and the leading
 *    visual; a pending toggle adds and removes the spinner and `aria-busy`; `href` renders a link; `fullWidth`
 *    fills its container; Tab paints the focus ring.
 *
 * SELF-TEST: three mutants of the element must each fail by name: click suppression removed, a shadow root in place
 * of the light DOM, and the default `type` changed to `submit`.
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle, ELEMENT_SOURCE } from './bundle';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const TOKENS_CSS = resolve(REPO, 'packages/tokens/dist/prism3.css');
const BUTTON_CSS = resolve(REPO, 'packages/css/button.css');
if (!existsSync(TOKENS_CSS)) { console.error('FAIL setup: packages/tokens/dist/prism3.css is missing. Run: npm run -w @prism3/tokens build'); process.exit(1); }

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z"/></svg>';
const SPINNER = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/></svg>';

// ------------------------------------------------------------------------------------------------ the two delivery forms
type Sample = { id: string; props: Record<string, string>; leading?: boolean; trailing?: boolean };
const SAMPLES: Sample[] = [
  ...['filled', 'outline', 'text'].flatMap((appearance) => ['small', 'medium', 'large'].map((size) => ({ id: `${appearance}-${size}`, props: { appearance, size } }))),
  { id: 'inverse-filled', props: { surface: 'inverse' } },
  { id: 'inverse-outline', props: { surface: 'inverse', appearance: 'outline' } },
  { id: 'flush', props: { appearance: 'text', inset: 'flush' } },
  { id: 'pending', props: { ispending: 'true' } },
  { id: 'pending-icons', props: { ispending: 'true' }, leading: true, trailing: true },
  { id: 'inactive', props: { isinactive: 'true' } },
  { id: 'disabled', props: { disabled: 'true' } },
  { id: 'icons', props: { size: 'large' }, leading: true, trailing: true },
];
/** `@prism3/css`'s README contract, written here by hand: the props as `data-prop-*` and state attributes. */
const plain = (s: Sample): string => {
  const p = s.props;
  const a = ['type="button"', 'class="p3-button"', 'data-component="button"'];
  for (const k of ['appearance', 'size', 'surface', 'inset']) if (p[k]) a.push(`data-prop-${k}="${p[k]}"`);
  if (p.ispending === 'true') a.push('aria-busy="true"', 'aria-disabled="true"');
  else if (p.isinactive === 'true') a.push('aria-disabled="true"');
  if (p.disabled === 'true') a.push('disabled');
  const kids = [
    s.leading ? `<span class="p3-button__leading-visual" aria-hidden="true">${ICON}</span>` : '',
    p.ispending === 'true' ? `<span class="p3-button__spinner" aria-hidden="true">${SPINNER}</span>` : '',
    '<span class="p3-button__label">Save changes</span>',
    s.trailing ? `<span class="p3-button__trailing-visual" aria-hidden="true">${ICON}</span>` : '',
  ].join('');
  // In a <span>, so it sits in the same layout context as the element's inner button, whose parent is the inline
  // <p3-button> host (journal, S4: the host's display is an owner decision).
  return `<span><button ${a.join(' ')} data-form="plain">${kids}</button></span>`;
};
const element = (s: Sample): string => {
  const a = Object.entries(s.props).map(([k, v]) => `data-prop-${k}="${v}"`).join(' ');
  const kids = (s.leading ? `<span slot="leadingVisual">${ICON}</span>` : '') + (s.trailing ? `<span slot="trailingVisual">${ICON}</span>` : '');
  return `<p3-button data-form="element" data-prop-label="Save changes" ${a}>${kids}</p3-button>`;
};
const PROPS = ['background-color', 'color', 'border-top-color', 'border-top-width', 'border-top-left-radius', 'min-block-size', 'min-inline-size',
  'padding-inline-start', 'padding-inline-end', 'column-gap', 'font', 'letter-spacing', 'text-decoration-line', 'outline-style', 'cursor', 'opacity', 'inline-size', 'block-size'];
const PARTS = ['', '.p3-button__label', '.p3-button__leading-visual', '.p3-button__trailing-visual', '.p3-button__spinner'];

const page_ = (body: string, theme: string) => `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8">
<style>${readFileSync(TOKENS_CSS, 'utf8')}</style><style>${readFileSync(BUTTON_CSS, 'utf8')}</style>
<style>body{margin:0;padding:16px;background:var(--pds3-color-background-primary)}.row{display:flex;gap:16px;align-items:start;margin-block-end:8px}.band{background:var(--pds3-color-inverse-background-primary)}</style>
</head><body>${body}</body></html>`;

export const run = async (browser: any, source: string): Promise<{ failures: string[]; passed: number }> => {
  const failures: string[] = [];
  let passed = 0;
  const ok = (cond: boolean, what: string) => { if (cond) passed++; else failures.push(what); };
  const script = await bundle(source);

  // 1. both delivery forms
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const rows = SAMPLES.map((s) => `<div class="row${s.props.surface === 'inverse' ? ' band' : ''}" data-sample="${s.id}">${plain(s)}${element(s)}</div>`).join('');
    await page.setContent(page_(rows, theme));
    await page.addScriptTag({ content: script });
    await page.evaluate(`Promise.all([...document.querySelectorAll('p3-button')].map((e) => e.updateComplete))`);
    // The spinner fades in on mount: wait for every finite animation, so both forms are read at rest.
    await page.evaluate(`Promise.all(document.getAnimations().filter((a) => a.effect.getTiming().iterations !== Infinity).map((a) => a.finished))`);
    const read = await page.evaluate(`(() => {
      const out = {};
      for (const row of document.querySelectorAll('[data-sample]')) {
        const plainBtn = row.querySelector('[data-form="plain"]');
        const host = row.querySelector('[data-form="element"]');
        const inner = host && host.querySelector('.p3-button');
        out[row.dataset.sample] = { inner: !!inner, plain: {}, element: {} };
        for (const part of ${JSON.stringify(PARTS)}) {
          for (const [form, root] of [['plain', plainBtn], ['element', inner]]) {
            const node = root && (part ? root.querySelector(':scope > ' + part) : root);
            const cs = node ? getComputedStyle(node) : null;
            out[row.dataset.sample][form][part || 'container'] = cs ? Object.fromEntries(${JSON.stringify(PROPS)}.map((p) => [p, cs.getPropertyValue(p)])) : null;
          }
        }
      }
      return out;
    })()`);
    for (const s of SAMPLES) {
      const r = read[s.id];
      if (!r.inner) { failures.push(`${theme} ${s.id}: <p3-button> rendered no .p3-button in its light DOM`); continue; }
      for (const part of Object.keys(r.plain)) {
        const pv = r.plain[part], ev = r.element[part];
        if (!pv !== !ev) { failures.push(`${theme} ${s.id}: ${part} is ${pv ? 'missing from the element' : 'rendered by the element but not in the contract'}`); continue; }
        if (!pv) continue;
        const diffs = PROPS.filter((p) => pv[p] !== ev[p]).map((p) => `${p} ${ev[p]} (plain ${pv[p]})`);
        ok(diffs.length === 0, `${theme} ${s.id}: the element's ${part} differs from plain HTML: ${diffs.join('; ')}`);
      }
    }
    const fill = read['filled-medium']?.element?.container?.['background-color'];
    ok(!!fill && fill !== 'rgba(0, 0, 0, 0)', `${theme} filled-medium: the fill is ${fill}, so button.css did not style the element`);
    await page.close();
  }

  // 2 and 3. behavior and markup
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  try {
  await page.setContent(page_(`
    <div id="log"></div>
    <form id="f" onsubmit="event.preventDefault(); window.__submits = (window.__submits || 0) + 1">
      <p3-button id="rest" data-prop-label="Save changes"></p3-button>
      <p3-button id="pending" data-prop-label="Save changes" data-prop-ispending="true" data-prop-type="submit"></p3-button>
      <p3-button id="inactive" data-prop-label="Save changes" data-prop-isinactive="true" data-prop-type="submit"></p3-button>
      <p3-button id="disabled" data-prop-label="Save changes" data-prop-disabled="true"></p3-button>
      <p3-button id="submit" data-prop-label="Send" data-prop-type="submit"></p3-button>
      <p3-button id="text"><span slot="leadingVisual">${ICON}</span>Add item</p3-button>
      <p3-button id="link" data-prop-label="Continue" data-prop-href="#next"></p3-button>
      <p3-button id="link-pending" data-prop-label="Continue" data-prop-href="#pending" data-prop-ispending="true"></p3-button>
    </form>
    <div id="box" style="inline-size: 480px"><p3-button id="wide" data-prop-label="Save changes" data-prop-fullwidth="true"></p3-button></div>`, 'light'));
  await page.addScriptTag({ content: script });
  await page.evaluate(`(async () => {
    window.__clicks = {}; window.__calls = {};
    for (const el of document.querySelectorAll('p3-button')) {
      await el.updateComplete;
      el.addEventListener('click', () => { window.__clicks[el.id] = (window.__clicks[el.id] || 0) + 1; });
      el.onClick = () => { window.__calls[el.id] = (window.__calls[el.id] || 0) + 1; };
    }
  })()`);
  const inner = (id: string) => `#${id} > .p3-button`;
  const counts = async () => page.evaluate(`({ clicks: window.__clicks, calls: window.__calls, submits: window.__submits || 0, hash: location.hash })`);

  await page.click(inner('rest'));
  let c: any = await counts();
  ok(c.clicks.rest === 1 && c.calls.rest === 1, `rest: a click ran the listener ${c.clicks.rest ?? 0} and onClick ${c.calls.rest ?? 0} times, not once each`);
  ok(c.submits === 0, `rest: the default type submitted the form (${c.submits} submits): the default must be "button"`);
  await page.focus(inner('rest'));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  c = await counts();
  ok(c.clicks.rest === 3, `rest: Enter and Space ran the listener ${(c.clicks.rest ?? 0) - 1} times, not twice`);

  for (const id of ['pending', 'inactive']) {
    await page.click(inner(id), { force: true });
    await page.focus(inner(id));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    c = await counts();
    ok(!c.clicks[id] && !c.calls[id], `${id}: a click, Enter or Space ran the listener ${c.clicks[id] ?? 0} and onClick ${c.calls[id] ?? 0} times: it must be suppressed`);
    ok(c.submits === 0, `${id}: a suppressed submit button submitted the form (${c.submits})`);
    const focused = await page.evaluate(`document.activeElement === document.querySelector('${inner(id)}')`);
    ok(focused, `${id}: the button did not keep focus`);
    const named = await page.locator(`#${id}`).getByRole('button', { name: 'Save changes', exact: true }).count();
    ok(named === 1, `${id}: no button named "Save changes" in the accessibility tree (the spinner or the state hid the name)`);
  }
  const busy = await page.evaluate(`(() => { const b = document.querySelector('${inner('pending')}'); return [b.getAttribute('aria-busy'), b.getAttribute('aria-disabled'), b.querySelector('.p3-button__spinner')?.getAttribute('aria-hidden')]; })()`);
  ok(busy[0] === 'true' && busy[1] === 'true' && busy[2] === 'true', `pending: aria-busy ${busy[0]}, aria-disabled ${busy[1]}, spinner aria-hidden ${busy[2]}: each must be "true"`);

  await page.click(inner('disabled'), { force: true });
  c = await counts();
  ok(!c.clicks.disabled && !c.calls.disabled, 'disabled: a click ran the listener');
  ok(await page.evaluate(`document.querySelector('${inner('disabled')}').disabled === true`), 'disabled: the inner button is not natively disabled');

  await page.click(inner('submit'));
  c = await counts();
  ok(c.submits === 1, `submit: type="submit" submitted the form ${c.submits} times, not once`);

  const text = await page.evaluate(`(() => { const e = document.querySelector('#text'); return [e.label, e.querySelector('.p3-button__label')?.textContent, !!e.querySelector('.p3-button__leading-visual > span > svg'), e.querySelectorAll(':scope > *').length]; })()`);
  ok(text[0] === 'Add item' && text[1] === 'Add item', `text label: the label is ${JSON.stringify(text[1])}, not "Add item"`);
  ok(text[2] === true && text[3] === 1, `slot: the leadingVisual child is not inside the leading-visual span, or the host keeps ${text[3]} children`);

  const toggled = await page.evaluate(`(async () => {
    const e = document.querySelector('#rest'); e.isPending = true; await e.updateComplete;
    const on = [e.querySelector('.p3-button').getAttribute('aria-busy'), !!e.querySelector('.p3-button__spinner'), e.getAttribute('data-prop-ispending')];
    e.isPending = false; await e.updateComplete;
    const off = [e.querySelector('.p3-button').getAttribute('aria-busy'), !!e.querySelector('.p3-button__spinner'), e.getAttribute('data-prop-ispending')];
    return [on, off];
  })()`);
  ok(JSON.stringify(toggled[0]) === '["true",true,"true"]', `pending toggle on: aria-busy, spinner, reflected attribute are ${JSON.stringify(toggled[0])}`);
  ok(JSON.stringify(toggled[1]) === '[null,false,null]', `pending toggle off: aria-busy, spinner, reflected attribute are ${JSON.stringify(toggled[1])}`);

  await page.click(inner('link'));
  c = await counts();
  ok(c.hash === '#next', `link: the click navigated to ${JSON.stringify(c.hash)}, not #next`);
  ok((await page.getByRole('link', { name: 'Continue' }).count()) === 2, 'link: href did not render two links named "Continue"');
  await page.click(inner('link-pending'), { force: true });
  c = await counts();
  ok(c.hash === '#next', `link pending: a pending link navigated to ${c.hash}`);

  const widths = await page.evaluate(`[document.querySelector('${inner('wide')}').getBoundingClientRect().width, document.querySelector('#box').getBoundingClientRect().width]`);
  ok(Math.abs(widths[0] - widths[1]) < 0.5, `fullWidth: the button is ${widths[0]}px in a ${widths[1]}px container`);

  await page.evaluate(`document.activeElement && document.activeElement.blur()`);
  await page.focus(inner('rest'));
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(`(() => { const b = document.activeElement; return [b === document.querySelector('${inner('rest')}'), getComputedStyle(b).outlineStyle]; })()`);
  ok(ring[0] && ring[1] !== 'none', `focus: Tab reached the button ${ring[0]}, its outline is ${ring[1]}`);
  await page.focus(inner('inactive'));
  await page.keyboard.press('Tab');
  const afterInactive = await page.evaluate(`document.activeElement.parentElement && document.activeElement.parentElement.id`);
  ok(afterInactive === 'submit', `tab order: Tab from inactive reached ${afterInactive}, not submit (disabled must be skipped)`);
  } catch (e) {
    failures.push(`behavior: the checks stopped: ${(e as Error).message.split('\n')[0]}`);
  } finally { await page.close(); }
  return { failures, passed };
};

const swap = (from: string | RegExp, to: string, what: string): string => {
  const next = ELEMENT_SOURCE.replace(from, to);
  if (next === ELEMENT_SOURCE) throw new Error(`self-test "${what}" changed nothing: its anchor is gone, so rewrite it`);
  return next;
};
const MUTANTS = [
  { name: 'click suppression removed', source: swap('if (this.isPending || this.isInactive) {', 'if (false) {', 'suppression'), mustName: /pending: a click, Enter or Space ran the listener/ },
  { name: 'a shadow root in place of the light DOM', source: swap('createRenderRoot() {\n    return this;', 'createRenderRoot() {\n    return this.attachShadow({ mode: \'open\' });', 'shadow'), mustName: /rendered no \.p3-button in its light DOM/ },
  { name: 'the default type changed to submit', source: swap('this.type = "button";', 'this.type = "submit";', 'type'), mustName: /rest: the default type submitted the form/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch();
  let fail = 0;
  try {
    const real = await run(browser, ELEMENT_SOURCE);
    if (real.failures.length) {
      fail++;
      console.error(`FAIL element browser check: ${real.failures.length} failure(s), ${real.passed} passed`);
      for (const f of real.failures) console.error(`  - ${f}`);
    } else console.log(`OK element browser check: ${real.passed} checks (both delivery forms equal on light and dark, click suppression, keyboard, form, link, slots, focus)`);
    for (const m of MUTANTS) {
      const r = await run(browser, m.source);
      if (r.failures.some((x) => m.mustName.test(x))) console.log(`OK self-test: "${m.name}" fails by name`);
      else { fail++; console.error(`FAIL self-test: "${m.name}" was not reported by name (${r.failures.slice(0, 4).join('; ') || 'nothing'})`); }
    }
  } finally { await browser.close(); }
  process.exit(fail ? 1 : 0);
}
