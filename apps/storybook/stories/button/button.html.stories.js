/**
 * The button as plain HTML and CSS, from `@prism3/css`'s README markup contract (#3408 S5): what a server-rendered
 * page writes, with no script. Same cases as the element stories.
 */
import { CASES, parameters } from './cases.js';

/** The README's contract: each visual prop a `data-prop-*` attribute, each state a native or ARIA attribute. */
const markup = (c) => {
  const p = c.props;
  const a = ['type="button"', 'class="p3-button"', 'data-component="button"'];
  for (const k of ['appearance', 'size', 'surface', 'inset']) if (p[k]) a.push(`data-prop-${k}="${p[k]}"`);
  if (p.fullWidth) a.push('data-prop-fullwidth="true"');
  if (p.isPending) a.push('aria-busy="true"', 'aria-disabled="true"');
  else if (p.isInactive) a.push('aria-disabled="true"');
  if (p.disabled) a.push('disabled');
  const spinner = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-opacity="0.2"></circle>'
    + '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="20.73 62.83" transform="rotate(-90 12 12)"></circle>'
    + '</svg>';
  const kids = [
    c.leading ? `<span class="p3-button__leading-visual" aria-hidden="true">${c.leading}</span>` : '',
    p.isPending ? `<span class="p3-button__spinner" aria-hidden="true">${spinner}</span>` : '',
    `<span class="p3-button__label">${c.label ?? 'Save changes'}</span>`,
    c.trailing ? `<span class="p3-button__trailing-visual" aria-hidden="true">${c.trailing}</span>` : '',
  ].join('');
  return `<button ${a.join(' ')}>${kids}</button>`;
};
/** Parsed into nodes, so the preview's theme frame (a Lit template) renders the markup rather than its text. */
const nodes = (htmlText) => { const t = document.createElement('template'); t.innerHTML = htmlText; return t.content; };
const story = (name) => ({ name, render: () => nodes(markup(CASES[name])), parameters: parameters(CASES[name]) });

export default { title: 'Components/Button/HTML' };

export const Rest = story('Rest');
export const Hover = story('Hover');
export const Pressed = story('Pressed');
export const FocusVisible = story('FocusVisible');
export const Disabled = story('Disabled');
export const Inactive = story('Inactive');
export const Pending = story('Pending');
export const Filled = story('Filled');
export const Outline = story('Outline');
export const Text = story('Text');
export const TextFlush = story('TextFlush');
export const Small = story('Small');
export const Medium = story('Medium');
export const Large = story('Large');
export const Inverse = story('Inverse');
export const InverseOutline = story('InverseOutline');
export const WithVisuals = story('WithVisuals');
export const FullWidth = story('FullWidth');
