## (2026-11-18) — Personality: opposite words cancel each other, and the first pick wins (#3976)

**What ships.** On Brand › Personality, picking a word turns its direct opposite off: soft/sharp, dense/generous,
calm/energetic, bold/restrained (owner decision 2026-11-18, Q-PW1 A). Personality stays multi-select. The words are
stored in `personality` in the order they were picked, which is the order the engine reads them in
(`resolveVocabulary`: first listed wins a setting two words share, and the later word's note says what it kept). One
quiet line under the chips says so: "Where two words fill the same setting, the first one picked wins." The owner approved that
wording (owner decision 2026-11-18). The words-on line under it now lists the words in pick order too.

**Where the pairs live.** `TRAIT_OPPOSITES`, beside `TRAITS` in `packages/engine/vocabulary.ts`, exported from
`@prism3/engine`. Studio reads it (`oppositeOf` in `state/brand-input.ts`) and restates nothing. The engine's
resolution is unchanged: a brief that lists both words of a pair still builds, with the first one's settings on what
they share.

**Before, the stored order was the chips' order.** `setPersonality` sorted the list into the engine's word order on
every write, so "the first one picked wins" was false whenever a later chip was picked first: bold then premium was
stored premium, bold, and premium's subtle neutral fill won.

**Arms.** `test-brand-input.ts` §5: bold then premium is stored bold, premium, and the engine's own note says premium
kept bold's neutral fill; a word turned off leaves the rest in pick order; for each of the owner's four pairs, typed in
the suite, each way round, the second pick turns the first off and an unrelated word stays on. Chrome section `3976`
(shard 2), both hosts and themes at 1280: the order line reads the copy, sits under the chips in the `.p3-sub` ink;
each pair, each way round, is never on together; bold then premium lists bold first, and on the web is saved bold
first. Chrome section `3263` (#3263's chip-width check, which presses every word in turn) now expects each press to
turn its opposite off rather than keep every earlier word. Engine `test.ts`: the pairs are the owner's four, no word is in two, and each pair sets a shared lever
differently. Mutations, each failing by name in both studio suites: the opposite turn-off removed
(`#3976 … picking sharp after soft turns soft off`), and the list sorted to the chips' order again
(`#3976 … the saved brand keeps the pick order, bold then premium`).

**Trap for a re-verifier.** The prism3 example sets `radiusScale` and `density` explicitly, so a pair that shares only
those (soft and generous) shows nothing about trait order: the engine notes "set explicitly" for both. The arm uses
`neutralEmphasis`, which the example leaves unset. The chrome suite's older personality check read the first `.p3-sub`
under the block, which is now the order line, so the words-on line carries a hook, `personality-fills`.
