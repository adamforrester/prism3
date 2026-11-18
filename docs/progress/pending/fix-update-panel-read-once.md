## (2026-11-18) — Update reads Documentation's panels switch once per run (#3870)

From quality scan #3868. `updateComponents` read the Usage panels switch twice. `updateTargets` read it first, which decides whether each lead set's target carries `doc`, and so whether the run checks or draws its panel. `ledgerNow` read it again after the apply, through `panelFormatOf`, which decides whether the ledger entry carries `panel: PANEL_FORMAT`. `doc-settings-save` is never guarded, and Studio's `writeOff` blocks the switch only during its own Update run. So the switch could turn on during an agent's `update-components`, or between yields. The run then drew no panel but recorded the set at today's panel format, the set read current, and its panel was never offered.

### The fix

`updateTargets` now returns the `panels` value it read. `updateComponents` passes it to `ledgerNow(input, panels)`, and `panelFormatOf(panels)` uses it instead of reading the file again. Every other caller passes nothing and reads the file once, as before. The build path was already consistent: it reads the switch once, after the build, for both the draw and the ledger.

### A trap for whoever re-runs the test

`recordSets` keeps an entry's earlier `panel` and `changed` when the new entry carries none, on purpose. So a test world where tag was already stamped (as `test-update-kept-main.ts`'s step 3 leaves it) passes on the old code too. The new arm, `main/panel read once per run`, first strips tag's stored panel fields to the issue's world, a set never panel-checked. Measured: it fails on main and passes on the fix. Reverting `ledgerNow(input, panels)` to `ledgerNow(input)` fails it by name.

### Not picked

Whether `doc-settings-save` should be refused while any write holds the file is a run-guard question. #3870 flags it without picking, and this PR doesn't touch it.
