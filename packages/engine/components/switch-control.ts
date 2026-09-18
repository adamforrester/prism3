/**
 * Switch.Control — the ATOMIC track-and-thumb (#1354, the #1226/#1330 mechanism a third time). The
 * painted pill, its traveling thumb, the state glyph in that thumb, and the focus ring — extracted
 * from `switch` so the labeled Row NESTS it rather than redraws it, exactly as `checkbox` nests
 * `checkbox-control`. A fix to the track (its border weight, its fill grammar) or the thumb (its
 * travel, its glyph) now propagates to the Row by single-sourcing rather than by a copy kept in step
 * by hand.
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
 * **`showStateLabel` gates it in CODE, not as a Figma variant, which is Prism 2's own model.** Prism 2's
 * `icon` prop is a boolean that is NOT crossed into the variant set — the component set ALWAYS shows the
 * glyph and the prop toggles it at build time. This def does the same: the glyph is present at every
 * projected member (so the affordance is a real, reviewable, gateable part), and `showStateLabel`
 * (default off, the Row's existing prop) gates it in the code projection. The rejected alternative was a
 * `showStateLabel` boolean VARIANT axis, which would (a) add a new name to the closed `VARIANT_AXES`
 * family vocabulary for one def, and (b) DOUBLE the member count — the exact cost `switch.ts`'s old
 * `codeOnly` named as the reason the affordance was deferred. Prism 2 declined both and so does this.
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
 * #1011, and the trap `switch.ts`'s contested note documents at length), the interactive-neutral family
 * for the off track (forced by the thumb's contrast, not chosen), the selection-keyed thumb ink, the
 * 2px load-bearing border (#1228), `radius.round`, and the `control.size.*` track/width/thumb/inset
 * bindings (#900, #951, #997, #1425). The GEOMETRY is where #1425 diverges from a verbatim extraction:
 * the switch reads its OWN tier fields (`track` height, `thumb`) rather than borrowing the square-control
 * `height`/`dot` a checkbox/radio reads — the split that scales the track to Prism 2's 32px / 24px thumb
 * proportions and clears the hit-target floor. The PAINT is still a verbatim extraction of the painted
 * surface from `switch`, the same way `checkbox-control` was of `checkbox`. The reasoning for each lives
 * in `switch.ts` history and is not restated.
 *
 * The NEW keys are the two glyph inks. Each glyph sits ON the thumb, so its ink is the INVERSE of the
 * thumb's: the off thumb is the dark `neutral.on-fill`, so `off.icon` is the light `neutral.fill.rest`
 * (the off-track color — 12.33–12.36:1, the off-thumb pairing read the other way); the on thumb is the
 * light `primary.on-fill`, so `on.icon` is the dark `primary.fill.selected` (the on-track color —
 * 6.85–9.96:1, the on-thumb pairing read the other way). Both are existing tokens whose contrast is the
 * reverse of a pairing the tier already gates, so the glyph clears its ground wherever the thumb clears
 * the track.
 */
import { ComponentDef } from '../component-schema';

export const switchControl: ComponentDef = {
  id: 'switch-control',
  name: 'Switch.Control',
  aliases: ['switch-track', 'toggle-control', 'switch-atom'],
  category: 'form',
  status: 'draft',
  description:
    'The atomic switch control — the painted pill track, its traveling thumb, the X/checkmark state glyph in that thumb, and the focus ring, and nothing else. Nested by the labeled Switch row rather than placed on its own: it carries no label, no description and no hit-target padding, so a standalone use needs an external aria-label. Carries the two-value selection axis (off / on) whose thumb POSITION is the part that varies, the off-track border that is load-bearing for WCAG 1.4.11, and the 2px control border.',

  // The atom's surface, not the field's. No `label`, no `description`, no form wiring — those are the
  // Row's. `showStateLabel` lives here because it gates a part of this atom (the thumb glyph); the Row
  // exposes it to the consumer like every other control-level control.
  props: [
    { name: 'checked', type: 'boolean', required: false, description: 'The on/off appearance. Driven by the host row — a bare Switch.Control is styled by the coordinate, not wired to state here. The flip is immediate by the Row\'s contract; this atom only renders the two positions.' },
    { name: 'showStateLabel', type: 'boolean', required: false, default: 'false', description: 'The X/checkmark-in-the-thumb affordance — a check when on, an X when off, a cue beyond track color and thumb position. OFF by default, since position already carries the state; add only where legibility genuinely demands it. Prism 2\'s own model (its `icon` prop): the glyph is present in the Figma set at every member, and this prop gates it in the code projection. NOT hardcoded "On"/"Off" text, which is rejected outright.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'TWO RUNGS, not three — "switches rarely warrant a large" (brief §15). Scales the track\'s height and length and the thumb\'s diameter. All read `control.size.*`, which moves a rung with brand density; `icon.size.*` would measure the wrong thing. The host row passes its own size through by `follow`.' },
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

  // Axis-led, most specific first — checkbox's grammar, which radio and switch inherit. `selection`
  // leads; the bare `{slot}` answers the bindings outside the grammar (`focus-ring`, `disabled.*`,
  // geometry). `lint-paint.ts` arm 1 exempts `selection` in `NON_FAMILY_AXES`.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}'],

  tokens: {
    // ── THE OFF TRACK — the INTERACTIVE-neutral family (checkbox/radio take the form-field family for
    // their empty box). Forced by the thumb: a white thumb is invisible on `color.field.fill`, so the
    // off thumb takes the DARK `interactive.neutral.on-fill`, which exists only in this family. The
    // BORDER is load-bearing, not decorative — no fill in the tier clears 3:1 against the page, this
    // border clears it at all four brands (3.20–3.28:1, WCAG 1.4.11). Full measurements: `switch.ts`.
    'off.fill': 'color.interactive.neutral.fill.rest',
    'off.fill.hover': 'color.interactive.neutral.fill.hover',
    'off.fill.pressed': 'color.interactive.neutral.fill.pressed',
    'off.border': 'color.interactive.neutral.border.rest',
    'off.border.hover': 'color.interactive.neutral.border.hover',
    'off.border.pressed': 'color.interactive.neutral.border.pressed',
    'off.border.error': 'color.border.danger',
    // The OFF thumb — dark on a light track (12.33–12.36:1). Keyed by selection because no single ink
    // bounds both tracks (best candidate is 4.36:1 off / 1.00:1 on). See `switch.ts` before merging.
    'off.indicator': 'color.interactive.neutral.on-fill',
    // The OFF glyph (the X) — the INVERSE of the off thumb's dark ink, so a light X on the dark thumb.
    // `neutral.fill.rest` is the off-track color; the off thumb clears it at 12.33:1, so the X clears
    // the thumb at the same ratio (the off-thumb pairing read the other way round).
    'off.icon': 'color.interactive.neutral.fill.rest',

    // ── THE ON TRACK — the brief's "stark track-color contrast". `on-fill` is contract-checked against
    // the fill it sits on. NO STRUCTURAL BORDER (#1011): a fill at 6.85–8.29:1 IS the boundary, so a
    // same-family border beside it can only agree invisibly or disagree visibly — the asymmetry with the
    // off track that `switch.ts`'s contested note documents as the trap not to "fix for consistency".
    'on.fill': 'color.interactive.primary.fill.selected',
    'on.fill.hover': 'color.interactive.primary.fill.hover',
    'on.fill.pressed': 'color.interactive.primary.fill.pressed',
    'on.border.error': 'color.border.danger',
    // The ON thumb — light on a dark track (6.85–9.96:1).
    'on.indicator': 'color.interactive.primary.on-fill',
    // The ON glyph (the check) — the INVERSE of the on thumb's light ink, so a dark check on the light
    // thumb. `primary.fill.selected` is the on-track color; the on thumb clears it at 6.85–9.96:1, so
    // the check clears the thumb at the same ratio (the on-thumb pairing read the other way round).
    'on.icon': 'color.interactive.primary.fill.selected',

    // ── FOCUS RING — on the TRACK, never the thumb (the thumb moves). The CONTROL ring
    // (`focus.ring.offset`), not a field's flush one. 4.56–5.88:1 against the page.
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // ── DISABLED SKIN (contrast-exempt, 1.4.3). The thumb and the glyph both sit ON the track's fill, so
    // both take the `on-fill` disabled ink the tier gates rather than the page one.
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.indicator.on-fill': 'color.disabled.on-fill',
    'disabled.icon.on-fill': 'color.disabled.on-fill',

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
        note: 'The pill AND the nominal hit-target marker (the real hit target is the whole labeled ROW, which lives on `switch`; `role: target` is here only because the schema requires exactly one per anatomy — the same nominal marker `focus-ring`\'s `ring` part and `checkbox-control`\'s `control` carry). Its two dimensions are two decisions: 2:1 is the ratio the field converges on, and it is the tier\'s.',
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
      // thumb), `disabled.icon.on-fill` when disabled.
      onGlyph: {
        kind: 'vector',
        glyph: 'check',
        size: 'size.{size}.dot',
        presentWhen: { selection: ['on'] },
        note: 'The on affordance (a check). Present in the Figma set at `selection=on`; `showStateLabel` (the Row\'s prop, default off) gates it in the code projection, Prism 2\'s `icon`-prop model. Never the sole state signal — thumb position already carries it.',
      },
      // THE OFF GLYPH — an X (`close`), present only at `selection=off`. Same geometry as the check; only
      // the outline differs. Its ink is `off.icon` (a light X on the dark off thumb).
      offGlyph: {
        kind: 'vector',
        glyph: 'close',
        size: 'size.{size}.dot',
        presentWhen: { selection: ['off'] },
        note: 'The off affordance (an X). Present in the Figma set at `selection=off`; `showStateLabel` gates it in code. The `close` glyph is the X Prism 2 ships as `closeLine`.',
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
      'THE THUMB\'S TRAVEL AS MOTION. `positionWhen` states WHERE the thumb is at each coordinate; the ~150–200ms ease-in-out slide between them (with the track-color crossfade, collapsing to 0ms under prefers-reduced-motion) is the animation the component is most recognized by and has no expression in this schema.',
      'THE STATE GLYPH\'S VISIBILITY TOGGLE. The glyph is present in the Figma set at every member (Prism 2\'s set does the same); `showStateLabel` (the Row\'s prop, default off) gates it in the CODE projection. A def schema has no "present when a boolean prop is true, without a variant axis" mechanism short of doubling the set, so the projected set shows the on-appearance and the prop carries the default-off in code.',
      'THE GLYPH\'S OWN MICRO-MOTION — the check/X draw and the cross-fade onto the thumb on an async toggle. Neither the def schema nor a Figma variant carries motion, so the glyphs are static outlines at every coordinate.',
      'THE WHOLE-ROW HIT TARGET. A bare track is a 16–36px pill that fails SC 2.5.8 in isolation; the accessible target is the labeled ROW, which is `switch` and not this atom. This def is nested, never placed alone, precisely so the target is supplied one level up.',
    ],
  },

  figmaProperties: {
    // BOTH axes; `selection` is NOT optional — the thumb's `positionWhen` and the two glyphs' `presentWhen`
    // are keyed on it, so an unprojected `selection` would build every member with the thumb at the
    // track's declared `justify` and no glyph. 2 selections × 2 sizes × 6 states = 24 members.
    variantAxes: ['selection', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'error'] },
    // No `texts` (no text part), no `swaps` (the thumb is geometry this def owns), no `slotAxes` (the
    // glyphs are gated by a coordinate, which is what `presentWhen` draws — and `showStateLabel` is a
    // code-gate, not a projectable slot axis: `figmaAnatomySet` projects only `leading`/`trailing`).
    booleans: {},
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
    labelPattern: 'None — the atom carries no label. The setting name and its rules live on the Switch row (`switch`).',
    errorPattern: 'None of its own — an outcome-error boundary is a color treatment the host coordinate selects; the message is the Row\'s.',
  },

  docs: {
    usage: 'Do not place this on its own. It is the track-and-thumb a Switch row nests, so a fix to its border weight or its fill grammar reaches the row without being copied. Build it before the row that nests it (the nest resolves by name against the live file). A standalone use is only for a control with an external label and its own aria wiring.',
    do: [
      'Nest this from the Switch row rather than redrawing the track per host',
      'Let the host row pass `selection`, `state` and `showStateLabel` through, and `follow` its size, so the nested control tracks the row',
      'Let thumb POSITION carry the state; treat the glyph as a legibility aid, not the color-independence answer',
      'Supply an external aria-label only when using the control genuinely alone',
    ],
    dont: [
      'Place a bare track as the clickable element — it fails SC 2.5.8 in isolation; the labeled row is the hit target',
      'Double-label a nested control — the host row already provides the accessible name',
      'Put the focus ring on the thumb — it moves, so the indicator would travel with it',
      'Hardcode "On"/"Off" text beside the control — the glyph affordance and the role announcement carry it',
    ],
    contentGuidelines: 'The atom has no copy of its own; all label, description and error text belongs to the row that composes it.',
  },

  ai: {
    primaryPurpose: 'Render the atomic switch control — the painted pill, its traveling thumb, the X/checkmark state glyph and the focus ring — for a host row to nest.',
    whenToUse: 'Nested by the labeled Switch row (the common case), or standalone only for a control with an external label and its own aria wiring.',
    avoidWhen: 'You want the labeled case (that is Switch), a staged binary submitted with a form (Checkbox / Checkbox.Control), or a mutually-exclusive one-of-many (Radio). Never place a bare track as the clickable element — the hit target is the labeled row.',
    commonPartners: ['switch-row', 'focus-ring'],
    triggerKeywords: ['switch control', 'switch track', 'toggle control', 'switch thumb', 'toggle handle'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: ['checkbox-control', 'radio-control'],
    supersedes: [
      'the painted track and thumb inlined in a switch row',
    ],
    supersededBy: [],
  },

  notes: {
    contested: [
      'THE ATOM IS A SEPARATE COMPONENT rather than kept inline in the row, and the #1354 precondition made it earn that: the split was built ONLY after confirming the switch Row nests it (the composition check), which it does — the switch was already a row containing a control subtree, the shape checkbox had before #1226. The rejected alternative (keep the track inline and let the family diverge) is exactly the per-def duplication #1011 found had shipped the identical fill/border pairing across three defs.',
      'THE THUMB IS AN `indicator` BOX THAT PARENTS A GLYPH, which #910\'s #864 rule refused until this def widened it. The widening is scoped to a `size`+`radius` disc (a deliberately-shaped filled mark), not a blanket permission — the #864 case was an SVG wrapper frame with no radius, where the fill was an incidental square. The rejected alternative was a transparent wrapper box inside the thumb to make the glyph an indirect child: it passes the literal check while reproducing the exact fill-behind-glyph #864 exists to prevent, which is a gate dodge the house discipline forbids (a false positive is narrowed with a reason, not worked around).',
      'THE STATE GLYPH IS SELECTION-GATED AND PRESENT AT EVERY MEMBER, with `showStateLabel` gating it in code rather than as a variant axis. The alternative — a `showStateLabel` boolean variant axis — honors the default-off in the Figma set itself but adds a name to the closed `VARIANT_AXES` family vocabulary for one def AND doubles the member count (24 → 48), the cost `switch.ts`\'s old `codeOnly` named as the reason the affordance was deferred. Prism 2\'s `icon` prop is not a set variant either. The cost of this choice is real and stated: a designer cannot pick "no glyph" in the Figma set, only in code.',
    ],
    unverified: [
      'THE GLYPH IN THE THUMB IS STILL UNBUILT, but #1425 made it far more likely to read. The thumb is now `control.size.*.thumb` = 0.75 × the track (Prism 2\'s 24-in-32), its OWN tier field rather than radio\'s `dot` — the split this note previously called out as the blocker ("Prism 2\'s 0.75 thumb would mean splitting the tier field per consumer") is done. At `medium` the thumb is 24px (18 on aurora) and its ~71%-inset glyph ~17px; the smallest case is compact `small` at a 12px thumb / ~8.5px glyph, up from the old 8px thumb / ~5.7px glyph. The affordance is most useful at `medium`, and the row\'s own min-height (not the atom) is still what reaches SC 2.5.8.',
      'THE OFF TRACK TAKES THE INTERACTIVE-NEUTRAL FAMILY and the thumb is SELECTION-KEYED — both forced by the thumb\'s contrast rather than chosen, both measured in `switch.ts`. Prism 2\'s own off track is a dark slab (#000000) where this is a light neutral fill; that divergence is the token engine doing its job (Prism 2\'s hex is one brand in one mode, and a hardcoded dark off-track would break light mode), so this def adopts Prism 2\'s TREATMENT — filled track, bordered off state, glyph in thumb — through semantic tokens rather than its literal values.',
      'READ-ONLY AND PENDING BIND NOTHING here and are not even states of the atom — they are the Row\'s (a lock affordance; a spinner swap). Recorded so nobody reads their absence as an oversight.',
      'THE INHERITED FOCUS-RING BINDING is now two layers deep (#1280/#1290), the same as `checkbox-control`: the ring is nested inside the track and the track inside the row, so an inherited dimension binding would have to be cleared twice. The symptom to look for: a nested ring sitting at the md control height instead of hugging the track.',
    ],
  },
};
