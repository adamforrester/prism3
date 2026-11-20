## (2026-11-18) — Weight roles refuse a fractional or out-of-range weight (#3871)

**What.** `typography.weightRoles` was a bare number. A weight role keys a primitive, `core.font.weight.<value>`, and
the role aliases it, so `default: 450.5` emitted `{…weight.450.5}`, which a DTCG reader takes as the child `5` of
`weight.450`: one alias in the tree resolved nowhere. And `max: 0` or `strong: 2000` compiled cleanly into
`$type: fontWeight` values DTCG's 1–1000 range rejects. `brandTheme` now refuses each, naming the role, with the same
reject-not-clamp policy as `rangeLevers` (#332), and the schema types each role as an integer in [1, 1000], so a
file-driven brief stops at the schema first. The per-mode weights (`modeLevers.<mode>.weights`) already refused
anything outside [100, 900], but took 450.5 and broke the same way, so they must now be whole too.

**Why in `brandTheme`.** It is the one choke point every entry path passes through (CLI, MCP, the web playground, the
plugin). The schema alone would leave an in-memory brief from a host unchecked, which is how #332's lever bugs got in.

**Held for the owner (on #3871).** Two choices stay open: whether the roles must also be non-decreasing
(subtle ≤ default ≤ emphasis ≤ strong ≤ max), as line-height rungs are; and whether the global range [1, 1000] and the
per-mode range [100, 900] should be one range. The refusal wording is a draft.

**Measured.** A new `test.ts` #3871 block: on main's engine, 7 arms fail (the fractional role, four out-of-range roles,
the fractional per-mode weight, the schema); with the fix all pass, and whole weights 1/450/1000 build with every alias
resolving. Mutation: the global check's `Number.isInteger` → `Number.isFinite` fails "#3871 a fractional weight role
(default 450.5) is refused by name". Every committed artifact regenerates unchanged.
