/**
 * The role keys one state of the style guide's Outline row reads — fill, ink and edge (#1629).
 *
 * Extracted from `main.ts` because `main.ts` calls `build()` (touching `document`) at import and
 * cannot load under tsx; `test-outline-roles.ts` drives this module instead, the same reason
 * `provenance.ts` exists.
 *
 * The three roles take ONE ground switch between them. The ink and the edge were switched to their
 * `inverse.` twins on an inverse preview ground by #461 / #467; the hover and pressed FILL was not, so
 * the band preview painted the PAGE wash (`black-alpha` over a near-black band under `overlay-neutral`,
 * the page step of the page fill under `solid-tint`) rather than the twin the engine emits for that
 * ground — `inverse.interactive.<c>.overlay.*` / `inverse.interactive.<c>.subtle-fill.*`, which is what
 * the plugin binds on a `surface=inverse` member. `outlineFillRole` stays the one method → family
 * mapping; the ground is a prefix in front of it, exactly as for the ink and edge.
 *
 * The switch no longer reads `opaque`. It did while the one opaque fill was a page-tuned palette step with no
 * band twin, so from `hover` on the page ink was the measured answer (the #575 reasoning). The opaque fill
 * since #3071, `hover-fill`, has its own `inverse.` twin, picked on the band and with the band ink measured on
 * it, so every method reads the band's fill, ink and edge on an inverse ground.
 */
import { outlineFillRole } from '@prism3/engine/modes';
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
  const g = onInverseGround ? 'inverse.' : '';
  return {
    fill: page ? `${g}${page}` : null,
    text: `${g}interactive.${color}.text.${state}`,
    border: `${g}interactive.${color}.border.${state}`,
  };
};
