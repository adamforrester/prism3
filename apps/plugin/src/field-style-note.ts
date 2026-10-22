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
import { fieldStyleFor } from '@prism3/engine/anatomy-figma';

export const fieldStyleNote = (before: BrandInput | null, after: BrandInput): string => {
  const was = before?.fieldStyle ?? 'outline';
  const now = after.fieldStyle ?? 'outline';
  if (was === now) return '';
  const label = leverManifest.find((l) => l.key === 'fieldStyle')?.options?.find((o) => o.value === now)?.label ?? now;
  return `Field style is now ${label}. Update components to redraw the field sets.`;
};

/**
 * THE SEARCH FIELD STYLE NOTICE (#2888). The same reason as above: the search field's edge is geometry, so a change
 * reaches its set through Update. Said only when the brand moved the Search field style lever AND the search field now
 * draws a different edge; a search field that follows Field style is already covered by the notice above, and a lever
 * moved between two settings that draw the same edge (Follow field style over Outline fields, and Outline) redraws
 * nothing. The setting is named by the manifest's own option label.
 */
export const searchFieldStyleNote = (before: BrandInput | null, after: BrandInput): string => {
  const was = before?.searchFieldStyle ?? 'follow';
  const now = after.searchFieldStyle ?? 'follow';
  if (was === now || fieldStyleFor('search-field', before) === fieldStyleFor('search-field', after)) return '';
  const label = leverManifest.find((l) => l.key === 'searchFieldStyle')?.options?.find((o) => o.value === now)?.label ?? now;
  return `Search field style is now ${label}. Update components to redraw the search field.`;
};
