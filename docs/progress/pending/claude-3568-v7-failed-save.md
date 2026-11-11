## (2026-11-11) — Adherence Figma scorer V7: a failed or commented-out version save is not a save (#3568)

Found in the post-merge review of #3454 (#3569). V7 ("save a named version before the first write") tested
`saveVersionHistoryAsync(` against a call's code text. It never read the call's outcome and never set comments
aside. So a save whose call came back `not-ok` (the handler threw), or one written only in a comment
(`// TODO: await figma.saveVersionHistoryAsync('x')`), counted as saved.

`score-figma.ts` now counts a save only from a call whose recorded outcome is `ok`, and searches the code with its
comments blanked (`uncommented`: block and line comments replaced by spaces of the same length, so the
save-before-write position compare in one call still lines up; a `//` after `:`, a URL in a string, is not a comment).
Both rules apply to an earlier call and to a save at the top of the first write.

### Self-test

`selftest-figma.ts` gains `R7/bad-failed-save` (the save call's outcome set to `not-ok`, `handler-threw`),
`R7/bad-commented-save` (the save only in a line comment) and `R7/bad-commented-save-same-call` (the save in a block
comment at the top of the write), `R7/bad-failed-save-same-call` (the save at the top of a write whose own call came
back `not-ok`), each one V7 and nothing else, and `R7/good-url-before-save` (a URL string and the save on the same line
stay version first). 184 assertions run, all pass.

Mutations, each failing by name with every other arm green: the outcome check dropped → `R7/bad-failed-save`; the
comment blanking dropped → `R7/bad-commented-save`, `R7/bad-commented-save-same-call`; the first write's own outcome
check dropped → `R7/bad-failed-save-same-call`; the `//`-after-`:` URL guard dropped → `R7/good-url-before-save`.
