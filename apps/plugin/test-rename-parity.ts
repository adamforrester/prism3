/**
 * #1024 — the two Figma write paths migrate the same renames to the same names.
 *
 * `apps/plugin/src/write-figma.ts` (the plugin executor) has migrated renamed variables since #1013: a renamed
 * variable keeps its id, and so every binding a designer made. `packages/engine/materialise-to-figma.ts` (the
 * CLI paste path) did not — the new name was created beside the old one, and every binding was orphaned. Both
 * now run the engine's one rename pass (`rename-map.ts` `openMigration` / `renameCollections` /
 * `renameVariables`); the paste path ships its source (`rename-runtime.ts`) in a `migrate` pass.
 *
 * WHAT THIS RUNS. One old-names file — a fixture written by hand below — is materialized twice into the
 * shared file model (`file-shim.ts`): once by the plugin's `beginMigration` + `applyWritePlan`, once by the
 * paste path's real payloads (`migrate`, `palette`, `color-create`, `dims-create`, `font-vars`, `motion-vars`),
 * executed as `figma_execute` runs them. Both read the same plans (`variablePlans`, from the reference brand's
 * committed `out/figma/nb/` tree), so every axis the rename pass covers is written on both sides.
 *
 * THE EXPECTED SIDE IS LITERAL (`docs/34`). Every expected name below is typed out, and each is a target the
 * rename map states — a `COLLECTION_RENAMES` entry, a `DEPRECATIONS`-derived row, or a materialization rule —
 * checked against those registers by the first arm, so a fixture row cannot silently stop being a row of the
 * map. Neither path's output is the reference for the other: each is held to the literals on its own, and the
 * parity arm at the end only adds that they also agree on every other name in the two collections.
 *
 * A variable is followed by its ID, not its name, because the property under test is that the variable
 * MOVED: a path that created the new name and left the old one would produce the right name set and fail
 * here, on the id.
 */
import { renameMap, COLLECTION_RENAMES } from '@prism3/engine/rename-map';
import { MATERIALIZATION_RENAMES } from '@prism3/engine/materialization-renames';
import { passPayloads, variablePlans } from '@prism3/engine/materialise-to-figma';
import { beginMigration, applyWritePlan, applyFloatPlan, applyVarCollectionPlan } from './src/write-figma';
import { FileShim } from './file-shim';

let pass = 0, fail = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); } else { fail++; console.log(`  ✗ ${label}`); }
};

const BRAND = 'nb';
// The plans the paste path reads (the committed tree), handed to the plugin's executors too: one plan, two writers.
const { plan, floats, fonts, motion } = variablePlans(BRAND);

/**
 * THE FIXTURE: what a file written by an older engine holds. `from` is seeded; `to` is what both paths must
 * leave it as. `why` names the register entry that states the target, which the first arm checks.
 */
type Row = { collection: string; from: string; to: string; why: string; type?: 'FLOAT' | 'STRING' };
const OLD_COLOR = 'color.appearance';
const ROWS: Row[] = [
  // #1148's materialization rule: the value tier's variables gave up the `appearance/` segment.
  { collection: OLD_COLOR, from: 'nbds/color/appearance/text/primary', to: 'nbds/color/text/primary', why: 'rule color-one-collection-1148' },
  // A contract rename (DEPRECATIONS 3.0.0): a stateless border leaf became a stateful one.
  { collection: OLD_COLOR, from: 'nbds/color/interactive/primary/border', to: 'nbds/color/interactive/primary/border/rest', why: 'row color/interactive/primary/border -> color/interactive/primary/border/rest' },
  // Both at once: the materialization step, then the contract row (DEPRECATIONS 4.0.0), composed into one move.
  { collection: OLD_COLOR, from: 'nbds/color/appearance/interactive/primary/on-inverse/text/rest', to: 'nbds/color/inverse/interactive/primary/text/rest', why: 'rule color-one-collection-1148 + row color/interactive/primary/on-inverse/text/rest -> color/inverse/interactive/primary/text/rest' },
  // #1097's rule: a pre-namespace name takes the brand root.
  { collection: OLD_COLOR, from: 'color/background/primary', to: 'nbds/color/background/primary', why: 'rule namespace-and-core-tier-1097' },
  // #1283's rule: a name under a retired root moves to the brand's own.
  { collection: OLD_COLOR, from: 'prism/color/background/secondary', to: 'nbds/color/background/secondary', why: 'rule brand-roots-1283' },
  // #1283 inside `core`: exercises the owned-slice scoping (`core/palette`) both paths apply before renaming.
  { collection: 'core', from: 'prism/core/palette/white', to: 'nbds/core/palette/white', why: 'rule brand-roots-1283' },
  // The other two `core` slices, each written by a different executor: with all three seeded, a write that stops
  // scoping `core` to its owned group sees the other slices' names and refuses them as un-planned.
  { collection: 'core', from: 'prism/core/dimension/1', to: 'nbds/core/dimension/1', why: 'rule brand-roots-1283', type: 'FLOAT' },
  { collection: 'core', from: 'prism/core/font/family/display', to: 'nbds/core/font/family/display', why: 'rule brand-roots-1283', type: 'STRING' },
  // A float collection (`space`), written by the float executor and the `dims-create` pass.
  { collection: 'space', from: 'space/0', to: 'nbds/space/0', why: 'rule namespace-and-core-tier-1097', type: 'FLOAT' },
];
const EXPECTED_COLLECTION = { from: OLD_COLOR, to: 'color' };

console.log('#1024 — the fixture is the rename map\'s own targets');
{
  const map = renameMap();
  const hasRow = (from: string, to: string) => map.variables.some((r) => r.from === from && r.to === to);
  const ruleIds = new Set(MATERIALIZATION_RENAMES.map((r) => r.id));
  const stale = ROWS.flatMap((r) => r.why.split(' + ').filter((w) => {
    const rule = /^rule (\S+)$/.exec(w);
    if (rule) return !ruleIds.has(rule[1]);
    const row = /^row (\S+) -> (\S+)$/.exec(w);
    return !row || !hasRow(row[1], row[2]);
  }).map((w) => `${r.from}: ${w}`));
  ok(stale.length === 0 && COLLECTION_RENAMES.some((c) => c.from === EXPECTED_COLLECTION.from && c.to === EXPECTED_COLLECTION.to),
    `#1024 every fixture target is stated by the live rename map — COLLECTION_RENAMES ${EXPECTED_COLLECTION.from} -> ${EXPECTED_COLLECTION.to}, the DEPRECATIONS rows and the materialization rules it cites (${stale.length ? `NOT STATED: ${stale.join('; ')}` : `${ROWS.length} rows`})`);
}

/** Seed the old-names file. Returns the id each fixture row's variable was minted with. */
const seed = (f: FileShim): Map<string, string> => {
  const cols = new Map<string, any>();
  const col = (name: string) => cols.get(name) ?? cols.set(name, f.createVariableCollection(name)).get(name);
  const ids = new Map<string, string>();
  for (const r of ROWS) ids.set(r.from, f.createVariable(r.from, col(r.collection), r.type ?? 'COLOR').id);
  return ids;
};

/** What a path left behind, measured against the literals. */
const judge = (f: FileShim, ids: Map<string, string>) => {
  const problems: string[] = [];
  for (const r of ROWS) {
    const v = f.vars.find((x) => x.id === ids.get(r.from));
    if (!v) { problems.push(`${r.from}: its variable is gone`); continue; }
    if (v.name !== r.to) problems.push(`${r.from} -> ${v.name}, want ${r.to}`);
    const same = f.vars.filter((x) => x.name === r.to);
    if (same.length !== 1) problems.push(`${r.to} held by ${same.length} variables`);
    if (f.vars.some((x) => x.name === r.from)) problems.push(`${r.from} still in the file`);
  }
  const names = f.collections.map((c) => c.name);
  if (!names.includes(EXPECTED_COLLECTION.to)) problems.push(`no '${EXPECTED_COLLECTION.to}' collection`);
  if (names.includes(EXPECTED_COLLECTION.from)) problems.push(`'${EXPECTED_COLLECTION.from}' still in the file`);
  if (names.filter((n) => n === EXPECTED_COLLECTION.to).length > 1) problems.push(`two '${EXPECTED_COLLECTION.to}' collections`);
  return problems;
};

const AsyncFn = Object.getPrototypeOf(async () => {}).constructor;
const runPaste = async (f: FileShim, names: string[]) => {
  const results: unknown[] = [];
  for (const name of names) for (const js of passPayloads(BRAND, name)) results.push(await new AsyncFn('figma', js)(f));
  return results;
};

const plugin = new FileShim();
const pluginIds = seed(plugin);
const paste = new FileShim();
const pasteIds = seed(paste);

const main = async () => {
  console.log('#1024 — the plugin path');
  const mig = await beginMigration(plugin.variables);
  // Apply Theme's variable order (`apply-theme.ts`): colour, floats, font, motion — one migration across all four.
  await applyWritePlan(plan, plugin.variables, mig);
  await applyFloatPlan(floats, plugin.variables, mig);
  await applyVarCollectionPlan(fonts, plugin.variables, mig);
  await applyVarCollectionPlan(motion, plugin.variables, mig);
  const pp = judge(plugin, pluginIds);
  ok(pp.length === 0, `#1024 plugin path: every old name in the fixture is MOVED (same id) to the rename map's literal target, and the collection to '${EXPECTED_COLLECTION.to}' (${pp.length ? pp.join('; ') : `${ROWS.length} variables + 1 collection`})`);

  console.log('#1024 — the CLI paste path');
  let results: unknown[] = [];
  try {
    results = await runPaste(paste, ['migrate', 'palette', 'color-create', 'dims-create', 'font-vars', 'motion-vars']);
  } catch (e) {
    ok(false, `#1024 paste path: the migrate, palette, color-create, dims-create, font-vars and motion-vars payloads run — a payload THREW: ${(e as Error).message}`);
  }
  const pq = judge(paste, pasteIds);
  ok(pq.length === 0, `#1024 paste path: every old name in the fixture is MOVED (same id) to the rename map's literal target, and the collection to '${EXPECTED_COLLECTION.to}' (${pq.length ? pq.join('; ') : `${ROWS.length} variables + 1 collection`})`);
  const report = results[0] as { migrated?: string[]; refused?: string[]; refusals?: string[] } | undefined;
  ok(!!report && report.migrated?.length === ROWS.length + 1 && (report.refused ?? []).length === 0 && (report.refusals ?? []).length === 0,
    `#1024 paste path: the migrate pass reports what it moved — ${ROWS.length} variables + 1 collection, no refusal (got ${report ? `migrated ${report.migrated?.length}, refused ${report.refused?.length}, refusals ${report.refusals?.length}` : 'no report'})`);

  console.log('#1024 — the two paths agree on the rest of the file');
  const namesIn = (f: FileShim, col: string) => {
    const c = f.collections.find((x) => x.name === col);
    return c ? f.vars.filter((v) => v.variableCollectionId === c.id).map((v) => v.name).sort() : [];
  };
  const diff = (col: string) => {
    const a = new Set(namesIn(plugin, col)), b = new Set(namesIn(paste, col));
    return [...[...a].filter((n) => !b.has(n)).map((n) => `plugin only: ${n}`), ...[...b].filter((n) => !a.has(n)).map((n) => `paste only: ${n}`)];
  };
  const all = [...new Set([...plugin.collections, ...paste.collections].map((c) => c.name))].sort();
  const d = all.flatMap(diff);
  ok(d.length === 0 && namesIn(plugin, 'color').length === plan.color.create.length && all.includes('space'),
    `#1024 both paths leave the same variable names in every collection (${all.length} collections: ${all.join(', ')}${d.length ? ` — ${d.slice(0, 4).join('; ')}` : ''})`);

  console.log('#1024 — a second paste is a no-op');
  let again: { migrated: string[]; refused: string[] } | undefined;
  try { again = (await runPaste(paste, ['migrate']))[0] as { migrated: string[]; refused: string[] }; } catch { again = undefined; }
  ok(!!again && again.migrated.length === 0 && again.refused.length === 0 && judge(paste, pasteIds).length === 0,
    `#1024 paste path: re-running migrate on the migrated file moves nothing and refuses nothing (${again ? `migrated ${again.migrated.length}, refused ${again.refused.length}` : 'the migrate payload did not run'})`);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
};
main();
