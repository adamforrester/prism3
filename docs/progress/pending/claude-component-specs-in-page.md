## (2026-10-25) — Spec panels in their own column beside the usage panel, on request (#2830 phase 2, draft pending Q2830.8–.9)

**What.** `apps/plugin/src/spec-panel.ts` draws one spec panel per family in its own column (Q2830.1 B): `SPEC_WIDTH` (880) wide, `SPEC_GAP` (40) right of the family's live usage panel and top-aligned with it. It reads the phase 1 spec model (`componentSpec`), with each def materialized for the file's brand. Per set of the family, it draws:
- **Anatomy:** the usage panel's numbers, from `anatomyMarks`.
- **Spacing and size:** a live specimen per size, without and with a leading visual, redlined in a fixed magenta. Each redline is labeled `variable · px`, with the px read off the specimen.
- **Color:** a table per value of the color key's non-state axes. Rest is shown in full; each other state shows only what changes.
- **Nesting and properties.**

The agent command `draw-specs` runs it. Build and Update never do (Q2830.3 A). Owner's answers: Q2830.1 B, Q2830.2–.7 A (2026-10-24). Wireframe: https://claude.ai/artifact/5HwWQduNSyWnp9Vv27g6mL

**The color table (Q2830.8 A and Q2830.9 A, built on the 2026-10-25 wireframe's recommendations, pending the owner's answers).**
- One row per binding, in fixed columns (`COLOR_COLUMNS`): State 128 · Part and role 192 · Variable 368 · Value 120. Each is sized from the widest string any set's panel writes, measured in the default brand's body/sm (Inter 14). The longest variable, `color/inverse/interactive/destructive/overlay/pressed`, is 351px.
- The Value cell is a swatch bound to the variable, plus the hex the file resolves for the panel when it's drawn (`hexFor`, `resolveForConsumer`).
- The draw measures each string in the template's face, and names any wider than its column in the run's result. A gradient takes a row per stop, so no cell holds two names.

**Every set moves once.** `PANEL_REACH` now spans both columns (40 + 560 + 40 + 880). Update reserves the spec column for every lead set (`pageViews`), drawn or not, so the first Update after this spaces every row once.

**Hand edits and Update (#2956's posture).**
- An unedited earlier panel is replaced. An edited one is kept as "(edited)", retagged `kept`, moved below everything in the spec column, and named in the result.
- Update never writes into a spec panel. A live one is its set's furniture and moves with the set (`respaceLive`).
- A usage panel redrawn further right pushes the live spec panel right, and never counts it as a blocker.

**Gates.** `test-doc-panel.ts` measures with its own Inter 14 advance table, read in Chromium. Each of these fails by name:
- the panel put back under the usage panel → `specs/draw place`;
- a narrower variable column → `specs/draw no wrap`;
- a longer variable → `specs/token fits`;
- the spec column not reserved → `room/with template`.

**Deliberately not built.** The separate-file run (Q2830.6 A, a follow-up), the panel button (waits on IA v2's Documentation area, #2909), and a "specs due" line in Update's dry run.
