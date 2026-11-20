## (2026-11-19) — Badge's accessibility prose cites the neutral contracts, the scrim's steps are declared taste, and `restrained` drops a dead target (#1775, #1043, #1863)

Three owner decisions of 2026-11-18, one PR under Q-PACE A.

**#1775 A, Badge's WCAG lines.** The `1.4.3` and `1.4.11` lines and the def's header now say which pairs are mode
contracts and which are measured. Contracted (#1745): `color.inverse.text.primary` on `color.inverse.foreground.tertiary`
at 4.5:1, and `color.inverse.foreground.tertiary` and `color.border.tertiary` against the page at the non-text bar (3:1,
4.5:1 in high contrast). Measured: the bold tone fills against the page, because each `foreground.<tone>` is contracted
against the mode's floor ground, not the page at 3:1. The issue named `border.secondary` as the neutral edge; since #2569
it is `border.tertiary`, and the contract moved with it. The wording says the engine *checks* the pairs for every brand
and names any shortfall, rather than "guarantees" them: a declared inverse band that misses is reported, not moved
(the #1745 arm's label and fill fixtures show it). Question (2) on #1775, whether the role descriptions state their bar,
was not part of the decision and is left open on the issue.

**#1043 B, the scrim.** The steps stay 40 / 60 / 60 / 70. Their provenance is written at `SCRIM_STEPS` in `modes.ts`
and in `docs/20` §8.3: chosen, not derived; light and dark after Spectrum 2 and Radix; the high-contrast step-up is this
system's own choice. No value or name moves, so no artifact changes.

**#1863 A, `restrained`.** `neutral.chroma` leaves `TRAITS.restrained`. The new `test.ts` arm reads the schema's own
`required` lists (top level and each object property's), never `levers.ts` or `TRAITS`, and fails any trait that
targets a required lever. No committed brief uses `restrained`, so no artifact moved.

**Checked.** Each of the three new arms fails by name when its subject is mutated (recorded in the PR body), and passes
on the change.
