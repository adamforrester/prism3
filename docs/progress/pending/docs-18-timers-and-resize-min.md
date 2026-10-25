## (2026-10-25) — docs/18: the main thread has timers, and the resize minimum is 70×0 (#2950)

Two lines of `docs/18` disagreed with the code or with Figma's reference. Docs only.

- **§1, `setTimeout`/`setInterval` on the main thread: ❌ → ✅.** `apps/plugin/src/main.ts` calls `setTimeout` on the main thread in three places: the agent link's mailbox poll, `fileKindApi`'s `after`, and `breathe()`. The poll works on real hosts. Figma's "How plugins run" page reads as if timers were missing: browser APIs "like `XMLHttpRequest`, `fetch`, `setTimeout`, and the DOM are not *directly* available from the sandbox". The browser's timers are not, but the sandbox provides its own. `figma.closePlugin`'s reference says it cancels "any `setTimeout` or `setInterval` timers", and `@figma/plugin-typings` (1.141.0, `index.d.ts`) declares all four timer functions as main-thread globals. The row now says so, with a footnote citing all three.
- **§8 reason 2, "~100 on `resize`" → 70×0.** `figma.ui.resize`'s reference says "The minimum size is 70x0", the same as `showUI`'s documented minimums (width 70, height 0).

**Not changed here.** The same typings declare a main-thread `fetch`, and Figma documents it as a global function, so the table's network ❌ row may also be stale. #2950 treats that row as correct, so it is filed on its own as #2999 rather than folded in.
