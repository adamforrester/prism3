/**
 * The MCP paste RUNTIME (#111 / #1553) — what runs inside each `use_figma` script, bundled by
 * `mcp-paste.ts` with esbuild into an IIFE that takes its plan chunk as data.
 *
 * WHY A BUNDLE OF THE PLUGIN'S OWN EXECUTORS, NOT A SECOND WRITER. The engine already had a hand-written
 * paste path for variables (`materialise-to-figma.ts`), and every executor fix since — the #680 font
 * preload, the #1581 mode stamp, the #1013 rename pass, the #506 pre-flight — had to be made twice or was
 * not made there at all. Here every step calls the executor the plugin calls (`write-figma.ts`,
 * `write-styles.ts`, `write-grid-styles.ts`, `write-text-styles.ts`, `preflight.ts`, `preload-fonts.ts`,
 * `persist-figma.ts`), bound to the host through the same `theme-ports.ts` adapters `apply-theme.ts` uses.
 * What differs is only WHERE the sequence is cut: the plugin runs one apply in one call; a `use_figma` call
 * is capped at 50,000 characters, so the same executors run one plan slice per script, in the plugin's
 * order. `test-mcp-paste.ts` compares the two files that result.
 *
 * ── THE MCP RUNTIME, CHECKED API BY API ───────────────────────────────────────────────────────────────
 * The Figma MCP's own guidance (the `figma-use` skill, 2026-09) lists what `use_figma` does not support:
 * `figma.notify`, `figma.loadAllPagesAsync`, `setPluginData`, `createImageAsync`, the sync `currentPage`
 * setter. Against the theme executors: none of them calls any of those — they use `figma.variables.*`,
 * `getLocal*StylesAsync`, `create*Style`, `loadFontAsync`, `listAvailableFontsAsync`, and SHARED plugin
 * data (`get/setSharedPluginData`) for the #1581 mode stamp and the #131 persisted brand. The guidance is
 * silent on shared plugin data, so this runtime does not assume either answer — see `hostOf`.
 * The component payloads DO call `figma.loadAllPagesAsync` and `figma.root.findAll*`; `componentFigma`
 * adapts those without editing the engine's payload text.
 *
 * Compiled under `tsconfig.main.json` (plugin-typings, no `dom`), so the global `figma` is typed and
 * `const host: ThemeHost = figma` below is a compile-time proof that the real host satisfies every port.
 */
import { applyWritePlan, applyFloatPlan, applyVarCollectionPlan, beginMigration, ownedModeIds } from './write-figma';
import type { VarCollection, Migration, Variable } from './write-figma';
import { applyStylesPlan } from './write-styles';
import { applyGridStylePlan } from './write-grid-styles';
import { applyTextStylePlan } from './write-text-styles';
import { preflightApply } from './preflight';
import type { PreflightPlan } from './preflight';
import { preloadFonts } from './preload-fonts';
import type { FontPreloadResult } from './preload-fonts';
import { persistInput } from './persist-figma';
import { isEngineDescription } from './prune-figma';
import type { StyleKind } from './prune-figma';
import { resolveComponentPage } from './file-setup';
import type { PagesApi } from './file-setup';
import { fontPreloadApiOf, preflightApiOf, textApiOf } from './theme-ports';
import type { ThemeHost } from './theme-ports';
import type { WritePlan, FloatCollectionPlan, VarCollectionPlan, StylesPlan, GridStylePlan, TextStylePlan } from '@prism3/engine/write-plan';
import type { BrandInput } from '@prism3/engine/theme';

/* ── transport ─────────────────────────────────────────────────────────────────────────────────────── */

/**
 * COLUMNAR PACKING — a lossless transport encoding, nothing more. Plan rows are arrays of objects with the
 * same keys, and the keys are most of the bytes (`valuesByMode`, `description`, `hiddenFromPublishing` on
 * every row). An array of ≥2 plain objects sharing one key list becomes `{ $k: keys, $r: rows-of-values }`.
 * `pack` runs in Node on JSON-normal data (no `undefined`); `unpack` runs in the script. The round trip is
 * asserted on every example brand's plans in `test-mcp-paste.ts`, so a lossy change fails by name.
 */
const K = '$k';
const R = '$r';
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const pack = (v: unknown): unknown => {
  if (Array.isArray(v)) {
    if (v.length >= 2 && v.every(isObj)) {
      const keys = Object.keys(v[0] as Record<string, unknown>);
      const same = v.every((o) => { const k = Object.keys(o as Record<string, unknown>); return k.length === keys.length && k.every((x, i) => x === keys[i]); });
      if (same && !keys.includes(K) && !keys.includes(R)) return { [K]: keys, [R]: v.map((o) => keys.map((k) => pack((o as Record<string, unknown>)[k]))) };
    }
    return v.map(pack);
  }
  if (isObj(v)) {
    if (K in v || R in v) throw new Error(`pack: an object already carries the transport key ${K}/${R}`);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, pack(x)]));
  }
  return v;
};
export const unpack = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(unpack);
  if (isObj(v)) {
    if (Array.isArray(v[K]) && Array.isArray(v[R])) {
      const keys = v[K] as string[];
      return (v[R] as unknown[][]).map((row) => Object.fromEntries(keys.map((k, i) => [k, unpack(row[i])])));
    }
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unpack(x)]));
  }
  return v;
};

/* ── shared plugin data: live, or the ledger fallback ──────────────────────────────────────────────── */

/**
 * The fallback for a host that refuses SHARED plugin data. Two records live there today, and both are
 * provenance: the #1581 mode stamp on each collection (read by the pre-flight to tell Prism3's collection
 * from a designer's) and the #131 persisted brand on the root (read by the pre-flight's legacy
 * presumption, and by the component build to pick the brand's levers). If `use_figma` refuses them, a
 * second run's pre-flight would read the first run's collections as someone else's and refuse — so the
 * records are kept OUTSIDE the file instead, in this ledger: every step returns the entries it wrote, the
 * agent merges them (`report.ts --ledger-out`), and the next `plan.ts --ledger` bakes them back into the
 * scripts so the pre-flight reads what a live stamp would have said. Keyed by collection ID, which is stable
 * within one file — a ledger is only ever valid for the file it came from, and the runbook says so.
 */
export type Ledger = {
  root: Record<string, string>;
  collections: Record<string, { name: string; data: Record<string, string> }>;
};
export type SharedDataMode = { mode: 'live' } | { mode: 'ledger'; reason: string };

const PROBE_KEY = 'mcp:probe';

/** Does a shared-plugin-data write round-trip on this host? Probes the ROOT (the #131 record's home) with a
 *  key under Prism3's own namespace, and clears it. Any throw, or a value that does not come back, is a no. */
export const probeSharedData = (root: { getSharedPluginData(ns: string, k: string): string; setSharedPluginData(ns: string, k: string, v: string): void }): string | null => {
  try {
    root.setSharedPluginData('prism3', PROBE_KEY, '1');
    const back = root.getSharedPluginData('prism3', PROBE_KEY);
    root.setSharedPluginData('prism3', PROBE_KEY, '');
    return back === '1' ? null : `a probe value did not round-trip (read back ${JSON.stringify(back)})`;
  } catch (e) {
    return (e as Error)?.message ?? String(e);
  }
};

type LedgerCollection = VarCollection & { readonly real: VarCollection };

/**
 * The host every theme step writes through. LIVE is the global `figma`, unwrapped — the same object the
 * plugin hands its executors, so on a host that supports shared plugin data the paste path makes exactly
 * the plugin's calls. LEDGER wraps only the two shared-data members (on the root and on each collection)
 * and forwards everything else; `createVariable` unwraps the collection it is handed, because the host
 * validates that argument as its own object.
 */
export const hostOf = (ledgerIn: Ledger | undefined): { host: ThemeHost; shared: SharedDataMode; ledger: Ledger | null } => {
  // Assigned through the port type: this line is the compile-time proof that the real `figma` satisfies
  // `ThemeHost`, the same proof `main.ts` gives for `apply-theme.ts`.
  const live: ThemeHost = figma;
  const reason = probeSharedData(figma.root);
  if (reason === null) return { host: live, shared: { mode: 'live' }, ledger: null };

  const ledger: Ledger = JSON.parse(JSON.stringify(ledgerIn ?? { root: {}, collections: {} }));
  const fv = live.variables;
  const wrap = (c: VarCollection): LedgerCollection => ({
    real: c,
    get id() { return c.id; },
    get name() { return c.name; },
    set name(n: string) { c.name = n; },
    get modes() { return c.modes; },
    renameMode: (modeId: string, n: string) => c.renameMode(modeId, n),
    addMode: (n: string) => c.addMode(n),
    getSharedPluginData: (ns: string, k: string) => ledger.collections[c.id]?.data[`${ns}/${k}`] ?? '',
    setSharedPluginData: (ns: string, k: string, v: string) => {
      const entry = (ledger.collections[c.id] ??= { name: c.name, data: {} });
      entry.name = c.name;
      entry.data[`${ns}/${k}`] = v;
    },
  });
  const unwrap = (c: VarCollection): VarCollection => (c as Partial<LedgerCollection>).real ?? c;
  const host: ThemeHost = {
    variables: {
      getLocalVariableCollectionsAsync: async () => (await fv.getLocalVariableCollectionsAsync()).map(wrap),
      getLocalVariablesAsync: ((type?: string) => fv.getLocalVariablesAsync(type as never)) as ThemeHost['variables']['getLocalVariablesAsync'],
      createVariableCollection: (name: string) => wrap(fv.createVariableCollection(name)),
      createVariable: (name: string, c: VarCollection, t: 'COLOR' | 'FLOAT' | 'STRING') => fv.createVariable(name, unwrap(c), t),
      createVariableAlias: (v: Variable) => fv.createVariableAlias(v),
    },
    getLocalTextStylesAsync: () => live.getLocalTextStylesAsync(),
    createTextStyle: () => live.createTextStyle(),
    loadFontAsync: (f) => live.loadFontAsync(f),
    listAvailableFontsAsync: () => live.listAvailableFontsAsync(),
    getLocalEffectStylesAsync: () => live.getLocalEffectStylesAsync(),
    getLocalPaintStylesAsync: () => live.getLocalPaintStylesAsync(),
    getLocalGridStylesAsync: () => live.getLocalGridStylesAsync(),
    createEffectStyle: () => live.createEffectStyle(),
    createPaintStyle: () => live.createPaintStyle(),
    createGridStyle: () => live.createGridStyle(),
    root: {
      getSharedPluginData: (ns: string, k: string) => ledger.root[`${ns}/${k}`] ?? '',
      setSharedPluginData: (ns: string, k: string, v: string) => { ledger.root[`${ns}/${k}`] = v; },
    },
  } as ThemeHost;
  return { host, shared: { mode: 'ledger', reason }, ledger };
};

/* ── the step data and the common report ───────────────────────────────────────────────────────────── */

/** What every script is handed (packed). `step`/`of` place it in the manifest; `fonts` is the text plan
 *  projected to the two fields the #680 preload reads; `ledger` is present only when the agent supplied one. */
export type StepBase = { step: number; of: number; label: string; fonts?: { fontFamilyPrimary: string; fontStyle: string }[]; ledger?: Ledger };

/** The facts every step returns — the same facts the plugin's verdict prints, split per step. */
export type StepReport = {
  step: number;
  of: number;
  label: string;
  kind: string;
  ok: boolean;
  shared: SharedDataMode;
  /** Present only in ledger mode: the records this step would have written as shared plugin data. */
  ledger?: Ledger;
  fonts?: Pick<FontPreloadResult, 'loaded' | 'attempted' | 'unavailable'>;
  migration?: { migrated: string[]; refused: string[]; refusals: string[] };
  created?: number;
  total?: number;
  bound?: number;
  misses?: string[];
  refused?: { name: string; mode: string; reason: string }[];
  skipped?: { name: string; reason: string }[];
  threw?: string;
  [extra: string]: unknown;
};

const base = (d: StepBase, kind: string, shared: SharedDataMode, ledger: Ledger | null): StepReport => ({
  step: d.step, of: d.of, label: d.label, kind, ok: true, shared, ...(ledger ? { ledger } : {}),
});

const migrationOf = (mig: Migration): StepReport['migration'] => ({
  migrated: mig.outcomes.filter((o) => o.status === 'migrated').map((o) => `${o.from}→${o.to}`),
  refused: mig.outcomes.filter((o) => o.status !== 'migrated' && o.status !== 'source-absent').map((o) => `${o.from}→${o.to}: ${o.status}`),
  refusals: mig.refusals,
});

/** Run a write step: fonts first (#680), exactly as the plugin does before any variable write — a
 *  `use_figma` call is a fresh plugin run, so the faces loaded by an earlier script are not loaded here. */
const writeStep = async (
  raw: unknown,
  kind: string,
  body: (host: ThemeHost, d: StepBase & Record<string, unknown>, r: StepReport) => Promise<void>,
): Promise<StepReport> => {
  const d = unpack(raw) as StepBase & Record<string, unknown>;
  const { host, shared, ledger } = hostOf(d.ledger);
  const r = base(d, kind, shared, ledger);
  try {
    if (d.fonts) {
      const pf = await preloadFonts(d.fonts as unknown as TextStylePlan, fontPreloadApiOf(host));
      r.fonts = { loaded: pf.loaded, attempted: pf.attempted, unavailable: pf.unavailable };
    }
    await body(host, d, r);
  } catch (e) {
    r.threw = (e as Error)?.message ?? String(e);
  }
  r.ok = !r.threw && !(r.misses?.length) && !(r.refused?.length);
  return r;
};

/* ── the theme steps — one executor each, in `apply-theme.ts`'s order ──────────────────────────────── */

/** PRE-FLIGHT (#506), READ-ONLY: the same `preflightApply` `guardApply` calls, over a slice of the same
 *  `preflightPlanOf` output. Every pre-flight script runs before any write script; a conflict in any of
 *  them means the agent writes nothing (the runbook's first rule). */
export const runPreflight = async (raw: unknown): Promise<StepReport> => {
  const d = unpack(raw) as StepBase & { plan: PreflightPlan };
  const { host, shared, ledger } = hostOf(d.ledger);
  const r = base(d, 'preflight', shared, ledger);
  // The ledger is READ here, never written: echoing it back would invite the agent to merge a record this
  // step did not make.
  delete r.ledger;
  try {
    const conflicts = await preflightApply(d.plan, preflightApiOf(host));
    r.conflicts = conflicts;
    r.ok = conflicts.length === 0;
  } catch (e) {
    r.threw = (e as Error)?.message ?? String(e);
    r.ok = false;
  }
  return r;
};

/** COLOR (#108): a slice of the `WritePlan` — palette rows, `color` create rows, or `color` alias rows. */
export const runColor = (raw: unknown) => writeStep(raw, 'color', async (host, d, r) => {
  const mig = await beginMigration(host.variables);
  const res = await applyWritePlan(d.plan as WritePlan, host.variables, mig);
  Object.assign(r, { migration: migrationOf(mig), created: res.paletteCreated + res.colorCreated, total: res.paletteTotal + res.colorTotal, bound: res.bound, misses: res.misses });
});

/** FLOAT axes (#146): a slice of the float collection plans (create rows, or alias rows). */
export const runFloat = (raw: unknown) => writeStep(raw, 'float', async (host, d, r) => {
  const mig = await beginMigration(host.variables);
  const res = await applyFloatPlan(d.plans as FloatCollectionPlan[], host.variables, mig);
  Object.assign(r, { migration: migrationOf(mig), created: res.collections.reduce((n, c) => n + c.created, 0), total: res.collections.reduce((n, c) => n + c.total, 0), bound: res.bound, misses: res.misses });
});

/** EFFECT + PAINT styles. */
export const runStyles = (raw: unknown) => writeStep(raw, 'styles', async (host, d, r) => {
  const res = await applyStylesPlan(d.plan as StylesPlan, host);
  Object.assign(r, { created: res.effects.created + res.paints.created, total: res.effects.total + res.paints.total, bound: res.paints.bound, misses: res.misses });
});

/** GRID styles (#1480). */
export const runGrid = (raw: unknown) => writeStep(raw, 'grid', async (host, d, r) => {
  const res = await applyGridStylePlan(d.plan as GridStylePlan, host);
  Object.assign(r, { created: res.created, total: res.total });
});

/** TYPOGRAPHY variables (#237) — `core/font` + `type-sets`. */
export const runFont = (raw: unknown) => writeStep(raw, 'font', async (host, d, r) => {
  const mig = await beginMigration(host.variables);
  const res = await applyVarCollectionPlan(d.plans as VarCollectionPlan[], host.variables, mig);
  Object.assign(r, { migration: migrationOf(mig), created: res.collections.reduce((n, c) => n + c.created, 0), total: res.collections.reduce((n, c) => n + c.total, 0), bound: res.bound, misses: res.misses, refused: res.refused });
});

/** TEXT styles (#237). */
export const runText = (raw: unknown) => writeStep(raw, 'text', async (host, d, r) => {
  const res = await applyTextStylePlan(d.plan as TextStylePlan, textApiOf(host));
  Object.assign(r, { created: res.created, total: res.total, bound: res.bound, misses: res.misses, skipped: res.skipped, resolvedStyles: res.resolvedStyles });
});

/** PERSIST (#131) — last, as in the plugin, where it runs only after every executor returned. */
export const runPersist = (raw: unknown) => writeStep(raw, 'persist', async (host, d) => {
  persistInput(host.root, d.input as BrandInput);
});

/* ── read-back ─────────────────────────────────────────────────────────────────────────────────────── */

type ReadValue = number | string | boolean | { r: number; g: number; b: number; a?: number } | { alias: string; opacity?: number | string } | null;

/**
 * VARIABLES READ-BACK — one page of every local variable, sorted by (collection, name), plus every
 * collection's modes and provenance. READ-ONLY. Returned raw rather than judged here: the comparison
 * against the plan runs in `report.ts`, which has the whole plan, where a script has room for a slice.
 */
export const runReadbackVars = async (raw: unknown): Promise<StepReport> => {
  const d = unpack(raw) as StepBase & { offset: number; limit: number };
  const { host, shared, ledger } = hostOf(d.ledger);
  const r = base(d, 'readback-vars', shared, null);
  void ledger;
  const cols = await host.variables.getLocalVariableCollectionsAsync();
  const colById = new Map(cols.map((c) => [c.id, c] as const));
  const all = (await host.variables.getLocalVariablesAsync()) as unknown as (Variable & {
    resolvedType: string; valuesByMode: Record<string, unknown>; hiddenFromPublishing?: boolean;
  })[];
  const byId = new Map(all.map((v) => [v.id, v] as const));
  const colName = (v: Variable) => colById.get(v.variableCollectionId)?.name ?? `?${v.variableCollectionId}`;
  const sorted = [...all].sort((a, b) => (colName(a) + '\u0000' + a.name < colName(b) + '\u0000' + b.name ? -1 : 1));
  const page = sorted.slice(d.offset, d.offset + d.limit);
  const aliasName = (v: { id: string }): string => byId.get(v.id)?.name ?? `?${v.id}`;
  const isAlias = (v: unknown): v is { id: string } => !!v && typeof v === 'object' && (v as { type?: string }).type === 'VARIABLE_ALIAS';
  const value = (v: unknown): ReadValue => {
    if (isAlias(v)) return { alias: aliasName(v) };
    // The tinted wash (#1646): an alias laid at an opacity — a percentage, or an alias to an `opacity/<n>` variable.
    if (v && typeof v === 'object' && isAlias((v as { color?: unknown }).color)) {
      const o = (v as { opacity?: unknown }).opacity;
      return { alias: aliasName((v as { color: { id: string } }).color), opacity: isAlias(o) ? aliasName(o) : (o as number) };
    }
    return (v ?? null) as ReadValue;
  };
  r.total = all.length;
  r.collections = cols.map((c) => ({ id: c.id, name: c.name, modes: c.modes.map((m) => m.name), owned: ownedModeIds(c).length > 0 }));
  r.variables = page.map((v) => {
    const c = colById.get(v.variableCollectionId);
    const values: Record<string, ReadValue> = {};
    for (const m of c?.modes ?? []) values[m.name] = value(v.valuesByMode[m.modeId]);
    return [colName(v), v.name, v.resolvedType, v.scopes, !!v.hiddenFromPublishing, v.description, values];
  });
  r.rootBrand = host.root.getSharedPluginData('prism3', 'brandInput') !== '';
  return r;
};

/** STYLES READ-BACK — every local style of the four kinds, reduced to what the plan decides. READ-ONLY. */
export const runReadbackStyles = async (raw: unknown): Promise<StepReport> => {
  const d = unpack(raw) as StepBase;
  const { host, shared } = hostOf(d.ledger);
  const r = base(d, 'readback-styles', shared, null);
  const names = new Map(((await host.variables.getLocalVariablesAsync()) as unknown as Variable[]).map((v) => [v.id, v.name] as const));
  const boundNames = (b: unknown): string[] => {
    const out: string[] = [];
    const walk = (x: unknown): void => {
      if (Array.isArray(x)) { x.forEach(walk); return; }
      if (x && typeof x === 'object') {
        const o = x as { type?: string; id?: string };
        if (o.type === 'VARIABLE_ALIAS' && o.id) { out.push(names.get(o.id) ?? `?${o.id}`); return; }
        Object.values(x).forEach(walk);
      }
    };
    walk(b);
    return out.sort();
  };
  const read = (s: { name: string; description: string; boundVariables?: unknown }, extra: Record<string, unknown>) =>
    ({ name: s.name, description: s.description, bound: boundNames(s.boundVariables), ...extra });
  type Any = { name: string; description: string; boundVariables?: unknown } & Record<string, unknown>;
  const text = (await host.getLocalTextStylesAsync()) as unknown as Any[];
  const effect = (await host.getLocalEffectStylesAsync()) as unknown as Any[];
  const paint = (await host.getLocalPaintStylesAsync()) as unknown as Any[];
  const grid = (await host.getLocalGridStylesAsync()) as unknown as Any[];
  r.styles = {
    text: text.map((s) => read(s, { fontName: s.fontName, fontSize: s.fontSize })),
    effect: effect.map((s) => read(s, { effects: ((s.effects as unknown[]) ?? []).length, effectBound: boundNames(s.effects) })),
    paint: paint.map((s) => read(s, { paints: ((s.paints as unknown[]) ?? []).length, paintBound: boundNames(s.paints) })),
    grid: grid.map((s) => read(s, { grids: ((s.layoutGrids as unknown[]) ?? []).length })),
  };
  return r;
};

/* ── cleanup (the scratch-file wipe) ───────────────────────────────────────────────────────────────── */

/**
 * WIPE THE THEME from a DESIGNATED SCRATCH FILE, by provenance only — the conservative reading of "remove
 * what Prism3 owns", pending the owner's answer (listed at the top of the PR):
 *
 *   · a COLLECTION goes only if it carries the #1581 stamp (live, or in the supplied ledger) AND every
 *     variable in it is under this brand's root. The pre-flight's LEGACY presumption is deliberately NOT
 *     applied: it exists so a re-apply is not refused, and a delete is the one place a presumption costs
 *     work nobody can recover.
 *   · a STYLE goes only if its name is in this brand's plan AND its description is the engine's own
 *     (`isEngineDescription`, the pre-flight's style provenance). A renamed engine style stays.
 *   · the persisted brand (#131) is cleared, so the next run's pre-flight does not presume anything.
 *
 * Everything kept is returned with its reason. Not `applyPrunePlan`, and on purpose: that executor removes
 * collections by NAME, which would take a same-named collection nobody stamped along with the stamped one.
 */
export const runCleanupTheme = async (raw: unknown): Promise<StepReport> => {
  const d = unpack(raw) as StepBase & { root: string; styles: Record<StyleKind, string[]> };
  const { host, shared, ledger } = hostOf(d.ledger);
  const r = base(d, 'cleanup-theme', shared, ledger);
  const removed: string[] = [];
  const kept: string[] = [];
  const cols = (await host.variables.getLocalVariableCollectionsAsync()) as (VarCollection & { real?: { remove(): void }; remove?(): void })[];
  const vars = await host.variables.getLocalVariablesAsync();
  for (const c of cols) {
    const members = vars.filter((v) => v.variableCollectionId === c.id);
    const foreign = members.filter((v) => v.name.split('/')[0] !== d.root);
    if (ownedModeIds(c).length === 0) { kept.push(`collection ${c.name}: no Prism3 stamp`); continue; }
    if (foreign.length) { kept.push(`collection ${c.name}: ${foreign.length} variables outside '${d.root}/' (e.g. ${foreign[0].name})`); continue; }
    (c.real ?? c).remove?.();
    removed.push(`collection ${c.name} (${members.length} variables)`);
    if (ledger) delete ledger.collections[c.id];
  }
  const getters: Record<StyleKind, () => Promise<{ name: string; description: string; remove?(): void }[]>> = {
    text: () => host.getLocalTextStylesAsync(),
    effect: () => host.getLocalEffectStylesAsync(),
    paint: () => host.getLocalPaintStylesAsync(),
    grid: () => host.getLocalGridStylesAsync(),
  };
  for (const kind of Object.keys(getters) as StyleKind[]) {
    const planned = new Set(d.styles[kind] ?? []);
    for (const s of await getters[kind]()) {
      if (!planned.has(s.name)) continue;
      if (!isEngineDescription(kind, s.description ?? '', [...planned])) { kept.push(`${kind} style ${s.name}: description is not the engine's`); continue; }
      s.remove?.();
      removed.push(`${kind} style ${s.name}`);
    }
  }
  host.root.setSharedPluginData('prism3', 'brandInput', '');
  r.removed = removed;
  r.kept = kept;
  return r;
};

/* ── components ────────────────────────────────────────────────────────────────────────────────────── */

/** A payload function: the engine's own paste JS, verbatim, as the body of `async (figma) => { … }`. */
type Payload = (figma: PluginAPI) => Promise<Record<string, unknown>>;

/**
 * The `figma` the component payloads see. The engine's payload calls `figma.loadAllPagesAsync()` (not
 * implemented under `use_figma`) and then `figma.root.findAllWithCriteria` / `figma.root.findAll` to
 * resolve swap and nest targets across the file. This adapter shadows the global for the payload only:
 * `loadAllPagesAsync` tries the native call and, when the host refuses it, loads each page with
 * `page.loadAsync()` instead (no page switch — the runbook's one-switch-per-script rule holds), and the two
 * root searches then walk the loaded pages. On a host that supports `loadAllPagesAsync` nothing is
 * adapted: the native root search runs. Which path ran is reported, so a live run says which it took.
 */
export const componentFigma = (host: PluginAPI, notes: { loadAllPages?: string; pageLoadFailures?: string[] }): PluginAPI => {
  let native = false;
  const pages = () => host.root.children as unknown as { name: string; loadAsync(): Promise<void>; findAllWithCriteria(c: unknown): unknown[]; findAll(p: (n: unknown) => boolean): unknown[] }[];
  const loadAll = async (): Promise<void> => {
    try {
      await host.loadAllPagesAsync();
      native = true;
      notes.loadAllPages = 'native';
    } catch (e) {
      notes.loadAllPages = `per-page (loadAllPagesAsync: ${(e as Error)?.message ?? String(e)})`;
      for (const p of pages()) {
        try { await p.loadAsync(); } catch (err) { (notes.pageLoadFailures ??= []).push(`${p.name}: ${(err as Error)?.message ?? String(err)}`); }
      }
    }
  };
  const root = new Proxy(host.root, {
    get(t, p) {
      if (!native && p === 'findAllWithCriteria') return (c: unknown) => pages().flatMap((pg) => pg.findAllWithCriteria(c));
      if (!native && p === 'findAll') return (fn: (n: unknown) => boolean) => pages().flatMap((pg) => pg.findAll(fn));
      const v = Reflect.get(t, p);
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
  return new Proxy(host, {
    get(t, p) {
      if (p === 'loadAllPagesAsync') return loadAll;
      if (p === 'root') return root;
      const v = Reflect.get(t, p);
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
};

/** The page port `resolveComponentPage` needs, over the real host — with `loadAllPagesAsync` made
 *  non-fatal, since `root.children` (all it reads) is readable without loading page contents. */
const pagesApiOf = (notes: { loadAllPages?: string }): PagesApi => ({
  root: figma.root as unknown as PagesApi['root'],
  createPage: () => figma.createPage() as unknown as ReturnType<PagesApi['createPage']>,
  createPageDivider: (n?: string) => figma.createPageDivider(n) as unknown as ReturnType<PagesApi['createPageDivider']>,
  setCurrentPageAsync: (p) => figma.setCurrentPageAsync(p as unknown as PageNode),
  loadAllPagesAsync: async () => {
    try { await figma.loadAllPagesAsync(); } catch (e) { notes.loadAllPages ??= `skipped for page placement (${(e as Error)?.message ?? String(e)})`; }
  },
});

/** Put the script on the def's section page (#1554) — once, the only page switch this script makes. */
const placeOnPage = async (defId: string, notes: { loadAllPages?: string }): Promise<string> => {
  const page = await resolveComponentPage(pagesApiOf(notes), defId);
  if (!page) return figma.currentPage.name;
  await figma.setCurrentPageAsync(page as unknown as PageNode);
  return page.name;
};

/**
 * One CHUNK of a component set — the engine's `planSetChunks` payload, run on the def's page through the
 * adapted `figma`. The payload is idempotent by member name, so re-running a chunk skips what is there.
 */
export const runComponentChunk = async (raw: unknown, payloads: Payload[]): Promise<StepReport> => {
  const d = unpack(raw) as StepBase & { def: string; chunk: number; chunks: number };
  const notes: { loadAllPages?: string; pageLoadFailures?: string[] } = {};
  const r = base(d, 'component-chunk', { mode: 'live' }, null);
  delete (r as Partial<StepReport>).shared;
  r.def = d.def;
  try {
    r.page = await placeOnPage(d.def, notes);
    const out = await payloads[0](componentFigma(figma, notes));
    r.result = out;
    r.misses = (out.misses as string[] | undefined) ?? [];
  } catch (e) {
    r.threw = (e as Error)?.message ?? String(e);
  }
  r.host = notes;
  r.ok = !r.threw && !(r.misses?.length);
  return r;
};

/**
 * `emitAsComponents` members (#1012, `icon`): each glyph is its own top-level `<id>/<glyph>` component, as
 * the plugin writes it. The engine's single-component payload (`planToPluginJs`) builds each one; this
 * names it the way `applyComponentPlan`'s emit arm does (the name is computed offline by that arm's own
 * `emitCoordValue`), sets the def's summary as its description, and places it on the arm's fixed-pitch
 * grid. A member already in the file by that name is SKIPPED — the plugin's idempotency rule, and the
 * reason a re-run of this script adds nothing.
 */
export const runComponentEmit = async (raw: unknown, payloads: Payload[]): Promise<StepReport> => {
  const d = unpack(raw) as StepBase & { def: string; members: { name: string; index: number }[]; count: number; description?: string };
  const notes: { loadAllPages?: string; pageLoadFailures?: string[] } = {};
  const r = base(d, 'component-emit', { mode: 'live' }, null);
  delete (r as Partial<StepReport>).shared;
  r.def = d.def;
  const members: { name: string; status: string; id?: string; misses: string[] }[] = [];
  try {
    r.page = await placeOnPage(d.def, notes);
    const cols = Math.max(1, Math.ceil(Math.sqrt(d.count)));
    const PITCH = 48;
    for (let i = 0; i < d.members.length; i++) {
      const m = d.members[i];
      const have = figma.currentPage.findChild((n) => n.type === 'COMPONENT' && n.name === m.name);
      if (have) { members.push({ name: m.name, status: 'skipped', id: have.id, misses: [] }); continue; }
      const out = await payloads[i](componentFigma(figma, notes));
      const node = (await figma.getNodeByIdAsync(String(out.id))) as ComponentNode | null;
      if (node) {
        node.name = m.name;
        if (d.description) node.description = d.description;
        node.x = (m.index % cols) * PITCH;
        node.y = Math.floor(m.index / cols) * PITCH;
      }
      members.push({ name: m.name, status: node ? 'built' : 'built, not found by id', id: node?.id, misses: (out.misses as string[] | undefined) ?? [] });
    }
  } catch (e) {
    r.threw = (e as Error)?.message ?? String(e);
  }
  r.members = members;
  r.misses = members.flatMap((m) => m.misses.map((x) => `${m.name}: ${x}`));
  r.host = notes;
  r.ok = !r.threw && !(r.misses?.length);
  return r;
};

/** COMPONENT READ-BACK for one page: every expected set/component, with its variant count and declared
 *  properties. READ-ONLY; switches to the page once. A page that is absent is reported, never created. */
export const runReadbackComponents = async (raw: unknown): Promise<StepReport> => {
  const d = unpack(raw) as StepBase & { page: string | null; expect: string[] };
  const r = base(d, 'readback-components', { mode: 'live' }, null);
  delete (r as Partial<StepReport>).shared;
  const page = d.page === null ? figma.currentPage : figma.root.children.find((p) => p.name === d.page);
  if (!page) { r.page = d.page; r.absentPage = true; r.found = []; return r; }
  await figma.setCurrentPageAsync(page);
  const want = new Set(d.expect);
  r.page = page.name;
  r.found = page.children.filter((n) => want.has(n.name)).map((n) => {
    if (n.type === 'COMPONENT_SET') {
      let props: string[] = [];
      let unreadable: string | undefined;
      try { props = Object.keys(n.componentPropertyDefinitions); } catch (e) { unreadable = (e as Error)?.message; }
      return { name: n.name, type: n.type, variants: n.children.length, properties: props, ...(unreadable ? { unreadable } : {}) };
    }
    return { name: n.name, type: n.type };
  });
  return r;
};

/**
 * WIPE ONE COMPONENT PAGE of a designated scratch file: the sets/components this run's manifest names, and
 * nothing else; then the page itself, only if that left it empty and it is not the page this call is on
 * (Figma cannot remove the current page). Section headers and dividers stay — see the PR's open questions.
 */
export const runCleanupPage = async (raw: unknown): Promise<StepReport> => {
  const d = unpack(raw) as StepBase & { page: string; names: string[] };
  const r = base(d, 'cleanup-page', { mode: 'live' }, null);
  delete (r as Partial<StepReport>).shared;
  const page = figma.root.children.find((p) => p.name === d.page);
  if (!page) { r.removed = []; r.absentPage = true; return r; }
  await page.loadAsync();
  const want = new Set(d.names);
  const removed: string[] = [];
  for (const n of [...page.children]) {
    if ((n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && want.has(n.name)) { removed.push(n.name); n.remove(); }
  }
  if (page.children.length === 0 && page !== figma.currentPage) { page.remove(); removed.push(`page ${d.page}`); }
  else if (page.children.length === 0) r.kept = [`page ${d.page}: it is the page this call is on`];
  else r.kept = [`page ${d.page}: ${page.children.length} other nodes on it`];
  r.removed = removed;
  return r;
};
