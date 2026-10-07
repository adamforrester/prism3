## (2026-10-06) — the #2232 test section's header says what its mutation measured

**STATUS: branch `test/2232-header-fix`.** Comment only: no behavior, test logic, engine or artifact change. ENGINE bump class: **none owed**. `CONTRACT_VERSION` unchanged. Follow-up to #2255 (#2232), which is merged.

The header of `test-chrome.mjs`'s #2232 section made two claims no run produced:
- that, with focus on `<body>`, "Shift+Tab then left the page";
- that under the mutation (the window not focusable) the Shift+Tab arm fails by name.

Measured on #2255: under that mutation **only the click arm fails** (`… after a click on blank space, focus stays in the start window (focus is on body)`, both hosts). The Tab and Shift+Tab arms pass, because in headless Chromium, with everything behind the window inert, both keys from `<body>` land on a control in the window. Both claims came from the issue's description and were written into the comment before the section ran, which is docs/34 shape 20. The header now states what was measured and what the two key arms are for. #2255's own fragment and PR body already said this correctly.
