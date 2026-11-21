/**
 * THE ARIA SNAPSHOT CHECK (#3408 S5; arm 1 architecture item 8): for every component and case, the custom element and
 * the plain HTML form build THE SAME ACCESSIBILITY TREE, and that tree is the one accepted. Fails by name.
 *
 *   npm run -w @prism3/storybook build          (first: writes storybook-static/)
 *   npx tsx apps/storybook/check-aria.ts            check
 *   npx tsx apps/storybook/check-aria.ts --accept   rewrite aria-snapshots.json (only when both forms agree and
 *                                                   every HAS row holds; review the diff)
 *
 * THE SNAPSHOT of a story is two parts, both read from Chromium, never from the markup:
 *  - Playwright's ARIA snapshot of the story root (role, accessible name, states such as [disabled] and [invalid],
 *    value, and text), and
 *  - each node's ACCESSIBLE DESCRIPTION from Chromium's own accessibility tree (CDP `Accessibility.getFullAXTree`),
 *    because the ARIA snapshot leaves descriptions out, and `aria-describedby` is how a field names its message
 *    (owner decision #1712 A).
 *  A story that presses Show adds the text of the page's polite live region, `[data-p3-announcer]`.
 *
 * THREE COMPARISONS, three failure names, so no one of them is derived from the thing it checks (`docs/34`):
 *  1. "the two forms differ": the element story and the HTML story of one case, against each other.
 *  2. "differs from the accepted snapshot": each against `aria-snapshots.json`, the reviewed record. A defect both
 *     forms share (they are generated from one contract) passes 1 and fails here. Only `--accept` writes the file.
 *  3. "lacks": `HAS` below, written by hand from the defs and `@prism3/css`'s demo copy: the role, name, states and
 *     description each case must expose. It is what `--accept` can't launder: it refuses to write while a row fails.
 *
 * RIGHT TO LEFT (#3986 part 2): every story is also snapshotted under `dir="rtl"`. Direction moves the layout, never the
 * tree, so the right-to-left snapshot must equal the left-to-right one of the same form ("the right-to-left tree
 * differs"), and also passes 1 to 3 on its own, each failure named with "rtl". `--accept` writes the left-to-right
 * tree only, and refuses while a right-to-left one differs from it.
 *
 * 4. NO SHADOW ROOTS (arm 1 architecture items 1 and 8): no element in a story root attaches one, open or closed.
 *    `a11y-harness.ts` records every `attachShadow` before the page's scripts run, since a closed root can't be seen
 *    afterwards. Any root fails, open or closed: Storybook's preview wraps `attachShadow` and forces every root open
 *    (for its pseudo-states addon), so the mode a component asked for can't be read here, only that it made one.
 *
 * SELF-TEST: seven mutants, each must fail by name.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { at, context, dirsFor, DROPPED, main, open, require, result, stateOf, stories, type Dir, type Plant, type Story, type Result } from './a11y-harness.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = resolve(HERE, 'aria-snapshots.json');
const ACCEPT = process.argv.includes('--accept');

// `@prism3/css`'s demo copy, written again here by hand (it is also in stories/fields.js).
const LABEL = { 'text-field': 'Email address', 'password-field': 'Password' } as const;
const MESSAGE: Record<string, Record<string, string>> = {
  'text-field': {
    default: 'We send the receipt to this address.',
    error: 'Enter an email address, such as name@example.com.',
    warning: 'Check this address. It looks like it has a typo.',
    success: 'This address can receive receipts.',
  },
  'password-field': {
    default: 'Use at least 12 characters.',
    error: 'Enter a password with at least 12 characters.',
    warning: 'This password is common. Add a few more words.',
    success: 'This password is strong.',
  },
};
const STATUS: Record<string, string> = { error: 'error', warning: 'warning', success: 'success', 'shown-error': 'error' };

/** What each case must expose, as lines that must appear in its snapshot. Written from the defs, not read from them. */
const HAS = (component: string, kase: string): string[] => {
  const c = stateOf({ case: kase });
  if (component === 'button') {
    const name = c === 'pending' ? 'Saving' : c === 'with-visuals' ? 'Add item' : 'Save changes';
    // disabled, inactive and pending are all unavailable to assistive tech: native disabled, or aria-disabled
    const states = c === 'disabled' ? 'disabled' : c === 'inactive' ? 'focusable, disabled' : c === 'pending' ? 'focusable, disabled, busy' : 'focusable';
    return [['disabled', 'inactive', 'pending'].includes(c) ? `- button "${name}" [disabled]` : `- button "${name}"`, `states of button "${name}": ${states}`];
  }
  const kind = component as keyof typeof LABEL;
  const status = STATUS[c] ?? 'default';
  const box = `textbox "${LABEL[kind]}"${status === 'error' ? ' [invalid]' : ''}${c === 'disabled' ? ' [disabled]' : ''}`;
  const set = c === 'disabled' ? ['disabled'] : ['focusable', ...(status === 'error' ? ['invalid'] : []), ...(c === 'required' ? ['required'] : []), ...(c === 'read-only' ? ['readonly'] : []), ...(c === 'pending' ? ['busy'] : [])];
  // a field drawn with the message off has no description, except at a validation status, where the message is
  // written anyway (Q-POC2 A, #1712 A); LACKS holds the absence
  const described = !kase.endsWith('-no-message') || status !== 'default';
  const lines = [`- ${box}`, ...(described ? [`description of ${box}: ${MESSAGE[kind][status]}`] : []), `states of textbox "${LABEL[kind]}": ${set.join(', ')}`];
  if (kind === 'password-field') {
    const shown = c.startsWith('shown');
    const toggle = `${shown ? 'Hide' : 'Show'} password`;
    lines.push(`- button "${toggle}"${c === 'disabled' ? ' [disabled]' : ''}`, `states of button "${toggle}": ${c === 'disabled' ? 'disabled' : 'focusable'}`);
    if (shown) lines.push('live region: Your password is shown');
  }
  return lines;
};

/** What a case must NOT expose, as line prefixes: a field with the message off at default has no description. */
const LACKS = (component: string, kase: string): string[] =>
  component !== 'button' && kase.endsWith('-no-message') && !STATUS[stateOf({ case: kase })] ? ['description of '] : [];

/** The control states read from Chromium's tree, in this order. */
const STATES = ['focusable', 'disabled', 'invalid', 'required', 'readonly', 'busy'];

/** The story's snapshot: the ARIA snapshot, then each description, then the live region's text. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const snapshot = async (page: any, s: Story): Promise<string> => {
  const aria: string = await page.locator('#storybook-root').ariaSnapshot();
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  type AX = { ignored: boolean; role?: { value: string }; name?: { value: string }; description?: { value: string }; properties?: { name: string; value: { value: unknown } }[] };
  const on = (n: AX, k: string) => n.properties?.some((x) => x.name === k && [true, 'true', 1].includes(x.value.value as never)) ?? false;
  const live = (nodes as AX[]).filter((n) => !n.ignored);
  const desc = live.filter((n) => n.description?.value).map((n) => {
    const p = (k: string) => (on(n, k) ? ` [${k}]` : '');
    return `description of ${n.role?.value} "${n.name?.value ?? ''}"${p('invalid')}${p('disabled')}: ${n.description!.value}`;
  });
  // The states Playwright's snapshot leaves out, for each control: required, read-only and busy among them.
  const states = live.filter((n) => ['button', 'textbox'].includes(n.role?.value ?? '')).map((n) => {
    const set = STATES.filter((k) => on(n, k));
    return `states of ${n.role?.value} "${n.name?.value ?? ''}": ${set.join(', ') || '(none)'}`;
  });
  const lines = [aria.trim(), ...desc, ...states];
  if (s.case.startsWith('shown')) {
    await page.waitForFunction(() => document.querySelector('[data-p3-announcer]')?.textContent, null, { timeout: 5000 }).catch(() => {});
    lines.push(`live region: ${await page.evaluate(() => document.querySelector('[data-p3-announcer]')?.textContent ?? '(none)')}`);
  }
  return lines.join('\n');
};

export const run = async (browser: unknown, origin: string, plant: Plant = {}, only: (s: Story) => boolean = () => true): Promise<Result> => {
  const r = result();
  const accepted: Record<string, string> = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
  const ctx = await context(browser, plant);
  const page = await ctx.newPage();
  const byDir: Record<Dir, Record<string, Partial<Record<Story['form'], string>>>> = { ltr: {}, rtl: {} };
  const got = byDir.ltr;
  const all = stories(plant);
  try {
    for (const s of all.filter(only)) for (const dir of dirsFor(s, plant)) {
      const where = at(s, dir);
      try { await open(page, origin, s, 'light', plant, dir); }
      catch (e) { r.failures.push(`${where}: did not settle: ${(e as Error).message.split('\n')[0]}`); continue; }
      const shadows: string[] = await page.evaluate(() => (window as unknown as { p3Shadows: { host: Element; mode: string }[] }).p3Shadows
        .filter((x) => x.host.closest('#storybook-root')).map((x) => `<${x.host.localName}>`));
      r.ok(shadows.length === 0, `${where}: the component attached a shadow root on ${shadows.join(', ')}; arm 1 is light DOM, and a closed root is ruled out (item 8)`);
      const snap = await snapshot(page, s);
      r.checked.add(where);
      (byDir[dir][`${s.component}--${s.case}`] ??= {})[s.form] = snap;
      for (const line of HAS(s.component, s.case)) {
        const present = line.startsWith('- ') ? snap.split('\n').some((l) => l.trim() === line || l.trim().startsWith(`${line}:`)) : snap.split('\n').includes(line);
        r.ok(present, `${where}: the accessibility tree lacks «${line}» (HAS, written from the def)`);
      }
      for (const prefix of LACKS(s.component, s.case)) {
        const hit = snap.split('\n').find((l) => l.startsWith(prefix));
        r.ok(!hit, `${where}: the accessibility tree has «${hit}», and a field with the message off has none (LACKS)`);
      }
    }
  } finally {
    await ctx.close();
  }
  for (const dir of ['ltr', 'rtl'] as const) for (const [key, forms] of Object.entries(byDir[dir])) {
    const rtl = dir === 'rtl' ? ', rtl' : '';
    const { element, html } = forms;
    if (element !== undefined && html !== undefined) {
      r.ok(element === html, `${key}${dir === 'rtl' ? ' (rtl)' : ''}: the two forms differ — element:\n${element}\n  html:\n${html}`);
    }
    for (const [form, snap] of Object.entries(forms)) {
      // right to left against left to right, same form: a direct comparison, which --accept can't skip
      const ltr = byDir.ltr[key]?.[form as Story['form']];
      if (dir === 'rtl' && ltr !== undefined) r.ok(snap === ltr, `${key} (${form}, rtl): the right-to-left tree differs from the left-to-right tree — rtl:\n${snap}\n  ltr:\n${ltr}`);
      if (ACCEPT) continue;
      r.ok(accepted[key] !== undefined, `${key} (${form}${rtl}): no accepted snapshot in aria-snapshots.json. Run with --accept and review the diff`);
      if (accepted[key] !== undefined) r.ok(snap === accepted[key], `${key} (${form}${rtl}): differs from the accepted snapshot in aria-snapshots.json — got:\n${snap}\n  accepted:\n${accepted[key]}`);
    }
  }
  if (!ACCEPT && Object.keys(got).length === new Set(all.map((s) => `${s.component}--${s.case}`)).size) {
    for (const key of Object.keys(accepted)) r.ok(key in got, `${key}: in aria-snapshots.json but no story builds it`);
  }
  if (ACCEPT && !plant.init && !plant.after && !plant.css) {
    if (r.failures.length) { r.failures.push('--accept: refused, the checks above fail; nothing written'); return r; }
    const out = Object.fromEntries(Object.entries(got).sort(([a], [b]) => a.localeCompare(b)).map(([k, f]) => [k, f.element ?? f.html]));
    writeFileSync(BASELINE, `${JSON.stringify(out, null, 2)}\n`);
    r.notes.push(`--accept: wrote ${Object.keys(out).length} snapshots to aria-snapshots.json; review the diff`);
  }
  return r;
};

/** Plants that touch the HTML form only: the element form has upgraded, so its host is in the page. */
const htmlOnly = (js: string) => `if (!document.querySelector('#storybook-root p3-button, #storybook-root p3-text-field, #storybook-root p3-password-field')) { ${js} }`;
const MUTANTS = [
  {
    name: 'a closed shadow root inside the button element',
    plant: { after: 'document.querySelector("#storybook-root p3-button")?.attachShadow({ mode: "closed" })' },
    only: (s: Story) => s.component === 'button' && s.case === 'rest' && s.form === 'element',
    mustName: /components-button-element--rest: the component attached a shadow root on <p3-button>/,
  },
  {
    name: 'the HTML form drops aria-invalid at error',
    plant: { after: htmlOnly('document.querySelectorAll("#storybook-root [aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"))') },
    only: (s: Story) => s.component === 'text-field' && s.case === 'error',
    mustName: /^text-field--error: the two forms differ/,
  },
  {
    name: 'aria-describedby dropped from both forms (they still agree)',
    plant: { after: 'document.querySelectorAll("#storybook-root [aria-describedby]").forEach((i) => i.removeAttribute("aria-describedby"))' },
    only: (s: Story) => s.component === 'password-field' && s.case === 'rest',
    mustName: /^password-field--rest \((element|html)\): differs from the accepted snapshot/,
  },
  {
    name: 'the Show/Hide button\'s visually hidden " password" removed',
    plant: { after: 'document.querySelectorAll("#storybook-root .p3-password-field__toggle-suffix").forEach((e) => e.remove())' },
    only: (s: Story) => s.component === 'password-field' && s.case === 'rest',
    mustName: /components-password-field-(element|html)--rest: the accessibility tree lacks «- button "Show password"»/,
  },
  {
    name: 'an inactive button no longer aria-disabled',
    plant: { after: 'document.querySelectorAll("#storybook-root .p3-button[aria-disabled]").forEach((b) => b.removeAttribute("aria-disabled"))' },
    only: (s: Story) => s.component === 'button' && s.case === 'inactive',
    mustName: /components-button-(element|html)--inactive: the accessibility tree lacks «- button "Save changes" \[disabled\]»/,
  },
  {
    name: 'the Show/Hide button hidden right to left only (both forms)',
    plant: { css: '#storybook-root [dir="rtl"] .p3-password-field__toggle { display: none !important; }' },
    only: (s: Story) => s.component === 'password-field' && s.case === 'rest',
    mustName: /^password-field--rest \((element|html), rtl\): the right-to-left tree differs from the left-to-right tree/,
  },
  {
    name: 'the HTML form drops aria-invalid at error, right to left only',
    plant: { after: htmlOnly('if (document.querySelector("[data-story-frame]")?.dir === "rtl") document.querySelectorAll("#storybook-root [aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"))') },
    only: (s: Story) => s.component === 'text-field' && s.case === 'error',
    mustName: /^text-field--error \(rtl\): the two forms differ/,
  },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main('aria', 'Each case\'s element and HTML forms build the same accessibility tree (ARIA snapshot plus descriptions), equal to the accepted aria-snapshots.json, with every HAS row present, left to right and right to left (the same tree in both).', run as never, ACCEPT ? [] : [...MUTANTS, ...DROPPED('aria')]);
}
