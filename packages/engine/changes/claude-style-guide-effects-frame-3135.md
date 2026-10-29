---
engine: patch
---
`style-guide-groups.ts`: the effect styles and the gradient styles get a group each, Effect styles and Gradient styles, stacked last on the semantic page, and `styleGuideGroupOf` returns them for `shadow` and `gradient` (owner direction on #3135, superseding Q378 Q6 A for those two). No emission changes.
