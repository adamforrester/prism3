/**
 * THE FIELD ELEMENT BROWSER CHECK (#3408 S4 for the fields): `<p3-text-field>` and `<p3-password-field>` in Chromium,
 * with the real token CSS and `@prism3/css`'s stylesheets, on the light and dark themes. Fails by name.
 *
 *   npm run -w @prism3/tokens build     (first: the page inlines the built token CSS)
 *   npx tsx packages/web-components/check-browser-fields.ts
 *
 * 1. THE SAME FIELD IN BOTH DELIVERY FORMS. For each sample, plain HTML (`@prism3/css`'s own demo markup, `fieldHtml`)
 *    and the element render side by side; every listed computed property of every part must be equal. A field's box
 *    must also draw a border, so a page where the CSS never loaded can't pass by both sides being unstyled.
 * 2. THE ASSOCIATIONS, by role. Each input is found by its label's text (`getByLabel`), its `aria-describedby` names
 *    the message, an error sets `aria-invalid`, and Tab goes from the Show/Hide button to the input (the anatomy's order,
 *    as `@prism3/css` has it; journal S3, owner decision 2).
 * 3. THE SHOW/HIDE BUTTON, per the def (Q301.4 A, Q301.5 A, Q301.7 A): a click or Enter or Space switches the input
 *    between masked and plain, keeps the caret, keeps focus on the button, changes its name between "Show password" and
 *    "Hide password" with no `aria-pressed`, and announces once in a polite live region. A submit returns the input to
 *    masked before the submit's bubble phase. Disabled disables the button; read-only leaves it live.
 * 4. BEFORE AND AFTER THE SCRIPT. The `@prism3/css` markup written inside `<p3-password-field>` is a plain password
 *    field before any script (the button hidden), and works with `@prism3/css/password-field.js` alone. When the
 *    element's script then runs, the element adopts that markup: the label, the input's id, a typed value and focus carry
 *    over, and one click toggles once (the CSS script stands aside inside an upgraded element).
 * 5. VALUE AND onChange. Typing calls `onChange` once per input event and updates `value`; setting `value` sets the
 *    input; the typed value is never written into an attribute.
 *
 * 6. A STATUS ALWAYS WRITES ITS MESSAGE (Q-POC2 A, #1712 A). At error, warning and success, with `showMessage` off,
 *    each element writes its message, shown, with `validationMessage` as its text, and names it in the input's
 *    `aria-describedby`. A status set live writes it; back at default, `showMessage` off writes none. The plain form
 *    (`@prism3/css`'s markup) is held the same way at each status with `showMessage` off, and a field pre-rendered at
 *    error adopts with `showMessage` off, so set back to default it writes no message.
 *    A status with neither `validationMessage` nor `helpText` logs one console warning naming the element and its
 *    status (OWNER DECISION 1 B, #3968); a field with either text, or at default, logs none.
 *
 * SELF-TEST: seven mutants must each fail by name: the submit handler removed, adoption dropping a typed value, the
 * toggle moving focus to the input, the caret put back only once (Chromium resets it a task later), `@prism3/css`'s
 * script no longer standing aside, the message written only when `showMessage` is on (Q-POC2 A), and the empty-status console warning removed
 * (OWNER DECISION 1 B).
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle, sourceOf } from './bundle';
import { COPY, ICON, fieldHtml, type FieldOpts } from '../css/demo-fields';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const TOKENS_CSS = resolve(REPO, 'packages/tokens/dist/prism3.css');
if (!existsSync(TOKENS_CSS)) { console.error('FAIL setup: packages/tokens/dist/prism3.css is missing. Run: npm run -w @prism3/tokens build'); process.exit(1); }
const CSS = ['button.css', 'field-label.css', 'field-message.css', 'text-field.css', 'password-field.css'].map((f) => readFileSync(resolve(REPO, 'packages/css', f), 'utf8'));
const CSS_SCRIPT = readFileSync(resolve(REPO, 'packages/css/password-field.js'), 'utf8');
type Kind = 'text-field' | 'password-field';
const KINDS: Kind[] = ['text-field', 'password-field'];
const SOURCE: Record<Kind, string> = { 'text-field': sourceOf('p3-text-field.js'), 'password-field': sourceOf('p3-password-field.js') };

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// ------------------------------------------------------------------------------------------------ 1. both delivery forms
type Sample = Omit<FieldOpts, 'demo'>;
const samples = (kind: Kind): Sample[] => [
  ...['small', 'medium', 'large'].flatMap((size) => ['default', 'error', 'warning', 'success'].map((status) => ({ kind, id: `${kind}-${size}-${status}`, size, status, state: 'rest', icons: false, message: true }))),
  ...['filled', 'disabled', 'read-only', 'pending'].map((state) => ({ kind, id: `${kind}-${state}`, size: 'medium', status: 'default', state, icons: false, message: true })),
  { kind, id: `${kind}-icons`, size: 'large', status: 'error', state: 'rest', icons: true, message: true },
  { kind, id: `${kind}-required`, size: 'small', status: 'default', state: 'rest', icons: false, message: false, required: true },
  // showMessage off at error: both forms still write the message (Q-POC2 A)
  { kind, id: `${kind}-error-no-showmessage`, size: 'medium', status: 'error', state: 'rest', icons: false, message: false },
];
/** The plain form: `@prism3/css`'s demo markup, with the Show/Hide button as its script leaves it (shown). */
const plain = (s: Sample) => `<span data-form="plain">${fieldHtml({ ...s, demo: s.id }).replace(/(class="p3-button p3-password-field__toggle"[^>]*?) hidden/, '$1')}</span>`;
/** The element form: the same field as props. */
const element = (s: Sample) => {
  const c = COPY[s.kind];
  const filled = s.state !== 'rest' && s.state !== 'disabled';
  const a: Record<string, string> = {
    'data-prop-label': c.label, 'data-prop-size': s.size, 'data-prop-validation': s.status, 'data-prop-id': `el-${s.id}`,
    'data-prop-name': s.kind === 'password-field' ? 'password' : 'email',
    'data-prop-autocomplete': s.kind === 'password-field' ? 'current-password' : 'email',
  };
  if (s.kind === 'text-field') a['data-prop-type'] = 'email';
  if (c.placeholder) a['data-prop-placeholder'] = c.placeholder;
  if (filled) a['data-prop-defaultvalue'] = c.value;
  if (s.message) a['data-prop-showmessage'] = 'true';
  if (s.message || s.status !== 'default') a[s.status === 'default' ? 'data-prop-helptext' : 'data-prop-validationmessage'] = c.message[s.status];
  if (s.required) a['data-prop-required'] = 'true';
  if (s.state === 'disabled') a['data-prop-disabled'] = 'true';
  if (s.state === 'read-only') a['data-prop-readonly'] = 'true';
  if (s.state === 'pending') a['data-prop-ispending'] = 'true';
  const kids = s.icons ? `<span slot="leadingIcon">${ICON.leading}</span>${s.kind === 'text-field' ? `<span slot="trailingIcon">${ICON.trailing}</span>` : ''}` : '';
  return `<p3-${s.kind} data-form="element" ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}>${kids}</p3-${s.kind}>`;
};
const PROPS = ['display', 'background-color', 'color', 'caret-color', 'border-top-color', 'border-top-width', 'border-top-left-radius', 'outline-style', 'outline-width',
  'padding-block-start', 'padding-block-end', 'padding-inline-start', 'padding-inline-end', 'row-gap', 'column-gap', 'min-block-size', 'min-inline-size',
  'font', 'letter-spacing', 'text-decoration-line', 'opacity', 'inline-size', 'block-size'];
const PARTS = (k: Kind) => ['', '.p3-field-label', '.p3-field-label__label', '.p3-field-label__indicator', `.p3-${k}__control`, `.p3-${k}__content`, `.p3-${k}__entry`,
  `.p3-${k}__leading-visual`, `.p3-${k}__trailing-visual`, `.p3-${k}__spinner`, '.p3-field-message', '.p3-field-message__glyph-cell', '.p3-field-message__error-glyph',
  '.p3-field-message__warning-glyph', '.p3-field-message__success-glyph', '.p3-field-message__caption-cell', '.p3-field-message__label',
  `.p3-${k}__label-row`, `.p3-${k}__label-cell`, `.p3-${k}__toggle`, `.p3-${k}__toggle-text`];

const page_ = (body: string, theme = 'light') => `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8">
<style>${readFileSync(TOKENS_CSS, 'utf8')}</style>${CSS.map((c) => `<style>${c}</style>`).join('')}
<style>body{margin:0;padding:16px;background:var(--pds3-color-surface-default)}.row{display:grid;grid-template-columns:320px 320px;gap:16px;align-items:start;margin-block-end:8px}</style>
</head><body>${body}</body></html>`;

/** The mutable pieces a mutant may replace. */
type Sources = { elements: Record<Kind, string>; cssScript: string };

export const run = async (browser: any, src: Sources): Promise<{ failures: string[]; passed: number }> => {
  const failures: string[] = [];
  let passed = 0;
  const ok = (cond: boolean, what: string) => { if (cond) passed++; else failures.push(what); };
  const scripts = Object.fromEntries(await Promise.all(KINDS.map(async (k) => [k, await bundle(src.elements[k], `p3-${k}.js`)]))) as Record<Kind, string>;
  const load = async (page: any) => { for (const k of KINDS) await page.addScriptTag({ content: scripts[k] }); await page.evaluate(`Promise.all([...document.querySelectorAll('p3-text-field, p3-password-field')].map((e) => e.updateComplete))`); };
  const settle = (page: any) => page.evaluate(`Promise.all(document.getAnimations().filter((a) => a.effect.getTiming().iterations !== Infinity).map((a) => a.finished))`);

  // 1. both delivery forms
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    const all = KINDS.flatMap(samples);
    await page.setContent(page_(all.map((s) => `<div class="row" data-sample="${s.id}" data-kind="${s.kind}">${plain(s)}${element(s)}</div>`).join(''), theme));
    await load(page);
    await settle(page);
    const read = await page.evaluate(`(() => {
      const out = {};
      for (const row of document.querySelectorAll('[data-sample]')) {
        const k = row.dataset.kind;
        const roots = { plain: row.querySelector('[data-form="plain"] > .p3-' + k), element: row.querySelector('[data-form="element"] > .p3-' + k) };
        const r = out[row.dataset.sample] = { kind: k, element: !!roots.element, parts: {} };
        const parts = ${JSON.stringify(Object.fromEntries(KINDS.map((k) => [k, PARTS(k)])))}[k];
        for (const part of parts) for (const form of ['plain', 'element']) {
          const node = roots[form] && (part ? roots[form].querySelector(part) : roots[form]);
          const cs = node ? getComputedStyle(node) : null;
          (r.parts[part || 'root'] ??= {})[form] = cs ? Object.fromEntries(${JSON.stringify(PROPS)}.map((p) => [p, cs.getPropertyValue(p)])) : null;
        }
      }
      return out;
    })()`);
    for (const s of KINDS.flatMap(samples)) {
      const r = read[s.id];
      if (!r.element) { failures.push(`${theme} ${s.id}: the element rendered no .p3-${s.kind}`); continue; }
      for (const [part, forms] of Object.entries<any>(r.parts)) {
        if (!forms.plain && !forms.element) continue;
        if (!forms.plain || !forms.element) { failures.push(`${theme} ${s.id}: ${part} is in the ${forms.plain ? 'plain HTML' : 'element'} only`); continue; }
        const diff = PROPS.filter((p) => forms.plain[p] !== forms.element[p]);
        ok(!diff.length, `${theme} ${s.id}: the element's ${part} differs from plain HTML: ${diff.map((p) => `${p} ${forms.element[p]} vs ${forms.plain[p]}`).join('; ')}`);
      }
      const box = r.parts[`.p3-${s.kind}__control`].element;
      ok(box && box['border-top-width'] !== '0px' && box['border-top-color'] !== 'rgba(0, 0, 0, 0)', `${theme} ${s.id}: the box draws no border (is the CSS loaded?)`);
    }
    await page.close();
  }

  // 2-3. associations and the Show/Hide button
  {
    const page = await browser.newPage();
    await page.setContent(page_(`<form id="f">
      <p3-text-field data-prop-label="Email address" data-prop-id="email" data-prop-type="email" data-prop-showmessage="true" data-prop-validation="error" data-prop-validationmessage="Enter an email address."></p3-text-field>
      <p3-password-field data-prop-label="Password" data-prop-id="pw" data-prop-autocomplete="current-password" data-prop-showmessage="true" data-prop-helptext="Use at least 12 characters."></p3-password-field>
      <p3-password-field data-prop-label="Old password" data-prop-id="ro" data-prop-autocomplete="current-password" data-prop-readonly="true" data-prop-defaultvalue="hunter22"></p3-password-field>
      <p3-password-field data-prop-label="Locked" data-prop-id="off" data-prop-autocomplete="current-password" data-prop-disabled="true"></p3-password-field>
      <button type="submit" id="go">Sign in</button></form>`));
    await load(page);
    await page.evaluate(`document.getElementById('f').addEventListener('submit', (e) => { window.__typeAtSubmit = document.getElementById('pw').type; e.preventDefault(); })`);
    const email = page.getByLabel('Email address');
    ok(await email.count() === 1, 'association: no single input is labeled "Email address"');
    ok(await email.evaluate((n: any) => n.getAttribute('aria-invalid') === 'true' && document.getElementById(n.getAttribute('aria-describedby'))?.textContent.includes('Enter an email address.')), 'association: the error field\'s input lacks aria-invalid, or its aria-describedby does not reach the message');
    // getByLabel reads the label's whole text, the aria-hidden required marker included, so the match is anchored, not exact.
    const pw = page.getByLabel(/^Password\*?$/);
    ok(await pw.count() === 1 && await pw.getAttribute('type') === 'password', 'association: no single masked input is labeled "Password"');
    // Tab: the button, then the input (the anatomy's order)
    await page.focus('#email');
    await page.keyboard.press('Tab');
    const first = await page.evaluate(`document.activeElement.className`);
    await page.keyboard.press('Tab');
    const second = await page.evaluate(`document.activeElement.id`);
    ok(first.includes('p3-password-field__toggle') && second === 'pw', `tab order: went ${first} → ${second}, the anatomy's order is the Show/Hide button, then the input`);

    const show = page.getByRole('button', { name: 'Show password', exact: true });
    ok(await show.count() === 3, `toggle: ${await show.count()} buttons are named "Show password", 3 expected`);
    await page.fill('#pw', 'correct horse');
    // Typed first, so the input has had focus: the case where Chromium resets a blurred input's caret on a type change.
    await page.evaluate(`document.getElementById('pw').setSelectionRange(2, 5)`);
    await page.locator('p3-password-field:has(#pw) .p3-password-field__toggle').click();
    await page.waitForTimeout(50);
    const after = await page.evaluate(`(() => { const i = document.getElementById('pw'); return { type: i.type, sel: [i.selectionStart, i.selectionEnd], focus: document.activeElement.className, pressed: document.activeElement.getAttribute('aria-pressed') }; })()`);
    ok(after.type === 'text', `toggle click: the input is ${after.type}, not text`);
    ok(after.sel.join() === '2,5', `toggle click: the caret moved to ${after.sel.join(',')}, not 2,5`);
    ok(after.focus.includes('p3-password-field__toggle'), `toggle click: focus went to "${after.focus}", not the button`);
    ok(after.pressed === null, 'toggle click: the button carries aria-pressed');
    ok(await page.getByRole('button', { name: 'Hide password', exact: true }).count() === 1, 'toggle click: no button is named "Hide password"');
    await page.waitForFunction(`document.querySelector('[data-p3-announcer]')?.textContent === 'Your password is shown'`, null, { timeout: 2000 }).then(() => ok(true, ''), () => ok(false, 'toggle click: the live region did not say "Your password is shown"'));
    ok(await page.evaluate(`document.querySelector('[data-p3-announcer]')?.getAttribute('role')`) === 'status', 'announcer: the live region is not role=status');
    await page.keyboard.press('Enter');
    ok(await page.evaluate(`document.getElementById('pw').type`) === 'password', 'toggle Enter: the input is not masked again');
    await page.waitForFunction(`document.querySelector('[data-p3-announcer]')?.textContent === 'Your password is hidden'`, null, { timeout: 2000 }).then(() => ok(true, ''), () => ok(false, 'toggle Enter: the live region did not say "Your password is hidden"'));
    await page.keyboard.press('Space');
    ok(await page.evaluate(`document.getElementById('pw').type`) === 'text', 'toggle Space: the input is not shown');
    // #3947: the delayed caret restore only undoes Chromium's reset. A value or caret written after the press, in the
    // same task and so before that restore runs, is kept; the same test as @prism3/css's (#3945), so both forms agree.
    const later = (sel: number[], value: string | null) => page.evaluate(`(() => { const i = document.getElementById('pw'); document.querySelector('p3-password-field:has(#pw) .p3-password-field__toggle').click(); ${value === null ? '' : `i.value = ${JSON.stringify(value)};`} i.setSelectionRange(${sel[0]}, ${sel[1]}); })()`);
    const read = () => page.evaluate(`(() => { const i = document.getElementById('pw'); return { type: i.type, caret: [i.selectionStart, i.selectionEnd].join() }; })()`);
    await later([1, 4], 'typed early');
    await page.waitForTimeout(50);
    let late = await read();
    ok(late.type === 'password' && late.caret === '1,4', `toggle: a value and caret 1,4 set after pressing Hide were overwritten (type ${late.type}, caret ${late.caret}) (#3947)`);
    await later([3, 6], null);
    await page.waitForTimeout(50);
    late = await read();
    ok(late.type === 'text' && late.caret === '3,6', `toggle: a caret 3,6 set after pressing Show was overwritten (type ${late.type}, caret ${late.caret}) (#3947)`);
    ok(await page.evaluate(`document.querySelectorAll('[data-p3-announcer]').length`) === 1, 'announcer: more than one live region');
    await page.click('#go');
    ok(await page.evaluate(`window.__typeAtSubmit`) === 'password', `submit: the input was ${await page.evaluate(`window.__typeAtSubmit`)} when the form submitted, not password (Q301.7 A)`);
    ok(await page.evaluate(`document.getElementById('pw').type`) === 'password', 'submit: the input is not masked after the submit');
    // read-only: the button stays live; disabled: the button is disabled
    await page.locator('p3-password-field:has(#ro) .p3-password-field__toggle').click();
    ok(await page.evaluate(`document.getElementById('ro').type`) === 'text', 'read-only: the Show/Hide button did not show the value');
    ok(await page.locator('p3-password-field:has(#off) .p3-password-field__toggle').isDisabled(), 'disabled: the Show/Hide button is not disabled');
    await page.close();
  }

  // 4. before and after the script
  {
    const page = await browser.newPage();
    const pre = fieldHtml({ kind: 'password-field', id: 'pre', demo: 'pre', size: 'large', status: 'default', state: 'rest', icons: false, message: true, required: true });
    await page.setContent(page_(`<form><p3-password-field>${pre}</p3-password-field></form>`));
    const before = await page.evaluate(`(() => { const i = document.getElementById('pre'); const b = document.querySelector('.p3-password-field__toggle'); return { type: i.type, hidden: getComputedStyle(b).display === 'none', label: document.querySelector('label').control === i }; })()`);
    ok(before.type === 'password' && before.hidden && before.label, `before any script: ${JSON.stringify(before)}; a plain password field with its button hidden and its label naming the input is expected`);
    await page.addScriptTag({ content: src.cssScript });
    await page.locator('.p3-password-field__toggle').click();
    ok(await page.evaluate(`document.getElementById('pre').type`) === 'text', 'with @prism3/css\'s script only: the Show/Hide button did not show the value');
    // #3946: the second press, the typing and the caret are written in ONE task, so the script's delayed caret restore
    // (captured at the press, on the empty input: 0,0) always runs after them, as it did on a slow CI runner. Written as
    // separate Playwright steps, the timer almost always ran first and the check passed by timing. The read waits 50 ms
    // so a restore or reset that lands a task after the upgrade shows too.
    await page.evaluate(`(() => { const i = document.getElementById('pre'); i.focus(); document.querySelector('.p3-password-field__toggle').click(); i.value = 'typed early'; i.setSelectionRange(1, 4); })()`);
    await load(page);
    await page.waitForTimeout(50);
    const up = await page.evaluate(`(() => { const host = document.querySelector('p3-password-field'); const i = host.querySelector('.p3-password-field__entry'); return { id: i.id, value: i.value, focus: document.activeElement === i, sel: [i.selectionStart, i.selectionEnd], label: host.label, size: host.size, required: i.required, message: host.helpText, one: host.querySelectorAll('.p3-password-field').length }; })()`);
    ok(up.id === 'pre' && up.label === 'Password' && up.size === 'large' && up.required && up.message === COPY['password-field'].message.default && up.one === 1, `upgrade: the element did not adopt the markup's props: ${JSON.stringify(up)}`);
    ok(up.value === 'typed early', `upgrade: the value typed before the upgrade is ${JSON.stringify(up.value)}`);
    ok(up.focus && up.sel.join() === '1,4', `upgrade: focus and the caret did not carry over: ${JSON.stringify(up)}`);
    await page.locator('.p3-password-field__toggle').click();
    ok(await page.evaluate(`document.getElementById('pre').type`) === 'text', 'upgrade: with both scripts, one click did not show the value once (it toggled twice, or not at all)');
    await page.close();
  }

  // 5. value and onChange
  {
    const page = await browser.newPage();
    await page.setContent(page_(`<p3-text-field data-prop-label="Name" data-prop-id="nm"></p3-text-field>`));
    await load(page);
    await page.evaluate(`(() => { const el = document.querySelector('p3-text-field'); window.__calls = []; el.onChange = (e) => window.__calls.push(e.type + ':' + e.target.value); })()`);
    await page.locator('#nm').pressSequentially('ab');
    const r = await page.evaluate(`(async () => { const el = document.querySelector('p3-text-field'); const typed = el.value; el.value = 'xyz'; await el.updateComplete; return { calls: window.__calls, typed, input: document.getElementById('nm').value, attrs: [...el.attributes].map((a) => a.value).filter((v) => v.includes('ab') || v.includes('xyz')) }; })()`);
    ok(r.calls.join() === 'input:a,input:ab', `onChange: called as ${JSON.stringify(r.calls)}, once per input event expected`);
    ok(r.typed === 'ab', `value: typing "ab" left value ${JSON.stringify(r.typed)}`);
    ok(r.input === 'xyz', `value: setting value left the input at ${JSON.stringify(r.input)}`);
    ok(r.attrs.length === 0, `value: the value was written into an attribute: ${JSON.stringify(r.attrs)}`);
    await page.close();
  }

  // 6. a status always writes its message (Q-POC2 A, #1712 A), with showMessage left off
  {
    const page = await browser.newPage();
    const STATUSES = ['error', 'warning', 'success'];
    const read = `(id) => {
      const input = document.getElementById(id);
      const f = input.closest('.p3-text-field, .p3-password-field');
      const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      const msg = f.querySelector('.p3-field-message');
      const linked = !!msg && ids.includes(msg.id) && document.getElementById(msg.id) === msg;
      const box = msg ? msg.getBoundingClientRect() : null;
      const shown = !!msg && getComputedStyle(msg).display !== 'none' && !msg.closest('[hidden]') && box.width > 0 && box.height > 0;
      return { linked, shown, text: msg ? msg.textContent.trim() : null, invalid: input.getAttribute('aria-invalid'), describedBy: input.getAttribute('aria-describedby') };
    }`;
    const say = (x: any) => `aria-describedby ${JSON.stringify(x.describedBy)}, message ${x.text === null ? 'absent' : x.shown ? 'shown' : 'not shown'}`;
    await page.setContent(page_(KINDS.flatMap((k) => STATUSES.map((st) => `<p3-${k} data-prop-label="L" data-prop-id="${k}-${st}" data-prop-validation="${st}" data-prop-validationmessage="Message at ${st}."${k === 'password-field' ? ' data-prop-autocomplete="current-password"' : ''}></p3-${k}>`)).join('')
      + `<p3-text-field data-prop-label="Live" data-prop-id="live"></p3-text-field>`));
    await load(page);
    for (const k of KINDS) for (const st of STATUSES) {
      const x = await page.evaluate(`(${read})('${k}-${st}')`);
      ok(x.linked && x.shown, `Q-POC2: <p3-${k}> at ${st} with showMessage off renders no linked, shown message (${say(x)})`);
      ok(x.text === `Message at ${st}.`, `Q-POC2: <p3-${k}> at ${st} with showMessage off writes ${JSON.stringify(x.text)}, not its validationMessage`);
      if (st === 'error') ok(x.invalid === 'true', `Q-POC2: <p3-${k}> at error does not set aria-invalid`);
    }
    // A status set live writes the message; back at default, showMessage off writes none.
    const live = async (st: string) => page.evaluate(`(async () => { const el = document.querySelector('p3-text-field:has(#live)'); el.validation = '${st}'; el.validationMessage = 'Live ${st}.'; await el.updateComplete; return (${read})('live'); })()`);
    const before = await page.evaluate(`(${read})('live')`);
    ok(before.text === null && before.describedBy === null, `Q-POC2: <p3-text-field> at default with showMessage off writes a message (${say(before)})`);
    const err = await live('error');
    ok(err.linked && err.shown && err.invalid === 'true', `Q-POC2: <p3-text-field> set to error live renders no linked, shown message (${say(err)})`);
    const back = await live('default');
    ok(back.text === null && back.describedBy === null && back.invalid === null, `Q-POC2: <p3-text-field> set back to default with showMessage off keeps a message (${say(back)})`);
    await page.close();
  }

  // 6b. the plain form (@prism3/css's markup) at each status with showMessage off: the message written, shown and
  // named in aria-describedby. demo.html builds every status field with its message on, so this is the one place the
  // plain form is read with it off.
  {
    const page = await browser.newPage();
    const STATUSES = ['error', 'warning', 'success'];
    await page.setContent(page_(KINDS.flatMap((k) => STATUSES.map((st) => plain({ kind: k, id: `plain-${k}-${st}`, size: 'medium', status: st, state: 'rest', icons: false, message: false }))).join('')));
    for (const k of KINDS) for (const st of STATUSES) {
      const x = await page.evaluate(`(() => {
        const input = document.getElementById('plain-${k}-${st}');
        const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        const msg = input.closest('.p3-${k}').querySelector('.p3-field-message');
        const box = msg ? msg.getBoundingClientRect() : null;
        return { linked: !!msg && ids.includes(msg.id) && document.getElementById(msg.id) === msg,
          shown: !!msg && getComputedStyle(msg).display !== 'none' && !msg.closest('[hidden]') && box.width > 0 && box.height > 0,
          text: msg ? msg.textContent.trim() : null, describedBy: input.getAttribute('aria-describedby') };
      })()`);
      ok(x.linked && x.shown && !!x.text, `Q-POC2: the plain ${k} at ${st} with showMessage off renders no linked, shown message (aria-describedby ${JSON.stringify(x.describedBy)}, message ${x.text === null ? 'absent' : x.shown ? 'shown' : 'not shown'})`);
    }
    await page.close();
  }

  // 6c. upgrade at a status (Q-POC2 A): a message pre-rendered at error was required, not chosen, so adoption leaves
  // showMessage off, and the field set live back to default writes no message.
  {
    const page = await browser.newPage();
    await page.setContent(page_(KINDS.map((k) => `<p3-${k}>${fieldHtml({ kind: k, id: `pre-error-${k}`, demo: `pre-error-${k}`, size: 'medium', status: 'error', state: 'rest', icons: false, message: true })}</p3-${k}>`).join('')));
    await load(page);
    for (const k of KINDS) {
      const up = await page.evaluate(`(async () => {
        const el = document.querySelector('p3-${k}');
        const at = { showMessage: el.showMessage, validation: el.validation, validationMessage: el.validationMessage };
        el.validation = 'default';
        await el.updateComplete;
        const input = el.querySelector('.p3-${k}__entry');
        return { ...at, after: { message: !!el.querySelector('.p3-field-message'), describedBy: input.getAttribute('aria-describedby'), invalid: input.getAttribute('aria-invalid') } };
      })()`);
      ok(up.validation === 'error' && !!up.validationMessage, `upgrade at error: <p3-${k}> did not adopt the status and its message: ${JSON.stringify(up)}`);
      ok(!up.showMessage && !up.after.message && up.after.describedBy === null && up.after.invalid === null, `Q-POC2: <p3-${k}> pre-rendered at error, upgraded and set back to default keeps its message (showMessage ${JSON.stringify(up.showMessage)}, message ${up.after.message ? 'written' : 'absent'}, aria-describedby ${JSON.stringify(up.after.describedBy)})`);
    }
    await page.close();
  }

  // 6d. a status with no text warns the developer (OWNER DECISION 1 B, #3968). At error, warning or success with
  // neither validationMessage nor helpText, each element logs one console warning that names it and its status. A
  // field with either text, or at default, logs none, and a status set live warns once, not on every render.
  {
    const page = await browser.newPage();
    const warnings: string[] = [];
    page.on('console', (m: any) => { if (m.type() === 'warning') warnings.push(m.text()); });
    const STATUSES = ['error', 'warning', 'success'];
    const auto = (k: Kind) => (k === 'password-field' ? ' data-prop-autocomplete="current-password"' : '');
    await page.setContent(page_(KINDS.flatMap((k) => [
      ...STATUSES.map((st) => `<p3-${k} data-prop-label="L" data-prop-id="empty-${k}-${st}" data-prop-validation="${st}"${auto(k)}></p3-${k}>`),
      `<p3-${k} data-prop-label="L" data-prop-id="vm-${k}" data-prop-validation="error" data-prop-validationmessage="Why."${auto(k)}></p3-${k}>`,
      `<p3-${k} data-prop-label="L" data-prop-id="ht-${k}" data-prop-validation="warning" data-prop-helptext="Help."${auto(k)}></p3-${k}>`,
      `<p3-${k} data-prop-label="L" data-prop-id="def-${k}"${auto(k)}></p3-${k}>`,
    ]).join('') + `<p3-text-field data-prop-label="Live" data-prop-id="live-empty"></p3-text-field>`));
    await load(page);
    const named = (k: string, st: string) => warnings.filter((w) => w.includes(`<p3-${k}>`) && w.includes(`validation="${st}"`) && /no validationMessage or helpText/.test(w));
    for (const k of KINDS) for (const st of STATUSES)
      ok(named(k, st).length === 1, `OWNER DECISION 1 B: <p3-${k}> at ${st} with neither validationMessage nor helpText logs ${named(k, st).length} console warnings naming it, not 1 (${JSON.stringify(warnings.slice(0, 3))})`);
    ok(warnings.length === KINDS.length * STATUSES.length, `OWNER DECISION 1 B: the page logs ${warnings.length} console warnings, not ${KINDS.length * STATUSES.length}: one per empty-status field, none for a field with a validationMessage, a helpText, or at default (${JSON.stringify(warnings)})`);
    const before = warnings.length;
    await page.evaluate(`(async () => { const el = document.querySelector('p3-text-field:has(#live-empty)'); el.validation = 'error'; await el.updateComplete; el.label = 'Live 2'; await el.updateComplete; })()`);
    ok(warnings.length - before === 1, `OWNER DECISION 1 B: <p3-text-field> set live to error with no text logs ${warnings.length - before} console warnings over two renders, not 1`);
    await page.close();
  }
  return { failures, passed };
};

// ------------------------------------------------------------------------------------------------ self-test
const swap = (text: string, from: string | RegExp, to: string, what: string): string => {
  const next = text.replace(from, to);
  if (next === text) throw new Error(`self-test "${what}" changed nothing: its anchor is gone, so rewrite it`);
  return next;
};
const REAL: Sources = { elements: SOURCE, cssScript: CSS_SCRIPT };
const PF = SOURCE['password-field'];
// Each mutant's source is built when it runs, after the real run, so a hand mutation that moves an anchor still gets
// the real run's failures by name, and the moved anchor fails its own self-test.
const MUTANTS: { name: string; src: () => Sources; mustName: RegExp }[] = [
  { name: '@prism3/css\'s delayed caret restore unguarded (#3946)', src: () => ({ ...REAL, cssScript: swap(CSS_SCRIPT, 'if (input.selectionStart === 0 && input.selectionEnd === 0) input.setSelectionRange(start, end);', 'input.setSelectionRange(start, end);', 'css guard') }), mustName: /^upgrade: focus and the caret did not carry over/ },
  { name: 'the delayed caret restore unguarded (#3947)', src: () => ({ ...REAL, elements: { ...SOURCE, 'password-field': swap(PF, 'if (input.selectionStart === 0 && input.selectionEnd === 0) input.setSelectionRange(start, end);', 'input.setSelectionRange(start, end);', 'guard') }}), mustName: /^toggle: a value and caret 1,4 set after pressing Hide were overwritten/ },
  { name: 'the submit handler removed', src: () => ({ ...REAL, elements: { ...SOURCE, 'password-field': swap(PF, "document.addEventListener('submit', this.#onSubmit, true);", '', 'submit') }}), mustName: /^submit: the input was text when the form submitted/ },
  { name: 'adoption dropping a typed value', src: () => ({ ...REAL, elements: { ...SOURCE, 'password-field': swap(PF, 'if (input.value !== (input.getAttribute(\'value\') ?? \'\')) this.value = input.value;', '', 'adopt value') }}), mustName: /^upgrade: the value typed before the upgrade is ""/ },
  { name: 'the toggle moving focus to the input', src: () => ({ ...REAL, elements: { ...SOURCE, 'password-field': swap(PF, 'this.requestUpdate();\n    announce(', 'input.focus();\n    this.requestUpdate();\n    announce(', 'focus') }}), mustName: /^toggle click: focus went to "p3-password-field__entry"/ },
  { name: 'the caret put back once only, not after Chromium\'s reset', src: () => ({ ...REAL, elements: { ...SOURCE, 'password-field': swap(PF, '      setTimeout(() => {\n        if (input.selectionStart === 0 && input.selectionEnd === 0) input.setSelectionRange(start, end);\n      }, 0);\n', '', 'caret') }}), mustName: /^toggle click: the caret moved to 0,0, not 2,5/ },
  { name: 'the message written only when showMessage is on (Q-POC2 A)', src: () => ({ ...REAL, elements: { ...SOURCE, 'text-field': swap(SOURCE['text-field'], "const writeMessage = this.showMessage || status !== 'default';", 'const writeMessage = this.showMessage;', 'writeMessage') }}), mustName: /^Q-POC2: <p3-text-field> at error with showMessage off renders no linked, shown message/ },
  { name: 'the empty-status console warning removed (OWNER DECISION 1 B)', src: () => ({ ...REAL, elements: { ...SOURCE, 'text-field': swap(SOURCE['text-field'], /\n\s*if \(empty && this\.#warnedStatus !== status\) console\.warn\([^\n]*/, '', 'empty-status warning') }}), mustName: /^OWNER DECISION 1 B: <p3-text-field> at error with neither validationMessage nor helpText logs 0 console warnings/ },
  { name: '@prism3/css\'s script no longer standing aside', src: () => ({ ...REAL, cssScript: swap(CSS_SCRIPT, "const owned = (button) => !!button.closest('p3-password-field:defined');", 'const owned = () => false;', 'owned')}), mustName: /^upgrade: with both scripts, one click did not show the value once/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch();
  let fail = 0;
  try {
    const real = await run(browser, REAL);
    if (real.failures.length) {
      fail++;
      console.error(`FAIL browser (fields): ${real.failures.length} failure(s), ${real.passed} passed`);
      for (const x of real.failures) console.error(`  - ${x}`);
    } else console.log(`OK browser (fields): ${real.passed} checks pass: both delivery forms match on both themes, the associations hold by role, and the Show/Hide button, the upgrade and the value behave as the defs say`);
    for (const m of MUTANTS) {
      let src: Sources;
      try { src = m.src(); } catch (e) { fail++; console.error(`FAIL self-test: "${m.name}": ${(e as Error).message}`); continue; }
      const r = await run(browser, src);
      if (r.failures.some((x) => m.mustName.test(x))) console.log(`OK self-test: "${m.name}" fails by name`);
      else { fail++; console.error(`FAIL self-test: "${m.name}" was not reported by name (${r.failures.slice(0, 4).join('; ') || 'nothing'})`); }
    }
  } finally { await browser.close(); }
  process.exit(fail ? 1 : 0);
}
