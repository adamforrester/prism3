/**
 * "UPDATES OFF" ON A COMPONENT SET (#2956, owner decisions 2026-11-17: the state's name, its two actions, the reason
 * line, and when it turns on by itself, all approved copy).
 *
 * A set whose updates are off is one Update file leaves as it is. Its hand-edit guarantees stay: nothing here writes a
 * member, so every edit on it is where the designer left it, and its as-built records keep their old hashes, so once
 * updates are back on its edits still read as edits and Keep holds them.
 *
 * ── HOW IT TURNS ON ───────────────────────────────────────────────────────────────────────────────────────
 *
 *   auto       by itself, only when an update could not apply around the set's hand edits: the apply skipped a member
 *              whole for them (a layer added or removed by hand, a layer the update rebuilds that was edited by hand, a
 *              structural update on a hand-edited member, #2956 point 2). The rest of that run's set is still written
 *              as it would have been; the mark stops later runs. Only this case shows the reason line.
 *   designer   by the designer, "Turn off updates", at any time.
 *
 * "Turn updates back on" removes the mark only (Q2956.6 A): it writes no member and saves no version. The next Update
 * file reads the set as it reads any other (due, kept edits, hand-edited) and re-plans it normally.
 *
 * ── WHERE IT LIVES ───────────────────────────────────────────────────────────────────────────────────────
 *
 * Shared plugin data on the set node (`NS`/`updatesOff`), so it survives the file being closed and opened again and is
 * read by whoever opens it. `''` (Figma's answer for an unset key) and any value but the two below read as on. A
 * single-component def (the icons) has no set node to carry it, so it is not offered there.
 *
 * Internal identifiers may keep the wireframe's "owned" (owner, 2026-11-17); user-facing copy never says it.
 */
import { NS } from './persist-figma';

export const UPDATES_OFF_KEY = 'updatesOff';
/** Who turned updates off: the update itself, when it could not apply around hand edits, or the designer. */
export type UpdatesOff = 'auto' | 'designer';

type DataNode = { getSharedPluginData?(ns: string, key: string): string; setSharedPluginData?(ns: string, key: string, value: string): void };

/** The set's mark, or null while its updates are on. Never throws: an unreadable node reads as on. */
export const readUpdatesOff = (node: unknown): UpdatesOff | null => {
  try {
    const v = (node as DataNode).getSharedPluginData?.(NS, UPDATES_OFF_KEY) ?? '';
    return v === 'auto' || v === 'designer' ? v : null;
  } catch { return null; }
};

/** Writes the mark (`null` clears it). Throws what the host throws, so the caller can say the write was refused. */
export const writeUpdatesOff = (node: unknown, v: UpdatesOff | null): void => {
  const n = node as DataNode;
  if (typeof n.setSharedPluginData !== 'function') throw new Error('this node cannot hold plugin data');
  n.setSharedPluginData(NS, UPDATES_OFF_KEY, v ?? '');
};

/**
 * THE WORDS. `state`, `turnOff`, `turnOn` and `reason` are the owner's approved copy (2026-11-17). `left` and
 * `turnedOff` are the Activity lines that use them: DRAFT, for the owner's wording.
 */
export const UPDATES_OFF_COPY = {
  state: 'Updates off',
  turnOff: 'Turn off updates',
  turnOn: 'Turn updates back on',
  reason: 'Turned off when an update couldn’t apply around your edits.',
  /** DRAFT: a set Update file left because its updates are off. Calm, never ⚠. */
  left: (set: string): string => `${set}: left as it is. Updates off.`,
  /** DRAFT: the run that turned a set's updates off by itself, with the approved reason. */
  turnedOff: (set: string): string => `${set}: Updates off. Turned off when an update couldn’t apply around your edits.`,
} as const;
