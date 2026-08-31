/**
 * Prism3 plugin — COLLECTION ORDER gate (#1190).
 *
 *   npx tsx apps/plugin/lint-collection-order.ts
 *
 * Figma lists variable collections in CREATION order (there is no reorder API), so the order a designer
 * reads top-to-bottom in the Variables panel is the sequence of `createVariableCollection` calls. #1190
 * made that order intentional: `COLLECTION_ORDER` declares it, and BOTH emission paths — the plugin
 * executor and the CLI paste path — are hand-authored to produce it. This gate is what keeps them honest.
 *
 * ── SUBJECT vs ORACLE (why this is not a tautology) ───────────────────────────────────────────────
 *
 * SUBJECT — the OBSERVED runtime creation order, obtained by RUNNING each path against a recording stub
 * that captures every `createVariableCollection` call:
 *   • plugin: run the real `applyVariableCollections` (the executor sequence) against the stub.
 *   • CLI: execute the real paste payloads (`passPayloads` in `passOrder`) against the stub, so the
 *     `if(!col)create` guards fire exactly as they would in Figma — a collection created by an earlier
 *     pass is found, not re-created, so the recorded order is the true first-touch sequence.
 * ORACLE — `COLLECTION_ORDER`, filtered to the collections the brand writes (`expectedOrder`).
 *
 * The two are INDEPENDENT because the wiring that produces the subject (the `applyVariableCollections`
 * call order, `buildFloatWritePlan`'s array, the CLI `ORDER`/`FLOAT_AXES`) is hand-authored SEPARATELY
 * from the list and does not read it. Reorder any of that wiring without touching the list and the
 * observed order diverges from the oracle → this gate fails, naming the path. Had the wiring been driven
 * FROM the list (a pre-pass iterating it), subject and oracle would share one producer and a reorder of
 * the list would move both in lockstep — `docs/34` shape 17, a gate that cannot fail. That is the trap
 * this design avoids on purpose.
 *
 * BOTH PATHS, INDEPENDENTLY — the real risk #1190 introduces is the CLI path silently diverging from the
 * plugin path (two separate orderings). So each path is asserted against the list, AND the two are
 * asserted to agree with each other.
 *
 * Dependency-free `ok(...)`, mirrors the engine suite; exits non-zero on any failure.
 */
import { COLLECTION_ORDER, expectedOrder } from '@prism3/engine/collection-order';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildWritePlan, buildFloatWritePlan, buildFontVarPlan } from '@prism3/engine/write-plan';
import { nbTheme } from '@prism3/engine/nb-fixture';
import type { Theme } from '@prism3/engine/theme';
import { passPayloads, passOrder, floatCollections, fontCollections } from '@prism3/engine/materialise-to-figma';
import { applyVariableCollections, beginMigration } from './src/write-figma';

let failed = 0;
let checks = 0;
const ok = (cond: boolean, label: string): void => {
  checks++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const eq = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

// ---- the recording stub -------------------------------------------------------------------------
// An in-memory `figma.variables` that RECORDS the sequence of `createVariableCollection` names. Enough of
// the surface for the create passes of both paths (collections have a renamable mode-0 + addMode; vars
// hold per-mode values; an alias is an opaque handle). Authored HERE, independently of the test suite's
// own `VariablesShim`, so the recorder shares nothing with either subject (`docs/34`).
type Val = unknown;
class RecCollection {
  modes: { modeId: string; name: string }[];
  private m = 0;
  constructor(public id: string, public name: string) { this.modes = [{ modeId: `${id}:m0`, name: 'Mode 1' }]; }
  renameMode(modeId: string, name: string): void { const x = this.modes.find((z) => z.modeId === modeId); if (x) x.name = name; }
  addMode(name: string): string { const modeId = `${this.id}:m${++this.m}`; this.modes.push({ modeId, name }); return modeId; }
}
class RecVar {
  scopes: unknown[] = [];
  description = '';
  hiddenFromPublishing = false;
  valuesByMode: Record<string, Val> = {};
  constructor(public id: string, public name: string, public variableCollectionId: string, public resolvedType: string) {}
  setValueForMode(modeId: string, value: Val): void { this.valuesByMode[modeId] = value; }
  setBoundVariable(): void { /* create passes don't call this; present for completeness */ }
}
class RecordingVars {
  collections: RecCollection[] = [];
  vars: RecVar[] = [];
  createdOrder: string[] = [];   // the observation: createVariableCollection names, in call order
  private c = 0;
  private v = 0;
  async getLocalVariableCollectionsAsync(): Promise<RecCollection[]> { return this.collections; }
  async getLocalVariablesAsync(type?: string): Promise<RecVar[]> { return type ? this.vars.filter((x) => x.resolvedType === type) : this.vars; }
  createVariableCollection(name: string): RecCollection {
    const col = new RecCollection(`c${++this.c}`, name);
    this.collections.push(col);
    this.createdOrder.push(name);
    return col;
  }
  createVariable(name: string, collection: RecCollection, t = 'COLOR'): RecVar {
    const x = new RecVar(`v${++this.v}`, name, collection.id, t); this.vars.push(x); return x;
  }
  createVariableAlias(target: RecVar): { type: 'VARIABLE_ALIAS'; id: string } { return { type: 'VARIABLE_ALIAS', id: target.id }; }
}

// ---- observe the PLUGIN path --------------------------------------------------------------------
const observePlugin = async (theme: Theme): Promise<{ order: string[]; written: string[] }> => {
  const stub = new RecordingVars();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the stub satisfies VariablesApi
  const mig = await beginMigration(stub as any);           // fresh file → inert migration
  const color = buildWritePlan(buildFigmaColor(theme));
  const font = buildFontVarPlan(theme);
  const float = buildFloatWritePlan(theme);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await applyVariableCollections({ color, font, float }, stub as any, mig);
  const written = [...new Set(['core', 'color', ...font.map((p) => p.name), ...float.map((p) => p.name)])];
  return { order: stub.createdOrder, written };
};

// ---- observe the CLI path -----------------------------------------------------------------------
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...a: string[]) => (figma: unknown) => Promise<unknown>;
const observeCli = async (brand: string): Promise<{ order: string[]; written: string[]; ran: string[]; skipped: string[] }> => {
  const stub = new RecordingVars();
  const figma = { variables: stub };
  const ran: string[] = [];
  const skipped: string[] = [];
  for (const pass of passOrder()) {
    for (const js of passPayloads(brand, pass)) {
      // A pass with no `createVariableCollection` in its bytes creates no collection — skip it, and
      // record that we did so the assertion below can prove skipping is sound rather than lucky.
      if (!/createVariableCollection/.test(js)) { if (!skipped.includes(pass)) skipped.push(pass); continue; }
      if (!ran.includes(pass)) ran.push(pass);
      const fn = new AsyncFunction('figma', js);
      await fn(figma);
    }
  }
  const written = [...new Set(['core', 'color', ...floatCollections(brand), ...fontCollections(brand)])];
  return { order: stub.createdOrder, written, ran, skipped };
};

// ---- run ----------------------------------------------------------------------------------------
console.log(`collection-order gate (#1190) — panel order = COLLECTION_ORDER:\n  ${COLLECTION_ORDER.join(' · ')}\n`);

// The list itself: no duplicates (a dup would make `expectedOrder` ambiguous and the panel order a lie).
ok(new Set(COLLECTION_ORDER).size === COLLECTION_ORDER.length, `COLLECTION_ORDER has no duplicate (${COLLECTION_ORDER.length} entries)`);
ok(COLLECTION_ORDER[0] === 'core', 'core is fixed at the top (also the palette→color alias dependency)');

const CLI_BRANDS = ['nb', 'aurora', 'wendys'];        // every brand with an out/figma emission
// The plugin wiring (`applyVariableCollections`' call order + `buildFloatWritePlan`'s array) is
// brand-INVARIANT — it does not read the brand — so one representative theme observes the whole order.
// The CLI reads per-brand files, so it is run on every corpus brand above.
const PLUGIN_BRANDS: { brand: string; theme: Theme }[] = [{ brand: 'nb', theme: nbTheme() }];

const cliObs: Record<string, { order: string[]; written: string[] }> = {};
for (const brand of CLI_BRANDS) {
  const obs = await observeCli(brand);
  cliObs[brand] = obs;
  const expected = expectedOrder(obs.written);
  ok(obs.order.length >= 10, `CLI ${brand}: created a full panel (${obs.order.length} collections), not a vacuous few`);
  ok(eq(obs.order, expected), `CLI ${brand}: observed createVariableCollection order == COLLECTION_ORDER — ${obs.order.join(' · ')}`);
  // The passes we skipped genuinely create nothing (they carry no createVariableCollection), so running
  // only the create passes observed the WHOLE order — not a subset that happened to look right.
  ok(obs.ran.length > 0 && ['color-aliases', 'dims-aliases', 'text-styles', 'styles', 'verify'].every((p) => !obs.ran.includes(p)),
    `CLI ${brand}: only the create passes create collections (ran ${obs.ran.join(',')}; skipped ${obs.skipped.join(',')})`);
}

const pluginObs: Record<string, { order: string[]; written: string[] }> = {};
for (const { brand, theme } of PLUGIN_BRANDS) {
  const obs = await observePlugin(theme);
  pluginObs[brand] = obs;
  const expected = expectedOrder(obs.written);
  ok(obs.order.length >= 10, `plugin ${brand}: created a full panel (${obs.order.length} collections)`);
  ok(eq(obs.order, expected), `plugin ${brand}: observed createVariableCollection order == COLLECTION_ORDER — ${obs.order.join(' · ')}`);
}

// The two paths must AGREE — the divergence risk #1190 introduces. Checked on every brand both paths cover.
for (const brand of CLI_BRANDS) {
  if (!pluginObs[brand]) continue;
  ok(eq(pluginObs[brand].order, cliObs[brand].order),
    `${brand}: plugin and CLI create collections in the SAME order (${pluginObs[brand].order.length} each)`);
}

// Floors (docs/34 shape 9): a real number of brands ran on each path, so no assertion passed over nothing.
ok(Object.keys(cliObs).length >= 3, `CLI path exercised on ${Object.keys(cliObs).length} brands`);
ok(Object.keys(pluginObs).length >= 1, `plugin path exercised on ${Object.keys(pluginObs).length} brand (wiring is brand-invariant)`);

console.log(`\n${failed ? `❌ ${failed}/${checks} failed` : `✓ clean — ${checks} checks; both paths create collections in COLLECTION_ORDER`}`);
process.exit(failed ? 1 : 0);
