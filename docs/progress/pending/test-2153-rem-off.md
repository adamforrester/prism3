## (2026-10-05) — the style guide test holds "REM off removes the REM column" on every dimension and font-variable table (#2153)

**STATUS: branch `test/2153-rem-off`.** Test only: `apps/plugin/test-style-guide.ts`. No engine, plugin source, token, name or value moves; `ENGINE_VERSION` and `CONTRACT_VERSION` unchanged.

**The gap.** Forcing `const lengths = remOn(options) && …` in `planVariableTables` to ignore the option left `test-style-guide.ts` green. The only check on that path, "19: switching REM off changes no row", compares rerun diffs, and a REM toggle is by design not a change to a row. Section 18's REM-off arm covers the text-style table only, which has its own column code.

### What section 25 checks

- **The plan**, with REM on and with REM off: the 12 dimension and font-variable tables are all there, each table's `columns` is its exact list, and every cell's `rem` is set on a length table with REM on and unset otherwise. A family or a weight table has no REM column with REM on either.
- **The drawn tables**, first drawn with REM on, first drawn with REM off, and redrawn from on to off: the header row is the exact list, every row has a REM cell (`<n>rem` or "—") under each REM column, and with REM off no cell reads REM and no cell sits past the last column.
- **Independence:** the 24 column lists are literals typed in the test, read off the fixture's collections and modes (density's compact and comfortable, type-sets' desktop and mobile, Default elsewhere). None is built from the planner's or the drawer's own lists.

### Mutations, each failing by name

- **REM forced on** (`const lengths = true && …`): "25: REM off: the plan's columns are each table's exact list", "25: REM off: every planned cell has no REM", and the header and cell arms of both drawn REM-off runs fail. Six failures, all in section 25. Before this PR the same mutation was green.
- **REM forced off** (`const lengths = false && …`): "25: REM on: the plan's columns are each table's exact list", "25: REM on: every planned cell of a length table has its REM…", and both drawn REM-on arms fail, with 11 arms in 16, 17, 19 and 23.
- **Not a clean mutation:** dropping `'REM'` from the column list alone, keeping the cells, throws in section 6a. The shim's grid refuses a cell past its last column, as the host does. It's loud, so it isn't a silent pass, but it isn't a by-name result either.

### `gridOf` no longer throws

A missing table made `gridOf(undefined)` throw and stopped the suite. It now counts a named failure ("gridOf: a table the check expected is not drawn") and returns an empty frame. Measured with every dimension table's title changed: the suite used to stop in section 16. Now it reports 50 failures through section 18 and then stops at section 19's `space.id`, a separate `!` dereference. The remaining `!` dereferences are filed as #2163, with the issue's other leftover: the stale "Options" bullet in `lane-style-guide-phase2.md`, which this test-only PR leaves alone.
