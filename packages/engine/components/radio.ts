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
 * and behaviours have no coordinate; `no-indeterminate` is an ABSENCE, which is a thing you cannot
 * declare at all. So `states` is checkbox's seven exactly, and this note is what stops the next
 * reader concluding three were dropped.
 *
 * ── THE PAINT GRAMMAR AND #871, BOTH INHERITED DELIBERATELY ─────────────────────────────────────
 *
 * `['{slot}.{selection}.{state}', '{slot}.{selection}', '{slot}']` — `checkbox`'s grammar, slot-led
 * for the reason its header gives at length (`lint-paint.ts` arm 1's premise, *"an intent's paint
 * comes from that intent's family"*, is false for `selection`: there is no `color.checked.*` family).
 * That argument is not re-litigated here; if it is overturned on #910 both defs move together, which
 * is the point of them sharing one grammar.
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
 * ── #900 AGAIN, AND THIS IS THE SECOND INSTANCE OF THREE ────────────────────────────────────────
 *
 * The control CIRCLE has no binding, for the identical reason the checkbox square has none: the
 * engine emits no token for a small control's own dimension. `icon.size.*` has values that are
 * exactly right (16/20/24) and a meaning that is not — it is the glyph artboard ladder — so binding
 * it would resolve, typecheck and pass every gate while measuring the wrong thing.
 *
 * **Left unbound on purpose rather than worked around**, so that when `switch` meets the same wall
 * the record shows one gap hit three times rather than three defs each inventing a way past it. A
 * workaround here would also be the harder one to unpick, because it would look like a decision.
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
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales the row — the control-to-label gap and the row\'s minimum height. The control circle itself is NOT bound (#900, see `notes.unverified`): the engine emits no token for a small control\'s own dimension. Re-declared rather than inherited because the ladder is read by the machinery (`lint-rung-names.ts` arm 2).' },
  ],

  // Checkbox's seven exactly. Brief §4 inherits them and adds three "radio-specific" entries, none of
  // which is a state — see the header: `selected` is the selection axis, `no-deselect` is a behaviour,
  // and `no-indeterminate` is an absence.
  //
  // `error` is declared and its binding is the option's own boundary, but the brief is emphatic that
  // radio error is GROUP-level only, never per-option. Both are true: the state exists because a
  // standalone-rendered option can be recoloured, and a correct implementation inside a group never
  // reaches that coordinate. `read-only` binds nothing, as on checkbox.
  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'read-only', 'error'],

  // No `indeterminate` — a mutually-exclusive choice has no partial state. No tone/emphasis. No
  // surface or inverse axis (#871). `orientation` and `density` are the GROUP's and are not here.
  variants: {
    size: ['small', 'medium', 'large'],
    selection: ['unchecked', 'checked'],
  },

  // `checkbox`'s grammar, unchanged and deliberately so — see the header.
  paintKeys: ['{slot}.{selection}.{state}', '{slot}.{selection}', '{slot}'],

  tokens: {
    // ── THE UNCHECKED DISC — the form-field substrate's chrome, identical to checkbox's empty box.
    // `pressed` is unbound here for checkbox's reason: `color.field.border.*` emits `rest` and `hover`
    // only, and reaching into another family for one coordinate would put two ladders on one axis.
    'fill.unchecked': 'color.field.fill',
    'border.unchecked': 'color.field.border.rest',
    'border.unchecked.hover': 'color.field.border.hover',
    'border.unchecked.error': 'color.border.danger',

    // ── THE CHECKED DISC — a FILLED disc with an on-fill dot, which is checkbox's treatment with a
    // round radius. The alternative (Material's outlined ring with a brand-coloured dot on the field
    // fill) is a real fork and is in `notes.contested`; filled wins here on two grounds, and neither
    // is taste. It keeps the two selection controls one visual family, and — the load-bearing half —
    // `on-fill` is a contract the token tier actually GATES, against the fill the ink sits on. An
    // outlined ring would paint its dot from an ink role gated against the PAGE while it in fact sits
    // on `color.field.fill`, which is a different pairing than the one that was checked.
    'fill.checked': 'color.interactive.primary.fill.selected',
    'fill.checked.hover': 'color.interactive.primary.fill.hover',
    'fill.checked.pressed': 'color.interactive.primary.fill.pressed',
    'border.checked': 'color.interactive.primary.border.rest',
    'border.checked.hover': 'color.interactive.primary.border.hover',
    'border.checked.pressed': 'color.interactive.primary.border.pressed',
    'border.checked.error': 'color.border.danger',
    // The inner dot. A glyph in the `icon` slot, as checkbox's check is — the shape differs and the
    // ink role does not.
    'icon.checked': 'color.interactive.primary.on-fill',

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
    'disabled.icon.on-fill': 'color.disabled.on-fill',
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
    focus: ':focus-visible ring on the CONTROL, offset, at least 3:1, keyboard traversal only. The ring must appear INSTANTLY — fading it lags rapid arrow navigation. Selection FOLLOWS FOCUS by default: arrowing moves focus and selects, which is native <input type="radio"> behaviour and the APG default, and the catalogue keeps native semantics rather than reimplementing them. The known cost is that a screen-reader user exploring the options fires onChange at every step; the answer is to keep radio onChange CHEAP — a radio selection must never trigger navigation or expensive work — and to decouple selection from focus only as a deliberate, documented exception. On focus restore into the group (a validation error, a legend click), focus the CHECKED radio rather than blindly the first; if none is checked, the first non-disabled option.',
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
      'Add toggle-off behaviour — no-deselect is native and deliberate',
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
      'THE CHECKED DISC IS FILLED, with an on-fill dot — checkbox\'s treatment at a round radius. The NAMED ALTERNATIVE is Material\'s outlined model: the fill stays `color.field.fill`, the ring recolours, and a brand-coloured dot sits inside it. It is a real fork and several systems ship it, and the brief takes no position — §8 describes "a spring/scale-up of the inner dot with a border-colour crossfade", which both models satisfy. Filled was chosen on two grounds, neither of them taste: it keeps the two selection controls one visual family, and `on-fill` is a pairing the token tier actually gates, whereas an outlined dot would take an ink role gated against the PAGE while sitting on the field fill — a different pairing than the one that was checked. Revisit if a brand wants the outlined skin; it is a rebind of three keys, not a restructure.',
      'THE PAINT GRAMMAR LEADS WITH THE SLOT, inherited from `checkbox` rather than re-decided. The argument, and the reading that it can fairly be seen as routing around `lint-paint.ts` arm 1, is in that def\'s header and in #910. Recorded here only so this def is not read as a second independent vote for it: the two share one grammar, and if #910 overturns it both move together.',
      'The group\'s `orientation` and `density` are in brief §15\'s variants block and are not axes here, because they are `RadioGroup`\'s. Unlike checkbox, where that was a tidy boundary, here it means the def is missing an axis its unit of use genuinely has — see #901.',
      'Carbon\'s "AI presence" variant, which sets an AI-explainability label beside a recommended option, is named in brief §4 as a frontier signal and explicitly "a watch item, not a default". Not declared. It is also a dual-action row needing careful focus management so assistive tech does not conflate the explainer control with the radio, which makes it an anatomy question rather than an axis one.',
      'Selection-follows-focus is the practice default and the external research pass argued the opposite (explicit selection, Space to commit), citing the screen-reader-exploration trap and Windows gamepad behaviour. Recorded because the contrary position is legitimate and reasoned rather than wrong: the resolution is that follows-focus is native and the APG default, and the exploration cost is better paid by keeping `onChange` cheap than by reimplementing the platform.',
    ],
    unverified: [
      'THE CONTROL CIRCLE HAS NO BINDING — #900, and this is the SECOND of three instances. Identical to checkbox\'s square: `size.*.height` is a full control\'s height (40/48/56 on nb) and `icon.size.*` is the glyph artboard ladder, whose values (16/20/24) are right and whose meaning is not. Binding it would resolve, typecheck and pass every gate. Left unbound rather than worked around, deliberately, so switch\'s arrival makes this one gap hit three times rather than three defs each inventing a way past it.',
      'The unchecked disc has no `pressed` binding, for checkbox\'s reason: `color.field.border.*` emits `rest` and `hover` only. The checked coordinates DO paint pressed, so the gap is asymmetric.',
      '`read-only` is declared and binds nothing, as on checkbox. A radio has no working native readonly either.',
      'THE FOCUS RING MUST APPEAR INSTANTLY (brief §6, §8) — a fade lags rapid arrow navigation through a group, which is a radio-specific constraint that checkbox does not have, since checkbox is tabbed to one at a time. The engine emits `motion.duration-ms.*` and this def has no motion field to point at, so the requirement lives in `accessibility.focus` prose and nothing checks it.',
      'The select micro-motion (brief §8: a spring/scale-up of the dot with a border-colour crossfade at roughly 100-150ms, and — uniquely — a sibling\'s dot animating OUT, the only exit animation a radio has, since it can never be deselected on its own) has no expression in the def schema at all.',
      '`RadioGroup` and `Radio.Control` are separate components with no def (#901). For radio this is sharper than for checkbox, because the group is MANDATORY rather than optional: the shared `name`, the single scalar value, the roving-tabindex single tab stop, `orientation`, and all validation live there, and none of it is expressible from an option. Recorded in the header at length for that reason.',
      'The whole-row hit target is expressed here only as `size.*.min-height`, the row\'s floor. Where the expanding padding sits, and how it relates to the control\'s own inset, is an anatomy concern this def has no block to state.',
    ],
  },
};
