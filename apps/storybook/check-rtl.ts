/**
 * THE RIGHT-TO-LEFT LAYOUT CHECK (#3986 part 2, owner decision Q-RTL1 A): every story in the built Storybook, in both
 * delivery forms, opened left to right and then under `dir="rtl"`, measured as rendered in Chromium. Fails by name.
 *
 *   npm run -w @prism3/storybook build          (first: writes storybook-static/)
 *   npx tsx apps/storybook/check-rtl.ts
 *
 * axe, the ARIA snapshot and the keyboard suite also run right to left (`check-axe.ts`, `check-aria.ts`,
 * `check-keyboard.ts`). This check is the one that measures the layout.
 *
 * WHERE THE EXPECTATIONS COME FROM. #4030's structured `mirror` field is not on `poc/arm-1`, so the rows below are
 * written by hand from the defs' right-to-left prose, never read from a def:
 *  - button.ts, codeOnly `right-to-left`: "logical properties ... mirror the whole row, so the leading and trailing
 *    visuals swap sides on their own. Only directional glyphs (back and forward chevrons) flip, set per icon
 *    (`autoMirror`), never a blanket `scaleX(-1)` on the slot; search, settings and media-transport glyphs stay as
 *    drawn."
 *  - password-field.ts, codeOnly `right-to-left`: "the label row mirrors, so the button sits at the row's left end".
 *  - text-field.ts, field-label.ts and field-message.ts carry NO right-to-left statement (#4005). Their rows rest on
 *    #4005's audit: the leading and trailing icons swap edges, the required indicator follows the label at the
 *    inline end, and the status glyph leads the caption at the inline start.
 *
 * WHAT IT HOLDS, in both directions, each story:
 *  1. DIRECTION. The component root computes `direction` equal to the story's (`open` already refuses a frame whose
 *     `dir` is not the one asked for).
 *  2. ORDER. Each pair below is drawn with its first part at the inline start of its second: to its left left to
 *     right, to its right right to left. Measured from the boxes, so it holds against the drawing, not the CSS.
 *     A pair the story should draw and doesn't fails too, so a part that vanished can't pass by silence.
 *  3. EDGE. The password field's Show/Hide button sits at the label row's right end left to right, its left end right
 *     to left.
 *  4. GLYPHS (the button's `WithVisuals`, add then a right arrow). Neither slot is transformed (no blanket flip), and
 *     the add glyph, which points nowhere, is never flipped.
 * KNOWN, each a named exception that fails once it no longer holds, so fixing it means deleting it:
 *  - #4052: the right arrow is a directional glyph and should flip right to left; per-icon mirroring is unbuilt.
 *  - #4051: the text field's input should carry `dir="auto"` (its def's aria line); neither form writes it.
 *
 * SELF-TEST: twelve mutants, each must fail by name, plus the three represented-story mutants every check carries.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { at, context, dirsFor, DROPPED, main, open, result, stateOf, stories, type Dir, type Plant, type Story, type Result } from './a11y-harness.ts';

type Box = { left: number; right: number; width: number };
const STATUS = ['error', 'warning', 'success', 'shown-error'];

/** The pairs (first at the inline start of second) a story must draw, written from the prose quoted above. */
const PAIRS = (s: Story): { a: string; b: string; what: string }[] => {
  const P = `.p3-${s.component}`;
  const out: { a: string; b: string; what: string }[] = [];
  if (s.component === 'button') {
    if (s.case === 'with-visuals') {
      out.push({ a: '.p3-button__leading-visual', b: '.p3-button__label', what: 'the leading visual is not at the inline start of the label' });
      out.push({ a: '.p3-button__label', b: '.p3-button__trailing-visual', what: 'the trailing visual is not at the inline end of the label' });
    }
    return out;
  }
  if (s.case === 'with-icons') out.push({ a: `${P}__leading-visual`, b: 'input', what: 'the leading visual is not at the inline start of the input' });
  if (s.case === 'with-icons' && s.component === 'text-field') out.push({ a: 'input', b: `${P}__trailing-visual`, what: 'the trailing visual is not at the inline end of the input' });
  if (s.case === 'required') out.push({ a: '.p3-field-label__label', b: '.p3-field-label__indicator', what: 'the required indicator is not at the inline end of the label' });
  if (STATUS.includes(stateOf(s))) out.push({ a: '.p3-field-message__glyph-cell', b: '.p3-field-message__caption-cell', what: 'the status glyph is not at the inline start of the message' });
  if (s.component === 'password-field') out.push({ a: `${P}__label-cell`, b: `${P}__toggle`, what: 'the Show/Hide button is not at the inline end of the label row' });
  return out;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = any;
const box = (page: Page, sel: string): Promise<Box | null> => page.evaluate((q: string) => {
  const e = document.querySelector(`#storybook-root ${q}`);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { left: r.left, right: r.right, width: r.width } : null;
}, sel);
const transform = (page: Page, sel: string): Promise<string | null> => page.evaluate((q: string) => {
  const e = document.querySelector(`#storybook-root ${q}`);
  return e ? getComputedStyle(e).transform : null;
}, sel);
/** A computed transform that flips the inline axis: a matrix whose first entry is negative. */
const flips = (t: string | null) => !!t && t !== 'none' && Number(/matrix\(([^,]+)/.exec(t)?.[1] ?? '1') < 0;
const px = (b: Box) => `${Math.round(b.left)}–${Math.round(b.right)}px`;
const SIDE: Record<Dir, string> = { ltr: 'left', rtl: 'right' };

/** #4052 and #4051: today's state where it differs from the prose. Each must still hold, or the check fails. */
const KNOWN = {
  arrow: { issue: '#4052', applies: (s: Story) => s.component === 'button' && s.case === 'with-visuals' },
  dirAuto: { issue: '#4051', applies: (s: Story) => s.component === 'text-field' },
};

export const run = async (browser: unknown, origin: string, plant: Plant = {}, only: (s: Story) => boolean = () => true): Promise<Result> => {
  const r = result();
  const ctx = await context(browser, plant);
  const page = await ctx.newPage();
  try {
    for (const s of stories(plant).filter(only)) for (const dir of dirsFor(s, plant)) {
      const where = at(s, dir);
      try { await open(page, origin, s, 'light', plant, dir); }
      catch (e) { r.failures.push(`${where}: did not settle: ${(e as Error).message.split('\n')[0]}`); continue; }
      r.checked.add(where);

      // 1. direction
      const computed: string = await page.evaluate(() => getComputedStyle(document.querySelector('#storybook-root [data-component]')!).direction);
      r.ok(computed === dir, `${where}: the component's computed direction is ${computed}, not ${dir}`);

      // 2. order
      for (const p of PAIRS(s)) {
        const [a, b] = [await box(page, p.a), await box(page, p.b)];
        if (!a || !b) { r.failures.push(`${where}: ${p.what}: ${!a ? p.a : p.b} is not drawn`); continue; }
        const ok = dir === 'ltr' ? a.right <= b.left + 0.5 : a.left >= b.right - 0.5;
        r.ok(ok, `${where}: ${p.what} (${dir}: ${p.a} should be ${SIDE[dir]} of ${p.b}): ${p.a} at ${px(a)}, ${p.b} at ${px(b)}`);
      }

      // 3. the Show/Hide button's edge
      if (s.component === 'password-field') {
        const [row, t] = [await box(page, '.p3-password-field__label-row'), await box(page, '.p3-password-field__toggle')];
        const end = dir === 'ltr' ? 'right' : 'left';
        if (!row || !t) r.failures.push(`${where}: the Show/Hide button is not at the label row's ${end} end: the row or the button is not drawn`);
        else r.ok(Math.abs(dir === 'ltr' ? row.right - t.right : t.left - row.left) <= 1, `${where}: the Show/Hide button is not at the label row's ${end} end (row ${px(row)}, button ${px(t)})`);
      }

      // 4. glyphs
      if (s.component === 'button' && s.case === 'with-visuals') {
        for (const slot of ['leading', 'trailing']) {
          const t = await transform(page, `.p3-button__${slot}-visual`);
          r.ok(t === 'none', `${where}: the ${slot} visual's slot is transformed (${t}); only a directional glyph flips, per icon, never the slot`);
        }
        r.ok(!flips(await transform(page, '.p3-button__leading-visual svg')), `${where}: the leading glyph (add) is flipped; a glyph that points nowhere stays as drawn`);
        if (KNOWN.arrow.applies(s)) {
          const flipped = flips(await transform(page, '.p3-button__trailing-visual svg'));
          if (dir === 'ltr') r.ok(!flipped, `${where}: the trailing arrow is flipped left to right`);
          else if (flipped) r.failures.push(`${where}: the trailing arrow now flips right to left, so the known exception ${KNOWN.arrow.issue} no longer holds: remove KNOWN.arrow`);
          else { r.passed++; r.notes.push(`${where}: the trailing arrow does not flip (known exception ${KNOWN.arrow.issue})`); }
        }
      }
      if (KNOWN.dirAuto.applies(s) && dir === 'rtl') {
        const d: string | null = await page.evaluate(() => document.querySelector('#storybook-root input')?.getAttribute('dir') ?? null);
        if (d === 'auto') r.failures.push(`${where}: the input now carries dir="auto", so the known exception ${KNOWN.dirAuto.issue} no longer holds: remove KNOWN.dirAuto`);
        else r.ok(d === null, `${where}: the input carries dir="${d}"; the def asks for dir="auto" (known exception ${KNOWN.dirAuto.issue}: none)`);
      }
    }
  } finally {
    await ctx.close();
  }
  return r;
};

const is = (c: string, cs: string) => (s: Story) => s.component === c && s.case === cs;
/** CSS that applies right to left only: the frame carries the `dir`. */
const rtl = (rules: string) => rules.split('}').filter((x) => x.trim()).map((x) => `#storybook-root [dir="rtl"] ${x.trim()} }`).join('\n');
const MUTANTS = [
  {
    name: "the button's row pinned left to right",
    plant: { css: rtl('.p3-button { direction: ltr !important; }') },
    only: is('button', 'with-visuals'),
    mustName: /components-button-(element|html)--with-visuals \(rtl\): the leading visual is not at the inline start of the label \(rtl: \.p3-button__leading-visual should be right of \.p3-button__label\)/,
  },
  {
    name: "a blanket scaleX(-1) on the button's slots",
    plant: { css: rtl('.p3-button__leading-visual, #storybook-root [dir="rtl"] .p3-button__trailing-visual { transform: scaleX(-1); }') },
    only: is('button', 'with-visuals'),
    mustName: /components-button-(element|html)--with-visuals \(rtl\): the leading visual's slot is transformed/,
  },
  {
    name: 'the add glyph flipped',
    plant: { css: rtl('.p3-button__leading-visual svg { transform: scaleX(-1); }') },
    only: is('button', 'with-visuals'),
    mustName: /components-button-(element|html)--with-visuals \(rtl\): the leading glyph \(add\) is flipped/,
  },
  {
    name: 'the arrow flipped (as if #4052 were built)',
    plant: { css: rtl('.p3-button__trailing-visual svg { transform: scaleX(-1); }') },
    only: is('button', 'with-visuals'),
    mustName: /components-button-(element|html)--with-visuals \(rtl\): the trailing arrow now flips right to left, so the known exception #4052 no longer holds/,
  },
  {
    name: "the text field's box pinned left to right",
    plant: { css: rtl('.p3-text-field__control { direction: ltr !important; }') },
    only: is('text-field', 'with-icons'),
    mustName: /components-text-field-(element|html)--with-icons \(rtl\): the trailing visual is not at the inline end of the input/,
  },
  {
    name: "the password field's label row pinned left to right",
    plant: { css: rtl('.p3-password-field__label-row { direction: ltr !important; }') },
    only: is('password-field', 'rest'),
    mustName: /components-password-field-(element|html)--rest \(rtl\): the Show\/Hide button is not at the label row's left end/,
  },
  {
    name: "the field label's row pinned left to right",
    plant: { css: rtl('.p3-field-label { direction: ltr !important; }') },
    only: is('text-field', 'required'),
    mustName: /components-text-field-(element|html)--required \(rtl\): the required indicator is not at the inline end of the label/,
  },
  {
    name: "the field message's row pinned left to right",
    plant: { css: rtl('.p3-field-message { direction: ltr !important; }') },
    only: is('password-field', 'error'),
    mustName: /components-password-field-(element|html)--error \(rtl\): the status glyph is not at the inline start of the message/,
  },
  {
    name: 'the whole frame pinned left to right by CSS (its dir attribute still rtl)',
    plant: { css: '#storybook-root [data-story-frame][dir="rtl"] { direction: ltr !important; }' },
    only: is('button', 'rest'),
    mustName: /components-button-(element|html)--rest \(rtl\): the component's computed direction is ltr, not rtl/,
  },
  {
    name: 'the leading visual left undrawn',
    plant: { css: '#storybook-root .p3-text-field__leading-visual { display: none !important; }' },
    only: is('text-field', 'with-icons'),
    mustName: /components-text-field-(element|html)--with-icons: the leading visual is not at the inline start of the input: \.p3-text-field__leading-visual is not drawn/,
  },
  {
    name: 'the input given dir="auto" (as if #4051 were fixed)',
    plant: { after: 'document.querySelectorAll("#storybook-root input").forEach((i) => i.setAttribute("dir", "auto"))' },
    only: is('text-field', 'rest'),
    mustName: /components-text-field-(element|html)--rest \(rtl\): the input now carries dir="auto", so the known exception #4051 no longer holds/,
  },
  {
    name: 'the input pinned to dir="ltr"',
    plant: { after: 'document.querySelectorAll("#storybook-root input").forEach((i) => i.setAttribute("dir", "ltr"))' },
    only: is('text-field', 'rest'),
    mustName: /components-text-field-(element|html)--rest \(rtl\): the input carries dir="ltr"; the def asks for dir="auto"/,
  },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main('rtl', 'Every story, both forms, left to right and right to left: the computed direction, each start/end pair in order, the Show/Hide button at the row\'s end, and no blanket glyph flip.', run as never, [...MUTANTS, ...DROPPED('rtl')]);
}
