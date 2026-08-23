/**
 * Checkbox — the DECOMPOSITION calibration, and the def that admits the `selection` axis (KB
 * `components/checkbox.md`, `docs/40` §7). A control for an independent binary choice that is STAGED
 * into a form and submitted, optionally one of many in a set.
 *
 * The brief's own framing: *"Checkbox looks atomic and isn't."* The same control appears at three
 * granularities — the bare box, the labelled row, the group — and the brief's headline job is deciding
 * how many components that becomes. Its answer is **two public components plus an exposed atomic
 * primitive**: `Checkbox` (the labelled row), `CheckboxGroup` (the set, which owns the value array and
 * ALL group validation), and `Checkbox.Control` (the nestable box).
 *
 * ── WHAT THIS DEF IS, AND THE TWO SURFACES IT IS NOT ────────────────────────────────────────────
 *
 * **This def is the labelled ROW only** — the ~90% case. `CheckboxGroup` and `Checkbox.Control` are
 * separate components and are not authored here, which is worth stating rather than leaving to be
 * inferred from an absence: a reader who assumes the group is folded in will look for `orientation`
 * and `value: string[]` in `props` and conclude they were forgotten. They are in `composition` and in
 * `notes.unverified`, and both are filed as #901 rather than deferred in prose.
 *
 * So this is the first def where a brief's decomposition does NOT map one-to-one onto engine defs, and
 * that is the calibration: the brief decides a component's public surface, and a `ComponentDef`
 * describes exactly one component of it.
 *
 * ── `inherits`, WHICH IS PROSE (the rule `textarea` established, #863) ──────────────────────────
 *
 * Nothing in the engine resolves `inherits` — its only consumer is a `test.ts` assertion that records
 * the claim. So `props` here is the DELTA a human reads, while `states`, `variants`, `tokens` and
 * `paintKeys` are authored locally in full, because all four have machinery behind them and a def that
 * omitted them would project unpainted rather than inherit anything.
 *
 * The substrate inherited is `text-field`'s form-field contract — `description`/helper, `error`, the
 * `aria-describedby` wiring, `name`/`id`/`required`/`disabled`/`readOnly`. What does NOT inherit is the
 * LABEL MODEL, and the brief is explicit about why: a field's label sits above and is a string; a
 * checkbox's label sits inline-end, accepts rich content, and IS the hit target. That is three
 * differences on one prop, so `label` is restated below rather than inherited.
 *
 * ── THE `selection` AXIS: WHY IT IS A VARIANT AND NOT TWO MORE `STATES` ─────────────────────────
 *
 * `VARIANT_AXES` gains one name for this def, and its header carries the argument in full. The short
 * form, because it is the decision most likely to be revisited: `checked` as a *state* would make
 * `checked` × `hover` inexpressible — `{state}` holds one value per coordinate — and it would not fail,
 * it would FALL BACK. A hovered checked box would resolve `hover`, find the unchecked hover border and
 * paint it. #708's shape exactly: a wrong value that resolves.
 *
 * Two things follow that a reader should not have to reconstruct:
 *
 *  1. **The axis name is settled for the FAMILY, not for this def.** Radio and switch meet the same
 *     question, and three defs answering it separately is #756's failure mode. See `VARIANT_AXES`.
 *  2. **`indeterminate` is a third MEMBER of the visual axis and not a third VALUE**, and the brief is
 *     emphatic about the second half (§4: *"a third visual state, not a third value"*). Both are true
 *     and they are about different tiers: the DATA is still a boolean, which is why `indeterminate` is
 *     its own boolean prop set through the DOM property; the PAINT has three coordinates, because the
 *     dash box is a real thing that has to be coloured. Collapsing either into the other is the misread
 *     this note exists to prevent.
 *
 * ── THE PAINT GRAMMAR IS AXIS-LED LIKE EVERY OTHER DEF, AND THE EXEMPTION IS DECLARED ───────────
 *
 * `['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}']` — the axis value leads, as
 * `button`'s `{intent}` and `field-message`'s `{tone}` do. The bare `{slot}` still answers the
 * bindings that do not vary by selection (`label`) and the ones outside the grammar entirely
 * (`focus-ring`, `disabled.*`, geometry).
 *
 * **`lint-paint.ts` arm 1's premise is false for this axis, and that is recorded THERE rather than
 * worked around here.** The rule is *"an intent's paint comes from that intent's family"*; the tier
 * emits no `color.checked.*` and must not grow one, because a checked box is not a different color
 * FAMILY — it is the same interactive family in a different ROLE (`interactive.primary.*` for a filled
 * control, `field.*` for an empty one). So `selection` is declared in that gate's `NON_FAMILY_AXES`,
 * which exempts the axis once, prints the exempted binding count on every run, and fails in both
 * directions if the exemption stops doing work.
 *
 * **THIS DEF FIRST SHIPPED SLOT-LED (`fill.checked`) AND THAT WAS WRONG**, which is worth keeping
 * because the error is subtle and reusable. Arm 1 only examines a key whose LITERAL leading segment is
 * an axis value, so slot-led keys are skipped by construction — the same net coverage as an exemption,
 * with none of the visibility. It is the shape this repo's own rule forbids: **a false positive is
 * fixed by adding to the exemption list, never by narrowing a scan.** Reordering a key so the pattern
 * stops matching *is* narrowing the scan, by shape instead of by declaration. Doing it properly cost
 * ~20 renames here, paid once, and `radio` / `switch` inherit the convention for free.
 *
 * ── #871: NO SURFACE / INVERSE AXIS, AND ITS ABSENCE IS THE DECISION ────────────────────────────
 *
 * This def declares `size` and `selection` and nothing else. It does **not** declare a surface or
 * inverse axis, and the token tier's `color.interactive.primary.on-inverse.*` family is deliberately
 * unbound. Surface context is published by a CASCADE, not by a component variant — a control does not
 * ask which ground it is standing on. Stated here because checkbox, radio and switch each meet the
 * question independently and the same three-answers-to-one-question failure applies.
 *
 * ── THE RUNG OFFSET, WHERE I MET IT (#756, `docs/28` §5.2, `docs/40` §7 step 2) ─────────────────
 *
 * `size.small.gap → size.sm.gap` and `size.small.min-height → size.sm.height`, with `medium → md` by
 * the default rule rather than by this def's judgment. The def's enum is the consumer's vocabulary
 * (`small/medium/large`) and the ref is the engine's tier (`sm/md/lg`); the engine's names win. Same
 * offset the other six defs carry, recorded here because the rule is that the author records it where
 * they meet it — "the substrate already did" is how the next def stops doing so.
 *
 * One thing worth knowing about `min-height`: it binds `size.*.height`, the substrate's CONTROL-height
 * ladder (40 / 48 / 56 on nb), and it is the ROW's floor rather than a fixed height — a wrapped label
 * makes the row taller. The values land on the brief's §6 target guidance without being tuned to it
 * (≥24 for SC 2.5.8, 44 Apple, 48 Material), which is the substrate ladder already being right rather
 * than a coincidence worth relying on.
 */
import { ComponentDef } from '../component-schema';

export const checkbox: ComponentDef = {
  id: 'checkbox',
  name: 'Checkbox',
  aliases: ['check', 'tickbox', 'checkbox-field', 'checkbox-list', 'choice-list', 'multiselect'],
  category: 'form',
  status: 'draft',
  inherits: 'text-field',
  description:
    'A control for an independent binary choice that is staged into a form and submitted — on/off, included/excluded, agreed/not — optionally one of many in a set. The labelled ROW: control, rich-content label, optional description, with the whole row as the hit target. Carries the indeterminate (mixed) visual state for select-all hierarchy, which no sibling control has. Not an immediate-effect toggle (Switch), not a mutually-exclusive one-of-many (Radio), not an action with a pressed state (ToggleButton).',

  // THE DELTA ONLY (brief §3, §15). The form-field substrate — `description`/helper, `error`, the
  // aria-describedby wiring, `name`, `id`, `required`, `disabled`, `readOnly`, `onFocus`/`onBlur` — is
  // `text-field`'s and is not restated. Four exceptions, each because the substrate's version is
  // genuinely a different prop here: `label` (three differences, see the header), `onChange` (yields a
  // boolean, not a string), `size` (the gate reads the ladder — see below), and `readOnly`, restated
  // only to carry the caveat that it has no native support on this element.
  props: [
    { name: 'checked', type: 'boolean', required: false, description: 'The controlled binary. Pair with `onChange`; use `defaultChecked` for the uncontrolled form. Named for the DOM attribute rather than the framework idiom — `checked`, not `isChecked`/`isSelected` (brief §3). Inside a CheckboxGroup this is derived from the group\'s value array and a consumer should not also wire it here.' },
    { name: 'defaultChecked', type: 'boolean', default: false, required: false, description: 'Uncontrolled initial value. Never `true` for a consent checkbox — pre-checked consent is a dark pattern and, for marketing consent, often unlawful (brief §7).' },
    { name: 'indeterminate', type: 'boolean', default: false, required: false, description: 'The mixed visual state — dash glyph, `aria-checked="mixed"`. PRESENTATIONAL: the underlying value is still true/false, and this is for parent/child select-all hierarchy only, never a third state a user can click to. There is no `indeterminate` HTML attribute — it is a DOM PROPERTY (`node.indeterminate = true`), which is the single most common checkbox bug; in React apply it through a synchronous ref callback rather than a JSX prop (brief §11).' },
    { name: 'label', type: 'node', required: false, description: 'RICH CONTENT — a node, not a string. The substrate\'s label is a string above the field; this one sits inline-end, doubles as the hit target, and must be able to hold a link, because the single most common real checkbox label is a consent line with one in it ("I agree to the Terms of Service"). Omit only for the bare Checkbox.Control, which then requires an external `aria-label`/`aria-labelledby`.' },
    { name: 'onChange', type: '(checked: boolean, event) => void', required: false, description: 'Restated rather than inherited: the substrate\'s change yields a string, this one yields the resulting BOOLEAN alongside the event.' },
    { name: 'value', type: 'string', required: false, description: 'The string submitted when checked (the platform default is `"on"`), and the element this row contributes to a CheckboxGroup\'s array. The form gotcha worth knowing: an UNCHECKED box submits nothing at all rather than a false value — the missing-key trap (brief §11).' },
    { name: 'readOnly', type: 'boolean', default: false, required: false, description: 'Restated only for the caveat: `<input type="checkbox">` has NO working `readonly` — only `disabled` — so a genuinely read-only checkbox needs `aria-readonly` plus a prevented toggle, or is better rendered as static text. Decide which explicitly; the default of doing neither is a control that looks interactive and silently is not (brief §4, §11).' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales the row — the box↔label gap and the row\'s minimum height. The control square itself is NOT bound (see `notes.unverified`): the engine emits no token for a small square control, and the substrate\'s `size.*.height` is the row\'s floor rather than the box\'s edge. Re-declared rather than inherited because the ladder is read by the machinery (`lint-rung-names.ts` arm 2).' },
  ],

  // Brief §4's runtime list MINUS the three that moved to the `selection` axis (checked, unchecked,
  // indeterminate — see the header) and minus `unchecked`, which is `rest`: declaring both would be the
  // synonym the STATES census exists to catch.
  //
  // `read-only` is declared and deliberately binds NOTHING. The brief calls it "the awkward one" and
  // its own recommendation is to render static text rather than to style a locked control, so a paint
  // treatment invented here would be this def making a design decision the brief declines to make.
  // `focus-visible` also binds no per-slot key: the indicator is the nested ring, as on `button`.
  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'read-only', 'error'],

  // `size` and `selection`. No tone/emphasis axis — brief §4: "a checkbox is neutral". No surface or
  // inverse axis (#871, see the header). `alignment` and the group's `orientation`/`density` are in
  // brief §15's variants block and are NOT axes here — `notes.contested` carries both, with reasons.
  variants: {
    size: ['small', 'medium', 'large'],
    selection: ['unchecked', 'checked', 'indeterminate'],
  },

  // Slot-led, most specific first — see the header for why the slot leads. The bare `{slot}.{selection}`
  // is the REST value of its coordinate, which is why no `.rest` key is bound: a rest coordinate skips
  // the state-qualified template (it is unfillable) and falls through to it.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}'],

  tokens: {
    // ── THE UNCHECKED BOX — the form-field substrate's own chrome, since an empty checkbox is a small
    // empty field. `pressed` is unbound here on purpose: `color.field.border.*` emits `rest` and
    // `hover` only, and reaching into `interactive.neutral.*` for one state would mix two families in
    // one ladder. It falls through to the rest border (`notes.unverified`).
    'unchecked.fill': 'color.field.fill',
    'unchecked.border': 'color.field.border.rest',
    'unchecked.border.hover': 'color.field.border.hover',
    'unchecked.border.error': 'color.border.danger',

    // ── THE CHECKED BOX — a filled control, so it paints from the primary interactive family. This is
    // the half that `checked`-as-a-state could not express: `fill.checked.hover` and
    // `border.checked.hover` are the coordinates a hovered checked box actually sits at.
    'checked.fill': 'color.interactive.primary.fill.selected',
    'checked.fill.hover': 'color.interactive.primary.fill.hover',
    'checked.fill.pressed': 'color.interactive.primary.fill.pressed',
    'checked.border': 'color.interactive.primary.border.rest',
    'checked.border.hover': 'color.interactive.primary.border.hover',
    'checked.border.pressed': 'color.interactive.primary.border.pressed',
    'checked.border.error': 'color.border.danger',
    'checked.icon': 'color.interactive.primary.on-fill',

    // ── THE INDETERMINATE BOX — identical to checked at every coordinate, because only the GLYPH shape
    // differs (dash, not check). Bound explicitly rather than folded into a fallback: with nothing
    // here, an indeterminate coordinate would fall through to the bare `{slot}` — unbound for `fill`
    // and `border` — and a dash would be drawn on the unchecked white box. Verbose and visible beats
    // terse and wrong.
    'indeterminate.fill': 'color.interactive.primary.fill.selected',
    'indeterminate.fill.hover': 'color.interactive.primary.fill.hover',
    'indeterminate.fill.pressed': 'color.interactive.primary.fill.pressed',
    'indeterminate.border': 'color.interactive.primary.border.rest',
    'indeterminate.border.hover': 'color.interactive.primary.border.hover',
    'indeterminate.border.pressed': 'color.interactive.primary.border.pressed',
    'indeterminate.border.error': 'color.border.danger',
    'indeterminate.icon': 'color.interactive.primary.on-fill',

    // ── THE ROW'S LABEL — one ink at every coordinate, so it is the bare slot. It is page text sitting
    // BESIDE the control rather than value text inside a fill, which is why its disabled ink is
    // `disabled.text` (field-label's pairing) and not `disabled.on-fill` (text-field's).
    'label': 'color.text.primary',

    // ── FOCUS RING — the CONTROL ring, not the field's. `focus.ring.offset-field` is 0 by design (the
    // ring sits flush inside a field's own boundary); a checkbox's box is a small tight control that
    // the ring surrounds, so it takes `focus.ring.offset` exactly as `button` does. Bound, not
    // authored: the ring is a separate def reached through `composesWith`.
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // ── DISABLED SKIN (contrast-exempt), the shared cross-cutting family. The glyph takes the on-fill
    // ink because a disabled CHECKED box still has a fill under it; the row label takes page ink.
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.icon.on-fill': 'color.disabled.on-fill',
    'disabled.label': 'color.disabled.text',

    // ── GEOMETRY. `radius.sm` is the field radius (2 on nb) — a checkbox box is nearly square, and the
    // brief takes no position on its corner, so this follows the substrate rather than inventing one.
    'radius': 'radius.sm',
    'size.small.gap': 'size.sm.gap',
    'size.medium.gap': 'size.md.gap',
    'size.large.gap': 'size.lg.gap',
    'size.small.min-height': 'size.sm.height',
    'size.medium.min-height': 'size.md.height',
    'size.large.min-height': 'size.lg.height',
  },

  accessibility: {
    role: 'checkbox (native <input type="checkbox">), with aria-checked true / false / mixed',
    wcag: [
      '2.5.8 Target Size (the whole ROW is the target — the ~16-18px box fails in isolation)',
      '4.1.2 Name Role Value (role, checked AND mixed — `aria-checked="mixed"` must be set explicitly)',
      '1.3.1 Info and Relationships (group structure)',
      '3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion (group-level)',
      '1.4.11 Non-text Contrast / 2.4.13 Focus Appearance (control boundary and focus indicator)',
      '3.3.7 Redundant Entry (repeated consents)',
    ],
    keyboard: 'Each checkbox is its OWN Tab stop and Space toggles — the key cross-control difference from Radio, which is one Tab stop for the group with arrows moving within it. NEVER override Enter: Enter submits the enclosing form, and hijacking it breaks universal web behavior.',
    focus: ':focus-visible ring on the CONTROL, offset, at least 3:1 — keyboard traversal only, not mouse or touch. The visual box stays tight while the interactive footprint is generous: the hit target is expanded by padding on the row WRAPPER (the icon-button parallel), so clicking the label or the surrounding space toggles, giving at least 24x24 and scaling to 44 (Apple) / 48 (Material) on touch. The label sits inline-end of the control, not above it.',
    aria: 'Prefer the styled native input — `appearance: none` plus a pseudo-element or SVG keeps role, checked state and Space-to-toggle for free; a `role="checkbox"` div is a last resort and must reproduce aria-checked (true/false/mixed) exactly. Relying on the visual dash glyph alone to convey indeterminate is an accessibility failure. For a set, `role="group"` plus `aria-labelledby` is the default over `fieldset`/`legend` — both are valid, but fieldset has flexbox and grid quirks that make it hard to style predictably, and role=group on a div keeps the layout freedom while preserving the shared-label announcement. Group error and required associate to the GROUP and announce once; an individual row never owns its own required or error. When the control is nested in a host row, the host provides the accessible name through aria-labelledby — never double-label.',
  },

  content: {
    labelPattern: 'A POSITIVE statement of what becomes true when checked — "Subscribe to newsletter", never "Do not send me emails", which a user has to mentally invert in order to uncheck. Sentence case, no terminal period for a terse single-sentence label; apply punctuation only for multi-sentence or legal labels. Abstract shared words up into the group label, so "Notification preferences" lets its rows read "Email", "SMS", "Push".',
    errorPattern: 'Group-level for a set — "Select at least one option" — stating what is wrong and how to fix it (SC 3.3.3). An isolated row recolors its own boundary; inside a group the rows stay neutral and the group carries the message.',
  },

  docs: {
    usage: 'Use a single Checkbox for one independent opt-in (a consent line, "Remember me"), and a CheckboxGroup to select any number — zero to many — from a bounded set. Use the indeterminate state for a select-all broadcasting partial selection over a table or tree. Compose FieldMessage below exactly as TextField does; the host wires the ids and the aria-describedby chain. Past roughly 7-10 options, scanning and vertical space suffer and a filtering multi-select Combobox is the better control.',
    do: [
      'Make the whole row the hit target with padding on the wrapper — the visual box stays tight while the interactive footprint reaches 24x24 and beyond',
      'Set aria-checked="mixed" explicitly for indeterminate — the dash glyph alone conveys nothing to assistive tech',
      'Let the GROUP own required, validation and the value array; a row inside a group never manages its own error',
      'Accept rich content in the label, so a consent line can carry the link it needs',
      'Phrase the label positively, and state exactly what is being agreed to on a consent checkbox',
    ],
    dont: [
      'Pre-check a consent checkbox — a dark pattern, and for marketing consent often unlawful',
      'Offer indeterminate as a third state a user can click to — it is hierarchy only, set programmatically',
      'Pass `indeterminate` as a JSX prop and expect it to work — there is no such HTML attribute; set the DOM property through a ref',
      'Override Enter to toggle — Enter submits the form, and that expectation is universal',
      'Center-align the control against a multi-line label — it floats mid-paragraph and breaks the scan line',
      'Reach for a checkbox where the change takes effect instantly — that is a Switch, and the difference is staged versus immediate',
    ],
    contentGuidelines: 'The label states what becomes true when checked. Group errors read "Select at least one option" rather than "Invalid". Consent labels name the thing agreed to in full.',
  },

  ai: {
    primaryPurpose: 'Capture an independent binary choice that is staged into a form and submitted, with an associated label that doubles as the hit target and an optional indeterminate state for select-all hierarchy.',
    whenToUse: 'A single opt-in (consent, "remember me", "include X"), or any-number-from-a-set selection where the change applies on save rather than instantly. The indeterminate state when a parent row summarizes a partially-selected set of children.',
    avoidWhen: 'The change takes effect the instant it is toggled (Switch — the boundary is staged versus immediate, and only Checkbox has indeterminate), the options are mutually exclusive (Radio — any-number versus exactly-one; a two-option exclusive choice is Radio, never two checkboxes), the control is really an action with a pressed state in a dense toolbar (ToggleButton with aria-pressed), or the set runs past roughly 7-10 options (a filtering multi-select Combobox or Listbox).',
    commonPartners: ['field-label', 'field-message', 'focus-ring', 'icon', 'button', 'form'],
    triggerKeywords: ['checkbox', 'check box', 'tickbox', 'check', 'choice list', 'multiselect', 'select all', 'consent', 'terms and conditions', 'opt in'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring', 'icon', 'form'],
    alternativeTo: ['switch', 'radio', 'toggle-button', 'combobox', 'select'],
    supersedes: [
      'a bare <input type="checkbox"> with no label wiring',
      'a role="checkbox" div where a styled native input would do',
    ],
    // Nothing supersedes it for a staged binary choice. The brief corrects its own external research
    // pass here, which typed Switch and Combobox as `superseded-by`: they are sibling alternatives
    // chosen by intent and scale, not replacements. Carried so the corrected reading reaches the engine.
    supersededBy: [],
  },

  notes: {
    contested: [
      'THE PAINT GRAMMAR IS AXIS-LED and the exemption is declared per-AXIS in `lint-paint.ts` (`NON_FAMILY_AXES`) rather than per-key. RESOLVED, not open — kept here because the rejected alternative is the instructive part. This def first shipped SLOT-led (`fill.checked`), which skips arm 1 by construction, since that rule only examines a key whose literal lead is an axis value: the same net coverage, none of the visibility, and exactly the shape the house rule forbids — a false positive is fixed by adding to the exemption list, never by narrowing a scan. The other alternative, axis-led with a `PROVENANCE_EXCEPTIONS` entry per binding, was costed at roughly four times `field-message`\'s whole list for this one def; the axis-level entry replaces all twenty with one declaration that `radio` and `switch` inherit. What stays genuinely open is only the underlying fact, and it is a TOKEN-TIER claim anyone can check: the tier emits no `color.checked.*` family and should not grow one. If that stops being true, arm 1 should cover this axis and the exemption fails as no-longer-exercised, which is the direction it is checked in.',
      '`checked`/`indeterminate` as a variant AXIS rather than as two `STATES` entries. The alternative is real and cheaper: both would be admissible on the letter of that list\'s bar, since six of its ten members are already not interactions. It was rejected because `{state}` holds one value per coordinate, so `checked` x `hover` would not fail — it would fall back and paint the unchecked hover border. If a future projection shows the Figma set is better served by one flat state property, that is the trigger to revisit; it is not a reason to revisit it before the anatomy block exists.',
      '`alignment` (top/baseline vs center) is in brief §15\'s variants block and is NOT an axis here. The brief calls top/baseline "the non-negotiable default, not center", and a non-negotiable default with one admissible value is not an axis — it has no dimension. It is a layout rule for the anatomy block to encode. The alternative is to declare it and accept an axis of one, which `modifiers` already demonstrates the cost of (#845).',
      'The group\'s `orientation` and `density` are in brief §15\'s variants block and are not here because they are `CheckboxGroup`\'s axes, not this component\'s. The alternative is folding the group into this def, which is the monolithic decomposition the brief evaluates and rejects (§2).',
      '`radius.sm` for the box. The brief takes no position on the checkbox corner, and the field radius is the substrate\'s answer rather than a considered one. The alternative is `radius.none` (a square box, which several systems ship) or a dedicated control-radius rung; both are engine surface a def should not author unilaterally.',
    ],
    unverified: [
      'THE CONTROL SQUARE HAS NO BINDING, and this is the sharpest gap in the def. The brief says `size` scales the control with the type (a visual box of roughly 16-18px), and the engine emits no token for a small square control: `size.*.height` is a full control\'s height (40/48/56 on nb) and `icon.size.*` is the GLYPH artboard ladder. Binding the box to `icon.size.*` would resolve, typecheck and pass every gate while repurposing one ladder for another dimension — the #708 shape this repo watches for — so nothing is bound and the box\'s edge is unexpressible today. Filed rather than decided here, because a control-square rung is a tier decision and not a Checkbox one — #900, which radio and switch hit identically.',
      'The unchecked box has no `pressed` binding. `color.field.border.*` emits `rest` and `hover` only, so a pressed unchecked box falls through to its rest border. Reaching into `color.interactive.neutral.border.pressed` for that one coordinate would put two families on one ladder, which is the inconsistency `lint-paint.ts` arm 1 exists to see in its axis-led form. The checked and indeterminate coordinates DO paint pressed, so the gap is asymmetric — worth knowing before anyone reads the pressed row as covered.',
      '`read-only` is declared and binds nothing (see `states`). The brief calls it "the awkward one" and recommends static text over a styled locked control, so there is no treatment to bind; a consumer choosing `aria-readonly` plus a prevented toggle has no token telling them what it should look like.',
      'The whole-row hit target — at least 24x24 (SC 2.5.8), 44 (Apple) / 48 (Material) on touch — is expressed here only as `size.*.min-height`, which is the row\'s floor. Whether the padding that expands the target lands on the wrapper, and how it relates to the box\'s own inset, is an ANATOMY concern this def has no block to state. It lands with the anatomy (docs/40 Arc 2 step 5); recorded so it is not lost in between.',
      '`CheckboxGroup` and `Checkbox.Control` are separate components the brief specifies (§2) and this def does not describe. The group in particular owns real contract — the value array, group-level required/validation, `orientation` — and none of it is expressible from here. Filed as #901 rather than deferred in prose — it is a three-def decision, since radio refines this decomposition with the group made mandatory and switch with no group at all.',
      'The check-glyph micro-motion (brief §8: an SVG stroke-dasharray draw at roughly 100-150ms, morphing dash to check, bypassed entirely under prefers-reduced-motion) has no expression in the def schema at all — there is no motion field — and the engine emits `motion.duration-ms.*` that nothing here can point at.',
    ],
  },
};
