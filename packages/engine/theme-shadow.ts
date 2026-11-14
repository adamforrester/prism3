/** Prism3 engine — Shadow: the elevation ramp, two tinted layers per step, light and dark.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
import { oklchToRgb, type RGB, maxChroma } from './color';
import type { BrandInput } from './theme-types';

// ---------------------------------------------------------------------------
// Shadow / elevation axis (Phase A — the shadow ramp). Grounded in
// 31-color-systems §lift pattern + a 10-system field survey. Decisions:
//  - 6 steps (xs–2xl), the convergent count; + a single inset.
//  - 2 LAYERS per step (key + ambient — the field's physical model: a tight
//    directional key shadow for the edge, a soft diffuse ambient for distance).
//  - TINTED near-black, not pure black (Polaris/Radix/Comeau): a shadow base
//    colour from the neutral (or a brand) hue at low chroma. `shadow.tint` is the
//    expressive lever; `softness` (blur:offset ratio) is the personality lever.
//  - MODE-AWARE, LIFT-PRIMARY: full shadow in light; in dark the surface ladder
//    lift carries elevation and the shadow is REDUCED (faded, more present only at
//    the top steps) — NOT nulled (M3/Atlassian retain it), NOT heavier (rejecting
//    NB's `inverse`). The semantic surface↔shadow pairing is Phase B.
//  - offsetX = 0 (light directly above — the field-universal assumption); spread
//    negative-and-growing to keep large shadows tight (Tailwind/Polaris/Radix).
export type ShadowLayer = { offsetX: number; offsetY: number; blur: number; spread: number; alpha: number };
export type ShadowStep = { name: string; light: ShadowLayer[]; dark: ShadowLayer[] };
export type ShadowAxis = {
  steps: ShadowStep[];
  inset: ShadowStep;
  colorRgb: RGB;                 // the tinted shadow base (layers vary only alpha)
  softness: number;
  tint: { hue: number | null; amount: number };   // hue null: no hue to follow, the shadow is untinted (#2184, Q58 B)
  // Per-mode shadow (Phase D) — only modes whose `modeLevers.shadow` deviates. Each carries the
  // RE-DERIVED layer-set for that mode's APPEARANCE (light-based → full layers; dark-based → reduced) at
  // the mode's softness/tint, plus the mode's own tinted `colorRgb` (a tint override changes the colour).
  // `layers` is keyed by step name (incl. `inset`). Composites reference nothing here — the shadow leaf
  // attaches `$extensions.prism3.modes.<mode>` from this. Absent ⇒ byte-identical.
  shadowByMode?: Record<string, { appearance: 'light' | 'dark'; colorRgb: RGB; softness: number; tint: { hue: number | null; amount: number }; layers: Record<string, ShadowLayer[]> }>;
};
// Base ramp at softness 1 — [keyY, keyBlur, keySpread, keyAlpha, ambY, ambBlur, ambSpread, ambAlpha].
// Anchored to Tailwind/Polaris/NB curves; offsetY≈blur×0.6–0.7, spread tightens with size.
const SHADOW_BASE: { name: string; key: number[]; amb: number[] }[] = [
  { name: 'xs', key: [1, 2, 0, 0.10], amb: [1, 3, 0, 0.06] },
  { name: 'sm', key: [1, 2, -1, 0.10], amb: [2, 6, -1, 0.07] },
  { name: 'md', key: [2, 4, -2, 0.12], amb: [4, 12, -3, 0.08] },
  { name: 'lg', key: [3, 6, -3, 0.12], amb: [8, 20, -5, 0.08] },
  { name: 'xl', key: [4, 8, -4, 0.14], amb: [14, 32, -8, 0.10] },
  { name: '2xl', key: [6, 12, -6, 0.14], amb: [22, 52, -12, 0.12] },
];

/** `defaultHue` is the hue that builds the neutral ramp (#2184), the tint's default; an explicit
 *  `shadow.tint.hue` still wins. `null` means the ramp has no hue to follow (any gray ramp: a pure-gray pin, owner Q58 B, or a Custom tint
 *  or Follow primary at chroma 0, owner Q73 A):
 *  the shadow is then UNTINTED, chroma 0, while `amount` still lifts its lightness off pure black. */
export const buildShadow = (defaultHue: number | null, input: BrandInput['shadow'] = {}): ShadowAxis => {
  const softness = input.softness ?? 1;
  const tint: ShadowAxis['tint'] = { hue: input.tint?.hue ?? defaultHue, amount: input.tint?.amount ?? 0.15 };
  // Shadow base colour: amount 0 = pure black (the NB dialect); any tint lifts it to a hue-tinted
  // dark (Polaris/Comeau: a tinted near-black reads richer than dead grey). Layers reuse this RGB
  // and vary only alpha — one shadow colour per theme.
  //
  // Both L AND chroma scale with `amount` (#305). The old curve held l at 0.13 and scaled a fixed
  // `c: 0.05 * amount`, which made the lever PERCEPTUALLY INERT: shadow alphas are 10–14%, so a hue
  // shift on a near-black composited over a light surface moved ~1.0–1.5 ΔE00 across the lever's
  // ENTIRE range — under the ~2.3 "just noticeable" bar. The slider looked functional and did
  // nothing visible.
  //
  // Holding L and simply raising chroma cannot fix it: sRGB's chroma ceiling at l 0.13 is only
  // 0.023 (cyan) to 0.066 (blue), i.e. essentially the 0.05 already in use. Chroma capacity is a
  // function of lightness, so L has to rise for the hue to have anywhere to go.
  //
  // The 0.17 coefficient is the SMALLEST lift at which every hue clears the bar, swept at 5°
  // (not sampled at a few hues — doing that is what produced three wrong numbers in the first
  // draft of this comment). Measured at a mid-ramp 12% alpha over white, amount 1.0:
  //   · worst hue is yellow-green (~h70) at 2.88 ΔE00 — over the 2.3 bar, under 3.0
  //   · warm/blue hues reach 3.8–4.6 ΔE00
  //   · lift 0.13 leaves the worst hue at 2.28, i.e. still not reliably visible
  //
  // TWO consequences worth knowing, neither hidden:
  //   1. A tinted shadow reads MORE PRESENT, not just more coloured — ΔE00 against the bare
  //      surface ranges −8%…+59% vs a pure-black shadow across hues at max tint. That is
  //      inherent: a saturated dark differs from white more than black does at the same alpha.
  //      Removing it would mean lowering alpha as tint rises, and alpha is what encodes
  //      elevation, so the cure is worse than the symptom.
  //   2. The default (amount 0.15) is NOT byte-identical to the old curve — it drifts 0.86 ΔE00,
  //      driven by chroma now tracking the gamut ceiling rather than a flat 0.05. That is below
  //      the ~1.0 JND for a large flat field, so it is invisible in use, but committed artifacts
  //      for tinted brands DO change (NB ships amount 0 → pure black → byte-identical).
  //
  // Chroma is a fraction of the in-gamut ceiling at that L (verified in gamut across 72 hues ×
  // 6 amounts), so `amount` means "how far toward as-chromatic-as-this-dark-can-be".
  const tintL = 0.13 + 0.17 * tint.amount;
  const colorRgb = tint.amount === 0
    ? { r: 0, g: 0, b: 0 }
    : tint.hue === null
      ? oklchToRgb({ l: tintL, c: 0, h: 0 })   // untinted: no hue, the same lift (Q58 B)
      : oklchToRgb({ l: tintL, c: maxChroma(tintL, tint.hue) * tint.amount, h: tint.hue });
  const layer = (a: number[]): ShadowLayer => ({ offsetX: 0, offsetY: a[0], blur: Math.round(a[1] * softness), spread: a[2], alpha: a[3] });
  // Dark: same geometry, alpha reduced and ramping UP with elevation (lower steps
  // nearly disappear — the surface lift does the work; top steps keep a whisper).
  const darkAlpha = (a: number, i: number): number => Math.round(a * (0.3 + 0.09 * i) * 100) / 100;
  const darkLayer = (a: number[], i: number): ShadowLayer => ({ offsetX: 0, offsetY: a[0], blur: Math.round(a[1] * softness), spread: a[2], alpha: darkAlpha(a[3], i) });
  const steps: ShadowStep[] = SHADOW_BASE.map((s, i) => ({
    name: s.name,
    light: [layer(s.key), layer(s.amb)],
    dark: [darkLayer(s.key, i), darkLayer(s.amb, i)],
  }));
  // Inset (wells, pressed states, inputs) — a single inner shadow, light/dark.
  const inset: ShadowStep = {
    name: 'inset',
    light: [{ offsetX: 0, offsetY: 2, blur: Math.round(4 * softness), spread: 0, alpha: 0.08 }],
    dark: [{ offsetX: 0, offsetY: 2, blur: Math.round(4 * softness), spread: 0, alpha: 0.3 }],
  };
  return { steps, inset, colorRgb, softness, tint };
};
