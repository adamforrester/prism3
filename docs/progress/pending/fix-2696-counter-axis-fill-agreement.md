## (2026-10-15) — Update: the verify and the dry run agree on an axis the parent stretches (#2696)

**What was wrong.** On a real file, the confirmed Update reported Accordion "not verified": `…/header/titleRow/leadingIndicator.counterAxisSizingMode: FIXED (the plan says AUTO)` on the medium and large members. The dry run straight after read the set up to date. The two never compared the same thing:
- The apply's verify runs `diffAnatomy` on every updated member.
- The dry run runs it only on a member that is not current. A member whose stamp and record are current is never compared, and the record is taken after the apply, so it already holds FIXED.

**The rule.** The indicator is a row inside the row `titleRow`, with `layoutAlign: STRETCH`. Its counter axis is the axis the stretch fills, so its height is the row's whatever its own mode says. The plan says AUTO there (`fillsAxis` gives it no FIXED, because the row hugs). The executor writes AUTO, and the parent's child loop then writes the stretch. The read-back's two sizing-mode predicates (`anatomy-readback.ts`, `stretchedMode`) now accept FIXED for a planned AUTO when:
- the plan stretches the node;
- the host still holds that stretch;
- the field is the axis the stretch fills. That is the node's counter axis when it shares its parent's direction, and its primary axis otherwise. The parent's plan is threaded into `check` to decide this.

A planned FIXED is never relaxed, because a stretched node left AUTO hugs (#1751). The dry run and the verify both read `FIELDS`, so the one predicate makes them agree in both directions. That holds whether the dry run compares the member or reads it current.

**Why medium and large, not small.** This is inferred, not measured, because the shim models no heights. The host switches a resized axis to FIXED; the executor's `placementWidth` note records this. The title column is the label's line plus a 2px offset, which the def keeps within 1px of the glyph (16/20/24). Where the row comes out taller than the glyph, the stretch resizes the indicator and the host flips it to FIXED. Where it doesn't, nothing resizes and it stays AUTO. To confirm on the real file, read the indicator's height against its glyph's at each size.

**Owner decision Q357 A (2026-10-15).** The rule lives in the read-back, not the plan: relaxed only on the axis the stretch fills, only while both the plan and the host hold the stretch, and a planned FIXED never.

**Considered and not taken (Q357 B).** Making the plan say FIXED on a stretched axis, so the executor writes what the host ends at. That moves the plan of every `crossAxisFill` box, so every such member would read "to update" on the next dry run. It also changes what a hugging row means for its stretched child. That is a projection change, and it would trade this disagreement for one at small, where the host holds AUTO.

**Test.** A new `stretched mode` section in `test-update-apply.ts`, through the file shim. The test models the host itself: at medium and large, the indicator switches to FIXED when the stretch is written. Three controls hold their value whatever is written:
- one member's `titleRow` holds FIXED, and the host holds it stretched where the plan does not (a designer's stretch, with no `layoutAlign` comparison to catch it);
- that member's `header` holds FIXED (stretched on its primary axis, not its counter axis);
- an open member's `content` holds AUTO (the plan says FIXED on its stretched axis).

The expected lines are literals from the def.
- The verify names the three controls and no indicator.
- The next dry run reads 24 current.
- Forced out of date, the dry run lists exactly the three controls and the verify names the same three.
- An indicator whose host lost the stretch is listed and named again.

Mutations, each failing by name:
- the rule dropped → `stretch/verify`, `stretch/dry run`, `stretch/agree`, `stretch/lost`;
- the parent's plan not threaded → the same four;
- the axis ignored → the same four;
- a planned FIXED relaxed too → the same four;
- the host's stretch not required → `stretch/lost`;
- the plan's stretch not required → `stretch/verify`, `stretch/dry run`, `stretch/agree`, `stretch/lost`. The independent review found this conjunct untested (it survived with 257 passing); the `titleRow` control's host stretch is what pins it.

No executor file changed, so `EXECUTOR_REVISION` stays. The change note is `engine: patch`, because no artifact or projected surface moves.
