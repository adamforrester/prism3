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
 * coordinate — it reverses a row's `direction`. That makes it an ANATOMY concern, and the anatomy
 * block states the DEFAULT (`row.children` is `[label, track]`) while the flipped order stays out of
 * reach: a prop is not a coordinate, and a row has one child order. Declaring it as an axis would
 * double every paint coordinate for a distinction that paints nothing: #758's shape, a member that
 * projects and has no color to carry. `notes.unverified` carries what is still missing, RTL included.
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
 * interactivity. The first of those is now expressible — `button`'s `overlay` part is exactly that
 * shape (#848) — and is deliberately not expressed: it is admitted in `anatomy.codeOnly` rather than
 * authored, because a spinner part is a second concern in a PR whose subject is the travel. So the
 * state is declared because the coordinate is real and a consumer must implement it, and the notes say
 * the ink is absent rather than letting a reader infer the state is decorative.
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
 * ── #900's THIRD INSTANCE, NOW BOUND — AND IT IS THE INSTANCE THAT SHAPED THE FAMILY ────────────
 *
 * **The track and the thumb are bound, and the field they read exists because of this def.** When
 * this def first landed, all three dimensions were unbound for checkbox's and radio's reason:
 * `icon.size.*` has values that are exactly right (16 / 20 / 24, identical in all four brands) and a
 * meaning that is not — it is the GLYPH ARTBOARD ladder — so binding it resolves, typechecks and
 * passes every gate while measuring the wrong thing (#708's shape).
 *
 * **What this instance added was the constraint the first two could not supply: a switch's track is
 * not square.** A single `control.size.*` rung satisfies checkbox and radio and does nothing here, so
 * the question #900 had to answer was not *"what rung"* but *"how many dimensions does a control-size
 * family carry"*. The answer is three: `height` (16/20/24 comfortable, 12/16/20 compact), `width` (2x
 * the height — the ratio the field converges on), and `dot` (half the height, added for radio). This
 * def binds all three, and **`width` had been emitted and bound by nothing at all until now** — its
 * own description in the emitted tree names the consumer it was waiting for: *"track width for a
 * two-position control, i.e. a switch."*
 *
 * Two facts survive the binding rather than being closed by it, and both are in `notes.unverified`
 * because they are the ones a reader should check first. **The brief specifies no numeric track width,
 * track height or thumb diameter anywhere** — §4 gives "thumb position + stark track-color contrast",
 * §8 gives durations, §15's schema carries no dimension — so these bindings satisfy the TIER's stated
 * intent and no brief-supplied target. And `dot` at half the height was decided for a dot inside a
 * ring; on a thumb it is the low end of what the field ships, and nobody has built one and looked.
 *
 * ── THE THUMB TRAVELS, AND THAT COST THE SCHEMA A MECHANISM (#990) ───────────────────────────────
 *
 * A switch is the first component in the corpus where **a part's POSITION is a function of a variant
 * axis**, and nothing in `PartDef` could say so. The anatomy block below is what closed it, with the
 * thumb declaring `positionWhen: { selection: { off: 'start', on: 'end' } }` — one part, two places.
 *
 * The alternative was two parts gated by `presentWhen`, `thumb-off` and `thumb-on`, which needed no
 * new mechanism and was rejected: it is a modelling lie a code projection inherits (two elements
 * toggled, where every real switch is one element that translates), it duplicates every binding on
 * the moving part with nothing catching divergence, and it is #933's shape — a field doing a second
 * job in place of the second concept being named.
 *
 * **The mechanism's limit, stated because it is the projection's and not this def's.** Figma auto
 * layout offers no per-child main-axis offset: `layoutAlign`'s MIN/CENTER/MAX are deprecated by Figma
 * and are the counter axis anyway, and `layoutGrow` is a 0/1 stretch flag. Main-axis distribution
 * exists only on the frame, as `primaryAxisAlignItems` — so the travel projects onto the TRACK, which
 * is why the track must be `fixed` along that axis and why the thumb must be its only flow child.
 * Three positions is therefore the ceiling: a 2- or 3-value axis travels, and a slider's continuous
 * thumb or a four-segment indicator does not.
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
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'TWO RUNGS, not three — "switches rarely warrant a large" (brief §15), which is the first size divergence in the family; `field-label` is the corpus precedent for a two-rung ladder. Scales the row: the label-to-control gap, the row\'s minimum height, the label\'s type, the TRACK\'s height and length, and the THUMB\'s diameter. All three control dimensions read `control.size.*`, which moves a full rung with brand density — `icon.size.*` would resolve and measure the wrong thing (see the header) — and the track reads TWO of them, `height` and `width`, because a track is not square. Re-declared rather than inherited because the ladder is read by the machinery (`lint-rung-names.ts` arm 2).' },
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
    //
    // THE SLOT IS `indicator`, NOT `icon`, and that follows from the thumb being a BOX rather than a
    // glyph — radio's dot took the same rename for the same reason (#910). `paintOf` dispatches on the
    // slot alone (#933), so a box in the `icon` slot resolves nothing and projects unpainted: the whole
    // thumb, invisible, at every coordinate. The keys were authored `off.icon`/`on.icon` before this def
    // had an anatomy to say what kind of node the thumb is; the anatomy is what decides the slot.
    'off.indicator': 'color.interactive.neutral.on-fill',

    // ── THE ON TRACK — the brief's "stark track-color contrast", and the pairing the tier gates:
    // `on-fill` is contract-checked against the fill the ink sits on, which is what makes a filled
    // track the safe treatment here for the reason radio's filled disc was chosen over an outlined
    // ring. 8.20–8.29:1 against the page on three brands, 6.85:1 on aurora.
    //
    // NO STRUCTURAL BORDER, and this def is where #1011's third finding is most worth reading, because
    // its two halves go OPPOSITE ways on one node. The finding was filed on checkbox; radio and switch
    // inherited the pairing, and the fix is NOT the same fix three times. The off track KEEPS its border
    // — the comment above already says why, and said so before the rule existed: no neutral fill clears
    // 3:1 against the page at any brand, so that rim is the only edge the track has and dropping it
    // would break 1.4.11 rather than tidy it. The ON track loses its border, because the number above is
    // the whole argument: a fill at 6.85–8.29:1 IS the boundary, so a same-family border beside it can
    // only agree invisibly or — as shipped, `fill.SELECTED` beside `border.REST`, a rung the border
    // ladder does not have — disagree visibly.
    //
    // That asymmetry is the reason arm 4's rule asks about the FILL and not about the two bindings. The
    // framings that would have been simpler are all false HERE first: "a selection control never paints
    // both slots" and "same family, never both" each delete this def's off-track rim, and
    // `contrast(border, fill) >= 3` flags it as a failure. Only "is the fill already a boundary"
    // separates the two coordinates of one node correctly.
    'on.fill': 'color.interactive.primary.fill.selected',
    'on.fill.hover': 'color.interactive.primary.fill.hover',
    'on.fill.pressed': 'color.interactive.primary.fill.pressed',
    'on.border.error': 'color.border.danger',
    // The ON thumb — light on a dark track, 6.85–9.96:1. `indicator` for the reason above.
    'on.indicator': 'color.interactive.primary.on-fill',

    // ── THE ROW'S LABEL — one ink at every coordinate, so it is the bare slot. Page text beside the
    // control, which is why its disabled ink is `disabled.text` and not `disabled.on-fill`.
    'label': 'color.text.primary',

    // ── FOCUS RING — on the TRACK, never the thumb (brief §4), and the CONTROL ring
    // (`focus.ring.offset`) rather than a field's flush one. 4.56–5.88:1 against the page.
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // ── DISABLED SKIN (contrast-exempt, 1.4.3), the shared cross-cutting family. `indicator.on-fill` is
    // the thumb: the disabled branch appends its own ground, and `on-fill` is the only one it appends.
    // The thumb sits ON the track's fill, so it is the on-fill pairing the tier gates rather than the
    // page one — the label, beside the track, takes `disabled.text` instead.
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.indicator.on-fill': 'color.disabled.on-fill',
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

    // ── THE TRACK'S TWO DIMENSIONS AND THE THUMB'S ONE — #900's third instance, now BOUND. The tier
    // already carried all three fields: #951 emitted `control.size.<rung>` with `height` and `width`,
    // and #910 added `dot` for radio. `width` had been emitted and bound by NOTHING until here, and its
    // own description says why it exists — *"track width for a two-position control, i.e. a switch (2x
    // the height, the field-convergent track ratio)"*. This def is the consumer it was emitted for.
    //
    // `control.size.*` AND NOT `icon.size.*`, the substitution the whole family warns about: `icon.size`
    // is 16/20/24 in ALL FOUR brands, so binding it would hold the track rigid against exactly the brand
    // density this family exists to move (aurora is a full rung smaller). Resolves either way and is
    // checked by property rather than by spelling — see `test.ts`'s consumer-half arm.
    //
    // `control` is the HEIGHT and `track` is the WIDTH, which is the naming checkbox and radio set:
    // `size.*.control` is "this control's own dimension", read on both axes by a square and on one here.
    // A switch is the def that made the second field necessary — a track is 2:1, so one rung cannot
    // describe it, and that is the constraint this instance added to #900 rather than confirming.
    'size.small.control': 'control.size.sm.height',
    'size.medium.control': 'control.size.md.height',
    'size.small.track': 'control.size.sm.width',
    'size.medium.track': 'control.size.md.width',
    // The THUMB's diameter, half the track's height by the tier's construction. The tier anticipated this
    // consumer by name — *"a control whose mark is a filled shape, i.e. a radio's dot"*, and its comment
    // says "a switch's thumb when it lands". What the ratio means for a THUMB rather than a dot is in
    // `notes.unverified`: half is the low end of what the field ships, and nobody has looked at one.
    'size.small.dot': 'control.size.sm.dot',
    'size.medium.dot': 'control.size.md.dot',
    // The LABEL's type ramp, two rungs where radio has three. `type.body.*` rather than `type.label.*`
    // for radio's reason — a switch's label is a setting NAME beside a control, not a form field's label
    // announcing one above it — and it is the only family in the tier carrying every rung anyway.
    'size.small.text': 'type.body.sm.default',
    'size.medium.text': 'type.body.md.default',
  },

  // ── ANATOMY (#990) ──────────────────────────────────────────────────────────────────────────────
  //
  // Radio's decomposition with ONE structural mutation, and it is the mutation the whole family had been
  // deferring: **the thumb MOVES.** Four parts — the ROW is the hit target, the TRACK owns the ink
  // (#933), the THUMB is the mark, an absolute focus ring sits on the track — plus a text label. Every
  // part but the thumb is radio's, adapted only in its `note`.
  //
  // THE THUMB IS ONE PART IN TWO PLACES, which is what `positionWhen` exists for (#990). The rejected
  // alternative was two parts, `thumb-off` and `thumb-on`, each gated to one value of `selection` by
  // `presentWhen`. That shape validates and would have needed no mechanism at all, and it is a modelling
  // lie in three separate ways: a code projection reading it emits two elements and toggles them, where
  // every real switch is ONE element that translates; every binding on the thumb exists twice with
  // nothing in the schema noticing when the copies diverge; and it is #933's shape again — a field made
  // to do a second job instead of the second concept being named. A position is not an absence.
  //
  // WHY THE TRACK BINDS `width` AND IS `fixed` ON BOTH AXES. The travel projects as the TRACK's
  // `primaryAxisAlignItems` (Figma has no per-child main-axis offset inside auto layout — see
  // `positionWhen`'s note for the API measurement), and a HUGGING track is exactly as wide as its thumb,
  // which makes `start` and `end` the same place. So the track's length has to be stated, and #951's
  // `control.size.*.width` is the number that states it. `anatomyErrors` asserts both halves rather than
  // trusting this paragraph: a hugging or filling parent, or a second flow child beside the thumb, is
  // refused at authoring time.
  //
  // THE ROW IS LABEL-FIRST, which is the family's one structural divergence: `labelPosition` defaults to
  // `leading` because a switch's habitat is the settings row with the toggle where the eye expects it.
  // Checkbox and radio put the control first. The prop is a PROP and not an axis (it paints nothing), so
  // this order is the default and the flipped one is the code projection's to build.
  anatomy: {
    root: 'row',
    parts: {
      // THE HIT TARGET, and nothing else. No `paintSlots` (#933): this def keys no row-level fill or
      // border for one to name. `align: 'start'` for radio's reason — a control centered against a
      // wrapping label floats mid-paragraph, and this def's content rules say long labels wrap while the
      // fixed-width track does not shrink. Its extent comes from its children; `min-height` is the row's
      // FLOOR and is in `codeOnly`, because Figma has no floor.
      row: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        children: ['label', 'track'],
      },
      // No `paintSlot` — the default is `label`, and at `disabled` the projector reaches `disabled.label`
      // (page ink) rather than `disabled.label.on-fill`, because this text sits beside the track's fill
      // and not on it.
      label: {
        kind: 'text',
        type: 'size.{size}.text',
        note: 'The accessible name AND the second half of the hit target. Names the SETTING as a stable noun phrase and does not change on toggle — a label flipping between Enable and Disable is this component\'s most common copy bug. Rich content in code; a plain text node in Figma. Note what this part must NOT become: hardcoded "On"/"Off" text beside the name, which duplicates the screen-reader output ("Airplane mode On, switch, on") and does not localize.',
      },
      // THE PAINTED TRACK — the pill, and the only part that carries `fill` and `border`. NOT SQUARE, and
      // it is the first part in the corpus that is not: `height` is the control rung and `width` is twice
      // it (`control.size.*.width`). FIXED on both axes, which the thumb's travel requires and
      // `anatomyErrors` checks from both sides. `radius` resolves to `radius.round`, giving a pill at any
      // rung by the same token that gives radio a circle — one very large radius rather than two shapes.
      //
      // The BORDER is load-bearing rather than decorative: brief §6 requires the off track be
      // distinguishable from the page (1.4.11) and no fill in the tier clears 3:1 at any brand, while this
      // border clears it at all four (3.20–3.28:1).
      track: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill', 'border'],
        height: 'size.{size}.control',
        width: 'size.{size}.track',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['thumb', 'focusRing'],
        note: 'The pill. Its `justify` is the FALLBACK the thumb overrides per coordinate (`positionWhen`), so it reads `start` here and is projected `MAX` at `selection=on` — a structure-only plan with no selection supplied keeps `start`, which is the conservative answer rather than a position asserted on no evidence. Its two dimensions are two decisions: 2:1 is the ratio the field converges on, and it is the tier\'s, not this def\'s.',
      },
      // THE THUMB. A `box`, like radio's dot and for the same reason — there is no filled circle in the
      // engine's glyph vocabulary and minting one would put a primitive shape into a set whose membership
      // rule is that an entry carries meaning. `size` (the square, both axes from one variable) plus round
      // radius is a circle at any rung.
      thumb: {
        kind: 'box',
        role: 'presentation',
        // `indicator`, NOT `fill` — the track already owns `fill`, and #933's rule is that two boxes
        // naming one slot both take the SAME variable rather than dividing it. Radio's dot took this slot
        // first; the #864 condition that admits a box into an ink slot is satisfied here for radio's
        // reason too, which is that this part has NO children to be painted behind.
        paintSlots: ['indicator'],
        size: 'size.{size}.dot',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        // THE TRAVEL (#990). Two values, two positions, one part. Projected onto the TRACK's main-axis
        // distribution, because that is the only main-axis placement Figma's auto layout offers.
        positionWhen: { selection: { off: 'start', on: 'end' } },
        note: 'The thumb — ONE part whose position varies, not two parts that take turns. Its ink is selection-keyed and had to be: measured, no single ink in the tier clears 3:1 against both tracks (the best candidate reaches 4.36:1 off and 1.00:1 on, since the two tracks sit on opposite sides of the luminance range), so it takes `off.indicator` (12.33–12.36:1 on the off track) and `on.indicator` (6.85–9.96:1 on the on track). Check that measurement before "simplifying" the two keys into one. It sits FLUSH against the track\'s ends, which no shipped switch does — see `codeOnly`, the inset has no token. Its slide is motion and has no expression here either; what this schema carries is the two endpoints.',
      },
      // Radio's ring, verbatim, on the TRACK rather than the row or the thumb — `accessibility.focus` is
      // explicit that a ring travelling with the thumb reads as two indicators. The two insets SUM in the
      // executor, siting the ring at -(2+2) = -4 so the visible gap is a full 2px (#801: the ring's own
      // inside-drawn stroke eats the offset unless compensated). Being `absolute`, it is outside the flow
      // and so does not count as a second flow child beside the thumb — which is what lets the travel
      // work at all.
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { color: 'default' } },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring` component, inset from the TRACK so the ring surrounds the pill. On the track and never the thumb: the thumb moves, and an indicator that moves with it competes with the one thing that signals state. Its INSTANT-appearance requirement (no transition on the ring, unlike the thumb) is not expressible here.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word, so a
      // passing mention inside an entry about something else does not count (#563).
      'read-only — declared in `states` and carried by no Figma member, and here the reason is a MEASURED rejection rather than an absent token. `text-field` binds `border.read-only: color.border.secondary`, and that role resolves to the same palette step as `color.interactive.neutral.border.rest` in all four brands (nb neutral.400, harbor neutral.450, wendys/aurora neutral.400) — so binding it would produce a read-only switch pixel-identical to a rest switch while reading in the def as though the brief\'s "visually distinct from disabled" requirement had been met. The brief\'s own answer is a LOCK AFFORDANCE, a glyph rather than an ink, which would be a fifth part nobody has designed.',
      'pending — first-class in `props` and absent from the set, because it is a THUMB SWAP and not a skin: the brief locks input, replaces the thumb with a spinner and announces `aria-busy`. Button expresses exactly that with an `overlay` part (#848), so the mechanism exists and the part does not; adding it here would be a second concern in a PR whose subject is the travel. What the set would show without it is 24 members with a static thumb, which is what it shows.',
      'min-height — `size.*.min-height` is the ROW\'S FLOOR and Figma has no floor. `PartDef` carries `height`, which is fixed, so binding it on the row would state the wrong quantity and clip a wrapping label at the one coordinate that matters most. The row hugs its children instead and the keys stay bound for the code projection, where `min-height` is the property they name.',
      'THE THUMB\'S TRAVEL AS MOTION. What this anatomy carries is the two ENDPOINTS — `positionWhen` names a position per coordinate, and a Figma variant is a still frame. The slide between them (brief §8: roughly 150-200ms, ease-out, with the track color crossfading over the same interval, and `prefers-reduced-motion` collapsing it to an instant jump) has no expression in this schema at all, and it is the animation the component is most recognized by. A designer reading the set sees a thumb at each end and nothing about how it gets there.',
      'THE THUMB\'S INSET FROM THE TRACK\'S ENDS. The thumb projects FLUSH at both ends — `start` and `end` are the frame\'s edges, and the track carries no padding because no token in the tier expresses the inset: it would be (height - dot) / 2, which is height/4, and that is 4/5/6px at the shipped rungs and a step no space ladder carries. Every shipped switch insets its thumb. Filed rather than guessed at, because the number is a token-tier decision (#900\'s family already grew once) and not this def\'s to mint (#997).',
      'THE INNER-TRACK AFFORDANCE (`showStateLabel`) — an on/off checkmark or I/O glyph inside the track, off by default. A fifth part, gated on `selection` the way checkbox\'s two marks are, for a prop that is off at every default coordinate; adding it would double the members for content the guidance says to use only where legibility genuinely demands it.',
      'THE FULL-WIDTH SETTINGS ROW, which is this component\'s actual habitat and is layout rather than anatomy. The row HUGS its children here, so `label` and `track` sit adjacent with the gap between them; a settings panel stretches the row and pins the track to the trailing edge, and `justify` on a hugging row cannot express that. `labelPosition: trailing` — the control-leading order for a switch sitting among other form controls — is the same kind of fact: a prop that reorders this row, and the reordered form is the code projection\'s.',
      'The `description` prop — helper text beneath the label, describedby-wired, where the CONSEQUENCE of the setting goes. A second text part under `label` rather than beside it, which would change the row\'s vertical shape at all 24 members for content that is optional at every one of them.',
    ],
  },

  figmaProperties: {
    // BOTH axes, and `selection` is not optional: the thumb's `positionWhen` is keyed on it, so an
    // unprojected `selection` would build every member with the thumb at the track's declared `justify`
    // — a set of 24 switches that all read as off. `anatomyErrors` refuses that combination rather than
    // leaving it to be found in a Figma file.
    variantAxes: ['selection', 'size'],
    // Six of the EIGHT states — `read-only` and `pending` are both admitted in `codeOnly` above, with
    // different reasons. 2 selections x 2 sizes x 6 states = 24 members, radio's 36 less the third rung.
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'error'] },
    texts: {
      // A REAL SETTING, not "Label" — #798's finding is that a text part with no TEXT property projects a
      // blank node, and the corollary is that this default is the only copy anyone reviewing the set will
      // see. The brief's canonical example, in the sentence case this def's own content rule requires,
      // which also demonstrates the rule that the label names the setting and never the state.
      label: { part: 'label', default: 'Airplane mode' },
    },
    // No `swaps` — the thumb is geometry this def owns, not a glyph a consumer nominates. No `slotAxes`:
    // the thumb is not gated by presence at all, it MOVES, which is the distinction this def added to the
    // schema.
    booleans: {},
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
      'THE TRACK IS DELIBERATELY ASYMMETRIC ABOUT ITS RIM: `off` paints a fill AND a border, `on` paints a fill only. It looks like an oversight and it is the opposite — it is the one place in the selection family where the border survived #1011, and the reason is measured. A rim is redundant when the fill it sits inside already bounds the box against the page; `interactive.primary.fill.selected` does (4.94-14.17:1 across 5 brands x 4 modes), so the ON track drops its border like checkbox and radio did. `interactive.neutral.fill.rest` does NOT (1.21-1.58:1, and 1.39-1.81 at hover, 1.64-2.09 pressed) — nowhere near SC 1.4.11\'s 3:1 on any brand — so the OFF track\'s rim is the only edge it has, and deleting it would leave an unbounded gray slab on a light page. THIS IS THE TRAP: `off.border` reads as the leftover of a pattern the other two defs abandoned, and removing it "for consistency" breaks 1.4.11 on all five brands at once. It is also load-bearing for the GATE — `lint-paint.ts` arm 4 measures the same-family fill+border pairs in the corpus, and after #1011 this track is the ONLY def that still contributes any, so stripping it empties arm 4\'s scope entirely (verified by mutation: the arm reports "0 pairs measured of 16" and fails on its zero-scope guard rather than passing over nothing). The asymmetry is also WHY arm 4\'s rule is phrased about the fill\'s own contrast rather than comparing the two bindings to each other: a rule of the form "fill and border must agree" would flag this track, correctly-built, on every brand. Full reasoning and the byte-identical-ladder measurement: `checkbox.ts` `notes.contested`.',
      'THE `selection` VALUES ARE `[off, on]`, DIVERGING FROM checkbox\'s AND radio\'s `[unchecked, checked]`. #910 settled the axis NAME for the family and left the values open with an ARIA recommendation (`aria-checked` covers all three controls), so this is a decision taken against that recommendation rather than a default. Three grounds, argued in the header: paint-key values describe what is on SCREEN and appear in no ARIA tree; `role="switch"` is announced "on"/"off", so ARIA\'s own OUTPUT is on/off even though its PROPERTY is aria-checked; and `checked` is the word that carries this component\'s most common misuse, since a def spelled `[unchecked, checked]` reads as a checkbox with a different skin. The cost is real and unchecked by anything: the family now spells one axis two ways, there is no cross-def values census in the engine and none is possible from `VARIANT_AXES` (which closes names only), so this divergence is held by prose alone. If the family should have one vocabulary, this is the entry to delete.',
      'THE OFF TRACK TAKES THE INTERACTIVE-NEUTRAL FAMILY where checkbox and radio take the form-field family for their empty box. Forced by the thumb rather than chosen: measured across all four brands, a white thumb is 1.14-1.22:1 on `color.field.fill` and 1.57-1.58:1 on `interactive.neutral.fill.rest`, so the off thumb must take the dark ink, and `interactive.neutral.on-fill` (12.33-12.36:1) exists only in the interactive family. The NAMED ALTERNATIVE is to match the siblings on `color.field.fill` and accept an off thumb with no boundary, which several shipped systems do by relying on a thumb shadow — an effect the token tier does emit but which this def has no field to bind, and which would put a 1.2:1 boundary behind a decorative token.',
      'THE THUMB IS SELECTION-KEYED (`off.indicator` dark, `on.indicator` light), which no sibling\'s glyph is — checkbox and radio each have ONE icon ink. Measured: no single ink in the tier clears 3:1 against both tracks, and the closest candidate (`interactive.primary.border.pressed`) is 4.36:1 off and 1.00:1 on, because the two tracks sit on opposite sides of the luminance range. So this is structural to a two-position control rather than a styling choice, and the two keys cannot be collapsed into one.',
      'THE ASYNC MODEL SHIPS BOTH STANCES — optimistic-by-default with revert-and-message, plus a first-class `pending` lock. The field genuinely splits here (Carbon and Base Web optimistic-only; Primer\'s `loading`/`loadingLabel` and Atlassian\'s `busy` locking), and the brief\'s reconciliation is deliberate: mandating optimism universally puts the whole orchestration burden on every consumer, and mandating the lock kills the immediacy that is the entire component. Recorded as contested because a system that picks one would read this def as indecisive, and the two-stance answer is the position rather than an absence of one.',
      'READ-ONLY IS SUPPORTED, against the brief author\'s own first instinct and adopted on the external pass\'s argument. It looks paradoxical — an un-toggleable toggle — and the case for it is enterprise: users review permission sets and system config they lack authority to change, and disabling those drops them from the tab order while swapping to static text hides the setting from screen readers and breaks data-table consistency. The contrary position is legitimate rather than wrong.',
      'THE LABEL SIDE DEFAULTS TO LEADING, which is the opposite of every other control in the corpus, and the brief\'s external pass defaulted the other way (control-leading, for sibling alignment with checkbox and radio). Both are defensible, which is why it is a prop; the default follows the dominant habitat, the settings row. It is not a `variants` axis here because it paints nothing at any coordinate — see the header.',
      'THE ON/OFF AFFORDANCE DEFAULTS TO A PLAIN TRACK, with inner-track icons available and off by default. The contested part is not the default but what the icons are FOR: they are a legibility aid, never the 1.4.1 answer, since thumb position already carries the state. Hardcoded adjacent On/Off text is rejected outright rather than defaulted off.',
    ],
    unverified: [
      'THE TRACK AND THUMB ARE NOW BOUND (#900\'s third and last instance), and what is unverified moved with the binding rather than away. The track reads `control.size.<rung>.height` for its thickness and `control.size.<rung>.width` for its length — 2x the height, the first use of a field the tier had emitted for this def and nothing had ever bound — and the thumb reads `control.size.<rung>.dot`. THREE THINGS NOBODY HAS LOOKED AT. (1) `dot` is HALF the height by the tier\'s construction, which was decided for radio\'s dot inside a ring; on a thumb that reads as a small circle in a wide pill, and the shipped systems put their thumb nearer the track\'s full height. The ratio is a token-tier decision, so this def records the doubt rather than overriding it. (2) At `small` the track is 16x32 (12x24 on aurora, a full rung down) with an 8px thumb — whether that reads as a switch at all is exactly what building one answers, and separately whether a 16px-tall row reaches SC 2.5.8\'s 24x24 target, which is the ROW\'s job and not the track\'s. (3) The brief still specifies no numeric track width, track height or thumb diameter anywhere — §4 gives "thumb position + stark track-color contrast", §8 gives durations, and §15\'s schema carries no dimension — so these bindings satisfy the tier\'s own stated intent and no brief-supplied target.',
      'THE THUMB SITS FLUSH AGAINST THE TRACK\'S ENDS, which no shipped switch does. `positionWhen` projects `start` and `end` as the track frame\'s own edges, and the inset that should hold the thumb off them would be (height - dot) / 2 = height/4 — 4/5/6px at the shipped rungs, and no space step in any brand carries 5. So the track binds no padding: the number would have to be minted in the token tier, which is #900\'s family growing a fourth field, and that is a decision this def is not entitled to take on its own. Filed as #997. What ships until then is geometrically correct and visually wrong at both endpoints, which is worth stating plainly because it is the first thing anyone will see.',
      'READ-ONLY BINDS NOTHING, and here the reason is a MEASUREMENT rather than an absence — which is the difference from checkbox and radio. A candidate exists: `text-field` binds `border.read-only: color.border.secondary`. But `color.border.secondary` resolves to the SAME palette step as `color.interactive.neutral.border.rest` in all four brands (nb neutral.400, harbor neutral.450, wendys and aurora neutral.400), so binding it would produce a read-only switch pixel-identical to a rest switch while reading in the def as though the brief\'s "visually distinct from disabled" requirement had been met. The brief\'s actual answer is a LOCK AFFORDANCE — a glyph, not an ink — which is anatomy.',
      'PENDING BINDS NO PAINT, and no def in the corpus binds any: `button` has declared `pending` since #843 and binds nothing for it, and the tier emits no pending ink. What the state actually changes is the thumb\'s CONTENT (a spinner replaces it) and the track\'s interactivity. The first of those is now EXPRESSIBLE and deliberately not expressed: `button` spells exactly this as an `overlay` part replacing a visual cell (#848), so the mechanism exists and the part is unauthored — admitted in `anatomy.codeOnly`, where it is a scoped omission rather than a schema gap. Recorded here so nobody reads the state as decorative.',
      'THE LABEL SIDE HAS ONE EXPRESSION AND `labelPosition` STILL HAS NONE. The anatomy states the DEFAULT — `row.children` is `[label, track]`, label-leading, which is the family\'s one structural divergence — and the flipped order the prop selects is not expressible, because a prop is not a coordinate and the row has one child order. RTL is the sharper half and is unchanged by this: it inverts TWICE over, since the row mirrors AND the thumb travel flips (on sits at the inline-END, so `positionWhen`\'s `end` is the right WORD — a logical edge — while the `MAX` it projects to is a physical one, and Figma auto-layout has no direction flag to mirror it). Logical properties make that automatic in CSS; a Figma projection would need it stated, and nothing states it.',
      'THE TRAVEL\'S TWO ENDPOINTS ARE NOW EXPRESSED AND THE MOTION BETWEEN THEM IS NOT — which is the whole of what #990 closed and the whole of what it did not. `positionWhen: { selection: { off: start, on: end } }` states where the thumb IS at each coordinate, and a Figma variant is a still frame either way. Brief §8 is emphatic that the slide is functional rather than decorative — it is the literal RECEIPT that the immediate action registered: a ~150-200ms ease-in-out `transform` translate (never an animated width) with a synchronized track-color crossfade, snapping optimistically on an async toggle with a spinner cross-fading onto the thumb, and sliding BACK on failure as the physical metaphor for rejection. Under prefers-reduced-motion the slide drops to 0ms. The engine emits `motion.duration-ms.*` and this def has no motion field to point at.',
      'THE INNER-TRACK AFFORDANCE (`showStateLabel`) NAMES NO GLYPH, and the anatomy arriving does not change that: a `vector` part would have to name a glyph from the 39-name vocabulary or the projection throws (#864), and the I/O pair in particular is not in it. So the part is admitted in `codeOnly` rather than authored against a name that does not resolve.',
      'THE WHOLE-ROW HIT TARGET NOW HAS A NODE AND STILL HAS NO NUMBER. `row` is the part it lands on — that is what the anatomy block made expressible — and the padding that would expand it to SC 2.5.8\'s 24x24 is a per-consumer decision about the surrounding layout, so no value is bound. It is sharper here than on the siblings for two reasons: the row is label-leading, so the control sits at the trailing edge where a stretched row puts it furthest from the label; and the track itself is only 16px tall at `small` (12 on aurora), which is the smallest control edge in the corpus. `size.*.min-height` remains the code projection\'s floor and is in `codeOnly`, because Figma has no floor.',
      'THE ASYNC RACE IS AN IMPLEMENTATION REQUIREMENT NOTHING HERE CAN HOLD: user toggles, local state flips, request fires, user toggles again before it resolves, and two mutations resolve out of order. The fix is to lock input on the first interaction until the promise settles, or to coordinate a pending state internally. It lives in `docs.do` prose.',
    ],
  },
};
