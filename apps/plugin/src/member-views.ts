/**
 * #3313: THE MEMBER READS THE HAND-EDIT PASS MADE AT OPEN, KEPT FOR THE UPDATE CHECK.
 *
 * The pass at open (`handEditsPass`, `handEditsOf`) reads every member of every set: its snapshot, its stamp and its
 * record. That is the view the Update check's dry run lays its plans against (`readSetView`), and on a template-sized
 * file reading it again was about 44% of the check's host calls. So each set's view is kept here, by the set's node id,
 * and the check uses it in place of a second read.
 *
 * A KEPT VIEW IS ONLY AS GOOD AS ITS DROPS. Each is dropped:
 *   · when a document change touches its set: the set itself, or any node inside it (`dropFor`);
 *   · all of them when a change cannot be placed: a node deleted (its parent can no longer be read), a node whose
 *     parents cannot be read, or a component or set renamed (a member's instance snapshot names its main component,
 *     wherever that sits);
 *   · all of them when a write starts or ends (`guarded` in `main.ts`), and when the file cannot be watched at all.
 * A read in progress when anything is dropped is not kept (`epoch`), so a set changed while the pass read it is read
 * again by the check.
 *
 * What a view does not hold is read again each time: how the member draws against the file's variables (`drawn`), since
 * a variable's value can change with no document change, and the set's publish status. The apply never uses a kept
 * view: it reads each set again before writing, under the check's hash, so a view kept wrongly makes the apply refuse,
 * never write.
 *
 * Only sets are kept. A single-component def's view depends on the plans the brand projects (`readSingleView`), which
 * the pass and the check can project for different brands.
 */
import type { HostSetView } from './update-plan';

const views = new Map<string, HostSetView>();
let epoch = 0;
let live = false;

/** Whether a view may be kept: only while the file's document changes are heard (`watch`). */
export const watchViews = (on: boolean): void => { live = on; if (!on) dropViews(); };

/** Moved by every drop. A read begun at one epoch is kept only if no drop happened while it ran. */
export const viewEpoch = (): number => epoch;

/** Keeps a set's view, read from `since` (`viewEpoch` before the read began), unless anything was dropped since. */
export const keepView = (view: HostSetView, since: number): void => {
  if (live && since === epoch && view.id && !view.single) views.set(view.id, view);
};

/** The kept view of the set with node id `id`, if there is one. */
export const keptView = (id: string): HostSetView | undefined => (live ? views.get(id) : undefined);

/** How many views are kept: for a test. */
export const keptCount = (): number => views.size;

/** Every view dropped. */
export const dropViews = (): void => { views.clear(); epoch++; };

type ChangeNode = { readonly type?: string; readonly id?: string; readonly removed?: boolean; readonly parent?: unknown };
type Change = { readonly type: string; readonly node?: ChangeNode; readonly properties?: readonly string[] };

const COMPONENTS: ReadonlySet<string> = new Set(['COMPONENT', 'COMPONENT_SET']);

/** The node id of the set `n` sits in (or is), `null` when it sits in none, `undefined` when that cannot be read. */
const setOf = (n: ChangeNode): string | null | undefined => {
  let p: ChangeNode | null = n;
  for (let i = 0; i < 256 && p; i++) {
    try {
      if (p.type === 'COMPONENT_SET') return String(p.id ?? '');
      if (p.type === 'PAGE' || p.type === 'DOCUMENT') return null;
      p = (p.parent ?? null) as ChangeNode | null;
    } catch { return undefined; }
  }
  return p ? undefined : null;
};

/** A batch of Figma's document changes: drops the view of each set one touches, or every view when one can't be placed. */
export const dropFor = (changes: readonly Change[]): void => {
  // Heard with no view kept as well: a read in progress is then not kept either.
  if (!live) return;
  const hit = new Set<string>();
  for (const c of changes) {
    if (c.type.startsWith('STYLE_')) continue;
    const n = c.node;
    if (!n || c.type === 'DELETE' || n.removed) { dropViews(); return; }
    let type = '';
    try { type = String(n.type ?? ''); } catch { dropViews(); return; }
    if (c.type === 'PROPERTY_CHANGE' && COMPONENTS.has(type) && (c.properties ?? []).includes('name')) { dropViews(); return; }
    const s = setOf(n);
    if (s === undefined) { dropViews(); return; }
    if (s !== null) hit.add(s);
  }
  if (!hit.size) return;
  for (const id of hit) views.delete(id);
  // Any set touched ends every read in progress: which set a read in progress is reading is not known here.
  epoch++;
};
