/** Color › Surfaces & fills' Scrim section (UI redesign S4f, the owner's QA-B10): the scrim, out of the Background
 *  section into its own, as the levers' Scrim section is. The same card the Style guide's Background section ends
 *  on (`scrimCard`): the wash composited over the page, dimming it behind a modal panel. Read-only. The description
 *  is the caller's, shared with the levers' section (`SCRIM_DESC` in `shell/pages.ts`, Q23). */
import { el, hook, palSection, specimen, type SgCtx } from './kit';

/** The owner's A6 (2026-10-03): the section stays on the page color, and the scrim card's ground is the chrome's
 *  transparency checkerboard (`p3-checker`, Palettes' alpha swatches) rather than the page, so the wash over it reads
 *  as translucent. Otherwise the Style guide's scrim card (`scrimCard`): the wash, and a modal panel on it. */
const checkeredScrimCard = (c: SgCtx, k: string): HTMLElement => {
  const { cur, paint } = c;
  const cw = el('div', 'sg-cw');
  const card = hook(el('div', 'sg-card sg-scrimcard p3-checker'), 'scrim-checker');
  const dim = c.painted(hook(el('div', 'sg-scrimdim'), 'scrim-wash'), k, 'background'); dim.style.background = paint(cur, k);
  const panel = c.painted(el('div', 'sg-scrimpanel'), 'foreground.primary', 'background'); panel.style.background = paint(cur, 'foreground.primary');
  const lab = c.painted(el('div', 'sg-lab', 'Modal'), 'text.primary', 'color'); specimen(lab).style.color = paint(cur, 'text.primary');
  panel.append(lab); dim.append(panel); card.append(dim);
  cw.append(card, c.pills(...c.chip(k)));
  return cw;
};

export const scrimSection = (c: SgCtx, desc: string): HTMLElement => {
  const sec = palSection('Scrim', desc);
  sec.dataset.sgSection = 'scrim';   // the shared-section marker (`kit.ts`'s header)
  sec.append(c.grid(3, [checkeredScrimCard(c, 'scrim.default')]));
  return sec;
};
