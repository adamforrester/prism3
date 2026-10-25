## (2026-10-25) — The contrast floor is the one text promise (#2991, Q689 A)

**The decision.** #2991 measured the derived resting link at 4.05–4.32:1 on `background.tertiary` / `inverse.background.tertiary` in light and dark, in every corpus brand. The first answer, Q2991.1 A, stepped every link darker to clear the third tier. The owner replaced it with Q689 A: the contrast floor stays the single text promise. Floor-gated inks are promised their bar on the floor surface (`surfaces.<mode>.floorStep`, default `neutral.050` = `background.secondary` / `foreground.primary` in light, the mirror in dark) and on anything nearer the page. Deeper surfaces (`background.tertiary` = `foreground.secondary`, `foreground.tertiary`, and their inverse twins) carry no text promise by design. A brand that needs text deeper moves the floor. No ink value moves. Q419 A stands as narrowed. #3012 (`text.secondary` on the third tier) closes as by design under the same decision.

**What the PR became.** The derivation commit was reverted with a normal revert commit after merging `main`, so every committed artifact is back at `main`'s values; `git diff origin/main --stat` shows docs, `ai-metadata.ts`, the gate and the regenerated `.ai.json` only.

**The statement.**
- `docs/06` §3 gains the floor-promise table and the carve-out; CR-02 in `docs/16` is marked resolved by Q689 A, citing Q419 A. The border half of that finding (L-04) is not covered.
- `.ai.json`: each floor-gated ink's `avoid_when` names the surfaces deeper than its floor and the lever that moves it. The list is computed in `ai-metadata.ts` (`belowFloor`): a ladder surface farther from the page than the role's own floor in any mode. It is not typed, so a brand whose floor sits on another tier names its own surfaces. On the band the lever is `inverseSecondary`, because the band's floor is its own second tier; `floorStep` does not move it.
- `prism3-consume` states the promise and the carve-out, and its self-check no longer claims a passing role exists below the floor. `prism3-theme`'s `surfaces` row and the designer guides' index say the same.

**The gate, `test.ts` (Q689).** Ink names and bars are literals (body 4.5:1, 7:1 in HC; tertiary 3:1, 4.5:1 in HC; every non-primary icon at the non-text bar under `iconContrast: '3:1'`), never a role's `against` or `min`. The floor surface is the one the lever names, read from the emitted hexes; HC uses its family's standard floor. Swept over the token-contract corpus plus the default example:
- **On the floor.** Every floor-gated ink clears its bar on the floor and on every neutral tier no farther from the page, in every mode, page and band.
- **Deeper floor.** `floorStep` moved to the `background.tertiary` step: every floor-gated ink in that family's standard and HC modes clears its bar on the old tertiary hex, and at least one text ink moved. The band's twin moves `inverseSecondary` to the band's tertiary step.

**Mutations, each failing by name:** the resting link pinned one ramp step lighter in `modes.ts` fails the on-floor arm on the link cells; `resolve()` ignoring `cfg.floorStep` fails the deeper-floor arm for every brand and family.
