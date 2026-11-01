/**
 * `test:chrome-shards` — THE CHROME SHARDS RAN EVERY SECTION EXACTLY ONCE (#2898).
 *
 *   npm run -w @prism3/studio test:chrome-shards
 *
 * Run after `test:chrome`, which writes its record to `apps/studio/chrome-record/`: `all.json` for the whole suite (a
 * bare local run, `npm run verify -- --unsharded`), `shard-<n>.json` for each shard (`CHROME_SHARD=<n>`: the `chrome`
 * job's matrix in CI, and `npm run verify` by default since #3216).
 *
 * WHY. Since #2898 CI runs the chrome suite as parallel shards, each running the sections `chrome-shards.mjs` gives it.
 * A section that map leaves out runs nowhere and fails nothing, and a section it gives two shards runs twice: both
 * read green. So this holds what the shards RAN against what the suite HAS, and fails by name:
 *   · `section "<id>" ran in no shard`, for a section the suite has and no record ran: left out of the map, or its
 *     shard did not report (crashed, cancelled, or missing from the matrix, so no record arrived);
 *   · `section "<id>" ran in 2 runs (shard 1, shard 3)`;
 *   · a record that ran a section the suite does not list, an assertion made outside every section, or a shard that
 *     ran the end-of-run checks, which read the whole sweep and so run once (below).
 * Then, over shard records, it runs those end-of-run checks once (`test-chrome.mjs --merge`): the check boxes measured
 * on each host and theme (#2238) and every hook the suite names rendered somewhere, over what all the shards saw.
 * Over a whole run's record they ran in that run, and this says so.
 *
 * INDEPENDENT OF THE SHARD MAP (docs/34). The expected list is the UNSHARDED suite's own: `test-chrome.mjs --list`
 * walks the whole suite, every section's guard reached and none run, and prints the section ids it met. The actual
 * side is what each record says ran, written by the run as it happened. `chrome-shards.mjs` is read by neither, so a
 * map edited wrong cannot agree with itself here. (Mutations, each failing by name: a section dropped from every shard
 * → `section "<id>" ran in no shard`; a section given two shards → `section "<id>" ran in 2 runs (shard 1, shard 2)`.)
 *
 * A section is the unit, and that is what makes "every assertion exactly once" checkable without a stored list of
 * assertions: each assertion runs inside one section (an assertion outside every section fails here), and the
 * sections do not depend on one another, so a section run once makes each of its assertions once. That the sharding
 * keeps every assertion was measured once, before and after, by `compare-chrome-assertions.mjs` (#2898).
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const RECORD_DIR = join(HERE, 'chrome-record');
/** The suite had 65 sections with a body when this gate was written. A literal floor, so a `--list` that stopped
 *  reaching the guards cannot pass by expecting nothing. */
const SECTION_FLOOR = 60;
/** Not sections: the end-of-run checks, and an assertion made outside every section. */
const END = 'end';
const UNSECTIONED = 'unsectioned';

const problems = [];

// THE EXPECTED LIST: the unsharded suite's sections.
const listed = spawnSync(process.execPath, [join(HERE, 'test-chrome.mjs'), '--list'], { encoding: 'utf8', env: { ...process.env, CHROME_SHARD: '' } });
const line = (listed.stdout ?? '').split('\n').find((l) => l.startsWith('SECTIONS '));
if (listed.status !== 0 || !line) {
  console.error(`✗ test-chrome.mjs --list did not report its sections (exit ${listed.status}):\n${listed.stderr || listed.stdout}`);
  process.exit(1);
}
const expected = JSON.parse(line.slice('SECTIONS '.length));
if (expected.length < SECTION_FLOOR) problems.push(`test-chrome.mjs --list reports ${expected.length} section(s), under the floor of ${SECTION_FLOOR}: the list has stopped reaching the suite's guards`);
if (new Set(expected).size !== expected.length) problems.push(`test-chrome.mjs --list reports a section id twice: ${expected.filter((id, i) => expected.indexOf(id) !== i).join(', ')}`);

// THE ACTUAL SIDE: every run's record.
let files = [];
try { files = readdirSync(RECORD_DIR).filter((f) => f === 'all.json' || /^shard-.+\.json$/.test(f)).sort(); } catch {}
if (!files.length) {
  console.error(`✗ no chrome record in ${relative(REPO, RECORD_DIR)}/: run \`npm run -w @prism3/studio test:chrome\` (or each shard) first.`);
  process.exit(1);
}
const records = files.map((f) => ({ file: f, ...JSON.parse(readFileSync(join(RECORD_DIR, f), 'utf8')) }));
const whole = records.filter((r) => r.run === 'all');
if (whole.length && records.length > 1) problems.push(`${relative(REPO, RECORD_DIR)}/ holds a whole run's record beside shard records (${files.join(', ')}): one of them is stale`);

const ranIn = new Map(expected.map((id) => [id, []]));
for (const r of records) {
  for (const s of r.sections) {
    if (s.id === END) {
      if (r.run !== 'all' && s.assertions.length) problems.push(`${r.run} ran ${s.assertions.length} end-of-run check(s), which read the whole sweep and run once, in --merge: ${s.assertions[0]}`);
      continue;
    }
    if (s.id === UNSECTIONED) {
      if (s.assertions.length) problems.push(`${r.run} made ${s.assertions.length} assertion(s) outside every section, which would run in every shard: ${s.assertions[0]}`);
      continue;
    }
    if (!ranIn.has(s.id)) { problems.push(`${r.run} ran section "${s.id}", which the unsharded suite does not list`); continue; }
    ranIn.get(s.id).push(r.run);
  }
}
for (const [id, runs] of ranIn) {
  if (runs.length === 0) problems.push(`section "${id}" ran in no shard`);
  else if (runs.length > 1) problems.push(`section "${id}" ran in ${runs.length} runs (${runs.join(', ')})`);
}

console.log(`\nChrome shards — every section exactly once (#2898)\n${'='.repeat(78)}`);
for (const r of records) {
  const ran = r.sections.filter((s) => s.id !== END && s.id !== UNSECTIONED);
  const ms = ran.reduce((a, s) => a + s.ms, 0);
  console.log(`  ${r.run}: ${ran.length} section(s), ${r.executed} assertion(s), ${r.failed} failed, ${(ms / 60000).toFixed(1)} min in sections`);
}
console.log(`  the unsharded suite lists ${expected.length} section(s).`);
for (const p of problems) console.error(`  ✗ ${p}`);
if (problems.length) process.exit(1);
console.log(`  every one of the ${expected.length} section(s) ran in exactly one ${whole.length ? 'run' : 'shard'}.`);

// THE END-OF-RUN CHECKS, once.
if (whole.length) {
  const end = whole[0].sections.find((s) => s.id === END);
  if (!end?.assertions.length) {
    console.error('  ✗ the whole run\'s record holds no end-of-run check: it did not reach the end of the suite');
    process.exit(1);
  }
  console.log(`  the whole run made its ${end.assertions.length} end-of-run check(s) itself.`);
} else {
  const merged = spawnSync(process.execPath, [join(HERE, 'test-chrome.mjs'), '--merge'], { stdio: 'inherit', env: { ...process.env, CHROME_SHARD: '' } });
  if (merged.status !== 0) process.exit(1);
}
