## (2026-11-18) — Report a problem scrubs every brand the session held, not only the one on screen (#3883)

Closes #3883 (quality scan #3868, privacy). With "Include the brand's settings" off, the report promises the brand's name and token prefix are replaced with `[brand]`. The scrub list came from `lastGoodInput` when the report opened, but the Activity lines it scrubs are each operation's latest result, which survives a brand load, a rename and a failed restore. So a client's root, palette, custom mode and typeface names went into a report opened on any other brand.

### The fix

- `report.ts`: `ReportInput` gains a required `seen`, the words of every brand the session held, scrubbed whether or not the brand is included (minus the included brand's own words, which the report carries anyway). Required, so a caller cannot drop the earlier brands by leaving it out. `mergeWords` joins word lists: one entry per word ignoring case, a plain string over `{ whole }` (it scrubs at least as much), longest first.
- `store.ts`: a session list, `noteBrandWords` and `sessionBrandWords`. `initSession` starts it, and every good `resolve` (so every load, and every edit or rename that rebuilds) adds `lastGoodInput`'s words. It is never pruned.
- `main.ts`: a rename skips `rebuild()` (`syncIdentity`), so a post to the host is the one moment the identity an Activity line will carry is known. Every post that carries the brand (Apply, both prunes, the due read, and every Update file request through `panelBrand`) goes through `posted()`, which notes the words first. Not noting on `syncIdentity` was deliberate: it runs per keystroke, and the partial names (`Blu` on the way to `Bluebird`) would scrub ordinary text such as `blur`. `reportLend.read` adds the live `brandState` and a failed restore's brand to the list. After a failed restore it now includes the file's brand (`briefInput()`, as Export design.md does), not the boot demo.

A technical call worth a reviewer's eye: with the box ticked, an EARLIER brand's words are still scrubbed. The person agreed to include the brand on screen, not one they loaded before, so the fail-safe reading scrubs it.

### Tests

`test-report.ts` gains eight `#3883` arms. Three build the activity under a fictional client and the report under the harbor example: off, on, and the included brand keeping its own words, which is a control. One holds `mergeWords`. Two drive the real store (start on the client, rename the root through a rebuild, load an example), then check the session list and a report built from it. Two read `main.ts` as source, because it touches the DOM at import: no post carries a bare `lastGoodInput`, and the report reads the session list and `briefInput()`. On main's three source files 7 of the 8 fail by name. Mutations, each failing by name: drop the note in `resolve` (the store arm), ignore `seen` in `buildReport` (three leak arms), post Apply's bare `lastGoodInput` (the source arm). The floor rises from 71 to 109.

### Review follow-up (#3961)

The rename path was held by nothing that ran it: `posted()` lived in `main.ts`, which tests read only as source, so its body could stop noting and every test still passed. The note-then-return is now the store's `postedInput()`, and `main.ts` aliases it (`const posted = postedInput`). Three arms join: rename the root through `syncIdentity`, post, load an example, and the renamed root is still on the list; `initSession` notes the starting brand with no rebuild after it; and a source arm holds the alias and a held restore's brand (`heldRestore`, #3697 R9) on the scrub list, which errs on the privacy side while the host works from the file's brand. Mutations, each failing by name: `postedInput` stops noting, `posted` returns a bare `lastGoodInput` in `main.ts`, `initSession` stops noting, `heldRestore` dropped. The floor rises from 109 to 112.

### Its limit

An agent run that posts a brand the studio never held is outside this list. Its lines reach the report only as the plugin posts them, scrubbed by the patterns and the session's words.

### Found on the way, filed separately

The prism3 and aurora examples name a gradient `brand`, which makes the scrub re-wrap its own placeholder (`[[brand]]`). It is not a leak (it also takes out the engine's own `text.brand` role name), and is filed as #3957.
