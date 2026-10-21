## (2026-10-21) — Dialog: a footer with equal-width buttons, `footer=fill` (#2880)

**Status:** Dialog and Button group defs, tests, baselines. ENGINE minor (change note). CONTRACT unchanged: no token
path moves. No executor change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q492 B (2026-10-20, on #2877), built on #2880 with Q?1–Q?5 all A (2026-10-21):** a fourth Dialog
  footer, `fill`, whose buttons share the width equally (a filter panel's Clear all | Apply).
  - **Q?1 A:** the value is `fill`, the Button group's own word: `footer=fill` nests `layout=fill`, as `inline` and
    `stacked` nest the layouts of the same name.
  - **Q?2 A:** order `inline | stacked | fill | none`, at every placement: 12 center + 4 bottom + 4 full + 4 end = 24
    members, up from 18 (#2877's `end` placement landed first). Additive: the `none` members move one grid column, and nothing is renamed, dropped or retyped.
  - **Q?3 A:** the halves stay equal at every width and a long label wraps inside its button. The Button group's
    `fill` code line is now `flex: 1 1 0; min-width: 0`: with `min-width: auto` a long label widened its button and
    wrapped the row, which also affected the standalone group. The docs say to pick stacked for long labels.
  - **Q?4 A:** one to three buttons, as the `actions` slot allows; two is the case it is for.
  - **Q?5 A:** Cancel then Save, with Cancel a Button.Neutral where the file has it (`nestItemPrefers`).
- **Reused, nothing new:** a third `nest-fixed` part of the Button group, `actionsFill` at `{ layout: 'fill' }`, beside
  `actionsInline` and `actionsStacked`. No new part kind, token or schema field.
- **A gate collision, recorded rather than renamed:** Dialog's paint key `fill` (the panel surface) now spells a
  `footer` value, so `lint-paint.ts`'s provenance arm read it as axis-led. It is the paint slot, not the value, the
  same case as `list-item|icon`, so it is a named `PROVENANCE_EXCEPTIONS` entry. Renaming the key would move the
  component's token surface for no gain.
- `component-axes.json` and `component-surface.json` accepted through their gates; the paint census
  (`lint-paint.ts --accept`: 6 members, 24 paint assignments added) and the studio's committed component catalog
  (`gen-component-catalog.ts --write`) moved with them; the studio's four-set cost check counts Dialog at 24.

### Gates

- `#2609 #2877 #2880 dialog: 24 members …` and `#2609 dialog axes` (`test.ts`) hold the order and count as literals.
- `#2609 #2661 dialog footers` (`test.ts`): fill nests one Button group at `layout=fill`, alone in its footer.
- `#2661 … a Dialog footer …` (`test.ts`): the fill footer's Cancel is Button.Neutral where the file has it, on both
  executors.
- `scrim/drawn`, `scrim/full` and `rollout/dialog scrims` (`test-canvas-furniture.ts`): 20 scrims, not 15.
- `published/dialog fill additive` (`test-update-apply.ts`): a published 18-member Dialog updated to 24 adds the six
  fill members and lists nothing as breaking library consumers. #2877's `published/dialog end additive` now reads
  20 → 24 with four end members.

### Sequencing with #2877

#2877 (the `end` placement, PR #2881) landed first and also edited `dialog.ts` and the same baselines. This branch
merged main, gave the end placement its fill member, and re-accepted the baselines on top of it.

### Found, filed

Dialog's one-variant paste unit sits 76 B under the `#1798` ceiling on main (37,724 of 37,800 B): #2884.
