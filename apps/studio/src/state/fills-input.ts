/**
 * The Surfaces & fills writes (UI redesign S4a): every edit Color › Surfaces & fills makes to the working
 * brand, and the readings its levers need, in one module with no DOM.
 *
 * WHY HERE AND NOT IN `main.ts`. These were closures inside the legacy Surfaces page (`renderSurfacesEditor`,
 * `renderForegroundsEditor`, `renderForegroundEditor` and the gradient editor). The new page must not import
 * `main.ts` (plan §3.10), so the writes moved out UNCHANGED IN WHAT THEY WRITE (the S2 rule: behavior-neutral,
 * byte for byte on the persisted brand input). Each function below names the legacy closure it came from.
 * What changed is only who repaints: the legacy closures called `applyFull()`; these call nothing, and the
 * caller calls `rebuild()`, which tells the `brand` topic.
 *
 * THE MODE A WRITE TARGETS IS AN ARGUMENT. The legacy editors wrote `currentMode` from inside; the new page
 * passes the mode the preview shows, which is the same store value (`setCurrentMode`), so the two agree.
 */
import type { GradientInput } from '@prism3/engine/theme';
import { brandState, setPath, theme } from './store';
import { resolvedModes } from './verdict';
import { STATUS_ROLES } from './palette-input';

/** A resolved role, the slice the levers read. */
export type FillRole = { hex: string; path?: string; ratio?: number; min?: number; against?: string };
/** Every role in `mode`, resolved from the current theme (one `resolveAllModes` per theme, shared). */
export const rolesIn = (mode: string): Record<string, FillRole | undefined> =>
  (resolvedModes(theme).find((x) => x.mode === mode)?.roles ?? {}) as Record<string, FillRole | undefined>;

/** A palette's step keys (`'050'`, `'100'`, …), in ramp order. */
export const stepsOf = (palette: string): string[] => (theme.palettes.find((p) => p.palette === palette)?.steps ?? []).map((s) => s.key);
/** A palette step's hex, by its key. */
export const stepHex = (palette: string, step: string): string | null =>
  theme.palettes.find((p) => p.palette === palette)?.steps.find((s) => s.key === step)?.hex ?? null;
/** The palette and step a resolved role's path names (`pds3.core.palette.primary.600` → primary, 600), or
 *  null for a fixed primitive with no step (`white`, `transparent`). */
export const stepOfPath = (path: string | undefined): { palette: string; step: string } | null => {
  if (!path) return null;
  const parts = path.split('.');
  const i = parts.indexOf('palette');
  if (i < 0 || parts.length < i + 3) return null;
  return { palette: parts[i + 1], step: parts[i + 2] };
};

// ── page surfaces (legacy `renderSurfacesEditor`) ────────────────────────────────────────────────────

/** The modes whose surfaces are configurable: `SurfacesConfig` is keyed by these two. A custom mode seeds
 *  its surface from its base mode. */
export const SURFACE_MODES = ['light', 'dark'] as const;
export type SurfaceMode = typeof SURFACE_MODES[number];

/** The neutral steps a page surface or a contrast floor can name, read off the brand's own neutral palette
 *  (labels padded as the token is: `neutral 050`). The stored value stays numeric. */
export const neutralStepOptions = (): Array<{ value: number; label: string }> => {
  const pal = theme.palettes.find((p) => p.palette === theme.roleToPalette.neutral);
  return (pal?.steps ?? []).map((s) => ({ value: Number(s.key), label: `${theme.roleToPalette.neutral} ${s.key}` }));
};
/** The page surface: `white`, `black` or a neutral step (the select's value as a string). */
export const setSurfaceBase = (mode: SurfaceMode, v: string): void => {
  setPath(brandState, `surfaces.${mode}.base`, v === 'white' || v === 'black' ? v : Number(v));
};
/** The contrast floor: a neutral step, or `''` for Auto. */
export const setSurfaceFloor = (mode: SurfaceMode, v: string): void => {
  setPath(brandState, `surfaces.${mode}.floorStep`, v === '' ? undefined : Number(v));
};
/** The palettes the inverse band can draw from (#898): neutral first, then every declared non-status
 *  palette. Status, alpha and the white and black keywords are excluded. */
export const bandPalettes = (): string[] => {
  const nPal = theme.roleToPalette.neutral;
  return [nPal, ...theme.palettes
    .filter((p) => p.palette !== nPal && !(STATUS_ROLES as readonly string[]).includes(p.role)
      && !/alpha/.test(p.palette) && p.palette !== 'white' && p.palette !== 'black')
    .map((p) => p.palette)];
};
/** The band as the input holds it: its palette and step, or the neutral default. */
export const bandOf = (mode: SurfaceMode): { palette: string; step: string | undefined } => {
  const nPal = theme.roleToPalette.neutral;
  const cur = brandState.surfaces?.[mode]?.inverseBase;
  return {
    palette: cur != null && typeof cur === 'object' ? cur.palette : nPal,
    step: cur == null ? undefined : String(typeof cur === 'object' ? cur.step : cur),
  };
};
/** `surfaces.<mode>.inverseBase`, never an `overrides` entry (#956): the band is a ground, read during
 *  derivation, so every role measured against it re-derives. */
const writeBand = (mode: SurfaceMode, v: number | { palette: string; step: number } | undefined): void => {
  setPath(brandState, `surfaces.${mode}.inverseBase`, v);
};
/** The band's palette. Neutral clears to the generated default; another palette seeds at its DARKEST step. */
export const setBandPalette = (mode: SurfaceMode, pal: string): void => {
  if (pal === theme.roleToPalette.neutral) return writeBand(mode, undefined);
  const st = stepsOf(pal);
  writeBand(mode, st.length ? { palette: pal, step: Number(st[st.length - 1]) } : undefined);
};
/** The band's step in its current palette; `undefined` is Auto. A neutral step writes a bare number (the
 *  historical form), another palette `{ palette, step }`. */
export const setBandStep = (mode: SurfaceMode, step: string | undefined): void => {
  const { palette } = bandOf(mode);
  writeBand(mode, step == null ? undefined : palette === theme.roleToPalette.neutral ? Number(step) : { palette, step: Number(step) });
};

// ── role overrides (legacy `setFillOverride`, `setLinkOverride`) ─────────────────────────────────────

/** Point `role` at `palette` `step` in `mode`, or revert it to the generated baseline (`undefined`), pruning
 *  an emptied mode and an emptied override map so a cleared brand is byte-identical to one never edited. */
export const setRoleOverride = (mode: string, role: string, palette: string, step: string | undefined): void => {
  const ov = brandState.overrides ?? (brandState.overrides = {});
  const forMode = ov[mode] ?? (ov[mode] = {});
  if (step === undefined) {
    delete forMode[role];
    if (!Object.keys(forMode).length) delete ov[mode];
    if (!Object.keys(ov).length) brandState.overrides = undefined;
  } else forMode[role] = { palette, step };
};
/** The link set moves together (#1486's relationship): hover and visited walk one and two steps off rest,
 *  focused equals rest, and Auto clears all four. A lone `text.link.default` override would leave hover
 *  lighter than rest, so whoever offers the control re-establishes the relationship. */
export const LINK_ROLES = ['text.link.default', 'text.link.hover', 'text.link.visited', 'text.link.focused'] as const;
export const setLinkOverride = (mode: string, palette: string, step: string | undefined): void => {
  if (step === undefined) {
    for (const r of LINK_ROLES) setRoleOverride(mode, r, palette, undefined);
    return;
  }
  const steps = stepsOf(palette);
  const i = steps.indexOf(step);
  const at = (n: number): string => steps[Math.min(i + n, steps.length - 1)];
  setRoleOverride(mode, 'text.link.default', palette, step);
  setRoleOverride(mode, 'text.link.hover', palette, at(1));
  setRoleOverride(mode, 'text.link.visited', palette, at(2));
  setRoleOverride(mode, 'text.link.focused', palette, step);
};
/** The step `role` is overridden to in `mode`, or undefined. */
export const overrideOf = (mode: string, role: string): string | undefined => {
  const s = brandState.overrides?.[mode]?.[role]?.step;
  return typeof s === 'string' ? s : undefined;
};

/** One overridable row: the role, its label, and the palette key its steps come from (`roleToPalette`). */
export type FillRow = { readonly role: string; readonly label: string; readonly paletteKey: string };
/** The bold fills (concept v6's five, in the legacy editor's order), then the neutral surface tiers the
 *  legacy Foreground fills editor carried. They stay rows here: the Roles matrix (S4b) is a secondary view,
 *  never the only editor of a role (owner decision Q20, `decisions-2026-10-01-qa.md`). */
export const FILL_ROWS: readonly FillRow[] = [
  { role: 'foreground.brand', label: 'Brand', paletteKey: 'brand' },
  { role: 'foreground.success', label: 'Success', paletteKey: 'success' },
  { role: 'foreground.warning', label: 'Warning', paletteKey: 'warning' },
  { role: 'foreground.info', label: 'Info', paletteKey: 'info' },
  { role: 'foreground.danger', label: 'Danger', paletteKey: 'danger' },
  { role: 'foreground.primary', label: 'Surface — card', paletteKey: 'neutral' },
  { role: 'foreground.secondary', label: 'Surface — panel', paletteKey: 'neutral' },
  { role: 'foreground.tertiary', label: 'Surface — nested', paletteKey: 'neutral' },
];
/** The field fill (#1341): transparent by default; a neutral step gives the field a solid surface. A step is
 *  judged by the value ink on it (`text.primary` at 4.5:1). */
export const FIELD_FILL = { role: 'field.fill', label: 'Field fill', paletteKey: 'neutral', ink: 'text.primary', floor: 4.5 } as const;
/** The text rows the legacy page's Text section carried: the neutral ladder, then the semantic and link
 *  inks, each keyed to its own palette. `text.link.default` moves the link set (`setLinkOverride`). */
export const TEXT_ROWS: readonly FillRow[] = [
  { role: 'text.primary', label: 'Primary text', paletteKey: 'neutral' },
  { role: 'text.secondary', label: 'Secondary text', paletteKey: 'neutral' },
  { role: 'text.tertiary', label: 'Tertiary text', paletteKey: 'neutral' },
  { role: 'text.brand', label: 'Brand ink', paletteKey: 'brand' },
  { role: 'text.success', label: 'Success ink', paletteKey: 'success' },
  { role: 'text.warning', label: 'Warning ink', paletteKey: 'warning' },
  { role: 'text.danger', label: 'Danger ink', paletteKey: 'danger' },
  { role: 'text.info', label: 'Info ink', paletteKey: 'info' },
  { role: 'text.brand-subtle', label: 'Brand ink, muted', paletteKey: 'brand' },
  { role: 'text.success-subtle', label: 'Success ink, muted', paletteKey: 'success' },
  { role: 'text.warning-subtle', label: 'Warning ink, muted', paletteKey: 'warning' },
  { role: 'text.danger-subtle', label: 'Danger ink, muted', paletteKey: 'danger' },
  { role: 'text.info-subtle', label: 'Info ink, muted', paletteKey: 'info' },
  { role: 'text.link.default', label: 'Link', paletteKey: 'action' },
];
/** The palette a row's steps come from: `roleToPalette[paletteKey]`, or the key itself (neutral). */
export const paletteOf = (row: FillRow): string => (theme.roleToPalette as Record<string, string>)[row.paletteKey] ?? row.paletteKey;
/** Write a row: the link set as a set, any other role on its own. */
export const setRowOverride = (mode: string, row: FillRow, step: string | undefined): void => {
  const palette = paletteOf(row);
  if (row.role === 'text.link.default') setLinkOverride(mode, palette, step);
  else setRoleOverride(mode, row.role, palette, step);
};

// ── gradients (legacy gradient editor) ───────────────────────────────────────────────────────────────

/** What `true` materializes to on the first edit: the engine's default brand gradient, written out. */
export const DEFAULT_GRADIENT = (): GradientInput => ({
  name: 'brand', kind: 'linear', angle: 135, interpolation: 'oklch',
  stops: [{ palette: 'primary', step: 600, position: 0 }, { palette: 'primary', step: 350, position: 1 }],
});
/** The editable gradient array: `true` materialized to the default, `false` or absent read as empty. An
 *  explicit array is returned as itself, so an edit through it edits the brand in place, as before. */
export const readGradients = (): GradientInput[] => {
  const g = brandState.gradients;
  if (Array.isArray(g)) return g;
  if (g === true) return [DEFAULT_GRADIENT()];
  return [];
};
/** Write the array back; an empty array collapses to `false` (off). */
export const writeGradients = (arr: GradientInput[]): void => { brandState.gradients = arr.length ? arr : false; };
/** The on/off switch: `true` ships the engine's default gradient, `false` none. */
export const setGradientsOn = (on: boolean): void => { brandState.gradients = on; };
/** Change gradient `gi` through `fn`, then write the array back. */
export const editGradient = (gi: number, fn: (g: GradientInput) => void): void => {
  const arr = readGradients();
  fn(arr[gi]);
  writeGradients(arr);
};
/** Add a linear gradient with the next free `gradient-<n>` name (a name is a token-path segment). */
export const addGradient = (): void => {
  const arr = readGradients();
  const used = new Set(arr.map((x) => x.name));
  let n = arr.length + 1, name = `gradient-${n}`;
  while (used.has(name)) name = `gradient-${++n}`;
  arr.push({ ...DEFAULT_GRADIENT(), name });
  writeGradients(arr);
};
export const removeGradient = (gi: number): void => { const arr = readGradients(); arr.splice(gi, 1); writeGradients(arr); };
/** Rename: slugified, kept unique against the others. Returns false (nothing written) when it slugs to
 *  nothing, so the field puts the old name back. */
export const renameGradient = (gi: number, raw: string): boolean => {
  let v = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!v) return false;
  const all = readGradients();
  const used = new Set(all.filter((_, i) => i !== gi).map((x) => x.name));
  while (used.has(v)) v = `${v}-2`;
  const arr = readGradients(); arr[gi] = { ...arr[gi], name: v }; writeGradients(arr);
  return true;
};
export const clampUnit = (n: number): number => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
/** A stop's palette: its step re-homed to the same step in the new palette, else 500, else the middle. */
export const setStopPalette = (gi: number, si: number, pal: string): void => editGradient(gi, (gg) => {
  const steps = theme.palettes.find((p) => p.palette === pal)?.steps ?? [];
  const keep = steps.find((s) => s.num === gg.stops[si].step)?.num ?? steps.find((s) => s.num === 500)?.num ?? steps[Math.floor(steps.length / 2)]?.num ?? gg.stops[si].step;
  gg.stops[si] = { ...gg.stops[si], palette: pal, step: keep };
});
export const setStopStep = (gi: number, si: number, step: number): void => editGradient(gi, (gg) => { gg.stops[si] = { ...gg.stops[si], step }; });
/** A stop's position, from a percent. */
export const setStopPosition = (gi: number, si: number, pct: number): void => editGradient(gi, (gg) => { gg.stops[si] = { ...gg.stops[si], position: clampUnit(pct / 100) }; });
/** Add a stop at the end, copying the last stop's palette and step, at position 1. */
export const addStop = (gi: number): void => editGradient(gi, (gg) => {
  const palNames = theme.palettes.map((p) => p.palette);
  const last = gg.stops[gg.stops.length - 1];
  gg.stops = [...gg.stops, { palette: last?.palette ?? palNames[0], step: last?.step ?? 500, position: 1 }];
});
/** Remove a stop; the editor offers this only while a gradient has more than two. */
export const removeStop = (gi: number, si: number): void => editGradient(gi, (gg) => { gg.stops = gg.stops.filter((_, i) => i !== si); });
/** A radial gradient's center, one axis, from a percent. */
export const setCenter = (gi: number, idx: 0 | 1, pct: number): void => editGradient(gi, (gg) => {
  const c: [number, number] = [...(gg.center ?? [0.5, 0.5])] as [number, number];
  c[idx] = clampUnit(pct / 100);
  gg.center = c;
});
/** A stop's ramp hex, for the levers' swatches (unresolved: `#888888`, as before). */
export const gradStopHex = (palette: string, step: number): string =>
  theme.palettes.find((p) => p.palette === palette)?.steps.find((s) => s.num === step)?.hex ?? '#888888';
/** The CSS for an INPUT gradient, stops resolved through the ramp, interpolated as its select says. */
export const inputGradientCss = (g: GradientInput): string => {
  const stops = g.stops.slice().sort((a, b) => a.position - b.position)
    .map((s) => `${gradStopHex(s.palette, s.step)} ${Math.round(s.position * 100)}%`).join(', ');
  const interp = g.interpolation ?? 'oklch';
  return (g.kind ?? 'linear') === 'radial'
    ? `radial-gradient(${g.shape ?? 'ellipse'} at ${Math.round((g.center?.[0] ?? 0.5) * 100)}% ${Math.round((g.center?.[1] ?? 0.5) * 100)}% in ${interp}, ${stops})`
    : `linear-gradient(${g.angle ?? 135}deg in ${interp}, ${stops})`;
};
