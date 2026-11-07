## (2026-11-07) — Plugin verdicts: an over-budget set member throws, a stopped set counts what it finished (#3418, #3449)

Two correctness fixes in the plugin, one PR. No executor code moved, so `EXECUTOR_REVISION` is unchanged. The line
wording is unchanged; the wording question #3449 raises is a proposal in the PR body, under "Owner sign-off needed".
The Draw specs causes (#3404) began in this PR and moved to a PR of their own, held for the owner: whether Draw specs
shows causes at all, and which mark each case gets, is #3404's first owner question, and the drawer already renders
causes, so carrying them changes what it shows.

### #3418 — a one-member chunk over its budget is a thrown error

`mcp-paste.ts`'s header says a single indivisible unit that will not fit is a thrown error. For a set, that unit is one
member in a chunk, and `planSetChunks` ships it alone and over budget rather than loop. The engine stays permissive: its
own gates pack to a budget of 1 on purpose (`test.ts` measures one member per chunk that way), so a throw there would
break them. `componentScripts` knows the real per-script budget, so it checks each chunk's measured `bytes` against it
and throws, naming the def and the member. Only a one-member chunk can be over, because `settleChunks` moves members off
any larger one.

`componentScripts` takes `chunkCeiling`, which lowers the ceiling and never raises it, as `themeScripts`' `sliceCeiling`
does, so the gate can reach the case. Arm: `test-mcp-paste.ts` `size/one member`, Badge at a 32,000 ceiling. The
ceiling is chosen so the smallest member sits between the budget and the ceiling (29,115 < 30,110 < 32,000), which is
the issue's harm: a chunk over its budget but under the ceiling. The premise asserts exactly that, with the member's
size measured off the engine's packer at budget 1, not off `componentScripts`. **Trap:** the first version used a
30,000 ceiling, where every member is over the ceiling too, so a check against the ceiling instead of the budget still
passed (the independent review found it). Mutations: the check dropped, or compared against the ceiling →
`size/one member: a member that will not fit alone throws`.

### #3449 — a stopped set's count is read off the host

`applySet` set `out.updated` only from the pass's return value, which a throw never delivers, so the count was always 0.
Now a stop reads the count off the host. A member counts as finished when it carries its planned stamp, did not carry it
before the pass, and has no in-progress marker.

**What this means in practice.** The executor writes every member's stamp after the whole pass (§7). So a stop inside the
members' writes, the usual case and #3424's reproduction, still reads 0, and 0 is correct there: no member is finished.
The count is above 0 only when the stop comes during the stamp writes. Arms in `test-update-apply.ts`: `stop/count none`
(the existing stop, 0), `stop/count finished` (the 10th stamp write throws: the line reads 9, and the dry run's own read
of the stamps gives 9 current and 36 out of date), and `stop/count marker` (the 10th marker clear, the write after the
stamp, throws: the line reads 9). Mutations: the host read dropped → `stop/count finished`; the marker clause dropped →
`stop/count marker`.

**The dry run is not a witness for the marker case.** It reads the 10th member, stamped but still marked, as current
(10), because it does not hold a marker against the stamp; the marker only narrows its hand-edit read. So the count
and the dry run disagree by one in that case. The arm's premise is read off the host instead: 10 members restamped, 1
of them still marked.

**Side effect.** A stopped set with at least one finished member now counts as changed, so it appears in the publish
description's sets (`update-apply.ts`'s `changed`). Before, a stopped set never did, because its count was 0.

The line's other clause, "the rest are unchanged", is not true after a stop inside the writes: those members were
written and are not finished. That wording is the owner's. It is a proposal in the PR body.
