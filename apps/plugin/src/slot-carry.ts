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
 * THE SIZE IS BOUNDED (#3796 review B1). One entry per carry kind, on the set. Measured on the shim, a capture costs
 * about 720 B per placed instance for a three-row Checkbox group (4316 B for 6) and about 145 B per instance for Banner's
 * text (1444 B for 10), so about 125 placed instances of one three-row set reach `CARRY_MAX_BYTES`, and fewer for List's
 * eight rows. A master file can hold that many, and Figma refuses an entry over 100 kB (`agent-protocol.ts`, `MAILBOX`).
 * So a capture over the bound is never written, and a write the host refuses is caught: either way the entry is cleared
 * and that set carries in memory only for this run, as before #3762, and its outcome names it (`CarryUnkept`). The run
 * goes on. Splitting the capture across entries was weighed and not taken: it adds a manifest and a torn state (a close
 * between two chunk writes) for a case the in-memory fallback already covers as well as the plugin ever did.
 *
 * A KEPT ENTRY IS VALIDATED, field by field, before it is used (#3796 review B2). The key sits in the shared `prism3`
 * namespace and outlives the plugin version that wrote it, so an entry this version cannot read (unparsable, or any
 * field of any instance the wrong type) is treated as absent: the dry run names it (`carryUnreadable`), and the set's
 * next write clears it. It never throws, in the dry run or the apply.
 */
import { NS } from './persist-figma';
import { utf8Bytes } from './agent-protocol';
import type { SlotMigration } from './slot-migration';
import type { SlotTextMigration } from './slot-text-migration'; import { failureDetail } from './host-detail';   // #4253

/** The plugin-data keys, one per carry kind. */
export const CARRY_KEY = { rows: 'slotCarry', text: 'slotTextCarry' } as const;
export type CarryKind = keyof typeof CARRY_KEY;
type CaptureOf = { rows: SlotMigration; text: SlotTextMigration };

/** The largest capture kept, in UTF-8 bytes: under Figma's 100 kB per entry, with the same room `MAILBOX.chunkBytes` leaves. */
export const CARRY_MAX_BYTES = 90_000;

/** A capture that could not be kept on the set, so this run carries it in memory only: why, and its size. */
export type CarryUnkept = { kind: CarryKind; bytes: number; refused?: string };

type DataNode = { getSharedPluginData?(ns: string, key: string): string; setSharedPluginData?(ns: string, key: string, value: string): void };

// ---- validation (B2) ----------------------------------------------------------------------------------------------

type U = Record<string, unknown>;
const obj = (v: unknown): v is U => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const strs = (v: unknown): boolean => Array.isArray(v) && v.every(str);
const vals = (v: unknown): boolean => obj(v) && Object.values(v).every((x) => typeof x === 'string' || typeof x === 'boolean');
const head = (c: unknown): c is U => obj(c) && str(c.id) && str(c.name) && str(c.page) && str(c.member) && (c.nested === undefined || c.nested === true);
const row = (r: unknown): boolean => obj(r) && str(r.row) && obj(r.main) && str(r.main.id) && str(r.main.name) && str(r.main.set) && vals(r.props)
  && Array.isArray(r.exposed) && r.exposed.every((e) => obj(e) && str(e.name) && vals(e.props)) && (r.at === undefined || Number.isInteger(r.at));
const textCase = (k: unknown): boolean => obj(k) && ((k.kind === 'move' && str(k.characters)) || (k.kind === 'rich' && strs(k.layers)) || k.kind === 'empty');
const VALID: { [K in CarryKind]: (v: unknown) => v is CaptureOf[K] } = {
  rows: (v): v is SlotMigration => obj(v) && str(v.slot) && (v.within === undefined || str(v.within)) && Array.isArray(v.instances)
    && v.instances.every((c) => head(c) && Array.isArray(c.rows) && c.rows.every(row) && strs(c.hidden) && strs(c.lost)),
  text: (v): v is SlotTextMigration => obj(v) && str(v.slot) && str(v.property) && str(v.show) && str(v.hide) && Array.isArray(v.instances)
    && v.instances.every((c) => head(c) && textCase(c.case)),
};

/** The entry on `set` for `kind`: its capture when it is one this version can read, and whether an entry is there that
 *  it cannot (unparsable, or any field the wrong type). Never throws. */
export const readCarry = <K extends CarryKind>(set: unknown, kind: K): { capture: CaptureOf[K] | null; unreadable: boolean } => {
  let raw = '';
  try { raw = (set as DataNode).getSharedPluginData?.(NS, CARRY_KEY[kind]) ?? ''; } catch { return { capture: null, unreadable: false }; }
  if (!raw) return { capture: null, unreadable: false };
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return { capture: null, unreadable: true }; }
  return VALID[kind](v) ? { capture: v, unreadable: false } : { capture: null, unreadable: true };
};

/** The capture kept on `set` for `kind`, or `null` when none is, or it cannot be read. */
export const keptCarry = <K extends CarryKind>(set: unknown, kind: K): CaptureOf[K] | null => readCarry(set, kind).capture;

/** The kinds whose entry on `set` this version cannot read, for the dry run to name (B2). */
export const carryUnreadable = (set: unknown): CarryKind[] => (Object.keys(CARRY_KEY) as CarryKind[]).filter((k) => readCarry(set, k).unreadable);

// ---- the write (B1) -----------------------------------------------------------------------------------------------

/**
 * Keep `capture` on `set`, narrowed to the instances in `only` when given; an empty capture removes the entry. NEVER
 * THROWS: a capture over `CARRY_MAX_BYTES`, or one the host refuses, clears the entry instead (best effort) and comes
 * back as `CarryUnkept`, so the caller carries it in memory for this run and names it. `null` when kept or cleared.
 */
export const keepCarry = <K extends CarryKind>(set: unknown, kind: K, capture: CaptureOf[K] | null, only?: ReadonlySet<string>): CarryUnkept | null => {
  const node = set as DataNode;
  const clear = (): void => { try { node.setSharedPluginData?.(NS, CARRY_KEY[kind], ''); } catch { /* nothing more to do: the entry is ignored if unreadable */ } };
  const instances = (capture?.instances ?? []).filter((c: { id: string }) => !only || only.has(c.id));
  if (!capture || !instances.length) { clear(); return null; }
  const json = JSON.stringify({ ...capture, instances });
  const bytes = utf8Bytes(json);
  if (bytes > CARRY_MAX_BYTES) { clear(); return { kind, bytes }; }
  try { node.setSharedPluginData?.(NS, CARRY_KEY[kind], json); } catch (err) {
    clear();
    return { kind, bytes, refused: failureDetail(err) };
  }
  return null;
};

/** A fresh capture with the kept one's instances added after it, for each id the fresh read no longer lists. */
export const withKept = <T extends { instances: { id: string }[] }>(fresh: T | null, kept: T | null): { capture: T | null; added: T['instances'] } => {
  if (!kept?.instances.length) return { capture: fresh, added: [] };
  const have = new Set((fresh?.instances ?? []).map((c) => c.id));
  const added = kept.instances.filter((c) => !have.has(c.id));
  if (!fresh) return { capture: added.length ? { ...kept, instances: added } : null, added };
  return { capture: { ...fresh, instances: [...fresh.instances, ...added] }, added };
};

// ---- the words (DRAFT, for the owner: #3796 review) ----------------------------------------------------------------

/** The apply's line for a capture it could not keep. DRAFT. */
export const unkeptLine = (set: string, u: CarryUnkept): string => u.refused
  ? `${set}: Figma refused to save its placed instances' slot content on the set (${u.refused}), so only this run carries it.`
  : `${set}: its placed instances' slot content is too large to save on the set (${Math.ceil(u.bytes / 1000)} kB, over ${CARRY_MAX_BYTES / 1000} kB), so only this run carries it.`;

/** The dry run's line for an entry this version cannot read. DRAFT. */
export const unreadableLine = (set: string): string => `${set}: slot content saved by an earlier update can't be read, so this update ignores it. The set's next update clears it.`;
