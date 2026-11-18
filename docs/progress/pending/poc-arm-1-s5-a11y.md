## (2026-11-18) — The arm 1 Storybook gets its accessibility pass: axe, ARIA snapshots and a keyboard suite (#3408 S5)

**What changed.** On the code POC's integration branch `poc/arm-1`, `apps/storybook` gains `check:a11y`. It runs
three Playwright checks over the built Storybook, in both delivery forms. Engine output doesn't move, so there is
no change note.

- **axe on every story, in light and dark.** It uses `@axe-core/playwright` 4.14.0 with the WCAG 2.0–2.2 A and AA
  rules. A "needs review" result fails too. One violation is accepted, by rule: a button label on the forced hover
  and pressed fills, above #1456's 2.0:1 floor, because #1456 makes the on-fill ink contract rest-only.
- **ARIA snapshots.** Each case's element and HTML forms build the same accessibility tree, including descriptions
  and states read from Chromium. The tree equals the reviewed `aria-snapshots.json` and holds hand-written rows from
  the defs. No story attaches a shadow root.
- **A scripted keyboard suite.** It covers Tab order in every story, Space and Enter on the button, the Show/Hide
  toggle by keyboard, and the focus ring on keyboard focus only.
- **15 mutants fail by name, plus 2 hand mutations.** It runs as one CI step and one `verify.ts` gate,
  `storybook-a11y`.
- **Filed: #3967 (an owner decision).** Tab reaches the password field's Show/Hide button before the input, in both
  forms, against its def. The suite holds that as a named exception that fails once the order changes.
- **The journal entry ends with S5's complete and still-missing lists.**
