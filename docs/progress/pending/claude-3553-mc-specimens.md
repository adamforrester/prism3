## (2026-11-11) — The preview's specimens: pills break at their dots, five-column cards reflow, alpha keys fit (#3553 M5, M6, M7)

Batch M-C of the UI polish review (#3553), with the owner's option A on all three items.

**M5 A.** An inverse token pill shares an inline-flex wrap (`.tpill-wrap`) with its `inverse` badge. In a narrow Style
guide card at web 1024, the pill shrank below its longest segment, and `word-break: break-word` broke inside the segment,
per character ("color / . / inver / se. …"). The breaks didn't come from missing break points: `sgPill` already puts a
`<wbr>` after every dot. The wrap now wraps (`.p3-legacy-card .sg-pills .tpill-wrap`, in `chrome.css`), so where the
two don't fit side by side the badge goes above the pill. test:smoke's #1147 check held the badge *beside* the pill's box. It now holds it outside the box in either
direction, which was always its point: a marker inside the pill is clipped with it. The badge's own tooltip still says
"shown beside the path". Changing that is a copy call, raised on #3553.

**M6 A.** The five-column fill cards (`.sg-g5`: Bold, Subtle, Brand's Disabled) were 61px wide at 1024, so "Success",
"Warning" and "Danger" clipped and spilled past the card. The grid now reflows: each column is at least 90px and never
narrower than a fifth (`minmax(max(90px, calc((100% - 56px) / 5)), 1fr)`, the 56px being `.sg-grid`'s four gaps), so a
wide ground keeps exactly five. The 760px media rule's two columns are unchanged.

**Why one rule moved and one changed in place.** `lint:live-css` protects a `styles.css` rule only after `--accept`
re-sweeps all four browser suites, which hadn't run since 2026-10-11. In this lane it held a renderer at full CPU in the
smoke sweep for 45 minutes and was stopped. So nothing new was added to `styles.css`. `.sg-g5` keeps its one rule with
a new value, and M5's rule is a chrome rule over the legacy card, as the chrome's other `.p3-legacy-card` rules are. The
gate reports 0 rule keys added since the last accept.

**M7 A.** At 1280 the alpha ramps' 8-digit hexes (`000000e6`, 56px of mono text) ellipsized by about 5px in a 51px key.
The alpha ramps now go five to a strip below a 760px preview (`ALPHA_SLIM_MAX`), wider than the 560px where every ramp
does (`SLIM_MAX`). The preview measures 707 at a 1280 web window and 800 at 1440, where ten fit whole. The opacity
scale's short values keep the shared count.

**Verified.** New test:chrome section `3553-mc`, in shard 3, both themes. Web at 1024 and 1280, Brand and Surfaces &
fills: no token pill breaks inside a word (a segment may wrap after a hyphen), every five-column card's title is whole
inside its card, and at 1280 the grids keep five columns. Web and plugin at 1280: every alpha key is whole. Web at 1600:
ten to a strip. Mutations, each after a `wip:` commit: the pill-wrap rule dropped fails `#3553 M5 … no token pill breaks
inside a segment`. `.sg-g5` back to `repeat(5,1fr)` fails `#3553 M6 … every five-column card's title is whole`.
`ALPHA_SLIM_MAX` set to 560 fails `#3553 M7 … every alpha key's hex is whole`.
