/**
 * Prism3 engine — non-color scales: the dimension grid, the space scale, the
 * radius ramp, and the component-size layer.
 *
 * Three Curtis tiers show up here:
 *   - reference : `dimension` grid (fine substrate) + `space` scale (8px rhythm,
 *                 numbered by multiplier — space.100 = 1×spaceBase, density-free)
 *   - component : `size` (control heights + paired padding) — t-shirt named,
 *                 the layer DENSITY acts on (compact `md` resolves smaller, name
 *                 unchanged), the layer that gives cross-component consistency
 *   - radius    : a small bounded ramp, t-shirt named (genuinely semantic there)
 *
 * Taxonomy POV (knowledge-base 02/22/24): numbered-multiplier beats t-shirt for
 * a *scale* (handles "between" sizes, extends, and the number means "n×base"
 * invariantly across brands — white-label-honest). T-shirt is reserved for the
 * *component* layer, where it maps to a `size="md"` prop. spaceBase=8 reproduces
 * Prism2's full space scale (18 keys, incl. the 12px/20px half-steps); the 4px
 * grid still backs radius/borders.
 */

export type Density = 'comfortable' | 'compact' | 'spacious';
export type SpaceStep = { key: string; mult: number; px: number };
export type RadiusStep = { name: string; px: number; pill?: boolean };
export type SizeStep = { name: string; height: number; padX: number; padY: number; padXVisual: number; gap: number };

/** The primitive dimension grid (px): fine sub-steps for borders/hairlines, a
 *  base / 1.5×base / 2×base shoulder, then a `base`-spaced ladder to `max`. */
export const dimensionGrid = (base = 4, max = 128, extras: number[] = []): number[] => {
  const g = new Set<number>([0, 1, 2, base, base * 1.5, base * 2]);
  for (let v = base * 3; v <= max; v += base) g.add(v);
  for (const e of extras) g.add(e);
  return [...g].filter((v) => Number.isInteger(v) && v >= 0).sort((a, b) => a - b);
};

// Numbered-multiplier space scale (reference tier). key/100 = multiplier of
// spaceBase: 025=0.25× … 100=1× … 150=1.5× … 250=2.5× … 1200=12×. Linear, density-free.
// 150 (=12px) and 250 (=20px) are the UI-critical half-steps in the 8→16 and 16→24
// gaps; Prism2 ships both and the engine had been omitting them — restoring them
// makes the Prism2 space reproduction complete (18/18 keys).
const SPACE_KEYS = ['0', '025', '050', '075', '100', '150', '200', '250', '300', '400', '500', '600', '700', '800', '900', '1000', '1100', '1200'];

/** The space scale for a given rhythm. spaceBase=8 reproduces Prism2 exactly. */
export const spaceScale = (spaceBase = 8): SpaceStep[] =>
  SPACE_KEYS.map((k) => {
    const mult = Number(k) / 100;
    return { key: k, mult, px: Math.round(mult * spaceBase) };
  });

// Component-size ladder, expressed in spaceBase multiples so a "size" is a CONTRACT
// (height + horizontal/vertical padding) every component opts into — guaranteeing a `md`
// button, input and select agree. Heights and paddings both land on the shared scales.
//
// SEVEN rungs, of which a density NAMES five. `comfortable` takes the middle five (1–5, the
// historical ladder, so its output is unchanged); `compact` slides the window down one rung,
// `spacious` up one. The window is what keeps five names five DISTINCT sizes. The previous
// shape shifted an index into a five-rung ladder and CLAMPED at the ends, so the end step
// resolved to its neighbour's metrics: `compact` collapsed xs+sm onto one height and
// `spacious` collapsed lg+xl — five names, four values. That shipped (aurora is `compact`:
// `size.xs.height` and `size.sm.height` both resolved to `dimension.32`), and it was live at
// the DEFAULT spaceBase, not only at an unusual one. The two outer rungs exist so the window
// has somewhere to go; they are named only at the density that reaches them.
const SIZE_RUNGS: { h: number; x: number; y: number }[] = [
  { h: 3, x: 1, y: 0.25 },   // compact floor — named `xs` only at compact
  { h: 4, x: 1, y: 0.5 },    // comfortable `xs`
  { h: 5, x: 2, y: 0.75 },
  { h: 6, x: 2, y: 1 },
  { h: 7, x: 3, y: 1 },
  { h: 8, x: 3, y: 2 },      // comfortable `xl`
  { h: 9, x: 4, y: 2 },      // spacious ceiling — named `xl` only at spacious
];
const SIZE_NAMES = ['xs', 'sm', 'md', 'lg', 'xl'];
/** Where each density's five-name window starts in SIZE_RUNGS. */
const DENSITY_START: Record<Density, number> = { compact: 0, comfortable: 1, spacious: 2 };

/** Component sizes for a density. DENSITY lives here, not on the space scale:
 *  'compact' resolves each step to the next-smaller rung's metrics while keeping
 *  the name — so `size.md` stays `md` but renders tighter. The window (not a clamped
 *  shift) is what guarantees the five names stay five distinct, increasing heights. */
export const componentSizes = (density: Density, spaceBase = 8): SizeStep[] => {
  const start = DENSITY_START[density];
  const space = spaceScale(spaceBase).map((sp) => sp.px);
  const snapToSpace = (v: number): number => space.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  return SIZE_NAMES.map((name, i) => {
    const src = SIZE_RUNGS[start + i];
    const padX = Math.round(src.x * spaceBase);
    // The horizontal model, left edge inward: [padXVisual][icon][gap][label][padX].
    //
    // Three values, one ordering, which is the whole optical story in a line:
    //
    //     gap  <  padXVisual  <  padX
    //
    //   · `gap` (#325) is tightest — PROXIMITY. Everything inside the control must sit closer to its
    //     neighbours than to the control's own edge, or the icon and label stop reading as one unit
    //     and start reading as two things that happen to share a box.
    //   · `padXVisual` (#326) sits between — an icon's own bounding box already contributes apparent
    //     space, so equal numeric padding reads as TOO MUCH on the visual side. Three independent
    //     systems converge here, which is what makes it field consensus rather than one vendor's
    //     house style: Material 3 (`leading-space` 24 vs `with-leading-icon-leading-space` 16),
    //     Spectrum (`edge-to-text` vs `edge-to-visual`, separate scales), Carbon (a 1px ghost nudge).
    //   · `padX` is loosest — plain text carries no bounding-box bonus.
    //
    // The RATIOS are tuning knobs; the ORDERING is the contract, and it is what `test.ts` asserts
    // across every density × spaceBase × size rather than the literal numbers.
    //
    // Why these fractions specifically:
    //   · gap = half. A third rounds to 2px at the smallest step — a rendering accident, not a gap.
    //   · padXVisual = two-thirds, SNAPPED to the space scale, rather than Material's fixed 8px step:
    //     a fixed step collapses at the small end (padX 8 − 8 = 0, no padding at all), while a ratio
    //     holds its shape at every size and rhythm. Snapping keeps it ON the scale, so the emitted
    //     token aliases `space.*` like its siblings instead of minting an off-scale literal.
    //     At lg/comfortable this lands on 24/16 — Material's pair exactly, arrived at independently.
    return {
      name,
      height: Math.round(src.h * spaceBase),
      padX,
      padXVisual: snapToSpace((padX * 2) / 3),
      padY: Math.round(src.y * spaceBase),
      gap: Math.round(padX / 2),
    };
  });
};

// ---------------------------------------------------------------------------
// ICON SIZES (#324). The one dimension tier that is deliberately NOT parametric.
//
// Every other scale here is derived from a lever — space from `spaceBase`, sizes from `density`,
// radius from `radiusScale`. Icons are not, and that is the finding rather than an omission. The
// field research (KB `components/icon.md` §2) is unusually firm:
//
//   "Icons are drawn on a square, base-4/base-8 artboard so vector points land on the hardware
//    pixel grid and strokes don't blur between pixels. The field standardises on a small fixed
//    set — 16 / 20 / 24 (Carbon adds 32; Atlassian 12/16; Polaris 20) — and PROHIBITS arbitrary
//    sizes. Off-grid scaling is the first thing an icon system must forbid."
//
// and on the API shape: "`size` — ENUMERATED (sm/md/lg), mapping to the fixed pixel grid, NOT
// arbitrary integers — so the glyph snaps to the grid and can't be scaled off it."
//
// So a brand-variable icon ramp would break the rule the research exists to state. What IS derived
// is the tier's structure: every step must land on the brand's `dimension` grid, and the emitted
// token aliases `dimension.<px>` rather than carrying a loose literal — asserted in `test.ts`, not
// assumed. `baseUnit` 4 (default) puts all five on the grid; a coarser `baseUnit` is checked at emit.
//
// The ladder pairs 1:1 with `componentSizes`' xs…xl (32/40/48/56/64), so the component layer's
// control-size → icon-size mapping is the identity rather than a reconciliation between a 4-step
// and a 5-step scale. The ratio is a clean 0.5 through md and eases off above it (0.57, 0.63) —
// a 64px control with a 32px glyph reads sparse, so the top steps intentionally run larger than half.
// 40 extends the field set by one on-grid step for hero / empty-state use; the KB's icon-vs-
// illustration boundary is about NARRATIVE content ("larger, narrative, its own component"),
// not a pixel threshold, so a 40px UI metaphor glyph is still an icon.
export type IconSizeStep = { name: string; px: number };
export const ICON_SIZES: IconSizeStep[] = [
  { name: 'xs', px: 16 }, { name: 'sm', px: 20 }, { name: 'md', px: 24 },
  { name: 'lg', px: 32 }, { name: 'xl', px: 40 },
];
export const iconSizes = (): IconSizeStep[] => ICON_SIZES.map((s) => ({ ...s }));

// Radius base ramp (px at scale=1) — a small bounded, genuinely-semantic set, so
// t-shirt naming holds (both NB and Prism2 name it this way).
const RADIUS_LADDER: { name: string; factor: number }[] = [
  { name: 'none', factor: 0 }, { name: 'sm', factor: 0.5 },
  { name: 'md', factor: 1 }, { name: 'lg', factor: 1.5 },
];
const snap2 = (v: number) => Math.round(v / 2) * 2; // radius rides a 2px sub-grid

/** Radius ramp from one scalar. scale=0 → all corners sharp except the pill;
 *  scale=1 → system default; up to 2 → very soft. `round` is always the pill. */
export const radiusScale = (scale: number, baseMd = 4, pill = 128): RadiusStep[] => {
  const ramp: RadiusStep[] = RADIUS_LADDER.map(({ name, factor }) => ({
    name, px: name === 'none' ? 0 : Math.max(0, snap2(baseMd * factor * scale)),
  }));
  // Weak-monotonicity gate (L-03): radii must never DECREASE as the rung grows
  // (none ≤ sm ≤ md ≤ lg). Equality is allowed by design — small scales snap
  // adjacent rungs onto the same 2px sub-grid, and scale=0 collapses all to sharp
  // — but a rung smaller than its predecessor means a non-monotone (NaN/negative
  // scale, or a broken ladder edit) slipped the Number.isFinite guard upstream.
  for (let i = 1; i < ramp.length; i++)
    if (ramp[i].px < ramp[i - 1].px)
      throw new Error(`radiusScale: non-monotone rung ${ramp[i].name}=${ramp[i].px}px < ${ramp[i - 1].name}=${ramp[i - 1].px}px (scale=${scale})`);
  ramp.push({ name: 'round', px: pill, pill: true });
  return ramp;
};
