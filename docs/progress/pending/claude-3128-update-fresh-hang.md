## (2026-10-28) — Update file: a fresh file's update-everything run no longer stops at its second set (#3128)

**Status:** plugin and panel fix, a new plugin test (`test-update-fresh.ts`) and a `test:chrome` arm (section 10). ENGINE
patch (change note): no committed artifact, emission or component surface moves. The executor is unchanged, so
`EXECUTOR_REVISION` stays.

### What the owner hit

A new, empty file, the example brand, Update file with every box ticked. Set up file landed, the theme landed, and Icon's
45 components landed. Then the run sat on BrandMark for good: no `brand-mark/*` component, no as-built ledger, and a
main thread that still answered the mailbox in 1 ms.

### Diagnosis: not BrandMark, and not a promise in the plugin

Nothing in BrandMark's build hangs. In the shim it builds in about 150 ms. BrandMark is simply the **second** set in
catalog order, the first one the panel's build queue (`runAfterResult`, #2700) posts **after** another set's result.

- `buildComponents` posts its verdict, then awaits the settle probe (`verdictBeforeSettle`, #908): console telemetry
  that writes nothing.
- The run guard (#1957) holds `build-components` until the whole function returns, so it holds through the probe.
- The queue posts BrandMark the moment Icon's verdict lands, inside that window. The plugin answers `refused`.
- The panel's reducer keeps a request refused behind the panel's own run `pending`, waiting for that run's verdict. Icon's
  verdict had already arrived, so nothing came. The queue's run never ended and Components read BrandMark as building
  for good.

The empty ledger fits: Icon is an `emitAsComponents` def, and its result's `id` is `''`, so `recordSets` never runs for it.

The same window also refused Update file's `update` step when it followed the sets step, and a Build clicked straight
after a single build's verdict.

The behavior reproduces through the real `main.ts` in the shim, at main and at the owner's build (`11175559`, the last
merge before the build's 11:26Z stamp). Each set is posted once, the moment the last answer lands. Icon is answered;
BrandMark is answered `refused`.

### The fix

- **Plugin (`run-guard.ts`, `main.ts`).** The guard gains `release(cmd)`, and `buildComponents` releases the build's guard
  right after its verdict posts. Everything after that point is telemetry. Holds are now tokens, so a run's own `finally`
  never releases a later run's hold. A next build can now start while the last one's settle probe is still sampling.
  That probe's number then measures some of the next build's work too, which is acceptable for a diagnostic.
- **Panel (`apps/studio/src/main.ts`).** No step of a run may wait on a verdict that will not come. When the host refuses a
  set the build queue posted, `runRefused` ends the run. That set is recorded as failed with the host's words, the rest
  as not built, and the Build set row stops running. Update file's sets step already ended on the same refusal.

### Tests

- `apps/plugin/test-update-fresh.ts` (in the plugin's `test`). A fresh file, Set up file, then every buildable set in
  the panel's catalog order, each posted once, straight after the last answer. Each must be answered by a
  `component-result`, and Update file's `update-sets` straight after the last must be answered by a
  `component-update-result`. Mutation: the `guard.release` call removed → `sets/brand-mark: answered by
  component-result` and `update/after the last set: …`, both refused.
- `test:chrome` section 10. Two sets ticked; the first lands and the second is refused. Update file must be free, the
  Build set row must not be running, and its summary must carry the host's words. Mutation: the `runRefused` call in
  `handleHostMessage` removed → `#3128: a set the host refuses ends the run…`.
