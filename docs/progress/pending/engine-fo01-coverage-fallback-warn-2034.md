## (2026-10-03) — The floor-ground test covers dark, a second floor step and HC, and an unresolved override ground is warned (#2034)

**STATUS: PR open from `engine/fo01-coverage-fallback-warn-2034`.** These are the follow-ups from the orchestrator's review of #2032 (#2025). ENGINE is a minor bump (`engine: minor`) for the new warning. No emitted artifact moves, because no input reaches the warning. `token-contract --check` reports the contract unchanged, so CONTRACT_VERSION stays put.

**Correcting #2032's record.** #2032's change note and PR body named `foreground.*`, `text.link.*`, `icon.link.*` and `interactive.<c>.fill.*` as the roles whose override ratios moved from the page to the floor step. The list was short. Each of these roles also has a step ground, so its override ratio, and any warning, moved too:
- `text.secondary`, `text.tertiary`, `text.<status>`, `text.brand`;
- `icon.secondary`, `icon.tertiary`, `icon.<status>`, `icon.brand`;
- `disabled.text`, `disabled.icon`.

Measured on `text.brand` overridden to `neutral.600`, in light mode:
- prism3 (`#5b5c5f`): 6.69 on the page `#ffffff` before #2032, 5.51 on `neutral.050` `#e9e9e9` now;
- aurora: 6.65 → 5.48, measured by the orchestrator;
- harbor: 5.55 → 4.88, measured by the orchestrator.

FO-01b pins the prism3 number.

**What changed.**
- `test.ts` FO-01b adds three override arms. Each expected value is a literal hex, tied as a precondition to the primitive in `out/<brand>.tokens.json`, and each ratio is computed with the shared `contrast`. The engine's ground lookup is never read.
  - prism3 dark: `foreground.brand` on `neutral.900` `#171718`, under a `#0d0d0e` page.
  - harbor light: `foreground.brand` on `neutral.100` `#dcdbdb`, under a `#e9e9e8` page. Harbor's floor is a different step from prism3's.
  - prism3 light: `text.brand` on `neutral.050` `#e9e9e9`.
  Each arm also asserts that the floor and the page give different ratios for the pick, so the arm can't pass vacuously.
- **The HC arm is not an override arm.** HC modes are generate-only, so an override there throws before the override pass runs. FO-01b therefore checks two things in prism3 hc-dark: that the derived `foreground.brand` records its ratio on `neutral.900` `#171718` rather than the `#000000` page, and that an HC override is refused. This departs from the brief, which asked for an HC override arm.
- `modes.ts`: the override pass's ground lookup moves into an exported `overrideGroundRgb`. Before, it fell back to the page base silently when an `against` was neither a role nor a ramp step. Now that fallback adds an `OverrideWarning` with `against` set to the missing ground and `unresolved: true`, so the role and the ground are both named. `test.ts` FO-02 drives the function directly. An unknown ground warns and returns the page, and a role ground and a step ground warn nothing.

**Warn, not throw.** I measured the fallback first: 11 brands (the 10 corpus brands, NB included, plus prism3), every overridable role, in light and dark, against each palette step. That gave 5,726 override cases, 132 refused for other reasons, and **0** that reached the fallback. A throw would have been safe for the corpus. The warning is kept for two reasons. A miss here would be the engine's defect, not the brand's, and a throw would refuse a brand for it. And the warning stays on the structured `warnings` channel rather than `theme.notes`, whose strings ship to MCP and Studio, where any new copy would be the owner's call.

Mutations, each failing by name:
- `overrideGroundRgb`'s `warnings.push` dropped → both `FO-02: … falls back to the page AND warns …` arms (2);
- the step branch dropped, so a step ground falls back to the page → the three `FO-01b` override arms, FO-01's four arms, and `FO-02: a role ground and a ramp-step ground resolve without a warning` (8).

**Trap for whoever re-verifies this.** Since FO-02 calls `overrideGroundRgb` directly, it would still pass if the override loop stopped calling it. The loop is covered by the step-branch mutation: dropping that branch inside the function fails FO-01 and FO-01b through the real override pass, which only happens if the loop goes through the function.
