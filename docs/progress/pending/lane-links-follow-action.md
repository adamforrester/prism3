## (2026-10-01) — Links follow `roleColors.action` when `linkPalette` is unset (#1895)

**The defect.** `theme.ts` resolved an unset `linkPalette` to `input.actionPalette ?? 'primary'`, the lever. `roleColors.action` rebases the action role later, in the roleColors pass, so a brand that moved action that way got accent fills and primary links. The #1496 comment already said links "default to following the action palette"; the code followed the lever instead.

**The decision.** Owner, 2026-10-01, on #1895: links follow the action color, a `roleColors.action` override included. An explicit `linkPalette` still wins.

**Why the fix is one line.** The link block already runs after the roleColors pass, so `roleToPalette.action` is final there. `linkPalette = input.linkPalette ?? roleToPalette.action` makes the resolved link name equal `r2p.action`, and modes.ts's existing `linkFollowsAction` path then anchors the link exactly as the action fill (`paAnchor ?? roleAnchorStep.action`). No new branch in modes.ts. The WCAG 1.4.1 distinctness check reads the resolved `linkPalette`, so `roleColors.action: 'neutral'` now carries the underline warning with it, as `actionPalette: 'neutral'` already did.

**What moves.** No corpus brand sets `roleColors.action`, so `regen` moves no `out/` artifact. `schema/lever-manifest.json` moves for the `linkPalette` description. The #1812 arm (every manifest default is what the engine does unset) still holds: `linkPalette` states no static default. Token contract unchanged.

**Tests.** A `#1895` block in `test.ts`, literals only (the note arms are above): `roleColors.action: 'accent'` with no `linkPalette` puts `text.link.default` on the accent ramp in all four modes and at its floor (4.5:1, 7:1 in high contrast); `linkPalette: 'primary'` beside it wins; `roleColors.action: 'neutral'` fires the 1.4.1 warning, and pointing links at the accent clears it; brands with no `roleColors.action` are unchanged.

**The link notes now compare against the resolved action palette (owner decision 2026-10-01).** The two notes that fire when `linkPalette` is set compared against the `actionPalette` lever. With `roleColors.action: 'accent'` and `linkPalette: 'primary'` that printed "the same palette as actionPalette" while links and action fills differed. Literally true, but misleading. The owner chose to compare against `roleToPalette.action` and say "the action color":

- before: `link color: '<p>', the same palette as actionPalette, as the brand sets.` / after: `link color: '<p>', the same palette as the action color, as the brand sets.`
- before: `link color: links use the '<p>' palette instead of actionPalette '<a>', as the brand sets.` / after: `link color: links use the '<p>' palette instead of the action color '<a>', as the brand sets.` (`<a>` is now the resolved action palette.)

`lint-voice.ts`'s two producer patterns follow the new wording, and its sweep gains the exact case (`roleColors.action: 'accent'`, `linkPalette: 'primary'`). `test.ts` asserts both notes as literals on that case and its same-palette twin.

**The anchor arm (independent review).** The accent in the first test sits mid-ramp, so a mutation that dropped modes.ts's follow-action anchor (`const linkAnchor = theme.linkAnchorStep;`) survived: both anchors picked the same link steps. Two far-lightness brand colors close it. `roleColors.action: 'deep'` (l 0.25) puts the link on deep.550 in light and deep.700 in hc-light, and `'pale'` (l 0.92) on pale.450 in dark and pale.300 in hc-dark. Under the mutation they land on 850 and 050. Those literals also carry #1896, so fixing #1896 moves them along with the fill.

**Wording fixed in passing (review nits).** The `linkStateRungs` description said "the resting link and its focus follow the action palette", which is wrong once `linkPalette` is set; it now says "the link palette". The skill row says "Defaults to following the action color" without naming `roleColors`, which the skill's front matter lists as out of scope.

**Filed, not fixed.** #1896: `actionAnchorStep` has the same lever-versus-resolved split. `roleColors.action: 'accent'` anchors the action fill at primary's step, while `actionPalette: 'accent'` anchors at the accent's own shade.
