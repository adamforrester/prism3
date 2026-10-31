/**
 * ONE READ OF THE FILE PER UPDATE RUN, A PAGE PER TURN (#3177, the Update half of #3170).
 *
 * A document-wide `findAllWithCriteria` walks every node of every loaded page inside one turn of the main thread, and
 * the file and the panel freeze for all of it. The Update check and apply searched the whole file several times per
 * set: `hostPorts`, `locateSets` and `fileBlockers` in the dry run, `findDocBlock` for the usage panels, and in the
 * apply `liveFor`, the executor's own lookups, the verify and the furniture. On a large file each set held the thread
 * for several whole-file walks.
 *
 * A run now reads the file once. Each page is loaded in a turn of its own, then searched once per criterion, each
 * search in a turn of its own (`breathe`), as the read after open does (#3170 part 1, `searchPagesYielding` in
 * `main.ts`). Every lookup the run makes is answered from that read by a root that stands in for the file's
 * (`runRoot`): its pages, plugin data and every other property are the file's own, and only the two searches are
 * answered from the read.
 *
 *   · THE READ IS LIVE NODES. A node renamed, moved within its page or re-tagged by the run reads as it now is, because
 *     each answer filters the nodes as they are when asked. A node the run removed is left out, as a search would.
 *   · A WRITE CAN ADD NODES, which no earlier read holds. So the apply re-reads the page a set sits on once it has
 *     written that set (`rereadAfter`), each search in its own turn again, and the whole file after it moves sets
 *     between pages. A lookup between two writes is answered from the read as the last write left it.
 *   · A SEARCH THE READ DOES NOT COVER (other criteria, or `findAll` with a predicate, the executor's failure path) is
 *     passed to the file's own root: answered right, and counted by the large-file stand-in as a whole-file search.
 *   · A HOST WHOSE PAGES CANNOT BE SEARCHED ONE AT A TIME (a Node shim) is searched in one go per criteria, on first
 *     use, and that answer is kept until the next write's re-read, so a shim runs the same cache and the same
 *     invalidation the plugin does.
 */

import { facade } from './host-facade';

/** A search's criteria, as `findAllWithCriteria` takes them. */
export type Criteria = { types: readonly string[]; sharedPluginData?: { namespace: string; keys: readonly string[] } };
type Searchable = { findAllWithCriteria(c: Criteria): readonly unknown[]; findAll?(p: (n: unknown) => boolean): readonly unknown[] };
type PageLike = Partial<Searchable> & { id?: unknown; loadAsync?(): Promise<void> };
type RootLike = Searchable & { readonly children?: readonly PageLike[] };
type Breathe = () => Promise<void>;

type Run = {
  real: RootLike;
  criteria: readonly Criteria[];
  /** Paged: each page's answer per criterion, by the page's id. Absent for a host searched in one go. */
  pages?: Map<unknown, unknown[][]>;
  /** Searched in one go: the root's answer per criteria key, filled on first use. */
  whole: Map<string, readonly unknown[]>;
  breathe?: Breathe;
};
const RUNS = new WeakMap<object, Run>();

const keyOf = (c: Criteria): string => JSON.stringify([[...c.types].sort(), c.sharedPluginData ? [c.sharedPluginData.namespace, [...c.sharedPluginData.keys].sort()] : null]);
const pageKey = (p: PageLike): unknown => (typeof p.id === 'string' && p.id ? p.id : p);
const pagesOf = (root: RootLike): readonly PageLike[] => { try { return root.children ?? []; } catch { return []; } };
const paged = (root: RootLike): boolean => { const ps = pagesOf(root); return ps.length > 0 && ps.every((p) => typeof p.findAllWithCriteria === 'function'); };
const gone = (n: unknown): boolean => { try { return !!(n as { removed?: unknown }).removed; } catch { return true; } };
const typeOf = (n: unknown): string => { try { return String((n as { type?: unknown }).type ?? ''); } catch { return ''; } };
/** The read's criterion that answers `c`: the same plugin-data filter, and every type `c` asks for. */
const coverOf = (criteria: readonly Criteria[], c: Criteria): number => criteria.findIndex((r) => {
  const a = r.sharedPluginData, b = c.sharedPluginData;
  if (!!a !== !!b) return false;
  if (a && b && (a.namespace !== b.namespace || keyOf({ types: [], sharedPluginData: a }) !== keyOf({ types: [], sharedPluginData: b }))) return false;
  return (c.types ?? []).every((t) => r.types.includes(t));
});

/** One page, every criterion, each search in a turn of its own. */
const searchPage = async (page: PageLike, criteria: readonly Criteria[], breathe?: Breathe): Promise<unknown[][]> => {
  const out: unknown[][] = [];
  for (const c of criteria) {
    out.push([...page.findAllWithCriteria!(c)]);
    if (breathe) await breathe();
  }
  return out;
};

/**
 * The root a run's lookups search: `real`'s pages loaded and searched a page per turn, once for the run. `loaded` runs once every
 * page is read, on a paged host only (`loadAllPagesAsync`, which `dynamic-page` asks of a later document-wide call).
 */
export const readRun = async <R extends object>(real: R, criteria: readonly Criteria[], breathe?: Breathe, loaded?: () => Promise<void>): Promise<R> => {
  const root = real as unknown as RootLike;
  const run: Run = { real: root, criteria, whole: new Map(), ...(breathe ? { breathe } : {}) };
  if (paged(root)) {
    run.pages = new Map();
    for (const p of pagesOf(root)) {
      if (typeof p.loadAsync === 'function') { await p.loadAsync(); if (breathe) await breathe(); }
      run.pages.set(pageKey(p), await searchPage(p, criteria, breathe));
    }
    if (loaded) await loaded();
  }
  const answer = (c: Criteria): unknown[] => {
    const i = coverOf(run.criteria, c);
    if (!run.pages) {
      // Searched in one go: each distinct criteria once, kept until the next write's re-read.
      const k = keyOf(c);
      if (!run.whole.has(k)) run.whole.set(k, [...root.findAllWithCriteria(c)]);
      return run.whole.get(k)!.filter((n) => !gone(n));
    }
    if (i < 0) return [...root.findAllWithCriteria(c)];
    const want = new Set(c.types);
    const out: unknown[] = [];
    // The file's pages as they are now, in their order now: a page reordered by the run answers in its new place, and
    // a page the run made (#2989) is searched when first asked for, on its own.
    for (const p of pagesOf(root)) {
      let hit = run.pages.get(pageKey(p));
      if (!hit) { hit = criteria.map((x) => [...p.findAllWithCriteria!(x)]); run.pages.set(pageKey(p), hit); }
      for (const n of hit[i]) if (!gone(n) && (!want.size || want.has(typeOf(n)))) out.push(n);
    }
    return out;
  };
  // A facade, not a `Proxy` (#3209): a host whose members are fixed would throw on a trap's substitute.
  const stand = facade(real, {
    findAllWithCriteria: (c: Criteria) => answer(c),
    findAll: (fn: (n: unknown) => boolean) => root.findAll!(fn),
  });
  RUNS.set(stand, run);
  return stand;
};

/** `host` with its root standing in for the file's from `root`, a run's (`readRun`); every other member is `host`'s. */
export const withRoot = <H extends object>(host: H, root: object): H => facade(host, { root });

/** The page `node` sits on, or `undefined` for a node on no page (or one the host will not walk). */
const pageOf = (node: unknown): PageLike | undefined => {
  let n = node as { type?: unknown; parent?: unknown } | null | undefined;
  for (let i = 0; n && i < 1000; i++) {
    try { if (n.type === 'PAGE') return n as PageLike; n = n.parent as typeof n; } catch { return undefined; }
  }
  return undefined;
};

/**
 * AFTER A WRITE: the pages `nodes` sit on are searched again, each search in a turn of its own, so the run's next
 * lookup sees what the write added. A node on no page the host can name re-reads the whole file a page per turn; a
 * root that is no run's is left alone. `all` re-reads every page: after the run moved sets between pages (#2989).
 */
export const rereadAfter = async (root: unknown, nodes: readonly unknown[], all = false): Promise<void> => {
  const run = root && typeof root === 'object' ? RUNS.get(root) : undefined;
  if (!run) return;
  if (!run.pages) { run.whole.clear(); return; }
  const live = pagesOf(run.real);
  const want: (PageLike | undefined)[] = all ? [...live] : [...new Set(nodes.map(pageOf))];
  const pages = want.some((p) => p === undefined) ? live : (want as PageLike[]);
  for (const p of pages) {
    if (!live.includes(p) && !live.some((x) => pageKey(x) === pageKey(p))) continue;
    run.pages.set(pageKey(p), await searchPage(p, run.criteria, run.breathe));
  }
};

/** Whether `root` is a run's (`readRun`). */
export const isRunRoot = (root: unknown): boolean => !!root && typeof root === 'object' && RUNS.has(root);
