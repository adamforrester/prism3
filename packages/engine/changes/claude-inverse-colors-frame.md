---
engine: patch
---
`style-guide-groups.ts`: inverse color families get a group of their own, Inverse colors, drawn under Semantic colors (`under: 'semantic-colors'`), and `styleGuideGroupOf` reads a new `inverse` fact to choose it (owner decision, 2026-10-19). Semantic colors loses `inverseRow`. No emission changes.
