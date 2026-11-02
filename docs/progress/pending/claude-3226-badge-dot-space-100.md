## (2026-11-01) — Badge's presence dot binds space.100: 8px in every brand, density-free (#3226)

**Status:** engine, built as the owner decided (Q3226.1 A). ENGINE minor (change note): the Badge `type=dot` binding
moves in `out/components/` and the component surface. No token is added or renamed, so CONTRACT is unchanged.

### What it does

- Badge's `dot-size` binds `space.100`, the inline status dot's token (#3199), in place of `control.size.sm.dot`. So
  Badge has one dot size across its types, 8px in every brand at every density.
- Why it moved: `control.size.sm.dot` is the radio's inner mark, set by the brand's radio-dot share (#3086). In the
  reference brand that emits 12px, which made a notification dot 50% bigger than the def's own notes said. The radio
  share is a form-control choice and has no business sizing a presence mark. The cost, accepted in the decision: the dot
  no longer shrinks to 6px at compact.
- The def header and the `dot-size` comment now say "8px, `space.100`, the inline dot's size, density-free", and the
  `notes.unverified` line about borrowing a control token is gone, because it no longer does.

- **Mechanical fallout, flagged on the PR:** the Radio dot size lever's description ended "Badge dots follow it.", and
  the two skills' `radioDot` rows said the same. That is false now, so the sentence is gone from the lever (and the lever
  manifest), and both skill rows say the badge dot has a size of its own. `prism3-build-component`'s row also named
  List's bullet, stale since #3155; the rewritten clause names Radio's dot alone. `test-component-groups.ts` now holds
  that Radio.Control is the one def binding `control.size.*.dot`.

### Verification

- `test.ts`: the `badge dot` arm reads `space.100`. A new arm, `#3226 badge dot`, reads the emitted px through whatever
  token the def binds, in the five emitted brands and in three example inputs rebuilt at compact, comfortable and
  spacious (14 rows, a literal count), and holds each at the owner's 8px.
- Mutation: `dot-size` rebound to `control.size.sm.dot` fails `#3226 badge dot` by name, listing the reference brand at
  12px and every compact build at 6px.
- `regen.ts`: `out/components/badge.md`, `specs.json`, the maintainer schema and the token-usage report move with the
  binding, and nothing else.
