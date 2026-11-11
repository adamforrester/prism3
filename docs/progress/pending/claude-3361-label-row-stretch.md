## (2026-11-10) — test.ts: the #2804 label-row arm counts a stretched child at its content height (#3361)

**Status:** test only, so no engine bump, no artifact moves and `CONTRACT_VERSION` is unchanged.

### What changed

`packages/engine/test.ts`'s `#2804 password-field label row` arm sized the Password field's hugging label row as
"the tallest in-flow child that does not stretch", so it left the stretched Show toggle out. Real Figma disproved
that model (#3347): the host floors a hugging row at a stretched child's own content height. So the row read 26 on
all 84 members, and the arm passed.

The arm is kept and now models the floor. A stretched child counts at its block padding (the instance's own
override first, then its main's) plus its main's tallest in-flow child, where a text child is one line of its
style. It is written from the plans and the committed emission, not with the round-trip shim's
`stretchFloorsHug`, so the two models can disagree (`docs/34`). `test:roundtrip`'s `#3347` arm stays as the second
check, measured through the shim against the real file's 26.

Kept rather than retired, because the arm fails in the engine suite, minutes before the round-trip runs, and does
not depend on the shim being right.

### Mutation, failing by name

The toggle's `nestPaddingBlock` removed (`text-field.ts`, the shape before #3347): `#2804 password-field label row
… WRONG on 84: status=default, size=medium, state=rest: row 25.8px (want 21)`, the only failure in `test.ts`.
