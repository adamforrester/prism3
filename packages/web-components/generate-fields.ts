/**
 * THE FIELD ELEMENT GENERATOR (#3408 S4 for the fields; owner decisions Q95 B, Q96 A, Q97 A): writes
 * `p3-text-field.js` and `p3-password-field.js` from the engine's emission. `generate.ts` calls it and writes the files,
 * so `check:generated` covers all three elements.
 *
 * WHAT IT READS, and why each source:
 *   - `component-defs.json` — each def's code API: every prop's name, type, values and default. Each prop becomes one
 *     Lit reactive property of the def's name, reflected to `data-prop-<name>` as `<p3-button>`'s are (S4 owner
 *     decision 1). A def prop of a type this file has no rule for, or a non-style prop with no row in `MARKUP`, fails
 *     generation by name.
 *   - `specs.json` — the nested parts: the Show/Hide button's variant (`nesting`), and which status shows which message
 *     glyph (`field-message`'s anatomy `when`).
 *   - `@prism3/css`'s `demo-fields.ts` — the glyph and spinner art, so both delivery forms draw the same marks.
 *
 * WHAT IT DOES NOT DECIDE. The markup is `@prism3/css`'s fields contract (that package's README): a native `<label for>`
 * and `<input>` in one tree with the message, so `for` and `aria-describedby` need no scripting. `check-parity-fields.ts`
 * holds its own copy of the prop → markup mapping, written apart (`docs/34`).
 */
import { readUncommitted } from '../css/emission';
import { ICON } from '../css/demo-fields';

type Prop = { name: string; type: string; values?: string[]; default?: unknown; required?: boolean; description?: string };
type Id = 'text-field' | 'password-field';
const defs = readUncommitted('component-defs.json').components;
const specs = readUncommitted('specs.json').components;

const attr = (name: string) => `data-prop-${name.toLowerCase()}`;
const js = (v: unknown) => JSON.stringify(v);
const pascal = (id: string) => id.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());

type Kind = 'enum' | 'flag' | 'text' | 'function' | 'slot';
const kindOf = (id: string, p: Prop): Kind => {
  if (p.type.startsWith('enum:')) return 'enum';
  if (p.type === 'boolean') return 'flag';
  if (p.type.startsWith('string')) return 'text';
  if (p.type === 'function') return 'function';
  if (p.type === 'slot') return 'slot';
  throw new Error(`${id}.${p.name}: no rule for a prop of type "${p.type}"`);
};

/** How each prop reaches the markup (`@prism3/css` README, "The fields' markup contract"). Style hooks need no row. */
const STYLE_HOOKS = ['size', 'validation'];
const MARKUP: Record<string, string> = {
  label: 'the text of the nested <label class="p3-field-label" for>',
  value: 'the input\'s live value: a property only, never an attribute, so a typed value is never written into the DOM',
  defaultValue: 'the input\'s value attribute',
  onChange: 'called with each input event on the input',
  type: 'the input\'s type',
  placeholder: 'the input\'s placeholder',
  helpText: 'the message\'s text at the default status',
  validationMessage: 'the message\'s text at a validation status (the help text when unset)',
  showMessage: 'writes the <p class="p3-field-message"> and names its id in the input\'s aria-describedby; at error, warning or success the message is written whatever this says (Q-POC2 A, #1712 A)',
  required: 'the input\'s required; the label\'s marker follows it',
  disabled: 'the input\'s disabled (and the Show/Hide button\'s)',
  readOnly: 'the input\'s readonly',
  autoComplete: 'the input\'s autocomplete',
  inputMode: 'the input\'s inputmode',
  prefix: 'not rendered: the def\'s anatomy has no part for a text affix (#1699)',
  suffix: 'not rendered, as prefix (#1699)',
  clearable: 'not rendered: the def\'s anatomy has no Clear button part',
  leadingIcon: 'the leading-visual span, before the input',
  trailingIcon: 'the trailing-visual span, after the content cell',
  isPending: 'aria-busy="true" on the input; the spinner takes the trailing cell',
  id: 'the input\'s id, named by the label\'s for (and the Show/Hide button\'s aria-controls); generated when unset',
  name: 'the input\'s name',
};

/** The spinner drawing, as the spinner def's codeOnly `visual-treatment` entry states it (`<p3-button>`'s). */
const SPINNER = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-opacity="0.2"></circle>'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="20.73 62.83" transform="rotate(-90 12 12)"></circle>'
  + '</svg>';
/** Lit templates are parsed as HTML, where a self-closed `<path/>` is fine in SVG; written open-and-closed for symmetry. */
const art = (svg: string) => svg.replace(/<path([^>]*)\/>/g, '<path$1></path>');

export const fieldSource = (id: Id): string => {
  const def = defs[id]?.def;
  const spec = specs[id];
  if (!def || !spec) throw new Error(`no "${id}" in the emission`);
  const props: Prop[] = def.props;
  for (const p of props) {
    const k = kindOf(id, p);
    if (!(k === 'enum' && STYLE_HOOKS.includes(p.name)) && !MARKUP[p.name]) throw new Error(`${id}.${p.name}: a ${k} prop with no markup mapping in generate-fields.ts`);
  }
  const has = (n: string) => props.some((p) => p.name === n);
  for (const n of ['label', 'value', 'defaultValue', 'onChange', 'helpText', 'validationMessage', 'showMessage', 'validation', 'required', 'disabled', 'readOnly', 'autoComplete', 'leadingIcon', 'isPending', 'size', 'id', 'name'])
    if (!has(n)) throw new Error(`${id} has no prop "${n}", which the element's render needs`);

  const TAG = `p3-${id}`;
  const CLASS = `P3${pascal(id)}`;
  const P = `p3-${id}`;
  const password = id === 'password-field';
  // The nested Show/Hide button's variant, from the emission (password-field only).
  const toggle = spec.nesting.find((n: any) => n.component === 'button');
  if (password !== !!toggle) throw new Error(`${id}: ${toggle ? 'an unexpected' : 'no'} nested button in the emission`);
  const toggleAttrs = toggle ? ['appearance', 'size', 'inset'].map((k) => `${attr(k)}="${toggle.variant[k]}"`).join(' ') : '';
  // The message's glyphs, one per status the anatomy names, in its order.
  const glyphs = specs['field-message'].anatomy.filter((a: any) => a.when?.status && a.part.split('/').length === 3).map((a: any) => {
    const status = a.when.status;
    if (status.length !== 1 || !(ICON as Record<string, string>)[status[0]]) throw new Error(`field-message ${a.part}: no glyph art for ${status.join('/')}`);
    const cls = a.part.split('/').pop().replace(/[A-Z]/g, (c: string) => `-${c.toLowerCase()}`);
    return `<span class="p3-field-message__${cls}">${art((ICON as Record<string, string>)[status[0]])}</span>`;
  }).join('');
  const trailing = has('trailingIcon');

  const doc = (p: Prop) => (p.description ?? '').replace(/\*\//g, '*\\/').replace(/\s+/g, ' ').trim();
  const jsType = (p: Prop): string => {
    const k = kindOf(id, p);
    if (k === 'enum') return p.values!.map((x) => `'${x}'`).join(' | ');
    if (k === 'flag') return 'boolean';
    if (k === 'function') return '((event: InputEvent) => void) | undefined';
    if (k === 'slot') return 'Node | string | undefined';
    return 'string | undefined';
  };
  const declaration = (p: Prop): string => {
    const k = kindOf(id, p);
    if (k === 'function' || k === 'slot' || p.name === 'value') return `    ${p.name}: { attribute: false },`;
    if (k === 'flag') return `    ${p.name}: { attribute: ${js(attr(p.name))}, reflect: true, converter: flag },`;
    return `    ${p.name}: { type: String, attribute: ${js(attr(p.name))}, reflect: true },`;
  };
  const initializer = (p: Prop): string => `    /** ${doc(p)} @type {${jsType(p)}} */\n    this.${p.name} = ${p.default === undefined ? 'undefined' : js(p.default)};`;
  const reflected = props.filter((p) => !['function', 'slot'].includes(kindOf(id, p)) && p.name !== 'value');
  const adoptFlag = (name: string, expr: string) => `        if (${expr}) take(${js(name)}, true);`;

  return `// GENERATED by packages/web-components/generate.ts (generate-fields.ts) from the engine's ${id} def. Do not edit; regenerate.
import { LitElement, html, nothing } from 'lit';

/** \`data-prop-<flag>="true"\` is true; absent or "false" is false. Reflects as "true", or no attribute. */
const flag = {
  fromAttribute: (value) => value !== null && value !== 'false',
  toAttribute: (value) => (value ? 'true' : null),
};
/** Each reflected prop's attribute and default: a prop set on the host, by attribute or property, is never overwritten by adoption. */
const ATTR = ${js(Object.fromEntries(reflected.map((p) => [p.name, attr(p.name)])))};
const DEFAULT = ${js(Object.fromEntries(props.map((p) => [p.name, p.default ?? null])))};
let serial = 0;
${password ? `/** The def's wording (DRAFT, Q301.5), each settable per element with data-p3-show, -hide, -shown and -hidden, as @prism3/css's script reads it. */
const TEXT = { show: 'Show', hide: 'Hide', suffix: ' password', shown: 'Your password is shown', hidden: 'Your password is hidden' };
let region;
/** One polite live region per page: the page's own \`[data-p3-announcer]\`, else one this adds (the def: "the app's shared polite live region"). */
const announce = (message) => {
  region = region && region.isConnected ? region : document.querySelector('[data-p3-announcer]');
  if (!region) {
    region = document.createElement('div');
    region.className = 'p3-password-field__announcer';
    region.setAttribute('data-p3-announcer', '');
    region.setAttribute('role', 'status');
    document.body.append(region);
  }
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
};
` : ''}
/**
 * ${doc(def as Prop)}
 *
 * Renders \`@prism3/css\`'s ${id} markup in the light DOM: a native \`<label for>\` and \`<input>\` in one tree with the
 * message, styled only by \`@prism3/css\`. Each prop of the def is a property of the same name, reflected to
 * \`data-prop-<name>\`, except \`value\`, which is a property only.${password ? ' The Show/Hide button switches the input between masked and plain text, keeps the caret and focus, announces the change, and returns to masked when the form submits.' : ''}
 * Markup written inside the element before its script runs (the \`@prism3/css\` contract) is a working field on its own,
 * and is adopted on upgrade: its props, a typed value, and focus carry over.
 *
 * @tag ${TAG}
 * @slot leadingIcon - A child with \`slot="leadingIcon"\`, moved into the leading-visual span when the element connects.${trailing ? '\n * @slot trailingIcon - A child with `slot="trailingIcon"`, moved into the trailing-visual span when the element connects.' : ''}
 */
export class ${CLASS} extends LitElement {
  static properties = {
${props.map(declaration).join('\n')}
  };

  constructor() {
    super();
${props.map(initializer).join('\n')}
  }

  /** Light DOM: the CSS is the single source of truth, and the label, input and message share one tree. */
  createRenderRoot() {
    return this;
  }

  #adopted = false;
  #auto = \`${P}-\${++serial}\`;
  #refocus = null;
  #warnedStatus = null;
${password ? `  #shown = false;
` : ''}
  get #inputId() {
    return this.id || this.#auto;
  }

  get #input() {
    return this.querySelector('.${P}__entry');
  }

  #untouched(name) {
    return !(ATTR[name] && this.hasAttribute(ATTR[name])) && (this[name] ?? null) === DEFAULT[name];
  }

  /**
   * Before the first render: markup written in the page becomes props. A pre-rendered \`.${P}\` (the \`@prism3/css\`
   * contract, a working field before this script runs) gives its size, validation, label, input attributes, message
   * and glyphs, and a value typed into it before the upgrade; \`slot="leadingIcon"\`${trailing ? ' / `slot="trailingIcon"`' : ''} children give the visuals.
   * A prop already set on the host wins.
   */
  connectedCallback() {
    if (!this.#adopted) {
      this.#adopted = true;
      const take = (name, value) => { if (value !== null && value !== undefined && value !== '' && this.#untouched(name)) this[name] = value; };
      const root = this.querySelector(':scope > .${P}');
      if (root) {
        take('size', root.getAttribute('data-prop-size'));
        take('validation', root.getAttribute('data-prop-validation'));
        take('label', root.querySelector('.p3-field-label__label')?.textContent.trim());
        const input = root.querySelector('.${P}__entry');
        if (input) {
          take('id', input.id);
          take('name', input.getAttribute('name'));
          take('placeholder', input.getAttribute('placeholder'));
          take('defaultValue', input.getAttribute('value'));
          take('autoComplete', input.getAttribute('autocomplete'));
${password ? '' : `          if (input.getAttribute('type') !== 'password') take('type', input.getAttribute('type'));
          take('inputMode', input.getAttribute('inputmode'));
`}${adoptFlag('required', 'input.required')}
${adoptFlag('disabled', 'input.disabled')}
${adoptFlag('readOnly', 'input.readOnly')}
${adoptFlag('isPending', "input.getAttribute('aria-busy') === 'true'")}
          if (input.value !== (input.getAttribute('value') ?? '')) this.value = input.value;
          if (document.activeElement === input) this.#refocus = [input.selectionStart, input.selectionEnd];
        }
        const message = root.querySelector('.p3-field-message');
        if (message) {
          const atDefault = (root.getAttribute('data-prop-validation') ?? 'default') === 'default';
          // A message at a validation status is written whatever showMessage says (Q-POC2 A), so only one at the
          // default status shows the author chose to show it.
          if (atDefault) take('showMessage', true);
          const text = message.querySelector('.p3-field-message__label')?.textContent.trim();
          take(atDefault ? 'helpText' : 'validationMessage', text);
        }
        take('leadingIcon', root.querySelector('.${P}__leading-visual')?.firstElementChild);
${trailing ? `        take('trailingIcon', root.querySelector('.${P}__trailing-visual')?.firstElementChild);
` : ''}      }
      for (const child of [...this.children]) {
        const slot = child.getAttribute('slot');
        if (slot === 'leadingIcon'${trailing ? " || slot === 'trailingIcon'" : ''}) {
          child.removeAttribute('slot');
          take(slot, child);
        }
      }
      this.replaceChildren();
    }
    super.connectedCallback();
${password ? `    document.addEventListener('submit', this.#onSubmit, true);
` : ''}  }
${password ? `
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('submit', this.#onSubmit, true);
  }
` : ''}
  /**
   * \`value\` is the input's live value: set it and the input follows; type and it follows the input. After the first
   * render, focus and the caret of an adopted input that had focus are put back, once its value is in.
   */
  updated(changed) {
    const input = this.#input;
    if (input && changed.has('value') && this.value !== undefined && this.value !== null && input.value !== this.value) input.value = this.value;
    if (input && this.#refocus) {
      const [start, end] = this.#refocus;
      this.#refocus = null;
      input.focus();
      if (start !== null && end !== null) input.setSelectionRange(start, end);
    }
    // OWNER DECISION 1 B (#3968): a status with neither validationMessage nor helpText writes an empty message, so the
    // element warns the developer, once per status it enters, not on every render. DRAFT text.
    const status = this.validation ?? 'default';
    const text = status === 'default' ? this.helpText : (this.validationMessage ?? this.helpText);
    const empty = status !== 'default' && (text === undefined || text === null || text === '');
    if (empty && this.#warnedStatus !== status) console.warn(\`<${TAG}> has validation="\${status}" and no validationMessage or helpText, so its message is empty. Set validationMessage to say why the field is at this status.\`);
    this.#warnedStatus = empty ? status : null;
  }

  #onInput = (event) => {
    this.value = event.target.value;
    if (typeof this.onChange === 'function') this.onChange(event);
  };
${password ? `
  #say(key) {
    return this.getAttribute(\`data-p3-\${key}\`) || TEXT[key];
  }

  /**
   * Masked ↔ plain. The input's type is set at once and the caret put back; focus stays on the button. Chromium resets
   * the caret of an input that has had focus one task after its type changes while it is blurred (a click on this
   * button blurs it), so the caret is put back again after that task, but only while it sits at Chromium's reset 0,0:
   * a caret written since the press is kept (#3947), as the CSS package's script has done since #3945.
   */
  #toggle = () => {
    const input = this.#input;
    if (!input || this.disabled) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    this.#shown = !this.#shown;
    input.type = this.#shown ? 'text' : 'password';
    if (start !== null && end !== null) {
      input.setSelectionRange(start, end);
      setTimeout(() => {
        if (input.selectionStart === 0 && input.selectionEnd === 0) input.setSelectionRange(start, end);
      }, 0);
    }
    this.requestUpdate();
    announce(this.#say(this.#shown ? 'shown' : 'hidden'));
  };

  /** Back to masked when the form submits (Q301.7 A), at once, so a browser never stores the value as plain text. */
  #onSubmit = (event) => {
    if (!this.#shown || !(event.target instanceof HTMLFormElement) || !event.target.contains(this)) return;
    this.#shown = false;
    const input = this.#input;
    if (input) input.type = 'password';
    this.requestUpdate();
  };
` : ''}
  render() {
    const inputId = this.#inputId;
    const messageId = \`\${inputId}-message\`;
    const status = this.validation ?? 'default';
    const messageText = status === 'default' ? this.helpText : (this.validationMessage ?? this.helpText);
    // Q-POC2 A (#1712 A): at error, warning or success the message is always written and named in aria-describedby,
    // whatever showMessage says, so aria-invalid never stands without a description. showMessage governs the default.
    const writeMessage = this.showMessage || status !== 'default';
    const label = html\`<label class="p3-field-label" data-component="field-label" for=\${inputId}><span class="p3-field-label__label">\${this.label}</span><span class="p3-field-label__indicator" aria-hidden="true">*</span></label>\`;
    return html\`<div class="${P}" data-component="${id}" data-prop-size=\${this.size} data-prop-validation=\${this.validation}>${password
      ? `<div class="${P}__label-row"><div class="${P}__label-cell">\${label}</div><button type="button" class="p3-button ${P}__toggle" data-component="button" ${toggleAttrs} aria-controls=\${inputId} ?disabled=\${this.disabled} @click=\${this.#toggle}><span class="p3-button__label"><span class="${P}__toggle-text">\${this.#say(this.#shown ? 'hide' : 'show')}</span><span class="${P}__toggle-suffix">\${this.#say('suffix')}</span></span></button></div>`
      : '${label}'}<div class="${P}__control"><div class="${P}__content">\${this.leadingIcon !== undefined && this.leadingIcon !== null
      ? html\`<span class="${P}__leading-visual" aria-hidden="true">\${this.leadingIcon}</span>\`
      : nothing}<input class="${P}__entry" id=\${inputId} type=\${${password ? "this.#shown ? 'text' : 'password'" : 'this.type'}} name=\${this.name ?? nothing}
        placeholder=\${this.placeholder ?? nothing} value=\${this.defaultValue ?? nothing} autocomplete=\${this.autoComplete ?? nothing}${password ? ' spellcheck="false" autocapitalize="none"' : ' inputmode=${this.inputMode ?? nothing}'}
        ?required=\${this.required} ?disabled=\${this.disabled} ?readonly=\${this.readOnly}
        aria-busy=\${this.isPending ? 'true' : nothing} aria-invalid=\${status === 'error' ? 'true' : nothing}
        aria-describedby=\${writeMessage ? messageId : nothing} @input=\${this.#onInput}></div><span class="${P}__spinner" aria-hidden="true">${SPINNER}</span>${trailing ? `\${this.trailingIcon !== undefined && this.trailingIcon !== null
      ? html\`<span class="${P}__trailing-visual" aria-hidden="true">\${this.trailingIcon}</span>\`
      : nothing}` : ''}</div>\${writeMessage
      ? html\`<p class="p3-field-message" data-component="field-message" id=\${messageId}><span class="p3-field-message__glyph-cell" aria-hidden="true">${glyphs}</span><span class="p3-field-message__caption-cell"><span class="p3-field-message__label">\${messageText}</span></span></p>\`
      : nothing}</div>\`;
  }
}

if (!customElements.get('${TAG}')) customElements.define('${TAG}', ${CLASS});
`;
};

export const FIELD_IDS: Id[] = ['text-field', 'password-field'];
