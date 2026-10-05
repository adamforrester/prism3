---
engine: minor
---
Layout refuses a first breakpoint that isn't 0px (#2132). Breakpoints are mobile-first min-widths, so
the first is the layout for every width below the second, and a first floor of 320 left screens under
320px with no layout. `buildLayout` now throws when `layout.breakpoints[0]` is not 0, with the owner's
approved wording: "The first breakpoint must be 0px. This brand starts at <n>px." (owner decision
2026-10-05, F4 A). Narrowing what the engine accepts is a behavior change, so this is a minor bump with no
contract change. No committed artifact moves: every corpus and example brand starts at 0. Showing the
refusal on the studio's import is the UI lane's follow-up.
