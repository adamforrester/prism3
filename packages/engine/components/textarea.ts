/**
 * Textarea — the calibration def for the INHERITED SUBSTRATE (KB `components/textarea.md`,
 * `docs/40` §3). A control for free-form text expected to wrap across multiple lines.
 *
 * The brief's own framing: ~80% of this component IS `text-field`, and the interesting 20% is the
 * SIZING MODEL. So this is the first def whose job is mostly to record a delta rather than a
 * component, and the first engine instance of the `inherits:` convention the KB's `_schema.md`
 * locks for the form family.
 *
 * ── WHAT `inherits` DOES HERE, MEASURED RATHER THAN ASSUMED ─────────────────────────────────────
 *
 * **Nothing resolves it.** Grepping the engine, the only consumer of `def.inherits` is a `test.ts`
 * assertion that `iconButton.inherits === 'button'` — it RECORDS a claim, it does not merge a
 * parent. So the delta rule applies to `props`, which a human reads, and NOT to the four fields the
 * machinery reads: `states`, `variants`, `tokens` and `paintKeys` are stated locally here, in full,
 * exactly as `icon-button` states them despite inheriting `button`. Its header gives the reason and
 * it holds unchanged: *"a cheaper error than a lookup that walks `inherits` and resolves to a
 * grammar nobody reading this file can see."* A def that omitted them would not inherit them — it
 * would project unpainted.
 *
 * That distinction is the pattern this def sets, so state it once: **`inherits` is prose about
 * provenance; every field with a consumer is authored here.**
 *
 * ── THE 20%: THE SIZING MODEL, WHICH IS A SUBTRACTION FROM THE SUBSTRATE ────────────────────────
 *
 * `text-field` binds `size.{small,medium,large}.height`. **This def deliberately binds none.** Brief
 * §4: *"`size` scales typography and padding only — height is owned by `rows` / auto-grow, so the
 * single-line height tiers don't transfer."* A multi-line field is fluid in the block direction; a
 * height rung would fight `rows` and win silently. The delta the `inherits` convention exists to
 * express is, here, mostly an ABSENCE — which is worth knowing before authoring the other four,
 * because a delta you can only see by diffing against the parent is one a reader will miss.
 *
 * `rows` / `minRows` / `maxRows` are therefore the height model, and they are in LINES rather than
 * pixels for a stated reason (brief §3): a pixel floor does not survive the user raising their
 * browser font size, while a line count recomputes against the current line-height and stays locked
 * to the type scale. Nothing in the token layer expresses that — see `notes.unverified`.
 *
 * ── THE RUNG OFFSET, WHERE I MET IT (#756, `docs/28` §5.2, `docs/40` §7 step 2) ──────────────────
 *
 * `size.small.pad-x → size.sm.padding-x` and its two siblings: the def's enum is the component
 * vocabulary (`small/medium/large`), the ref is the engine's tier (`sm/md/lg`), and the engine's
 * names win. This is **not a new offset** — it is `text-field`'s exactly, inherited along with the
 * substrate it belongs to, and it agrees on every value. Recorded because the rule is that the
 * author records it where they meet it, and "the parent already did" is how the next def stops
 * doing so. Default `medium` → `md`, per the rule rather than this def's judgment.
 *
 * ── WHY `size` IS IN `props` AT ALL, WHEN THE BRIEF INHERITS IT ─────────────────────────────────
 *
 * Because `lint-rung-names.ts` reads a def's size ladder from `props.size.values` and compares it with
 * the `size.*` bindings — and an omitted prop reads as `[]`. So `size` is re-declared here, and that is
 * the gate working rather than the delta rule bending: the ladder is a thing the machinery reads, which
 * by the rule above is authored locally. Its description carries the Textarea-specific narrowing (type
 * and padding, not height) instead of restating the parent's.
 *
 * ── THE FIGMA PROJECTION, MODELED ON `text-field` (its #1494 shape) ─────────────────────────────
 *
 * The same column — nested FieldLabel, the bordered control, nested FieldMessage following `status` —
 * the same status-led border, the same five projected states, the same focus-ring nesting and the same
 * footprint (status and state are runtime axes, so every member of a status × state set measures alike).
 * `size` left `variants` for text-field's reason: `figmaAnatomySet` refuses a declared-but-unprojected
 * size (#795), and Figma renders the one `md` rung, so the ladder lives in `props.size` + the
 * `size.{small,medium,large}.*` tokens (`lint-rung-names`' `LADDER_STATED_ONCE` names this def).
 *
 * THE ONE STRUCTURAL DIFFERENCE IS THE HEIGHT. text-field's control is FIXED at `size.md.min-height`;
 * this control binds no height at all and HUGS — its padding plus a value text that reserves `rows`
 * lines (`lines: 'rows'` on the text part). The count is the `rows` prop's own default and the line
 * height is the applied type style's, multiplied at paste, so the Figma box is rows × line height +
 * padding in every brand without a pixel written here — the header's "no `size.*.height`" rule, kept.
 * Which axes project and how many rows show are open design questions; see `anatomy.codeOnly` for what
 * was left out of Figma and why.
 *
 * ── THE GRIP AND THE COUNTER (the owner's answers, 2026-09-25) ──────────────────────────────────
 *
 * (c) The resize grip IS drawn: it is the main visual cue that separates this from a text field, and code's
 * `resize` defaults to `vertical`. A `resize-grip` glyph pinned into the control's bottom-right corner
 * (`corner`, out of the flow so the value text keeps its width), at the smallest icon rung in the muted icon
 * role, behind a `resize handle` boolean that is ON by default. Decorative: in code it is the browser's own.
 * (d) The counter IS drawn, OFF by default like `showCount`: a caption trailing in the message row, behind a
 * `character count` boolean. The row is this def's own box around the nested FieldMessage, so field-message,
 * text-field and select project byte-identically. The row's height is the message's (a caption beside a
 * caption), so the counter moves no footprint either way.
 *
 * ── THE MESSAGE AND THE COUNTER ARE INDEPENDENT (the owner's answer 2, 2026-09-25) ───────────────────────
 *
 * Designers need message only, counter only, both, or neither, with no stray empty row or gap, and a Figma
 * boolean toggles ONE layer. Two host facts decide the construction: a column's gap still applies before a
 * visible child that is empty, and a hidden child takes no cell and no gap. So each switch toggles a CELL that
 * carries its own space above it (`paddingTop: 'root-gap'`), and the control and the row sit in a gap-0 column
 * (`body`): with both cells off the row is empty, and nothing is left above it. The counter's cell GROWS across
 * the row and justifies the caption to the end, so the counter trails with the message on or off (a
 * `space-between` row puts a lone child at the start). No third switch: the owner's fallback (a `footer`
 * switch holding the two) would still leave a stray gap with the footer on and both inside it off.
 */
import { ComponentDef } from '../component-schema';

export const textarea: ComponentDef = {
  id: 'textarea',
  name: 'Textarea',
  aliases: ['text-area', 'multiline-input', 'multiline-text-field', 'textbox', 'comment-box'],
  category: 'form',
  status: 'draft',
  inherits: 'text-field',
  summary: 'Multi-line text field: label, input area, and helper or validation message.',
  description:
    'A control for free-form text expected to wrap across multiple lines — comments, descriptions, messages, feedback. Shares the form-field substrate with TextField (label, helper/error, the aria-describedby wiring); differs in the sizing model, the prominence of the character counter, and who owns the Enter key. Not single-line (TextField), not formatted or structured (a rich-text editor), not code (a code editor), not a value from a known set (Select, or a combobox, not built yet).',

  // THE DELTA ONLY (brief §3, §15). Everything the substrate contract already carries — label,
  // value/defaultValue, onChange/onBlur/onFocus, placeholder, helpText, disabled, readOnly,
  // required, autoComplete, id, name, and the bundled-props/composed-slots hybrid with its internal
  // aria wiring — is `text-field`'s and is not restated. `size` is one exception and the header
  // says why; `validation` + `validationMessage` are the other, for the same reason: a gate reads them
  // (`test.ts` pins the field family's shared validation contract — text-field, textarea and select
  // carry the same two names and the same value set, #1623 sign-off C1/TA-4). `value` and `showMessage`
  // are the third exception, and the reason is the same one: the Figma projection keys its text property
  // and its message switch by code prop, and `figmaPropertyErrors` validates each key against `props`.
  props: [
    { name: 'value', type: 'string', required: false, description: 'Controlled value; pair with onChange. The same prop as TextField\'s, restated here because the Figma text property is keyed by it.' },
    { name: 'showMessage', type: 'boolean', default: true, required: false, description: 'Whether the composed FieldMessage is shown. ON, the default, renders the helper or validation message below the field; turning it off hides the message entirely. The same prop as TextField\'s. Never hides a message the field needs.' },
    { name: 'rows', type: 'number', default: 3, required: false, description: 'Initial and minimum height, in LINES not pixels — a line count recomputes against the current line-height when the user raises their font size, where a pixel floor does not. Also a content cue: two rows signals brevity, six signals "write more". `cols` is dead on the web; width comes from CSS.' },
    { name: 'resize', type: "enum: 'none' | 'vertical' | 'auto'", values: ['none', 'vertical', 'auto'], default: 'vertical', required: false, description: 'The sizing model in ONE prop, so two props cannot contradict each other. `vertical` (the drag handle) for standalone form fields; `auto` (grow within minRows/maxRows) for composers; `none` where layout stability wins. NEVER horizontal or both — altering the inline dimension shatters grid and flex layouts for no user gain.' },
    { name: 'minRows', type: 'number', required: false, description: 'Auto-grow floor, in lines. Only meaningful with resize="auto".' },
    { name: 'maxRows', type: 'number', required: false, description: 'Auto-grow cap, in lines; beyond it the field scrolls. ALWAYS set this when auto-growing — an uncapped field pushes the submit button off-screen on a long paste, which is a shipped failure in the field, not a hypothetical.' },
    { name: 'maxLength', type: 'number', required: false, description: 'Character limit, counted by GRAPHEME (Intl.Segmenter) rather than UTF-16 code unit — a flag emoji costs 4 units and a ZWJ family up to 11, so a .length limit hits non-Latin and emoji users artificially early. Enforce SOFT: allow the overflow, set aria-invalid, show the counter in error, block submit. Never the native hard maxlength, which silently truncates pasted overflow with no signal to anyone, AT users included.' },
    { name: 'showCount', type: 'boolean', default: false, required: false, description: 'The character counter — first-class here, unlike on TextField. Only ever with a real limit: a counter on an unlimited field implies a cap that does not exist.' },
    { name: 'spellCheck', type: 'boolean', required: false, description: 'Native passthrough; worth surfacing because structured input often wants it off.' },
    { name: 'submitOnEnter', type: 'boolean', default: false, required: false, description: 'Composer opt-in: Enter submits, Shift+Enter inserts a newline. NOT the base default — Enter inserting a newline is the platform contract a multi-line field advertises via aria-multiline, and hijacking it silently can lose a screen-reader user a drafted message. Whenever true, pair it with a real visible submit button and a visible "Shift+Enter for a new line" hint (SC 3.3.2).' },
    { name: 'validation', type: "enum: 'default' | 'error' | 'warning' | 'success'", values: ['default', 'error', 'warning', 'success'], default: 'default', required: false, description: 'The validation state. Each non-default status swaps the field border to its own boundary (border-only — `error` → danger, `warning` → warning, `success` → success) and sets the composed message to the matching status; `default` is neutral. `error` also sets aria-invalid. The same prop, with the same values, as TextField and Select.' },
    { name: 'validationMessage', type: 'string | node', required: false, description: 'The validation text shown at error / warning / success, added to aria-describedby. For error, say what is wrong AND how to fix it, with the number when it is a length limit (SC 3.3.3), never "Invalid".' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales type and padding ONLY — height belongs to rows / auto-grow, so the substrate\'s height tiers do not transfer.' },
  ],

  // Identical to `text-field`'s set, and stated rather than inherited for the reason in the header.
  // `error` IS NOT A STATE (#1623 sign-off, C1/TA-4 — text-field's #1494 move, followed here): validation
  // co-occurs with rest/hover/focus rather than replacing one, so it is the `status` axis below.
  // No `pressed` — brief §4 is explicit that a multi-line field is not pressed the way a mobile
  // single-line field is, and `pressed` is in the closed vocabulary, so its ABSENCE here is a
  // decision rather than an omission.
  //
  // `pending`, not `loading` (#843, resolved by #868 while this def was in review). The AI-streaming
  // case (brief §4: content streamed into the field to rewrite or summarize, carrying aria-busy) is
  // the same async-in-flight concept `button` and `icon-button` already name `pending`, and #868
  // closed `loading` out of the vocabulary entirely — a rejected name returning through a fourth def
  // would have been the exact shape #868 filed the vocabulary to stop.
  states: ['rest', 'hover', 'focus-visible', 'disabled', 'read-only', 'pending', 'empty'],

  // `style`, plus text-field's `status` axis with text-field's exact values (#1623 sign-off, C1/TA-4) —
  // the validation outcome, driven by the `validation` prop. `size` is NOT a variants axis, for text-field's
  // reason (the header): Figma projects the single `md` rung, and a declared size must project one. The
  // brief's §15 also lists `resize` and `modifiers` as variant axes; neither is declared here and
  // `notes.contested` carries both arguments with their named alternatives.
  variants: {
    style: ['outline'], // filled / underline are theming, not an API axis (brief §4)
    status: ['default', 'error', 'warning', 'success'],
  },
  // WHEN each axis changes (#1611): runtime axes are held to one footprint, authoring axes are not.
  axisKinds: { style: 'authoring', status: 'runtime' },

  // The substrate's grammar, stated rather than inherited — text-field's exactly since the `status` axis
  // arrived (#1623 sign-off): status-led-and-state-qualified first, so a status border wins over the
  // interactive progression at every coordinate, then slot-and-state, then the bare slot as the rest
  // value. The status template is 3-segment for the reason text-field's header gives (two 2-placeholder
  // templates cannot coexist).
  paintKeys: ['{status}.{slot}.{state}', '{slot}.{state}', '{slot}'],

  // INPUT CHROME ONLY, same composition call as the substrate — label and message color/type live in
  // `field-label` / `field-message` and are composed, not re-declared here.
  //
  // TWO THINGS THIS BLOCK DOES NOT CARRY, both deliberate and both invisible unless stated:
  //
  //  1. NO `size.*.height`. The header's subtraction. Height is `rows` / auto-grow.
  //  2. NO container/input split for the error stroke. Brief §4 wants the error boundary on the
  //     CONTAINER rather than the input, so a Windows scrollbar docks inside the error ring rather
  //     than breaking it — that is a real requirement and it is an ANATOMY concern, not a token one:
  //     the same `color.border.danger` paints either node. The anatomy below puts the stroke on the
  //     `control` box that wraps the text, which is the container reading; `notes.unverified` keeps
  //     the code-side half.
  tokens: {
    'fill': 'color.field.fill',
    // The hover WASH, text-field's (#1341/#1342): the transparent field fill takes a translucent overlay
    // on hover (precedence overlay > fill, the control's `paintSlots`) while the border strengthens.
    'overlay.hover': 'color.interactive.neutral.overlay.hover',
    'label': 'color.text.primary',
    // The placeholder binds `text.secondary`, text-field's #1518 binding (#1623 sign-off, C1/TA-4), so
    // the two fields express empty-vs-value with the same two text roles.
    'label.empty': 'color.text.secondary',
    // The BARE `border` is the rest value, text-field's spelling: the disabled branch applies
    // `disabled.border` only where the slot resolves at rest through a slot-only key, so a rest border
    // spelled `border.rest` left a disabled member with no edge at all.
    'border': 'color.field.border.rest',
    'border.hover': 'color.field.border.hover',
    'border.focus-visible': 'color.border.focus',
    'border.read-only': 'color.border.secondary',
    // The status-led border swaps — text-field's keys and roles exactly (#1623 sign-off, C1/TA-4): each
    // non-default status binds its own border role PER non-disabled state, so the boundary persists
    // through hover, focus and read-only. `pending` is unbound (as on text-field); `default` binds none.
    'error.border.rest': 'color.border.danger',
    'error.border.hover': 'color.border.danger',
    'error.border.focus-visible': 'color.border.danger',
    'error.border.read-only': 'color.border.danger',
    'error.border.empty': 'color.border.danger',
    'warning.border.rest': 'color.border.warning',
    'warning.border.hover': 'color.border.warning',
    'warning.border.focus-visible': 'color.border.warning',
    'warning.border.read-only': 'color.border.warning',
    'warning.border.empty': 'color.border.warning',
    'success.border.rest': 'color.border.success',
    'success.border.hover': 'color.border.success',
    'success.border.focus-visible': 'color.border.success',
    'success.border.read-only': 'color.border.success',
    'success.border.empty': 'color.border.success',
    // Focus ring — the field offset, as on the substrate. Brief §4 argues a textarea is a LARGE
    // surface and a saturated ring around a 600×400 box is noise, favouring an inset indicator. The
    // engine emits one field-ring offset and no large-surface variant, so this binds what exists and
    // the argument is recorded rather than acted on (`notes.contested`) — inventing a token here
    // would be a def authoring engine surface. The ring is the nested `focus-ring`, which owns its own
    // color (text-field's reading), so only its geometry is bound here.
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset-field',
    // Disabled skin (contrast-exempt), the shared cross-cutting family. On-fill because a field
    // always has a fill, so its disabled ink always sits on `disabled.fill`.
    'disabled.fill': 'color.disabled.fill',
    'disabled.label.on-fill': 'color.disabled.on-fill',
    'disabled.border': 'color.disabled.border',
    // Geometry. Padding only — see the header. The BARE keys are the projected `md` rung (text-field's
    // shape); the `size.{small,medium,large}.*` keys below are the code-API ladder, not projected.
    'radius': 'radius.sm',
    'pad-x': 'size.md.padding-x',
    'pad-y': 'size.md.padding-y',
    // The stack spacing between label, control and message — text-field's.
    'root-gap': 'space.100',
    // 1px field hairline, text-field's edge weight.
    'border-width': 'border-width.hairline',
    // The value ink's type, text-field's running body text. Its LINE HEIGHT is what the reserved rows
    // multiply (the text part's `lines`), so the height tracks the type scale rather than a pixel.
    'type': 'type.body.md.default',
    // THE RESIZE GRIP (owner decision (c), 2026-09-25). The smallest icon rung (16 in every brand), in the
    // MUTED icon role — the grip is chrome, not content, so it sits a step below the value ink. On a
    // disabled member it sits on `disabled.fill`, so it takes the on-fill disabled ink like the value text.
    // Its inset from the corner is the control's own edge weight: the artboard sits just inside the 1px
    // border, never on it (`lint-absolute-inset.ts` holds the inset to the stroke in every brand).
    'icon': 'color.icon.secondary',
    'disabled.icon.on-fill': 'color.disabled.on-fill',
    'grip-size': 'icon.size.xs',
    'grip-inset': 'border-width.hairline',
    // THE CHARACTER COUNTER (owner decision (d)). The caption scale field-message's text uses, so the two
    // captions in the row share one line box and the row keeps the message's height; the muted text role,
    // the `indicator` slot's reason (a secondary ink beside a primary one). It sits on the page below the
    // control, not on the control's fill, so its disabled ink is the page form, not the on-fill one.
    'counter-type': 'type.caption.md.default',
    'indicator': 'color.text.secondary',
    'disabled.indicator': 'color.disabled.text',
    'size.small.pad-x': 'size.sm.padding-x',
    'size.small.pad-y': 'size.sm.padding-y',
    'size.medium.pad-x': 'size.md.padding-x',
    'size.medium.pad-y': 'size.md.padding-y',
    'size.large.pad-x': 'size.lg.padding-x',
    'size.large.pad-y': 'size.lg.padding-y',
  },

  // ── ANATOMY — text-field's column, with a control that HUGS its reserved rows ──────────────────
  //
  // container (column) → nested FieldLabel · body (a gap-0 column: control, the bordered box · message row,
  // a message cell and a counter cell). The label, the message, the focus ring, the status-led border and the 320 width floor
  // are text-field's, part for part. The control differs in two ways: it binds no height (it hugs its padding
  // and the text), and it holds the value text plus the corner grip — no leading glyph, no trailing affix.
  // The message row is this def's own, so the counter can trail the message without touching field-message.
  anatomy: {
    root: 'container',
    parts: {
      // The stack. Structure only; fills its column so the control and message span the field's width.
      container: {
        kind: 'box',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'root-gap',
        children: ['label', 'body'],
      },
      // THE NESTED LABEL — text-field's, exactly (nest-exposed size / emphasis / weight, state fixed at rest).
      label: {
        kind: 'nest',
        nests: 'field-label',
        nesting: { kind: 'nest-exposed', variant: { size: 'small', emphasis: 'secondary', weight: 'regular', state: 'rest' }, expose: ['size', 'emphasis', 'weight'] },
        note: 'The accessible name, composed rather than re-declared. Nest-exposed: its label text, required marker and size/emphasis/weight surface on the textarea. Starts at the field default (small / secondary / regular).',
      },
      // THE BODY — the control and the message row in a GAP-0 column. The stack gap between them is carried
      // by the message and counter CELLS instead (their `paddingTop`), so it hides with them: a column gap
      // would stay above the row when both are off, since an empty row is still a visible child.
      body: {
        kind: 'box',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        crossAxisFill: true,
        children: ['control', 'messageRow'],
      },
      // THE CONTROL — the bordered, interactive box and the single target. Paints the fill, the hover wash
      // and the stateful border (text-field's `paintSlots`). NO bound height: it hugs its block padding plus
      // the text's reserved rows, so the box is rows × line height + padding and grows past it with longer
      // copy. `align: 'start'` keeps the text at the top of a taller box. The 320 min-width is text-field's
      // literal projection floor (#1518), not a token.
      control: {
        kind: 'box',
        role: 'target',
        paintSlots: ['overlay', 'fill', 'border'],
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        minWidth: 320,
        radius: 'radius',
        strokeWidth: 'border-width',
        padding: { block: 'pad-y', inlineLabel: 'pad-x' },
        children: ['text', 'grip', 'focusRing'],
      },
      // THE DISPLAYED TEXT — placeholder or value. Fills the control's width and wraps (`wrap`, bounded by
      // the control's `minWidth`), sits at the TOP of its box (`verticalAlign`, as schema #1009 predicted for
      // this def), and reserves `rows` lines of its own line height (`lines`).
      text: {
        kind: 'text',
        type: 'type',
        wrap: true,
        verticalAlign: 'top',
        lines: 'rows',
        note: 'The value the field shows, or the placeholder. Wraps across the field width and reserves the default rows of its own line height, so the box is as tall as `rows` lines before anything is typed.',
      },
      // THE RESIZE GRIP (owner decision (c)) — pinned into the control's bottom-right corner, out of the flow,
      // so it takes no cell: the value text keeps the control's whole width with the grip drawn or not, and
      // the control's box does not move. Inset from the corner by the control's own edge weight.
      grip: {
        kind: 'vector',
        glyph: 'resize-grip',
        size: 'grip-size',
        corner: 'bottom-right',
        inset: 'grip-inset',
        optional: true,
        note: 'The resize grip at the bottom-right corner, decorative: in code it is the browser\'s own handle. Pinned out of the flow, so the control keeps one size with it on or off. Shown by default (the `resize handle` boolean), since `resize` defaults to `vertical`.',
      },
      // THE FOCUS RING — text-field's: an absolute sibling that rings the control on focus-visible.
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring`. Rings the control, takes no cell, and has its own stroke.',
      },
      // THE MESSAGE ROW — the message cell at the start and the counter cell growing to the end, stretched to
      // the field's width. Structure only, always present, and never switched: each cell is. With both cells
      // off it is empty and measures nothing; its height is otherwise the taller cell's.
      messageRow: {
        kind: 'box',
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'root-gap',
        crossAxisFill: true,
        children: ['messageCell', 'counterCell'],
      },
      // THE MESSAGE CELL — the nested message with the stack gap above it. The `message` boolean toggles this
      // cell, so the gap hides with the message.
      messageCell: {
        kind: 'box',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        paddingTop: 'root-gap',
        optional: true,
        children: ['message'],
      },
      // THE NESTED MESSAGE — text-field's: nest-fixed, following `status` by name.
      message: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'default' }, follow: ['status'] },
        note: 'Helper or validation text, composed rather than re-declared. Its status follows the field\'s validation by name. Shown by default; the `message` boolean hides it, with the space above it.',
      },
      // THE COUNTER CELL — the stack gap above the counter, GROWING across the rest of the row and justifying
      // the caption to its end, so the counter trails whether or not the message is shown. The `character
      // count` boolean toggles this cell.
      counterCell: {
        kind: 'box',
        layout: { direction: 'row', align: 'start', justify: 'end', sizing: { x: 'fill', y: 'hug' } },
        paddingTop: 'root-gap',
        grow: true,
        optional: true,
        children: ['counter'],
      },
      // THE CHARACTER COUNTER (owner decision (d)) — a caption at the end of the row, hidden by default.
      counter: {
        kind: 'text',
        type: 'counter-type',
        paintSlot: 'indicator',
        note: 'The character counter, at the end of the message row. Hidden by default (the `character count` boolean), matching `showCount`, and independent of the message: either, both or neither can show. Beside the message it takes no height the row does not already have.',
      },
    },
    codeOnly: [
      'size — the small / medium / large ladder is a code-API PROP + padding tokens (`size.{small,medium,large}.pad-*`), NOT a variants axis and NOT a projected Figma variant. Figma renders the single `md` rung (the bare `pad-x` / `pad-y` keys), text-field\'s shape: a declared size axis must project a rung (#795), so the single-projected-size field is expressed by the prop and tokens.',
      'style — the outline / filled / underline treatment is theming, not an API axis: `style` carries the single value `outline`, so there is nothing for a Figma variant to enumerate.',
      'pending — a real STATE (content streaming into the field, with aria-busy), deliberately NOT a Figma variant: its delta is runtime behavior with no distinct static skin, so it stays in `states` and is admitted out of the projected `stateAxis`.',
      'empty — a real STATE (the displayed text is the placeholder), deliberately NOT a Figma variant, text-field\'s posture: its delta is the value ink (`label.empty`) and `error.border.empty`, a content condition code drives. It and `pending` are the two states held back, leaving the projected set at status(4) × state(5) = 20 members.',
      'rows / minRows / maxRows and auto-grow — Figma has no numeric component property, so `rows` is not a Figma property: the value text reserves the `rows` prop\'s DEFAULT line count (3) of its own line height, frozen at paste. A designer wanting more rows types more lines (the box grows) or resizes the instance; `minRows` / `maxRows` and the auto-grow measurement are runtime behavior.',
      'the RESIZE HANDLE\'s behavior (`resize`) — Figma draws a decorative grip behind the `resize handle` boolean, on by default because `resize` defaults to `vertical`. In code the handle is the browser\'s own, drawn at the inline-end corner (bottom-left in a right-to-left layout); Figma members are drawn left to right, so the grip sits bottom-right. `auto` and `none` draw no handle in code; in Figma, switch the boolean off.',
      'the CHARACTER COUNTER\'s live value (`maxLength` / `showCount`) — Figma draws a static "0 / 200" caption trailing the message, behind the `character count` boolean, off by default like `showCount`. Code counts graphemes, sets tabular numerals (`font-variant-numeric: tabular-nums`, which the type tokens do not carry, so Figma uses the caption style as it is) and paints the counter in the error role past the limit. In Figma, as in code, the counter and the message switch independently.',
      'the label / describedby WIRING and the counter\'s two-node live region — the host generates ids, ties the FieldLabel to the textarea, stitches the FieldMessage and the counter into aria-describedby, and sets aria-invalid. Figma has no accessibility tree, so the nested parts are associated by proximity alone.',
      'the nested LABEL\'s disabled dimming — the field fixes the FieldLabel to `state=rest` (its state vocabulary is not the field\'s), so in Figma the nested label reads at rest regardless. A projection limit, not a design choice.',
      'the KEYBOARD MODEL — native multi-line editing, the Enter key (a newline unless submitOnEnter), IME composition guards and the resize drag. All of it is runtime interaction the closed static member cannot carry.',
    ],
  },

  // How this projects into Figma — text-field's shape. `status` is the one variant axis; `state` projects
  // the five interactive states. The message's presence is a node-visibility boolean, so the set is
  // status(4) × state(5) = 20 members.
  figmaProperties: {
    variantAxes: ['status'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'focus-visible', 'disabled', 'read-only'] },
    gridAxis: 'state',
    // The counter's caption is keyed by `maxLength`, the prop whose limit it shows (a TEXT property must key
    // on a declared prop, and the counter has no string prop of its own). "0 / 200" is the def's own counter
    // format (`docs.contentGuidelines`).
    texts: {
      value: { part: 'text', default: 'Placeholder' },
      maxLength: { part: 'counter', figmaName: 'count', default: '0 / 200' },
    },
    booleans: {
      // Each switch toggles its own CELL, which carries the space above it — so any of the four combinations
      // leaves no empty row and no stray gap (the header's last section).
      showMessage: { part: 'messageCell', figmaName: 'message', default: true },
      // Keyed by `resize`, the code prop that decides whether the browser draws a handle (`vertical`, the
      // default, does). A boolean rather than a variant axis: the grip is pinned out of the flow, so its
      // presence moves nothing and a node-visibility toggle carries it (the icon-property canon).
      resize: { part: 'grip', figmaName: 'resize handle', default: true },
      showCount: { part: 'counterCell', figmaName: 'character count', default: false },
    },
  },

  accessibility: {
    role: 'textbox (native <textarea>), with the implicit aria-multiline="true"',
    wcag: [
      '4.1.3 Status Messages (the counter and over-limit live region — the most Textarea-specific SC)',
      '1.4.4 Resize Text / 1.4.10 Reflow (the field, counter and resize handle must survive 200% zoom and 320px without colliding or clipping)',
      '3.3.2 Labels or Instructions (the "Shift+Enter for a new line" hint whenever Enter submits)',
      '1.3.5 Identify Input Purpose / 1.3.1 Info and Relationships (inherited substrate wiring)',
      '3.3.1 Error Identification / 3.3.3 Error Suggestion (over-limit states the overage and how to fix it)',
      '1.4.3 Contrast / 1.4.11 Non-text Contrast / 2.4.13 Focus Appearance / 4.1.2 Name Role Value',
      '2.5.8 Target Size (the resize handle is a target)',
    ],
    keyboard: 'Native multi-line editing with undo/redo, spellcheck and IME. Enter inserts a newline — that is the contract aria-multiline advertises and the default. submitOnEnter inverts it for composers, and then Shift+Enter inserts the newline, a real submit button still exists, and the swap is stated visibly near the field.',
    focus: ':focus-visible with the field ring (`focus.ring.offset-field`, 0 offset). An inset indicator for large surfaces is not built. forwardRef must reach the <textarea> itself, not the wrapper. Auto-resize must not move the caret or scroll the viewport — the measurement is synchronous with input, and it must also run on PROGRAMMATIC value changes (a reset, or AI-inserted text), which is the common auto-grow bug.',
    aria: 'The counter is the central problem and it is two nodes, not one: the visual counter is aria-hidden and updates instantly, while a separate visually-hidden node carries announcements. Two channels — the static limit folded into aria-describedby so tabbing in announces the ceiling, and a threshold-based polite live region that speaks only near the limit (per-keystroke counting makes the field unusable), escalating to assertive only on breach. Over-limit sets aria-invalid and is ANNOUNCED, never color-only. aria-busy while content streams. Preserve the native aria-multiline; do not reconstruct a textarea from contenteditable, which loses undo/redo, spellcheck, reliable IME and form submission. Set dir="auto" so content direction can differ from UI direction, and do not run counting or auto-grow measurement mid-IME-composition.',
  },

  content: {
    labelPattern: 'Noun phrase, sentence case, no trailing colon — the substrate discipline (see field-label).',
    errorPattern: 'What is wrong AND how to fix it, with the number: "Description must be under 500 characters. Remove 24 to continue." (SC 3.3.3). May replace the helper text to conserve vertical space, provided it still carries the original constraint.',
    emptyPattern: 'Label plus an optional placeholder. The placeholder may model the expected SHAPE ("Describe the issue, including steps to reproduce") but still vanishes on the first keystroke — and the recall cost is higher here than on a single-line field, because a user may write several paragraphs, tab away, and come back to a prompt that is long gone. Nothing load-bearing lives in it.',
  },

  docs: {
    usage: 'Use for free-form text expected to exceed one line — comments, descriptions, messages, feedback, multi-line addresses. Pick the sizing model by context: fixed-height-plus-scroll for a field inside a long form (so the form does not reflow as the user types), auto-grow for a composer (so the message box follows the message). Right-size the initial rows to the expected input. Compose FieldLabel above and FieldMessage below exactly as TextField does; the host wires the ids and the aria-describedby chain.',
    do: [
      'Set maxRows whenever auto-growing — uncapped growth pushes the submit affordance off-screen on a long paste',
      'Enforce a character limit softly (allow over, flag invalid, block submit) and count by grapheme, not by string length',
      'Announce the over-limit through the live region and aria-invalid — color alone is not a signal',
      'Normalize \\r\\n to \\n on paste before counting or storing, and resize once per paste rather than once per inserted line',
    ],
    dont: [
      'Offer horizontal or both resize — it shatters grid and flex layouts and breaks responsive viewports',
      'Use the native maxlength attribute for substantial text — it silently swallows pasted overflow with no feedback',
      'Bake submit-on-Enter into the base component — it is a composer opt-in that always keeps a real submit button and a visible hint',
      'Reach for contenteditable to add formatting — cross the boundary to a real rich-text editor instead',
      'Drop in a one-row Textarea as a "bigger input" — the semantics and the Enter behavior differ from TextField',
    ],
    contentGuidelines: 'Counter reads "240 / 280" or "40 characters remaining"; over-limit reads "12 characters over the limit" — constructive and numeric, never "Too long." If Enter submits, say so near the field.',
  },

  ai: {
    primaryPurpose: 'Capture multi-line free-form text with an associated label, an optional soft character limit, and a stated sizing model.',
    whenToUse: 'Comments, descriptions, messages, feedback, notes, commit-message bodies, a multi-line address — any input that predictably runs past the ~40–60 characters a single-line field shows comfortably, or that legitimately needs user-authored line breaks.',
    avoidWhen: 'The value is a single line (TextField — and do not substitute a one-row Textarea, the Enter semantics differ), needs formatting or structure such as bold, links, @-mentions or embedded media (a rich-text editor — a <textarea> holds a plain string and nothing else), is source code (a real code editor, for syntax highlighting and bracket matching), or comes from a known set (Select, or a combobox, not built yet). Also avoid reaching for it as a general "big box of text" when the content is genuinely structured — that is the rich-text signal.',
    commonPartners: ['field-label', 'field-message', 'button', 'icon'],
    triggerKeywords: ['textarea', 'text area', 'multiline', 'multi-line input', 'comment box', 'message box', 'description field', 'composer'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring', 'button', 'icon'],
    // ALTERNATIVE TO text-field, not a superseder — they are siblings a designer picks between by
    // input shape. The brief flags that its external research pass typed this as
    // `supersedes: text-field` and corrects it against the prose; carried here so the corrected
    // reading is the one that reaches the engine.
    alternativeTo: ['text-field', 'select'],
    replacesPatterns: ['a one-row textarea used as a tall input', 'a contenteditable div used for plain multi-line text'],
    planned: ['spinner', 'form', 'rich-text-editor', 'combobox', 'code-editor'],
  },

  notes: {
    contested: [
      'resize as a VARIANT AXIS vs a prop — brief §15 lists `resize: [none, vertical, auto]` under `variants`, and §4 calls it "more like an author-chosen variant than a runtime state". Declared here as a prop ONLY. Two reasons: `VARIANT_AXES` is closed (#847) and does not contain `resize`, and adding it would duplicate a member already carried by the prop — the exact criticism `modifiers` carries in the vocabulary\'s own header (#845). The named alternative is to admit `resize` to `VARIANT_AXES` with a stated reason, which is the right move IF the drag handle turns out to need a projected Figma member. It did not: the grip is pinned out of the flow, so it moves no box and a `resize handle` boolean carries it (2026-09-25).',
      'modifiers: [auto-grow, show-count] — brief §15 lists these as an axis. Not declared, and NOT a judgment call: `modifiers` is not in `VARIANT_AXES`. #845 removed it — from both defs that carried it and from the vocabulary itself (`component-schema.ts` §2 of the closed-vocabulary header: "**RESOLVED (#845): removed, from both defs and from this list**"; `button.ts` opens its variants block with `NO modifiers AXIS`). Since `variants` is typed `Partial<Record<VariantAxis, string[]>>`, declaring it does not compile, and `validateComponentDef` rejects it a second time at runtime. The reason it was removed is the same one that would disqualify it here — its values are not alternatives along one dimension: `auto-grow` is already a value of `resize`, `show-count` is already a boolean prop, and a textarea can be both at once, which is what makes them booleans rather than coordinates. The real alternative is to petition to RE-OPEN `VARIANT_AXES` with a stated reason, the way the `resize` entry above contemplates for itself. (An earlier version of this entry said the alternative was to "declare it and accept the duplication", which reads as a trade-off available to the author and is not one — the file would not build. Corrected in #904; the conclusion never moved, only the reason under it.)',
      'The focus indicator on a large surface — brief §4 argues a saturated ring around a 600×400 textarea is visual noise and favors an inset indicator or a background/border tint (Atlassian). This def binds the same `focus.ring.offset-field` the substrate does, because that is the only field ring the engine emits. The alternative is a large-surface ring token, which is engine surface a def should not author unilaterally.',
      'Enter-key ownership — submit-on-Enter is an opt-in here, never the base default. The alternative (composers invert it by default) is what chat surfaces actually ship, and the brief rejects it for the base component because silently hijacking Enter breaks the platform expectation for every non-chat use.',
      'Soft vs hard maxLength — soft, always. The alternative is the native maxlength attribute, which is one line of code and silently truncates pasted overflow; the brief rejects it on AT grounds specifically, since input simply stops being accepted with no announcement.',
      'Distinct component vs a multiline prop on TextField — Polaris and Material 3 model this as `multiline={4}` on a universal field. The practice ships a distinct component (brief §1), and the reason is machinery rather than symmetry: auto-grow measurement, resize chrome, scroll management, line-break normalization and grapheme counting are non-overlapping with a single-line field and would tax every plain input in the app.',
    ],
    unverified: [
      'CSS `field-sizing: content` as the auto-grow mechanism — the brief calls it the biggest near-term implementation shift and prioritizes it behind an @supports query with the ghost-sizer JS polyfill as fallback. It also says explicitly not to treat its own version numbers (Chromium 123+, "Firefox following") as settled. NOT verified in this pass, which was authoring rather than research; verify before any implementation reads it as current.',
      'The Polaris unbounded-growth bug cited in brief §3 and §13 as the evidence for always setting maxRows — attributed to the external research pass, no `_source-text` backing in the vault. The RULE stands on its own reasoning; the citation is what is unverified.',
      'The error stroke belongs on the CONTAINER, not the input, so a Windows scrollbar docks inside the error boundary rather than breaking it (brief §4). The Figma anatomy strokes the `control` box that wraps the text, which is that reading; the code-side node split (a wrapper carrying the border around the native <textarea>) is not expressed by anything a gate reads.',
      'The reserved rows are the value text\'s `minHeight` (rows × its line height), written by the executor after the text is appended to the auto-layout control. That Figma accepts and keeps a `minHeight` on a TEXT child of an auto-layout frame, with `textAutoResize: HEIGHT`, is modelled offline (the shim and the read-back) and not yet confirmed on a live host. Symptom if it is not kept: a `minHeight -> DISCARDED` miss, and a one-line-tall control.',
      'With both the `message` and `character count` switches off, the message row is an auto-layout frame with no visible child, and the field relies on the host collapsing it to zero height (it has no padding of its own; the space above each part lives in that part\'s cell). Modeled offline, not yet confirmed on a live host. Symptom if it does not collapse: a sliver below the control.',
      'The resize grip is an ABSOLUTE child of the auto-layout control, placed at the control\'s built size and constrained `MAX`/`MAX`. That the host keeps it in the corner when the value text grows the control after paste (a designer typing more lines) is modeled offline, not yet confirmed on a live host. Symptom if it does not: a grip left at the old corner, inside the grown box.',
      'Brief §4 says `size` scales "typography and padding only", and this def binds padding but NO type token — because the substrate binds none either, so there is no type role for a field value to narrow. The padding half is expressed and the typography half is not, in both defs. Whether the field family should bind a type role is a substrate question, not a Textarea one — filed as #862 rather than decided here, because a child def is the wrong place to make the family\'s type call.',
      'rows / minRows / maxRows are in LINES and therefore resolve against the computed line-height, which brief §9 warns must be the RENDERED line box rather than an assumed Latin one (Arabic, Thai and Devanagari grow differently). No token expresses a line-height for this def to bind, so the constraint lives in prose only and nothing checks it.',
    ],
  },
};
