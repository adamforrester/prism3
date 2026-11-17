/**
 * The text field and password field sections of `demo.html` (#3408 S3): every size × status × state, on the light and
 * dark themes. Called by `demo.ts`, so `generate.ts --check` also fails a stale demo.
 *
 * The markup follows the contract in this package's README. Hover and focus are live; `check-browser-fields.ts` drives
 * them. The password field's Show/Hide button needs `password-field.js` (Q86 A); without it the button stays hidden and
 * the field is a plain password input.
 */
const svg = (d: string) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
// Remix Icon (https://remixicon.com), licensed under the Remix Icon License v1.0, copied from packages/engine/icons/
// (see its NOTICE.md): search-line, information-line, and the three status glyphs field-message nests
// (warning-triangle = alert-line, error-circle = error-warning-line, check-circle = checkbox-circle-line).
export const ICON = {
  leading: svg('M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z'),
  trailing: svg('M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z'),
  error: svg('M12.865 3.00017L22.3912 19.5002C22.6674 19.9785 22.5035 20.5901 22.0252 20.8662C21.8732 20.954 21.7008 21.0002 21.5252 21.0002H2.47266C1.92037 21.0002 1.47266 20.5525 1.47266 20.0002C1.47266 19.8246 1.51886 19.6522 1.60663 19.5002L11.1329 3.00017C11.4091 2.52187 12.0206 2.358 12.4989 2.63414C12.651 2.72191 12.7772 2.84815 12.865 3.00017ZM4.20471 19.0002H19.7932L11.9989 5.50017L4.20471 19.0002ZM10.9989 16.0002H12.9989V18.0002H10.9989V16.0002ZM10.9989 9.00017H12.9989V14.0002H10.9989V9.00017Z'),
  warning: svg('M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z'),
  success: svg('M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11.0026 16L6.75999 11.7574L8.17421 10.3431L11.0026 13.1716L16.6595 7.51472L18.0737 8.92893L11.0026 16Z'),
};
/** The spinner drawing, as the spinner def's codeOnly `visual-treatment` entry states it (the button demo's). */
const SPINNER = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-opacity="0.2"/>'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="20.73 62.83" transform="rotate(-90 12 12)"/>'
  + '</svg>';

type Kind = 'text-field' | 'password-field';
export type FieldOpts = {
  kind: Kind; id: string; demo: string; size: string; status: string; state: string;
  icons: boolean; message: boolean; required?: boolean; emphasis?: string; weight?: string;
};
const STATES = ['rest', 'filled', 'disabled', 'read-only', 'pending'];
export const COPY: Record<Kind, { label: string; placeholder: string; value: string; message: Record<string, string> }> = {
  'text-field': {
    label: 'Email address', placeholder: 'name@example.com', value: 'ada@example.com',
    message: {
      default: 'We send the receipt to this address.',
      error: 'Enter an email address, such as name@example.com.',
      warning: 'Check this address. It looks like it has a typo.',
      success: 'This address can receive receipts.',
    },
  },
  'password-field': {
    label: 'Password', placeholder: '', value: 'correct horse battery',
    message: {
      default: 'Use at least 12 characters.',
      error: 'Enter a password with at least 12 characters.',
      warning: 'This password is common. Add a few more words.',
      success: 'This password is strong.',
    },
  },
};

export const fieldHtml = (o: FieldOpts): string => {
  const c = COPY[o.kind];
  const P = `p3-${o.kind}`;
  const msgId = `${o.id}-message`;
  const filled = o.state !== 'rest' && o.state !== 'disabled';
  const input = [
    `<input class="${P}__entry" id="${o.id}"`,
    o.kind === 'password-field' ? ' type="password" autocomplete="current-password" spellcheck="false" autocapitalize="none"' : ' type="email" autocomplete="email"',
    ` name="${o.kind === 'password-field' ? 'password' : 'email'}"`,
    c.placeholder ? ` placeholder="${c.placeholder}"` : '',
    filled ? ` value="${c.value}"` : '',
    o.message ? ` aria-describedby="${msgId}"` : '',
    o.status === 'error' ? ' aria-invalid="true"' : '',
    o.required ? ' required' : '',
    o.state === 'disabled' ? ' disabled' : '',
    o.state === 'read-only' ? ' readonly' : '',
    o.state === 'pending' ? ' aria-busy="true"' : '',
    '>',
  ].join('');
  const labelAttrs = [
    `class="p3-field-label" data-component="field-label" for="${o.id}"`,
    o.emphasis ? ` data-prop-emphasis="${o.emphasis}"` : '',
    o.weight ? ` data-prop-weight="${o.weight}"` : '',
  ].join('');
  const label = `<label ${labelAttrs}><span class="p3-field-label__label">${c.label}</span><span class="p3-field-label__indicator" aria-hidden="true">*</span></label>`;
  const toggle = `<button type="button" class="p3-button p3-password-field__toggle" data-component="button" data-prop-appearance="text" data-prop-size="small" data-prop-inset="flush" aria-controls="${o.id}" hidden${o.state === 'disabled' ? ' disabled' : ''}>`
    + '<span class="p3-button__label"><span class="p3-password-field__toggle-text">Show</span><span class="p3-password-field__toggle-suffix"> password</span></span></button>';
  const top = o.kind === 'password-field'
    ? `<div class="${P}__label-row"><div class="${P}__label-cell">${label}</div>${toggle}</div>`
    : label;
  const control = `<div class="${P}__control">`
    + `<div class="${P}__content">${o.icons ? `<span class="${P}__leading-visual" aria-hidden="true">${ICON.leading}</span>` : ''}${input}</div>`
    + `<span class="${P}__spinner" aria-hidden="true">${SPINNER}</span>`
    + (o.icons && o.kind === 'text-field' ? `<span class="${P}__trailing-visual" aria-hidden="true">${ICON.trailing}</span>` : '')
    + '</div>';
  const message = o.message
    ? `<p class="p3-field-message" data-component="field-message" id="${msgId}">`
      + `<span class="p3-field-message__glyph-cell" aria-hidden="true"><span class="p3-field-message__error-glyph">${ICON.error}</span><span class="p3-field-message__warning-glyph">${ICON.warning}</span><span class="p3-field-message__success-glyph">${ICON.success}</span></span>`
      + `<span class="p3-field-message__caption-cell"><span class="p3-field-message__label">${c.message[o.status]}</span></span></p>`
    : '';
  const attrs = [`class="${P}"`, `data-component="${o.kind}"`, `data-prop-size="${o.size}"`, `data-prop-validation="${o.status}"`, `data-demo="${o.demo}"`];
  return `<div ${attrs.join(' ')}>${top}${control}${message}</div>`;
};

const grid = (theme: string, kind: Kind, sizes: string[], statuses: string[]): string => {
  const rows: string[] = [];
  for (const size of sizes) for (const status of statuses) {
    const cells = [...STATES, 'icons'].map((state) => fieldHtml({
      kind, size, status, state: state === 'icons' ? 'rest' : state, icons: state === 'icons', message: true,
      id: `${theme}-${kind}-${size}-${status}-${state}`, demo: `${theme}/${kind}/${size}/${status}/${state}`,
    }));
    rows.push(`<tr><th scope="row">${status}, ${size}</th>${cells.map((x) => `<td>${x}</td>`).join('')}</tr>`);
  }
  return `<table class="demo-grid demo-fields"><thead><tr><th scope="col">${kind === 'text-field' ? 'Text field' : 'Password field'}</th>${[...STATES, 'icons'].map((s) => `<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
};

/** One theme's field sections. `sizes` and `statuses` come from `specs.json`, through `generate.ts`. */
export const fieldSections = (theme: string, sizes: string[], statuses: string[]): string => {
  const extra = (kind: Kind) => [
    fieldHtml({ kind, size: 'medium', status: 'default', state: 'rest', icons: false, message: false, id: `${theme}-${kind}-plain`, demo: `${theme}/${kind}/plain` }),
    fieldHtml({ kind, size: 'medium', status: 'default', state: 'rest', icons: false, message: true, required: true, id: `${theme}-${kind}-required`, demo: `${theme}/${kind}/required` }),
    fieldHtml({ kind, size: 'medium', status: 'default', state: 'rest', icons: false, message: false, emphasis: 'secondary', weight: 'bold', id: `${theme}-${kind}-label-props`, demo: `${theme}/${kind}/label-props` }),
  ].map((x) => `<div class="demo-cell">${x}</div>`).join('');
  return `
<h3>Text field</h3>
<p>Hover or focus a field to see its live states. The defaults, then required, then a secondary, bold label:</p>
<div class="demo-row"><form class="demo-form" data-demo="${theme}/text-field/form">${extra('text-field')}</form></div>
${grid(theme, 'text-field', sizes, statuses)}
<h3>Password field</h3>
<p>Show and Hide switch the characters; the button stays hidden until password-field.js runs.</p>
<div class="demo-row"><form class="demo-form" data-demo="${theme}/password-field/form" action="#top">${extra('password-field')}<button type="submit" class="p3-button" data-component="button" data-prop-size="small" data-demo="${theme}/password-field/submit"><span class="p3-button__label">Sign in</span></button></form></div>
${grid(theme, 'password-field', sizes, statuses)}`;
};
