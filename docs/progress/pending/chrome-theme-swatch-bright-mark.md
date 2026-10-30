## (2026-10-30) — Chrome: the Theme tile draws a color swatch, and the Prism mark is brighter (#3164)

**Status:** studio chrome only. No engine, emission or token-name change, so no change note and no `CONTRACT_VERSION`
move. The executor is untouched, so `EXECUTOR_REVISION` stays.

### What changed

- **Theme's glyph (the owner, 2026-10-30: "Change the icon for Theme to IconColorSwatch from our icon set").** The rail's
  Theme tile keeps its chrome name `swatches`; `dom.ts` now maps it to Tabler's `color-swatch` instead of `circles`.
  `tabler.ts` was rewritten by `vendor-icons.mjs` from `@tabler/icons@3.49.0`, the same pinned version, with
  `color-swatch` named and `circles` dropped: nothing else drew it, and the script's rule is that the set is the icons
  the chrome draws. `LICENSE-Tabler.txt` came out byte for byte the same. It draws through `glyph()`, so it takes the
  same 24 grid, 1.5 stroke and 24px rail size as its siblings; the existing glyph arms hold all three.
- **The Prism mark (the owner: "brighter colors than the muted dark colors").** The rail's mark, `styles.css`'s `.logo`
  on both hosts, keeps its four hues and its 18px conic square, lifted to OKLCH L 0.62 at chroma up to 0.20: `#7e6cf7`,
  `#0391c9`, `#00a22b`, `#e6443d`. This is Q3164.1 A, built as the recommendation; B (a vivid L 0.70 set) and C (A in
  light, a luminous set in dark) are on the issue with renders, and the owner picks.

### What the measuring found

- **The muted mark was under 3:1 in dark.** Against the rail's dark ground (`#0d0d0e`) its stops read 2.87 to 3.03:1;
  on light they read 3.99 to 6.76:1. A reads 3.39 to 3.99:1 on light and 4.86 to 5.74:1 on dark, so it is the one
  single set that clears 3:1 on both. B is brighter but drops to 2.47:1 on light.
- `lint:contrast` holds text and control pairs from `chrome/spec.mjs`; the mark is a decorative image (`aria-hidden`
  inside a `role="img"` named "Prism3") and has no row there. Its 3:1 is held in `test:chrome` instead, computed from
  the rendered stops and the rail's rendered ground, so no spec row was added.
- `lint:live-css` compares property names, not values, so recoloring `.logo` needed no accept.

### Gates

- `test:chrome` section 1, every host × theme × width: the Theme tile draws `color-swatch` by its Tabler name; the mark
  paints Q3164.1 A's five stops in order; and each stop holds 3:1 against the rail's ground. The literals are the
  request's and the decision's, never read from `dom.ts` or `styles.css`.
- Mutations, each failing by name and nothing else: `swatches` back to `circles` → the Theme arm, 12 failures (both
  hosts, both themes, 1280, 640, 380); the muted gradient back in `.logo` → the stops arm (12) and the 3:1 arm in dark (6).
