## (2026-10-26) — IA v2 rail polish: 9px labels, 24px icons in square marks, Agent and Minimize swap places, wider Theme tabs (#2909)

The owner's first hands-on look at the IA v2 chrome, built as stated, on both hosts (the plugin and the web studio share
the chrome).

- **Rail labels** at 9px and -0.01em. The engine's type scale stops at 10px, so the size is `calc(var(--p3-fs-12) * 0.75)`,
  three quarters of a scale step rather than a raw length the build's scan would refuse. Tracking is the existing
  `ls-snug` role (`letter-spacing.neg-10`, exactly -0.01em).
- **Rail icons 24 x 24 in a square mark.** The cause of the landscape box: the mark took `min-width: ctl-h` (40) and
  `min-height: ctl-h-xs` (28), two different tokens on the two axes. It is now fixed at `width` and `height` both
  `--p3-rail-tile` (`core.dimension.32`, new in `spec.mjs`), `flex: none`, so neither the label nor a line height sizes it;
  the icon is `--p3-icon-md` (`icon.size.md`, 24). A 32px mark leaves a 4px inset on the selected fill, and the tile
  stays about as tall as before (32 + one 9px line against 28 + one 12px line), so the plugin's 420px rail keeps fitting.
- **Agent and Minimize swap placements (Q731).** Minimize now sits at the rail's foot, where the Agent tile was. The
  Agent tile sits on the top bar, after the brand switcher and before Update file, where Minimize was before this PR. A
  first build read the brief's "swap" as Update file ↔ Minimize; the owner clarified it and that swap is reverted. The
  change is in where the frame places the two slots (`frame.ts`, `bar.ts`). Minimize's slot hook is now `rail-minimize`,
  so the old `bar-minimize` name doesn't point at the bar. Both controls behave as before: Minimize works with the link
  on or off, and the Agent tile keeps its toggle, `aria-pressed`, green dot and Activity status. One thing doesn't carry
  over. The rail's fill behind an on tile (Q2909.22 A) is a rail rule, so on the bar the on state is the dot alone. That
  question is with the owner on the PR.
- **Mirror glyphs.** Minimize draws `collapse` (`dom.ts`), Restore's two arrows turned inward. The strip's Restore keeps
  the outward pair. `test:chrome` reads both drawn SVG paths, takes each arrowhead's corner as its tip, and checks the
  direction against the shafts' reach. A glyph name can't satisfy that check.
- **Whole labels (Q732 A).** "Components" and "Appearance" drop the wireframe's manual break. Each fits one line at 9px.
- **Theme tabs:** the panes row's gap from `space.150` (12px) to `space.200` (16px), one step on the chrome's scale.

`test:chrome` gains an arm for each change, and each was mutated to fail by name. The arms cover: Minimize first at the
rail's foot and never on the bar; Agent on the bar between the brand and Update file and never on the rail; `BAR_ORDER`;
the two glyphs differing and pointing the right ways; and no hyphen in any rail label.
