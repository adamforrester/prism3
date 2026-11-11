## (2026-11-11) — lint-motion-literals: a duration with no leading zero (`.2s`) is a literal (#3564)

Found in the post-merge review of #3491 (#3569). The gate's duration shape, `(?<![\w.])\d+(?:\.\d+)?\s?(?:ms|s)\b`,
needed a digit before the dot, and its lookbehind refused the digit after one, so `transition: opacity .2s`, valid
CSS, passed as zero literals. The shape now takes a leading-dot number as its own alternative, under the same
lookbehind, so a dotted version still stays out: `v1.2s` is refused at `1` (after `v`) and at `.2` (after `1`). The
unit is matched case-insensitively, so `150MS` is a literal too. The CSS step keywords `step-start` and `step-end`
join the curve shapes beside `ease-*`.

Not changed: a bare `linear` keyword. The skill names the `motion.easing.linear` primitive, and lists `linear` among
the easing shapes, as a token name. A bare-keyword shape would need allowances for those token names, a different
kind of allowance than the one the list holds today, so it is left out of this fix and filed as #3592. The stale
header note about #3487 is listed separately in #3569.

### Gate

The self-check gains four firing samples (`.2s`, `150MS`, `step-end`, `step-start`) and a clean sample with dotted
versions (`v1.2s`, `0.238.5s`). No allowance was added: the skill has no new findings.

Mutations, each failing by name: the duration shape put back as it was → `SELF-CHECK: DURATION LITERAL no longer
fires on "transition: opacity .2s"` (and on `150MS`); the step-keyword shape removed → `SELF-CHECK: CURVE LITERAL no
longer fires on "animation-timing-function: step-end"` (and on `step-start`). End to end, with the fix, "Use
`transition: opacity .2s` here." added to the skill fails `DURATION LITERAL: skills/prism3-motion/SKILL.md:235 ".2s"`;
before the fix the same line passed with 0 literals.
