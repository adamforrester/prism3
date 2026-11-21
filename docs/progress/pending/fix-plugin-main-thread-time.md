## (2026-11-19) — Plugin main thread: one token tree per Apply Theme, Update file's targets paced, component searches skip hidden instance children (#4230, #4237, #4160)

**What.** Three fixes from the 2026-11-19 performance and Plugin API audits, all about how long the plugin holds Figma's
main thread, where the panel and the canvas cannot answer:
- **#4230.** Apply Theme's seven plans each started with `buildTree(theme)` over the same theme: about nine builds, 129
  of `themePlans`' 158 ms. `themePlans` now runs inside `withSharedTree` (`packages/engine/tree.ts`), which builds a
  theme's tree once for that synchronous run. Measured here: about 200 ms → 35–40 ms per brand.
- **#4237.** `updateTargets` (`main.ts`), which the Update check, the apply, Record as built and Adopt call first,
  built the brand's theme once per def through `materializeForBrand`, and projected every set in one turn. It now
  takes `materializerFor` once, and hands the thread back once `PACE_MS` of projection has run (`pacer`). Draw specs'
  loop takes the materializer once too. Stand-in suite, longest stall, main → this branch: check 408 → 80 ms,
  apply 339 → 148 ms, capture 351–418 → 79–82 ms, adopt 369–416 → 76–86 ms. Each answer digest is unchanged.
- **#4160.** `figma.skipInvisibleInstanceChildren` is set around each page's component search (`component-search.ts`,
  used by `run-read.ts`'s page search and the read after open) and put back in a `finally`.

**The tree cache is scoped on purpose.** A global `WeakMap` keyed by the theme would have saved regen and the studio
the same cost, but a caller that changes the tree it was given (an engine test plants an alias fault in one) would then
change every later caller's. Inside `withSharedTree` the scope is one synchronous call that only reads. A test runs
every Figma emitter over a deep-frozen shared tree, so a builder that wrote to it would fail. regen and the studio's
exports could opt in the same way later.

**#4160's scope.** The audit's second half (one name index per run for `update-apply.ts`'s three lookups) was already
done by #3177: every lookup the Update run makes is answered from one paged read, and the stand-in counts 0 whole-file
searches for the check, apply, capture and adopt. The flag applies only to a search whose every type is `COMPONENT` or
`COMPONENT_SET`, since neither can sit inside an instance. A search for an instance or a tagged frame runs as before.
The executor's own searches (`write-components.ts:1956, 1974, 3807`) are left alone: changing them would raise
`EXECUTOR_REVISION`, and every built set would then read as due. That trade-off is flagged on #4160 for the owner.

**Held by counts, not timings** (`apps/plugin/test-main-thread.ts`): `treeBuilds()` moves by one per `themePlans`; the
shared plans equal the plans built apart, byte for byte; a component search sees the flag on, an instance search sees
it off, and a throw puts it back; `updateTargets` awaits a tick in its loop. The brand's theme is built once per Update
check and twice per apply over the 50-set stand-in, never once a set: `brandLeverBuilds()`, arm `update/levers-once` in
`test-open-large-file.ts` (a source-text arm alone let `materializerFor(brandInput)(d)` in the loop pass). Times are
printed, not asserted.
