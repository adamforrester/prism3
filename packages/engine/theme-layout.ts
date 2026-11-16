/** Prism3 engine — Layout: breakpoints, the responsive grid and containers.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
import { type Dims, n2, type BrandInput } from './theme-types';

// ---------------------------------------------------------------------------
// Layout axis (breakpoints + responsive grid + containers). Grounded in a
// 10-system survey. Decisions:
//  - 5 breakpoints, t-shirt named, min-width/mobile-first (the convergent shape);
//    ranges are derived (next − 1). The brand authors the floor ARRAY (the real
//    per-brand variable); names are constant.
//  - The 12-col grid is a DESIGN ARTIFACT (Figma layout-grid + mental model), not
//    the load-bearing code contract — modern layout is CSS Grid + container
//    queries. Columns emit as a 4/8/12 ladder (the design convention); base count
//    is one knob (12 default; 16/24 for dense-data brands).
//  - Gutter/margin are NOT independent tokens — they ALIAS the 8px spacing scale
//    (16→24→32 / 16→24→48), keyed to breakpoint index. Reuses the spacing engine.
//  - Containers: FLUID-first + a `container.max` cap (the 2026 default) + a
//    `narrow` reading container (~720). The fluid-vs-fixed duplication Prism2
//    shipped is collapsed; fixed-stepped is an opt-in modifier (deferred).
export type Breakpoint = { name: string; px: number };
export type GridStep = { bp: string; columns: number; gutterPx: number; marginPx: number };
export type LayoutAxis = {
  breakpoints: Breakpoint[];
  grid: GridStep[];
  baseColumns: number;
  containerMax: number;
  containerNarrow: number;
  containerMin: number;
};
/** `container.min` (#2971): the narrowest column a component that lays out across its container holds, 320px, the
 *  WCAG 1.4.10 reflow width and the smallest phone viewport. FIXED, not a lever: the reflow width is the same for
 *  every brand. Banner binds it as its width floor, and code clamps it to the host (`min-inline-size: min(var(--container-min), 100%)`),
 *  so a host narrower than the floor (a 320 phone's 288 column) never scrolls the page sideways. */
export const CONTAINER_MIN_PX = 320;
// Count-aware names: ≤5 tiers anchor at sm (sm/md/lg/xl/2xl — Tailwind); 6+ prepend
// xs (xs/sm/md/lg/xl/2xl — Bootstrap), so a small-phone tier is labeled correctly.
const bpNames = (n: number): string[] =>
  n <= 5 ? ['sm', 'md', 'lg', 'xl', '2xl'].slice(0, n) : ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'].slice(0, n);
// Shallow gutter/margin ramps (px), anchored to Atlassian/Prism2; margin runs a
// step larger at the top. Sliced/clamped to the breakpoint count.
const GUTTER_PX = [16, 16, 24, 24, 32, 32];
const MARGIN_PX = [16, 24, 24, 32, 48, 48];

// The base `layout.columns` slider bounds (levers.ts / theme-schema.json). A per-breakpoint override
// is held to the SAME range: mirroring one number in two places would drift, but the range is small,
// load-bearing, and asserted equal to the lever bound by test.ts (the manifest is the source), so this
// pair is the intentional restatement — not the silent drift the gate exists to catch.
const COLUMN_MIN = 4;
const COLUMN_MAX = 24;
// A per-breakpoint override wins over the ladder for that breakpoint; an unset/blank/non-finite entry
// keeps the ladder value. A set value is coerced to a sane grid: rounded to an integer and CLAMPED to
// [COLUMN_MIN, COLUMN_MAX] so an out-of-range authored value emits a bounded grid rather than a
// degenerate one (0-, negative-, or 100-column). Clamp, not throw — the override is a UI knob and a
// slider that can reach an illegal value should be corrected in place, not rejected.
const resolveColumns = (override: number | undefined, ladder: number): number => {
  if (override === undefined || override === null || !Number.isFinite(override)) return ladder;
  return Math.max(COLUMN_MIN, Math.min(COLUMN_MAX, Math.round(override)));
};

// A per-breakpoint gutter/margin override wins over the ladder for that breakpoint; an unset/blank entry
// keeps the ladder value. #1593 held an override to the spacing scale and THREW off it; Q785 A (owner,
// 2026-10-27, #3052) relaxes that to a resolution order, applied where the token is built (`gridGapLink`):
// a `space/*` step with that px, else the brand's `core/dimension/*` step, else a plain value flagged
// off-scale. The value itself is never snapped, so here only a value that is not a length is refused.
const resolveGap = (override: number | undefined, ladder: number, field: string, bp: string): number => {
  if (override === undefined || override === null) return ladder;
  if (!Number.isFinite(override) || override < 0)
    throw new Error(`layout.${field}.${bp}: ${override} is not a length in px — a gutter or margin is a number of 0 or more.`);
  return override;
};

/** Where a grid gutter/margin of `px` links (Q785 A, #3052), first match wins: (1) the `space/*` step with
 *  that px; (2) the brand's `core/dimension/*` step with that px; (3) nothing — a plain value, flagged
 *  off-scale. Spacing stays the first choice for every brand, so a value the spacing scale has never
 *  links to the dimension grid. `tree.ts` builds the token from this and `brandTheme` writes the note. */
export type GapLink = { to: 'space'; key: string } | { to: 'dimension' } | { to: 'raw' };
export const gridGapLink = (px: number, dims: Pick<Dims, 'space' | 'grid'>): GapLink => {
  const step = dims.space.find((s) => s.px === px);
  if (step) return { to: 'space', key: step.key };
  return dims.grid.includes(px) ? { to: 'dimension' } : { to: 'raw' };
};
/** The note line for every grid gutter/margin that does NOT link to a spacing step, or [] when all do. */
export const gridGapNotes = (layout: LayoutAxis, dims: Pick<Dims, 'space' | 'grid'>): string[] =>
  layout.grid.flatMap((g) => (['gutter', 'margin'] as const).map((k) => {
    const px = k === 'gutter' ? g.gutterPx : g.marginPx;
    const link = gridGapLink(px, dims);
    return link.to === 'dimension'
      ? `layout: the ${g.bp} ${k} is ${n2(px)}px, which is not a spacing step, so it links to core dimension ${n2(px)}.`
      : link.to === 'raw'
        ? `layout: the ${g.bp} ${k} is ${n2(px)}px, which is on neither the spacing scale nor the dimension grid, so it ships as a plain value, flagged off-scale.`
        : '';
  })).filter(Boolean);

export const buildLayout = (input: BrandInput['layout'] = {}): LayoutAxis => {
  const floors = input.breakpoints ?? [0, 768, 1024, 1440, 1920];
  // #2132 (owner decision 2026-10-05, F4 A: refuse). Breakpoints are mobile-first min-widths, so the first
  // is the layout for every width below the second: a first floor of 320 leaves screens under 320px with
  // no layout. The studio locks the field at 0, so only a hand-written brief or saved file reaches this.
  // The wording is the owner's, approved on #2132, with the value as entered.
  //
  // #2137 (owner decision 2026-10-05, Q22 a: refuse). An EMPTY list built a brand with no layout at all, and
  // has no first value for the message above to name, so it is refused first, in its own approved wording.
  //
  // #3698 R2 (owner decision 2026-11-12: refuse fewer than two). One floor built, and emitted no `md` tier, so
  // four GUARANTEED contract paths (`breakpoint.md`, `grid.md.*`) went missing from a brand that validated.
  // The contract's sparsest layout member is `minimal-bp2`, so two is the smallest list the contract covers.
  // The schema says the same (`minItems: 2`); this refusal is for input that never meets the schema (the studio,
  // a direct `brandTheme` call). It absorbs #2137's empty list, whose "at least one" sentence is now untrue.
  // DRAFT wording, awaiting the owner (OWNER DECISION on the PR), with the count as entered.
  if (floors.length < 2)
    throw new Error(`The brand needs at least two breakpoints, starting at 0px. This brand has ${floors.length}.`);
  if (floors[0] !== 0)
    throw new Error(`The first breakpoint must be 0px. This brand starts at ${floors[0]}px.`);
  // #2198 (owner decision 2026-10-06, Q43 A: refuse). `bpNames` names seven, xs to 3xl. An eighth built and
  // took the placeholder `bp7` from the fallback below, a name no consumer could expect. Refused here, in the
  // build path, so `validate_brand` and the generating tools report it in this sentence (DRAFT wording,
  // awaiting the owner). The studio's input already stops at seven (`MAX_BREAKPOINTS`).
  if (floors.length > 7)
    throw new Error(`The brand can have at most seven breakpoints. This brand has ${floors.length}.`);
  const base = input.columns ?? 12;
  const n = floors.length;
  const names = bpNames(n);
  const breakpoints: Breakpoint[] = floors.map((px, i) => ({ name: names[i] ?? `bp${i}`, px }));
  // column ladder: smallest = 4, next = 8, top reaches the base count.
  const cols = (i: number): number => i === 0 ? Math.min(4, base) : i === n - 1 ? base : i === 1 ? Math.min(8, base) : base;
  const overrides = input.columnOverrides ?? {};
  const gutterOverrides = input.gutterOverrides ?? {};
  const marginOverrides = input.marginOverrides ?? {};
  const grid: GridStep[] = breakpoints.map((b, i) => ({
    bp: b.name, columns: resolveColumns(overrides[b.name], cols(i)),
    gutterPx: resolveGap(gutterOverrides[b.name], GUTTER_PX[Math.min(i, GUTTER_PX.length - 1)], 'gutterOverrides', b.name),
    marginPx: resolveGap(marginOverrides[b.name], MARGIN_PX[Math.min(i, MARGIN_PX.length - 1)], 'marginOverrides', b.name),
  }));
  return { breakpoints, grid, baseColumns: base, containerMax: input.containerMax ?? 1440, containerNarrow: input.containerNarrow ?? 720, containerMin: CONTAINER_MIN_PX };
};
