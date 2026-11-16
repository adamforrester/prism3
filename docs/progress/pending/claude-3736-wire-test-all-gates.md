## (2026-11-16) — The gates aggregator's own test runs in CI, and no script test can go unwired again (#3736)

**What.** `.github/scripts/test-all-gates.sh` tests `all-gates.sh`, the one step the merge rule reads (Q503 A), and ran
nowhere. It is now a step in the `engine` job ("The gates aggregator fails on any result but success (#3736)"), a
`verify.ts` row (`all-gates-aggregator`), and a line in each of the three checklists, so `lint-doc-gates` holds it.

**Why it slipped through.** Arm 4's orphan check matches a gate file's basename anywhere in `ci.yml`, comments included,
and the `gates` job's comment names `test-all-gates.sh`. It also only reads `lint-*` files. So `lint-doc-gates.ts`
gains a script-test arm: every `test-*.sh` in `.github/scripts/`, read from the directory, must be started by a step's
`run:` line (`bash <path>` or `sh <path>`, the whole line). A comment or a mid-line mention does not count. A scope
floor of 3 keeps an empty listing from reading as "all run".

**Measured.** Before the wiring, the new arm failed naming `.github/scripts/test-all-gates.sh`; after, it is clean. The
issue's mutation (the result filter in `all-gates.sh` made `select(false)`) fails the wired step on `failure/…`,
`cancelled/…` and `skipped/…` by name. Removing the new `ci.yml` step fails the script-test arm by file name. Self-tests
cover a step run by `sh`, a comment-only mention and an empty step list.
