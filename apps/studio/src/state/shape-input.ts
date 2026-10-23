/**
 * The Shape writes (UI redesign S7): every edit the legacy Size & radius page made to Density, radius softness,
 * Control shape and the base radius, and the readers the new Shape page's controls are built from. No DOM.
 *
 * BEHAVIOR-NEUTRAL (the S2 rule): each write is the bytes the legacy control wrote, its traps included.
 *   · Light writes the brand value with `setPath`, the default included: `density: 'comfortable'`,
 *     `radiusScale: 1`, `controlShape: 'rounded'` and `baseMd: 4` are WRITTEN when chosen, never unset (the legacy
 *     chips, sliders and selects did the same).
 *   · Another editable mode writes `modeLevers[mode].density` / `.radius` through the store's pruning helper, and
 *     Return to Auto unsets it (`setModeLever(…, undefined)`), so an all-cleared mode is byte-identical to never
 *     having had one. A value equal to Light's is written as a value, as the legacy select wrote it.
 *   · `controlShape`, `fieldStyle` (#2695), `searchFieldStyle` (#2888), `tagStyle` (#2887), `dialogTitleSize` (#2958) and `baseMd` are brand-wide (the engine has no per-mode value for either), so they write the
 *     same bytes from any editable mode (the Q54 rule).
 * The retired `radiusHairline` (#2053) has no writer: the engine always emits `radius.hairline`, so the switch
 * went with the legacy page and nothing here writes the key.
 *
 * AUTO FOLLOWS LIGHT, NOT A CUSTOM MODE'S BASE (scope finding 7). The engine resolves a mode's density and radius
 * from the brand value when the mode sets none (`theme.ts`, the per-mode radius and density loops read
 * `modeLevers[m]` against the brand's own `density` / `radiusScale`), so a custom mode based on Dark does not
 * follow Dark's override. `autoOf` reads the brand value for that reason, whatever the mode's base.
 */
import type { Density, ControlShape, FieldStyle, SearchFieldStyle, TagStyle, DialogTitleSize } from '@prism3/engine/scale';
import { brandState, getModeLever, getPath, setModeLever, setPath } from './store';
import { leverManifest } from '@prism3/engine/levers';

const defaultOf = (key: string): unknown => leverManifest.find((l) => l.key === key)?.default;

/** The brand (Light) value of a per-mode Shape lever: what every other mode follows while it is on Auto. */
export const brandDensity = (): Density => (getPath(brandState, 'density') ?? defaultOf('density') ?? 'comfortable') as Density;
export const brandRadiusScale = (): number => Number(getPath(brandState, 'radiusScale') ?? defaultOf('radiusScale') ?? 1);
export const brandControlShape = (): ControlShape => (getPath(brandState, 'controlShape') ?? defaultOf('controlShape') ?? 'rounded') as ControlShape;
export const brandFieldStyle = (): FieldStyle => (getPath(brandState, 'fieldStyle') ?? defaultOf('fieldStyle') ?? 'outline') as FieldStyle;
export const brandSearchFieldStyle = (): SearchFieldStyle => (getPath(brandState, 'searchFieldStyle') ?? defaultOf('searchFieldStyle') ?? 'follow') as SearchFieldStyle;
export const brandTagStyle = (): TagStyle => (getPath(brandState, 'tagStyle') ?? defaultOf('tagStyle') ?? 'pill') as TagStyle;
export const brandDialogTitleSize = (): DialogTitleSize => (getPath(brandState, 'dialogTitleSize') ?? defaultOf('dialogTitleSize') ?? 'large') as DialogTitleSize;
export const brandBaseMd = (): number => Number(getPath(brandState, 'baseMd') ?? defaultOf('baseMd') ?? 4);

/** A per-mode lever as a control reads it in `mode`: the value it resolves to, and whether the mode sets its own
 *  (false means Auto, following Light). Light is always "set": it is the brand value. */
export type PerMode<T> = { value: T; own: boolean };
export const densityIn = (mode: string): PerMode<Density> => {
  if (mode === 'light') return { value: brandDensity(), own: true };
  const v = getModeLever(mode, 'density') as Density | undefined;
  return { value: v ?? brandDensity(), own: v !== undefined };
};
export const radiusScaleIn = (mode: string): PerMode<number> => {
  if (mode === 'light') return { value: brandRadiusScale(), own: true };
  const v = getModeLever(mode, 'radius') as number | undefined;
  return { value: v ?? brandRadiusScale(), own: v !== undefined };
};

/** Density for `mode`: the brand value in Light (legacy `renderControl`'s chips), `modeLevers[mode].density`
 *  elsewhere, unset by `undefined` (legacy `renderPerModeDensity`'s Auto). */
export const setDensity = (mode: string, v: Density | undefined): void => {
  if (mode === 'light') { if (v !== undefined) setPath(brandState, 'density', v); return; }
  setModeLever(mode, 'density', v);
};
/** Radius softness for `mode`: `radiusScale` in Light (legacy slider, a number per input), `modeLevers[mode].radius`
 *  elsewhere (legacy `renderPerModeRadius`, a number), unset by `undefined`. */
export const setRadiusScale = (mode: string, v: number | undefined): void => {
  if (mode === 'light') { if (v !== undefined) setPath(brandState, 'radiusScale', Number(v)); return; }
  setModeLever(mode, 'radius', v === undefined ? undefined : Number(v));
};
/** Control shape, brand-wide (legacy chips). */
export const setControlShape = (v: ControlShape): void => { setPath(brandState, 'controlShape', v); };
/** Field style (#2695), brand-wide like Control shape: the engine has no per-mode value for it. */
export const setFieldStyle = (v: FieldStyle): void => { setPath(brandState, 'fieldStyle', v); };
/** Search field style (#2888), brand-wide like Field style. */
export const setSearchFieldStyle = (v: SearchFieldStyle): void => { setPath(brandState, 'searchFieldStyle', v); };
/** Tag style (#2887), brand-wide like Field style: the engine has no per-mode value for it. */
export const setTagStyle = (v: TagStyle): void => { setPath(brandState, 'tagStyle', v); };
/** Dialog title size (#2958), brand-wide like Tag style: one title size for every dialog. */
export const setDialogTitleSize = (v: DialogTitleSize): void => { setPath(brandState, 'dialogTitleSize', v); };
/** The base radius, brand-wide (legacy slider, a number). */
export const setBaseMd = (v: number): void => { setPath(brandState, 'baseMd', Number(v)); };
