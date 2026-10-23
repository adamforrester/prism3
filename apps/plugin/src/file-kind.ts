/**
 * WHAT KIND OF FILE THE PLUGIN OPENED IN (#2879; the owner's Q485 C, and Q613 A on all ten wireframe questions).
 *
 * The start window used to open in every file with no saved brand, including a product file that only USES a
 * published Prism3 library. This module answers the one question that decides between the start window and the
 * library home: does this file consume a Prism3 library and hold no Prism3 tokens of its own?
 *
 * WHERE IT RUNS. Only inside `restoreToUi`'s empty branch (`main.ts`): a file with a saved brand, or an unreadable one,
 * never reaches it, so the #1197 §2 regression guard and its three outcomes are untouched. A fourth outcome,
 * `restore-input-library`, is posted when this says `library`; every other kind posts `restore-input-empty`, as today.
 *
 * TWO HALVES. `classifyFile` is pure: the wireframe's decision table, read top to bottom, the first matching row
 * deciding. `probeFile` reads the signals from the document within a budget, through a narrow port (`FileKindApi`) so a
 * test can build a file without the plugin typings. The table, as rows:
 *   3. local Prism3 collections (a `modes:owned` stamp)       → brand: the start window, as today. Local beats remote.
 *   4, 5. confirmed Prism3 library use on this page           → library: the library home, no dialog. Another library
 *         in use as well does not change it (row 5).
 *   7. remote use, identity not confirmed by a stamp          → undecided: the start window with its X.
 *   8, 9. no Prism3 library use, another library or nothing   → new: the start window with its X.
 *   10. the check failed or ran past its budget               → undecided: the start window with its X.
 * Row 6 (a Prism3 library enabled but unused) is not built: an enabled collection's identity cannot be confirmed without
 * importing from it, so it reads as row 8 or 9 (new).
 *
 * IDENTITY COMES FROM A STAMP PRISM3 WROTE, never from a name (the rebind skill's §8 rule): `memberStamp`
 * (`ENGINE_VERSION|plan|revision`, `write-components.ts`) on a remote main component, or `modes:owned`
 * (`write-figma.ts`) on a remote variable collection. Whether shared plugin data travels with a published component or
 * collection into a consuming file is NOT yet measured (the wireframe's step 0). Until it is, a file whose remote nodes
 * carry no stamp is row 7, undecided, which opens the start window with its X (Q613 9 A). Nothing here guesses.
 *
 * SCOPE AND BUDGET (Q613 2 A): the current page only, within 1.5 s. A miss is undecided, never a guess.
 */

/** The shared plugin data a node carries. Optional, as on every port in this plugin. */
export interface SharedData {
  getSharedPluginData?(namespace: string, key: string): string;
}

/** A remote main component: whether it is remote, and its stamp. */
export interface MainLike extends SharedData { readonly remote: boolean }

/** A node on the current page, as the probe walks it. */
export interface PageNode {
  readonly type: string;
  readonly children?: readonly PageNode[];
  /** Figma's `boundVariables`: a field to an alias, or to a list of aliases (fills, strokes, effects). */
  readonly boundVariables?: Readonly<Record<string, unknown>>;
  /** Instances only. */
  getMainComponentAsync?(): Promise<MainLike | null>;
}

export interface VariableLike { readonly remote: boolean; readonly variableCollectionId: string }
export interface CollectionLike extends SharedData { readonly remote?: boolean; readonly key?: string }
/** One collection from an enabled library (`figma.teamLibrary`), for the library's name. */
export interface LibraryCollection { readonly key: string; readonly libraryName: string }

/** The slice of the plugin API the probe reads. */
export interface FileKindApi {
  getLocalVariableCollectionsAsync(): Promise<readonly SharedData[]>;
  readonly page: { readonly children: readonly PageNode[] };
  getVariableByIdAsync(id: string): Promise<VariableLike | null>;
  getVariableCollectionByIdAsync(id: string): Promise<CollectionLike | null>;
  /** `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync`, or null where the permission is missing. */
  readonly libraryCollections: (() => Promise<readonly LibraryCollection[]>) | null;
  /** Milliseconds, monotonic enough to measure the budget. */
  now(): number;
  /** Resolve after `ms`: the budget's hard stop, for a read that never returns. Optional: without it, the budget is
   *  checked between reads only. */
  after?(ms: number): Promise<void>;
}

/** What the probe found. Counts are of THIS page. */
export type FileSignals = {
  /** A local collection carries Prism3's `modes:owned` stamp. */
  readonly localPrism3: boolean;
  /** Instances whose remote main carries a Prism3 build stamp. */
  readonly prism3Instances: number;
  /** Bindings (node × field) to a remote variable whose collection carries Prism3's `modes:owned` stamp. */
  readonly prism3Bindings: number;
  /** Instances of a remote main, and bindings to a remote variable, that carry no Prism3 stamp. */
  readonly otherRemote: number;
  /** The engine versions the stamped mains were built by, ascending, unique. */
  readonly versions: readonly string[];
  /** The library's name, from the enabled-library list, when a stamped collection's key is in it. */
  readonly libraryName: string | null;
  /** The check could not finish: it threw, or it ran past its budget. */
  readonly stopped: 'failed' | 'timeout' | null;
};

export type FileKind = 'brand' | 'library' | 'new' | 'undecided';

/** The decision table (above), first matching row. Pure. */
export const classifyFile = (s: FileSignals): FileKind => {
  if (s.localPrism3) return 'brand';                                    // row 3: local always beats remote
  if (s.stopped) return 'undecided';                                    // row 10
  if (s.prism3Instances + s.prism3Bindings > 0) return 'library';      // rows 4 and 5
  if (s.otherRemote > 0) return 'undecided';                            // row 7: remote, identity not confirmed
  return 'new';                                                         // rows 8 and 9
};

/** The budget, in milliseconds (Q613 2 A). */
export const FILE_CHECK_BUDGET_MS = 1500;

const NS = 'prism3';
const read = (n: SharedData | null | undefined, key: string): string => {
  try { return n?.getSharedPluginData?.(NS, key) ?? ''; } catch { return ''; }
};
/** A `modes:owned` stamp is a JSON array of mode ids (`stampOwnedModes`); any non-empty array is Prism3's. */
const ownsModes = (c: SharedData | null | undefined): boolean => {
  const raw = read(c, 'modes:owned');
  if (!raw) return false;
  try { const v: unknown = JSON.parse(raw); return Array.isArray(v) && v.length > 0; } catch { return false; }
};
/** A `memberStamp` is `ENGINE_VERSION|plan|revision`; its first half is a semver when Prism3 wrote it. */
const stampVersion = (m: SharedData | null | undefined): string | null => {
  const v = read(m, 'memberStamp').split('|')[0] ?? '';
  return /^\d+\.\d+\.\d+$/.test(v) ? v : null;
};
const semverCmp = (a: string, b: string): number => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

/** The alias ids a node's `boundVariables` holds, one per bound field (a list field counts each alias). */
const aliasIds = (bv: Readonly<Record<string, unknown>> | undefined): string[] => {
  const out: string[] = [];
  const take = (v: unknown): void => {
    if (v && typeof v === 'object' && (v as { type?: unknown }).type === 'VARIABLE_ALIAS' && typeof (v as { id?: unknown }).id === 'string') out.push((v as { id: string }).id);
  };
  for (const v of Object.values(bv ?? {})) {
    if (Array.isArray(v)) v.forEach(take); else take(v);
  }
  return out;
};

class OverBudget extends Error {}

/**
 * Read the signals: the file's local collections, then the current page. An instance counts once and its own layers are
 * not walked (they are the library's, not this file's); every other node's bindings count. Stops with `timeout` once the
 * budget is spent, and with `failed` if a read throws. Never throws itself.
 */
export const probeFile = async (api: FileKindApi, budgetMs = FILE_CHECK_BUDGET_MS): Promise<FileSignals> => {
  if (!api.after) return walk(api, budgetMs);
  const late: FileSignals = { localPrism3: false, prism3Instances: 0, prism3Bindings: 0, otherRemote: 0, versions: [], libraryName: null, stopped: 'timeout' };
  return Promise.race([walk(api, budgetMs), api.after(budgetMs).then(() => late)]);
};

const walk = async (api: FileKindApi, budgetMs: number): Promise<FileSignals> => {
  const start = api.now();
  const check = (): void => { if (api.now() - start > budgetMs) throw new OverBudget(); };
  let localPrism3 = false, prism3Instances = 0, prism3Bindings = 0, otherRemote = 0;
  const versions = new Set<string>();
  const prism3Keys = new Set<string>();
  let libraryName: string | null = null;
  const signals = (stopped: FileSignals['stopped']): FileSignals => ({
    localPrism3, prism3Instances, prism3Bindings, otherRemote,
    versions: [...versions].sort(semverCmp), libraryName, stopped,
  });
  try {
    localPrism3 = (await api.getLocalVariableCollectionsAsync()).some(ownsModes);
    // Local beats remote (row 3), so a file with tokens of its own needs no page walk.
    if (localPrism3) return signals(null);
    check();
    /** A variable id → whether it is a Prism3 library's (`true`), another remote one (`false`), or local (`null`). */
    const varKind = new Map<string, boolean | null>();
    const kindOf = async (id: string): Promise<boolean | null> => {
      if (varKind.has(id)) return varKind.get(id)!;
      const v = await api.getVariableByIdAsync(id);
      let k: boolean | null = null;
      if (v?.remote) {
        const c = await api.getVariableCollectionByIdAsync(v.variableCollectionId);
        k = ownsModes(c);
        if (k && c?.key) prism3Keys.add(c.key);
      }
      varKind.set(id, k);
      return k;
    };
    const stack: PageNode[] = [...api.page.children];
    while (stack.length) {
      check();
      const n = stack.pop()!;
      if (n.type === 'INSTANCE' && n.getMainComponentAsync) {
        const main = await n.getMainComponentAsync();
        if (main?.remote) {
          const v = stampVersion(main);
          if (v) { prism3Instances++; versions.add(v); } else otherRemote++;
          continue;   // a remote instance's layers are the library's
        }
      }
      for (const id of aliasIds(n.boundVariables)) {
        const k = await kindOf(id);
        if (k === true) prism3Bindings++; else if (k === false) otherRemote++;
      }
      if (n.children) stack.push(...n.children);
    }
    // The name (Q613 1 A): from the enabled-library list, by a stamped collection's key. Absent, the home says
    // "Prism3 library". Its own try: a refused or missing permission costs the name, never the decision.
    if (prism3Keys.size && api.libraryCollections) {
      try {
        check();
        libraryName = (await api.libraryCollections()).find((c) => prism3Keys.has(c.key))?.libraryName ?? null;
      } catch (e) { if (e instanceof OverBudget) throw e; libraryName = null; }
    }
    check();
    return signals(null);
  } catch (e) {
    return signals(e instanceof OverBudget ? 'timeout' : 'failed');
  }
};

/** What the UI's library home is told: the evidence it states, never a guess. */
export type LibraryFile = {
  readonly name: string | null;
  readonly versions: readonly string[];
  readonly instances: number;
  readonly bindings: number;
};
export const libraryFileOf = (s: FileSignals): LibraryFile => ({
  name: s.libraryName, versions: s.versions, instances: s.prism3Instances, bindings: s.prism3Bindings,
});
