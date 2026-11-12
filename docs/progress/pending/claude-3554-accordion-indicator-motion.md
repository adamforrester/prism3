## (2026-11-11) — Accordion.Indicator gains its motion field (#3554 Q-CC20)

Owner decision Q-CC20 (not the recommended B: the owner chose to add motion). `_accordion-indicator` had no `motion`
field; its only motion prose was a code-only note that said the chevron "may rotate 180 degrees on open" on
`motion.transition.enter / exit`. The prism3-motion accordion recipe already gives the indicator its own track, a
glyph turn on `motion.transition.default` both ways, and under reduced motion "the indicator swaps without turning".
The def now carries exactly that: enter and exit turn a chevron on `motion.transition.default` (a plus and minus swap
glyphs), and reduce motion swaps without turning. The code-only note is aligned to the same token.

- Coordinated with #3490: that issue is about `accordion.ts`'s panel wording under reduced motion, which this PR
  does not touch; the indicator's track is not part of its question.
- Prose only. The component catalog, the indicator page and the plan's documentation move; the component-surface
  baseline was re-accepted (same member count).
