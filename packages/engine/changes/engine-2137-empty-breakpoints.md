---
engine: minor
---
Layout refuses an empty breakpoints list (#2137). `layout: { breakpoints: [] }` built a brand with no
layout at all, and the first-breakpoint refusal (#2132) skipped it because an empty list has no first value
to name. `buildLayout` now refuses it first, with the owner's approved wording: "The brand needs at least
one breakpoint, starting at 0px." (owner decision 2026-10-05, Q22 a). Narrowing what the engine accepts is
a behavior change, so this is a minor bump with no contract change. No committed artifact moves: no
committed brand, fixture or brief declares an empty list. Offering the refusal up front in the studio is
the UI lane's follow-up.
