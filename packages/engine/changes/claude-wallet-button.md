---
engine: minor
---
WalletButton, the express-checkout button a wallet provider draws (#2343 PR 4): Apple Pay, Google Pay, PayPal and
Shop Pay, on a new `provider` axis, at three sizes and two states. In code it is a container the provider's own
element mounts into, which draws the button (every wallet forbids a hand-drawn one); Prism3 sets the height, a 120px
width floor, the brand's `radius.md` and the focus ring. In Figma each of its 20 members is the provider's area with the
provider's own logo, nested whole as `brand-mark/logo/<provider>` with its own paint, its height bound and its width
from its proportion; the member draws no fill. A size outside a provider's height range has no member: Shop Pay starts
at medium (40px floor) and PayPal stops at medium (55px ceiling). The projector now names a nest of a
standalone-component def by its member component, `<id>/<value>`, with no `nestVariant`, so a component can nest one
brand mark. `test.ts` holds each provider's height range, width floor, Google Pay's half-height corner, the absence of
paint and the unaltered logo against rules typed from the providers' guidelines. Only existing token roles are bound,
so CONTRACT is unchanged.
