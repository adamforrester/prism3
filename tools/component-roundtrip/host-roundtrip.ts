/**
 * THE IN-HOST HALF of the real-host component round trip (#1218). Bundled by `roundtrip.ts` into the scripts the Mac's
 * Desktop Bridge runs, and run as-is against the component shim by `selftest.ts`. The same function both times: the
 * self-test's verdict is about the code the Mac runs, not a copy of it.
 *
 * WHAT IT REUSES, AND WHAT IT RESTATES. The PLAN is the offline round trip's (`figmaAnatomySet(def, { swapTarget })`,
 * #874/#1205), computed by `roundtrip.ts` at the checkout's commit and carried in as data. The BUILD is the plugin's own
 * executor, `applyComponentPlan` (`apps/plugin/src/write-components.ts`), the code #866's discard lives in. The DIFF is
 * `diffAnatomy` (`@prism3/engine/anatomy-readback`), with the ports read off the HOST's own catalogs, never off the
 * plan (that file's header has why). The only restated part is the glue `apps/plugin/test-roundtrip.ts`'s
 * `roundTrip()` already holds: build, find the set, build the ports, diff. It is restated rather than imported because
 * that file is a gate script that runs on import; the steps are the same steps, in the same order.
 *
 * SAFETY, ENFORCED HERE rather than asked of the operator (owner decision on #1218, 2026-11-18):
 *   1. REFUSE UNLESS SCRATCH: the open file's name must equal the name the operator passed with `--scratch-file`.
 *      Nothing is written otherwise, not even the version.
 *   2. SAVE A VERSION BEFORE WRITES: `saveVersionHistoryAsync` runs before the first write; if it throws, the run
 *      stops with nothing written.
 *   3. NEVER IMPORT BY KEY: the executor gets a host whose every `import…ByKey…` (on `figma`, `figma.variables` and
 *      `figma.teamLibrary`) throws. A build that reaches for one fails loudly and is reported, rather than pulling a
 *      library component into the scratch file.
 *   4. NEVER DELETE PAGES: the run writes only to a page it creates (`Round trip <run id>`), and it checks every page
 *      that existed before the run is still there after it. A missing page is reported as a violation; nothing can
 *      undo it, which is why rule 2 runs first.
 *
 * A FRESH PAGE PER RUN, because the executor skips a member already in its set (`ALREADY PRESENT`): reading back a set
 * an older build left behind would report that build, not this one. The page is checked empty before the build.
 */
import { applyComponentPlan, type ComponentsApi } from '../../apps/plugin/src/write-components';
import { facade } from '../../apps/plugin/src/host-facade';
import { diffAnatomy, type Divergence, type HostNode, type ReadPorts } from '@prism3/engine/anatomy-readback';
import { planComponentName, type AnatomyPlan } from '@prism3/engine/anatomy-figma';

export const RESULT_FORMAT = 'prism3-component-roundtrip/1';
/** Divergences returned per def. The count is always whole; the list is cut so one broken def cannot flood a result. */
export const MAX_DIVERGENCES = 200;

export type DefInput = { id: string; plans: AnatomyPlan[]; emitAsComponents?: boolean; dependency?: boolean };
export type RunData = { runId: string; scratchFile: string; defs: DefInput[]; planHash: string };
export type DefResult = {
  def: string;
  dependency: boolean;
  /** False only for a dependency built as standalone components, which is there for its host def, not diffed. */
  diffed: boolean;
  planned: number;
  built: number;
  misses: string[];
  divergences: Divergence[];
  divergenceCount: number;
  threw?: string;
};
export type RunResult = {
  format: typeof RESULT_FORMAT;
  runId: string;
  planHash: string;
  refused?: string;
  file?: string;
  versionSaved?: boolean;
  page?: string;
  defs: DefResult[];
  violations: string[];
};

/** FNV-1a over UTF-16 code units, hex. The same function hashes the plans locally and in the host. */
export const fnv = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
};

/** Figma's import-by-key methods, named so a host that does not list one (or answers it from a trap) is still refused. */
export const IMPORT_BY_KEY = ['importComponentByKeyAsync', 'importComponentSetByKeyAsync', 'importStyleByKeyAsync', 'importVariableByKeyAsync'];

const keysOf = (o: object): string[] => {
  const out = new Set<string>();
  for (let x: object | null = o; x && x !== Object.prototype; x = Object.getPrototypeOf(x)) for (const k of Reflect.ownKeys(x)) if (typeof k === 'string') out.add(k);
  return [...out];
};

/** `host` as a FACADE (`apps/plugin/src/host-facade.ts`, never a `Proxy` over it: #3209, Figma's methods are fixed and a
 *  trap's substitute throws) whose every import-by-key method throws, on `figma` and one level down in `variables` and
 *  `teamLibrary`. Every other member reads through to the host as it is now. */
export const guardedHost = <T extends object>(host: T, refused: string[]): T => {
  const refuse = (o: object): Record<string, unknown> => Object.fromEntries(
    [...new Set([...IMPORT_BY_KEY, ...keysOf(o).filter((k) => /^import.*ByKey/.test(k))])].map((k) => [k, () => {
      refused.push(k);
      throw new Error(`component round trip (#1218): ${k} is refused; this tool never imports by key`);
    }]),
  );
  const own: Record<string, unknown> = refuse(host);
  for (const k of ['variables', 'teamLibrary']) {
    const sub = (host as Record<string, unknown>)[k];
    if (sub && typeof sub === 'object') own[k] = facade(sub as object, refuse(sub as object));
  }
  return facade(host, own);
};

/** Pages present before and gone after: the never-delete-pages check. */
export const missingPages = (before: readonly string[], after: readonly string[]): string[] => {
  const now = new Set(after);
  return before.filter((id) => !now.has(id));
};

type Live = { id?: string; name?: string; type?: string; key?: string; children?: Live[]; componentProperties?: Record<string, { value?: unknown }> };
type Figma = {
  root: Live & { findAllWithCriteria?: (c: { types: string[] }) => Live[] };
  loadAllPagesAsync?: () => Promise<void>;
  saveVersionHistoryAsync: (title: string, description?: string) => Promise<unknown>;
  createPage: () => Live & { name: string };
  getNodeByIdAsync?: (id: string) => Promise<Live | null>;
  variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> };
  getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]>;
  getLocalEffectStylesAsync: () => Promise<{ id: string; name: string }[]>;
};

const pageIds = (f: Figma): string[] => (f.root.children ?? []).map((p) => String(p.id));
const message = (e: unknown): string => String((e as Error)?.message ?? e);

/** Every component id an instance under `root` holds as a property value → that component's name, through the host's
 *  own `getNodeByIdAsync`: the same read as `test-roundtrip.ts`'s `componentNamesOf`. */
const componentNamesOf = async (f: Figma, root: Live | undefined): Promise<Map<string, string>> => {
  const out = new Map<string, string>();
  const walk = async (n: Live | undefined): Promise<void> => {
    if (!n) return;
    for (const v of Object.values(n.componentProperties ?? {})) {
      if (typeof v.value !== 'string' || out.has(v.value) || !f.getNodeByIdAsync) continue;
      const hit = await f.getNodeByIdAsync(v.value);
      if (hit?.name) out.set(v.value, hit.name);
    }
    for (const c of n.children ?? []) await walk(c);
  };
  await walk(root);
  return out;
};

/** `build` is the executor, the plugin's own unless a test hands it one: the self-test's `import-by-key-run` arm plants
 *  an executor that reaches for an import-by-key method through the host it is given, so the arm proves the executor
 *  is handed the GUARDED host, not the raw one. The scripts the Mac runs always call `run(figma, data)`. */
export const run = async (figma: unknown, data: RunData, build: typeof applyComponentPlan = applyComponentPlan): Promise<RunResult> => {
  const f = figma as Figma;
  const base = { format: RESULT_FORMAT as typeof RESULT_FORMAT, runId: data.runId, planHash: data.planHash, defs: [] as DefResult[], violations: [] as string[] };
  const file = String(f.root?.name ?? '');
  // 1. The scratch check, before anything else touches the file.
  if (!data.scratchFile || file !== data.scratchFile) {
    return { ...base, file, refused: `the open file is not the scratch file named with --scratch-file; nothing was written` };
  }
  // The plans the host was handed must be the plans the local report will diff against.
  const got = fnv(JSON.stringify(data.defs.map((d) => [d.id, d.plans])));
  if (got !== data.planHash) return { ...base, file, refused: `the plans arrived with hash ${got}, not ${data.planHash}; nothing was written` };

  if (f.loadAllPagesAsync) await f.loadAllPagesAsync();
  // 2. A version before the first write. A refusal stops the run with nothing written.
  try {
    await f.saveVersionHistoryAsync(`Prism3 component round trip ${data.runId}`, 'Saved before the round trip builds anything (#1218).');
  } catch (e) {
    return { ...base, file, versionSaved: false, refused: `could not save a version before writing (${message(e)}); nothing was written` };
  }
  const before = pageIds(f);
  const refusedImports: string[] = [];
  const api = guardedHost(f as object, refusedImports) as unknown as ComponentsApi & Figma;
  const page = f.createPage();
  page.name = `Round trip ${data.runId}`;
  const out: RunResult = { ...base, file, versionSaved: true, page: page.name };
  if ((page.children ?? []).length) {
    out.violations.push('the new page was not empty');
    return out;
  }

  for (const d of data.defs) {
    const r: DefResult = { def: d.id, dependency: !!d.dependency, diffed: false, planned: d.plans.length, built: 0, misses: [], divergences: [], divergenceCount: 0 };
    out.defs.push(r);
    try {
      const applied = await build(d.plans, api, { targetPage: page as never, ...(d.emitAsComponents && d.dependency ? { emitAsComponents: true } : {}) });
      r.misses = [...applied.misses];
    } catch (e) {
      r.threw = message(e);
      continue;
    }
    // A dependency built standalone (`emitAsComponents`) is there for the def that nests it; it is not a set to diff.
    if (d.dependency && d.emitAsComponents) continue;
    r.diffed = true;
    const set = (page.children ?? []).find((c) => c.type === 'COMPONENT_SET' && c.name === d.plans[0]?.component);
    const members = (set?.children ?? []) as unknown as HostNode[];
    r.built = members.length;
    // The ports, off the host's own catalogs (`test-roundtrip.ts`'s `roundTrip`, same reads).
    const all = [...(f.root.findAllWithCriteria?.({ types: ['COMPONENT_SET'] }) ?? []), ...(f.root.findAllWithCriteria?.({ types: ['COMPONENT'] }) ?? [])];
    const nameByKey = new Map(all.filter((c) => c.key).map((c) => [String(c.key), String(c.name)] as const));
    const varById = new Map((await f.variables.getLocalVariablesAsync()).map((v) => [v.id, v.name] as const));
    const styleById = new Map([...(await f.getLocalTextStylesAsync()), ...(await f.getLocalEffectStylesAsync())].map((s) => [s.id, s.name] as const));
    const nameById = await componentNamesOf(f, set);
    const ports: ReadPorts = {
      varName: (id) => varById.get(id) ?? null,
      styleName: (id) => styleById.get(id) ?? null,
      componentName: (key) => nameByKey.get(key) ?? null,
      componentById: (id) => nameById.get(id) ?? null,
    };
    const divs = diffAnatomy(d.plans, members, planComponentName, ports);
    r.divergenceCount = divs.length;
    r.divergences = divs.slice(0, MAX_DIVERGENCES);
  }

  // 3 and 4, checked after the fact.
  if (refusedImports.length) out.violations.push(`the build asked to import by key (${[...new Set(refusedImports)].join(', ')}); each was refused`);
  const gone = missingPages(before, pageIds(f));
  if (gone.length) out.violations.push(`${gone.length} page(s) that existed before the run are gone: ${gone.join(', ')}`);
  return out;
};
