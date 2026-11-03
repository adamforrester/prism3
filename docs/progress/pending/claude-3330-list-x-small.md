## (2026-11-03) — List and List item: an `x-small` size for tight rule lists (#3330)

**Status:** engine, built as the owner decided (Q1–Q4 all A). ENGINE minor (change note): List and List item each grow
from 9 to 12 members. No token is added or renamed, so CONTRACT is unchanged.

### What it does

- **The step (Q1 A).** `x-small`, Link's word for the rung below `small` (Q3179.1 A), on both defs, ordered
  `[medium, x-small, small, large]` as Link's is. The code enum keeps the ladder's own order.
- **Every type gets it (Q2 A).** Text `type.body.xs.default` (12/18, Q3 A). Bullet and number column `space.200` (16px),
  bullet `space.075` (6px, the same as `small`), and the icon type a 16px check (`icon.size.xs`) in a 24px column
  (`space.300`).
- **The line box.** There is no `control.size.xs`, so the marker box is one `type.body.xs.line-box` (18px) tall. That is
  checkbox-row's xs construction.
- **The item gap (Q4 A).** `space.050` (4px), named in `densitySpacing` like the other sizes. The 4px gap floor holds it at
  4 at compact; spacious steps it to 6. The pitch is 22px (18 + 4) against the design's 24.
- **Gates.** List and List item move from the canonical size set into Link's `x-small` superset in `lint-axis-values.ts`.
  `lint-rung-names.ts` already covered both defs and reads `x-small` as the `xs` rung. The surface, paint census and
  component-axes baselines are accepted. The `size` prop descriptions now give the four px sizes instead of "body small,
  medium or large".

### Verification

- `test.ts`: the #2319 list arms now read four sizes and 12 members, and a new `#3330 list x-small` arm reads the emitted
  px through whatever token the def binds at `x-small`, in four brands, against the owner's figures typed in the test.
- `apps/plugin/test-update-apply.ts`: a new `published/list x-small` arm, after Link's, holds that an Update of a
  published 9-member set adds the 3 x-small members and keeps the 9 in place (names, node ids and keys). The earlier
  list migrations (#2727, #3155) now build and update the 9-member shape a file held then, as Link's #2872 arm does.
- Mutations, each failing by name: see the PR's Ready comment.

### Noticed, not fixed

- `size.small.icon` binds `icon.size.sm` (20px), while `list-item.ts`'s header comment says the icon ladder is 16/20/24.
  Out of scope here (one concern per PR).
- `lint-rung-names.ts` passes when `size.x-small.text` is bound to `type.body.sm.default`, the same rung as `small`. The
  `#3330 list x-small` arm in `test.ts` catches that rebind by name; the rung gate does not.
