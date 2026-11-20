/**
 * THE PARITY CHECK FOR THE FIELDS (#3408 S3): do `text-field.css`, `password-field.css`, `field-label.css` and
 * `field-message.css`, rendered, bind the tokens the design spec names? The button's check (`check-parity.ts`) is the
 * model; this file is its sibling, not an import of it, and not of the generator.
 *
 *   npx tsx packages/css/check-parity-fields.ts
 *
 * THE TWO SIDES (`docs/34`):
 *   - EXPECTED is the emission only: `specs.json` (the token per part, size, status and state; each nesting's
 *     `follows` and `when`) and `components.ai.json` (every prop and value the API promises).
 *   - ACTUAL is what Chromium computes for markup this file writes from its OWN copy of the markup contract (`FIELD`,
 *     `LABEL`, `MESSAGE` below; the README documents the same contract), with the shipped stylesheets loaded.
 *     Every token is a unique SENTINEL, so each computed value decodes back to one token name.
 *
 * STATES as the contract realizes them: rest is an empty input with a placeholder; filled has a value; hover is the
 * box's `:hover`, forced through the DevTools protocol; focus-visible is REAL focus on the input (one probe at a
 * time); disabled and read-only are the native attributes.
 *
 * NOT CHECKED HERE, each named on every run: the caret's size (the browser's native caret, codeOnly `platform-owned`),
 * the Figma build widths, the message's computed first-line padding (`check-browser-fields.ts` measures the glyph's
 * position), and the props deferred past S3 (`DEFERRED`).
 *
 * SELF-TEST: seven mutants must each FAIL BY NAME.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUncommitted } from './emission';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../engine/out');
const specs = readUncommitted('specs.json').components;
const ai = JSON.parse(readFileSync(resolve(OUT, 'components/components.ai.json'), 'utf8')).components;
const tree = JSON.parse(readFileSync(resolve(OUT, 'prism3.tokens.json'), 'utf8'));
const README = readFileSync(resolve(HERE, 'README.md'), 'utf8');
const FILES = ['button.css', 'field-label.css', 'field-message.css', 'text-field.css', 'password-field.css'];
type Css = Record<string, string>;
const SHIPPED: Css = Object.fromEntries(FILES.map((f) => [f, readFileSync(resolve(HERE, f), 'utf8')]));

// ------------------------------------------------------------------------------------------------ the markup contract
// The check's own copy. A field is written from a probe's props; each prop value says what it sets where.
type Attrs = Record<string, string>;
type Effect = { root?: Attrs; input?: Attrs; label?: Attrs; message?: Attrs; toggle?: Attrs; show?: string[] };
type Contract = Record<string, { how: string; values?: Record<string, Effect> }>;
const bool = (on: Effect): Record<string, Effect> => ({ true: on, false: {} });
const enumOf = (values: string[], fx: (v: string) => Effect) => Object.fromEntries(values.map((v) => [v, fx(v)]));

const fieldContract = (kind: 'text-field' | 'password-field'): Contract => ({
  label: { how: 'the text of the nested <label class="p3-field-label" for>' },
  value: { how: 'the input\'s value' },
  defaultValue: { how: 'the input\'s value attribute' },
  onChange: { how: 'an input or change listener on the input' },
  ...(kind === 'text-field' ? {
    type: { how: 'the input\'s type attribute', values: enumOf(['text', 'email', 'url', 'tel', 'search', 'password'], (v) => ({ input: { type: v } })) },
    inputMode: { how: 'the input\'s inputmode attribute', values: enumOf(['text', 'numeric', 'decimal', 'tel', 'email', 'url', 'search'], (v) => ({ input: { inputmode: v } })) },
    trailingIcon: { how: '<span class="p3-text-field__trailing-visual" aria-hidden="true"> after the content cell' },
  } : {
    autoComplete: { how: 'the input\'s autocomplete attribute', values: enumOf(['current-password', 'new-password'], (v) => ({ input: { autocomplete: v } })) },
  }),
  ...(kind === 'text-field' ? { autoComplete: { how: 'the input\'s autocomplete attribute' } } : {}),
  placeholder: { how: 'the input\'s placeholder attribute' },
  helpText: { how: 'the text of the nested <p class="p3-field-message"> at the default status' },
  validation: { how: 'data-prop-validation on the field; error also sets aria-invalid="true" on the input', values: enumOf(['default', 'error', 'warning', 'success'], (v) => ({ root: { 'data-prop-validation': v }, input: v === 'error' ? { 'aria-invalid': 'true' } : {} })) },
  validationMessage: { how: 'the text of the nested message at a validation status' },
  showMessage: { how: 'the nested message is present, and the input names it in aria-describedby', values: bool({ show: ['message'] }) },
  required: { how: 'the input\'s required attribute; the label\'s marker follows it', values: bool({ input: { required: '' } }) },
  disabled: { how: 'the input\'s disabled attribute', values: bool({ input: { disabled: '' }, ...(kind === 'password-field' ? { toggle: { disabled: '' } } : {}) }) },
  readOnly: { how: 'the input\'s readonly attribute', values: bool({ input: { readonly: '' } }) },
  leadingIcon: { how: '<span class="p3-…__leading-visual" aria-hidden="true"> before the input' },
  isPending: { how: 'aria-busy="true" on the input', values: bool({ input: { 'aria-busy': 'true' } }) },
  size: { how: 'data-prop-size on the field', values: enumOf(['small', 'medium', 'large'], (v) => ({ root: { 'data-prop-size': v } })) },
  id: { how: 'the input\'s id; the label\'s for names it' },
  name: { how: 'the input\'s name attribute' },
});
const FIELD: Record<string, Contract> = { 'text-field': fieldContract('text-field'), 'password-field': fieldContract('password-field') };
const LABEL: Contract = {
  label: { how: 'the text of <span class="p3-field-label__label">' },
  htmlFor: { how: 'the native for attribute' },
  required: { how: 'data-prop-required="true" (inside a field, the input\'s required)', values: bool({ label: { 'data-prop-required': 'true' } }) },
  size: { how: 'data-prop-size (inside a field, the field\'s size)', values: enumOf(['small', 'medium', 'large'], (v) => ({ label: { 'data-prop-size': v } })) },
  emphasis: { how: 'data-prop-emphasis', values: enumOf(['primary', 'secondary'], (v) => ({ label: { 'data-prop-emphasis': v } })) },
  weight: { how: 'data-prop-weight', values: enumOf(['regular', 'bold'], (v) => ({ label: { 'data-prop-weight': v } })) },
};
const MESSAGE: Contract = {
  status: { how: 'data-prop-status (inside a field, the field\'s validation)', values: enumOf(['default', 'error', 'warning', 'success'], (v) => ({ message: { 'data-prop-status': v } })) },
  message: { how: 'the text of <span class="p3-field-message__label">' },
  icon: { how: 'the glyph cell\'s content' },
  id: { how: 'the native id, named by the input\'s aria-describedby' },
};
/** Props the def promises that S3 does not build yet; printed on every run, never silently passed. */
const DEFERRED: Record<string, Record<string, string>> = {
  'text-field': { prefix: 'a text affix: no part in the def\'s anatomy (#1699)', suffix: 'a text affix: no part in the def\'s anatomy (#1699)', clearable: 'an interactive Clear button: behavior, S4' },
};

// ------------------------------------------------------------------------------------------------ sentinels
const ROOT = Object.keys(tree).filter((k) => !k.startsWith('$'))[0];
const cssName = (path: string) => `--${ROOT}-${path.replace(/\./g, '-')}`;
const sentinel = new Map<string, string>();
const decode = new Map<string, string>();
{
  let i = 1;
  const walk = (n: any, p: string[], type?: string) => {
    if (!n || typeof n !== 'object') return;
    const t = n.$type ?? type;
    if (n.$value !== undefined) {
      const path = p.join('.');
      const k = i++;
      if (t === 'color') { sentinel.set(cssName(path), `rgb(1, ${k >> 8}, ${k & 255})`); decode.set(`rgb(1, ${k >> 8}, ${k & 255})`, path); }
      if (t === 'dimension') { sentinel.set(cssName(path), `${10000 + k}px`); decode.set(`${10000 + k}px`, path); }
      if (t === 'typography') { sentinel.set(cssName(path), `400 ${1000 + k}px/1 serif`); decode.set(`font:${1000 + k}px`, path); }
      if (t === 'number') { sentinel.set(cssName(path), `${k / 1000}`); decode.set(`ls:${k}`, path); }
      if (t === 'strokeStyle') sentinel.set(cssName(path), 'solid');
      return;
    }
    for (const [key, v] of Object.entries(n)) if (!key.startsWith('$')) walk(v, [...p, key], t);
  };
  walk(tree[ROOT], [], undefined);
}
const name = (computed: string) => decode.get(computed) ?? (computed === 'rgba(0, 0, 0, 0)' ? '(transparent)' : `(no token: ${computed})`);

// ------------------------------------------------------------------------------------------------ probes
type Check = { at: string; pseudo?: string; prop: string; want: string; what: string };
export type Probe = { kind: string; props: Record<string, string>; state: string; where: string; checks: Check[]; ownLabel?: Attrs; ownMessage?: Attrs; icons?: boolean };

/** A part path's element, as the contract writes it (the check's own map, not the generator's). */
const at = (kind: string, part: string): { at: string; pseudo?: string } => {
  const P = `.p3-${kind}`;
  const leaf = part.split('/').pop()!;
  const map: Record<string, string> = {
    container: '', control: `${P}__control`, content: `${P}__control > ${P}__content`, leadingVisual: `${P}__leading-visual`, trailingVisual: `${P}__trailing-visual`,
    value: 'input', caret: 'input', caretEnd: 'input', labelRow: `${P}__label-row`, toggle: '.p3-password-field__toggle',
  };
  if (leaf === 'placeholder') return { at: 'input', pseudo: '::placeholder' };
  if (kind === 'field-label') return { at: leaf === 'container' ? '' : `.p3-field-label__${leaf}` };
  if (kind === 'field-message') {
    const m: Record<string, string> = { message: '', captionCell: '.p3-field-message__caption-cell', glyphCell: '.p3-field-message__glyph-cell', label: '.p3-field-message__label', errorGlyph: '.p3-field-message__error-glyph', warningGlyph: '.p3-field-message__warning-glyph', successGlyph: '.p3-field-message__success-glyph' };
    return { at: m[leaf] };
  }
  if (!(leaf in map)) throw new Error(`no element for ${kind} ${part}`);
  return { at: map[leaf] };
};
const COLOR: Record<string, string> = { fill: 'background-color', stroke: 'border-top-color', ink: 'color', icon: 'color' };
const STATE: Record<string, { props: Record<string, string>; filled: boolean; hover?: boolean; focus?: boolean }> = {
  rest: { props: {}, filled: false }, filled: { props: {}, filled: true }, hover: { props: {}, filled: false, hover: true },
  'focus-visible': { props: {}, filled: false, focus: true }, 'focus-visible-filled': { props: {}, filled: true, focus: true },
  disabled: { props: { disabled: 'true' }, filled: false }, 'read-only': { props: { readOnly: 'true' }, filled: true },
};
const typeChecks = (target: { at: string; pseudo?: string }, style: string, what: string): Check[] => {
  const s = style.split('.').reduce((n: any, k: string) => n?.[k], tree[ROOT])?.$value;
  const ls = typeof s?.letterSpacing === 'string' ? s.letterSpacing.replace(/^\{|\}$/g, '').replace(new RegExp(`^${ROOT}\\.`), '') : `(literal ${s?.letterSpacing})`;
  return [{ ...target, prop: 'font-size', want: style, what: `${what} textStyle` }, { ...target, prop: 'letter-spacing', want: ls, what: `${what} letterSpacing` }];
};
const w = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join(' ');

export const buildProbes = (contracts: { field: Record<string, Contract>; label: Contract; message: Contract }): { probes: Probe[]; gaps: string[]; skipped: Set<string> } => {
  const probes: Probe[] = [];
  const gaps: string[] = [];
  const skipped = new Set<string>();
  // 1. Every prop and value the API promises has a markup mapping and a README row, per component.
  const coverage = (id: string, contract: Contract) => {
    const section = README.split(/^### /m).find((s) => s.startsWith(`\`${id}\``)) ?? '';
    if (!section) gaps.push(`${id} has no "### \`${id}\`" markup contract section in the README`);
    for (const p of ai[id].props) {
      if (DEFERRED[id]?.[p.name]) { skipped.add(`${id}.${p.name} deferred: ${DEFERRED[id][p.name]}`); continue; }
      const m = contract[p.name];
      if (!m) { gaps.push(`${id} prop ${p.name} has no markup mapping`); continue; }
      for (const val of p.values ?? (p.type === 'boolean' ? ['true', 'false'] : [])) if (!m.values?.[String(val)]) gaps.push(`${id} prop value ${p.name}=${val} has no markup mapping`);
      if (!new RegExp(`^\\|\\s*\`${p.name}\`\\s*\\|`, 'm').test(section)) gaps.push(`${id} prop ${p.name} is not in the README's ${id} markup contract table`);
    }
  };
  for (const id of ['text-field', 'password-field']) coverage(id, contracts.field[id]);
  coverage('field-label', contracts.label);
  coverage('field-message', contracts.message);

  for (const kind of ['text-field', 'password-field']) {
    const spec = specs[kind];
    const statusProp = 'validation';
    for (const s of spec.axes.find((a: any) => a.name === 'state').values) if (!STATE[s]) gaps.push(`${kind} state ${s} has no markup mapping`);
    // 2. Colors, every row, with the leading visual (and trailing, where there is one) present.
    for (const row of spec.colors) {
      const { state, status } = row.where;
      const checks: Check[] = [];
      for (const p of row.parts) for (const [k, token] of Object.entries<any>(p)) {
        if (k === 'part') continue;
        const leaf = p.part.split('/').pop();
        const prop = leaf === 'caret' || leaf === 'caretEnd' ? 'caret-color' : COLOR[k];
        checks.push({ ...at(kind, p.part), prop, want: token, what: `${p.part} ${prop}` });
        if (p.part === 'container/control' && k === 'stroke' && STATE[state]?.focus) checks.push({ ...at(kind, p.part), prop: 'outline-color', want: token, what: 'focus edge outline-color (the stroke\'s own paint, #3399)' });
      }
      probes.push({ kind, props: { [statusProp]: status, ...STATE[state]?.props }, state, where: `${kind} ${w(row.where)}`, checks, icons: true });
    }
    // 3. Sizes, every redline row, in its own state: since #3839 a row carries the corner and stroke, and the stroke
    // moves at focus, so the key holds `state`. The focus stroke is the focus edge, an inset outline (#3399).
    for (const row of spec.redlines) {
      const { state = 'rest', ...coord } = row.where;
      if (!STATE[state]) { gaps.push(`${kind} redline row ${w(row.where)}: no markup for state ${state}`); continue; }
      const checks: Check[] = [];
      for (const p of row.parts) for (const [k, val] of Object.entries<any>(p.values)) {
        const leaf = p.part.split('/').pop();
        if (leaf === 'caret' || leaf === 'caretEnd') { skipped.add(`${kind} ${p.part}: the native caret (codeOnly platform-owned)`); continue; }
        if (k === 'buildWidth') { skipped.add(`${kind} ${p.part}.buildWidth: the Figma build width`); continue; }
        const prop = k === 'gap' ? (p.part === 'container' ? 'row-gap' : 'column-gap')
          : k === 'height' ? (p.part === 'container/control' ? 'min-height' : 'height')
          : k === 'strokeWidth' ? (STATE[state].focus ? 'outline-width' : 'border-top-width')
          : ({ paddingTop: 'padding-top', paddingBottom: 'padding-bottom', paddingLeft: 'padding-left', paddingRight: 'padding-right', width: 'width', minWidth: 'min-width', radius: 'border-top-left-radius' } as Record<string, string>)[k];
        if (!prop) { gaps.push(`${kind} redline ${p.part}.${k} has no CSS property in this check`); continue; }
        checks.push({ ...at(kind, p.part), prop, want: val.token ?? `(px ${val.px})`, what: `${p.part} ${k}` });
      }
      probes.push({ kind, props: { ...coord, ...STATE[state].props }, state, where: `${kind} ${w(row.where)}`, checks, icons: true });
    }
    // 4. Text, every type row (the placeholder at rest, the value filled).
    for (const row of spec.type) for (const p of row.parts) {
      const leaf = p.part.split('/').pop();
      probes.push({ kind, props: { ...row.where }, state: leaf === 'value' ? 'filled' : 'rest', where: `${kind} ${w(row.where)}`, checks: typeChecks(at(kind, p.part), p.textStyle, p.part) });
    }
    // 5. The nested label: it follows the field's size, and the field's disabled (nesting `follows`, `when`).
    const ln = spec.nesting.find((n: any) => n.component === 'field-label');
    const LS = specs['field-label'];
    for (const size of spec.axes.find((a: any) => a.name === 'size').values) for (const row of LS.type.filter((r: any) => r.where.size === (ln.follows.includes('size') ? size : ln.variant.size))) {
      probes.push({ kind, props: { size }, state: 'rest', ownLabel: { 'data-prop-weight': row.where.weight }, where: `${kind} size=${size} label weight=${row.where.weight}`,
        checks: row.parts.flatMap((p: any) => typeChecks({ at: `.p3-field-label > ${at('field-label', p.part).at}` }, p.textStyle, `nested field-label ${p.part}`)) });
    }
    for (const row of LS.colors) {
      const fieldState = Object.entries<any>(ln.when?.state ?? {}).find(([, v]) => v.state === row.where.state)?.[0] ?? (row.where.state === 'rest' ? 'rest' : undefined);
      if (!fieldState) { gaps.push(`${kind}: no field state sets its label to ${row.where.state}`); continue; }
      probes.push({ kind, props: { ...STATE[fieldState].props }, state: fieldState, ownLabel: { 'data-prop-emphasis': row.where.emphasis, 'data-prop-weight': row.where.weight }, where: `${kind} state=${fieldState} label ${w(row.where)}`,
        checks: row.parts.map((p: any) => ({ at: `.p3-field-label > ${at('field-label', p.part).at}`, prop: 'color', want: p.ink, what: `nested field-label ${p.part} ink` })) });
    }
    probes.push({ kind, props: { required: 'true' }, state: 'rest', where: `${kind} required=true`, checks: [{ at: '.p3-field-label__indicator', prop: 'display', want: '(shown)', what: 'the label\'s required marker follows the input\'s required' }] });
    probes.push({ kind, props: { required: 'false' }, state: 'rest', where: `${kind} required=false`, checks: [{ at: '.p3-field-label__indicator', prop: 'display', want: '(none)', what: 'the label\'s required marker, not required' }] });
    // 6. The nested message: it follows the field's status, glyph and ink.
    const mn = spec.nesting.find((n: any) => n.component === 'field-message');
    const MS = specs['field-message'];
    for (const status of spec.axes.find((a: any) => a.name === 'status').values) {
      const row = MS.colors.find((r: any) => r.where.status === (mn.follows.includes('status') ? status : 'default'));
      const checks: Check[] = row.parts.map((p: any) => ({ at: at('field-message', p.part).at, prop: 'color', want: p[Object.keys(p).find((k) => k !== 'part')!], what: `nested field-message ${p.part} paint` }));
      for (const a of MS.anatomy) if (a.when?.status) checks.push({ at: at('field-message', a.part).at, prop: 'display', want: a.when.status.includes(row.where.status) ? '(shown)' : '(none)', what: `nested field-message ${a.part} shown only at ${a.when.status.join('/')}` });
      // the message is written at the default status on purpose: the field's validation must reach it
      probes.push({ kind, props: { [statusProp]: status, showMessage: 'true' }, state: 'rest', ownMessage: { 'data-prop-status': 'default' }, where: `${kind} validation=${status} message`, checks });
    }
    // 7. The Show/Hide button: Button's text/small/flush paint, disabled with the field, never the status.
    const tn = spec.nesting.find((n: any) => n.component === 'button');
    if (tn) {
      const brow = (state: string) => specs.button.colors.find((r: any) => Object.entries(tn.variant).every(([k, v]) => k === 'state' || !(k in r.where) || r.where[k] === v) && r.where.state === state);
      const ink = (state: string) => brow(state).parts.find((p: any) => p.part === 'container/label').ink;
      for (const [fieldState, bState] of Object.entries<any>({ rest: 'rest', ...Object.fromEntries(Object.entries<any>(tn.when?.state ?? {}).map(([k, v]) => [k, v.state])) })) {
        for (const status of ['default', 'error']) {
          probes.push({ kind, props: { validation: status, ...STATE[fieldState].props }, state: fieldState, where: `${kind} validation=${status} state=${fieldState} toggle`,
            checks: [{ at: '.p3-password-field__toggle > .p3-button__label', prop: 'color', want: ink(bState), what: `Show/Hide button label ink (button ${bState}${tn.follows.length ? '' : ', follows nothing'})` }] });
        }
      }
    }
  }
  // 8. The standalone label and message: their own props.
  const LS = specs['field-label'];
  for (const row of LS.type) probes.push({ kind: 'field-label', props: {}, state: 'rest', ownLabel: { 'data-prop-size': row.where.size, 'data-prop-weight': row.where.weight }, where: `field-label ${w(row.where)}`,
    checks: row.parts.flatMap((p: any) => typeChecks(at('field-label', p.part), p.textStyle, p.part)) });
  for (const row of LS.colors.filter((r: any) => r.where.state === 'rest')) probes.push({ kind: 'field-label', props: {}, state: 'rest', ownLabel: { 'data-prop-emphasis': row.where.emphasis, 'data-prop-weight': row.where.weight }, where: `field-label ${w(row.where)}`,
    checks: row.parts.map((p: any) => ({ ...at('field-label', p.part), prop: 'color', want: p.ink, what: `${p.part} ink` })) });
  for (const row of LS.redlines) probes.push({ kind: 'field-label', props: {}, state: 'rest', ownLabel: { 'data-prop-size': row.where.size }, where: `field-label ${w(row.where)}`,
    checks: row.parts.flatMap((p: any) => Object.entries<any>(p.values).filter(([k]) => k === 'gap').map(([k, val]) => ({ ...at('field-label', p.part), prop: 'column-gap', want: val.token, what: `${p.part} ${k}` }))) });
  const MS = specs['field-message'];
  for (const row of MS.colors) probes.push({ kind: 'field-message', props: {}, state: 'rest', ownMessage: { 'data-prop-status': row.where.status }, where: `field-message ${w(row.where)}`,
    checks: row.parts.map((p: any) => ({ ...at('field-message', p.part), prop: 'color', want: p[Object.keys(p).find((k) => k !== 'part')!], what: `${p.part} paint` })) });
  for (const row of MS.type) probes.push({ kind: 'field-message', props: {}, state: 'rest', where: 'field-message type', checks: row.parts.flatMap((p: any) => typeChecks(at('field-message', p.part), p.textStyle, p.part)) });
  for (const row of MS.redlines) for (const status of ['error', 'warning', 'success']) {
    const checks: Check[] = [];
    for (const p of row.parts) for (const [k, val] of Object.entries<any>(p.values)) {
      if (val.source === 'computed') { skipped.add(`field-message ${p.part}.${k}: computed (${val.rule}); the browser check measures the glyph's first-line centering`); continue; }
      if (k === 'buildWidth') { skipped.add(`field-message ${p.part}.buildWidth: the Figma build width`); continue; }
      if (/Glyph$/.test(p.part) && !p.part.endsWith(`${status}Glyph`)) continue;
      const prop = ({ gap: 'column-gap', minHeight: 'min-height', height: 'height', width: 'width' } as Record<string, string>)[k];
      checks.push({ ...at('field-message', p.part), prop, want: val.token, what: `${p.part} ${k}` });
    }
    probes.push({ kind: 'field-message', props: {}, state: 'rest', ownMessage: { 'data-prop-status': status }, where: `field-message status=${status}`, checks });
  }
  return { probes, gaps, skipped };
};

// ------------------------------------------------------------------------------------------------ writing the markup
const attrs = (a: Attrs) => Object.entries(a).map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${v.replace(/"/g, '&quot;')}"`)).join('');
const html = (pr: Probe, i: number, contracts: { field: Record<string, Contract> }, missing: string[]): string => {
  const id = `probe-${i}`;
  if (pr.kind === 'field-label') return `<label class="p3-field-label" data-component="field-label" for="x" data-probe="${i}"${attrs(pr.ownLabel ?? {})}><span class="p3-field-label__label">Label</span><span class="p3-field-label__indicator" aria-hidden="true">*</span></label>`;
  const glyphs = '<span class="p3-field-message__glyph-cell" aria-hidden="true"><span class="p3-field-message__error-glyph"><svg viewBox="0 0 24 24"></svg></span><span class="p3-field-message__warning-glyph"><svg viewBox="0 0 24 24"></svg></span><span class="p3-field-message__success-glyph"><svg viewBox="0 0 24 24"></svg></span></span>';
  const message = (extra: string) => `<p class="p3-field-message" data-component="field-message" id="${id}-m"${attrs(pr.ownMessage ?? {})}${extra}>${glyphs}<span class="p3-field-message__caption-cell"><span class="p3-field-message__label">Message</span></span></p>`;
  if (pr.kind === 'field-message') return message(` data-probe="${i}"`);
  const contract = contracts.field[pr.kind];
  const fx: Required<Pick<Effect, 'root' | 'input' | 'toggle'>> & { show: string[] } = { root: {}, input: {}, toggle: {}, show: [] };
  const props = { showMessage: 'true', ...pr.props };
  for (const [k, v] of Object.entries(props)) {
    const e = contract[k]?.values?.[v];
    if (!e) { missing.push(`${k}=${v}`); continue; }
    Object.assign(fx.root, e.root); Object.assign(fx.input, e.input); Object.assign(fx.toggle, e.toggle); fx.show.push(...(e.show ?? []));
  }
  const P = `p3-${pr.kind}`;
  const filled = STATE[pr.state]?.filled;
  const input = `<input class="${P}__entry" id="${id}" type="${pr.kind === 'password-field' ? 'password' : 'text'}" placeholder="Placeholder"${filled ? ' value="Entered"' : ''}${fx.show.includes('message') ? ` aria-describedby="${id}-m"` : ''}${attrs(fx.input)}>`;
  const label = `<label class="p3-field-label" data-component="field-label" for="${id}"${attrs(pr.ownLabel ?? {})}><span class="p3-field-label__label">Label</span><span class="p3-field-label__indicator" aria-hidden="true">*</span></label>`;
  const top = pr.kind === 'password-field'
    ? `<div class="${P}__label-row"><div class="${P}__label-cell">${label}</div><button type="button" class="p3-button p3-password-field__toggle" data-component="button" data-prop-appearance="text" data-prop-size="small" data-prop-inset="flush" aria-controls="${id}"${attrs(fx.toggle)}><span class="p3-button__label">Show</span></button></div>`
    : label;
  const icon = (part: string) => `<span class="${P}__${part}" aria-hidden="true"><svg viewBox="0 0 24 24"></svg></span>`;
  const control = `<div class="${P}__control"><div class="${P}__content">${pr.icons !== false ? icon('leading-visual') : ''}${input}</div><span class="${P}__spinner" aria-hidden="true"><svg viewBox="0 0 24 24"></svg></span>${pr.kind === 'text-field' && pr.icons !== false ? icon('trailing-visual') : ''}</div>`;
  return `<div class="${P}" data-component="${pr.kind}" data-probe="${i}"${attrs(fx.root)}>${top}${control}${fx.show.includes('message') ? message('') : ''}</div>`;
};

// ------------------------------------------------------------------------------------------------ the run
/**
 * A DELIVERY FORM (#3408 S6), as in `check-parity.ts`. `skip` names a probe the form cannot write, with why; a skipped
 * probe is reported on every run, never silently passed. `props` is the probe as API props: its own plus its state's.
 */
export type Form = { name: string; scripts: string[]; skip?: (pr: Probe) => string | undefined; write: (pr: Probe, i: number, props: Record<string, string>, missing: string[]) => string };
/** As `check-parity.ts`'s (copied, not imported: importing it would run a second emission). */
const MARK_ROOTS = `(async () => { const hosts = [...document.querySelectorAll('[data-probe-host]')]; await Promise.all(hosts.map((h) => h.updateComplete)); for (const h of hosts) { const inner = h.querySelector(':scope > ' + h.getAttribute('data-probe-root')); if (inner) inner.setAttribute('data-probe', h.getAttribute('data-probe-host')); } })()`;
export const STATE_PROPS = (state: string): Record<string, string> => STATE[state]?.props ?? {};
export const isFilled = (state: string): boolean => !!STATE[state]?.filled;
export const runParity = async (browser: any, css: Css, contracts: { field: Record<string, Contract>; label: Contract; message: Contract }, form?: Form) => {
  const built0 = buildProbes(contracts);
  const { gaps } = built0;
  const skipped = new Set(built0.skipped);
  const probes = form?.skip ? built0.probes.filter((pr) => { const why = form.skip!(pr); if (why) skipped.add(`${form.name} form: ${pr.where}: ${why}`); return !why; }) : built0.probes;
  const failures = [...gaps];
  const page = await browser.newPage();
  const built = probes.map((pr, i) => { const missing: string[] = []; const h = form ? form.write(pr, i, { showMessage: 'true', ...pr.props }, missing) : html(pr, i, contracts, missing); for (const m of missing) failures.push(`${pr.where}: ${m} has no markup mapping`); return h; });
  const root = `:root{${[...sentinel].map(([k, v]) => `${k}:${v};`).join('')}}`;
  await page.setContent(`<!doctype html><html><head><style>${root}</style>${FILES.map((f) => `<style>${css[f]}</style>`).join('')}</head><body>${built.map((b) => `<div>${b}</div>`).join('\n')}</body></html>`);
  if (form?.scripts.length) {
    for (const s of form.scripts) await page.addScriptTag({ content: s });
    await page.evaluate(MARK_ROOTS);
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const doc = await cdp.send('DOM.getDocument', { depth: -1 });
  for (let i = 0; i < probes.length; i++) {
    if (!STATE[probes[i].state]?.hover) continue;
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: `[data-probe="${i}"] .p3-${probes[i].kind}__control` });
    if (!nodeId) continue; // no probe root: its checks read "(no probe root)" below
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
  }
  const read = (i: number) => page.evaluate(([idx, checks]: [number, Check[]]) => {
    const el = document.querySelector(`[data-probe="${idx}"]`);
    if (!el) return checks.map(() => '(no probe root)');
    return checks.map((c) => {
      const node = c.at ? el.querySelector(c.at) : el;
      if (!node) return '(no element)';
      const cs = getComputedStyle(node, c.pseudo ?? null);
      if (c.prop === 'letter-spacing') return `ls:${Math.round((parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize)) * 1000)}`;
      if (c.prop === 'font-size') return `font:${cs.fontSize}`;
      if (c.prop === 'display') return cs.display === 'none' ? '(none)' : '(shown)';
      return cs.getPropertyValue(c.prop);
    });
  }, [i, probes[i].checks] as [number, Check[]]);
  const reads: string[][] = [];
  for (let i = 0; i < probes.length; i++) {
    if (STATE[probes[i].state]?.focus && await page.$(`[data-probe="${i}"] input`)) await page.focus(`[data-probe="${i}"] input`);
    reads[i] = await read(i);
    if (STATE[probes[i].state]?.focus) await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  }
  let checked = 0;
  probes.forEach((pr, i) => pr.checks.forEach((c, j) => {
    checked++;
    const got = reads[i][j];
    let gotName: string;
    if (c.want.startsWith('(px ')) gotName = `(px ${got.replace(/px$/, '')})`;
    else if (c.want === '(shown)' || c.want === '(none)') gotName = got;
    else gotName = name(got);
    if (gotName !== c.want) failures.push(`${pr.where}${pr.where.includes(' state=') ? '' : ` state=${pr.state}`}: ${c.what} binds ${gotName}, the spec names ${c.want}`);
  }));
  await page.close();
  return { failures, checked, skipped, probes: probes.length };
};

// ------------------------------------------------------------------------------------------------ mutants
const dropRules = (css: string, test: (sel: string) => boolean) =>
  css.replace(/^( +)([^\n{}@][^\n{}]*) \{\n[\s\S]*?^\1\}\n/gm, (all, _i, sel) => (test(sel) ? '' : all));
const CONTRACTS = { field: FIELD, label: LABEL, message: MESSAGE };
const withFile = (file: string, text: string): Css => ({ ...SHIPPED, [file]: text });
const withoutValue = (kind: string, prop: string, val: string) => {
  const copy = JSON.parse(JSON.stringify(FIELD));
  delete copy[kind][prop].values[val];
  return { ...CONTRACTS, field: copy };
};
const MUTANTS: { name: string; css: Css; contracts: typeof CONTRACTS; mustName: RegExp }[] = [
  { name: 'swap one bound token (text-field error border → warning)',
    css: withFile('text-field.css', SHIPPED['text-field.css'].replace(/(\[data-prop-validation="error"\] > \.p3-text-field__control \{\n\s*background-color: [^\n]+\n\s*border-color: var\(--pds3-color-border-)danger/, '$1warning')),
    contracts: CONTRACTS, mustName: /text-field status=error state=(rest|filled): container\/control border-top-color binds color\.border\.warning, the spec names color\.border\.danger/ },
  { name: 'drop a state (every :hover rule in text-field.css)',
    css: withFile('text-field.css', dropRules(SHIPPED['text-field.css'], (s) => s.includes(':hover'))), contracts: CONTRACTS, mustName: /text-field status=default state=hover: container\/control border-top-color binds color\.field\.border\.rest, the spec names color\.field\.border\.hover/ },
  { name: 'drop a prop value in the CSS (password-field size=large)',
    css: withFile('password-field.css', dropRules(SHIPPED['password-field.css'], (s) => s.includes('.p3-password-field[data-prop-size="large"]'))), contracts: CONTRACTS, mustName: /password-field size=large .* binds/ },
  { name: 'drop a prop value in the markup contract (text-field validation=warning)',
    css: SHIPPED, contracts: withoutValue('text-field', 'validation', 'warning'), mustName: /text-field prop value validation=warning has no markup mapping/ },
  { name: 'the label stops following the field\'s size',
    css: withFile('text-field.css', dropRules(SHIPPED['text-field.css'], (s) => /data-prop-size[^>]*\] > \.p3-field-label/.test(s))), contracts: CONTRACTS, mustName: /text-field size=(medium|large) label weight=regular .*nested field-label container\/label textStyle binds type\.body\.xs\.default/ },
  { name: 'the message stops following the field\'s status',
    css: withFile('text-field.css', dropRules(SHIPPED['text-field.css'], (s) => s.includes('> .p3-field-message'))), contracts: CONTRACTS, mustName: /text-field validation=error message .*nested field-message message\/captionCell\/label paint binds color\.text\.secondary, the spec names color\.text\.danger/ },
  { name: 'the focus edge dropped (every outline-color)',
    css: withFile('password-field.css', SHIPPED['password-field.css'].replace(/\n\s*outline-color: [^;]+;/g, '')), contracts: CONTRACTS, mustName: /password-field status=default state=focus-visible: focus edge outline-color .* binds .*, the spec names color\.border\.focus/ },
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  let bad = 0;
  try {
    const real = await runParity(browser, SHIPPED, CONTRACTS);
    if (real.failures.length) {
      bad++;
      console.error(`FAIL parity (fields): ${real.failures.length} of ${real.checked} bindings disagree with specs.json / components.ai.json`);
      for (const f of real.failures.slice(0, 40)) console.error(`  - ${f}`);
    } else console.log(`OK parity (fields): ${real.checked} bindings in ${real.probes} probes match specs.json (text-field, password-field, field-label, field-message, the nested label, message and Show/Hide button); every prop and value in components.ai.json has a markup mapping and a README row`);
    for (const s of [...real.skipped].sort()) console.log(`  not checked here: ${s}`);
    for (const m of MUTANTS) {
      if (m.css === SHIPPED && m.contracts === CONTRACTS) { bad++; console.error(`FAIL self-test: mutant "${m.name}" did not change its subject`); continue; }
      if (m.css !== SHIPPED && FILES.every((f) => m.css[f] === SHIPPED[f])) { bad++; console.error(`FAIL self-test: mutant "${m.name}" did not change any stylesheet`); continue; }
      const r = await runParity(browser, m.css, m.contracts);
      if (r.failures.some((f) => m.mustName.test(f))) console.log(`OK self-test: mutant "${m.name}" fails by name (${r.failures.length} failures)`);
      else { bad++; console.error(`FAIL self-test: mutant "${m.name}" was not caught by name${r.failures[0] ? `; first failure: ${r.failures[0]}` : ' (no failures)'}`); }
    }
  } finally {
    await browser.close();
  }
  process.exit(bad ? 1 : 0);
}
