---
engine: minor
---
Radio dot size (#3086, owner decision Q816 A, with no new token): a new optional brand input, `radioDot: 50 | 60 | 70 | 80`
(Form, after Banner style, default 50). It sets `control.size.{sm,md,lg}.dot` to that share of the radio's box edge, at
every size, snapped to the 2px sub-grid and never wider than the box minus its 2px ring. 50 is half the edge, the dot
every brand had. Only those three tokens' values move, so no token is added and CONTRACT is unchanged. The reference
brand sets 70 in its legacy fixture and its redesign seed: 12 / 14 / 16 at sm / md / lg (was 8 / 10 / 12). Its sm and
lg dots link to `core.dimension.12` and `.16`; its md dot is a plain 14px, because no dimension step holds 14 there and
the setting adds no primitive. List bullets and the badge dot bind the same tokens, so they follow. Every brand at the
default is byte-identical. Radio.Control's description now says the dot is half the ring unless the brand sets a larger
one. The lever copy is a DRAFT for the owner. The Studio and the plugin draw it in a new Radio section on the
Components page, as Radio options.
