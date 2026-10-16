## (2026-10-15) — Prototype reactions chain rest → hover → pressed (#2702)

Owner decision from QA of a real file: a Rest member reacts to While hovering only; the press is reached through Hover.
The change is one condition in `reactionMap` (`apps/plugin/src/reactions.ts`): `ON_PRESS` is planned from Hover alone.
Every source member now carries exactly one reaction, so per def reactions = sources (button 192, was 288; tag 18, was 27).

**Existing files need no new mechanism.** The earlier executor wrote and recorded both reactions on Rest, so a Rest
member read today matches its record (no hand edit) and differs from the plan (to update): the dry run names it as a
`prototype reactions` difference and the apply writes the plan's list over it. `test-reactions.ts` `chain/…` seeds
exactly that state (both reactions, record rewritten over them, older revision) and walks dry run → apply → clean dry
run. EXECUTOR_REVISION moves to 25 for the lint; the reaction difference alone would already mark the member.

**Gate independence.** `test:roundtrip` gains a `reactions read-back`: 16 interactive defs built with node ids, every
member's reactions read off the shim, destinations resolved among the set's members in the test, compared with a
literal per-state table (rest → hover, hover → pressed, else none), never the map. Mutation: the Rest press put back in
`reactionMap` fails `reactions read-back`, `chain/rest` and `chain/corrected` by name.

**Trap.** A designer who adds While pressing back on a Rest member by hand reads as a hand edit (kept by default),
which is the intended behavior, not a regression. Touch prototypes lose pressed feedback on Rest (no hover on a
phone): recorded on #2702, follow-up only if the owner asks.
