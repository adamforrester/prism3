## (2026-11-19) — Studio state fixes from the overnight audit: two prune leaks, one count agreement, one resolve per edit, a deferred reveal, an Undo load test (#4208, #4209, #4227, #4234, #4235)

Five findings from the #4104 audit. They share one root: Studio state code where a small path was written by hand beside a shared one (a hand-written prune, a second resolve, a layout read in the wrong place), or was left untested.

### What changed

- **#4208: two setters still left `typography: {}` behind.** `setCaptionSize` ran `brandState.typography ??= {}` before its clear path, and `setTrackingPin` pruned `tracking` but not the emptied `typography`. Both now write through `setPath`, whose `undefined` already prunes every parent it empties (#3878). The #1071 arms in `test-type-input.ts` cover both setters now. On `main` three of the new arms fail.
- **#4227: "1 set hold hand edits".** `keptSub` now inflects the verb, as `offSub` below it does. One arm in `test-update-file.ts` covers n = 1 and n = 2.
- **#4209: no test held that Undo load saves the restored brand.** The code was right. A new `test-store.ts` arm stashes, loads, runs `restoreInput`, then reads the stored copy back through `restoreSession`. Its mutation, a `restoreInput` whose resolve skips the write, fails `#4209 Undo load, then reload: …` by name.
- **#4234: every edit resolved every mode twice.** `resolvePreview` takes an optional third argument, the resolved modes, and its default resolves them as before, so the MCP and the engine's tests don't change. The store passes `resolvedModes(t)`, the verdict's per-theme cache, so the verdict reads the copy the rebuild made. `verdict.ts` exports `resolveRuns()`, the cache's miss count, so a test can count resolves without a profiler.
- **#4235: the Palettes reveal forced a layout on every edit.** `revealGroup` read two boxes in the frame callback that had just rebuilt the preview. `revealGroupAfterRepaint` (in `follow-edit.ts`) defers the eased reveal one frame, which reads the layout the browser has already drawn. Under reduced motion the jump stays in the edit itself.

### The tradeoff in #4235

The first attempt deferred every reveal. The Q4 trial's arm `Q4: under reduced motion the reveal asks for one instant scroll, in the edit itself` failed. That arm is right: a deferred jump paints one frame at the old scroll and then jumps, which is the flicker reduced motion exists to avoid. The eased glide steps once per frame anyway, so waiting one frame before it starts costs nothing visible. Under reduced motion the read still forces a layout. That is the price of landing the jump in the same frame, and it applies only to people who chose reduced motion.

### How the #4235 arm reads a forced layout

A layout read can't be timed directly. Instead, the arm counts frames, notes the last frame in which the document changed, and logs each read of a palette's box. A MutationObserver records changes, and the arm calls `takeRecords()` at the read, because a change made earlier in the same callback has not been delivered yet. A read in a frame where the document has already changed has to lay out first. The arm wants every reveal read to land in a frame where the document has not changed yet.

An earlier draft stamped each palette element with the frame that inserted it. That failed after the fix too, because `render()` keeps some palette elements in place, so they were never inserted and had no stamp. Watch for that if you rework this probe.
