/**
 * Host-session test (UI redesign F3) — imports the REAL `src/state/host-session.ts` in Node, with no DOM,
 * and asserts on the reducer, the topics each message invalidates (`topicsFor`) and its brand-session effect
 * (`brandEffectFor`) for every host message kind the UI handles.
 *
 *   npx tsx apps/studio/test-host-session.ts
 *
 * WHY THIS COULD NOT BE WRITTEN BEFORE. The host slots were `let`s in `main.ts`, and the handler that wrote
 * them also repainted. #870 (a component verdict repainted the bar but left the Components page's build
 * button disabled) was a missing repaint that only a browser could see. Here it is replayed as data: the
 * verdict must land in the slot the page reads AND invalidate the page row's topic.
 *
 * WHAT THIS FILE CANNOT SEE (#1845, docs/34 shape 16). It proves a message names the right TOPIC. Whether
 * a surface is subscribed to that topic, and repaints what a designer reads, is a question about the
 * painted panel; `apps/plugin/test-build-verdict.mjs` answers it by posting each message to the built
 * bundle and reading every topic's surface back. Before P2 this file asserted a tag list and nothing
 * checked the switch that turned tags into calls, so dropping the File setup case passed every gate.
 *
 * docs/34 (gate independence): every expected state is a literal, or built from the message this file
 * sent. Nothing is compared against a second call to `reduce`. The one engine call is a premise: the
 * blob this file calls malformed is one `brandTheme` refuses when asked directly.
 *
 * Mutations that fail here BY NAME (measured, see the F3 and P2 progress entries): drop `apply-result`'s slot
 * write → `apply-result: …`; drop `host:components` from `component-result`'s topics, or its slot write →
 * `#870 replay: …`. UI redesign S11: drop `agent-started`'s case → `agent-started: an apply-theme run …`;
 * drop `settleAgent` from `reduce` → `agent run: the apply verdict settles the run …`. #1957: drop the
 * `unpend` → `refused: a panel request declined behind an agent's run clears …`; fill the apply slot with a
 * failed verdict (the refusal counted as needing attention) → `refused: an agent's declined request leaves …`;
 * pin `n` → `refused: a second identical refusal still counts as a change`.
 */
import type { BrandInput } from '@prism3/engine/theme';
import { brandTheme } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { initialHostSession, reduce, topicsFor, brandEffectFor, type HostSession } from './src/state/host-session';
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
const plain = (s: HostSession): unknown => ({ ...s, hostFontStyles: [...s.hostFontStyles], setBuilds: [...s.setBuilds] });

/** Every kind the UI's handler receives, written out here rather than read from the code under test. */
const KINDS = [
  'apply-result', 'component-result', 'file-setup-result', 'style-guide-result', 'component-progress',
  'prune-result', 'seed-info', 'restore-input', 'restore-input-empty', 'restore-input-error', 'font-list',
  'agent-started', 'agent-progress', 'agent-finished', 'refused',
] as const;
const exercised = new Set<string>();

/** Run one message: the next state, its topics and its brand effect. Also asserts `reduce` left its input alone. */
const step = (s: HostSession, m: HostMessage): { next: HostSession; topics: readonly string[]; effect: string | null } => {
  exercised.add(m.kind);
  const before = JSON.stringify(plain(s));
  const next = reduce(Object.freeze(s), m);
  ok(JSON.stringify(plain(s)) === before, `${m.kind}: reduce leaves the previous session unchanged`);
  return { next, topics: topicsFor(m, s, next), effect: brandEffectFor(m, s, next) };
};

ok(typeof (globalThis as { document?: unknown }).document === 'undefined', 'premise: no `document` in this process');

const init = initialHostSession();
ok(same(plain(init), {
  seedOutcome: null, inputRecovered: false, restoreError: null, applyState: null, componentState: null,
  fileSetupState: null, styleGuideState: null, componentProgress: null, componentDef: null, setBuilds: [], pruneBusy: false, prunePreview: null,
  pruneVerdict: null, openDetail: null, hostFonts: [], hostFontStyles: [], agentRun: null, refused: null,
}), 'initial session: every slot empty');

// ---- the four verdict kinds ------------------------------------------------------------------------------
// A good verdict closes whatever detail was open; a bad one opens its own. Each lands in its own slot only.
const verdictCases = [
  { kind: 'apply-result', slot: 'applyState', detail: 'apply', row: [] },
  { kind: 'component-result', slot: 'componentState', detail: 'components', row: ['host:components'] },
  { kind: 'file-setup-result', slot: 'fileSetupState', detail: 'filesetup', row: ['host:filesetup'] },
  { kind: 'style-guide-result', slot: 'styleGuideState', detail: 'styleguide', row: ['host:styleguide'] },
] as const;
for (const c of verdictCases) {
  const from: HostSession = { ...init, [c.slot]: 'pending', openDetail: 'apply' };
  const good = step(from, { kind: c.kind, ok: true, headline: 'H', summary: 'S' });
  ok(same(plain(good.next), plain({ ...from, [c.slot]: { ok: true, headline: 'H', summary: 'S' }, openDetail: null })),
    `${c.kind}: a clean verdict fills ${c.slot} and closes the open detail, touching nothing else`);
  ok(same(good.topics, ['host', 'host:detail', ...c.row]) && good.effect === null, `${c.kind}: invalidates ${['host', 'host:detail', ...c.row].join(', ')}`);
  const bad = step(from, { kind: c.kind, ok: false, headline: 'X', summary: 'why' });
  ok(same(bad.next[c.slot], { ok: false, headline: 'X', summary: 'why' }) && bad.next.openDetail === c.detail,
    `${c.kind}: a bad verdict opens its own detail ('${c.detail}')`);
}

// ---- #870 replayed ---------------------------------------------------------------------------------------
// The build button sets `componentState` to pending (and clears progress); a chunk boundary reports; the
// verdict lands; a boundary message still queued behind it arrives late. The Components page reads
// `componentState` (its button and pill) and `componentProgress` (its pending text), so the verdict has to
// reach both slots and invalidate the page row's topic, not only the chrome's.
{
  const pending: HostSession = { ...init, componentState: 'pending' };
  const prog = step(pending, { kind: 'component-progress', phase: 'build', done: 24, total: 648, chunkMs: 90 });
  ok(same(prog.next.componentProgress, { phase: 'build', done: 24, total: 648 }), 'component-progress: records phase, done and total while pending');
  ok(same(prog.topics, ['host:progress']), 'component-progress: invalidates host:progress only (a text swap, no re-render)');
  const verdict = step(prog.next, { kind: 'component-result', ok: true, headline: '✓ built 648', summary: 'all good' });
  ok(same(verdict.next.componentState, { ok: true, headline: '✓ built 648', summary: 'all good' }),
    '#870 replay: the verdict lands in componentState, the slot the Components page reads');
  ok(verdict.next.componentProgress === null, '#870 replay: the verdict clears componentProgress, so no page shows a stale fraction');
  ok(verdict.topics.includes('host:components'), '#870 replay: the verdict invalidates the Components page row (host:components), not only the chrome');
  const late = step(verdict.next, { kind: 'component-progress', phase: 'wire', done: 600, total: 648, chunkMs: 90 });
  ok(late.next === verdict.next && late.topics.length === 0, 'component-progress: a late reading after the verdict is dropped and invalidates nothing');
  const idle = step(init, { kind: 'component-progress', phase: 'build', done: 1, total: 2, chunkMs: 0 });
  ok(idle.next === init, 'component-progress: ignored when no build is pending');
}

// ---- the per-set build ledger (UI redesign S8.2, owner decision G9 A) -----------------------------------------
// The wire's `component-result` names no set, so the panel remembers the set it posted (`componentDef`) and the
// verdict that answers that build is recorded against it in `setBuilds`: `true` clean, `false` with problems. The
// expectations are literals: a set id typed here, the verdict's `ok` typed here.
//
// Mutation this fails by name: recording the verdict against nothing (the `own` guard always false) →
// `G9: a clean verdict for the panel's own build of 'tag' records tag → true`.
{
  const posted: HostSession = { ...init, componentState: 'pending', componentDef: 'tag' };
  const clean = step(posted, { kind: 'component-result', ok: true, headline: '✓ built 45', summary: "set 'Tag'" });
  ok(same([...clean.next.setBuilds], [['tag', true]]), `G9: a clean verdict for the panel's own build of 'tag' records tag → true (${JSON.stringify([...clean.next.setBuilds])})`);
  ok(clean.next.componentDef === null, 'G9: the verdict clears the set the panel was building');
  const second = step({ ...clean.next, componentState: 'pending', componentDef: 'badge' }, { kind: 'component-result', ok: false, headline: '⚠ 20, 1 missed', summary: "set 'Badge'" });
  ok(same([...second.next.setBuilds], [['tag', true], ['badge', false]]), `G9: a verdict with problems records badge → false and keeps tag's (${JSON.stringify([...second.next.setBuilds])})`);
  const again = step({ ...second.next, componentState: 'pending', componentDef: 'tag' }, { kind: 'component-result', ok: false, headline: '✗ apply failed', summary: 'x' });
  ok(again.next.setBuilds.get('tag') === false && again.next.setBuilds.get('badge') === false, 'G9: a later build of the same set replaces its result');
  // An agent's build (the panel posted nothing): its verdict names no set, so none is recorded.
  const agentRun = step(init, { kind: 'agent-started', id: 'b9', cmd: 'build-components' }).next;
  const byAgent = step(agentRun, { kind: 'component-result', ok: true, headline: '✓ built 432', summary: "set 'Button'" });
  ok(byAgent.next.setBuilds.size === 0, `G9: an agent's build is not attributed to a set (${JSON.stringify([...byAgent.next.setBuilds])})`);
  // The panel's request declined behind an agent's run: no build of its own is coming, so it forgets the set.
  const declined = step({ ...agentRun, componentState: 'pending', componentDef: 'tag' }, { kind: 'refused', code: 'busy', cmd: 'build-components', agent: false, message: 'busy' });
  ok(declined.next.componentDef === null && declined.next.componentState === null, 'G9: a declined panel build forgets the set it posted');
}

// ---- prune-result: the four branches ---------------------------------------------------------------------
{
  const busy: HostSession = { ...init, pruneBusy: 'preview', pruneVerdict: { ok: true, applied: false, count: 1, summary: 'old' } };
  const preview = step(busy, { kind: 'prune-result', ok: true, applied: false, count: 3, summary: '3 stale' });
  ok(preview.next.pruneBusy === false && same(preview.next.prunePreview, { count: 3, summary: '3 stale' }) && preview.next.pruneVerdict === null,
    'prune-result: a preview with something stale opens the confirm (prunePreview) and clears the verdict');
  ok(same(preview.topics, ['host']), 'prune-result: invalidates host (the bar)');
  const none = step(busy, { kind: 'prune-result', ok: true, applied: false, count: 0, summary: 'nothing stale' });
  ok(none.next.prunePreview === null && same(none.next.pruneVerdict, { ok: true, applied: false, count: 0, summary: 'nothing stale' }),
    'prune-result: a preview with nothing stale is a pill, never a dialog');
  const agent = step(busy, { kind: 'prune-result', ok: true, applied: false, count: 2, summary: '2 stale', pillOnly: true });
  ok(agent.next.prunePreview === null && same(agent.next.pruneVerdict, { ok: true, applied: false, count: 2, summary: 'Agent preview: 2 stale' }),
    'prune-result: an agent preview (pillOnly) is a pill, never the dialog');
  const done = step({ ...busy, pruneBusy: 'delete', prunePreview: { count: 3, summary: '3 stale' } },
    { kind: 'prune-result', ok: true, applied: true, count: 3, summary: 'removed 3' });
  ok(done.next.pruneBusy === false && done.next.prunePreview === null && same(done.next.pruneVerdict, { ok: true, applied: true, count: 3, summary: 'removed 3' }),
    'prune-result: an applied delete is the verdict and closes the dialog');
}

// ---- the boot reads: seed-info and restore-input, in either order ----------------------------------------
const harbor = structuredClone((exampleBrands as Record<string, BrandInput>)['harbor']);
let refuses = false;
try { brandTheme({} as BrandInput); } catch { refuses = true; }
ok(refuses, 'premise: the engine refuses an empty object as a BrandInput');
{
  const seedFirst = step(init, { kind: 'seed-info', ok: true, summary: 'contract holds', present: true, failed: 0 });
  ok(same(seedFirst.next.seedOutcome, { state: 'present', recovered: false, contractOk: true, detail: 'contract holds', failed: 0 }),
    'seed-info: before restore-input, a present file reads as not recovered');
  ok(same(seedFirst.topics, ['host']), 'seed-info: invalidates host (the bar)');
  const thenRestore = step(seedFirst.next, { kind: 'restore-input', input: harbor });
  ok(thenRestore.next.inputRecovered === true && same(thenRestore.next.seedOutcome, { state: 'present', recovered: true, contractOk: true, detail: 'contract holds', failed: 0 }),
    'restore-input: repairs a seed outcome already joined without it');
  ok(thenRestore.effect === 'loadBrand' && thenRestore.topics.length === 0, 'restore-input: an accepted blob loads the brand, and invalidates no host topic');

  const restoreFirst = step(init, { kind: 'restore-input', input: harbor });
  ok(restoreFirst.next.inputRecovered === true && restoreFirst.next.seedOutcome === null, 'restore-input: before seed-info, records the recovery only');
  const thenSeed = step(restoreFirst.next, { kind: 'seed-info', ok: true, summary: 'contract holds', present: true, failed: 0 });
  ok(same(thenSeed.next.seedOutcome, { state: 'present', recovered: true, contractOk: true, detail: 'contract holds', failed: 0 }),
    'seed-info: after restore-input, a present file reads as recovered');
  // The failed-check count travels into the outcome (S11, the Activity drawer's "2 mismatches").
  const failing = step(init, { kind: 'seed-info', ok: false, summary: 'FAILED: a, b', present: true, failed: 2 });
  ok(same(failing.next.seedOutcome, { state: 'present', recovered: false, contractOk: false, detail: 'FAILED: a, b', failed: 2 }),
    'seed-info: a failing contract carries its failed-check count');

  const absent = step(init, { kind: 'seed-info', ok: true, summary: 'no variables', present: false });
  ok(same(absent.next.seedOutcome, { state: 'absent' }), 'seed-info: no Prism3 variables reads as absent');
  const broken = step(init, { kind: 'seed-info', ok: false, summary: 'read failed', present: false });
  ok(same(broken.next.seedOutcome, { state: 'error', message: 'read failed' }), 'seed-info: a failed read reads as an error');

  const malformed = step(init, { kind: 'restore-input', input: {} });
  ok(malformed.next === init && malformed.effect === null && malformed.topics.length === 0, 'restore-input: a blob the engine refuses changes nothing and loads nothing');
}

// ---- restore-input-empty, restore-input-error, font-list -------------------------------------------------
{
  const empty = step(init, { kind: 'restore-input-empty' });
  ok(empty.next === init && empty.effect === 'startFresh' && empty.topics.length === 0, 'restore-input-empty: no host state; asks for the fresh-file start');
  const err = step(init, { kind: 'restore-input-error', message: 'unknown schema 9' });
  ok(err.next.restoreError === 'unknown schema 9' && same(err.topics, ['host']), 'restore-input-error: records the message and invalidates host (the bar)');
  const fonts = step(init, { kind: 'font-list', families: ['Inter', 'Roboto', 'Mystery'], styles: [18, 36] });
  ok(same(fonts.next.hostFonts, ['Inter', 'Roboto', 'Mystery']), 'font-list: records the families in order');
  ok(same([...fonts.next.hostFontStyles], [['Inter', 18], ['Roboto', 36], ['Mystery', 0]]), 'font-list: pairs each family with its style count, 0 where none was sent');
  ok(same(fonts.topics, ['fonts']), 'font-list: invalidates fonts');
}

// ---- the agent's runs (UI redesign S11) ------------------------------------------------------------------
// The drawer reads `agentRun`; the action slots stay the panel's own, so the panel's controls are unchanged.
{
  const started = step(init, { kind: 'agent-started', id: 'a1', cmd: 'apply-theme' });
  ok(same(started.next.agentRun, { id: 'a1', op: 'apply', settled: false, progress: null }) && started.next.applyState === null,
    'agent-started: an apply-theme run is recorded as the agent\'s, and the apply slot is left alone');
  ok(same(started.topics, ['host']) && started.effect === null, 'agent-started: invalidates host (the drawer)');
  const status = step(init, { kind: 'agent-started', id: 'a0', cmd: 'status' });
  ok(status.next === init && status.topics.length === 0, 'agent-started: a status command runs no operation, so nothing changes');
  const verdict = step(started.next, { kind: 'apply-result', ok: true, headline: 'H', summary: 'S' });
  ok(same(verdict.next.agentRun, { id: 'a1', op: 'apply', settled: true, progress: null }) && same(verdict.next.applyState, { ok: true, headline: 'H', summary: 'S' }),
    'agent run: the apply verdict settles the run and lands in the apply slot');
  const other = step(started.next, { kind: 'component-result', ok: true, headline: 'H', summary: 'S' });
  ok(other.next.agentRun?.settled === false, 'agent run: another operation\'s verdict does not settle it');
  const stale = step(verdict.next, { kind: 'agent-finished', id: 'zz' });
  ok(stale.next === verdict.next && stale.topics.length === 0, 'agent-finished: another run\'s end changes nothing');
  const done = step(verdict.next, { kind: 'agent-finished', id: 'a1' });
  ok(done.next.agentRun === null && same(done.next.applyState, { ok: true, headline: 'H', summary: 'S' }) && same(done.topics, ['host']),
    'agent-finished: clears the run, keeps its verdict, invalidates host');

  const build = step(init, { kind: 'agent-started', id: 'b1', cmd: 'build-components' }).next;
  const prog = step(build, { kind: 'agent-progress', id: 'b1', phase: 'wire', done: 24, total: 648 });
  ok(same(prog.next.agentRun?.progress, { phase: 'wire', done: 24, total: 648 }) && prog.next.componentProgress === null && same(prog.topics, ['host:progress']),
    'agent-progress: the agent build\'s reading is its own, not the panel\'s, and invalidates host:progress');
  const wrongId = step(build, { kind: 'agent-progress', id: 'x', phase: 'wire', done: 1, total: 2 });
  ok(wrongId.next === build && wrongId.topics.length === 0, 'agent-progress: another run\'s progress changes nothing');
  const applyRun = step(init, { kind: 'agent-started', id: 'a2', cmd: 'apply-theme' }).next;
  const notBuild = step(applyRun, { kind: 'agent-progress', id: 'a2', phase: 'build', done: 1, total: 2 });
  ok(notBuild.next === applyRun, 'agent-progress: a run that is not a build takes no progress');
}

// ---- a declined second write (#1957) ---------------------------------------------------------------------
// The main thread refuses a second write of an operation while one is running. The refusal settles no run and
// fills no verdict slot: the running write's verdict is still coming.
{
  const BUSY = 'Apply Theme is already running. Try again when it finishes.';
  const agentRun = step(init, { kind: 'agent-started', id: 'a1', cmd: 'apply-theme' }).next;
  const ownPending: HostSession = { ...agentRun, applyState: 'pending' };
  // The panel's request, raced behind an agent's run: its own `pending` gets no verdict, so it is cleared.
  const raced = step(ownPending, { kind: 'refused', code: 'busy', cmd: 'apply-theme', agent: false, message: BUSY });
  ok(same(raced.next.refused, { op: 'apply', message: BUSY, agent: false, n: 1 }), 'refused: recorded for the drawer, with its operation, words and caller');
  ok(raced.next.applyState === null && same(raced.next.agentRun, agentRun.agentRun),
    'refused: a panel request declined behind an agent\'s run clears the panel\'s pending, and leaves the run running');
  ok(same(raced.topics, ['host']), 'refused: invalidates host (the drawer and the Apply controls)');
  // An agent's request, declined behind the panel's own run: the panel's pending is that run's, and stays.
  const panelRun: HostSession = { ...init, applyState: 'pending' };
  const byAgent = step(panelRun, { kind: 'refused', code: 'busy', cmd: 'apply-theme', agent: true, message: BUSY });
  ok(byAgent.next.applyState === 'pending' && byAgent.next.agentRun === null, 'refused: an agent\'s declined request leaves the panel\'s running write pending');
  // The panel's own request, declined behind the panel's own run (a re-fire the controls missed): still pending.
  const own = step(panelRun, { kind: 'refused', code: 'busy', cmd: 'apply-theme', agent: false, message: BUSY });
  ok(own.next.applyState === 'pending', 'refused: a panel request declined behind the panel\'s own run leaves that run pending');
  // Each refusal is a change, even one with the same words.
  const again = step(own.next, { kind: 'refused', code: 'busy', cmd: 'apply-theme', agent: false, message: BUSY });
  ok(again.next.refused?.n === 2 && same(again.topics, ['host']), 'refused: a second identical refusal still counts as a change');
  // A build's page row moves too when its pending is cleared.
  const buildRun = step(init, { kind: 'agent-started', id: 'b1', cmd: 'build-components' }).next;
  const build = step({ ...buildRun, componentState: 'pending' }, { kind: 'refused', code: 'busy', cmd: 'build-components', agent: false, message: 'Build set is already running. Try again when it finishes.' });
  ok(build.next.componentState === null && same(build.topics, ['host', 'host:components']), 'refused: a cleared build pending also invalidates its page row');
  const prune = step({ ...step(init, { kind: 'agent-started', id: 'p1', cmd: 'prune' }).next, pruneBusy: 'delete' },
    { kind: 'refused', code: 'busy', cmd: 'prune', agent: false, message: 'Prune stale is already running. Try again when it finishes.' });
  ok(prune.next.pruneBusy === false, 'refused: a declined delete behind an agent\'s prune clears the panel\'s delete');
  const unknown = step(init, { kind: 'refused', code: 'busy', cmd: 'readback', agent: true, message: 'x' });
  ok(unknown.next === init && unknown.topics.length === 0, 'refused: a command with no write operation changes nothing');
}

for (const k of KINDS) ok(exercised.has(k), `coverage: ${k} was exercised`);

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
