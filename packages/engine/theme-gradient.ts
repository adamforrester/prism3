/** Prism3 engine — Gradients: opt-in brand gradients whose stops alias the color ramp.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
import type { Step } from './ramp';
import { oklchToRgb, type RGB, contrast, hex as rgbHex } from './color';
import { type OKLCH, type BrandInput, type PaletteBuild, CORE_TIER } from './theme-types';
import { PALETTE_NAME_RE } from './theme-color';

// ---------------------------------------------------------------------------
// Gradient axis (brand-opt-in). Grounded in a 10-system survey + the DTCG
// gradient spec (2025.10) + the Figma round-trip research. Decisions:
//  - OFF by default: most mature systems abstain (Material/Carbon/Atlassian/
//    Primer/USWDS), and gradients are contextual. A brand opts in — `true` ships
//    ONE default brand gradient; an explicit array ships exactly those. NB ships
//    none (it had none). This is NOT a derived-for-everyone axis like colour.
//  - DTCG `gradient` composite is the spine: $value = stops [{color, position}],
//    and stop COLOURS ALIAS the colour ramp (the Fluent/Carbon model; themeable),
//    never raw hex (the deprecated Polaris/SLDS trap).
//  - DTCG omits kind/angle/interpolation (an open design-tokens CG gap, the same
//    shape as the missing `spring` type above). NOT prism3 #101 — that number is a
//    closed web-tab regrouping issue this citation collided with, and it was never
//    the tracker for this gap; do not re-add a bare `#101` here. We carry them in
//    $extensions, the way the spec's own proposals would: kind (linear/radial),
//    angle | center+shape, interpolation (OKLCH default).
//  - OKLCH interpolation avoids the sRGB "grey dead zone". Figma interpolates in
//    sRGB ONLY, so we PRE-SAMPLE the OKLCH curve into N baked sRGB stops for the
//    Figma Paint Style (the one renderer that needs them); CSS keeps `in oklch`.
//  - Materializes as a Figma PAINT STYLE (the 4th style class beside effect/text/
//    grid); only stop COLOURS bind to variables — kind/angle/positions are baked.
//  - Worst-case-stop contrast is computed: text over a gradient must clear its
//    ratio at the LOWEST-contrast point, not the average (none of the surveyed
//    systems do this — our contract-checking ethos extended to gradients).
export type GradientStopInput = { palette: string; step: number; position: number };
export type GradientInput = {
  name: string;
  kind?: 'linear' | 'radial';
  angle?: number;                 // linear only — degrees (default 135, a brand diagonal)
  center?: [number, number];      // radial only — 0..1 (default [0.5, 0.5])
  shape?: 'circle' | 'ellipse';   // radial only (default 'ellipse')
  interpolation?: 'oklch' | 'srgb';
  samples?: number;               // sRGB pre-sample count for Figma (default 5)
  stops: GradientStopInput[];
};
export type GradientStop = { aliasOf: string; position: number; rgb: RGB; hex: string; oklch: OKLCH };
export type ResolvedGradient = {
  name: string; kind: 'linear' | 'radial'; angle: number; center: [number, number];
  shape: 'circle' | 'ellipse'; interpolation: 'oklch' | 'srgb';
  stops: GradientStop[];
  sampled: { hex: string; position: number }[];  // baked sRGB approximation (Figma)
  worstOnWhite: number; worstOnBlack: number;     // lowest contrast of any sampled stop
};
export type GradientAxis = { gradients: ResolvedGradient[] };

const DEFAULT_BRAND_GRADIENT = (brandPalette: string): GradientInput => ({
  name: 'brand', kind: 'linear', angle: 135,
  stops: [{ palette: brandPalette, step: 600, position: 0 }, { palette: brandPalette, step: 350, position: 1 }],
});
// Shortest-arc hue interpolation (degrees) — the perceptually correct path.
const lerpHue = (h1: number, h2: number, t: number): number => {
  const dh = (((h2 - h1) % 360) + 540) % 360 - 180;
  return (h1 + t * dh + 360) % 360;
};
const lerpOklch = (a: OKLCH, b: OKLCH, t: number): OKLCH => ({ l: a.l + (b.l - a.l) * t, c: a.c + (b.c - a.c) * t, h: lerpHue(a.h, b.h, t) });
const lerpRgb = (a: RGB, b: RGB, t: number): RGB => ({ r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) });

export const buildGradient = (spec: BrandInput['gradients'], palettes: PaletteBuild[], root: string): GradientAxis => {
  if (!spec) return { gradients: [] };
  const inputs: GradientInput[] = spec === true ? [DEFAULT_BRAND_GRADIENT('primary')] : spec;
  // L-06: a gradient name becomes a token path segment (`<root>.gradient.<name>`), so it
  // needs the same slug charset palette names enforce (CR-03) — a dotted/spaced name would
  // break the `{a.b.c}` alias convention, caught only at emit if at all. Names live in the
  // gradient namespace (not the palette one), so RESERVED_PALETTES doesn't apply, but they
  // must be a valid slug and unique among gradients.
  const seenGradNames = new Set<string>();
  for (const g of inputs) {
    if (!PALETTE_NAME_RE.test(g.name))
      throw new Error(`gradient name '${g.name}' must be a single lowercase slug (letters/digits/hyphen, start with a letter — no dots, spaces, or symbols)`);
    if (seenGradNames.has(g.name))
      throw new Error(`duplicate gradient name '${g.name}' — gradient names must be unique`);
    seenGradNames.add(g.name);
  }
  const stepOf = (palette: string, step: number): Step => {
    const p = palettes.find((pp) => pp.palette === palette);
    if (!p) throw new Error(`gradient: palette '${palette}' is not defined (have: ${palettes.map((x) => x.palette).join(', ')})`);
    const s = p.steps.find((st) => st.num === step);
    if (!s) throw new Error(`gradient: '${palette}.${step}' is not a valid ramp step`);
    return s;
  };
  const gradients: ResolvedGradient[] = inputs.map((g) => {
    const kind = g.kind ?? 'linear';
    const interpolation = g.interpolation ?? 'oklch';
    const samples = Math.max(2, g.samples ?? 5);
    const stops: GradientStop[] = g.stops
      .slice().sort((a, b) => a.position - b.position)
      .map((st) => {
        const s = stepOf(st.palette, st.step);
        return { aliasOf: `${root}.${CORE_TIER}.palette.${st.palette}.${s.key}`, position: st.position, rgb: s.rgb, hex: s.hex, oklch: s.oklch };
      });
    // Pre-sample the curve at N evenly-spaced positions (the chosen interpolation
    // space), output sRGB — the baked stops Figma needs (it can't interpolate OKLCH).
    const sampleRgb = (p: number): RGB => {
      if (p <= stops[0].position) return stops[0].rgb;
      if (p >= stops[stops.length - 1].position) return stops[stops.length - 1].rgb;
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i], b = stops[i + 1];
        if (p >= a.position && p <= b.position) {
          const t = (p - a.position) / (b.position - a.position || 1);
          return interpolation === 'oklch' ? oklchToRgb(lerpOklch(a.oklch, b.oklch, t)) : lerpRgb(a.rgb, b.rgb, t);
        }
      }
      return stops[stops.length - 1].rgb;
    };
    const sampledRgb = Array.from({ length: samples }, (_, i) => sampleRgb(i / (samples - 1)));
    const sampled = sampledRgb.map((rgb, i) => ({ hex: rgbHex(rgb), position: Math.round((i / (samples - 1)) * 1000) / 1000 }));
    const WHITE: RGB = { r: 255, g: 255, b: 255 }, BLACK: RGB = { r: 0, g: 0, b: 0 };
    const worstOnWhite = Math.min(...sampledRgb.map((c) => contrast(c, WHITE)));
    const worstOnBlack = Math.min(...sampledRgb.map((c) => contrast(c, BLACK)));
    return {
      name: g.name, kind, angle: g.angle ?? 135, center: g.center ?? [0.5, 0.5],
      shape: g.shape ?? 'ellipse', interpolation, stops, sampled, worstOnWhite, worstOnBlack,
    };
  });
  return { gradients };
};
