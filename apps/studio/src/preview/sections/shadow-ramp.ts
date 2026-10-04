/** The elevation ramp specimen (UI redesign S9.1, lifted from `main.ts`'s `renderShadowSpecimen`, unchanged in
 *  output): one card per shadow step (xs→2xl) on a light surface, so the shadow ramp — and the shadow-softness
 *  lever that reshapes every step — is visible (the single card in the component preview only shows one step).
 *  Read-only. The legacy Elevation page draws it; the Depth & motion page (S9.2) will draw the same code.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="shadow-ramp"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The resolved shadows (`rp.shadows`, token path → mode → CSS) and the mode in view.
 *  Nothing here reads the session. */
import type { ResolvedPreview } from '@prism3/engine/resolve-preview';
import { el, palSection, tokenPillBadged } from './kit';

/** The ramp's steps, in order. Declared as a bare `const` and exported below, because
 *  `packages/engine/lint-ramp-steps.ts` reads this array literal from this file by the `const NAME = [` shape
 *  and holds it to the engine's shadow ladder. */
const SHADOW_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
export { SHADOW_STEPS };

export const shadowRampSection = (shadows: ResolvedPreview['shadows'], mode: ResolvedPreview['modes'][number]): HTMLElement => {
  const wrap = palSection('Elevation ramp', 'The shadow ramp xs→2xl — the softness + tint levers reshape every step, resolved for the mode in view (see the preview below for the mode-reduced dark shadow).');
  wrap.dataset.sgSection = 'shadow-ramp';   // the shared-section marker (`kit.ts`'s header)
  const m = mode;   // #171 — every specimen reflects the mode-context selection
  const list = el('div', 'sh-list');
  // `inset` rides along after the ramp. The engine emits 7 shadow tokens and this specimen showed 6 —
  // `shadow.inset` appeared NOWHERE on the page, so the one token you could not see was the one whose
  // shape you most need to (an inner shadow reads nothing like an elevation step). It is deliberately
  // not a ramp STEP — it is a different kind of shadow, not a rung — so it is labeled apart rather
  // than appended to xs…2xl as if it were the next size up.
  for (const step of [...SHADOW_STEPS, 'inset']) {
    const css = shadows[`shadow.${step}`]?.[m];
    if (!css) continue;
    const cell = el('div', 'sh-cell');
    const card = el('div', 'sh-card');
    card.style.boxShadow = css;                                   // resolved value inline (specimen reads the model directly)
    cell.append(card, el('div', 'sh-lab mono', step), tokenPillBadged(`shadow.${step}`));
    list.append(cell);
  }
  wrap.append(list);
  return wrap;
};
