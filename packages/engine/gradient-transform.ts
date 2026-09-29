/**
 * Prism3 engine — the CSS angle → Figma gradient matrix (#1318).
 *
 * MOVED HERE UNCHANGED from `write-plan.ts`, which re-exports both names. Two readers need one conversion:
 * the brand gradient Paint Styles (`write-plan.ts`) and a component's directional fill (`anatomy-figma.ts`,
 * the veil's washes), so one authored CSS angle reads the same way on both. A module of its own because
 * `anatomy-figma.ts` is bundled into the studio, and importing `write-plan.ts` there pulled its emitters in
 * with it. Pure math, no imports.
 */

/** Figma's gradient positioning matrix — a 2×3 affine `[[a,b,tx],[c,d,ty]]` mapping the layer's
 *  unit space to gradient space. */
export type GradientTransform = [[number, number, number], [number, number, number]];

/**
 * Figma gradient transform for a given kind + angle/center.
 *
 * LINEAR: `angleDeg` is the SAME CSS `linear-gradient(<deg>)` angle the web renderer consumes
 * (`tree.ts` `gradientCss`), so the two surfaces must agree for a given authored angle — CSS `0deg` =
 * "to top" (bottom→top, vertical), `90deg` = to right, `135deg` = to bottom-right corner. The
 * progression direction for CSS angle θ is `(sinθ, −cosθ)` (screen y-down). A Figma gradientTransform
 * whose first row's linear part is `(cosφ, −sinφ)` progresses along `(cosφ, −sinφ)`; setting
 * `φ = 90° − θ` makes that equal `(sinθ, −cosθ)` — i.e. we rotate the identity (horizontal) gradient
 * by `90 − angleDeg` about the layer center (0.5, 0.5), translation `t = c − R·c` keeping the center
 * fixed. So θ=90→L→R, θ=0→to-top, θ=135→bottom-right corner — matching the CSS/web preview.
 *
 * RADIAL: a center-anchored transform — the gradient radiates from `center` (default 0.5,0.5). We use
 * an identity-scaled transform translated so gradient-space origin sits at the center; Figma treats
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
  // Radial: identity orientation, origin at the declared center.
  const [cx, cy] = center;
  return [[1, 0, r(cx - 0.5)], [0, 1, r(cy - 0.5)]];
};
