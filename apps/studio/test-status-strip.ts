/**
 * THE STATUS STRIP'S RULES (#3170 part 2, the owner's Q3170.1–6, all A), in Node: `state/status-strip.ts`.
 *
 *   npx tsx apps/studio/test-status-strip.ts
 *
 * What the strip may say, from the readings the host posts and the panel's own clock. The drawn strip is held in
 * `test:chrome` (section 3170); here are its words and its rules, each a literal typed from the owner's decisions and the
 * wireframe (docs/34: the expected strings are not read from `STRIP_COPY`).
 *   read/…     the read after open: "Reading this file…", indeterminate until the first page, then "page n of N" (Q3170.1 A).
 *   run/…      the update: checking (no count, no fill, #3177), then "Updating <set>", n of N, a bar by sets done and the
 *              elapsed time; Apply Theme by its seven stages; the build queue by its sets (Q3170.2 A).
 *   still/…    "Still working on <set>" after 3 s with no reading, and not before (Q3170.5 A).
 *   stop/…     "Stop after <set>", and "Stopping after <set>…" once asked (Q3170.4 A).
 *   rows/…     a due row reads Updating while its set is written, Updated once passed, nothing before (Q3170.2 A).
 *   verdict/…  the line the run leaves: done with its time, stopped after a set with what it kept, stopped at a set with
 *              its cause (Q3170.6 A).
 *   order/…    a run wins over the read after open, which wins over a verdict.
 *   agent/…    #3189: an agent's Capture baseline or Adopt, in its Activity words: indeterminate while it reads the file,
 *              then n of N defs and a bar by defs done; no Stop, no clock. A panel run wins over it; it wins over the read.
 * #3189 mutations, each failing by name: the agent's reading dropped from `stripView` → `agent/check`, `agent/work`;
 * its fill counted from the def reached (`done + 1`) → `agent/work`; the read after open winning over it → `order/agent`.
 *
 * Mutations, each failing by name: the silence test dropped (`still` always null) → `still/after 3 s`; the fill counted
 * from the set being written (`done + 1`) → `run/fill`; the check given a count → `run/check`; `rowState` reading every
 * seen set Updated → `rows/updating`; `stripVerdict` reading a stop the person asked for as a failure → `verdict/stopped`.
 */
import { elapsed, heard, rowState, startStripRun, stepEnded, stripVerdict, stripView, withReading, type StripRun } from './src/state/status-strip';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const J = JSON.stringify;
const NAMES: Record<string, string> = { button: 'Button', checkbox: 'Checkbox', tag: 'Tag' };
const nameOf = (id: string): string => NAMES[id] ?? id;
const T0 = 1_000_000;

console.log('The status strip (#3170 part 2)');

// ── the read after open ──
{
  const v0 = stripView({ read: { done: 0, total: 60 }, run: null, step: null, verdict: null, now: T0, nameOf });
  ok(v0.kind === 'reading' && v0.what === 'Reading this file…' && v0.n === null && v0.fill === null, `read/start: "Reading this file…", indeterminate, no count (${J(v0)})`);
  const v = stripView({ read: { done: 24, total: 60 }, run: null, step: null, verdict: null, now: T0, nameOf });
  ok(v.kind === 'reading' && v.n === 'page 24 of 60' && v.fill === 0.4 && v.sub === 'The panel works meanwhile. Counts may still change.', `read/pages: "page 24 of 60", filled 0.4 (${J(v)})`);
  ok(stripView({ read: null, run: null, step: null, verdict: null, now: T0, nameOf }).kind === 'idle', 'read/idle: no read and no run, the strip is hidden');
}

// ── the update ──
const step = { step: 'update' as const, stopping: false, queue: null };
let r: StripRun = startStripRun(T0);
r = withReading(r, { run: 'update', phase: 'check', item: null, done: 0, total: 12 }, T0 + 500);
{
  const v = stripView({ read: null, run: r, step, verdict: null, now: T0 + 1000, nameOf });
  ok(v.kind === 'running' && v.what === 'Checking 12 sets before writing' && v.n === '0:01' && v.fill === null && v.stop.label === 'Stop after the check',
    `run/check: before the first write, the check with no count and no fill (#3177) (${J(v)})`);
}
r = withReading(r, { run: 'update', phase: 'work', item: 'button', done: 0, total: 12 }, T0 + 2000);
r = withReading(r, { run: 'update', phase: 'work', item: 'checkbox', done: 4, total: 12 }, T0 + 41_000);
{
  const v = stripView({ read: null, run: r, step, verdict: null, now: T0 + 41_500, nameOf });
  ok(v.kind === 'running' && v.what === 'Updating Checkbox' && v.n === '5 of 12 · 0:41', `run/set: "Updating Checkbox", "5 of 12 · 0:41" (${J(v)})`);
  ok(v.kind === 'running' && Math.abs((v.fill ?? -1) - 4 / 12) < 1e-9, `run/fill: the bar by sets done, 4 of 12 (${v.kind === 'running' ? v.fill : null})`);
  ok(v.kind === 'running' && v.stop.label === 'Stop after Checkbox' && !v.stop.disabled, `stop/label: "Stop after Checkbox" (${v.kind === 'running' ? J(v.stop) : ''})`);
  ok(v.kind === 'running' && v.still === null, 'still/not yet: heard from 0.5 s ago, no "Still working"');
  const late = stripView({ read: null, run: r, step, verdict: null, now: T0 + 44_000, nameOf });
  ok(late.kind === 'running' && late.still === 'Still working on Checkbox', `still/after 3 s: "Still working on Checkbox" (${late.kind === 'running' ? late.still : null})`);
  const early = stripView({ read: null, run: r, step, verdict: null, now: T0 + 43_999, nameOf });
  ok(early.kind === 'running' && early.still === null, 'still/after 3 s: not at 2.999 s');
  const back = stripView({ read: null, run: heard(r, T0 + 44_000), step, verdict: null, now: T0 + 44_500, nameOf });
  ok(back.kind === 'running' && back.still === null, 'still/heard: a message from the run clears it');
  const stopping = stripView({ read: null, run: r, step: { ...step, stopping: true }, verdict: null, now: T0 + 41_500, nameOf });
  ok(stopping.kind === 'running' && stopping.stop.label === 'Stopping after Checkbox…' && stopping.stop.disabled, `stop/asked: "Stopping after Checkbox…", off (${stopping.kind === 'running' ? J(stopping.stop) : ''})`);
  ok(rowState(r, 'button') === 'updated' && rowState(r, 'checkbox') === 'updating' && rowState(r, 'tag') === null,
    `rows/updating: Button Updated, Checkbox Updating, Tag not reached (${J([rowState(r, 'button'), rowState(r, 'checkbox'), rowState(r, 'tag')])})`);
  ok(stripView({ read: { done: 3, total: 60 }, run: r, step, verdict: { tone: 'ok', what: 'x', n: 'y', sub: 'z' }, now: T0, nameOf }).kind === 'running', 'order/run: a run wins over the read after open and a verdict');
  ok(stripView({ read: { done: 3, total: 60 }, run: null, step: null, verdict: { tone: 'ok', what: 'x', n: 'y', sub: 'z' }, now: T0, nameOf }).kind === 'reading', 'order/read: the read after open wins over a verdict');
}
{
  const fin = withReading(r, { run: 'update', phase: 'finish', item: null, done: 12, total: 12 }, T0 + 100_000);
  const v = stripView({ read: null, run: fin, step, verdict: null, now: T0 + 100_000, nameOf });
  ok(v.kind === 'running' && v.what === 'Finishing the update' && v.n === '12 of 12 · 1:40' && v.fill === 1, `run/finish: "Finishing the update", "12 of 12" (${J(v)})`);
  ok(rowState(fin, 'checkbox') === 'updated', 'rows/updated: every set the update reached reads Updated once it finishes');
  const ended = stepEnded(fin, T0 + 112_000);
  const line = stripVerdict({ results: [{ step: 'update', ok: true, headline: '✓ updated 300 in place' }], steps: ['update'], stopped: false, run: ended, now: T0 + 112_000, nameOf });
  ok(J(line) === J({ tone: 'ok', what: '12 sets updated', n: '1:52', sub: 'Details in Activity.' }), `verdict/done: "12 sets updated · 1:52" (${J(line)})`);
}

// ── the stop the person asked for, and a failure ──
{
  let s: StripRun = startStripRun(T0);
  for (const [i, id] of ['button', 'checkbox', 'tag'].entries()) s = withReading(s, { run: 'update', phase: 'work', item: id, done: i, total: 12 }, T0 + i);
  const halted = stepEnded(withReading(s, { run: 'update', phase: 'finish', item: null, done: 3, total: 12 }, T0 + 5), T0 + 6);
  const v = stripVerdict({ results: [{ step: 'update', ok: false, headline: '⚠ stopped after tag: 3 of 12 sets updated' }], steps: ['update', 'guides'], stopped: true, run: halted, now: T0 + 60_000, nameOf });
  ok(J(v) === J({ tone: 'warn', what: 'Stopped after Tag', n: '3 of 12 updated', sub: 'The 3 sets updated keep their changes; the other 9 are unchanged. Details in Activity.' }),
    `verdict/stopped: "Stopped after Tag · 3 of 12 updated", what it kept (${J(v)})`);
  const failedRun = stepEnded(s, T0 + 6);
  const f = stripVerdict({ results: [{ step: 'update', ok: false, headline: '✗ update stopped at tag' }], steps: ['update'], stopped: false, run: failedRun, now: T0 + 60_000, nameOf });
  ok(J(f) === J({ tone: 'bad', what: 'Stopped at Tag', n: '2 of 12 updated', sub: 'update stopped at tag. The 2 sets updated keep their changes; the other 10 are unchanged. Details in Activity.' }),
    `verdict/failed: "Stopped at Tag · 2 of 12 updated", with the host's cause (${J(f)})`);
  const theme = stripVerdict({ results: [{ step: 'theme', ok: true, headline: '✓ applied' }], steps: ['theme', 'update'], stopped: true, run: stepEnded(startStripRun(T0), T0), now: T0 + 14_000, nameOf });
  ok(J(theme) === J({ tone: 'warn', what: 'Stopped after Theme', n: '0:14', sub: 'Details in Activity.' }), `verdict/stopped step: "Stopped after Theme" (${J(theme)})`);
  const two = stripVerdict({ results: [{ step: 'theme', ok: true, headline: '✓' }, { step: 'guides', ok: true, headline: '✓' }], steps: ['theme', 'guides'], stopped: false, run: startStripRun(T0), now: T0 + 75_000, nameOf });
  const late = stripVerdict({ results: [{ step: 'update', ok: true, headline: '✓' }], steps: ['update'], stopped: true, run: stepEnded(withReading(s, { run: 'update', phase: 'finish', item: null, done: 12, total: 12 }, T0), T0), now: T0 + 1000, nameOf });
  ok(late.tone === 'ok' && late.what === '12 sets updated', `verdict/stop too late: a Stop that came after the last set reads as the run done (${J(late)})`);
  ok(J(two) === J({ tone: 'ok', what: 'File updated', n: '1:15', sub: 'Theme applied, Style guides drawn. Details in Activity.' }), `verdict/steps: "File updated", each step said (${J(two)})`);
}

// ── Apply Theme and the build queue ──
{
  const a = withReading(startStripRun(T0), { run: 'apply-theme', phase: 'work', item: 'color', done: 1, total: 7 }, T0);
  const v = stripView({ read: null, run: a, step: { step: 'theme', stopping: false, queue: null }, verdict: null, now: T0 + 12_000, nameOf });
  ok(v.kind === 'running' && v.what === 'Writing color variables' && v.n === '2 of 7 · 0:12' && Math.abs((v.fill ?? 0) - 1 / 7) < 1e-9 && v.stop.label === 'Stop after Theme',
    `run/theme: "Writing color variables", "2 of 7", by stages done (${J(v)})`);
  const late = stripView({ read: null, run: a, step: { step: 'theme', stopping: false, queue: null }, verdict: null, now: T0 + 3_000, nameOf });
  ok(late.kind === 'running' && late.still === 'Still working on color variables', `still/theme: "Still working on color variables" (${late.kind === 'running' ? late.still : null})`);
  const q = stripView({ read: null, run: startStripRun(T0), step: { step: 'sets', stopping: false, queue: { id: 'tag', at: 3, of: 7 } }, verdict: null, now: T0, nameOf });
  ok(q.kind === 'running' && q.what === 'Adding Tag' && q.n === '3 of 7 · 0:00' && q.stop.label === 'Stop after Tag', `run/sets: "Adding Tag", "3 of 7" (${J(q)})`);
  ok(elapsed(3_723_000) === '62:03' && elapsed(-5) === '0:00', 'elapsed: m:ss, never negative');
}

// ── an agent's Capture baseline and Adopt (#3189) ──
{
  const at = (agent: Parameters<typeof stripView>[0]['agent'], read: { done: number; total: number } | null = null) => stripView({ read, agent, run: null, step: null, verdict: null, now: T0, nameOf });
  const c = at({ run: 'capture', phase: 'check', done: 0, total: 60 });
  ok(J(c) === J({ kind: 'reading', what: 'Recording the sets as built…', n: null, fill: null, sub: 'An agent runs this. Details in Activity.' }),
    `agent/check: while it reads the file, its Activity words, no count, indeterminate (${J(c)})`);
  const w = at({ run: 'adopt', phase: 'work', done: 15, total: 60 });
  ok(J(w) === J({ kind: 'reading', what: 'Adopting members…', n: '16 of 60', fill: 0.25, sub: 'An agent runs this. Details in Activity.' }),
    `agent/work: "Adopting members…", "16 of 60", the bar by defs done (${J(w)})`);
  const f = at({ run: 'capture', phase: 'finish', done: 60, total: 60 });
  ok(f.kind === 'reading' && f.n === '60 of 60' && f.fill === 1, `agent/finish: every def done, the bar full (${J(f)})`);
  ok(at({ run: 'capture', phase: 'work', done: 3, total: 60 }, { done: 10, total: 60 }).kind === 'reading' && (at({ run: 'capture', phase: 'work', done: 3, total: 60 }, { done: 10, total: 60 }) as { what: string }).what === 'Recording the sets as built…',
    'order/agent: an agent\'s run wins over the read after open');
  ok(stripView({ read: null, agent: { run: 'adopt', phase: 'work', done: 1, total: 2 }, run: r, step, verdict: null, now: T0, nameOf }).kind === 'running', 'order/agent-run: a panel run wins over an agent\'s');
  ok(at(null).kind === 'idle', 'agent/none: no agent run, no read, no verdict: the strip is hidden');
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
