## (2026-11-12) — Update file verifies SignInButton's white glyph on a dark fill (#3393)

The owner's Update file run on 2026-11-12 reported SignInButton not verified, with 24 fields that "still differ from
the plan": `…/mark.literalTint: no VECTOR inside to read the tint from (the plan says #ffffff)`. That is one line for
each Apple black and Facebook blue member (2 styles × 3 sizes × 4 states). The build had painted every one of those
glyphs. The verify could not see them.

**Cause.** The read-back checks `literalTint` (Q846 A) on the VECTORs inside the nested provider-logo instance,
through `findAll`, as on a live node. Update file's dry run and verify never diff a live node. They diff
`snapshotMember`'s copy, which is plain data and stops at every INSTANCE. So the check found no vectors, on every tinted
member, on every update that wrote one. #3393 had found the same gap through `test-roundtrip.ts`'s
`snapshot reads as live` ledger, before any real file hit it. This was not a regression from a recent merge: the snapshot
has stopped at instances since 2026-10-07, and the check arrived with SignInButton (#3125, 2026-10-29).

**Fix.** `snapshotMember` copies each instance's VECTOR descendants (name, type, fills) at snapshot time, and answers
`findAll` over them. The property is non-enumerable, as `parent` already is, so the as-built record, which hashes the
snapshot's own keys, does not move: `BASELINE_V` holds and no record reads stale. `member-baseline.ts` is exempt from
`EXECUTOR_REVISION` (it changes nothing on a node). The `sign-in-button` / `literalTint` entry leaves the roundtrip ledger,
which is now empty.

**Verified.** `test-update-apply.ts` `glyph tint/…` builds SignInButton (96 members, 24 tinted), checks that the dry run
reads it current, then moves every member's gap and applies. All 96 update, and no tint line is reported. Mutations,
each a `wip:` commit: `snapshotMember` without the vectors fails `glyph tint/verify` with the owner's line, word for
word, and `roundtrip/snapshot reads as live`. The executor skipping the tint fails `glyph tint/build` and
`glyph tint/verify` (`vector 0 reads {}, want #ffffff`), so the verify now reads real paint rather than passing
by default.
