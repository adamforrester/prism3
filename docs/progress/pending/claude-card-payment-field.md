## (2026-10-27) — Card number field: TextField with the payment tile at its trailing edge (#2343 PR 4)

**Engine {{ENGINE_VERSION}}.** The card-number half of #2429, built from its 16 recommendations (owner Q-B10 A) and the
2026-10-27 artwork calls: `card-number-field` (CardNumberField), a third output of the field factory. 84 members,
TextField's count; medium first. The PaymentField group (expiration date, security code, postal code, name on card) is
the follow-up, the proposal's PR 4b.

### What it is

- **A third factory edge, `mark`.** TextField's trailing glyph is replaced by `cardMark`: a swap slot that binds its
  height alone (`size.{size}.mark-height`, 20 / 20 / 24, the field's only added keys), carries the aspect lock, so the
  instance takes its own component's proportion (8:5 for a tile), and keeps the tile's paint (`fixedPaint`, at every
  state, disabled included). The `card mark` switch is on by default; `↳ swap card mark` sits under it.
- **It starts at the generic tile**, the owner's "no card type yet" artwork, which replaced the core `bank-card` glyph
  the 2026-10-25 proposal planned. `swapDefault` on a `fixedPaint` slot now names a brand mark and projects as
  `brand-mark/<kind>/<name>`; an icon name there throws at projection.
- **Card networks only (Q-C7 A, the owner, 2026-10-27).** PR 3's tile kind holds every accepted-payments tile (Q780 A),
  wallets and pay-later services included, and a card number only ever detects a network. So the `brand` prop takes a
  typed list in the def (`generic`, `amex`, `diners-club`, `discover`, `maestro`, `mastercard`, `visa`), each checked
  against the mark set's tiles. The tile kind is still read by artboard (`BRAND_MARK_KINDS`), so PR 3's `card/` →
  `payment/` rename reached the slot's default without an edit. A network the owner adds joins by one line in the def
  and one in the gate.
- **The code contract** (in `codeOnly`, `accessibility` and the props): `cc-number`, `inputmode="numeric"`, never
  `type="number"`, `dir="ltr"`; grouping as the user types with digits-only values; detection from the leading digits;
  the network named in a visually hidden `aria-describedby` description, never a live region; a hosted-input shell
  (`renderInput`) as the documented default, with the native mode marked outside SAQ A.

### Gates

- **`lint-mark-slots.ts`** (new, in CI): the tiles are read from the marks folder by the gate's own `viewBox` reader
  (32×20). NETWORKS ONLY: the host's `brand` prop offers exactly the gate's own literal card-network list, each a tile
  in the folder, so a wallet tile fails. GENERIC FIRST: it defaults to `generic`, and every
  member's slot and the set's swap property start at `brand-mark/<tile folder>/generic`. A TILE'S SHAPE: height alone,
  the listed icon rung per size, under the aspect lock. Every def that swaps in a tile is a listed host, both ways.
- **`lint-mark-colors.ts`** host arm (d): a carried mark takes no `descendantFills`, no fill or stroke paint and no paint
  variable, and its node states `fixedPaint`; `MARK_HOSTS` lists the hosts by hand, both ways, so the arm is no longer
  vacuous.
- **`test:roundtrip`**: the payment tile is read back on all 84 members, an instance of the generic tile locked at 1.6,
  its height bound to the size's icon rung. `aspectLock` is now a checked plan field (locked to a real ratio), and
  `fixedPaint` an unchecked one with its reason.
- **`test.ts`**: the token block (TextField's plus exactly the three height keys), the members, the panel, the props,
  the factory's refusals and the projection throw.

### Traps

- **The round-trip measured the harness at first.** The tile instance read "NOT LOCKED" because the brand mark was a
  catalog name with no node behind it, so the lock had no main to read. The harness now prebuilds the marks (as the
  plugin does) and serves plain components live; the shim's live component then needed an `id`, or the swap
  property's default was refused.
- **The paste-payload stub in `test.ts`** had no `getMainComponentAsync` on an instance: the first real `aspectLock`
  host threw there. The stub now answers with the main's artboard (a mark's box, else 24×24).

### Held for the owner (Q-blocks in the PR, A built)

The tile keeps its colors at the disabled member; the `card mark` switch; the page placement ("Card number field" under
Components); the draft wording; and the PaymentField group as the follow-up.
