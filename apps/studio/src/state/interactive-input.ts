/**
 * The Color › Interactive writes (UI redesign S5.1): every edit the legacy Interactive page makes to the
 * working brand, the "Auto" baselines its pickers name, and the registry of its rows, in one module with no DOM.
 *
 * WHY HERE AND NOT IN `main.ts`. These were closures inside the legacy page (`renderInteractiveMatrix` and
 * its helpers in `main.ts`). The new page (S5.2) must not import `main.ts` (plan §3.10), so the writes moved
 * out first, UNCHANGED IN WHAT THEY WRITE (the S2 rule: behavior-neutral, byte for byte on the persisted brand
 * input), and the legacy page calls them in place. Each function names the legacy closure it came from. What
 * changed is only who repaints: the legacy closures called `applyFull()`; these call nothing, and the caller
 * repaints (the legacy page through `applyFull()`, the new page through `rebuild()`).
 *
 * THE MODE A WRITE TARGETS IS AN ARGUMENT. The legacy page wrote `currentMode` from inside; the caller passes
 * it, as `fills-input.ts` does.
 *
 * WHAT IS NOT A WRITE HERE. A lever chip or select (`outlineInteraction`, `neutralEmphasis`, `actionPalette`,
 * `linkPalette`, `iconContrast`, `disabledStrategy`, `disabledMin`) writes `setPath(brandState, key, v)`,
 * which `setLever` below is, named so the page has one door. The link-family pin (`setLinkFamilyOverride`)
 * keeps the legacy semantics exactly, including the palette it reads (`theme.linkPalette`). It is the studio's
 * only link write: Surfaces & fills' link row is gone (#1961, owner decision Q28).
 */
import { resolveAllModes } from '@prism3/engine/modes';
import type { Theme } from '@prism3/engine/theme';
import { brandState, setPath, theme } from './store';
import { setRoleOverride, stepsOf } from './fills-input';

/** The last dot-segment of a token path: the palette step key (`…primary.650` → `650`). */
export const stepKeyOf = (path: string | undefined): string => (path ? path.split('.').pop()! : '');

// ── "Auto" baselines (#330, legacy `baselineOf` / `baselineStepOf` / `baselineAnchorStepOf`) ──────────
// Every picker's "Auto" names the step it RESOLVES to with the picker's own live deviation removed, from a
// re-resolved theme clone (not the live role, which already reflects the deviation). The full reasoning is
// on the legacy helpers' comment block, which moved here with them.

/** The step `roleKey` resolves to in `mode` on the theme `without(theme)` returns. Resolved directly, not
 *  through `verdict.ts`'s one-slot cache, which a throwaway clone would evict from under the live theme. */
export const baselineOf = (roleKey: string, mode: string, without: (t: Theme) => Theme): string => {
  const roles = resolveAllModes(without(theme)).find((x) => x.mode === mode)?.roles as Record<string, { path?: string } | undefined> | undefined;
  return stepKeyOf(roles?.[roleKey]?.path);
};
/** The baseline under the per-mode color-override layer: `roleKey`'s own override in `mode` cleared. */
export const baselineStepOf = (roleKey: string, mode: string): string =>
  baselineOf(roleKey, mode, (t) => {
    const modeOv = { ...(t.overrides?.[mode] ?? {}) };
    delete modeOv[roleKey];
    return { ...t, overrides: { ...t.overrides, [mode]: modeOv } };
  });
/** The baseline under the fill-anchor layer for column `name`: exactly what `setAnchor(mode, name, undefined)`
 *  clears, the per-mode pin outside Light or Light's own global pin on Light. */
export const baselineAnchorStepOf = (roleKey: string, mode: string, name: string): string =>
  baselineOf(roleKey, mode, (t) => (mode === 'light'
    ? {
        ...t,
        actionAnchorStep: name === 'primary' ? undefined : t.actionAnchorStep,
        destructiveAnchorStep: name === 'destructive' ? undefined : t.destructiveAnchorStep,
        interactivePalettes: t.interactivePalettes.map((p) => (p.name === name ? { ...p, anchorStep: undefined } : p)),
      }
    : { ...t, modeAnchors: { ...t.modeAnchors, [mode]: { ...(t.modeAnchors?.[mode] ?? {}), [name]: undefined } } }));

// ── levers (legacy `iEnumControl`, `actionPaletteLead`, `linkPaletteLead`, the `disabledMin` slider) ───

/** A global lever: written to the input as is, in every mode. */
export const setLever = (key: string, v: unknown): void => { setPath(brandState, key, v); };

// ── the two writes the legacy page had no control for (S5.2) ────────────────────────────────────────

/** The link palette (#1496), or `undefined` for Auto: links follow the action palette (owner decision Q36).
 *  Auto UNSETS the key; it never writes the action palette's name, which would pin links to today's action
 *  palette and stop them following it. */
export const setLinkPalette = (v: string | undefined): void => setLever('linkPalette', v);
/** Strict interactive contrast: on writes `true`; off UNSETS the key (the engine's default is off), so a
 *  brand switched on and off again is byte-identical to one never touched. */
export const setStrictInteractiveContrast = (on: boolean): void => setLever('strictInteractiveContrast', on ? true : undefined);

// ── fill anchors (legacy `renderInteractiveMatrix`'s `anchor()`) ────────────────────────────────────

/** The accent entry a column name names (`name ?? palette`), by index. */
const accentIndex = (col: string): number => (brandState.interactivePalettes ?? []).findIndex((e) => (e.name ?? e.palette) === col);
/** The anchor step column `col` is pinned to in `mode`, or undefined (Auto). Light reads the column's
 *  global field; another mode its `modeAnchors` entry. Neutral has no anchor. */
export const anchorOf = (mode: string, col: string): number | undefined => {
  if (mode !== 'light') return brandState.modeAnchors?.[mode]?.[col];
  if (col === 'primary') return brandState.actionAnchorStep;
  if (col === 'destructive') return brandState.destructiveAnchorStep;
  const i = accentIndex(col);
  return i < 0 ? undefined : brandState.interactivePalettes![i].anchorStep;
};
/** Pin column `col`'s fill anchor in `mode`, or clear it (`undefined`). Light writes the column's global
 *  field (`actionAnchorStep`, `destructiveAnchorStep`, or the accent's `anchorStep`); any other mode writes
 *  `modeAnchors[mode][col]`, pruning an emptied mode and an emptied map so a cleared brand is byte-identical
 *  to one never edited. */
export const setAnchor = (mode: string, col: string, v: number | undefined): void => {
  if (mode === 'light') {
    if (col === 'primary') return setPath(brandState, 'actionAnchorStep', v);
    if (col === 'destructive') return setPath(brandState, 'destructiveAnchorStep', v);
    const i = accentIndex(col);
    if (i >= 0) setPath(brandState, `interactivePalettes.${i}.anchorStep`, v);
    return;
  }
  const ma = brandState.modeAnchors ?? (brandState.modeAnchors = {});
  const forMode = ma[mode] ?? (ma[mode] = {});
  if (v === undefined) { delete forMode[col]; if (!Object.keys(forMode).length) delete ma[mode]; if (!Object.keys(ma).length) brandState.modeAnchors = undefined; }
  else forMode[col] = v;
};

// ── role overrides (legacy `setFillOverride`, `invFillSourceSelect`) ─────────────────────────────────

/** The inverse fill's source (#1384): `''` is Auto (crisp white or black), otherwise `‹palette›::‹step›`,
 *  one select spanning the column's palette and neutral. Auto clears the override under the assigned palette. */
export const setInverseFillSource = (mode: string, role: string, assignedPalette: string, value: string): void => {
  if (value === '') return setRoleOverride(mode, role, assignedPalette, undefined);
  const [pal, step] = value.split('::');
  setRoleOverride(mode, role, pal, step);
};

// ── links (legacy `setLinkRung`, `setLinkFamilyOverride`) ──────────────────────────────────────────

export type LinkRungState = 'hover' | 'pressed' | 'visited';
/** The global per-state link rung (#1510): a step count past the resting link, or `undefined` (Auto) for
 *  the tuned walk. Mode- and family-invariant; an emptied map is pruned. */
export const setLinkRung = (state: LinkRungState, rung: number | undefined): void => {
  const m = brandState.linkStateRungs ?? (brandState.linkStateRungs = {});
  if (rung === undefined) delete m[state]; else m[state] = rung;
  if (!Object.keys(m).length) brandState.linkStateRungs = undefined;
};
/** The five link states a family carries, in the engine's walk order. */
export const LINK_STATES = ['default', 'hover', 'pressed', 'visited', 'focused'] as const;
/** The link families, by role prefix. */
export const LINK_FAMILIES = ['text', 'inverse.text', 'icon', 'inverse.icon'] as const;
/** Pin link family `prefix` in `mode` (#1510): `default` and `focused` take `step`, each engaged state keeps
 *  the signed step distance from the resting link its derived layout has, clamped to the ramp, all from
 *  `theme.linkPalette` (#1496). `undefined` (Auto) clears all five. The baselines are read off the theme as
 *  it stands when the call is made. */
export const setLinkFamilyOverride = (mode: string, prefix: string, step: string | undefined): void => {
  const pal = theme.linkPalette;
  const steps = stepsOf(pal);
  if (step === undefined) { for (const st of LINK_STATES) setRoleOverride(mode, `${prefix}.link.${st}`, pal, undefined); return; }
  const idx = (k: string): number => steps.indexOf(k);
  const clamp = (i: number): number => Math.max(0, Math.min(steps.length - 1, i));
  const defBase = idx(baselineStepOf(`${prefix}.link.default`, mode));
  const i0 = idx(step);
  for (const st of LINK_STATES) {
    if (st === 'default' || st === 'focused') { setRoleOverride(mode, `${prefix}.link.${st}`, pal, step); continue; }
    const dist = idx(baselineStepOf(`${prefix}.link.${st}`, mode)) - defBase;
    setRoleOverride(mode, `${prefix}.link.${st}`, pal, steps[clamp(i0 + dist)]);
  }
};

// ── columns (legacy `renderAddAccentRow`, the column's remove) ──────────────────────────────────────

/** Promote `palette` to an interactive column; the engine names it after the palette. */
export const addAccent = (palette: string): void => {
  const arr = brandState.interactivePalettes ?? (brandState.interactivePalettes = []);
  arr.push({ palette });
};
/** Remove accent column `i`; an emptied list is pruned. */
export const removeAccent = (i: number): void => {
  brandState.interactivePalettes!.splice(i, 1);
  if (!brandState.interactivePalettes!.length) brandState.interactivePalettes = undefined;
};

// ── the row registry (the Roles hook, like `FILL_ROWS` / `TEXT_ROWS`) ────────────────────────────────

/** How a row writes. `anchor`: the column's fill anchor (`setAnchor`). `override`: a per-mode role override
 *  from the row's palette. `inverse-fill`: `setInverseFillSource`. `link-family`: the family pin. `readout`:
 *  a translucent wash with no ramp step to pick, so no write (the legacy page reads it out, #1210). */
export type InteractiveWrite = 'anchor' | 'override' | 'inverse-fill' | 'link-family' | 'readout';
/** One row of the legacy page, by the role it edits. `group` is the legacy row label, `label` the cell's
 *  (the row label at rest, `Hover` or `Pressed` for its states). `paletteKey` names the palette its steps
 *  come from: a `roleToPalette` key, `link` for `theme.linkPalette`, or an accent's own palette. */
export type InteractiveRow = {
  readonly role: string; readonly group: string; readonly label: string;
  readonly paletteKey: string; readonly write: InteractiveWrite; readonly column?: string;
};

/** The rows a column carries, in the legacy page's order. `paletteKey` is the column's own (`action`,
 *  `neutral`, `danger`, or an accent's palette). Neutral's fill has no anchor, so it is an override; the
 *  overlay wash and the subtle tint are read-outs. */
export const interactiveRowsFor = (col: string, paletteKey: string): InteractiveRow[] => {
  const out: InteractiveRow[] = [];
  const row = (role: string, group: string, label: string, pk: string, write: InteractiveWrite): void => { out.push({ role, group, label, paletteKey: pk, write, column: col }); };
  const withStates = (base: string, group: string, pk: string, rest: InteractiveWrite, states: InteractiveWrite): void => {
    row(`${base}.rest`, group, group, pk, rest);
    row(`${base}.hover`, group, 'Hover', pk, states);
    row(`${base}.pressed`, group, 'Pressed', pk, states);
  };
  const p = `interactive.${col}`, inv = `inverse.interactive.${col}`;
  withStates(`${p}.fill`, 'Fill · rest', paletteKey, col === 'neutral' ? 'override' : 'anchor', 'override');
  withStates(`${inv}.fill`, 'Fill · inverse', paletteKey, 'inverse-fill', 'override');
  withStates(`${p}.text`, 'Text · rest', paletteKey, 'override', 'override');
  withStates(`${inv}.text`, 'Text · inverse', paletteKey, 'override', 'override');
  withStates(`${p}.border`, 'Border · rest', paletteKey, 'override', 'override');
  withStates(`${inv}.border`, 'Border · inverse', paletteKey, 'override', 'override');
  row(`${p}.overlay.hover`, 'Overlay wash', 'Overlay wash', 'neutral', 'readout');
  row(`${p}.overlay.pressed`, 'Overlay wash', 'Pressed', 'neutral', 'readout');
  row(`${p}.subtle-fill.hover`, 'Subtle tint', 'Subtle tint', paletteKey, 'readout');
  row(`${p}.subtle-fill.pressed`, 'Subtle tint', 'Pressed', paletteKey, 'readout');
  row(`${p}.on-fill`, 'On-fill text', 'On-fill text', 'neutral', 'override');
  row(`${inv}.on-fill`, 'On-fill text · inverse', 'On-fill text · inverse', 'neutral', 'override');
  return out;
};
/** The link rows: each family's resting link (the family pin), in the legacy Links section's order. */
export const LINK_ROWS: readonly InteractiveRow[] = [
  { role: 'text.link.default', group: 'Text link', label: 'Text link', paletteKey: 'link', write: 'link-family' },
  { role: 'inverse.text.link.default', group: 'Text link · inverse', label: 'Text link · inverse', paletteKey: 'link', write: 'link-family' },
  { role: 'icon.link.default', group: 'Icon link', label: 'Icon link', paletteKey: 'link', write: 'link-family' },
  { role: 'inverse.icon.link.default', group: 'Icon link · inverse', label: 'Icon link · inverse', paletteKey: 'link', write: 'link-family' },
];
/** The built-in columns, by name, with the palette key each draws its steps from. */
export const BUILT_IN_COLUMNS: ReadonlyArray<readonly [string, string]> = [['primary', 'action'], ['neutral', 'neutral'], ['destructive', 'danger']];
/** Every row of the three built-in columns, then the link rows. An accent's rows are `interactiveRowsFor`. */
export const INTERACTIVE_ROWS: readonly InteractiveRow[] = [
  ...BUILT_IN_COLUMNS.flatMap(([col, pk]) => interactiveRowsFor(col, pk)),
  ...LINK_ROWS,
];

/** The palette a row's steps come from: `theme.linkPalette` for `link`, else `roleToPalette[key]`, else the
 *  key itself (an accent's palette). */
export const interactivePaletteOf = (row: InteractiveRow): string =>
  row.paletteKey === 'link' ? theme.linkPalette : (theme.roleToPalette as Record<string, string>)[row.paletteKey] ?? row.paletteKey;
/** Write a row in `mode`. `value` is a step key (an anchor as its number, an inverse fill as `''` or
 *  `‹palette›::‹step›`), or `undefined` for Auto. A read-out row writes nothing. */
export const writeInteractiveRow = (mode: string, row: InteractiveRow, value: string | undefined): void => {
  const palette = interactivePaletteOf(row);
  switch (row.write) {
    case 'anchor': return setAnchor(mode, row.column!, value === undefined ? undefined : Number(value));
    case 'override': return setRoleOverride(mode, row.role, palette, value);
    case 'inverse-fill': return setInverseFillSource(mode, row.role, palette, value ?? '');
    case 'link-family': return setLinkFamilyOverride(mode, row.role.slice(0, -'.link.default'.length), value);
    case 'readout': return;
  }
};
