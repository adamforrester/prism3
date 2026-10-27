## (2026-10-26) — Banner style: one brand-wide setting, Tinted / Outlined (#2924)

The owner decided the scope on #2924 after the wireframe (Q693 A, then Q707 A): a brand setting for the banner's
surface, Tinted (today's banner, the default, so no brand moves) and Outlined, Banner only. Bold, a solid tone fill,
was wireframed and measured, then held on #3038: its action and dismiss are nested Button and FlushIconButton
instances whose ink and focus ring no materializer can re-point, so it needs an engine capability first.

- **The lever.** `bannerStyle`, `tinted | outlined`, in Form after Dialog title size, `kind: 'value'`. Label, option
  labels and description are the wireframe's Q2 A draft and join the wording pass.
- **The materializer.** `applyBannerStyle` rebinds Banner's four `<tone>.fill` keys from `color.foreground.<tone>-subtle`
  to `color.background.primary`. It is the identity at Tinted and for every other def, sits after Dialog title size in
  the three restated chains, and throws by name if a fill key ever holds something other than its tone's tint.
- **A value setting (#2959's rule).** Four fill bindings move; Banner keeps its 8 members and every axis, property and
  layer name, so a brand switch reaches an existing file through Update. No token is added, CONTRACT holds, and every
  token emission is byte-identical. Banner's container note, code notes and usage name the setting, so its docs,
  `components.ai.json` and projected surface move by those lines.
- **Contrast.** `test.ts`'s Banner block now measures every part in both styles: 72 pairs (9 per tone per style) across
  the 5 example brands × 4 modes, each against that style's fill, typed from the decision. The page ground is further
  from every ink than the tint is, so Outlined is the easier style; the edge pair is the same in both.
- **Where it lives.** Components › Banner, a section built like Dialog's (#2962): Banner as a flat row, then a
  "Banner options" line, then the block with the chips. Banner leaves Other components.
- **Not here.** Bold and its nested-ink capability (#3038). Whether a brand's own `.ai.json` should name its component
  settings (none does today) is outside this lever.
