## (2026-11-15) — The hand-edit pass stops reading while any write holds the file, prune included (#3737)

**What.** `main.ts`'s background hand-edit pass checks `stale()` between sets and drops its read when a write starts. The
check named `build-components`, `apply-theme`, `file-setup` and `style-guide`, which matched the per-operation guard
before #3718. Since #3697 R7 one hold covers every write, and the list left out `prune`. It is now `guard.busy()`.

**Measured through the real `main.ts`.** `test-prune-main.ts` gains `main/hand pass stale under prune`: a prune confirm
whose version save is held open holds the file while the panel asks for the pass. On main the pass ran to its end and
posted `hand-edits done`; with the fix it posts nothing. A control arm (`main/hand pass premise`) shows the same pass
runs to its end with nothing holding the file, so the new arm cannot pass by the pass never running. Restoring the four
named writes fails the arm by name.

**Not changed.** `busy()` reads "a write holds the file now", as the old check did per operation; a write that starts
and ends between two checks is still not seen. That is what the issue asked to cover (prune), not a new guarantee.
