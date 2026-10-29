---
engine: minor
---
Brand marks (#3134, owner direction 2026-10-28). `PartDef.tileEdge` gains `edgeWhen`, which narrows the 1px edge alone to the members it names: a tile it leaves out keeps its bound corners and its crop and draws no stroke. BrandMark names only the tiles whose own fill is under 3:1 against a white page, read from each file, so `payment/amex`, `payment/generic`, `payment/shop-pay` and `payment/venmo` lose their edge and every white tile (and Klarna's pale pink) keeps it. `provider/apple` and `provider/facebook` are drawn black (#000000) where they were white, so they show on the canvas like every other mark (the owner: "a consumer tints them as needed"). No token tree moves.
