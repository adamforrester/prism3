---
engine: patch
---
Plugin: an Update re-lays a provider-logo block still on the old 48px grid (#3145). Before #3142 a single-component block was laid out at a fixed 48px pitch, so the wide marks sat over their neighbors, and an Update kept those positions. Now, while two of the marks Prism3 placed overlap, the Update moves each of them to the measured pitch, keeping its row and column. A mark moved off the old grid by hand, and a component Prism3 did not build, stay where they are; if a new spot is taken by anything else on the page, nothing moves and the outcome names the mark. Positions only: every component keeps its id and key. EXECUTOR_REVISION 45 -> 46, reaching provider-logo. No emitted artifact, token or projected component surface moves.
