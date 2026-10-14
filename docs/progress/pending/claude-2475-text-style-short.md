## (2026-10-14) — Short token names are tested on text styles that share a root (#2475)

**The gap.** In short mode the style guide's Token column prints a row's name below its table's common
prefix (#2372). For text styles that prefix comes from the styles' own names, and the test fixture's
styles start at `body/…` and `display/…`, which share none. So short and full printed the same text, and
a text-style planner that always printed the full name passed every test (found in the #2415 review).

**The fix.** §34 in `apps/plugin/test-style-guide.ts` gains a plan-level case: phase 2's text styles,
renamed under one root (`nbds/body/lg/default` and so on), as a brand's text styles usually are. Short
mode must print `body/lg/default` and the default must print `nbds/body/lg/default`. Test-only, so no
change note.

**Proof.** With the text-style row's Token cell given the full name in short mode too (`tokenCellOf(options,
s.name, s.name)` in `style-guide.ts`), the new case fails by name: "34: short: text styles under one
root print the name below it, body/lg/default for nbds/body/lg/default (nbds/body/lg/default)". It is the
only failure. The first attempt at that mutation edited the wrong line and changed nothing; it was
caught because the diff came back empty, not because the test went green.
