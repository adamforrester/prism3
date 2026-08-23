/**
 * Prism3 engine — THE REPORTED CONTRAST RATIO IS THE REAL ONE (#956).
 *
 * Every contrast-gated role records three things: its own colour, the role it was measured
 * `against`, and the `ratio` between them. This gate recomputes that ratio from the two FINAL
 * emitted colours and asserts the recorded number matches — then asserts the result clears the
 * role's `min`, or that a warning admits it does not.
 *
 * ── WHY THIS COULD NOT BE A CHECK ON `ratio` ────────────────────────────────────────────────────
 *
 * `test.ts` has asserted "all mode contrast contracts hold" for a long time, in this shape:
 *
 *     roles.filter(([, r]) => r.min > 0 && r.ratio < r.min)
 *
 * It reads `r.ratio` — the number the derivation wrote down. So it asks the reporting path whether
 * the reporting path is correct, and in the one failure mode that matters it agrees with itself.
 * Measured: with an inverse band routed through the override post-pass, `text.on-inverse.primary`
 * recorded 18.10 against a band it was never measured on, where the true ratio was **1.71**. Every
 * contract check passed. 43 of 53 gated roles were in that state and nothing in the tree could see
 * it, because nothing in the tree computed contrast from the final colours.
 *
 * **That is the entire reason this file exists, and the rule it encodes is general: a gate whose
 * EXPECTED comes from the code under test is a tautology wearing an assertion's clothes.** `docs/34`
 * shape 1. The independence here is concrete — `contrast()` over two `hex` strings, never `r.ratio`
 * as an input to anything it concludes.
 *
 * ── WHY IT SWEEPS DECLARED SURFACES AND NOT JUST THE CORPUS ─────────────────────────────────────
 *
 * The corpus builds every brand at its declared defaults, and at defaults every brand is clean — the
 * defect needs a ground that MOVED. A gate that only ran the corpus would report a confident zero
 * over exactly the inputs that cannot exhibit the bug (`docs/34` shape 14: calibrated below its own
 * motivating defect). So `CASES` below moves each ground deliberately, including to values no sane
 * brand would pick, because the question is whether the bookkeeping survives — not whether the
 * result is pretty.
 *
 * ── THE FOUR ARMS ───────────────────────────────────────────────────────────────────────────────
 *
 *   A. HONESTY   — recomputed ratio == recorded ratio. Catches a ground moving without its
 *                  dependents being re-derived, which is the #956 defect itself.
 *
 *                  EXCLUDES the 18 translucent overlays, and the reason is a finding rather than a
 *                  convenience. For every other role `against` names THE SURFACE I SIT ON, and
 *                  `ratio` is `contrast(me, that)`. For an overlay the arrow is REVERSED: the role
 *                  is the wash, `against` names the INK that ends up on top of it, and `ratio` is
 *                  `contrast(that ink, composite(ground, me, alpha))` — a three-way relationship
 *                  whose middle term (which ground it composites over) the role does not record.
 *                  So the recomputation this arm performs is not merely unavailable for them, it
 *                  would be measuring the wrong pair: run against overlays it reports 1.07 where
 *                  14.26 is correct, and the 14.26 is right. One field name carrying two opposite
 *                  meanings is worth fixing; it is filed rather than fixed here, because renaming a
 *                  field on 18 roles is not this PR. Until then these 18 are UNVERIFIED by this
 *                  gate, which is a hole stated out loud rather than a silence.
 *   B. CONFESSION— a role below its `min` is named in `warnings`. "Generated output always complies"
 *                  is not achievable against every ground a user may declare (no ink is 4.5:1 on
 *                  mid-grey), so the promise that CAN be kept is: it complies, or it says so.
 *   C. RESOLUTION— every `against` names a role that exists. This is the arm that would have caught
 *                  nine `against` strings still pointing at the pre-#892 `text.on-inverse` after it
 *                  became a group: they resolved to nothing, fell back to the page surface, and no
 *                  compiler complained because an `against` is data, not a reference.
 *   D. REFUSAL   — a ground that HAS a declarative input is rejected by the override layer, and the
 *                  rejection names that input. Added after a mutation showed deleting the refusal
 *                  left arms A-C entirely clean: they build themes through `surfaces`, so they never
 *                  exercise the `overrides` route the refusal guards. A rule nothing holds is a
 *                  comment.
 *
 * Run: `npx tsx packages/engine/lint-ratio-truth.ts`
 */
import { brandTheme, BrandInput } from './theme';
import { resolveAllModes, GROUND_INPUT } from './modes';
import { contrast, hexToRgb } from './color';
import { corpus, MINIMAL_BRAND } from './token-contract';

/** A ratio is a float; equality is "the same number", not "close enough to pass". */
const EPS = 0.02;

/**
 * Ground moves worth proving the bookkeeping against. Deliberately includes grounds the ramp cannot
 * serve (mid-grey) — arm B's whole subject is what the engine says when it comes up short, so a case
 * list of only workable surfaces would never exercise it.
 */
const CASES: Array<{ label: string; input: BrandInput }> = [
  { label: 'defaults', input: MINIMAL_BRAND },
  ...([950, 700, 500, 300, 100] as const).flatMap((n) => [
    { label: `surfaces.light.inverseBase=${n}`, input: { ...MINIMAL_BRAND, surfaces: { light: { inverseBase: n } } } as BrandInput },
    { label: `surfaces.light.base=${n}`, input: { ...MINIMAL_BRAND, surfaces: { light: { base: n } } } as BrandInput },
  ]),
  { label: 'surfaces.dark.inverseBase=25', input: { ...MINIMAL_BRAND, surfaces: { dark: { inverseBase: 25 } } } as BrandInput },
  { label: 'surfaces.light.inverseBase=black', input: { ...MINIMAL_BRAND, surfaces: { light: { inverseBase: 'black' } } } as BrandInput },
];

const failures: string[] = [];
let checked = 0, confessions = 0;

/** A ground that is a palette STEP (`neutral.050`) rather than a role — a real, intentional form. */
const isPaletteStep = (s: string): boolean => /^[a-z][a-z0-9-]*\.\d+$/.test(s);

let skippedAlpha = 0;

const sweep = (label: string, theme: ReturnType<typeof brandTheme>): void => {
  for (const m of resolveAllModes(theme)) {
    const roles = m.roles as Record<string, { hex: string; against?: string; ratio?: number; min?: number; alpha?: number }>;
    const warned = new Set((m.warnings ?? []).map((w) => w.role));
    for (const [key, r] of Object.entries(roles)) {
      const against = r.against;
      if (!against || against === 'self') continue;

      // ARM C — the `against` resolves. Checked before the others because a dangling ground makes
      // every number downstream of it meaningless rather than merely wrong.
      if (!(against in roles)) {
        if (!isPaletteStep(against))
          failures.push(`${label}/${m.mode}: '${key}' is measured against '${against}', which is not a role in this mode — the lookup falls back to the page surface, so its ratio describes a ground it was never on.`);
        continue;
      }
      // Translucent washes model `against`/`ratio` the other way round — see arm A's note in the
      // header — so arms A and B cannot read them. Counted rather than dropped quietly, so the size
      // of the unverified set shows in this gate's own output instead of being a fact you must read
      // the source to learn.
      //
      // AFTER arm C, and that ordering is load-bearing rather than tidy. It sat before it at first,
      // which made arm C dead for exactly the nine roles that motivated it: the stale
      // `text.on-inverse` strings this PR repaired are all on overlays, so the skip swallowed them
      // and the mutation that reverts the repair produced a CLEAN run. `docs/34` shape 14 — a gate
      // calibrated below its own motivating defect — found by mutating rather than by reading, in
      // the file whose header warns about it. Whether an `against` NAMES A REAL ROLE is independent
      // of which direction the arrow points, so arm C applies to every role and only the
      // ratio-recomputing arms step aside.
      if (r.alpha != null) { skippedAlpha++; continue; }
      if (!(r.min && r.min > 0) || r.ratio == null) continue;

      // ARM A — recomputed from the two FINAL colours. Never reads `r.ratio` to decide the truth.
      const truth = contrast(hexToRgb(r.hex), hexToRgb(roles[against].hex));
      checked++;
      if (Math.abs(truth - r.ratio) > EPS)
        failures.push(`${label}/${m.mode}: '${key}' records ratio ${r.ratio.toFixed(2)} against '${against}', but its emitted color measures ${truth.toFixed(2)} on that ground — the recorded number describes a surface the tree no longer contains (#956).`);

      // ARM B — comply, or confess.
      if (truth < r.min) {
        confessions++;
        if (!warned.has(key))
          failures.push(`${label}/${m.mode}: '${key}' measures ${truth.toFixed(2)} against '${against}', below its ${r.min}:1 minimum, and NO warning names it. Generated output must comply or say so — silence is the one outcome ruled out.`);
      }
    }
  }
};

for (const { id, theme } of corpus()) sweep(`corpus:${id}`, theme);
for (const c of CASES) sweep(c.label, brandTheme(c.input));

// ARM D — the refusal itself is held here, and it is here because a mutation proved it had to be.
// Deleting the ground refusal from `modes.ts` left every arm above CLEAN: the sweep builds themes
// through `surfaces`, so it never exercises the `overrides` route at all, and the one thing standing
// between a user and the original defect was unheld by anything. The `staleDependents` warning still
// fired, so the outcome was not silent — but "not silent" is a weaker promise than the refusal, and a
// gate that cannot tell the two apart is not holding the stronger one.
//
// Driven off the engine's own `GROUND_INPUT` rather than a copy of it, so a ground gaining an input
// is covered the day it does, and a ground losing one cannot leave a rule here asserting over nothing.
for (const [ground, field] of Object.entries(GROUND_INPUT)) {
  const input = { ...MINIMAL_BRAND, overrides: { light: { [ground]: { palette: 'neutral', step: '300' } } } } as BrandInput;
  let threw: string | undefined;
  try { resolveAllModes(brandTheme(input)); } catch (e) { threw = (e as Error).message; }
  if (!threw)
    failures.push(`overrides['${ground}'] was ACCEPTED. It is a ground with a declarative input (\`surfaces.<mode>.${field}\`), so the override layer must refuse it — applying it there rewrites one role after everything gated on it has already derived (#956).`);
  else if (!threw.includes(field))
    failures.push(`overrides['${ground}'] was refused, but the message does not name \`${field}\` — a refusal that does not say where to go instead is a dead end, which is the half of this rule that makes it usable: "${threw.slice(0, 120)}…"`);
}

// FLOOR — `docs/34` shape 9. A scan that finds nothing to check reports a clean zero that is
// indistinguishable from a clean tree. The corpus alone contributes thousands of gated roles; if this
// drops off the vocabulary moved and the gate is asserting over an empty set.
if (checked < 2000)
  failures.push(`only ${checked} ratio(s) checked — the scan is looking for the wrong thing. Every contrast-gated role in every mode of every corpus brand plus ${CASES.length} declared-surface cases should qualify; far fewer means \`against\`/\`ratio\`/\`min\` moved and this gate is measuring an empty set.`);

// FLOOR 2 — arm B must actually be exercised. Every case complying would mean the sweep never reaches
// a ground the ramp cannot serve, so the confession arm would be unproven rather than satisfied.
if (confessions === 0)
  failures.push(`arm B never fired: no case produced a role below its minimum, so "complies or confesses" was never tested. CASES needs a ground the ramp genuinely cannot serve (a mid-grey base is the reliable one).`);

console.log(`Prism3 reported-ratio truth — ${checked} gated ratio(s) recomputed from final colors across ${corpus().length} corpus brand(s) + ${CASES.length} declared-surface case(s); ${confessions} below-minimum role(s), all confessed`);
console.log(`  ${skippedAlpha} translucent overlay ratio(s) NOT verified — they model \`against\` in the opposite direction (see arm A); filed separately`);

if (failures.length) {
  console.error(`\n❌ ${failures.length} ratio-truth failure(s):\n`);
  for (const f of failures.slice(0, 25)) console.error(`    ${f}`);
  if (failures.length > 25) console.error(`    … and ${failures.length - 25} more`);
  process.exit(1);
}
console.log('✓ clean — every recorded ratio matches the color it was measured against, and every shortfall is warned.');
