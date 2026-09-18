/**
 * Plugin OPT-IN PRUNE test (#1521) — drives the pure `computePrunePlan` detector and the real
 * `applyPrunePlan` executor against in-memory shims, with no live Figma.
 *
 *   npx tsx apps/plugin/test-prune.ts
 *
 * The prune is the delete #479 / #1152 deliberately refused to do on a normal apply, made safe by two
 * things this file exists to pin: the detection is REUSED (`orphansOf` / `strandedCollections`), and a
 * NAMESPACE guard keeps a hand-added item from ever being swept up. The guard is the whole safety
 * argument, so the by-name mutation is here: each "NOT pruned" assertion below names the item a dropped
 * guard would delete, and goes red — by name — the moment a guard is removed (docs/34). A test that only
 * checked "the ghosts are pruned" would pass on an implementation that also deleted the designer's work.
 *
 * Two arms. The SYNTHETIC arm states the namespace policy crisply on hand-built data — the gate. The
 * REAL-PLAN arm drives the same detector off the shipped NB plans, so `root` derivation and the
 * `<root>/…` names are the engine's actual ones, not a fixture that could drift from them.
 *
 * Mirrors the sibling shim tests' dependency-free `ok(...)` style; exits non-zero on any failure.
 */
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan, buildFloatWritePlan, buildFontVarPlan, buildTextStylePlan } from '@prism3/engine/write-plan';
import { nbThemeFrom } from '@prism3/engine/theme';
import nbMeasured from '@prism3/engine/schema/nb-measured.json';
import { rootOf } from '@prism3/engine/figma-names';
import {
  computePrunePlan, prunePlanCount, applyPrunePlan, prunePreviewSummary, pruneAppliedSummary,
} from './src/prune-figma';
import type { PruneInput, PrunePlan, PruneApi } from './src/prune-figma';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('plugin OPT-IN PRUNE (#1521) — detector + executor against in-memory shims\n');

// ---- a removable in-memory shim -------------------------------------------------------------
// Objects the executor deletes through `.remove()`. A removed collection is modelled as taking its
// variables with it (Figma's cascade), so a "survivor" is a live object in a live collection.
class RVar {
  removed = false;
  constructor(public id: string, public name: string, public variableCollectionId: string) {}
  remove(): void { this.removed = true; }
}
class RColl {
  removed = false;
  constructor(public id: string, public name: string) {}
  remove(): void { this.removed = true; }
}
class RStyle {
  removed = false;
  constructor(public name: string) {}
  remove(): void { this.removed = true; }
}
class PruneShim {
  constructor(public colls: RColl[], public vars: RVar[], public styles: RStyle[]) {}
  async getLocalVariableCollectionsAsync(): Promise<RColl[]> { return this.colls; }
  async getLocalVariablesAsync(): Promise<RVar[]> { return this.vars; }
  async getLocalTextStylesAsync(): Promise<RStyle[]> { return this.styles; }
  /** Live = not removed, in a collection that is not removed (the cascade). */
  liveVarNames(): Set<string> {
    const deadColl = new Set(this.colls.filter((c) => c.removed).map((c) => c.id));
    return new Set(this.vars.filter((v) => !v.removed && !deadColl.has(v.variableCollectionId)).map((v) => v.name));
  }
  liveCollNames(): Set<string> { return new Set(this.colls.filter((c) => !c.removed).map((c) => c.name)); }
  liveStyleNames(): Set<string> { return new Set(this.styles.filter((s) => !s.removed).map((s) => s.name)); }
}

// =============================================================================================
// SYNTHETIC ARM — the namespace policy, stated crisply. This is the gate.
// =============================================================================================
const ROOT = 'nbds';
const synthInput: PruneInput = {
  collections: [
    // A plan-owned collection: one planned var (survives), one in-namespace ghost (prune), one
    // hand-added foreign-root var (MUST survive — the namespace guard's whole job).
    { name: 'color', variableNames: [`${ROOT}/color/text/primary`, `${ROOT}/color/text/legacy`, 'my-brand/accent'] },
    { name: 'core', variableNames: [`${ROOT}/core/palette/blue/500`] },
    { name: 'space', variableNames: [`${ROOT}/space/md`] },
    // Stranded + fully in-namespace → prune the whole collection (the #1148 `color.surface` shape).
    { name: 'color.surface', variableNames: [`${ROOT}/color/background/primary`] },
    // Stranded but holds a hand-added foreign var → MUST survive whole.
    { name: 'My Tokens', variableNames: ['my-brand/foo'] },
    // Stranded but empty → provenance unreadable, so MUST survive.
    { name: 'legacy-empty', variableNames: [] },
  ],
  textStyles: [
    'display/xl',      // planned — survives
    'body/md',         // planned — survives
    'display/2xl',     // orphan, group `display` is in the plan → prune (the lowered-ceiling case)
    'Marketing/Hero',  // hand-added, group `Marketing` not in the plan → MUST survive
    'Heading',         // hand-added, no group in the plan → MUST survive
  ],
  plannedVariables: [`${ROOT}/color/text/primary`, `${ROOT}/core/palette/blue/500`, `${ROOT}/space/md`],
  plannedCollections: ['color', 'core', 'space'],
  plannedTextStyles: ['display/xl', 'body/md'],
  root: ROOT,
};

const plan = computePrunePlan(synthInput);
const prunedVars = plan.variables.flatMap((g) => g.names);

// --- variables ---
ok(prunedVars.includes(`${ROOT}/color/text/legacy`),
  'variable: an in-namespace orphan in a plan-owned collection IS pruned');
ok(!prunedVars.includes('my-brand/accent'),
  'variable: a hand-added variable OUTSIDE the namespace is NOT pruned (namespace guard) — the by-name pin');
ok(!prunedVars.includes(`${ROOT}/color/text/primary`),
  'variable: a variable still in the plan is NOT pruned (an update, not an orphan)');
ok(plan.variables.length === 1 && plan.variables[0].collection === 'color',
  'variable: orphans are grouped under the collection they live in');

// --- stranded collections ---
ok(plan.collections.includes('color.surface'),
  'collection: a stranded, fully-in-namespace collection IS pruned whole');
ok(!plan.collections.includes('My Tokens'),
  'collection: a stranded collection holding a hand-added foreign var is NOT pruned — the by-name pin');
ok(!plan.collections.includes('legacy-empty'),
  'collection: an empty stranded collection is NOT pruned (provenance unreadable)');

// --- text styles ---
ok(plan.textStyles.includes('display/2xl'),
  'text style: an orphan whose group the plan still emits IS pruned (lowered displayCeiling)');
ok(!plan.textStyles.includes('Marketing/Hero'),
  'text style: a hand-added style in a group the plan does not emit is NOT pruned — the by-name pin');
ok(!plan.textStyles.includes('Heading'),
  'text style: a hand-added ungrouped style is NOT pruned');
ok(!plan.textStyles.includes('display/xl'),
  'text style: a style still in the plan is NOT pruned');

// --- count + prose ---
ok(prunePlanCount(plan) === 3,
  `prunePlanCount sums every kind (1 var + 1 collection + 1 style = 3; got ${prunePlanCount(plan)})`);
const preview = prunePreviewSummary(plan);
ok(/text style/.test(preview) && /variable/.test(preview) && /collection/.test(preview) && /namespace/.test(preview),
  'prunePreviewSummary names each kind and the namespace scope');

// --- the empty case: nothing stale, and it says so rather than opening a dialog ---
const cleanPlan = computePrunePlan({
  ...synthInput,
  collections: [{ name: 'color', variableNames: [`${ROOT}/color/text/primary`] }],
  textStyles: ['display/xl'],
});
ok(prunePlanCount(cleanPlan) === 0 && /No stale items/.test(prunePreviewSummary(cleanPlan)),
  'a file matching the plan prunes nothing, and the preview says so');

// --- root guard disabled: with no root, nothing in the variable/collection arms is prunable ---
const noRoot = computePrunePlan({ ...synthInput, root: '' });
ok(noRoot.variables.length === 0 && noRoot.collections.length === 0,
  'root empty disables the namespace guard entirely — the variable and collection arms prune nothing');

// =============================================================================================
// EXECUTOR — deletes EXACTLY the plan, and nothing else. Driven on the synthetic file above.
// =============================================================================================
const shim = new PruneShim(
  synthInput.collections.map((c, i) => new RColl(`c${i}`, c.name)),
  synthInput.collections.flatMap((c, i) => c.variableNames.map((n, j) => new RVar(`v${i}-${j}`, n, `c${i}`))),
  synthInput.textStyles.map((n) => new RStyle(n)),
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies PruneApi
const res = await applyPrunePlan(plan, shim as any as PruneApi);

ok(res.variables === 1 && res.collections === 1 && res.textStyles === 1 && res.misses.length === 0,
  `executor removed exactly the plan (1 var, 1 collection, 1 style, 0 misses; got ${res.variables}/${res.collections}/${res.textStyles}, misses ${res.misses.length})`);

const liveVars = shim.liveVarNames();
ok(!liveVars.has(`${ROOT}/color/text/legacy`), 'executor: the in-namespace orphan variable is gone');
ok(liveVars.has('my-brand/accent') && liveVars.has(`${ROOT}/color/text/primary`),
  'executor: the hand-added variable AND the planned variable are untouched');
const liveColls = shim.liveCollNames();
ok(!liveColls.has('color.surface'), 'executor: the stranded in-namespace collection is gone');
ok(liveColls.has('My Tokens') && liveColls.has('legacy-empty') && liveColls.has('color'),
  'executor: the foreign stranded collection, the empty one, and the plan-owned one are untouched');
ok(liveVars.has('my-brand/foo'),
  'executor: the foreign stranded collection’s variable survives with it (its collection was not removed)');
const liveStyles = shim.liveStyleNames();
ok(!liveStyles.has('display/2xl'), 'executor: the orphan text style is gone');
ok(liveStyles.has('Marketing/Hero') && liveStyles.has('Heading') && liveStyles.has('display/xl'),
  'executor: hand-added styles and the planned style are untouched');

const applied = pruneAppliedSummary(res);
ok(/Removed 3 stale items/.test(applied), `pruneAppliedSummary states what was removed ("${applied}")`);

// A miss is recorded, never thrown: a plan naming an item the file no longer holds reports it.
const emptyShim = new PruneShim([], [], []);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies PruneApi
const missRes = await applyPrunePlan(plan, emptyShim as any as PruneApi);
ok(missRes.variables === 0 && missRes.collections === 0 && missRes.textStyles === 0 && missRes.misses.length === 3,
  `executor records a miss for every named item absent from the file (${missRes.misses.length} misses), never throws`);

// =============================================================================================
// REAL-PLAN ARM — the shipped NB plans, so `root` and the `<root>/…` names are the engine's own.
// =============================================================================================
const theme = nbThemeFrom(nbMeasured);
const wp = buildWritePlan(buildFigmaColor(theme));
const floatPlan = buildFloatWritePlan(theme);
const fontPlan = buildFontVarPlan(theme);
const textPlan = buildTextStylePlan(theme);
const plannedVariables = [
  ...wp.palette.map((r) => r.name),
  ...wp.color.create.map((r) => r.name),
  ...floatPlan.flatMap((p) => p.create.map((r) => r.name)),
  ...fontPlan.flatMap((p) => p.rows.map((r) => r.name)),
];
const realRoot = rootOf(plannedVariables[0]);
ok(realRoot === 'nbds' && plannedVariables.every((n) => rootOf(n) === realRoot),
  `real plans: every emitted variable shares one brand root (${realRoot}) — the namespace the guard reads`);

// A file that IS the plan, plus one in-namespace ghost and one hand-added foreign var, both dumped into
// the `color` collection. The ghost must prune; the planned names and the foreign var must not.
const ghost = `${realRoot}/color/zzz-pruned-ghost`;
const foreign = 'client-brand/kept-by-hand';
const realInput: PruneInput = {
  collections: [{ name: 'color', variableNames: [...plannedVariables, ghost, foreign] }],
  textStyles: [...textPlan.map((r) => r.name)],
  plannedVariables,
  plannedCollections: ['color'],
  plannedTextStyles: textPlan.map((r) => r.name),
  root: realRoot,
};
const realPlan = computePrunePlan(realInput);
const realPruned = realPlan.variables.flatMap((g) => g.names);
ok(realPruned.length === 1 && realPruned[0] === ghost,
  `real plans: exactly the one in-namespace ghost is pruned (got ${realPruned.length}: ${realPruned.slice(0, 3).join(', ')})`);
ok(!realPruned.includes(foreign),
  'real plans: the hand-added foreign-root variable is left, against the engine’s real planned names');
ok(realPlan.textStyles.length === 0,
  'real plans: a file whose text styles all match the plan prunes none');

console.log(`\nplugin OPT-IN PRUNE: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
