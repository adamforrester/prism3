## (2026-10-29) — Option rows: a 14px label, a cell that follows the label's line box, and the description in Figma (#3153)

**Status:** engine defs (Checkbox.Row, Radio.Row, Switch.Row), the token tree and the Figma `control` collection.
ENGINE minor (change note). CONTRACT 14.12.0 → 14.13.0 (MINOR, seven added paths). The component executor is unchanged,
so `EXECUTOR_REVISION` stays: the update rides the existing insert-and-move path (#2595).

### What the owner decided, and what was built on the recommendation

Q852 set one label size per row size for every brand, with no lever: the medium label moves from 16 to 14 and the control
stays at medium. The cell follows the label's own line box. Q853 A projects the description. The open questions went to
the issue as a Q-block, with renders, and each was built as its recommendation:

- **Q3153.1 A:** small and large step down too, to 12 and 16. The description is one step under the label, floored at
  12, because the body ladder has no 10px rung.
- **Q3153.2 A, revised during the build:** Switch.Row's label moves to 12 and 14, but its cell stays a fixed line-box
  height. The first proposal grew the cell to the track as on the option rows, and the #2894 ladder gate measured what
  that costs: a 32px track plus 8px pads makes the medium switch row 48px, off the 44px ladder. The track keeps
  overhanging its cell, so #1439 stays open.
- **Q3153.3 A:** Checkbox.Group and Radio.Group are unchanged.
- **Q3153.4 A:** CONTRACT MINOR, because paths are added and none removed or retyped.

### The construction, and why the inset is a token

The cell's line box became its floor (`minHeight`) and the cell hugs the control, so Figma computes max(control, line)
without help. The label's set-down, (control − line) ÷ 2 when the control is the taller, is a half of a difference,
which a Figma variable cannot express. So it is baked per rung as `control.size.*.label-inset`, beside the edge it is
taken from, as `inset` is for the switch thumb. The other route was a literal per brand written before projection (the
`applyMinWidthRatio` route). It would need the brand's type ramp in all three materialize chains and a literal top
padding in both executors, so it was not taken. The inset is 0 in every corpus brand at comfortable density (boxes
16/20/24 against lines 18/21/24). It bites at spacious density, where a 24px medium box sits beside a 21px line, and the
#3153 test measures it there. Like `line-box`, it carries no per-mode override: a literal may not re-value by mode
(#296), and the `control` collection is single-mode. So a `controlsByMode` brand (none in the corpus) keeps the default
mode's inset.

### Traps for whoever re-verifies

- `type.body.*` is no longer composites only, the same as `type.label.*` since #2586. A walker that reads each key
  under a body rung as a composite must skip `line-box`, as the #2266 test now does.
- The description paints through the `indicator` slot, Dialog's slot for its muted description. The projector's paint
  slots are a closed list, and a new `description` slot paints nothing (the validator says so by name).
- The #2894 update section rebuilds the pre-#2894 file from today's def. It now first puts the pre-#3153 row back
  (`before3153` in `test-update-apply.ts`), because its target is the row as #2894 built it.
