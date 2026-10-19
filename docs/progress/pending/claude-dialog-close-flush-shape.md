## (2026-10-19) — Dialog: the close button takes the flush shape

**Status:** Dialog def + test. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No executor
change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner QA (2026-10-19):** Dialog's header close drew FlushIconButton's round shape (a circle with a decorative
  edge). The owner wants the flush shape. FlushIconButton has a `shape: flush | round` axis, flush the default, so the
  fix is the nesting pin: `close` now nests `{ shape: 'flush', size: 'medium', state: 'rest' }`.
- The flush box is the 20px glyph with no padding, fill or edge, and the 44×44px hit area is code-side, so the drawn
  header may sit shorter than before; the title box carries the row's height. `lint-hit-target.ts` already holds the
  Dialog close as a code-side target (`FLUSH_NESTS`), so no gate change.
- **Test:** `#2609 dialog header` now expects the flush variant on all 15 members; pinning `round` again fails it by
  name.
