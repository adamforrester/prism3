/**
 * Outline hover fill (#3071, owner Q824 A): the `outlineHoverFill` lever's reads and writes, for Color › Interactive ›
 * Outline hover, shown while `outlineInteraction` is `opaque-fill`.
 *
 * Per mode, like the column anchors: the mode the preview shows is the mode a pick writes (owner decisions Q22, Q34).
 * A pick is a palette step (`neutral.050`). Auto is the engine's default rule, so Auto on hover REMOVES the mode's
 * entry, and removing the last entry removes the key: a brand that picks nothing is byte-identical to one that never
 * had the lever. Pressed is only offered once hover is picked; its Auto is the next step past hover.
 *
 * Leaving `opaque-fill` removes the key with it, since the engine refuses `outlineHoverFill` under another method.
 */
import type { OutlineHoverFill } from '@prism3/engine/theme';
import { brandState, getPath, setPath } from './store';

export const readOutlineHoverFill = (): OutlineHoverFill => ({ ...(getPath(brandState, 'outlineHoverFill') ?? {}) });

const write = (v: OutlineHoverFill): void => {
  if (Object.keys(v).length) setPath(brandState, 'outlineHoverFill', v);
  else delete (brandState as { outlineHoverFill?: unknown }).outlineHoverFill;
};

/** `step` is `palette.step`, or undefined for Auto. */
export const setOutlineHoverStep = (mode: string, state: 'hover' | 'pressed', step: string | undefined): void => {
  const all = readOutlineHoverFill();
  const cur = all[mode];
  if (state === 'hover') {
    if (step) all[mode] = { ...cur, hover: step };
    else delete all[mode];
  } else if (cur) {
    const { pressed: _old, ...rest } = cur;
    all[mode] = step ? { ...rest, pressed: step } : rest;
  }
  write(all);
};

/** The outline hover method chip. Leaving `opaque-fill` drops its picks, which no other method reads. */
export const setOutlineInteraction = (v: string): void => {
  setPath(brandState, 'outlineInteraction', v);
  if (v !== 'opaque-fill') write({});
};
