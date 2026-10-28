## (2026-10-28) — Branded-button helpers: WalletButton's skeleton moves to `branded-button.ts`, byte-identical (#2343 Q-S11 A)

The first of two PRs for SignInButton (#2343 PR 5). The owner chose shared helpers over a whole-def generator (Q-S11 A, 2026-10-28), extracted with WalletButton byte-identical and no `--accept`.

### What moved
- **`packages/engine/branded-button.ts`** (new, internal, not a def): `providerMap(rules)`, `heightTokens()`, `radiusToken()`, `ringTokens()`, `markPart({ nesting, height, note })`, `focusRingPart(note)` and `heightExclusions(rules, rungs)`, plus the `BrandedProviderRule` record type and `BRANDED_SIZES`.
- **It sits at the engine root, not in `components/`,** beside `button-spacing.ts` and for the same reason: `typecheck-components.ts` fails any tracked file in `components/` that adds nothing to `componentDefs`.
- **WalletButton** now holds its provider rules as one record (`RULES`: the mark, and the height floor and ceiling from its header), and builds `LOGO`, its token block, its mark and focus-ring parts and its two height exclusions from the helpers. `heightExclusions` walks rungs first, then providers, so it returns Shop Pay small and then PayPal large, today's order.

### Proof the output didn't move
- `regen.ts --check`: 224 committed artifacts byte-match, no regenerated diff.
- `lint-component-surface.ts`: clean **without** `--accept`. wallet-button is 20 members, digest `69d0924b7636…` unchanged.
- `lint-paint.ts`, `lint-component-renames.ts` and `lint-axis-values.ts` pass unchanged. `EXECUTOR_REVISION` is untouched, because no executor changed.

### The factory arm (`test.ts`, `#2343 branded-button factory`)
- It holds every def in its hand list `BRANDED` to the shared focus-ring part, the height, radius and ring tokens, the fixed-paint aspect-locked brand-mark nest and the medium-first size axis. Each expected value is a literal typed in the arm, never read from the helpers (docs/34), so a helper that drifts fails every def built from it. A second line drives `heightExclusions` over a rule record the arm types itself.
- **Mutation** (committed first): changing `focusRingPart()`'s `inset` from `ring-offset` to `ring-width` fails the arm by name (`wallet-button: focusRing {…"inset":"ring-width"…}`) and fails `lint-component-surface` as `surface/wallet-button: plan digest 3e8781e6df77…, baseline 69d0924b7636…`. Restored, clean.

### Change note
`engine: patch`: no committed artifact and no projected surface moves.

### Next
SignInButton (#2343 PR 5) stacks on this branch, and joins `BRANDED`.
