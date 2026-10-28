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
const plain = (s: HostSession): unknown => ({ ...s, hostFontStyles: [...s.hostFontStyles], setBuilds: [...s.setBuilds], handEdits: [...s.handEdits] });

/** Every kind the UI's handler receives, written out here rather than read from the code under test. */
const KINDS = [
  'apply-result', 'component-result', 'component-update-result', 'file-setup-result', 'style-guide-result', 'component-progress', 'style-guide-progress',
  'prune-result', 'seed-info', 'restore-input', 'restore-input-empty', 'restore-input-reading', 'restore-input-library', 'restore-input-error', 'font-list', 'doc-settings', 'file-sets',
  'hand-edits', 'hand-edits-done', 'update-check',
  'agent-started', 'agent-progress', 'agent-finished', 'refused',
  'style-guide-catalog', 'style-guide-tables', 'style-guide-table', 'style-guide-cleanup-result',
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
  seedOutcome: null, inputRecovered: false, restoreError: null, applyState: null, componentState: null, componentUpdate: null, componentLatest: null, specsState: null,
  fileSetupState: null, styleGuideState: null, componentProgress: null, styleGuideProgress: null, styleGuideCatalog: null, styleGuideRun: null, styleGuideRetired: [], styleGuideCleanup: null, componentDef: null, setBuilds: [], pruneBusy: false, prunePreview: null,
  pruneVerdict: null, openDetail: null, hostFonts: [], hostFontStyles: [], agentRun: null, refused: null, docSettings: null, fileSets: null,
  handEdits: [], handPass: 'idle', updateCheck: null,
}), 'initial session: every slot empty');

// ---- the four verdict kinds ------------------------------------------------------------------------------
// A good verdict closes whatever detail was open; a bad one opens its own. Each lands in its own slot only.
const verdictCases = [
  { kind: 'apply-result', slot: 'applyState', detail: 'apply', row: [], also: {} },
  { kind: 'component-result', slot: 'componentState', detail: 'components', row: ['host:components'], also: { componentLatest: 'build' } },
  { kind: 'file-setup-result', slot: 'fileSetupState', detail: 'filesetup', row: ['host:filesetup'], also: {} },
  { kind: 'style-guide-result', slot: 'styleGuideState', detail: 'styleguide', row: ['host:styleguide'], also: {} },
] as const;
for (const c of verdictCases) {
  const from: HostSession = { ...init, [c.slot]: 'pending', openDetail: 'apply' };
  // A style-guide verdict carries its cleanup offer (Q412 A), empty here.
  const offer = c.kind === 'style-guide-result' ? { retired: [] } : {};
  const good = step(from, { kind: c.kind, ok: true, headline: 'H', summary: 'S', ...offer } as HostMessage);
  ok(same(plain(good.next), plain({ ...from, [c.slot]: { ok: true, headline: 'H', summary: 'S' }, openDetail: null, ...c.also })),
    `${c.kind}: a clean verdict fills ${c.slot} and closes the open detail, touching nothing else`);
  ok(same(good.topics, ['host', 'host:detail', ...c.row]) && good.effect === null, `${c.kind}: invalidates ${['host', 'host:detail', ...c.row].join(', ')}`);
  const bad = step(from, { kind: c.kind, ok: false, headline: 'X', summary: 'why', ...offer } as HostMessage);
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
  const verdict = step(prog.next, { kind: 'component-result', ok: true, completed: true, headline: '✓ built 648', summary: 'all good' });
  ok(same(verdict.next.componentState, { ok: true, headline: '✓ built 648', summary: 'all good' }),
    '#870 replay: the verdict lands in componentState, the slot the Components page reads');
  ok(verdict.next.componentProgress === null, '#870 replay: the verdict clears componentProgress, so no page shows a stale fraction');
  ok(verdict.topics.includes('host:components'), '#870 replay: the verdict invalidates the Components page row (host:components), not only the chrome');
  const late = step(verdict.next, { kind: 'component-progress', phase: 'wire', done: 600, total: 648, chunkMs: 90 });
  ok(late.next === verdict.next && late.topics.length === 0, 'component-progress: a late reading after the verdict is dropped and invalidates nothing');
  const idle = step(init, { kind: 'component-progress', phase: 'build', done: 1, total: 2, chunkMs: 0 });
  ok(idle.next === init, 'component-progress: ignored when no build is pending');
}
// #1778: the style guide's table count, the same rule against its own slot.
{
  const pending: HostSession = { ...init, styleGuideState: 'pending' };
  const prog = step(pending, { kind: 'style-guide-progress', done: 6, total: 22 });
  ok(same(prog.next.styleGuideProgress, { done: 6, total: 22 }) && same(prog.topics, ['host:progress']),
    'style-guide-progress: records done and total while pending, and invalidates host:progress only');
  const verdict = step(prog.next, { kind: 'style-guide-result', ok: true, headline: '✓ style guide: 22 tables', summary: 's' });
  ok(verdict.next.styleGuideProgress === null, 'style-guide-progress: the verdict clears it');
  const late = step(verdict.next, { kind: 'style-guide-progress', done: 22, total: 22 });
  ok(late.next === verdict.next && late.topics.length === 0, 'style-guide-progress: a late reading after the verdict is dropped and invalidates nothing');
}
// Owner decision Q19 b: an agent's style guide keeps its table count; a reading of the other kind is dropped.
{
  const sg = step(init, { kind: 'agent-started', id: 's1', cmd: 'style-guide' }).next;
  const t = step(sg, { kind: 'agent-progress', id: 's1', phase: 'table', done: 6, total: 22 });
  ok(same(t.next.agentRun?.progress, { phase: 'table', done: 6, total: 22 }) && same(t.topics, ['host:progress']),
    'agent-progress: an agent style guide records its table count and invalidates host:progress');
  ok(step(sg, { kind: 'agent-progress', id: 's1', phase: 'build', done: 1, total: 2 }).next === sg, 'agent-progress: a build reading on a style-guide run is dropped');
  const bc = step(init, { kind: 'agent-started', id: 'b9', cmd: 'build-components' }).next;
  ok(step(bc, { kind: 'agent-progress', id: 'b9', phase: 'table', done: 1, total: 2 }).next === bc, 'agent-progress: a table reading on a build run is dropped');
}

// ---- the per-set build ledger (UI redesign S8.2, owner decisions G9 A and C1 A) ------------------------------
// The wire's `component-result` names no set, so the panel remembers the set it posted (`componentDef`) and the
// verdict that answers that build is recorded against it in `setBuilds`, in three states read off the verdict itself:
// `ok` (a clean build), `issues` (it ran to the end, `completed: true`, with misses), `failed` (it stopped before the
// set, `completed: false`). The expectations are literals: a set id typed here, the verdict's fields typed here.
//
// Mutations this fails by name: recording the verdict against nothing → `G9: a clean verdict for the panel's own build
// of 'tag' records tag → ok`; reading "failed" off `ok` alone → `C1: a build that ran to the end with misses records
// badge → issues, not failed`.
{
  const posted: HostSession = { ...init, componentState: 'pending', componentDef: 'tag' };
  const clean = step(posted, { kind: 'component-result', ok: true, completed: true, headline: '✓ built 45', summary: "set 'Tag'" });
  ok(same([...clean.next.setBuilds], [['tag', 'ok']]), `G9: a clean verdict for the panel's own build of 'tag' records tag → ok (${JSON.stringify([...clean.next.setBuilds])})`);
  ok(clean.next.componentDef === null, 'G9: the verdict clears the set the panel was building');
  const issues = step({ ...clean.next, componentState: 'pending', componentDef: 'badge' }, { kind: 'component-result', ok: false, completed: true, headline: '⚠ 20, 1 missed', summary: "set 'Badge'" });
  ok(same([...issues.next.setBuilds], [['tag', 'ok'], ['badge', 'issues']]), `C1: a build that ran to the end with misses records badge → issues, not failed, and keeps tag's (${JSON.stringify([...issues.next.setBuilds])})`);
  const failed = step({ ...issues.next, componentState: 'pending', componentDef: 'tag' }, { kind: 'component-result', ok: false, completed: false, headline: '✗ apply failed', summary: 'x' });
  ok(failed.next.setBuilds.get('tag') === 'failed' && failed.next.setBuilds.get('badge') === 'issues', `C1: a build that stopped before the set records tag → failed, replacing its clean result (${JSON.stringify([...failed.next.setBuilds])})`);
  // An agent's build (the panel posted nothing): its verdict names no set, so none is recorded.
  const agentRun = step(init, { kind: 'agent-started', id: 'b9', cmd: 'build-components' }).next;
  const byAgent = step(agentRun, { kind: 'component-result', ok: true, completed: true, headline: '✓ built 432', summary: "set 'Button'" });
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
  // #2879: the two new answers act on the brand session only, like the empty one.
  const reading = step(init, { kind: 'restore-input-reading' });
  ok(reading.next === init && reading.effect === 'readFile' && reading.topics.length === 0, 'restore-input-reading: no host state; asks for "Reading this file"');
  const lib = step(init, { kind: 'restore-input-library', library: { name: 'Product Library', versions: ['0.237.0'], instances: 3, bindings: 0 } });
  ok(lib.next === init && lib.effect === 'libraryHome' && lib.topics.length === 0, 'restore-input-library: no host state; asks for the library home');
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
  ok(same(started.next.agentRun, { id: 'a1', op: 'apply', cmd: 'apply-theme', settled: false, progress: null }) && started.next.applyState === null,
    'agent-started: an apply-theme run is recorded as the agent\'s, and the apply slot is left alone');
  ok(same(started.topics, ['host']) && started.effect === null, 'agent-started: invalidates host (the drawer)');
  const status = step(init, { kind: 'agent-started', id: 'a0', cmd: 'status' });
  ok(status.next === init && status.topics.length === 0, 'agent-started: a status command runs no operation, so nothing changes');
  const verdict = step(started.next, { kind: 'apply-result', ok: true, headline: 'H', summary: 'S' });
  ok(same(verdict.next.agentRun, { id: 'a1', op: 'apply', cmd: 'apply-theme', settled: true, progress: null }) && same(verdict.next.applyState, { ok: true, headline: 'H', summary: 'S' }),
    'agent run: the apply verdict settles the run and lands in the apply slot');
  const other = step(started.next, { kind: 'component-result', ok: true, completed: true, headline: 'H', summary: 'S' });
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

// ---- the update check (#2265) ------------------------------------------------------------------------------
// The dry run and the baseline capture are the components operation (they hold the build's guard), but their
// verdict is not a build's: it lands in its own slot, leaves the build's slot, set record and detail alone, and
// marks itself the operation's latest so the Activity row shows it.
{
  for (const cmd of ['update-components', 'capture-baseline', 'adopt-members']) {
    const run = step(init, { kind: 'agent-started', id: 'u1', cmd });
    ok(same(run.next.agentRun, { id: 'u1', op: 'components', cmd, settled: false, progress: null }),
      `agent-started: ${cmd} runs the components operation, and the run keeps its command`);
  }
  // #2265 PR 2 — an applied update keeps its own name, so the drawer reads it as updating, not checking.
  const confirmed = step(init, { kind: 'agent-started', id: 'u2', cmd: 'update-components', confirmed: true });
  ok(same(confirmed.next.agentRun, { id: 'u2', op: 'components', cmd: 'update-components:confirmed', settled: false, progress: null }),
    'agent-started: a confirmed update-components runs the components operation as update-components:confirmed');
  const built = { ...init, componentState: { ok: true, headline: '✓ built 432', summary: 's' }, componentLatest: 'build' as const, setBuilds: new Map([['button', 'ok' as const]]) };
  const run = step(built, { kind: 'agent-started', id: 'u1', cmd: 'update-components' }).next;
  const v = step(run, { kind: 'component-update-result', ok: true, headline: 'Would change 1 of 26', summary: 'button: …' });
  ok(same(plain(v.next), plain({ ...run, agentRun: { ...run.agentRun!, settled: true }, componentUpdate: { ok: true, headline: 'Would change 1 of 26', summary: 'button: …' }, componentLatest: 'update' })),
    'component-update-result: fills componentUpdate, marks it latest, settles the agent run, and leaves the build\'s slot and set record alone');
  ok(same(v.topics, ['host', 'host:components']) && v.effect === null, 'component-update-result: invalidates host and host:components (the Build control the run held busy)');
  // #2858: an Update's publish description reaches the slot the Activity drawer reads.
  const pub = step(run, { kind: 'component-update-result', ok: true, headline: '✓ updated 1 in place', summary: 's', lines: null, publish: 'Before Prism3 updated tag.' });
  ok(pub.next.componentUpdate !== null && pub.next.componentUpdate !== 'pending' && pub.next.componentUpdate.publish === 'Before Prism3 updated tag.', 'component-update-result: the publish description is kept on the verdict');
  const rebuilt = step({ ...v.next, componentState: 'pending' }, { kind: 'component-result', ok: true, completed: true, headline: 'H', summary: 'S' });
  ok(rebuilt.next.componentLatest === 'build' && same(rebuilt.next.componentUpdate, v.next.componentUpdate),
    'component-result after a check: the build is latest again, and the check\'s verdict is kept');
  ok(v.next.specsState === null, 'component-update-result: with no Draw specs out, Specs\' slot stays empty');
}

// ---- Documentation › Specs' Draw specs (#2830 Q2830.3 A) ------------------------------------------------
// Its verdict is the host's `component-update-result`, the agent's `draw-specs` one; a refusal is its result instead.
{
  const drawing = { ...init, specsState: 'pending' as const };
  const d = step(drawing, { kind: 'component-update-result', ok: true, headline: '✓ drew 2 spec panels', summary: 'Drew 2 of 2.', lines: ['Drew 2 of 2.'] });
  ok(same(d.next.specsState, { ok: true, headline: '✓ drew 2 spec panels', summary: 'Drew 2 of 2.', lines: ['Drew 2 of 2.'] }),
    'specs: the verdict that lands while Draw specs is out is Specs\' result');
  // Q713 A: the Specs row is its own; the verdict never reaches the components operation's slots (the Build set row).
  ok(d.next.componentLatest === null && d.next.componentUpdate === null,
    `specs/Q713 A: Draw specs' verdict is not the Build set row's (componentLatest ${d.next.componentLatest}, componentUpdate ${JSON.stringify(d.next.componentUpdate)})`);
  // An agent's `draw-specs` is the Specs operation: its run, and its verdict, are Specs', not the components row's.
  const ag = step(init, { kind: 'agent-started', id: 'a1', cmd: 'draw-specs' });
  ok(ag.next.agentRun?.op === 'specs', `specs/Q713 A: an agent's draw-specs runs the Specs operation (op ${ag.next.agentRun?.op})`);
  const agV = step(ag.next, { kind: 'component-update-result', ok: true, headline: '✓ drew 5 spec panels', summary: 'Drew 5 of 5.' });
  ok(agV.next.agentRun?.settled === true && agV.next.componentLatest === null && same(agV.next.specsState, { ok: true, headline: '✓ drew 5 spec panels', summary: 'Drew 5 of 5.', lines: undefined }),
    `specs/Q713 A: an agent's draw-specs verdict settles its run and is Specs' result, not the Build set row's (${JSON.stringify(agV.next.specsState)}, componentLatest ${agV.next.componentLatest})`);
  // The panel's build declined behind an agent's Draw specs (it holds the build's guard) leaves no build pending.
  const agB = step({ ...ag.next, componentState: 'pending' }, { kind: 'refused', code: 'busy', cmd: 'build-components', agent: false, message: 'Build set is already running.' });
  ok(agB.next.componentState === null, `specs/Q713 A: a panel build declined behind an agent's Draw specs is not left pending (${JSON.stringify(agB.next.componentState)})`);
  const r = step(drawing, { kind: 'refused', code: 'busy', cmd: 'build-components', agent: false, message: 'An agent is building.' });
  ok(same(r.next.specsState, { ok: false, headline: '✗ not drawn', summary: 'An agent is building.' }), 'specs: a refusal of the panel\'s Draw specs is its result, in the host\'s words');
  const a = step(drawing, { kind: 'refused', code: 'busy', cmd: 'build-components', agent: true, message: 'The panel is drawing.' });
  ok(a.next.specsState === 'pending', 'specs: an agent\'s refused command leaves the panel\'s Draw specs out');
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

// ---- the Build style guides page (UI redesign S11.2) ----------------------------------------------------------
{
  const cat = { setUp: true, collections: [], tables: [{ key: 'k', title: 'Text', kind: 'color' as const, page: 'Semantic tokens', rows: 2 }], notes: [] };
  const c = step(init, { kind: 'style-guide-catalog', catalog: cat, error: null });
  ok(same(c.next.styleGuideCatalog, { catalog: cat, error: null }) && same(c.topics, ['host:sgpage']), 'style-guide-catalog: lands in styleGuideCatalog and invalidates host:sgpage');
  const idle = step(init, { kind: 'style-guide-tables', tables: [{ key: 'a', title: 'Primary', page: 'Primitive tokens' }] });
  ok(idle.next === init && idle.topics.length === 0, 'style-guide-tables: ignored while the panel has no run pending (an agent\'s run is Activity\'s)');
  const pending: HostSession = { ...init, styleGuideState: 'pending' };
  const list = step(pending, { kind: 'style-guide-tables', tables: [{ key: 'a', title: 'Primary', page: 'Primitive tokens' }, { key: 'b', title: 'Text', page: 'Semantic tokens' }] });
  ok(same(list.next.styleGuideRun, { tables: [
    { key: 'a', title: 'Primary', page: 'Primitive tokens', status: 'waiting', reason: null },
    { key: 'b', title: 'Text', page: 'Semantic tokens', status: 'waiting', reason: null },
  ], stopped: null }) && same(list.topics, ['host:sgpage']), 'style-guide-tables: a pending run lists every table waiting');
  const d0 = step(list.next, { kind: 'style-guide-table', index: 0, status: 'drawing', reason: null });
  const f0 = step(d0.next, { kind: 'style-guide-table', index: 0, status: 'failed', reason: 'Accent refused' });
  const d1 = step(f0.next, { kind: 'style-guide-table', index: 1, status: 'done', reason: null });
  ok(same(d1.next.styleGuideRun?.tables.map((t) => `${t.status}:${t.reason}`), ['failed:Accent refused', 'done:null']) && same(f0.topics, ['host:sgpage']),
    'style-guide-table: each move lands on its row, a failure with its reason');
  ok(step(d1.next, { kind: 'style-guide-table', index: 2, status: 'done', reason: null }).next === d1.next, 'style-guide-table: an index past the list is dropped');
  const res = step(d1.next, { kind: 'style-guide-result', ok: true, headline: '✓ style guide: 1 table', summary: 's', stopped: { done: 1, total: 2 } });
  ok(same(res.next.styleGuideRun?.stopped, { done: 1, total: 2 }) && res.next.styleGuideRun?.tables.length === 2,
    'style-guide-result: the run is kept after the verdict, with where Cancel stopped it');
  ok(step(res.next, { kind: 'style-guide-table', index: 0, status: 'done', reason: null }).next === res.next, 'style-guide-table: a move after the verdict is dropped');
}

// ---- the cleanup offer (Q412 A, #2816) ---------------------------------------------------------------------
// A run's verdict carries the offer; a confirmed cleanup drops what it removed, by id, and keeps what it left. A new
// run's verdict replaces the offer and clears the last cleanup's sentence.
{
  const offered = step({ ...init, styleGuideState: 'pending', styleGuideCleanup: { ok: true, summary: 'old' } },
    { kind: 'style-guide-result', ok: true, headline: 'H', summary: 'S', lines: null, retired: [{ id: '1:1', name: 'Style guide — Inverse' }, { id: '1:2', name: 'Style guide — Inverse' }] });
  ok(same(offered.next.styleGuideRetired, [{ id: '1:1', name: 'Style guide — Inverse' }, { id: '1:2', name: 'Style guide — Inverse' }]) && offered.next.styleGuideCleanup === null,
    'style-guide-result: the run\'s cleanup offer is kept, and the last cleanup\'s sentence goes');
  const cleaned = step({ ...offered.next, styleGuideCleanup: 'pending' }, { kind: 'style-guide-cleanup-result', ok: false, removed: ['1:1'], summary: '1 table removed' });
  ok(same(cleaned.next.styleGuideRetired, [{ id: '1:2', name: 'Style guide — Inverse' }]) && same(cleaned.next.styleGuideCleanup, { ok: false, summary: '1 table removed' })
    && same(cleaned.topics, ['host:sgpage']),
    'style-guide-cleanup-result: a removed table leaves the offer by id (a copy of the same name stays), its sentence is kept, and the page repaints');
}

{
  // #2909: the file's Documentation settings land in their own slot and move only the Documentation area's topic.
  const d = step(init, { kind: 'doc-settings', panels: false, cover: true, styleGuide: { view: null }, error: null });
  ok(same(d.next.docSettings, { panels: false, cover: true, styleGuide: { view: null }, error: null }), 'doc-settings: the switches and the style-guide record land in the slot');
  ok(same(d.topics, ['host:docs']), 'doc-settings: only host:docs is invalidated');
}
{
  // #2909: Update file's checklist read lands in its own slot and moves only the overlay's topic.
  const due = { button: { state: 'due', reason: 'definition' } } as const;
  const f = step(init, { kind: 'file-sets', present: ['button'], setUp: true, error: null, due });
  ok(same(f.next.fileSets, { present: ['button'], setUp: true, error: null, due }), 'file-sets: the sets present, the setup state and the ledger\'s due land in the slot');
  // #2909 Q2909.8 A: the statuses on Components' list follow it too.
  ok(same(f.topics, ['host:update', 'host:components']), 'file-sets: only host:update and host:components are invalidated');
  // The main thread starts the hand-edit pass after its first answer at load; the pass is out from here, once.
  ok(f.next.handPass === 'running', 'Q2909.8 A: the first file-sets starts the hand-edit pass (handPass running)');
  const done = step({ ...f.next, handPass: 'done' }, { kind: 'file-sets', present: ['button'], setUp: true, error: null, due });
  ok(done.next.handPass === 'done', 'Q2909.8 A: a later file-sets leaves a finished pass finished');
  // #3110: the answer at open, from the ledger alone, lands as partial, starts the pass, and never replaces a full read.
  const part = step(init, { kind: 'file-sets', present: ['button'], setUp: false, error: null, due, partial: true, atOpen: true });
  ok(part.next.fileSets?.partial === true && part.next.handPass === 'running', '#3110: the answer at open lands marked partial and starts the hand-edit pass');
  const late = step(f.next, { kind: 'file-sets', present: [], setUp: false, error: null, due: {}, partial: true, atOpen: true });
  ok(same(late.next.fileSets, f.next.fileSets), '#3110: an answer at open arriving after a full read leaves the full read in place');
  const full = step(part.next, { kind: 'file-sets', present: ['button'], setUp: true, error: null, due });
  ok(full.next.fileSets?.partial === undefined && full.next.fileSets?.setUp === true, '#3110: the full read replaces the answer at open');
  // The host's full read after open yields, so the checklist's own answer (under the panel's brand) can land first. The
  // later read after open, under the stored brand, must not replace it.
  const openFull = step(f.next, { kind: 'file-sets', present: [], setUp: true, error: null, due: {}, atOpen: true });
  ok(same(openFull.next.fileSets, f.next.fileSets), '#3110: the host\'s read after open, landing after an answer the panel asked for, leaves that answer in place');
  const atOpenFull = step(part.next, { kind: 'file-sets', present: ['button'], setUp: true, error: null, due, atOpen: true });
  ok(atOpenFull.next.fileSets?.partial === undefined && atOpenFull.next.fileSets?.atOpen === true, '#3110: the host\'s full read after open replaces its ledger answer');
  const bad = step(init, { kind: 'file-sets', present: [], setUp: false, error: 'boom', due: {} });
  ok(bad.next.handPass === 'idle', 'Q2909.8 A: a file-sets that could not read the file starts no pass');
  // Each set's hand edits land as they come, one by one, and the pass's end marks it done.
  const h1 = step(f.next, { kind: 'hand-edits', def: 'button', members: 648, edited: 2 });
  const h2 = step(h1.next, { kind: 'hand-edits', def: 'tag', members: 24, edited: 0 });
  ok(same([...h2.next.handEdits], [['button', { members: 648, edited: 2 }], ['tag', { members: 24, edited: 0 }]]), 'Q2909.8 A: hand-edits: each set\'s answer lands beside the ones before it');
  ok(same(h1.topics, ['host:update', 'host:components']), 'Q2909.8 A: hand-edits invalidates host:update and host:components');
  const hd = step(h2.next, { kind: 'hand-edits-done' });
  ok(hd.next.handPass === 'done' && hd.next.handEdits.size === 2, 'Q2909.8 A: hand-edits-done ends the pass and keeps its answers');
  const set = { def: 'button', hash: 'h', members: 648, update: 12, add: 0, drop: 0, handEdited: 2, noBaseline: 0, blocked: false, upToDate: false };
  const c = step({ ...init, updateCheck: 'pending' }, { kind: 'update-check', previewHash: 'abc', sets: [set], missing: [], error: null });
  ok(same(c.next.updateCheck, { previewHash: 'abc', sets: [set], missing: [], error: null }), 'Q2909.8 A: update-check: the scoped check\'s answer replaces pending');
  ok(same(c.topics, ['host:update']), 'Q2909.8 A: update-check invalidates only host:update');
}
for (const k of KINDS) ok(exercised.has(k), `coverage: ${k} was exercised`);

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
