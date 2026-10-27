## (2026-10-27) — Scrim strength: a per-brand setting, and the reference brand's dialogs over a strong scrim (#3050)

The owner took Q825 A on #3050 (a per-brand value lever, an enum, high contrast one step heavier, dark-mode separation
out of scope as #3103), then corrected Q3050.3 to B: `strong` uses the existing 80% step, so no 75 step, no new token
names, and no contract bump.

- **The setting.** `scrimStrength: standard | strong`, in Color, a value setting. `standard` (the default) keeps
  40 light / 60 dark / 60 hc-light / 70 hc-dark. `strong` is 80 / 80 / 90 / 90. It moves only the alias of
  `color.scrim.default`; the dialog's backdrop binds the same token either way.
- **The reference brand.** Its legacy fixture and its redesign seed set `strong`. Its scrim is 80 / 80 / 90 / 90; the
  legacy fixture comparison records the four moves as known divergences. Every other brand's emission is byte-identical.
- **Studio.** Surfaces & fills › Scrim is the setting's block: Standard / Strong chips above the read-only row, which
  reads out the step the choice gives. The label, option names, description and the section's line are drafts.
- **Figma.** Apply Theme moves `color/scrim/default`'s alias on the same variable (`test-write.ts`, #3050 arms).
- **Gates.** `test.ts`'s #3050 block: every brand × option × mode pinned to its step, no token name moved between the
  options, both reference-brand inputs, the committed emission. Mutations: `strong`'s dark step back to 60 fails
  `#3050 scrim strong` and the fixture's divergence arm; `standard`'s light step to 50 fails `#3050 scrim unset`,
  `#3050 scrim standard` and the plugin's `#3050 standard`.
