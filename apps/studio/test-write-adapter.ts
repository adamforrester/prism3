/**
 * Write-adapter test: the inbound half (#1840).
 *
 *   npx tsx apps/studio/test-write-adapter.ts
 *
 * (The outbound half, #1720's `cssVarAdapter`, went with the adapter in #2487 PR 6: nothing in the UI used it.)
 *
 * `toHostMessage`, the validator every `MainToUi` message crosses, driven with
 * literal messages and literal expected `HostMessage`s. Mutation that declares `restore-input-empty` `null`
 * in the adapter's `INBOUND` table fails `accepts restore-input-empty` BY NAME.
 */
import { toHostMessage } from './src/write-adapter';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// ─── Inbound validation (#1840) ─────────────────────────────────────────────────────────────────────────
// `toHostMessage` is the boundary every `MainToUi` message crosses before the UI sees it. Its accepted
// kinds are keyed by the `MainToUi` union at compile time (a new kind fails typecheck until handled); what
// this checks is the runtime half: each accepted kind still produces the UI's `HostMessage`, and each kind
// that is not the shared UI's, or not a kind at all, is still dropped. Every expected value is a literal.
console.log('\ninbound validation (#1840)');
const wire = (pluginMessage: unknown): unknown => ({ pluginMessage });
const same = (got: unknown, want: unknown): boolean => JSON.stringify(got) === JSON.stringify(want);
const accepts = (label: string, msg: unknown, want: unknown): void => {
  const got = toHostMessage(wire(msg));
  ok(same(got, want), `accepts ${label}` + (same(got, want) ? '' : ` — got ${JSON.stringify(got)}`));
};
const drops = (label: string, data: unknown): void => {
  const got = toHostMessage(data);
  ok(got === null, `drops ${label}` + (got === null ? '' : ` — got ${JSON.stringify(got)}`));
};

accepts('apply-result', { type: 'apply-result', ok: true, headline: '✓ 12 written', summary: 'counts' },
  { kind: 'apply-result', ok: true, headline: '✓ 12 written', summary: 'counts' , lines: null });
accepts('apply-result without a headline (older host)', { type: 'apply-result', ok: false, summary: 'x' },
  { kind: 'apply-result', ok: false, headline: '✗ apply failed', summary: 'x' , lines: null });
// `completed` (UI redesign S8.2, owner decision C1): carried as the host sends it, and never inferred from `ok`: a
// post without it (a contract break, since `messages.ts` requires it) reads as a build that did not finish.
accepts('component-result', { type: 'component-result', ok: true, completed: true, headline: '✓ 48 built', summary: 's' },
  { kind: 'component-result', ok: true, headline: '✓ 48 built', summary: 's', completed: true , lines: null });
accepts('component-result without completed is not read off ok', { type: 'component-result', ok: true, headline: '✓ 48 built', summary: 's' },
  { kind: 'component-result', ok: true, headline: '✓ 48 built', summary: 's', completed: false , lines: null });
accepts('component-result without a headline', { type: 'component-result', ok: true, completed: true, summary: 's' },
  { kind: 'component-result', ok: true, headline: '✓ built', summary: 's', completed: true , lines: null });
accepts('component-result that completed with misses', { type: 'component-result', ok: false, completed: true, headline: '⚠ 48, 2 missed', summary: 's' },
  { kind: 'component-result', ok: false, headline: '⚠ 48, 2 missed', summary: 's', completed: true , lines: null });
// #2265: the update check's verdict, its own kind, so it can never be read as a build's.
accepts('component-update-result', { type: 'component-update-result', ok: true, headline: 'Would change 1 of 26', summary: 's', lines: ['a: 1 to update.', 'b: up to date.'] },
  { kind: 'component-update-result', ok: true, headline: 'Would change 1 of 26', summary: 's', lines: ['a: 1 to update.', 'b: up to date.'], publish: null });
accepts('component-update-result without a headline', { type: 'component-update-result', ok: false, summary: 's' },
  { kind: 'component-update-result', ok: false, headline: '✗ check failed', summary: 's', lines: null, publish: null });
// #2858: an Update's publish description is carried; anything but a non-empty string is dropped.
accepts('component-update-result with a publish description', { type: 'component-update-result', ok: true, headline: '✓ updated 3 in place', summary: 's', lines: ['a'], publish: 'Before Prism3 updated tag. Engine 0.237.0.' },
  { kind: 'component-update-result', ok: true, headline: '✓ updated 3 in place', summary: 's', lines: ['a'], publish: 'Before Prism3 updated tag. Engine 0.237.0.' });
accepts('component-update-result with a malformed publish description', { type: 'component-update-result', ok: true, headline: 'h', summary: 's', publish: 42 },
  { kind: 'component-update-result', ok: true, headline: 'h', summary: 's', lines: null, publish: null });
accepts('component-result that stopped before the set', { type: 'component-result', ok: false, completed: false, headline: '✗ unknown def', summary: 's' },
  { kind: 'component-result', ok: false, headline: '✗ unknown def', summary: 's', completed: false , lines: null });
accepts('component-result with a malformed completed', { type: 'component-result', ok: false, completed: 'yes', headline: '✗ x', summary: 's' },
  { kind: 'component-result', ok: false, headline: '✗ x', summary: 's', completed: false , lines: null });
accepts('file-setup-result', { type: 'file-setup-result', ok: true, headline: '✓ 9 pages', summary: 'p' },
  { kind: 'file-setup-result', ok: true, headline: '✓ 9 pages', summary: 'p' });
accepts('file-setup-result without a headline', { type: 'file-setup-result', ok: false, summary: 'p' },
  { kind: 'file-setup-result', ok: false, headline: '✗ setup failed', summary: 'p' });
accepts('style-guide-result', { type: 'style-guide-result', ok: true, headline: '✓ 4 tables', summary: 't' },
  { kind: 'style-guide-result', ok: true, headline: '✓ 4 tables', summary: 't' , lines: null, retired: [] });
// #2177: a verdict's items, one line each in the Activity drawer. Every entry a string, or the list is dropped whole and
// the drawer shows the summary as its one line.
accepts('apply-result with its lines', { type: 'apply-result', ok: true, headline: '✓ applied', summary: 'a, b', lines: ['a', 'b'] },
  { kind: 'apply-result', ok: true, headline: '✓ applied', summary: 'a, b', lines: ['a', 'b'] });
accepts('component-result with its lines', { type: 'component-result', ok: true, completed: true, headline: '✓ built', summary: 's. t', lines: ['s', 't'] },
  { kind: 'component-result', ok: true, headline: '✓ built', summary: 's. t', completed: true, lines: ['s', 't'] });
accepts('style-guide-result with its lines', { type: 'style-guide-result', ok: true, headline: '✓ 4 tables', summary: 't. u', lines: ['t', 'u'] },
  { kind: 'style-guide-result', ok: true, headline: '✓ 4 tables', summary: 't. u', lines: ['t', 'u'], retired: [] });
accepts('apply-result with a malformed lines leaves them off', { type: 'apply-result', ok: true, headline: '✓ applied', summary: 'a, b', lines: ['a', 2] },
  { kind: 'apply-result', ok: true, headline: '✓ applied', summary: 'a, b', lines: null });
accepts('style-guide-result without a headline', { type: 'style-guide-result', ok: true, summary: 't' },
  { kind: 'style-guide-result', ok: true, headline: '✓ style guide written', summary: 't' , lines: null, retired: [] });
accepts('component-progress', { type: 'component-progress', phase: 'wire', done: 3.7, total: 10, chunkMs: 41 },
  { kind: 'component-progress', phase: 'wire', done: 3, total: 10, chunkMs: 41 });
accepts('style-guide-progress', { type: 'style-guide-progress', done: 6.4, total: 22, tableMs: 900 },
  { kind: 'style-guide-progress', done: 6, total: 22 });
accepts('agent-progress (a style guide\'s table reading)', { type: 'agent-progress', id: 'a1', progress: { at: 't', phase: 'table', done: 6, total: 22, chunkMs: 900 } },
  { kind: 'agent-progress', id: 'a1', phase: 'table', done: 6, total: 22 });
accepts('prune-result (preview)', { type: 'prune-result', ok: true, applied: false, count: 5, summary: 'r' },
  { kind: 'prune-result', ok: true, applied: false, count: 5, summary: 'r' });
accepts('prune-result (agent preview, pillOnly)', { type: 'prune-result', ok: true, applied: false, count: 2, summary: 'r', pillOnly: true },
  { kind: 'prune-result', ok: true, applied: false, count: 2, summary: 'r', pillOnly: true });
accepts('seed-info', { type: 'seed-info', ok: false, present: true, summary: 'ours', failed: 2 },
  { kind: 'seed-info', ok: false, summary: 'ours', present: true, failed: 2 });
accepts('seed-info without present or failed (older host)', { type: 'seed-info', ok: true, summary: 'ours' },
  { kind: 'seed-info', ok: true, summary: 'ours', present: false, failed: 0 });
accepts('seed-info with a malformed failed count', { type: 'seed-info', ok: false, present: true, summary: 'ours', failed: '2' },
  { kind: 'seed-info', ok: false, summary: 'ours', present: true, failed: 0 });
accepts('restore-input', { type: 'restore-input', input: { name: 'b' } },
  { kind: 'restore-input', input: { name: 'b' } });
accepts('restore-input-empty', { type: 'restore-input-empty' }, { kind: 'restore-input-empty' });
// #2879: the file check's two messages. The library answer is validated at the boundary: counts are whole and not
// negative, versions are semvers, a blank name is no name, and one that states no evidence is dropped.
accepts('restore-input-reading', { type: 'restore-input-reading' }, { kind: 'restore-input-reading' });
accepts('restore-input-library', { type: 'restore-input-library', library: { name: ' Product Library ', versions: ['0.231.0', 'x', 7, '0.237.0'], instances: 12, bindings: 3.5 } },
  { kind: 'restore-input-library', library: { name: 'Product Library', versions: ['0.231.0', '0.237.0'], instances: 12, bindings: 0 } });
accepts('restore-input-library with no name', { type: 'restore-input-library', library: { name: '  ', versions: [], instances: 0, bindings: 4 } },
  { kind: 'restore-input-library', library: { name: null, versions: [], instances: 0, bindings: 4 } });
accepts('restore-input-library with no evidence, as restore-input-empty (the start window, never a hanging "Reading this file")',
  { type: 'restore-input-library', library: { name: 'Product Library', versions: ['0.237.0'], instances: 0, bindings: -2 } }, { kind: 'restore-input-empty' });
accepts('restore-input-library with no library, as restore-input-empty', { type: 'restore-input-library' }, { kind: 'restore-input-empty' });
accepts('restore-input-error', { type: 'restore-input-error', message: 'old shape' },
  { kind: 'restore-input-error', message: 'old shape' });
accepts('font-list, with a non-string family dropped together with its count', { type: 'font-list', families: ['Inter', 7, 'Roboto'], styles: [9, 3, 36] },
  { kind: 'font-list', families: ['Inter', 'Roboto'], styles: [9, 36] });
accepts('font-list without styles (older host)', { type: 'font-list', families: ['Inter'] },
  { kind: 'font-list', families: ['Inter'], styles: [0] });

drops('agent-link-state (the panel\'s own listener reads it)', wire({ type: 'agent-link-state', state: { on: true } }));
drops('agent-result', wire({ type: 'agent-result', result: { id: 'a' } }));
// UI redesign S11: the agent's runs, which the Activity drawer shows.
accepts('agent-started', { type: 'agent-started', id: 'a1', cmd: 'apply-theme' }, { kind: 'agent-started', id: 'a1', cmd: 'apply-theme' });
accepts('agent-finished', { type: 'agent-finished', id: 'a1', cmd: 'apply-theme' }, { kind: 'agent-finished', id: 'a1' });
accepts('agent-progress', { type: 'agent-progress', id: 'b1', progress: { phase: 'build', done: 24.6, total: 648, chunkMs: 40 } },
  { kind: 'agent-progress', id: 'b1', phase: 'build', done: 24, total: 648 });
drops('agent-progress with no reading', wire({ type: 'agent-progress', id: 'a', progress: {} }));
drops('agent-started with no id', wire({ type: 'agent-started', cmd: 'apply-theme' }));
drops('agent-log', wire({ type: 'agent-log', id: 'a', line: 'x' }));
// #1957: a second write of a running operation, declined by the main thread.
accepts('refused', { type: 'refused', code: 'busy', cmd: 'apply-theme', agent: false, message: 'Apply Theme is already running. Try again when it finishes.' },
  { kind: 'refused', code: 'busy', cmd: 'apply-theme', agent: false, message: 'Apply Theme is already running. Try again when it finishes.' });
drops('refused with another code', wire({ type: 'refused', code: 'nope', cmd: 'apply-theme', agent: false, message: 'm' }));
drops('refused with no message', wire({ type: 'refused', code: 'busy', cmd: 'apply-theme', agent: false }));
drops('refused with no caller', wire({ type: 'refused', code: 'busy', cmd: 'apply-theme', message: 'm' }));
drops('an unknown type', wire({ type: 'apply-results', ok: true, summary: 's' }));
drops('an inherited key as type (toString)', wire({ type: 'toString' }));
drops('a message with no type', wire({ ok: true, summary: 's' }));
drops('a non-object pluginMessage', wire('apply-result'));
drops('an event with no pluginMessage', { type: 'apply-result' });
drops('null data', null);
drops('restore-input with no input', wire({ type: 'restore-input' }));
drops('font-list with no families array', wire({ type: 'font-list', families: 'Inter' }));
drops('component-progress with total 0', wire({ type: 'component-progress', phase: 'build', done: 0, total: 0, chunkMs: 1 }));
drops('component-progress with an unknown phase', wire({ type: 'component-progress', phase: 'paint', done: 1, total: 2, chunkMs: 1 }));
drops('style-guide-progress with total 0', wire({ type: 'style-guide-progress', done: 0, total: 0, tableMs: 0 }));
drops('style-guide-progress past its total', wire({ type: 'style-guide-progress', done: 23, total: 22, tableMs: 0 }));
drops('prune-result with a negative count', wire({ type: 'prune-result', ok: true, applied: false, count: -1, summary: 'r' }));

// ─── UI redesign S11.2: the Build style guides page ─────────────────────────────────────────────────────
console.log('\nthe Build style guides page (S11.2)');
const CATALOG = {
  setUp: true,
  collections: [
    { id: 'C:1', name: 'color', modes: ['light', 'dark'], items: [{ name: 'color/text/primary', table: 0, value: '#111111' }, { name: 'color/opacity/50', table: -1, value: '50' }] },
    { id: 'text-styles', name: 'Text styles', modes: [], textStyles: true, items: [{ name: 'body/md', table: 1, value: '' }] },
    { id: 'effect-styles', name: 'Effect styles', modes: [], effectStyles: true, items: [{ name: 'shadow/sm', table: 2, value: '' }] },
    { id: 'gradient-styles', name: 'Gradient styles', modes: [], gradientStyles: true, items: [{ name: 'gradient/brand', table: 3, value: '' }] },
  ],
  tables: [{ key: 'color|C:1|color/text', title: 'Text', kind: 'color', page: 'Semantic tokens', rows: 1 }, { key: 'typography|text-styles|body', title: 'Text styles', kind: 'text', page: 'Semantic tokens', rows: 1 },
    { key: 'shadow|effect-styles|', title: 'Effect styles', kind: 'effect', page: 'Semantic tokens', rows: 1 }, { key: 'gradient|gradient-styles|', title: 'Gradient styles', kind: 'gradient', page: 'Semantic tokens', rows: 1 }],
  notes: ['Not drawn until a later phase: 1 opacity variable'],
};
accepts('style-guide-catalog', { type: 'style-guide-catalog', catalog: CATALOG }, { kind: 'style-guide-catalog', catalog: CATALOG, error: null });
accepts('style-guide-catalog with the host\'s error', { type: 'style-guide-catalog', catalog: { setUp: false, collections: [], tables: [], notes: [] }, error: 'no read' },
  { kind: 'style-guide-catalog', catalog: { setUp: false, collections: [], tables: [], notes: [] }, error: 'no read' });
// An item that names a table the host did not list reads as one no phase draws, so the page cannot offer it.
accepts('style-guide-catalog: an item pointing past the tables reads as not drawn', { type: 'style-guide-catalog', catalog: { setUp: 'yes', collections: [{ id: 'C:1', name: 'c', modes: ['m', 3], items: [{ name: 'c/a', table: 7, value: '#000000' }, { name: 5 }] }], tables: [], notes: [] } },
  { kind: 'style-guide-catalog', catalog: { setUp: false, collections: [{ id: 'C:1', name: 'c', modes: ['m'], items: [{ name: 'c/a', table: -1, value: '#000000' }] }], tables: [], notes: [] }, error: null });
drops('style-guide-catalog with no tables array', wire({ type: 'style-guide-catalog', catalog: { setUp: true, collections: [] } }));
accepts('style-guide-tables', { type: 'style-guide-tables', tables: [{ key: 'k1', title: 'Primary', page: 'Primitive tokens' }] },
  { kind: 'style-guide-tables', tables: [{ key: 'k1', title: 'Primary', page: 'Primitive tokens' }] });
drops('style-guide-tables with a malformed entry (every later index would shift)', wire({ type: 'style-guide-tables', tables: [{ key: 'k1', title: 'Primary' }, { key: 'k2', title: 'Neutral', page: 'Primitive tokens' }] }));
accepts('style-guide-table drawing', { type: 'style-guide-table', index: 3, status: 'drawing' }, { kind: 'style-guide-table', index: 3, status: 'drawing', reason: null });
accepts('style-guide-table failed, with its reason', { type: 'style-guide-table', index: 3, status: 'failed', reason: 'Accent refused' },
  { kind: 'style-guide-table', index: 3, status: 'failed', reason: 'Accent refused' });
drops('style-guide-table with an unknown status', wire({ type: 'style-guide-table', index: 0, status: 'waiting' }));
drops('style-guide-table with no index', wire({ type: 'style-guide-table', status: 'done' }));
accepts('style-guide-result stopped by Cancel', { type: 'style-guide-result', ok: true, headline: '✓ style guide: 3 tables', summary: 's', stopped: { done: 3, total: 22 } },
  { kind: 'style-guide-result', ok: true, headline: '✓ style guide: 3 tables', summary: 's', stopped: { done: 3, total: 22 } , lines: null, retired: [] });
// Q412 A: the cleanup offer, an id and a name each; an entry that is not one is dropped.
accepts('style-guide-result with its cleanup offer', { type: 'style-guide-result', ok: true, headline: '✓ x', summary: 's', retired: [{ id: '1:2', name: 'Style guide — Inverse' }, { id: 7, name: 'x' }, null] },
  { kind: 'style-guide-result', ok: true, headline: '✓ x', summary: 's', lines: null, retired: [{ id: '1:2', name: 'Style guide — Inverse' }] });
accepts('style-guide-cleanup-result', { type: 'style-guide-cleanup-result', ok: true, removed: ['1:2', 3], summary: '1 table removed: Style guide — Inverse' },
  { kind: 'style-guide-cleanup-result', ok: true, summary: '1 table removed: Style guide — Inverse', removed: ['1:2'] });
accepts('style-guide-result with a malformed stopped leaves it off', { type: 'style-guide-result', ok: true, headline: '✓ x', summary: 's', stopped: { done: 9, total: 3 } },
  { kind: 'style-guide-result', ok: true, headline: '✓ x', summary: 's' , lines: null, retired: [] });
// #2831: a checked set's consumer-breaking line crosses as given; one that is not a string is left off, the set kept.
{
  const base = { def: 'button', hash: 'h', members: 4, update: 2, add: 0, drop: 1, handEdited: 0, noBaseline: 0, blocked: false, upToDate: false };
  accepts('update-check with a published set\'s breaks line', { type: 'update-check', previewHash: 'H', missing: [], refused: [], sets: [{ ...base, breaks: 'Breaks library consumers: x.' }, base] },
    { kind: 'update-check', previewHash: 'H', missing: [], sets: [{ ...base, breaks: 'Breaks library consumers: x.' }, base], error: null });
  accepts('update-check with a malformed breaks line leaves it off', { type: 'update-check', previewHash: 'H', missing: [], refused: [], sets: [{ ...base, breaks: 7 }] },
    { kind: 'update-check', previewHash: 'H', missing: [], sets: [base], error: null });
}
// #3082 Q811 A: an engine update's due reading carries what moved; the executor's has no list; malformed entries in the
// list are dropped and the set still reads due.
{
  const moved = { parts: [{ part: 'focus-ring', facets: ['size'] }], added: ['icon'], dropped: [], set: false };
  accepts('file-sets with an engine and an executor due reading', { type: 'file-sets', present: ['button', 'tag'], setUp: true, due: { button: { state: 'due', reason: 'engine', moved }, tag: { state: 'due', reason: 'executor' } } },
    { kind: 'file-sets', present: ['button', 'tag'], setUp: true, error: null, due: { button: { state: 'due', reason: 'engine', moved }, tag: { state: 'due', reason: 'executor' } } });
  accepts('file-sets with a malformed moved list keeps the set due and drops the bad entries', { type: 'file-sets', present: ['button'], setUp: true, due: { button: { state: 'due', reason: 'engine', moved: { parts: [{ part: 'label', facets: ['nope'] }, { part: 3, facets: ['size'] }], added: [7, 'x'], set: 'yes' } } } },
    { kind: 'file-sets', present: ['button'], setUp: true, error: null, due: { button: { state: 'due', reason: 'engine', moved: { parts: [], added: ['x'], dropped: [], set: false } } } });
}

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
