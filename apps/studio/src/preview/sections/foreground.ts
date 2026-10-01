/** The Style guide's Foreground section (UI redesign S4a: shared by the Style guide and Color › Surfaces &
 *  fills). Content surfaces placed ON the page: the neutral and inverse ladders, and the semantic fills in
 *  bold and subtle weights, each with its on-surface text. Moved from `main.ts` unchanged. */
import { SEM, palSection, subHead, type SgCtx } from './kit';
import { surfaceCard } from './cards';

export const foregroundSection = (c: SgCtx): HTMLElement => {
  const secFg = palSection('Foreground', 'Content surfaces placed ON the page — the neutral and inverse ladders, plus semantic fills in bold and subtle weights, each paired with its on-surface text.');
  secFg.append(subHead('Neutral'), c.grid(3, ([['Primary', 'foreground.primary'], ['Secondary', 'foreground.secondary'], ['Tertiary', 'foreground.tertiary']] as Array<[string, string]>).map(([n, k]) => surfaceCard(c, k, n, 'text.primary'))));
  // Inverse: bold dark surfaces PLACED on the page (a dark card), as distinct from the inverse page band.
  secFg.append(subHead('Inverse'), c.grid(3, ([['Primary', 'inverse.foreground.primary'], ['Secondary', 'inverse.foreground.secondary'], ['Tertiary', 'inverse.foreground.tertiary']] as Array<[string, string]>).map(([n, k]) => surfaceCard(c, k, n, 'inverse.text.primary'))));
  secFg.append(subHead('Bold'), c.grid(5, SEM.map(([n, s]) => surfaceCard(c, `foreground.${s}`, n, `text.on-${s}`, 'On-color text', c.chip(`text.on-${s}`)))));
  secFg.append(subHead('Subtle'), c.grid(5, SEM.map(([n, s]) => surfaceCard(c, `foreground.${s}-subtle`, n, `text.${s}`, 'On-color text', c.chip(`text.${s}`)))));
  return secFg;
};
