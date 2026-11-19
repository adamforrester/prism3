## (2026-11-19) — lint-test-arms stops reading a log line as an arm, and run-suites proves its parser on every run

Two harness fixes from the audit (#4104). Each was a gate certifying something it had not checked.

### #4196: a log line is not an arm

`armTagsOf` read any `#NNNN` in a string literal as an arm, so a suite's header `console.log('MCP paste (#111/#1553) — …')` kept `#111` and `#1553` "present" after every assertion was gone. The lexer now mutes everything inside a `console.<method>(…)` call's arguments, up to that call's own closing paren. That includes nested calls, templates and `${}` holes. The word `console` alone is not muted. Four planted self-test cases cover it.

Re-measured at e3ca0dfc: **122** registered arms had every non-comment occurrence of their tag inside a console call. The audit counted 117 at 8e3ef956. All 122 are retired from `test-arms.txt` in this diff, as the gate's header prescribes. They never protected an assertion: the registry claimed them, and nothing in their suites carried them. 15 of them are in `test-chrome.mjs` and 15 in `test-style-guide.ts`, where section headers are logs. Tagging those suites' assertions instead is open to each suite's owner; `--accept` will register a tag once it is in a label.

- Mutation of the subject: delete `test-page-header.ts:168`, the one assertion labeled `#1711`, while the `1b. … (#1711 net)` log line stays. Main's gate, with main's registry, reads `✓ every registered arm is still in its suite`. This branch reads `✗ ARM GONE  apps/plugin/test-page-header.ts #1711`.
- Mutation of the fix: `take` ignoring the mute fails `#4196: a suite whose only tag is in a console.log reads as having no arm`, plus the other two muting cases, by name.
- Not done here: `test-doc-panel.ts` `#848` is still carried by fixture prose (not a console call), and #3933's "120px Accordion" arm cites `#3774` only in comments. Both need an edit to a plugin suite, which is outside this lane.

### #4197: the runner's self-test gates the run

`run-suites.ts` had a self-test for `countOf`, `verdictOf` and `tableDefects` that ran only behind `--self-test`, which no script passes. It now runs quietly first on every invocation and exits 1 before any suite if it fails, the way `lint-test-arms.ts` gates its scan. The new `test.ts` arm, at the end of the #3833 section, replays the audit's mutation on a copy over an empty app: `countOf` returning 99999 must fail with `run-suites self-test: N failed`. A control runs the unmutated copy, which passes.

- On main's `run-suites.ts`, the arm fails `#4197: run-suites.ts with a broken countOf fails its own self-test on a plain run, before any suite (exit 0: ✓ 0 suites, …)`.
- Deleting the new self-test line fails the same arm by name.

### #4202: already fixed

#3996 (#3985) skips the integration replay by name in a shallow checkout, so `test.ts` no longer throws there. The evidence is on the issue.
