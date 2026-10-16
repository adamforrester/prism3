/**
 * INTERACTIVE COMPONENTS (#2466, owner decision Q238 A on all four parts) — the prototype reactions a set's members
 * carry, planned from the def's own `state` axis, read off the host, and compared.
 *
 *   scope      every set whose `state` axis holds `rest`, `hover` and `pressed` (the button family, icon buttons,
 *              tag, tab, and the checkbox, radio and switch controls). Derived from the member names, never listed.
 *   reactions  Rest → Hover on While hovering (`ON_HOVER`); Rest and Hover → Pressed on While pressing
 *              (`ON_PRESS`). Each is `CHANGE_TO` the sibling matched on EVERY other axis. Both revert by
 *              themselves, so nothing is written on the destination.
 *
 * ── WHY REST CARRIES WHILE PRESSING TOO (owner decision Q344, #2733; reverts #2702/#2703) ─────────────────────
 *
 * Rest's own press reaction looks redundant, and it is on a desktop: the pointer hovers first, the member has already
 * changed to Hover, and Hover's press reaction is the one that fires. It is NOT redundant on a touch prototype (Figma
 * Mirror on a phone, or any touch preview): there is no hover, so Rest's press reaction is the ONLY route to Pressed.
 * #2703 chained the states (Rest carried While hovering only) and touch prototypes lost pressed feedback; Q344
 * restored this plan. Do not "simplify" the chain again without a new owner decision that weighs touch prototypes.
 *   excluded   every other state (Disabled, Pending, Read only, Focus visible, Error, …) has none: only Rest and
 *              Hover are sources, and a member of an in-scope set that is not one is planned an empty list.
 *   recorded   the reactions go in the as-built record (`member-baseline.ts`), so a reaction a designer removed or
 *              changed by hand reads as a hand edit at `REACTIONS_PATH`, with the usual update/skip choice.
 *
 * ── WHY "WRITTEN FROM THE PLAN, EVERY TIME" (docs/18 §3, the probe of #2531) ───────────────────────────────────
 *
 * A reaction names its destination by NODE ID. A member that is replaced (deleted, then added back by an update)
 * comes back under a new id with no reactions, and its siblings' reactions still name the old id, which resolves to
 * an orphan node (`removed: false`, `parent: null`, kept for undo). Nothing errors. So a reaction is never kept
 * from what the file holds: every member Prism3 writes gets its reactions from the plan, by state, resolved to the
 * siblings as they are now, and the dry run reads a destination that is not a member of the set as DANGLING.
 *
 * ── HOW A DESTINATION IS NAMED IN THE RECORD ──────────────────────────────────────────────────────────────────
 *
 * By the axes it differs from its source on (`state=hover`), never by id and never by its full name. An id is the
 * very thing that dangles; and a full name would read every reaction as hand-edited when an unrelated axis is
 * renamed. Relative, a repaired reaction (the same sibling, under its new id) reads back exactly as recorded.
 *
 * NOT COVERED, stated because it is invisible from the call site: reactions on a member's descendants. Only the
 * member's own reactions are read, written and recorded.
 */
import { coordKey, coordPairs } from '@prism3/engine/component-renames';

/** The axis the reactions are planned from, and its three values. */
export const STATE_AXIS = 'state';
const REST = 'rest', HOVER = 'hover', PRESSED = 'pressed';

/** Where a member's reactions sit in the as-built record and in a hand edit's `path`: not a node, so it is a name no
 *  part can carry. */
export const REACTIONS_PATH = '(prototype reactions)';

export type Trigger = 'ON_HOVER' | 'ON_PRESS';
/** One planned reaction: the trigger, and the destination member by its planned name. */
export type PlannedReaction = { trigger: Trigger; to: string };

/**
 * THE REACTION MAP of one set, from its planned member names: every member of an in-scope set, each with its list
 * (empty for a member that is no source). A set out of scope has no entry at all, so nothing about its reactions
 * is read, written or compared. A destination the plan does not have is left out (the reaction with it).
 */
export const reactionMap = (names: readonly string[]): Map<string, PlannedReaction[]> => {
  const out = new Map<string, PlannedReaction[]>();
  const parsed = names.map((name) => ({ name, key: coordKey(name) })).filter((x): x is { name: string; key: string } => x.key !== null);
  const stateOf = (key: string): string | undefined => coordPairs(key).find(([a]) => a === STATE_AXIS)?.[1];
  const values = new Set(parsed.map((x) => stateOf(x.key)));
  if (![REST, HOVER, PRESSED].every((v) => values.has(v))) return out;
  // Each member by every OTHER axis, then by state: the sibling matched on every other axis is one lookup away.
  const others = (key: string): string => coordPairs(key).filter(([a]) => a !== STATE_AXIS).map(([a, v]) => `${a}=${v}`).join(', ');
  const byOthers = new Map<string, Map<string, string>>();
  for (const { name, key } of parsed) {
    const o = others(key);
    if (!byOthers.has(o)) byOthers.set(o, new Map());
    byOthers.get(o)!.set(stateOf(key) ?? '', name);
  }
  for (const { name, key } of parsed) {
    const state = stateOf(key);
    const sib = byOthers.get(others(key))!;
    const list: PlannedReaction[] = [];
    if (state === REST && sib.has(HOVER)) list.push({ trigger: 'ON_HOVER', to: sib.get(HOVER)! });
    if ((state === REST || state === HOVER) && sib.has(PRESSED)) list.push({ trigger: 'ON_PRESS', to: sib.get(PRESSED)! });
    out.set(name, list);
  }
  return out;
};

/** The reaction object the host takes (docs/18 §3, measured): a trigger with no other field, one `NODE` action. */
export const reactionToWrite = (trigger: Trigger, destinationId: string): unknown =>
  ({ trigger: { type: trigger }, actions: [{ type: 'NODE', destinationId, navigation: 'CHANGE_TO', transition: null }] });

// ---- reading and naming ---------------------------------------------------------------------------------------

/** One reaction as read: `key` is what is compared and recorded, `text` is what a line says, and `dangling` marks a
 *  destination that is no member of the set and no node with a parent. */
export type ReadReaction = { key: string; text: string; dangling?: true };

/** The axes `dest` differs from `source` on, as `axis=value` segments in name order; `itself` for the member's own. */
export const relativeTo = (source: string, dest: string): string => {
  const sk = coordKey(source), dk = coordKey(dest);
  if (sk === null || dk === null) return dest;
  const s = new Map(coordPairs(sk));
  const diff = dest.split(', ').filter((seg) => { const at = seg.indexOf('='); return s.get(seg.slice(0, at)) !== seg.slice(at + 1); });
  return diff.length ? diff.join(', ') : 'itself';
};

const TRIGGER_WORDS: Record<string, string> = {
  ON_HOVER: 'While hovering', ON_PRESS: 'While pressing', ON_CLICK: 'On click', ON_DRAG: 'On drag',
  MOUSE_ENTER: 'Mouse enter', MOUSE_LEAVE: 'Mouse leave', MOUSE_UP: 'Mouse up', MOUSE_DOWN: 'Mouse down',
  AFTER_TIMEOUT: 'After delay', ON_KEY_DOWN: 'Key/gamepad', ON_MEDIA_HIT: 'Media hit', ON_MEDIA_END: 'Media end',
};
const triggerWords = (t: string): string => TRIGGER_WORDS[t] ?? t;

/** A planned reaction, keyed and worded as a read one is, so the two compare as strings. */
export const plannedRead = (source: string, r: PlannedReaction): ReadReaction => {
  const to = relativeTo(source, r.to);
  return { key: `${r.trigger}>NODE:CHANGE_TO::${to}`, text: `${triggerWords(r.trigger)} → ${to}` };
};

type HostReaction = { trigger?: { type?: unknown; delay?: unknown } | null; actions?: readonly unknown[]; action?: unknown };
type HostAction = { type?: unknown; destinationId?: unknown; navigation?: unknown; transition?: { type?: unknown } | null };
type Lookup = (id: string) => Promise<{ name?: unknown; parent?: unknown } | null>;

/** The host's node lookup, where there is one (the plugin). `getNodeByIdAsync`: the sync lookup throws under
 *  `documentAccess: dynamic-page`. */
const hostLookup = (): Lookup | undefined => {
  const f = (globalThis as { figma?: { getNodeByIdAsync?: Lookup } }).figma;
  return f?.getNodeByIdAsync ? (id) => f.getNodeByIdAsync!(id) : undefined;
};

/**
 * A member's own reactions, read off the host, each action's destination resolved to a sibling member, a node
 * outside the set, or DANGLING: no node, or a node with no `parent` (the orphan a replaced member leaves, which still
 * EXISTS: an existence check alone reads it as fine). `undefined` when the host has no reactions to read.
 *
 * ONE LOOKUP PER DESTINATION where the host has one, a sibling being the node whose parent is the member's own. Never
 * a map of the set's children per member: a snapshot is taken of every member a dry run reads, and on a 576-member
 * set a map each would be ~330,000 host reads. Without a lookup (the shim), the siblings are searched, and only when
 * there is a destination to find.
 */
export const readReactions = async (node: unknown, lookup: Lookup | undefined = hostLookup()): Promise<ReadReaction[] | undefined> => {
  const n = node as { name?: unknown; reactions?: unknown; parent?: unknown };
  let raw: unknown;
  try { raw = n.reactions; } catch { return undefined; }
  if (!Array.isArray(raw)) return undefined;
  const source = String(n.name ?? '');
  const idOf = (x: unknown): string => { try { const id = (x as { id?: unknown } | null)?.id; return typeof id === 'string' ? id : ''; } catch { return ''; } };
  let parent: unknown = null;
  try { parent = n.parent ?? null; } catch { parent = null; }
  const parentId = idOf(parent);
  let byId: Map<string, string> | null = null;
  const sibling = (id: string): string | undefined => {
    if (!byId) {
      byId = new Map();
      try { for (const c of ((parent as { children?: readonly unknown[] } | null)?.children ?? []) as { name?: unknown }[]) { const cid = idOf(c); if (cid) byId.set(cid, String(c.name ?? '')); } }
      catch { /* no siblings to read */ }
    }
    return byId.get(id);
  };
  /** Where an action points: `{ to }` a sibling's name, `{ outside }` a node elsewhere, or `null` dangling. */
  const resolve = async (id: string): Promise<{ to: string } | { outside: string } | null> => {
    if (!lookup) { const s = sibling(id); return s === undefined ? null : { to: s }; }
    let found: { name?: unknown; parent?: unknown } | null = null;
    try { found = await lookup(id); } catch { found = null; }
    let p: unknown = null;
    try { p = found?.parent ?? null; } catch { p = null; }
    if (!found || !p) return null;
    return parentId && idOf(p) === parentId ? { to: String(found.name ?? '') } : { outside: String(found.name ?? '') };
  };
  const out: ReadReaction[] = [];
  for (const r of raw as HostReaction[]) {
    const t = String(r?.trigger?.type ?? 'NONE');
    const delay = typeof r?.trigger?.delay === 'number' && r.trigger.delay ? `@${r.trigger.delay}` : '';
    const actions = (Array.isArray(r?.actions) ? r.actions : r?.action ? [r.action] : []) as HostAction[];
    const keys: string[] = [], texts: string[] = [];
    let dangling = false;
    for (const a of actions) {
      const type = String(a?.type ?? '');
      let to = '', words = type.toLowerCase();
      if (type === 'NODE' && typeof a.destinationId === 'string' && a.destinationId) {
        const at = await resolve(a.destinationId);
        if (at && 'to' in at) { to = relativeTo(source, at.to); words = to; }
        else if (at) { to = `^${at.outside}`; words = `${at.outside}, outside the set`; }
        else { to = '?'; words = 'a member no longer in the set'; dangling = true; }
      }
      keys.push(`${type}:${String(a?.navigation ?? '')}:${String(a?.transition?.type ?? '')}:${to}`);
      texts.push(words);
    }
    out.push({ key: `${t}${delay}>${keys.join('+')}`, text: `${triggerWords(t)}${delay ? ` after ${r.trigger!.delay}ms` : ''} → ${texts.join(' + ') || 'nothing'}`, ...(dangling ? { dangling: true as const } : {}) });
  }
  return out;
};

/** A list of reactions as one line's worth of words. */
export const reactionsText = (list: readonly ReadReaction[]): string => (list.length ? [...list].map((r) => r.text).sort().join('; ') : 'none');

/** The record's hash input: the keys, sorted, so the order the host lists them in is not an edit. */
export const reactionsSignature = (list: readonly ReadReaction[]): string => JSON.stringify(list.map((r) => r.key).sort());

/** How a member's reactions stand against its plan: whether they differ, and whether any destination dangles. */
export const reactionVerdict = (planned: readonly ReadReaction[], read: readonly ReadReaction[]): { differs: boolean; dangling: boolean } => ({
  differs: reactionsSignature(planned) !== reactionsSignature(read),
  dangling: read.some((r) => r.dangling),
});
