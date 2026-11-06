## (2026-11-06) — Update file: a set the apply stopped inside stays due in the as-built ledger (#3424)

After an in-place update, `ledgerAfter` (`apps/plugin/src/update-apply.ts`, called from `updateComponents` in `main.ts`) recorded every set the apply acted on as built from today's def. It left out refused sets only. A set whose outcome has `stopped` (the build's pass threw partway, `applySet`) was recorded too, so `dueOf` read it `current`. Update file's checklist then never offered the update that finishes it, though the verdict says "Run the update again to finish".

### The change

`ledgerAfter` leaves `stopped` outcomes out, as it does refused ones. The set's old entry stands, and the due read keeps it due until a later run finishes it. Nothing else moves: the verdict, the member stamps and the rest of the run are as they were.

### The gate

`apps/plugin/test-update-kept-main.ts` gains step 2b, through the real `main.ts` under the strict shim. After Theme, tag alone is checked and updated, and the host throws once on the 40th `unlockAspectRatio` call among tag's nodes, inside the build's pass. The verdict reads `✗ update stopped at tag`. Then `file-sets` must read tag `due` (`main/stopped stays due`). Step 3 then checks again and runs the update, which finishes tag: the gate's later arms read it `current`, as before.

Mutation: `ledgerAfter` filtering refused outcomes only (the bug put back) fails `main/stopped stays due`, which reads tag `current`.

### Escape review

`test-update-apply.ts`'s stop section stops a run inside a set and shows the next run finishes it. It drives `applyUpdate` alone, so it never reaches the ledger. `test-update-kept-main.ts`, the one gate that reads the ledger `main.ts` writes, had no stopped run. The new arm is that run.

### Noticed, filed separately

A stopped set's verdict line always reads "0 members updated": `applySet` sets `updated` only after the build's pass returns, so a throw inside it leaves the count at 0, though some members were written. Filed as #3449.
