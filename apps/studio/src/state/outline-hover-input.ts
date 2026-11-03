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
import { OUTLINE_WASH_DEFAULTS, OUTLINE_WASH_STEPS, type OutlineHoverFill, type OutlineWash } from '@prism3/engine/theme';
import { brandState, getPath, setPath } from './store';

export const readOutlineHoverFill = (): OutlineHoverFill => ({ ...(getPath(brandState, 'outlineHoverFill') ?? {}) });

const write = (v: OutlineHoverFill): void => {
  if (Object.keys(v).length) setPath(brandState, 'outlineHoverFill', v);
  else delete (brandState as { outlineHoverFill?: unknown }).outlineHoverFill;
};

/** #3335 (the owner's Q3335.5 A): one button set's own pick in `mode`, written under `outlineHoverFill.<mode>.sets.<set>`.
 *  `step` is `palette.step`, or undefined for Auto, which removes the set's entry (and pressed with it), so the set falls back
 *  to the mode-wide pick or the engine's default rule. An emptied `sets`, then an emptied mode, are removed, so a brand
 *  that picks nothing stays byte-identical. Pressed is offered only once the set's hover is picked. */
export const setOutlineHoverSetStep = (mode: string, set: string, state: 'hover' | 'pressed', step: string | undefined): void => {
  const all = readOutlineHoverFill();
  const cur = { ...(all[mode] ?? {}) };
  const sets = { ...(cur.sets ?? {}) };
  if (state === 'hover') {
    if (step) sets[set] = { ...sets[set], hover: step };
    else delete sets[set];
  } else if (sets[set]) {
    const { pressed: _old, ...rest } = sets[set];
    sets[set] = step ? { ...rest, pressed: step } : rest;
  }
  if (Object.keys(sets).length) cur.sets = sets; else delete cur.sets;
  if (cur.hover || cur.sets) all[mode] = cur; else delete all[mode];
  write(all);
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

// ── Wash opacity (#3335, the owner's Q3335.3 A) ─────────────────────────────────────────────────────
/** The wash's steps as the page offers them: hover below the top step, so pressed always has one above it. */
export const WASH_HOVER_STEPS: readonly number[] = OUTLINE_WASH_STEPS.slice(0, -1);
export const WASH_PRESSED_STEPS: readonly number[] = OUTLINE_WASH_STEPS;
/** The steps the wash takes under `method` now: the brand's pick, else the method's default (the engine's own rule,
 *  `outlineWashSteps`, read here as the two defaults it starts from). */
export const readOutlineWash = (method: string): { hover: number; pressed: number } => {
  const d = method === 'solid-tint' ? OUTLINE_WASH_DEFAULTS.tinted : OUTLINE_WASH_DEFAULTS.neutral;
  const w = (getPath(brandState, 'outlineWash') ?? {}) as OutlineWash;
  const hover = w.hover ?? d.hover;
  const pressed = w.pressed ?? (d.pressed > hover ? d.pressed : OUTLINE_WASH_STEPS.find((x) => x > hover) ?? hover);
  return { hover, pressed };
};
/** Pick one step. A hover that would meet or pass pressed takes pressed one step above it. Both steps back on the method's
 *  defaults remove the key, so a brand that ends where it started is byte-identical. */
export const setOutlineWashStep = (method: string, state: 'hover' | 'pressed', step: number): void => {
  const d = method === 'solid-tint' ? OUTLINE_WASH_DEFAULTS.tinted : OUTLINE_WASH_DEFAULTS.neutral;
  const now = readOutlineWash(method);
  const next = { ...now, [state]: step };
  if (next.pressed <= next.hover) next.pressed = OUTLINE_WASH_STEPS.find((x) => x > next.hover) ?? next.pressed;
  if (next.hover === d.hover && next.pressed === d.pressed) delete (brandState as { outlineWash?: unknown }).outlineWash;
  else setPath(brandState, 'outlineWash', next);
};
