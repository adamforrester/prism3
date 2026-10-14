## (2026-10-14) — Short token names are tested on text styles that share a root (#2475)

**The gap.** In short mode the style guide's Token column prints a row's name below its table's common
prefix (#2372). For text styles that prefix comes from the styles' own names, and the test fixture's
styles start at `body/…` and `display/…`, which share none. So short and full printed the same text, and
a text-style planner that always printed the full name passed every test (found in the #2415 review).

**The fix.** §34 in `apps/plugin/test-style-guide.ts` gains a plan-level case: phase 2's text styles,
renamed under one root (`nbds/type/body/lg/default` and so on), as a brand's text styles usually are.
Short mode must print `body/lg/default` and the default must print `nbds/type/body/lg/default`. A third
assertion runs short mode on the plain fixture, whose styles share no root: `body/lg/default` stays.
Test-only, so no change note.

**Why the root is two segments deep (review).** The first version rooted the styles at `nbds/` alone. A
one-segment root can't tell "strip the common prefix" from "strip one segment", so two wrong planners
passed: the prefix capped at one segment (`commonPrefix(…).slice(0, 1)`) and the short cell always
dropping the first segment. `nbds/type/` separates the first, and the no-root assertion catches the
second, which is the mirror of #2475.

**Proof.** With the text-style row's Token cell given the full name in short mode too (`tokenCellOf(options,
s.name, s.name)` in `style-guide.ts`), the new case fails by name: "34: short: text styles under one
root print the name below it, body/lg/default for nbds/type/body/lg/default (nbds/type/body/lg/default)". The first attempt at that mutation edited the wrong line and changed nothing; it was
caught because the diff came back empty, not because the test went green.
