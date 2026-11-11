## (2026-11-11) — Sidecar false claims: shadow, overlay, dimension, large-text threshold (#3555 F1–F3, F6, F7, S1)

Part of #3555 (the 2026-11-11 metadata audit), its false-claims section for the token sidecar generator. Each claim is
now read off the tree, or corrected to what the tree holds, and each has an arm in the sidecar gate that recomputes the
fact from the committed `out/<brand>.tokens.json`:

- **F1, `shadow.*`.** `meaning` said "2-layer" on all seven steps, and `consume` said "reduced in dark" on all seven. The
  inset has one layer, and its alpha rises in dark (0.08 → 0.30). The layer count is now the `$value` array's length, and
  the dark direction is read off each layer's alpha: the elevation steps say "a lighter shadow in dark", and the inset
  says "a stronger shadow in dark".
- **F2 and S1, the overlay `avoid_when`.** It named `foreground.<category>-subtle` for the interactive categories, which no
  brand emits. The sentence now names the fill alone. The AI/A-11 exemption in `test.ts` required that false text to
  ship (`a11Seen > 0`), and its reason ("held for #1614") is long gone, so the exemption and the assert are deleted. A
  bare role name in sidecar prose now fails the BARE arm with no exception.
- **F3, the overlay `when_to_use`.** It read "A translucent destructive pressed wash", but every overlay in every brand
  is neutral black or white at an alpha. It now says "translucent neutral … wash for outline/text destructive controls".
- **F6, `core.dimension.*`.** "Npx grid primitive" on 1, 2, 3, 5, 6, 10, 18 and 30px, which are off the 4px grid. It now
  reads "dimension primitive", the tree's own word.
- **F7, the bold large-text threshold.** 14pt is 18.667px, so 18.66px bold is not large text. The sidecar's
  `usage_limit.large_text.bold_min_px` and its prose say 18.67, and so does `LARGE_TEXT_ONLY` in
  `figma-description.ts`, the same rule in the tree's `$description` and the Figma variable descriptions.

### Trap for whoever re-verifies

- The new arms each judge the sidecar against the tree, never against the generator: the shadow arm parses alpha with
  the gate's own `parseColor`, the overlay arm resolves each wash per mode with the gate's own `colorIn`, and the
  threshold arm converts px to pt itself. Mutations run, each failing its own arm by name: the shadow layer count
  restored to a constant 2, the inset direction forced to "lighter", "grid" restored, "destructive" restored in place of
  "neutral", the false `foreground.<c>-subtle` name restored, and `bold_min_px` set back to 18.66.
- The studio and plugin browser checks still treat ≥18.66px bold as large (`test-chrome.mjs`, `test-smoke.mjs`,
  `test-start-screen.mjs`). Those are measurement thresholds, not shipped prose, and are left alone here.
