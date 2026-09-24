/**
 * Apply PRE-FLIGHT test (#506 case c — the foreign-file safety floor). Drives `guardApply` with the REAL
 * executors, in `main.ts`'s order, against one in-memory file shim that records EVERY write.
 *
 *   npx tsx apps/plugin/test-write-preflight.ts
 *
 * The arms, each named so a mutation fails one of them BY NAME (docs/34):
 *
 *   · ZERO-WRITES — a file holding a same-named FLOAT variable where Prism3 writes COLOR: the pre-flight
 *     reports it and the shim sees NO write of any kind. The control arm runs the same file UNGUARDED and
 *     shows the throw is real and lands mid-write — so "zero" is measured against a write that would have
 *     happened, not against a shim that cannot be written to.
 *   · FOREIGN-ADOPT — a same-named collection with no #1581 stamp (and a same-named effect style with a
 *     hand-typed description): reported, not adopted — its modes and variables are exactly as they were.
 *   · IDEMPOTENT — a Prism3-provenance file (the output of a real apply) re-applies with 0 conflicts and 0
 *     created, across every committed example brand and the NB regression theme. This is the arm that says the floor did not break
 *     case (a): an engine description the style signature failed to recognize would surface here.
 *   · LEGACY — a Prism3 file from before #1581 (no stamps, persisted brand on the root) is presumed ours;
 *     the same file without the persisted brand is not.
 *
 * The shim's `setValueForMode` enforces the variable's type the way Figma does (it throws), which is the
 * failure the floor exists for. Writes are recorded through a Proxy `set` trap on every file object plus
 * each mutating method, so a write the list below does not anticipate is still counted.
 */
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import {
  buildWritePlan, buildFloatWritePlan, buildFontVarPlan, buildStylesPlan, buildGridStylePlan, buildTextStylePlan,
} from '@prism3/engine/write-plan';
import { brandTheme, nbThemeFrom, type BrandInput } from '@prism3/engine/theme';
import nbMeasured from '@prism3/engine/schema/nb-measured.json';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { applyWritePlan, applyFloatPlan, applyVarCollectionPlan, beginMigration } from './src/write-figma';
import { applyStylesPlan } from './src/write-styles';
import { applyGridStylePlan } from './src/write-grid-styles';
import { applyTextStylePlan } from './src/write-text-styles';
import { guardApply, preflightPlanOf, conflictSummary, type PreflightPlan } from './src/preflight';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ---- the file shim: variables + four style kinds + root plugin data, every write recorded -------------
type VarType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
class FileShim {
  writes: string[] = [];
  collections: any[] = [];
  vars: any[] = [];
  styles: Record<'effect' | 'paint' | 'grid' | 'text', any[]> = { effect: [], paint: [], grid: [], text: [] };
  private seq = 0;
  private rootData = new Map<string, string>();
  root = {
    getSharedPluginData: (ns: string, k: string): string => this.rootData.get(`${ns}/${k}`) ?? '',
    setSharedPluginData: (ns: string, k: string, v: string): void => { this.writes.push(`root.${k}`); this.rootData.set(`${ns}/${k}`, v); },
  };
  /** Every file object goes through here: a property assignment on it is a write. */
  private track<T extends object>(label: string, o: T): T {
    return new Proxy(o, { set: (t, p, v) => { this.writes.push(`${label}.${String(p)}`); (t as any)[p] = v; return true; } });
  }
  private id(p: string): string { return `${p}${++this.seq}`; }

  // variables
  async getLocalVariableCollectionsAsync(): Promise<any[]> { return this.collections; }
  async getLocalVariablesAsync(type?: string): Promise<any[]> { return type ? this.vars.filter((v) => v.resolvedType === type) : this.vars; }
  createVariableCollection(name: string): any {
    this.writes.push(`createVariableCollection ${name}`);
    return this.addCollection(name);
  }
  createVariable(name: string, collection: any, resolvedType: VarType): any {
    this.writes.push(`createVariable ${name}`);
    return this.addVar(name, collection, resolvedType);
  }
  createVariableAlias(target: any): { type: 'VARIABLE_ALIAS'; id: string } { return { type: 'VARIABLE_ALIAS', id: target.id }; }

  // styles
  async getLocalEffectStylesAsync(): Promise<any[]> { return this.styles.effect; }
  async getLocalPaintStylesAsync(): Promise<any[]> { return this.styles.paint; }
  async getLocalGridStylesAsync(): Promise<any[]> { return this.styles.grid; }
  async getLocalTextStylesAsync(): Promise<any[]> { return this.styles.text; }
  createEffectStyle(): any { this.writes.push('createEffectStyle'); return this.addStyle('effect', ''); }
  createPaintStyle(): any { this.writes.push('createPaintStyle'); return this.addStyle('paint', ''); }
  createGridStyle(): any { this.writes.push('createGridStyle'); return this.addStyle('grid', ''); }
  createTextStyle(): any { this.writes.push('createTextStyle'); return this.addStyle('text', ''); }
  async loadFontAsync(): Promise<void> { /* every face "installed" — fonts are not what this test is about */ }
  get variables(): this { return this; }

  // seeding (not a write) — used to build a file BEFORE the counter is read
  addCollection(name: string, stamp?: 'stamp'): any {
    const shim = this;
    const c = {
      id: this.id('c'), name, modes: [] as { modeId: string; name: string }[], data: new Map<string, string>(),
      renameMode(modeId: string, n: string): void { shim.writes.push(`renameMode ${n}`); const m = this.modes.find((x: any) => x.modeId === modeId); if (m) m.name = n; },
      addMode(n: string): string { shim.writes.push(`addMode ${n}`); const modeId = shim.id('m'); this.modes.push({ modeId, name: n }); return modeId; },
      getSharedPluginData(ns: string, k: string): string { return this.data.get(`${ns}/${k}`) ?? ''; },
      setSharedPluginData(ns: string, k: string, v: string): void { shim.writes.push(`stamp ${this.name}`); this.data.set(`${ns}/${k}`, v); },
    };
    c.modes.push({ modeId: this.id('m'), name: 'Mode 1' });
    if (stamp) c.data.set('prism3/modes:owned', JSON.stringify(c.modes.map((m) => m.modeId)));
    const t = this.track(`collection ${name}`, c);
    this.collections.push(t);
    return t;
  }
  addVar(name: string, collection: any, resolvedType: VarType): any {
    const shim = this;
    const v = {
      id: this.id('v'), name, variableCollectionId: collection.id, resolvedType, scopes: [] as string[], description: '',
      hiddenFromPublishing: false, valuesByMode: {} as Record<string, unknown>,
      setValueForMode(modeId: string, value: any): void {
        shim.writes.push(`setValueForMode ${this.name}`);
        // Figma's own check: the value must match the variable's type (an alias is accepted here — the
        // host checks the alias target's type too, but the literal pass already throws first).
        const alias = value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS';
        const t = typeof value === 'number' ? 'FLOAT' : typeof value === 'string' ? 'STRING' : typeof value === 'boolean' ? 'BOOLEAN' : 'COLOR';
        if (!alias && t !== this.resolvedType) throw new Error(`in setValueForMode: Mismatched variable resolved type (${this.resolvedType}) and value type (${t})`);
        this.valuesByMode[modeId] = value;
      },
    };
    const t = this.track(`var ${name}`, v);
    this.vars.push(t);
    return t;
  }
  addStyle(kind: 'effect' | 'paint' | 'grid' | 'text', name: string, description = ''): any {
    const s = {
      name, description, effects: [], paints: [], layoutGrids: [], bound: {} as Record<string, string>,
      setBoundVariable(field: string, v: { name: string } | null): void { if (v) this.bound[field] = v.name; },
    };
    // `setBoundVariable` is a write too — record it through the proxy's own property path.
    const t = this.track(`${kind} style ${name}`, s);
    const orig = s.setBoundVariable.bind(t);
    s.setBoundVariable = (f, v) => { this.writes.push(`setBoundVariable ${f}`); orig(f, v); };
    this.styles[kind].push(t);
    return t;
  }
}

// ---- the plans + the apply, in main.ts's order -------------------------------------------------------
type Plans = ReturnType<typeof plansFor>;
const plansFor = (theme: ReturnType<typeof brandTheme>) => {
  const p = {
    color: buildWritePlan(buildFigmaColor(theme)),
    float: buildFloatWritePlan(theme),
    font: buildFontVarPlan(theme),
    styles: buildStylesPlan(theme),
    grid: buildGridStylePlan(theme),
    text: buildTextStylePlan(theme),
  };
  return { ...p, preflight: preflightPlanOf(p) as PreflightPlan };
};
const write = async (p: Plans, f: FileShim) => {
  const api = f as any;
  const mig = await beginMigration(api);
  const r = await applyWritePlan(p.color, api, mig);
  const fl = await applyFloatPlan(p.float, api, mig);
  const s = await applyStylesPlan(p.styles, api);
  const gs = await applyGridStylePlan(p.grid, api);
  const tv = await applyVarCollectionPlan(p.font, api, mig);
  const ts = await applyTextStylePlan(p.text, api);
  f.root.setSharedPluginData('prism3', 'brandInput', '{"stand-in":"persistInput"}');
  return {
    created: r.paletteCreated + r.colorCreated + fl.collections.reduce((n, c) => n + c.created, 0) +
      tv.collections.reduce((n, c) => n + c.created, 0) + s.effects.created + s.paints.created + gs.created + ts.created,
  };
};
// A throw from inside the guarded write is CAUGHT and returned as a failed result, so a guard that lets the
// write through fails the arms below by name rather than crashing the file before they report.
const guarded = async (p: Plans, f: FileShim) => {
  try { return await guardApply(p.preflight, f as any, () => write(p, f)); }
  catch (e) { return { ok: false as const, conflicts: [], threw: (e as Error).message }; }
};

console.log('plugin apply PRE-FLIGHT (#506 case c) — guardApply + the real executors against a recording file shim\n');

const brands = Object.entries(exampleBrands as Record<string, BrandInput>);
const [firstId, firstBrand] = brands[0];
const plans = plansFor(brandTheme(firstBrand));
const colorVar = plans.color.color.create[0].name;

// ── ZERO-WRITES: a same-named FLOAT variable where Prism3 writes COLOR ─────────────────────────────────
{
  // The collection carries the #1581 stamp, so provenance is NOT what fires here — the type check is.
  const seedTyped = (): FileShim => {
    const f = new FileShim();
    const col = f.addCollection('color', 'stamp');
    f.addVar(colorVar, col, 'FLOAT');
    f.writes = [];
    return f;
  };
  // Control: the same file, unguarded. The throw is real and it lands AFTER writes have happened.
  const bare = seedTyped();
  let threw = '';
  try { await write(plans, bare); } catch (e) { threw = (e as Error).message; }
  ok(/Mismatched variable resolved type/.test(threw) && bare.writes.length > 0,
    `control: UNGUARDED, the FLOAT/COLOR collision throws mid-write after ${bare.writes.length} writes (a partial apply)`);

  const f = seedTyped();
  const g = await guarded(plans, f);
  const typed = g.ok ? [] : g.conflicts.filter((c) => c.kind === 'variable' && c.name === colorVar);
  ok(!g.ok && typed.length === 1 && /FLOAT/.test(typed[0].detail) && /COLOR/.test(typed[0].detail),
    `zero-writes: the pre-flight reports "${colorVar}" as FLOAT where Prism3 writes COLOR${g.ok ? ' — it passed' : ''}`);
  ok(f.writes.length === 0,
    `zero-writes: the shim saw NO write of any kind (${f.writes.length}${f.writes.length ? `: ${f.writes.slice(0, 3).join(', ')}…` : ''})`);
  ok(!g.ok && conflictSummary(g.conflicts).startsWith('Nothing was written.') && conflictSummary(g.conflicts).includes(colorVar),
    'the designer-facing summary says nothing was written and names the variable');
}

// ── FOREIGN-ADOPT: a same-named collection with no provenance, and a hand-made same-named style ────────
{
  const f = new FileShim();
  const space = plans.float.find((c) => c.name === 'space') ?? plans.float[0];
  const foreign = f.addCollection(space.name);              // no stamp, and no persisted brand on the root
  f.addVar('mine/gap', foreign, 'FLOAT');
  const effectName = plans.styles.effects[0].name;
  f.addStyle('effect', effectName, 'our card shadow');       // a designer's description, not the engine's
  const modesBefore = JSON.stringify(foreign.modes);
  f.writes = [];
  const g = await guarded(plans, f);
  const conflicts = g.ok ? [] : g.conflicts;
  ok(conflicts.some((c) => c.kind === 'collection' && c.name === space.name),
    `foreign-adopt: a same-named "${space.name}" collection with no #1581 stamp is REPORTED, not adopted`);
  ok(conflicts.some((c) => c.kind === 'effect style' && c.name === effectName),
    `foreign-adopt: a same-named effect style "${effectName}" with a hand-typed description is reported`);
  ok(f.writes.length === 0 && JSON.stringify(foreign.modes) === modesBefore && f.vars.length === 1,
    `foreign-adopt: the foreign collection is untouched — modes, variables, and no write anywhere (${f.writes.length})`);
}

// ── IDEMPOTENT: a Prism3-provenance file re-applies clean, every committed brand ───────────────────────
const themes: [string, ReturnType<typeof brandTheme>][] = [
  ...brands.map(([id, input]) => [id, brandTheme(input)] as [string, ReturnType<typeof brandTheme>]),
  ['nb', nbThemeFrom(nbMeasured)],
];
for (const [id, theme] of themes) {
  const p = plansFor(theme);
  const f = new FileShim();
  const g1 = await guarded(p, f);
  const g2 = await guarded(p, f);
  const second = g2.ok ? g2.result.created : -1;
  ok(g1.ok && g1.result.created > 0 && g2.ok && second === 0,
    `idempotent (${id}): fresh apply passes (+${g1.ok ? g1.result.created : '✗'}), re-apply has 0 conflicts and creates 0` +
      (g2.ok ? '' : ` — ${conflictSummary(g2.conflicts, 3)}`));
}

// ── LEGACY: a pre-#1581 Prism3 file is presumed ours only while it carries the persisted brand ─────────
{
  const f = new FileShim();
  const g0 = await guarded(plans, f);
  for (const c of f.collections) c.data.clear();             // strip every #1581 stamp: a pre-#1581 file
  const legacy = await guardApply(plans.preflight, f as any, async () => 'wrote');
  ok(g0.ok && legacy.ok, `legacy (${firstId}): no stamps + the persisted brand on the root → presumed Prism3's, re-apply passes`);
  (f.root as any).setSharedPluginData('prism3', 'brandInput', '');
  const bare = await guardApply(plans.preflight, f as any, async () => 'wrote');
  ok(!bare.ok && bare.conflicts.some((c) => c.kind === 'collection'),
    'legacy: the same file with NO persisted brand has no provenance at all → its collections are conflicts');
}

console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ apply pre-flight: all checks passed');
process.exit(failed ? 1 : 0);
