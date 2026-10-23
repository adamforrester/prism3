## (2026-10-23) — Update keeps a kept child's parent-written fields too (#2943)

**The bug.** On a library file, Update with `handEdits: 'keep'` listed checkbox-control's `focusRing` as a
non-conflicting hand edit, then wrote the ring's corners back to the concentric radius on the six unchecked
focus-visible members, the ones whose root the update rewrote.

**The cause.** The executor's `build` skips a kept node's own fields (`kept` guards `own()` and `claimDefaults`), but a
child's placement is written by its PARENT, after the child loop: the ring pass (`absoluteInset`) unbinds the ring's
size, resizes, places and re-corners it from the host; the pin, corner-pin, foot-pin, centered and inset-icon passes do
the same for their children, and the loop itself writes `layoutAlign`, `layoutGrow`, sizing, `maxWidth`, `minHeight`
and `opacity`. None of them asked whether the child was kept. The update's own content verify skips kept paths, so the
overwrite passed verify silently. Members the update did not rewrite never ran the pass, which is why the checked and
indeterminate rings survived.

**The fix.** The parent records each child it paired in place under a kept path (`held`) and runs none of its
child-placing writes on it. A kept child keeps every field, its parent's writes included. Executor revision 35 → 36.

**The test** (`test-update-apply.ts`, `keep/…`): a checked focus-visible checkbox, its root given a new fill by the
plan, with four hand edits — the ring's corners unbound and 0, the mark's fill red, its gap bound to `space/0`, the
icon's width and height bound to another variable. After Update with keep, all four read byte-identical to literals
typed in the test, the root still takes the new fill, and an unedited member takes the fill and keeps its concentric
ring. Mutation: the `held` skip removed → `keep/byte-identical` fails (the ring reads 32 on every corner).

**Not covered, by design:** an unbound width or height is outside the as-built record (`member-baseline.ts`), so a
size changed by hand without a binding is never seen as a hand edit, kept or not. Raised on #2956.
