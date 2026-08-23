/**
 * Switch — the control that CLOSES the selection-control decomposition arc, and closes it by
 * SUBTRACTING (KB `components/switch.md`, `docs/40` §7). A binary on/off setting that takes effect
 * immediately: no save, no submit, the flip IS the input and the execution command.
 *
 * The brief's framing, and everything below follows from one word: *"a switch applies its change the
 * instant you flip it, and everything contested about the component — the async model, the ARIA role,
 * the motion, even the label — follows from taking `immediate` seriously."* The boundary with checkbox
 * is therefore TOPOLOGICAL rather than visual: if a Save/Submit button sits anywhere in the flow the
 * change is staged and it is a Checkbox; if the change is live the instant you toggle, it is this.
 *
 * ── THERE IS NO `SwitchGroup`, AND THAT ABSENCE IS THE ARC'S CLOSING MOVE ────────────────────────
 *
 * `checkbox` filed the group as a separate component (#901) and could afford to leave it there.
 * `radio` could not — name-grouping is what makes a radio a radio — and said so at length. **Switch
 * removes the group entirely**, and both of the brief's research passes confirmed that without
 * hesitation. So the three defs read: checkbox OPTIONAL group, radio MANDATORY, switch NONE.
 *
 * This is the one place in the family where an omission is a decision that needed making rather than
 * a def that is missing a piece. A settings panel of switches (Email / SMS / Push) is a **List of
 * rows** — layout — and not a selection group: each switch fires its own distinct instant mutation
 * and owns its own independent boolean. Shipping a `SwitchGroup` would actively INVITE the
 * anti-pattern of using switches to compile a multi-select array, which is checkbox's job. #901 is
 * therefore narrowed rather than widened by this def: it covers checkbox's and radio's groups, and
 * switch adds nothing to it.
 *
 * ── `selection: [off, on]` — A DECISION TAKEN, NOT A DEFAULT INHERITED (#910) ────────────────────
 *
 * #910 settled the axis NAME for the family and deliberately left the VALUES open, with the
 * recommendation that they follow ARIA — `aria-checked` covers `checkbox`, `radio` **and**
 * `role="switch"` — and with the instruction that *"a switch spelling its axis `[off, on]` should be
 * a decision somebody takes rather than a default nobody noticed."* Taking it: **`[off, on]`**,
 * against the recommendation, on three grounds that are about what the values are FOR.
 *
 *   1. **The values are the paint-key vocabulary, and paint keys describe what is on screen.** These
 *      strings appear nowhere in an ARIA tree — they lead `off.fill`, `on.fill.hover`, and they are
 *      read by a designer looking at a Figma variant and by `paintOf` resolving a coordinate. What
 *      `aria-checked` is spelled in the DOM is a fact about the implementation, and this def already
 *      records it in `accessibility.role` where it is checkable prose. The two do not have to agree
 *      because they answer different questions, and #910's own asymmetry — *names close, values stay
 *      open* — is precisely the room to say so.
 *   2. **`role="switch"` is announced "ON" and "OFF", not "checked" and "unchecked."** That is the
 *      whole reason the role exists rather than reusing `role="checkbox"`, and the brief calls the
 *      distinction *"the whole game"*. So ARIA's *property* is `aria-checked` while ARIA's *output*
 *      is on/off — and following the recommendation to the letter would make the def's vocabulary
 *      disagree with what a screen-reader user actually hears.
 *   3. **`checked` is the word that carries the misuse.** Reaching for a switch when the change is
 *      staged is this component's most common defect (the brief's progressive-disclosure trap), and
 *      it is a checkbox that a consumer wanted. A def whose axis is spelled `[unchecked, checked]`
 *      reads as a checkbox with a different skin, which is exactly the 2016-era mistake §13 says the
 *      field spent a decade correcting.
 *
 * **What this costs, stated because it is the reason #910 asked for a decision rather than a
 * preference.** The family's three defs now spell one axis two ways — `[unchecked, checked,
 * indeterminate]`, `[unchecked, checked]`, `[off, on]` — and **nothing in the engine checks that, or
 * can.** `VARIANT_AXES` closes NAMES; there is no cross-def values census anywhere (measured: the
 * only census in the corpus is the authored prose table in `component-schema.ts`, and it counts DEFS
 * per axis, not values). So this divergence is invisible to every gate and is held by the schema's
 * census paragraph and this header alone. If the family should have one vocabulary, `[off, on]` is
 * the entry to delete — and the argument above is what has to be defeated, not the count.
 *
 * ── `inherits`, AND THE SAME TWO-LINK CHAIN RADIO COULD NOT WRITE DOWN ──────────────────────────
 *
 * `inherits: 'checkbox'`. Brief §15 states `inherits: [text-field, checkbox]` — a chain — and
 * `ComponentDef.inherits` is a single string. So the nearest parent is named and the rest is this
 * sentence: the form-field substrate (`description`/helper, `error`, the `aria-describedby` wiring,
 * `id`/`disabled`/`readOnly`) reaches this def THROUGH `checkbox`, along with checkbox's own row
 * shape — the rich-content label that doubles as the hit target, and native DOM naming.
 *
 * As on `textarea`, `checkbox` and `radio`, **nothing in the engine resolves `inherits`**: it is prose
 * for a human, `props` is the delta a human reads, and `states`/`variants`/`tokens`/`paintKeys` are
 * authored locally in full because all four have machinery behind them.
 *
 * ── THE LABEL SIDE IS THE FIRST DIVERGENCE FROM ITS TWO SIBLINGS, AND IT IS NOT AN AXIS ─────────
 *
 * Brief §3 is emphatic that this is switch's structural divergence: the label LEADS and the control
 * TRAILS, because a switch's habitat is a settings row where the eye expects the toggle at the
 * trailing edge — the opposite of checkbox and radio, where the control leads. The brief exposes it
 * as a `labelPosition` prop and defaults it to `leading`.
 *
 * **It is a PROP here and not a `variants` axis, deliberately.** `variants` is what the projector
 * crosses into coordinates and what `paintOf` resolves against, and label side changes no ink at any
 * coordinate — it reverses a row's `direction`. That makes it an ANATOMY concern (a `LayoutDef`
 * field), and this def has no anatomy block to hold it. Declaring it as an axis would double every
 * paint coordinate for a distinction that paints nothing: #758's shape, a member that projects and
 * has no color to carry. Recorded in `notes.unverified` as the anatomy-tier requirement it is.
 *
 * ── `pending` IS DECLARED, AND IT IS THE ONLY DEF IN THE FAMILY THAT DECLARES IT ────────────────
 *
 * Brief §4 calls loading/pending *"first-class here — the state that exists BECAUSE immediacy meets
 * latency"*, and §3 makes the async contract the load-bearing switch-specific API: optimistic by
 * default (immediacy is the point), revert-and-message on failure, plus a first-class `pending` lock
 * for high-latency or critical toggles where an inconsistent intermediate is genuinely harmful.
 *
 * `pending` is already in `STATES` (#843 put it there for `button`, and `text-field`/`textarea` carry
 * it), so this costs no vocabulary change. **It binds no paint**, and that is measured rather than
 * assumed: the tier emits no pending ink, and `button` — which has declared `pending` since #843 —
 * binds nothing for it either (grepped: zero `pending` keys across all ten existing defs). What the
 * pending state actually changes is the THUMB's content (a spinner replaces it) and the track's
 * interactivity, both anatomy-tier. So the state is declared because the coordinate is real and a
 * consumer must implement it, and `notes.unverified` says the ink is absent rather than letting a
 * reader infer the state is decorative.
 *
 * ── `error` IS AN OUTCOME, NOT A VALIDATION — THE SHARPEST STATE DIFFERENCE FROM CHECKBOX ───────
 *
 * Brief §4: *"an optimistic update FAILED — revert the thumb, error-color the track, link a message
 * via aria-describedby; this is OUTCOME error (the toggle didn't take), not validation error."* Same
 * coordinate name as checkbox's and radio's, opposite semantics — theirs fires when a form is
 * submitted with a required box unticked, this one fires when the network refused. The binding is
 * identical (`color.border.danger` on the track) and the CONTENT rule is not, which is why
 * `content.errorPattern` says what didn't happen and that it reverted, rather than what to fix.
 *
 * ── THE PAINT GRAMMAR IS AXIS-LED, INHERITED, AND ADDS NO EXEMPTION ─────────────────────────────
 *
 * `['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}']` — checkbox's grammar exactly, as
 * radio's is. **`radio`'s header predicted this def would do the same and it does**, which is worth
 * saying because the prediction is the point of having recorded it: the exemption that makes an
 * axis-led `selection` legal is declared ONCE, per AXIS, in `lint-paint.ts`'s `NON_FAMILY_AXES`, and
 * this is the third def to inherit it for free. Checkbox paid ~20 renames, once, after first shipping
 * slot-led and being corrected in review against the house rule — *a false positive is fixed by
 * adding to the exemption list, never by narrowing a scan.*
 *
 * **Whether switch's arithmetic changes that, with the number rather than the impression** (#910's
 * table is the model). Counted from the defs rather than estimated:
 *
 *     checkbox   26 color bindings, 20 selection-keyed
 *     radio      18 color bindings, 12 selection-keyed
 *     switch     22 color bindings, 16 selection-keyed
 *
 * So switch sits between its two siblings and the tradeoff moves in the same direction as checkbox's
 * without reaching it. Had the exemption been per-KEY rather than per-AXIS, this def would have added
 * **16 more entries** to a register whose entire value is being short enough that someone reads it —
 * on top of checkbox's 20 and radio's 12, for 48 across the family. That is the saving #910 bought by
 * declaring it once per axis, and nothing here re-opens it. Worth noting that #910's PR body estimated
 * checkbox's own cost at "~16 entries" and the measured figure is 20; the direction of its argument is
 * unaffected, and the correction is here because the estimate is the number a reader would reuse.
 *
 * Know the cost before reading the grammar as covered: **arm 1 fires only on a key whose LEADING
 * segment is a declared axis value, and `selection` is exempt from it per-axis** — so none of these
 * 16 bindings is checked by arm 1, and nothing else checks them either (#916). The gate PRINTS that
 * per axis on every run, which is the whole difference from the slot-led shape.
 *
 * ── THE RUNG OFFSET, AND WHY THERE ARE ONLY TWO RUNGS (#756, `docs/40` §7 step 2) ───────────────
 *
 * `size: [small, medium]` — brief §15, verbatim: *"switches rarely warrant a large."* This is the
 * first divergence from checkbox's and radio's three, and **`field-label` is the precedent** rather
 * than this def inventing a shape: two rungs is an established vocabulary in the corpus.
 *
 * `size.small.gap → size.sm.gap`, `size.medium.gap → size.md.gap`, same for `min-height → height`.
 * The def's enum is the CONSUMER's vocabulary and the ref is the ENGINE's tier; the engine's names
 * win. `medium → md` satisfies #756's default rule. Recorded here because the rule is that the author
 * records it where they MEET it, and *"the three defs before me already did"* is how the next def
 * stops doing so.
 *
 * ── #900, AND THIS IS THE THIRD INSTANCE — THE ONE THAT CONSTRAINS THE ANSWER ───────────────────
 *
 * **The track has no binding, and neither does the thumb.** Same wall as checkbox's square and
 * radio's circle, and left unbound for the same reason: `icon.size.*` has values that are exactly
 * right (16 / 20 / 24, identical in all four brands) and a meaning that is not — it is the GLYPH
 * ARTBOARD ladder. Binding it resolves, typechecks and passes every gate while measuring the wrong
 * thing, which is #708's shape and why neither predecessor bound it.
 *
 * **What this instance adds, and it is why #900 was left open until switch landed: a switch's track
 * is not square.** A single `control.size.*` rung satisfies checkbox and radio and does nothing here
 * — a track needs a WIDTH and a HEIGHT, and the thumb needs a diameter. So the question #900 has to
 * answer is not *"what rung"* but *"how many dimensions does a control-size family carry"*, and the
 * answer is now constrained by a third instance rather than confirmed by a second. Measured and
 * carried to the issue rather than guessed at here: **the brief specifies no numeric track width,
 * track height or thumb diameter anywhere** — §4 says "thumb position + stark track-color contrast",
 * §8 gives durations, and no dimension appears in §15's schema. Whatever #900 decides, it is deciding
 * without a brief-supplied target, which is a fact about the decision and not a gap in this def.
 *
 * ── THE OFF-STATE TRACK NEEDS A BORDER, AND THIS IS MEASURED RATHER THAN INHERITED ──────────────
 *
 * Brief §6 puts it in the WCAG list explicitly: *"the off-state track must be distinguishable from
 * the background"* (1.4.11). Measured across all four brands at the emitted values, the off track's
 * FILL cannot do that at any brand:
 *
 *     off track fill  `color.interactive.neutral.fill.rest` vs page   1.29 – 1.58 : 1
 *     off track fill  `color.field.fill`                    vs page   1.14 – 1.22 : 1
 *     off track BORDER `color.interactive.neutral.border.rest` vs page  3.20 – 3.28 : 1  ✓
 *
 * So the border is load-bearing rather than decorative here, exactly as it is on checkbox's empty box
 * — and the fill choice follows from a second measurement rather than from matching checkbox: the
 * track binds `color.interactive.neutral.fill.rest` (the interactive family) where checkbox and radio
 * bind `color.field.fill` (the form-field family). **The reason is the thumb.** A white thumb on
 * `color.field.fill` is 1.14 – 1.22:1 and invisible; on `interactive.neutral.fill.rest` it is
 * 1.57 – 1.58:1 and still invisible. Neither works, so the off thumb takes the DARK ink
 * (`interactive.neutral.on-fill`) at **12.33 – 12.36:1** against the interactive fill, and that
 * pairing exists only in the interactive family. This is also the honest reading of the brief's
 * §6 rule — *thumb POSITION distinguishes on/off, not track color alone* — since a boundary the eye
 * cannot find is a position it cannot read.
 *
 * **The thumb is therefore SELECTION-KEYED, which no sibling's glyph is, and it had to be.** Measured:
 * no single ink in the emitted tier clears 3:1 against BOTH tracks. The best candidate,
 * `interactive.primary.border.pressed`, reaches 4.36:1 on the off track and **1.00:1** on the on
 * track — the two tracks sit on opposite sides of the luminance range, so one ink cannot bound both.
 * `off.icon` takes the dark ink and `on.icon` takes `primary.on-fill` (6.85 – 9.96:1 on the on
 * track). That is a structural consequence of a two-position control rather than a styling choice,
 * and it is the measurement a reader should check before "simplifying" the two keys into one.
 *
 * ── `read-only` IS DECLARED AND BINDS NOTHING, FOR A MEASURED REASON THIS TIME ──────────────────
 *
 * Brief §4 SUPPORTS read-only against its own first instinct, on the external pass's admin-review
 * argument: `aria-readonly="true"`, focusable, in the tab order, at **full contrast** (unlike
 * disabled), and visually distinct from disabled. The state is declared for that reason.
 *
 * It binds nothing, and unlike checkbox's and radio's — where the answer was simply that no ink
 * exists — here a candidate exists and was **measured and rejected**: `text-field` binds
 * `border.read-only: 'color.border.secondary'`, and `color.border.secondary` resolves to the SAME
 * palette step as `color.interactive.neutral.border.rest` in all four brands (nb `neutral.400`,
 * harbor `neutral.450`, wendys/aurora `neutral.400`). Binding it would produce a read-only switch
 * pixel-identical to a rest switch while reading in the def as though the brief's *"visually distinct
 * from disabled"* requirement had been met. The brief's own answer is a **lock affordance** — a
 * glyph, not an ink — which is anatomy. So nothing is bound and `notes.unverified` carries the
 * measurement, because "no token exists" and "the token that exists is the same color" are different
 * facts and only one of them is true here.
 */
import { ComponentDef } from '../component-schema';

export const switchDef: ComponentDef = {
  id: 'switch',
  name: 'Switch',
  // The brief's aliases (§10), plus `switch-group` for the reason `radio` keeps `radio-group`: an
  // agent reaching for a group should land on the nearest thing that exists and read why there is no
  // group, rather than matching nothing at all. Here that is sharper than on radio — the group does
  // not exist and is not coming, so the alias routes to a decision rather than to a pending def.
  aliases: ['toggle', 'toggle-switch', 'on-off', 'switch-group'],
  category: 'form',
  status: 'draft',
  inherits: 'checkbox',
  description:
    'A control for a binary on/off setting that takes effect IMMEDIATELY — no save, no submit; the flip is both the input and the execution command. Independent by definition: there is NO SwitchGroup, which closes the selection-control decomposition arc (checkbox has an optional group, radio a mandatory one, switch none). A settings list of switches is a list of rows, not a selection group. Not a staged binary submitted with a form (Checkbox — if a submit button sits anywhere in the flow, it is a Checkbox), not an action or view-mode toggle (ToggleButton, aria-pressed), not a one-of-two exclusive labelled choice (Radio, Segmented Control).',

  // THE DELTA ONLY. The field substrate reaches this def through `checkbox` and is not restated.
  // `name` is absent for a different reason than on radio: radio's belongs to the group, switch's is
  // simply the field substrate's, unchanged.
  props: [
    { name: 'checked', type: 'boolean', required: false, description: 'The binary, with `defaultChecked` for the uncontrolled form — native naming (Material\'s `selected` is the field\'s outlier). `onChange` is expected to apply the effect IMMEDIATELY: that expectation is the component\'s contract, not a convention, and a switch whose change is committed by a later Save button is a Checkbox. For an async effect the controlled value is the SERVER-CONFIRMED source of truth with optimistic local state layered over it; checkbox\'s controlled/uncontrolled traps apply unchanged (a controlled `checked` with no `onChange` is a frozen thumb).' },
    { name: 'label', type: 'node', required: false, description: 'Rich content, and part of the hit target — checkbox\'s label model, inherited. Names the SETTING as a stable noun or adjective phrase ("Airplane Mode"), never the state ("Airplane Mode is On") and never an action ("Turn on Airplane Mode"). It does NOT change on toggle: a label that flips Enable/Disable is disorienting and is a common bug.' },
    { name: 'description', type: 'node', required: false, description: 'Helper beneath the label, describedby-wired. Where the consequence of the setting goes — what turning it on will actually do.' },
    { name: 'labelPosition', type: "enum: 'leading' | 'trailing'", values: ['leading', 'trailing'], default: 'leading', required: false, description: 'THE STRUCTURAL DIVERGENCE FROM CHECKBOX AND RADIO, where the control always leads. Defaults to label-LEADING because a switch\'s habitat is the settings row, with the toggle at the row\'s trailing edge where the eye expects it; flip to control-leading when a switch sits inline among other form controls, for sibling alignment. A PROP and not a variants axis: it changes a row\'s direction and no ink at any coordinate, so it is an anatomy concern (see the header).' },
    { name: 'pending', type: 'boolean', required: false, default: 'false', description: 'FIRST-CLASS HERE, and the state that exists because immediacy meets latency. Locks input, swaps the thumb for a spinner and announces `aria-busy`. The practice ships optimistic-by-default — flip instantly, revert and message on failure — with this as the alternative for high-latency or critical toggles where an inconsistent intermediate is genuinely harmful. Mandating optimism universally puts the orchestration burden on every consumer; mandating the lock kills the immediacy that is the whole component.' },
    { name: 'isReadOnly', type: 'boolean', required: false, default: 'false', description: 'SUPPORTED, which is not obvious for a toggle. Enterprise dashboards need users to review permission sets and system config they lack authority to change, and disabling those drops them from the tab order while swapping to static text hides the setting from screen readers. So: `aria-readonly="true"`, focusable and IN the tab order, at full WCAG contrast (unlike disabled), and visually distinct from disabled. No clean native readonly exists for a checkbox input — implement via `aria-readonly` plus a prevented toggle.' },
    { name: 'showStateLabel', type: 'boolean', required: false, default: 'false', description: 'The on/off affordance — an inner-track checkmark or I/O icons, OFF by default, since thumb position plus track color carries the state. Add only where state legibility genuinely demands it. This is NOT hardcoded "On"/"Off" text adjacent to the label, which is rejected outright: it competes with the track, duplicates the screen-reader output ("Airplane Mode On, switch, on"), and does not localize or expand cleanly.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'TWO RUNGS, not three — "switches rarely warrant a large" (brief §15), which is the first size divergence in the family; `field-label` is the corpus precedent for a two-rung ladder. Scales the row: the label-to-control gap and the row\'s minimum height. The TRACK and THUMB are NOT bound (#900, see `notes.unverified`) and this is the instance that constrains that issue, because a track is not square. Re-declared rather than inherited because the ladder is read by the machinery (`lint-rung-names.ts` arm 2).' },
  ],

  // Checkbox's seven, MINUS nothing and PLUS `pending` — the one state addition in the family, and
  // the brief calls it first-class rather than optional. `error` is declared with the same name and
  // the opposite meaning: an OUTCOME failure (the toggle didn't take), not a validation failure. See
  // the header for both.
  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'read-only', 'pending', 'error'],

  // `[off, on]` is a DECISION, argued at length in the header, and it diverges from checkbox's and
  // radio's `[unchecked, checked]` on purpose. No indeterminate — `role="switch"` has no
  // `aria-checked="mixed"` (it coerces to false) and a switch is uncompromisingly binary.
  //
  // `label-side` and `affordance` are in brief §15's variants block and are NOT axes here:
  // `labelPosition` is a prop because it paints nothing (header), and `affordance` selects the thumb's
  // CONTENT, which is anatomy. Neither is a color dimension, and an axis that paints nothing doubles
  // every coordinate for no ink.
  variants: {
    size: ['small', 'medium'],
    selection: ['off', 'on'],
  },

  // Checkbox's and radio's grammar, unchanged. See the header for the binding arithmetic and for what
  // arm 1 does and does not check here.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}'],

  tokens: {
    // ── THE OFF TRACK — the INTERACTIVE-neutral family, where checkbox and radio take the FORM-FIELD
    // family for their empty box. That is a real divergence and it is forced by the thumb, not chosen:
    // a white thumb is 1.14–1.22:1 on `color.field.fill` and 1.57–1.58:1 on this fill, so the off
    // thumb has to take the DARK ink — and `interactive.neutral.on-fill` (12.33–12.36:1 against this
    // fill) exists only in this family. Full measurements in the header.
    //
    // The BORDER is load-bearing rather than decorative: brief §6 requires the off track be
    // distinguishable from the background (1.4.11), and no fill in the tier clears 3:1 against the
    // page at any brand — this border clears it at all four (3.20–3.28:1).
    'off.fill': 'color.interactive.neutral.fill.rest',
    'off.fill.hover': 'color.interactive.neutral.fill.hover',
    'off.fill.pressed': 'color.interactive.neutral.fill.pressed',
    'off.border': 'color.interactive.neutral.border.rest',
    'off.border.hover': 'color.interactive.neutral.border.hover',
    'off.border.pressed': 'color.interactive.neutral.border.pressed',
    'off.border.error': 'color.border.danger',
    // The OFF thumb, dark on a light track. Keyed by selection because no single ink bounds both
    // tracks — the best candidate reaches 4.36:1 off and 1.00:1 on. See the header before merging
    // these two keys.
    'off.icon': 'color.interactive.neutral.on-fill',

    // ── THE ON TRACK — the brief's "stark track-color contrast", and the pairing the tier gates:
    // `on-fill` is contract-checked against the fill the ink sits on, which is what makes a filled
    // track the safe treatment here for the reason radio's filled disc was chosen over an outlined
    // ring. 8.20–8.29:1 against the page on three brands, 6.85:1 on aurora.
    'on.fill': 'color.interactive.primary.fill.selected',
    'on.fill.hover': 'color.interactive.primary.fill.hover',
    'on.fill.pressed': 'color.interactive.primary.fill.pressed',
    'on.border': 'color.interactive.primary.border.rest',
    'on.border.hover': 'color.interactive.primary.border.hover',
    'on.border.pressed': 'color.interactive.primary.border.pressed',
    'on.border.error': 'color.border.danger',
    // The ON thumb — light on a dark track, 6.85–9.96:1.
    'on.icon': 'color.interactive.primary.on-fill',

    // ── THE ROW'S LABEL — one ink at every coordinate, so it is the bare slot. Page text beside the
    // control, which is why its disabled ink is `disabled.text` and not `disabled.on-fill`.
    'label': 'color.text.primary',

    // ── FOCUS RING — on the TRACK, never the thumb (brief §4), and the CONTROL ring
    // (`focus.ring.offset`) rather than a field's flush one. 4.56–5.88:1 against the page.
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // ── DISABLED SKIN (contrast-exempt, 1.4.3), the shared cross-cutting family. `icon.on-fill` is
    // the thumb: the disabled branch appends its own ground, and `on-fill` is the only one it appends.
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.icon.on-fill': 'color.disabled.on-fill',
    'disabled.label': 'color.disabled.text',

    // ── GEOMETRY. `radius.round` gives the pill, resolving to `dimension.128` in all four brands —
    // the same token radio uses for its circle, which is correct rather than a coincidence: a pill and
    // a circle are both "round as the shape allows", and the tier expresses that as one very large
    // radius rather than two shapes.
    'radius': 'radius.round',
    'size.small.gap': 'size.sm.gap',
    'size.medium.gap': 'size.md.gap',
    'size.small.min-height': 'size.sm.height',
    'size.medium.min-height': 'size.md.height',
  },

  accessibility: {
    role: 'switch (native <input type="checkbox" role="switch">), with aria-checked true/false — announced "on"/"off", NOT "checked"',
    wcag: [
      '4.1.2 Name Role Value (the switch role and aria-checked doing the work)',
      '1.4.1 Use of Color (thumb POSITION distinguishes on from off, never track color alone)',
      '1.4.11 Non-text Contrast (the off-state track must be distinguishable from the background) / 2.4.13 Focus Appearance',
      '2.5.8 Target Size (the whole row, as checkbox)',
      '4.1.3 Status Messages (the async outcome or error of an immediate change)',
    ],
    keyboard: 'Each switch is its OWN tab stop — like checkbox, unlike radio, and there is no group to traverse. SPACE toggles, which is the canonical W3C activation; some systems also accept Enter on the grounds that the effect is action-like, which is a defensible addition and Space is the safe default. Nothing else: no arrow keys, because a switch is never one of a mutually-related set.',
    focus: ':focus-visible ring on the TRACK, never the thumb — the thumb moves, and a ring that travels with it reads as two indicators. Offset, at least 3:1, keyboard traversal only. A read-only switch STAYS in the tab order and stays focusable, which is the whole reason read-only is supported rather than folded into disabled; a disabled one is removed from it.',
    aria: 'THE ROLE IS THE HEADLINE, and the three-way distinction is the whole game: checkbox is role="checkbox" (announced "checked"), switch is role="switch" (announced "ON"/"OFF"), and a toggle button is role="button" + aria-pressed (announced "pressed"). Putting aria-pressed on a switch is a recurring and severe error that CORRUPTS the announcement and violates the spec. Prefer the styled native input — <input type="checkbox" role="switch"> keeps focus, activation and the a11y tree for free. role="switch" is well supported in modern AT but is newer than checkbox, so verify on the matrix and keep a checkbox fallback as the conservative hedge. ANNOUNCE THE IMMEDIATE EFFECT: aria-checked flips on toggle; for an async effect set aria-busy during flight and announce the outcome or failure politely (4.1.3), so a screen-reader user knows the live change took; and if toggling changes the page layout by revealing a sub-form, an aria-live region announces the contextual change — though that case is usually a Checkbox misuse (see docs.dont). TWO IMPLEMENTATION TRAPS: the IA2 quirk, where both aria-pressed buttons and role="switch" map internally to IA2_ROLE_TOGGLE_BUTTON — author to the ARIA spec regardless; and shadow-DOM label detachment, where wrapping a web-component switch in a native <label> does NOT associate the name with the input inside the shadow root, so set aria-label or aria-labelledby explicitly or ship an unlabelled control.',
  },

  content: {
    labelPattern: 'Names the SETTING, not the state and not the action — "Airplane Mode", "Location Services"; not "Airplane Mode is On" and not "Turn on Airplane Mode". A stable noun or adjective phrase that does NOT change on toggle: a label flipping between Enable and Disable is disorienting and is a common bug. Avoid verbs, which blur "current state" against "action on click". Positive framing is mandatory — the on state is the affirmative, so off never means a double negative. Sentence case, no terminal punctuation. Long labels wrap; the fixed-width track does not shrink. AND REJECT HARDCODED ADJACENT "On"/"Off" TEXT, which is the label rule this control has and its siblings do not: it competes with the track state, produces duplicative screen-reader output ("Airplane Mode On, switch, on"), and does not localize or expand cleanly. The track plus the role="switch" announcement already carries it; where legibility genuinely demands more, use the inner-track affordance rather than words.',
    errorPattern: 'An OUTCOME failure, not a validation failure: say what did not happen and that it reverted — "Couldn\'t turn on notifications. Try again." Near the control, as a status message rather than a field error. Never "Invalid input"; there was no input to invalidate.',
  },

  docs: {
    usage: 'Use for a binary on/off setting that applies IMMEDIATELY — notifications, dark mode, Wi-Fi, a feature flag in a settings panel. Compose into a list or settings row with the label leading and the switch at the trailing edge, which is the habitat this control comes from. There is no group: a panel of switches is a list of rows, and each switch owns its own independent boolean and fires its own mutation. Default to optimistic updates with revert-and-message on failure, and reach for `pending` only where an inconsistent intermediate would genuinely harm.',
    do: [
      'Apply the change the instant it is toggled — the immediacy IS the contract',
      'Put the label first and the switch at the row\'s trailing edge; flip to control-leading only when a switch sits inline among other form controls',
      'Name the setting, not the state, and keep the label the same on and off',
      'Default to optimistic: flip immediately, then revert and say what failed if the effect did not take',
      'Guard the re-toggle race — lock input on the first interaction until the effect resolves, or coordinate a pending state internally',
      'Support read-only for settings a user may review but not change: focusable, in the tab order, at full contrast',
      'Let thumb POSITION carry the state, so the control still reads without color',
    ],
    dont: [
      'Use a switch for a binary that is submitted with a form — if a Save button sits anywhere in the flow it is a Checkbox, and Apple rejects App Store submissions over exactly this',
      'Use a switch whose toggle reveals a sub-form that must be filled before the data is valid — that is progressive disclosure, not an immediate mutation, and it is the most common real misuse',
      'Put aria-pressed on a switch — it corrupts the announcement; aria-pressed is a toggle BUTTON, performing an action or setting a view mode',
      'Reach for a SwitchGroup — there is none, deliberately: a settings list is a list of rows, and compiling a multi-select array is Checkbox\'s job',
      'Hardcode "On"/"Off" text beside the label — redundant, duplicative for screen readers, and it does not localize',
      'Add a third or indeterminate state — role="switch" coerces aria-checked="mixed" to false',
      'Switch on something consequential or hard to reverse without confirmation, or where the user cannot perceive that the effect happened',
      'Put the focus ring on the thumb — it moves, so the indicator would travel with it',
    ],
    contentGuidelines: 'The label names the setting and never changes. The description says what turning it on will do. Async failures say what did not happen and that it reverted.',
  },

  ai: {
    primaryPurpose: 'Set a binary on/off value that takes effect immediately, with no save step.',
    whenToUse: 'A single independent setting that applies the moment it is flipped — a notification preference, dark mode, a feature flag — usually in a settings row or list with the label leading.',
    avoidWhen: 'The change is staged and committed by a Save or Submit button (Checkbox — the presence of that button anywhere in the flow is the tell), the toggle reveals a sub-form that must be completed for the data to be valid (Checkbox again; this is the most common misuse), it is a single consent or agreement (Checkbox), it performs an action or sets a view mode rather than holding a setting (ToggleButton with aria-pressed), it is a one-of-two exclusive labelled choice or the off state is ambiguous (Radio or Segmented Control), or a third indeterminate state is needed (Checkbox). Also do not reach for this def expecting a group: there is no SwitchGroup by decision, and a settings panel is a list of rows.',
    commonPartners: ['field-label', 'field-message', 'focus-ring', 'icon', 'card'],
    triggerKeywords: ['switch', 'toggle', 'toggle switch', 'on off', 'on/off', 'enable', 'setting', 'immediate', 'feature flag', 'dark mode'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring', 'icon'],
    alternativeTo: ['checkbox', 'toggle-button', 'radio', 'segmented-control'],
    supersedes: [
      'a checkbox misused for an immediate-effect setting',
      'two radios standing in for an obvious binary on/off',
      'an aria-pressed toggle button misused to hold a state setting',
    ],
    supersededBy: [
      'checkbox when the change must be staged and submitted',
    ],
  },

  notes: {
    contested: [
      'THE `selection` VALUES ARE `[off, on]`, DIVERGING FROM checkbox\'s AND radio\'s `[unchecked, checked]`. #910 settled the axis NAME for the family and left the values open with an ARIA recommendation (`aria-checked` covers all three controls), so this is a decision taken against that recommendation rather than a default. Three grounds, argued in the header: paint-key values describe what is on SCREEN and appear in no ARIA tree; `role="switch"` is announced "on"/"off", so ARIA\'s own OUTPUT is on/off even though its PROPERTY is aria-checked; and `checked` is the word that carries this component\'s most common misuse, since a def spelled `[unchecked, checked]` reads as a checkbox with a different skin. The cost is real and unchecked by anything: the family now spells one axis two ways, there is no cross-def values census in the engine and none is possible from `VARIANT_AXES` (which closes names only), so this divergence is held by prose alone. If the family should have one vocabulary, this is the entry to delete.',
      'THE OFF TRACK TAKES THE INTERACTIVE-NEUTRAL FAMILY where checkbox and radio take the form-field family for their empty box. Forced by the thumb rather than chosen: measured across all four brands, a white thumb is 1.14-1.22:1 on `color.field.fill` and 1.57-1.58:1 on `interactive.neutral.fill.rest`, so the off thumb must take the dark ink, and `interactive.neutral.on-fill` (12.33-12.36:1) exists only in the interactive family. The NAMED ALTERNATIVE is to match the siblings on `color.field.fill` and accept an off thumb with no boundary, which several shipped systems do by relying on a thumb shadow — an effect the token tier does emit but which this def has no field to bind, and which would put a 1.2:1 boundary behind a decorative token.',
      'THE THUMB IS SELECTION-KEYED (`off.icon` dark, `on.icon` light), which no sibling\'s glyph is — checkbox and radio each have ONE icon ink. Measured: no single ink in the tier clears 3:1 against both tracks, and the closest candidate (`interactive.primary.border.pressed`) is 4.36:1 off and 1.00:1 on, because the two tracks sit on opposite sides of the luminance range. So this is structural to a two-position control rather than a styling choice, and the two keys cannot be collapsed into one.',
      'THE ASYNC MODEL SHIPS BOTH STANCES — optimistic-by-default with revert-and-message, plus a first-class `pending` lock. The field genuinely splits here (Carbon and Base Web optimistic-only; Primer\'s `loading`/`loadingLabel` and Atlassian\'s `busy` locking), and the brief\'s reconciliation is deliberate: mandating optimism universally puts the whole orchestration burden on every consumer, and mandating the lock kills the immediacy that is the entire component. Recorded as contested because a system that picks one would read this def as indecisive, and the two-stance answer is the position rather than an absence of one.',
      'READ-ONLY IS SUPPORTED, against the brief author\'s own first instinct and adopted on the external pass\'s argument. It looks paradoxical — an un-toggleable toggle — and the case for it is enterprise: users review permission sets and system config they lack authority to change, and disabling those drops them from the tab order while swapping to static text hides the setting from screen readers and breaks data-table consistency. The contrary position is legitimate rather than wrong.',
      'THE LABEL SIDE DEFAULTS TO LEADING, which is the opposite of every other control in the corpus, and the brief\'s external pass defaulted the other way (control-leading, for sibling alignment with checkbox and radio). Both are defensible, which is why it is a prop; the default follows the dominant habitat, the settings row. It is not a `variants` axis here because it paints nothing at any coordinate — see the header.',
      'THE ON/OFF AFFORDANCE DEFAULTS TO A PLAIN TRACK, with inner-track icons available and off by default. The contested part is not the default but what the icons are FOR: they are a legibility aid, never the 1.4.1 answer, since thumb position already carries the state. Hardcoded adjacent On/Off text is rejected outright rather than defaulted off.',
    ],
    unverified: [
      'THE TRACK AND THUMB HAVE NO BINDING — #900, and this is the THIRD of three instances, the one the issue was left open for. Same wall as checkbox\'s square and radio\'s circle: the engine emits no token for a small control\'s own dimension, and `icon.size.*` has values that are exactly right (16/20/24, identical in all four brands) and a meaning that is not, being the glyph artboard ladder. Binding it resolves, typechecks and passes every gate. What this instance ADDS is the constraint the first two could not supply: a switch\'s track is NOT SQUARE, so a single `control.size.*` rung satisfies checkbox and radio and does nothing here — a track needs a width AND a height, and the thumb a diameter. Measured and worth stating because it bounds the decision: the brief specifies no numeric track width, track height or thumb diameter anywhere, so #900 is deciding without a brief-supplied target.',
      'READ-ONLY BINDS NOTHING, and here the reason is a MEASUREMENT rather than an absence — which is the difference from checkbox and radio. A candidate exists: `text-field` binds `border.read-only: color.border.secondary`. But `color.border.secondary` resolves to the SAME palette step as `color.interactive.neutral.border.rest` in all four brands (nb neutral.400, harbor neutral.450, wendys and aurora neutral.400), so binding it would produce a read-only switch pixel-identical to a rest switch while reading in the def as though the brief\'s "visually distinct from disabled" requirement had been met. The brief\'s actual answer is a LOCK AFFORDANCE — a glyph, not an ink — which is anatomy.',
      'PENDING BINDS NO PAINT, and no def in the corpus binds any: `button` has declared `pending` since #843 and binds nothing for it, and the tier emits no pending ink. What the state actually changes is the thumb\'s CONTENT (a spinner replaces it) and the track\'s interactivity, both anatomy-tier. Declared because the coordinate is real and a consumer must implement it, recorded here so nobody reads the state as decorative.',
      'THE LABEL SIDE IS AN ANATOMY REQUIREMENT WITH NO EXPRESSION HERE. `labelPosition` is a prop and the thing it actually controls is a row\'s `direction` in a `LayoutDef`, which this def has no anatomy block to hold. Under RTL it inverts twice over — the row mirrors AND the thumb travel flips, since "on" sits at the inline-end — and logical properties make that automatic in CSS while a Figma projection would need it stated.',
      'THE THUMB TRAVEL IS THE COMPONENT\'S DEFINING MOTION AND HAS NO EXPRESSION IN THE SCHEMA. Brief §8 is emphatic that the slide is functional rather than decorative — it is the literal RECEIPT that the immediate action registered: a ~150-200ms ease-in-out `transform` translate (never an animated width) with a synchronized track-color crossfade, snapping optimistically on an async toggle with a spinner cross-fading onto the thumb, and sliding BACK on failure as the physical metaphor for rejection. Under prefers-reduced-motion the slide drops to 0ms. The engine emits `motion.duration-ms.*` and this def has no motion field to point at.',
      'THE INNER-TRACK AFFORDANCE (`showStateLabel`) NAMES NO GLYPH. The checkmark or I/O icons it selects are `icon` names the def cannot reference without an anatomy block, and the I/O pair in particular may not exist in the 39-name icon set.',
      'THE WHOLE-ROW HIT TARGET IS EXPRESSED ONLY AS `size.*.min-height`, the row\'s floor. Where the expanding padding sits, and how it relates to the track\'s own dimensions, is an anatomy concern this def has no block to state — and it is sharper here than on the siblings, because the control sits at the row\'s TRAILING edge by default rather than at its start.',
      'THE ASYNC RACE IS AN IMPLEMENTATION REQUIREMENT NOTHING HERE CAN HOLD: user toggles, local state flips, request fires, user toggles again before it resolves, and two mutations resolve out of order. The fix is to lock input on the first interaction until the promise settles, or to coordinate a pending state internally. It lives in `docs.do` prose.',
    ],
  },
};
