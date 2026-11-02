## (2026-11-01) — lint-guide-claims: the designer guides fail CI when they stop describing the app (#3264 part 3)

**Status:** a new gate, built as the owner decided on #3264 (decision 3, A). Wired into `verify.ts`, `ci.yml`,
`CONTRIBUTING.md` §3, CLAUDE.md's list and the PR template together; `lint-doc-gates.ts` holds them equal. No engine
behavior moves, so no change note. Stacked on #3264's guides PR, which it passes on.

### What it checks

The guides are the subject, the code the oracle (`docs/34` shape 1). Four arms, each named in its failures:

- **LABEL.** Every **bold** span is a UI label, and must be a whole string literal (or HTML text node) in
  `apps/studio/src`, `apps/plugin/src` or `apps/tokenpress/src`. A small tokenizer of its own reads the literals and
  skips comments, so renaming a label's literal fails even while a comment still says the old words. A label with no
  placeholder must equal a plain literal; an italic part is a placeholder, and a label with placeholders matches only
  a template with as many `${…}`, its static chunks keeping their spaces. A plural suffix (`item${…'s'}`) counts as
  static text. HTML offers its text nodes and `aria-label`, `title`, `placeholder` and `alt`, never a class or id. A
  bold span ending in a period or colon is a lead sentence and is skipped.
- **CITE.** Every `<!-- src: path:line -->` names a git-tracked file and lines inside it, and the cited lines still
  hold one of the claim's quoted strings, code spans or bold labels, read with comments removed, so a comment keeping
  the old words can't hold the claim. A number or `…` in a quoted example is a placeholder, and the example may fill a
  cited template's holes. A leading `↳ ` is dropped from page names, since the code adds it.
- **COUNT.** "<n> component sets" equals `componentDefs.length`, and at least one guide makes the claim.
- **SCOPE.** Every guide `index.md` lists is read and cites something, and each source tree yields literals, so a
  moved folder fails instead of passing on nothing.

### Mutations, each failing by name

- `tabClean: 'Clean up'` renamed to `'Tidy up'` in `state/update-file.ts` (two comments still say "Clean up"): 7
  LABEL failures for **Clean up**, plus the CITE lines that quoted it.
- One line inserted above `RESTORE_OFF_HINT` in `apps/studio/src/main.ts`: the two citations of `main.ts:1756` fail.
- A citation path misspelled: "is not a file git tracks". "60 component sets" changed to 59: the COUNT arm.
- From review: `handEdits: 'Hand edits'` renamed (LABEL and CITE fail), and again with a trailing `// formerly Hand
  edits` (still both); a made-up bold **Brand settings**, which the old template fallback let pass; a bold class
  name from `ui.html`; a renamed refusal string whose comment keeps the old words (CITE).

### Limits

- A claim that quotes nothing is checked for existence and range only: 139 of the 311 citations today. The summary
  line prints the number, so a rise is visible.
- A label is checked for existing somewhere in the three trees, so a label drawn in several places doesn't fail when
  one copy is renamed. CITE is the backstop.
