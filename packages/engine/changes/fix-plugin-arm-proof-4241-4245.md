---
engine: patch
---
Two plugin test arms now carry their own proof (#4241, #4245). `test-doc-panel.ts`'s #2889 and #2858 tags are on the
"Last changed in" block's assertions instead of only its section heading. `test-start-screen.mjs`'s #1037 "no Undo
load" check goes through `hooks.absent` and waits for the switcher, with a designer-chosen load in the same panel as
its positive control. Tests only; no committed artifact moves.
