/**
 * The fields of `BrandInput` that name a palette, an interactive column or a mode (#3697 H3), in one table, and the
 * atomic commit every rename and remove goes through (#3697 M1).
 *
 * WHY ONE TABLE. `BrandInput` refers to a brand color, a button set (an interactive column) and a mode by its name.
 * Each rename and remove writer used to hand-list the fields that hold those names, and a field left off a list kept an
 * orphan key: it came back when the name was reused (#3549), or left a shape the engine refuses (#3613, #3678, and the
 * three #3697 found: `removeAccent`, `outlineHoverFill.<mode>.sets.<column>`, `surfaces.<mode>.inverse*`). Every writer
 * and the removal confirm now read the same rows, so a field is cascaded everywhere or nowhere.
 *
 * WHAT EACH ROW SAYS. `rename` moves every reference from one name to another. `remove` makes the field fall back when
 * the name goes: a pick goes back to Auto or its default, a keyed value is dropped. A row whose `remove` does nothing
 * HOLDS the reference (an override that names a removed palette, #3391): the engine refuses that brand, so the atomic
 * commit refuses the removal, and the confirm names what to re-pick first. `effects` is the confirm's line for the row.
 *
 * The gate is `apps/studio/test-name-refs.ts`, which seeds every naming field from the `BrandInput` type's own text,
 * never from this table (docs/34).
 */
import { brandTheme, type BrandInput, resolvePreview } from '@prism3/engine';
import { brandState } from './store';

type Rec = Record<string, unknown>;
type ByMode = Record<string, Rec | undefined>;
export type NameKind = 'palette' | 'column' | 'mode';
export type NameRef = {
  /** The field's path in `BrandInput`, `<mode>` and `<column>` standing for a key. */
  readonly field: string;
  readonly kind: NameKind;
  readonly rename: (b: BrandInput, prev: string, next: string) => void;
  readonly remove: (b: BrandInput, name: string) => void;
  /** What removing `name` changes in this field, one line each, read before the removal. */
  readonly effects: (b: BrandInput, name: string) => string[];
};

const bag = (b: BrandInput): Rec => b as unknown as Rec;
const isObj = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
/** A `palette.step` string's palette (`accent1.400` → `accent1`). */
const paletteOfStep = (s: unknown): string | undefined => (typeof s === 'string' && s.includes('.') ? s.slice(0, s.lastIndexOf('.')) : undefined);
const restep = (s: string, next: string): string => `${next}${s.slice(s.lastIndexOf('.'))}`;
/** Delete `key` from `o`'s parent `p` when `o` emptied. */
const prune = (p: Rec, key: string): void => { if (isObj(p[key]) && !Object.keys(p[key] as Rec).length) delete p[key]; };

// ── palette rows ────────────────────────────────────────────────────────────────────────────────

/** Whether override key `key` names column `col` (`interactive.<col>.…` or `inverse.interactive.<col>.…`). */
export const isColumnKey = (key: string, col: string): boolean =>
  key.startsWith(`interactive.${col}.`) || key.startsWith(`inverse.interactive.${col}.`);
/** Whether palette `name` names an interactive column by itself: it has an unnamed column, and no column carries `name`
 *  as its explicit name. Then renaming or removing the palette renames or removes the column, and every key on the
 *  column's name goes with it (#3448, #3549). When another column carries the explicit name, the keys name that column
 *  too and nothing says whose they are, so none moves (#3545 fifth review). */
export const paletteNamesColumn = (b: BrandInput, name: string): boolean => {
  const cols = b.interactivePalettes ?? [];
  return cols.some((e) => e.name === undefined && e.palette === name) && !cols.some((e) => e.name === name);
};

const INVERSE_KEYS = [['inverseBase', 'inverse band'], ['inverseSecondary', 'inverse secondary surface'], ['inverseTertiary', 'inverse tertiary surface']] as const;
/** Each `{ hover, pressed? }` pick under `outlineHoverFill`, with where it sits, so a palette row can rewrite or drop it. */
const hoverPicks = (b: BrandInput): { mode: string; set?: string; holder: Rec; key: string; pick: Rec }[] => {
  const out: { mode: string; set?: string; holder: Rec; key: string; pick: Rec }[] = [];
  const ohf = b.outlineHoverFill as ByMode | undefined;
  for (const [mode, m] of Object.entries(ohf ?? {})) {
    if (!m) continue;
    out.push({ mode, holder: ohf as Rec, key: mode, pick: m });
    if (isObj(m.sets)) for (const [set, p] of Object.entries(m.sets)) if (isObj(p)) out.push({ mode, set, holder: m.sets, key: set, pick: p });
  }
  return out;
};

/** The interactive columns that go when palette `gone` goes, by name: every column drawn from it (`name ?? palette`;
 *  the legacy `accentPalette` column is named `accent`), less a name a column that stays still carries. */
export const columnsGoneWith = (b: BrandInput, gone: string): string[] => {
  const cols = b.interactivePalettes ?? (b.accentPalette !== undefined ? [{ name: 'accent', palette: b.accentPalette }] : []);
  const kept = new Set(cols.filter((e) => e.palette !== gone).map((e) => e.name ?? e.palette));
  return [...new Set(cols.filter((e) => e.palette === gone).map((e) => e.name ?? e.palette))].filter((c) => !kept.has(c));
};

/** The overrides that name palette `name` in their reference and are not dropped with a column that goes with it. */
const heldOverrides = (b: BrandInput, name: string): string[] => {
  const cols = columnsGoneWith(b, name);
  return [...new Set(Object.values((b.overrides ?? {}) as ByMode).flatMap((m) =>
    Object.entries(m ?? {}).filter(([role, ref]) => (ref as { palette?: string } | undefined)?.palette === name && !cols.some((c) => isColumnKey(role, c)))
      .map(([role]) => role)))];
};

export const PALETTE_REFS: readonly NameRef[] = [
  {
    field: 'actionPalette', kind: 'palette',
    rename: (b, p, n) => { if (b.actionPalette === p) b.actionPalette = n; },
    remove: (b, x) => { if (b.actionPalette === x) b.actionPalette = 'primary'; },
    effects: (b, x) => (b.actionPalette === x ? ['Actions go back to primary.'] : []),
  },
  {
    field: 'linkPalette', kind: 'palette',
    rename: (b, p, n) => { if (b.linkPalette === p) b.linkPalette = n; },
    remove: (b, x) => { if (b.linkPalette === x) b.linkPalette = undefined; },
    effects: (b, x) => (b.linkPalette === x ? ['Links go back to their default color.'] : []),
  },
  {
    field: 'accentPalette', kind: 'palette',
    rename: (b, p, n) => { if (b.accentPalette === p) b.accentPalette = n; },
    remove: (b, x) => { if (b.accentPalette === x) delete b.accentPalette; },
    effects: (b, x) => (b.accentPalette === x && !b.interactivePalettes ? ['Its accent column is removed.'] : []),
  },
  {
    field: 'roleColors.<role>', kind: 'palette',
    rename: (b, p, n) => { const rc = b.roleColors as Record<string, string> | undefined; for (const r of Object.keys(rc ?? {})) if (rc![r] === p) rc![r] = n; },
    remove: (b, x) => {
      const rc = b.roleColors as Record<string, string> | undefined;
      if (!rc) return;
      for (const r of Object.keys(rc)) if (rc[r] === x) delete rc[r];
      if (!Object.keys(rc).length) b.roleColors = undefined;
    },
    effects: (b, x) => Object.entries((b.roleColors ?? {}) as Record<string, string>).filter(([, v]) => v === x).map(([r]) =>
      (['success', 'warning', 'danger', 'info'].includes(r) ? `The ${r} color goes back to Auto.` : `The ${r} role goes back to its default palette.`)),
  },
  {
    field: 'interactivePalettes[].palette', kind: 'palette',
    rename: (b, p, n) => { b.interactivePalettes?.forEach((e) => { if (e.palette === p) e.palette = n; }); },
    remove: (b, x) => {
      if (!b.interactivePalettes) return;
      b.interactivePalettes = b.interactivePalettes.filter((e) => e.palette !== x);
      if (!b.interactivePalettes.length) b.interactivePalettes = undefined;
    },
    effects: (b, x) => (b.interactivePalettes?.some((e) => e.palette === x) ? ['Its interactive color column is removed.'] : []),
  },
  {
    field: 'gradients[].stops[].palette', kind: 'palette',
    rename: (b, p, n) => { if (Array.isArray(b.gradients)) b.gradients.forEach((g) => g.stops.forEach((s) => { if (s.palette === p) s.palette = n; })); },
    remove: (b, x) => { if (Array.isArray(b.gradients)) b.gradients.forEach((g) => g.stops.forEach((s) => { if (s.palette === x) s.palette = 'primary'; })); },
    effects: (b, x) => (Array.isArray(b.gradients) ? b.gradients.flatMap((g) => {
      const n = g.stops.filter((st) => st.palette === x).length;
      return n ? [`In the ${g.name} gradient, ${n === 1 ? '1 stop switches' : `${n} stops switch`} to primary.`] : [];
    }) : []),
  },
  {
    // The inverse band and its tiers may be a brand color (`{ palette, step }`, #898, #1972). Removed, it goes back to
    // Auto (the neutral band), as a borrowed status color does.
    field: 'surfaces.<mode>.inverseBase|inverseSecondary|inverseTertiary', kind: 'palette',
    rename: (b, p, n) => {
      for (const sm of Object.values((b.surfaces ?? {}) as ByMode)) for (const [k] of INVERSE_KEYS) {
        const v = sm?.[k] as { palette?: string } | undefined;
        if (isObj(v) && v.palette === p) v.palette = n;
      }
    },
    remove: (b, x) => {
      const sf = b.surfaces as ByMode | undefined;
      if (!sf) return;
      for (const mode of Object.keys(sf)) {
        const sm = sf[mode];
        if (!sm) continue;
        let hit = false;
        for (const [k] of INVERSE_KEYS) if (isObj(sm[k]) && (sm[k] as { palette?: string }).palette === x) { delete sm[k]; hit = true; }
        if (hit) prune(sf as Rec, mode);
      }
      if (!Object.keys(sf).length) b.surfaces = undefined;
    },
    effects: (b, x) => Object.entries((b.surfaces ?? {}) as ByMode).flatMap(([mode, sm]) => INVERSE_KEYS
      .filter(([k]) => isObj(sm?.[k]) && (sm![k] as { palette?: string }).palette === x)
      .map(([, label]) => `The ${mode} ${label} goes back to Auto.`)),
  },
  {
    // A pick is a `palette.step`. Removed, the pick goes back to the default rule; a pressed pick alone goes back to
    // following hover (pressed is never set without hover).
    field: 'outlineHoverFill.<mode>[.sets.<column>].hover|pressed', kind: 'palette',
    rename: (b, p, n) => {
      for (const { pick } of hoverPicks(b)) for (const k of ['hover', 'pressed']) if (paletteOfStep(pick[k]) === p) pick[k] = restep(pick[k] as string, n);
    },
    remove: (b, x) => {
      const ohf = b.outlineHoverFill as ByMode | undefined;
      if (!ohf) return;
      for (const { mode, set, holder, key, pick } of hoverPicks(b).reverse()) {
        if (paletteOfStep(pick.hover) === x) {
          if (set) delete holder[key];
          else { delete pick.hover; delete pick.pressed; }
        } else if (paletteOfStep(pick.pressed) === x) delete pick.pressed;
        const m = ohf[mode];
        if (m && isObj(m.sets) && !Object.keys(m.sets).length) delete m.sets;
        if (m && !m.hover && !m.sets) delete ohf[mode];
      }
      if (!Object.keys(ohf).length) delete b.outlineHoverFill;
    },
    effects: (b, x) => hoverPicks(b).filter(({ pick }) => paletteOfStep(pick.hover) === x || paletteOfStep(pick.pressed) === x)
      .map(({ mode, set }) => `The ${mode} outline hover fill${set ? ` of ${set}` : ''} goes back to the default.`),
  },
  {
    // HELD (#3391): an override that names the palette is a pick only the user can redo. It follows a rename; on a
    // removal it stays, the engine refuses the brand, and the atomic commit refuses the removal. An override keyed by
    // the removed palette's own column is not held: the column row drops it (#3549).
    field: 'overrides.<mode>.<role>.palette', kind: 'palette',
    rename: (b, p, n) => {
      for (const m of Object.values((b.overrides ?? {}) as ByMode)) for (const ref of Object.values(m ?? {})) if ((ref as { palette?: string } | undefined)?.palette === p) (ref as { palette: string }).palette = n;
    },
    remove: () => {},
    effects: (b, x) => {
      const held = heldOverrides(b, x);
      if (!held.length) return [];
      return [held.length === 1
        ? `1 role is still overridden to it: ${held[0]} — the color can't be removed until it's re-picked.`
        : `${held.length} roles are still overridden to it: ${held.join(', ')} — the color can't be removed until each is re-picked.`];
    },
  },
  {
    // HELD, as an override is: a glass role's color is a pick only the user can redo.
    field: 'glassRoles.<name>.palette', kind: 'palette',
    rename: (b, p, n) => { for (const g of Object.values(b.glassRoles ?? {})) if (paletteOfStep(g.palette) === p) g.palette = restep(g.palette!, n); },
    remove: () => {},
    effects: (b, x) => Object.entries(b.glassRoles ?? {}).filter(([, g]) => paletteOfStep(g.palette) === x)
      .map(([n]) => `The ${n} glass is drawn from it — the color can't be removed until the glass is re-picked.`),
  },
];

// ── column rows ─────────────────────────────────────────────────────────────────────────────────
// A key already on the new name belongs to no live column (`renameBrandColor` refuses every rename that would make it
// one), so it is a leftover, and a rename drops it first: kept, it would bring back a value the user removed and drop
// the one they just set (#3549, #3613). Only a map this edit emptied is pruned: one already empty stays.

/** The column a semantic role path names (`interactive.<col>.…`, `inverse.interactive.<col>.…`), given the column. */
const roleNamesColumn = (role: unknown, col: string): boolean => typeof role === 'string' && isColumnKey(role, col);

export const COLUMN_REFS: readonly NameRef[] = [
  {
    field: 'modeAnchors.<mode>.<column>', kind: 'column',
    rename: (b, p, n) => {
      const ma = b.modeAnchors as ByMode | undefined;
      let pruned = false;
      for (const mode of Object.keys(ma ?? {})) {
        const m = ma![mode];
        if (!m) continue;
        const stale = n in m;
        delete m[n];
        if (p in m) { m[n] = m[p]; delete m[p]; }
        if (stale && !Object.keys(m).length) { delete ma![mode]; pruned = true; }
      }
      if (pruned && !Object.keys(ma!).length) b.modeAnchors = undefined;
    },
    remove: (b, x) => {
      const ma = b.modeAnchors as ByMode | undefined;
      let dropped = false;
      for (const mode of Object.keys(ma ?? {})) {
        const m = ma![mode];
        if (!m || !(x in m)) continue;
        delete m[x]; dropped = true;
        prune(ma as Rec, mode);
      }
      if (dropped && !Object.keys(ma!).length) b.modeAnchors = undefined;
    },
    effects: () => [],
  },
  {
    field: 'overrides.<mode>.(inverse.)interactive.<column>.*', kind: 'column',
    rename: (b, p, n) => {
      const heads = [[`interactive.${p}.`, `interactive.${n}.`], [`inverse.interactive.${p}.`, `inverse.interactive.${n}.`]];
      for (const m of Object.values((b.overrides ?? {}) as ByMode)) {
        if (!m) continue;
        for (const key of Object.keys(m)) if (heads.some(([, to]) => key.startsWith(to))) delete m[key];
        for (const key of Object.keys(m)) {
          const head = heads.find(([from]) => key.startsWith(from));
          if (!head) continue;
          m[head[1] + key.slice(head[0].length)] = m[key];
          delete m[key];
        }
      }
    },
    remove: (b, x) => {
      const ov = b.overrides as ByMode | undefined;
      let dropped = false;
      for (const mode of Object.keys(ov ?? {})) {
        const m = ov![mode];
        if (!m) continue;
        const keys = Object.keys(m).filter((k) => isColumnKey(k, x));
        for (const k of keys) delete m[k];
        if (keys.length) { dropped = true; prune(ov as Rec, mode); }
      }
      if (dropped && !Object.keys(ov!).length) b.overrides = undefined;
    },
    effects: () => [],
  },
  {
    field: 'outlineHoverFill.<mode>.sets.<column>', kind: 'column',
    rename: (b, p, n) => {
      for (const m of Object.values((b.outlineHoverFill ?? {}) as ByMode)) {
        if (!m || !isObj(m.sets)) continue;
        delete m.sets[n];
        if (p in m.sets) { m.sets[n] = m.sets[p]; delete m.sets[p]; }
      }
    },
    remove: (b, x) => {
      const ohf = b.outlineHoverFill as ByMode | undefined;
      let dropped = false;
      for (const mode of Object.keys(ohf ?? {})) {
        const m = ohf![mode];
        if (!m || !isObj(m.sets) || !(x in m.sets)) continue;
        delete m.sets[x]; dropped = true;
        if (!Object.keys(m.sets).length) delete m.sets;
        if (!m.hover && !m.sets) delete ohf![mode];
      }
      if (dropped && !Object.keys(ohf!).length) delete b.outlineHoverFill;
    },
    effects: () => [],
  },
  {
    // HELD, as a glass drawn from a removed palette is (#3710 review): a glass role may take its color from a semantic
    // role path (`validGlassRoles`), and one under `interactive.<column>.` names the column. It follows a rename; on a
    // removal it stays, the engine refuses the brand, and the atomic commit refuses the removal.
    field: 'glassRoles.<name>.role', kind: 'column',
    rename: (b, p, n) => {
      const heads = [[`interactive.${p}.`, `interactive.${n}.`], [`inverse.interactive.${p}.`, `inverse.interactive.${n}.`]];
      for (const g of Object.values(b.glassRoles ?? {})) {
        const head = typeof g.role === 'string' ? heads.find(([from]) => g.role!.startsWith(from)) : undefined;
        if (head) g.role = head[1] + g.role!.slice(head[0].length);
      }
    },
    remove: () => {},
    effects: (b, x) => Object.entries(b.glassRoles ?? {}).filter(([, g]) => roleNamesColumn(g.role, x))
      .map(([n]) => `The ${n} glass is drawn from its button set — the color can't be removed until the glass is re-picked.`),
  },
];

// ── mode rows ───────────────────────────────────────────────────────────────────────────────────

/** A field keyed by mode: a rename moves the key, a removal drops it, and a container it empties is pruned. */
const byMode = (field: 'overrides' | 'modeLevers' | 'modeAnchors' | 'surfaces' | 'outlineHoverFill', line: (k: string, v: unknown) => string[]): NameRef => ({
  field: `${field}.<mode>`, kind: 'mode',
  rename: (b, p, n) => { const o = bag(b)[field] as Rec | undefined; if (o && p in o) { o[n] = o[p]; delete o[p]; } },
  remove: (b, x) => {
    const o = bag(b)[field] as Rec | undefined;
    if (!o || !isObj(o) || !(x in o)) return;
    delete o[x];
    if (!Object.keys(o).length) delete bag(b)[field];
  },
  effects: (b, x) => Object.entries(((bag(b)[field] as ByMode | undefined)?.[x]) ?? {}).flatMap(([k, v]) => line(k, v)),
});
/** Every leaf of a per-mode settings object, as `path = value`. */
const leaves = (o: unknown, p: string): string[] => (isObj(o)
  ? Object.entries(o).flatMap(([k, v]) => leaves(v, `${p}${p ? '.' : ''}${k}`))
  : [`${p} = ${String(o)}`]);

export const MODE_REFS: readonly NameRef[] = [
  byMode('overrides', (r) => [`Role override: ${r}`]),
  byMode('modeLevers', (k, v) => leaves(v, k).map((l) => `Setting: ${l}`)),
  byMode('modeAnchors', (c, v) => [`Anchor: ${c} at ${String(v)}`]),
  byMode('surfaces', (k, v) => [`Surface: ${k} = ${isObj(v) ? `${(v as { palette?: string }).palette} ${(v as { step?: number }).step}` : String(v)}`]),
  byMode('outlineHoverFill', (k, v) => (k === 'sets'
    ? Object.entries(isObj(v) ? v : {}).map(([set, p]) => `Outline hover fill of ${set}: ${(p as { hover?: string }).hover}`)
    : [`Outline hover fill ${k}: ${String(v)}`])),
];

export const NAME_REFS: readonly NameRef[] = [...PALETTE_REFS, ...COLUMN_REFS, ...MODE_REFS];

// ── the cascades every writer runs ──────────────────────────────────────────────────────────────

/** Palette `prev` renamed to `next`: every palette row follows, and when the palette names a column by itself, every
 *  column row follows the column's name too (docs/24 #53, #3448). Decided before the rows run: the column rows read
 *  the palette's columns as they were. */
export const renamePalette = (b: BrandInput, prev: string, next: string): void => {
  const column = paletteNamesColumn(b, prev);
  for (const r of PALETTE_REFS) r.rename(b, prev, next);
  if (column) for (const r of COLUMN_REFS) r.rename(b, prev, next);
};
/** Palette `gone` removed: every column drawn from it goes with its keys (#3549), then every palette row falls back.
 *  The columns are read first, while the brand still lists them. */
export const removePalette = (b: BrandInput, gone: string): void => {
  for (const c of columnsGoneWith(b, gone)) removeColumn(b, c);
  for (const r of PALETTE_REFS) r.remove(b, gone);
};
/** What removing palette `name` changes, for the confirm, in the table's order: the palette rows, then the column rows
 *  of every column that goes with it (the cascade `removePalette` runs). */
export const paletteRemovalEffects = (b: BrandInput, name: string): string[] => [
  ...PALETTE_REFS.flatMap((r) => r.effects(b, name)),
  ...columnsGoneWith(b, name).flatMap((c) => COLUMN_REFS.flatMap((r) => r.effects(b, c))),
];
/** Interactive column `col` removed: every column row drops its keys. */
export const removeColumn = (b: BrandInput, col: string): void => { for (const r of COLUMN_REFS) r.remove(b, col); };
export const renameMode = (b: BrandInput, prev: string, next: string): void => { for (const r of MODE_REFS) r.rename(b, prev, next); };
export const removeMode = (b: BrandInput, mode: string): void => { for (const r of MODE_REFS) r.remove(b, mode); };
export const modeRemovalEffects = (b: BrandInput, mode: string): string[] => MODE_REFS.flatMap((r) => r.effects(b, mode));

// ── the atomic commit ───────────────────────────────────────────────────────────────────────────

/** Replace the working brand's fields with `next`'s, in place (the store's binding cannot be reassigned from here, and
 *  every reader holds that one object). */
export const replaceBrand = (next: BrandInput): void => {
  const b = bag(brandState);
  for (const k of Object.keys(b)) delete b[k];
  Object.assign(b, next);
};
/** Whether the engine takes `b`, asked as the store's own rebuild asks (`store.ts` `resolve`): the theme, then every
 *  mode. `brandTheme` alone takes an override that names an unknown palette; the modes refuse it. */
const resolves = (b: BrandInput): string | null => {
  try { resolvePreview(brandTheme(structuredClone(b))); return null; } catch (e) { return (e as Error).message; }
};
/** Make `write`'s change to a copy of the working brand, ask the engine, and only then replace the brand (#3697 M1, the
 *  shape `setModeOff` has had since #1939). A change the engine refuses returns its message and leaves the brand as it
 *  was, byte for byte, so the brand, the last-good input and storage never part. A brand the engine already refused
 *  before the change is not this change's refusal: the change is taken. */
export const commitAtomic = (write: (b: BrandInput) => void): string | null => {
  const next = structuredClone(brandState);
  write(next);
  const why = resolves(next);
  if (why !== null && resolves(brandState) === null) return why;
  replaceBrand(next);
  return null;
};
