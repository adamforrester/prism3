/**
 * Plugin FLOAT write-adapter test (#146) — drives the REAL `applyFloatPlan` executor against an
 * in-memory `figma.variables` shim, so the whole FLOAT materialisation is verified with no live Figma.
 *
 *   npx tsx apps/plugin/test-write-float.ts
 *
 * Same shim shape as `test-write.ts`, widened for FLOAT vars (numeric per-mode values). Asserts the
 * ten FLOAT collections (`core`/`space`/`radius`/`size`/`icon`/`control`/`border-width`/
 * `focus`/`opacity`/`layout`) materialise: all vars created, cross-collection aliases bound (space→core, size→…,
 * layout grid→space) with ZERO misses, opacity stored as 0–100, the `core` primitives hidden,
 * and a re-run is idempotent (+0 created, no duplicates). Also drives a wireframe brand to prove the
 * two-mode `radius` collection (every radius aliases `core/dimension/0` in the wireframe mode). Since
 * #1570 it also drives a CONFIG SHRINK — `layout.breakpoints` 6 → 2, re-applied to the same shim — which
 * is the case the old positional `renameMode(modes[0], plan.modes[0])` turned into two modes named `sm`.
 *
 * Every variable name here carries the BRAND ROOT as its first segment (#1097), and aurora is an
 * engine-native brand, so the expected names are written out with the `ads/` root SPELLED — a literal,
 * not `theme.root` read back. (#1283 restamped that literal from `prism/`; it did not stop being one —
 * a root moving is exactly the event this spelling exists to make visible, and it was.) The point is that the executor is being held to a name the test author
 * wrote down, so a root that silently stopped being applied fails here rather than agreeing with itself.
 * The three primitive groups also now share ONE `core` collection, which is why the dimension primitives
 * are looked up under `core` and not under a `core-dimension` that no longer exists.
 *
 * Mirrors the engine suite's dependency-free `ok(...)` style; exits non-zero on any failure.
 */
import { buildFloatWritePlan } from '@prism3/engine/write-plan';
import { brandTheme } from '@prism3/engine/theme';
import { applyFloatPlan, ownedModeIds, stampOwnedModes } from './src/write-figma';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import type { BrandInput } from '@prism3/engine/theme';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the in-memory figma.variables shim (FLOAT-capable) ------------------------------------
type Val = { r: number; g: number; b: number; a: number } | { type: 'VARIABLE_ALIAS'; id: string } | number;
class ShimVar {
  scopes: string[] = [];
  description = '';
  hiddenFromPublishing = false;
  valuesByMode: Record<string, Val> = {};
  constructor(public id: string, public name: string, public variableCollectionId: string, public resolvedType: 'COLOR' | 'FLOAT' = 'COLOR') {}
  setValueForMode(modeId: string, value: Val): void { this.valuesByMode[modeId] = value; }
}
class ShimCollection {
  modes: { modeId: string; name: string }[];
  private seq = 0;
  /** SHARED plugin data, keyed `namespace → key → value`. Modeled on Figma's own behavior, PROBED live on a
   *  real `VariableCollection` (2026-09-23) rather than assumed, because every one of these details is load
   *  bearing for `stampOwnedModes` and three of them are surprising:
   *    • an unset key reads back `''`, not `undefined` — so `''` is the absent sentinel;
   *    • writing `''` REMOVES the key rather than storing an empty string;
   *    • a second write REPLACES wholesale, so the append-only union has to be computed by the caller —
   *      a shim that merged would make `stampOwnedModes`'s union untestable by agreeing with it;
   *    • the NAMESPACE charset is enforced by Figma and throws on anything outside `[A-Za-z0-9_.]` (a
   *      hyphen throws). Enforced here too, so a namespace that drifts to an illegal spelling fails this
   *      test loudly instead of passing against a permissive shim and throwing in the real plugin. */
  shared: Record<string, Record<string, string>> = {};
  constructor(public id: string, public name: string) { this.modes = [{ modeId: `${id}:m0`, name: 'Mode 1' }]; }
  renameMode(modeId: string, name: string): void { const m = this.modes.find((x) => x.modeId === modeId); if (m) m.name = name; }
  addMode(name: string): string { const modeId = `${this.id}:m${++this.seq}`; this.modes.push({ modeId, name }); return modeId; }
  private ns(namespace: string): Record<string, string> {
    if (!/^[A-Za-z0-9_.]+$/.test(namespace)) {
      throw new Error('The namespace can only consist of alphanumeric characters, _ or .');
    }
    return (this.shared[namespace] ??= {});
  }
  getSharedPluginData(namespace: string, key: string): string { return this.ns(namespace)[key] ?? ''; }
  setSharedPluginData(namespace: string, key: string, value: string): void {
    const bag = this.ns(namespace);
    if (value === '') delete bag[key]; else bag[key] = value;
  }
}
class VariablesShim {
  collections: ShimCollection[] = [];
  vars: ShimVar[] = [];
  private cseq = 0;
  private vseq = 0;
  async getLocalVariableCollectionsAsync(): Promise<ShimCollection[]> { return this.collections; }
  // Honor the type filter like the real API (`getLocalVariablesAsync('COLOR')` returns ONLY COLOR
  // vars) — so an idempotency regression from a wrong type filter can't hide (#146 review).
  async getLocalVariablesAsync(type?: string): Promise<ShimVar[]> { return type ? this.vars.filter((v) => v.resolvedType === type) : this.vars; }
  createVariableCollection(name: string): ShimCollection { const c = new ShimCollection(`c${++this.cseq}`, name); this.collections.push(c); return c; }
  createVariable(name: string, collection: ShimCollection, t: 'COLOR' | 'FLOAT' = 'COLOR'): ShimVar { const v = new ShimVar(`v${++this.vseq}`, name, collection.id, t); this.vars.push(v); return v; }
  createVariableAlias(target: ShimVar): { type: 'VARIABLE_ALIAS'; id: string } { return { type: 'VARIABLE_ALIAS', id: target.id }; }
}

// ---- drive it: aurora (6 breakpoints, no wireframe) ----------------------------------------
const aurora = brandTheme(exampleBrands['aurora'] as unknown as BrandInput);
const plan = buildFloatWritePlan(aurora);
const shim = new VariablesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const run = () => applyFloatPlan(plan, shim as any);

const r1 = await run();
const varsAfterFirst = shim.vars.length;
const r2 = await run();

console.log('plugin FLOAT write-adapter (#146) — executor against in-memory figma.variables shim\n');

// collections present — the ten FLOAT axes
const EXPECTED = ['core', 'space', 'radius', 'size', 'icon', 'control', 'border-width', 'focus', 'opacity', 'layout'];
ok(EXPECTED.every((n) => shim.collections.some((c) => c.name === n)),
  `all ten FLOAT collections created: ${EXPECTED.join(', ')}`);

// first run creates all vars; second is idempotent
const totalVars = plan.reduce((n, p) => n + p.create.length, 0);
const firstCreated = r1.collections.reduce((n, c) => n + c.created, 0);
const secondCreated = r2.collections.reduce((n, c) => n + c.created, 0);
ok(firstCreated === totalVars, `first run creates every FLOAT var (${firstCreated}/${totalVars})`);
ok(secondCreated === 0, `second run creates 0 (idempotent find-by-name → update): +${secondCreated}`);
ok(shim.vars.length === varsAfterFirst, `no duplicate vars across re-run (${shim.vars.length} total, stable)`);

// aliases bound across collections, zero misses
const expectedBound = plan.reduce((n, p) => n + p.aliases.reduce((m, a) => m + a.targetsByMode.filter((t) => t).length, 0), 0);
ok(r1.bound === expectedBound && r2.bound === expectedBound, `every FLOAT alias bound in every mode: ${r1.bound}/${expectedBound}`);
ok(r1.misses.length === 0 && r2.misses.length === 0,
  `zero unresolved bindings${r1.misses.length ? ' — ' + r1.misses.slice(0, 3).join(',') : ''}`);

// cross-collection alias: space/* aliases a `core` dimension var (resolved to a different collection)
const dimCol = shim.collections.find((c) => c.name === 'core')!;
const spaceCol = shim.collections.find((c) => c.name === 'space')!;
const byId = new Map(shim.vars.map((v) => [v.id, v]));
const aSpace = shim.vars.find((v) => v.variableCollectionId === spaceCol.id && Object.values(v.valuesByMode).some((val) => typeof val === 'object' && 'type' in val))!;
const spaceTargetVal = aSpace && Object.values(aSpace.valuesByMode)[0];
const spaceTarget = spaceTargetVal && typeof spaceTargetVal === 'object' && 'type' in spaceTargetVal ? byId.get(spaceTargetVal.id) : undefined;
ok(!!spaceTarget && spaceTarget.variableCollectionId === dimCol.id && spaceTarget.name.startsWith('ads/core/dimension/'),
  `space var aliases a rooted core-tier dimension primitive across collections (${aSpace?.name} -> ${spaceTarget?.name})`);

// opacity stored as 0–100 (Figma OPACITY scope percent), not 0–1
const opCol = shim.collections.find((c) => c.name === 'opacity')!;
const opVals = shim.vars.filter((v) => v.variableCollectionId === opCol.id).flatMap((v) => Object.values(v.valuesByMode)).filter((v): v is number => typeof v === 'number');
ok(opVals.length > 0 && opVals.every((n) => n >= 0 && n <= 100) && opVals.some((n) => n > 1),
  `opacity values are 0–100 percent (max ${Math.max(...opVals)})`);

// the `core` primitives hidden from publishing + scoped
const dimVars = shim.vars.filter((v) => v.variableCollectionId === dimCol.id);
ok(dimVars.length > 0 && dimVars.every((v) => v.hiddenFromPublishing && v.scopes.length > 0),
  'every `core` primitive hidden from publishing + scoped');

// layout carries one mode per breakpoint the brand ships (aurora: xs..2xl = 6)
const layoutCol = shim.collections.find((c) => c.name === 'layout')!;
ok(layoutCol.modes.length === plan.find((p) => p.name === 'layout')!.modes.length && layoutCol.modes.length >= 4,
  `layout collection has one mode per breakpoint (${layoutCol.modes.map((m) => m.name).join('/')})`);

// ---- wireframe brand: two-mode radius, every radius aliases dimension/0 in the wireframe mode ----
const wf = brandTheme({ ...(exampleBrands['aurora'] as unknown as BrandInput), modes: ['light', 'dark', 'wireframe'] });
const wfPlan = buildFloatWritePlan(wf);
const wfShim = new VariablesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await applyFloatPlan(wfPlan, wfShim as any);
const wfRadiusCol = wfShim.collections.find((c) => c.name === 'radius')!;
ok(wfRadiusCol.modes.some((m) => m.name === 'wireframe') && wfRadiusCol.modes.some((m) => m.name === 'Default'),
  `wireframe brand: radius collection has Default + wireframe modes (${wfRadiusCol.modes.map((m) => m.name).join('/')})`);
const wfById = new Map(wfShim.vars.map((v) => [v.id, v]));
const wfMode = wfRadiusCol.modes.find((m) => m.name === 'wireframe')!;
const radiusVars = wfShim.vars.filter((v) => v.variableCollectionId === wfRadiusCol.id);
const allWireToDim0 = radiusVars.every((v) => {
  const val = v.valuesByMode[wfMode.modeId];
  if (typeof val !== 'object' || !('type' in val)) return false;
  // STILL A LITERAL, restamped (#1283): aurora's root moved `prism` -> `ads`, so the spelled name
  // moved with it. Reading `wf.root` here instead would be the change this file's header refuses.
  return wfById.get(val.id)?.name === 'ads/core/dimension/0';
});
ok(radiusVars.length > 0 && allWireToDim0, 'wireframe mode: every radius aliases ads/core/dimension/0 (sharp corners)');

// =============================================================================================
// CONFIG SHRINK (#1570) — the same file re-applied after `layout.breakpoints` drops from 6 to 2.
//
// This is the sharp end of #1570, measured live: the executors used to rename mode[0] into the plan's
// FIRST mode name unconditionally and positionally, so `xs` was renamed to `sm` while a mode called `sm`
// was already sitting beside it. Figma allows it. The file ended with TWO modes named `sm`, one of them
// unreachable to everything downstream (this file's own add-or-reuse loop, `read-figma`, the conformance
// scan, the designer's own mode dropdown), and the new values landing in the wrong one.
//
// The pins below are by-name against BOTH halves of that: no duplicate name, and the DESIGNER'S existing
// `sm` mode — held by modeId, captured before the shrink — is the one that receives the new values. The
// second pin is the one a name-only test cannot make, because pre-fix the file really did have a mode
// named `sm` holding stale values while another mode named `sm` held fresh ones.
// =============================================================================================
const auroraInput = exampleBrands['aurora'] as unknown as BrandInput;
const withBps = (breakpoints: number[]): BrandInput =>
  ({ ...auroraInput, layout: { ...((auroraInput as { layout?: object }).layout ?? {}), breakpoints } }) as BrandInput;
const sixPlan = buildFloatWritePlan(brandTheme(withBps([0, 480, 768, 1024, 1280, 1536])));
const twoPlan = buildFloatWritePlan(brandTheme(withBps([0, 768])));
const sixLayout = sixPlan.find((p) => p.name === 'layout')!;
const twoLayout = twoPlan.find((p) => p.name === 'layout')!;
ok(sixLayout.modes.join(',') === 'xs,sm,md,lg,xl,2xl' && twoLayout.modes.join(',') === 'sm,md',
  `#1570 premise: the shrink really moves the layout modes (${sixLayout.modes.join('/')} → ${twoLayout.modes.join('/')})`);

const shrinkShim = new VariablesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyFloatPlan(sixPlan, shrinkShim as any);
const shrinkLayout = shrinkShim.collections.find((c) => c.name === 'layout')!;
// The designer's `sm` mode, by IDENTITY, taken while the config still had six breakpoints.
const smIdBefore = shrinkLayout.modes.find((m) => m.name === 'sm')!.modeId;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await applyFloatPlan(twoPlan, shrinkShim as any);

const namesAfter = shrinkLayout.modes.map((m) => m.name);
const duplicates = namesAfter.filter((n, i) => namesAfter.indexOf(n) !== i);
ok(duplicates.length === 0,
  `#1570 shrink 6→2 creates NO duplicate mode name (modes now ${namesAfter.join('/')}; duplicates: ${duplicates.join(',') || 'none'})`);
ok(namesAfter.filter((n) => n === 'sm').length === 1,
  '#1570 the plan’s first mode `sm` exists exactly ONCE — the pre-fix run renamed `xs` into a second `sm`');
ok(shrinkLayout.modes.find((m) => m.modeId === smIdBefore)?.name === 'sm',
  '#1570 the designer’s existing `sm` mode keeps its identity (same modeId, same name) — bindings survive the shrink');

// The new values land in THAT mode, not in a renamed `xs` beside it. Only literal rows are checked:
// pass B overwrites some with aliases, and an alias id is not the plan's number.
const shrinkVars = new Map(
  shrinkShim.vars.filter((v) => v.variableCollectionId === shrinkLayout.id).map((v) => [v.name, v] as const),
);
const smIndex = twoLayout.modes.indexOf('sm');
let smMatch = 0;
const smWrong: string[] = [];
for (const row of twoLayout.create) {
  const v = shrinkVars.get(row.name);
  const got = v?.valuesByMode[smIdBefore];
  if (typeof got !== 'number') continue;     // aliased in pass B — not a literal to compare
  if (got === row.valuesByMode[smIndex]) smMatch++;
  else smWrong.push(`${row.name} ${got} ≠ ${row.valuesByMode[smIndex]}`);
}
ok(smMatch > 0 && smWrong.length === 0,
  `#1570 the 2-breakpoint values land in the designer’s own \`sm\` mode (${smMatch} literal rows match${smWrong.length ? `, WRONG: ${smWrong.slice(0, 3).join('; ')}` : ''}) — pre-fix they went to the renamed \`xs\``);

// And the apply still DELETES nothing: the four modes the shrink stranded are all still there, for the
// opt-in prune (#1521/#1570) to offer. `removeMode` is never called from an apply.
const stranded = namesAfter.filter((n) => !twoLayout.modes.includes(n));
ok(stranded.join(',') === 'xs,lg,xl,2xl',
  `#1570 the apply strands the dropped modes rather than deleting them (${stranded.join('/')}) — deletion is the opt-in prune's`);

// =============================================================================================
// MODE PROVENANCE (#1581) — the stamp a real apply writes, driven through the SAME shrink above.
//
// #1570's prune arm had to offer every unclaimed mode and let the designer veto, because a mode carries no
// provenance to read. `stampOwnedModes` writes it: on every apply, the engine's own mode ids go onto the
// collection as shared plugin data, unioned with whatever is already there.
//
// APPEND-ONLY is the whole mechanism and it is what the first pin below is about. The four modes the shrink
// stranded were written by the 6-breakpoint apply and are NOT written by the 2-breakpoint one, so a
// "the modes this apply wrote" snapshot would drop exactly them — and the prune would stop offering the
// drift it exists to find, silently. The pin names them.
// =============================================================================================
const OWNED_NS = 'prism3';                   // the shared-plugin-data namespace, spelled here as a literal
const OWNED_KEY = 'modes:owned';             // …and the key, so a rename of either fails by name here
const ownedAfterShrink = ownedModeIds(shrinkLayout as unknown as Parameters<typeof ownedModeIds>[0]);
const strandedIds = shrinkLayout.modes.filter((m) => stranded.includes(m.name)).map((m) => m.modeId);
const survivorIds = shrinkLayout.modes.filter((m) => twoLayout.modes.includes(m.name)).map((m) => m.modeId);
ok(strandedIds.length === 4 && strandedIds.every((id) => ownedAfterShrink.includes(id)),
  `#1581 APPEND-ONLY: the four modes the shrink stranded (${stranded.join('/')}) are STILL stamped as the engine's after the 2-breakpoint apply — keep-last drops them and the prune stops offering them`);
ok(survivorIds.every((id) => ownedAfterShrink.includes(id)),
  `#1581 the modes this apply DID write are stamped too (${twoLayout.modes.join('/')})`);
ok(ownedAfterShrink.length === shrinkLayout.modes.length,
  `#1581 the stamp covers every mode in the collection and nothing else (${ownedAfterShrink.length} stamped / ${shrinkLayout.modes.length} present)`);
// The raw stored form, at the namespace + key the SHARED CONTRACT fixes. Read straight off the shim rather
// than through `ownedModeIds`, so a drift in either string fails here instead of round-tripping through one
// helper that agrees with itself.
const rawStamp = shrinkLayout.getSharedPluginData(OWNED_NS, OWNED_KEY);
ok(rawStamp !== '' && JSON.stringify(JSON.parse(rawStamp)) === JSON.stringify(ownedAfterShrink),
  `#1581 the stamp is a JSON string array under getSharedPluginData("${OWNED_NS}", "${OWNED_KEY}") — SHARED, so an agent census can read it back (${rawStamp.slice(0, 48)}…)`);

// A mode the DESIGNER adds survives an apply and is never claimed by the stamp — which is what lets the
// prune spare it. The hand-added mode goes on after the engine has already stamped this collection, which
// is the case the stamp can actually distinguish; the seed case (a mode present before the first stamp) is
// pinned in the unit arm below, and is deliberately the other way.
const printId = shrinkLayout.addMode('print');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyFloatPlan(twoPlan, shrinkShim as any);
const ownedAfterHandMode = ownedModeIds(shrinkLayout as unknown as Parameters<typeof ownedModeIds>[0]);
ok(shrinkLayout.modes.some((m) => m.modeId === printId) && !ownedAfterHandMode.includes(printId),
  '#1581 a hand-added `print` mode survives the next apply and is NOT stamped as the engine\'s — the by-name pin for the mode the prune must spare');
ok(strandedIds.every((id) => ownedAfterHandMode.includes(id)),
  '#1581 …and that apply did not drop the stranded ids either — the union is taken on every apply, not just the first');

// ---- the stamp helpers, directly: absence, garbage, and the MIGRATION SEED ------------------
class StampColl {
  shared: Record<string, string> = {};
  constructor(public id: string, public name: string, public modes: { modeId: string; name: string }[]) {}
  renameMode(): void {}
  addMode(): string { return 'x'; }
  getSharedPluginData(_ns: string, key: string): string { return this.shared[key] ?? ''; }
  setSharedPluginData(_ns: string, key: string, value: string): void { if (value === '') delete this.shared[key]; else this.shared[key] = value; }
}
/* eslint-disable @typescript-eslint/no-explicit-any -- structural: these satisfy the VarCollection port */
const asColl = (c: unknown) => c as any;
// ABSENT surface — a collection that models no plugin data at all. This is the shape every OTHER shim in
// this repo has, and the shape a pre-#1581 file effectively has, so neither reading nor writing may throw.
const noData = { id: 'nd', name: 'plain', modes: [{ modeId: 'a', name: 'light' }], renameMode() {}, addMode: () => 'x' };
ok(ownedModeIds(asColl(noData)).length === 0, '#1581 a collection with no plugin-data surface reads as NO provenance, not an error');
let threw = false;
try { stampOwnedModes(asColl(noData), ['a']); } catch { threw = true; }
ok(!threw, '#1581 …and stamping one is a no-op rather than a throw — an apply never fails because provenance could not be written');

const garbage = new StampColl('g', 'garbage', [{ modeId: 'a', name: 'light' }]);
for (const junk of ['not json at all', '{"modes":["a"]}', '42', '["a", 7, null]']) {
  garbage.shared[OWNED_KEY] = junk;
  const read = ownedModeIds(asColl(garbage));
  ok(junk === '["a", 7, null]' ? read.join(',') === 'a' : read.length === 0,
    `#1581 a stamp holding ${JSON.stringify(junk)} is read tolerantly (got [${read.join(',')}]) — another plugin's value in the same namespace must not break an apply`);
}

// THE MIGRATION SEED — the one deliberate deviation from a strict "only what the engine wrote", and it is
// flagged rather than hidden. Provenance cannot be retrofitted: a collection that predates the stamp holds
// modes nobody recorded, so a strict rule would spare them forever and silently disable #1570's repair on
// every file damaged before this shipped — including the live test file, which still holds the duplicate
// `sm`. The seed presumes those pre-existing modes are the engine's, which is EXACTLY today's behavior,
// frozen at the moment knowledge begins. From the first stamp onward, attribution is real.
const legacy = new StampColl('l', 'layout', [
  { modeId: 'old-sm', name: 'sm' }, { modeId: 'old-dup', name: 'sm' }, { modeId: 'old-lg', name: 'lg' },
]);
const seeded = stampOwnedModes(asColl(legacy), ['old-sm']);
ok(['old-sm', 'old-dup', 'old-lg'].every((id) => seeded.includes(id)),
  `#1581 SEED: the FIRST stamp on an unstamped collection claims every mode it already holds (${seeded.join(',')}) — otherwise a file damaged before #1581 becomes permanently un-prunable`);
legacy.modes.push({ modeId: 'hand-print', name: 'print' });
const afterSeed = stampOwnedModes(asColl(legacy), ['old-sm']);
ok(!afterSeed.includes('hand-print'),
  '#1581 SEED HAPPENS ONCE: a mode added after the collection is stamped is NOT claimed — the seed is a migration, not a rule');
ok(['old-sm', 'old-dup', 'old-lg'].every((id) => afterSeed.includes(id)),
  '#1581 …and the seeded ids survive that second stamp — append-only applies to them too');
/* eslint-enable @typescript-eslint/no-explicit-any */

console.log(`\nplugin FLOAT write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
