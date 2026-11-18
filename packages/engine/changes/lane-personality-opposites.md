---
engine: minor
---
The personality vocabulary names its direct opposites (#3976, owner decision Q-PW1 A): `TRAIT_OPPOSITES` in `vocabulary.ts`, exported from `@prism3/engine`, holds the four pairs (soft/sharp, dense/generous, calm/energetic, bold/restrained) whose shared settings pull opposite ways, so only the first-listed of a pair can take effect. Resolution is unchanged: the engine still takes both and notes what the second kept. The studio reads the pairs to turn a word's opposite off when the word is picked, and now stores `personality` in pick order, the order the engine reads it in. No committed artifact moves.
