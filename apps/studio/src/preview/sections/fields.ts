/** Color › Surfaces & fills' Fields section (UI redesign S4f, #2016, the owner's Q80): the form field roles the
 *  levers' Fields section edits (Q29), drawn as fields. Each state is a field on its ground, the page's and then the
 *  inverse fill's: at rest and hovered with its placeholder, then filled with entered text, the field's fill inside
 *  its border. The token chips under each carry their ratio badges (Surfaces & fills draws this section on the page
 *  color, Q81). The description is the caller's, shared with the levers' section (`FIELDS_DESC`, Q23).
 *
 *  Every painted node names its role and the property it paints (`ctx.painted`), so `test-smoke.mjs` holds each
 *  against the emission: the ground, the border, the fill (a transparent fill has no opaque hex, and is skipped
 *  there) and the text. */
import { el, palSection, specimen, subHead, type SgCtx } from './kit';

/** The states drawn, by name: the border role's state, and the text the field shows (its placeholder, or entered
 *  text in the ground's primary ink). */
const STATES: ReadonlyArray<readonly [string, 'rest' | 'hover', 'placeholder' | 'value']> = [
  ['Rest', 'rest', 'placeholder'], ['Hover', 'hover', 'placeholder'], ['Filled', 'rest', 'value'],
];

/** One field on its ground: the state's name in the ground's ink, then the field, its border role around its fill
 *  role, and its text; the chips under it. */
const fieldCard = (c: SgCtx, p: string, groundRole: string, ink: string, state: readonly [string, 'rest' | 'hover', 'placeholder' | 'value']): HTMLElement => {
  const { cur, paint } = c;
  const [name, border, text] = state;
  const cw = el('div', 'sg-cw');
  const card = c.painted(el('div', 'sg-card sg-fcard'), groundRole, 'background');
  card.style.background = paint(cur, groundRole);
  const lab = c.painted(el('div', 'sg-lab', name), ink, 'color'); specimen(lab).style.color = paint(cur, ink);
  const box = c.painted(el('div', 'sg-field'), `${p}field.border.${border}`, 'border');
  box.style.borderColor = paint(cur, `${p}field.border.${border}`);
  const fill = c.painted(el('div', 'sg-field-fill'), `${p}field.fill`, 'background');
  // The default fill is the engine's `core.palette.transparent`, which resolves with black's hex and no alpha (the
  // engine's candidate for it), so the path says it is transparent: the field then shows the ground it sits on.
  fill.style.background = c.role(cur, `${p}field.fill`)?.path?.endsWith('.transparent') ? 'transparent' : paint(cur, `${p}field.fill`);
  const textRole = text === 'placeholder' ? `${p}field.placeholder` : ink;
  const t = c.painted(el('span', 'sg-field-t', text === 'placeholder' ? 'Placeholder' : 'Entered text'), textRole, 'color');
  specimen(t).style.color = paint(cur, textRole);
  fill.append(t);
  box.append(fill);
  card.append(lab, box);
  cw.append(card, c.pills(...c.chip(`${p}field.border.${border}`), ...c.chip(textRole), ...(border === 'rest' && text === 'placeholder' ? c.chip(`${p}field.fill`) : [])));
  return cw;
};

export const fieldsSection = (c: SgCtx, desc: string): HTMLElement => {
  const sec = palSection('Fields', desc);
  sec.dataset.sgSection = 'fields';   // the shared-section marker (`kit.ts`'s header)
  sec.append(subHead('Base'), c.grid(3, STATES.map((s) => fieldCard(c, '', 'background.primary', 'text.primary', s))));
  sec.append(subHead('Inverse'), c.grid(3, STATES.map((s) => fieldCard(c, 'inverse.', 'inverse.background.primary', 'inverse.text.primary', s))));
  return sec;
};
