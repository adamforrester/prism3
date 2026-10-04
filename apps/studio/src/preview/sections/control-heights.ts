/** The Shape preview's Density section (UI redesign S7, owner decisions D1 A and D6): every control height for the
 *  previewed mode (`size.<step>.height`, the density lever's whole effect on a component's size), each named by what
 *  uses it. A height a button binds reads "‹Size› button · ‹n›px" (D6, closing #1444's "my buttons look small"); every
 *  height lists the component definitions that bind it. Its heading and description are the Density lever
 *  section's (Q23). Read-only.
 *
 *  THE HEIGHT IN A MODE is the engine's: a mode with its own density re-derives the heights
 *  (`dims.sizesByMode`), otherwise it has the brand's. Drawn as a bar at its true height in the brand's own colors
 *  (owner decision D2 A).
 *
 *  Stamps its root with the shared-section marker (`data-sg-section="control-heights"`, `kit.ts`'s header).
 *  WHAT IT IS HANDED. The section context, the resolved dimensions, the mode and the section's copy. Nothing here
 *  reads the session. */
import type { Theme } from '@prism3/engine/theme';
import { USED_BY } from '../used-by';
import { palSection, type SgCtx } from './kit';
import { USED_BY_NONE, shapeSample, shapeTable } from './radius';

/** The D6 label (APPROVED format, owner, 2026-10-04): "‹Size› button · ‹n›px". */
export const buttonHeightLabel = (size: string, px: number): string => `${size} button · ${px}px`;

/** The control heights in `mode`, smallest first. */
export const heightsIn = (dims: Theme['dims'], mode: string): { name: string; height: number }[] =>
  (dims.sizesByMode?.[mode] ?? dims.sizes).map((z) => ({ name: z.name, height: z.height }));

export const controlHeightsSection = (c: SgCtx, dims: Theme['dims'], mode: string, copy: { title: string; desc: string }): HTMLElement => {
  const sec = palSection(copy.title, copy.desc);
  sec.dataset.sgSection = 'control-heights';   // the shared-section marker (`kit.ts`'s header)
  const sizes = USED_BY.buttonSizes as Record<string, string>;
  const users = USED_BY.height as Record<string, readonly string[]>;
  sec.append(shapeTable(['Height', 'Used by', 'Sample'], heightsIn(dims, mode).map((z) => {
    const token = `size.${z.name}.height`;
    const bar = shapeSample(c, 'shp-hbar');
    bar.style.height = `${z.height}px`;
    const who = users[token] ?? [];
    return { hook: 'height-row', key: z.name, label: sizes[token] ? buttonHeightLabel(sizes[token], z.height) : `${z.height}px`, token,
      who: who.length ? who.join(', ') : USED_BY_NONE, sample: bar };
  })));
  return sec;
};
