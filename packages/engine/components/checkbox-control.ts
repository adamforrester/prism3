/**
 * Checkbox.Control — the ATOMIC box (#901, #1226 step 2). The bare painted square with its check /
 * dash glyphs and its focus ring, extracted from `checkbox` so the labelled Row can NEST it rather
 * than redraw it. A fix to this box — its corner (#1015), its border weight (#1228), its fill grammar
 * (#1011) — now propagates to the Row, and later to the Group, by single-sourcing rather than by three
 * copies kept in step by hand.
 *
 * ── WHAT MOVED HERE, AND WHY THE ROW STILL EXISTS ──────────────────────────────────────────────────
 *
 * `checkbox` WAS the labelled Row with the atom inlined: `row → controlBox → control → {mark, dash,
 * focusRing}`. #1226's composition model (owner, 2026-09-02) splits that into two public components plus
 * this exposed atom. This def is the atom — `control` and everything beneath it, rooted at `control` —
 * and `checkbox` keeps its `id` and becomes the Row that nests one of these in-flow (`kind: 'nest'`).
 * The `controlBox` line-box wrapper and the row's top alignment (#1201) STAY on the Row: this atom knows
 * nothing about labels, first-line alignment or hit targets. It is a square that paints itself.
 *
 * ── THE NEST CHAIN IS FOUR DEEP: `focus-ring` ← `checkbox-control` ← `checkbox` ← `checkbox-group` ────
 *
 * The focus ring is already a standalone component nested by every discrete-ring host, so it comes with
 * the atom unchanged — it was a child of `control`, and `control` is this def's root. `checkbox-control`
 * nests it as an absolute sibling exactly as `checkbox` used to. `lint-nesting`'s acyclicity arm holds
 * the chain; nest-resolves confirms `checkbox-control` names a real def and the Row names this one.
 *
 * ── THE NOMINAL `target`, ON `focus-ring`'S PRECEDENT ─────────────────────────────────────────────
 *
 * The schema requires exactly one `role: 'target'` per anatomy, and this atom's only box is the control
 * square — so it carries `target` even though a bare control square is NOT independently the hit area.
 * The whole ROW is the hit target (SC 2.5.8), and that lives on `checkbox`'s `row`. The marker here is
 * nominal, exactly as `focus-ring`'s `ring` part documents its own: "`target` … because the schema
 * requires exactly one." Stated so a reader does not infer a clickable 16px square. Nothing downstream
 * reads `role` for paint since #933 (a box paints the slots it names in `paintSlots`), so `target` here
 * changes no color — it is the interaction marker alone.
 *
 * ── THE PAINT GRAMMAR AND THE `selection` EXEMPTION TRAVEL WITH THE ATOM ────────────────────────────
 *
 * The axis-led keys (`{selection}.{slot}.{state}`, `{selection}.{slot}`, `{slot}`) and every color
 * binding they resolve come here, because they describe the PAINTED box, which is here now. `selection`
 * is `lint-paint.ts` arm 1's declared `NON_FAMILY_AXES` exemption — the tier emits no `color.checked.*`
 * family — and this def is now the first consumer that exercises it, with `radio` and `switch` behind it.
 * The Row sheds the selection-led templates it no longer resolves anything through (its remaining paint
 * is the label ink), so its `paintKeys` are just `['{slot}']`.
 *
 * The grammar and the fill decisions are unchanged from the pre-split `checkbox` and their reasoning is
 * not restated here — see `checkbox.ts` history for `#1011` (no structural fill on an empty box, no
 * structural border on a filled one), `#1015` (the per-rung clamped corner) and `#1228` (the 2px control
 * border). This def is a verbatim extraction of that box, not a redesign of it.
 */
import { ComponentDef } from '../component-schema';

export const checkboxControl: ComponentDef = {
  id: 'checkbox-control',
  name: 'Checkbox.Control',
  aliases: ['checkbox-box', 'check-control', 'checkbox-atom'],
  category: 'form',
  status: 'draft',
  description:
    'The atomic checkbox control — the painted square with its check or dash glyph and its focus ring, and nothing else. Nested by the labelled Checkbox row rather than placed on its own: it carries no label, no description and no hit-target padding, so a standalone use needs an external aria-label. Carries the three-value selection axis (unchecked / checked / indeterminate) whose mark is a real part gated on the coordinate, the per-rung clamped corner, and the 2px control border.',

  // The atom's surface, not the field's. It has no `label`, no `description`, no form wiring — those
  // are the Row's and the Group's. What it exposes is the visual state a host drives through the nest.
  props: [
    { name: 'checked', type: 'boolean', required: false, description: 'The filled/checked appearance. Driven by the host row from the group\'s value array — a bare Checkbox.Control is styled by the coordinate, not wired to state here.' },
    { name: 'indeterminate', type: 'boolean', default: false, required: false, description: 'The mixed appearance — the dash glyph. PRESENTATIONAL, for parent/child select-all hierarchy, never a third value a user clicks to; the host carries `aria-checked="mixed"`.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Scales the control square (both axes from one key, square by construction), its corner and its glyph. The host row passes its own size through by `follow`, so the nested control tracks the row.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'The disabled skin — a contrast-exempt fill/border/glyph treatment. Set on the host, followed here.' },
    { name: 'aria-label', type: 'string', required: false, description: 'Required only for a genuinely standalone control with no host row to name it — the Row provides the accessible name through the label, so a nested control must NOT double-label.' },
  ],

  // The six that paint. `read-only` is a field-level concern (the Row/Group decide it, and the brief
  // recommends static text over a styled locked control), so the atom carries no read-only treatment and
  // does not list the state — there is nothing here for it to be.
  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'error'],

  // `size` and `selection` — the two the box actually varies by. No tone/emphasis (a checkbox is
  // neutral), no surface/inverse axis (a control does not ask which ground it stands on, #871).
  variants: {
    size: ['small', 'medium', 'large'],
    selection: ['unchecked', 'checked', 'indeterminate'],
  },

  // Axis-led, most specific first — the grammar `checkbox` established and `radio`/`switch` inherit.
  // `selection` leads; the bare `{slot}` answers the bindings that do not vary by selection and the ones
  // outside the grammar (`focus-ring`, `disabled.*`, geometry). `lint-paint.ts` arm 1 exempts `selection`
  // in `NON_FAMILY_AXES`; this def is now the first consumer that exercises that exemption.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}'],

  tokens: {
    // ── THE UNCHECKED BOX — the form-field substrate's chrome; an empty checkbox is a small empty
    // field. No fill (#1011): an empty checkbox is a BORDER on the page, not a filled square. `pressed`
    // is unbound (the field border ladder emits rest/hover only), falling through to the rest border.
    'unchecked.border': 'color.field.border.rest',
    'unchecked.border.hover': 'color.field.border.hover',
    'unchecked.border.error': 'color.border.danger',

    // ── THE CHECKED BOX — a filled control off the primary interactive family. No structural border
    // (#1011): a primary fill clears SC 1.4.11 against the page everywhere, so the fill IS the boundary
    // and a same-family border can only agree invisibly or disagree visibly. `border.error` stays — a
    // cross-family danger edge is signalling, not bounding.
    'checked.fill': 'color.interactive.primary.fill.selected',
    'checked.fill.hover': 'color.interactive.primary.fill.hover',
    'checked.fill.pressed': 'color.interactive.primary.fill.pressed',
    'checked.border.error': 'color.border.danger',
    'checked.icon': 'color.interactive.primary.on-fill',

    // ── THE INDETERMINATE BOX — identical to checked at every coordinate; only the GLYPH differs (dash,
    // not check). Bound explicitly rather than folded into a fallback, so an indeterminate coordinate
    // never falls through to the unbound bare `{slot}` and draws a dash on a box with no fill.
    'indeterminate.fill': 'color.interactive.primary.fill.selected',
    'indeterminate.fill.hover': 'color.interactive.primary.fill.hover',
    'indeterminate.fill.pressed': 'color.interactive.primary.fill.pressed',
    'indeterminate.border.error': 'color.border.danger',
    'indeterminate.icon': 'color.interactive.primary.on-fill',

    // ── FOCUS RING — the CONTROL ring (offset 2), not the field's flush ring. Bound, not authored: the
    // ring is a separate def reached through the `focusRing` part's `nests`.
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // ── DISABLED SKIN (contrast-exempt). `restKey` in the projector decides which half reaches a given
    // coordinate: a disabled unchecked box takes only `disabled.border` (no rest fill), a disabled
    // checked box only `disabled.fill` (no rest border). The glyph takes the on-fill ink.
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.icon.on-fill': 'color.disabled.on-fill',

    // ── GEOMETRY. The corner is PER-RUNG and CLAMPED TO THE BOX (#1015): `control.size.<rung>.radius`
    // = min(radius.sm, snap2(edge ÷ 8)), evaluated per rung so the corner keeps the same proportion as
    // the box shrinks. This is what still distinguishes the checkbox from `radio`'s round disc.
    'size.small.radius': 'control.size.sm.radius',
    'size.medium.radius': 'control.size.md.radius',
    'size.large.radius': 'control.size.lg.radius',

    // ── THE BORDER'S THICKNESS (#1228). Prism 2 ships this box at strokeWeight 2 / strokeAlign INSIDE;
    // `border-width.thick` is 2px in all four corpus brands. A flat 2px is a CONTROL figure (the outline
    // buttons stay at 1px, `border-width.hairline`) rather than a house style, and the plugin suite
    // asserts the button half so a "every border gets 2px" sweep fails by name.
    'border-width': 'border-width.thick',

    // ── THE CONTROL SQUARE (#951/#910). ONE key on BOTH axes, so the control is square by construction.
    // `control.size.*.height` and NOT `icon.size.*`: the control ladder shifts a whole rung with brand
    // density (12/16/20 on aurora) where the glyph grid is fixed 16/20/24 in every brand.
    'size.small.control': 'control.size.sm.height',
    'size.medium.control': 'control.size.md.height',
    'size.large.control': 'control.size.lg.height',
  },

  // ── ANATOMY ────────────────────────────────────────────────────────────────────────────────────
  //
  // The atom is one painted box and its glyphs, rooted at `control`. The mark and the dash are two
  // `vector` parts gated by `presentWhen` on the selection coordinate (`unchecked` draws neither); the
  // focus ring is an absolute sibling nesting the shared `focus-ring` component, unchanged from before
  // the split. See the header for why `control` carries a NOMINAL `role: 'target'`.
  anatomy: {
    root: 'control',
    parts: {
      // THE PAINTED SURFACE and the nominal target (see header). FIXED on both axes because `size` binds
      // one variable to width and height, and a hugging box would collapse around a glyph instead.
      control: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill', 'border'],
        size: 'size.{size}.control',
        radius: 'size.{size}.radius',
        // 2px, from the token — see `border-width` in `tokens`. Names the def's own key, not the token.
        strokeWidth: 'border-width',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['mark', 'dash', 'focusRing'],
        note: 'The control square AND the nominal hit-target marker. The real hit target is the whole labelled ROW, which lives on `checkbox`; this square is not independently clickable. `role: target` is here only because the schema requires exactly one per anatomy — the same nominal marker `focus-ring`\'s `ring` part carries.',
      },
      // THE CHECK. Sized from the CONTROL'S OWN key rather than a mark ladder of its own: the optical
      // inset is already in the artboard (`check` draws ~71% of a full grid), so a second ladder would
      // inset it twice.
      mark: {
        kind: 'vector',
        glyph: 'check',
        size: 'size.{size}.control',
        presentWhen: { selection: ['checked'] },
        note: 'The check. Its ink is `checked.icon` (`descendantFills`, never a fill on the artboard — #864), and its micro-motion has no expression in this schema (see `codeOnly`).',
      },
      // THE DASH. Same geometry, same reason; only the outline differs, which is the whole of what
      // separates `indeterminate` from `checked` in this def's tokens.
      dash: {
        kind: 'vector',
        glyph: 'minus',
        size: 'size.{size}.control',
        presentWhen: { selection: ['indeterminate'] },
        note: 'The mixed-state dash. Never the sole signal — `aria-checked="mixed"` carries it to assistive tech, which the host row sets.',
      },
      // The focus ring, verbatim from the pre-split checkbox: on the control, offset 2 (`focus.ring.offset`,
      // not the field\'s flush 0), the offsets summing to site the ring at -(2+2) = -4 (#801).
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        // FIXED at `surface=default` (#1134): this def has no `surface` axis of its own, so there is no
        // host coordinate to pass through. A `follow` here would be rejected — it names a host axis and
        // this def declares none.
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring` component, inset from the control so the ring surrounds the square.',
      },
    },
    codeOnly: [
      // MUST LEAD with the term — `figmaPropertyErrors` matches an admission by its first word (#563).
      'read-only — deliberately not a state of this atom. It is the field/row-level concern the brief calls "the awkward one" (static text over a styled locked control), so there is no box treatment to project and the state is absent rather than admitted-and-unbound. The Row and the Group decide it.',
      'The check-glyph draw animation (brief §8: a stroke-dasharray draw at roughly 100-150ms, morphing dash to check, bypassed under prefers-reduced-motion). Neither the def schema nor a Figma variant carries motion, so the two glyph parts are static outlines at every coordinate.',
      'The whole-row hit target. A bare control square is a 12-24px box that fails SC 2.5.8 in isolation; the accessible target is the labelled ROW, which is `checkbox` and not this atom. This def is nested, never placed alone, precisely so the target is supplied one level up.',
    ],
  },

  figmaProperties: {
    // BOTH axes; `selection` is not optional — `presentWhen` gates the two glyph parts on it, so an
    // unprojected `selection` would make the mark absent from every member. 3 selections × 3 sizes × 6
    // states = 54 members.
    variantAxes: ['selection', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'error'] },
    // No `texts` (no text part), no `swaps` (the mark is geometry this def owns), no `slotAxes` (both
    // glyph parts are gated by a coordinate, which is what `presentWhen` draws).
    booleans: {},
  },

  accessibility: {
    role: 'The visual control only — the accessible checkbox role, name and aria-checked (true/false/mixed) belong to the host input the Row wires. A standalone use must supply role and name itself.',
    wcag: [
      '1.4.11 Non-text Contrast (the control boundary — border on the empty box, self-bounding fill on the filled one)',
      '2.4.13 Focus Appearance (the nested focus ring, offset, at least 3:1 against the adjacent surface and the control edge)',
      '4.1.2 Name Role Value (carried by the host; this atom is presentational when nested)',
    ],
    keyboard: 'None of its own — the atom is not a tab stop. Focus, Space-to-toggle and the tab order belong to the host input; the ring here renders the host\'s `:focus-visible` state.',
    focus: 'The nested focus ring surrounds the square on `:focus-visible`, offset so an unbroken sliver of background separates the ring from the control\'s own border (WCAG 1.4.11). Keyboard traversal only, never mouse or touch.',
    aria: 'When nested in a host row, the host provides the accessible name through `aria-labelledby` — never double-label. Relying on the visual dash glyph alone to convey indeterminate is a failure; `aria-checked="mixed"` carries it, and the host sets it.',
  },

  content: {
    labelPattern: 'None — the atom carries no label. The consent line and its rules live on the Checkbox row (`checkbox`).',
    errorPattern: 'None of its own — an error boundary is a color treatment the host coordinate selects; the message is the Group\'s (`checkbox-group`).',
  },

  docs: {
    usage: 'Do not place this on its own. It is the box a Checkbox row nests, so a fix to its corner, its border weight or its fill grammar reaches the row and the group without being copied. Build it before the row that nests it (the nest resolves by name against the live file). A standalone use is only for a control with an external label and its own aria wiring — the ~10% case the labelled Checkbox does not cover.',
    do: [
      'Nest this from the Checkbox row rather than redrawing the box per host',
      'Let the host row pass `selection`, `size` and `state` through by `follow`, so the nested control tracks the row',
      'Supply an external aria-label only when using the control genuinely alone, with no labelled row to name it',
    ],
    dont: [
      'Place a bare control square as the clickable element — it fails SC 2.5.8 in isolation; the labelled row is the hit target',
      'Double-label a nested control — the host row already provides the accessible name',
      'Reach for this atom when you want the ~90% labelled case — that is the Checkbox row',
    ],
    contentGuidelines: 'The atom has no copy of its own; all label, description and error text belongs to the row and the group that compose it.',
  },

  ai: {
    primaryPurpose: 'Render the atomic checkbox control — the painted square with its check or dash glyph and focus ring — for a host row to nest.',
    whenToUse: 'Nested by the labelled Checkbox row (the common case), or standalone only for a control with an external label and its own aria wiring.',
    avoidWhen: 'You want the labelled ~90% case (that is Checkbox), a mutually-exclusive one-of-many (Radio.Control), or an immediate-effect toggle (Switch). Never place a bare control square as the clickable element — the hit target is the labelled row.',
    commonPartners: ['checkbox', 'focus-ring', 'checkbox-group'],
    triggerKeywords: ['checkbox control', 'checkbox box', 'check box atom', 'checkbox square'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: ['radio-control', 'switch'],
    supersedes: [
      'the painted control inlined in a checkbox row',
    ],
    supersededBy: [],
  },

  notes: {
    contested: [
      'THE ATOM IS A SEPARATE COMPONENT rather than kept inline in the row. Settled by #1226\'s composition model (owner): a shared piece is single-sourced so a fix propagates to every host that nests it. The rejected alternative — keeping the control inline and copying it into radio and switch — is exactly the per-def duplication #1011 found had shipped the identical fill/border pairing across three defs. The nest costs one indirection; the copy costs three chances to drift.',
      'THE NOMINAL `role: target`. A bare control square is not independently the hit target — SC 2.5.8 wants the whole labelled row — so `target` here is the interaction marker the schema requires exactly one of, not a claim the square is clickable. The same nominal marker `focus-ring`\'s `ring` part carries, and stated so a reader does not infer a 12-24px clickable square.',
    ],
    unverified: [
      'NESTED-INSTANCE SIZING IS UNVERIFIED ON A REAL HOST. No def used `kind: nest` in flow before #1226 step 2, so an in-flow nested control has never been built in Figma. The control instance must HUG (sit at its own square) rather than FILL the row\'s line-box wrapper — it binds `size` on the nest part so its own square is pinned, and the wrapper centres it — but whether the instance\'s inherited sizing mode cooperates with the row\'s auto-layout is a real-host question the offline shim cannot answer. The symptom to look for: a control instance stretched to the line-box height instead of centred within it.',
      'THE INHERITED FOCUS-RING BINDING, now two layers deep (#1280). The ring binds a nominal square side and an instance inherits its main component\'s bindings; #1280 left it open whether that nominal side survives `resize()` when inherited through an instance. After this split the ring is nested inside the control and the control inside the row, so an inherited dimension binding would have to be cleared twice. Batches with #1290. The symptom: a nested ring sitting at the md control height instead of hugging its host\'s box.',
      'RADIO AND SWITCH ARE NOT SPLIT HERE. This is checkbox step 2 only; `radio-control` is the mirror (one `dot` box, no dash) and is filed as the next in the sequence. `switch` stays out of scope — its thumb moves between selection values, an unsolved positioning wall that splitting would inherit without addressing.',
    ],
  },
};
