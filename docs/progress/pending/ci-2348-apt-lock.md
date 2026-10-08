## (2026-10-08) — CI: the Chromium install's retries start clean after a stalled attempt (#2348)

#2326's bounded, retried install met its first real stall on #2336's CI and the retries could not help. `timeout` ended attempt 1's `npx`, but the `apt-get` Playwright runs as root, through sudo, survived and kept the dpkg lock. The runner user can't signal a root process, and sudo runs it in its own session, so the process-group kill never reached it either. Attempts 2 and 3 then died at once on "Could not get lock /var/lib/dpkg/lock-frontend".

- **The loop moved into `.github/scripts/install-chromium.sh`,** so it can be tested. The step keeps its name, so `lint-doc-gates`' `NOT_A_RUNNABLE_GATE` entry still covers it.
- **apt is bounded before the first attempt.** An apt config, `/etc/apt/apt.conf.d/99prism3-ci`, is written via sudo:
  - `Acquire::http::Timeout` and `Acquire::https::Timeout` 30;
  - `Acquire::Retries` 3;
  - `DPkg::Lock::Timeout` 120, which sits inside the 240 s attempt bound.

  A stalled fetch now fails on its own, and a retry waits for a held lock instead of dying on it. A config that can't be written fails the job, named, before any install.
- **Each retry starts clean.** Before attempts 2 and 3, a leftover `apt-get` is stopped (`sudo pkill -x apt-get`, and `apt`), then `sudo dpkg --configure -a` finishes what it left half-configured. Each is bounded, at 30 and 60 s.
- **Three failures still fail the job,** with the same named error. Never advisory.
- **`timeout-minutes` 12 → 15.** Three 4-minute attempts were already 12 minutes, so a third attempt that used its whole bound could be cut off by the step's own limit before the named error printed. Now there's room for that plus the two clears.

### How it's tested

`bash .github/scripts/test-install-chromium.sh`, which runs locally and isn't wired into CI. A stand-in install, on its first run, starts a child that leaves its process group (as the root `apt-get` did) and holds a stand-in lock, then stalls past the bound. On later runs it fails as apt does while the child lives. 13 checks:
- `stall/…`: the retry installs, with no lock error.
- `fail/…`: three failures fail the run, named.
- `first/…`: a clean first attempt runs no clear.
- `config/…`: the four bounds, and an unwritable config failing the run.
- `old/premise`: the #2348 behavior, with no clear, failing attempts 2 and 3 on the lock. This shows `stall/…` can fail.

Four mutations of the script fail it by name: the clear removed, the repair removed, the config write removed, and the final `exit 1` made `exit 0`.

### Traps for whoever re-verifies

- **The test swaps CI's clear for a kill of the recorded PID.** `sudo pkill -x apt-get` is a pattern kill: fine on a disposable runner, but not to run on a shared machine. So the test proves the order (config first, clear and repair before every retry and never before the first, the named failure), and CI exercises the real clear. The first CI run that stalls is the real check of it, and the job log will show "Clearing what attempt 1 left behind".
- **The test brings its own `timeout`,** with GNU's contract (exit 124, the command's process group signaled), first on `PATH`, because macOS has none.
- **The stand-in's lock wait must be shorter than its bound,** as apt's 120 s is shorter than 240 s. Otherwise the attempt times out before apt can print its lock error, and `old/premise` reads a timeout as the lock failure it's looking for.
