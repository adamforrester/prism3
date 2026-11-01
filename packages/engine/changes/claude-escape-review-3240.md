---
engine: patch
---
`lint-doc-gates.ts` holds the escape review in step (#3240): the PR template's **Escape review** heading, `CONTRIBUTING.md`'s rule and `.claude/commands/review-pr.md`'s review step must each keep their marker. Process and gate only: no emitted artifact, token or projected component surface moves.
