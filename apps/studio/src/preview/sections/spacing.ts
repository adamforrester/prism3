/** The Shape preview's Spacing section (UI redesign S7, owner decision D1 A): the spacing steps, read-only. The 8px
 *  rhythm is fixed for every brand (`scale.ts`'s `SPACE_BASE`), so no lever pairs with it; it lifts the legacy Size &
 *  radius page's Spacing grid specimen (`main.ts`' `paintSpacingPreview`), every `space.*` step at its true width.
 *  Read off the theme, never `rp.dims`, which holds only the steps preview components bind.
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="spacing"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved dimensions and the section's copy. Nothing here reads the
 *  session. */
import type { Theme } from '@prism3/engine/theme';
import { el, palSection, type SgCtx } from './kit';
import { shapeSample, shapeTable } from './radius';

/** The section's copy (APPROVED, owner, 2026-10-04). */
export const SPACING_PREVIEW = { title: 'Spacing', desc: 'The 8px rhythm is the same for every brand. Steps below 8px are for fine adjustments.' };

export const spacingSection = (c: SgCtx, dims: Theme['dims'], copy: { title: string; desc: string }): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'spacing';   // the shared-section marker (`kit.ts`'s header)
  sec.append(spacingTable(c, dims));
  return sec;
};

/** Each space step: its value, its token, and a bar at its true width (a zero step draws an empty bar). */
const spacingTable = (c: SgCtx, dims: Theme['dims']): HTMLElement => {
  const t = shapeTable(['Step', 'Sample'], dims.space.map((s) => {
    const bar = s.px ? shapeSample(c, 'shp-wbar') : el('div', 'shp-wbar zero');
    if (s.px) bar.style.width = `${s.px}px`;
    return { hook: 'space-row', key: s.key, label: `${s.px}px`, token: `space.${s.key}`, who: '', sample: bar };
  }), false);
  return t;
};
