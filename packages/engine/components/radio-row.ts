/**
 * Radio — the labeled ROW that NESTS `radio-control` (#1348, the #1226/#1330 decomposition a fourth
 * time). A control for choosing exactly one from a small set of mutually exclusive, all-visible options.
 * The painted circle-and-dot moved to `radio-control`; this def is the labeled row that nests one
 * instance of it in flow, `nest-exposed`, and paints the label.
 *
 * The brief's framing, and it is the whole shape of this def: *"a lone checkbox is a valid control
 * (a consent box); a lone radio is meaningless — it only means 'one of these', and needs siblings and
 * a shared `name` to mean anything at all."* Everything below follows from that one sentence.
 *
 * ── THE DECOMPOSITION, AND THE COMPOSITION CHECK #1348 REQUIRED ─────────────────────────────────────
 *
 * #1348 (owner, 2026-09-10) decomposes radio into a nest-exposed control primitive + the Row, consistent
 * with checkbox (#1330) and switch (#1354), with one precondition: confirm something actually NESTS a
 * radio-control before building the split. It does — the radio was ALREADY a row that contains a control
 * subtree (`row → controlBox → control → {dot, focusRing}`), the exact shape checkbox had before #1226
 * and switch had before #1354, so the split produces a genuine nester: this Row nests ONE `radio-control`,
 * and the atom has a consumer. The full composition reasoning is in `radio-control.ts`.
 *
 * The Row projects a SIZE-ONLY Figma set (3 members). `selection` (unchecked/checked) and `state` live on
 * the nested `radio-control` and are EXPOSED from it — surfaced as the consumer's properties on the Row
 * (Figma exposed nested-instance properties; React props; `.ai.json` options) — so the consumer drives
 * them from the parent instead of the Row re-enumerating them into its OWN variant matrix. Before #1348
 * the radio declared `variantAxes: ['selection', 'size']` + a 6-value `stateAxis` and authored the
 * circle/dot in place: 2 × 3 × 6 = 36 members. The collapse is 36 → 3; the atom carries the 36.
 *
 * ── THE PRISM 2 VISUAL LIVES ON THE ATOM (#1348 point 2) ───────────────────────────────────────────
 *
 * The owner's decision also swapped the treatment: the pre-split radio painted a FILLED disc with an
 * on-fill dot (checkbox's treatment at a round radius), and selection read as the ring thickening into a
 * solid circle. The Prism 2 visual is a constant-WEIGHT outlined ring (no fill) at both selections, with
 * an inner filled circle appearing on select — the border never becomes the cue. That painted treatment
 * is `radio-control`'s now; the Row carries none of it. The full reasoning, the page-dot contrast
 * consequence, and why the ring stays constant in color as well as weight are in `radio-control.ts`.
 *
 * ── THE GROUP IS MANDATORY, AND ITS ABSENCE HERE IS A DECISION RATHER THAN AN OVERSIGHT ─────────────
 *
 * `checkbox` said `CheckboxGroup` is a separate component and could afford to leave it at that, because a
 * checkbox alone is a complete control. **Radio cannot.** Name-grouping is what makes this a radio rather
 * than a toggle, so the question `checkbox` deferred is load-bearing here, and this paragraph exists so
 * the omission cannot be read as a gap somebody forgot to fill.
 *
 * **The answer is still: `RadioGroup` is a separate component, filed as #901, and not authored in this
 * def.** Radio sharpens that issue rather than changing its answer, and the sharpening is worth stating
 * because it is what a `ComponentDef` structurally cannot express:
 *
 *   · **The group owns the shared `name`**, which is what enforces exclusivity at the browser level.
 *     A `Radio` never sets its own — doing so breaks exclusivity outright.
 *   · **The group owns a single SCALAR value**, where `CheckboxGroup` owns an array. Selection here
 *     is *derived*, not held: `checked = (group.value === props.value)`.
 *   · **The group is a SINGLE TAB STOP** with roving tabindex and arrow navigation between options.
 *   · **The group owns `orientation`, `required` and all validation**, announced once.
 *
 * None of that is expressible from an option. So this def describes the OPTION, honestly and
 * incompletely, and the incompleteness is structural rather than a scoping choice: a `ComponentDef`
 * describes one component, and the unit of use here is two (three, since the control split).
 *
 * ── `inherits`, AND A LIMIT OF THE FIELD THAT RADIO IS THE FIRST TO MEET ────────────────────────────
 *
 * `inherits: 'checkbox-row'` (renamed from `checkbox`, #1347). The brief's §15 states
 * `inherits: [text-field, checkbox]` — **a chain** — and `ComponentDef.inherits` is a single string, so the
 * chain cannot be written down. The nearest parent is named and the rest is this sentence: the form-field
 * substrate (`description`/helper, `error`, the `aria-describedby` wiring, `name`/`id`/`required`/`disabled`/`readOnly`)
 * reaches this def *through* `checkbox-row`, along with the Row's own shape — the rich-content label that doubles as the hit
 * target, top-baseline alignment, and native DOM naming.
 *
 * As on `textarea` and `checkbox`, **nothing in the engine resolves `inherits`**: it is prose for a
 * human, `props` is the delta a human reads, and `states`/`variants`/`tokens`/`paintKeys` are authored
 * locally in full because all four have machinery behind them.
 *
 * ── THE SHARPEST API DIFFERENCE IS THREE PROPS THAT ARE NOT HERE ────────────────────────────────────
 *
 * **`Radio` has no `checked`, no `onChange` and no `name`** — all three live on the group, and the option
 * reads selection from context and dispatches the group's callback. That is the cleanest contrast with
 * `checkbox`, whose standalone box owns its own boolean, and `props` has no way to express an absence, so
 * it is stated here and in `docs.dont` rather than left to be noticed.
 *
 * `value` is consequently **required** here, where checkbox's is optional: it is this option's identity
 * within the group, not a string that happens to be submitted.
 *
 * ── WHAT §15 CALLS RADIO-SPECIFIC STATES, TWO OF WHICH ARE NOT STATES ──────────────────────────────
 *
 * Brief §15 lists `radio-specific: [selected, no-deselect, no-indeterminate]`: `selected` is the
 * `selection` AXIS (now on the atom); `no-deselect` is a BEHAVIOUR (activating a selected radio does
 * nothing), and behaviors have no coordinate; `no-indeterminate` is an ABSENCE, which is a thing you
 * cannot declare at all. So `states` is checkbox's seven exactly, and this note stops the next reader
 * concluding three were dropped. These drive the CODE projection (a disabled Row dims its label); the
 * Figma set is size-only (the nested control's `state` is exposed). `read-only` is admitted in `codeOnly`.
 */
import { ComponentDef } from '../component-schema';

export const radioRow: ComponentDef = {
  id: 'radio-row',
  name: 'Radio.Row',
  // The brief's list, kept intact, with the pre-#1468 bare id `radio` retained as an alias (the
  // `checkbox-row` precedent, whose aliases keep `checkbox`). The `radio-group` alias was a FORWARD
  // REFERENCE — kept only so an agent reaching for the not-yet-built group landed on the nearest thing that
  // existed. #1469 built `radio-group` as its own def, so the alias is removed: `radio-group` now resolves to
  // the group, and this def is the OPTION (its description says so).
  aliases: ['radio', 'radio-button', 'option', 'choice-list'],
  category: 'form',
  status: 'draft',
  inherits: 'checkbox-row',
  description:
    'A control for choosing exactly one from a small set of mutually exclusive, all-visible options — 2 to about 7, where seeing them all aids the decision. This def is the labeled OPTION: it nests a Radio.Control (the outlined circle and its inner selection dot) and carries the option label, with the whole row as the hit target. The group is a separate component and is MANDATORY, because a lone radio is meaningless: it owns the shared name that enforces exclusivity, the single selected value, the single tab stop, and all validation. Selection is derived from the group, never held here. Not any-number selection (Checkbox), not an immediate on/off (Switch), not the same choice collapsed (Select) or in a compact skin (Segmented Control).',

  // THE DELTA ONLY. The form-field substrate reaches this def through `checkbox` and is not restated.
  // THREE PROPS ARE DELIBERATELY ABSENT — `checked`, `onChange` and `name` all live on the group (see
  // the header); `props` cannot express an absence, so `docs.dont` carries it too.
  props: [
    { name: 'value', type: 'string', required: true, description: 'REQUIRED, where checkbox\'s is optional — this is the option\'s identity within its group, not a string that happens to be submitted. Selection is derived from it: `checked = (group.value === props.value)`. The option never holds a boolean of its own.' },
    { name: 'label', type: 'node', required: false, description: 'Rich content, inline-end of the control, and part of the hit target — checkbox\'s label model, inherited. Option labels are parallel, mutually exclusive and brief: the same grammatical shape across the set, with no overlap that would make two options both apply. Long labels WRAP rather than truncate, with the control top-anchored. Per-option detail or price belongs in `description`, not in the label.' },
    { name: 'description', type: 'node', required: false, description: 'Per-option helper beneath the label, describedby-wired. This is where the detail that makes an option distinguishable goes — the price, the delivery estimate, the caveat.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales the row — the control-to-label gap, the row\'s minimum height, the label\'s type — and is passed through to the nested Radio.Control by `follow`, scaling the circle\'s diameter and the inner dot\'s.' },
  ],

  // Checkbox's seven exactly. Brief §4 inherits them and adds three "radio-specific" entries, none of
  // which is a state — see the header. These drive the CODE projection (a disabled Row dims its label);
  // the Figma set is size-only (the nested control's `state` is exposed). `error` is declared and its
  // binding is the option's own boundary, but the brief is emphatic that radio error is GROUP-level only,
  // never per-option. `read-only` binds nothing and is admitted in `codeOnly`.
  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'read-only', 'error'],

  // `size` ONLY since #1348 (the decomposition). `selection` LEFT the Row's variant matrix — it is now
  // EXPOSED from the nested `radio-control` (the consumer drives it from the parent). `size` STAYS the
  // Row's own axis: it scales the label's type ramp, the gap and the row's min-height — things the nested
  // control does not touch — so it is not merely the control's axis. No tone/emphasis. No surface/inverse
  // axis (#871). The group's `orientation`/`density` are the GROUP's and are not here.
  variants: {
    size: ['small', 'medium', 'large'],
  },

  // ONE KEY GROUP since #1348: the painted circle/dot moved to `radio-control`, so the Row's whole color
  // surface is the label ink (the bare slot). The `{selection}`-led templates went with the disc; keeping
  // them here with nothing selection-dependent left to resolve would be unreachable keys.
  paintKeys: ['{slot}'],

  tokens: {
    // ── THE ROW'S OWN PAINT IS ONE INK: THE LABEL. Every color binding for the ring, the inner dot, the
    // focus ring and the border MOVED to `radio-control` with the painted surface itself. The label sits
    // BESIDE the control rather than on its fill, which is why its disabled ink is `disabled.text`
    // (field-label's pairing) and not `disabled.on-fill`.
    'label': 'color.text.primary',
    'disabled.label': 'color.disabled.text',

    // ── THE ROW'S TOP/BOTTOM PADDING (#1433b). Prism 2's radio-button-row root sits its content in
    // `padding {top: 12, bottom: 12, start: 0, end: 0}` (`reference/Prism2/component-specs/radio-button-row.json`),
    // a CONSTANT block inset (the same 12 on the 48-tall checkbox row and the 56-tall radio row — it does
    // not scale with `size`), so `pad-y` binds `space.150` (= 12px on nb, the nearest existing spacing step
    // and an EXACT match — no new scale rung minted, CONTRACT holds). The INLINE sides are zero — Prism 2's
    // `{start: 0, end: 0}` — so `pad-x` binds `space.0` (0px, emitted in every brand tier): `PaddingDef.inlineLabel`
    // is REQUIRED, so a literal-zero slot rather than an omission, exactly as `checkbox-group` binds its own.
    'pad-y': 'space.150',
    'pad-x': 'space.0',

    // ── THE CONTROL-TO-LABEL GAP and the ROW'S FLOOR. `min-height` is the code projection's floor; Figma
    // has no floor, so the row hugs its children and the key stays bound only for code (see `codeOnly`).
    'size.small.gap': 'size.sm.gap',
    'size.medium.gap': 'size.md.gap',
    'size.large.gap': 'size.lg.gap',
    'size.small.min-height': 'size.sm.height',
    'size.medium.min-height': 'size.md.height',
    'size.large.min-height': 'size.lg.height',

    // ── THE ALIGNMENT BOX (#1201, building #1009's filed fix). One line of the LABEL tall, per rung — the
    // baked `body.{rung}` line-box. The nested control centers inside a box this tall while the ROW stays
    // top-aligned, so a single-line option reads centered and a wrapping one holds the first line rather
    // than floating mid-paragraph. Option labels wrap by design here, so this matters more than on
    // checkbox. The control centers within its OWN box, never the row — `test.ts` #1009 half-1.
    'size.small.control-box': 'control.size.sm.line-box',
    'size.medium.control-box': 'control.size.md.line-box',
    'size.large.control-box': 'control.size.lg.line-box',

    // ── THE NESTED CONTROL'S OWN SQUARE (#1348). The `control` nest part binds this so the nested instance
    // is PINNED to the control square — 16/20/24 on nb, 12/16/20 on aurora — and does NOT stretch to fill
    // the taller `control-box` line box it is centered within. Radio's control is SQUARE (a circle
    // inscribed in it), so the Row pins via `size` (both axes from one key), exactly as checkbox does —
    // where switch, a non-square track, pinned `height` alone. `control.size.*.height` and NOT `icon.size.*`
    // for the same reason the atom binds it (the control ladder shifts a rung with brand density where the
    // glyph grid is fixed). The atom (`radio-control`) binds the identical key on its own root.
    'size.small.control': 'control.size.sm.height',
    'size.medium.control': 'control.size.md.height',
    'size.large.control': 'control.size.lg.height',

    // ── THE ROW'S TYPE, checkbox's reasoning unchanged: running text BESIDE a control, not a name
    // announcing a field above one, and `type.label.*` emits only `sm`/`md` so `large` would have no rung
    // to reach. `type.body.*` is the only family in the tier carrying all three.
    'size.small.text': 'type.body.sm.default',
    'size.medium.text': 'type.body.md.default',
    'size.large.text': 'type.body.lg.default',
  },

  // ── ANATOMY — THE LABELED ROW THAT NESTS THE CONTROL (#910, #1348) ─────────────────────────────────
  //
  // Three parts now, not five: the whole ROW is the hit target, `controlBox` is the #1201 line-box
  // wrapper, and its CHILD is a `nest` of `radio-control` where the circle, dot and focus ring used to be
  // authored in place. The atom paints itself; the Row paints the label. This is the composition #1226
  // asked for and #1330/#1354 proved twice — a shared control single-sourced, a fix to it propagating here.
  //
  // THE ROW MUST NOT CENTER. Option labels wrap by design (the guidance is to wrap rather than truncate,
  // keeping per-option detail in `description`), so `align: center` here would float the disc to the
  // middle of a two-line option, the wrong repair `test.ts` #1009 half-1 forbids. The row stays
  // top-aligned (`align: start`) and the centring lives one level down, in `controlBox`, which is one
  // line-box tall — landing the disc on the first line (#1201).
  anatomy: {
    root: 'row',
    parts: {
      // THE HIT TARGET, and nothing else. No `paintSlots` (#933): structure, and this def keys no
      // row-level fill or border for it to name. Its extent comes from its children — `min-height` is in
      // `codeOnly` for checkbox's reason, that Figma has no floor.
      row: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        // TOP/BOTTOM PADDING (#1433b) from Prism 2's row (`space.150` = 12px on nb); inline sides zero
        // (`space.0`). See the `pad-y`/`pad-x` tokens above for the source and why inline is a literal zero.
        padding: { block: 'pad-y', inlineLabel: 'pad-x' },
        // THE WIDTH FLOOR THAT LETS THE LABEL WRAP (#1424). A hugging row is exactly as wide as its
        // children, so a `layoutGrow` label would have no remaining space to fill and would hug its own
        // text and overflow. `minWidth` gives the row a comfortable floor — Prism 2's radio-button-row
        // `root width 320` — so the label FILLS the remainder and WRAPS (the `select` precedent, #1345:
        // a literal projection floor, not a bound token, so CONTRACT holds). The row still HUGS above the
        // floor, so a short option stays compact. Real-host wrap is offline-unverified (see notes).
        minWidth: 320,
        children: ['controlBox', 'label'],
      },
      // THE ALIGNMENT BOX (#1201, building the fix #1009 filed). One line of the label tall
      // (`size.{size}.control-box` → the baked `body.{rung}` line-box), centring the disc on its cross
      // axis. Draws nothing — it exists only to give the disc a line-tall box to center within, so the
      // top-aligned row holds it on the FIRST line of a wrapping option. Height FIXED; width HUGs the disc.
      controlBox: {
        kind: 'box',
        role: 'presentation',
        height: 'size.{size}.control-box',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        children: ['control'],
      },
      // THE NESTED CONTROL (#1348). Where the circle, dot and focus ring used to be authored in place, the
      // Row now nests ONE instance of `radio-control` — an in-flow `kind: 'nest'`, the twin of the
      // `absolute` focus ring but taking a cell. A fix to the disc (its border weight, its round radius,
      // its dot geometry) reaches here without being copied.
      //
      // IT IS `nest-exposed` (#1330's mechanism). The control's `selection` and `state` are EXPOSED —
      // surfaced as the consumer's properties on the Row rather than re-enumerated into the Row's OWN
      // variant matrix — so the Row projects SIZE-ONLY (3 members) instead of 2 selections × 3 sizes × 6
      // states = 36 that merely mirror the atom. `follow: ['size']` passes the Row's own size rung into
      // the nested control; `variant` is the DEFAULT the instance starts at (`selection=unchecked,
      // state=rest`), the member the exposed properties drive FROM.
      //
      // IT PINS ITS OWN SQUARE and does NOT stretch. `size: 'size.{size}.control'` (→ `control.size.*.height`,
      // 16/20/24 on nb) binds the instance to the control square, which is SHORTER than the `control-box`
      // line box (21/24/27) it is centered within — so the small control reads centered on the first line
      // rather than filling the taller box. Radio's control is square, so the pin is `size` (both axes),
      // like checkbox; `test.ts` #1201 asserts the pin by name, so a change binding the line box here
      // instead — which would stretch the control — fails rather than ships.
      control: {
        kind: 'nest',
        nests: 'radio-control',
        size: 'size.{size}.control',
        nesting: { kind: 'nest-exposed', variant: { selection: 'unchecked', state: 'rest' }, expose: ['selection', 'state'], follow: ['size'] },
        note: 'An in-flow instance of `radio-control` taking the control cell inside the line-box wrapper. It EXPOSES the control\'s selection and state (the consumer drives them from the Row), follows the Row\'s size, and binds its own square so it is centered within the taller wrapper rather than stretched to fill it.',
      },
      // No `paintSlot` — the default is `label`, and at `disabled` the projector reaches `disabled.label`
      // (page ink) rather than `disabled.label.on-fill`, because this text sits beside the control and not
      // on a fill.
      label: {
        kind: 'text',
        type: 'size.{size}.text',
        // WRAPS rather than overflows (#1424). Long option labels are the design intent (`content.labelPattern`
        // says wrap, not ellipsis), so the label FILLS the row's main axis and reflows while the top-aligned
        // row holds the control on the first line (#1201). The row's `minWidth` floor is what gives the fill
        // something to resolve against — `anatomyErrors` requires it.
        wrap: true,
        note: 'The accessible name AND the second half of the hit target. Rich content in code; a plain text node in Figma. It WRAPS to a second line rather than overflowing (#1424) — it fills the row\'s main axis and reflows. Note that the accessible name of the CHOICE is the group\'s label, which no part here can carry — an option label alone announces "radio button, 1 of 3" with no indication of what is being chosen.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word, so a
      // passing mention inside an entry about something else does not count (#563).
      'read-only — a `states` value the Figma set does not carry. Since #1348 the Row projects a SIZE-ONLY set (no stateAxis): the control\'s `state` is EXPOSED from the nested `radio-control` and the consumer drives it from the Row, so no state is enumerated into the Row\'s own matrix. read-only binds NOTHING even in code: a radio has no working native readonly, so there is no treatment to project, and six variants byte-identical to `rest` would read as coverage of a state nobody has designed.',
      'states — the documented cost of collapsing 36 members to 3 (the #1348 decomposition). A disabled Row in Figma shows the disabled CONTROL (the exposed state) beside a full-ink label, because the Row no longer multiplies state. The Row\'s own per-state LABEL treatment (`disabled.label` dimming the text) is the CODE projection\'s, not Figma\'s — `lint-paint` arm 2 reads `def.states` for reachability, so `disabled.label` stays reachable and keyed for code while the Figma SET collapses to size-only.',
      'min-height — `size.*.min-height` is the row\'s FLOOR and Figma has no floor. `PartDef` carries `height`, which is fixed, so binding it here would state the wrong quantity and clip a wrapping option label at the one coordinate that matters most. The row hugs its children instead and the keys stay bound for the code projection, where `min-height` is the property they name.',
      'THE GROUP, which is the unit of use and is not this def (#901). The shared `name` that enforces exclusivity, the single scalar value selection is derived from, the single tab stop with roving tabindex and arrow navigation, `orientation`, `required` and all validation live there. A Figma set of options can show what an option looks like at every coordinate and cannot show a group at all — so the exclusivity that makes these radios rather than toggles is absent from the projection by construction, not by omission.',
      'The whole-row hit target beyond the row\'s own extent. SC 2.5.8 wants 24x24 and Apple/Material want 44/48 on touch; the row reaches that at `medium` and not at `small`, and the padding that would expand it is a per-consumer decision about the surrounding layout. `row` is the node it lands on — that is what this block makes expressible — but the value is not the def\'s to pick.',
      'The `description` prop — per-option helper text beneath the label, which is where the detail that distinguishes options goes (a price, a delivery estimate). It is a second text part under `label` rather than beside it, and adding it would double the row\'s vertical shape for content that is optional at every one of the three members. Left to the code projection, where it is describedby-wired.',
      'The select micro-motion and the SIBLING\'s dot animating out — the only exit animation a radio has. It lives on `radio-control` now (the dot moved there with the painted surface), and neither the def schema nor a Figma variant carries motion, so the dot is static at every coordinate.',
    ],
  },

  figmaProperties: {
    // SIZE ONLY since #1348 (the decomposition). `selection` and `state` are EXPOSED from the nested
    // `radio-control` (see the `control` part), so the Row no longer enumerates them — it projects 3 size
    // members where it used to project 2 selections × 3 sizes × 6 states = 36 that only mirrored the atom.
    // The `control` nest `follow`s `size` (the one axis this def projects) and exposes the rest; `#1298`'s
    // reachability check confirms `size` is projectable, and the exposed axes are the child's — checked
    // against the atom at projection (`nestVariantMatch`) and round-trip, not here.
    variantAxes: ['size'],
    // NO `stateAxis` (#1348). The control's `state` is exposed, not multiplied into the Row's set — the
    // Row's own `states` list (above) still drives the CODE projection (a disabled Row dims its label),
    // and `lint-paint` arm 2 reads `def.states` for reachability so `disabled.label` stays reachable; it
    // is the FIGMA set that collapses.
    texts: {
      // A REAL OPTION from a real group, not "Label" — #798's finding is that a text part with no TEXT
      // property projects a blank node, and the corollary is that the default is the only copy anyone
      // reviewing the set will see. A shipping method is the canonical example in `docs.usage`, and it
      // demonstrates the content rule at the same time: parallel, brief, sentence case, no terminal stop.
      // GENERIC illustrative scaffold ("Radio option"), not a realistic choice (#1434, owner-directed;
      // REVERSES #798): the shipped placeholder reads as obviously replaceable, not as a real product's
      // option (voice-standard §1 recessive).
      label: { part: 'label', default: 'Radio option' },
    },
    // No `swaps` — the Row nests `radio-control` and exposes its selection/state (the def picks the
    // control, the consumer drives it), and the dot gated by `presentWhen` lives in that atom now. No
    // `slotAxes`.
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
    focus: ':focus-visible ring on the CONTROL, offset, at least 3:1, keyboard traversal only — and CIRCULAR, because the control is full-round and the ring is derived concentrically from it. The ring must appear INSTANTLY — fading it lags rapid arrow navigation. Selection FOLLOWS FOCUS by default: arrowing moves focus and selects, which is native <input type="radio"> behavior and the APG default, and the catalogue keeps native semantics rather than reimplementing them. The known cost is that a screen-reader user exploring the options fires onChange at every step; the answer is to keep radio onChange CHEAP — a radio selection must never trigger navigation or expensive work — and to decouple selection from focus only as a deliberate, documented exception. On focus restore into the group (a validation error, a legend click), focus the CHECKED radio rather than blindly the first; if none is checked, the first non-disabled option.',
    aria: 'Prefer the styled native input — appearance: none plus a pseudo-element or SVG keeps role, checked state, exclusivity and the roving-tabindex keyboard model for free. For the container, role="radiogroup" plus aria-labelledby is the default over fieldset/legend, for the same CSS-layout reason as checkbox. THE GROUP LABEL IS MANDATORY FOR MEANING: without it assistive tech announces an orphaned "radio button, 1 of 3" with no indication of what is being chosen. Group error and required associate to the group and announce once; an option never owns its own error. On mobile (Jetpack Compose) put the click target on the ROW rather than the dot — selectableGroup() on the parent, selectable(role = Role.RadioButton) on the row, and onClick = null on the RadioButton itself — or the control double-fires and assistive tech announces twice.',
  },

  content: {
    labelPattern: 'Parallel, mutually exclusive, scannable — the same grammatical shape across the set, brief, sentence case, no terminal punctuation, and no overlap that would let two options both apply. Long labels wrap rather than ellipsis-truncate, with the control centered within the first line-box so it stays on the first line rather than floating mid-paragraph. The GROUP label names the decision or asks the question ("Shipping method", "How should we contact you?") and may be visually hidden when an enclosing labeled section already frames it, but must stay programmatically present.',
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
    primaryPurpose: 'Present one option within a mutually exclusive set via a labeled row that nests the circle-and-dot control, deriving its selected state from the group that owns the value.',
    whenToUse: 'Exactly one of 2 to about 7 all-visible options where seeing them together aids the decision, and the choice is committed on submit rather than applied instantly. Always as a child of a RadioGroup.',
    avoidWhen: 'Any number of options may be selected (Checkbox — never model an exclusive choice as several checkboxes), the change applies immediately (Switch — and never two radios for a true/false toggle), the set runs past about 5 to 7 or vertical space is tight (Select, the collapsed alternative), the choice is a dense frequent view-switch (Segmented Control, which carries a different accessibility model), or it is really an action (Button). Also do not reach for this def when what is wanted is the GROUP: use `radio-group`, which owns the name, the value and the validation.',
    commonPartners: ['radio-control', 'radio-group', 'field-label', 'field-message', 'focus-ring', 'form', 'card'],
    triggerKeywords: ['radio', 'radio button', 'radio group', 'option', 'choice list', 'single select', 'exactly one', 'pick one', 'mutually exclusive'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['radio-control', 'radio-group', 'field-label', 'field-message', 'focus-ring', 'form'],
    alternativeTo: ['checkbox-row', 'switch-row', 'select', 'segmented-control', 'toggle-button'],
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
      'THE VISUAL IS THE PRISM 2 OUTLINED MODEL — a constant-weight ring with an inner circle on select — on the owner\'s decision (#1348), REPLACING the pre-split filled disc. The treatment and the named brand-ring-recolor alternative live on `radio-control`, where the painted surface does; this entry records only that the fork the pre-split radio kept open ("filled wins over the outlined model") is CLOSED, superseded by the owner matching Prism 2. Do not re-argue it here; if the treatment moves, move it there.',
      'THE PAINT GRAMMAR IS AXIS-LED, inherited from `checkbox` rather than re-decided, and the exemption that makes it legal is declared once per AXIS in `lint-paint.ts` (`NON_FAMILY_AXES`). Since #1348 the grammar and the exemption live on `radio-control` (the Row paints only the label, so its `paintKeys` is the bare slot alone). Recorded here only so this def is not read as a second independent vote.',
      'The group\'s `orientation` and `density` are in brief §15\'s variants block and are not axes here, because they are `RadioGroup`\'s. Unlike checkbox, where that was a tidy boundary, here it means the def is missing an axis its unit of use genuinely has — see #901.',
      'Carbon\'s "AI presence" variant, which sets an AI-explainability label beside a recommended option, is named in brief §4 as a frontier signal and explicitly "a watch item, not a default". Not declared. It is also a dual-action row needing careful focus management so assistive tech does not conflate the explainer control with the radio, which makes it an anatomy question rather than an axis one.',
      'Selection-follows-focus is the practice default and the external research pass argued the opposite (explicit selection, Space to commit), citing the screen-reader-exploration trap and Windows gamepad behavior. Recorded because the contrary position is legitimate and reasoned rather than wrong: the resolution is that follows-focus is native and the APG default, and the exploration cost is better paid by keeping `onChange` cheap than by reimplementing the platform.',
    ],
    unverified: [
      'THE DECOMPOSITION IS UNVERIFIED ON A REAL HOST, the same way `checkbox-control`\'s and `switch-control`\'s were: the nested control instance must pin its own SQUARE (the control edge) rather than stretch to the `control-box` line box, and whether the instance\'s inherited sizing mode cooperates with the row\'s auto-layout is a real-host question the offline shim cannot answer. The symptom to look for: a control instance stretched to the line-box height instead of centered within it. Radio\'s control is SQUARE, so the Row pins via `size` (both axes), the same as checkbox.',
      'THE FOCUS RING MUST APPEAR INSTANTLY (brief §6, §8) — a fade lags rapid arrow navigation through a group, which is a radio-specific constraint that checkbox does not have. The engine emits `motion.duration-ms.*` and the Row has no motion field to point at, so the requirement lives in `accessibility.focus` prose and nothing checks it. The ring\'s SHAPE, by contrast, is handled: F2 (#1388) derives it concentrically, so a full-round control yields a circular ring (`radio-control.ts`).',
      'The select micro-motion (a spring/scale-up of the dot at roughly 100-150ms, and — uniquely — a sibling\'s dot animating OUT, the only exit animation a radio has) now lives on `radio-control` with the dot, and has no expression in the def schema at all.',
      '`RadioGroup` and `Radio.Control` are the two companions. `radio-control` is now a real def (#1348, the atom this Row nests). `RadioGroup` is still deferred (#901), and for radio it is MANDATORY rather than optional: the shared `name`, the single scalar value, the roving-tabindex single tab stop, `orientation`, and all validation live there, and none of it is expressible from an option. Recorded in the header at length for that reason.',
      'The whole-row hit target is expressed as `size.*.min-height`, the row\'s floor, and `anatomy.parts.row` is the node the expanding padding would land on. What is still unstated is the VALUE: the row clears SC 2.5.8\'s 24x24 at `medium` and not at `small`, and how much padding to add is a decision about the surrounding layout rather than a property of this component. Admitted in `anatomy.codeOnly` rather than guessed at.',
    ],
  },
};
