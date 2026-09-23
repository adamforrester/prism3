/**
 * SIZE-OVERRIDE COHERENCE GATE (#1587) — an opt-in per-rung DESKTOP/MOBILE type-size override may not
 * produce an incoherent ramp. The committed record that a fluid type ramp never inverts (mobile ≤
 * desktop, per rung) or loses its monotonicity (mobile non-decreasing as size grows), and the thing that
 * fails BY NAME if the engine's coherence throw is removed or an authored pin escapes it.
 *
 *   npx tsx packages/engine/lint-size-override-coherence.ts
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
 *
 * A type ramp shrinks on the smaller viewport: mobile ≤ desktop, and both endpoints grow together as the
 * rung grows. The DERIVED path gets this for free — `theme.ts` `mobileEndpoint` is `Math.min(desktop, …)`
 * by construction — which is exactly why the only assertion in `test.ts` (`sizeMinPx ≤ sizePx`) held
 * without a real guard. #1587 lets a brand AUTHOR the mobile (and desktop) endpoint per rung
 * (`typography.sizeOverrides`), and an authored pin escapes the `Math.min`: a brand can now write
 * `mobile > desktop` (an inverted rung, the ramp growing on the smaller screen) or a pin that makes a
 * smaller rung's mobile exceed a larger rung's (a mobile ramp that goes backwards). Both are the
 * incoherent hand-authored shapes the engine exists to replace, so both are refused at build; this gate
 * is the independent record that the refusal is live and that the committed output is coherent.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────────
 *
 *   A. COMMITTED OUTPUT IS COHERENT — for every brand's emitted `type-sets.{desktop,mobile}.json`, each
 *      `font-fluid/<group>/<variant>` variable has mobile ≤ desktop, and within each heading group the
 *      mobile endpoints are non-decreasing as the desktop size grows. Guards the DERIVE on the committed
 *      bytes (if `mobileEndpoint` stopped clamping, a corpus brand would emit an inverted rung here).
 *   B. THE ENGINE REFUSES AN INCOHERENT OVERRIDE — a constructed input pinning `mobile > desktop` is
 *      REJECTED (`brandTheme` throws), and so is one that breaks the mobile ramp's monotonicity. This is
 *      the arm the "remove the coherence throw" mutation trips: with the throw gone, the build succeeds
 *      and the expected rejection never comes.
 *   C. A VALID OVERRIDE ACTUALLY TAKES EFFECT — a constructed input pinning a legal mobile endpoint is
 *      ACCEPTED and the emitted composite carries the PINNED value, not the derived one. This is the arm
 *      the "drop the resolution hook" mutation trips: with the hook gone the pin is ignored and the
 *      composite keeps the derived endpoint.
 *   D. THE GUARD DOES NOT OVER-REFUSE — a legal, coherent multi-rung override is ACCEPTED, so the throw
 *      cannot be widened into rejecting valid input without failing here.
 *
 * ── INDEPENDENCE (docs/34) ──────────────────────────────────────────────────────────────────────
 *
 * The oracle is `coherenceViolations` — a pure function whose EXPECTED is the invariant itself (mobile ≤
 * desktop; the mobile ramp is non-decreasing), transcribed as a rule, NEVER computed from `mobileEndpoint`
 * (deriving the expectation from the derivation is shape 1). ARM A's ACTUAL is the committed
 * `out/figma/<brand>/type-sets.*.json`, read as JSON — the theme build is never re-run to produce the
 * expected side. ARM B/C/D drive `brandTheme` over inputs AUTHORED HERE with outcomes stated here
 * (this input must throw; this one must emit 40px), so the acceptance/rejection the engine performs is
 * checked against a fixture the engine did not write. The self-check drives the oracle both directions.
 *
 * ── MUTATION-VERIFIED BY NAME (record the edit + the named failures in the PR body) ───────────────
 *
 *   · theme.ts — delete the post-loop coherence throw (the `c.sizeMinPx > c.sizePx` block in
 *     `buildComposites`)
 *       → ARM B fires: "an inverting override (title.md mobile 32 > desktop 24) was ACCEPTED — the
 *         engine's coherence throw is gone".
 *   · theme.ts — delete the mobile-ramp monotonicity throw
 *       → ARM B fires: "a monotonicity-breaking override was ACCEPTED".
 *   · theme.ts `push` — drop the `mobilePin ??` so the pin is ignored (`sizeMinPx =
 *     mobileEndpoint(...)`)
 *       → ARM C fires: "a valid mobile override (display.xl → 40) did not take effect: composite
 *         resolves to 48, the derived value".
 *   · theme.ts — make `mobileEndpoint` return `desktopPx` (drop the `Math.min` clamp), then `npx tsx
 *     packages/engine/regen.ts`
 *       → ARM A fires by name on every inverted committed rung.
 *
 * Commit (a `wip:` commit is enough) before each mutation: the restore `git checkout -- packages/engine`
 * reaches HEAD and would otherwise destroy uncommitted work in between (CLAUDE.md, docs/00-progress.md
 * 2026-08-21/24).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { brandTheme, type BrandInput } from './theme.ts';
import { MINIMAL_BRAND } from './token-contract.ts';

const OUT_FIGMA = join(import.meta.dirname, 'out', 'figma');

/** Brands whose emitted fluid ramp must be coherent. docs/34: a scoped gate asserts each promised surface
 *  is REPRESENTED, never merely counts — if one stops emitting a fluid ramp, this fails rather than
 *  passing over a smaller set. Discovered brands are checked too; these are the floor. */
const MUST_COVER = ['aurora', 'nb', 'wendys'];

/** A font-fluid variable name: `<root>/font-fluid/<group>/<variant>[/<weight…>]`. The GROUP and VARIANT
 *  segments are what pins a rung; every weight/modifier of one rung shares its size, so the first two
 *  segments identify it. Transcribed from the emit naming, not read from the emitter. */
const FLUID_NAME = /(?:^|\/)font-fluid\/([^/]+)\/([^/]+)(?:\/|$)/;

type Rung = { variant: string; desktop: number; mobile: number };

/**
 * THE ORACLE. Given a group's rungs (any order), return the coherence violations — empty when the ramp is
 * coherent. Two properties, both transcribed as the rule they name, neither derived from `mobileEndpoint`:
 *   1. mobile ≤ desktop, per rung (no inverted rung — the ramp must not grow on the smaller viewport).
 *   2. the mobile ramp is non-decreasing as desktop grows (a pin cannot make a smaller rung's mobile
 *      exceed a larger rung's). Non-decreasing, not strictly increasing: the derived display curve
 *      legitimately plateaus (96/112/128px all floor to 48px mobile), so a strict rule would reject the
 *      engine's own output.
 * Pure, so the self-check drives it directly.
 */
export const coherenceViolations = (group: string, rungs: Rung[]): string[] => {
  const out: string[] = [];
  for (const r of rungs)
    if (r.mobile > r.desktop)
      out.push(`${group}.${r.variant}: mobile ${r.mobile}px > desktop ${r.desktop}px — an inverted rung (the ramp grows on the smaller viewport)`);
  const ordered = [...rungs].sort((a, b) => a.desktop - b.desktop);
  let prevMin = -Infinity, prevVar = '';
  for (const r of ordered) {
    if (r.mobile < prevMin)
      out.push(`${group}.${r.variant}: mobile ${r.mobile}px < a lower rung (${group}.${prevVar})'s mobile ${prevMin}px — the mobile ramp decreases as size grows`);
    prevMin = r.mobile; prevVar = r.variant;
  }
  return out;
};

// ---- SELF-CHECK: can the oracle still see each violation, and pass a coherent ramp? ---------------
const selfFails: string[] = [];
if (coherenceViolations('display', [{ variant: 'sm', desktop: 48, mobile: 36 }, { variant: 'md', desktop: 64, mobile: 40 }]).length)
  selfFails.push('coherenceViolations flags a coherent ramp (false positive)');
if (!coherenceViolations('title', [{ variant: 'md', desktop: 24, mobile: 32 }]).some((r) => r.includes('inverted rung')))
  selfFails.push('coherenceViolations does not flag mobile > desktop — the inverting mutation would pass');
if (!coherenceViolations('display', [{ variant: 'sm', desktop: 48, mobile: 48 }, { variant: 'md', desktop: 64, mobile: 40 }]).some((r) => r.includes('decreases as size grows')))
  selfFails.push('coherenceViolations does not flag a decreasing mobile ramp — the monotonicity mutation would pass');
if (coherenceViolations('display', [{ variant: 'sm', desktop: 48, mobile: 48 }, { variant: 'md', desktop: 64, mobile: 48 }]).length)
  selfFails.push('coherenceViolations flags a PLATEAUED (equal) mobile ramp — it would reject the engine\'s own derived display curve');

// ARM B/C/D helpers — build a fixture carrying only a `sizeOverrides` addition and report whether it
// built and what it emitted. The fixtures and their expected outcomes are authored HERE, so the
// acceptance/rejection the engine performs is checked against inputs the engine did not write (docs/34).
const tryBuild = (so: unknown): { ok: boolean; theme?: ReturnType<typeof brandTheme>; err?: string } => {
  const base = MINIMAL_BRAND as unknown as { typography?: Record<string, unknown> };
  const input = { ...MINIMAL_BRAND, id: 'so', typography: { ...base.typography, sizeOverrides: so } } as unknown as BrandInput;
  try { return { ok: true, theme: brandTheme(input) }; }
  catch (e) { return { ok: false, err: (e as Error).message }; }
};
const compositeMin = (theme: ReturnType<typeof brandTheme>, group: string, variant: string): number | undefined =>
  theme.typography.composites.find((c) => c.group === group && c.variant === variant)?.sizeMinPx;

const failures: string[] = [];

// ARM B — the engine REFUSES an incoherent override (the throw is live).
{
  // An inverted rung, ISOLATED from the monotonicity throw so removing EITHER throw is caught by name:
  // title.2xl is the LARGEST title rung (desktop 40, derived mobile 36); pin its mobile to 48 (> its own
  // desktop 40 — inverted) but ≥ every lower rung's mobile, so the ramp stays non-decreasing. Only the
  // invert throw refuses this, so the "delete the invert throw" mutation makes it ACCEPTED and fires here.
  const invert = tryBuild({ title: { '2xl': { mobile: 48 } } });
  if (invert.ok) failures.push('ARM B: an inverting override (title.2xl mobile 48 > desktop 40) was ACCEPTED — the engine\'s per-rung mobile-≤-desktop throw is gone');
  // A backwards mobile ramp, ISOLATED from the invert throw: display.sm desktop 48, so pin mobile 48 —
  // EQUAL to its own desktop, so NOT an inverted rung — while display.md keeps its derived mobile 40, so
  // sm's mobile (48) exceeds the larger md's mobile (40). Only the monotonicity throw refuses this.
  const backwards = tryBuild({ display: { sm: { mobile: 48 } } });
  if (backwards.ok) failures.push('ARM B: a monotonicity-breaking override (display.sm mobile 48 > display.md mobile 40) was ACCEPTED — the mobile-ramp throw is gone');
}

// ARM C — a VALID override actually takes effect (the resolution hook is live).
{
  const pinned = tryBuild({ display: { xl: { mobile: 40 } } });
  if (!pinned.ok) failures.push(`ARM C: a legal mobile override (display.xl → 40px, derived is 48px) was REJECTED: ${pinned.err}`);
  else {
    const got = compositeMin(pinned.theme!, 'display', 'xl');
    if (got !== 40) failures.push(`ARM C: a valid mobile override (display.xl → 40) did not take effect: composite resolves to ${got}px, not the pinned 40px`);
  }
  // A desktop pin must move the max endpoint too.
  const dt = tryBuild({ title: { '2xl': { desktop: 48 } } });
  if (!dt.ok) failures.push(`ARM C: a legal desktop override (title.2xl → 48px) was REJECTED: ${dt.err}`);
  else {
    const c = dt.theme!.typography.composites.find((x) => x.group === 'title' && x.variant === '2xl');
    if (c?.sizePx !== 48) failures.push(`ARM C: a valid desktop override (title.2xl → 48) did not take effect: composite desktop is ${c?.sizePx}px, not 48px`);
  }
}

// ARM D — the guard does NOT over-refuse a legal, coherent multi-rung override.
{
  // display.sm mobile 32 (≤ desktop 48, ≥ floor 32), display.md mobile 40 (≤ desktop 64): 32 ≤ 40 and
  // both sit below the larger rungs' derived mobiles (lg 40, xl 48, …), so the whole ramp stays
  // non-decreasing. Coherent, so it must be ACCEPTED. If it is refused, the throw has been widened past
  // its remit. (A naive 40/48 fixture is NOT coherent: md's 48 would exceed lg's derived 40 — the guard
  // is right to reject that, which is exactly why the fixture is chosen with care.)
  const legal = tryBuild({ display: { sm: { mobile: 32 }, md: { mobile: 40 } } });
  if (!legal.ok) failures.push(`ARM D: a legal, coherent multi-rung override was REJECTED — the guard over-refuses: ${legal.err}`);
  else {
    const rungs = legal.theme!.typography.composites.filter((c) => c.group === 'display')
      .reduce((acc: Rung[], c) => acc.some((a) => a.variant === c.variant) ? acc : [...acc, { variant: c.variant, desktop: c.sizePx, mobile: c.sizeMinPx }], []);
    const v = coherenceViolations('display', rungs);
    if (v.length) failures.push(`ARM D: a build the engine ACCEPTED is itself incoherent — ${v[0]}`);
  }
}

if (selfFails.length) {
  console.error("\n❌ the size-override-coherence gate's own detection is broken — it cannot see what it claims to:\n");
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

// ---- ARM A: THE COMMITTED OUTPUT ----------------------------------------------------------------
const brands = existsSync(OUT_FIGMA)
  ? readdirSync(OUT_FIGMA, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];
if (brands.length === 0)
  failures.push(`SCOPE EMPTY: no brand directories under ${OUT_FIGMA} — ARM A would pass over an empty set. Run \`npx tsx packages/engine/regen.ts\` first.`);

const notes: string[] = [];
let rungsChecked = 0;
let brandsWithFluid = 0;

for (const brand of brands) {
  const dir = join(OUT_FIGMA, brand);
  const dPath = join(dir, 'type-sets.desktop.json');
  const mPath = join(dir, 'type-sets.mobile.json');
  // A brand with responsive OFF emits no type-sets files at all — legitimately, so absence is not a
  // failure. But if one endpoint file exists the other must, or the join is half-blind.
  if (!existsSync(dPath) && !existsSync(mPath)) { notes.push(`${brand}: no fluid type set (responsive off) — nothing to check`); continue; }
  if (!existsSync(dPath) || !existsSync(mPath)) { failures.push(`${brand}: only one of type-sets.{desktop,mobile}.json exists — the endpoint join cannot be built`); continue; }
  const readVals = (p: string): Map<string, number> => {
    const j = JSON.parse(readFileSync(p, 'utf8')) as { variables?: Array<{ name: string; value?: unknown }> };
    return new Map((j.variables ?? []).map((v) => [v.name, Number(v.value)] as const));
  };
  const desk = readVals(dPath), mob = readVals(mPath);
  // group -> (variant -> Rung), deduped: every weight of a rung shares its size.
  const byGroup = new Map<string, Map<string, Rung>>();
  for (const [name, dv] of desk) {
    const m = FLUID_NAME.exec(name);
    if (!m) continue;
    const [, group, variant] = m;
    const mv = mob.get(name);
    if (mv === undefined) { failures.push(`${brand}: '${name}' is in the desktop mode but missing from mobile — the endpoints do not align`); continue; }
    (byGroup.get(group) ?? byGroup.set(group, new Map()).get(group)!).set(variant, { variant, desktop: dv, mobile: mv });
    rungsChecked++;
  }
  if (byGroup.size === 0) { failures.push(`${brand}: type-sets files exist but no font-fluid/<group>/<variant> variable parsed — the name shape changed or the ramp is empty`); continue; }
  brandsWithFluid++;
  for (const [group, rungs] of byGroup)
    for (const v of coherenceViolations(group, [...rungs.values()]))
      failures.push(`${brand}: ${v}`);
  notes.push(`${brand}: ${[...byGroup.entries()].map(([g, r]) => `${g}×${r.size}`).join(' ')}`);
}

// ---- SCOPE FLOORS --------------------------------------------------------------------------------
for (const b of MUST_COVER)
  if (!brands.includes(b))
    failures.push(`SCOPE NOT REPRESENTED: '${b}' is a known emitted brand and this run found no directory for it. If it was legitimately removed, drop it from MUST_COVER in this file in the same PR; otherwise a clean ARM A means nothing.`);
if (brands.length && brandsWithFluid === 0)
  failures.push('FLUID RAMP UNWITNESSED: no brand emitted a fluid type set, so ARM A passed over an empty set. Either every corpus brand turned responsive off, or the type-sets emission broke.');

console.log(`Size-override coherence — ARM A: ${rungsChecked} rung(s) over ${brandsWithFluid} fluid brand(s) of ${brands.length}: ${brands.join(', ') || 'NONE'}; ARM B/C/D: engine refuses inversion + backwards ramp, honors a valid pin, accepts a legal multi-rung override.`);
for (const n of notes) console.log(`    ${n}`);

if (failures.length) {
  console.error(`\n❌ ${failures.length} size-override-coherence failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error('\nA fluid type ramp shrinks on the smaller viewport: mobile ≤ desktop, per rung, and the mobile ramp');
  console.error('never decreases as size grows. The DERIVE gets this for free (mobileEndpoint clamps with Math.min);');
  console.error('an authored per-rung override (#1587) can escape it, so the engine refuses an inverted or backwards');
  console.error('pin at build. This gate is the independent record that the refusal is live and the committed output is coherent.');
  process.exit(1);
}
console.log(`  ✓ every committed fluid ramp is coherent, the engine refuses an incoherent override, and a valid pin takes effect.`);
