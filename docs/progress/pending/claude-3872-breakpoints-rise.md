## (2026-11-18) — Breakpoints must rise (#3872)

**What.** `buildLayout` checked the breakpoint count (two to seven) and that the first floor is 0, but not the order.
`[0, 1024, 768]` built cleanly and emitted `breakpoint.lg` = 768px below `md` = 1024px, so a consumer's `lg` min-width
query fired before `md`'s and the 4/8/12 grid ladder landed on the wrong widths. `[0, 768, 768]` named one floor twice,
and `[0, -5, 768]` emitted a negative floor. Now each floor must be above the one before, in the same block as the
existing refusals: `Breakpoints must rise: 768px follows 1024px.` The schema's description has said "ascending" all
along; JSON Schema has no keyword for it, so the engine is the one place it can hold. A fractional floor (768.5) is a
real width and still builds. A `null` floor, which an in-memory brief can carry (a NaN becomes null on the way in),
used to crash on `.toFixed`; it is now refused by the same check.

**Not a design change.** The rule is the schema's own. The studio already sorts and de-duplicates the list, so no
studio edit can reach the refusal. The wording is a draft, taken from the issue.

**Measured.** `test.ts` #3872: on main's `theme-layout.ts`, all four refusal arms fail (three built cleanly, the null
floor threw a TypeError). With the fix they pass, and `[0, 768.5, 1024]` still builds. Mutation: `at <= before` →
`at < before` fails "#3872 breakpoints [0, 768, 768] are refused, naming 768px after 768px". Every committed artifact
regenerates unchanged.
