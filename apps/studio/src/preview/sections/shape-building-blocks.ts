/** The Shape preview's Building blocks section (UI redesign S7, owner decision D1 A): the fixed sizes every brand
 *  shares, read-only: the border widths, the icon sizes and the 4px grid every geometry token lands on. It lifts the
 *  legacy Size & radius page's Primitive scales specimen (`main.ts`' `paintPrimitivesPreview`). Its own file, not
 *  Type's `building-blocks.ts`: the two share a heading (Q73's, for "the fixed steps") and nothing else.
 *
 *  THE BORDER WIDTHS ARE A LIST, as the legacy specimen's were: the engine writes them as four literals in
 *  `tree.ts` and exports no list to read. `test:smoke` holds this list against every `border-width.*` the committed
 *  emission carries, at its emitted px, so a width the engine adds or moves fails there by name. The icon sizes and
 *  the grid are read off the theme (`dims.icons`, `dims.grid`).
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="shape-building-blocks"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved dimensions and the section's copy. Nothing here reads the
 *  session. */
import type { Theme } from '@prism3/engine/theme';
import { el, palSection, subHead, type SgCtx } from './kit';
import { shapeSample, shapeTable } from './radius';

/** The section's copy (APPROVED, owner, 2026-10-04). The heading is Type's for its fixed steps (Q73). */
export const SHAPE_BUILDING_BLOCKS = { title: 'Building blocks', desc: 'Fixed sizes every brand shares: border widths, icon sizes and the 4px grid.' };
/** The sub-headings. DRAFT. */
export const SHAPE_BLOCK_TITLES = { border: 'Border width', icon: 'Icon size', grid: 'Grid' } as const;

/** The border widths `tree.ts` writes (see the header). */
const BORDER_WIDTHS: readonly (readonly [string, number])[] = [['none', 0], ['hairline', 1], ['thick', 2], ['heavy', 4]];

export const shapeBuildingBlocksSection = (c: SgCtx, dims: Theme['dims'], copy: { title: string; desc: string }): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'shape-building-blocks';   // the shared-section marker (`kit.ts`'s header)
  sec.append(subHead(SHAPE_BLOCK_TITLES.border));
  sec.append(shapeTable(['Width', 'Sample'], BORDER_WIDTHS.map(([k, px]) => {
    const line = px ? shapeSample(c, 'shp-line') : el('div', 'shp-wbar zero');
    if (px) line.style.borderTopWidth = `${px}px`;
    return { hook: 'border-width-row', key: k, label: `${px}px`, token: `border-width.${k}`, who: '', sample: line };
  }), false));
  sec.append(subHead(SHAPE_BLOCK_TITLES.icon));
  sec.append(shapeTable(['Size', 'Sample'], dims.icons.map((i) => {
    const box = shapeSample(c, 'shp-icon');
    box.style.width = box.style.height = `${i.px}px`;
    return { hook: 'icon-size-row', key: i.name, label: `${i.px}px`, token: `icon.size.${i.name}`, who: '', sample: box };
  }), false));
  sec.append(subHead(SHAPE_BLOCK_TITLES.grid));
  sec.append(shapeTable(['Step', 'Sample'], dims.grid.map((px) => {
    const bar = px ? shapeSample(c, 'shp-wbar') : el('div', 'shp-wbar zero');
    if (px) bar.style.width = `${px}px`;
    return { hook: 'grid-row', key: String(px), label: `${px}px`, token: `core.dimension.${px}`, who: '', sample: bar };
  }), false));
  return sec;
};
