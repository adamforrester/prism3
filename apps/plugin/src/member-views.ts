/**
 * #3313: THE MEMBER READS THE HAND-EDIT PASS MADE AT OPEN, KEPT FOR THE UPDATE CHECK.
 *
 * The pass at open (`handEditsPass`, `handEditsOf`) reads every member of every set: its snapshot, its stamp and its
 * record. That is the view the Update check's dry run lays its plans against (`readSetView`), and on a template-sized
 * file reading it again was about 44% of the check's host calls. So each set's view is kept here, by the set's node id,
 * and the check uses it in place of a second read.
 *
 * A KEPT VIEW IS ONLY AS GOOD AS ITS DROPS. Every view is dropped together (`dropFor`), never one set's alone:
 *   · when a document change touches any component or set, or any node inside one. A member of one set can hold an
 *     instance of another set's member, or of a single component anywhere in the file, and Figma never reports "an
 *     instance sublayer updated by a change to a main component" (`documentchange`, "Special cases"). So an edit to
 *     set B can resize members of set A with no change heard on A, and which sets nest which is not known here;
 *   · on every style change (`STYLE_*`). Figma never reports "a node updated as a result of a style changing" either:
 *     a text style's size edited re-flows every member that uses it, with only the style's own change heard (#3348's
 *     review: a kept view then lays the grid against the old sizes, and the check reads no move where a fresh read
 *     reads 41);
 *   · when a change cannot be placed: a node deleted (its parent can no longer be read), or a node whose parents cannot
 *     be read;
 *   · when a write starts or ends (`guarded` in `main.ts`), and when the file cannot be watched at all.
 * A change outside every component and set (a frame on the canvas, a usage panel, a page) keeps them: no view holds it.
 * So the check reuses the pass's reads when nothing a member draws from has changed since the file opened, and reads
 * every set again otherwise, as it did before #3313.
 * A read in progress when anything is dropped is not kept (`epoch`), so a set changed while the pass read it is read
 * again by the check.
 *
 *   · when a variable's value changes (#3364). Figma reports no document change for a value edited in the Variables
 *     panel, yet every member bound to that variable re-resolves: a size, a padding, a gap. So the file's variables are
 *     printed (`variablesPrint`: every local variable's values by mode, and every collection's modes) when the hand-edit
 *     pass starts, before it reads, and again as each check starts (`previewUpdate`, `KeptViews.under`). A print that
 *     differs from the one the views were read under, or one that cannot be read, drops every view. A view is kept only
 *     under a print (`noteVariables`), so a read with no print to compare against is never reused.
 * What a view does not hold is read again each time: how the member draws against the file's variables (`drawn`), and
 * the set's publish status. The apply never uses a kept
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
/** The file's variables as the kept views were read under (`variablesPrint`); `undefined` while none is known. */
let printed: string | undefined;

/** Whether a view may be kept: only while the file's document changes are heard (`watch`). */
export const watchViews = (on: boolean): void => { live = on; if (!on) { dropViews(); printed = undefined; } };

/** Moved by every drop. A read begun at one epoch is kept only if no drop happened while it ran. */
export const viewEpoch = (): number => epoch;

/** Keeps a set's view, read from `since` (`viewEpoch` before the read began), unless anything was dropped since. */
export const keepView = (view: HostSetView, since: number): void => {
  if (live && printed !== undefined && since === epoch && view.id && !view.single) views.set(view.id, view);
};

/** The kept view of the set with node id `id`, if there is one. */
export const keptView = (id: string): HostSetView | undefined => (live ? views.get(id) : undefined);

/** How many views are kept: for a test. */
export const keptCount = (): number => views.size;

/** Every view dropped. */
export const dropViews = (): void => { views.clear(); epoch++; };

type PrintHost = { readonly variables: {
  getLocalVariablesAsync: () => Promise<readonly unknown[]>;
  getLocalVariableCollectionsAsync?: () => Promise<readonly unknown[]>;
} };

/**
 * #3364: THE FILE'S VARIABLES, PRINTED: each local variable's id, type and values by mode, and each collection's id, modes
 * and default mode, in the order the host gives them. Two prints are equal only when no value a member can resolve
 * through has moved. `null` when the host refuses the read.
 */
export const variablesPrint = async (host: PrintHost): Promise<string | null> => {
  try {
    const vars = await host.variables.getLocalVariablesAsync() as readonly { id?: unknown; resolvedType?: unknown; valuesByMode?: unknown }[];
    const cols = typeof host.variables.getLocalVariableCollectionsAsync === 'function'
      ? await host.variables.getLocalVariableCollectionsAsync() as readonly { id?: unknown; modes?: unknown; defaultModeId?: unknown }[] : [];
    return JSON.stringify([vars.map((v) => [v.id, v.resolvedType, v.valuesByMode]), cols.map((c) => [c.id, c.modes, c.defaultModeId])]);
  } catch { return null; }
};

/** The file's variables as they are now (`variablesPrint`): every view dropped when they differ from the print the views
 *  were read under, or cannot be read. Later reads are kept under this print. */
export const noteVariables = (print: string | null): void => {
  if (print === null || (printed !== undefined && print !== printed)) dropViews();
  printed = print ?? undefined;
};

type ChangeNode = { readonly type?: string; readonly id?: string; readonly removed?: boolean; readonly parent?: unknown };
type Change = { readonly type: string; readonly node?: ChangeNode; readonly properties?: readonly string[] };

/** Whether `n` is a component or a set, or sits inside one; `undefined` when its parents cannot be read. */
const inComponent = (n: ChangeNode): boolean | undefined => {
  let p: ChangeNode | null = n;
  for (let i = 0; i < 256 && p; i++) {
    try {
      if (p.type === 'COMPONENT' || p.type === 'COMPONENT_SET') return true;
      if (p.type === 'PAGE' || p.type === 'DOCUMENT') return false;
      p = (p.parent ?? null) as ChangeNode | null;
    } catch { return undefined; }
  }
  return p ? undefined : false;
};

/** A batch of Figma's document changes: every view dropped when one could move what a kept view holds. */
export const dropFor = (changes: readonly Change[]): void => {
  if (!live) return;
  for (const c of changes) {
    if (c.type.startsWith('STYLE_')) { dropViews(); return; }
    const n = c.node;
    if (!n || c.type === 'DELETE' || n.removed) { dropViews(); return; }
    if (inComponent(n) !== false) { dropViews(); return; }
  }
};
