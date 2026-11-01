## (2026-11-01) — lint-guide-claims: the designer guides fail CI when they stop describing the app (#3264 part 3)

**Status:** a new gate, built as the owner decided on #3264 (decision 3, A). Wired into `verify.ts`, `ci.yml`,
`CONTRIBUTING.md` §3, CLAUDE.md's list and the PR template together; `lint-doc-gates.ts` holds them equal. No engine
behavior moves, so no change note. Stacked on #3264's guides PR, which it passes on.

### What it checks

The guides are the subject, the code the oracle (`docs/34` shape 1). Four arms, each named in its failures:

- **LABEL.** Every **bold** span is a UI label, and must be a whole string literal (or HTML text node) in
  `apps/studio/src`, `apps/plugin/src` or `apps/tokenpress/src`. A small tokenizer of its own reads the literals and
  skips comments, so renaming a label's literal fails even while a comment still says the old words. An italic part
  is a placeholder that matches a template literal's `${…}`. A bold span ending in a period or colon is a lead
  sentence and is skipped.
- **CITE.** Every `<!-- src: path:line -->` names a git-tracked file and lines inside it, and the cited lines still
  hold one of the claim's quoted strings, code spans or bold labels. A leading `↳ ` is dropped from page names, since
  the code adds it.
- **COUNT.** "<n> component sets" equals `componentDefs.length`, and at least one guide makes the claim.
- **SCOPE.** Every guide `index.md` lists is read and cites something, and each source tree yields literals, so a
  moved folder fails instead of passing on nothing.

### Mutations, each failing by name

- `tabClean: 'Clean up'` renamed to `'Tidy up'` in `state/update-file.ts` (two comments still say "Clean up"): 7
  LABEL failures for **Clean up**, plus the CITE lines that quoted it.
- One line inserted above `RESTORE_OFF_HINT` in `apps/studio/src/main.ts`: the two citations of `main.ts:1756` fail.
- A citation path misspelled: "is not a file git tracks". "60 component sets" changed to 59: the COUNT arm.

### Limit, stated in the run

A claim that quotes nothing is checked for existence and range only: 137 of the 308 citations today. The summary line
prints the number, so a rise is visible.
