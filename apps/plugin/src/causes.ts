/**
 * CAUSES, THE WRITER'S HALF (#3326 PR 1, owner decision Q3326.1 A). What every writer that can turn a run `⚠` or `✗`
 * says about why, as data beside its `lines` (`Cause`, `messages.ts`). Pure: no host, no DOM, so each writer's causes
 * are asserted in Node.
 *
 * The phrases in `CAUSE_WHAT` are the words the writers already print in their headlines and lines ("not verified",
 * "not updated"), or the approved draft's ("built with problems", "could not be built"), so this module adds no copy
 * of its own beyond `updated with problems`, the update's form of the build's phrase.
 */
import type { Cause } from './messages';

export const CAUSE_WHAT = {
  built: 'built with problems',
  failed: 'could not be built',
  updated: 'updated with problems',
  notUpdated: 'not updated',
  notVerified: 'not verified',
  stopped: 'stopped',
  /** A set a stop of the panel's queue left unbuilt (`build-queue.ts` `runCauses`). */
  notBuilt: 'not built',
} as const;

/** A cause, its optional fields left off rather than `undefined`, so a literal in a test reads the same. */
export const cause = (kind: Cause['kind'], subject: string | null, what: string, reasons: readonly string[]): Cause =>
  ({ kind, subject, what, reasons: [...reasons] });

/** A run that failed with one `why` and no set to name: the run's own cause, worded by its headline without the mark
 *  (`✗ check failed` → "check failed"). */
export const runCause = (headline: string, why: string): Cause =>
  cause(headline.startsWith('⚠') ? 'warn' : 'bad', null, headline.replace(/^[✓⚠✗]\s*/u, ''), why ? [why] : []);

/** One cause per subject: two writers' causes for the same set become one, its reasons in order, each once. The worse
 *  kind wins, and the first `what` is kept unless the merged cause turned `bad`. Order: each subject where it first
 *  appears. */
export const mergeCauses = (...lists: readonly (readonly Cause[] | undefined)[]): Cause[] => {
  const out: Cause[] = [];
  for (const c of lists.flatMap((l) => l ?? [])) {
    const at = out.findIndex((x) => x.subject === c.subject);
    if (at < 0) { out.push({ ...c, reasons: [...c.reasons] }); continue; }
    const x = out[at];
    const worse = x.kind === 'warn' && c.kind === 'bad';
    out[at] = { ...x, kind: worse ? 'bad' : x.kind, what: worse ? c.what : x.what, reasons: [...new Set([...x.reasons, ...c.reasons])] };
  }
  return out;
};
