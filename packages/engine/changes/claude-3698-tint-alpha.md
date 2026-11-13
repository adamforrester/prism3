---
engine: minor
---
A subtle fill's published contrast is measured at the alpha that ships (#3698 finding 7a). `settleSolidTint` composited
the tint at the nominal `step / 100`, while the overlay and field-wash paths composite at `emittedAlpha`: the hex dialect
writes 30% as 77/255 (0.302), so the stored ratio overstated the drawn one by up to 0.05. The step guards (the hover
label's text bar and the visibility bar) and the media-veil picker now measure the same emitted alpha. On the committed
brands only stored `contrast` numbers move, on each overlay brand's `selected` tint in the hex dialect. No step, value
or name moves, and no contrast contract fails.
