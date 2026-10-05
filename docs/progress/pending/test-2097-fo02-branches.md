## (2026-10-05) — FO-02 tells a role ground from a step ground (#2097 item 1)

**STATUS: branch `test/2097-fo02-branches`.** Test only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Item 1 of #2097.**

### The gap, measured

FO-02 (#2034) drives `overrideGroundRgb` directly. Its quiet arm resolved a role ground and a step ground that were both `#e9e9ea`, and it handed the step call an **empty** role map. So it could not tell which branch answered. Two cross-wirings of `overrideGroundRgb`, run against FO-02 as it stood, each left every FO-02 assertion green:

- **mA**, the role branch returns the floor step: `if (role) return ramps.get('neutral')?.find((s) => s.key === '050')?.rgb ?? role;`. Caught only by the #1745 exit gate.
- **mB**, the step branch returns a role from the map: `if (step) return rgbByRole.values().next().value ?? step;`. Caught only by FO-01 and FO-01b, through real builds.

Both were caught somewhere, but not by the arm written to hold this function's branches, which is the necessity half of docs/34 shape 19.

### The fix

FO-02b replaces FO-02's quiet arm:
- The role ground (`#c8d2dc`), the step ground and the page (`#ffffff`) are three different colors.
- Both calls get the same populated role map.
- The step's expected hex is a literal, `#e9e9e9`, tied by a precondition to prism3's emitted `neutral.050` in `out/prism3.tokens.json`. It is never read off the ramp the function reads.
- Three named arms: role, step, and neither warns.

FO-02's fallback arms (the warning, its ratio and min) are unchanged.

### Mutations, each failing FO-02b by name

All 3124 assertion sites ran under each mutation, against 3124 unmutated, so neither run was truncated.

- **mA:** `❌ FO-02b: a role ground resolves to that role's color, #c8d2dc — not the floor step (#e9e9e9) or the page (#ffffff); got #e9e9e9`
- **mB:** `❌ FO-02b: a ramp-step ground resolves to the emitted step, #e9e9e9 — not a role from the map (#c8d2dc) or the page (#ffffff); got #c8d2dc`
