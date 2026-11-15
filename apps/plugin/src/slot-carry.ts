/**
 * A SLOT CARRY'S CAPTURE, KEPT ON THE SET UNTIL IT IS FILLED (#3761, #3762; #3697 H1's second fix).
 *
 * The two slot carries (`slot-migration.ts`, rows into a slot, #2649; `slot-text-migration.ts`, a slot's text into a
 * property, #3225) read every placed instance BEFORE the set changes and write it back AFTER. The read used to live in
 * memory only, so anything that kept the fill from reaching an instance lost that instance's content for good:
 *   · the plugin closed part-way (#3762): the members already reached hold the new shape and have lost the old, so the
 *     next run has nothing to read on them;
 *   · a Banner set that stops inside its member pass (#3761): every member's slot is already renamed, so the next run
 *     reads the set as carried and captures nothing, and the text sits in the now-hidden slot.
 *
 * So the apply writes the capture to the set's shared plugin data BEFORE the set's write (`keepCarry`), and the next
 * run's capture reads it back (`keptCarry`) for every instance its own read no longer finds. After a fill the entry is
 * narrowed to what the fill could not reach yet (a stopped set's unreached instances, a text instance whose set has no
 * properties yet) and removed once nothing is left, so a finished carry is never captured again.
 *
 * One entry per carry kind, on the set: a capture is the size of the dry run's own listing (one line per instance), far
 * under the host's 100 kB per-entry ceiling for any set in a real file.
 */
import { NS } from './persist-figma';

/** The plugin-data keys, one per carry kind. */
export const CARRY_KEY = { rows: 'slotCarry', text: 'slotTextCarry' } as const;
export type CarryKind = keyof typeof CARRY_KEY;

type DataNode = { getSharedPluginData?(ns: string, key: string): string; setSharedPluginData?(ns: string, key: string, value: string): void };

/** The capture kept on `set` for `kind`, or `null` when none is (or it cannot be read). */
export const keptCarry = <T extends { instances: { id: string }[] }>(set: unknown, kind: CarryKind): T | null => {
  let raw = '';
  try { raw = (set as DataNode).getSharedPluginData?.(NS, CARRY_KEY[kind]) ?? ''; } catch { return null; }
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as T;
    return v && Array.isArray(v.instances) ? v : null;
  } catch { return null; }
};

/** Keep `capture` on `set`, narrowed to the instances in `only` when given; an empty capture removes the entry. */
export const keepCarry = <T extends { instances: { id: string }[] }>(set: unknown, kind: CarryKind, capture: T | null, only?: ReadonlySet<string>): void => {
  const instances = (capture?.instances ?? []).filter((c) => !only || only.has(c.id));
  (set as DataNode).setSharedPluginData?.(NS, CARRY_KEY[kind], capture && instances.length ? JSON.stringify({ ...capture, instances }) : '');
};

/** A fresh capture with the kept one's instances added after it, for each id the fresh read no longer lists. */
export const withKept = <T extends { instances: { id: string }[] }>(fresh: T | null, kept: T | null): { capture: T | null; added: T['instances'] } => {
  if (!kept?.instances.length) return { capture: fresh, added: [] };
  const have = new Set((fresh?.instances ?? []).map((c) => c.id));
  const added = kept.instances.filter((c) => !have.has(c.id));
  if (!fresh) return { capture: added.length ? { ...kept, instances: added } : null, added };
  return { capture: { ...fresh, instances: [...fresh.instances, ...added] }, added };
};
