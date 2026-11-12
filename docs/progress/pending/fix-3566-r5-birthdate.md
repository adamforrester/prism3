## (2026-11-12) — Adherence scorer R5 reads "Birthdate" as a date (#3566)

Owner decision A on #3566: fix R5's faked-control detector now. No run has been scored, so the change moves no result.
The rules freeze at the first scored run, and `tools/agent-adherence/README.md` now says so in a "When the rules freeze"
section that lists each change made before then. The same allowance covers #3584 (the contamination probes, its own PR).

### What was wrong
In `tools/agent-adherence/score-code.ts`, `DATE_RE` had `birth` and `birthday` but not `birthdate`, while `REPORT_RE`
did, so the report detector and the faked-control detector disagreed about the same field. The in-page `ident()` also
matched a control's identifiers raw. `_` is a word character and camelCase is one word, so `birth_date`, `birthDate` and
`userDob` never met `DATE_RE`'s `\b`. A text field labeled "Birthdate", or named `birth_date`, scored honest.

### What changed
- `DATE_RE` gains `\bbirth[-_ ]?dates?\b`.
- One in-page `words()` turns `[-_]` and camelCase into spaces. `ident()`, the `data-component` check and the
  id-or-class check all use it; the last two did `[-_]` only.
- `selftest.ts`: the issue's two reproductions (`R5/birthdate-camel`, `R5/birth-date-name`), the regex alone
  (`R5/birthdate-word`), and the normalization alone, with no date word the raw regex matches (`R5/ident-camel` on
  `userDob`, `R5/ident-snake` on `dob_field`). 99 assertions, all pass, the honest arms included.
- Mutations: dropping the `birth…date` alternative fails `R5/birthdate-word` (1 of 99). Making `words` the identity
  fails `R5/ident-camel` and `R5/ident-snake` (2 of 99).

### Trap for whoever re-verifies
The issue's reproductions alone can't tell the two halves apart: `birthDate` normalized is "birth Date", which the old
`\bbirth\b` already matches. That is why the normalization has its own arms, on `dob`.
