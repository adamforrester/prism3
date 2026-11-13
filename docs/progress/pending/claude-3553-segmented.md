## (2026-11-11) — A single choice too wide for one row becomes a list, never an orphan (#3553 Q-UI2)

The UI polish review (#3553) found segmented choices that wrapped to leave one option alone on a row: Interactive's
Outline hover drew 3 + 1 at web 1280 ("No hover fill" alone) and 2 + 2 at 1024 and 380, and Components' Control shape
drew 3 + 1 at the plugin's 380 ("Pill" alone).

**The owner's Q-UI2 A:** "swap to a select (as Q-UI1 does), or to a radio list". This builds the radio list. A single
choice whose options don't fit one row is laid out one option to a row, at the column's width. Each option keeps its
button, hook, role (`radio` in a `radiogroup`, or a pressed chip), keyboard and accessible name in both forms. A select
would have changed every one of those, and every test that clicks an option by its hook.

**How.** `stackWhenWrapped` in `ui/lever-kit.ts` serves both single-choice controls, `choice` (segmented) and
`chipChoice` (chips, now classed `p3-chips-one`; Personality's many-word chips still wrap). After each resize, in the next
frame, it lays the row out unstacked and sets `data-stack` only when its options' tops differ. Measuring in the frame
after, not in the ResizeObserver's callback, keeps the observer from sizing what it observes inside its own callback.
#3115's bold-width reserve still holds, so picking an option never moves the decision.

**Verified.** New test:chrome section `3553-q2`, in shard 3. Web at 1280 and 1024 and the plugin at 380, both themes. On
Interactive, Shape, Type and Components, every drawn segmented choice and single-choice chip row sits on one row or
one option to a row, never between. Section 3115's tightest case, which reads the Outline hover row's own max-content
width, now clears `data-stack` first: at 1280 the group is stacked, and a stack's max-content is its widest option. Measured: 1 of 6 stacked at 1280 (Outline hover), 5 at 1024 and 4 at 380. Mutation,
after a `wip:` commit: `stackWhenWrapped` dropped from both controls fails `#3553 Q-UI2 … no single choice wraps to an
orphan`.
