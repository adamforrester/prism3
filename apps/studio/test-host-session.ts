/**
 * Host-session test (UI redesign F3) — imports the REAL `src/state/host-session.ts` in Node, with no DOM,
 * and asserts on the reducer and the repaint list for every host message kind the UI handles.
 *
 *   npx tsx apps/studio/test-host-session.ts
 *
 * WHY THIS COULD NOT BE WRITTEN BEFORE. The host slots were `let`s in `main.ts`, and the handler that wrote
 * them also repainted. #870 (a component verdict repainted the bar but left the Components page's build
 * button disabled) was a missing repaint that only a browser could see. Here it is replayed as data: the
 * verdict must land in the slot the page reads AND name the page's row among its repaints.
 *
 * docs/34 (gate independence): every expected state is a literal, or built from the message this file
 * sent. Nothing is compared against a second call to `reduce`. The one engine call is a premise: the
 * blob this file calls malformed is one `brandTheme` refuses when asked directly.
 *
 * Mutations that fail here BY NAME (measured, see the F3 progress entry): drop `apply-result`'s slot
 * write → `apply-result: …`; drop `componentRow` from `component-result`'s repaints, or its slot write →
 * `#870 replay: …`.
 */
import type { BrandInput } from '@prism3/engine/theme';
import { brandTheme } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { initialHostSession, reduce, repaintsFor, type HostSession } from './src/state/host-session';
import type { HostMessage } from './src/write-adapter';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
/** A session as plain data, with the Map spelled out, so two sessions compare by value. */
const plain = (s: HostSession): unknown => ({ ...s, hostFontStyles: [...s.hostFontStyles] });

/** Every kind the UI's handler receives, written out here rather than read from the code under test. */
const KINDS = [
  'apply-result', 'component-result', 'file-setup-result', 'style-guide-result', 'component-progress',
  'prune-result', 'seed-info', 'restore-input', 'restore-input-empty', 'restore-input-error', 'font-list',
] as const;
const exercised = new Set<string>();

/** Run one message: the next state and its repaints. Also asserts `reduce` left its input alone. */
const step = (s: HostSession, m: HostMessage): { next: HostSession; repaints: readonly string[] } => {
  exercised.add(m.kind);
  const before = JSON.stringify(plain(s));
  const next = reduce(Object.freeze(s), m);
  ok(JSON.stringify(plain(s)) === before, `${m.kind}: reduce leaves the previous session unchanged`);
  return { next, repaints: repaintsFor(m, s, next) };
};

ok(typeof (globalThis as { document?: unknown }).document === 'undefined', 'premise: no `document` in this process');

const init = initialHostSession();
ok(same(plain(init), {
  seedOutcome: null, inputRecovered: false, restoreError: null, applyState: null, componentState: null,
  fileSetupState: null, styleGuideState: null, componentProgress: null, pruneBusy: false, prunePreview: null,
  pruneVerdict: null, openDetail: null, hostFonts: [], hostFontStyles: [],
}), 'initial session: every slot empty');

// ---- the four verdict kinds ------------------------------------------------------------------------------
// A good verdict closes whatever detail was open; a bad one opens its own. Each lands in its own slot only.
const verdictCases = [
  { kind: 'apply-result', slot: 'applyState', detail: 'apply', row: [] },
  { kind: 'component-result', slot: 'componentState', detail: 'components', row: ['componentRow'] },
  { kind: 'file-setup-result', slot: 'fileSetupState', detail: 'filesetup', row: ['fileSetupRow'] },
  { kind: 'style-guide-result', slot: 'styleGuideState', detail: 'styleguide', row: ['styleGuideRow'] },
] as const;
for (const c of verdictCases) {
  const from: HostSession = { ...init, [c.slot]: 'pending', openDetail: 'apply' };
  const good = step(from, { kind: c.kind, ok: true, headline: 'H', summary: 'S' });
  ok(same(plain(good.next), plain({ ...from, [c.slot]: { ok: true, headline: 'H', summary: 'S' }, openDetail: null })),
    `${c.kind}: a clean verdict fills ${c.slot} and closes the open detail, touching nothing else`);
  ok(same(good.repaints, ['bar', 'applyDetail', ...c.row]), `${c.kind}: repaints ${['bar', 'applyDetail', ...c.row].join(', ')}`);
  const bad = step(from, { kind: c.kind, ok: false, headline: 'X', summary: 'why' });
  ok(same(bad.next[c.slot], { ok: false, headline: 'X', summary: 'why' }) && bad.next.openDetail === c.detail,
    `${c.kind}: a bad verdict opens its own detail ('${c.detail}')`);
}

// ---- #870 replayed ---------------------------------------------------------------------------------------
// The build button sets `componentState` to pending (and clears progress); a chunk boundary reports; the
// verdict lands; a boundary message still queued behind it arrives late. The Components page reads
// `componentState` (its button and pill) and `componentProgress` (its pending text), so the verdict has to
// reach both slots and name the page's row among its repaints, not only the bar.
{
  const pending: HostSession = { ...init, componentState: 'pending' };
  const prog = step(pending, { kind: 'component-progress', phase: 'build', done: 24, total: 648, chunkMs: 90 });
  ok(same(prog.next.componentProgress, { phase: 'build', done: 24, total: 648 }), 'component-progress: records phase, done and total while pending');
  ok(same(prog.repaints, ['componentPending']), 'component-progress: rewrites the pending pills, no re-render');
  const verdict = step(prog.next, { kind: 'component-result', ok: true, headline: '✓ built 648', summary: 'all good' });
  ok(same(verdict.next.componentState, { ok: true, headline: '✓ built 648', summary: 'all good' }),
    '#870 replay: the verdict lands in componentState, the slot the Components page reads');
  ok(verdict.next.componentProgress === null, '#870 replay: the verdict clears componentProgress, so no page shows a stale fraction');
  ok(verdict.repaints.includes('componentRow'), '#870 replay: the verdict repaints the Components page row, not only the bar');
  const late = step(verdict.next, { kind: 'component-progress', phase: 'wire', done: 600, total: 648, chunkMs: 90 });
  ok(late.next === verdict.next && late.repaints.length === 0, 'component-progress: a late reading after the verdict is dropped and repaints nothing');
  const idle = step(init, { kind: 'component-progress', phase: 'build', done: 1, total: 2, chunkMs: 0 });
  ok(idle.next === init, 'component-progress: ignored when no build is pending');
}

// ---- prune-result: the four branches ---------------------------------------------------------------------
{
  const busy: HostSession = { ...init, pruneBusy: 'preview', pruneVerdict: { ok: true, count: 1, summary: 'old' } };
  const preview = step(busy, { kind: 'prune-result', ok: true, applied: false, count: 3, summary: '3 stale' });
  ok(preview.next.pruneBusy === false && same(preview.next.prunePreview, { count: 3, summary: '3 stale' }) && preview.next.pruneVerdict === null,
    'prune-result: a preview with something stale opens the confirm (prunePreview) and clears the verdict');
  ok(same(preview.repaints, ['bar']), 'prune-result: repaints the bar');
  const none = step(busy, { kind: 'prune-result', ok: true, applied: false, count: 0, summary: 'nothing stale' });
  ok(none.next.prunePreview === null && same(none.next.pruneVerdict, { ok: true, count: 0, summary: 'nothing stale' }),
    'prune-result: a preview with nothing stale is a pill, never a dialog');
  const agent = step(busy, { kind: 'prune-result', ok: true, applied: false, count: 2, summary: '2 stale', pillOnly: true });
  ok(agent.next.prunePreview === null && same(agent.next.pruneVerdict, { ok: true, count: 2, summary: 'Agent preview: 2 stale' }),
    'prune-result: an agent preview (pillOnly) is a pill, never the dialog');
  const done = step({ ...busy, pruneBusy: 'delete', prunePreview: { count: 3, summary: '3 stale' } },
    { kind: 'prune-result', ok: true, applied: true, count: 3, summary: 'removed 3' });
  ok(done.next.pruneBusy === false && done.next.prunePreview === null && same(done.next.pruneVerdict, { ok: true, count: 3, summary: 'removed 3' }),
    'prune-result: an applied delete is the verdict and closes the dialog');
}

// ---- the boot reads: seed-info and restore-input, in either order ----------------------------------------
const harbor = structuredClone((exampleBrands as Record<string, BrandInput>)['harbor']);
let refuses = false;
try { brandTheme({} as BrandInput); } catch { refuses = true; }
ok(refuses, 'premise: the engine refuses an empty object as a BrandInput');
{
  const seedFirst = step(init, { kind: 'seed-info', ok: true, summary: 'contract holds', present: true });
  ok(same(seedFirst.next.seedOutcome, { state: 'present', recovered: false, contractOk: true, detail: 'contract holds' }),
    'seed-info: before restore-input, a present file reads as not recovered');
  ok(same(seedFirst.repaints, ['bar']), 'seed-info: repaints the bar');
  const thenRestore = step(seedFirst.next, { kind: 'restore-input', input: harbor });
  ok(thenRestore.next.inputRecovered === true && same(thenRestore.next.seedOutcome, { state: 'present', recovered: true, contractOk: true, detail: 'contract holds' }),
    'restore-input: repairs a seed outcome already joined without it');
  ok(same(thenRestore.repaints, ['loadBrand']), 'restore-input: an accepted blob loads the brand');

  const restoreFirst = step(init, { kind: 'restore-input', input: harbor });
  ok(restoreFirst.next.inputRecovered === true && restoreFirst.next.seedOutcome === null, 'restore-input: before seed-info, records the recovery only');
  const thenSeed = step(restoreFirst.next, { kind: 'seed-info', ok: true, summary: 'contract holds', present: true });
  ok(same(thenSeed.next.seedOutcome, { state: 'present', recovered: true, contractOk: true, detail: 'contract holds' }),
    'seed-info: after restore-input, a present file reads as recovered');

  const absent = step(init, { kind: 'seed-info', ok: true, summary: 'no variables', present: false });
  ok(same(absent.next.seedOutcome, { state: 'absent' }), 'seed-info: no Prism3 variables reads as absent');
  const broken = step(init, { kind: 'seed-info', ok: false, summary: 'read failed', present: false });
  ok(same(broken.next.seedOutcome, { state: 'error', message: 'read failed' }), 'seed-info: a failed read reads as an error');

  const malformed = step(init, { kind: 'restore-input', input: {} });
  ok(malformed.next === init && malformed.repaints.length === 0, 'restore-input: a blob the engine refuses changes nothing and loads nothing');
}

// ---- restore-input-empty, restore-input-error, font-list -------------------------------------------------
{
  const empty = step(init, { kind: 'restore-input-empty' });
  ok(empty.next === init && same(empty.repaints, ['startFresh']), 'restore-input-empty: no host state; asks for the fresh-file start');
  const err = step(init, { kind: 'restore-input-error', message: 'unknown schema 9' });
  ok(err.next.restoreError === 'unknown schema 9' && same(err.repaints, ['bar']), 'restore-input-error: records the message and repaints the bar');
  const fonts = step(init, { kind: 'font-list', families: ['Inter', 'Roboto', 'Mystery'], styles: [18, 36] });
  ok(same(fonts.next.hostFonts, ['Inter', 'Roboto', 'Mystery']), 'font-list: records the families in order');
  ok(same([...fonts.next.hostFontStyles], [['Inter', 18], ['Roboto', 36], ['Mystery', 0]]), 'font-list: pairs each family with its style count, 0 where none was sent');
  ok(same(fonts.repaints, ['workspace']), 'font-list: re-renders the workspace');
}

for (const k of KINDS) ok(exercised.has(k), `coverage: ${k} was exercised`);

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
