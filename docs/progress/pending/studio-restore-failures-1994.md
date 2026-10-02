## (2026-10-02) — every failed restore keeps the plugin's writes off, and Export rescues the file's brand (#1994)

**Status:** plugin UI only, under #1997's scoped freeze exception, widened by the owner's #1994 routing to
the Apply/Prune/Export enable state and the restore-error message (`apps/studio/src/main.ts`). No engine
change, no ENGINE bump.

### What changed

#1989 turned Apply Theme, Prune stale and the prune dialog's Delete off after a restore the engine refuses
in resolution. Two other failures left the boot demo loaded with those writes live, posting the demo over
the file's brand:

- **`rejected`**: a blob `brandTheme` refuses. `reduce` dropped it with no message at all.
- **`unreadable`**: a blob the host cannot deserialize (`restore-input-error`, #480).

Both now set the same state as #1989's (`restoreFailure`, which replaces `restoreRefusal`), so the three
controls go off and the error bar says why. Export design.md in any failed state writes the file's brand
that failed (`brandState` for #1989's case, the blob itself for `rejected`), with a note saying it is not
the brand on screen. Where nothing readable arrived (`unreadable`), its Download is disabled with the reason.

### The decision that was mine: what turns the writes back on

In `rejected` and `unreadable` the DEMO is what is loaded, and its edits rebuild cleanly. So #1989's rule,
"the first rebuild that resolves", would let a demo edit turn Apply back on, and Apply would then post that
edited demo over the file. These two clear only when a brand LOADS (the store's `origin` topic, which every
load invalidates). #1989's case keeps its rule, because there `brandState` is the file's own brand, and a
rebuild that resolves is that brand, fixed.

Both arrive asynchronously, so they are recorded only while nothing has been chosen (`provenance ===
bootProvenance`, #1197's guard). Once a designer has picked a brand, the writes post that brand, not the
demo, and turning them off would be wrong.

### Tests and mutations

`test-build-verdict.mjs`, the `#1994` arm. It covers all three failures, the two test gaps noted on the
issue (re-enabling by an example choice from the brand menu, and menu Prune re-enabling), a demo edit that
must not re-enable, both Export behaviors, and the guard.

| Mutation | Fails, all `#1994` |
|---|---|
| `rejected` never recorded | 5, including `posted [{"type":"prune","id":"prism3"},{"type":"apply-theme",…` |
| `unreadable` never recorded | 4, the same shape |
| `rejected`/`unreadable` cleared by a rebuild | 2: `a demo edit does not turn the writes back on` and the Export arm |
| Export back to `lastGoodInput` | 3: one per failure |
| Export left enabled with nothing readable | 1 |
| the "nothing chosen yet" guard removed | 1: `#1994 guard: …` |

**The trap for whoever re-verifies this:** the export dialog holds two buttons containing "Brand brief" (the
artifact choice and the import slot "↑ Brand brief…"). A loose `hasText` match is refused as ambiguous, and
a caught click then reads as the wrong artifact downloading. The locator is anchored (`/^Brand brief$/`).

### Review fixes (orchestrator, at `3e59156c`)

- **A load ends `rejected` and `unreadable`, and nothing else does.** The clear moved from an `origin`
  subscriber into `loadBrand` (the one caller of `loadInput`). The subscriber also heard "New brand"
  (`clearOrigin`), which loads nothing, and dropped the error bar and the Export rescue with it. The start
  screen it leads to shows the bar but not Export, and every way off the start screen is a load, so the test
  holds the bar on the start screen and then the load that ends the failure.
- **Test gaps closed.** The rejected arm now loads a brand afterwards (Apply comes back and posts that
  example), and the guard arm covers a late rejected restore as well as an unreadable one. A mutation the
  orchestrator ran (`rejected` never cleared) had survived 250/250.
- **Copy by kind (owner):** string 6 keeps "until a brand resolves" for `unresolved` and says "until a
  brand loads" for `rejected`. String 7 is one wording for every kind: "Off until a brand loads. This file's
  saved brand didn't open, and writing now would put the demo brand over it." Strings 8–10 are approved.

**A second trap:** a demo edit makes the next brand choice ask "Replace the current brand?" first (#1033),
so a test that edits and then picks an example has to answer the confirm, or nothing loads.

### Design tokens, too (owner, on #2007)

After a failed restore, Export's Design tokens Download is off as well, with a note: the tokens on hand are
the demo's. Mutation (left enabled) fails `#2007 <kind>: Export's Design tokens is off …` once per failure,
each showing `"file":"prism3.tokens.json"`, the demo's tokens. A control in the guard scenario, where nothing
failed, proves the same forced click does download.
