/**
 * BRAND MATERIALIZATION OF A COMPONENT DEF (#1163, #1605, #1608) — the brand levers a def is resolved
 * against BEFORE projection, so `figmaAnatomySet` itself stays brand-agnostic (`anatomy-figma.ts`'s
 * `applyControlShape`, `applyWeightIntent` and `applyOutlineInteraction` headers).
 *
 * Three levers, all read off the ONE persisted `BrandInput` the caller already restored:
 *
 *   · `controlShape` (#1163) — the corner a pill brand builds its controls with.
 *   · weight availability (#1605, the runtime half of #1602) — which body weight roles the brand
 *     ships. Without it, `field-label` on an NB file (`body: [default, emphasis]`) projects
 *     `body/<size>/strong`, a text style NB never emits, and every bold member misses its style.
 *   · `outlineInteraction` (#1608) — which family carries an outline/text hover fill. Without it, a
 *     `solid-tint` or `none` brand builds `button` binding `interactive.<c>.overlay.*`, a wash that
 *     brand never emits: 96 misses on `container.fills` in the owner's NB file.
 *
 * The second and third come off the brand's RESOLVED theme, built once: `brandTheme` is where the lever
 * defaults are filled in (`outlineInteraction` → `overlay-neutral`), so reading the raw input would
 * restate a default the engine already owns.
 *
 * WHY A MODULE AND NOT TWO LINES IN `main.ts`: `main.ts` calls `figma.showUI` at module scope, so it
 * cannot be imported by a test, and a gate on its source text can see that a call EXISTS but not what
 * it does. Here the behavior is importable, so `test-write-components.ts` builds `field-label` and
 * `button` through this function against real brands and reads the result back from the host shim.
 *
 * `null` (no persisted brand, or a read the caller caught) is the identity on every lever: `rounded`,
 * `DEFAULT_WEIGHT_AVAILABILITY` and `overlay-neutral`, so a themeless file builds byte-identically to
 * before. A persisted brand whose theme fails to build falls back the same way — the build still runs,
 * against the defaults, which is what the `controlShape` read already did on an untrusted input.
 */
import { applyControlShape, applyWeightIntent, applyOutlineInteraction, applyButtonLayout, DEFAULT_WEIGHT_AVAILABILITY, DEFAULT_BUTTON_LAYOUT } from '@prism3/engine/anatomy-figma';
import type { WeightAvailability, ButtonLayout } from '@prism3/engine/anatomy-figma';
import { componentSizes, sizeRefPx, SPACE_BASE } from '@prism3/engine/scale';
import type { SizeStep } from '@prism3/engine/scale';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { brandTheme, weightAvailability } from '@prism3/engine/theme';
import type { BrandInput, Theme } from '@prism3/engine/theme';

/** The theme-derived levers, off ONE `brandTheme` call — or the defaults when there is no usable brand. */
const brandLevers = (input: BrandInput | null): { avail: WeightAvailability; outline: Theme['outlineInteraction']; sizes: SizeStep[] } => {
  // THE DEFAULT DENSITY'S HEIGHTS when there is no usable brand (#1667): the button floor applies to every
  // brand at the default multiplier, so a themeless build still gets one, at the default ladder.
  const fallback = { avail: DEFAULT_WEIGHT_AVAILABILITY, outline: 'overlay-neutral' as const, sizes: componentSizes('comfortable', SPACE_BASE) };
  if (!input) return fallback;
  try {
    const theme = brandTheme(input);
    // `solid-tint` binds the tinted-wash VARIABLE (#1614, #1646): the opacity step the engine chose for this
    // brand lives in that variable's value, so nothing brand-specific rides on the def beyond the lever.
    return { avail: weightAvailability(theme.typography), outline: theme.outlineInteraction, sizes: theme.dims.sizes };
  } catch { return fallback; }
};

/** The weight roles a brand ships per type category, or the defaults when there is no usable brand. */
export const brandWeightAvailability = (input: BrandInput | null): WeightAvailability => brandLevers(input).avail;

/** The brand's three button settings (#1667), off the raw input like `controlShape`, defaults filled in. */
export const brandButtonLayout = (input: BrandInput | null): ButtonLayout => ({
  icons: input?.buttonIcons ?? DEFAULT_BUTTON_LAYOUT.icons,
  content: input?.buttonContentSize ?? DEFAULT_BUTTON_LAYOUT.content,
  minWidthMultiplier: input?.buttonMinWidthMultiplier ?? DEFAULT_BUTTON_LAYOUT.minWidthMultiplier,
});

/** `def` resolved against the brand: corner shape, then weight intent (#1605's owner-locked order), then
 *  the outline hover family (#1608 — independent of the other two: it touches only `color.*` refs), then
 *  the button layout (#1667 — independent too: it touches the button family's geometry and its two
 *  medium content refs, none of which the earlier three read or write). */
export const materializeForBrand = (def: ComponentDef, input: BrandInput | null): ComponentDef => {
  const { avail, outline, sizes } = brandLevers(input);
  return applyButtonLayout(
    applyOutlineInteraction(applyWeightIntent(applyControlShape(def, input?.controlShape ?? 'rounded'), avail), outline),
    brandButtonLayout(input), sizeRefPx(sizes));
};
