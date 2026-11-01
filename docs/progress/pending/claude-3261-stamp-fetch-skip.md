## (2026-11-01) — The plugin build skips the behind-check fetch when git can't run, and under --watch (#3261)

Two nits from the independent review of #3253 (#3239), which added the commit to the build stamp and the warning when
the checkout is behind `origin/main`.

### What changed

`git-stamp.mjs` gains `behindCheck(buildId, { watch }, run)`, which `build.mjs` now calls in place of `behindStamp`:

1. **Git cannot run.** When the stamp's commit field is `git-unavailable`, the build has already printed the `⚠ git did
   not run` pair. The fetch would fail for the same reason and add a second note, and where git hangs it would wait out
   its 20 s timeout. It is now skipped.
2. **`--watch`.** The review found that the Ready comment ("each non-watch build fetches") and the code disagreed: the
   fetch also ran once when a watcher started, after the `watching …` line, and blocked for up to 20 s. Of the two
   remedies, skipping the fetch under `--watch` is the simpler one. It is a one-line condition, it makes the description
   true as written, and it keeps a working loop from blocking. A build that runs once still fetches.

The side effect the issue notes is unchanged for a build that runs once: `git fetch origin main` updates the checkout's
`origin/main` ref.

### The gate

New `skip/…` arms in `test-git-stamp.ts`:

- `skip/no-git`: a `git-unavailable` stamp runs no git at all and adds no note.
- `skip/watch`: under `--watch`, nothing is fetched.
- `skip/one-shot`: a build that runs once with a commit in its stamp still fetches and counts.
- `skip/stand-in`: a real `git` executable, first on PATH, that logs each call and refuses every one as the license
  prompt did. The build's stamp and behind check run against it through a real process, and the arm requires the one
  warning pair, no "Could not fetch" note, and no `fetch` in git's log.

New `build/…` arms run the real `node build.mjs` with a stand-in git first on PATH, so `build.mjs`'s half of the fix
is held too. The independent review found that reverting it passed every `skip/…` arm, because those drive
`behindCheck` directly:

- `build/fetch-seen`: the control. A one-shot build with a working git fetches, and the stand-in's log shows it.
- `build/no-git`: with a git that refuses every call, the build never fetches and prints no "Could not fetch" note.
- `build/watch`: `node build.mjs --watch`, stopped 1 s after `watching …`, stamps the commit and never fetches.

The build writes `dist/`, so the test moves the checkout's `dist/` aside and puts it back after.

Mutations: `build.mjs` calling `behindStamp` again fails `build/no-git`. `build.mjs` passing `{ watch: false }` fails
`build/watch`. Without the `git-unavailable` test, `skip/no-git` and `skip/stand-in` fail (git saw a fetch, and three
lines were printed). Without the watch test, `skip/watch` fails. By hand, a real `node build.mjs` with the failing
stand-in on PATH ran only `rev-parse` and finished in 3 s. `--watch` with a pass-through git ran `rev-parse` and
`status`, then no fetch.
