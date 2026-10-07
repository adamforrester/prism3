/**
 * The Palettes writes (UI redesign S2): every edit Color › Palettes makes to the working brand, and the
 * readings its levers and preview need, held in one module with no DOM.
 *
 * WHY HERE AND NOT IN `main.ts`. These were closures inside the legacy Palettes page (`renderPrimitives`
 * and its rows). The new page must not import `main.ts` (plan §3.10), so the pure part moved out, unchanged
 * in behavior: the rename and remove cascades (docs/24 #53), the anchor reading from the last-good input
 * (M-16), the add handler's materialization on the edit and never on a render (#1033), the rename collision
 * guard, and the status source rules (Auto, a custom hue, or a borrowed palette, which are exclusive).
 *
 * A writer here edits `brandState` and calls nothing. The caller calls `rebuild()`, which re-resolves and
 * tells the `brand` topic, and every surface that reads the brand repaints from its subscription.
 */
import type { BrandInput } from '@prism3/engine/theme';
import { brandTheme } from '@prism3/engine/theme';
import { ACHROMATIC_C, hex, oklchToRgb, hexToRgb, rgbToOklch, storedOklch } from '@prism3/engine/color';
import { autoPlaceStep } from '@prism3/engine/ramp';
import { brandState, lastGoodInput, theme } from './store';
import { resolvedModes } from './verdict';

export const STATUS_ROLES = ['success', 'warning', 'danger', 'info'] as const;
export type StatusRole = typeof STATUS_ROLES[number];
type OKLCH = { l: number; c: number; h: number };

export const hexOf = (o: OKLCH): string => hex(oklchToRgb(o));
/** A picked hex, in the stored form: a hue-less pick (a pure gray) is written with hue 0, never the converter's noise
 *  (#2241). */
export const oklchOf = (h: string): OKLCH => storedOklch(rgbToOklch(hexToRgb(h)));
/** A six-digit hex, with or without its `#`, or null. */
export const parseHex = (s: string): string | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(s.trim());
  return m ? `#${m[1].toLowerCase()}` : null;
};

// ── anchors ─────────────────────────────────────────────────────────────────────────────────────
/** The step a palette's authored color is pinned at, or null when nothing pins it (a derived neutral, an
 *  Auto status ramp). Read from the LAST-GOOD input (M-16): the ramps paint from the last-good theme, so
 *  the anchor must come from the same source, or a failing edit flags the wrong square. */
export const anchorStepFor = (palette: string): number | null => {
  if (palette === 'primary') return autoPlaceStep(lastGoodInput.primary.l);
  if (palette === 'neutral') return lastGoodInput.neutral.anchor ? autoPlaceStep(lastGoodInput.neutral.anchor.l) : null;
  const bc = (lastGoodInput.brandColors ?? []).find((b) => b.name === palette);
  if (bc) return autoPlaceStep(bc.oklch.l);
  // A custom-hue status ramp (#157): `roleToPalette` defaults each status role to its own name, so a
  // status ramp that borrows nothing is named for its role.
  const seed = (STATUS_ROLES as readonly string[]).includes(palette) ? lastGoodInput.status?.[palette as StatusRole] : undefined;
  return seed ? autoPlaceStep(seed.l) : null;
};

/** The roles each palette drives, from the resolved theme (`roleToPalette`), in the engine's role order. */
export const rolesByPalette = (): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const [role, pal] of Object.entries(theme.roleToPalette)) (out[pal] ??= []).push(role);
  return out;
};

// ── primary, brand colors ───────────────────────────────────────────────────────────────────────
export const setPrimary = (h: string): void => { brandState.primary = oklchOf(h); };

/** Brand-color reference integrity (docs/24 #53): when an accent is renamed, every field that names its
 *  palette follows, or the alias graph dangles. */
export const cascadeRename = (prev: string, next: string): void => {
  if (brandState.actionPalette === prev) brandState.actionPalette = next;
  if (brandState.linkPalette === prev) brandState.linkPalette = next;
  const rc = brandState.roleColors as Record<string, string> | undefined;
  if (rc) for (const r of Object.keys(rc)) if (rc[r] === prev) rc[r] = next;
  brandState.interactivePalettes?.forEach((e) => { if (e.palette === prev) e.palette = next; });
  if (Array.isArray(brandState.gradients)) brandState.gradients.forEach((g) => g.stops.forEach((s) => { if (s.palette === prev) s.palette = next; }));
};
/** …and when one is removed, every field that named it falls back (actions to primary, links to their
 *  default, a borrow to Auto, a column away, a gradient stop to primary, since a gradient needs its stops). */
export const cascadeRemove = (removed: string): void => {
  if (brandState.actionPalette === removed) brandState.actionPalette = 'primary';
  if (brandState.linkPalette === removed) brandState.linkPalette = undefined;
  const rc = brandState.roleColors as Record<string, string> | undefined;
  if (rc) { for (const r of Object.keys(rc)) if (rc[r] === removed) delete rc[r]; if (!Object.keys(rc).length) brandState.roleColors = undefined; }
  if (brandState.interactivePalettes) {
    brandState.interactivePalettes = brandState.interactivePalettes.filter((e) => e.palette !== removed);
    if (!brandState.interactivePalettes.length) brandState.interactivePalettes = undefined;
  }
  if (Array.isArray(brandState.gradients)) brandState.gradients.forEach((g) => g.stops.forEach((s) => { if (s.palette === removed) s.palette = 'primary'; }));
};

/** What removing palette `name` also changes, one line each, in the order `cascadeRemove` applies it: the
 *  confirm lists these before the removal (owner, 2026-10-01). Read from the working brand, so the list is
 *  what Confirm will do. An empty list means nothing else names the palette. */
export const removalEffects = (name: string): string[] => {
  const out: string[] = [];
  if (brandState.actionPalette === name) out.push('Actions go back to primary.');
  if (brandState.linkPalette === name) out.push('Links go back to their default color.');
  const rc = brandState.roleColors as Record<string, string> | undefined;
  for (const r of Object.keys(rc ?? {})) {
    if (rc![r] !== name) continue;
    out.push((STATUS_ROLES as readonly string[]).includes(r) ? `The ${r} color goes back to Auto.` : `The ${r} role goes back to its default palette.`);
  }
  if (brandState.interactivePalettes?.some((e) => e.palette === name)) out.push(`Its interactive color column is removed.`);
  if (Array.isArray(brandState.gradients)) {
    for (const g of brandState.gradients) {
      const n = g.stops.filter((st) => st.palette === name).length;
      if (n) out.push(`In the ${g.name} gradient, ${n === 1 ? '1 stop switches' : `${n} stops switch`} to primary.`);
    }
  }
  return out;
};

/** Add a brand color, `accent<n>` at the first free number. Materialized on the EDIT, never on a render
 *  (#1033): a render that created `brandColors: []` made an untouched brand read as edited. */
export const addBrandColor = (): string => {
  const arr = brandState.brandColors ?? (brandState.brandColors = []);
  const names = new Set(arr.map((b) => b.name));
  let n = arr.length + 1, nm = `accent${n}`;
  while (names.has(nm)) nm = `accent${++n}`;
  arr.push({ name: nm, oklch: { l: 0.55, c: 0.15, h: 235 } });
  return nm;
};
/** Rename brand color `i`. Refused (returns false, nothing changes) when the name is empty, unchanged, or
 *  another palette's: a collision would merge two ramps in the alias graph. */
export const renameBrandColor = (i: number, raw: string): boolean => {
  const list = brandState.brandColors ?? [];
  const bc = list[i];
  const next = raw.trim();
  if (!bc || !next || next === bc.name) return false;
  const taken = new Set(['primary', 'neutral', ...list.filter((_, j) => j !== i).map((b) => b.name)]);
  if (taken.has(next)) return false;
  const prev = bc.name;
  bc.name = next;
  cascadeRename(prev, next);
  return true;
};
export const removeBrandColor = (i: number): void => {
  const list = brandState.brandColors ?? [];
  const gone = list[i]?.name;
  if (gone === undefined) return;
  list.splice(i, 1);
  cascadeRemove(gone);
};
export const setBrandColor = (i: number, h: string): void => {
  const bc = brandState.brandColors?.[i];
  if (bc) bc.oklch = oklchOf(h);
};

// ── neutrals ────────────────────────────────────────────────────────────────────────────────────
/** Follow primary (the hue tracks the primary live) or a custom tint. Leaving Follow snapshots the hue it
 *  was following, so the custom tint starts where Auto left it, with no jump. A gray primary has no hue to snapshot:
 *  Auto showed a gray neutral (chroma 0, owner Q87 A), so the tint starts gray, never at the stored hue 0 (#2241). */
export const setNeutralFollow = (follow: boolean): void => {
  const n = brandState.neutral;
  if (follow) n.auto = true;
  else if (n.auto) {
    if (brandState.primary.c < ACHROMATIC_C) { n.hue = 0; n.chroma = 0; }
    else n.hue = brandState.primary.h;
    delete n.auto;
  }
};
export const setNeutralHue = (v: number): void => { brandState.neutral.hue = v; };
export const setNeutralChroma = (v: number): void => { brandState.neutral.chroma = v; };
/** Pin an exact neutral (on), seeded mid-ramp at the hue in effect, or go back to the derived ramp (off). Following a
 *  gray primary, the neutral in effect is gray (Q87 A), so the pin is seeded gray too (#2241). */
export const setNeutralPinned = (on: boolean): void => {
  const n = brandState.neutral;
  if (!on) { delete n.anchor; return; }
  const gray = !!n.auto && brandState.primary.c < ACHROMATIC_C;
  const hue = gray ? 0 : n.auto ? brandState.primary.h : n.hue;
  n.anchor = { l: 0.5, c: gray ? 0 : Math.min(n.chroma, 0.02), h: hue };
};

/** The Palettes preview's line about the neutral ramp, from its step at index 10. A gray ramp has no hue to name, so it
 *  reads "Gray" (#2241, owner Q96 A), decided by chroma as the engine decides it. */
export const neutralBoardText = (step: OKLCH | undefined, follows: boolean): string =>
  `${step && step.c < ACHROMATIC_C ? 'Gray' : `Hue ${Math.round(step?.h ?? 0)}°`}${follows ? ', following primary' : ''}. Text, borders and surfaces draw from it.`;
export const setNeutralAnchor = (h: string): void => { if (brandState.neutral.anchor) brandState.neutral.anchor = oklchOf(h); };

// ── status colors ───────────────────────────────────────────────────────────────────────────────
export type StatusSource = 'auto' | 'custom' | `use:${string}`;
/** Which source a status role takes: a borrowed palette (`roleColors`), a custom hue (`status`), or Auto. */
export const statusSource = (role: StatusRole): StatusSource => {
  const borrowed = brandState.roleColors?.[role];
  if (borrowed) return `use:${borrowed}`;
  return brandState.status?.[role] ? 'custom' : 'auto';
};
/** The hex a custom hue starts from: the current custom hue, else the color the role resolves to right now,
 *  in light mode: `foreground.<role>` in the engine's resolved output (`resolvedModes(theme)`, the cache
 *  the verdict and the preview already share). Switching to Custom then starts where the role already was,
 *  with no jump, whatever the source was before: Auto (the synthesized or reused status color), a borrowed
 *  palette ("Use accent" gives the accent color the role was drawing), or a per-mode override (the
 *  resolved output already carries it). Owner decision, 2026-10-01, which closes the S2 review's held
 *  item; the legacy page seeded `#808080` for a borrowing role.
 *
 *  WHY THE RESOLVED ROLE AND NOT A RAMP STEP. `foreground.<role>` is the role's own fill, the color the
 *  status draws as. Picking a step from `roleToPalette` and `roleAnchorStep` would re-derive the engine's
 *  answer here, and would miss an override that repoints the role. `#808080` is left only as the answer
 *  when a theme emits no such role, which no brand does. */
export const statusSeedHex = (role: StatusRole): string => {
  const cur = brandState.status?.[role];
  if (cur) return hexOf(cur);
  const light = resolvedModes(theme).find((m) => m.mode === 'light');
  return parseHex(light?.roles[`foreground.${role}`]?.hex ?? '') ?? '#808080';
};
/** Set a status role's source. The three are exclusive, so each clears the other two. */
export const setStatusSource = (role: StatusRole, src: StatusSource): void => {
  const seed = statusSeedHex(role);
  const rc = { ...(brandState.roleColors ?? {}) } as Record<string, string>; delete rc[role];
  const st = { ...(brandState.status ?? {}) } as Record<string, unknown>; delete st[role];
  if (src === 'custom') { const o = oklchOf(seed); st[role] = { l: o.l, c: o.c, h: o.h, chroma: o.c }; }
  else if (src.startsWith('use:')) rc[role] = src.slice('use:'.length);
  brandState.roleColors = (Object.keys(rc).length ? rc : undefined) as BrandInput['roleColors'];
  brandState.status = (Object.keys(st).length ? st : undefined) as BrandInput['status'];
};
/** Seed a custom status ramp from a hex (hue and chroma), clearing any borrow. */
export const setStatusColor = (role: StatusRole, h: string): void => {
  const o = oklchOf(h);
  const rc = { ...(brandState.roleColors ?? {}) } as Record<string, string>; delete rc[role];
  brandState.roleColors = (Object.keys(rc).length ? rc : undefined) as BrandInput['roleColors'];
  brandState.status = { ...(brandState.status ?? {}), [role]: { l: o.l, c: o.c, h: o.h, chroma: o.c } };
};

/** A hue's plain name, as concept v6 names it in the Auto option. */
export const hueName = (h: number): string => {
  const x = ((h % 360) + 360) % 360;
  return x < 15 ? 'red' : x < 45 ? 'red-orange' : x < 70 ? 'orange' : x < 100 ? 'yellow' : x < 165 ? 'green'
    : x < 200 ? 'teal' : x < 255 ? 'blue' : x < 290 ? 'violet' : x < 335 ? 'magenta' : 'red';
};

let autoKey = '';
let autoCache: Record<StatusRole, { h: number; reuse: string | null }> | null = null;
/** What Auto would give each status role: the brand resolved without its status and borrow settings.
 *  Cached on the inputs that decide it, so it costs one resolve per change to them, and only while the
 *  Status colors section is drawn. */
export const autoStatus = (): Record<StatusRole, { h: number; reuse: string | null }> => {
  const key = JSON.stringify([brandState.primary, brandState.brandColors, brandState.neutral]);
  if (autoCache && key === autoKey) return autoCache;
  const inp = structuredClone(brandState);
  delete inp.status; delete inp.roleColors;
  let t = theme;
  try { t = brandTheme(inp); } catch { /* keep the resolved theme's answer */ }
  const out = {} as Record<StatusRole, { h: number; reuse: string | null }>;
  for (const r of STATUS_ROLES) {
    const pal = (t.roleToPalette as Record<string, string>)[r] ?? r;
    const p = t.palettes.find((x) => x.palette === pal);
    out[r] = { h: p?.steps[10]?.oklch.h ?? 0, reuse: pal !== r ? pal : null };
  }
  autoKey = key; autoCache = out;
  return out;
};
