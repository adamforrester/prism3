## (2026-11-11) — Component usage lines: sibling examples, option thresholds, Radio.Row's tier, the field focus edge (#3555 C2, Q-MD6, Q-MD9, Q-MD11)

Part of #3555 (the 2026-11-11 metadata audit). The owner took option A on every Q-MD and approved the held C2 copy. This
PR builds the component-def usage fixes.

- **C2, sibling usage lines.**
  - The three FlushIconButtons shared one `whenToUse` that opened "The minus and plus of a counter, a card's close, or any
    icon action inside a component." Primary and Destructive send exactly those cases to the neutral sibling in their own
    `avoidWhen`. As the owner approved, the shared line now keeps only "Any icon action inside a component.", and the
    examples move to `.Neutral` verbatim. Neutral's line is byte-identical to the old shared one.
  - The shape sentence that followed it (`shape=flush … shape=round …`) is not an example, so it stays shared.
  - IconButton took the same move. "close affordance" leaves the shared parenthetical and stays in `.Neutral`'s, verbatim.
    Nothing new was written; the item was only dropped.
  - Button's shared `avoidWhen` sent "Icon-only" to `IconButton` from all three siblings. It now names the IconButton of
    the same color: `IconButton.Destructive` from `Button.Destructive`, `IconButton.Neutral` from `Button.Neutral`.
- **Q-MD9 A, one option-count threshold.** Up to 7 options → Radio.Group; 8 or more → Select.
  - Select's band now reads "8 to about 15 familiar options: at 7 or fewer an always-visible Radio.Group reads better". It
    was "roughly 5–15 … at 4–5 or fewer".
  - Its `avoidWhen` reads "7 options or fewer".
  - Radio.Group and Radio.Row now say "2 to 7" and "past 7 options", instead of "about 7".
  - Checkbox's "7-10" is "7–10".
- **Q-MD11 A, Radio.Row's tier.**
  - Radio.Row moves from generation tier 2 to 9, the tier of a part never generated alone. Its `whenToUse` takes the
    standard template: "Only as a child of a Radio.Group. Generate a Radio.Group, which places one row per option and sets
    which one is selected." The option-count and commit-on-submit guidance was already on Radio.Group.
  - Radio.Row is the Radio.Group `items` slot's item, so it joins `SLOT_ITEMS` in `lint-naming.ts` and the skill's §6
    slot-item list. It stays unprefixed, as the other child-only slot items do (Q394 A). The skill's "and so does Radio
    row: it is a whole option, not a part" no longer holds and is removed.
- **Q-MD6 A.** Focus ring's `avoidWhen` adds "Fields draw their own focus edge instead." after "Never re-author a
  per-component focus treatment".

### Gates and mutations

- The three action-family equality tests mask `whenToUse` as a per-sibling field, beside `triggerKeywords`, `avoidWhen` and
  `generationPriority`.
- A new arm, `#3555 C2`, holds three things:
  - No Primary or Destructive icon-only sibling's `whenToUse` names a counter or a close, and both Neutrals still do.
  - The labeled Button family still shares one `whenToUse`.
  - Each Button sibling sends icon-only to its own color's IconButton.
- Mutation: IconButton's shared line was restored with "close affordance", and the arm failed by name for `icon-button`
  and `icon-button-destructive`.
- Mutation: `radio-row` was removed from `SLOT_ITEMS`. `lint-naming` failed twice: "'radio-row' is a slot's preferred
  item … not in SLOT_ITEMS", and "§6 lists 'radio-row', which SLOT_ITEMS does not have".
- `#2713 generationPriority`'s tier table moves `radio-row` from 2 to 9.

### Trap for whoever re-verifies

The family equality tests share one mask (`sharedPart`). Masking `whenToUse` there also unpins it for the labeled Button
family, so the C2 arm pins that family's shared line again by itself.
