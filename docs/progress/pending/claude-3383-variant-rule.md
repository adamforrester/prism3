## (2026-11-03) — The variant rule is written guidance; the engine's defs audited against it (#3383)

Owner decision Q3 A: a component gets a variant only when its layout or structure changes. Show/hide becomes a
boolean, text a text property, a nested choice an exposed nested instance, width the container's, and a color-only
state or status stays a variant. It came from a Figma rebuild whose local components were heavily over-varianted
(an order row at 23 variants where the rule gives 6; a bag line item at 32 where it gives 4).

### What changed
- `skills/prism3-build-component` §6: the rule as a table mapping each kind of difference to the def field it
  becomes (`variantAxes`, `booleans`, `texts`, `nest-exposed`, no axis), with Button's slot axes named as
  holding to it (the slot moves the padding). The closing checklist checks it.
- `skills/prism3-rebind` §3: the rule for a local component built where Prism3 has none, with the member count
  recorded in the log. §11 step 8: auditing a rebuild's local sets against it, read-only first, with reduction
  held for the owner and run through the snapshot-and-restore steps.

### The audit
Every def's Figma set projected with `figmaAnatomySet`; for each projected axis, the members that differ only on it
compared field by field. No axis moves nothing. One axis is width-only (dialog `size`); seven only forward a nested
component's coordinate; a group of color-only style axes (`appearance`, `surface`, `emphasis`, `tone`, the veil's
three) waits on the owner's reading of the color-only clause. All filed in #3392; no def changed here.

### No gate, and why
The independent version (each projected axis changes at least one field of the plan) passes every def today and
also passes every shape the rule targets: a show/hide axis adds a child, a width-only axis moves a width, a
forwarding axis moves a nested coordinate. That is `docs/34` shape 10, an oracle measuring a symptom instead of
the rule. Testing the rule itself needs a hand classification of plan fields (width, paint, structure) and a call on
when forwarding is legitimate, and its first run would fail on an axis the owner decided (dialog `size`, Q303).
Reconsider once #3392 settles those answers.
