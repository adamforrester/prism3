/**
 * `<p3-button>`, the custom element from `@prism3/web-components` (#3408 S5). Its controls come from
 * `custom-elements.json`; every story sets the element's properties, the API a client uses.
 */
import { CASES, parameters } from './cases.js';

const render = (c) => () => {
  const el = document.createElement('p3-button');
  el.label = c.label ?? 'Save changes';
  for (const [k, v] of Object.entries(c.props)) el[k] = v;
  const visual = (svg) => { const t = document.createElement('template'); t.innerHTML = svg; return t.content.firstElementChild; };
  if (c.leading) el.leadingVisual = visual(c.leading);
  if (c.trailing) el.trailingVisual = visual(c.trailing);
  return el;
};
const story = (name) => ({ name, render: render(CASES[name]), parameters: parameters(CASES[name]) });

export default { title: 'Components/Button/Element', component: 'p3-button' };

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
