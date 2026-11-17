## (2026-11-17) — A `--files` listing arrives whole, and lint-schema-classification names one that did not (#3843)

**The cause.** `lint-us-english.ts --files` and `lint-voice.ts --files` printed their walked set with one `console.log`
per line, then `process.exit(0)`. Node writes to a pipe or socket without blocking: once the kernel buffer is full, the
rest is queued in the process, and `process.exit` drops that queue while still exiting 0. `spawnSync` gives the child a
UNIX socket (212,992-byte send buffer here), which takes a few hundred small writes before it is full. The 283-line list
fits only if the reader keeps draining. On a loaded runner it fell behind, and the cut came before line 216, where both
gates' schema files start. `lint-schema-classification.ts` then reported "exited 0 and listed 0 schema file(s)". Five engine jobs failed this way in a
day: three PRs (runs 43939522702, 43996798700, 44055531315) and two pushes to main (44055247481, 44055258931). The
step took 5.5–7.7 s in each, against 5 s on a passing run, so the children ran in full and their output was lost. It
was never a timeout, a cwd difference or a race with another step: the engine job's steps run one at a time.

**The proof.** Run the exact call the gate makes (`spawnSync('npx', ['tsx', 'lint-us-english.ts', '--files'])`), with
parent and child pinned to one CPU next to two busy loops. On main, four runs gave 216, 180, 276 and 283 lines; the
180-line run listed 0 schema files, exit 0, which is the CI message. With a late reader on a plain socket, the old child lost 5 lines.
On a 4 KiB pipe it lost all but 4,063 of 12,675 bytes. With the fix, all of them gave 283 of 283.

**The fix.** Both gates print through `printListing` (`packages/engine/files-listing.ts`). It makes one write, waits
for the kernel to take all of it, writes `--files: N line(s) listed, complete` to stderr, waits again, and then exits.
The classification gate reads the child with `readListing`. It checks the count from stderr against the lines that
arrived on stdout. Because the two come from different streams, a child that goes back to exiting early is still
caught. A short delivery or a missing count is LISTING CUT OFF. A non-zero exit, a signal or a spawn error is
LISTING FAILED. SCANNED BLIND stays, now only for a whole listing that names no schema file.
`test-docs-only.sh` reads `--files` with stderr discarded, so the count line does not reach it.

**Measured.** In `test.ts` (#3843), a child writes 4,000 lines into a 64 KiB pipe whose reader sleeps for a second.
The old printing must lose lines there; if it ever stops losing them, the test is no longer forcing the condition.
`printListing` must deliver all 4,000, and `readListing` must name each fault. Mutations, each failing by name: (1)
`printListing` back to `console.log` plus `process.exit` → the test's "printListing delivers every line" case, and
the gate under load → LISTING CUT OFF; (2) `readListing` returning the delivered lines without checking the count →
the test's two "names … CUT OFF" cases.

**Also moved.** `docs/public/guides/index.md` cites `test.ts` by line. The new import shifts that range by one, so the
citation moves to 699–723. `lint-guide-claims` caught it.
