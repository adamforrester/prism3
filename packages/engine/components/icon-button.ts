/**
 * IconButton — the icon-only specialization of Button (KB brief §6, §10, §12).
 *
 * It exists as a DISTINCT component for one reason: an icon-only control has no visible
 * text, so its accessible name must be REQUIRED at the type level — "button, unlabelled" is
 * the single highest-frequency Button a11y failure in the wild (brief §6). Everything else
 * it inherits from Button (the intent × appearance model, the state trio, the focus contract);
 * this def records the DELTA, per the schema's `inherits` convention.
 *
 * The boundary from the other side: here the IconButton owns the accessible name and the
 * Icon inside it is decorative (aria-hidden) — the inverse of a labelled Button with a
 * leadingVisual, where the label carries the name and the icon is aria-hidden either way.
 */
import { ComponentDef } from '../component-schema';

export const iconButton: ComponentDef = {
  id: 'icon-button',
  name: 'IconButton',
  aliases: ['icon-btn'],
  category: 'form',
  status: 'draft',
  description:
    'A Button whose entire content is a single icon, with no visible text label. Use for space-constrained, self-evident actions (close, more, edit) in toolbars, table rows, and headers. Because there is no visible label, an accessible name is mandatory.',

  inherits: 'button',

  // Delta from Button: the label becomes an icon; the name moves to a required accessible name.
  props: [
    { name: 'icon', type: 'slot', required: true, description: 'The single icon. Rendered aria-hidden — the IconButton owns the name.' },
    { name: 'aria-label', type: 'string', required: true, description: 'REQUIRED accessible name (there is no visible text). A verb naming the action ("Close", "More actions"). Enforced at the TYPE LEVEL — a missing name is a compile error, not merely a runtime warning; that type-level requirement is the entire reason IconButton is a separate component.' },
    { name: 'intent', type: "enum: 'primary' | 'neutral' | 'destructive'", values: ['primary', 'neutral', 'destructive'], default: 'neutral', required: false, description: 'Inherited from Button (interactive.<intent>.*). Icon-only actions are most often neutral text-appearance.' },
    { name: 'appearance', type: "enum: 'filled' | 'outline' | 'text'", values: ['filled', 'outline', 'text'], default: 'text', required: false, description: 'Default text — icon-only actions usually sit in toolbars, not as filled CTAs.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Square control; height drives both dimensions.' },
    { name: 'isPending', type: 'boolean', default: false, required: false, description: 'Inherited — swap the icon for a spinner, keep focus, announce busy.' },
    { name: 'isInactive', type: 'boolean', default: false, required: false, description: 'Inherited — focusable disabled for relevant-but-blocked actions.' },
    { name: 'isDisabled', type: 'boolean', default: false, required: false, description: 'Inherited — native disabled, reserved for irrelevant controls.' },
  ],

  states: ['rest', 'hover', 'focus-visible', 'pressed', 'pending', 'inactive', 'disabled'],
  variants: {
    intent: ['primary', 'neutral', 'destructive'],
    appearance: ['filled', 'outline', 'text'],
    size: ['small', 'medium', 'large'],
  },
  // NO `modifiers` AXIS (#845). It held `['pending']` — an axis of one, whose single value is already a
  // value on the state axis, so it modelled one coordinate twice and enumerated no alternatives at all.
  // An axis's values are supposed to be mutually exclusive coordinates along one dimension; a one-value
  // list has no dimension. `pending` survives where it already lived (`states`, and the projected
  // `stateAxis`), and it keeps its own leading `codeOnly` entry explaining the spinner ceiling — which
  // is what makes this removal safe here: see the note in `button.ts`, where it was NOT.

  // Icon-only is SQUARE: the height role drives both dimensions, so padding-x = padding-y.
  // Color skin follows Button's reconciled interactive.* model (same color × appearance);
  // this delta binds the square geometry + the base focus contract + the icon-glyph skins.
  // The icon glyph binds the same interactive inks Button's label does (on-fill for filled,
  // text for outline/text) — every color now carries the full state shape (v1 gap closed).

  // Same paint grammar as the substrate (#758), and stated rather than inherited: `inherits` records
  // the API delta, not the skin, and `paintOf` reads this def's own field. Repeating two lines is the
  // cheaper error than a lookup that walks `inherits` and resolves to a grammar nobody reading this
  // file can see — the 162-member set's color would then depend on a file it does not name.
  paintKeys: ['{intent}.{appearance}.{slot}.{state}', '{intent}.{appearance}.{slot}'],

  tokens: {
    'radius': 'radius.md',
    // THE OUTLINE BORDER'S THICKNESS (#1278) — 1px, and it does not move; only its PROVENANCE does.
    // The number used to be the executors' `if (!node.strokeWeight) … = 1` fallback, the right figure
    // with nothing behind it, so a brand re-runging its border floor moved every other bordered part in
    // the system while this def stayed on Figma's default.
    //
    // STATED HERE RATHER THAN INHERITED, on this file's own standing rule: `inherits: 'button'` records
    // the API delta and nothing resolves through it — `paintKeys` above carries the same note for the
    // same reason. The 162-member set's border weight must not depend on a file this one does not name.
    // Repeating the pair is the cheaper error. It is also why #1278 had to name this def separately at
    // all: binding the button FACTORY covers three intents and reaches nothing here.
    //
    // The rung is the same one `button` binds and deliberately NOT the one the selection controls bind:
    // Prism 2 draws its outline buttons at 1px and its checkbox/radio/switch at 2px, so `hairline` here
    // is this def agreeing with the reference rather than with its neighbors. See `checkbox.ts`'s
    // `border-width` note for the argument, and the #1278 arms for both directions of the sweep.
    'border-width': 'border-width.hairline',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',
    // square sizing — one dimension token drives width AND height
    'size.small.side': 'size.sm.height',
    'size.medium.side': 'size.md.height',
    'size.large.side': 'size.lg.height',
    // the GLYPH artboard, on the same 1:1 ladder Button uses (#324) — small→sm, so a medium
    // IconButton's icon is the same size as a medium Button's leading visual. The control side and the
    // glyph inside it are two separate rungs and both are needed: `side` is the square's outer box,
    // this is what sits in it.
    'size.small.icon': 'icon.size.sm',
    'size.medium.icon': 'icon.size.md',
    'size.large.icon': 'icon.size.lg',
    // primary
    'primary.filled.fill': 'color.interactive.primary.fill.rest',
    'primary.filled.fill.hover': 'color.interactive.primary.fill.hover',
    'primary.filled.fill.pressed': 'color.interactive.primary.fill.pressed',
    'primary.filled.icon': 'color.interactive.primary.on-fill',
    // The outline edge is stateful (#576) and this component declares hover/pressed, so bind all
    // three — an unqualified key alone would project a hovered outline identical to its rest.
    'primary.outline.border': 'color.interactive.primary.border.rest',
    'primary.outline.border.hover': 'color.interactive.primary.border.hover',
    'primary.outline.border.pressed': 'color.interactive.primary.border.pressed',
    'primary.outline.icon': 'color.interactive.primary.text.rest',
    'primary.text.icon': 'color.interactive.primary.text.rest',
    // neutral (default — now stateful)
    'neutral.filled.fill': 'color.interactive.neutral.fill.rest',
    'neutral.filled.fill.hover': 'color.interactive.neutral.fill.hover',
    'neutral.filled.fill.pressed': 'color.interactive.neutral.fill.pressed',
    'neutral.filled.icon': 'color.interactive.neutral.on-fill',
    'neutral.outline.border': 'color.interactive.neutral.border.rest',
    'neutral.outline.border.hover': 'color.interactive.neutral.border.hover',
    'neutral.outline.border.pressed': 'color.interactive.neutral.border.pressed',
    'neutral.outline.icon': 'color.interactive.neutral.text.rest',
    'neutral.text.icon': 'color.interactive.neutral.text.rest',
    // destructive
    'destructive.filled.fill': 'color.interactive.destructive.fill.rest',
    'destructive.filled.fill.hover': 'color.interactive.destructive.fill.hover',
    'destructive.filled.fill.pressed': 'color.interactive.destructive.fill.pressed',
    'destructive.filled.icon': 'color.interactive.destructive.on-fill',
    'destructive.outline.border': 'color.interactive.destructive.border.rest',
    'destructive.outline.border.hover': 'color.interactive.destructive.border.hover',
    'destructive.outline.border.pressed': 'color.interactive.destructive.border.pressed',
    'destructive.outline.icon': 'color.interactive.destructive.text.rest',
    'destructive.text.icon': 'color.interactive.destructive.text.rest',
    // outline/text hover is the overlay wash, same as Button's — a fill on the target node, because
    // neither appearance has a fill to change. Bound here rather than inherited: `inherits` is prose
    // (see the anatomy note below), so an unbound overlay key would project hover byte-identical to
    // rest on six of the nine intent×appearance combinations.
    'primary.outline.overlay.hover': 'color.interactive.primary.overlay.hover',
    'primary.outline.overlay.pressed': 'color.interactive.primary.overlay.pressed',
    'primary.text.overlay.hover': 'color.interactive.primary.overlay.hover',
    'primary.text.overlay.pressed': 'color.interactive.primary.overlay.pressed',
    'neutral.outline.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'neutral.outline.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'neutral.text.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'neutral.text.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'destructive.outline.overlay.hover': 'color.interactive.destructive.overlay.hover',
    'destructive.outline.overlay.pressed': 'color.interactive.destructive.overlay.pressed',
    'destructive.text.overlay.hover': 'color.interactive.destructive.overlay.hover',
    'destructive.text.overlay.pressed': 'color.interactive.destructive.overlay.pressed',
    // cross-cutting disabled
    'disabled.fill': 'color.disabled.fill',
    'disabled.icon': 'color.disabled.icon',
    'disabled.border': 'color.disabled.border',
  },

  // The STRUCTURAL layer. AUTHORED FLAT, and that is a decision rather than a shortcut: `inherits`
  // is declared in `component-schema.ts` and read by NOTHING — not the validator, not
  // `anatomy-figma.ts`, not the plugin. It is prose, asserted once in `test.ts` and otherwise inert.
  // So this def's props, variants and tokens are already written out in full, and an anatomy that
  // leaned on Button's would be the one field in the file resolved by a mechanism that does not
  // exist. Teaching the Figma path inheritance is a new mechanism on the critical path buying
  // nothing this component needs — the delta is small and stating it costs less than resolving it.
  //
  // THE THREE DELTAS FROM BUTTON, each of which is why this could not be a copy:
  //
  //  1. ONE part where Button has three. Button's row is leadingVisual / label / trailingVisual; here
  //     the icon is the whole content. There is no label, so nothing flanks anything.
  //  2. SQUARE, not a row with padding. Button's box hugs its content on x and pins a bound height on
  //     y; this one binds ONE key to BOTH axes (`size.{size}.side` → `size.<step>.height`, so a medium
  //     IconButton is exactly as tall as a medium Button and exactly that wide). It therefore carries
  //     NO padding at all — a square whose glyph is centered has no side to inset asymmetrically, and
  //     #326's whole subject (the visual side insets less than the label side) has no label side to
  //     compare against. `padding` is absent rather than symmetric-and-ignored.
  //  3. NO gap. A gap is the space BETWEEN two cells and there is one cell.
  //
  // WHAT IS IDENTICAL, deliberately: the focus ring. Same `absolute` part nesting the same shared
  // `focus-ring` component at the same bound offset, for the reason `button.ts` records — the ring is
  // nobody's component, and an absolute sibling has its own stroke so `appearance=outline`'s border
  // does not have to lose one. Copied rather than inherited on the same terms as everything else here.
  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        // Button's grammar, so Button's slots and Button's precedence — see its `container` for why the
        // order is written down rather than left in the projector (#933).
        paintSlots: ['overlay', 'fill', 'border'],
        role: 'target',
        children: ['icon', 'focusRing'],
        // FIXED on both axes, which follows from the square rather than being a separate choice: one
        // variable drives width and height, so `hug` on either would let the glyph decide a dimension
        // the token already decided. `justify`/`align` both center — the one cell sits in the middle of
        // a square, which is the only placement a square with no padding admits.
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        // ONE key, BOTH axes. Not `height` plus a matching `width`: two bindings that must agree can be
        // rebound on one axis with nothing to notice, because each stays individually valid. A single
        // key cannot drift from itself, so "square" is a fact the def states rather than an invariant
        // nobody checks. See `PartDef.size`.
        size: 'size.{size}.side',
        radius: 'radius',
        // The EDGE's thickness (#1278) — names this def's own key, like `radius` and `size` above. See
        // `border-width` in `tokens` for the figure and why it is stated here rather than inherited.
        strokeWidth: 'border-width',
      },
      // REQUIRED, and this is the load-bearing difference from Button's two optional visuals. The whole
      // reason IconButton is a separate component is that its content and its accessible name cannot
      // both be optional (§10) — a slot that could be absent would project an empty square, which is
      // the "button, unlabelled" failure with the visual half missing too.
      //
      // `optional` is therefore ABSENT (which the schema reads as required), and that has a consequence
      // recorded in `figmaProperties` below rather than here: presence is not a question, so there is no
      // slot-presence axis, so the grid does not double.
      icon: {
        kind: 'slot',
        size: 'size.{size}.icon',
        nesting: { kind: 'swap' },
        note: 'The single icon, and the entire content. Rendered aria-hidden — the IconButton owns the accessible name, so the glyph is decorative even though it is the only thing visible. Bound to the SAME `icon.size.*` rung Button\'s visuals use (#324\'s 1:1 ladder), so a medium IconButton\'s glyph matches a medium Button\'s.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        // Identical to Button's, and for the identical reason (#801) — the ring's inside-drawn stroke
        // consumes the offset, so the gap needs both numbers. See `PartDef.strokeInset`.
        strokeInset: 'ring-width',
        // `nest-fixed` at `surface=default` (#681, #1134). NOT inherited from the ring set's default,
        // which is its first child and therefore an artifact of creation order — #656's inherit-vs-choose
        // error one layer out. FIXED, not `follow`ed: icon-button has no `surface` axis of its own yet (it
        // is a later member of the bounded inverse set, docs/20 §9.8), so there is no host coordinate to
        // pass through — every icon-button nests the default-ground ring. The ring's axis is `surface`
        // (renamed from `color`, #1134); when icon-button gains its own `surface` axis this becomes
        // `follow: ['surface']`, the same one line Button carries.
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The same absolutely-positioned sibling nesting the same shared `focus-ring` as Button, at the same bound offset. Its own stroke is the point: an icon-only control is the most likely to be `appearance=outline` in a dense toolbar, and a ring drawn on the target would have to win that border\'s single stroke away from it.',
      },
    },
    derived: {
      'pill-radius': 'height ÷ 2 — the square case of Button\'s rule, and here it is a CIRCLE: with width = height, half the height is the radius that rounds a square into one',
    },
    codeOnly: [
      'touch-target-expansion — the same decoupling of the optical box from the hit box Button records, and the one component where it matters MOST: `size=small` is a 32px (aurora) / 40px (nb, wendys) square, so the optical box is at or below the Apple HIG 44×44 floor at every brand and below it at one. Figma has no concept of a hit area larger than the frame, so the expansion cannot project and the emitted small square is the optical size only. A designer measuring it in Figma is reading the wrong box.',
      'focus-ring-offset — the ring GEOMETRY projects (an absolute sibling nesting the shared `focus-ring`), and its position is FROZEN at paste: Figma\'s x/y accept no variable binding, so the payload resolves `focus.ring.offset` AND `focus.ring.width` to numbers and writes their sum (#801 — the ring\'s stroke draws INSIDE its own bounds and would otherwise consume the whole gap). A brand changing either value re-themes every bound paint and does not move an already-pasted ring; nor does a REBUILD, which finds the set by name and skips each member by name, so a corrected position needs the existing set deleted or a fresh page. See `button`\'s entry — the caveat is general to any geometry change, not to the ring. The `:focus-visible` CONDITION is likewise unprojectable — Figma carries the ring as a variant coordinate a designer selects, not as a state a pointer triggers.',
      // The phrase "a Figma node" ends this clause with a DASH rather than a colon, and that is not a
      // style preference (#804). This def's prose is bundled into `apps/plugin/dist/main.js` as string
      // content, and both CI and `build.mjs` assert that file contains no Node builtin import by grepping
      // for the `node` scheme prefix over the whole file — so a colon directly after "node" fails a
      // sandbox-safety check as though the main thread had imported the filesystem module. Measured: 0
      // occurrences before this def's prose reached the plugin bundle, 1 after. The grep cannot tell
      // prose from an import and is right not to try, since a check that parsed import syntax would miss
      // a builtin reached any other way. This comment observes the same rule it explains — the plugin
      // build does not minify, so a comment naming the literal would trip the check it documents.
      'focus-ring STROKE, WIDTH and RADIUS — owned by the nested `focus-ring` component, not by this def. So `focus-ring` and `ring-width` are bound in `tokens` and neither reaches a Figma node — the engine verifies that a ring is nominated, which variant, and where it sits, and nothing about its color or weight. Accepted on the same terms as Button, and for the same reason — the ring is one shared thing.',
      'aria-label — the REQUIRED accessible name, and the def\'s entire reason for existing (§10). A Figma component property could carry a string, but it would be a string with no relationship to anything Figma reads: no exported frame, no prototype, no handoff surface consumes it, and a TEXT property named `aria-label` sitting empty on all 162 members would read as a name that had been provided. The requirement is a TYPE-LEVEL one in the code projection, which is where it can actually fail a build; Figma cannot hold "required" at all.',
      // The `modifiers` admission is GONE, with the axis it admitted (#845). Keeping it would have left
      // an entry admitting an axis this def no longer declares — an exemption with nothing to exempt,
      // which `figmaPropertyErrors` cannot detect in either direction and which reads to the next author
      // as evidence the axis still exists. Deleting the axis and leaving its admission is the stale-
      // exemption shape `lint-paint.ts` checks BOTH directions for.
      //
      // The `pending` entry below stays, and NOT because it explains this axis: it explains a spinner
      // ceiling on a state that still ships and projects.
      //
      // AND MEASURING THAT FOUND A PRE-EXISTING DEFECT, filed as #867 rather than fixed here.
      // Because `pending — the SPINNER…` LEADS with the state name, `admits()` reads it as an admission
      // that `pending` is unprojected — so dropping `pending` from this def's `stateAxis` is ALLOWED,
      // silently, where the identical mutation on `button` is refused. The entry is not an admission at
      // all; it describes a content ceiling WITHIN a state that does project. Measured before and after
      // the `modifiers` removal: allowed both times, so this pass neither caused it nor fixes it. It is
      // `admits()`'s leading-word rule read from the other end — that rule stops prose about something
      // else from admitting a name, and cannot tell prose ABOUT the name from prose admitting its
      // absence.
      'intent-at-disabled redundancy — all three intents render ONE row at `state=disabled`, so 18 groups of 3 are byte-identical, on the same terms Button records: `disabled.*` is cross-cutting by design (docs/20 §7), so one disabled skin serving every intent is the token tier being correct and the projection reporting it faithfully.',
      'inactive — a real state (isInactive), deliberately NOT a Figma variant, and the two reasons fail it independently. Its whole delta from `disabled` is behavioral (retains tab order, keeps the control in the a11y tree, carries aria-disabled rather than the native attribute, surfaces the blockage reason on focus), so a variant has nothing to encode; and the emitter special-cases `state === \'disabled\'` only, so an `inactive` column would fall through to the `rest` paints and read as a normal enabled control.',
      'pending — the SPINNER, and this is the one ceiling that is genuinely worse here than on Button. Button swaps its leading visual for a spinner and keeps the label, so the control neither grows nor loses its name. An IconButton has one cell and it is the icon, so a spinner must take the icon\'s own place — there is nothing else in the box. The def projects `state=pending` with the icon\'s slot unchanged, which means the Figma column shows a pending IconButton wearing its normal glyph: correct geometry, wrong content. Declaring an overlay would need it to replace the ONLY part, and `overlaysWhenAbsent` has no non-optional floor to fall back to that is not the part being replaced (the validator rejects naming the same part, correctly). So the pending spinner is a code-tier behavior here, admitted rather than half-projected.',
    ],
  },

  // How this projects into Figma component properties (#487 §5), and the shape is Button's MINUS the
  // slot-presence axes — which is the whole finding, recorded here rather than left to be inferred
  // from an absence.
  //
  // THE SLOT-FILL DIMENSION COLLAPSES TO 1, and it collapses rather than needing a new shape. Button's
  // `slotAxes` exists because presence changes GEOMETRY: #326 sets `paddingLeft = leading ?
  // inlineVisual : inlineLabel`, so `leading=true` and `leading=false` are two different boxes and a
  // Figma boolean (which drives one node's `visible` and can touch nothing above it) cannot carry the
  // difference. Neither half of that argument survives here: the icon is REQUIRED so there is no
  // `false` coordinate to carry, and there is no padding to vary even if there were. `figmaProperties`
  // therefore declares no `slotAxes` at all, and the validator already refuses one over a
  // non-optional part — so the collapse is enforced rather than merely intended.
  //
  // What that leaves is `AnatomyPlan.slots` — typed `{leading, trailing}` and written into every
  // member's name by `planComponentName`. It needs NO new shape either: with no slot axes declared,
  // `figmaAnatomySet` iterates `[false]` on both, so every member carries `leading=false,
  // trailing=false` and the two coordinates are constants. Constant axes cost one name segment each
  // and nothing else — `planSetLayout` gives a dimension only to axes that VARY, so they contribute no
  // rows and no columns. Not free, and worth naming as the price of not touching the type: every
  // IconButton member's name ends in two coordinates about slots it does not have, which reads as
  // vestigial to a designer inspecting the set. A distinct shape (`slots` keyed by the def's own part
  // names) is the honest fix and is a REFACTOR of a type three call sites read, on the critical path
  // of a component that does not need it. Recorded as the deliberate cost, not discovered later.
  figmaProperties: {
    variantAxes: ['intent', 'appearance', 'size'],
    // Six of the seven states, exactly as Button — `inactive` is admitted in `codeOnly` above rather
    // than dropped. Seven remains right for `states` (the def's truth); six is right for the
    // projection (what a variant can carry).
    stateAxis: { name: 'state', values: ['rest', 'hover', 'focus-visible', 'pressed', 'pending', 'disabled'] },
    // NO `slotAxes` — see the note above. The icon is required, so presence is not a question, and the
    // validator would reject an axis over a non-optional part.
    //
    // `state` across the columns for the same reason Button declares it: it is the axis a designer
    // scans to compare one control's states, and leaving it to cardinality would hand the columns to
    // whichever axis happened to be widest. Here that is `state` anyway (6 vs 3), which is exactly why
    // it is worth DECLARING — an inherited answer that happens to be right is #656's situation before
    // #656, and it would change silently the day a fourth intent lands.
    gridAxis: 'state',
    booleans: {},
    // Slot CONTENT, so a designer can pick the glyph. The one property this component has, and it is
    // required-in-code but swappable-in-Figma: `required` means a consumer must SUPPLY an icon, not
    // that they must supply a particular one.
    swaps: { icon: 'icon' },
  },

  accessibility: {
    role: 'button (native <button>)',
    wcag: ['4.1.2 Name/Role/Value (the mandatory accessible name)', '2.5.3 Label in Name', '1.4.11 Non-text Contrast (focus ring ≥ 3:1; AND the icon glyph itself ≥ 3:1 against its background)', '2.4.7 Focus Visible', '2.5.5 / 2.5.8 Target Size (icon-only buttons are the most likely to fail the 24×24 / 44×44 floor — expand the hit area beyond the optical size)'],
    keyboard: 'Native <button> — Enter on keydown, Space on keyup. Identical to Button.',
    focus: 'Same offset :focus-visible ring as Button; retained through pending/inactive.',
    aria: 'aria-label is the accessible name (required). If it triggers a menu, add aria-haspopup + aria-expanded; aria-pressed only if it is a toggle. While isPending, set aria-busy and keep it focusable. Do NOT put a tooltip on a natively-disabled icon button (unreachable) — use isInactive so the reason stays reachable.',
  },

  content: {
    labelPattern: 'The accessible name is a verb naming the action ("Close", "Edit", "More actions") — never the icon\'s shape ("X", "three dots"). If a tooltip is shown, its text should match the accessible name.',
  },

  docs: {
    usage: 'Use for a self-evident action where space is tight and a text label would be redundant or not fit — toolbar actions, a close affordance, row-level edit/delete. Always provide the accessible name; pair with a Tooltip for the visible name on hover/focus.',
    do: [
      'Always give it an accessible name (a verb)',
      'Use recognisable, conventional icons (close = ×, more = ⋯); pair novel icons with a visible label instead',
      'Expand the hit area to meet target-size minimums even when the icon is visually small',
    ],
    dont: [
      'Ship it without an accessible name ("button, unlabelled")',
      'Use it for an unfamiliar action a user cannot infer from the glyph — use a labelled Button',
      "Tooltip a natively-disabled icon button (the tooltip can't be reached) — use isInactive",
    ],
  },

  ai: {
    primaryPurpose: 'Trigger an action with an icon alone, no visible label.',
    whenToUse: 'A self-evident, conventional action in a space-constrained context (toolbar, table row, card header, close affordance).',
    avoidWhen: 'The action is not obvious from the icon (use a labelled button) — or a visible label would fit and aid recognition. Never when you cannot supply an accessible name.',
    commonPartners: ['icon', 'tooltip', 'button-group', 'menu'],
    triggerKeywords: ['icon button', 'close button', 'more button', 'toolbar action', 'edit action', 'kebab menu'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['icon', 'tooltip', 'button-group', 'menu', 'popover'],
    alternativeTo: ['button', 'link'],
  },

  notes: {
    contested: [
      'Whether IconButton is a distinct component or a mode of Button — the practice ships it distinct precisely so the accessible name is required at the type level (brief §10).',
    ],
  },
};
