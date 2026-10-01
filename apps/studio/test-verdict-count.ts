/**
 * What the verdict counts (UI redesign S1.3, `docs/superpowers/ui-redesign/implementation-plan.md` §3.5).
 *
 *   npx tsx apps/studio/test-verdict-count.ts
 *
 * The owner decided what the verdict counts (v4 review Q2): every role with a floor, in every mode, which
 * is 884 for prism3, and Health says "221 per mode". This holds `state/verdict.ts` to those numbers.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The oracle is the decision's literal numbers, typed
 * here: 884, 221 and the four mode names. They are never computed from the engine or the module. An
 * engine change that adds or drops gated roles fails this BY NAME, which is the point: the decision named
 * a number, and a moved number is the owner's to re-decide, not this file's to follow.
 *
 * Also checked: a failing role is counted (an override below its floor moves `fail` off zero), which
 * proves the counter is not a constant; the derived-mode set against the literal list the owner's mode
 * model names (v6 hatches high contrast and wireframe); and the copy against concept v6, verbatim.
 *
 * Mutation this fails by name: count roles with no floor (drop the `r.min > 0` clause) →
 * `prism3 gates 884 roles across its modes (the v4 review's number) — counted 936`. (Dropping only the
 * `against === 'self'` clause changes nothing for prism3, whose self-measured roles carry no minimum; the
 * clause stays as concept v6 wrote it.)
 */
import { brandTheme } from '@prism3/engine/theme';
import { resolvePreview } from '@prism3/engine/resolve-preview';
import examples from '@prism3/engine/schema/example-brands.json';
import type { BrandInput } from '@prism3/engine/theme';
import { breadthLine, healthLine, isDerived, modeLine, verdictLine, verdictOf } from './src/state/verdict';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const PRISM3_TOTAL = 884;
const PRISM3_PER_MODE = 221;
const PRISM3_MODES = ['light', 'dark', 'hc-light', 'hc-dark'];

const input = (examples as Record<string, BrandInput>).prism3;
const theme = brandTheme(structuredClone(input));
const modes = resolvePreview(theme).modes;
ok(JSON.stringify(modes) === JSON.stringify(PRISM3_MODES), `prism3 ships ${PRISM3_MODES.join(', ')} (read ${modes.join(', ')})`);
const v = verdictOf(theme, modes);
ok(v.total === PRISM3_TOTAL, `prism3 gates ${PRISM3_TOTAL} roles across its modes (the v4 review's number) — counted ${v.total}`);
for (const m of v.per) ok(m.n === PRISM3_PER_MODE, `prism3 gates ${PRISM3_PER_MODE} roles in ${m.mode} — counted ${m.n}`);
ok(v.fail === 0 && v.modesFailing === 0, `prism3 has no role below its floor (fail ${v.fail}, modes failing ${v.modesFailing})`);
ok(verdictOf(theme, modes) === v, 'the verdict is cached per theme (one resolve per edit)');

// The copy, verbatim from concept v6.
ok(verdictLine(v) === 'All 884 pairs at or above floor', `the bar reads "All 884 pairs at or above floor" — read "${verdictLine(v)}"`);
ok(healthLine(v) === 'All 884 pairs at or above floor.', `Health reads "All 884 pairs at or above floor." — read "${healthLine(v)}"`);
ok(breadthLine(v, (m) => m) === '221 per mode × 4 modes', `Health's breadth reads "221 per mode × 4 modes" — read "${breadthLine(v, (m) => m)}"`);
ok(modeLine(v.per[0], 'Light') === 'Light: 221 of 221 at or above', `a passing mode reads "Light: 221 of 221 at or above" — read "${modeLine(v.per[0], 'Light')}"`);

// A failing role is counted. The default theme's own override seam: point a text role at a pale step.
const bad = structuredClone(input) as BrandInput;
bad.overrides = { light: { 'text.secondary': { palette: 'neutral', step: '100' } } } as BrandInput['overrides'];
let badTheme;
try { badTheme = brandTheme(bad); } catch (e) { badTheme = null; ok(false, `a below-floor override resolves (warned, not blocked) — threw ${(e as Error).message}`); }
if (badTheme) {
  const bv = verdictOf(badTheme, resolvePreview(badTheme).modes);
  const light = bv.per.find((m) => m.mode === 'light')!;
  ok(light.f >= 1 && bv.fail >= 1 && bv.modesFailing >= 1, `an override below its floor is counted as a failure (light fails ${light.f}, total fail ${bv.fail})`);
  ok(/^\d+ of 884 below floor, \d+ modes?$/.test(verdictLine(bv)), `the failing bar line reads "<n> of 884 below floor, <m> mode(s)" — read "${verdictLine(bv)}"`);
  ok(modeLine(light, 'Light') === `Light: ${light.f} of ${light.n} below`, `a failing mode reads "Light: <f> of <n> below" — read "${modeLine(light, 'Light')}"`);
}

// Derived modes: the owner's mode model (Q1, model B) hatches the generated ones.
const DERIVED = ['hc-light', 'hc-dark', 'wireframe'];
const EDITED = ['light', 'dark', 'promo'];
for (const m of DERIVED) ok(isDerived(m), `${m} is a derived mode`);
for (const m of EDITED) ok(!isDerived(m), `${m} is not a derived mode`);

console.log(`\n${executed - failed}/${executed} verdict assertions passed.`);
if (failed) process.exit(1);
