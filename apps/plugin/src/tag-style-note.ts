/**
 * THE TAG STYLE NOTICE (#2887), `field-style-note.ts`'s twin. Apply Theme writes variables only, and the tag style is
 * geometry: which edges carry a stroke, the corner, the height floor and the inset to the line. So a switch reaches the
 * file's Tag set through Update (#2265), never through Apply. Apply states the change and points there.
 *
 * Read against the brand the file held BEFORE this apply (`restoreInput`). A file with no stored brand reads as `pill`,
 * what a build without one draws (`materializeForBrand` with `null`). Empty when the style did not change. The style is
 * named by the manifest's own option label.
 *
 * DRAFT COPY for the owner (#2887): the sentence follows the approved Field style notice's pattern; the owner has not
 * yet approved this wording.
 */
import { leverManifest } from '@prism3/engine/levers';
import type { BrandInput } from '@prism3/engine/theme';

export const tagStyleNote = (before: BrandInput | null, after: BrandInput): string => {
  const was = before?.tagStyle ?? 'pill';
  const now = after.tagStyle ?? 'pill';
  if (was === now) return '';
  const label = leverManifest.find((l) => l.key === 'tagStyle')?.options?.find((o) => o.value === now)?.label ?? now;
  return `Tag style is now ${label}. Update components to redraw the tag set.`;
};
