/**
 * #3697 R6 (H2, owner decision 2026-11-12) — A CONFIRMED PRUNE THROUGH THE REAL `main.ts`: a named version first, a
 * confirm refused unless the file holds its input, a `previewHash` echo, and each removal tried on its own.
 *
 *   npx tsx apps/plugin/test-prune-main.ts
 *
 * THE HOST is the shared file model (`file-shim.ts`), the one Apply Theme writes into for `test-readback-parity.ts`,
 * plus what `main.ts` needs to boot (a UI channel, a root with no pages) and a `saveVersionHistoryAsync` that logs.
 * The brand is applied through `main.ts`'s own `apply-theme`, then three stale variables in the brand's namespace are
 * planted in one of its collections, so the detector has something to offer. Every removal and every version save
 * goes into one ordered log, so "a version before the first removal" is read off the host, not off `main.ts`'s word.
 *
 * INDEPENDENCE (docs/34): the expected refusals are the literal copy the owner reviews, typed here, and every count is
 * read off the file model after the run, never off the plugin's result alone.
 *
 * Mutations this fails by name:
 *   · `main.ts`'s `saveVersion(figma, { run: 'prune' })` dropped → `main/version first`;
 *   · `pruneConfirmRefusal` ignoring `holdsInput` → `main/unapplied input refused`;
 *   · `pruneConfirmRefusal` ignoring the hash → `main/missing hash refused`, `main/wrong hash refused`;
 *   · `applyPrunePlan`'s per-removal try dropped (a bare `remove()`) → `main/throw at removal 2`;
 *   · `main.ts` calling `applyPrunePlan` without its running `counts` → `main/throw after removals` (#3709 S1);
 *   · the `return;` after `PRUNE_COPY.noVersion(…)` dropped (a failed save still removes) → `main/no version, nothing removed` (#3709 S2).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrandInput } from '@prism3/engine/theme';
import { FileShim } from './file-shim';
import { themePlans } from './src/apply-theme';
import { brandFromDesignMd } from './mcp-paste';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('A confirmed prune through the real main.ts: version first, input held, hash echoed, each removal tried (#3697 R6)');

const REPO = join(import.meta.dirname, '..', '..');
const input: BrandInput = brandFromDesignMd(readFileSync(join(REPO, 'packages/engine/examples/aurora.design.md'), 'utf8'));
const other: BrandInput = { ...input, controlShape: input.controlShape === 'pill' ? 'rounded' : 'pill' };

// The owner's copy, typed here (`prune-figma.ts`'s `PRUNE_COPY`, approved as D3709.1).
const NOT_APPLIED = "Nothing removed — the file doesn't hold this brand yet. Apply the theme first, then check again.";
const MOVED = 'Nothing removed — the file changed after the check. Check again.';

const file = new FileShim();
const faces = new Map<string, { family: string; style: string }>();
for (const r of themePlans(input).textPlan) faces.set(`${r.fontFamilyPrimary}|${r.fontStyle}`, { family: r.fontFamilyPrimary, style: r.fontStyle });
file.faces = [...faces.values()];

/** Tagged canvas furniture `findAllWithCriteria` returns: empty until the throw-after-removals arm plants one. */
let furniture: unknown[] = [];

/** The #3709 S2 arm: the host's version save throws. */
let saveThrows = false;

/** One ordered log of what changes the file: `version:<title>` and `remove:<name>`. */
const events: string[] = [];
const posted: any[] = [];
const shared = file.root;
const root = {
  ...shared, name: 'prune file', type: 'DOCUMENT', children: [] as unknown[],
  findAllWithCriteria: () => furniture, findAll: () => [], getPluginData: () => '', setPluginData: () => undefined,
};
Object.defineProperty(file, 'root', { value: root });
Object.assign(file, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  getNodeByIdAsync: async () => null,
  loadAllPagesAsync: async () => undefined,
  saveVersionHistoryAsync: async (title: string) => {
    if (saveThrows) throw new Error('version history unavailable');
    events.push(`version:${title}`); return { id: 'v' };
  },
});

const g = globalThis as Record<string, unknown>;
g.figma = file; g.__html__ = ''; g.PRISM3_BUILD = '2026-11-12T00:00:00Z tree-test0000';
const log = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === 'string' && a[0].startsWith('[prism3')) return; log(...a); };

await import('./src/main');

const realTimeout = globalThis.setTimeout;
const send = async (msg: unknown, kinds: readonly string[], ms = 120_000): Promise<any> => {
  posted.length = 0;
  (file as unknown as { ui: { onmessage: (m: unknown) => void } }).ui.onmessage(msg);
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = posted.find((m) => m?.type === 'refused' || kinds.includes(m?.type));
    if (r) return r;
    await new Promise((res) => realTimeout(res, 2));
  }
  return null;
};

// The brand, applied by main.ts itself.
const applied = await send({ type: 'apply-theme', input }, ['apply-result']);
if (applied?.type !== 'apply-result' || !applied.ok) throw new Error(`premise: Apply Theme did not run clean (${JSON.stringify(applied)?.slice(0, 400)})`);

// Three stale variables in the brand's own namespace, in the collection its first color variable lives in.
const anchor = file.vars.find((v: any) => v.resolvedType === 'COLOR' && String(v.name).includes('/'));
if (!anchor) throw new Error('premise: Apply Theme wrote no color variable');
const coll = file.collections.find((c: any) => c.id === anchor.variableCollectionId);
const rootName = String(anchor.name).split('/')[0];
const STALE = [1, 2, 3].map((i) => `${rootName}/color/zz-stale-${i}`);
const planted = STALE.map((n) => file.createVariable(n, coll, 'COLOR'));
for (const v of planted) {
  const real = v.remove.bind(v);
  v.remove = () => { if (v.name === STALE[1] && throwAt2) throw new Error('host refused'); events.push(`remove:${v.name}`); real(); };
}
let throwAt2 = false;
const live = (): string[] => file.vars.filter((v: any) => !v.removed).map((v: any) => String(v.name)).filter((n) => STALE.includes(n));

// The preview: three items and a hash.
const preview = await send({ type: 'prune', input, confirm: false }, ['prune-result']);
ok(preview?.applied === false && preview.count === 3 && typeof preview.previewHash === 'string' && preview.previewHash.length > 0,
  `main/preview: the preview offers the three planted variables and carries a hash (count ${preview?.count}, hash ${JSON.stringify(preview?.previewHash)})`);
const hash = String(preview?.previewHash ?? '');
events.length = 0;

// An input the file does not hold, with the hash its own preview gave.
const otherPreview = await send({ type: 'prune', input: other, confirm: false }, ['prune-result']);
const r1 = await send({ type: 'prune', input: other, confirm: true, previewHash: String(otherPreview?.previewHash ?? '') }, ['prune-result']);
ok(r1?.ok === false && r1.applied === false && r1.summary === NOT_APPLIED && live().length === 3 && events.length === 0,
  `main/unapplied input refused: a confirm whose input the file does not hold removes nothing and saves no version (${JSON.stringify(r1?.summary)}, ${live().length} left, ${JSON.stringify(events)})`);

// No hash, and a wrong one.
const r2 = await send({ type: 'prune', input, confirm: true, previewHash: '' }, ['prune-result']);
ok(r2?.ok === false && r2.applied === false && r2.summary === MOVED && live().length === 3 && events.length === 0,
  `main/missing hash refused: a confirm with no hash removes nothing (${JSON.stringify(r2?.summary)}, ${live().length} left, ${JSON.stringify(events)})`);
const r3 = await send({ type: 'prune', input, confirm: true, previewHash: 'deadbeef' }, ['prune-result']);
ok(r3?.ok === false && r3.applied === false && r3.summary === MOVED && live().length === 3 && events.length === 0,
  `main/wrong hash refused: a confirm whose hash is not the file's now removes nothing (${JSON.stringify(r3?.summary)}, ${live().length} left, ${JSON.stringify(events)})`);

// The real confirm, with removal 2 throwing: a version first, then 1 and 3 removed, 2 reported.
throwAt2 = true;
const r4 = await send({ type: 'prune', input, confirm: true, previewHash: hash }, ['prune-result']);
ok(events[0] === 'version:Saved before Prism3 removed stale items' && events.slice(1).every((e) => e.startsWith('remove:')),
  `main/version first: a named version is saved before the first removal (${JSON.stringify(events)})`);
ok(r4?.applied === true && r4.ok === false && r4.count === 2 && JSON.stringify(live()) === JSON.stringify([STALE[1]])
  && /Removed 2 stale items: 2 variables\. 1 item could not be removed\./.test(String(r4.summary)),
  `main/throw at removal 2: removals 1 and 3 still run, the count says 2, and the one that threw is reported (count ${r4?.count}, left ${JSON.stringify(live())}, ${JSON.stringify(r4?.summary)})`);

// #3709 S1 — a throw OUTSIDE any removal, after removals ran: a stale furniture node whose `removed` read throws once
// the confirm reaches `pruneFurniture`. The variables went first, so the posted count must be theirs, not 0.
throwAt2 = false;
const STALE2 = [4, 5].map((i) => `${rootName}/color/zz-stale-${i}`);
for (const v of STALE2.map((n) => file.createVariable(n, coll, 'COLOR'))) {
  const real = v.remove.bind(v);
  v.remove = () => { events.push(`remove:${v.name}`); real(); };
}
let readThrows = false;
furniture = [{
  id: 'furn-1', type: 'INSTANCE',
  getSharedPluginData: () => JSON.stringify({ v: 1, def: 'button', set: 'gone-set', kind: 'label' }),
  get removed(): boolean { if (readThrows) throw new Error('node read failed'); return false; },
  remove: () => undefined,
}];
const liveAll = (): string[] => file.vars.filter((v: any) => !v.removed).map((v: any) => String(v.name)).filter((n) => STALE.includes(n) || STALE2.includes(n));
const preview2 = await send({ type: 'prune', input, confirm: false }, ['prune-result']);
ok(preview2?.applied === false && preview2.count === 4,
  `main/throw after removals premise: the preview offers the three stale variables and the one stale label (count ${preview2?.count})`);
events.length = 0;
readThrows = true;
const r5 = await send({ type: 'prune', input, confirm: true, previewHash: String(preview2?.previewHash ?? '') }, ['prune-result']);
ok(r5?.applied === true && r5.ok === false && r5.count === 3 && liveAll().length === 0
  && /^Prune stopped — .*node read failed.*\. Removed 3 stale items before it stopped: 3 variables\.$/.test(String(r5.summary)),
  `main/throw after removals: a throw after three removals reports the three, not 0 (count ${r5?.count}, left ${JSON.stringify(liveAll())}, ${JSON.stringify(r5?.summary)})`);

// #3709 S2 — the third guard's other half: a version save that FAILS removes nothing. Two fresh stale variables, the
// furniture cleared, the right hash, and a host whose `saveVersionHistoryAsync` throws.
readThrows = false;
furniture = [];
const STALE3 = [6, 7].map((i) => `${rootName}/color/zz-stale-${i}`);
for (const v of STALE3.map((n) => file.createVariable(n, coll, 'COLOR'))) {
  const real = v.remove.bind(v);
  v.remove = () => { events.push(`remove:${v.name}`); real(); };
}
const live3 = (): string[] => file.vars.filter((v: any) => !v.removed).map((v: any) => String(v.name)).filter((n) => STALE3.includes(n));
const preview3 = await send({ type: 'prune', input, confirm: false }, ['prune-result']);
ok(preview3?.applied === false && preview3.count === 2 && live3().length === 2,
  `main/no version premise: the preview offers the two fresh stale variables (count ${preview3?.count}, ${live3().length} live)`);
events.length = 0;
saveThrows = true;
const r6 = await send({ type: 'prune', input, confirm: true, previewHash: String(preview3?.previewHash ?? '') }, ['prune-result']);
saveThrows = false;
ok(r6?.ok === false && r6.applied === false && r6.count === 0
  && String(r6.summary).startsWith('Nothing removed — the named version could not be saved')
  && live3().length === 2 && !events.some((e) => e.startsWith('remove:')),
  `main/no version, nothing removed: a failed version save removes nothing (count ${r6?.count}, ${live3().length} left, ${JSON.stringify(r6?.summary)}, ${JSON.stringify(events)})`);

console.log = log;
if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nprune through main.ts: all checks pass');
process.exit(0);
