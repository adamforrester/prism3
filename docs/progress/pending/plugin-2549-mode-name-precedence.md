## (2026-10-12) — Style guides test: a focus mode named like the column wins over focus's default mode (#2549)

**STATUS: branch `plugin/2549-mode-name-precedence`.** Test only (`apps/plugin/test-style-guide.ts`). No product code, no artifact moves, no ENGINE bump.

**The gap (found reviewing #2543).** `modeIn` (`apps/plugin/src/style-guide.ts`) reads a row from another collection in the column's mode **by its name**, and falls back to that collection's **default** mode only when no mode matches. Swapping the two rules passed the whole suite:
- in §35, focus's one mode is named "Default" and is also its default, so both rules pick it;
- in §35b (#2543), nothing matches by name.

**The case, §35c.** Focus gets two modes:
- **"Base"**, its default, holds 9 for every ring value;
- **"Default"**, named like the Border width column, holds the emission's aliases.

Each focus ring row must read `2px`, `2px` and `0px` `@focus:named`, typed as literals. Drawn, the ring width's outline must be pinned to `focus:named` and read 2px.

**Mutation, from a `wip:` commit:** the rules swapped (`defaultMode(own) ?? …name match…`) fails both arms by name:
- `✗ 35c: a focus mode named "Default", like the column, wins over focus's default mode (Base, 9) (["pds3/focus/ring/width=9px@focus:base", …])`;
- `✗ 35c: drawn, … ({"VariableCollectionId:focus":"focus:base"}; "9px")`.
