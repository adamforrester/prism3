## (2026-10-27) — WalletButton: the provider's express-checkout button, as a sized slot and a layout stand-in (#2343 PR 4)

**Status:** new def `wallet-button` (20 members), a new axis name `provider`, one projector change (a nest of a
standalone-component def names the member component). ENGINE minor (change note). CONTRACT unchanged: only existing
roles are bound. No executor change, so `EXECUTOR_REVISION` stays. Merges after PR 3 (the owner's marks), which merges
after #3047.

### What was built, and the calls held for the owner

- **Owner decisions it rests on:** two components from one factory (Q-B4 A), one set enumerating only the valid
  provider pairs (Q-B5 A), and in code a slot that mounts the provider's own element, Prism3 adding only the focus
  ring and layout (Q-B8 A). The proposal's §2.1 rule table is the source for the limits.
- **Q-W1, the Figma member (built as A):** a layout stand-in, the provider's area at its size and corner with the
  provider's logo nested unaltered, and no fill. Two findings decided it: none of the four providers publishes its
  button colors as values (Google Pay says "dark and light"; PayPal's v6 reference says "gold" and "white with
  border"), and all four forbid a hand-drawn copy of the button, which a Prism3-painted ground would be. Every logo in
  the owner's set is one ink, dark on light, so a dark-style stand-in would need a light logo the set does not hold.
  B: the owner supplies each provider's own button artwork per style, and a `style` axis draws it. C: Prism3 paints the
  fills, which needs a literal-paint engine field (`gradientFill`'s path through both executors) and colors the
  providers do not publish.
- **Q-W2, heights (built as A):** a size outside a provider's range has no member: Shop Pay starts at medium (40
  floor), PayPal stops at medium (55 ceiling); the code clamps. Density moves every rung (harbor: compact 28/36/44,
  spacious 44/56/68), so the exclusions hold at comfortable only, and at compact and spacious the code's clamp is what
  keeps the provider's range; the Figma member shows the brand's rung. B: density-invariant wallet heights, which need
  a token the tier does not have.
- **Q-W3, the factory:** SignInButton is PR 5, so the shared factory lands with its second component, not as an
  abstraction with one user.
- **Q-W4, the page:** "Wallet button", its own page under Components (DRAFT). Brand mark now has one consumer, so it
  joins `STANDALONE_NESTED` to keep its Foundations page (Q-B12).
- **Tier 2** generation priority (a top-level component placed on its own); width floor 120 (the largest provider
  minimum, Shop Pay's logo button; Apple Pay plain needs 100); radius `radius.md`, inside Google Pay's half-height cap
  at every density.

### The engine change

`figmaAnatomySet` wrote `nestTarget: 'brand-mark'` and `nestVariant: { name }` for a nest of `brand-mark`, which an
executor resolves inside a component SET. `brand-mark` emits standalone components, so there is no set, and the nest
missed. The projector now resolves such a nest to the member's own component, `brand-mark/logo/apple-pay`, and writes
no `nestVariant`, the way `nestedSwapTarget` names a swap's. Both executors already make an instance from a component
found by name, and `build-deps.ts` already maps `<id>/<value>` to its def, so neither moved. No other def nests a
standalone-component def, so no other surface digest moved.

### Gates, and the mutations that fail them by name

`packages/engine/test.ts`, `#2343 PR 4 provider rules`, its rules typed from the providers' guidelines, never read off
the def. Each mutation was made on the def and fails its arm by name:
- PayPal's large exclusion removed → **HEIGHT** (`provider=paypal, size=large … at 56`);
- `minWidth: 90` → **WIDTH**;
- `radius.capsule` → **RADIUS** (Google Pay, `radius 999 over height 36` at compact);
- `fixedPaint` dropped from the logo → **COLOR**;
- PayPal's logo pointed at the monogram → **MARK** (`nests brand-mark/logo/paypal`).
The def joined `lint-hit-target` (INTERACTIVE, SMALL_SIZE), `lint-rung-names` (MUST_COVER, DEFAULT_FIRST),
`lint-axis-values` (`provider` sole, `size` canonical), `lint-standalone-floor`, `lint-paint-placement`,
`lint-absolute-inset` (MUST_COVER, MUST_CLEAR_STROKE) and the `generationPriority` tier list. `regen --check` counts
223 artifacts (the new docs page): `verify.ts` and `ci.yml` together.

### Traps

- A projected plan's `coord` carries the variant axes the grid does not lay out; the size is `plan.size`, not
  `plan.coord.size`. The first HEIGHT arm read `coord.size` and found every member missing.
- A new def file must be `git add`-ed before `lint-axis-values.ts` sees it: it counted 57 defs and passed while the
  file was untracked.
