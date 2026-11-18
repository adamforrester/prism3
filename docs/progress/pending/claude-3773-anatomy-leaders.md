## (2026-11-17) — Anatomy markers: `_Label` ink, direct leaders, no brackets (#3773, owner decision B)

**What.** The usage panel's Anatomy markers (`doc-panel.ts` `drawMarkers`) follow the owner's decision on #3773. The
decision was first recorded as C (B's geometry plus a white halo and a white ring) and then revised the same day to
**B, with no halo and no ring**. This builds the revised B:
- one leader per part, containers included, in `_Label`'s literal #9747FF, ending in a 4px dot on the part's edge;
- a container's leader comes in from the left gutter to its left edge, the outermost 8px above its bottom corner and an
  inner one at its middle. A container with a part to its left where that leader would land (Accordion's title box and
  trailing indicator) takes a short top or bottom leader to its edge instead, so no leader crosses the row (owner
  decision Q-BK4 A, point 2; `containerSides`, held by `markers/no crossing`);
- each marker is a filled #9747FF disc with a white numeral (Inter Semi Bold 12), drawn by the panel itself, not a Badge
  instance;
- `PANEL_FORMAT` 7 → 8, so each drawn panel is due once on the next Update.

**Furniture disc, not a `_Doc-block` variant.** `_Doc-block`'s own header says it is the one template built from the
brand's components and semantic tokens, unlike the furniture templates, whose literal colors annotate the brand. A
literal-ink marker belongs with the furniture. A new variant would also need `repairDocBlock` to reach every template
already in a file before a marker could draw; drawn by the panel, the markers change on the next Update. The
Part-marker variant stays in the template, unused, so no template needs a repair.

**The width rule.** Brackets took one left tier per nesting level (`bracketTiers`, `MARK_ROOM`). Both are gone. The
left gutter's discs are placed by one pure function, `leftColumns`, which the width rule (`panelLayout`) and the draw
both call: the shortest container first, each disc in one column, sliding along its own left edge when another disc is
in the way. A further column is taken only when the edge has no free place, as with Accordion's header, title row and
leading indicator, which share one left edge.

**Blind to the set.** The markers stay children of the panel, never of the set or a specimen, so the set's hand-edit
check and its as-built record never read them. Every fill is a literal, so the panel's print reads them as drawn.
`markers/blind` holds this.

**Owner decisions (Q-BK4 A, 2026-11-17).** B is confirmed, with no halo and no ring. An inner container away from the
left edge takes a short top or bottom leader (built). Nested containers on one edge keep a column each. The unused
Part-marker variant is kept. The miss line "Inter Semi Bold unavailable for the part markers: used Inter Regular" is
APPROVED.

**Deferred (Q-BK4 A, point 4).** A dark stage, and the numeral on a #E0C7FF disc, wait until an Anatomy specimen can
land on one. None pins a mode today, so no dark ink is built.
