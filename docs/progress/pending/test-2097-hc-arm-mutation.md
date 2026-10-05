## (2026-10-05) — FO-01b's HC arm gets its own mutations, and names the refusal it holds (#2097 item 2)

**STATUS: branch `test/2097-hc-arm-mutation`.** Test only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Item 2 of #2097.**

### What the mutations showed

FO-01b's HC arm (#2034) asserts that an override in `hc-dark` is refused. It had no mutation of its own. Three mutations of `brandTheme`'s overrides refusal in `theme.ts`, run against the arm as it stood:

- **hB:** `&& m !== 'hc-dark'` on the refusal's condition, so HC accepts the override. The arm fails, and it is the **only** failure in the suite. `A1(c)` holds `hc-light`, not `hc-dark`, so this arm is necessary, not just sufficient.
- **hA:** `if (false)`, so every generate-only mode accepts. The arm fails, and so does `A1(c)`.
- **hC:** the overrides branch throws the `modeAnchors:` message instead of its own. **The whole suite stayed green** (135270 passed, 0 failed), this arm included. It matched `includes('generate-only')`, and `theme.ts` carries three copies of that refusal (overrides, modeAnchors, modeLevers), each saying the same words. `A1(c)` only checks that something throws.

### The fix

The arm now matches the overrides refusal by its field and its mode, `startsWith("overrides: mode 'hc-dark' is generate-only")`, and its comment records the three mutations.

### Mutations against the tightened arm, each failing it by name

All 3121 assertion sites ran under each mutation, the same as unmutated.

- **hA:** `❌ FO-01b prism3/hc-dark: an override in an HC mode is refused by the overrides refusal, naming hc-dark, …` plus `❌ A1(c)`
- **hB:** the same FO-01b line, alone
- **hC:** the same FO-01b line, alone, showing `(threw: "modeAnchors: mode 'hc-dark' is generate-only …")`

**Trap for whoever is next.** The two sibling refusals (`modeAnchors`, `modeLevers`) are held by `A2b(c)` and `D(c)`, which also only check that something throws. The same slip in either branch would pass. Out of scope here; filed as #2108.
