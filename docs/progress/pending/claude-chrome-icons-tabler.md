## (2026-10-27) — Chrome glyphs from Tabler Icons, on the 24 grid at a 1.5 stroke (#3083, Q813 A)

The owner found the rail's icons too heavy after #3043: the hand-drawn glyphs were on a 16-unit grid with a 1.5 stroke,
so at the rail's 24px the line drew 2.25px. The owner chose an icon set (Q813 A) and picked Tabler, and every chrome
glyph moves to it in one pass, on both hosts.

- **Vendored, not installed.** `apps/studio/src/shell/icons/tabler.ts` holds only the 27 icons the chrome draws, as Tabler
  ships their path data in `@tabler/icons@3.49.0`'s `tabler-nodes-outline.json`, with Tabler's MIT `LICENSE` copied beside
  it. `apps/studio/chrome/vendor-icons.mjs` writes both from a package unpacked in a scratch directory (`npm pack`), so
  the workspace never depends on Tabler and the file can be regenerated. Do not hand-edit it.
- **The chrome's names stay.** `GLYPHS` in `dom.ts` now maps each chrome name (`chev`, `warn`, `collapse`, …) to a Tabler
  icon, so no caller and no test that reads `data-glyph` moved. `glyph()` draws on the 24 grid with `stroke-width` 1.5,
  round caps and joins, in `currentColor`, and stamps the icon's name in `data-icon`. The three unused glyphs (`pages`,
  `export`, `docs`) were left out, and the typecheck confirms nothing drew them.
- **The mirror (#3043).** Restore is `arrows-diagonal`. Tabler draws Minimize on either diagonal; `arrows-diagonal-minimize-2`
  is the one on Restore's diagonal, so the pair stays an exact mirror (both heads' arms 4 long). The mirror arm now reads the
  glyph's center from its viewBox (12, not 8), and a new arm holds Minimize to Restore's diagonal.
- **License in the bundle.** MIT asks for the copyright and permission notice in copies, so the chrome CSS carries the
  license text whole in an `Icons.` comment, read from the file. `[license]` checks the comment against the literal
  copyright line and the permission notice's opening.
- **`test:chrome` arms** (section 1, every host, theme and width): every drawn `<svg>` is a vendored Tabler icon, its paths
  matching the file's exactly; every glyph strokes 1.5 on its 24 grid, round, in `currentColor`; at 24px the line renders
  1.5px. Each arm and the mirror arms failed by name under a mutation.
- **Arms that knew a glyph by its old drawing** now know it by Tabler's path data, typed as literals in the test: the
  brand switcher's chevron (S13.1), the verdict's check and warning (29b), the padlock's shackles (QA-B12, now the glyph's
  last path, since Tabler draws the body first), the boxed note's warning (RX3 A) and the stray-ⓘ scan (HP3). The HP3 scan
  is a negative arm, so against the new drawing it would have passed on nothing; a mutation that draws an ⓘ in a hint line
  fails it by name, as a swapped glyph fails each of the others.
- **#1855's value pickers read the label alone.** CI's first run went red on the weight picker's forced-colors arm:
  HighlightText ink at 1.5% against a 1.5% floor. That arm read the whole selected value's text box, which spans the key's
  check glyph and the weight's type sample, and on CI's rendering the old 2px check was carrying the ratio. It now reads
  the key (`.p3-vpick-key`), the label it names: 7.5% to 10.8% locally, green on CI, and it still fails by name when the
  picker loses its forced-colors opt-out.
- **A trap for whoever re-verifies:** the vendored-set arm holds the DOM to `tabler.ts`, so it cannot see a hand edit made
  inside `tabler.ts` itself. The generator and the file's header are the guard there; regenerate rather than edit.
- **Held for the owner:** the 16px glyphs. A 1.5 stroke on the 24 grid draws a 1.0px line at 16, measurably lighter than
  at 24 on a 1x display (10.5% ink against 11.8%). Stroke 2 at 16 (1.33px, Tabler's own default) is proposed in the PR, not
  built. The legacy dashboard's `.select` chevron in `styles.css` is not chrome and was not touched.
