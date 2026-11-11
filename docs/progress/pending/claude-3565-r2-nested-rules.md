## (2026-11-11) — Adherence code scorer R2: a rule that holds a nested rule keeps its own declarations (#3565)

Found in the post-merge review of #3450 (#3569). `declarations` in `tools/agent-adherence/score-code.ts` read only the
innermost `{…}` bodies, so a rule holding a nested rule (native CSS nesting, `.card { outline: 3px solid #ff0000; & h1
{ … } }`) had its own declarations skipped. A raw hex or px there was invisible to R2, and an own custom property
declared there was invisible to R1's exemption.

`declarations` now walks the braces with a stack and reads every body's own declarations at every level. Opening a
nested block cuts the nested rule's selector out of the enclosing body: the text after the body's last `;` or `}`.
Top-level text is never read, so an `@media (…)` prelude's px is still never counted (`R2/media-prelude` stays
green).

### Self-test

`selftest.ts` gains `R2/nested` and `R2/nested-px` (the issue's repro: 2, the hex and the px in `outline`, and no other
rule) and `R2/nested-inner` (a px in the nested rule itself: 1). 86 assertions run (83 before), all pass;
`selftest-figma.ts` is unchanged (179).

Mutation: `declarations` put back to the innermost-body regex → `R2/nested` and `R2/nested-px` fail by name (R2 = 0),
and every other arm stays green.
