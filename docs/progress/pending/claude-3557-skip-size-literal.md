## (2026-11-11) — Apply Theme: a skipped size variable leaves its text styles at their size, not the host's 12 (#3557)

Found in the post-merge review of #3518 (#3569). The collision-choice header promises that a text style pointing at a
skipped variable keeps its literal value. That held for family and style (the plan carries the face and the cut) but
not for size. A skipped size reference set `fontSizeVar` to `''`, the text-style executor then bound nothing, and
nothing wrote a literal, so the style stayed at the host's default 12px. With the `type-sets` collection skipped, 21
of 80 styles rendered at 12px. Skipping `core` would reach the rest.

The fix keeps the promise (the first of the issue's two options), and it lives in the plugin:

- `resolveCollisions` reads, from the plans as they came in, what each FLOAT or mixed-type variable's first mode
  resolves to, with aliases followed. The first mode is the collection's default, so it's what the binding showed by
  default.
- When a text style's size reference is skipped, that number goes on the row as `fontSizePx`.
- `applyTextStylePlan` writes it as `s.fontSize` when the row has no size variable to bind.
- `TextStyleRow` gains the optional field, typed in the engine. It's never emitted: no artifact moves, so no change
  note.

The second option (skip the whole style and report it) would add copy and drop styles the person did not choose to
drop, so it was not taken.

**Status:** plugin only. `write-text-styles.ts` and `collision-choice.ts` are outside the component executor, so
`EXECUTOR_REVISION` stays.

### Test

`test-write-preflight.ts` gains three arms:

- `#3557 skip type-sets: display/3xl/emphasis binds no size and keeps 160`. The expected size is a literal: the
  `type-sets` modes are desktop then mobile, and the display size is 160 on desktop.
- `#3557 skip type-sets: no text style is left with no size binding at the host default 12`: 0 of 80.
- A control: a style sized from `core` still binds its size.

Mutations, each failing by name:

- `resolveCollisions` not setting `fontSizePx` → both `#3557 skip type-sets` arms (21 of 80 stranded).
- The executor not writing it → the same two arms.
