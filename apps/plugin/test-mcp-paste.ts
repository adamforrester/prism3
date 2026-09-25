/**
 * MCP paste PARITY + SIZE gate (#111 / #1553).
 *
 *   npx tsx apps/plugin/test-mcp-paste.ts
 *
 * Proves the paste-in Apply Theme (`mcp-paste.ts` → numbered `use_figma` scripts, each running a bundle of
 * the plugin's own executors) leaves a file IDENTICAL to the plugin's Apply Theme (`apply-theme.ts`'s
 * `runApplyTheme`, the sequence `main.ts` runs), by running both against the same in-memory file model and
 * comparing everything the file holds afterward. The scripts are executed exactly as `use_figma` runs them
 * — as the body of an async function whose only binding is `figma` — so what is tested is the emitted text,
 * bundle and all, not the module it was built from.
 *
 * INDEPENDENCE (docs/34). The expected side is the plugin path, which does not go through the generator,
 * the bundler, the slicer or the runtime; the actual side goes through all four. The shim is shared on
 * purpose — it is the HOST, and both sides must write to the same host for "the same file" to mean
 * anything. Each arm compares one projection of the file and is named for it, so dropping one executor
 * call from the runtime (say `applyGridStylePlan`) fails "grid styles" and nothing that is not about grids.
 *
 * The arms, by name:
 *   · parity/<brand>: collections + modes · variables · values · aliases · scopes · effect styles ·
 *     paint styles · grid styles · text styles · mode stamps (#1581) · persisted brand (#131) · every step ok
 *   · idempotent/<brand>: a second paste run creates nothing and changes nothing
 *   · re-theme: brand A then brand B, both paths, same file
 *   · slicing: the plan cut into many more scripts than a real run leaves the same file
 *   · readback: the read-back scripts + `compareReadback` find nothing on a clean file, and name a
 *     changed value and a deleted style when one is planted
 *   · summary: `summarize` (report.ts's body) says PASS on a clean run and FAIL, by name, on a drift or a
 *     missing result
 *   · ledger: on a host that refuses shared plugin data, every step says so, the file is otherwise the
 *     plugin's, and the merged ledger is what lets a second run's pre-flight pass (without it, it refuses)
 *   · pre-flight: a foreign same-named collection is reported and nothing is written
 *   · cleanup: removes what the run made, keeps a foreign collection and a designer's style, by name
 *   · pack: the transport encoding round-trips every example brand's plans
 *   · components: dependency order, every script compiles, the `loadAllPagesAsync` adapter
 *   · size: every script for every example brand is ≤ SCRIPT_CEILING
 */
import { readFileSync, readdirSync } from 'node:fs';
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { runApplyTheme, themePlans } from './src/apply-theme';
import { pack, unpack, componentFigma } from './src/mcp-steps';
import type { StepReport, Ledger } from './src/mcp-steps';
import {
  themeScripts, themeCleanupScript, componentScripts, componentCleanupScripts, number, buildOrder, compareReadback,
  mergeLedgers, brandFromDesignMd, summarize, ENGINE_VERSION, SCRIPT_CEILING,
} from './mcp-paste';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/* ── the file model ─────────────────────────────────────────────────────────────────────────────────── */

type VarType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
type Opts = { refuseSharedData?: boolean };

/**
 * One Figma file: variables, the four style kinds, fonts, and shared plugin data on the root and on each
 * collection. What it models, it models because an executor depends on it:
 *   · `setValueForMode` enforces the variable's type (the #506 throw);
 *   · `createVariable` REFUSES a collection object it did not mint — the host validates that argument, and
 *     the ledger wrapper's `unwrap` exists for exactly this; a shim that accepted anything would let a
 *     wrapper reach the host and pass;
 *   · shared plugin data can be REFUSED (`refuseSharedData`), which is the ledger fallback's whole premise;
 *   · a font-family write re-resolves the text styles bound to it and throws on a face this RUN has not
 *     loaded (#680) — with `runScript` starting every script as a fresh run, which is what `use_figma` is.
 */
class FileShim {
  collections: any[] = [];
  vars: any[] = [];
  styles: Record<'effect' | 'paint' | 'grid' | 'text', any[]> = { effect: [], paint: [], grid: [], text: [] };
  private seq = 0;
  private minted = new WeakSet<object>();
  private rootData = new Map<string, string>();
  constructor(private opts: Opts = {}) {}
  private id(p: string): string { return `${p}:${++this.seq}`; }
  private shared(store: Map<string, string>) {
    const refuse = this.opts.refuseSharedData;
    return {
      getSharedPluginData: (ns: string, k: string): string => { if (refuse) throw new Error('not implemented'); return store.get(`${ns}/${k}`) ?? ''; },
      setSharedPluginData: (ns: string, k: string, v: string): void => {
        if (refuse) throw new Error('not implemented');
        if (v === '') store.delete(`${ns}/${k}`); else store.set(`${ns}/${k}`, v);
      },
    };
  }
  get root() { return this.shared(this.rootData); }
  rootRecord(): Record<string, string> { return Object.fromEntries(this.rootData); }
  get variables(): any { return this; }

  async getLocalVariableCollectionsAsync(): Promise<any[]> { return [...this.collections]; }
  async getLocalVariablesAsync(type?: string): Promise<any[]> { return type ? this.vars.filter((v) => v.resolvedType === type) : [...this.vars]; }
  createVariableCollection(name: string): any {
    const shim = this;
    const data = new Map<string, string>();
    const c: any = {
      id: this.id('VariableCollectionId'), name, modes: [{ modeId: this.id('mode'), name: 'Mode 1' }], data,
      renameMode(modeId: string, n: string) { const m = this.modes.find((x: any) => x.modeId === modeId); if (!m) throw new Error('no mode'); m.name = n; },
      addMode(n: string) { const modeId = shim.id('mode'); this.modes.push({ modeId, name: n }); return modeId; },
      removeMode(modeId: string) { this.modes = this.modes.filter((m: any) => m.modeId !== modeId); },
      remove() { shim.collections = shim.collections.filter((x) => x !== c); shim.vars = shim.vars.filter((v) => v.variableCollectionId !== c.id); },
      ...this.shared(data),
    };
    this.minted.add(c);
    this.collections.push(c);
    return c;
  }
  createVariable(name: string, collection: any, resolvedType: VarType): any {
    if (!this.minted.has(collection)) throw new Error('in createVariable: Expected a VariableCollection node');
    const shim = this;
    const v: any = {
      id: this.id('VariableID'), name, variableCollectionId: collection.id, resolvedType, scopes: ['ALL_SCOPES'], description: '',
      hiddenFromPublishing: false, valuesByMode: {} as Record<string, unknown>,
      setValueForMode(modeId: string, value: any) {
        const alias = value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS';
        const t = typeof value === 'number' ? 'FLOAT' : typeof value === 'string' ? 'STRING' : typeof value === 'boolean' ? 'BOOLEAN' : 'COLOR';
        if (!alias && t !== this.resolvedType) throw new Error(`in setValueForMode: Mismatched variable resolved type (${this.resolvedType}) and value type (${t})`);
        // #680: writing a family a text style is bound to makes the host re-resolve that style, and a face
        // not loaded IN THIS RUN throws. This is why every paste step preloads fonts: a `use_figma` call is
        // a fresh run (`runScript` clears `loaded`), so a face loaded by an earlier script does not count.
        if (!alias && t === 'STRING') {
          for (const st of shim.styles.text) {
            if (st.boundVariables.fontFamily?.id !== this.id) continue;
            const face = `${value}|${st.fontName.style}`;
            if (!shim.loaded.has(face)) throw new Error(`in setValueForMode: Cannot write to node with unloaded font "${value} ${st.fontName.style}"`);
          }
        }
        this.valuesByMode[modeId] = value;
      },
      remove() { shim.vars = shim.vars.filter((x) => x !== v); },
    };
    this.vars.push(v);
    return v;
  }
  createVariableAlias(target: any) { return { type: 'VARIABLE_ALIAS', id: target.id }; }

  async getLocalEffectStylesAsync() { return [...this.styles.effect]; }
  async getLocalPaintStylesAsync() { return [...this.styles.paint]; }
  async getLocalGridStylesAsync() { return [...this.styles.grid]; }
  async getLocalTextStylesAsync() { return [...this.styles.text]; }
  private style(kind: 'effect' | 'paint' | 'grid' | 'text'): any {
    const shim = this;
    const s: any = {
      id: this.id(`S:${kind}`), name: '', description: '', boundVariables: {} as Record<string, unknown>,
      ...(kind === 'text' ? { fontName: { family: 'Inter', style: 'Regular' }, fontSize: 12 } : {}),
      setBoundVariable(field: string, v: any) { if (v) this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id }; else delete this.boundVariables[field]; },
      remove() { shim.styles[kind] = shim.styles[kind].filter((x) => x !== s); },
    };
    this.styles[kind].push(s);
    return s;
  }
  createEffectStyle() { return this.style('effect'); }
  createPaintStyle() { return this.style('paint'); }
  createGridStyle() { return this.style('grid'); }
  createTextStyle() { return this.style('text'); }
  loaded = new Set<string>();
  faces: { family: string; style: string }[] = [];
  async loadFontAsync(f: { family: string; style: string }) {
    if (!this.faces.some((x) => x.family === f.family && x.style === f.style)) throw new Error(`The font "${f.family} ${f.style}" could not be loaded`);
    this.loaded.add(`${f.family}|${f.style}`);
  }
  async listAvailableFontsAsync() { return this.faces.map((fontName) => ({ fontName })); }
}

/** Every face the example brands' text plans ask for, so no text style is skipped for want of a font. */
const allFaces = (inputs: BrandInput[]) => {
  const out = new Map<string, { family: string; style: string }>();
  for (const i of inputs) for (const r of themePlans(i).textPlan) out.set(`${r.fontFamilyPrimary}|${r.fontStyle}`, { family: r.fontFamilyPrimary, style: r.fontStyle });
  return [...out.values()];
};

/** The file, reduced to plain data with every id replaced by a name — ids differ between two shims. */
const snapshot = (f: FileShim) => {
  const colById = new Map(f.collections.map((c) => [c.id, c] as const));
  const varById = new Map(f.vars.map((v) => [v.id, v] as const));
  const modeName = (c: any, id: string) => c.modes.find((m: any) => m.modeId === id)?.name ?? `?${id}`;
  const val = (x: any) => (x && typeof x === 'object' && x.type === 'VARIABLE_ALIAS' ? { alias: varById.get(x.id)?.name ?? `?${x.id}` } : x);
  const bound = (b: Record<string, any>) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, val(v)]).sort());
  const deep = (x: any): any => {
    if (Array.isArray(x)) return x.map(deep);
    if (x && typeof x === 'object') {
      if (x.type === 'VARIABLE_ALIAS') return val(x);
      return Object.fromEntries(Object.entries(x).filter(([, v]) => typeof v !== 'function').map(([k, v]) => [k, deep(v)]).sort(([a], [b]) => (a < b ? -1 : 1)));
    }
    return x;
  };
  const collections = f.collections.map((c) => {
    let owned: string[] = [];
    try { owned = JSON.parse(c.data.get('prism3/modes:owned') ?? '[]').map((id: string) => modeName(c, id)).sort(); } catch { owned = ['<unparseable>']; }
    return { name: c.name, modes: c.modes.map((m: any) => m.name), owned };
  }).sort((a, b) => (a.name < b.name ? -1 : 1));
  const variables = f.vars.map((v) => {
    const c = colById.get(v.variableCollectionId);
    return {
      key: `${c?.name}/${v.name}`, type: v.resolvedType, scopes: [...v.scopes], hidden: v.hiddenFromPublishing, description: v.description,
      values: Object.fromEntries(Object.entries(v.valuesByMode).map(([m, x]) => [modeName(c, m), val(x)]).sort()),
    };
  }).sort((a, b) => (a.key < b.key ? -1 : 1));
  const styles = Object.fromEntries((['effect', 'paint', 'grid', 'text'] as const).map((k) => [k, f.styles[k].map((s) => {
    const { id: _id, boundVariables, ...rest } = s;
    return { ...deep(rest), boundVariables: bound(boundVariables) };
  }).sort((a: any, b: any) => (a.name < b.name ? -1 : 1))]));
  return { collections, variables, styles, root: f.rootRecord() };
};
type Snap = ReturnType<typeof snapshot>;
const J = (x: unknown) => JSON.stringify(x);

/** Run a script exactly as `use_figma` does: the body of an async function whose one binding is `figma`. */
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...a: string[]) => (f: unknown) => Promise<StepReport>;
const runScript = async (js: string, f: FileShim): Promise<StepReport> => {
  f.loaded = new Set();   // a fresh plugin run: nothing loaded by an earlier call survives into this one
  return new AsyncFunction('figma', js)(f);
};
const runAll = async (scripts: { js: string }[], f: FileShim): Promise<StepReport[]> => {
  const out: StepReport[] = [];
  for (const s of scripts) out.push(await runScript(s.js, f));
  return out;
};
const writes = (input: BrandInput, ledger?: Ledger) => number(themeScripts(input, { ledger })).filter((s) => s.phase === 'preflight' || s.phase === 'theme');
const readbacks = (input: BrandInput, ledger?: Ledger) => number(themeScripts(input, { ledger })).filter((s) => s.phase === 'readback');

/** First differing element, for a failure message that points somewhere. */
const firstDiff = (a: unknown[], b: unknown[]): string => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (J(a[i]) !== J(b[i])) return ` — first difference at #${i}: plugin ${J(a[i])?.slice(0, 160)} vs paste ${J(b[i])?.slice(0, 160)}`;
  return '';
};

/** The named projections compared by the parity arms — one per thing an executor writes. */
const arms = (a: Snap, b: Snap, plans: ReturnType<typeof themePlans>): [string, boolean, string][] => {
  // An arm may be empty on both sides only when the PLAN emits nothing for it (nb-redesign has no
  // gradients); an arm empty where the plan has rows would be two empty files agreeing, which proves nothing.
  const planned: Record<string, number> = {
    'effect styles': plans.stylesPlan.effects.length, 'paint styles': plans.stylesPlan.paints.length,
    'grid styles': plans.gridPlan.length, 'text styles': plans.textPlan.length,
  };
  const proj = (s: Snap, f: (v: Snap['variables'][number]) => unknown) => s.variables.map((v) => [v.key, f(v)]);
  const pairs: [string, unknown[], unknown[]][] = [
    ['collections + modes', a.collections.map((c) => [c.name, c.modes]), b.collections.map((c) => [c.name, c.modes])],
    ['variables (names + types)', proj(a, (v) => v.type), proj(b, (v) => v.type)],
    ['literal values', proj(a, (v) => Object.entries(v.values).filter(([, x]) => !(x && typeof x === 'object' && 'alias' in x))), proj(b, (v) => Object.entries(v.values).filter(([, x]) => !(x && typeof x === 'object' && 'alias' in x)))],
    ['aliases', proj(a, (v) => Object.entries(v.values).filter(([, x]) => x && typeof x === 'object' && 'alias' in x)), proj(b, (v) => Object.entries(v.values).filter(([, x]) => x && typeof x === 'object' && 'alias' in x))],
    ['scopes + hidden + descriptions', proj(a, (v) => [v.scopes, v.hidden, v.description]), proj(b, (v) => [v.scopes, v.hidden, v.description])],
    ['effect styles', a.styles.effect, b.styles.effect],
    ['paint styles', a.styles.paint, b.styles.paint],
    ['grid styles', a.styles.grid, b.styles.grid],
    ['text styles', a.styles.text, b.styles.text],
    ['mode stamps (#1581)', a.collections.map((c) => [c.name, c.owned]), b.collections.map((c) => [c.name, c.owned])],
    ['persisted brand (#131)', Object.entries(a.root), Object.entries(b.root)],
  ];
  return pairs.map(([name, x, y]) => {
    const emptyOk = planned[name] === 0;
    return [name, J(x) === J(y) && (x.length > 0 || emptyOk), J(x) === J(y) ? (x.length ? '' : emptyOk ? ' (the plan emits none)' : ' — EMPTY on both sides while the plan has rows, which proves nothing') : firstDiff(x, y)];
  });
};

/** One section of the suite. A throw inside it is a FAILURE BY NAME, and the sections after it still run —
 *  a harness that dies cannot say which assertion it would have failed (docs/34). */
const section = async (name: string, fn: () => Promise<void>): Promise<void> => {
  try { await fn(); } catch (e) { ok(false, `${name}: the section threw — ${(e as Error)?.message ?? String(e)}`); }
};

/* ── the brands ─────────────────────────────────────────────────────────────────────────────────────── */

const EXAMPLES = new URL('../../packages/engine/examples/', import.meta.url);
const designMd = (id: string): BrandInput => brandFromDesignMd(readFileSync(new URL(`${id}.design.md`, EXAMPLES), 'utf8'));
const ALL_BRANDS: [string, BrandInput][] = [
  ...readdirSync(EXAMPLES).filter((f) => f.endsWith('.design.md')).map((f) => f.replace('.design.md', '')).map((id) => [`${id}.design.md`, designMd(id)] as [string, BrandInput]),
  ...Object.entries(exampleBrands as Record<string, BrandInput>).map(([id, b]) => [`example-brands.json#${id}`, b] as [string, BrandInput]),
];
const FACES = allFaces(ALL_BRANDS.map(([, b]) => b));
const fresh = (opts: Opts = {}) => { const f = new FileShim(opts); f.faces = FACES; return f; };
const PARITY: [string, BrandInput][] = [['nb-redesign', designMd('nb-redesign')], ['aurora', designMd('aurora')]];

console.log('MCP paste (#111/#1553) — the paste-in Apply Theme against the plugin\'s own, on one file model\n');

/* ── parity ─────────────────────────────────────────────────────────────────────────────────────────── */

for (const [id, input] of PARITY) { await section(`parity/${id}`, async () => {
  const A = fresh();
  const plugin = await runApplyTheme(input, A as any);
  ok(plugin.guarded.ok, `parity/${id}: the plugin path applied cleanly (control)`);
  const B = fresh();
  const scripts = writes(input);
  const results = await runAll(scripts, B);
  const bad = results.filter((r) => !r.ok);
  ok(bad.length === 0, `parity/${id}: every paste step reports ok (${scripts.length} scripts)${bad.length ? ` — ${bad.map((r) => `${r.label}: ${r.threw ?? J(r.misses ?? r.conflicts)}`.slice(0, 200)).join('; ')}` : ''}`);
  ok(results.every((r) => r.shared.mode === 'live'), `parity/${id}: every step found shared plugin data live on this host`);
  const [sa, sb] = [snapshot(A), snapshot(B)];
  for (const [name, pass, why] of arms(sa, sb, themePlans(input))) ok(pass, `parity/${id}: ${name}${why}`);

  // IDEMPOTENT — a second paste run over the same file.
  const again = await runAll(scripts, B);
  const created = again.reduce((n, r) => n + (r.created ?? 0), 0);
  ok(created === 0 && again.every((r) => r.ok), `idempotent/${id}: a second paste run creates nothing and every step is ok (created ${created})`);
  ok(J(snapshot(B)) === J(sb), `idempotent/${id}: a second paste run leaves the file byte-identical`);

  // READ-BACK — clean, then with a planted value change and a deleted style.
  const p = themePlans(input);
  const rb = await runAll(readbacks(input), B);
  const clean = compareReadback(p, rb);
  ok(clean.findings.length === 0 && clean.coverage.read === clean.coverage.total && clean.coverage.total > 0,
    `readback/${id}: the read-back matches the plan with no findings (${clean.coverage.read}/${clean.coverage.total} variables read)${clean.findings.length ? ` — ${clean.findings.slice(0, 3).map((x) => `${x.category} ${x.name}: ${x.detail}`).join('; ')}` : ''}`);
  // Planted on whatever the paste wrote; if it wrote nothing, the two arms below fail by name rather than
  // the suite dying on an undefined target (the parity arms above already say why).
  const target = B.vars.find((v) => v.resolvedType === 'FLOAT' && Object.values(v.valuesByMode).some((x) => typeof x === 'number'));
  const mode = target && Object.keys(target.valuesByMode).find((m) => typeof target.valuesByMode[m] === 'number');
  if (target && mode) target.valuesByMode[mode] = (target.valuesByMode[mode] as number) + 7;
  const goneStyle = B.styles.text[0];
  goneStyle?.remove();
  const dirty = compareReadback(p, await runAll(readbacks(input), B));
  ok(!!target && dirty.findings.some((x) => x.category === 'value' && x.name === target.name), `readback/${id}: a changed value is reported by name (${target?.name ?? 'no FLOAT variable to change'})`);
  ok(!!goneStyle && dirty.findings.some((x) => x.category === 'missing text style' && x.name === goneStyle.name), `readback/${id}: a deleted text style is reported by name (${goneStyle?.name ?? 'no text style to delete'})`);
}); }

/* ── re-theme: one brand over another ───────────────────────────────────────────────────────────────── */
await section('re-theme', async () => {
  const [[, first], [, second]] = PARITY;
  const A = fresh();
  await runApplyTheme(first, A as any);
  const g = await runApplyTheme(second, A as any);
  const B = fresh();
  await runAll(writes(first), B);
  const res = await runAll(writes(second), B);
  ok(g.guarded.ok === res.filter((r) => r.kind === 'preflight').every((r) => r.ok), 're-theme: the plugin and the paste pre-flight agree on the second brand');
  for (const [name, pass, why] of arms(snapshot(A), snapshot(B), themePlans(second))) ok(pass, `re-theme: ${name}${why}`);
});

/* ── slicing: the file does not depend on where the plan is cut ────────────────────────────────────── */
await section('slicing', async () => {
  // A real run cuts the float aliases into ONE script today, so the rule that every float alias script
  // carries EVERY float collection (`applyFloatPlan` resolves aliases only among the collections in its
  // call, and `space` aliases into `core`) would go unexercised. Cutting to a far lower ceiling puts the
  // aliases in several scripts, most of them without `core`'s own alias rows.
  const [id, input] = PARITY[1];
  const A = fresh();
  await runApplyTheme(input, A as any);
  const B = fresh();
  const scripts = number(themeScripts(input, { sliceCeiling: 29_500 })).filter((s) => s.phase === 'preflight' || s.phase === 'theme');
  const floatAliasScripts = scripts.filter((s) => s.label.startsWith('float aliases')).length;
  ok(floatAliasScripts >= 3, `slicing/${id}: a 29,500-character slice ceiling cuts the float aliases into ${floatAliasScripts} scripts (${scripts.length} in all)`);
  const res = await runAll(scripts, B);
  ok(res.every((r) => r.ok), `slicing/${id}: every step of the finely-cut run is ok${res.filter((r) => !r.ok).slice(0, 2).map((r) => ` — ${r.label}: ${r.threw ?? J(r.misses).slice(0, 120)}`).join('')}`);
  for (const [name, pass, why] of arms(snapshot(A), snapshot(B), themePlans(input))) ok(pass, `slicing/${id}: ${name}${why}`);
});

/* ── the run summary (report.ts's body) ─────────────────────────────────────────────────────────────── */
await section('summary', async () => {
  const [id, input] = PARITY[1];
  const B = fresh();
  const scripts = number(themeScripts(input));
  const manifest = { brandInput: input, engineVersion: ENGINE_VERSION, scripts: scripts.map((s, i) => ({ ...s, order: i + 1 })) };
  const results = new Map<number, StepReport>();
  for (const [i, s] of scripts.entries()) results.set(i + 1, await runScript(s.js, B));
  const clean = summarize(manifest, results);
  ok(clean.verdict === 'PASS' && clean.fail.length === 0, `summary/${id}: a clean run summarizes as PASS${clean.fail.length ? ` — ${clean.fail[0]}` : ''}`);
  // Plant a drift the read-back must catch, re-read, and drop one result.
  const drifted = B.vars.find((v) => v.resolvedType === 'COLOR' && Object.values(v.valuesByMode).some((x: any) => x && x.r !== undefined));
  const m0 = drifted && Object.keys(drifted.valuesByMode).find((m) => (drifted.valuesByMode[m] as any)?.r !== undefined);
  if (drifted && m0) drifted.valuesByMode[m0] = { r: 0.5, g: 0.25, b: 0.125, a: 1 };
  for (const [i, s] of scripts.entries()) if (s.phase === 'readback') results.set(i + 1, await runScript(s.js, B));
  results.delete(3);
  const dirty = summarize(manifest, results);
  ok(dirty.verdict === 'FAIL' && dirty.fail.some((l) => l.includes('value') && !!drifted && l.includes(drifted.name)), `summary/${id}: a drifted value makes the summary FAIL and names the variable (${drifted?.name ?? 'none found'})`);
  ok(dirty.fail.some((l) => l.includes('have no result') && l.includes('#3')), `summary/${id}: a missing result makes the summary FAIL and names the script`);
});

/* ── pre-flight refuses a foreign file and writes nothing ───────────────────────────────────────────── */
await section('pre-flight', async () => {
  const [id, input] = PARITY[1];
  const B = fresh();
  const foreign = B.createVariableCollection('color');   // same name, no #1581 stamp, no persisted brand
  B.createVariable('designer/own', foreign, 'FLOAT');
  const before = J(snapshot(B));
  const pf = await runAll(writes(input).filter((s) => s.phase === 'preflight'), B);
  const conflicts = pf.flatMap((r) => (r.conflicts as { kind: string; name: string }[]) ?? []);
  ok(conflicts.some((c) => c.kind === 'collection' && c.name === 'color') && pf.some((r) => !r.ok), `pre-flight/${id}: a foreign same-named 'color' collection is reported as a conflict`);
  ok(J(snapshot(B)) === before, `pre-flight/${id}: the pre-flight scripts wrote nothing`);
});

/* ── ledger: a host that refuses shared plugin data ─────────────────────────────────────────────────── */
await section('ledger', async () => {
  const [id, input] = PARITY[1];
  const A = fresh();
  await runApplyTheme(input, A as any);
  const C = fresh({ refuseSharedData: true });
  const res = await runAll(writes(input), C);
  ok(res.every((r) => r.shared.mode === 'ledger'), `ledger/${id}: every step reports ledger mode on a host that refuses shared plugin data`);
  ok(res.every((r) => r.ok), `ledger/${id}: every step still succeeds${res.filter((r) => !r.ok).map((r) => ` — ${r.label}: ${r.threw}`).join('')}`);
  const sa = snapshot(A);
  const sc = snapshot(C);
  const strip = (s: Snap) => ({ ...s, collections: s.collections.map((c) => ({ ...c, owned: [] })), root: {} });
  ok(J(strip(sa)) === J(strip(sc)), `ledger/${id}: apart from the two provenance records, the file is the plugin's`);
  const ledger = mergeLedgers(res)!;
  const stamped = C.collections.filter((c) => (ledger.collections[c.id]?.data['prism3/modes:owned'] ?? '') !== '');
  ok(stamped.length === C.collections.length && C.collections.length > 0, `ledger/${id}: the merged ledger stamps every collection the run wrote (${stamped.length}/${C.collections.length})`);
  ok(!!ledger.root['prism3/brandInput'], `ledger/${id}: the merged ledger carries the persisted brand`);
  // The stamp the ledger holds names the same modes the live stamp would.
  const ledgerOwned = C.collections.map((c) => [c.name, (JSON.parse(ledger.collections[c.id]?.data['prism3/modes:owned'] ?? '[]') as string[]).map((m) => c.modes.find((x: any) => x.modeId === m)?.name).sort()]).sort();
  ok(J(ledgerOwned) === J(sa.collections.map((c) => [c.name, c.owned])), `ledger/${id}: the ledger's mode stamps match the plugin's live stamps`);
  const without = await runAll(writes(input).filter((s) => s.phase === 'preflight'), C);
  ok(without.some((r) => !r.ok), `ledger/${id}: WITHOUT the ledger, a second run's pre-flight refuses the file it just wrote (the fallback is load-bearing)`);
  const withLedger = await runAll(writes(input, ledger).filter((s) => s.phase === 'preflight'), C);
  ok(withLedger.every((r) => r.ok), `ledger/${id}: WITH the merged ledger baked in, the second run's pre-flight passes`);
});

/* ── cleanup ────────────────────────────────────────────────────────────────────────────────────────── */
await section('cleanup', async () => {
  const [id, input] = PARITY[1];
  const B = fresh();
  await runAll(writes(input), B);
  const theirs = B.createVariableCollection('designer tokens');
  B.createVariable('mine/one', theirs, 'FLOAT');
  // UNSTAMPED but entirely under the brand's root — so only the stamp, not the namespace guard, keeps it.
  const root = themePlans(input).colorPlan.palette[0].name.split('/')[0];
  const lookalike = B.createVariableCollection('legacy import');
  B.createVariable(`${root}/legacy/one`, lookalike, 'FLOAT');
  const planned = themePlans(input).textPlan[0].name;
  const own = B.styles.text.find((s) => s.name === planned)!;
  own.description = 'hand-written by a designer';
  const r = await runScript(number([themeCleanupScript(input)])[0].js, B);
  ok(J(B.collections.map((c) => c.name).sort()) === J(['designer tokens', 'legacy import']), `cleanup/${id}: every stamped collection goes; an unstamped one stays even when its variables sit under '${root}/' (left: ${B.collections.map((c) => c.name).join(', ')})`);
  ok(B.styles.text.length === 1 && B.styles.text[0].name === planned, `cleanup/${id}: a planned-name style with a designer's description stays, the engine's go`);
  ok(B.styles.effect.length + B.styles.paint.length + B.styles.grid.length === 0, `cleanup/${id}: every engine effect, paint and grid style goes`);
  ok(B.root.getSharedPluginData('prism3', 'brandInput') === '', `cleanup/${id}: the persisted brand is cleared`);
  ok(((r.kept as string[]) ?? []).some((k) => k.includes('designer tokens')), `cleanup/${id}: the result says what it kept and why`);
});

/* ── pack ───────────────────────────────────────────────────────────────────────────────────────────── */
for (const [id, input] of ALL_BRANDS) { await section(`pack/${id}`, async () => {
  const { theme: _t, ...plans } = themePlans(input);
  const normal = JSON.parse(J(plans));
  ok(J(unpack(JSON.parse(J(pack(normal))))) === J(normal), `pack/${id}: the columnar transport round-trips every plan`);
}); }

/* ── components ─────────────────────────────────────────────────────────────────────────────────────── */
await section('components', async () => {
  const input = PARITY[1][1];
  // Button swaps to `icon/FPO-default-icon` and nests `focus-ring` — named here from the def's own anatomy
  // rather than from `missingDependencies`, which is the function under test.
  const order = buildOrder(input, ['button']).map((d) => d.id);
  ok(order[order.length - 1] === 'button' && order.includes('icon') && order.includes('focus-ring') && order.length === 3,
    `components: building 'button' schedules what it swaps to (icon) and nests (focus-ring) first (${order.join(' → ')})`);
  const all = buildOrder(input, 'all').map((d) => d.id);
  ok(all.indexOf('icon') < all.indexOf('button') && new Set(all).size === all.length, `components: 'all' is deduplicated and dependency-ordered (${all.length} defs)`);
  const scripts = number([...componentScripts(input, 'all'), ...componentCleanupScripts(input, 'all')]);
  const broken = scripts.filter((s) => { try { new AsyncFunction('figma', s.js); return false; } catch { return true; } });
  ok(broken.length === 0, `components: every one of ${scripts.length} component scripts compiles as a use_figma body${broken.length ? ` — ${broken[0].label}` : ''}`);

  // The loadAllPagesAsync adapter, against a host that refuses it and guards root searches behind it.
  const page = (name: string, kids: { name: string; type: string }[]) => {
    let loaded = false;
    return {
      name, async loadAsync() { loaded = true; },
      findAllWithCriteria: (c: { types: string[] }) => { if (!loaded) throw new Error('page not loaded'); return kids.filter((k) => c.types.includes(k.type)); },
      findAll: (fn: (n: unknown) => boolean) => { if (!loaded) throw new Error('page not loaded'); return kids.filter(fn); },
    };
  };
  const refusing: any = {
    root: { children: [page('A', [{ name: 'icon/x', type: 'COMPONENT' }]), page('B', [{ name: 'button', type: 'COMPONENT_SET' }])], findAllWithCriteria: () => { throw new Error('Cannot call with documentAccess: dynamic-page'); }, findAll: () => { throw new Error('Cannot call with documentAccess: dynamic-page'); } },
    async loadAllPagesAsync() { throw new Error('not implemented'); },
  };
  const notes: { loadAllPages?: string } = {};
  const fx = componentFigma(refusing, notes);
  await fx.loadAllPagesAsync();
  // Caught, so a regression fails the arm BY NAME instead of taking the whole suite down with it.
  const attempt = (f: () => string[]): string[] => { try { return f(); } catch (e) { return [`THREW: ${(e as Error).message}`]; } };
  const found = attempt(() => (fx.root as any).findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).map((n: any) => n.name));
  ok(J(found) === J(['icon/x', 'button']) && /^per-page/.test(notes.loadAllPages ?? ''), `components: with loadAllPagesAsync refused, the adapter loads each page and the root search spans them (${found.join(', ')}; ${notes.loadAllPages})`);
  const swapFound = attempt(() => (fx.root as any).findAll((n: any) => n.name === 'button').map((n: any) => n.name));
  ok(J(swapFound) === J(['button']), `components: the swap-diagnosis search (root.findAll) spans the loaded pages too (${swapFound.join(', ')})`);
  const native: any = { root: { children: [], findAllWithCriteria: () => [{ name: 'native' }] }, async loadAllPagesAsync() {} };
  const n2: { loadAllPages?: string } = {};
  const fn = componentFigma(native, n2);
  await fn.loadAllPagesAsync();
  ok(J((fn.root as any).findAllWithCriteria({ types: ['COMPONENT'] })) === J([{ name: 'native' }]) && n2.loadAllPages === 'native', 'components: where loadAllPagesAsync works, nothing is adapted — the native root search runs');
});

/* ── size ───────────────────────────────────────────────────────────────────────────────────────────── */
for (const [id, input] of ALL_BRANDS) { await section(`size/${id}`, async () => {
  const scripts = number([...themeScripts(input), themeCleanupScript(input), ...componentScripts(input, 'all'), ...componentCleanupScripts(input, 'all')]);
  const worst = scripts.reduce((w, s) => (s.js.length > w.js.length ? s : w));
  const over = scripts.filter((s) => s.js.length > SCRIPT_CEILING);
  ok(over.length === 0, `size/${id}: all ${scripts.length} scripts are ≤ ${SCRIPT_CEILING} characters (largest: ${worst.label}, ${worst.js.length})${over.length ? ` — OVER: ${over.map((s) => `${s.label} ${s.js.length}`).join(', ')}` : ''}`);
}); }

console.log(failed ? `\n${failed} FAILED` : '\nmcp-paste: all assertions pass');
process.exit(failed ? 1 : 0);
