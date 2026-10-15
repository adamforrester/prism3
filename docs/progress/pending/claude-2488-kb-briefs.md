## (2026-10-14) — A "No KB brief" claim is checked against the knowledge base's catalogue (#2488)

**The gap.** The #1700 arm in `test.ts` reads each def file's header: a def cites its brief as
"KB brief: `components/<name>.md`" and takes the brief's category, or says "No KB brief" and states its
own. The categories came from a hand table of the 17 briefs some def cited, so nothing checked a
"No KB brief" claim at all. Divider said "No KB brief" and took `layout` while `components/divider.md`
existed under Foundations, and it passed every gate (#2478 review).

**The fix.** `schema/kb-briefs.json` is a committed snapshot of the knowledge base's component catalogue:
every `components/*.md` whose front matter says `type: component-brief`, with its category (lowercased)
and its aliases, plus the commit and date it was read at. `kb-briefs-refresh.ts <kb checkout>` writes it;
CI cannot read the knowledge base, so the snapshot is what the test reads. It replaces the hand table, so
a cited brief's category comes from the same place. A def that says "No KB brief" now fails when its id
or one of its aliases names a brief file, or is one of a brief's own aliases. The first cut compared a
brief's aliases with the def's id only, so a def aliased `image-overlay` passed while image.md listed that
alias (review on #2621); both clauses now read the id and the aliases. The snapshot is
classified in `lint-schema-classification.ts` as authored pure data (class 3). Read at knowledge-base
`bdaedeb2`: 47 briefs. Test-only, so no change note.

**Proof.** Divider's header back to "No KB brief" with its category kept, so only the new check can
fire: `test.ts` fails once, by name: "#2488 divider: says "No KB brief", and the knowledge base has
`components/divider.md` (category 'foundations')". The two defs that say "No KB brief" today, focus-ring
and veil, match no brief by id, alias or brief alias. Every row the old table held matches the snapshot. With
`image-overlay` added to image.md's aliases in the snapshot, `test.ts` fails once, by name, on veil, which
carries that alias; before the fix it passed.

**Trap.** The snapshot is as current as its last refresh. A brief added to the knowledge base after
`bdaedeb2` is invisible here until someone reruns the script, which is the same gap in a smaller window.
A brief alias that a later def legitimately shares with no brief of its own would also fail here; the
message names the brief, and the answer then is a header that cites it or a def id that does not collide.

**The knowledge base is readable from a cloud session, and CI still does not read it.** #2488 calls it
private; it cloned from here. That is not a reason to wire it into CI: the test reads the committed
snapshot so that no gate depends on another repository being reachable at run time.
