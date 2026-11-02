---
engine: patch
---
Plugin build: the check for a checkout behind origin/main no longer fetches when the build stamp says git could not run, or under `--watch` (#3261). Where git cannot run, the build prints its one warning pair, without a second note from a fetch that fails for the same reason or the fetch's 20 s timeout where git hangs. A watcher no longer blocks on the fetch after it starts. A build that runs once with a working git still fetches and warns as before. No emitted artifact, token or projected component surface moves, and the executor is unchanged.
