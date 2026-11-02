## (2026-11-02) — Update file honors Usage panels off, and a test now holds it (#3017)

**Status:** plugin fix and a new `test-build-completed.ts` arm, `docs/panels off (update)`, with its control. ENGINE
patch (change note): no committed artifact, emission or component surface moves. The component executor is unchanged,
so `EXECUTOR_REVISION` stays.

### What the issue asked for, and what the test found

#3017 asked for a test that Update honors Documentation's Usage panels switch, because nothing held `updateTargets`'
`panels && leadsPanel(d.id)`. The arm, written beside the Build arm `docs/panels off`, removes Badge's panel and runs
the real `main.ts` Update (dry run, then apply) with the switch off. It **failed on `main`**: the dry run listed no
panel to draw, and the apply drew one anyway.

The cause is the apply's `furnish` hook. It redraws a set's furniture for every set the apply touches, and passed
`panelFor` to `furnishUpdate` whatever the switch said. `updateTargets`' gate only reached the dry run, through the
target's `doc`. So a file with panels off got a removed panel back on its next Update.

### The fix

`furnish` passes `panelFor` only for a target that `updateTargets` gave a `doc`. The switch is read once, and the
check and the apply both follow it.

### The arm and its mutations

- `docs/panels off (update)`: switch off, no panel listed and none drawn. `docs/panels on (update control)`: the
  same Update with the switch on lists the missing panel and draws it, so the off arm measures the switch.
- Mutation 1, the issue's: `updateTargets` without `panels &&` → `✗ docs/panels off (update) … (1 listed, 1 drawn)`.
- Mutation 2, this fix reverted (`furnish` always passes `panelFor`) → `✗ docs/panels off (update) … (0 listed, 1 drawn)`.

### Overlap

Open #3288 (#3137) has Update file offer the missing usage panels while panels are on, and Clean up remove them while
off. This builds on `main`. Whichever lands second rebases. That PR's census lists sets only while panels are on, so
the two agree on what the switch means.
