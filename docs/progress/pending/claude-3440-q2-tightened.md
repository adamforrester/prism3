## (2026-11-06) — Agent adherence, code surface: a grouped date entry needs three fields or a date word (#3440)

The owner's Q2 decision for the code half of #3440, A tightened (2026-11-06). In `score-code.ts`'s R5 detector, two
or more selects or numeric inputs grouped under one label, fieldset or role=group are a faked date picker only when
there are exactly three of them (day, month, year) or the group's own label or legend carries a date word, read with
`DATE_RE`. Before, any two counted, so a height fieldset (ft, in) or a split one-time code would have scored faked.

- **The group's words.** A fieldset's own legend, a role=group's `aria-label` or `aria-labelledby`, and a label's own
  text without the option text of the selects inside it, so an option such as "2000" can't lend a group a date word.
- **Exactly three, not three or more.** A split one-time code is six numeric inputs under "Code", and the owner's
  wording names it as not caught.
- **Arms, each with a literal expectation.** `R5/three-selects` (faked, 3 fields), `R5/fieldset-numbers` (faked,
  3 fields), `R5/date-word-pair` (faked, date word), `R5/height-fieldset`, `R5/one-time-code` and `R5/neutral-pair`
  (each not faked). The self-test runs 73 assertions.
- **Mutation.** `why` made true for any two or more fails `R5/height-fieldset`, `R5/one-time-code` and
  `R5/neutral-pair` by name, and `R5/date-word-pair` on its reason text.
- **A trap for the next editor.** The detector runs inside a template string, so a backtick in a comment there ends
  the page script and the transform fails before any arm runs.
