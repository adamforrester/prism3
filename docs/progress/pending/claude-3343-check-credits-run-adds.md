## (2026-11-02) — Update's check counts what the same run adds: Wallet button no longer waits for a second run (#3343)

**What.** On the template file, Update listed Wallet button as "can't be updated in place yet". Its blocker was
`Not in this file: provider-logo/button/…`, the 11 provider-logo marks the same run adds. `fileBlockers` read the file as
it is before the run, so the check blocked Wallet button on what the run it was checking would supply, and the owner had
to run Update twice. This PR fixes defect 1 of the issue only. Defect 2, the panel's "the agent's update check says why"
string, belongs to the #3326/#3308 Activity proposal and is unchanged here.

**Fix.** `previewUpdate` (`apps/plugin/src/update-plan.ts`) reads the targets in `nestedFirst` order. Once a target's
read has no blocker, every component name it leaves in the file goes into `addedThisRun`. For a single-component def
that is each planned `<id>/<value>`, adds included, and for a set its own name. Each later target's `fileBlockers` counts
those names as present, the same way #2759's `renamedInto` counts a set this run renames. A blocked target credits
nothing, because the apply refuses it. The previews are still reported in the targets' order, so the hash and every
caller's `sets[i]` read as before. `nestedFirst` moved from `update-apply.ts` to `update-plan.ts`, so the check and the
apply share one order, and `update-apply.ts` re-exports it. It also now matches a single-component target by its `<id>/`
prefix. Before, it matched only a set's exact name, so `wallet-button`'s `provider-logo/button/*` named no target, and
the apply could have written Wallet button before the marks existed.

**Test.** `apps/plugin/test-update-apply.ts`, section `#3343`, on the strict host (the shim default; the copied host and
root are fixed again with `fixHostMethods`). provider-logo is built without its 11 `button/*` marks. wallet-button is
built from an earlier plan whose styled marks nest the provider's logo, so the current plan has 50 members due. The
targets are listed wallet-button first. The arms assert literals: the order puts provider-logo first; the check reads
wallet-button with no blockers and 50 to update, and provider-logo with 11 to add; one run adds the 11 marks and then
updates wallet-button's 50 with no miss and no content left; a second check reads all 68 current; and a run whose
provider-logo plans leave out `button/paypal-gold` still blocks wallet-button with that one mark named, word for word.
A blocked provider credits nothing: a run whose provider-logo is itself blocked (one mark nests a component the file
lacks) still blocks wallet-button on all 11 marks (`run adds/blocked provider`), since the apply would refuse
provider-logo and add none of them.
provider-logo's whole verdict is not asserted. The shim misreads 21 non-square outlines as drift Figma's importer does
not have, as the #2343 arms record, and that is the same before and after this run.

**Mutations** (each committed `wip:` first, restored from `HEAD`):
- `addedThisRun` never filled: `run adds/check`, `run adds/one run`, `run adds/settled` and `run adds/unsupplied` fail.
- `nestedFirst`'s `<id>/` match removed: `run adds/order` fails too.
- The `!preview.blockers.length` guard on the credit removed: `run adds/blocked provider` fails.

**Executor.** No file the executor reaches changed (`update-plan.ts` already imported `emitCoordValue`'s module), so
`EXECUTOR_REVISION` stays where it is. `lint-executor-revision.ts` agrees.
