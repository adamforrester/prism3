/**
 * What the text field and password field stories share (#3408 S5): the cases, both forms' renderers, and the art.
 *
 * Each case is the def's props by their element names (`<p3-text-field>`'s properties), the forced pseudo-class for
 * a pseudo state, and whether the story presses Show. The HTML form writes `@prism3/css`'s README markup from the
 * same props, so both forms draw one case from one row. The copy is `@prism3/css`'s demo copy (`demo-fields.ts`).
 */

const svg = (d) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
// Remix Icon (https://remixicon.com), licensed under the Remix Icon License v1.0, as copied in @prism3/css's
// demo-fields.ts from packages/engine/icons/ (see its NOTICE.md): search-line, information-line, and the three status
// glyphs field-message nests. The element writes the status glyphs itself; the HTML form must write them.
export const ICON = {
  leading: svg('M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z'),
  trailing: svg('M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z'),
  error: svg('M12.865 3.00017L22.3912 19.5002C22.6674 19.9785 22.5035 20.5901 22.0252 20.8662C21.8732 20.954 21.7008 21.0002 21.5252 21.0002H2.47266C1.92037 21.0002 1.47266 20.5525 1.47266 20.0002C1.47266 19.8246 1.51886 19.6522 1.60663 19.5002L11.1329 3.00017C11.4091 2.52187 12.0206 2.358 12.4989 2.63414C12.651 2.72191 12.7772 2.84815 12.865 3.00017ZM4.20471 19.0002H19.7932L11.9989 5.50017L4.20471 19.0002ZM10.9989 16.0002H12.9989V18.0002H10.9989V16.0002ZM10.9989 9.00017H12.9989V14.0002H10.9989V9.00017Z'),
  warning: svg('M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z'),
  success: svg('M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11.0026 16L6.75999 11.7574L8.17421 10.3431L11.0026 13.1716L16.6595 7.51472L18.0737 8.92893L11.0026 16Z'),
};
const SPINNER = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-opacity="0.2"></circle>'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="20.73 62.83" transform="rotate(-90 12 12)"></circle>'
  + '</svg>';

/** `@prism3/css`'s demo copy, per field. */
const COPY = {
  'text-field': {
    label: 'Email address', placeholder: 'name@example.com', value: 'ada@example.com', base: { type: 'email', autoComplete: 'email', name: 'email' },
    message: {
      default: 'We send the receipt to this address.',
      error: 'Enter an email address, such as name@example.com.',
      warning: 'Check this address. It looks like it has a typo.',
      success: 'This address can receive receipts.',
    },
  },
  'password-field': {
    label: 'Password', placeholder: undefined, value: 'correct horse battery', base: { autoComplete: 'current-password', name: 'password' },
    message: {
      default: 'Use at least 12 characters.',
      error: 'Enter a password with at least 12 characters.',
      warning: 'This password is common. Add a few more words.',
      success: 'This password is strong.',
    },
  },
};

/**
 * The cases, shared by both fields and both forms. One per def state (rest, filled, hover, focus-visible, each
 * validation status, disabled, read-only, pending, required), each size, and the visuals; and each KPI 2 state again
 * with the message off (`<State>NoMessage`), which Figma's geometry record compares with. The password field adds
 * `Shown`, which presses Show.
 */
export const casesFor = (kind) => {
  const c = COPY[kind];
  const help = { showMessage: true, helpText: c.message.default };
  const status = (s) => ({ ...help, validation: s, validationMessage: c.message[s], defaultValue: c.value });
  const cases = {
    Rest: { props: { ...help } },
    Filled: { props: { ...help, defaultValue: c.value } },
    Hover: { props: { ...help }, pseudo: { hover: true } },
    FocusVisible: { props: { ...help }, pseudo: { focusVisible: true } },
    Error: { props: status('error') },
    Warning: { props: status('warning') },
    Success: { props: status('success') },
    Disabled: { props: { ...help, disabled: true } },
    ReadOnly: { props: { ...help, readOnly: true, defaultValue: c.value } },
    Pending: { props: { ...help, isPending: true, defaultValue: c.value } },
    Required: { props: { ...help, required: true } },
    Small: { props: { ...help, size: 'small' } },
    Medium: { props: { ...help, size: 'medium' } },
    Large: { props: { ...help, size: 'large' } },
    WithIcons: { props: { ...help }, leading: true, trailing: kind === 'text-field' },
    // Each KPI 2 state with the message off, as Figma's members are built (its `message` property defaults to false):
    // #4432's decision 3 A. At error the message is written anyway (Q-POC2 A), so ErrorNoMessage still draws one.
    RestNoMessage: { props: {} },
    HoverNoMessage: { props: {}, pseudo: { hover: true } },
    FocusVisibleNoMessage: { props: {}, pseudo: { focusVisible: true } },
    DisabledNoMessage: { props: { disabled: true } },
    ErrorNoMessage: { props: { ...status('error'), showMessage: false, helpText: undefined } },
  };
  if (kind === 'password-field') {
    cases.Shown = { props: { ...help, defaultValue: c.value }, press: true };
    cases.ShownError = { props: status('error'), press: true };
  }
  for (const k of Object.keys(cases)) cases[k].props = { ...c.base, label: c.label, ...(c.placeholder ? { placeholder: c.placeholder } : {}), ...cases[k].props };
  return cases;
};

const nodeOf = (markup) => { const t = document.createElement('template'); t.innerHTML = markup; return t.content.firstElementChild; };

/** The element form: a `<p3-text-field>` or `<p3-password-field>` with each prop set as a property, the API a client uses. */
export const element = (kind, c, id) => {
  const el = document.createElement(`p3-${kind}`);
  for (const [k, v] of Object.entries(c.props)) el[k] = v;
  el.id = id;
  if (c.leading) el.leadingIcon = nodeOf(ICON.leading);
  if (c.trailing) el.trailingIcon = nodeOf(ICON.trailing);
  return el;
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The HTML form: `@prism3/css`'s README markup contract for the field, written from the same props. */
export const markup = (kind, c, id) => {
  const p = c.props;
  const P = `p3-${kind}`;
  const status = p.validation ?? 'default';
  const msgId = `${id}-message`;
  // Q-POC2 A (#1712 A): at a validation status the message is written and named whatever showMessage says.
  const withMessage = p.showMessage || status !== 'default';
  const attr = (name, v) => (v === undefined || v === null || v === false ? '' : v === true ? ` ${name}` : ` ${name}="${esc(v)}"`);
  const input = `<input class="${P}__entry"${attr('id', id)}${attr('type', kind === 'password-field' ? 'password' : p.type)}`
    + `${attr('name', p.name)}${attr('autocomplete', p.autoComplete)}${kind === 'password-field' ? ' spellcheck="false" autocapitalize="none"' : ''}`
    + `${attr('placeholder', p.placeholder)}${attr('value', p.defaultValue)}`
    + `${attr('aria-describedby', withMessage ? msgId : undefined)}${attr('aria-invalid', status === 'error' ? 'true' : undefined)}`
    + `${attr('required', p.required)}${attr('disabled', p.disabled)}${attr('readonly', p.readOnly)}${attr('aria-busy', p.isPending ? 'true' : undefined)}>`;
  const label = `<label class="p3-field-label" data-component="field-label" for="${id}"><span class="p3-field-label__label">${esc(p.label)}</span><span class="p3-field-label__indicator" aria-hidden="true">*</span></label>`;
  const toggle = `<button type="button" class="p3-button p3-password-field__toggle" data-component="button" data-prop-appearance="text" data-prop-size="small" data-prop-inset="flush" aria-controls="${id}" hidden${p.disabled ? ' disabled' : ''}>`
    + '<span class="p3-button__label"><span class="p3-password-field__toggle-text">Show</span><span class="p3-password-field__toggle-suffix"> password</span></span></button>';
  const top = kind === 'password-field' ? `<div class="${P}__label-row"><div class="${P}__label-cell">${label}</div>${toggle}</div>` : label;
  const control = `<div class="${P}__control"><div class="${P}__content">`
    + (c.leading ? `<span class="${P}__leading-visual" aria-hidden="true">${ICON.leading}</span>` : '')
    + `${input}</div><span class="${P}__spinner" aria-hidden="true">${SPINNER}</span>`
    + (c.trailing ? `<span class="${P}__trailing-visual" aria-hidden="true">${ICON.trailing}</span>` : '')
    + '</div>';
  const text = status === 'default' ? p.helpText : (p.validationMessage ?? p.helpText);
  const message = withMessage
    ? `<p class="p3-field-message" data-component="field-message" id="${msgId}"><span class="p3-field-message__glyph-cell" aria-hidden="true">`
      + `<span class="p3-field-message__error-glyph">${ICON.error}</span><span class="p3-field-message__warning-glyph">${ICON.warning}</span><span class="p3-field-message__success-glyph">${ICON.success}</span></span>`
      + `<span class="p3-field-message__caption-cell"><span class="p3-field-message__label">${esc(text ?? '')}</span></span></p>`
    : '';
  return `<div class="${P}" data-component="${kind}" data-prop-size="${p.size ?? 'medium'}" data-prop-validation="${status}">${top}${control}${message}</div>`;
};

/** A story id's input id: unique per story, so the label's `for` and `aria-describedby` resolve inside the frame. */
const idFor = (kind, name) => `${kind}-${name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/^-/, '')}`;

/** A case's story parameters: the forced pseudo-class. */
const parameters = (c) => (c.pseudo ? { pseudo: c.pseudo } : {});

/**
 * The HTML form's markup, as nodes. Storybook mounts a story after `password-field.js`'s load-time pass, so the
 * password field calls the script's `enhance` once the markup is in the page, as a page that adds fields after load
 * does; until then its Show/Hide button stays hidden.
 */
const htmlNodes = (kind, c, id) => {
  const t = document.createElement('template');
  t.innerHTML = markup(kind, c, id);
  if (kind === 'password-field') requestAnimationFrame(() => window.p3PasswordField?.enhance());
  return t.content;
};

/** Presses Show, the way a person does, for a case that asks for it. */
const play = (c) => async ({ canvasElement }) => {
  const host = canvasElement.querySelector('p3-password-field');
  if (host) await host.updateComplete;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  canvasElement.querySelector('.p3-password-field__toggle').click();
};

/** One story per case, in either form. */
export const storiesFor = (kind, form) => {
  const cases = casesFor(kind);
  const out = {};
  for (const [name, c] of Object.entries(cases)) {
    const id = idFor(kind, name);
    out[name] = {
      name,
      render: form === 'element' ? () => element(kind, c, id) : () => htmlNodes(kind, c, id),
      parameters: parameters(c),
      ...(c.press ? { play: play(c) } : {}),
    };
  }
  return out;
};
