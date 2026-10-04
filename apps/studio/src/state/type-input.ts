/**
 * The Type writes (UI redesign S6.1): every edit the legacy Typography page makes to the working brand, and
 * the readers its controls are built from, in one module with no DOM.
 *
 * WHY HERE AND NOT IN `main.ts`. These were closures inside the legacy Typography page (`renderTypeSizes`,
 * `renderTypefaceLibrary`, `renderTypefaceBindings`, `renderWeightTable`, `renderLeadingTracking`,
 * `renderRepoints`, `renderCategorySetup`, `renderFacePins`, and Layout's `renderResponsiveControls`). The new
 * Type page (S6.2, S6.3) must not import `main.ts` (plan §3.10), so the writes moved out first, UNCHANGED IN
 * WHAT THEY WRITE (the S2 rule: behavior-neutral, byte for byte on the persisted brand input), and the legacy
 * page calls them in place. Each function names the legacy closure it came from. What changed is only who
 * repaints: the legacy closures called `applyFull()` or `apply()`; these call nothing, and the caller repaints
 * through the same tier it always used (`apply()` for the nudges, the links, the cut pins and responsive,
 * `applyFull()` for the rest; changing that is #831's fix, not this module's).
 *
 * THE MODE A WRITE TARGETS IS AN ARGUMENT, as in `fills-input.ts` and `interactive-input.ts`. `'light'` writes
 * the brand-wide value; any other mode writes `modeLevers[mode]` through the store's pruning helper.
 *
 * THE EMPTIED LISTS (#2006). An emptied `italics`, `italicDefault`, a category's `weights` and a zero nudge
 * are UNSET, so a tick then untick leaves the brand byte-identical. `links` is the exception, because the
 * engine reads an absent `links` as its default (`TYPE_LINK_DEFAULT`, body and caption), not as none: an
 * emptied `links` is written `[]` (the only way to say "no underlined links"), and a list equal to the
 * default, as a set, is UNSET. Both rules leave the emitted tokens unchanged.
 *
 * TWO BYTE-LEVEL TRAPS, KEPT ON PURPOSE (the S6 scoping report; changing either is a behavior change):
 *   · `responsive.fluid` is always written, `true` included, even where the default is already true;
 *   · the italic, link and weight toggles take the set they toggle from the CALLER, which read it from the
 *     theme its controls were drawn from. The link toggle repaints through `apply()`, so a second link click
 *     before a full repaint reads the set as it was drawn, not as the first click left it. That is the legacy
 *     page's behavior (#831), and the equivalence driver holds it byte for byte.
 */
import {
  brandTheme, typefaceSlug, derivedRungFor, shiftRung, REQUIRED_WEIGHT_ROLES, PER_MODE_SIZE_GROUPS,
  LINE_HEIGHT_KEYS, LETTER_SPACING_KEYS, TYPE_LINK_DEFAULT,
} from '@prism3/engine/theme';
import type { BrandInput, Theme, TypographyInput, PerModeSizeGroup, FacePin } from '@prism3/engine/theme';
import { brandState, theme, getPath, setPath, setModeLever } from './store';

/** The seven text categories, in the order every Type table lists them. `as const` keeps the literal union
 *  so these stay assignable to the engine's `TypeGroup`. (Moved from `main.ts`.) Declared as a bare `const`
 *  and exported below, because `packages/engine/lint-ramp-steps.ts` reads this array literal from this file
 *  by the `const NAME = [` shape and holds it to the engine's group list. */
const TYPE_GROUP_ORDER = ['display', 'title', 'body', 'label', 'caption', 'eyebrow', 'code'] as const;
/** The categories "Apply to all" sets: every one but `code`, whose default is a different kind of face. */
const BULK_CATS = TYPE_GROUP_ORDER.filter((g) => g !== 'code');
export { TYPE_GROUP_ORDER, BULK_CATS };

type Typography = Theme['typography'];
type Row = { variant: string; px: number };
export type ShiftField = 'leadingShift' | 'trackingShift';
export type RungField = 'lineHeights' | 'letterSpacings';

// ── faces (legacy `renderTypefaceLibrary`, `renderTypefaceBindings`) ────────────────────────────────

/** The AUTHORED library (#287): `typography.typefaceLibrary`, or empty. */
export const libraryFaces = (): string[] => (getPath(brandState, 'typography.typefaceLibrary') as string[] | undefined) ?? [];
/** Whether the authored library holds a face with this name's slug. */
export const inLibrary = (name: string): boolean => libraryFaces().some((n) => typefaceSlug(n) === typefaceSlug(name));
/** Stage a face in the library. Returns the refusal the field shows, or `null` when it wrote. Validation
 *  mirrors the engine's (non-empty, no duplicate slug), against the DERIVED list in `typefaces` (the theme the
 *  field was drawn from), so a name a category already binds is refused rather than silently absorbed. */
export const addLibraryFace = (raw: string, typefaces: Typography['typefaces'] = theme.typography.typefaces): string | null => {
  const name = raw.trim();
  if (!name) return 'Give the font family a name.';
  const slug = typefaceSlug(name);
  const clash = typefaces.find((t) => t.slug === slug);
  if (clash) {
    return inLibrary(clash.name)
      ? `${clash.name} is already in the library.`
      : `${clash.name} is already here — a category binds it, so it is in the library list already.`;
  }
  setPath(brandState, 'typography.typefaceLibrary', [...libraryFaces(), name]);
  return null;
};
/** Remove an unbound face from the authored library, by slug. */
export const removeLibraryFace = (slug: string): void => {
  setPath(brandState, 'typography.typefaceLibrary', libraryFaces().filter((n) => typefaceSlug(n) !== slug));
};
/** A category's face. In Light: a face name writes `typography.families.<cat>`, `null` writes "no code
 *  styles" (only `code` offers it), and an empty string writes nothing. In another mode: a face writes
 *  `modeLevers[mode].families.<cat>`, and `''` or `undefined` (Auto) clears it, pruned. */
export const setFamily = (mode: string, cat: string, face: string | null | undefined): void => {
  if (mode === 'light') {
    if (face === null) { setPath(brandState, `typography.families.${cat}`, null); return; }
    if (!face) return;
    setPath(brandState, `typography.families.${cat}`, face);
    return;
  }
  setModeLever(mode, `families.${cat}`, face || undefined);
};
/** "Apply to all": one face for every category but `code`, brand-wide. An empty choice writes nothing. */
export const setAllFamilies = (face: string): void => {
  if (!face) return;
  for (const g of BULK_CATS) setPath(brandState, `typography.families.${g}`, face);
};

// ── weights (legacy `renderWeightTable`, `renderCategorySetup`) ──────────────────────────────────────

/** A weight role's number. Light writes `typography.weightRoles.<role>`; another mode
 *  `modeLevers[mode].weights.<role>`. `undefined` clears it. */
export const setWeightRole = (mode: string, role: string, v: number | undefined): void => {
  if (mode === 'light') setPath(brandState, `typography.weightRoles.${role}`, v);
  else setModeLever(mode, `weights.${role}`, v);
};
/** The roles a category ships. An empty list UNSETS the key. */
export const setCategoryWeights = (g: string, roles: string[]): void => {
  setPath(brandState, `typography.weights.${g}`, roles.length ? roles : undefined);
};
/** Tick or untick one role for a category: `shipped` is the set the control was drawn from, `roleOrder` the
 *  role ramp's order, which the written list keeps. */
export const toggleCategoryWeight = (g: string, role: string, roleOrder: readonly string[], shipped: ReadonlySet<string>): void => {
  setCategoryWeights(g, roleOrder.filter((x) => (x === role ? !shipped.has(role) : shipped.has(x))));
};
/** Why unticking `role` on category `g` is refused, or `undefined` when it is allowed (#1639, #1681): a
 *  category's required role, or its last shipped one. The engine refuses both. */
export const categoryWeightLock = (g: string, role: string, shipped: ReadonlySet<string>): string | undefined => {
  const required = (REQUIRED_WEIGHT_ROLES as Record<string, { role: string; why: string } | undefined>)[g];
  if (shipped.has(role) && required?.role === role) return `${g[0].toUpperCase()}${g.slice(1)} always ships ${role} — ${required.why}.`;
  if (shipped.has(role) && shipped.size === 1) return 'Every text type ships at least one weight. Tick another before clearing this one.';
  return undefined;
};

// ── italics and links (legacy `renderCategorySetup`) ────────────────────────────────────────────────

/** The categories in `current` with `g` set to `on`, in category order. */
const toggled = (g: string, on: boolean, current: ReadonlySet<string>): string[] =>
  TYPE_GROUP_ORDER.filter((x) => (x === g ? on : current.has(x)));
/** Italic default (#1296). An emptied list UNSETS `typography.italicDefault`. */
export const setItalicDefault = (g: string, on: boolean, current: ReadonlySet<string>): void => {
  const next = toggled(g, on, current);
  setPath(brandState, 'typography.italicDefault', next.length ? next : undefined);
};
/** The -italic variants. An emptied list UNSETS `typography.italics` (#2006; the engine reads absent as none). */
export const setItalic = (g: string, on: boolean, current: ReadonlySet<string>): void => {
  const next = toggled(g, on, current);
  setPath(brandState, 'typography.italics', next.length ? next : undefined);
};
/** Whether `list` holds exactly the engine's default link categories, in any order. */
const isLinkDefault = (list: readonly string[]): boolean =>
  list.length === TYPE_LINK_DEFAULT.length && TYPE_LINK_DEFAULT.every((x) => list.includes(x));
/** The underlined-link variants. A list equal to the engine's default UNSETS `typography.links` (#2006); an
 *  emptied list is written `[]`, because the engine reads an absent `links` as the default, not as none. */
export const setLink = (g: string, on: boolean, current: ReadonlySet<string>): void => {
  const next = toggled(g, on, current);
  setPath(brandState, 'typography.links', isLinkDefault(next) ? undefined : next);
};

/** A text type's italic style, as the three chips name it (owner decision Q6): `'upright'` (no italic styles),
 *  `'both'` (each weight also ships an -italic variant) or `'only'` (italic is the only cut, #1296). Composed of
 *  the two legacy writes and nothing else, in the order the legacy page needed them (the two boxes were
 *  exclusive, so moving between `both` and `only` cleared one before setting the other). `italicG` and
 *  `italicDefG` are the sets the control was drawn from. An emptied `italics` or `italicDefault` is unset
 *  (#2006), and a chip that is already on writes nothing. */
export type ItalicStyle = 'upright' | 'both' | 'only';
export const italicStyleOf = (g: string, italicG: ReadonlySet<string>, italicDefG: ReadonlySet<string>): ItalicStyle =>
  italicDefG.has(g) ? 'only' : italicG.has(g) ? 'both' : 'upright';
export const setItalicStyle = (g: string, to: ItalicStyle, italicG: ReadonlySet<string>, italicDefG: ReadonlySet<string>): void => {
  const from = italicStyleOf(g, italicG, italicDefG);
  if (from === to) return;
  if (from === 'both') setItalic(g, false, italicG);
  if (from === 'only') setItalicDefault(g, false, italicDefG);
  if (to === 'both') setItalic(g, true, italicG);
  if (to === 'only') setItalicDefault(g, true, italicDefG);
};

// ── line height and letter spacing (legacy `renderLeadingTracking`, `renderRepoints`, the nudges) ────

/** Bind a rung to a ladder step, brand-wide: `typography.lineHeights.<rung>` or `.letterSpacings.<rung>`. */
export const setRungBinding = (field: RungField, rung: string, v: number): void => {
  setPath(brandState, `typography.${field}.${rung}`, v);
};
/** A mode's swap of one rung for another (`modeLevers[mode].<field>.<rung>`); `''` or `undefined` is Auto. */
export const setRepoint = (mode: string, field: RungField, rung: string, to: string | undefined): void => {
  setModeLever(mode, `${field}.${rung}`, to || undefined);
};
/** A category's leading or tracking nudge. Zero UNSETS the key. */
export const setShift = (g: string, field: ShiftField, n: number): void => {
  setPath(brandState, `typography.${field}.${g}`, n === 0 ? undefined : n);
};
const keysOf = (field: ShiftField): readonly string[] => (field === 'leadingShift' ? LINE_HEIGHT_KEYS : LETTER_SPACING_KEYS);
/** The nudges that MOVE at least one of the category's styles (#377), engine-bounded to ±5. */
export const nudgeSteps = (group: string, field: ShiftField, ty: Typography = theme.typography): number[] => {
  const keys = keysOf(field);
  const idx = ty.composites.filter((c) => c.group === group)
    .map((c) => keys.indexOf(derivedRungFor(field, c.group as any, c.sizePx)))
    .filter((i) => i >= 0);
  if (!idx.length) return [0];
  const lo = Math.max(-5, -Math.max(...idx));
  const hi = Math.min(5, (keys.length - 1) - Math.min(...idx));
  const out: number[] = [];
  for (let v = lo; v <= hi; v++) out.push(v);
  return out;
};
/** The rung (or rungs, ramp order) a nudge lands the category on, through the engine's own `shiftRung`. */
export const resolvedRungs = (group: string, field: ShiftField, shift: number, ty: Typography = theme.typography): string => {
  const keys = keysOf(field);
  const idx = [...new Set(ty.composites.filter((c) => c.group === group)
    .map((c) => keys.indexOf(shiftRung(keys, derivedRungFor(field, c.group as any, c.sizePx), shift)))
    .filter((i) => i >= 0))].sort((a, b) => a - b);
  return idx.map((i) => keys[i]).join('–');
};

// ── cut pins (legacy `renderFacePins`' `setPin`) ─────────────────────────────────────────────────────

/** Pin a verbatim cut to one (category, weight-role) slot, with the family fixed to `family`, the category's
 *  bound face as the control showed it. A blank style (or no family) deletes the slot, pruning the category
 *  and then `typography.faces` itself, so a cleared pin leaves no `{ role: undefined }` behind. */
export const setFacePin = (cat: string, role: string, style: string, family: string | undefined): void => {
  const faces: Record<string, Record<string, FacePin>> = structuredClone(getPath(brandState, 'typography.faces') ?? {});
  const trimmed = style.trim();
  if (trimmed && family) {
    (faces[cat] ??= {})[role] = { family, style: trimmed };
  } else if (faces[cat]) {
    delete faces[cat][role];
    if (!Object.keys(faces[cat]).length) delete faces[cat];
  }
  setPath(brandState, 'typography.faces', Object.keys(faces).length ? faces : undefined);
};

// ── scale and limits (legacy `renderTypeSizes`, Layout's `renderResponsiveControls`) ──────────────────

/** The heading shape: `'default'` UNSETS `typography.typeScale`. */
export const setTypeScale = (key: string): void => {
  setPath(brandState, 'typography.typeScale', key === 'default' ? undefined : key);
};
/** Whether switching to shape `key` would make the engine refuse the brand (a pinned size colliding at the
 *  new shape, #353). Runs a trial build: keep it out of per-keystroke paths. */
export const shapeBlocked = (key: string, cur: string): boolean => {
  if (key === cur) return false;
  try { brandTheme({ ...brandState, typography: { ...(brandState.typography as any), typeScale: key === 'default' ? undefined : key } } as any); return false; }
  catch { return true; }
};
/** The display ceiling, written as the rung name the select holds. */
export const setDisplayCeiling = (v: string): void => { setPath(brandState, 'typography.displayCeiling', v); };
/** Each display rung's px at the largest ceiling (`widest`), from one trial build; empty if it fails. */
export const ceilingPx = (widest: unknown): Map<string, number> => {
  try {
    const full = brandTheme({ ...brandState, typography: { ...brandState.typography, displayCeiling: widest as any } } as BrandInput);
    return new Map(full.typography.composites.filter((c) => c.group === 'display').map((c) => [c.variant, c.sizePx]));
  } catch { return new Map(); }
};
/** The 16px title floor: on writes `16`, off UNSETS the key (18 is the default). */
export const setTitleFloor = (on: boolean): void => { setPath(brandState, 'typography.titleFloor', on ? 16 : undefined); };
/** The caption floor (UI redesign S6.3: no surface edited it before). `10` writes 10; the default, 11, UNSETS
 *  the key, so a brand that never touched it stays byte-identical. */
export const setCaptionFloor = (px: 10 | 11): void => { setPath(brandState, 'typography.captionFloor', px === 10 ? 10 : undefined); };
/** The type size floor (UI redesign S6.3: no surface edited it before). `8` writes 8; the default, 10, UNSETS it. */
export const setSizeFloor = (px: 8 | 10): void => { setPath(brandState, 'typography.sizeFloor', px === 8 ? 8 : undefined); };
/** Fluid heading sizing. ALWAYS written, `true` included (the legacy page's bytes). */
export const setFluid = (on: boolean): void => { setPath(brandState, 'typography.responsive.fluid', on); };
/** A responsive viewport bound. A non-finite number writes nothing; returns whether it wrote. */
export const setResponsiveViewport = (key: 'minViewport' | 'maxViewport', n: number): boolean => {
  if (!Number.isFinite(n)) return false;
  setPath(brandState, `typography.responsive.${key}`, n);
  return true;
};

// ── individual sizes (legacy `renderTypeSizes`' helpers, `sizeCell`, `mobileCell`, Release) ─────────

/** Step a px value along the size ladder, clamped. `undefined` when there is no such step. */
export const ladderStep = (px: number, by: number): number | undefined => {
  const l = theme.typography.sizesPx, i = l.indexOf(px);
  if (i < 0) return undefined;
  const j = i + by;
  return j >= 0 && j < l.length ? l[j] : undefined;
};
/** Every heading size `t` ships in `group`, largest first: the row order for the size tables. */
export const rowsOf = (t: Theme, group: PerModeSizeGroup): Row[] =>
  t.typography.composites.filter((c) => c.group === group)
    .reduce((acc: Row[], c) => (acc.some((a) => a.variant === c.variant) ? acc : [...acc, { variant: c.variant, px: c.sizePx }]), [])
    .sort((a, b) => b.px - a.px);
/** Rows for the WIDEST range this brand could have, so a size trimmed by the ceiling or the floor shows as
 *  "outside range" rather than vanishing. Three trial builds, because widening can fail (`titleFloor: 16`
 *  is refused under `compact`, a pin can collide at the wider range); `null` when none builds. */
export const widestRowsOf = (): Map<PerModeSizeGroup, Row[]> | null => {
  const tries: Array<Partial<TypographyInput>> = [
    { displayCeiling: '3xl', titleFloor: 16 },
    { displayCeiling: '3xl' },
    { displayCeiling: '3xl', titleFloor: 16, sizes: undefined },
  ];
  for (const over of tries) {
    try {
      const t = brandTheme({ ...brandState, typography: { ...brandState.typography, ...over } } as BrandInput);
      return new Map(PER_MODE_SIZE_GROUPS.map((g) => [g, rowsOf(t, g)]));
    } catch { /* try the next relaxation */ }
  }
  return null;
};
/** The brand-wide (desktop) size pinned for one heading size, if any. */
export const brandSizePin = (group: PerModeSizeGroup, variant: string): number | undefined =>
  brandState.typography?.sizes?.[group]?.[variant];
/** A mode's own size for one heading size, if any. */
export const modeSizePin = (mode: string, group: PerModeSizeGroup, variant: string): number | undefined =>
  brandState.modeLevers?.[mode]?.typeSizes?.[group]?.[variant];
/** A #1587 viewport endpoint pin (`sizeOverrides.<g>.<v>.<vp>`), if any. */
export const viewportPin = (group: PerModeSizeGroup, variant: string, vp: 'desktop' | 'mobile'): number | undefined =>
  brandState.typography?.sizeOverrides?.[group]?.[variant]?.[vp];
/** Set or clear a brand-wide size, pruning empties so an all-cleared brand stays byte-identical. */
const setBrandSize = (group: PerModeSizeGroup, variant: string, px: number | undefined): void => {
  const ty = (brandState.typography ??= {});
  if (px === undefined) {
    const g = ty.sizes?.[group];
    if (!g || !ty.sizes) return;
    delete g[variant];
    if (!Object.keys(g).length) delete ty.sizes[group];
    if (!Object.keys(ty.sizes).length) delete ty.sizes;
    return;
  }
  ((ty.sizes ??= {})[group] ??= {})[variant] = px;
};
/** Set or clear a viewport endpoint pin, pruning empties one axis deeper than `setBrandSize`. */
const setViewportSize = (group: PerModeSizeGroup, variant: string, vp: 'desktop' | 'mobile', px: number | undefined): void => {
  const ty = (brandState.typography ??= {});
  if (px === undefined) {
    const rung = ty.sizeOverrides?.[group]?.[variant];
    if (!rung || !ty.sizeOverrides) return;
    delete rung[vp];
    if (!Object.keys(rung).length) delete ty.sizeOverrides[group]![variant];
    if (ty.sizeOverrides[group] && !Object.keys(ty.sizeOverrides[group]!).length) delete ty.sizeOverrides[group];
    if (!Object.keys(ty.sizeOverrides).length) delete ty.sizeOverrides;
    return;
  }
  (((ty.sizeOverrides ??= {})[group] ??= {})[variant] ??= {})[vp] = px;
};
/** One heading size: `mode` `null` writes the brand-wide (desktop) size in `typography.sizes`; a mode writes
 *  `modeLevers[mode].typeSizes`. `undefined` clears it, pruned. */
export const setSizePin = (mode: string | null, group: PerModeSizeGroup, variant: string, px: number | undefined): void => {
  if (mode) setModeLever(mode, `typeSizes.${group}.${variant}`, px);
  else setBrandSize(group, variant, px);
};
/** One heading size's MOBILE endpoint (`sizeOverrides.<g>.<v>.mobile`, #1587). `undefined` returns it to the
 *  derived value, pruned. The studio never writes the desktop endpoint here; `setSizePin` is desktop. */
export const setMobileSize = (group: PerModeSizeGroup, variant: string, px: number | undefined): void => {
  setViewportSize(group, variant, 'mobile', px);
};
/** "Release pinned sizes": drop every brand-wide size, every viewport pin and every mode's sizes. */
export const releasePinnedSizes = (): void => {
  if (brandState.typography) { delete brandState.typography.sizes; delete brandState.typography.sizeOverrides; }
  for (const m of Object.keys(brandState.modeLevers ?? {})) setModeLever(m, 'typeSizes', undefined);
};
/** How many sizes are pinned anywhere: brand-wide, per mode, and viewport endpoints. */
export const pinnedSizeCount = (): number => {
  let n = 0;
  const bs = brandState.typography?.sizes ?? {};
  for (const g of Object.keys(bs) as PerModeSizeGroup[]) n += Object.keys(bs[g] ?? {}).length;
  for (const m of Object.keys(brandState.modeLevers ?? {})) {
    const ms = brandState.modeLevers?.[m]?.typeSizes ?? {};
    for (const g of Object.keys(ms) as PerModeSizeGroup[]) n += Object.keys(ms[g] ?? {}).length;
  }
  const vo = brandState.typography?.sizeOverrides ?? {};
  for (const g of Object.keys(vo) as PerModeSizeGroup[])
    for (const variant of Object.keys(vo[g] ?? {}))
      n += Object.keys(vo[g]![variant] ?? {}).length;
  return n;
};
