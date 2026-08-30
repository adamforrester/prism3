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

/** The spacing rhythm and the fine dimension-grid base are FIXED, not brand levers.
 *
 *  `SPACE_BASE` is locked at 8 because changing it does not unlock spacing VALUES — it renames
 *  them and truncates the scale. A base-4 brand gains 1/3/10/28/36/44px (1 and 3 are hairlines,
 *  not spacing) and LOSES 56/64/72/80/88/96 — the whole layout end — while `12px` stops being
 *  `space.150` and becomes `space.300`. The numbered-multiplier taxonomy's promise is that the
 *  number means "n× base" invariantly ACROSS brands, which is only true if the base is invariant;
 *  a per-brand base makes the one thing the scale was chosen to buy untrue. 4px spacing is still
 *  offered (`space.050`) — it is simply not the multiplier.
 *
 *  `GRID_BASE` is locked at 4 because it moved no design value: generating the same brand at 4 vs
 *  8 changed only the primitive `dimension` ladder (36 leaves vs 23) while radius, border, space
 *  and size came out byte-identical — every consuming axis feeds its own px into the grid as
 *  extras, so the rungs it needs exist regardless. It was a control that looked consequential and
 *  changed nothing but the size of a vocabulary nothing was required to use. */
export const SPACE_BASE = 8;
export const GRID_BASE = 4;

/** The minimum interactive control height, in CSS px — **WCAG 2.2 SC 2.5.8 Target Size (Minimum), AA**.
 *
 *  Height is the right thing to gate: a control's width grows with its label, so height is the
 *  dimension that can actually be too small. This is a FLOOR, not a target — the enhanced criterion
 *  (SC 2.5.5, AAA) asks 44px and mainstream systems ship 32–40px controls, so gating 44 would fail
 *  every real design system including this one. 24 is the line below which a control is a
 *  conformance failure rather than a tight-but-defensible choice.
 *
 *  Nothing enforces this by construction — `compact` xs lands on exactly 24px, so the floor is
 *  currently held by arithmetic rather than by contract. That is precisely why it is asserted:
 *  adding a rung below the ladder's floor, or widening the density window by one more step, would
 *  drop the smallest control under the criterion silently. */
export const MIN_TARGET_PX = 24;

export type Density = 'comfortable' | 'compact' | 'spacious';
/** The `controlShape` FORM lever (#1163): the corner shape a pill-able control takes. `rounded`
 *  follows the radius ramp; `pill` binds the shared pill rung (`radius.round`) so Figma clamps every
 *  size to height ÷ 2. A brand-level choice, not a per-instance variant — see `applyControlShape`. */
export type ControlShape = 'rounded' | 'pill';
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

// ---------------------------------------------------------------------------
// CONTROL SIZES (#900). The dimension of a SMALL CONTROL'S OWN BOX — a checkbox's square, a radio's
// circle, a switch's track. A different quantity from either neighbour, and one with no token at
// all until now: `size.<t>.height` is the ROW a control sits in (40/48/56 on nb) and `icon.size.*`
// is the glyph ARTBOARD ladder. Three defs in a row (`checkbox`, `radio`, `switch`) left their
// control's edge unbound rather than reach for `icon.size.*`, whose values are exactly right and
// whose meaning is not — the #708 shape, where a binding resolves, typechecks, passes every gate
// and measures the wrong thing.
//
// THREE fields. The first two arrived with #900, because a switch's track is NOT SQUARE, so one rung
// per size satisfies checkbox and radio and does nothing for a switch. The third arrived with radio's
// anatomy (#910), and the paragraph after them is why it is here rather than derived downstream.
//   · `height` — the box's cross-axis edge. A SQUARE control (checkbox, radio) reads this on BOTH
//     axes. Nothing else is emitted for it: a square's second dimension is not a second decision.
//   · `width`  — the TRACK width of a two-position control (a switch). Read only by a control that
//     travels; a checkbox binding it would render a 20x40 box, which is why the emitted description
//     names the switch rather than leaving `width` to read as the generic partner of `height`.
//   · `dot`    — the INNER mark of a control whose mark is a filled shape rather than a glyph. Radio's
//     dot is the instance; a switch's thumb is the same number one def over.
//
// THE INNER DIMENSION IS HERE, AND #900 SAID IT WOULD NOT BE. Its entry reads: *"The thumb diameter is
// deliberately absent — anatomy derives it from `height` plus a declared inset, per #801's split where
// the tier holds the inputs and a downstream layer does the arithmetic."* That is the better shape and
// it is not implementable, which is a different thing from being wrong. Both halves of it are refused
// by the code as it stands, measured on this branch:
//   · `anatomyErrors` refuses `inset` on any part that is not `kind: 'absolute'`, by its own rule and
//     with its own reason — an inset on a flow part "reads as though the part were offset from its
//     cell, which no projection does". A dot is a flow child of the control.
//   · `sizingMode` in `anatomy-figma.ts` maps `'fill'` to `'AUTO'`, the same answer it gives `'hug'`.
//     So the alternative spelling — padding on the control, `sizing: fill` on the dot — projects a box
//     that hugs no children, i.e. a dot of ZERO. (`field-message` carries `x: 'fill'` today and is
//     silently a hug; #989, since it is not radio's to fix.)
// Closing either would put `layoutGrow`/`layoutAlign` through the plan type, the projector and both
// executors. That is strictly more surface than one field on a group authored to take more fields, so
// the field is here and #900's note is corrected rather than left contradicting the code.
//
// AND IT IS A CONSTANT, NOT A LEVER — `CONTROL_TRACK_RATIO`'s footing exactly, one line below, for the
// same reason and one more. #900 named "one leaf plus a `control.track-ratio` token" as the hedge and
// did not take it, so the ladder's two ratios stay on one footing rather than the second arriving as a
// knob the first was refused. The additional reason is specific to this ratio: the brand's control-size
// knob is `density`, which moves the whole ladder INCLUDING the dot, and a separate dot knob would let
// a brand author a dot that does not scale with its own disc — the one relationship the ratio exists to
// hold. A brand wanting Carbon's proportions retunes `density`, not this.
//
// DENSITY ACTS HERE, and that is the whole reason this is a windowed ladder rather than a fixed set
// like `ICON_SIZES`. A control box is chosen WITH the control it belongs to, so a brand running its
// controls tighter must run their boxes tighter too. The glyph ladder is fixed for the opposite
// reason — an off-grid glyph blurs, so the field prohibits arbitrary sizes — and the two must not be
// confused: the window here is the SAME `DENSITY_START` `componentSizes` uses, so a compact brand's
// ladder sits one rung below a comfortable brand's. That is the observable difference and the thing
// to check when reading this tier: aurora (compact) emits 12/16/20 where nb, harbor and wendys emit
// 16/20/24. A control family that came out EQUAL in all four brands would be the glyph ladder under
// a new name, whatever its description claimed.
//
// THE NUMBERS, and what they are and are not grounded in. The corpus holds exactly one brief-supplied
// target for any of this — checkbox's "a visual box of roughly 16-18px" — and switch's brief
// specifies no track width, track height or thumb diameter anywhere. Both facts are recorded in the
// defs that met them, and neither was available to be looked up again here. So:
//   · The ladder is the five consecutive on-grid steps from 12 to 28. Every rung is a `dimension`
//     grid member at the default baseUnit, and the emitted token ALIASES the grid rather than
//     minting a literal — what makes this a tier and not five magic numbers. `buildDims` feeds these
//     px into the grid extras for the same reason it feeds the icon ladder's: at a coarser baseUnit
//     they would otherwise land off-grid and the alias would dangle.
//   · `md` at COMPACT is 16, inside the brief's range. `md` at COMFORTABLE is 20 — two px above it,
//     and a deliberate divergence rather than a miss. 20 is squarely inside the shipping field
//     (Fluent's 20x40 switch, MUI's and Mantine's 20px checkbox), the brief's range is one
//     component's and names no density, and the alternative window — 8/12/16 at compact — puts an
//     8px box on the smallest rung of the tightest brand, which no system ships.
//   · `sm` at compact is 12, the ladder's floor, and below the smallest box the field ships
//     (Spectrum's 14). A 12px box depends on the row's padding for its 24px target (SC 2.5.8,
//     `MIN_TARGET_PX`) — which is what `size.<t>.height` is for, and which all three defs already
//     record as an anatomy concern rather than a token one. At the top of the ladder the box alone
//     clears that floor: 24 at comfortable `lg`, 24/28 at spacious.
//   · `width` is 2x `height`. The switch track's aspect ratio is the one number the field really
//     does converge on — Carbon 24x48, Ant 22x44 and Fluent 20x40 are all exactly 2:1 — and doubling
//     an on-grid height stays on-grid by construction. It is NOT a brand lever: a `control.track-
//     ratio` token was the named hedge if #900 had gone the other way, and it did not.
//   · `dot` is HALF `height`, and the field does NOT converge on that — the honest reading of the
//     evidence is the reason to state it as a ratio anyway. Three shipping radios: Material 3 at
//     20/10 is 0.5, Carbon at 20/8 is 0.4, Primer at 16/6 is 0.375. Three points spanning a third of
//     their own range is not convergence, and 0.5 sits at the TOP of it rather than the middle. What
//     converges is the same evidence read as a GAP — (height - dot) / 2 is 5, 6 and 5 px — which is
//     the quantity a designer actually looks at, and #801's lesson one tier up (measure the gap, not
//     the coordinate). A fixed gap cannot be the tier's answer, though: at the ladder's floor it
//     inverts, since 12 - 2x5 leaves a 2px dot. A ratio degrades the other way, and 0.5 is the rung
//     of it that survives three separate checks: every ladder step stays an INTEGER (12/16/20/24/28
//     halve to 6/8/10/12/14, where 0.4 gives 4.8/6.4/8/9.6/11.2 and 0.375 gives 4.5/6/7.5/9/10.5, so
//     both would mint fractional literals instead of aliasing the grid); the floor stays legible
//     (0.375 x 12 is a 4.5px dot on aurora's smallest radio); and the implied gaps run 3/4/5/6/7 px
//     across the five rungs, bracketing the field's observed 5-6 at the middle ones. That is the
//     behavior a density-scaling control should have, and it is the ratio doing it rather than being
//     asserted.
//   · No `spaceBase` parameter, unlike `componentSizes`. The box is anchored to the TYPE it sits
//     beside (the brief: "`size` scales the control with the type"), not to the spacing rhythm, and
//     a spaceBase-relative box would walk off the dimension grid at an odd rhythm.
const CONTROL_RUNGS = [12, 16, 20, 24, 28];
const CONTROL_NAMES = ['sm', 'md', 'lg'];
/** The switch track's aspect ratio — `width` = this x `height`. Field-convergent at 2:1. */
const CONTROL_TRACK_RATIO = 2;
/** The inner mark's share of the box — `dot` = this x `height`. NOT field-convergent (see above): it
 *  is the ratio whose every rung stays an integer, keeps the ladder's floor legible, and puts the
 *  resulting GAP inside the range the field does agree on. */
const CONTROL_DOT_RATIO = 0.5;

export type ControlSizeStep = { name: string; height: number; width: number; dot: number };

/** Control-box sizes for a density. The SAME window mechanism as `componentSizes` — three names
 *  sliding over five rungs, never a clamped shift — so `control.size.md` moves with the brand's
 *  density lever the way `size.md.height` does, instead of standing still the way the icon ladder
 *  does. Three names because three is what the corpus asks for: `checkbox` and `radio` declare
 *  small/medium/large and `switch` declares two, and no def declares a control at `xs` or `xl`. */
export const controlSizes = (density: Density): ControlSizeStep[] =>
  CONTROL_NAMES.map((name, i) => {
    const height = CONTROL_RUNGS[DENSITY_START[density] + i];
    return { name, height, width: height * CONTROL_TRACK_RATIO, dot: height * CONTROL_DOT_RATIO };
  });

// Radius base ramp (px at scale=1) — a small bounded, genuinely-semantic set, so
// t-shirt naming holds (both NB and Prism2 name it this way).
const RADIUS_LADDER: { name: string; factor: number }[] = [
  { name: 'none', factor: 0 }, { name: 'sm', factor: 0.5 },
  { name: 'md', factor: 1 }, { name: 'lg', factor: 1.5 },
];
const snap2 = (v: number) => Math.round(v / 2) * 2; // radius rides a 2px sub-grid

/** Radius ramp from one scalar. scale=0 → all corners sharp except the pills;
 *  scale=1 → system default; up to 2 → very soft.
 *
 *  TWO PILL RUNGS, and the distinction is the point (#1163). `round` (128px) is the pill for
 *  INTRINSICALLY small controls — a switch track, a radio disc — where Figma's clamp to min(w,h)/2
 *  turns 128 into their exact half-height at every size they reach. `capsule` (999px) is the pill for
 *  controls of ARBITRARY height: the `controlShape: pill` lever repoints button/icon-button here, and
 *  999 clamps to height ÷ 2 up to a ~1998px control — unconditional for anything real, where `round`
 *  would stop being a full pill above a 256px height. Kept SEPARATE from `round` so the lever can raise
 *  the ceiling for pill-able controls without touching the rung switch/radio bind. Both are fixed
 *  sentinels, unscaled: a pill is height ÷ 2 regardless of corner softness. `capsule` is off the 4px
 *  dimension grid on purpose (it emits as a literal, `tree.ts`), because a sentinel meaning "always a
 *  pill" is not a real ladder step to be aliased. */
export const radiusScale = (scale: number, baseMd = 4, pill = 128, capsule = 999): RadiusStep[] => {
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
  ramp.push({ name: 'capsule', px: capsule, pill: true });
  return ramp;
};
