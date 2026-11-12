## (2026-11-11) — Brand's style guide sections on the levers gray, and Show advanced in its card (#3553 Q-UI12, Q-UI14)

Two of the UI polish review's owner calls (#3553), each option A.

**Q-UI12 A.** Brand's Style guide drew its section containers white. In the dark chrome, previewing Dark showed the dark
type sample inside a stray white panel, while every other preview's sections (Surfaces & fills, Interactive, Type,
Shape, Depth & motion, Layout, Components) take Q24's levers gray (`p3-sgsec`). Brand's sections now take it too. The card
stays pinned light (Q24), so the gray is the light value in either chrome theme, and each specimen stays on the brand's
page. The Style guide is still the lent legacy renderer: `preview/brand.ts` adds the class after it draws, as
`preview/surfaces.ts` does for its own sections. The outer card is unchanged, as on every other preview.

**Q-UI14 A.** Shape's "Show 1 advanced" sat below the cards at page level, while Depth & motion's sits inside Elevation.
Both now sit inside the card they belong to: Base radius opens inside Radius, the card that drives the same preview,
as a lever under its own name and ⓘ with its section's description, the way Shadow tint opens in Elevation. The page
data keeps Base radius as its own advanced section, so the manifest's tier and `test-pages.ts`'s homes are unchanged.
`shape.ts` finds the host card by a shared `drive`. A section with no such card would keep the page-level fold.

**Verified.** New test:chrome section `3553-cards`, in shard 3, both hosts and themes. At 1280, previewing Dark, Brand's
sections are drawn on the same ground as Surfaces & fills' sections, read from that page. At 1280 and 380, on Shape and
Depth & motion, Show advanced sits in its card (Radius, Elevation) closed, and the lever it opens is drawn there.
Section 24's Q23 pairs, 30's heading levels (Base radius moves from L1 to L2) and its promoted-ⓘ table, and 24's Q59 list
of controls held disabled are updated to match. The Q59 list leaves the disclosure out, as Depth's already does.
Mutations, each after a `wip:` commit: the `p3-sgsec` loop dropped from `preview/brand.ts` fails `#3553 Q-UI12 … Brand's
style guide sections take the levers gray`. Shape's fold put back at page level fails `#3553 Q-UI14 … Show advanced sits
in its card`.
