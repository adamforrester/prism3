/**
 * THE AS-BUILT LEDGER (#2909 IA v2 phase 2, owner decision Q2909.8 A; v2's "How Update file decides what's due").
 *
 * WHAT IT IS. One record in the file's root plugin data, one entry per component set Prism3 wrote: a hash of the def
 * the set was built from AFTER the brand's levers were applied (`materializeForBrand`, before projection), the
 * `EXECUTOR_REVISION` and the `ENGINE_VERSION` that wrote it, and (#3082, Q811 A) a print of the plans it was drawn
 * from (`printOf`): one hash of the whole projection, and per part a short hash of each facet of it, for the reason
 * line. Build writes an entry for each set it lands whole, and the in-place Update for each set it acts on (`main.ts`).
 *
 * WHAT IT ANSWERS: which sets are due, with one root read and no page loaded (`dueOf`). The due check materializes
 * every def the file holds against the file's brand, hashes it and lays it against the entry:
 *   · `current`     the def, the revision and the engine all match; or (Q811 A) only `ENGINE_VERSION` moved and the
 *                   set's projected plans print as they did when it was drawn, so its drawing would not change;
 *   · `due`         `definition` when the materialized def moved under the same engine (a lever the set follows);
 *                   `engine` when the engine moved and the plans with it, naming what moved (`movedOf`);
 *                   `executor` when `EXECUTOR_REVISION` moved, whatever the plans say (Q811.1, below);
 *   · `unrecorded`  no entry: a set built before the ledger existed, or by hand; and an entry from before Q811 A,
 *                   with no print, once the engine has moved past it. Only the full check can tell.
 *
 * WHY A REVISION MOVE STILL MAKES A SET DUE (Q811.1, decided here on the evidence). A plan print cannot see the
 * executor: `EXECUTOR_REVISION` moves exactly when the code that turns a plan into layers moves (`executor-revision.ts`:
 * 7 of 22 pipeline commits changed the executor alone and no plan byte), and the update's own dry run reads every
 * member stamped under another revision as one to update (`update-plan.ts`, `revField !== rev`). Calling such a set
 * current would hide a drawing change and disagree with the full check. The cost is the coarse signal for those
 * releases only; narrowing it (a revision naming the sets it reaches) is the owner's call, held as Q811.1.
 *
 * WHAT IT CANNOT SEE: hand edits. Those need the members read, which the background pass after load does a set at a
 * time (`handEditsOf`, `update-plan.ts`), and the full check scoped to the flagged sets does again, exactly, before
 * anything is written.
 *
 * Pure: the root is passed in, so a Node test drives it on a fake. A missing, unreadable or malformed record reads as
 * empty, never a throw: every set is then `unrecorded`.
 */
import type { AnatomyPlan, FigmaNodePlan } from '@prism3/engine/anatomy-figma';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { EXECUTOR_REVISION } from './executor-revision';

/** The root plugin-data key. */
export const LEDGER_KEY = 'prism3:asBuilt';
/** The record's format. A record in another one reads as empty. */
export const LEDGER_V = 1;

/** What a part of a set's plans can move in, for the reason line. Every plan field falls in one; an unknown one is
 *  `content`. */
export const FACETS = ['size', 'color', 'type', 'effect', 'layout', 'content'] as const;
export type Facet = typeof FACETS[number];
/** A set's plans, printed (#3082 Q811 A): `plan` hashes them whole and decides; `parts` holds, per part name, one 4-hex
 *  chunk per facet in `FACETS` order, plus `set` for the plans' own fields (names, coordinates, axes), and only words
 *  the reason. */
export type PlanPrint = { readonly plan: string; readonly parts: Readonly<Record<string, string>>; readonly set: string };
export type LedgerEntry = { readonly def: string; readonly rev: number; readonly engine: string; readonly print?: PlanPrint };
export type Ledger = Readonly<Record<string, LedgerEntry>>;

type DataRoot = { getPluginData?(key: string): string; setPluginData?(key: string, value: string): void };

/** FNV-1a, 64-bit as two 32-bit halves, hex: the same hash the update's dry run keeps its stamps in. */
const fnv = (s: string): string => {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
};

const FACET_OF: Readonly<Record<string, Facet>> = {
  aspectRatio: 'size', minWidth: 'size', maxWidth: 'size', placementWidth: 'size', placementHeight: 'size', glyphPx: 'size',
  glyphInset: 'size', layoutGrow: 'size', instanceSizing: 'size', primaryAxisSizingMode: 'size', counterAxisSizingMode: 'size',
  textAutoResize: 'size', minLines: 'size', absoluteInset: 'size', absoluteStrokeInset: 'size', absoluteCenter: 'size',
  absoluteCenterOn: 'size', absoluteScale: 'size', cornerInset: 'size', footPin: 'size', pin: 'size', paddingPx: 'size', bound: 'size',
  paints: 'color', gradientFill: 'color', descendantFills: 'color', fixedPaint: 'color',
  textStyle: 'type', characters: 'type', textDefault: 'type', textAlignVertical: 'type',
  effectStyle: 'effect', zeroOpacity: 'effect',
  layoutMode: 'layout', primaryAxisAlignItems: 'layout', counterAxisAlignItems: 'layout', layoutAlign: 'layout', clipsContent: 'layout',
};

/**
 * THE PRINT OF A SET'S PLANS (#3082 Q811 A), as the executor would draw them: the plans `figmaAnatomySet` gives for the
 * materialized def, the same ones a build or an update hands the executor. Each node's fields, children aside, go to its
 * part name and facet, plan by plan in order, so a part's chunk moves when any variant's value of that facet moves.
 */
export const printOf = (plans: readonly AnatomyPlan[]): PlanPrint => {
  const acc = new Map<string, string[]>();
  const put = (part: string, f: Facet, v: string): void => {
    let a = acc.get(part);
    if (!a) acc.set(part, a = FACETS.map(() => ''));
    a[FACETS.indexOf(f)] += v;
  };
  let set = '';
  plans.forEach((p, i) => {
    const { root, ...own } = p;
    set += JSON.stringify(own);
    const walk = (n: FigmaNodePlan): void => {
      const { children, name, ...fields } = n;
      for (const [k, v] of Object.entries(fields)) put(name, FACET_OF[k] ?? 'content', `${i}.${k}=${JSON.stringify(v)};`);
      // A part present in a plan is a fact of its own, so a part that appears in more variants moves.
      put(name, 'content', `${i};`);
      children.forEach(walk);
    };
    walk(root);
  });
  return {
    plan: fnv(JSON.stringify(plans)),
    parts: Object.fromEntries([...acc].map(([k, a]) => [k, a.map((v) => fnv(v).slice(0, 4)).join('')])),
    set: fnv(set).slice(0, 4),
  };
};

/** The entry a set built now from `materialized` gets; `plans`, the plans drawn from it, give its print. */
export const entryFor = (materialized: ComponentDef, plans?: readonly AnatomyPlan[], rev: number = EXECUTOR_REVISION, engine: string = ENGINE_VERSION): LedgerEntry =>
  ({ def: fnv(JSON.stringify(materialized)), rev, engine, ...(plans ? { print: printOf(plans) } : {}) });

const isPrint = (v: unknown): v is PlanPrint => !!v && typeof v === 'object' && typeof (v as PlanPrint).plan === 'string'
  && typeof (v as PlanPrint).set === 'string' && !!(v as PlanPrint).parts && typeof (v as PlanPrint).parts === 'object'
  && Object.values((v as PlanPrint).parts).every((c) => typeof c === 'string');

const isEntry = (v: unknown): v is LedgerEntry => !!v && typeof v === 'object'
  && typeof (v as LedgerEntry).def === 'string' && typeof (v as LedgerEntry).rev === 'number' && typeof (v as LedgerEntry).engine === 'string'
  && ((v as LedgerEntry).print === undefined || isPrint((v as LedgerEntry).print));

/** The file's ledger, by def id. */
export const readLedger = (root: DataRoot): Ledger => {
  let raw = '';
  try { raw = root.getPluginData?.(LEDGER_KEY) ?? ''; } catch { return {}; }
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as { v?: unknown; sets?: unknown };
    if (v.v !== LEDGER_V || !v.sets || typeof v.sets !== 'object') return {};
    return Object.fromEntries(Object.entries(v.sets as Record<string, unknown>).filter(([, e]) => isEntry(e))) as Ledger;
  } catch { return {}; }
};

/** Record `entries` in the file, over what it holds for those defs. A refused write throws, for the caller to catch. */
export const recordSets = (root: DataRoot, entries: Ledger): void => {
  if (!Object.keys(entries).length) return;
  root.setPluginData?.(LEDGER_KEY, JSON.stringify({ v: LEDGER_V, sets: { ...readLedger(root), ...entries } }));
};

/** What moved between two prints, for the reason line: each part whose facets moved, each part added or dropped, and
 *  whether the plans' own fields (names, coordinates, axes) moved. */
export type Moved = {
  readonly parts: readonly { readonly part: string; readonly facets: readonly Facet[] }[];
  readonly added: readonly string[]; readonly dropped: readonly string[]; readonly set: boolean;
};
export const movedOf = (was: PlanPrint, is: PlanPrint): Moved => {
  const parts: { part: string; facets: Facet[] }[] = [];
  for (const [part, c] of Object.entries(is.parts)) {
    const w = was.parts[part];
    if (w === undefined) continue;
    const facets = FACETS.filter((_, i) => c.slice(i * 4, i * 4 + 4) !== w.slice(i * 4, i * 4 + 4));
    if (facets.length) parts.push({ part, facets });
  }
  return {
    parts,
    added: Object.keys(is.parts).filter((p) => !(p in was.parts)),
    dropped: Object.keys(was.parts).filter((p) => !(p in is.parts)),
    set: was.set !== is.set,
  };
};

export type DueReason = 'definition' | 'engine' | 'executor';
export type SetDue = { readonly state: 'current' | 'unrecorded' }
  | { readonly state: 'due'; readonly reason: 'definition' | 'executor' }
  | { readonly state: 'due'; readonly reason: 'engine'; readonly moved: Moved };

/** The sets whose read needs their plans printed now: the engine moved past an entry that carries a print, and the
 *  revision did not. The caller prints only these (projecting a set is the costly part), then calls `dueOf`. */
export const needsPrint = (ledger: Ledger, present: readonly string[], now: (def: string) => LedgerEntry | null): string[] =>
  present.filter((id) => {
    const was = ledger[id];
    const is = was && was.print ? now(id) : null;
    return !!is && was.rev === is.rev && was.engine !== is.engine;
  });

/**
 * Each of `present`'s sets, read against the ledger. `now` is the entry a set built now would get, without its print;
 * `print` is the print of the plans it would be drawn from now, asked only for the sets `needsPrint` names.
 */
export const dueOf = (ledger: Ledger, present: readonly string[], now: (def: string) => LedgerEntry | null, print: (def: string) => PlanPrint | null = () => null): Record<string, SetDue> => {
  const out: Record<string, SetDue> = {};
  for (const id of present) {
    const was = ledger[id];
    const is = now(id);
    if (!was || !is) { out[id] = { state: 'unrecorded' }; continue; }
    if (was.rev !== is.rev) { out[id] = { state: 'due', reason: 'executor' }; continue; }
    if (was.engine === is.engine) { out[id] = was.def === is.def ? { state: 'current' } : { state: 'due', reason: 'definition' }; continue; }
    // Q811 A: the engine moved. Due only when the drawing would: the print of the plans, not the version.
    const p = was.print ? print(id) : null;
    out[id] = !was.print || !p ? { state: 'unrecorded' }
      : p.plan === was.print.plan ? { state: 'current' }
      : { state: 'due', reason: 'engine', moved: movedOf(was.print, p) };
  }
  return out;
};

/**
 * THE QUIET RE-RECORD (Q811 A): the sets `dueOf` read `current` although their entry names another engine, or carries
 * no print yet (an entry from before Q811 A), each with the entry it gets now. `now` here carries the print. Recorded by the next write, never by a read
 * (`main.ts`, `restampQuiet`).
 */
export const quietOf = (ledger: Ledger, due: Readonly<Record<string, SetDue>>, now: (def: string) => LedgerEntry | null): Record<string, LedgerEntry> => {
  const out: Record<string, LedgerEntry> = {};
  for (const [id, d] of Object.entries(due)) {
    const was = ledger[id];
    if (d.state !== 'current' || !was) continue;
    const e = now(id);
    if (e && (e.engine !== was.engine || !was.print)) out[id] = e;
  }
  return out;
};
