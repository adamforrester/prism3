/**
 * Radio.Control — the ATOMIC disc (#1348, the #1226/#1330 mechanism a fourth time). The painted circle,
 * its inner selection dot and its focus ring, extracted from `radio` so the labelled Row can NEST it
 * rather than redraw it — exactly as `checkbox` nests `checkbox-control` and `switch` nests
 * `switch-control`. A fix to this disc — its border weight (#1228), its round radius, its dot geometry
 * (#910) — now propagates to the Row by single-sourcing rather than by a copy kept in step by hand.
 *
 * ── THE COMPOSITION CHECK #1348 REQUIRED, ANSWERED FROM THE REGISTRY ───────────────────────────────
 *
 * The owner's precondition (2026-09-10): build the nest-exposed split ONLY if something actually NESTS a
 * radio-control. Measured the same way `checkbox-control` and `switch-control` were: the radio was
 * ALREADY a row that contains a control subtree (`row → controlBox → control → {dot, focusRing}`), the
 * identical shape checkbox had before #1226 and switch had before #1354. So the split produces a genuine
 * nester — the radio Row nests ONE `radio-control` in flow, `nest-exposed`, exactly as its two siblings
 * do. The composition check PASSES: this atom has a consumer (the Row), and the family stays uniform
 * (checkbox splits, switch splits, radio splits). The Row is the OPTION; the RadioGroup remains a
 * separate unbuilt component (#901) and is NOT this def.
 *
 * ── THE PRISM 2 VISUAL — CONSTANT BORDER, INNER CIRCLE ON SELECT (#1348 point 2) ────────────────────
 *
 * This is the one place radio's decomposition is NOT a verbatim extraction of the pre-split box: the
 * owner adopted the Prism 2 visual, which is a genuine change of treatment from what `radio` shipped.
 *
 * The pre-split radio painted checkbox's treatment at a round radius — a FILLED disc
 * (`checked.fill → interactive.primary.fill.selected`) with an on-fill dot. Selection was carried by the
 * disc filling in, which reads as the ring's border thickening into a solid circle. The owner's decision
 * names that as the defect ("today the border width changes on select") and the Prism 2 fix
 * (`reference/Prism2/component-specs/radio-button.json`):
 *
 *   · **The outer ring's border WEIGHT stays constant across states** — the 2px `radioBase` stroke, the
 *     same at unchecked and checked. No fill at either selection: an empty radio is a ring on the page
 *     and a selected one is the SAME-weight ring with a dot inside it, not a filled disc.
 *   · **Selection shows an INNER FILLED CIRCLE** inside the ring — Prism 2's `checkboxBlankCircleFill`,
 *     a 12px disc on a 20px ring. That inner circle is a selection affordance; the border does not
 *     THICKEN to become the cue.
 *   · **The ring RECOLORS on select (#1423)** — Prism 2's radio is a NEUTRAL gray ring when unchecked
 *     (`selected=false` → #82899D) and a BRAND ring when checked (`selected=true` → #1E1EFF, darkening on
 *     hover/press). So `checked.border` binds the INTERACTIVE family (`color.interactive.primary.border.*`,
 *     per-state) while `unchecked.border` keeps the neutral `color.field.border.*`. The weight is constant;
 *     the COLOR is not, exactly as Prism 2 ships it.
 *
 * So `checked` adds two things over `unchecked` — the inner dot, and the ring going brand-colored — at a
 * constant 2px weight. This is the #1423 correction: the decomposed def originally bound `field.border.*`
 * at BOTH selections (a fully constant-color ring), which left a selected radio's ring gray instead of
 * brand, unlike Prism 2. The mutation gate asserts the recolor by name — `checked.border.*` EQUALS the
 * interactive role and is NOT `field.border` (`test.ts` #1423) — and that the border WEIGHT is a single
 * constant key across selection (`test.ts` #1348, retained).
 *
 * THE DOT NOW SITS ON THE PAGE, WHICH IS THE ONE CONTRAST CONSEQUENCE. The pre-split dot sat on the
 * disc's fill, so its ink was `on-fill` (gated against the fill) and its disabled ink `disabled.indicator.on-fill`.
 * With no fill, the dot sits on the PAGE, so its ink is `interactive.primary.fill.selected` — the same
 * brand token the old filled disc used, measured 4.94–14.17:1 against the page corpus-wide, so it clears
 * SC 1.4.11's 3:1 non-text floor everywhere AS A DOT the same way it did as a disc. Its disabled ink is
 * the page form `disabled.indicator` (`color.disabled.fill`), which the projector reaches on its own:
 * `paintOf`'s disabled branch asks for the `on-fill` form only when a fill is bound at rest (`restKey('fill')`),
 * and this atom binds no fill, so the plain `disabled.indicator` is what resolves.
 *
 * The brand-ring recolor on select (the ring goes brand-colored when checked, keeping the dot) is now the
 * ADOPTED model (#1423), matching Prism 2 literally. It was originally the named ALTERNATIVE in
 * `notes.contested` and the pre-#1423 def shipped the fully-constant-color ring instead; the owner's QA of
 * the 2026-09-15 Figma import found that left a selected radio's ring gray where Prism 2's is brand, and
 * triaged the rebind decision-free (Prism 2 is the oracle). It is a rebind of the `checked.border.*` keys,
 * not a restructure. A brand that wants the fully-constant-color ring back rebinds those three keys to
 * `field.border.*`; that is the fork now, recorded in `notes.contested`.
 *
 * ── THE DOT IS A BOX, NOT A GLYPH, AND THAT IS #900's ONE FINDING THAT SURVIVES THE SPLIT ───────────
 *
 * The control CIRCLE is bound `control.size.*.height`, one key on both axes, round by `radius.round` —
 * `checkbox-control`'s box binding with a round corner. The DOT is where radio departs from checkbox: a
 * checkbox mark is a `vector` sized full-bleed (a glyph carries its optical inset in its own artboard),
 * but a radio's dot is a filled `box` with no artboard, so full-bleed would make the dot BE the disc.
 * `control.size.*.dot` (half the box edge, #910) is the dot's own key. The dot is an `indicator` box that
 * DRAWS ITSELF and has no children, so #864's fill-behind-a-glyph refusal never applies (there is no
 * glyph behind it) — this def touches none of the #1354 indicator-rule widening that `switch-control`'s
 * glyph-carrying thumb needed. `indicator`, not `fill`: the ring's `control` box already owns the border
 * grammar and #933's rule is one box per slot, so the dot takes its own slot, as it did before the split.
 *
 * ── THE CIRCULAR FOCUS RING IS ALREADY DERIVED, NOT RE-DERIVED HERE (#1348 point 3, F2 / #1388) ──────
 *
 * F2 (#1388) made the focus ring CONCENTRIC: a ring positioned at `-inset` and sized `host + 2×inset`
 * takes corner radius `hostRadius + inset`, read off the host node at paste. `version.ts` states the
 * three cases of that one derivation, and the middle one is this def exactly: "a full-round host (radio,
 * radius ≥ half its side) → `host + inset ≥ ringSide/2`, which Figma clamps to the ring's own half-side
 * so a circle stays a circle." This atom's `control` binds `radius: 'radius' → radius.round`, so it IS a
 * full-round host and the ring it nests comes out CIRCULAR by construction — verified, not re-derived.
 * `test.ts` #1348 confirms the full-round-host condition on this def; the #1388 execution block already
 * gates the full-round-host → circular-ring derivation generically.
 *
 * ── THE PAINT GRAMMAR, GEOMETRY AND THE `selection` EXEMPTION ARE `radio`'s, EXTRACTED ──────────────
 *
 * Axis-led (`{selection}.{slot}.{state}` first), the `selection` exemption in `lint-paint.ts`'s
 * `NON_FAMILY_AXES`, the 2px load-bearing border (#1228), `radius.round`, and the `control.size.*`
 * height/dot bindings (#900, #910). None of that is redesigned — it is the verbatim extraction of the
 * painted surface from `radio`, the way `checkbox-control` and `switch-control` were of their rows. What
 * CHANGED is the treatment (outlined ring + page dot, above), not the grammar.
 */
import { ComponentDef } from '../component-schema';

export const radioControl: ComponentDef = {
  id: 'radio-control',
  name: 'Radio.Control',
  aliases: ['radio-circle', 'radio-disc', 'radio-atom'],
  category: 'form',
  status: 'draft',
  description:
    'The atomic radio control — the painted circle with its inner selection dot and its focus ring, and nothing else. Nested by the labelled Radio row rather than placed on its own: it carries no label, no description and no hit-target padding, so a standalone use needs an external aria-label. Adopts the Prism 2 visual: a constant-weight outlined ring (no fill) at both selections that RECOLORS on select — a neutral edge when unchecked, the interactive brand edge when checked — with an inner filled circle also appearing on select, never a filled disc. Carries the two-value selection axis (unchecked / checked) whose dot is a real part gated on the coordinate, and the 2px control border.',

  // The atom's surface, not the field's. No `label`, no `description`, no form wiring — those are the
  // Row's and the Group's. What it exposes is the visual state a host drives through the nest.
  props: [
    { name: 'checked', type: 'boolean', required: false, description: 'The selected appearance — the inner dot present. Driven by the host row from the group\'s scalar value — a bare Radio.Control is styled by the coordinate, not wired to state here, and never holds a boolean of its own (selection is `group.value === option.value`).' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales the control circle (both axes from one key, round by construction) and the inner dot. Both read `control.size.*`, which moves a rung with brand density; `icon.size.*` would resolve and measure the wrong thing (the glyph artboard ladder). The host row passes its own size through by `follow`, so the nested control tracks the row.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'The disabled skin — a contrast-exempt border/dot treatment. Set on the host, followed here.' },
    { name: 'aria-label', type: 'string', required: false, description: 'Required only for a genuinely standalone control with no host row to name it — the Row provides the accessible name, so a nested control must NOT double-label.' },
  ],

  // The six that paint. `read-only` is a field/row-level concern (the Row/Group decide it, and a radio
  // has no working native readonly), so the atom carries no read-only treatment and does not list the
  // state — exactly as `checkbox-control` drops it.
  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'error'],

  // `size` and `selection` — the two the disc actually varies by. `[unchecked, checked]` is checkbox's
  // vocabulary minus `indeterminate` (a mutually-exclusive choice has no partial state). No tone/emphasis,
  // no surface/inverse axis (#871).
  variants: {
    size: ['small', 'medium', 'large'],
    selection: ['unchecked', 'checked'],
  },

  // Axis-led, most specific first — checkbox's grammar, which radio and switch inherit. `selection`
  // leads; the bare `{slot}` answers the bindings outside the grammar (`focus-ring`, `disabled.*`,
  // geometry). `lint-paint.ts` arm 1 exempts `selection` in `NON_FAMILY_AXES`.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}'],

  tokens: {
    // ── THE OUTLINED RING — CONSTANT IN WEIGHT (2px, both selections), but RECOLORED ON SELECT, which is
    // Prism 2's radio literally (#1423). NO FILL at either selection (#1011): an empty radio is a ring on
    // the page and a selected one is the SAME-weight ring with a dot inside it, never a filled disc.
    //
    //   · UNCHECKED — the form-field substrate's neutral chrome: `color.field.border.*` (rest + hover only;
    //     the family emits no pressed rung, so pressed falls through to rest). This is Prism 2's `selected=false`
    //     ring, a static neutral edge (#82899D in the spec).
    //   · CHECKED — the INTERACTIVE brand edge: `color.interactive.primary.border.*`, per-state (rest, hover,
    //     pressed). This is Prism 2's `selected=true` ring — brand blue at rest (#1E1EFF), darkening on
    //     hover (#0812C3) and press (#090A83). The pre-#1423 def bound `field.border.*` here too, so a
    //     selected radio's ring stayed gray instead of going brand (the QA finding). The interactive border
    //     is contracted against the page at `nonTextMin` (modes.ts `iBorder`, rated to clear it), so the
    //     recolored ring keeps a live ≥3 SC 1.4.11 contract in every mode.
    //
    // So selection now moves BOTH the inner dot AND the ring's COLOR (its weight stays constant). `test.ts`
    // #1423 asserts by name that `checked.border.*` EQUALS the interactive role and is NOT `field.border`,
    // and that the recolored ring clears 3:1 across the corpus × every mode.
    'unchecked.border': 'color.field.border.rest',
    'unchecked.border.hover': 'color.field.border.hover',
    'unchecked.border.error': 'color.border.danger',
    'checked.border': 'color.interactive.primary.border.rest',
    'checked.border.hover': 'color.interactive.primary.border.hover',
    'checked.border.pressed': 'color.interactive.primary.border.pressed',
    'checked.border.error': 'color.border.danger',

    // ── THE INNER DOT — the selection affordance, present only at `checked`, painted the brand fill
    // AGAINST THE PAGE. `interactive.primary.fill.selected` is the token the pre-split filled disc used;
    // as a dot on the page (the ring is unfilled) it clears SC 1.4.11's 3:1 non-text floor the same way
    // it did as a disc — 4.94–14.17:1 corpus-wide. In the `indicator` slot, NOT `icon`: the dot IS the
    // drawn shape (a filled box, no glyph), and #933's rule is one box per slot (`control` owns the
    // border grammar). ONE value, no per-state ladder: the hover/pressed affordance is the RING stroke
    // darkening (`field.border.hover`), not the dot — Prism 2 varies the ring, not the inner circle, and
    // the pre-split radio's dot was a single value too.
    'checked.indicator': 'color.interactive.primary.fill.selected',

    // ── FOCUS RING — the CONTROL ring (`focus.ring.offset`), not the field's flush one. Bound, not
    // authored: the ring is a separate def reached through the `focusRing` part's `nests`. F2 (#1388)
    // makes it CONCENTRIC, and a full-round host (this disc, `radius.round`) yields a CIRCULAR ring by
    // construction — see the header (#1348 point 3, verified not re-derived).
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // ── DISABLED SKIN (contrast-exempt). No `disabled.fill`: the ring has no fill to disable. The dot
    // takes the PAGE form `disabled.indicator` (not `disabled.indicator.on-fill`), because with no fill
    // bound the projector's disabled branch reaches the plain key — the dot sits on the page now.
    'disabled.border': 'color.disabled.border',
    'disabled.indicator': 'color.disabled.fill',

    // ── GEOMETRY. `radius.round` gives the round disc (and the round dot). Resolving to `dimension.128`,
    // the token switch's pill and radio's circle share — a circle and a pill are both "round as the
    // shape allows".
    'radius': 'radius.round',
    // The 2px load-bearing border (#1228), the weight it is measured at and CONSTANT across selection
    // (#1348). Prism 2 ships this disc at strokeWeight 2. See `checkbox.ts` for the inside-stroke
    // clearance note; do not re-argue it here.
    'border-width': 'border-width.thick',

    // ── THE CONTROL CIRCLE. ONE key on BOTH axes, so the control is round-able by construction rather
    // than by two values that happen to agree. `control.size.*.height` and NOT `icon.size.*`: the control
    // ladder shifts a rung with brand density (12/16/20 on aurora) where the glyph grid is fixed
    // 16/20/24 in every brand.
    'size.small.control': 'control.size.sm.height',
    'size.medium.control': 'control.size.md.height',
    'size.large.control': 'control.size.lg.height',

    // ── THE INNER DOT'S DIAMETER (#910), half the box edge — 8/10/12 on nb, wendys and harbor, 6/8/10 on
    // aurora, so it tracks brand density exactly as the box it sits in does. Its own key rather than the
    // control's, because a filled box has no artboard to carry an optical inset (full-bleed would draw
    // the whole disc).
    'size.small.dot': 'control.size.sm.dot',
    'size.medium.dot': 'control.size.md.dot',
    'size.large.dot': 'control.size.lg.dot',
  },

  // ── ANATOMY ────────────────────────────────────────────────────────────────────────────────────
  //
  // The atom is one painted ring and its inner dot, rooted at `control`. The dot is a `box` gated by
  // `presentWhen` on the selection coordinate (`unchecked` draws no mark); the focus ring is an absolute
  // sibling nesting the shared `focus-ring` component, unchanged from before the split. `control` carries
  // a NOMINAL `role: 'target'` — the schema requires exactly one per anatomy and the whole ROW is the real
  // hit target (SC 2.5.8), which lives on `radio`. The same nominal marker `checkbox-control`'s `control`
  // and `focus-ring`'s `ring` carry; nothing downstream reads `role` for paint since #933.
  anatomy: {
    root: 'control',
    parts: {
      // THE PAINTED RING and the nominal target (see above). FIXED on both axes because `size` binds one
      // variable to width and height; a hugging box would collapse around the dot. `radius` resolves to
      // `radius.round`, the geometric difference from checkbox and the whole visual distinction between the
      // two controls. `paintSlots: ['border']` only — the ring has no fill in the Prism 2 model (#1348).
      control: {
        kind: 'box',
        role: 'target',
        paintSlots: ['border'],
        size: 'size.{size}.control',
        radius: 'radius',
        // 2px, from the token — see `border-width` in `tokens`. Names the def's own key, not the token.
        strokeWidth: 'border-width',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['dot', 'focusRing'],
        note: 'The outlined ring AND the nominal hit-target marker. The real hit target is the whole labelled ROW, which lives on `radio`; this circle is not independently clickable. `role: target` is here only because the schema requires exactly one per anatomy — the same nominal marker `checkbox-control`\'s `control` carries. No fill: the Prism 2 visual is a constant-WEIGHT outlined ring at both selections that RECOLORS on select — neutral `field.border.*` when unchecked, the interactive brand edge `interactive.primary.border.*` when checked — with the inner dot as an additional selection cue (#1348, #1423).',
      },
      // THE INNER DOT. A `box`, not a `vector`, and sized from its OWN key rather than the control's — a
      // filled shape has no artboard to carry an optical inset, so full-bleed would draw the disc rather
      // than a dot inside it. FIXED on both axes for the control's reason. `radius` is the same round
      // binding, which at a square box of any size is a circle. Present only at `checked` — an unchecked
      // radio draws no mark — so it is gated, `presentWhen: { selection: ['checked'] }`.
      dot: {
        kind: 'box',
        role: 'presentation',
        // `indicator`, NOT `fill` — `control` owns the border grammar, and #933's rule is one box per
        // slot. The dot has no children (it IS the drawn shape), so #864's fill-behind-a-glyph refusal
        // never applies and none of the #1354 indicator-rule widening is touched here.
        paintSlots: ['indicator'],
        size: 'size.{size}.dot',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        presentWhen: { selection: ['checked'] },
        note: 'The inner circle, present only at `checked` — an unchecked radio draws no mark, so this is a gated part rather than a recolored one. Its ink is `checked.indicator` (the brand fill, on the PAGE, since the ring is unfilled), and at `disabled` the page form `disabled.indicator`. Its select micro-motion — a spring scale-up, and a sibling\'s dot animating OUT — has no expression in this schema (see `notes.unverified`).',
      },
      // The ring, on the CONTROL: `focus.ring.offset` (2) is the control offset rather than the field's
      // flush `offset-field` (0). The two insets SUM in the executor, siting the ring at -(2+2) = -4, so
      // the visible gap is a full 2px (#801). F2 (#1388) makes it concentric: a full-round host yields a
      // circular ring (see the header, #1348 point 3).
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        // FIXED at `surface=default` (#1134): this def has no `surface` axis of its own, so there is no
        // host coordinate to pass through. A `follow` here would be rejected — it names a host axis and
        // this def declares none.
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring` component, inset from the CONTROL so the ring surrounds the circle. F2 (#1388) derives its radius concentrically off the host, so a full-round host yields a circular ring — verified, not re-derived (#1348).',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word (#563).
      'read-only — deliberately not a state of this atom. A radio has no working native readonly, so there is no treatment to project; the field/row/group decides it. The Row admits it in its own `codeOnly`.',
      'The select micro-motion (a spring/scale-up of the dot at roughly 100-150ms, and — uniquely — a SIBLING\'s dot animating OUT, the only exit animation a radio has, since it can never be deselected on its own). Neither the def schema nor a Figma variant carries motion, so the dot is static at every coordinate.',
      'The whole-row hit target. A bare control circle is a 12-24px disc that fails SC 2.5.8 in isolation; the accessible target is the labelled ROW, which is `radio` and not this atom. This def is nested, never placed alone, precisely so the target is supplied one level up.',
    ],
  },

  figmaProperties: {
    // BOTH axes; `selection` is not optional — `presentWhen` gates the dot on it, so an unprojected
    // `selection` would make the dot absent from every member. 2 selections × 3 sizes × 6 states = 36
    // members, checkbox-control's 54 less the `indeterminate` column radio does not have.
    variantAxes: ['selection', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'error'] },
    // No `texts` (no text part), no `swaps` (the dot is geometry this def owns), no `slotAxes` (the dot is
    // gated by a COORDINATE, which is what `presentWhen` draws).
    booleans: {},
  },

  accessibility: {
    role: 'The visual control only — the accessible radio role, name and aria-checked belong to the host input the Row wires, and the exclusivity and roving-tabindex keyboard model to the RadioGroup. A standalone use must supply role and name itself.',
    wcag: [
      '1.4.11 Non-text Contrast (the ring border, and the inner dot against the page)',
      '2.4.13 Focus Appearance (the nested focus ring, offset, at least 3:1 — circular for this round host, F2/#1388)',
      '4.1.2 Name Role Value (carried by the host; this atom is presentational when nested)',
    ],
    keyboard: 'None of its own — the atom is not a tab stop. Focus, Space-to-select and the group\'s roving tabindex / arrow navigation belong to the host input and the RadioGroup; the ring here renders the host\'s `:focus-visible` state.',
    focus: 'The nested focus ring surrounds the circle on `:focus-visible`, offset so an unbroken sliver of background separates the ring from the control\'s own border (WCAG 1.4.11). Circular, because the host is full-round (F2/#1388). Keyboard traversal only.',
    aria: 'When nested in a host row, the host provides the accessible name through `aria-labelledby` — never double-label. The role is `radio`; a lone radio announces "radio button, 1 of N" with no indication of what is being chosen, which is why the GROUP label is mandatory and lives on the RadioGroup, not here.',
  },

  content: {
    labelPattern: 'None — the atom carries no label. The option label and its rules live on the Radio row (`radio`); the decision it belongs to lives on the RadioGroup.',
    errorPattern: 'None of its own — an error boundary is a color treatment the host coordinate selects, and radio error is GROUP-level only, never per-option; the message is the group\'s.',
  },

  docs: {
    usage: 'Do not place this on its own. It is the circle a Radio row nests, so a fix to its border weight or its dot geometry reaches the row without being copied. Build it before the row that nests it (the nest resolves by name against the live file). A standalone use is only for a control with an external label and its own aria wiring.',
    do: [
      'Nest this from the Radio row rather than redrawing the circle per host',
      'Let the host row pass `selection` and `state` through, and `follow` its size, so the nested control tracks the row',
      'Let the inner circle and the ring recolor carry the selection; the ring border stays constant in WEIGHT across states, going brand-colored (not thicker) on select',
      'Supply an external aria-label only when using the control genuinely alone',
    ],
    dont: [
      'Place a bare circle as the clickable element — it fails SC 2.5.8 in isolation; the labelled row is the hit target',
      'Double-label a nested control — the host row already provides the accessible name',
      'Fill the disc on select — the Prism 2 visual keeps the ring outlined and shows an inner circle instead',
      'Thicken the border to signal selection — the border WEIGHT is constant across states; selection recolors the ring to brand and adds the inner dot',
    ],
    contentGuidelines: 'The atom has no copy of its own; all label, description and error text belongs to the row and the group that compose it.',
  },

  ai: {
    primaryPurpose: 'Render the atomic radio control — the outlined circle, its inner selection dot and its focus ring — for a host row to nest.',
    whenToUse: 'Nested by the labelled Radio row (the common case), or standalone only for a control with an external label and its own aria wiring.',
    avoidWhen: 'You want the labelled case (that is Radio), a staged binary opt-in (Checkbox / Checkbox.Control), or an immediate-effect toggle (Switch / Switch.Control). Never place a bare circle as the clickable element — the hit target is the labelled row.',
    commonPartners: ['radio', 'focus-ring'],
    triggerKeywords: ['radio control', 'radio circle', 'radio disc', 'radio dot', 'option control'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: ['checkbox-control', 'switch-control'],
    supersedes: [
      'the painted circle and dot inlined in a radio row',
      'a filled-disc radio that signals selection by the ring filling in',
    ],
    supersededBy: [],
  },

  notes: {
    contested: [
      'THE ATOM IS A SEPARATE COMPONENT rather than kept inline in the row, and the #1348 precondition made it earn that: the split was built ONLY after confirming the radio Row nests it (the composition check), which it does — the radio was already a row containing a control subtree, the shape checkbox had before #1226 and switch before #1354. The rejected alternative (keep the disc inline and let the family diverge) is exactly the per-def duplication #1011 found had shipped the identical fill/border pairing across three defs.',
      'THE PRISM 2 VISUAL — a constant-weight outlined ring with an inner circle on select — REPLACES the pre-split filled disc (checkbox\'s treatment at a round radius), on the owner\'s decision (#1348, 2026-09-10). The pre-split radio\'s own `notes.contested` argued filled WON over the outlined model on two grounds (one visual family with checkbox, and `on-fill` being a gated pairing); the owner reversed that in favor of matching Prism 2, whose radio is an outlined ring plus `checkboxBlankCircleFill`. Filled is no longer the fork — it is superseded. What made the reversal clean rather than a new contrast problem: the dot now sits on the PAGE (the ring is unfilled), and `interactive.primary.fill.selected` clears 3:1 against the page as a dot exactly as it did as a disc, so no pairing that was gated stops being gated.',
      'THE RING RECOLORS ON SELECT — `checked.border.*` binds the INTERACTIVE family (`color.interactive.primary.border.{rest,hover,pressed}`) while `unchecked.border.*` keeps the neutral `field.border.*`, so selection moves the ring\'s COLOR as well as adding the dot. Its WEIGHT is still constant (one 2px key across selection). This is the #1423 correction, and the direction reversed since #1348: the decomposed def originally bound `field.border.*` at BOTH selections (a fully-constant-color ring) on the reading that "the ring stays constant" meant color too, with the brand-ring recolor named as the ALTERNATIVE. The owner\'s QA of the 2026-09-15 Figma import found that left a selected radio\'s ring gray where Prism 2 ships it brand (spec: unchecked #82899D, checked #1E1EFF/#0812C3/#090A83), and triaged the recolor decision-free — Prism 2 is the oracle. THE NAMED ALTERNATIVE is now the reverse: a fully-constant-color ring (both selections on `field.border.*`), a rebind of the three `checked.border.*` keys back, for a brand that wants the ring to hold neutral through selection. Revisit if a brand wants that constant-color skin.',
      'THE PAINT GRAMMAR IS AXIS-LED, inherited from `checkbox` rather than re-decided, and the exemption that makes it legal is declared once per AXIS in `lint-paint.ts` (`NON_FAMILY_AXES`). Recorded here only so this def is not read as a second independent vote: the family shares one grammar and one exemption. What is genuinely open is not the grammar but its cost — arm 1 does not check a non-family axis at all (#916).',
    ],
    unverified: [
      'THE DECOMPOSITION IS UNVERIFIED ON A REAL HOST, the same way `checkbox-control`\'s and `switch-control`\'s were: the nested control instance must pin its own SQUARE (the control edge) rather than stretch to the `control-box` line box, and whether the instance\'s inherited sizing mode cooperates with the row\'s auto-layout is a real-host question the offline shim cannot answer. The symptom to look for: a control instance stretched to the line-box height instead of centered within it. Radio\'s control is SQUARE, so the Row pins via `size` (both axes from one key), the same as checkbox — a wider pin than switch\'s height-only.',
      'THE INNER DOT AT `small` IS UNBUILT AND MAY NOT READ — the dot is half the control edge by the tier\'s construction, so at `small` it is 8px (6 on aurora). Whether a 6px filled circle reads as a selection dot at all is exactly what building one answers. The affordance is most useful at `medium`, and the row\'s own min-height is what has to reach SC 2.5.8.',
      'THE CIRCULAR FOCUS RING IS DERIVED, NOT RE-DERIVED HERE (#1348 point 3). F2 (#1388) made the ring concentric, and a full-round host (this disc, `radius.round`) yields a circular ring by construction — `version.ts` names radio as the middle of its three derivation cases. This def CONFIRMS the full-round-host condition (`test.ts` #1348); the #1388 execution block gates the derivation itself. What is unverified is the same real-host question F2 left open, now one nest deeper: the ring is nested inside the control and the control inside the row, so an inherited dimension binding would have to be cleared twice, the same as `checkbox-control` (#1280/#1290).',
      'THE PRESSED LADDER IS ASYMMETRIC ACROSS SELECTION, and that is faithful to Prism 2 (#1423). The CHECKED ring binds `pressed` (`interactive.primary.border.pressed`, #090A83 in the spec — a distinct Active color), because the interactive family emits a pressed rung and Prism 2 darkens the selected ring under press. The UNCHECKED ring has NO `pressed` binding: `color.field.border.*` emits `rest` and `hover` only, so pressed falls through to rest — matching Prism 2, whose `selected=false` ring is a static neutral edge with no Active override. The inner DOT paints one value with no per-state ladder (`checked.indicator`), so under press it is the CHECKED ring that tracks the interactive ladder while the dot and the unchecked ring hold still.',
      '`RadioGroup` is a separate component with no def (#901), and it is MANDATORY rather than optional: the shared `name`, the single scalar value, the roving-tabindex single tab stop, `orientation`, and all validation live there, and none of it is expressible from this atom or from the Row. This def is the OPTION\'s painted control only.',
    ],
  },
};
