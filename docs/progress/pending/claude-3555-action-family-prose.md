## (2026-11-11) — Button and IconButton: 2.4.13 stated as intent, no reconciliation history on the page (#3555 MB3)

Part of #3555 (the 2026-11-11 metadata audit), batch MB3, the items left after #3601 (C8, C9) and without C2 (the
siblings' shared `whenToUse` needs per-sibling copy, the owner's). Also carries #3554 M-F's comment fix, which is in the
same file.

- **I9, WCAG 2.4.13.** Focus Appearance is AAA and no gate holds it, so the corpus states it as intent where it is
  stated at all. Button and IconButton stated it bare ("AAA — the ring is offset …"); both now read "AAA, intent — …",
  as FocusRing, Slider and the fields do. The other bare statements are in batch MB5's and MB6's files and move there;
  a gate arm for the rule waits for the docs gate, which batch MB7 changes.
- **V2, maintainer history on a shipped page.** Button's `appearance` prop ended "(Reconciled from
  solid/outline/plain.)", a note about the def's history that reached all three button pages. It is gone.
- **#3554 M-F, a comment.** `icon-button.ts` said the glyph binds "on-fill for filled, text for outline/text". Since #1471
  it binds the `icon.*` role, and the third appearance is `ghost`. The comment now says so. The batch's other item,
  dropping the unread `focus-ring` key, waits on #3506, as #3554's comment records.
