## (2026-10-27) — Brand marks: the owner's artwork, kinds renamed payment and logo (#2343 PR 3)

**Status:** data drop plus the kind rename. 74 SVGs under `packages/engine/marks/`, each with its provenance record;
`card/` → `payment/` (Q780 A), `wallet/` → `logo/` (Q783 A). ENGINE minor (change note). CONTRACT unchanged: no token
name moves. `brand-mark` 19 → 74 members, accepted on `lint-component-surface.ts` and `lint-component-renames.ts`. One
plugin reader change (the Update reads a mark under a renamed value), no executor change. Merges after #3047.

### What changed

- **The set:** 15 `payment/` tiles (32×20, full-bleed), 14 `logo/` logos (24 high, hugging the artwork, width per
  record), 3 `provider/` sign-in glyphs, 42 `social/` marks (21 providers, full color and `-mono`). Owner decisions
  Q778–Q783 (2026-10-27). Provenance as the owner decided: assembled from several public sources and hand-edited, the
  sources not recorded, the provider the rights holder, dated the day supplied.
- **Normalized only as far as the emitter and the gates require**, every step written into the record's `normalized`
  list, built by a script and checked by rendering each original and its normalized file in Chromium:
  - the export's `<g clip-path>` dropped where the clip was the artboard (a no-op), and on 11 logos where it was the
    frame, with the artboard set to the frame's width: the export rounds a 25.51-wide frame up to `width="26"`, and a
    logo hugs its artwork (Q781 A). Geometry proves no ink sits past the narrowed artboard;
  - the tile grounds' `<rect>` written as `M0 0H32V20H0Z`; `white` / `black` as `#FFFFFF` / `#000000`; the Diners Club
    logo's four `<use>` inlined; Messenger's `gradientTransform="translate(4.02 24) scale(26.4)"` on a unit circle at
    the origin folded into `cx`/`cy`/`r` (the same circle);
  - gradient `<defs>` moved before the paths (Discover logo, Messenger): `lint-mark-colors.ts` compares paints in
    document order, and the emitter writes `<defs>` first, so the export's order read as a changed color;
  - Pinterest and YouTube spilled past the 24×24 artboard by 0.0198 and 0.0238, ink the dropped clip had trimmed. The
    coordinates past the edge are clamped to it, in those paths only (each absolute `M/L/C/H/V/Z`, sampled first), so
    the outline stays inside by the Bézier hull property and nothing moves further than it spilled. Clamping every
    path whose control points stray (a first cut) would have moved Snapchat by 0.1 for no reason; measured, then
    narrowed.
- **`social/twitter*` is the X glyph**, so it ships as `social/x` and `social/x-mono` (the placeholder name).
- **`payment/generic` is the owner's card silhouette with no ground**, not a full-bleed tile, so it fails Q720 A's
  ground check as drawn. Its record says `fullBleed: false` (allowed only on `payment/`, only `false`), which skips the
  ground check alone: every path then counts as a later path, so none may span the artboard or sit within 1 of it, and
  the flag cannot hide a ground. Put to the owner on the PR (Q-P1).
- **The rename, per docs/30:** `COMPONENT_RENAMES` gains value renames `card/*` → `payment/*`, the black wallet
  lockups → `logo/apple-pay` and `logo/google-pay`, `wallet/paypal` → `logo/paypal-wordmark` (the lockup is the
  wordmark), `wallet/shop-pay` → `logo/shop-pay`, and drops for the white lockups and `provider/apple-white` (the
  owner's `provider/apple` is the white glyph). A single component's reader (`readSingleView`) skipped any value with
  a second slash that was not a plan coordinate, so a mark built before the rename was invisible to Update and would
  have been rebuilt beside itself; it now admits a value the ledger renamed or dropped.

### Gates, and the mutations that fail them by name

- `lint-glyph-geometry.ts`: a rounded ground on `payment/visa` → **TILE BAKED**; a border ring over `payment/amex` →
  **TILE BORDER BAKED**; `fullBleed: false` on `payment/visa` → **TILE BORDER BAKED** (the flag hides nothing).
- `lint-mark-colors.ts`: `tileEdge` removed from the def → **TILE EDGE** on every tile; `#1434CB` → `#1434CC` in
  `logo/visa` → the record mismatch, by file.
- `lint-mark-provenance.ts`: `social/x.svg`'s record removed → "has no record"; new self-checks for `normalized` and
  `fullBleed`.
- `emit-marks.ts`: `logo/visa`'s width stated 28 → refused, by file.
- `lint-icon-count.ts`: "74 marks" in the description → fails by field. Its brand-mark scope reads `description`,
  props, part notes and `codeOnly`, not `summary`, `docs`, `ai` or `notes`, which also ship; filed as #3062.
- `test-update-apply.ts`, new section: a payment tile and a logo built under their former names are renamed in place,
  keys and ids kept. Mutation: the ledger values dropped from `readSingleView` → `marks/rename: dry run` (2 adds, 0
  renames).

### Traps for whoever re-verifies

- The test shim sizes an imported vector from the path's numbers read as alternating x and y. Real artwork with
  relative commands or exponents reads back as drift Figma does not have: three square marks did. The two mark
  update tests now take the marks the shim reads clean in a first build, and say so.
- A visual diff of a removed clip against the original shows anti-aliasing at the clip edge even where the clip was a
  no-op. Judge the clip drops by geometry (no ink outside the artboard), not by pixels.
