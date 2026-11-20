/**
 * TOKEN PARITY, THE ELEMENT FORM (#3408 S6, KPI 2 with Q32 A): do `<p3-button>`, `<p3-text-field>` and
 * `<p3-password-field>`, rendered, bind the tokens the design spec names?
 *
 *   npx tsx packages/web-components/check-token-parity.ts
 *
 * `@prism3/css`'s parity checks (`check-parity.ts`, `check-parity-fields.ts`) hold the HTML form: markup written from
 * their own copy of the contract, every token a unique sentinel, each computed value decoded back to one token name.
 * This file runs THE SAME PROBES, with the same EXPECTED (`specs.json`, `components.ai.json`) and the same decoding, in
 * the element form: each probe is written as an element from its props, the element's script renders it, and the
 * element's rendered root becomes the probe. So the element is held to the spec directly, not through "it renders
 * what the HTML form renders" (`check-browser*.ts` holds that, with real token values, which can't tell two tokens of
 * equal value apart).
 *
 * WHAT THE ELEMENT FORM CANNOT WRITE, named on every run, never silently passed:
 *   - `field-label` and `field-message` on their own: they have no element; they are nested in the fields only.
 *   - a nested label at an emphasis or weight other than the def's defaults: the field renders its label at those.
 *
 * REPRESENTED: each of the three elements must have checked bindings; one with none fails by name.
 *
 * SELF-TEST: four mutants of the element sources, each must FAIL BY NAME.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle, sourceOf } from './bundle';
import { runParity as runButton, MARKUP, type Form as ButtonForm } from '../css/check-parity';
import { runParity as runFields, isFilled, CONTRACTS as FIELD_CONTRACTS, type Form as FieldForm } from '../css/check-parity-fields';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS_DIR = resolve(HERE, '../css');
const OUT = resolve(HERE, '../engine/out');
const ai = JSON.parse(readFileSync(resolve(OUT, 'components/components.ai.json'), 'utf8')).components;
const CSS_FILES = ['button.css', 'field-label.css', 'field-message.css', 'text-field.css', 'password-field.css'];
const CSS: Record<string, string> = Object.fromEntries(CSS_FILES.map((f) => [f, readFileSync(resolve(CSS_DIR, f), 'utf8')]));

type Sources = { button: string; 'text-field': string; 'password-field': string };
const SOURCES: Sources = { button: sourceOf('p3-button.js'), 'text-field': sourceOf('p3-text-field.js'), 'password-field': sourceOf('p3-password-field.js') };

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const attrs = (props: Record<string, string>) => Object.entries(props).map(([k, v]) => ` data-prop-${k.toLowerCase()}="${esc(v)}"`).join('');
const SVG = '<svg viewBox="0 0 24 24"></svg>';

const sizesSpinner = (pr: { state: string; checks: { part: string }[] }) => pr.state === 'rest' && pr.checks.some((c) => c.part === 'container/spinner');
const SPINNER_NOTE = 'button: a redline row that sizes the spinner is measured while pending, the one state the element renders the spinner in';
const buttonForm = (script: string): ButtonForm => ({
  name: 'element',
  scripts: [script],
  // The element renders its spinner only while pending, as its def's anatomy says (the HTML form writes it always and
  // hides it). A redline row has no state key, so it holds in every state: a row that sizes the spinner is measured
  // here while pending. Named on every run (`SPINNER_NOTE`).
  write: (pr, i, _attrs, props) => `<p3-button data-probe-host="${i}" data-probe-root=".p3-button"${attrs({ label: 'Save', type: 'button', ...props, ...(sizesSpinner(pr) ? { isPending: 'true' } : {}) })}>`
    + (pr.leading ? `<span slot="leadingVisual">${SVG}</span>` : '') + (pr.trailing ? `<span slot="trailingVisual">${SVG}</span>` : '') + '</p3-button>',
});

/** The nested label's own props the field renders: the field-label def's defaults (the emission's, not this file's). */
const LABEL_DEFAULT: Record<string, string> = Object.fromEntries(ai['field-label'].props.filter((p: any) => p.default !== undefined).map((p: any) => [`data-prop-${p.name.toLowerCase()}`, String(p.default)]));
const fieldForm = (scripts: string[]): FieldForm => ({
  name: 'element',
  scripts,
  skip: (pr) => {
    if (pr.kind === 'field-label' || pr.kind === 'field-message') return `${pr.kind} has no element; it is nested in the fields only`;
    const own = Object.entries(pr.ownLabel ?? {}).filter(([k, v]) => LABEL_DEFAULT[k] !== v);
    if (own.length) return `the field renders its nested label at the def's defaults, not ${own.map(([k, v]) => `${k}=${v}`).join(' ')}`;
    return undefined;
  },
  write: (pr, i, props) => {
    const status = props.validation ?? 'default';
    const all: Record<string, string> = {
      label: 'Label', id: `probe-${i}`, placeholder: 'Placeholder',
      ...(status === 'default' ? { helpText: 'Message' } : { validationMessage: 'Message' }),
      ...(isFilled(pr.state) ? { defaultValue: 'Entered' } : {}),
      ...props,
    };
    const icons = pr.icons !== false ? `<span slot="leadingIcon">${SVG}</span>${pr.kind === 'text-field' ? `<span slot="trailingIcon">${SVG}</span>` : ''}` : '';
    return `<p3-${pr.kind} data-probe-host="${i}" data-probe-root=".p3-${pr.kind}"${attrs(all)}>${icons}</p3-${pr.kind}>`;
  },
});

export const run = async (browser: any, src: Sources) => {
  const scripts = { button: await bundle(src.button, 'p3-button.js'), 'text-field': await bundle(src['text-field'], 'p3-text-field.js'), 'password-field': await bundle(src['password-field'], 'p3-password-field.js') };
  const b = await runButton(browser, CSS['button.css'], MARKUP, buttonForm(scripts.button));
  // the password field nests a button (Show/Hide), so its page loads the button's element too
  const f = await runFields(browser, CSS, FIELD_CONTRACTS, fieldForm([scripts.button, scripts['text-field'], scripts['password-field']]));
  const failures = [...b.failures.map((x) => `button: ${x}`), ...f.failures];
  const perKind = { button: b.checked, ...f.perKind };
  for (const [kind, n] of Object.entries(perKind)) if (!n) failures.push(`${kind}: no binding checked in the element form (not represented)`);
  for (const kind of ['text-field', 'password-field']) if (!(kind in perKind)) failures.push(`${kind}: no binding checked in the element form (not represented)`);
  return { failures, checked: b.checked + f.checked, perKind, skipped: [SPINNER_NOTE, ...[...f.skipped].filter((s) => s.startsWith('element form:'))] };
};

const swap = (text: string, from: string | RegExp, to: string, what: string): string => {
  const next = text.replace(from, to);
  if (next === text) throw new Error(`self-test "${what}" changed nothing: its anchor is gone, so rewrite it`);
  return next;
};
const MUTANTS: { name: string; src: () => Sources; mustName: RegExp }[] = [
  { name: '<p3-button> stops writing its size onto the rendered button',
    src: () => ({ ...SOURCES, button: swap(SOURCES.button, /data-prop-size=\$\{this\.size\}/g, '', 'button size') }), mustName: /^button: .*size=large .* binds/ },
  { name: '<p3-text-field> stops writing its validation onto its root',
    src: () => ({ ...SOURCES, 'text-field': swap(SOURCES['text-field'], 'data-prop-validation=${this.validation}', '', 'text-field validation') }), mustName: /^text-field status=error .*binds/ },
  { name: '<p3-password-field> stops writing its size onto its root',
    src: () => ({ ...SOURCES, 'password-field': swap(SOURCES['password-field'], 'data-prop-size=${this.size}', '', 'password-field size') }), mustName: /^password-field size=large .*binds/ },
  { name: '<p3-text-field> renders nothing (not represented)',
    src: () => ({ ...SOURCES, 'text-field': swap(SOURCES['text-field'], /^if \(!customElements\.get\('p3-text-field'\)\).*$/m, '', 'text-field define') }), mustName: /^text-field status=error .*\(no probe root\)/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  let bad = 0;
  try {
    const real = await run(browser, SOURCES);
    if (real.failures.length) {
      bad++;
      console.error(`FAIL token parity (element form): ${real.failures.length} of ${real.checked} bindings disagree with specs.json / components.ai.json`);
      for (const f of real.failures.slice(0, 40)) console.error(`  - ${f}`);
    } else console.log(`OK token parity (element form): ${real.checked} bindings match specs.json (${Object.entries(real.perKind).map(([k, n]) => `${k} ${n}`).join(', ')}), decoded from sentinel tokens on the elements' rendered output`);
    for (const s of real.skipped) console.log(`  not checked here: ${s}`);
    for (const m of MUTANTS) {
      let src: Sources;
      try { src = m.src(); } catch (e) { bad++; console.error(`FAIL self-test: "${m.name}": ${(e as Error).message}`); continue; }
      const r = await run(browser, src);
      if (r.failures.some((f) => m.mustName.test(f))) console.log(`OK self-test: mutant "${m.name}" fails by name (${r.failures.length} failures)`);
      else { bad++; console.error(`FAIL self-test: mutant "${m.name}" was not caught by name${r.failures[0] ? `; first failure: ${r.failures[0]}` : ' (no failures)'}`); }
    }
  } finally {
    await browser.close();
  }
  process.exit(bad ? 1 : 0);
}
