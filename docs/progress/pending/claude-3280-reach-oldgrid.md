## (2026-11-10) — lint-executor-reach: an update over the old 48px grid is measured too (#3280)

**Status:** gate only, so no engine bump, no artifact moves, no executor change and `CONTRACT_VERSION` is
unchanged. `EXECUTOR_REVISION` and `executor-reach.json` are untouched.

### What changed

`lint-executor-reach.ts` holds each new `EXECUTOR_REVISION` entry to the drawing: every set is drawn by the base's
executor and this tree's, in eight arms, and a set that moved must be named. Every arm started from a layout an
executor drew, so a revision whose only change is moving components an older plugin left out of place could not
be seen. #3274's revision 46 re-lays a provider-logo block still on the pre-#3142 48px grid. With its entry
emptied, the gate passed.

`reach-draw.ts` adds two arms, `oldgrid/default` and `oldgrid/levers`. Each builds the set with the base's
executor, then moves its single-component block onto the old fixed 48px pitch, each component keeping its row and
column. Then it runs the in-place update with each executor. Files still hold that layout, so a revision can meet
it. The pitch is written in the worker from that history, not imported from the executor's `OLD_SINGLE_PITCH`
(`docs/34`). A def that builds no single components starts this arm where the update arm starts.

### Tried and dropped: a stacked start

The first version piled every component onto one point, as the most general broken layout. It read `same` for
provider-logo, because #3145's re-lay keeps each component's row and column, and in a pile they all share one.
The old grid is a real start that a revision met.

### Measured on #3274's own tree (`0353e9ab`, base its first parent)

- `reach-draw.ts` on Provider logo and Icon: `oldgrid/*` reads `changed` for Provider logo and `same` for Icon,
  whose 24px glyphs the old pitch fits.
- The whole gate with `"46": []`, the issue's mutation: `✗ provider-logo: drawn differently by revision 46 than
  by 45 (oldgrid/default; oldgrid/levers), and no new entry names it`. It was the only set out of 60 (4m28s, four
  workers). Before this change the same run read `✓ clean`.

### Cost

10 arms where there were 8. The gate measures only when the revision rises.
