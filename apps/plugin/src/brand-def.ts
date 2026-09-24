/**
 * BRAND MATERIALIZATION OF A COMPONENT DEF (#1163, #1605) — the brand levers a def is resolved against
 * BEFORE projection, so `figmaAnatomySet` itself stays brand-agnostic (`anatomy-figma.ts`'s
 * `applyControlShape` and `applyWeightIntent` headers).
 *
 * Two levers, both read off the ONE persisted `BrandInput` the caller already restored:
 *
 *   · `controlShape` (#1163) — the corner a pill brand builds its controls with.
 *   · weight availability (#1605, the runtime half of #1602) — which body weight roles the brand
 *     ships. Without it, `field-label` on an NB file (`body: [default, emphasis]`) projects
 *     `body/<size>/strong`, a text style NB never emits, and every bold member misses its style.
 *
 * WHY A MODULE AND NOT TWO LINES IN `main.ts`: `main.ts` calls `figma.showUI` at module scope, so it
 * cannot be imported by a test, and a gate on its source text can see that a call EXISTS but not what
 * it does. Here the behavior is importable, so `test-write-components.ts` builds `field-label` through
 * this function against real brands and reads the applied text styles back from the host shim.
 *
 * `null` (no persisted brand, or a read the caller caught) is the identity on both levers: `rounded`
 * and `DEFAULT_WEIGHT_AVAILABILITY`, so a themeless file builds byte-identically to before #1605. A
 * persisted brand whose theme fails to build falls back the same way — the build still runs, against
 * the defaults, which is what the `controlShape` read already did on an untrusted input.
 */
import { applyControlShape, applyWeightIntent, DEFAULT_WEIGHT_AVAILABILITY } from '@prism3/engine/anatomy-figma';
import type { WeightAvailability } from '@prism3/engine/anatomy-figma';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { brandTheme, weightAvailability } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';

/** The weight roles a brand ships per type category, or the defaults when there is no usable brand. */
export const brandWeightAvailability = (input: BrandInput | null): WeightAvailability => {
  if (!input) return DEFAULT_WEIGHT_AVAILABILITY;
  try { return weightAvailability(brandTheme(input).typography); } catch { return DEFAULT_WEIGHT_AVAILABILITY; }
};

/** `def` resolved against the brand: corner shape first, then weight intent (#1605's owner-locked order). */
export const materializeForBrand = (def: ComponentDef, input: BrandInput | null): ComponentDef =>
  applyWeightIntent(applyControlShape(def, input?.controlShape ?? 'rounded'), brandWeightAvailability(input));
