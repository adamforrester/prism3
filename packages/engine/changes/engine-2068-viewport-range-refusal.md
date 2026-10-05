---
engine: minor
---
Typography refuses an empty or reversed viewport range (#2068). `fluidClamp`
divides by maxViewport - minViewport, so a brand with minViewport equal to maxViewport emitted
`-Infinityrem + Infinityvw` (invalid CSS, the declaration dropped) and one with minViewport above
maxViewport emitted a clamp() that shrinks type as the viewport widens. Both built without an error.
`buildTypography` now throws when minViewport >= maxViewport, whether or not `fluid` is on (owner
decisions 2026-10-05: refuse, and Q16 = a). The message is the owner's approved wording, one sentence for
both cases: "The minimum viewport (<min>px) must be smaller than the maximum viewport (<max>px)." No
committed artifact moves: every corpus and example brand uses a valid range (the default 375/1280, or nb's
375/1440). Offering the refusal up front in the studio is the UI lane's follow-up.
