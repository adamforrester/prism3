## (2026-11-19) — ToggleButton and ToggleIconButton: a Button that stays pressed (#4112)

**Status:** ENGINE minor (`changes/feat-4112-toggle-button.md`; `fold.ts` assigns `{{ENGINE_VERSION}}`). CONTRACT
unchanged: no token name moves, every binding is an existing role. `EXECUTOR_REVISION` 66 → 67: the toggle sets join
`CANVAS_FURNITURE`, which the executor runs; `executor-reach.json` names the two toggle sets, measured.

### What changed

- **Two new defs in `components/toggle-button.ts`,** built as the owner approved (OD-T1 to OD-T5, all A, 2026-11-19):
  ToggleButton (120 members: selection × appearance × size × state × leading icon) and ToggleIconButton (60). A native
  `<button>` with `aria-pressed`, Space and Enter both toggle, a constant name, no group def.
- **On Button's factory pieces, not copies.** `intentTokens`, `BUTTON_SPACING_AT` (button.ts) and
  `iconButtonIntentTokens` (icon-button.ts) are now exported, and both toggles build their paint from the neutral
  family: `unselected.*` is Button.Neutral's (or IconButton.Neutral's) paint unchanged, and `selected.*` keeps its ink
  and lays Tag's look over the box, a `subtle-fill.selected` tint and a 2px `indicator.*` outline inside the box.
- **Button's sets do not change, measured:** the `lint-component-surface` baseline diff only adds the six toggle rows
  (default, solid-tint, none); every existing def's member count and plan digest is byte-identical. The paint census
  and `component-axes.json` diffs are additions only.
- **Relations:** Button, Button.Neutral, Checkbox.Row, Switch.Row, Tag and Segmented control now name `toggle-button`
  (it was `planned` on most of them); Button.Destructive and Radio.Row drop it from `planned`. Button's `avoidWhen`
  and Checkbox.Row's description name ToggleButton where they said "not built yet".
- **Gate lists joined:** test.ts (spacing tables, gap floor, ordering rules, tiers at 3, wash binders, type grid,
  admissions, levers reach, the #2752 bridge, the pill-able set, a centered-row reason), `lint-hit-target`,
  `lint-rung-names`, `lint-axis-values` (ToggleButton in a new `appearance: [outline, text]` subset entry,
  ToggleIconButton joining Counter's `[outline, ghost]`), `lint-standalone-floor`,
  `lint-paint-placement`, `lint-absolute-inset`, `lint-paint` (the ring nomination), `lint-control-shape-reach`, and
  the plugin taxonomy (a new Toggle button page, DRAFT).
- **Decision arms** (`#4112 OD-T1` to `OD-T3` in test.ts) hold the tint, the indicator at `border-width/thick`, the
  neutral selected ink, no check glyph, the two appearances and the member counts against literals.

### Owner decisions on the PR (2026-11-19), built

1. **B:** ToggleIconButton's quiet appearance is `ghost`, IconButton's word (#1432); ToggleButton keeps `text`.
2. **B:** a text toggle's label is plain `emphasis`, not Button's underlined `emphasis-link` (#2324).
3. **A:** Button's six brand settings reach ToggleButton, which declares Button's `min-width` derivation (the 104px
   medium floor on nb at the default multiplier). ToggleIconButton takes them as far as they reach IconButton: "Outline
   button border", through `levers.buttonBorderWeight`; the other five act on a label or a width above the height.
   `applyButtonLayout` now reads selection-led keys: "Text button hover: Fill" copies each selection value's own outline
   wash (unselected only; the selected tint holds), and "Outline button border" moves the edge at the hairline
   (unselected), leaving selected's thick edge alone. Arms: `#4353 decision 1` to `decision 3` in test.ts, each failing
   by name against the pre-decision def.
4. The page stays its own "Toggle button" page after Icon button. The DRAFT copy is approved.

### Trap

The paint validator refuses bare `{appearance}.*` keys beside `{selection}.{appearance}.*` ones (one key arity matches
two templates), so the first cut, which let selected ink fall through to Button's bare keys, failed validation; each
selection value carries its own prefix, as Tag's do. A consequence: Button's "Text button hover: Fill" and "Outline
button border" read bare keys, so joining the family alone moved nothing for them; both now read the selection prefix.
