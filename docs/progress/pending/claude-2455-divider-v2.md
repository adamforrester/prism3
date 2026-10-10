## (2026-10-10) — Divider: a 1px rule, built before Accordion nests it (#2455)

A new component, `divider`: one filled box, `orientation` horizontal | vertical, no states. Its thickness is
`border-width.hairline`, its color `color.border.secondary`, and in code it is an `<hr>` (or
`role="separator"` with `aria-orientation="vertical"`), hidden with `aria-hidden` when decorative. Its own
Figma page, `↳ Divider`, under Components after Tag. Every visible choice is DRAFT and listed for the owner
in the PR. No token name moves; `token-contract --check` is clean.

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
  owner's issue uses and the ARIA attribute it drives. `lint-axis-values.ts` carries it as a `sole` set.

### Gate fallout

The def joins `lint-hit-target` (EXCLUDED), `lint-rung-names` (NO_SIZE_AXIS), `lint-axis-values`,
`lint-standalone-floor` (MUST_PROJECT), `lint-paint-placement` (both closed sets) and `test.ts`'s #990
width cohort. That #990 arm assumed every def has a `rest` state and that only `{size}` templates a width
key; it now reads a stateless def with no state coordinate and resolves any `{axis}` in the key. The
regen count moves from 177 to 178 (`out/components/divider.md`), in `verify.ts` and `ci.yml` together.
`lint-component-docs`' `DEF_FLOOR` rises to 29, the registry's count with Tab and Tabs.

### Traps for whoever picks this up

- **Not measured: a host's stretch over a bound length.** The standalone length is a bound variable; a
  host's `crossAxisFill` projects the instance as STRETCH on that axis. That the stretch wins over the
  inherited binding on the real Figma host is expected, not measured; Accordion (#2417) is the first
  nesting host and the place to measure it.
- **No KB brief was reachable** from the lane that built this, so the header says "No KB brief" and
  states the category (`layout`). If a divider brief exists, cite it and take its category.
