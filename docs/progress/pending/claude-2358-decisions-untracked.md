## (2026-10-14) — lint-decisions-index scans an untracked decision doc too (#2358)

**The trap.** `lint-decisions-index.ts` built its corpus from `git ls-files docs`, the tracked files
only. A decision doc written and not yet `git add`ed was invisible to it: the gate printed the old heading
count and "clean" over exactly the file its author had just written. CI was never affected, since
everything there is tracked; the miss was local, and it surfaced later in CI or not at all.

**The fix.** The corpus is now the tracked files plus the untracked ones git does not ignore
(`git ls-files --others --exclude-standard docs`), with the same exemptions. The corpus line names any
untracked file it scanned. Chosen over the issue's other option, a warning: a warning still prints
"clean", and the point of running the gate locally is to get CI's answer before CI does. `.gitignore`
still keeps scratch output out. No engine behavior moved, so no change note.

**Proof.** An untracked `docs/99-review-probe.md` holding `## Decided (2026-10-14): an untracked probe
decision`. The fixed gate exits 1 with "UNINDEXED DECISION: docs/99-review-probe.md" and a corpus line
of 42 headings across 72 files, "1 of them untracked". The gate from `origin/main`, run over the same
tree, exits 0 with "41 heading(s) found across 71 scanned file(s)" and "✓ clean". With the probe
removed, the fixed gate is clean at 41 across 71.

**Not covered.** A doc that is ignored by `.gitignore` is still not scanned; git will not commit it
either.
