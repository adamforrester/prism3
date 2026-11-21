## (2026-11-18) — The slider's selected bar and the nav-item preview indicator are marks (#3398)

**What.** The owner answered #3398 with A (2026-11-18), on the three bindings #3346 PR 1 left on a border:

- **The slider's selected bar** (`slider` › `indicator`) moves from `color.interactive.neutral.border.rest` to
  `color.interactive.neutral.indicator.rest`, the mark its thumb already binds. Under a subtle outline-edge setting
  the bar would otherwise have read lighter than the disc it meets. Disabled stays `color.disabled.icon`.
- **The nav-item preview** (`preview.ts` › `nav-item` › `selected`) moves its resting indicator, and the contract
  that measures it, from `color.interactive.primary.border.rest` to `color.interactive.primary.indicator.rest`.
- **Tag Underline's unselected line** stays an edge on `interactive.primary.border.*` (Q589). Nothing changes there;
  the new arm holds it, so a later "make it consistent" pass can't move it onto the mark.

The skill's list of selection marks names the bar. This unblocks #3346 PR 2.

**Values.** None move today: in every corpus brand and mode, on both bands, `interactive.{neutral,primary}.indicator.rest`
resolves to the same alias as `.border.rest` (80 cells measured). Only the bindings move: `slider.md`, the token-usage
report, `preview-spec.json` and the component surface baseline. That is still a component-surface move, so the note is
`minor`. No executor file changes.

**Measured.** New `test.ts` arm `#3398 …`, its refs typed as literals. On main's slider and preview it fails by name
with 3 off (the bar, the nav-item binding and its contract). Mutation: Tag's unselected line put on the indicator
(`applyTagStyle`) fails the new arm and the existing Q589 underline arm, each by name. The Q550 track arm typed the bar's
old role; it now types the new one, since #3398 supersedes that part of Q550 a.
