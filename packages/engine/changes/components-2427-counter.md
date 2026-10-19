---
engine: minor
---
Counter, a new component (#2427; owner decisions Q283, Q286 A and the wireframe decisions on #2427, Q287 A on
#2457): a whole-number quantity between a minus and a plus button, for ecommerce. `appearance: outline | ghost`
(outline first, Q283.4 A) × `size: medium | small | large` (medium first, Q283.6 B, now every ladder's rule under Q1 B) ×
`state: rest | focus-visible | disabled` = 18 members, on its own page under Components. The row is 36 / 44 / 56px
(`size.sm` / `md` / `lg.height`). Outline draws the field's fill and edge (`color.field.fill`,
`color.field.border.rest`; `color.disabled.border` at disabled) with the glyphs 12 / 12 / 16px inside it; ghost draws
no box. The minus and plus are two nested FlushIconButton.Neutral instances, each with its `state` exposed so a
designer sets one disabled at a limit: flush on outline, round on ghost (Q287 A). The value is at least 32px wide, in
`type.body.{sm,md,lg}.default`. The label (FieldLabel) is hidden by default (Q283.9 B) and the message
(FieldMessage) is off by default. The minus and plus glyphs are per-instance swap overrides on the two nested buttons (#2645). No new token, so CONTRACT is unchanged.

A nest relation can now map a host value onto a differently named child axis: `variantWhen`, beside `variant` and
`follow` on `nest-fixed` and `nest-exposed` (`{ appearance: { ghost: { shape: 'round' } } }`). The projector merges
it between the fixed `variant` and `follow`; the validator refuses an unprojected host axis, an undeclared value, an
empty map, an axis with no values, an empty coordinate, a child axis also followed, a child axis set from two host axes, and a child axis the fixed `variant`
does not name. It replaces `atState` (#2317), which did one case of the same job: the Password field's Show button now
says `variantWhen: { state: { disabled: { state: 'disabled' } } }`, and its projected plan is unchanged.
