/**
 * Switch.Control — the ATOMIC track-and-thumb (#1354, the #1226/#1330 mechanism a third time). The
 * painted pill, its traveling thumb, the state glyph in that thumb, and the focus ring — extracted
 * from `switch` so the labeled Row NESTS it rather than redraws it, exactly as `checkbox` nests
 * `checkbox-control`. A fix to the track (its border weight, its fill grammar) or the thumb (its
 * travel, its glyph) now propagates to the Row by single-sourcing rather than by a copy kept in step
 * by hand.
 *
 * KB brief: `components/switch.md` — the control and atomic primitive of the brief's decomposition.
 *
 * ── THE COMPOSITION CHECK #1354 REQUIRED, ANSWERED FROM THE REGISTRY ───────────────────────────────
 *
 * The owner's precondition: build the nest-exposed split ONLY if something actually NESTS a
 * switch-control. `checkbox-control` exists because the checkbox ROW nests it (`grep nests:` →
 * `checkbox.ts` is its one nester, the group #901 still unbuilt). Measured here the same way: the
 * switch was ALREADY a row that contains a control subtree (`row → trackBox → track → {thumb,
 * focusRing}`), the identical shape checkbox had before #1226 split it. So the split produces a
 * genuine nester — the switch Row nests ONE `switch-control` in flow, `nest-exposed`, exactly as the
 * checkbox Row nests `checkbox-control`. The composition check PASSES: this atom has a consumer (the
 * Row), and the family stays uniform (checkbox and radio split, switch splits).
 *
 * ── WHAT MOVED HERE, AND WHY THE ROW STILL EXISTS ──────────────────────────────────────────────────
 *
 * Everything that PAINTS the control: the track (fill + border), the thumb (the traveling indicator
 * disc) and the focus ring, rooted at `track`. The Row keeps what is the Row's — the label, the
 * label-to-control gap, the row's floor, and the `trackBox` line-box wrapper that centers the control
 * against the first line of a wrapping label (#1201). This atom knows nothing about labels or hit
 * targets; it is a pill that paints itself and moves its own thumb.
 *
 * ── THE THUMB TRAVELS, AND THAT IS WHAT MADE THE SPLIT THE LAST ONE (#990) ──────────────────────────
 *
 * A switch is the first component where a part's POSITION is a function of a variant axis — the thumb
 * declares `positionWhen: { selection: { off: 'start', on: 'end' } }`, one part in two places. The
 * travel projects onto the TRACK's `primaryAxisAlignItems` (Figma has no per-child main-axis offset),
 * which is why the track must be `fixed` along that axis, bind its own `width`, and carry the thumb as
 * its ONLY flow child. `checkbox-control`'s header closed by saying switch "stays out of scope — its
 * thumb moves between selection values, an unsolved positioning wall that splitting would inherit
 * without addressing." #990 solved the wall; this def is the split that header deferred.
 *
 * ── THE X / CHECKMARK IN THE THUMB (#1354, the Prism 2 affordance) ─────────────────────────────────
 *
 * Prism 2's toggle ships a glyph INSIDE the handle — `checkLine` when on, `closeLine` (an X) when off
 * (`reference/Prism2/component-specs/toggle-switch.json`). That is the state affordance #1354 asks for:
 * a cue beyond track color and thumb position (WCAG 1.4.1 is already met by POSITION, so this is
 * legibility, not the color-independence answer). Two `vector` parts gated on `selection` carry it —
 * `onGlyph` a `check` at `selection=on`, `offGlyph` a `close` at `selection=off` — children of the
 * thumb, so they travel with it for free.
 *
 * **`State icon` — ONE Figma BOOLEAN over both glyphs, default ON (owner, 2026-09-28).** The glyph is a
 * component property of the set, not a code-only gate: `figmaProperties.booleans` maps `showStateLabel`
 * to BOTH glyph parts under the panel name `State icon`. It is #1331's NODE-VISIBILITY mechanism — the
 * glyph node is built and its `visible` rides the property — so the set does NOT grow (24 members). A
 * boolean VARIANT axis stays rejected: it would add a name to the closed `VARIANT_AXES` vocabulary for one
 * def and DOUBLE the set to 48. One property drives TWO parts because the check and the X never coexist:
 * each is `presentWhen`-gated on `selection`, and between them they cover both values, so every member
 * builds exactly one glyph node for the toggle. That is the one narrowing of #1331's "a boolean part
 * carries no presentWhen" refusal (`figmaPropertyErrors`), pinned by mutation in `test.ts`. The code prop
 * `showStateLabel` defaults to `true` to match. Before this, the two surfaces disagreed: the Figma set drew
 * the glyph at every member with no way to hide it, while the prop defaulted it OFF in code.
 *
 * ── THE THUMB IS AN `indicator` BOX THAT CARRIES A GLYPH (#1354 widened #910's #864 rule) ───────────
 *
 * The track owns `fill` (+`border`), so the thumb — the second painted surface — takes `indicator`,
 * the slot radio's dot took for the same reason (#933: two boxes cannot claim one slot). #910's rule
 * then refused an `indicator` box with a glyph child, because #864 measured a fill landing as a SQUARE
 * behind a glyph on an SVG wrapper frame. A Prism 2 thumb is the case that rule did not anticipate: a
 * deliberately-shaped filled DISC (bound `size` + round `radius`) that legitimately carries a mark, the
 * round fill BEHIND the glyph being the intended visual rather than an incidental square. The rule is
 * widened to permit exactly that — an `indicator` box binding both `size` and `radius` may parent a
 * glyph — and is the principled-exemption direction the house rule requires (a false positive is fixed
 * by narrowing the refusal's scope with a stated reason, never by dodging it with a wrapper node that
 * reproduces the very fill-behind-glyph #864 exists to prevent). `checkbox-control`'s filled `control`
 * box already parents its `mark` vector the same way — it simply uses `fill`, which was never refused.
 *
 * ── THE PAINT GRAMMAR, FILLS AND GEOMETRY ARE `switch`'s, VERBATIM ──────────────────────────────────
 *
 * Axis-led (`{selection}.{slot}.{state}` first), the `selection` exemption in `lint-paint.ts`'s
 * `NON_FAMILY_AXES`, the deliberately ASYMMETRIC rim (off track keeps its border, on track drops it —
 * #1011, and the trap `switch.ts`'s contested note documents at length), the selection-keyed thumb ink,
 * the 2px load-bearing border (#1228), `radius.round`, and the `control.size.*` track/width/thumb/inset
 * bindings (#900, #951, #997, #1425). The GEOMETRY is where #1425 diverges from a verbatim extraction:
 * the switch reads its OWN tier fields (`track` height, `thumb`) rather than borrowing the square-control
 * `height`/`dot` a checkbox/radio reads — the split that scales the track to Prism 2's 32px / 24px thumb
 * proportions and clears the hit-target floor. The PAINT is still a verbatim extraction of the painted
 * surface from `switch`, the same way `checkbox-control` was of `checkbox`. The reasoning for each lives
 * in `switch.ts` history and is not restated.
 *
 * ── THE OFF TRACK IS A LIGHT SURFACE WITH A DARK THUMB, IN EVERY BRAND (owner, 2026-09-28) ─────────
 *
 * The off track used to borrow the neutral BUTTON fill (`interactive.neutral.fill.*`), which the
 * `neutralEmphasis: 'strong'` lever darkens into a near-black button (NB master theme: #2D2C2C). On a
 * brand-neutral action palette the on track is near-black too (#34383D), so off and on read the same —
 * the owner's finding. The off track now reads `background.tertiary`, a surface step no interactive
 * lever moves; it keeps its hairline in `interactive.neutral.border.rest` (the 1.4.11 boundary, 15.98–
 * 21:1 against the page); and the off THUMB is DARK, in that same border ink — Material 3's unselected
 * shape (its handle and track outline share one `outline` role) and Prism 2's (#C6C6C6 track, #6A6A6A
 * handle). Measured over the token-contract corpus, prism3 and the NB master theme, every mode:
 *
 *   off thumb on off track   12.36–21:1   (NB master light 14.05:1, prism3 light 14.04:1)
 *   off track vs on track     3.22–14.01:1 (NB master light 14.01:1, prism3 light 5.65:1)
 *   off border vs the page   15.98–21:1
 *
 * High-contrast modes flatten every background step to the page, so the off track is page-colored
 * there and the border and thumb carry it. OFF HOVER AND PRESSED SHOW NO VISIBLE CHANGE, like checkbox
 * and radio at unchecked (owner-decided, 2026-09-28, on #1765). The fill holds its rest value: the tier
 * has no surface step darker than `tertiary`, and the overlay wash REPLACES a box's fill rather than
 * layering on it (a 10% wash over the page reads LIGHTER than `tertiary`). The `off.border.hover` /
 * `.pressed` keys stay bound, but `interactive.neutral.border.*` resolves all three states to one value,
 * so the off member reads the same at rest, hover and pressed.
 *
 * THE DISABLED GLYPH (#1764). At `disabled` the thumb is `disabled.on-fill` and the glyph is
 * `disabled.border` — the disabled TRACK's own value in every corpus mode, so it repeats the rest-state
 * "glyph = track" inversion in the muted disabled inks. Glyph vs thumb measures 3.04–5.49:1 across the
 * token-contract corpus, prism3 and the NB master theme (NB master light 3.07:1, prism3 light 3.06:1).
 * Disabled is contrast-exempt (1.4.3); the number is recorded so the glyph is shown to be visible, not
 * promised to be legible. `disabled.text` was measured and rejected: 1.21–1.79:1 against the thumb.
 *
 * The two glyph inks. Each glyph sits ON the thumb, so its ink is the INVERSE of the thumb's: the off
 * thumb is the dark `neutral.border.rest`, so `off.icon` is the light `background.tertiary` (the
 * off-track color — the off-thumb pairing read the other way, 12.36–21:1); the on thumb is
 * `primary.on-fill`, so `on.icon` is `primary.fill.selected` (the on-track color — the on-thumb pairing
 * read the other way, 4.56–19.36:1 in every mode; prism3 light 7.82:1, dark 4.58:1). Before #1763 the dark
 * modes measured 2.32–2.62:1 here: `fill.selected` walked a lighter step than the `fill.rest` the ink is
 * gated against. Since 2026-09-29 (owner) `fill.selected` takes the rest step, so the on track is the brand's
 * rest fill and the pair clears in every mode. The cost, measured: in `dark` the on track sits closer to the
 * dark off track: 3.22–14.01:1 across modes (minimal dark 3.22:1), after #1773 gated every page fill against
 * `background.tertiary` too — it read 2.71:1 in prism3 dark and wendys dark before that. Thumb position still
 * carries the state.
 */
import { ComponentDef } from '../component-schema';

export const switchControl: ComponentDef = {
  id: 'switch-control',
  name: 'Switch.Control',
  aliases: ['switch-track', 'toggle-control', 'switch-atom'],
  category: 'form',
  status: 'draft',
  summary: 'Switch track, thumb, state glyph and focus ring. Nested by Switch.Row; no label.',
  description:
    'The atomic switch control — the painted pill track, its traveling thumb, the X/checkmark state glyph in that thumb, and the focus ring, and nothing else. Nested by the labeled Switch.Row rather than placed on its own: it carries no label, no description and no hit-target padding, so a standalone use needs an external aria-label. Carries the two-value selection axis (off / on) whose thumb POSITION is the part that varies, the off-track border that is load-bearing for WCAG 1.4.11, and the 2px control border.',

  // The atom's surface, not the field's. No `label`, no `description`, no form wiring — those are the
  // Row's. `showStateLabel` lives here because it gates a part of this atom (the thumb glyph); the Row
  // exposes it to the consumer like every other control-level control. In Figma it is the `State icon`
  // boolean (`figmaProperties.booleans`), default on to match the code default.
  props: [
    { name: 'checked', type: 'boolean', required: false, description: 'The on/off appearance. Driven by the host row — a bare Switch.Control is styled by the coordinate, not wired to state here. The flip is immediate by the Row\'s contract; this atom only renders the two positions.' },
    { name: 'showStateLabel', type: 'boolean', required: false, default: true, description: 'The X/checkmark-in-the-thumb affordance — a check when on, an X when off, a cue beyond track color and thumb position. On by default; turn it off where the thumb position and track color are enough. Never the sole state signal — thumb position carries the state. Not hardcoded "On"/"Off" text, which is rejected outright.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'Two rungs, not three: switches rarely warrant a large. Scales the track\'s height and length and the thumb\'s diameter. All read `control.size.*`, which moves a rung with brand density; `icon.size.*` would measure the wrong thing. The host row passes its own size through by `follow`.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'The disabled skin — a contrast-exempt fill/border/thumb treatment. Set on the host, followed here.' },
    { name: 'aria-label', type: 'string', required: false, description: 'Required only for a genuinely standalone control with no host row to name it — the Row provides the accessible name, so a nested control must NOT double-label.' },
  ],

  // The six that paint. `read-only` and `pending` are field/row-level concerns (the Row decides them,
  // and the brief recommends a lock affordance / a spinner swap respectively), so the atom carries no
  // treatment and does not list them — exactly as `checkbox-control` drops `read-only`.
  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'error'],

  // `size` and `selection` — the two the control actually varies by. `[off, on]` is the family decision
  // `switch` took against the ARIA recommendation (argued at length in `switch.ts` history): the values
  // describe what is on screen, and `role="switch"` is announced "on"/"off". No indeterminate — a switch
  // is uncompromisingly binary. No tone/emphasis, no surface/inverse axis (#871).
  variants: {
    size: ['small', 'medium'],
    selection: ['off', 'on'],
  },
  // WHEN each axis changes (#1611): runtime axes are held to one footprint, authoring axes are not.
  // `selection` is the live toggle.
  axisKinds: { size: 'authoring', selection: 'runtime' },

  // Axis-led, most specific first — checkbox's grammar, which radio and switch inherit. `selection`
  // leads; the bare `{slot}` answers the bindings outside the grammar (`focus-ring`, `disabled.*`,
  // geometry). `lint-paint.ts` arm 1 exempts `selection` in `NON_FAMILY_AXES`.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}'],

  tokens: {
    // ── THE OFF TRACK — a LIGHT SURFACE STEP, not the neutral button fill (owner, 2026-09-28; the
    // header). `background.tertiary` is a step the `neutralEmphasis` lever does not move, so the off
    // track stays light in every brand. No `.hover`/`.pressed` fill: they fall through to this rest fill,
    // so off hover and pressed show no visible change (checkbox/radio's unchecked pattern, owner-decided
    // 2026-09-28 — see the header for why the overlay wash cannot serve). The
    // BORDER is load-bearing, not decorative — the track fill measures 1.00–1.38:1 against the page, and
    // this border clears 15.98–21:1 (WCAG 1.4.11).
    'off.fill': 'color.background.tertiary',
    'off.border': 'color.interactive.neutral.border.rest',
    'off.border.hover': 'color.interactive.neutral.border.hover',
    'off.border.pressed': 'color.interactive.neutral.border.pressed',
    'off.border.error': 'color.border.danger',
    // The OFF thumb — DARK on the light track (12.36–21:1), in the border's own ink (Material 3 shares one
    // `outline` role between the unselected handle and the track outline). Not `neutral.on-fill`: that ink
    // flips light when `neutralEmphasis: 'strong'` darkens the neutral fill. Keyed by selection because no
    // single ink bounds both tracks.
    'off.indicator': 'color.interactive.neutral.border.rest',
    // The OFF glyph (the X) — the INVERSE of the off thumb's dark ink, so a light X on the dark thumb.
    // `background.tertiary` is the off-track color; the off thumb clears it at 12.36–21:1, so the X clears
    // the thumb at the same ratio (the off-thumb pairing read the other way round).
    'off.icon': 'color.background.tertiary',

    // ── THE ON TRACK — the brief's "stark track-color contrast". `fill.selected` resolves to the rest step
    // (#1763), the step `on-fill` is contract-checked against, so the thumb clears 4.5:1 in every mode.
    // NO STRUCTURAL BORDER (#1011): a fill at 3.91–19.36:1 against the page IS the boundary, so a
    // same-family border beside it can only agree invisibly or disagree visibly — the asymmetry with the
    // off track that `switch.ts`'s contested note documents as the trap not to "fix for consistency".
    'on.fill': 'color.interactive.primary.fill.selected',
    'on.fill.hover': 'color.interactive.primary.fill.hover',
    'on.fill.pressed': 'color.interactive.primary.fill.pressed',
    'on.border.error': 'color.border.danger',
    // The ON thumb — `primary.on-fill` on the on track, 4.56–19.36:1 in every mode (#1763: 2.32–2.62:1 in
    // dark before `fill.selected` took the rest step).
    'on.indicator': 'color.interactive.primary.on-fill',
    // The ON glyph (the check) — the INVERSE of the on thumb's light ink, so a dark check on the light
    // thumb. `primary.fill.selected` is the on-track color, so the check clears the thumb at exactly the
    // on-thumb ratio (the same pairing read the other way round).
    'on.icon': 'color.interactive.primary.fill.selected',

    // ── FOCUS RING — on the TRACK, never the thumb (the thumb moves). The CONTROL ring
    // (`focus.ring.offset`), not a field's flush one. 4.56–5.88:1 against the page.
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // ── DISABLED SKIN (contrast-exempt, 1.4.3). The thumb sits ON the track's fill, so it takes the
    // `on-fill` disabled ink. The GLYPH sits on the thumb, so it takes a DIFFERENT muted ink (#1764): it
    // used to bind `disabled.on-fill` too and drew in its own thumb's color. `disabled.border` is the
    // disabled track's value, so the glyph repeats the rest-state inversion — 3.04–5.49:1 against the thumb.
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.indicator.on-fill': 'color.disabled.on-fill',
    'disabled.icon.on-fill': 'color.disabled.border',

    // ── GEOMETRY. `radius.round` gives the pill (and the round thumb), resolving to `dimension.128` —
    // the same token radio uses for its circle: a pill and a circle are both "round as the shape allows".
    'radius': 'radius.round',
    // The 2px load-bearing border (#1228), drawn at the weight it was measured at. Prism 2 ships the
    // track at strokeWeight 2 / strokeAlign INSIDE. See `switch.ts` for the inside-stroke clearance note.
    'border-width': 'border-width.thick',

    // ── THE TRACK'S TWO DIMENSIONS AND THE THUMB'S ONE — #900's third instance, rebased by #1425 onto the
    // switch's OWN tier fields. `control` is the track HEIGHT (`control.size.*.track` — Prism 2's 32px
    // toggle at `md`, NOT the smaller square-control `height` the switch used to borrow, which was the
    // undersize #1425 corrects). `track` is the WIDTH (`control.size.*.width` = 2× the track height, the
    // field-convergent 2:1 ratio). `control.size.*` and NOT `icon.size.*`: the glyph grid is fixed
    // 16/20/24 in every brand, the control ladder shifts a rung with density (aurora is a full rung smaller).
    'size.small.control': 'control.size.sm.track',
    'size.medium.control': 'control.size.md.track',
    'size.small.track': 'control.size.sm.width',
    'size.medium.track': 'control.size.md.width',
    // The THUMB's diameter — 0.75× the track (`control.size.*.thumb`, Prism 2's 24-in-32), a SEPARATE,
    // larger ratio than radio's `dot` (#1425). At full size the thumb reads as the moving element and the
    // 2px border stops reading heavy.
    'size.small.dot': 'control.size.sm.thumb',
    'size.medium.dot': 'control.size.md.thumb',
    // THE THUMB'S CLEARANCE FROM THE TRACK'S ENDS (#997), read as the track's UNIFORM padding =
    // `(track − thumb) / 2`, so the padded inner box is one thumb tall and one thumb short of the track's
    // length (the travel). Prism 2 sites its thumb the same way (`padding: 4` in a 32px track).
    'size.small.inset': 'control.size.sm.inset',
    'size.medium.inset': 'control.size.md.inset',
  },

  // ── ANATOMY ────────────────────────────────────────────────────────────────────────────────────
  //
  // The atom is the pill and its contents, rooted at `track`. The thumb is ONE part whose POSITION
  // varies (`positionWhen`), not two parts that take turns — a code projection reads one element that
  // translates. The thumb carries the state glyph (a check at on, an X at off) as children, which travel
  // with it. The focus ring is an absolute sibling nesting the shared `focus-ring`, on the TRACK (a ring
  // traveling with the thumb would read as two indicators).
  anatomy: {
    root: 'track',
    parts: {
      // THE PAINTED TRACK — the pill, and the only part that carries `fill` and `border`. NOT SQUARE:
      // `height` is the control rung, `width` is twice it. FIXED on both axes, which the thumb's travel
      // requires and `anatomyErrors` checks from both sides (a hugging or filling track makes `start` and
      // `end` the same place; a second flow child makes the alignment move the group). The BORDER is
      // load-bearing (no fill clears 3:1 at any brand; this border clears it at all four). Its `justify`
      // is the FALLBACK the thumb overrides per coordinate (`positionWhen`): `start` here, projected
      // `MAX` at `selection=on`. Uniform `inset` padding clears the thumb at both ends (#997).
      track: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill', 'border'],
        height: 'size.{size}.control',
        width: 'size.{size}.track',
        radius: 'radius',
        strokeWidth: 'border-width',
        padding: { block: 'size.{size}.inset', inlineLabel: 'size.{size}.inset' },
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['thumb', 'focusRing'],
        note: 'The pill AND the nominal hit-target marker (the real hit target is the whole labeled ROW, which lives on `switch-row`; `role: target` is here only because the schema requires exactly one per anatomy — the same nominal marker `focus-ring`\'s `ring` part and `checkbox-control`\'s `control` carry). Its two dimensions are two decisions: 2:1 is the ratio the field converges on, and it is the tier\'s.',
      },
      // THE THUMB. A filled `box` claiming `indicator` (radio's dot took the slot first; #933's rule is
      // that two boxes cannot divide one slot, and the track owns `fill`). It travels (`positionWhen`),
      // and it carries the state glyph — the #864 indicator rule is widened for exactly this shape (a
      // `size`+`radius` disc that legitimately parents a mark), see the header. `size` (both axes from
      // one variable) plus round `radius` is a circle at any rung; FIXED on both axes.
      thumb: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['indicator'],
        size: 'size.{size}.dot',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        // THE TRAVEL (#990). Two values, two positions, one part. Projected onto the TRACK's main-axis
        // distribution, the only main-axis placement Figma's auto layout offers.
        positionWhen: { selection: { off: 'start', on: 'end' } },
        children: ['onGlyph', 'offGlyph'],
        note: 'The thumb — ONE part whose position varies, not two that take turns. Its fill is selection-keyed (no single ink bounds both tracks). It clears the track\'s ends at both extremes (#997: the track\'s uniform `inset` padding). It carries the state glyph, which travels with it. Its slide is motion and has no expression here; what this schema carries is the two endpoints.',
      },
      // THE ON GLYPH — a check, present only at `selection=on`. Sized from the thumb\'s own `dot` key (the
      // check artboard carries its own ~71% optical inset, so a second ladder would inset it twice — the
      // rule `checkbox-control`\'s `mark` follows). Its ink is `on.icon` (a dark check on the light on
      // thumb), `disabled.icon.on-fill` when disabled. `optional` because the `State icon` boolean hides it.
      onGlyph: {
        kind: 'vector',
        glyph: 'check',
        size: 'size.{size}.dot',
        optional: true,
        presentWhen: { selection: ['on'] },
        note: 'The on affordance (a check). Built at `selection=on`; its visibility is the `State icon` boolean (code: `showStateLabel`), default on. Never the sole state signal — thumb position already carries it.',
      },
      // THE OFF GLYPH — an X (`close`), present only at `selection=off`. Same geometry as the check; only
      // the outline differs. Its ink is `off.icon` (a light X on the dark off thumb). Rides the same
      // `State icon` boolean as the check — one toggle, two parts that never coexist.
      offGlyph: {
        kind: 'vector',
        glyph: 'close',
        size: 'size.{size}.dot',
        optional: true,
        presentWhen: { selection: ['off'] },
        note: 'The off affordance (an X). Built at `selection=off`; its visibility is the same `State icon` boolean as the check (code: `showStateLabel`), default on. The glyph is `close`, the set\'s X.',
      },
      // Radio's / switch's ring, on the TRACK. The two insets SUM in the executor, siting the ring at
      // -(2+2) = -4 so the visible gap is a full 2px (#801). FIXED at `surface=default` (#1134): this def
      // has no `surface` axis, so there is no host coordinate to pass through.
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring` component, inset from the TRACK so the ring surrounds the pill. On the track and never the thumb: the thumb moves, and an indicator that moves with it competes with the one thing that signals state.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word (#563).
      'read-only — deliberately not a state of this atom. It is the field/row-level concern the brief calls "the awkward one" (a lock affordance, not an ink — and the one candidate token, `color.border.secondary`, resolves to the same step as the rest border in all four brands). The Row decides it.',
      'pending — a THUMB SWAP (a spinner replaces the thumb) and an `aria-busy` lock, not a skin. `button` spells exactly this as an `overlay` part (#848), so the mechanism exists and the part is unauthored here — a second concern in a PR whose subject is the split and the affordance.',
      'THE THUMB\'S TRAVEL AS MOTION. `positionWhen` states WHERE the thumb is at each coordinate; the slide between them is the animation the component is most recognized by, and a Figma member is static. The code contract is the `motion` block (KB switch brief §8).',
      'THE GLYPH\'S OWN MICRO-MOTION — the check/X draw and the cross-fade onto the thumb on an async toggle. A Figma variant carries no motion, so the glyphs are static outlines at every coordinate; the `motion` block states the thumb\'s own slide, not the glyph draw.',
      'THE WHOLE-ROW HIT TARGET. A bare track is 24px tall at `small` and 32px at `medium` in every corpus brand (the density-windowed `control.size.*.track` ladder runs 16–40px, so a compact `small` track is 16px, under SC 2.5.8\'s 24px minimum on its own). The accessible target is the labeled ROW, which is `switch-row` and not this atom, at every density. This def is nested, never placed alone, precisely so the target is supplied one level up.',
    ],
  },

  figmaProperties: {
    // BOTH axes; `selection` is NOT optional — the thumb's `positionWhen` and the two glyphs' `presentWhen`
    // are keyed on it, so an unprojected `selection` would build every member with the thumb at the
    // track's declared `justify` and no glyph. 2 selections × 2 sizes × 6 states = 24 members.
    variantAxes: ['selection', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'error'] },
    // No `texts` (no text part), no `swaps` (the thumb is geometry this def owns), no `slotAxes` (the
    // glyphs are gated by a coordinate, which is what `presentWhen` draws). ONE boolean (owner, 2026-09-28):
    // `State icon` shows or hides the thumb glyph — the check at `on` and the X at `off` ride the one
    // property, each carrying `visibleProp` on its own node, so the set stays at 24 (#1331's mechanism, not
    // a variant axis). Default ON, matching `showStateLabel`'s code default.
    booleans: { showStateLabel: { part: ['onGlyph', 'offGlyph'], default: true, figmaName: 'State icon' } },
  },

  accessibility: {
    role: 'The visual control only — the accessible switch role, name and aria-checked (announced "on"/"off", never "checked") belong to the host input the Row wires. A standalone use must supply role and name itself.',
    wcag: [
      '1.4.1 Use of Color (thumb POSITION distinguishes on from off; the glyph is a legibility aid, never the color-independence answer)',
      '1.4.11 Non-text Contrast (the off-track border, load-bearing) / 2.4.13 Focus Appearance (the nested ring, offset, ≥3:1)',
      '4.1.2 Name Role Value (carried by the host; this atom is presentational when nested)',
    ],
    keyboard: 'None of its own — the atom is not a tab stop. Focus, Space-to-toggle and the tab order belong to the host input; the ring here renders the host\'s `:focus-visible` state.',
    focus: 'The nested focus ring surrounds the TRACK on `:focus-visible`, never the thumb (the thumb moves, so a ring traveling with it reads as two indicators). Offset, keyboard traversal only.',
    aria: 'When nested in a host row, the host provides the accessible name through `aria-labelledby` — never double-label. The role is `switch`, announced "on"/"off"; putting `aria-pressed` on it corrupts the announcement (that is a toggle button). The glyph is decorative (`aria-hidden`) — the role+state already carries on/off.',
  },

  content: {
    labelPattern: 'None — the atom carries no label. The setting name and its rules live on Switch.Row (`switch-row`).',
    errorPattern: 'None of its own — an outcome-error boundary is a color treatment the host coordinate selects; the message is the Row\'s.',
  },

  docs: {
    usage: 'Do not place this on its own. It is the track-and-thumb Switch.Row nests, so a fix to its border weight or its fill grammar reaches the row without being copied. Build it before the row that nests it (the nest resolves by name against the live file). A standalone use is only for a control with an external label and its own aria wiring.',
    do: [
      'Nest this from Switch.Row rather than redrawing the track per host',
      'Let the host row pass `selection`, `state` and `showStateLabel` through, and `follow` its size, so the nested control tracks the row',
      'Let thumb POSITION carry the state; treat the glyph as a legibility aid, not the color-independence answer',
      'Supply an external aria-label only when using the control genuinely alone',
    ],
    dont: [
      'Place a bare track as the clickable element — the labeled row is the hit target, and a compact small track (16px) is under the SC 2.5.8 minimum on its own',
      'Double-label a nested control — the host row already provides the accessible name',
      'Put the focus ring on the thumb — it moves, so the indicator would travel with it',
      'Hardcode "On"/"Off" text beside the control — the glyph affordance and the role announcement carry it',
    ],
    contentGuidelines: 'The atom has no copy of its own; all label, description and error text belongs to the row that composes it.',
  },

  ai: {
    primaryPurpose: 'Render the atomic switch control — the painted pill, its traveling thumb, the X/checkmark state glyph and the focus ring — for a host row to nest.',
    whenToUse: 'Nested by the labeled Switch.Row (the common case), or standalone only for a control with an external label and its own aria wiring.',
    avoidWhen: 'You want the labeled case (that is Switch.Row), a staged binary submitted with a form (Checkbox.Row / Checkbox.Control), or a mutually-exclusive one-of-many (Radio.Control). Never place a bare track as the clickable element — the hit target is the labeled row.',
    commonPartners: ['switch-row', 'focus-ring'],
    triggerKeywords: ['switch control', 'switch track', 'toggle control', 'switch thumb', 'toggle handle'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: ['checkbox-control', 'radio-control'],
    replacesPatterns: [
      'the painted track and thumb inlined in a switch row',
    ],
    supersededBy: [],
  },

  // KB switch brief §8. The keys are the schema's (`enter` / `exit` / `reduceMotion`); the thumb slide is a
  // state transition, so it is carried in `reduceMotion` beside its reduced form, button's precedent.
  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'The thumb slides across the track in ~150–200ms, ease-in-out, with a synchronized track-color crossfade; it is the receipt that the immediate change registered. Translate the thumb (`transform`), never animate width or layout, and do not spring it. Under prefers-reduced-motion the slide drops and the thumb snaps (0ms); the track-color crossfade may remain if it stays under flashing thresholds. On an async toggle the thumb snaps to the new position and a spinner cross-fades onto it; if the change fails, the thumb slides back.',
  },

  notes: {
    // #2411 (owner Q167 call 3): how a consumer-facing fact is projected into the design file — maintainer-only.
    projection: [
      'The Figma set carries `showStateLabel` as the `State icon` boolean, default on, so both surfaces start from the same default. (Moved from props.showStateLabel.description, #2411.)',
    ],
    contested: [
      'THE ATOM IS A SEPARATE COMPONENT rather than kept inline in the row, and the #1354 precondition made it earn that: the split was built ONLY after confirming the switch Row nests it (the composition check), which it does — the switch was already a row containing a control subtree, the shape checkbox had before #1226. The rejected alternative (keep the track inline and let the family diverge) is exactly the per-def duplication #1011 found had shipped the identical fill/border pairing across three defs.',
      'THE THUMB IS AN `indicator` BOX THAT PARENTS A GLYPH, which #910\'s #864 rule refused until this def widened it. The widening is scoped to a `size`+`radius` disc (a deliberately-shaped filled mark), not a blanket permission — the #864 case was an SVG wrapper frame with no radius, where the fill was an incidental square. The rejected alternative was a transparent wrapper box inside the thumb to make the glyph an indirect child: it passes the literal check while reproducing the exact fill-behind-glyph #864 exists to prevent, which is a gate dodge the house discipline forbids (a false positive is narrowed with a reason, not worked around).',
      'THE STATE GLYPH IS ONE FIGMA BOOLEAN (`State icon`, default on) OVER TWO SELECTION-GATED PARTS, not a variant axis (owner, 2026-09-28). A `showStateLabel` boolean VARIANT axis would add a name to the closed `VARIANT_AXES` family vocabulary for one def AND double the member count (24 → 48). The node-visibility boolean does neither: the check and the X are each built at their own `selection` value and each carries the property, so a designer turns the glyph off once, in the panel, and the set stays at 24. The cost is a narrowing of #1331\'s refusal — a boolean may now target parts that are `presentWhen`-gated, but only when they share one axis and cover all its values, so every member still has a node to toggle.',
      'THE OFF TRACK IS A LIGHT SURFACE STEP (`background.tertiary`) WITH A DARK THUMB, not the neutral button fill (owner, 2026-09-28). The neutral button fill is the one the `neutralEmphasis` lever darkens, and under `strong` emphasis on a brand-neutral action palette it made the off and on tracks both near-black (NB master theme: #2D2C2C off, #34383D on). A surface step no interactive lever moves keeps off light in every brand; the dark thumb in the border\'s ink is Material 3\'s unselected shape and Prism 2\'s. The cost: hover and pressed do not step the off fill (no darker surface step exists, and the overlay wash replaces a fill rather than layering on it).',
      'OFF HOVER AND PRESSED SHOW NO VISIBLE CHANGE, like checkbox and radio at unchecked (owner-decided, 2026-09-28). The off fill holds its rest value — the tier has no surface step darker than `background.tertiary`, and the interactive overlay wash REPLACES a box\'s fill (one `fills` array) rather than layering on it, so a 10% wash over the page would read lighter than `tertiary`. The `off.border.hover`/`.pressed` keys stay bound and resolve to the rest border in this tier. The rejected alternative was a new darker surface role, a token mint and a CONTRACT MINOR.',
      'THE DISABLED GLYPH TAKES `disabled.border`, not the thumb\'s `disabled.on-fill` (#1764, owner-directed 2026-09-28). Both keys bound `disabled.on-fill` before, so the glyph drew in its own thumb\'s color and could not be seen — and the glyph now defaults on. `disabled.border` equals the disabled track in every corpus mode, so the glyph repeats the rest-state inversion, 3.04–5.49:1 against the thumb. `disabled.text` was measured and rejected at 1.21–1.79:1.',
    ],
    unverified: [
      'THE GLYPH IN THE THUMB IS UNVERIFIED ON A REAL HOST for legibility at its smallest size. The thumb is `control.size.*.thumb` = 0.75 × the track (Prism 2\'s 24-in-32, #1425), its own tier field rather than radio\'s `dot`. In every corpus brand the thumb is 18px at `small` and 24px at `medium`, so its ~71%-inset glyph is ~12.7px and ~17px. The smallest case is compact density `small`, a 16px track with a 12px thumb and a ~8.5px glyph. The affordance is most useful at `medium`, and the row, not the atom, is what reaches SC 2.5.8.',
      'THE THUMB IS SELECTION-KEYED — the off thumb is the dark `interactive.neutral.border.rest`, the on thumb the light `primary.on-fill`; no single ink bounds both tracks. This def adopts Prism 2\'s TREATMENT — light filled off track, bordered off state, darker handle, glyph in thumb — through semantic tokens rather than its literal values.',
      'READ-ONLY AND PENDING BIND NOTHING here and are not even states of the atom — they are the Row\'s (a lock affordance; a spinner swap). Recorded so nobody reads their absence as an oversight.',
      'THE INHERITED FOCUS-RING BINDING is now two layers deep (#1280/#1290), the same as `checkbox-control`: the ring is nested inside the track and the track inside the row, so an inherited dimension binding would have to be cleared twice. The symptom to look for: a nested ring sitting at the md control height instead of hugging the track.',
    ],
    // KB switch brief §13, the items this atom carries: the on/off affordance and the role that announces it.
    evolution: [
      'THE ON/OFF AFFORDANCE SIMPLIFIED across the field (KB switch brief §13): Material dropped its in-thumb icon emphasis, and thumb position plus track color now carry the state, with hardcoded On/Off text rejected. This atom keeps the glyph ON by default (the `State icon` boolean; `showStateLabel` in code), matching Prism 2, and treats it as a legibility aid — never the state signal.',
      '`role="switch"` MATURED from a newer role backed by checkbox fallbacks into the standard that distinguishes a switch from a checkbox in assistive tech (KB switch brief §13). The atom is presentational; the host row carries the role.',
    ],
  },
};
