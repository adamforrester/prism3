## (2026-11-12) — The Counter's minus and plus glyphs take the on-fill ink on its disabled fill (#3554 Q-FL1 A, Q-FL1.1 A)

**STATUS: built, owner decisions 2026-11-12 (Q-FL1 A, refined by Q-FL1.1 A).** Engine `minor`, ENGINE_VERSION {{ENGINE_VERSION}}.

**What moved.** Since Q-CC10 A (#3612) a disabled outline Counter paints `color.disabled.fill`, and its value takes
`color.disabled.on-fill`. The nested FlushIconButton glyphs still drew `color.disabled.icon`, the page ink, at about
2.1 to 2.6:1 on that fill. They now draw `color.disabled.on-fill` (3.04:1 or more in every corpus brand and mode). Ghost
draws no fill and is unchanged. Six members move (outline × three sizes × disabled, two glyphs each).

**The mechanism: a host-to-nest paint, a first.** `PartDef.hostInk: 'icon'` on a `nest` part. The projector resolves
the host's own `icon` slot at each coordinate, exactly as a glyph part of the host would, so the cross-cutting disabled
branch asks for `disabled.icon.on-fill` where the host's disabled fill lands. Where it resolves, the ink is written as
`descendantFills` on the `NESTED_INSTANCE`; where it does not, nothing is pushed. The Counter binds only
`disabled.icon.on-fill` (no plain `disabled.icon`), so ghost pushes nothing and keeps the flush button's own ink. The
schema refuses `hostInk` off a building nest, on any slot but `icon`, beside `fixedPaint`, and on a def that keys no
icon ink.

**No executor code moved.** Both executors already paint `descendantFills` on every VECTOR inside any node, a
`NESTED_INSTANCE` included (#2380), and both apply the nest's swap override (`icon: minus`/`plus`) before the paint, so
the ink lands on the swapped glyph. `lint-executor-revision.ts` passes with `EXECUTOR_REVISION` unchanged.

**Gates taught.**
- `test.ts` `#3554 counter/host-ink`: per member, literals from the decision (outline disabled pushes
  `color/disabled/on-fill` on both nests; every other member pushes nothing), the ground read off the plan, and WCAG
  contrast computed from the hexes in every corpus brand and mode against 3:1. Plus four `hostInk refuses …` arms.
- `lint-paint.ts` arm 6, "host ink": a nest carries `descendantFills` only through `hostInk`, and each pushed ink's
  token-tier `against` names the fill its nearest painted ancestor carries, in every brand and mode.
- `test:roundtrip`: the spec readback already claims each part's `icon` color and reads it off the VECTORs inside the
  host instance; the Counter's decrement and increment are now claimed at outline/disabled, and a named arm reads the
  pushed ink back off the built shim.

**Mutation, failing by name.** See the PR body.

**What this does not settle.** In Figma the ink is a per-instance override: a designer who sets one nested button back
to `rest` on a disabled Counter keeps the on-fill ink until the host is updated (the cost Q-FL1.1 A accepted).
