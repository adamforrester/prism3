---
engine: minor
---
A new component, `card-number-field` (CardNumberField, #2343 PR 4, the card-number half of #2429): TextField with
the card network's payment tile at the trailing edge of the box, built by the shared field factory (84 members,
TextField's count). The factory gains a third edge, `mark`: the box's trailing cell is a swap slot that binds its
height alone (`size.{size}.mark-height`, `icon.size.sm` at small and medium, `icon.size.md` at large), keeps the tile's
proportion (`aspectLock`), takes no ink from the field at any state (`fixedPaint`), and starts at the generic tile.
`swapDefault` on a `fixedPaint` slot now names a brand mark (`brand-mark/<kind>/<name>`) instead of an icon. The
`brand` prop offers the card networks only (Q-C7 A, awaiting the owner): a typed list in the def (`generic`, `amex`,
`diners-club`, `discover`, `maestro`, `mastercard`, `visa`), each checked to be a tile in the mark set's tile kind, and
never a wallet or pay-later tile. The tile kind is still read by artboard, so the `card/` to `payment/` rename reached
it without an edit. Only existing token roles are bound, so CONTRACT is unchanged. A new gate, `lint-mark-slots.ts`,
holds the slot to its own literal network list (each a tile in the folder), the generic default and the tile's
proportion;
`lint-mark-colors.ts`'s host arm now refuses any paint on a carried mark and lists its hosts by hand.
