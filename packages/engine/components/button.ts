/**
 * Button — re-authored v1 from the KB brief (knowledge-base/components/button.md §15),
 * the catalogue's calibration component. v0 was seeded from the schema shape only and
 * re-litigated settled decisions; this is faithful to the practice's resolved model.
 *
 * The practice's resolved decisions carried in here:
 *  - TWO-AXIS variant model: intent {primary, neutral, destructive} × appearance
 *    {filled, outline, text} × size — NOT a single overloaded `variant` enum (brief §3;
 *    reconciled to the interactive vocabulary per docs/20 / KB button.md §3).
 *  - Default intent = primary — REVERSED 2026-08-07, see the `intent` prop for the reasoning.
 *    The brief's §4/§15 default was `neutral`, on the rule "one primary per view, so the loud
 *    button is the deliberate choice". The rule survives; the inference from it did not. It
 *    counts primaries per view as if emphasis lived on `intent` alone, but this def made
 *    intent and appearance ORTHOGONAL (the line above), so hierarchy is expressed by
 *    APPEARANCE within one intent — filled / outline / text — and a three-button form is
 *    typically three primaries, one of each appearance, all correctly the brand colour.
 *  - The state TRIO: isPending (focusable aria-disabled, delayed spinner, width-preserved,
 *    busy-announced), isInactive (focusable disabled — relevant-but-unsatisfied), isDisabled
 *    (native, RESERVED for controls irrelevant to the view) (§4, §13).
 *  - leadingVisual / trailingVisual (not *Icon — the slot holds avatars/counters/spinners) (§2).
 *  - type='button' default (neutralise the platform submit trap) (§3, §11).
 *  - Icon-ONLY is a distinct component (icon-button) so the accessible name is required at
 *    the type level (§6, §10).
 *
 * Rebound to the interactive colour system (docs/20): the two-axis model is now the
 * reconciled vocabulary — appearance {filled, outline, text} × colour {primary, neutral,
 * destructive} (+ accent when a brand declares one) — bound to `interactive.<colour>.*`
 * with cross-cutting `disabled.*`. This CLOSES the v1 HIGH finding: neutral (was the
 * stateless `foreground.secondary`) now carries hover/pressed/on-fill like every colour,
 * so the default button is no longer hover-less. outline/text hover uses the overlay wash
 * (assumes `outlineInteraction: overlay-neutral`, the default). `ghost` is retired — a
 * quiet button is `intent=neutral appearance=text`. (`type.label.lg` gap still stands.)
 */
import { ComponentDef } from '../component-schema';

export const button: ComponentDef = {
  id: 'button',
  name: 'Button',
  aliases: ['btn', 'cta'],
  category: 'form',
  status: 'draft',
  description:
    'In-flow trigger for an action that happens now, in the current context — submit, save, confirm, delete, open a dialog, fire async work. NOT navigation (use link / link-button, even when it looks like a button), NOT a persistent binary (switch), NOT one-of-many selection (segmented-control / toggle-button).',

  props: [
    { name: 'children', type: 'node (label)', required: true, description: 'Visible label; verb-first, sentence case, ≤3 words. (Not required for the icon-only case — that is a distinct icon-button.)' },
    { name: 'onClick', type: 'function', required: false, description: 'Action handler. Suppressed while isPending or isInactive.' },
    { name: 'intent', type: "enum: 'primary' | 'neutral' | 'destructive'", values: ['primary', 'neutral', 'destructive'], default: 'primary', required: false, description: 'Semantic colour, drawn from interactive.<intent>.* (docs/20). Defaults to primary — the brand colour is the expected look of a button, so an unqualified <Button> should be on-brand rather than gray. EMPHASIS IS THE APPEARANCE AXIS, NOT THIS ONE: a form with three actions is typically three primaries at filled / outline / text, not one primary and two grays. Use neutral when the control genuinely carries no brand weight (a toolbar, a dense table row); destructive for delete/remove. accent is available when the brand declares one. (Reconciled from the old primary/secondary/danger/ghost — secondary→neutral, danger→destructive, ghost retired to intent=neutral appearance=text.)' },
    { name: 'appearance', type: "enum: 'filled' | 'outline' | 'text'", values: ['filled', 'outline', 'text'], default: 'filled', required: false, description: 'Visual treatment over the colour, decoupled from intent so the matrix scales by addition. filled = interactive fill + on-fill ink; outline = border + text ink; text = ink only. (Reconciled from solid/outline/plain.)' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Control size — drives height, padding, and label type.' },
    { name: 'fullWidth', type: 'boolean', default: false, required: false, description: 'Stretch to container. Aliases: block / isFullWidth.' },
    { name: 'type', type: "enum: 'button' | 'submit' | 'reset'", values: ['button', 'submit', 'reset'], default: 'button', required: false, description: "Opinionated default 'button' to neutralise the platform's submit-on-enter-in-form trap; require 'submit' explicitly." },
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
    intent: ['primary', 'neutral', 'destructive'],
    appearance: ['filled', 'outline', 'text'],
    size: ['small', 'medium', 'large'],
    width: ['auto', 'full'],
    modifiers: ['leading-visual', 'trailing-visual', 'pending'],
  },

  // Full colour × appearance × size skin, bound to the interactive.* family + cross-cutting
  // disabled.*. Every colour now carries the SAME shape (fill+states / on-fill / border / text
  // / overlay), so the matrix is uniform — no per-colour gaps. State-qualified slots carry a
  // dotted state suffix. accent is omitted from the base matrix (brand-conditional — it exists
  // only when the brand declares an accent palette). Keys structure the matrix; generators read them.
  tokens: {
    // base (variant-independent)
    'radius': 'radius.md',
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
    'size.large.type': 'type.label.md.emphasis', // FINDING (still open): no type.label.lg — reuses md

    // primary — interactive.primary.* (full states)
    'primary.filled.fill': 'color.interactive.primary.fill.rest',
    'primary.filled.fill.hover': 'color.interactive.primary.fill.hover',
    'primary.filled.fill.pressed': 'color.interactive.primary.fill.pressed',
    'primary.filled.label': 'color.interactive.primary.on-fill',
    'primary.filled.icon': 'color.interactive.primary.on-fill',
    // The outline EDGE now carries state (#576), so `.outline` binds all three rather than letting
    // hover/pressed fall back to rest. Same reasoning as the resolved #536 finding below: a missing
    // key means "this appearance does not paint that part in that state", and `.outline` DOES paint
    // its border while hovered — so omitting them would project hover byte-identical to rest.
    'primary.outline.border': 'color.interactive.primary.border.rest',
    'primary.outline.border.hover': 'color.interactive.primary.border.hover',
    'primary.outline.border.pressed': 'color.interactive.primary.border.pressed',
    'primary.outline.label': 'color.interactive.primary.text.rest',
    'primary.outline.icon': 'color.interactive.primary.text.rest',
    'primary.outline.overlay.hover': 'color.interactive.primary.overlay.hover',
    'primary.outline.overlay.pressed': 'color.interactive.primary.overlay.pressed',
    'primary.text.label': 'color.interactive.primary.text.rest',
    'primary.text.icon': 'color.interactive.primary.text.rest',
    'primary.text.overlay.hover': 'color.interactive.primary.overlay.hover',
    // RESOLVED (#536 item 1, was the open FINDING here): `.text` keyed an overlay for HOVER but not for
    // PRESSED while `.outline` keyed both, so a pressed ghost button fell back to its rest value and
    // projected byte-identical to rest — 36 of the 126 duplicate variant groups. The finding's own note
    // said "closing this is one line per intent", and that held: `overlay.pressed` already existed for
    // all three intents at alpha 0.2 (vs hover's 0.1) and was already bound by `.outline`.
    //
    // Fixed in the DEF, not in `paintOf`'s fallback, and that distinction is the point. The projection
    // falling back to the unqualified key is CORRECT — a pending button's fill really is its rest fill —
    // so teaching it to synthesize a pressed overlay when a def omits one would paint a wash no brand
    // authored, and would have hidden this gap instead of surfacing it. A missing key means "this
    // appearance does not paint that part in that state"; the bug was that `.text` does paint it.
    'primary.text.overlay.pressed': 'color.interactive.primary.overlay.pressed',
    'primary.on-inverse.label': 'color.interactive.primary.on-inverse.text.rest',

    // neutral — no longer the default (2026-08-07), but still the full column. It carries
    // hover/pressed like every colour (the v1 gap, CLOSED), and that stays true independently of
    // which intent is the default: `neutral` is now the *chosen* look for a weightless control
    // rather than what you get by omission, and a chosen look needs states just as much.
    'neutral.filled.fill': 'color.interactive.neutral.fill.rest',
    'neutral.filled.fill.hover': 'color.interactive.neutral.fill.hover',
    'neutral.filled.fill.pressed': 'color.interactive.neutral.fill.pressed',
    'neutral.filled.label': 'color.interactive.neutral.on-fill',
    'neutral.filled.icon': 'color.interactive.neutral.on-fill',
    'neutral.outline.border': 'color.interactive.neutral.border.rest',
    'neutral.outline.border.hover': 'color.interactive.neutral.border.hover',
    'neutral.outline.border.pressed': 'color.interactive.neutral.border.pressed',
    'neutral.outline.label': 'color.interactive.neutral.text.rest',
    'neutral.outline.icon': 'color.interactive.neutral.text.rest',
    'neutral.outline.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'neutral.outline.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'neutral.text.label': 'color.interactive.neutral.text.rest',
    'neutral.text.icon': 'color.interactive.neutral.text.rest',
    'neutral.text.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'neutral.text.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'neutral.on-inverse.label': 'color.interactive.neutral.on-inverse.text.rest',

    // destructive — interactive.destructive.* (full states)
    'destructive.filled.fill': 'color.interactive.destructive.fill.rest',
    'destructive.filled.fill.hover': 'color.interactive.destructive.fill.hover',
    'destructive.filled.fill.pressed': 'color.interactive.destructive.fill.pressed',
    'destructive.filled.label': 'color.interactive.destructive.on-fill',
    'destructive.filled.icon': 'color.interactive.destructive.on-fill',
    'destructive.outline.border': 'color.interactive.destructive.border.rest',
    'destructive.outline.border.hover': 'color.interactive.destructive.border.hover',
    'destructive.outline.border.pressed': 'color.interactive.destructive.border.pressed',
    'destructive.outline.label': 'color.interactive.destructive.text.rest',
    'destructive.outline.icon': 'color.interactive.destructive.text.rest',
    'destructive.outline.overlay.hover': 'color.interactive.destructive.overlay.hover',
    'destructive.outline.overlay.pressed': 'color.interactive.destructive.overlay.pressed',
    'destructive.text.label': 'color.interactive.destructive.text.rest',
    'destructive.text.icon': 'color.interactive.destructive.text.rest',
    'destructive.text.overlay.hover': 'color.interactive.destructive.overlay.hover',
    'destructive.text.overlay.pressed': 'color.interactive.destructive.overlay.pressed',
    'destructive.on-inverse.label': 'color.interactive.destructive.on-inverse.text.rest',

    // cross-cutting disabled (docs/20 §7) — ONE treatment, any intent/appearance
    'disabled.fill': 'color.disabled.fill',
    'disabled.on-fill': 'color.disabled.on-fill',
    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
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
        replaces: 'leadingVisual',
        overlaysWhenAbsent: 'label',
        when: 'pending',
        size: 'size.{size}.icon',
        note: 'Takes the leading visual\'s cell when there is one (Primer: "the spinner replaces only that visual slot, and the button label remains visible") — width identical, because the cell was already the icon\'s size. With NO leading visual there is no cell to take, so it goes out of flow, centered, and the label holds the width open at zero opacity (React Aria). The old note here ruled out the label\'s position on the grounds that replacing a centered label collapses the width, which conflated REPLACE with REMOVE: removing the label collapses the width, overlaying it does not, and that conflation ruled out the correct fix for the label-only case for as long as it stood (#612).',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        // `nest-fixed`, naming the variant (#681). The def picks the coordinate rather than inheriting
        // the ring set's default, which is its FIRST CHILD and so an artifact of creation order —
        // #656's inherit-instead-of-choose error one layer out. It would be equally invisible here:
        // both `color=default` and `color=inverse` are valid rings, so nothing downstream notices the
        // wrong one. `default` because this def cannot know the surface it will sit on, and a normal
        // surface is the honest default; `inverse` is the designer's override on the instance.
        nesting: { kind: 'nest-fixed', variant: { color: 'default' } },
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
      'focus-ring-offset — the ring GEOMETRY now projects (an absolute sibling nesting the shared `focus-ring`), but its offset is FROZEN at paste: Figma\'s x/y accept no variable binding, so the payload resolves `focus.ring.offset` to a number and writes it. Every bound paint re-themes when a brand changes; an already-pasted ring does not move. The `:focus-visible` CONDITION remains unprojectable — Figma carries the ring as a variant coordinate a designer selects, not as a state a pointer triggers.',
      'focus-ring STROKE, WIDTH and RADIUS — owned by the nested `focus-ring` component, not by this def. `focus-ring`, `ring-width` and `ring-offset` are bound in `tokens` and only `ring-offset` reaches a Figma node, so the engine verifies that a ring is nominated and where it sits, and nothing more. Sharing the ring is still the right call — the ring is one shared thing (`focus.ring.*` and `color.border.focus` are top-level families) and authoring it N ways in N hosts would be worse. But the UNGATED PART IS NOT A CONSEQUENCE OF SHARING IT, which is what this entry used to claim: the engine cannot gate the ring\'s own colour or weight because `paintOf` keys paint as `{intent}.{appearance}.{slot}` (`anatomy-figma.ts`), so a def whose axes are colour/tone projects unpainted — tracked as #758 — and because `PartDef` has no stroke field for a ring\'s weight or colour to be declared in at all, which needs a schema decision under #740. Two projector/schema gaps, neither of them a trade anybody made. `focus-ring` now exists as a real def (#741) and binds all three against every emitted brand; what it cannot yet do is project, for the four measured reasons its own `codeOnly` lists.',
      'min-width derivation — resolved to a literal at emit, so the Figma component holds a frozen number rather than the live height×multiplier relationship.',
      'width (auto | full) — declared as a variant axis but deliberately NOT projected into Figma (#487 §4). A designer resizes an auto-layout frame; a variant axis for it doubles the whole set to buy nothing a drag does not already do.',
      'modifiers (leading-visual | trailing-visual | pending) — not projected as-is. Slot CONTENT is an INSTANCE_SWAP property, and `pending` is already a value on the state axis, so projecting this axis would duplicate one and mis-model the other. Slot PRESENCE still needs its own variant axis before #326\'s split inline padding can survive the Figma leg — that axis does not exist in this def yet, so it is not claimed here.',
      // NOT "intent at state=disabled …". `admits()` matches an entry LEADING with the term, so an entry
      // starting `intent ` would admit dropping the whole `intent` AXIS from the projection — measured:
      // with that wording, removing `intent` from `variantAxes` took `figmaPropertyErrors` from 1 error
      // to 0. This is the shape where a declaration also satisfies the check it exempts you from (doc 34),
      // and the hyphenated compound is what keeps the term from being a leading whole word. Any future
      // entry about an axis-and-state INTERACTION needs the same care — lead with a compound, never the
      // bare axis name.
      'intent-at-disabled redundancy (#612) — all three intents render ONE row at `state=disabled`, so 36 groups of 3 are byte-identical. Accepted, not fixed: `disabled.*` is cross-cutting by design (docs/20 §7 — `color.disabled.fill` has no intent in the path), so one disabled skin serving every intent is the token tier being correct, and the projection reporting it faithfully is a feature. The coordinate stays MEANINGFUL — a designer selecting intent=destructive, state=disabled finds it where they look for it and gets the right pixels; they are merely the same pixels as the other two intents. Pruning the 72 redundant rows would make the set\'s shape depend on a per-coordinate measurement, which is a new class of thing to gate for a 11% row saving.',
      'inactive — a real state (isInactive), deliberately NOT a Figma variant. Its whole delta from `disabled` is behavioral: it retains tab order, keeps the control in the a11y tree, carries aria-disabled rather than the native attribute, and surfaces the blockage reason on focus. None of that is paint, so a variant has nothing to encode. At the TOKEN tier its intended visual is `disabled`\'s by an explicit decision (docs/03 item 3, resolved 2026-06-24: `disabledStrategy: \'accessible\'` IS the KB\'s contrast-preserving `inactive`; docs/06 defines `text.disabled` as "disabled / inactive ink"). The EMITTER does not implement that yet — `anatomy-figma.ts` special-cases `state === \'disabled\'` only, so `inactive` falls through to the `rest` paints, which is worse than a duplicate: the column would have read as a normal enabled button. Either way it is unprojectable, and the two facts fail it independently.',
    ],
  },

  // How this projects into Figma component properties (#487 §5). DECLARED, not inferred from
  // `props[].type` — those are prose. Deliberately partial: `variantAxes` names only the three axes
  // that exist and should project, and every axis it omits is admitted in `codeOnly` above (the
  // validator enforces that pairing). The slot-presence axis §4 calls for is future def work, so it
  // is absent rather than stubbed.
  figmaProperties: {
    variantAxes: ['intent', 'appearance', 'size'],
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
    // 320 × 23304px). With this, 108 rows × 6 columns.
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

  docs: {
    usage: 'Use for an immediate action in the current context — submit/save/reset a form, trigger a UI state change (open modal, toggle drawer), or fire async work. Rank the actions in a view by APPEARANCE (filled > outline > text) and keep them on intent=primary; exactly one FILLED per view/region is the constraint, not one primary.',
    do: [
      'Lead with a verb, name the object ("Publish post", not "Submit")',
      'Keep exactly one FILLED button per view; demote the rest to outline / text on the same intent, so a form of three actions is three primaries at three appearances',
      'Reach for neutral when the control carries no brand weight at all — a toolbar, a dense table row — not merely because it is secondary in rank',
      'Pair a destructive button with an adjacent neutral escape ("Cancel"/"Keep")',
      'Use isInactive (focusable) for a control blocked by satisfiable state; reserve isDisabled for the irrelevant',
    ],
    dont: [
      'Use a button for navigation to a URL — use a link / link-button',
      'Stack multiple FILLED buttons competing for attention (multiple primaries are fine — differentiate them by appearance)',
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
    reduceMotion: 'State transitions (bg/border/shadow) run ~100–150ms via motion tokens; a subtle press (scale 0.98) gives tactile feedback. Under prefers-reduced-motion, resolve scale/translate to none but KEEP the instantaneous colour change so the state stays perceivable; the pending spinner is functional and its busy state is carried by aria-busy regardless.',
  },

  notes: {
    contested: [
      'native isDisabled vs focusable isInactive — the practice defaults to isInactive for relevant-but-blocked, but focusable aria-disabled is not yet the field-wide default (per-engagement decision).',
      'intent bundles hierarchy + tone, so a low-emphasis destructive ("quiet Delete") is expressed as intent=destructive appearance=text rather than a fully orthogonal emphasis×tone split.',
      'outline/text hover uses the interactive overlay wash, which assumes outlineInteraction=overlay-neutral (the default); a solid-tint / none brand rebinds those slots (foreground.<colour>-subtle / no hover).',
    ],
    evolution: [
      'RESOLVED (was the v1 HIGH finding): interaction states existed only on the solid action/danger roles, so the default (neutral) button was hover-less. The interactive colour system (docs/20) gives every colour — primary/neutral/destructive — the full fill+states/on-fill/border/text/overlay shape, so the matrix is now uniform and the default button has proper hover/pressed. Disabled is the cross-cutting disabled.* family, no longer scattered per-colour.',
    ],
    unverified: [
      'FINDING (token layer, still open): no type.label.lg composite — large buttons reuse type.label.md (large differs from medium only in height/padding, not type scale).',
      'FINDING (engine): the focus-ring 3:1 non-text contrast (1.4.11) is asserted here but not yet engine-verified — a follow-up contract.',
    ],
  },
};
