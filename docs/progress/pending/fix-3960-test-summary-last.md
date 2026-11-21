## (2026-11-20) — The engine suite's summary line counts every arm (#3960, #4333)

**What.** `packages/engine/test.ts` printed `Prism3 engine tests: N passed, M failed` about 640 lines above
the end of the file, so the 78 assertion sites after it (the #3707 and #3551 blocks, and every arm appended
at the end since) counted in neither number. A late arm that failed printed `N passed, 0 failed` above its
own ❌. The exit code was right; the headline, and any PR body quoting it, was not. The report line now sits
last, just above the `MIN_ASSERTIONS` floor check.

**The guard.** The #1268 assertion-site scan, which already reads every `ok(` site's position in the
source, now also finds the one report line and fails by name if any site follows it:
`#3960 the report line (test.ts:N) has K ok call site(s) after it …`. It is a source-position check, so it
needs no assertion of its own to run, and it fires whether or not the late arm fails.

**Measured.** Clean: exit 0, `735939 passed, 0 failed`. Main's layout with the guard added (the report line
put back above the `#3698 Q-PU1 A` block): exit 1, `#3960 the report line (test.ts:43836) has 78 ok call
site(s) after it`, and the headline read 735765, 174 assertions short. With the fix, flipping the last
`#4144` arm to fail prints `735938 passed, 1 failed`; on main that arm sat below the report and read
`0 failed`.

**For whoever appends next.** Add new arms above the `// --- report` banner at the end of the file, not
below it; the scan names the line if you miss.
