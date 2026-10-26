/**
 * Prism3 engine — emit-figma DIMS + LAYOUT core (pure, node-free).
 *
 * The geometric/dimensional FLOAT axes of the Figma materialisation adapter, split out of
 * `emit-figma.ts` (the I/O-shell CLI) so they can bundle into contexts with NO filesystem — the
 * Figma plugin main thread (#146, extending #108's colour write) and the browser. Mirrors the
 * `emit-figma-color.ts` extraction: `emit-figma.ts` re-exports everything here, so every existing
 * `from './emit-figma'` importer + the `npx tsx packages/engine/emit-figma.ts` CLI are unchanged.
 *
 * This module holds:
 *   • `buildFigmaDims(theme)` — the nine FLOAT primitive/semantic collections
 *     (the `core` primitive collection, holding `core/dimension/*` since #1097, plus
 *     `space`/`radius`/`size`/`icon`/`control`/`border-width`/`focus`/`opacity`),
 *   • `buildFigmaLayout(theme)` — the `layout` collection with one mode per breakpoint,
 *   • their local helpers (`pxFromValue`/`aliasFigName`), scope maps, and `LAYOUT_MODES`.
 *
 * PURE — no `node:*`, no `figma.*`, no I/O. Depends only on the pure `theme`/`tree` core + the
 * shared helpers/types in the (also pure) `emit-figma-color`. Every value is a resolved number;
 * cross-axis links are emitted as VARIABLE_ALIAS-by-name (space→dimension, size→dimension/space,
 * radius→dimension, layout grid→space), resolved by the executor's global name map.
 */
import { Theme } from './theme';
import { buildTree, at } from './tree';
import {
  figmaDimensionDescription, figmaSpaceDescription, figmaRadiusDescription, figmaSizeDescription, figmaIconSizeDescription,
  figmaControlDescription, figmaLabelLineBoxDescription, figmaBorderWidthDescription, figmaFocusDescription, figmaOpacityDescription, figmaBlurDescription,
  figmaDurationPrimitiveDescription, figmaDurationDescription, figmaStaggerDescription,
  figmaCurveDescription, figmaEasingRoleDescription, figmaSpringDescription,
  figmaBreakpointDescription, figmaContainerDescription, figmaGridVarDescription,
} from './figma-description';
import { figName, nsName, coreName, CORE_COLLECTION, PRIMITIVE_SCOPES } from './emit-figma-color';
import type { FigmaVar, FigmaCollectionFile, FigmaEasing } from './emit-figma-color';

/** Numeric px from a `12px` or `"{alias}"` value. For alias targets we resolve via
 *  the DTCG tree — the resolved leaf's $value is `12px`. */
const pxFromValue = (tree: any, v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = /^\{(.+)\}$/.exec(v);
    if (m) {
      const target = at(tree, m[1]);
      return pxFromValue(tree, target?.$value);
    }
    return parseFloat(v.replace('px', '')) || 0;
  }
  return 0;
};
/** DTCG alias `{nbds.core.dimension.8}` → Figma name `nbds/core/dimension/8`. Uses `figName`, so the
 *  brand namespace AND the primitive tier come along on their own (#1097, #1102) — the alias string
 *  already carries both, which is why every `alias:` site below needs no help while the `name:` sites,
 *  assembled from bare keys, each have to say which tier they are in. */
const aliasFigName = (aliasStr: string): string => {
  const m = /^\{(.+)\}$/.exec(String(aliasStr));
  return m ? figName(m[1]) : '';
};

/** Order dimension keys by numeric MAGNITUDE so leading-zero sub-steps (`025`,`050`,`075`) sort
 *  with their value (`0, 025, 050, 075, 100, …`) instead of trailing every integer-like key (#1594).
 *  JS object-key iteration emits integer-like keys (`"0"`,`"100"`,…`"1200"`) FIRST in ascending-numeric
 *  order, then leading-zero string keys (`"025"`,`"050"`,`"075"`) in insertion order — so `space`'s
 *  sub-steps landed after `1200` in the emitted (hence Figma-created) order. Purely reorders: maps over a
 *  COPY, never mutates the input, never touches a key's value/scope/alias. Non-numeric keys (named rungs
 *  like `radius.none`, t-shirt keys like `size.md` or `radius.2xl` / `radius.3xl`) are not numbers and compare EQUAL, so a stable
 *  sort leaves every named collection in its insertion order — byte-identical output for those. */
const byNumericKey = (keys: string[]): string[] =>
  [...keys].sort((a, b) => {
    // WHOLE-KEY numeric, not `parseFloat` (#1852): `parseFloat('2xl')` is 2 and `parseFloat('3xl')` is 3, so
    // the first t-shirt keys with a leading digit sorted AHEAD of `none` as if they were numbers. A key is a
    // magnitude only when all of it is one; every numeric key these collections carry (`0`, `025`, `1200`)
    // still is.
    const num = (k: string): number => (/^\d+(\.\d+)?$/.test(k) ? Number(k) : NaN);
    const na = num(a);
    const nb = num(b);
    const aNum = Number.isFinite(na);
    const bNum = Number.isFinite(nb);
    if (aNum && bNum) return na - nb;
    if (aNum) return -1;
    if (bNum) return 1;
    return 0;
  });

export type FigmaDimsCollections = {
  dimension: FigmaCollectionFile;
  space: FigmaCollectionFile;
  /** Per-mode collection files (like the colour axis). Default: `[{$mode:'Default',…}]`
   *  — a single-entry array so a non-wireframe brand's `radius.json` stays byte-identical.
   *  When a brand opts into wireframe (docs/11 Pillar 1b), the array carries a second
   *  entry `{$mode:'wireframe',…}` where every non-zero radius aliases `dimension/0`
   *  — the FIRST non-colour/shadow axis to be mode-varying, and the load-bearing
   *  precedent for any future mode-varying geometry. Non-wireframe brands untouched. */
  radius: FigmaCollectionFile[];
  size: FigmaCollectionFile;
  /** Icon artboard ladder (#324). Its own collection rather than a `size/` sub-branch: an icon size
   *  is chosen independently of the control it sits in (a compact button can carry a large glyph),
   *  and Figma scopes differ — WIDTH_HEIGHT only, no padding sibling. */
  icon: FigmaCollectionFile;
  /** Control-box ladder (#900) — a checkbox square, a radio circle, a switch track. Its own
   *  collection because collections here mirror the DTCG top-level family 1:1, and this is a
   *  `control.*` family rather than a `size/` sub-branch. Note the reasoning is NOT `icon`'s: a
   *  control box is chosen WITH the control it belongs to, which is exactly why it is density-
   *  derived where the glyph ladder is fixed. Both fields are WIDTH_HEIGHT — a `width` here is a
   *  switch track's, not a padding sibling. */
  control: FigmaCollectionFile;
  borderWidth: FigmaCollectionFile;
  focus: FigmaCollectionFile;
  opacity: FigmaCollectionFile;
  /** `blur/glass` (#2869) — the glass background-blur radius the `glass` Effect Style binds. EFFECT_FLOAT. */
  blur: FigmaCollectionFile;
};

// ---------------------------------------------------------------------------
// DIMS (docs/10 §7 items 1-2). Nine FLOAT collections; every semantic aliases
// into a `dimension/…` (or `space/…`) primitive so the geometric scale is shared.
//   dimension    → fine-grid primitives (REF TIER, hidden from publishing).
//   space        → spacing rhythm, aliased. Scope: GAP.
//   radius       → t-shirt ramp (none/sm/md/lg/xl/2xl/3xl + the round/capsule pills). Scope: CORNER_RADIUS.
//   size         → component tier — one FLOAT per (t-shirt, prop) pair. `<t>/height` and
//                  `md/min-height` alias dimension (WIDTH_HEIGHT scope). Dimensions only:
//                  padding and gaps bind `space/*` directly (the spacing model, 2026-09-29).
//                  Names use `/` between t-shirt and prop (`md/height`), matching the
//                  colour/font convention.
//   icon         → artboard ladder (#324), its own collection (not a `size/` sub-branch)
//                  since an icon size is chosen independently of its control. Scope: WIDTH_HEIGHT.
//   control      → control-box ladder (#900) — `<rung>/height` (a checkbox square, a radio circle,
//                  a switch track's height) and `<rung>/width` (a switch track's width). Both alias
//                  dimension. Scope: WIDTH_HEIGHT for both — `width` is a track, not a padding.
//   border-width → hairline/thick/heavy/x-heavy + none, aliased. Scope: STROKE_FLOAT.
//   focus        → ring.width / ring.offset / ring.offset-field (STROKE_FLOAT). The
//                  fourth `focus.ring.style` DTCG token (a `strokeStyle: 'solid'`
//                  literal) is intentionally SKIPPED — Figma has no strokeStyle
//                  variable primitive; the literal stays code-side.
//   opacity      → dimensionless 0–1 (0/5/10/…/100 as percent keys). Scope: OPACITY.
//   blur         → `glass` (#2869), the background-blur radius the `glass` Effect Style binds. Scope: EFFECT_FLOAT.
// ---------------------------------------------------------------------------

// Scopes by Figma convention. `dimension` primitives carry none (#2602 — `PRIMITIVE_SCOPES`, so no local
// picker offers them); each semantic collection narrows to its intended surface, so the picker in Figma
// only shows relevant vars.
const SPACE_SCOPES = ['GAP'];
const RADIUS_SCOPES = ['CORNER_RADIUS'];
const BORDER_WIDTH_SCOPES = ['STROKE_FLOAT'];
const FOCUS_SCOPES = ['STROKE_FLOAT'];
const OPACITY_SCOPES = ['OPACITY'];
const BLUR_SCOPES = ['EFFECT_FLOAT'];
const SIZE_HEIGHT_SCOPES = ['WIDTH_HEIGHT'];
const SIZE_PADDING_SCOPES = ['GAP'];

export const buildFigmaDims = (theme: Theme): FigmaDimsCollections => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  /** Every name here is assembled from keys rather than walked out of the tree, so the brand namespace
   *  goes on explicitly (#1097). The ALIAS targets need no help — `aliasFigName` reads a dotted path
   *  that already carries the root.
   *
   *  TWO helpers, because this builder spans both tiers: `dimension/*` is a PRIMITIVE and carries the
   *  `core` segment (#1102), while `space`/`radius`/`size`/`icon`/`control`/`border-width`/`focus`/
   *  `opacity` are semantics that alias into it and stay at the top level. Every `name:` below picks
   *  one, so the tier is visible at the call site rather than inferred from the group's key. */
  const ns = (name: string): string => nsName(root, name);
  const coreDim = (name: string): string => coreName(root, name);
  const brand = tree[root];

  // dimension primitives — REF TIER. Value is the numeric px; no alias.
  // Hidden from publishing AND unscoped (#2602), so designers reach for the
  // `space`/`radius`/`size`/`border-width`/`focus` semantics (all of which
  // alias into this scale) in a consuming file and in this one alike.
  const dimVars: FigmaVar[] = byNumericKey(Object.keys(brand.core.dimension)).map((key) => ({
    name: coreDim(`dimension/${key}`),
    resolvedType: 'FLOAT' as const,
    scopes: PRIMITIVE_SCOPES,
    description: figmaDimensionDescription(pxFromValue(tree, brand.core.dimension[key].$value)),
    value: pxFromValue(tree, brand.core.dimension[key].$value),
    alias: null,
    hiddenFromPublishing: true,
  }));

  // space — aliases into dimension. Value = resolved px (belt-and-suspenders).
  // M-09: guard the alias like every sibling axis (radius/size/border/focus). Space
  // is the one axis that emitted `alias` UNCONDITIONALLY — so a leaf carrying a raw px
  // value (not a `{…}` alias) would ship `alias.name: ''` (aliasFigName returns '' off
  // a non-brace value): a dangling, empty-named binding Figma silently drops the link
  // for. Emit an alias only when the value IS a brace reference; otherwise null.
  const spaceVars: FigmaVar[] = byNumericKey(Object.keys(brand.space)).map((key) => {
    const leaf = brand.space[key];
    const isAlias = typeof leaf.$value === 'string' && /^\{.+\}$/.test(leaf.$value);
    return {
      name: ns(`space/${key}`),
      resolvedType: 'FLOAT' as const,
      scopes: SPACE_SCOPES,
      description: figmaSpaceDescription(pxFromValue(tree, leaf.$value), Number(leaf.$extensions?.prism3?.mult ?? 0)),
      value: pxFromValue(tree, leaf.$value),
      alias: isAlias ? { type: 'VARIABLE_ALIAS' as const, name: aliasFigName(leaf.$value) } : null,
    };
  });

  // Radius is the FIRST non-colour/shadow axis to be MODE-VARYING (docs/11 Pillar 1b).
  // When the brand opts into `wireframe`, non-zero radius leaves carry a
  // `$extensions.prism3.modes.wireframe → {root.core.dimension.0}` override in the DTCG tree
  // (tree.ts:340–346) — the same per-mode override shape colour/shadow use. Materialise
  // that here as a wireframe MODE on the `radius` variable collection: in the wireframe
  // mode file every non-zero radius var aliases `dimension/0`; radius.none stays 0 with
  // no redundant override (matches tree.ts behaviour). Non-wireframe brands emit a
  // single Default-mode file (byte-identical to the pre-1b world).
  // Two families of radius modes coexist on the SAME per-mode file convention: the wireframe mode
  // (not lever-driven — zeroes every radius) and, per Phase D, one mode per `modeLevers.radius`
  // entry (a customizable mode that RE-DERIVES its radius ramp). Both read the DTCG leaf's
  // `$extensions.prism3.modes.<mode>` override the tree emitted; `Default` uses the canonical value.
  const wireframe = theme.modes.includes('wireframe');
  const radiusModes = Object.keys(theme.dims.radiusByMode ?? {});
  const radiusVarsFor = (mode: string): FigmaVar[] =>
    byNumericKey(Object.keys(brand.radius)).map((key) => {
      const leaf = brand.radius[key];
      // Mode leaves are DTCG-only until the brand opts in; a rung that carries no override for this
      // mode (e.g. `radius.none`, already 0, or a rung whose per-mode px equals light) falls through
      // to the canonical leaf — byte-identical to Default for that rung.
      const override = mode === 'Default' ? undefined : leaf.$extensions?.prism3?.modes?.[mode];
      const source: any = override ?? leaf;
      const isAlias = typeof source.$value === 'string' && /^\{.+\}$/.test(source.$value);
      return {
        name: ns(`radius/${key}`),
        resolvedType: 'FLOAT' as const,
        scopes: RADIUS_SCOPES,
        description: figmaRadiusDescription(key, pxFromValue(tree, leaf.$value)),
        value: pxFromValue(tree, source.$value),
        alias: isAlias ? { type: 'VARIABLE_ALIAS' as const, name: aliasFigName(source.$value) } : null,
      };
    });
  const radiusFiles: FigmaCollectionFile[] = [
    { $collection: 'radius', $mode: 'Default', variables: radiusVarsFor('Default') },
    ...(wireframe ? [{ $collection: 'radius', $mode: 'wireframe', variables: radiusVarsFor('wireframe') }] : []),
    ...radiusModes.map((mode) => ({ $collection: 'radius', $mode: mode, variables: radiusVarsFor(mode) })),
  ];

  // size — nested { <tShirt>: { height } }, plus `md.min-height`. Emit one FLOAT per leaf, aliasing
  // dimension. No padding: a component binds its spacing from `space/*` (the spacing model).
  const sizeVars: FigmaVar[] = [];
  for (const t of byNumericKey(Object.keys(brand.size))) {
    // `min-height` (#1437) is the interactive target-size floor, present on `md` only; the `if (!leaf)`
    // guard skips it on the other rungs. It is a HEIGHT (aliases the dimension grid), like `height`.
    for (const prop of ['height', 'min-height']) {
      const leaf = brand.size[t][prop];
      if (!leaf) continue;
      const isAlias = typeof leaf.$value === 'string' && /^\{.+\}$/.test(leaf.$value);
      sizeVars.push({
        name: ns(`size/${t}/${prop}`),
        resolvedType: 'FLOAT',
        scopes: SIZE_HEIGHT_SCOPES,
        description: figmaSizeDescription(prop, pxFromValue(tree, leaf.$value)),
        value: pxFromValue(tree, leaf.$value),
        alias: isAlias ? { type: 'VARIABLE_ALIAS', name: aliasFigName(leaf.$value) } : null,
      });
    }
  }

  // icon — one FLOAT per step, aliasing the dimension grid (the DTCG tier already does; this mirrors
  // it so a Figma component has a variable to bind its visual slot against, which is the whole reason
  // #324 blocked the Button materialization spike).
  const iconVars: FigmaVar[] = byNumericKey(Object.keys(brand.icon?.size ?? {})).map((key) => {
    const leaf = brand.icon.size[key];
    const isAlias = typeof leaf.$value === 'string' && /^\{.+\}$/.test(leaf.$value);
    return {
      name: ns(`icon/size/${key}`),
      resolvedType: 'FLOAT' as const,
      scopes: SIZE_HEIGHT_SCOPES,
      description: figmaIconSizeDescription(pxFromValue(tree, leaf.$value), key),
      value: pxFromValue(tree, leaf.$value),
      alias: isAlias ? { type: 'VARIABLE_ALIAS' as const, name: aliasFigName(leaf.$value) } : null,
    };
  });

  // control — one FLOAT per (rung, field) pair, aliasing the dimension grid exactly as the DTCG tier
  // does, so a Figma checkbox/radio/switch has a variable to bind its box against (#900). Names use
  // `/` between rung and field (`control/size/md/height`), matching every sibling collection.
  const controlVars: FigmaVar[] = [];
  for (const rung of byNumericKey(Object.keys(brand.control?.size ?? {}))) {
    // Named rather than read off the leaf keys, deliberately: what Figma carries is an authored
    // decision, so a field added to the DTCG tier does not reach a client's file until someone puts it
    // here. `dot` arrived with radio's anatomy (#910); `line-box` with #1201 — the selection-control
    // alignment box binds it as a variable, so it must be a variable in the client's file, not DTCG-only.
    // `inset` with #997, for the identical reason: switch's track binds it as PADDING, and a padding
    // bound to a variable the client's file does not carry resolves to nothing. The authored list is
    // what caught that — `tools/exporter-comparison/gate.ts` reported the three new paths as
    // prism3-only on the first run, which is this list's stated purpose working as designed.
    // `radius` with #1015, and it is the field this list exists for: checkbox's box binds its CORNER to
    // it, so a client file without the variable renders the corner unbound — the DTCG tier carrying the
    // value would not help, because nothing in Figma reads DTCG.
    // `track` + `thumb` with #1425 — the switch's own track height and traveling thumb. `switch-control`
    // binds both as variables (the track's `height`, the thumb's `size`), so a client file lacking them
    // would render the switch unbound; both are WIDTH_HEIGHT dimensions like `height`/`dot`. This list
    // caught them exactly as it caught `inset`: the exporter gate reported the six new paths as prism3-only
    // on the first run, which is this authored list's stated purpose working as designed.
    // The rung's own px per field — the Figma line states the arithmetic from these, not from the DTCG prose.
    const rungPx: Record<string, number> = Object.fromEntries(Object.entries(brand.control.size[rung])
      .filter(([k]) => !k.startsWith('$')).map(([k, l]: [string, any]) => [k, pxFromValue(tree, l.$value)]));
    for (const field of ['height', 'width', 'dot', 'line-box', 'inset', 'radius', 'track', 'thumb']) {
      const leaf = brand.control.size[rung][field];
      if (!leaf) continue;
      const isAlias = typeof leaf.$value === 'string' && /^\{.+\}$/.test(leaf.$value);
      controlVars.push({
        name: ns(`control/size/${rung}/${field}`),
        resolvedType: 'FLOAT',
        // GAP for `inset`, CORNER_RADIUS for `radius`, WIDTH_HEIGHT for the rest — the same split line
        // 211 makes for `size.*`, and it is not cosmetic: Figma offers a FLOAT variable only in the
        // fields its scopes name, so an inset scoped WIDTH_HEIGHT would be invisible in the padding
        // control that is its only consumer, and a corner scoped the same way invisible in the radius one.
        scopes: field === 'inset' ? SIZE_PADDING_SCOPES : field === 'radius' ? RADIUS_SCOPES : SIZE_HEIGHT_SCOPES,
        description: figmaControlDescription(field, rungPx, rung),
        value: pxFromValue(tree, leaf.$value),
        alias: isAlias ? { type: 'VARIABLE_ALIAS', name: aliasFigName(leaf.$value) } : null,
      });
    }
  }

  // `type/label/{rung}/line-box` with #2586 — a title row's glyph box binds it as a variable, exactly as
  // `control/size/{rung}/line-box` above. It lives in this single-mode collection (Q282 A), not in the
  // viewport-moded `type-sets`: it is one baked px per rung, and a Figma variable cannot multiply the
  // composite's size by its line height.
  for (const rung of byNumericKey(Object.keys(brand.type?.label ?? {}))) {
    const leaf = brand.type.label[rung]?.['line-box'];
    if (!leaf) continue;
    const px = pxFromValue(tree, leaf.$value);
    controlVars.push({
      name: ns(`type/label/${rung}/line-box`),
      resolvedType: 'FLOAT',
      scopes: SIZE_HEIGHT_SCOPES,
      description: figmaLabelLineBoxDescription(rung, px),
      value: px,
      alias: null,
    });
  }

  const borderVars: FigmaVar[] = Object.keys(brand['border-width']).map((key) => {
    const leaf = brand['border-width'][key];
    const isAlias = typeof leaf.$value === 'string' && /^\{.+\}$/.test(leaf.$value);
    return {
      name: ns(`border-width/${key}`),
      resolvedType: 'FLOAT' as const,
      scopes: BORDER_WIDTH_SCOPES,
      description: figmaBorderWidthDescription(pxFromValue(tree, leaf.$value)),
      value: pxFromValue(tree, leaf.$value),
      alias: isAlias ? { type: 'VARIABLE_ALIAS' as const, name: aliasFigName(leaf.$value) } : null,
    };
  });

  // focus — nested `ring.width` / `ring.offset` / `ring.offset-field` all
  // FLOAT; skip `ring.style` (strokeStyle — no Figma primitive).
  const focusVars: FigmaVar[] = [];
  const ring = brand.focus?.ring ?? {};
  for (const key of Object.keys(ring)) {
    const leaf = ring[key];
    if (leaf.$type !== 'dimension') continue; // skip strokeStyle
    const isAlias = typeof leaf.$value === 'string' && /^\{.+\}$/.test(leaf.$value);
    focusVars.push({
      name: ns(`focus/ring/${key}`),
      resolvedType: 'FLOAT',
      scopes: FOCUS_SCOPES,
      description: figmaFocusDescription(key, pxFromValue(tree, leaf.$value)),
      value: pxFromValue(tree, leaf.$value),
      alias: isAlias ? { type: 'VARIABLE_ALIAS', name: aliasFigName(leaf.$value) } : null,
    });
  }

  // Opacity — REF TIER PRIMITIVES. Figma's OPACITY-scoped FLOAT is interpreted
  // as PERCENT (0–100), not fraction. The DTCG tree stores the CSS-correct
  // fraction (`0.9`), so the adapter multiplies by 100 for the Figma target.
  // Verified live: passing 0.9 renders as 0.9% (nearly invisible), not 90%.
  // This is a Figma-target rendering decision, so it lives here — the DTCG
  // stays 0–1 for CSS. opacity is DIRECTLY CONSUMABLE (#79): unlike the ref-tier
  // primitives (palette/dimension/font), there is no semantic layer to reach for
  // instead, so it is NOT hidden from publishing — it stays visible in the library
  // picker with its OPACITY scope, matching the sidecar (`consume: Consumable`),
  // eval (excluded from PRIMITIVE_GROUPS), and the prism3-consume skill.
  const opacityVars: FigmaVar[] = byNumericKey(Object.keys(brand.opacity)).map((key) => ({
    name: ns(`opacity/${key}`),
    resolvedType: 'FLOAT' as const,
    scopes: OPACITY_SCOPES,
    description: figmaOpacityDescription(Math.round((brand.opacity[key].$value as number) * 100)),
    value: Math.round((brand.opacity[key].$value as number) * 100),
    alias: null,
  }));

  // Blur (#2869) — a literal px radius, published: an Effect Style binds it, and so may a designer's own blur.
  const blurVars: FigmaVar[] = Object.keys(brand.blur).map((key) => ({
    name: ns(`blur/${key}`),
    resolvedType: 'FLOAT' as const,
    scopes: BLUR_SCOPES,
    description: figmaBlurDescription(key, pxFromValue(tree, brand.blur[key].$value)),
    value: pxFromValue(tree, brand.blur[key].$value),
    alias: null,
  }));

  const c = (name: string, variables: FigmaVar[]): FigmaCollectionFile => ({ $collection: name, $mode: 'Default', variables });
  return {
    dimension: c(CORE_COLLECTION, dimVars),
    space: c('space', spaceVars),
    radius: radiusFiles,
    size: c('size', sizeVars),
    icon: c('icon', iconVars),
    control: c('control', controlVars),
    borderWidth: c('border-width', borderVars),
    focus: c('focus', focusVars),
    opacity: c('opacity', opacityVars),
    blur: c('blur', blurVars),
  };
};

// ---------------------------------------------------------------------------
// MOTION (#2394, #2412, docs/10 §5) — ONE `motion` collection in Figma's own motion types (owner Q291).
//   motion/duration-ms/<n>         → TIMING primitives, in SECONDS (hidden from publishing, like `core`).
//   motion/duration/<role>         → TIMING aliases into duration-ms, as the DTCG aliases them.
//   motion/duration-reduced/<role> → the reduce-motion companion, same shape.
//   motion/stagger                 → TIMING alias into duration-ms.
//   motion/easing/<curve>          → EASING `CUSTOM_CUBIC_BEZIER` primitives (hidden from publishing).
//   motion/easing-role/<role>      → EASING aliases into easing, re-pointed per mode where a mode lever moves one.
//   motion/spring/<name>           → EASING `CUSTOM_SPRING`, `bounce` only. Published: no role tier aliases a
//                                    spring, so hiding one would leave a library with no handle on it.
//   motion/transition/*            → NOT EMITTED: Figma has no composite variable, and the nearest thing, an
//                                    animation style, must also name WHAT animates, which a DTCG transition does
//                                    not say (Q291 4). A transition is its duration plus its easing role, and
//                                    both of those are here. `MOTION_FIGMA_COVERAGE` states it per family.
// Names keep the DTCG path (`motion` is a top-level DTCG family, so the collection mirrors it 1:1 and the export
// lands on the same paths with no renaming). That includes `duration-ms`, whose values are now seconds: the
// name is the DTCG path, the value is in the unit Figma's TIMING holds (spike #2403: every field a TIMING
// variable binds to is in seconds), and the description still says the milliseconds.
//
// NO SCOPE WRITE, and it is not a choice: Figma refuses `scopes` on TIMING and EASING ("Cannot set scopes on this
// variable type", spike #2403), so they stay `ALL_SCOPES`, and the emission says so rather than state a `[]`
// the file can never hold. The executors skip the write for every `UNSCOPED_TYPES` row.
//
// A spring's `bounce` is 1 − its damping RATIO, which is what the DTCG `spring.damping` holds; the spike
// confirmed the identity against `figma.motion.physicalSpringToNormalized` (snappy 0.10, gentle 0.20, bouncy
// 0.40). Stiffness has no place in an EASING value (Q291 3): in Figma a spring's length is its paired duration.
//
// MODES follow the radius precedent: a brand whose mode levers run a different tempo, or re-point an easing
// role, carries a `$extensions.prism3.modes.<mode>` re-point on the semantic leaf (tree.ts), and each such mode
// becomes a mode here, the semantic aliasing the mode's primitive. Neither ⇒ one `Default` mode.
// ---------------------------------------------------------------------------

/** What Figma holds on a TIMING or EASING variable, since it refuses any other (`UNSCOPED_TYPES`). */
const MOTION_SCOPES: string[] = ['ALL_SCOPES'];

/** Every DTCG motion family and its Figma form, or the reason it has none (#2412 "done when"). Read by the
 *  suite against the DTCG tree, so a family added to `motion` without a line here fails by name. */
export const MOTION_FIGMA_COVERAGE: Record<string, { figma: 'TIMING' | 'EASING' } | { none: string }> = {
  'duration-ms': { figma: 'TIMING' },
  duration: { figma: 'TIMING' },
  'duration-reduced': { figma: 'TIMING' },
  stagger: { figma: 'TIMING' },
  easing: { figma: 'EASING' },
  'easing-role': { figma: 'EASING' },
  spring: { figma: 'EASING' },
  transition: { none: 'Figma has no composite variable; a transition is its duration and its easing role, both emitted' },
};

/** Milliseconds from a DTCG duration `$value` — a `"200ms"` literal or a `{…}` alias to one. */
const msFromValue = (tree: any, v: unknown): number => {
  if (typeof v === 'string') {
    const m = /^\{(.+)\}$/.exec(v);
    if (m) return msFromValue(tree, at(tree, m[1])?.$value);
    const ms = /^(-?\d+(?:\.\d+)?)ms$/.exec(v);
    if (ms) return Number(ms[1]);
  }
  throw new Error(`emit-figma motion: not a millisecond duration: ${JSON.stringify(v)}`);
};
/** Seconds, the unit a TIMING variable holds, from milliseconds. Rounded so 260ms is 0.26, not float noise. */
const secondsOf = (ms: number): number => Math.round(ms * 1000) / 1e6;
/** The curve key a role or curve `$value` names — `{<root>.motion.easing.<curve>}` → `<curve>`. */
const curveOf = (v: unknown): string => {
  const m = typeof v === 'string' ? /\.motion\.easing\.([^.}]+)\}$/.exec(v) : null;
  if (!m) throw new Error(`emit-figma motion: not an easing alias: ${JSON.stringify(v)}`);
  return m[1];
};
/** A DTCG `cubicBezier` `[x1, y1, x2, y2]` as Figma's `CUSTOM_CUBIC_BEZIER`. */
const bezierEasing = (b: number[]): FigmaEasing => ({
  type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1: b[0], y1: b[1], x2: b[2], y2: b[3] },
});
/** Figma's normalized `bounce` from a DTCG spring's damping ratio: 1 − ζ. A ratio outside (0, 1] has no bounce
 *  Figma would take for the same spring, so it throws rather than clamp. */
export const springBounce = (damping: number): number => {
  if (!(damping > 0 && damping <= 1)) throw new Error(`emit-figma motion: a spring damping ratio must be in (0, 1], got ${damping}`);
  return Math.round((1 - damping) * 1e5) / 1e5;
};

export const buildFigmaMotion = (theme: Theme): FigmaCollectionFile[] => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const ns = (name: string): string => nsName(root, name);
  const motion = tree[root].motion;
  // A mode is any mode a tempo lever or an easing-role lever moves, in the order the theme declares them.
  const modes = ['Default', ...new Set([...Object.keys(theme.motion.motionByMode ?? {}), ...Object.keys(theme.motion.easingRolesByMode ?? {})])];
  const isAlias = (v: unknown): v is string => typeof v === 'string' && /^\{.+\}$/.test(v);
  const pick = (leaf: any, mode: string): any => (mode === 'Default' ? leaf : leaf.$extensions?.prism3?.modes?.[mode] ?? leaf);

  // The semantic durations, in DTCG order: every `duration` role, every `duration-reduced` role, then stagger.
  const semantics: Array<{ name: string; leaf: any; describe: (ms: number, byMode: Array<[string, number]>) => string }> = [
    ...Object.keys(motion.duration).map((role) => ({
      name: `motion/duration/${role}`, leaf: motion.duration[role],
      describe: (ms: number, byMode: Array<[string, number]>) => figmaDurationDescription(role, ms, byMode, false),
    })),
    ...Object.keys(motion['duration-reduced']).map((role) => ({
      name: `motion/duration-reduced/${role}`, leaf: motion['duration-reduced'][role],
      describe: (ms: number, byMode: Array<[string, number]>) => figmaDurationDescription(role, ms, byMode, true),
    })),
    { name: 'motion/stagger', leaf: motion.stagger, describe: figmaStaggerDescription },
  ];

  const varsFor = (mode: string): FigmaVar[] => {
    const prims: FigmaVar[] = byNumericKey(Object.keys(motion['duration-ms'])).map((key) => ({
      name: ns(`motion/duration-ms/${key}`),
      resolvedType: 'TIMING' as const,
      scopes: MOTION_SCOPES,
      description: figmaDurationPrimitiveDescription(msFromValue(tree, motion['duration-ms'][key].$value)),
      value: secondsOf(msFromValue(tree, motion['duration-ms'][key].$value)),
      alias: null,
      hiddenFromPublishing: true,
    }));
    const sems: FigmaVar[] = semantics.map(({ name, leaf, describe }) => {
      const overrides: Record<string, any> = leaf.$extensions?.prism3?.modes ?? {};
      const source = pick(leaf, mode);
      const byMode: Array<[string, number]> = modes.slice(1).filter((m) => overrides[m]).map((m) => [m, msFromValue(tree, overrides[m].$value)]);
      return {
        name: ns(name),
        resolvedType: 'TIMING' as const,
        scopes: MOTION_SCOPES,
        description: describe(msFromValue(tree, leaf.$value), byMode),
        value: secondsOf(msFromValue(tree, source.$value)),
        alias: isAlias(source.$value) ? { type: 'VARIABLE_ALIAS' as const, name: aliasFigName(source.$value) } : null,
      };
    });
    const curves: FigmaVar[] = Object.keys(motion.easing).map((curve) => ({
      name: ns(`motion/easing/${curve}`),
      resolvedType: 'EASING' as const,
      scopes: MOTION_SCOPES,
      description: figmaCurveDescription(motion.easing[curve].$value),
      value: bezierEasing(motion.easing[curve].$value),
      alias: null,
      hiddenFromPublishing: true,
    }));
    const roles: FigmaVar[] = Object.keys(motion['easing-role']).map((role) => {
      const leaf = motion['easing-role'][role];
      const overrides: Record<string, any> = leaf.$extensions?.prism3?.modes ?? {};
      const source = pick(leaf, mode);
      const byMode: Array<[string, string]> = modes.slice(1).filter((m) => overrides[m]).map((m) => [m, curveOf(overrides[m].$value)]);
      return {
        name: ns(`motion/easing-role/${role}`),
        resolvedType: 'EASING' as const,
        scopes: MOTION_SCOPES,
        description: figmaEasingRoleDescription(role, curveOf(leaf.$value), byMode),
        value: bezierEasing(motion.easing[curveOf(source.$value)].$value),
        alias: { type: 'VARIABLE_ALIAS' as const, name: aliasFigName(source.$value) },
      };
    });
    const springs: FigmaVar[] = Object.keys(motion.spring).map((name) => {
      const bounce = springBounce(motion.spring[name].$value.damping);
      return {
        name: ns(`motion/spring/${name}`),
        resolvedType: 'EASING' as const,
        scopes: MOTION_SCOPES,
        description: figmaSpringDescription(name, bounce),
        value: { type: 'CUSTOM_SPRING' as const, easingFunctionSpring: { bounce } },
        alias: null,
      };
    });
    return [...prims, ...sems, ...curves, ...roles, ...springs];
  };
  return modes.map((mode) => ({ $collection: 'motion', $mode: mode, variables: varsFor(mode) }));
};

// ---------------------------------------------------------------------------
// LAYOUT (docs/10 §7 item 4). ONE `layout` variable collection with breakpoint
// modes (`sm`/`md`/`lg`/`xl`/`2xl` by default — the brand's actual grid keys).
// Each mode carries the SAME variable names with different values/aliases per
// mode — the mode column IS the breakpoint, exactly the way colour modes carry
// the same semantic names with different palette-aliased values per light/dark.
// Composes independently with the colour light/dark collection: a component can
// bind background to a `color` var (respects theme mode) AND padding to a
// `layout` var (respects viewport mode), and Figma resolves each per its own
// collection.
//   breakpoint/{name}   — FLOAT, the min-width threshold (mode-invariant).
//   grid/columns        — FLOAT, per-mode count. No scope (no count scope exists).
//   grid/gutter,margin  — FLOAT, PER-MODE alias into `space/*`. Scope: GAP.
//   container/max,narrow,min — FLOAT, viewport-invariant. Scope: WIDTH_HEIGHT.
// `container/fluid` (`"100%"`) skipped — Figma has no percentage FLOAT primitive.
// ---------------------------------------------------------------------------

export const LAYOUT_MODES = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

// grid/columns is a count, not a dimension — none of the FLOAT scopes fit
// (WIDTH_HEIGHT/GAP/CORNER_RADIUS/STROKE_FLOAT/OPACITY/FONT_*), and `VariableScope`
// has no layout-grid member (plugin-typings 1.131.0). It carries NO scope (#2602):
// ALL_SCOPES offered a column count in every FLOAT picker — as a width, a gap, a
// radius, an opacity. Nothing in Prism3 binds it (the grid styles bake the count as a
// literal, `emit-figma-styles.ts`), and scopes limit only the pickers, so it stays
// bindable to a grid's `count` through `setBoundVariableForLayoutGrid`.
const LAYOUT_COLUMNS_SCOPES: string[] = [];
const LAYOUT_GAP_SCOPES = ['GAP']; // gutter + margin — same as the space collection they alias
const LAYOUT_CONTAINER_SCOPES = ['WIDTH_HEIGHT'];
const LAYOUT_BREAKPOINT_SCOPES = ['WIDTH_HEIGHT']; // min-width threshold

export const buildFigmaLayout = (theme: Theme): FigmaCollectionFile[] => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const ns = (name: string): string => nsName(root, name);
  const brand = tree[root];
  const bpNode = brand.breakpoint;
  const gridNode = brand.grid;
  const containerNode = brand.container;

  // CR-08 (#74): emit one layout mode per breakpoint the brand ACTUALLY ships (the grid node's
  // keys, already in ascending order) — NOT a hardcoded 5. A 6-breakpoint brand (aurora: xs..2xl)
  // otherwise silently drops its base `xs` grid, and a ≤3-breakpoint brand would read
  // `gridNode[mode]` undefined and crash. `LAYOUT_MODES` stays the DEFAULT breakpoint-name set
  // (a 4-floor brief auto-names them sm..xl); the emit follows whatever the brand generated.
  const modes = Object.keys(gridNode);

  // ONE description per grid variable, shared by every breakpoint mode (#1623 FG/F-1). A Figma variable
  // carries a single description across its modes, and the plan builder keeps the first mode file's, so a
  // per-breakpoint sentence ("grid xs — 4 columns") was the only text a designer saw in all six modes and
  // was false in five. The shared line lists the value per breakpoint instead, runs of equal values merged.
  const perBreakpoint = (valueOf: (mode: string) => number, unit: string): string => {
    const runs: { from: string; to: string; v: number }[] = [];
    for (const m of modes) {
      const v = valueOf(m);
      const last = runs[runs.length - 1];
      if (last && last.v === v) last.to = m; else runs.push({ from: m, to: m, v });
    }
    return runs.map((r) => `${r.from === r.to ? r.from : `${r.from}–${r.to}`} ${r.v}${unit}`).join(' · ');
  };
  const gridDescription = {
    columns: figmaGridVarDescription('columns', perBreakpoint((m) => gridNode[m].columns.$value as number, '')),
    ...Object.fromEntries((['gutter', 'margin'] as const).map((key) => [key,
      figmaGridVarDescription(key, perBreakpoint((m) => pxFromValue(tree, gridNode[m][key].$value), 'px'))])),
  } as Record<'columns' | 'gutter' | 'margin', string>;

  return modes.map((mode) => {
    const variables: FigmaVar[] = [];

    // breakpoint/* — mode-invariant reference constants (same value in every
    // mode file; the materialiser handles the dedup by-name).
    for (const bpKey of Object.keys(bpNode)) {
      const leaf = bpNode[bpKey];
      variables.push({
        name: ns(`breakpoint/${bpKey}`),
        resolvedType: 'FLOAT',
        scopes: LAYOUT_BREAKPOINT_SCOPES,
        description: figmaBreakpointDescription(pxFromValue(tree, leaf.$value)),
        value: pxFromValue(tree, leaf.$value),
        alias: null,
      });
    }

    // grid/* — per-mode. columns is a plain FLOAT; gutter/margin alias space/*.
    const g = gridNode[mode];
    variables.push({
      name: ns('grid/columns'),
      resolvedType: 'FLOAT',
      scopes: LAYOUT_COLUMNS_SCOPES,
      description: gridDescription.columns,
      value: g.columns.$value as number,
      alias: null,
    });
    for (const key of ['gutter', 'margin'] as const) {
      const leaf = g[key];
      const isAlias = typeof leaf.$value === 'string' && /^\{.+\}$/.test(leaf.$value);
      variables.push({
        name: ns(`grid/${key}`),
        resolvedType: 'FLOAT',
        scopes: LAYOUT_GAP_SCOPES,
        description: gridDescription[key],
        value: pxFromValue(tree, leaf.$value),
        alias: isAlias ? { type: 'VARIABLE_ALIAS', name: aliasFigName(leaf.$value) } : null,
      });
    }

    // container/max + container/narrow + container/min — viewport-invariant. Skip fluid (100%).
    for (const cKey of ['max', 'narrow', 'min'] as const) {
      const leaf = containerNode[cKey];
      variables.push({
        name: ns(`container/${cKey}`),
        resolvedType: 'FLOAT',
        scopes: LAYOUT_CONTAINER_SCOPES,
        description: figmaContainerDescription(cKey, pxFromValue(tree, leaf.$value)),
        value: pxFromValue(tree, leaf.$value),
        alias: null,
      });
    }

    return { $collection: 'layout', $mode: mode, variables };
  });
};
