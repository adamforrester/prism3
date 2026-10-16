## (2026-10-15) — Prototype reactions: Rest keeps While pressing for touch prototypes (reverts #2703, Q344)

Owner decision Q344 (#2733, #2702) reverses #2703. Rest carries While hovering → Hover **and** While pressing → Pressed,
and Hover carries While pressing → Pressed. `reactionMap` is back to its state at 7eacb197. The reason is now in
`apps/plugin/src/reactions.ts`'s header so the chain is not "simplified" again. On a desktop, Rest's press never fires,
because the pointer hovers first and the member has already changed to Hover. A touch prototype (Figma Mirror) has no
hover, so Rest's press is the only route to Pressed. Per def, reactions = sources × 1.5 again (button 288, tag 27).

**Kept from #2703, pointed at the restored plan.** The `test:roundtrip` `reactions read-back` (16 interactive defs read
off the shim against a literal per-state table, never the map) now expects Rest to hover and to press. `test-reactions.ts`'s
`chain/…` section becomes `touch/…`. It checks fresh builds per state, then seeds a tag set as #2703's executor left it:
Rest without its press, the record rewritten to agree, an older revision. It then walks dry run (the missing press named
as a `prototype reactions` difference, no hand edit) → apply (press back on all 9 Rest members) → clean dry run.
EXECUTOR_REVISION 27 (#2683 takes 26).

**#2703's own fragment and change note stay pending.** A non-fold PR may not delete them (`lint-progress-order.ts`
reads a deletion as a fold, and `lint-emission-version.ts` refuses an edited note). The fold writes #2703's entry and
this one together, and this one, later in merge order, supersedes it. No file in use was updated under the hover-only
plan (#2733), so in practice the revert corrects nothing in any file.

**Docs.** The open conventions docs PR #2701 says nothing about reactions, and its emitted conventions file lists the
`state` values only. It needs no follow-up. `docs/18` §3 already describes the restored plan.

**Mutation.** Dropping the Rest press from `reactionMap` fails `reactions read-back`, `touch/rest`, `touch/dry run` and
`touch/restored` by name.
