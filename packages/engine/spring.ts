/** Prism3 engine — a spring's motion over time, and what CSS can carry of it (#3510, shared with G5 #3485).
 *
 *  PURE — no `node:*`, no I/O.
 *
 *  A Prism3 spring is `{ damping, stiffness }`: `damping` is the damping RATIO ζ (what Figma's `bounce` reads as
 *  1 − ζ, `emit-figma-dims.ts`), `stiffness` is k with the mass fixed at 1, so the undamped angular frequency is
 *  ω₀ = √k rad/s. The spring starts at rest at 0 and settles on 1, so every value below is a fraction of the
 *  travel, whatever the travel is.
 *
 *    ζ < 1 (underdamped):  x(t) = 1 − e^(−ζω₀t) · (cos ω_d t + ζ/√(1−ζ²) · sin ω_d t),   ω_d = ω₀√(1−ζ²)
 *    ζ = 1 (critical):     x(t) = 1 − e^(−ω₀t) · (1 + ω₀t)
 *
 *  A ratio outside (0, 1] throws, the same domain `springBounce` holds Figma to: the brands' springs are all in it,
 *  and an overdamped spring has no `bounce` Figma would take, so the two surfaces could not agree on it.
 *
 *  WHY ONE MODULE. Plain CSS cannot run spring physics. What it can run is an easing curve over a duration, so
 *  the token CSS carries each spring as that pair (owner decision Q-SP1 E): `linear()` sampled off the curve
 *  below, and the time the spring takes to settle. Figma has the same need from the other side: its spring easing
 *  carries `bounce` only, and its length comes from the duration it is paired with (G5, #3485). Both durations
 *  come from `springSettleMs`, so a spring lasts as long in Figma as in the CSS.
 *
 *  THE TWO TECHNICAL CALLS (Q-SP1 E leaves them to the engine; each is a named constant, and test.ts holds the
 *  approximation to its bound):
 *
 *  - SETTLE THRESHOLD, `SPRING_SETTLE_EPSILON` = 0.001 of the travel. The settle time is the first moment after
 *    which the spring stays within that of its target for good, found on the curve itself, not on its
 *    exponential envelope (the envelope over-states it, and by more the lower the damping). At the end of the
 *    duration the CSS steps the last 0.1% at once: under a pixel for any move shorter than 1000px.
 *  - SAMPLING DENSITY, `SPRING_SAMPLE_MS` = one stop every 5ms of the settle time, evenly spaced, each value
 *    rounded to 3 decimals. Linear interpolation errs by at most h²/8 · max|x″|, and |x″| ≤ k for a spring that
 *    starts at rest, so 5ms keeps the interpolation within 0.0032 of the travel for any stiffness up to 1000,
 *    and the rounding adds at most 0.0005. `SPRING_EASING_ERROR_BOUND` = 0.005 states the promise with room, and
 *    test.ts measures it against the analytic curve. A 5ms stop is also finer than a 120Hz frame (8.3ms).
 */

/** A spring as the engine holds it: the damping RATIO ζ in (0, 1], and the stiffness k at mass 1. */
export type Spring = { damping: number; stiffness: number };

/** Settled means within this fraction of the travel from the target, for good. */
export const SPRING_SETTLE_EPSILON = 0.001;
/** One `linear()` stop per this many milliseconds of the settle time. */
export const SPRING_SAMPLE_MS = 5;
/** The most a `linear()` approximation may differ from the analytic spring, as a fraction of the travel. */
export const SPRING_EASING_ERROR_BOUND = 0.005;
/** The largest stiffness the error bound is argued for (h²/8 · k + rounding ≤ the bound). */
export const SPRING_MAX_STIFFNESS = 1000;

const check = (s: Spring): void => {
  if (!(s.damping > 0 && s.damping <= 1)) throw new Error(`spring: a damping ratio must be in (0, 1], got ${s.damping}`);
  if (!(s.stiffness > 0 && s.stiffness <= SPRING_MAX_STIFFNESS))
    throw new Error(`spring: a stiffness must be in (0, ${SPRING_MAX_STIFFNESS}], got ${s.stiffness}`);
};

/** The spring's position at `ms` milliseconds, as a fraction of the travel (0 at rest, 1 at the target). */
export const springPosition = (s: Spring, ms: number): number => {
  check(s);
  const t = ms / 1000;
  const w0 = Math.sqrt(s.stiffness);
  const z = s.damping;
  if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const sq = Math.sqrt(1 - z * z);
  const wd = w0 * sq;
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z / sq) * Math.sin(wd * t));
};

/** Search step for the settle time, in ms: a tenth of a millisecond, then rounded UP to a whole one. */
const SETTLE_STEP_MS = 0.1;

/**
 * How long the spring takes to settle, in whole milliseconds: the first time after which it stays within
 * `SPRING_SETTLE_EPSILON` of its target, rounded up.
 *
 * The search runs on the curve, up to where the exponential envelope guarantees settling: |x − 1| is at most
 * e^(−ζω₀t)/√(1−ζ²) when underdamped and e^(−ω₀t)(1 + ω₀t) when critical, so past that horizon nothing can leave
 * the band again.
 */
export const springSettleMs = (s: Spring): number => {
  check(s);
  const w0 = Math.sqrt(s.stiffness);
  const z = s.damping;
  const envelope = (ms: number): number => {
    const t = ms / 1000;
    return z === 1 ? Math.exp(-w0 * t) * (1 + w0 * t) : Math.exp(-z * w0 * t) / Math.sqrt(1 - z * z);
  };
  let horizon = SETTLE_STEP_MS;
  while (envelope(horizon) > SPRING_SETTLE_EPSILON) horizon *= 2;
  let lastOut = 0;
  for (let i = 0; i * SETTLE_STEP_MS <= horizon; i++) {
    const ms = i * SETTLE_STEP_MS;
    if (Math.abs(springPosition(s, ms) - 1) > SPRING_SETTLE_EPSILON) lastOut = ms;
  }
  return Math.ceil(lastOut + SETTLE_STEP_MS - 1e-9);
};

/** The stops `springLinearEasing` writes: evenly spaced over the settle time, the last one exactly 1. */
export const springEasingStops = (s: Spring): number[] => {
  const settle = springSettleMs(s);
  const n = Math.max(1, Math.ceil(settle / SPRING_SAMPLE_MS));
  const stops: number[] = [];
  for (let i = 0; i <= n; i++) stops.push(i === n ? 1 : Math.round(springPosition(s, (i / n) * settle) * 1000) / 1000);
  return stops;
};

/** The spring as a CSS `linear()` easing function, to run over `springSettleMs(s)` milliseconds. */
export const springLinearEasing = (s: Spring): string => `linear(${springEasingStops(s).map((v) => String(v === 0 ? 0 : v)).join(', ')})`;
