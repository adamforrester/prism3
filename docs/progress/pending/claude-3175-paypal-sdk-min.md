## (2026-11-01) — WalletButton: PayPal's 150px SDK minimum is a code-only note, the Figma floor stays 120 (#3175)

**Status:** engine, component notes only. The width floor, every member and every emitted token are unchanged; the
maintainer surface (`schema/component-maintainer.json`) and the projected component surface digest
(`schema/component-surface.json`, accepted) move with the reworded `codeOnly` and `contested` lines, so a
`minor` change note. No token-name move, so `CONTRACT_VERSION` stays. The executor is untouched.

### What changed

- **Owner decision Q3175 A.** PayPal's SDK writes `min-width: 150px` on its button frame, above WalletButton's 120
  floor. The floor stays one number for every provider; the 150 is a provider note in code only, with no per-provider
  `minWidth` machinery for one provider. The `codeOnly` width line now tells the consumer to give a PayPal button a
  slot of 150 or more and says the design file's floor stays 120; `contested` records the decision as built (A) with
  the alternative (B: a typed `minW: 150` in the gate and a raised PayPal floor). The previous `contested` line called
  a per-provider floor "the follow-up", which the decision retires.
- **`#3175 PAYPAL WIDTH NOTE`** in `test.ts`, beside the provider rules' WIDTH arm: the PayPal sentence in the
  `codeOnly` width line, the `Q3175 A` entry in `contested`, and every PayPal member's `minWidth` at 120.

### Verification

Mutations on a `wip:` commit, each failing the arm by name: the `codeOnly` width line cut back to its old wording, and
the `contested` entry renamed so the `Q3175 A` line is gone.
