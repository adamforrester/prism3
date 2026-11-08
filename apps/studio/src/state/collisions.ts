/**
 * The collision choice's model (#1909, owner decision Q112 A), plugin only. When Apply Theme is refused because what it
 * would write is already in the file and Prism3 did not make it, the panel lists each collision and the person picks
 * Skip or Rename for each, or one choice for all of them ("Apply to all"). The apply runs again with those choices.
 *
 * REFUSAL STAYS THE DEFAULT: every row starts with no choice, and Apply stays off until every row has one. Cancel, Escape
 * or the scrim close the list with nothing written; the refusal already shown stands. NOTHING IS REMEMBERED (v1): the
 * choices live while the list is open and ride one `apply-theme` message, so the next refusal asks again.
 *
 * The rows come from the refusal itself (`HostSession.collisions`, which the main thread's `conflictKey` keyed), and the
 * choices go back by those keys alone, so a choice can only answer a collision the host named.
 *
 * Every string is a DRAFT placeholder (#1909: the layout and copy are the owner's call), in `COLLISION_COPY`.
 */
import type { CollisionChoices, CollisionView } from '../write-adapter';

export type CollisionChoice = 'skip' | 'rename';
/** The choices made so far: a row with no entry has none, and that row holds the apply refused. */
export type Picks = Readonly<Record<string, CollisionChoice>>;

/** Every row has a choice, so the apply can run. An empty list never can. */
export const allChosen = (rows: readonly CollisionView[], picks: Picks): boolean =>
  rows.length > 0 && rows.every((r) => picks[r.key] === 'skip' || picks[r.key] === 'rename');

/** "Apply to all": one choice for every row. */
export const pickAll = (rows: readonly CollisionView[], c: CollisionChoice): Picks => Object.fromEntries(rows.map((r) => [r.key, c]));

/** What the "Apply to all" control reads: the choice every row shares, else none (mixed, or some still unchosen). */
export const sharedPick = (rows: readonly CollisionView[], picks: Picks): CollisionChoice | null => {
  const first = rows.length ? picks[rows[0].key] : undefined;
  return first && rows.every((r) => picks[r.key] === first) ? first : null;
};

/** The choices to post: one per listed row, nothing else, and nothing at all until every row has one. */
export const choicesToPost = (rows: readonly CollisionView[], picks: Picks): CollisionChoices | null =>
  allChosen(rows, picks) ? Object.fromEntries(rows.map((r) => [r.key, picks[r.key]])) : null;

/** DRAFT copy (#1909), the owner's call, listed in the PR body. */
export const COLLISION_COPY = {
  title: 'Already in this file',
  intro: (n: number): string => `${n} item${n === 1 ? '' : 's'} Prism3 writes ${n === 1 ? 'is' : 'are'} already in this file, made by someone else. Nothing was written. Choose what happens to each, then apply again.`,
  /** The row's select before a choice: no choice is the refusal. */
  unchosen: 'Choose',
  choice: { skip: 'Skip', rename: 'Rename' } as Record<CollisionChoice, string>,
  /** What each choice does, under the list. */
  hint: {
    skip: 'Skip leaves the item as it is. Prism3 does not write it, and nothing Prism3 writes points to it.',
    rename: 'Rename writes Prism3\'s own beside it, named with " (Prism3)" added. The item already here stays as it is.',
  } as Record<CollisionChoice, string>,
  all: 'Apply to all',
  rowLabel: (kind: string, name: string): string => `What to do with ${kind} ${name}`,
  cancel: 'Cancel',
  go: 'Apply',
  close: 'Close',
} as const;
