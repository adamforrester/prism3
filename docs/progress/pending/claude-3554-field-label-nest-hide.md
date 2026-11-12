## (2026-11-11) — Slider nests its label as the fields do; hideLabel is one prop on Search, Counter and Slider (#3554 Q-CC5, Q-CC7)

**Status:** Slider and Counter defs, test arms. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No
executor change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q-CC5 A (2026-11-11, on #3554):** Slider's FieldLabel goes from `nest-fixed` at medium/bold to the
  fields' nesting (Q399 A, the Counter's precedent): `nest-exposed`, `expose: ['emphasis', 'weight']`,
  `follow: ['size']`, starting primary and regular, dimming at disabled. Visible change: the slider's label is regular
  weight by default, where it was bold, and it is small, medium or large with the slider.
- **Owner decision Q-CC7 A:** one code prop, `hideLabel` (visually hidden, still in the accessibility tree), on
  SearchField, Counter and Slider.
  - SearchField already had it; unchanged.
  - Counter's code `showLabel` (default false) becomes `hideLabel` with the default kept: the label is hidden by
    default (Q283.9 B), so `hideLabel` defaults to true. Its Figma `label` switch becomes Figma-only, as Search's is.
  - Slider gains `hideLabel` (default false). Its Figma `label` switch was already Figma-only, with no code prop
    behind it.
- Polarity is unchanged in Figma: each host's `label` switch keeps its default (Search on, Counter off, Slider on).

### Held for the owner

Nested `nest-exposed`, Slider's label now surfaces FieldLabel's required marker on the slider, with no `required`
prop, as Counter's does. Q-CC8 decides Counter separately; Slider is asked beside it on #3554 rather than decided here.

### Diagnosis

Only Slider's plan moves: the nest coordinate per member and the exposed properties. Counter's change is code API plus
a Figma-only flag, which the plan does not carry, so its digest and the component-axes baseline hold.

### Verification

Two `test.ts` arms, literals typed from the decisions. `Q-CC7 <id>` holds each host's `hideLabel` and its default, and
that no host declares a code `showLabel` and each `label` switch is Figma-only. `Q-CC5 slider` holds the nesting, and
every one of the 30 members' label coordinate (size followed, primary, regular, disabled only on disabled members). The
`#2427 counter/label` arm now reads `hideLabel`, default true. Surface baseline accepted for Slider only (30 → 30
members).
