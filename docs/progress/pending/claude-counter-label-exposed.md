## (2026-10-19) — Counter label exposed (#2693, Q399 A)

**The decision.** The audit on #2706 found three ways a form part nests FieldLabel. Q399 A on #2693 chose one: the
Counter nests it as the fields do, `nest-exposed` with `emphasis` and `weight` exposed. Q420 A stands: the Counter's
outline still does not follow the Field style lever.

**The change is the nesting relation only.** Counter's `label` part moves from `nest-fixed` to `nest-exposed` with
`expose: ['emphasis', 'weight']`, keeping `follow: ['size']`, the `variantWhen` that dims it with a disabled Counter, and
the secondary, regular starting coordinate. Nothing looks different. The projected surface moves (the label carries
`nestExpose`), so `component-surface.json` is re-accepted under an `engine: minor` note. No executor code moves, because
both executors already mark a `nest-exposed` instance exposed, so `EXECUTOR_REVISION` is not raised here (#2821 raises it
to 33 independently).

**Relation to #2756.** That PR does the same for the three groups and is not duplicated here. The two touch different
defs, the surface baseline and the dependencies report, so whichever merges second re-runs `regen` and
`lint-component-surface.ts --accept` after the merge.

**Pin.** `test.ts` holds the Counter's label to the decision by name (typed `nest-exposed`, expose, follow, starting
coordinate), as Select's #1438 block does.
