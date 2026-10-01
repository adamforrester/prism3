/** The Style guide's Border section (UI redesign S4a: shared by the Style guide and Color › Surfaces &
 *  fills). Neutral separators, the focus rings and the semantic borders. Moved from `main.ts` unchanged.
 *
 *  `inverse.border.focus` sits beside `border.focus`, the pair a reader compares; the other inverse borders
 *  are shown honestly by the Style guide's ground picker. `border.tertiary` is #1140's. */
import { palSection, subHead, type SgCtx } from './kit';
import { borderCard } from './cards';

export const borderSection = (c: SgCtx): HTMLElement => {
  const secBorder = palSection('Border', 'Neutral separators, the focus ring, and semantic borders — their own category, not a surface.');
  secBorder.append(subHead('Neutral'), c.grid(3, ['border.primary', 'border.secondary', 'border.tertiary', 'inverse.border.primary'].map((k) => borderCard(c, k))));
  secBorder.append(subHead('Focus & semantic'), c.grid(3, ['border.focus', 'inverse.border.focus', 'border.brand', 'border.danger', 'border.success', 'border.warning', 'border.info'].map((k) => borderCard(c, k))));
  return secBorder;
};
