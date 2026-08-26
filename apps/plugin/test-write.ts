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
import { buildWritePlan, buildSurfaceWritePlan } from '@prism3/engine/write-plan';
import { nbThemeFrom } from '@prism3/engine/theme';
import { applyWritePlan, applySurfacePlan, orphansOf, beginMigration } from './src/write-figma';
import { deriveVariableRenames, isRefusal } from '@prism3/engine/rename-map';
import nbMeasured from '@prism3/engine/schema/nb-measured.json';

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
const palCol = shim.collections.find((c) => c.name === 'core-palette')!;
const colCol = shim.collections.find((c) => c.name === 'color.appearance')!;
ok(shim.collections.length === 2 && !!palCol && !!colCol, 'exactly two collections: core-palette + color.appearance');
ok(colCol.modes.map((m) => m.name).join(',') === plan.color.modes.join(','),
  `color.appearance collection modes match the plan (${colCol.modes.map((m) => m.name).join('/')})`);

// primitives hidden + scoped
const palVars = shim.vars.filter((v) => v.variableCollectionId === palCol.id);
ok(palVars.length > 0 && palVars.every((v) => v.hiddenFromPublishing && v.scopes.length > 0),
  'every core-palette primitive hidden from publishing + scoped');

// the collapse-guard: background/primary resolves to a DIFFERENT palette target per mode
const colVars = new Map(shim.vars.filter((v) => v.variableCollectionId === colCol.id).map((v) => [v.name, v]));
const byId = new Map(shim.vars.map((v) => [v.id, v]));
const bg = colVars.get('color/appearance/background/primary')!;
const bgTargets = colCol.modes.map((m) => {
  const val = bg.valuesByMode[m.modeId];
  return val && 'type' in val ? byId.get(val.id)?.name : undefined;
});
ok(!!bg && new Set(bgTargets).size > 1,
  `background/primary aliases a distinct palette step per mode (collapse-guard: ${bgTargets.join(' / ')})`);
ok(bgTargets.every((t) => typeof t === 'string' && t.startsWith('palette/')),
  'background/primary alias targets are palette primitives (cross-collection resolution)');

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
const ghostPal = ghostShim.createVariableCollection('core-palette');
const ghostCol = ghostShim.createVariableCollection('color.appearance');
ghostShim.createVariable('palette/accent/550', ghostPal);              // pre-rename palette generation
ghostShim.createVariable('color/appearance/interactive/primary/text', ghostCol);  // flat leaf, now a group
const ghostNames = ['palette/accent/550', 'color/appearance/interactive/primary/text'];

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
const realRenames = deriveVariableRenames().filter((r) => r.collection === 'color.appearance' && plan.color.create.some((c) => c.name === r.to));
ok(realRenames.length >= 40,
  `#1013 the shipped map reaches ${realRenames.length} live \`color.appearance\` entries (floor 40) — a derivation that produced none would satisfy every arm below vacuously`);

// FAN-IN IS IN THE SHIPPED MAP, and the two files below exist because of it. Two historical paths really
// do point at one live path (a 3.0.0 entry and a 4.0.0 entry both landing on
// `color/interactive/<palette>/inverse/border/rest`), so "seed every source" and "seed a realistic file"
// are DIFFERENT files with different correct answers. Driven from the real map rather than a synthetic
// one, because the whole question is whether the map the engine actually ships is migratable.
const byTarget = new Map<string, typeof realRenames>();
for (const r of realRenames) byTarget.set(r.to, [...(byTarget.get(r.to) ?? []), r]);
const fanIn = [...byTarget.values()].filter((g) => g.length > 1);
ok(fanIn.length >= 3,
  `#1013 the shipped map contains ${fanIn.length} fan-in groups (floor 3) — the ambiguity below is measured, not invented${fanIn.length ? `: ${fanIn[0][0].to} ←${fanIn[0].length}` : ''}`);

// A file as a real designer's would be: ONE pre-rename name per target. Every group's first source only.
const seedSolo = (): VariablesShim => {
  const s = new VariablesShim();
  const c = s.createVariableCollection('color.appearance');
  for (const g of byTarget.values()) s.createVariable(g[0].from, c);
  return s;
};
const soloCount = byTarget.size;

// (i) THE CONTROL — no Migration passed: today's behaviour, and the baseline the arms below must beat.
const ctrlShim = seedSolo();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const ctrl = await applyWritePlan(plan, ctrlShim as any);
const ctrlOrphans = ctrl.orphans.find((o) => o.name === 'color.appearance')!.names.length;
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
  const v = migShim.vars.find((x) => x.name === g[0].to);
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
ok(migRes.orphans.find((o) => o.name === 'color.appearance')!.names.length === 0,
  '#1013 a migrated variable is NOT also reported as an orphan — the two reports partition the drift, they do not overlap');
// THE UNIT OF REPORT IS THE TARGET, not the map entry — and this arm is what pins that, because the
// two counts differ: 40 live entries collapse to 37 targets. A migrated group names the source that
// actually moved and stays silent about the fan-in siblings that were absent, which is the honest
// summary: naming them would tell a designer a token went missing when nothing of theirs did.
// `kind === 'variable'`, and the filter is not incidental: since #1035 the SAME list also carries the
// collection outcomes from the pre-pass, so an unfiltered count here would move whenever
// `COLLECTION_RENAMES` gained an entry and say nothing about the variable pairing it is pinning.
const varOutcomes = pass.outcomes.filter((o) => o.kind === 'variable');
ok(varOutcomes.length === soloCount && varOutcomes.every((o) => o.collection === 'color.appearance'),
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
const fanCol = fanShim.collections.find((c) => c.name === 'color.appearance')!;
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
ok(fanRes.orphans.find((o) => o.name === 'color.appearance')!.names.length === fanIn.flat().length,
  '#1013 and the refused sources fall through to the ORPHAN report, so nothing goes unmentioned in either direction');

// (iii) THE COLLECTION RENAME — one write, every child id intact. Driven with a synthetic entry rather
// than the shipped map, deliberately: the shipped map's two entries are a CHAIN, and (v) below is where
// the chain is exercised. This arm isolates the single-entry mechanism it is built out of.
const crShim = new VariablesShim();
const legacy = crShim.createVariableCollection('legacy-color');
const child = crShim.createVariable('color/appearance/text/primary', legacy);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const crPass = await beginMigration(crShim as any, { collections: [{ from: 'legacy-color', to: 'color.appearance', since: '9.9.9' }], variables: [] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const crRes = await applyWritePlan(plan, crShim as any, crPass);
ok(crPass.outcomes.some((o) => o.kind === 'collection' && o.status === 'migrated'),
  '#1013 collection rename: reported as a collection-kind migration, distinct from the ~200 variable renames it is not');
ok(crShim.collections.filter((c) => c.name === 'color.appearance').length === 1 && crShim.collections.find((c) => c.name === 'color.appearance')!.id === legacy.id,
  '#1013 collection rename: ONE collection named `color.appearance`, and it is the original — the rename ran BEFORE find-by-name, so no empty duplicate was created beside it');
ok(child.variableCollectionId === legacy.id && crShim.vars.some((v) => v.id === child.id && v.name === 'color/appearance/text/primary'),
  '#1013 collection rename: the child variable kept its id, its name and its parent — a collection rename is ONE write, not 200');
ok(crRes.misses.length === 0, '#1013 collection rename: the write itself is unaffected');

// (v) #1035 — THE SHIPPED CHAIN, ON A PRE-#1013 FILE. This is the migration the owner will run: a file
// written before the swap carries `color` (the value tier) and `surface` (the alias tier), and both must
// end up under their new names with their ids — and therefore every binding a designer made — intact.
//
// The ORDER is the whole arm. `color → color.appearance` must land before `surface → color`, or the
// short name is occupied by the alias tier when the value tier reaches for it and one of the two is
// refused. Nothing in the map's array order says so: reversing `COLLECTION_RENAMES` must not change this
// result, which is what `planCollectionRenames`'s topological sort buys and what this arm holds it to.
const chainShim = new VariablesShim();
const oldValue = chainShim.createVariableCollection('color');
const oldAlias = chainShim.createVariableCollection('surface');
const valueChild = chainShim.createVariable('color/background/primary', oldValue);
const aliasChild = chainShim.createVariable('surface/background/primary', oldAlias);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const chainPass = await beginMigration(chainShim as any);
const chainCols = chainPass.outcomes.filter((o) => o.kind === 'collection');
ok(chainCols.length === 2 && chainCols.every((o) => o.status === 'migrated'),
  `#1035 both entries of the shipped chain migrate on a pre-#1013 file (${chainCols.map((o) => `${o.from}→${o.to}:${o.status}`).join(' ')})`);
ok(chainShim.collections.find((c) => c.name === 'color.appearance')?.id === oldValue.id,
  '#1035 the VALUE tier is now `color.appearance` and it is the ORIGINAL `color` collection, by id — its variables and their bindings came with it');
ok(chainShim.collections.find((c) => c.name === 'color')?.id === oldAlias.id,
  '#1035 and the short name `color` is now the ORIGINAL `surface` collection, by id — the swap moved two collections, it did not create a third');
ok(chainShim.collections.length === 2 && !chainShim.collections.some((c) => c.name === 'surface'),
  `#1035 exactly two collections afterwards and no \`surface\` left behind (${chainShim.collections.map((c) => c.name).join(', ')}) — an out-of-order pass leaves both tiers merged into one`);
ok(valueChild.variableCollectionId === oldValue.id && aliasChild.variableCollectionId === oldAlias.id,
  '#1035 every child stayed in its own collection — a collection rename touches the collection, never its variables');

// AND THE ALREADY-MIGRATED FILE MUST NOT REFUSE. Re-running on the file above is the second-apply case a
// designer hits by pressing the button twice, and it is the one the pre-#1013 target-first ordering got
// permanently wrong: `color.appearance` is present precisely BECAUSE the rename already happened.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const againPass = await beginMigration(chainShim as any);
ok(againPass.refusals.length === 0 && againPass.outcomes.filter((o) => o.kind === 'collection').every((o) => o.status === 'source-absent'),
  `#1035 re-running on the migrated file refuses NOTHING — every entry reports source-absent (${againPass.outcomes.filter((o) => o.kind === 'collection').map((o) => o.status).join(', ')})`);

// (vi) #1035 ATOMICITY — a refusal anywhere applies NOTHING, including the entries that would have
// succeeded. Synthetic, because the shipped chain cannot reach this state: to distinguish an atomic
// pre-pass from one that applies outcomes as it walks them, an entry that PLANS `migrated` has to sit
// before one that refuses, and the shipped pair's second entry is only ever refused when its first is
// already a no-op. So the shape is stated directly: `legacy-a → color.appearance` plans clean, then
// `legacy-b → color` hits an occupied target.
const atomShim = new VariablesShim();
const atomA = atomShim.createVariableCollection('legacy-a');
atomShim.createVariableCollection('legacy-b');
atomShim.createVariableCollection('color');   // occupies the second entry's target
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const atomPass = await beginMigration(atomShim as any, {
  collections: [
    { from: 'legacy-a', to: 'color.appearance', since: '9.9.9' },
    { from: 'legacy-b', to: 'color', since: '9.9.9' },
  ],
  variables: [{ collection: 'color.appearance', from: 'color/appearance/x', to: 'color/appearance/y', since: '9.9.9' }],
});
ok(atomPass.refusals.length === 1 && atomPass.refusals[0].includes('target-occupied'),
  `#1035 the refusal is reported by name${atomPass.refusals.length ? ` — ${atomPass.refusals[0]}` : ' — NOTHING was refused'}`);
ok(atomPass.outcomes.filter((o) => o.kind === 'collection').length === 2,
  '#1035 and BOTH entries are still reported, refused and clean alike — "checked, refused" must be distinguishable from "never checked"');
// THE ARM THAT PINS ATOMICITY: `legacy-a → color.appearance` planned `migrated`, and must not have run.
ok(atomShim.collections.find((c) => c.name === 'legacy-a')?.id === atomA.id && !atomShim.collections.some((c) => c.name === 'color.appearance'),
  '#1035 the entry that PLANNED CLEAN was not applied — refused, not half-applied. An implementation that renamed as it walked would have moved this one before meeting the refusal');
ok(atomPass.map.collections.length === 0 && atomPass.map.variables.length === 0,
  '#1035 and the VARIABLE half is neutered too — variable rows are keyed by the collection\'s NEW name, so running them against a collection that did not move would orphan the very variables they exist to migrate');

// (iv) A WRONG MAP IS INERT, AND SAYS SO. Three ways it can be wrong, three reported outcomes, no writes.
const badShim0 = seedSolo();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const badPass = await beginMigration(badShim0 as any, { collections: [], variables: [{ collection: 'color.appearance', from: 'color/x', to: 'color/x', since: '9.9.9' }] });
ok(badPass.refusals.length > 0 && badPass.map.variables.length === 0,
  `#1013 a statically-invalid map is REFUSED and emptied before any write${badPass.refusals.length ? ` — ${badPass.refusals[0]}` : ' — NOTHING was refused'}`);
const badShim = badShim0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const badRes = await applyWritePlan(plan, badShim as any, badPass);
ok(badRes.misses.length === 0 && badRes.orphans.find((o) => o.name === 'color.appearance')!.names.length === soloCount,
  '#1013 an invalid map abandons the RENAME PASS ONLY — the write completes and degrades to orphan-and-recreate, which is a known state rather than a new one');

// `target-occupied`: both names present. Migrating would merge two variables and silently drop one side.
const occShim = seedSolo();
const occCol = occShim.collections.find((c) => c.name === 'color.appearance')!;
const occFirst = [...byTarget.values()][0][0];
occShim.createVariable(occFirst.to, occCol);
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
const npCol = npShim.createVariableCollection('color.appearance');
const ghost = npShim.createVariable('color/legacy/thing', npCol);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const npPass = await beginMigration(npShim as any, { collections: [], variables: [{ collection: 'color.appearance', from: 'color/legacy/thing', to: 'color/not/in/any/plan', since: '9.9.9' }] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyWritePlan(plan, npShim as any, npPass);
ok(npPass.outcomes.some((o) => o.status === 'target-not-planned') && ghost.name === 'color/legacy/thing',
  '#1013 a target the plan does not write → target-not-planned, and the variable is untouched — a wrong map is inert, not destructive');

// (vii) #1013 THE VARIABLE HALF, END TO END — the half the collection pre-pass is worse than useless
// without. (v) proves the two collections change name and keep their ids; on its own that makes a file
// WORSE than leaving it alone, because `upsertCollection` then finds `color.appearance` holding 236
// variables still spelled `color/*` — none of which the plan asks for — and creates 236 more beside
// them. 472 variables, half of them orphans carrying every binding the designer made. That is exactly
// the "orphaned migration" this lane asks the owner to look for in a real file, so here the COUNT is
// the assertion.
//
// Driven on the SHIPPED rules, through BOTH executors in the order `main.ts` runs them: the value tier
// and the alias tier migrate under different rules in different collections, and only the pair is the
// migration a designer actually experiences.
const surfacePlan = buildSurfaceWritePlan(nbThemeFrom(nbMeasured));
const swapShim = new VariablesShim();
const swapValue = swapShim.createVariableCollection('color');     // pre-#1013: the VALUE tier
const swapAlias = swapShim.createVariableCollection('surface');   // pre-#1013: the ALIAS tier
const swapValueChild = swapShim.createVariable('color/background/primary', swapValue);
const swapAliasChild = swapShim.createVariable('surface/background/primary', swapAlias);
// The four names above are hand-typed pre-#1013 spellings and must stay that way (`docs/34` shape 6 —
// deriving them by inverting the current emission would make the arm agree with whatever the emission
// happens to do). What CAN be anchored is the other end: if the emission ever stops writing these two
// targets, this arm has to fail HERE, by name, rather than quietly decay into a pair of
// `target-not-planned` outcomes that read like a considered refusal.
ok(plan.color.create.some((r) => r.name === 'color/appearance/background/primary')
  && surfacePlan.create.some((r) => r.name === 'color/background/primary'),
  '#1013 the two post-swap names this arm migrates INTO are names the two plans really write — anchored to the emission at its target end, hand-typed at its source end');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const swapPass = await beginMigration(swapShim as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const swapRes = await applyWritePlan(plan, swapShim as any, swapPass);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const swapSurf = await applySurfacePlan(surfacePlan, swapShim as any, swapPass);
const swapValueCol = swapShim.collections.find((c) => c.name === 'color.appearance')!;
const swapAliasCol = swapShim.collections.find((c) => c.name === 'color')!;
const inValue = swapShim.vars.filter((v) => v.variableCollectionId === swapValueCol.id);
const inAlias = swapShim.vars.filter((v) => v.variableCollectionId === swapAliasCol.id);

ok(swapValueChild.name === 'color/appearance/background/primary' && swapValueChild.variableCollectionId === swapValue.id,
  `#1013 the value-tier variable was RENAMED IN PLACE — same id, new name (${swapValueChild.name}) — so every binding a designer made against it still resolves`);
ok(swapAliasChild.name === 'color/background/primary' && swapAliasChild.variableCollectionId === swapAlias.id,
  `#1013 and the alias-tier variable took the short name the value tier vacated (${swapAliasChild.name}), also by id — the two rules fired in two different collections, each keyed to its tier's NEW name`);
// THE COUNT IS THE ARM. Migrated: 236 + 122. Orphaned-and-recreated: 237 + 123, with the extra one in
// each holding the live bindings and no plan row left to keep it alive.
ok(inValue.length === plan.color.create.length && inAlias.length === surfacePlan.create.length,
  `#1013 exactly ${plan.color.create.length} + ${surfacePlan.create.length} variables afterwards (got ${inValue.length} + ${inAlias.length}) — a collection pre-pass with no variable half leaves ONE MORE in each: the designer's original, orphaned beside a fresh create`);
ok(swapRes.orphans.every((o) => o.names.length === 0) && swapSurf.orphans.length === 0,
  '#1013 and neither executor reports an orphan — the migration is total, not partial-with-a-report');
const swapMoved = swapPass.outcomes.filter((o) => o.kind === 'variable' && o.status === 'migrated');
ok(swapMoved.length === 2
  && swapMoved.some((o) => o.from === 'color/background/primary' && o.to === 'color/appearance/background/primary')
  && swapMoved.some((o) => o.from === 'surface/background/primary' && o.to === 'color/background/primary'),
  `#1013 both moves are REPORTED by name, one per rule (${swapMoved.map((o) => `${o.from}→${o.to}`).join(', ')}) — and only those two, so a rule that over-reached would show up as a third`);
ok(swapRes.misses.length === 0 && swapSurf.misses.length === 0,
  '#1013 and the writes themselves are unaffected — zero unresolved bindings across both tiers');

// AND A COLLECTION REFUSAL MUST DISARM THE RULES, not only the rows. Synthetic, and deliberately so:
// the two SHIPPED rules cannot reach this state, because both of their domains name a POST-swap
// collection (`color.appearance`, `color`) and a refused pre-pass means those names hold either nothing
// or already-migrated content — so the shipped pair is inert under a refusal by accident of its own
// domains rather than by construction. The invariant is what the NEXT rule inherits, so it is stated
// with a rule whose domain survives the refusal.
const ghostRule = [{
  id: 'synthetic-disarm', since: '9.9.9',
  domain: (c: string, n: string) => c === 'color.appearance' && n === 'color/ghost',
  map: () => 'color/appearance/text/primary',
}];
const disarmShim = new VariablesShim();
disarmShim.createVariableCollection('legacy-x');
const disarmTarget = disarmShim.createVariableCollection('color.appearance');  // occupies the entry's target
const disarmGhost = disarmShim.createVariable('color/ghost', disarmTarget);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const disarmPass = await beginMigration(disarmShim as any, { collections: [{ from: 'legacy-x', to: 'color.appearance', since: '9.9.9' }], variables: [] }, ghostRule);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyWritePlan(plan, disarmShim as any, disarmPass);
ok(disarmPass.refusals.length === 1 && disarmPass.refusals[0].includes('target-occupied'),
  `#1013 the collection entry is refused by name${disarmPass.refusals.length ? ` — ${disarmPass.refusals[0]}` : ' — NOTHING was refused'}`);
ok(disarmGhost.name === 'color/ghost',
  '#1013 a refused collection pre-pass disarms the RULES as well as the rows — a rule keyed to `color.appearance` would otherwise rename variables inside a collection that never moved, which is the orphaning the rules exist to prevent');
// THE PAIRED POSITIVE, because a negative arm on its own cannot tell "disarmed" from "the rule never
// matched here anyway" — the false pass the collapsed-`background/primary` arm was sitting on until its
// twin went red. Same shim shape, same rule, nothing refused: the ghost MUST move.
const armedShim = new VariablesShim();
const armedTarget = armedShim.createVariableCollection('color.appearance');
const armedGhost = armedShim.createVariable('color/ghost', armedTarget);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const armedPass = await beginMigration(armedShim as any, { collections: [], variables: [] }, ghostRule);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyWritePlan(plan, armedShim as any, armedPass);
ok(armedPass.refusals.length === 0 && armedGhost.name === 'color/appearance/text/primary',
  `#1013 and with nothing refused the very same rule DOES move it (${armedGhost.name}) — so the arm above measures the disarming, not a rule that was never going to fire`);

// (viii) #1056 THE HALF-MIGRATED FILE — a run interrupted, or a designer who renamed one variable by
// hand. `color.appearance` holds BOTH spellings of the same token, and the rule's target is therefore
// occupied by a live variable with its own bindings. Neither may move: promoting the old name would
// merge two variables and silently drop one side's bindings, and there is no answer to which side.
// This is left to `planVariableRenames` rather than pre-empted in the rule — the rule states the
// transformation, the planner states what the FILE allows.
const halfShim = new VariablesShim();
const halfCol = halfShim.createVariableCollection('color.appearance');
const halfOld = halfShim.createVariable('color/background/primary', halfCol);
const halfNew = halfShim.createVariable('color/appearance/background/primary', halfCol);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const halfPass = await beginMigration(halfShim as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const halfRes = await applyWritePlan(plan, halfShim as any, halfPass);
const halfOutcome = halfPass.outcomes.find((o) => o.kind === 'variable' && o.from === 'color/background/primary');
ok(halfOutcome?.status === 'target-occupied',
  `#1056 both spellings live → target-occupied, reported by name (got ${halfOutcome?.status ?? 'NO OUTCOME AT ALL'})`);
ok(halfOld.name === 'color/background/primary' && halfNew.name === 'color/appearance/background/primary'
  && halfShim.vars.filter((v) => v.name === 'color/appearance/background/primary').length === 1,
  '#1056 and NEITHER moved — one variable with the new name, still the original, and the old one left exactly as the designer left it');
ok(halfRes.orphans.find((o) => o.name === 'color.appearance')!.names.includes('color/background/primary'),
  '#1056 the un-migratable name falls through to the ORPHAN report, so a refusal here is still something the designer is told about');

console.log(`\nplugin write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
