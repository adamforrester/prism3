/**
 * Checkbox.Control — the ATOMIC box (#901, #1226 step 2). The bare painted square with its check /
 * dash glyphs and its focus ring, extracted from `checkbox` so the labeled Row can NEST it rather
 * than redraw it. A fix to this box — its corner (#1015), its border weight (#1228), its fill grammar
 * (#1011) — now propagates to the Row, and later to the Group, by single-sourcing rather than by three
 * copies kept in step by hand.
 *
 * KB brief: `components/checkbox.md` — the exposed atomic primitive of the brief's decomposition (§2).
 *
 * ── WHAT MOVED HERE, AND WHY THE ROW STILL EXISTS ──────────────────────────────────────────────────
 *
 * `checkbox` WAS the labeled Row with the atom inlined: `row → controlBox → control → {mark, dash,
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
 * not restated here — see `checkbox-row.ts` / `checkbox-control.ts` history for `#1011` (no structural fill on an empty box, no
 * structural border on a filled one), `#1015` (the per-rung clamped corner) and `#1228` (the 2px control
 * border). This def is a verbatim extraction of that box, not a redesign of it.
 *
 * ── THE INNER-GLYPH INSET (#1346): 0.80 OF THE BOX, MEASURED FROM PRISM 2 ───────────────────────────
 *
 * QA read the check/dash as slightly too large. Before this change the `mark`/`dash` frames bound
 * `size.{size}.control` (the FULL box) and drew the artwork's own ~71% grid inset — so the check ink
 * spanned 70.7% of the box width. Prism 2's checkbox sizes it smaller: `reference/Prism2/component-
 * specs/checkboxes.json` pins `checkFill` (and `subtractFill`) at 16×16, and its control SQUARE is 20×20
 * — derived from the focus frame, which is 28×28 at offset −4, so box = 28 − 2×4 = 20 (the ring frame is
 * the 28, the box is the 20). Cross-checked: Prism 2's `cornerRadius` 2 on a 20px box is the engine's own
 * `edge ÷ 8` control corner, which only lands on 20. So Prism 2's mark-to-box ratio is 16/20 = **0.80**.
 *
 * THE NET BINDING, reconciled against the artwork inset both systems share. Prism 2's `checkFill` and the
 * engine's `check` are the same Remix-lineage glyph, so both carry the ~71% grid inset INSIDE the mark
 * frame; that inset is common and cancels. What differs is the FRAME: Prism 2's is 0.80 of the box, the
 * engine's was 1.0. Applying the raw 0.80 as a second inset on top of the ~71% would inset the ink twice
 * (→ ~57% × 0.80 again); the correct move is to bring the FRAME to 0.80, leaving the artwork inset alone.
 * Rendered check ink then goes 70.7% → 0.80 × 70.7% = **56.6%** of box width, and the dash 58.3% → 46.6%,
 * which is Prism 2's proportion. NOT an arbitrary nudge — the 0.80 is Prism 2's measured mark ratio.
 *
 * WHY AN INSET INSTANCE (`glyphScale: 0.8`) AND NOT A SMALLER BOUND SIZE. Binding a smaller size needs the
 * mark to bind a variable worth 0.80 × box at every rung and density — and the only sub-box control token,
 * `control.size.*.dot`, is 0.5 (the radio dot). A new `control.size.*.mark` token would track correctly
 * but is a GUARANTEED name (every corpus brand emits `control.size.*`, so it is in the contract's 577),
 * which forces a CONTRACT MINOR bump — the exact class #910's `dot` and #997's `inset` each bumped for.
 * Instead the mark is a frame bound to the box, and the check inside it is an instance of `icon/check`
 * (#2380) placed at 0.8 of that frame, centered, with SCALE constraints so it follows the box when the brand
 * or a mode resizes it. Before #2380 the same 0.8 was a padded glyph artboard (`grid ÷ 0.8`); the ink lands
 * in the same place. A def-local literal, not a token: CONTRACT holds (`token-contract.ts --check`).
 * Switch's own thumb glyph keeps its full-frame inset — Prism 2 sizes that differently (16/24 in the
 * handle), and this is checkbox's calibration alone (#1346), not a corpus-wide re-inset.
 */
import { ComponentDef } from '../component-schema';

export const checkboxControl: ComponentDef = {
  id: 'checkbox-control',
  name: 'Checkbox.Control',
  aliases: ['checkbox-box', 'check-control', 'checkbox-atom'],
  category: 'form',
  status: 'draft',
  summary: 'Checkbox box with check/dash glyph and focus ring. Nested by Checkbox.Row; no label.',
  description:
    'The atomic checkbox control — the painted square with its check or dash glyph and its focus ring, and nothing else. Nested by the labeled Checkbox.Row rather than placed on its own: it carries no label, no description and no hit-target padding, so a standalone use needs an external aria-label. Carries the three-value selection axis (unchecked / checked / indeterminate) whose mark is a real part gated on the coordinate, the per-rung clamped corner, and the 2px control border.',

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
  // WHEN each axis changes (#1611): runtime axes are held to one footprint, authoring axes are not.
  // `selection` is the live toggle — a checked box must measure what an unchecked one does.
  axisKinds: { size: 'authoring', selection: 'runtime' },

  // Axis-led, most specific first — the grammar `checkbox` established and `radio`/`switch` inherit.
  // `selection` leads; the bare `{slot}` answers the bindings that do not vary by selection and the ones
  // outside the grammar (`focus-ring`, `disabled.*`, geometry). `lint-paint.ts` arm 1 exempts `selection`
  // in `NON_FAMILY_AXES`; this def is now the first consumer that exercises that exemption.
  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}', '{slot}'],

  tokens: {
    // ── THE UNCHECKED BOX — the form-field substrate's chrome; an empty checkbox is a small empty
    // field. No fill (#1011): an empty checkbox is a BORDER on the page, not a filled square. `pressed`
    // is unbound (the field border ladder emits rest/hover only), falling through to the rest border.
    //
    // THE PRESSED BORDER REUSES REST, BY DECISION (#1346, owner 2026-09-13) — not by omission. There is
    // no `color.field.border.pressed` role in the tier (the field border ladder emits `rest`/`hover`
    // only), so the pressed unchecked box takes `unchecked.border` (rest). The owner declined to mint a
    // `field/border/pressed` role, consistent with #1342's no-new-`field/fill/hover` call: the field
    // family stays lean, `pressed` is transient, and the check-fill already signals activation (a press
    // that commits flips the box to `checked`, whose own `.pressed` fill IS bound). So the binding here
    // is deliberate and correct — a reader must not "fix" it by adding a pressed border token.
    'unchecked.border': 'color.field.border.rest',
    'unchecked.border.hover': 'color.field.border.hover',
    'unchecked.border.error': 'color.border.danger',

    // ── THE CHECKED BOX — a filled control off the primary interactive family. No structural border
    // (#1011): a primary fill clears SC 1.4.11 against the page everywhere, so the fill IS the boundary
    // and a same-family border can only agree invisibly or disagree visibly. `border.error` stays — a
    // cross-family danger edge is signaling, not bounding.
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
    // density (12/16/20 at compact density) where the glyph grid is fixed 16/20/24 in every brand.
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
        note: 'The control square AND the nominal hit-target marker. The real hit target is the whole labeled ROW, which lives on `checkbox-row`; this square is not independently clickable. `role: target` is here only because the schema requires exactly one per anatomy — the same nominal marker `focus-ring`\'s `ring` part carries.',
      },
      // THE CHECK. The FRAME is bound to the control box (`size.{size}.control`), and `glyphScale: 0.8`
      // (#1346) places the `icon/check` instance inside it at 0.8 of the box (#2380), so the ~71% of the grid
      // the `check` artwork draws renders at 0.8 of that, matching Prism 2's `checkFill` (16) sitting at 0.80
      // of its 20px control square (see the header for the measurement and why no smaller size is bound).
      mark: {
        kind: 'vector',
        glyph: 'check',
        size: 'size.{size}.control',
        glyphScale: 0.8,
        presentWhen: { selection: ['checked'] },
        note: 'The check, an instance of the check icon inset to 0.8 of the box (#1346). Its ink is `checked.icon`, applied to the outline inside the instance. Its draw transition is stated in `motion`; the Figma members are static.',
      },
      // THE DASH. Same geometry and the same `glyphScale: 0.8` inset (an `icon/minus` instance); only the icon differs, which is
      // the whole of what separates `indeterminate` from `checked` in this def's tokens. Prism 2 sizes
      // its `subtractFill` identically to `checkFill` (both 16 in the 20px box), so the dash takes the
      // same 0.80 ratio as the check.
      dash: {
        kind: 'vector',
        glyph: 'minus',
        size: 'size.{size}.control',
        glyphScale: 0.8,
        presentWhen: { selection: ['indeterminate'] },
        note: 'The mixed-state dash, an instance of the minus icon inset to 0.8 of the box (#1346), the same as the check. Never the sole signal — `aria-checked="mixed"` carries it to assistive tech, which the host row sets.',
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
      'motion — the check-glyph draw animation (brief §8: a stroke-dasharray draw at roughly 100-150ms, morphing dash to check, bypassed under prefers-reduced-motion). The def states it in `motion`; a Figma variant carries no motion, so the two glyph parts are static outlines at every coordinate.',
      'RTL — the check and dash glyphs do NOT mirror: the check shape is recognized as drawn in every script, so the SVG keeps its standard stroke direction (brief §9). The row around this atom mirrors; the atom does not. Figma members are drawn left to right; for this atom that is also the right-to-left rendering.',
      'The whole-row hit target. A bare control square is a 12-24px box that fails SC 2.5.8 in isolation; the accessible target is the labeled ROW, which is `checkbox-row` and not this atom. This def is nested, never placed alone, precisely so the target is supplied one level up.',
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
    labelPattern: 'None — the atom carries no label. The consent line and its rules live on Checkbox.Row (`checkbox-row`).',
    errorPattern: 'None of its own — an error boundary is a color treatment the host coordinate selects; the message is Checkbox.Group\'s (`checkbox-group`).',
  },

  docs: {
    usage: 'Do not place this on its own as a form control. It is the box Checkbox.Row nests, so a fix to its corner, its border weight or its fill grammar reaches the row and the group without being copied. Build it before the row that nests it (the nest resolves by name against the live file). It is also the unit a host nests when the label is decoupled — a select-all in a table\'s first column, a card-select where the card is the accessible name, a list or menu row. Nested that way, the host names the control through aria-labelledby, the host owns the hit target (the whole row toggles, unless the row has its own primary action — then the control is a secondary affordance with its own name, such as "Select <item>"), and the enclosing collection is the group: it owns the selected ids and select-all, so no Checkbox.Group goes inside a list. Resolve every nested case to one model — the whole row is one control, or the control is a named secondary affordance — never a control inside a row that is itself a button or link with no clear click target.',
    do: [
      'Nest this from Checkbox.Row rather than redrawing the box per host',
      'Let the host row expose `selection` and `state` and `follow` its size, so the nested control tracks the row',
      'Supply an external aria-label only when using the control genuinely alone, with no labeled row to name it',
      'Nest it in a table cell, card or list row when the label is decoupled — the host row supplies the name and the collection owns the selection',
    ],
    dont: [
      'Place a bare control square as the clickable element — it fails SC 2.5.8 in isolation; the labeled row is the hit target',
      'Double-label a nested control — the host row already provides the accessible name',
      'Reach for this atom when you want the labeled case — that is Checkbox.Row',
      'Nest a Checkbox.Group inside a selectable list — the collection is the group',
      'Put the control inside a row that is itself a button or link with no clear model of which one a click hits',
    ],
    contentGuidelines: 'The atom has no copy of its own; all label, description and error text belongs to the row and the group that compose it.',
  },

  ai: {
    primaryPurpose: 'Render the atomic checkbox control — the painted square with its check or dash glyph and focus ring — for a host row to nest.',
    whenToUse: 'Nested by the labeled Checkbox.Row (the common case), or by a host whose label is decoupled — a table select-all, a card-select, a selectable list row — where the host names the control and the collection owns the selection. Standalone only with an external label and its own aria wiring.',
    avoidWhen: 'You want the labeled case (that is Checkbox.Row), a mutually-exclusive one-of-many (Radio.Control), or an immediate-effect toggle (Switch.Control). Never place a bare control square as the clickable element — the hit target is the labeled row.',
    commonPartners: ['checkbox-row', 'focus-ring', 'checkbox-group'],
    triggerKeywords: ['checkbox control', 'checkbox box', 'check box atom', 'checkbox square'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: ['radio-control', 'switch-control'],
    replacesPatterns: [
      'the painted control inlined in a checkbox row',
    ],
    supersededBy: [],
  },

  // Brief §8 — the check-draw is this atom's, because the glyph is here.
  motion: {
    enter: 'On check, the check glyph draws in as a pen stroke (SVG stroke-dashoffset) while the fill crossfades in, about 100-150ms, eased. Indeterminate to checked morphs the dash into the check.',
    exit: 'On uncheck, the same glyph transition runs back and the fill crossfades out.',
    reduceMotion: 'Under prefers-reduced-motion, the draw and any spatial animation are bypassed and the box flips instantly; a crossfade under 150ms may remain, since opacity does not trigger vestibular symptoms. No layout motion.',
  },

  notes: {
    contested: [
      'THE NOMINAL `role: target`. A bare control square is not independently the hit target — SC 2.5.8 wants the whole labeled row — so `target` here is the interaction marker the schema requires exactly one of, not a claim the square is clickable. The same nominal marker `focus-ring`\'s `ring` part carries, and stated so a reader does not infer a 12-24px clickable square.',
    ],
    unverified: [
      'NESTED-INSTANCE SIZING IS UNMEASURED ON A REAL HOST. No def used `kind: nest` in flow before #1226 step 2. The row has since been built in Figma (the owner\'s plugin-import QA rounds), but no recorded read-back measures the nested instance\'s sizing there. The control instance must HUG (sit at its own square) rather than FILL the row\'s line-box wrapper — it binds `size` on the nest part so its own square is pinned, and the wrapper centers it — but whether the instance\'s inherited sizing mode cooperates with the row\'s auto-layout is a real-host question the offline shim cannot answer. The symptom to look for: a control instance stretched to the line-box height instead of centered within it.',
      'THE INHERITED FOCUS-RING BINDING, now two layers deep (#1280). The ring binds a nominal square side and an instance inherits its main component\'s bindings; #1280 left it open whether that nominal side survives `resize()` when inherited through an instance. After this split the ring is nested inside the control and the control inside the row, so an inherited dimension binding would have to be cleared twice. Batches with #1290. The symptom: a nested ring sitting at the md control height instead of hugging its host\'s box.',
      'THE INSET ICON IS UNVERIFIED ON A REAL HOST (#2380, #1346). The check and the dash are `icon/check` and `icon/minus` instances placed at 0.8 of a frame bound to the box, with SCALE constraints. The offline model asserts the placement and the read-back measures it against the parent box; what it cannot see is whether Figma applies the SCALE constraints when a variable binding (a brand or a mode) resizes the frame, so the icon keeps 0.8 of the new box. Before #2380 the open question was a padded, negative-origin glyph artboard, which no longer exists.',
    ],
    evolution: [
      // Moved from `contested` (#1700): decided by #1226, so it is evolution.
      'THE ATOM IS A SEPARATE COMPONENT rather than kept inline in the row. Settled by #1226\'s composition model (owner): a shared piece is single-sourced so a fix propagates to every host that nests it. The rejected alternative — keeping the control inline and copying it into radio and switch — is exactly the per-def duplication #1011 found had shipped the identical fill/border pairing across three defs. The nest costs one indirection; the copy costs three chances to drift.',
      'RADIO AND SWITCH SPLIT AFTER THIS ONE. This entry used to say they were not split here: this was checkbox step 2 only, with the radio atom filed next and switch out of scope over its moving thumb. Both followed — `radio-control` (#1348, one `dot` box, no dash) and `switch-control` (#1354).',
      'Styling the native input won (brief §13): `appearance: none` plus a pseudo-element or SVG replaced both the `role=checkbox` div and the hidden-input-plus-fake-box hacks, keeping native semantics. That is the input this atom paints.',
      'The `indeterminate` ref callback superseded `useLayoutEffect` for performance in large lists (brief §13) — the mixed state is a DOM property the host sets, which is why this atom only draws the dash.',
    ],
  },
};
