---
engine: minor
---
Component shipped prose in one register (#2714, #1717). The older components' consumer fields (summary, description,
prop descriptions, accessibility, content, docs and ai's decision fields) now follow the build-component skill's "What
ships" rules, as the 13 newer ones already did: no code spans, no all-caps emphasis, no brief section references, no
"def", no issue numbers, and the acronyms HC, SR and AT spelled out. Icon, Focus ring and Field label gain a
`docs.contentGuidelines`, Dialog gains a `content.dialogPattern`, Button's and IconButton's summaries reach the
~90-character line, the segment's summary says emphasis weight as its description does, and the child parts' `whenToUse`
read in two templates ("Only as a child of Tabs. Generate Tabs, …" and "Inside Checkbox.Row, the common case. On its own only
…"). Tab, List item and the segment gain a do and a dont each. `components.ai.json`, every affected docs page and the
plugin bundle's component text move; no token moves, so CONTRACT is unchanged. `test.ts` gains the `#2714 component
register` and `#2714 child-only whenToUse` arms.
