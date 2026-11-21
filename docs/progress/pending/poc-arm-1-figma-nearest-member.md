## (2026-11-20) — The Figma geometry comparison names what kept an unmatched pair apart (#3408 S6)

**What changed.** On `poc/arm-1`, with no engine change and no change to what is compared or what counts as a match.
When a code case reaches no Figma member, or a KPI 2 member is reached by no code case, `compare-figma-geometry.ts` now
names the nearest counterpart and every variant axis or boolean property on which the two differ.

**Why.** The first Figma record (#4432) left all 34 field cases uncompared, and the old note said only "no Figma member
shows …". It looked like an axis-name gap (Figma's `status` against the API's `validation`), but that alias already
existed. The real cause is that Figma's field members record the `message` boolean property at its default, `false`,
while every field story shows a message. The new lines say so: `nearest member 1:36529 differs in property message is
true in code, false in Figma`. How to close that coverage gap is an owner decision on #4432, not this change.

**Proof.** `--self-test` (in `check:build`) plants Figma's field members with `message=false` and requires both the note
and the KPI 2 failure to name `message`. It fails by name on the old text, and under two mutations: the property diff
ignoring boolean properties, and the nearest pick sorted the wrong way.
The self-test also requires the two other reasons to be named: a code-only axis (`fullWidth=true has no Figma axis or
property`) and a Figma variant axis no case names (`variant density is not named in code`), each failing by name when
its line is removed (#4435 review, S1).
After #4423 made `compare` take the contract's part list, both new self-test calls pass `partList(code)`, and the
`message` record also plants a button part the contract boxes but the case does not draw, so the call reaches the
drawn-in-Figma branch that reads the list. A two-argument call throws there (#4435 review, S2).
