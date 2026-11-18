/**
 * THE AXE CHECK (#3408 S5; arm 1 architecture item 8; Q144 A): `@axe-core/playwright` over EVERY story in the built
 * Storybook, in BOTH themes and BOTH directions (left to right, and right to left: #3986 part 2), scoped to the story
 * root. Fails by name: the story, the theme (with ", rtl" right to left), the axe rule and the node.
 *
 *   npm run -w @prism3/storybook build          (first: writes storybook-static/)
 *   npx tsx apps/storybook/check-axe.ts
 *
 * THE RULES: axe's WCAG 2.0, 2.1 and 2.2 A and AA tags. Axe's `best-practice` rules are left out, because most of
 * them judge a whole page (landmarks, a main heading, `region`), and a story root is one component.
 *
 * "NEEDS REVIEW" IS NOT A PASS. Axe returns `incomplete` for a node it could not decide, typically a contrast it
 * could not compute. An incomplete result fails here too, so a story whose contrast axe can't read can't pass by
 * silence. `ALLOWED_INCOMPLETE` below is the one place an undecidable node can be accepted, by rule and story, with
 * the reason; it is empty.
 *
 * WHAT IT CAN'T SEE: the focus ring's contrast and the hover and pressed states' non-text contrast (axe checks text
 * contrast only); keyboard behavior (`check-keyboard.ts`); and whether both forms build the same tree
 * (`check-aria.ts`).
 *
 * SELF-TEST: each mutant plants one defect into a few stories, and must fail by the axe rule's name.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { at, context, dirsFor, DROPPED, main, open, require, result, stories, type Plant, type Story, type Result } from './a11y-harness.ts';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const THEMES = ['light', 'dark'] as const;
/** `<story id> <rule id>` → why axe's "needs review" is accepted there. Empty. */
const ALLOWED_INCOMPLETE: Record<string, string> = {};

/**
 * THE ONE ACCEPTED VIOLATION, owner decision #1456: the on-fill ink contract is REST-ONLY. Hover and pressed are
 * transient, and a stepped fill whose label dips below AA there is by design (`modes.ts`, the on-fill note). So axe's
 * color-contrast is accepted on a button's label in the forced hover and pressed stories only, and only above the
 * 2.0:1 rendered floor #1456 records. Each acceptance prints as a NOTE with its measured ratio. Anything else that
 * fails contrast, rest included, fails here.
 */
const ACCEPTED = {
  issue: '#1456', rule: 'color-contrast', component: 'button', cases: ['hover', 'pressed'], target: '.p3-button__label', floor: 2.0,
};
const accepted = (s: Story, rule: string, n: { target: unknown[]; failureSummary?: string }): number | null => {
  if (rule !== ACCEPTED.rule || s.component !== ACCEPTED.component || !ACCEPTED.cases.includes(s.case)) return null;
  if (JSON.stringify(n.target) !== JSON.stringify([ACCEPTED.target])) return null;
  const m = /contrast of ([0-9.]+)/.exec(n.failureSummary ?? '');
  return m && Number(m[1]) >= ACCEPTED.floor ? Number(m[1]) : null;
};

const node = (n: { target: unknown[]; failureSummary?: string }) => `${JSON.stringify(n.target)}${n.failureSummary ? ` (${n.failureSummary.replace(/\s+/g, ' ').trim()})` : ''}`;

export const run = async (browser: unknown, origin: string, plant: Plant = {}, only: (s: Story) => boolean = () => true): Promise<Result> => {
  const { AxeBuilder } = require('@axe-core/playwright');
  const r = result();
  const ctx = await context(browser, plant);
  const page = await ctx.newPage();
  let rulesRun = 0;
  try {
    for (const s of stories(plant).filter(only)) for (const dir of dirsFor(s, plant)) for (const theme of THEMES) {
      const where = `${s.id} (${theme}${dir === 'rtl' ? ', rtl' : ''})`;
      try { await open(page, origin, s, theme, plant, dir); }
      catch (e) { r.failures.push(`${where}: did not settle: ${(e as Error).message.split('\n')[0]}`); continue; }
      const res = await new AxeBuilder({ page }).include('#storybook-root').withTags(TAGS).analyze();
      r.checked.add(at(s, dir));
      rulesRun = Math.max(rulesRun, res.passes.length + res.violations.length + res.incomplete.length);
      r.ok(res.passes.length > 0, `${where}: axe passed no rule at all, so it did not see the component`);
      let clean = true;
      for (const v of res.violations) for (const n of v.nodes) {
        const ratio = accepted(s, v.id, n);
        if (ratio !== null) { r.notes.push(`${where}: axe ${v.id} on ${ACCEPTED.target} at ${ratio}:1, accepted (${ACCEPTED.issue}: hover and pressed are exempt from the on-fill ink contract; floor ${ACCEPTED.floor}:1)`); continue; }
        clean = false;
        r.failures.push(`${where}: axe ${v.id} — ${v.help}: ${node(n)}`);
      }
      for (const v of res.incomplete) {
        const why = ALLOWED_INCOMPLETE[`${s.id} ${v.id}`];
        if (why) { r.notes.push(`${where}: axe ${v.id} needs review, accepted: ${why}`); continue; }
        for (const n of v.nodes) r.failures.push(`${where}: axe ${v.id} needs review, which is not a pass — ${v.help}: ${node(n)}`);
      }
      if (clean && !res.incomplete.length) r.passed++;
    }
  } finally {
    await ctx.close();
  }
  r.notes.push(`up to ${rulesRun} axe rules applied per story, tags ${TAGS.join(', ')}`);
  return r;
};

const field = (s: Story) => s.component !== 'button';
/** A plant's script that runs right to left only: the frame's `dir` decides, so the left-to-right run stays clean. */
const rtlOnly = (js: string) => `if (document.querySelector('[data-story-frame]')?.dir === 'rtl') { ${js} }`;
const MUTANTS = [
  {
    name: "the field label's for= unbound, so the input has no name",
    plant: { after: 'document.querySelectorAll("#storybook-root label[for]").forEach((l) => l.removeAttribute("for"))' },
    // the password field: the text field's placeholder gives axe a fallback name, so only the password field (no
    // placeholder) loses its name
    only: (s: Story) => s.component === 'password-field' && s.case === 'rest',
    mustName: /components-password-field-(element|html)--rest \(light\): axe label —/,
  },
  {
    name: "the rest button's label paled to 1.9:1 on a white fill",
    plant: { css: '#storybook-root .p3-button { background: rgb(255, 255, 255) !important; } #storybook-root .p3-button__label { color: rgb(187, 187, 187) !important; }' },
    only: (s: Story) => s.component === 'button' && s.case === 'rest',
    mustName: /components-button-(element|html)--rest \((light|dark)\): axe color-contrast —/,
  },
  {
    name: "the hover label dropped below #1456's 2.0:1 floor",
    // a label at about 1.6:1 on the dark theme's hover fill: under the floor, so the acceptance must not cover it
    plant: { css: '#storybook-root .p3-button { background: rgb(97, 137, 249) !important; } #storybook-root .p3-button__label { color: rgb(160, 185, 252) !important; }' },
    only: (s: Story) => s.component === 'button' && s.case === 'hover' && s.form === 'html',
    mustName: /components-button-html--hover \((light|dark)\): axe color-contrast —/,
  },
  {
    name: 'aria-describedby pointing at a missing id',
    plant: { after: 'document.querySelectorAll("#storybook-root input").forEach((i) => i.setAttribute("aria-describedby", "nowhere"))' },
    only: (s: Story) => field(s) && s.case === 'error',
    // axe leaves a broken idref for review, which this check fails
    mustName: /components-password-field-(element|html)--error \(light\): axe aria-valid-attr-value( needs review)?/,
  },
  {
    name: "the field label's for= unbound right to left only",
    plant: { after: rtlOnly('document.querySelectorAll("#storybook-root label[for]").forEach((l) => l.removeAttribute("for"))') },
    only: (s: Story) => s.component === 'password-field' && s.case === 'rest',
    mustName: /components-password-field-(element|html)--rest \(light, rtl\): axe label —/,
  },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main('axe', 'Every story, in light and dark, left to right and right to left, has no axe violation and nothing left for review (WCAG 2.0–2.2 A and AA).', run as never, [...MUTANTS, ...DROPPED('axe')]);
}
