/**
 * DRAW EVERY SET WITH TWO EXECUTORS AND SAY WHICH ONES DIFFER (#3101) — the measurement `lint-executor-reach.ts`
 * holds each `executor-reach.json` entry to. A worker: the gate starts several, each with a share of the defs.
 *
 *   npx tsx apps/plugin/reach-draw.ts --old <dir holding apps/plugin/src> [--defs a,b,c] --out <file.json>
 *
 * THE TWO SIDES. NEW is this tree's `apps/plugin/src`; OLD is another tree's (the gate's base, exported by `git
 * archive`), loaded from `--old`. Everything else is this tree's and shared by both: the engine (so both draw the SAME
 * plans, and only the executor differs), the component shim (`component-shim.ts`, the one model of the host every
 * offline component suite drives), and the brand materialization (`src/brand-def.ts`, which a plan is projected from).
 *
 * WHAT "DIFFERS" MEANS. A set differs when, from the same start, the two executors leave the shim holding different
 * nodes: every enumerable field of every node under the set, its prototype reactions and plugin data, serialized in
 * key order, with only the two things that move on every run normalized: the revision in a member's stamp and a
 * build's timestamp. Each def is drawn in eight arms, each OLD against NEW from one start:
 *
 *   fresh/<brand>          a build into an empty file;
 *   update/<brand>         a file OLD built, every member's stamp at revision 0, then the in-place update to the same
 *                          plans: what Update file does to a set drawn by an older plugin;
 *   update/<a>><b>         the same, across a lever change: built under brand a, updated to brand b's plans;
 *   repair/<a>><b>         a file OLD built under a and OLD updated to b, then updated to b again: what a later
 *                          revision does to a drawing an earlier revision's update left (a convergence fix, #2976).
 *
 * under two brands: `default` (no brand, every lever at its default) and `levers` (every structural lever away from its
 * default at once, `LEVERS` below). A def whose arm throws on one side and not the other differs; one that throws the
 * same way on both is reported as `error`, never as `same`: a drawing the gate could not make is not a drawing that
 * did not move (docs/34 shape 9).
 *
 * A HOST API THE SHIM LACKS (#3160). The executor calls optional host APIs as `node.setProperties?.(…)`, and a method
 * the shim does not implement makes that call a no-op on both sides, so a real drawing change through it (the review's
 * M-D: `setExplicitVariableModeForCollection?.()` on a nested instance) read `same`. So every node is a `Proxy`
 * (`wrapNode` in `component-shim.ts`) whose `get` records each property name read from it that it lacks, in
 * `_unmodeled`, an enumerable field the serializer below reads like any other. A host API NEW asks a node for and OLD
 * does not then reads `changed`. It over-reports by design (a lacking property read for any reason is recorded), which
 * the record allows: an entry may name more sets than moved, never fewer.
 *
 * WHAT IT CANNOT SEE: a write the shim does not model to a property it DOES carry, or through a method it implements
 * as a no-op, reads the same on both sides (docs/34 shape 17, both sides share the host model), and an executor branch
 * only some other lever combination reaches. `executor-reach.ts` says what an author does about each.
 */
import * as AF from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import type { ComponentDef } from '@prism3/engine/component-schema';
import type { BrandInput } from '@prism3/engine/theme';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeShim, type Node, type Page } from './component-shim';
import { materializeForBrand } from './src/brand-def';

/** Every structural lever away from its default (`levers.ts`), on the engine's sparsest brand's colors. */
export const LEVERS = {
  id: 'reach-levers', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 },
  fieldStyle: 'underline', tagStyle: 'underline', controlShape: 'pill', density: 'compact', bannerStyle: 'outlined',
  outlineInteraction: 'solid-tint', buttonIcons: 'edges', dialogTitleSize: 'small', buttonTextHover: 'fill', buttonContentSize: 'smaller',
} as unknown as BrandInput;
export const BRANDS: readonly (readonly [string, BrandInput | null])[] = [['default', null], ['levers', LEVERS]];
export type Verdict = 'same' | 'changed' | 'error';
export type DefReach = Record<string, Verdict | string>;

const SWAP = 'FPO-default-icon';
type Exec = {
  apply: (plans: AnatomyPlan[], host: unknown, o?: unknown) => Promise<unknown>;
  prebuild?: (def: ComponentDef, ctx: unknown) => Promise<unknown>;
  previewUpdate: (host: unknown, targets: unknown) => Promise<unknown>;
  applyUpdate: (host: unknown, api: unknown, targets: unknown, hash: string) => Promise<unknown>;
  previewHashOf: (p: unknown) => string;
  NS: string; STAMP_KEY: string;
};
/** One executor, its update and its dependency build, from a `src` directory. */
export const loadExecutor = async (src: string): Promise<Exec> => {
  const at = (f: string) => pathToFileURL(resolve(src, f)).href;
  const [wc, bd, ua, up, pf] = await Promise.all(['write-components.ts', 'build-deps.ts', 'update-apply.ts', 'update-plan.ts', 'persist-figma.ts'].map((f) => import(at(f))));
  return { apply: wc.applyComponentPlan, prebuild: bd.prebuildDependencies, previewUpdate: up.previewUpdate, applyUpdate: ua.applyUpdate, previewHashOf: ua.previewHashOf, NS: pf.NS, STAMP_KEY: wc.STAMP_KEY };
};

const PROJECTED = componentDefs.filter((d) => d.figmaProperties);
const project = (brand: BrandInput | null) => (d: ComponentDef): AnatomyPlan[] => AF.figmaAnatomySet(materializeForBrand(d, brand), { swapTarget: SWAP });
type PlanNode = { swapTarget?: string; nestTarget?: string; children: PlanNode[] };
const planComps = (n: PlanNode): string[] => [...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []), ...n.children.flatMap(planComps)];
/** What a file holding `plans` carries: their variables, styles and nested components, as `test-roundtrip.ts` sets it up. */
const fileFor = (plans: AnatomyPlan[]) => {
  const comps = [...new Set(plans.flatMap((p) => planComps(p.root as unknown as PlanNode)))];
  return {
    vars: [...new Set(plans.flatMap((p) => [...AF.planBoundVars(p.root), ...AF.planPaintVars(p.root)]))],
    styles: [...new Set(plans.flatMap((p) => AF.planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => AF.planEffectStyles(p.root)))],
    comps,
    compTexts: Object.fromEntries(comps.flatMap((id) => {
      const texts = componentDefs.find((d) => d.id === id)?.figmaProperties?.texts;
      return texts ? [[id, Object.fromEntries(Object.entries(texts).map(([k, t]) => [t.figmaName ?? k, t.default]))]] : [];
    })),
  };
};
const everyPlan = new Map<BrandInput | null, AnatomyPlan[]>();
const allPlans = (b: BrandInput | null): AnatomyPlan[] => { let a = everyPlan.get(b); if (!a) everyPlan.set(b, a = PROJECTED.flatMap(project(b))); return a; };

// ---- the drawing, serialized -------------------------------------------------------------------------------------
/** Reads that are not a host API: `await`/`Promise.resolve` probe `then`, and `JSON.stringify` probes `toJSON`. */
const NOT_HOST = new Set(['then', 'toJSON']);
/** #3160: the node wrapped so a read of a property it lacks is recorded on it, in `_unmodeled` (see the header). The
 *  `get` returns the target's own value untouched, so the node behaves exactly as unwrapped. */
export const recordUnmodeled = (n: Node): Node => new Proxy(n, {
  get(t, k, receiver) {
    if (typeof k === 'string' && !(k in t) && !NOT_HOST.has(k)) {
      if (!(t._unmodeled instanceof Set)) Object.defineProperty(t, '_unmodeled', { value: new Set<string>(), enumerable: true, configurable: true, writable: true });
      (t._unmodeled as Set<string>).add(k);
    }
    return Reflect.get(t, k, receiver);
  },
});
const STAMPED = /\d{4}-\d\d-\d\dT[\d:.]+Z/g;
const isNode = (v: unknown): v is Node => !!v && typeof v === 'object' && typeof (v as Node).type === 'string' && Array.isArray((v as Node).children);
const value = (v: unknown, seen: Set<unknown>): unknown => {
  if (typeof v === 'string') return v.replace(STAMPED, 'T');
  if (v instanceof Map) return [...v].map(([k, x]) => [k, typeof x === 'string' ? x.replace(STAMPED, 'T').replace(/\|\d+$/, '|R') : value(x, seen)]).sort();
  if (v instanceof Set) return [...v].map((x) => value(x, seen)).sort();
  if (typeof v === 'symbol') return String(v);
  if (isNode(v)) return `@${v.type}:${String(v.name)}`;
  if (Array.isArray(v)) return v.map((x) => value(x, seen));
  if (v && typeof v === 'object') {
    if (seen.has(v)) return '@cycle';
    seen.add(v);
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) { const x = (v as Record<string, unknown>)[k]; if (typeof x !== 'function') o[k] = value(x, seen); }
    seen.delete(v);
    return o;
  }
  return v;
};
/** A node and everything under it. `parent` is the one back-reference; reactions are not enumerable on the shim. */
export const drawn = (n: Node): unknown => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(n).sort()) {
    if (k === 'parent' || k === 'children') continue;
    let v: unknown;
    try { v = n[k]; } catch { v = '!throws'; }
    if (typeof v !== 'function') out[k] = value(v, new Set());
  }
  try { if ('reactions' in n) out.reactions = value(n.reactions, new Set()); } catch { /* none */ }
  out.children = ((n.children as Node[] | undefined) ?? []).map(drawn);
  return out;
};

// ---- one arm -----------------------------------------------------------------------------------------------------
type Step = readonly [Exec, BrandInput | null];
/** A file holding `def` (and what it nests), built by `build` under `brand0`; then each update in `updates`, every
 *  member's stamp rewritten to revision 0 first, as a file an older plugin wrote. The def's own top-level nodes. */
const draw = async (def: ComponentDef, brand0: BrandInput | null, build: Exec, updates: readonly Step[]): Promise<string> => {
  const brands = [brand0, ...updates.map(([, b]) => b)];
  const plans = brands.flatMap((b) => project(b)(def));
  const js = JSON.stringify(plans.map((p) => p.root));
  const live = updates.length > 0 || js.includes('"swapTarget":"brand-mark/') || js.includes('"aspectLock"') || js.includes('"nestOverrides"');
  const page: Page = { children: [] };
  const shim = makeShim({
    ...fileFor(live ? [...plans, ...brands.flatMap(allPlans)] : plans), ...(live ? { comps: [SWAP], liveRoot: true, liveComponents: true } : {}),
    identities: true, scaleConstrained: true, page, wrapNode: recordUnmodeled,
  } as Parameters<typeof makeShim>[0]) as unknown as Record<string, unknown> & { root: { findAllWithCriteria(c: { types: string[] }): unknown[] } };
  const emit = (d: ComponentDef) => ({ emitAsComponents: d.figmaProperties?.emitAsComponents });
  if (live && build.prebuild) await build.prebuild(def, { defs: componentDefs, project: project(brand0), host: shim, build: (d: ComponentDef) => build.apply(project(brand0)(d), shim, emit(d)) });
  const before = page.children.length;
  await build.apply(project(brand0)(def), shim, emit(def));
  const mine = page.children.slice(before);
  const host = { ...shim, root: { ...shim.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : shim.root.findAllWithCriteria(c)) } };
  for (const [ex, b] of updates) {
    for (const top of mine) for (const m of (top.type === 'COMPONENT_SET' ? (top.children as Node[]) : [top])) {
      const st = (m.getSharedPluginData as ((ns: string, k: string) => string) | undefined)?.(ex.NS, ex.STAMP_KEY) ?? '';
      if (st) (m.setSharedPluginData as (ns: string, k: string, v: string) => void)(ex.NS, ex.STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
    }
    const targets = [{ def: def.id, plans: project(b)(def), ...(def.figmaProperties?.emitAsComponents ? { single: true } : {}) }];
    await ex.applyUpdate(host, shim, targets, ex.previewHashOf(await ex.previewUpdate(host, targets)));
  }
  return JSON.stringify(mine.map(drawn));
};

/** The arms, each a pair of draws from one start: OLD's, then NEW's. */
type Pair = (def: ComponentDef) => readonly [() => Promise<string>, () => Promise<string>];
export const ARMS = (OLD: Exec, NEW: Exec): Record<string, Pair> => {
  const out: Record<string, Pair> = {};
  for (const [name, b] of BRANDS) {
    out[`fresh/${name}`] = (d) => [() => draw(d, b, OLD, []), () => draw(d, b, NEW, [])];
    out[`update/${name}`] = (d) => [() => draw(d, b, OLD, [[OLD, b]]), () => draw(d, b, OLD, [[NEW, b]])];
  }
  for (const [[an, a], [bn, b]] of [[BRANDS[0], BRANDS[1]], [BRANDS[1], BRANDS[0]]]) {
    out[`update/${an}>${bn}`] = (d) => [() => draw(d, a, OLD, [[OLD, b]]), () => draw(d, a, OLD, [[NEW, b]])];
    out[`repair/${an}>${bn}`] = (d) => [() => draw(d, a, OLD, [[OLD, b], [OLD, b]]), () => draw(d, a, OLD, [[OLD, b], [NEW, b]])];
  }
  return out;
};

/** Each def's verdict per arm, OLD against NEW. */
export const measure = async (OLD: Exec, NEW: Exec, defs: readonly ComponentDef[]): Promise<Record<string, DefReach>> => {
  const arms = ARMS(OLD, NEW);
  const tried = async (f: () => Promise<string>): Promise<string> => { try { return await f(); } catch (e) { return `!${(e as Error)?.message ?? String(e)}`; } };
  const out: Record<string, DefReach> = {};
  for (const d of defs) {
    const r: DefReach = {};
    for (const [arm, pair] of Object.entries(arms)) {
      const [o, n] = pair(d);
      const a = await tried(o), b = await tried(n);
      const ea = a.startsWith('!'), eb = b.startsWith('!');
      // An empty drawing is not a drawing: a def that draws nothing on both sides cannot say whether it moved.
      r[arm] = ea || eb ? (a === b ? `error: ${a.slice(1, 160)}` : 'changed') : a === '[]' && b === '[]' ? 'error: nothing drawn' : a === b ? 'same' : 'changed';
    }
    out[d.id] = r;
  }
  return out;
};

// ---- the worker --------------------------------------------------------------------------------------------------
const arg = (k: string): string | undefined => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const old = arg('--old'), outFile = arg('--out');
  if (!old || !outFile) { console.error('usage: reach-draw.ts --old <dir holding apps/plugin/src> [--defs a,b] --out <file>'); process.exit(2); }
  const want = arg('--defs')?.split(',').filter(Boolean);
  const defs = want ? PROJECTED.filter((d) => want.includes(d.id)) : PROJECTED;
  if (want && defs.length !== want.length) { console.error(`unknown def(s): ${want.filter((w) => !defs.some((d) => d.id === w)).join(', ')}`); process.exit(2); }
  const NEW = await loadExecutor(resolve(new URL('.', import.meta.url).pathname, 'src'));
  let OLD: Exec;
  try { OLD = await loadExecutor(resolve(old, 'apps/plugin/src')); } catch (e) {
    writeFileSync(outFile, JSON.stringify({ loadError: (e as Error)?.message ?? String(e) }));
    process.exit(0);
  }
  writeFileSync(outFile, JSON.stringify({ sets: await measure(OLD, NEW, defs) }));
}
