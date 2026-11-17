## (2026-11-17) — The component write-adapter suite prints its summary after every arm (#1857)

**What.** `apps/plugin/test-write-components.ts` printed `plugin COMPONENT write-adapter: ALL PASS` at line 3398 of
6175, so 173 assertion calls ran after the verdict. A failure among them exited 1 while the summary line still read
`ALL PASS`, with the `✗` lines printed below it. The summary now sits beside `if (failed) process.exit(1)` at the end.

**The test.** A new last arm reads the file's own source and requires exactly one `ALL PASS` summary line with no
`ok(`/`pinned(` call after it. On main it fails naming the line (`at line 3398; 173 assertion call(s) after it`), and
the same run shows the defect: `ALL PASS` at output line 429, the `✗` at line 819.

**Mutations.** An `ok(false)` inserted just below the old summary position now prints `1 FAILED` on the summary line.
An `ok(true)` appended after the summary fails the #1857 arm by name. Moving the summary back up is main's state.

**Scope.** Test-only; no engine or plugin behavior moves. Every other plugin `test-*.ts` with an `ALL PASS` summary
already prints it after its last assertion (checked by script); only this file had drifted.
