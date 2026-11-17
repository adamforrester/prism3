## (2026-11-17) — The action note reads the resolved action palette (#3845, DRAFT, owner decision)

**What.** With `roleColors.action: 'accent'` and no `actionPalette`, the decisions log said
`action: the primary palette, by default — actionPalette is not set.`, which is false for that brand: the
`roleColors` line right after it says action uses `accent`. The two are schema aliases. This builds #3845's option A,
the recommended one: the action line is worded from `roleColors.action ?? actionPalette`, so either spelling gives
`action: uses the 'accent' palette instead of primary, as the brand sets.` The `roleColors` line still follows it.

**Owner decision pending (copy).** The options from #3845: **A**, word the note from the resolved palette (built
here, recommended: no new wording, and both spellings read alike); **B**, drop the default note when
`roleColors.action` is set and let the `roleColors` note stand alone; **C**, leave as is. This PR stays a draft until
the owner picks.

**Where.** The note keeps its place, before the `roleColors` pass, so a corpus brand's notes keep their order; that
pass still validates the name and throws on an undefined palette, as before.

**A pinned row changes with it.** `#1883 review row 15` held the default line on a brand with
`roleColors.action: 'accent'`, which is the line #3845 calls false. Its stated property (no action line claims a
palette for links or a rebased action) is kept: the default line is now held on a brand that rebases links only, and
the `roleColors.action` brand is held to the same "no `buttons and links`" check. Under B or C this row changes again.

**Measured.** A `test.ts` #3845 arm compares the action line under both spellings to the literal option-A line. On
main it fails by name (roleColors gets "by default"). Mutation, failing it by name: the template reads the lever
instead of the resolved palette (`uses the 'primary' palette instead of primary`).
