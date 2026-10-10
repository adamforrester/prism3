## (2026-10-10) — Divider: a 1px rule, built before Accordion nests it (#2455)

A new component, `divider`, after the KB brief `components/divider.md` (category `foundations`).
`orientation` horizontal | vertical and `inset` none | inset | middle-inset, five members, no states. Its
thickness is `border-width.hairline`, its color `color.border.secondary`. In code it is decorative by default
(`decorative`, default true: `aria-hidden`), and with `decorative=false` an `<hr>` (or `role="separator"` with
`aria-orientation="vertical"`). Its own Figma page, `↳ Divider`, under Components after Tabs. Owner decisions
Q190 (2026-10-10) settled the semantics, the inset and the visible defaults; the inset steps and the new
wording are DRAFT for the owner. The labelled divider is deferred to its own issue. No token name moves;
`token-contract --check` is clean.

### The diagnosis that kept it small

- **A filled box, not a stroke.** A box's stroke draws on all four sides inside its bounds, and `PartDef`
  cannot bind a one-side stroke weight, so a stroked rule would need machinery the schema lacks. A 1px box
  with a fill is the same pixels and needs nothing new; the code projection is the same shape
  (`block-size` + `background`).
- **"Fills its parent" is a placement fact, not a root sizing mode.** The idiom for a root that fills
  across is `sizing.x: 'fill'` + `placementWidth`, but the root's sizing is one mode for every member and a
  vertical rule fills the other axis. So both dimensions are bound per orientation through
  `{orientation}`-keyed tokens — the hairline on the thickness axis, a NOMINAL length on the other
  (`container.narrow` across, veil's idiom; `size.md.height` tall, focus-ring's). A host stretches the
  nested instance with `crossAxisFill`; the root declares a `layout` because `nestSizingOf` reads it.
- **One new axis name.** `orientation` joins `VARIANT_AXES` as the twenty-second name, the word the
  owner's issue uses and the ARIA attribute it drives. `lint-axis-values.ts` carries it as a
  `sole` set; button's `inset` becomes `canonical`, now that the divider's disjoint `none | inset | middle-inset` shares the name.
- **The inset is the root's padding, and the rule fills what is left.** The root keeps the footprint
  (both dimensions bound per orientation) and pads by the inset; the one child, `rule`, paints and fills
  the content box (`grow` along the row, `crossAxisFill` across). A host's stretch moves the root, so the
  inset survives it. With no inset the pixels are the 1px box the first version shipped.
- **A vertical rule takes no start-only inset.** `PaddingDef.block` pads both ends, and `paddingTop`
  cannot sit beside `padding`, so a top-only inset is not expressible; `excludeCoordinates` drops
  `vertical × inset`. Its keys still exist at `space.0`, because every binding key must resolve at every
  coordinate, excluded ones included.
- **`decorative` has no Figma property.** It changes no pixel, and a Figma boolean drives one node's
  `visible`; the codeOnly entry leads with it.
- **`commonPartners` is empty.** The brief's partners (list, menu, card, stack, toolbar) are not
  registered defs, and the refs arm refuses an unregistered id there, so they sit in `composition.planned`.

### Gate fallout

The def joins `lint-hit-target` (EXCLUDED), `lint-rung-names` (NO_SIZE_AXIS), `lint-axis-values`,
`lint-standalone-floor` (MUST_PROJECT), `lint-paint-placement` (both closed sets), the KB-brief table in
`test.ts` (`divider.md: foundations`) and `test.ts`'s #990
width cohort. That #990 arm assumed every def has a `rest` state and that only `{size}` templates a width
key; it now reads a stateless def with no state coordinate and resolves any `{axis}` in the key. The
regen count moves from 177 to 178 (`out/components/divider.md`), in `verify.ts` and `ci.yml` together.
`lint-component-docs`' `DEF_FLOOR` rises to 29, the registry's count with Tab and Tabs.

### Traps for whoever picks this up

- **Not measured: a host's stretch over a bound length.** The standalone length is a bound variable; a
  host's `crossAxisFill` projects the instance as STRETCH on that axis. That the stretch wins over the
  inherited binding on the real Figma host is expected, not measured; Accordion (#2417) is the first
  nesting host and the place to measure it.
- **The first version said "No KB brief"** and chose `layout`; the brief existed (`foundations`). The #1700
  arm accepts a "No KB brief" header without checking the catalogue, so no gate caught it. Check the KB
  before writing that line.
