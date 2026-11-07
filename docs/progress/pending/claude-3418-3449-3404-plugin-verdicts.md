## (2026-11-07) — Plugin verdicts: an over-budget set member throws, a stopped set counts what it finished, Draw specs says why (#3418, #3449, #3404)

Three correctness fixes in the plugin, one PR. No executor code moved, so `EXECUTOR_REVISION` is unchanged. No copy
changed: each fix uses wording that was already there. The wording questions the issues raise are in the PR body,
under "Owner sign-off needed".

### #3418 — a one-member chunk over its budget is a thrown error

`mcp-paste.ts`'s header says a single indivisible unit that will not fit is a thrown error. For a set, that unit is one
member in a chunk, and `planSetChunks` ships it alone and over budget rather than loop. The engine stays permissive: its
own gates pack to a budget of 1 on purpose (`test.ts` measures one member per chunk that way), so a throw there would
break them. `componentScripts` knows the real per-script budget, so it checks each chunk's measured `bytes` against it
and throws, naming the def and the member. Only a one-member chunk can be over, because `settleChunks` moves members off
any larger one.

`componentScripts` takes `chunkCeiling`, which lowers the ceiling and never raises it, as `themeScripts`' `sliceCeiling`
does, so the gate can reach the case. Arm: `test-mcp-paste.ts` `size/one member`. Badge at a 30,000 ceiling. The premise
comes from the engine's packer at budget 1, not from `componentScripts`: every badge member alone is 30,110 characters
or more. Mutation: the check dropped → `size/one member: a member that will not fit alone throws`.

### #3449 — a stopped set's count is read off the host

`applySet` set `out.updated` only from the pass's return value, which a throw never delivers, so the count was always 0.
Now a stop reads the count off the host. A member counts as finished when it carries its planned stamp, did not carry it
before the pass, and has no in-progress marker. That is exactly what the next dry run reads as current.

**What this means in practice.** The executor writes every member's stamp after the whole pass (§7). So a stop inside the
members' writes, the usual case and #3424's reproduction, still reads 0, and 0 is correct there: no member is finished.
The count is above 0 only when the stop comes during the stamp writes. Arms in `test-update-apply.ts`: `stop/count none`
(the existing stop, 0) and `stop/count finished` (the 10th stamp write throws: the line reads 9, and the dry run's own
read of the stamps gives 9 current and 36 out of date). Mutation: the host read dropped → `stop/count finished`.

The line's other clause, "the rest are unchanged", is not true after a stop inside the writes: those members were
written and are not finished. That wording is the owner's. It is a proposal in the PR body.

### #3404 — Draw specs' verdicts carry causes

Every Draw specs verdict that is not ok now carries one cause: the run's own (`subject: null`), worded by its headline
without the mark (as `runCause` words the others). Its reasons are the items the lines already print, or the summary
when no set is on the page. The kind is `bad` when nothing was drawn and `warn` when some panels were drawn. That
follows `messages.ts`' definitions, so `⚠ drew 0 of 1 spec panels` carries a `bad` cause. The `causes/every verdict`
invariant in `test-build-completed.ts` no longer leaves Draw specs out. It now also covers section 8's
`✓ drew 1 spec panel` verdict, which is `ok: false`. Arms: `causes/draw specs none` and `causes/draw specs refused`
(the host refuses every new frame), each literal. Mutation: Draw specs' causes dropped → both arms and
`causes/every verdict`.

Still open for the owner on #3404: per-family causes (subject = the def id) need a new `what` phrase, and whether `✓`
with `ok: false` should stay possible. Both are in the PR body.
