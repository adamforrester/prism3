/**
 * Writes `demo.html`: every appearance, size and static state of the button, on the light and dark themes and on
 * an inverse band (#3408 S2). Called by `generate.ts`, whose `--check` also fails a stale demo.
 *
 * The markup follows the contract in this package's README. Hover, pressed and focus-visible are live states (a
 * pointer or the keyboard triggers them); `check-browser.ts` forces them. No behavior script (Q86 A, S2): a pending
 * button is written pending, as the S4 script will leave it.
 */
const ICON = {
  // Remix Icon (https://remixicon.com), licensed under the Remix Icon License v1.0: add-line, arrow-right-line,
  // copied from packages/engine/icons/ (see its NOTICE.md).
  leading: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z"/></svg>',
  trailing: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"/></svg>',
};
/** The spinner drawing, as the spinner def's codeOnly `visual-treatment` entry states it: track and a 33% arc at r=10. */
const SPINNER = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-opacity="0.2"/>'
  + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="20.73 62.83" transform="rotate(-90 12 12)"/>'
  + '</svg>';

type Opts = { appearance: string; size: string; surface: string; inset: string; state: string; leading: boolean; trailing: boolean; label: string; id: string };
const STATES = ['rest', 'pending', 'disabled', 'inactive'];

const buttonHtml = (o: Opts): string => {
  const attrs = [
    'type="button"',
    'class="p3-button"',
    'data-component="button"',
    `data-prop-appearance="${o.appearance}"`,
    `data-prop-size="${o.size}"`,
    `data-prop-surface="${o.surface}"`,
    `data-prop-inset="${o.inset}"`,
    `data-demo="${o.id}"`,
  ];
  if (o.state === 'pending') attrs.push('aria-busy="true"', 'aria-disabled="true"');
  if (o.state === 'inactive') attrs.push('aria-disabled="true"');
  if (o.state === 'disabled') attrs.push('disabled');
  const kids = [
    o.leading ? `<span class="p3-button__leading-visual" aria-hidden="true">${ICON.leading}</span>` : '',
    `<span class="p3-button__spinner" aria-hidden="true">${SPINNER}</span>`,
    `<span class="p3-button__label">${o.label}</span>`,
    o.trailing ? `<span class="p3-button__trailing-visual" aria-hidden="true">${ICON.trailing}</span>` : '',
  ].filter(Boolean).join('');
  return `<button ${attrs.join(' ')}>${kids}</button>`;
};

const LABEL: Record<string, string> = { rest: 'Save changes', pending: 'Saving', disabled: 'Save changes', inactive: 'Save changes' };

const block = (theme: string, surface: string, appearances: [string, string][], sizes: string[]): string => {
  const rows: string[] = [];
  for (const [appearance, inset] of appearances) {
    for (const size of sizes) {
      const cells = STATES.map((state) => buttonHtml({
        appearance, size, surface, inset, state, leading: false, trailing: false, label: LABEL[state],
        id: `${theme}/${surface}/${appearance}/${inset}/${size}/${state}`,
      }));
      cells.push(buttonHtml({
        appearance, size, surface, inset, state: 'rest', leading: true, trailing: true, label: 'Add item',
        id: `${theme}/${surface}/${appearance}/${inset}/${size}/icons`,
      }));
      cells.push(buttonHtml({
        appearance, size, surface, inset, state: 'pending', leading: true, trailing: true, label: 'Adding',
        id: `${theme}/${surface}/${appearance}/${inset}/${size}/icons-pending`,
      }));
      rows.push(`<tr><th scope="row">${appearance}${inset === 'flush' ? ', flush' : ''}, ${size}</th>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`);
    }
  }
  return `<table class="demo-grid"><thead><tr><th scope="col">Button</th>${[...STATES, 'icons', 'icons, pending'].map((s) => `<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
};

export const demoHtml = (sizes: string[]): string => {
  const all: [string, string][] = [['filled', 'default'], ['outline', 'default'], ['text', 'default'], ['text', 'flush']];
  const section = (theme: string, title: string) => `
<section class="demo-theme"${theme === 'light' ? '' : ` data-theme="${theme}"`} aria-labelledby="h-${theme}">
<h2 id="h-${theme}">${title}</h2>
<p>Hover, press or tab to a button to see its live states.</p>
${block(theme, 'default', all, sizes)}
<div class="demo-inverse">
<h3>On an inverse band (surface=inverse)</h3>
${block(theme, 'inverse', all.filter(([, i]) => i === 'default'), ['medium'])}
</div>
<h3>With an href</h3>
<p><a class="p3-button" data-component="button" data-prop-appearance="filled" data-demo="${theme}/link" href="#top"><span class="p3-button__label">Continue to checkout</span></a></p>
</section>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@prism3/css button</title>
<!-- GENERATED by packages/css/generate.ts — do not edit. The token CSS is @prism3/tokens' build: npm run -w @prism3/tokens build -->
<link rel="stylesheet" href="../tokens/dist/prism3.css">
<link rel="stylesheet" href="button.css">
<style>
  body { margin: 0; background: var(--pds3-color-background-primary); color: var(--pds3-color-text-primary); font: var(--pds3-type-body-md-default); }
  h1 { font: var(--pds3-type-title-md-strong); margin: 0; padding: var(--pds3-space-400) var(--pds3-space-400) 0; }
  h2 { font: var(--pds3-type-title-sm-strong); margin: 0; }
  h3 { font: var(--pds3-type-label-md-emphasis); margin: var(--pds3-space-300) 0 var(--pds3-space-100); }
  .demo-theme { background: var(--pds3-color-background-primary); color: var(--pds3-color-text-primary); padding: var(--pds3-space-400); }
  .demo-inverse { background: var(--pds3-color-inverse-background-primary); color: var(--pds3-color-inverse-text-primary); padding: var(--pds3-space-200); border-radius: var(--pds3-radius-md); }
  .demo-grid { border-collapse: separate; border-spacing: var(--pds3-space-200); inline-size: max-content; }
  .demo-theme, .demo-inverse { inline-size: max-content; }
  .demo-grid th { font: var(--pds3-type-label-sm-default); text-align: start; }
</style>
</head>
<body>
<h1 id="top">Button</h1>
${section('light', 'Light')}
${section('dark', 'Dark')}
</body>
</html>
`;
};
