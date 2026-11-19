## (2026-11-18) — Authored interactive anchors must be on the ramp (#3873)

**What.** `pickBrand` in `modes.ts` falls back to step 500 when the anchor it is given is not on the ramp. For a
derived anchor that is a harmless aid, but an authored anchor is applied `exact` (#331) and never corrected. So
`actionAnchorStep: 99999` (or 37) shipped `primary.500` uncorrected, and the build reported 11 high-contrast contract
failures on a step the author never chose, with no word about the typo. `destructiveAnchorStep`, a `modeAnchors` step
and an `interactivePalettes[].anchorStep` pin did the same. `brandTheme` now refuses each, naming the nearest real step,
through the `requireStep` helper the surface checks already use (#1972, #1985, #2033). Its message now opens with the
full input path, so the surfaces pass `surfaces.<mode>.<key>` themselves and their wording is unchanged. A
`modeAnchors` column other than `primary`, `destructive` or a declared interactive column was ignored, despite the
schema's "deep-validated by brandTheme()"; it is now refused. As a backstop, `pickBrand` throws on an exact anchor off
the ramp instead of falling back.

**Scope.** `interactivePalettes[].anchorStep` is not named in the issue, but it is the same root cause: an authored
pin (`anchorPinned`) reaches `pickBrand` as `exact`, with the same fallback. The wording is a draft.

**Measured.** `test.ts` #3873: on main's `theme-brand.ts` and `modes.ts`, all 8 arms fail (7 inputs built cleanly, and
the resolver fell back for an off-ramp exact anchor). With the fix they pass, and on-ramp pins in each place still
build, with the action pin applied at the step authored. Mutations, each failing by name: the `actionAnchorStep`
check disabled fails both action arms (the resolver's backstop never runs in `brandTheme`); the `pickBrand` throw
disabled fails "#3873 pickBrand refuses an exact anchor off the ramp rather than falling back to 500". Every
committed artifact regenerates unchanged.
