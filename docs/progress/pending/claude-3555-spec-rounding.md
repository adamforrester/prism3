## (2026-11-11) — Tag's minimum-width rule states its rounding (#3555 C10)

Part of #3555 (the 2026-11-11 metadata audit), C10. Tag's Specs rows said "64px (derived: height × 1.5)", but 44 × 1.5 is
66: `ratioMinWidth` rounds to the nearest 8px. The rule string now says "height × 1.5, rounded to the nearest 8px". The
sibling rule for Button's multiplier, "rounded up to 8px", is correct (`buttonMinWidth` rounds up) and is unchanged.

A new `test.ts` arm recomputes every derived `minWidth` whose rule names a numeric ratio, from the same row's height px
as each example brand's component-defs export resolves it, by the rounding the rule states in words. `specs.json` alone
could not carry this check (it is brand-free: a row holds the height's token, not its px), so the arm reads the brand
export, which does. Mutation: the rounding clause dropped from the rule fails the arm by name, 18 rows across 3 brands
("height × 1.5" on a 44px height is 66px, the row says 64px).
