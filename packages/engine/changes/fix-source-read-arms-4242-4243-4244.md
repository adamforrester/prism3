---
engine: patch
---
Three test arms that read a source file's spelling now read its value or its parsed form (#4242, #4243, #4244): the
`test.ts` #3551 arm evaluates `lint-rung-names.ts`' two repeat registers and checks the code input cell's corner
ladder, `test-write-typography.ts` #1090 parses the plugin's `main.ts`, and `test-report.ts` #3883 checks every
brand-carrying post in Studio's `main.ts` by its parsed argument. Tests only; no committed artifact moves.
