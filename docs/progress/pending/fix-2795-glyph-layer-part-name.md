## (2026-11-16) — A glyph's layer named like a sibling part no longer loses its ids on Update (#2795)

**What.** `findOwnPart` in `write-components.ts` re-finds a member's part by name, with `findOne`, for the binding and
property-reference read-backs and their repairs. `findOne` is depth first, so on Progress's ring (the full-ring glyph,
then the arc glyph as a sibling) a full-ring layer named like the arc part was reached first. The bound read-back saw the
arc's width and height absent on that vector, "repaired" them onto it, and the build counted it as a repair. The next
Update's glyph compare then saw a resized vector, re-imported the glyph, and the vectors took new ids. The fix keeps the
matcher as it is and excludes imported geometry, the way #1428 excludes nodes inside a nested instance: a VECTOR, GROUP or
BOOLEAN_OPERATION, or any node under one, is never a part, since the executor only builds parts as FRAME, TEXT, INSTANCE
or SLOT.

**Why the matcher and not an authoring refusal.** #2795 offered either. A refusal (a check that no component-owned
glyph's layer id equals a part name) covers only `component-glyphs.ts`. The matcher fix covers icon-set glyphs too, and
any layer name an SVG brings with it, and it needs no new gate.

**Measured on the shim.** `test-update-apply.ts` gains `glyph layer/…`: Progress's plans with the full ring's layer
renamed to `arcGlyph`, built, stamped to revision 0, and re-applied in place. On main's executor the build writes 6
bindings onto ring vectors and the update changes 6 vector ids. Both pass with the fix. Dropping `VECTOR` from the
excluded types fails both by name. No shipped def has the collision today (Progress's layer was renamed to `track` when
#2795 was found), so `executor-reach.json` names no set for revision 60.
