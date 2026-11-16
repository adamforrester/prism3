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

**Bounded and validated (#3796 review B1, B2).** Figma refuses a plugin-data entry over 100 kB, and a capture costs
about 720 B per placed instance for a three-row Checkbox group and about 145 B for Banner's text, so about 125 placed
instances of one set reach the 90 kB bound (`CARRY_MAX_BYTES`). `keepCarry` never throws: a capture over the bound, or
one the host refuses, clears the entry, that set carries in memory only for the run (as before), and its outcome names it
(`unkept`). A kept entry is checked field by field before use (`readCarry`): one this version can't read is ignored,
named in the dry run (`carryUnreadable`), and cleared by the set's next write, never a throw in the dry run or the apply.
Splitting the capture across entries was weighed and not taken: it adds a manifest and a torn state (a close between
chunk writes) for a case the in-memory fallback covers as well as the plugin ever did. `test-slot-migration.ts` gains
`kept/…` (83/83), and four mutations fail by name (bound dropped, try dropped, validation weakened, the clear dropped).

**One thing to know.** After a close, the next run's refill of a reached instance replaces anything put into that
instance's slot by hand between the two runs. That is the recovery working as meant, not a loss of the carried content.

**Not in this PR.** The members a close left read as hand-edited on the next check (filed separately). No executor file
changes, so `EXECUTOR_REVISION` stays 59 (`lint-executor-revision` confirms).
