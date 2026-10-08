## (2026-10-07) — CI: Chromium installed once per job, cached and time-bounded (#2323)

Two attempts of #2299's CI run hung over 75 minutes each in the verdict suite's step. Each stalled in `apt-get`, fetching Chromium's system packages from Ubuntu's mirror, before any test ran. `ci.yml` installed Chromium inside two gate steps (the plugin verdict suite and the studio smoke suite), neither with a time limit, so a mirror stall burned the whole job and read as a test hang.

- **One install step, ahead of the first browser gate.** Every browser gate runs after it: verdict, start, chrome, live-css and smoke. The browser is cached under `~/.cache/ms-playwright`, keyed on the Playwright version the lockfile resolves. `--with-deps` stays, because a cache restores the browser, not the system libraries it loads.
- **Bounded, and still a gate's setup.** `timeout-minutes: 12`. Each attempt is bounded at 4 minutes, and the install is tried three times, since a mirror stall is more often transient than persistent. Three failures fail the job with "Chromium install timed out or failed after 3 attempts; the browser gates cannot run". Never `continue-on-error`. The two old comments that named this fix ("caching the browser, never restoring the flag") now point at it.
- `lint-doc-gates.ts` lists the install step and the version-resolving step in `NOT_A_RUNNABLE_GATE`, beside `npm ci`. They install and assert nothing, and `verify.ts` stands in for the browser with `chromiumPrecondition`.

### Traps for whoever re-verifies

- **The loop was exercised locally, not under Actions,** with `false`, a once-failing command and `sleep 5` in place of the install, and a 1 s bound. It fails the job, retries a one-off failure, and bounds a hang. The first CI run on this branch is the real check: the cache step should report a miss, then a hit on the next run.
- **`SETUP_LINES` still allows `npx playwright install --with-deps chromium` inside a gate step.** No step carries that line now, but the gate's self-tests use it, so emptying it is a change of its own.
