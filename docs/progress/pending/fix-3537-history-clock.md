## (2026-11-12) — Chrome suite: section 10 pins each page's clock to midday, so a run across midnight keeps Q3113.6 A strict (#3537)

Test-only, in `apps/studio/test-chrome.mjs`. The engine, the studio and the plugin are unchanged.

- **The flake (#3537).** Q3113.6 A expects each earlier run in the Activity drawer to read as a bare clock time,
  `9:25 PM`. `runTime` adds the date for a run from an earlier day, which is correct. So a case that started its first
  run before midnight and its later run after it showed `Nov 10, 11:59 PM`, and the arm failed once a day for any run
  of shard 3 spanning midnight.
- **The fix.** Each section-10 case opens with its page clock set to midday on a fixed day (`PAGE_DAY`, through
  `open`'s `prep`). It uses `page.clock.setSystemTime` without `install`, so the page's clock runs on at the real rate
  and its timers, durations and the drawer's collapse timing are untouched. No case reaches the next day from midday.
  The arm keeps its strict bare-time pattern: the option the issue offered, a date prefix allowed, was not taken,
  because it would accept a date on every earlier run.

### How it was shown

- **Before.** With the page clock started 6 s before midnight (a run started then), midnight fell between the case's
  "Theme applied" run and its later stop. Q3113.6 A failed by name in all six cases (figma, light and dark, at 1280,
  640 and 380), each with the issue's shape, for example
  `["12:00 AMStopped at Set up file","Nov 12, 11:59 PMTheme applied"]`. Section 10 passed 2556 of 2562.
- **After.** The same forcing, then the pin: 2562 of 2562.
- **Mutation, from the issue.** The time dropped from the history head (`activity.ts`, `when(x.t)` drawn as empty)
  fails Q3113.6 A by name in all six cases, so the arm is still strict.
- Trap for re-verification: the start offset that puts midnight between the two runs depends on the case's timing.
  Measured locally, the first run lands 2.4–7.1 s after the page opens and the later stop 6.4–19 s after. A start
  too early or too late crosses midnight outside that window and proves nothing.
- The whole chrome suite, run in seven local chunks under 10 minutes each, passed 46,050 of 46,050 assertions, and
  `test:chrome-shards` held every section run exactly once. The first run of section 10's chunk failed one unrelated
  assertion, `#2909 figma dark 640: … Minimize asks the main thread to minimize (posted [])`. Its inputs don't move with
  the clock. It is filed as #3686 (`takeWrites` reads the posts after a fixed 50 ms). Section 10 then passed whole three
  times, and the chunk passed on rerun.
