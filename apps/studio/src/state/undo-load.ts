/**
 * UNDO LOAD (#1037; owner decision Q319.2, 2026-10-18: "add an Undo load that restores the previous input until the
 * next edit").
 *
 * Before this, a load that replaced unsaved edits (the overwrite confirm's Replace brand, or a start-window path past
 * its guard) was a one-way door: someone partway through a brand who opened an example to look at it lost their work.
 * Now the brand it replaced is kept, with its provenance, and offered back once.
 *
 * WHEN IT IS KEPT: only when the load replaced edits, which is exactly when the confirm asked (`needsOverwriteConfirm`).
 * A load over an untouched brand loses nothing, so there is nothing to undo.
 *
 * HOW LONG IT LASTS: until the next edit, read as the loaded brand no longer matching its own baseline (`isDirty`), or
 * until the next load, which replaces or drops it. Kept in memory only, never persisted: one step back, not a slot.
 *
 * Pure: `main.ts` holds the stash and draws the offer; `store.restoreInput` puts the brand back.
 */
import type { BrandInput } from '@prism3/engine';
import { isDirty, needsOverwriteConfirm, type Provenance } from '../provenance';

/** The brand a load replaced: its input and provenance as they were, its last-good input (the live input when that
 *  resolves; an earlier one when the live input holds a refused edit), and its name for the offer's hint. */
export type UndoLoad = { readonly input: BrandInput; readonly provenance: Provenance; readonly lastGood: BrandInput; readonly name: string };

/** What to keep before a load replaces `current`: a copy, when the load would lose edits; else null. */
export const stashBefore = (current: BrandInput, prov: Provenance, name: string, lastGood: BrandInput): UndoLoad | null =>
  needsOverwriteConfirm(current, prov) ? { input: structuredClone(current), provenance: prov, lastGood: structuredClone(lastGood), name } : null;

/** Whether the offer still stands: the loaded brand is untouched since it loaded. The first edit ends it. */
export const stillOffered = (u: UndoLoad | null, current: BrandInput, prov: Provenance): u is UndoLoad =>
  u !== null && !isDirty(current, prov);
