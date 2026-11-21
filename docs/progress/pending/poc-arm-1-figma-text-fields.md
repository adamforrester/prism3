## (2026-11-21) — Figma geometry: line boxes modeled, findings grouped, fields reached (#3408 S6)

**What changed.** On `poc/arm-1`, with no engine change, three owner decisions from #4432 are built:
- **1 A:** `compare-figma-geometry.ts` groups lines by root cause. The button's root border (1px transparent in CSS,
  no stroke in Figma) is one finding, holding its border lines and every width or x line whose residual equals the
  border's difference on that side exactly. The same difference repeated across cases is one finding too. The summary
  reads `N of M comparisons differ, in K findings`.
- **2 C:** Figma's whole-pixel line box is modeled. `check-geometry.ts` records each text part's computed font size and
  line height. The comparison holds the code's height to Figma's less round(L) − ⌊64L⌋/64, and a centered text's y to
  Figma's plus half of it, at Chromium's 1/64px unit. No tolerance: 0.01px stays.
- **3 A:** each field has five more stories per form, `rest`, `hover`, `focus-visible`, `disabled` and `error` with the
  message off. `stateOf` in `a11y-harness.ts` strips the suffix wherever a check keys on the state.

**What it reads now**, against the record at `40d7fc01`: **100 of 509 comparisons differ, in 13 findings**. Before
this change it was 98 of 241. Class 1 and 2 (58 lines) are one finding. Class 3 (30 lines) is 0. Class 4 (10 unreached
members) is 2, the two error members. The other 40 lines (10 findings) are field geometry that is compared for the
first time: the control's content inset is 17 in code and 16 in Figma, the Show/Hide toggle's box, and the label
cell's right inset.

**Diagnosis worth keeping.** The first cut of the line-box model rounded L to 1/64px and missed the large and small
labels by up to 0.0156px. Chromium's LayoutUnit truncates, so 20.7px is laid out as 20.6875. It truncates the centered
offset too: the small label sits at 11.09375, not 11.1016. Both are modeled. Neither is a tolerance.

**Trap.** At error the field writes its message whatever `showMessage` says (Q-POC2 A), so `error-no-message` still
draws one and can't match Figma's error member, which has `message=false`. That's an owner question on the PR, not a
missing story. The field findings that repeat across cases are grouped by their exact values. The three content-inset
lines are very probably one cause (the control's CSS border against Figma's inside stroke), but the records carry no
part strokes, so the comparison can't prove it and doesn't merge them.
