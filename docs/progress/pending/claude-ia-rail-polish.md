## (2026-10-26) — IA v2 rail polish: 9px labels, 24px icons in square marks, a collapse glyph for Minimize, wider Theme tabs (#2909)

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
- **Minimize** draws a new `collapse` glyph (`dom.ts`: Restore's two arrows turned inward, the same 1.5 stroke) and sits
  after Update file, at the bar's outer end. The brief named the neighbor "the agent-link control", but Agent lives at the
  rail's foot since #2909; Minimize's only neighbor is Update file, so the swap is that one (flagged on the PR). One line
  in `bar.ts` reverts it.
- **Theme tabs:** the panes row's gap from `space.150` (12px) to `space.200` (16px), one step on the chrome's scale.

`test:chrome` gains arms for each, every one mutated to fail by name. At 9px every label fits one line inside the 60px
rail at 380 on both hosts, but "Compo-nents" and "Appear-ance" now show their manual break hyphen mid-word on that one
line: a copy question left for the owner, not changed here.
