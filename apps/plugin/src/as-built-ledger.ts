/**
 * THE AS-BUILT LEDGER (#2909 IA v2 phase 2, owner decision Q2909.8 A; v2's "How Update file decides what's due").
 *
 * WHAT IT IS. One record in the file's root plugin data, one entry per component set Prism3 wrote: a hash of the def
 * the set was built from AFTER the brand's levers were applied (`materializeForBrand`, before projection), plus the
 * `EXECUTOR_REVISION` and the `ENGINE_VERSION` that wrote it. Build writes an entry for each set it lands whole, and
 * the in-place Update for each set it acts on (`main.ts`).
 *
 * WHAT IT ANSWERS: which sets are due, with one root read and no page loaded (`dueOf`). The due check materializes
 * every def the file holds against the file's brand, hashes it and lays it against the entry:
 *   · `current`     the def, the revision and the engine all match;
 *   · `due`         one moved: `definition` when the materialized def did (a lever the set follows, or the def itself),
 *                   `engine` when only the code that writes it did. Any `ENGINE_VERSION` bump flags every set, so the
 *                   signal is coarse but never wrong: the scoped full check then says "No member changes";
 *   · `unrecorded`  no entry: a set built before the ledger existed, or by hand. Only the full check can tell.
 *
 * WHAT IT CANNOT SEE: hand edits. Those need the members read, which the background pass after load does a set at a
 * time (`handEditsOf`, `update-plan.ts`), and the full check scoped to the flagged sets does again, exactly, before
 * anything is written.
 *
 * Pure: the root is passed in, so a Node test drives it on a fake. A missing, unreadable or malformed record reads as
 * empty, never a throw: every set is then `unrecorded`.
 */
import type { ComponentDef } from '@prism3/engine/component-schema';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { EXECUTOR_REVISION } from './executor-revision';

/** The root plugin-data key. */
export const LEDGER_KEY = 'prism3:asBuilt';
/** The record's format. A record in another one reads as empty. */
export const LEDGER_V = 1;

export type LedgerEntry = { readonly def: string; readonly rev: number; readonly engine: string };
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

/** The entry a set built now from `materialized` gets. */
export const entryFor = (materialized: ComponentDef, rev: number = EXECUTOR_REVISION, engine: string = ENGINE_VERSION): LedgerEntry =>
  ({ def: fnv(JSON.stringify(materialized)), rev, engine });

const isEntry = (v: unknown): v is LedgerEntry => !!v && typeof v === 'object'
  && typeof (v as LedgerEntry).def === 'string' && typeof (v as LedgerEntry).rev === 'number' && typeof (v as LedgerEntry).engine === 'string';

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

export type DueReason = 'definition' | 'engine';
export type SetDue = { readonly state: 'current' | 'unrecorded' } | { readonly state: 'due'; readonly reason: DueReason };

/** Each of `present`'s sets, read against the ledger. `now` is the entry a set built now would get. */
export const dueOf = (ledger: Ledger, present: readonly string[], now: (def: string) => LedgerEntry | null): Record<string, SetDue> => {
  const out: Record<string, SetDue> = {};
  for (const id of present) {
    const was = ledger[id];
    const is = now(id);
    if (!was || !is) { out[id] = { state: 'unrecorded' }; continue; }
    out[id] = was.def !== is.def ? { state: 'due', reason: 'definition' }
      : was.rev !== is.rev || was.engine !== is.engine ? { state: 'due', reason: 'engine' }
      : { state: 'current' };
  }
  return out;
};
