/** Prism3 engine — Dimensions: the space, radius, size, icon and control scales on the dimension grid.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
import { dimensionGrid, spaceScale, radiusScale, componentSizes, type Density, iconSizes, controlSizes, RADIO_DOT_DEFAULT, type RadioDotShare } from './scale';
import type { Dims } from './theme-types';

/** Exported for `test.ts` only, and for one specific reason (#900): the grid-extras guards below are
 *  unreachable through either public theme builder. `brandTheme` hardcodes `GRID_BASE`, and
 *  `nbThemeFrom` — the one route that carries a `baseUnit` — hardcodes `comfortable`, so no theme the
 *  engine can build combines a coarse grid with the density whose top control rung (28px) is the only
 *  px the control extras actually rescue. Measured, not assumed: every other control px and EVERY icon
 *  px is already fed in by the space extras at base 4, 6 and 8, so deleting either of those lines
 *  changes no committed output. A guard nothing can exercise is a guard nothing can notice the loss of,
 *  which is `docs/34`'s shape 14 — so the seam is opened here rather than the guard left unfalsifiable. */
export const buildDims =(baseUnit: number, spaceBase: number, density: Density, rScale: number, baseMd: number, extras: number[] = [], radioDot: RadioDotShare = RADIO_DOT_DEFAULT): Dims => {
  // Space is `mult × spaceBase`; the dimension grid is `baseUnit`-stepped. At a non-default spaceBase the
  // half-steps (1.5×/0.25×/0.75×) land OFF the grid (e.g. spaceBase 12 → space.150 = 18px, absent from the
  // baseUnit-4 grid), so `space.<k> → {dimension.<px>}` would dangle (#274). Feed every space px into the
  // grid as extras, so each space alias resolves by construction. At the default spaceBase 8 these already
  // land on the grid, so committed out/* is byte-identical.
  const space = spaceScale(spaceBase);
  // Control px join the grid extras for the same reason the icon ladder's do, one line below — with the
  // margin MEASURED rather than assumed, because it turned out to be one px wide. Of the six control px
  // at each density, the space extras above already supply every one except SPACIOUS `lg`'s 28px height,
  // at base 4, 6 and 8 alike. So this line rescues exactly `spacious` + a coarse baseUnit; `test.ts`
  // pins that case through the export above, since no theme builder can reach it.
  //
  // `dot` CHANGES THAT, and it is the more useful half of adding it (#910). The dot px are 6/8/10/12/14,
  // and 10 and 14 are on NEITHER the base-4 grid NOR the space extras (2/4/6/8/12/16/20/24/…) — measured
  // at base 4, 6 and 8 alike. So this line now rescues two px at the DEFAULT baseUnit, reachable through
  // `brandTheme` like any other brand, where before it rescued one px at an input no public builder could
  // produce. The guard stopped being unfalsifiable by gaining a field rather than by gaining a test.
  //
  // AND THE CONSEQUENCE IS NOT THE ONE THE TWO COMMENTS AROUND THIS ONE NAME. Both say the alias "would
  // dangle"; measured by deleting `c.dot` from this line, it does not — `controlLeaf` falls back to a
  // LITERAL px, so nb/harbor/wendys emit `md: 10px` and aurora `lg: 10px` beside siblings that still
  // alias. Nothing about that is a broken reference, which is why the assertion that catches it is #296's
  // (`primitives are mode-invariant: no NEW literal-valued leaf carries a per-mode variant`) and not an
  // alias-resolution one: the dot varies by mode, so the literal is what makes it visible. Worth writing
  // down because the wrong mechanism suggests the wrong gate to check the fix against, and 6 needs no
  // rescuing at all — the space extras already supply it.
  //
  // `inset` (#997) leans on this line HARDER than either, and it is the first field for which the
  // rescue is load-bearing at the default baseUnit for a MAJORITY of its rungs. The inset px are
  // 3/4/5/6/7 — `(height - dot) / 2` over `CONTROL_RUNGS` — and 3, 5 and 7 are on neither the base-4
  // grid nor the space extras (2/4/6/8/12/16/20/24/…). Only 4 and 6 are already members, so three of
  // the five rungs exist as grid entries because this line puts them there, `md` at the DEFAULT density
  // among them. Remove `c.inset` and the same thing happens as for `c.dot`: `controlLeaf` falls back to
  // a literal rather than dangling, so the switch still renders and the tier quietly stops aliasing.
  //
  // `track` + `thumb` (#1425) are the switch's own edge and mark, and both join this line for the same
  // reason. `track` is a multiple of 8 (16/24/32/40/48) so every value is already on the base-4 grid —
  // fed for uniformity, rescuing nothing today. `thumb` is `0.75 × track` (12/18/24/30/36), and 18 and
  // 30 are on NEITHER the base-4 grid NOR the space extras — so this rescues two more px at the default
  // baseUnit, `md`'s 24 already a grid member. `width` moved from `2× height` to `2× track` (#1425); its
  // new values 32/48/64/80/96 are all multiples of 4, so the widened track still aliases by construction.
  //
  // THE RADIO DOT SETTING (#3086, owner Q816 A, "no new token") is NOT fed here: the grid keeps the default half dot's
  // px whatever the setting says. Feeding the brand's dot would mint a primitive its grid lacks (the reference brand's
  // 70% lands on 14, which its comfortable grid does not hold), a new brand-dependent path that `token-contract --check`
  // reports, and feeding it INSTEAD of the half dot would drop `core.dimension.10`, a guaranteed one. Unfed, a dot on
  // the grid aliases its step and one off it is a literal px, the `controlLeaf` fallback (`tree.ts`).
  const controls = controlSizes(density, radioDot);
  return {
    // Icon px join the grid extras for the same reason space does (#274): at a non-default baseUnit
    // (e.g. 6) the fixed icon ladder lands OFF the grid, and `icon.size.<k> -> {dimension.<px>}`
    // would dangle. Feeding them in makes every icon alias resolve by construction. At baseUnit 4
    // they are already grid members, so committed out/* is unaffected.
    grid: dimensionGrid(baseUnit, 128, [...extras, ...space.map((s) => s.px), ...iconSizes().map((i) => i.px),
      // The box mark-clearance `(height − dot) / 2` — the gap a checkbox/radio mark has inside its box.
      // It is fed even though NO token exposes it since #1425 (the tier's `inset` now carries the switch's
      // `(track − thumb) / 2` instead). WHY IT STAYS: before #1425 this quantity WAS `inset`, and it is
      // a compact brand's only source of `core.dimension.5` (compact box-clearances are 3/4/5): aurora's until
      // #1215 moved it to comfortable, the `minimal-compact` corpus fixture's since (measured). Dropping it would
      // DEMOTE that guaranteed primitive out of the compact grid — a contract removal the materialization gate
      // blocks — for no consumer benefit (a raw primitive is never an alias target). Feeding it keeps the
      // grid's small-primitive floor exactly what it was on `main`; the switch's own clearance is fed by
      // `c.inset` beside it. See version.ts CONTRACT 10.1.0 and docs/00-progress (#1425).
      // At SPACIOUS the COMFORTABLE control px join too (#1631, owner-decided: "we should not remove
      // dimension tokens"). The grid is value-keyed, so a density whose own controls don't produce a px
      // drops that primitive: spacious lost `core.dimension.3` (a comfortable `inset`) and `.18` (a
      // comfortable `thumb`), both guaranteed. WHY NOT COMPACT TOO: compact is a contract-corpus density
      // (the `minimal-compact` fixture since #1215, aurora before), so it cannot remove a guaranteed path by
      // construction, and feeding it would ADD `core.dimension.30` to that member, promoting the path to
      // guaranteed (a CONTRACT MINOR, measured).
      // Spacious is the one density outside the corpus; `lint-lever-sweep.ts` holds it to the contract.
      // `controlSizes(density)`, not `controls`: the default ladder, so the radio dot setting moves no primitive (#3086).
      ...[...controlSizes(density), ...(density === 'spacious' ? controlSizes('comfortable') : [])]
        .flatMap((c) => [c.height, c.width, c.dot, c.inset, c.track, c.thumb, (c.height - c.dot) / 2])]),
    space,
    radius: radiusScale(rScale, baseMd, 128, 999),
    sizes: componentSizes(density, spaceBase),
    icons: iconSizes(),
    controls,
    density,
    radiusScaleValue: rScale,
    spaceBase,
  };
};
