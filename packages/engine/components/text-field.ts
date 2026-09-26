/**
 * TextField — the calibration brief for ENCAPSULATION BOUNDARY and ACCESSIBILITY WIRING
 * (KB text-field brief; Button is the calibration for intent×appearance, this is for where the
 * field ends and the form begins). A single-line control for free-form, non-enumerable text.
 *
 * The composition call (brief §2, §3, §12): TextField is the HOST that composes the two shared
 * field parts — `field-label` (the accessible name) and `field-message` (helper / validation) —
 * rather than re-declaring their tokens. So this def's `tokens` block is the INPUT CHROME only
 * (fill, the stateful border, placeholder, focus ring, disabled skin, geometry); label and
 * message color/type live in their own defs and are reused by Select / NumberField later. That
 * is the "composed slots" half of the brief's hybrid, expressed in the data model. The host owns
 * the WIRING the parts can't: useId-generated ids tying label→input and stitching the
 * aria-describedby chain (helper + error), plus aria-invalid on error (§6, §11).
 *
 * State model = the input border, which is the one stateful field slot:
 *   rest → field.border.rest · hover → field.border.hover (a subtly stronger boundary, never the
 *   sole cue) · focus → border.focus + the field focus ring · read-only → border.secondary with
 *   FULL-contrast text.primary (read-only ≠ disabled: focusable, copyable, submitted, passes
 *   contrast — the component's live edge, §4) · disabled → the shared disabled.* skin
 *   (contrast-exempt). Validation is NOT a state: it is the `status` axis (see below).
 *
 * ── VALIDATION IS THE `status` AXIS, ALIGNED TO field-message (#1494, mirroring select) ───────────
 *
 * This def now PROJECTS into Figma (it had an `anatomy` block and named its parts only in
 * `composition` until #1494). Bringing it up to select's shape moved validation off the state axis and
 * onto its own `status` variant axis, carrying `[default, error, warning, success]` — the SAME four
 * values field-message's `status` carries, so the nested message follows this axis by name (a
 * same-name, same-value passthrough via `nest-fixed` `follow`). `error` therefore left `states`: it was
 * never an interactive state (it co-occurs with rest/hover/focus, it does not replace them), and folding
 * it into the state axis was the pre-projection shortcut a single unprojected axis could afford.
 * The CODE prop that drives this axis is `validation` (+ `validationMessage`) — select's names and values
 * exactly (#1623 sign-off, C1/TF-5); the axis keeps the name `status` so `follow` passes it through.
 *
 * status → border is a status-led, border-ONLY swap, bound PER non-disabled state (rest / hover /
 * focus-visible / read-only / empty) so the status boundary persists while the pointer moves and while the
 * value is read-only, rather than yielding to the neutral interactive border; the focus RING (an absolute
 * sibling) carries the focus signal on top. #1517 (owner-directed, Prism 2 parity) extended the swap from
 * `error` ONLY to all three non-default statuses: `error` → `color.border.danger`, `warning` →
 * `color.border.warning`, `success` → `color.border.success`. `default` binds no status-led border and
 * falls through to the neutral state border. The nested field-message carries the status text in parallel,
 * so the field now signals status on BOTH the border and the message (was error-only-border, with warning
 * and success message-only). Select mirrors this def key-for-key, as it always has.
 *
 * Scope: the BASE field only. NumberField is a separate component (different keyboard + locale
 * parsing); SearchField / PasswordField are thin specializations; email / url / tel stay as
 * `type` + inputmode + autocomplete here (brief §3). Validation is PRESENTATIONAL by default —
 * the field renders the validation it is handed; a form library owns timing. No validation engine
 * is baked in.
 */
import { ComponentDef } from '../component-schema';

export const textField: ComponentDef = {
  id: 'text-field',
  name: 'TextField',
  aliases: ['text-input', 'input', 'textbox', 'formfield'],
  category: 'form',
  status: 'draft',
  summary: 'Single-line text field: label, input, and helper or validation message.',
  description:
    'A single-line control for free-form, non-enumerable text — names, emails, SKUs, short queries. A composed host: label + input + helper/validation message, with the accessibility wiring (id generation, aria-describedby chain, aria-invalid) handled internally. Not multi-line (Textarea), not a known set (Select, or a combobox), not numeric-formatted (a number field), not suggestion-backed (a combobox). The combobox and number field are not built yet.',

  props: [
    { name: 'label', type: 'string | node', required: true, description: 'The visible, persistent label (rendered as FieldLabel). Required — a visually-hidden label is the only label-less case, and it still exists in the DOM. Never the placeholder.' },
    { name: 'value', type: 'string', required: false, description: 'Controlled value; pair with onChange. A controlled value with no onChange is read-only by accident.' },
    { name: 'defaultValue', type: 'string', required: false, description: 'Uncontrolled initial value — preferred for form-library ergonomics.' },
    { name: 'onChange', type: 'function', required: false, description: 'Change handler (also onBlur / onFocus).' },
    { name: 'type', type: "enum: 'text' | 'email' | 'url' | 'tel' | 'search' | 'password'", values: ['text', 'email', 'url', 'tel', 'search', 'password'], default: 'text', required: false, description: 'Attribute-only variants (mobile keyboard + autofill). Not number: numeric input needs a number field (not built yet). search / password are better served by their thin specializations.' },
    { name: 'placeholder', type: 'string', required: false, description: 'An example only ("name@example.com"); vanishes on input; nothing load-bearing lives here.' },
    { name: 'helpText', type: 'string | node', required: false, description: 'Persistent guidance (rendered as FieldMessage, default status); wired via aria-describedby. Show the format BEFORE failure.' },
    // #1623 sign-off (C1/TF-5) — validation is the `validation` + `validationMessage` pair, select's exact
    // prop names and value set, so one concept has one name across the field family. The Figma `status`
    // variant axis maps to `validation` value-for-value (the axis keeps field-message's name so the nested
    // message follows it). Replaces the old `error` message prop. `test.ts` pins the shared contract.
    { name: 'validation', type: "enum: 'default' | 'error' | 'warning' | 'success'", values: ['default', 'error', 'warning', 'success'], default: 'default', required: false, description: 'The validation state. Each non-default status swaps the input border to its own boundary (border-only — `error` → danger, `warning` → warning, `success` → success) AND sets the nested message to the matching status; `default` is neutral. `error` also sets aria-invalid. The values align with FieldMessage\'s status axis, so this drives the nested message directly.' },
    { name: 'validationMessage', type: 'string | node', required: false, description: 'The validation text shown at error / warning / success, added to aria-describedby. For error, say what is wrong AND how to fix it (SC 3.3.3), never "Invalid".' },
    // #1494 — a node-visibility boolean (the #1412 mechanism), mirroring select's `showMessage`. Hides the
    // composed FieldMessage entirely; default ON (the message is part of the field). Turning it off is for a
    // field with genuinely nothing to say — an error still sets aria-invalid and the message carries the
    // reason, so never hides a message the field needs. See `figmaProperties.booleans`.
    { name: 'showMessage', type: 'boolean', default: true, required: false, description: 'Whether the composed FieldMessage is shown. ON — the default — renders the helper / validation message below the input; turning it off hides the message entirely (a field with no helper or validation text). Never hides a message the field needs.' },
    { name: 'required', type: 'boolean', default: false, required: false, description: 'Sets required / aria-required, and turns on the FieldLabel\'s required marker.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled — removed from tab order, not submitted, silent to AT, contrast-exempt. Reserve for fields irrelevant in the current state.' },
    { name: 'readOnly', type: 'boolean', default: false, required: false, description: 'Distinct from disabled: focusable, selectable and copyable, submitted with the form, and passes contrast. Use for a value the user may read/copy but not edit (a generated key). The component\'s live edge.' },
    { name: 'autoComplete', type: 'string (WHATWG token)', required: false, description: 'Satisfies SC 1.3.5 Identify Input Purpose — an accessibility obligation, not a convenience.' },
    { name: 'inputMode', type: "enum: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search'", values: ['text', 'numeric', 'decimal', 'tel', 'email', 'url', 'search'], required: false, description: 'Selects the mobile virtual keyboard.' },
    { name: 'prefix', type: 'slot (adornment)', required: false, description: 'Leading adornment — a decorative/purpose glyph (currency, search), aria-hidden. Signals the field\'s PURPOSE; validation never mutates it.' },
    { name: 'suffix', type: 'slot (adornment | action)', required: false, description: 'Trailing adornment. May be decorative (aria-hidden) OR a real labeled action (clear / reveal) — a focusable button, not decoration. The decorative-vs-interactive split is load-bearing.' },
    // #1494 — the Figma-projected presence + swap of the LEADING glyph (the `prefix` adornment above),
    // mirroring select's `leadingIcon`. A node-visibility boolean (#1331/#1412) whose glyph the file
    // nominates: the leadingVisual node is emitted at every member hidden, and the `leading icon` switch flips
    // it in place, so presence does not multiply the projected set. Signals the field's purpose; validation
    // never mutates it.
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An optional leading glyph before the value (a purpose or category mark), aria-hidden. Hidden by default; the file nominates the swap target. The Figma-projected form of the `prefix` adornment (its presence boolean + content swap).' },
    // #1494 — the TRAILING affix slot select does not have: the clear-button / password-reveal edge control.
    // In CODE this is an INTERACTIVE control (its own tab stop + accessible name — see `suffix` / `clearable`
    // and the a11y block); Figma projects only its GLYPH (a presence boolean + swap on an optional trailing
    // slot, exactly as `leadingIcon` models the leading glyph). See `anatomy.codeOnly`.
    { name: 'trailingIcon', type: 'slot', required: false, description: 'An optional trailing affix at the field\'s trailing edge (the glyph of a clear / reveal action, or a decorative mark), aria-hidden as a glyph. Hidden by default; the file nominates the swap target. The Figma-projected glyph of the `suffix` / `clearable` action, whose interactive behavior Figma cannot carry.' },
    { name: 'clearable', type: 'boolean', default: false, required: false, description: 'Adds a labeled Clear button that announces the cleared state and RETURNS FOCUS to the input (the recurring trap is stranding focus).' },
    // `isPending`, not `loading` — the same concept Button's `isPending` names, spelled the same way
    // (#843). Button's own prop description already recorded the preference ("Preferred over `loading`")
    // and this def had not followed it. The PROP rename is free where the STATE rename below is not:
    // measured, `props` reach no emitted artifact and no Figma property, so nothing downstream carries
    // this name. Renaming only the state would have left one def spelling one concept two ways.
    { name: 'isPending', type: 'boolean', default: false, required: false, description: 'Async validation/value — a spinner replaces an adornment without reflow; sets aria-busy; does not block typing unless intended.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Three tiers (height + padding). A single bordered (outline) style; filled/underline are theming, not API.' },
    { name: 'id', type: 'string', required: false, description: 'Wiring + form submission; auto-generated with useId if omitted, tying label→input and the aria-describedby chain.' },
    { name: 'name', type: 'string', required: false, description: 'A real <input name> so the field works uncontrolled, in a native <form>, with useFormStatus / Server Actions, and the Constraint Validation API.' },
  ],

  // The interactive state set. read-only and disabled are distinct rows — the component's live edge —
  // and both PROJECT (read-only is the distinctive field state select lacks). `pending`, not `loading`
  // (#843): button and icon-button say `pending`, and #487 §0.4 forbids codifying the legacy sheet's
  // `loading` name. `pending` and `empty` stay in `states` (the paint model carries them — `label.empty`
  // re-points the value ink to the placeholder role, and a spinner replaces an adornment while pending)
  // but are admitted OUT of the projected `stateAxis` via `anatomy.codeOnly`, the same posture as
  // button's `inactive` and select's `empty`.
  //
  // `error` IS NO LONGER A STATE (#1494) — validation is the `status` axis (see the header and `variants`
  // below), so the border's error swap is a status-led paint key rather than a state row. It co-occurs
  // with the interactive states rather than replacing one of them, which is exactly what a state cannot do.
  //
  // `filled` (owner decision, 2026-09-25, Prism 2's `Filled` on `reference/Prism2/component-specs/text-field.json`)
  // is the PROJECTED member that holds a value. rest / hover / focus-visible show the placeholder.
  states: ['rest', 'hover', 'filled', 'focus-visible', 'disabled', 'read-only', 'pending', 'empty'],
  // `status` is field-message's status axis by name and value — the alignment that lets the nested message
  // follow it (see the header). `style` stays as a code-API axis (one value, not projected — admitted in
  // `anatomy.codeOnly`). SIZE IS NOT A VARIANTS AXIS: the `size` PROP + the `size.{small,medium,large}.*`
  // geometry tokens are the code-API size ladder, and Figma projects the single `md` rung (the bare geometry
  // keys). It is deliberately NOT in `variants`, because `size` is `figmaAnatomyPlan`'s positional argument:
  // a def that DECLARES sizes must PROJECT one (the #795 guard throws on a declared-but-unprojected size), so
  // "size in variants but not projected" is unrepresentable. This is exactly select's shape — select carries
  // no `size` axis either and binds bare `md` geometry — so the single-projected-size field is expressed by
  // the prop + tokens, not by a variant axis. The `size —` codeOnly entry records this for a reader.
  variants: {
    style: ['outline'], // default; filled/underline are theming, not an API axis (not projected)
    status: ['default', 'error', 'warning', 'success'],
  },
  // WHEN each axis changes (#1611): runtime axes are held to one footprint, authoring axes are not.
  // `status` changes live as validation runs.
  axisKinds: { style: 'authoring', status: 'runtime' },

  // INPUT CHROME ONLY — label + message color/type live in field-label / field-message (composed).
  // Border is the one stateful slot: rest/hover from field.*, focus/read-only from generic border roles,
  // the status swaps from the status-led `error`/`warning`/`success`.border.* keys, disabled from the shared disabled skin. The
  // value ink is full-contrast text.primary in every non-disabled state (read-only included — it is NOT
  // dimmed); disabled swaps to the contrast-exempt disabled ink. The focus ring is a nested `focus-ring`
  // that owns its own color, so no `focus-ring` color key is bound here.

  // THE PAINT GRAMMAR (#1494) — select's, adopted verbatim now that this def projects: status-led-and-
  // state-qualified first (so the status border swap WINS over the interactive state progression at every
  // coordinate — the status condition does not blink off as the pointer moves), then slot-and-state, then
  // the bare slot as the rest value. The status template is 3-SEGMENT deliberately: two 2-placeholder
  // templates cannot coexist (`paintKeyErrors` checks every 2-segment key against BOTH, so a state-led
  // `label.empty` fails `{status}.{slot}` and a status-led `error.border` fails `{slot}.{state}`), so
  // keeping the two vocabularies at different lengths is what lets them share a def. `error` / `warning` /
  // `success` each bind their status border once per non-disabled state (#1517); `default` binds none and
  // falls through to the neutral state border.
  //
  // WHY THE SLOT VOCABULARY IS THE PROJECTOR'S (#784, kept because this def is why the rule exists). Until
  // #784 the keys were `text`/`placeholder`/`border.focus`/`border.readonly` — words the projector never
  // dispatches — and six of twelve color bindings were reachable at no coordinate. `PAINT_SLOTS` is now the
  // list `paintKeyErrors` checks the `{slot}` segment against; `label.empty` is the placeholder (the value
  // ink rendered dim at the `empty` state), and the bare `label` is the value ink in every other state.
  paintKeys: ['{status}.{slot}.{state}', '{slot}.{state}', '{slot}'],

  tokens: {
    // ── GEOMETRY (bare keys — the SINGLE PROJECTED SIZE, the `md` rung, mirroring select) ──────────
    'radius': 'radius.sm',
    // #1437's 44px interactive-target floor, bound as select binds it: `size.md.min-height` = max(md, 44),
    // so the input control meets the WCAG 2.5.5 enhanced target at every density. A field control IS the
    // tap target. The code-API `size.{small,medium,large}.height` rungs below stay on the plain height.
    'min-height': 'size.md.min-height',
    'pad-x': 'size.md.padding-x',
    'pad-y': 'size.md.padding-y',
    'gap': 'size.md.gap',
    // The stack spacing between label, control and message.
    'root-gap': 'space.100',
    // The leading and trailing glyphs share one artboard rung.
    'icon-size': 'icon.size.sm',
    // 1px field hairline — the field/button edge weight, not the 2px selection-control weight.
    'border-width': 'border-width.hairline',
    // The nested focus ring's geometry (it owns its own COLOR): the width compensates the inset (#801) and
    // the FIELD offset is 0 — an input's own border supplies the separation.
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset-field',
    // The value ink's type — running body text, one line.
    'type': 'type.body.md.default',

    // ── FILL + HOVER WASH — the field chrome (#1341/#1342, inherited from select). `field.fill` is
    // TRANSPARENT by default, so at rest the control shows the page; hover does NOT swap to a solid but lays
    // a translucent `overlay` wash over the control (precedence overlay > fill), reusing the interactive
    // overlay mechanism so it tints relative to whatever ground the field sits on. The border strengthens in
    // parallel (`border.hover`). `pressed` is not a field state, so only `hover` washes.
    'fill': 'color.field.fill',
    'overlay.hover': 'color.interactive.neutral.overlay.hover',

    // ── VALUE INK — full-contrast value by default, the muted placeholder ink at the `empty` state.
    // `label.empty` is the placeholder (the input's own text node rendered dim while the field holds no
    // value), the bare `label` the value. read-only is full-contrast: at state=read-only the bare `label`
    // resolves, so the value is NOT dimmed (read-only ≠ disabled).
    // #1518 (owner-directed) — the placeholder resolves to `text.secondary`, the shared muted body ink, and the
    // value to `text.primary`, full contrast: the empty-vs-value polarity is expressed with the SAME two text
    // roles field-message already reaches for, not a field-scoped `field.placeholder`. Both roles already ship
    // (no new guaranteed NAME → CONTRACT stands). Neither key is axis-value-led (`label`/`empty` are a slot and
    // a state, not a variant value), so `lint-paint` arm 1 says nothing about them and neither takes a
    // provenance exception. Select carries the same two bindings (#1518 applies it there too).
    //
    // THE FILLED STATE (owner decision, 2026-09-25). The projected rest / hover / focus-visible members are
    // the EMPTY field at each interaction, so they show the placeholder in `text.secondary`; `filled` is the
    // member holding a value, and it and read-only take the bare `label`, `text.primary`. Disabled keeps the
    // cross-cutting disabled ink. Before this, the bare `label` reached every projected member, so the
    // placeholder copy rendered in value ink at rest, hover and focus.
    'label': 'color.text.primary',
    'label.rest': 'color.text.secondary',
    'label.hover': 'color.text.secondary',
    'label.focus-visible': 'color.text.secondary',
    'label.empty': 'color.text.secondary',
    // TWO LAYERS SINCE OPTION C (owner decision, 2026-09-26). The keys above did not move; what moved is
    // which NODE each state reaches. The `placeholder` layer exists at rest / hover / focus-visible /
    // disabled and so takes `label.rest` / `.hover` / `.focus-visible` (and the disabled ink); the `value`
    // layer exists at filled / read-only and takes the bare `label`. See the anatomy.

    // ── THE FOCUS CARET (owner decision, 2026-09-26) — a thin bar immediately before the placeholder on the
    // focus-visible member, where every platform keeps the placeholder and draws the caret in the field's
    // text color. Its own `caret` slot, because at focus-visible `label` is the placeholder's secondary ink.
    // Hairline wide and exactly one line of the value's type tall: `control.size.md.line-box` is body md's
    // font size × line height, asserted per rung in `tree.ts` (#1201/#1220), the same `type` this field's
    // text binds.
    'caret': 'color.text.primary',
    'caret-width': 'border-width.hairline',
    'caret-height': 'control.size.md.line-box',

    // ── BORDER — stateful, with the status-led swaps (border-ONLY). `border` (bare) is the rest value;
    // `border.hover` / `border.focus-visible` / `border.read-only` are the interactive states;
    // `{error,warning,success}.border.*` are the status-led swaps that lead the templates so they win over
    // hover, focus AND read-only.
    'border': 'color.field.border.rest',
    'border.hover': 'color.field.border.hover',
    'border.focus-visible': 'color.border.focus',
    // read-only's quieter boundary, with full-contrast value ink above it — the component's live edge.
    'border.read-only': 'color.border.secondary',
    // The status-led border swaps, each bound PER non-disabled state so it wins over the neutral progression
    // and persists through hover, focus and read-only (the focus RING, a separate part, still carries the
    // focus signal). At `disabled` the cross-cutting `disabled.border` takes over; `pending` is not bound
    // (async validation in progress does not assert a status boundary) and falls through to the neutral
    // border. #1517 (owner-directed, Prism 2 parity): `warning` and `success` now swap the border TOO,
    // mirroring `error` exactly — the field signals status on BOTH the border and the nested message, rather
    // than error-only-border + warning/success-message-only. Each status value maps to its OWN border role
    // (`error` → `danger`, `warning` → `warning`, `success` → `success`). The `error` → `danger` mapping is
    // a cross-vocabulary one (`lint-paint` provenance exception, per key); `warning` → `border.warning` and
    // `success` → `border.success` are SAME-family, so they satisfy `lint-paint` arm 1 directly and take no
    // exception (an exception there would be flagged as stale — the family already matches).
    'error.border.rest': 'color.border.danger',
    'error.border.hover': 'color.border.danger',
    'error.border.focus-visible': 'color.border.danger',
    'error.border.read-only': 'color.border.danger',
    'error.border.empty': 'color.border.danger',
    'error.border.filled': 'color.border.danger',
    'warning.border.rest': 'color.border.warning',
    'warning.border.hover': 'color.border.warning',
    'warning.border.focus-visible': 'color.border.warning',
    'warning.border.read-only': 'color.border.warning',
    'warning.border.empty': 'color.border.warning',
    'warning.border.filled': 'color.border.warning',
    'success.border.rest': 'color.border.success',
    'success.border.hover': 'color.border.success',
    'success.border.focus-visible': 'color.border.success',
    'success.border.read-only': 'color.border.success',
    'success.border.empty': 'color.border.success',
    'success.border.filled': 'color.border.success',

    // ── THE ICON INK — the leading glyph AND the trailing affix glyph, ONE binding for both. `primary`,
    // not `secondary`, so the glyphs match the value ink (`text.primary`) rather than sitting a step muted
    // beside it — the same choice select makes for its chevron + leading glyph (#1343).
    'icon': 'color.icon.primary',

    // ── DISABLED SKIN (contrast-exempt) — the shared cross-cutting family. The control has a fill, so the
    // ink takes the ON-FILL form (gated against `disabled.fill`, #784). No plain `disabled.label` /
    // `disabled.icon`: the field always has a fill, so the on-fill form is the only one reached — binding the
    // plain form would be an unreachable key (`lint-paint` arm 3).
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.label.on-fill': 'color.disabled.on-fill',
    'disabled.icon.on-fill': 'color.disabled.on-fill',

    // ── CODE-API SIZE GEOMETRY — the small/medium/large rungs a code consumer picks from, kept as the size
    // axis (#1494). NOT projected: Figma renders the single `md` rung above; the `size` axis is admitted out
    // in `anatomy.codeOnly`. Unreferenced by the anatomy (which binds the bare `md` keys), which is fine —
    // `anatomyErrors` requires the keys the anatomy names to exist, not the reverse.
    'size.small.height': 'size.sm.height',
    'size.small.pad-x': 'size.sm.padding-x',
    'size.small.pad-y': 'size.sm.padding-y',
    'size.medium.height': 'size.md.height',
    'size.medium.pad-x': 'size.md.padding-x',
    'size.medium.pad-y': 'size.md.padding-y',
    'size.large.height': 'size.lg.height',
    'size.large.pad-x': 'size.lg.padding-x',
    'size.large.pad-y': 'size.lg.padding-y',
  },

  // ── ANATOMY (#1494) — a column composing the two nested field parts around the input control ─────
  //
  // container (column) → nested FieldLabel · control (the bordered input box) · nested FieldMessage. The
  // control holds a `content` wrapper (leading glyph + value text) and the trailing affix, distributed to
  // the control's two ends by `space-between`, so the affix pins to the trailing edge at every value length
  // rather than tracking the text. The focus ring is an absolute sibling of the control's contents, rings the
  // control, and appears only on focus-visible. Mirrors select exactly, except that select's disclosure
  // affordance (the trailing chevron) is here the interactive trailing AFFIX slot — the clear / reveal edge
  // control select does not have (see `codeOnly`).
  anatomy: {
    root: 'container',
    parts: {
      // The stack. Structure only — it paints nothing (no `paintSlots`); the ink lives on the control and on
      // the two nested parts. Fills its column so the control and message span the field's width.
      container: {
        kind: 'box',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'root-gap',
        children: ['label', 'control', 'message'],
      },
      // THE NESTED LABEL (nest-exposed, mirroring select #1438). An in-flow instance of `field-label` whose
      // three author axes (size / emphasis / weight) plus its label text and `required` boolean the consumer
      // drives FROM the text-field; `state` stays fixed at `rest` (the disabled dim is code-driven from the
      // field's context — see codeOnly). The `variant` coordinate accounts for every field-label axis, as
      // `nestVariantMatch` requires.
      label: {
        kind: 'nest',
        nests: 'field-label',
        nesting: { kind: 'nest-exposed', variant: { size: 'small', emphasis: 'secondary', weight: 'regular', state: 'rest' }, expose: ['size', 'emphasis', 'weight'] },
        note: 'The accessible name, composed rather than re-declared. Nest-exposed: its label text, required marker and size/emphasis/weight surface on the text-field; a fix to FieldLabel still reaches this without a copy. Starts at the field default (small / secondary / regular).',
      },
      // THE CONTROL — the bordered, interactive input box. The single target: it owns the hit area, the focus
      // ring and the stateful border. Paints its fill, border and the hover overlay wash (`paintSlots`,
      // precedence overlay > fill — #1341/#1342); fills the column width and holds a fixed single-line height
      // floored at 44px (#1437). `space-between` pins the trailing affix to the field's trailing edge
      // independent of the value length (`content` fills in code but hugs in Figma — #989).
      control: {
        kind: 'box',
        role: 'target',
        paintSlots: ['overlay', 'fill', 'border'],
        layout: { direction: 'row', align: 'center', justify: 'space-between', sizing: { x: 'fill', y: 'fixed' } },
        height: 'min-height',
        // THE COMFORTABLE DEFAULT WIDTH (#1518, owner: parity with select) — a MIN-WIDTH not a fixed width,
        // the `select` #1345 precedent adopted key-for-key. #1494/#1503 deferred a width floor for the field
        // ("a follow-up if one is wanted"); the owner has now settled it at 320 (select parity), so a projected
        // field reads at a comfortable width rather than hugging narrow. The engine cannot project a child that
        // FILLs (`sizing: 'fill'` → AUTO, #989/#990), so the floor sits on the visible control, the one place
        // projection can express it: the control renders at ≥320, the hugging column inherits that width, and
        // the still-AUTO sizing lets the field grow above 320 rather than being pinned. A LITERAL, not a token —
        // 320 is a projection default in 8px increments, not a semantic `field.width` role (#1343 owner
        // decision) — so no emitted token NAME moves and `CONTRACT_VERSION` stands.
        minWidth: 320,
        radius: 'radius',
        // The edge weight (#1266's field) — 1px field hairline, bound rather than left to the executors'
        // fallback so a brand re-runging its border floor moves it.
        strokeWidth: 'border-width',
        // Symmetric padding — the leading glyph sits inside `content`, not against the box edge, so no #326
        // slot-aware asymmetry; both inline sides fall back to the label inset.
        padding: { block: 'pad-y', inlineLabel: 'pad-x' },
        gap: 'gap',
        children: ['content', 'trailingVisual', 'focusRing'],
      },
      // THE VALUE ROW — leading glyph + value text. Fills the control in code; in Figma it hugs (#989) and
      // the control's `space-between` pins the trailing affix to the trailing edge. Structure only.
      content: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        children: ['leadingVisual', 'entry'],
      },
      // THE OPTIONAL LEADING GLYPH. A swap slot whose PRESENCE is a node-visibility BOOLEAN (#1331): the node
      // is emitted at every member with `visible: false` and the `leading icon` switch toggles it. `optional:
      // true` is required by the boolean mechanism. The file nominates its swap target; its ink is the `icon`
      // slot, applied as `descendantFills`.
      leadingVisual: {
        kind: 'slot',
        optional: true,
        size: 'icon-size',
        nesting: { kind: 'swap' },
        note: 'An optional purpose glyph before the value, aria-hidden. Absent by default; the caller nominates the icon.',
      },
      // THE ENTRY — caret, placeholder and value in a GAP-0 row, so the caret sits immediately before the
      // placeholder rather than a content gap away. Structure only; it hugs whichever layers the state shows.
      entry: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        children: ['caret', 'placeholder', 'value'],
      },
      // THE FOCUS CARET (owner decision, 2026-09-26) — present only at focus-visible (`presentWhen` on the
      // state, the schema's `STATE_GATE`). A childless bar painting its own `caret` slot. One hairline wide and
      // one value line tall, so it adds no height, and 1px of width inside a control held at its 320 floor.
      caret: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['caret'],
        width: 'caret-width',
        height: 'caret-height',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        presentWhen: { state: ['focus-visible'] },
        note: 'The insertion point on the focused empty field, immediately before the placeholder, in the value ink. Code draws the native caret, colored by `caret-color`.',
      },
      // THE TWO TEXT LAYERS (Option C, owner decision 2026-09-26). #1567 measured on the live host that a
      // bound TEXT node shows its set's ONE default, and field-message met the same limit in #1575, so one
      // node behind one property cannot show a placeholder on some members and a value on others. Two
      // nodes, each with its own TEXT property and default, gated on complementary states, can.
      placeholder: {
        kind: 'text',
        type: 'type',
        presentWhen: { state: ['rest', 'hover', 'focus-visible', 'disabled', 'empty'] },
        note: 'The placeholder, in the placeholder ink (the disabled ink when disabled). Shown on the empty field: rest, hover, focus and disabled. One line, ellipsized in code.',
      },
      value: {
        kind: 'text',
        type: 'type',
        presentWhen: { state: ['filled', 'read-only', 'pending'] },
        note: 'The entered value, in the value ink. Shown on the filled and read-only field. One line, ellipsized in code.',
      },
      // THE TRAILING AFFIX — the clear-button / password-reveal edge control that select's chevron slot is
      // NOT. Modeled exactly as the leading glyph (an optional swap slot painted the `icon` ink, its presence
      // a node-visibility boolean), pinned to the control's trailing edge by the control's `space-between`. In
      // CODE it is an INTERACTIVE control (own tab stop + accessible name); Figma projects only the glyph
      // (see codeOnly).
      trailingVisual: {
        kind: 'slot',
        optional: true,
        size: 'icon-size',
        nesting: { kind: 'swap' },
        note: 'An optional trailing affix at the trailing edge (a clear / reveal glyph), aria-hidden as a glyph. Absent by default; the caller nominates the icon. Its interactive behavior is code-only.',
      },
      // THE FOCUS RING — the shared indicator, nested as an absolute sibling of the control's contents so it
      // rings the CONTROL (not the whole field) and takes no cell. `field` offset (0) because an input's own
      // border already supplies the separation. Fixed to the default surface (the field carries no surface
      // axis). The ring owns its own COLOR, so no `focus-ring` color key is bound in `tokens`.
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring`. Rings the control, takes no cell, and has its own stroke — so the focus signal never contends with the input\'s own border.',
      },
      // THE NESTED MESSAGE (nest-fixed, FOLLOWING status). An in-flow instance of `field-message` whose single
      // projected axis, `status`, is DRIVEN by text-field's `status` axis via `follow` — a same-name,
      // same-value passthrough (the alignment the header is about). `optional: true` is the anatomy half of the
      // #1412 node-visibility mechanism (`showMessage` in `figmaProperties.booleans` is the other): built
      // VISIBLE, hidden when the switch is turned off.
      message: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'default' }, follow: ['status'] },
        optional: true,
        note: 'Helper or validation text, composed rather than re-declared. Its status follows the field\'s validation by name, so error / warning / success reach the message without a value mapping. Shown by default; the `showMessage` boolean hides the whole part where the field has nothing to say.',
      },
    },
    codeOnly: [
      'size — the small / medium / large ladder is a code-API PROP + geometry tokens (`size.{small,medium,large}.*`), NOT a variants axis and NOT a projected Figma variant. Figma renders the single `md` rung (the bare geometry keys — the field control is one interactive target, and a projected size axis would triple the set for geometry a designer reads off one member); a code consumer picks the density via the `size` prop. It is kept off `variants` deliberately: `size` is `figmaAnatomyPlan`\'s positional argument, so a declared size axis MUST project a rung (#795), which is why select — the template for this def — also expresses its single size as bare `md` geometry rather than a `size` variant. Same not-projected posture as the `style` axis, reached a different way.',
      'style — the outline / filled / underline treatment is theming, not an API axis: `style` carries the single value `outline` and filled/underline are a brand skin over the same anatomy, so there is nothing for a Figma variant to enumerate. Admitted here rather than projected.',
      'pending — a real STATE (a spinner replaces an adornment while async validation/value resolves, and the field sets aria-busy), deliberately NOT a Figma variant. Its delta is a runtime spinner swap with no distinct static skin a designer picks from a matrix — the pending member would differ from `rest` only by a node Figma cannot animate — so it stays in `states` (the code tier carries it) and is admitted OUT of the projected `stateAxis`.',
      'empty — a real STATE in code (the field holds no value, so it shows the placeholder), NOT a Figma variant: in Figma the empty field IS the rest, hover and focus-visible members, which show the `placeholder` layer in `text.secondary`, and `filled` is the member showing the `value` layer in `text.primary`. In code emptiness is a content condition that co-occurs with every interaction, so `empty` stays in `states` (`label.empty` and `error.border.empty` keep the "required field left blank" coordinate) and is held out of the projected `stateAxis` with `pending`, leaving status(4) × state(6) = 24 members over rest / hover / filled / focus-visible / disabled / read-only. In code the placeholder and the value are one <input>: its `placeholder` attribute and its value, never two elements.',
      'the FOCUS CARET — Figma draws a static bar before the placeholder on the focus-visible member. Code draws the browser\'s native caret, blinking, at the insertion point, with `caret-color` set from `color.text.primary` (the `caret` binding), so it keeps the value ink over the placeholder\'s muted one.',
      'the TRAILING AFFIX is an INTERACTIVE control in code — a clear or reveal button that is its own Tab stop with its own accessible name (see the `suffix` / `clearable` props and the a11y block) and RETURNS focus to the input when it acts. Figma has no accessibility tree and no node-to-node reference, so `trailingVisual` projects ONLY the glyph: a member cannot express that the affix is focusable, labeled, or that activating it clears the field. The presence boolean + swap carry which glyph shows and whether it shows; the interaction is the host\'s.',
      'the label / describedby WIRING — the host generates ids (useId), ties the FieldLabel to the input, stitches the FieldMessage into aria-describedby, and sets aria-invalid on error. Figma has no accessibility tree and no node-to-node reference, so the nested label and message sit near the input and are associated by proximity alone (the same ceiling `field-label` and `field-message` each hit).',
      'the nested LABEL\'s disabled dimming — the field fixes the FieldLabel to `state=rest` because field-label\'s state vocabulary (rest / disabled) is not the field\'s, so it cannot be followed by value. In code a disabled field dims its label; in Figma the nested label reads at its rest configuration regardless. A projection limit, not a design choice.',
      'the KEYBOARD MODEL — native text editing, Escape-to-clear when clearable, and IME composition guards (do not validate mid-composition). All of it is runtime interaction the closed static member cannot carry.',
    ],
  },

  // How this projects into Figma (#1494). `status` is the one variant axis; `state` projects the five
  // interactive states (read-only INCLUDED — the field state select lacks) plus `filled`, the member holding a
  // value. The leading and trailing glyphs' PRESENCE and the message's are node-visibility BOOLEANS, NOT variant
  // axes, so none multiplies the set: status(4) × state(6) = 24 members. `pending` and `empty` are real states (see `states` and the codeOnly
  // entries leading with those names) but are deliberately absent from this projected axis.
  figmaProperties: {
    variantAxes: ['status'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'filled', 'focus-visible', 'disabled', 'read-only'] },
    // `state` across the columns — the axis a designer reads a control's skin across, and the widest here.
    gridAxis: 'state',
    // TWO TEXT PROPERTIES (Option C, owner decision 2026-09-26), lowercase per #1333, projecting first in the
    // panel: `placeholder` drives the placeholder layer and `value` the value layer, each with its own default.
    // "Entered text" is a generic scaffold in the field-message precedent, never a real product's copy.
    texts: {
      placeholder: { part: 'placeholder', default: 'Placeholder' },
      value: { part: 'value', default: 'Entered text' },
    },
    // THREE NODE-VISIBILITY BOOLEANS (#1331/#1412/#1494), none a variant axis — each toggles a part's
    // `visible` in place, so none multiplies the set (still 24 members).
    //   · `leadingIcon`: `leadingVisual` is emitted hidden (default false) and the `leading icon` switch shows it.
    //   · `trailingIcon`: `trailingVisual` is emitted hidden (default false) and the `trailing icon` switch shows it.
    //   · `showMessage`: the composed `message` nest is emitted VISIBLE (default true — the message is part of the
    //     field) and the `message` switch hides the whole part (the INVERSE direction, like field-label's `required`).
    // Each shares its node with a swap where one exists (`visible` and `mainComponent` are different Figma fields).
    booleans: {
      leadingIcon: { part: 'leadingVisual', figmaName: 'leading icon', default: false },
      trailingIcon: { part: 'trailingVisual', figmaName: 'trailing icon', default: false },
      showMessage: { part: 'message', figmaName: 'message', default: true },
    },
    // The two glyphs' CONTENT — orthogonal to their presence booleans above. `figmaName` gives each the canon
    // panel label nested beneath its switch; the code props stay `leadingIcon` / `trailingIcon` (one prop, two
    // Figma properties each: a presence boolean and a content swap).
    swaps: {
      leadingIcon: { part: 'leadingVisual', figmaName: '↳ swap leading icon' },
      trailingIcon: { part: 'trailingVisual', figmaName: '↳ swap trailing icon' },
    },
  },

  accessibility: {
    role: 'textbox (native <input>)',
    wcag: [
      '1.3.5 Identify Input Purpose (autocomplete — the most field-specific SC)',
      '1.3.1 Info and Relationships (label + describedby association)',
      '3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion',
      '1.4.3 Contrast (value + placeholder) / 1.4.11 Non-text Contrast (field boundary ≥3:1) / 2.4.13 Focus Appearance',
      '4.1.2 Name/Role/Value / 2.5.8 Target Size',
      '3.3.7 Redundant Entry / 3.3.8 Accessible Authentication (login/checkout fields, WCAG 2.2)',
    ],
    keyboard: 'Native text editing. Tab focuses the input; interactive affixes (clear / reveal) are SEPARATE tab stops with their own accessible names. Escape clears when clearable.',
    focus: ':focus-visible ring, boundary ≥3:1 (1.4.11 / 2.4.13) — the field is a primary focus target. forwardRef must reach the <input>, not the wrapper, so consumers can focus on load / focus the first invalid field on submit.',
    aria: 'The host generates ids (useId) and stitches aria-describedby across helper + error, and sets aria-invalid on error — the consumer never hand-manages ids (the highest-frequency real a11y failure). placeholder is NOT the accessible name. While pending, aria-busy; the field stays focusable. Do not fire validation mid-IME-composition. Set dir="auto" on the input so content direction can differ from UI direction.',
  },

  content: {
    labelPattern: 'Noun phrase, sentence case, ≤3 words, no trailing colon; never the placeholder (see field-label).',
    errorPattern: 'What is wrong AND how to fix it (SC 3.3.3); icon + text, not color-only (see field-message).',
    emptyPattern: 'The empty state is the label plus an optional placeholder — there is no separate empty UI.',
  },

  docs: {
    usage: 'Use for free-form, non-enumerable single-line input — names, titles, SKUs, identifiers, short queries. Always render a visible label; show the format in helper text before failure; keep validation timing with the form library. The field nests FieldLabel above and FieldMessage below; the host wires the ids and aria-describedby chain.',
    do: [
      'Always render a visible, associated label (FieldLabel) — visually-hidden only for search',
      'Distinguish readOnly (copyable, submitted, full-contrast) from disabled (silent, exempt)',
      'Emit a real <input name> so it works uncontrolled, in a native form, with Server Actions',
      'Separate a decorative prefix (aria-hidden) from an interactive suffix action (a labeled button)',
    ],
    dont: [
      'Use the placeholder as the label, or put load-bearing text in it',
      'Use type="number" for numeric input — use a number field, not built yet (email/url/tel stay as type here)',
      'Bake a validation engine or timing into the field — render the error you are handed',
      'Signal error with the border color alone — the message carries the text + icon',
    ],
    contentGuidelines: 'Label = noun phrase, sentence case, no trailing colon. Placeholder = example only. Helper carries the format up front. Error says what + how to fix, never "Invalid input".',
  },

  ai: {
    primaryPurpose: 'Capture a single line of free-form, non-enumerable text with an associated label and helper/validation message.',
    whenToUse: 'Names, emails, titles, SKUs, identifiers, short queries — any single-line text the system cannot offer as a fixed set.',
    avoidWhen: 'The value comes from a known set (Select, Radio.Group, or a combobox), spans multiple lines (Textarea), is numeric-formatted (a number field), is boolean (Checkbox.Row or Switch.Row), is a date (a date picker), or needs suggestions (a combobox — the moment a suggestion list attaches you are in combobox territory with a different ARIA contract).',
    commonPartners: ['field-label', 'field-message', 'icon', 'button'],
    triggerKeywords: ['text field', 'text input', 'input', 'form field', 'textbox', 'email field', 'search field'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring', 'icon', 'button'],
    alternativeTo: ['textarea', 'select', 'checkbox-row', 'switch-row'],
    replacesPatterns: ['bare input without label wiring', 'placeholder-as-label', 'type=number for formatted numeric'],
    planned: ['spinner', 'form', 'tooltip', 'combobox', 'number-field', 'search-field', 'date-picker', 'password-field'],
  },

  notes: {
    contested: [
      'Bundled props vs composed slots — ship both: props for the 90% vertical-form case, composed FieldLabel/FieldMessage slots for the 10% custom layout (brief §3).',
      'How far to split the typed family — NumberField separate; SearchField/PasswordField thin specializations; email/url/tel stay as type+attributes (brief §3).',
      'Validation ownership/timing — presentational default; the form library owns timing (brief §3, §6).',
      'warning as a distinct state — optional; many systems fold it into helper/error (brief §4).',
    ],
    unverified: [
      'Polaris migration to framework-agnostic Web Components (<s-text-field>, Shadow DOM) — needs _source-text backing, shared with the Button brief (brief §11, §14).',
      'The control now carries a `minWidth: 320` floor (#1518, owner: select parity), so the field reads at a comfortable 320 and flexes above it, exactly as select does (#1345). The nested label and message, however, are NOT yet set to FILL that width (`crossAxisFill` → `layoutAlign: STRETCH`, the #1503 capability select adopted): a `nest` cannot bind sizing (#1299), so they hug their content and sit narrower than the 320 control — the same pre-fill state select was in before #1503. Closing that (label/message `crossAxisFill`, mirroring select) is the remaining half of the width follow-up #1503 held for the owner; #1518 settled only the floor.',
      'The value text does not ellipsize in the Figma projection — `maxLines` / `textOverflow` have no PartDef expression — so a long placeholder in a narrow member overflows rather than truncating. The ellipsis is a code-side behavior.',
      'The leading and trailing glyphs are node-visibility BOOLEANS (#1331/#1494): each node is built hidden and shown by its switch. In Figma auto-layout a `visible:false` child is excluded from the flow, so a hidden glyph should add no gap — but whether a real host reflows `content` / the control when a switch toggles is a host question no Node gate answers. Symptom on a real host: a persistent gap where a hidden glyph sits, or the trailing affix not pinning tight when off.',
    ],
  },
};
