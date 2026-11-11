## (2026-11-10) — lint-rung-names: two sizes on one mid-tier rung fail unless named (#3374)

**Status:** gate only, so no engine bump, no artifact moves and `CONTRACT_VERSION` is unchanged. No def changed.

### What changed

- **Arm 2D.** Arm C checks that a size ladder never goes down the tier, and deliberately admits a repeat, so a
  def that clamps against a shorter tier is not refused. That also admitted #3374's mutation: List item's
  `x-small` text rebound from `type.body.xs` to `type.body.sm` puts `x-small` and `small` on one 14px rung, and
  the gate passed. Now a repeat passes on its own only as a clamp, on the lowest or highest rung the family emits
  (read from the emitted trees, any brand). A repeat with a rung on both sides fails by name unless
  `RUNG_REPEATS` names the def and family with the decision behind it. Entries are checked both ways, so a stale
  one fails. Step families (spacing, border width) are out of scope: shared gaps are ordinary there.
- **Not a per-word map.** The issue asked whether `x-small` must bind `xs`, `small` `sm`, and so on. The corpus
  says no: Button binds `small` to `sm` but its icon one rung down, Link's icon is `xs` at three sizes, and the
  fields' height floor is `md` at small and medium. A map would need an exception per def. A repeat check sees the
  same defect without one.

### What the corpus holds

Measured over every def before writing the arm: 12 tier families hold a repeat. 8 are clamps (the fields' and Accordion's
`size.md.min-height` floor, the only rung that family emits; Link's `icon.size.xs`, the lowest; Code input's
`radius.sm`, the lowest the radius family emits on the ladder). 4 are mid-tier, and each def's own comment cites
the owner decision: the three Flush icon buttons' 20/20/24 glyphs (Q283.13 A) and Card number field's mark tile
(#2429 §2). Those 4 are the `RUNG_REPEATS` entries.

### Mutations, each failing by name

- #3374's own (List item `x-small` text on `type.body.sm`): `list-item: in tier family 'type.body.*.default' sizes 'x-small' and 'small' both bind sm`.
- Link's `x-small` on `sm` (the issue's "same gap"): four failures, one per Link type family.
- Card number field's entry removed: `card-number-field: in tier family 'icon.size.*' …`.
- An entry with no repeat behind it (`radius.*` on Card number field): `STALE ADMISSION: RUNG_REPEATS …`.
- The admission check made always-true, with #3374's mutation in place: no failure, so arm D is what catches it.
