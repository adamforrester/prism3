/**
 * The role keys one state of the style guide's Outline row reads — fill, ink and edge (#1629).
 *
 * Extracted from `main.ts` because `main.ts` calls `build()` (touching `document`) at import and
 * cannot load under tsx; `test-outline-roles.ts` drives this module instead, the same reason
 * `size-labels.ts` and `provenance.ts` exist.
 *
 * The three roles take ONE ground switch between them. The ink and the edge were switched to their
 * `inverse.` twins on an inverse preview ground by #461 / #467; the hover and pressed FILL was not, so
 * the band preview painted the PAGE wash (`black-alpha` over a near-black band under `overlay-neutral`,
 * the page step of the page fill under `solid-tint`) rather than the twin the engine emits for that
 * ground — `inverse.interactive.<c>.overlay.*` / `inverse.interactive.<c>.subtle-fill.*`, which is what
 * the plugin binds on a `surface=inverse` member. `outlineFillRole` stays the one method → family
 * mapping; the ground is a prefix in front of it, exactly as for the ink and edge.
 *
 * `opaque` is kept: an OPAQUE fill covers the band, so from `hover` onward the ground is the page-tuned
 * fill and the page ink/edge/fill are the measured-correct answer (the #575 reasoning). No method is
 * opaque since #1614, so on an inverse ground today every state reads the band's roles.
 */
import { outlineFillFamily, outlineFillRole } from '@prism3/engine/modes';
import type { Theme } from '@prism3/engine/theme';

export interface OutlineStateRoles {
  /** The hover/pressed fill role, or null at rest and under a method that emits no fill. */
  fill: string | null;
  text: string;
  border: string;
}

export const outlineStateRoles = (
  method: Theme['outlineInteraction'], color: string, state: string, onInverseGround: boolean,
): OutlineStateRoles => {
  const page = state === 'rest' ? null : outlineFillRole(method, color, state);
  const onBand = onInverseGround && !(outlineFillFamily(method).opaque && page);
  const g = onBand ? 'inverse.' : '';
  return {
    fill: page ? `${g}${page}` : null,
    text: `${g}interactive.${color}.text.${state}`,
    border: `${g}interactive.${color}.border.${state}`,
  };
};
