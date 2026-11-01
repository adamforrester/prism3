## (2026-11-01) — FieldLabel follow-ups: DRAFT markers off, the label-leads arm reads a host's own label (#3222)

Two follow-ups from #3203's MERGE verdict (owner Q3203.3 A: merge as is, then clean up).

- **Stale DRAFT markers.** Q3203.2 A approved FieldLabel's `emphasis` description and the added `docs.usage`
  sentence as written. The two `// DRAFT wording for the owner (#3200)` comments beside them in `field-label.ts`
  are gone, and #3200's pending entry now cites Q3203.2 A instead of "Prose is DRAFT". Comments only: no prose,
  emission or bundle moves, so no `changes/` note.
- **`#3200 label leads` reads the host's own label.** It took the first `label` instance anywhere in a member's
  subtree. Slider's value input nests a Text field, so with Slider's own label never built (the reviewer's mutation
  E: `label` dropped from `header.children`) the arm still read 24 labels per brand, each the nested Text field's.
  It now walks the member without entering any nested `INSTANCE` (`ownNodes`), so only the host's own label counts.
- **Proof.** On the unmutated tree the arm reads the same 2615 labels over 60/60 cells: every host's own label was
  already the first found, so nothing it passed before was wrong. Under mutation E it fails by name, `✗ #3200 label
  leads … (2495 labels; 55/60 brand/host cells …; EMPTY: …/slider)`, one EMPTY cell per corpus brand.
