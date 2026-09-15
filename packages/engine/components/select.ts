/**
 * Select — the NATIVE-FIRST, COMPOSED field, and the first def that nests the two shared field parts
 * (`field-label` and `field-message`) rather than sitting beside them (KB text-field brief §2, the
 * Prism2 `select` component spec). A control for choosing ONE value from a known, bounded set.
 *
 * ── ONE UNIFIED COMPONENT, NOT A DECOMPOSITION (owner-decided) ───────────────────────────────────
 *
 * Checkbox splits into Row + Control + Group because the same control appears at three granularities.
 * Select does NOT: it is one component that COMPOSES the field parts. So this def's anatomy is a root
 * column holding a nested `field-label`, the control box, and a nested `field-message` — the label and
 * message color/type live in THEIR defs and are reused here, exactly as `text-field` composes them,
 * except that `text-field` has no anatomy and names them only in `composition`, while this def actually
 * NESTS them as in-flow instances (`kind: 'nest'`, #1226).
 *
 * NATIVE-FIRST: this models the CLOSED control only. The open popup — the listbox of options — is the
 * platform's (a native `<select>`'s menu is OS-drawn and un-styleable, and even a custom listbox is a
 * separate popover surface). There is no `expanded` state and no option-list anatomy here; a designer
 * building the open menu reaches for a menu/listbox component, not a variant of this one.
 *
 * ── VALIDATION IS THE `status` AXIS, ALIGNED TO field-message's OWN `status` (the whole point) ────
 *
 * The validation axis carries `[default, error, warning, success]` — the SAME four values, spelled the
 * same way, as `field-message`'s `status`. That alignment is deliberate and load-bearing: the nested
 * message's status is driven from this axis by a `nest-fixed` `follow`, and `follow` passes an axis
 * THROUGH BY NAME (`component-schema.ts`, `NestingRelation`). So the axis here is named `status`, not
 * `validation`, precisely so `follow: ['status']` can drive the child — a same-name, same-value
 * passthrough rather than a value-mapping problem. The consumer-facing prop and UI still read
 * "Validation"; the Figma variant axis is `status` so the wire matches the child it drives. (The axis
 * was named `tone` until #1334, which split the overloaded `tone` name — this validation axis to
 * `status`, `field-label`'s emphasis axis to `emphasis` — and moved the `follow` with it.)
 *
 * ── VALIDATION → BORDER: A BORDER-ONLY SWAP FOR error, FOLLOWING text-field EXACTLY ───────────────
 *
 * `text-field`'s validation is a BORDER swap for `error` (→ `border.danger`) and nothing else — warning
 * and success are MESSAGE-only, carried by the nested field-message's status, with the border left
 * neutral. Select follows this. There is deliberately NO `border.warning` / `border.success` role: the
 * token tier does not emit them and text-field does not color the border for those statuses. The border's
 * whole vocabulary is:
 *
 *   rest          → `field.border.rest`      (the bare `border` key — the rest fallback)
 *   hover         → `field.border.hover`     (`border.hover`)
 *   focus-visible → `border.focus`           (`border.focus-visible`)
 *   error         → `border.danger`          (`error.border.{state}` — a status-led, border-ONLY swap)
 *   disabled      → the cross-cutting disabled border
 *
 * The PRECEDENCE, where the two axes meet (state × status can co-occur here, unlike text-field where
 * `error` is folded into one state axis): `disabled` > `error` > the interactive state progression. The
 * status-led-and-state-qualified template leads the paint keys, so an errored field shows the danger
 * boundary at rest, hover AND focus — the error condition persists while the pointer moves — and the
 * separate focus RING (an absolute sibling) carries the focus signal on top. `default` / `warning` /
 * `success` bind no status-led border and fall through to the neutral state border, letting the nested
 * message carry the status. This is the same "error is a border-only swap; warning/success are
 * message-only" contract text-field ships.
 *
 * ── HOVER IS A BORDER SWAP; THE FILL IS STATELESS BY DESIGN (#1342, confirmed) ────────────────────
 *
 * A QA question (#1342) asked whether the field FILL should change on hover — i.e. whether the token
 * tier should grow a `color/field/fill/hover` role. The answer, matching `text-field`, is NO: hover is
 * carried entirely by the BORDER (`border.hover` → `color.field.border.hover`, bound below and reached at
 * the hover coordinate), and the field FILL (`field.fill`) is CONSTANT across every state and status.
 * A select is a field, and a field's chrome does not restyle its surface on hover — the boundary
 * thickens/darkens, the surface holds. So no `field.fill.hover` role is minted here or in the tier; the
 * fill is deliberately stateless. (Were the fill to gain a hover variant it would also have to clear its
 * own contrast contract against the value ink at both rungs — cost with no signal the border does not
 * already carry.)
 *
 * ── ROLES REUSED, VERSION ────────────────────────────────────────────────────────────────────────
 *
 * Every binding is an EXISTING semantic role (`field.border.*`, `border.focus`, `border.danger`,
 * `field.fill`, `field.placeholder`, `text.primary`, `icon.primary`, `focus.ring.*`, the cross-cutting
 * `disabled.*`). No new emitted token name, so `CONTRACT_VERSION` stands at 10.0.0. `ENGINE_VERSION`
 * moves for the changed projected surface (#1252's case).
 *
 * ── #1426 QA FIXES (2026-09-15) ──────────────────────────────────────────────────────────────────
 *
 * Two decision-free fixes from the plugin-import QA, neither moving a token name (CONTRACT holds at
 * 10.0.0; ENGINE moves for the projected surface — the caret geometry and the new boolean):
 *   1. The trailing chevron pins to the field's RIGHT EDGE via the control's `space-between`, rather than
 *      tracking the value width (`content` fills in code but hugs in Figma, #989 — see the `control` part).
 *   2. `showMessage` — a node-visibility boolean (#1412) that hides the composed FieldMessage entirely
 *      (see `props`, the `message` part's `optional`, and `figmaProperties.booleans`).
 * (Two further #1426 items — the control-height hit-target token and exposing the composed FieldLabel's
 * properties — carry design decisions and are held for the owner, tracked separately.)
 *
 * ── LEADING GLYPH: A NODE-VISIBILITY BOOLEAN, NOT A VARIANT AXIS (#1331) ───────────────────────────
 *
 * The leading glyph's PRESENCE is a Figma boolean component property (`leading icon`), the first consumer
 * of the node-visibility mechanism. The `leadingVisual` node is EMITTED at every member with `visible:
 * false` (hidden by default) and the switch flips it in place — where a variant/slot axis would emit the
 * node in the true members and DROP it in the false ones, doubling the set. So the projected set HALVES:
 * status(4) × state(4) × leading(2) = 32 → status(4) × state(4) = 16. This is clean for select precisely
 * because the glyph sits INSIDE `content`, not against the box edge, so it takes NO #326 padding asymmetry
 * a boolean cannot drive (button's edge-hugging leading/trailing stay variant axes — the #1331/#1379
 * split). The `leadingVisual` node carries BOTH this boolean (`visible`) and the content swap
 * (`mainComponent`) — different Figma fields, so one node holds both.
 *
 * ── DEFAULT WIDTH: A MIN-WIDTH FLOOR ON THE CONTROL, NOT A TOKEN (#1343a, #1345) ──────────────────
 *
 * The control carries `minWidth: 320` — a LITERAL, not a token. Prism 2's select is `root width 320 ·
 * HUG` with its inner containers FILLing that width (`reference/Prism2/component-specs/select.json`),
 * and the field should flex like Prism 2 rather than sit at a hard fixed size. The engine cannot project
 * a child that FILLs (`sizing: 'fill'` → AUTO, #989/#990), so the floor sits on the visible control, the
 * one place projection can express it: the control renders at ≥320, the hugging column inherits that
 * width, and the still-AUTO sizing lets the field grow above 320 rather than being pinned. 320 is a
 * comfortable projection default in 8px increments — the #1343 owner decision was explicit that it is
 * NOT a `field.width` semantic role — so no emitted token NAME moves and `CONTRACT_VERSION` holds; the
 * projected plan changes, which is the `ENGINE_VERSION` trigger this def already carries.
 */
import { ComponentDef } from '../component-schema';

export const select: ComponentDef = {
  id: 'select',
  name: 'Select',
  aliases: ['dropdown', 'combobox', 'picker', 'select-menu', 'listbox'],
  category: 'form',
  status: 'draft',
  description:
    'A control for choosing ONE value from a known, bounded set — the closed, native-first field: label, a bordered control showing the current value or a placeholder with a trailing chevron, and a helper/validation message below. Composes the shared FieldLabel and FieldMessage. The open menu is the platform\'s (native or a separate listbox), not modeled here. Not free-form text (TextField), not any-number-from-a-set (Checkbox group), not a small always-visible set (Radio / SegmentedControl), not suggestion-backed typing (Combobox).',

  props: [
    { name: 'label', type: 'string | node', required: true, description: 'The visible, persistent label, rendered as the nested FieldLabel. Required — a select always carries a programmatic name. Never the placeholder.' },
    // #1242 — the Figma TEXT property is `value`, a designer-facing name, not a React-ism. It is the
    // displayed text: the selected option's label, or the placeholder when nothing is chosen. The
    // controlled selection is wired in code via `onChange` and the option set. LOWERCASE per #1333.
    { name: 'value', type: 'string', required: false, description: 'The displayed text — the selected option\'s label, or the placeholder when nothing is chosen. Controlled: pair with onChange. When it holds the placeholder the ink is the muted placeholder role; a chosen value shows the full-contrast value ink — the same empty-vs-value polarity text-field uses. This is an internal, content-driven distinction, not a variant a designer picks (#1344).' },
    { name: 'placeholder', type: 'string', required: false, description: 'The prompt shown before a choice is made ("Select an option"). Muted, and never load-bearing — it is not the label and it vanishes once a value is chosen.' },
    { name: 'options', type: 'array', required: false, description: 'The bounded set of choices. Past roughly 7-10 options a filtering Combobox scans better; below a handful an always-visible Radio group may read better.' },
    { name: 'onChange', type: 'function', required: false, description: 'Fires with the newly chosen value (also onBlur / onFocus). A controlled Value with no onChange is read-only by accident.' },
    { name: 'helpText', type: 'string | node', required: false, description: 'Persistent guidance, rendered as the nested FieldMessage in its default status; wired via aria-describedby. Show the constraint before failure.' },
    // The UI reads "Validation"; the Figma variant axis is `status` so it drives the nested message's own
    // `status` by name (see the header). Values match field-message's status values exactly.
    { name: 'validation', type: "enum: 'default' | 'error' | 'warning' | 'success'", values: ['default', 'error', 'warning', 'success'], default: 'default', required: false, description: 'The validation state. `error` swaps the control border to the danger boundary (border-only) and sets the nested message to its error status; `warning` / `success` are message-only (the border stays neutral, the message carries the status); `default` is neutral. The values align with FieldMessage\'s status axis, so this drives the nested message directly.' },
    { name: 'validationMessage', type: 'string | node', required: false, description: 'The validation text shown at error / warning / success. For error, say what is wrong AND how to fix it (SC 3.3.3), never "Invalid".' },
    // #1426 — a node-visibility boolean (the #1412 mechanism) that hides the composed FieldMessage
    // entirely. Default ON (the message is part of the field), so a select that carries neither helper
    // nor validation text can drop the whole part rather than reserve its space. The message node is
    // emitted at every member and shown by default; turning this off toggles its `visible` in place, the
    // same mechanism as the leading glyph — see `figmaProperties.booleans`.
    { name: 'showMessage', type: 'boolean', default: true, required: false, description: 'Whether the composed FieldMessage is shown. ON — the default — renders the helper / validation message below the control; turning it off hides the message entirely (a select with no helper or validation text). Never hides a message the field needs: an error still sets aria-invalid and the message carries the reason, so hide it only when there is genuinely nothing to say.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An optional leading glyph before the value (a category or status mark), aria-hidden. Hidden by default; the file nominates the swap target. Signals the field\'s purpose; validation never mutates it.' },
    { name: 'required', type: 'boolean', default: false, required: false, description: 'Sets required / aria-required; the FieldLabel marks the minority consistently within a form.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled — removed from tab order, not submitted, contrast-exempt. Reserve for a choice irrelevant in the current state.' },
    { name: 'id', type: 'string', required: false, description: 'Wiring + form submission; auto-generated with useId if omitted, tying the label to the control and stitching the aria-describedby chain to the message.' },
    { name: 'name', type: 'string', required: false, description: 'A real control name so the field works uncontrolled, in a native form, and with Server Actions.' },
  ],

  // The CLOSED control's states. `empty` is the coordinate at which the displayed text is the
  // placeholder rather than a chosen value, which re-points the value ink to the muted placeholder role —
  // text-field's exact model (rest shows the value, `empty` the placeholder). It stays a STATE so the
  // paint model carries the placeholder-vs-value distinction (`label.empty`, `error.border.empty` below),
  // but it is INTERNAL/code-tier and NOT projected as a Figma variant (#1344) — the same posture as
  // `button`'s `inactive`: it lives in `states` and is admitted out of the projected `stateAxis` by the
  // `anatomy.codeOnly` entry leading with `empty`. Placeholder-vs-value is a content condition a designer
  // does not pick from a variant matrix; the code (or an instance's typed value) drives it. `error` is NOT
  // a state — validation is the `status` axis (see the header), so the border's error swap is a status-led
  // paint key, not a state. No `filled` (not in the engine's states vocabulary) and no `expanded` (the open
  // menu is the platform's, not modeled here).
  states: ['rest', 'hover', 'focus-visible', 'disabled', 'empty'],

  // ONE axis, `status`, and it IS `field-message`'s status axis by name and value — the alignment that lets
  // the nested message follow it (see the header). Single-size: Prism2's select is single-size, so no
  // `size` axis is invented.
  variants: {
    status: ['default', 'error', 'warning', 'success'],
  },

  // THE PAINT GRAMMAR. Status-led-and-state-qualified first (so the `error` border swap WINS over the
  // interactive state progression at every coordinate — see the header's precedence note), then
  // slot-and-state, then the bare slot as the rest value.
  //
  // WHY THE STATUS TEMPLATE IS 3-SEGMENT and not the 2-segment `{status}.{slot}` the concept wants: two
  // 2-placeholder templates cannot coexist — `paintKeyErrors` checks every 2-segment key against BOTH,
  // so a state-led `label.empty` fails the `{status}.{slot}` reading (`{status}='label'`) and a status-led
  // `error.border` fails the `{slot}.{state}` reading. Making the status template 3-segment keeps the two
  // vocabularies at different lengths. So `error` binds its danger border once PER non-disabled state
  // (rest / hover / focus-visible / empty), which is what makes the swap persist through hover and focus
  // rather than yielding to the neutral interactive border — the error condition does not blink off when
  // the pointer moves. `default` / `warning` / `success` bind no status-led border and fall through to the
  // neutral state border, which is text-field's exact "error-only border swap" model.
  paintKeys: ['{status}.{slot}.{state}', '{slot}.{state}', '{slot}'],

  tokens: {
    // ── GEOMETRY ─────────────────────────────────────────────────────────────────────────────────
    'radius': 'radius.sm',
    // The control's single-line height (44 on nb) — bound as a fixed height, since the value is one
    // ellipsized line (`text-field` binds the same rung for its medium control).
    'min-height': 'size.md.height',
    'pad-x': 'size.md.padding-x',
    'pad-y': 'size.md.padding-y',
    // The control's internal spacing (value ↔ chevron, and the leading glyph ↔ value).
    'gap': 'size.md.gap',
    // The stack spacing between label, control and message.
    'root-gap': 'space.100',
    // The chevron and any leading glyph share one artboard rung.
    'icon-size': 'icon.size.sm',
    // 1px, the field/button edge weight — NOT the 2px control weight the selection controls carry
    // (`border-width.thick`). A select is a field, so it takes the field's hairline.
    'border-width': 'border-width.hairline',
    // The nested focus ring's geometry — the ring owns its own COLOR, so only the width (to compensate
    // the inset, #801) and the FIELD offset (0 — an input's own border supplies the separation) are
    // bound here.
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset-field',
    // The value ink's type — running body text, one line.
    'type': 'type.body.md.default',

    // ── FILL — the field chrome, STATELESS by design: constant across every state AND status (#1342) ──
    // One key, no `.hover` / `.focus-visible` variant. Hover is a BORDER swap (see the header and
    // `border.hover` below); the surface never restyles. text-field's exact model — a field's fill is
    // chrome, not a stateful signal, so the tier mints no `field.fill.hover`.
    'fill': 'color.field.fill',

    // ── BORDER — stateful, with the error swap (border-ONLY). See the header for the vocabulary and the
    // precedence. `border` (bare) is the rest value; `border.hover` / `border.focus-visible` are the
    // interactive states; `error.border` is the status-led danger swap that leads the templates so it wins
    // over hover and focus. `default` / `warning` / `success` bind no status-led border and stay neutral.
    'border': 'color.field.border.rest',
    'border.hover': 'color.field.border.hover',
    'border.focus-visible': 'color.border.focus',
    // The error swap, bound per non-disabled state so it wins over the neutral progression above and
    // persists through hover and focus (the focus RING, a separate part, still carries the focus signal).
    // At `disabled` the cross-cutting `disabled.border` takes over. All four resolve to the one danger
    // boundary — the status value `error` maps to the `danger` role, a `lint-paint` provenance exception.
    'error.border.rest': 'color.border.danger',
    'error.border.hover': 'color.border.danger',
    'error.border.focus-visible': 'color.border.danger',
    'error.border.empty': 'color.border.danger',

    // ── VALUE INK — full-contrast value by default, the muted placeholder ink at the `empty` state.
    // Text-field's exact polarity (`label.empty` is the placeholder, the bare `label` is the value). Both
    // are CARRIED (the placeholder-vs-value distinction is real paint the code applies) even though `empty`
    // no longer projects as a Figma variant (#1344): `empty` stays in `states`, so this key is reached at
    // the empty coordinate of the DECLARED grid that `lint-paint`'s reachability walks, and the projected
    // set simply omits the column.
    'label': 'color.text.primary',
    'label.empty': 'color.field.placeholder',

    // ── THE ICON INK — the trailing chevron AND any leading glyph, ONE binding for both ─────────────
    // `primary`, not `secondary` (#1343): the `icon` slot is pushed onto the chevron's vector AND the
    // leading swap's descendants (both come back as `descendantFills=color/icon/primary`), so this one
    // key colors both glyphs, and `primary` MATCHES the value text (`text.primary`) rather than sitting
    // a step muted beside it — the leading glyph the caller nominates already defaults to `icon.primary`
    // (see `icon.ts`), so before this the chevron was the one glyph reading muted against the value.
    'icon': 'color.icon.primary',

    // ── DISABLED SKIN — cross-cutting, contrast-exempt. The control has a fill, so the ink takes the
    // on-fill form (gated against `disabled.fill`, #784). No plain `disabled.label` / `disabled.icon`:
    // the field always has a fill, so the on-fill form is the only one reached — binding the plain form
    // would be an unreachable key (`lint-paint.ts` arm 3).
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.label.on-fill': 'color.disabled.on-fill',
    'disabled.icon.on-fill': 'color.disabled.on-fill',
  },

  // ── ANATOMY — a column composing the two nested field parts around the control box ───────────────
  //
  // container (column) → nested FieldLabel · control (the bordered box) · nested FieldMessage. The focus
  // ring is an absolute sibling of the control's contents, rings the control, and appears only on
  // focus-visible. The control box holds a `content` wrapper (leading glyph + value text) and a trailing
  // chevron, distributed to the control's two ends by `space-between` (#1426), so the chevron pins to the
  // right edge at every value length rather than tracking the text string.
  anatomy: {
    root: 'container',
    parts: {
      // The stack. Structure only — it paints nothing (no `paintSlots`); the ink lives on the control
      // and on the two nested parts. Fills its column so the control and message span the field's width.
      container: {
        kind: 'box',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'root-gap',
        children: ['label', 'control', 'message'],
      },
      // THE NESTED LABEL (nest-fixed). An in-flow instance of `field-label`, fixed to Prism2's select
      // label configuration — small, secondary, regular, rest. Its four projected axes (size, emphasis,
      // weight, state) are all named in the coordinate, because `nestVariantMatch` requires the
      // coordinate to account for EVERY axis the member name carries. NOT followed: field-label's `emphasis`
      // (primary/secondary) and `state` (rest/disabled) are a different vocabulary from select's, so
      // there is no value to pass through — the label reads at one fixed configuration in Figma, and the
      // consumer's disabled dimming is a code concern (see codeOnly).
      label: {
        kind: 'nest',
        nests: 'field-label',
        nesting: { kind: 'nest-fixed', variant: { size: 'small', emphasis: 'secondary', weight: 'regular', state: 'rest' } },
        note: 'The accessible name, composed rather than re-declared. Fixed to the select label configuration (small / secondary / regular); a fix to FieldLabel reaches here without a copy.',
      },
      // THE CONTROL — the bordered, interactive box. The single target: it owns the hit area, the focus
      // ring and the stateful border. Paints its fill and border (`paintSlots`); fills the column width
      // and holds a fixed single-line height.
      control: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill', 'border'],
        // `space-between` PINS THE TRAILING CHEVRON TO THE FIELD'S RIGHT EDGE (#1426), independent of the
        // value string's length. `content` fills the control in CODE (flexbox `flex:1` pushes the chevron
        // right), but the engine projects `sizing: 'fill'` to AUTO/HUG (#989), so in Figma `content` HUGS
        // its text and a `justify: 'start'` control let the chevron track the value width — the QA symptom.
        // `space-between` distributes the two flow children (`content`, the absolute `focusRing` takes no
        // cell) to the control's ends, so the chevron sits at the right edge at every value length on BOTH
        // surfaces. `positionWhen` does not override this here (no travelling child), so the projected
        // `primaryAxisAlignItems` is `SPACE_BETWEEN` at every member.
        layout: { direction: 'row', align: 'center', justify: 'space-between', sizing: { x: 'fill', y: 'fixed' } },
        height: 'min-height',
        // THE COMFORTABLE DEFAULT WIDTH (#1343a, #1345), a MIN-WIDTH not a fixed width. Prism 2's select
        // is `root width 320 · HUG` with its inner containers FILLing that width; the engine cannot
        // project a child that FILLs (sizing 'fill' → AUTO, #989/#990), so the field is floored HERE, on
        // the visible control, the one way projection allows. The column then hugs to the 320 control, so
        // the field reads at 320 in Figma; and because the sizing stays 'fill' (AUTO, not FIXED) the field
        // FLEXES above the floor rather than being pinned. A literal, not a token — 320 is a projection
        // default in 8px increments, not a semantic value that earns a `field.width` role (#1343 owner
        // decision). So no emitted token NAME moves and `CONTRACT_VERSION` stands.
        minWidth: 320,
        radius: 'radius',
        // The edge weight (#1266's field) — 1px, the field hairline, bound rather than left to the
        // executors' fallback so a brand re-runging its border floor moves it.
        strokeWidth: 'border-width',
        // Symmetric padding — a select does not take #326's slot-aware asymmetry (the leading glyph sits
        // inside `content`, not against the box edge), so `inlineVisual` is omitted and both inline sides
        // fall back to the label inset.
        padding: { block: 'pad-y', inlineLabel: 'pad-x' },
        gap: 'gap',
        children: ['content', 'chevron', 'focusRing'],
      },
      // THE VALUE ROW — leading glyph + value text. Fills the control in code; in Figma it hugs (#989) and
      // the control's `space-between` (#1426) is what pins the chevron to the right edge. Structure only.
      content: {
        kind: 'box',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        children: ['leadingVisual', 'text'],
      },
      // THE OPTIONAL LEADING GLYPH. A swap slot whose PRESENCE is a node-visibility BOOLEAN (#1331): the
      // node is emitted at every member with `visible: false` and the `leading icon` switch toggles it,
      // rather than a variant axis multiplying the set. `optional: true` is required by the boolean
      // mechanism (the anatomy must allow the part to be hidden). The file nominates its swap target.
      leadingVisual: {
        kind: 'slot',
        optional: true,
        size: 'icon-size',
        nesting: { kind: 'swap' },
        note: 'An optional purpose glyph before the value, aria-hidden. Absent by default; the caller nominates the icon.',
      },
      // THE DISPLAYED TEXT — placeholder or value. `paintSlot` is the default `label`, which the paint
      // grammar re-points: `label` (bare) is the full-contrast value ink, `label.empty` the muted
      // placeholder ink at the `empty` state (see the `tokens` block — there is no `filled` state).
      text: {
        kind: 'text',
        type: 'type',
        note: 'The value the control shows, or the placeholder. One line, ellipsized in code; a plain text node in Figma. The placeholder-vs-value distinction is the internal `empty` state, which re-points the ink to the muted placeholder role — carried in code, not projected as a Figma variant (#1344).',
      },
      // THE TRAILING CHEVRON — a fixed `vector`, glyph `chevron-down` (the engine name; the Prism2 spec's
      // `arrow-down-s-line` is the source file's name, not ours). Its ink is the `icon` slot.
      chevron: {
        kind: 'vector',
        glyph: 'chevron-down',
        size: 'icon-size',
        note: 'The disclosure affordance, aria-hidden — the control\'s role conveys that it opens a menu. A downward chevron, painted the primary icon role so it matches the value text and the leading glyph (#1343).',
      },
      // THE FOCUS RING — the shared indicator, nested as an absolute sibling of the control's contents so
      // it rings the CONTROL (not the whole field) and takes no cell. `field` offset (0) because an
      // input's own border already supplies the separation. Fixed to the default surface (select carries
      // no surface axis).
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring`. Rings the control, takes no cell, and has its own stroke — so the focus signal never contends with the control\'s own border.',
      },
      // THE NESTED MESSAGE (nest-fixed, FOLLOWING status). An in-flow instance of `field-message` whose
      // single projected axis, `status`, is DRIVEN by select's `status` axis via `follow` — a same-name,
      // same-value passthrough (the alignment the header is about). `variant: { status: 'default' }` is the
      // fallback for a structure-only plan; `follow` overrides it at every real member, so a `status=error`
      // select nests the `status=error` message.
      message: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'default' }, follow: ['status'] },
        // `optional: true` is the half of the #1412 node-visibility mechanism the anatomy owns (the other
        // is the `showMessage` boolean in `figmaProperties.booleans`): a boolean toggles `visible`, so the
        // part must be one the anatomy allows to be absent (`figmaPropertyErrors`' requireOptional arm).
        // Built VISIBLE (the boolean defaults true — "as built"), hidden when the switch is turned off.
        // The FIRST `nest` part to carry the mechanism (field-label's marker is a text part, select's
        // leading glyph a slot); `present()` keeps any boolean-named part at every member regardless of
        // kind, so the nested instance is emitted and toggled in place rather than dropped.
        optional: true,
        note: 'Helper or validation text, composed rather than re-declared. Its status follows select\'s validation by name, so error / warning / success reach the message without a value mapping. Shown by default; the `showMessage` boolean (#1426) hides the whole part where the field has nothing to say.',
      },
    },
    codeOnly: [
      'the OPEN MENU / listbox — the whole option list is the platform\'s (a native `<select>`\'s popup is OS-drawn; a custom one is a separate listbox/popover surface). This def models the CLOSED control only, so there is no `expanded` state and no option-list anatomy. A designer building the open menu reaches for a menu/listbox component, not a variant of this one.',
      'the label / describedby WIRING — the host generates ids (useId), ties the FieldLabel to the control, stitches the FieldMessage into aria-describedby, and sets aria-invalid on error. Figma has no accessibility tree and no node-to-node reference, so the nested label and message sit near the control and are associated by proximity alone (the same ceiling `field-label` and `field-message` each hit). aria-expanded / aria-haspopup describe the popup this def does not model.',
      'empty — a real STATE (the displayed text is the placeholder, not a chosen value), deliberately NOT a Figma variant (#1344, the same posture as `button`\'s `inactive`). Its whole delta is the value INK: `label.empty` swaps the muted placeholder role in for `text.primary`, and `error.border.empty` keeps the danger boundary at the "required field left unchosen" coordinate. That is a content condition the code (or an instance\'s typed value) drives, not a skin a designer toggles from a variant matrix — and Figma cannot show one text node as two strings across a column anyway, so a projected `empty` member differed from `rest` only by an ink no designer chose. So `empty` stays in `states` (the paint model carries the distinction, and `lint-paint` reaches `label.empty` / `error.border.empty` at the empty coordinate of the declared grid) and is admitted OUT of the projected `stateAxis` here, dropping the set from status(4)×state(5)=20 to status(4)×state(4)=16 projected members (#1331 then made the leading glyph a node-visibility boolean, so it no longer multiplies the set — see figmaProperties).',
      'the nested LABEL\'s disabled dimming — select fixes the FieldLabel to `state=rest` because field-label\'s state vocabulary (rest / disabled) is not select\'s (rest / hover / focus-visible / disabled / empty), so it cannot be followed by value. In code a disabled select dims its label; in Figma the nested label reads at its rest configuration regardless. A projection limit, not a design choice.',
      'the KEYBOARD MODEL — typeahead to a matching option, arrow keys to move within the open list, Enter/Space to open and commit, Escape to close. All of it belongs to the interaction the closed control opens INTO, which is not modeled here.',
    ],
  },

  // How this projects into Figma. `status` is the one variant axis; `state` projects as the state axis. The
  // leading glyph's PRESENCE is a node-visibility BOOLEAN (`booleans` below), NOT a variant axis, so it does
  // NOT multiply the set: status(4) × state(4) = 16 members (was 32 while `leading` was a slot ×2 axis —
  // the #1331 conversion). `empty` is a real state (see `states` and the `codeOnly` entry leading with
  // `empty`) but is deliberately absent from this projected axis (#1344) — a content-driven ink distinction
  // the code carries, not a variant a designer picks; that is why `state` lists four values while `states`
  // lists five.
  figmaProperties: {
    variantAxes: ['status'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'focus-visible', 'disabled'] },
    // NO slot axis. The leading glyph's presence was a `leading` slot ×2 variant axis until #1331; it is now
    // a node-visibility BOOLEAN (`booleans` below). A select's glyph sits INSIDE `content`, not against the
    // box edge, so it takes NO #326 slot-aware padding asymmetry — which is exactly why a boolean can drive
    // it where button's edge-hugging leading/trailing must stay variant axes (the #1331/#1379 split). The
    // node is emitted at every member and hidden by default; the switch flips its visibility in place.
    // `state` across the columns — the axis a designer reads a control's skin across, and the widest here.
    gridAxis: 'state',
    // The displayed text. `value`, a designer-facing name (#1242), lowercase per #1333 — the
    // placeholder is the copy every member ships, and a chosen-value string is what a designer types over it.
    // Projects FIRST in the panel (text → boolean → swap order, #1380/#1331) — the "text property at the top".
    texts: { value: { part: 'text', default: 'Placeholder' } },
    // TWO NODE-VISIBILITY BOOLEANS (#1331/#1426), neither a variant axis — both toggle a part's `visible`
    // in place, so neither multiplies the set (still 16 members).
    //   · `leadingIcon` (#1331): `leadingVisual` is emitted at every member with `visible: false` (hidden by
    //     default, matching the prop's "Hidden by default"), and the `leading icon` switch toggles it. Panel
    //     label `leading icon` (the #1380 canon, preserved from the retired slot axis); the code prop stays
    //     `leadingIcon`. It shares the `leadingVisual` node with the swap below — `visible` and `mainComponent`
    //     are different Figma fields — so the panel reads `leading icon` (present?) with `↳ swap leading icon`
    //     (which icon) beneath it, the canon nesting.
    //   · `showMessage` (#1426): the composed `message` nest is emitted at every member with `visible: true`
    //     (shown by default — the message is part of the field), and this switch hides the whole part. The
    //     direction is the INVERSE of `leadingIcon` (default true, like field-label's `required`); the
    //     mechanism is identical. Panel label `message` (a presence toggle, parallel to `leading icon`); the
    //     code prop stays `showMessage`. FIRST use of the mechanism on a `nest` part.
    booleans: {
      leadingIcon: { part: 'leadingVisual', figmaName: 'leading icon', default: false },
      showMessage: { part: 'message', figmaName: 'message', default: true },
    },
    // The leading glyph's CONTENT — orthogonal to its presence boolean above. `figmaName` gives it the canon
    // panel label `↳ swap leading icon` (#1380), nested beneath the `leading icon` switch; the code prop
    // stays `leadingIcon` (one prop, two Figma properties: a presence boolean and a content swap).
    swaps: { leadingIcon: { part: 'leadingVisual', figmaName: '↳ swap leading icon' } },
  },

  accessibility: {
    role: 'combobox / listbox (native <select>, or a custom control with aria-expanded + aria-haspopup="listbox")',
    wcag: [
      '1.3.1 Info and Relationships (label + describedby association)',
      '3.3.1 Error Identification / 3.3.2 Labels or Instructions / 3.3.3 Error Suggestion',
      '1.4.3 Contrast (value + placeholder) / 1.4.11 Non-text Contrast (control boundary ≥3:1) / 2.4.13 Focus Appearance',
      '4.1.2 Name/Role/Value (role, and the expanded state of the popup) / 2.5.8 Target Size',
    ],
    keyboard: 'The closed control is one Tab stop; Space / Enter / Down open it. Inside the open list (not modeled here) arrows move, typeahead jumps, Enter commits, Escape closes and returns focus to the control.',
    focus: ':focus-visible ring on the control, boundary ≥3:1 (1.4.11 / 2.4.13). The control is the focus target; forwardRef reaches it so a form can focus the first invalid field on submit.',
    aria: 'The host generates ids, ties the label to the control and the message into aria-describedby, and sets aria-invalid on error. The placeholder is NOT the accessible name. A custom control mirrors the native listbox contract (aria-expanded, aria-activedescendant); prefer the native <select> where its OS menu is acceptable, because it is correct for free.',
  },

  content: {
    labelPattern: 'Noun phrase, sentence case, ≤3 words, no trailing colon; never the placeholder (see field-label).',
    errorPattern: 'What is wrong AND how to fix it (SC 3.3.3); icon + text, not color-only (carried by the nested field-message).',
  },

  docs: {
    usage: 'Use to choose ONE value from a known, bounded set where the options are not worth showing all at once. Always render a visible label (the nested FieldLabel); show the constraint in helper text before failure; drive the nested FieldMessage\'s status from the validation state. The open menu is the platform\'s — prefer a native <select> where its OS menu is acceptable. Past roughly 7-10 options a filtering Combobox scans better; below a handful an always-visible Radio group may read better.',
    do: [
      'Render a visible, associated label (FieldLabel) above the control',
      'Show a muted placeholder as a prompt, never as the label or a real option',
      'Drive validation through the status axis so the border and the nested message agree',
      'Prefer the native control where its OS menu is acceptable — the listbox contract is correct for free',
    ],
    dont: [
      'Use the placeholder as the label, or put a real, selectable option in it',
      'Model the open menu as a state of this control — it is a separate listbox / popover surface',
      'Color the border for warning or success — those are message-only; only error swaps the border',
      'Reach for a select when the user types to filter (Combobox) or the set is two mutually-exclusive options (Radio)',
    ],
    contentGuidelines: 'Label = noun phrase, sentence case, no trailing colon. Placeholder = a prompt ("Select an option"). Error says what + how to fix, never "Invalid".',
  },

  ai: {
    primaryPurpose: 'Choose one value from a known, bounded set, with an associated label and helper/validation message, modeling the closed control.',
    whenToUse: 'One-of-a-known-set choices too numerous or space-costly to show all at once — a country, a status, a category.',
    avoidWhen: 'The value is free-form text (TextField), the user types to filter a suggestion list (Combobox — a different ARIA contract), any number may be chosen (Checkbox group), the set is small and worth showing at once (Radio / SegmentedControl), or the choice is a binary that takes effect instantly (Switch).',
    commonPartners: ['field-label', 'field-message', 'focus-ring', 'icon', 'form', 'menu'],
    triggerKeywords: ['select', 'dropdown', 'picker', 'combobox', 'menu', 'choose', 'option list'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring', 'icon', 'form'],
    alternativeTo: ['text-field', 'combobox', 'radio', 'checkbox', 'segmented-control', 'menu'],
    supersedes: ['a bare <select> with no label wiring', 'placeholder-as-label'],
    // Nothing supersedes the select — combobox / radio / text-field are sibling alternatives chosen by
    // intent and scale, not replacements.
    supersededBy: [],
  },

  notes: {
    contested: [
      'Native <select> vs a custom listbox — this def models the closed control both share and leaves the open menu to the platform (native-first). A fully custom, styleable menu is a separate listbox/popover surface, chosen when the native menu\'s look is unacceptable and the extra ARIA cost is accepted.',
      'error as a border swap vs a full validation border set — settled as text-field settles it: error is the ONLY status that colors the border, warning and success are message-only. A brand wanting colored warning/success borders would be adding border roles the tier does not emit, which is a token-tier decision, not this def\'s.',
    ],
    unverified: [
      'The nested field parts hug rather than fill in Figma (a `nest` cannot bind sizing, #1299 gives it only a height), so the projected label and message sit at their natural width rather than spanning the 320 control. A consumer setting them to fill is a code-side layout concern; check a built member before assuming the whole stack reads full-width. The control itself is floored at 320 (`minWidth`), so the field reads at that width even though `fill` cannot stretch the label and message to it.',
      'The value text does not ellipsize in the Figma projection — `maxLines` / `textOverflow` have no PartDef expression — so a long placeholder in a narrow member overflows rather than truncating. The ellipsis is a code-side behavior.',
      'The leading glyph is a node-visibility BOOLEAN (#1331): the node is built at every member with `visible:false` and shown by the `leading icon` switch. In Figma auto-layout a `visible:false` child is EXCLUDED from the flow — it takes no space or gap — so a hidden glyph should add no gap to `content`, exactly as the absent slot did. The offline shims gate the boolean property, the built `visible=false` and the `componentPropertyReferences.visible` wiring, but NOT auto-layout\'s exclusion of invisible children: whether a real host reflows `content` when the switch toggles is a host question no Node gate answers. Symptom on a real host: a persistent gap where the hidden glyph sits, or the field not tightening when leading is off.',
    ],
  },
};
