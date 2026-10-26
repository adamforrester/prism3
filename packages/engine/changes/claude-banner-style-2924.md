---
engine: minor
---
Banner style (#2924, owner Q693 A, Q707 A): a new optional brand input, `bannerStyle: tinted | outlined` (Form, after
Dialog title size, default `tinted`). One surface for every banner the brand ships: Tinted fills each tone with
`color.foreground.{tone}-subtle`, as today; Outlined fills it with the page color, `color.background.primary`. Both keep
the 1px edge in `color.border.{tone}`, the glyph in `color.icon.{tone}` and the text in `color.text.primary`.
`applyBannerStyle` materializes it into the Banner def before projection, after Dialog title size and before weight
intent, in the plugin's `materializeForBrand`, the lever sweep and the spec chain; it is the identity at Tinted and for
every def but Banner. A value setting: it moves four fill bindings, so Banner keeps its 8 members, axes, properties and
layer names. No token is added and no token name moves, so CONTRACT is unchanged and every committed token emission is
byte-identical. Banner's container note, code notes and usage gain the setting, so its docs, `components.ai.json` and
projected surface move (accepted). The lever copy is a DRAFT (Q2 on #2924). Bold is held on #3038.
