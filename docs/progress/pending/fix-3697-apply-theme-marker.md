## (2026-11-12) — Apply Theme: an interrupted run leaves no "matching" print (#3697 M3)

**Status:** plugin only. No engine, emission or token-name change, so no change note and no `CONTRACT_VERSION` move.
`apply-theme.ts` is outside the executor `lint-executor-revision` walks, so `EXECUTOR_REVISION` stays.

### What was wrong

Apply Theme stores the brand input and the print of what it wrote (`theme-emission.ts`, #3422) only after its last
stage. A throw at stage 5, or a plugin closed mid-run, left new variables under the old stored brand and the old print.
On reopen, the recount (`themeDue`) read the file as matching the old brand, and Theme opened unticked over a
half-written variable layer.

### What changed

`runApplyTheme` clears the stored print right after the named version is saved, before the first write (the
collection rename pre-pass), and stamps it again at the end, as it did. A file with no print already reads as
differing (`theme-emission.ts`), so an interrupted run now reads as due until a whole run stamps it. A run the
pre-flight refuses never reaches the clear, so it changes nothing, as before.

Not changed, stated: the stored brand input is still written only at the end, so a build after an interrupted apply
still draws from the old input. The print is what the recount and Theme's default tick read, which is what #3697 named.
The MCP paste (`mcp-steps.ts`) writes its stamp in its own persist step and isn't changed here.

### The test

`apps/plugin/test-apply-interrupted.ts` (in `npm test`) applies brand A whole to a file shim, then brand B, whose apply
the host stops as stage 5 (`text-styles`) begins, through the apply's own pace hook. After the stop, the file reads as
holding neither brand and holds no print. A whole rerun of B stamps B's print and reads as matching. Against `main`, the
test fails `interrupted/A not matching` and `interrupted/no print`. Mutation: the clear dropped, committed as `wip:` and
reverted, fails the same two by name.
