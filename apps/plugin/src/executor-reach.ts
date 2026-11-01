/**
 * WHICH SETS EACH EXECUTOR REVISION REDRAWS (#3101, follow-up to Q811.1 / Q820 A).
 *
 * `EXECUTOR_REVISION` says THAT the executor moved; this says WHERE. Each revision above `floor` has one entry in
 * `executor-reach.json`: the def ids whose drawing it changes, or `"all"`. A set drawn under revision `from` is due
 * for the executor at revision `to` only when some revision in `(from, to]` reaches it (`reaches`). The as-built
 * ledger asks it for a set (`as-built-ledger.ts`, `dueOf`), and the update's dry run for each member's stamp
 * (`update-plan.ts`), so the two keep agreeing on which sets an executor change makes due.
 *
 * WHY A RECORD AND NOT A PRINT AT OPEN. The drawing can only be measured by running the executor, and the plugin opens
 * loading no page (#3110) and carries no host model to draw into. So the drawing is measured where the executor
 * changes, in CI, and the plugin reads the answer: a table lookup per set at open, no projection, no page.
 *
 * WHAT HOLDS IT HONEST: `apps/plugin/lint-executor-reach.ts`. On a change that raises the revision it draws every
 * projected def with the base's executor and with this tree's, in the component shim, over this tree's plans (a fresh
 * build, an in-place update, and an update across a lever change, under more than one brand), and fails when a def
 * whose drawing moved is not in the new revisions' entries. An entry may name more than moved; never fewer. Entries
 * at or below the base's revision may not change: a record a later PR could narrow would be no record.
 *
 * WHAT IT CANNOT SEE, and the answer to each: a write the shim does not model (its header's limit: it records what
 * it was taught) and a lever combination no brand in the gate's corpus draws. A call to a host API the shim lacks,
 * made through optional chaining (`node.setExplicitVariableModeForCollection?.(…)`, the executor's `?.()` style), is a
 * no-op in the shim; since #3160 the gate still sees it, because every node records each property it is asked for and
 * lacks, so such a call reads as a drawing change. A method the shim implements as a no-op it still cannot see. An author who knows a change reaches
 * further than the gate can measure declares the sets, or `"all"`. A revision with no entry, or at or below
 * `floor`, reaches every set, as every revision did before this record existed.
 *
 * AN ENTRY KEEPS THE IDS IT WAS MEASURED UNDER. A def renamed later (`COMPONENT_RENAMES`, Tab → Tab item, #2759) is
 * matched by its current id (`currentDefId`), so the record is never rewritten for a rename.
 *
 * NOT A BUMP OF ITS OWN. Neither file is reached from `write-components.ts`, so `lint-executor-revision.ts` never asks
 * for a revision when only the record changes.
 */
import { currentDefId } from '@prism3/engine/component-renames';
import table from './executor-reach.json';

/** A revision's entry: the def ids it redraws, or every set. */
export type Reach = readonly string[] | 'all';
export type ReachTable = { readonly floor: number; readonly reach: Readonly<Record<string, Reach>> };

export const EXECUTOR_REACH: ReachTable = table as ReachTable;

/** Whether set `def` (today's id), drawn under revision `from`, draws differently under revision `to`. A revision that moved
 *  back (an older plugin on a newer file), an unknown one, or a range that crosses `floor` or a missing entry reads
 *  as reaching it, which is the reading before this record. */
export const reaches = (def: string, from: number, to: number, t: ReachTable = EXECUTOR_REACH): boolean => {
  if (from === to) return false;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to || from < t.floor) return true;
  for (let r = from + 1; r <= to; r++) {
    const e = t.reach[String(r)];
    if (e === undefined || e === 'all' || e.some((id) => id === def || currentDefId(id) === def)) return true;
  }
  return false;
};
