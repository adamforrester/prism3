## (2026-11-06) — Update file: a second Keep run over a kept set keeps it under Kept edits (#3436)

#3428 records a set whose kept hand edits keep out the plan's values with `held`, so the due read lists it under Kept edits. One run later the record was lost. The first Keep run stamps the set's members with today's plan, so the next dry run reads nothing moved under the edited nodes. It marks none of them `conflict` (`dryRunSet`: a hand edit conflicts only where the plan or the executor moved), `heldOf` finds nothing, and `ledgerAfter` recorded the set as current. The designer's rings still held their red, not the indicator binding.

### The change

`ledgerAfter` takes the ledger as it was before the run (`main.ts` reads it with `readLedger` and passes it in). Under `keep`, while the run still keeps hand edits on the set (`kept` is not empty), the `held` the set's entry carried stands. It is joined with any `held` this run found: members the larger count, each change once. Overwrite and Accept as baseline record no `held`, as before, and nor does a run that finds no hand edits left to keep.

**A technical call, stated:** the ledger's `held` counts members and does not name them. So a run that keeps edits on other members than the held ones still lists the set under Kept edits. That can over-report a kept set, as the dry run's own conflict test can. It never reads one current while its edits keep the plan out.

The verdict of the second run is unchanged. It names the kept edits ("60 hand edits kept (dot size)") but has no "keep out N of the plan's values" line, because that line is built from this run's `held`. Whether it should repeat the line is copy, so it is held for the owner on the PR.

### The gate

`apps/plugin/test-update-kept-main.ts` gains step 4b, through the real `main.ts` under the strict shim. After the first Keep run records radio-control `kept`, radio-control is checked and updated again under the default Keep, with no per-set choice. Premise: the check still reads 30 members edited by hand, and all 30 rings still hold the designer's red. Then the ledger must still carry `held` with 12 members and the three indicator border changes (`main/held survives a second Keep`), and `file-sets` must read radio-control `kept` (`main/kept after a second Keep`). Step 5's Overwrite then still replaces the edits, and the set reads current.

Mutations, each failing both arms by name: `ledgerAfter` ignoring the earlier `held` (the bug put back), and `main.ts` not passing the earlier ledger in.

### Escape review

#3428's gates ran one Keep run. The issue was found by mutation-testing that gate, not by a check: nothing ran Keep twice. The new arm is that second run.
