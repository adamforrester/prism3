/**
 * THE @prism3/web-components GENERATOR (#3408 S4, owner decisions Q95 B and Q96 A): writes the `<p3-button>` element
 * shell, `p3-button.js`, from the engine's emission.
 *
 *   npx tsx packages/web-components/generate.ts           write p3-button.js
 *   npx tsx packages/web-components/generate.ts --check   exit 1 when the committed p3-button.js is not what this writes
 *
 * WHAT IT READS. `component-defs.json`, the def's code API: every prop's name, type, values and default. It is an
 * uncommitted export (#3698 R3), generated fresh into a temp dir by `@prism3/css`'s `emission.ts`, never read from
 * `out/`. Each prop becomes one Lit reactive property with the def's name, and each property that can be an attribute
 * reflects to `data-prop-<name>` (lowercase, as HTML stores it), the mark `@prism3/css` styles and the agent-adherence
 * scorer reads. A def prop of a type this file has no rule for fails generation by name, so a new prop is never
 * silently left out.
 *
 * WHAT IT DOES NOT DECIDE. The element renders `@prism3/css`'s markup contract (that package's README) in the light
 * DOM: a native `<button class="p3-button">` (or `<a href>`), its part spans and its state attributes. The CSS is the
 * single source of truth for how it looks; the element adds no style of its own. The contract's mapping of each prop
 * to markup is written below, in `MARKUP`; `check-parity.ts` holds its own copy, written apart, so the two can
 * disagree and fail (`docs/34`).
 *
 * THE FIELDS (`p3-text-field.js`, `p3-password-field.js`) are written by `generate-fields.ts`, called from here, so
 * `--check` covers all three elements.
 *
 * The output is plain JavaScript with JSDoc types, so a client needs no build to read it and
 * `@custom-elements-manifest/analyzer` can read each property's type, default and description.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUncommitted } from '../css/emission';
import { FIELD_IDS, fieldSource } from './generate-fields';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ELEMENT_FILE = resolve(HERE, 'p3-button.js');

const COMPONENT = 'button';
const TAG = 'p3-button'; // Q97 A: the `p3-` prefix, then the def id.

type Prop = { name: string; type: string; values?: string[]; default?: unknown; required?: boolean; description?: string };
const def = readUncommitted('component-defs.json').components[COMPONENT]?.def;
if (!def) throw new Error(`no "${COMPONENT}" in component-defs.json`);
const props: Prop[] = def.props;

/** A def prop name as a JS identifier: `aria-label` → `ariaLabel`. Every other def name already is one. */
const field = (name: string) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
/** The reflected attribute: `data-prop-` + the def name, lowercased as HTML stores attribute names. */
const attr = (name: string) => `data-prop-${name.toLowerCase()}`;

// ------------------------------------------------------------------------------------------------ the markup contract
// How each prop reaches the inner element (`@prism3/css` README, "Markup contract"). Every enum prop is a `data-prop-*`
// attribute unless named here; every other prop must be named here, or generation fails.
type Kind = 'enum' | 'flag' | 'text' | 'function' | 'slot';
const kindOf = (p: Prop): Kind => {
  if (p.type.startsWith('enum:')) return 'enum';
  if (p.type === 'boolean') return 'flag';
  if (p.type === 'string' || p.type.startsWith('node')) return 'text';
  if (p.type === 'function') return 'function';
  if (p.type === 'slot') return 'slot';
  throw new Error(`${COMPONENT}.${p.name}: no rule for a prop of type "${p.type}"`);
};
/** Props the contract maps to something other than a `data-prop-*` attribute on the inner element. */
const MARKUP: Record<string, string> = {
  label: 'the text of the label span',
  onClick: 'called on a click the element does not suppress',
  type: 'the native type attribute',
  isPending: 'aria-busy="true" and aria-disabled="true", and the spinner span',
  isInactive: 'aria-disabled="true"',
  disabled: 'the native disabled attribute',
  leadingVisual: 'the leading-visual span, before the label',
  trailingVisual: 'the trailing-visual span, after the label',
  href: 'an <a href> in place of the <button>',
  'aria-label': 'the native aria-label attribute',
  fullWidth: 'data-prop-fullwidth="true"',
};
for (const p of props) {
  const k = kindOf(p);
  if (k !== 'enum' && !MARKUP[p.name]) throw new Error(`${COMPONENT}.${p.name}: a ${k} prop with no markup mapping in generate.ts`);
}
for (const n of Object.keys(MARKUP)) if (!props.some((p) => p.name === n)) throw new Error(`generate.ts maps "${n}", which ${COMPONENT} has no prop for`);
const styled = props.filter((p) => kindOf(p) === 'enum' && !MARKUP[p.name]); // appearance, size, surface, inset

// ------------------------------------------------------------------------------------------------ writing
const js = (v: unknown) => JSON.stringify(v);
const doc = (p: Prop) => (p.description ?? '').replace(/\*\//g, '*\\/').replace(/\s+/g, ' ').trim();
const jsType = (p: Prop): string => {
  const k = kindOf(p);
  if (k === 'enum') return p.values!.map((x) => `'${x}'`).join(' | ');
  if (k === 'flag') return 'boolean';
  if (k === 'function') return '((event: MouseEvent) => void) | undefined';
  if (k === 'slot') return 'Node | string | undefined';
  return 'string | undefined';
};
const declaration = (p: Prop): string => {
  const k = kindOf(p);
  if (k === 'function' || k === 'slot') return `    ${field(p.name)}: { attribute: false },`;
  if (k === 'flag') return `    ${field(p.name)}: { attribute: ${js(attr(p.name))}, reflect: true, converter: flag },`;
  return `    ${field(p.name)}: { type: String, attribute: ${js(attr(p.name))}, reflect: true },`;
};
const initializer = (p: Prop): string => {
  const init = p.default === undefined ? 'undefined' : js(p.default);
  return `    /** ${doc(p)} @type {${jsType(p)}} */\n    this.${field(p.name)} = ${init};`;
};
const has = (n: string) => props.some((p) => p.name === n);
['label', 'type', 'isPending', 'isInactive', 'disabled', 'href', 'aria-label', 'fullWidth', 'leadingVisual', 'trailingVisual', 'onClick']
  .forEach((n) => { if (!has(n)) throw new Error(`${COMPONENT} has no prop "${n}", which the element's render needs`); });

/** The spinner drawing, as the spinner def's codeOnly `visual-treatment` entry states it (the same one `@prism3/css`'s demo draws). */
const SPINNER = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-opacity="0.2"></circle>'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="20.73 62.83" transform="rotate(-90 12 12)"></circle>'
  + '</svg>';

export const source = (): string => `// GENERATED by packages/web-components/generate.ts from the engine's ${COMPONENT} def. Do not edit; regenerate.
import { LitElement, html, nothing } from 'lit';

/** \`data-prop-<flag>="true"\` is true; absent or "false" is false. Reflects as "true", or no attribute. */
const flag = {
  fromAttribute: (value) => value !== null && value !== 'false',
  toAttribute: (value) => (value ? 'true' : null),
};

/**
 * ${doc(def as Prop) || 'The Prism3 button.'}
 *
 * Renders \`@prism3/css\`'s button markup in the light DOM: a native \`<button class="p3-button">\`, or an \`<a href>\`,
 * styled only by \`@prism3/css/button.css\`. Each prop of the def is a property of the same name, reflected to
 * \`data-prop-<name>\`. While pending or inactive a click is suppressed and focus is kept.
 *
 * @tag ${TAG}
 * @slot leadingVisual - A child with \`slot="leadingVisual"\`, moved into the leading-visual span when the element connects.
 * @slot trailingVisual - A child with \`slot="trailingVisual"\`, moved into the trailing-visual span when the element connects.
 */
export class P3Button extends LitElement {
  static properties = {
${props.map(declaration).join('\n')}
  };

  constructor() {
    super();
${props.map(initializer).join('\n')}
    this.addEventListener('click', this.#suppress, { capture: true });
    this.addEventListener('click', this.#call);
  }

  /** Light DOM: the CSS is the single source of truth, so the markup sits where \`button.css\` reaches it. */
  createRenderRoot() {
    return this;
  }

  /** Before the first render, children written in the page become props: \`slot="leadingVisual"\` / \`slot="trailingVisual"\` the visuals, and the text the label, unless the label is set. */
  connectedCallback() {
    if (!this.#adopted) {
      this.#adopted = true;
      for (const child of [...this.children]) {
        const slot = child.getAttribute('slot');
        if (slot === 'leadingVisual' && this.leadingVisual === undefined) this.leadingVisual = child;
        if (slot === 'trailingVisual' && this.trailingVisual === undefined) this.trailingVisual = child;
        if (slot === 'leadingVisual' || slot === 'trailingVisual') child.removeAttribute('slot');
      }
      if (this.label === undefined) {
        const text = [...this.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join('').trim();
        if (text) this.label = text;
      }
      this.replaceChildren();
    }
    super.connectedCallback();
  }

  #adopted = false;

  /** isPending and isInactive keep focus but suppress the action: no listener runs, no form submits, no link navigates. */
  #suppress = (event) => {
    if (this.isPending || this.isInactive) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  #call = (event) => {
    if (typeof this.onClick === 'function') this.onClick(event);
  };

  render() {
    const busy = this.isPending ? 'true' : nothing;
    const inert = this.isPending || this.isInactive ? 'true' : nothing;
    const content = html\`\${this.leadingVisual !== undefined && this.leadingVisual !== null
      ? html\`<span class="p3-button__leading-visual" aria-hidden="true">\${this.leadingVisual}</span>\`
      : nothing}\${this.isPending
      ? html\`<span class="p3-button__spinner" aria-hidden="true">${SPINNER}</span>\`
      : nothing}<span class="p3-button__label">\${this.label}</span>\${this.trailingVisual !== undefined && this.trailingVisual !== null
      ? html\`<span class="p3-button__trailing-visual" aria-hidden="true">\${this.trailingVisual}</span>\`
      : nothing}\`;
    if (this.href !== undefined && this.href !== null) {
      return html\`<a class="p3-button" data-component="${COMPONENT}" href=\${this.href}
${styled.map((p) => `        ${attr(p.name)}=\${this.${field(p.name)}}`).join('\n')}
        data-prop-fullwidth=\${this.fullWidth ? 'true' : nothing}
        aria-busy=\${busy} aria-disabled=\${inert} aria-label=\${this.ariaLabel ?? nothing}>\${content}</a>\`;
    }
    return html\`<button class="p3-button" data-component="${COMPONENT}" type=\${this.type} ?disabled=\${this.disabled}
${styled.map((p) => `        ${attr(p.name)}=\${this.${field(p.name)}}`).join('\n')}
        data-prop-fullwidth=\${this.fullWidth ? 'true' : nothing}
        aria-busy=\${busy} aria-disabled=\${inert} aria-label=\${this.ariaLabel ?? nothing}>\${content}</button>\`;
  }
}

if (!customElements.get('${TAG}')) customElements.define('${TAG}', P3Button);
`;

/** Every element this package generates: the button, then the fields. */
export const outputs = (): [string, string][] => [
  [ELEMENT_FILE, source()],
  ...FIELD_IDS.map((id): [string, string] => [resolve(HERE, `p3-${id}.js`), fieldSource(id)]),
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = outputs();
  const names = out.map(([f]) => f.slice(HERE.length + 1)).join(', ');
  if (process.argv.includes('--check')) {
    const stale = out.filter(([f, text]) => { try { return readFileSync(f, 'utf8') !== text; } catch { return true; } });
    for (const [f] of stale) console.error(`FAIL generated: ${f.slice(HERE.length + 1)} is not what generate.ts writes from the emission. Run: npx tsx packages/web-components/generate.ts`);
    if (stale.length) process.exit(1);
    console.log(`OK generated: ${names} match their defs (${COMPONENT}: ${props.length} props)`);
  } else {
    for (const [f, text] of out) writeFileSync(f, text);
    console.log(`wrote ${names}`);
  }
}
