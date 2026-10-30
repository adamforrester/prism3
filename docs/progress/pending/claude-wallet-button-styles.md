## (2026-10-30) — WalletButton: each wallet's own button per style, from its SDK (#3174)

**What.** The owner took Q3174.1–6, all A. WalletButton gains a `style` axis in each SDK's own value names:
- Apple Pay: black, white and white-outline.
- Google Pay: black and white.
- PayPal: gold, blue, silver, white and black.
- Shop Pay: purple.

Only valid provider × style pairs are members, and `any` comes first and is the default. `any` is the stand-in Q-W1 A
built: the provider's area and logo, with no fill. Every member built before keeps its coordinate, now at `style=any`,
so 20 members become 74. `plain` is the only type drawn, and PayPal still has no large member. The code prop
`buttonStyle` (a free string) becomes `style`, an enum of the same names.

**The artwork.** There is a new mark kind, `button/<provider>-<style>`, with 11 files. Each is the logo exactly as the
provider's public SDK draws it, captured on 2026-10-30 in headless Chromium:
- Apple Pay JS
- Google Pay's pay.js
- PayPal's JS SDK 5.0.583
- Shopify's Shop Pay element

No terms were accepted and nothing was signed in to. Each file is drawn on a 44-high artboard, the height it was
captured at, with the logo where the SDK places it vertically, hugging the ink across. So the nested mark binds the
button's own height, and the provider's logo-to-height ratio holds at every rung without a new engine field.

Each record carries:
- the SDK URL and version, and the governing guideline;
- `usage`;
- the new `ground` and `edge`, measured from the SDK's computed style;
- every normalization step:
  - one uniform scale and a translation written into the coordinates;
  - relative, shorthand and arc commands written as absolute M, L, C and Q;
  - inherited fills written onto each path;
  - Shop Pay's `currentColor` written as the white its class resolves to;
  - Google's transparent bounding path dropped.

**The literal paint, scoped to `button/`.** `emit-marks.ts` now emits `PROVIDER_LOGO_BUTTON_PAINT`, for `button/` marks
only, and refuses a `ground` or `edge` on any other kind. WalletButton builds its literal record from it: an empty
entry at `any`, and `{ fill: ground, edge }` at every style. The projector now reads a surface entry that names no
fill, edge or wash as a member declared unpainted. A wash or an edge with no fill under it still throws.

**Gates.**
- `lint-mark-provenance` learns the kind:
  - a `button/` record needs `width`, a lowercase `ground` and an `https://` source;
  - a malformed `edge` fails;
  - `ground` or `edge` on any other kind fails.
- `lint-mark-colors` gains arm (h), BUTTON GROUND:
  - a host carrying a `button/` mark must be in `GROUND_HOSTS`;
  - the member's frame paints exactly its record's ground and edge, read from `provenance.json`, never from the module
    the def reads;
  - a ground host's `any` member paints nothing.
- `test.ts`, `#2343 PR 4 provider rules COLOR`, is flipped:
  - `any` paints nothing;
  - every other style paints exactly its ground and edge, typed in the arm from the capture and Shop Pay's #5433EB.
- New arms:
  - EDGE: the edge is 1px.
  - STYLE: each provider's members are `any` plus exactly its typed styles.
  - LOGO HEIGHT: each file's ink height and center at 44 against typed values, and each style's logo binding the
    button height.
- `LITERAL_DEFS` adds wallet-button.

**Mutations, each failing by name:**

| mutation | gate | failure |
|---|---|---|
| drop `ground` from `button/paypal-gold`'s record | lint-mark-provenance | `button/paypal-gold.svg: a button logo's record lacks 'ground'` |
| put a `ground` on `logo/affirm`'s record | lint-mark-provenance | `logo/affirm.svg: declares a 'ground'` |
| write PayPal white's edge color as `#555` | lint-mark-provenance | `button/paypal-white.svg: 'edge' is not …` |
| retint paypal-gold's ground in the emitted module only | lint-mark-colors (h) | `BUTTON GROUND — the member's frame paints the fill ["#ffc43a"] …, and its record's ground is #ffc439` |
| drop PayPal white's edge from the module | lint-mark-colors (h) | `BUTTON GROUND — … paints the edge none under provider-logo/button/paypal-white` |
| paint the `any` stand-in black | lint-mark-colors (h) | `BUTTON GROUND — … which has no button under it … the stand-in draws no fill` |
| empty `GROUND_HOSTS` | lint-mark-colors (h) | `BUTTON GROUND — part 'mark' carries provider-logo/button/apple-pay-black, and only  may carry a button logo` |
| give `any` an edge and no fill | projector | `reads literal 'surface' … and its entry has no fill` |
| retint paypal-gold's ground in the record AND the module (lint-mark-colors stays clean) | test.ts | `❌ #2343 PR 4 provider rules COLOR … {"fill":"#ffc43a"}, typed {"fill":"#ffc439"}` |
| the same retint, through the real plugin executor | plugin test | `✗ wallet build/ground … {"fill":"#ffc43a"} vs {"fill":"#ffc439"}` |
| the update verifier without its literal-paint read (the state before this PR) | plugin test-update-apply | `✗ def rename, single/wallet-button verified: … fills: 1 paint(s) (the plan says none)` |
| drop `silver` from PayPal's styles | test.ts | `❌ #3174 provider rules STYLE` |
| bind a style's medium logo to `icon.size.lg` | test.ts | `❌ #3174 provider rules LOGO HEIGHT: a style's logo binds … logo 32, want 44` |
| move Shop Pay's logo 2px down in its file | test.ts | `❌ #3174 provider rules LOGO HEIGHT: each style's logo is its provider's ink height at 44 …` |

**The plugin.** The executor already draws `literalPaints`, so it needs no change and no `EXECUTOR_REVISION`. The
update verifier's "a paint the plan does not give" check (`update-apply.ts`, #2369) read only bound and gradient
paints, so it reported every styled member's literal ground as unplanned. It now counts a literal fill or stroke as
planned. SignInButton had the same shape, but no update test built it. The plugin build tests read the new axis, and
`wallet build/ground` holds each built member's ground and edge to values typed in the test.

**What the capture found that the proposal did not have.**
- Google Pay draws a 1px inside edge on both styles: #757575 on black and #3c4043 on white. The records carry both.
- The proposal's logo heights were the SDK's logo element boxes. The files carry the ink inside them:
  - Apple 21.5
  - Google 20.9 (in a 22 box)
  - PayPal 16.6 (in a 20 box)
  - Shop Pay 21.1 (in a 22 box)
- Only Apple scales its logo in proportion to the height:
  - Google keeps 22px of padding.
  - PayPal steps its logo per size (18, 20 and 24).
  - Shop Pay's logo is 22 high at every height.

  So at 36 and 56 the decided ratio reads the 44 render, not those SDKs' drawings.
- Google Pay's and Shop Pay's SDKs draw nothing under 40px: a 36 request renders 40. Shop Pay already has no small
  member. Google Pay's small member is under its SDK's height, which is an owner question.
- All four SDKs pass the radius through without clamping.

**#3175 is not in this PR.** PayPal's 150 floor needs a per-provider `minWidth`, and today `minWidth` is keyed by size
only, so it is a schema and projector change of its own. It is recorded in the def's `codeOnly` and `contested`.
