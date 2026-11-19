## (2026-11-19) — ToggleButton and ToggleIconButton: a Button that stays pressed (#4112)

**Status:** ENGINE minor (`changes/feat-4112-toggle-button.md`; `fold.ts` assigns `{{ENGINE_VERSION}}`). CONTRACT
unchanged: no token name moves, every binding is an existing role. No executor file changed, so `EXECUTOR_REVISION`
does not move.

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
  `lint-rung-names`, `lint-axis-values` (a new `appearance: [outline, text]` subset entry), `lint-standalone-floor`,
  `lint-paint-placement`, `lint-absolute-inset`, `lint-paint` (the ring nomination), `lint-control-shape-reach`, and
  the plugin taxonomy (a new Toggle button page, DRAFT).
- **Decision arms** (`#4112 OD-T1` to `OD-T3` in test.ts) hold the tint, the indicator at `border-width/thick`, the
  neutral selected ink, no check glyph, the two appearances and the member counts against literals.

### Held for the owner (OWNER DECISION, on the PR)

1. The icon toggle's quiet appearance is spelled `text`, as the approval names it; IconButton says `ghost` (#1432).
2. The text appearance keeps Button's underlined label (`emphasis-link`, #2324); the wireframe drew it plain.
3. Button's six brand settings (min width, icon placement, content size, label weight, text hover, border weight) do not reach the
   toggles: only `controlShape` was named. A toggle beside a Button under "Control label weight: Default" differs.
4. The page: its own "Toggle button" page after Icon button.
5. DRAFT copy: the two summaries and descriptions, and the "Toggle" placeholder label.

### Trap

The paint validator refuses bare `{appearance}.*` keys beside `{selection}.{appearance}.*` ones (one key arity matches
two templates), so the first cut, which let selected ink fall through to Button's bare keys, failed validation; each
selection value carries its own prefix, as Tag's do. A consequence worth knowing: Button's "Text button hover: Fill"
copies `outline.overlay.*` by key, so it could not reach these keys even if the toggles joined the button family.
