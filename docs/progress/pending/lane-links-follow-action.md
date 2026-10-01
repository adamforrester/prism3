## (2026-10-01) — Links follow `roleColors.action` when `linkPalette` is unset (#1895)

**The defect.** `theme.ts` resolved an unset `linkPalette` to `input.actionPalette ?? 'primary'`, the lever. `roleColors.action` rebases the action role later, in the roleColors pass, so a brand that moved action that way got accent fills and primary links. The #1496 comment already said links "default to following the action palette"; the code followed the lever instead.

**The decision.** Owner, 2026-10-01, on #1895: links follow the action color, a `roleColors.action` override included. An explicit `linkPalette` still wins.

**Why the fix is one line.** The link block already runs after the roleColors pass, so `roleToPalette.action` is final there. `linkPalette = input.linkPalette ?? roleToPalette.action` makes the resolved link name equal `r2p.action`, and modes.ts's existing `linkFollowsAction` path then anchors the link exactly as the action fill (`paAnchor ?? roleAnchorStep.action`). No new branch in modes.ts. The WCAG 1.4.1 distinctness check reads the resolved `linkPalette`, so `roleColors.action: 'neutral'` now carries the underline warning with it, as `actionPalette: 'neutral'` already did.

**What moves.** No corpus brand sets `roleColors.action`, so `regen` moves no `out/` artifact. `schema/lever-manifest.json` moves for the `linkPalette` description. The #1812 arm (every manifest default is what the engine does unset) still holds: `linkPalette` states no static default. Token contract unchanged.

**Tests.** A `#1895` block in `test.ts`, literals only: `roleColors.action: 'accent'` with no `linkPalette` puts `text.link.default` on the accent ramp in all four modes and at its floor (4.5:1, 7:1 in high contrast); `linkPalette: 'primary'` beside it wins; `roleColors.action: 'neutral'` fires the 1.4.1 warning, and pointing links at the accent clears it; brands with no `roleColors.action` are unchanged.

**Held, not changed.** The two notes that fire when `linkPalette` is set compare against the `actionPalette` lever ("the same palette as actionPalette" / "instead of actionPalette '…'"). They stay literally true, so this PR leaves the approved copy alone. With `roleColors.action: 'accent'` and `linkPalette: 'primary'` the first one reads "same palette as actionPalette" while links and action fills differ. Whether those notes should compare against the resolved action palette is a copy call for the owner.

**Filed, not fixed.** #1896: `actionAnchorStep` has the same lever-versus-resolved split. `roleColors.action: 'accent'` anchors the action fill at primary's step, while `actionPalette: 'accent'` anchors at the accent's own shade.
