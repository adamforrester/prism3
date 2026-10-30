/**
 * The add queue (#3129, owner decisions Q833 A, Q3129.1–3 A), `src/add-queue.ts`, on a fake root.
 *
 *   npx tsx apps/plugin/test-add-queue.ts
 *
 * WHAT IS HELD:
 *   · `store`: one key per set, `addQueue.<defId>` in the shared namespace `prism3`, holding the time it was queued; a
 *     second queue keeps the first time; clearing empties the key; two writers on different sets both land;
 *   · `read`: only the prefix's keys with a value are the queue; another key in the namespace, an empty key and the bare
 *     prefix are not; a root that refuses the read, or has no key listing, reads as empty, never a throw;
 *   · `visible` and `stale` (Q3129.2 A, Q3129.3 A): a read leaves out a set the file holds and a def the engine cannot
 *     build, and exactly those are the keys a write clears.
 *
 * INDEPENDENCE (docs/34): the root is a fake whose store is a Map this file reads directly; the expected keys, values and
 * ids are literals typed here, never computed by the module under test.
 *
 * Mutations that fail here by name: the prefix changed (`QUEUE_PREFIX`) → `store: one key per set …`; `setQueued`
 * restamping a queued set → `store: queuing a set again keeps the time …`; `readQueue` dropping its empty-value test →
 * `read: an emptied key is not queued …`; `visibleOf` keeping present sets → `visible: a set the file holds …`.
 */
import { QUEUE_NS, clearQueued, readQueue, setQueued, staleOf, visibleOf } from './src/add-queue';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const fakeRoot = () => {
  const data = new Map<string, string>();
  return {
    data,
    getSharedPluginData: (ns: string, k: string): string => data.get(`${ns}|${k}`) ?? '',
    setSharedPluginData: (ns: string, k: string, v: string): void => { data.set(`${ns}|${k}`, v); },
    getSharedPluginDataKeys: (ns: string): string[] => [...data.keys()].filter((k) => k.startsWith(`${ns}|`)).map((k) => k.slice(ns.length + 1)),
  };
};

console.log('\n1. The store');
const r = fakeRoot();
ok(QUEUE_NS === 'prism3', `store: the namespace is the shared one the stored brand uses, prism3 (${QUEUE_NS})`);
setQueued(r, ['tag', 'badge'], true, '2026-10-28T10:00:00.000Z');
ok(r.data.get('prism3|addQueue.tag') === '2026-10-28T10:00:00.000Z' && r.data.get('prism3|addQueue.badge') === '2026-10-28T10:00:00.000Z',
  `store: one key per set, addQueue.<defId>, holding the time it was queued (${JSON.stringify([...r.data])})`);
setQueued(r, ['tag'], true, '2026-10-28T11:00:00.000Z');
ok(r.data.get('prism3|addQueue.tag') === '2026-10-28T10:00:00.000Z', `store: queuing a set again keeps the time it was first queued (${r.data.get('prism3|addQueue.tag')})`);
clearQueued(r, ['badge']);
ok(r.data.get('prism3|addQueue.badge') === '' && r.data.get('prism3|addQueue.tag') !== '', `store: clearing empties that set's key alone (${JSON.stringify([...r.data])})`);
// Two teammates, each writing their own set: neither write overwrites the other's (Q3129.1 A, against one JSON list).
const a = fakeRoot();
setQueued(a, ['dialog'], true, 't1');
setQueued(a, ['banner'], true, 't2');
ok(same(readQueue(a).sort(), ['banner', 'dialog']), `store: two writers on different sets both land (${JSON.stringify(readQueue(a))})`);

console.log('\n2. The read');
const q = fakeRoot();
q.data.set('prism3|addQueue.tag', 't');
q.data.set('prism3|addQueue.badge', '');
q.data.set('prism3|addQueue.', 't');
q.data.set('prism3|brandInput', '{}');
q.data.set('other|addQueue.divider', 't');
ok(same(readQueue(q), ['tag']), `read: only a prefixed key in prism3 with a value is queued; an emptied key is not queued, nor the bare prefix, another key or another namespace (${JSON.stringify(readQueue(q))})`);
ok(same(readQueue({ getSharedPluginDataKeys: () => { throw new Error('refused'); } }), []), 'read: a root that refuses the read reads as an empty queue');
ok(same(readQueue({}), []), 'read: a root with no key listing reads as an empty queue');

console.log('\n3. What a read shows, and what a write clears');
const known = (id: string): boolean => ['tag', 'badge', 'dialog'].includes(id);
const queue = ['tag', 'badge', 'retired-def', 'dialog'];
ok(same(visibleOf(queue, known, ['badge']), ['tag', 'dialog']), `visible: a set the file holds and a def the engine cannot build are left out (${JSON.stringify(visibleOf(queue, known, ['badge']))})`);
ok(same(staleOf(queue, known, ['badge']), ['badge', 'retired-def']), `stale: exactly those are the keys a write clears (${JSON.stringify(staleOf(queue, known, ['badge']))})`);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
