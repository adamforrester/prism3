---
engine: minor
---
#1895: an unset `linkPalette` follows the palette the action role resolves to, `roleColors.action`
included (owner decision 2026-10-01). It followed the `actionPalette` lever, so a brand that moved action
with `roleColors.action` got action fills on the new palette and links still on primary. `theme.ts` now
resolves `input.linkPalette ?? roleToPalette.action`, and modes.ts then takes its existing
link-follows-action path, so the link anchors as the action fill does. An explicit `linkPalette` still
wins. No corpus brand sets `roleColors.action`, so no `out/` artifact moves; `schema/lever-manifest.json`
moves for the `linkPalette` description, which now says links follow the action color including a
`roleColors.action` override. The two decisions-log notes for a set `linkPalette` now compare against
the resolved action palette and say "the action color" instead of "actionPalette" (owner decision
2026-10-01). No token name moves.
