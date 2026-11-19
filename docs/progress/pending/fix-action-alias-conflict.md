## (2026-11-19) — Two action-palette settings that disagree are refused (#4207)

Found by the 48-hour code-review audit (#4104). `actionPalette` and `roleColors.action` are schema aliases, and
`brandTheme` resolves `roleColors.action ?? actionPalette`, so a brief that set them to different palettes was accepted
and `roleColors` won without a word. The action note then read "the primary palette, by default — actionPalette is
not set" about a brand that had set it.

Owner decision A (2026-11-19): refuse the brief, naming both. The refusal sits at the top of the action-role block,
before the note, so the note can never describe a disagreement again. It fires only when both are set and differ:
the same palette under both names is one instruction said twice, and passes. The message is DRAFT.

What this PR does not do: the other half of the issue's recommendation, wording the primary line from what was
authored ("by default" only when neither lever is set), is #3284's change, open as #4053 on the same note. This PR
leaves those lines alone so the two merge cleanly in either order. #4207 closes when both have landed.

Arms: neither, lever only, roleColors only, both equal (all build), and both disagreeing in each direction (refused,
naming both). Run against main's `theme-brand.ts`, the two disagreeing arms fail by name.
