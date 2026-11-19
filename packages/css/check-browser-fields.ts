/**
 * THE BROWSER CHECK FOR THE FIELDS (#3408 S3): `demo.html`'s text and password fields, rendered in Chromium with the
 * real token CSS and `password-field.js`, on the light and dark themes. Fails by name.
 *
 *   npm run -w @prism3/tokens build     (first: the demo links the built token CSS)
 *   npx tsx packages/css/check-browser-fields.ts
 *
 * 1. COMPUTED AGAINST RESOLVED. For a sample of states, each computed color and size equals the token's value as the
 *    agent-adherence scorer's oracle resolves it from the DTCG. The token NAMES are written here by hand, from the
 *    defs; `check-parity-fields.ts` covers every row with sentinels, this covers the real values.
 * 2. FOCUS. Tab reaches the inputs and the Show/Hide button; a focused field draws its 2px focus edge (an inset
 *    outline in the border's paint), with the status color on a status field.
 * 3. THE LABEL AND MESSAGE, in the accessibility tree: the input's name is its label, its description is its message,
 *    `aria-invalid` reads as invalid at error, `required` as required.
 * 4. THE SHOW/HIDE BUTTON: hidden before the script runs; then "Show password", and pressing it (click, Enter, Space)
 *    switches the input's type, renames the button, keeps focus and the caret, announces the change, and never sets
 *    aria-pressed (the caret is read on an input that has had focus, after the task in which Chromium resets it,
 *    #3921, and a caret set after the press is kept, #3945); a form submit puts the field back to hidden; a
 *    disabled field's button does nothing.
 * 5. GEOMETRY. The button's hit area is at least 24×24 at small and 44×44 at medium and large, and never reaches into
 *    the input box; the box is at least 44px tall at every size; the message's glyph centers on its first line. All
 *    held to this file's own px literals (docs/34).
 *
 * 6. A STATUS ALWAYS WRITES ITS MESSAGE (Q-POC2 A, #1712 A). Every demo field at error, warning or success has its
 *    message written, shown and named in the input's `aria-describedby`.
 *
 * SELF-TEST: ten mutants, each must fail by name.
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildOracle } from '../../tools/agent-adherence/score-code';
import { TOKEN_TREE, TOKEN_BASE, TOKEN_OVERLAYS, COMPONENTS } from '../../tools/agent-adherence/oracle';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const json = (p: string) => JSON.parse(readFileSync(resolve(REPO, p), 'utf8'));
const TOKENS_CSS = resolve(REPO, 'packages/tokens/dist/prism3.css');
const DEMO = pathToFileURL(resolve(HERE, 'demo.html')).href;
/** The toggle's least hit area per FIELD size (the button stays small): 24 at small, 44 at medium and large (Q-HT1 A). */
const TOGGLE_FLOOR_PX: Record<string, number> = { small: 24, medium: 44, large: 44 };
/** The input box's least height at every size: the field keeps the 44px target (password-field `size` prop). */
const BOX_FLOOR_PX = 44;
/** Layout rounds to 1/64 px (Chromium's LayoutUnit), so a floor met exactly can read a sixty-fourth under. */
const LAYOUT_UNIT = 1 / 64;

const oracle = buildOracle({
  commit: 'working tree', tree: json(TOKEN_TREE), base: json(TOKEN_BASE),
  overlays: Object.fromEntries(Object.entries(TOKEN_OVERLAYS).map(([m, f]) => [m, json(f)])), components: json(COMPONENTS),
});
const resolved = (mode: string, token: string): string => {
  const val = oracle.modes[mode]?.[`${oracle.root}-${token.replace(/\./g, '-')}`];
  if (val === undefined) throw new Error(`the oracle has no ${token} in ${mode}`);
  return val;
};

type Sample = { demo: string; state?: 'hover' | 'focus' | 'value'; part?: string; pseudo?: string; prop: string; token: string; kind: 'color' | 'length' | 'neg-length' };
const S = (demo: string, prop: string, token: string, kind: Sample['kind'], more: Partial<Sample> = {}): Sample => ({ demo, prop, token, kind, ...more });
const C = '.p3-text-field__control';
const PC = '.p3-password-field__control';
const samples = (theme: string): Sample[] => {
  const t = (rest: string) => `${theme}/text-field/${rest}`;
  const p = (rest: string) => `${theme}/password-field/${rest}`;
  return [
    S(t('medium/default/rest'), 'background-color', 'color.field.fill', 'color', { part: C }),
    S(t('medium/default/rest'), 'border-top-color', 'color.field.border.rest', 'color', { part: C }),
    S(t('medium/default/rest'), 'border-top-width', 'border-width.hairline', 'length', { part: C }),
    S(t('medium/default/rest'), 'border-top-left-radius', 'radius.sm', 'length', { part: C }),
    S(t('medium/default/rest'), 'min-height', 'size.md.min-height', 'length', { part: C }),
    S(t('medium/default/rest'), 'padding-left', 'space.200', 'length', { part: C }),
    S(t('medium/default/rest'), 'padding-top', 'space.100', 'length', { part: C }),
    S(t('medium/default/rest'), 'row-gap', 'space.100', 'length'),
    S(t('medium/default/rest'), 'color', 'color.text.secondary', 'color', { part: 'input', pseudo: '::placeholder' }),
    S(t('medium/default/rest'), 'color', 'color.text.primary', 'color', { part: '.p3-field-label__label' }),
    S(t('medium/default/rest'), 'color', 'color.text.secondary', 'color', { part: '.p3-field-message__label' }),
    S(t('medium/default/filled'), 'color', 'color.text.primary', 'color', { part: 'input' }),
    S(t('medium/default/rest'), 'border-top-color', 'color.field.border.hover', 'color', { part: C, state: 'hover' }),
    S(t('medium/default/rest'), 'border-top-color', 'color.border.focus', 'color', { part: C, state: 'focus' }),
    S(t('medium/default/rest'), 'outline-color', 'color.border.focus', 'color', { part: C, state: 'focus' }),
    S(t('medium/default/rest'), 'outline-width', 'focus.ring.width', 'length', { part: C, state: 'focus' }),
    S(t('medium/default/rest'), 'outline-offset', 'focus.ring.width', 'neg-length', { part: C, state: 'focus' }),
    S(t('medium/default/rest'), 'caret-color', 'color.text.primary', 'color', { part: 'input', state: 'focus' }),
    S(t('medium/error/rest'), 'border-top-color', 'color.border.danger', 'color', { part: C }),
    S(t('medium/error/rest'), 'outline-color', 'color.border.danger', 'color', { part: C, state: 'focus' }),
    S(t('medium/error/rest'), 'color', 'color.text.danger', 'color', { part: '.p3-field-message__label' }),
    S(t('medium/error/rest'), 'color', 'color.icon.danger', 'color', { part: '.p3-field-message__error-glyph' }),
    S(t('medium/warning/rest'), 'border-top-color', 'color.border.warning', 'color', { part: C }),
    S(t('medium/success/filled'), 'border-top-color', 'color.border.success', 'color', { part: C }),
    S(t('medium/default/disabled'), 'background-color', 'color.disabled.fill', 'color', { part: C }),
    S(t('medium/default/disabled'), 'border-top-color', 'color.disabled.border', 'color', { part: C }),
    S(t('medium/default/disabled'), 'color', 'color.disabled.on-fill', 'color', { part: 'input', pseudo: '::placeholder' }),
    S(t('medium/default/disabled'), 'color', 'color.disabled.on-fill', 'color', { part: 'input', state: 'value' }),
    S(t('medium/default/disabled'), 'color', 'color.disabled.text', 'color', { part: '.p3-field-label__label' }),
    S(t('medium/default/read-only'), 'border-top-color', 'color.field.border.rest', 'color', { part: C }),
    S(t('medium/default/read-only'), 'color', 'color.text.primary', 'color', { part: 'input' }),
    S(t('medium/default/icons'), 'color', 'color.icon.primary', 'color', { part: '.p3-text-field__leading-visual' }),
    S(t('medium/default/icons'), 'width', 'icon.size.sm', 'length', { part: '.p3-text-field__trailing-visual' }),
    S(t('medium/default/pending'), 'color', 'color.icon.primary', 'color', { part: '.p3-text-field__spinner' }),
    S(t('large/default/rest'), 'min-height', 'size.lg.height', 'length', { part: C }),
    S(t('small/default/rest'), 'padding-top', 'space.075', 'length', { part: C }),
    S(p('medium/default/rest'), 'border-top-color', 'color.field.border.rest', 'color', { part: PC }),
    S(p('medium/error/filled'), 'outline-color', 'color.border.danger', 'color', { part: PC, state: 'focus' }),
    S(p('medium/default/rest'), 'color', 'color.interactive.primary.text.rest', 'color', { part: '.p3-password-field__toggle .p3-button__label' }),
    S(p('medium/error/rest'), 'color', 'color.interactive.primary.text.rest', 'color', { part: '.p3-password-field__toggle .p3-button__label' }),
    S(p('medium/default/disabled'), 'color', 'color.disabled.text', 'color', { part: '.p3-field-label__label' }),
  ];
};
const THEMES: Record<string, string> = { light: 'light', dark: 'dark' };

type Opts = { css?: string; init?: string; after?: string };
export const run = async (browser: any, o: Opts = {}): Promise<{ failures: string[]; passed: number }> => {
  const failures: string[] = [];
  let passed = 0;
  const ok = (cond: boolean, what: string) => { if (cond) passed++; else failures.push(what); };
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  ctx.setDefaultTimeout(5000);
  if (o.init) await ctx.addInitScript(o.init);
  const page = await ctx.newPage();
  await page.goto(DEMO);
  if (o.css) await page.addStyleTag({ content: o.css });
  if (o.after) await page.evaluate(o.after);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  await cdp.send('Accessibility.enable');
  const docId = (await cdp.send('DOM.getDocument', { depth: -1 })).root.nodeId;
  const node = async (sel: string) => (await cdp.send('DOM.querySelector', { nodeId: docId, selector: sel })).nodeId;
  const normalize = (kind: string, val: string) => page.evaluate(([k, v]: string[]) => {
    const el = document.createElement('div');
    document.body.append(el);
    if (k === 'color') el.style.color = v; else el.style.width = v;
    const out = k === 'color' ? getComputedStyle(el).color : getComputedStyle(el).width;
    el.remove();
    return out;
  }, [kind, val]);

  // 1. computed against resolved
  for (const [theme, mode] of Object.entries(THEMES)) {
    for (const s of samples(theme)) {
      const root = `[data-demo="${s.demo}"]`;
      const target = s.part ? `${root} ${s.part}` : root;
      if (!(await node(target))) { failures.push(`${s.demo}: no ${s.part ?? 'field'} in the demo`); continue; }
      if (s.state === 'hover') await cdp.send('CSS.forcePseudoState', { nodeId: await node(`${root} .p3-${s.demo.split('/')[1]}__control`), forcedPseudoClasses: ['hover'] });
      if (s.state === 'focus') await page.focus(`${root} input`);
      const saved = s.state === 'value' ? await page.evaluate((q: string) => { const i = document.querySelector(q) as HTMLInputElement; const v = i.value; i.value = 'Entered'; return v; }, `${root} input`) : undefined;
      const got = await page.evaluate(([q, prop, pseudo]: string[]) => getComputedStyle(document.querySelector(q)!, pseudo || null).getPropertyValue(prop), [target, s.prop, s.pseudo ?? '']);
      let want = await normalize(s.kind === 'color' ? 'color' : 'length', resolved(mode, s.token));
      if (s.kind === 'neg-length') want = `-${want}`;
      ok(got === want, `${s.demo}${s.state ? ` (${s.state})` : ''}${s.part ? ` ${s.part}${s.pseudo ?? ''}` : ''} ${s.prop} is ${got}, ${s.kind === 'neg-length' ? 'minus ' : ''}${s.token} resolves to ${want} in ${mode}`);
      if (s.state === 'hover') await cdp.send('CSS.forcePseudoState', { nodeId: await node(`${root} .p3-${s.demo.split('/')[1]}__control`), forcedPseudoClasses: [] });
      if (s.state === 'focus') await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
      if (saved !== undefined) await page.evaluate(([q, v]: string[]) => { (document.querySelector(q) as HTMLInputElement).value = v; }, [`${root} input`, saved]);
    }
    // pending: the spinner shows, in place of the trailing glyph
    const pend = await page.evaluate((q: string) => {
      const el = document.querySelector(q)!;
      return [getComputedStyle(el.querySelector('.p3-text-field__spinner')!).display, getComputedStyle(el.querySelector('.p3-text-field__trailing-visual') ?? el).display];
    }, `[data-demo="${theme}/text-field/medium/default/pending"]`);
    ok(pend[0] !== 'none', `${theme} pending text field: the spinner should show (display ${pend[0]})`);
    const rest = await page.evaluate((q: string) => getComputedStyle(document.querySelector(q)!).display, `[data-demo="${theme}/text-field/medium/default/rest"] .p3-text-field__spinner`);
    ok(rest === 'none', `${theme} rest text field: the spinner should be hidden (display ${rest})`);

    // 5. geometry: the toggle's hit area, the box's height, the glyph on the first line
    for (const [size, floor] of Object.entries(TOGGLE_FLOOR_PX)) {
      const g = await page.evaluate((q: string) => {
        const f = document.querySelector(q)!;
        const b = f.querySelector('.p3-password-field__toggle')!;
        const cs = getComputedStyle(b, '::before');
        const r = b.getBoundingClientRect();
        const box = f.querySelector('.p3-password-field__control')!.getBoundingClientRect();
        return { w: parseFloat(cs.width), h: parseFloat(cs.height), bottom: r.top + parseFloat(cs.top) + parseFloat(cs.height), boxTop: box.top, boxH: box.height };
      }, `[data-demo="${theme}/password-field/${size}/default/rest"]`);
      ok(g.w >= floor - LAYOUT_UNIT && g.h >= floor - LAYOUT_UNIT, `${theme} password ${size}: the Show/Hide hit area is ${g.w}×${g.h}, under ${floor}×${floor}`);
      ok(g.bottom <= g.boxTop + 0.01, `${theme} password ${size}: the Show/Hide hit area reaches ${(g.bottom - g.boxTop).toFixed(2)}px into the input box`);
      ok(g.boxH >= BOX_FLOOR_PX - LAYOUT_UNIT, `${theme} password ${size}: the input box is ${g.boxH}px tall, under ${BOX_FLOOR_PX}`);
    }
    for (const status of ['error', 'warning', 'success']) {
      const d = await page.evaluate((q: string) => {
        const m = document.querySelector(q)!;
        const glyph = [...m.querySelectorAll('.p3-field-message__glyph-cell > span')].find((x) => getComputedStyle(x).display !== 'none')!.getBoundingClientRect();
        // the first LINE BOX, not the inline span's content area: the caption cell's content top plus half a line
        const cell = m.querySelector('.p3-field-message__caption-cell')!;
        const cs = getComputedStyle(cell);
        const lineMid = cell.getBoundingClientRect().top + parseFloat(cs.paddingTop) + parseFloat(cs.lineHeight) / 2;
        return (glyph.top + glyph.height / 2) - lineMid;
      }, `[data-demo="${theme}/text-field/medium/${status}/rest"] .p3-field-message`);
      ok(Math.abs(d) <= 0.5, `${theme} ${status} message: the glyph sits ${d.toFixed(2)}px off its caption's first line`);
    }
  }

  // 2. focus: Tab reaches the input, then (in a password field) the button
  await page.focus('[data-demo="light/text-field/plain"] input');
  const tf = await page.evaluate(() => { const a = document.activeElement as HTMLElement; const box = a.closest('.p3-text-field')!.querySelector('.p3-text-field__control')!; return { fv: a.matches(':focus-visible'), outline: getComputedStyle(box).outlineStyle }; });
  ok(tf.fv && tf.outline !== 'none', `text field focus: the input should be focus-visible and its box draw the focus edge (${JSON.stringify(tf)})`);
  await page.focus('[data-demo="light/password-field/plain"] .p3-field-label');
  const order: string[] = [];
  await page.focus('[data-demo="light/password-field/plain"] .p3-password-field__toggle');
  order.push(await page.evaluate(() => (document.activeElement as HTMLElement).className));
  await page.keyboard.press('Tab');
  order.push(await page.evaluate(() => (document.activeElement as HTMLElement).className));
  ok(order[0].includes('p3-password-field__toggle') && order[1] === 'p3-password-field__entry', `password field: Tab should go from the Show/Hide button to the input (the anatomy's order), went ${order.join(' → ')}`);
  const ring = await page.evaluate(() => { const b = document.querySelector('[data-demo="light/password-field/plain"] .p3-password-field__toggle')!; (b as HTMLElement).focus(); return getComputedStyle(b).outlineStyle; });
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const kbRing = await page.evaluate(() => { const a = document.activeElement!; return a.matches(':focus-visible') ? getComputedStyle(a).outlineStyle : 'not focus-visible'; });
  ok(kbRing !== 'none' && kbRing !== 'not focus-visible', `password field: the Show/Hide button takes Button's focus ring on keyboard focus (${kbRing}, programmatic ${ring})`);

  // 3. the accessibility tree
  const ax = async (sel: string) => {
    const r = await cdp.send('Accessibility.getPartialAXTree', { nodeId: await node(sel), fetchRelatives: false });
    const n = r.nodes[0];
    const prop = (k: string) => n.properties?.find((p: any) => p.name === k)?.value?.value;
    return { role: n.role?.value, name: n.name?.value, description: n.description?.value, invalid: prop('invalid'), required: prop('required'), disabled: prop('disabled') };
  };
  const text = (sel: string) => page.evaluate((q: string) => document.querySelector(q)?.textContent ?? '', sel);
  const err = '[data-demo="light/text-field/medium/error/rest"]';
  const e = await ax(`${err} input`);
  ok(e.name === 'Email address', `error field: the input's accessible name should be its label, is ${JSON.stringify(e.name)}`);
  ok(!!e.description && e.description === await text(`${err} .p3-field-message__label`), `error field: the input's description should be its message, is ${JSON.stringify(e.description)}`);
  ok(e.invalid === 'true', `error field: aria-invalid should read as invalid, reads ${JSON.stringify(e.invalid)}`);
  const req = await ax('[data-demo="light/text-field/required"] input');
  ok(req.required === true, `required field: the input should read as required (${JSON.stringify(req.required)})`);
  const dis = await ax('[data-demo="light/text-field/medium/default/disabled"] input');
  ok(dis.disabled === true, `disabled field: the input should read as disabled (${JSON.stringify(dis.disabled)})`);
  const pw = await ax('[data-demo="light/password-field/medium/default/filled"] input');
  ok(pw.name === 'Password', `password field: the input's accessible name should be its label, is ${JSON.stringify(pw.name)}`);
  const glyphs = await page.evaluate((q: string) => document.querySelector(q)!.getAttribute('aria-hidden'), `${err} .p3-field-message__glyph-cell`);
  ok(glyphs === 'true', 'error field: the status glyph is hidden from the accessibility tree (the text carries the meaning)');
  for (const field of await page.evaluate(() => [...document.querySelectorAll('[data-prop-validation="error"]')].map((f) => (f as HTMLElement).dataset.demo!))) {
    const inv = await page.evaluate((q: string) => document.querySelector(q)!.getAttribute('aria-invalid'), `[data-demo="${field}"] input`);
    if (inv !== 'true') { failures.push(`${field}: an error field's input should carry aria-invalid="true"`); break; }
  }
  // Q-POC2 A (#1712 A): every field at a validation status writes its message, shows it, and names it.
  const statusFields = await page.evaluate(() => [...document.querySelectorAll('.p3-text-field, .p3-password-field')]
    .filter((f) => !['default', null].includes(f.getAttribute('data-prop-validation'))).map((f) => {
      const input = f.querySelector('input')!;
      const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      const msg = f.querySelector('.p3-field-message') as HTMLElement | null;
      const box = msg?.getBoundingClientRect();
      return {
        demo: (f as HTMLElement).dataset.demo!, status: f.getAttribute('data-prop-validation'), describedBy: input.getAttribute('aria-describedby'),
        linked: !!msg && ids.includes(msg.id) && document.getElementById(msg.id) === msg,
        shown: !!msg && getComputedStyle(msg).display !== 'none' && !msg.closest('[hidden]') && !!box && box.width > 0 && box.height > 0,
        text: msg?.textContent?.trim() ?? null,
      };
    }));
  ok(statusFields.length >= 2 * 2 * 3 * 3, `Q-POC2: only ${statusFields.length} status fields in the demo, at least 36 expected (two kinds, two themes, three sizes, three statuses)`);
  for (const x of statusFields) {
    ok(x.linked && x.shown && !!x.text, `Q-POC2: ${x.demo} at ${x.status} renders no linked, shown message (aria-describedby ${JSON.stringify(x.describedBy)}, message ${x.text === null ? 'absent' : x.shown ? JSON.stringify(x.text) : 'not shown'})`);
  }

  // 4. the Show/Hide button
  const f = '[data-demo="light/password-field/medium/default/filled"]';
  const btn = `${f} .p3-password-field__toggle`;
  const state = () => page.evaluate(([q, b]: string[]) => {
    const i = document.querySelector(`${q} input`) as HTMLInputElement;
    const t = document.querySelector(b) as HTMLButtonElement;
    return { type: i.type, focus: document.activeElement === t, pressed: t.getAttribute('aria-pressed'), hidden: t.hidden, caret: `${i.selectionStart},${i.selectionEnd}`, live: document.querySelector('[data-p3-announcer]')?.textContent ?? '' };
  }, [f, btn]);
  const name = async () => (await ax(btn)).name;
  ok(!(await state()).hidden && (await name()) === 'Show password', `Show/Hide: after the script, the button should show, named "Show password" (${await name()})`);
  // #3921: the common case, so the input has had focus. Chromium resets a blurred input's caret one task after its
  // type changes, but only once the input has been focused; an untouched input keeps it and hid the defect. The
  // person clicks into the field, selects 2–5, then presses Show (which blurs the input), and the caret is read
  // after that task has run.
  await page.click(`${f} input`);
  await page.evaluate((q: string) => { const i = document.querySelector(q) as HTMLInputElement; i.setSelectionRange(2, 5); }, `${f} input`);
  await page.click(btn);
  await page.waitForTimeout(50);
  let s1 = await state();
  ok(s1.type === 'text' && (await name()) === 'Hide password', `Show/Hide: pressing Show should show the password and rename the button "Hide password" (type ${s1.type}, ${await name()})`);
  ok(s1.focus, `Show/Hide: focus stays on the button (focus ${s1.focus})`);
  ok(s1.caret === '2,5', `Show/Hide: the caret moved to ${s1.caret}, not 2,5, after pressing Show on an input that had focus (#3921)`);
  ok(s1.live === 'Your password is shown', `Show/Hide: the change is announced politely ("${s1.live}")`);
  ok(s1.pressed === null, 'Show/Hide: the button never carries aria-pressed (its name is the state)');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  s1 = await state();
  ok(s1.type === 'password' && s1.live === 'Your password is hidden', `Show/Hide: Enter on the button hides the password again (type ${s1.type}, "${s1.live}")`);
  ok(s1.caret === '2,5', `Show/Hide: the caret moved to ${s1.caret}, not 2,5, after pressing Hide (#3921)`);
  // #3945: the delayed restore must only undo Chromium's reset. A value or a caret written after the press, in the
  // same task and so before the delayed restore runs, is kept. On a busy page that restore can run late, after a later
  // fill and selection, and an upgrading <p3-password-field> then adopted its stale 0,0.
  const later = (sel: number[], value: string | null) => page.evaluate(([q, b, s, v]: any[]) => {
    const i = document.querySelector(`${q} input`) as HTMLInputElement;
    (document.querySelector(b) as HTMLButtonElement).click();
    if (v !== null) i.value = v;
    i.setSelectionRange(s[0], s[1]);
  }, [f, btn, sel, value]);
  await later([1, 4], 'typed early');
  await page.waitForTimeout(50);
  s1 = await state();
  ok(s1.type === 'text' && s1.caret === '1,4', `Show/Hide: a value and caret 1,4 set after pressing Show were overwritten (type ${s1.type}, caret ${s1.caret}) (#3945)`);
  await later([3, 6], null);
  await page.waitForTimeout(50);
  s1 = await state();
  ok(s1.type === 'password' && s1.caret === '3,6', `Show/Hide: a caret 3,6 set after pressing Hide was overwritten (type ${s1.type}, caret ${s1.caret}) (#3945)`);
  await page.keyboard.press('Space');
  ok((await state()).type === 'text', 'Show/Hide: Space on the button shows the password');
  await page.click(btn);
  const form = '[data-demo="light/password-field/form"]';
  await page.click(`${form} [data-demo="light/password-field/plain"] .p3-password-field__toggle`);
  const shown = await page.evaluate((q: string) => (document.querySelector(q) as HTMLInputElement).type, `${form} [data-demo="light/password-field/plain"] input`);
  // the form's required field must hold a value, or the browser blocks the submit before it starts; and the submit's
  // navigation is cancelled (after the script's capture listener has run), or a reload would mask the field for it
  await page.evaluate((q: string) => document.querySelector(q)!.addEventListener('submit', (e) => e.preventDefault()), form);
  await page.fill(`${form} [data-demo="light/password-field/required"] input`, 'Entered');
  await page.click(`${form} [data-demo="light/password-field/submit"]`);
  const after = await page.evaluate((q: string) => (document.querySelector(q) as HTMLInputElement).type, `${form} [data-demo="light/password-field/plain"] input`);
  ok(shown === 'text' && after === 'password', `Show/Hide: submitting the form returns the field to hidden (${shown} → ${after})`);
  const dq = '[data-demo="light/password-field/medium/default/disabled"]';
  await page.evaluate((q: string) => (document.querySelector(q) as HTMLElement).click(), `${dq} .p3-password-field__toggle`);
  ok(await page.evaluate((q: string) => (document.querySelector(q) as HTMLInputElement).type, `${dq} input`) === 'password', 'Show/Hide: a disabled field\'s button does nothing');
  await ctx.close();

  // before the script: the button is hidden, the field a plain password input
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  nojs.setDefaultTimeout(5000);
  const np = await nojs.newPage();
  await np.goto(DEMO);
  // no addStyleTag here: it waits on a load event a page without scripts never fires
  if (o.css) await np.evaluate((c: string) => { const st = document.createElement('style'); st.textContent = c; document.head.append(st); }, o.css);
  const pre = await np.evaluate((q: string) => ({ display: getComputedStyle(document.querySelector(`${q} .p3-password-field__toggle`)!).display, type: (document.querySelector(`${q} input`) as HTMLInputElement).type }), f);
  ok(pre.display === 'none' && pre.type === 'password', `before the script runs the Show/Hide button is hidden and the input masked (display ${pre.display}, type ${pre.type})`);
  await nojs.close();
  return { failures, passed };
};

const MUTANTS: { name: string; opts: Opts; mustName: RegExp }[] = [
  { name: 'the medium toggle hit area shrunk to the small floor',
    opts: { css: '.p3-password-field[data-prop-size="medium"] .p3-password-field__toggle::before { inset: min(0%, calc((100% - var(--pds3-space-300)) / 2)) !important; }' },
    mustName: /password medium: the Show\/Hide hit area is .*under 44×44/ },
  { name: 'the toggle shown before the script runs',
    opts: { css: '.p3-password-field__toggle[hidden] { display: inline-flex !important; }' },
    mustName: /before the script runs the Show\/Hide button is hidden/ },
  { name: 'the error border rebound to the warning token',
    opts: { css: '.p3-text-field[data-prop-validation="error"] > .p3-text-field__control { border-color: var(--pds3-color-border-warning) !important; }' },
    mustName: /text-field\/medium\/error\/rest .p3-text-field__control border-top-color is .*color\.border\.danger/ },
  { name: 'the focus edge dropped',
    opts: { css: '.p3-text-field__control { outline-style: none !important; }' },
    mustName: /text field focus: the input should be focus-visible and its box draw the focus edge/ },
  { name: 'the toggle\'s clicks swallowed before the script sees them',
    opts: { init: 'document.addEventListener("click", (e) => { if (e.target instanceof Element && e.target.closest(".p3-password-field__toggle")) e.stopImmediatePropagation(); }, true);' },
    mustName: /Show\/Hide: pressing Show should show the password/ },
  { name: 'the script\'s submit handler never attached',
    opts: { init: 'const add = EventTarget.prototype.addEventListener; EventTarget.prototype.addEventListener = function (t, ...r) { if (t === "submit" && this === document) return; return add.call(this, t, ...r); };' },
    mustName: /Show\/Hide: submitting the form returns the field to hidden/ },
  { name: 'aria-describedby dropped from every input',
    opts: { after: 'document.querySelectorAll("input[aria-describedby]").forEach((i) => i.removeAttribute("aria-describedby"))' },
    mustName: /error field: the input's description should be its message/ },
  { name: 'the message left out of an error field (Q-POC2 A)',
    opts: { after: 'document.querySelector(\'[data-demo="light/text-field/medium/error/filled"] > .p3-field-message\').remove()' },
    mustName: /^Q-POC2: light\/text-field\/medium\/error\/filled at error renders no linked, shown message \(aria-describedby "[^"]+", message absent\)/ },
  { name: 'the message hidden at warning (Q-POC2 A)',
    opts: { css: '[data-demo="light/password-field/medium/warning/filled"] > .p3-field-message { display: none !important; }' },
    mustName: /^Q-POC2: light\/password-field\/medium\/warning\/filled at warning renders no linked, shown message .*message not shown/ },
  { name: 'the caret put back only in the same task (#3921)',
    opts: { init: 'const st = window.setTimeout; window.setTimeout = (fn, ms, ...a) => (ms === 0 && String(fn).includes("setSelectionRange") ? 0 : st(fn, ms, ...a));' },
    mustName: /Show\/Hide: the caret moved to 0,0, not 2,5, after pressing Show on an input that had focus/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(TOKENS_CSS)) { console.error('FAIL browser (fields): no token CSS. Run first: npm run -w @prism3/tokens build'); process.exit(1); }
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  let bad = 0;
  try {
    const real = await run(browser);
    if (real.failures.length) { bad++; console.error(`FAIL browser (fields): ${real.failures.length} check(s) failed, ${real.passed} passed`); for (const x of real.failures) console.error(`  - ${x}`); }
    else console.log(`OK browser (fields): ${real.passed} checks on demo.html (light and dark): computed values equal the resolved tokens, the focus edge, the label and message in the accessibility tree, the Show/Hide button with and without the script, hit areas and the glyph's first line`);
    for (const m of MUTANTS) {
      const r = await run(browser, m.opts);
      if (r.failures.some((x) => m.mustName.test(x))) console.log(`OK self-test: mutant "${m.name}" fails by name`);
      else { bad++; console.error(`FAIL self-test: mutant "${m.name}" was not caught by name (${r.failures[0] ?? 'no failures'})`); }
    }
  } finally {
    await browser.close();
  }
  process.exit(bad ? 1 : 0);
}
