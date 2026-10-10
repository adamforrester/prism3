/**
 * The Layout writes (UI redesign S10): every edit the Layout page makes to the working brand, in one module with
 * no DOM, so `test-layout-input.ts` can hold each one in Node.
 *
 * WHERE THEY CAME FROM. The legacy Layout page in `main.ts` wrote these from closures: the breakpoint list
 * (`renderBreakpointsControls`), the grid columns select, the per-breakpoint column, gutter and margin selects
 * (`paintPerBreakpointGrid` and its `gapEditor`) and the two container sliders (`csSlider`). S10 retired that page.
 * Each write here keeps what the legacy page wrote, byte for byte on the persisted brand (the S2 rule), with ONE
 * intended difference, owner decision D13 (#2045), below.
 *
 *   · Breakpoints keep the legacy clean-up: finite, at least 0, de-duplicated (the first occurrence wins), sorted.
 *   · An emptied override map is DELETED, never left as `{}` (the legacy page's rule, kept).
 *   · Gutter and margin take a spacing step or Auto only: the engine refuses an off-scale px (#1593), so the page
 *     offers only `theme.dims.space`, and nothing here invents a value.
 *
 * D13: A PER-BREAKPOINT SETTING STAYS WITH ITS BREAKPOINT (fixes #2045). The engine names breakpoints from their
 * COUNT (`bpNames` in `packages/engine/theme.ts`: up to five run sm…2xl, six xs…2xl, seven xs…3xl), and the three
 * override maps are keyed by that name. So adding or removing a breakpoint renamed the others and every setting
 * silently landed on a different width. Here a breakpoint change re-keys each map: each setting follows the
 * breakpoint it was set on to that breakpoint's new name. A breakpoint whose width is edited keeps its settings (it
 * was not removed). A setting on a REMOVED breakpoint (removed by Remove, or merged into another by an edit onto its
 * width) is dropped, and the write reports its old name so the page can say so in one line. An entry keyed by a
 * name no current breakpoint has (only an agent or the old page could write one) is dropped too: it applies to no
 * width now, and left in place it would attach to whichever breakpoint takes that name next, which is exactly the
 * silent move D13 rules out. The engine's naming is unchanged; the names come from the engine itself (`namesFor`).
 *
 * THE FIRST BREAKPOINT IS 0 (#2146, after #2139). The engine refuses a list that starts above 0 ("The first breakpoint
 * must be 0px. …"), so this module refuses to write one: a change whose result would not start at 0 (removing the
 * 0px breakpoint, or moving it) returns `refused` and writes nothing. A brand that ARRIVES starting above 0 is
 * explained where the studio already explains a refusal: loading it refuses (`initSession` throws the engine's
 * sentence, which the import and restore paths catch), and an agent's live write keeps the last good theme and sets
 * `lastError` to that sentence for the error line (`rebuild`). While such a state is drawn, `namesFor` names it by
 * its count instead of throwing.
 *
 * WHAT IS NOT HERE. The page's other limit (two to seven breakpoints) is the page's: it offers no control that
 * breaks it, apart from the merge `editBreakpoint` refuses below.
 */
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { BOOT_BRAND, BRANDS, brandState, setPath, theme } from './store';

/** The three per-breakpoint override maps, each keyed by breakpoint name. */
export const OVERRIDE_FIELDS = ['columnOverrides', 'gutterOverrides', 'marginOverrides'] as const;
export type OverrideField = (typeof OVERRIDE_FIELDS)[number];
export type GapField = 'gutterOverrides' | 'marginOverrides';
export type ContainerKey = 'containerMax' | 'containerNarrow';

/** The grid column counts the page offers (the legacy page's curated list, #264). The engine takes any whole number
 *  4–24, so a brand can hold one off this list; the page then shows it as it is (#2047). */
export const COLUMN_CHOICES: readonly number[] = [4, 6, 8, 12, 16, 24];
/** How far past the widest breakpoint a new one lands (the legacy page's `+ Add`). */
export const ADD_STEP = 256;
/** The page's breakpoint limits (owner decision D13). */
export const MIN_BREAKPOINTS = 2;
export const MAX_BREAKPOINTS = 7;

type LayoutIn = NonNullable<BrandInput['layout']>;
const layoutOf = (): LayoutIn => (brandState.layout ?? {}) as LayoutIn;

/** The breakpoint floors the brand has now: its own list, or the engine's default as resolved. */
export const breakpointsOf = (): number[] => (layoutOf().breakpoints ?? theme.layout.breakpoints.map((b) => b.px)).slice();

const nameCache = new Map<string, readonly string[]>();
/** The names the ENGINE gives `floors`, read from the engine itself rather than restated here (its `bpNames` is not
 *  exported, and a second copy would drift). Resolved on the boot example with only the breakpoints swapped, so the
 *  working brand's own state (which may not resolve mid-edit) never decides a name. */
export const namesFor = (floors: readonly number[]): readonly string[] => {
  // Names follow the COUNT alone, so a list the engine refuses for its first width (#2146) is named as the same
  // count starting at 0 would be, rather than throwing while the page draws it.
  const named = floors.length && floors[0] !== 0 ? [0, ...floors.slice(1)] : floors;
  const key = named.join(',');
  const hit = nameCache.get(key);
  if (hit) return hit;
  const names = brandTheme({ ...structuredClone(BRANDS[BOOT_BRAND]), layout: { breakpoints: [...named] } }).layout.breakpoints.map((b) => b.name);
  nameCache.set(key, names);
  return names;
};


/** One breakpoint in a change: its width, and its index in the list before the change (none for a new one). */
type Entry = { px: number; from?: number };

/** What a breakpoint change did: the old names whose settings were dropped with their breakpoint. */
export type BreakpointResult = { readonly dropped: readonly string[]; readonly refused?: boolean };

/** Write the breakpoint list `next` and re-key the three override maps (D13). The legacy clean-up first: an entry
 *  that is not a finite number at least 0 goes, a width already taken keeps its first entry, and the rest are
 *  sorted. */
const commitBreakpoints = (next: readonly Entry[]): BreakpointResult => {
  const before = breakpointsOf();
  const oldNames = namesFor(before);
  const seen = new Set<number>();
  const clean = next.filter((e) => Number.isFinite(e.px) && e.px >= 0 && !seen.has(e.px) && (seen.add(e.px), true))
    .sort((a, b) => a.px - b.px);
  const floors = clean.map((e) => e.px);
  // #2146: a list that would not start at 0 is the engine's refusal (#2139), so it is not written at all.
  if (floors[0] !== 0) return { dropped: [], refused: true };
  setPath(brandState, 'layout.breakpoints', floors);
  const newNames = namesFor(floors);
  /** Old name → new name, for every breakpoint that survived. */
  const rename = new Map<string, string>();
  clean.forEach((e, j) => { if (e.from !== undefined && oldNames[e.from] !== undefined) rename.set(oldNames[e.from], newNames[j]); });
  const dropped = new Set<string>();
  const layout = brandState.layout as LayoutIn;
  for (const f of OVERRIDE_FIELDS) {
    const m = layout[f];
    if (!m) continue;
    const out: Record<string, number> = {};
    // In the old map's own key order, so a change that renames nothing writes the map as it was.
    for (const [k, v] of Object.entries(m)) {
      const to = rename.get(k);
      if (to !== undefined) out[to] = v;
      else if (oldNames.includes(k)) dropped.add(k);
    }
    if (Object.keys(out).length) layout[f] = out;
    else delete layout[f];
  }
  return { dropped: oldNames.filter((n) => dropped.has(n)) };
};

/** Whether the brand's own breakpoint list starts above 0: the state #2146 refuses to write, which only arrives
 *  from outside the page (an agent's live write). Owner Q189 A offers the fix beside the error line. */
export const needsZeroBreakpoint = (): boolean => {
  const bps = layoutOf().breakpoints;
  return !!bps && bps.length > 0 && bps[0] > 0;
};
/** Insert a 0px first breakpoint in front of the list (owner Q189 A). Nothing else changes: every other width
 *  stays, and each per-breakpoint setting follows its breakpoint to its new name (D13). Refused, writing nothing,
 *  when the list already starts at 0. */
export const addZeroBreakpoint = (): BreakpointResult => {
  if (!needsZeroBreakpoint()) return { dropped: [], refused: true };
  return commitBreakpoints([{ px: 0 }, ...breakpointsOf().map((px, i) => ({ px, from: i }))]);
};

/** Add a breakpoint past the widest (the legacy `+ Add`: the widest plus 256). */
export const addBreakpoint = (): BreakpointResult => {
  const bps = breakpointsOf();
  return commitBreakpoints([...bps.map((px, i) => ({ px, from: i })), { px: Math.max(0, ...bps) + ADD_STEP }]);
};
/** Remove breakpoint `i`. Its settings go with it, and the result names it. */
export const removeBreakpoint = (i: number): BreakpointResult =>
  commitBreakpoints(breakpointsOf().flatMap((px, j) => (j === i ? [] : [{ px, from: j }])));
/** Move breakpoint `i` to `px`. It keeps its settings under whatever name it now has; an edit onto another
 *  breakpoint's width merges the two, the first in the old order surviving (the legacy de-duplication). */
export const editBreakpoint = (i: number, px: number): BreakpointResult => {
  const bps = breakpointsOf();
  // Two to seven (owner decision D13): at two, an edit onto the other breakpoint's width would merge them into one,
  // so it is refused and nothing is written; the page puts the field's width back.
  if (bps.length <= MIN_BREAKPOINTS && bps.some((x, j) => j !== i && x === px)) return { dropped: [], refused: true };
  return commitBreakpoints(bps.map((x, j) => ({ px: j === i ? px : x, from: j })));
};

/** The base grid column count (the legacy select, `Number`). */
export const setColumns = (n: number): void => { setPath(brandState, 'layout.columns', n); };

/** Set one breakpoint's entry in an override map, or clear it (`undefined`: Auto). An emptied map is deleted. */
const setOverride = (field: OverrideField, bp: string, v: number | undefined): void => {
  const next = { ...(layoutOf()[field] ?? {}) };
  if (v === undefined) delete next[bp]; else next[bp] = v;
  if (Object.keys(next).length) setPath(brandState, `layout.${field}`, next);
  else if (brandState.layout) delete (brandState.layout as LayoutIn)[field];
};
/** One breakpoint's column count, or Auto (the ladder). */
export const setColumnOverride = (bp: string, n: number | undefined): void => setOverride('columnOverrides', bp, n);
/** One breakpoint's gutter or margin, as a spacing step in px, or Auto (the ladder). */
export const setGapOverride = (field: GapField, bp: string, px: number | undefined): void => setOverride(field, bp, px);
/** The override a breakpoint holds now, or undefined (Auto). */
export const overrideOf = (field: OverrideField, bp: string): number | undefined => layoutOf()[field]?.[bp];

/** A container width (the legacy sliders). */
export const setContainer = (key: ContainerKey, px: number): void => { setPath(brandState, `layout.${key}`, px); };

/** The grid each breakpoint gets with no overrides at all: what each "Auto" names. The live grid when the brand sets
 *  none; otherwise the engine re-resolved with the three maps cleared. */
export const autoGrid = (): readonly { bp: string; columns: number; gutterPx: number; marginPx: number }[] => {
  const l = layoutOf();
  if (!OVERRIDE_FIELDS.some((f) => l[f])) return theme.layout.grid;
  try {
    const input = structuredClone(brandState);
    for (const f of OVERRIDE_FIELDS) delete (input.layout as LayoutIn)[f];
    return brandTheme(input).layout.grid;
  } catch { return theme.layout.grid; }
};
