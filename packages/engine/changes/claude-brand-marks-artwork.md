---
engine: minor
---
The owner's brand-mark artwork replaces the placeholders (#2343 PR 3): 74 marks in four kinds. The `card/` kind is
renamed `payment/` (owner decision Q780 A), one full-bleed 32×20 tile for every logo in an "accepted payments" row
(15 tiles: card networks, wallets and buy-now-pay-later, plus `payment/generic`, the owner's "no card type yet"
card). The `wallet/` kind is renamed `logo/` (Q783 A), one 24-high logo per provider hugging its artwork (14
logos). `social/` is the full set of 21, each in full color and as `-mono` (Q782), and `provider/` holds the Apple,
Google and Facebook sign-in glyphs. `social/x` and `social/x-mono` were supplied as `twitter`; the files are the X
glyph. Every file has a provenance record stating that the owner assembled it from several public sources and
hand-edited it, with the sources not recorded. Files were normalized only as far as `emit-marks.ts` requires, each
step listed in the record's `normalized`: clip paths dropped, ground rectangles written as paths, color keywords
written as hex, `<use>` inlined, one gradient transform folded, gradient definitions moved first, and on two social
marks a few coordinates that spilled past the dropped clip clamped to the artboard. No color changed.
`brand-mark`'s `name` axis moves: `card/*` → `payment/*`, the black wallet lockups → `logo/*`, `wallet/paypal` →
`logo/paypal-wordmark`, declared in `COMPONENT_RENAMES`; `wallet/apple-pay-white`, `wallet/google-pay-white` and
`provider/apple-white` are dropped. The plugin's Update now reads a single component under a value the ledger renamed
or dropped, so a mark built before the rename is renamed or deprecated in place. A provenance record may say
`fullBleed: false` (payment tiles only; `payment/generic`, which has no ground), which skips only the tile-ground
check. No token name moves, so CONTRACT is unchanged.
