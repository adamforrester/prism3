## (2026-11-15) — Update file keeps a slot carry's capture on the set until it is filled (#3761, #3762)

**What.** The two slot carries (rows into a slot, #2649; a slot's text into `body text`, #3225) read every placed
instance before the set changes and fill it after. The read lived in memory only, so a fill that never reached an
instance lost its content: a Banner set that stopped inside its member pass (#3761: every member's `body` slot is renamed
before the pass, so the next run read the set as carried), and any carrying set the plugin was closed in (#3762: the
reached members hold the slot and have lost their rows). Now `applyUpdate` writes the capture to the set's shared plugin
data (`slot-carry.ts`, keys `slotCarry` and `slotTextCarry`) before `applySet`, the next run's `slotMigrationFor` /
`slotTextMigrationFor` add the kept instances its own read no longer finds, and each fill reports `pending` (a stopped
set's unreached instances; a text instance whose set has no properties yet), which is all the entry keeps afterwards.

**The window after the write.** A close after `applySet` returns but before the fill leaves every member current, so the
set read up to date and was never reached again. `carryDue` makes a set with a kept carry not up to date, and the apply
runs its fills alone (`carryOnly`), writing no member.

**Measured on the shim.** A close is modelled as the member `yieldTo` never resolving, which is what a closed plugin
does: nothing after the pass runs. `test-slot-migration.ts` gains `closed/…`, `closed after/…` and the #3761 rerun arms:
6 fail on main's code, 55/55 pass with the fix, and three mutations (`keepCarry` a no-op, `only` ignored, `carryDue`
false) each fail by name. A row's component is looked up by id (`getNodeByIdAsync`) when it comes from a kept capture,
since its layer is gone; one the host cannot find is a named "NOT MADE" miss.

**Not in this PR.** The members a close left read as hand-edited on the next check (filed separately). No executor file
changes, so `EXECUTOR_REVISION` stays 59 (`lint-executor-revision` confirms).
