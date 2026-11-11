## (2026-11-11) — SignInButton carries code-only isPending and disabled (#3554 Q-CC23 A)

Owner decision Q-CC23 A. SignInButton's `onClick` said it ran "for analytics or a loading state", but the button
had no pending or disabled prop: Q-S6 A had decided the design file's states (rest, hover, pressed, focus-visible),
not the code API. The def now carries `isPending` and `disabled` as code-only props, not projected, as Button's
`inactive` is, and admits both in `codeOnly` as `not-projected`.

- `isPending` is worded as behavior only: focus kept with aria-disabled, aria-busy, a second click ignored,
  busy announced. It says the provider's mark and words stay as drawn and names no visual treatment, since the
  provider's colors are literal paint with no pending or disabled form.
- The explicit `stateAxis` keeps the set at its members; the spec grid gains the code-only coordinates (96 → 144)
  and the paint census and component-surface baselines were re-accepted. WalletButton is untouched: its provider
  element owns its own states.
