/** The shadow steps (UI redesign S9.1 lifted the legacy `renderShadowSpecimen` here; S9.2 redrew it for the Depth &
 *  motion preview's Elevation section, its one caller now): one card per shadow step, xs to 2xl, each a card in the
 *  brand's own page color on the brand's page (concept v6's Elevation board), with the step's name, its token and the
 *  CSS it resolves to for the mode in view. `inset` is drawn after the steps and set apart: it is a different kind of
 *  shadow, not the next size up. Read-only.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="shadow-ramp"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved shadows (`rp.shadows`, token path → mode → CSS), the mode in
 *  view and the block's copy. Nothing here reads the session. */
import type { ResolvedPreview } from '@prism3/engine/resolve-preview';
import { el, hook, specimen, subHead, tokenPillBadged, type SgCtx } from './kit';

/** The steps, in order. Declared as a bare `const` and exported below, because
 *  `packages/engine/lint-ramp-steps.ts` reads this array literal from this file by the `const NAME = [` shape
 *  and holds it to the engine's shadow ladder. */
const SHADOW_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
export { SHADOW_STEPS };

export const shadowRampSection = (c: SgCtx, shadows: ResolvedPreview['shadows'], mode: string, copy: { title: string }): HTMLElement => {
  const wrap = hook(el('div', 'dm-block'), 'depth-shadows');
  wrap.dataset.sgSection = 'shadow-ramp';   // the shared-section marker (`kit.ts`'s header)
  wrap.append(subHead(copy.title));
  const cell = (step: string): HTMLElement | null => {
    const css = shadows[`shadow.${step}`]?.[mode];
    if (!css) return null;
    const x = hook(el('div', 'sh-cell'), 'shadow-step');
    x.dataset.step = step;
    // The card is the brand's page color on the brand's page (v6): only the shadow tells the steps apart.
    const card = c.painted(specimen(el('div', 'sh-card')), 'background.primary', 'background');
    card.style.background = c.paint(c.cur, 'background.primary');
    card.style.boxShadow = css;   // the resolved value inline: the specimen reads the model directly
    x.append(card, el('div', 'sh-lab mono', step), tokenPillBadged(`shadow.${step}`), el('div', 'sh-css mono', css));
    return x;
  };
  const list = el('div', 'sh-list');
  for (const step of SHADOW_STEPS) { const x = cell(step); if (x) list.append(x); }
  wrap.append(list);
  const inset = cell('inset');
  if (inset) {
    const apart = hook(el('div', 'sh-list sh-apart'), 'shadow-inset');
    apart.append(inset);
    wrap.append(apart);
  }
  return wrap;
};
