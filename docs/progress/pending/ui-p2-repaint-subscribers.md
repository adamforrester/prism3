## (2026-10-01) — UI redesign P2: host messages repaint through store subscribers (#1845, #1846)

**STATUS: PR open from `ui/p2-repaint-subscribers` (#1886).** UI and tests only, so no ENGINE bump.

**The end state.** Store subscribers. The tag switch is gone for host messages. The remaining legacy repaint calls are listed below and retire in S1/S13.

**What was wrong (#1845).** F3 made a host message a pure `reduce` plus `repaintsFor(msg)`, a list of `Repaint` tags, and a switch in `main.ts` turned each tag into a call. `test-host-session.ts` asserted the tag list. Nothing asserted the switch, so `case 'fileSetupRow': break;` put #870 back for the Set up file button and passed every gate: no browser suite sent `file-setup-result`. The Node test measured the list, while the defect lived in what the list turned into (docs/34 shape 16).

**What moved.**
- `repaintsFor` is now `topicsFor(msg, prev, next): HostTopic[]`, still pure and Node-tested. It says what changed, never who paints it. `HostTopic` is in `state/store.ts`, beside the brand topics: `host` (the bar), `host:detail` (the open detail row), `host:components`, `host:filesetup`, `host:styleguide` (each action's page row), `host:progress` (the build fraction's text swap) and `fonts` (the Typography page).
- `handleHostMessage` calls `reduce`, runs the brand effect, then `invalidate`s each topic in order. It names no painter. The `Repaint` type and its switch are deleted.
- Each painter subscribes to the topic it reads, beside its own code: `renderBar` to `host`, `syncApplyDetail` to `host:detail`, each `sync*Row` to its action's topic, the pending-pill text swap to `host:progress`, and `renderWorkspace` to `fonts`. Each keeps the guard the switch had: `barHost` for the chrome, and `isConnected` inside each row.
- `loadBrand` and the fresh-file start are not repaints. They write the brand session, so they are a separate pure `brandEffectFor(msg, prev, next)` that returns `'loadBrand' | 'startFresh' | null`. No message both loads a brand and invalidates a host topic.

**#1845 closed by (a), for every host topic.** `test:verdict` gains two arms. File setup: click, read `⋯ Setting up…` disabled, post `file-setup-result`, and read the button, the verdict pill and the absent pending pill back from the row. Font list: the typeface library's source column reads `On this device`, then `In this Figma` after `font-list`. Style guide already had its arm (#259). The two arms needed three `data-p3` hooks: `file-setup-row`, `file-setup-button`, `typeface-source`. The suite goes from 147 to 157 assertions.

**#1846.**
1. `test-store.ts` sets a refused `actionPalette`, renames, calls `syncIdentity()` and asserts the last persisted blob carries the rename and not the refused value.
2. `main.ts` checks `PageKey` against `NAV` the other way too: `everyPageHasANavRow` is `true` only if `Exclude<PageKey, NAV key>` is `never`, and otherwise its type is `{ missingNavRow: <key> }`.

**Mutations, each committed first and each failing by name.**
- M1, the issue's own: drop `subscribe('host:filesetup', …)`. It fails `a file-setup verdict re-enables the Set up file button`, plus two more in the arm.
- M2: drop `host:filesetup` from `topicsFor`. The same three fail, plus `file-setup-result: invalidates host, host:detail, host:filesetup` in `test-host-session`.
- M3: drop the `fonts` subscription. It fails `a font list from the host repaints the Typography page`.
- M4: drop `host:styleguide`. It fails `#259 the verdict re-enables the control on the page`.
- M5: drop `host:components`. It fails `<condition>: the button returns to "⊞ Build set"`, for every condition.
- M6: drop `host:progress`. It fails `<condition>: the BAR's pending pill shows the live fraction`, and the page's.
- M7: drop `host`. It fails `<condition>: the chrome bar carries the verdict`, and `#1663 an agent prune preview reads …`.
- M8: drop `host:detail`. It fails `<condition>: the detail row is open`.
- M9: `syncIdentity` persists `brandState`. It fails `a refused edit never reaches storage, even through syncIdentity`.
- M10: add `'tokens'` to `PageKey`. `typecheck` fails at `everyPageHasANavRow` with `{ missingNavRow: "tokens" }`.

**The legacy repaint calls that remain, and why.**
- The four tiers are untouched: `apply()` 17, `applyFull()` 44, `build()` 6 and `renderBar()` 31 call expressions in `main.ts` (counted from the TypeScript AST; a text grep reads 40 / 53 / 23 / 39 because it counts comments, and `build()` also matches `rebuild()`). The brand topics (`brand`, `origin`, `mode`, `page`) still have no subscribers. Subscribing the tiers to them now would paint twice per edit, and choosing among the tiers is the caller-picks-repaint model that S1's shell replaces. Each domain slice deletes its own call sites, and S13 deletes the tiers.
- The UI's own host writes still repaint by hand: 11 `setHost(…)` sites followed by `renderBar()`, `syncApplyDetail()` or a `sync*Row()`. These are the action buttons (Apply, Build, Set up file, Draw style guide, Prune), the pill's detail toggle, and the prune dialog's close, cancel, confirm and Escape. They are UI writes, not host messages, so they are out of P2's scope. They retire when S1's Figma menu and drawer own these actions, and S13 deletes whatever is left.
- The brand effects call `loadBrand` (whose repaint is the tiers) and `clearOrigin(); build()`. They go when S1 subscribes the shell to `origin`.

**Tradeoffs.**
- *Seven topics, not the plan's five.* With `host` alone driving both the bar and the detail row, `seed-info`, `prune-result` and `restore-input-error` would gain a `syncApplyDetail()`, which re-measures `--chrome-h`. Behavior was to stay identical, so the detail row got its own `host:detail`. The build fraction likewise got `host:progress`, because it is a text swap and its page row is not.
- *Subscribed once at module load, not per mount.* The legacy surfaces are re-minted on every render and have no unmount hook, so a subscription per mount would stack one painter per render. Each subscription is permanent, and each painter asks whether its surface is live, as the switch did. The new shell (S1) subscribes on mount and unsubscribes on unmount.
- *Order is preserved by `topicsFor`'s order, one subscriber per topic.* `host` comes before `host:detail`, which comes before the row topic. That is the switch's bar, then detail, then row. A second subscriber on a host topic runs in subscription order. That is fine for a surface that measures nothing, and the mode strip's `syncLast` is why it would not be fine for one that measures.

**Measured.** `npm run verify`: 67 of 67 gates PASS, 0 FAIL, 0 SKIP. `test:verdict` 157 of 157, `test-host-session` 78/78, `test-store` 40/40, smoke 3371 assertions, `test:start` all pass.

**Traps.**
- `test-host-session.ts` still cannot see a missing subscription (M1 leaves it 78/78). It proves the topic. `test:verdict` proves the paint. Neither is enough alone.
- M10 also trips `PAGE_COPY` and the renderer table (both `Record<PageKey, …>`), so a new page key already failed `typecheck` before this check existed. The issue's "would compile" held only for someone who also added copy and a renderer, which anyone adding a page does. The new check is the one that names the rail: it points at `NAV`, not at the two tables.
- `test-store.ts`'s `heard` record is keyed by the four brand topics, not by `store.Topic`, which now includes the host topics.

**Review round.** An independent review approved the PR and confirmed:
- behavior is identical, message by message;
- the AST call counts of every painter are unchanged between `main` and this branch;
- every claimed mutation fails by name, plus two the author hadn't tried (swapping painters between topics).

It corrected the legacy call counts above, which had been text counts. It also found that the bar-before-detail order is pinned only by `test-host-session`'s literal array. Reversing the order leaves `test:verdict` green. The ordering was already unpinned under the old switch, so this isn't a regression, and it is filed as #1890.
