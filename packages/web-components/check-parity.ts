/**
 * THE ELEMENT PARITY CHECK (#3408 S4): does `<p3-button>` offer exactly the button def's props, with its values and
 * defaults, and does each prop reach the markup `@prism3/css` styles?
 *
 *   npx tsx packages/web-components/check-parity.ts
 *
 * THE TWO SIDES, and why neither is derived from the other (`docs/34`):
 *   - EXPECTED is the emission: `components.ai.json` (every prop, its values and default, as the API promises agents)
 *     and `component-defs.json` (the def's own props, which the generator reads). The two must agree with each other
 *     first. On top of them, `CONTRACT` below is this check's OWN copy of the element contract: each prop's property
 *     name, its `data-prop-*` attribute, and what each value must put on the inner element. It is written by hand
 *     from `@prism3/css`'s README, never imported from `generate.ts`, so the generator and this file can disagree.
 *   - ACTUAL is read twice. (1) `custom-elements.json`, the analyzer's reading of the shipped source: each public
 *     field, its attribute, its type union and its default. (2) The element itself, loaded in Chromium: Lit's own
 *     `elementProperties`, a fresh element's property values, and the inner markup each prop value renders.
 *
 * A prop on the element that the def doesn't have fails as invented; a def prop the element lacks fails as missing.
 *
 * SELF-TEST. After the real run, six mutants of the element or its manifest must each FAIL BY NAME, or this check
 * fails: a dropped prop, a dropped value in the manifest's type, pending rendered without `aria-busy`, a changed
 * default, an invented prop, and a renamed attribute.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUncommitted } from '../css/emission';
import { bundle, ELEMENT_SOURCE } from './bundle';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../engine/out');
const ID = 'button';
const TAG = 'p3-button';
const API = JSON.parse(readFileSync(resolve(OUT, 'components/components.ai.json'), 'utf8')).components[ID];
const DEF = readUncommitted('component-defs.json').components[ID].def;
const MANIFEST = readFileSync(resolve(HERE, 'custom-elements.json'), 'utf8');

// ------------------------------------------------------------------------------------------------ this check's own contract
// `attr: null` is a property with no attribute (a function or a slot). `inner(v)` is the attributes the inner
// `.p3-button` must carry for value `v`; a `null` attribute value means it must be absent. `samples` stand in for a
// free-text prop's values.
type Attrs = Record<string, string | null>;
type Row = { field: string; attr: string | null; inner?: (v: string) => Attrs; samples?: string[]; tag?: string };
const CONTRACT: Record<string, Row> = {
  label: { field: 'label', attr: 'data-prop-label', samples: ['Save changes'] },
  onClick: { field: 'onClick', attr: null },
  appearance: { field: 'appearance', attr: 'data-prop-appearance', inner: (v) => ({ 'data-prop-appearance': v }) },
  size: { field: 'size', attr: 'data-prop-size', inner: (v) => ({ 'data-prop-size': v }) },
  surface: { field: 'surface', attr: 'data-prop-surface', inner: (v) => ({ 'data-prop-surface': v }) },
  inset: { field: 'inset', attr: 'data-prop-inset', inner: (v) => ({ 'data-prop-inset': v }) },
  fullWidth: { field: 'fullWidth', attr: 'data-prop-fullwidth', inner: (v) => ({ 'data-prop-fullwidth': v === 'true' ? 'true' : null }) },
  type: { field: 'type', attr: 'data-prop-type', inner: (v) => ({ type: v }) },
  isPending: { field: 'isPending', attr: 'data-prop-ispending', inner: (v) => (v === 'true' ? { 'aria-busy': 'true', 'aria-disabled': 'true' } : { 'aria-busy': null, 'aria-disabled': null }) },
  isInactive: { field: 'isInactive', attr: 'data-prop-isinactive', inner: (v) => (v === 'true' ? { 'aria-disabled': 'true', 'aria-busy': null } : { 'aria-disabled': null }) },
  disabled: { field: 'disabled', attr: 'data-prop-disabled', inner: (v) => ({ disabled: v === 'true' ? '' : null }) },
  leadingVisual: { field: 'leadingVisual', attr: null },
  trailingVisual: { field: 'trailingVisual', attr: null },
  href: { field: 'href', attr: 'data-prop-href', samples: ['/checkout'], inner: (v) => ({ href: v, type: null }), tag: 'A' },
  'aria-label': { field: 'ariaLabel', attr: 'data-prop-aria-label', samples: ['Save changes to invoice 1042'], inner: (v) => ({ 'aria-label': v }) },
};

type Prop = { name: string; type: string; values?: string[]; default?: unknown };
const isFlag = (p: Prop) => p.type === 'boolean';
const valuesOf = (p: Prop): string[] => p.values ?? (isFlag(p) ? ['true', 'false'] : CONTRACT[p.name]?.samples ?? []);

// ------------------------------------------------------------------------------------------------ static: the emission and the manifest
const staticFailures = (manifestText: string): string[] => {
  const f: string[] = [];
  const apiProps: Prop[] = API.props;
  const defProps: Prop[] = DEF.props;
  // The two emitted views of the API agree.
  for (const p of apiProps) {
    const d = defProps.find((x) => x.name === p.name);
    if (!d) { f.push(`prop ${p.name}: in components.ai.json, not in component-defs.json`); continue; }
    if (JSON.stringify(d.values ?? null) !== JSON.stringify(p.values ?? null)) f.push(`prop ${p.name}: values differ between components.ai.json and component-defs.json`);
    if (JSON.stringify(d.default) !== JSON.stringify(p.default)) f.push(`prop ${p.name}: default differs between components.ai.json and component-defs.json`);
  }
  for (const d of defProps) if (!apiProps.some((p) => p.name === d.name)) f.push(`prop ${d.name}: in component-defs.json, not in components.ai.json`);
  for (const p of apiProps) if (!CONTRACT[p.name]) f.push(`prop ${p.name}: no row in check-parity.ts's CONTRACT (add how it reaches markup)`);
  for (const n of Object.keys(CONTRACT)) if (!apiProps.some((p) => p.name === n)) f.push(`CONTRACT row ${n}: ${ID} has no such prop`);

  const decl = JSON.parse(manifestText).modules.flatMap((m: any) => m.declarations ?? []).find((d: any) => d.tagName === TAG);
  if (!decl) return [...f, `custom-elements.json: no declaration with tagName ${TAG}`];
  const fields = (decl.members ?? []).filter((m: any) => m.kind === 'field' && m.privacy !== 'private' && !m.static);
  const attrs = decl.attributes ?? [];
  const known = new Set(Object.values(CONTRACT).map((r) => r.field));
  for (const m of fields) if (!known.has(m.name)) f.push(`manifest field ${m.name}: not a prop of ${ID} (invented)`);
  for (const a of attrs) if (!Object.values(CONTRACT).some((r) => r.attr === a.name)) f.push(`manifest attribute ${a.name}: not a prop of ${ID} (invented)`);
  for (const p of apiProps) {
    const row = CONTRACT[p.name];
    if (!row) continue;
    const m = fields.find((x: any) => x.name === row.field);
    if (!m) { f.push(`prop ${p.name}: custom-elements.json has no public field ${row.field}`); continue; }
    if ((m.attribute ?? null) !== row.attr) f.push(`prop ${p.name}: custom-elements.json says attribute ${m.attribute ?? 'none'}, the contract says ${row.attr ?? 'none'}`);
    if (row.attr && !m.reflects) f.push(`prop ${p.name}: ${row.field} does not reflect to ${row.attr}`);
    if (p.values) {
      const union = new Set([...(m.type?.text ?? '').matchAll(/'([^']*)'/g)].map((x) => x[1]));
      for (const v of p.values) if (!union.has(v)) f.push(`prop ${p.name}: custom-elements.json's type lacks '${v}' (${m.type?.text})`);
      for (const v of union) if (!p.values.includes(v)) f.push(`prop ${p.name}: custom-elements.json's type has '${v}', not a value of the def`);
    }
    if (isFlag(p) && m.type?.text !== 'boolean') f.push(`prop ${p.name}: custom-elements.json types it ${m.type?.text}, not boolean`);
    const want = p.default === undefined ? undefined : JSON.stringify(p.default);
    const got = m.default === 'undefined' ? undefined : m.default;
    if (got !== want) f.push(`prop ${p.name}: custom-elements.json default ${got}, the def's ${want}`);
  }
  return f;
};

// ------------------------------------------------------------------------------------------------ live: the element in Chromium
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

/** Runs in the page, as a string so the TS runner's helpers never reach it. Returns the element's observed API. */
const PAGE_PROBE = `(async (cases) => {
  const C = customElements.get('${TAG}');
  if (!C) return { error: 'customElements has no ${TAG}' };
  const props = {};
  for (const [k, o] of C.elementProperties) props[k] = { attribute: o.attribute === false ? null : o.attribute };
  const fresh = document.createElement('${TAG}');
  const defaults = {};
  for (const k of Object.keys(props)) defaults[k] = fresh[k] === undefined ? '__undefined__' : fresh[k];
  const out = [];
  for (const c of cases) {
    const el = document.createElement('${TAG}');
    el.setAttribute('data-prop-label', 'Go');
    if (c.attr) el.setAttribute(c.attr, c.value);
    document.body.append(el);
    await el.updateComplete;
    const inner = el.querySelector(':scope > .p3-button');
    const attrs = {};
    if (inner) for (const a of c.keys) attrs[a] = inner.getAttribute(a);
    const viaProp = document.createElement('${TAG}');
    viaProp.setAttribute('data-prop-label', 'Go');
    if (c.field && c.attr) viaProp[c.field] = c.flag ? c.value === 'true' : c.value;
    document.body.append(viaProp);
    await viaProp.updateComplete;
    out.push({
      prop: c.prop, value: c.value, tag: inner ? inner.tagName : null, attrs,
      property: c.field ? (el[c.field] === undefined ? '__undefined__' : el[c.field]) : null,
      reflected: c.attr ? viaProp.getAttribute(c.attr) : null,
      spinner: !!el.querySelector('.p3-button__spinner'),
      label: el.querySelector('.p3-button__label')?.textContent ?? null,
    });
    el.remove(); viaProp.remove();
  }
  return { props, defaults, out };
})`;

const liveFailures = async (browser: any, source: string): Promise<string[]> => {
  const f: string[] = [];
  const page = await browser.newPage();
  try {
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: await bundle(source) });
    const cases: any[] = [];
    for (const p of API.props as Prop[]) {
      const row = CONTRACT[p.name];
      if (!row?.attr) continue;
      for (const value of valuesOf(p)) {
        const inner = row.inner?.(value) ?? {};
        cases.push({ prop: p.name, field: row.field, attr: row.attr, value, flag: isFlag(p), keys: Object.keys(inner) });
      }
    }
    const r = await page.evaluate(`${PAGE_PROBE}(${JSON.stringify(cases)})`);
    if (errors.length) f.push(`page error: ${errors.join(' / ')}`);
    if (r.error) return [...f, r.error];

    const fields = new Map(Object.entries(CONTRACT).map(([n, row]) => [row.field, n]));
    for (const k of Object.keys(r.props)) if (!fields.has(k)) f.push(`element property ${k}: not a prop of ${ID} (invented)`);
    for (const p of API.props as Prop[]) {
      const row = CONTRACT[p.name];
      if (!row) continue;
      const lp = r.props[row.field];
      if (!lp) { f.push(`prop ${p.name}: <${TAG}> has no reactive property ${row.field}`); continue; }
      if (lp.attribute !== row.attr) f.push(`prop ${p.name}: ${row.field}'s attribute is ${lp.attribute ?? 'none'}, the contract says ${row.attr ?? 'none'}`);
      const want = p.default === undefined ? '__undefined__' : p.default;
      if (r.defaults[row.field] !== want) f.push(`prop ${p.name}: a new <${TAG}>'s ${row.field} is ${JSON.stringify(r.defaults[row.field])}, the def's default is ${JSON.stringify(want)}`);
    }
    for (const o of r.out) {
      const p = (API.props as Prop[]).find((x) => x.name === o.prop)!;
      const row = CONTRACT[o.prop];
      const tag = row.tag ?? 'BUTTON';
      const at = `${o.prop}=${o.value}`;
      if (o.tag !== tag) { f.push(`${at}: the inner element is ${o.tag ?? 'missing'}, the contract says ${tag}`); continue; }
      for (const [a, want] of Object.entries(row.inner?.(o.value) ?? {})) {
        if (o.attrs[a] !== want) f.push(`${at}: inner ${a} is ${JSON.stringify(o.attrs[a])}, the contract says ${JSON.stringify(want)}`);
      }
      const typed = isFlag(p) ? o.value === 'true' : o.value;
      if (o.property !== typed) f.push(`${at}: the attribute sets ${row.field} to ${JSON.stringify(o.property)}, not ${JSON.stringify(typed)}`);
      const reflected = isFlag(p) ? (o.value === 'true' ? 'true' : null) : o.value;
      if (o.reflected !== reflected) f.push(`${at}: setting ${row.field} reflects ${row.attr}=${JSON.stringify(o.reflected)}, the contract says ${JSON.stringify(reflected)}`);
      if (o.prop === 'isPending' && o.spinner !== (o.value === 'true')) f.push(`${at}: the spinner span is ${o.spinner ? 'present' : 'absent'}`);
      if (o.prop === 'label' && o.label !== o.value) f.push(`${at}: the label span reads ${JSON.stringify(o.label)}`);
    }
  } finally { await page.close(); }
  return f;
};

// ------------------------------------------------------------------------------------------------ mutants
const swap = (text: string, from: string | RegExp, to: string, what: string): string => {
  const next = text.replace(from, to);
  if (next === text) throw new Error(`self-test "${what}" changed nothing: its anchor is gone, so rewrite it`);
  return next;
};
const MUTANTS: { name: string; source?: string; manifest?: string; mustName: RegExp }[] = [
  { name: 'a dropped prop (inset)', source: swap(ELEMENT_SOURCE, /\n\s*inset: \{[^\n]*\},/, '', 'dropped prop'), mustName: /prop inset: <p3-button> has no reactive property inset/ },
  { name: 'a dropped value in the manifest (appearance text)', manifest: swap(MANIFEST, /'filled' \| 'outline' \| 'text'/g, "'filled' | 'outline'", 'dropped value'), mustName: /prop appearance: custom-elements\.json's type lacks 'text'/ },
  { name: 'pending rendered without aria-busy', source: swap(ELEMENT_SOURCE, /aria-busy=\$\{busy\}/g, 'aria-busy=${nothing}', 'no aria-busy'), mustName: /isPending=true: inner aria-busy is null/ },
  { name: 'a changed default (size small)', source: swap(ELEMENT_SOURCE, 'this.size = "medium";', 'this.size = "small";', 'default'), mustName: /prop size: a new <p3-button>'s size is "small"/ },
  { name: 'an invented prop (tone)', source: swap(ELEMENT_SOURCE, '  static properties = {\n', '  static properties = {\n    tone: { type: String, attribute: "data-prop-tone", reflect: true },\n', 'invented'), mustName: /element property tone: not a prop of button \(invented\)/ },
  { name: 'a renamed attribute (fullWidth)', source: swap(ELEMENT_SOURCE, 'attribute: "data-prop-fullwidth"', 'attribute: "data-prop-full-width"', 'renamed'), mustName: /prop fullWidth: fullWidth's attribute is data-prop-full-width/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch();
  let fail = 0;
  try {
    const real = [...staticFailures(MANIFEST), ...(await liveFailures(browser, ELEMENT_SOURCE))];
    if (real.length) {
      fail++;
      console.error(`FAIL element parity: ${real.length} difference(s) between <${TAG}> and the ${ID} def`);
      for (const x of real) console.error(`  - ${x}`);
    } else {
      const n = (API.props as Prop[]).reduce((s, p) => s + (CONTRACT[p.name]?.attr ? valuesOf(p).length : 0), 0);
      console.log(`OK element parity: <${TAG}> has the ${API.props.length} props of the ${ID} def, no more; custom-elements.json agrees on every attribute, type and default; ${n} prop values render the contract's markup`);
    }
    for (const m of MUTANTS) {
      const r = [...staticFailures(m.manifest ?? MANIFEST), ...(await liveFailures(browser, m.source ?? ELEMENT_SOURCE))];
      if (r.some((x) => m.mustName.test(x))) console.log(`OK self-test: "${m.name}" fails by name`);
      else { fail++; console.error(`FAIL self-test: "${m.name}" was not reported by name (${r.join('; ') || 'nothing'})`); }
    }
  } finally { await browser.close(); }
  process.exit(fail ? 1 : 0);
}
