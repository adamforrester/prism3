## (2026-11-03) — Divider: bold and subtle strengths, the rule drawn as a stroke (#3382)

**Status:** Divider def + Accordion and Dialog nest variants + tests + the axis register. ENGINE minor (change note).
CONTRACT unchanged: no token name moves. `lint-executor-revision` passes with no raise, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q15 revised A (2026-11-03, on #3382):** the divider gets subtle and bold variants, each bound to its
  own border role, with no brand setting, and the rule is drawn as a stroke instead of a filled box.
- **The axis is `emphasis: bold | subtle`.** bold binds `color.border.secondary`, the color every divider drew before;
  subtle binds `color.border.primary`, the lighter edge. The routing named the axis `strength`, but `VARIANT_AXES`
  already has `emphasis`, which Badge carries as `subtle | bold` for the same question (how strongly a thing reads), and a
  second name for one question is the #756 failure the closed list exists to stop. The name is held for the owner on
  the PR; renaming is mechanical.
- **bold is the default and leads the axis**, so it is the code default and Figma's default member. Every placed
  divider, and the Accordion and Dialog dividers, keep their color. The two hosts now name `emphasis: 'bold'` in their
  nest variant; their plans differ from main only by that coordinate (diffed, 90 lines, nothing else).
- **The stroke.** The rule and the labeled divider's two lines paint the `border` slot with `strokeWidth` bound to
  `border-width.hairline`. Both executors draw strokes inside the node, so a box one hairline thick is covered edge to
  edge by its stroke: the pixels the fill drew. The border roles are scoped to strokes, so they now show in Figma's
  stroke picker and a designer can rebind the rule by hand. Code keeps painting a box, since CSS has no scoping.
- The code-only separator binding is renamed `separator.fill` → `separator.rule.border`: a two-segment key would read as
  `{emphasis}.{slot}` with emphasis `separator`, which the validator refuses.
- The Figma set grows from 7 members to 14. `component-axes.json` and `component-surface.json` accepted after reading
  each diff: a pure addition, so no rename ledger entry.

### Verification

- New `#3382 divider` arm in `test.ts`, with literal expectations: every rule and line in all 14 members is a hairline
  stroke with no fill, bold on `color/border/secondary` and subtle on `color/border/primary`, and every plain member
  stays one hairline thick across.
- Mutations, each failing by name: the rule back to `paintSlots: ['fill']` fails `#3382 divider stroke`;
  `subtle.border` bound to `color.border.secondary` fails `#3382 divider strength`.
