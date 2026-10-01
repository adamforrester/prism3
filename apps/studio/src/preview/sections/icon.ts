/** The Style guide's Icon section (UI redesign S4a: shared by the Style guide and Color › Surfaces & fills).
 *  Icon color at the neutral tiers, the semantic set, and the on-color icons on bold fills. Moved from
 *  `main.ts` unchanged. */
import { SEM, palSection, subHead, type SgCtx } from './kit';
import { iconCard } from './cards';

export const iconSection = (c: SgCtx): HTMLElement => {
  const secIcon = palSection('Icon', 'Icon color at the neutral tiers, the semantic set, and the on-color icons that sit on bold fills.');
  secIcon.append(subHead('Neutral'), c.grid(3, ['icon.primary', 'icon.secondary', 'icon.tertiary'].map((k) => iconCard(c, k))));
  secIcon.append(subHead('Semantic'), c.grid(5, ['icon.brand', 'icon.danger', 'icon.success', 'icon.warning', 'icon.info'].map((k) => iconCard(c, k))));
  secIcon.append(subHead('On color'), c.grid(5, SEM.map(([, s]) => iconCard(c, `icon.on-${s}`, `foreground.${s}`))));
  return secIcon;
};
