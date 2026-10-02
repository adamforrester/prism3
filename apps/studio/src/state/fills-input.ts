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
 * Since S4c the surface writes take it too (owner decision Q22): the page draws one set of surface controls,
 * for the previewed mode, where it drew a Light group and a Dark group, and each writes what that mode's group
 * wrote.
 *
 * WHAT S4c CHANGED IN WHAT IS WRITTEN. The link row and its set write (`setLinkOverride`) are gone: links are
 * edited on Color › Interactive only (owner decision Q28, #1961). The Fields rows (Q29, #1962) are new: seven
 * roles that had no editor, each a plain `setRoleOverride`, the write `field.fill` always had.
 *
 * WHAT S4d ADDS (owner decisions Q44 to Q50). Rows for the 83 Surfaces & fills roles that had no editor, each a
 * plain `setRoleOverride` on the palette the engine derives the role from (measured: every one takes a step of
 * that palette, in light and dark, on all three corpus brands): the subtle fills and the on-color inks, the
 * inverse ladders, fills, inks and borders, the page borders, and the icons. The icon rows are LOCKED while
 * icons match text (`iconContrast: 'text'`, the engine's #1968: a text override then carries to its icon twin),
 * and `unpairIcons` writes the lever's other value, exactly as the lever's own control does. Two roles stay
 * read-only by declared reason: the focus rings (#1966). The page and the band step keep their writes; only
 * their control became the step picker (Q45).
 */
import type { GradientInput } from '@prism3/engine/theme';
import { BUILTIN_MODES } from '@prism3/engine/modes';
import { brandState, setPath, theme } from './store';
import { resolvedModes } from './verdict';
import { STATUS_ROLES } from './palette-input';

/** A resolved role, the slice the levers read. `alpha` is set on a translucent role (a wash: the scrim, the
 *  veils), whose `hex` is its opaque base, never the color anyone sees. */
export type FillRole = { hex: string; path?: string; ratio?: number; min?: number; against?: string; alpha?: number };
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
/** Which surfaces the controls show while the preview shows `mode` (owner decision Q22: every semantic page
 *  edits the mode the preview shows). Light and Dark are their own, and editable. Any other mode has no
 *  surfaces of its own, so its controls show the ones it is drawn from, read-only: a derived mode its
 *  family's (the engine's `BUILTIN_MODES`), a custom mode its base mode's. */
export const surfaceSourceOf = (mode: string): { source: SurfaceMode; editable: boolean } => {
  if ((SURFACE_MODES as readonly string[]).includes(mode)) return { source: mode as SurfaceMode, editable: true };
  const base = BUILTIN_MODES.find((d) => d.name === mode)?.family ?? brandState.customModes?.find((c) => c.name === mode)?.base;
  return { source: base === 'dark' ? 'dark' : 'light', editable: false };
};

/** The token each surface control sets, by the `surfaces.<mode>` field it writes: the page writes `base`,
 *  which the engine paints as `background.primary`; the inverse band writes `inverseBase`, painted as
 *  `inverse.background.primary` (#956). The controls name it, so the lever lines up with the preview. The
 *  contrast floor is a setting, not a token, and is not here. */
export const SURFACE_TOKENS = { base: 'background.primary', inverseBase: 'inverse.background.primary' } as const;
/** The scrim (owner decision, 2026-10-02): a read-only row in Background fills, the role the preview's Background
 *  section ends on. It is a translucent wash (`<ns>.black-alpha.<n>`), so it has no ramp step to pick: the row
 *  reads out its primitive and its opacity, as the legacy Interactive page's wash read-out (`washSourceRead`
 *  in `main.ts`) does. */
export const SCRIM_ROLE = 'scrim.default';
/** A wash's read-out: its primitive by palette and step (`black-alpha 40`), and its opacity in percent. */
export const washReadOf = (r: FillRole): { primitive: string; opacity: number } => {
  const parts = (r.path ?? '').split('.');
  return { primitive: parts.length >= 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : (r.path ?? '—'), opacity: Math.round((r.alpha ?? 1) * 100) };
};
/** The neutral steps a page surface or a contrast floor can name, read off the brand's own neutral palette
 *  (labels padded as the token is: `neutral 050`). The stored value stays numeric. */
export const neutralStepOptions = (): Array<{ value: number; label: string }> => {
  const pal = theme.palettes.find((p) => p.palette === theme.roleToPalette.neutral);
  return (pal?.steps ?? []).map((s) => ({ value: Number(s.key), label: `${theme.roleToPalette.neutral} ${s.key}` }));
};
/** The page's choices as the step picker lists them (owner decision Q45, the select's option set unchanged):
 *  White, every neutral step by its key, then Black. White and Black are the engine's fixed primitives
 *  (`core.palette.white`, `.black`), not ramp steps. The picker hands back the key, which `setSurfaceBase`
 *  writes exactly as the select's value was written (`'050'` and `'50'` are both the number 50). */
export const pageSteps = (): Array<{ key: string; hex: string }> => {
  const pal = theme.palettes.find((p) => p.palette === theme.roleToPalette.neutral);
  return [{ key: 'white', hex: '#ffffff' }, ...(pal?.steps ?? []).map((s) => ({ key: s.key, hex: s.hex })), { key: 'black', hex: '#000000' }];
};
/** The picker key for a stored page base (`'white'`, `'black'`, or the neutral step's key for a number). */
export const pageKeyOf = (base: string | number): string =>
  typeof base === 'number' ? (pageSteps().find((s) => s.key !== 'white' && s.key !== 'black' && Number(s.key) === base)?.key ?? String(base)) : base;
/** The page surface: `white`, `black` or a neutral step (the select's value, or the picker's key). */
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

// ── role overrides (legacy `setFillOverride`) ────────────────────────────────────────────────────────

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
/** The step `role` is overridden to in `mode`, or undefined. */
export const overrideOf = (mode: string, role: string): string | undefined => {
  const s = brandState.overrides?.[mode]?.[role]?.step;
  return typeof s === 'string' ? s : undefined;
};

/** One overridable row: the role, its label, and the palette key its steps come from (`roleToPalette`).
 *  `transparent` marks a fill that is transparent until it is overridden (#1341): its swatch shows the
 *  `ground` it sits on, and a step is judged by the value `ink` on it at `floor`, because the engine measures
 *  the fill against itself (no ratio of its own). `sub` starts a group inside the section (the preview's own
 *  sub-heading, "Inverse"), drawn before the first row that carries it. `follows` marks an icon row: the text
 *  role it follows while icons match text (Q50). */
export type FillRow = {
  readonly role: string; readonly label: string; readonly paletteKey: string;
  readonly transparent?: { readonly ground: string; readonly ink: string; readonly floor: number };
  readonly sub?: string;
  readonly follows?: string;
};
/** The five semantic families, in the order the fill rows list them (the legacy Foreground fills editor's). */
const SEM = [['brand', 'Brand'], ['success', 'Success'], ['warning', 'Warning'], ['info', 'Info'], ['danger', 'Danger']] as const;
/** The same five in the order the text rows list them (the legacy Text section's). */
const SEM_TEXT = [['brand', 'Brand'], ['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']] as const;
/** The three neutral tiers. */
const TIERS = [['primary', 'Primary'], ['secondary', 'Secondary'], ['tertiary', 'Tertiary']] as const;
/** The "Inverse" group's sub-heading: the preview sections' own word for the same roles (Q23). */
export const INVERSE_SUB = 'Inverse';
/** Mark the first row of a group with its sub-heading. */
const grouped = (sub: string, rows: FillRow[]): FillRow[] => rows.map((r, i) => (i === 0 ? { ...r, sub } : r));
/** The Foreground section (owner decision Q44): the neutral ladder of surfaces placed on the page, labeled
 *  Primary, Secondary and Tertiary, then its inverse ladder, as the preview's Foreground section draws them. */
export const FOREGROUND_ROWS: readonly FillRow[] = [
  ...TIERS.map(([k, l]) => ({ role: `foreground.${k}`, label: l, paletteKey: 'neutral' })),
  ...grouped(INVERSE_SUB, TIERS.map(([k, l]) => ({ role: `inverse.foreground.${k}`, label: l, paletteKey: 'neutral' }))),
];
/** The fills (Foreground fills): concept v6's five bold fills, in the legacy editor's order; their subtle tints
 *  and the on-color inks that sit on the bold fills (Q49: the preview's Foreground section pairs each fill with
 *  its on-surface text); then the inverse band's bold and subtle fills. The neutral tiers moved to the
 *  Foreground section (Q44). Every role keeps a normal row (owner decision Q20; the Roles matrix is not built,
 *  Q31). The on-color inks resolve to white, black or a light neutral step, so they pick neutral steps. */
export const FILL_ROWS: readonly FillRow[] = [
  ...SEM.map(([k, l]) => ({ role: `foreground.${k}`, label: l, paletteKey: k })),
  ...SEM.map(([k, l]) => ({ role: `foreground.${k}-subtle`, label: `${l}, subtle`, paletteKey: k })),
  ...SEM.map(([k, l]) => ({ role: `text.on-${k}`, label: `On ${l.toLowerCase()}`, paletteKey: 'neutral' })),
  ...grouped(INVERSE_SUB, [
    ...SEM.map(([k, l]) => ({ role: `inverse.foreground.${k}`, label: l, paletteKey: k })),
    ...SEM.map(([k, l]) => ({ role: `inverse.foreground.${k}-subtle`, label: `${l}, subtle`, paletteKey: k })),
  ]),
];
/** The ink rows under `prefix` (`text`, `inverse.text`): the neutral ladder, the semantic inks, then their subtle
 *  forms, each keyed to its own palette, with the labels the legacy page's Text section used, except that the
 *  subtle forms say "subtle", the token's own word, where the legacy page said "muted" (owner decision Q57). */
const inkRows = (prefix: string): FillRow[] => [
  ...TIERS.map(([k, l]) => ({ role: `${prefix}.${k}`, label: `${l} text`, paletteKey: 'neutral' })),
  ...SEM_TEXT.map(([k, l]) => ({ role: `${prefix}.${k}`, label: `${l} ink`, paletteKey: k })),
  ...SEM_TEXT.map(([k, l]) => ({ role: `${prefix}.${k}-subtle`, label: `${l} ink, subtle`, paletteKey: k })),
];
/** The text rows the legacy page's Text section carried, then the inverse band's inks under "Inverse" (Q49).
 *  The link ink is not here: links are edited on Color › Interactive only (owner decision Q28, #1961). */
export const TEXT_ROWS: readonly FillRow[] = [...inkRows('text'), ...grouped(INVERSE_SUB, inkRows('inverse.text'))];
/** The Border section (Q49): the neutral separators and the semantic borders, page then inverse. The focus
 *  rings are read-only until #1966 (`FOCUS_ROLES`). */
const borderRows = (prefix: string): FillRow[] => [
  ...TIERS.map(([k, l]) => ({ role: `${prefix}.${k}`, label: l, paletteKey: 'neutral' })),
  ...SEM.map(([k, l]) => ({ role: `${prefix}.${k}`, label: l, paletteKey: k })),
];
export const BORDER_ROWS: readonly FillRow[] = [...borderRows('border'), ...grouped(INVERSE_SUB, borderRows('inverse.border'))];
/** The focus rings: read-only rows in the Border section, their step read out. Customizing them is #1966. */
export const FOCUS_ROLES = ['border.focus', 'inverse.border.focus'] as const;
/** The Icon section (Q50): a row per icon role, page then inverse, in the text rows' order with the on-color
 *  icons last, each naming the text role it follows: `text` swapped for `icon`, the engine's twin rule
 *  (`withIconTwins` in `modes.ts`). */
const iconRows = (prefix: string, textPrefix: string, on: boolean): FillRow[] => [
  ...TIERS.map(([k, l]) => ({ role: `${prefix}.${k}`, label: l, paletteKey: 'neutral', follows: `${textPrefix}.${k}` })),
  ...SEM_TEXT.map(([k, l]) => ({ role: `${prefix}.${k}`, label: l, paletteKey: k, follows: `${textPrefix}.${k}` })),
  ...SEM_TEXT.map(([k, l]) => ({ role: `${prefix}.${k}-subtle`, label: `${l}, subtle`, paletteKey: k, follows: `${textPrefix}.${k}-subtle` })),
  ...(on ? SEM_TEXT.map(([k, l]) => ({ role: `${prefix}.on-${k}`, label: `On ${l.toLowerCase()}`, paletteKey: 'neutral', follows: `${textPrefix}.on-${k}` })) : []),
];
export const ICON_ROWS: readonly FillRow[] = [...iconRows('icon', 'text', true), ...grouped(INVERSE_SUB, iconRows('inverse.icon', 'inverse.text', false))];
/** True while icons match text (`iconContrast: 'text'`, the lever's default): the engine then carries a text
 *  override to its icon twin (#1968), so the icon rows are locked to their text rows (Q50). */
export const iconsPaired = (): boolean => theme.iconContrast === 'text';
/** "Unpair icons from text" (Q50): the lever's other value, written as the lever's own control writes it
 *  (`setLever` in `interactive-input.ts`, `setPath(brandState, key, v)`). */
export const unpairIcons = (): void => { setPath(brandState, 'iconContrast', '3:1'); };
/** True for an icon role, page or inverse (`icon.*`, `inverse.icon.*`): the roles the Icon section edits. */
const isIconRole = (role: string): boolean => role.startsWith('icon.') || role.startsWith('inverse.icon.');
/** How many icon overrides the brand carries, every mode counted (Q52): what re-pairing would remove. */
export const iconOverrideCount = (): number =>
  Object.values(brandState.overrides ?? {}).reduce((n, forMode) => n + Object.keys(forMode ?? {}).filter(isIconRole).length, 0);
/** Re-pair icons with text (owner decision Q52): `iconContrast` back to `'text'`, written as the lever's own control
 *  writes it, and every icon override cleared, page and inverse, in every mode, pruning an emptied mode and an
 *  emptied map as `setRoleOverride` does. Every other override stays. EVERY control that sets `iconContrast` to
 *  `'text'` calls this, not `setLever`: the legacy Interactive page's lever here, and Color › Interactive's (#1974).
 *  The caller asks first when `iconOverrideCount()` is above zero, in `PAIR_ICONS_CONFIRM`'s words. */
export const pairIcons = (): void => {
  setPath(brandState, 'iconContrast', 'text');
  const ov = brandState.overrides;
  if (!ov) return;
  for (const [mode, forMode] of Object.entries(ov)) {
    if (!forMode) continue;
    for (const role of Object.keys(forMode)) if (isIconRole(role)) delete forMode[role];
    if (!Object.keys(forMode).length) delete ov[mode];
  }
  if (!Object.keys(ov).length) brandState.overrides = undefined;
};
/** The re-pair confirm's words (owner decision Q52, APPROVED 2026-10-02, verbatim), `n` the override count. One
 *  place, so each control that re-pairs asks in the same words. */
export const PAIR_ICONS_CONFIRM = {
  title: 'Pair icons with text?',
  body: (n: number): string => `This removes ${n} custom icon colors. Icons will follow their text color again.`,
  action: 'Pair icons',
} as const;
/** The text role an icon row is locked to in `mode`, or null when the row is editable. Locked while paired,
 *  unless the icon carries its own override in that mode: the engine applies an explicit icon override over the
 *  carried text one (#1968), so that row shows the override it has, with Return to Auto, rather than claim a
 *  "Follows" the engine is not doing. */
export const lockedTo = (mode: string, row: FillRow): string | null =>
  row.follows && iconsPaired() && overrideOf(mode, row.role) === undefined ? row.follows : null;
/** The Fields rows (owner decision Q29, #1962): every `field.*` role the engine emits, on the page and on the
 *  inverse band. The engine derives all eight from the neutral ramp (`modes.ts`: the borders and the
 *  placeholder walk it, the fills default to `core.palette.transparent`), so each row picks neutral steps.
 *  `field.fill` was a Foreground fills row until Q29 (#1341: transparent by default; a step is judged by the
 *  value ink on it, `text.primary` at 4.5:1). Its inverse twin is judged the same way on the band. */
export const FIELD_ROWS: readonly FillRow[] = [
  { role: 'field.fill', label: 'Field fill', paletteKey: 'neutral', transparent: { ground: 'background.primary', ink: 'text.primary', floor: 4.5 } },
  { role: 'field.border.rest', label: 'Field border', paletteKey: 'neutral' },
  { role: 'field.border.hover', label: 'Field border, hover', paletteKey: 'neutral' },
  { role: 'field.placeholder', label: 'Placeholder', paletteKey: 'neutral' },
  { role: 'inverse.field.fill', label: 'Field fill, inverse', paletteKey: 'neutral', transparent: { ground: 'inverse.background.primary', ink: 'inverse.text.primary', floor: 4.5 } },
  { role: 'inverse.field.border.rest', label: 'Field border, inverse', paletteKey: 'neutral' },
  { role: 'inverse.field.border.hover', label: 'Field border, inverse hover', paletteKey: 'neutral' },
  { role: 'inverse.field.placeholder', label: 'Placeholder, inverse', paletteKey: 'neutral' },
];
/** The palette a row's steps come from: `roleToPalette[paletteKey]`, or the key itself (neutral). */
export const paletteOf = (row: FillRow): string => (theme.roleToPalette as Record<string, string>)[row.paletteKey] ?? row.paletteKey;
/** Write a row: the role on its own, from the row's palette. */
export const setRowOverride = (mode: string, row: FillRow, step: string | undefined): void => {
  setRoleOverride(mode, row.role, paletteOf(row), step);
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
