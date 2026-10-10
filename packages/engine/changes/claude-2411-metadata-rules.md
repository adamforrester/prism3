---
engine: minor
---
Token and component metadata follow one rule: consumer prose says what a thing is for and names no tool (#2411,
owner decision Q167, 2026-10-09). No free-text note survives in the token trees: the `figma.note`, `prism3.note`
and `a11y.note` strings and the mode-override notes are gone, each fact now held by a structured field or dropped
where one already held it. Gradients carry `figma.requires` and `figma.interpolation`, and their `a11y` block
carries `floor` and a per-ink `clears` verdict, computed from each ink's own measured worst case. That closes
#2422: the old note said neither ink cleared 4.5:1 whenever either one failed, while white text measured 5.36:1.
Each brand's Figma `gradient-styles.json` copies the same structured verdict. Every step of a status palette carries
`$extensions.prism3.hueSource` ("brand" or "default"), so the defaulted danger and info ramps' `$description`
keeps the purpose only. The grid descriptions, two decisions and the strikethrough guidance no longer name a
tool; strikethrough's per-surface half moves to `modifiers.strikethrough.{code,figma}` in the `.ai.json`
(schema prism3-ai-metadata/0.5). Component strings that only explained the Figma projection move to the
maintainer-only `notes.projection`. CONTRACT is unchanged: no token path is added, removed or retyped.
