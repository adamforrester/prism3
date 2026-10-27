---
engine: minor
---
Brand marks, the second icon type (#2343 PR 1, #2316). Provider marks live in packages/engine/marks/ by kind (social,
provider, wallet, card), named by brand-mark-set.ts and recorded file by file in marks/provenance.json. emit-marks.ts
writes brand-mark-glyphs.ts: each mark's SVG document re-serialized with its fills and gradient stops copied verbatim,
refusing strokes, text, images, masks, filters, clip paths, CSS, transforms and currentColor, and refusing a file with
no provenance record. A new brand-mark component (emitAsComponents) projects one standalone brand-mark/<kind>/<name>
Figma component per mark, drawn from that document with literal fills and no ink: the projector resolves its glyph
against the mark vocabulary and pushes no descendantFills into it. Every mark committed today is a neutral
placeholder, except card/generic. Two new gates, lint-mark-provenance.ts and lint-mark-colors.ts; a brand-mark arm in
lint-glyph-geometry.ts (artboard per kind, ink inside it, every listed mark projected); lint-icon-count.ts holds the
brand-mark prose to stating no count of marks. No token name moves, so CONTRACT is unchanged.
