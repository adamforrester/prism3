## (2026-11-10) — Update file no longer reads a moved tinted wash as a hand edit (#3527)

Under `outlineInteraction: solid-tint`, Update file read Button's and Button.Destructive's outline hover and pressed
members as hand-edited, though nobody had edited them. With Keep, those members kept the old minimum width and failed
the footprint check: 36 parts in Button and 48 in Destructive.

**Cause.** The as-built record (`member-baseline.ts`) hashes each paint, and each paint's opacity with it. A bound
paint's opacity belongs to the host, not the designer. The executor stores the variable's alpha there, and the host
writes it again on a combine and whenever Apply Theme rewrites the variable. A `solid-tint` hover binds
`interactive.<c>.subtle-fill.<state>`, a wash whose alpha is the brand's opacity step. So a theme that moved the step
moved the opacity on every wash-bound member, and the record read that as a hand edit. The issue's two candidates
were both ruled out: the record is read off the node, never computed from the `overlay-neutral` def, and the
subtle-fill binding is the plan.

**Fix.** The node hashes are unchanged. Each node that holds a bound paint now also gets a `tint` hash, which reads
that paint's opacity as 1. `baselineDiff` compares `tint` in place of the node's hash wherever both records hold it,
the same pattern as #3474's `own`. `BASELINE_V` holds, and a record written before this has no `tint` and is compared
whole, as before. That means a file built before this fix still reads those members as edited until one Overwrite
(the issue's workaround) or Accept as baseline writes them again. `finishUpdated` keeps a kept node's prior `tint`
hash, as it does for `own`, so a kept edit is not recorded as built. That is an executor change: `EXECUTOR_REVISION`
goes 55 → 56. Its reach entry names the 50 sets `lint-executor-reach` measured. Nothing draws differently, but the
gate compares plugin data, and every set that holds a bound paint now carries `tint` in its record. So Update file
re-applies those sets once, and that re-apply writes the new hash into their records. Two tests assumed a set no revision
since 42 had redrawn, and revision 56 redraws it. `test-update-apply.ts`'s reach check moves from Tag to the accordion
indicator, which is still quiet, with that premise asserted. `test-build-completed.ts` is built around Badge. It now
asserts that Badge recorded under 42 is due for the executor, and its "current" path reads the same record with Badge
left out of every entry since 42. One limit is stated in the module header:
someone who sets a bound paint's opacity by hand is not seen.

**Verified.** In `test-update-apply.ts`, Button and Button.Destructive are built under `solid-tint`, the subtle-fill
variables are rewritten as Apply Theme does (96 members' paint opacity moves), and the update runs with Keep to a new
min-width ratio: 0 hand-edited, 864 updated, both sets verify, and the next dry run is all current. Two guards check
that nothing was loosened: a wash rebound by hand still reads as a hand edit, and when an update keeps that edit, the
next dry run still reports it. Mutations: dropping the `tint` branch from `baselineDiff` fails `tint/not
hand-edited`, `tint/updated`, `tint/converges`, `tint/binding still seen` and `tint/kept still reported`. Dropping
the `finishUpdated` keep fails `tint/kept still reported` and `#3474 kept/earlier record`.
