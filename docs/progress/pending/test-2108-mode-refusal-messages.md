## (2026-10-05) — the per-mode refusal tests name the refusal they hold (#2108)

**STATUS: branch `test/2108-mode-refusal-messages`.** Test only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Fixes #2108.**

### The gap, measured

`brandTheme` (`theme.ts`) carries three copy-pasted pairs of per-mode refusals, one pair each for `overrides`, `modeAnchors` and `modeLevers`: "mode is not in this brand's modes", and "mode is generate-only". Their tests (`A1(c)`, `A2b(c)`, `D(c)`) asserted only that **something** threw. Six mutations, each making one branch throw the next family's message (overrides → modeAnchors → modeLevers → overrides), run against the tests as they stood:

| branch | old tests |
|---|---|
| overrides, absent | **whole suite green** (135274 passed, 0 failed) |
| overrides, generate-only | caught only by FO-01b's `hc-dark` arm (#2113) |
| modeAnchors, absent | **whole suite green** |
| modeAnchors, generate-only | **whole suite green** |
| modeLevers, absent | **whole suite green** |
| modeLevers, generate-only | **whole suite green** |

A user would be told the wrong field, and nothing would notice.

### The fix

The eight mode-refusal arms of `A1(c)`, `A2b(c)` and `D(c)` now check that the message starts with its own field, its mode and its reason. For example, `"modeLevers: mode 'hc-light' is generate-only"` and `"overrides: mode 'dark' is not in this brand's modes"`. The other arms in those blocks (a malformed palette or step, the radius range) are unchanged.

### Mutations against the new tests, each failing by name

All 3125 assertion sites ran under every mutation, the same as unmutated.

- **overrides, absent:** both `A1(c)` absent arms, e.g. `(got "modeAnchors: mode 'dark' is not in this brand's modes (light)")`
- **overrides, generate-only:** `A1(c)` hc-light, plus FO-01b
- **modeAnchors, absent:** `A2b(c)` absent
- **modeAnchors, generate-only:** `A2b(c)` hc-light
- **modeLevers, absent:** `D(c)` absent
- **modeLevers, generate-only:** `D(c)` hc-light and wireframe
