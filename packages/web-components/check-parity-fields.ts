/**
 * THE FIELD ELEMENT PARITY CHECK (#3408 S4 for the fields): do `<p3-text-field>` and `<p3-password-field>` offer exactly
 * their defs' props, with the defs' values and defaults, and does each prop reach the markup `@prism3/css` styles?
 *
 *   npx tsx packages/web-components/check-parity-fields.ts
 *
 * THE TWO SIDES, as `check-parity.ts` (the button's) has them (`docs/34`):
 *   - EXPECTED is the emission, `components.ai.json` and `component-defs.json`, which must agree with each other, plus
 *     `CONTRACT` below: this check's OWN copy of where each prop lands, written by hand from `@prism3/css`'s README
 *     ("The fields' markup contract"), never imported from the generator.
 *   - ACTUAL is `custom-elements.json` (public fields, attributes, reflection, type unions, defaults) and the elements
 *     live in Chromium (Lit's `elementProperties`, a fresh element's values, and the markup each prop value renders,
 *     set by attribute and by property).
 *
 * Beyond the per-prop rows, the associations the contract exists for are checked on every element: the label's `for`
 * is the input's id (an id is generated when none is set), `aria-describedby` names the message in the same tree, and
 * the Show/Hide button's `aria-controls` names the input.
 *
 * SELF-TEST. After the real run, eight mutants must each FAIL BY NAME, or this check fails.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUncommitted } from '../css/emission';
import { bundle, sourceOf } from './bundle';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../engine/out');
const AI = JSON.parse(readFileSync(resolve(OUT, 'components/components.ai.json'), 'utf8')).components;
const DEFS = readUncommitted('component-defs.json').components;
const MANIFEST = readFileSync(resolve(HERE, 'custom-elements.json'), 'utf8');
type Id = 'text-field' | 'password-field';
const IDS: Id[] = ['text-field', 'password-field'];
const SOURCE: Record<Id, string> = { 'text-field': sourceOf('p3-text-field.js'), 'password-field': sourceOf('p3-password-field.js') };

// ------------------------------------------------------------------------------------------------ this check's own contract
// `attr: null` is a property with no attribute. `inner(v)` maps a selector (inside the host) to the attributes it must
// carry for value `v` (`null`: absent; `@message`: the message's id). `text` is a selector whose text must be `v`.
// `with` is what else the probe sets for the value to show (the message's text needs the message on).
type Attrs = Record<string, string | null>;
type Row = { attr: string | null; inner?: (v: string) => Record<string, Attrs>; text?: string; samples?: string[]; with?: Record<string, string> };
const IN = (id: Id) => `.p3-${id}__entry`;
const ROOT = (id: Id) => `.p3-${id}`;
const LABEL = '.p3-field-label';
const MSG = '.p3-field-message';
const TOGGLE = '.p3-password-field__toggle';
const flagAttr = (v: string) => (v === 'true' ? '' : null);
const contract = (id: Id): Record<string, Row> => ({
  label: { attr: 'data-prop-label', samples: ['Email address'], text: `${LABEL}__label` },
  value: { attr: null },
  defaultValue: { attr: 'data-prop-defaultvalue', samples: ['ada@example.com'], inner: (v) => ({ [IN(id)]: { value: v } }) },
  onChange: { attr: null },
  ...(id === 'text-field' ? { type: { attr: 'data-prop-type', inner: (v: string) => ({ [IN(id)]: { type: v } }) } } : {}),
  placeholder: { attr: 'data-prop-placeholder', samples: ['name@example.com'], inner: (v) => ({ [IN(id)]: { placeholder: v } }) },
  helpText: { attr: 'data-prop-helptext', samples: ['We send the receipt here.'], text: `${MSG}__label`, with: { 'data-prop-showmessage': 'true' } },
  validation: { attr: 'data-prop-validation', inner: (v) => ({ [ROOT(id)]: { 'data-prop-validation': v }, [IN(id)]: { 'aria-invalid': v === 'error' ? 'true' : null } }) },
  validationMessage: { attr: 'data-prop-validationmessage', samples: ['Enter an email address.'], text: `${MSG}__label`, with: { 'data-prop-showmessage': 'true', 'data-prop-validation': 'error' } },
  showMessage: { attr: 'data-prop-showmessage', inner: (v) => ({ [IN(id)]: { 'aria-describedby': v === 'true' ? '@message' : null } }) },
  required: { attr: 'data-prop-required', inner: (v) => ({ [IN(id)]: { required: flagAttr(v) } }) },
  disabled: { attr: 'data-prop-disabled', inner: (v) => ({ [IN(id)]: { disabled: flagAttr(v) }, ...(id === 'password-field' ? { [TOGGLE]: { disabled: flagAttr(v) } } : {}) }) },
  readOnly: { attr: 'data-prop-readonly', inner: (v) => ({ [IN(id)]: { readonly: flagAttr(v) }, ...(id === 'password-field' ? { [TOGGLE]: { disabled: null } } : {}) }) },
  autoComplete: { attr: 'data-prop-autocomplete', samples: ['email'], inner: (v) => ({ [IN(id)]: { autocomplete: v } }) },
  ...(id === 'text-field' ? {
    inputMode: { attr: 'data-prop-inputmode', inner: (v: string) => ({ [IN(id)]: { inputmode: v } }) },
    prefix: { attr: 'data-prop-prefix', samples: ['$'] },
    suffix: { attr: 'data-prop-suffix', samples: ['kg'] },
    clearable: { attr: 'data-prop-clearable' },
    trailingIcon: { attr: null },
  } : {}),
  leadingIcon: { attr: null },
  isPending: { attr: 'data-prop-ispending', inner: (v) => ({ [IN(id)]: { 'aria-busy': v === 'true' ? 'true' : null } }) },
  size: { attr: 'data-prop-size', inner: (v) => ({ [ROOT(id)]: { 'data-prop-size': v } }) },
  id: { attr: 'data-prop-id', samples: ['account-email'], inner: (v) => ({ [IN(id)]: { id: v }, [LABEL]: { for: v }, ...(id === 'password-field' ? { [TOGGLE]: { 'aria-controls': v } } : {}) }) },
  name: { attr: 'data-prop-name', samples: ['email'], inner: (v) => ({ [IN(id)]: { name: v } }) },
});

type Prop = { name: string; type: string; values?: string[]; default?: unknown };
const isFlag = (p: Prop) => p.type === 'boolean';
const valuesOf = (p: Prop, row: Row): string[] => p.values ?? (isFlag(p) ? ['true', 'false'] : row.samples ?? []);

// ------------------------------------------------------------------------------------------------ static: the emission and the manifest
const staticFailures = (id: Id, manifestText: string): string[] => {
  const f: string[] = [];
  const C = contract(id);
  const tag = `p3-${id}`;
  const apiProps: Prop[] = AI[id].props;
  const defProps: Prop[] = DEFS[id].def.props;
  for (const p of apiProps) {
    const d = defProps.find((x) => x.name === p.name);
    if (!d) { f.push(`${id} prop ${p.name}: in components.ai.json, not in component-defs.json`); continue; }
    if (JSON.stringify(d.values ?? null) !== JSON.stringify(p.values ?? null)) f.push(`${id} prop ${p.name}: values differ between components.ai.json and component-defs.json`);
    if (JSON.stringify(d.default) !== JSON.stringify(p.default)) f.push(`${id} prop ${p.name}: default differs between components.ai.json and component-defs.json`);
  }
  for (const d of defProps) if (!apiProps.some((p) => p.name === d.name)) f.push(`${id} prop ${d.name}: in component-defs.json, not in components.ai.json`);
  for (const p of apiProps) if (!C[p.name]) f.push(`${id} prop ${p.name}: no row in check-parity-fields.ts's contract (add how it reaches markup)`);
  for (const n of Object.keys(C)) if (!apiProps.some((p) => p.name === n)) f.push(`${id} contract row ${n}: the def has no such prop`);

  const decl = JSON.parse(manifestText).modules.flatMap((m: any) => m.declarations ?? []).find((d: any) => d.tagName === tag);
  if (!decl) return [...f, `custom-elements.json: no declaration with tagName ${tag}`];
  const fields = (decl.members ?? []).filter((m: any) => m.kind === 'field' && m.privacy !== 'private' && !m.static);
  for (const m of fields) if (!C[m.name]) f.push(`${id} manifest field ${m.name}: not a prop of ${id} (invented)`);
  for (const a of decl.attributes ?? []) if (!Object.values(C).some((r) => r.attr === a.name)) f.push(`${id} manifest attribute ${a.name}: not a prop of ${id} (invented)`);
  for (const p of apiProps) {
    const row = C[p.name];
    if (!row) continue;
    const m = fields.find((x: any) => x.name === p.name);
    if (!m) { f.push(`${id} prop ${p.name}: custom-elements.json has no public field ${p.name}`); continue; }
    if ((m.attribute ?? null) !== row.attr) f.push(`${id} prop ${p.name}: custom-elements.json says attribute ${m.attribute ?? 'none'}, the contract says ${row.attr ?? 'none'}`);
    if (row.attr && !m.reflects) f.push(`${id} prop ${p.name}: ${p.name} does not reflect to ${row.attr}`);
    if (p.values) {
      const union = new Set([...(m.type?.text ?? '').matchAll(/'([^']*)'/g)].map((x) => x[1]));
      for (const v of p.values) if (!union.has(v)) f.push(`${id} prop ${p.name}: custom-elements.json's type lacks '${v}' (${m.type?.text})`);
      for (const v of union) if (!p.values.includes(v)) f.push(`${id} prop ${p.name}: custom-elements.json's type has '${v}', not a value of the def`);
    }
    if (isFlag(p) && m.type?.text !== 'boolean') f.push(`${id} prop ${p.name}: custom-elements.json types it ${m.type?.text}, not boolean`);
    const want = p.default === undefined ? undefined : JSON.stringify(p.default);
    const got = m.default === 'undefined' ? undefined : m.default;
    if (got !== want) f.push(`${id} prop ${p.name}: custom-elements.json default ${got}, the def's ${want}`);
  }
  return f;
};

// ------------------------------------------------------------------------------------------------ live: the element in Chromium
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

/** Runs in the page, as a string. Returns the element's observed API and the markup for each case. */
const PAGE_PROBE = (tag: string, id: Id) => `(async (cases) => {
  const C = customElements.get('${tag}');
  if (!C) return { error: 'customElements has no ${tag}' };
  const props = {};
  for (const [k, o] of C.elementProperties) props[k] = { attribute: o.attribute === false ? null : o.attribute };
  const fresh = document.createElement('${tag}');
  const defaults = {};
  for (const k of Object.keys(props)) defaults[k] = fresh[k] === undefined ? '__undefined__' : fresh[k];
  const make = async (attrs) => {
    const el = document.createElement('${tag}');
    el.setAttribute('data-prop-label', 'Field');
    for (const [a, v] of Object.entries(attrs)) el.setAttribute(a, v);
    document.body.append(el);
    await el.updateComplete;
    return el;
  };
  // The associations, on a plain element and on one with a message and the Show/Hide button.
  const wire = await make({ 'data-prop-showmessage': 'true' });
  const input = wire.querySelector('${IN(id)}');
  const describedBy = input && input.getAttribute('aria-describedby');
  const message = describedBy && document.getElementById(describedBy);
  const assoc = {
    inputId: input ? input.id : null,
    labelFor: wire.querySelector('${LABEL}')?.getAttribute('for') ?? null,
    labelControl: wire.querySelector('${LABEL}')?.control === input,
    describedBy: !!message && wire.contains(message) && message.matches('${MSG}'),
    controls: wire.querySelector('${TOGGLE}') ? wire.querySelector('${TOGGLE}').getAttribute('aria-controls') : '(no toggle)',
    secondId: (await make({})).querySelector('${IN(id)}')?.id ?? null,
  };
  // value is a property: the input follows it, and follows typing.
  const v = await make({});
  v.value = 'typed';
  await v.updateComplete;
  const valueProp = { follows: v.querySelector('${IN(id)}')?.value ?? null, attribute: v.getAttribute('data-prop-value') };
  const out = [];
  for (const c of cases) {
    const el = await make({ ...c.with, [c.attr]: c.value });
    const inner = {};
    for (const [sel, keys] of Object.entries(c.keys)) {
      const node = el.querySelector(sel);
      inner[sel] = node ? Object.fromEntries(keys.map((a) => [a, node.getAttribute(a)])) : null;
    }
    const viaProp = await make(c.with);
    viaProp[c.field] = c.flag ? c.value === 'true' : c.value;
    await viaProp.updateComplete;
    out.push({
      prop: c.prop, value: c.value, inner,
      messageId: el.querySelector('${MSG}')?.id ?? null,
      text: c.text ? (el.querySelector(c.text)?.textContent ?? null) : null,
      property: el[c.field] === undefined ? '__undefined__' : el[c.field],
      reflected: viaProp.getAttribute(c.attr),
    });
  }
  return { props, defaults, assoc, valueProp, out };
})`;

const liveFailures = async (browser: any, id: Id, source: string): Promise<string[]> => {
  const f: string[] = [];
  const C = contract(id);
  const tag = `p3-${id}`;
  const page = await browser.newPage();
  try {
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: await bundle(source, `${tag}.js`) });
    const cases: any[] = [];
    for (const p of AI[id].props as Prop[]) {
      const row = C[p.name];
      if (!row?.attr) continue;
      for (const value of valuesOf(p, row)) {
        const inner = row.inner?.(value) ?? {};
        cases.push({ prop: p.name, field: p.name, attr: row.attr, value, flag: isFlag(p), with: row.with ?? {}, text: row.text, keys: Object.fromEntries(Object.entries(inner).map(([s, a]) => [s, Object.keys(a)])) });
      }
    }
    const r = await page.evaluate(`${PAGE_PROBE(tag, id)}(${JSON.stringify(cases)})`);
    if (errors.length) f.push(`${id} page error: ${errors.join(' / ')}`);
    if (r.error) return [...f, r.error];

    for (const k of Object.keys(r.props)) if (!C[k]) f.push(`${id} element property ${k}: not a prop of ${id} (invented)`);
    for (const p of AI[id].props as Prop[]) {
      const row = C[p.name];
      if (!row) continue;
      const lp = r.props[p.name];
      if (!lp) { f.push(`${id} prop ${p.name}: <${tag}> has no reactive property ${p.name}`); continue; }
      if (lp.attribute !== row.attr) f.push(`${id} prop ${p.name}: ${p.name}'s attribute is ${lp.attribute ?? 'none'}, the contract says ${row.attr ?? 'none'}`);
      const want = p.default === undefined ? '__undefined__' : p.default;
      if (r.defaults[p.name] !== want) f.push(`${id} prop ${p.name}: a new <${tag}>'s ${p.name} is ${JSON.stringify(r.defaults[p.name])}, the def's default is ${JSON.stringify(want)}`);
    }
    const a = r.assoc;
    if (!a.inputId) f.push(`${id}: with no id set, the input has no id`);
    if (a.labelFor !== a.inputId || !a.labelControl) f.push(`${id}: the label's for is ${JSON.stringify(a.labelFor)}, the input's id ${JSON.stringify(a.inputId)} (the label does not name the input)`);
    if (a.secondId === a.inputId) f.push(`${id}: two elements generated the same input id ${JSON.stringify(a.inputId)}`);
    if (!a.describedBy) f.push(`${id}: showMessage=true: the input's aria-describedby does not name the message in the same tree`);
    if (id === 'password-field' && a.controls !== a.inputId) f.push(`${id}: the Show/Hide button's aria-controls is ${JSON.stringify(a.controls)}, the input's id ${JSON.stringify(a.inputId)}`);
    if (r.valueProp.follows !== 'typed') f.push(`${id} prop value: setting value leaves the input at ${JSON.stringify(r.valueProp.follows)}`);
    if (r.valueProp.attribute !== null) f.push(`${id} prop value: the value was written into the DOM as data-prop-value`);
    for (const o of r.out) {
      const p = (AI[id].props as Prop[]).find((x) => x.name === o.prop)!;
      const row = C[o.prop];
      const at = `${id} ${o.prop}=${o.value}`;
      for (const [sel, attrs] of Object.entries(row.inner?.(o.value) ?? {})) {
        if (!o.inner[sel]) { f.push(`${at}: no ${sel} in the markup`); continue; }
        for (const [k, want] of Object.entries(attrs)) {
          const w = want === '@message' ? o.messageId : want;
          if (o.inner[sel][k] !== w) f.push(`${at}: ${sel} ${k} is ${JSON.stringify(o.inner[sel][k])}, the contract says ${JSON.stringify(w)}`);
        }
      }
      if (row.text && o.text !== o.value) f.push(`${at}: ${row.text} reads ${JSON.stringify(o.text)}`);
      const typed = isFlag(p) ? o.value === 'true' : o.value;
      if (o.property !== typed) f.push(`${at}: the attribute sets ${o.prop} to ${JSON.stringify(o.property)}, not ${JSON.stringify(typed)}`);
      const reflected = isFlag(p) ? (o.value === 'true' ? 'true' : null) : o.value;
      if (o.reflected !== reflected) f.push(`${at}: setting ${o.prop} reflects ${row.attr}=${JSON.stringify(o.reflected)}, the contract says ${JSON.stringify(reflected)}`);
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
const TF = SOURCE['text-field'];
const PF = SOURCE['password-field'];
const MUTANTS: { name: string; id: Id; source?: string; manifest?: string; mustName: RegExp }[] = [
  { name: 'error without aria-invalid', id: 'text-field', source: swap(TF, "aria-invalid=${status === 'error' ? 'true' : nothing}", 'aria-invalid=${nothing}', 'aria-invalid'), mustName: /text-field validation=error: \.p3-text-field__entry aria-invalid is null/ },
  { name: 'the message not named in aria-describedby', id: 'text-field', source: swap(TF, 'aria-describedby=${this.showMessage ? messageId : nothing}', 'aria-describedby=${nothing}', 'describedby'), mustName: /text-field: showMessage=true: the input's aria-describedby does not name the message/ },
  { name: 'the label not naming the input', id: 'password-field', source: swap(PF, 'for=${inputId}', 'for=${this.id ?? nothing}', 'label for'), mustName: /password-field: the label's for is null, the input's id "p3-password-field-\d+" \(the label does not name the input\)/ },
  { name: 'a dropped prop (readOnly)', id: 'password-field', source: swap(PF, /\n\s*readOnly: \{[^\n]*\},/, '', 'dropped prop'), mustName: /password-field prop readOnly: <p3-password-field> has no reactive property readOnly/ },
  { name: 'an invented prop (reveal)', id: 'password-field', source: swap(PF, '  static properties = {\n', '  static properties = {\n    reveal: { type: String, attribute: "data-prop-reveal", reflect: true },\n', 'invented'), mustName: /password-field element property reveal: not a prop of password-field \(invented\)/ },
  { name: 'a changed default (size small)', id: 'text-field', source: swap(TF, 'this.size = "medium";', 'this.size = "small";', 'default'), mustName: /text-field prop size: a new <p3-text-field>'s size is "small"/ },
  { name: 'the Show/Hide button without aria-controls', id: 'password-field', source: swap(PF, 'aria-controls=${inputId}', '', 'controls'), mustName: /password-field: the Show\/Hide button's aria-controls is null/ },
  { name: 'a dropped value in the manifest (autoComplete new-password)', id: 'password-field', manifest: swap(MANIFEST, /'current-password' \| 'new-password'/g, "'current-password'", 'dropped value'), mustName: /password-field prop autoComplete: custom-elements\.json's type lacks 'new-password'/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch();
  let fail = 0;
  try {
    for (const id of IDS) {
      const real = [...staticFailures(id, MANIFEST), ...(await liveFailures(browser, id, SOURCE[id]))];
      if (real.length) {
        fail++;
        console.error(`FAIL element parity (${id}): ${real.length} difference(s) between <p3-${id}> and the ${id} def`);
        for (const x of real) console.error(`  - ${x}`);
      } else {
        const C = contract(id);
        const n = (AI[id].props as Prop[]).reduce((s, p) => s + (C[p.name]?.attr ? valuesOf(p, C[p.name]).length : 0), 0);
        console.log(`OK element parity (${id}): <p3-${id}> has the ${AI[id].props.length} props of the def, no more; custom-elements.json agrees on every attribute, type and default; ${n} prop values render the contract's markup; the label, message and button associations hold`);
      }
    }
    for (const m of MUTANTS) {
      const r = [...staticFailures(m.id, m.manifest ?? MANIFEST), ...(await liveFailures(browser, m.id, m.source ?? SOURCE[m.id]))];
      if (r.some((x) => m.mustName.test(x))) console.log(`OK self-test: "${m.name}" fails by name`);
      else { fail++; console.error(`FAIL self-test: "${m.name}" was not reported by name (${r.slice(0, 4).join('; ') || 'nothing'})`); }
    }
  } finally { await browser.close(); }
  process.exit(fail ? 1 : 0);
}
