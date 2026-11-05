## (2026-11-04) — A focused field draws a 2px focus edge in place of its border (#3399)

Built as the owner decided on #3399 (Q22 A, Q22.1 A), replacing #3328's ring inside the border (#3372). The focused field's
own stroke becomes the focus edge: 2px (`focus.ring.width`), drawn inside from the outer edge at the field's own radius, so
the box keeps its size and the corner gap #3399 reported cannot occur (the edge and the field share one radius by
construction). A default field draws it in `border.focus`; an error, warning or success field in its status border, so the
status stays visible while focused. Text field, Password, Search, Card number, Textarea, Select, the Code input cell and
Counter (outline). Counter's ghost and every underline-edge field keep the outside ring (#2695 Q3, #3328 Q-F1 A).

### How

- **The edge is the border's weight, per state.** `strokeWidth: 'border-width.{state}'`, with `fieldEdgeWidths` (in
  `text-field.ts`) binding the focus states to `focus.ring.width` and every other state to the hairline. The paint was
  already right: `border.focus-visible` and the status-led `{status}.border.focus-visible` keys existed. The Counter gained
  `outline.border.focus-visible` → `border.focus`; until now its outline edge stayed at the rest color under the ring.
- **Two schema widenings, each argued at its rule.** A `strokeWidth` key may name `{state}` (the footprint reason
  `strokeEdges` already had: drawn inside, out of layout). An `absolute` part may take a VARIANT `presentWhen` (the
  Counter's ring on ghost only); `present()` already AND-composed it with `when`, so the old "early return" refusal was
  stale. A `presentWhen` on `state` stays refused.
- **The ring moved into `applyFieldStyle`.** The outline def draws no ring, so the underline style ADDS the shared ring
  (`UNDERLINE_RING`, last in the frame, as every field had it), and its plans are as before.
- **`borderInset` / `absoluteBorderInset` removed** from the schema, the projection, both executors, the readback and the
  ledgers, with `lint-absolute-inset`'s `MUST_SIT_INSIDE_BORDER`. `EXECUTOR_REVISION` 51 → 52 (see the PR for the
  collision with #3380's reservation); `executor-reach.json` names the 9 sets, measured clean.

### The default field's 2.4.13 (Q3399.1 A)

**The default field's rest border → focus change is 1.19–2.21:1, not ≥3:1, in every corpus brand and mode.** The
decision's premise was a `neutral.400` border going to near-black (~5.6:1). Here `border.focus` is the brand's action color,
and `field.border.rest` is a mid-gray held at 3:1 against the page, so the two sit close in luminance. The inner 1px
(fill → focus) changes at 4.56:1 or more everywhere. The owner took option A (2026-11-04): the default field falls under the
trade-off Q22.1 A accepted for status fields, AA met and SC 2.4.13 resting on the inner 1px band.
`#3399 field focus 2.4.13` now asserts fill → focus ≥ 3:1 (a literal from SC 2.4.13) and the 2px width, and reports
rest → focus without asserting on it. Every def the edge reaches records the trade-off in `notes.contested`
(`FOCUS_EDGE_DEFAULT_NOTE`), and the arm holds it there by the decision's name. Options B (a darker field focus role) and
C (a wider edge) were not taken.

### What a Field style switch now does

Switching Field style in place (#2695 Q16 A) still keeps the set, every member and every other node, but the 24 focus
members gain the ring going to Underline and lose it going to Outline, since only Underline draws one.
`test-update-apply.ts` holds both directions to the literal 24. This follows from two decisions already taken (Q22 A: the outline
edge draws no ring; #3328 Q-F1 A: the underline edge keeps one), so it is the expected result, not a defect. The ring holds
no designer content, so nothing a designer authored is lost. No change and no owner question.

### Traps

- The test stub models host truth for a bound weight: `strokeWeight` splits across the four per-side keys (#1332). An arm
  reading `boundVariables.strokeWeight` sees nothing.
- On the plugin path a root-frame member (the Code cell) sits inside a component set, so `page.children[0]` is the set.
- Textarea's grip sits 1px in from the corner (`grip-inset`, the hairline), so at the 2px focus edge its 16px artboard
  overlaps the edge by 1px. Measured: the drawn glyph's farthest point is 19.71 on its 24-unit artboard, so it stays 3.86px
  in from the outer edge and never reaches the edge's pixels. The inset stays the hairline; `#3399 textarea grip clears the
  focus edge` holds the glyph more than the literal 2px in, in every corpus brand.
