/**
 * Switch — the labelled ROW that NESTS `switch-control` (#1354, the #1226/#1330 decomposition a third
 * time). A binary on/off setting that takes effect IMMEDIATELY: no save, no submit, the flip IS the
 * input and the execution command. The painted track-and-thumb moved to `switch-control`; this def is
 * the labelled row that nests one instance of it in flow, `nest-exposed`, and paints the label.
 *
 * The boundary with checkbox is TOPOLOGICAL rather than visual: if a Save/Submit button sits anywhere
 * in the flow the change is staged and it is a Checkbox; if the change is live the instant you toggle,
 * it is this.
 *
 * ── THE DECOMPOSITION, AND THE COMPOSITION CHECK #1354 REQUIRED ────────────────────────────────────
 *
 * #1354 (owner, 2026-09-10) decomposes switch into a nest-exposed control primitive + the atom,
 * consistent with checkbox (#1330) and radio, with one precondition: confirm something actually NESTS a
 * switch-control before building the split. It does — the switch was ALREADY a row that contains a
 * control subtree (`row → trackBox → track → {thumb, focusRing}`), the exact shape checkbox had before
 * #1226 split it, so the split produces a genuine nester: this Row nests ONE `switch-control`, and the
 * atom has a consumer. The full composition reasoning is in `switch-control.ts`.
 *
 * The Row projects a SIZE-ONLY Figma set (2 members). `selection` (off/on) and `state` live on the
 * nested `switch-control` and are EXPOSED from it — surfaced as the consumer's properties on the Row
 * (Figma exposed nested-instance properties; React props; `.ai.json` options) — so the consumer drives
 * them from the parent instead of the Row re-enumerating them into its OWN variant matrix. Before #1354
 * the switch declared `variantAxes: ['selection', 'size']` + a 6-value `stateAxis` and authored the
 * track/thumb in place: 2 × 2 × 6 = 24 members. The collapse is 24 → 2; the atom carries the 24.
 *
 * ── THE X / CHECKMARK IN THE THUMB (#1354) ─────────────────────────────────────────────────────────
 *
 * Prism 2 ships a glyph inside the handle (`checkLine` on, `closeLine` off). #1354 adds it as the state
 * affordance — a cue beyond track color and thumb position — wired via the existing `showStateLabel`
 * prop. It lives on `switch-control` (a `check`/`close` vector in the thumb, gated on `selection`), and
 * the Row exposes `showStateLabel` alongside `selection` and `state`. The full treatment, and why it is
 * a code-gate rather than a variant axis, is in `switch-control.ts`.
 *
 * ── THERE IS NO `SwitchGroup`, AND THAT ABSENCE IS THE ARC'S CLOSING MOVE ────────────────────────
 *
 * Checkbox filed the group as a separate component (#901); radio's is mandatory; switch removes it
 * entirely. A settings panel of switches (Email / SMS / Push) is a List of rows — layout — not a
 * selection group: each switch fires its own distinct instant mutation and owns its own boolean.
 * Shipping a `SwitchGroup` would invite the anti-pattern of compiling a multi-select array, which is
 * checkbox's job. This is the one place in the family where an omission is the decision.
 *
 * ── `[off, on]`, `inherits`, AND THE REST OF THE FAMILY DECISIONS ──────────────────────────────────
 *
 * The `selection` values are `[off, on]`, a decision taken against #910's ARIA recommendation and
 * argued at length in `VARIANT_AXES`'s header and `notes.contested`: the values describe what is on
 * SCREEN and appear in no ARIA tree; `role="switch"` is ANNOUNCED "on"/"off"; and `checked` is the word
 * that carries this component's most common misuse. They now live on `switch-control` (the def that
 * carries the `selection` axis), and the Row exposes them. `inherits: 'checkbox'` is prose for a human
 * (nothing in the engine resolves it): the form-field substrate reaches this def through checkbox.
 *
 * ── THE LABEL LEADS, WHICH IS THE FAMILY'S ONE STRUCTURAL DIVERGENCE ────────────────────────────────
 *
 * Brief §3: the label LEADS and the control TRAILS, because a switch's habitat is a settings row where
 * the eye expects the toggle at the trailing edge — the opposite of checkbox and radio. It is a PROP
 * (`labelPosition`, default `leading`) and not a `variants` axis: it reverses a row's child order and
 * paints nothing, so it is an anatomy concern. The anatomy states the default (`row.children` is
 * `[label, control]`); the flipped order stays in `codeOnly`.
 *
 * ── `pending` AND `error` ARE THE ROW'S, AND `error` IS AN OUTCOME ─────────────────────────────────
 *
 * `pending` (brief §4, first-class here) locks input, swaps the thumb for a spinner and announces
 * `aria-busy`. `error` is an OUTCOME failure (the optimistic update did not take, revert the thumb,
 * error-color the track), not a validation failure — same coordinate name as checkbox's, opposite
 * semantics. Both are in `states` for the code projection; the Figma set is size-only, so neither
 * enumerates (the nested control's `state` is exposed and the consumer drives it).
 */
import { ComponentDef } from '../component-schema';

export const switchDef: ComponentDef = {
  id: 'switch',
  name: 'Switch',
  // The brief's aliases (§10), plus `switch-group` so an agent reaching for a group lands on the
  // nearest thing that exists and reads why there is none, rather than matching nothing.
  aliases: ['toggle', 'toggle-switch', 'on-off', 'switch-group'],
  category: 'form',
  status: 'draft',
  inherits: 'checkbox',
  description:
    'A control for a binary on/off setting that takes effect IMMEDIATELY — no save, no submit; the flip is both the input and the execution command. The labelled ROW: it nests a Switch.Control (the track, thumb and state glyph) and carries the setting label, with the whole row as the hit target and the control at the trailing edge. Independent by definition: there is NO SwitchGroup, which closes the selection-control decomposition arc (checkbox has an optional group, radio a mandatory one, switch none). A settings list of switches is a list of rows, not a selection group. Not a staged binary submitted with a form (Checkbox — if a submit button sits anywhere in the flow, it is a Checkbox), not an action or view-mode toggle (ToggleButton, aria-pressed), not a one-of-two exclusive labelled choice (Radio, Segmented Control).',

  // THE DELTA ONLY. The field substrate reaches this def through `checkbox` and is not restated.
  props: [
    { name: 'checked', type: 'boolean', required: false, description: 'The binary, with `defaultChecked` for the uncontrolled form — native naming. `onChange` is expected to apply the effect IMMEDIATELY: that expectation is the component\'s contract, and a switch whose change is committed by a later Save button is a Checkbox. For an async effect the controlled value is the SERVER-CONFIRMED source of truth with optimistic local state layered over it.' },
    { name: 'label', type: 'node', required: false, description: 'Rich content, and part of the hit target — checkbox\'s label model, inherited. Names the SETTING as a stable noun or adjective phrase ("Airplane Mode"), never the state ("Airplane Mode is On") and never an action ("Turn on Airplane Mode"). It does NOT change on toggle: a label that flips Enable/Disable is disorienting and is a common bug.' },
    { name: 'description', type: 'node', required: false, description: 'Helper beneath the label, describedby-wired. Where the consequence of the setting goes — what turning it on will actually do.' },
    { name: 'labelPosition', type: "enum: 'leading' | 'trailing'", values: ['leading', 'trailing'], default: 'leading', required: false, description: 'THE STRUCTURAL DIVERGENCE FROM CHECKBOX AND RADIO, where the control always leads. Defaults to label-LEADING because a switch\'s habitat is the settings row, with the toggle at the row\'s trailing edge where the eye expects it; flip to control-leading when a switch sits inline among other form controls. A PROP and not a variants axis: it changes a row\'s direction and no ink at any coordinate, so it is an anatomy concern (see the header).' },
    { name: 'isPending', type: 'boolean', required: false, default: 'false', description: 'FIRST-CLASS HERE, and the state that exists because immediacy meets latency. Locks input, swaps the thumb for a spinner and announces `aria-busy`. The practice ships optimistic-by-default — flip instantly, revert and message on failure — with this as the alternative for high-latency or critical toggles where an inconsistent intermediate is genuinely harmful.' },
    { name: 'readOnly', type: 'boolean', required: false, default: 'false', description: 'SUPPORTED, which is not obvious for a toggle. Enterprise dashboards need users to review permission sets and system config they lack authority to change, and disabling those drops them from the tab order while swapping to static text hides the setting from screen readers. So: `aria-readonly="true"`, focusable and IN the tab order, at full WCAG contrast (unlike disabled), and visually distinct from disabled.' },
    { name: 'showStateLabel', type: 'boolean', required: false, default: 'false', description: 'The on/off affordance — a checkmark in the thumb when on, an X when off (Prism 2\'s `checkLine`/`closeLine`), OFF by default since thumb position plus track color carries the state. Add only where state legibility genuinely demands it. Exposed from the nested Switch.Control, which carries the glyph. This is NOT hardcoded "On"/"Off" text adjacent to the label, which is rejected outright: it competes with the track, duplicates the screen-reader output, and does not localize.' },
    { name: 'size', type: "enum: 'small' | 'medium'", values: ['small', 'medium'], default: 'medium', required: false, description: 'TWO RUNGS, not three — "switches rarely warrant a large" (brief §15); `field-label` is the corpus precedent for a two-rung ladder. Scales the row: the label-to-control gap, the row\'s minimum height, the label\'s type, and — passed through to the nested control by `follow` — the track\'s height and length and the thumb\'s diameter. Re-declared rather than inherited because the ladder is read by the machinery (`lint-rung-names.ts` arm 2).' },
  ],

  // Checkbox's seven PLUS `pending`. These drive the CODE projection (a disabled Row dims its label);
  // the Figma set is size-only (the nested control's `state` is exposed). `error` is an OUTCOME failure
  // here, not a validation failure (see the header). `read-only` and `pending` are admitted in `codeOnly`.
  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'read-only', 'pending', 'error'],

  // `size` ONLY since #1354 (the decomposition). `selection` LEFT the Row's variant matrix — it is now
  // EXPOSED from the nested `switch-control` (the consumer drives it from the parent). `size` STAYS the
  // Row's own axis: it scales the label's type ramp, the gap and the row's min-height — things the nested
  // control does not touch — so it is not merely the control's axis. No surface/inverse axis (#871).
  variants: {
    size: ['small', 'medium'],
  },

  // ONE KEY GROUP since #1354: the painted track/thumb moved to `switch-control`, so the Row's whole
  // color surface is the label ink (the bare slot). The `{selection}`-led templates went with the
  // track; keeping them here with nothing selection-dependent left to resolve would be unreachable keys.
  paintKeys: ['{slot}'],

  tokens: {
    // ── THE ROW'S OWN PAINT IS ONE INK: THE LABEL. Every color binding for the track, thumb, glyphs,
    // focus ring and borders MOVED to `switch-control` with the painted surface itself. The label sits
    // BESIDE the control rather than on its fill, which is why its disabled ink is `disabled.text`
    // (field-label's pairing) and not `disabled.on-fill`.
    'label': 'color.text.primary',
    'disabled.label': 'color.disabled.text',

    // ── THE CONTROL-TO-LABEL GAP and the ROW'S FLOOR. `min-height` is the code projection's floor; Figma
    // has no floor, so the row hugs its children and the key stays bound only for code (see `codeOnly`).
    'size.small.gap': 'size.sm.gap',
    'size.medium.gap': 'size.md.gap',
    'size.small.min-height': 'size.sm.height',
    'size.medium.min-height': 'size.md.height',

    // ── THE ALIGNMENT BOX (#1201). One line of the LABEL tall, per rung — `control.size.*.line-box` is
    // the baked `body.{rung}` line-box. The nested control centers inside a box this tall while the ROW
    // stays top-aligned, so on a single line the control reads centered and on a WRAPPING label it holds
    // the first line instead of floating to the paragraph's middle.
    'size.small.control-box': 'control.size.sm.line-box',
    'size.medium.control-box': 'control.size.md.line-box',

    // ── THE NESTED CONTROL'S OWN HEIGHT (#1299-style pin). The `control` nest part binds this as its
    // `height` so the nested instance is PINNED to the track height — 16/20 on nb, 12/16 on aurora — and
    // does NOT stretch to fill the taller `control-box` line box it is centered within. The control is
    // NON-SQUARE (a track is 2:1), so the Row pins the HEIGHT only; the width is the control's own
    // (`control.size.*.width`, 2× the height), carried by its variant. `control.size.*.height` and NOT
    // `icon.size.*` for the same reason the atom binds it (the control ladder shifts a rung with brand
    // density where the glyph grid is fixed). The atom binds the identical key on its own root.
    'size.small.control': 'control.size.sm.height',
    'size.medium.control': 'control.size.md.height',

    // ── THE ROW'S TYPE. `type.body.*` and not `type.label.*` — semantically this is a setting name
    // sitting BESIDE a control (a settings-row label), not a form field's label announcing one above it,
    // and `type.body.*` is the only family in the tier carrying every rung. Two rungs, no `large`.
    'size.small.text': 'type.body.sm.default',
    'size.medium.text': 'type.body.md.default',
  },

  // ── ANATOMY — THE LABELLED ROW THAT NESTS THE CONTROL (#1354) ───────────────────────────────────
  //
  // Three parts now, not five: the whole ROW is the hit target, `trackBox` is the #1201 line-box
  // wrapper, and its CHILD is a `nest` of `switch-control` where the track, thumb, glyphs and focus ring
  // used to be authored in place. The atom paints itself and moves its own thumb; the Row paints the
  // label. The Row is LABEL-FIRST — the family's one structural divergence — because a switch's habitat
  // is the settings row with the toggle at the trailing edge.
  //
  // THE ROW MUST NOT CENTRE. This def's content rules say long labels wrap while the fixed-width track
  // does not shrink, so `align: center` here would float the control to the middle of a two-line label
  // (the wrong repair `test.ts` #1009 half-1 forbids). The row stays top-aligned (`align: start`) and
  // the centering lives one level down, in `trackBox`, which is one line-box tall.
  anatomy: {
    root: 'row',
    parts: {
      // THE HIT TARGET, and nothing else. No `paintSlots` (#933): this box is structure, and the def keys
      // no row-level fill or border for it to name. LABEL-FIRST: `children` is `[label, trackBox]`, the
      // switch's structural divergence. Its extent comes from its children; `min-height` is the row's
      // FLOOR and is in `codeOnly`, because Figma has no floor.
      row: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        children: ['label', 'trackBox'],
      },
      // No `paintSlot` — the default is `label`, and at `disabled` the projector reaches `disabled.label`
      // (page ink) rather than `disabled.label.on-fill`, because this text sits beside the track's fill
      // and not on it. LEADS the control.
      label: {
        kind: 'text',
        type: 'size.{size}.text',
        note: 'The accessible name AND the second half of the hit target. Names the SETTING as a stable noun phrase and does not change on toggle — a label flipping between Enable and Disable is this component\'s most common copy bug. Rich content in code; a plain text node in Figma. Must NOT become hardcoded "On"/"Off" text beside the name, which duplicates the screen-reader output and does not localize.',
      },
      // THE ALIGNMENT BOX (#1201). One line of the label tall (`size.{size}.control-box` → the baked
      // `body.{rung}` line-box), centering the control on its cross axis. Draws nothing — it gives the
      // control a line-tall box to center within, so the top-aligned row holds it on the FIRST line of a
      // wrapping label. Height FIXED; width HUGs the (2:1) control.
      trackBox: {
        kind: 'box',
        role: 'presentation',
        height: 'size.{size}.control-box',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        children: ['control'],
      },
      // THE NESTED CONTROL (#1354). Where the track, thumb, glyphs and focus ring used to be authored in
      // place, the Row now nests ONE instance of `switch-control` — an in-flow `kind: 'nest'`, the twin of
      // the `absolute` focus ring but taking a cell. A fix to the track (its border weight, its fill
      // grammar) or the thumb (its travel, its glyph) reaches here without being copied.
      //
      // IT IS `nest-exposed` (#1330's mechanism). The control's `selection`, `state` and `showStateLabel`
      // are EXPOSED — surfaced as the consumer's properties on the Row rather than re-enumerated into the
      // Row's OWN variant matrix — so the Row projects SIZE-ONLY (2 members) instead of 2 selections × 2
      // sizes × 6 states = 24 that merely mirror the atom. `follow: ['size']` passes the Row's own size
      // rung into the nested control; `variant` is the DEFAULT the instance starts at (`selection=off,
      // state=rest`), the member the exposed properties drive FROM.
      //
      // IT PINS ITS OWN HEIGHT and does NOT stretch. `height: 'size.{size}.control'` (→ control.size.*.height,
      // the track height) binds the instance's height, which is SHORTER than the `control-box` line box it
      // is centered within — so the control reads centered on the first line rather than filling the taller
      // box (#1299's nest-height mechanism; the control is non-square, so the Row pins height only and the
      // control's own variant carries the 2× width).
      control: {
        kind: 'nest',
        nests: 'switch-control',
        height: 'size.{size}.control',
        nesting: { kind: 'nest-exposed', variant: { selection: 'off', state: 'rest' }, expose: ['selection', 'state', 'showStateLabel'], follow: ['size'] },
        note: 'An in-flow instance of `switch-control` taking the control cell inside the line-box wrapper. It EXPOSES the control\'s selection, state and showStateLabel (the consumer drives them from the Row), follows the Row\'s size, and pins its own height so it is centered within the taller wrapper rather than stretched to fill it.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word (#563).
      'read-only — a `states` value the Figma set does not carry. Since #1354 the Row projects a SIZE-ONLY set (no stateAxis): the control\'s `state` is EXPOSED from the nested `switch-control` and the consumer drives it from the Row, so no state is enumerated into the Row\'s own matrix. read-only binds NOTHING even in code: the brief recommends a lock affordance over a styled locked control, and the one candidate token resolves to the same step as the rest border in all four brands.',
      'pending — first-class in `props` and carried by no Figma member. It is a THUMB SWAP (a spinner replaces the thumb) on the nested control plus an `aria-busy` lock, not a row skin; `button`\'s `overlay` part (#848) is the mechanism, unauthored on the control here. The Row\'s own per-state LABEL treatment (`disabled.label` dimming the text) is the CODE projection\'s, not Figma\'s — `lint-paint` arm 2 reads `def.states` for reachability, so `disabled.label` stays reachable and keyed for code while the Figma SET collapses to size-only.',
      'states — the documented cost of collapsing 24 members to 2 (the #1354 decomposition). A disabled Row in Figma shows the disabled CONTROL (the exposed state) beside a full-ink label, because the Row no longer multiplies state.',
      'showStateLabel — the X/checkmark affordance is exposed from the nested `switch-control` as a consumer property (React prop, `.ai.json` option, Figma exposed property) and gated IN CODE; the glyph is present in the control\'s Figma set at every member (Prism 2\'s `icon`-prop model), so the Row carries no boolean axis for it. See `switch-control.ts`.',
      'min-height — `size.*.min-height` is the row\'s FLOOR and Figma has no floor. `PartDef` carries `height`, which is fixed, so binding it on the row would clip a wrapping label at the one coordinate that matters most. The row hugs its children instead and the keys stay bound for the code projection.',
      'THE FULL-WIDTH SETTINGS ROW, this component\'s actual habitat and layout rather than anatomy. The row HUGS its children here, so `label` and the control sit adjacent with the gap between them; a settings panel stretches the row and pins the control to the trailing edge, and `justify` on a hugging row cannot express that. `labelPosition: trailing` — the control-leading order for a switch among other form controls — is the same kind of fact: a prop that reorders this row, and the reordered form is the code projection\'s.',
      'The `description` prop — helper text beneath the label, describedby-wired, where the CONSEQUENCE of the setting goes. A second text part under `label` rather than beside it, which would change the row\'s vertical shape for content that is optional at every member.',
      'RTL — the label-leading row mirrors AND the thumb travel flips (`on` sits at the inline-END). Logical properties make that automatic in CSS; a Figma projection would need it stated, and nothing does.',
    ],
  },

  figmaProperties: {
    // SIZE ONLY since #1354 (the decomposition). `selection`, `state` and `showStateLabel` are EXPOSED
    // from the nested `switch-control` (see the `control` part), so the Row no longer enumerates them —
    // it projects 2 size members where it used to project 2 selections × 2 sizes × 6 states = 24 that only
    // mirrored the atom. The `control` nest `follow`s `size` (the one axis this def projects) and exposes
    // the rest; `#1298`'s reachability check confirms `size` is projectable, and the exposed axes are the
    // child's — checked against the atom at projection (`nestVariantMatch`) and round-trip, not here.
    variantAxes: ['size'],
    // NO `stateAxis` (#1354). The control's `state` is exposed, not multiplied into the Row's set — the
    // Row's own `states` list (above) still drives the CODE projection (a disabled Row dims its label),
    // and `lint-paint` arm 2 reads `def.states` for reachability so `disabled.label` stays reachable; it
    // is the FIGMA set that collapses.
    texts: {
      // A REAL SETTING, not "Label" — #798's finding is that a text part with no TEXT property projects a
      // blank node, and the corollary is that this default is the only copy anyone reviewing the set sees.
      // The brief's canonical example, in the sentence case this def's content rule requires.
      label: { part: 'label', default: 'Airplane mode' },
    },
    // No `swaps` — the Row nests `switch-control` and exposes its properties (the def picks the control,
    // the consumer drives it). No `slotAxes`.
    booleans: {},
  },

  accessibility: {
    role: 'switch (native <input type="checkbox" role="switch">), with aria-checked true/false — announced "on"/"off", NOT "checked"',
    wcag: [
      '4.1.2 Name Role Value (the switch role and aria-checked doing the work)',
      '1.4.1 Use of Color (thumb POSITION distinguishes on from off, never track color alone; the thumb glyph is a legibility aid on top of that)',
      '1.4.11 Non-text Contrast (the off-state track must be distinguishable from the background) / 2.4.13 Focus Appearance',
      '2.5.8 Target Size (the whole row, as checkbox)',
      '4.1.3 Status Messages (the async outcome or error of an immediate change)',
    ],
    keyboard: 'Each switch is its OWN tab stop — like checkbox, unlike radio, and there is no group to traverse. SPACE toggles, which is the canonical W3C activation; some systems also accept Enter. Nothing else: no arrow keys, because a switch is never one of a mutually-related set.',
    focus: ':focus-visible ring on the TRACK, never the thumb — the thumb moves, and a ring that travels with it reads as two indicators. Offset, at least 3:1, keyboard traversal only. A read-only switch STAYS in the tab order and stays focusable; a disabled one is removed from it.',
    aria: 'THE ROLE IS THE HEADLINE, and the three-way distinction is the whole game: checkbox is role="checkbox" (announced "checked"), switch is role="switch" (announced "ON"/"OFF"), and a toggle button is role="button" + aria-pressed (announced "pressed"). Putting aria-pressed on a switch is a recurring and severe error that CORRUPTS the announcement. Prefer the styled native input — <input type="checkbox" role="switch"> keeps focus, activation and the a11y tree for free. ANNOUNCE THE IMMEDIATE EFFECT: aria-checked flips on toggle; for an async effect set aria-busy during flight and announce the outcome politely (4.1.3). The thumb glyph is decorative (aria-hidden) — the role and state already carry on/off. TWO IMPLEMENTATION TRAPS: the IA2 quirk, where both aria-pressed buttons and role="switch" map internally to IA2_ROLE_TOGGLE_BUTTON — author to the ARIA spec regardless; and shadow-DOM label detachment, where wrapping a web-component switch in a native <label> does NOT associate the name with the input inside the shadow root, so set aria-label or aria-labelledby explicitly.',
  },

  content: {
    labelPattern: 'Names the SETTING, not the state and not the action — "Airplane Mode", "Location Services"; not "Airplane Mode is On" and not "Turn on Airplane Mode". A stable noun or adjective phrase that does NOT change on toggle: a label flipping between Enable and Disable is disorienting and is a common bug. Positive framing is mandatory — the on state is the affirmative, so off never means a double negative. Sentence case, no terminal punctuation. Long labels wrap; the fixed-width track does not shrink. AND REJECT HARDCODED ADJACENT "On"/"Off" TEXT, which is the label rule this control has and its siblings do not: it competes with the track state, produces duplicative screen-reader output, and does not localize. The track plus the role="switch" announcement already carries it; where legibility genuinely demands more, use the thumb glyph affordance (`showStateLabel`) rather than words.',
    errorPattern: 'An OUTCOME failure, not a validation failure: say what did not happen and that it reverted — "Couldn\'t turn on notifications. Try again." Near the control, as a status message rather than a field error. Never "Invalid input"; there was no input to invalidate.',
  },

  docs: {
    usage: 'Use for a binary on/off setting that applies IMMEDIATELY — notifications, dark mode, Wi-Fi, a feature flag in a settings panel. Compose into a list or settings row with the label leading and the switch at the trailing edge, which is the habitat this control comes from. There is no group: a panel of switches is a list of rows, and each switch owns its own independent boolean and fires its own mutation. Default to optimistic updates with revert-and-message on failure, and reach for `pending` only where an inconsistent intermediate would genuinely harm.',
    do: [
      'Apply the change the instant it is toggled — the immediacy IS the contract',
      'Put the label first and the switch at the row\'s trailing edge; flip to control-leading only when a switch sits inline among other form controls',
      'Name the setting, not the state, and keep the label the same on and off',
      'Default to optimistic: flip immediately, then revert and say what failed if the effect did not take',
      'Guard the re-toggle race — lock input on the first interaction until the effect resolves',
      'Support read-only for settings a user may review but not change: focusable, in the tab order, at full contrast',
      'Let thumb POSITION carry the state, and add the thumb glyph (`showStateLabel`) where legibility demands a cue beyond color',
    ],
    dont: [
      'Use a switch for a binary that is submitted with a form — if a Save button sits anywhere in the flow it is a Checkbox, and Apple rejects App Store submissions over exactly this',
      'Use a switch whose toggle reveals a sub-form that must be filled before the data is valid — that is progressive disclosure, not an immediate mutation, and it is the most common real misuse',
      'Put aria-pressed on a switch — it corrupts the announcement; aria-pressed is a toggle BUTTON',
      'Reach for a SwitchGroup — there is none, deliberately: a settings list is a list of rows',
      'Hardcode "On"/"Off" text beside the label — use the thumb glyph affordance instead',
      'Add a third or indeterminate state — role="switch" coerces aria-checked="mixed" to false',
      'Put the focus ring on the thumb — it moves, so the indicator would travel with it',
    ],
    contentGuidelines: 'The label names the setting and never changes. The description says what turning it on will do. Async failures say what did not happen and that it reverted.',
  },

  ai: {
    primaryPurpose: 'Set a binary on/off value that takes effect immediately, with no save step, via a labelled row that nests the track-and-thumb control.',
    whenToUse: 'A single independent setting that applies the moment it is flipped — a notification preference, dark mode, a feature flag — usually in a settings row or list with the label leading.',
    avoidWhen: 'The change is staged and committed by a Save or Submit button (Checkbox — the presence of that button anywhere in the flow is the tell), the toggle reveals a sub-form that must be completed for the data to be valid (Checkbox again; the most common misuse), it is a single consent or agreement (Checkbox), it performs an action or sets a view mode rather than holding a setting (ToggleButton with aria-pressed), it is a one-of-two exclusive labelled choice (Radio or Segmented Control), or a third indeterminate state is needed (Checkbox). Also do not reach for this def expecting a group: there is no SwitchGroup by decision.',
    commonPartners: ['switch-control', 'field-label', 'field-message', 'focus-ring', 'icon', 'card'],
    triggerKeywords: ['switch', 'toggle', 'toggle switch', 'on off', 'on/off', 'enable', 'setting', 'immediate', 'feature flag', 'dark mode'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['switch-control', 'field-label', 'field-message', 'focus-ring', 'icon'],
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
      'THE `selection` VALUES ARE `[off, on]`, DIVERGING FROM checkbox\'s AND radio\'s `[unchecked, checked]`. #910 settled the axis NAME for the family and left the values open with an ARIA recommendation, so this is a decision taken against that recommendation. Three grounds: paint-key values describe what is on SCREEN and appear in no ARIA tree; `role="switch"` is announced "on"/"off", so ARIA\'s own OUTPUT is on/off even though its PROPERTY is aria-checked; and `checked` is the word that carries this component\'s most common misuse. Since #1354 the values live on `switch-control` (the def that carries the axis), and the Row exposes them. The cost is real and unchecked by anything: the family now spells one axis two ways, and there is no cross-def values census in the engine. If the family should have one vocabulary, this is the entry to delete.',
      'THE TRACK IS DELIBERATELY ASYMMETRIC ABOUT ITS RIM (off paints a fill AND a border, on paints a fill only), and that asymmetry, the interactive-neutral off track, and the selection-keyed thumb ink all moved to `switch-control` with the painted surface. They are the one place in the selection family where the border survived #1011, and the reason is measured (a gray fill does not clear 3:1 against the page, so the off rim is the only edge the track has). Removing `off.border` "for consistency" breaks 1.4.11 on all five brands at once AND empties `lint-paint.ts` arm 4\'s scope — this track is the only def that still contributes a same-family fill+border pair. Full reasoning: `switch-control.ts` and `checkbox.ts`.',
      'THE ASYNC MODEL SHIPS BOTH STANCES — optimistic-by-default with revert-and-message, plus a first-class `pending` lock. The field genuinely splits here, and the brief\'s reconciliation is deliberate: mandating optimism universally puts the whole orchestration burden on every consumer, and mandating the lock kills the immediacy that is the entire component.',
      'READ-ONLY IS SUPPORTED, against the brief author\'s own first instinct and adopted on the external pass\'s enterprise argument: users review permission sets and system config they lack authority to change, and disabling those drops them from the tab order while swapping to static text hides the setting from screen readers.',
      'THE LABEL SIDE DEFAULTS TO LEADING, the opposite of every other control in the corpus, because the default follows the dominant habitat (the settings row). It is a prop, not a `variants` axis, because it paints nothing.',
      'THE ON/OFF AFFORDANCE (the thumb glyph) DEFAULTS OFF, with a checkmark/X available via `showStateLabel`. The contested part is not the default but what the glyph is FOR: a legibility aid, never the 1.4.1 answer, since thumb position already carries the state. Hardcoded adjacent On/Off text is rejected outright rather than defaulted off. The glyph lives on `switch-control`; why it is a code-gate rather than a variant axis is argued there.',
    ],
    unverified: [
      'THE DECOMPOSITION IS UNVERIFIED ON A REAL HOST, the same way `checkbox-control`\'s was: the nested control instance must pin its own HEIGHT (the track height) rather than stretch to the `control-box` line box, and whether the instance\'s inherited sizing mode cooperates with the row\'s auto-layout is a real-host question the offline shim cannot answer. The symptom to look for: a control instance stretched to the line-box height instead of centered within it. The control is non-square, so the Row pins HEIGHT only and the width is the control\'s own 2:1 — a narrower pin than checkbox\'s square.',
      'THE THUMB GLYPH IN A HALF-HEIGHT THUMB IS UNBUILT AND MAY NOT READ (the thumb is half the track height by the tier\'s shared ratio; at `small` the glyph is ~5.7px after its optical inset). The measurement and the reason it is not this def\'s to override are in `switch-control.ts`.',
      'THE LABEL SIDE HAS ONE EXPRESSION AND `labelPosition` STILL HAS NONE. The anatomy states the DEFAULT (`row.children` is `[label, trackBox]`, label-leading); the flipped order the prop selects is not expressible, because a prop is not a coordinate. RTL is the sharper half and inverts twice over (the row mirrors AND the thumb travel flips).',
      'THE TRAVEL\'S TWO ENDPOINTS ARE EXPRESSED AND THE MOTION BETWEEN THEM IS NOT — on `switch-control` now. The ~150–200ms ease-in-out slide with the synchronized track-color crossfade (dropping to 0ms under prefers-reduced-motion) is the animation the component is most recognized by and has no expression in the schema.',
      'THE WHOLE-ROW HIT TARGET NOW HAS A NODE AND STILL HAS NO NUMBER. `row` is the part it lands on; the padding that would expand it to SC 2.5.8\'s 24×24 is a per-consumer decision about the surrounding layout, so no value is bound. It is sharper here than on the siblings because the row is label-leading (the control sits at the trailing edge, furthest from the label) and the track is only 16px tall at `small`.',
    ],
  },
};
