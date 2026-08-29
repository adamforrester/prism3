/**
 * Plugin write-adapter test (#108) — drives the REAL executor against an in-memory
 * `figma.variables` shim, so the whole three-pass materialisation is verified with no live Figma.
 *
 *   npx tsx apps/plugin/test-write.ts
 *
 * The shim implements the minimal `VariablesApi` port `applyWritePlan` depends on, modelling the
 * behaviour that matters for the contract: collections have modes (mode[0] renamable, addMode
 * appends), variables hold per-mode values, and an alias is a `{type:'VARIABLE_ALIAS', id}` that
 * resolves back to a target var. Then it runs the executor TWICE on the same file to prove
 * idempotency (find-by-name → update, not duplicate) and asserts the materialisation contract:
 * primitives hidden + scoped, colour modes distinct (the collapse-guard), every alias bound, zero
 * misses.
 *
 * Mirrors the engine suite's dependency-free `ok(...)` style; exits non-zero on any failure.
 */
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan } from '@prism3/engine/write-plan';
import { nbThemeFrom } from '@prism3/engine/theme';
import { applyWritePlan, orphansOf, beginMigration } from './src/write-figma';
import { deriveVariableRenames, isRefusal } from '@prism3/engine/rename-map';
import nbMeasured from '@prism3/engine/schema/nb-measured.json';

/**
 * The brand namespace every emitted variable carries (#1097) and the `core` tier the primitives sit under
 * (#1102), spelled HERE rather than imported. `nbThemeFrom(nbMeasured)` roots at `nbds`, and this file's
 * whole job is to check the executor against names it did not compute — a helper imported from the
 * emitter would agree with the emitter about the namespace by construction (`docs/34` shape 11).
 *
 * A pre-#1097 file's names are UN-rooted, and the seeded legacy names below stay that way on purpose:
 * that is what a designer's file holds, and reaching the rooted target from it is the migration under
 * test. So a name in this file is rooted iff it is something the engine WRITES.
 */
const NB_ROOT = 'nbds';
const nbVar = (tail: string): string => `${NB_ROOT}/${tail}`;

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the in-memory figma.variables shim ----------------------------------------------------
type Val = { r: number; g: number; b: number; a: number } | { type: 'VARIABLE_ALIAS'; id: string };
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
  constructor(public id: string, public name: string) {
    this.modes = [{ modeId: `${id}:m0`, name: 'Mode 1' }];
  }
  renameMode(modeId: string, name: string): void {
    const m = this.modes.find((x) => x.modeId === modeId);
    if (m) m.name = name;
  }
  addMode(name: string): string { const modeId = `${this.id}:m${++this.seq + 0}`; this.modes.push({ modeId, name }); return modeId; }
}
class VariablesShim {
  collections: ShimCollection[] = [];
  vars: ShimVar[] = [];
  private cseq = 0;
  private vseq = 0;
  async getLocalVariableCollectionsAsync(): Promise<ShimCollection[]> { return this.collections; }
  // Honor the type filter like the real API (`getLocalVariablesAsync('COLOR')` returns ONLY COLOR
  // vars) — so a wrong-filter regression can't hide behind an all-returning shim (#146 review).
  async getLocalVariablesAsync(type?: string): Promise<ShimVar[]> { return type ? this.vars.filter((v) => v.resolvedType === type) : this.vars; }
  createVariableCollection(name: string): ShimCollection {
    const c = new ShimCollection(`c${++this.cseq}`, name); this.collections.push(c); return c;
  }
  createVariable(name: string, collection: ShimCollection, t: 'COLOR' | 'FLOAT' = 'COLOR'): ShimVar {
    const v = new ShimVar(`v${++this.vseq}`, name, collection.id, t); this.vars.push(v); return v;
  }
  createVariableAlias(target: ShimVar): { type: 'VARIABLE_ALIAS'; id: string } {
    return { type: 'VARIABLE_ALIAS', id: target.id };
  }
}

// ---- drive it -----------------------------------------------------------------------------
const plan = buildWritePlan(buildFigmaColor(nbThemeFrom(nbMeasured)));
const shim = new VariablesShim();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const run = () => applyWritePlan(plan, shim as any);

const r1 = await run();
const varsAfterFirst = shim.vars.length;
const r2 = await run();

console.log('plugin write-adapter (#108) — executor against in-memory figma.variables shim\n');

// pass counts + idempotency
ok(r1.paletteCreated === plan.palette.length && r1.colorCreated === plan.color.create.length,
  `first run creates all vars (palette ${r1.paletteCreated}/${plan.palette.length}, color ${r1.colorCreated}/${plan.color.create.length})`);
ok(r2.paletteCreated === 0 && r2.colorCreated === 0,
  `second run creates 0 (idempotent find-by-name → update): palette +${r2.paletteCreated}, color +${r2.colorCreated}`);
ok(shim.vars.length === varsAfterFirst,
  `no duplicate vars across re-run (${shim.vars.length} total, stable)`);

// bindings + no misses
const expectedBound = plan.color.create.length * plan.color.modes.length;
ok(r1.bound === expectedBound && r2.bound === expectedBound,
  `every colour var aliased in every mode: ${r1.bound}/${expectedBound}`);
ok(r1.misses.length === 0 && r2.misses.length === 0,
  `zero unresolved bindings${r1.misses.length ? ' — ' + r1.misses.slice(0, 3).join(',') : ''}`);

// collections + modes
// `core`, not `core-palette` (#1097) — the three `core-*` collections consolidated into ONE, so this
// plan's palette half lands in the same collection the dimension and font plans write to.
// `color`, not `color.appearance` (#1148) — the value tier and the pointer tier collapsed into ONE
// collection, which keeps the value tier's four appearance modes and the pointer tier's short names.
const palCol = shim.collections.find((c) => c.name === 'core')!;
const colCol = shim.collections.find((c) => c.name === 'color')!;
ok(shim.collections.length === 2 && !!palCol && !!colCol, 'exactly two collections: core + color');
ok(colCol.modes.map((m) => m.name).join(',') === plan.color.modes.join(','),
  `color collection modes match the plan (${colCol.modes.map((m) => m.name).join('/')})`);

// primitives hidden + scoped
const palVars = shim.vars.filter((v) => v.variableCollectionId === palCol.id);
ok(palVars.length > 0 && palVars.every((v) => v.hiddenFromPublishing && v.scopes.length > 0),
  'every `core` palette primitive hidden from publishing + scoped');

// the collapse-guard: background/primary resolves to a DIFFERENT palette target per mode
const colVars = new Map(shim.vars.filter((v) => v.variableCollectionId === colCol.id).map((v) => [v.name, v]));
const byId = new Map(shim.vars.map((v) => [v.id, v]));
const bg = colVars.get(nbVar('color/background/primary'))!;
const bgTargets = colCol.modes.map((m) => {
  const val = bg.valuesByMode[m.modeId];
  return val && 'type' in val ? byId.get(val.id)?.name : undefined;
});
ok(!!bg && new Set(bgTargets).size > 1,
  `background/primary aliases a distinct palette step per mode (collapse-guard: ${bgTargets.join(' / ')})`);
ok(bgTargets.every((t) => typeof t === 'string' && t.startsWith(nbVar('core/palette/'))),
  'background/primary alias targets are `core` palette primitives (cross-collection resolution)');

// ---- #479: orphan REPORT — renames leave ghosts, and the write path cannot see them ------------
// Create-or-update-by-name is idempotent for adds/edits and structurally blind to a rename: the new
// name is created, the old one is never touched. So a file written before a rename still carries it.
// Both halves matter and are asserted separately — reported, AND still present afterwards. Testing
// only the report would pass on an implementation that deleted them, which is the outcome this lane
// deliberately does not ship. (Verified by mutation: simulating a prune lane fails the two
// "NOT deleted" assertions, so the restraint is enforced rather than merely intended.)

// The unit, first: the set difference itself, including the direction that must NOT flag.
ok(orphansOf(['a', 'b', 'c'], ['a', 'c']).join() === 'b', 'orphansOf: a name in the file but not the plan is an orphan');
ok(orphansOf(['a'], ['a', 'b']).length === 0, 'orphansOf: a name in the PLAN but not the file is NOT an orphan (that is a create)');
ok(orphansOf(['z', 'a'], []).join() === 'a,z', 'orphansOf: sorted, so two runs diff cleanly');

// Now end-to-end against a shim pre-seeded with the two ghost shapes the live drive actually found:
// a stale leaf at a path that is now a group, and a whole pre-rename palette family.
const ghostShim = new VariablesShim();
const ghostPal = ghostShim.createVariableCollection('core');
const ghostCol = ghostShim.createVariableCollection('color');
// The palette ghost is ROOTED (#1097) and the colour one is not, and the asymmetry is measured rather than
// stylistic. `upsertCollection` narrows `core` to the SLICE the calling plan owns (`coreGroupOf`), because
// three executors write into one collection now — so an un-rooted `palette/accent/550` is in no core group,
// is filtered out of `byName`, and is invisible to the orphan report AND to the migration pass. That hole is
// real and is **#1109**, not asserted here; what this arm is about is a stale leaf inside a slice the plan
// DOES own, which is the drift a designer actually accumulates.
ghostShim.createVariable(nbVar('core/palette/accent/550'), ghostPal);   // pre-rename palette generation
ghostShim.createVariable('color/appearance/interactive/primary/text', ghostCol);  // flat leaf, now a group
const ghostNames = [nbVar('core/palette/accent/550'), 'color/appearance/interactive/primary/text'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const gr = await applyWritePlan(plan, ghostShim as any);
const reported = gr.orphans.flatMap((o) => o.names);
for (const g of ghostNames) ok(reported.includes(g), `#479 orphan reported: ${g}`);
ok(gr.orphans.every((o) => typeof o.name === 'string'),
  '#479 orphans are reported per collection, so a reader can tell which collection drifted');

// The restraint half — nothing was destroyed.
const survivors = new Set(ghostShim.vars.map((v) => v.name));
for (const g of ghostNames) ok(survivors.has(g), `#479 orphan NOT deleted (report-only): ${g}`);

// And a clean file reports zero rather than reporting nothing — "checked, none" must be
// distinguishable from "never checked", or a silenced report reads exactly like a clean file.
const cleanShim = new VariablesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const first = await applyWritePlan(plan, cleanShim as any);
ok(first.orphans.length === 2 && first.orphans.every((o) => o.names.length === 0),
  '#479 a fresh file reports both collections with zero orphans (present-and-empty, not absent)');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const second = await applyWritePlan(plan, cleanShim as any);
ok(second.orphans.every((o) => o.names.length === 0),
  '#479 re-applying the SAME plan creates no orphans — idempotent, so the report has no false positives');

// ---- #1013: the RENAME MAP — the orphan report's other half, and the half that writes -------------
// `orphansOf` above proves the drift is visible. This proves it MOVES: a renamed variable is migrated in
// place, keeping its id and therefore every binding a designer made against it. The id is the whole
// mechanism — a binding stores the id, not the name — so every arm below checks the id, not just the name.
//
// The controlled comparison is the point. Every assertion here would also pass on a no-op that quietly
// migrated nothing, so the same seeded file is applied TWICE: once with no `Migration` (the pre-#1013
// behaviour) and once with one. The two must disagree, by count, or the mechanism is decoration.

// The real, shipped map — not a synthetic one — restricted to entries whose target this plan writes.
// `deriveVariableRenames()` rows are TAILS — they come from `DEPRECATIONS`, where nothing is
// brand-specific — and the plan's rows are rooted, so the two are compared through `nbVar` (#1097). The
// same asymmetry is why `seedSolo` seeds the tail: an un-rooted name is what a pre-#1097 file holds, and
// the composed migration is #1013's rule and then #1097's, landing on the rooted target in one move.
const realRenames = deriveVariableRenames().filter((r) => r.collection === 'color' && plan.color.create.some((c) => c.name === nbVar(r.to)));
ok(realRenames.length >= 100,
  `#1013 the shipped map reaches ${realRenames.length} live \`color\` entries (floor 100) — a derivation that produced none would satisfy every arm below vacuously`);

// FAN-IN IS IN THE SHIPPED MAP, and the two files below exist because of it. Historical paths really do
// point at one live path (a 3.0.0 entry and a 4.0.0 entry both landing on
// `color/inverse/interactive/<palette>/border/rest` — spelled
// `color/interactive/<palette>/inverse/border/rest` until #1140 moved the marker to the front, which
// changes the target's name and nothing about the fan-in), so "seed every source" and "seed a realistic file"
// are DIFFERENT files with different correct answers. Driven from the real map rather than a synthetic
// one, because the whole question is whether the map the engine actually ships is migratable.
//
// **#1148 GREW THIS, AND THE GROWTH IS THE POINT.** Collapsing the two colour collections into one dropped
// the `appearance/` segment from 243 names, so a deprecation whose historical tail differs only in a
// segment the collapse removed now lands on the same live name as its successor — three sources on one
// target in the largest groups. The floors below are floors, not counts, for the reason the header of
// `DEPRECATIONS` gives: a count here would have to move on every release that retires a name.
const byTarget = new Map<string, typeof realRenames>();
for (const r of realRenames) byTarget.set(r.to, [...(byTarget.get(r.to) ?? []), r]);
const fanIn = [...byTarget.values()].filter((g) => g.length > 1);
ok(fanIn.length >= 20,
  `#1013 the shipped map contains ${fanIn.length} fan-in groups (floor 20) — the ambiguity below is measured, not invented${fanIn.length ? `: ${fanIn[0][0].to} ←${fanIn[0].length}` : ''}`);

// A file as a real designer's would be: ONE pre-rename name per target. Every group's first source only.
const seedSolo = (): VariablesShim => {
  const s = new VariablesShim();
  const c = s.createVariableCollection('color');
  for (const g of byTarget.values()) s.createVariable(g[0].from, c);
  return s;
};
const soloCount = byTarget.size;

// (i) THE CONTROL — no Migration passed: today's behaviour, and the baseline the arms below must beat.
const ctrlShim = seedSolo();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const ctrl = await applyWritePlan(plan, ctrlShim as any);
const ctrlOrphans = ctrl.orphans.find((o) => o.name === 'color')!.names.length;
ok(ctrlOrphans === soloCount && ctrl.colorCreated === plan.color.create.length,
  `#1013 CONTROL (no migration): all ${ctrlOrphans} pre-rename names are orphans and all ${ctrl.colorCreated} planned names are created fresh — orphan-and-recreate, which is what the map exists to replace`);

// (ii) THE SAME FILE, MIGRATED.
const migShim = seedSolo();
const idBefore = new Map(migShim.vars.map((v) => [v.name, v.id]));
const varsBefore = migShim.vars.length;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const pass = await beginMigration(migShim as any);
ok(pass.refusals.length === 0,
  `#1013 the shipped map validates clean before any write${pass.refusals.length ? ` — ${pass.refusals[0]}` : ''}`);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const migRes = await applyWritePlan(plan, migShim as any, pass);

const migrated = pass.outcomes.filter((o) => o.status === 'migrated');
ok(migrated.length === soloCount,
  `#1013 every live entry migrated (${migrated.length}/${soloCount})`);
// THE MECHANISM: same variable, new name. A rename that recreated the variable would pass a name check
// and lose every binding — the id is the only thing that distinguishes the two.
const idKept = [...byTarget.values()].filter((g) => {
  const v = migShim.vars.find((x) => x.name === nbVar(g[0].to));   // rooted target, un-rooted source (#1097)
  return v && v.id === idBefore.get(g[0].from);
});
ok(idKept.length === soloCount,
  `#1013 every migration KEPT THE VARIABLE ID (${idKept.length}/${soloCount}) — the binding stores the id, so this is the difference between migrating a token and replacing it`);
// The create loop must ADOPT the migrated variable rather than create a second one beside it. This is the
// arm that fails if the rename lands after `byName` is read, and it cannot be satisfied by a no-op.
ok(migRes.colorCreated === ctrl.colorCreated - soloCount,
  `#1013 each migration saved a create (${migRes.colorCreated} vs the control's ${ctrl.colorCreated}, ${soloCount} migrated) — the executor updates the renamed variable instead of creating its new name alongside it`);
ok(migShim.vars.length === ctrlShim.vars.length - soloCount,
  `#1013 and the file is SMALLER than the control by exactly the migrated count (${migShim.vars.length} vs ${ctrlShim.vars.length}) — no duplicate carrying the old name`);
ok(migShim.vars.length >= varsBefore,
  `#1013 nothing was deleted (${varsBefore} seeded → ${migShim.vars.length} present) — migration is the non-destructive half of #479, and must stay that way`);
// The orphan report and the rename report are disjoint by construction: the snapshot is taken after the
// migration, so a migrated name is no longer counted as drift. Double-reporting would make the summary
// tell a designer both that a token moved and that it went missing.
ok(migRes.orphans.find((o) => o.name === 'color')!.names.length === 0,
  '#1013 a migrated variable is NOT also reported as an orphan — the two reports partition the drift, they do not overlap');
// THE UNIT OF REPORT IS THE TARGET, not the map entry — and this arm is what pins that, because the
// two counts differ: 40 live entries collapse to 37 targets. A migrated group names the source that
// actually moved and stays silent about the fan-in siblings that were absent, which is the honest
// summary: naming them would tell a designer a token went missing when nothing of theirs did.
// `kind === 'variable'`, and the filter is not incidental: since #1035 the SAME list also carries the
// collection outcomes from the pre-pass, so an unfiltered count here would move whenever
// `COLLECTION_RENAMES` gained an entry and say nothing about the variable pairing it is pinning.
const varOutcomes = pass.outcomes.filter((o) => o.kind === 'variable');
ok(varOutcomes.length === soloCount && varOutcomes.every((o) => o.collection === 'color'),
  `#1013 one outcome per TARGET considered (${varOutcomes.length} for ${soloCount} targets across ${realRenames.length} entries) — no entry is silently dropped and none is double-counted`);

// (ii-c) THE FRESH FILE — the normal case, and the one that must not read as a clean skip. None of the
// old names are present, so every target is checked and reported `source-absent`: a caller can tell
// "checked, nothing to do" from "never checked", and the write is byte-for-byte the control's.
const freshShim = new VariablesShim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const freshPass = await beginMigration(freshShim as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const freshRes = await applyWritePlan(plan, freshShim as any, freshPass);
const freshVarOutcomes = freshPass.outcomes.filter((o) => o.kind === 'variable');
ok(freshVarOutcomes.length === realRenames.length && freshPass.outcomes.every((o) => o.status === 'source-absent'),
  `#1013 a file holding none of the old names reports every one of the ${freshVarOutcomes.length} entries as \`source-absent\` — checked and nothing to do, which is not the same as never checked`);
// The two counts differ ON PURPOSE, and this is the arm that says so out loud: with nothing live, all 40
// historical names are named, because any of them could be what a designer is holding; with one live per
// target, the 37 that moved are named and their absent siblings are not.
ok(freshVarOutcomes.length > varOutcomes.length,
  `#1013 and an absent group names EVERY historical alternative (${freshVarOutcomes.length}) where a migrated one names only what moved (${varOutcomes.length}) — the report follows the file, not the map's row count`);
ok(freshRes.colorCreated === ctrl.colorCreated && freshPass.outcomes.every((o) => !isRefusal(o.status)),
  `#1013 and the fresh file is written exactly as it is without the map (${freshRes.colorCreated} created, no refusals) — the migration pass is a no-op on a file it has nothing to say about`);

// (ii-b) THE FAN-IN FILE — both historical names present. Neither may move: the bindings on each point at
// a different variable, and promoting one would silently discard the other. The FILE is the disambiguator,
// so with one source live (above) it migrates and with two it refuses — no authored preference either way.
const fanShim = seedSolo();
const fanCol = fanShim.collections.find((c) => c.name === 'color')!;
for (const g of fanIn) for (const r of g.slice(1)) fanShim.createVariable(r.from, fanCol);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const fanPass = await beginMigration(fanShim as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const fanRes = await applyWritePlan(plan, fanShim as any, fanPass);
const ambiguous = fanPass.outcomes.filter((o) => o.status === 'ambiguous-source');
ok(ambiguous.length === fanIn.flat().length,
  `#1013 fan-in with BOTH sources live → ambiguous-source for every entry in the group (${ambiguous.length}/${fanIn.flat().length}), migrating neither`);
ok(fanIn.every((g) => g.every((r) => fanShim.vars.some((v) => v.name === r.from))),
  '#1013 and both sources are LEFT ALONE — a refused migration writes nothing, so the designer keeps whichever bindings they have');
ok(fanPass.outcomes.filter((o) => o.status === 'migrated').length === soloCount - fanIn.length,
  `#1013 the ${soloCount - fanIn.length} unambiguous entries migrate anyway — a refusal is per-group, not per-pass`);
ok(fanRes.orphans.find((o) => o.name === 'color')!.names.length === fanIn.flat().length,
  '#1013 and the refused sources fall through to the ORPHAN report, so nothing goes unmentioned in either direction');

// (iii) THE COLLECTION RENAME — one write, every child id intact. Driven with a synthetic entry rather
// than the shipped map, deliberately: since #1148 the shipped map is a SINGLE entry, so driving this arm
// off it would make "one collection named X, and it is the original" indistinguishable from the (v) block
// below, and there would be no arm left isolating the single-entry mechanism from the map that happens to
// hold exactly one.
const crShim = new VariablesShim();
const legacy = crShim.createVariableCollection('legacy-color');
const child = crShim.createVariable('color/text/primary', legacy);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
// NO MATERIALIZATION RULES (`[]`), so this arm measures the collection mechanism ALONE. With the shipped
// rules in scope #1097's would also fire on the child — the collection is now `color`, the child's name is
// un-rooted, so it would legitimately be renamed as well — and "the child kept its name" would fail for a
// reason that has nothing to do with what a collection rename does. The variable half in the same file is
// (vii) below, driven on the shipped rules.
const crPass = await beginMigration(crShim as any, { collections: [{ from: 'legacy-color', to: 'color', since: '9.9.9' }], variables: [] }, []);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const crRes = await applyWritePlan(plan, crShim as any, crPass);
ok(crPass.outcomes.some((o) => o.kind === 'collection' && o.status === 'migrated'),
  '#1013 collection rename: reported as a collection-kind migration, distinct from the ~200 variable renames it is not');
ok(crShim.collections.filter((c) => c.name === 'color').length === 1 && crShim.collections.find((c) => c.name === 'color')!.id === legacy.id,
  '#1013 collection rename: ONE collection named `color`, and it is the original — the rename ran BEFORE find-by-name, so no empty duplicate was created beside it');
ok(child.variableCollectionId === legacy.id && crShim.vars.some((v) => v.id === child.id && v.name === 'color/text/primary'),
  '#1013 collection rename: the child variable kept its id, its name and its parent — a collection rename is ONE write, not 200');
ok(crRes.misses.length === 0, '#1013 collection rename: the write itself is unaffected');

// (v) #1148 — THE SHIPPED MAP, ON A 0.29.0 FILE. This is the migration the owner will run: a file written
// before the collapse carries `color.appearance` (the value tier, four appearance modes, 243 rows) and
// `color.surface` (the pointer tier, one `Default` mode, 130 rows aliased into the first). The value tier
// must end up as `color` with its id — and therefore every binding a designer made — intact.
//
// **AND THE POINTER TIER MUST STILL BE THERE AFTERWARDS, WHICH IS NOT A PASSING DETAIL.** The map has one
// entry, for the value tier only, because two sources onto one target is refused statically by
// `validateRenameMap` and underneath that Figma has no operation to perform at all:
// `Variable.variableCollectionId` is `readonly` (`@figma/plugin-typings/plugin-api.d.ts:11454`), so a
// variable cannot be re-parented and a fan-in is not a rename. So `color.surface` is left in the designer's
// file, holding 130 variables and every binding made against them, in a collection the engine will never
// write again — reported by nothing, because each executor only walks the collection it wrote. That is
// #1148's accepted consequence, filed as its own issue, and asserted BY ID below so a green suite records
// the orphan rather than implying it was handled.
//
// **This block used to be about ORDER, and since #1097 it is not.** The map's entries were once a chain
// (`color → color.appearance` alongside `surface → color`), so the value tier had to vacate the short name
// before the alias tier could take it. #1097 retargeted the second entry, #1148 removed it, and one entry
// cannot be a chain. The ordering guarantee itself is unchanged and still needs a failing arm, so it is
// exercised on an AUTHORED chain immediately below rather than on the shipped map. Pointing an ordering arm
// at data that no longer contains the shape is `docs/34`'s borrowed-backstop: it passes, and it proves
// nothing.
const chainShim = new VariablesShim();
const oldValue = chainShim.createVariableCollection('color.appearance');
const oldAlias = chainShim.createVariableCollection('color.surface');
const valueChild = chainShim.createVariable(nbVar('color/appearance/background/primary'), oldValue);
const aliasChild = chainShim.createVariable(nbVar('color/background/primary'), oldAlias);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const chainPass = await beginMigration(chainShim as any);
const chainCols = chainPass.outcomes.filter((o) => o.kind === 'collection');
ok(chainCols.length === 1 && chainCols.every((o) => o.status === 'migrated'),
  `#1148 the shipped map's one entry migrates the VALUE tier on a 0.29.0 file (${chainCols.map((o) => `${o.from}→${o.to}:${o.status}`).join(' ')})`);
ok(chainShim.collections.find((c) => c.name === 'color')?.id === oldValue.id,
  '#1148 the value tier is now `color` and it is the ORIGINAL `color.appearance` collection, by id — its variables and their bindings came with it');
ok(chainShim.collections.find((c) => c.name === 'color.surface')?.id === oldAlias.id
  && chainShim.vars.some((v) => v.id === aliasChild.id && v.variableCollectionId === oldAlias.id),
  '#1148 and `color.surface` is STILL THERE, by id, with its variables — the accepted orphan: a readonly `variableCollectionId` admits no re-parent, so the pointer tier cannot be folded in and is left rather than emptied');
ok(chainShim.collections.length === 2
  && !chainShim.collections.some((c) => c.name === 'color.appearance'),
  `#1148 exactly two collections afterwards, with the pre-collapse value-tier name gone (${chainShim.collections.map((c) => c.name).join(', ')}) — a stale rename target leaves the original in place AND a fresh collection beside it, which is exactly how #1108 happened`);
ok(valueChild.variableCollectionId === oldValue.id && aliasChild.variableCollectionId === oldAlias.id,
  '#1148 every child stayed in its own collection — a collection rename touches the collection, never its variables');

// AND THE ORDERING GUARANTEE, THROUGH THE EXECUTOR, ON AN AUTHORED CHAIN. `beginMigration` is given the
// map the engine shipped between #1013 and #1097, in BOTH array orders. Written out here rather than
// imported: it is no longer live data, and the point of the arm is that array order cannot reach the
// result. Without the topological sort, `surface → color` lands first, the short name is occupied when
// the value tier reaches for it, and one of the two is refused.
const CHAIN_MAP = [
  { from: 'color', to: 'color.appearance', since: '0.26.0' },
  { from: 'surface', to: 'color', since: '0.26.0' },
];
for (const order of [CHAIN_MAP, [...CHAIN_MAP].reverse()]) {
  const ordShim = new VariablesShim();
  const ordValue = ordShim.createVariableCollection('color');
  const ordAlias = ordShim.createVariableCollection('surface');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
  const ordPass = await beginMigration(ordShim as any, { collections: order, variables: [] }, []);
  const label = order.map((c) => c.from).join(',');
  ok(ordPass.refusals.length === 0
    && ordShim.collections.find((c) => c.name === 'color.appearance')?.id === ordValue.id
    && ordShim.collections.find((c) => c.name === 'color')?.id === ordAlias.id,
    `#1035 an authored CHAIN migrates completely through the executor with the array written [${label}] — the order is computed from the dependencies, so both spellings of the same map give the same file${ordPass.refusals.length ? ` (REFUSED: ${ordPass.refusals[0]})` : ''}`);
}

// AND THE ALREADY-MIGRATED FILE MUST NOT REFUSE. Re-running on the file above is the second-apply case a
// designer hits by pressing the button twice, and it is the one the pre-#1013 target-first ordering got
// permanently wrong: `color` is present precisely BECAUSE the rename already happened, so a check that
// looks at the target first reads its own success as a collision, for good.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const againPass = await beginMigration(chainShim as any);
ok(againPass.refusals.length === 0 && againPass.outcomes.filter((o) => o.kind === 'collection').every((o) => o.status === 'source-absent'),
  `#1148 re-running on the migrated file refuses NOTHING — every entry reports source-absent (${againPass.outcomes.filter((o) => o.kind === 'collection').map((o) => o.status).join(', ')})`);

// (vi) #1035 ATOMICITY — a refusal anywhere applies NOTHING, including the entries that would have
// succeeded. Synthetic, because the shipped map cannot reach this state: to distinguish an atomic pre-pass
// from one that applies outcomes as it walks them, an entry that PLANS `migrated` has to sit before one that
// refuses, and since #1148 the map holds a single entry, so it has no "before". Both targets are spelled
// `zz-*` on purpose: nothing renames INTO a retired name any more, and reusing one here would read as an
// era rather than as a fixture. So the shape is stated directly: `legacy-a → zz-clean` plans clean, then
// `legacy-b → zz-taken` hits an occupied target.
const atomShim = new VariablesShim();
const atomA = atomShim.createVariableCollection('legacy-a');
atomShim.createVariableCollection('legacy-b');
atomShim.createVariableCollection('zz-taken');   // occupies the second entry's target
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const atomPass = await beginMigration(atomShim as any, {
  collections: [
    { from: 'legacy-a', to: 'zz-clean', since: '9.9.9' },
    { from: 'legacy-b', to: 'zz-taken', since: '9.9.9' },
  ],
  variables: [{ collection: 'zz-clean', from: 'color/x', to: 'color/y', since: '9.9.9' }],
});
ok(atomPass.refusals.length === 1 && atomPass.refusals[0].includes('target-occupied'),
  `#1035 the refusal is reported by name${atomPass.refusals.length ? ` — ${atomPass.refusals[0]}` : ' — NOTHING was refused'}`);
ok(atomPass.outcomes.filter((o) => o.kind === 'collection').length === 2,
  '#1035 and BOTH entries are still reported, refused and clean alike — "checked, refused" must be distinguishable from "never checked"');
// THE ARM THAT PINS ATOMICITY: `legacy-a → zz-clean` planned `migrated`, and must not have run.
ok(atomShim.collections.find((c) => c.name === 'legacy-a')?.id === atomA.id && !atomShim.collections.some((c) => c.name === 'zz-clean'),
  '#1035 the entry that PLANNED CLEAN was not applied — refused, not half-applied. An implementation that renamed as it walked would have moved this one before meeting the refusal');
ok(atomPass.map.collections.length === 0 && atomPass.map.variables.length === 0,
  '#1035 and the VARIABLE half is neutered too — variable rows are keyed by the collection\'s NEW name, so running them against a collection that did not move would orphan the very variables they exist to migrate');

// (iv) A WRONG MAP IS INERT, AND SAYS SO. Three ways it can be wrong, three reported outcomes, no writes.
const badShim0 = seedSolo();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const badPass = await beginMigration(badShim0 as any, { collections: [], variables: [{ collection: 'color', from: 'color/x', to: 'color/x', since: '9.9.9' }] });
ok(badPass.refusals.length > 0 && badPass.map.variables.length === 0,
  `#1013 a statically-invalid map is REFUSED and emptied before any write${badPass.refusals.length ? ` — ${badPass.refusals[0]}` : ' — NOTHING was refused'}`);
const badShim = badShim0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const badRes = await applyWritePlan(plan, badShim as any, badPass);
ok(badRes.misses.length === 0 && badRes.orphans.find((o) => o.name === 'color')!.names.length === soloCount,
  '#1013 an invalid map abandons the RENAME PASS ONLY — the write completes and degrades to orphan-and-recreate, which is a known state rather than a new one');

// `target-occupied`: both names present. Migrating would merge two variables and silently drop one side.
const occShim = seedSolo();
const occCol = occShim.collections.find((c) => c.name === 'color')!;
const occFirst = [...byTarget.values()][0][0];
occShim.createVariable(nbVar(occFirst.to), occCol);   // the TARGET is rooted (#1097); the seeded source is not
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const occPass = await beginMigration(occShim as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyWritePlan(plan, occShim as any, occPass);
const occ = occPass.outcomes.find((o) => o.from === occFirst.from)!;
ok(occ.status === 'target-occupied' && occShim.vars.some((v) => v.name === occFirst.from),
  `#1013 both names present → target-occupied, and the source is LEFT ALONE (got ${occ.status}) — a merge would lose the bindings on one of them, and there is no answer to which`);
ok(occPass.outcomes.filter((o) => o.status === 'migrated').length === soloCount - 1,
  '#1013 and one refusal does not abort the other migrations — a per-entry outcome, not a per-pass one');

// `target-not-planned`: the precondition that makes a fat-fingered entry harmless. A live variable must
// never be renamed to a name the engine has stopped emitting — that would manufacture an orphan out of a
// healthy variable, the one outcome strictly worse than doing nothing.
const npShim = new VariablesShim();
const npCol = npShim.createVariableCollection('color');
const ghost = npShim.createVariable('color/legacy/thing', npCol);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const npPass = await beginMigration(npShim as any, { collections: [], variables: [{ collection: 'color', from: 'color/legacy/thing', to: 'color/not/in/any/plan', since: '9.9.9' }] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyWritePlan(plan, npShim as any, npPass);
ok(npPass.outcomes.some((o) => o.status === 'target-not-planned') && ghost.name === 'color/legacy/thing',
  '#1013 a target the plan does not write → target-not-planned, and the variable is untouched — a wrong map is inert, not destructive');

// (vii) #1148 THE VARIABLE HALF, END TO END — the half the collection pre-pass is worse than useless
// without. (v) proves the value-tier collection changes name and keeps its id; on its own that makes a file
// WORSE than leaving it alone, because `upsertCollection` then finds `color` holding 243 variables still
// spelled `<root>/color/appearance/*` — none of which the plan asks for — and creates 243 more beside them.
// 486 variables, half of them orphans carrying every binding the designer made. That is exactly the
// "orphaned migration" this lane asks the owner to look for in a real file, so here the COUNT is the
// assertion.
//
// ── ONE EXECUTOR NOW, AND THE PAIR IS GONE RATHER THAN UNTESTED (#1148) ───────────────────────────
//
// This block used to run BOTH executors in the order `main.ts` ran them — `applyWritePlan` for the value
// tier and `applySurfacePlan` for the pointer tier — because the two tiers migrated under different rules
// in different collections and only the pair was the migration a designer experienced. #1148 collapsed the
// tiers, so `buildSurfaceWritePlan` and `applySurfacePlan` are DELETED, not merely unused: with one
// collection there is no cross-collection pointer to keep alive. What remains is one executor and one
// migration, and the pointer tier's fate is the ORPHAN arm below rather than a second write.
const swapShim = new VariablesShim();
const swapValue = swapShim.createVariableCollection('color.appearance');   // 0.29.0: the VALUE tier
const swapAlias = swapShim.createVariableCollection('color.surface');      // 0.29.0: the POINTER tier
const swapValueChild = swapShim.createVariable(nbVar('color/appearance/background/primary'), swapValue);
const swapAliasChild = swapShim.createVariable(nbVar('color/background/primary'), swapAlias);
// The four names above are hand-typed 0.29.0 spellings and must stay that way (`docs/34` shape 6 —
// deriving them by inverting the current emission would make the arm agree with whatever the emission
// happens to do). What CAN be anchored is the other end: if the emission ever stops writing this target,
// this arm has to fail HERE, by name, rather than quietly decay into a `target-not-planned` outcome that
// reads like a considered refusal.
ok(plan.color.create.some((r) => r.name === nbVar('color/background/primary')),
  '#1148 the post-collapse name this arm migrates INTO is a name the plan really writes — anchored to the emission at its target end, hand-typed at its source end');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const swapPass = await beginMigration(swapShim as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const swapRes = await applyWritePlan(plan, swapShim as any, swapPass);
const swapValueCol = swapShim.collections.find((c) => c.name === 'color')!;
const swapAliasCol = swapShim.collections.find((c) => c.name === 'color.surface')!;
const inValue = swapShim.vars.filter((v) => v.variableCollectionId === swapValueCol.id);
const inAlias = swapShim.vars.filter((v) => v.variableCollectionId === swapAliasCol.id);

// ── THE ORPHANED POINTER TIER, MEASURED — because the count arm above cannot see it ────────────────
//
// #1108's shape, arriving from a new direction and this time deliberately. A collection that no executor
// walks contributes to no orphan report and to no count: `swapRes.orphans` covers `core` and `color`, and
// `color.surface` is in neither. So the only thing that can record it is an arm naming it, and this is
// that arm — its variable still there, still in the designer's original collection, still spelled the way
// they left it, with every binding they made against it intact and now pointing at a variable the engine
// will never write again.
//
// This is a **refuse-or-report** outcome rather than corruption, and the distinction is why it ships: the
// designer's bindings keep resolving, to values frozen at 0.29.0, until they repoint them. Filed as its own
// issue so the fix (a report naming collections the plan does not own) is discoverable as work. What is NOT
// acceptable and is asserted here is silence with a green suite.
ok(swapValueChild.name === nbVar('color/background/primary') && swapValueChild.variableCollectionId === swapValue.id,
  `#1148 the value-tier variable was RENAMED IN PLACE — same id, new name (${swapValueChild.name}) — so every binding a designer made against it still resolves, and it now carries the short name the pointer tier used to hold`);
ok(swapAliasChild.name === nbVar('color/background/primary') && swapAliasChild.variableCollectionId === swapAlias.id
  && swapAliasChild.id !== swapValueChild.id,
  `#1148 while the POINTER tier's variable is untouched in an orphaned collection (${swapAliasCol.name}) — the same name now exists twice, in two collections, and only one of them is written again. A readonly \`variableCollectionId\` is why: the row cannot be folded in, so it is left`);
// THE COUNT IS THE ARM. Migrated: 243. Orphaned-and-recreated: 244, with the extra one holding the live
// bindings and no plan row left to keep it alive.
ok(inValue.length === plan.color.create.length && inAlias.length === 1,
  `#1148 exactly ${plan.color.create.length} variables in \`color\` afterwards (got ${inValue.length}), and the pointer tier's ${inAlias.length} left where it was — a collection pre-pass with no variable half leaves ONE MORE in \`color\`: the designer's original, orphaned beside a fresh create`);
// AND THE PRE-COLLAPSE VALUE-TIER NAME DOES NOT SURVIVE, which is the arm that would have caught #1108's
// stranding on its own. A rename target that has drifted behind a plan's collection name leaves the
// designer's collection AND a fresh one — and every count above still passes, because the fresh collection
// holds exactly the planned rows. `core` is here legitimately: `applyWritePlan` writes the palette
// primitives too, so the count is not the check. The check is that nothing is still called
// `color.appearance`, and that `color` is the designer's original by id.
ok(!swapShim.collections.some((c) => c.name === 'color.appearance') && swapValueCol.id === swapValue.id,
  `#1148 the designer's value-tier collection was renamed IN PLACE, by id, and no pre-collapse name is left behind (${swapShim.collections.map((c) => c.name).join(', ')}) — a leftover \`color.appearance\` beside a fresh \`color\` is the stranding, and every count in this block passes through it`);
ok(swapRes.orphans.every((o) => o.names.length === 0)
  && !swapRes.orphans.some((o) => o.name === swapAliasCol.name),
  `#1148 the executor reports no orphan in the collections it wrote (${swapRes.orphans.map((o) => `${o.name}:${o.names.length}`).join(', ')}) — and does not report \`color.surface\` AT ALL, which is the gap the arm above exists to name rather than to leave to a count`);
const swapMoved = swapPass.outcomes.filter((o) => o.kind === 'variable' && o.status === 'migrated');
ok(swapMoved.length === 1
  && swapMoved[0].from === nbVar('color/appearance/background/primary')
  && swapMoved[0].to === nbVar('color/background/primary'),
  `#1148 the move is REPORTED by name (${swapMoved.map((o) => `${o.from}→${o.to}`).join(', ')}) — and only that one, so a rule that over-reached into the orphaned collection would show up as a second`);
ok(swapRes.misses.length === 0,
  '#1148 and the write itself is unaffected — zero unresolved bindings');

// AND A COLLECTION REFUSAL MUST DISARM THE RULES, not only the rows. Synthetic, and deliberately so:
// neither SHIPPED rule can reach this state. `color-one-collection-1148`'s domain names the POST-rename
// collection (`color`), and a refused pre-pass means that name holds either nothing or already-migrated
// content; `namespace-and-core-tier-1097`'s domain names no collection at all, so it is indifferent to
// whether the pre-pass ran. Either way the shipped pair is inert under a refusal by accident of its own
// domains rather than by construction. The invariant is what the NEXT rule inherits, so it is stated
// with a rule whose domain survives the refusal.
const ghostRule = [{
  id: 'synthetic-disarm', since: '9.9.9',
  domain: (c: string, n: string) => c === 'color' && n === 'color/ghost',
  map: () => nbVar('color/text/primary'),
}];
const disarmShim = new VariablesShim();
disarmShim.createVariableCollection('legacy-x');
const disarmTarget = disarmShim.createVariableCollection('color');  // occupies the entry's target
const disarmGhost = disarmShim.createVariable('color/ghost', disarmTarget);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const disarmPass = await beginMigration(disarmShim as any, { collections: [{ from: 'legacy-x', to: 'color', since: '9.9.9' }], variables: [] }, ghostRule);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyWritePlan(plan, disarmShim as any, disarmPass);
ok(disarmPass.refusals.length === 1 && disarmPass.refusals[0].includes('target-occupied'),
  `#1013 the collection entry is refused by name${disarmPass.refusals.length ? ` — ${disarmPass.refusals[0]}` : ' — NOTHING was refused'}`);
ok(disarmGhost.name === 'color/ghost',
  '#1013 a refused collection pre-pass disarms the RULES as well as the rows — a rule keyed to `color` would otherwise rename variables inside a collection that never moved, which is the orphaning the rules exist to prevent');
// THE PAIRED POSITIVE, because a negative arm on its own cannot tell "disarmed" from "the rule never
// matched here anyway" — the false pass the collapsed-`background/primary` arm was sitting on until its
// twin went red. Same shim shape, same rule, nothing refused: the ghost MUST move.
const armedShim = new VariablesShim();
const armedTarget = armedShim.createVariableCollection('color');
const armedGhost = armedShim.createVariable('color/ghost', armedTarget);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const armedPass = await beginMigration(armedShim as any, { collections: [], variables: [] }, ghostRule);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyWritePlan(plan, armedShim as any, armedPass);
ok(armedPass.refusals.length === 0 && armedGhost.name === nbVar('color/text/primary'),
  `#1013 and with nothing refused the very same rule DOES move it (${armedGhost.name}) — so the arm above measures the disarming, not a rule that was never going to fire`);

// (viii) #1056 THE HALF-MIGRATED FILE — a run interrupted, or a designer who renamed one variable by
// hand. One `color` collection holds BOTH spellings of the same token, and the rule's target is therefore
// occupied by a live variable with its own bindings. Neither may move: promoting the old name would
// merge two variables and silently drop one side's bindings, and there is no answer to which side.
// This is left to `planVariableRenames` rather than pre-empted in the rule — the rule states the
// transformation, the planner states what the FILE allows.
const halfShim = new VariablesShim();
const halfCol = halfShim.createVariableCollection('color');
// BOTH spellings are ROOTED, and post-#1148 that is what a half-migrated file actually holds: the pair the
// collapse renames between is `<root>/color/appearance/background/primary` → `<root>/color/background/primary`,
// so a designer who hand-renamed one row leaves both live in the same collection. This drives the arm on the
// SHIPPED `color-one-collection-1148` rule rather than on the un-rooted `-1097` hop, which is the rule of
// the era whose refusals a designer meets this release.
const halfOld = halfShim.createVariable(nbVar('color/appearance/background/primary'), halfCol);
const halfNew = halfShim.createVariable(nbVar('color/background/primary'), halfCol);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const halfPass = await beginMigration(halfShim as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const halfRes = await applyWritePlan(plan, halfShim as any, halfPass);
const halfOutcome = halfPass.outcomes.find((o) => o.kind === 'variable' && o.from === nbVar('color/appearance/background/primary'));
ok(halfOutcome?.status === 'target-occupied',
  `#1056 both spellings live → target-occupied, reported by name (got ${halfOutcome?.status ?? 'NO OUTCOME AT ALL'})`);
ok(halfOld.name === nbVar('color/appearance/background/primary') && halfNew.name === nbVar('color/background/primary')
  && halfShim.vars.filter((v) => v.name === nbVar('color/background/primary')).length === 1,
  '#1056 and NEITHER moved — one variable with the new name, still the original, and the old one left exactly as the designer left it');
ok(halfRes.orphans.find((o) => o.name === 'color')!.names.includes(nbVar('color/appearance/background/primary')),
  '#1056 the un-migratable name falls through to the ORPHAN report, so a refusal here is still something the designer is told about');

console.log(`\nplugin write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
