/** The Style guide's Background section (UI redesign S4a: shared by the Style guide and Color › Surfaces &
 *  fills). The base page planes, their inverse counterparts, and the scrim. Moved from `main.ts` unchanged. */
import { palSection, subHead, type SgCtx } from './kit';
import { scrimCard, surfaceCard } from './cards';

export const backgroundSection = (c: SgCtx): HTMLElement => {
  const secBg = palSection('Background', 'The base page planes, their inverse counterparts, and the scrim that dims them behind a modal.');
  secBg.dataset.sgSection = 'background';   // the shared-section marker (`kit.ts`'s header)
  secBg.append(subHead('Base'), c.grid(3, ([['Primary', 'background.primary'], ['Secondary', 'background.secondary'], ['Tertiary', 'background.tertiary']] as Array<[string, string]>).map(([n, k]) => surfaceCard(c, k, n, 'text.primary'))));
  // The inverse cards' labels are in `inverse.text.primary`, as the base cards' are in `text.primary`. The extra
  // "Inverse text" sample and its chip on the Primary card are gone (owner decision Q47, 2026-10-02).
  secBg.append(subHead('Inverse'), c.grid(3, ([['Primary', 'inverse.background.primary'], ['Secondary', 'inverse.background.secondary'], ['Tertiary', 'inverse.background.tertiary']] as Array<[string, string]>)
    .map(([n, k]) => surfaceCard(c, k, n, 'inverse.text.primary'))));
  secBg.append(subHead('Scrim'), c.grid(3, [scrimCard(c, 'scrim.default')]));
  return secBg;
};
