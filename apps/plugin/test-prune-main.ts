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
 *   · the `return;` after `PRUNE_COPY.noVersion(…)` dropped (a failed save still removes) → `main/no version, nothing removed` (#3709 S2);
 *   · the hand-edit pass's `stale()` back to its four named writes (prune left out) → `main/hand pass stale under prune` (#3737).
 *   · a pass a write made stale not asked for again when the write ends → `main/hand pass after the write` (#3804).
 *   · Apply Theme's orphan-style note dropped from its summary → `main/apply reports orphan styles` (#1737).
 *   · `...exec.text` dropped from Apply Theme's planned style names (a Rename reads as an orphan) → `main/apply renamed style, no orphan` (#1737).
 *   · prune's furniture rule back to "set alive" only (the parent not compared) → `main/moved set's furniture` (#2485).
 *   · the `core/other` entry dropped from Apply Theme's `allOrphans` → `main/apply reports core/other` (#1109).
 *   · `unlessRenamedPlanned` dropped from `orphanStyles` → `main/prune spares renamed style` (#3860).
 *   · `unlessRenamedPlanned` dropped from `computePrunePlan`'s variables arm → `main/prune spares renamed variable` (#3869).
 *   · `unlessRenamedPlanned` dropped from Apply Theme's `allOrphans` → `main/apply note spares renamed variable` (#3869).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrandInput } from '@prism3/engine';
import { FileShim } from './file-shim';
import { themePlans } from './src/apply-theme';
import { brandFromDesignMd } from './mcp-paste';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('A confirmed prune through the real main.ts: version first, input held, hash echoed, each removal tried (#3697 R6)');

const REPO = join(import.meta.dirname, '..', '..');
const input: BrandInput = brandFromDesignMd(readFileSync(join(REPO, 'packages/engine/examples/aurora.design.md'), 'utf8'));
const other: BrandInput = { ...input, controlShape: input.controlShape === 'pill' ? 'rounded' : 'pill' };

// The owner's copy, typed here (`prune-figma.ts`'s `PRUNE_COPY`, approved as D3709.1).
const NOT_APPLIED = "Nothing removed — the file doesn't hold this brand yet. Run Update file with Theme ticked, then check again.";
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

// #4185 B row 3 (owner decision 2026-11-20 on #4364): every axis line of Apply's summary is a capitalized label, "Word:"
// and a space, as "Layout:", "Type:" and "Motion:" are. The labels and their order are typed here, not read from main.ts.
// Mutation: `Palette:` back to `palette` (or any one label) in main.ts → `#4185 main/apply labels`.
{
  const LABELS = ['Palette', 'Color', 'Layout', 'Styles', 'Type', 'Motion'];
  const heads = ((applied.lines ?? []) as string[]).slice(0, LABELS.length).map((l) => /^([^:]*): \d/.exec(l)?.[1] ?? l);
  ok(JSON.stringify(heads) === JSON.stringify(LABELS),
    `#4185 main/apply labels: Apply's axis lines read "Palette: …", "Color: …", "Layout: …", "Styles: …", "Type: …", "Motion: …" (${JSON.stringify(((applied.lines ?? []) as string[]).slice(0, LABELS.length))})`);
}

// #1109 — APPLY REPORTS THE CORE VARIABLES NO SLICE OWNS, ON ITS SUMMARY. `test-write.ts` holds `uc` on
// `runApplyTheme`'s result; this holds the line a designer reads, through main.ts. Planted in `core`: a hand-made
// `<root>/core/zzlegacy/1` and an un-rooted `zzmisc/1`, neither in any slice. Removed after, so the arms below start
// from the file Apply wrote. The label `core/other` is DRAFT (the owner's).
// Mutation: the `core/other` entry dropped from main.ts's `allOrphans` → `main/apply reports core/other`.
{
  const croot = themePlans(input).colorPlan.palette[0].name.split('/')[0];
  const coreCol = file.collections.find((c: any) => c.name === 'core');
  if (!coreCol) throw new Error('premise: Apply Theme wrote no `core` collection');
  const ghosts = [`${croot}/core/zzlegacy/1`, 'zzmisc/1'].map((n) => file.createVariable(n, coreCol, 'FLOAT'));
  const again = await send({ type: 'apply-theme', input }, ['apply-result']);
  const NOTE = '⚠ 2 variables the brand no longer writes (core/other: 2). Nothing was deleted — Update file › Clean up lists them';
  const lines: string[] = again?.lines ?? [];
  ok(!(applied.lines as string[]).some((l) => l.includes('variables the brand no longer writes')),
    `main/apply clean file, no core/other: the first apply names no orphaned variable (${JSON.stringify((applied.lines as string[]).filter((l) => l.includes('no longer writes')))})`);
  ok(again?.type === 'apply-result' && again.ok === true && lines.includes(NOTE) && String(again.summary).includes(NOTE)
    && ghosts.every((v: any) => !v.removed),
    `main/apply reports core/other: a re-apply's summary counts the two core variables no slice owns, and removes neither (${JSON.stringify(lines.filter((l) => l.includes('no longer writes')))})`);
  for (const v of ghosts) v.remove();
}

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
  && /^Clean up stopped — .*node read failed.*\. Removed 3 stale items before it stopped: 3 variables\.$/.test(String(r5.summary)),
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

// #2485 (Q294 A) — FURNITURE A MOVED SET LEFT ON ITS OLD PAGE, through main.ts. The set is alive, on page B; one of its
// labels sits beside it, one was left on page A. The preview offers the one left behind under the owner's sentence for
// both causes, and the confirm removes it and only it. The two stale variables the failed save above kept are offered
// too, so the furniture sentence is read as the summary's tail. Mutation: main.ts back to "set alive" only (its
// liveSets a Set, the parent not compared) → `main/moved set's furniture`.
{
  const movedSet = { id: 'moved-set', type: 'COMPONENT_SET', removed: false, parent: { id: 'page-B' } };
  const gone: string[] = [];
  const furn = (id: string, page: string) => {
    const n = {
      id, type: 'INSTANCE', parent: { id: page }, removed: false,
      getSharedPluginData: () => JSON.stringify({ v: 1, def: 'button', set: 'moved-set', kind: 'label' }),
      remove: () => { n.removed = true; gone.push(id); },
    };
    return n;
  };
  furniture = [furn('left-behind', 'page-A'), furn('beside', 'page-B')];
  const realGet = (file as unknown as { getNodeByIdAsync: (id: string) => Promise<unknown> }).getNodeByIdAsync;
  Object.assign(file, { getNodeByIdAsync: async (id: string) => (id === 'moved-set' ? movedSet : null) });
  const p = await send({ type: 'prune', input, confirm: false }, ['prune-result']);
  const r = await send({ type: 'prune', input, confirm: true, previewHash: String(p?.previewHash ?? '') }, ['prune-result']);
  Object.assign(file, { getNodeByIdAsync: realGet });
  furniture = [];
  ok(p?.applied === false && p.count === 3
    && String(p.summary).endsWith(' 1 canvas label or backdrop belongs to a set that was deleted or moved. Deleting it touches no component.')
    && r?.applied === true && r.ok === true && r.count === 3 && JSON.stringify(gone) === JSON.stringify(['left-behind'])
    && String(r.summary).endsWith(' Removed 1 canvas label or backdrop left from a set that was deleted or moved.'),
    `main/moved set's furniture: the label a moved set left on another page is offered and removed, the one beside it stays (preview count ${p?.count}, ${JSON.stringify(p?.summary)}; applied count ${r?.count}, removed ${JSON.stringify(gone)}, ${JSON.stringify(r?.summary)})`);
}

// #3737 — THE HAND-EDIT PASS READS NOTHING WHILE A PRUNE HOLDS THE FILE. Since #3718 one hold covers every write, but the
// pass's staleness check named four writes and left out prune: a pass asked for while a prune's delete runs read on and
// reported. Here the prune's version save is held open, so the prune holds the file while the pass is asked for.
// Mutation: `stale()` back to its four named writes → `main/hand pass stale under prune`.
const STALE4 = [8, 9].map((i) => `${rootName}/color/zz-stale-${i}`);
for (const v of STALE4.map((n) => file.createVariable(n, coll, 'COLOR'))) {
  const real = v.remove.bind(v);
  v.remove = () => { events.push(`remove:${v.name}`); real(); };
}
const pass = async (ms: number): Promise<any[]> => {
  const from = posted.length;
  (file as unknown as { ui: { onmessage: (m: unknown) => void } }).ui.onmessage({ type: 'hand-edits-request' });
  const t0 = Date.now();
  while (Date.now() - t0 < ms && !posted.slice(from).some((m) => m?.type === 'hand-edits' && m.done === true)) await new Promise((res) => realTimeout(res, 2));
  return posted.slice(from).filter((m) => m?.type === 'hand-edits');
};
const control = await pass(10_000);
ok(control.some((m) => m.done === true), `main/hand pass premise: with nothing holding the file, the pass runs to its end (${JSON.stringify(control)})`);
const preview4 = await send({ type: 'prune', input, confirm: false }, ['prune-result']);
let release: () => void = () => undefined;
const held = new Promise<void>((res) => { release = res; });
const realSave = (file as unknown as { saveVersionHistoryAsync: (t: string) => Promise<unknown> }).saveVersionHistoryAsync;
let saving = false;
Object.assign(file, { saveVersionHistoryAsync: async (t: string) => { saving = true; await held; return realSave(t); } });
posted.length = 0;
(file as unknown as { ui: { onmessage: (m: unknown) => void } }).ui.onmessage({ type: 'prune', input, confirm: true, previewHash: String(preview4?.previewHash ?? '') });
for (let i = 0; i < 2000 && !saving; i++) await new Promise((res) => realTimeout(res, 2));
const during = await pass(500);
ok(saving && during.length === 0,
  `main/hand pass stale under prune: a pass asked for while a prune holds the file reports nothing (prune holding: ${saving}; posted ${JSON.stringify(during)})`);
release();
for (let i = 0; i < 5000 && !posted.some((m) => m?.type === 'prune-result'); i++) await new Promise((res) => realTimeout(res, 2));
Object.assign(file, { saveVersionHistoryAsync: realSave });
// #3804 — A PASS THE WRITE MADE STALE IS ASKED FOR AGAIN WHEN THE WRITE ENDS. The pass above ended silently, so the panel
// kept every set it hadn't reached at "Checking" until a reload or an Update file run asked again. Nothing asks here: the
// write's end must run the pass to its end by itself. Mutation: the write's end not asking for the owed pass →
// `main/hand pass after the write`.
const ended = posted.findIndex((m) => m?.type === 'prune-result');
for (let i = 0; i < 5000 && !posted.slice(ended).some((m) => m?.type === 'hand-edits' && m.done === true); i++) await new Promise((res) => realTimeout(res, 2));
const after = posted.slice(ended).filter((m) => m?.type === 'hand-edits');
ok(ended >= 0 && after.some((m) => m.done === true),
  `main/hand pass after the write: once the prune ends, the pass it made stale runs to its end unasked (prune-result at ${ended}; posted after it ${JSON.stringify(after)})`);

// #1737 — APPLY REPORTS THE STYLES THIS BRAND DOES NOT PLAN. An earlier brand's styles stay where they were (a new
// brand's apply never touches a style it does not plan), and the verdict said nothing about them, while it reports the
// same drift among variables. Planted here: two text styles and one effect style inside groups this brand's plan emits
// (what an earlier brand leaves), and one hand-made text style outside every group (a designer's, never counted, the
// namespace prune keeps to). Re-applied through main.ts; the note is the owner's DRAFT copy, typed here.
// Mutation: main.ts's style-orphan note dropped from the summary → `main/apply reports orphan styles`.
{
  const plans = themePlans(input);
  const groupOf = (names: readonly string[]): string => (names.find((n) => n.includes('/')) ?? '').split('/')[0];
  const textGroup = groupOf(plans.textPlan.map((r) => r.name));
  const effectGroup = groupOf(plans.stylesPlan.effects.map((r) => r.name));
  if (!textGroup || !effectGroup) throw new Error(`premise: the plan has no grouped text or effect style (${textGroup}, ${effectGroup})`);
  const plant = (make: () => any, name: string) => { const st = make(); st.name = name; return st; };
  const fs = file as unknown as { createTextStyle: () => any; createEffectStyle: () => any };
  const planted = [
    plant(() => fs.createTextStyle(), `${textGroup}/zz-earlier/emphasis`),
    plant(() => fs.createTextStyle(), `${textGroup}/zz-earlier/subtle`),
    plant(() => fs.createEffectStyle(), `${effectGroup}/zz-earlier`),
    plant(() => fs.createTextStyle(), 'Marketing/Hero'),
  ];
  const again = await send({ type: 'apply-theme', input }, ['apply-result']);
  const NOTE = '⚠ 3 styles the brand no longer writes (text: 2, effect: 1). Nothing was deleted — Update file › Clean up lists them';
  const lines: string[] = again?.lines ?? [];
  ok(applied?.lines?.length > 0 && !(applied.lines as string[]).some((l) => l.includes('the brand no longer writes')),
    `main/apply clean file, no orphan styles: the first apply, into a file holding only what it wrote, names no style (${JSON.stringify((applied?.lines ?? []).filter((l: string) => l.includes('style')))})`);
  ok(again?.type === 'apply-result' && again.ok === true && String(again.summary).includes(NOTE) && lines.includes(NOTE)
    && planted.every((st) => !st.removed),
    `main/apply reports orphan styles: a re-apply names the three styles an earlier brand left in this brand's groups, not the hand-made one, and removes none (${JSON.stringify(lines.filter((l) => /style/.test(l) && l.startsWith('⚠')))}; removed ${planted.filter((st) => st.removed).length})`);
}

// #1737 — A RENAMED STYLE IS NOT AN ORPHAN. A collision answered Rename (#1909) writes Prism3's style under
// `<name> (Prism3)`, a name no plan holds, inside a group the plan emits and marked as Prism3's: exactly what the
// orphan rule counts, unless the names the collision choice wrote count as planned. Set up here: the arm above's
// plants removed; this brand's own first text style given a designer's description (this shim models no style mark,
// so the description is the whole ownership evidence: someone else's, a collision); re-applied with that collision answered Rename.
// Mutation: `...exec.text` dropped from main.ts's `plannedStyleNames` → `main/apply renamed style, no orphan`.
{
  for (const st of [...file.styles.text, ...file.styles.effect]) if (/zz-earlier|^Marketing\/Hero$/.test(String(st.name))) st.remove();
  const name = themePlans(input).textPlan.map((r) => r.name).find((n) => n.includes('/')) ?? '';
  const theirs = file.styles.text.find((st: any) => st.name === name);
  if (!theirs) throw new Error(`premise: the applied file holds no text style "${name}"`);
  theirs.description = 'Our hero body, hand-made';
  const refused = await send({ type: 'apply-theme', input }, ['apply-result']);
  const key = `text style:${name}`;
  ok(refused?.ok === false && JSON.stringify(refused).includes(name),
    `main/apply renamed style, premise: the hand-described "${name}" is a collision, and the apply is refused (${refused?.headline})`);
  const again = await send({ type: 'apply-theme', input, collisions: { [key]: 'rename' } }, ['apply-result']);
  const lines: string[] = again?.lines ?? [];
  const renamed = file.styles.text.find((st: any) => st.name === `${name} (Prism3)`);
  ok(again?.ok === true && !!renamed && !theirs.removed && !lines.some((l) => l.includes('orphaned style')) && !String(again.summary).includes('orphaned style'),
    `main/apply renamed style, no orphan: Rename writes "${name} (Prism3)" beside the designer's, and the verdict names no orphan style (${JSON.stringify(lines.filter((l) => /style/.test(l) && l.startsWith('⚠')))}; renamed ${!!renamed})`);
}

// #3860 — PRUNE SPARES THE STYLE A RENAME WROTE. The file above now holds the designer's style and `<name> (Prism3)`
// beside it. Prune's planned names are the plans alone, so before #3860 its preview offered the renamed style, which
// Apply's note (above) does not count. Owner decision A: a name that is planned once every ` (Prism3)` is stripped is
// the plan's own.
// Mutation: `unlessRenamedPlanned` dropped from `orphanStyles` → `main/prune spares renamed style`.
{
  const name = themePlans(input).textPlan.map((r) => r.name).find((n) => n.includes('/')) ?? '';
  const renamed = file.styles.text.find((st: any) => st.name === `${name} (Prism3)`);
  if (!renamed) throw new Error(`premise: the renamed style "${name} (Prism3)" is not in the file`);
  const pv = await send({ type: 'prune', input, confirm: false }, ['prune-result']);
  ok(pv?.type === 'prune-result' && pv.count === 0 && !String(pv.summary).includes('(Prism3)'),
    `main/prune spares renamed style: #3860, Prune's preview does not offer "${name} (Prism3)" (count ${pv?.count}, ${JSON.stringify(String(pv?.summary ?? '').slice(0, 200))})`);
  renamed.remove();
  file.styles.text.find((st: any) => st.name === name)?.remove();
  await send({ type: 'apply-theme', input }, ['apply-result']);
}

// #3869 — PRUNE SPARES THE VARIABLE A RENAME WROTE, the issue's reproduction committed. A palette variable in Prism3's
// own `core` is retyped by hand, so Apply refuses with one collision; Rename writes `<name> (Prism3)` and repoints every
// alias at it. Before #3869, Prune offered that variable and a confirm deleted it, leaving the aliases dangling. Then
// the hand-made variable is removed and the brand re-applied: the renamed one is now what Apply's orphan note would
// count, and Apply's note reads Prune's rule, so it names no orphan either.
// Mutation: `unlessRenamedPlanned` dropped from `computePrunePlan`'s variables arm → `main/prune spares renamed variable`.
// Mutation: `unlessRenamedPlanned` dropped from main.ts's `allOrphans` → `main/apply note spares renamed variable`.
{
  const white = file.vars.find((v: any) => String(v.name).endsWith('/core/palette/white'));
  if (!white) throw new Error('premise: the applied file holds no `…/core/palette/white`');
  const wname = String(white.name);
  white.resolvedType = 'STRING'; white.valuesByMode = { m: 'hand-typed' };
  const refused = await send({ type: 'apply-theme', input }, ['apply-result']);
  if (refused?.ok !== false) throw new Error(`premise: a retyped palette variable is not a collision (${refused?.headline})`);
  const key = `variable:core:${wname}`;
  const again = await send({ type: 'apply-theme', input, collisions: { [key]: 'rename' } }, ['apply-result']);
  const renamed = file.vars.find((v: any) => v.name === `${wname} (Prism3)`);
  const aliasers = (): number => file.vars.filter((v: any) => Object.values(v.valuesByMode ?? {}).some((x: any) => x?.type === 'VARIABLE_ALIAS' && x.id === renamed?.id)).length;
  if (again?.ok !== true || !renamed || aliasers() === 0) throw new Error(`premise: Rename did not write an aliased "${wname} (Prism3)" (ok ${again?.ok}, renamed ${!!renamed}, aliased by ${aliasers()})`);
  const n = aliasers();
  const pv = await send({ type: 'prune', input, confirm: false }, ['prune-result']);
  const pc = await send({ type: 'prune', input, confirm: true, previewHash: String(pv?.previewHash ?? '') }, ['prune-result']);
  ok(pv?.count === 0 && !String(pv?.summary).includes('(Prism3)') && !renamed.removed && file.vars.includes(renamed) && aliasers() === n,
    `main/prune spares renamed variable: #3869, Prune neither offers nor removes "${wname} (Prism3)", and its ${n} aliases still resolve (preview ${JSON.stringify(String(pv?.summary ?? '').slice(0, 200))}; confirm ${JSON.stringify(String(pc?.summary ?? '').slice(0, 120))}; removed ${!!renamed.removed})`);
  white.remove();
  const after = await send({ type: 'apply-theme', input }, ['apply-result']);
  const lines: string[] = after?.lines ?? [];
  ok(after?.ok === true && file.vars.includes(renamed) && !lines.some((l) => l.includes('orphaned variables')) && !String(after.summary).includes('orphaned variables'),
    `main/apply note spares renamed variable: #3869, with the hand-made one gone, a re-apply's orphan note does not count "${wname} (Prism3)" (${JSON.stringify(lines.filter((l) => l.includes('orphaned')))})`);
}

console.log = log;
if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log(`\nprune through main.ts: all checks pass — ${executed} assertions executed`);
process.exit(0);
