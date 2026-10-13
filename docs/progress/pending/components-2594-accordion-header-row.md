## (2026-10-13) — Accordion: the header centers a title row, so one line sits centered under the 44px floor (#2594, owner decision Q276 A)

**Status:** the accordion def plus tests. ENGINE minor (change note). CONTRACT unchanged. No executor change, so `EXECUTOR_REVISION` stays where main has it.

**What it does:** the indicator (`leadingIndicator` / `trailingIndicator`) and `titleBox` move into a new `titleRow` frame. The header centers that row (counter-axis CENTER); inside the row the items stay top-aligned, so a wrapped title keeps the glyph on its first line (Q262 A, Q266 A). The gap moves from the header onto the row, which grows across the header. Padding (8/12/16), the focus ring drawn inside the header's edge (Q257 A) and the Divider are unchanged.

**The diagnosis:** the header was a top-aligned row with a min-height, so whenever the floor added height, all of it landed below the content. At small, the 16px glyph plus 8 + 8 of padding left 12px under it; medium and large were exact only because glyph plus padding happened to equal the floor. Centering the header directly would have broken Q262 (a wrapped title would center the glyph on the whole block), which is why the row is its own frame.

**The name:** `titleRow`, because the title-row subcomponent (#2456, Q267 A) is the thing that will take its place. When that lands, it can be a nested instance under the same part name, in the same position, with no other restructure. It's a layer name, not brand-facing.

**Tests:**
- `test.ts` `#2594 accordion header (Q276)`: places the content with the plan's alignments and each brand's emitted min-height, padding, glyph size and label type, and asserts it is centered within 0.5px against half the header's own height, at every size and icon position in all five brands (30 measured).
- `test.ts` `#2417 accordion header (Q262)`, reworked: it now reads the alignment of the indicator's parent row rather than the header, and asserts that row is top-aligned.
- `test-update-apply.ts` `accordion`: a set built from the def before this PR (reconstructed from today's def; its 24 plans are byte-identical to main's) is updated in place. The dry run names the centering and the added row and refuses nothing. Every member keeps its key and id, and so do each header and Divider. The structure is read off the shim's nodes, and the next dry run reads all 24 current. A later update keeps the row and every node under it, by id.

**A cost worth knowing:** the in-place update pairs a node's children by name under the same parent. So the indicators and the title, which move into a frame the file didn't have, are built fresh inside the row and the old ones are removed. Their ids change. The title is a text property, so a placed instance's text carries over. A placed instance's own chevron or plus-minus choice on the nested indicator does not. The test states this (`acc/moved children`). Accordion is held off the NB master until this merges (Q276.2 A), so only QA builds pay it. Adopting moved children into an inserted frame would need an executor change and a dry run that lists moves: #2595.

**Owner decisions Q279 A, A (2026-10-13):** the update cost above is accepted (placed instances keep their title text and lose a per-instance indicator choice; no shipped file has Accordion yet, per Q276.2 A; adopting moved children stays #2595), and the layer name `titleRow` is approved as the future slot for the title-row subcomponent (#2456).

**A trap for whoever re-verifies the Q262 arm:** with the indicator stretched to the row and the title the taller box, centering the row's items moves nothing a layout model can measure. The arm holds the row's top alignment as a literal from Q262 A and Q276 A, and that literal is what fails if the items are centered.
