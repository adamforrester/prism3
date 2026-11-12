---
engine: minor
---
Component usage lines from the 2026-11-11 metadata audit (#3555 C2, Q-MD6, Q-MD9, Q-MD11). Each icon-only sibling now
has its own `whenToUse`. The counter, card-close and close-affordance examples belong to the neutral FlushIconButton and
IconButton, which the other siblings already send them to. Button.Destructive and Button.Neutral send an icon-only
action to the IconButton of the same color. Radio.Group, Radio.Row and Select agree on one threshold: up to 7 options is
a radio group, and 8 or more is a select. Radio.Row is generation tier 9 with the child-only `whenToUse`, and the focus
ring's `avoidWhen` notes that fields draw their own focus edge.
