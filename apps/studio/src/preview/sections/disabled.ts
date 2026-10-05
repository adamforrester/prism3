/** The Style guide's Disabled section (UI redesign S5.1: lifted out of `renderPreviewStyleGuide` in `main.ts`
 *  so Color › Interactive can draw the same section, as S4a did for the five color sections). The one shared,
 *  stateless inert set: the fill, its ink on the fill, the ink on the panel, the border and the icon. Moved
 *  unchanged in output: no painted-role attributes added, so the Style guide's HTML is identical but for the
 *  shared-section marker on its root. Its description is `DISABLED_DESC`, shared with the levers' Disabled
 *  section on Color › Interactive (owner decisions Q23, Q51). */
import { DISABLED_DESC } from '../../shell/pages';
import { el, palSection, specimen, type SgCtx } from './kit';
import { borderCard, iconCard } from './cards';

export const disabledSection = (c: SgCtx): HTMLElement => {
  const { cur, paint, pills, grid } = c;
  const secDis = palSection('Disabled', DISABLED_DESC);
  secDis.dataset.sgSection = 'disabled';   // the shared-section marker (`kit.ts`'s header)
  const disCards: HTMLElement[] = [];
  { const cw = el('div', 'sg-cw'); const card = el('div', 'sg-card'); card.style.background = paint(cur, 'disabled.fill'); cw.append(card, pills(...c.chip('disabled.fill'))); disCards.push(cw); }
  { const cw = el('div', 'sg-cw'); const card = el('div', 'sg-card sg-mid'); card.style.background = paint(cur, 'disabled.fill'); const l = el('div', 'sg-lab', 'Disabled'); specimen(l).style.color = paint(cur, 'disabled.on-fill'); card.append(l); cw.append(card, pills(...c.chip('disabled.on-fill'))); disCards.push(cw); }
  { const cw = el('div', 'sg-cw'); const card = el('div', 'sg-card sg-mid'); card.style.background = 'var(--panel)'; const l = el('div', 'sg-lab', 'Disabled'); specimen(l).style.color = paint(cur, 'disabled.text'); card.append(l); cw.append(card, pills(...c.chip('disabled.text'))); disCards.push(cw); }
  disCards.push(borderCard(c, 'disabled.border'), iconCard(c, 'disabled.icon'));
  secDis.append(grid(5, disCards));
  return secDis;
};
