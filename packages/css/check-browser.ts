/**
 * THE BROWSER CHECK (#3408 S2): `demo.html`, rendered in Chromium with the real token CSS, on the light and dark
 * themes. Fails by name.
 *
 *   npm run -w @prism3/tokens build     (first: the demo links the built token CSS)
 *   npx tsx packages/css/check-browser.ts
 *
 * 1. COMPUTED AGAINST RESOLVED. For a sample of states, each computed color and size equals the token's value as the
 *    engine's DTCG resolves it — resolved by the agent-adherence scorer's oracle (`buildOracle`), not by Style
 *    Dictionary, so the token CSS build is checked too, not trusted. The token NAMES below are written here, by hand,
 *    from the def and `specs.json`; `check-parity.ts` covers every row, this covers the real values.
 * 2. FOCUS. Tab reaches a button and `:focus-visible` paints the ring (width, offset, color); a mouse click focuses a
 *    button and paints no ring.
 * 3. ACCESSIBILITY TREE. Pending keeps the button's name (the spinner is hidden from it); a disabled button is
 *    disabled; inactive and pending stay focusable. `@axe-core/playwright` is not a dependency of this repo, so the
 *    axe pass is held for the owner's decision (journal, S2).
 *
 * SELF-TEST: two mutants, each must fail by name — a rest fill rebound to the hover token, and a ring drawn on any
 * `:focus` (so a mouse click shows it).
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

const oracle = buildOracle({
  commit: 'working tree', tree: json(TOKEN_TREE), base: json(TOKEN_BASE),
  overlays: Object.fromEntries(Object.entries(TOKEN_OVERLAYS).map(([m, f]) => [m, json(f)])), components: json(COMPONENTS),
});
const resolved = (mode: string, token: string): string => {
  const val = oracle.modes[mode]?.[`${oracle.root}-${token.replace(/\./g, '-')}`];
  if (val === undefined) throw new Error(`the oracle has no ${token} in ${mode}`);
  return val;
};

type Sample = { demo: string; force?: string; part?: string; prop: string; token: string; kind: 'color' | 'length' };
const S = (demo: string, prop: string, token: string, kind: Sample['kind'], more: Partial<Sample> = {}): Sample => ({ demo, prop, token, kind, ...more });
/** `<surface>/<appearance>/<inset>/<size>/<state>` under a theme. */
const samples = (theme: string): Sample[] => {
  const d = (rest: string) => `${theme}/${rest}`;
  return [
    S(d('default/filled/default/medium/rest'), 'background-color', 'color.interactive.primary.fill.rest', 'color'),
    S(d('default/filled/default/medium/rest'), 'color', 'color.interactive.primary.on-fill', 'color', { part: '.p3-button__label' }),
    S(d('default/filled/default/medium/rest'), 'min-height', 'size.md.height', 'length'),
    S(d('default/filled/default/medium/rest'), 'padding-left', 'space.200', 'length'),
    S(d('default/filled/default/medium/rest'), 'border-top-left-radius', 'radius.md', 'length'),
    S(d('default/filled/default/medium/rest'), 'border-top-width', 'border-width.hairline', 'length'),
    S(d('default/filled/default/medium/rest'), 'background-color', 'color.interactive.primary.fill.hover', 'color', { force: 'hover' }),
    S(d('default/filled/default/medium/rest'), 'background-color', 'color.interactive.primary.fill.pressed', 'color', { force: 'active' }),
    S(d('default/filled/default/medium/disabled'), 'background-color', 'color.disabled.fill', 'color'),
    S(d('default/filled/default/medium/disabled'), 'color', 'color.disabled.on-fill', 'color', { part: '.p3-button__label' }),
    S(d('default/filled/default/medium/inactive'), 'background-color', 'color.disabled.fill', 'color'),
    S(d('default/filled/default/medium/inactive'), 'background-color', 'color.disabled.fill', 'color', { force: 'hover' }),
    S(d('default/filled/default/small/rest'), 'min-height', 'size.sm.height', 'length'),
    S(d('default/filled/default/large/rest'), 'min-height', 'size.lg.height', 'length'),
    S(d('default/filled/default/medium/icons'), 'padding-left', 'space.150', 'length'),
    S(d('default/filled/default/medium/icons'), 'width', 'icon.size.sm', 'length', { part: '.p3-button__leading-visual' }),
    S(d('default/outline/default/medium/rest'), 'border-top-color', 'color.interactive.primary.border.rest', 'color'),
    S(d('default/outline/default/medium/rest'), 'background-color', 'color.interactive.primary.overlay.hover', 'color', { force: 'hover' }),
    S(d('default/outline/default/medium/disabled'), 'border-top-color', 'color.disabled.border', 'color'),
    S(d('default/text/default/medium/rest'), 'color', 'color.interactive.primary.text.hover', 'color', { part: '.p3-button__label', force: 'hover' }),
    S(d('default/text/flush/medium/rest'), 'padding-left', 'space.0', 'length'),
    S(d('default/text/default/medium/pending'), 'color', 'color.interactive.primary.icon.rest', 'color', { part: '.p3-button__spinner' }),
    S(d('inverse/filled/default/medium/rest'), 'background-color', 'color.inverse.interactive.primary.fill.rest', 'color'),
    S(d('inverse/outline/default/medium/rest'), 'border-top-color', 'color.inverse.interactive.primary.border.rest', 'color'),
    S(d('default/filled/default/medium/rest'), 'outline-color', 'color.border.focus', 'color', { force: 'focus-visible' }),
    S(d('default/filled/default/medium/rest'), 'outline-width', 'focus.ring.width', 'length', { force: 'focus-visible' }),
    S(d('default/filled/default/medium/rest'), 'outline-offset', 'focus.ring.offset', 'length', { force: 'focus-visible' }),
    S(d('inverse/filled/default/medium/rest'), 'outline-color', 'color.inverse.border.focus', 'color', { force: 'focus-visible' }),
  ];
};
const THEMES: Record<string, string> = { light: 'light', dark: 'dark' }; // demo theme → oracle mode

export const run = async (browser: any, extraCss = ''): Promise<{ failures: string[]; passed: number }> => {
  const failures: string[] = [];
  let passed = 0;
  const ok = (cond: boolean, what: string) => { if (cond) passed++; else failures.push(what); };
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(DEMO);
  if (extraCss) await page.addStyleTag({ content: extraCss });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const docId = (await cdp.send('DOM.getDocument', { depth: -1 })).root.nodeId;
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
      const sel = `[data-demo="${s.demo}"]`;
      if (s.force) {
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: docId, selector: sel });
        if (!nodeId) { failures.push(`${s.demo}: no such demo button`); continue; }
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [s.force] });
      }
      const got = await page.evaluate(([q, part, prop]: string[]) => {
        const el = document.querySelector(q);
        const node = el && (part ? el.querySelector(part) : el);
        return node ? getComputedStyle(node).getPropertyValue(prop) : null;
      }, [sel, s.part ?? '', s.prop]);
      const want = await normalize(s.kind, resolved(mode, s.token));
      ok(got === want, `${s.demo}${s.force ? ` :${s.force}` : ''}${s.part ? ` ${s.part}` : ''} ${s.prop} is ${got}, ${s.token} resolves to ${want} in ${mode}`);
      if (s.force) {
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: docId, selector: sel });
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      }
    }
    // pending: the spinner takes the leading cell; the label keeps its name
    const pend = await page.evaluate((q: string) => {
      // no named helper in here: tsx's keepNames wraps it in `__name`, which the page does not define
      const el = document.querySelector(q)!;
      const [spinner, leading, trailing] = ['.p3-button__spinner', '.p3-button__leading-visual', '.p3-button__trailing-visual'].map((s) => getComputedStyle(el.querySelector(s)!).display);
      return { spinner, leading, trailing };
    }, `[data-demo="${theme}/default/filled/default/medium/icons-pending"]`);
    ok(pend.spinner !== 'none' && pend.leading === 'none' && pend.trailing !== 'none', `${theme} pending with icons: the spinner should replace the leading visual only (spinner ${pend.spinner}, leading ${pend.leading}, trailing ${pend.trailing})`);
    // the flush hit target: at least 44×44 at medium (codeOnly hit-target)
    const hit = await page.evaluate((q: string) => { const cs = getComputedStyle(document.querySelector(q)!, '::before'); return [parseFloat(cs.width), parseFloat(cs.height)]; }, `[data-demo="${theme}/default/text/flush/medium/rest"]`);
    const floor = parseFloat(await normalize('length', resolved(mode, 'size.md.min-height')));
    ok(hit[0] >= floor && hit[1] >= floor, `${theme} flush medium hit target is ${hit[0]}×${hit[1]}, under ${floor}×${floor}`);
  }

  // 2. focus-visible on keyboard, not on mouse
  await page.mouse.click(5, 5);
  await page.keyboard.press('Tab');
  const kb = await page.evaluate(() => { const a = document.activeElement as HTMLElement; const cs = getComputedStyle(a); return { cls: a.className, fv: a.matches(':focus-visible'), style: cs.outlineStyle, color: cs.outlineColor }; });
  ok(kb.cls === 'p3-button' && kb.fv && kb.style !== 'none', `keyboard focus: Tab should reach a button and show the ring (${JSON.stringify(kb)})`);
  ok(kb.color === await normalize('color', resolved('light', 'color.border.focus')), `keyboard focus: the ring should be color.border.focus (${kb.color})`);
  const target = '[data-demo="light/default/outline/default/medium/rest"]';
  await page.click(target);
  const mouse = await page.evaluate((q: string) => { const a = document.activeElement as HTMLElement; return { focused: a === document.querySelector(q), fv: a.matches(':focus-visible'), style: getComputedStyle(a).outlineStyle }; }, target);
  ok(mouse.focused && !mouse.fv && mouse.style === 'none', `mouse focus: a click should focus the button and show no ring (${JSON.stringify(mouse)})`);

  // 3. the accessibility tree
  const role = (q: string) => page.locator(q).ariaSnapshot();
  ok(/button "Saving"/.test(await role('[data-demo="light/default/filled/default/medium/pending"]')), 'pending: the button keeps its accessible name, the spinner is hidden from it');
  ok(/\[disabled\]/.test(await role('[data-demo="light/default/filled/default/medium/disabled"]')), 'disabled: the button is disabled in the accessibility tree');
  for (const st of ['inactive', 'pending']) {
    const q = `[data-demo="light/default/filled/default/medium/${st}"]`;
    await page.focus(q);
    ok(await page.evaluate((s: string) => document.activeElement === document.querySelector(s), q), `${st}: the button stays focusable (aria-disabled, not native disabled)`);
  }
  await page.close();
  return { failures, passed };
};

const MUTANTS: { name: string; css: string; mustName: RegExp }[] = [
  { name: 'a rest fill rebound to the hover token',
    css: '.p3-button[data-prop-appearance="filled"][data-prop-surface="default"]:not(:hover) { background-color: var(--pds3-color-interactive-primary-fill-hover) !important; }',
    mustName: /default\/filled\/default\/medium\/rest background-color is .*color\.interactive\.primary\.fill\.rest/ },
  { name: 'a ring on any :focus, so a mouse click shows it',
    css: '.p3-button:focus { outline: var(--pds3-focus-ring-width) solid var(--pds3-color-border-focus) !important; }',
    mustName: /mouse focus: a click should focus the button and show no ring/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(TOKENS_CSS)) { console.error('FAIL browser: no token CSS. Run first: npm run -w @prism3/tokens build'); process.exit(1); }
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  let bad = 0;
  try {
    const real = await run(browser);
    if (real.failures.length) { bad++; console.error(`FAIL browser: ${real.failures.length} check(s) failed, ${real.passed} passed`); for (const f of real.failures) console.error(`  - ${f}`); }
    else console.log(`OK browser: ${real.passed} checks on demo.html (light and dark): computed values equal the resolved tokens, focus-visible on keyboard only, the accessibility tree holds`);
    for (const m of MUTANTS) {
      const r = await run(browser, m.css);
      if (r.failures.some((f) => m.mustName.test(f))) console.log(`OK self-test: mutant "${m.name}" fails by name`);
      else { bad++; console.error(`FAIL self-test: mutant "${m.name}" was not caught by name (${r.failures[0] ?? 'no failures'})`); }
    }
  } finally {
    await browser.close();
  }
  process.exit(bad ? 1 : 0);
}
