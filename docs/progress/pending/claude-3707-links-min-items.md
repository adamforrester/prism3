## (2026-11-18) — An empty `typography.links` is refused (#3707)

**What.** `typography.links: []` validated and built on every sweep brand. It removed six guaranteed contract paths
(`type.body.{lg,md,sm,xs}.default-link`, `type.caption.{lg,md}.default-link`) and left Link binding 112 text styles
the brand did not emit. #3698 R2's sweep held both as listed defects. Owner decision A (2026-11-18): refuse an empty
list. The schema says `minItems: 1`, and `brandTheme` refuses an in-memory empty list in its own sentence:
`Link styles must name at least one text type: typography.links is empty.` That line is DRAFT for the owner, written
in Q-RF1 A's pattern (the subject, the rule, then the offending value). The contract and Link are unchanged.

**The sweep.** `lint-lever-sweep.ts` deletes the two held defects (`REMOVALS`, `BINDING_DEFECTS`) and records the
bound instead: a `LIST_BOUNDARIES` entry (the empty list refused, the default pair built, checked against the schema's
own `minItems`) and a `REFUSALS` entry per brand for the schema's message.

**One existing arm moved.** `test.ts` #2324 built `links: []` to show the underlined label styles mint whatever the
list says. That input is refused now, so the arm builds `links: ['body']`, which also names no label. And
`apps/studio/test-type-input.ts` held that unticking every link cell builds with label's links only; it now holds that
the edit writes `[]` and the engine refuses it, naming `typography.links` (#4041 is how the Studio should stop it).

**Not covered by the decision.** A one-item list without `body` (for example `['title']`) still validates and drops the
body link styles; the issue's option 1 named "a rule that body stays in" beside `minItems`, and the owner chose
`minItems: 1`. Filed for the owner as #4040. The Studio's link checkboxes can still clear every box, which now shows
the refusal rather than building; how the Studio should stop that is a UI decision, filed as #4041.

**Measured.** `test.ts` #3707: on main the schema arm and the brandTheme arm fail (both accepted `[]`); with the fix
they pass, and a one-item list still builds. Mutations that fail by name: `minItems` removed from the schema fails
`test.ts` "#3707 the schema refuses an empty typography.links" and `lint-lever-sweep` "LIST_BOUNDARIES: the schema
states no minItems for typography.links"; the brandTheme refusal removed fails "#3707 brandTheme refuses an empty
typography.links in its own sentence".
