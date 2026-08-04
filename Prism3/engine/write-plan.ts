/**
 * Prism3 engine — the WRITE PLAN (docs/22 Phase 3 / #108).
 *
 * The single, host-neutral description of "what colour variables to materialise" — a pure
 * data reshape of the already-resolved raw-figma collection files (`buildFigmaColor`'s
 * `{ palette, color[] }`). It is the SOURCE OF TRUTH both write paths consume:
 *   • the CLI string-emitter (`materialise-to-figma.ts`) — the paste-into-`figma_execute` path,
 *   • the live plugin executor (`plugin/src/write-figma.ts` → `figma.variables.*`).
 * Extracting it means the two paths can't drift: the collapse-proof per-mode alias binding, the
 * scopes, and the hidden-primitive flags are decided ONCE, here.
 *
 * The plan encodes the same three passes the materialiser has always run (docs/10 §3):
 *   1. `palette` — the `core-palette` collection: one Default mode, literal RGBA, primitives
 *      hidden from publishing (ref tier).
 *   2. `color.create` — the `color` collection across N modes: literal per-mode fallback RGBA
 *      (every var + value exists before any alias binds — pass A of the two-pass write).
 *   3. `color.aliases` — the semantic→primitive links, ONE TARGET PER MODE. This is the
 *      collapse-guard (the #85 round-trip caught a script that bound light's target to all
 *      modes → every mode identical); the plan carries each mode's OWN target so a faithful
 *      executor can't collapse them.
 *
 * PURE — no `node:*`, no `figma.*`, no I/O (types-only import from `emit-figma`). Bundles into
 * the plugin main thread (which has no filesystem); the disk-read lives in the CLI shell that
 * calls this.
 */
import type { FigmaCollectionFile, FigmaColor, FigmaVar } from './emit-figma-color';
import type { Theme } from './theme';
import { buildFigmaDims, buildFigmaLayout } from './emit-figma-dims';
import { buildFigmaShadow, buildFigmaGradient } from './emit-figma-styles';
import type { FigmaEffect, FigmaEffectStylesFile, FigmaPaintStylesFile } from './emit-figma-styles';
import { buildFigmaFont, buildFigmaFontFluid, buildFigmaTextStyles } from './emit-figma-font';
import type { FigmaTextStyle, FigmaTextStylesFile } from './emit-figma-font';

/** A colour value as Figma's variable API wants it (RGBA floats 0–1). */
export type Rgba = { r: number; g: number; b: number; a: number };

/** One `core-palette` primitive: a literal colour, hidden from library publishing. */
export type PaletteRow = {
  name: string;
  scopes: string[];
  description: string;
  value: Rgba;
  hidden: boolean;
};

/** One `color` variable's literal fallback values — one RGBA per mode, in `modes` order
 *  (pass A: every var exists with a real value before any alias binds). */
export type ColorCreateRow = {
  name: string;
  scopes: string[];
  description: string;
  valuesByMode: Rgba[];
};

/** One `color` variable's alias targets — one target var-name per mode, in `modes` order
 *  (pass B: each mode binds its OWN target; `null` = no alias for that mode). This per-mode
 *  shape is the collapse-guard the `aliasRows` tests lock. */
export type ColorAliasRow = {
  name: string;
  targetsByMode: (string | null)[];
};

/** The full colour materialisation plan — host-neutral, ready for any executor. */
export type WritePlan = {
  palette: PaletteRow[];
  color: {
    modes: string[];
    create: ColorCreateRow[];
    aliases: ColorAliasRow[];
  };
};

// Rounding mirrors the materialiser: keep RGBA compact + deterministic (5 dp), so the plan
// is byte-stable across the CLI-embed path and the live executor.
const round = (n: number): number => Math.round(n * 1e5) / 1e5;
const rgba = (v: FigmaColor): Rgba => ({ r: round(v.r), g: round(v.g), b: round(v.b), a: round(v.a) });

/**
 * Reshape the resolved colour collection files into the host-neutral write plan.
 *
 * Inputs are the OUTPUT of `buildFigmaColor(theme)` (or the equivalent read off disk): the
 * palette file (one mode) + one `color` file per emitted mode, ALL already carrying resolved
 * scopes/values/alias-targets. This function only reprojects them into the pass shape — no
 * theme resolution, no I/O.
 *
 * The `color` files share one variable order (they're the same leaves per mode), so the create
 * + alias rows are built by walking the first mode file's variables and reading each mode's
 * value/alias at the same index — exactly how the materialiser has always done it.
 */
export const buildWritePlan = (
  { palette, color }: { palette: FigmaCollectionFile; color: FigmaCollectionFile[] },
): WritePlan => {
  const paletteRows: PaletteRow[] = palette.variables.map((v) => ({
    name: v.name,
    scopes: v.scopes,
    description: v.description,
    value: rgba(v.value as FigmaColor),
    hidden: !!v.hiddenFromPublishing,
  }));

  const modes = color.map((f) => f.$mode);
  const base = color[0]?.variables ?? [];
  const create: ColorCreateRow[] = base.map((v, i) => ({
    name: v.name,
    scopes: v.scopes,
    description: v.description,
    valuesByMode: color.map((f) => rgba(f.variables[i].value as FigmaColor)),
  }));
  const aliases: ColorAliasRow[] = base.map((v, i) => ({
    name: v.name,
    targetsByMode: color.map((f) => f.variables[i].alias?.name ?? null),
  }));

  return { palette: paletteRows, color: { modes, create, aliases } };
};

// ---------------------------------------------------------------------------
// FLOAT-VARIABLE AXES (#146) — the geometric/dimensional layer beyond colour.
// The engine already builds these as FLOAT `FigmaCollectionFile`s (`buildFigmaDims` +
// `buildFigmaLayout`, both node-free in `emit-figma-dims`); this reshapes them into the SAME
// host-neutral pass shape as the colour plan — create-all-then-alias, one target per mode — so
// the plugin executor (`applyFloatPlan`) can reuse the two-pass structure of `applyWritePlan`.
//
// Each axis is ONE `FloatCollectionPlan`: `core-dimension`/`space`/`size`/`border-width`/`focus`/
// `opacity` are single-mode (`Default`); `radius` is 1 or 2 modes (`Default` [+ `wireframe`]); and
// `layout` carries one mode per breakpoint the brand ships. Cross-collection aliases (space→
// dimension, size→dimension/space, radius→dimension, layout grid→space) bind by NAME across ALL
// float collections — the executor resolves them against one global name map, exactly like the
// colour aliases resolve palette targets.
// ---------------------------------------------------------------------------

/** One FLOAT variable's literal per-mode values (numbers), in `modes` order — pass A. `hidden`
 *  carries `hiddenFromPublishing` (only the `core-dimension` primitives set it). */
export type FloatCreateRow = {
  name: string;
  scopes: string[];
  description: string;
  hidden: boolean;
  valuesByMode: number[];
};

/** One FLOAT variable's alias targets — one target var-name per mode, in `modes` order (pass B;
 *  `null` = literal-only for that mode). Same collapse-safe per-mode shape as the colour plan. */
export type FloatAliasRow = {
  name: string;
  targetsByMode: (string | null)[];
};

/** One FLOAT collection's materialisation plan (a `core-dimension`/`space`/…/`layout` collection). */
export type FloatCollectionPlan = {
  name: string;
  modes: string[];
  create: FloatCreateRow[];
  aliases: FloatAliasRow[];
};

// FLOAT values are integers/px (or 0–100 opacity); round like the colour plan for byte-stability
// (identity here, but keeps the two plans symmetrical).
const roundFloat = (n: number): number => Math.round(n * 1e5) / 1e5;

/** Reshape one axis's per-mode `FigmaCollectionFile[]` (all sharing one variable order) into a
 *  `FloatCollectionPlan`. Mirrors the colour reshape: walk the first mode's vars, read each mode's
 *  value/alias at the same index. A single-mode axis is just a one-element array. */
export const floatPlanFor = (name: string, files: FigmaCollectionFile[]): FloatCollectionPlan => {
  const modes = files.map((f) => f.$mode);
  const base = files[0]?.variables ?? [];
  const create: FloatCreateRow[] = base.map((v, i) => ({
    name: v.name,
    scopes: v.scopes,
    description: v.description,
    hidden: !!v.hiddenFromPublishing,
    valuesByMode: files.map((f) => roundFloat(f.variables[i].value as number)),
  }));
  const aliases: FloatAliasRow[] = base.map((v, i) => ({
    name: v.name,
    targetsByMode: files.map((f) => (f.variables[i] as FigmaVar).alias?.name ?? null),
  }));
  return { name, modes, create, aliases };
};

/**
 * The full FLOAT materialisation plan — one `FloatCollectionPlan` per axis, host-neutral and ready
 * for the plugin executor. PURE: calls the node-free `buildFigmaDims`/`buildFigmaLayout` and reshapes
 * — no I/O, so it bundles into the plugin main thread alongside `buildWritePlan`.
 */
export const buildFloatWritePlan = (theme: Theme): FloatCollectionPlan[] => {
  const dims = buildFigmaDims(theme);
  const layout = buildFigmaLayout(theme); // one FigmaCollectionFile per breakpoint mode
  return [
    floatPlanFor('core-dimension', [dims.dimension]),
    floatPlanFor('space', [dims.space]),
    floatPlanFor('radius', dims.radius), // 1 or 2 modes (Default [+ wireframe])
    floatPlanFor('size', [dims.size]),
    floatPlanFor('icon', [dims.icon]),   // #324 — the visual slot's bindable size
    floatPlanFor('border-width', [dims.borderWidth]),
    floatPlanFor('focus', [dims.focus]),
    floatPlanFor('opacity', [dims.opacity]),
    floatPlanFor('layout', layout),
  ];
};

// ---------------------------------------------------------------------------
// STYLE AXES (shadow/gradient lane) — the non-variable write. Shadow → Effect Styles,
// gradient → Paint Styles. Reshapes the node-free `buildFigmaShadow`/`buildFigmaGradient` into a
// host-neutral plan the plugin styles executor (`applyStylesPlan`) consumes. Unlike the variable
// plans there's no alias graph — styles hold resolved values. Two lane decisions live here:
//   • shadow → BOTH style sets (`shadow/*` light + `shadow-dark/*` dark), verbatim from the emit
//     (Effect Styles can't carry Figma modes; a component swaps the pair by mode).
//   • gradient stops → BAKED resolved RGBA (not variable-bound); the `angle`/`center` the emit
//     carries is converted HERE into Figma's 2×3 `gradientTransform` (Figma positions gradients by
//     an affine transform, not an angle). Variable-linked stops are a deferred fast-follow.
// ---------------------------------------------------------------------------

/** Figma's gradient positioning matrix — a 2×3 affine `[[a,b,tx],[c,d,ty]]` mapping the layer's
 *  unit space to gradient space. */
export type GradientTransform = [[number, number, number], [number, number, number]];

/** One Effect Style to materialise (a shadow step, light or dark). Effects carry resolved RGBA. */
export type EffectStyleRow = { name: string; description: string; effects: FigmaEffect[] };

/** One Paint Style to materialise (a gradient). Stops are BAKED resolved RGBA; `gradientTransform`
 *  encodes the angle/center the emit carried. */
export type PaintStyleRow = {
  name: string;
  description: string;
  paintType: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
  gradientTransform: GradientTransform;
  stops: { position: number; color: Rgba }[];
};

/** The full styles plan — Effect Styles (shadows) + Paint Styles (gradients). */
export type StylesPlan = { effects: EffectStyleRow[]; paints: PaintStyleRow[] };

/**
 * Figma gradient transform for a given kind + angle/center.
 *
 * LINEAR: `angleDeg` is the SAME CSS `linear-gradient(<deg>)` angle the web renderer consumes
 * (`tree.ts` `gradientCss`), so the two surfaces must agree for a given authored angle — CSS `0deg` =
 * "to top" (bottom→top, vertical), `90deg` = to right, `135deg` = to bottom-right corner. The
 * progression direction for CSS angle θ is `(sinθ, −cosθ)` (screen y-down). A Figma gradientTransform
 * whose first row's linear part is `(cosφ, −sinφ)` progresses along `(cosφ, −sinφ)`; setting
 * `φ = 90° − θ` makes that equal `(sinθ, −cosθ)` — i.e. we rotate the identity (horizontal) gradient
 * by `90 − angleDeg` about the layer centre (0.5, 0.5), translation `t = c − R·c` keeping the centre
 * fixed. So θ=90→L→R, θ=0→to-top, θ=135→bottom-right corner — matching the CSS/web preview.
 *
 * RADIAL: a centre-anchored transform — the gradient radiates from `center` (default 0.5,0.5). We use
 * an identity-scaled transform translated so gradient-space origin sits at the centre; Figma treats
 * the radial gradient's handles from this. (Baked, non-variable — a faithful default; per-shape
 * ellipse tuning is out of scope for this lane.)
 */
export const gradientTransformFor = (
  paintType: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL',
  angleDeg = 0,
  center: [number, number] = [0.5, 0.5],
): GradientTransform => {
  const r = (v: number) => Math.round(v * 1e5) / 1e5;
  if (paintType === 'GRADIENT_LINEAR') {
    // Convert the CSS angle to the Figma rotation (φ = 90 − θ) so web + Figma render the same angle.
    const rad = ((90 - angleDeg) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    // Rotate about (0.5, 0.5): t = c − R·c, with c = (0.5, 0.5).
    const cx = 0.5;
    const cy = 0.5;
    const tx = cx - (cos * cx - sin * cy);
    const ty = cy - (sin * cx + cos * cy);
    return [[r(cos), r(-sin), r(tx)], [r(sin), r(cos), r(ty)]];
  }
  // Radial: identity orientation, origin at the declared centre.
  const [cx, cy] = center;
  return [[1, 0, r(cx - 0.5)], [0, 1, r(cy - 0.5)]];
};

/** The reshape itself, over already-resolved emit shapes. Both entry points below project THIS, so
 *  the theme-built (plugin) and file-read (CLI paste) plans are the same data by construction. */
const stylesPlanFrom = (
  shadow: FigmaEffectStylesFile,
  gradient: FigmaPaintStylesFile,
): StylesPlan => ({
  effects: shadow.styles.map((s) => ({
    name: s.name,
    description: s.description,
    effects: s.effects,
  })),
  paints: gradient.styles.map((g) => ({
    name: g.name,
    description: g.description,
    paintType: g.paintType,
    gradientTransform: gradientTransformFor(g.paintType, g.angle, g.center),
    stops: g.stops.map((s) => ({ position: s.position, color: rgba(s.color) })),
  })),
});

/** The file-reading twin of `buildStylesPlan` — see `fontVarPlanFrom` for why the paste path reads
 *  emitted files rather than rebuilding from a theme. */
export const stylesPlanFromFiles = (
  shadow: FigmaEffectStylesFile,
  gradient: FigmaPaintStylesFile,
): StylesPlan => stylesPlanFrom(shadow, gradient);

/**
 * Reshape the shadow + gradient emit into the host-neutral styles plan. PURE (node-free builders +
 * types) — bundles into the plugin like the variable plans. Gradient stops are BAKED to resolved
 * RGBA (owner decision); the `alias`/`sampledStops` the emit carries are intentionally dropped here.
 */
export const buildStylesPlan = (theme: Theme): StylesPlan =>
  stylesPlanFrom(buildFigmaShadow(theme), buildFigmaGradient(theme));

// ---------------------------------------------------------------------------
// TYPOGRAPHY (#237) — `core-font`/`type-sets` VARIABLES + Text Styles. Two host-neutral plans:
//   • buildFontVarPlan   → VarCollectionPlan[] for `core-font` (per-mode; STRING family + FLOAT
//     size/weight + FLOAT weight-role aliased to font/weight/N) and `type-sets` (FLOAT, mobile/desktop).
//   • buildTextStylePlan → TextStyleRow[] — one per composite; names the bound target var+collection
//     for fontFamily/fontSize/fontWeight and carries the baked fontStyle/lineHeight/letterSpacing/
//     case/decoration. `fontFamilyPrimary` is the primary face (for loadFontAsync + fontName.family),
//     resolved from the `core-font` family var value so plan + vars agree.
// Unlike the FLOAT plan, `core-font` mixes STRING + FLOAT + aliases in ONE collection, so rows carry a
// per-row `resolvedType`. PURE — calls the node-free font builders; bundles into the plugin.
// ---------------------------------------------------------------------------

/** One variable to materialise into a mixed-type collection (`core-font`/`type-sets`). Per-row
 *  `resolvedType`; literal per-mode value (string for family, number for size/weight); optional
 *  per-mode alias target (weight-role → `font/weight/N`). */
export type VarRow = {
  name: string;
  resolvedType: 'FLOAT' | 'STRING';
  scopes: string[];
  description: string;
  hidden: boolean;
  valuesByMode: (number | string)[];
  aliasByMode: (string | null)[];
};
/** One variable collection's plan (a `core-font` per-mode or `type-sets` mobile/desktop collection). */
export type VarCollectionPlan = { name: string; modes: string[]; rows: VarRow[] };

/** Reshape a per-mode `FigmaCollectionFile[]` (shared var order) into a `VarCollectionPlan` — the
 *  mixed-type sibling of `floatPlanFor` (carries `resolvedType` + string values + aliases). */
const varPlanFor = (name: string, files: FigmaCollectionFile[]): VarCollectionPlan => {
  const modes = files.map((f) => f.$mode);
  const base = files[0]?.variables ?? [];
  const rows: VarRow[] = base.map((v, i) => ({
    name: v.name,
    resolvedType: v.resolvedType === 'STRING' ? 'STRING' : 'FLOAT',
    scopes: v.scopes,
    description: v.description,
    hidden: !!v.hiddenFromPublishing,
    valuesByMode: files.map((f) => {
      const val = f.variables[i].value;
      return typeof val === 'number' ? roundFloat(val) : String(val);
    }),
    aliasByMode: files.map((f) => (f.variables[i] as FigmaVar).alias?.name ?? null),
  }));
  return { name, modes, rows };
};

/** The file-reading twin of `buildFontVarPlan` — reshape already-emitted `core-font`/`type-sets`
 *  files into the same `VarCollectionPlan[]`. Exists for the CLI paste path, which reads
 *  `out/figma/<brand>/` rather than rebuilding from a theme (the emitted JSON is what the docs/10 §3
 *  contract is written against, so a theme-rebuilt plan could disagree with the artifact under
 *  `--check`). Same reshape either way, so the two write paths can't drift. */
export const fontVarPlanFrom = (
  font: FigmaCollectionFile[],
  fluid: FigmaCollectionFile[],
): VarCollectionPlan[] => [varPlanFor('core-font', font), varPlanFor('type-sets', fluid)];

/**
 * The font-variable plan — `core-font` (per-mode) + `type-sets` (mobile/desktop). PURE: calls the
 * node-free `buildFigmaFont`/`buildFigmaFontFluid` and reshapes; bundles into the plugin.
 */
export const buildFontVarPlan = (theme: Theme): VarCollectionPlan[] => {
  const font = buildFigmaFont(theme);        // per-mode core-font FigmaCollectionFile[]
  const fluid = buildFigmaFontFluid(theme);  // type-sets mobile/desktop FigmaCollectionFile[]
  return [
    varPlanFor('core-font', font),
    varPlanFor('type-sets', fluid),
  ];
};

/** One Text Style to materialise. Bound props name their target var + collection (the executor binds
 *  via `setBoundVariable`); the rest are baked. `fontStyle` + `fontFamilyPrimary` drive `loadFontAsync`
 *  and the literal `fontName` fallback. */
export type TextStyleRow = {
  name: string;
  description: string;
  fontFamilyVar: string;         // 'font/family/<category>' — in core-font
  fontFamilyPrimary: string;     // the primary face (loadFontAsync + fontName.family)
  fontSizeVar: string;
  fontSizeCollection: 'core-font' | 'type-sets';
  fontWeightVar: string;         // 'font/weight-role/<role>' — in core-font
  fontStyle: string;             // baked style-name (loadFontAsync + fontName.style)
  lineHeightPct: number;
  letterSpacingPct: number;
  textCase: 'ORIGINAL' | 'UPPER' | 'LOWER';
  textDecoration: 'NONE' | 'UNDERLINE';
};
export type TextStylePlan = TextStyleRow[];

/** Value of a bound `FigmaTextStyleProp` — the property is always `bound:false` with a literal here. */
const bakedNum = (p: FigmaTextStyle['properties']['lineHeight']): number =>
  p.bound === false && typeof p.value === 'object' ? p.value.value : 0;
const bakedStr = (p: FigmaTextStyle['properties']['fontStyle']): string =>
  p.bound === false && typeof p.value === 'string' ? p.value : '';
const boundVar = (p: FigmaTextStyle['properties']['fontSize']): { variable: string; collection: string } =>
  p.bound === true ? { variable: p.variable, collection: p.collection } : { variable: '', collection: 'core-font' };

/**
 * The Text Style plan — one `TextStyleRow` per composite. Flattens `buildFigmaTextStyles` into the
 * host-neutral shape the plugin executor consumes, resolving each category's PRIMARY FACE from the
 * matching `core-font` family variable (so `loadFontAsync` + `fontName` get the real face). PURE.
 */
export const buildTextStylePlan = (theme: Theme): TextStylePlan =>
  textStylePlanFrom(buildFigmaTextStyles(theme), buildFigmaFont(theme)[0]);

/** The file-reading twin of `buildTextStylePlan` — see `fontVarPlanFrom` for why the paste path reads
 *  emitted files. Takes the DEFAULT-mode `core-font` file for the same reason the theme path takes
 *  `buildFigmaFont(theme)[0]`: that's where the primary face per family var is resolved from. */
export const textStylePlanFromFiles = (
  textStyles: FigmaTextStylesFile,
  coreFontDefault: FigmaCollectionFile,
): TextStylePlan => textStylePlanFrom(textStyles, coreFontDefault);

const textStylePlanFrom = (
  file: FigmaTextStylesFile,
  fontDefault: FigmaCollectionFile,
): TextStylePlan => {
  const styles = file.styles;
  // Primary face per family var name, from the Default-mode core-font family rows (value = primary face).
  // NB: we deliberately use the DEFAULT-mode face for loadFontAsync + the fontName fallback. A brand
  // with a per-mode family override (`familiesByMode`) still binds `fontFamily` to the STRING var,
  // which carries the per-mode value at render — so the Default face is the correct thing to load for
  // the style's own fallback. No shipping brand sets `familiesByMode` today, so this path is currently
  // unexercised by a fixture; a `familiesByMode` example brand would close that gap before it matters.
  const faceByVar = new Map(
    fontDefault.variables.filter((v) => v.name.startsWith('font/family/')).map((v) => [v.name, String(v.value)] as const),
  );
  return styles.map((s) => {
    const p = s.properties;
    const familyVar = p.fontFamily.bound === true ? p.fontFamily.variable : '';
    const size = boundVar(p.fontSize);
    return {
      name: s.name,
      description: s.description,
      fontFamilyVar: familyVar,
      fontFamilyPrimary: faceByVar.get(familyVar) ?? '',
      fontSizeVar: size.variable,
      fontSizeCollection: size.collection === 'type-sets' ? 'type-sets' : 'core-font',
      fontWeightVar: p.fontWeight.bound === true ? p.fontWeight.variable : '',
      fontStyle: bakedStr(p.fontStyle),
      lineHeightPct: bakedNum(p.lineHeight),
      letterSpacingPct: bakedNum(p.letterSpacing),
      textCase: p.textCase.value,
      textDecoration: p.textDecoration.value,
    };
  });
};
