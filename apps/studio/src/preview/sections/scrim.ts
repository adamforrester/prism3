/** Color › Surfaces & fills' Scrim section (UI redesign S4f, the owner's QA-B10): the scrim, out of the Background
 *  section into its own, as the levers' Scrim section is. The same card the Style guide's Background section ends
 *  on (`scrimCard`): the wash composited over the page, dimming it behind a modal panel. Read-only. The description
 *  is the caller's, shared with the levers' section (`SCRIM_DESC` in `shell/pages.ts`, Q23). */
import { palSection, type SgCtx } from './kit';
import { scrimCard } from './cards';

export const scrimSection = (c: SgCtx, desc: string): HTMLElement => {
  const sec = palSection('Scrim', desc);
  sec.dataset.sgSection = 'scrim';   // the shared-section marker (`kit.ts`'s header)
  sec.append(c.grid(3, [scrimCard(c, 'scrim.default')]));
  return sec;
};
