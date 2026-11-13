## (2026-11-12) — Update: a set that stops part-way still fills the slots of the members it reached (#3697 H1)

**Status:** plugin only. No engine, emission or token-name change, so no change note and no `CONTRACT_VERSION` move.
`update-apply.ts`, `slot-migration.ts` and `slot-text-migration.ts` are outside the executor `lint-executor-revision`
walks from `write-components.ts`, so `EXECUTOR_REVISION` stays.

### What was wrong

A rows-to-slot update (#2649) reads the placed instances' rows before the set changes and fills their slots after it.
The capture lives only in memory, and the fill ran only `if (… && !o.stopped …)`. When a set's update threw at member N
(a font, a removed node), or the plugin closed mid-set, members before N already held the slot and had lost their rows.
The fill was skipped and the capture was dropped. The verdict said to run the update again, but the rerun found no rows
on the finished members to read, so the designer's row content was gone short of restoring the saved version.

### What changed

Of #3697's two fixes, this takes the first: fill the finished members even when the set stopped. `fillSlots` takes
`reachedOnly`, which the apply passes on a stopped set. An instance whose member the update reached (its slot is there)
is filled as on a finished set. An instance whose member was never reached still has its rows. It is left as it is,
with no miss, and the next run's dry run reads it and fills it. This judges by the host's state, not by the stopped
set's finished-member count: a member that stops after its structure changed but before its stamp has lost its rows
too, and its stamp alone would not say so.

The slot-text half (#3225, Banner's body) also fills on a stopped set, but only partly closes. Its new properties are
the set's, added after the member pass, and its `body` slot is renamed `richBody` in every member before that pass.
- **A stop after the properties exist:** every captured body is filled.
- **A stop inside the pass:** none can be filled, and the next run can't read the text again. Each instance is now a
  miss naming it, where the first cut skipped it silently. Carrying that text needs the capture persisted, or read
  under the renamed slot: #3761.

### The test

`test-slot-migration.ts` `stopped/…`: a Checkbox group with an instance on each of its six members. The host throws as
the update marks the third member in progress. The instance of a member finished before the stop holds its rows' labels
and checked state in the slot. The instance of the member the stop hit still has its rows, and no miss is reported for
it. The next dry run reads the untouched instances' rows and has nothing left to read on the filled one. Mutations,
each committed as `wip:` and reverted: `!o.stopped` put back on the fill fails `stopped/earlier kept`,
`stopped/earlier state` and `stopped/no false miss`.

`stopped/text/…` (review S1): a Banner set with an edited body on each of its ten members, stopped on the third
member's stamp and, separately, on its in-progress mark. After the properties exist, every body lands in `body text`;
inside the pass, every instance is a named miss. Mutations: `!o.stopped` back on the text fill fails
`stopped/text after the pass filled` and `stopped/text inside the pass named`; an instance with none of the new
properties skipped fails `stopped/text inside the pass named`.
