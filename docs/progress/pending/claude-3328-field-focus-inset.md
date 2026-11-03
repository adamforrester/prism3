## (2026-11-03) — Field focus drawn inside the field, at its own radius (#3328)

**Status:** engine + plugin, built as the owner decided (Q3328.1 A, the "A′" geometry; Q3328.2 A). ENGINE minor
(change note). `EXECUTOR_REVISION` 48 → 49, reaching the nine sets that draw a field ring. No token moves, so
CONTRACT is unchanged.

### What changed

- **The focus sits inside the field.** A focused field's 1px border already took `border.focus`. Its focus ring used
  to sit just outside it (`focus.ring.offset-field`, 0, plus the ring's own 2px stroke compensated outward), with a
  concentric corner written as a literal: the reference brand's 1px field corner became an unbound 3. Now the ring sits
  one border width inside the field on every side, so the border plus the ring's 2px band read as one 3px edge, with
  no outer frame and no layout change.
- **The mechanism is `PartDef.borderInset`,** a binding key for the host border the ring sits inside. It projects as
  `absoluteBorderInset`. Where it resolves above 0, both executors place the ring that far inside the host, skip the
  outward `strokeInset` compensation, and bind the ring's four corners to the host's own corner variables. So the
  radius is the field's token, not a number. Where it resolves to 0, the ring is placed as before. A key rather than a
  flag, so Counter can follow its axis: `outline.ring-border` is the hairline and `ghost.ring-border` is
  `border-width.none`, so ghost keeps its 2px outside ring (Q283.10 A).
- **Controls:** Text field, Password field, Search field and Card number field (through `makeTextField`), Textarea,
  Select, the Code input cell, and Counter (outline).
- **Underline Field style is unchanged.** `applyFieldStyle` drops `borderInset` under underline. That edge has no side
  border to sit inside, and its inline padding is 0, so an inside ring would draw over the value. The ring stays
  outside at the control offset (#2695 Q3). This includes a Search field whose own style is underline. **Held for the
  owner on the PR:** the decision said "Search field (both edge styles)", which this reads as both of its edge sources
  (its own style lever and Field style) for the outline edge.
- The `focus` accessibility lines on Text field, Textarea, Select, Code input and Counter now describe the inside
  indicator for code: an outline with a negative offset of the border width plus the band width.

### Traps

- **The paste shell has 11 B of headroom.** The ring code runs in every paste chunk's shell, and #1798 caps the
  indivisible unit at 37,800 B. Main was at 37,718, and this change landed at 37,789 after trimming four of the ring
  loop's paste-side miss strings (the plugin executor keeps its long ones). The next shell addition will need the
  ceiling argued, or bytes found elsewhere. icon-button re-pins from 17 to 18 chunks.
- The corner binding on an instance is a host write that has not yet been run on a live Figma host. The shim reads it
  back. The first Update of a file holding a focused field is that probe.

### Verification

See the PR's Ready comment for the full `npm run verify` table and every mutation. Two new `test.ts` arms:
`#3328 field focus geometry` (both executors, 8 controls) and `#3328 field focus 2.4.13` (8 controls × 5 brands ×
4 modes against literal 3:1 and 2px). `lint-absolute-inset.ts` gains `MUST_SIT_INSIDE_BORDER`.
