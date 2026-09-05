/**
 * Button — re-authored v1 from the KB brief (knowledge-base/components/button.md §15),
 * the catalogue's calibration component. v0 was seeded from the schema shape only and
 * re-litigated settled decisions; this is faithful to the practice's resolved model.
 *
 * ── #1223: INTENT IS THE COMPONENT, NOT AN AXIS ────────────────────────────────────────────────
 * The three semantic intents are now three COMPONENTS — `Button` (primary/brand), `Destructive Button`,
 * `Neutral Button` — built by the `makeButton` factory below from one shared anatomy. Intent used to be
 * a variant axis crossing appearance × size × surface × state (one 1296-member set); splitting it gives
 * three 432-member sets whose only difference is the `interactive.<family>` color binding. Emphasis is
 * STILL the appearance axis within each component (filled > outline > text), so a three-action form is
 * three buttons of one component at three appearances. Accent is not a fourth component — a brand adds a
 * secondary palette and duplicates+rebinds the primary set in Figma (see the export block at the foot).
 *
 * The practice's resolved decisions carried in here:
 *  - appearance {filled, outline, text} × size × surface — NOT a single overloaded `variant` enum
 *    (brief §3; reconciled to the interactive vocabulary per docs/20 / KB button.md §3).
 *  - Primary is the brand/default button (`id: 'button'`). The old `intent` prop defaulted to primary
 *    (REVERSED 2026-08-07 from `neutral`) on the rule "one FILLED per view, so the loud button is the
 *    deliberate choice" — the rule survives the split unchanged, now expressed as one FILLED appearance
 *    per view within whichever component the semantic calls for.
 *  - The state TRIO: isPending (focusable aria-disabled, delayed spinner, width-preserved,
 *    busy-announced), isInactive (focusable disabled — relevant-but-unsatisfied), isDisabled
 *    (native, RESERVED for controls irrelevant to the view) (§4, §13).
 *  - leadingVisual / trailingVisual (not *Icon — the slot holds avatars/counters/spinners) (§2).
 *  - type='button' default (neutralize the platform submit trap) (§3, §11).
 *  - Icon-ONLY is a distinct component (icon-button) so the accessible name is required at
 *    the type level (§6, §10).
 *
 * Bound to the interactive color system (docs/20): each component binds `interactive.<family>.*`
 * (primary / neutral / destructive) with cross-cutting `disabled.*`. This CLOSES the v1 HIGH finding —
 * neutral (was the stateless `foreground.secondary`) carries hover/pressed/on-fill like every family, so
 * the Neutral Button is not hover-less. outline/text hover uses the overlay wash (assumes
 * `outlineInteraction: overlay-neutral`, the default). `ghost` is retired — a quiet button is the
 * Neutral Button at `appearance=text`. (`type.label.lg` gap still stands.)
 */
import { ComponentDef } from '../component-schema';

type IntentFamily = 'primary' | 'neutral' | 'destructive';

/**
 * The per-family PAINT (docs/20), authored ONCE and called per component — #1223 split the three
 * semantic intents into three components (Button / Destructive Button / Neutral Button), and this map
 * is the ONLY thing that differs between them. Every def `makeButton` produces is byte-identical but for
 * the `color.interactive.<family>.*` bindings returned here; `test.ts` asserts exactly that (the
 * factory's safety net), so a binding edited on one component and not the others fails BY NAME rather
 * than shipping three buttons that have quietly diverged (docs/34).
 *
 * The keys drop the intent segment the grammar used to lead with. With intent FIXED per component it is
 * no longer a coordinate, so `paintKeys` is `{appearance}.{slot}.{state}` / `{appearance}.{slot}` and
 * these keys match it — the bare key is the REST value, the `.hover`/`.pressed` forms the stated states.
 * `disabled.*` is cross-cutting (intent-independent, docs/20 §7) and lives in the shared token block, not
 * here — its identity across all three components is the whole reason the split loses no coverage.
 */
const intentTokens = (family: IntentFamily): Record<string, string> => ({
  // filled — interactive fill + on-fill ink
  'filled.fill': `color.interactive.${family}.fill.rest`,
  'filled.fill.hover': `color.interactive.${family}.fill.hover`,
  'filled.fill.pressed': `color.interactive.${family}.fill.pressed`,
  'filled.label': `color.interactive.${family}.on-fill`,
  'filled.icon': `color.interactive.${family}.on-fill`,
  // outline — the EDGE carries state (#576), so all three rather than letting hover/pressed fall to rest
  'outline.border': `color.interactive.${family}.border.rest`,
  'outline.border.hover': `color.interactive.${family}.border.hover`,
  'outline.border.pressed': `color.interactive.${family}.border.pressed`,
  // THE INK CARRIES STATE TOO (#1282), and this is the half #576 left behind. That change made the
  // outline EDGE stateful and bound all three of its steps above; the label and icon stayed pinned to
  // `.rest`, so an outline button's border moved on hover and pressed while the text it surrounds did
  // not. The roles were already there — `iText` has emitted `text.{rest,hover,pressed}` since #576,
  // and `iBorder` consumes those very candidates, so the border was tracking an ink the component
  // then declined to bind. Nothing was missing from the token tier; three keys were missing here.
  //
  // Same rung delta as the border by construction rather than by agreement: both resolve
  // `color.interactive.<family>.{text,border}.<state>`, and `border` IS `text` passed by value
  // (`iBorder`). So "the edge matches its label" now holds at every state, which is what #576 said it
  // was for and could only deliver at rest.
  'outline.label': `color.interactive.${family}.text.rest`,
  'outline.label.hover': `color.interactive.${family}.text.hover`,
  'outline.label.pressed': `color.interactive.${family}.text.pressed`,
  'outline.icon': `color.interactive.${family}.text.rest`,
  'outline.icon.hover': `color.interactive.${family}.text.hover`,
  'outline.icon.pressed': `color.interactive.${family}.text.pressed`,
  'outline.overlay.hover': `color.interactive.${family}.overlay.hover`,
  'outline.overlay.pressed': `color.interactive.${family}.overlay.pressed`,
  // text — ink only; hover/pressed are the translucent overlay wash (#536 item 1: both states keyed, or
  // a pressed ghost button falls back to rest and projects byte-identical to it).
  //
  // DELIBERATELY NOT given the per-state ink #1282 gave `outline`, and the reason is the one #1282
  // argues from: there the ink had to track a BORDER that was already moving without it. This
  // appearance draws no border, so there is nothing for the ink to fall out of step WITH — its state
  // is the overlay wash, which is a different mechanism and already keyed at both states. Whether a
  // ghost button should ALSO deepen its ink is a live question and a separate one; it is not this
  // change, which is about a coupling that broke rather than about state expression in general.
  'text.label': `color.interactive.${family}.text.rest`,
  'text.icon': `color.interactive.${family}.text.rest`,
  'text.overlay.hover': `color.interactive.${family}.overlay.hover`,
  'text.overlay.pressed': `color.interactive.${family}.overlay.pressed`,
});

/**
 * The button FACTORY (#1223). One anatomy, three color families → three components. `id`, `name`,
 * `description` and the `interactive.<family>` paint are the only things that vary; everything below —
 * props, states, appearance/size/surface axes, the #326 asymmetric padding, the icon slots, the anatomy,
 * disabled, focus, accessibility — is authored ONCE here and shared verbatim. The three exports at the
 * foot of the file are its outputs, not hand-maintained copies (docs/34 DRY), and `test.ts` pins that.
 */
const makeButton = (id: string, name: string, description: string, family: IntentFamily): ComponentDef => ({
  id,
  name,
  aliases: ['btn', 'cta'],
  category: 'form',
  status: 'draft',
  description,

  props: [
    { name: 'children', type: 'node (label)', required: true, description: 'Visible label; verb-first, sentence case, ≤3 words. (Not required for the icon-only case — that is a distinct icon-button.)' },
    { name: 'onClick', type: 'function', required: false, description: 'Action handler. Suppressed while isPending or isInactive.' },
    // #1223 — no `intent` prop. Intent is now the COMPONENT (Button = primary; Destructive Button;
    // Neutral Button), not a prop on one component. EMPHASIS IS STILL THE APPEARANCE AXIS: a form with
    // three actions is typically three of the SAME component at filled / outline / text, not three colors.
    { name: 'appearance', type: "enum: 'filled' | 'outline' | 'text'", values: ['filled', 'outline', 'text'], default: 'filled', required: false, description: 'Visual treatment over the color, decoupled from intent so the matrix scales by addition. filled = interactive fill + on-fill ink; outline = border + text ink; text = ink only. (Reconciled from solid/outline/plain.)' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Control size — drives height, padding, and label type.' },
    { name: 'surface', type: "enum: 'default' | 'inverse'", values: ['default', 'inverse'], default: 'default', required: false, description: 'The ground the button sits on. `default` for a normal page; `inverse` for a dark or brand-filled band, where the button binds its `color.inverse.*` counterparts so fill, ink, border, overlay and the disabled treatment keep contrast against the flipped surface. A host that cannot know its ground picks `default`, and the designer sets `inverse` on the instance — the same answer the nested focus ring gives.' },
    { name: 'fullWidth', type: 'boolean', default: false, required: false, description: 'Stretch to container. Aliases: block / isFullWidth.' },
    { name: 'type', type: "enum: 'button' | 'submit' | 'reset'", values: ['button', 'submit', 'reset'], default: 'button', required: false, description: "Opinionated default 'button' to neutralize the platform's submit-on-enter-in-form trap; require 'submit' explicitly." },
    { name: 'isPending', type: 'boolean', default: false, required: false, description: 'Delays the spinner, preserves width, keeps focus (aria-disabled, not native disabled), suppresses re-fire, announces busy. Preferred over `loading`.' },
    { name: 'isInactive', type: 'boolean', default: false, required: false, description: 'Focusable disabled — visually muted, retains tab order, surfaces the blockage reason on focus. Use for a control blocked by satisfiable app state (e.g. submit on an incomplete form).' },
    { name: 'isDisabled', type: 'boolean', default: false, required: false, description: 'Native disabled. RESERVED for controls fundamentally irrelevant to the current view; removes from tab order + a11y tree. Prefer isInactive for anything relevant-but-blocked.' },
    { name: 'leadingVisual', type: 'slot', required: false, description: 'Icon / avatar / counter / spinner before the label.' },
    { name: 'trailingVisual', type: 'slot', required: false, description: 'Icon / caret / indicator after the label.' },
    { name: 'href', type: 'string', required: false, description: 'Discouraged — prefer link-button. If present, MUST render <a> (which drops type/disabled semantics).' },
    { name: 'aria-label', type: 'string', required: false, description: 'Accessible name; only needed when there is no visible label. Must be a superset of any visible text (WCAG 2.5.3).' },
  ],

  states: ['rest', 'hover', 'focus-visible', 'pressed', 'pending', 'inactive', 'disabled'],
  variants: {
    // #1223 — `intent` is gone as an axis; it is the component identity now. `appearance` carries
    // emphasis, `surface` the ground, `size` the rung, `width` a drag (not projected).
    appearance: ['filled', 'outline', 'text'],
    size: ['small', 'medium', 'large'],
    width: ['auto', 'full'],
    // THE INVERSE GROUND (#1134), and the bindings for it are NOT in `tokens` below — that is the whole
    // mechanism, not an omission. An inverse control binds every role's inverse counterpart, which
    // docs/20 §9.9 defines as `color.inverse.` + the role. Expressed as authored keys they would collide
    // with this def's own grammar by arity: `filled.fill.inverse` fills the `{state}` segment with
    // `inverse` (not a state), and a cross-cutting `inverse.disabled.fill` names no slot the projector
    // dispatches — both rejected by `paintKeyErrors`. So the whole inverse half is unauthorable here and
    // is applied by the projector instead — `anatomy-figma.ts` rewrites each resolved `color.*` ref to its
    // `color.inverse.*` counterpart at any coordinate where `surface=inverse`. This def declares the axis;
    // the transform supplies the values. (The intent-family segment the grammar once led with is gone with
    // #1223 — intent is the component now — so the collision is one arity shorter but the conclusion holds.)
    surface: ['default', 'inverse'],
  },
  // NO `modifiers` AXIS (#845), and its three values were three different things, which is the whole
  // defect: an axis's values are mutually exclusive coordinates along ONE dimension, and a button can
  // carry a leading visual AND a trailing visual simultaneously while `pending` is a coordinate on the
  // state axis entirely. It was a bag of unrelated booleans wearing an axis's clothing, and this def's
  // own `codeOnly` said so before the axis was removed.
  //
  // NOTHING IS LOST, because each of the three already lives somewhere that models it correctly, and
  // that is what made this a removal rather than a migration:
  //   leading-visual / trailing-visual → `figmaProperties.slotAxes`, which projects them as the two
  //     presence axes they are (`leading=` / `trailing=`) — declared, and the reason that surface is 648
  //     rather than 162. Presence had to be an AXIS rather than a Figma BOOLEAN because #326's slot-aware
  //     inset changes the CONTAINER's padding, which a boolean's single-node `visible` cannot reach.
  //   pending → `states`, and the projected `stateAxis`.
  // So removing the axis is projection-neutral: measured, `figmaAnatomySet` returns 648 members before
  // and after. What it DOES change is the paint census GRID, 1134 → 378 coordinates (4374 → 1458
  // assignments), which is `lint-paint.ts` arm 2's baseline shrinking to stop enumerating a phantom
  // dimension three times over.
  //
  // ONE HAZARD, and it is the reason this removal is not a one-line delete. The deleted `codeOnly` entry
  // was the ONLY place in this def's prose naming `pending` — and `figmaPropertyErrors`'s `admits()` is
  // what licenses omitting a state from the projected axis. Measured before removing it: with the entry
  // gone and nothing replacing it, dropping `pending` from `stateAxis` is still refused (`pending` IS on
  // the axis, so nothing needs admitting) — but `test.ts` asserts that dropping it FAILS *"even though
  // codeOnly MENTIONS it"*, and that assertion was written about this exact entry. The mention had to be
  // preserved somewhere that is not a leading admission, which is what the `slotAxes` comment below now
  // does. Deleting prose a gate reads is the same class of change as deleting the gate.

  // Full color × appearance × size skin, bound to the interactive.* family + cross-cutting
  // disabled.*. Every color now carries the SAME shape (fill+states / on-fill / border / text
  // / overlay), so the matrix is uniform — no per-color gaps. State-qualified slots carry a
  // dotted state suffix. accent is omitted from the base matrix (brand-conditional — it exists
  // only when the brand declares an accent palette). Keys structure the matrix; generators read them.

  // HOW THOSE PAINT KEYS ARE SPELLED (#758). This is the grammar `paintOf` used to have hardcoded, so
  // the two templates below are a transcription of existing behavior rather than a new decision —
  // which is why the 648-member paint is byte-identical across that change by construction.
  //
  // The state-qualified template LEADS, and the order is the fallback: `filled.fill.hover` wins where
  // it exists, and a state that does not restyle a part falls through to the rest key (a `pending`
  // button's fill is its rest fill). Reverse these two and every state paints its rest color — silently
  // identical to their rest sibling, which is #536 item 1's shape.
  //
  // #1223 dropped the leading `{intent}` segment: intent is the component now, so the family is fixed
  // per def (supplied by `intentTokens(family)` above) and no longer a coordinate the key carries.
  //
  // `disabled.*` is deliberately NOT a template here: it switches token family rather than qualifying
  // a key, and it is conditional on the appearance having that structure at rest. That is behavior,
  // and it stays in the projector where it can be expressed.
  paintKeys: ['{appearance}.{slot}.{state}', '{appearance}.{slot}'],

  tokens: {
    // base (variant-independent)
    'radius': 'radius.md',
    // THE OUTLINE BORDER'S THICKNESS (#1278). The WIDTH does not move — Prism 2 draws its outline
    // buttons at 1px and that is owner-confirmed — so this binds the token that already resolves to 1
    // rather than choosing a new figure. What moves is PROVENANCE: the 1 was the executors' literal
    // (`if (!node.strokeWeight) … = 1`), the right number with nothing behind it, and a brand re-runging
    // its border floor changed every other bordered part while the button stayed at Figma's fallback.
    //
    // `border-width.hairline` is 1px in all four corpus brands, aliased to `<root>.core.dimension.1`,
    // and its own `$description` calls it the *default border floor* — which is what a button's edge is.
    // No token is added, so `CONTRACT_VERSION` does not move; #1228 bound the three selection controls to
    // `border-width.thick` by the identical mechanism, and the two figures staying DIFFERENT is the point
    // rather than an inconsistency: 2px is a control weight, 1px is a button's, and both defs now agree
    // with the reference through a token instead of one through a token and one through a fallback.
    //
    // BOUND ON THE SHARED CONTAINER, so it is carried at `filled` and `text` too, where no border paints.
    // That is #1228's own shape one def along — checkbox at `checked` and switch at `on` bind a thickness
    // and paint nothing — and it is precisely the coordinate `claimDefaults`' gate exists for: the literal
    // would otherwise run AFTER the bind loop and UNBIND what Figma just accepted, reporting no miss.
    'border-width': 'border-width.hairline',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // per-size geometry + label type. `padding-x` is the LABEL side and `padding-x-visual` the
    // slot side (#326) — the split is why a leading icon doesn't read loose; `gap` (#325) is the
    // label↔visual space; `icon` pairs the control rung to its glyph artboard (#324, the 1:1
    // ladder, so small→sm rather than a reconciliation between two differently-shaped scales).
    'size.small.padding-x': 'size.sm.padding-x',
    'size.small.padding-x-visual': 'size.sm.padding-x-visual',
    'size.small.padding-y': 'size.sm.padding-y',
    'size.small.gap': 'size.sm.gap',
    'size.small.height': 'size.sm.height',
    'size.small.icon': 'icon.size.sm',
    'size.small.type': 'type.label.sm.emphasis',
    'size.medium.padding-x': 'size.md.padding-x',
    'size.medium.padding-x-visual': 'size.md.padding-x-visual',
    'size.medium.padding-y': 'size.md.padding-y',
    'size.medium.gap': 'size.md.gap',
    'size.medium.height': 'size.md.height',
    'size.medium.icon': 'icon.size.md',
    'size.medium.type': 'type.label.md.emphasis',
    'size.large.padding-x': 'size.lg.padding-x',
    'size.large.padding-x-visual': 'size.lg.padding-x-visual',
    'size.large.padding-y': 'size.lg.padding-y',
    'size.large.gap': 'size.lg.gap',
    'size.large.height': 'size.lg.height',
    'size.large.icon': 'icon.size.lg',
    // FILED as #1260, and #1248 is what measured it: there is no `type.label.lg` rung, so `large`
    // reuses `md` and a large button's label is typographically identical to a medium one while every
    // other dimension moves. This was a bare "FINDING (still open)" trailing comment for three
    // tickets — a comment is not a work item, so it now has an issue. `test.ts`'s type-key sweep
    // authors `2` distinct styles for this binding with the reason attached, which is what makes the
    // collapse fail loudly on the day someone fixes it rather than staying invisible.
    'size.large.type': 'type.label.md.emphasis',

    // THE PER-FAMILY PAINT — the full appearance × slot × state skin, bound to `interactive.<family>.*`.
    // Authored once in `intentTokens` above and spread here so the three components cannot silently
    // diverge (#1223, docs/34); the keys the projector reads (`filled.fill`, `outline.border.hover`, …)
    // are what that function returns. `test.ts` asserts these are the ONLY tokens that differ across the
    // three defs.
    ...intentTokens(family),

    // cross-cutting disabled (docs/20 §7) — ONE treatment, any appearance, IDENTICAL across all three
    // button components (that identity is why splitting the intents loses no coverage — #1223).
    //
    // INK IS KEYED TWICE, per ground (#784), and until #784 the second form was spelled
    // `disabled.on-fill` — a slot segment the projector never dispatches, so it was bound, gated, and
    // reached at no coordinate while every disabled appearance painted page ink. On `filled` that put
    // `disabled.text` on `disabled.fill` at 2.14:1 (wendys) / 2.55:1 (harbor), against the 3.04-3.08:1
    // contract `disabled.on-fill` already held. The `.on-fill` suffix now QUALIFIES the slot it paints
    // rather than replacing it, so `label`/`icon` stay words `paintOf` asks for and the projector picks
    // the form by whether the appearance actually has a disabled fill beneath the ink.
    'disabled.fill': 'color.disabled.fill',
    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
    'disabled.label.on-fill': 'color.disabled.on-fill',
    'disabled.icon.on-fill': 'color.disabled.on-fill',
    'disabled.border': 'color.disabled.border',
  },

  // The STRUCTURAL layer (#327), instantiated from the KB brief §2 — which is already an
  // adjudicated cross-system anatomy, so this is a transcription into schema, not a re-derivation.
  //
  // Two parts of the brief resolve differently here, and both are decisions rather than omissions:
  //  · The brief's "container/target" and "layout container" are ONE part. In the brief they are
  //    separate paragraphs because CSS lets them be separate concerns; in both Figma auto-layout
  //    and `inline-flex` they are the same node, and splitting them would emit a redundant frame.
  //  · The focus ring IS a part, and this REVERSES the decision recorded here through #493 (#536
  //    item 3). The old reasoning was that a ring is "a stroke-with-offset on the target, not a node",
  //    so a part would put something in the child tree a materializer has nowhere to place. Both
  //    halves were wrong, and the second is what mattered: the ring is a node — an ABSOLUTELY
  //    positioned sibling — and a materializer places it precisely because it takes no cell in the row.
  //    What forced the reversal was the cost the old decision carried, measured rather than argued:
  //    `appearance=outline, state=focus-visible` emitted its REST border and no ring at all, and all
  //    108 focus-visible rows were byte-identical to their rest sibling. A ring drawn on the target
  //    instead would have to win the target's single stroke away from outline's border. An absolute
  //    sibling has its own, so nothing is traded — see `parts.focusRing`.
  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // THE ORDER IS THE PRECEDENCE (#933): the overlay if it resolves, otherwise the fill. `filled`
        // keys a fill and no overlay; `outline` and `text` key an overlay and no fill, because they have
        // no fill to change for hover and express it as a translucent wash on this same node. Exactly
        // one of the two resolves at any coordinate, so the order is a tie-break that never fires — it
        // is written down because the projector used to hold it as a hardcoded `??` and the def that
        // depends on it could not see it.
        paintSlots: ['overlay', 'fill', 'border'],
        role: 'target',
        children: ['leadingVisual', 'label', 'trailingVisual', 'focusRing'],
        // justify: center is the CONSTANT (docs/28 §5.2). Primer ties alignment to purpose —
        // centre for CTAs, left for selection toggles — but that would make `align` the first
        // LAYOUT prop in ComponentDef, a precedent propagating across ~40 components. Deferred
        // until a real surface needs it, not settled by preference.
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        padding: {
          block: 'size.{size}.padding-y',
          inlineLabel: 'size.{size}.padding-x',
          inlineVisual: 'size.{size}.padding-x-visual',
        },
        gap: 'size.{size}.gap',
        height: 'size.{size}.height',
        radius: 'radius',
        // The EDGE's thickness (#1278) — see `border-width` in `tokens` for the figure and why it is
        // 1 and not 2. Names the def's own key rather than the token, exactly as `radius` above and as
        // checkbox/radio/switch do.
        strokeWidth: 'border-width',
      },
      // `nesting: swap` on all three swap-materialized parts (#681). A slot's target is nominated per
      // FILE by the caller and its content is the designer's to change, so there is no variant for the
      // def to fix — which is exactly what `swap` says.
      leadingVisual: { kind: 'slot', optional: true, size: 'size.{size}.icon', nesting: { kind: 'swap' }, note: 'Icon / avatar / counter / spinner before the label.' },
      label: { kind: 'text', optional: false, type: 'size.{size}.type', note: 'Its own node so truncation, wrap and line-height are controllable independently of the row.' },
      trailingVisual: { kind: 'slot', optional: true, size: 'size.{size}.icon', nesting: { kind: 'swap' }, note: 'Icon / caret / indicator after the label. NOT split into visual + action (docs/28 §5.3): the condition that split rested on — a pending state needing its own slot — is already carried by leadingVisual + isPending.' },
      spinner: {
        kind: 'overlay',
        nesting: { kind: 'swap' },
        // ORDERED, and the order is the design decision (#848). Leading first because a spinner on the
        // left reads as "loading" while one on the right reads as a trailing indicator; trailing second
        // because a cell that EXISTS is always a better host than the label-overlay fallback.
        replaces: ['leadingVisual', 'trailingVisual'],
        overlaysWhenAbsent: 'label',
        when: 'pending',
        size: 'size.{size}.icon',
        note: 'Takes a visual cell when there is one (Primer: "the spinner replaces only that visual slot, and the button label remains visible") — width identical, because the cell was already the icon\'s size. With NO visual cell at all there is nothing to take, so it goes out of flow, centered on the label, and the label holds the width open at zero opacity (React Aria). GENERALIZED FROM "the leading visual" TO "a visual cell" BY #848, and the narrow reading was a real defect rather than a simplification: `replaces` named only `leadingVisual`, so `leading=false, trailing=true` — which HAS a visual cell — fell through to the label overlay and rendered as spinner + trailing visual with the label at zero opacity, i.e. two icons and no text. Found in a live Figma paste; every gate was green (see #848 and docs/34 shape 16). The older note before that ruled out the label\'s position on the grounds that replacing a centered label collapses the width, which conflated REPLACE with REMOVE: removing the label collapses the width, overlaying it does not, and that conflation ruled out the correct fix for the label-only case for as long as it stood (#612).',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        // THE STROKE THE OFFSET HAS TO CLEAR (#801). `ring-offset` is the visible gap the brand asks
        // for; the ring draws its own 2px stroke INSIDE its bounds, so a materializer that positions
        // this part at -2 has the stroke drawn back across the whole gap and the ring lands flush on
        // the border. Both numbers travel and the executor sums them — see `PartDef.strokeInset`.
        strokeInset: 'ring-width',
        // `nest-fixed` with `follow: ['surface']` (#1134, #1156). The ring's `surface` FOLLOWS this
        // button's `surface`: a `surface=inverse` button member nests the `surface=inverse` ring, so a
        // button on a dark band gets the ring tuned for that band — which is what its own 3:1 contract
        // needs (1.4.11, the reason the ring has the axis). `variant: { surface: 'default' }` is the
        // fallback, reached only where the host member does not carry `surface` (a structure-only plan).
        // This is why both axes are named `surface` (#1134): the passthrough is by NAME, and a button
        // spelling it `surface` while the ring spelled it `color` could not drive one through the other.
        // Naming the variant is still #681 — the def CHOOSES rather than inheriting the ring set's first
        // child (creation-order, #656's error one layer out); `follow` only makes the choice per member.
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' }, follow: ['surface'] },
        note: 'An absolutely-positioned sibling nesting the shared `focus-ring` component. Takes no cell in the row, so no geometry moves, and has its OWN stroke — which is what dissolves the collision rather than trading a loss: a ring drawn on the target would compete with `appearance=outline`\'s border for the single stroke a Figma node has, at three different palette steps (550 ring / 500 border / 550 rest fill). Shared rather than authored per host because the ring is nobody\'s component — `focus.ring.*` and `color.border.focus` are top-level families and `focus.ring.offset-field` already emits separately.',
      },
    },
    derived: {
      'min-width': 'height × minWidthMultiplier — Spectrum computes it rather than authoring it, so a short label ("OK") cannot produce a stubby button',
      'pill-radius': 'height ÷ 2 — only when appearance uses the pill radius; a literal radius token would be wrong at more than one height',
    },
    // The ceilings. Each is structure the neutral vocabulary can state and Figma provably cannot
    // hold, so it is recorded rather than silently lost in the projection.
    codeOnly: [
      'touch-target-expansion — the optical box and the hit box are deliberately decoupled (::before / absolute overlay), reconciling the WCAG 2.5.8 24×24 floor with Apple HIG 44×44 without inflating a compact button. Figma has no concept of a hit area larger than the frame.',
      'focus-ring-offset — the ring GEOMETRY now projects (an absolute sibling nesting the shared `focus-ring`), but its position is FROZEN at paste: Figma\'s x/y accept no variable binding, so the payload resolves `focus.ring.offset` AND `focus.ring.width` to numbers, sums them, and writes the result (#801 — the ring\'s stroke is drawn INSIDE its own bounds, so the gap the brand asked for has to be widened by the stroke that eats it). Two names freeze exactly as one did. Every bound paint re-themes when a brand changes; an already-pasted ring does not move. AND A REBUILD DOES NOT MOVE IT EITHER, which is the half worth writing down: the executor finds the set by name on the current page and skips each member by name, reporting `✓ already built` without writing any geometry — so to pick up a corrected ring position you must DELETE the existing component set, or build onto a fresh page. This is not specific to the ring; it is true of any geometry, paint or constraint change to an already-pasted set, and it is tracked as #827 because name-based idempotence cannot tell "already built correctly" from "built by an older engine". The `:focus-visible` CONDITION remains unprojectable — Figma carries the ring as a variant coordinate a designer selects, not as a state a pointer triggers.',
      'focus-ring STROKE, WIDTH and RADIUS — owned by the nested `focus-ring` component, not by this def. `focus-ring`, `ring-width` and `ring-offset` are bound in `tokens`, and since #801 BOTH numbers reach a Figma node as this def\'s own absolute geometry: the host positions the part at -(offset + width), because the ring draws its stroke inside its own bounds and would otherwise consume the whole gap. Since #1266 the width reaches the RING\'s node too, as its bound `strokeWeight` — so the compensation and the stroke it compensates for are finally the same number, which for three releases they were not. So this def verifies that a ring is nominated and where it sits, including the compensation that makes "where" visible, and nothing more. Sharing the ring is still the right call — the ring is one shared thing (`focus.ring.*` and `color.border.focus` are top-level families) and authoring it N ways in N hosts would be worse. But the UNGATED PART IS NOT A CONSEQUENCE OF SHARING IT, which is what this entry once claimed: it is projector and schema gaps, neither of them a trade anybody made. ALL THREE are now CLOSED, and what took the third one\'s place is smaller than the third one was. PAINT (closed #758 → #784): `paintOf` once keyed every lookup as `{intent}.{appearance}.{slot}`, so a def whose axes are surface/tone resolved nothing; #758 replaced that with each def\'s own `paintKeys` and #784 corrected the ring\'s keys to the slot vocabulary the projector dispatches. STRUCTURE (closed #795): this entry said `figmaAnatomySet` refuses any variant axis outside intent/appearance/size and `planComponentName` always writes a `size=` coordinate the ring has no axis for, so a ring member could never match the coordinate this def nests by — #795 deleted the axis list and made `size=` conditional on the def declaring `size`, and `focus-ring` now projects two members named exactly `surface=default` / `surface=inverse`, which is what this def\'s `nesting: { variant: { surface: \'default\' }, follow: [\'surface\'] }` asks for (re-verified against `nestVariantMatch`). STROKE WIDTH (closed #1266): `PartDef` gained `strokeWidth`, `focus-ring`\'s `ring` part binds it, and every projected member carries a bound `strokeWeight`. Before it, both executors fell through to `if (!node.strokeWeight) … = 1` and the ring pasted at 1px in every brand — half its declared thickness, and 3px of visible gap where 2 was designed, because the compensation above had already assumed 2. What is LEFT is one keyword: `PartDef` has no field for a stroke\'s STYLE, and cannot usefully have one, because Figma expresses `solid`/`dashed` as a `dashPattern` of pixel runs rather than as a keyword — so `focus.ring.style` resolves against every brand and has nowhere to bind. A schema decision under #740. Read the remaining gap as "the ring pastes without its dash style", not as "the ring pastes without its stroke".',
      'min-width derivation — resolved to a literal at emit, so the Figma component holds a frozen number rather than the live height×multiplier relationship.',
      'width (auto | full) — declared as a variant axis but deliberately NOT projected into Figma (#487 §4). A designer resizes an auto-layout frame; a variant axis for it doubles the whole set to buy nothing a drag does not already do.',
      // The `modifiers` admission is GONE, with the axis it admitted (#845). Two notes on why it is not
      // simply deleted-and-forgotten. FIRST, its closing sentence had already gone stale: it said slot
      // presence "needs its own variant axis … that axis does not exist in this def yet", and `slotAxes`
      // has existed since #487 step 2 — so the entry was admitting an axis for a reason that had been
      // fixed, which is a stale exemption reading as a live one. SECOND, an admission for an axis the def
      // no longer declares is refused by nothing in either direction; `figmaPropertyErrors` only asks
      // whether every DECLARED-and-unprojected axis is admitted, never whether every admission has an
      // axis. So it would have sat here indefinitely as evidence for an axis that was gone.
      // The `intent-at-disabled redundancy (#612)` entry is GONE with #1223, and its removal is the point
      // rather than an omission. It documented that all three intents rendered ONE byte-identical row at
      // `state=disabled` (144 redundant rows, accepted not pruned) — a redundancy that existed only
      // because intent was an AXIS crossing state. #1223 removes the intent axis entirely: each button
      // component now carries ONE disabled skin per coordinate, and the three components' disabled skins
      // are identical to each other (the shared `disabled.*` block), which is the token tier being correct
      // one level up. There is no per-intent redundancy left to admit, so the entry and the `admits()`
      // guard that protected its wording both retire — nothing declares `intent` for the check to key on.
      'inactive — a real state (isInactive), deliberately NOT a Figma variant. Its whole delta from `disabled` is behavioral: it retains tab order, keeps the control in the a11y tree, carries aria-disabled rather than the native attribute, and surfaces the blockage reason on focus. None of that is paint, so a variant has nothing to encode. At the TOKEN tier its intended visual is `disabled`\'s by an explicit decision (docs/03 item 3, resolved 2026-06-24: `disabledStrategy: \'accessible\'` IS the KB\'s contrast-preserving `inactive`; docs/06 defines `text.disabled` as "disabled / inactive ink"). The EMITTER does not implement that yet — `anatomy-figma.ts` special-cases `state === \'disabled\'` only, so `inactive` falls through to the `rest` paints, which is worse than a duplicate: the column would have read as a normal enabled button. Either way it is unprojectable, and the two facts fail it independently.',
    ],
  },

  // How this projects into Figma component properties (#487 §5). DECLARED, not inferred from
  // `props[].type` — those are prose. Deliberately partial: `variantAxes` names only the three axes
  // that exist and should project, and every axis it omits is admitted in `codeOnly` above (the
  // validator enforces that pairing). The slot-presence axis §4 calls for is future def work, so it
  // is absent rather than stubbed.
  figmaProperties: {
    // `surface` PROJECTS (#1134) — it doubles each component's set (216 → 432) so a designer can pick a
    // button for a dark band from the same component, which is the deliverable. It is a real axis a
    // variant carries, unlike `width` (a drag, admitted in codeOnly): the two grounds are genuinely
    // different pixels, and Figma has no way to publish "inverse context" to a nested instance, so an
    // explicit coordinate is the only thing that can carry it. Its inverse paints come from the
    // projector's `color.inverse.*` rewrite (see `variants.surface`), not from keys in `tokens`.
    //
    // #1223 — `intent` is NO LONGER an axis here. Each of the three button components fixes one family,
    // so its set is appearance(3) × size(3) × surface(2) × state(6) × slot-combos(4) = 432 members; the
    // former single 1296-member set is now three 432-member sets (Button / Destructive / Neutral).
    variantAxes: ['appearance', 'size', 'surface'],
    // Six of the seven in `states` above — still the single source (#487 §0.4). The legacy sheet's
    // six (`active`, `focused`, `loading`) are deliberately NOT codified: they are that sheet's names
    // for `pressed`, `focus-visible` and `pending`.
    //
    // `inactive` is the one omission, and it is admitted in `codeOnly` above rather than dropped —
    // same mechanism `focus-ring-offset` uses. Seven remains right for `states` (the def's truth);
    // six is right for the projection (what a variant can carry). Keeping it would have shipped 108
    // rows that render as their `rest` sibling — the emitter has no `inactive` paint branch — under a
    // label promising a blocked control. See the codeOnly entry for why no branch is worth adding.
    stateAxis: { name: 'state', values: ['rest', 'hover', 'focus-visible', 'pressed', 'pending', 'disabled'] },
    // Slot PRESENCE (§4) — the axis `planComponentName` has been emitting all along. Declaring it
    // takes the projected surface from 189 to 756, which is what the emitter already produced; the
    // gap was in the declaration, not the emitter.
    //
    // An axis rather than a BOOLEAN because presence changes the CONTAINER's geometry: #326's
    // slot-aware inset sets `paddingLeft = leading ? inlineVisual : inlineLabel` per side, and a
    // Figma BOOLEAN drives one node's `visible` and can touch nothing above it. `booleans` staying
    // stated-empty below is the same finding read from the other end.
    //
    // THESE TWO AXES ARE WHERE `modifiers` WENT (#845). That axis listed `leading-visual`,
    // `trailing-visual` and `pending` as though they were alternatives; the first two are these two
    // presence axes, and `pending` was never a modifier at all — it is a value on the state axis
    // directly above, which is why removing the axis dropped nothing. This is deliberately NOT a
    // leading `codeOnly` admission: `admits()` requires an entry to LEAD with a name to license
    // omitting it, so stating `pending` here records where it went WITHOUT licensing its omission from
    // the state axis. `test.ts` asserts that dropping `pending` from that axis fails *even though*
    // codeOnly mentions it — an assertion written about the deleted `modifiers` entry, and the reason
    // this mention had to land somewhere that cannot be mistaken for an admission.
    slotAxes: [
      { name: 'leading', part: 'leadingVisual' },
      { name: 'trailing', part: 'trailingVisual' },
    ],
    // Slot CONTENT, so a designer can pick the icon — orthogonal to presence above.
    swaps: { leadingVisual: 'leadingVisual', trailingVisual: 'trailingVisual' },
    // "Button" is the placeholder, and it lives here rather than in the payload: the def is the layer
    // a second brand overrides. Figma accepts an empty TEXT default, which is what #510's set shipped —
    // 21 structurally perfect variants with nothing readable in any of them.
    texts: { children: { part: 'label', default: 'Button' } },
    // Empty, and stated rather than omitted. `fullWidth` is layout; `isPending`/`isInactive`/
    // `isDisabled` collapse into the state axis; `onClick`/`type`/`href` are behavioral. A Figma
    // BOOLEAN drives one node's `visible` and nothing else, and none of those are that.
    booleans: {},
    // The set's COLUMNS (#656). `state` because it is the axis a designer reads across — the six
    // steps of one skin, side by side, is how the color layer was reviewed and how the legacy sheet
    // is drawn. It is also the widest axis here, so the cardinality fallback would pick it anyway;
    // declaring it is what stops the next axis added to this def from taking the columns by accident,
    // which is precisely what `slotAxes` did in #536 (the full set laid out 324 × 2, measured live at
    // 320 × 23304px). With this, 72 rows × 6 columns per component (#1223 — was 108 × 6 when intent
    // crossed the row axis; each of the three components now carries a third of the rows).
    gridAxis: 'state',
  },

  accessibility: {
    role: 'button (native <button>; never div[role=button] — it inherits Space/Enter activation, focus, and HC affordances for free)',
    wcag: ['1.4.11 Non-text Contrast (the focus ring + boundary ≥ 3:1)', '2.4.7 Focus Visible', '2.4.13 Focus Appearance', '2.5.3 Label in Name', '2.5.5 / 2.5.8 Target Size', '4.1.2 Name/Role/Value'],
    keyboard: 'Native <button>: Enter activates on keydown, Space on keyup. (This asymmetry vs a link — which activates on Enter only, Space scrolls — is exactly why a navigating "button" must be a real link.)',
    focus: 'A :focus-visible ring (color.border.focus) with an outline-offset so a sliver of background separates ring from border — it must NOT blend into the button\'s own fill (WCAG 1.4.11, target 3:1). Never suppressed. Focus is RETAINED through pending and inactive (aria-disabled, not native disabled).',
    aria: 'State attributes are distinct, not interchangeable: aria-pressed only for a toggle-button; aria-expanded (+ aria-haspopup) for a menu/disclosure trigger; aria-checked only for the switch role. Do not conflate them. Busy: while isPending, set aria-busy and announce via a polite live region ("Saving…") since a spinner is invisible to assistive tech; keep the control focusable so the busy state is discoverable. isInactive/isPending use aria-disabled (not native disabled) so focus and the explanatory name/description stay reachable.',
  },

  content: {
    labelPattern: 'Verb-first, action-specific, sentence case, ≤3 words. "Save changes" / "Delete file" — never "OK", "Submit", or "Click here".',
    errorPattern: 'Button has no error state — surface failures in an adjacent inline-message / alert (errors belong to the form/field).',
    dialogPattern: 'Match the destructive verb to the consequence ("Delete", not "Confirm"). Cancel = abort+revert; Close/Dismiss = dismiss info; never "OK" on an error.',
  },

  // SHARED across the three components (#1223) — the universal rules. Color is the component, so the
  // "which intent" guidance lives in each component's own `description`; what stays here is the appearance
  // hierarchy, labels, states and surface, which apply the same to Button / Destructive / Neutral.
  docs: {
    usage: 'Use for an immediate action in the current context — submit/save/reset a form, trigger a UI state change (open modal, toggle drawer), or fire async work. Color is the COMPONENT (Button / Destructive Button / Neutral Button — pick by semantics); rank actions within a view by APPEARANCE (filled > outline > text), with exactly one FILLED per view/region as the constraint.',
    do: [
      'Lead with a verb, name the object ("Publish post", not "Submit")',
      'Keep exactly one FILLED button per view; demote the rest to outline / text, so a view of three actions is three buttons at three appearances rather than three fills competing',
      'Set surface=inverse for a button on a dark or brand-filled band, so its fill, ink, border and disabled treatment bind the inverse counterparts instead of losing contrast against the flipped ground',
      'Use isInactive (focusable) for a control blocked by satisfiable state; reserve isDisabled for the irrelevant',
    ],
    dont: [
      'Use a button for navigation to a URL — use a link / link-button',
      'Stack multiple FILLED buttons competing for attention — differentiate rank by appearance, not by adding fills',
      'Use native disabled on a relevant-but-blocked control (dead end for keyboard/SR users)',
      'Remove the label to make room for a spinner — the button narrows mid-submit and screen readers lose the name; the spinner takes the leading visual\'s place, or overlays a label held at zero opacity',
    ],
    contentGuidelines: 'Verb-first, specific, sentence case, no terminal punctuation, ≤3 words to bound i18n expansion.',
  },

  ai: {
    primaryPurpose: 'Trigger an action in place.',
    whenToUse: 'The user needs to DO something on this surface — submit, confirm, open, apply, or start async work.',
    avoidWhen: 'The target is a different location/URL → use a link (or link-button if it must look like a button). A persistent on/off state → use a switch. One-of-many selection → use a segmented-control / radio. A toggle with pressed state → use a toggle-button. Icon-only with no visible text → use an icon-button (the accessible name is required there at the type level).',
    commonPartners: ['icon', 'spinner', 'tooltip', 'button-group', 'menu', 'popover'],
    triggerKeywords: ['button', 'submit', 'cta', 'confirm', 'action', 'primary action', 'save', 'delete'],
    generationPriority: 1,
  },

  composition: {
    composesWith: ['icon', 'spinner', 'tooltip', 'button-group', 'menu', 'popover'],
    alternativeTo: ['link', 'link-button', 'icon-button', 'toggle-button', 'split-button', 'switch', 'chip'],
    supersedes: ['input[type=button|submit]', 'div[role=button]'],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'State transitions (bg/border/shadow) run ~100–150ms via motion tokens; a subtle press (scale 0.98) gives tactile feedback. Under prefers-reduced-motion, resolve scale/translate to none but KEEP the instantaneous color change so the state stays perceivable; the pending spinner is functional and its busy state is carried by aria-busy regardless.',
  },

  notes: {
    contested: [
      'native isDisabled vs focusable isInactive — the practice defaults to isInactive for relevant-but-blocked, but focusable aria-disabled is not yet the field-wide default (per-engagement decision).',
      'a low-emphasis destructive ("quiet Delete") is expressed as the Destructive Button at appearance=text rather than a fully orthogonal emphasis×tone split — tone is the component (#1223), emphasis is the appearance axis within it.',
      'outline/text hover uses the interactive overlay wash, which assumes outlineInteraction=overlay-neutral (the default); a solid-tint / none brand rebinds those slots (foreground.<color>-subtle / no hover).',
    ],
    evolution: [
      'RESOLVED (was the v1 HIGH finding): interaction states existed only on the solid action/danger roles, so the default (neutral) button was hover-less. The interactive color system (docs/20) gives every color — primary/neutral/destructive — the full fill+states/on-fill/border/text/overlay shape, so the matrix is now uniform and the default button has proper hover/pressed. Disabled is the cross-cutting disabled.* family, no longer scattered per-color.',
    ],
    unverified: [
      'FINDING (token layer, still open): no type.label.lg composite — large buttons reuse type.label.md (large differs from medium only in height/padding, not type scale).',
      'FINDING (engine): the focus-ring 3:1 non-text contrast (1.4.11) is asserted here but not yet engine-verified — a follow-up contract.',
    ],
  },
});

// ── THE THREE COMPONENTS (#1223) ────────────────────────────────────────────────────────────────
// One factory, three color families. `test.ts` asserts they share byte-identical anatomy / geometry /
// disabled / #326 padding / slots and differ ONLY in the `interactive.<family>` bindings, so a future
// edit cannot silently desync them. `button` keeps the id `button` and is the primary/brand component;
// `Destructive Button` and `Neutral Button` are its siblings. ACCENT is deliberately not among them,
// and the reason is the split's own logic: intent IS the component, so a fourth intent would be a
// fourth component — but accent is OPTIONAL and per-brand, not one of the three always-generated
// families, so the engine cannot emit a component for a family a given brand may not have. The path
// instead has two halves. (1) The COLOUR family: a brand promotes an accent palette to a full
// `interactive.accent.*` column (`accentPalette` / `interactivePalettes`, docs/20 §3–§3a — the engine
// already generates this, gated like the built-ins). (2) The COMPONENT: in Figma the designer
// DUPLICATES the primary Button set and rebinds its `interactive.primary.*` variables to
// `interactive.accent.*` — a per-brand move over generated tokens, the same duplicate-and-rebind any
// brand-specific variant takes, not a set the engine enumerates.
export const button: ComponentDef = makeButton(
  'button',
  'Button',
  'In-flow trigger for an action that happens now, in the current context — submit, save, confirm, open a dialog, fire async work — in the brand (primary) color, the expected look of a button. NOT navigation (use link / link-button, even when it looks like a button), NOT a persistent binary (switch), NOT one-of-many selection (segmented-control / toggle-button). For a destructive or a weightless action, use the Destructive Button / Neutral Button sibling components.',
  'primary',
);

export const buttonDestructive: ComponentDef = makeButton(
  'button-destructive',
  'Destructive Button',
  'In-flow trigger for a DESTRUCTIVE action — delete, remove, discard, disconnect — in the destructive color, so the consequence reads before the click. Same anatomy as Button; the color is the whole difference. Pair it with an adjacent neutral escape ("Cancel" / "Keep"), and match the verb to the consequence ("Delete", not "Confirm"). For a quiet destructive action, use appearance=text on this component.',
  'destructive',
);

export const buttonNeutral: ComponentDef = makeButton(
  'button-neutral',
  'Neutral Button',
  'In-flow trigger for an action that carries NO brand weight — a toolbar control, a dense table row, a low-stakes secondary action — in the neutral color. Reach for it when the control genuinely has no brand emphasis to carry, not merely because it is secondary in rank (rank is the appearance axis: a secondary primary action is the Button at appearance=outline). Same anatomy as Button.',
  'neutral',
);
