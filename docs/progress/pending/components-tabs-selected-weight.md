## (2026-10-10) — Tabs: the selected label in the emphasis weight, every tab held at its bold width; every brand ships the default label weight (Q225 A, Q226 A)

**Status:** engine (typography emission, the schema's `texts.also`, the tab def) plus a test-only shim reuse. ENGINE minor (change note). CONTRACT 14.6.0 (MINOR): six added paths, `type.label.{sm,md,lg}.default` and `.default-link`, now guaranteed.

**Why:** on NB a selected tab and a hovered tab looked almost the same (bars 1.09:1 apart, the same label weight; Q224). Q224 A as first written described the def as it already was, so the lane asked: bold selected, regular unselected, with the width held (Q226 A), and every brand shipping the regular label style (Q225 A), as its own PR after #2518.

**How the width is held, with in-flow primitives only:** the label sits in a hugging column (`labelBox`) beside a zero-height, clipping box (`reserve`) holding a bold copy (`labelReserve`). A hugging column is as wide as its widest child, so every tab takes its bold label's width, and the copy is never seen. One Label property drives both texts through the new `texts.<prop>.also`. The code twin is the usual `::after { content: attr(data-label); font-weight: bold; height: 0; visibility: hidden }`.

**Traps found on the way:**
- NB's legacy theme (`nbThemeFrom`) builds its typography with no input, so the union never reached it: the contract counted the six paths as brand-dependent until it was routed through `withLabelDefault` too.
- The union first turned an EMPTY label weight set into `['default']`, which silently disabled #1639's refusal. An empty set now passes through untouched.
- `default-link` comes with `default`: six new styles, not three.

**Tests:** `#2416 Q226 A the weight cue` (the label default/emphasis by selection, typed; the reserve emphasis, clipped, zero-height, driven by the same property; nothing else differs) and `#2416 Q226 A the selected bar clears 3:1` (all 16 brand × mode cells; lowest is NB at 3.03:1) in `test.ts`; `tab width held (Q226 A)` in `test-write-components.ts` (emphasis 8px wider via the shim's `textAdvance`; every selected tab measures its unselected twin; no footprint miss). Mutation, the reserve following `selection` instead of staying bold: both arms fail by name, and the executor reports `footprint ->`.
