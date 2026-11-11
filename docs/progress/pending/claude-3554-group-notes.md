## (2026-11-11) — Checkbox and Radio groups: the row notes name both followed axes (#3554 M-C)

Part of #3554 (the 2026-11-11 component consistency audit), batch M-C. The first row's part note in Checkbox.Group and
Radio.Group said the row follows "the group's size". Since owner Q354 (#2751) the nests follow `['size', 'status']`, as the
row-level notes already say, so both notes now say "size and status". The comment in `radio-group.ts` that still read
"`radio-row` projects only `size`" now matches `checkbox-group.ts`'s corrected one.

No gate. A note states its follow in prose ("validation" for `status`, "open" for `expansion`), so an arm holding note
words to `nesting.follow` measured 11 notes and would fail correct ones; the follow itself is gated by `lint-nesting`.
