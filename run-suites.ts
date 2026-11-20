/**
 * run-suites.ts — runs an app's unit-test chain and holds each suite to an AUTHORED assertion floor
 * (#1066 M23, docs/34 shape 9: a printed count nothing asserts).
 *
 *   npx tsx ../../run-suites.ts            (cwd = the app; `npm run -w @prism3/<app> test` does this)
 *   npx tsx ../../run-suites.ts --self-test
 *
 * WHY THIS EXISTS. Each suite ends by printing how many assertions it executed, and nothing read the
 * number. Neutering a suite's `ok()` (an early return) left `✅ ALL PASS — 0 assertions executed` at
 * exit 0, and the `&&` chain in `package.json` — which trusts exit codes, by design — reported the
 * studio-test row PASS. The engine suites got floors in #659; the app suites never did. This runner is
 * the app half.
 *
 * WHAT IT ASSERTS, per suite named in the app's `suites.json`:
 *   1. it exits 0;
 *   2. its LAST stdout line reports an executed-assertion count (a suite that prints none fails by
 *      name — a count it does not print is a count nothing can hold);
 *   3. that count is at or above the floor written beside its name.
 * And over the app directory:
 *   4. every `test-*.ts` file is REPRESENTED — listed as a suite, or listed under `elsewhere` with the
 *      place it runs instead — and every listed file exists. A suite dropped from the chain used to
 *      vanish silently; now it fails by name.
 *
 * INDEPENDENCE (docs/34). The floor is a number a person wrote, in `suites.json`; the count is what the
 * suite measured at run time. Neither is derived from the other, and `--accept`-style regeneration is
 * deliberately absent: a gate allowed to rewrite what it reads has no memory (CLAUDE.md principle 5).
 * A floor moves only by hand, in the PR whose diff explains why the suite shrank.
 *
 * ITS LIMIT, stated because a misread scope is worse than none: a floor catches a COLLAPSE and a
 * shrink, never a swap — deleting one arm while adding another of equal size passes. It also trusts the
 * suite's own counter to be incremented where assertions happen; the mutation it was built for (#1066's
 * neutered `ok()`) is exactly that counter going to zero. Which NAMED arm still runs is #1834's
 * question, not this one's.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface SuiteTable {
  /** In run order. `floor` is the minimum executed-assertion count the suite must report. */
  readonly suites: ReadonlyArray<{ readonly file: string; readonly floor: number }>;
  /** `test-*.ts` files in the directory that run somewhere else, each with where. */
  readonly elsewhere: Readonly<Record<string, string>>;
}

/** The executed count a suite's summary line reports, or null when it reports none.
 *  Read from the LAST non-empty stdout line only, so an assertion label such as "3 of 29 reached"
 *  earlier in the output can never be mistaken for the total. */
export const countOf = (stdout: string): number | null => {
  const last = stdout.split('\n').map((l) => l.trim()).filter(Boolean).at(-1) ?? '';
  const m = /(\d+) assertions? executed/.exec(last) ?? /(?:^|\D)\d+\/(\d+)\b/.exec(last) ?? /\b\d+ of (\d+)\b/.exec(last);
  return m ? Number(m[1]) : null;
};

/** Representation: every `test-*.ts` in the directory is listed exactly once, and every listed file exists. */
export const tableDefects = (table: SuiteTable, files: readonly string[]): string[] => {
  const out: string[] = [];
  const listed = [...table.suites.map((s) => s.file), ...Object.keys(table.elsewhere)];
  for (const f of files.filter((f) => /^test-.*\.ts$/.test(f))) {
    if (!listed.includes(f)) out.push(`${f}: a test file this table does not list — add it as a suite with a floor, or under "elsewhere" with where it runs`);
  }
  const seen = new Set<string>();
  for (const f of listed) {
    if (seen.has(f)) out.push(`${f}: listed twice`);
    seen.add(f);
    if (!files.includes(f)) out.push(`${f}: listed, but no such file`);
  }
  for (const s of table.suites) {
    if (!Number.isInteger(s.floor) || s.floor < 1) out.push(`${s.file}: floor ${s.floor} — a floor below 1 certifies a suite that ran nothing`);
  }
  return out;
};

/** One suite's verdict from its exit status and output. */
export const verdictOf = (file: string, floor: number, status: number | null, stdout: string): string | null => {
  if (status !== 0) return `${file}: exited ${status}`;
  const n = countOf(stdout);
  if (n === null) return `${file}: its last line reports no executed-assertion count, so nothing can hold it to its floor of ${floor}`;
  if (n < floor) return `${file}: ${n} assertions executed, below its floor of ${floor} — the suite shrank or collapsed. If deliberate, lower the floor in suites.json and say why.`;
  return null;
};

const selfTest = (): number => {
  let bad = 0;
  const expect = (cond: boolean, label: string): void => { if (!cond) { bad++; console.error(`  ✗ ${label}`); } else console.log(`  ✓ ${label}`); };
  expect(countOf('x\n\n✅ ALL PASS — 33 assertions executed\n') === 33, 'reads "— N assertions executed"');
  expect(countOf('\n460/460 name cascade assertions passed.\n') === 460, 'reads "P/N … passed"');
  expect(countOf('\n✗ 2 of 41 failed') === 41, 'reads "F of N failed"');
  expect(countOf('  ✓ 3 of 29 reached\nall passed') === null, 'an earlier line\'s "3 of 29" is never the total');
  expect(countOf('') === null, 'no output, no count');
  expect(verdictOf('t.ts', 5, 0, '✅ ALL PASS — 0 assertions executed')?.includes('below its floor') === true, '#1066 M23: "ALL PASS — 0 assertions executed" at exit 0 fails by name');
  expect(verdictOf('t.ts', 5, 0, '✅ ALL PASS — 5 assertions executed') === null, 'a count at the floor passes');
  expect(verdictOf('t.ts', 5, 1, '✅ ALL PASS — 9 assertions executed')?.includes('exited 1') === true, 'a non-zero exit fails whatever it prints');
  expect(verdictOf('t.ts', 5, 0, 'all passed')?.includes('reports no') === true, 'a suite that prints no count fails');
  const t: SuiteTable = { suites: [{ file: 'test-a.ts', floor: 1 }], elsewhere: { 'test-b.ts': 'its own step' } };
  expect(tableDefects(t, ['test-a.ts', 'test-b.ts', 'other.ts']).length === 0, 'a table that lists every test file is clean');
  expect(tableDefects(t, ['test-a.ts', 'test-b.ts', 'test-c.ts'])[0]?.startsWith('test-c.ts: a test file this table does not list') === true, 'an unlisted test file fails by name');
  expect(tableDefects(t, ['test-a.ts'])[0]?.startsWith('test-b.ts: listed, but no such file') === true, 'a listed file that is gone fails by name');
  expect(tableDefects({ suites: [{ file: 'test-a.ts', floor: 0 }], elsewhere: {} }, ['test-a.ts']).length === 1, 'a floor of 0 is refused');
  console.log(bad ? `\n✗ run-suites self-test: ${bad} failed` : '\n✓ run-suites self-test: all passed');
  return bad ? 1 : 0;
};

if (process.argv.includes('--self-test')) process.exit(selfTest());

const dir = process.cwd();
const tablePath = join(dir, 'suites.json');
if (!existsSync(tablePath)) { console.error(`✗ no suites.json in ${dir}`); process.exit(1); }
const table = JSON.parse(readFileSync(tablePath, 'utf8')) as SuiteTable;
const failures = tableDefects(table, readdirSync(dir));
// "Runs elsewhere" is a claim too: each such file must be named by another script of this package, or
// the `elsewhere` list is just a quieter way to drop a suite.
const scripts = (JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }).scripts ?? {};
for (const f of Object.keys(table.elsewhere)) {
  if (!Object.entries(scripts).some(([k, v]) => k !== 'test' && v.includes(f))) failures.push(`${f}: listed as running elsewhere, but no other script in package.json names it`);
}
const rows: string[] = [];
for (const { file, floor } of table.suites) {
  if (!existsSync(resolve(dir, file))) continue; // already named by tableDefects
  console.log(`\n▶ ${file}`);
  const r = spawnSync('npx', ['tsx', file], { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 30 });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  const v = verdictOf(file, floor, r.status, r.stdout ?? '');
  rows.push(`  ${v ? '✗' : '✓'} ${file.padEnd(34)} ${String(countOf(r.stdout ?? '') ?? '—').padStart(5)} ≥ ${floor}`);
  if (v) failures.push(v);
}
console.log(`\n=== suites (${dir.split('/').at(-1)}): executed vs floor ===\n${rows.join('\n')}`);
if (failures.length) {
  console.error(`\n✗ ${failures.length} suite defect(s):\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  process.exit(1);
}
console.log(`\n✓ ${table.suites.length} suites, each at or above its floor; every test-*.ts accounted for`);
