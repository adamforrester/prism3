/**
 * Prism3 engine — emit-figma SHADOW + GRADIENT core (pure, node-free).
 *
 * The Figma *Style* axes of the materialisation adapter — split out of the I/O-shell `emit-figma.ts`
 * so they bundle into contexts with NO filesystem: the Figma plugin main thread (the shadow/gradient
 * write, extending #108's colour + #146's FLOAT-variable writes) and the browser. Mirrors the
 * `emit-figma-color.ts` / `emit-figma-dims.ts` extractions: `emit-figma.ts` re-exports everything
 * here, so every `from './emit-figma'` importer + the `npx tsx packages/engine/emit-figma.ts` CLI are
 * unchanged.
 *
 * Shadow → Effect Styles, gradient → Paint Styles (NOT variables — docs/08 §5 variable-type ceiling).
 *
 * PURE — no `node:*`, no `figma.*`, no I/O. Depends only on the pure `theme`/`tree` core + the shared
 * helpers/types in the (also pure) `emit-figma-color`.
 */
import { Theme } from './theme';
import { buildTree, at } from './tree';
import { figName, parseColor } from './emit-figma-color';
import type { FigmaColor } from './emit-figma-color';

// ---------------------------------------------------------------------------
// SHADOW — Effect Style specs (docs/10 §7 item 3; docs/08 §5 variable-type
// ceiling). Shadows are STYLES in Figma, not variables — the Effect Style has a
// per-layer array of drop-shadow effects (color/offsetX/offsetY/blur/spread).
// Effect Styles don't currently support Figma modes, so mode-awareness is
// expressed by emitting TWO style sets:
//   shadow/<step>       — LIGHT-mode shadow (canonical $value)
//   shadow-dark/<step>  — DARK-mode shadow (from $extensions.prism3.modes.dark;
//                          reduced-per-layer alpha — the surface-lift dark model)
// A component's plugin/code swap picks the pair by mode. Colour channels parsed
// to Figma {r,g,b,a} float32; numerics carry the DTCG px.
// ---------------------------------------------------------------------------

export type FigmaEffect = { type: 'DROP_SHADOW' | 'INNER_SHADOW'; color: FigmaColor; offset: { x: number; y: number }; radius: number; spread: number; visible: boolean; blendMode: 'NORMAL' };
export type FigmaEffectStyle = { name: string; description: string; effects: FigmaEffect[] };
export type FigmaEffectStylesFile = { $collection: 'shadow-styles'; styles: FigmaEffectStyle[] };

const pxToNum = (v: unknown): number => parseFloat(String(v).replace('px', '')) || 0;

/** DTCG shadow layer → Figma effect. `inset` shadow becomes INNER_SHADOW; the
 *  rest are DROP_SHADOW. `blur` in DTCG maps to `radius` on the Figma effect. */
const shadowLayerToEffect = (layer: any, inset: boolean): FigmaEffect => ({
  type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
  color: parseColor(layer.color),
  offset: { x: pxToNum(layer.offsetX), y: pxToNum(layer.offsetY) },
  radius: pxToNum(layer.blur),
  spread: pxToNum(layer.spread),
  visible: true,
  blendMode: 'NORMAL',
});

export const buildFigmaShadow = (theme: Theme): FigmaEffectStylesFile => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const shadowNode = tree[root].shadow ?? {};
  const styles: FigmaEffectStyle[] = [];

  /**
   * One mode's shadow layers, or `undefined` when the leaf has no entry for that mode.
   *
   * THROWS on an entry that exists but is not the wrapped `{ $value: [...] }` shape (#708). The bare
   * array this used to accept is exactly what broke the DTCG projector, so tolerating it here would
   * re-admit the shape the producer was normalized to eliminate — and this emitter would keep working,
   * which is how the divergence survived in the first place.
   */
  const modeLayers = (leaf: any, mode: string): any[] | undefined => {
    const entry = leaf.$extensions?.prism3?.modes?.[mode];
    if (entry === undefined) return undefined;
    const v = entry?.$value;
    if (!Array.isArray(v)) {
      throw new Error(
        `emit-figma-styles: shadow mode entry '${mode}' is not the wrapped { $value: [...] } shape ` +
        `(got ${Array.isArray(entry) ? 'a bare array — the #708 shape' : typeof entry}). ` +
        `Every mode entry wraps its value in $value; see tree.ts shadowLeaf.`,
      );
    }
    return v;
  };

  // Emit ordered: shadow/<step> first (light), then shadow-dark/<step> (dark).
  // Iterating twice on the same key order keeps materialise-side pairing simple.
  const keys = Object.keys(shadowNode);
  for (const key of keys) {
    const leaf = shadowNode[key];
    const inset = key === 'inset';
    const lightLayers = (leaf.$value as any[]).map((l: any) => shadowLayerToEffect(l, inset));
    styles.push({
      name: `shadow/${key}`,
      description: String(leaf.$description ?? '') + ' — light mode',
      effects: lightLayers,
    });
  }
  for (const key of keys) {
    const leaf = shadowNode[key];
    const inset = key === 'inset';
    // `modeLayers` unwraps the `$value` every mode entry now carries (#708). Reading the entry as the
    // array directly is what this used to do, and it is why the shape could not be normalized without
    // touching this file.
    const darkLayerData = modeLayers(leaf, 'dark');
    if (!darkLayerData) continue;
    const darkLayers = darkLayerData.map((l: any) => shadowLayerToEffect(l, inset));
    styles.push({
      name: `shadow-dark/${key}`,
      description: String(leaf.$description ?? '') + ' — dark mode (reduced; surface-lift pattern)',
      effects: darkLayers,
    });
  }
  // Per-mode shadow overrides (Phase D): each non-dark mode with a shadow override in `modes.<mode>` gets
  // its own `shadow-<mode>/<step>` effect-style set (Effect Styles have no Figma modes, so mode-awareness
  // is name-suffixed — same convention as shadow-dark). Empty for brands with no per-mode shadow.
  const extraModes = new Set<string>();
  for (const key of keys) for (const mode of Object.keys(shadowNode[key].$extensions?.prism3?.modes ?? {})) if (mode !== 'dark') extraModes.add(mode);
  for (const mode of extraModes) {
    for (const key of keys) {
      const leaf = shadowNode[key];
      const layerData = modeLayers(leaf, mode);
      if (!layerData) continue;
      const inset = key === 'inset';
      styles.push({
        name: `shadow-${mode}/${key}`,
        description: String(leaf.$description ?? '') + ` — ${mode} mode (per-mode softness/tint)`,
        effects: layerData.map((l: any) => shadowLayerToEffect(l, inset)),
      });
    }
  }

  return { $collection: 'shadow-styles', styles };
};

// ---------------------------------------------------------------------------
// GRADIENT — Paint Style specs (docs/10 §7 item 3; docs/08 §5).
// Gradient fills are STYLES in Figma (Paint Styles), not variables. Only stop
// COLOURS bind to colour variables (Plugin API Update 92); kind, angle/transform,
// and stop positions are baked into the style. Figma interpolates in sRGB only,
// so we ship BOTH the canonical alias-driven stops AND the DTCG `sampledStops`
// (5-point sRGB pre-sample of the OKLCH curve) so plugins can lay down denser
// stops when the DTCG interpolation is oklch. Empty for brands with no
// gradients (opt-in axis).
// ---------------------------------------------------------------------------

export type FigmaPaintStop = { position: number; color: FigmaColor; alias: string | null };
export type FigmaPaintStyle = {
  name: string;
  description: string;
  paintType: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
  angle?: number;
  center?: [number, number];
  shape?: string;
  interpolation: 'oklch' | 'srgb';
  stops: FigmaPaintStop[];
  sampledStops: FigmaPaintStop[];
  a11y: { worstOnWhite: number; worstOnBlack: number; note: string };
};
export type FigmaPaintStylesFile = { $collection: 'gradient-styles'; styles: FigmaPaintStyle[] };

/** Resolve `{prism.core.palette.primary.600}` → Figma name `prism/core/palette/primary/600` and the
 *  leaf's resolved {r,g,b,a}. The STYLE's own name carries no namespace (#1097) but the variable it
 *  BINDS does — a style is a Figma style, the thing it points at is a variable. And because the bind
 *  comes from the DTCG alias, the `core` tier (#1102) arrives here for free: `figName` is a separator
 *  swap over whatever path the tree already holds, so no site here names the tier. */
const stopFromAlias = (tree: any, aliasStr: string, position: number): FigmaPaintStop => {
  const m = /^\{(.+)\}$/.exec(aliasStr);
  const path = m ? m[1] : '';
  const leaf = path ? at(tree, path) : null;
  return {
    position,
    color: parseColor(leaf?.$value),
    alias: path ? figName(path) : null,
  };
};
const stopFromHex = (hex: string, position: number): FigmaPaintStop => ({
  position,
  color: parseColor(hex),
  alias: null,
});

export const buildFigmaGradient = (theme: Theme): FigmaPaintStylesFile => {
  const { tree } = buildTree(theme);
  const root = Object.keys(tree)[0];
  const gradientNode = tree[root].gradient;
  const styles: FigmaPaintStyle[] = [];

  if (!gradientNode) return { $collection: 'gradient-styles', styles };

  for (const key of Object.keys(gradientNode)) {
    const leaf = gradientNode[key];
    const ext = leaf.$extensions?.prism3 ?? {};
    const kind = ext.kind as 'linear' | 'radial';
    const paintType: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' = kind === 'radial' ? 'GRADIENT_RADIAL' : 'GRADIENT_LINEAR';
    const stops: FigmaPaintStop[] = (leaf.$value as any[]).map((s: any) => stopFromAlias(tree, s.color, s.position));
    const sampledStops: FigmaPaintStop[] = ((ext.figma?.sampledStops as any[]) ?? []).map((s: any) => stopFromHex(s.hex, s.position));

    const style: FigmaPaintStyle = {
      name: `gradient/${key}`,
      description: String(leaf.$description ?? ''),
      paintType,
      interpolation: ext.interpolation ?? 'srgb',
      stops,
      sampledStops,
      a11y: {
        worstOnWhite: ext.a11y?.worstOnWhite ?? 0,
        worstOnBlack: ext.a11y?.worstOnBlack ?? 0,
        note: String(ext.a11y?.note ?? ''),
      },
    };
    if (kind === 'linear') style.angle = ext.angle ?? 0;
    else { style.center = ext.center ?? [0.5, 0.5]; style.shape = ext.shape ?? 'ellipse'; }
    styles.push(style);
  }

  return { $collection: 'gradient-styles', styles };
};

// ---------------------------------------------------------------------------
// GRID STYLES (#1480) — reusable Figma layout-grid styles, ONE per breakpoint.
//
// Layout already emits as FLOAT variables (`emit-figma-dims.ts` `buildFigmaLayout`: the `layout`
// collection with `grid/columns`, `grid/gutter`, `grid/margin`, `container/*`, `breakpoint/*` per
// breakpoint mode). Those numbers are the responsive source of truth, but a number cannot BECOME a
// live Figma column grid — Figma has no variable→layout-grid binding. So a designer got the values
// and no applicable grid. This emits the missing artifact: one reusable Grid Style per breakpoint,
// sourced from the SAME layout data (columns/gutter/margin), so a designer applies `Grid / md` to a
// frame and sees the md column grid.
//
// STATIC, BY THE PLATFORM — a Figma grid style cannot mode-switch off a variable, so N breakpoints
// emit N SEPARATE grid styles (`Grid / sm`, `Grid / md`, …), coexisting with the `layout` variable
// collection. Two representations of the one dataset: the variables stay responsive-by-mode, the grid
// styles are the fixed, apply-able form. Names follow the auto breakpoint names (`theme.layout.grid`
// `bp`), so a 2-breakpoint brand yields exactly `Grid / sm` + `Grid / md`.
//
// COLUMNS/STRETCH: the columns stretch to fill the container, `gutterSize` between them and `offset`
// (the margin) inset from the container edges — the mobile-first responsive grid the layout data
// describes. `color`/`visible` are the on-canvas overlay display, not a token: a grid style carries no
// themeable colour, so this bakes Figma's own default column-grid overlay (red at 10%).
// ---------------------------------------------------------------------------

export type FigmaColumnGrid = {
  pattern: 'COLUMNS';
  alignment: 'STRETCH';
  count: number;
  gutterSize: number;
  offset: number;   // the grid margin — inset from the container edges
  visible: boolean;
  color: FigmaColor;
};
export type FigmaGridStyle = { name: string; description: string; layoutGrids: FigmaColumnGrid[] };
export type FigmaGridStylesFile = { $collection: 'grid-styles'; styles: FigmaGridStyle[] };

// Figma's default column-grid overlay colour — red at 10% opacity. Baked (a grid style has no
// variable-bindable colour), and identical for every breakpoint: it is display chrome, not brand.
const GRID_OVERLAY_COLOR: FigmaColor = { r: 1, g: 0, b: 0, a: 0.1 };

export const buildFigmaGridStyles = (theme: Theme): FigmaGridStylesFile => {
  const styles: FigmaGridStyle[] = theme.layout.grid.map((g) => ({
    name: `Grid / ${g.bp}`,
    description:
      `${g.columns}-column layout grid for the ${g.bp} breakpoint — ${g.gutterPx}px gutter, ${g.marginPx}px margin. ` +
      `A static Figma grid style; the layout variable collection stays the responsive source of truth.`,
    layoutGrids: [{
      pattern: 'COLUMNS',
      alignment: 'STRETCH',
      count: g.columns,
      gutterSize: g.gutterPx,
      offset: g.marginPx,
      visible: true,
      color: GRID_OVERLAY_COLOR,
    }],
  }));
  return { $collection: 'grid-styles', styles };
};
