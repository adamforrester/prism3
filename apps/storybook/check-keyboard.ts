/**
 * THE SCRIPTED KEYBOARD SUITE (#3408 S5; arm 1 architecture item 8): real key presses in Chromium, over the built
 * Storybook, in both delivery forms. Fails by name.
 *
 *   npm run -w @prism3/storybook build          (first: writes storybook-static/)
 *   npx tsx apps/storybook/check-keyboard.ts
 *
 * 1. TAB ORDER, every story. Tab from the top of the story's page until focus leaves the component, and name each
 *    stop by its role and accessible name, read from the browser. The order expected is written here from the defs'
 *    `accessibility.keyboard` and prop descriptions: a disabled control is no stop at all; an inactive or pending
 *    button stays a stop; a read-only or pending field stays a stop; a decorative glyph is never one; the password
 *    field is "the input, then the Show/Hide button". The two forms of each case must also give the same order.
 *    KNOWN: the password field gives the button first, in both forms, against its def (#3967, an owner decision).
 *    That is held as a named exception: the check asserts today's order, and fails once it changes, so the exception
 *    is removed when #3967 is decided.
 * 2. SPACE AND ENTER on the button. Each press runs the action once (the element's `onClick`; the HTML form's own
 *    click listener). On an inactive or pending `<p3-button>`, neither runs it and focus stays. The HTML form has no
 *    script, so suppressing an inactive button's action is the page's (`@prism3/css` README): checked there is only
 *    that focus stays.
 * 3. THE SHOW/HIDE TOGGLE, by keyboard. Space shows the password and the button's name becomes "Hide password"; Enter
 *    hides it again and the name is "Show password"; focus stays on the button throughout (the def's keyboard line).
 * 4. FOCUS-VISIBLE ON KEYBOARD ONLY. Reached by Tab, the button and the Show/Hide button match `:focus-visible` and
 *    draw their outline, and the text field's box draws its focus edge. Focused by a mouse click, the two buttons
 *    are focused but draw no outline. (A text input matches `:focus-visible` on a click too, by the HTML spec, so the
 *    field's box is not held to keyboard-only.)
 *
 * RIGHT TO LEFT (#3986 part 2): all four run again with each story under `dir="rtl"`, against the same expectations.
 * The password field's def says "Tab order follows the visual order in left-to-right and right-to-left layouts", and
 * the DOM order doesn't move with direction, so the stops are the same list (#3967's exception included). Failures
 * right to left carry "(rtl)" after the story id. NO ARROW KEYS: none of the three defs names one (the text field's
 * is "native text editing"), and this suite held none before RTL, so there is no arrow expectation to hold.
 *
 * NOT HERE: a form-level focus move on submit to the field or the error summary (#1712 A). It is page behavior, and
 * no story has a form.
 *
 * SELF-TEST: nine mutants, each must fail by name.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { at, context, DIRS, dirsFor, DROPPED, main, open, result, stateOf, stories, type Dir, type Plant, type Story, type Result } from './a11y-harness.ts';

const NAME: Record<string, string> = { pending: 'Saving', 'with-visuals': 'Add item' };
const LABEL: Record<string, string> = { 'text-field': 'Email address', 'password-field': 'Password' };

/** The Tab stops a case must have, written from the defs. */
const DEF_ORDER = (s: Story): string[] => {
  if (stateOf(s) === 'disabled') return [];
  if (s.component === 'button') return [`button "${NAME[s.case] ?? 'Save changes'}"`];
  const box = `textbox "${LABEL[s.component]}"`;
  if (s.component === 'text-field') return [box];
  return [box, `button "${s.case.startsWith('shown') ? 'Hide' : 'Show'} password"`];
};
/** KNOWN (#3967): today's order where it differs from the def. Each must still hold, or the check fails. */
const KNOWN: { issue: string; applies: (s: Story) => boolean; order: (s: Story) => string[] } = {
  issue: '#3967',
  applies: (s) => s.component === 'password-field' && stateOf(s) !== 'disabled',
  order: (s) => [...DEF_ORDER(s)].reverse(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = any;
/** The focused node, as `role "name"`, read from the browser's accessibility tree; `body` when nothing is focused. */
const focused = async (page: Page): Promise<string> => {
  if (await page.evaluate(() => document.activeElement === document.body || !document.activeElement)) return 'body';
  const snap: string = await page.locator(':focus').ariaSnapshot();
  const m = /^- (\w+) "([^"]*)"/.exec(snap.trim());
  return m ? `${m[1]} "${m[2]}"` : snap.trim().split('\n')[0];
};
const tabStops = async (page: Page): Promise<string[]> => {
  const out: string[] = [];
  // start from the top of the page, whatever a story's play left focused
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const f = await focused(page);
    if (f === 'body' || out.includes(f)) break;
    if (!(await page.evaluate(() => !!document.activeElement?.closest('#storybook-root')))) break;
    out.push(f);
  }
  return out;
};
/** Two frames after a key press, so a deferred effect of it (a timeout, a re-render) has run before the read. */
const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const show = (xs: string[]) => (xs.length ? xs.join(' → ') : '(none)');

export const run = async (browser: unknown, origin: string, plant: Plant = {}, only: (s: Story) => boolean = () => true): Promise<Result> => {
  const r = result();
  const ctx = await context(browser, plant);
  const page = await ctx.newPage();
  const all = stories(plant).filter(only);
  const orders: Record<string, Partial<Record<Story['form'], string[]>>> = {};
  let dir: Dir = 'ltr';
  const go = (s: Story) => open(page, origin, s, 'light', plant, dir);
  const find = (c: string, form: string, cs: string) => all.find((s) => s.component === c && s.form === form && s.case === cs && dirsFor(s, plant).includes(dir));
  try {
    // 1. Tab order
    for (const s of all) for (dir of dirsFor(s, plant)) {
      const where = at(s, dir);
      try { await go(s); } catch (e) { r.failures.push(`${where}: did not settle: ${(e as Error).message.split('\n')[0]}`); continue; }
      const got = await tabStops(page);
      r.checked.add(where);
      (orders[`${s.component}--${s.case}${dir === 'rtl' ? ' (rtl)' : ''}`] ??= {})[s.form] = got;
      const want = DEF_ORDER(s);
      if (KNOWN.applies(s)) {
        const known = KNOWN.order(s);
        if (show(got) === show(known)) { r.passed++; continue; }
        if (show(got) === show(want)) r.failures.push(`${where}: Tab stops now match the def (${show(want)}), so the known exception ${KNOWN.issue} no longer holds: remove KNOWN`);
        else r.failures.push(`${where}: Tab stops are ${show(got)}; the def wants ${show(want)} (known exception ${KNOWN.issue}: ${show(known)})`);
        continue;
      }
      r.ok(show(got) === show(want), `${where}: Tab stops are ${show(got)}; the def wants ${show(want)}`);
    }
    for (const [key, f] of Object.entries(orders)) {
      if (f.element && f.html) r.ok(show(f.element) === show(f.html), `${key}: the two forms' Tab stops differ — element ${show(f.element)}, html ${show(f.html)}`);
    }

    for (dir of DIRS) for (const form of ['element', 'html'] as const) {
      // 2. Space and Enter on the button
      for (const cs of ['rest', 'inactive', 'pending']) {
        const s = find('button', form, cs);
        if (!s) continue;
        await go(s);
        await page.evaluate((f: string) => {
          const w = window as unknown as { acts: number };
          w.acts = 0;
          if (f === 'element') (document.querySelector('#storybook-root p3-button') as unknown as { onClick: () => void }).onClick = () => { w.acts++; };
          else document.querySelector('#storybook-root .p3-button')!.addEventListener('click', () => { w.acts++; });
        }, form);
        await page.keyboard.press('Tab');
        const name = `button "${NAME[cs] ?? 'Save changes'}"`;
        for (const [key, n] of [['Space', 1], ['Enter', 2]] as const) {
          await page.keyboard.press(key);
          await settle(page);
          const acts = await page.evaluate(() => (window as unknown as { acts: number }).acts);
          if (cs === 'rest') r.ok(acts === n, `${at(s, dir)}: ${key} on the button ran the action ${acts} times in all, want ${n}`);
          else if (form === 'element') r.ok(acts === 0, `${at(s, dir)}: ${key} on a ${cs} button ran the action ${acts} times; the def suppresses it`);
          r.ok(await focused(page) === name, `${at(s, dir)}: after ${key}, focus is on ${await focused(page)}, not the ${name}`);
        }
      }

      // 3. Show/Hide by keyboard
      const pw = find('password-field', form, 'rest');
      if (pw) {
        await go(pw);
        let reached = false;
        for (let i = 0; i < 4 && !reached; i++) { await page.keyboard.press('Tab'); reached = (await focused(page)) === 'button "Show password"'; }
        r.ok(reached, `${at(pw, dir)}: Tab never reached the Show/Hide button`);
        if (reached) {
          const type = () => page.evaluate(() => (document.querySelector('#storybook-root input') as HTMLInputElement).type);
          await page.keyboard.press('Space');
          await settle(page);
          r.ok(await type() === 'text', `${at(pw, dir)}: Space on Show/Hide left the input type ${await type()}, want text (shown)`);
          r.ok(await focused(page) === 'button "Hide password"', `${at(pw, dir)}: after Space, focus left the Show/Hide button or its name is not "Hide password" (${await focused(page)})`);
          await page.keyboard.press('Enter');
          await settle(page);
          r.ok(await type() === 'password', `${at(pw, dir)}: Enter on Show/Hide left the input type ${await type()}, want password (hidden)`);
          r.ok(await focused(page) === 'button "Show password"', `${at(pw, dir)}: after Enter, focus left the Show/Hide button or its name is not "Show password" (${await focused(page)})`);
        }
      }

      // 4. Focus-visible on keyboard only
      const ring = () => page.evaluate(() => {
        const a = document.activeElement as HTMLElement;
        return { fv: a.matches(':focus-visible'), outline: getComputedStyle(a).outlineStyle, inRoot: !!a.closest('#storybook-root') };
      });
      for (const [c, sel, label] of [['button', '#storybook-root .p3-button', 'the button'], ['password-field', '#storybook-root .p3-password-field__toggle', 'the Show/Hide button']] as const) {
        const s = find(c, form, 'rest');
        if (!s) continue;
        await go(s);
        let k = await ring();
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press('Tab');
          if (await page.evaluate((q: string) => document.activeElement === document.querySelector(q), sel)) break;
        }
        k = await ring();
        r.ok(k.inRoot && k.fv && k.outline !== 'none', `${at(s, dir)}: ${label} reached by Tab should match :focus-visible and draw its outline (focus-visible ${k.fv}, outline ${k.outline})`);
        await go(s);
        await page.click(sel);
        const m = await ring();
        r.ok(m.inRoot, `${at(s, dir)}: a mouse click did not focus ${label}`);
        r.ok(!m.fv && m.outline === 'none', `${at(s, dir)}: a mouse click drew the focus ring on ${label} (focus-visible ${m.fv}, outline ${m.outline}); it is for keyboard focus only`);
      }
      const tf = find('text-field', form, 'rest');
      if (tf) {
        await go(tf);
        await page.keyboard.press('Tab');
        const edge = await page.evaluate(() => getComputedStyle(document.querySelector('#storybook-root .p3-text-field__control')!).outlineStyle);
        r.ok(edge !== 'none', `${at(tf, dir)}: the field reached by Tab draws no focus edge on its box (outline ${edge})`);
      }
    }
  } finally {
    await ctx.close();
  }
  if (all.some((s) => s.form === 'html' && s.component === 'button')) {
    r.notes.push('an inactive or pending HTML button still runs a click listener: the @prism3/css README leaves suppressing it to the page');
  }
  return r;
};

const rest = (c: string) => (s: Story) => s.component === c && s.case === 'rest';
const MUTANTS = [
  {
    name: 'the Show/Hide button taken out of the tab order',
    plant: { after: 'document.querySelectorAll("#storybook-root .p3-password-field__toggle").forEach((b) => b.setAttribute("tabindex", "-1"))' },
    only: rest('password-field'),
    mustName: /components-password-field-(element|html)--rest: Tab stops are textbox "Password"; the def wants/,
  },
  {
    name: 'Space swallowed on every button',
    plant: { init: 'for (const t of ["keydown", "keyup"]) document.addEventListener(t, (e) => { if (e.key === " " && e.target instanceof Element && e.target.closest("button")) e.preventDefault(); }, true);' },
    only: (s: Story) => rest('button')(s) || rest('password-field')(s),
    mustName: /components-button-(element|html)--rest: Space on the button ran the action 0 times in all, want 1/,
  },
  {
    name: 'the focus ring drawn on mouse focus too',
    plant: { css: '#storybook-root .p3-button:focus { outline: 2px solid currentColor !important; }' },
    only: rest('button'),
    mustName: /components-button-(element|html)--rest: a mouse click drew the focus ring on the button/,
  },
  {
    name: 'Show/Hide moving focus to the input',
    plant: { init: 'document.addEventListener("click", (e) => { const b = e.target instanceof Element && e.target.closest(".p3-password-field__toggle"); if (b) setTimeout(() => document.getElementById(b.getAttribute("aria-controls")).focus(), 0); });' },
    only: rest('password-field'),
    mustName: /components-password-field-(element|html)--rest: after Space, focus left the Show\/Hide button/,
  },
  {
    name: 'the password field reordered to the def (as if #3967 were decided)',
    plant: { after: 'document.querySelectorAll("#storybook-root .p3-password-field").forEach((f) => f.querySelector("input").after(f.querySelector(".p3-password-field__toggle")))' },
    only: rest('password-field'),
    mustName: /components-password-field-(element|html)--rest: Tab stops now match the def .*so the known exception #3967 no longer holds/,
  },
  {
    name: 'a disabled button left in the tab order (aria-disabled instead of disabled)',
    plant: { after: 'document.querySelectorAll("#storybook-root .p3-button[disabled]").forEach((b) => { b.removeAttribute("disabled"); b.setAttribute("aria-disabled", "true"); })' },
    only: (s: Story) => s.component === 'button' && s.case === 'disabled',
    mustName: /components-button-(element|html)--disabled: Tab stops are button "Save changes"; the def wants \(none\)/,
  },
  {
    name: 'the Show/Hide button taken out of the tab order right to left only',
    plant: { after: 'if (document.querySelector("[data-story-frame]")?.dir === "rtl") document.querySelectorAll("#storybook-root .p3-password-field__toggle").forEach((b) => b.setAttribute("tabindex", "-1"))' },
    only: rest('password-field'),
    mustName: /components-password-field-(element|html)--rest \(rtl\): Tab stops are textbox "Password"; the def wants/,
  },
  {
    name: 'Space swallowed on every button right to left only',
    plant: { init: 'for (const t of ["keydown", "keyup"]) document.addEventListener(t, (e) => { if (e.key === " " && e.target instanceof Element && e.target.closest("[dir=rtl] button")) e.preventDefault(); }, true);' },
    only: (s: Story) => rest('button')(s) || rest('password-field')(s),
    mustName: /components-button-(element|html)--rest \(rtl\): Space on the button ran the action 0 times in all, want 1/,
  },
  {
    name: 'the focus ring dropped right to left only',
    plant: { css: '#storybook-root [dir="rtl"] .p3-button:focus-visible { outline: none !important; }' },
    only: rest('button'),
    mustName: /components-button-(element|html)--rest \(rtl\): the button reached by Tab should match :focus-visible and draw its outline/,
  },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main('keyboard', 'Tab order (every story, both forms agreeing), Space and Enter on the button, the Show/Hide toggle by keyboard, and focus-visible on keyboard only, left to right and right to left.', run as never, [...MUTANTS, ...DROPPED('keyboard')]);
}
