## (2026-11-16) — "Breaks library consumers" counts only the layers the update replaces (#3025)

**What.** `breakingOf`'s replace arm read `p.replacements`, the dry run's list of every matched member's type changes.
That list includes members the update never touches, and it is capped at `LIST_CAP` (500). So on a published set a
replacement was listed as breaking library consumers on a member skipped for a layer added or removed by hand, and on a
member refused because it would need replacing itself; and on a large set the list stopped at 500. The `layer` arm
(#2864) already avoids both with `removedLayers`. The replace arm now reads a new field, `replacedLayers`: per member,
uncapped, only non-structural members, and none of a member whose root would be replaced.

**Same shape, same words.** The entries keep `replacements`' `{ member, path, reason }` shape, so `breakingLine`,
`breakingSummary` and the per-set cap of 8 lines read them as before; no copy changes. `replacements` itself is unchanged:
it is still what the dry run's own list shows.

**Measured.** `test-update-apply.ts`: `published/replace skipped` (44 of Tag's 45, one member with a layer added by
hand), `published/replace refused member` (44, one member whose root reads as text) and `published/replace uncapped`
(Text Field, 696 replacements over 84 members, 500 in the capped list) fail on main and pass with the fix. Mutations,
each failing by name: the structural guard dropped → `/replace skipped`; the refused-member filter dropped → `/replace
refused member`; `breakingOf` reading `replacements` again → all three and `/member replaced`.
