/** Prism3 engine — Motion: durations, easings, springs and transitions, generated from the tempo lever.
 *
 *  Split out of `theme.ts` (#3698 R5), which re-exports its public names unchanged.
 */
// ---------------------------------------------------------------------------
// Motion axis — generated from a single personality lever (`tempo`), the motion
// analog of the density/radius levers. Grounded in 18-motion-foundations + a
// 7-system field survey: a non-linear duration ramp scaled by tempo; the
// convergent easing roles (standard/enter=decelerate/exit=accelerate/emphasized)
// + a `calm` accessibility curve; M3-sourced springs by perceptual outcome;
// Atlassian-style composite transitions; and reduce-motion as a DERIVED output
// (Apple "substitute, don't delete": small informational motion preserved/floored,
// large/vestibular motion eliminated) — not a hand-maintained second list.
export type Bezier = [number, number, number, number];
export type MotionPersonality = {
  tempo?: 'snappy' | 'standard' | 'relaxed';   // scales the base duration ramp
  // Which CURVE each motion role resolves to, brand-wide (#522 follow-up). The per-mode re-point in
  // `modeLevers.<mode>.easings` deviates from THIS, so without it a mode could override a baseline
  // nobody could set — you could change Dark but not Light, which is backwards. Same shape as the
  // per-mode map; absent entries keep the engine default.
  easingRoles?: Partial<Record<string, string>>;
};
export type MotionAxis = {
  tempo: 'snappy' | 'standard' | 'relaxed';
  duration: Record<string, number>;            // ms, semantic roles (tempo-scaled)
  durationReduced: Record<string, number>;     // ms, reduce-motion variants (derived)
  easing: Record<string, Bezier>;
  spring: Record<string, { damping: number; stiffness: number }>;
  stagger: number;                             // ms between staggered siblings
  transitions: { name: string; duration: string; easing: string; desc: string }[];
  // Per-mode tempo (Phase D) — only modes whose `modeLevers.tempo` differs from the baseline tempo. Each
  // carries the RE-DERIVED duration ramp (+ reduce-motion + stagger) at that mode's tempo; easing/spring/
  // transitions are tempo-invariant, so they're not duplicated. Composites (motion.transition.*) reference
  // motion.duration.<role> by alias, so they inherit per-mode. Absent ⇒ byte-identical.
  motionByMode?: Record<string, { tempo: string; duration: Record<string, number>; durationReduced: Record<string, number>; stagger: number }>;
  // The ROLE tier (#522): which curve each motion intent uses. Derived from `transitions` so the two
  // cannot disagree — a transition names its role, the role names the curve. Exists so a mode has a
  // semantic to re-point WITHOUT redefining `motion.easing.*`, the same job `font.weight-role.*` does
  // for `font.weight.*`.
  easingRoles: { role: string; curve: string }[];
  // Only modes that actually re-point get an entry; absent ⇒ byte-identical emit.
  easingRolesByMode?: Record<string, Record<string, string>>;
};

// The engine's opinion about which curve each intent starts from. A brand overrides any of them via
// `motionPersonality.easingRoles`; a mode deviates further via `modeLevers.<mode>.easings`.
export const EASING_ROLE_DEFAULTS = [
  { role: 'default', curve: 'standard' },
  { role: 'enter', curve: 'decelerate' },
  { role: 'exit', curve: 'accelerate' },
  { role: 'emphasized', curve: 'expressive' },
] as const;
const DURATION_BASE: Record<string, number> = { instant: 50, fast: 100, normal: 200, moderate: 300, slow: 500, slower: 800 };
const TEMPO_FACTOR = { snappy: 0.8, standard: 1, relaxed: 1.3 } as const;
/** The spinner's turn (#1670): `motion.duration.spin` / `motion.duration-reduced.spin`. Fixed, not tempo-scaled. */
export const SPIN_ROLE = 'spin';
export const SPIN_MS = 800;
export const SPIN_REDUCED_MS = 2600;
/** The progress bar's indeterminate sweep (#2670, owner call 6 A): `motion.duration.sweep` / `motion.duration-reduced.sweep`.
 *  A loop period like the spin, so fixed, not tempo-scaled: one pass of the segment across the track every 1.6s, and
 *  under reduced motion the same sweep, slower (2.6s, the spin's reduced period; owner call 7 A). */
export const SWEEP_ROLE = 'sweep';
export const SWEEP_MS = 1600;
export const SWEEP_REDUCED_MS = 2600;
/** The duration roles that are loop periods rather than steps of the tempo-scaled ramp. */
export const LOOP_ROLES: readonly string[] = [SPIN_ROLE, SWEEP_ROLE];
const round5 = (n: number) => Math.round(n / 5) * 5;

export const buildMotion = (p: MotionPersonality = {}): MotionAxis => {
  const tempo = p.tempo ?? 'standard';
  const f = TEMPO_FACTOR[tempo];
  const duration: Record<string, number> = {};
  for (const [k, v] of Object.entries(DURATION_BASE)) duration[k] = round5(v * f);
  // reduce-motion: ≤100ms (informational) preserved; ≤200ms floored to 50; larger
  // (vestibular/decorative) → 0 (substituted by an instant cross-fade downstream).
  const durationReduced: Record<string, number> = {};
  for (const [k, v] of Object.entries(duration)) durationReduced[k] = v <= 100 ? v : v <= 200 ? 50 : 0;
  // ONE TURN OF A SPINNER (#1670, owner spec 2026-09-26) — a loop PERIOD, not a transition, so it sits
  // outside the tempo-scaled ramp and outside the reduce-motion rule above: 0.8s per turn at every tempo,
  // and under reduced motion a SLOW turn (2.6s) rather than a shorter or eliminated one. The spinner is
  // functional — it is how a sighted user knows work is still happening — so reduced motion slows it
  // instead of removing it. Written after the ramp loops so neither formula touches it.
  duration[SPIN_ROLE] = SPIN_MS;
  durationReduced[SPIN_ROLE] = SPIN_REDUCED_MS;
  // THE PROGRESS BAR'S SWEEP (#2670) — the same kind of thing as the turn above: a loop period, kept and slowed
  // under reduced motion, never removed, because the moving segment is the only busy cue an indeterminate bar has.
  duration[SWEEP_ROLE] = SWEEP_MS;
  durationReduced[SWEEP_ROLE] = SWEEP_REDUCED_MS;
  const easing: Record<string, Bezier> = {
    // Curves are named for their SHAPE, roles for their USE. They used to share names — `easing.enter`
    // and `easing-role.enter` — which made the role table read `enter → enter` and gave a reader no way
    // to tell which axis they were on. That was fine while the shape name did double duty as the use
    // name; adding the role tier (#527) split the two meanings apart and left the shape tier wearing
    // the use tier's names. `default → standard` was the only row that said anything, and it is the
    // only one that never collided.
    linear: [0, 0, 1, 1],
    standard: [0.2, 0, 0, 1],           // symmetric in-place (M3 standard)
    decelerate: [0, 0, 0.2, 1],         // ease-out — fast, then settles into place
    accelerate: [0.4, 0, 1, 1],         // ease-in — eases off, then leaves
    expressive: [0.4, 0.14, 0.3, 1],    // the S-curve (Carbon expressive-standard); the comment already said so
    calm: [0.4, 0, 0.6, 1],             // a11y: soft onset for long/involuntary motion
  };
  const spring = {
    snappy: { damping: 0.9, stiffness: 700 },   // M3 standard spatial — fast settle, no overshoot
    gentle: { damping: 0.8, stiffness: 380 },   // M3 expressive spatial — natural settle
    bouncy: { damping: 0.6, stiffness: 800 },   // M3 expressive fast — overshoot (expressive layer)
  };
  return {
    tempo, duration, durationReduced, easing, spring, stagger: round5(40 * f),
    // One source: the roles ARE the transition intents, so adding a transition adds its role and the
    // two can never drift apart.
    easingRoles: EASING_ROLE_DEFAULTS.map((r) => {
      const picked = p.easingRoles?.[r.role];
      if (picked !== undefined && !(picked in easing))
        throw new Error(`motionPersonality.easingRoles.${r.role}: unknown easing curve '${picked}' (have: ${Object.keys(easing).join(', ')})`);
      return { role: r.role, curve: picked ?? r.curve };
    }),
    transitions: [
      { name: 'default', duration: 'normal', easing: 'standard', desc: 'standard in-place transition' },
      { name: 'enter', duration: 'normal', easing: 'decelerate', desc: 'element settles in' },
      { name: 'exit', duration: 'fast', easing: 'accelerate', desc: 'element accelerates out' },
      { name: 'emphasized', duration: 'moderate', easing: 'expressive', desc: 'expressive / hero moment' },
    ],
  };
};
