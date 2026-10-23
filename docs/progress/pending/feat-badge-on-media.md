## (2026-10-23) — Badge: a status label that sits on photography (#2983, draft)

Owner decision Q644 A makes the commerce-card label on a product image a `badge` type=status. The wireframe (a private Artifact, linked on #2983) rendered every corpus brand × mode over three generated photo grounds and asked Q2983.1–3. This draft builds the recommended answers and waits for the owner.

- **API (Q2983.1 rec):** a `surface` axis, `default | media`. It reuses the name Button, Icon Button, Link and Focus Ring give to the ground under a component. It is authoring, so `emphasis` keeps its runtime footprint check. `lint-axis-values` records badge's set as `overlapping` the canonical `default | inverse`.
- **Fill (Q2983.2 rec):** `background.primary`, no edge, under `text.<tone>` (neutral: `text.primary`). Lowest ratio across the corpus is 4.94:1.
- **Size (Q2983.3 rec):** 2px × 8px padding, so the label is 18px tall with the status type's 12px text. Today's status label is 30px.
- **Gate:** `test.ts` holds a literal on-media table, read from the issue rather than from the def. It pins the def's bindings, measures each ink on its fill at 4.5:1 in all 20 brand × mode cells, and reads the five projected media members' fill, ink, edge and padding.
- **Paint grammar:** the grammar now carries the surface second (`{tone}.default.…` and `{tone}.media.{slot}`). Built first with a leading media template over the old grammar, the media arm failed by name: media members fell through to the subtle edge. `lint-paint`'s census moves from 20 members to 25, and its provenance arm names the six media keys whose role carries no tone.
