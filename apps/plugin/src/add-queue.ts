/**
 * THE ADD QUEUE (#3129, owner decisions Q832 A, Q833 A, Q3129.1–13 all A): the sets a person chose on Components to add
 * to the file, kept IN the file until they are built or removed, so a teammate who opens Update file sees the same queue.
 *
 * WHERE IT LIVES (Q3129.1 A). Shared plugin data on the root, in namespace `prism3` (the one the stored brand and the
 * agent mailbox use), ONE KEY PER SET: `addQueue.<defId>`, whose value is the ISO time the set was queued. An absent or
 * empty key means not queued. Shared, unlike the as-built ledger's private data, so an agent in the file can read and
 * write it; one key per set, so two teammates ticking at once write different keys and neither tick is lost. The order
 * is not stored: the panel shows and builds the queue in Components' list order.
 *
 * HOW IT IS CLEARED. `main.ts` clears a set's key where the as-built ledger records a set that landed whole, so a set
 * that fails, or is stopped before it runs, stays queued. A queued set the file later holds (added by hand, or by a copy;
 * Q3129.2 A) and a queued set the engine no longer defines or can no longer build (Q3129.3 A) are left out of every read
 * (`visibleOf`), and their keys are cleared by the next write (`staleOf`), which every Update file run ends with. Reads
 * never write.
 *
 * Pure: the root is passed in, so `test-add-queue.ts` drives it on a fake. A root that refuses a read reads as an empty
 * queue, never a throw; a refused write throws, for the caller to catch.
 */

/** The shared plugin-data namespace. */
export const QUEUE_NS = 'prism3';
/** Each queued set's key is this prefix and its def id. */
export const QUEUE_PREFIX = 'addQueue.';

export type QueueRoot = {
  getSharedPluginData?(ns: string, key: string): string;
  setSharedPluginData?(ns: string, key: string, value: string): void;
  getSharedPluginDataKeys?(ns: string): string[];
};

/** The def ids whose key holds a value, in the order the root lists its keys. */
export const readQueue = (root: QueueRoot): string[] => {
  try {
    const keys = root.getSharedPluginDataKeys?.(QUEUE_NS) ?? [];
    return keys.filter((k) => k.startsWith(QUEUE_PREFIX) && k.length > QUEUE_PREFIX.length && !!root.getSharedPluginData?.(QUEUE_NS, k))
      .map((k) => k.slice(QUEUE_PREFIX.length));
  } catch { return []; }
};

/** Queue `ids` (`on`), each stamped with `now` unless it is already queued, or clear their keys. */
export const setQueued = (root: QueueRoot, ids: readonly string[], on: boolean, now: string = new Date().toISOString()): void => {
  for (const id of new Set(ids)) {
    const key = QUEUE_PREFIX + id;
    if (on) { if (!root.getSharedPluginData?.(QUEUE_NS, key)) root.setSharedPluginData?.(QUEUE_NS, key, now); }
    else root.setSharedPluginData?.(QUEUE_NS, key, '');
  }
};

/** Clear `ids`' keys. */
export const clearQueued = (root: QueueRoot, ids: readonly string[]): void => setQueued(root, ids, false);

/** The queue as a read reports it (Q3129.2 A, Q3129.3 A): the sets the engine can build (`known`) that the file does not
 *  hold (`present`). */
export const visibleOf = (queue: readonly string[], known: (id: string) => boolean, present: readonly string[]): string[] =>
  queue.filter((id) => known(id) && !present.includes(id));

/** The keys a write clears: a set the file holds, or one the engine no longer defines or can build. */
export const staleOf = (queue: readonly string[], known: (id: string) => boolean, present: readonly string[]): string[] =>
  queue.filter((id) => !known(id) || present.includes(id));
