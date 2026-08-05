/**
 * Plugin STYLES write-adapter test (shadow/gradient lane) — drives the REAL `applyStylesPlan`
 * executor against an in-memory `StylesApi` shim, so the Effect/Paint style write is verified with no
 * live Figma.
 *
 *   npx tsx plugin/test-write-styles.ts
 *
 * The shim models Figma's style API: `createEffectStyle`/`createPaintStyle` mint a mutable style node
 * with `name`/`description`/`effects`|`paints`; `getLocalEffectStylesAsync`/`getLocalPaintStylesAsync`
 * return them. It also models the `variables` slice (#236) — a pre-seeded `palette/*` name→Variable
 * index plus `createVariableAlias`, which is what lets the stop-binding be asserted without Figma.
 *
 * Asserts: both shadow sets (`shadow/*` + `shadow-dark/*`) materialise as Effect Styles; aurora's
 * gradients materialise as Paint Styles carrying a GRADIENT_* paint + a gradientTransform + baked
 * stops; every traceable stop BINDS to its palette variable and the binding survives a re-apply;
 * a file missing the palette variables reports misses and still writes correct baked colour; re-apply
 * is idempotent (+0 created, no duplicate styles). Mirrors the other shim tests.
 */
import { buildStylesPlan } from '../Prism3/engine/write-plan';
import { brandTheme } from '../Prism3/engine/theme';
import { applyStylesPlan } from './src/write-styles';
import exampleBrands from '../Prism3/schema/example-brands.json';
import type { BrandInput } from '../Prism3/engine/theme';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the in-memory styles shim ------------------------------------------------------------
class ShimStyle {
  description = '';
  effects: readonly unknown[] = [];
  paints: readonly unknown[] = [];
  constructor(public name = '') {}
}
/** The `variables` slice the stop-binding needs. `seed` decides which palette names this "file" has —
 *  the empty case models applying gradients to a file whose palette was never written. */
class VarsShim {
  vars: { id: string; name: string }[];
  constructor(seed: string[]) { this.vars = seed.map((name, i) => ({ id: `V${i}`, name })); }
  async getLocalVariablesAsync(): Promise<{ id: string; name: string }[]> { return this.vars; }
  createVariableAlias(target: { id: string }): { type: 'VARIABLE_ALIAS'; id: string } {
    return { type: 'VARIABLE_ALIAS', id: target.id };
  }
}
class StylesShim {
  effectStyles: ShimStyle[] = [];
  paintStyles: ShimStyle[] = [];
  variables: VarsShim;
  constructor(paletteNames: string[] = []) { this.variables = new VarsShim(paletteNames); }
  async getLocalEffectStylesAsync(): Promise<ShimStyle[]> { return this.effectStyles; }
  async getLocalPaintStylesAsync(): Promise<ShimStyle[]> { return this.paintStyles; }
  createEffectStyle(): ShimStyle { const s = new ShimStyle(); this.effectStyles.push(s); return s; }
  createPaintStyle(): ShimStyle { const s = new ShimStyle(); this.paintStyles.push(s); return s; }
}

// ---- drive it: aurora (shadows + 2 gradients) ---------------------------------------------
const plan = buildStylesPlan(brandTheme(exampleBrands['aurora'] as unknown as BrandInput));
// Seed the shim with exactly the palette names this plan's stops ask for, so the happy path is the
// realistic one: apply runs AFTER the colour executor has written `palette/*`.
const planAliases = [...new Set(plan.paints.flatMap((p) => p.stops.map((s) => s.alias).filter((a): a is string => !!a)))];
const shim = new StylesShim(planAliases);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies StylesApi
const run = () => applyStylesPlan(plan, shim as any);

const r1 = await run();
const effectsAfterFirst = shim.effectStyles.length;
const paintsAfterFirst = shim.paintStyles.length;
const r2 = await run();

console.log('plugin STYLES write-adapter (shadow/gradient) — executor against in-memory shim\n');

// first run creates all; second is idempotent
ok(r1.effects.created === plan.effects.length && r1.paints.created === plan.paints.length,
  `first run creates all styles (effects ${r1.effects.created}/${plan.effects.length}, paints ${r1.paints.created}/${plan.paints.length})`);
ok(r2.effects.created === 0 && r2.paints.created === 0, `second run creates 0 (idempotent): effects +${r2.effects.created}, paints +${r2.paints.created}`);
ok(shim.effectStyles.length === effectsAfterFirst && shim.paintStyles.length === paintsAfterFirst,
  `no duplicate styles across re-run (${shim.effectStyles.length} effects / ${shim.paintStyles.length} paints, stable)`);

// both shadow sets present as Effect Styles
const effectNames = shim.effectStyles.map((s) => s.name);
ok(effectNames.some((n) => n.startsWith('shadow/')) && effectNames.some((n) => n.startsWith('shadow-dark/')),
  'both shadow sets materialise as Effect Styles (shadow/* + shadow-dark/*)');
ok(shim.effectStyles.every((s) => Array.isArray(s.effects) && s.effects.length > 0), 'every Effect Style carries ≥1 effect');

// gradients as Paint Styles with a GradientPaint (paintType + transform + baked stops)
ok(shim.paintStyles.length === plan.paints.length && shim.paintStyles.length > 0, `aurora gradients materialise as Paint Styles (${shim.paintStyles.length})`);
const paintBad: string[] = [];
for (const s of shim.paintStyles) {
  const paints = s.paints as any[];
  if (paints.length !== 1) { paintBad.push(`${s.name}: not exactly 1 paint`); continue; }
  const p = paints[0];
  if (!['GRADIENT_LINEAR', 'GRADIENT_RADIAL'].includes(p.type)) paintBad.push(`${s.name}: type=${p.type}`);
  if (!Array.isArray(p.gradientStops) || p.gradientStops.length < 2) paintBad.push(`${s.name}: <2 stops`);
  if (!Array.isArray(p.gradientTransform) || p.gradientTransform.length !== 2) paintBad.push(`${s.name}: bad transform`);
  if (!p.gradientStops.every((st: any) => st.color && [st.color.r, st.color.g, st.color.b, st.color.a].every((c: number) => c >= 0 && c <= 1))) paintBad.push(`${s.name}: stop RGBA out of gamut`);
}
ok(paintBad.length === 0, 'each Paint Style holds one GRADIENT_* paint + transform + baked in-gamut stops' + (paintBad.length ? ` — ${paintBad.slice(0, 3).join('; ')}` : ''));

// ---- light-only brand: no shadow-dark Effect Styles --------------------------------------
const lightPlan = buildStylesPlan(brandTheme({ ...(exampleBrands['aurora'] as unknown as BrandInput), modes: ['light'] }));
const lightShim = new StylesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await applyStylesPlan(lightPlan, lightShim as any);
ok(lightShim.effectStyles.some((s) => s.name.startsWith('shadow/')) && !lightShim.effectStyles.some((s) => s.name.startsWith('shadow-dark/')),
  'light-only brand: shadow/* Effect Styles but NO shadow-dark/*');

// ---- variable-linked stops (#236) ---------------------------------------------------------
// FIRST: the plan must carry the aliases at all. Every assertion below is vacuously satisfiable by a
// plan that dropped them (no aliases -> nothing to bind -> 0 misses -> "pass"), which is exactly the
// pre-#236 behavior this issue exists to change. So pin the input before asserting on the output.
ok(planAliases.length > 0, `the plan carries palette aliases on its stops (${planAliases.length} distinct)`);
ok(planAliases.every((a) => a.startsWith('palette/')), `every carried alias is a palette/* name (e.g. ${planAliases[0]})`);

const totalAliasStops = plan.paints.reduce((n, p) => n + p.stops.filter((s) => s.alias).length, 0);
ok(r1.paints.bound === totalAliasStops && r1.paints.bound > 0,
  `every traceable stop bound to its palette variable (${r1.paints.bound}/${totalAliasStops})`);
ok(r1.misses.length === 0, `no misses when the palette exists (${r1.misses.length})`);

// The binding must be on the stop, point at the right variable, AND keep the baked colour beside it —
// the RGBA is what a host that cannot resolve the variable renders, so losing it is a silent regression.
const bindBad: string[] = [];
for (const s of shim.paintStyles) {
  const stops = (s.paints as any[])[0].gradientStops as any[];
  const planRow = plan.paints.find((p) => p.name === s.name);
  if (!planRow) { bindBad.push(`${s.name}: no plan row`); continue; }
  stops.forEach((st, i) => {
    const wanted = planRow.stops[i]?.alias;
    if (!wanted) return;                                  // an authored hex stop: correctly unbound
    const alias = st.boundVariables?.color;
    if (!alias || alias.type !== 'VARIABLE_ALIAS') { bindBad.push(`${s.name} stop ${i}: not bound`); return; }
    const target = shim.variables.vars.find((v) => v.id === alias.id);
    if (target?.name !== wanted) bindBad.push(`${s.name} stop ${i}: bound to ${target?.name} not ${wanted}`);
    if (!st.color || typeof st.color.r !== 'number') bindBad.push(`${s.name} stop ${i}: lost its baked colour`);
  });
}
ok(bindBad.length === 0, 'each bound stop points at its own palette variable and keeps its baked RGBA'
  + (bindBad.length ? ` — ${bindBad.slice(0, 3).join('; ')}` : ''));

// Idempotency has to cover the BINDING, not just the style count: a re-apply that rebuilt the stops
// without them would leave the counts stable and the gradient silently baked again.
ok(r2.paints.bound === r1.paints.bound, `re-apply preserves every binding (${r2.paints.bound})`);
ok(shim.paintStyles.every((s) => ((s.paints as any[])[0].gradientStops as any[]).some((st) => st.boundVariables?.color)),
  'after re-apply every gradient still holds ≥1 bound stop');

// A file whose palette was never written: every named target is a miss, reported not thrown, and the
// baked colour still lands so the gradient renders correctly rather than not at all.
const barePlan = buildStylesPlan(brandTheme(exampleBrands['aurora'] as unknown as BrandInput));
const bareShim = new StylesShim([]);            // no palette variables in this "file"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bare = await applyStylesPlan(barePlan, bareShim as any);
ok(bare.paints.bound === 0 && bare.misses.length === totalAliasStops,
  `missing palette: 0 bound, every target reported as a miss (${bare.misses.length}/${totalAliasStops})`);
ok(bare.misses.every((m) => m.startsWith('palette/')), 'each miss names the palette variable it wanted');
ok(bareShim.paintStyles.length === barePlan.paints.length
  && bareShim.paintStyles.every((s) => ((s.paints as any[])[0].gradientStops as any[]).every((st) => st.color && !st.boundVariables)),
  'missing palette still writes every gradient with baked (unbound) stops — degraded, not broken');

console.log(`\nplugin STYLES write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
