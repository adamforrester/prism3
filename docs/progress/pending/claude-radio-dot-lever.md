## (2026-10-27) — Radio dot size, one brand setting: the reference brand's dot is 14px at medium (#3086 part 1, Q816 A)

**What.** A new value lever, `radioDot` (Default = 50, then 60 / 70 / 80): the checked radio's dot as a share of
the box edge, applied to sm, md and lg alike, snapped to the 2px sub-grid and capped at the box minus its 2px ring.
It moves the values of the existing `control.size.{sm,md,lg}.dot` only, so no token name is added and
`CONTRACT_VERSION` holds (`token-contract --check` and `lint-contract-version` both clean). The reference brand sets 70
in `nbThemeFrom` and in `examples/nb-redesign.design.md`. Its home is a new Radio section on the Components page,
Radio options, in the Studio and the plugin. Copy is a DRAFT.

| Share | compact 12/16/20 | comfortable 16/20/24 | spacious 20/24/28 |
|---|---|---|---|
| 50 (Default) | 6/8/10 | 8/10/12 | 10/12/14 |
| 60 | 8/10/12 | 10/12/14 | 12/14/16 |
| 70 | 8/12/14 | **12/14/16** (the reference brand) | 14/16/20 |
| 80 | 8/12/16 | 12/16/20 | 16/20/22 |

**The diagnosis that decided the snap.** "Snapped to the dimension ladder" and "14 at medium" cannot both hold on the
reference brand's own grid: its comfortable `core.dimension.*` runs 10, 12, 16, so the nearest step to 14 is a tie
between 12 and 16. Feeding 14 into the grid (as #910 fed the half-dot px) mints `core.dimension.14`, a new
brand-dependent path that `token-contract --check` reports, against the owner's "no new token". So the dot snaps to the
2px sub-grid the control corner already rides (`snap2`, #1015). A dot on the grid aliases its step (sm 12, lg 16); one
off it is a plain px through `controlLeaf`'s literal branch (md 14), flagged `offScale` with the share on its
extension. The grid keeps feeding the DEFAULT half dot whatever the setting says, so moving the setting removes no
primitive either (`core.dimension.10` is guaranteed).

**Default brands byte-identical.** At 50 `radioDotPx` is `edge × 0.5` exactly, not a rounding that happens to agree,
and the Theme carries no `radioDot`. `regen` moved only the reference brand's files.

**Gates (test.ts 19h).** G1 the reference brand's dot is 12/14/16 in DTCG and in the Figma control collection, for the
legacy fixture and the seed. G2 every default corpus brand's dot is half its box with the #910 line and no share, and
`radioDot: 50` written out is byte-identical to unset. G3 nine share × density brands against a hand-worked table, per
rung. G4 dot ≤ box − 2 × ring, the ring read from `border-width.thick` and Radio.Control's binding. Mutations M1–M5 in
the block header, each failing by name. `test-component-groups.ts` holds the Radio section to the defs that nest
`radio-control`, and pins the defs binding `control.size.*.dot` to Radio.Control, Badge and List.Item.

**Trap for later.** Badge's dot and List's bullet bind the same tokens, so the reference brand's badge dot is now 12
(was 8) and its bullets 12/14/16. That follows from "no new token" and is named in the lever's description. Splitting
them off would need a new token. At sm the 70% dot (12 in 16) fills the ring's inside with no gap. Both are open for
the owner on the PR.
