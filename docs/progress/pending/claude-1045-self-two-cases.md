## (2026-11-18) — `lint-ratio-truth.ts` says that `against: 'self'` covers two cases, and where the second is held (#1045 C)

**What.** A header note in `packages/engine/lint-ratio-truth.ts`, and nothing else. The gate skips a role whose
`against` is `'self'`. That declaration covers two cases. One is a fill with no contrast pair: the `putSurf` surfaces,
`scrim.default`, glass, and the veil's `clear` ends. The other is the media veil's six rungs, which make a real numeric
claim against a ground the vocabulary cannot name (the worst pixel of an unknown photograph). The note names both
cases, says the gate checks neither, and points to `test.ts` §9c, whose arm A re-derives every rung's alpha from the
WCAG floors. This is the owner's option C: no new `against` vocabulary and no third `model`.

**Why a note is enough for now.** Nothing was wrong. §9c already held the contract. The fault was in how the gate was
read: a reader saw `ratio: 1` and concluded there was no claim. The note also gives the trap a future case-2 role falls
into: this gate will skip it, so it needs its own arm beside §9c.

**Checked.** The pointer is true. With one veil rung's alpha step lowered in `modes.ts`, `test.ts` fails by name in §9c,
and `lint-ratio-truth.ts` stays green over the same tree. That is the gap the note describes. Comment only, so no
`changes/` note.
