/**
 * A run's time in the Activity drawer (#3471, owner decisions Q91 A and Q92 A).
 *
 *   npx tsx apps/studio/test-run-time.ts
 *
 * "09:25" on a finished row read as a run that took nine minutes and twenty-five seconds. The owner's format: clock
 * time, 12-hour, no leading zero, a space, uppercase AM/PM ("9:25 AM"); a run from an earlier day also shows its date
 * ("Nov 6, 9:25 AM"). `runTime` (`src/shell/run-time.ts`) is the one place it is formatted.
 *
 * INDEPENDENT OF THE HOST (docs/34). The expectations are literals typed below, never computed from a formatter. The
 * time zone is fixed here, before any date is read (America/Los_Angeles, which is not UTC, so a formatter that reads
 * UTC fails), and every instant is written as UTC, so the arms read the same on any machine in any zone or locale.
 * The premise arm proves the zone took.
 *
 * Mutations that fail here by name (each after a `wip:` commit):
 *   · `runTime` back to `HH:MM` (`at.toTimeString().slice(0, 5)`) → `#3471 09:25 reads "9:25 AM"` and its siblings;
 *   · the date dropped (`return clock`) → `#3471 a run from an earlier day reads "Nov 6, 9:25 AM"`.
 */
process.env.TZ = 'America/Los_Angeles';
import { readFileSync } from 'node:fs';
import { runTime } from './src/shell/run-time';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// America/Los_Angeles is UTC−8 on 2026-11-07 (daylight time ended 2026-11-01).
const at = (iso: string): Date => new Date(iso);
const NOW = at('2026-11-07T23:00:00Z'); // 3:00 PM local, Nov 7
ok(NOW.getTimezoneOffset() === 480 && NOW.getHours() === 15, `premise: the zone is fixed at UTC−8 (offset ${NOW.getTimezoneOffset()}, hour ${NOW.getHours()})`);

const CASES: readonly (readonly [string, string, string])[] = [
  ['09:25', '2026-11-07T17:25:00Z', '9:25 AM'],
  ['21:05', '2026-11-08T05:05:00Z', '9:05 PM'],
  ['12:00', '2026-11-07T20:00:00Z', '12:00 PM'],
  ['00:07', '2026-11-07T08:07:00Z', '12:07 AM'],
];
for (const [local, iso, want] of CASES) {
  // 21:05 local on Nov 7 is Nov 8 in UTC: read against a `now` later that evening, so it is still today.
  const now = local === '21:05' ? at('2026-11-08T07:00:00Z') : NOW;
  const got = runTime(at(iso), now);
  ok(got === want, `#3471 ${local} reads "${want}" (got "${got}")`);
}

{
  const got = runTime(at('2026-11-06T17:25:00Z'), NOW);
  ok(got === 'Nov 6, 9:25 AM', `#3471 a run from an earlier day reads "Nov 6, 9:25 AM" (got "${got}")`);
}
{
  // The day is the viewer's, not UTC's: 9:05 PM on Nov 6 local is already Nov 7 in UTC, as is the `now` it is read against.
  const got = runTime(at('2026-11-07T05:05:00Z'), at('2026-11-07T16:00:00Z'));
  ok(got === 'Nov 6, 9:05 PM', `#3471 the earlier day is the viewer's local day, not UTC's: "Nov 6, 9:05 PM" (got "${got}")`);
}
{
  // Just after local midnight, read late the same day: today, so the time only.
  const got = runTime(at('2026-11-07T08:07:00Z'), at('2026-11-08T07:59:00Z'));
  ok(got === '12:07 AM', `#3471 a run just after midnight, read late the same day, shows the time only: "12:07 AM" (got "${got}")`);
}

// ONE PLACE: the drawer formats no time of its own. Every `p3-op-when` it draws goes through `when(…)`, which calls
// `runTime`, and no clock reader is left in `activity.ts`.
const src = readFileSync(new URL('./src/shell/activity.ts', import.meta.url), 'utf8');
const whens = [...src.matchAll(/'p3-op-when',\s*([^)]*\)?)/g)].map((m) => m[1]);
ok(whens.length === 2 && whens.every((w) => w.startsWith('when(')), `#3471 every drawn 'p3-op-when' in activity.ts is "when(…)" (${JSON.stringify(whens)})`);
ok(/const when = \(t: Date \| null\): string => \(t \? runTime\(t, now\(\)\) : ''\);/.test(src), '#3471 activity.ts draws a run\'s time through runTime, read against its clock');
const readers = ['toTimeString', 'toLocaleTimeString', 'toLocaleString', 'getHours', 'getMinutes', 'Intl.DateTimeFormat'].filter((r) => src.includes(r));
ok(readers.length === 0, `#3471 activity.ts reads no clock of its own (${JSON.stringify(readers)})`);

console.log(`\n${failed ? '✗' : '✓'} run time (#3471): ${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
