---
engine: minor
---
#2266 PR 1 (owner Q78 A and Q101 A): a new body rung, `type.body.xs`. It is 12px, on body's line height (normal,
1.5, an 18px box), tracking (normal, 0) and family role, with the same weight and variant set each brand's
body.sm carries, italics included where a brand ships them. Every body.xs composite's DTCG $description and its
.ai.json $description read, verbatim: "Smallest body text, 12px. Secondary text and metadata only, never running
text." The .ai.json when_to_use and avoid_when say when to use it and when to use caption.lg (also 12px)
instead. Its Figma text styles say "for secondary text and metadata only" where body's say "for running text".
Every brand gains four (prism3 eight) composites and text styles. No existing token moves. The token contract
gains type.body.xs.default and default-link (CONTRACT 14.2.0 to 14.3.0). No component binds body.xs yet: that is
PR 2.
