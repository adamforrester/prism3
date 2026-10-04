/** The Layout preview's shared parts (UI redesign S10, owner decision D14): what the Breakpoints, Grid and Containers
 *  sections draw with. Nothing here writes the shared-section marker; each section stamps its own.
 *
 *  THE TINTS. Each breakpoint's range, its column bars and the container bars are the brand's PRIMARY tints (V11),
 *  stepping along the primary ramp one breakpoint at a time, as concept v6 does. The ramp does not change by mode, so on
 *  a dark page the tints are the same; the label ink on each tint is picked PER TINT, black or white, whichever has the
 *  more contrast on it (D14). Black or white always clears 4.5:1 on one of the two (the lowest, at a mid gray, is
 *  about 4.6:1), so a label on a tint never depends on the mode.
 *
 *  LABEL FIRST, TOKEN UNDER (the owner's QA-B2): `layoutLabel` draws a name in the ground's ink, its token pill under
 *  it, and its value beside. The ink comes from the ground's own custom properties (`ground()` in `kit.ts`), never
 *  inline, so it follows the previewed mode. Nothing here reads the session. */
import type { LayoutAxis, Theme } from '@prism3/engine/theme';
import { el, hook, legibleInkOn, specimen, tokenPillSpan, type SgCtx } from './kit';

export type LayoutCtx = {
  readonly c: SgCtx;
  readonly ly: LayoutAxis;
  /** The tint for breakpoint `i`. */
  readonly tint: (i: number) => string;
  /** The ink a label takes on `hex`. */
  readonly inkOn: (hex: string) => string;
  /** The gray behind the column bars and the container bars: the brand's second page tier, in the previewed mode. */
  readonly gray: string;
};

export const layoutCtx = (c: SgCtx, t: Pick<Theme, 'palettes' | 'layout'>): LayoutCtx => {
  const ramp = t.palettes.find((p) => p.palette === 'primary') ?? t.palettes[0];
  const steps = ramp?.steps ?? [];
  return {
    c, ly: t.layout,
    tint: (i) => steps[Math.min(steps.length - 1, 2 + i * 3)]?.hex ?? '#808080',
    inkOn: (hex) => legibleInkOn(hex, '#000000', '#ffffff'),
    gray: c.paint(c.cur, 'background.secondary'),
  };
};

/** A tinted block with its label in the ink picked for that tint. Brand content: a specimen. */
export const tinted = (x: LayoutCtx, cls: string, hex: string, text?: string): HTMLElement => {
  const n = specimen(el('span', cls, text));
  n.style.background = hex;
  if (text !== undefined) n.style.color = x.inkOn(hex);
  return n;
};

/** A name, its token under it, and its value beside (QA-B2). `read` names the value for a test to read back. */
export const layoutLabel = (label: string, token: string, value: string, read?: [string, string]): HTMLElement => {
  const w = el('div', 'lyv-lab');
  const name = el('div', 'lyv-name');
  name.append(el('b', 'lyv-label', label), tokenPillSpan(token));
  const v = el('span', 'lyv-val mono', value);
  if (read) v.dataset[read[0]] = read[1];
  w.append(name, v);
  return hook(w, 'layout-label');
};
