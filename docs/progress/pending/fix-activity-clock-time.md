## (2026-11-07) — Activity: a run's time reads as clock time, "9:25 AM", and an earlier day's run shows its date (#3471)

### What changed

- The Activity drawer stamped a run as `HH:MM` (`toTimeString().slice(0, 5)`), so a finished row read
  "✓ Read-back Clean 09:25", which reads like a run that took nine minutes. Per the owner's Q91 A it now reads
  "9:25 AM": 12-hour, no leading zero, a space, uppercase AM/PM. Per Q92 A a run from an earlier day also shows
  its date, "Nov 6, 9:25 AM".
- One place formats it: `runTime(at, now)` in `apps/studio/src/shell/run-time.ts`. The drawer's row, its Earlier
  results and its bar row all draw through it. The drawer now keeps each run's `Date`, not a string, and formats it
  when it draws, read against its own clock, so a run is compared with the day the drawer is drawn on. The month
  names and AM/PM are written in the module, so the words do not depend on the locale.
- The status strip (`state/status-strip.ts`) shows an elapsed `m:ss`, which is a duration, not a run's time, so it is
  unchanged.
- `getHours` now ships in both bundles, and `lint-us-english.ts` read it as an `-our` spelling. Per the gate's rule it
  is subtracted in `NOT_EN_GB` (`prose-rules.ts`), with a SELF_CHECK sample (`at.getHours()` not flagged). That sample
  fails by name when the entry is dropped.
- Two guide citations of `activity.ts:239` move to `:240`, because the new import shifted the line they quote.

### Tests

- `test-run-time.ts` (in studio `test`), with the zone fixed at America/Los_Angeles and every instant written as UTC:
  09:25 → "9:25 AM", 21:05 → "9:05 PM", 12:00 → "12:00 PM", 00:07 → "12:07 AM", an earlier day → "Nov 6, 9:25 AM",
  an earlier local day that is the same UTC day → "Nov 6, 9:05 PM", and a source arm that every `p3-op-when` in
  `activity.ts` goes through `runTime` with no clock reader of its own.
- `test:chrome` section 3471 (shard 3): the plugin's drawer with the page's zone (America/Los_Angeles), locale (de-DE)
  and clock fixed. Two read-backs, on Nov 6 at 9:25 AM and on Nov 7 at 9:05 PM. The row and the bar row read
  "9:05 PM", and the earlier result reads "Nov 6, 9:25 AM".

- Two existing arms matched the old stamp with `^\d\d:\d\d` and now match the new one: `test:chrome`'s Q3113.6 A
  earlier-runs line and `test:verdict`'s #2281 "each earlier result leads with its time and verdict". Both failed on
  the change first, which shows they read the drawn stamp.

### Mutations, each red by name

- `runTime` back to `HH:MM` (`at.toTimeString().slice(0, 5)`) fails `#3471 09:25 reads "9:25 AM"` and the other six
  literal arms in `test-run-time.ts`. In `test:chrome` it fails `#3471 3471 figma light 1280: the row reads "9:05 PM"`,
  `… the bar row reads "9:05 PM"` and `… the earlier result reads "Nov 6, 9:25 AM"`.
- The date dropped (`return clock`) fails `#3471 a run from an earlier day reads "Nov 6, 9:25 AM"` and `#3471 the
  earlier day is the viewer's local day, not UTC's`. In `test:chrome` it fails only `… the earlier result reads
  "Nov 6, 9:25 AM"`.
