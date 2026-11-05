## (2026-11-04) — Update file: a Theme run updates the sets it unblocks; Keep lists what it held back (#3421, Q39 A)

The reference brand's master, after #3402 (`interactive.*.indicator.*`), showed three faults in one Update file. The owner decided Q39 A.

### What was wrong, and why

- **Ordering.** The dialog runs its scoped check as it opens, before any step writes. radio-control, switch-control, tag and tab-item bound indicator variables the file did not hold yet, so the check marked them blocked (`fileBlockers`: "3 variables the plan binds are not in this file"). `updateDefsOf` passed only unblocked sets to the update step. Theme then wrote the variables, and the four sets stayed due.
- **Keep was silent.** Under Keep, a node edited by hand is not written, so on radio-control and tag the selection mark never got the indicator binding. `main.ts` still recorded every set the apply acted on as current, so the next check showed 0 due.
- **radio-control's 60 misses** are its kept hand edits, not an executor fault. Each kept dot reads back `bound <member>/dot.width -> DISCARDED`, which #3086 already moved out of the update's verdict, but the set's `build` record in plugin data still filed them as misses. The gate's third mutation reproduces the owner's record line for line. `wiredMembers: 0` is correct: radio-control has no text, boolean or swap properties, only variant axes, so no property reference is wired. switch-control's 24 and tab-item's 18 misses have the same shape, but they were not reproduced against the owner's file.

### The change

- **Ordering.** The dry run marks a set `themeBlocked` when every blocker is a variable or a text or effect style the plans name (`update-plan.ts`). With Theme ticked, the update step takes such a set (`updatableOf`). The step checks again after Theme (`recheckFirst`), and accepts the changed hash only for those sets (`recheckHolds`, now shared by `apps/studio/src/main.ts`). The row says "Updated after Theme — Theme writes the variables and styles it binds first". A set still blocked after Theme is refused by name in the verdict.
- **Kept edits.** Under Keep, `heldOf` names what the dry run's `conflict` hand edits hold back: the members, and each change on that node in the designer's words (`border → color/…`, `dot: size → …`). The verdict names every one, and the headline adds "· N sets kept edits over changes". `ledgerAfter` (moved out of `main.ts`) records the entry with `held`, and `dueOf` reads such an otherwise-current set as `kept`. Update file lists it under a new **Kept edits** group with its own Keep / Overwrite / Accept as baseline select, sent as `UpdateChoices.sets`. A line under the hand-edit select says what each choice does.
- **The build record.** In update mode the executor files a bound read-back on a kept node under `kept` (`keptCount`, five named), not `misses`, through one test shared with the verdict (`keptBoundOf`). This is an executor change, so `EXECUTOR_REVISION` rises to **53**: #3380 and #3399 each hold 52. `executor-reach.json` gains `"52": []` and `"53": []`; the reach lint measured 0 sets redrawn.

### The gate

`apps/plugin/test-update-kept-run.ts`, in the plugin's `test`, runs a full Update file in the component shim, then the check. radio-control and tag are built from their pre-#3402 plans in a file without the indicator variables, and the designer has recolored radio-control's checked rings and resized its dots. The run takes both after Theme. Then the check finds 0 due, tag current, and radio-control under Kept edits. The 12 held members are counted from the plans, and the rings are read off the host. Mutations, each failing by name:

- the ordering fix dropped → `order/in the run`, `after/0 due`;
- a kept set recorded as current → `after/kept listed`;
- kept read-backs filed as misses → `record/kept apart`.

The Theme step is modeled as the variables arriving (`liveVars`, a new shim option). What Apply Theme writes is `test-readback-parity.ts`'s subject.

**The wiring, after review.** That gate calls `ledgerAfter` and `recheckHolds` itself, so it checks the helpers, not the wiring: reverting `main.ts`'s `acted` to record each acted set without `held` passed it, and so did the seven plugin tests that load `main.ts`. Two more checks drive the wiring:

- `apps/plugin/test-update-kept-main.ts` posts the run to the real `main.ts` under the strict shim: the check, the Theme step, the check again, `update-sets`, then `file-sets`. It reads the ledger off the root's plugin data and the due state from `main.ts`'s own answer. `acted` built without `held` fails `main/held recorded` and `main/kept listed`. `update-sets` dropping the per-set choices fails `main/overwrite chosen`, which reads the rings off the host.
- `test:chrome` section `ia2` gains an arm where a set only Theme blocks rides the run. The Studio driver's re-check done by strict hash equality fails it by name.

**Trap:** under the strict shim, the root's own search answers a set's members as references, with ids that are not the nodes'. So an in-place update through it reads every member as "not built by Prism3". The new test gives each page its own search over its real nodes, as Figma's does. The run's read then searches a page at a time (`run-read.ts`), and the components the sets nest are real ones on a page of their own. No host method is patched.

**Filed while doing this:**
- #3435: switch-control's and tab-item's misses, not reproduced here.
- #3436: a second Keep run over a kept set records it as current.

### Left for the owner

The new strings are DRAFT, Q3421.1–.6 in the PR. Kept edits sets are not counted in the badge, because Keep changes nothing on a run.
