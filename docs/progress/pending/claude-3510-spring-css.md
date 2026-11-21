## (2026-11-18) — Springs reach the token CSS as a linear() curve and a settle time (#3510)

Owner decision Q-SP1 E: each `motion.spring.*` ships in `@prism3/tokens` as a transition CSS can play, a
`linear()` easing and its settling duration, while the damping and stiffness stay in the DTCG tree and Figma.
Six guaranteed names, `motion.spring-easing.{snappy,gentle,bouncy}` and `motion.spring-duration.{…}`, so
`CONTRACT_VERSION` 15.2.0 → 15.3.0 (MINOR). Engine {{ENGINE_VERSION}}.

### The derivation, and the two technical calls

`packages/engine/spring.ts` is the one derivation, written so G5 (#3485) takes Figma's paired spring duration
from the same `springSettleMs`. The spring is the analytic damped oscillator (ζ = `damping`, ω₀ = √`stiffness`,
mass 1), starting at rest:

- **Settle threshold: 0.1% of the travel.** The settle time is the first whole millisecond after which the
  spring stays inside that band, found on the curve, not its exponential envelope (the envelope over-states
  it). snappy 317ms, gentle 435ms, bouncy 360ms. The CSS steps the last 0.1% at the end: under a pixel for any
  move shorter than 1000px.
- **Sampling density: at most every 5ms**, rounded to 3 decimals. Interpolation error is at most h²/8 · k
  for a spring that starts at rest, 0.0032 at k = 1000, plus 0.0005 of rounding, so the stated bound is
  **0.005 of the travel**. `test.ts` measures it against the analytic spring densely: the shipped springs
  come in at 0.0013–0.0021, and the worst of a 30-spring sweep (ζ 0.1–1, k 50–1000) stays under it. A
  spring outside that domain throws rather than ship an unbounded curve.
- **The description says "sampled at most every 5ms"** (owner decision 2026-11-20). The stops are evenly spaced
  at settle / n, so the gap is a ceiling, not an exact step: 317 / 64 ≈ 4.95ms for snappy. A `test.ts` arm reads
  the number back out of each description and holds every shipped spring's gap to it.

### Why the curves are not DTCG leaves

DTCG has no type that can hold a `linear()` function: a `cubicBezier` must be four numbers, and a token
whose type can't be determined MUST be treated as invalid (2025.10 §5.2.2). So the durations are DTCG
`duration` leaves and travel in the projection, but the curves are a custom type, `linearEasing`, which the
projection omits like `spring` (#642). The engine writes them to a new per-brand `<brand>.css-only.json`, and
`sd.ship.mjs` reads it as a third source in every mode's run. Stock Style Dictionary has no transform for the
type and writes the string unchanged, so the no-custom-code rule holds. This route is flagged on the PR as an
owner decision, with the alternatives.

### Gates that moved

- `check-package.mjs` now expects the `linearEasing` names too, from its own list (`CSS_TYPES`), and compares
  a `linear()` value stop by stop.
- `check-consumability.mjs` counted every non-DTCG leaf as a corrupt (`[object Object]`) value in the
  canonical build. Only object-valued ones corrupt; a non-DTCG string passes through. It now counts those.
- `MOTION_FIGMA_COVERAGE` names both new families with no Figma form yet: the duration waits for G5's name.
