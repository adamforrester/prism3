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
 * ── THE FIVE ARMS ───────────────────────────────────────────────────────────────────────────────
 *
 *   A. HONESTY   — recomputed ratio == recorded ratio. Catches a ground moving without its
 *                  dependents being re-derived, which is the #956 defect itself. Dispatches on each
 *                  role's DECLARED `model`, so both contrast shapes are recomputed rather than one
 *                  being taken on trust:
 *
 *                    ink-on-surface   truth = contrast(me, against)
 *                    ink-on-composite truth = contrast(legibleFor, composite(against, me, alpha))
 *
 *                  The second branch did not exist until #963, and could not have: an overlay's
 *                  `against` named the INK, and the ground it composited over was recorded nowhere,
 *                  so the middle term was simply missing. All 18 per mode were excluded — 1,296 per
 *                  run taken on trust. Now `against` means the same thing on every role and the
 *                  wash carries `legibleFor`, so they are verified like anything else.
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
 *   E. LABELLING — the declared `model` and the shape it implies agree, both directions: a wash
 *                  carries `legibleFor` + `alpha` and both resolve; anything else carries no stray
 *                  `legibleFor`. Runs BEFORE arm A uses the model to choose a recomputation, so a
 *                  mislabelled role fails saying it is mislabelled rather than being measured the
 *                  wrong way and reported as a ratio error — two very different debugging sessions.
 *
 *                  It CROSS-CHECKS two independently-declared things; it does not infer the model
 *                  from `alpha`. That distinction is load-bearing rather than pedantic:
 *                  `scrim.default` carries `alpha: 0.4` and is genuinely `ink-on-surface`, so the
 *                  inference would misclassify a real role on day one — which is exactly why the
 *                  model is declared at the `put` site instead of being read off the data.
 *
 * Run: `npx tsx packages/engine/lint-ratio-truth.ts`
 */
import { brandTheme, BrandInput } from './theme';
import { resolveAllModes, GROUND_INPUT } from './modes';
import { contrast, hexToRgb, composite } from './color';
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

/**
 * Every role some other role is measured against or through, read off a default build (#964).
 *
 * A ground is not only what `against` names. Since #963 a translucent wash names a second role in
 * `legibleFor` — the ink whose legibility its `ratio` reports — and moving THAT desynchronises the
 * wash exactly as moving the ground does. Both edges count, and forgetting the second is how the
 * count in #964's own table came out one short: `text.on-inverse.primary` only became reachable as a
 * ground when #962 repaired the nine `against` strings that had been dangling since #892.
 */
export const groundsOf = (theme: ReturnType<typeof brandTheme>): string[] => {
  const light = resolveAllModes(theme).find((m) => m.mode === 'light');
  if (!light) return [];
  const roles = light.roles as Record<string, { against?: string; legibleFor?: string }>;
  const g = new Set<string>();
  for (const r of Object.values(roles)) {
    for (const ref of [r.against, r.legibleFor])
      if (ref && ref !== 'self' && ref in roles) g.add(ref);
  }
  return [...g].sort();
};

/**
 * ONE CASE PER GROUND, ROUTED THROUGH `overrides` (#964).
 *
 * These exist because of a hole this gate had and could not see. Every case above builds through
 * `surfaces`, so arms A–C never exercised the `overrides` route at all — the same blindness that let
 * #962's ground refusal go unheld until arm D was written for it. A re-derivation could have landed
 * and left this gate green without ever having checked it.
 *
 * **Written and confirmed FAILING before the fix that makes them pass.** Against the pre-#964 engine
 * they report 700+ stale ratios across the 18 grounds that have no declarative input. A gate authored
 * after the fix cannot tell you the fix was needed, and this one is the whole evidence that it was.
 *
 * DISCOVERED, not hardcoded: the ground set comes from the tree, so a role that becomes a ground is
 * covered the day it does rather than the day someone remembers. That is discovery of WHAT TO TEST —
 * the EXPECTED is still `contrast()` over final colours and never the engine's own bookkeeping. The
 * floor below guards the one risk this takes on, which is the discovery silently returning few.
 *
 * Two steps per ground rather than one: a ground already sitting near `500` barely moves when pushed
 * there, and a case that does not move the colour cannot detect a stale dependent no matter how
 * broken the engine is.
 */
const OVERRIDE_CASES = (): Array<{ label: string; input: BrandInput }> =>
  groundsOf(brandTheme(MINIMAL_BRAND)).flatMap((ground) =>
    (GROUND_INPUT[ground] ? [] : ['500', '100']).map((step) => ({
      // A ground WITH a declarative input is excluded here because the engine refuses it outright —
      // that refusal is arm D's subject, and routing it through this sweep would only re-assert the
      // throw under a second name.
      label: `overrides.light[${ground}]=neutral.${step}`,
      input: { ...MINIMAL_BRAND, overrides: { light: { [ground]: { palette: 'neutral', step } } } } as BrandInput,
    })));

const failures: string[] = [];
let checked = 0, confessions = 0;

/** A ground that is a palette STEP (`neutral.050`) rather than a role — a real, intentional form. */
const isPaletteStep = (s: string): boolean => /^[a-z][a-z0-9-]*\.\d+$/.test(s);

const sweep = (label: string, theme: ReturnType<typeof brandTheme>): void => {
  for (const m of resolveAllModes(theme)) {
    const roles = m.roles as Record<string, { hex: string; against?: string; ratio?: number; min?: number; alpha?: number; model: string; legibleFor?: string }>;
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
      // ARM E — the DECLARED model and the shape it implies agree (#963). Checked here, before the
      // model is used to pick a recomputation, so a mislabelled role fails loudly instead of being
      // measured the wrong way and reported as a ratio error. Both directions.
      //
      // Note this does NOT infer the model from `alpha` — it cross-checks two independently-set
      // things. The distinction is the point: `scrim.default` carries `alpha: 0.4` and is genuinely
      // `ink-on-surface`, so an inference would have misclassified it on day one, which is why the
      // model is declared at the `put` site at all.
      //
      // A shape failure `continue`s. It is not enough for this arm to run FIRST — it has to STOP the
      // row, because arm A below dereferences `roles[legibleFor]` and a missing one throws. Mutating
      // `legibleFor` away proved it: the failure was recorded and then the process died on the very
      // next statement, printing a stack trace and no summary. **A crash names no gate**, and the
      // one assertion written for that mutation was the one silenced — the same shape #951 hit, where
      // a value check downstream of a shape check touched the missing shape first. Ordering an arm
      // ahead of another is only half of it; the other half is not falling through.
      if (r.model === 'ink-on-composite') {
        if (r.legibleFor == null || r.alpha == null) {
          failures.push(`${label}/${m.mode}: '${key}' declares model 'ink-on-composite' but is missing ${r.legibleFor == null ? 'legibleFor' : 'alpha'} — its ratio cannot be recomputed, so the role would be unverifiable by construction.`);
          continue;
        }
        if (!(r.legibleFor in roles)) {
          failures.push(`${label}/${m.mode}: '${key}' names legibleFor '${r.legibleFor}', which is not a role in this mode — the same dangling-reference failure arm C catches on \`against\`, one field over.`);
          continue;
        }
      } else if (r.legibleFor != null) {
        failures.push(`${label}/${m.mode}: '${key}' is model '${r.model}' but carries a legibleFor ('${r.legibleFor}') — that field belongs only to a translucent wash, and a stray one means the two models have started blurring again (#963).`);
        continue;
      }

      if (!(r.min && r.min > 0) || r.ratio == null) continue;

      // ARM A — recomputed from the FINAL emitted colours, dispatched on the DECLARED model. Never
      // reads `r.ratio` to decide the truth in either branch.
      //
      // `ink-on-composite` was excluded outright until #963, because with `against` naming the ink
      // there was no way to recompute it — the ground it composited over was recorded nowhere. Now
      // `against` is that ground on every role, `legibleFor` is the ink, and the wash is verifiable:
      // 1,296 ratios per run that used to be taken on trust.
      let truth: number;
      if (r.model === 'ink-on-composite') {
        const washed = composite(hexToRgb(roles[against].hex), hexToRgb(r.hex), r.alpha!);
        truth = contrast(hexToRgb(roles[r.legibleFor!].hex), washed);
      } else {
        truth = contrast(hexToRgb(r.hex), hexToRgb(roles[against].hex));
      }
      checked++;
      // How the failure READS has to differ, because the two models fail differently and a reader
      // debugging one should not be handed the other's sentence.
      const how = r.model === 'ink-on-composite'
        ? `'${r.legibleFor}' on this wash composited over '${against}'`
        : `against '${against}'`;
      if (Math.abs(truth - r.ratio) > EPS)
        failures.push(`${label}/${m.mode}: '${key}' records ratio ${r.ratio.toFixed(2)} ${how}, but the emitted colors measure ${truth.toFixed(2)} — the recorded number describes something the tree no longer contains (#956).`);

      // ARM B — comply, or confess.
      if (truth < r.min) {
        confessions++;
        if (!warned.has(key))
          failures.push(`${label}/${m.mode}: '${key}' measures ${truth.toFixed(2)} ${how}, below its ${r.min}:1 minimum, and NO warning names it. Generated output must comply or say so — silence is the one outcome ruled out.`);
      }
    }
  }
};

for (const { id, theme } of corpus()) sweep(`corpus:${id}`, theme);
for (const c of CASES) sweep(c.label, brandTheme(c.input));
const overrideCases = OVERRIDE_CASES();
for (const c of overrideCases) sweep(c.label, brandTheme(c.input));

// FLOOR 3 — the override sweep is DISCOVERED, so it is the one arm that can quietly shrink to nothing
// without any code changing: a rename in `against`/`legibleFor` would empty `groundsOf` and every case
// with it, and the run would go green over an empty set. `docs/34` shape 9. The count is the tree's,
// not a target — 18 grounds without a declarative input at the time of writing, and the floor sits
// below that rather than at it so adding an input to one is not a failure.
if (overrideCases.length < 24)
  failures.push(`only ${overrideCases.length} override case(s) generated from ${groundsOf(brandTheme(MINIMAL_BRAND)).length} discovered ground(s) — \`groundsOf\` is finding far fewer than the tree holds, so this sweep is asserting over almost nothing. Check whether \`against\`/\`legibleFor\` moved.`);

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

if (failures.length) {
  console.error(`\n❌ ${failures.length} ratio-truth failure(s):\n`);
  for (const f of failures.slice(0, 25)) console.error(`    ${f}`);
  if (failures.length > 25) {
    console.error(`    … and ${failures.length - 25} more`);
    // WHICH CASES, not just how many. The 25-line cap prints failures in sweep order, so a large
    // run shows only the cases swept first — and the ones swept last look like they passed. That is
    // not hypothetical: measuring whether arm B still bites the re-derived rows, this cap reported a
    // confident **0** for the override cases when the real answer was **98**, because all 25 printed
    // lines came from the corpus and `surfaces` sweeps ahead of them. A truncated list read as a
    // finding for several minutes.
    //
    // Same class #954 recorded for `lint-us-english` (a planted regression invisible behind a
    // backlog). The cap stays — a 200-line dump helps nobody — but a per-case tally cannot be
    // truncated into a wrong answer, so it goes below the elision rather than above it.
    const byCase = new Map<string, number>();
    for (const f of failures) {
      const label = f.split(':')[0] ?? '?';
      byCase.set(label, (byCase.get(label) ?? 0) + 1);
    }
    console.error(`\n    failures by case (${byCase.size} affected):`);
    for (const [label, n] of [...byCase].sort((a, b) => b[1] - a[1]).slice(0, 12))
      console.error(`      ${String(n).padStart(4)}  ${label}`);
    if (byCase.size > 12) console.error(`      … and ${byCase.size - 12} more case(s)`);
  }
  process.exit(1);
}
console.log('✓ clean — every recorded ratio matches the color it was measured against, and every shortfall is warned.');
