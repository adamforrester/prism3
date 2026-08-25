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
const colCol = shim.collections.find((c) => c.name === 'color')!;
ok(shim.collections.length === 2 && !!palCol && !!colCol, 'exactly two collections: core-palette + color');
ok(colCol.modes.map((m) => m.name).join(',') === plan.color.modes.join(','),
  `color collection modes match the plan (${colCol.modes.map((m) => m.name).join('/')})`);

// primitives hidden + scoped
const palVars = shim.vars.filter((v) => v.variableCollectionId === palCol.id);
ok(palVars.length > 0 && palVars.every((v) => v.hiddenFromPublishing && v.scopes.length > 0),
  'every core-palette primitive hidden from publishing + scoped');

// the collapse-guard: background/primary resolves to a DIFFERENT palette target per mode
const colVars = new Map(shim.vars.filter((v) => v.variableCollectionId === colCol.id).map((v) => [v.name, v]));
const byId = new Map(shim.vars.map((v) => [v.id, v]));
const bg = colVars.get('color/background/primary')!;
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
const ghostCol = ghostShim.createVariableCollection('color');
ghostShim.createVariable('palette/accent/550', ghostPal);              // pre-rename palette generation
ghostShim.createVariable('color/interactive/primary/text', ghostCol);  // flat leaf, now a group
const ghostNames = ['palette/accent/550', 'color/interactive/primary/text'];

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
const realRenames = deriveVariableRenames().filter((r) => r.collection === 'color' && plan.color.create.some((c) => c.name === r.to));
ok(realRenames.length >= 40,
  `#1013 the shipped map reaches ${realRenames.length} live \`color\` entries (floor 40) — a derivation that produced none would satisfy every arm below vacuously`);

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
const pass = beginMigration();
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
ok(migRes.orphans.find((o) => o.name === 'color')!.names.length === 0,
  '#1013 a migrated variable is NOT also reported as an orphan — the two reports partition the drift, they do not overlap');
// THE UNIT OF REPORT IS THE TARGET, not the map entry — and this arm is what pins that, because the
// two counts differ: 40 live entries collapse to 37 targets. A migrated group names the source that
// actually moved and stays silent about the fan-in siblings that were absent, which is the honest
// summary: naming them would tell a designer a token went missing when nothing of theirs did.
ok(pass.outcomes.length === soloCount && pass.outcomes.every((o) => o.collection === 'color'),
  `#1013 one outcome per TARGET considered (${pass.outcomes.length} for ${soloCount} targets across ${realRenames.length} entries) — no entry is silently dropped and none is double-counted`);

// (ii-c) THE FRESH FILE — the normal case, and the one that must not read as a clean skip. None of the
// old names are present, so every target is checked and reported `source-absent`: a caller can tell
// "checked, nothing to do" from "never checked", and the write is byte-for-byte the control's.
const freshShim = new VariablesShim();
const freshPass = beginMigration();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const freshRes = await applyWritePlan(plan, freshShim as any, freshPass);
ok(freshPass.outcomes.length === realRenames.length && freshPass.outcomes.every((o) => o.status === 'source-absent'),
  `#1013 a file holding none of the old names reports every one of the ${freshPass.outcomes.length} entries as \`source-absent\` — checked and nothing to do, which is not the same as never checked`);
// The two counts differ ON PURPOSE, and this is the arm that says so out loud: with nothing live, all 40
// historical names are named, because any of them could be what a designer is holding; with one live per
// target, the 37 that moved are named and their absent siblings are not.
ok(freshPass.outcomes.length > pass.outcomes.length,
  `#1013 and an absent group names EVERY historical alternative (${freshPass.outcomes.length}) where a migrated one names only what moved (${pass.outcomes.length}) — the report follows the file, not the map's row count`);
ok(freshRes.colorCreated === ctrl.colorCreated && freshPass.outcomes.every((o) => !isRefusal(o.status)),
  `#1013 and the fresh file is written exactly as it is without the map (${freshRes.colorCreated} created, no refusals) — the migration pass is a no-op on a file it has nothing to say about`);

// (ii-b) THE FAN-IN FILE — both historical names present. Neither may move: the bindings on each point at
// a different variable, and promoting one would silently discard the other. The FILE is the disambiguator,
// so with one source live (above) it migrates and with two it refuses — no authored preference either way.
const fanShim = seedSolo();
const fanCol = fanShim.collections.find((c) => c.name === 'color')!;
for (const g of fanIn) for (const r of g.slice(1)) fanShim.createVariable(r.from, fanCol);
const fanPass = beginMigration();
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

// (iii) THE COLLECTION RENAME — one write, every child id intact. Authored (`COLLECTION_RENAMES` ships
// empty), so it is driven with a synthetic entry: the mechanism has to be exercised before #1013 Q4 is
// taken, or the decision would be taken on untested code.
const crShim = new VariablesShim();
const legacy = crShim.createVariableCollection('legacy-color');
const child = crShim.createVariable('color/text/primary', legacy);
const crPass = beginMigration({ collections: [{ from: 'legacy-color', to: 'color', since: '9.9.9' }], variables: [] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const crRes = await applyWritePlan(plan, crShim as any, crPass);
ok(crPass.outcomes.some((o) => o.kind === 'collection' && o.status === 'migrated'),
  '#1013 collection rename: reported as a collection-kind migration, distinct from the ~200 variable renames it is not');
ok(crShim.collections.filter((c) => c.name === 'color').length === 1 && crShim.collections.find((c) => c.name === 'color')!.id === legacy.id,
  '#1013 collection rename: ONE collection named `color`, and it is the original — the rename ran BEFORE find-by-name, so no empty duplicate was created beside it');
ok(child.variableCollectionId === legacy.id && crShim.vars.some((v) => v.id === child.id && v.name === 'color/text/primary'),
  '#1013 collection rename: the child variable kept its id, its name and its parent — a collection rename is ONE write, not 200');
ok(crRes.misses.length === 0, '#1013 collection rename: the write itself is unaffected');

// (iv) A WRONG MAP IS INERT, AND SAYS SO. Three ways it can be wrong, three reported outcomes, no writes.
const badPass = beginMigration({ collections: [], variables: [{ collection: 'color', from: 'color/x', to: 'color/x', since: '9.9.9' }] });
ok(badPass.refusals.length > 0 && badPass.map.variables.length === 0,
  `#1013 a statically-invalid map is REFUSED and emptied before any write${badPass.refusals.length ? ` — ${badPass.refusals[0]}` : ' — NOTHING was refused'}`);
const badShim = seedSolo();
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
const badRes = await applyWritePlan(plan, badShim as any, badPass);
ok(badRes.misses.length === 0 && badRes.orphans.find((o) => o.name === 'color')!.names.length === soloCount,
  '#1013 an invalid map abandons the RENAME PASS ONLY — the write completes and degrades to orphan-and-recreate, which is a known state rather than a new one');

// `target-occupied`: both names present. Migrating would merge two variables and silently drop one side.
const occShim = seedSolo();
const occCol = occShim.collections.find((c) => c.name === 'color')!;
const occFirst = [...byTarget.values()][0][0];
occShim.createVariable(occFirst.to, occCol);
const occPass = beginMigration();
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
const npPass = beginMigration({ collections: [], variables: [{ collection: 'color', from: 'color/legacy/thing', to: 'color/not/in/any/plan', since: '9.9.9' }] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies VariablesApi
await applyWritePlan(plan, npShim as any, npPass);
ok(npPass.outcomes.some((o) => o.status === 'target-not-planned') && ghost.name === 'color/legacy/thing',
  '#1013 a target the plan does not write → target-not-planned, and the variable is untouched — a wrong map is inert, not destructive');

console.log(`\nplugin write-adapter: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
