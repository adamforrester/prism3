/**
 * Which run the completion notice names (#533, owner decision Q110 A).
 *
 *   npx tsx apps/studio/test-run-ended.ts
 *
 * While the panel is minimized to the strip, a run that ends shows one short notice. When several runs ended before
 * nothing ran any more, the notice names the worst of them: a failure, else a warning, else the first. `worstEnd`
 * (`src/shell/run-ended.ts`) is the one place that is chosen.
 *
 * INDEPENDENT OF THE SUBJECT (docs/34). The expectations are literal row keys typed below, never computed from the
 * order or the kinds the subject reads.
 *
 * Mutations that fail here by name (each after a `wip:` commit):
 *   · the last run in place of the worst (`ends[ends.length - 1]`) → `#533 a clean run then a failed one: the failed`
 *     and its siblings;
 *   · warnings before failures → `#533 a warning then a failure: the failure`.
 */
import { worstEnd } from './src/shell/run-ended';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const at = (ends: { k: string; kind: 'ok' | 'warn' | 'bad' }[]): string | null => worstEnd(ends)?.k ?? null;

ok(at([]) === null, '#533 nothing ended: no notice');
ok(at([{ k: 'prune', kind: 'ok' }]) === 'prune', '#533 one clean run: that run');
ok(at([{ k: 'prune', kind: 'ok' }, { k: 'components', kind: 'bad' }]) === 'components', '#533 a clean run then a failed one: the failed');
ok(at([{ k: 'components', kind: 'bad' }, { k: 'prune', kind: 'ok' }]) === 'components', '#533 a failed run then a clean one: the failed');
ok(at([{ k: 'apply', kind: 'warn' }, { k: 'components', kind: 'bad' }]) === 'components', '#533 a warning then a failure: the failure');
ok(at([{ k: 'prune', kind: 'ok' }, { k: 'apply', kind: 'warn' }, { k: 'styleguide', kind: 'ok' }]) === 'apply', '#533 a warning among clean runs: the warning');
ok(at([{ k: 'prune', kind: 'ok' }, { k: 'styleguide', kind: 'ok' }]) === 'prune', '#533 two clean runs: the first');

console.log(`\n${executed - failed}/${executed} passed`);
if (executed !== 7) { console.error(`expected 7 arms, ran ${executed}`); process.exit(1); }
if (failed) process.exit(1);
