/**
 * THE FIELD STYLE NOTICE (#2695, owner Q333 taking Q16 A). Apply Theme writes variables only, and the field style is
 * geometry: which edges carry a stroke, the inline padding, the corner and the ring offset. So a switch reaches the
 * file's field sets through Update (#2265), never through Apply. Apply states the change and points there; Update stays
 * the one place that changes components.
 *
 * Read against the brand the file held BEFORE this apply (`restoreInput`, read ahead of the write that replaces it).
 * A file with no stored brand reads as `outline`, because that is what a build without one draws (`materializeForBrand`
 * with `null`). Empty when the style did not change. The sentence is the proposal's Q16 draft, approved with option A;
 * the style is named by the manifest's own option label.
 */
import { leverManifest } from '@prism3/engine/levers';
import type { BrandInput } from '@prism3/engine/theme';

export const fieldStyleNote = (before: BrandInput | null, after: BrandInput): string => {
  const was = before?.fieldStyle ?? 'outline';
  const now = after.fieldStyle ?? 'outline';
  if (was === now) return '';
  const label = leverManifest.find((l) => l.key === 'fieldStyle')?.options?.find((o) => o.value === now)?.label ?? now;
  return `Field style is now ${label}. Update components to redraw the field sets.`;
};
