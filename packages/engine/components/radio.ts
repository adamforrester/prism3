/**
 * Radio — the checkbox decomposition with ONE STRUCTURAL MUTATION (KB `components/radio.md`,
 * `docs/40` §7). A control for choosing exactly one from a small set of mutually exclusive,
 * all-visible options.
 *
 * The brief's framing, and it is the whole shape of this def: *"a lone checkbox is a valid control
 * (a consent box); a lone radio is meaningless — it only means 'one of these', and needs siblings and
 * a shared `name` to mean anything at all."* Everything below follows from that one sentence.
 *
 * ── THE GROUP IS MANDATORY, AND ITS ABSENCE HERE IS A DECISION RATHER THAN AN OVERSIGHT ────────
 *
 * `checkbox` said `CheckboxGroup` is a separate component and could afford to leave it at that,
 * because a checkbox alone is a complete control. **Radio cannot.** Name-grouping is what makes this
 * a radio rather than a toggle, so the question `checkbox` deferred is load-bearing here, and this
 * paragraph exists so the omission cannot be read as a gap somebody forgot to fill.
 *
 * **The answer is still: `RadioGroup` is a separate component, filed as #901, and not authored in
 * this def.** Radio sharpens that issue rather than changing its answer, and the sharpening is worth
 * stating because it is what a `ComponentDef` structurally cannot express:
 *
 *   · **The group owns the shared `name`**, which is what enforces exclusivity at the browser level.
 *     A `Radio` never sets its own — doing so breaks exclusivity outright.
 *   · **The group owns a single SCALAR value**, where `CheckboxGroup` owns an array. Selection here
 *     is *derived*, not held: `checked = (group.value === props.value)`.
 *   · **The group is a SINGLE TAB STOP** with roving tabindex and arrow navigation between options —
 *     the exact opposite of checkbox's tab-each model, and the most common radio a11y failure.
 *   · **The group owns `orientation`, `required` and all validation**, announced once.
 *
 * None of that is expressible from an option. So this def describes the OPTION, honestly and
 * incompletely, and the incompleteness is structural rather than a scoping choice: a `ComponentDef`
 * describes one component, and the unit of use here is two.
 *
 * ── `inherits`, AND A LIMIT OF THE FIELD THAT RADIO IS THE FIRST TO MEET ────────────────────────
 *
 * `inherits: 'checkbox'`. The brief's §15 states `inherits: [text-field, checkbox]` — **a chain** —
 * and `ComponentDef.inherits` is a single string, so the chain cannot be written down. The nearest
 * parent is named and the rest is this sentence: the form-field substrate (`description`/helper,
 * `error`, the `aria-describedby` wiring, `name`/`id`/`required`/`disabled`/`readOnly`) reaches this
 * def *through* `checkbox`, along with checkbox's own row shape — the rich-content label that doubles
 * as the hit target, top-baseline alignment, and native DOM naming.
 *
 * As on `textarea` and `checkbox`, **nothing in the engine resolves `inherits`**: it is prose for a
 * human, `props` is the delta a human reads, and `states`/`variants`/`tokens`/`paintKeys` are
 * authored locally in full because all four have machinery behind them.
 *
 * ── THE SHARPEST API DIFFERENCE IS THREE PROPS THAT ARE NOT HERE ────────────────────────────────
 *
 * **`Radio` has no `checked`, no `onChange` and no `name`** — all three live on the group, and the
 * option reads selection from context and dispatches the group's callback. That is the cleanest
 * contrast with `checkbox`, whose standalone box owns its own boolean, and `props` has no way to
 * express an absence, so it is stated here and in `docs.dont` rather than left to be noticed.
 *
 * `value` is consequently **required** here, where checkbox's is optional: it is this option's
 * identity within the group, not a string that happens to be submitted.
 *
 * ── `selection`, AND THE FIRST TEST OF THE VALUE RECOMMENDATION (#910, `VARIANT_AXES`) ──────────
 *
 * `[unchecked, checked]` — checkbox's vocabulary minus `indeterminate`, which radio simply does not
 * have: a mutually-exclusive choice has no partial state, and the absence of a mixed glyph is the
 * clean contrast with checkbox rather than an omission.
 *
 * The axis NAME was settled for the family when `checkbox` admitted it; the VALUES were deliberately
 * left open, with the recommendation that they follow ARIA. **This is the first def to test that
 * recommendation and it holds comfortably** — `aria-checked` is radio's ARIA property, `checked` is
 * the native attribute, and the brief itself writes the derived boolean as `checked`. Worth recording
 * that it was easy here, because `switch` is the def that tests it hardest: `role="switch"` also uses
 * `aria-checked` while reading least naturally as "checked", and a `[off, on]` spelling there should
 * be a decision somebody takes rather than a default nobody noticed. **The value vocabulary stays
 * open until switch lands** — the census that catches a synonym runs after all three have shipped.
 *
 * ── WHAT §15 CALLS RADIO-SPECIFIC STATES, TWO OF WHICH ARE NOT STATES ──────────────────────────
 *
 * Brief §15 lists `radio-specific: [selected, no-deselect, no-indeterminate]`, and reading that list
 * against the closed vocabulary is the useful exercise: `selected` is the `selection` AXIS (above);
 * `no-deselect` is a BEHAVIOUR — activating a selected radio does nothing, there is no toggle-off —
 * and behaviors have no coordinate; `no-indeterminate` is an ABSENCE, which is a thing you cannot
 * declare at all. So `states` is checkbox's seven exactly, and this note is what stops the next
 * reader concluding three were dropped.
 *
 * ── THE PAINT GRAMMAR AND #871, BOTH INHERITED DELIBERATELY ─────────────────────────────────────
 *
 * `['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}']` — `checkbox`'s grammar, axis-led
 * like every other def in the corpus. The exemption that makes it legal is declared ONCE, per axis,
 * in `lint-paint.ts`'s `NON_FAMILY_AXES`: arm 1's premise (*"an intent's paint comes from that
 * intent's family"*) has nothing to be true of for `selection`, because the tier emits no
 * `color.checked.*` and must not grow one.
 *
 * **This def pays nothing for that, and the saving is the whole reason the exemption is axis-scoped
 * rather than per-key.** `checkbox` first shipped slot-led, which skips arm 1 by construction, and was
 * corrected in review against the house rule — *a false positive is fixed by adding to the exemption
 * list, never by narrowing a scan*. The ~20 renames were paid there, once; `radio` inherits the
 * convention and adds no exemption of its own. `switch` will do the same.
 *
 * Know its cost before reading the grammar as covered: arm 1 does not check these bindings at all,
 * and nothing else does either (#916). The gate PRINTS that per axis on every run, which is the only
 * difference from the slot-led shape — and the difference that mattered.
 *
 * **#871 holds: no surface or inverse axis.** `size` and `selection`, nothing else, and
 * `color.interactive.primary.on-inverse.*` is deliberately unbound. Surface context is published by a
 * cascade, not by a component variant.
 *
 * ── THE RUNG OFFSET (#756, `docs/28` §5.2, `docs/40` §7 step 2) ─────────────────────────────────
 *
 * `size.small.gap → size.sm.gap` and `size.small.min-height → size.sm.height`, `medium → md` by the
 * default rule. The def's enum is the consumer's vocabulary and the ref is the engine's tier; the
 * engine's names win. Recorded here because the rule is that the author records it where they meet
 * it, and "checkbox already did" is how the next def stops doing so.
 *
 * ── #900 CLOSED, AND THE ONE PLACE THE CHECKBOX PATTERN DID NOT GENERALIZE ──────────────────────
 *
 * The control CIRCLE is bound — `control.size.*.height`, one key on both axes, square by
 * construction, exactly as `checkbox` binds its box. That much was a copy. `icon.size.*` remains the
 * substitution that would resolve, typecheck and pass every gate while measuring the wrong thing:
 * its values are right (16/20/24) and its meaning is not, because it is the glyph artboard ladder.
 *
 * **The DOT did not copy, and the reason is the finding of this def.** Checkbox's mark is a `vector`
 * sized `size.{size}.control` — FULL BLEED — and that is correct there because a glyph carries its
 * optical inset inside its own artboard: `check` draws 16.97×12 of ink on a 24×24 grid (~71%),
 * `minus` draws 14×2 (58%). A radio's dot is a `box`, and a box has no artboard. Full-bleed makes
 * the dot BE the disc, `checked.indicator → on-fill` paints it, and the result is a solid circle with no
 * ring — which is not a radio at all. Nothing downstream could have caught that: the size ref
 * resolves, the paint resolves, the geometry is square, and nothing in the repo reads a filled
 * shape's proportion.
 *
 * So the dot needed a NUMBER, and `control.size.*` grew a third field to hold it —
 * `control.size.<rung>.dot`, half the box edge (#910). Three things about that are worth recording,
 * because #900 predicted the opposite:
 *
 *   · **#900 said this dimension would be ABSENT**, on #801's split: the tier holds the inputs and a
 *     downstream layer does the arithmetic. That split still holds for a switch THUMB, whose
 *     question is where it sits at two selection values. It does not hold here, because the
 *     arithmetic has nowhere to happen — `anatomyErrors` refuses `inset` on any non-`absolute` part,
 *     and `sizingMode` maps `'fill'` to Figma `AUTO`, so padding-plus-fill projects a dot of ZERO.
 *     Both spellings of #900's prescribed route are refused by the code, and opening either would
 *     put `layoutGrow`/`layoutAlign` through the plan type, the projector and both executors.
 *   · **The group shape is what made that cheap.** #900 authored `control.size.<rung>` as a GROUP
 *     rather than a leaf specifically so a second dimension could arrive without a MAJOR bump. It
 *     arrived, additive, at MINOR — and for a field #900 did not anticipate, which is a stronger
 *     case for the rule than the one it argued.
 *   · **The ratio is a CONSTANT, not a brand lever**, on `CONTROL_TRACK_RATIO`'s footing, and it is
 *     NOT field-convergent: M3 is 0.5, Carbon 0.4, Primer 0.375, a third of spread with ours at the
 *     top of the range. `scale.ts` carries what it stands on instead, and why a brand should not
 *     have this knob.
 *
 * `switch` still meets a wall, and this def does not clear it: a thumb is present at BOTH selection
 * values and MOVES between them, which is a positioning question rather than a presence one.
 */
import { ComponentDef } from '../component-schema';

export const radio: ComponentDef = {
  id: 'radio',
  name: 'Radio',
  // The brief's list, kept intact. `radio-group` sits in it and this def is NOT the group — kept
  // anyway because an agent reaching for the group should land on the nearest thing that exists and
  // read its header, rather than matching nothing at all. The description says what this is.
  aliases: ['radio-button', 'radio-group', 'option', 'choice-list'],
  category: 'form',
  status: 'draft',
  inherits: 'checkbox',
  description:
    'A control for choosing exactly one from a small set of mutually exclusive, all-visible options — 2 to about 7, where seeing them all aids the decision. This def is the labelled OPTION; the group is a separate component and is MANDATORY, because a lone radio is meaningless: it owns the shared name that enforces exclusivity, the single selected value, the single tab stop, and all validation. Selection is derived from the group, never held here. Not any-number selection (Checkbox), not an immediate on/off (Switch), not the same choice collapsed (Select) or in a compact skin (Segmented Control).',

  // THE DELTA ONLY. The form-field substrate reaches this def through `checkbox` and is not restated.
  // THREE PROPS ARE DELIBERATELY ABSENT — `checked`, `onChange` and `name` all live on the group (see
  // the header); `props` cannot express an absence, so `docs.dont` carries it too.
  props: [
    { name: 'value', type: 'string', required: true, description: 'REQUIRED, where checkbox\'s is optional — this is the option\'s identity within its group, not a string that happens to be submitted. Selection is derived from it: `checked = (group.value === props.value)`. The option never holds a boolean of its own.' },
    { name: 'label', type: 'node', required: false, description: 'Rich content, inline-end of the control, and part of the hit target — checkbox\'s label model, inherited. Option labels are parallel, mutually exclusive and brief: the same grammatical shape across the set, with no overlap that would make two options both apply. Long labels WRAP rather than truncate, with the control top-anchored. Per-option detail or price belongs in `description`, not in the label.' },
    { name: 'description', type: 'node', required: false, description: 'Per-option helper beneath the label, describedby-wired. This is where the detail that makes an option distinguishable goes — the price, the delivery estimate, the caveat.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales the row — the control-to-label gap, the row\'s minimum height, the label\'s type, the circle\'s own diameter and the inner dot\'s. The circle and the dot come from `control.size.*`, which moves a full rung with brand density; a binding to `icon.size.*` would resolve and measure the wrong thing (see the header). Re-declared rather than inherited because the ladder is read by the machinery (`lint-rung-names.ts` arm 2).' },
  ],

  // Checkbox's seven exactly. Brief §4 inherits them and adds three "radio-specific" entries, none of
  // which is a state — see the header: `selected` is the selection axis, `no-deselect` is a behavior,
  // and `no-indeterminate` is an absence.
  //
  // `error` is declared and its binding is the option's own boundary, but the brief is emphatic that
  // radio error is GROUP-level only, never per-option. Both are true: the state exists because a
  // standalone-rendered option can be recolored, and a correct implementation inside a group never
  // reaches that coordinate. `read-only` binds nothing, as on checkbox.
  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'read-only', 'error'],

  // No `indeterminate` — a mutually-exclusive choice has no partial state. No tone/emphasis. No
  // surface or inverse axis (#871). `orientation` and `density` are the GROUP's and are not here.
  variants: {
    size: ['small', 'medium', 'large'],
    selection: ['unchecked', 'checked'],
  },

  // `checkbox`'s grammar, unchanged and deliberately so — see the header.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}'],

  tokens: {
    // ── THE UNCHECKED DISC — the form-field substrate's chrome, identical to checkbox's empty box.
    // `pressed` is unbound here for checkbox's reason: `color.field.border.*` emits `rest` and `hover`
    // only, and reaching into another family for one coordinate would put two ladders on one axis.
    'unchecked.fill': 'color.field.fill',
    'unchecked.border': 'color.field.border.rest',
    'unchecked.border.hover': 'color.field.border.hover',
    'unchecked.border.error': 'color.border.danger',

    // ── THE CHECKED DISC — a FILLED disc with an on-fill dot, which is checkbox's treatment with a
    // round radius. The alternative (Material's outlined ring with a brand-colored dot on the field
    // fill) is a real fork and is in `notes.contested`; filled wins here on two grounds, and neither
    // is taste. It keeps the two selection controls one visual family, and — the load-bearing half —
    // `on-fill` is a contract the token tier actually GATES, against the fill the ink sits on. An
    // outlined ring would paint its dot from an ink role gated against the PAGE while it in fact sits
    // on `color.field.fill`, which is a different pairing than the one that was checked.
    'checked.fill': 'color.interactive.primary.fill.selected',
    'checked.fill.hover': 'color.interactive.primary.fill.hover',
    'checked.fill.pressed': 'color.interactive.primary.fill.pressed',
    'checked.border': 'color.interactive.primary.border.rest',
    'checked.border.hover': 'color.interactive.primary.border.hover',
    'checked.border.pressed': 'color.interactive.primary.border.pressed',
    'checked.border.error': 'color.border.danger',
    // The inner dot, in the `indicator` slot — NOT `icon`, and that is the second consequence of the
    // dot being a box rather than a glyph. `icon` is ink for a node that DRAWS something, and a box
    // claiming it paints a rectangle behind the glyph it meant to color (#864, measured). The dot has
    // no glyph behind it because it IS the drawn shape, so it needs a slot of its own — which #933's
    // one-box-per-slot rule demands anyway, since `control` already owns `fill`. `indicator` was already
    // in `PAINT_SLOTS` for `field-label`'s de-emphasized suffix and joined `BOX_PAINT_SLOTS` here.
    // The ink role is unchanged from checkbox's check: `on-fill`, gated against the fill it sits on.
    'checked.indicator': 'color.interactive.primary.on-fill',

    // ── THE ROW'S LABEL — one ink at every coordinate, so it is the bare slot. Page text beside the
    // control, which is why its disabled ink is `disabled.text` and not `disabled.on-fill`.
    'label': 'color.text.primary',

    // ── FOCUS RING — the CONTROL ring (`focus.ring.offset`), not the field's flush one. The brief
    // adds a radio-specific constraint the token layer cannot hold: the ring must appear INSTANTLY,
    // because a fade lags rapid arrow navigation through a group. Recorded in `notes.unverified`.
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // ── DISABLED SKIN (contrast-exempt), the shared cross-cutting family.
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.indicator.on-fill': 'color.disabled.on-fill',
    'disabled.label': 'color.disabled.text',

    // ── GEOMETRY. `radius.round` is the one geometric difference from checkbox, and it is the whole
    // visual distinction between the two controls: a square means any-number, a circle means
    // exactly-one. That convention is old enough to be load-bearing — a round checkbox or a square
    // radio misreads at a glance, before any label is read.
    'radius': 'radius.round',
    'size.small.gap': 'size.sm.gap',
    'size.medium.gap': 'size.md.gap',
    'size.large.gap': 'size.lg.gap',
    'size.small.min-height': 'size.sm.height',
    'size.medium.min-height': 'size.md.height',
    'size.large.min-height': 'size.lg.height',

    // ── THE CONTROL CIRCLE, checkbox's binding verbatim. ONE key on BOTH axes of the box, so the
    // control is round-able by construction rather than by two values that happen to agree; `.width`
    // sits on the same tier group and is deliberately not read here — it is switch's track.
    //
    // `control.size.*.height` AND NOT `icon.size.*`. Measured across the corpus: `icon.size` is
    // 16/20/24/32/40 and BYTE-IDENTICAL in all four brands, because a glyph artboard is a fixed grid
    // the icon set draws on. `control.size.*.height` is 16/20/24 on nb, wendys and harbor and 12/16/20
    // on AURORA. Both refs resolve, both are dimensions, both are square, so the wrong one is invisible
    // — which is why the claim is asserted in `test.ts` over every def that binds a control field,
    // rather than trusted to this comment. It was checkbox-shaped until this def arrived.
    'size.small.control': 'control.size.sm.height',
    'size.medium.control': 'control.size.md.height',
    'size.large.control': 'control.size.lg.height',

    // ── THE INNER DOT, and this is the one binding with no checkbox counterpart (#910). Checkbox's
    // mark is a GLYPH sized at `control` full-bleed, which is right there and wrong here: a glyph's
    // optical inset lives in its artboard and a filled box has no artboard, so full-bleed would make
    // the dot the whole disc. `control.size.*.dot` is half the box edge — 8/10/12 on nb, wendys and
    // harbor, 6/8/10 on aurora, so it tracks brand density exactly as the box it sits in does.
    'size.small.dot': 'control.size.sm.dot',
    'size.medium.dot': 'control.size.md.dot',
    'size.large.dot': 'control.size.lg.dot',

    // ── THE ROW'S TYPE, checkbox's reasoning unchanged: running text BESIDE a control, not a name
    // announcing a field above one, and `type.label.*` emits only `sm`/`md` so `large` would have no
    // rung to reach. `type.body.*` is the only family in the tier carrying all three.
    'size.small.text': 'type.body.sm.default',
    'size.medium.text': 'type.body.md.default',
    'size.large.text': 'type.body.lg.default',
  },

  // ── ANATOMY (#910) ──────────────────────────────────────────────────────────────────────────────
  //
  // Checkbox's decomposition with ONE structural mutation, which is the same sentence the header opens
  // with and it holds at this level too: two boxes (the ROW is the hit target, the CONTROL owns the ink
  // — #933), a mark gated by `presentWhen` on `selection`, an absolute focus ring on the control, and a
  // text label. Four of the five parts are checkbox's, adapted only in their `note`.
  //
  // THE MUTATION IS THE MARK, and it is a change of KIND rather than of glyph. Checkbox has two `vector`
  // parts — `check` and `minus`, one per non-empty selection value. Radio has one `box`, because a dot
  // is not a glyph: there is no filled circle in the engine's 39-name glyph vocabulary, and minting one
  // would put a primitive shape into a set whose whole membership rule is that an entry carries meaning.
  // A `box` with `radius: 'radius'` (which radio binds to `radius.round`) is a circle at any size, with
  // no artboard and therefore no borrowed inset — hence its own `size.{size}.dot` key. See the header
  // for why that field had to exist and what #900 had predicted instead.
  //
  // `unchecked` has no mark at all — an empty ring draws nothing — so the dot is gated rather than
  // recolored, and `presentWhen: { selection: ['checked'] }` is the whole of it. One value, where
  // checkbox needed two parts for two.
  anatomy: {
    root: 'row',
    parts: {
      // THE HIT TARGET, and nothing else. No `paintSlots` (#933): structure, and this def keys no
      // row-level fill or border for it to name. Its extent comes from its children — `min-height` is in
      // `codeOnly` for checkbox's reason, that Figma has no floor.
      row: {
        kind: 'box',
        role: 'target',
        // START, not center — `docs.dont` states it: a control centered against a multi-line label floats
        // mid-paragraph. Option labels wrap by design here, since the guidance is to wrap rather than
        // truncate and to keep per-option detail in `description`.
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        children: ['control', 'label'],
      },
      // THE PAINTED DISC. FIXED on both axes because `size` binds one variable to width and height; a
      // hugging box would collapse around the dot. `radius` resolves to `radius.round`, which is the one
      // geometric difference from checkbox and the whole visual distinction between the two controls.
      control: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill', 'border'],
        size: 'size.{size}.control',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['dot', 'focusRing'],
      },
      // THE DOT. A `box`, not a `vector`, and sized from its OWN key rather than the control's — the two
      // departures from checkbox's `mark`, and they are one decision: a filled shape has no artboard to
      // carry an optical inset, so full-bleed would draw the disc rather than a dot inside it. FIXED on
      // both axes for the control's reason. `radius` is the same round binding, which at a square box of
      // any size is a circle.
      dot: {
        kind: 'box',
        role: 'presentation',
        // `indicator`, NOT `fill` — `control` already owns `fill`, and #933's rule is that two boxes
        // naming one slot both take the SAME variable rather than dividing it. That is not a widening
        // to route around the rule; it is what the rule prescribes ("a def that genuinely needs a
        // second painted box needs a second SLOT"). `indicator` is the honest name for a selection
        // mark, was already in `PAINT_SLOTS`, and joined `BOX_PAINT_SLOTS` here — see its note for the
        // #864 condition that admits it, and why this part satisfies it by having no children.
        paintSlots: ['indicator'],
        size: 'size.{size}.dot',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        presentWhen: { selection: ['checked'] },
        note: 'The inner dot, present only at `checked` — an unchecked radio draws no mark, so this is a gated part rather than a recolored one. Its ink is `checked.indicator`, and at `disabled` the on-fill form `disabled.indicator.on-fill`, because the dot sits on the control\'s fill and the token tier gates that pairing rather than the page one. Its select micro-motion — a spring scale-up, and a sibling\'s dot animating OUT — has no expression in this schema (see `notes.unverified`).',
      },
      // Checkbox's ring, verbatim, on the CONTROL rather than the row: `accessibility.focus` says the ring
      // is on the control, and `focus.ring.offset` (2) is the control offset rather than the field's flush
      // `offset-field` (0). The two insets SUM in the executor, siting the ring at -(2+2) = -4, so the
      // visible gap is a full 2px — #801's finding, that the ring's own inside-drawn stroke eats the offset
      // unless it is compensated for. The brief's INSTANT-appearance requirement is not expressible here.
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { color: 'default' } },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring` component, inset from the CONTROL so the ring surrounds the circle rather than the whole row.',
      },
      // No `paintSlot` — the default is `label`, and at `disabled` the projector reaches `disabled.label`
      // (page ink) rather than `disabled.label.on-fill`, because this text sits beside the fill, not on it.
      label: {
        kind: 'text',
        type: 'size.{size}.text',
        note: 'The accessible name AND the second half of the hit target. Rich content in code; a plain text node in Figma. Note that the accessible name of the CHOICE is the group\'s label, which no part here can carry — an option label alone announces "radio button, 1 of 3" with no indication of what is being chosen.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word, so a
      // passing mention inside an entry about something else does not count (#563).
      'read-only — the one state in `states` the Figma set does not carry, admitted here rather than dropped, exactly as `checkbox` admits it and `button` admits `inactive`. It binds NOTHING by design (see `states`): a radio has no working native readonly, so there is no treatment to project, and six variants byte-identical to `rest` would read as coverage of a state nobody has designed.',
      'min-height — `size.*.min-height` is the row\'s FLOOR and Figma has no floor. `PartDef` carries `height`, which is fixed, so binding it here would state the wrong quantity and clip a wrapping option label at the one coordinate that matters most. The row hugs its children instead and the keys stay bound for the code projection, where `min-height` is the property they name.',
      'THE GROUP, which is the unit of use and is not this def (#901). The shared `name` that enforces exclusivity, the single scalar value selection is derived from, the single tab stop with roving tabindex and arrow navigation, `orientation`, `required` and all validation live there. A Figma set of options can show what an option looks like at every coordinate and cannot show a group at all — so the exclusivity that makes these radios rather than toggles is absent from the projection by construction, not by omission.',
      'The whole-row hit target beyond the row\'s own extent. SC 2.5.8 wants 24x24 and Apple/Material want 44/48 on touch; the row reaches that at `medium` and not at `small`, and the padding that would expand it is a per-consumer decision about the surrounding layout. `row` is the node it lands on — that is what this block makes expressible — but the value is not the def\'s to pick.',
      'The `description` prop — per-option helper text beneath the label, which is where the detail that distinguishes options goes (a price, a delivery estimate). It is a second text part under `label` rather than beside it, and adding it would double the row\'s vertical shape across all 36 members for content that is optional at every one of them. Left to the code projection, where it is describedby-wired.',
      'The select micro-motion (brief §8: a spring/scale-up of the dot with a border-color crossfade at roughly 100-150ms, and a SIBLING\'s dot animating out — the only exit animation a radio has, since it can never be deselected on its own). Neither the def schema nor a Figma variant carries motion, so the dot is static at every coordinate. The focus ring\'s INSTANT-appearance requirement is the same gap seen from the other side.',
    ],
  },

  figmaProperties: {
    // BOTH axes, and `selection` is not optional: `presentWhen` gates the dot on it, so an unprojected
    // `selection` would make the dot absent from every member of the set. `anatomyErrors` refuses that
    // combination rather than leaving it to be discovered in a Figma file.
    variantAxes: ['selection', 'size'],
    // Six of the seven states — `read-only` is admitted in `codeOnly` above. 2 selections x 3 sizes x 6
    // states = 36 members, checkbox's 54 less the `indeterminate` column radio does not have.
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'error'] },
    texts: {
      // A REAL OPTION from a real group, not "Label" — #798's finding is that a text part with no TEXT
      // property projects a blank node, and the corollary is that the default is the only copy anyone
      // reviewing the set will see. A shipping method is the canonical example in `docs.usage`, and it
      // demonstrates the content rule at the same time: parallel, brief, sentence case, no terminal stop.
      label: { part: 'label', default: 'Standard shipping' },
    },
    // No `swaps` — the dot is geometry this def owns, not a glyph a consumer nominates. No `slotAxes`:
    // the dot is gated by a COORDINATE rather than by presence, which is the distinction `presentWhen`
    // exists to draw.
    booleans: {},
  },

  accessibility: {
    role: 'radio (native <input type="radio"> sharing a name), with aria-checked; the group carries role="radiogroup"',
    wcag: [
      '1.3.1 Info and Relationships (the group structure is the meaning)',
      '4.1.2 Name Role Value (role and checked)',
      '3.3.1 Error Identification / 3.3.2 Labels or Instructions (group-level, announced once)',
      '1.4.11 Non-text Contrast / 2.4.13 Focus Appearance (control boundary and focus indicator)',
      '2.5.8 Target Size (the whole row, as checkbox)',
    ],
    keyboard: 'THE OPPOSITE OF CHECKBOX, and this is the headline. The GROUP is a single tab stop: Tab moves into the group and the next Tab moves out, while arrow keys move between options, wrapping at the ends, with Home/End jumping to first/last. Space selects the focused option. Implement with ROVING TABINDEX — one radio at tabindex="0" (the checked one, or the first if none), siblings at -1, with arrow handling moving focus, the 0, and calling .focus() — rather than aria-activedescendant, which is more verbose and prone to synchronization bugs. Making each radio its own tab stop is the most common radio accessibility failure. Native inputs sharing a name give the grouping, the exclusivity and this keyboard model for free.',
    focus: ':focus-visible ring on the CONTROL, offset, at least 3:1, keyboard traversal only. The ring must appear INSTANTLY — fading it lags rapid arrow navigation. Selection FOLLOWS FOCUS by default: arrowing moves focus and selects, which is native <input type="radio"> behavior and the APG default, and the catalogue keeps native semantics rather than reimplementing them. The known cost is that a screen-reader user exploring the options fires onChange at every step; the answer is to keep radio onChange CHEAP — a radio selection must never trigger navigation or expensive work — and to decouple selection from focus only as a deliberate, documented exception. On focus restore into the group (a validation error, a legend click), focus the CHECKED radio rather than blindly the first; if none is checked, the first non-disabled option.',
    aria: 'Prefer the styled native input — appearance: none plus a pseudo-element or SVG keeps role, checked state, exclusivity and the roving-tabindex keyboard model for free. For the container, role="radiogroup" plus aria-labelledby is the default over fieldset/legend, for the same CSS-layout reason as checkbox. THE GROUP LABEL IS MANDATORY FOR MEANING: without it assistive tech announces an orphaned "radio button, 1 of 3" with no indication of what is being chosen. Group error and required associate to the group and announce once; an option never owns its own error. On mobile (Jetpack Compose) put the click target on the ROW rather than the dot — selectableGroup() on the parent, selectable(role = Role.RadioButton) on the row, and onClick = null on the RadioButton itself — or the control double-fires and assistive tech announces twice.',
  },

  content: {
    labelPattern: 'Parallel, mutually exclusive, scannable — the same grammatical shape across the set, brief, sentence case, no terminal punctuation, and no overlap that would let two options both apply. Long labels wrap rather than ellipsis-truncate, with the control top-anchored so it stays on the first line. The GROUP label names the decision or asks the question ("Shipping method", "How should we contact you?") and may be visually hidden when an enclosing labelled section already frames it, but must stay programmatically present.',
    errorPattern: 'Group-level and specific — "Select a preferred contact method", never "Invalid input" (SC 3.3.3). Never per-option.',
    emptyPattern: 'A group starts EMPTY by default, so no option carries a pre-selected state — the practice forces a deliberate choice and pre-selects only where a genuinely safe recommended default exists. Empty is a one-way door, because a radio cannot be deselected: an OPTIONAL group must therefore carry an explicit "None" or "N/A" option, or a stray click permanently pollutes the data with no way back. If a "None" option would corrupt the data model, the choice belongs in a clearable Select instead.',
  },

  docs: {
    usage: 'Use a group of these for exactly one of 2 to about 7 mutually exclusive, all-visible options where seeing them all aids the decision — a shipping method, a plan tier. Always inside a RadioGroup, never alone: the group owns the shared name, the value and the validation. Prefer vertical orientation, which scans better and lets long labels wrap safely; reserve horizontal for a few short options and space them so no label associates with the wrong control. Compose FieldMessage at the GROUP rather than per option.',
    do: [
      'Ship options inside a group — the group owns the shared name, the single value, validation and the tab stop',
      'Give the group a label; without one, assistive tech announces "radio button, 1 of 3" with no idea what the choice is',
      'Give an optional group an explicit "None" option — a radio cannot be deselected, so a stray click is otherwise permanent',
      'Keep onChange cheap, since selection follows focus and a screen-reader user arrowing through fires it at every step',
      'On focus restore, focus the checked option rather than the first',
      'Start empty to force a deliberate choice; pre-select only a genuinely safe default',
    ],
    dont: [
      'Set checked, onChange or name on an option — all three belong to the group, and an option setting its own name breaks exclusivity outright',
      'Make each option its own tab stop — the group is one stop with arrow navigation, and getting this wrong is the most common radio accessibility failure',
      'Add toggle-off behavior — no-deselect is native and deliberate',
      'Model an exclusive choice as several checkboxes, or a true/false toggle as two radios',
      'Reach for radio past about 7 options or in tight vertical space — that is Select',
      'Use radio for a choice that takes effect instantly — that is Switch, or a Segmented Control',
    ],
    contentGuidelines: 'Option labels are parallel and brief; the detail that distinguishes them goes in the description. The group label names the decision. Errors are group-level and say what to do.',
  },

  ai: {
    primaryPurpose: 'Present one option within a mutually exclusive set, deriving its selected state from the group that owns the value.',
    whenToUse: 'Exactly one of 2 to about 7 all-visible options where seeing them together aids the decision, and the choice is committed on submit rather than applied instantly. Always as a child of a RadioGroup.',
    avoidWhen: 'Any number of options may be selected (Checkbox — never model an exclusive choice as several checkboxes), the change applies immediately (Switch — and never two radios for a true/false toggle), the set runs past about 5 to 7 or vertical space is tight (Select, the collapsed alternative), the choice is a dense frequent view-switch (Segmented Control, which carries a different accessibility model), or it is really an action (Button). Also do not reach for this def when what is wanted is the GROUP: the group is a separate component that is not authored yet, and it — not this — owns the name, the value and the validation.',
    commonPartners: ['field-label', 'field-message', 'focus-ring', 'icon', 'form', 'card'],
    triggerKeywords: ['radio', 'radio button', 'radio group', 'option', 'choice list', 'single select', 'exactly one', 'pick one', 'mutually exclusive'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring', 'icon', 'form'],
    alternativeTo: ['checkbox', 'switch', 'select', 'segmented-control', 'toggle-button'],
    supersedes: [
      'a set of checkboxes misused for a mutually exclusive choice',
      'a bare <input type="radio"> set with no group label',
      'two radios standing in for a true/false toggle',
    ],
    supersededBy: [
      'select when the option count grows past about 5 to 7',
      'segmented-control when the presentation should be compact and take effect immediately',
    ],
  },

  notes: {
    contested: [
      'THE CHECKED DISC IS FILLED, with an on-fill dot — checkbox\'s treatment at a round radius. The NAMED ALTERNATIVE is Material\'s outlined model: the fill stays `color.field.fill`, the ring recolors, and a brand-colored dot sits inside it. It is a real fork and several systems ship it, and the brief takes no position — §8 describes "a spring/scale-up of the inner dot with a border-color crossfade", which both models satisfy. Filled was chosen on two grounds, neither of them taste: it keeps the two selection controls one visual family, and `on-fill` is a pairing the token tier actually gates, whereas an outlined dot would take an ink role gated against the PAGE while sitting on the field fill — a different pairing than the one that was checked. Revisit if a brand wants the outlined skin; it is a rebind of three keys, not a restructure.',
      'THE PAINT GRAMMAR IS AXIS-LED, inherited from `checkbox` rather than re-decided, and the exemption that makes it legal is declared once per AXIS in `lint-paint.ts` (`NON_FAMILY_AXES`) rather than once per def. Recorded here only so this def is not read as a second independent vote: the two share one grammar and one exemption. What is genuinely open is not the grammar but its cost — arm 1 does not check a non-family axis at all, and neither does anything else, which is #916.',
      'The group\'s `orientation` and `density` are in brief §15\'s variants block and are not axes here, because they are `RadioGroup`\'s. Unlike checkbox, where that was a tidy boundary, here it means the def is missing an axis its unit of use genuinely has — see #901.',
      'Carbon\'s "AI presence" variant, which sets an AI-explainability label beside a recommended option, is named in brief §4 as a frontier signal and explicitly "a watch item, not a default". Not declared. It is also a dual-action row needing careful focus management so assistive tech does not conflate the explainer control with the radio, which makes it an anatomy question rather than an axis one.',
      'Selection-follows-focus is the practice default and the external research pass argued the opposite (explicit selection, Space to commit), citing the screen-reader-exploration trap and Windows gamepad behavior. Recorded because the contrary position is legitimate and reasoned rather than wrong: the resolution is that follows-focus is native and the APG default, and the exploration cost is better paid by keeping `onChange` cheap than by reimplementing the platform.',
    ],
    unverified: [
      'THE DOT\'S RATIO TO ITS BOX IS A CONSTANT AND NOT FIELD-CONVERGENT — `CONTROL_DOT_RATIO` is 0.5, where M3 is 20/10 = 0.5, Carbon 20/8 = 0.4 and Primer 16/6 = 0.375. Three points spanning a third are not convergence, and ours sits at the top of that range rather than the middle, so unlike `CONTROL_TRACK_RATIO`\'s 2:1 this number cannot be justified by pointing at the field. What the same three DO agree on is the resulting GAP — 5, 6, 5px — and a fixed gap cannot be the tier\'s answer, because 12 less two 5s leaves a 2px dot at the compact floor. `scale.ts` states the three properties 0.5 stands on instead (an integer at every rung, a 6px legibility floor, implied gaps that bracket the field\'s 5-6 at the middle rungs) and why it is not a brand lever. A brand wanting the outlined Material skin, in `notes.contested`, would want a different ratio too.',
      'The unchecked disc has no `pressed` binding, for checkbox\'s reason: `color.field.border.*` emits `rest` and `hover` only. The checked coordinates DO paint pressed, so the gap is asymmetric.',
      '`read-only` is declared and binds nothing, as on checkbox. A radio has no working native readonly either.',
      'THE FOCUS RING MUST APPEAR INSTANTLY (brief §6, §8) — a fade lags rapid arrow navigation through a group, which is a radio-specific constraint that checkbox does not have, since checkbox is tabbed to one at a time. The engine emits `motion.duration-ms.*` and this def has no motion field to point at, so the requirement lives in `accessibility.focus` prose and nothing checks it.',
      'The select micro-motion (brief §8: a spring/scale-up of the dot with a border-color crossfade at roughly 100-150ms, and — uniquely — a sibling\'s dot animating OUT, the only exit animation a radio has, since it can never be deselected on its own) has no expression in the def schema at all.',
      '`RadioGroup` and `Radio.Control` are separate components with no def (#901). For radio this is sharper than for checkbox, because the group is MANDATORY rather than optional: the shared `name`, the single scalar value, the roving-tabindex single tab stop, `orientation`, and all validation live there, and none of it is expressible from an option. Recorded in the header at length for that reason.',
      'The whole-row hit target is expressed as `size.*.min-height`, the row\'s floor, and — since #910 — `anatomy.parts.row` is the node the expanding padding would land on. What is still unstated is the VALUE: the row clears SC 2.5.8\'s 24x24 at `medium` and not at `small`, and how much padding to add is a decision about the surrounding layout rather than a property of this component. Admitted in `anatomy.codeOnly` rather than guessed at.',
    ],
  },
};
